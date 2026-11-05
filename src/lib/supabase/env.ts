export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
}
export function supabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined;
}
export function isSupabaseConfigured(): boolean {
  const url = supabaseUrl();
  return Boolean(url && /^https?:\/\//.test(url) && supabaseAnonKey());
}
