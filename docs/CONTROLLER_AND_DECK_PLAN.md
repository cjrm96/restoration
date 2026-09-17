# Controller + Steam Deck: the build plan

Target: a "Playable" badge at minimum, "Verified" if the density pass lands.
Written against 0.87.0. Numbers below were measured, not estimated.

## What already exists

The mouse-only diagnosis in `STEAM_LAUNCH_POLISH.md` is out of date. One
`keydown` listener (`Car_Guy_Sim.html`, search `document.addEventListener("keydown"`)
already handles:

| Key | Does |
| --- | --- |
| Arrows + Enter | Drives the title menu |
| `Esc` | Closes cutscene, cheat prompt, settings, store, fullscreen, else opens settings |
| `Enter` | Advances tutorial, unlocks, recap, show stages, notices |
| `F` | Fullscreen |
| `1`-`4` | Switches main tabs via `KEY_VIEW_ORDER` |

So the keyboard minimum is done. What is missing is the thing that makes a
controller work at all.

## The one real problem

**Focus does not survive a render.** The game rebuilds UI by assigning
`innerHTML` (52 sites), funnelled through `render(mode)` behind
`requestRender()`. Every rebuild destroys the focused element and
`document.activeElement` falls back to `<body>`. Native tab order is therefore
useless, and any hand-built focus graph would be invalidated on every tick.

Everything else in this plan is small. This is the part to get right.

### The fix: identity by key, not by node

1. **Stamp a stable key on every interactive element.** Almost all buttons come
   from one helper, `button(label, onclick, ...)`. The `onclick` string is
   already unique per action (`setView('career')`, `exportSave()`). Emit it as
   `data-nav="<onclick>"`. Hand-written `<button>` literals get an explicit
   `data-nav`. One helper edit covers most of the surface.
2. **Restore after render.** At the end of `render()`, re-query
   `[data-nav="<lastFocusedKey>"]` and focus it. Gone? Fall back to the nearest
   surviving sibling in the same container, then to first-in-DOM-order.
3. **Never restore focus when the player is on mouse.** Track last input device
   and only manage focus after a key or pad event, so mouse players never see a
   focus ring chasing them.

### Movement: compute, don't author

Do not build a navigation graph. Resolve direction from bounding rects at move
time:

```
navMove(dir):
  candidates = visible, non-disabled [data-nav] nodes
  if keyboardModalBlocking(): candidates = candidates inside the modal subtree
  score = distance along dir + perpendicular offset penalty
  focus lowest score
```

`keyboardModalBlocking()` already exists and already knows every blocking state,
so modal capture is free. Zero maintenance as the UI changes.

## Phase 1: focus model + keyboard spatial nav

No gamepad code yet. Arrow keys move focus, Enter activates. This ships real
value on its own for desktop keyboard players.

- `data-nav` stamping in `button()` and the literals
- focus save/restore in `render()`
- `navMove()` with modal capture
- a visible focus ring that is unmistakably not the hover state
- last-input-device tracking

## Phase 2: the gamepad layer

A `requestAnimationFrame` poll of `navigator.getGamepads()`. The Deck presents
an XInput-style pad, so one mapping covers Deck and desktop controllers.

| Input | Action |
| --- | --- |
| D-pad / left stick | `navMove()`, deadzone 0.5, 180ms initial repeat then 90ms |
| A | Click focused element |
| B | Back. Factor the existing `Esc` branch into `handleBack()` and call it |
| X | Primary action of the current view (end day / advance) |
| Y | Fullscreen, reuses the `F` path |
| LB / RB | Cycle `KEY_VIEW_ORDER`, reuses the `1`-`4` path |
| Start | Settings |
| Right stick / triggers | Page scroll |

**Rule: one code path.** Pad inputs call the same functions the keys call. If B
and `Esc` ever diverge, the back stack will rot.

## Phase 3: Deck fit and readability

Measured at 1280x800 with everything unlocked:

| Metric | Now | Target |
| --- | --- | --- |
| Horizontal scroll | none | none (already good) |
| Page height | 2.19 screens | under 1.6 |
| Visible buttons per view | 11 | unchanged |
| Buttons under 32px in a dimension | 5 of 11 | 0 |
| Smallest button font | 11px | 14px |
| Layout column | `max-width: 1240px` | unchanged, but see below |

Work:

- **Hit targets.** Raise `.btn` to a 40px min-height and give icon-only buttons
  a min-width. Five of eleven currently fail.
- **Text floor.** 11px on a 7in screen fails a Verified text-legibility check.
  Raise body copy to 14px and labels to 12px.
- **Gutters.** Every breakpoint in the file is a `max-width` (460 through 980)
  plus one `min-width: 900px`. At 1280 wide the 1240px column leaves a 20px
  gutter per side. Add a short-viewport rule rather than a new width rule:
  `@media (max-height: 860px)` to tighten vertical padding and pull the page
  under 1.6 screens.
- **UI scale setting.** 0.9 / 1.0 / 1.15 / 1.3 applied at the root and persisted
  in `state.settings`. Serves Deck and TV-distance desktop from one control.

## Verification

Extend `dev/qa-smoke.js` with a Deck profile so this cannot regress:

- viewport 1280x800, assert no horizontal scroll
- assert smallest rendered button font >= 14px
- assert every visible button is at least 32x32
- **nav sweep**: walk each view with simulated d-pad input, assert every visible
  button is reachable, and assert focus survives a forced `requestRender('full')`
- assert `handleBack()` unwinds every blocking state that `keyboardModalBlocking()`
  reports

## Sequencing

Phase 1 is the load-bearing one and is worth shipping alone. Phase 2 is small
once Phase 1 exists. Phase 3 is independent of both and can run in parallel,
since it is CSS and a settings toggle.

Ship order: Phase 1, then Phase 3, then Phase 2. Phase 3 before Phase 2 because
a controller on an unreadable screen still fails the badge, and the density pass
also benefits every existing desktop player.
