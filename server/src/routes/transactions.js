import express from "express";
import { config } from "../config.js";
import { authRequired } from "../middleware/auth.js";
import { getSupabaseAdmin } from "../supabase.js";

const router = express.Router();

router.get("/my", authRequired, async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { data: transactions } = await supabase
    .from(config.transactionsTable)
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  return res.json({
    transactions: (transactions || []).map((row) => ({
      id: row.id,
      amount: row.amount,
      method: row.method,
      status: row.status,
      createdAt: row.created_at
    }))
  });
});

export default router;
