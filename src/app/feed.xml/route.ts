import { getSettings } from "@/lib/data/settings";
import { getLatestArticles } from "@/lib/data/queries";
import { absoluteUrl } from "@/lib/utils";
import { xmlEscape } from "@/lib/xml";

export const revalidate = 600;

export async function GET() {
  const [s, items] = await Promise.all([getSettings(), getLatestArticles(30)]);
  const entries = items.map((a) => `    <item>
      <title>${xmlEscape(a.title)}</title>
      <link>${xmlEscape(absoluteUrl(`/news/${a.slug}`))}</link>
      <guid isPermaLink="true">${xmlEscape(absoluteUrl(`/news/${a.slug}`))}</guid>
      ${a.published_at ? `<pubDate>${new Date(a.published_at).toUTCString()}</pubDate>` : ""}
      ${a.category ? `<category>${xmlEscape(a.category.name)}</category>` : ""}
      <description>${xmlEscape(a.excerpt ?? "")}</description>
    </item>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(s.brand.name)}</title>
    <link>${xmlEscape(absoluteUrl("/"))}</link>
    <description>${xmlEscape(s.brand.description ?? "")}</description>
    <language>en</language>
    <atom:link href="${xmlEscape(absoluteUrl("/feed.xml"))}" rel="self" type="application/rss+xml" />
${entries}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
