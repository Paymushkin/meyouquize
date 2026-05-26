#!/usr/bin/env bash
# Первый подходящий IPv4 в частной сети (для CLIENT_ORIGIN на мероприятии).
set -euo pipefail

if [[ "$(uname -s)" == "Darwin" ]]; then
  for iface in en0 en1 en2 bridge0; do
    ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    if [[ -n "${ip:-}" ]]; then
      echo "$ip"
      exit 0
    fi
  done
fi

if command -v ip >/dev/null 2>&1; then
  ip_addr="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}')"
  if [[ -n "${ip_addr:-}" ]]; then
    echo "$ip_addr"
    exit 0
  fi
fi

if command -v hostname >/dev/null 2>&1; then
  hostname -I 2>/dev/null | awk '{print $1}' | grep -E '^[0-9]+\.' && exit 0
fi

echo "Не удалось определить LAN IP. Задайте LAN_HOST в deploy/env/.env.runtime вручную." >&2
exit 1
