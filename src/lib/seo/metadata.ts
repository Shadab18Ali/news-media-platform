import type { Metadata } from "next";
import type { SiteSettings } from "@/lib/settings-schema";
import { absoluteUrl, truncate } from "@/lib/utils";
import { SITE_CONFIG } from "@/config/site";

export function pageTitle(settings: SiteSettings, title: string): string {
  return settings.seo.titleTemplate.replace("%s", title);
}

interface BuildMetaInput {
  settings: SiteSettings;
  title: string;
  /** When true the title is used verbatim (no brand template). */
  rawTitle?: boolean;
  description?: string | null;
  path: string;
  canonical?: string | null;
  image?: string | null;
  imageAlt?: string | null;
  type?: "website" | "article";
  noindex?: boolean;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  authors?: string[];
  section?: string | null;
  tags?: string[];
}

export function buildMetadata(i: BuildMetaInput): Metadata {
  const { settings } = i;
  const description = truncate(i.description || settings.seo.defaultDescription || settings.brand.description || "", 300);
  const canonical = i.canonical || absoluteUrl(i.path);
  const image = i.image || settings.brand.defaultOgImage;
  const images = image ? [{ url: absoluteUrl(image), alt: i.imageAlt || i.title, width: 1200, height: 630 }] : undefined;
  const fullTitle = i.rawTitle ? i.title : pageTitle(settings, i.title);
  const twitter = settings.brand.twitterHandle ? `@${settings.brand.twitterHandle.replace(/^@/, "")}` : undefined;

  return {
    title: i.rawTitle ? { absolute: i.title } : i.title,
    description,
    alternates: { canonical },
    robots: i.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    openGraph: {
      type: i.type ?? "website",
      title: fullTitle,
      description,
      url: canonical,
      siteName: settings.brand.name,
      locale: SITE_CONFIG.defaultLocale === "en" ? "en_IN" : SITE_CONFIG.defaultLocale,
      images,
      ...(i.type === "article"
        ? {
            publishedTime: i.publishedTime ?? undefined,
            modifiedTime: i.modifiedTime ?? undefined,
            authors: i.authors,
            section: i.section ?? undefined,
            tags: i.tags,
          }
        : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      images: images?.map((x) => x.url),
      site: twitter,
      creator: twitter,
    },
  };
}
