import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { checkConnectorAuth } from "@/lib/connector/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { bulkBlocker } from "@/lib/admin/bulk-rules";
import { resolveSettings } from "@/lib/data/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Publishes machine-written drafts that nobody has touched for `autoPublishHours` (a site setting;
 * 0 = disabled, which is the default). Called by the scheduled writer after each run.
 *
 * Only drafts that (1) came from the connector (ai_generated), (2) were never saved by a human
 * (updated_by is null: opening and saving a draft keeps it in the editor's hands), (3) are older than
 * the window and (4) pass the normal completeness rules are published. They are flagged
 * `auto_published`, which makes the site show an "published without editor review" label.
 */
export async function POST(req: Request) {
  const denied = checkConnectorAuth(req);
  if (denied) return denied;
  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "Server is not configured" }, { status: 503 });

  const { data: rows } = await db.from("site_settings").select("key,value");
  const raw: Record<string, unknown> = {};
  for (const r of rows ?? []) raw[r.key] = r.value;
  const hours = resolveSettings(raw).features.autoPublishHours;
  if (!hours) return NextResponse.json({ enabled: false, published: 0, message: "Auto-publishing is off (set 'Auto-publish drafts after (hours)' in Admin > Site settings)." });

  const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data } = await db.from("articles")
    .select("id,title,content,excerpt,category_id,article_type,sponsor_name,featured_image_url,featured_image_alt,ai_generated,sources")
    .eq("status", "draft").eq("ai_generated", true).eq("auto_published", false).is("updated_by", null)
    .lte("created_at", cutoff).order("created_at", { ascending: true }).limit(20);

  const published: string[] = [];
  const skipped: string[] = [];
  for (const a of data ?? []) {
    const why = bulkBlocker(a);
    if (why) { skipped.push(`${a.title}: ${why}`); continue; }
    const { data: upd, error } = await db.from("articles")
      .update({ status: "published", published_at: new Date().toISOString(), auto_published: true })
      .eq("id", a.id).eq("status", "draft").is("updated_by", null).select("id");
    if (error) { console.error("[auto-publish]", error.message); skipped.push(`${a.title}: could not be saved`); continue; }
    if (upd?.length) published.push(a.title);
  }
  if (published.length) {
    revalidatePath("/", "layout");
    await db.from("activity_log").insert({ actor_email: "auto-publisher", action: "auto-publish", entity_type: "article", summary: `Auto-published ${published.length} after ${hours}h: ${published.join("; ")}`.slice(0, 300) });
  }
  return NextResponse.json({ enabled: true, hours, published: published.length, titles: published, skipped });
}
