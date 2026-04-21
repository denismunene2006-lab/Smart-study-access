import { config } from "./config.js";
import { getSupabaseAdmin } from "./supabase.js";

let lastCheckAt = null;

export async function connectToDatabase() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    const error = new Error("Supabase is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from(config.profilesTable)
    .select("id", { count: "exact", head: true });

  if (error) {
    const err = new Error(error.message || "Supabase connection failed.");
    err.statusCode = 503;
    throw err;
  }

  lastCheckAt = new Date().toISOString();
  return { ready: true, checkedAt: lastCheckAt };
}

export async function checkDatabaseConnection() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    return {
      status: "not_configured",
      ready: false,
      source: null,
      error: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    };
  }

  try {
    await connectToDatabase();
    return {
      status: "ok",
      ready: true,
      source: "supabase",
      projectUrl: config.supabaseUrl,
      checkedAt: lastCheckAt
    };
  } catch (error) {
    return {
      status: "error",
      ready: false,
      source: "supabase",
      error: error?.message || "Supabase health check failed."
    };
  }
}

export async function closeDatabaseConnection() {
  return Promise.resolve();
}
