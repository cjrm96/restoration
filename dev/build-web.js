#!/usr/bin/env node
// build-web.js — produce the itch/web upload: dist/car-guy-sim-itch.zip.
//
// The zip is the game exactly as it runs from disk: the source becomes
// index.html at the zip root, beside the assets/ folders it points at (every
// ART_KEYS webp, every MUSIC_KEYS mp3, and assets/fonts). itch serves the
// files next to each other, so the page itself stays ~2 MB and the art and
// songs load as they are needed. Upload the zip and tick "This file will be
// played in the browser".
//
// Why not one big HTML with everything inlined: that file passed 50 MB once
// the music landed and itch stopped loading it.
//
//   node dev/build-web.js
//
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const gameFiles = require("./game-files");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "dist");
const OUT = path.join(OUT_DIR, "car-guy-sim-itch.zip");

let game;
try {
  game = gameFiles();
} catch (e) {
  console.error("build-web: " + e.message);
  process.exit(1);
}
if (game.missing.length) {
  console.error("build-web: missing assets:\n  " + game.missing.join("\n  "));
  process.exit(1);
}
const { artKeys, musicKeys } = game;
const files = [
  ["index.html", fs.readFileSync(game.src)],
  ...game.files.map((rel) => [rel, fs.readFileSync(path.join(ROOT, rel))]),
];

// ── minimal zip writer ──
// Media is already compressed, so it is stored; text gets deflated.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const STORED = /\.(webp|mp3|png|jpe?g|woff2?)$/i;
const locals = [];
const centrals = [];
let offset = 0;
for (const [name, data] of files) {
  const nameBuf = Buffer.from(name, "utf8");
  const deflate = !STORED.test(name);
  const body = deflate ? zlib.deflateRawSync(data, { level: 9 }) : data;
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(deflate ? 8 : 0, 8);
  local.writeUInt32LE(0x00210000, 10); // 1980-01-01 00:00, keeps builds byte-identical
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(deflate ? 8 : 0, 10);
  central.writeUInt32LE(0x00210000, 12);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt32LE(offset, 42);
  locals.push(local, nameBuf, body);
  centrals.push(central, nameBuf);
  offset += 30 + nameBuf.length + body.length;
}
const centralBuf = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);

fs.mkdirSync(OUT_DIR, { recursive: true });
// Clear the old single-file build so nobody uploads it by mistake.
try { fs.unlinkSync(path.join(OUT_DIR, "Car_Guy_Sim.html")); } catch (e) {}
const zip = Buffer.concat([...locals, centralBuf, end]);
fs.writeFileSync(OUT, zip);
const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(
  `build-web: ${files.length} files (index.html, ${artKeys.length} art, ` +
    `${musicKeys.length} music) -> dist/car-guy-sim-itch.zip (${mb(zip.length)} MB)`,
);
