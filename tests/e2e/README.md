# End-to-end test stack

`run.cjs` drives a real browser (Playwright) through the production build against a **local stand-in
for Supabase**:

* a throwaway **PostgreSQL 16** cluster with the project's real migrations applied (real constraints,
  triggers and Row Level Security);
* `stack/gateway.mjs`, a small Node server that implements the subset of Supabase's REST, Auth and
  Storage HTTP APIs this app uses. It is **not** PostgREST/GoTrue — it exists only so the suite can run
  offline. Passing it does not prove compatibility with a real Supabase project; do the smoke test in
  `DEPLOYMENT_GUIDE.md` against your real project too.

```bash
./tests/e2e/stack/start-db.sh                       # needs postgresql-16 binaries and root (uses `su postgres`)
node tests/e2e/stack/gateway.mjs &                  # :54321
KEYS=$(node tests/e2e/stack/gateway.mjs --keys)     # prints ANON / SERVICE JWTs for the env below
# export NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#        NEXT_PUBLIC_SITE_URL=http://localhost:3100, CRON_SECRET=e2e-cron-secret-0123456789abcdef
./tests/e2e/restart.sh                              # build, reset DB, start app on :3100
node tests/e2e/run.cjs                              # ~120 checks; screenshots in /tmp/e2e-out
A11Y_BASE=http://localhost:3100 A11Y_EMAIL=admin@example.test A11Y_PASSWORD='Passw0rd!test' npm run a11y
```
Test accounts (created by `post-migrate.sql`): admin@, editor@, writer@, reader@ `example.test`, password `Passw0rd!test`.
