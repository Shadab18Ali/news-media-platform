import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Service-role client. BYPASSES Row Level Security. Server-only (the `server-only` import
 * makes the build fail if this is ever imported from client code). Use it solely for:
 * the cron publisher, newsletter sign-ups, and the contact form.
 */
export function createServiceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = supabaseUrl();
  if (!key || !url) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
