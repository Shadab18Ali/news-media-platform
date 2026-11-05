import type { SiteSettings } from "@/lib/settings-schema";
import type { ArticleWithRelations } from "@/types/db";
import { absoluteUrl, stripHtml, truncate } from "@/lib/utils";

type Json = Record<string, unknown>;

export function organizationSchema(s: SiteSettings): Json {
  const sameAs = [s.brand.twitter, s.brand.facebook, s.brand.instagram, s.brand.youtube, s.brand.linkedin].filter(Boolean);
  const contactEmail = s.publisher.contactEmail;
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "@id": absoluteUrl("/#organization"),
    name: s.brand.name,
    ...(s.publisher.legalName ? { legalName: s.publisher.legalName } : {}),
    url: absoluteUrl("/"),
    ...(s.brand.logoUrl ? { logo: { "@type": "ImageObject", url: absoluteUrl(s.brand.logoUrl) } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(s.brand.foundedYear ? { foundingDate: String(s.brand.foundedYear) } : {}),
    ...(contactEmail || s.publisher.phone
      ? { contactPoint: [{ "@type": "ContactPoint", contactType: "editorial", ...(contactEmail ? { email: contactEmail } : {}), ...(s.publisher.phone ? { telephone: s.publisher.phone } : {}) }] }
      : {}),
    publishingPrinciples: absoluteUrl("/editorial-policy"),
    correctionsPolicy: absoluteUrl("/corrections-policy"),
    ...(s.publisher.address ? { address: s.publisher.address } : {}),
  };
}

export function websiteSchema(s: SiteSettings): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: absoluteUrl("/"),
    name: s.brand.name,
    ...(s.brand.description ? { description: s.brand.description } : {}),
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function articleSchema(a: ArticleWithRelations, s: SiteSettings): Json {
  const url = a.canonical_url || absoluteUrl(`/news/${a.slug}`);
  const image = a.og_image_url || a.featured_image_url;
  const wordCount = stripHtml(a.content).split(/\s+/).filter(Boolean).length;
  return {
    "@context": "https://schema.org",
    "@type": a.article_type === "news" ? "NewsArticle" : "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: truncate(a.seo_title || a.title, 110),
    description: a.meta_description || a.excerpt || truncate(stripHtml(a.content), 200),
    ...(image ? { image: [absoluteUrl(image)] } : {}),
    datePublished: a.published_at,
    dateModified: a.updated_at,
    author: a.author
      ? { "@type": "Person", name: a.author.name, url: absoluteUrl(`/author/${a.author.slug}`) }
      : { "@type": "Organization", name: s.brand.name, url: absoluteUrl("/") },
    publisher: {
      "@type": "NewsMediaOrganization",
      "@id": absoluteUrl("/#organization"),
      name: s.brand.name,
      ...(s.brand.logoUrl ? { logo: { "@type": "ImageObject", url: absoluteUrl(s.brand.logoUrl) } } : {}),
    },
    ...(a.category ? { articleSection: a.category.name } : {}),
    ...(a.tags?.length ? { keywords: a.tags.map((t) => t.name).join(", ") } : {}),
    wordCount,
    inLanguage: a.language,
    ...(a.sources?.length ? { citation: a.sources.map((src) => ({ "@type": "CreativeWork", name: src.title, url: src.url })) } : {}),
    ...(a.article_type === "sponsored" ? { isAccessibleForFree: true, sponsor: a.sponsor_name ? { "@type": "Organization", name: a.sponsor_name } : undefined } : {}),
  };
}

/** Serialise for a <script type="application/ld+json">, neutralising `</script>` sequences. */
export function jsonLd(data: Json | Json[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
