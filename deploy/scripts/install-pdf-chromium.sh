#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

install_playwright_chromium() {
  npm run install:chromium
}

install_system_chromium() {
  if ! command -v apt-get >/dev/null 2>&1; then
    return 1
  fi
  echo "[pdf] Trying system Chromium via apt..."
  if command -v sudo >/dev/null 2>&1 && [[ "$(id -u)" -ne 0 ]]; then
    sudo apt-get update -qq
    sudo apt-get install -y chromium-browser 2>/dev/null || sudo apt-get install -y chromium
  else
    apt-get update -qq
    apt-get install -y chromium-browser 2>/dev/null || apt-get install -y chromium
  fi
}

echo "[pdf] Installing Playwright Chromium..."
if ! install_playwright_chromium; then
  echo "[pdf] Playwright Chromium download failed."
  install_system_chromium || true
fi

if command -v sudo >/dev/null 2>&1 && [[ "$(id -u)" -ne 0 ]]; then
  echo "[pdf] Installing system dependencies for Chromium (may ask sudo)..."
  sudo npx playwright install-deps chromium || true
else
  npx playwright install-deps chromium || true
fi

for candidate in \
  /usr/bin/chromium \
  /usr/bin/chromium-browser \
  /snap/bin/chromium \
  /usr/bin/google-chrome-stable; do
  if [[ -x "$candidate" ]]; then
    echo "[pdf] System browser found: $candidate"
    echo "[pdf] Optional: export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$candidate"
    exit 0
  fi
done

if npx playwright install --dry-run chromium >/dev/null 2>&1; then
  echo "[pdf] Playwright Chromium ready."
  exit 0
fi

echo "[pdf] Warning: Chromium not detected. PDF will use simplified fallback until browser is installed."
exit 0
