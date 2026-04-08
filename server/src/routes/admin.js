import express from "express";
import fs from "fs";
import path from "path";
import { authRequired, adminRequired } from "../middleware/auth.js";
import {
  Paper,
  Referral,
  Reward,
  Upload,
  User
} from "../models.js";
import { papersRoot, storageRoot } from "../paths.js";

const router = express.Router();

router.get("/metrics", authRequired, adminRequired, async (req, res) => {
  const [activeSubscriptions, totalReferrals, mostViewed, pendingUploads] = await Promise.all([
    User.countDocuments({ subscriptionEndsAt: { $gt: new Date() } }),
    Referral.countDocuments(),
    Paper.find().sort({ views: -1 }).limit(3).lean(),
    Upload.find({ status: "pending" }).sort({ createdAt: -1 }).lean()
  ]);

  return res.json({
    activeSubscriptions,
    totalReferrals,
    mostViewed: mostViewed.map((paper) => ({
      courseCode: paper.courseCode,
      views: paper.views || 0
    })),
    pendingUploads: pendingUploads.map((upload) => ({
      id: upload._id.toString(),
      title: upload.title,
      courseCode: upload.courseCode,
      createdAt: upload.createdAt
    }))
  });
});

router.patch("/uploads/:id/approve", authRequired, adminRequired, async (req, res) => {
  const upload = await Upload.findById(req.params.id);
  if (!upload) {
    return res.status(404).json({ error: "Upload not found" });
  }

  if (upload.status !== "pending") {
    return res.status(400).json({ error: "Upload already reviewed" });
  }

  const sourcePath = path.resolve(storageRoot, upload.filePath);
  const fileName = path.basename(upload.filePath);
  const destPath = path.resolve(papersRoot, fileName);

  if (!fs.existsSync(sourcePath)) {
    return res.status(404).json({ error: "Uploaded file is missing" });
  }

  fs.renameSync(sourcePath, destPath);

  upload.status = "approved";
  upload.reviewedBy = req.user._id;
  upload.reviewedAt = new Date();
  await upload.save();

  await Paper.create({
    title: upload.title,
    faculty: upload.faculty,
    department: upload.department,
    courseCode: upload.courseCode,
    courseName: upload.courseName,
    year: upload.year,
    examType: upload.examType,
    filePath: `papers/${fileName}`,
    uploaderId: upload.uploaderId,
    approvedBy: req.user._id,
    approvedAt: new Date()
  });

  if (upload.uploaderId) {
    await User.findByIdAndUpdate(upload.uploaderId, { $inc: { bonusDays: 2 } });
    await Reward.create({
      userId: upload.uploaderId,
      sourceType: "upload",
      sourceId: upload.id,
      days: 2
    });
  }

  return res.json({ status: "approved" });
});

router.patch("/uploads/:id/reject", authRequired, adminRequired, async (req, res) => {
  const upload = await Upload.findById(req.params.id);
  if (!upload) {
    return res.status(404).json({ error: "Upload not found" });
  }

  if (upload.status !== "pending") {
    return res.status(400).json({ error: "Upload already reviewed" });
  }

  const sourcePath = path.resolve(storageRoot, upload.filePath);
  if (fs.existsSync(sourcePath)) {
    fs.unlinkSync(sourcePath);
  }

  upload.status = "rejected";
  upload.reviewedBy = req.user._id;
  upload.reviewedAt = new Date();
  await upload.save();

  return res.json({ status: "rejected" });
});

export default router;
