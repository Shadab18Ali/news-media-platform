import sanitizeHtml from "sanitize-html";
import { slugify } from "@/lib/utils";

const ALLOWED_IMG_HOSTS_NOTE = "Images must use http(s); data: URIs are stripped.";
void ALLOWED_IMG_HOSTS_NOTE;

/**
 * Sanitise editor HTML on the server before it is stored. Only structural/typographic
 * tags survive: no scripts, iframes, inline event handlers or inline styles.
 */
export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h2", "h3", "h4", "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "code", "pre", "blockquote",
      "ul", "ol", "li", "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      th: ["colspan", "rowspan", "colwidth"],
      td: ["colspan", "rowspan", "colwidth"],
      col: ["span", "style"],
      h2: ["id"], h3: ["id"], h4: ["id"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    // only allow width on <col> from the table extension
    allowedStyles: { col: { width: [/^\d+(\.\d+)?(px|%)$/], "min-width": [/^\d+(\.\d+)?(px|%)$/] } },
    transformTags: {
      h1: "h2",
      a: (tagName, attribs) => {
        const external = /^https?:\/\//i.test(attribs.href ?? "");
        const out: Record<string, string> = { ...attribs };
        if (external) {
          out.rel = "noopener noreferrer";
          out.target = "_blank";
        } else {
          delete out.target;
        }
        return { tagName, attribs: out };
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
    },
  }).trim();
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Adds stable `id`s to h2/h3 headings (needed for anchors and the table of contents)
 * and returns the headings. Operates on already-sanitised HTML.
 */
export function addHeadingIds(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  const out = html.replace(/<(h[23])(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_m, tag: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    let id = slugify(text, 60) || "section";
    const n = used.get(id) ?? 0;
    used.set(id, n + 1);
    if (n > 0) id = `${id}-${n + 1}`;
    toc.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });
    return `<${tag.toLowerCase()} id="${id}">${inner}</${tag.toLowerCase()}>`;
  });
  return { html: out, toc };
}

/**
 * Splits article HTML into [before, after] around the paragraph where the in-content
 * ad belongs (after roughly the middle, never before paragraph 3). Returns null when the
 * article is too short for an in-content ad to be tasteful.
 */
export function splitForMiddleAd(html: string): [string, string] | null {
  const closings = [...html.matchAll(/<\/p>/gi)];
  if (closings.length < 6) return null;
  const idx = Math.max(2, Math.floor(closings.length / 2) - 1);
  const m = closings[idx];
  const cut = (m.index ?? 0) + m[0].length;
  return [html.slice(0, cut), html.slice(cut)];
}
