# The Steam build: what it takes

Written against 0.87.0. Measurements are from this repo, not estimates.

## Where the game actually stands

Better positioned than `STEAM_LAUNCH_POLISH.md` implies.

| Thing | State |
| --- | --- |
| Save payload | ~10KB for a live save, `classic_restoration_save_v5` |
| Save durability | 3 rolling backups (`_bak1..3`), `_preimport` snapshot, corrupt-recovery |
| Save portability | Export to file, import from file, copy/paste as text, all shipped |
| Achievements | **93 defined** with ids and `test()` predicates in `ACHIEVEMENTS` |
| Art | 68 assets, 18MB as `assets/art/*.webp` |
| Single-file build | `dist/Car_Guy_Sim.html`, 26MB, art inlined, built by `dev/build-web.js` |
| Source | `Car_Guy_Sim.html`, 1.8MB |
| Regression suite | `dev/qa-smoke.js`, 40+ checks, Playwright |

The save system was clearly built with this in mind. `SAVE_VERSION` is separate
from `GAME_VERSION`, migrations have an anchor point, and the payload is small
enough that Cloud sync is trivial.

## 1. Pick the wrapper

**Recommendation: Tauri.**

| | Tauri | Electron | Steam's own CEF |
| --- | --- | --- | --- |
| Installed size | ~10MB + game | ~150MB + game | large |
| Steamworks | `steamworks-rs` | `steamworks.js` | native |
| Deck (Linux) | good, uses system webview | good, ships Chromium | good |
| Risk | webview version varies per OS | none, pinned Chromium | most work |

Tauri's tradeoff is that it uses the host webview, so the game runs on WebKit on
Mac, WebView2 on Windows, and WebKitGTK on Deck. The game is plain DOM plus Web
Audio plus SVG, no exotic APIs, so this is low risk. **Verify on WebKitGTK
first** before committing, because that is the Deck path and the least forgiving
of the three.

If WebKitGTK causes trouble with the Web Audio engine, switch to Electron and
eat the size. Do not discover this late.

### Load the source, not the single-file build

Ship `Car_Guy_Sim.html` plus `assets/` into the bundle rather than the 26MB
inlined `dist/` file. The inlined build exists for itch, where one file is the
delivery format. In a desktop bundle, separate assets parse faster, patch
smaller through Steam's delta updates, and keep the source readable.

## 2. Saves on disk and Steam Cloud

The lift is small because the format is already portable.

1. **Abstract the storage calls.** Every `localStorage` touch is already routed
   through `SAVE_KEY` (about 15 sites). Put them behind
   `saveStore.get/set/remove` so the browser build keeps `localStorage` and the
   desktop build writes real files.
2. **Write to the app data dir**, one file per slot plus the existing backups.
3. **Steam Cloud via Auto-Cloud**, not the API. Auto-Cloud is a path glob in the
   Steamworks partner settings, needs no code, and at ~10KB per save the quota
   is a non-issue. Reserve the ISteamRemoteStorage API for later if conflict
   resolution ever needs a real UI.
4. **Multiple save slots.** This is the only genuinely new feature in the
   section. `SAVE_KEY` is a single constant, so slots mean a slot id in the key
   and a slot picker in the existing settings panel where export/import already
   live.

Keep export/import in the desktop build. It is the fallback when Cloud
misbehaves and it costs nothing to keep.

## 3. Achievements

This is the cheapest win on the list. 93 achievements already exist with stable
string ids and predicates that run against live state.

- Map each existing id to a Steamworks API name. Use the ids verbatim so there
  is one source of truth.
- Where the game already fires an achievement banner, also call
  `SetAchievement` + `StoreStats` through the wrapper bridge.
- Add the icons. 93 icons at 64x64 and 256x256 is the real cost here, not code.
- Backfill on load: run every `test()` once at startup so players migrating a
  browser save get credited for what they already did.

## 4. Store page assets

Largely already produced. The art pipeline (`art/GEMINI-PROMPTS.md`,
`dev/export-art.py`) and the 10 stage-viewer pages in `dev/stage-viewers/` are
the right tools for capsule art and screenshots.

Still needed: the capsule set at Steam's required sizes (616x353, 460x215,
231x87, 1920x620 hero, 374x448 library portrait), 5+ screenshots at 1920x1080,
and a trailer. The `scene-victory`, `scene-restored-barn` and `scene-next-tarp`
art are the strongest hero candidates.

## 5. What must land before the store page goes up

In order, because each unblocks the next:

1. **Wrapper spike.** Tauri + WebKitGTK, confirm Web Audio and the render loop.
   This is the only real technical unknown in the whole project.
2. **Storage abstraction + file saves.** Small, mechanical, unblocks Cloud.
3. **Steam Cloud Auto-Cloud.** Configuration, not code.
4. **Achievements bridge.** Code is trivial, icons are the schedule risk.
5. **Controller + Deck.** See `CONTROLLER_AND_DECK_PLAN.md`. Independent of all
   of the above and can run in parallel.
6. **Save slots.** The only new feature. Do it last so the storage layer has
   settled first.

## Risks worth naming

- **WebKitGTK.** The one thing that could force a wrapper rewrite. Spike it
  first, not last.
- **Achievement icons.** 93 of them. This is an art schedule item hiding inside
  an engineering task.
- **A migrated browser save must not lose a career.** The import path already
  exists and is smoke-tested. Keep a first-run "import your browser save" flow
  rather than assuming players will find it in settings.
- **`dev/qa-smoke.js` runs against the browser build.** Once the wrapper exists,
  the suite needs to run against the packaged app too, or the desktop build will
  drift out from under its own regression tests.
