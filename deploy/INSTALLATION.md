# Установка и настройка meyouquize

Единый порядок развёртывания для **человека** и **агента** (Cursor, CI, скрипты).  
Цель по нагрузке: зал **до ~500 одновременных игроков** на internet-VPS при конфигурации из §4 и успешном прогоне `npm run load:peak`; для LAN на Mac — **до ~300** (`load:normal`). Критерии «успеха» — §5.

## Карта документов

| Документ                                           | Когда читать                                                |
| -------------------------------------------------- | ----------------------------------------------------------- |
| **Этот файл**                                      | Первый запуск, проверка готовности к ивенту, плейбук агента |
| [VPS_QUICKSTART.md](./VPS_QUICKSTART.md)           | Минимум команд на чистый Ubuntu                             |
| [DEPLOYMENT.md](./DEPLOYMENT.md)                   | PgBouncer, Caddy, обновления, детали systemd                |
| [LAN_EVENT.md](./LAN_EVENT.md)                     | Ивент без интернета (Mac + Wi‑Fi)                           |
| [EVENT-DAY-CHECKLIST.md](./EVENT-DAY-CHECKLIST.md) | День мероприятия                                            |
| [MONITORING.md](./MONITORING.md)                   | Логи, алерты, нагрузка на проде                             |
| [../load/README.md](../load/README.md)             | Профили нагрузочных тестов                                  |
| [../README.md](../README.md)                       | Unit / integration / E2E                                    |
| [../GITFLOW.md](../GITFLOW.md)                     | Ветки и деплой                                              |

---

## 1. Режимы развёртывания

| Режим                    | Команда выбора env                                    | Каталог на сервере        | Типичная нагрузка                 |
| ------------------------ | ----------------------------------------------------- | ------------------------- | --------------------------------- |
| **Локальная разработка** | корневой `.env` из `.env.example`                     | репозиторий               | без нагрузочных требований        |
| **Internet (VPS)**       | `npm run deploy:internet` → `deploy/env/.env.runtime` | `/opt/meyouquize/current` | **peak 500** (после настройки §4) |
| **LAN (постоянный)**     | `npm run deploy:lan`                                  | VPS / офис                | зависит от железа                 |
| **LAN ивент (Mac)**      | `npm run event:init`                                  | Mac хоста                 | **normal 300**                    |

Переменные runtime для production: **`deploy/env/.env.runtime`** (не коммитить секреты). Шаблон: `deploy/env/.env.internet.example`.

---

## 2. Локальная разработка (человек)

### 2.1. Требования

- **Node.js 20+**, npm (workspaces: `server`, `client`, `shared`)
- **PostgreSQL** (удобно через Docker):

```bash
docker compose up -d postgres
# при отладке cluster в dev: docker compose up -d redis
```

### 2.2. Первичная настройка

```bash
git clone <REPO_URL> meyouquize && cd meyouquize
cp .env.example .env
# при необходимости: cp .env.test.example .env.test
npm ci
npm run prisma:generate
npm run prisma:migrate   # применяет миграции к БД из DATABASE_URL
```

В `.env` задайте `DATABASE_URL`, `DIRECT_URL`, пароль админа (`ADMIN_PASSWORD` или `ADMIN_ACCOUNTS` — см. `.env.example`).

### 2.3. Запуск

```bash
npm run dev
```

- API: `http://localhost:4000`
- Vite-клиент: `http://localhost:5173` (прокси на API)

`npm run dev` **всегда один воркер** Node (см. `MEYOUQUIZE_DEV` в `server/package.json`). Cluster локально: `CLUSTER_WORKERS_DEV_FORCE=1` + Redis.

### 2.4. Проверка перед коммитом

```bash
npm run lint
npm test
# опционально: npm run test:e2e  (нужен Chromium: npm run install:chromium)
```

---

## 3. Production internet-VPS (человек)

Краткий путь: [VPS_QUICKSTART.md](./VPS_QUICKSTART.md). Ниже — полный порядок с учётом нагрузки.

### 3.1. Железо и софт (ориентир под peak 500)

| Ресурс | Минимум для ивента                | Рекомендация                      |
| ------ | --------------------------------- | --------------------------------- |
| vCPU   | 2                                 | 4+                                |
| RAM    | 4 GB                              | 8 GB                              |
| Диск   | SSD, запас под `media/` и journal | —                                 |
| ОС     | Ubuntu 22.04+                     | —                                 |
| Пакеты | Node 20, PostgreSQL, Caddy        | + **redis-server**, **pgbouncer** |

