# Чеклист дня ивента

Ориентир: зал 200–400 человек, один ведущий + оператор проектора.

## За 24 часа

- [ ] Pre-prod / staging: `BASE_URL=… QUIZ_SLUG=… npm run load:light` (или `load:normal`) — без массовых ошибок join/submit.
- [ ] На проде: `DEBUG_TRIAL_LOGS=1` в `deploy/env/.env.runtime` (для post-event сводки).
- [ ] `SOCKET_IO_PING_TIMEOUT_MS=90000` на проде (см. `deploy/env/.env.internet.example`).
- [ ] Деплой только через `deploy/scripts/sync-code-to-vps.sh` (не трогает `media/`).
- [ ] Установлены алерты: `meyouquize-log-alerts.timer` (см. [MONITORING.md](./MONITORING.md)).
- [ ] Бэкап БД / снимок VPS по политике хостера.

## Утро ивента (T−2 ч)

```bash
./deploy/scripts/event-day-check.sh
# или с явным URL:
BASE_URL=https://ваш-домен ./deploy/scripts/event-day-check.sh
```

- [ ] `healthz` / `readyz` — 200.
- [ ] `MEDIA_DIR` существует и доступен на запись (загрузки баннеров/логотипов).
- [ ] Redis + PgBouncer (если `CLUSTER_WORKERS` > 1) — работают.
- [ ] Комната ивента создана, тестовый `quiz:join` с телефона.
- [ ] **Hard refresh** вкладок: админка, проектор, вкладка «Результаты» (Ctrl+Shift+R / Cmd+Shift+R).
- [ ] QR / ссылка входа на проекторе открывается с мобильного LTE (не только Wi‑Fi зала).
- [ ] Плитка **«Вопросы спикерам» выключена**, если не планируется в первый блок.
- [ ] Проверка одного голосования end-to-end (вопрос → ответ → дашборд).

## Во время ивента

- [ ] Следить за «Онлайн» в админке при пике входа.
- [ ] Не открывать лишние вкладки админки (каждая — сокет + HTTP).
- [ ] При «зависании» проектора: F5 на `/projector/…`, не трогать плитки без необходимости.
- [ ] При массовых disconnect: `journalctl -u meyouquize -f` — смотреть `ping timeout` vs `transport close`.

## После ивента

```bash
./deploy/scripts/post-event-log-summary.sh \
  --ssh root@ВАШ_VPS \
  --since "YYYY-MM-DD 03:00:00" \
  --until "YYYY-MM-DD 10:00:00"
```

- [ ] Сохранить вывод сводки в `deploy/ops/` (локально, не в git).
- [ ] Сравнить `quiz_join_ok`, `answer_submit_error`, `ping timeout` с прошлым ивентом.
- [ ] При необходимости: `DEBUG_TRIAL_LOGS=0` на проде до следующего ивента.

## Быстрые команды

| Действие               | Команда                                                        |
| ---------------------- | -------------------------------------------------------------- |
| Проверка перед стартом | `./deploy/scripts/event-day-check.sh`                          |
| Нагрузка (репетиция)   | `BASE_URL=… QUIZ_SLUG=… npm run load:light` / `load:normal`    |
| Сводка логов           | `./deploy/scripts/post-event-log-summary.sh --ssh … --since …` |
| Ручной алерт-чек       | `./deploy/scripts/meyouquize-log-alerts.sh`                    |
| Статус таймера         | `systemctl status meyouquize-log-alerts.timer`                 |

См. также: [MONITORING.md](./MONITORING.md), [DEPLOYMENT.md](./DEPLOYMENT.md), `load/README.md`.
