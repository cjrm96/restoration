# Car Guy Simulator — project notes

HTML5 game. All game code lives in `Car_Guy_Sim.html`; cutscene art ships as
`assets/art/*.webp` (the game points at those files, so the source stays small
and runs straight from disk). `dev/` holds tooling (not shipped). The
single-file itch/web build is generated on demand by `dev/build-web.js`, which
inlines the art back into `dist/Car_Guy_Sim.html` (gitignored).

## Push checklist (EVERY push, no exceptions)

1. **Bump `GAME_VERSION`** in `Car_Guy_Sim.html` (search `const GAME_VERSION`).
   - **Minor** (0.7.0 → 0.8.0): new features/content.
   - **Patch** (0.7.0 → 0.7.1): fixes and polish only.
   - One bump per push, no matter how many commits it carries.
   - It's the single source of truth: the title screen, credits, settings
     About panel, and crash reports all stamp from it. Never hardcode a
     version string anywhere else.
2. **Syntax check**: extract the main script and `node --check` it.
3. **Run the smoke suite**: `QA_CHROMIUM=/opt/pw-browsers/chromium node dev/qa-smoke.js`
   — all checks must pass (it verifies the title version plate, and also runs
   `dev/build-web.js` to confirm the itch single-file build stays
   self-contained).
4. Push the feature branch; fast-forward `main` and `garage` only when the
   user says to push live.

## Shipping to itch (the web build)

Run `node dev/build-web.js`; upload the generated `dist/Car_Guy_Sim.html` (a
self-contained single file, art inlined). Never upload the source
`Car_Guy_Sim.html` to itch on its own, its art lives in `assets/`.

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
