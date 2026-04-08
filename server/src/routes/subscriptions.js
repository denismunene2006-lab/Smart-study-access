import express from "express";
import { authRequired } from "../middleware/auth.js";
import {
  Subscription,
  Transaction,
  User
} from "../models.js";
import { initiateStkPush } from "../services/mpesa.js";

const router = express.Router();

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function parseCallback(body) {
  const callback = body?.Body?.stkCallback || body?.stkCallback || body?.callback || null;
  if (!callback) return {};

  const metadata = callback.CallbackMetadata?.Item || [];
  const getItem = (name) => metadata.find((item) => item.Name === name)?.Value;

  return {
    resultCode: callback.ResultCode,
    resultDesc: callback.ResultDesc,
    merchantRequestId: callback.MerchantRequestID,
    checkoutRequestId: callback.CheckoutRequestID,
    amount: getItem("Amount"),
    mpesaReceiptNumber: getItem("MpesaReceiptNumber"),
    phoneNumber: getItem("PhoneNumber")
  };
}

router.post("/mpesa", authRequired, async (req, res) => {
  const { phoneNumber } = req.body || {};
  if (!phoneNumber) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  const response = await initiateStkPush({
    phoneNumber,
    amount: 30
  });

  await Transaction.create({
    userId: req.user._id,
    amount: 30,
    method: "M-Pesa STK Push",
    status: "Pending",
    checkoutRequestId: response.CheckoutRequestID || null,
    merchantRequestId: response.MerchantRequestID || null,
    phoneNumber
  });

  return res.json({
    message: response.CustomerMessage || "STK push sent",
    checkoutRequestId: response.CheckoutRequestID
  });
});

router.post("/mpesa/callback", async (req, res) => {
  const parsed = parseCallback(req.body);
  if (!parsed.checkoutRequestId && !parsed.merchantRequestId) {
    return res.json({ received: true });
  }

  const matches = [];
  if (parsed.checkoutRequestId) {
    matches.push({ checkoutRequestId: parsed.checkoutRequestId });
  }
  if (parsed.merchantRequestId) {
    matches.push({ merchantRequestId: parsed.merchantRequestId });
  }

  const transaction = await Transaction.findOne({ $or: matches }).sort({ createdAt: -1 });

  if (!transaction) {
    return res.json({ received: true });
  }

  const success = Number(parsed.resultCode) === 0;
  transaction.status = success ? "Success" : "Failed";
  transaction.mpesaReceiptNumber = parsed.mpesaReceiptNumber || null;
  transaction.rawCallback = req.body || null;
  transaction.phoneNumber = parsed.phoneNumber || transaction.phoneNumber;
  await transaction.save();

  if (success) {
    const user = await User.findById(transaction.userId);
    if (user) {
      const now = new Date();
      const currentEnd = user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : null;
      const base = currentEnd && currentEnd > now ? currentEnd : now;
      const newEnd = addDays(base, 30);

      user.subscriptionEndsAt = newEnd;
      await user.save();

      await Subscription.create({
        userId: user._id,
        startAt: base,
        endAt: newEnd,
        status: "active"
      });
    }
  }

  return res.json({ received: true });
});

export default router;
