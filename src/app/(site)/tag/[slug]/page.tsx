import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/data/settings";
import { getArticlesByTag, getTagBySlug } from "@/lib/data/queries";
import { ArticleCard } from "@/components/site/article-card";
import { Pagination } from "@/components/ui/pagination";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buildMetadata } from "@/lib/seo/metadata";
import { SITE_CONFIG } from "@/config/site";
import { pageFromParam } from "@/lib/utils";

export const revalidate = 300; // must be a literal; mirrors SITE_CONFIG.revalidateSeconds
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp, settings] = await Promise.all([params, searchParams, getSettings()]);
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: "Not found", robots: { index: false } };
  const page = pageFromParam(sp.page);
  const { total } = await getArticlesByTag(tag.id, 1, 0);
  return buildMetadata({
    settings, title: `${tag.name}: latest stories`, description: `All our coverage tagged ${tag.name}.`,
    path: `/tag/${tag.slug}${page > 1 ? `?page=${page}` : ""}`,
    noindex: total < 3, // thin tag archives stay out of the index
  });
}

export default async function TagPage({ params, searchParams }: Props) {
  const [{ slug }, sp, settings] = await Promise.all([params, searchParams, getSettings()]);
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();
  const page = pageFromParam(sp.page);
  const per = SITE_CONFIG.articlesPerPage;
  const { items, total } = await getArticlesByTag(tag.id, per, (page - 1) * per);
  const totalPages = Math.max(1, Math.ceil(total / per));
  return (
    <div>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: `#${tag.name}` }]} />
      <h1 className="headline mb-8 mt-3 border-b-4 border-ink pb-4 text-4xl">#{tag.name}</h1>
      {items.length === 0 ? <p className="text-muted">No stories with this tag yet.</p> : (
        <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => <ArticleCard key={a.id} article={a} brandInitial={settings.brand.name} />)}
        </div>
      )}
      <Pagination basePath={`/tag/${tag.slug}`} page={page} totalPages={totalPages} />
    </div>
  );
}
