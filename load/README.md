# Load Testing Kit

Этот набор нужен для прогона нагрузки, близкой к реальному мероприятию:

- много игроков через Socket.IO (`quiz:join`, `answer:submit`, `reaction:toggle`);
- умеренный HTTP-трафик (`/healthz`, `/readyz`, `/api/admin/auth`);
- пиковые волны ответов и длинный soak-прогон.

## Структура

- `preprod-checklist.md` — как подготовить стенд, похожий на production.
- `instrumentation.md` — какие метрики и где собирать.
- `k6-http.js` — HTTP-нагрузка (health/readiness/admin-auth).
- `artillery-socket.yml` + `processor.js` — Socket.IO профиль игроков.
- `profiles/*.json` — параметры для smoke/nominal/peak/soak.
- `run.sh` — запуск одного профиля и сохранение артефактов.
- `run-matrix.sh` — последовательный прогон smoke → nominal → peak → soak.
- `report-template.md` — шаблон итогового go/no-go отчёта.
- `tuning-playbook.md` — что и как крутить по результатам.
- `compare-results.mjs` — сравнение before/after после тюнинга.

## Быстрый старт

1. Подготовьте pre-prod по `preprod-checklist.md`.
2. Заполните профиль, например `profiles/nominal.json`.
3. Запустите:

```bash
chmod +x load/run.sh
BASE_URL="https://preprod.example.com" QUIZ_SLUG="spring-forum" ADMIN_LOGIN="admin" ADMIN_PASSWORD="secret" load/run.sh nominal
```

Артефакты каждого прогона сохраняются в `load/results/<timestamp>-<profile>/`.

Чтобы видеть рост `Онлайн` в админке, используйте `hold_ms` в профиле (клиенты остаются подключены после join/submit).
По умолчанию в профилях уже добавлены безопасные значения `hold_ms`.

Реалистичное голосование (как на мероприятии): в `profiles/nominal.json` включены `realistic_vote`, `vote_window_ms` (окно, например 60 с), `vote_distribution` (`normal` или `uniform`), `submit_timeout_ms`. Все игроки остаются в сокете на всё окно; голоса уходят в случайные моменты внутри окна, а не одним burst.

Чтобы не «ронять» прод одновременно с **k6** и сотнями WebSocket, в `nominal` по умолчанию `run_http: false` (только сокеты). Параллельный k6 на `/healthz` даёт тысячи RPS и вместе с join-штормом может забить event loop Node — на графике CPU у хостера это не обязательно 100%.

**Админка / проектор открыты в браузере:** полный `nominal` (500 сокетов + голосование) часто делает так, что **HTTP и сокеты админки не успевают** — это один пул Node. Для прогона «не убить панель» используйте **`nominal-ui`** (~220 игроков, длиннее ramp и таймауты) или **`smoke`**. Полный `nominal` — лучше без открытой админки или на preprod.

**Цель — тот же объём игроков (210), но админка открыта:** профиль **`nominal-admin`** — `run_dashboard: false` (нет лишнего observer-сокета и лишних пересчётов дашборда из скрипта), **длиннее** `vote_window_ms` (120 с) и **`submit_timeout_ms` 90 с**, мягче join-ramp. Это снижает одновременную нагрузку на БД и даёт серверу время ответить на `answer:submit`, пока ваш браузер тоже в очереди. Полный «как nominal 500» с админкой на одном VPS без апгрейда железа, как правило, **недостижим** — упирается в один пул Node/Postgres.

Растягивание подключений: `join_ramp_ms` (например 45000) и `join_ack_timeout_ms` — в `server/scripts/socket-load-burst.mjs`.

Переживать редкие `connect_error` при join: переменные окружения **`JOIN_CONNECT_RETRIES`** (по умолчанию 3), **`JOIN_CONNECT_BACKOFF_MS`** (пауза между попытками), **`JOIN_FAIL_TOLERANCE`** (сколько неуспешных join допускается без exit 1; по умолчанию 1, `0` = строго все).

Если нужно гарантированно отправлять голоса даже при нестабильном `state:quiz`, можно явно передать:

- `QUIZ_ID`
- `QUESTION_ID`
- `OPTION_ID`

Пример:

```bash
BASE_URL="https://preprod.example.com" \
QUIZ_SLUG="spring-forum" \
QUIZ_ID="cm..." QUESTION_ID="cm..." OPTION_ID="cm..." \
bash load/run.sh smoke
```

Полный цикл:

```bash
BASE_URL="https://preprod.example.com" QUIZ_SLUG="spring-forum" load/run-matrix.sh
```

## Минимальные критерии готовности

- HTTP `p95 < 500ms` (критичные эндпоинты).
- Socket round-trip (`join`/`submit`) `p95 < 700ms`.
- Error-rate < 1% на nominal и < 2% на peak.
- Нет устойчивой деградации памяти на soak.
