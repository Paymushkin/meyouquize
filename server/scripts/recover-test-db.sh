#!/usr/bin/env bash
# Сбрасывает зависшие integration-тесты и соединения с meyouquize_test.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONTAINER="${MEYOUQUIZE_PG_CONTAINER:-meyouquize-postgres}"

echo "Stopping hung vitest integration runners..."
pkill -f "vitest run --project integration" 2>/dev/null || true
pkill -f "dotenv -e ../.env.test -- vitest run --project integration" 2>/dev/null || true
sleep 1

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found — skip terminating Postgres backends" >&2
  exit 0
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container $CONTAINER is not running. Start Postgres first:" >&2
  echo "  docker compose up -d postgres" >&2
  exit 1
fi

echo "Ensuring database meyouquize_test exists..."
docker exec "$CONTAINER" psql -U postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = 'meyouquize_test'" | grep -q 1 \
  || docker exec "$CONTAINER" psql -U postgres -c "CREATE DATABASE meyouquize_test;"

echo "Terminating open connections to meyouquize_test..."
docker exec "$CONTAINER" psql -U postgres -d meyouquize_test -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'meyouquize_test' AND pid <> pg_backend_pid();"

LOCKS="$(docker exec "$CONTAINER" psql -U postgres -d meyouquize_test -tAc \
  "SELECT count(*) FROM pg_locks l JOIN pg_stat_activity a ON l.pid = a.pid WHERE a.datname = 'meyouquize_test' AND l.locktype = 'advisory';")"
echo "Advisory locks on meyouquize_test: ${LOCKS:-0}"
echo "Done. Run: cd $ROOT && npm run test:integration"
