#!/usr/bin/env node
// Validate every JSON in /facts/, /questions/, /questions/streams/, /questions/playlists/
// against the corresponding schema. Exits non-zero if any record fails.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const factSchema = JSON.parse(fs.readFileSync(path.join(ROOT, "schemas/fact.schema.json"), "utf8"));
const questionSchema = JSON.parse(fs.readFileSync(path.join(ROOT, "schemas/question.schema.json"), "utf8"));
const streamSchema = JSON.parse(fs.readFileSync(path.join(ROOT, "schemas/stream.schema.json"), "utf8"));
const playlistSchema = JSON.parse(fs.readFileSync(path.join(ROOT, "schemas/playlist.schema.json"), "utf8"));

const validateFact = ajv.compile(factSchema);
const validateQuestion = ajv.compile(questionSchema);
const validateStream = ajv.compile(streamSchema);
const validatePlaylist = ajv.compile(playlistSchema);

const errors = [];
let totalChecked = 0;

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith(".json") && !e.name.startsWith("_")) out.push(full);
  }
  return out;
}

function check(file, validator, type) {
  totalChecked++;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!validator(data)) {
      for (const err of validator.errors ?? []) {
        errors.push({ file, type, path: err.instancePath, msg: err.message, details: err.params });
      }
    }
    return data;
  } catch (err) {
    errors.push({ file, type, msg: `parse: ${err.message}` });
    return null;
  }
}

// 1. Facts
for (const f of walk(path.join(ROOT, "facts"))) check(f, validateFact, "fact");

// 2. Questions
const questionDir = path.join(ROOT, "questions");
for (const f of fs.existsSync(questionDir)
  ? fs.readdirSync(questionDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".json") && !e.name.startsWith("_"))
      .map((e) => path.join(questionDir, e.name))
  : []) {
  check(f, validateQuestion, "question");
}

// 3. Streams
for (const f of walk(path.join(ROOT, "questions/streams"))) check(f, validateStream, "stream");

// 4. Playlists
for (const f of walk(path.join(ROOT, "questions/playlists"))) check(f, validatePlaylist, "playlist");

// 5. Cross-refs: every question_id in a stream must exist
const existingQuestionIds = new Set();
for (const f of fs.existsSync(questionDir)
  ? fs.readdirSync(questionDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".json") && !e.name.startsWith("_"))
      .map((e) => path.join(questionDir, e.name))
  : []) {
  try {
    const q = JSON.parse(fs.readFileSync(f, "utf8"));
    if (q.public_id) existingQuestionIds.add(q.public_id);
  } catch {}
}
for (const f of walk(path.join(ROOT, "questions/streams"))) {
  try {
    const s = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const qid of s.question_ids ?? []) {
      if (!existingQuestionIds.has(qid)) {
        errors.push({ file: f, type: "stream", msg: `references missing question_id: ${qid}` });
      }
    }
  } catch {}
}

console.log(`\n📋 Validated ${totalChecked} records.`);
if (errors.length) {
  console.error(`\n❌ ${errors.length} errors:`);
  for (const e of errors.slice(0, 50)) {
    console.error(`  ✗ ${path.relative(ROOT, e.file)} [${e.type}] ${e.path ?? ""} ${e.msg}`);
  }
  if (errors.length > 50) console.error(`  ... and ${errors.length - 50} more`);
  process.exit(1);
}
console.log("✓ OK");
