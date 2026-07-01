# Steam Launch — Top 3 Polish Items

Car Guy Simulator is feature-complete as a browser game: the full restoration
loop, show circuit, marketplace, social/sponsor systems, tutorial, victory arc,
and legacy runs are all in place. The gap to a Steam launch is not more
features — it's the difference between "great HTML game" and "shippable Steam
product." These are the three highest-impact items, in priority order.

## 1. Desktop packaging + save durability (Steam Cloud)

The game currently ships as a raw `Car_Guy_Sim.html` with a single save slot
in `localStorage`. That's the biggest launch risk:

- Steam needs a desktop build (Electron or Tauri wrapper) with Steamworks
  integration — the game can't be listed as a bare HTML file.
- `localStorage` inside a webview is fragile: it can be wiped by the OS,
  cleared caches, or app reinstalls. Lost saves in a long-arc career game are
  the fastest route to negative reviews.
- Move saves to real files on disk, wire them to **Steam Cloud**, and add
  multiple save slots plus an export/import fallback. The save-versioning
  system (`SAVE_VERSION`, migrations) already in place makes this a clean
  lift.
- Achievements come almost free once Steamworks is wired up, and the game is
  full of natural triggers (first National win, each legacy build, sponsor
  unlocks, barn-find scores).

## 2. Keyboard and controller input (Steam Deck playability)

The entire game is mouse-only — the sole `keydown` listener is the cheat-code
input. Desktop players expect basic keyboard flow, and Steam Deck is a major
sales channel for cozy management sims:

- Minimum: `Esc` closes modals/settings, `Enter` confirms, number keys or
  `Tab`/arrows switch the main tabs, hotkeys for end-day/save.
- Full polish: a focus/navigation system over the existing button-driven UI so
  the game is playable with a controller — that's the path to a "Playable" or
  "Verified" Steam Deck badge, which meaningfully moves sales for this genre.
- UI scaling for 1280×800 (Deck) and large TV-distance text should be checked
  at the same time; the layout is currently tuned to a 1240px web column.

## 3. Distinct car art per model

Thirteen buyable cars share five sprite bodies (`truck`, `camaro`, `belair`,
`mustang`, `corvette`). Right now the Caddilack Eldorando and Ponteac Trans Am
render as Cameron bodies, and the Shelly GT500 and Plymoth Marauder render as
Stallion bodies:

- This is the single most visible polish gap — car identity is the fantasy of
  the game, and buyers will screenshot-compare cars on the store page.
- Every car needs its own silhouette across its restoration stages (the
  existing stage-viewer pages — `mustang.html`, `camaro.html`, etc. — are the
  right workflow to extend to the remaining bodies: Eldorando, Trans Am,
  GT500/fastback variant, Marauder, C10 vs F-250 trucks).
- This work also directly produces the store-page assets (capsule art,
  screenshots, trailer shots) needed for the Steam listing itself.

## Worth noting (not top-3)

- Car names are already trademark-safe (Chevvi, Forde, Ponteac, Shelly) —
  good call, one less legal blocker for the store page.
- Music/SFX volume settings, fullscreen, tutorial, and auto-save are already
  in — those common polish gaps are covered.
