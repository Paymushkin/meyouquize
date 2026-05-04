# Tuning Playbook

## 1) Если высокие p95/p99 на всплесках submit

- Увеличить `DASHBOARD_RESULTS_DEBOUNCE_MS` шагом +40..+80 мс.
- Повторить `nominal` и `peak`, сравнить p95/p99 и задержку первого dashboard push.
- Остановиться на минимальном значении, где ошибка/латентность стабилизируются.

## 2) Если упираемся в PostgreSQL connections

- Включить **PgBouncer** (`pool_mode = transaction`): `DATABASE_URL` → `127.0.0.1:6432?pgbouncer=true&connection_limit=…`, `DIRECT_URL` → прямой Postgres `:5432` (см. `deploy/DEPLOYMENT.md`).
- Подстроить `default_pool_size` в PgBouncer так, чтобы реальные backend-сессии к Postgres оставляли запас до `max_connections`.
- Без пула: `connection_limit` в `DATABASE_URL` под размер VM; `DIRECT_URL` совпадает с `DATABASE_URL`.
- Перезапустить и повторить `nominal` + `soak`.

## 3) Если много отказов по submit anti-flood

- Проверить, нет ли нереалистичного профиля в генераторе нагрузки.
- Для тестов, имитирующих реальных игроков, не превышать человеческий темп отправки.
- Если нужно, отдельно прогнать abuse-сценарий и оставить production лимит строгим.

## 4) Если растет память на soak

- Снять heap snapshot и сравнить до/после.
- Проверить retention больших структур в socket/session кэше.
- Повторить soak после фикса.

## 5) Минимальный цикл тюнинга

1. baseline: `nominal`
2. стресс: `peak`
3. изменить один параметр
4. rerun: `nominal` + `peak`
5. сравнить отчеты и принять/откатить изменение
