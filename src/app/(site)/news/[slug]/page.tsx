import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getSettings } from "@/lib/data/settings";
import { findRedirect, getAdjacentArticles, getArticleBySlug, getMostRead, getRelatedArticles } from "@/lib/data/queries";
import { ArticleView } from "@/components/site/article-view";
import { JsonLd } from "@/components/site/json-ld";
import { ViewCounter } from "@/components/site/view-counter";
import { buildMetadata } from "@/lib/seo/metadata";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { SITE_CONFIG } from "@/config/site";
import { stripHtml, truncate } from "@/lib/utils";

export const revalidate = 300; // must be a literal; mirrors SITE_CONFIG.revalidateSeconds
type Props = { params: Promise<{ slug: string }> };

// Pages are rendered on first request and then cached/revalidated (ISR).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [settings, a] = await Promise.all([getSettings(), getArticleBySlug(slug)]);
  if (!a) return { title: "Not found", robots: { index: false, follow: false } };
  return buildMetadata({
    settings,
    title: a.seo_title || a.title,
    description: a.meta_description || a.excerpt || truncate(stripHtml(a.content), 160),
    path: `/news/${a.slug}`,
    canonical: a.canonical_url,
    image: a.og_image_url || a.featured_image_url,
    imageAlt: a.featured_image_alt,
    type: "article",
    noindex: a.noindex,
    publishedTime: a.published_at,
    modifiedTime: a.updated_at,
    authors: a.author ? [a.author.name] : undefined,
    section: a.category?.name,
    tags: a.tags?.map((t) => t.name),
  });
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    const hit = await findRedirect(`/news/${slug}`);
    if (hit) permanentRedirect(hit.to_path);
    notFound();
  }
  const [settings, related, adjacent, mostRead] = await Promise.all([
    getSettings(), getRelatedArticles(article, 4), getAdjacentArticles(article), getMostRead(5),
  ]);

  const crumbs = [
    { name: "Home", path: "/" },
    ...(article.category ? [{ name: article.category.name, path: `/category/${article.category.slug}` }] : []),
    { name: article.title, path: `/news/${article.slug}` },
  ];

  return (
    <>
      <JsonLd data={[articleSchema(article, settings), breadcrumbSchema(crumbs)]} />
      <ViewCounter articleId={article.id} />
      <ArticleView article={article} settings={settings} related={related} adjacent={adjacent} mostRead={mostRead.filter((m) => m.id !== article.id)} />
    </>
  );
}
