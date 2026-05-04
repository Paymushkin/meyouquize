# Deployment Runbook

## 1) Prerequisites

- Linux host with Node 20+, npm, and Caddy.
- App directory: `/opt/meyouquize/current`.
- PostgreSQL reachable from the host.

## 2) Build & migrate

```bash
cd /opt/meyouquize/current
npm ci
npm run build
npm run prisma:migrate:deploy
```

## 3) Choose runtime mode

### Internet mode

```bash
npm run deploy:internet
```

- Set real `CLIENT_ORIGIN` (HTTPS domain).
- Set strong `ADMIN_PASSWORD`.

Use Caddy config:

```bash
cp deploy/caddy/Caddyfile.internet /etc/caddy/Caddyfile
```

### LAN mode

```bash
npm run deploy:lan
```

- Set LAN origins in `CLIENT_ORIGIN`.
- Keep `APP_NETWORK_MODE=lan`.

Use Caddy config:

```bash
cp deploy/caddy/Caddyfile.lan /etc/caddy/Caddyfile
```

`deploy/caddy/Caddyfile.active` создаётся скриптами для локальной проверки перед копированием в `/etc/caddy/Caddyfile`.

## 4) systemd service

```bash
cp deploy/systemd/meyouquize.service /etc/systemd/system/meyouquize.service
sudo systemctl daemon-reload
sudo systemctl enable --now meyouquize
```

## 5) Start Caddy

```bash
sudo systemctl enable --now caddy
sudo systemctl restart caddy
```

## 6) Health checks

```bash
curl -f http://127.0.0.1:4000/healthz
curl -f http://127.0.0.1:4000/readyz
```

Also verify from browser:

- `/` opens frontend.
- `/api/admin/me` returns `401` without login.
- Admin login works and sockets connect.

## 7) Safe update sequence

```bash
cd /opt/meyouquize/current
git pull
npm ci
npm run build
npm run prisma:migrate:deploy
sudo systemctl restart meyouquize
sudo systemctl restart caddy
```

## 8) Fresh VPS quickstart

Короткий пошаговый запуск на чистом VPS: [deploy/VPS_QUICKSTART.md](./VPS_QUICKSTART.md)
