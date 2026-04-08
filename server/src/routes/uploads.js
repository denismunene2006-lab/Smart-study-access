import express from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { authRequired } from "../middleware/auth.js";
import { Upload } from "../models.js";
import { uploadsRoot } from "../paths.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }

    return cb(null, true);
  }
});

function mapUpload(uploadDoc) {
  return {
    id: uploadDoc.id,
    title: uploadDoc.title,
    courseCode: uploadDoc.courseCode,
    examType: uploadDoc.examType,
    year: uploadDoc.year,
    status: uploadDoc.status,
    createdAt: uploadDoc.createdAt
  };
}

router.post("/", authRequired, upload.single("file"), async (req, res) => {
  const {
    title,
    faculty,
    department,
    courseCode,
    courseName,
    year,
    examType
  } = req.body || {};

  if (!req.file || !title || !courseCode || !year || !examType) {
    return res.status(400).json({ error: "Missing upload details" });
  }

  const uploadDoc = await Upload.create({
    uploaderId: req.user._id,
    title: String(title).trim(),
    faculty: String(faculty || "").trim(),
    department: String(department || "").trim(),
    courseCode: String(courseCode).trim().toUpperCase(),
    courseName: String(courseName || "").trim(),
    year: Number(year),
    examType: String(examType).trim(),
    filePath: `uploads/${req.file.filename}`
  });

  return res.json({ upload: mapUpload(uploadDoc) });
});

router.get("/my", authRequired, async (req, res) => {
  const uploads = await Upload.find({ uploaderId: req.user._id }).sort({ createdAt: -1 });
  return res.json({ uploads: uploads.map(mapUpload) });
});

export default router;
