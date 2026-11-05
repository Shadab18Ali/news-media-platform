# Project Status

## Summary
All planned phases are implemented in this repository. The application builds, type-checks, lints cleanly and passes its automated tests. **It has not been connected to a real Supabase project or deployed to Vercel** — those need your credentials/accounts (steps below). Nothing external is marked as configured.

## Phases
- [x] Repository inspected (was empty) · scaffold: Next.js 16, TypeScript, Tailwind 4, ESLint, Vitest
- [x] Database: schema, constraints, indexes, RLS, storage bucket, starter categories (`supabase/migrations`)
- [x] Public site: home, categories (path pagination), articles, authors, tags, search, About/Contact/Privacy/Terms/Disclaimer/Editorial/Corrections/Advertise, 404, redirects
- [x] SEO: metadata, canonical, OG/Twitter, JSON-LD, sitemap, Google News sitemap, robots, ads.txt, RSS, noindex rules
- [x] Admin: auth + roles, dashboard, article editor (Tiptap), categories, authors, media pipeline, advertising, redirects, calendar, logs, subscribers/inbox, settings
- [x] Scheduled publishing (SQL function + secured cron route + manual run + GitHub Actions option)
- [x] Consent banner; GA4/GTM/AdSense loaders gated by ID format and consent
- [x] Drafting-provider interface (optional, draft-only, human-approval gate enforced in the DB)
- [x] Documentation set

## Verification performed (what was actually run)
| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint` | pass |
| `npm test` (unit: slugs, timezones, sanitiser/XSS, rate limit, cron auth, upload sniffing, JSON-LD, SEO checks, ads logic, settings, home composition, parsers, provider) | pass |
| `npm run test:db` (real migrations on Postgres/PGlite: RLS for anon/reader/writer/admin, constraints, atomic scheduler, FTS) | 9/9 pass |
| `npm run build` | pass |
| Browser E2E (`tests/e2e/run.cjs`, ~117 checks: login/roles, editor, publish/schedule/cron, uploads, SEO tags/schema, sitemaps, ads gating, consent, forms, mobile overflow) | pass against a **local stand-in backend** (real Postgres 16 + a Supabase-API-compatible test gateway) |
| axe-core accessibility audit (`npm run a11y`) of public and admin pages | no serious/critical violations |

**Not verified:** a real Supabase project (Auth, Storage, PostgREST specifics), Vercel deployment/cron, Google services, AdSense, Lighthouse scores on a deployed URL, real email delivery (none is built: newsletter addresses are stored for export).

## Bugs found and fixed by testing
Freshly published articles briefly 404'd (query time truncated to the minute, cached by ISR) · cookie banner/tags leaked into `/admin` · duplicate `id` in the TOC · low-contrast admin text and mismatched accessible names · article paragraphs lacked spacing · writers saw others' published articles in their list · toolbar buttons stole editor focus.

## Next steps for you
1. Create the Supabase project and run migrations; create the first admin — `DATABASE_SETUP.md`.
2. Set env vars locally (`.env.local`) and on Vercel; deploy — `DEPLOYMENT_GUIDE.md`.
3. Fill in `/admin/settings` (brand, logo, publisher details); create authors; publish real, original articles.
4. Run the production smoke test in `DEPLOYMENT_GUIDE.md` against the real project, then Lighthouse on the live URL.
5. Search Console verification + sitemap; GA4 ID; apply for AdSense when eligible (`MONETISATION_GUIDE.md`).
6. Have a legal adviser review the template policy pages.

## Known limitations / ideas
* In-memory rate limiting is per serverless instance — add Vercel WAF rules for hard limits.
* No email sending (newsletter list is exported as CSV); no unsubscribe page yet (token column exists).
* Editor image upload goes through the library modal; no drag-and-drop paste upload yet.
* Multi-language: data model ready (`language`, `translation_group`), routing not built.
* Topic discovery / research automation is intentionally manual; see `CONTENT_PUBLISHING_GUIDE.md`.
