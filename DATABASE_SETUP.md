# Database setup (Supabase)

No credentials are included in this repository. You create your own free Supabase project.

## 1. Create the project
1. Sign in at <https://supabase.com> → **New project**. Pick a region close to your readers (e.g. Mumbai `ap-south-1`) and a strong database password (store it in a password manager).
2. When it is ready open **Project Settings → API** and copy: **Project URL**, **anon public key**, **service_role key** (keep this one secret).

## 2. Run the migrations
Open **SQL Editor → New query** and run each of the **five** files from `supabase/migrations/`, **in order**:

1. `20260101000001_schema.sql` — tables, constraints, indexes, triggers, scheduler function
2. `20260101000002_rls.sql` — Row Level Security policies
3. `20260101000003_storage.sql` — public `media` bucket + upload policies
4. `20260101000004_seed.sql` — ten starter categories (no articles)
5. `20260101000005_api_privileges.sql` — lets the website's Data API reach the tables (required on newer Supabase projects, which do not grant table access automatically; Row Level Security still controls which rows are visible)

(Or with the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.)

## 3. Lock down sign-ups (important)
**Authentication → Providers → Email**: turn **off** "Allow new users to sign up" (or at least keep it off in production). Staff accounts are created by you in the dashboard; the public site has no sign-up form. Even if someone did register, new users get role `reader`, which has no dashboard access.

## 4. Create the first administrator
1. **Authentication → Users → Add user → Create new user**: enter your email and password, tick **Auto Confirm User**.
2. In **SQL Editor** run (replace the email):
   ```sql
   update public.profiles set role = 'admin' where email = 'you@yourdomain.com';
   ```
3. Visit `/admin/login` and sign in. More staff: repeat step 1, then set role `editor` or `writer`.

| Role | Can do |
|---|---|
| `writer` | Create/edit **own** drafts, submit for review, upload images |
| `editor` | All articles (publish, schedule, unpublish, delete), categories, authors, media, redirects, subscribers, drafting assistant |
| `admin` | Everything, plus site settings, advertising, message deletion |

## 5. Connect the app
Put the three Supabase values in `.env.local` (local) and in Vercel (production) — see `ENVIRONMENT_VARIABLES.md`. Optionally set **Authentication → URL Configuration → Site URL** to your production URL.

## Schema overview
`profiles`, `articles` (+`article_tags`, `article_revisions`), `categories`, `tags`, `authors`, `media`, `advertisements`, `newsletter_subscribers`, `site_settings`, plus `redirects`, `publish_logs`, `activity_log`, `contact_messages`.
Key rules enforced **in the database**: published articles need a date; scheduled articles need a time; sponsored articles need a sponsor; machine-assisted drafts cannot be published/scheduled without human review and fact-check; public visitors can only read published content whose date has passed; subscribers/messages are not readable by the public at all; `publish_due_articles()` is executable only by the service role.

## Verifying
`npm run test:db` applies all migrations to an in-memory Postgres and tests the RLS rules and the scheduler function.

## Troubleshooting
* **Sign-in says "This account does not have dashboard access" although the role is `admin`**, or the site shows no data: migration 5 (API privileges) has not been run. Run it, then try again.
