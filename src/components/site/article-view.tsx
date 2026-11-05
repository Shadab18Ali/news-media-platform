import Link from "next/link";
import type { ArticleCardData, ArticleWithRelations } from "@/types/db";
import type { SiteSettings } from "@/lib/settings-schema";
import { addHeadingIds, splitForMiddleAd } from "@/lib/content";
import { absoluteUrl, formatDate, formatDateTime } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SmartImage } from "@/components/ui/smart-image";
import { AdSlot } from "./ad-slot";
import { ShareButtons } from "./share-buttons";
import { TableOfContents } from "./toc";
import { ArticleCard } from "./article-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { NewsletterForm } from "./newsletter-form";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Props {
  article: ArticleWithRelations;
  settings: SiteSettings;
  related?: ArticleCardData[];
  adjacent?: { prev: ArticleCardData | null; next: ArticleCardData | null };
  mostRead?: ArticleCardData[];
  /** Admin preview: suppresses share/newsletter chrome that makes no sense for drafts. */
  preview?: boolean;
}

export function ArticleView({ article: a, settings, related = [], adjacent, mostRead = [], preview }: Props) {
  const { html, toc } = addHeadingIds(a.content);
  const split = splitForMiddleAd(html);
  const url = a.canonical_url || absoluteUrl(`/news/${a.slug}`);
  const published = a.published_at ?? a.created_at;
  const wasUpdated = a.published_at && new Date(a.updated_at).getTime() - new Date(a.published_at).getTime() > 10 * 60_000;
  const isSponsored = a.article_type === "sponsored";
  const showAffiliate = a.article_type === "affiliate" || a.has_affiliate_links;

  return (
    <article>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, ...(a.category ? [{ name: a.category.name, path: `/category/${a.category.slug}` }] : []), { name: a.title }]} />

      <header className="mx-auto mt-5 max-w-3xl">
        <p className="flex flex-wrap items-center gap-2">
          {a.category && <Link href={`/category/${a.category.slug}`} className="kicker hover:underline">{a.category.name}</Link>}
          {a.article_type === "news" && <span className="meta rounded bg-wash px-1.5 py-0.5 font-semibold uppercase tracking-wide">News</span>}
          {isSponsored && <span className="meta rounded bg-amber-100 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-amber-900">{settings.features.sponsoredLabel}</span>}
        </p>
        <h1 className="headline mt-2 text-[2rem] leading-[1.12] sm:text-5xl">{a.title}</h1>
        {a.excerpt && <p className="mt-4 font-serif text-xl leading-snug text-muted sm:text-[1.35rem]">{a.excerpt}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-rule py-3 text-sm">
          {a.author ? (
            <Link href={`/author/${a.author.slug}`} className="flex items-center gap-2 font-semibold text-ink hover:text-brand" rel="author">
              <span className="block w-8"><SmartImage src={a.author.avatar_url} alt="" aspect="aspect-square" sizes="32px" fallbackLabel={a.author.name} className="rounded-full" /></span>
              {a.author.name}
            </Link>
          ) : <span className="font-semibold text-ink">{settings.brand.name} Staff</span>}
          <span className="meta">
            <time dateTime={published}>{formatDateTime(published)}</time>
            {wasUpdated && <> · Updated <time dateTime={a.updated_at}>{formatDate(a.updated_at)}</time></>}
          </span>
          <span className="meta">{a.reading_time_minutes} min read</span>
        </div>

        {isSponsored && (
          <p role="note" className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <strong>{settings.features.sponsoredLabel} content.</strong> {a.sponsor_name ? `Paid for by ${a.sponsor_name}.` : ""} This article was not produced by our newsroom.
          </p>
        )}
        {showAffiliate && (
          <p role="note" className="mt-4 rounded border border-rule bg-wash p-3 text-sm text-body"><strong>Disclosure.</strong> {settings.features.affiliateDisclosure}</p>
        )}

        {!preview && <div className="mt-4"><ShareButtons url={url} title={a.title} /></div>}
      </header>

      {a.featured_image_url && (
        <figure className="mx-auto mt-6 max-w-4xl">
          <SmartImage src={a.featured_image_url} alt={a.featured_image_alt ?? ""} aspect="aspect-[16/9]" sizes="(min-width:1024px) 896px, 100vw" priority fallbackLabel={settings.brand.name} />
          {a.featured_image_caption && <figcaption className="meta mt-2">{a.featured_image_caption}</figcaption>}
        </figure>
      )}

      <div className="mx-auto max-w-3xl px-0 lg:max-w-none"><AdSlot placement="article_top" /></div>

      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="mx-auto w-full max-w-3xl lg:col-span-8 lg:mx-0 lg:max-w-none lg:pl-[8%]">
          <div className="mb-8 lg:hidden"><TableOfContents items={toc} idSuffix="-m" /></div>
          <div className="prose-article">
            {split ? (
              <>
                <div dangerouslySetInnerHTML={{ __html: split[0] }} />
                <AdSlot placement="article_middle" />
                <div dangerouslySetInnerHTML={{ __html: split[1] }} />
              </>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </div>

          {a.sources?.length > 0 && (
            <section aria-labelledby="sources-h" className="mt-10 border-t border-rule pt-5">
              <h2 id="sources-h" className="kicker !text-ink">Sources</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {a.sources.map((s, i) => <li key={i}><a className="text-brand underline" href={s.url} rel="noopener noreferrer nofollow" target="_blank">{s.title || s.url}</a></li>)}
              </ul>
            </section>
          )}

          {a.ai_generated && a.human_reviewed_at && (
            <p className="meta mt-6 rounded bg-wash p-3">This story was prepared with the help of automated drafting tools and was reviewed and fact-checked by our editors before publication. See our <Link className="underline" href="/editorial-policy">Editorial Policy</Link>.</p>
          )}

          {a.tags && a.tags.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Tags">
              {a.tags.map((t) => <li key={t.id}><Link href={`/tag/${t.slug}`} className="rounded-full border border-rule px-3 py-1 text-sm hover:border-ink hover:bg-wash">#{t.name}</Link></li>)}
            </ul>
          )}

          <AdSlot placement="article_bottom" />

          {a.author && (
            <section aria-labelledby="author-h" className="mt-8 flex gap-4 rounded border border-rule p-5">
              <div className="w-16 shrink-0"><SmartImage src={a.author.avatar_url} alt="" aspect="aspect-square" sizes="64px" fallbackLabel={a.author.name} className="rounded-full" /></div>
              <div>
                <h2 id="author-h" className="kicker !text-muted">About the author</h2>
                <p className="headline text-xl"><Link href={`/author/${a.author.slug}`} className="hover:text-brand">{a.author.name}</Link></p>
                {a.author.job_title && <p className="meta">{a.author.job_title}</p>}
                {a.author.bio && <p className="mt-2 text-sm">{a.author.bio}</p>}
              </div>
            </section>
          )}

          {adjacent && (adjacent.prev || adjacent.next) && (
            <nav aria-label="More stories" className="mt-8 grid gap-4 border-t border-rule pt-6 sm:grid-cols-2">
              {adjacent.prev ? (
                <Link href={`/news/${adjacent.prev.slug}`} rel="prev" className="card-link block">
                  <span className="meta inline-flex items-center gap-1 font-semibold uppercase"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Previous</span>
                  <span className="headline mt-1 block text-lg">{adjacent.prev.title}</span>
                </Link>
              ) : <span />}
              {adjacent.next && (
                <Link href={`/news/${adjacent.next.slug}`} rel="next" className="card-link block sm:text-right">
                  <span className="meta inline-flex items-center gap-1 font-semibold uppercase">Next<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  <span className="headline mt-1 block text-lg">{adjacent.next.title}</span>
                </Link>
              )}
            </nav>
          )}
        </div>

        <aside aria-label="Sidebar" className="space-y-8 lg:col-span-4">
          <div className="hidden lg:sticky lg:top-4 lg:block"><TableOfContents items={toc} /></div>
          <AdSlot placement="sidebar" />
          {mostRead.length > 0 && (
            <section aria-labelledby="art-mr-h">
              <SectionHeading title="Most read" id="art-mr-h" />
              <ol className="space-y-4">{mostRead.map((m, i) => <li key={m.id}><ArticleCard article={m} variant="ranked" rank={i + 1} /></li>)}</ol>
            </section>
          )}
          {!preview && settings.features.newsletter && <NewsletterForm headline={settings.features.newsletterHeadline} blurb={settings.features.newsletterBlurb} source="article-sidebar" />}
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-h" className="mt-14">
          <SectionHeading title="Related stories" id="related-h" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => <ArticleCard key={r.id} article={r} brandInitial={settings.brand.name} />)}
          </div>
        </section>
      )}
    </article>
  );
}
