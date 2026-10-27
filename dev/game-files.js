// game-files.js — what ships with the game, read straight from the source.
//
// Shared by dev/build-web.js (the itch zip) and desktop/stage.js (the Steam
// app) so both builds always carry the same files. Paths are relative to the
// repo root: every ART_KEYS webp, every MUSIC_KEYS mp3, and assets/fonts.
// The source itself ships too, as index.html; callers add it.
//
//   const { html, version, artKeys, musicKeys, files, missing } = require("./game-files");
//
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "Car_Guy_Sim.html");

function gameFiles() {
  const html = fs.readFileSync(SRC, "utf8");
  const keysFrom = (listName) => {
    const m = html.match(new RegExp(`const ${listName} = \\[([\\s\\S]*?)\\];`));
    if (!m) throw new Error(`could not find ${listName} in the source.`);
    return [...m[1].matchAll(/"([a-z0-9-]+)"/g)].map((x) => x[1]);
  };
  // Same pattern dev/board-gate.js reads the version with.
  const ver = html.match(/const\s+GAME_VERSION\s*=\s*["'](\d+\.\d+\.\d+)["']/);
  if (!ver) throw new Error("could not find GAME_VERSION in the source.");

  const artKeys = keysFrom("ART_KEYS");
  const musicKeys = keysFrom("MUSIC_KEYS");
  const all = [
    ...artKeys.map((k) => `assets/art/${k}.webp`),
    ...musicKeys.map((k) => `assets/audio/${k}.mp3`),
    ...fs.readdirSync(path.join(ROOT, "assets", "fonts")).map((f) => `assets/fonts/${f}`),
  ];
  const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
  return {
    root: ROOT,
    src: SRC,
    html,
    version: ver[1],
    artKeys,
    musicKeys,
    files: all.filter(exists),
    missing: all.filter((rel) => !exists(rel)),
  };
}

module.exports = gameFiles;
