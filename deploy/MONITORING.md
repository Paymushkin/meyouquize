# Мониторинг и алерты

Наблюдаемость для боевых ивентов: разбор логов после мероприятия и простые алерты на VPS.

## Trial-логи на проде

По умолчанию **выключены** (`DEBUG_TRIAL_LOGS=0`). Включать только на время ивента в `deploy/env/.env.runtime`:

```bash
DEBUG_TRIAL_LOGS=1
```

После ивента верните `0` и `sudo systemctl restart meyouquize`, чтобы не раздувать journal.

## Лимиты journald на VPS

Чтобы логи не заполняли диск:

```bash
sudo cp /opt/meyouquize/current/deploy/systemd/journald-meyouquize.conf /etc/systemd/journald.conf.d/meyouquize.conf
sudo systemctl restart systemd-journald
```

Лимиты: **500 MB** на диске, хранение до **14 дней** (`deploy/systemd/journald-meyouquize.conf`).

## Socket connect/disconnect

На проде логи `[socket] connected` / `disconnected` **не пишутся** (только в `npm run dev` или при `DEBUG_SOCKET_LOGS=1`).

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

Три сценария имитации ивента (HTTP + сокеты + голосование + вопросы спикерам):

```bash
BASE_URL=https://meyou.site QUIZ_SLUG=test-load-room npm run load:light    # 100 игроков
BASE_URL=https://meyou.site QUIZ_SLUG=test-load-room npm run load:normal  # 300 игроков
BASE_URL=https://meyou.site QUIZ_SLUG=test-load-room npm run load:peak    # 500 — после light
```

Профили: `load/profiles/event-light-100.json`, `event-normal-300.json`, `event-peak-500.json`.

Критерий готовности: `joined_ok` близко к `PLAYER_COUNT`, submit fail rate &lt; 5%, без роста `ping timeout` в journal во время прогона.

Подготовка комнаты и правила прогона на prod — в `load/README.md`.

## Связанные документы

- [EVENT-DAY-CHECKLIST.md](./EVENT-DAY-CHECKLIST.md) — чеклист дня ивента
- [DEPLOYMENT.md](./DEPLOYMENT.md) — деплой и systemd
- `load/README.md` — полный load testing kit
