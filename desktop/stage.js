#!/usr/bin/env node
// stage.js — copy the game into desktop/web/ for the desktop (Steam) app.
//
// Read-only on the game: Car_Guy_Sim.html and assets/ are copied, never
// edited, so the itch build is untouched. The source becomes index.html beside
// the same assets/ files build-web.js puts in the itch zip, read from the same
// ART_KEYS / MUSIC_KEYS lists so the two builds never drift.
//
// Also writes web/version.json from GAME_VERSION, which the Tauri build reads
// so the desktop app's version stamps from the one source of truth.
//
//   node desktop/stage.js
//
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "Car_Guy_Sim.html");
const OUT = path.join(__dirname, "web");

const html = fs.readFileSync(SRC, "utf8");

function keysFrom(listName) {
  const m = html.match(new RegExp(`const ${listName} = \\[([\\s\\S]*?)\\];`));
  if (!m) {
    console.error(`stage: could not find ${listName} in the source.`);
    process.exit(1);
  }
  return [...m[1].matchAll(/"([a-z0-9-]+)"/g)].map((x) => x[1]);
}
const ver = html.match(/const GAME_VERSION = "(\d+\.\d+\.\d+)"/);
if (!ver) {
  console.error("stage: could not find GAME_VERSION in the source.");
  process.exit(1);
}

const files = [];
const missing = [];
function add(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) return missing.push(rel);
  files.push(rel);
}
const artKeys = keysFrom("ART_KEYS");
const musicKeys = keysFrom("MUSIC_KEYS");
artKeys.forEach((k) => add(`assets/art/${k}.webp`));
musicKeys.forEach((k) => add(`assets/audio/${k}.mp3`));
for (const f of fs.readdirSync(path.join(ROOT, "assets", "fonts"))) add(`assets/fonts/${f}`);
if (missing.length) {
  console.error("stage: missing assets:\n  " + missing.join("\n  "));
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(SRC, path.join(OUT, "index.html"));
for (const rel of files) {
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.copyFileSync(path.join(ROOT, rel), path.join(OUT, rel));
}
// Tauri merges this over tauri.conf.json at build time (see package.json).
fs.writeFileSync(path.join(__dirname, "version.json"), JSON.stringify({ version: ver[1] }) + "\n");

console.log(
  `stage: v${ver[1]}, ${files.length + 1} files (index.html, ${artKeys.length} art, ` +
    `${musicKeys.length} music) -> desktop/web/`,
);
