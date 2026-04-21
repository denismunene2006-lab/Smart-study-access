import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

let adminClient = null;

export function getSupabaseAdmin() {
  if (adminClient) {
    return adminClient;
  }

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error("Supabase admin client is not configured.");
  }

  adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return adminClient;
}

export function getSupabaseAuthClient() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("Supabase auth client is not configured.");
  }

  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
