#!/usr/bin/env node
/*
 * Story copy catalog.
 *
 * Parses the game script and lists every string a player could read as
 * story: lines of dialogue, texts, posts, notices, captions, flavor. Menu
 * labels and other short UI strings are left out by a length filter.
 *
 * Each entry gets an ID built from where it lives (the table or function
 * that holds it, plus an ordinal), so a rewrite sheet can point back at the
 * exact line. Template literals keep their slots as {tokens}.
 *
 * Usage: node dev/copy-catalog.js [out.json]
 * Also exported as buildCatalog() for dev/season-audit-bot.js COPY_LOG mode.
 */
const fs = require("fs");
const path = require("path");
const acorn = require("/opt/node-tools/node_modules/acorn");
const walk = require("/opt/node-tools/node_modules/acorn-walk");

const GAME = path.resolve(__dirname, "..", "Car_Guy_Sim.html");

// What the player would actually read: tags and entities gone, space tidy.
const clean = (s) =>
  s.replace(/<[^>]*>/g, " ").replace(/&[#a-z0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

// Prose, not markup, CSS, code or a label.
function isStory(text) {
  if (/^\s*[.#]?[a-z-]+\s*\{|;\s*[a-z-]+\s*:|https?:|data:|\bfunction\b|=>/.test(text)) return false;
  const words = text.split(" ").filter((w) => /[a-zA-Z]{2,}/.test(w));
  if (words.length < 6) return false;
  const letters = (text.match(/[a-zA-Z ]/g) || []).length;
  return letters / text.length > 0.8;
}

// Short readable name for a ${} slot: state.buck.name -> {name}.
const slotName = (src) => {
  const ids = src.match(/[A-Za-z_]\w*/g) || ["x"];
  return "{" + ids[ids.length - 1] + "}";
};

function buildCatalog() {
  const html = fs.readFileSync(GAME, "utf8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const main = scripts.sort((a, b) => b[1].length - a[1].length)[0];
  const src = main[1];
  const lineBase = html.slice(0, main.index).split("\n").length; // <script> line
  const ast = acorn.parse(src, { ecmaVersion: "latest", locations: true });

  const out = [];
  const ordinals = {};
  const visit = (node, ancestors) => {
    let raw, display, fragments;
    if (node.type === "Literal" && typeof node.value === "string") {
      raw = node.value;
      display = clean(raw);
      fragments = [display];
    } else if (node.type === "TemplateLiteral") {
      const parts = [];
      fragments = [];
      node.quasis.forEach((q, i) => {
        const t = q.value.cooked == null ? q.value.raw : q.value.cooked;
        parts.push(t);
        fragments.push(...clean(t.replace(/<[^>]*>/g, "\u0000")).split("\u0000").map((f) => f.trim()));
        if (i < node.expressions.length) parts.push(slotName(src.slice(node.expressions[i].start, node.expressions[i].end)));
      });
      raw = src.slice(node.start + 1, node.end - 1);
      display = clean(parts.join(""));
    } else return;
    // Cut-scene and scene cards: their titles are short but they are the
    // headline of a story beat, so they clear a lower bar.
    const card = ancestors.some((a) => a.type === "CallExpression" && /^(playCutscene|queueScene)$/.test(a.callee.name || ""));
    const words = display.split(" ").filter((w) => /[a-zA-Z]{2,}/.test(w)).length;
    if (!(isStory(display) || (card && words >= 2 && !/[{};=<]/.test(raw.replace(/\$\{[^}]*\}/g, "")))) ) return;

    // Where it lives: the nearest const/let or function, and the property key.
    // A local inside a function reads as fn().local, so two helpers that
    // both call a list "lines" stay apart.
    let owner = "", key = "";
    for (let i = ancestors.length - 2; i >= 0; i--) {
      const a = ancestors[i];
      if (!key && a.type === "Property" && a.value === ancestors[i + 1]) key = a.key.name || a.key.value || "";
      if (!owner && a.type === "VariableDeclarator" && a.id.name) owner = a.id.name;
      if ((a.type === "FunctionDeclaration" || a.type === "FunctionExpression") && a.id) {
        owner = a.id.name + "()" + (owner ? "." + owner : "");
        break;
      }
    }
    owner = owner || "top";
    ordinals[owner] = (ordinals[owner] || 0) + 1;
    out.push({
      id: `${owner}#${ordinals[owner]}`,
      owner,
      key,
      line: lineBase + node.loc.start.line - 1,
      card,
      text: display,
      // The longest plain stretch, used to spot this line on screen.
      probe: fragments.filter(Boolean).sort((a, b) => b.length - a.length)[0] || "",
    });
  };
  walk.fullAncestor(ast, (node, _st, ancestors) => visit(node, ancestors));
  // A template's own quasis are not literals, so nothing doubles up; drop
  // probes too short to identify a line on their own.
  return out.filter((e) => e.probe.length >= (e.card ? 10 : 18));
}

module.exports = { buildCatalog, clean };

if (require.main === module) {
  const cat = buildCatalog();
  const dest = process.argv[2] || path.resolve(__dirname, "..", "dist", "copy-catalog.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(cat, null, 1));
  console.log(`${cat.length} story lines -> ${dest}`);
}
