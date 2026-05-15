#!/usr/bin/env node
// Generate _index.json files in each content directory, listing all ids.
// Useful for chats that want to know "what's already there" without reading every file.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

function indexDir(dir, idField) {
  if (!fs.existsSync(dir)) return;
  const items = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith(".json") || e.name.startsWith("_")) continue;
    try {
      const d = readJson(path.join(dir, e.name));
      if (d[idField]) items.push(d[idField]);
    } catch {}
  }
  items.sort();
  fs.writeFileSync(path.join(dir, "_index.json"), JSON.stringify(items, null, 2));
  console.log(`  · ${path.relative(ROOT, dir).padEnd(36)} ${items.length} items`);
}

// Facts: index each topic subfolder
const factsRoot = path.join(ROOT, "facts/topics");
if (fs.existsSync(factsRoot)) {
  for (const e of fs.readdirSync(factsRoot, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    indexDir(path.join(factsRoot, e.name), "id");
  }
}

// Questions, streams, playlists
indexDir(path.join(ROOT, "questions"), "public_id");
indexDir(path.join(ROOT, "questions/streams"), "id");
indexDir(path.join(ROOT, "questions/playlists"), "slug");

// Music sub-system
indexDir(path.join(ROOT, "music/tracks"), "id");
indexDir(path.join(ROOT, "music/composers"), "id");
indexDir(path.join(ROOT, "music/performers"), "id");
indexDir(path.join(ROOT, "music/playlists"), "slug");

console.log("✓ All _index.json files written");
