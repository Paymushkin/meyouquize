#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

LAN_IP="${LAN_HOST:-}"
if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(bash "$ROOT/deploy/scripts/detect-lan-ip.sh")"
fi

cp deploy/env/.env.lan.event.example deploy/env/.env.runtime

replace_host() {
  local file="$1"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sed -i '' "s/__LAN_HOST__/$LAN_IP/g" "$file"
  else
    sed -i "s/__LAN_HOST__/$LAN_IP/g" "$file"
  fi
}

replace_host deploy/env/.env.runtime
cp deploy/env/.env.runtime .env

echo ""
echo "Готово: deploy/env/.env.runtime и .env"
echo "  LAN_HOST=$LAN_IP"
echo "  Участники открывают: http://$LAN_IP/"
echo ""
echo "Проверьте ADMIN_PASSWORD в .env, затем:"
echo "  npm run event:start"
