# meyouquize

Интерактивные квизы и голосования для мероприятий.

## Тестирование

| Команда                    | Что запускает                                     |
| -------------------------- | ------------------------------------------------- |
| `npm run test:unit`        | Unit-тесты shared, server, client                 |
| `npm run test:integration` | Integration server + Postgres (`meyouquize_test`) |
| `npm test`                 | unit + integration                                |
| `npm run test:e2e`         | Playwright full stack (API + Vite + Postgres)     |
| `npm run test:coverage`    | Coverage v8 с порогами в CI                       |

### Conventions

- **Unit** — рядом с кодом: `*.test.ts` / `*.test.tsx`
- **Integration** — только `server/tests/integration/` (реальная test DB, `TEST_DATABASE=1`)
- **E2E** — только user journeys в `e2e/` (fixture seed, без dev seed)
- **Не писать** в prod/dev БД и `media/` — только `meyouquize_test` и temp `MEDIA_DIR`

Локально для integration:

```bash
docker run --name meyouquize-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=meyouquize_test -p 5432:5432 -d postgres:16
cp .env.test.example .env.test
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/meyouquize_test npm run test:integration
```

### Coverage thresholds (CI)

Пороги считаются по **scoped include** в `vitest.config.ts` — не по всему пакету (страницы и monolith-сервисы покрываются E2E / integration).

| Пакет  | Scope                                                        | lines | branches |
| ------ | ------------------------------------------------------------ | ----- | -------- |
| shared | `shared/src/**`                                              | 80%   | 80%      |
| server | scoring, profanity, reactions, cors, rate-limit              | 70%   | 55%      |
| client | extracted logic (features/hooks/admin/utils, не page shells) | 60%   | 55%      |

Отчёты: `shared/coverage`, `server/coverage`, `client/coverage` (lcov → Codecov при `CODECOV_TOKEN` в secrets).

## CI

GitHub Actions: `quality` (lint + coverage + build), `integration`, `e2e`.
