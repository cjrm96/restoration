# Car Guy Simulator — project notes

HTML5 game. All game code lives in `Car_Guy_Sim.html`; cutscene art ships as
`assets/art/*.webp` (the game points at those files, so the source stays small
and runs straight from disk). `dev/` holds tooling (not shipped). Music
ships as `assets/audio/*.mp3`. The itch/web build is generated on demand by
`dev/build-web.js`, which zips the game and its assets into
`dist/car-guy-sim-itch.zip` (gitignored).

## Push checklist (EVERY push, no exceptions)

1. **Bump `GAME_VERSION`** in `Car_Guy_Sim.html` (search `const GAME_VERSION`).
   - **Minor** (0.7.0 → 0.8.0): new features/content.
   - **Patch** (0.7.0 → 0.7.1): fixes and polish only.
   - One bump per push, no matter how many commits it carries.
   - It's the single source of truth: the title screen, credits, settings
     About panel, and crash reports all stamp from it. Never hardcode a
     version string anywhere else.
2. **Syntax check**: extract the main script and `node --check` it.
3. **Board gate**: `node dev/board-gate.js` — the mechanizable subset of the
   Executive Design Review Board (no em-dashes, no production/meta jargon, and
   `GAME_VERSION` bumped past live). Must exit 0. The smoke suite runs it first,
   so step 4 covers it too, but it is fast to run alone while iterating.
4. **Run the smoke suite**: `QA_CHROMIUM=/opt/pw-browsers/chromium node dev/qa-smoke.js`
   — all checks must pass (it runs the board gate, verifies the title version
   plate, and runs `dev/build-web.js` to confirm the itch zip carries every
   asset the game points at).
5. Push the feature branch; fast-forward `main` and `garage` only when the
   user says to push live.

## Design reviews (the Executive Design Review Board)

Significant changes get pressure-tested before implementation. Convene the
board with the **`/board <idea>`** command (`.claude/skills/board/`), which
stages the full session live in chat, person by person. The roster, rules, and
meeting format live in `dev/reviews/BOARD.md`; when a change warrants a written
review, log it under `dev/reviews/` (see that folder's README). The board is a
design-phase deliberation, not a test; its machine-checkable rules are enforced
by `dev/board-gate.js` (step 3).

## Shipping to itch (the web build)

Run `node dev/build-web.js`; upload the generated `dist/car-guy-sim-itch.zip`
and tick "This file will be played in the browser". The zip holds the source as
`index.html` beside `assets/`, so the page stays small and art and music load
as needed. Do not go back to a single inlined HTML: past 50 MB itch stopped
loading it. Never upload the source `Car_Guy_Sim.html` on its own, its art and
music live in `assets/`.

## The desktop app (Steam)

`desktop/` wraps the game in Tauri. `desktop/stage.js` copies the game and its
assets into `desktop/web/` (gitignored) and reads `GAME_VERSION`; it never edits
the game, so the itch build is unaffected. Build with `cd desktop && npm run
build`. Any desktop-only behavior must be gated on detecting the Tauri runtime
so the browser build keeps working unchanged. See `desktop/README.md`.

## Conventions

- Develop on the designated feature branch; `main` and `garage` are
  fast-forwarded from it on "push live".
- `SAVE_VERSION` tracks the save format only — do not bump it with releases.
- Player-facing text must stay in-world: no production/meta language
  ("original look", "flat-panel", "light-model", etc.) in anything a player
  reads.
- No em-dashes (—) anywhere in the game. Use commas, periods, or plain
  hyphens. The whole file was purged in 0.17.0; don't reintroduce them.
- Cinematic art (`CUTSCENE_ART`) stays as-is unless explicitly asked.
- Verify visual changes with a real render (Playwright at
  `/opt/pw-browsers/chromium`) before calling them done.
