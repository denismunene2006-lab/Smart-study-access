import express from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import { getSupabaseAdmin, getSupabaseAuthClient } from "../supabase.js";
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

async function generateReferralCode(supabase) {
  for (let i = 0; i < 6; i += 1) {
    const code = uuidv4().split("-")[0].toUpperCase();
    const { data } = await supabase
      .from(config.profilesTable)
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!data) {
      return code;
    }
  }

  return uuidv4().split("-")[0].toUpperCase();
}

async function applyReferralReward(supabase, normalizedReferral, newUserId) {
  if (!normalizedReferral) {
    return;
  }

  const { data: referrer } = await supabase
    .from(config.profilesTable)
    .select("id, referral_progress, referral_cycles, bonus_days")
    .eq("referral_code", normalizedReferral)
    .maybeSingle();

  if (!referrer?.id) {
    return;
  }

  await supabase
    .from(config.referralsTable)
    .insert({
      referrer_id: referrer.id,
      referred_user_id: newUserId
    });

  const progress = Number(referrer.referral_progress || 0) + 1;
  const rewardUnlocked = progress >= 3;
  const nextProgress = rewardUnlocked ? 0 : progress;
  const nextCycles = rewardUnlocked
    ? Number(referrer.referral_cycles || 0) + 1
    : Number(referrer.referral_cycles || 0);
  const nextBonusDays = rewardUnlocked
    ? Number(referrer.bonus_days || 0) + 7
    : Number(referrer.bonus_days || 0);

  await supabase
    .from(config.profilesTable)
    .update({
      referral_progress: nextProgress,
      referral_cycles: nextCycles,
      bonus_days: nextBonusDays,
      updated_at: new Date().toISOString()
    })
    .eq("id", referrer.id);

  if (rewardUnlocked) {
    await supabase
      .from(config.rewardsTable)
      .insert({
        user_id: referrer.id,
        source_type: "referral",
        source_id: newUserId,
        days: 7
      });
  }
}

router.post("/signup", async (req, res, next) => {
  const { name, email, studentId, password, referralCode } = req.body || {};

  if (!name || !email || !studentId || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const supabase = getSupabaseAdmin();
    const supabaseAuth = getSupabaseAuthClient();
    const normalizedEmail = normalizeEmail(email);
    const normalizedStudentId = normalizeStudentId(studentId);

    const { data: emailMatch } = await supabase
      .from(config.profilesTable)
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const { data: studentMatch } = await supabase
      .from(config.profilesTable)
      .select("id")
      .eq("student_id", normalizedStudentId)
      .maybeSingle();

    if (emailMatch || studentMatch) {
      return res.status(400).json({ error: "User already exists" });
    }

    const signUpResult = await supabaseAuth.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: String(name).trim(),
          student_id: normalizedStudentId
        }
      }
    });

    if (signUpResult.error || !signUpResult.data.user?.id) {
      return res.status(400).json({ error: signUpResult.error?.message || "Signup failed" });
    }

    const userId = signUpResult.data.user.id;
    const referral = await generateReferralCode(supabase);
    const trialEndsAt = addDays(new Date(), 7).toISOString();

    const { data: profile, error: profileError } = await supabase
      .from(config.profilesTable)
      .upsert({
        id: userId,
        full_name: String(name).trim(),
        email: normalizedEmail,
        student_id: normalizedStudentId,
        role: "student",
        referral_code: referral,
        referral_progress: 0,
        referral_cycles: 0,
        bonus_days: 0,
        trial_ends_at: trialEndsAt,
        subscription_ends_at: null
      }, { onConflict: "id" })
      .select("*")
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message || "Unable to create profile" });
    }

    const normalizedReferral = normalizeReferralCode(referralCode);
    await applyReferralReward(supabase, normalizedReferral, userId);

    const signInResult = await supabaseAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (signInResult.error || !signInResult.data.session?.access_token) {
      return res.status(400).json({ error: signInResult.error?.message || "Signup succeeded but login failed" });
    }

    return res.json({ token: signInResult.data.session.access_token, user: mapUser(profile) });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res) => {
  const { id, password } = req.body || {};
  if (!id || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const supabase = getSupabaseAdmin();
  const supabaseAuth = getSupabaseAuthClient();
  const loginId = String(id).trim();
  let loginEmail = loginId.toLowerCase();

  if (!loginId.includes("@")) {
    const { data: profile } = await supabase
      .from(config.profilesTable)
      .select("email")
      .eq("student_id", loginId.toUpperCase())
      .maybeSingle();

    loginEmail = profile?.email || loginEmail;
  }

  const signInResult = await supabaseAuth.auth.signInWithPassword({
    email: loginEmail,
    password
  });

  if (signInResult.error || !signInResult.data.user?.id || !signInResult.data.session?.access_token) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const { data: profile } = await supabase
    .from(config.profilesTable)
    .select("*")
    .eq("id", signInResult.data.user.id)
    .maybeSingle();

  if (!profile) {
    return res.status(404).json({ error: "Profile is not set up for this account" });
  }

  return res.json({
    token: signInResult.data.session.access_token,
    user: mapUser(profile)
  });
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
