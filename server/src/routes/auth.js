import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db.js";
import { config } from "../config.js";
import { computeAccess } from "../utils/access.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

function mapUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    studentId: user.student_id,
    role: user.role,
    trialEndsAt: user.trial_ends_at,
    subscriptionEndsAt: user.subscription_ends_at,
    bonusDays: user.bonus_days,
    referralProgress: user.referral_progress,
    referralCode: user.referral_code,
    createdAt: user.created_at
  };
}

async function generateReferralCode() {
  for (let i = 0; i < 6; i += 1) {
    const code = uuidv4().split("-")[0].toUpperCase();
    const existing = await query("SELECT 1 FROM users WHERE referral_code = $1", [code]);
    if (existing.length === 0) {
      return code;
    }
  }
  return uuidv4().split("-")[0].toUpperCase();
}

router.post("/signup", async (req, res) => {
  const { name, email, studentId, password, referralCode } = req.body || {};

  if (!name || !email || !studentId || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const existing = await query(
    "SELECT 1 FROM users WHERE email = $1 OR student_id = $2",
    [email, studentId]
  );
  if (existing.length > 0) {
    return res.status(400).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);
  const referral_code = await generateReferralCode();

  const rows = await query(
    "INSERT INTO users (full_name, email, student_id, password_hash, trial_ends_at, referral_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [name, email, studentId, passwordHash, trialEndsAt, referral_code]
  );
  const user = rows[0];

  if (referralCode) {
    const refRows = await query("SELECT * FROM users WHERE referral_code = $1", [referralCode]);
    const referrer = refRows[0];
    if (referrer) {
      await query(
        "INSERT INTO referrals (referrer_id, referred_user_id) VALUES ($1, $2)",
        [referrer.id, user.id]
      );

      const progress = (referrer.referral_progress || 0) + 1;
      let bonusAdd = 0;
      let newProgress = progress;
      let newCycles = referrer.referral_cycles || 0;

      if (progress >= 3) {
        bonusAdd = 7;
        newProgress = 0;
        newCycles += 1;
        await query(
          "INSERT INTO rewards (user_id, source_type, source_id, days) VALUES ($1, $2, $3, $4)",
          [referrer.id, "referral", user.id, bonusAdd]
        );
      }

      await query(
        "UPDATE users SET referral_progress = $1, referral_cycles = $2, bonus_days = bonus_days + $3, updated_at = now() WHERE id = $4",
        [newProgress, newCycles, bonusAdd, referrer.id]
      );
    }
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: "30d" });
  return res.json({ token, user: mapUser(user) });
});

router.post("/login", async (req, res) => {
  const { id, password } = req.body || {};
  if (!id || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const rows = await query(
    "SELECT * FROM users WHERE email = $1 OR student_id = $1",
    [id]
  );
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: "30d" });
  return res.json({ token, user: mapUser(user) });
});

router.get("/me", authRequired, async (req, res) => {
  const access = computeAccess(req.user);
  return res.json({
    user: mapUser(req.user),
    access: {
      active: access.active,
      daysLeft: access.daysLeft,
      accessEndsAt: access.accessEndsAt
    }
  });
});

export default router;
