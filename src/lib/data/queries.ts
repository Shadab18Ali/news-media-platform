import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { SITE_CONFIG } from "@/config/site";
import { escapeLike } from "@/lib/utils";
import type {
  Advertisement, ArticleCardData, ArticleWithRelations, Author, Category, Tag,
} from "@/types/db";

export const CARD_FIELDS =
  "id,title,slug,excerpt,featured_image_url,featured_image_alt,published_at,updated_at,article_type,reading_time_minutes,is_breaking,view_count,category:categories(name,slug),author:authors(name,slug)";

const FULL_FIELDS = "*,category:categories(id,name,slug),author:authors(id,name,slug,avatar_url,job_title,bio)";

type Cards = ArticleCardData[];

function nowIso() {
  // Truncate to the minute so ISR/cache keys and queries stay stable within a request burst.
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString();
}

function fail(scope: string, error: { message: string } | null): void {
  if (error) console.error(`[data:${scope}]`, error.message);
}

/** Published = status published AND published_at in the past (RLS enforces the same). */
function published() {
  const supabase = createPublicClient();
  if (!supabase) return null;
  return supabase.from("articles").select(CARD_FIELDS).eq("status", "published").lte("published_at", nowIso());
}

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name");
  fail("categories", error);
  return (data ?? []) as Category[];
});

export const getCategoryBySlug = cache(async (slug: string): Promise<Category | null> => {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
  fail("category", error);
  return (data as Category | null) ?? null;
});

export async function getLatestArticles(limit = 12, opts: { excludeIds?: string[]; offset?: number } = {}): Promise<Cards> {
  const q = published();
  if (!q) return [];
  let query = q.order("published_at", { ascending: false });
  if (opts.excludeIds?.length) query = query.not("id", "in", `(${opts.excludeIds.join(",")})`);
  const from = opts.offset ?? 0;
  const { data, error } = await query.range(from, from + limit - 1);
  fail("latest", error);
  return (data ?? []) as unknown as Cards;
}

export async function getFlaggedArticles(flag: "is_featured" | "is_breaking" | "is_trending", limit: number): Promise<Cards> {
  const q = published();
  if (!q) return [];
  const { data, error } = await q.eq(flag, true).order("published_at", { ascending: false }).limit(limit);
  fail(flag, error);
  return (data ?? []) as unknown as Cards;
}

export async function getMostRead(limit = 5, days = 30): Promise<Cards> {
  const q = published();
  if (!q) return [];
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await q.gte("published_at", since).gt("view_count", 0).order("view_count", { ascending: false }).limit(limit);
  fail("most-read", error);
  return (data ?? []) as unknown as Cards;
}

export async function getArticlesByCategory(categoryId: string, limit: number, offset = 0, excludeIds: string[] = []): Promise<Cards> {
  const q = published();
  if (!q) return [];
  let query = q.eq("category_id", categoryId).order("published_at", { ascending: false });
  if (excludeIds.length) query = query.not("id", "in", `(${excludeIds.join(",")})`);
  const { data, error } = await query.range(offset, offset + limit - 1);
  fail("by-category", error);
  return (data ?? []) as unknown as Cards;
}

export async function countArticlesInCategory(categoryId: string): Promise<number> {
  const supabase = createPublicClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("articles").select("id", { count: "exact", head: true })
    .eq("status", "published").lte("published_at", nowIso()).eq("category_id", categoryId);
  fail("count-category", error);
  return count ?? 0;
}

export const getArticleBySlug = cache(async (slug: string): Promise<ArticleWithRelations | null> => {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("articles").select(FULL_FIELDS)
    .eq("slug", slug).eq("status", "published").lte("published_at", nowIso()).maybeSingle();
  fail("article", error);
  if (!data) return null;
  const article = data as unknown as ArticleWithRelations;
  const { data: tagRows } = await supabase.from("article_tags").select("tag:tags(id,name,slug)").eq("article_id", article.id);
  article.tags = ((tagRows ?? []) as unknown as { tag: Tag }[]).map((r) => r.tag).filter(Boolean);
  return article;
});

export async function getAdjacentArticles(article: { published_at: string | null; id: string }): Promise<{ prev: ArticleCardData | null; next: ArticleCardData | null }> {
  const base = published();
  const base2 = published();
  if (!base || !base2 || !article.published_at) return { prev: null, next: null };
  const [older, newer] = await Promise.all([
    base.lt("published_at", article.published_at).order("published_at", { ascending: false }).limit(1),
    base2.gt("published_at", article.published_at).order("published_at", { ascending: true }).limit(1),
  ]);
  fail("adjacent-prev", older.error);
  fail("adjacent-next", newer.error);
  return {
    prev: ((older.data?.[0] as unknown as ArticleCardData) ?? null),
    next: ((newer.data?.[0] as unknown as ArticleCardData) ?? null),
  };
}

