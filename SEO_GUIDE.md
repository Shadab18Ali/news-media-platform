# SEO guide

## What is built in
* **Per-article**: SEO title, meta description, focus keyword (with an editor checklist), slug, canonical URL, noindex, Open Graph/Twitter metadata (social image falls back to featured image, then site default), image alt text and captions, heading hierarchy (single H1; body H1s are demoted to H2; headings get anchor IDs + table of contents), reading time, related and previous/next links.
* **Structured data**: `NewsArticle` (type "news") / `Article`, `NewsMediaOrganization` (with publishing-principles and corrections-policy URLs), `WebSite` + SearchAction, `BreadcrumbList`, `Person` for authors.
* **Crawling**: dynamic `/sitemap.xml`, Google News `/news-sitemap.xml` (news articles from the last 2 days), `/robots.txt` (blocks `/admin`, `/api`, `/search`), `/feed.xml`, `/ads.txt`.
* **Indexing hygiene**: drafts never public; search results and thin tag archives (<3 stories) are `noindex`; admin is `noindex` + `X-Robots-Tag`; custom 404; automatic 301 when a live slug changes; manual redirects; path-based category pagination (`/category/x/page/2`) with self-canonicals and crawlable links.
* **Performance (Core Web Vitals)**: server-rendered ISR pages (5-minute revalidation, purged on publish), `next/image` with AVIF/WebP and responsive `sizes`, fixed aspect ratios and reserved ad heights (CLS), priority/eager loading for the lead image (LCP), self-hosted variable fonts, minimal client JS (only forms, menu, consent, editor in admin), tracking scripts deferred until consent.

## Search Console steps
1. Add property → verify via HTML tag → paste token in **/admin/settings**.
2. Submit `sitemap.xml` (and `news-sitemap.xml`).
3. Use URL Inspection on a few articles; check *Page indexing*, *Enhancements* (structured data) and Core Web Vitals after traffic accrues.

## Google News readiness (no guarantee of approval)
The platform provides what Google's publisher policies ask for: transparent publisher details (About, Contact, address/legal name from settings), named authors with bios, dated articles, editorial and corrections policies, clear sponsored labelling, NewsArticle markup and a news sitemap. Approval depends on Google's review of your content quality, originality and consistency — publish original reporting regularly and keep the policy pages accurate.

## Good habits
Write descriptive headlines (≤ 60 chars), unique meta descriptions (70–160), use the focus-keyword checklist as guidance (not a target), link internally, keep image alt text meaningful, update rather than duplicate stories, and avoid thin or copied content. Rankings cannot be promised.
