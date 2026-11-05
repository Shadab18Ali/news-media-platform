import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStaff, hasRole } from "@/lib/admin/auth";
import { allTagNames, getArticleForEdit, listAuthors, listCategories } from "@/lib/admin/queries";
import { ArticleForm } from "@/components/admin/article-form";
import { Notice, PageHeader } from "@/components/admin/layout-bits";
import { ExternalLink } from "lucide-react";

export const metadata = { title: "Edit article" };

const SAVED: Record<string, string> = {
  save: "Saved.", submit_review: "Submitted for review.", publish: "Published. The live page refreshes within a few minutes.",
  schedule: "Scheduled. It will publish automatically at the chosen time.", unpublish: "Unpublished and moved back to drafts.",
  archive: "Archived.", duplicate: "Duplicated as a new draft. Edit it below.",
};

export default async function EditArticlePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const ctx = await requireStaff("writer");
  const found = await getArticleForEdit(ctx, id);
  if (!found) notFound();
  const [categories, authors, allTags] = await Promise.all([listCategories(ctx), listAuthors(ctx), allTagNames(ctx)]);
  const { article, tags } = found;
  return (
    <>
      <PageHeader title="Edit article" actions={article.status === "published" ? <Link href={`/news/${article.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"><ExternalLink className="h-4 w-4" aria-hidden="true" />View live</Link> : undefined} />
      {saved && SAVED[saved] && <div className="mb-4"><Notice tone="success">{SAVED[saved]}</Notice></div>}
      <ArticleForm key={article.updated_at} article={article} categories={categories} authors={authors} tagNames={tags} allTags={allTags} canPublish={hasRole(ctx.role, "editor")} />
    </>
  );
}
