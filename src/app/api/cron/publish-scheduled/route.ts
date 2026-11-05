import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Publishes every article whose scheduled time has passed. Idempotent and safe to call as often as
 * you like: the SQL function locks rows and flips their status atomically, so nothing publishes twice.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this automatically when CRON_SECRET is set).
 * Manual test:  curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/publish-scheduled
 */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!isAuthorizedCron(req.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "Supabase service credentials are not configured" }, { status: 503 });

  const { data, error } = await supabase.rpc("publish_due_articles");
  if (error) {
    console.error("[cron:publish]", error.message);
    await supabase.from("publish_logs").insert({ level: "error", message: `Scheduler failed: ${error.message}`.slice(0, 500) });
    return NextResponse.json({ ok: false, error: "Publishing failed; see publish_logs" }, { status: 500 });
  }

  const published = (data ?? []) as { id: string; title: string; slug: string }[];
  if (published.length) revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, published: published.length, articles: published.map((p) => ({ id: p.id, slug: p.slug })), ranAt: new Date().toISOString() });
}

export const POST = GET;
