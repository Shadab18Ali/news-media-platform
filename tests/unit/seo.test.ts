import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/settings-schema";
import { articleSchema, breadcrumbSchema, jsonLd, organizationSchema, websiteSchema } from "@/lib/seo/schema";
import { buildMetadata } from "@/lib/seo/metadata";
import { runSeoChecks } from "@/lib/admin/seo-checks";
import type { ArticleWithRelations } from "@/types/db";

const article = {
  id: "1", title: "Headline", slug: "headline", excerpt: "Ex", content: "<p>one two three</p>", article_type: "news", status: "published",
  published_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", created_at: "2026-01-01T00:00:00Z", language: "en",
  canonical_url: null, seo_title: null, meta_description: null, og_image_url: null, featured_image_url: "https://cdn.example/x.webp",
  category: { id: "c", name: "Tech", slug: "tech" }, author: { id: "a", name: "A. Writer", slug: "a-writer", avatar_url: null, job_title: null, bio: null }, tags: [{ id: "t", name: "chips", slug: "chips" }], sources: [], sponsor_name: null,
} as unknown as ArticleWithRelations;

describe("structured data", () => {
  it("NewsArticle for news, Article otherwise", () => {
    expect(articleSchema(article, DEFAULT_SETTINGS)["@type"]).toBe("NewsArticle");
    expect(articleSchema({ ...article, article_type: "article" }, DEFAULT_SETTINGS)["@type"]).toBe("Article");
  });
  it("includes required Google fields", () => {
    const a = articleSchema(article, DEFAULT_SETTINGS) as Record<string, unknown>;
    for (const k of ["headline", "datePublished", "dateModified", "author", "publisher", "image", "mainEntityOfPage"]) expect(a[k]).toBeTruthy();
  });
  it("org/website/breadcrumb", () => {
    expect(organizationSchema(DEFAULT_SETTINGS)["@type"]).toBe("NewsMediaOrganization");
    expect((websiteSchema(DEFAULT_SETTINGS) as { potentialAction: unknown }).potentialAction).toBeTruthy();
    const b = breadcrumbSchema([{ name: "Home", path: "/" }, { name: "X", path: "/x" }]) as { itemListElement: { position: number }[] };
    expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });
  it("jsonLd cannot break out of the script tag", () => {
    expect(jsonLd({ a: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("metadata", () => {
  it("noindex pages and canonical", () => {
    const m = buildMetadata({ settings: DEFAULT_SETTINGS, title: "Search", path: "/search", noindex: true });
    expect((m.robots as { index: boolean }).index).toBe(false);
    expect(m.alternates?.canonical).toMatch(/\/search$/);
  });
  it("custom canonical wins", () => {
    const m = buildMetadata({ settings: DEFAULT_SETTINGS, title: "x", path: "/news/x", canonical: "https://orig.example/x" });
    expect(m.alternates?.canonical).toBe("https://orig.example/x");
  });
});

describe("editor SEO checks", () => {
  it("flags problems and passes good input", () => {
    const bad = runSeoChecks({ title: "Hi", slug: "hi", contentHtml: "<p>short</p>", imageUrl: "x", imageAlt: "" });
    expect(bad.find((c) => c.id === "img-alt")?.status).toBe("bad");
    expect(bad.find((c) => c.id === "words")?.status).toBe("bad");
    const good = runSeoChecks({
      title: "Semiconductor makers build local supply chains", slug: "semiconductor-makers-local", focusKeyword: "semiconductor",
      metaDescription: "Semiconductor makers across India are building local supply chains as electronics demand surges this year.",
      contentHtml: `<h2>x</h2><p>Semiconductor ${"word ".repeat(320)}</p><a href="/about">a</a>`, imageUrl: "x", imageAlt: "alt",
    });
    expect(good.every((c) => c.status === "good")).toBe(true);
  });
});
