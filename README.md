# Car Guy Simulator

A garage management sim about restoring classic American iron, chasing show
podiums, and keeping the lights on. Single-file HTML5 — open
`Car_Guy_Sim.html` in a browser and play.

## Repo layout

| Path | What it is |
| --- | --- |
| `Car_Guy_Sim.html` | The entire game — markup, styles, logic, art, and audio in one file. |
| `dev/stage-viewers/` | Dev-only sprite workbenches, one per car body. Each renders all five restoration stages of a hand-coded SVG sprite so art changes can be iterated outside the game, then copied into `Car_Guy_Sim.html`. Not shipped. |
| `docs/` | Planning notes, including the Steam launch polish roadmap. |

## Controls

Mouse, plus keyboard: **1–4** switch tabs, **Enter** advances popups,
**Esc** closes menus or opens Settings, **F** toggles fullscreen.
