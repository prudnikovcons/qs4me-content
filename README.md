# qs4me-content

Источник правды для приложения **qs4.me** — образовательные факты (картинка + RU-подпись), вопросы и потоки.

Этот репозиторий **не зависит от приложения**. Его наполняют три независимых чата:

- **Картинки** (`/facts/`) — отдельный чат, который абстрагирован от того, *где* и *как* приложение использует факты. Источник: Wikimedia, NASA APOD, Wikidata, любые открытые лицензии (PD/CC0/CC-BY/CC-BY-SA).
- **Вопросы и потоки** (`/questions/`) — отдельный чат, авторский корпус: 1500+ счётных вопросов + sequential streams (пошаговые практики) + playlists (тематические подборки).
- **Музыка** (`/music/`) — отдельный чат, классика в общественном достоянии: треки (mp3) + композиторы + исполнители (с фото) + курируемые плейлисты + описания эпох/стилей/десятилетий. Источник: Musopen, Internet Archive (Musopen collection), Open Goldberg, IMSLP.

Приложение тянет это всё на build-time или runtime по фиксированным схемам.

---

## Структура

```
qs4me-content/
├── schemas/                       # JSON Schema контракты
│   ├── fact.schema.json
│   ├── question.schema.json
│   ├── stream.schema.json
│   └── playlist.schema.json
├── facts/
│   └── topics/
│       ├── country/                # каждая папка = один topic
│       │   ├── _index.json         # список id в этой папке (auto-built)
│       │   ├── fact-country-france.json
│       │   ├── fact-country-france.webp
│       │   ├── fact-country-japan.json
│       │   ├── fact-country-japan.webp
│       │   └── ...
│       ├── element/
│       ├── space/
│       └── ...
├── questions/
│   ├── _index.json                 # auto-built list of all public_ids
│   ├── q-0001.json, q-0002.json … # один файл на вопрос
│   ├── streams/                    # пошаговые практики
│   │   └── morning-start.json, evening-reflection.json, …
│   └── playlists/                  # system-подборки
│       └── morning_reset.json, memory_sparks.json, …
├── examples/                       # минимальные образцы
│   ├── fact.example.json
│   ├── question.example.json
│   └── stream.example.json
├── scripts/                        # вспомогательные ноды
│   ├── validate.mjs                # JSON Schema проверка всего
│   ├── build-index.mjs             # генерация _index.json
│   └── build-bundle.mjs            # сборка facts.json / questions.json / streams.json для приложения
├── docs/
│   ├── CONTRACT.md                 # правила контракта, версионирование, что нельзя
│   ├── IMAGES_PROMPT.md            # стартовый промт для чата картинок
│   └── QUESTIONS_PROMPT.md         # стартовый промт для чата вопросов
└── README.md
```

---

## Принципы

1. **Атомарность.** Один факт = один JSON-файл + один файл картинки рядом. Один вопрос = один JSON-файл. Это сводит конфликты при параллельной работе двух чатов почти к нулю.

2. **Один контракт.** Все три типа сущностей валидируются по JSON Schema. Любой PR обязан проходить `pnpm validate` без ошибок.

3. **Версионирование схем.** Меняется схема → bump `version` в `schemas/{x}.schema.json` и обновление документации. Старые записи продолжают работать (схема расширяется только обратно-совместимо).

4. **Никаких внешних API в runtime приложения.** Картинки лежат локально в репо как файлы (`.webp` / `.jpg`). На сторону клиента отдаются через Vercel CDN. Никакого hot-link к Wikimedia в production.

5. **Лицензии.** Принимаем только PD / CC0 / CC-BY / CC-BY-SA. CC-BY-NC / fair-use / proprietary — отклоняем на этапе валидации.

6. **Bundle.** Приложение тянет не «сырые» 1500 файлов, а **собранные bundle'ы**: `dist/facts.json`, `dist/questions.json`, `dist/streams.json`, `dist/playlists.json`. Bundle регенерируется на каждый push в main через GitHub Action.

---

## Workflow

### Для чатов-контент-генераторов

1. Открой `docs/IMAGES_PROMPT.md` или `docs/QUESTIONS_PROMPT.md`. Скопируй в свой чат как первое сообщение.
2. Чат генерирует одну или несколько записей.
3. Каждая запись = новый файл в `/facts/topics/{topic}/` или `/questions/`.
4. После пачки — запусти `node scripts/validate.mjs` и `node scripts/build-index.mjs`.
5. Коммит, push.

### Для интеграционного чата (приложение qs4.me)

1. Клонит этот репо на build-time (через git submodule или curl raw URLs).
2. Использует `dist/facts.json`, `dist/questions.json`, `dist/streams.json`, `dist/playlists.json`.
3. Картинки копирует в `public/facts/`.
4. На push в `main` репозитория `qs4me-content` — Vercel webhook автоматически переразвёртывает приложение.

---

## Quick start (для контент-чатов)

```bash
git clone https://github.com/<owner>/qs4me-content.git
cd qs4me-content
pnpm install      # ставит ajv для валидации
pnpm validate     # проверяет все JSON по схемам
pnpm build        # генерирует dist/*.json bundles
```

---

## Документы

- [`docs/CONTRACT.md`](docs/CONTRACT.md) — полный контракт, правила, версионирование
- [`docs/IMAGES_PROMPT.md`](docs/IMAGES_PROMPT.md) — стартовый промт для чата картинок
- [`docs/QUESTIONS_PROMPT.md`](docs/QUESTIONS_PROMPT.md) — стартовый промт для чата вопросов
- [`docs/MUSIC_PROMPT.md`](docs/MUSIC_PROMPT.md) — стартовый промт для чата музыки
- [`docs/INTEGRATION.md`](docs/INTEGRATION.md) — как приложение это всё подключает

---

## Лицензии

- **Структура и код** этого репо: MIT
- **Картинки** в `/facts/`: каждая по своей оригинальной лицензии (PD / CC0 / CC-BY / CC-BY-SA), всегда указанной в поле `license` соответствующего JSON
- **Тексты** (вопросы, подписи, статьи): CC-BY 4.0 от авторов, если не указано иное
