import express from "express";
import fs from "fs";
import path from "path";
import { Paper } from "../models.js";
import { authRequired } from "../middleware/auth.js";
import { storageRoot } from "../paths.js";
import { computeAccess } from "../utils/access.js";

const router = express.Router();

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFilters({ courseCode, year, examType, search }) {
  const filters = {};

  if (courseCode) {
    filters.courseCode = new RegExp(`^${escapeRegExp(String(courseCode).trim())}$`, "i");
  }

  if (year) {
    filters.year = Number(year);
  }

  if (examType) {
    filters.examType = String(examType).trim();
  }

  if (search) {
    const pattern = new RegExp(escapeRegExp(String(search).trim()), "i");
    filters.$or = [
      { courseCode: pattern },
      { courseName: pattern },
      { title: pattern }
    ];
  }

  return filters;
}

function mapPaper(paper) {
  return {
    id: paper.id,
    courseCode: paper.courseCode,
    unitName: paper.title || paper.courseName,
    courseName: paper.courseName,
    year: paper.year,
    examType: paper.examType,
    pages: null,
    views: paper.views || 0
  };
}

router.get("/", async (req, res) => {
  const filters = buildFilters(req.query || {});
  const papers = await Paper.find(filters).sort({ year: -1, createdAt: -1 }).lean();
  return res.json({ papers: papers.map((paper) => mapPaper({ ...paper, id: paper._id.toString() })) });
});

router.get("/:id", async (req, res) => {
  const paper = await Paper.findById(req.params.id).lean();
  if (!paper) {
    return res.status(404).json({ error: "Paper not found" });
  }

  const mapped = mapPaper({ ...paper, id: paper._id.toString() });
  return res.json({ paper: mapped });
});

router.get("/:id/stream", authRequired, async (req, res) => {
  const access = computeAccess(req.user);
  if (!access.active) {
    return res.status(403).json({ error: "Subscription required" });
  }

  const paper = await Paper.findById(req.params.id);
  if (!paper) {
    return res.status(404).json({ error: "Paper not found" });
  }

  const absolutePath = path.resolve(storageRoot, paper.filePath);
  if (!absolutePath.startsWith(storageRoot)) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: "File missing" });
  }

  await Paper.findByIdAndUpdate(paper._id, { $inc: { views: 1 } });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${paper.courseCode}-${paper.year}.pdf"`);
  res.setHeader("Cache-Control", "private, no-store");
  const stream = fs.createReadStream(absolutePath);
  return stream.pipe(res);
});

export default router;
