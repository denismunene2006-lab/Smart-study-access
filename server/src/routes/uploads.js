import express from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import { authRequired } from "../middleware/auth.js";
import { getSupabaseAdmin } from "../supabase.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
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
    courseCode: uploadDoc.course_code,
    examType: uploadDoc.exam_type,
    year: uploadDoc.year,
    status: uploadDoc.status,
    createdAt: uploadDoc.created_at
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

  const supabase = getSupabaseAdmin();
  const ext = path.extname(req.file.originalname) || ".pdf";
  const filePath = `pending/${uuidv4()}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(config.uploadsBucket)
    .upload(filePath, req.file.buffer, {
      contentType: "application/pdf",
      upsert: false
    });

  if (uploadError) {
    return res.status(500).json({ error: uploadError.message || "Unable to store file" });
  }

  const { data: uploadDoc, error: insertError } = await supabase
    .from(config.uploadsTable)
    .insert({
      uploader_id: req.user.id,
      title: String(title).trim(),
      faculty: String(faculty || "").trim(),
      department: String(department || "").trim(),
      course_code: String(courseCode).trim().toUpperCase(),
      course_name: String(courseName || "").trim(),
      year: Number(year),
      exam_type: String(examType).trim(),
      storage_path: filePath,
      status: "pending"
    })
    .select("*")
    .single();

  if (insertError) {
    return res.status(500).json({ error: insertError.message || "Unable to save upload" });
  }

  return res.json({ upload: mapUpload(uploadDoc) });
});

router.get("/my", authRequired, async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { data: uploads } = await supabase
    .from(config.uploadsTable)
    .select("*")
    .eq("uploader_id", req.user.id)
    .order("created_at", { ascending: false });

  return res.json({ uploads: (uploads || []).map(mapUpload) });
});

export default router;
