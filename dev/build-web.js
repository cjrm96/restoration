#!/usr/bin/env node
// build-web.js — produce the single-file itch/web build.
//
// The source Car_Guy_Sim.html points CUTSCENE_ART at assets/art/<key>.webp so
// the repo stays small and the game runs from disk with no build. For the web
// (itch, the playable demo) we want the old one-file-you-can-host artifact, so
// this inlines every asset back into data-URIs between the __ART_MAP__ markers
// and writes dist/Car_Guy_Sim.html. Behavior is identical to the split build.
//
//   node dev/build-web.js
//
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "Car_Guy_Sim.html");
const ART_DIR = path.join(ROOT, "assets", "art");
const OUT_DIR = path.join(ROOT, "dist");
const OUT = path.join(OUT_DIR, "Car_Guy_Sim.html");

const html = fs.readFileSync(SRC, "utf8");

// Pull the key list straight from the source so the two never drift.
const keysMatch = html.match(/const ART_KEYS = \[([\s\S]*?)\];/);
if (!keysMatch) {
  console.error("build-web: could not find ART_KEYS in the source.");
  process.exit(1);
}
const keys = [...keysMatch[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);

let missing = [];
const pairs = keys.map((k) => {
  const file = path.join(ART_DIR, `${k}.webp`);
  if (!fs.existsSync(file)) {
    missing.push(`${k}.webp`);
    return `"${k}":""`;
  }
  const b64 = fs.readFileSync(file).toString("base64");
  return `"${k}":"data:image/webp;base64,${b64}"`;
});
if (missing.length) {
  console.error("build-web: missing assets:\n  " + missing.join("\n  "));
  process.exit(1);
}

// Replace the marked expression with an inline object literal, keeping the
// markers so a rebuild is idempotent.
const START = "/*__ART_MAP__*/";
const END = "/*__END_ART_MAP__*/";
const s = html.indexOf(START);
const e = html.indexOf(END);
if (s === -1 || e === -1 || e < s) {
  console.error("build-web: art-map markers not found in the source.");
  process.exit(1);
}
const inlined =
  html.slice(0, s) +
  `${START} {${pairs.join(",")}} ${END}` +
  html.slice(e + END.length);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, inlined);
const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(
  `build-web: inlined ${keys.length} assets -> dist/Car_Guy_Sim.html ` +
    `(${mb(Buffer.byteLength(inlined))} MB, single file)`,
);
