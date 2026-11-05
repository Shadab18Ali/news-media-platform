import { countWords, slugify, stripHtml } from "@/lib/utils";

export type CheckStatus = "good" | "warn" | "bad";
export interface SeoCheck { id: string; label: string; status: CheckStatus }

export interface SeoInput {
  title: string; seoTitle?: string; metaDescription?: string; focusKeyword?: string;
  slug: string; contentHtml: string; imageUrl?: string; imageAlt?: string;
}

/** On-page SEO guidance shown in the editor. Advisory only; it never blocks saving. */
export function runSeoChecks(i: SeoInput): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const add = (id: string, label: string, status: CheckStatus) => checks.push({ id, label, status });

  const title = (i.seoTitle || i.title).trim();
  add("title-len", `SEO title length (${title.length} chars; aim for 30–60)`, title.length >= 30 && title.length <= 60 ? "good" : title.length >= 15 && title.length <= 70 ? "warn" : "bad");

  const md = (i.metaDescription ?? "").trim();
  add("meta-len", `Meta description length (${md.length} chars; aim for 70–160)`, md.length >= 70 && md.length <= 160 ? "good" : md.length >= 40 && md.length <= 180 ? "warn" : "bad");

  const text = stripHtml(i.contentHtml);
  const words = countWords(i.contentHtml);
  add("words", `Article length (${words} words; 300+ recommended for articles)`, words >= 300 ? "good" : words >= 150 ? "warn" : "bad");
  add("h2", "Uses at least one H2 subheading", /<h2[\s>]/i.test(i.contentHtml) ? "good" : "warn");
  add("h1", "No extra H1 in the body (the headline is the H1)", /<h1[\s>]/i.test(i.contentHtml) ? "bad" : "good");
  add("internal-link", "Contains an internal link", /<a [^>]*href="\//i.test(i.contentHtml) ? "good" : "warn");
  if (i.imageUrl) add("img-alt", "Featured image has alt text", i.imageAlt?.trim() ? "good" : "bad");
  else add("img", "Has a featured image", "warn");

  const kw = (i.focusKeyword ?? "").trim().toLowerCase();
  if (!kw) {
    add("kw", "Set a focus keyword to enable keyword checks", "warn");
  } else {
    add("kw-title", "Focus keyword appears in the title", title.toLowerCase().includes(kw) ? "good" : "warn");
    add("kw-meta", "Focus keyword appears in the meta description", md.toLowerCase().includes(kw) ? "good" : "warn");
    add("kw-slug", "Focus keyword appears in the URL slug", i.slug.includes(slugify(kw)) ? "good" : "warn");
    const first = text.split(/\s+/).slice(0, 100).join(" ").toLowerCase();
    add("kw-intro", "Focus keyword appears in the first 100 words", first.includes(kw) ? "good" : "warn");
  }
  return checks;
}
