/*
 * Cars & Coffee backdrop generator.
 *
 * Scale, which is the whole problem this scene had: the player's truck sprite
 * is composited over the backdrop at a fixed size, and it measures 309 of
 * these 700 units wide with its wheels at y=189. An F-100 is about 4.9m, so
 * the near field runs at roughly 63 units per metre. The plaza used to be
 * drawn at about 10, so a show car came out a sixth of the size of the truck
 * parked next to it. The row behind the truck is drawn at ~26 units/m now
 * (one row further back), and the storefronts at ~14, which is a believable
 * fall-off across a parking aisle instead of a cliff.
 *
 * Run: node dev/gen-cars-and-coffee.js   (prints the srcdoc to stdout)
 */
const W = 700, H = 240;
const GROUND = 150;   // where the buildings meet the walk
const r = (x,y,w,h,f,o) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${o!=null?` opacity="${o}"`:""}/>`;
const poly = (pts,f,o) => `<polygon points="${pts}" fill="${f}"${o!=null?` opacity="${o}"`:""}/>`;
const smooth = (s) => `<g shape-rendering="auto">${s}</g>`;

let o = "";

/* ── sky down to the walk, so any gap between blocks shows the plaza ── */
o += smooth(r(0,0,W,GROUND,"url(#skyCC)"));

/* ── dry hills, seen only through the gap ── */
o += smooth(poly(`0,86 70,72 150,80 240,66 330,78 420,70 520,82 620,68 700,78 700,${GROUND} 0,${GROUND}`,"#93a08d"));
o += smooth(poly(`0,96 90,88 190,94 300,86 400,94 500,90 600,96 700,90 700,${GROUND} 0,${GROUND}`,"#7d8a79"));

/* ── street trees over the far roofline ── */
const tree = (x, base, s, dark, lit) => {
  let t = r(x-3, base-18*s, 6, 20*s, "#3a2b22");
  t += smooth(`<circle cx="${x}" cy="${base-32*s}" r="${19*s}" fill="${dark}"/>`);
  t += smooth(`<circle cx="${x-13*s}" cy="${base-24*s}" r="${13*s}" fill="${dark}"/>`);
  t += smooth(`<circle cx="${x+14*s}" cy="${base-25*s}" r="${14*s}" fill="${dark}"/>`);
  t += smooth(`<circle cx="${x-5*s}" cy="${base-39*s}" r="${12*s}" fill="${lit}"/>`);
  t += smooth(`<circle cx="${x+10*s}" cy="${base-35*s}" r="${9*s}" fill="${lit}"/>`);
  return t;
};
o += tree(262, 112, 1.25, "#3f5c3c", "#5c7d4b");
o += tree(330, 108, 1.0,  "#395436", "#537043");
o += tree(388, 114, 1.15, "#43613f", "#628350");

/* ── the plaza carries on through the gap: same tile and stucco, far enough
      back to read as distance, with cars already parked under it ── */
o += r(214, 108, 180, 42, "#d9cdb4");
o += r(214, 108, 180, 3, "#eae0c9");
o += r(210, 100, 188, 9, "#a8542f");
o += r(210, 100, 188, 3, "#c47049");
for (let i = 0; i < 188; i += 6) o += r(210 + i, 103, 2, 6, "#8f4527");
for (let i = 0; i < 4; i++) o += r(226 + i * 42, 118, 26, 26, "#4a4136");
o += r(214, 144, 180, 6, "#4e4f53");
for (let i = 0; i < 4; i++) {
  const cx = 222 + i * 44;
  o += r(cx, 136, 22, 8, ["#7b6a5c","#56687c","#7a5a58","#5f6b58"][i]);
  o += r(cx + 4, 131, 14, 5, ["#8d7d6e","#66788c","#8b6b68","#6f7b68"][i]);
  o += r(cx, 143, 22, 2, "#3a3b3f");
}

/* ── a mission storefront block, drawn big enough to sit on this ground ── */
function block(x, w, top, opts) {
  const o2 = opts || {}, roofH = 17;
  let b = r(x, top + roofH, w, GROUND - top - roofH, "#e6dac1");
  b += r(x, top + roofH, w, 4, "#f3ead7");
  b += r(x, GROUND - 22, w, 22, "#d5c8ac");
  b += r(x - 6, top, w + 12, roofH, "#a8542f");
  b += r(x - 6, top, w + 12, 3, "#c47049");
  for (let i = 0; i < w + 12; i += 8) b += r(x - 6 + i, top + 3, 3, roofH - 3, "#8f4527");
  b += r(x - 6, top + roofH - 3, w + 12, 3, "#7a3a20");
  const n = o2.arches, pad = o2.pad != null ? o2.pad : 20;
  const span = (w - pad * 2) / n;
  for (let i = 0; i < n; i++) {
    const aw = span * 0.74, ax = x + pad + i * span + (span - aw) / 2;
    const ay = top + roofH + 20, ah = GROUND - ay - 4;
    b += smooth(`<path d="M${ax} ${ay + ah} L${ax} ${ay + aw/2} A ${aw/2} ${aw/2} 0 0 1 ${ax+aw} ${ay + aw/2} L${ax+aw} ${ay+ah} Z" fill="#4a4136"/>`);
    b += smooth(`<path d="M${ax+4} ${ay+ah} L${ax+4} ${ay + aw/2} A ${aw/2-4} ${aw/2-4} 0 0 1 ${ax+aw-4} ${ay+aw/2} L${ax+aw-4} ${ay+ah} Z" fill="#2f2a24"/>`);
    b += smooth(poly(`${ax+7},${ay+ah-3} ${ax+aw*0.44},${ay+ah-3} ${ax+aw*0.2},${ay+aw*0.5} ${ax+7},${ay+aw*0.78}`, "#b9cfd6", 0.28));
  }
  if (o2.shutters != null) {
    const sx = o2.shutters, sy = top + roofH + 12;
    b += r(sx, sy, 26, 34, "#2f2a24");
    b += smooth(poly(`${sx+3},${sy+3} ${sx+14},${sy+3} ${sx+7},${sy+30} ${sx+3},${sy+30}`, "#c8d8d4", 0.32));
    b += r(sx - 10, sy - 2, 9, 38, "#3f7f76");
    b += r(sx + 27, sy - 2, 9, 38, "#3f7f76");
  }
  return b;
}
o += block(-40, 250, 22, { arches: 2, shutters: 176 });
o += block(410, 330, 12, { arches: 3 });

/* ── clipped hedge along the base of each block ── */
function hedge(x, w, y) {
  let h = r(x, y, w, 18, "#33502f");
  for (let i = 0; i < w; i += 13) h += smooth(`<circle cx="${x+i+6}" cy="${y+2}" r="8" fill="#3d6136"/>`);
  for (let i = 0; i < w; i += 13) h += smooth(`<circle cx="${x+i+6}" cy="${y}" r="5" fill="#4e7a41"/>`);
  return h;
}
o += hedge(-46, 258, 134);
o += hedge(416, 322, 134);

/* ── cast-iron lamps, painted the same teal as the shutters ── */
function lamp(x, base, h) {
  let l = r(x - 8, base - 7, 16, 7, "#2c5b55");
  l += r(x - 4, base - h, 8, h, "#3f7f76");
  l += r(x - 2, base - h, 2, h, "#5aa79c");
  l += smooth(poly(`${x-13},${base-h-7} ${x+13},${base-h-7} ${x+9},${base-h-24} ${x-9},${base-h-24}`, "#2c5b55"));
  l += smooth(poly(`${x-9},${base-h-9} ${x+9},${base-h-9} ${x+6},${base-h-22} ${x-6},${base-h-22}`, "#f7e6bc"));
  l += r(x - 5, base - h - 30, 10, 6, "#2c5b55");
  l += smooth(`<circle cx="${x}" cy="${base-h-16}" r="26" fill="#ffe9b8" opacity="0.10"/>`);
  return l;
}
o += lamp(236, 156, 74);
o += lamp(612, 156, 74);

/* ── umbrella and table on the walk outside the coffee place ── */
o += r(517, 104, 3, 50, "#7a6a52");
o += smooth(poly("477,107 497,111 518,107 539,111 559,107 518,80", "#efe2c6"));
o += smooth(poly("518,107 539,111 559,107 518,80", "#dbcdae"));
o += r(515, 77, 6, 5, "#7a6a52");
o += r(504, 141, 3, 13, "#5f5344");
o += r(529, 141, 3, 13, "#5f5344");
o += r(499, 136, 38, 5, "#7a6c58");

/* ── walk, curb, lot ── */
o += r(0, GROUND, W, 16, "#c9c2b3");
o += r(0, GROUND, W, 3, "#ddd6c6");
for (let x = 40; x < W; x += 88) o += r(x, GROUND + 2, 2, 14, "#b3ac9d");
o += r(0, GROUND + 16, W, 7, "#aca596");
o += r(0, GROUND + 22, W, 3, "#8e887b");
o += r(0, GROUND + 24, W, H - GROUND - 24, "#45464a");
o += smooth(r(0, GROUND + 24, W, H - GROUND - 24, "url(#poolCC)"));

/* ── angle parking. One row, drawn at the size a row one car-length behind
      the truck actually is, so the stalls are wide and only a few fit. ── */
const SLANT = 26;
for (let i = -1; i < 7; i++) {
  const x = i * 132 + 4;
  o += smooth(`<path d="M${x} 218 L${x + SLANT} 176" stroke="#cfcabb" stroke-width="3" opacity="0.42" fill="none"/>`);
}
o += smooth(`<path d="M0 219 L700 219" stroke="#cfcabb" stroke-width="3" opacity="0.26" fill="none"/>`);

function showCar(x, y, s, body, roof) {
  const w = 118 * s, h = 38 * s;
  let c = smooth(poly(`${x+7},${y+h+6*s} ${x+w+9},${y+h+6*s} ${x+w},${y+h+14*s} ${x-2},${y+h+14*s}`, "#1d1e21", 0.42));
  c += smooth(poly(`${x},${y+h} ${x+w},${y+h} ${x+w-8*s},${y+11*s} ${x+10*s},${y+11*s}`, body));
  c += smooth(poly(`${x+24*s},${y+11*s} ${x+w-28*s},${y+11*s} ${x+w-38*s},${y} ${x+34*s},${y}`, roof));
  c += smooth(poly(`${x+28*s},${y+9*s} ${x+w-33*s},${y+9*s} ${x+w-38*s},${y+2*s} ${x+34*s},${y+2*s}`, "#22333d", 0.85));
  c += smooth(poly(`${x+11*s},${y+13*s} ${x+w-9*s},${y+13*s} ${x+w-9*s},${y+16*s} ${x+11*s},${y+16*s}`, "#ffffff", 0.14));
  c += r(x + 4*s, y + 20*s, 7*s, 5*s, "#e8c98a");
  c += r(x + w - 11*s, y + 20*s, 7*s, 5*s, "#a33b30");
  for (const cx of [x + 27*s, x + w - 27*s]) {
    c += smooth(`<circle cx="${cx}" cy="${y+h}" r="${9*s}" fill="#17181b"/>`);
    c += smooth(`<circle cx="${cx}" cy="${y+h}" r="${4.2*s}" fill="#8b8f95"/>`);
    c += smooth(`<circle cx="${cx}" cy="${y+h}" r="${1.6*s}" fill="#5c6066"/>`);
  }
  return `<g transform="translate(${x+w/2} ${y+h}) skewX(-11) translate(${-(x+w/2)} ${-(y+h)})">${c}</g>`;
}
o += showCar(-46, 168, 1.0,  "#8d2c2c", "#6f2222");
o += showCar(72,  170, 1.02, "#c8a23a", "#a8862c");
o += showCar(470, 170, 1.02, "#2d5c47", "#234a39");
o += showCar(592, 168, 1.0,  "#b25a25", "#8f471d");

/* ── the people, at the size a person is when they are standing at the curb
      of the row you are parked in. Each one has a coffee. ── */
function person(x, base, s, lean) {
  const K = "#191a1f";
  let p = r(x - 4*s, base - 17*s, 3.4*s, 17*s, K);
  p += r(x + 1*s, base - 17*s, 3.4*s, 17*s, K);
  p += r(x - 5.4*s, base - 34*s, 10.8*s, 18*s, K);
  p += smooth(`<circle cx="${x}" cy="${base-38.5*s}" r="${4.6*s}" fill="${K}"/>`);
  p += r(x - 5.8*s, base - 42.5*s, 11.6*s, 3*s, K);
  p += r(x + (lean ? 2.6 : -8.4)*s, base - 43*s, 5.8*s, 2.4*s, K);
  const ax = lean ? x + 5.4*s : x - 8.6*s;
  p += r(ax, base - 32*s, 3.2*s, 12*s, K);
  p += r(ax - 0.6*s, base - 22*s, 4.4*s, 5*s, "#e8ddc6");
  return p;
}
o += person(268, 166, 1.0, true);
o += person(300, 166, 0.95, false);
o += person(336, 165, 0.9, true);
o += person(406, 166, 0.97, false);
o += person(434, 165, 0.92, true);
o += person(672, 166, 0.94, false);

o += smooth(r(0, 0, W, H, "url(#vigCC)"));

const defs = `<defs>
<linearGradient id="skyCC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93a9c2"/><stop offset="0.5" stop-color="#c6c6c0"/><stop offset="1" stop-color="#f0dcb4"/></linearGradient>
<radialGradient id="poolCC" gradientUnits="userSpaceOnUse" cx="350" cy="230" r="330"><stop offset="0" stop-color="#ffdca0" stop-opacity="0.12"/><stop offset="0.6" stop-color="#ffdca0" stop-opacity="0.03"/><stop offset="1" stop-color="#ffdca0" stop-opacity="0"/></radialGradient>
<radialGradient id="vigCC" gradientUnits="userSpaceOnUse" cx="350" cy="120" r="450"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0b0a10" stop-opacity="0.34"/></radialGradient>
</defs>`;

const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{margin:0;background-color:#45464a;overflow:hidden;}.scene{position:relative;width:700px;height:240px;background-color:#45464a;}</style></head><body>
<div class="scene"><svg viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" style="width:100%;height:100%;display:block">${defs}${o}</svg></div>
</body></html>`;

if (require.main === module) {
  if (process.env.SP) require("fs").writeFileSync(process.env.SP + "/cc-new.html", doc);
  else process.stdout.write(doc);
}
module.exports = doc;
