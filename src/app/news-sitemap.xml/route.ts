import { getSettings } from "@/lib/data/settings";
import { getRecentNewsForGoogleNews } from "@/lib/data/queries";
import { absoluteUrl } from "@/lib/utils";
import { xmlEscape } from "@/lib/xml";

export const revalidate = 600;

/** Google News sitemap: only `news` articles published in the last 2 days, per Google's spec. */
export async function GET() {
  const [s, items] = await Promise.all([getSettings(), getRecentNewsForGoogleNews()]);
  const urls = items.filter((a) => a.published_at).map((a) => `  <url>
    <loc>${xmlEscape(absoluteUrl(`/news/${a.slug}`))}</loc>
    <news:news>
      <news:publication><news:name>${xmlEscape(s.brand.name)}</news:name><news:language>en</news:language></news:publication>
      <news:publication_date>${new Date(a.published_at!).toISOString()}</news:publication_date>
      <news:title>${xmlEscape(a.title)}</news:title>
    </news:news>
  </url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
