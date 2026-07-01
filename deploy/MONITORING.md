# Мониторинг и алерты

Наблюдаемость для боевых ивентов: разбор логов после мероприятия и простые алерты на VPS.

## Trial-логи на проде

В `deploy/env/.env.runtime`:

```bash
DEBUG_TRIAL_LOGS=1
```

Без этого в journal останутся только `[socket] disconnected` и системные строки — сводка `post-event-log-summary` будет неполной.

После ивента можно вернуть `0`, чтобы не раздувать journal.

## Сводка логов после ивента

Скрипт: `deploy/scripts/post-event-log-summary.sh`

```bash
chmod +x deploy/scripts/post-event-log-summary.sh deploy/scripts/post-event-log-summary.mjs

# На VPS (локальный journalctl):
./deploy/scripts/post-event-log-summary.sh \
  --since "2026-06-30 03:00:00" \
  --until "2026-06-30 10:00:00"

# Через SSH:
./deploy/scripts/post-event-log-summary.sh \
  --ssh root@135.106.147.38 \
  --since "2026-06-30 03:00:00" \
  --until "2026-06-30 10:00:00"

# Из сохранённого файла:
journalctl -u meyouquize --since today > /tmp/mq.log
./deploy/scripts/post-event-log-summary.sh --stdin < /tmp/mq.log
```

Отчёт включает: `quiz_join_ok`, `answer_submit_ok` / `answer_submit_error` (с разбивкой по тексту ошибки), `ping timeout`, причины disconnect, `unhandledRejection`, рестарты systemd.

npm:

```bash
npm run ops:log-summary -- --ssh root@HOST --since "..." --until "..."
```

## Алерты в реальном времени

Скрипт: `deploy/scripts/meyouquize-log-alerts.sh`

Пороги (env):

| Переменная               | По умолчанию | Смысл                                          |
| ------------------------ | ------------ | ---------------------------------------------- |
| `ALERT_WINDOW_MIN`       | 5            | Окно journalctl                                |
| `ALERT_PING_TIMEOUT_MAX` | 15           | Макс. упоминаний ping timeout за окно          |
| `ALERT_UNHANDLED_MAX`    | 0            | Любой `unhandledRejection` → алерт             |
| `ALERT_RESTART_MAX`      | 0            | Любой `Started Meyouquize` за окно → алерт     |
| `ALERT_WEBHOOK_URL`      | —            | Опционально POST JSON (Telegram/Slack gateway) |

Ручная проверка:

```bash
./deploy/scripts/meyouquize-log-alerts.sh
echo $?   # 0 = ok, 1 = алерт
```

### systemd timer (рекомендуется на VPS)

```bash
sudo cp deploy/systemd/meyouquize-log-alerts.service /etc/systemd/system/
sudo cp deploy/systemd/meyouquize-log-alerts.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now meyouquize-log-alerts.timer
systemctl status meyouquize-log-alerts.timer
```

Таймер запускает проверку каждые 5 минут. При алерте exit code 1 — можно подключить `OnFailure=` unit с отправкой в почту или webhook.

Опционально в `deploy/env/.env.runtime`:

```bash
ALERT_PING_TIMEOUT_MAX=20
ALERT_WEBHOOK_URL=https://your-hook.example/alert
```

## Нагрузочный прогон перед ивентом

Профиль **400 одновременных join** (без submit):

```bash
BASE_URL=https://preprod.example.com QUIZ_SLUG=room-slug npm run load:event-400
```

Профиль: `load/profiles/event-400-join.json` — 400 игроков, ramp 20 с, удержание 60 с.

Критерий готовности: `joined_ok` ≥ 396/400 (tolerance 4), без роста `ping timeout` в journal во время прогона.

## Связанные документы

- [EVENT-DAY-CHECKLIST.md](./EVENT-DAY-CHECKLIST.md) — чеклист дня ивента
- [DEPLOYMENT.md](./DEPLOYMENT.md) — деплой и systemd
- `load/README.md` — полный load testing kit
