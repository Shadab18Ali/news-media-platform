import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/data/settings";
import { countArticlesInCategory, getArticlesByCategory, getCategoryBySlug } from "@/lib/data/queries";
import { ArticleCard } from "@/components/site/article-card";
import { Pagination } from "@/components/ui/pagination";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { AdSlot } from "@/components/site/ad-slot";
import { JsonLd } from "@/components/site/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { SITE_CONFIG } from "@/config/site";

export const categoryPath = (slug: string, page: number) => `/category/${slug}${page > 1 ? `/page/${page}` : ""}`;

export async function categoryMetadata(slug: string, page: number): Promise<Metadata> {
  const [settings, category] = await Promise.all([getSettings(), getCategoryBySlug(slug)]);
  if (!category) return { title: "Not found", robots: { index: false } };
  return buildMetadata({
    settings,
    title: (category.seo_title || `${category.name} News`) + (page > 1 ? ` – Page ${page}` : ""),
    description: category.seo_description || category.description,
    path: categoryPath(category.slug, page),
    image: category.image_url,
    imageAlt: category.image_alt,
  });
}

export async function CategoryListing({ slug, page }: { slug: string; page: number }) {
  const [settings, category] = await Promise.all([getSettings(), getCategoryBySlug(slug)]);
  if (!category) notFound();
  const per = SITE_CONFIG.articlesPerPage;
  const total = await countArticlesInCategory(category.id);
  const totalPages = Math.max(1, Math.ceil(total / per));
  if (page > totalPages) notFound();

  const items = await getArticlesByCategory(category.id, per, (page - 1) * per);
  const showLead = page === 1;
  const lead = showLead ? items[0] : undefined;
  const gridItems = showLead ? items.slice(1) : items;
  const initial = settings.brand.name;

  return (
    <div>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: category.name, path: `/category/${category.slug}` }])} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: category.name }]} />
      <header className="mb-8 mt-3 border-b-4 border-ink pb-5">
        <h1 className="headline text-4xl sm:text-5xl">{category.name}</h1>
        {category.description && <p className="mt-2 max-w-3xl text-lg text-muted">{category.description}</p>}
      </header>

      {items.length === 0 ? (
        <p className="py-16 text-center text-lg text-muted">No stories in this section yet.</p>
      ) : (
        <>
          {lead && <div className="mb-10 border-b border-rule pb-10"><ArticleCard article={lead} variant="hero" priority brandInitial={initial} /></div>}
          <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {gridItems.map((a, i) => <ArticleCard key={a.id} article={a} variant="standard" brandInitial={initial} priority={i < 3 && !showLead} />)}
          </div>
          <AdSlot placement="homepage_feed" />
          <Pagination page={page} totalPages={totalPages} pageHref={(p) => categoryPath(category.slug, p)} />
        </>
      )}
    </div>
  );
}
