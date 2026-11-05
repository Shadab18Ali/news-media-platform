"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity, requireStaff, hasRole, type StaffContext } from "@/lib/admin/auth";
import type { ActionState } from "@/lib/admin/types";
import { revalidatePublicSite } from "@/lib/admin/revalidate";
import { articleFormSchema, parseSources, parseTags, readArticleFormData, type ArticleForm } from "@/lib/admin/article-form";
import { sanitizeArticleHtml } from "@/lib/content";
import { readingTime, slugify, stripHtml, zonedLocalToUtcIso } from "@/lib/utils";
import { SITE_CONFIG, type ArticleStatus } from "@/config/site";
import type { Article } from "@/types/db";

type Ctx = StaffContext;

async function uniqueSlug(ctx: Ctx, base: string, excludeId?: string): Promise<string> {
  const root = slugify(base, 90) || "article";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    let q = ctx.supabase.from("articles").select("id").eq("slug", candidate).limit(1);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q;
    if (!data?.length) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function fieldErrors(err: z.ZodError): Record<string, string[]> {
  return z.flattenError(err).fieldErrors as Record<string, string[]>;
}

export async function saveArticle(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireStaff("writer");
  const id = String(fd.get("id") ?? "") || null;

  const parsed = articleFormSchema.safeParse(readArticleFormData(fd));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  const f: ArticleForm = parsed.data;
  const isEditor = hasRole(ctx.role, "editor");

  // ---- existing record & permissions ------------------------------------------------
  let existing: Article | null = null;
  if (id) {
    const { data } = await ctx.supabase.from("articles").select("*").eq("id", id).maybeSingle();
    if (!data) return { ok: false, message: "Article not found or you do not have access to it." };
    existing = data as Article;
    if (!isEditor && (existing.created_by !== ctx.user.id || !["draft", "in_review"].includes(existing.status))) {
      return { ok: false, message: "Writers can only edit their own drafts." };
    }
  }

  // ---- intent -> status ------------------------------------------------------------
  const wantsLive = f.intent === "publish" || f.intent === "schedule";
  if ((wantsLive || f.intent === "unpublish" || f.intent === "archive") && !isEditor) {
    return { ok: false, message: "Only editors and admins can publish, schedule, unpublish or archive. Use “Submit for review”." };
  }
  let status: ArticleStatus = (existing?.status ?? "draft") as ArticleStatus;
  if (f.intent === "submit_review") status = "in_review";
  else if (f.intent === "publish") status = "published";
  else if (f.intent === "schedule") status = "scheduled";
  else if (f.intent === "unpublish") status = "draft";
  else if (f.intent === "archive") status = "archived";
  else if (f.intent === "save" && existing?.status === "scheduled") status = "scheduled"; // keep

  const content = sanitizeArticleHtml(f.content);
  const text = stripHtml(content);

  // ---- publish-time validation -----------------------------------------------------
  const errors: Record<string, string[]> = {};
  const needsComplete = status === "published" || status === "scheduled";
  if (needsComplete) {
    if (text.length < 50) errors.content = ["Add article content (at least a few sentences) before publishing."];
    if (!f.category_id) errors.category_id = ["Choose a category before publishing."];
    if (!f.excerpt) errors.excerpt = ["Add an excerpt (used in listings and as the standfirst)."];
    if (f.featured_image_url && !f.featured_image_alt) errors.featured_image_alt = ["Alt text is required for the featured image."];
    if (f.article_type === "sponsored" && !f.sponsor_name) errors.sponsor_name = ["Sponsored articles need a sponsor name for the disclosure label."];
    if (f.ai_generated && !(f.human_reviewed && f.fact_checked)) {
      errors.ai_generated = ["Machine-assisted drafts need human review and fact-checking confirmed before they can go live."];
    }
  }

  // ---- dates ----------------------------------------------------------------------
  let scheduledFor: string | null = null;
  let publishedAt: string | null = existing?.published_at ?? null;
  if (status === "scheduled") {
    scheduledFor = f.scheduled_for_local ? zonedLocalToUtcIso(f.scheduled_for_local, SITE_CONFIG.timezone) : null;
    if (!scheduledFor) errors.scheduled_for_local = ["Choose a publish date and time."];
    else if (new Date(scheduledFor).getTime() < Date.now() + 60_000) errors.scheduled_for_local = ["Scheduled time must be in the future."];
    publishedAt = null;
  } else if (status === "published") {
    const custom = f.published_at_local ? zonedLocalToUtcIso(f.published_at_local, SITE_CONFIG.timezone) : null;
    if (custom && new Date(custom).getTime() <= Date.now()) publishedAt = custom;
    else if (!publishedAt || existing?.status !== "published") publishedAt = new Date().toISOString();
  } else if (status === "draft" || status === "in_review") {
    publishedAt = existing?.published_at ?? null; // remember the original first-publication date
  }
  if (Object.keys(errors).length) return { ok: false, message: "Fix the issues below before continuing.", errors };

  // ---- sources / tags / slug ---------------------------------------------------------
  const { sources, invalid } = parseSources(f.sources_text);
  if (invalid.length) return { ok: false, message: "Some source lines are invalid.", errors: { sources_text: [`Use “Title | https://url”. Invalid: ${invalid[0]}`] } };
  if (f.article_type === "news" && needsComplete && sources.length === 0 && f.ai_generated) {
    return { ok: false, message: "Researched articles must list their sources.", errors: { sources_text: ["Add at least one source reference."] } };
  }
  const tags = parseTags(f.tags);
  const slug = await uniqueSlug(ctx, f.slug || f.title, existing?.id);

  const reviewedNow = f.ai_generated && f.human_reviewed && isEditor;
  const row = {
    title: f.title, slug, excerpt: f.excerpt ?? null, content, article_type: f.article_type, status,
    published_at: publishedAt, scheduled_for: scheduledFor,
    category_id: f.category_id ?? null, author_id: f.author_id ?? null,
    featured_image_id: f.featured_image_media_id ?? null,
    featured_image_url: f.featured_image_url ?? null, featured_image_alt: f.featured_image_alt ?? null,
    featured_image_caption: f.featured_image_caption ?? null, og_image_url: f.og_image_url ?? null,
    seo_title: f.seo_title ?? null, meta_description: f.meta_description ?? null, focus_keyword: f.focus_keyword ?? null,
    canonical_url: f.canonical_url ?? null, noindex: f.noindex,
    is_featured: f.is_featured, is_breaking: f.is_breaking, is_trending: f.is_trending,
    sponsor_name: f.sponsor_name ?? null, has_affiliate_links: f.has_affiliate_links,
    editorial_notes: f.editorial_notes ?? null, sources,
    ai_generated: f.ai_generated, fact_checked: f.fact_checked,
    human_reviewed_by: reviewedNow ? (existing?.human_reviewed_by ?? ctx.user.id) : (f.ai_generated ? existing?.human_reviewed_by ?? null : null),
    human_reviewed_at: reviewedNow ? (existing?.human_reviewed_at ?? new Date().toISOString()) : (f.ai_generated ? existing?.human_reviewed_at ?? null : null),
    reading_time_minutes: readingTime(content),
    updated_by: ctx.user.id,
  };

  // ---- write -----------------------------------------------------------------------
  let articleId = existing?.id ?? "";
  if (existing) {
    // snapshot the previous version before overwriting
    const { data: last } = await ctx.supabase.from("article_revisions").select("revision_number").eq("article_id", existing.id).order("revision_number", { ascending: false }).limit(1);
    await ctx.supabase.from("article_revisions").insert({
      article_id: existing.id, revision_number: (last?.[0]?.revision_number ?? 0) + 1,
      title: existing.title, excerpt: existing.excerpt, content: existing.content,
      snapshot: { status: existing.status, slug: existing.slug, seo_title: existing.seo_title, meta_description: existing.meta_description }, created_by: ctx.user.id,
    });
    const { error } = await ctx.supabase.from("articles").update(row).eq("id", existing.id);
    if (error) return { ok: false, message: friendlyDbError(error.message) };
    // keep old URLs working when a live article's slug changes
    if (existing.slug !== slug && (existing.status === "published" || status === "published")) {
      await ctx.supabase.from("redirects").delete().eq("from_path", `/news/${slug}`);
      await ctx.supabase.from("redirects").upsert({ from_path: `/news/${existing.slug}`, to_path: `/news/${slug}`, status_code: 301, is_active: true }, { onConflict: "from_path" });
    }
  } else {
    const { data, error } = await ctx.supabase.from("articles").insert({ ...row, created_by: ctx.user.id }).select("id").single();
    if (error || !data) return { ok: false, message: friendlyDbError(error?.message ?? "Insert failed") };
    articleId = data.id;
  }

  // ---- tags -------------------------------------------------------------------------
  await ctx.supabase.from("article_tags").delete().eq("article_id", articleId);
  if (tags.length) {
    await ctx.supabase.from("tags").upsert(tags, { onConflict: "slug", ignoreDuplicates: true });
    const { data: tagRows } = await ctx.supabase.from("tags").select("id,slug").in("slug", tags.map((t) => t.slug));
    if (tagRows?.length) await ctx.supabase.from("article_tags").insert(tagRows.map((t) => ({ article_id: articleId, tag_id: t.id })));
  }

  await logActivity(ctx, existing ? f.intent : "create", "article", articleId, `${f.intent}: ${f.title}`);
  revalidatePublicSite();
  redirect(`/admin/articles/${articleId}/edit?saved=${f.intent}`);
}

function friendlyDbError(msg: string): string {
  if (/articles_ai_requires_human_review/.test(msg)) return "Machine-assisted drafts need human review and fact-checking before going live.";
  if (/articles_sponsor_label/.test(msg)) return "Sponsored articles need a sponsor name before going live.";
  if (/violates row-level security/i.test(msg)) return "You do not have permission to do that.";
  if (/duplicate key.*slug/i.test(msg)) return "That URL slug is already in use.";
  console.error("[articles]", msg);
  return "The article could not be saved. Please try again.";
}

export async function deleteArticle(fd: FormData): Promise<void> {
  const ctx = await requireStaff("writer");
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const { data } = await ctx.supabase.from("articles").select("title,status,created_by").eq("id", id).maybeSingle();
  if (!data) return;
  const allowed = hasRole(ctx.role, "editor") || (data.created_by === ctx.user.id && data.status === "draft");
  if (!allowed) return;
  const { error } = await ctx.supabase.from("articles").delete().eq("id", id);
  if (error) { console.error("[articles:delete]", error.message); return; }
  await logActivity(ctx, "delete", "article", id, `Deleted: ${data.title}`);
  revalidatePublicSite();
  redirect("/admin/articles?deleted=1");
}

export async function duplicateArticle(fd: FormData): Promise<void> {
  const ctx = await requireStaff("writer");
  const id = String(fd.get("id") ?? "");
  const { data } = await ctx.supabase.from("articles").select("*").eq("id", id).maybeSingle();
  if (!data) return;
  const src = data as Article;
  const slug = await uniqueSlug(ctx, `${src.slug}-copy`);
  const { data: created, error } = await ctx.supabase.from("articles").insert({
    title: `${src.title} (copy)`, slug, excerpt: src.excerpt, content: src.content, article_type: src.article_type, status: "draft",
    category_id: src.category_id, author_id: src.author_id, created_by: ctx.user.id, updated_by: ctx.user.id,
    featured_image_id: src.featured_image_id, featured_image_url: src.featured_image_url, featured_image_alt: src.featured_image_alt,
    featured_image_caption: src.featured_image_caption, og_image_url: src.og_image_url,
    seo_title: src.seo_title, meta_description: src.meta_description, focus_keyword: src.focus_keyword,
    sponsor_name: src.sponsor_name, has_affiliate_links: src.has_affiliate_links, sources: src.sources, reading_time_minutes: src.reading_time_minutes,
  }).select("id").single();
  if (error || !created) { console.error("[articles:duplicate]", error?.message); return; }
  const { data: links } = await ctx.supabase.from("article_tags").select("tag_id").eq("article_id", id);
  if (links?.length) await ctx.supabase.from("article_tags").insert(links.map((l) => ({ article_id: created.id, tag_id: l.tag_id })));
  await logActivity(ctx, "duplicate", "article", created.id, `Duplicated: ${src.title}`);
  redirect(`/admin/articles/${created.id}/edit?saved=duplicate`);
}

/** One-click status changes from the list (editors+): unpublish or archive. */
export async function quickStatus(fd: FormData): Promise<void> {
  const ctx = await requireStaff("editor");
  const id = String(fd.get("id") ?? "");
  const to = String(fd.get("to") ?? "");
  if (!["draft", "archived"].includes(to) || !/^[0-9a-f-]{36}$/i.test(id)) return;
  const { error } = await ctx.supabase.from("articles").update({ status: to, scheduled_for: null, updated_by: ctx.user.id }).eq("id", id);
  if (error) { console.error("[articles:status]", error.message); return; }
  await logActivity(ctx, to === "draft" ? "unpublish" : "archive", "article", id, `Status -> ${to}`);
  revalidatePublicSite();
  redirect("/admin/articles?updated=1");
}
