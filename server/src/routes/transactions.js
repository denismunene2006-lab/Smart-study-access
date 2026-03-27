import express from "express";
import { authRequired } from "../middleware/auth.js";
import { query } from "../db.js";

const router = express.Router();

router.get("/my", authRequired, async (req, res) => {
  const rows = await query(
    "SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC",
    [req.user.id]
  );
  const transactions = rows.map((row) => ({
    id: row.id,
    amount: row.amount,
    method: row.method,
    status: row.status,
    createdAt: row.created_at
  }));
  return res.json({ transactions });
});

export default router;
