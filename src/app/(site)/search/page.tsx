import type { Metadata } from "next";
import { getSettings } from "@/lib/data/settings";
import { searchArticles } from "@/lib/data/queries";
import { ArticleCard } from "@/components/site/article-card";
import { Pagination } from "@/components/ui/pagination";
import { SearchForm } from "@/components/site/search-form";
import { buildMetadata } from "@/lib/seo/metadata";
import { SITE_CONFIG } from "@/config/site";
import { pageFromParam } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  // Search result pages are thin/duplicate content: keep them out of the index.
  return buildMetadata({ settings, title: "Search", path: "/search", noindex: true });
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);
  const page = pageFromParam(sp.page);
  const settings = await getSettings();
  const { items, total } = q.length >= 2 ? await searchArticles(q, page) : { items: [], total: 0 };
  const totalPages = Math.max(1, Math.ceil(total / SITE_CONFIG.articlesPerPage));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="headline mb-4 text-4xl">Search</h1>
      <SearchForm id="q-page" className="mb-8" />
      {q.length >= 2 ? (
        <>
          <p className="meta mb-6" role="status">{total} result{total === 1 ? "" : "s"} for “{q}”</p>
          {items.length === 0 ? (
            <p className="py-10 text-lg text-muted">No stories matched your search. Try different or fewer keywords.</p>
          ) : (
            <div className="divide-y divide-rule">
              {items.map((a) => <div key={a.id} className="py-5 first:pt-0"><ArticleCard article={a} variant="compact" brandInitial={settings.brand.name} /></div>)}
            </div>
          )}
          <Pagination basePath="/search" page={page} totalPages={totalPages} query={{ q }} />
        </>
      ) : (
        <p className="text-muted">Enter at least two characters to search all published stories.</p>
      )}
    </div>
  );
}