Пользователь приложения: `meyouquize`, код: `/opt/meyouquize/current`.

### 3.2. Установка с нуля (порядок)

1. Пакеты: Postgres, Caddy, Node 20, git (см. VPS_QUICKSTART §1–3).
2. Клон репозитория в `/opt/meyouquize/current` от пользователя `meyouquize`.
3. **Не** делать `source deploy/env/.env.runtime` до `npm ci` — иначе `NODE_ENV=production` и не поставятся devDependencies для сборки.
4. `npm ci --include=dev`, `npm run install:pdf`, `npm run build`.
5. `cp deploy/env/.env.internet.example deploy/env/.env.runtime` и заполнить секреты (§3.3).
6. `npm run deploy:internet` (копирует шаблон в `.env.runtime` только при первом выборе режима — если файл уже правили, не перезаписывайте без бэкапа).
7. `npm run prisma:migrate:deploy` (нужны `DATABASE_URL` и `DIRECT_URL`).
8. systemd: `deploy/systemd/meyouquize.service` → `/etc/systemd/system/`, `enable --now`.
9. Caddy: `DOMAIN=ваш.домен bash deploy/caddy/render-internet.sh | sudo tee /etc/caddy/Caddyfile`, `caddy validate`, `reload`.
10. Health: `curl -sf http://127.0.0.1:4000/healthz` и `curl -sf http://127.0.0.1:4000/readyz`.

### 3.3. Обязательные переменные (`deploy/env/.env.runtime`)

| Переменная                                 | Замечание                                                        |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `CLIENT_ORIGIN`                            | Точный HTTPS-origin без лишнего `/` (как в браузере)             |
| `DATABASE_URL`                             | Через PgBouncer: `:6432`, `pgbouncer=true`, `connection_limit=8` |
| `DIRECT_URL`                               | Postgres `:5432`, для миграций                                   |
| `ADMIN_PASSWORD` / `ADMIN_ACCOUNTS_BASE64` | Сильные пароли, не в git                                         |
| `APP_NETWORK_MODE=internet`                | Из шаблона internet                                              |

В **systemd** `EnvironmentFile` значения `DATABASE_URL` с `&` оборачивайте в **двойные кавычки** (см. [DEPLOYMENT.md](./DEPLOYMENT.md)).

### 3.4. Обновление кода

Предпочтительно на сервере (ветка по политике, часто `main` или `develop`):

```bash
cd /opt/meyouquize/current
git fetch origin
git checkout -B <ветка> origin/<ветка>
git reset --hard origin/<ветка>
npm ci --include=dev
npm run build
npm run prisma:migrate:deploy
sudo systemctl restart meyouquize
```

С локальной машины (rsync, **не меняет ветку** на VPS):

```bash
bash deploy/scripts/sync-code-to-vps.sh user@host
```

`media/` и `deploy/env/.env.runtime` при rsync **не трогаются**.

---

## 4. Настройка под целевую нагрузку

Без Redis + нескольких воркеров один процесс Node упирается в **одно ядро**; без PgBouncer при пике голосования возможен исчерпание соединений Postgres.

### 4.1. Internet-VPS (референс для `load:peak` — 500 игроков)

1. **Redis**

```bash
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
```

2. **PgBouncer** — transaction pooling, конфиг из `deploy/pgbouncer/pgbouncer.ini.example` ([DEPLOYMENT.md](./DEPLOYMENT.md), таблица пулов):

| Параметр                          | Значение        |
| --------------------------------- | --------------- |
| `default_pool_size`               | **50**          |
| `reserve_pool_size`               | **10**          |
| `max_client_conn`                 | **400**         |
| `DATABASE_URL` `connection_limit` | **8** на воркер |

3. **В `deploy/env/.env.runtime`**

```bash
REDIS_URL=redis://127.0.0.1:6379
CLUSTER_WORKERS=auto
SOCKET_IO_PING_TIMEOUT_MS=90000
# опционально при тяжёлом дашборде:
# DASHBOARD_RESULTS_DEBOUNCE_MS=400
# DASHBOARD_RESULTS_CACHE_MS=400
# QUIZ_ONLINE_COUNT_DEBOUNCE_MS=300
```

4. `LimitNOFILE=65535` уже в `deploy/systemd/meyouquize.service`; при `too many open files` проверьте лимиты ОС.

