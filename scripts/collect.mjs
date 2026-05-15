#!/usr/bin/env node
// Batch collector for qs4me facts.
//
// Reads a manifest JSON (array of records), fetches each Wikipedia REST summary,
// downloads the lead image via Wikimedia Special:FilePath, queries Commons API
// for licence + author, resizes to ≤1280px webp ≤400KB via sharp, and writes
// {fact-id}.json + {fact-id}.webp into facts/topics/{topic}/.
//
// Usage:
//   node scripts/collect.mjs --batch scripts/batches/pilot-2026-05-15.json
//   node scripts/collect.mjs --batch ... --dry-run   (no writes; report intent)
//
// Manifest entry (curator-authored):
// {
//   "id": "fact-country-france",
//   "topic": "country",
//   "title": "Франция · Эйфелева башня",
//   "caption": "324 м, 1889 на Всемирную выставку. Должна была стоять 20 лет — стоит 136.",
//   "alt": "Эйфелева башня в Париже",
//   "year": 1889,
//   "meta": { "country_code": "FR" },
//   "wikipedia_lang": "en",
//   "wikipedia_title": "Eiffel_Tower",
//   "image_filename_override": null,        // optional: bypass Wikipedia summary, give "File:Foo.jpg"
//   "license_expected": ["CC0", "CC-BY"]    // optional whitelist; if Commons reports something else, skip
// }
//
// License + author come from Commons API extmetadata. Manifest does NOT carry them
// — too easy to lie or get wrong manually. Single source of truth: Commons.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const USER_AGENT = "qs4me-collector/1.0 (https://qs4.me)";
const ALLOWED_LICENSES = new Set(["PD", "CC0", "CC-BY", "CC-BY-SA"]);
const MAX_BYTES = 400 * 1024;
const REQ_SLEEP = 700;

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") { out.dryRun = true; continue; }
    if (a.startsWith("--")) out[a.slice(2)] = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv);
