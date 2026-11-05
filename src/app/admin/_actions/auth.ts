"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import type { ActionState } from "@/lib/admin/types";
import { hasRole } from "@/lib/admin/auth";
import type { Role } from "@/config/site";

const schema = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) });

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const limit = rateLimit(`login:${ip}`, 8, 15 * 60_000);
  if (!limit.ok) return { ok: false, message: `Too many attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` };

  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, message: "Enter a valid email and password." };

  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: "Supabase is not configured. See DATABASE_SETUP.md." };

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  // Deliberately generic: do not reveal whether the account exists.
  if (error || !data.user) return { ok: false, message: "Invalid email or password." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (!hasRole((profile?.role ?? "reader") as Role, "writer")) {
    await supabase.auth.signOut();
    return { ok: false, message: "This account does not have dashboard access." };
  }

  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("//") && !next.includes("login") ? next : "/admin");
}

export async function logoutAction() {
  const supabase = await createServerSupabase();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}
