import express from "express";
import { authRequired } from "../middleware/auth.js";
import { query } from "../db.js";
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

  await query(
    "INSERT INTO transactions (user_id, amount, method, status, checkout_request_id, merchant_request_id, phone_number) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      req.user.id,
      30,
      "M-Pesa STK Push",
      "Pending",
      response.CheckoutRequestID || null,
      response.MerchantRequestID || null,
      phoneNumber
    ]
  );

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

  const txRows = await query(
    "SELECT * FROM transactions WHERE checkout_request_id = $1 OR merchant_request_id = $2 ORDER BY created_at DESC LIMIT 1",
    [parsed.checkoutRequestId, parsed.merchantRequestId]
  );
  const transaction = txRows[0];
  if (!transaction) {
    return res.json({ received: true });
  }

  const success = Number(parsed.resultCode) === 0;
  await query(
    "UPDATE transactions SET status = $1, mpesa_receipt_number = $2, raw_callback = $3 WHERE id = $4",
    [
      success ? "Success" : "Failed",
      parsed.mpesaReceiptNumber || null,
      req.body || null,
      transaction.id
    ]
  );

  if (success) {
    const userRows = await query("SELECT * FROM users WHERE id = $1", [transaction.user_id]);
    const user = userRows[0];
    if (user) {
      const now = new Date();
      const currentEnd = user.subscription_ends_at ? new Date(user.subscription_ends_at) : null;
      const base = currentEnd && currentEnd > now ? currentEnd : now;
      const newEnd = addDays(base, 30);

      await query(
        "UPDATE users SET subscription_ends_at = $1, updated_at = now() WHERE id = $2",
        [newEnd, user.id]
      );

      await query(
        "INSERT INTO subscriptions (user_id, start_at, end_at, status) VALUES ($1, $2, $3, $4)",
        [user.id, base, newEnd, "active"]
      );
    }
  }

  return res.json({ received: true });
});

export default router;
