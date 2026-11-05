import Link from "next/link";
import type { Metadata } from "next";
import { getSettings } from "@/lib/data/settings";
import { getHomeData } from "@/lib/data/home";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ArticleCard } from "@/components/site/article-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { AdSlot } from "@/components/site/ad-slot";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { buildMetadata } from "@/lib/seo/metadata";
import { SITE_CONFIG } from "@/config/site";
import { Zap } from "lucide-react";

export const revalidate = 300; // must be a literal; mirrors SITE_CONFIG.revalidateSeconds

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return buildMetadata({
    settings: s, path: "/", rawTitle: true,
    title: s.brand.tagline ? `${s.brand.name}: ${s.brand.tagline}` : s.brand.name,
    description: s.seo.defaultDescription ?? s.brand.description,
  });
}

export default async function HomePage() {
  const [settings, home] = await Promise.all([getSettings(), getHomeData()]);
  const initial = settings.brand.name;

  if (!home.hasContent) {
    return (
      <section className="mx-auto max-w-2xl py-20 text-center">
        <h1 className="headline text-4xl">{settings.brand.name}</h1>
        {isSupabaseConfigured() ? (
          <p className="mt-4 text-lg text-muted">No stories have been published yet. Please check back soon.</p>
        ) : (
          <p className="mt-4 text-lg text-muted">
            This site is not connected to its database yet. Add the Supabase environment variables and run the migrations
            (see <code>DATABASE_SETUP.md</code>) to start publishing.
          </p>
        )}
      </section>
    );
  }

  return (
    <div>
      {settings.features.breakingTicker && home.breaking.length > 0 && (
        <section aria-label="Breaking news" className="mb-6 flex items-stretch overflow-hidden rounded-sm border border-brand">
          <span className="flex shrink-0 items-center gap-1.5 bg-brand px-3 text-xs font-bold uppercase tracking-wider text-white"><Zap className="h-4 w-4" aria-hidden="true" />Breaking</span>
          <ul className="flex min-w-0 flex-1 flex-col divide-y divide-rule bg-brand-soft sm:flex-row sm:divide-x sm:divide-y-0 sm:overflow-x-auto">
            {home.breaking.slice(0, 3).map((b) => (
              <li key={b.id} className="min-w-0 sm:max-w-md sm:shrink-0"><Link href={`/news/${b.slug}`} className="block truncate px-3 py-2.5 text-sm font-semibold text-ink hover:text-brand hover:underline">{b.title}</Link></li>
            ))}
          </ul>
        </section>
      )}

      {/* Lead stories */}
      <section aria-label="Top stories" className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">{home.hero && <ArticleCard article={home.hero} variant="hero" priority brandInitial={initial} />}</div>
        <div className="grid gap-5 divide-y divide-rule lg:col-span-5 [&>*]:pt-5 first:[&>*]:pt-0">
          {home.heroSide.map((a) => <ArticleCard key={a.id} article={a} variant="compact" brandInitial={initial} />)}
        </div>
      </section>

      {home.secondary.length > 0 && (
        <section aria-label="More top stories" className="mt-10 grid gap-6 border-t border-rule pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {home.secondary.map((a) => <ArticleCard key={a.id} article={a} variant="standard" brandInitial={initial} />)}
        </section>
      )}

      <AdSlot placement="homepage" />

      {/* Latest feed + sidebar */}
      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <section aria-labelledby="latest-h" className="lg:col-span-8">
          <SectionHeading title="Latest news" id="latest-h" href="/search?q=" />
          <div className="divide-y divide-rule">
            {home.feed.map((a, i) => (
              <div key={a.id} className="py-5 first:pt-0">
                <ArticleCard article={a} variant="compact" brandInitial={initial} />
                {i === 3 && <AdSlot placement="homepage_feed" className="!mb-0" />}
              </div>
            ))}
          </div>
        </section>
        <aside aria-label="Sidebar" className="space-y-10 lg:col-span-4">
          {home.mostRead.length > 0 && (
            <section aria-labelledby="mr-h">
              <SectionHeading title="Most read" id="mr-h" />
              <ol className="space-y-4">{home.mostRead.map((a, i) => <li key={a.id}><ArticleCard article={a} variant="ranked" rank={i + 1} /></li>)}</ol>
            </section>
          )}
          {home.trending.length > 0 && (
            <section aria-labelledby="tr-h">
              <SectionHeading title="Trending" id="tr-h" />
              <div className="space-y-4 divide-y divide-rule [&>*]:pt-4 first:[&>*]:pt-0">
                {home.trending.map((a) => <ArticleCard key={a.id} article={a} variant="compact" brandInitial={initial} />)}
              </div>
            </section>
          )}
          <AdSlot placement="sidebar" />
          {settings.features.newsletter && <NewsletterForm headline={settings.features.newsletterHeadline} blurb={settings.features.newsletterBlurb} source="home-sidebar" />}
        </aside>
      </div>

      {/* Category sections */}
      {home.sections.map(({ category, articles }) => (
        <section key={category.id} aria-labelledby={`sec-${category.slug}`} className="mt-12">
          <SectionHeading title={category.name} id={`sec-${category.slug}`} href={`/category/${category.slug}`} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {articles.map((a) => <ArticleCard key={a.id} article={a} variant="standard" brandInitial={initial} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
