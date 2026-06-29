#!/usr/bin/env bash
# Подходящий IPv4 для CLIENT_ORIGIN на мероприятии (Wi‑Fi / Ethernet, не Tailscale).
set -euo pipefail

is_tailscale_cgnat() {
  local ip="$1"
  local o1 o2
  IFS=. read -r o1 o2 _ _ <<<"$ip"
  [[ "$o1" == "100" ]] && (( o2 >= 64 && o2 <= 127 ))
}

score_ip() {
  local ip="$1"
  local o1 o2
  IFS=. read -r o1 o2 _ _ <<<"$ip"
  if [[ "$o1" == "10" ]]; then
    echo 1
    return
  fi
  if [[ "$o1" == "192" && "$o2" == "168" ]]; then
    echo 2
    return
  fi
  if [[ "$o1" == "172" ]] && (( o2 >= 16 && o2 <= 31 )); then
    echo 3
    return
  fi
  if is_tailscale_cgnat "$ip"; then
    echo 9
    return
  fi
  echo 5
}

if [[ "$(uname -s)" == "Darwin" ]]; then
  best_ip=""
  best_score=99
  for iface in en0 en1 en2 bridge0; do
    ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    [[ -z "${ip:-}" ]] && continue
    score="$(score_ip "$ip")"
    if (( score < best_score )); then
      best_score=$score
      best_ip=$ip
    fi
  done
  if [[ -n "$best_ip" ]]; then
    echo "$best_ip"
    exit 0
  fi
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
