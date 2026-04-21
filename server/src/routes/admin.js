import express from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import { authRequired, adminRequired } from "../middleware/auth.js";
import { getSupabaseAdmin } from "../supabase.js";

const router = express.Router();

async function addBonusDays(supabase, userId, days) {
  const { data: profile } = await supabase
    .from(config.profilesTable)
    .select("id, bonus_days")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return;
  }

  await supabase
    .from(config.profilesTable)
    .update({
      bonus_days: Number(profile.bonus_days || 0) + days,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);
}

router.get("/metrics", authRequired, adminRequired, async (req, res) => {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const [activeSubscriptions, totalReferrals, mostViewed, pendingUploads] = await Promise.all([
    supabase
      .from(config.profilesTable)
      .select("id", { count: "exact", head: true })
      .gt("subscription_ends_at", now),
    supabase
      .from(config.referralsTable)
      .select("id", { count: "exact", head: true }),
    supabase
      .from(config.papersTable)
      .select("course_code, views")
      .order("views", { ascending: false })
      .limit(3),
    supabase
      .from(config.uploadsTable)
      .select("id, title, course_code, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
  ]);

  return res.json({
    activeSubscriptions: activeSubscriptions.count || 0,
    totalReferrals: totalReferrals.count || 0,
    mostViewed: (mostViewed.data || []).map((paper) => ({
      courseCode: paper.course_code,
      views: paper.views || 0
    })),
    pendingUploads: (pendingUploads.data || []).map((upload) => ({
      id: upload.id,
      title: upload.title,
      courseCode: upload.course_code,
      createdAt: upload.created_at
    }))
  });
});

router.patch("/uploads/:id/approve", authRequired, adminRequired, async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { data: upload } = await supabase
    .from(config.uploadsTable)
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!upload) {
    return res.status(404).json({ error: "Upload not found" });
  }

  if (upload.status !== "pending") {
    return res.status(400).json({ error: "Upload already reviewed" });
  }

  const { data: sourceFile, error: sourceFileError } = await supabase.storage
    .from(config.uploadsBucket)
    .download(upload.storage_path);

  if (sourceFileError || !sourceFile) {
    return res.status(404).json({ error: "Uploaded file is missing" });
  }

  const fileName = `${uuidv4()}.pdf`;
  const destinationPath = `approved/${fileName}`;
  const fileBuffer = Buffer.from(await sourceFile.arrayBuffer());

  const { error: uploadPaperError } = await supabase.storage
    .from(config.papersBucket)
    .upload(destinationPath, fileBuffer, {
      contentType: "application/pdf",
      upsert: false
    });

  if (uploadPaperError) {
    return res.status(500).json({ error: uploadPaperError.message || "Unable to move file" });
  }

  await supabase.storage.from(config.uploadsBucket).remove([upload.storage_path]);

  await supabase
    .from(config.uploadsTable)
    .update({
      status: "approved",
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", upload.id);

  await supabase.from(config.papersTable).insert({
    title: upload.title,
    faculty: upload.faculty,
    department: upload.department,
    course_code: upload.course_code,
    course_name: upload.course_name,
    year: upload.year,
    exam_type: upload.exam_type,
    storage_path: destinationPath,
    uploader_id: upload.uploader_id,
    approved_by: req.user.id,
    approved_at: new Date().toISOString(),
    views: 0
  });

  if (upload.uploader_id) {
    await addBonusDays(supabase, upload.uploader_id, 2);
    await supabase.from(config.rewardsTable).insert({
      user_id: upload.uploader_id,
      source_type: "upload",
      source_id: upload.id,
      days: 2
    });
  }

  return res.json({ status: "approved" });
});

router.patch("/uploads/:id/reject", authRequired, adminRequired, async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { data: upload } = await supabase
    .from(config.uploadsTable)
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!upload) {
    return res.status(404).json({ error: "Upload not found" });
  }

  if (upload.status !== "pending") {
    return res.status(400).json({ error: "Upload already reviewed" });
  }

  await supabase.storage.from(config.uploadsBucket).remove([upload.storage_path]);

  await supabase
    .from(config.uploadsTable)
    .update({
      status: "rejected",
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", upload.id);

  return res.json({ status: "rejected" });
});

export default router;
