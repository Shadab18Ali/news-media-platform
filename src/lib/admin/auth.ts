import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/config/site";

export interface StaffContext {
  supabase: SupabaseClient;
  user: User;
  role: Role;
  fullName: string | null;
}

const rank = (r: Role) => ROLES.indexOf(r);
export const hasRole = (role: Role, min: Role) => rank(role) >= rank(min);

/** Returns the signed-in staff member (writer/editor/admin) or null. Never trusts client claims. */
export async function getStaff(): Promise<StaffContext | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser(); // validated against Supabase Auth
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id", user.id).maybeSingle();
  const role = (profile?.role ?? "reader") as Role;
  if (!hasRole(role, "writer")) return null;
  return { supabase, user, role, fullName: profile?.full_name ?? null };
}

/** Page/action guard. Redirects to login when unauthenticated or lacking the minimum role. */
export async function requireStaff(min: Role = "writer"): Promise<StaffContext> {
  const ctx = await getStaff();
  if (!ctx) redirect("/admin/login");
  if (!hasRole(ctx.role, min)) redirect("/admin?denied=1");
  return ctx;
}

export async function logActivity(ctx: StaffContext, action: string, entityType: string, entityId: string | null, summary: string) {
  const { error } = await ctx.supabase.from("activity_log").insert({
    actor_id: ctx.user.id, actor_email: ctx.user.email, action, entity_type: entityType, entity_id: entityId, summary: summary.slice(0, 300),
  });
  if (error) console.error("[activity]", error.message);
}
