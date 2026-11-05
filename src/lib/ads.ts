import type { Advertisement } from "@/types/db";
import type { SiteSettings } from "@/lib/settings-schema";
import { ADSENSE_RE, ADSENSE_SLOT_RE } from "@/lib/settings-schema";
import type { AdPlacementId } from "@/config/site";

export interface ResolvedAd {
  ad: Advertisement;
  /** Needs the AdSense script + user ad-consent to render. */
  needsAdsense: boolean;
}

/** True when AdSense can actually be used: a valid publisher id is configured. */
export function adsenseConfigured(settings: SiteSettings): boolean {
  return ADSENSE_RE.test(settings.integrations.adsensePublisherId ?? "");
}

/**
 * Picks the ad to show for a placement, or null. Rules, all of which must hold:
 *  1. Ads are globally enabled in settings.
 *  2. The individual placement is enabled.
 *  3. An active (and within its date window) ad is assigned to the placement.
 *  4. AdSense ads additionally need a valid publisher id and slot id; custom/image ads need real content.
 * Nothing is ever shown as a placeholder.
 */
export function pickAd(placement: AdPlacementId, ads: Advertisement[], settings: SiteSettings, now = Date.now()): ResolvedAd | null {
  if (!settings.ads.enabled) return null;
  if (!settings.ads.placements[placement]?.enabled) return null;
  const candidates = ads
    .filter((a) => a.placement === placement && a.is_active)
    .filter((a) => (!a.starts_at || new Date(a.starts_at).getTime() <= now) && (!a.ends_at || new Date(a.ends_at).getTime() > now))
    .sort((a, b) => a.priority - b.priority);

  for (const ad of candidates) {
    if (ad.ad_type === "adsense") {
      if (adsenseConfigured(settings) && ADSENSE_SLOT_RE.test(ad.adsense_slot ?? "")) return { ad, needsAdsense: true };
    } else if (ad.ad_type === "image") {
      if (ad.image_url && ad.link_url) return { ad, needsAdsense: false };
    } else if (ad.custom_html?.trim()) {
      return { ad, needsAdsense: false };
    }
  }
  return null;
}