5. `sudo systemctl restart pgbouncer meyouquize`.

### 4.2. LAN-ивент на Mac (референс для `load:normal` — 300 игроков)

```bash
docker compose up -d postgres redis
npm run event:init
# ADMIN_PASSWORD в .env
npm run event:check
npm run event:start
```

Шаблон: `deploy/env/.env.lan.event.example` (`CLUSTER_WORKERS=auto`, debounce дашборда). Подробно: [LAN_EVENT.md](./LAN_EVENT.md).

### 4.3. Что **не** считается боевой конфигурацией

- `CLUSTER_WORKERS=1` без Redis на VPS с сотнями сокетов
- Пропуск PgBouncer при `CLUSTER_WORKERS=auto` и Postgres на том же хосте
- Несовпадение `CLIENT_ORIGIN` и URL в браузере (WebSocket обрывается)
- Устаревший Caddyfile без `flush_interval -1` для `/socket.io`

---

## 5. Проверка готовности (тесты и нагрузка)

### 5.1. Автотесты репозитория

| Шаг         | Команда                                                      | Успех                                  |
| ----------- | ------------------------------------------------------------ | -------------------------------------- |
| Статика     | `npm run lint`                                               | exit 0                                 |
| Unit        | `npm run test:unit`                                          | exit 0                                 |
| Integration | Postgres `meyouquize_test`, затем `npm run test:integration` | exit 0                                 |
| E2E         | `npm run install:chromium` + `npm run test:e2e`              | exit 0 (как в CI)                      |
| Сборка      | `npm run build`                                              | артефакты `client/dist`, `server/dist` |

Integration локально:

```bash
docker run --name meyouquize-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=meyouquize_test -p 5432:5432 -d postgres:16
cp .env.test.example .env.test
npm run test:integration
```

### 5.2. Нагрузочные сценарии ивента

Профили: `load/profiles/*.json`. Запуск:

```bash
BASE_URL=https://ваш-домен \
QUIZ_SLUG=тестовая-комната \
npm run load:light    # 100 → smoke
npm run load:normal   # 300 → рабочая LAN / staging
npm run load:peak     # 500 → целевой internet-VPS (только после успешного light)
npm run load:stress   # 700 → стресс после успешного peak
```

**Подготовка комнаты** (в админке, не боевая комната ивента):

1. Отдельный slug (`QUIZ_SLUG`).
2. Открыт вопрос single/multi с вариантами.
3. Включены «Вопросы спикерам» (спикеры, реакции).
4. `/healthz` и `/readyz` → 200.

При отсутствии активного вопроса в state задайте `QUIZ_ID`, `QUESTION_ID`, `OPTION_ID`.

**Критерий УСПЕХ** (exit code 0, `summary.json` → `"passed": true`):

- сбоев `quiz:join` не больше `join_fail_tolerance` профиля;
- доля ошибок голосования ≤ `submit_fail_max_rate` (обычно **5%**);
- 100% успехов speaker create / react / reactions, если сценарий их запускал;
- в логе блок **«ИТОГ ПРОГОНА: УСПЕХ»**.

Артефакты: `load/results/<timestamp>-<profile>/`.

**Лестница перед ивентом на проде:** `load:light` → `load:normal` → при необходимости `load:peak`; окно вне пика; при деградации админки — остановить. См. [MONITORING.md](./MONITORING.md).

### 5.3. Быстрые проверки на уже поднятом сервере

```bash
curl -sf http://127.0.0.1:4000/healthz
curl -sf http://127.0.0.1:4000/readyz
curl -sf "https://ВАШ_ДОМЕН/healthz"
BASE_URL=https://ВАШ_ДОМЕН ./deploy/scripts/event-day-check.sh
```

---

## 6. Плейбук для агента

Использовать как чеклист: выполнять по порядку, не пропускать шаги **VERIFY**. Секреты не коммитить; не писать в production БД из тестов.

### 6.1. Локальный репозиторий — «готов к merge»

```
TASK: local-ci
  RUN: npm ci
  RUN: npm run lint
  RUN: npm test
  OPTIONAL: npm run build
  VERIFY: все команды exit 0
```

### 6.2. Новый internet-VPS

