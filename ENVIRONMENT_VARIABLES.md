# Environment variables

Copy `.env.example` to `.env.local` for local work; set the same names in Vercel (Project → Settings → Environment Variables). **Never commit real values.** `.env*` files are git-ignored.

| Variable | Required | Exposed to browser | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | Yes | Canonical origin, no trailing slash (e.g. `https://yourdomain.com`). Used for canonical URLs, sitemaps, schema.org and social cards. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project URL (Project Settings → API). Also whitelisted for `next/image`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Public anon key. Safe to expose: Row Level Security limits it to published content. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for newsletter, contact form, cron) | **No** | Bypasses RLS. Server only; `src/lib/supabase/admin.ts` imports `server-only` so builds fail if it leaks to client code. Never prefix with `NEXT_PUBLIC_`. |
| `CRON_SECRET` | Yes (for scheduled publishing) | No | Random string ≥ 16 chars (`openssl rand -hex 32`). `/api/cron/*` rejects requests without `Authorization: Bearer <secret>`. Vercel Cron sends it automatically. |
| `AI_PROVIDER` | No | No | `none` (default), `openai-compatible` or `anthropic`. |
| `AI_API_KEY` | No | No | Key for the chosen drafting provider. |
| `AI_MODEL` | No | No | Model name for the provider. |
| `AI_BASE_URL` | No | No | OpenAI-compatible base URL (e.g. `https://api.openai.com/v1`). |

Not environment variables (configured in **/admin/settings**, because they are public identifiers): site name/logo/colours, publisher details, Google Search Console token, GA4 measurement ID, GTM container ID, AdSense publisher ID, ad slot IDs, ads.txt.

Behaviour when missing: no Supabase variables → site builds and shows a setup notice; no service-role key → newsletter/contact forms and the scheduler report "not available"; no `CRON_SECRET` → cron endpoint returns 503; no AI variables → drafting assistant disabled (everything else unaffected).
