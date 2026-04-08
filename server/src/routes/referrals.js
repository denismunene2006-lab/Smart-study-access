import express from "express";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.get("/code", authRequired, async (req, res) => {
  return res.json({
    code: req.user.referralCode,
    progress: req.user.referralProgress
  });
});

export default router;
