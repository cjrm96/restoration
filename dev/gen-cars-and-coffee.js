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
const GROUND = 136;   // where the buildings meet the walk
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
o += tree(272, 100, 1.35, "#3f5c3c", "#5c7d4b");
o += tree(342, 96, 1.1,  "#395436", "#537043");
o += tree(404, 102, 1.25, "#43613f", "#628350");

/* ── the plaza carries on through the gap: same tile and stucco, far enough
      back to read as distance, with cars already parked under it ── */
o += r(232, 96, 200, 40, "#d9cdb4");
o += r(232, 96, 200, 3, "#eae0c9");
o += r(228, 88, 208, 9, "#a8542f");
o += r(228, 88, 208, 3, "#c47049");
for (let i = 0; i < 208; i += 6) o += r(228 + i, 91, 2, 6, "#8f4527");
for (let i = 0; i < 4; i++) o += r(246 + i * 46, 105, 28, 26, "#4a4136");
o += r(232, 130, 200, 6, "#4e4f53");
for (let i = 0; i < 4; i++) {
  const cx = 240 + i * 48;
  o += r(cx, 122, 24, 9, ["#7b6a5c","#56687c","#7a5a58","#5f6b58"][i]);
  o += r(cx + 4, 117, 15, 5, ["#8d7d6e","#66788c","#8b6b68","#6f7b68"][i]);
  o += r(cx, 129, 24, 2, "#3a3b3f");
}

/* ── a mission storefront block, drawn big enough to sit on this ground ── */
function block(x, w, top, opts) {
  const o2 = opts || {}, roofH = 22;
  let b = r(x, top + roofH, w, GROUND - top - roofH, "#e6dac1");
  b += r(x, top + roofH, w, 5, "#f3ead7");
  b += r(x, GROUND - 26, w, 26, "#d5c8ac");
  b += r(x - 8, top, w + 16, roofH, "#a8542f");
  b += r(x - 8, top, w + 16, 4, "#c47049");
  for (let i = 0; i < w + 16; i += 10) b += r(x - 8 + i, top + 4, 4, roofH - 4, "#8f4527");
  b += r(x - 8, top + roofH - 4, w + 16, 4, "#7a3a20");
  const n = o2.arches, pad = o2.pad != null ? o2.pad : 24;
  const span = (w - pad * 2) / n;
  for (let i = 0; i < n; i++) {
    const aw = span * 0.74, ax = x + pad + i * span + (span - aw) / 2;
    const ay = top + roofH + 22, ah = GROUND - ay - 4;
    b += smooth(`<path d="M${ax} ${ay + ah} L${ax} ${ay + aw/2} A ${aw/2} ${aw/2} 0 0 1 ${ax+aw} ${ay + aw/2} L${ax+aw} ${ay+ah} Z" fill="#4a4136"/>`);
    b += smooth(`<path d="M${ax+4} ${ay+ah} L${ax+4} ${ay + aw/2} A ${aw/2-4} ${aw/2-4} 0 0 1 ${ax+aw-4} ${ay+aw/2} L${ax+aw-4} ${ay+ah} Z" fill="#2f2a24"/>`);
    b += smooth(poly(`${ax+7},${ay+ah-3} ${ax+aw*0.44},${ay+ah-3} ${ax+aw*0.2},${ay+aw*0.5} ${ax+7},${ay+aw*0.78}`, "#b9cfd6", 0.28));
  }
  if (o2.shutters != null) {
    const sx = o2.shutters, sy = top + roofH + 16;
    b += r(sx, sy, 36, 46, "#2f2a24");
    b += smooth(poly(`${sx+4},${sy+4} ${sx+19},${sy+4} ${sx+9},${sy+41} ${sx+4},${sy+41}`, "#c8d8d4", 0.32));
    b += r(sx - 14, sy - 3, 12, 52, "#3f7f76");
    b += r(sx + 38, sy - 3, 12, 52, "#3f7f76");
  }
  return b;
}
o += block(-130, 350, -14, { arches: 2, shutters: 176 });
o += block(438, 390, -30, { arches: 2 });

/* ── clipped hedge along the base of each block ── */
function hedge(x, w, y) {
  let h = r(x, y, w, 26, "#33502f");
  for (let i = 0; i < w; i += 18) h += smooth(`<circle cx="${x+i+8}" cy="${y+3}" r="11" fill="#3d6136"/>`);
  for (let i = 0; i < w; i += 18) h += smooth(`<circle cx="${x+i+8}" cy="${y}" r="7" fill="#4e7a41"/>`);
  return h;
}
o += hedge(-136, 362, 116);
o += hedge(444, 400, 116);

