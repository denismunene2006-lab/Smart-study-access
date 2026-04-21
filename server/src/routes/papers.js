import express from "express";
import { config } from "../config.js";
import { authRequired } from "../middleware/auth.js";
import { getSupabaseAdmin } from "../supabase.js";
import { computeAccess } from "../utils/access.js";

const router = express.Router();

function buildFilters({ courseCode, year, examType, search }) {
  const filters = {
    courseCode: courseCode ? String(courseCode).trim().toUpperCase() : "",
    year: year ? Number(year) : null,
    examType: examType ? String(examType).trim() : "",
    search: search ? String(search).trim() : ""
  };

  return filters;
}

function mapPaper(paper) {
  return {
    id: paper.id,
    courseCode: paper.course_code,
    unitName: paper.title || paper.course_name,
    courseName: paper.course_name,
    year: paper.year,
    examType: paper.exam_type,
    pages: null,
    views: paper.views || 0
  };
}

router.get("/", async (req, res) => {
  const filters = buildFilters(req.query || {});
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from(config.papersTable)
    .select("*")
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.courseCode) {
    query = query.eq("course_code", filters.courseCode);
  }

  if (filters.year) {
    query = query.eq("year", filters.year);
  }

  if (filters.examType) {
    query = query.eq("exam_type", filters.examType);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ error: error.message || "Unable to fetch papers" });
  }

  const search = filters.search.toLowerCase();
  const filtered = search
    ? (data || []).filter((paper) => {
      const values = [paper.course_code, paper.course_name, paper.title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return values.includes(search);
    })
    : data || [];

  return res.json({ papers: filtered.map(mapPaper) });
});

router.get("/:id", async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { data: paper } = await supabase
    .from(config.papersTable)
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!paper) {
    return res.status(404).json({ error: "Paper not found" });
  }

  return res.json({ paper: mapPaper(paper) });
});

router.get("/:id/stream", authRequired, async (req, res) => {
  const access = computeAccess(req.user);
  if (!access.active) {
    return res.status(403).json({ error: "Subscription required" });
  }

  const supabase = getSupabaseAdmin();
  const { data: paper } = await supabase
    .from(config.papersTable)
    .select("id, course_code, year, storage_path, views")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!paper) {
    return res.status(404).json({ error: "Paper not found" });
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(config.papersBucket)
    .createSignedUrl(paper.storage_path, 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return res.status(404).json({ error: "File missing" });
  }

  const fileResponse = await fetch(signedUrlData.signedUrl);
  if (!fileResponse.ok) {
    return res.status(404).json({ error: "File missing" });
  }

  await supabase
    .from(config.papersTable)
    .update({ views: Number(paper.views || 0) + 1 })
    .eq("id", paper.id);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${paper.course_code}-${paper.year}.pdf"`);
  res.setHeader("Cache-Control", "private, no-store");

  const buffer = Buffer.from(await fileResponse.arrayBuffer());
  return res.send(buffer);
});

export default router;
