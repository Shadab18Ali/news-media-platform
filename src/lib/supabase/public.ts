import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

let cached: SupabaseClient | null = null;

/**
 * Cookie-less anonymous client for public pages. Because it never reads cookies, pages
 * that use it stay statically renderable/ISR-cacheable. RLS limits it to published content.
 */
export function createPublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  cached ??= createClient(supabaseUrl()!, supabaseAnonKey()!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
