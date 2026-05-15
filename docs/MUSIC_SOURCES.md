# Источники музыкального корпуса qs4.me

Карта проверенных источников для music-curator chat. Обновлять при каждом завершении новой пачки.

Owner: chat-агент сбора музыки. Парный документ к `MUSIC_PROMPT.md`.

User-Agent для всех запросов: `qs4me-music-curator/1.0 (https://qs4.me)`

---

## ✅ Используем сейчас (148 треков)

### 1. Open Goldberg Variations — Kimiko Ishizaka, 2012
- **Item:** [`archive.org/details/OpenGoldbergVariations`](https://archive.org/details/OpenGoldbergVariations)
- **Лицензия:** CC0
- **Качество:** студия Teldex Berlin, эталон
- **Использовано:** 31 трек (Aria + 30 variations + Aria da Capo)
- **Не повторять:** взято целиком

### 2. Musopen Kickstarter Project — 2012
- **Item:** [`archive.org/details/MusopenCollectionAsFlac`](https://archive.org/details/MusopenCollectionAsFlac)
- **Лицензия:** CC PD-mark
- **Качество:** профессиональная студия 2012, разный состав исполнителей
- **Использовано:** 109 треков (см. таблицу ниже)
- **Не использовано:** только Bach Goldberg Variations (32 файла — у нас уже от Ishizaka, эталон лучше)

### 3. Функциональный пак — 8 треков
- `TenMinutesOfWhiteNoisePinkNoiseAndBrownianNoise` (CC PD, синтез Sound Forge)
- `delta2hz_ms_delta` + `theta4hz_ms_theta` (CC PD-mark, jorrell.org isochronic)
- `FlowerOfLifeSongWithBinauralBeatsAndIsochronicTones` (CC0, Baker Beltz)
- `naturesounds-soundtheraphy` (CC0, природа)
- `ocean-sea-sounds` (CC0, океан)

---

## 🟡 Приоритет 1 — главное расширение

### Open Well-Tempered Clavier — Kimiko Ishizaka, 2018
- **Item:** [`archive.org/details/bach-well-tempered-clavier-book-1`](https://archive.org/details/bach-well-tempered-clavier-book-1)
- **Также:** [`archive.org/details/OpenWell-TemperedClavier_Book_I`](https://archive.org/details/OpenWell-TemperedClavier_Book_I) и [`master-tracks`](https://archive.org/details/master-tracks-the-open-well-tempered-clavier)
- **Лицензия:** CC0
- **Качество:** Bösendorfer 280, Teldex Studio Berlin (тот же setup что Goldberg)
- **Объём:** ХТК Book 1 — 48 прелюдий+фуг через все 24 тональности (~96 коротких треков, средняя длительность 2–5 мин)
- **Slug pattern:** `bach-wtc1-prelude-{key}`, `bach-wtc1-fugue-{key}` (24 пары)
- **Performer:** реюзаем существующего `kimiko-ishizaka`
- **Composer:** реюзаем `bach`
- **Style:** `prelude` + `fugue` (оба уже в taxonomy)
- **Note:** Book 2 (BWV 870–893) кажется НЕ записан Ишизакой в open-license, только Book 1

---

## 🟢 Приоритет 2 — точечные находки

### IA: отдельные CC PD/CC0 треки от других исполнителей
- `vivaldi_concertos` (IA) — Vivaldi concertos PD recording, нужно проверить качество
- `LisztConcertoForPianoNo.1InEFlatMajor` (IA, PD) — Лист Концерт 1
- `RavelDaphnisEtChloeSuiteNo.2` (IA) — нужно проверить лицензию
- `Vivaldi_gloria2011` — Vivaldi Gloria хоровое
- **Метод поиска:** `creator:{name} AND licenseurl:*publicdomain*` без OR в query

### Wikimedia Commons recordings
- Multi-composer collection, часто CC-BY от европейских университетских оркестров
- API: `commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Audio_files_of_music_by_{Composer}`
- Качество разное — нужен per-track audit

### Free Music Archive — classical section
- [`freemusicarchive.org/genre/Classical`](https://freemusicarchive.org/genre/Classical)
- В основном CC-BY, некоторые CC0 (Kimiko Ishizaka там тоже)
- Удобный фильтр по лицензии в UI

### Freesound.org — functional/nature
- Миллионы CC0/CC-BY эффектов и природных записей
- Для расширения functional pack: дождь разных типов, лес, костёр, кафе, метель, поезд, etc.
- API: `freesound.org/apiv2/search/text/`
- Требует API key (бесплатный)

---

## 🔵 Приоритет 3 — для research, надо верифицировать

- **IMSLP recordings** — фильтр PD, миллионы записей сомнительного качества. Брать только если конкретный performer оказывается высокого уровня.
- **MIT/Stanford concert archives** — некоторые в CC, но мало
- **NASA sounds** — public domain космические звуки. Не музыка, но возможно для специфических плейлистов («Voyager-1»).
- **Smithsonian Folkways** — народная музыка разных стран, частично CC, частично restricted
- **CCMixter classical pool** — community classical mixes, CC-BY/CC0
- **LibriVox classical extracts** — в основном аудиокниги, но некоторые включают музыку (e.g. lectures on Bach с примерами)
- **Сгенерировать через ffmpeg** — для бинауралов идеально (`sine=200,sine=210` → 10 Hz alpha-бинаурал), мы получаем полный контроль над частотой и длительностью

---

## ❌ Отклонено и почему

### Bob Varney (varneyelmi@msn.com) на IA — 1031 PD audio item
- 78rpm transfers 1920–1950s
- Шипение шеллака, плёночный шум — не подходит для фона приложения
- Промт §9: «78rpm записи без реставрации — слишком шумно для фона»
- **Использовать только если** требуется конкретная исторически значимая запись (Rachmaninoff plays Chopin 1927 и т.д.) с пометкой «исторический документ»

### Mutopia Project — MIDI rendering
- Синтезированный звук, не живое исполнение
- Использовали 5 треков в первой версии — все удалены, заменены Musopen studio

### Musopen.org прямой downloads
- HTTP 403 даже с правильным User-Agent
- Anti-bot защита; обходить не пытаемся
- Альтернатива: всё что они выпустили — на Internet Archive под `MusopenCollectionAsFlac`

### Solfeggio frequencies (528 Hz «исцеление ДНК» и т.п.)
- Псевдонаука, нумерология
- Не добавлять в корпус даже в CC0 форме

### Schumann resonance (7.83 Hz) как «частота Земли исцеляет»
- Частота реальна (atmospheric resonance), но «целебные» эффекты не подтверждены
- В корпус не добавлять

### Naxos / Spotify / Apple Music
- Proprietary, требуют лицензию
- Не наш слой

---

## 📋 Backlog идей для будущих пачек

Прежде чем брать конкретное произведение — проверить что нашли версию в CC0/CC PD-mark и качество студийное.

### Бах — добавочные
- ХТК Book 1 (Open WTC) → 48 пар прелюдий+фуг
- Bach Cello Suites — поискать CC0 (Bach Suites Project существовал)
- St Matthew Passion — крупных PD records почти нет
- Brandenburg concertos 1, 3, 4, 5, 6 — пока только 2-й есть, остальные требуют поиска

### Чего сейчас совсем мало
- **Чайковский** — только Pathétique. Нет «Лебединого озера», «Спящей красавицы», «Времён года», концертов
- **Beethoven** — только Eroica + увертюры + Лунная (была удалена) + Quartet 6. Нет других симфоний (5, 6, 7, 9), Pathétique, Appassionata, Hammerklavier
- **Mozart** — только Sym 40 + 2 quartets + 2 overtures. Нет Requiem, Don Giovanni, Cosi fan tutte, остальных симфоний
- **Композиторы целиком отсутствуют:**
  - Vivaldi (Времена года)
  - Handel (Messiah, Water Music)
  - Wagner
  - Mahler (поздний романтизм)
  - Stravinsky, Bartók, Prokofiev (modern)
  - Pärt, Górecki (sacred minimalism) — все под копирайтом

### Функциональный пак — расширения
- Изохронные тоны других диапазонов: alpha (10 Hz для расслабленного фокуса), beta (15 Hz для активной работы), gamma (40 Hz, спорно)
- Природа: лес-птицы, костёр, метель, ночные сверчки, прибой+чайки
- White noise variants: rain through window, fan, kettle
- Сгенерированные сами через ffmpeg — для полного контроля

### Тематические плейлисты, которые можно собрать из текущих 148
- «Меланхолия позднего Шуберта» — 4 поздние сонаты D 958/959 + Quartet?
- «Брамсовский вечер» — Brahms Sym 1 mvt 2 + Sym 3 mvt 3 + Tragic
- «Минорные кульминации» — Sonata 8 «Patetique» (когда добавим), Brahms Sym 4 mvt 1, Tchaikovsky Pathétique mvt 4, Schubert sonata D 958 mvt 1
- «За один час» — короткие пьесы для маленького плеера: Trepak (1:00), Suk Meditation (~6:45), Goldberg vars 4/5/19 (~1 min each)

---

## Workflow для следующих пачек

1. Прочитать этот документ + `MUSIC_PROMPT.md`
2. Выбрать целевой источник из Приоритета 1 или 2
3. Скачать batch через python urllib (parallel или sequential)
4. ffmpeg recompress для >7 MB → 96k
5. Сгенерировать JSON через template скрипт (как `gen-all-tracks.py`)
6. `pnpm validate && pnpm build` 
7. `git commit -m "music: pack N — ..."` + `git push origin main`
8. Обновить этот файл (раздел «Используем сейчас»)
