#!/usr/bin/env bash
# Быстрая проверка перед началом ивента (на VPS или локально с .env.runtime).
#
#   ./deploy/scripts/event-day-check.sh
#   BASE_URL=https://ameyou.ru ./deploy/scripts/event-day-check.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-}"
fail=0

warn() {
  echo "WARN: $*" >&2
}

ok() {
  echo "OK: $*"
}

fail_msg() {
  echo "FAIL: $*" >&2
  fail=1
}

if [[ -f deploy/env/.env.runtime ]]; then
  set -a
  # shellcheck disable=SC1091
  source deploy/env/.env.runtime
  set +a
  ok "deploy/env/.env.runtime загружен"
else
  warn "нет deploy/env/.env.runtime — часть проверок пропущена"
fi

if [[ -z "${BASE_URL}" && -n "${CLIENT_ORIGIN:-}" ]]; then
  BASE_URL="${CLIENT_ORIGIN}"
fi

if [[ -n "${BASE_URL}" ]]; then
  if curl -fsS --connect-timeout 8 "${BASE_URL%/}/healthz" >/dev/null; then
    ok "GET ${BASE_URL%/}/healthz"
  else
    fail_msg "healthz недоступен: ${BASE_URL%/}/healthz"
  fi
  if curl -fsS --connect-timeout 8 "${BASE_URL%/}/readyz" >/dev/null; then
    ok "GET ${BASE_URL%/}/readyz"
  else
    fail_msg "readyz недоступен: ${BASE_URL%/}/readyz"
  fi
else
  warn "BASE_URL / CLIENT_ORIGIN не задан — HTTP-проверки пропущены"
fi

media_dir="${MEDIA_DIR:-${ROOT}/server/media}"
if [[ -d "${media_dir}" ]]; then
  ok "MEDIA_DIR существует: ${media_dir}"
  if [[ -w "${media_dir}" ]]; then
    ok "MEDIA_DIR доступен на запись"
  else
    fail_msg "MEDIA_DIR не доступен на запись: ${media_dir}"
  fi
else
  fail_msg "MEDIA_DIR не найден: ${media_dir}"
fi

if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet meyouquize 2>/dev/null; then
    ok "systemd: meyouquize active"
  else
    warn "systemd: meyouquize не active (или нет unit на этой машине)"
  fi
fi

if [[ "${DEBUG_TRIAL_LOGS:-}" == "1" || "${DEBUG_TRIAL_LOGS:-}" == "true" ]]; then
  ok "DEBUG_TRIAL_LOGS включён — post-event сводка будет полной"
else
  warn "DEBUG_TRIAL_LOGS не включён — после ивента включите для post-event-log-summary"
fi

if [[ "${SOCKET_IO_PING_TIMEOUT_MS:-60000}" -ge 90000 ]]; then
  ok "SOCKET_IO_PING_TIMEOUT_MS=${SOCKET_IO_PING_TIMEOUT_MS:-?}"
else
  warn "SOCKET_IO_PING_TIMEOUT_MS=${SOCKET_IO_PING_TIMEOUT_MS:-60000} — для зала 300+ рекомендуется 90000"
fi

echo ""
echo "Ручной чеклист (см. deploy/EVENT-DAY-CHECKLIST.md):"
echo "  - Hard refresh админки и проектора (Ctrl+Shift+R)"
echo "  - QR на проекторе / join URL проверен с телефона"
echo "  - Плитка «Вопросы спикерам» выключена, если не нужна"
echo "  - Репетиция: npm run load:light (на preprod или тестовой комнате)"
echo "  - Таймер алертов: systemctl status meyouquize-log-alerts.timer"

exit "${fail}"
