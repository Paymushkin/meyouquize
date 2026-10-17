#!/usr/bin/env bash
# Создаёт swap-файл на VPS, если swap ещё не включён.
# Использование:
#   sudo bash deploy/scripts/ensure-swap.sh
#   SWAP_SIZE=1G sudo bash deploy/scripts/ensure-swap.sh
set -euo pipefail

SWAP_SIZE="${SWAP_SIZE:-2G}"
SWAP_FILE="${SWAP_FILE:-/swapfile}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Запустите от root: sudo bash $0" >&2
  exit 1
fi

if swapon --show | grep -q .; then
  echo "Swap уже активен:"
  swapon --show
  free -h
  exit 0
fi

if [[ -f "${SWAP_FILE}" ]]; then
  echo "Файл ${SWAP_FILE} уже есть — включаем."
else
  echo "Создаём ${SWAP_FILE} размера ${SWAP_SIZE}…"
  if ! fallocate -l "${SWAP_SIZE}" "${SWAP_FILE}" 2>/dev/null; then
    # fallocate может не работать на некоторых FS — fallback.
    dd_count_kb=0
    case "${SWAP_SIZE}" in
      *G | *g) dd_count_kb=$(( ${SWAP_SIZE%[Gg]} * 1024 * 1024 )) ;;
      *M | *m) dd_count_kb=$(( ${SWAP_SIZE%[Mm]} * 1024 )) ;;
      *) echo "Непонятный SWAP_SIZE=${SWAP_SIZE} (ожидается 1G/2G)" >&2; exit 1 ;;
    esac
    dd if=/dev/zero of="${SWAP_FILE}" bs=1024 count="${dd_count_kb}" status=progress
  fi
fi

chmod 600 "${SWAP_FILE}"
mkswap "${SWAP_FILE}"
swapon "${SWAP_FILE}"

if ! grep -qE "^${SWAP_FILE}\\s" /etc/fstab; then
  echo "${SWAP_FILE} none swap sw 0 0" >> /etc/fstab
  echo "Добавлено в /etc/fstab."
fi

# Чуть агрессивнее уходить в RAM на маленьких VPS (по умолчанию 60).
if [[ -f /etc/sysctl.conf ]] && ! grep -q '^vm.swappiness=' /etc/sysctl.conf; then
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl -w vm.swappiness=10 >/dev/null
fi

echo "Готово:"
swapon --show
free -h
