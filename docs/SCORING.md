# Архитектура скоринга и стейджинга

Документ проектирует, как новые факты собираются, оцениваются группой ревьюеров и попадают (или не попадают) в основной корпус. Скоринг-страница строится отдельно — здесь только спецификация контента-стороны.

---

## Состояние «как сейчас» (текущая боль)

- `collect.mjs` пишет сразу в `facts/topics/{topic}/` — это «прод».
- Каталог `pnpm catalog:serve` показывает всё что в проде; единственный рычаг — удалить через крестик.
- Нет промежуточного состояния «новое, ещё не подтверждённое». Бракованные картинки уже в проде до того, как куратор их увидел.

---

## Состояние «как надо»

```
collect.mjs --batch X
        │
        ▼
   facts/staging/{topic}/      ← новое падает сюда, помеченное "pending"
        │
        ▼
   Scoring UI (отдельный сайт)
        │
        ▼  голоса
        │
   Auto-decision на основе порога:
   • достаточно ❤️  → approve → facts/topics/{topic}/   (прод)
   • достаточно 👎 → reject  → facts/rejected/{topic}/  (архив)
```

---

## Файловая структура

```
facts/
  topics/{topic}/{fact-id}.json    ← одобренный корпус, читается приложением
  topics/{topic}/{fact-id}.webp
  staging/{topic}/{fact-id}.json   ← новое, на голосовании
  staging/{topic}/{fact-id}.webp
  rejected/{topic}/{fact-id}.json  ← отклонённое, для аудита и анти-повторов
  rejected/{topic}/{fact-id}.webp  ← может быть удалено для экономии места
```

`facts/topics/` — единственное что читает приложение. `staging/` и `rejected/` — только для процесса ревью.

---

## Формат JSON в `staging/`

Тот же базовый формат + блок `_review`:

```json
{
  "id": "fact-art-some-painting",
  "topic": "art",
  "title": "...",
  "caption": "...",
  "image": "fact-art-some-painting.webp",
  "credit": "...",
  "source": "...",
  "license": "CC-BY-SA",
  "_review": {
    "status": "pending",
    "added_at": "2026-05-16T11:30:00Z",
    "batch": "batch-54-art-2026-05-16",
    "votes": [
      { "reviewer": "owner",   "verdict": "like",    "at": "2026-05-16T12:01:00Z" },
      { "reviewer": "friend1", "verdict": "dislike", "at": "2026-05-16T12:05:00Z", "reason": "обрезана" },
      { "reviewer": "friend2", "verdict": "like",    "at": "2026-05-16T12:10:00Z" }
    ]
  }
}
```

`_review` — приватное поле, никогда не попадает в `topics/`. Удаляется в момент `approve`.

---

## Правила автоматического решения

В `docs/SCORING.md` фиксируем. Простейший вариант:

| Условие | Действие |
|---|---|
| Голос «owner» = `like` | Сразу одобрено (Право вето) |
| Голос «owner» = `dislike` | Сразу отклонено |
| 3+ дизлайков без лайков owner | Отклонено |
| 3+ лайков и 0 дизлайков owner | Одобрено |
| Висит >30 дней без решения | Авто-reject (вариант: авто-approve) |

Веса можно тюнить позже — это просто JSON в `docs/scoring-rules.json`.

---

## Изменения в `collect.mjs`

Один новый флаг:

```bash
node scripts/collect.mjs --batch X.json [--direct]
```

- по умолчанию — пишет в `facts/staging/{topic}/`, заодно добавляет `_review.status=pending`
- с `--direct` — пишет в `facts/topics/` (для миграций, fix-ups, доверенных батчей)

Этого достаточно. Один if в коде.

---

## CLI-инструменты для ревью (опциональные)

Для нас как curator-владельцев, если скоринг-UI пока нет:

```bash
node scripts/review.mjs list             # все pending facts
node scripts/review.mjs approve <id>     # → topics/
node scripts/review.mjs reject <id> [reason]   # → rejected/
node scripts/review.mjs status <id>      # показать _review
node scripts/review.mjs apply-batch <log.json>   # bulk-apply из лога голосов
```

`apply-batch` важен — скоринг-UI отдельной командой не управляет нашими файлами; он накапливает голоса и в конце сбрасывает один большой JSON с верификтами, мы прогоняем его локально.

---

## API-контракт между скоринг-UI и контент-репо

Двунаправленно. Самый простой вариант — **read-only через raw GitHub + write через GitHub Actions PR**.

### Чтение (скоринг-UI → корпус)

`GET https://raw.githubusercontent.com/prudnikovcons/qs4me-content/main/dist/staging.json`

`dist/staging.json` — собирается build-bundle.mjs из `facts/staging/`. Структура:

```json
[
  {
    "id": "fact-art-X",
    "topic": "art",
    "title": "...",
    "caption": "...",
    "image_url": "https://raw.githubusercontent.com/.../staging/art/fact-art-X.webp",
    "added_at": "...",
    "current_score": { "likes": 2, "dislikes": 1 }
  }
]
```

UI этого хватит для отображения всех pending.

### Запись (скоринг-UI → корпус)

Варианты по сложности:

1. **GitHub PR** — UI открывает PR с обновлённым `_review.votes`. Меньше зависимости от инфраструктуры. Долго.
2. **Edge-функция на Vercel/Cloudflare**, которая принимает голос, аутентифицирует, открывает коммит через GitHub API. Просто масштабируется.
3. **Простой Express-сервер на VPS** — пишет напрямую в локальную копию репо, делает push. Самое быстрое в реализации.

Рекомендую вариант 2 — серверлесс-функция, потому что:
- Не нужно поддерживать VPS
- Аутентификация через GitHub OAuth или magic link
- Голоса записываются как git-коммиты в `facts/staging/*.json` — естественный audit log
- Можно бесплатно жить на Vercel

---

## Что я делаю сейчас

1. ✅ Чиню каталог: `object-fit: cover` → `contain` — никаких визуальных обрезаний.
2. ✅ Чиню DNA — переснял через явный image_filename_override на схему с нуклеотидами и подписями.
3. Готов добавить **staging-режим** в `collect.mjs` (одна правка) — все следующие батчи будут писать в `facts/staging/`, и пока твой скоринг-UI не появится, я смогу их `review.mjs approve` локально.
4. Готов написать `review.mjs` и `apply-batch` команды.
5. Эсперанто: имидж сам ок (флаг 1280×853), проблема была чисто в каталоге через `cover`. С новым `contain` флаг покажется целиком.

---

## Что НЕ делаю

- Скоринг-UI (твоя территория — отдельный сайт).
- OAuth / голосование / база голосов — это бекенд UI-стороны.
- Кодирую только то что в контент-репо.

Жду решения: **переключаю collect.mjs на staging-режим сразу или после первого MVP скоринг-UI?**
