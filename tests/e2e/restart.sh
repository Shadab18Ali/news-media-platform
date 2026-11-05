#!/usr/bin/env bash
# Rebuild + restart the app and reset the DB for a clean e2e run. Usage: source /tmp/e2e.env first (see README).
set -e
cd "$(dirname "$0")/../.."
pkill -f "next-server" 2>/dev/null || true; pkill -f "next start" 2>/dev/null || true; sleep 1
pkill -f "stack/gateway.mjs" 2>/dev/null || true
./tests/e2e/stack/start-db.sh >/dev/null
(nohup node tests/e2e/stack/gateway.mjs > /tmp/gateway.log 2>&1 &)
export E2E_ALLOW_LOCAL_IMAGES=1
rm -rf /tmp/e2e-storage
npx next build >/tmp/next-build.log 2>&1 || { tail -30 /tmp/next-build.log; exit 1; }
(nohup npx next start -p 3100 > /tmp/next.log 2>&1 &)
sleep 3
