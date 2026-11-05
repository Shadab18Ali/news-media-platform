"use server";
import { redirect } from "next/navigation";
import { logActivity, requireStaff } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { revalidatePublicSite } from "@/lib/admin/revalidate";

/** Manual test of the scheduler (same SQL function the cron endpoint calls). Editors and admins only. */
export async function runSchedulerNow(): Promise<void> {
  const ctx = await requireStaff("editor");
  const svc = createServiceClient();
  if (!svc) redirect(`/admin/logs?run=${encodeURIComponent("error:SUPABASE_SERVICE_ROLE_KEY is not configured.")}`);
  const { data, error } = await svc.rpc("publish_due_articles");
  if (error) {
    await svc.from("publish_logs").insert({ level: "error", message: `Manual run failed: ${error.message}`.slice(0, 500) });
    redirect(`/admin/logs?run=${encodeURIComponent("error:The scheduler failed. See the log below.")}`);
  }
  const n = (data as unknown[] | null)?.length ?? 0;
  if (n) revalidatePublicSite();
  await logActivity(ctx, "scheduler", "system", null, `Manual scheduler run: ${n} published`);
  redirect(`/admin/logs?run=${encodeURIComponent(`ok:${n} scheduled article${n === 1 ? "" : "s"} published.`)}`);
}

export async function markMessageRead(fd: FormData): Promise<void> {
  const ctx = await requireStaff("editor");
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await ctx.supabase.from("contact_messages").update({ is_read: fd.get("read") === "1" }).eq("id", id);
  redirect("/admin/subscribers");
}

export async function deleteMessage(fd: FormData): Promise<void> {
  const ctx = await requireStaff("admin");
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await ctx.supabase.from("contact_messages").delete().eq("id", id);
  redirect("/admin/subscribers");
}
