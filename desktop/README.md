# The desktop app (Steam build)

This folder turns the game into a real desktop app that Steam can sell. It uses
**Tauri**, a small program that opens a window and runs `Car_Guy_Sim.html`
inside it, the same way a browser would.

## The one rule: the game stays in one place

```
Car_Guy_Sim.html + assets/      <- the game. You only ever edit this.
        |
        +--> dev/build-web.js   -> dist/car-guy-sim-itch.zip   (itch)
        |
        +--> desktop/stage.js   -> desktop/web/ -> the desktop app   (Steam)
```

- Both builds **copy** the game. Neither one edits it.
- Changing the game updates itch and Steam together on their next build.
- Nothing in this folder can break the itch zip. The itch build never looks in
  here.
- If the Steam app ever needs to act differently (Steam achievements, save
  files on disk), the game will check "am I in the desktop app?" first and do
  nothing extra in a browser. The itch build stays as it is today.

## Build it

One-time setup on a new machine: install [Rust](https://rustup.rs) and
Node, then run `npm install` in this folder. On Linux, also install the
system packages listed in Tauri's prerequisites (WebKitGTK 4.1, librsvg,
patchelf).

```
cd desktop
npm run build
```

That copies the game into `desktop/web/`, stamps the app with `GAME_VERSION`,
and builds the app for the computer you are on:

| Built on | You get | Found in |
| --- | --- | --- |
| Linux | `.AppImage` (Steam Deck and Linux) | `src-tauri/target/release/bundle/appimage/` |
| Windows | `.exe` installer | `src-tauri/target/release/bundle/nsis/` |
| Mac | `.dmg` | `src-tauri/target/release/bundle/dmg/` |

Each computer only builds its own version. To build all three from one place,
set up GitHub Actions later.

`npm run dev` opens the app without packaging it, which is faster when you
just want to look.

## What has been tested (0.107.3)

Tested on Linux with WebKitGTK 2.52, the same engine family the Steam Deck
uses:

- No script errors on boot or in the first minutes of play
- Art, the handwriting font, and music (MP3) all load and play
- Mouse clicks and the Enter key work
- A save survives closing and reopening the app

Not yet tested: a real Steam Deck, Windows, Mac.

## Not done yet

- **Real icon.** `src-tauri/icons/` is a crop of the title art, made with
  `npx tauri icon <1024px square png>`. Swap in a proper one the same way.
- **App id.** `com.winnxt.carguysim` in `tauri.conf.json`. Change it before
  the first public release. It decides where saves live, so changing it later
  orphans everyone's saves.
- **Steam hookup** (achievements, Cloud saves), saves as real files, controller
  support. See `docs/STEAM_BUILD_PLAN.md`.
