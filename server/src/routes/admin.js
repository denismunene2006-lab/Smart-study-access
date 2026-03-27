import express from "express";
import fs from "fs";
import path from "path";
import { authRequired, adminRequired } from "../middleware/auth.js";
import { query } from "../db.js";

const router = express.Router();

const storageRoot = path.resolve(process.cwd(), "storage");
const papersRoot = path.resolve(storageRoot, "papers");

router.get("/metrics", authRequired, adminRequired, async (req, res) => {
  const activeRows = await query(
    "SELECT COUNT(*)::int AS count FROM users WHERE subscription_ends_at > now()"
  );
  const referralsRows = await query(
    "SELECT COALESCE(SUM(referral_cycles * 3 + referral_progress), 0)::int AS total FROM users"
  );
  const topViewed = await query(
    "SELECT course_code, views FROM papers ORDER BY views DESC LIMIT 3"
  );
  const pendingUploads = await query(
    "SELECT id, title, course_code, created_at FROM uploads WHERE status = 'pending' ORDER BY created_at DESC"
  );

  return res.json({
    activeSubscriptions: activeRows[0]?.count || 0,
    totalReferrals: referralsRows[0]?.total || 0,
    mostViewed: topViewed.map((row) => ({
      courseCode: row.course_code,
      views: row.views
    })),
    pendingUploads: pendingUploads.map((row) => ({
      id: row.id,
      title: row.title,
      courseCode: row.course_code,
      createdAt: row.created_at
    }))
  });
});

router.patch("/uploads/:id/approve", authRequired, adminRequired, async (req, res) => {
  const uploadRows = await query("SELECT * FROM uploads WHERE id = $1", [req.params.id]);
  const upload = uploadRows[0];
  if (!upload) {
    return res.status(404).json({ error: "Upload not found" });
  }
  if (upload.status !== "pending") {
    return res.status(400).json({ error: "Upload already reviewed" });
  }

  const sourcePath = path.resolve(storageRoot, upload.file_path);
  const fileName = path.basename(upload.file_path);
  const destPath = path.resolve(papersRoot, fileName);

  if (fs.existsSync(sourcePath)) {
    fs.renameSync(sourcePath, destPath);
  }

  await query(
    "UPDATE uploads SET status = 'approved', reviewed_by = $1, reviewed_at = now() WHERE id = $2",
    [req.user.id, upload.id]
  );

  await query(
    "INSERT INTO papers (faculty, department, course_code, course_name, year, exam_type, file_path, uploader_id, approved_by, approved_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())",
    [
      upload.faculty,
      upload.department,
      upload.course_code,
      upload.course_name || upload.title,
      upload.year,
      upload.exam_type,
      path.join("papers", fileName),
      upload.uploader_id,
      req.user.id
    ]
  );

  await query(
    "UPDATE users SET bonus_days = bonus_days + 2, updated_at = now() WHERE id = $1",
    [upload.uploader_id]
  );
  await query(
    "INSERT INTO rewards (user_id, source_type, source_id, days) VALUES ($1, $2, $3, $4)",
    [upload.uploader_id, "upload", upload.id, 2]
  );

  return res.json({ status: "approved" });
});

router.patch("/uploads/:id/reject", authRequired, adminRequired, async (req, res) => {
  const uploadRows = await query("SELECT * FROM uploads WHERE id = $1", [req.params.id]);
  const upload = uploadRows[0];
  if (!upload) {
    return res.status(404).json({ error: "Upload not found" });
  }
  if (upload.status !== "pending") {
    return res.status(400).json({ error: "Upload already reviewed" });
  }

  await query(
    "UPDATE uploads SET status = 'rejected', reviewed_by = $1, reviewed_at = now() WHERE id = $2",
    [req.user.id, upload.id]
  );

  return res.json({ status: "rejected" });
});

export default router;
