# Граф тематик qs4.me

19 топиков в `schemas/fact.schema.json` enum. Этот документ — навигация для сборщика: что считается «в скоупе» каждого топика, какие подгруппы, откуда брать seed-материал.

Owner: chat-агент сбора картинок. Обновляется при добавлении/удалении топика.

---

## Текущий статус (2026-05-15)

| Топик | В enum | Pilot facts | Sub-areas |
|---|---|---|---|
| country | ✓ | 1 | страны, столицы, символы, флаги |
| element | ✓ | 1 | 118 хим. элементов |
| quote | ✓ | 1 | портреты+цитаты исторических деятелей |
| space | ✓ | 1 | планеты, звёзды, миссии, объекты Солнечной |
| history | ✓ | 1 | артефакты, изобретения, события |
| art | ✓ | 1 | картины, скульптуры, школы |
| nature | ✓ | 1 | животные, растения, экосистемы, рекорды природы |
| architecture | ✓ | 1 | здания, мосты, UNESCO sites |
| food | ✓ | 1 | национальные блюда, продукты, кухни |
| science | ✓ | 1 | открытия, теории, инструменты |
| language | ✓ | 0 | алфавиты, языковые семьи, мёртвые языки |
| math | ✓ | 0 | теоремы, константы, нерешённые проблемы |
| music | ✓ | 0 | композиторы, инструменты, жанры |
| economy | ✓ NEW | 0 | валюты, биржи, кризисы, банки |
| infographics | ✓ NEW | 0 | **scope TBD** — ждём уточнения куратора |
| materials | ✓ NEW | 0 | материалы (стекло, бетон, графен, шёлк) |
| terms | ✓ NEW | 0 | **scope TBD** — ждём уточнения куратора |
| ratings | ✓ NEW | 0 | рекорды (Гиннесс, олимпийские, экстремумы природы) |
| events | ✓ NEW | 0 | Олимпиады, выставки, премьеры, исторические даты |

---

## Подскоупы по топикам

### country
**Сюжет:** одна страна → одна узнаваемая черта (символ, город, природа, кухня в виде места).
**Sub-areas:** столицы и символы (Эйфелева, Кремль, Колизей); природные феномены (Ниагара, Сахара, Байкал); исторические локации страны.
**Источник:** Wikipedia REST по стране; SPARQL `wdt:P31 wd:Q6256` для списка.
**Slug pattern:** `fact-country-{country-slug}` или `fact-country-{landmark-slug}` (Eiffel → fact-country-france; Pyramids → fact-country-egypt-pyramids).

### element
**Сюжет:** один элемент → атомный номер + один яркий факт об открытии/свойствах.
**Sub-areas:** металлы, газы, неметаллы; редкие; радиоактивные.
**Источник:** Wikipedia REST `Hydrogen/Helium/.../Oganesson`; SPARQL `wdt:P31 wd:Q11344`.
**Slug:** `fact-element-{name}` (carbon, gold, mercury-element).

### quote
**Сюжет:** портрет исторической фигуры + годы жизни + одна узнаваемая идея/достижение.
**Не сторок:** только реальные исторические портреты (NO стоковые фотки).
**Sub-areas:** учёные, философы, писатели, художники, политики, военные.
**Источник:** Wikipedia REST по личности.
**Slug:** `fact-quote-{lastname}` (einstein, newton, gandhi).

### space
**Sub-areas:** Solar System bodies, галактики, миссии, телескопы, явления (затмения, чёрные дыры).
**Источник:** Wikipedia REST + NASA APOD (PD по умолчанию, безопасно).
**Slug:** `fact-space-{body-or-mission}` (saturn, voyager-1, andromeda-galaxy).

### history
**Sub-areas:** артефакты (Розетта, Антикитера), изобретения (печатный станок, ДНК-структура), войны, революции.
**Slug:** `fact-history-{event-or-artifact}` (rosetta, berlin-wall-fall).

### art
**Sub-areas:** живопись (мастера), скульптура, графика. Конкретное произведение + автор + цифра (год, размер, цена).
**Slug:** `fact-art-{work-slug}` (mona-lisa, starry-night, the-scream).

### nature
**Sub-areas:** животные (крупнейшие, быстрейшие), растения (деревья-рекордсмены), экосистемы, явления.
**Slug:** `fact-nature-{species-or-phenomenon}` (cheetah, giant-sequoia, octopus).

