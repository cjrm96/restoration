#!/usr/bin/env node
/*
 * Car Guy Simulator — Board Gate.
 *
 * The Executive Design Review Board is a design-phase deliberation: it lives
 * in chat and in dev/reviews/*.md. It is subjective and cannot be a test.
 * This file is the OTHER half — the small subset of the board's principles
 * that reduce to a deterministic, machine-checkable rule. It is the push
 * ritual's conscience: fast, text-only, no browser.
 *
 * Run it before qa-smoke (qa-smoke calls it first) or on its own:
 *   node dev/board-gate.js
 *
 * Exit 0 = the mechanizable rules hold. Non-zero = do not push.
 *
 * What it enforces (and which board voice it stands in for):
 *   1. No em-dashes in the game file        (Dan Houser / Sheridan: in-world
 *      text only; CLAUDE.md purged them in 0.17.0, keep them gone).
 *   2. No production/meta jargon players     (Aaron Garbut: immersion; nothing
 *      could read.                            a player sees should sound like
 *                                             a spec sheet).
 *   3. GAME_VERSION is well-formed and       (Leslie Benzies: the "every push,
 *      bumped past the live build.            one bump" ritual, made real).
 *
 * Warnings (exit 0, but printed) flag things worth a human glance without
 * blocking the push.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const GAME_FILE = path.join(ROOT, "Car_Guy_Sim.html");
// The live web build. Overridable for CI / detached checkouts.
const BASELINE_REF = process.env.BOARD_BASELINE_REF || "origin/garage";

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const ok = (m) => console.log("✓ " + m);

const src = fs.readFileSync(GAME_FILE, "utf8");
const lines = src.split("\n");

// Blank out // and /* */ comments, replacing their characters with spaces so
// every line number and column stays exactly where it was. Player-facing text
// lives in strings and HTML, never in comments, so the jargon check runs over
// this stripped copy — that is what keeps "light-modeled body" in a renderer
// comment from tripping the gate while a meta word in real dialogue still does.
function stripComments(text) {
  let out = "";
  let i = 0;
  const n = text.length;
  let mode = "code"; // code | line | block | sq | dq | tpl
  while (i < n) {
    const c = text[i];
    const c2 = text[i + 1];
    if (mode === "code") {
      if (c === "/" && c2 === "/") { out += "  "; i += 2; mode = "line"; continue; }
      if (c === "/" && c2 === "*") { out += "  "; i += 2; mode = "block"; continue; }
      if (c === "'") { out += c; i++; mode = "sq"; continue; }
      if (c === '"') { out += c; i++; mode = "dq"; continue; }
      if (c === "`") { out += c; i++; mode = "tpl"; continue; }
      out += c; i++; continue;
    }
    if (mode === "line") {
      if (c === "\n") { out += c; i++; mode = "code"; continue; }
      out += c === "\t" ? "\t" : " "; i++; continue;
    }
    if (mode === "block") {
      if (c === "*" && c2 === "/") { out += "  "; i += 2; mode = "code"; continue; }
      out += c === "\n" ? "\n" : c === "\t" ? "\t" : " "; i++; continue;
    }
    // inside a string: copy verbatim, honour escapes, watch for the closer
    if (c === "\\") { out += c + (c2 || ""); i += 2; continue; }
    out += c; i++;
    if (mode === "sq" && c === "'") mode = "code";
    else if (mode === "dq" && c === '"') mode = "code";
    else if (mode === "tpl" && c === "`") mode = "code";
  }
  return out;
}
const codeLines = stripComments(src).split("\n");

// Report every line/column where a matcher hits, capped so a mass-regression
// prints a summary instead of thousands of rows.
function locate(re, cap = 12, arr = lines) {
  const hits = [];
  arr.forEach((line, i) => {
    let m;
    const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    while ((m = rx.exec(line)) !== null) {
      hits.push({ line: i + 1, col: m.index + 1, text: m[0], context: line.trim().slice(0, 80) });
      if (m.index === rx.lastIndex) rx.lastIndex++;
    }
  });
  const shown = hits.slice(0, cap);
  const extra = hits.length - shown.length;
  return { count: hits.length, shown, extra };
}

// ── Check 1: em-dashes ────────────────────────────────────────────────────
// Rule: "No em-dashes (—) anywhere in the game." (CLAUDE.md). Whole-file scan
// of the shipped source. En-dash and horizontal bar are flagged too — they
// are the usual sneaky substitutes.
{
  const hit = locate(/[—―–]/);
  if (hit.count === 0) {
    ok("no em-dashes / en-dashes in the game file");
  } else {
    const detail = hit.shown
      .map((h) => `      Car_Guy_Sim.html:${h.line}:${h.col}  ${h.context}`)
      .join("\n");
    err(
      `em-dash / en-dash found in the game file (${hit.count} occurrence` +
        (hit.count === 1 ? "" : "s") +
        `). Use commas, periods, or plain hyphens.\n` +
        detail +
        (hit.extra > 0 ? `\n      ...and ${hit.extra} more` : "")
    );
  }
}