```
TASK: vps-fresh-install
  PREREQ: SSH root, домен → A-запись на VPS
  RUN: шаги VPS_QUICKSTART 1–12 (или §3.2 этого файла)
  CONFIG: deploy/env/.env.runtime из .env.internet.example + §4.1
  RUN: PgBouncer + Redis per DEPLOYMENT.md
  RUN: systemctl enable --now meyouquize caddy
  VERIFY: curl -sf http://127.0.0.1:4000/healthz && curl -sf http://127.0.0.1:4000/readyz
  VERIFY: curl -sf https://$DOMAIN/healthz
  VERIFY: браузер / , админ-логин, сокет без ошибок в консоли
```

### 6.3. Подтверждение нагрузки после настройки §4.1

```
TASK: load-verify-peak
  PREP: тестовая комната QUIZ_SLUG (§5.2)
  RUN: BASE_URL=$BASE_URL QUIZ_SLUG=$QUIZ_SLUG npm run load:light
  VERIFY: exit 0 && load/results/*/summary.json passed=true
  RUN: BASE_URL=$BASE_URL QUIZ_SLUG=$QUIZ_SLUG npm run load:peak
  VERIFY: exit 0 && verdict УСПЕХ в event-load.log
  ON_FAIL: journalctl -u meyouquize -n 200; проверить Redis, PgBouncer, CLUSTER_WORKERS, CLIENT_ORIGIN
```

### 6.4. Деплой обновления (без потери media и env)

```
TASK: deploy-update
  INPUT: user@host, ветка origin/<branch>
  CHOICE_A (git on server):
    ssh user@host 'cd /opt/meyouquize/current && git fetch && git checkout -B BRANCH origin/BRANCH && git reset --hard origin/BRANCH && npm ci --include=dev && npm run build && npm run prisma:migrate:deploy && sudo systemctl restart meyouquize'
  CHOICE_B (rsync):
    bash deploy/scripts/sync-code-to-vps.sh user@host
  VERIFY: curl -sf http://127.0.0.1:4000/healthz on server
  OPTIONAL: load:light against staging/production test room
```

### 6.5. LAN-ивент

```
TASK: lan-event
  RUN: docker compose up -d postgres redis
  RUN: npm run event:init && edit .env ADMIN_PASSWORD
  RUN: npm run event:check  # must pass
  RUN: npm run event:start
  VERIFY: BASE_URL=http://LAN_IP QUIZ_SLUG=... npm run load:light
  OPTIONAL: load:normal for 300 players
```

### 6.6. Типичные ошибки агента

| Симптом                                  | Действие                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run build` без `@types/*`           | не экспортировать `NODE_ENV=production` до `npm ci --include=dev`               |
| `password authentication failed` на 6432 | кавычки в `EnvironmentFile`, `pgbouncer=true`, перезапуск pgbouncer             |
| `CLUSTER_WORKERS>1 requires REDIS_URL`   | установить Redis, задать `REDIS_URL`                                            |
| WebSocket closed before established      | обновить Caddyfile, сверить `CLIENT_ORIGIN`                                     |
| `dubious ownership` git на VPS           | `git config --global --add safe.directory /opt/meyouquize/current` (на сервере) |
| load ПРОВАЛ join                         | ping timeout → `SOCKET_IO_PING_TIMEOUT_MS`; перегруз CPU → воркеры/Redis        |
| load ПРОВАЛ submit                       | PgBouncer pool, `connection_limit`, debounce дашборда                           |

---

## 7. Секреты и безопасность

- Не коммитить: `.env`, `deploy/env/.env.runtime`, `client/.env.local`, `media/`.
- Production-админы: `ADMIN_ACCOUNTS_BASE64` предпочтительнее plain JSON в unit-файлах.
- Internet: [CLOUDFLARE.md](./CLOUDFLARE.md) по желанию; `bash deploy/scripts/cloudflare-verify.sh ваш.домен`.

---

## 8. Краткая шпаргалка команд

```bash
# Dev
docker compose up -d postgres && cp .env.example .env && npm ci && npm run dev

# Тесты
npm run lint && npm test

# Internet env-шаблон
npm run deploy:internet

# Миграции prod
npm run prisma:migrate:deploy

# Нагрузка
BASE_URL=https://example.com QUIZ_SLUG=test-room npm run load:light

# Деплой rsync
bash deploy/scripts/sync-code-to-vps.sh user@host
```

После установки и успешной лестницы нагрузочных тестов для вашего режима (§4) сервер считается готовым к ивенту в заявленных пределах профиля; в день ивента — [EVENT-DAY-CHECKLIST.md](./EVENT-DAY-CHECKLIST.md).
