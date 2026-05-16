#!/usr/bin/env node
// Build a local visual catalog of all facts under facts/topics/.
// Output: catalog/index.html — single self-contained page.
// Open in any browser (file://) — no server required.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TOPICS_DIR = path.join(ROOT, "facts/topics");
const OUT_DIR = path.join(ROOT, "catalog");
const OUT_FILE = path.join(OUT_DIR, "index.html");

// Soft targets for v1 corpus. Used to highlight gaps in the UI.
const TARGETS = {
  country: 60, element: 50, quote: 45, space: 35, history: 40, art: 35,
  nature: 35, architecture: 35, food: 30, science: 35, language: 20,
  math: 25, music: 30, economy: 25, materials: 25, ratings: 25, events: 30,
  infographics: 40, terms: 40,
};

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

function deriveSource(url) {
  if (!url) return "Unknown";
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host.endsWith("wikipedia.org")) {
      const lang = host.split(".")[0].toUpperCase();
      return `Wikipedia ${lang}`;
    }
    if (host === "commons.wikimedia.org") return "Wikimedia Commons";
    if (host === "ourworldindata.org") return "Our World in Data";
    if (host.includes("nasa.gov")) return "NASA";
    if (host.includes("noaa.gov")) return "NOAA";
    if (host.includes("usgs.gov")) return "USGS";
    if (host.includes("wellcomecollection.org")) return "Wellcome Collection";
    if (host.includes("metmuseum.org")) return "Met Museum";
    if (host.includes("rijksmuseum.nl")) return "Rijksmuseum";
    if (host.includes("si.edu")) return "Smithsonian";
    if (host.includes("loc.gov")) return "Library of Congress";
    if (host.includes("cdc.gov")) return "CDC";
    return host;
  } catch { return "Unknown"; }
}

const topics = {};
if (!fs.existsSync(TOPICS_DIR)) {
  console.error("No facts/topics dir found.");
  process.exit(1);
}

for (const topicName of fs.readdirSync(TOPICS_DIR).sort()) {
  const topicDir = path.join(TOPICS_DIR, topicName);
  if (!fs.statSync(topicDir).isDirectory()) continue;
  topics[topicName] = [];
  for (const f of fs.readdirSync(topicDir).sort()) {
    if (!f.endsWith(".json") || f.startsWith("_")) continue;
    try {
      const data = readJson(path.join(topicDir, f));
      const webpPath = path.join(topicDir, data.image);
      const exists = fs.existsSync(webpPath);
      const sizeKB = exists ? (fs.statSync(webpPath).size / 1024).toFixed(0) : null;
      topics[topicName].push({
        id: data.id,
        title: data.title,
        caption: data.caption,
        image: `/facts/topics/${topicName}/${data.image}`,
        license: data.license,
        year: data.year,
        credit: data.credit,
        source: data.source,
        source_type: deriveSource(data.source),
        width: data.image_width,
        height: data.image_height,
        sizeKB,
        exists,
      });
    } catch (e) {
      console.warn(`skip ${f}: ${e.message}`);
    }
  }
}

const totalFacts = Object.values(topics).reduce((s, arr) => s + arr.length, 0);
const topicNames = Object.keys(topics);

function gapStatus(topic, count) {
  const target = TARGETS[topic] ?? 30;
  const ratio = count / target;
  if (ratio >= 1) return { color: "#3ce06b", label: "OK", target };
  if (ratio >= 0.5) return { color: "#f5b441", label: "MID", target };
  return { color: "#ec4444", label: "GAP", target };
}

const data = topicNames.map((t) => {
  const arr = topics[t];
  const status = gapStatus(t, arr.length);
  return { topic: t, count: arr.length, target: status.target, color: status.color, label: status.label, facts: arr };
}).sort((a, b) => b.count - a.count);

