# Git Flow

Ветки и релизы для meyouquize.

## Ветки

| Ветка       | Назначение                                                                       |
| ----------- | -------------------------------------------------------------------------------- |
| `main`      | Production. Только merge из `release/*` и `hotfix/*`. На Timeweb — после релиза. |
| `develop`   | Интеграция фич. Деплой на staging / тестовый VPS по необходимости.               |
| `feature/*` | Новая функциональность. База: `develop`.                                         |
| `release/*` | Стабилизация перед релизом (версия, мелкие фиксы). База: `develop`.              |
| `hotfix/*`  | Срочный патч production. База: `main`.                                           |

## Ежедневная работа

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# … коммиты …

git push -u origin feature/my-feature
# PR: feature/my-feature → develop
```

После merge PR удалите feature-ветку на GitHub.

## Релиз

### 1. Начать релиз

```bash
bash scripts/gitflow/release-start.sh 0.2.0
```

- обновляет `version` во всех `package.json`;
- создаёт ветку `release/0.2.0` от `develop`;
- коммит с версией.

На ветке `release/*` — только багфиксы и документация релиза. Новые фичи — в следующий цикл через `develop`.

### 2. Завершить релиз

```bash
bash scripts/gitflow/release-finish.sh 0.2.0
```

- merge `release/0.2.0` → `main`;
- тег `v0.2.0`;
- merge `main` → `develop` (чтобы тег и версия не разъехались);
- удаление `release/0.2.0` локально и на `origin`;
- push `main`, `develop` и тег.

### 3. Деплой production (Timeweb)

```bash
git checkout main
git pull origin main
ssh root@5.129.253.14 'cd /opt/meyouquize/current && git fetch origin && git checkout -B main origin/main && git reset --hard origin/main && npm ci --include=dev && npm run build && npm run prisma:migrate:deploy && systemctl restart meyouquize'
```

Или с локальной машины после `git checkout main`:

```bash
bash deploy/scripts/sync-code-to-vps.sh root@5.129.253.14
```

(скрипт rsync не переключает ветку на VPS — для production предпочтительнее `git checkout main` на сервере, см. выше.)

## Hotfix

```bash
git checkout main
git pull origin main
git checkout -b hotfix/0.2.1
# … фикс …
git commit -m "Fix …"
bash scripts/gitflow/hotfix-finish.sh 0.2.1
```

Hotfix merge в `main` и `develop`, тег `v0.2.1`, деплой с `main`.

## CI

GitHub Actions на push/PR в: `main`, `develop`, `release/*`, `hotfix/*`.

## Версионирование

[SemVer](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **MINOR** — новые фичи в релизе (`0.1.0` → `0.2.0`, фотостена и т.д.).
- **PATCH** — hotfix или мелкие правки на release-ветке.
- **MAJOR** — ломающие изменения API/контрактов.

Теги: `v0.2.0` на коммите в `main`.

## Текущее состояние

- `feature/projector-photo-wall` уже влита в `develop` (коммит `a137bd1`).
- Следующий релиз с фотостеной: `bash scripts/gitflow/release-start.sh 0.2.0`.
