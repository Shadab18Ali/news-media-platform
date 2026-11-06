import { stripHtml } from "@/lib/utils";

/** Why an article cannot go live yet (null = fine). Same rules as the single-article editor. */
export function bulkBlocker(a: ArticleLike): string | null {
  if (stripHtml(a.content).length < 50) return "body text is too short";
  if (!a.category_id) return "no category";
  if (!a.excerpt) return "no excerpt";
  if (a.featured_image_url && !a.featured_image_alt) return "featured image has no alt text";
  if (a.article_type === "sponsored" && !a.sponsor_name) return "sponsored article without sponsor name";
  if (a.ai_generated && !(a.sources?.length)) return "machine-written article has no source links";
  return null;
}

type ArticleLike = {
  content: string; excerpt: string | null; category_id: string | null; article_type: string; sponsor_name: string | null;
  featured_image_url: string | null; featured_image_alt: string | null; ai_generated: boolean; sources: unknown[] | null;
};
