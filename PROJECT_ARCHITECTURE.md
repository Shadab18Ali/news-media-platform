# Architecture

```
src/
  app/
    layout.tsx            root: fonts, brand CSS variables (from settings), metadata
    (site)/               PUBLIC site (own layout: header, footer, consent, Google tags, site schema)
      page.tsx, category/, news/, author/, authors/, tag/, search/, policy pages, [...slug] (redirects → 404)
      actions.ts          newsletter, contact form, view counter (server actions)
    admin/                login + (panel)/ dashboard & management pages, _actions/ (server actions)
    api/admin/media       image upload (sharp) & library list      api/cron/publish-scheduled  scheduler
    sitemap.ts robots.ts ads.txt/ feed.xml/ news-sitemap.xml/
  proxy.ts                (Next 16 middleware) refreshes Supabase session, gates /admin/*
  components/{site,ui,admin}/
  lib/
    supabase/             public (cookie-less anon), server (session), admin (service role, server-only), proxy
    data/                 settings, queries (public reads), home composition, ads context
    admin/                auth guards (requireStaff), article form schema/parsers, SEO checks, queries
    seo/                  metadata builder, JSON-LD builders       content.ts  sanitiser, TOC, mid-ad split
    ads.ts consent.ts media.ts utils.ts settings-schema.ts security/ ai/
  config/site.ts          non-brand constants (timezone, placements, roles)
supabase/migrations/      schema, RLS, storage, seed
tests/                    unit (Vitest), db (PGlite), e2e (Playwright + local stack)
```

## Request flow & caching
Public pages call `createPublicClient()` (anon key, no cookies) so they are statically renderable and ISR-cached (`revalidate = 300`). Admin mutations call `revalidatePath("/", "layout")`, so changes appear immediately. Article/category routes use `generateStaticParams() → []` (rendered on first hit, then cached). Queries use exact timestamps; RLS enforces "published and in the past" regardless.

## Security layers
1. `proxy.ts` redirects unauthenticated users away from `/admin` (validates the JWT with `auth.getUser()`).
2. Every admin page/action calls `requireStaff(minRole)` (role read from `profiles`).
3. Writes use the user's own session client, so **RLS enforces permissions again in Postgres**.
4. Service-role key only in `lib/supabase/admin.ts` (`server-only`) for: cron, newsletter, contact.
5. Zod validation on all inputs; HTML sanitised on save (`sanitize-html` allow-list); uploads verified by magic bytes, re-encoded by sharp; rate limits (in-memory, per instance) on login, forms, uploads; honeypots on public forms; security headers; constant-time cron secret check; CSV export neutralises formula injection.

## Branding
`site_settings` rows (`brand`, `publisher`, `seo`, `integrations`, `ads`, `features`) are merged over defaults in `settings-schema.ts` and validated; invalid stored data falls back to defaults. CSS variables `--brand`/`--accent` are set on `<html>`.

## Scheduled publishing
`publish_due_articles()` (SQL, security definer, service-role only) locks due rows with `FOR UPDATE SKIP LOCKED`, flips them to `published`, sets `published_at = scheduled_for`, and writes `publish_logs` — atomically, so concurrent runs cannot double-publish. The cron route authenticates, calls it, revalidates, and logs failures.

## Consent & Google tags
`ConsentBanner`/`ThirdPartyScripts` render only on the public site. GA4/GTM/AdSense IDs must match strict formats; nothing loads before the visitor consents to the relevant category.

## Multi-language (future)
`articles.language` and `translation_group` exist; `SITE_CONFIG.locales` lists locales. To launch a language: add a `[locale]` route segment (or domain), filter queries by `language`, translate UI strings, and emit `hreflang` alternates using `translation_group`.

## Drafting provider
`lib/ai/types.ts` defines `AiProvider`; adapters are registered in `lib/ai/provider.ts`. Output is always a flagged draft.
