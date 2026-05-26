# Мероприятие в локальной Wi‑Fi (LAN)

Режим без интернета: сервер на вашем Mac, участники по Wi‑Fi открывают `http://<IP-хоста>/`.

Оптимизировано для **200–300** одновременных подключений: несколько Node-воркеров, Redis для Socket.IO, лимит соединений Prisma, дебаунс дашборда.

## Требования

| Компонент       | macOS                                                                                  |
| --------------- | -------------------------------------------------------------------------------------- |
| Node 20+        | уже в проекте                                                                          |
| PostgreSQL      | `docker compose up -d postgres` или локальный Postgres                                 |
| Redis           | `brew install redis && brew services start redis` **или** `docker compose up -d redis` |
| Caddy (порт 80) | `brew install caddy`                                                                   |

Mac **по кабелю** к роутеру; телефоны — по Wi‑Fi. Слабый роутер на 300 клиентов может упереться в эфир раньше, чем приложение.

## Быстрый старт

```bash
# 1. Поднять БД (если ещё нет)
docker compose up -d postgres redis

# 2. Создать конфиг с вашим LAN IP и скопировать в .env
npm run event:init

# 3. Задать надёжный пароль админа
nano .env   # ADMIN_PASSWORD=…

# 4. Проверить Redis / Postgres / Caddy
npm run event:check

# 5. Сборка, миграции, запуск (backend + Caddy :80)
npm run event:start
# при «permission denied» на порту 80:
sudo npm run event:start
```

После старта:

- **Игроки:** `http://<LAN_IP>/` (slug в пути, как настроено в комнате)
- **Админка:** `http://<LAN_IP>/admin/<slug>`

IP подставляется в `event:init` автоматически (`en0` и др.). Вручную: `LAN_HOST=192.168.0.5 npm run event:init`.

## Что включено в конфигурации

Файл-шаблон: `deploy/env/.env.lan.event.example` → после `event:init` → `deploy/env/.env.runtime` и `.env`.

| Параметр                            | Значение                 | Зачем                                   |
| ----------------------------------- | ------------------------ | --------------------------------------- |
| `CLUSTER_WORKERS=auto`              | до 8 воркеров            | загрузка по ядрам CPU                   |
| `REDIS_URL`                         | `redis://127.0.0.1:6379` | общие комнаты Socket.IO между воркерами |
| `DATABASE_URL?connection_limit=6`   | на воркер                | не исчерпать Postgres                   |
| `DASHBOARD_RESULTS_DEBOUNCE_MS=280` | дебаунс                  | меньше пиков при голосовании            |
| `QUIZ_ONLINE_COUNT_DEBOUNCE_MS=400` | дебаунс                  | дешевле счётчик «Онлайн»                |

Сервер читает сначала `.env`, затем переопределяет из `deploy/env/.env.runtime` (`server/src/env.ts`).

## Проверка перед ивентом

На том же Mac, с поднятым `event:start`:

```bash
# в другом терминале, подставьте IP и slug
BASE_URL="http://192.168.x.x" QUIZ_SLUG="your-slug" npm run load:nominal-admin
```

Профиль `nominal-admin` (~210 игроков) рассчитан на работающую админку. Полный `load:nominal` (500) — без открытой админки.

## Остановка

`Ctrl+C` в терминале с `event:start` (останавливает backend и Caddy).

Redis/Postgres в Docker:

```bash
docker compose stop redis postgres
```

## Отличие от `deploy:lan`

|          | `npm run deploy:lan` | `npm run event:init`     |
| -------- | -------------------- | ------------------------ |
| Воркеры  | 1                    | auto (Redis)             |
| Сценарий | простой LAN / VPS    | мероприятие 200–300 чел. |

На VPS для LAN-мероприятия можно скопировать те же переменные из `.env.lan.event.example` в `deploy/env/.env.runtime` и использовать `deploy/caddy/Caddyfile.lan` с путём `/opt/meyouquize/current`.

## Устранение неполадок

**`CLUSTER_WORKERS>1 requires REDIS_URL`** — запустите Redis, проверьте `npm run event:check`.

**Участники не открывают сайт** — тот же Wi‑Fi, правильный IP, на Mac отключён сон, файрвол разрешает вход на :80.

**Админка тормозит на пике голосования** — нормально при 300+ активных submit; не гоните всех в одну секунду, используйте окно голосования.

**Caddy / порт 80** — `sudo npm run event:start` или `setcap` для caddy; альтернатива без Caddy — только backend на :4000 (участникам `http://IP:4000` не подойдёт для SPA без отдельной раздачи фронта).
