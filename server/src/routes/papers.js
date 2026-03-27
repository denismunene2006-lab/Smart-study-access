import express from "express";
import fs from "fs";
import path from "path";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { computeAccess } from "../utils/access.js";

const router = express.Router();

function buildWhere({ faculty, department, courseCode, year, examType, search }) {
  const clauses = [];
  const values = [];
  let idx = 1;

  if (faculty) {
    clauses.push(`faculty = $${idx++}`);
    values.push(faculty);
  }
  if (department) {
    clauses.push(`department = $${idx++}`);
    values.push(department);
  }
  if (courseCode) {
    clauses.push(`course_code = $${idx++}`);
    values.push(courseCode);
  }
  if (year) {
    clauses.push(`year = $${idx++}`);
    values.push(Number(year));
  }
  if (examType) {
    clauses.push(`exam_type = $${idx++}`);
    values.push(examType);
  }
  if (search) {
    clauses.push(`LOWER(course_code) LIKE $${idx++}`);
    values.push(`%${search.toLowerCase()}%`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values
  };
}

router.get("/", async (req, res) => {
  const { faculty, department, courseCode, year, examType, search } = req.query;
  const { where, values } = buildWhere({ faculty, department, courseCode, year, examType, search });
  const rows = await query(`SELECT * FROM papers ${where} ORDER BY year DESC`, values);

  const papers = rows.map((paper) => ({
    id: paper.id,
    faculty: paper.faculty,
    department: paper.department,
    courseCode: paper.course_code,
    courseName: paper.course_name,
    year: paper.year,
    examType: paper.exam_type,
    pages: null,
    views: paper.views
  }));

  return res.json({ papers });
});

router.get("/:id", async (req, res) => {
  const rows = await query("SELECT * FROM papers WHERE id = $1", [req.params.id]);
  const paper = rows[0];
  if (!paper) {
    return res.status(404).json({ error: "Paper not found" });
  }
  return res.json({
    paper: {
      id: paper.id,
      faculty: paper.faculty,
      department: paper.department,
      courseCode: paper.course_code,
      courseName: paper.course_name,
      year: paper.year,
      examType: paper.exam_type,
      views: paper.views
    }
  });
});

router.get("/:id/stream", authRequired, async (req, res) => {
  const access = computeAccess(req.user);
  if (!access.active) {
    return res.status(403).json({ error: "Subscription required" });
  }

  const rows = await query("SELECT * FROM papers WHERE id = $1", [req.params.id]);
  const paper = rows[0];
  if (!paper) {
    return res.status(404).json({ error: "Paper not found" });
  }

  const storageRoot = path.resolve(process.cwd(), "storage");
  const absolutePath = path.resolve(storageRoot, paper.file_path);
  if (!absolutePath.startsWith(storageRoot)) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: "File missing" });
  }

  await query("UPDATE papers SET views = views + 1 WHERE id = $1", [paper.id]);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${paper.course_code}-${paper.year}.pdf"`);
  const stream = fs.createReadStream(absolutePath);
  return stream.pipe(res);
});

export default router;
