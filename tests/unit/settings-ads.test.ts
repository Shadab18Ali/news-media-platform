import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, integrationsSchema, brandSchema, seoSchema, type SiteSettings } from "@/lib/settings-schema";
import { resolveSettings } from "@/lib/data/settings";
import { pickAd, adsenseConfigured } from "@/lib/ads";
import { composeHome } from "@/lib/data/home";
import { parseSources, parseTags } from "@/lib/admin/article-form";
import { parseSourceBlocks } from "@/lib/ai/sources";
import { parseDraftJson } from "@/lib/ai/prompt";
import { aiProvider } from "@/lib/ai/provider";
import type { Advertisement, ArticleCardData } from "@/types/db";

const ad = (o: Partial<Advertisement>): Advertisement => ({
  id: "1", name: "n", placement: "sidebar", ad_type: "image", adsense_slot: null, custom_html: null, image_url: "https://x/y.png", link_url: "https://adv.example",
  image_alt: null, sponsor_name: null, is_active: true, priority: 100, starts_at: null, ends_at: null, ...o,
});
const on = (patch: Partial<SiteSettings["ads"]> = {}, integ: SiteSettings["integrations"] = {}): SiteSettings => ({ ...DEFAULT_SETTINGS, ads: { ...DEFAULT_SETTINGS.ads, enabled: true, ...patch }, integrations: integ });

describe("integration id validation", () => {
  it("rejects placeholders, accepts real formats", () => {
    expect(integrationsSchema.safeParse({ ga4MeasurementId: "G-XXXX" }).success).toBe(false);
    expect(integrationsSchema.safeParse({ ga4MeasurementId: "G-ABCDE12345" }).success).toBe(true);
    expect(integrationsSchema.safeParse({ adsensePublisherId: "ca-pub-123" }).success).toBe(false);
    expect(integrationsSchema.safeParse({ adsensePublisherId: "ca-pub-1234567890123456" }).success).toBe(true);
    expect(integrationsSchema.safeParse({ gtmContainerId: "GTM-ABC123" }).success).toBe(true);
    expect(integrationsSchema.safeParse({ ga4MeasurementId: "" }).success).toBe(true);
  });
  it("brand colours + seo template", () => {
    expect(brandSchema.safeParse({ ...DEFAULT_SETTINGS.brand, primaryColor: "red" }).success).toBe(false);
    expect(seoSchema.safeParse({ titleTemplate: "no placeholder" }).success).toBe(false);
  });
});

describe("settings defaults", () => {
  it("ships with ads off, no tracking ids", () => {
    expect(DEFAULT_SETTINGS.ads.enabled).toBe(false);
    expect(DEFAULT_SETTINGS.integrations).toEqual({});
  });
  it("invalid stored data falls back to defaults", () => {
    const s = resolveSettings({ brand: { name: "X", primaryColor: "nope" }, integrations: { ga4MeasurementId: "bad" } });
    expect(s.brand).toEqual(DEFAULT_SETTINGS.brand);
    expect(s.integrations).toEqual({});
  });
  it("merges partial stored data", () => {
    const s = resolveSettings({ brand: { name: "Meridian Post" } });
    expect(s.brand.name).toBe("Meridian Post");
    expect(s.brand.primaryColor).toBe(DEFAULT_SETTINGS.brand.primaryColor);
  });
});

