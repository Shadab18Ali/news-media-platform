"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity, requireStaff } from "@/lib/admin/auth";
import type { ActionState } from "@/lib/admin/types";
import { aiProvider } from "@/lib/ai/provider";
import { sanitizeArticleHtml } from "@/lib/content";
import { readingTime, slugify } from "@/lib/utils";
import { parseSourceBlocks } from "@/lib/ai/sources";

const schema = z.object({
  topic: z.string().trim().min(5, "Describe the topic").max(300),
  angle: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(300).optional()),
  category_id: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
  sources_text: z.string().trim().min(40, "Paste source notes: the drafting assistant may only use facts you supply").max(30000),
});

export async function generateDraftAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireStaff("editor");
  const provider = aiProvider();
  if (!provider.isConfigured()) return { ok: false, message: "No drafting provider is configured. See ENVIRONMENT_VARIABLES.md." };
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  const sources = parseSourceBlocks(parsed.data.sources_text);
  if (!sources.length) return { ok: false, errors: { sources_text: ["Format each source as “Title | https://url” on the first line, then its notes below. Separate sources with a blank line."] } };

  let catName: string | undefined;
  if (parsed.data.category_id) {
    const { data } = await ctx.supabase.from("categories").select("name").eq("id", parsed.data.category_id).maybeSingle();
    catName = data?.name;
  }

  let draft;
  try {
    draft = await provider.generateDraft({ topic: parsed.data.topic, angle: parsed.data.angle, sources, categoryName: catName, language: "en" });
  } catch (e) {
    console.error("[ai]", e instanceof Error ? e.message : e);
    return { ok: false, message: e instanceof Error ? e.message : "Draft generation failed." };
  }

  const content = sanitizeArticleHtml(draft.contentHtml);
  const { data: slugClash } = await ctx.supabase.from("articles").select("id").eq("slug", slugify(draft.title, 90)).limit(1);
  const slug = `${slugify(draft.title, 85)}${slugClash?.length ? `-${Date.now().toString(36).slice(-4)}` : ""}`;
  const { data, error } = await ctx.supabase.from("articles").insert({
    title: draft.title, slug, excerpt: draft.excerpt || null, content, article_type: "news", status: "draft",
    category_id: parsed.data.category_id ?? null, created_by: ctx.user.id, updated_by: ctx.user.id,
    seo_title: draft.seoTitle || null, meta_description: draft.metaDescription || null, focus_keyword: draft.focusKeyword || null,
    sources: draft.sourcesUsed.length ? draft.sourcesUsed : sources.map(({ title, url }) => ({ title, url })),
    ai_generated: true, fact_checked: false, reading_time_minutes: readingTime(content),
    editorial_notes: `Drafted by the ${provider.label} from editor-supplied sources.\nSuggested keywords: ${draft.keywords.join(", ")}\nImage concept (create or license an original image): ${draft.imagePrompt}\nVerify every fact, number and quote against the sources, resolve any [VERIFY] markers, then tick "reviewed" and "fact-checked".`,
  }).select("id").single();
  if (error || !data) { console.error("[ai:save]", error?.message); return { ok: false, message: "The draft was generated but could not be saved." }; }
  await logActivity(ctx, "ai-draft", "article", data.id, `Drafted (needs review): ${draft.title}`);
  redirect(`/admin/articles/${data.id}/edit?saved=save`);
}
