import { describe, it, expect } from "vitest";
import { connectorArticleSchema } from "@/lib/connector/schema";

const ok = { title: "A sufficiently long headline", excerpt: "A standfirst that is long enough.", content_html: `<p>${"word ".repeat(100)}</p>`, category_slug: "technology", sources: [{ title: "Source", url: "https://example.com/a" }] };

describe("connector payload", () => {
  it("accepts a valid draft and defaults the type", () => {
    const r = connectorArticleSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.article_type).toBe("article");
  });
  it("requires at least one https source", () => {
    expect(connectorArticleSchema.safeParse({ ...ok, sources: [] }).success).toBe(false);
    expect(connectorArticleSchema.safeParse({ ...ok, sources: [{ title: "x", url: "http://example.com" }] }).success).toBe(false);
    expect(connectorArticleSchema.safeParse({ ...ok, sources: [{ title: "x", url: "javascript:alert(1)" }] }).success).toBe(false);
  });
  it("rejects bad slugs, short bodies and cannot set status", () => {
    expect(connectorArticleSchema.safeParse({ ...ok, category_slug: "Tech Stuff" }).success).toBe(false);
    expect(connectorArticleSchema.safeParse({ ...ok, content_html: "<p>short</p>" }).success).toBe(false);
    const r = connectorArticleSchema.safeParse({ ...ok, status: "published" });
    expect(r.success && "status" in r.data).toBe(false);
  });
});

import { bulkBlocker } from "@/lib/admin/bulk-rules";
describe("bulk publish rules", () => {
  const good = { content: `<p>${"word ".repeat(30)}</p>`, excerpt: "e", category_id: "c", article_type: "news", sponsor_name: null, featured_image_url: null, featured_image_alt: null, ai_generated: true, sources: [{ title: "s", url: "https://x.com" }] };
  it("passes a complete draft", () => expect(bulkBlocker(good)).toBeNull());
  it("blocks incomplete drafts", () => {
    expect(bulkBlocker({ ...good, category_id: null })).toMatch(/category/);
    expect(bulkBlocker({ ...good, excerpt: null })).toMatch(/excerpt/);
    expect(bulkBlocker({ ...good, content: "<p>hi</p>" })).toMatch(/short/);
    expect(bulkBlocker({ ...good, sources: [] })).toMatch(/source/);
    expect(bulkBlocker({ ...good, featured_image_url: "https://x/y.webp" })).toMatch(/alt/);
    expect(bulkBlocker({ ...good, article_type: "sponsored" })).toMatch(/sponsor/);
  });
});
