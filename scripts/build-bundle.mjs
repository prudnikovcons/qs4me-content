#!/usr/bin/env node
// Bundle every record into dist/ JSON files for the app to consume.
// Outputs:
//   dist/facts.json     — array of all facts (with image paths resolved to /facts/topics/{topic}/{file})
//   dist/questions.json — array of all questions
//   dist/streams.json   — array of all sequential streams
//   dist/playlists.json — array of all playlists

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
fs.mkdirSync(DIST, { recursive: true });

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith(".json") && !e.name.startsWith("_")) out.push(full);
  }
  return out;
}

// 1. Facts
const facts = [];
for (const f of walk(path.join(ROOT, "facts"))) {
  const d = readJson(f);
  // Resolve image to a public path: /facts/{topic}/{filename}
  d._imageUrl = `/facts/${d.topic}/${d.image}`;
  facts.push(d);
}
fs.writeFileSync(path.join(DIST, "facts.json"), JSON.stringify(facts, null, 2));

// 2. Questions
const questionDir = path.join(ROOT, "questions");
const questions = [];
if (fs.existsSync(questionDir)) {
  for (const e of fs.readdirSync(questionDir, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith(".json") || e.name.startsWith("_")) continue;
    questions.push(readJson(path.join(questionDir, e.name)));
  }
}
fs.writeFileSync(path.join(DIST, "questions.json"), JSON.stringify(questions, null, 2));

// 3. Streams
const streams = walk(path.join(ROOT, "questions/streams")).map(readJson);
fs.writeFileSync(path.join(DIST, "streams.json"), JSON.stringify(streams, null, 2));

// 4. Playlists (questions)
const playlists = walk(path.join(ROOT, "questions/playlists")).map(readJson);
fs.writeFileSync(path.join(DIST, "playlists.json"), JSON.stringify(playlists, null, 2));

// 5. Music sub-system
const musicTracks = walk(path.join(ROOT, "music/tracks")).map(readJson).map(t => ({
  ...t,
  _fileUrl: `/music/tracks/${t.file}`,
}));
const composers = walk(path.join(ROOT, "music/composers")).map(readJson).map(c => ({
  ...c,
  _photoUrl: c.photo ? `/music/composers/${c.photo}` : null,
}));
const performers = walk(path.join(ROOT, "music/performers")).map(readJson).map(p => ({
  ...p,
  _photoUrl: p.photo ? `/music/performers/${p.photo}` : null,
}));
const musicPlaylists = walk(path.join(ROOT, "music/playlists")).map(readJson);
// Taxonomy files are arrays — keep keyed by filename without extension
const taxonomy = {};
const taxRoot = path.join(ROOT, "music/taxonomy");
if (fs.existsSync(taxRoot)) {
  for (const e of fs.readdirSync(taxRoot, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith(".json") || e.name.startsWith("_")) continue;
    const key = e.name.replace(/\.json$/, "");
    taxonomy[key] = readJson(path.join(taxRoot, e.name));
  }
}

fs.writeFileSync(path.join(DIST, "music-tracks.json"), JSON.stringify(musicTracks, null, 2));
fs.writeFileSync(path.join(DIST, "composers.json"), JSON.stringify(composers, null, 2));
fs.writeFileSync(path.join(DIST, "performers.json"), JSON.stringify(performers, null, 2));
fs.writeFileSync(path.join(DIST, "music-playlists.json"), JSON.stringify(musicPlaylists, null, 2));
fs.writeFileSync(path.join(DIST, "music-taxonomy.json"), JSON.stringify(taxonomy, null, 2));

console.log(`📦 Bundle written → dist/`);
console.log(`   facts: ${facts.length}`);
console.log(`   questions: ${questions.length}`);
console.log(`   streams: ${streams.length}`);
console.log(`   playlists: ${playlists.length}`);
console.log(`   music-tracks: ${musicTracks.length}`);
console.log(`   composers: ${composers.length}`);
console.log(`   performers: ${performers.length}`);
console.log(`   music-playlists: ${musicPlaylists.length}`);
console.log(`   music-taxonomy keys: ${Object.keys(taxonomy).join(", ") || "(none)"}`);
