import type { ArticleStatus, Role } from "@/config/site";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  image_alt: string | null;
  sort_order: number;
  show_in_nav: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: string;
  profile_id: string | null;
  name: string;
  slug: string;
  job_title: string | null;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
  social: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface MediaItem {
  id: string;
  storage_path: string;
  url: string;
  og_url: string | null;
  filename: string;
  alt_text: string | null;
  caption: string | null;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface SourceRef {
  title: string;
  url: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  article_type: "article" | "news" | "sponsored" | "affiliate";
  status: ArticleStatus;
  published_at: string | null;
  scheduled_for: string | null;
  category_id: string | null;
  author_id: string | null;
  created_by: string | null;
  language: string;
  featured_image_id: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  featured_image_caption: string | null;
  og_image_url: string | null;
  seo_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  noindex: boolean;
  is_featured: boolean;
  is_breaking: boolean;
  is_trending: boolean;
  reading_time_minutes: number;
  view_count: number;
  sponsor_name: string | null;
  has_affiliate_links: boolean;
  editorial_notes: string | null;
  sources: SourceRef[];
  ai_generated: boolean;
  fact_checked: boolean;
  human_reviewed_by: string | null;
  human_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Article joined with category/author (and tags when requested). */
export interface ArticleWithRelations extends Article {
  category: Pick<Category, "id" | "name" | "slug"> | null;
  author: Pick<Author, "id" | "name" | "slug" | "avatar_url" | "job_title" | "bio"> | null;
  tags?: Tag[];
}

/** Light shape used by cards and lists. */
export interface ArticleCardData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  published_at: string | null;
  updated_at: string;
  article_type: Article["article_type"];
  reading_time_minutes: number;
  is_breaking: boolean;
  view_count: number;
  category: { name: string; slug: string } | null;
  author: { name: string; slug: string } | null;
}

export interface Advertisement {
  id: string;
  name: string;
  placement: string;
  ad_type: "adsense" | "custom_html" | "image";
  adsense_slot: string | null;
  custom_html: string | null;
  image_url: string | null;
  link_url: string | null;
  image_alt: string | null;
  sponsor_name: string | null;
  is_active: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
}
