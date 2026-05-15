# Интеграция qs4me-content → qs4.me (приложение)

## Поток данных

```
qs4me-content (этот репо)         qs4.me (приложение)
─────────────────────────         ─────────────────────
/facts/topics/*/*.json           ─┐
/facts/topics/*/*.webp           ─┤
/questions/*.json                ─┼─► pnpm fetch-content
/questions/streams/*.json        ─┤        │
/questions/playlists/*.json      ─┤        ▼
                                  │  public/data/facts.json
                                  │  public/data/questions.json
                                  │  public/data/streams.json
                                  │  public/data/playlists.json
                                  │  public/facts/{topic}/*.{webp,jpg}
                                  │        │
                                  └────────▼
                                     Next.js build →
                                     Vercel deploy →
                                     https://qs4.me
```

## Триггер

При **push в `main` репозитория qs4me-content** GitHub Action отправляет POST на Vercel Deploy Hook → приложение пересобирается со свежим контентом.

```yaml
# .github/workflows/notify-deploy.yml (в qs4me-content)
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"
```

В Vercel project settings qs4.me — создать Deploy Hook URL, добавить в Secrets этого репо как `VERCEL_DEPLOY_HOOK`.

## Build-time fetch на стороне qs4.me

В `qs4.me/scripts/fetch-content.mjs`:

```js
const owner = "prudnikovcons";
const repo  = "qs4me-content";
const ref   = "main";
const base  = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}`;

// 1. Pull bundles
for (const f of ["facts.json", "questions.json", "streams.json", "playlists.json"]) {
  const r = await fetch(`${base}/dist/${f}`);
  await fs.promises.writeFile(`public/data/${f}`, await r.text());
}

// 2. Pull every image referenced in facts.json
const facts = JSON.parse(await fs.promises.readFile("public/data/facts.json", "utf8"));
for (const fact of facts) {
  const path = `public/facts/${fact.topic}/${fact.image}`;
  if (fs.existsSync(path)) continue;
  const r = await fetch(`${base}/facts/topics/${fact.topic}/${fact.image}`);
  await fs.promises.writeFile(path, Buffer.from(await r.arrayBuffer()));
}
```

В `qs4.me/package.json`:
```json
"scripts": {
  "fetch-content": "node scripts/fetch-content.mjs",
  "build": "pnpm fetch-content && next build"
}
```

В Vercel project settings → Build & Development Settings → Build Command: `pnpm build` (по умолчанию). Тогда на каждый deploy свежий контент будет тянуться.

## Schema-based code generation (опционально)

В приложении удобно иметь TS-типы, совпадающие со схемами:

```bash
# В qs4.me/scripts/generate-types.mjs
import { compileFromFile } from "json-schema-to-typescript";
const ts = await compileFromFile("../qs4me-content/schemas/fact.schema.json");
fs.writeFileSync("src/types/fact.ts", ts);
```

Это даёт автоматическую синхронизацию контракта.
