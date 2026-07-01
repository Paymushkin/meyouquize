#!/usr/bin/env bash
# Проверка journal за последние N минут. Exit 1 при превышении порогов — для cron/timer/мониторинга.
#
# Переменные:
#   JOURNAL_UNIT=meyouquize
#   ALERT_WINDOW_MIN=5          — окно journalctl
#   ALERT_PING_TIMEOUT_MAX=15   — макс. ping timeout disconnect за окно
#   ALERT_UNHANDLED_MAX=0       — макс. unhandledRejection (0 = любой — алерт)
#   ALERT_RESTART_MAX=0         — макс. systemd Started за окно (0 = любой рестарт — алерт)
#   ALERT_WEBHOOK_URL=          — опционально POST JSON при алерте
set -euo pipefail

UNIT="${JOURNAL_UNIT:-meyouquize}"
WINDOW_MIN="${ALERT_WINDOW_MIN:-5}"
PING_MAX="${ALERT_PING_TIMEOUT_MAX:-15}"
UNHANDLED_MAX="${ALERT_UNHANDLED_MAX:-0}"
RESTART_MAX="${ALERT_RESTART_MAX:-0}"
WEBHOOK="${ALERT_WEBHOOK_URL:-}"

if ! command -v journalctl >/dev/null 2>&1; then
  echo "[alerts] journalctl не найден" >&2
  exit 2
fi

log="$(journalctl -u "${UNIT}" --since "${WINDOW_MIN} min ago" --no-pager 2>/dev/null || true)"
if [[ -z "${log}" ]]; then
  echo "[alerts] пустой journal для unit=${UNIT}"
  exit 0
fi

ping_count="$(printf '%s\n' "${log}" | grep -c 'ping timeout' || true)"
unhandled_count="$(printf '%s\n' "${log}" | grep -c '\[process\] unhandledRejection' || true)"
restart_count="$(printf '%s\n' "${log}" | grep -ci 'Started Meyouquize backend service' || true)"

alerts=()

if [[ "${ping_count}" -gt "${PING_MAX}" ]]; then
  alerts+=("ping timeout: ${ping_count} за ${WINDOW_MIN} мин (порог ${PING_MAX})")
fi
if [[ "${unhandled_count}" -gt "${UNHANDLED_MAX}" ]]; then
  alerts+=("unhandledRejection: ${unhandled_count} за ${WINDOW_MIN} мин (порог ${UNHANDLED_MAX})")
fi
if [[ "${restart_count}" -gt "${RESTART_MAX}" ]]; then
  alerts+=("рестарт meyouquize: ${restart_count} за ${WINDOW_MIN} мин (порог ${RESTART_MAX})")
fi

if [[ "${#alerts[@]}" -eq 0 ]]; then
  echo "[alerts] ok unit=${UNIT} window=${WINDOW_MIN}m ping=${ping_count} unhandled=${unhandled_count} restarts=${restart_count}"
  exit 0
fi

msg="$(printf '%s\n' "${alerts[@]}")"
echo "[alerts] ALERT unit=${UNIT}" >&2
printf '%s\n' "${alerts[@]}" >&2

if [[ -n "${WEBHOOK}" ]]; then
  payload="$(node -e '
    const alerts = process.argv.slice(1);
    console.log(JSON.stringify({
      text: "meyouquize alerts:\\n" + alerts.join("\\n"),
      alerts,
      unit: process.env.JOURNAL_UNIT || "meyouquize",
      at: new Date().toISOString(),
    }));
  ' "${alerts[@]}")"
  curl -fsS -X POST -H 'Content-Type: application/json' -d "${payload}" "${WEBHOOK}" >/dev/null 2>&1 || true
fi

exit 1
