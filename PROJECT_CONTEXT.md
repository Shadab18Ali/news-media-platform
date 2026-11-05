# Project Context

A configurable, production-oriented **news & blogging platform**: Next.js (App Router, TypeScript, Tailwind CSS v4) + Supabase (Postgres, Auth, Storage), deployed on Vercel.

## Goals
- Professional editorial public site (home, categories, articles, authors, search, policy pages).
- Full admin dashboard (`/admin`) for articles, categories, authors, media, ads, settings, editorial calendar.
- SEO-first: metadata, sitemap, news sitemap, robots, JSON-LD, canonical URLs, redirects.
- Monetisation-ready (AdSense, affiliate, sponsored, direct ads) but **everything off until configured**.
- Daily publishing operation: drafts, review, scheduled publishing via cron, editorial notes.
- Future AI-assisted drafting behind a swappable provider interface; **never auto-publishes**.

## Non-negotiable rules
1. Brand (name, logo, colours, publisher details) is data in `site_settings`, never hardcoded.
2. No sample/fake articles, ads, earnings or tracking IDs in code or seeds.
3. No secrets in the repo. `.env*` is git-ignored; `.env.example` has placeholders only.
4. The service-role key is server-only (`src/lib/supabase/admin.ts` imports `server-only`).
5. Public visitors can only read published content (RLS). Staff roles: `writer`, `editor`, `admin`. No public admin registration.
6. Machine-assisted drafts cannot be published/scheduled without human review + fact-check (DB constraint).

## Key decisions
- `proxy.ts` (Next 16 "middleware") refreshes the Supabase session and gates `/admin/*`; every admin page/action re-checks the role server-side, and RLS enforces it again in the database.
- Public pages use a cookie-less anon Supabase client so they can be ISR-cached (`revalidate = 300`); admin mutations call `revalidatePath`.
- Article HTML is sanitised server-side (`sanitize-html`) before storage.
- Scheduled publishing = SQL function `publish_due_articles()` (atomic, `SKIP LOCKED`, logged) called by `/api/cron/publish-scheduled`.
- Default editorial timezone `Asia/Kolkata`.

See `PROJECT_ARCHITECTURE.md` for the full picture and `PROJECT_STATUS.md` for progress.
