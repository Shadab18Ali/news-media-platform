# Deployment guide

## 1. GitHub
The code lives in this repository. Never commit `.env*` files (git-ignored). CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, DB tests and a build on every push.

## 2. Supabase
Complete `DATABASE_SETUP.md` first (project, migrations, first admin).

## 3. Vercel
1. <https://vercel.com> → **Add New → Project** → import this GitHub repository. Framework preset: Next.js (auto-detected).
2. **Environment Variables** (Production and Preview): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (see `ENVIRONMENT_VARIABLES.md`).
3. Deploy. Region: choose one near your Supabase region for lower latency.

## 4. Custom domain
Vercel → Project → **Settings → Domains → Add** your domain and follow the DNS instructions (an `A` record to Vercel for the apex and/or a `CNAME` for `www`). Set `NEXT_PUBLIC_SITE_URL` to the final `https://…` URL and **redeploy** (it is baked into canonical URLs and sitemaps). Pick one canonical host (www or apex) and let Vercel redirect the other.

## 5. Scheduled publishing
`vercel.json` registers `/api/cron/publish-scheduled` **once daily** (compatible with Vercel Hobby). For minute-level accuracy choose one:
* **Vercel Pro**: change the schedule in `vercel.json` to `*/5 * * * *`.
* **GitHub Actions (free)**: add repository secrets `SITE_URL` and `CRON_SECRET`, add the repository variable `ENABLE_SCHEDULER=true`; `.github/workflows/scheduled-publish.yml` then calls the endpoint every 5 minutes (GitHub may delay runs by a few minutes).
* Any external pinger can call `GET /api/cron/publish-scheduled` with header `Authorization: Bearer <CRON_SECRET>`.

Manual test: `curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/publish-scheduled` → `{"ok":true,"published":N}`; or use **Run scheduler now** in `/admin/logs`. The publisher is idempotent.

## 6. Google integrations
* **Search Console**: add your domain/property → choose *HTML tag* verification → copy only the `content="…"` token into **/admin/settings → SEO & verification** → click Verify. Then submit `https://yourdomain.com/sitemap.xml` (and `news-sitemap.xml` if you publish news).
* **GA4**: create a property + web data stream, paste the `G-…` ID into **/admin/settings → Google integrations**. It loads only after a visitor accepts analytics cookies.
* **Tag Manager**: optional; paste the `GTM-…` ID (do not also add GA4 separately).
* **AdSense**: see `MONETISATION_GUIDE.md`.

## 7. Go-live checklist
- [ ] Migrations applied; first admin created; public sign-up disabled in Supabase
- [ ] Env vars set in Vercel; `NEXT_PUBLIC_SITE_URL` is the real domain
- [ ] `/admin/settings`: brand, logo, favicon, publisher details (legal name, contact email, address) filled in
- [ ] Authors created with real bios; policy pages reviewed (have them checked by a legal adviser)
- [ ] At least a dozen original articles published before applying for AdSense
- [ ] Search Console verified and sitemap submitted
- [ ] Scheduler configured and tested
- [ ] Smoke test on production: sign in, create + publish a draft, upload an image, view the article, check `/sitemap.xml`, `/robots.txt`, subscribe to the newsletter, send a contact message

## Troubleshooting
* **Images do not display**: confirm `NEXT_PUBLIC_SUPABASE_URL` is set at *build* time and the `media` bucket is public.
* **A new article still 404s**: publishing revalidates the site; if you edited the database directly, wait up to 5 minutes (ISR) or republish from the admin.
* **Newsletter/contact says "not available"**: set `SUPABASE_SERVICE_ROLE_KEY`.
