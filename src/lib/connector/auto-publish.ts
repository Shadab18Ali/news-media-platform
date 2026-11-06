import "server-only";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bulkBlocker } from "@/lib/admin/bulk-rules";
import { resolveSettings } from "@/lib/data/settings";

export interface AutoPublishResult { enabled: boolean; hours?: number; published: number; titles?: string[]; skipped?: string[]; message?: string }

/**
 * Publishes machine-written drafts that nobody has edited for `autoPublishHours` (site setting; 0 = off).
 * Used by both the scheduler (/api/cron/publish-scheduled, every few minutes) and the connector endpoint.
 * Only drafts that came from the connector (ai_generated), were never saved by a human (updated_by is null),
 * are older than the window and pass the normal completeness rules are published; they are flagged
 * `auto_published`, which makes the site show a "published without editor review" label.
 */
export async function runAutoPublish(db: SupabaseClient): Promise<AutoPublishResult> {
  const { data: rows } = await db.from("site_settings").select("key,value");
  const raw: Record<string, unknown> = {};
  for (const r of rows ?? []) raw[r.key] = r.value;
  const hours = resolveSettings(raw).features.autoPublishHours;
  if (!hours) return { enabled: false, published: 0, message: "Auto-publishing is off (set 'Auto-publish drafts after (hours)' in Admin > Site settings)." };

  const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data } = await db.from("articles")
    .select("id,title,content,excerpt,category_id,article_type,sponsor_name,featured_image_url,featured_image_alt,ai_generated,sources")
    .eq("status", "draft").eq("ai_generated", true).eq("auto_published", false).is("updated_by", null)
    .lte("created_at", cutoff).order("created_at", { ascending: true }).limit(20);

  const titles: string[] = [];
  const skipped: string[] = [];
  for (const a of data ?? []) {
    const why = bulkBlocker(a);
    if (why) { skipped.push(`${a.title}: ${why}`); continue; }
    const { data: upd, error } = await db.from("articles")
      .update({ status: "published", published_at: new Date().toISOString(), auto_published: true })
      .eq("id", a.id).eq("status", "draft").is("updated_by", null).select("id");
    if (error) { console.error("[auto-publish]", error.message); skipped.push(`${a.title}: could not be saved`); continue; }
    if (upd?.length) titles.push(a.title);
  }
  if (titles.length) {
    revalidatePath("/", "layout");
    await db.from("publish_logs").insert(titles.map((t) => ({ title: t, level: "info", message: `Auto-published after ${hours}h without editor changes` })));
    await db.from("activity_log").insert({ actor_email: "auto-publisher", action: "auto-publish", entity_type: "article", summary: `Auto-published ${titles.length} after ${hours}h: ${titles.join("; ")}`.slice(0, 300) });
  }
  return { enabled: true, hours, published: titles.length, titles, skipped };
}
