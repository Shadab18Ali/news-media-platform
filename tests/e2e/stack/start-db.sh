#!/usr/bin/env bash
# Starts a throwaway PostgreSQL 16 cluster on :54329 with the real migrations applied.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DATA="${E2E_PGDATA:-/tmp/e2e-pgdata}"
BIN=/usr/lib/postgresql/16/bin
if [ -d "$DATA" ] && su postgres -c "$BIN/pg_ctl -D $DATA status" >/dev/null 2>&1; then su postgres -c "$BIN/pg_ctl -D $DATA stop -m fast" >/dev/null; fi
rm -rf "$DATA"; mkdir -p "$DATA"; chown postgres "$DATA"
su postgres -c "$BIN/initdb -D $DATA -A trust -U postgres >/dev/null"
su postgres -c "$BIN/pg_ctl -D $DATA -o '-p 54329 -k /tmp' -l $DATA/log -w start" >/dev/null
P="psql -h 127.0.0.1 -p 54329 -U postgres -v ON_ERROR_STOP=1 -q"
$P -f "$ROOT/tests/e2e/stack/bootstrap.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do $P -f "$f"; done
$P -f "$ROOT/tests/e2e/stack/post-migrate.sql"
echo "db ready"
