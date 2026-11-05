import { z } from "zod";
import { ARTICLE_TYPES } from "@/config/site";
import { slugify } from "@/lib/utils";
import type { SourceRef } from "@/types/db";

export const INTENTS = ["save", "submit_review", "publish", "schedule", "unpublish", "archive"] as const;
export type Intent = (typeof INTENTS)[number];

const empty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const opt = (max: number) => z.preprocess(empty, z.string().trim().max(max).optional());
const optUuid = z.preprocess(empty, z.string().uuid().optional());
const optUrl = z.preprocess(empty, z.string().trim().max(1000).regex(/^(https?:\/\/|\/)/, "Must start with https:// or /").optional());
const optHttp = z.preprocess(empty, z.string().trim().max(1000).regex(/^https?:\/\//, "Must start with https://").optional());

export const articleFormSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(300),
  slug: opt(200),
  excerpt: opt(600),
  content: z.string().max(600_000, "Article is too long"),
  article_type: z.enum(ARTICLE_TYPES.map((t) => t.value) as [string, ...string[]]),
  category_id: optUuid,
  author_id: optUuid,
  tags: opt(1000),
  featured_image_url: optUrl,
  featured_image_media_id: optUuid,
  featured_image_alt: opt(300),
  featured_image_caption: opt(500),
  og_image_url: optUrl,
  seo_title: opt(120),
  meta_description: opt(320),
  focus_keyword: opt(100),
  canonical_url: optHttp,
  noindex: z.boolean(),
  is_featured: z.boolean(),
  is_breaking: z.boolean(),
  is_trending: z.boolean(),
  sponsor_name: opt(120),
  has_affiliate_links: z.boolean(),
  editorial_notes: opt(5000),
  sources_text: opt(4000),
  ai_generated: z.boolean(),
  fact_checked: z.boolean(),
  human_reviewed: z.boolean(),
  published_at_local: opt(30),
  scheduled_for_local: opt(30),
  intent: z.enum(INTENTS),
});
export type ArticleForm = z.infer<typeof articleFormSchema>;

const BOOLS = ["noindex", "is_featured", "is_breaking", "is_trending", "has_affiliate_links", "ai_generated", "fact_checked", "human_reviewed"] as const;

/** Raw FormData -> plain object (checkboxes become booleans). */
export function readArticleFormData(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  for (const b of BOOLS) out[b] = fd.get(b) === "on";
  return out;
}

export function parseTags(input: string | undefined): { name: string; slug: string }[] {
  if (!input) return [];
  const seen = new Set<string>();
  const tags: { name: string; slug: string }[] = [];
  for (const raw of input.split(",")) {
    const name = raw.trim().replace(/^#/, "").slice(0, 60);
    const slug = slugify(name, 60);
    if (!name || !slug || seen.has(slug)) continue;
    seen.add(slug);
    tags.push({ name, slug });
    if (tags.length >= 15) break;
  }
  return tags;
}

/** "Title | https://url" per line, or a bare URL. Invalid lines are reported. */
export function parseSources(input: string | undefined): { sources: SourceRef[]; invalid: string[] } {
  const sources: SourceRef[] = [];
  const invalid: string[] = [];
  for (const line of (input ?? "").split("\n").map((l) => l.trim()).filter(Boolean)) {
    const [a, b] = line.includes("|") ? line.split("|").map((p) => p.trim()) : ["", line];
    const url = b ?? "";
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      sources.push({ title: (a || u.hostname.replace(/^www\./, "")).slice(0, 200), url: u.toString() });
    } catch {
      invalid.push(line);
    }
  }
  return { sources: sources.slice(0, 30), invalid };
}

export function sourcesToText(sources: SourceRef[] | null | undefined): string {
  return (sources ?? []).map((s) => `${s.title} | ${s.url}`).join("\n");
}
