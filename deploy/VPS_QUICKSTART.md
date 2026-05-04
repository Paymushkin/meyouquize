# VPS Quickstart (12 commands)

Ниже минимальный запуск на чистом Ubuntu VPS для `internet`-режима.

1.

```bash
sudo apt update && sudo apt install -y curl git build-essential postgresql postgresql-contrib caddy
```

2.

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

3.

```bash
sudo apt install -y nodejs
```

4.

```bash
sudo useradd -m -s /bin/bash meyouquize || true
```

5.

```bash
sudo mkdir -p /opt/meyouquize && sudo chown -R meyouquize:meyouquize /opt/meyouquize
```

6.

```bash
sudo -u meyouquize git clone <YOUR_REPO_URL> /opt/meyouquize/current
```

7.

```bash
cd /opt/meyouquize/current && sudo -u meyouquize npm ci && sudo -u meyouquize npm run build
```

8.

```bash
sudo -u meyouquize cp /opt/meyouquize/current/deploy/env/.env.internet.example /opt/meyouquize/current/deploy/env/.env.runtime
```

9.

```bash
sudo -u meyouquize nano /opt/meyouquize/current/deploy/env/.env.runtime
```

10.

```bash
cd /opt/meyouquize/current && sudo -u meyouquize npm run prisma:migrate:deploy
```

11.

```bash
sudo cp /opt/meyouquize/current/deploy/systemd/meyouquize.service /etc/systemd/system/meyouquize.service && sudo systemctl daemon-reload && sudo systemctl enable --now meyouquize
```

12.

```bash
sudo cp /opt/meyouquize/current/deploy/caddy/Caddyfile.internet /etc/caddy/Caddyfile && sudo systemctl enable --now caddy && sudo systemctl restart caddy
```

## Проверка

```bash
curl -f http://127.0.0.1:4000/healthz
curl -f http://127.0.0.1:4000/readyz
```

Если всё ок, открой домен в браузере и проверь вход в админку.
