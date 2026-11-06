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
