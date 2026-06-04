#!/usr/bin/env bash
# Подставляет текущий LAN IP в LAN_HOST и CLIENT_ORIGIN (если CLIENT_ORIGIN_AUTO не отключён).
# Использование: sync-lan-host.sh [event|dev]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MODE="${1:-event}"

LAN_IP="$(bash "$ROOT/deploy/scripts/detect-lan-ip.sh")"

if [[ "$MODE" == "dev" ]]; then
  NEW_ORIGIN="http://${LAN_IP}:5173,http://localhost:5173"
else
  NEW_ORIGIN="http://${LAN_IP}"
fi

env_auto_enabled() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  if grep -qE '^[[:space:]]*CLIENT_ORIGIN_AUTO=0[[:space:]]*$' "$file" 2>/dev/null; then
    return 1
  fi
  return 0
}

set_kv() {
  local file="$1"
  local key="$2"
  local value="$3"
  if grep -qE "^[[:space:]]*${key}=" "$file" 2>/dev/null; then
    if [[ "$(uname -s)" == "Darwin" ]]; then
      sed -i '' "s|^[[:space:]]*${key}=.*|${key}=${value}|" "$file"
    else
      sed -i "s|^[[:space:]]*${key}=.*|${key}=${value}|" "$file"
    fi
  else
    printf '\n%s=%s\n' "$key" "$value" >>"$file"
  fi
}

sync_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  if ! env_auto_enabled "$file"; then
    return 0
  fi
  set_kv "$file" "LAN_HOST" "$LAN_IP"
  set_kv "$file" "CLIENT_ORIGIN" "$NEW_ORIGIN"
}

CHANGED=0
for f in "$ROOT/deploy/env/.env.runtime" "$ROOT/.env"; do
  if [[ -f "$f" ]] && env_auto_enabled "$f"; then
    OLD="$(grep -E '^[[:space:]]*LAN_HOST=' "$f" 2>/dev/null | head -1 | cut -d= -f2- || true)"
    sync_file "$f"
    if [[ "${OLD:-}" != "$LAN_IP" ]]; then
      CHANGED=1
    fi
  fi
done

if [[ "$CHANGED" == "1" ]]; then
  echo "→ LAN IP: ${LAN_IP} (обновлено CLIENT_ORIGIN / LAN_HOST)"
elif [[ -t 1 ]]; then
  echo "→ LAN IP: ${LAN_IP}"
fi

echo "$LAN_IP"
