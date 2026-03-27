import express from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { authRequired } from "../middleware/auth.js";
import { query } from "../db.js";

const router = express.Router();

const storageRoot = path.resolve(process.cwd(), "storage", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageRoot);
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

router.post("/", authRequired, upload.single("file"), async (req, res) => {
  const { title, faculty, department, courseCode, courseName, year, examType } = req.body || {};
  if (!req.file || !title || !faculty || !department || !courseCode || !year || !examType) {
    return res.status(400).json({ error: "Missing upload details" });
  }

  const relativePath = path.join("uploads", req.file.filename);
  const rows = await query(
    "INSERT INTO uploads (uploader_id, title, faculty, department, course_code, course_name, year, exam_type, file_path) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
    [req.user.id, title, faculty, department, courseCode, courseName || null, Number(year), examType, relativePath]
  );

  return res.json({ upload: rows[0] });
});

router.get("/my", authRequired, async (req, res) => {
  const rows = await query(
    "SELECT * FROM uploads WHERE uploader_id = $1 ORDER BY created_at DESC",
    [req.user.id]
  );
  const uploads = rows.map((uploadRow) => ({
    id: uploadRow.id,
    title: uploadRow.title,
    courseCode: uploadRow.course_code,
    examType: uploadRow.exam_type,
    year: uploadRow.year,
    status: uploadRow.status,
    createdAt: uploadRow.created_at
  }));
  return res.json({ uploads });
});

export default router;
