import { config } from "../config.js";
import { getSupabaseAdmin } from "../supabase.js";

export function ensureStorageDirectories() {
  return {
    papersBucket: config.papersBucket,
    uploadsBucket: config.uploadsBucket
  };
}

export async function getStorageStatus() {
  try {
    const supabase = getSupabaseAdmin();
    const [papersList, uploadsList] = await Promise.all([
      supabase.storage.from(config.papersBucket).list("", { limit: 1 }),
      supabase.storage.from(config.uploadsBucket).list("", { limit: 1 })
    ]);

    if (papersList.error || uploadsList.error) {
      return {
        status: "error",
        ready: false,
        error: papersList.error?.message || uploadsList.error?.message || "Storage buckets unavailable"
      };
    }

    return {
      status: "ok",
      ready: true,
      paths: {
        uploadsBucket: config.uploadsBucket,
        papersBucket: config.papersBucket
      }
    };
  } catch (error) {
    return {
      status: "error",
      ready: false,
      error: error.message
    };
  }
}
