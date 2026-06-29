#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

bash "$ROOT/deploy/scripts/lan-event-check.sh"

set -a
# shellcheck disable=SC1091
source deploy/env/.env.runtime
set +a

export MQ_ROOT="$ROOT"

if command -v docker >/dev/null 2>&1; then
  if [[ "${CLUSTER_WORKERS:-1}" != "1" ]]; then
    docker compose up -d redis 2>/dev/null || true
  fi
  docker compose up -d postgres 2>/dev/null || true
fi

echo "→ Сборка…"
npm run build
echo "→ Миграции…"
npm run prisma:migrate:deploy

LAN_IP="${LAN_HOST:-}"
if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(echo "$CLIENT_ORIGIN" | sed -E 's|https?://([^/:]+).*|\1|')"
fi

DETECTED_IP=""
if DETECTED_IP="$(bash "$ROOT/deploy/scripts/detect-lan-ip.sh" 2>/dev/null)"; then
  :
else
  DETECTED_IP=""
fi

DISPLAY_IP="$LAN_IP"
if [[ -n "$DETECTED_IP" ]]; then
  if [[ "$DETECTED_IP" != "$LAN_IP" ]]; then
    echo ""
    echo "⚠ В .env LAN_HOST=$LAN_IP, сейчас на машине $DETECTED_IP"
  fi
  DISPLAY_IP="$DETECTED_IP"
  if [[ "$DETECTED_IP" =~ ^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\. ]]; then
    echo "⚠ Активен Tailscale IP ($DETECTED_IP) — телефоны в Wi‑Fi без Tailscale не откроют сайт."
    echo "  Подключите Mac к Wi‑Fi площадки и выполните: npm run event:init"
  fi
fi

SERVER_PID=""
CADDY_PID=""
cleanup() {
  [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null || true
  [[ -n "$CADDY_PID" ]] && kill "$CADDY_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ Backend (cluster) на :${PORT:-4000}…"
npm run start -w server &
SERVER_PID=$!

for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:${PORT:-4000}/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! curl -sf "http://127.0.0.1:${PORT:-4000}/healthz" >/dev/null 2>&1; then
  echo "❌ Backend не поднялся на :${PORT:-4000}" >&2
  exit 1
fi

echo ""
echo "════════════════════════════════════════════"
echo "  Ивент:  http://${DISPLAY_IP}/"
echo "  Админ:  http://${DISPLAY_IP}/admin/<slug>"
if [[ -n "$DETECTED_IP" && "$DETECTED_IP" != "$LAN_IP" ]]; then
  echo "  (обновите .env: npm run event:init)"
fi
echo "  Ctrl+C — остановить сервер и Caddy"
echo "════════════════════════════════════════════"
echo ""

if command -v caddy >/dev/null 2>&1; then
  echo "→ Caddy :80 (нужны права на порт 80; при ошибке: sudo npm run event:start)"
  caddy run --config "$ROOT/deploy/caddy/Caddyfile.lan.event" &
  CADDY_PID=$!
  wait "$CADDY_PID"
else
  echo "⚠ Caddy не установлен — фронт на http://${DISPLAY_IP}:4173 (vite preview)"
  echo "  Установите: brew install caddy"
  npm run preview -w client -- --host 0.0.0.0 --port 4173
fi
