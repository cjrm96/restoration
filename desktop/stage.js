#!/usr/bin/env node
// stage.js — copy the game into desktop/web/ for the desktop (Steam) app.
//
// Read-only on the game: Car_Guy_Sim.html and assets/ are copied, never
// edited, so the itch build is untouched. The source becomes index.html beside
// the same files the itch zip carries (dev/game-files.js lists them for both).
//
// Unchanged files are left alone (same size and time), so Tauri doesn't
// re-embed every asset on each local build.
//
// Also writes desktop/version.json from GAME_VERSION, which the Tauri build
// reads (see package.json) so the app's version stamps from the one source of
// truth.
//
//   node desktop/stage.js
//
const fs = require("fs");
const path = require("path");
const gameFiles = require("../dev/game-files");

const OUT = path.join(__dirname, "web");

let game;
try {
  game = gameFiles();
} catch (e) {
  console.error("stage: " + e.message);
  process.exit(1);
}
if (game.missing.length) {
  console.error("stage: missing assets:\n  " + game.missing.join("\n  "));
  process.exit(1);
}

// [destination relative to web/, source path]
const copies = [
  ["index.html", game.src],
  ...game.files.map((rel) => [rel, path.join(game.root, rel)]),
];

let copied = 0;
for (const [rel, src] of copies) {
  const dest = path.join(OUT, rel);
  const s = fs.statSync(src);
  const d = fs.existsSync(dest) && fs.statSync(dest);
  if (d && d.size === s.size && Math.floor(d.mtimeMs) === Math.floor(s.mtimeMs)) continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  fs.utimesSync(dest, s.atimeMs / 1000, s.mtimeMs / 1000);
  copied++;
}

// Drop anything the game no longer ships.
const keep = new Set(copies.map(([rel]) => path.join(OUT, rel)));
(function prune(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) prune(p);
    else if (!keep.has(p)) fs.rmSync(p);
  }
})(OUT);

const versionFile = path.join(__dirname, "version.json");
const versionJson = JSON.stringify({ version: game.version }) + "\n";
if (!fs.existsSync(versionFile) || fs.readFileSync(versionFile, "utf8") !== versionJson) {
  fs.writeFileSync(versionFile, versionJson);
}

console.log(
  `stage: v${game.version}, ${copies.length} files (index.html, ${game.artKeys.length} art, ` +
    `${game.musicKeys.length} music), ${copied} updated -> desktop/web/`,
);
