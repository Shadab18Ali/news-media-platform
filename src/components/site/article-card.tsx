import Link from "next/link";
import type { ArticleCardData } from "@/types/db";
import { SmartImage } from "@/components/ui/smart-image";
import { formatDate, timeAgo } from "@/lib/utils";

type Variant = "hero" | "lead" | "standard" | "compact" | "ranked";

function Meta({ a, showCategory = true }: { a: ArticleCardData; showCategory?: boolean }) {
  return (
    <p className="meta flex flex-wrap items-center gap-x-2">
      {showCategory && a.category && <span className="kicker">{a.category.name}</span>}
      {a.published_at && (
        <time dateTime={a.published_at} title={formatDate(a.published_at)}>{timeAgo(a.published_at)}</time>
      )}
      <span aria-hidden="true">·</span>
      <span>{a.reading_time_minutes} min read</span>
    </p>
  );
}

function TypeFlag({ a }: { a: ArticleCardData }) {
  if (a.article_type === "sponsored") return <span className="meta mr-2 rounded bg-wash px-1.5 py-0.5 font-semibold uppercase tracking-wide">Sponsored</span>;
  return null;
}

export function ArticleCard({
  article: a, variant = "standard", rank, priority, brandInitial,
}: { article: ArticleCardData; variant?: Variant; rank?: number; priority?: boolean; brandInitial?: string }) {
  const href = `/news/${a.slug}`;
  const label = brandInitial ?? a.category?.name ?? "N";

  if (variant === "hero") {
    return (
      <article className="group">
        <Link href={href} className="card-link block">
          <SmartImage src={a.featured_image_url} alt={a.featured_image_alt ?? a.title} sizes="(min-width:1024px) 640px, 100vw" aspect="aspect-[16/10]" priority={priority} fallbackLabel={label} />
          <div className="mt-4">
            <Meta a={a} />
            <h2 className="headline mt-2 text-3xl sm:text-4xl lg:text-[2.6rem]"><TypeFlag a={a} />{a.title}</h2>
            {a.excerpt && <p className="mt-3 text-lg leading-snug text-body">{a.excerpt}</p>}
            {a.author && <p className="meta mt-3">By {a.author.name}</p>}
          </div>
        </Link>
      </article>
    );
  }

  if (variant === "lead") {
    return (
      <article>
        <Link href={href} className="card-link block">
          <SmartImage src={a.featured_image_url} alt={a.featured_image_alt ?? a.title} sizes="(min-width:1024px) 400px, (min-width:640px) 50vw, 100vw" aspect="aspect-[3/2]" priority={priority} fallbackLabel={label} />
          <div className="mt-3">
            <Meta a={a} />
            <h3 className="headline mt-1.5 text-xl sm:text-2xl"><TypeFlag a={a} />{a.title}</h3>
            {a.excerpt && <p className="mt-2 line-clamp-3 text-[0.95rem] text-body">{a.excerpt}</p>}
          </div>
        </Link>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article>
        <Link href={href} className="card-link flex gap-3">
          <div className="min-w-0 flex-1">
            <Meta a={a} />
            <h3 className="headline mt-1 text-base sm:text-[1.05rem]"><TypeFlag a={a} />{a.title}</h3>
          </div>
          <div className="w-24 shrink-0 sm:w-28">
            <SmartImage src={a.featured_image_url} alt="" sizes="112px" aspect="aspect-square" fallbackLabel={label} />
          </div>
        </Link>
      </article>
    );
  }

  if (variant === "ranked") {
    return (
      <article>
        <Link href={href} className="card-link flex gap-3">
          <span className="headline w-8 shrink-0 text-3xl text-brand" aria-hidden="true">{rank}</span>
          <div className="min-w-0">
            <h3 className="headline text-base">{a.title}</h3>
            <p className="meta mt-1">{a.category?.name} · {a.view_count.toLocaleString("en-IN")} reads</p>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article>
      <Link href={href} className="card-link block">
        <SmartImage src={a.featured_image_url} alt={a.featured_image_alt ?? a.title} sizes="(min-width:1024px) 300px, (min-width:640px) 33vw, 100vw" aspect="aspect-[3/2]" priority={priority} fallbackLabel={label} />
        <div className="mt-3">
          <Meta a={a} />
          <h3 className="headline mt-1.5 text-lg"><TypeFlag a={a} />{a.title}</h3>
        </div>
      </Link>
    </article>
  );
}