### architecture
**Sub-areas:** небоскрёбы, мосты, храмы, UNESCO sites, инженерные сооружения.
**Slug:** `fact-architecture-{building}` (burj-khalifa, sydney-opera, sagrada-familia).

### food
**Sub-areas:** национальные блюда, ингредиенты, кухни, происхождение блюд.
**Slug:** `fact-food-{dish}` (pizza-margherita, sushi, croissant).

### science
**Sub-areas:** открытия, эксперименты, инструменты (микроскоп, рентген), Нобели.
**Slug:** `fact-science-{discovery}` (penicillin, x-ray, dna).

### language
**Sub-areas:** алфавиты, мёртвые языки, языковые семьи, иероглифы, рекорды (самый старый/распространённый).
**Slug:** `fact-language-{script-or-language}` (cyrillic, sanskrit, esperanto).

### math
**Sub-areas:** теоремы, константы (π, e), нерешённые проблемы, прорывы (Перельман, Fermat).
**Slug:** `fact-math-{topic}` (pi, fermats-last-theorem, golden-ratio).

### music
**Sub-areas:** композиторы (классика), инструменты (Страдивари), исторические события (премьеры), физика звука.
**Slug:** `fact-music-{topic}` (beethoven, stradivarius, mozart).

### economy
**Sub-areas:** валюты (€, $, ¥), биржи (Wall Street, LSE), кризисы (1929, 2008), Bretton Woods, Bitcoin.
**Slug:** `fact-economy-{topic}` (bitcoin, wall-street, bretton-woods).

### materials
**Sub-areas:** металлы (дамасская сталь), синтетика (графен, кевлар), биоматериалы (шёлк), исторические (стекло, бетон).
**Slug:** `fact-materials-{name}` (graphene, damascus-steel, silk).

### ratings
**Sub-areas:** рекорды Гиннесса, олимпийские рекорды, экстремумы (самое высокое, глубокое, холодное), top-1 в категории.
**Slug:** `fact-ratings-{topic}` (mariana-trench, mount-everest, vatican-smallest).

### events
**Sub-areas:** Олимпиады, Всемирные выставки, премьеры (фильмы, спектакли), исторические даты, миссии-первенцы.
**Slug:** `fact-events-{event}` (apollo-11, berlin-wall-fall, expo-1889).

### infographics
**Сюжет:** визуализация одной идеи через данные — график, диаграмма, шкала, сравнение, карта-с-данными.
**Sub-areas:** климат (температура за тысячелетия, рост CO₂); демография (рост населения, плотность); экономика (ВВП, доли рынка); шкалы (размеры планет, расстояния, время); биология (геном, родословные); технологии (закон Мура, скорость носителей).
**Источники:** Commons категории `Infographics`, `Diagrams`, `Charts`, `Maps`; NASA climate visualizations (PD); NOAA/USGS (PD); Our World in Data через прямой URL (CC-BY) — требует расширения collect.mjs.
**Slug pattern:** `fact-infographics-{topic-slug}` (population-growth, moore-law, solar-system-scale).

### terms
**Сюжет:** концепт / определение / закон / эффект из науки или философии. Caption = краткое определение + почему это важно. Картинка — диаграмма-иллюстрация концепта.
**Sub-areas:** физика (энтропия, квантовая запутанность), математика (хаос, фрактал), психология (когнитивный диссонанс, эффект Даннинга-Крюгера), социология (принцип Парето, эффект бабочки), философия (бритва Оккама, парадокс Тесея), экономика (рыночное равновесие), биология (гомеостаз, эпигенетика).
**Источники:** Wikipedia/Commons диаграммы к статье о термине (CC-BY-SA в большинстве). AI-генерированные изображения НЕ используем — правовой статус нестабильный.
**Slug pattern:** `fact-terms-{concept}` (entropy, dunning-kruger, pareto-principle, schrodinger-cat).

---

## Анти-паттерны раскадровки

- **Один топик подряд** в батче — раскидывай.
- **Дубль слугов** — slug устойчивый, не меняется после публикации (см. `docs/CONTRACT.md` §3).
- **Caption без цифры** — schema-валидно (если ≥12 симв.), но против контракта. `collect.mjs` блокирует.
- **Картинки людей-сток** в `quote` — только настоящие исторические портреты.

---

## Что собирать дальше (рабочий приоритет)

1. **Расширять topics с 0 фактов** — language, math, music, economy, materials, ratings, events.
2. **Дополнять кучные топики** — country, history, art, nature, architecture (легче находить с разнообразием).
3. **Не трогать** — infographics, terms до уточнения.
