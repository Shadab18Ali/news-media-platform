"use server";
import { redirect } from "next/navigation";
import { logActivity, requireStaff } from "@/lib/admin/auth";
import { revalidatePublicSite } from "@/lib/admin/revalidate";
import { bulkBlocker } from "@/lib/admin/bulk-rules";

const uuid = /^[0-9a-f-]{36}$/i;
const RELEASE = new Set(["now", "5", "10", "30", "60"]);

interface Row {
  id: string; title: string; status: string; content: string; excerpt: string | null; category_id: string | null; article_type: string;
  sponsor_name: string | null; featured_image_url: string | null; featured_image_alt: string | null; ai_generated: boolean; sources: unknown[] | null;
  human_reviewed_at: string | null; human_reviewed_by: string | null;
}

/**
 * Publish (or schedule) several drafts at once. The editor must tick the confirmation that they have
 * reviewed the selected articles and checked the facts; that confirmation is recorded as the human
 * review on machine-assisted drafts. Articles that fail the normal publishing rules are skipped and listed.
 */
export async function bulkPublish(fd: FormData): Promise<void> {
  const ctx = await requireStaff("editor");
  const ids = [...new Set(fd.getAll("ids").map(String).filter((i) => uuid.test(i)))].slice(0, 100);
  const release = String(fd.get("release") ?? "now");
  const back = (msg: string) => redirect(`/admin/articles?bulk=${encodeURIComponent(msg.slice(0, 900))}`);

  if (!ids.length) back("error:Select at least one article first.");
  if (fd.get("confirm") !== "on") back("error:Please tick the confirmation that you have reviewed the selected articles and checked their facts.");
  if (!RELEASE.has(release)) back("error:Invalid release option.");

  const { data } = await ctx.supabase.from("articles")
    .select("id,title,status,content,excerpt,category_id,article_type,sponsor_name,featured_image_url,featured_image_alt,ai_generated,sources,human_reviewed_at,human_reviewed_by,created_at")
    .in("id", ids).in("status", ["draft", "in_review"]).order("created_at", { ascending: true });
  const rows = (data ?? []) as (Row & { created_at: string })[];

  const skipped: string[] = [];
  let done = 0;
  const now = Date.now();
  for (const a of rows) {
    const why = bulkBlocker(a);
    if (why) { skipped.push(`"${a.title.slice(0, 50)}": ${why}`); continue; }
    const iso = new Date().toISOString();
    const reviewed = a.ai_generated
      ? { fact_checked: true, human_reviewed_by: a.human_reviewed_by ?? ctx.user.id, human_reviewed_at: a.human_reviewed_at ?? iso }
      : {};
    const patch = release === "now"
      ? { ...reviewed, status: "published", published_at: iso, scheduled_for: null, updated_by: ctx.user.id }
      : { ...reviewed, status: "scheduled", published_at: null, scheduled_for: new Date(now + (done + 1) * Number(release) * 60_000).toISOString(), updated_by: ctx.user.id };
    const { error } = await ctx.supabase.from("articles").update(patch).eq("id", a.id);
    if (error) { console.error("[bulk]", error.message); skipped.push(`"${a.title.slice(0, 50)}": could not be saved`); continue; }
    done++;
  }
  const missing = ids.length - rows.length;
  if (missing > 0) skipped.push(`${missing} selected item(s) were not drafts any more`);

  await logActivity(ctx, "bulk-publish", "article", null, `Bulk ${release === "now" ? "published" : `scheduled (every ${release} min)`}: ${done} article(s), ${skipped.length} skipped`);
  if (done) revalidatePublicSite();
  const head = release === "now" ? `${done} article(s) published.` : `${done} article(s) scheduled, one every ${release} minutes.`;
  back(`${done ? "ok" : "error"}:${head}${skipped.length ? ` Skipped: ${skipped.join("; ")}` : ""}`);
}
