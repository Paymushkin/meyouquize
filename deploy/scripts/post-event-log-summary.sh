#!/usr/bin/env bash
# Сводка логов после ивента: joins, ping timeout, answer_submit_error и т.д.
#
# Локально (journal на VPS):
#   ./deploy/scripts/post-event-log-summary.sh \
#     --since "2026-06-30 03:00:00" --until "2026-06-30 10:00:00"
#
# Через SSH:
#   ./deploy/scripts/post-event-log-summary.sh \
#     --ssh root@135.106.147.38 \
#     --since "2026-06-30 03:00:00" --until "2026-06-30 10:00:00"
#
# Из файла:
#   journalctl -u meyouquize --since today | ./deploy/scripts/post-event-log-summary.sh --stdin
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UNIT="${JOURNAL_UNIT:-meyouquize}"
SINCE=""
UNTIL=""
SSH_TARGET=""
MODE="journal"

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --since)
      SINCE="${2:?}"
      shift 2
      ;;
    --until)
      UNTIL="${2:?}"
      shift 2
      ;;
    --ssh)
      SSH_TARGET="${2:?}"
      shift 2
      ;;
    --unit)
      UNIT="${2:?}"
      shift 2
      ;;
    --stdin)
      MODE="stdin"
      shift
      ;;
    -h | --help)
      usage 0
      ;;
    *)
      echo "Неизвестный аргумент: $1" >&2
      usage 1
      ;;
  esac
done

if [[ "${MODE}" == "journal" && -z "${SINCE}" ]]; then
  echo "Укажите --since (и опционально --until) или --stdin" >&2
  usage 1
fi

fetch_logs() {
  local journal_cmd=(journalctl -u "${UNIT}" --no-pager)
  if [[ -n "${SINCE}" ]]; then
    journal_cmd+=(--since "${SINCE}")
  fi
  if [[ -n "${UNTIL}" ]]; then
    journal_cmd+=(--until "${UNTIL}")
  fi
  if [[ -n "${SSH_TARGET}" ]]; then
    ssh -o ConnectTimeout=20 "${SSH_TARGET}" "${journal_cmd[*]}"
  else
    "${journal_cmd[@]}"
  fi
}

if [[ "${MODE}" == "stdin" ]]; then
  node "${ROOT}/deploy/scripts/post-event-log-summary.mjs"
else
  fetch_logs | node "${ROOT}/deploy/scripts/post-event-log-summary.mjs"
fi
