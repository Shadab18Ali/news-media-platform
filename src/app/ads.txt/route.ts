import { getSettings } from "@/lib/data/settings";
import { ADSENSE_RE } from "@/lib/settings-schema";

export const revalidate = 3600;

/**
 * Serves /ads.txt from admin settings. If the owner has not pasted a custom file but has a valid
 * AdSense publisher id, the standard Google line is generated. Otherwise the file is empty (valid).
 */
export async function GET() {
  const s = await getSettings();
  let body = s.ads.adsTxt.trim();
  const pub = s.integrations.adsensePublisherId;
  if (!body && pub && ADSENSE_RE.test(pub)) {
    body = `google.com, ${pub.replace("ca-", "")}, DIRECT, f08c47fec0942fa0`;
  }
  return new Response(body ? body + "\n" : "", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
