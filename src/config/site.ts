/**
 * Static, non-brand configuration. Everything brand-related (name, logo, colours,
 * publisher details) lives in the `site_settings` table and is edited from
 * /admin/settings; the values below are only first-run fallbacks.
 */
export const SITE_CONFIG = {
  /** Editorial timezone used for scheduling and displayed dates. */
  timezone: "Asia/Kolkata",
  defaultLocale: "en",
  /** Add locales here when launching more languages; see PROJECT_ARCHITECTURE.md. */
  locales: ["en"] as readonly string[],
  articlesPerPage: 12,
  revalidateSeconds: 300,
  /** Words per minute used for reading-time estimates. */
  wordsPerMinute: 220,
} as const;

export const AD_PLACEMENTS = [
  { id: "header", label: "Header (below navigation)", size: "Leaderboard 728×90 / responsive", minHeight: 90 },
  { id: "homepage", label: "Homepage (between sections)", size: "Responsive banner", minHeight: 120 },
  { id: "homepage_feed", label: "Homepage article feed (in-feed)", size: "In-feed / fluid", minHeight: 120 },
  { id: "article_top", label: "Article top (below headline)", size: "Responsive banner", minHeight: 120 },
  { id: "article_middle", label: "Article middle (in content)", size: "Responsive rectangle", minHeight: 250 },
  { id: "article_bottom", label: "Article bottom", size: "Responsive rectangle", minHeight: 250 },
  { id: "sidebar", label: "Sidebar", size: "300×250 / 300×600", minHeight: 250 },
  { id: "footer", label: "Footer", size: "Responsive banner", minHeight: 90 },
] as const;

export type AdPlacementId = (typeof AD_PLACEMENTS)[number]["id"];

export const ARTICLE_TYPES = [
  { value: "article", label: "Article" },
  { value: "news", label: "News report" },
  { value: "sponsored", label: "Sponsored content" },
  { value: "affiliate", label: "Affiliate / review" },
] as const;

export const ARTICLE_STATUSES = ["draft", "in_review", "scheduled", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ROLES = ["reader", "writer", "editor", "admin"] as const;
export type Role = (typeof ROLES)[number];
