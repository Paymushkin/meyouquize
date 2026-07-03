# Нагрузочные тесты ивента

Три сценария имитируют поведение игроков на мероприятии: загрузка страницы и статики, вход по Socket.IO, голосование, вопросы спикерам и реакции.

## Профили

| npm-скрипт    | Профиль            | Игроков | Целевое время | join ramp | Голосование | hold |
| ------------- | ------------------ | ------- | ------------- | --------- | ----------- | ---- |
| `load:light`  | `event-light-100`  | 100     | **~1 мин**    | 8 с       | 24 с        | 18 с |
| `load:normal` | `event-normal-300` | 300     | **~2 мин**    | 20 с      | 63 с        | 26 с |
| `load:peak`   | `event-peak-500`   | 500     | **~3 мин**    | 28 с      | 90 с        | 46 с |
| `load:stress` | `event-stress-700` | 700     | **~4 мин**    | 40 с      | 120 с       | 60 с |

Фактическое время чуть больше за счёт HTTP/join и сетевых задержек; в логе — `[event-load] done in …ms`.

Доли поведения (одинаковые): ~10% создают вопрос спикеру, ~30% ставят реакцию на вопрос, ~15% шлют `reaction:toggle`.

## Подготовка комнаты (вручную в админке)

1. Отдельная тестовая комната (`QUIZ_SLUG`), не используемая на живом ивенте.
2. Открыт активный вопрос с вариантами ответа (single/multi).
3. Включены «Вопросы спикерам»: список спикеров, реакции.
4. `/healthz` и `/readyz` отвечают `200`.

Если `state:quiz` не отдаёт активный вопрос, передайте явно:

```bash
QUIZ_ID=... QUESTION_ID=... OPTION_ID=...
```

## Запуск

```bash
BASE_URL=https://meyou.site \
QUIZ_SLUG=test-load-room \
npm run load:light
```

Профили:

```bash
npm run load:light    # 100 игроков
npm run load:normal   # 300 игроков
npm run load:peak     # 500 игроков — только после успешного light
npm run load:stress   # 700 игроков — после успешного peak
```

Артефакты: `load/results/<timestamp>-<profile>/` (`event-load.log`, `summary.json`, `meta.env`).

Прямой запуск скрипта:

```bash
cd server
BASE_URL=http://localhost:4000 QUIZ_SLUG=room1 node scripts/event-load.mjs
```

## Что измеряется

Скрипт [`server/scripts/event-load.mjs`](../server/scripts/event-load.mjs) логирует:

- `http_bootstrap_ms` — `/q/{slug}`, assets, `/api/quiz/by-slug/{slug}/meta`
- `join_ack_ms` — `quiz:join` → `quiz:joined`
- `submit_roundtrip_ms` — голосование в окне `vote_window_ms`
- `speaker_create_ms`, `speaker_react_ms`, `reaction_ms`
- error-rate и top fail reasons

Exit code `1`, если в блоке **ИТОГ ПРОГОНА** статус **ПРОВАЛ** (join/submit/speaker/reactions).

После прогона в консоли и в `summary.json` — поле `passed` и `verdict`.

## Прогон на production (meyou.site)

Допустимо для честной проверки боевого стенда. Рекомендации:

- отдельная комната, не ивентовая;
- окно вне пика (ночь/утро);
- сначала `load:light`, затем `normal`, затем `peak`;
- при деградации админки или росте ошибок — прервать прогон.

После прогона: [deploy/MONITORING.md](../deploy/MONITORING.md) (логи, `ops:log-summary`).

## Структура

- `profiles/event-light-100.json` — лёгкий сценарий
- `profiles/event-normal-300.json` — рабочая нагрузка
- `profiles/event-peak-500.json` — пик
- `run.sh` — оркестратор
- `server/scripts/event-load-helpers.mjs` — чистые хелперы (unit-тесты)
