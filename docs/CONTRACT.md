# Контракт между чатами и приложением qs4.me

Этот документ — формальное соглашение. Любая запись, проходящая через `qs4me-content`, обязана ему соответствовать.

---

## 0. Слова, которые мы используем

| Слово | Что значит |
|---|---|
| **Факт** | Один независимый образовательный кусочек: картинка + RU-заголовок + RU-подпись + ссылка на источник + лицензия |
| **Вопрос** | Один счётный вопрос. Подразумевает мысленный список из 3–20 ответов |
| **Поток** (sequential stream) | Фиксированный набор вопросов в фиксированном порядке — пошаговая практика с началом и концом |
| **Подборка** (playlist) | Тематический набор вопросов без фиксированного порядка. В ленте крутится случайно |
| **Категория** | Один из 15 базовых slug'ов: `morning, memory, work, creative, reflection, children, social, philosophy, meta, epistemology, modelling, linguistics, senses, imagination, absurd` |
| **Bundle** | Собранный JSON со всеми записями одного типа: `dist/facts.json`, `dist/questions.json`, и т.д. |

Факт и вопрос — **независимые сущности**. Картинка никогда не «привязана» к конкретному вопросу. Приложение случайно объединяет факт сверху и вопрос снизу при показе карточки.

---

## 1. Файловая структура

### Факты

```
facts/topics/{topic}/{fact-id}.json
facts/topics/{topic}/{fact-id}.{webp|jpg|png}
```

- Один JSON + одна картинка рядом, с тем же именем.
- `{topic}` — папка-категория (country, element, space, history, art, nature, quote, architecture, food, science, language, math, music, economy, infographics, materials, terms, ratings, events).
- `{fact-id}` начинается с `fact-{topic}-{slug}`. Slug должен быть устойчивым (не меняй после публикации — это сломает кеши).

### Вопросы

```
questions/q-XXXX.json
```

- Один JSON на вопрос.
- `public_id` = `qtx-XXXX` где XXXX — 4-5 цифр.
- Файл называется по `public_id`: `q-0001.json` для `qtx-0001` (без префикса qtx- в имени файла для краткости).

### Потоки

```
questions/streams/{stream-id}.json
```

### Подборки

```
questions/playlists/{playlist-slug}.json
```

---

## 2. Контракт каждой сущности

### Факт (`schemas/fact.schema.json`)

```json
{
  "id": "fact-country-france",
  "topic": "country",
  "title": "Франция · Эйфелева башня",
  "caption": "324 м, построена в 1889 на Всемирную выставку. Должна была простоять 20 лет — стоит уже 136.",
  "image": "fact-country-france.webp",
  "image_width": 1280,
  "image_height": 1707,
  "alt": "Эйфелева башня в Париже",
  "credit": "Anthony Delanoix · CC0 · Wikimedia",
  "source": "https://en.wikipedia.org/wiki/Eiffel_Tower",
  "license": "CC0",
  "year": 1889,
  "meta": { "country_code": "FR" }
}
```

**Жёсткие требования к тексту:**
- `title`: ≤ 36 символов, без многоточий, без эмодзи. Russian. Может содержать «·» как разделитель.
- `caption`: ≤ 145 символов, 1–2 предложения, **факт + цифра/дата** (год, размер, количество). Не клише, не пафос.
- `alt`: 1 описательная фраза для accessibility.
- `credit`: формат «Автор · год · лицензия» или «Источник · лицензия».
- `license`: только `PD`, `CC0`, `CC-BY`, `CC-BY-SA`. Все остальные ОТКЛОНЯЕМ.

**Жёсткие требования к картинке:**
- Формат `webp` (предпочтительно), `jpg`, `png`. SVG только если нет растрового варианта.
- Минимум 800px по короткой стороне.
- ≤ 400 KB (после конвертации).
- Не больше 1600x1600.
- Скачана физически, лежит рядом с JSON. **Никаких URL'ов в `image`.**

### Вопрос (`schemas/question.schema.json`)

```json
{
  "public_id": "qtx-0001",
  "body": "10 событий вчерашнего дня",
  "target_count": 10,
  "language": "ru",
  "category_slug": "memory",
  "complexity": "basic",
  "playlist_slugs": ["memory_sparks", "evening_reflection"],
  "synonyms": [
    "Назови 10 вещей, которые случились с тобой вчера",
    "Вспомни 10 событий из прошедшего дня"
  ],
  "hint_seeds_ru": ["до обеда", "разговор", "место, где ты был", "что-то новое"],
  "frame_hint_ru": "Считай не громкие события, а маленькие переключения внимания.",
  "editorial_flags": ["practice_ready", "onboarding_safe"],
  "is_featured": true,
  "onboarding_safe": true,
  "team_safe": false,
  "taxonomy": {
    "primary_class": "retrieval",
    "answer_form": "list",
    "openness": "open",
    "time_focus": "past"
  }
}
```