// License distribution
const licenseCounts = {};
const sourceCounts = {};
for (const t of topicNames) {
  for (const f of topics[t]) {
    licenseCounts[f.license] = (licenseCounts[f.license] || 0) + 1;
    sourceCounts[f.source_type] = (sourceCounts[f.source_type] || 0) + 1;
  }
}
const sourcesList = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>qs4me-content · каталог фактов</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#0e1116; color:#e6e8eb; margin:0; padding:0; }
  header { position:sticky; top:0; background:#0e1116; border-bottom:1px solid #222; padding:16px 24px; z-index:100; }
  header h1 { margin:0 0 4px; font-size:18px; }
  header .stats { color:#8a8f98; font-size:13px; }
  header .stats strong { color:#e6e8eb; }
  nav { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }
  nav a { padding:4px 10px; border-radius:14px; background:#1c2129; color:#cdd0d5; text-decoration:none; font-size:12px; border:1px solid transparent; }
  nav a:hover { border-color:#39414e; }
  nav a .count { opacity:0.7; margin-left:6px; }
  nav a .dot { display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:6px; vertical-align:middle; }
  main { padding:16px 24px 48px; max-width:1600px; margin:0 auto; }
  section { margin-bottom:48px; }
  section h2 { font-size:22px; margin:0 0 4px; display:flex; align-items:baseline; gap:12px; }
  section h2 .badge { font-size:11px; font-weight:600; padding:2px 8px; border-radius:10px; color:#000; }
  section h2 .meta { font-size:13px; color:#8a8f98; font-weight:normal; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:12px; margin-top:12px; }
  .card { background:#161b22; border:1px solid #222a35; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; transition:border-color 0.1s; cursor:pointer; }
  .card:hover { border-color:#3b82f6; }
  .card .img { aspect-ratio:1.3; background:#0a0d12; overflow:hidden; display:flex; align-items:center; justify-content:center; }
  .card .img img { width:100%; height:100%; object-fit:contain; display:block; background:#0a0d12; }
  .card .del-btn { position:absolute; top:4px; right:4px; width:24px; height:24px; border:none; border-radius:50%; background:rgba(236,68,68,0.85); color:white; font-size:14px; cursor:pointer; display:none; align-items:center; justify-content:center; line-height:0; padding:0; }
  .card .keep-btn { position:absolute; top:4px; right:32px; width:24px; height:24px; border:none; border-radius:50%; background:rgba(60,224,107,0.85); color:white; font-size:14px; cursor:pointer; display:none; align-items:center; justify-content:center; line-height:0; padding:0; }
  .card:hover .del-btn, .card:hover .keep-btn { display:flex; }
  .card .del-btn:hover { background:rgba(220,38,38,1); transform:scale(1.1); }
  .card .keep-btn:hover { background:rgba(34,197,94,1); transform:scale(1.1); }
  .card.reviewed { display:none !important; }
  #progress { color:#3ce06b; font-size:13px; margin-left:12px; }
  #reset-review { background:#1c2129; color:#cdd0d5; border:1px solid #2a323c; border-radius:6px; padding:6px 12px; font-size:12px; cursor:pointer; margin-left:12px; }
  #reset-review:hover { border-color:#ec4444; color:#ec4444; }
  .card { position:relative; }
  .card.deleting { opacity:0.5; pointer-events:none; }
  .card.deleted { display:none !important; }
  #toast { position:fixed; bottom:20px; right:20px; background:#161b22; border:1px solid #2a323c; padding:8px 14px; border-radius:6px; opacity:0; transition:opacity 0.2s; z-index:300; font-size:12px; }
  #toast.show { opacity:1; }
  .card .body { padding:10px 12px; display:flex; flex-direction:column; gap:6px; flex:1; }
  .card .title { font-weight:600; font-size:13px; line-height:1.3; }
  .card .caption { color:#a8acb4; font-size:12px; line-height:1.4; flex:1; }
  .card .meta { color:#6c727b; font-size:11px; display:flex; justify-content:space-between; }
  .card .badge-lic { font-size:10px; color:#a8acb4; }
  #search-wrap { padding:8px 0; }
  #search { background:#1c2129; color:#e6e8eb; border:1px solid #2a323c; border-radius:6px; padding:6px 12px; width:300px; font-size:13px; }
  #search:focus { outline:none; border-color:#3b82f6; }
  #source-tabs { display:flex; flex-wrap:wrap; gap:4px; margin-top:10px; padding-top:10px; border-top:1px solid #1c2129; }
  #source-tabs button { background:#1c2129; color:#cdd0d5; border:1px solid transparent; border-radius:14px; padding:5px 12px; font-size:12px; cursor:pointer; }
  #source-tabs button:hover { border-color:#39414e; }
  #source-tabs button.active { background:#3b82f6; color:white; border-color:#3b82f6; }
  #source-tabs button .scount { opacity:0.7; margin-left:6px; }
  #modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:200; cursor:pointer; padding:24px; align-items:center; justify-content:center; }
  #modal.open { display:flex; }
  #modal img { max-width:90vw; max-height:80vh; object-fit:contain; }
  #modal-info { position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:#161b22; padding:12px 18px; border-radius:8px; max-width:80vw; }
  .hidden { display:none !important; }
  .target-bar { display:inline-block; width:80px; height:6px; background:#2a323c; border-radius:3px; overflow:hidden; vertical-align:middle; margin-left:6px; }
  .target-bar > div { height:100%; }
</style>
</head>
<body>
<header>
  <h1>qs4me-content · каталог фактов</h1>
  <div class="stats">
    Всего: <strong>${totalFacts}</strong> фактов в <strong>${topicNames.length}</strong> топиках ·
    Лицензии:
    ${Object.entries(licenseCounts).sort((a, b) => b[1] - a[1]).map(([l, c]) => `<strong>${l}</strong> ${c}`).join(" · ")}
  </div>
  <nav>
    ${data.map((d) => `<a href="#topic-${d.topic}"><span class="dot" style="background:${d.color}"></span>${d.topic}<span class="count">${d.count}/${d.target}</span></a>`).join("")}
  </nav>
  <div id="source-tabs">
    <button data-source="*" class="active">Все источники<span class="scount">${totalFacts}</span></button>
    ${sourcesList.map(([s, c]) => `<button data-source="${escapeHtml(s)}">${escapeHtml(s)}<span class="scount">${c}</span></button>`).join("")}
  </div>
  <div id="search-wrap">
    <input id="search" placeholder="Фильтр по title / caption / id… (Ctrl+F)" autocomplete="off">
    <span id="progress">Ревью: <span id="reviewed-n">0</span>/${totalFacts}</span>
    <button id="reset-review" onclick="resetReview()">Сбросить ревью</button>
  </div>
</header>
<main>
${data.map((d) => `
  <section id="topic-${d.topic}" data-topic="${d.topic}">
    <h2>
      <span class="badge" style="background:${d.color}">${d.label}</span>
      ${d.topic}
      <span class="meta">${d.count} / ${d.target} цель
        <span class="target-bar"><div style="width:${Math.min(100, (d.count / d.target) * 100).toFixed(0)}%; background:${d.color};"></div></span>
      </span>
    </h2>
    <div class="grid">
      ${d.facts.map((f) => `
        <div class="card" data-id="${escapeHtml(f.id)}" data-title="${escapeHtml(f.title.toLowerCase())}" data-caption="${escapeHtml(f.caption.toLowerCase())}" data-source="${escapeHtml(f.source_type)}" onclick="openModal(event, this)">
          <div class="img">${f.exists ? `<img src="${f.image}" alt="${escapeHtml(f.title)}" loading="lazy">` : `<span style="color:#666">no image</span>`}<button class="keep-btn" onclick="keepFact(event, this)" title="Оставить (скрыть из ленты ревью)">✓</button><button class="del-btn" onclick="deleteFact(event, this)" title="Удалить из репо">×</button></div>
          <div class="body">
            <div class="title">${escapeHtml(f.title)}</div>
            <div class="caption">${escapeHtml(f.caption)}</div>
            <div class="meta">
              <span>${f.width || "?"}×${f.height || "?"} · ${f.sizeKB ?? "?"}KB</span>
              <span class="badge-lic">${f.license}${f.year != null ? ` · ${f.year}` : ""}</span>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  </section>
`).join("")}
</main>

<div id="modal" onclick="closeModal(event)">
  <img id="modal-img" src="" alt="">
  <div id="modal-info"></div>
</div>

<script>
  const search = document.getElementById("search");
  let activeSource = "*";
  function applyFilters() {
    const q = search.value.toLowerCase().trim();
    document.querySelectorAll(".card").forEach(c => {
      const matchSearch = !q || c.dataset.title.includes(q) || c.dataset.caption.includes(q) || c.dataset.id.includes(q);
      const matchSource = activeSource === "*" || c.dataset.source === activeSource;
      c.classList.toggle("hidden", !(matchSearch && matchSource));
    });
    document.querySelectorAll("section").forEach(s => {
      const visible = s.querySelectorAll(".card:not(.hidden)").length;
      s.style.display = (visible > 0) ? "" : "none";
    });
  }
  search.addEventListener("input", applyFilters);
  document.querySelectorAll("#source-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#source-tabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeSource = btn.dataset.source;
      applyFilters();
    });
  });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); search.focus(); search.select(); }
    if (e.key === "Escape") { closeModal(); search.blur(); }
  });
  function openModal(e, card) {
    if (e.target.classList.contains("del-btn")) return;
    const img = card.querySelector("img");
    if (!img) return;
    const m = document.getElementById("modal");
    const mi = document.getElementById("modal-img");
    const info = document.getElementById("modal-info");
    mi.src = img.src;
    info.innerHTML = "<strong>" + card.querySelector(".title").textContent + "</strong><br>" + card.querySelector(".caption").textContent + "<br><small>" + card.dataset.id + "</small>";
    m.classList.add("open");
  }
  async function deleteFact(e, btn) {
    e.stopPropagation();
    const card = btn.closest(".card");
    const id = card.dataset.id;
    if (!confirm("Удалить «" + card.querySelector(".title").textContent + "»?\nJSON и webp будут стёрты из репо.")) return;
    card.classList.add("deleting");
    try {
      const r = await fetch("/api/fact/" + encodeURIComponent(id), { method: "DELETE" });
      const data = await r.json();
      if (r.ok && data.ok) {
        card.classList.add("deleted");
        showToast("Удалено: " + id);
      } else {
        card.classList.remove("deleting");
        showToast("Ошибка: " + (data.reason || r.status));
      }
    } catch (err) {
      card.classList.remove("deleting");
      showToast("Сеть упала. Каталог открыт через file://? Запусти pnpm catalog:serve.");
    }
  }
  let toastTimer;
  function showToast(msg) {
    const t = document.getElementById("toast") || (() => {
      const el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); return el;
    })();
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
  }
  function closeModal(e) {
    if (e && e.target.tagName === "IMG") return;
    document.getElementById("modal").classList.remove("open");
  }
  const REVIEW_KEY = "qs4me-reviewed-v1";
  function getReviewed() {
    try { return new Set(JSON.parse(localStorage.getItem(REVIEW_KEY) || "[]")); }
    catch { return new Set(); }
  }
  function setReviewed(set) {
    localStorage.setItem(REVIEW_KEY, JSON.stringify([...set]));
    document.getElementById("reviewed-n").textContent = set.size;
  }
  function applyReviewed() {
    const reviewed = getReviewed();
    document.querySelectorAll(".card").forEach(c => {
      if (reviewed.has(c.dataset.id)) c.classList.add("reviewed");
    });
    document.getElementById("reviewed-n").textContent = reviewed.size;
  }
  function keepFact(e, btn) {
    e.stopPropagation();
    const card = btn.closest(".card");
    const reviewed = getReviewed();
    reviewed.add(card.dataset.id);
    setReviewed(reviewed);
    card.classList.add("reviewed");
  }
  function resetReview() {
    if (!confirm("Сбросить весь прогресс ревью? Все скрытые карточки покажутся снова.")) return;
    localStorage.removeItem(REVIEW_KEY);
    document.querySelectorAll(".card.reviewed").forEach(c => c.classList.remove("reviewed"));
    document.getElementById("reviewed-n").textContent = 0;
  }
  // Auto-mark deleted as reviewed too
  const origDelete = deleteFact;
  deleteFact = async function(e, btn) {
    const card = btn.closest(".card");
    await origDelete(e, btn);
    if (card.classList.contains("deleted")) {
      const reviewed = getReviewed();
      reviewed.add(card.dataset.id);
      setReviewed(reviewed);
    }
  };
  applyReviewed();
</script>
</body>
</html>
`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, html);
console.log(`✓ catalog/index.html written (${totalFacts} facts across ${topicNames.length} topics)`);
console.log(`  Open: ${OUT_FILE}`);
