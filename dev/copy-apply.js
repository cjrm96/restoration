#!/usr/bin/env node
/*
 * Story copy rewrite: apply.
 *
 * Writes rewrites from the Story Copy Rewrite sheet back into
 * Car_Guy_Sim.html, in place, by catalog ID (see dev/copy-catalog.js).
 *
 * Input: a JSON array of { id, original, rewrite }. `original` is the text
 * the sheet showed; it must still match the game, so a line that moved or
 * changed since the sheet was built is refused rather than overwritten.
 *
 * Rewrites go in exactly as written (typos and lowercase are deliberate).
 * The only rules enforced: every {slot} the game fills in must survive, and
 * markup around the text is left alone.
 *
 * Usage: node dev/copy-apply.js rewrites.json [--dry]
 */
const fs = require("fs");
const path = require("path");
const { buildCatalog, clean } = require("./copy-catalog.js");

const GAME = path.resolve(__dirname, "..", "Car_Guy_Sim.html");
// Markup slots the sheet hides from the writer (avatars, wrappers).
const MARKUP = /\{(px|bold|bright|b\d+|div|d|KEY_ICO|stashMarkup)\}/g;
const tidy = (t) => t.replace(MARKUP, "").replace(/\s+/g, " ").trim();
const slots = (t) => (t.match(/\{\w+\}/g) || []).sort().join(" ");

const quoteFor = (raw) => raw[0];
const escFor = (q, text) => {
  let t = text.replace(/\\/g, "\\\\");
  if (q === "`") return t.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return t.replace(new RegExp(q, "g"), "\\" + q);
};

function main() {
  const [input, flag] = process.argv.slice(2);
  if (!input) { console.error("usage: node dev/copy-apply.js rewrites.json [--dry]"); process.exit(2); }
  const rows = JSON.parse(fs.readFileSync(input, "utf8"));
  let html = fs.readFileSync(GAME, "utf8");
  const cat = Object.fromEntries(buildCatalog().map((e) => [e.id, e]));
  const edits = [];
  const refused = [];

  for (const { id, original, rewrite } of rows) {
    const e = cat[id];
    if (!e) { refused.push(`${id}: not in the catalog`); continue; }
    if (tidy(e.text) !== tidy(original)) { refused.push(`${id}: the game text changed since the sheet was made`); continue; }
    if (slots(tidy(e.text)) !== slots(rewrite)) { refused.push(`${id}: slots differ (game has [${slots(tidy(e.text))}], rewrite has [${slots(rewrite)}])`); continue; }
    const raw = html.slice(e.start, e.end);
    const q = quoteFor(raw);
    let next;
    if (q !== "`") {
      next = q + escFor(q, rewrite) + q;
    } else {
      // Template: swap only the visible text, keep tags and ${...} slots.
      const body = raw.slice(1, -1);
      const exprs = [];
      body.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, (m) => exprs.push(m));
      const bySlot = {};
      exprs.forEach((x) => { const ids = x.match(/[A-Za-z_]\w*/g) || ["x"]; (bySlot["{" + ids[ids.length - 1] + "}"] ||= []).push(x); });
      const plain = tidy(e.text);
      const hasTags = /<[a-z]/i.test(body);
      if (hasTags) {
        // The visible text lives in one tag's content; find it and swap it.
        const parts = body.split(/(<[^>]*>|\$\{(?:[^{}]|\{[^{}]*\})*\})/);
        const segs = parts.map((p, i) => [p, i]).filter(([p]) => p.trim() && !p.startsWith("<") && !p.startsWith("${"));
        const hit = segs.find(([p]) => p.trim() === plain);
        if (hit) {
          parts[hit[1]] = parts[hit[1]].replace(plain, escFor("`", rewrite));
        } else {
          // Text split across tags (a DM handle plus its message): the sheet
          // shows them joined, so split the rewrite the same way.
          const visible = segs.map(([p]) => p.trim());
          if (visible.join(" ") !== plain || visible.length !== 2 || !/^@\S+$/.test(visible[0]) || !/^@\S+ /.test(rewrite)) {
            refused.push(`${id}: text is spread across markup in a way this tool does not split`);
            continue;
          }
          const sp = rewrite.indexOf(" ");
          parts[segs[0][1]] = parts[segs[0][1]].replace(visible[0], escFor("`", rewrite.slice(0, sp)));
          parts[segs[1][1]] = parts[segs[1][1]].replace(visible[1], escFor("`", rewrite.slice(sp + 1)));
        }
        next = "`" + parts.join("") + "`";
      } else {
        const used = {};
        next = "`" + escFor("`", rewrite).replace(/\{(\w+)\}/g, (m) => {
          const list = bySlot[m] || [];
          const k = (used[m] = (used[m] || 0) + 1) - 1;
          return list[k] || m;
        }) + "`";
      }
    }
    edits.push({ id, start: e.start, end: e.end, from: raw, to: next });
    // The barn-find caption is also pre-armed at boot; keep both copies in step.
    if (id.startsWith("startGame()")) {
      const val = JSON.parse('"' + raw.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"');
      const prearm = html.indexOf('art: "scene-barn-find",\n          kicker:');
      if (prearm >= 0) {
        const block = html.slice(prearm, html.indexOf("held:", prearm));
        for (const m of block.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
          let v; try { v = JSON.parse('"' + m[1] + '"'); } catch (err) { continue; }
          if (v === val) edits.push({ id: id + " (boot copy)", start: prearm + m.index, end: prearm + m.index + m[0].length, from: m[0], to: next });
        }
      }
    }
  }

  edits.sort((a, b) => b.start - a.start);
  for (let i = 1; i < edits.length; i++) if (edits[i].end > edits[i - 1].start) { console.error("overlapping edits:", edits[i].id, edits[i - 1].id); process.exit(1); }
  for (const ed of edits) html = html.slice(0, ed.start) + ed.to + html.slice(ed.end);
  edits.slice().reverse().forEach((ed) => console.log(`✓ ${ed.id}\n    ${ed.to.slice(0, 160)}`));
  refused.forEach((r) => console.log(`✗ ${r}`));
  console.log(`\n${edits.length} edits, ${refused.length} refused${flag === "--dry" ? " (dry run, nothing written)" : ""}`);
  if (flag !== "--dry") fs.writeFileSync(GAME, html);
  if (refused.length) process.exit(1);
}

main();
