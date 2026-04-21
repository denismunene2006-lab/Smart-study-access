import { config } from "../config.js";
import { getSupabaseAdmin } from "../supabase.js";

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: profile, error: profileError } = await supabase
      .from(config.profilesTable)
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = profile;
    req.authUser = authData.user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  return next();
}
