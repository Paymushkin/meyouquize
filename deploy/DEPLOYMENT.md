# Deployment Runbook

## 1) Prerequisites

- Linux host with Node 20+, npm, and Caddy.
- App directory: `/opt/meyouquize/current`.
- PostgreSQL reachable from the host.
- **Мультиядро (рекомендуется на VPS ≥2 vCPU):** локальный Redis (`redis-server`) и в `.env.runtime` переменные `CLUSTER_WORKERS=auto` (или `4`) и `REDIS_URL=redis://127.0.0.1:6379`. Один процесс Node использует по сути одно ядро под JS; `node:cluster` поднимает несколько воркеров на **том же** `PORT`, Caddy менять не нужно. В `DATABASE_URL` задайте `connection_limit` на воркер; при **PgBouncer** реальные сессии к Postgres ограничивает пулер (см. ниже).

### PgBouncer (transaction pooling, рекомендуется на одном VPS с Postgres)

Снимает пики по соединениям: Prisma открывает много лёгких клиентов к PgBouncer, а к Postgres уходит меньше backend-сессий.

1. Установка и конфиг:

```bash
sudo apt install -y pgbouncer
sudo cp /opt/meyouquize/current/deploy/pgbouncer/pgbouncer.ini.example /etc/pgbouncer/pgbouncer.ini
sudo nano /etc/pgbouncer/pgbouncer.ini
```

В `[databases]` укажите тот же `dbname`, что у приложения. В `[pgbouncer]` при необходимости снизьте `default_pool_size`, чтобы `default_pool_size + reserve_pool_size + запас под админа` **не приближались** к `max_connections` в Postgres.

2. systemd (если в дистрибутиве нет подходящего unit или нужен явный путь к бинарнику):

```bash
sudo cp /opt/meyouquize/current/deploy/systemd/pgbouncer.service /etc/systemd/system/pgbouncer.service
# При ошибке ExecStart замените путь на результат: command -v pgbouncer
sudo systemctl daemon-reload
sudo systemctl enable --now pgbouncer
```

3. Переменные в `deploy/env/.env.runtime`:

- **`DATABASE_URL`** — на PgBouncer, **обязательно** параметр `pgbouncer=true` (требование Prisma при `pool_mode=transaction`). Пример:  
  `postgresql://USER:PASSWORD@127.0.0.1:6432/meyouquize?pgbouncer=true&connection_limit=12`
- **`DIRECT_URL`** — прямое подключение к Postgres для миграций (порт **5432**, без `pgbouncer=true`):  
  `postgresql://USER:PASSWORD@127.0.0.1:5432/meyouquize`

Локально без пула оба URL указывают на один и тот же `:5432`.

4. Порядок старта: в `/etc/systemd/system/meyouquize.service` при желании добавьте в `[Unit]` строку `After=… pgbouncer.service` (и при необходимости `postgresql.service`), затем `daemon-reload`.

5. Проверка: `ss -lntp | grep 6432`, затем `curl` к приложению и `npm run prisma:migrate:deploy` с тем же `.env`, где заданы оба URL.

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

Use Caddy config после `git pull`: **нельзя** просто `cp Caddyfile.internet` — в файле плейсхолдер **`{$DOMAIN}`**. Если переменная окружения **`DOMAIN`** при запуске Caddy не задана, получится строка вида `{` без имени сайта и ошибка **`unrecognized global option: encode`**.

Вариант A — подставить домен при установке:

```bash
cd /opt/meyouquize/current
chmod +x deploy/caddy/render-internet.sh
DOMAIN=meyou.site bash deploy/caddy/render-internet.sh | sudo tee /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Вариант B — оставить `{$DOMAIN}` в файле и задать **`DOMAIN`** для процесса Caddy (например `Environment=DOMAIN=meyou.site` в override unit), тогда подстановка сделает сам Caddy.

Если после неудачного `reload` сайт не поднимается — восстановите предыдущий `/etc/caddy/Caddyfile` из бэкапа и снова `validate` + `reload`.

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

С домена по HTTPS (после обновления Caddyfile из репозитория — пути `/healthz` и `/readyz` проксируются на бэкенд, иначе отдавался бы SPA):

```bash
curl -sf https://YOUR_DOMAIN/healthz
curl -sf https://YOUR_DOMAIN/readyz
```

Also verify from browser:

- `/` opens frontend.
- `/api/admin/me` returns `401` without login.
- Admin login works and sockets connect.

Если в браузере `WebSocket … closed before established`: обновите Caddyfile из репозитория (блок `flush_interval -1` у `reverse_proxy` для `/api` и `/socket.io`), затем `sudo systemctl reload caddy`. Проверьте, что в `.env` в `CLIENT_ORIGIN` указан **ровно** тот же origin, что в адресной строке (например `https://meyou.site`, без лишнего слэша и с тем же `www`/без `www`).

## 7) Safe update sequence

После обновления, где в Prisma появился `directUrl`: в `deploy/env/.env.runtime` (или в `.env` для локальных команд) добавьте **`DIRECT_URL`** — прямой Postgres `:5432`; без PgBouncer скопируйте тот же URL, что и у `DATABASE_URL` (только порт/хост как у реальной БД).

```bash
cd /opt/meyouquize/current
git pull
npm ci
npm run build
npm run prisma:migrate:deploy
sudo systemctl restart meyouquize
```

Если в этом релизе менялся `deploy/caddy/Caddyfile.internet`, обновите Caddy **через `render-internet.sh`** (см. §3), затем `validate` и `reload`, а не «голый» `cp` без `DOMAIN`.

## 8) Fresh VPS quickstart

Короткий пошаговый запуск на чистом VPS: [deploy/VPS_QUICKSTART.md](./VPS_QUICKSTART.md)
