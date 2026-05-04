#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

profiles=(smoke nominal peak soak)
for p in "${profiles[@]}"; do
  echo "=============================="
  echo "[matrix] running profile: ${p}"
  echo "=============================="
  bash "${ROOT_DIR}/load/run.sh" "${p}"
done

echo "[matrix] completed: ${profiles[*]}"
