# Источники для сбора фактов qs4.me

Источник истины по API endpoints, лицензионной политике, форматам и режиму вежливости.

Owner: chat-агент сбора картинок. Обновляется при добавлении нового источника или изменении правил.

---

## User-Agent (обязательно)

```
qs4me-collector/1.0 (https://qs4.me)
```

Используется во ВСЕХ исходящих запросах. Никогда не выдавать себя за браузер (`Mozilla/5.0 ...`). Wikimedia Foundation требует honest UA для API-доступа.

---

## API endpoints

### 1. Wikipedia REST summary

```
https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}
```

- `lang`: `en` (по умолчанию), `ru` (для русскоязычных тем).
- `title`: URL-encoded ENG-название статьи Wikipedia (нижнее подчёркивание вместо пробелов).
- Возвращает: `originalimage.source` (URL lead-картинки), `thumbnail.source` (thumb), `extract` (краткое описание).

**Rate limit:** 200 req/s per IP — практически unlimited для нашего темпа.
**Sleep:** 700 мс между запросами (вежливость).

### 2. Wikimedia Commons API (extmetadata)

```
https://commons.wikimedia.org/w/api.php
  ?action=query&format=json
  &prop=imageinfo&iiprop=extmetadata|size|url
  &titles=File:{filename}
  &origin=*
```

**Единственный авторитетный источник лицензии и автора.** Не доверяй ничему другому (ни манифесту, ни Wikipedia infobox).

Возвращает в `extmetadata`:
- `LicenseShortName.value` — короткая форма («CC BY 4.0», «Public domain»).
- `License.value` — slug («cc-by-4.0», «pd»).
- `Artist.value` — HTML с именем автора (нужен strip).
- `DateTimeOriginal.value` — дата съёмки/создания, если есть.
- `Credit.value` — fallback на автора.

**Rate limit:** 200 req/s. **Sleep:** 700 мс.

### 3. Wikimedia Commons FilePath (download)

```
https://commons.wikimedia.org/wiki/Special:FilePath/{filename}?width=1600
```

Стабильный URL для скачивания. `width=` параметр опционален (если опущен — оригинал, может быть огромным).

### 4. Wikidata SPARQL (для списков)

```
https://query.wikidata.org/sparql
```

Для bulk-выборки entities одного типа. Примеры запросов:

```sparql
# Все страны мира с флагом и image
SELECT ?country ?countryLabel ?flag ?image WHERE {
  ?country wdt:P31 wd:Q6256.
  OPTIONAL { ?country wdt:P41 ?flag. }
  OPTIONAL { ?country wdt:P18 ?image. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

```sparql
# 118 chemical elements
SELECT ?elem ?elemLabel ?symbol ?atomicNumber WHERE {
  ?elem wdt:P31 wd:Q11344.
  OPTIONAL { ?elem wdt:P246 ?symbol. }
  OPTIONAL { ?elem wdt:P1086 ?atomicNumber. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?atomicNumber
```

**Rate limit:** ~60 запросов/мин. **Header:** `Accept: application/sparql-results+json`.

### 5. NASA APOD

```
https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY
```

- `DEMO_KEY` — 30 req/h, 50 req/day. Достаточно для random sampling.
- Параметры: `date=YYYY-MM-DD` (одно изображение), `start_date`+`end_date` (диапазон).
- **Лицензия:** все NASA APOD — PD (если в `copyright` нет внешнего автора; в этом случае skip).

Полезен для `space` топика — гарантированно PD, профессиональное качество.

---

## Лицензии

### Принимаем (4 значения)

| Schema enum | Commons short forms | Note |
|---|---|---|
| `PD` | "Public domain", "PD", "PD-*", "PD-US-*" | Включает Crown Copyright public, US gov works |
| `CC0` | "CC0", "Creative Commons Zero" | Уравнивается с PD по правам |
| `CC-BY` | "CC BY 2.0/3.0/4.0", "CC-BY-*" | Требует credit (`credit` поле в JSON покрывает) |
| `CC-BY-SA` | "CC BY-SA 2.0/3.0/4.0" | Требует credit + share-alike (через лицензию контента) |

### Отклоняем

| Что | Почему |
|---|---|
| `CC-BY-NC` | Non-commercial — мы образовательный продукт с потенциально коммерческим использованием |
| `GFDL 1.2 only` | Несовместимо со современными CC; типично у старых Wikipedia картинок 2005-2010 |
| `Fair use` | Юридически рискованно, узко применимо |
| `Proprietary` | Просто нет |
| Unknown / parse error | Защитная политика: если не смогли нормализовать LicenseShortName — отклонить |

**Где обычно ловушки GFDL 1.2:** старые лид-картинки элементов periodic table (например `Helium_discharge_tube.jpg` — GFDL 1.2 only). Решение: использовать `image_filename_override` для альтернативной картинки или сменить тему.

---

## Технические требования к картинке

| Параметр | Значение |
|---|---|
| Формат вывода | webp (sharp q75 → q35 walk вниз до 400 KB) |
| Width после resize | ≤ 1280px |
| Min height (schema) | 320px |
| Min короткой стороны (промт) | 800px (best-practice, не блокирует) |
| Max file size | 400 KB |
| Max original dim | 1600×1600 (не апскейлим) |

---

## Failure modes (что обычно ломается)

1. **GFDL 1.2 license** — Commons возвращает «GFDL 1.2», нормализация не находит совпадения в allowed set. Решение: pick another file.
2. **No lead image** — Wikipedia summary не имеет `originalimage`. Решение: задать `image_filename_override` в манифесте.
3. **Webp >400 KB at q35** — очень детальная картинка (старые сканы, большие пейзажи). Решение: уменьшить max width до 1024 или 960, или сменить картинку.
4. **Short side < 320** — panoramic crop. Не пройдёт schema. Решение: alt-картинка.
5. **Артефакт «Unknown»** — Commons не отдаёт Artist/Credit. Запись пройдёт, credit будет «Unknown · CC-BY · Wikimedia» — приемлемо, но идеально через `image_filename_override` пойти за более документированной картинкой.
6. **429** — exponential backoff в `collect.mjs` (1с, 2с, 5с, 10с).

---

## Future sources (не реализовано)

- **Wikiquote** — для quotes (текст цитаты), сейчас обходимся Wikipedia bio + ручной caption.
- **Met Open Access API** — `https://collectionapi.metmuseum.org/public/collection/v1/` — для art, все CC0.
- **Rijksstudio API** — Rijksmuseum, CC0 high-res.
- **Smithsonian Open Access** — `https://api.si.edu/openaccess/api/v1.0` — CC0 для events/history.
- **Europeana** — `https://api.europeana.eu/` — европейские музеи, mixed licenses.

Добавлять по мере роста корпуса.
