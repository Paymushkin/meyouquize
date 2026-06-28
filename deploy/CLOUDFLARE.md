# Cloudflare перед meyou.site

Прокси Cloudflare снижает риск недоступности при DDoS и сбоях TLS до IP Timeweb: трафик идёт через сеть CF, WebSocket и API остаются на том же домене.

**Текущий origin:** VPS `5.129.253.14`, Caddy → Node `:4000`.  
**Менять в коде не нужно:** клиент ходит на тот же origin (`https://meyou.site`), `CLIENT_ORIGIN` не трогаем.

---

## 1. Добавить сайт в Cloudflare

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a site** → `meyou.site`.
2. План **Free**.
3. На шаге DNS Cloudflare подтянет записи. Проверьте:

| Type | Name | Content        | Proxy status                   |
| ---- | ---- | -------------- | ------------------------------ |
| A    | `@`  | `5.129.253.14` | **Proxied** (оранжевое облако) |

4. Если есть `www` — либо A/CNAME на тот же IP (Proxied), либо **Redirect Rule**: `www.meyou.site` → `meyou.site`.
5. Cloudflare покажет **два nameserver** вида `xxx.ns.cloudflare.com`.

---

## 2. Сменить NS у регистратора (Timeweb)

Домен сейчас на NS Timeweb (`ns1.timeweb.ru` …). В панели Timeweb:

**Домены → meyou.site → DNS / Nameservers** → заменить на NS от Cloudflare (оба).

Распространение: от 15 минут до 24 часов. Старый сайт может работать параллельно, пока NS не переключились.

Проверка с Mac:

```bash
dig +short NS meyou.site
# должны быть *.ns.cloudflare.com
```

---

## 3. SSL/TLS в Cloudflare

**SSL/TLS → Overview:**

- Режим: **Full (strict)** — Caddy на VPS уже отдаёт валидный Let's Encrypt для `meyou.site`.
- Если сразу после переключения ошибка 525 — временно **Full** (не strict), дождаться выпуска сертификата на origin, вернуть **Full (strict)**.

**SSL/TLS → Edge Certificates:**

- **Always Use HTTPS** — включить.
- **Minimum TLS Version** — 1.2.

Origin-сертификат Cloudflare (15 лет) **не обязателен**, если Caddy с LE уже работает.

---

## 4. WebSocket и Socket.IO

**Network → WebSockets** — **On** (по умолчанию для Proxied).

Дополнительно в коде уже:

- Caddy: `flush_interval -1` для `/socket.io*`
- Клиент: `transports: ["websocket", "polling"]`
- Сервер: `trust proxy`, ping 25s / timeout 60s

После включения CF проверьте админку и экран игрока — сокеты должны подключаться (в DevTools → Network → WS).

---

## 4.1. Гибрид: статика без proxy (обязательно при обрыве JS через CF)

**Симптом:** `https://meyou.site` открывает HTML, но страница белая / таймаут — большой JS (`/assets/*.js`, ~1 МБ) не докачивается через Cloudflare.

**Решение:** основной домен **Proxied**, поддомен статики **DNS only**.

### DNS в Cloudflare

| Type | Name     | Content        | Proxy                       |
| ---- | -------- | -------------- | --------------------------- |
| A    | `@`      | `5.129.253.14` | **Proxied**                 |
| A    | `www`    | `5.129.253.14` | **Proxied**                 |
| A    | `static` | `5.129.253.14` | **DNS only** (серое облако) |

### Caddy на VPS

Шаблон `deploy/caddy/Caddyfile.internet` уже настроен: `static.{$DOMAIN}` отдаёт `/assets/*`, `/fonts/*`, `/event-bg.png`; с основного домена — редирект на static.

Применить:

```bash
DOMAIN=meyou.site bash deploy/caddy/render-internet.sh | sudo tee /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

### Сборка клиента

```bash
VITE_ASSET_ORIGIN=https://static.meyou.site npm run build -w client
```

Или в `deploy/env/.env.runtime` задать `VITE_ASSET_ORIGIN` и пересобрать на VPS.

### Проверка

```bash
dig +short static.meyou.site A          # → 5.129.253.14
curl -I https://meyou.site/ | grep cf-ray
curl -o /dev/null -w "%{size_download}\n" https://static.meyou.site/assets/index-*.js  # ~1.2e6
```

---

## 5. Кеш — не кешировать API и сокеты

**Rules → Cache Rules** (или Page Rules на Free — до 3 правил):

**Правило 1 — Bypass API и Socket.IO**

- When: URI Path starts with `/api/` **OR** starts with `/socket.io`
- Then: **Bypass cache**

**Правило 2 (опционально) — Bypass health**

- Path equals `/healthz` or `/readyz` → Bypass cache

Статика `/assets/*` с хешами в имени может кешироваться — это нормально.

В Caddy для SPA добавлен заголовок `Cache-Control: no-store` на `/` и `index.html` (см. `Caddyfile.internet`).

---

## 6. Что не включать без нужды

| Функция                      | Риск для квиза                           |
| ---------------------------- | ---------------------------------------- |
| Rocket Loader                | ломает SPA — **выключить**               |
| Auto Minify (JS)             | может ломать бандл — **выключить**       |
| Bot Fight Mode (агрессивный) | редко режет WS — при проблемах выключить |

**Speed → Optimization:** отключите Rocket Loader и JS minify для `meyou.site`.

---

## 7. `.env.runtime` на VPS

Оставить как есть:

```env
CLIENT_ORIGIN=https://meyou.site
APP_NETWORK_MODE=internet
```

`www` не используйте в `CLIENT_ORIGIN`, если основной домен без www.

После смены NS **рестарт не обязателен**, но можно:

```bash
sudo systemctl reload caddy
sudo systemctl restart meyouquize
```

---

## 8. Проверка после включения

На Mac или VPS:

```bash
bash deploy/scripts/cloudflare-verify.sh meyou.site
```

Ожидаемо:

- HTTP 200 на `/healthz`
- Заголовок **`cf-ray`** в ответе (трафик через Cloudflare)
- `https://meyou.site/q/<slug>` открывается
- В админке нет `connect_error` / `WebSocket closed` в консоли

---

## 9. (Опционально) Закрыть прямой доступ к IP

Когда CF стабилен, можно принимать HTTPS только от [IP Cloudflare](https://www.cloudflare.com/ips/) (iptables/nftables). Это отдельный шаг; без него атака может идти напрямую на `5.129.253.14`, минуя CF.

---

## 10. Откат

1. В Timeweb вернуть NS `ns1.timeweb.ru`, `ns2.timeweb.ru`, …
2. Дождаться propagation
3. A-запись снова указывает на `5.129.253.14` у Timeweb DNS

Приложение и Caddy менять не нужно.

---

## Ссылки

- [Статус Timeweb](https://status.timeweb.cloud/)
- [Алерты Timeweb Telegram](https://t.me/timewebcloud_alerts)
- [Cloudflare WebSockets](https://developers.cloudflare.com/network/websockets/)
