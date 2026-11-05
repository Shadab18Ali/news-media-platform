# News & Blogging Platform

A configurable digital newsroom: a fast, SEO-first public site plus a full admin dashboard, built with
**Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Vercel**.

* Public site: homepage, categories, articles (news/general/sponsored/affiliate), authors, tags, search, policy pages, RSS, sitemaps.
* Admin (`/admin`): articles with Tiptap editor, categories, authors, media library (auto-optimised), advertising, redirects, editorial calendar, scheduled publishing, logs, subscribers, site settings.
* SEO: metadata, canonical URLs, Open Graph/Twitter, JSON-LD (NewsArticle/Article/Organization/WebSite/Breadcrumb/Person), `sitemap.xml`, Google News sitemap, `robots.txt`, `ads.txt`, redirects, noindex rules.
* Monetisation ready (AdSense, direct ads, affiliate and sponsored labelling) — **all off until you configure it**.
* Security: Supabase Auth, role-based access (`writer`/`editor`/`admin`), Row Level Security, server-side validation, HTML sanitising, upload checks, rate limiting, secured cron endpoint.
* Brand name, logo, colours and publisher details are **data** edited in `/admin/settings`, never hardcoded.

## Quick start
```bash
npm install
cp .env.example .env.local     # fill in values from your Supabase project (see DATABASE_SETUP.md)
npm run dev                    # http://localhost:3000
```
Without Supabase variables the site still builds and shows a "not connected" notice.

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Develop / production build / serve |
| `npm run typecheck` · `npm run lint` | TypeScript and ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Applies the real migrations to Postgres (PGlite) and tests RLS + scheduler |
| `npm run a11y` | axe-core accessibility audit (needs a running site) |
| `npm run check` | typecheck + lint + unit tests |

## Documentation
| File | Contents |
|---|---|
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Goals, rules, key decisions |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Progress, test results, exact next steps |
| [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) | How it is built |
| [DATABASE_SETUP.md](DATABASE_SETUP.md) | Create/connect Supabase, migrations, first admin |
| [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) | Every variable explained |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | GitHub, Vercel, domain, cron, go-live checklist |
| [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | Using the dashboard |
| [CONTENT_PUBLISHING_GUIDE.md](CONTENT_PUBLISHING_GUIDE.md) | Daily workflow, editorial rules, drafting assistant |
| [SEO_GUIDE.md](SEO_GUIDE.md) | SEO features, Search Console, Google News readiness |
| [MONETISATION_GUIDE.md](MONETISATION_GUIDE.md) | AdSense, affiliate, sponsored, direct ads |
