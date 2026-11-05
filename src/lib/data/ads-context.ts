import { cache } from "react";
import { getActiveAds } from "@/lib/data/queries";
import { getSettings } from "@/lib/data/settings";
import { pickAd, type ResolvedAd } from "@/lib/ads";
import type { AdPlacementId } from "@/config/site";

/** Loads settings + active ads once per render and exposes a resolver. */
export const getAdContext = cache(async () => {
  const [settings, ads] = await Promise.all([getSettings(), getActiveAds()]);
  return {
    settings,
    resolve: (placement: AdPlacementId): ResolvedAd | null => pickAd(placement, ads, settings),
  };
});