/* ── cast-iron lamps, painted the same teal as the shutters ── */
function lamp(x, base, h) {
  let l = r(x - 11, base - 9, 22, 9, "#2c5b55");
  l += r(x - 5, base - h, 10, h, "#3f7f76");
  l += r(x - 2, base - h, 3, h, "#5aa79c");
  l += smooth(poly(`${x-17},${base-h-9} ${x+17},${base-h-9} ${x+12},${base-h-32} ${x-12},${base-h-32}`, "#2c5b55"));
  l += smooth(poly(`${x-12},${base-h-12} ${x+12},${base-h-12} ${x+8},${base-h-29} ${x-8},${base-h-29}`, "#f7e6bc"));
  l += r(x - 6, base - h - 40, 12, 8, "#2c5b55");
  l += smooth(`<circle cx="${x}" cy="${base-h-21}" r="34" fill="#ffe9b8" opacity="0.10"/>`);
  return l;
}
o += lamp(228, 150, 104);
o += lamp(650, 150, 104);

/* ── umbrella and table on the walk outside the coffee place ── */
o += r(534, 74, 5, 74, "#7a6a52");
o += smooth(poly("478,78 507,84 536,78 565,84 594,78 536,42", "#efe2c6"));
o += smooth(poly("536,78 565,84 594,78 536,42", "#dbcdae"));
o += r(532, 37, 9, 7, "#7a6a52");
o += r(516, 134, 5, 20, "#5f5344");
o += r(552, 134, 5, 20, "#5f5344");
o += r(508, 126, 56, 8, "#7a6c58");

/* ── walk, curb, lot ── */
o += r(0, GROUND, W, 24, "#c9c2b3");
o += r(0, GROUND, W, 4, "#ddd6c6");
for (let x = 56; x < W; x += 128) o += r(x, GROUND + 3, 3, 21, "#b3ac9d");
o += r(0, GROUND + 24, W, 10, "#aca596");
o += r(0, GROUND + 33, W, 4, "#8e887b");
o += r(0, GROUND + 36, W, H - GROUND - 36, "#45464a");
o += smooth(r(0, GROUND + 36, W, H - GROUND - 36, "url(#poolCC)"));

/* ── angle parking. One row, drawn at the size a row one car-length behind
      the truck actually is, so the stalls are wide and only a few fit. ── */
const SLANT = 34;
for (let i = -1; i < 6; i++) {
  const x = i * 196 - 30;
  o += smooth(`<path d="M${x} 228 L${x + SLANT} 174" stroke="#cfcabb" stroke-width="4" opacity="0.42" fill="none"/>`);
}
o += smooth(`<path d="M0 229 L700 229" stroke="#cfcabb" stroke-width="4" opacity="0.24" fill="none"/>`);

function showCar(x, y, s, body, roof) {
  const w = 176 * s, h = 57 * s;
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
o += showCar(-42, 146, 1.0,  "#c8a23a", "#a8862c");
o += showCar(524, 146, 1.0,  "#2d5c47", "#234a39");
o += showCar(672, 150, 0.94, "#b25a25", "#8f471d");

/* ── the people, at the size a person is when they are standing at the curb
      of the row you are parked in. Each one has a coffee. ── */
function person(x, base, s, opts) {
  const K = "#191a1f", d = (opts && opts.turned) ? 0.72 : 1;   // turned away reads narrower
  const lean = !(opts && opts.left);
  let p = r(x - 4*s*d, base - 17*s, 3.4*s*d, 17*s, K);
  p += r(x + 1*s*d, base - 17*s, 3.4*s*d, 17*s, K);
  p += r(x - 5.4*s*d, base - 34*s, 10.8*s*d, 18*s, K);
  p += smooth(`<circle cx="${x}" cy="${base-38.5*s}" r="${4.6*s}" fill="${K}"/>`);
  p += r(x - 5.8*s*d, base - 42.5*s, 11.6*s*d, 3*s, K);
  p += r(x + (lean ? 2.6 : -8.4)*s*d, base - 43*s, 5.8*s*d, 2.4*s, K);   // cap brim
  // The arm comes down and across, so the cup sits in front of the chest
  // where you can actually see it. It is half the name of the event.
  const sx = lean ? x + 4.6*s*d : x - 4.6*s*d;
  const cx = lean ? x + 2.2*s*d : x - 6.4*s*d;
  p += r(sx - 1.4*s, base - 33*s, 2.8*s, 9*s, K);
  p += r(Math.min(sx, cx) - 0.4*s, base - 25*s, Math.abs(sx - cx) + 3*s, 2.6*s, K);
  p += r(cx, base - 27*s, 4.2*s, 6*s, "#e8ddc6");
  p += r(cx - 0.5*s, base - 27.6*s, 5.2*s, 1.6*s, "#b9ad93");
  return p;
}
// Two knots of people and nobody standing alone in a line: three arguing
// about something on the walk, two more down by the umbrella.
o += person(258, 158, 1.44, { });
o += person(292, 157, 1.32, { left: true });
o += person(322, 158, 1.38, { turned: true });
o += person(452, 158, 1.4, { left: true });
o += person(482, 157, 1.3, { turned: true, left: true });

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
