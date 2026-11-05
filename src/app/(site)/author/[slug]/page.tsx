import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/data/settings";
import { getArticlesByAuthor, getAuthorBySlug } from "@/lib/data/queries";
import { ArticleCard } from "@/components/site/article-card";
import { Pagination } from "@/components/ui/pagination";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SmartImage } from "@/components/ui/smart-image";
import { JsonLd } from "@/components/site/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { SITE_CONFIG } from "@/config/site";
import { absoluteUrl, pageFromParam, truncate } from "@/lib/utils";

export const revalidate = 300; // must be a literal; mirrors SITE_CONFIG.revalidateSeconds
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp, settings] = await Promise.all([params, searchParams, getSettings()]);
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: "Not found", robots: { index: false } };
  const page = pageFromParam(sp.page);
  return buildMetadata({
    settings, title: `${author.name}, Author`, description: author.bio ? truncate(author.bio, 160) : `Articles by ${author.name}`,
    path: `/author/${author.slug}${page > 1 ? `?page=${page}` : ""}`, image: author.avatar_url, type: "website",
  });
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const [{ slug }, sp, settings] = await Promise.all([params, searchParams, getSettings()]);
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();
  const page = pageFromParam(sp.page);
  const per = SITE_CONFIG.articlesPerPage;
  const { items, total } = await getArticlesByAuthor(author.id, per, (page - 1) * per);
  const totalPages = Math.max(1, Math.ceil(total / per));
  const social = Object.entries(author.social ?? {}).filter(([, v]) => /^https?:\/\//.test(v));

  const personSchema = {
    "@context": "https://schema.org", "@type": "Person", name: author.name, url: absoluteUrl(`/author/${author.slug}`),
    ...(author.job_title ? { jobTitle: author.job_title } : {}), ...(author.bio ? { description: author.bio } : {}),
    ...(author.avatar_url ? { image: absoluteUrl(author.avatar_url) } : {}), ...(social.length ? { sameAs: social.map(([, v]) => v) } : {}),
    worksFor: { "@id": absoluteUrl("/#organization") },
  };

  return (
    <div>
      <JsonLd data={[personSchema, breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Authors", path: "/authors" }, { name: author.name, path: `/author/${author.slug}` }])]} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Authors", path: "/authors" }, { name: author.name }]} />
      <header className="mb-8 mt-4 flex flex-col gap-5 border-b-4 border-ink pb-6 sm:flex-row">
        <div className="w-28 shrink-0"><SmartImage src={author.avatar_url} alt={author.name} aspect="aspect-square" sizes="112px" fallbackLabel={author.name} className="rounded-full" /></div>
        <div>
          <h1 className="headline text-4xl">{author.name}</h1>
          {author.job_title && <p className="text-muted">{author.job_title}</p>}
          {author.bio && <p className="mt-3 max-w-2xl text-lg">{author.bio}</p>}
          {social.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
              {social.map(([k, v]) => <li key={k}><a href={v} rel="me noopener noreferrer" target="_blank" className="capitalize text-brand hover:underline">{k}</a></li>)}
            </ul>
          )}
        </div>
      </header>
      {items.length === 0 ? <p className="text-muted">No published articles yet.</p> : (
        <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => <ArticleCard key={a.id} article={a} brandInitial={settings.brand.name} />)}
        </div>
      )}
      <Pagination basePath={`/author/${author.slug}`} page={page} totalPages={totalPages} />
    </div>
  );
}
