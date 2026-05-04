# Instrumentation Guide

## Обязательные метрики

## Host

- CPU: user/system/iowait.
- RAM: used/free, major page faults.
- Load average.
- Disk IO latency и queue depth.
- Network RX/TX + packet drops.

## Node.js / app

- RPS по HTTP и socket events/s.
- Latency: p50/p95/p99 для `/api/admin/auth`, `quiz:join`, `answer:submit`.
- Socket ошибки: `connect_error`, `error:message`.
- Rate-limit отказы (`/api/admin/auth` и submit anti-flood).

## PostgreSQL

- Активные соединения.
- Среднее/пики query time.
- Slow queries.
- Locks/deadlocks.

## Быстрые команды для Linux (без APM)

```bash
vmstat 1
iostat -x 1
pidstat -rud -p $(pgrep -f "node.*dist/index.js") 1
ss -s
```

Для Postgres:

```sql
select now(), numbackends, xact_commit, xact_rollback, blks_read, blks_hit
from pg_stat_database
where datname = current_database();
```

## Логи и артефакты

- Сохраняйте stdout/stderr backend и reverse proxy.
- Сохраняйте JSON summary каждого прогона (`k6`, `socket`).
- Привязывайте артефакты к профилю и commit SHA.
