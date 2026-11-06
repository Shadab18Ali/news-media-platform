import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);

/** Payload an external writer (e.g. a Custom GPT Action) sends to create a DRAFT article. */
export const connectorArticleSchema = z.object({
  title: text(300).min(10, "Title is too short"),
  excerpt: text(600).min(20, "Excerpt is too short"),
  content_html: z.string().min(400, "Article body is too short").max(200_000),
  category_slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use an existing category slug"),
  article_type: z.enum(["article", "news"]).default("article"),
  tags: z.array(text(60).min(1)).max(10).default([]),
  seo_title: text(120).optional(),
  meta_description: text(320).optional(),
  focus_keyword: text(100).optional(),
  author_slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
  image_prompt: text(1000).optional(),
  sources: z
    .array(z.object({ title: text(200).min(1), url: z.string().trim().url().regex(/^https:\/\//, "Source links must use https://") }))
    .min(1, "At least one source link is required")
    .max(20),
});
export type ConnectorArticle = z.infer<typeof connectorArticleSchema>;
