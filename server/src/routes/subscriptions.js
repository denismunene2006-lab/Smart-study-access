import express from "express";
import { config } from "../config.js";
import { authRequired } from "../middleware/auth.js";
import { getSupabaseAdmin } from "../supabase.js";
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

  const supabase = getSupabaseAdmin();
  await supabase
    .from(config.transactionsTable)
    .insert({
      user_id: req.user.id,
      amount: 30,
      method: "M-Pesa STK Push",
      status: "Pending",
      checkout_request_id: response.CheckoutRequestID || null,
      merchant_request_id: response.MerchantRequestID || null,
      phone_number: phoneNumber
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

  const supabase = getSupabaseAdmin();
  let transactionQuery = supabase
    .from(config.transactionsTable)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (parsed.checkoutRequestId) {
    transactionQuery = transactionQuery.eq("checkout_request_id", parsed.checkoutRequestId);
  } else {
    transactionQuery = transactionQuery.eq("merchant_request_id", parsed.merchantRequestId);
  }

  const { data: matchedTransactions } = await transactionQuery;
  const transaction = matchedTransactions?.[0] || null;

  if (!transaction) {
    return res.json({ received: true });
  }

  const success = Number(parsed.resultCode) === 0;
  await supabase
    .from(config.transactionsTable)
    .update({
      status: success ? "Success" : "Failed",
      mpesa_receipt_number: parsed.mpesaReceiptNumber || null,
      raw_callback: req.body || null,
      phone_number: parsed.phoneNumber || transaction.phone_number
    })
    .eq("id", transaction.id);

  if (success) {
    const { data: profile } = await supabase
      .from(config.profilesTable)
      .select("id, subscription_ends_at")
      .eq("id", transaction.user_id)
      .maybeSingle();

    if (profile) {
      const now = new Date();
      const currentEnd = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;
      const base = currentEnd && currentEnd > now ? currentEnd : now;
      const newEnd = addDays(base, 30);

      await supabase
        .from(config.profilesTable)
        .update({
          subscription_ends_at: newEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id);

      await supabase
        .from(config.subscriptionsTable)
        .insert({
          user_id: profile.id,
          start_at: base.toISOString(),
          end_at: newEnd.toISOString(),
          status: "active"
        });
    }
  }

  return res.json({ received: true });
});

export default router;
