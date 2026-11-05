import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { getSettings } from "@/lib/data/settings";
import { getArticleForEdit } from "@/lib/admin/queries";
import { ArticleView } from "@/components/site/article-view";
import { Notice } from "@/components/admin/layout-bits";
import { sanitizeArticleHtml } from "@/lib/content";
import type { ArticleWithRelations } from "@/types/db";

export const metadata = { title: "Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Renders exactly what readers will see, for any status. Staff only, never indexed. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff("writer");
  const found = await getArticleForEdit(ctx, id);
  if (!found) notFound();
  const settings = await getSettings();
  const { article, tags } = found;
  const [{ data: cat }, { data: author }] = await Promise.all([
    article.category_id ? ctx.supabase.from("categories").select("id,name,slug").eq("id", article.category_id).maybeSingle() : Promise.resolve({ data: null }),
    article.author_id ? ctx.supabase.from("authors").select("id,name,slug,avatar_url,job_title,bio").eq("id", article.author_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const view = { ...article, content: sanitizeArticleHtml(article.content), category: cat, author, tags: tags.map((name) => ({ id: name, name, slug: name })) } as unknown as ArticleWithRelations;
  return (
    <div className="mx-auto max-w-7xl rounded-lg bg-white p-4 sm:p-8">
      <div className="mb-6"><Notice tone="warn"><strong>Preview</strong> · status: {article.status.replace("_", " ")} · this page is private and not indexed.</Notice></div>
      <ArticleView article={view} settings={settings} preview />
    </div>
  );
}