// ── Check 2: production / meta jargon ─────────────────────────────────────
// Rule: player-facing text stays in-world (CLAUDE.md). These terms should
// never appear anywhere in a game about cars, so a whole-file scan is safe
// and low-noise. Extend the list as new production words get coined — this is
// a safety net, not a proof. Matched case-insensitively as whole phrases.
const META_TERMS = [
  "flat-panel", "flat panel",
  "light-model", "light model",
  "original look",
  "placeholder art", "placeholder text",
  "lorem ipsum",
];
{
  const found = [];
  for (const term of META_TERMS) {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const hit = locate(new RegExp(esc, "i"), 6, codeLines);
    if (hit.count > 0) found.push({ term, hit });
  }
  if (found.length === 0) {
    ok(`no production/meta jargon (${META_TERMS.length} terms checked)`);
  } else {
    const detail = found
      .map((f) => {
        const rows = f.hit.shown
          .map((h) => `        Car_Guy_Sim.html:${h.line}  ${h.context}`)
          .join("\n");
        return `    "${f.term}" (${f.hit.count}x)\n${rows}`;
      })
      .join("\n");
    err("production/meta language a player could read:\n" + detail);
  }
}

// ── Check 3: GAME_VERSION well-formed + bumped past live ───────────────────
function readVersion(text) {
  const m = text && text.match(/const\s+GAME_VERSION\s*=\s*["'](\d+\.\d+\.\d+)["']/);
  return m ? m[1] : null;
}
function cmpSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}
{
  const working = readVersion(src);
  if (!working) {
    err("GAME_VERSION missing or malformed — expected const GAME_VERSION = \"X.Y.Z\".");
  } else {
    // Exactly one source of truth.
    const defs = (src.match(/const\s+GAME_VERSION\s*=/g) || []).length;
    if (defs > 1) err(`GAME_VERSION defined ${defs} times — it must be the single source of truth.`);

    let baseline = null;
    try {
      const baseSrc = execFileSync("git", ["show", `${BASELINE_REF}:Car_Guy_Sim.html`], {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: 64 * 1024 * 1024,
      }).toString();
      baseline = readVersion(baseSrc);
    } catch (_) {
      // No baseline ref available (fresh clone, CI without the live branch).
      warn(
        `could not read baseline ref '${BASELINE_REF}' — skipping the version-bump check. ` +
          `Set BOARD_BASELINE_REF to the live branch, or fetch it, to re-enable.`
      );
    }

    if (baseline) {
      const c = cmpSemver(working, baseline);
      if (c > 0) {
        ok(`GAME_VERSION ${working} is ahead of live (${BASELINE_REF} @ ${baseline})`);
      } else if (c === 0) {
        err(
          `GAME_VERSION ${working} matches live (${BASELINE_REF} @ ${baseline}). ` +
            `Bump it before pushing — minor for features, patch for fixes (CLAUDE.md).`
        );
      } else {
        err(`GAME_VERSION ${working} is BEHIND live (${BASELINE_REF} @ ${baseline}). Something is wrong.`);
      }
    } else if (defs === 1) {
      ok(`GAME_VERSION ${working} is well-formed`);
    }
  }
}

// ── Soft check: stray hardcoded version-like literals ─────────────────────
// GAME_VERSION is the single source of truth; a "v1.2.3" baked into a string
// somewhere else will drift. SAVE_VERSION and the GAME_VERSION line itself are
// legitimate. Anything else is a warning, not a failure — dates and ids look
// similar and we would rather not block a push on a false positive.
{
  const suspects = [];
  lines.forEach((line, i) => {
    if (/const\s+(GAME_VERSION|SAVE_VERSION)\s*=/.test(line)) return;
    const m = line.match(/["']v\d+\.\d+\.\d+["']/);
    if (m) suspects.push({ line: i + 1, text: m[0], context: line.trim().slice(0, 80) });
  });
  if (suspects.length > 0) {
    suspects.slice(0, 6).forEach((s) =>
      warn(`possible hardcoded version literal ${s.text} at Car_Guy_Sim.html:${s.line} — stamp from GAME_VERSION instead.\n      ${s.context}`)
    );
  }
}

// ── Verdict ───────────────────────────────────────────────────────────────
if (warnings.length) {
  console.log("");
  warnings.forEach((w) => console.log("⚠ WARN: " + w));
}
if (errors.length) {
  console.log("");
  errors.forEach((e) => console.error("✗ FAIL: " + e));
  console.error(`\nBOARD GATE: ${errors.length} blocking issue${errors.length === 1 ? "" : "s"}. Do not push.`);
  process.exit(1);
}
console.log("\nBOARD GATE PASSED — the mechanizable board rules hold.");