if (!args.batch) {
  console.error("Usage: node scripts/collect.mjs --batch <manifest.json> [--dry-run]");
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, init = {}, attempt = 0) {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, Accept: init.accept ?? "application/json", ...(init.headers || {}) },
  });
  if (res.status === 429) {
    const wait = [1000, 2000, 5000, 10000][attempt] ?? 10000;
    console.warn(`  · 429 ${url} — backoff ${wait}ms`);
    await sleep(wait);
    if (attempt >= 4) throw new Error(`Too many 429 on ${url}`);
    return fetchWithRetry(url, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res;
}

function filenameFromCommonsUrl(url) {
  const u = new URL(url);
  const parts = u.pathname.split("/");
  const idx = parts.indexOf("thumb");
  if (idx >= 0) return decodeURIComponent(parts[idx + 3]);
  return decodeURIComponent(parts[parts.length - 1]);
}

function stripHtml(s) {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Normalize Commons LicenseShortName (e.g. "CC BY 4.0", "Public domain") to schema enum.
function normalizeLicense(short, raw) {
  const s = (short || raw || "").toLowerCase().replace(/[._]/g, "-").replace(/\s+/g, "-");
  if (!s) return null;
  if (s.includes("cc0") || s.includes("creative-commons-zero")) return "CC0";
  if (s.includes("public-domain") || s === "pd" || s.startsWith("pd-")) return "PD";
  if (s.includes("cc-by-sa") || s.includes("cc-by-sa-")) return "CC-BY-SA";
  if (s.startsWith("cc-by") || s.includes("cc-by-") || s === "cc-by") return "CC-BY";
  if (s.includes("cc-by-nc")) return "CC-BY-NC";
  if (s.includes("fair")) return "fair-use";
  return null;
}

async function fetchCommonsMeta(filename) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|size|url&titles=${encodeURIComponent("File:" + filename)}&origin=*`;
  const res = await fetchWithRetry(url);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) throw new Error(`Commons API empty for ${filename}`);
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`Commons API: no imageinfo for ${filename}`);
  const m = info.extmetadata ?? {};
  const licenseShort = m.LicenseShortName?.value;
  const licenseRaw = m.License?.value;
  const license = normalizeLicense(licenseShort, licenseRaw);
  const artist = stripHtml(m.Artist?.value) || stripHtml(m.Credit?.value) || "Unknown";
  const dateTime = m.DateTimeOriginal?.value || m.DateTime?.value || "";
  return { license, licenseShort: licenseShort || licenseRaw, artist, dateTime, width: info.width, height: info.height, sourceUrl: info.descriptionurl };
}

async function collectOne(entry) {
  // 1. Manifest sanity
  const errs = [];
  for (const f of ["id", "topic", "title", "caption", "wikipedia_lang", "wikipedia_title"]) {
    if (!entry[f]) errs.push(`missing ${f}`);
  }
  if (entry.id && !entry.id.startsWith(`fact-${entry.topic}-`)) errs.push(`id "${entry.id}" doesn't match topic`);
  if (entry.title && [...entry.title].length > 36) errs.push(`title >36 chars (${[...entry.title].length})`);
  if (entry.caption && [...entry.caption].length > 145) errs.push(`caption >145 chars (${[...entry.caption].length})`);
  if (entry.caption && !/\d/.test(entry.caption)) errs.push("caption has no digit");
  if (errs.length) return { ok: false, id: entry.id, reasons: errs };

  // 2. Resolve image filename — from Wikipedia summary or override
  let filename = entry.image_filename_override;
  if (filename && filename.startsWith("File:")) filename = filename.slice(5);
  if (!filename) {
    const summaryUrl = `https://${entry.wikipedia_lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(entry.wikipedia_title)}`;
    const res = await fetchWithRetry(summaryUrl);
    const data = await res.json();
    const imageUrl = data?.originalimage?.source ?? data?.thumbnail?.source;
    if (!imageUrl) return { ok: false, id: entry.id, reasons: [`no image in summary for ${entry.wikipedia_title} (set image_filename_override)`] };
    filename = filenameFromCommonsUrl(imageUrl);
    await sleep(REQ_SLEEP);
  }

  // 3. Commons metadata (license, author)
  const cm = await fetchCommonsMeta(filename);
  await sleep(REQ_SLEEP);
  if (!cm.license) return { ok: false, id: entry.id, reasons: [`unknown license "${cm.licenseShort}" for ${filename}`] };
  if (!ALLOWED_LICENSES.has(cm.license)) return { ok: false, id: entry.id, reasons: [`license ${cm.license} (${cm.licenseShort}) not allowed`] };
  if (entry.license_expected && Array.isArray(entry.license_expected) && !entry.license_expected.includes(cm.license)) {
    return { ok: false, id: entry.id, reasons: [`license ${cm.license} not in expected ${entry.license_expected.join("/")}`] };
  }

  // 4. Download image
  const dlUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=1600`;
  console.log(`  · ${entry.id} ← ${filename} (${cm.license})`);
  const imgRes = await fetchWithRetry(dlUrl, { accept: "image/*" });
  const buf = Buffer.from(await imgRes.arrayBuffer());
  await sleep(REQ_SLEEP);

  // 5. sharp pipeline: ≤1280w webp, walk quality down until ≤400KB
  let webpBuf = null;
  let meta = null;
  for (const quality of [75, 65, 55, 45, 35]) {
    webpBuf = await sharp(buf).resize({ width: 1280, withoutEnlargement: true }).webp({ quality }).toBuffer();
    meta = await sharp(webpBuf).metadata();
    if (webpBuf.byteLength <= MAX_BYTES) break;
  }
  if (webpBuf.byteLength > MAX_BYTES) {
    return { ok: false, id: entry.id, reasons: [`webp still ${(webpBuf.byteLength / 1024).toFixed(0)}KB at q35`] };
  }
  if (!meta?.width || Math.min(meta.width, meta.height) < 320) {
    return { ok: false, id: entry.id, reasons: [`dims ${meta?.width}×${meta?.height} below 320`] };
  }

  // 6. JSON
  const year = entry.year ?? (cm.dateTime?.match(/\d{4}/)?.[0] ? Number(cm.dateTime.match(/\d{4}/)[0]) : undefined);
  const factJson = {
    id: entry.id,
    topic: entry.topic,
    title: entry.title,
    caption: entry.caption,
    image: `${entry.id}.webp`,
    image_width: meta.width,
    image_height: meta.height,
    ...(entry.alt ? { alt: entry.alt } : {}),
    credit: `${cm.artist} · ${cm.license} · Wikimedia`.slice(0, 80),
    source: `https://${entry.wikipedia_lang}.wikipedia.org/wiki/${encodeURI(entry.wikipedia_title)}`,
    license: cm.license,
    ...(year != null ? { year } : {}),
    ...(entry.meta ? { meta: entry.meta } : {}),
  };

  if (args.dryRun) {
    console.log(`     [dry] would write ${entry.id}.{json,webp}  ${meta.width}×${meta.height}  ${(webpBuf.byteLength / 1024).toFixed(0)}KB`);
    return { ok: true, id: entry.id, bytes: webpBuf.byteLength, dims: `${meta.width}×${meta.height}`, dry: true };
  }

  const topicDir = path.join(ROOT, "facts/topics", entry.topic);
  await fs.mkdir(topicDir, { recursive: true });
  await fs.writeFile(path.join(topicDir, `${entry.id}.webp`), webpBuf);
  await fs.writeFile(path.join(topicDir, `${entry.id}.json`), JSON.stringify(factJson, null, 2) + "\n");
  return { ok: true, id: entry.id, bytes: webpBuf.byteLength, dims: `${meta.width}×${meta.height}` };
}

async function main() {
  const manifestPath = path.resolve(args.batch);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest)) throw new Error("manifest must be a JSON array");
  console.log(`\n📦 ${manifest.length} records from ${path.relative(ROOT, manifestPath)}${args.dryRun ? " [DRY-RUN]" : ""}`);
  const ok = [], fail = [];
  for (const entry of manifest) {
    try {
      const r = await collectOne(entry);
      if (r.ok) {
        ok.push(r);
        console.log(`    ✓ ${r.id}  ${r.dims}  ${(r.bytes / 1024).toFixed(0)}KB`);
      } else {
        fail.push(r);
        console.warn(`    ✗ ${r.id || "?"}  ${r.reasons.join("; ")}`);
      }
    } catch (e) {
      fail.push({ id: entry.id, reasons: [e.message] });
      console.warn(`    ✗ ${entry.id || "?"}  ${e.message}`);
    }
  }
  console.log(`\n📋 ${ok.length} ok · ${fail.length} failed`);
  if (fail.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
