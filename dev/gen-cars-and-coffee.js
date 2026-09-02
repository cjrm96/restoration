// Cars & Coffee: a Spanish-mission shopping plaza on a Saturday morning.
// Cream stucco, barrel tile, arcades, angle parking along the curb, and the
// aisle left clear down the middle for the player's truck to sit in.
const W = 700, H = 240;
const r = (x,y,w,h,f,o) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${o!=null?` opacity="${o}"`:""}/>`;
const poly = (pts,f,o) => `<polygon points="${pts}" fill="${f}"${o!=null?` opacity="${o}"`:""}/>`;
const smooth = (s) => `<g shape-rendering="auto">${s}</g>`;

let o = "";

/* ── sky: hazy coast morning, cool overhead, warm down at the ridgeline ── */
o += smooth(r(0,0,W,150,"url(#skyCC)"));

/* ── two ridges of dry California hill ── */
o += smooth(poly("0,84 70,70 150,78 240,64 330,76 420,68 520,80 620,66 700,76 700,150 0,150","#93a08d"));
o += smooth(poly("0,92 90,84 190,90 300,82 400,90 500,86 600,92 700,86 700,150 0,150","#7d8a79"));

/* the plaza carries on through the gap between the two blocks: a low far
   row of the same stucco and tile, and the cars already parked down there */
o += r(206, 118, 190, 27, "#d9cdb4");
o += r(206, 118, 190, 2, "#eae0c9");
o += r(202, 112, 198, 7, "#a8542f");
o += r(202, 112, 198, 2, "#c47049");
for (let i = 0; i < 198; i += 5) o += r(202 + i, 114, 2, 5, "#8f4527");
for (let i = 0; i < 5; i++) o += r(216 + i * 36, 126, 20, 19, "#4a4136");
o += r(206, 143, 190, 7, "#4e4f53");
for (let i = 0; i < 5; i++) {
  const cx = 214 + i * 37;
  o += r(cx, 137, 17, 6, ["#7b6a5c","#56687c","#7a5a58","#5f6b58","#6a6a70"][i]);
  o += r(cx + 3, 133, 11, 4, ["#8d7d6e","#66788c","#8b6b68","#6f7b68","#7a7a80"][i]);
  o += r(cx, 142, 17, 1, "#3a3b3f");
}

/* ── street trees: rounded canopies over the rooflines ── */
const tree = (x, base, s, dark, lit) => {
  let t = r(x-2, base-14*s, 4, 16*s, "#3a2b22");
  t += smooth(`<circle cx="${x}" cy="${base-26*s}" r="${16*s}" fill="${dark}"/>`);
  t += smooth(`<circle cx="${x-10*s}" cy="${base-20*s}" r="${11*s}" fill="${dark}"/>`);
  t += smooth(`<circle cx="${x+11*s}" cy="${base-21*s}" r="${12*s}" fill="${dark}"/>`);
  t += smooth(`<circle cx="${x-4*s}" cy="${base-31*s}" r="${10*s}" fill="${lit}"/>`);
  t += smooth(`<circle cx="${x+8*s}" cy="${base-28*s}" r="${8*s}" fill="${lit}"/>`);
  return t;
};
o += tree(250, 104, 1.15, "#3f5c3c", "#5c7d4b");
o += tree(316, 100, 0.9,  "#395436", "#537043");
o += tree(360, 106, 1.05, "#43613f", "#628350");

/* ── a mission storefront block: tile roof, stucco, arcade ── */
function block(x, w, top, ground, opts) {
  const o2 = opts || {};
  let b = "";
  const roofH = 11;
  // stucco body
  b += r(x, top + roofH, w, ground - top - roofH, "#e6dac1");
  b += r(x, top + roofH, w, 3, "#f3ead7");                    // sunlit top edge
  b += r(x, ground - 14, w, 14, "#d5c8ac");                   // shaded base
  b += r(x + w - 3, top + roofH, 3, ground - top - roofH, "#cabd a1".replace(" ",""));
  // barrel tile: a terracotta band with a ridge every four pixels
  b += r(x - 4, top, w + 8, roofH, "#a8542f");
  b += r(x - 4, top, w + 8, 2, "#c47049");
  for (let i = 0; i < w + 8; i += 5) b += r(x - 4 + i, top + 2, 2, roofH - 2, "#8f4527");
  b += r(x - 4, top + roofH - 2, w + 8, 2, "#7a3a20");
  // arcade: round-topped openings, dark inside, lit soffit
  const n = o2.arches || 3, pad = o2.pad != null ? o2.pad : 14;
  const span = (w - pad * 2) / n;
  for (let i = 0; i < n; i++) {
    const ax = x + pad + i * span + span * 0.12;
    const aw = span * 0.76, ah = ground - top - roofH - 20;
    const ay = top + roofH + 12;
    b += smooth(`<path d="M${ax} ${ay + ah} L${ax} ${ay + aw / 2} A ${aw / 2} ${aw / 2} 0 0 1 ${ax + aw} ${ay + aw / 2} L${ax + aw} ${ay + ah} Z" fill="#4a4136"/>`);
    b += smooth(`<path d="M${ax + 2} ${ay + ah} L${ax + 2} ${ay + aw / 2} A ${aw / 2 - 2} ${aw / 2 - 2} 0 0 1 ${ax + aw - 2} ${ay + aw / 2} L${ax + aw - 2} ${ay + ah} Z" fill="#2f2a24"/>`);
    // glass catching the morning off the far side of the plaza
    b += smooth(poly(`${ax + 4},${ay + ah - 2} ${ax + aw * 0.42},${ay + ah - 2} ${ax + aw * 0.2},${ay + aw * 0.5} ${ax + 4},${ay + aw * 0.72}`, "#b9cfd6", 0.30));
  }
  // painted shutters flanking a small upper window
  if (o2.shutters) {
    const sx = o2.shutters;
    b += r(sx, top + roofH + 6, 16, 20, "#2f2a24");
    b += smooth(poly(`${sx + 2},${top + roofH + 8} ${sx + 9},${top + roofH + 8} ${sx + 4},${top + roofH + 24} ${sx + 2},${top + roofH + 24}`, "#c8d8d4", 0.34));
    b += r(sx - 6, top + roofH + 5, 5, 22, "#3f7f76");
    b += r(sx + 17, top + roofH + 5, 5, 22, "#3f7f76");
  }
  return b;
}

/* left block, right block, and a gap in the middle that shows the plaza */
o += block(-10, 210, 66, 152, { arches: 3, shutters: 150 });
o += block(392, 320, 58, 152, { arches: 4, shutters: 700 });

/* ── clipped hedge running along the base of both blocks ── */
function hedge(x, w, y) {
  let h = r(x, y, w, 12, "#33502f");
  for (let i = 0; i < w; i += 9) h += smooth(`<circle cx="${x + i + 4}" cy="${y + 1}" r="5" fill="#3d6136"/>`);
  for (let i = 0; i < w; i += 9) h += smooth(`<circle cx="${x + i + 4}" cy="${y}" r="3" fill="#4e7a41"/>`);
  return h;
}
o += hedge(-6, 206, 140);
o += hedge(398, 312, 140);

/* ── teal cast-iron lamp posts ── */
function lamp(x, base, h) {
  let l = r(x - 4, base - 4, 8, 4, "#2c5b55");
  l += r(x - 2, base - h, 4, h, "#3f7f76");
  l += r(x - 1, base - h, 1, h, "#5aa79c");
  l += smooth(poly(`${x - 7},${base - h - 4} ${x + 7},${base - h - 4} ${x + 5},${base - h - 13} ${x - 5},${base - h - 13}`, "#2c5b55"));
  l += smooth(poly(`${x - 5},${base - h - 5} ${x + 5},${base - h - 5} ${x + 3.5},${base - h - 12} ${x - 3.5},${base - h - 12}`, "#f7e6bc"));
  l += r(x - 3, base - h - 16, 6, 3, "#2c5b55");
  l += smooth(`<circle cx="${x}" cy="${base - h - 9}" r="15" fill="#ffe9b8" opacity="0.11"/>`);
  return l;
}
o += lamp(232, 158, 46);
o += lamp(470, 158, 46);

/* ── patio umbrella outside the coffee place ── */
o += r(560, 118, 2, 30, "#7a6a52");
o += smooth(poly("530,119 545,122 561,119 577,122 592,119 561,100", "#efe2c6"));
o += smooth(poly("561,119 577,122 592,119 561,100", "#dbcdae"));
o += r(560, 98, 4, 4, "#7a6a52");
o += r(552, 141, 2, 7, "#5f5344");
o += r(568, 141, 2, 7, "#5f5344");
o += r(548, 138, 26, 3, "#7a6c58");

/* ── sidewalk, then the curb face, then the lot ── */
o += r(0, 148, W, 14, "#c9c2b3");
o += r(0, 148, W, 2, "#ddd6c6");
for (let x = 26; x < W; x += 52) o += r(x, 150, 1, 12, "#b3ac9d");
o += r(0, 160, W, 5, "#aca596");
o += r(0, 164, W, 2, "#8e887b");
o += r(0, 165, W, 75, "#45464a");
o += smooth(r(0, 165, W, 75, "url(#poolCC)"));

/* ── angle parking: stalls all lean the same way, because they do ── */
const SLANT = 15;                       // pixels of lean over the stall depth
for (let i = -1; i < 15; i++) {
  const x = i * 52 + 10;
  o += smooth(`<path d="M${x} 202 L${x + SLANT} 168" stroke="#cfcabb" stroke-width="2" opacity="0.45" fill="none"/>`);
}
o += smooth(`<path d="M0 203 L700 203" stroke="#cfcabb" stroke-width="2" opacity="0.28" fill="none"/>`);

/* ── the cars in those stalls, seen three-quarter from behind, leaning with
      the stalls, small and receding. The middle is left open for the truck. ── */
function showCar(x, y, s, body, roof) {
  let c = "";
  const w = 46 * s, h = 15 * s;
  c += smooth(poly(`${x + 3},${y + h + 3 * s} ${x + w + 4},${y + h + 3 * s} ${x + w},${y + h + 6 * s} ${x - 1},${y + h + 6 * s}`, "#1d1e21", 0.5));
  c += smooth(poly(`${x},${y + h} ${x + w},${y + h} ${x + w - 3 * s},${y + 4 * s} ${x + 4 * s},${y + 4 * s}`, body));
  c += smooth(poly(`${x + 9 * s},${y + 4 * s} ${x + w - 11 * s},${y + 4 * s} ${x + w - 15 * s},${y} ${x + 13 * s},${y}`, roof));
  c += smooth(poly(`${x + 11 * s},${y + 3 * s} ${x + w - 14 * s},${y + 3 * s} ${x + w - 16 * s},${y + 1 * s} ${x + 13 * s},${y + 1 * s}`, "#22333d", 0.85));
  c += smooth(poly(`${x + 4 * s},${y + 5 * s} ${x + w - 4 * s},${y + 5 * s} ${x + w - 4 * s},${y + 6.5 * s} ${x + 4 * s},${y + 6.5 * s}`, "#ffffff", 0.13));
  c += smooth(`<circle cx="${x + 11 * s}" cy="${y + h}" r="${3.4 * s}" fill="#17181b"/><circle cx="${x + w - 11 * s}" cy="${y + h}" r="${3.4 * s}" fill="#17181b"/>`);
  c += smooth(`<circle cx="${x + 11 * s}" cy="${y + h}" r="${1.5 * s}" fill="#8b8f95"/><circle cx="${x + w - 11 * s}" cy="${y + h}" r="${1.5 * s}" fill="#8b8f95"/>`);
  // Nosed in at the same lean as the paint under them.
  return `<g transform="translate(${x + w / 2} ${y + h}) skewX(-11) translate(${-(x + w / 2)} ${-(y + h)})">${c}</g>`;
}
o += showCar(18,  172, 0.94, "#8d2c2c", "#6f2222");
o += showCar(78,  174, 0.98, "#c8a23a", "#a8862c");
o += showCar(140, 173, 0.96, "#2f4f74", "#25405e");
o += showCar(202, 172, 0.94, "#8d9299", "#71767c");
o += showCar(468, 172, 0.94, "#2d5c47", "#234a39");
o += showCar(530, 174, 0.98, "#b25a25", "#8f471d");
o += showCar(594, 173, 0.96, "#7d8388", "#63686c");
o += showCar(652, 172, 0.94, "#2a2c30", "#1e2023");

/* ── the people who actually make it a Cars & Coffee: silhouettes with
      coffee, standing where people stand, on the walk and between cars ── */
function person(x, base, s, lean) {
  const K = "#191a1f";
  let p = r(x - 1.6 * s, base - 7 * s, 1.5 * s, 7 * s, K);          // legs, with
  p += r(x + 0.4 * s, base - 7 * s, 1.5 * s, 7 * s, K);             // light between
  p += r(x - 2.2 * s, base - 14 * s, 4.4 * s, 7.4 * s, K);          // torso
  p += smooth(`<circle cx="${x}" cy="${base - 16 * s}" r="${1.9 * s}" fill="${K}"/>`);
  p += r(x - 2.4 * s, base - 17.6 * s, 4.8 * s, 1.2 * s, K);        // ball cap
  p += r(x + (lean ? 1 : -3.2) * s, base - 17.8 * s, 2.4 * s, 1 * s, K); // brim
  const ax = lean ? x + 2.2 * s : x - 3.4 * s;
  p += r(ax, base - 13 * s, 1.2 * s, 4.6 * s, K);                   // arm
  p += r(ax - 0.2 * s, base - 9.2 * s, 1.6 * s, 1.8 * s, "#e8ddc6"); // the coffee
  return p;
}
o += person(258, 161, 1.24, true);
o += person(272, 161, 1.18, false);
o += person(292, 160, 1.12, true);
o += person(414, 161, 1.2, false);
o += person(427, 160, 1.14, true);
o += person(70, 160, 1.1, false);
o += person(646, 161, 1.2, true);
o += person(658, 161, 1.14, false);

/* ── vignette last, over everything ── */
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

require("fs").writeFileSync(process.env.SP + "/cc-new.html", doc);
console.log("bytes:", doc.length);
