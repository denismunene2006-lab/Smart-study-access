import express from "express";
import { authRequired } from "../middleware/auth.js";
import { Transaction } from "../models.js";

const router = express.Router();

router.get("/my", authRequired, async (req, res) => {
  const transactions = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return res.json({
    transactions: transactions.map((row) => ({
      id: row.id,
      amount: row.amount,
      method: row.method,
      status: row.status,
      createdAt: row.createdAt
    }))
  });
});

export default router;
