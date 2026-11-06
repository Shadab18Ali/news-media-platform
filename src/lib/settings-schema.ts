import { z } from "zod";
import { AD_PLACEMENTS } from "@/config/site";

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optStr = (max = 300) => z.preprocess(emptyToUndef, z.string().trim().max(max).optional());
const optUrl = z.preprocess(
  emptyToUndef,
  z.string().trim().max(500).regex(/^(https?:\/\/|\/)/, "Must start with https://, http:// or /").optional(),
);
const color = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #b91c1c");

/** Google ID formats. Placeholder or malformed IDs are rejected so tracking never activates by accident. */
export const GA4_RE = /^G-[A-Z0-9]{6,12}$/;
export const GTM_RE = /^GTM-[A-Z0-9]{4,10}$/;
export const ADSENSE_RE = /^ca-pub-\d{16}$/;
export const ADSENSE_SLOT_RE = /^\d{6,15}$/;

export const brandSchema = z.object({
  name: z.string().trim().min(2).max(60),
  tagline: optStr(120),
  description: optStr(300),
  logoUrl: optUrl,
  faviconUrl: optUrl,
  primaryColor: color,
  accentColor: color,
  defaultOgImage: optUrl,
  foundedYear: z.preprocess(emptyToUndef, z.coerce.number().int().min(1900).max(2100).optional()),
  twitterHandle: z.preprocess(emptyToUndef, z.string().trim().regex(/^@?[A-Za-z0-9_]{1,15}$/, "Handle like @brand").optional()),
  facebook: optUrl,
  instagram: optUrl,
  youtube: optUrl,
  linkedin: optUrl,
  twitter: optUrl,
});

export const publisherSchema = z.object({
  legalName: optStr(120),
  contactEmail: z.preprocess(emptyToUndef, z.email().max(200).optional()),
  advertiseEmail: z.preprocess(emptyToUndef, z.email().max(200).optional()),
  correctionsEmail: z.preprocess(emptyToUndef, z.email().max(200).optional()),
  phone: optStr(40),
  address: optStr(300),
  country: optStr(80),
  editorInChief: optStr(120),
});

export const seoSchema = z.object({
  titleTemplate: z.string().trim().max(120).refine((v) => v.includes("%s"), "Must contain %s"),
  defaultDescription: optStr(320),
  googleSiteVerification: z.preprocess(emptyToUndef, z.string().trim().regex(/^[A-Za-z0-9_-]{10,100}$/, "Paste only the token value").optional()),
  bingSiteVerification: z.preprocess(emptyToUndef, z.string().trim().regex(/^[A-Za-z0-9_-]{10,100}$/, "Paste only the token value").optional()),
});

export const integrationsSchema = z.object({
  ga4MeasurementId: z.preprocess(emptyToUndef, z.string().trim().regex(GA4_RE, "Format: G-XXXXXXXXXX").optional()),
  gtmContainerId: z.preprocess(emptyToUndef, z.string().trim().regex(GTM_RE, "Format: GTM-XXXXXXX").optional()),
  adsensePublisherId: z.preprocess(emptyToUndef, z.string().trim().regex(ADSENSE_RE, "Format: ca-pub-1234567890123456").optional()),
});

const placementShape = Object.fromEntries(
  AD_PLACEMENTS.map((p) => [p.id, z.object({ enabled: z.boolean() })]),
) as Record<(typeof AD_PLACEMENTS)[number]["id"], z.ZodObject<{ enabled: z.ZodBoolean }>>;

export const adsSchema = z.object({
  enabled: z.boolean(),
  adsTxt: z.string().max(5000),
  placements: z.object(placementShape),
});

export const featuresSchema = z.object({
  newsletter: z.boolean(),
  breakingTicker: z.boolean(),
  newsletterHeadline: z.string().trim().max(120),
  newsletterBlurb: z.string().trim().max(300),
  affiliateDisclosure: z.string().trim().max(600),
  /** 0 = off. Machine-written drafts nobody has touched are published after this many hours (clearly labelled). */
  autoPublishHours: z.preprocess((v) => (v === "" || v === undefined ? 0 : v), z.coerce.number().int().min(0).max(168)),
  sponsoredLabel: z.string().trim().max(60),
});

export type BrandSettings = z.infer<typeof brandSchema>;
export type PublisherSettings = z.infer<typeof publisherSchema>;
export type SeoSettings = z.infer<typeof seoSchema>;
export type IntegrationSettings = z.infer<typeof integrationsSchema>;
export type AdSettings = z.infer<typeof adsSchema>;
export type FeatureSettings = z.infer<typeof featuresSchema>;

export interface SiteSettings {
  brand: BrandSettings;
  publisher: PublisherSettings;
  seo: SeoSettings;
  integrations: IntegrationSettings;
  ads: AdSettings;
  features: FeatureSettings;
}

export type SettingsKey = keyof SiteSettings;
export const SETTINGS_SCHEMAS = {
  brand: brandSchema,
  publisher: publisherSchema,
  seo: seoSchema,
  integrations: integrationsSchema,
  ads: adsSchema,
  features: featuresSchema,
} as const;

/**
 * First-run defaults. Ads are OFF, no tracking IDs are set, and the brand is a neutral
 * placeholder the owner is expected to replace in /admin/settings.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  brand: {
    name: "The Daily Ledger",
    tagline: "Independent news, technology and analysis",
    description: "Fresh, carefully edited news and analysis on technology, business, India and the world.",
    primaryColor: "#b91c1c",
    accentColor: "#0f172a",
  },
  publisher: {},
  seo: {
    titleTemplate: "%s | The Daily Ledger",
    defaultDescription: "Fresh, carefully edited news and analysis on technology, business, India and the world.",
  },
  integrations: {},
  ads: {
    enabled: false,
    adsTxt: "",
    placements: Object.fromEntries(AD_PLACEMENTS.map((p) => [p.id, { enabled: true }])) as AdSettings["placements"],
  },
  features: {
    newsletter: true,
    breakingTicker: true,
    newsletterHeadline: "Get the day's top stories in your inbox",
    newsletterBlurb: "One concise email. No spam. Unsubscribe any time.",
    affiliateDisclosure:
      "This article contains affiliate links. If you buy through them we may earn a commission at no extra cost to you. It never influences our editorial judgement.",
    sponsoredLabel: "Sponsored",
    autoPublishHours: 0,
  },
};
