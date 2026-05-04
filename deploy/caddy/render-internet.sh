#!/usr/bin/env bash
# Печатает Caddyfile с подставленным доменом (для /etc/caddy/Caddyfile).
# Использование: DOMAIN=meyou.site bash deploy/caddy/render-internet.sh | sudo tee /etc/caddy/Caddyfile
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="${DOMAIN:?Задайте DOMAIN, например: DOMAIN=meyou.site bash deploy/caddy/render-internet.sh}"
sed "s/{\$DOMAIN}/${DOMAIN}/g" "$DIR/Caddyfile.internet"
