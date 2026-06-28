#!/usr/bin/env bash
# Проверка, что домен отдаётся через Cloudflare и backend жив.
# Использование: bash deploy/scripts/cloudflare-verify.sh [meyou.site]
set -euo pipefail

DOMAIN="${1:-meyou.site}"
ORIGIN="https://${DOMAIN}"

echo "=== DNS ==="
echo -n "A record: "
dig +short "$DOMAIN" A | head -1 || true
echo -n "NS: "
dig +short "$DOMAIN" NS | tr '\n' ' '
echo ""

echo "=== HTTPS ${ORIGIN}/healthz ==="
HEADERS="$(curl -sS -m 20 -D - -o /tmp/cf-healthz.json "${ORIGIN}/healthz" || true)"
STATUS="$(echo "$HEADERS" | head -1)"
CF_RAY="$(echo "$HEADERS" | grep -i '^cf-ray:' | tr -d '\r' || true)"
SERVER="$(echo "$HEADERS" | grep -i '^server:' | tr -d '\r' || true)"

echo "$STATUS"
echo "$SERVER"
if [[ -n "$CF_RAY" ]]; then
  echo "$CF_RAY"
  echo "✓ Трафик идёт через Cloudflare"
else
  echo "⚠ Заголовка cf-ray нет — возможно, прокси CF выключен или NS ещё не переключились"
fi

if [[ -f /tmp/cf-healthz.json ]]; then
  echo "Body: $(head -c 120 /tmp/cf-healthz.json)"
fi

echo ""
echo "=== SPA ${ORIGIN}/ ==="
CODE="$(curl -sS -m 20 -o /dev/null -w '%{http_code}' "${ORIGIN}/" || echo 000)"
echo "HTTP ${CODE}"

echo ""
echo "=== SSL (origin check, direct IP — опционально) ==="
IP="$(dig +short "$DOMAIN" A | head -1)"
if [[ -n "$IP" && "$IP" != 104.* && "$IP" != 172.* ]]; then
  echo "A указывает на ${IP} (если это Cloudflare anycast — NS уже на CF)"
fi

if [[ -z "$CF_RAY" ]]; then
  exit 1
fi
