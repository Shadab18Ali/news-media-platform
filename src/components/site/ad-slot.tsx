import { AD_PLACEMENTS, type AdPlacementId } from "@/config/site";
import { getAdContext } from "@/lib/data/ads-context";
import { AdsenseUnit, CustomAdHtml } from "./ad-client";
import { cn } from "@/lib/utils";

/**
 * Renders the configured ad for a placement, or NOTHING (no placeholder, no empty box)
 * when ads are disabled / unconfigured. Reserved height prevents layout shift once an ad is shown.
 */
export async function AdSlot({ placement, className }: { placement: AdPlacementId; className?: string }) {
  const { settings, resolve } = await getAdContext();
  const picked = resolve(placement);
  if (!picked) return null;
  const meta = AD_PLACEMENTS.find((p) => p.id === placement)!;
  const { ad } = picked;

  return (
    <aside aria-label="Advertisement" className={cn("ad-slot my-6 text-center", className)} style={{ minHeight: meta.minHeight }}>
      <p className="meta mb-1 text-[0.65rem] uppercase tracking-widest">Advertisement</p>
      {ad.ad_type === "adsense" && ad.adsense_slot && (
        <AdsenseUnit client={settings.integrations.adsensePublisherId!} slot={ad.adsense_slot} minHeight={meta.minHeight} />
      )}
      {ad.ad_type === "image" && ad.image_url && ad.link_url && (
        <a href={ad.link_url} target="_blank" rel="sponsored noopener noreferrer" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.image_url} alt={ad.image_alt || ad.sponsor_name || "Sponsored"} loading="lazy" className="mx-auto h-auto max-w-full" />
        </a>
      )}
      {ad.ad_type === "custom_html" && ad.custom_html && <CustomAdHtml html={ad.custom_html} />}
      {ad.sponsor_name && <p className="meta mt-1">Sponsored by {ad.sponsor_name}</p>}
    </aside>
  );
}
