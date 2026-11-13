#!/usr/bin/env bash
# Откат эксперимента networking + projector timeline по Redis (и опционально Postgres).
# Не делает FLUSHALL — только префиксы mq:timeline:* и mq:networking:*.
#
# Usage:
#   REDIS_URL=redis://127.0.0.1:6379 bash deploy/scripts/rollback-experiment-networking-timeline.sh
#   STRIP_PUBLIC_VIEW=1 DATABASE_URL=... bash deploy/scripts/rollback-experiment-networking-timeline.sh
set -euo pipefail

REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"

if ! command -v redis-cli >/dev/null 2>&1; then
  echo "redis-cli not found" >&2
  exit 1
fi

delete_prefix() {
  local prefix="$1"
  local count=0
  # redis-cli --scan may need -u for URL
  while IFS= read -r key; do
    [[ -z "$key" ]] && continue
    redis-cli -u "$REDIS_URL" DEL "$key" >/dev/null
    count=$((count + 1))
  done < <(redis-cli -u "$REDIS_URL" --scan --pattern "${prefix}*")
  echo "Deleted ${count} keys matching ${prefix}*"
}

echo "Redis: $REDIS_URL"
delete_prefix "mq:timeline:"
delete_prefix "mq:networking:"

if [[ "${STRIP_PUBLIC_VIEW:-0}" == "1" ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "STRIP_PUBLIC_VIEW=1 requires DATABASE_URL" >&2
    exit 1
  fi
  echo "Stripping projectorTimeline from Quiz.publicView ..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
    "UPDATE \"Quiz\" SET \"publicView\" = \"publicView\" - 'projectorTimeline' WHERE \"publicView\" ? 'projectorTimeline';"
fi

if [[ "${DROP_NETWORKING_TABLES:-0}" == "1" ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "DROP_NETWORKING_TABLES=1 requires DATABASE_URL" >&2
    exit 1
  fi
  echo "Dropping networking tables (if present) ..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP TABLE IF EXISTS "NetworkingMessage";
DROP TABLE IF EXISTS "NetworkingThread";
DROP TABLE IF EXISTS "ParticipantProfile";
SQL
  echo "Stripping networkingEnabled from Quiz.publicView ..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
    "UPDATE \"Quiz\" SET \"publicView\" = \"publicView\" - 'networkingEnabled' WHERE \"publicView\" ? 'networkingEnabled';"
fi

echo "Done. Redeploy develop (or code without the experiment) separately."
