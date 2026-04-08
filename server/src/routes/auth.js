import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import {
  Referral,
  Reward,
  User
} from "../models.js";
import { computeAccess } from "../utils/access.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

function mapUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    studentId: user.studentId,
    role: user.role,
    trialEndsAt: user.trialEndsAt,
    subscriptionEndsAt: user.subscriptionEndsAt,
    bonusDays: user.bonusDays,
    referralProgress: user.referralProgress,
    referralCode: user.referralCode,
    createdAt: user.createdAt
  };
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStudentId(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeReferralCode(value) {
  return String(value || "").trim().toUpperCase();
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: "30d" });
}

async function generateReferralCode() {
  for (let i = 0; i < 6; i += 1) {
    const code = uuidv4().split("-")[0].toUpperCase();
    const existing = await User.exists({ referralCode: code });
    if (!existing) {
      return code;
    }
  }

  return uuidv4().split("-")[0].toUpperCase();
}

router.post("/signup", async (req, res, next) => {
  const { name, email, studentId, password, referralCode } = req.body || {};

  if (!name || !email || !studentId || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const normalizedEmail = normalizeEmail(email);
    const normalizedStudentId = normalizeStudentId(studentId);
    const existing = await User.exists({
      $or: [{ email: normalizedEmail }, { studentId: normalizedStudentId }]
    });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName: String(name).trim(),
      email: normalizedEmail,
      studentId: normalizedStudentId,
      passwordHash,
      trialEndsAt: addDays(new Date(), 7),
      referralCode: await generateReferralCode()
    });

    const normalizedReferral = normalizeReferralCode(referralCode);
    if (normalizedReferral) {
      const referrer = await User.findOne({ referralCode: normalizedReferral });
      if (referrer) {
        await Referral.create({
          referrerId: referrer._id,
          referredUserId: user._id
        });

        const progress = (referrer.referralProgress || 0) + 1;
        let bonusAdd = 0;
        referrer.referralProgress = progress;

        if (progress >= 3) {
          bonusAdd = 7;
          referrer.referralProgress = 0;
          referrer.referralCycles = (referrer.referralCycles || 0) + 1;
          referrer.bonusDays = (referrer.bonusDays || 0) + bonusAdd;

          await Reward.create({
            userId: referrer._id,
            sourceType: "referral",
            sourceId: user.id,
            days: bonusAdd
          });
        }

        await referrer.save();
      }
    }

    return res.json({ token: signToken(user), user: mapUser(user) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ error: "User already exists" });
    }

    return next(error);
  }
});

router.post("/login", async (req, res) => {
  const { id, password } = req.body || {};
  if (!id || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const loginId = String(id).trim();
  const user = await User.findOne({
    $or: [
      { email: loginId.toLowerCase() },
      { studentId: loginId.toUpperCase() }
    ]
  });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  return res.json({ token: signToken(user), user: mapUser(user) });
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
