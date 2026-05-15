#!/usr/bin/env node
// Local HTTP server for the visual catalog with delete-and-prune capability.
//
// Usage: pnpm catalog:serve  → opens http://localhost:4173
// Inside catalog: click trash icon on any card → JSON+webp removed from disk,
// _index.json rebuilt, card disappears from view. No browser refresh needed.

import http from "node:http";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TOPICS_DIR = path.join(ROOT, "facts/topics");
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

function ensureSafeRelative(p) {
  const abs = path.resolve(ROOT, p);
  if (!abs.startsWith(ROOT)) throw new Error("path-escape");
  return abs;
}

async function findFactPathById(factId) {
  // factId like fact-country-france. Topic = second segment.
  const m = /^fact-([a-z0-9]+)-/.exec(factId);
  if (!m) return null;
  const topicDir = path.join(TOPICS_DIR, m[1]);
  if (!fssync.existsSync(topicDir)) return null;
  const jsonPath = path.join(topicDir, `${factId}.json`);
  if (!fssync.existsSync(jsonPath)) return null;
  return { topicDir, jsonPath, topic: m[1] };
}

async function deleteFact(factId) {
  const loc = await findFactPathById(factId);
  if (!loc) return { ok: false, reason: "not found" };
  let data;
  try { data = JSON.parse(await fs.readFile(loc.jsonPath, "utf8")); }
  catch { return { ok: false, reason: "json parse" }; }
  const imagePath = path.join(loc.topicDir, data.image || "");
  // Delete files
  await fs.rm(loc.jsonPath, { force: true });
  if (data.image) await fs.rm(imagePath, { force: true });
  // Rebuild _index.json for that topic
  const items = [];
  for (const f of await fs.readdir(loc.topicDir)) {
    if (!f.endsWith(".json") || f.startsWith("_")) continue;
    try {
      const d = JSON.parse(await fs.readFile(path.join(loc.topicDir, f), "utf8"));
      if (d.id) items.push(d.id);
    } catch {}
  }
  items.sort();
  await fs.writeFile(path.join(loc.topicDir, "_index.json"), JSON.stringify(items, null, 2));
  return { ok: true, id: factId, topic: loc.topic, removed_image: !!data.image };
}

async function regenerateCatalog() {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(__dirname, "build-catalog.mjs")], { cwd: ROOT });
    let out = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (out += d));
    proc.on("close", (code) => code === 0 ? resolve(out) : reject(new Error(out)));
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // GET / → catalog HTML
    if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
      const htmlPath = path.join(ROOT, "catalog/index.html");
      if (!fssync.existsSync(htmlPath)) await regenerateCatalog();
      const html = await fs.readFile(htmlPath, "utf8");
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      return res.end(html);
    }

    // GET /facts/topics/{topic}/{file} → image bytes
    if (req.method === "GET" && pathname.startsWith("/facts/")) {
      const abs = ensureSafeRelative(decodeURIComponent(pathname.slice(1)));
      if (!fssync.existsSync(abs)) { res.writeHead(404); return res.end(); }
      const ext = path.extname(abs).toLowerCase();
      const data = await fs.readFile(abs);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-cache" });
      return res.end(data);
    }

    // DELETE /api/fact/{factId}
    if (req.method === "DELETE" && pathname.startsWith("/api/fact/")) {
      const factId = decodeURIComponent(pathname.slice("/api/fact/".length));
      const result = await deleteFact(factId);
      console.log(`DELETE ${factId} → ${result.ok ? "OK" : "FAIL: " + result.reason}`);
      res.writeHead(result.ok ? 200 : 404, { "Content-Type": MIME[".json"] });
      return res.end(JSON.stringify(result));
    }

    // POST /api/regenerate → rebuild catalog (after batch updates)
    if (req.method === "POST" && pathname === "/api/regenerate") {
      const out = await regenerateCatalog();
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      return res.end(JSON.stringify({ ok: true, out }));
    }

    res.writeHead(404); res.end("not found");
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end(String(e.message || e));
  }
});

server.listen(PORT, () => {
  console.log(`📚 catalog server: http://localhost:${PORT}`);
  console.log("   GET  /            — catalog UI");
  console.log("   GET  /facts/...   — images");
  console.log("   DELETE /api/fact/{id}");
  console.log("   POST /api/regenerate");
});
