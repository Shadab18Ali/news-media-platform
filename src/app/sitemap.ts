import type { MetadataRoute } from "next";
import { getCategories, getSitemapArticles } from "@/lib/data/queries";
import { getAuthors } from "@/lib/data/queries";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

const STATIC = ["/about", "/contact", "/authors", "/editorial-policy", "/corrections-policy", "/privacy-policy", "/terms-and-conditions", "/disclaimer", "/advertise"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, articles, authors] = await Promise.all([getCategories(), getSitemapArticles(), getAuthors()]);
  return [
    { url: absoluteUrl("/"), changeFrequency: "hourly", priority: 1 },
    ...categories.map((c) => ({ url: absoluteUrl(`/category/${c.slug}`), lastModified: c.updated_at, changeFrequency: "daily" as const, priority: 0.8 })),
    ...articles.map((a) => ({ url: absoluteUrl(`/news/${a.slug}`), lastModified: a.updated_at, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...authors.map((a) => ({ url: absoluteUrl(`/author/${a.slug}`), lastModified: a.updated_at, changeFrequency: "weekly" as const, priority: 0.4 })),
    ...STATIC.map((p) => ({ url: absoluteUrl(p), changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
