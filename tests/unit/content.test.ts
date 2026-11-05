import { describe, it, expect } from "vitest";
import { sanitizeArticleHtml, addHeadingIds, splitForMiddleAd } from "@/lib/content";

describe("sanitizeArticleHtml (XSS)", () => {
  it("removes scripts, handlers, iframes and styles", () => {
    const dirty = `<p onclick="x()">Hi<script>alert(1)</script></p><iframe src="https://evil"></iframe><img src=x onerror=alert(1)><p style="position:fixed">s</p>`;
    const out = sanitizeArticleHtml(dirty);
    expect(out).not.toMatch(/script|onclick|onerror|iframe|style=/i);
    expect(out).toContain("<p>Hi</p>");
  });
  it("blocks javascript: and data: URLs", () => {
    const out = sanitizeArticleHtml(`<a href="javascript:alert(1)">x</a><img src="data:image/svg+xml;base64,AAAA"><a href="data:text/html,hi">y</a>`);
    expect(out).not.toMatch(/javascript:|data:/i);
  });
  it("hardens external links and demotes h1", () => {
    const out = sanitizeArticleHtml(`<h1>Title</h1><a href="https://example.com">e</a><a href="/about" target="_blank">i</a>`);
    expect(out).toContain("<h2>Title</h2>");
    expect(out).toMatch(/href="https:\/\/example.com"[^>]*rel="noopener noreferrer"/);
    expect(out).not.toMatch(/href="\/about"[^>]*target/);
  });
  it("keeps tables, lists, quotes", () => {
    const out = sanitizeArticleHtml(`<table><tbody><tr><th>a</th><td colspan="2">b</td></tr></tbody></table><ul><li>x</li></ul><blockquote><p>q</p></blockquote>`);
    expect(out).toContain("<table>");
    expect(out).toContain('colspan="2"');
    expect(out).toContain("<blockquote>");
  });
});

describe("addHeadingIds", () => {
  it("adds unique ids and builds toc", () => {
    const { html, toc } = addHeadingIds("<h2>What next?</h2><p>x</p><h3>What next?</h3><h2>Café <em>menu</em></h2>");
    expect(toc.map((t) => t.id)).toEqual(["what-next", "what-next-2", "cafe-menu"]);
    expect(toc[1].level).toBe(3);
    expect(html).toContain('<h2 id="what-next">');
  });
});

describe("splitForMiddleAd", () => {
  it("returns null for short articles", () => {
    expect(splitForMiddleAd("<p>a</p><p>b</p><p>c</p>")).toBeNull();
  });
  it("splits near the middle at a paragraph boundary", () => {
    const html = Array.from({ length: 10 }, (_, i) => `<p>p${i}</p>`).join("");
    const [a, b] = splitForMiddleAd(html)!;
    expect(a + b).toBe(html);
    expect(a.endsWith("</p>")).toBe(true);
    expect((a.match(/<\/p>/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect((b.match(/<\/p>/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