export async function getRelatedArticles(article: { id: string; category_id: string | null }, limit = 4): Promise<Cards> {
  const q = published();
  if (!q) return [];
  let query = q.neq("id", article.id).order("published_at", { ascending: false }).limit(limit);
  if (article.category_id) query = query.eq("category_id", article.category_id);
  const { data, error } = await query;
  fail("related", error);
  const rows = (data ?? []) as unknown as Cards;
  if (rows.length >= limit || !article.category_id) return rows;
  const more = await getLatestArticles(limit - rows.length, { excludeIds: [article.id, ...rows.map((r) => r.id)] });
  return [...rows, ...more];
}

export async function searchArticles(term: string, page: number, perPage = SITE_CONFIG.articlesPerPage): Promise<{ items: Cards; total: number }> {
  const supabase = createPublicClient();
  const clean = escapeLike(term).slice(0, 100);
  if (!supabase || clean.length < 2) return { items: [], total: 0 };
  const from = (page - 1) * perPage;
  const { data, error, count } = await supabase
    .from("articles").select(CARD_FIELDS, { count: "exact" })
    .eq("status", "published").lte("published_at", nowIso())
    .textSearch("search_vector", clean, { type: "websearch", config: "english" })
    .order("published_at", { ascending: false })
    .range(from, from + perPage - 1);
  fail("search", error);
  return { items: (data ?? []) as unknown as Cards, total: count ?? 0 };
}

export async function getAuthors(): Promise<Author[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("authors").select("*").eq("is_active", true).order("name");
  fail("authors", error);
  return (data ?? []) as Author[];
}

export const getAuthorBySlug = cache(async (slug: string): Promise<Author | null> => {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("authors").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  fail("author", error);
  return (data as Author | null) ?? null;
});

export async function getArticlesByAuthor(authorId: string, limit: number, offset = 0): Promise<{ items: Cards; total: number }> {
  const supabase = createPublicClient();
  if (!supabase) return { items: [], total: 0 };
  const { data, error, count } = await supabase
    .from("articles").select(CARD_FIELDS, { count: "exact" })
    .eq("status", "published").lte("published_at", nowIso()).eq("author_id", authorId)
    .order("published_at", { ascending: false }).range(offset, offset + limit - 1);
  fail("by-author", error);
  return { items: (data ?? []) as unknown as Cards, total: count ?? 0 };
}

export const getTagBySlug = cache(async (slug: string): Promise<Tag | null> => {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("tags").select("*").eq("slug", slug).maybeSingle();
  fail("tag", error);
  return (data as Tag | null) ?? null;
});

export async function getArticlesByTag(tagId: string, limit: number, offset = 0): Promise<{ items: Cards; total: number }> {
  const supabase = createPublicClient();
  if (!supabase) return { items: [], total: 0 };
  const { data: links } = await supabase.from("article_tags").select("article_id").eq("tag_id", tagId).limit(1000);
  const ids = (links ?? []).map((l) => l.article_id as string);
  if (!ids.length) return { items: [], total: 0 };
  const { data, error, count } = await supabase
    .from("articles").select(CARD_FIELDS, { count: "exact" })
    .eq("status", "published").lte("published_at", nowIso()).in("id", ids)
    .order("published_at", { ascending: false }).range(offset, offset + limit - 1);
  fail("by-tag", error);
  return { items: (data ?? []) as unknown as Cards, total: count ?? 0 };
}

export async function getSitemapArticles(limit = 5000): Promise<{ slug: string; updated_at: string; published_at: string | null; noindex: boolean }[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles").select("slug,updated_at,published_at,noindex")
    .eq("status", "published").lte("published_at", nowIso()).eq("noindex", false)
    .order("published_at", { ascending: false }).limit(limit);
  fail("sitemap", error);
  return (data ?? []) as { slug: string; updated_at: string; published_at: string | null; noindex: boolean }[];
}

export async function getRecentNewsForGoogleNews(): Promise<(ArticleCardData & { language?: string })[]> {
  const q = published();
  if (!q) return [];
  const since = new Date(Date.now() - 2 * 86400000).toISOString();
  const { data, error } = await q.eq("article_type", "news").gte("published_at", since).order("published_at", { ascending: false }).limit(1000);
  fail("news-sitemap", error);
  return (data ?? []) as unknown as ArticleCardData[];
}

export async function getActiveAds(): Promise<Advertisement[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("advertisements").select("*").eq("is_active", true).order("priority");
  fail("ads", error);
  const now = Date.now();
  return ((data ?? []) as Advertisement[]).filter(
    (a) => (!a.starts_at || new Date(a.starts_at).getTime() <= now) && (!a.ends_at || new Date(a.ends_at).getTime() > now),
  );
}

export async function findRedirect(path: string): Promise<{ to_path: string; status_code: number } | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("redirects").select("to_path,status_code").eq("from_path", path).eq("is_active", true).maybeSingle();
  fail("redirect", error);
  return data as { to_path: string; status_code: number } | null;
}
