# Pre-Prod Checklist

## 1) Паритет окружения

- Та же major/minor версия Node.js, что и на production.
- Тот же reverse proxy (Caddy) и аналогичный TLS/keepalive конфиг.
- Та же версия PostgreSQL.
- Те же ключевые env-переменные:
  - `APP_NETWORK_MODE`
  - `CLIENT_ORIGIN`
  - `DATABASE_URL` (включая `connection_limit`, при PgBouncer — `pgbouncer=true`)
  - `DIRECT_URL` (прямой Postgres для migrate; без пула совпадает с `DATABASE_URL`)
  - `DASHBOARD_RESULTS_DEBOUNCE_MS`
  - `REDIS_URL` (если в production используется horizontal scale Socket.IO)

## 2) Размеры стенда

- Минимум тот же класс CPU/RAM, что на production.
- Диск и сеть не хуже production baseline.
- Отдельная БД/схема для нагрузочных прогонов.

## 3) Тестовые данные

- Создано минимум 1 мероприятие с 30-80 вопросами.
- В активной комнате есть вопрос с вариантами ответов.
- Есть отдельная учётка админа только для тестов.

## 4) Предполетная проверка

- `/healthz` и `/readyz` возвращают `200`.
- Админ-логин успешен.
- Игрок может пройти `quiz:join`.
- В логах нет ошибок миграций, CORS и Socket.IO handshakes.

## 5) Контроль изменений

- На время прогона зафиксированы: commit SHA, env snapshot, версия БД.
- Отключены нерелевантные фоновые задачи на хосте.
- Включена ротация логов, чтобы не упереться в диск.
