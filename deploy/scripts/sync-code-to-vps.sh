#!/usr/bin/env bash
# Синхронизация кода на VPS без затрагивания uploads (media/) и runtime env.
# Использование: ./deploy/scripts/sync-code-to-vps.sh root@5.129.253.14
set -euo pipefail

TARGET="${1:?usage: $0 user@host}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

rsync -az \
  --exclude node_modules \
  --exclude .git \
  --exclude media \
  --exclude server/media \
  --exclude 'deploy/env/.env.runtime' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude client/dist \
  --exclude server/dist \
  --exclude test-results \
  --exclude '.cursor' \
  "$ROOT/" "$TARGET:/opt/meyouquize/current/"

ssh -o ConnectTimeout=15 "$TARGET" 'set -e
cd /opt/meyouquize/current
npm ci --include=dev
npm run build
systemctl restart meyouquize
sleep 4
curl -sf http://127.0.0.1:4000/healthz
echo ""
'

echo "Done: $TARGET"
