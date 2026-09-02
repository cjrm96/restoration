#!/usr/bin/env node
/*
 * Car Guy Simulator — QA smoke test.
 *
 * The pre-upload ritual: run this before every itch build.
 *   npm install playwright   (once)
 *   node dev/qa-smoke.js
 *
 * Drives a real player path end to end and fails on any uncaught
 * page error: boot → splash → 5-beat tutorial → first installs →
 * Social unlock → roadworthy → Marketplace unlock → list a part →
 * Compete unlock → enter a show and click through the cinematic →
 * results screen panels (judge card / rep / rival) render → workspace
 * vibe options (incl. the classic 6th pick) resolve → save → reload →
 * state intact → export/import/backup sanity.
 *
 * Exit code 0 = ship it. Anything else = do not upload.
 */
const path = require("path");
const { chromium } = require("playwright");

const GAME = "file://" + path.resolve(__dirname, "..", "Car_Guy_Sim.html");
const EXEC = process.env.QA_CHROMIUM || undefined; // set to a chromium path if needed

const fail = (msg) => { console.error("✗ FAIL:", msg); process.exit(1); };
const pass = (msg) => console.log("✓", msg);

(async () => {
  // ── board gate (fast, text-only, no browser) ──
  // The mechanizable subset of the Executive Design Review Board: em-dashes,
  // production/meta jargon, and the GAME_VERSION bump ritual. Runs first so a
  // lint-level miss fails in milliseconds instead of after a Chromium launch.
  {
    const { execFileSync } = require("child_process");
    try {
      execFileSync("node", [path.join(__dirname, "board-gate.js")], { stdio: "inherit" });
    } catch (e) {
      fail("board gate failed (see above) — fix before uploading");
    }
  }

  const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
  const page = await browser.newPage({ viewport: { width: 1240, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("dialog", (d) => d.accept());

  // ── boot & splash ──
  await page.goto(GAME);
  await page.waitForTimeout(700);
  if (!(await page.$("#splashActions .splash-btn"))) fail("splash button missing");

  // ── version plate: GAME_VERSION is the single source of truth and must
  // show on the title screen. Push ritual (CLAUDE.md): bump GAME_VERSION on
  // every push — this check catches a plate that stopped stamping.
  const verOk = await page.evaluate(() => {
    if (typeof GAME_VERSION !== "string" || !/^\d+\.\d+\.\d+$/.test(GAME_VERSION))
      return "GAME_VERSION missing or malformed: " + GAME_VERSION;
    const plate = document.getElementById("splashVersion");
    if (!plate || plate.textContent.trim() !== "v" + GAME_VERSION)
      return "title version plate shows '" + (plate ? plate.textContent : "?") + "', expected v" + GAME_VERSION;
    return true;
  });
  if (verOk !== true) fail("version plate: " + verOk);
  pass(`version plate (v${await page.evaluate(() => GAME_VERSION)})`);

  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  pass("boot + splash");

  // ── barn-find intro cut scene (new game only) ──
  const introArt = await page.evaluate(() => state.cutscene && state.cutscene.art);
  if (introArt !== "scene-barn-find") fail("intro cutscene missing (got " + introArt + ")");
  // This is the exact bug the hold exists for: Enter leaves the title screen
  // and the second half of that keystroke used to land here, dismissing the
  // scene before its caption had arrived. It must survive the double tap.
  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  if (!(await page.evaluate(() => !!state.cutscene)))
    fail("the intro cut scene was dismissed by the splash double-tap (the hold is not working)");
  pass("intro cut scene survives the Enter double-tap off the splash");
  // Then it opens on its own and a normal press gets through.
  await page.waitForFunction(() => !!document.querySelector("#cutsceneRoot.cs-open"), null, { timeout: 5000 })
    .catch(() => fail("the intro cut scene never released its hold"));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  if (await page.evaluate(() => !!state.cutscene || !!document.getElementById("cutsceneRoot")))
    fail("intro cutscene did not dismiss");
  pass("barn-find intro cut scene");

  // ── the cut-scene hold. Players were losing the story to their own
  // keystroke: Enter leaves the title screen, the intro is the next thing on
  // screen, and the second half of that keystroke dismissed it before the
  // caption had arrived. The hold is scoped hard (design review 004), and
  // every one of those scopes is a way for it to become an annoyance, so all
  // of them are checked here. ──
  const holdOk = await page.evaluate(() => {
    if (typeof shouldHoldCutscene !== "function") return "the hold is gone";
    // Ambient load-in fires every session on a continue save. Never held.
    if (shouldHoldCutscene("scene-social", { noHold: true }))
      return "the every-session load-in would be held";
    // A scene already watched is never held again.
    state.scenesSeen = { "scene-social": true };
    lastCutsceneDismissAt = 0;
    if (shouldHoldCutscene("scene-social")) return "a re-watched scene would be held";
    // A fresh scene is.
    state.scenesSeen = {};
    if (!shouldHoldCutscene("scene-social")) return "a first-view scene is not held";
    // Only the first beat of a run: a scene opening right after one closed
    // must not stack another wait on top.
    lastCutsceneDismissAt = Date.now();
    if (shouldHoldCutscene("scene-social"))
      return "a queued follow-up beat would stack a second hold";
    return true;
  });
  if (holdOk !== true) fail("cut-scene hold: " + holdOk);
  pass("cut-scene hold is scoped: ambient, re-watch and chained beats all skip it");

  // Escape means "let me out", not "next", so it is never held. Enter is.
  const escOk = await page.evaluate(async () => {
    state.scenesSeen = {}; lastCutsceneDismissAt = 0;
    playCutscene({ art: "scene-social", kicker: "qa", title: "qa", sub: "qa" });
    if (!cutsceneHoldActive()) return "a fresh scene did not arm the hold";
    if (!document.querySelector("#cutsceneRoot.cs-held"))
      return "a held scene is missing the held class (the ENTER hint would show)";
    dismissCutscene(false);
    if (!state.cutscene) return "a held scene was dismissed by a normal input";
    dismissCutscene(true);
    if (state.cutscene) return "Escape could not get out of a held scene";
    return true;
  });
  if (escOk !== true) fail("cut-scene hold: " + escOk);
  pass("cut-scene hold: normal input waits, Escape always gets out");

  // A save written before the hold existed belongs to somebody who has
  // watched these scenes already. Getting this backwards gates thousands of
  // returning players on beats they sat through months ago.
  const legacyOk = await page.evaluate(() => {
    const total = Object.keys(CUTSCENE_ART).length;
    const stash = state.scenesSeen;
    // simulate the migration branch for a save with the field absent
    state.scenesSeen = {};
    Object.keys(CUTSCENE_ART).forEach((k) => (state.scenesSeen[k] = true));
    const covered = Object.keys(state.scenesSeen).length;
    const anyHeld = Object.keys(CUTSCENE_ART).some((k) => shouldHoldCutscene(k));
    state.scenesSeen = stash;
    if (covered !== total) return `migration covers ${covered} of ${total} scenes`;
    if (anyHeld) return "a migrated legacy save would still be held somewhere";
    return true;
  });
  if (legacyOk !== true) fail("cut-scene hold, legacy saves: " + legacyOk);
  pass("cut-scene hold: legacy saves are never newly gated");

  // ── single-card tutorial: one card, then hands on the car. Rules arrive
  // on contact (first payday, Compete unlock, Buck's intro DM) instead of
  // as a lecture — this drives the card(s) and confirms the handoff. ──
  let tutClicks = 0;
  for (let beat = 0; beat < 8; beat++) {
    const btn = await page.$("#modalRoot .tutorial-primary");
    if (!btn) break;
    await btn.click();
    tutClicks++;
    await page.waitForTimeout(250);
  }
  if (tutClicks < 1) fail("tutorial card not shown");
  const tutDone = await page.evaluate(() => state.tutorialComplete && onboardStageVal() === 0);
  if (!tutDone) fail("tutorial did not complete into onboarding stage 0");
  pass(`tutorial (single card, ${tutClicks} click${tutClicks === 1 ? "" : "s"})`);

  // ── the bedside box: starter tools arrive by pry bar, not shopping.
  // The scene must queue right after the tutorial, and resolving either
  // choice must land Basic Hand Tools + Basic Headlamp in the crate so
  // the first DIY job is possible from minute one. ──
  const bedside = await page.evaluate(() => state.pendingScene && state.pendingScene.id === "bedside_box");
  if (!bedside) fail("bedside box scene did not queue after the tutorial");
  await page.evaluate(() => resolvePendingScene(0));
  await page.waitForTimeout(300);
  const crateOk = await page.evaluate(() => {
    if (!state.ownedTools.includes("t1") || !state.ownedTools.includes("t14")) return "tools missing";
    const car = currentCar();
    const doable = PARTS.some((p) => !car.installedParts.includes(p.id) && state.money >= partCost(p, "diy") && !(p.tools || []).some((tid) => !state.ownedTools.includes(tid)));
    return doable ? true : "no DIY job affordable after the grant";
  });
  if (crateOk !== true) fail("bedside box: " + crateOk);
  pass("bedside box → starter tools, first DIY open");

  // ── week one has to look composed, not half-loaded. The side column is
  // three staged reveals that are all correctly empty on the first screen, so
  // the grid must collapse rather than hold 320px+ of nothing beside the
  // build, and it must come back the moment anything earns it. ──
  const spacingOk = await page.evaluate(() => {
    const grid = () => document.querySelector(".grid-main");
    setView("workshop"); render("full");
    const g = grid();
    if (!g) return "no main grid rendered";
    const side = g.children[1];
    const sideEmpty = !side || !side.innerText.trim();
    if (!sideEmpty) return "the side column already has content on the first screen";
    if (!g.classList.contains("solo"))
      return "the grid kept two columns with nothing in the second";
    if (g.getBoundingClientRect().width > 800)
      return "the collapsed grid did not take a centred reading width";
    if (!document.querySelector(".topbar.topbar-sparse"))
      return "the topbar did not report itself sparse with only a money chip";
    // Start a job: the work-order board earns the column back.
    const money0 = state.money;
    state.money = 20000;
    const car = currentCar();
    const part = PARTS.find((p) => !car.installedParts.includes(p.id));
    installPart(part.id, "shop", false);
    state.noticeQueue = []; state.pendingScene = null; render("full");
    const g2 = grid();
    if (g2.classList.contains("solo")) return "the second column never came back";
    if (!g2.children[1] || !g2.children[1].innerText.trim())
      return "two columns returned but the side is still empty";
    // put it back
    state.activeRestorations = []; state.money = money0;
    state.noticeQueue = []; state.pendingScene = null; render("full");
    return true;
  });
  if (spacingOk !== true) fail("week one layout: " + spacingOk);
  pass("week one collapses to one centred column, and earns the second back");

  // ── how long week one actually is. The four roadworthy systems set it, and
  // at the curb only one job runs at a time, so every job is a week of a
  // 22-week season spent before the player can enter anything. Pure
  // arithmetic on a copy of the truck: this must not touch real state, or it
  // eats the installs the onboarding checks below depend on. ──
  const weekOneOk = await page.evaluate(() => {
    const src = currentCar();
    const car = JSON.parse(JSON.stringify(src));
    const owned = new Set(state.ownedTools);
    const done = new Set(car.installedParts);
    let jobs = 0, weeks = 0, spent = 0, budget = 5000;
    const met = () =>
      car.engine >= ROADWORTHY_ENGINE && car.transmission >= ROADWORTHY_TRANSMISSION &&
      car.brakes >= ROADWORTHY_BRAKES && car.steering >= ROADWORTHY_STEERING;
    while (!met() && jobs < 40) {
      const need = {
        engine: ROADWORTHY_ENGINE - car.engine,
        transmission: ROADWORTHY_TRANSMISSION - car.transmission,
        brakes: ROADWORTHY_BRAKES - car.brakes,
        steering: ROADWORTHY_STEERING - car.steering,
      };
      const short = Object.keys(need).filter((k) => need[k] > 0);
      const pool = PARTS.filter((p) => !done.has(p.id) && short.includes(p.category));
      if (!pool.length) break;
      pool.sort((a, b) => partCost(a, "diy") - partCost(b, "diy"));
      const p = pool[0];
      const mode = (p.tools || []).every((t) => owned.has(t)) ? "diy" : "shop";
      const c = partCost(p, mode);
      if (budget < c) break;
      budget -= c; spent += c; done.add(p.id);
      car[p.category] = Math.min(100, car[p.category] + p.imp);
      weeks += (TASK_WEEKS[p.tier] || 1);
      jobs++;
    }
    if (!met()) return "the starting truck cannot reach roadworthy from a fresh save";
    if (jobs > 6) return `week one is ${jobs} jobs / ${weeks} weeks, budget is 6 jobs`;
    if (spent > 1200) return `week one costs $${spent} of a $5,000 start, budget is $1,200`;
    return { jobs, weeks, spent };
  });
  if (typeof weekOneOk === "string") fail("week one length: " + weekOneOk);
  pass(`week one: ${weekOneOk.jobs} jobs, ${weekOneOk.weeks} weeks of 22, $${weekOneOk.spent} to roadworthy`);

  // ── Space & Storage is two things in one tab: a $200 tool-storage upgrade a
  // player needs the moment the milk crate fills, and a $2,500 carport against
  // a $5,000 bankroll that buys parallel jobs while the whole road to
  // roadworthy is eight sequential ones under $900. The tab waits until it has
  // something worth showing, and both ways of earning it must work or a player
  // who buys tools gets walled off from the storage they now need. ──
  const spaceOk = await page.evaluate(() => {
    const strip = () => [...document.querySelectorAll(".shop-subtabs .tab")].map((t) => t.textContent);
    const hasSpace = () => strip().some((t) => /Space/.test(t));
    setView("workshop"); setShopSub("suggested"); render("full");
    if (hasSpace()) return "Space & Storage is on the strip in week one";
    if (strip().length !== 3) return "week one strip should be 3 pills, got " + strip().length;
    // Cannot be navigated to while it is off the strip.
    setShopSub("workspace");
    if (state.shopSub === "workspace") return "setShopSub reached a hidden sub-tab";
    // A save written on it must fall back rather than strand the player.
    state.shopSub = "workspace"; render("full");
    if (state.shopSub !== "suggested") return "a save written on the hidden tab stranded there";
    if (/Covered Carport/.test(document.getElementById("appContent").innerText))
      return "the carport is still reachable in week one";
    // Path 1: the crate fills up, so the upgrade the player now needs appears.
    const tools0 = state.ownedTools.slice();
    const cap = toolStorageData().maxTools;
    while (state.ownedTools.length < cap) {
      const t = TOOLS_LIST.find((x) => !state.ownedTools.includes(x.id));
      if (!t) break;
      state.ownedTools.push(t.id);
    }
    render("full");
    if (!hasSpace()) return "a full tool crate did not open Space & Storage";
    setShopSub("workspace"); render("full");
    if (!/Upgrade Storage/.test(document.getElementById("appContent").innerText))
      return "the tool storage upgrade is not reachable once the crate is full";
    // Path 2: roadworthy opens it whatever the tools look like.
    state.ownedTools = tools0; state.shopSub = "suggested";
    const car = currentCar();
    const before = { e: car.engine, t: car.transmission, b: car.brakes, s: car.steering };
    car.engine = 60; car.transmission = 50; car.brakes = 50; car.steering = 50;
    render("full");
    const rwOpens = hasSpace();
    car.engine = before.e; car.transmission = before.t; car.brakes = before.b; car.steering = before.s;
    state.noticeQueue = []; state.pendingUnlock = null; setShopSub("suggested"); render("full");
    if (!rwOpens) return "a roadworthy car did not open Space & Storage";
    return true;
  });
  if (spaceOk !== true) fail("Space & Storage gate: " + spaceOk);
  pass("Space & Storage waits for a full tool crate or a running truck");

  // ── the loans desk is introduced by a person, not by a button appearing.
  // It stays shut until the shark works the row at a show and finds somebody
  // short, which means a player who stays solvent never meets him. Legacy
  // saves must arrive with the desk they have always had. ──
  const loansOk = await page.evaluate(() => {
    const clr = () => {
      state.pendingScene = null; state.pendingEvent = null; state.eventQueue = [];
      state.noticeQueue = []; state.cutscene = null; state.pendingUnlock = null;
      state.showStore = false; state.weekRecap = null; state.pendingRecap = null;
      clearTabArrival();
    };
    const stash = { money: state.money, history: state.history, unlocked: state.loansUnlocked,
                    met: state.sharkMetWeek, refused: state.sharkRefused };
    state.loansUnlocked = false; state.sharkMetWeek = null; state.sharkRefused = false;
    if (loansAvailable()) return "the desk is open before anyone introduced it";
    openStore();
    if (state.showStore) { closeStore(); return "openStore reached a desk that is not available"; }
    // Broke but never seen at a show: he does not know you exist.
    clr(); state.money = 400; state.history = [];
    maybeTriggerSharkIntro();
    if (state.pendingScene) return "he turned up before the player had been to any shows";
    // Broke two shows in is week three, which is broke because the player
    // just bought a truck. He waits until five are in the book.
    clr(); state.money = 400; state.lifeBeatWeek = -1;
    state.history = [{ tier: "Cars & Coffee", place: 3 }, { tier: "Cars & Coffee", place: 4 }];
    maybeTriggerSharkIntro();
    if (state.pendingScene) return "he turned up in the opening, two shows in";
    // Five shows in but solvent: he has no reason to stop.
    clr(); state.money = 5000; state.lifeBeatWeek = -1;
    state.history = [1, 2, 3, 4, 5].map((n) => ({ tier: "Local", place: n }));
    maybeTriggerSharkIntro();
    if (state.pendingScene) return "he approached a player who was not short";
    // Short, and seen around: he works the row.
    clr(); state.money = 900; state.lifeBeatWeek = -1;
    maybeTriggerSharkIntro();
    if (!state.pendingScene || state.pendingScene.id !== "shark_intro")
      return "the shark never approached a broke player with five shows behind them";
    if ((state.pendingScene.choices || []).length !== 2)
      return "the offer is not refusable";
    if (loansAvailable()) return "the desk opened before the scene resolved";
    // Refusing still opens the desk, and is remembered, and costs nothing.
    resolvePendingScene(1);
    if (!state.loansUnlocked) return "walking away left the desk shut";
    if (!state.sharkRefused) return "the refusal was not remembered";
    if (state.sharkEverTaken) return "walking away still dirtied the moral ledger";
    // The bug that kept him off the board for whole seasons: he bailed on
    // modalBusy(), and the week advance always has a notice queued behind
    // it. queueScene() defers on its own, so a busy screen must delay him,
    // never cancel him.
    clr(); state.loansUnlocked = false; state.sharkMetWeek = null;
    state.sharkRefused = false; state.money = 300; state.lifeBeatWeek = -1;
    state.noticeQueue = [{ title: "Week 9", text: "payday" }];
    if (!modalBusy()) return "the busy-screen case did not set up";
    maybeTriggerSharkIntro();
    if (state.sharkMetWeek == null) return "a queued notice cancelled him instead of delaying him";
    if (state.pendingScene) return "he opened on top of a notice instead of queueing";
    if (!(state.eventQueue || []).some((e) => e.payload && e.payload.id === "shark_intro"))
      return "he was neither shown nor queued";
    state.noticeQueue = []; state.eventQueue = []; clr();
    // And he only does it once.
    clr(); state.money = 200; state.sharkMetWeek = state.sharkMetWeek || 1;
    const before = state.pendingScene;
    maybeTriggerSharkIntro();
    if (state.pendingScene !== before) return "he approached a second time";
    Object.assign(state, { money: stash.money, history: stash.history,
      loansUnlocked: stash.unlocked, sharkMetWeek: stash.met, sharkRefused: stash.refused });
    clr();
    return true;
  });
  if (loansOk !== true) fail("loans introduction: " + loansOk);
  pass("loans desk stays shut until the shark introduces it, and refusing still opens it");

  // ── the Saturday trips. Neither the yard nor the swap was ever introduced:
  // the Road Trip pill turned up with two others when show season opened, and
  // the only writing explaining either place fired after the player had paid
  // and committed. A friend mentions them now, the yard first. ──
  const tripsOk = await page.evaluate(() => {
    const stash = { known: JSON.parse(JSON.stringify(state.tripsKnown || {})),
                    stage: state.onboardStage, installs: state.installsDone,
                    trips: state.scavengeTripsTaken, view: state.view, beat: state.lifeBeatWeek };
    const clr = () => {
      state.pendingScene = null; state.pendingEvent = null; state.eventQueue = [];
      state.noticeQueue = []; state.cutscene = null; state.pendingUnlock = null;
      state.lifeBeatWeek = -1; clearTabArrival();
    };
    const restore = () => {
      state.tripsKnown = stash.known; state.onboardStage = stash.stage;
      state.installsDone = stash.installs; state.scavengeTripsTaken = stash.trips;
      state.lifeBeatWeek = stash.beat; clr(); setView(stash.view); render("full");
    };
    state.tripsKnown = { yard: false, swap: false };
    state.activeRestorations = [];
    // Unknown means unreachable, even at show season.
    state.onboardStage = 3;
    if (marketTabEarned("trip")) { restore(); return "the Road Trip pill shows before anyone mentioned the yard"; }
    clr(); commitScavengeTrip("junkyard");
    if (state.atTrip) { restore(); return "the player drove to a yard nobody told them about"; }
    // Too early to mean anything.
    clr(); state.installsDone = 1;
    if (maybeTriggerYardIntro()) { restore(); return "the yard tip landed before parts had cost anything"; }
    // Quiet week with a few parts in: the beat lands.
    clr(); state.installsDone = 4;
    if (!maybeTriggerYardIntro()) { restore(); return "the yard beat never fired on a quiet week"; }
    if (!state.pendingScene || state.pendingScene.id !== "yard_intro") { restore(); return "wrong scene queued for the yard"; }
    if (tripKnown("swap")) { restore(); return "the yard beat gave away Pomona too"; }
    resolvePendingScene(1);                       // decline, still learns the place
    if (!tripKnown("yard")) { restore(); return "declining the Saturday forgot the place exists"; }
    if (!marketTabEarned("trip") || marketTabLock("trip")) { restore(); return "the pill is earned but still locked"; }
    // Pomona is not a destination yet.
    clr(); commitScavengeTrip("swap");
    if (state.atTrip) { restore(); return "the swap was reachable before its own beat"; }
    // After a Saturday out, with the money game open.
    clr(); state.scavengeTripsTaken = 1; state.onboardStage = 2; state.atTrip = false;
    if (!maybeTriggerSwapIntro()) { restore(); return "the swap beat never fired"; }
    if (!state.pendingScene || state.pendingScene.id !== "swap_intro") { restore(); return "wrong scene queued for the swap"; }
    resolvePendingScene(0);
    if (!tripKnown("swap")) { restore(); return "the swap beat did not open Pomona"; }
    // Neither repeats.
    clr();
    if (maybeTriggerYardIntro() || maybeTriggerSwapIntro()) { restore(); return "a trip beat fired twice"; }
    restore();
    return true;
  });
  if (tripsOk !== true) fail("Saturday trips: " + tripsOk);
  pass("the yard and the swap are each introduced by a friend before they exist");

  // ── season one is one truck and one story. The lot stays shut so a second
  // project cannot compete with the only arc the season is telling, and the
  // one car that can change hands is the one that was never yours to flip. ──
  const seasonOneOk = await page.evaluate(() => {
    const stash = { season: state.seasonNumber, wife: state.wifeCarSold, stage: state.onboardStage,
                    tab: state.marketTab, view: state.view, cars: state.cars.slice() };
    const setup = (season, wifeSold, tab) => {
      state.onboardStage = 3; state.pendingUnlock = null; clearTabArrival();
      state.noticeQueue = []; state.tripsKnown = { yard: true, swap: true };
      state.seasonNumber = season; state.wifeCarSold = wifeSold; state.marketTab = tab;
      setView("dealership"); renderMainContent(true);
      return document.getElementById("appContent").innerText;
    };
    const restore = () => {
      Object.assign(state, { seasonNumber: stash.season, wifeCarSold: stash.wife,
        onboardStage: stash.stage, marketTab: stash.tab, cars: stash.cars, noticeQueue: [] });
      setView(stash.view); renderMainContent(true);
    };
    const bail = (m) => { restore(); return m; };
    // Season one: no lot, and Sell Cars only while her car is still there.
    setup(1, false, "sell");
    if (marketTabEarned("buy")) return bail("the lot is open in season one");
    if (marketTabLock("buy") === null) return bail("the lot is shut but reports itself open");
    if (!marketTabEarned("sellcar")) return bail("Sell Cars is gone while her car is still in the driveway");
    // And that tab is not a flipping business.
    const t1 = setup(1, false, "sellcar");
    if (/flip a build/i.test(t1)) return bail("season one still headlines it as a flipping business");
    if (/list a build for sale/i.test(t1)) return bail("the flip listings render in season one");
    if (!/other car in the driveway/i.test(t1)) return bail("her car lost its own framing");
    // Decision made: nothing legitimate left to sell this season.
    setup(1, true, "sell");
    if (marketTabEarned("sellcar")) return bail("Sell Cars lingers after her car is gone");
    // Season two opens both, and it is a business again.
    if (state.cars.length < 2)
      state.cars.push({ ...JSON.parse(JSON.stringify(state.cars[0])), id: 90210 });
    setup(2, true, "sell");
    if (!marketTabEarned("buy")) return bail("the lot never opened in season two");
    if (!marketTabEarned("sellcar")) return bail("Sell Cars never came back in season two");
    const t2 = setup(2, true, "sellcar");
    if (!/flip a build/i.test(t2) || !/list a build for sale/i.test(t2))
      return bail("season two did not restore the flipping business");
    // Safety valve outranks all of it: an empty garage always reaches the lot.
    const cars = state.cars; state.cars = []; state.seasonNumber = 1;
    const stranded = marketTabEarned("buy") && !marketTabLock("buy");
    state.cars = cars;
    if (!stranded) return bail("a player with an empty garage cannot reach the lot");
    restore();
    return true;
  });
  if (seasonOneOk !== true) fail("season one shape: " + seasonOneOk);
  pass("season one is one truck: lot shut, and only her car can change hands");

  // ── the two build decisions. The setup is worth four points either way on a
  // show's axis; the build direction is worth three against the season's taste
  // and commitBuildStyle refuses to run twice, so it is permanent. Neither was
  // ever introduced and both were button rows inside the Paint category. A
  // permanent choice reachable before anybody said it was permanent is a trap,
  // so the pickers do not exist until their beat has run. ──
  const tunesOk = await page.evaluate(() => {
    const stash = { known: JSON.parse(JSON.stringify(state.tunesKnown || {})),
                    hist: state.history, beat: state.lifeBeatWeek, view: state.view,
                    sub: state.shopSub, cat: state.shopCat, buck: !!(state.buck && state.buck.metOnce) };
    const car = currentCar();
    const car0 = { e: car.engine, t: car.transmission, b: car.brakes, s: car.steering,
                   setup: car.setup, style: car.buildStyle };
    const clr = () => {
      state.pendingScene = null; state.pendingEvent = null; state.eventQueue = [];
      state.noticeQueue = []; state.cutscene = null; state.pendingUnlock = null;
      state.lifeBeatWeek = -1; state.activeRestorations = []; clearTabArrival();
    };
    const restore = () => {
      state.tunesKnown = stash.known; state.history = stash.hist; state.lifeBeatWeek = stash.beat;
      Object.assign(car, { engine: car0.e, transmission: car0.t, brakes: car0.b,
        steering: car0.s, setup: car0.setup, buildStyle: car0.style });
      if (state.buck) state.buck.metOnce = stash.buck;
      clr(); setShopSub(stash.sub); state.shopCat = stash.cat; setView(stash.view); renderMainContent(true);
    };
    const bail = (m) => { restore(); return m; };
    const paint = () => {
      setView("workshop"); setShopSub("parts"); state.shopCat = "paint"; renderMainContent(true);
      return document.getElementById("appContent").innerText;
    };
    state.tunesKnown = { setup: false, style: false };
    car.setup = null; car.buildStyle = null;
    // Unexplained means unreachable, by the UI or by calling straight through.
    if (/pick a build direction/i.test(paint())) return bail("the direction picker shows before anyone raised it");
    commitBuildStyle("restomod");
    if (car.buildStyle) return bail("a permanent choice was committed before it was explained");
    setCarSetup("brawler");
    if (car.setup) return bail("a tune was set before it was explained");
    // Dale waits for a truck that actually runs.
    clr();
    car.engine = 10; car.transmission = 10; car.brakes = 10; car.steering = 10;
    if (maybeTriggerSetupIntro()) return bail("Dale offered a setup on a truck that does not run");
    clr();
    car.engine = 60; car.transmission = 55; car.brakes = 55; car.steering = 55;
    // Neither decision belongs in the crowded opening any more. Setup waits
    // for three shows, the permanent one waits for four, so both land in the
    // flat middle of the season instead of on top of week three.
    state.history = [{ show: "Coffee" }, { show: "Coffee" }];
    if (maybeTriggerSetupIntro()) return bail("the setup beat fired before three shows were in the book");
    clr();
    state.history = [{ show: "Coffee" }, { show: "Coffee" }, { show: "Local" }];
    if (!maybeTriggerSetupIntro()) return bail("the setup beat never fired on a roadworthy truck");
    if (!state.pendingScene || state.pendingScene.id !== "setup_intro") return bail("wrong scene for the setup");
    resolvePendingScene(0);
    if (!tuneKnown("setup")) return bail("the setup beat did not open the setup");
    if (!(state.mechanic && state.mechanic.metOnce))
      return bail("the setup beat did not introduce Dale for a DIY-only player");
    setCarSetup("brawler");
    if (car.setup !== "brawler") return bail("a tune still cannot be set after the beat");
    if (/pick a build direction/i.test(paint())) return bail("the setup beat leaked the direction picker too");
    // Buck raises the other one, and only after a show.
    clr(); state.buck.metOnce = false; state.history = [];
    if (maybeTriggerStyleIntro()) return bail("the direction beat fired before Buck was met");
    clr(); state.buck.metOnce = true;
    state.history = [{ tier: "Cars & Coffee", place: 3, show: "Coffee" }];
    if (maybeTriggerStyleIntro()) return bail("the permanent choice was raised after a single show");
    clr();
    state.history = [{ show: "a" }, { show: "b" }, { show: "c" }, { show: "d" }];
    if (!maybeTriggerStyleIntro()) return bail("the direction beat never fired");
    if (!state.pendingScene || state.pendingScene.id !== "style_intro") return bail("wrong scene for the direction");
    resolvePendingScene(0);
    if (!/pick a build direction/i.test(paint())) return bail("the picker never appeared");
    commitBuildStyle("restomod");
    if (car.buildStyle !== "restomod") return bail("the direction would not commit after the beat");
    commitBuildStyle("stock");
    if (car.buildStyle !== "restomod") return bail("the direction stopped being permanent");
    clr();
    if (maybeTriggerSetupIntro() || maybeTriggerStyleIntro()) return bail("a build-decision beat fired twice");
    restore();
    return true;
  });
  if (tunesOk !== true) fail("build decisions: " + tunesOk);
  pass("setup and build direction are each explained before they can be chosen");

  // ── the broke week. A season sim showed the player under $400 for three
  // weeks out of every four, with the yard (fifteen dollars, forty percent
  // off, costs a Saturday) sitting unmentioned since week two while the only
  // lit button was a Cars & Coffee that pays nothing and eats the week. So
  // the friend brings it up again, twice at most, and never once you have
  // actually made the drive. ──
  const yardOk = await page.evaluate(() => {
    const stash = { trips: JSON.parse(JSON.stringify(state.tripsKnown || {})),
                    taken: state.scavengeTripsTaken, nudges: state.yardNudges,
                    nWeek: state.yardNudgeWeek, hist: state.history, money: state.money,
                    beat: state.lifeBeatWeek, week: state.week, tools: state.ownedTools.slice(),
                    view: state.view, lock: state.postShowWeekLocked, result: state.result,
                    lean: state.leanStreak };
    const car = currentCar();
    const car0 = JSON.parse(JSON.stringify({ e: car.engine, t: car.transmission, b: car.brakes,
                                             s: car.steering, ip: car.installedParts }));
    const clr = () => {
      state.pendingScene = null; state.pendingEvent = null; state.eventQueue = [];
      state.noticeQueue = []; state.cutscene = null; state.pendingUnlock = null;
      state.lifeBeatWeek = -1; state.activeRestorations = []; clearTabArrival();
    };
    const restore = () => {
      state.tripsKnown = stash.trips; state.scavengeTripsTaken = stash.taken;
      state.yardNudges = stash.nudges; state.yardNudgeWeek = stash.nWeek;
      state.history = stash.hist; state.money = stash.money; state.lifeBeatWeek = stash.beat;
      state.week = stash.week; state.ownedTools = stash.tools;
      Object.assign(car, { engine: car0.e, transmission: car0.t, brakes: car0.b,
                           steering: car0.s, installedParts: car0.ip });
      state.result = stash.result; state.postShowWeekLocked = stash.lock;
      state.leanStreak = stash.lean;
      clr(); setView(stash.view); renderMainContent(true);
    };
    const bail = (m) => { restore(); return m; };
    const setBroke = () => {
      // A real list of real jobs, and gas money to do none of them with.
      car.installedParts = [];
      CATS.forEach((c) => { if (typeof car[c] === "number") car[c] = 30; });
      state.ownedTools = TOOLS_LIST.map((t) => t.id);
      state.money = 40;
      state.leanStreak = 0;
    };
    state.tripsKnown = { yard: true, swap: false };
    state.scavengeTripsTaken = 0; state.yardNudges = 0; state.yardNudgeWeek = null;
    state.week = 9;
    state.history = [{ show: "a" }, { show: "b" }, { show: "c" }];
    setBroke(); clr();
    if (scrapingByNow()) return bail("one lean week already counted as scraping");
    state.leanStreak = 2;
    if (!scrapingByNow()) return bail("a player with $40 and a full jobs list did not read as scraping");
    if (!maybeTriggerYardNudge()) return bail("nobody mentioned the yard on a broke week");
    if (!state.pendingScene || state.pendingScene.id !== "yard_nudge_1") return bail("wrong scene for the broke week");
    resolvePendingScene(0);
    // Twice at most, and not two weeks running.
    clr(); state.week = 11; state.leanStreak = 2;
    if (maybeTriggerYardNudge()) return bail("he brought it up again two weeks later");
    clr(); state.week = 16; state.leanStreak = 2;
    if (!maybeTriggerYardNudge()) return bail("he never brought it up a second time");
    resolvePendingScene(0);
    clr(); state.week = 22; state.leanStreak = 2;
    if (maybeTriggerYardNudge()) return bail("he brought it up a third time");
    // Money in hand is not a broke week.
    clr(); state.yardNudges = 0; state.yardNudgeWeek = null; state.money = 9000;
    noteLeanWeek();
    if (scrapingByNow()) return bail("a player with $9,000 read as scraping");
    if (maybeTriggerYardNudge()) return bail("he pitched the yard to a player who could pay retail");
    // And once you have made the drive, he lets it go for good.
    clr(); setBroke(); state.leanStreak = 2; state.scavengeTripsTaken = 1;
    if (maybeTriggerYardNudge()) return bail("he still pitched the yard to somebody who had been");
    // Nothing left to build is not a broke week either.
    clr(); state.scavengeTripsTaken = 0; state.leanStreak = 2;
    car.installedParts = PARTS.map((p) => p.id);
    if (scrapingByNow()) return bail("a finished truck read as work worth driving for");
    // The whole chain has to survive a show week, which is the week the
    // random-event roll sits out and every one of these beats used to die in.
    clr(); setBroke(); state.leanStreak = 2; state.week = 9;
    state.yardNudges = 0; state.yardNudgeWeek = null;
    state.view = "result"; state.result = { place: 3 };
    if (beatWindowOpen()) return bail("the beat window opened on top of a result screen");
    leaveResultScreen();
    if (state.result) return bail("leaving the result screen did not clear it");
    if (state.postShowWeekLocked) return bail("leaving the result screen did not clear the show lock");
    if (!state.pendingScene && !(state.eventQueue || []).length)
      return bail("a show week swallowed the beat it was owed");
    restore();
    return true;
  });
  if (yardOk !== true) fail("broke-week yard reminder: " + yardOk);
  pass("the yard gets raised again on a broke week, twice at most, never after a trip");

  // ── the mechanic is doing the work. While the shop has the truck the player
  // cannot be the one who stripped the bolt, lost the 10mm, or fixed one thing
  // and broke two more, and the car is not under their tarp for the storm
  // either. The scene and the neighbours carry on regardless. ──
  const shopEventsOk = await page.evaluate(() => {
    const stash = JSON.parse(JSON.stringify(state.activeRestorations || []));
    const money0 = state.money;
    if (carAtShop()) return "the car is already at the shop before this check";
    const cultureAll = CAR_CULTURE_EVENTS.length, weeklyAll = WEEKLY_EVENTS.length;
    if (CAR_CULTURE_EVENTS.filter(atHomeEventOk).length !== cultureAll)
      return "beats were filtered while the car was home";
    if (WEEKLY_EVENTS.filter(atHomeEventOk).length !== weeklyAll)
      return "weekly beats were filtered while the car was home";
    // send it out
    state.money = 20000;
    const car = currentCar();
    const part = PARTS.find((p) => !car.installedParts.includes(p.id));
    installPart(part.id, "shop", false);
    if (!carAtShop()) return "sending work to the shop did not register";
    const culture = CAR_CULTURE_EVENTS.filter(atHomeEventOk);
    const weekly = WEEKLY_EVENTS.filter(atHomeEventOk);
    if (culture.some((e) => e.atHome) || weekly.some((e) => e.atHome))
      return "a hands-on beat survived the filter";
    if (!culture.length || !weekly.length)
      return "the shop week has no beats left at all, which empties the calendar";
    // and nothing hands-on can be drawn
    for (let i = 0; i < 200; i++) {
      const a = culture[Math.floor(Math.random() * culture.length)];
      const b = weekly[Math.floor(Math.random() * weekly.length)];
      if ((a && a.atHome) || (b && b.atHome)) return "a hands-on beat was drawn at the shop";
    }
    // work finishes, the garage is the player's again
    state.activeRestorations.forEach((t) => { t.finishTime = Date.now() - 1; });
    resolveCompletedRestorations(false);
    if (carAtShop()) return "the car never came home";
    if (CAR_CULTURE_EVENTS.filter(atHomeEventOk).length !== cultureAll)
      return "beats did not come back once the work finished";
    state.activeRestorations = stash; state.money = money0;
    state.noticeQueue = []; state.pendingScene = null; state.pendingEvent = null;
    return { blocked: cultureAll - culture.length, kept: culture.length };
  });
  if (typeof shopEventsOk === "string") fail("shop-week events: " + shopEventsOk);
  pass(`shop weeks: ${shopEventsOk.blocked} hands-on beats sit out, ${shopEventsOk.kept} scene beats carry on`);

  // ── the show flyer. A cleared check must not print its tick twice, and the
  // payout has to put the win first instead of five identical chips. ──
  const flyerOk = await page.evaluate(() => {
    const stash = { stage: state.onboardStage, view: state.view, hist: state.history,
                    money: state.money, fuel: state.fuel, act: state.activeRestorations };
    state.onboardStage = 3; state.pendingUnlock = null; clearTabArrival();
    state.noticeQueue = []; state.money = 5000; state.fuel = 50; state.activeRestorations = [];
    const c = currentCar();
    const car0 = { e: c.engine, t: c.transmission, b: c.brakes, s: c.steering };
    c.engine = 70; c.transmission = 65; c.brakes = 65; c.steering = 65;
    state.history = [{ tier: "Cars & Coffee", place: 2, show: "Coffee" }];
    setView("shows"); render("full");
    const card = document.querySelector(".panel.show-card");
    const restore = () => {
      Object.assign(c, { engine: car0.e, transmission: car0.t, brakes: car0.b, steering: car0.s });
      Object.assign(state, { onboardStage: stash.stage, history: stash.hist, money: stash.money,
        fuel: stash.fuel, activeRestorations: stash.act, noticeQueue: [] });
      setView(stash.view); render("full");
    };
    if (!card) { restore(); return "no show card rendered"; }
    const txt = card.innerText;
    const res = (() => {
      if (/✓[^\n]*✓/.test(txt)) return "a cleared check is printing its tick twice";
      if (!card.querySelector(".show-status")) return "the flyer has no status badge";
      const places = card.querySelectorAll(".payout-place");
      if (places.length && !card.querySelector(".payout-place.win"))
        return "the payout does not weight first place";
      if (card.querySelector(".show-prize")) return "the old flat prize chips are still rendering";
      return true;
    })();
    restore();
    return res;
  });
  if (flyerOk !== true) fail("show flyer: " + flyerOk);
  pass("show flyer: weighted payout, status badge, no doubled ticks");

  // ── the two notes on the corkboard. They were 11px of mid-tan on tan cork
  // at 85% opacity, effectively invisible. They are paper slips now, and this
  // holds the ink to a real contrast ratio against the stock rather than
  // trusting that it still looks fine. ──
  const noteOk = await page.evaluate(() => {
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const parse = (c) => c.match(/\d+/g).slice(0, 3).map(Number);
    // Stand the board up ourselves: show season open, no shows run yet, so
    // Local is still locked (next-rung note) and events remain gated (lock note).
    const stash = { stage: state.onboardStage, hist: state.history, view: state.view,
                    money: state.money, fuel: state.fuel, act: state.activeRestorations };
    const c = currentCar();
    const car0 = { e: c.engine, t: c.transmission, b: c.brakes, s: c.steering };
    state.onboardStage = 3; state.pendingUnlock = null; clearTabArrival();
    state.noticeQueue = []; state.money = 5000; state.fuel = 50; state.activeRestorations = [];
    c.engine = 70; c.transmission = 65; c.brakes = 65; c.steering = 65;
    state.history = [];
    setView("shows"); render("full");
    const restore = () => {
      Object.assign(c, { engine: car0.e, transmission: car0.t, brakes: car0.b, steering: car0.s });
      Object.assign(state, { onboardStage: stash.stage, history: stash.hist, money: stash.money,
        fuel: stash.fuel, activeRestorations: stash.act, noticeQueue: [] });
      setView(stash.view); render("full");
    };
    const notes = [...document.querySelectorAll(".board-note")];
    if (!notes.length) { restore(); return "no board notes rendered on the Compete board"; }
    for (const n of notes) {
      const cs = getComputedStyle(n);
      const ink = parse(cs.color);
      // the stock is a gradient, so measure against its darker stop
      const paper = [227, 213, 184];
      const L1 = lum(ink), L2 = lum(paper);
      const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (r < 4.5) { restore(); return `note ink is ${r.toFixed(1)}:1 against the paper, needs 4.5:1`; }
      if (parseFloat(cs.fontSize) < 12) { restore(); return `note is ${cs.fontSize}, too small to sit on the cork`; }
      if (parseFloat(cs.opacity) < 1) { restore(); return "a note is still faded out on top of everything else"; }
    }
    const count = notes.length;
    restore();
    return count;
  });
  if (typeof noteOk !== "number") fail("corkboard notes: " + noteOk);
  pass(`corkboard notes readable: ${noteOk} slips, ink on paper rather than tan on tan`);

  // ── the named grid fills in over a season. Three of the four rivals run
  // Local, so an uncapped field put every face in the game plus Buck on the
  // lawn at the player's debut. ──
  const gridOk = await page.evaluate(() => {
    const cap = (runs) => (runs >= 9 ? 3 : runs >= 5 ? 2 : runs >= 2 ? 1 : 0);
    if (cap(0) !== 0) return "named rivals turn up at the player's first show";
    if (cap(1) !== 0) return "named rivals turn up at the second show";
    if (cap(2) < 1 || cap(2) > 1) return "the grid does not fill in one face at a time";
    if (cap(20) > 3) return "the cap does not hold at the top";
    const local = RIVALS.filter((r) => (r.showsAt || []).includes("Local")).length;
    if (local <= cap(0)) return "the cap is not actually below the roster size at a debut";
    return true;
  });
  if (gridOk !== true) fail("rival grid: " + gridOk);
  pass("rival grid fills in a face at a time, debut is Buck plus strangers");

  // ── a show queued behind a story beat waits for the beat to be read. The
  // glove-box choice used to start the show on a 60ms timer, so its outcome
  // landed in the middle of the arrival cinematic and the standings. ──
  const orderOk = await page.evaluate(() => {
    if (typeof drainPendingShowEntry !== "function") return "the deferral is gone";
    const stash = { pending: state.pendingShowEntry, q: state.noticeQueue,
                    loading: state.showLoading };
    // A card is still unread, so the queued show must stay put.
    state.pendingShowEntry = 1;
    state.noticeQueue = [{ text: "QA beat", tone: "good", emoji: "🎉" }];
    drainPendingShowEntry();
    if (state.pendingShowEntry !== 1)
      return "the show was released while a card was still unread";
    // Card read. Stub the entry point so releasing it cannot actually start a
    // show here (parking showLoading would block modalBusy, which is the very
    // thing under test), then confirm the deferral let go.
    state.noticeQueue = [];
    const realBegin = window.beginShowEntry;
    let released = null;
    window.beginShowEntry = (id) => { released = id; };
    drainPendingShowEntry();
    window.beginShowEntry = realBegin;
    if (released !== 1) return "the show was never released once the beat finished";
    if (state.pendingShowEntry !== null) return "the queued show was not cleared after release";
    state.pendingShowEntry = stash.pending; state.noticeQueue = stash.q || [];
    return true;
  });
  if (orderOk !== true) fail("beat/show ordering: " + orderOk);
  pass("a show queued behind a beat waits until the beat has been read");

  // ── pre-season ramp: season 1 opens straight into the competitive
  // calendar (no pre-season), but season 2+ opens in the 4-week off-season
  // with shows locked and the side-work gig board live and paying. Drive the
  // pre-season on manually to verify the mechanic in isolation. ──
  const preOk = await page.evaluate(() => {
    if (inPreSeason()) return "season 1 should not start in pre-season";
    enterPreSeason();
    if (!inPreSeason() || state.preWeek < 1) return "enterPreSeason did not open pre-season";
    if (tabUnlocked("shows")) return "Compete not locked during pre-season";
    if (!(state.gigs || []).length) return "gig board empty in pre-season";
    const before = state.money;
    const g = state.gigs.find((x) => !x.done);
    doGig(g.id);
    if (state.money <= before) return "side job did not pay";
    // reset back to the competitive season for the rest of the suite
    state.preWeek = 0; state.week = 1; state.gigs = [];
    return true;
  });
  if (preOk !== true) fail("pre-season: " + preOk);
  pass("pre-season ramp (season 2+): shows locked, side-work board pays");

  // ── first installs → Social unlock ──
  await page.evaluate(() => {
    state.noticeQueue = [];
    state.money = 20000;
    const car = currentCar();
    for (let i = 0; i < 3; i++) {
      const part = PARTS.find((x) => !car.installedParts.includes(x.id) && state.money > partCost(x, "shop"));
      installPart(part.id, "shop", false);
      const t = state.activeRestorations.find((x) => x.carId === car.id && !x.completed);
      t.finishTime = Date.now() - 1;
      resolveCompletedRestorations(false);
    }
    render("full");
  });
  await page.waitForTimeout(300);
  let unlock = await page.evaluate(() => state.pendingUnlock && state.pendingUnlock.tab);
  if (unlock !== "career") fail("Social did not unlock after 3 installs (got " + unlock + ")");
  // The nav bar grows a tab at a time: a tab the player has not earned gets
  // no slot at all, and the slot for the one being unlocked stays empty until
  // the icon has flown into it. Both must hold while the cut scene is up.
  const barDuringUnlock = await page.evaluate(() =>
    [...document.querySelectorAll("#mainTabs .tab")].map((t) => t.dataset.tab || "locked"),
  );
  if (barDuringUnlock.length !== 1 || barDuringUnlock[0] !== "workshop")
    fail("nav bar during the Social unlock should be Build alone, got " + JSON.stringify(barDuringUnlock));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  pass("3 installs → Social unlock");

  // ── the handoff: the unlock icon flies from the cut scene to the nav bar
  // and the tab lands there wearing a "not visited yet" dot, instead of the
  // player being teleported into the tab. Nothing else may open mid-flight.
  const midFlight = await page.evaluate(() => ({
    flying: !!document.querySelector(".unlock-flier"),
    modalEmpty: !document.getElementById("modalRoot").innerHTML,
    view: state.view,
  }));
  if (!midFlight.flying) fail("no unlock icon in flight after the cut scene closed");
  if (!midFlight.modalEmpty) fail("a modal opened on top of the unlock flight");
  if (midFlight.view !== "workshop") fail("the handoff navigated away from the garage (got " + midFlight.view + ")");
  await page.waitForTimeout(1400);
  const landed = await page.evaluate(() => ({
    tabs: [...document.querySelectorAll("#mainTabs .tab")].map((t) => t.dataset.tab),
    dot: !!document.querySelector('.tab[data-tab="career"] .tab-new-dot'),
    fliers: document.querySelectorAll(".unlock-flier").length,
    tabNew: state.tabNew,
    view: state.view,
  }));
  if (!landed.tabs.includes("career")) fail("Social tab never landed on the nav bar");
  if (!landed.dot || landed.tabNew !== "career") fail("landed tab is missing its new-visit dot");
  if (landed.fliers) fail("flight icon was left on the page");
  if (landed.view !== "workshop") fail("player did not stay in the garage after the handoff");
  // Walking into the tab once puts the dot out.
  await page.evaluate(() => setView("career"));
  await page.waitForTimeout(250);
  const visited = await page.evaluate(() => ({ tabNew: state.tabNew, dot: !!document.querySelector(".tab-new-dot") }));
  if (visited.tabNew || visited.dot) fail("new-visit dot survived the first visit");
  await page.evaluate(() => setView("workshop"));
  await page.waitForTimeout(250);
  pass("unlock handoff: icon flies to its tab, dot clears on first visit");

  // ── one thing at a time: an achievement banner that is already up when a
  // beat takes the screen steps aside and replays in full afterwards, rather
  // than burning its five seconds behind a cut scene. ──
  await page.evaluate(() => {
    // Clear whatever the unlock beat left pending so the banner has the
    // screen to itself for this check.
    state.pendingScene = null; state.pendingEvent = null; state.noticeQueue = []; state.eventQueue = [];
    state.cutscene = null; state.pendingUnlock = null; clearTabArrival(); render("full");
    achBannerQueue.length = 0; achievementBanner({ emoji: "🏆", name: "QA Beat", desc: "test" });
  });
  await page.waitForTimeout(400);
  const bannerSeen = () => page.evaluate(() => !!document.querySelector("#achBannerRoot .ach-banner"));
  if (!(await bannerSeen())) fail("achievement banner never showed");
  await page.evaluate(() => { state.pendingScene = { id: "qa", title: "QA", emoji: "🔧", text: "beat", choices: [{ label: "ok" }] }; render("full"); });
  await page.waitForTimeout(400);
  if (await bannerSeen()) fail("achievement banner stayed up on top of a beat");
  if ((await page.evaluate(() => achBannerQueue.length)) !== 1) fail("suspended banner was dropped instead of re-queued");
  await page.evaluate(() => { state.pendingScene = null; render("full"); });
  await page.waitForTimeout(1500);
  if (!(await bannerSeen())) fail("suspended banner never replayed after the beat cleared");
  await page.evaluate(() => { achBannerQueue.length = 0; clearAchBannerTimers(); achBannerShowing = false; const r = document.getElementById("achBannerRoot"); if (r) r.innerHTML = ""; });
  pass("achievement banners step aside for a beat, then replay");

  // ── the hide-don't-lock rule, one level down. The nav bar drops tabs the
  // player has not earned; the same has to hold for the pill strips inside
  // the tabs, or the first visit to Marketplace and Compete is three dead
  // buttons apiece. Temporarily-shut things (one car in the garage) still
  // keep their pill and say why. ──
  // These three checks drive the onboarding stage around to inspect screens
  // the player has not reached yet, so the suite's own progression is stashed
  // here and put back before the run continues.
  const onboardStash = await page.evaluate(() => ({
    stage: state.onboardStage, view: state.view, sub: state.shopSub,
    cat: state.shopCat, visited: { ...(state.tabsVisited || {}) },
  }));
  const pillsOk = await page.evaluate(() => {
    const stash = state.onboardStage;
    // Road Trip is no longer on the stage ladder at all: a friend has to point
    // the player at the yard first, which is covered by its own check below.
    const tripStash = JSON.parse(JSON.stringify(state.tripsKnown || {}));
    state.tripsKnown = { yard: false, swap: false };
    state.onboardStage = 2;
    if (marketTabEarned("trip"))
      return "Road Trip is earned before anyone pointed the player at the yard";
    if (!marketTabEarned("sell")) return "Sell Tools & Parts must always be open";
    state.onboardStage = 3;
    if (marketTabEarned("trip"))
      return "show season alone opened the Road Trip board";
    // Buy Cars and Sell Cars no longer ride the onboarding stage at all: the
    // lot is a season-two graduation and Sell Cars is her car in season one.
    // The season-one check below owns both; here we only assert that reaching
    // show season is not by itself what opens them.
    const seasonStash = state.seasonNumber;
    state.seasonNumber = 1;
    if (marketTabEarned("buy"))
      return "show season alone opened the lot";
    state.seasonNumber = seasonStash;
    state.tripsKnown = tripStash;
    // Empty garage keeps the lot reachable or the player is stranded.
    const cars = state.cars;
    state.cars = []; state.onboardStage = 0;
    if (!marketTabEarned("buy")) return "the lot must stay reachable with an empty garage";
    state.cars = cars; state.onboardStage = stash;
    return true;
  });
  if (pillsOk !== true) fail("marketplace pills: " + pillsOk);

  const shopUiOk = await page.evaluate(() => {
    // Stage first, then navigate: setView bounces a tab the stage has not
    // opened yet, which would leave us measuring the wrong screen.
    state.onboardStage = 2; setView("dealership"); render("full");
    // Only lock-shaped controls are in scope here. A button disabled for a
    // live reason (cannot afford it right now) is ordinary UI, not a wall.
    const dead = [...document.querySelectorAll("#appContent button")]
      .filter((b) => b.classList.contains("pill-locked") || /🔒/.test(b.textContent));
    if (dead.length)
      return "Marketplace still shows " + dead.length + " locked control(s) pre-show: " +
        dead.map((b) => b.textContent.replace(/\s+/g, " ").trim().slice(0, 30)).join(", ");
    state.onboardStage = 3; setView("shows"); render("full");
    const deadTiers = [...document.querySelectorAll("#appContent .cat-pill")]
      .filter((b) => b.classList.contains("pill-locked") || /🔒/.test(b.textContent));
    if (deadTiers.length) return "Compete still shows " + deadTiers.length + " locked tier pill(s)";
    // The ladder is still communicated, just as one line instead of buttons.
    if (!/Next rung/.test(document.getElementById("appContent").innerText))
      return "the next-rung line went missing with the locked tier pills";
    // Workspace ladder: current + next only, the rest named in a line.
    setView("workshop"); setShopSub("workspace"); render("full");
    const lockedRows = [...document.querySelectorAll("#appContent .dense-row")]
      .filter((r) => /🔒/.test(r.textContent));
    if (lockedRows.length) return "workspace ladder still renders " + lockedRows.length + " locked row(s)";
    if (!/Further up the ladder/.test(document.getElementById("appContent").innerText))
      return "workspace ladder lost the line naming what is above";
    return true;
  });
  if (shopUiOk !== true) fail("locked pills: " + shopUiOk);
  pass("hide-don't-lock holds inside Marketplace, Compete and the workspace ladder");

  // ── a blocked DIY button names the tool it wants instead of showing a
  // greyed price with no reason. ──
  const diyOk = await page.evaluate(() => {
    setView("workshop"); setShopSub("parts");
    const car = currentCar();
    const p = PARTS.find((x) => (x.tools || []).some((t) => !state.ownedTools.includes(t)) && x.category === state.shopCat && !car.installedParts.includes(x.id));
    if (!p) { const any = PARTS.find((x) => (x.tools || []).some((t) => !state.ownedTools.includes(t))); if (!any) return true; state.shopCat = any.category; }
    render("full");
    const txt = document.getElementById("appContent").innerText;
    if (!/🔒 Needs /.test(txt)) return "no blocked DIY button names its missing tool";
    return true;
  });
  if (diyOk !== true) fail("diy reason: " + diyOk);
  pass("blocked DIY buttons name the tool they need");

  // ── offers do not ambush a screen the player has never opened. ──
  const quietOk = await page.evaluate(() => {
    state.tabsVisited = {}; state.pendingMarketplaceOffer = null; state.pendingCarOffer = null;
    state.eventQueue = []; state.pendingScene = null; state.noticeQueue = [];
    state.onboardStage = 3; setView("workshop"); setView("shows");
    if (!onFirstVisitScreen()) return "first visit did not open the quiet window";
    queueMarketplaceOffer({ itemId: "qa", buyerType: "hold", offer: 27 });
    if (state.pendingMarketplaceOffer) return "an offer popped on a first visit";
    if (!(state.eventQueue || []).some((e) => e.kind === "marketplace"))
      return "the deferred offer was dropped instead of queued";
    // Second visit is not a first visit, so it lands normally. Mark the
    // other tab seen too, or stepping through it opens a window of its own.
    firstVisitQuietUntil = 0;
    state.tabsVisited.workshop = true;
    setView("workshop"); setView("shows");
    if (onFirstVisitScreen()) return "a revisit re-opened the quiet window";
    processEventQueue();
    if (!state.pendingMarketplaceOffer) return "the held offer never landed after the quiet window";
    state.pendingMarketplaceOffer = null; state.eventQueue = [];
    return true;
  });
  if (quietOk !== true) fail("first-visit quiet: " + quietOk);
  pass("offer popups wait out a first visit, then land");

  // Put the player back where the suite left them.
  await page.evaluate((st) => {
    state.onboardStage = st.stage; state.shopSub = st.sub; state.shopCat = st.cat;
    state.tabsVisited = st.visited; firstVisitQuietUntil = 0;
    state.pendingMarketplaceOffer = null; state.pendingCarOffer = null;
    state.eventQueue = []; state.noticeQueue = []; state.pendingUnlock = null;
    clearTabArrival();
    setView(st.view); render("full");
  }, onboardStash);
  await page.waitForTimeout(400);

  // ── roadworthy → Marketplace unlock ──
  await page.evaluate(() => {
    const car = currentCar();
    car.engine = 50; car.transmission = 40; car.brakes = 40; car.body = 45;
    // Steering is a roadworthy gate as of the v0.34 sim expansion.
    car.steering = 40;
    state.noticeQueue = []; render("full");
  });
  await page.waitForTimeout(300);
  unlock = await page.evaluate(() => state.pendingUnlock && state.pendingUnlock.tab);
  if (unlock !== "dealership") fail("Marketplace did not unlock at roadworthy (got " + unlock + ")");
  await page.keyboard.press("Enter");
  // The handoff flight holds the modal layer shut while it plays, so give it
  // time to land before driving the next step.
  await page.waitForTimeout(1500);
  if (!(await page.evaluate(() => [...document.querySelectorAll("#mainTabs .tab")].some((t) => t.dataset.tab === "dealership"))))
    fail("Marketplace tab never landed on the nav bar");
  pass("roadworthy → Marketplace unlock");

  // ── sim expansion (v0.34): the 4 new systems are real judged stats.
  // Cooling/fuel/exhaust/steering must be registered cats, each fillable to
  // 100 from its own parts, steering must gate roadworthiness, judging axes
  // must weigh them, and a pre-split car must get them seeded on migration. ──
  const simOk = await page.evaluate(() => {
    const need = ["cooling", "fuel", "exhaust", "steering"];
    if (!need.every((c) => CATS.includes(c) && CAT_LABELS[c] && CAT_ICONS[c]))
      return "a new cat is missing from CATS/labels/icons";
    if (CATS.length !== 16) return "CATS length is " + CATS.length + ", expected 16";
    for (const c of need) {
      const sum = PARTS.filter((x) => x.category === c).reduce((a, x) => a + x.imp, 0);
      if (sum < 80) return c + " parts only sum +" + sum + " (< 80, can't reach 100)";
    }
    // steering gates roadworthiness
    const car = currentCar();
    car.engine = 40; car.transmission = 40; car.brakes = 40; car.steering = 10;
    if (roadworthy(car)) return "roadworthy with steering below the gate";
    car.steering = 30;
    if (!roadworthy(car)) return "not roadworthy after steering cleared the gate";
    // judging weighs the new stats
    const weighed = Object.values(JUDGING_AXES).some((a) =>
      need.some((c) => a.weights && a.weights[c] > 0),
    );
    if (!weighed) return "no judging axis weighs any new system";
    // migration seeds a pre-split car from its mechanical condition
    const old = { engine: 50, transmission: 40, brakes: 30, suspension: 20, electrical: 30 };
    ensureCarSystems(old);
    if (!need.every((c) => typeof old[c] === "number" && old[c] > 0))
      return "ensureCarSystems did not seed a pre-split car";
    return true;
  });
  if (simOk !== true) fail("sim expansion: " + simOk);
  pass("sim expansion: 4 new judged systems, steering gate, seeded on migration");

  // ── Phase 3 extras: lifestyle purchases that pay back in followers + resale
  // and NEVER touch overall / roadworthiness / judging. ──
  const extrasOk = await page.evaluate(() => {
    if (!Array.isArray(EXTRAS) || EXTRAS.length < 15) return "EXTRAS list missing or too small";
    const car = currentCar();
    car.extras = [];
    const ov0 = getOverall(car), rw0 = roadworthy(car), resale0 = carResaleBaseline(car);
    const fol0 = state.followers, money0 = state.money;
    state.money = 99999;
    const e = EXTRAS[0];
    buyExtra(e.id);
    if (!car.extras.includes(e.id)) return "buyExtra did not add the extra";
    if (getOverall(car) !== ov0) return "an extra changed overall (should not)";
    if (roadworthy(car) !== rw0) return "an extra changed roadworthiness (should not)";
    if (carResaleBaseline(car) <= resale0) return "extra did not raise resale value";
    if (e.followers > 0 && state.followers <= fol0) return "extra did not add followers";
    buyExtra(e.id); // second buy must be rejected
    if (car.extras.filter((x) => x === e.id).length !== 1) return "extra bought twice";
    state.money = money0; car.extras = [];
    return true;
  });
  if (extrasOk !== true) fail("extras: " + extrasOk);
  pass("extras: followers + resale, no effect on score/roadworthy");

  // ── buyer vignettes on selling a build (mirror of the seller beats), one per
  // overall tier, and milestone-tool beats (first welder/hoist/booth). ──
  const beatsOk = await page.evaluate(() => {
    const clr = () => { state.pendingScene = null; state.pendingEvent = null; state.weekRecap = null; state.pendingRecap = null; state.noticeQueue = []; state.eventQueue = []; state.showLoading = false; state.showStage = null; state.cutscene = null; state.pendingUnlock = null; state.pendingCarOffer = null; clearTabArrival(); };
    state.firstCarSaleShown = true; // exercise the recurring buyer path, not the one-time first-sale beat
    const tiers = { flip: 40, mid: 68, show: 92 };
    for (const [tier, ov] of Object.entries(tiers)) {
      const car = { id: 90000 + ov, year: 1970, make: "QA", model: "Rig", installedParts: [] };
      CATS.forEach((c) => (car[c] = ov));
      state.cars.push(car);
      clr();
      completeCarSale(car.id, 12345, "@QABuyer");
      if (!state.pendingScene || !String(state.pendingScene.id).startsWith("buyer_"))
        return "no buyer vignette on " + tier + " sale";
      if (state.pendingScene.art !== "scene-first-car-sale") return tier + " buyer lost its art";
      if (!/12,?345/.test(state.pendingScene.text)) return tier + " buyer text missing the sale amount";
      resolvePendingScene(0);
    }
    clr();
    // milestone tool beat: first welder fires once, then never again
    state.money = 9999999; state.workshopLevel = "warehouse"; state.toolStorageLevel = "snapon72";
    state.ownedTools = state.ownedTools.filter((t) => t !== "t5"); state.toolBeatWelder = false;
    buyTool("t5");
    if (!state.pendingScene || state.pendingScene.id !== "toolBeatWelder") return "first welder fired no beat";
    resolvePendingScene(0);
    state.ownedTools = state.ownedTools.filter((t) => t !== "t5"); clr();
    buyTool("t5");
    if (state.pendingScene) return "milestone tool beat re-fired on a second buy";
    clr();
    return true;
  });
  if (beatsOk !== true) fail("sell/tool beats: " + beatsOk);
  pass("buyer vignettes (all tiers) + milestone-tool beats fire once");

  // ── buying a car plays a seller vignette (a story beat over the haul-home
  // art), one per price tier, and it resolves cleanly. ──
  const sellerOk = await page.evaluate(() => {
    const tiers = ["rough", "mid", "clean"];
    if (!tiers.every((t) => Array.isArray(SELLER_SCENES[t]) && SELLER_SCENES[t].length))
      return "a seller tier is empty";
    // each price tier must have at least one buyable car so no vignette is dead
    const priceTier = (p) => (p < 7000 ? "rough" : p < 10500 ? "mid" : "clean");
    const covered = new Set(BUYABLE_CARS.map((c) => priceTier(c.price)));
    if (!tiers.every((t) => covered.has(t))) return "a seller tier has no buyable cars";
    state.money = 999999;
    const c = BUYABLE_CARS.find((x) => !state.cars.find((y) => y.id === x.id));
    if (!c) return "no car to buy";
    // Snapshot so this check leaves the garage exactly as it found it (later
    // checks depend on the current car staying roadworthy).
    const prevCarId = state.carId;
    // Clear any blocking surfaces so the vignette lands in pendingScene rather
    // than the deferred event queue (queueScene routes on modalBusy()).
    state.pendingScene = null; state.pendingEvent = null; state.weekRecap = null;
    state.pendingRecap = null; state.noticeQueue = []; state.eventQueue = [];
    state.showLoading = false; state.showStage = null; state.showStore = false;
    state.cutscene = null; state.pendingUnlock = null;
    buyCar(c.id);
    const okScene = state.pendingScene && String(state.pendingScene.id).startsWith("seller_");
    const okArt = state.pendingScene && state.pendingScene.art === "loading-haul-home";
    if (okScene) resolvePendingScene(0);
    // Roll the purchase back so the rest of the suite runs on the original car.
    state.cars = state.cars.filter((x) => x.id !== c.id);
    state.carId = prevCarId;
    state.pendingScene = null; state.noticeQueue = []; state.eventQueue = [];
    if (!okScene) return "buying a car did not queue a seller vignette";
    if (!okArt) return "seller vignette lost its backdrop art";
    return true;
  });
  if (sellerOk !== true) fail("seller vignettes: " + sellerOk);
  pass("seller vignettes: story beat on purchase, all tiers covered");

  // ── list a part, let the week roll → Compete unlock ──
  // (Compete opens a week after the first listing, or on a first sale — but
  // never during the pre-season, so drop into the competitive calendar first.)
  await page.evaluate(() => { state.preWeek = 0; state.week = 1; state.noticeQueue = []; render("full"); });
  await page.evaluate(() => {
    if (!(state.partsInventory || []).length)
      state.partsInventory = [{ id: "qa1", name: "Take-off Carb", baselineValue: 60, askingPrice: 70 }];
    state.partsInventory[0].listed = true;
    state.noticeQueue = []; render("full");
  });
  const early = await page.evaluate(() => state.pendingUnlock && state.pendingUnlock.tab);
  if (early === "shows") fail("Compete unlocked instantly on first listing — should wait a week");
  await page.evaluate(() => { state.week += 1; state.noticeQueue = []; render("full"); });
  await page.waitForTimeout(300);
  unlock = await page.evaluate(() => state.pendingUnlock && state.pendingUnlock.tab);
  if (unlock !== "shows") fail("Compete did not unlock after first listing (got " + unlock + ")");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  // Buck used to text the moment this tab opened, which put a taunt from a
  // stranger in the phone before the player had ever laid eyes on him. He
  // introduces himself in person at the first Cars & Coffee now, and the DM
  // follows the meeting.
  const buckEarly = await page.evaluate(() => ({
    inPhone: (state.characterDMs || []).some((d) => /Buck/i.test(d.h || "")),
    met: !!(state.buck && state.buck.metOnce),
  }));
  if (buckEarly.inPhone) fail("Buck texted before the player ever met him");
  if (buckEarly.met) fail("Buck is marked met without the in-person scene");
  pass("first listing → Compete unlock (Buck stays out of the phone)");

  // Meet him in the side lot, and only then does he turn up in the DMs.
  const buckOk = await page.evaluate(() => {
    state.pendingScene = null; state.pendingEvent = null; state.pendingUnlock = null;
    clearTabArrival();
    maybeTriggerBuckIntro();
    if (!state.pendingScene || state.pendingScene.id !== "buck_intro")
      return "the in-person Buck scene did not queue";
    if ((state.characterDMs || []).some((d) => /Buck/i.test(d.h || "")))
      return "Buck texted while the player was still talking to him";
    resolvePendingScene(0);
    if (!(state.buck && state.buck.metOnce)) return "the meeting did not mark him met";
    const dm = (state.characterDMs || []).find((d) => d.id === "buck-intro");
    if (!dm) return "no follow-up DM after the meeting";
    if (/Heard somebody's been wrenching/.test(dm.t || ""))
      return "the DM still reads as a cold open from a stranger";
    return true;
  });
  if (buckOk !== true) fail("Buck introduction: " + buckOk);
  pass("Buck introduces himself in person, then texts");

  // ── enter a show, click through the cinematic, land on results ──
  const showOk = await page.evaluate(() => {
    state.noticeQueue = []; state.weekRecap = null; state.pendingScene = null; state.pendingEvent = null;
    state.fuel = 60; state.gloveBoxFound = true;
    const open = getCurrentShows().find((s) => s.weeksUntil === 0 && !s.seasonClosed && showProgressRequirement(s).ok);
    if (!open) return "no open show";
    beginShowEntry(open.id);
    if (!state.showLoading || state.showStage !== "arriving") return "show flow did not start";
    advanceShowStage(); advanceShowStage(); advanceShowStage();
    if (state.showLoading || state.showStage) return "cinematic did not finish";
    if (!state.result) return "no result recorded";
    return true;
  });
  if (showOk !== true) fail("show flow: " + showOk);
  pass("show entry + cinematic + result");

  // ── the weekly Shop Log recap is always the LAST card of the week. It is
  // stashed in state.pendingRecap during the advance and only promoted into
  // state.weekRecap once every other beat has cleared (no queued scene/event,
  // no notice, no live show/cutscene). This guards the reorg that stopped the
  // recap from cutting into the middle of a show sequence. ──
  const recapLastOk = await page.evaluate(() => {
    state.weekRecap = null; state.pendingScene = null; state.pendingEvent = null;
    state.pendingUnlock = null; state.showLoading = false; state.showStage = null;
    state.showStore = false; state.cutscene = null;
    state.pendingRecap = { week: state.week, money: 0, followers: 0, installs: 0, idle: false, missedMeet: false };
    // A queued notice blocks promotion.
    state.noticeQueue = [{ text: "QA notice", tone: "good" }]; state.eventQueue = [];
    promoteRecapIfClear();
    if (state.weekRecap) return "recap promoted while a notice was still queued";
    // A queued scene/event blocks promotion.
    state.noticeQueue = []; state.eventQueue = [{ kind: "scene", payload: { id: "qa", choices: [] } }];
    promoteRecapIfClear();
    if (state.weekRecap) return "recap promoted while the event queue was non-empty";
    // A live scene blocks promotion.
    state.eventQueue = []; state.pendingScene = { id: "qa", choices: [] };
    promoteRecapIfClear();
    if (state.weekRecap) return "recap promoted while a scene was on screen";
    // An unlock icon still flying to its tab blocks promotion too, the same
    // way a live scene does: the handoff owns the screen until it lands.
    state.pendingScene = null;
    flyUnlockToTab("career", "📱");
    promoteRecapIfClear();
    if (state.weekRecap) return "recap promoted while the unlock handoff was mid-flight";
    // Everything clear → recap finally surfaces.
    clearTabArrival();
    promoteRecapIfClear();
    if (!state.weekRecap) return "recap never surfaced after everything cleared";
    if (state.pendingRecap) return "pendingRecap not cleared after promotion";
    state.weekRecap = null; state.pendingRecap = null; state.noticeQueue = [];
    return true;
  });
  if (recapLastOk !== true) fail("recap ordering: " + recapLastOk);
  pass("week recap always lands last (deferred behind every other beat)");

  // ── results screen renders its panels (judge card / rep / rival) ──
  // Drive renderResult() directly with synthetic results so the assertions
  // don't depend on which show the RNG happened to offer. A judged axis show
  // must produce the judging breakdown, the scene-standing line, and a
  // non-empty rival panel; Cars & Coffee must show scene chatter and NO
  // judge card.
  const resultUiOk = await page.evaluate(() => {
    const car = currentCar();
    if (!car) return "no car to render";
    const snapResult = state.result, snapView = state.view;
    const baseStandings = [
      { name: "Your " + car.make, score: 84, isPlayer: true },
      { name: "Buck's '67 Stallion", score: 82, isRival: true },
      { name: "A Stranger", score: 78 },
    ];
    const common = {
      week: state.week, car: `${car.year} ${car.make} ${car.model}`,
      prize: 1200, bonusCash: 0, fee: 60, localSponsorCovered: false,
      fuelUsed: 10, net: 1140, gained: 45, standings: baseStandings,
      buckPlace: 3, showReward: null, arrivalLine: "arr", judgingLine: "jud",
    };
    // Judged axis show.
    state.result = { ...common, show: "QA County Classic", tier: "Regional",
      place: 2, score: 84, axis: "beauty", repDelta: 6, repTitle: "Local Legend",
      judgeCard: { label: "Paint, Chrome & Presentation", icon: "✨",
        overall: 71, axisScore: 84, cats: [
          { cat: "paint", w: 0.3, val: 91 }, { cat: "chrome", w: 0.25, val: 83 },
          { cat: "body", w: 0.25, val: 79 }, { cat: "interior", w: 0.15, val: 54 },
          { cat: "wheels", w: 0.05, val: 88 }] },
      rivalReactions: [
        { kicker: "🤝 NEW ALLY", color: "#87c77b", line: "ally line" },
        { kicker: "🏁 THE RIVAL", color: "#e07070", line: "buck line" }] };
    let html;
    try { html = renderResult(); } catch (e) { state.result = snapResult; return "renderResult threw (judged): " + e.message; }
    const need = ["How the Judges Scored It", "Word Around the Paddock", "Scene standing", "Judged baseline"];
    for (const s of need) if (!html.includes(s)) { state.result = snapResult; return "judged result missing: " + s; }
    // Cars & Coffee — scene chatter, no judging breakdown.
    state.result = { ...common, show: "Saturday Cars & Coffee", tier: "Cars & Coffee",
      place: 1, score: 0, axis: null, repDelta: 0, repTitle: null, judgeCard: null,
      rivalReactions: [{ kicker: "☕ AROUND THE LOT", color: "#c2a37d", line: "chatter line" }] };
    let coffee;
    try { coffee = renderResult(); } catch (e) { state.result = snapResult; return "renderResult threw (coffee): " + e.message; }
    state.result = snapResult; state.view = snapView;
    if (coffee.includes("How the Judges Scored It")) return "judge card leaked into Cars & Coffee";
    if (!coffee.includes("Around the Lot")) return "coffee scene-chatter panel missing";
    return true;
  });
  if (resultUiOk !== true) fail("results UI: " + resultUiOk);
  pass("results screen panels (judge / rep / rival)");

  // ── workspace vibe options resolve, incl. the classic (6th) pick ──
  const vibeOk = await page.evaluate(() => {
    for (const tier of ["garage", "warehouse"]) {
      const vibes = WORKSHOP_VIBES[tier] || [];
      if (vibes.length < 6) return `${tier} has ${vibes.length} vibes, expected 6`;
      for (const v of vibes)
        if (!WORKSPACE_ART_SRCDOC[tier + ":" + v.id])
          return `missing backdrop art for ${tier}:${v.id}`;
      state.workshopStyle = state.workshopStyle || {};
      state.workshopStyle[tier] = "classic";
      if (activeWorkshopVibe(tier) !== "classic")
        return `${tier} classic vibe did not resolve`;
    }
    return true;
  });
  if (vibeOk !== true) fail("vibe options: " + vibeOk);
  pass("workspace vibes + classic pick resolve");

  // ── project-car quirks + scene taste wiring ──
  // Force a known quirk through the reveal path and check the stat landed
  // and a scene queued; then check the season taste resolves and swings the
  // judged edge the right way for both build directions.
  const flavorOk = await page.evaluate(() => {
    const car = currentCar();
    if (!car) return "no car";
    const snapEngine = car.engine, snapScene = state.pendingScene, snapQueue = (state.eventQueue || []).length;
    car.hiddenQuirk = { id: "block", revealed: false };
    car.jobsDone = 2;
    maybeRevealCarQuirk(car);
    const revealed = car.hiddenQuirk.revealed;
    const queued = !!state.pendingScene || (state.eventQueue || []).length > snapQueue;
    const statMoved = car.engine === Math.max(3, snapEngine - 10);
    // restore
    car.engine = snapEngine; delete car.hiddenQuirk; delete car.jobsDone;
    state.pendingScene = snapScene;
    if (!revealed) return "quirk did not mark revealed";
    if (!queued) return "quirk reveal did not queue a scene";
    if (!statMoved) return "quirk effect did not land on the car";
    // scene taste
    const snapTaste = state.sceneTaste;
    state.sceneTaste = { season: state.seasonNumber || 1, id: "purist" };
    const show = { tier: "Regional" };
    const edgeStock = sceneTasteEdge({ buildStyle: "stock" }, show);
    const edgeMod = sceneTasteEdge({ buildStyle: "restomod" }, show);
    const edgeCoffee = sceneTasteEdge({ buildStyle: "stock" }, { tier: "Cars & Coffee" });
    state.sceneTaste = snapTaste;
    if (edgeStock !== 3 || edgeMod !== -2 || edgeCoffee !== 0)
      return `taste edges wrong: stock=${edgeStock} mod=${edgeMod} coffee=${edgeCoffee}`;
    return true;
  });
  if (flavorOk !== true) fail("quirks/taste: " + flavorOk);
  pass("project-car quirks + scene taste");

  // ── the world talks back: reactive ticker composes from live state ──
  const tickerOk = await page.evaluate(() => {
    const snap = {
      history: state.history, buck: state.buck, taste: state.sceneTaste,
      followers: state.followers, rec: state.recentLines && state.recentLines.reactive,
    };
    state.history = [{ show: "QA Regional", tier: "Regional", place: 1, week: state.week, car: "1965 Forde F-100" }];
    state.buck = { ...(state.buck || {}), beatenCount: 2, lostToCount: 0 };
    state.sceneTaste = { season: state.seasonNumber || 1, id: "purist" };
    state.followers = 12000;
    let cands;
    try { cands = composeReactiveTicker(); } catch (e) { return "composer threw: " + e.message; }
    state.history = snap.history; state.buck = snap.buck; state.sceneTaste = snap.taste;
    state.followers = snap.followers;
    if (state.recentLines) state.recentLines.reactive = snap.rec;
    if (!Array.isArray(cands) || cands.length < 4)
      return "expected >=4 reactive candidates, got " + (cands ? cands.length : "none");
    const bad = cands.find((c) => !c.id || !c.text || !c.source || !c.kindLabel);
    if (bad) return "malformed candidate: " + JSON.stringify(bad);
    const win = cands.find((c) => c.id === "rx-win");
    if (!win || !win.text.includes("QA Regional")) return "win line missing the actual show name";
    return true;
  });
  if (tickerOk !== true) fail("reactive ticker: " + tickerOk);
  pass("world-talks-back ticker composes from live state");

  // ── character DMs: the phone texts you after events ──
  const dmOk = await page.evaluate(() => {
    const snapDMs = state.characterDMs, snapUnread = state.dmUnread;
    state.characterDMs = []; state.dmUnread = 0;
    // Wife is the corner crew now: her DM fires from the show resolve itself.
    const origRand = Math.random; Math.random = () => 0.01;
    queueShowDMs(true, 1, 3, { harlow: "ally" }, "Local");
    Math.random = origRand;
    state.tutorialComplete = true;
    const dms = state.characterDMs || [];
    const hasBuck = dms.some((d) => d.h === "@BuckStallion67");
    const hasRival = dms.some((d) => d.id === "rival-harlow");
    const hasWife = dms.some((d) => d.h === "The Wife");
    const unread = state.dmUnread;
    const html = renderPhoneMessagesApp();
    // opening Messages should clear the badge
    setPhoneApp("messages");
    const cleared = state.dmUnread === 0;
    state.characterDMs = snapDMs; state.dmUnread = snapUnread;
    if (!hasBuck) return "Buck DM missing after head-to-head";
    if (!hasRival) return "rival DM missing after ally crossing";
    if (!hasWife) return "wife DM missing after show win";
    if (unread < 3) return "unread count wrong: " + unread;
    if (!html.includes("phone-dm-fresh")) return "fresh DM not highlighted";
    if (!cleared) return "opening Messages did not clear the unread badge";
    return true;
  });
  if (dmOk !== true) fail("character DMs: " + dmOk);
  pass("character DMs (phone texts you after events)");

  // ── save → reload → state intact ──
  const before = await page.evaluate(() => { state.money = 12345; saveGame(true); return { week: state.week, money: state.money, installs: state.installsDone }; });
  await page.reload();
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({ week: state.week, money: state.money, installs: state.installsDone }));
  if (JSON.stringify(before) !== JSON.stringify(after)) fail(`save/reload mismatch: ${JSON.stringify(before)} vs ${JSON.stringify(after)}`);
  pass("save → reload → state intact");

  // ── save tooling sanity: backups exist, corrupt main self-restores, import validates ──
  const saveOk = await page.evaluate(() => {
    if (typeof exportSave !== "function" || typeof importSave !== "function") return "export/import missing";
    if (!localStorage.getItem(SAVE_KEY + "_bak1")) return "no rolling backup written";
    localStorage.setItem(SAVE_KEY, "{corrupt!!!");
    const recovered = loadGame();
    if (!recovered) return "corrupt save did not restore from backup";
    // Backups are time-spaced, so the restored copy may be a few minutes
    // older than the latest tick — assert it's a coherent game, not an
    // exact match of the newest state.
    if (typeof state.week !== "number" || !(state.cars || []).length) return "backup restored incoherent state";
    let threw = false;
    try { validateSavePayload("{\"nope\":1}"); } catch (e) { threw = true; }
    if (!threw) return "import validation accepts garbage";
    saveGame(true);
    return true;
  });
  if (saveOk !== true) fail("save tooling: " + saveOk);
  pass("backups + corrupt-recovery + import validation");

  // ── crash bar wiring ──
  const crashOk = await page.evaluate(() => {
    showCrashBar(buildCrashDetail("qa-smoke synthetic error", "qa", 1, 1, ""));
    return !!document.getElementById("crashBar");
  });
  if (!crashOk) fail("crash bar did not render");
  await page.evaluate(() => document.getElementById("crashBar").remove());
  pass("crash bar renders");

  // ── zero uncaught errors across the whole run ──
  if (errors.length) fail("uncaught errors:\n  " + errors.join("\n  "));
  pass("zero uncaught page errors");

  // ── the itch/web single-file build stays self-contained ──
  // Source points CUTSCENE_ART at assets/art/*.webp; dev/build-web.js inlines
  // them back into data-URIs. Guard that the built artifact needs no external
  // files, so an itch upload of just the one HTML never ships broken art.
  {
    const { execFileSync } = require("child_process");
    const fs = require("fs");
    const path = require("path");
    try {
      execFileSync("node", [path.join(__dirname, "build-web.js")], { stdio: "pipe" });
    } catch (e) {
      fail("web build failed: " + (e.stderr ? e.stderr.toString() : e.message));
    }
    const dist = path.join(__dirname, "..", "dist", "Car_Guy_Sim.html");
    if (!fs.existsSync(dist)) fail("web build produced no dist/Car_Guy_Sim.html");
    const out = fs.readFileSync(dist, "utf8");
    const region = out.match(/\/\*__ART_MAP__\*\/([\s\S]*?)\/\*__END_ART_MAP__\*\//);
    if (!region) fail("web build lost the art-map markers");
    if (region[1].includes("assets/art/")) fail("web build art-map still points at external files");
    const inlined = (region[1].match(/data:image\/webp;base64,/g) || []).length;
    if (inlined < 60) fail("web build inlined too few assets: " + inlined);
    pass(`web build self-contained (${inlined} assets inlined)`);
  }

  // ── the first playable screen at phone width, in a real narrow viewport.
  // The narrow-screen rules live in a media block that sits after a wider
  // one, so a re-ordered stylesheet can silently un-apply them and the page
  // starts scrolling sideways. These numbers are the guard on that. ──
  {
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const perrs = [];
    phone.on("pageerror", (e) => perrs.push("pageerror: " + e.message));
    await phone.goto(GAME);
    await phone.waitForTimeout(700);
    await phone.keyboard.press("Enter"); await phone.waitForTimeout(1100);
    await phone.keyboard.press("Enter"); await phone.waitForTimeout(500);
    const tb = await phone.$("#modalRoot .tutorial-primary"); if (tb) await tb.click();
    await phone.waitForTimeout(300);
    await phone.evaluate(() => resolvePendingScene(0));
    await phone.waitForTimeout(600);
    await phone.evaluate(() => { state.noticeQueue = []; render("full"); });
    await phone.waitForTimeout(400);
    const m = await phone.evaluate(() => ({
      doc: document.documentElement.scrollWidth, vp: window.innerWidth,
      h: document.getElementById("appContent").scrollHeight, vh: window.innerHeight,
      cards: [...document.querySelectorAll("#appContent .job-card")].length,
      wrap: (() => { const el = document.querySelector(".shop-subtabs");
        return el ? getComputedStyle(el).flexWrap : "missing"; })(),
    }));
    if (m.doc > m.vp + 2) fail(`phone: first screen scrolls sideways (doc ${m.doc} > vp ${m.vp})`);
    if (m.wrap !== "nowrap") fail(`phone: sub-tab strip flex-wrap is '${m.wrap}', expected nowrap (media block order regressed)`);
    if (m.cards > 2) fail(`phone: ${m.cards} suggested job cards on the first screen, expected at most 2`);
    if (m.h > m.vh * 2) fail(`phone: first playable screen is ${m.h}px (${(m.h / m.vh).toFixed(2)} screens), budget is 2.0`);
    if (perrs.length) fail("phone: " + perrs.join(" | "));
    pass(`phone 390x844: no sideways scroll, ${m.cards} job cards, ${(m.h / m.vh).toFixed(2)} screens tall`);
    await phone.close();
  }

  await browser.close();
  console.log("\nALL SMOKE CHECKS PASSED — safe to upload.");
})().catch((e) => fail(e.message));
