#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f deploy/env/.env.runtime ]]; then
  echo "❌ Нет deploy/env/.env.runtime — выполните: npm run event:init" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source deploy/env/.env.runtime
set +a

fail=0

redis_ping() {
  if command -v redis-cli >/dev/null 2>&1; then
    redis-cli -u "${REDIS_URL:-redis://127.0.0.1:6379}" ping 2>/dev/null | grep -q PONG
    return $?
  fi
  if command -v docker >/dev/null 2>&1; then
    docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG
    return $?
  fi
  return 1
}

if [[ "${CLUSTER_WORKERS:-1}" != "1" ]]; then
  if redis_ping; then
    echo "✓ Redis (${REDIS_URL:-redis://127.0.0.1:6379})"
  else
    echo "❌ Redis недоступен — нужен для CLUSTER_WORKERS=${CLUSTER_WORKERS}" >&2
    echo "   brew install redis && brew services start redis" >&2
    echo "   или: docker compose up -d redis" >&2
    fail=1
  fi
else
  echo "○ CLUSTER_WORKERS=1 (Redis не обязателен)"
fi

postgres_ok() {
  if command -v pg_isready >/dev/null 2>&1 && pg_isready -h 127.0.0.1 -p 5432 -q 2>/dev/null; then
    return 0
  fi
  if (echo >/dev/tcp/127.0.0.1/5432) 2>/dev/null; then
    return 0
  fi
  if command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 5432 2>/dev/null; then
    return 0
  fi
  if command -v docker >/dev/null 2>&1; then
    if docker compose ps postgres --status running -q 2>/dev/null | grep -q .; then
      return 0
    fi
    if docker compose ps postgres 2>/dev/null | grep -qE '\bUp\b'; then
      return 0
    fi
    if docker exec meyouquize-postgres pg_isready -U postgres -q 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

if postgres_ok; then
  echo "✓ PostgreSQL :5432"
else
  echo "❌ PostgreSQL не отвечает на 127.0.0.1:5432" >&2
  echo "   docker compose up -d postgres" >&2
  fail=1
fi

if command -v caddy >/dev/null 2>&1; then
  echo "✓ Caddy $(caddy version 2>/dev/null | head -1 || true)"
else
  echo "⚠ Caddy не найден — event:start попробует vite preview; для мероприятия: brew install caddy" >&2
fi

echo ""
echo "  CLIENT_ORIGIN=${CLIENT_ORIGIN:-?}"
echo "  CLUSTER_WORKERS=${CLUSTER_WORKERS:-1}"
echo "  DATABASE_URL (без пароля): ${DATABASE_URL%%@*}@…"

exit "$fail"
