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

Each computer only builds its own version.

### The easy way: let GitHub build it

You don't need any of the setup above to get a Windows build. Every push that
changes the game or this folder builds Windows and Linux on GitHub's machines:

1. Open the repo on GitHub, click **Actions**, then **Desktop build**.
2. Click the newest run with a green check.
3. Scroll to **Artifacts** and download `car-guy-sim-windows`.
4. Unzip it and double-click `Car Guy Simulator.exe`. No install needed.

The zip also has a `..._x64-setup.exe` installer. Steam doesn't use it (Steam
installs the game itself), but it's handy for sending to a tester.

To build without pushing, click **Run workflow** on the Desktop build page.

`npm run dev` opens the app without packaging it, which is faster when you
just want to look.

## What has been tested

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
- **App id is locked.** `com.winnxt.carguysim` in `tauri.conf.json` decides
  where saves live. Never change it after release or players lose their saves.
- **Steam hookup** (achievements, Cloud saves), saves as real files, controller
  support. See `docs/STEAM_BUILD_PLAN.md`.
