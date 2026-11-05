import { requireStaff, hasRole } from "@/lib/admin/auth";
import { allTagNames, listAuthors, listCategories } from "@/lib/admin/queries";
import { ArticleForm } from "@/components/admin/article-form";
import { PageHeader } from "@/components/admin/layout-bits";

export const metadata = { title: "New article" };

export default async function NewArticlePage() {
  const ctx = await requireStaff("writer");
  const [categories, authors, allTags] = await Promise.all([listCategories(ctx), listAuthors(ctx), allTagNames(ctx)]);
  const mine = authors.find((a) => a.profile_id === ctx.user.id);
  return (
    <>
      <PageHeader title="New article" />
      <ArticleForm article={null} categories={categories} authors={authors} tagNames={[]} allTags={allTags} canPublish={hasRole(ctx.role, "editor")} defaultAuthorId={mine?.id} />
    </>
  );
}