**Жёсткие требования:**
- `body` подразумевает **перечисляемый ответ от 3 до 20 пунктов**. Не Yes/No, не эссе.
- Если в body есть число — `target_count` ему равен.
- Body **не должен** содержать слов «текущий», «этой задачи», «эту проблему» **без флага `requires_context`** — иначе пользователь без контекста читает self-referential абсурд.
- Категория ровно одна (из 15 enum'а). Подборок может быть несколько.

### Поток (`schemas/stream.schema.json`)

```json
{
  "id": "morning-start",
  "name_ru": "Утро · запуск дня",
  "description_ru": "Пять шагов, чтобы войти в день мягко и осознанно.",
  "accent_category": "morning",
  "question_ids": ["qtx-0184", "qtx-0158", "qtx-0154", "qtx-0188", "qtx-0203"],
  "estimated_minutes": 8
}
```

- `question_ids` — 3–15 штук в порядке прохождения. Все должны существовать в `questions/`.
- `accent_category` — какой цветовой акцент использовать в UI (chip, прогресс-бар, end-of-stream иконка).

### Подборка (`schemas/playlist.schema.json`)

```json
{
  "slug": "memory_sparks",
  "category_slug": "memory",
  "name_ru": "Искры памяти",
  "description_ru": "Вопросы, которые быстро поднимают воспоминания и ассоциации.",
  "visibility": "public",
  "is_system": true
}
```

Сами вопросы привязываются к подборке через своё поле `playlist_slugs`. Подборки **не** содержат `question_ids` — это обратное отношение.

---

## 3. Что НЕЛЬЗЯ

### Картинки

- Hotlink на Wikimedia/NASA/etc. в production. Всегда скачиваем файл.
- Лицензии CC-BY-NC, fair-use, proprietary. Только PD/CC0/CC-BY/CC-BY-SA.
- Картинки >400 KB.
- Дубликаты по нормализованному filename — каждая картинка уникальна в репо.

### Вопросы

- Yes/No-вопросы.
- Вопросы, требующие письменного ответа (эссе, дневник).
- Вопросы с привязкой к «текущей задаче» без флага `requires_context`.
- Вопросы с числом, которое не равно `target_count`.

### Потоки

- Потоки длиной < 3 или > 15 вопросов.
- Ссылки на несуществующий public_id.

### Все типы

- Изменение `id` после публикации — это ломает приложение и кеши пользователей.
- Удаление записи без помеченного `deprecated: true` — то же.

---

## 3.5. Музыкальная подсистема (music/)

Отдельный поддом контента — классическая музыка в общественном достоянии. Курируется отдельным чатом (см. `docs/MUSIC_PROMPT.md`).

Пять связанных сущностей:

- **music-track** (`schemas/music-track.schema.json`) — запись произведения. Файл mp3 рядом с JSON в `music/tracks/`. Содержит `description_md` — авторское описание композиции на 2-3 абзаца.
- **composer** (`schemas/composer.schema.json`) — биография композитора (одна на множество треков). Фото обязательно. В `music/composers/`.
- **performer** (`schemas/performer.schema.json`) — биография исполнителя (опционально; может быть null). Фото опционально. В `music/performers/`.
- **music-playlist** (`schemas/music-playlist.schema.json`) — курируемая тематическая подборка с сюжетом и описанием. В `music/playlists/`.
- **music-taxonomy** (`schemas/music-taxonomy.schema.json`) — описания осей: эпохи / стили / десятилетия. Лежат массивами в `music/taxonomy/{eras,styles,decades}.json`.

**Авто-плейлисты** (по композитору, эпохе, стилю, десятилетию) приложение строит само из tracks. Куратор их **не пишет** — пишет только описания осей через taxonomy и тематические сборники через playlists.

**Лицензии**: только PD / CC0 / CC-BY / CC-BY-SA — для записи, для портретов и для всего. CC-BY-NC и fair-use отклоняются. Композиция в PD ≠ запись в PD — проверять каждую запись отдельно.

**Формат файлов**: mp3, 128+ kbps, ≤ 8 MB на трек. OGG отклоняется (плохая совместимость со старым iOS Safari).

---

## 4. Версионирование

| Что | Как |
|---|---|
| Схема расширяется новым опциональным полем | minor bump, без миграции |
| Схема меняет обязательность поля | major bump, нужен миграционный скрипт |
| Удаление поля | major bump, отдельная процедура |
| Новый topic | без bump, просто документируем в `topics.md` |
| Новая категория | major bump (15 категорий — это «закрытый» список, не растёт без причины) |

Текущая версия контракта: **`v1.0.0`**.

---

## 5. Process

### Чат добавил пачку (10 фактов / 50 вопросов)

1. Чат пишет файлы прямо в свою рабочую копию репо.
2. Запускает `node scripts/validate.mjs` — должно быть 0 ошибок.
3. Запускает `node scripts/build-index.mjs` — обновляются `_index.json`.
4. Commit, push на ветку `main` или fork-PR.
5. GitHub Action валидирует ещё раз + строит `dist/*.json` bundles.

### Приложение (qs4.me) подцепляет новый контент

1. На каждый push в `main` репозитория `qs4me-content` — Vercel webhook re-deploy приложения.
2. Build-time: приложение тянет `dist/facts.json`, `dist/questions.json`, `dist/streams.json`, `dist/playlists.json` через raw GitHub URL или git-submodule (TBD).
3. Картинки копируются в `public/facts/` в фазе build.

---

## 6. Контакты

Если что-то неоднозначно в схеме / процессе — открывай issue в этом репо.
