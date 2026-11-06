import { NextResponse } from "next/server";
import { z } from "zod";
import { checkConnectorAuth } from "@/lib/connector/auth";
import { connectorArticleSchema } from "@/lib/connector/schema";
import { createServiceClient } from "@/lib/supabase/admin";
import { sanitizeArticleHtml } from "@/lib/content";
import { rateLimit } from "@/lib/security/rate-limit";
import { parseTags } from "@/lib/admin/article-form";
import { absoluteUrl, readingTime, slugify, stripHtml } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Recent headlines (last 3 days, any status) so a writer can avoid repeating stories. */
export async function GET(req: Request) {
  const denied = checkConnectorAuth(req);
  if (denied) return denied;
  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "Server is not configured" }, { status: 503 });
  const since = new Date(Date.now() - 3 * 86400_000).toISOString();
  const { data } = await db.from("articles").select("title,status,category:categories(slug),created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(200);
  return NextResponse.json({ recent: data ?? [] });
}

/**
 * Creates a DRAFT article from an external writer. It can never publish: the article is flagged as
 * machine-assisted and unverified, and the database refuses to publish it until an editor reviews it.
 */
export async function POST(req: Request) {
  const denied = checkConnectorAuth(req);
  if (denied) return denied;
  if (!rateLimit("connector", 60, 60 * 60_000).ok) return NextResponse.json({ error: "Rate limit reached. Try again later." }, { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Body must be JSON" }, { status: 400 }); }
  const parsed = connectorArticleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: z.flattenError(parsed.error).fieldErrors }, { status: 422 });
  const a = parsed.data;

  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "Server is not configured" }, { status: 503 });

  const content = sanitizeArticleHtml(a.content_html);
  if (stripHtml(content).length < 300) return NextResponse.json({ error: "Article body is too short after cleaning" }, { status: 422 });

  const { data: cat } = await db.from("categories").select("id").eq("slug", a.category_slug).maybeSingle();
  if (!cat) return NextResponse.json({ error: `Unknown category_slug "${a.category_slug}". Call GET /api/connector/categories.` }, { status: 422 });
  let authorId: string | null = null;
  if (a.author_slug) {
    const { data: au } = await db.from("authors").select("id").eq("slug", a.author_slug).maybeSingle();
    if (!au) return NextResponse.json({ error: `Unknown author_slug "${a.author_slug}"` }, { status: 422 });
    authorId = au.id;
  }

  // Refuse accidental duplicates (same headline in the last 24 hours).
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: dup } = await db.from("articles").select("id").ilike("title", a.title).gte("created_at", since).limit(1);
  if (dup?.length) return NextResponse.json({ error: "An article with this title was already submitted in the last 24 hours", id: dup[0].id }, { status: 409 });

  const root = slugify(a.title, 85) || "article";
  const { data: clash } = await db.from("articles").select("id").eq("slug", root).limit(1);
  const slug = clash?.length ? `${root}-${Date.now().toString(36).slice(-4)}` : root;

  const { data, error } = await db.from("articles").insert({
    title: a.title, slug, excerpt: a.excerpt, content, article_type: a.article_type, status: "draft",
    category_id: cat.id, author_id: authorId, language: "en",
    seo_title: a.seo_title ?? null, meta_description: a.meta_description ?? null, focus_keyword: a.focus_keyword ?? null,
    sources: a.sources, ai_generated: true, fact_checked: false, reading_time_minutes: readingTime(content),
    editorial_notes: `Submitted through the connector API (machine-written, NOT reviewed).${a.image_prompt ? `\nImage concept: ${a.image_prompt}` : ""}\nBefore publishing: verify facts and quotes against the listed sources, add an original/licensed image with alt text, then tick "reviewed" and "fact-checked".`,
  }).select("id,slug").single();
  if (error || !data) {
    console.error("[connector]", error?.message);
    return NextResponse.json({ error: "Could not save the draft" }, { status: 500 });
  }

  const tags = parseTags(a.tags.join(","));
  if (tags.length) {
    await db.from("tags").upsert(tags, { onConflict: "slug", ignoreDuplicates: true });
    const { data: rows } = await db.from("tags").select("id").in("slug", tags.map((t) => t.slug));
    if (rows?.length) await db.from("article_tags").insert(rows.map((t) => ({ article_id: data.id, tag_id: t.id })));
  }
  await db.from("activity_log").insert({ actor_email: "connector", action: "connector-draft", entity_type: "article", entity_id: data.id, summary: `Draft received: ${a.title}`.slice(0, 300) });

  return NextResponse.json({ ok: true, id: data.id, status: "draft", message: "Saved as a draft. An editor must review and publish it.", review_url: absoluteUrl(`/admin/articles/${data.id}/edit`) }, { status: 201 });
}