describe("pickAd", () => {
  it("shows nothing when ads are globally disabled", () => {
    expect(pickAd("sidebar", [ad({})], DEFAULT_SETTINGS)).toBeNull();
  });
  it("respects per-placement toggle", () => {
    const s = on({ placements: { ...DEFAULT_SETTINGS.ads.placements, sidebar: { enabled: false } } });
    expect(pickAd("sidebar", [ad({})], s)).toBeNull();
    expect(pickAd("sidebar", [ad({})], on())?.ad.id).toBe("1");
  });
  it("AdSense needs valid publisher id and slot", () => {
    const unit = ad({ ad_type: "adsense", adsense_slot: "1234567890", image_url: null, link_url: null });
    expect(pickAd("sidebar", [unit], on())).toBeNull();
    const s = on({}, { adsensePublisherId: "ca-pub-1234567890123456" });
    expect(adsenseConfigured(s)).toBe(true);
    expect(pickAd("sidebar", [unit], s)?.needsAdsense).toBe(true);
    expect(pickAd("sidebar", [{ ...unit, adsense_slot: "abc" }], s)).toBeNull();
  });
  it("honours schedule window, priority, inactive and empty content", () => {
    const now = Date.parse("2026-06-01T00:00:00Z");
    expect(pickAd("sidebar", [ad({ ends_at: "2026-05-01T00:00:00Z" })], on(), now)).toBeNull();
    expect(pickAd("sidebar", [ad({ starts_at: "2026-07-01T00:00:00Z" })], on(), now)).toBeNull();
    expect(pickAd("sidebar", [ad({ is_active: false })], on(), now)).toBeNull();
    expect(pickAd("sidebar", [ad({ ad_type: "custom_html", custom_html: "  " })], on(), now)).toBeNull();
    expect(pickAd("sidebar", [ad({ id: "b", priority: 5 }), ad({ id: "a", priority: 1 })], on(), now)?.ad.id).toBe("a");
    expect(pickAd("header", [ad({})], on(), now)).toBeNull();
  });
});

const card = (id: string, extra: Partial<ArticleCardData> = {}): ArticleCardData => ({
  id, title: id, slug: id, excerpt: null, featured_image_url: null, featured_image_alt: null, published_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  article_type: "article", reading_time_minutes: 1, is_breaking: false, view_count: 0, category: null, author: null, ...extra,
});

describe("composeHome", () => {
  it("does not repeat stories across blocks and prefers featured for the hero", () => {
    const latest = Array.from({ length: 20 }, (_, i) => card(`a${i}`));
    const h = composeHome({ latest, featured: [latest[5]], breaking: [], trending: [], mostRead: [] });
    expect(h.hero?.id).toBe("a5");
    const ids = [h.hero!, ...h.heroSide, ...h.secondary, ...h.feed].map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(h.hasContent).toBe(true);
  });
  it("empty input", () => {
    const h = composeHome({ latest: [], featured: [], breaking: [], trending: [], mostRead: [] });
    expect(h.hero).toBeNull();
    expect(h.hasContent).toBe(false);
  });
});

describe("article form parsing", () => {
  it("parses tags with dedupe/limit", () => {
    expect(parseTags("AI, #ai, Café Culture ,, ")).toEqual([{ name: "AI", slug: "ai" }, { name: "Café Culture", slug: "cafe-culture" }]);
    expect(parseTags(Array.from({ length: 30 }, (_, i) => `t${i}`).join(",")).length).toBe(15);
  });
  it("parses and validates sources", () => {
    const r = parseSources("Reuters | https://reuters.com/a\nhttps://www.example.com/x\nnot a url\njavascript:alert(1)");
    expect(r.sources).toHaveLength(2);
    expect(r.sources[1].title).toBe("example.com");
    expect(r.invalid).toHaveLength(2);
  });
});

describe("drafting provider", () => {
  it("is disabled by default and needs no paid API", () => {
    expect(aiProvider({ AI_PROVIDER: undefined } as unknown as NodeJS.ProcessEnv).isConfigured()).toBe(false);
    expect(aiProvider({ AI_PROVIDER: "anthropic" } as unknown as NodeJS.ProcessEnv).isConfigured()).toBe(false);
    expect(aiProvider({ AI_PROVIDER: "anthropic", AI_API_KEY: "k", AI_MODEL: "m" } as unknown as NodeJS.ProcessEnv).isConfigured()).toBe(true);
  });
  it("parses source blocks", () => {
    const b = parseSourceBlocks("Reuters | https://r.com/a\nFact one.\nFact two.\n\nBad block no url\nnotes");
    expect(b).toEqual([{ title: "Reuters", url: "https://r.com/a", notes: "Fact one.\nFact two." }]);
  });
  it("parses model JSON defensively", () => {
    const d = parseDraftJson('Sure!\n```json\n{"title":"T title","contentHtml":"<p>Some body text here ok</p>","sourcesUsed":[{"title":"s","url":"https://s.com"}]}\n```');
    expect(d.title).toBe("T title");
    expect(() => parseDraftJson("no json")).toThrow();
    expect(() => parseDraftJson('{"title":"x"}')).toThrow();
  });
});
