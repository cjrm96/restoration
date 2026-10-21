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

  // ── Space is the work space ladder: a $2,500 carport against a $5,000
  // bankroll that buys parallel jobs while the whole road to roadworthy is
  // eight sequential ones under $900, so the tab waits for a running truck.
  // Tool storage, the $200 upgrade a full crate needs right away, lives down
  // aisle 7 at Bay Freight from day one, and a full crate's list points there.
  const spaceOk = await page.evaluate(() => {
    const strip = () => [...document.querySelectorAll(".shop-subtabs .tab")].map((t) => t.textContent);
    const hasSpace = () => strip().some((t) => /Space/.test(t));
    const keep = { tools: state.ownedTools.slice(), box: state.toolStorageLevel, money: state.money, aisle: state.toolAisle };
    setView("workshop"); setShopSub("suggested"); render("full");
    if (hasSpace()) return "Space is on the strip in week one";
    if (strip().length !== 3) return "week one strip should be 3 pills, got " + strip().length;
    // Cannot be navigated to while it is off the strip.
    setShopSub("workspace");
    if (state.shopSub === "workspace") return "setShopSub reached a hidden sub-tab";
    // A save written on it must fall back rather than strand the player.
    state.shopSub = "workspace"; render("full");
    if (state.shopSub !== "suggested") return "a save written on the hidden tab stranded there";
    if (/Covered Carport/.test(document.getElementById("appContent").innerText))
      return "the carport is still reachable in week one";
    // A full crate: Space stays shut, and Bay Freight sells the next box.
    const cap = toolStorageData().maxTools;
    while (state.ownedTools.length < cap) {
      const t = TOOLS_LIST.find((x) => !state.ownedTools.includes(x.id));
      if (!t) break;
      state.ownedTools.push(t.id);
    }
    state.money = Math.max(state.money, 1000);
    setShopSub("tools"); state.toolAisle = 1; render("full");
    if (hasSpace()) return "a full tool crate opened Space, which holds no storage now";
    const room = document.querySelector(".hfs .hfs-room");
    if (!room) return "a full crate's list does not point at the storage aisle";
    room.click(); render("full");
    if (state.toolAisle !== 7) return "the list's storage line did not walk to aisle 7";
    const next = nextToolStorage();
    const buy = [...document.querySelectorAll(".hfs > .hfs-tag")].find((b) => !b.disabled && /upgradeToolStorage/.test(b.getAttribute("onclick") || ""));
    if (!buy) return "aisle 7 has no box you can buy with a full crate and cash in hand";
    buy.click(); render("full");
    if (state.toolStorageLevel !== next.id) return "the storage sign did not bring the next box home";
    if (![...document.querySelectorAll(".hfs > .hfs-own")].some((b) => /in your garage/i.test(b.textContent))) return "the box you own has no sticker";
    const ahead = [...document.querySelectorAll(".hfs > .hfs-tag")].filter((b) => b.disabled && /after the/i.test(b.textContent));
    if (nextToolStorage() && TOOL_STORAGE_LEVELS.indexOf(nextToolStorage()) + 1 < TOOL_STORAGE_LEVELS.length && !ahead.length) return "a box two rungs up does not say what comes first";
    state.ownedTools = keep.tools; state.toolStorageLevel = keep.box; state.money = keep.money; state.toolAisle = keep.aisle;
    // A roadworthy car opens Space.
    state.shopSub = "suggested";
    const car = currentCar();
    const before = { e: car.engine, t: car.transmission, b: car.brakes, s: car.steering };
    car.engine = 60; car.transmission = 50; car.brakes = 50; car.steering = 50;
    render("full");
    const rwOpens = hasSpace();
    car.engine = before.e; car.transmission = before.t; car.brakes = before.b; car.steering = before.s;
    state.noticeQueue = []; state.pendingUnlock = null; setShopSub("suggested"); render("full");
    if (!rwOpens) return "a roadworthy car did not open Space";
    return true;
  });
  if (spaceOk !== true) fail("Space gate: " + spaceOk);
  pass("Space waits for a running truck; a full crate buys its next box down aisle 7");

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

  // ── the pre-season freezes state.week at 1 for four weeks and then season
  // one opens on 1 again. Anything rate-limited by "is it still the same
  // week" therefore could not tell those five weeks apart: one loan a week
  // became one loan per five weeks, with the desk still promising it reopened
  // next week, and the same for the once-a-week life beat. Both key off the
  // stamp now, and what bills weekly bills through the off-season too. ──
  const preSeasonWeekOk = await page.evaluate(() => {
    const stash = JSON.parse(JSON.stringify({
      preWeek: state.preWeek, week: state.week, gigs: state.gigs,
      money: state.money, unlocked: state.loansUnlocked,
      lastLoanWeek: state.lastLoanWeek, truck: state.toolTruckBalance,
      ring: state.ringPawnBalance, beat: state.lifeBeatWeek,
      season: state.seasonNumber,
    }));
    const clr = () => { state.cutscene = null; state.pendingScene = null;
                        state.noticeQueue = []; state.pendingUnlock = null; };
    state.loansUnlocked = true;
    state.toolTruckBalance = 0; state.ringPawnBalance = 0;
    state.bankLoanBalance = 0; state.lastLoanWeek = null;
    enterPreSeason(); clr();
    if (!inPreSeason()) return "enterPreSeason did not open the pre-season";
    if (loanTakenThisWeek()) return "the desk opened locked";

    takeBankLoan(); clr();
    if (!loanTakenThisWeek()) return "one loan a week stopped holding inside a week";
    takeToolTruckLoan(); clr();
    if (state.toolTruckBalance !== 0)
      return "a second loan went through in the same pre-season week";

    // The week the desk promised.
    advancePreSeasonWeek("smoke"); clr();
    if (loanTakenThisWeek())
      return "the desk stayed locked into the next pre-season week";
    takeToolTruckLoan(); clr();
    if (state.toolTruckBalance !== 3600)
      return "the tool truck tab would not open a week later";

    // A weekly tab has to tick on a pre-season week, the terms said weekly.
    const before = state.toolTruckBalance;
    advancePreSeasonWeek("smoke"); clr();
    if (state.toolTruckBalance !== before - 90)
      return `the tool truck did not bill on a pre-season week (${before} -> ${state.toolTruckBalance})`;

    // Rolling into the competitive season must not arrive pre-locked.
    state.lastLoanWeek = weekStamp();
    while (inPreSeason()) { advancePreSeasonWeek("smoke"); clr(); }
    if (state.week !== 1) return "the competitive season did not open on week 1";
    if (loanTakenThisWeek())
      return "season week one opened with the desk locked by an off-season loan";

    // One beat a week, and the pre-season weeks are different weeks.
    state.lifeBeatWeek = null;
    enterPreSeason(); clr();
    if (!claimLifeBeat()) return "the first life beat of the pre-season was refused";
    if (claimLifeBeat()) return "two life beats landed in one pre-season week";
    advancePreSeasonWeek("smoke"); clr();
    if (!claimLifeBeat()) return "no life beat could fire on the next pre-season week";

    // The day job does not stop for the off-season, and because the bank and
    // the shark both collect out of the paycheck, neither used to take a
    // payment across those four weeks either.
    state.preWeek = 0; state.week = 1;
    state.paycheckProgress = 0; state.firstPaydaySeen = true;
    state.bankLoanBalance = 0; state.sharkLoanBalance = 0;
    state.toolTruckBalance = 0; state.ringPawnBalance = 0;
    enterPreSeason(); clr();
    const wageStart = state.money;
    for (let i = 0; i < 4; i++) { advancePreSeasonWeek("smoke"); clr(); }
    if (state.money - wageStart !== PAYCHECK_AMOUNT)
      return `the off-season paid ${state.money - wageStart} in wages over four weeks, wanted ${PAYCHECK_AMOUNT}`;
    // And a loan taken in the off-season actually gets collected there.
    state.preWeek = 0; state.week = 1;
    enterPreSeason(); clr();
    state.paycheckProgress = PAYCHECK_CYCLE - 1;
    state.bankLoanBalance = 4000;
    advancePreSeasonWeek("smoke"); clr();
    if (state.bankLoanBalance !== 4000 - state.bankLoanPayment)
      return "the bank took nothing on an off-season payday";
    state.bankLoanBalance = 0;

    // Legacy saves carry a plain number here and must arrive with an open desk.
    state.lastLoanWeek = 1; state.preWeek = 0; state.week = 1;
    if (loanTakenThisWeek()) return "a legacy save arrived with the desk locked";

    Object.assign(state, stash); clr();
    return true;
  });
  if (preSeasonWeekOk !== true) fail("pre-season week rollover: " + preSeasonWeekOk);
  pass("the pre-season counts as weeks: the loan desk, the life beat and the weekly tabs all roll over");

  // ── you own exactly one of every tool: ownedTools is deduplicated at every
  // site that writes it, so "spare" is a category that cannot exist. The sell
  // shelf used to ask only whether the car currently in the garage still had a
  // job outstanding, which goes false as soon as that one car's paint and
  // tyres are done, and then offered up the only air compressor you own. ──
  const toolSaleOk = await page.evaluate(() => {
    const stash = JSON.parse(JSON.stringify({
      tools: state.ownedTools, inv: state.partsInventory,
      installed: state.cars[0].installedParts, paint: state.cars[0].paint,
      tires: state.cars[0].tires, money: state.money,
    }));
    const clr = () => { state.cutscene = null; state.pendingScene = null;
                        state.noticeQueue = []; state.eventQueue = []; };

    // Nothing you can own twice.
    const dupes = state.ownedTools.filter((id, i) => state.ownedTools.indexOf(id) !== i);
    if (dupes.length) return "ownedTools already holds a duplicate: " + dupes.join(",");

    // The reported case: the compressor, with every job it opens finished.
    state.ownedTools = ["t1", "t14", "t9"];
    const car = state.cars[0];
    car.installedParts = PARTS.filter((x) => (x.tools || []).includes("t9")).map((x) => x.id);
    car.paint = 100; car.tires = 100;
    if (toolIsSurplus("t9"))
      return "the only air compressor you own was still offered for sale";
    listToolForSale("t9"); clr();
    if (!state.ownedTools.includes("t9"))
      return "listing it anyway took the compressor off the shelf";

    // Every tool that opens a job is kit, not stock, unless something in the
    // box supersedes it.
    const gating = TOOLS_LIST.filter((t) => toolGatesWork(t.id));
    // Everything except the three tools that supersede another, so nothing in
    // the box is a spare and every gating tool must read as kit.
    const superseders = Object.values(TOOL_SUPERSEDES).flat();
    state.ownedTools = TOOLS_LIST.map((t) => t.id).filter((id) => !superseders.includes(id));
    const wrong = gating.filter((t) => toolIsSurplus(t.id));
    if (wrong.length)
      return "these open jobs but were listed as surplus: " + wrong.map((t) => t.id).join(",");

    // A better tool in the same trade does the lesser one's work. The shop
    // compressor is the case this exists for: a man who bought it could not
    // shoot a single stage respray, because the part names the small one.
    const respray = PARTS.find((x) => x.name === "Single Stage Respray");
    if (!respray) return "the respray that motivated tool superseding is gone";
    state.ownedTools = ["t1", "t14", "t10", "t11", "t15"];
    if (!hasToolFor("t9")) return "the shop compressor does not cover the small one";
    if ((respray.tools || []).some((t) => !hasToolFor(t)))
      return "a full box with the shop compressor still cannot shoot a single stage respray";
    // One direction only. A small compressor is not a shop compressor.
    state.ownedTools = ["t1", "t14", "t9"];
    if (hasToolFor("t10")) return "the small compressor was accepted as the shop one";
    // And things that merely share a shelf are not upgrades.
    state.ownedTools = ["t12"];
    if (hasToolFor("t11")) return "a paint booth was treated as a paint gun";
    state.ownedTools = ["t3"];
    if (hasToolFor("t18")) return "an engine hoist was treated as a floor jack";
    // Which finally makes a real spare possible: the small one, once the big
    // one is on the wall.
    state.ownedTools = ["t1", "t14", "t9"];
    if (toolIsSurplus("t9")) return "the only compressor you own was offered for sale";
    state.ownedTools = ["t1", "t14", "t9", "t10"];
    if (!toolIsSurplus("t9")) return "the small compressor stayed kit after the shop one arrived";
    if (toolIsSurplus("t10")) return "the shop compressor was offered for sale";

    // What can honestly go: the things bought to be looked at.
    state.ownedTools = TOOLS_LIST.map((t) => t.id);
    const vanity = TOOLS_LIST.filter((t) => !toolGatesWork(t.id)).map((t) => t.id);
    if (!vanity.includes("t_gold") || !vanity.includes("t_lift"))
      return "expected the gold ratchet and the lift to gate no work";
    for (const id of vanity) {
      if (!toolIsSurplus(id)) return id + " gates no work but could not be sold";
    }
    const invBefore = state.partsInventory.length;
    state.money = 0;
    listToolForSale("t_gold"); clr();
    if (state.ownedTools.includes("t_gold")) return "the gold ratchet would not sell";
    if (state.partsInventory.length !== invBefore + 1)
      return "selling the ratchet did not put anything on the market";

    // The starter kit is never for sale, whatever else is true.
    for (const id of STARTER_TOOLS) {
      listToolForSale(id); clr();
      if (!state.ownedTools.includes(id)) return "the starter kit sold: " + id;
    }
    Object.assign(state, { ownedTools: stash.tools, partsInventory: stash.inv, money: stash.money });
    state.cars[0].installedParts = stash.installed;
    state.cars[0].paint = stash.paint; state.cars[0].tires = stash.tires;
    clr();
    return true;
  });
  if (toolSaleOk !== true) fail("tool sale shelf: " + toolSaleOk);
  pass("you own one of every tool, so anything that opens a job stays in the box");

  // ── the border run is the cheap way to paint a car, and it used to sit
  // behind the expensive way: it wanted every paint service on the car
  // finished, and the last of those needs a paint booth that only fits in a
  // warehouse. The shortcut unlocked long after anybody needed a shortcut.
  // What it takes now is a car that can make the drive. ──
  const borderOk = await page.evaluate(() => {
    const car = state.cars[0];
    const stash = JSON.parse(JSON.stringify({
      installed: car.installedParts, paint: car.paint, body: car.body,
      palette: car.palette, money: state.money,
      eng: car.engine, tr: car.transmission, br: car.brakes, st: car.steering,
      followers: state.followers,
    }));
    const clr = () => { state.cutscene = null; state.pendingScene = null;
                        state.noticeQueue = []; state.eventQueue = []; };
    const titleOf = () => {
      const sc = state.pendingScene ||
        ((state.eventQueue || []).find((e) => e.payload && e.payload.id === "tijuana_result") || {}).payload;
      return (sc && sc.title) || "";
    };

    // Not roadworthy: it is a long drive, and it does not happen.
    car.engine = 10; car.transmission = 10; car.brakes = 10; car.steering = 10;
    state.money = 5000; state.borderRunWeek = null;
    const before = car.palette;
    tijuanaRun(); clr();
    if (car.palette !== before) return "the run happened in a car that could not drive there";
    if (state.money !== 5000) return "a refused run still charged for it";

    // Roadworthy with no paint work at all: this is the midgame case.
    car.engine = 99; car.transmission = 99; car.brakes = 99; car.steering = 99;
    car.installedParts = []; car.paint = 15;
    const comp = getCategoryCompletion(car, "paint");
    if (comp && comp.allDone) return "the no-paint-work setup did not set up";
    tijuanaRun(); clr();
    if (car.palette === before) return "a roadworthy car with paint still to do could not make the run";
    if (state.money !== 5000 - TJ_COST) return "the run did not charge " + TJ_COST;

    // Once a week, on the stamp, so the pre-season counts too.
    const held = state.money;
    tijuanaRun(); clr();
    if (state.money !== held) return "a second run landed in the same week";
    state.borderRunWeek = null;
    tijuanaRun(); clr();
    if (state.money !== held - TJ_COST) return "the run did not reopen on a new week";

    // Prep is the player's half of the gamble: a straight body should come
    // back clean far more often than a rough one, and the orange peel is the
    // outcome that actually costs paint.
    const sample = (body) => {
      const t = { great: 0, peel: 0 };
      for (let i = 0; i < 1500; i++) {
        state.borderRunWeek = null; state.money = 5000;
        car.body = body; car.paint = 60;
        tijuanaRun();
        const title = titleOf();
        if (/^Best \$/.test(title)) t.great++;
        else if (/Twenty Feet/.test(title)) t.peel++;
        clr();
      }
      return t;
    };
    const rough = sample(0), straight = sample(100);
    if (!(straight.great > rough.great))
      return `a straight body did not paint better than a rough one (${straight.great} vs ${rough.great} of 1500)`;
    if (!(rough.peel > straight.peel))
      return `a rough body did not pick up more orange peel (${rough.peel} vs ${straight.peel} of 1500)`;

    Object.assign(car, { installedParts: stash.installed, paint: stash.paint,
      body: stash.body, palette: stash.palette, engine: stash.eng,
      transmission: stash.tr, brakes: stash.br, steering: stash.st });
    state.money = stash.money; state.followers = stash.followers;
    state.borderRunWeek = null; clr();
    return true;
  });
  if (borderOk !== true) fail("border run: " + borderOk);
  pass("the border run needs a car that can drive there, once a week, and prep decides how it comes back");

  // ── surplus tools. Your own tools are never for sale, so the only honest
  // way a tool reaches the market is as stock you bought to move: somebody
  // else's spare, off a swap-meet table, straight into the inventory. It must
  // never land in ownedTools, or it would be kit you could sell. ──
  const surplusOk = await page.evaluate(() => {
    const stash = JSON.parse(JSON.stringify({
      tools: state.ownedTools, inv: state.partsInventory, money: state.money,
      choice: state.scavengeChoice, stock: state.swapToolFlipStock,
    }));
    const clr = () => { state.cutscene = null; state.pendingScene = null;
                        state.noticeQueue = []; state.eventQueue = []; };

    regenerateScavengeStock();
    if (!(state.swapToolFlipStock || []).length)
      return "the swap generated no surplus tools at all";
    for (const st of state.swapToolFlipStock) {
      const t = TOOLS_LIST.find((x) => x.id === st.toolId);
      if (!t) return "surplus stock names a tool that does not exist: " + st.toolId;
      if (t.id.startsWith("t_")) return "a vanity piece turned up on the surplus table: " + t.id;
      if (t.workshop === "warehouse") return "a warehouse-tier tool turned up at the swap: " + t.id;
      if (!(st.resale > st.buy)) return `no spread on ${t.id}: buy ${st.buy}, resale ${st.resale}`;
      if (!st.story) return "surplus stock arrived with no reason for being there";
    }

    // Buying it is buying stock, not kit.
    state.scavengeChoice = "swap";
    state.money = 5000;
    const st = state.swapToolFlipStock[0];
    const ownedBefore = JSON.stringify(state.ownedTools);
    const invBefore = state.partsInventory.length;
    buySwapToolFlip(st.toolId); clr();
    if (JSON.stringify(state.ownedTools) !== ownedBefore)
      return "buying surplus put the tool in your box";
    if (state.partsInventory.length !== invBefore + 1)
      return "buying surplus did not add stock to the inventory";
    if (state.money !== 5000 - st.buy) return "surplus did not charge the buy price";
    const item = state.partsInventory[state.partsInventory.length - 1];
    if (item.category !== "tool") return "surplus stock is not filed as a tool";
    if (!(item.askingPrice > item.baselineValue)) return "surplus stock has no asking margin";
    // And it lists like any other part.
    listPartOnMarketplaceWithTone(item.id, "firm"); clr();
    if (!item.listed) return "surplus stock could not be listed on the Marketplace";
    // Buying it twice is not a thing: it came off the table.
    buySwapToolFlip(st.toolId); clr();
    if (state.partsInventory.length !== invBefore + 1)
      return "the same surplus tool sold twice off one table";

    Object.assign(state, { ownedTools: stash.tools, partsInventory: stash.inv,
      money: stash.money, scavengeChoice: stash.choice,
      swapToolFlipStock: stash.stock });
    clr();
    return true;
  });
  if (surplusOk !== true) fail("surplus tools: " + surplusOk);
  pass("surplus tools flip like parts, and never land in your own tool box");

  // ── the "This week:" line is teaching, and teaching has an end. It had no
  // expiry at all: a player four seasons in was still being told to chase
  // overall and reminded that a quiet week is allowed. It retires after
  // season one, keeping only the one line that is a fact rather than a
  // lesson, and going quiet when even that has nothing to say. ──
  const coachOk = await page.evaluate(() => {
    const car = state.cars[0];
    const stash = JSON.parse(JSON.stringify({
      eng: car.engine, tr: car.transmission, br: car.brakes, st: car.steering,
      installed: car.installedParts, paint: car.paint, body: car.body,
      stage: state.onboardStage, season: state.seasonNumber, history: state.history,
    }));
    const realUpcoming = getUpcomingSummary;
    const restore = () => {
      getUpcomingSummary = realUpcoming;
      Object.assign(car, { engine: stash.eng, transmission: stash.tr, brakes: stash.br,
        steering: stash.st, installedParts: stash.installed, paint: stash.paint, body: stash.body });
      state.onboardStage = stash.stage; state.seasonNumber = stash.season;
      state.history = stash.history;
    };

    car.engine = 99; car.transmission = 99; car.brakes = 99; car.steering = 99;
    car.installedParts = []; car.paint = 20; car.body = 20;
    state.onboardStage = 3;
    state.history = [{ tier: "Local", place: 2 }];

    // While the onboarding is still running the coach must never go quiet,
    // whatever season the save claims to be in.
    state.seasonNumber = 3;
    for (const stage of [0, 1, 2]) {
      state.onboardStage = stage;
      if (!thisWeekNudge(car)) { restore(); return "the coach went silent during onboarding, stage " + stage; }
    }
    state.onboardStage = 3;

    const fake = { nextShow: { name: "Kettle Ridge Classic", minScore: 70, weeksUntil: 2 }, nextShowText: "x" };
    getUpcomingSummary = () => fake;
    const overall = getOverall(car);
    if (!(overall < 70)) { restore(); return "the score-gap setup did not leave a gap"; }

    // Season one still gets the whole coaching voice.
    state.seasonNumber = 1;
    const rookie = thisWeekNudge(car);
    if (!rookie) { restore(); return "season one lost its coaching line"; }
    if (!/Keep building/.test(rookie)) { restore(); return "season one lost the encouragement: " + rookie; }

    // Season two keeps the numbers and drops the lesson.
    state.seasonNumber = 2;
    const vet = thisWeekNudge(car);
    if (!vet) { restore(); return "the score gap vanished for a veteran, that one is a fact not a lesson"; }
    if (/Keep building/.test(vet)) { restore(); return "a veteran was still being coached: " + vet; }
    if (vet.indexOf(String(overall)) === -1 || vet.indexOf("70") === -1) {
      restore(); return "the veteran line dropped one of its numbers: " + vet;
    }

    // No gap, nothing to say.
    fake.nextShow.minScore = 10;
    if (thisWeekNudge(car)) {
      const said = thisWeekNudge(car); restore();
      return "a veteran with nothing to fix was still talked at: " + said;
    }
    // And the empty string must not leave an empty box on the screen.
    state.view = "workshop"; state.shopSub = "suggested";
    requestRender("full");
    restore();
    return true;
  });
  if (coachOk !== true) fail("this-week coach: " + coachOk);
  pass("the \"This week\" coach retires after season one, keeping only the score gap");

  // ── the ring. Both roads to the pawn shop bailed on modalBusy(), which is
  // the same bug that once kept the loan shark off the board for whole
  // seasons: the week advance nearly always has a notice queued behind it, so
  // a busy screen cancelled the roll instead of delaying it and the beat fired
  // on about 4% of eligible weeks instead of the 30-35% it reads as.
  // queueScene() defers on its own, so the check was the thing breaking it. ──
  const ringOk = await page.evaluate(() => {
    const snapshot = JSON.stringify(state);
    const car = state.cars[0];
    const clean = () => {
      state.pendingScene = null; state.pendingEvent = null; state.eventQueue = [];
      state.noticeQueue = []; state.cutscene = null; state.pendingUnlock = null;
      state.showStore = false; state.weekRecap = null; state.pendingRecap = null;
      state.result = null; state.pendingVictory = null; state.showStage = null;
      state.showLoading = false; state.view = "workshop";
      clearTabArrival();
    };
    const fired = () =>
      !!(state.pendingScene && state.pendingScene.id === "ring_pawn_offer") ||
      (state.eventQueue || []).some((e) => e.payload && e.payload.id === "ring_pawn_offer");
    // Cornered late in a season: roadworthy, broke, a loan working, and the
    // wife's car still in the driveway so this is the stretch road.
    const arm = () => {
      car.engine = 99; car.transmission = 99; car.brakes = 99; car.steering = 99;
      state.tutorialComplete = true; state.onboardStage = 3;
      state.history = [{ tier: "Local", place: 2, show: "Palomar Junction Local" }];
      state.weddingRingPawned = false; state.ringEverPawned = false;
      state.wifeCarSold = false; state.ringOfferMade = false;
      state.week = 17; state.seasonLength = 22; state.seasonNumber = 2;
      state.money = 100; state.paycheckProgress = 0;
      state.bankLoanBalance = 4000; state.sharkLoanBalance = 0; state.toolTruckBalance = 0;
      state.gameOver = false; state.seasonWrap = false;
    };

    // Through the real week advance, with a screen that is busy the way a real
    // week advance leaves it. Anything near 4% means the cancel is back.
    const N = 200;
    let hits = 0;
    for (let i = 0; i < N; i++) { clean(); arm(); advanceWeek("time"); if (fired()) hits++; }
    const rate = (hits / N) * 100;
    if (rate < 12) {
      const r = rate.toFixed(1); Object.assign(state, JSON.parse(snapshot));
      return `the offer only reached ${r}% of eligible weeks, it is being cancelled by a busy screen again rather than deferred`;
    }

    // Asked once in a run, and once means once. Walking away deliberately
    // sets none of the pawned flags, because refusing is not the same as doing
    // it and must not cost the player Clean Hands, so without this there was
    // nothing at all stopping the offer coming back the following week.
    let capped = 0;
    for (let i = 0; i < 300; i++) {
      clean(); arm(); state.ringOfferMade = true;
      maybeOfferRingPawnStretch(); maybeOfferRingPawn();
      if (fired()) capped++;
    }
    if (capped) { Object.assign(state, JSON.parse(snapshot)); return "the ring was offered a second time"; }

    // Not even seasons later. A man decides this once.
    let later = 0;
    for (let i = 0; i < 300; i++) {
      clean(); arm(); state.ringOfferMade = true; state.seasonNumber = 5;
      maybeOfferRingPawnStretch(); maybeOfferRingPawn();
      if (fired()) later++;
    }
    if (later) { Object.assign(state, JSON.parse(snapshot)); return "a later season asked him again"; }

    // Once it is actually pawned it is over, and refusing must never cost the
    // player Clean Hands.
    let after = 0;
    for (let i = 0; i < 200; i++) {
      clean(); arm(); state.ringEverPawned = true; state.seasonNumber = 5;
      maybeOfferRingPawnStretch(); maybeOfferRingPawn();
      if (fired()) after++;
    }
    if (after) { Object.assign(state, JSON.parse(snapshot)); return "it was offered again after the ring was already pawned"; }

    // The offer itself is still a real fork with a way out.
    clean(); arm();
    queueRingPawnOffer("probe");
    const sc = state.pendingScene ||
      ((state.eventQueue || []).find((e) => e.payload && e.payload.id === "ring_pawn_offer") || {}).payload;
    if (!sc || (sc.choices || []).length !== 2) { Object.assign(state, JSON.parse(snapshot)); return "the pawn offer lost its second choice"; }
    if (sc.choices.some((c) => c.ringPawnAccept) === false) { Object.assign(state, JSON.parse(snapshot)); return "no way to accept"; }
    const walk = sc.choices.find((c) => !c.ringPawnAccept);
    if (walk.ringEverPawned || walk.ringPawnAccept) { Object.assign(state, JSON.parse(snapshot)); return "walking away was recorded as pawning it"; }

    Object.assign(state, JSON.parse(snapshot));
    return true;
  });
  if (ringOk !== true) fail("ring pawn offer: " + ringOk);
  pass("the pawn-shop fork reaches the player, once in a run, and refusing stays clean");

  // ── the bug class itself, not one more instance of it. queueScene(),
  // queueWeeklyEvent() and pushNotice() all defer on their own when the screen
  // is busy. A beat that ALSO bails on modalBusy()/pendingScene before rolling
  // therefore does not wait, it throws the week away, and the week advance
  // leaves the screen busy on ~85% of weeks. That is what hid the loan shark
  // for whole seasons, then the pawn shop, then the birthday card. This reads
  // the shipped functions and fails if the shape comes back. ──
  const deferOk = await page.evaluate(() => {
    // Beats that queue their own content and must therefore never cancel.
    const mustDefer = [
      "maybeTriggerBirthday", "maybeOfferRingPawn", "maybeOfferRingPawnStretch",
      "maybeTriggerSharkIntro", "maybeTriggerBankIntro", "maybeRestraintBeat",
      "maybeTriggerBuckIntro", "maybeKidWrenchBeat", "maybeHomeBalanceBeat",
      "maybeTriggerYardIntro", "maybeTriggerSwapIntro", "maybeOfferBrandDeal",
    ];
    const offenders = [];
    const missing = [];
    for (const name of mustDefer) {
      const fn = window[name];
      if (typeof fn !== "function") { missing.push(name); continue; }
      const src = fn.toString();
      const queues = /queueScene\(|queueWeeklyEvent\(|pushNotice\(|queueRingPawnOffer\(|queueEvent\(/.test(src);
      if (!queues) continue; // it hands off some other way, not this rule's business
      const cancels = /if\s*\([^)]*\bmodalBusy\(\)/.test(src) ||
                      /if\s*\([^)]*state\.pendingScene[^)]*\)\s*return/.test(src);
      if (cancels) offenders.push(name);
    }
    if (missing.length) return "could not read these beats to check them: " + missing.join(", ");
    if (offenders.length)
      return "these queue their own content but still cancel on a busy screen, so they lose the week instead of waiting: " + offenders.join(", ");
    return true;
  });
  if (deferOk !== true) fail("beats must defer, not cancel: " + deferOk);
  pass("no beat throws away its week because the screen was busy (it queues instead)");

  // ── and the birthday card as the measured case. Behind the old busy check
  // its 30%/week roll reached 41% of seasons. It is a date on Dale's calendar
  // now, so through the real week advance it must reach every season, on
  // every week it can fall on, busy screen or not. ──
  const bdayOk = await page.evaluate(() => {
    const snapshot = JSON.stringify(state);
    const car = state.cars[0];
    const clear = () => {
      state.pendingScene = null; state.pendingEvent = null; state.eventQueue = [];
      state.noticeQueue = []; state.cutscene = null; state.pendingUnlock = null;
      state.showStore = false; state.weekRecap = null; state.pendingRecap = null;
      state.result = null; state.pendingVictory = null; state.showStage = null;
      state.showLoading = false; state.view = "workshop"; clearTabArrival();
    };
    const N = 150;
    let got = 0;
    for (let s = 0; s < N; s++) {
      car.engine = 70; car.transmission = 70; car.brakes = 70; car.steering = 70;
      state.tutorialComplete = true; state.onboardStage = 3;
      state.seasonNumber = 2; state.seasonLength = 22; state.money = 2000;
      state.history = [{ tier: "Local", place: 2, show: "Palomar Junction Local" }];
      state.gameOver = false; state.seasonWrap = false; state.birthdayReceived = false;
      state.birthdayWeek = 13 + (s % 8);
      for (let w = 13; w <= 22; w++) {
        clear(); state.week = w - 1;
        advanceWeek("time");
        if (state.birthdayReceived) break;
      }
      if (state.birthdayReceived) got++;
    }
    const pct = (got / N) * 100;
    Object.assign(state, JSON.parse(snapshot));
    if (got < N) return `the card reached only ${pct.toFixed(0)}% of seasons, it is being eaten by a busy screen again`;
    return true;
  });
  if (bdayOk !== true) fail("birthday card delivery: " + bdayOk);
  pass("the birthday card reaches every season through the real week advance");

  // ── who the money beats find. They were keyed to being poor, which is a
  // lagging read on decisions made eight weeks earlier, and measured across
  // 300 seasons with the money moving the way a real season moves it, a
  // careful debt-free builder saw the bank, the shark and the ring in 0% of
  // them. They key off the build outrunning the wallet now. Two things have to
  // stay true at once: a player who is genuinely never cornered still gets
  // silence, and a player who is cornered with a real truck gets the door. ──
  const reachOk = await page.evaluate(() => {
    const snapshot = JSON.stringify(state);
    const car = state.cars[0];
    const clear = () => {
      state.pendingScene = null; state.pendingEvent = null; state.eventQueue = [];
      state.noticeQueue = []; state.cutscene = null; state.pendingUnlock = null;
      state.showStore = false; state.weekRecap = null; state.pendingRecap = null;
      state.result = null; state.pendingVictory = null; state.showStage = null;
      state.showLoading = false; state.view = "workshop"; clearTabArrival();
    };
    const season = (opts) => {
      state.tutorialComplete = true; state.onboardStage = 3;
      state.seasonNumber = 2; state.seasonLength = 22;
      state.installsDone = 9; state.followers = 4000;
      state.history = [1,2,3,4,5,6].map((n) => ({ tier: "Local", place: n, show: "S" + n }));
      state.gameOver = false; state.seasonWrap = false;
      state.lifeBeatWeek = null; state.restraintStage = 0; state.restraintLastWeek = null;
      state.birthdayReceived = true; state.ringOfferMade = false;
      state.weddingRingPawned = false; state.ringEverPawned = false;
      state.loansUnlocked = false; state.sharkMetWeek = null; state.sharkRefused = false;
      state.bankMentioned = false; state.leanStreak = 0; state.tripsKnown = {};
      state.money = opts.start; state.paycheckProgress = 0; state.wifeCarSold = false;
      state.bankLoanBalance = 0; state.sharkLoanBalance = 0;
      state.toolTruckBalance = opts.tab ? 3600 : 0;
      let hit = {};
      const qs = queueScene, qe = queueEvent;
      const watch = (id) => { if (id) hit[id] = true; };
      queueScene = function (sc) { watch(sc && sc.id); return qs.apply(this, arguments); };
      queueEvent = function (k, pl) { watch(pl && pl.id); return qe.apply(this, arguments); };
      for (let w = 1; w <= 22; w++) {
        clear(); state.week = w;
        const prog = 20 + Math.round((w / 22) * 45);
        CATS.forEach((c) => { car[c] = prog; });
        ["engine","transmission","brakes","steering"].forEach((c) => { car[c] = Math.min(95, prog + 25); });
        if (Math.random() < opts.spendChance) {
          state.money = Math.max(0, state.money - (opts.min + Math.floor(Math.random() * (opts.max - opts.min))));
        }
        advanceWeek("time");
      }
      queueScene = qs; queueEvent = qe;
      return hit;
    };
    const tally = (opts, n) => {
      const c = { bank_intro: 0, shark_intro: 0, ring_pawn_offer: 0 };
      for (let i = 0; i < n; i++) {
        const hit = season(opts);
        for (const k of Object.keys(c)) if (hit[k]) c[k]++;
      }
      for (const k of Object.keys(c)) c[k] = (c[k] / n) * 100;
      return c;
    };

    const N = 40;
    // A builder who spends modestly and never borrows is never cornered, and
    // must never be chased by any of it.
    const careful = tally({ start: 5000, spendChance: 0.5, min: 100, max: 500, tab: false }, N);
    if (careful.bank_intro > 15 || careful.shark_intro > 15 || careful.ring_pawn_offer > 15) {
      Object.assign(state, JSON.parse(snapshot));
      return `a builder who is never short is being chased anyway (bank ${careful.bank_intro}%, shark ${careful.shark_intro}%, ring ${careful.ring_pawn_offer}%)`;
    }
    // A builder running a tab and spending like the build matters gets the
    // door. The bank is the entry to the whole ladder, so it is the one that
    // must not be shut.
    const cornered = tally({ start: 5000, spendChance: 0.75, min: 200, max: 900, tab: true }, N);
    if (cornered.bank_intro < 20) {
      Object.assign(state, JSON.parse(snapshot));
      return `the bank, which opens the whole debt ladder, reached only ${cornered.bank_intro}% of seasons for a cornered builder`;
    }
    if (cornered.shark_intro < 20) {
      Object.assign(state, JSON.parse(snapshot));
      return `the shark reached only ${cornered.shark_intro}% of seasons for a cornered builder`;
    }
    Object.assign(state, JSON.parse(snapshot));
    return true;
  });
  if (reachOk !== true) fail("money beats reaching the right player: " + reachOk);
  pass("the money beats find a cornered builder and leave a comfortable one alone");

  // ── pre-season side work is four people who call, not a job board. The old
  // board was three anonymous postings a week whose only decision was
  // arithmetic. These pay in four different currencies so two calls in one
  // week cannot be compared by subtraction, a week holds two of them, and
  // standing decides who rings. ──
  const callsOk = await page.evaluate(() => {
    const snapshot = JSON.stringify(state);
    const clear = () => {
      state.pendingScene = null; state.pendingEvent = null; state.eventQueue = [];
      state.noticeQueue = []; state.cutscene = null; state.pendingUnlock = null;
      state.showStore = false; state.weekRecap = null; state.pendingRecap = null;
      state.result = null; state.view = "workshop"; clearTabArrival();
    };
    const bail = (msg) => { Object.assign(state, JSON.parse(snapshot)); return msg; };

    state.tutorialComplete = true; state.onboardStage = 3; state.seasonNumber = 2;
    state.regulars = {}; state.money = 0; state.partsInventory = [];
    state.ownedTools = ["t1", "t14"]; state.workshopLevel = "carport";
    state.toolTruckBalance = 0; state.ringPawnBalance = 0;
    state.bankLoanBalance = 0; state.sharkLoanBalance = 0;
    enterPreSeason(); clear();

    // Somebody always rings. A silent week is a failed roll wearing a quiet
    // week's coat, and the player cannot tell the difference.
    for (let i = 0; i < 200; i++) {
      state.regulars = {}; rollGigBoard();
      if (!(state.gigs || []).length) return bail("a pre-season week came up with nobody calling at all");
      for (const g of state.gigs) {
        if (!g.who || !REGULARS.some((r) => r.id === g.who))
          return bail("a call arrived with no caller behind it");
        if (!["cash", "part", "tool", "favour"].includes(g.kind))
          return bail("a call paid in something that is not one of the four kinds: " + g.kind);
      }
    }

    // A week holds two. The third is refused, and the refusal is spoken.
    state.regulars = { dell: 9, trey: 9, hollis: 9, vic: 9 };
    rollGigBoard(); clear();
    if ((state.gigs || []).length < 3) {
      // force a full board so the cap can be tested
      state.gigs = REGULARS.map((r, i) => ({ id: "c" + i, who: r.id, kind: "cash",
        title: "t", tier: "Budget", pay: 100, done: false }));
    }
    let done = 0;
    for (const g of state.gigs) { doGig(g.id); clear(); if (g.done) done++; }
    if (done !== CALLS_PER_WEEK)
      return bail(`a week let ${done} calls through, the cap is ${CALLS_PER_WEEK}`);

    // Each currency actually pays what the card says.
    const kindPays = (kind) => {
      state.regulars = {}; state.money = 0; state.partsInventory = [];
      state.ownedTools = ["t1", "t14"];
      state.gigs = [{ id: "k", who: "dell", kind, title: "t", tier: "Budget", pay: 200, done: false }];
      doGig("k"); clear();
      return { money: state.money, inv: state.partsInventory.length,
               tools: state.ownedTools.length, standing: standingWith("dell") };
    };
    const c = kindPays("cash");
    if (c.money !== 200) return bail("a cash call did not pay cash");
    const pt = kindPays("part");
    if (pt.money !== 0 || pt.inv !== 1) return bail("a part call did not hand over a part");
    const tl = kindPays("tool");
    if (tl.money !== 0 || (tl.tools === 2 && tl.inv === 0))
      return bail("a tool call handed over neither a tool nor stock");
    const fv = kindPays("favour");
    if (fv.money !== 0 || fv.inv !== 0) return bail("a favour paid something");
    if (!(fv.standing > c.standing)) return bail("a favour did not count for more standing than cash");

    // Standing opens work a man only gives somebody he trusts.
    const trustedOnly = Object.values(REGULAR_CALLS).flat().filter((x) => x.trust).length;
    if (!trustedOnly) return bail("no call is gated behind standing at all");
    const trustedTitles = new Set(
      Object.values(REGULAR_CALLS).flat().filter((x) => x.trust).map((x) => x.t),
    );
    state.regulars = {};
    for (let i = 0; i < 300; i++) {
      rollGigBoard();
      if ((state.gigs || []).some((g) => trustedTitles.has(g.title)))
        return bail("a stranger was offered the work reserved for a regular");
    }
    // And a man who trusts you does offer it.
    state.regulars = { dell: 9, trey: 9, hollis: 9, vic: 9 };
    let sawTrusted = false;
    for (let i = 0; i < 300; i++) {
      rollGigBoard();
      if ((state.gigs || []).some((g) => trustedTitles.has(g.title))) { sawTrusted = true; break; }
    }
    if (!sawTrusted) return bail("standing never opened the work it is supposed to open");

    // The group is people talking, so two things have to hold. The man who
    // comments on everything comments once, because a running joke at three
    // posts a week is a soundboard. And a man who trusts you always vouches
    // for you under somebody else's post, because that vouch replaced the line
    // where the game explained your standing, and a signal that only sometimes
    // appears is not a signal.
    state.preWeek = 1;
    let worst = 0, dupes = 0, lastLine = null;
    state.regulars = {}; state.lastPestLine = "";
    for (let i = 0; i < 250; i++) {
      rollGigBoard();
      const pests = (state.gigs || []).filter((g) => g.comment && g.comment.name === "Wayne");
      worst = Math.max(worst, pests.length);
      if (pests.length) {
        if (pests[0].comment.text === lastLine) dupes++;
        lastLine = pests[0].comment.text;
      }
    }
    if (worst > 1) return bail(`the man who comments on everything commented ${worst} times in one week`);
    if (dupes) return bail("he used the same line two weeks running");
    state.regulars = { dell: 5, trey: 2, hollis: 2, vic: 2 };
    let trusted = 0, vouched = 0;
    for (let i = 0; i < 250; i++) {
      rollGigBoard();
      for (const g of state.gigs || []) {
        if (standingWith(g.who) < REGULAR_TRUST) continue;
        trusted++;
        if (g.comment && g.comment.name !== "Wayne") vouched++;
      }
    }
    if (!trusted) return bail("no trusted post was ever offered, cannot check the vouch");
    if (vouched !== trusted)
      return bail(`standing went unspoken on ${trusted - vouched} of ${trusted} posts from a man who trusts you`);
    // Every post is somebody typing, at a time somebody would actually type.
    for (const g of state.gigs || []) {
      if (!g.at) return bail("a post arrived with no time on it");
      if (!g.title || g.title.length < 20) return bail("a post is too short to read as somebody asking for help");
    }

    Object.assign(state, JSON.parse(snapshot));
    return true;
  });
  if (callsOk !== true) fail("pre-season calls: " + callsOk);
  pass("the off-season group: four people posting in four voices, one pest, and standing spoken by the town");

  // ── a job on the bench used to switch the game off. At the Public Curb,
  // where everybody starts with one bay, a running restoration blocked the
  // week, both trips, the weekend at home, the re-tune and every quiet-week
  // beat, for seventy five seconds at a time. There is one clock on a job and
  // it is the real-time timer; the week is not it. ──
  const cageOk = await page.evaluate(() => {
    const snapshot = JSON.stringify(state);
    const car = state.cars[0];
    const bail = (m) => { Object.assign(state, JSON.parse(snapshot)); return m; };
    const clear = () => {
      state.pendingScene = null; state.pendingEvent = null; state.eventQueue = [];
      state.noticeQueue = []; state.cutscene = null; state.pendingUnlock = null;
      state.showStore = false; state.weekRecap = null; state.pendingRecap = null;
      state.result = null; state.view = "workshop"; state.atTrip = false;
      state.weekendHome = false; state.scavengeChoice = null; clearTabArrival();
    };
    const putJobOnBench = () => {
      state.activeRestorations = [{
        id: "smoke_job", carId: car.id, partId: PARTS[0].id, method: "diy",
        startTime: Date.now(), finishTime: Date.now() + 75000,
        weeksRequired: 1, completed: false,
      }];
    };
    state.tutorialComplete = true; state.onboardStage = 3; state.installsDone = 9;
    state.week = 6; state.seasonNumber = 1; state.money = 5000;
    state.tripsKnown = { yard: true, swap: true }; state.workshopLevel = "curb";
    state.gameOver = false; state.seasonWrap = false;

    clear(); putJobOnBench();
    if (!canAdvanceWeekCheck(false)) return bail("a job on the bench still stops the week");
    if (!quietWeekForBeat()) return bail("a job on the bench still silences the quiet-week beats");
    clear(); putJobOnBench();
    const wkBefore = state.week;
    takeWeekendHome();
    if (state.week === wkBefore)
      return bail("a man still cannot spend Sunday with his family until the water pump is done");
    clear(); putJobOnBench(); state.week = 6;
    commitScavengeTrip("junkyard");
    if (!state.atTrip) return bail("a job on the bench still blocks the Saturday trip");
    // The one clock, tested by behaviour rather than by reading the source,
    // which only proves somebody mentioned the word. A job whose weeksRequired
    // says ninety nine still finishes the moment its timer is up: the week is
    // not a second clock on the work.
    clear();
    state.activeRestorations = [{
      id: "clock_job", carId: car.id, partId: PARTS[0].id, method: "diy",
      startTime: Date.now() - 1000, finishTime: Date.now() - 1,
      weeksRequired: 99, completed: false,
    }];
    resolveCompletedRestorations(false);
    if (!state.activeRestorations.every((t) => t.id !== "clock_job" || t.completed))
      return bail("a finished job was held open by weeksRequired, so there are two clocks now");

    // ── while I'm in here ──
    clear(); putJobOnBench();
    const task = state.activeRestorations[0];
    if (!canLookInHere(task)) return bail("cannot look while a job is running");
    lookWhileInHere(task.id);
    if (!task.looked) return bail("the look did not spend itself");
    if (canLookInHere(task)) return bail("a second look was offered on the same job");
    const q = state.noticeQueue.length;
    lookWhileInHere(task.id);
    if (state.noticeQueue.length !== q) return bail("a second look on one job produced something");

    // Balance is declared, not a side effect of how many lines got written.
    if (typeof IN_HERE_ODDS === "undefined") return bail("the odds are not stated anywhere");
    const odds = Object.fromEntries(IN_HERE_ODDS);
    const worst = Object.entries(odds).sort((a, b) => b[1] - a[1])[0][0];
    if (worst === "bad") return bail("bad news is the likeliest outcome, which teaches the player not to look");
    if (odds.bad > 20) return bail(`bad news at ${odds.bad}% will train avoidance`);
    // Every kind the odds name has to have lines behind it.
    for (const [k] of IN_HERE_ODDS) {
      if (!IN_HERE_FINDS.some((f) => f.k === k)) return bail("no lines written for outcome kind: " + k);
    }
    if (IN_HERE_FINDS.length < 36)
      return bail(`only ${IN_HERE_FINDS.length} finds, a run will see repeats`);
    // And it lands where the odds say.
    const seen = {};
    for (let i = 0; i < 1200; i++) {
      state.activeRestorations[0].looked = false;
      state.noticeQueue = [];
      lookWhileInHere("smoke_job");
      const note = state.noticeQueue[state.noticeQueue.length - 1];
      const txt = (note && (note.text || note.title)) || "";
      const f = IN_HERE_FINDS.find((x) => txt.startsWith(x.t.slice(0, 30)));
      if (f) seen[f.k] = (seen[f.k] || 0) + 1;
    }
    const badPct = ((seen.bad || 0) / 1200) * 100;
    if (badPct > odds.bad + 8)
      return bail(`bad news came up ${badPct.toFixed(0)}% of the time against a stated ${odds.bad}%`);

    Object.assign(state, JSON.parse(snapshot));
    return true;
  });
  if (cageOk !== true) fail("work on the bench: " + cageOk);
  pass("a job on the bench no longer switches the game off, and buys one look under the car");

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
    if (tripKnown("swap")) { restore(); return "the yard beat gave away Pamona too"; }
    resolvePendingScene(1);                       // decline, still learns the place
    if (!tripKnown("yard")) { restore(); return "declining the Saturday forgot the place exists"; }
    if (!marketTabEarned("trip") || marketTabLock("trip")) { restore(); return "the pill is earned but still locked"; }
    // Pamona is not a destination yet.
    clr(); commitScavengeTrip("swap");
    if (state.atTrip) { restore(); return "the swap was reachable before its own beat"; }
    // After a Saturday out, with the money game open.
    clr(); state.scavengeTripsTaken = 1; state.onboardStage = 2; state.atTrip = false;
    if (!maybeTriggerSwapIntro()) { restore(); return "the swap beat never fired"; }
    if (!state.pendingScene || state.pendingScene.id !== "swap_intro") { restore(); return "wrong scene queued for the swap"; }
    resolvePendingScene(0);
    if (!tripKnown("swap")) { restore(); return "the swap beat did not open Pamona"; }
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
                    tab: state.marketTab, view: state.view, cars: state.cars.slice(),
                    lotKnown: state.lotKnown, lotIntroSeason: state.lotIntroSeason };
    const setup = (season, wifeSold, tab) => {
      state.onboardStage = 3; state.pendingUnlock = null; clearTabArrival();
      state.noticeQueue = []; state.tripsKnown = { yard: true, swap: true };
      state.seasonNumber = season; state.wifeCarSold = wifeSold; state.marketTab = tab;
      setView("dealership"); renderMainContent(true);
      return document.getElementById("appContent").innerText;
    };
    const restore = () => {
      Object.assign(state, { seasonNumber: stash.season, wifeCarSold: stash.wife,
        onboardStage: stash.stage, marketTab: stash.tab, cars: stash.cars, noticeQueue: [],
        lotKnown: stash.lotKnown, lotIntroSeason: stash.lotIntroSeason, pendingScene: null, eventQueue: [] });
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
    // Her car is the page: its own listing card, and no headline stacked on it.
    if (!document.querySelector(".wife-lst") || !/her daily driver/i.test(t1)) return bail("her car lost its own listing");
    // Her car is pictured, like every car on the site: her sedan in your
    // driveway with his card in the back window, and the one red button.
    const card = document.querySelector(".wife-lst");
    if (!card) return bail("her car is a text box again, not a listing");
    const photo = card.querySelector("svg.lst-art");
    if (!photo || photo.querySelectorAll("rect").length < 200) return bail("her listing has no photo of the car");
    if (!photo.querySelector('rect[fill="#f4efe2"]')) return bail("the FOR SALE card is missing from her back window");
    const sellBtn = card.querySelector("button");
    if (!sellBtn || sellBtn.getAttribute("onclick") !== "sellWifeCar()") return bail("her listing lost its button");
    // Decision made: nothing legitimate left to sell this season.
    setup(1, true, "sell");
    if (marketTabEarned("sellcar")) return bail("Sell Cars lingers after her car is gone");
    // Season two opens both, and it is a business again.
    if (state.cars.length < 2)
      state.cars.push({ ...JSON.parse(JSON.stringify(state.cars[0])), id: 90210 });
    setup(2, true, "sell");
    // Season two opens the lot, but with a person rather than a date: it stays
    // shut until Dale comes by about his back lot, the way the yard and the
    // swap each wait for a friend. So check both halves, not just the second.
    state.lotKnown = false;
    if (marketTabEarned("buy")) return bail("the lot opened in season two before anyone told you about it");
    state.pendingScene = null; state.eventQueue = [];
    if (!maybeQueueDaleBackLot()) return bail("Dale never came by about the back lot");
    state.pendingScene = null; state.eventQueue = [];
    if (maybeQueueDaleBackLot()) return bail("Dale came by about the back lot twice");
    if (!marketTabEarned("buy")) return bail("the lot never opened in season two");
    if (!marketTabEarned("sellcar")) return bail("Sell Cars never came back in season two");
    const t2 = setup(2, true, "sellcar");
    if (!/flip a build/i.test(t2) || !/list a build for sale/i.test(t2))
      return bail("season two did not restore the flipping business");
    if (document.querySelector(".wife-lst")) return bail("her car is still listed after it was sold");
    // Safety valve outranks all of it: an empty garage always reaches the lot.
    const cars = state.cars; state.cars = []; state.seasonNumber = 1;
    const stranded = marketTabEarned("buy") && !marketTabLock("buy");
    state.cars = cars;
    if (!stranded) return bail("a player with an empty garage cannot reach the lot");
    restore();
    return true;
  });
  if (seasonOneOk !== true) fail("season one shape: " + seasonOneOk);
  pass("season one is one truck: lot shut, only her car can change hands, and season two's lot waits for Dale");

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

  // ── nothing on screen ever says "undefined" ──
  // The emoji pass deleted the `a:` avatar fields from character DMs and two
  // render sites still interpolated them, so some DMs printed the literal
  // word over the profile disc. Deleting a data field is exactly the change
  // that leaves this behind, and it is invisible to every other check here.
  const noUndefOk = await page.evaluate(() => {
    const snap = {
      dms: state.characterDMs, thread: state.wifeThread, deal: state.pendingBrandDeal,
      collab: state.collabAvailable, app: state.phoneApp, view: state.view,
    };
    state.characterDMs = []; state.wifeThread = [];
    pushCharacterDM({ id: "qa-buck", h: "@BuckStallion67", c: "red", t: "qa line" });
    pushCharacterDM({ id: "qa-rival", h: "@Harlow", c: "gold", t: "qa line" });
    pushWifeMessage("qa line from her", "wife-week");
    state.pendingBrandDeal = {
      brand: "Snap-It Tools", offeredWeek: state.week,
      followerBonus: Math.max(10, Math.round((state.followers || 1000) * 0.015)),
    };
    state.collabAvailable = true;
    const bad = [];
    const scan = (where) => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          for (let e = n.parentElement; e; e = e.parentElement) {
            const t = e.tagName;
            if (t === "SCRIPT" || t === "STYLE" || t === "TEMPLATE")
              return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let n;
      while ((n = w.nextNode()))
        if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(n.nodeValue))
          bad.push(where + ": " + n.nodeValue.trim().slice(0, 60));
    };
    ["workshop", "career", "dealership", "shows"].forEach((v) => {
      setView(v); render("full"); scan(v);
    });
    ["home", "messages", "wife"].forEach((a) => {
      setView("career"); setPhoneApp(a); render("full"); scan("phone:" + a);
    });
    state.characterDMs = snap.dms; state.wifeThread = snap.thread;
    state.pendingBrandDeal = snap.deal; state.collabAvailable = snap.collab;
    setPhoneApp(snap.app || "home"); setView(snap.view); render("full");
    return bad.length ? bad.slice(0, 3).join(" | ") : true;
  });
  if (noUndefOk !== true) fail("stray placeholder on screen: " + noUndefOk);
  pass("no screen prints undefined, NaN or [object Object]");

  // ── follower counts read like a counter, not like a float ──
  // This has been wrong twice: the sponsor ladder top printed "1000.0K", and
  // after that was patched a player chasing four hundred and thirty thousand
  // followers still watched "430.0K". Two rules, and the rounding has to
  // happen before the decision or 99,999 slips through as "100.0K".
  const fmtFOk = await page.evaluate(() => {
    const cases = [0, 1, 999, 1000, 1050, 1500, 9999, 10000, 12300, 99900,
                   99999, 100000, 430000, 999499, 999999, 1000000, 1049999,
                   1234567, 2000000, 1e7, 12500000];
    const out = cases.map((n) => [n, fmtF(n)]);
    const trailing = out.filter(([, t]) => /\.0(K|M)?$/.test(t));
    if (trailing.length)
      return "a round number kept its decimal: " + trailing.map((x) => x.join(" -> ")).join(", ");
    // Nothing stays in thousands once it has rounded past a thousand of them.
    const fourDigitK = out.filter(([, t]) => /^\d{4,}(\.\d)?K$/.test(t));
    if (fourDigitK.length)
      return "should have rolled over to millions: " + fourDigitK.map((x) => x.join(" -> ")).join(", ");
    const want = { 999: "999", 1000: "1K", 12300: "12.3K", 99999: "100K",
                   430000: "430K", 999999: "1M", 1000000: "1M", 1234567: "1.2M",
                   2000000: "2M" };
    for (const [n, t] of Object.entries(want)) {
      const got = fmtF(Number(n));
      if (got !== t) return `fmtF(${n}) is "${got}", expected "${t}"`;
    }
    return true;
  });
  if (fmtFOk !== true) fail("follower counter: " + fmtFOk);
  pass("follower counts round like a counter, no 430.0K");

  // ── the wall and the bill. The show card used to be a form, then every
  // open show was a full poster: seven and a half screens of them by the end
  // of a late season. It is Dale's calendar now, one poster for the show you
  // are looking at and a compact row for everything else that Saturday. The
  // bill rules still hold for the one that is up, and the board's binding
  // notes hold for the wall: today first, the pick snaps back when the week
  // moves, purses stay in the rows, the last Saturday is marked, a blank
  // square never claims you skipped, and the handwriting ships in the file. ──
  const flyerOk = await page.evaluate(() => {
    const stash = { stage: state.onboardStage, view: state.view, hist: state.history,
                    money: state.money, fuel: state.fuel, act: state.activeRestorations,
                    season: state.seasonNumber, week: state.week, pick: state.calPick,
                    entered: state.enteredShowsThisWeek };
    state.onboardStage = 3; state.pendingUnlock = null; clearTabArrival();
    state.noticeQueue = []; state.money = 90000; state.fuel = 60; state.activeRestorations = [];
    const c = currentCar();
    const car0 = { e: c.engine, t: c.transmission, b: c.brakes, s: c.steering };
    c.engine = 70; c.transmission = 65; c.brakes = 65; c.steering = 65;
    const restore = () => {
      Object.assign(c, { engine: car0.e, transmission: car0.t, brakes: car0.b, steering: car0.s });
      Object.assign(state, { onboardStage: stash.stage, history: stash.hist, money: stash.money,
        fuel: stash.fuel, activeRestorations: stash.act, seasonNumber: stash.season,
        week: stash.week, calPick: stash.pick, enteredShowsThisWeek: stash.entered,
        noticeQueue: [] });
      setView(stash.view); render("full");
    };
    // A ladder deep enough that every tier is reachable at once.
    const ladder = [];
    for (let i = 0; i < 6; i++) ladder.push({ tier: "Cars & Coffee", place: 1, show: 0 });
    for (let i = 0; i < 8; i++) ladder.push({ tier: "Local", place: 1, show: 1 });
    for (let i = 0; i < 6; i++) ladder.push({ tier: "Regional", place: 1, show: 2 });
    // Week 4 runs a coffee meet, a Local and a Regional: both paper weights.
    ladder.push({ tier: "Local", place: 2, week: 2, season: 1, show: "Local Car Show" });
    ladder.push({ tier: "Local", place: 1, week: 3, show: "Local Car Show" });
    state.history = ladder;
    state.seasonNumber = 1; state.week = 4; state.enteredShowsThisWeek = []; state.calPick = null;
    setView("shows"); render("full");
    const res = (() => {
      const bills = () => [...document.querySelectorAll(".bill")];
      if (bills().length !== 1) return bills().length + " posters up, the wall carries one";
      if (document.querySelector(".panel.show-card"))
        return "the old show card is still rendering";
      if (document.querySelector("#appContent .cat-pill-row"))
        return "the tier filter is back on the show board";
      // Dale's calendar is a month to a page. It opens on today's month with
      // today circled and picked, and between them the pages carry every
      // Saturday of the season exactly once.
      const sat = (w) => document.querySelector(`.mcal-sat[data-week="${w}"]`);
      if (!sat(4) || !sat(4).classList.contains("today") || !sat(4).classList.contains("sel"))
        return "the wall did not open on today";
      // A finish written down this season is scribbled in; one from before
      // the calendar (no season on it) leaves the square blank.
      if (!sat(2) || !/2nd/.test(sat(2).textContent)) return "this season's finish is missing from its Saturday";
      if (!sat(3) || /1st/.test(sat(3).textContent)) return "a result with no season on it was written on the wall";
      const seen = [];
      const pages = calMonths().length;
      for (let i = 0; i < pages; i++) {
        state.calPick = { ...calPick(), page: i }; render("full");
        document.querySelectorAll(".mcal-sat").forEach((b) => seen.push(+b.dataset.week));
        if (i === pages - 1 && !(sat(state.seasonLength) && sat(state.seasonLength).classList.contains("finale")))
          return "the last Saturday is not marked apart from the other National weeks";
      }
      if (seen.sort((a, b) => a - b).join() !== Array.from({ length: state.seasonLength }, (_, i) => i + 1).join())
        return "the month pages do not carry each Saturday of the season exactly once: " + seen.join();
      state.calPick = null; render("full");
      const rows = [...document.querySelectorAll(".srow")];
      if (rows.length < 2) return "this Saturday lists fewer than two shows";
      if (!rows.every((r) => /to win|no purse/.test(r.textContent)))
        return "a row hides its purse, and the purses were the reason to scan the old wall";
      // One way in per show. Each one used to carry a button on its row and
      // another on its poster that did the same thing.
      const ways = [...document.querySelectorAll("#appContent button")]
        .filter((b) => /beginShowEntry/.test(b.getAttribute("onclick") || ""));
      if (ways.length !== 1) return ways.length + " buttons enter a show; the poster is the one way in";
      if (!rows.every((r) => r.tagName === "BUTTON" && /calPickShow/.test(r.getAttribute("onclick") || "")))
        return "a line on the sheet does not pick its poster";
      // One board: the poster is pinned to the same cork as the paperwork.
      const board = document.querySelector(".hero-panel.corkboard");
      if (!board || !board.contains(bills()[0]) || !board.contains(document.querySelector(".mcal")))
        return "the poster and the calendar are on different boards again";
      // Both paper weights still exist, one at a time.
      const on = wallShowsForWeek(4);
      const loudOne = on.find((x) => x.tier === "Regional");
      const quietOne = on.find((x) => x.tier === "Cars & Coffee");
      if (!loudOne || !quietOne) return "week 4 did not carry a Regional and a coffee meet";
      const weights = [];
      for (const sh of [loudOne, quietOne]) {
        calPickShow(sh.id); render("full");
        const b = bills()[0];
        if ((b.querySelector(".bill-name") || {}).textContent !== sh.name) return "picking a row did not put it on the poster";
        weights.push(b.className.includes("loud") ? "loud" : "quiet");
        // One headline per bill, not nine boxes at one volume. The car art
        // rides along on the one poster and is not the bill's own furniture.
        const skip = (e) => e.closest(".poster-art");
        const boxes = [...b.querySelectorAll("*")].filter((e) => {
          if (skip(e)) return false;
          const cs = getComputedStyle(e);
          const bordered = parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0;
          const filled = cs.backgroundImage !== "none" ||
            (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent");
          const r = e.getBoundingClientRect();
          return (bordered || filled) && r.height > 10 && r.width > 20;
        }).length;
        if (boxes > 5) return "the bill is back to " + boxes + " bordered objects";
        // The tank is bolted to the board under the sheet, at a size you can
        // read, with the trip drawn on the dial and nothing spelled out.
        const tank = document.querySelector(".wall-mid .wall-tank");
        if (!tank || !tank.querySelector(".fuel-needle")) return "the tank gauge lost its needle on the board";
        if (b.querySelector(".fuel-gauge")) return "the tank went back onto the poster";
        if (tank.querySelector(".fuel-gauge").getBoundingClientRect().width < 110) return "the tank gauge shrank under 110px wide";
        if (!tank.querySelector(".fuel-trip")) return "the trip's gallons are not marked on the gauge";
        if (/your tank|this trip takes/i.test(tank.textContent)) return "the tank is spelling out its gallons again";
      }
      if (weights.join() !== "loud,quiet") return "both paper weights should still exist: " + weights.join();
      // Nobody prints a checklist or a validation bar on a poster.
      if (document.querySelector(".show-prep, .prep-block, .prep-clear, .show-payout"))
        return "the checklist or the payout table survived onto the bill";
      // Each show carries its own count. Six Local shows all claiming to be
      // the same annual would be a spreadsheet wearing a costume.
      const annuals = SHOWS_MASTER.map((sh) => showBillLine(sh)).filter((t) => /Annual/.test(t));
      if (annuals.length < 2) return "no bill is dated";
      if (new Set(annuals).size !== annuals.length)
        return "two shows claim the same annual: " + annuals.join(" | ");
      const weekly = SHOWS_MASTER.find((sh) => sh.tier === "Cars & Coffee" && sh.cadence === 1);
      if (weekly && /Annual/.test(showBillLine(weekly)))
        return "a weekly coffee meet is claiming an annual";
      // And it climbs with the seasons, without the game ever saying so.
      const s1 = showBillLine(loudOne);
      state.seasonNumber = 3;
      const s3 = showBillLine(loudOne);
      state.seasonNumber = 1;
      if (s1 === s3) return "the annual count does not move with the season";
      // A Saturday still to come says how far off it is, never "wk 7".
      calSelect(7); render("full");
      const future = [...document.querySelectorAll(".srow-stat")].map((b) => b.textContent);
      if (!future.length || !future.every((t) => t === "3 wks out"))
        return "future rows should read 3 wks out: " + future.slice(0, 3).join(", ");
      // Advance the week and the wall is back on today.
      state.week = 5; render("full");
      if (calPick().w !== 5 || !document.querySelector('.mcal-sat.today.sel[data-week="5"]'))
        return "the wall stayed on a picked Saturday after the week moved";
      // Her hand and Dale's marker ship in the file. The Deck has neither.
      const fams = [...document.fonts].map((f) => f.family.replace(/["']/g, ""));
      if (!fams.includes("Dale Marker") || !fams.includes("Her Hand"))
        return "the calendar's handwriting is not embedded";
      return true;
    })();
    restore();
    return res;
  });
  if (flyerOk !== true) fail("the wall: " + flyerOk);
  pass("the wall: Dale's calendar, one poster, purses in the rows, today first");

  // ── her card on the workbench. The $1,000 birthday card used to be a 30%
  // roll every week from week 13, which a calendar could never show. It is a
  // date now: written on Dale's calendar in her hand, and the card turns up
  // the week it is written in, not before. ──
  const bdayDateOk = await page.evaluate(() => {
    const stash = { got: state.birthdayReceived, bw: state.birthdayWeek, week: state.week, money: state.money,
                    view: state.view, pick: state.calPick, q: state.noticeQueue, stage: state.onboardStage,
                    pre: state.preWeek, unlock: state.pendingUnlock };
    const restore = () => {
      Object.assign(state, { birthdayReceived: stash.got, birthdayWeek: stash.bw, week: stash.week,
        money: stash.money, calPick: stash.pick, noticeQueue: stash.q || [], onboardStage: stash.stage,
        preWeek: stash.pre, pendingUnlock: stash.unlock });
      setView(stash.view); render("full");
    };
    const res = (() => {
      state.birthdayReceived = false; state.birthdayWeek = 15; state.week = 15; state.calPick = null;
      state.onboardStage = 3; state.preWeek = 0; state.pendingUnlock = null; clearTabArrival();
      setView("shows"); render("full");
      if (state.view !== "shows") return "could not open Compete to read the calendar";
      const written = [...document.querySelectorAll(".mcal-her")].some((n) => /your bday/.test(n.textContent));
      if (!written) return "the birthday is not written on its page";
      state.week = 14; maybeTriggerBirthday();
      if (state.birthdayReceived) return "the card arrived a week before the date on the calendar";
      state.week = 15; maybeTriggerBirthday();
      if (!state.birthdayReceived) return "the card never arrived on the week the calendar says";
      return true;
    })();
    restore();
    return res;
  });
  if (bdayDateOk !== true) fail("birthday: " + bdayDateOk);
  pass("the birthday card turns up the week Dale's calendar says, not on a roll");

  // ── a running truck and no Compete tab. Compete opened only after a
  // take-off part was listed, and nothing said so, so a player who just kept
  // wrenching was locked out for the whole season while the Build tab told
  // them "Time to compete". The banner tells the truth at each stage now, and
  // the week after the Marketplace opens, Compete opens without a listing. ──
  const unlockOk = await page.evaluate(() => {
    const car = currentCar();
    const stash = JSON.parse(JSON.stringify({
      stage: state.onboardStage, inv: state.partsInventory, flw: state.firstListingWeek,
      mow: state.marketOpenedWeek ?? null, pu: state.pendingUnlock, week: state.week,
      hist: state.history, view: state.view, pre: state.preWeek, act: state.activeRestorations,
      tc: state.tutorialComplete, e: car.engine, t: car.transmission, b: car.brakes, s: car.steering,
    }));
    const restore = () => {
      Object.assign(state, { onboardStage: stash.stage, partsInventory: stash.inv,
        firstListingWeek: stash.flw, marketOpenedWeek: stash.mow, pendingUnlock: stash.pu,
        week: stash.week, history: stash.hist, preWeek: stash.pre, activeRestorations: stash.act,
        tutorialComplete: stash.tc, noticeQueue: [] });
      Object.assign(car, { engine: stash.e, transmission: stash.t, brakes: stash.b, steering: stash.s });
      setView(stash.view); render("full");
    };
    const res = (() => {
      state.tutorialComplete = true; state.preWeek = 0; state.history = []; state.activeRestorations = [];
      state.onboardStage = 1; state.pendingUnlock = null; state.partsInventory = [];
      state.firstListingWeek = null; delete state.marketOpenedWeek; state.week = 3;
      car.engine = 70; car.transmission = 70; car.brakes = 70; car.steering = 70;
      checkOnboardUnlocks();
      if (state.onboardStage !== 2) return "a roadworthy truck did not open the Marketplace";
      state.pendingUnlock = null;
      setView("workshop"); render("full");
      const txt = document.getElementById("appContent").innerText;
      if (/time to compete/i.test(txt)) return "the Build tab says Time to compete with no Compete tab";
      if (!/Marketplace/.test(txt)) return "the roadworthy banner does not point at what opens Compete";
      // Nothing listed, a week goes by.
      checkOnboardUnlocks();
      if (state.onboardStage !== 2) return "Compete opened the same week as the Marketplace";
      state.week += 1;
      checkOnboardUnlocks();
      if (state.onboardStage !== 3) return "Compete never opened for a player who did not list a part";
      if (!/Nobody needed a listing/.test((state.pendingUnlock || {}).text || ""))
        return "the Compete card credits listings the player never made";
      state.pendingUnlock = null; render("full");
      if (!/time to compete/i.test(document.getElementById("appContent").innerText))
        return "Time to compete went missing once Compete was open";
      return true;
    })();
    restore();
    return res;
  });
  if (unlockOk !== true) fail("compete unlock: " + unlockOk);
  pass("a running truck opens Compete a week later, listing or not, and the banner says what is next");

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

  // ── Space is the realty office window on Main St: a listing sheet per
  // work space, the one you have marked SOLD, the next one up the only one
  // you can call about, and every line of ink on the sheets 4.5:1 against
  // what it sits on, broke or flush. ──
  const paperOk = await page.evaluate(() => {
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const stash = { stage: state.onboardStage, money: state.money, view: state.view, sub: state.shopSub,
                    level: state.workshopLevel, installs: state.installsDone };
    const restore = () => {
      Object.assign(state, { onboardStage: stash.stage, money: stash.money, workshopLevel: stash.level,
        installsDone: stash.installs, shopSub: stash.sub });
      setView(stash.view); render("full");
    };
    const worst = [];
    for (const money of [300, 99999]) {
      state.onboardStage = 3; state.installsDone = Math.max(8, state.installsDone || 0);
      state.workshopLevel = "carport"; state.money = money;
      setView("workshop"); state.shopSub = "workspace"; render("full");
      const sheets = [...document.querySelectorAll("#appContent .re-window .re-sheet")];
      if (sheets.length !== WORKSPACE_LEVELS.length - 1) { restore(); return `the window holds ${sheets.length} listings, the ladder has ${WORKSPACE_LEVELS.length - 1}`; }
      if (!sheets[0].classList.contains("sold") || !/sold/i.test(sheets[0].textContent)) { restore(); return "the carport you own is not marked SOLD"; }
      const calls = sheets.map((sh) => sh.querySelector('button[onclick="upgradeWorkspace()"]')).filter(Boolean);
      if (calls.length !== 1 || calls[0].closest(".re-sheet") !== sheets[1]) { restore(); return "the storage unit is not the one listing you can call about"; }
      if (money > 9000 && calls[0].disabled) { restore(); return "a flush player cannot call about the next listing"; }
      for (const sh of sheets) for (const el of sh.querySelectorAll("*")) {
        const txt = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (!txt || el.closest(".btn:not(:disabled)")) continue;
        let bgEl = el, bg = null;
        for (; bgEl && bgEl !== document.body; bgEl = bgEl.parentElement) { const c = parse(getComputedStyle(bgEl).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) { bg = c.slice(0, 3); break; } }
        if (!bg) continue;
        let a = 1; for (let e = el; e && e !== sh.parentElement; e = e.parentElement) a *= parseFloat(getComputedStyle(e).opacity);
        const fg = parse(getComputedStyle(el).color);
        a *= fg[3] === undefined ? 1 : fg[3];
        const mix = fg.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a));
        const L1 = lum(mix), L2 = lum(bg);
        const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        if (r < 4.5) worst.push(`"${el.textContent.trim().slice(0, 30)}" at ${r.toFixed(1)}:1`);
      }
    }
    restore();
    return worst.length ? worst.slice(0, 4).join(", ") : true;
  });
  if (paperOk !== true) fail("realty window: " + paperOk);
  pass("Space is the realty window: SOLD on yours, one listing to call about, ink at 4.5:1");

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
    if (!(state.gigs || []).length) return "nobody called in the pre-season";
    // Side work pays in four currencies now, so "did it pay" is no longer a
    // question about money. Answering a call always moves something: cash, the
    // inventory, the tool box, or the standing that decides who rings next.
    const before = { money: state.money, inv: (state.partsInventory || []).length,
                     tools: (state.ownedTools || []).length };
    const g = state.gigs.find((x) => !x.done);
    const standBefore = standingWith(g.who);
    doGig(g.id);
    if (!g.done) return "the call could not be answered at all";
    const moved =
      state.money > before.money ||
      (state.partsInventory || []).length > before.inv ||
      (state.ownedTools || []).length > before.tools;
    if (!moved && g.kind !== "favour") return "answering a paying call moved nothing";
    if (standingWith(g.who) <= standBefore) return "answering a call earned no standing";
    // reset back to the competitive season for the rest of the suite
    state.preWeek = 0; state.week = 1; state.gigs = []; state.regulars = {};
    return true;
  });
  if (preOk !== true) fail("pre-season: " + preOk);
  pass("pre-season ramp (season 2+): shows locked, the phone rings and answering moves something");

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
    // Workspace ladder: every listing in the window, no padlocks; a rung past
    // the next one says in words what has to come first.
    setView("workshop"); setShopSub("workspace"); render("full");
    const lockedRows = [...document.querySelectorAll("#appContent .re-sheet")]
      .filter((r) => /🔒/.test(r.textContent));
    if (lockedRows.length) return "workspace ladder still renders " + lockedRows.length + " locked row(s)";
    const far = [...document.querySelectorAll("#appContent .re-sheet")].slice(workshopIdx() + 1);
    if (far.length && !far.some((sh) => /after the/i.test(sh.textContent)))
      return "workspace ladder lost the line naming what is above";
    return true;
  });
  if (shopUiOk !== true) fail("locked pills: " + shopUiOk);
  pass("hide-don't-lock holds inside Marketplace, Compete and the workspace ladder");

  // ── All Builds is the parts catalog. Every part and every extra is
  // printed exactly once, a missing tool is named in Dale's hand where the
  // ORDER button would be, nothing printed is yellow (yellow is a button),
  // ORDER starts the job, and the page corners wrap around the book. ──
  const catOk = await page.evaluate(() => {
    const car = currentCar();
    const keep = { money: state.money, tasks: state.activeRestorations.slice(), parts: car.installedParts.slice(), tools: state.ownedTools.slice(), sub: state.shopSub, cat: state.shopCat, spread: state.catalogSpread };
    const back = (m) => { state.money = keep.money; state.activeRestorations = keep.tasks; car.installedParts = keep.parts; state.ownedTools = keep.tools; state.shopSub = keep.sub; state.shopCat = keep.cat; state.catalogSpread = keep.spread; render("full"); return m; };
    const book = ptcBook(car);
    const printed = book.pages.flatMap((p) => p.items.flatMap((it) => it.sec.extras ? [] : it.b.ids));
    const extras = book.pages.flatMap((p) => p.items.flatMap((it) => it.sec.extras ? it.b.ids : []));
    for (const p of PARTS) if (printed.filter((id) => id === p.id).length !== 1) return back(`part ${p.id} (${p.name}) is printed ${printed.filter((id) => id === p.id).length} times`);
    for (const e of EXTRAS) if (extras.filter((id) => id === e.id).length !== 1) return back(`extra ${e.id} is printed ${extras.filter((id) => id === e.id).length} times`);
    // A part whose tool is missing: Dale writes it in, and there is no ORDER.
    state.ownedTools = ["t1"]; car.installedParts = []; state.activeRestorations = []; state.money = 50000;
    const p = PARTS.find((x) => x.tier === "Budget" && (x.tools || []).some((t) => !hasToolFor(t)));
    setView("workshop"); catalogGo(p.category); render("full");
    const row = document.querySelector(`.ptc-row[data-part="${p.id}"]`);
    if (!row) return back(`part ${p.id} is not on the spread its flag opens`);
    if (row.querySelector(".ptc-order")) return back("a row with a missing tool still offers ORDER");
    const ink = row.querySelector(".ptc-ink");
    if (!ink || !/^need /.test(ink.textContent)) return back("a missing tool is not named on its row");
    // Yellow means press me. Anything yellow that is not a button is a lie.
    const yellow = (c) => { const m = c.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?/); if (!m) return false; const a = m[4] === undefined ? 1 : +m[4]; return a > 0.15 && +m[1] > 190 && +m[2] > 140 && +m[3] < 120 && +m[1] - +m[3] > 110; };
    for (let i = 0; i < book.spreads; i++) {
      state.catalogSpread = i; render("full");
      const bad = [...document.querySelectorAll(".ptc-spread *")].find((el) => {
        if (el.closest("button")) return false;
        const cs = getComputedStyle(el);
        return yellow(cs.backgroundColor) || (yellow(cs.color) && el.textContent.trim());
      });
      if (bad) return back(`spread ${i}: printed yellow on ${bad.className || bad.tagName} "${bad.textContent.trim().slice(0, 24)}"`);
    }
    // ORDER starts your own job and the row goes on the lift.
    state.ownedTools = TOOLS_LIST.map((t) => t.id); catalogGo("brakes"); render("full");
    const btn = document.querySelector('.ptc-row[data-part="132"] .ptc-order');
    if (!btn || btn.disabled) return back("ORDER is missing or dead on a part you can afford and do");
    btn.click(); render("full");
    const t = findActiveTask(car.id, 132);
    if (!t || t.method !== "diy") return back("ORDER did not start a DIY job");
    if (!document.querySelector('.ptc-row[data-part="132"].lift')) return back("the row did not go on the lift");
    // The corners wrap: back from the first spread is the last one.
    state.catalogSpread = 0; catalogTurn(-1);
    if (state.catalogSpread !== book.spreads - 1 || state.shopSub !== "extras") return back("turning back from page one did not wrap to Extras");
    return back(true);
  });
  if (catOk !== true) fail("parts catalog: " + catOk);
  pass("parts catalog prints every part once, names missing tools, keeps yellow for buttons, ORDER works");

  // ── Tools is an aisle at Bay Freight. Every tool is stocked on exactly
  // one aisle, the art paints, the six aisle signs walk the store, a yellow
  // shelf sign buys the tool and turns into an owned sticker, and nothing
  // that is not a button is yellow. ──
  const storeOk = await page.evaluate(() => {
    const car = currentCar();
    const keep = { money: state.money, tools: state.ownedTools.slice(), ws: state.workshopLevel, st: state.toolStorageLevel, sub: state.shopSub, aisle: state.toolAisle, first: state.firstToolPurchased };
    const back = (m) => { Object.assign(state, { money: keep.money, ownedTools: keep.tools, workshopLevel: keep.ws, toolStorageLevel: keep.st, shopSub: keep.sub, toolAisle: keep.aisle, firstToolPurchased: keep.first }); render("full"); return m; };
    for (const t of TOOLS_LIST) {
      let n = 0;
      for (let a = 1; a <= HFS.SIGNS.length; a++) n += HFS.spots(a).filter((s) => s.id === t.id).length;
      if (n !== 1) return back(`${t.name} is stocked ${n} times`);
    }
    state.money = 5000; state.ownedTools = []; state.workshopLevel = "carport"; state.toolStorageLevel = "crate";
    setView("workshop"); setShopSub("tools"); state.toolAisle = 3; render("full");
    const img = document.querySelector(".hfs .hfs-art");
    if (!img || !/^data:image\/png;base64,.{2000}/.test(img.getAttribute("src") || "")) return back("the aisle art did not paint");
    const hits = document.querySelectorAll(".hfs .hfs-hit");
    if (hits.length !== HFS.SIGNS.length) return back(`${hits.length} aisle signs, the store has ${HFS.SIGNS.length}`);
    hits[0].click(); render("full");
    if (state.toolAisle !== 1) return back("an aisle sign did not walk to its aisle");
    state.toolAisle = 3; render("full");
    const sign = [...document.querySelectorAll(".hfs > .hfs-tag")].find((b) => /multimeter/i.test(b.textContent));
    if (!sign || sign.disabled) return back("the multimeter's shelf sign is missing or dead");
    sign.click(); render("full");
    if (!state.ownedTools.includes("t13")) return back("the shelf sign did not buy the tool");
    if (![...document.querySelectorAll(".hfs > .hfs-own")].some((b) => /multimeter/i.test(b.textContent))) return back("a bought tool did not get its sticker");
    const yellow = (c) => { const m = c.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?/); if (!m) return false; const a = m[4] === undefined ? 1 : +m[4]; return a > 0.15 && +m[1] > 190 && +m[2] > 140 && +m[3] < 120 && +m[1] - +m[3] > 110; };
    for (let a = 1; a <= HFS.SIGNS.length; a++) {
      state.toolAisle = a; render("full");
      const bad = [...document.querySelectorAll(".hfs-view *")].find((el) => !el.closest("button") && (yellow(getComputedStyle(el).backgroundColor) || (yellow(getComputedStyle(el).color) && el.textContent.trim())));
      if (bad) return back(`aisle ${a}: yellow on ${bad.className || bad.tagName}, which is not a button`);
    }
    return back(true);
  });
  if (storeOk !== true) fail("tool store: " + storeOk);

  // ── Next Jobs is Dale's ticket rail: one repair order per suggested job,
  // parts-only starts it yourself, parts-and-labor sends it to Dale, a
  // missing tool walks to its aisle at Bay Freight, the shop-floor banner is
  // written on the rail instead of repeated over the car, and nothing that
  // is not a button is yellow. ──
  const railOk = await page.evaluate(() => {
    const car = currentCar();
    const keep = { money: state.money, tools: state.ownedTools.slice(), tasks: state.activeRestorations.slice(), parts: car.installedParts.slice(), sub: state.shopSub, aisle: state.toolAisle, ws: state.workshopLevel, cats: CATS.map((k) => car[k]) };
    const back = (m) => { Object.assign(state, { money: keep.money, ownedTools: keep.tools, activeRestorations: keep.tasks, shopSub: keep.sub, toolAisle: keep.aisle, workshopLevel: keep.ws }); car.installedParts = keep.parts; CATS.forEach((k, i) => (car[k] = keep.cats[i])); render("full"); return m; };
    CATS.forEach((k) => (car[k] = 18)); car.installedParts = []; state.activeRestorations = [];
    state.money = 6000; state.ownedTools = ["t1", "t14", "t18", "t2"]; state.workshopLevel = "carport";
    setView("workshop"); setShopSub("suggested"); render("full");
    const want = getSuggestedRestorations(car).slice(0, isPhoneWidth() ? 2 : 3).map((x) => String(x.part.id));
    const got = [...document.querySelectorAll(".ro-row .ro")].map((t) => t.dataset.part);
    if (!got.length) return back("the rail hung no repair orders");
    if (got.join() !== want.join()) return back(`the rail shows ${got.join()} but the suggestions are ${want.join()}`);
    if (/Not roadworthy yet/.test(document.querySelector(".grid-main .hero-panel").innerText)) return back("the roadworthy banner is on the shop floor and the rail both");
    if (!/not roadworthy yet/.test((document.querySelector(".ro-tape") || {}).textContent || "")) return back("the rail's tape does not say what keeps her off the road");
    const diy = document.querySelector(".ro .ro-box.diy:not([disabled])");
    if (!diy) return back("no parts-only box to press");
    const pid = +diy.closest(".ro").dataset.part;
    diy.click(); render("full");
    if ((findActiveTask(car.id, pid) || {}).method !== "diy") return back("parts-only did not start the job yourself");
    state.activeRestorations = []; render("full");
    const shop = document.querySelector(".ro .ro-box.shop:not([disabled])");
    const sid = +shop.closest(".ro").dataset.part;
    shop.click(); render("full");
    if ((findActiveTask(car.id, sid) || {}).method !== "shop") return back("parts-and-labor did not send it to Dale");
    state.activeRestorations = []; state.ownedTools = []; render("full");
    const go = document.querySelector(".ro .ro-go");
    if (!go) return back("a job missing its tool did not point at Bay Freight");
    go.click(); render("full");
    if (state.shopSub !== "tools" || !state.toolAisle) return back("the Bay Freight note did not walk to the store");
    state.ownedTools = ["t1", "t14", "t18", "t2"]; setShopSub("suggested"); render("full");
    const yellow = (c) => { const m = c.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?/); if (!m) return false; const a = m[4] === undefined ? 1 : +m[4]; return a > 0.15 && +m[1] > 190 && +m[2] > 140 && +m[3] < 120 && +m[1] - +m[3] > 110; };
    const bad = [...document.querySelectorAll(".ro-row *")].find((el) => !el.closest("button") && (yellow(getComputedStyle(el).backgroundColor) || (yellow(getComputedStyle(el).color) && el.textContent.trim())));
    if (bad) return back(`yellow on ${bad.className || bad.tagName} on the rail, which is not a button`);
    return back(true);
  });
  if (railOk !== true) fail("ticket rail: " + railOk);
  pass("Next Jobs hangs a repair order per suggestion; both boxes start the job; a missing tool walks to Bay Freight");
  pass("Bay Freight stocks every tool once, its signs walk the aisles, a shelf sign buys, yellow stays on buttons");

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
    // CAT_ICONS is gone: the pills carry their name and sit under a shop
    // heading, so a per-category glyph was decoration with a lookup table.
    if (!need.every((c) => CATS.includes(c) && CAT_LABELS[c]))
      return "a new cat is missing from CATS or its labels";
    if (typeof CAT_ICONS !== "undefined")
      return "CAT_ICONS came back";
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

  // ── the shop log is a page in the spiral book, filled in by pen ──
  const logOk = await page.evaluate(() => {
    const snap = { recap: state.weekRecap, pending: state.pendingRecap, view: state.view };
    state.weekRecap = { week: 6, money: -240, installs: 2, idle: false, followers: 35 };
    const shown = renderWeekRecapModal();
    const root = document.getElementById("modalRoot");
    const pg = root.querySelector(".log-page");
    const done = (m) => { state.weekRecap = snap.recap; state.pendingRecap = snap.pending; root.innerHTML = ""; return m; };
    if (!shown || !pg) return done("the shop log page did not open");
    if (!pg.querySelector(".log-rings")) return done("the page lost its spiral");
    const t = pg.textContent;
    if (!/-\$240/.test(t) || !pg.querySelector(".log-v.down")) return done("a losing week is not in red ink");
    if (!/Parts in/i.test(t) || !/\+2/.test(t)) return done("the parts put in are not logged");
    if (!/Week\s*6/i.test(t)) return done("the page is not dated to its week");
    const go = pg.querySelector('button[onclick="dismissWeekRecap()"]');
    if (!go || !/Week 7/.test(go.textContent)) return done("the page does not turn to the next week");
    return done(true);
  });
  if (logOk !== true) fail("shop log: " + logOk);
  pass("shop log: a spiral page, the week in pen, red ink for a losing week");

  // ── the results, taped to the registration table ──
  // Drive renderResult() directly with synthetic results so the assertions
  // don't depend on which show the RNG happened to offer. A judged axis show
  // must put the judge's clipboard on the table with every system it weighed
  // and the baseline, ring your line on the typed sheet, pin the ribbon your
  // place earned, carry the scene standing and what was said. Cars & Coffee
  // gets the sheet and the chatter, and no clipboard and no ribbon.
  const resultUiOk = await page.evaluate(() => {
    const car = currentCar();
    if (!car) return "no car to render";
    const snapResult = state.result, snapView = state.view;
    const baseStandings = [
      { name: "Buck's '67 Stallion", score: 86, isRival: true },
      { name: "Your " + car.year + " " + car.make + " " + car.model, score: 84, isPlayer: true },
      { name: "A Stranger", score: 78 },
    ];
    const common = {
      week: state.week, season: seasonNum(), car: `${car.year} ${car.make} ${car.model}`,
      prize: 1200, bonusCash: 0, fee: 60, localSponsorCovered: false,
      fuelUsed: 10, net: 1140, gained: 45, standings: baseStandings,
      buckPlace: 1, showReward: null, arrivalLine: "arr", judgingLine: "jud",
    };
    const judged = SHOWS_MASTER.find((s) => s.axis && !isRaceShow(s.name)) || { name: "QA County Classic" };
    state.result = { ...common, show: judged.name, tier: "Regional",
      place: 2, score: 84, axis: "beauty", repDelta: 6, repTitle: "Local Legend",
      judgeCard: { label: "Paint, Chrome & Presentation", icon: "",
        overall: 71, axisScore: 84, cats: [
          { cat: "paint", w: 0.3, val: 91 }, { cat: "chrome", w: 0.25, val: 83 },
          { cat: "body", w: 0.25, val: 79 }, { cat: "interior", w: 0.15, val: 44 },
          { cat: "wheels", w: 0.05, val: 88 }] },
      rivalReactions: [
        { kicker: "NEW ALLY", color: "#87c77b", line: "ally line" },
        { kicker: "THE RIVAL", color: "#e07070", line: "buck line" }] };
    const host = document.createElement("div");
    document.body.appendChild(host);
    const bail = (m) => { host.remove(); state.result = snapResult; state.view = snapView; return m; };
    try { host.innerHTML = renderResult(); } catch (e) { return bail("renderResult threw (judged): " + e.message); }
    const clip = host.querySelector(".res-table .res-clip");
    if (!clip) return bail("the judge's clipboard is missing from a judged show");
    for (const c of ["paint", "chrome", "body", "interior", "wheels"])
      if (!clip.textContent.includes(CAT_LABELS[c])) return bail("the clipboard lost a system: " + c);
    if (!/baseline 77/.test(clip.textContent)) return bail("the clipboard does not add up to its baseline");
    if (!clip.querySelector(".res-js-v.lo")) return bail("a weak system is not ringed on the clipboard");
    const mine = host.querySelector(".res-sheet .res-row.you");
    if (!mine || !/^2\./.test(mine.textContent.trim())) return bail("your line is not the ringed one on the sheet");
    if (/^Your /.test(mine.querySelector(".res-n").textContent)) return bail("the typed sheet calls your car 'Your'");
    if (!host.querySelector(".res-sheet .res-ribbon") || !/2ND/.test(host.querySelector(".res-ribbon").textContent)) return bail("second place did not get its ribbon");
    if (!/Local Legend/.test(host.textContent) || !/\+6 rep/.test(host.textContent)) return bail("the scene standing went missing");
    if (!/buck line/.test(host.textContent) || !/ally line/.test(host.textContent)) return bail("what the scene said is missing from the margin");
    if (!host.querySelector(".res-note.red")) return bail("Buck's line is not in red pencil");
    if (!/Net/.test(host.querySelector(".res-env").textContent) || !/1,140/.test(host.querySelector(".res-env").textContent)) return bail("the prize envelope lost the net");
    if (host.querySelector(".chalkboard")) return bail("the Upcoming chalkboard is back on the results");
    if (!host.querySelector('.res-side button[onclick="leaveResultScreen()"]')) return bail("there is no way back to the garage");
    // Cars & Coffee: scene chatter, no judging and no ribbon.
    state.result = { ...common, show: "Saturday Cars & Coffee", tier: "Cars & Coffee",
      place: 1, score: 0, axis: null, repDelta: 0, repTitle: null, judgeCard: null,
      showReward: { type: "part", label: "Free Budget part unlocked", detail: "redeem it in the shop" },
      rivalReactions: [{ kicker: "AROUND THE LOT", color: "#c2a37d", line: "chatter line" }] };
    try { host.innerHTML = renderResult(); } catch (e) { return bail("renderResult threw (coffee): " + e.message); }
    if (host.querySelector(".res-clip")) return bail("the judge's clipboard leaked into Cars & Coffee");
    if (host.querySelector(".res-ribbon")) return bail("Cars & Coffee pinned a ribbon");
    if (host.querySelector(".res-env")) return bail("Cars & Coffee handed over a prize envelope");
    if (!/chatter line/.test(host.textContent)) return bail("coffee scene chatter missing");
    if (!/Free Budget part/.test((host.querySelector(".res-ticket") || {}).textContent || "")) return bail("the raffle win is missing");
    return bail(true);
  });
  if (resultUiOk !== true) fail("results UI: " + resultUiOk);
  pass("results: typed sheet rings your line, ribbon, clipboard, envelope, margin notes");

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

  // ── every way out of a Marketplace chat says something ──
  // A playtester reported the knife-guy trade "didn't do anything". It did
  // not: the resolver only ever read `choice.toast`, and 130 of the 150
  // choices carry their payoff in `choice.note`, so the chat closed in
  // silence. Trades were worse, they never completed at all, so the part
  // stayed listed and the goods were free. Both are cheap to re-break.
  const mpOk = await page.evaluate(() => {
    const flat = [];
    MARKETPLACE_SCENARIOS.forEach((sc) => {
      const steps = sc.steps && sc.steps.length ? sc.steps : [sc];
      steps.forEach((st) =>
        (st.choices || []).forEach((c) => flat.push({ sc, c })),
      );
    });
    if (flat.length < 140) return "scenario pool shrank: " + flat.length;
    // "next" continues the chain and correctly shows nothing yet.
    const mute = flat.filter(
      ({ c }) => c.outcome !== "next" && !c.note && !c.toast,
    );
    if (mute.length)
      return (
        mute.length + " choices resolve silently, first: " + mute[0].c.label
      );

    // Now drive a real trade end to end and check the part actually leaves.
    const snap = JSON.stringify({
      inv: state.partsInventory, money: state.money,
      offer: state.pendingMarketplaceOffer, listings: state.marketplaceListings,
      notices: state.noticeQueue,
    });
    const trade = MARKETPLACE_SCENARIOS.find((x) => x.id === "tradeGuns");
    if (!trade) return "tradeGuns scenario is gone";
    state.noticeQueue = [];
    state.partsInventory = [{
      id: "qa_trade", name: "QA Alternator", sourcePart: "QA", category: "electrical",
      askingPrice: 200, baselineValue: 150, listed: true, sold: false,
    }];
    state.marketplaceListings = ["qa_trade"];
    const cashBefore = state.money;
    state.pendingMarketplaceOffer = {
      itemId: "qa_trade", offer: 200, buyer: "QA Buyer", scenario: trade,
      scenarioActive: true, scenarioStep: 0, scenarioTyping: false, scenarioSaid: [],
    };
    const take = trade.choices.findIndex((c) => c.outcome === "inventoryBonus");
    respondMarketplaceScenario(take);
    const item = state.partsInventory.find((i) => i.id === "qa_trade");
    const gotGoods = state.partsInventory.some(
      (i) => i.id !== "qa_trade" && !i.sold,
    );
    const toldTheStory = (state.noticeQueue || []).some((n) =>
      (n.text || "").includes("box of knives"),
    );
    const stillListed = (state.marketplaceListings || []).includes("qa_trade");
    const paidTwice = state.money !== cashBefore + (trade.choices[take].cash || 0);
    const restore = JSON.parse(snap);
    state.partsInventory = restore.inv; state.money = restore.money;
    state.pendingMarketplaceOffer = restore.offer;
    state.marketplaceListings = restore.listings; state.noticeQueue = restore.notices;
    if (!item || !item.sold) return "a trade left the part in your inventory";
    if (stillListed) return "a trade left the listing live";
    if (!gotGoods) return "a trade paid out nothing";
    if (!toldTheStory) return "the trade resolved without showing its story";
    if (paidTwice) return "trade cash was paid twice";
    return true;
  });
  if (mpOk !== true) fail("marketplace dead ends: " + mpOk);
  pass("no Marketplace choice resolves in silence, and a trade closes the sale");

  // ── a chat window is one window. Every reply in the buyer chat rewrote the
  // whole card, and the card carries its pop-in, so answering blanked the
  // window to nothing and slid it back up. Measured on the old build: 0%
  // opacity mid-reply. Now the window stays and only the new lines rise. ──
  const chatOk = await page.evaluate(() => new Promise((done) => {
    const snap = JSON.stringify({ inv: state.partsInventory, offer: state.pendingMarketplaceOffer });
    const finish = (r) => {
      clearBuyerTyping();
      const back = JSON.parse(snap);
      state.partsInventory = back.inv; state.pendingMarketplaceOffer = back.offer;
      render("full"); done(r);
    };
    const sc = MARKETPLACE_SCENARIOS.find((x) => x.steps && x.steps.length > 1 &&
      x.steps[0].choices.some((c) => c.outcome === "next"));
    if (!sc) return finish("no multi-step buyer chat to test");
    state.partsInventory = [{ id: "qa_chat", name: "QA Carburetor", sourcePart: "QA", category: "fuel",
      askingPrice: 300, baselineValue: 280, listed: true, sold: false }];
    state.pendingMarketplaceOffer = { itemId: "qa_chat", offer: 290, buyer: "@qa_chat", message: "still available?",
      buyerType: "hold", scenario: sc, scenarioActive: true, scenarioStep: 0, scenarioTyping: false, scenarioSaid: [] };
    render("full");
    const root = document.getElementById("mpPopupRoot");
    const card0 = root.querySelector(".mp-card");
    if (!card0) return finish("the buyer chat did not open");
    setTimeout(() => {
      respondMarketplaceScenario(sc.steps[0].choices.findIndex((c) => c.outcome === "next"));
      render("full");
      let minOp = 1, frames = 0;
      const tick = () => {
        const c = root.querySelector(".mp-card");
        if (c !== card0) return finish("answering rebuilt the chat window instead of adding to it");
        minOp = Math.min(minOp, parseFloat(getComputedStyle(c).opacity));
        if (++frames < 18) return requestAnimationFrame(tick);
        if (minOp < 0.999) return finish(`the window faded to ${Math.round(minOp * 100)}% while the reply went out`);
        const risen = [...c.querySelectorAll("[data-k].mp-in")].map((n) => n.dataset.k);
        if (!risen.includes("a0")) return finish("your reply did not come in as a new line");
        if (risen.includes("q0") || risen.includes("took")) return finish("lines already on screen animated again");
        finish(true);
      };
      requestAnimationFrame(tick);
    }, 300);
  }));
  if (chatOk !== true) fail("chat window: " + chatOk);
  pass("answering a buyer adds a line to the same window; it never blinks");

  // ── the bank has its own door, the shark still has to find you ──
  // Everything behind the Loans button used to wait on the loan shark, who
  // needs five shows, which needs a truck that runs, which needs money. A
  // player who ran dry in week five had nowhere to go at all.
  const bankDoorOk = await page.evaluate(() => {
    const keys = ["loansUnlocked", "bankMentioned", "leanStreak", "week",
      "sharkMetWeek", "sharkEverTaken", "sharkLoanBalance", "history",
      "pendingScene", "pendingEvent", "money", "lifeBeatWeek", "cutscene",
      "view", "showStage", "showLoading", "seasonWrap", "gameOver",
      "tutorialComplete"];
    const snap = {}; keys.forEach((k) => (snap[k] = state[k]));
    state.loansUnlocked = false; state.bankMentioned = false;
    state.sharkMetWeek = null; state.sharkEverTaken = false;
    state.sharkLoanBalance = 0; state.history = [];
    state.pendingScene = null; state.pendingEvent = null; state.cutscene = null;
    state.view = "workshop"; state.showStage = null; state.showLoading = false;
    state.seasonWrap = null; state.gameOver = false; state.tutorialComplete = true;
    state.money = 142; state.week = 5; state.leanStreak = 3;
    state.lifeBeatWeek = null;
    // queueScene routes to the event queue whenever a modal is up, so look
    // in both places rather than assuming which one it landed in.
    state.eventQueue = []; state.noticeQueue = [];
    const why = !beatWindowOpen() ? "beat window shut" : "";
    const fired = maybeTriggerBankIntro();
    const queued = (state.eventQueue || []).find(
      (e) => e && e.payload && e.payload.id === "bank_intro",
    );
    const scene =
      state.pendingScene && state.pendingScene.id === "bank_intro"
        ? state.pendingScene
        : queued && queued.payload;
    const openedByBank =
      !!scene && scene.id === "bank_intro" && (scene.choices || []).length === 2;
    // Either answer opens the desk: saying no to a loan is not the same as
    // not knowing the bank exists.
    let bothOpen = true;
    for (let i = 0; i < 2; i++) {
      state.loansUnlocked = false;
      state.pendingScene = JSON.parse(JSON.stringify(scene || {}));
      resolvePendingScene(i);
      if (!state.loansUnlocked) bothOpen = false;
    }
    const deskOpen = loansAvailable();
    const sharkHidden = !sharkAtTheDesk();
    state.sharkMetWeek = 7;
    const sharkBack = sharkAtTheDesk();
    keys.forEach((k) => (state[k] = snap[k]));
    state.eventQueue = []; state.noticeQueue = [];
    if (!fired) return "a broke week five never raised the bank" + (why ? " (" + why + ")" : "");
    if (!openedByBank)
      return (
        "the beat that fired was not the bank: " +
        JSON.stringify((state.pendingScene || {}).id || null)
      );
    if (!bothOpen) return "refusing the loan closed the desk";
    if (!deskOpen) return "the Loans desk stayed shut after the bank beat";
    if (!sharkHidden) return "the shark was at the desk before he had met you";
    if (!sharkBack) return "the shark never came back after meeting you";
    return true;
  });
  if (bankDoorOk !== true) fail("loans desk: " + bankDoorOk);
  pass("the bank opens on a broke week, the shark still has to find you");

  // ── character DMs: the phone texts you after events ──
  const dmOk = await page.evaluate(() => {
    const snapDMs = state.characterDMs, snapUnread = state.dmUnread;
    const snapThread = state.wifeThread, snapWifeUnread = state.wifeUnread;
    state.characterDMs = []; state.dmUnread = 0;
    state.wifeThread = []; state.wifeUnread = 0;
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
    // She is her own thread now, with her own badge, so she must not be
    // counted a second time on the DM icon.
    const wifeUnread = state.wifeUnread;
    const inThread = (state.wifeThread || []).length;
    const html = renderPhoneMessagesApp();
    const banner = renderWifeBanner();
    // opening Messages should clear the DM badge, and her thread hers
    setPhoneApp("messages");
    const cleared = state.dmUnread === 0;
    setPhoneApp("wife");
    const wifeCleared = state.wifeUnread === 0;
    const bannerGone = renderWifeBanner() === "";
    state.characterDMs = snapDMs; state.dmUnread = snapUnread;
    state.wifeThread = snapThread; state.wifeUnread = snapWifeUnread;
    if (!hasBuck) return "Buck DM missing after head-to-head";
    if (!hasRival) return "rival DM missing after ally crossing";
    // A wife does not slide into her husband's DMs. She lives in her own app
    // and nowhere else, so finding her in the shared list is the failure now.
    if (hasWife) return "the wife turned up in the shared DM list";
    if (unread < 2) return "DM unread count wrong: " + unread;
    if (wifeUnread < 1) return "wife message did not raise her own badge";
    if (!inThread) return "wife message never reached her thread";
    if (!banner.includes("wife-banner")) return "no banner for an unread wife message";
    if (!html.includes("phone-dm-fresh")) return "fresh DM not highlighted";
    if (!cleared) return "opening Messages did not clear the unread badge";
    if (!wifeCleared) return "opening her thread did not clear her badge";
    if (!bannerGone) return "banner survived reading the message";
    return true;
  });
  if (dmOk !== true) fail("character DMs: " + dmOk);
  pass("character DMs, and the wife only in her own app");

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
      // The app column owns the scroll now (see the .app rule in the game), so
      // the document can no longer report sideways overflow: overflow:hidden
      // clamps it. Measure the real scroller or this check quietly stops
      // checking anything.
      doc: Math.max(
        document.documentElement.scrollWidth,
        (document.querySelector(".app") || {}).scrollWidth || 0,
      ),
      vp: window.innerWidth,
      h: document.getElementById("appContent").scrollHeight, vh: window.innerHeight,
      cards: [...document.querySelectorAll("#appContent .ro")].length,
      wrap: (() => { const el = document.querySelector(".shop-subtabs");
        return el ? getComputedStyle(el).flexWrap : "missing"; })(),
    }));
    if (m.doc > m.vp + 2) fail(`phone: first screen scrolls sideways (doc ${m.doc} > vp ${m.vp})`);
    if (m.wrap !== "nowrap") fail(`phone: sub-tab strip flex-wrap is '${m.wrap}', expected nowrap (media block order regressed)`);
    if (m.cards > 2) fail(`phone: ${m.cards} repair orders on the rail, expected at most 2`);
    if (m.h > m.vh * 2) fail(`phone: first playable screen is ${m.h}px (${(m.h / m.vh).toFixed(2)} screens), budget is 2.0`);
    if (perrs.length) fail("phone: " + perrs.join(" | "));
    pass(`phone 390x844: no sideways scroll, ${m.cards} repair orders, ${(m.h / m.vh).toFixed(2)} screens tall`);
    await phone.close();
  }

  // ── nested scrollers ──────────────────────────────────────────────────────
  // Two scrollbars a pixel apart is always a bug, never a design. The phone
  // grew a pair because the screen was a fixed 600px box while the thread
  // inside it was sized 62vh, so on a tall window the thread alone was taller
  // than the device and both of them scrolled. Anything sized off the viewport
  // inside a fixed-height box can do this, so the check is general: no
  // scrollable element may contain another scrollable element.
  for (const vh of [1440, 900, 800]) {
    const ns = await browser.newPage({ viewport: { width: 1280, height: vh } });
    await ns.goto(GAME);
    await ns.waitForTimeout(700);
    await ns.keyboard.press("Enter"); await ns.waitForTimeout(1100);
    for (let i = 0; i < 9; i++) {
      await ns.evaluate(() => {
        if (state.cutscene) dismissCutscene(true);
        state.noticeQueue = []; state.pendingScene = null; state.pendingUnlock = null;
        const cr = document.getElementById("cutsceneRoot"); if (cr) cr.innerHTML = "";
        const mr = document.getElementById("modalRoot"); if (mr) mr.innerHTML = "";
      });
      await ns.waitForTimeout(110);
    }
    await ns.evaluate(() => {
      state.tutorialComplete = true;
      Object.keys(state.milestones).forEach((k) => (state.milestones[k] = true));
      state.onboardStage = 3; state.preWeek = 0; state.wifeThread = [];
      // Vary the text: pushWifeMessage drops a line identical to the one
      // before it, so pushing the same string in a loop leaves a thread of
      // one and the check below silently measures nothing.
      for (let w = 4; w <= 19; w += 3) {
        state.week = w;
        pushWifeMessage(`week ${w}: a line long enough to wrap onto a second line in the bubble, so the thread ends up genuinely taller than the screen it sits in.`, "wife-week-warm");
      }
      state.week = 19; setView("career"); setPhoneApp("wife"); requestRender("full");
    });
    await ns.waitForTimeout(700);
    const nested = await ns.evaluate(() => {
      const scrollers = [...document.querySelectorAll("body *")].filter((e) => {
        const cs = getComputedStyle(e);
        return (
          (cs.overflowY === "auto" || cs.overflowY === "scroll") &&
          e.scrollHeight > e.clientHeight + 2 &&
          e.offsetParent !== null
        );
      });
      // A page scroller containing a component scroller is normal and every
      // site does it. What is never right is two bars sitting side by side on
      // the same edge, which is what a fixed-height box that also scrolls
      // looks like. So: flag a nested pair only when their right edges are
      // close enough that both bars draw in the same place.
      const name = (e) => (e.className || "").toString().split(" ")[0] || e.tagName;
      const bad = [];
      for (const a of scrollers)
        for (const b of scrollers) {
          if (a === b || !a.contains(b)) continue;
          const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
          if (Math.abs(ar.right - br.right) <= 24)
            bad.push(`${name(a)} > ${name(b)} (edges ${Math.round(ar.right)} / ${Math.round(br.right)})`);
        }
      const pc = document.querySelector(".phone-content");
      const sawPhone = !!pc && pc.scrollHeight > pc.clientHeight + 2;
      return { bad, count: scrollers.length, sawPhone };
    });
    if (nested.bad.length)
      fail(`two scrollbars on the same edge at 1280x${vh}: ` + [...new Set(nested.bad)].join(", "));
    // A check that found nothing to look at is not a passing check. The phone
    // thread has to be one of them, or the setup failed and this proved
    // nothing: the pair only appears at heights where the thread overflows
    // its own max-height AND the device box, which is why this runs at
    // several. At 1440 the thread fits and only the screen scrolls, so a
    // single height here would have passed over the exact bug it is for.
    if (!nested.count)
      fail(`doubled-scrollbar check found no scroll regions at 1280x${vh}, so it proved nothing`);
    if (!nested.sawPhone)
      fail(`doubled-scrollbar check never found the phone thread at 1280x${vh}; the setup did not take`);
    pass(`no doubled scrollbars at 1280x${vh} (${nested.count} scroll regions checked)`);
    await ns.close();
  }

  // ── the catalog fits a Deck screen ─────────────────────────────────────────
  // The open book has to sit between the nav and the news ticker at 1280x800,
  // on every spread, with no page grown past the height it was packed for.
  // The ticker is taller on an On Air line, so the check uses the taller one.
  {
    const deck = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await deck.goto(GAME);
    await deck.waitForTimeout(700);
    await deck.keyboard.press("Enter"); await deck.waitForTimeout(1100);
    for (let i = 0; i < 9; i++) {
      await deck.evaluate(() => {
        if (state.cutscene) dismissCutscene(true);
        state.noticeQueue = []; state.pendingScene = null; state.pendingUnlock = null;
        const cr = document.getElementById("cutsceneRoot"); if (cr) cr.innerHTML = "";
        const mr = document.getElementById("modalRoot"); if (mr) mr.innerHTML = "";
      });
      await deck.waitForTimeout(110);
    }
    const fit = await deck.evaluate(() => {
      state.tutorialComplete = true;
      Object.keys(state.milestones).forEach((k) => (state.milestones[k] = true));
      state.onboardStage = 3; state.preWeek = 0; state.money = 5000;
      const car = currentCar(); car.installedParts = []; state.activeRestorations = [];
      setView("workshop"); setShopSub("parts"); state.shopCat = "engine";
      // Work on the lift adds a line to its row, so put a job on every page's
      // worst case: the biggest system with something in progress.
      state.ownedTools = TOOLS_LIST.map((t) => t.id);
      installPart(131, "diy");
      const book = ptcBook(car);
      const out = [];
      for (let i = 0; i < book.spreads; i++) {
        state.catalogSpread = i; render("full");
        document.querySelector(".app").scrollTop = 0;
        const sp = document.querySelector(".ptc-spread").getBoundingClientRect();
        const pages = [...document.querySelectorAll(".ptc-pg")];
        const grown = pages.filter((pg) => pg.getBoundingClientRect().height > parseFloat(getComputedStyle(pg).minHeight) + 1);
        if (grown.length) out.push(`spread ${i} (pages ${pages.map((pg) => pg.querySelector(".ptc-pno").textContent).join("-")}) grew past its packed height`);
        // 800 minus the On Air ticker (69px) and the page block under the book.
        if (sp.bottom > 800 - 69 - 10) out.push(`spread ${i} runs under the ticker (bottom ${Math.round(sp.bottom)})`);
      }
      return { out, spreads: book.spreads };
    });
    if (!fit.spreads) fail("catalog fit check found no spreads, so it proved nothing");
    if (fit.out.length) fail("catalog on Deck: " + fit.out.join("; "));
    pass(`the catalog fits a Deck screen on all ${fit.spreads} spreads`);
    const storeFit = await deck.evaluate(() => {
      if (!document.body.classList.contains("ticker-active")) startWorldTicker();
      setShopSub("tools");
      const out = [];
      for (let a = 1; a <= HFS.SIGNS.length; a++) {
        state.toolAisle = a; render("full");
        const app = document.querySelector(".app"); app.scrollTop = 0;
        if (app.scrollHeight - app.clientHeight > 0) out.push(`aisle ${a} scrolls ${app.scrollHeight - app.clientHeight}px`);
        const box = document.querySelector(".hfs").getBoundingClientRect();
        const tags = [...document.querySelectorAll(".hfs > .hfs-tag, .hfs > .hfs-own")].map((t) => t.getBoundingClientRect());
        if (!tags.length) out.push(`aisle ${a} has no shelf signs`);
        tags.forEach((r, i) => { if (r.right > box.right + 1 || r.left < box.left - 1 || r.bottom > box.bottom + 1) out.push(`aisle ${a} sign ${i} hangs off the picture`); tags.slice(i + 1).forEach((q) => { if (r.left < q.right && q.left < r.right && r.top < q.bottom && q.top < r.bottom) out.push(`aisle ${a} has two signs on top of each other`); }); });
      }
      return out;
    });
    if (storeFit.length) fail("tool store on Deck: " + storeFit.join("; "));
    pass("Bay Freight fits a Deck screen on every aisle, signs on their shelves");
    await deck.close();
  }

  // ── Marketplace and Compete fit a laptop screen ───────────────────────────
  // A 1366x768 laptop and a 13" MacBook, less the browser's own toolbar. The
  // monitor sizes its glass to the room and the board tightens on short
  // screens, so neither tab scrolls. Compete is measured on its heaviest
  // Saturday, every show picked in turn, since a big show's bill is the
  // tallest thing on the board.
  for (const [lw, lh] of [[1366, 657], [1440, 789]]) {
    const lap = await browser.newPage({ viewport: { width: lw, height: lh } });
    await lap.goto(GAME);
    await lap.waitForTimeout(700);
    await lap.keyboard.press("Enter"); await lap.waitForTimeout(1100);
    for (let i = 0; i < 9; i++) {
      await lap.evaluate(() => {
        if (state.cutscene) dismissCutscene(true);
        state.noticeQueue = []; state.pendingScene = null; state.pendingUnlock = null;
        state.pendingMarketplaceOffer = null; state.pendingCarOffer = null;
        const cr = document.getElementById("cutsceneRoot"); if (cr) cr.innerHTML = "";
        const mr = document.getElementById("modalRoot"); if (mr) mr.innerHTML = "";
      });
      await lap.waitForTimeout(110);
    }
    const lapFit = await lap.evaluate(() => {
      state.tutorialComplete = true;
      Object.keys(state.milestones).forEach((k) => (state.milestones[k] = true));
      state.onboardStage = 3; state.preWeek = 0; state.seasonNumber = 1; state.money = 2600; state.followers = 4000;
      const car = currentCar(); CATS.forEach((k) => (car[k] = 62));
      state.history = Array.from({ length: 9 }, (_, i) => ({ week: 1 + i, showName: "x", tier: i < 3 ? "Cars & Coffee" : i < 6 ? "Local" : "Regional", place: 2, season: 1 }));
      learnTrip("yard");
      // Measure the frame players actually see: the news ticker on. It only
      // comes on once the intro is off screen, which a fresh page may not
      // have reached yet.
      if (!document.body.classList.contains("ticker-active")) startWorldTicker();
      if (!document.body.classList.contains("ticker-active")) return "the news ticker never came on, so this measured the wrong frame";
      const over = () => { const a = document.querySelector(".app"); a.scrollTop = 0; return a.scrollHeight - a.clientHeight; };
      const bad = [];
      setView("dealership");
      for (const t of ["sell", "listings", "sellcar"]) {
        state.marketTab = t; render("full");
        if (!document.querySelector(".crt-page")) return "the Marketplace monitor did not render";
        if (over() > 0) bad.push(`Marketplace/${t} scrolls ${over()}px`);
      }
      setView("shows");
      let shows = 0;
      for (const wk of [4, 20]) {
        state.week = wk;
        for (const sh of showsForWeek(wk)) {
          state.calPick = { at: wk, w: wk, show: sh.id, more: false, page: calPageOf(wk) }; render("full");
          shows++;
          if (over() > 0) { bad.push(`Compete week ${wk} (${sh.name}) scrolls ${over()}px`); break; }
        }
      }
      if (!shows) return "no shows were picked, so Compete was never measured";
      setView("workshop"); setShopSub("tools");
      for (let a = 1; a <= HFS.SIGNS.length; a++) { state.toolAisle = a; render("full"); if (over() > 0) { bad.push(`Tools aisle ${a} scrolls ${over()}px`); break; } }
      // Next Jobs, with the bay empty and with a job in it.
      {
        const keepTasks = state.activeRestorations.slice(), keepMoney = state.money, keepTools = state.ownedTools.slice();
        state.money = 4000; state.ownedTools = TOOLS_LIST.map((t) => t.id); state.activeRestorations = [];
        setShopSub("suggested"); render("full");
        if (!document.querySelector(".ro-row .ro")) bad.push("Next Jobs hung no repair orders");
        if (over() > 0) bad.push(`Next Jobs scrolls ${over()}px`);
        const diy = document.querySelector(".ro .ro-box.diy:not([disabled])");
        if (diy) { diy.click(); render("full"); if (over() > 0) bad.push(`Next Jobs with a job running scrolls ${over()}px`); }
        state.activeRestorations = keepTasks; state.money = keepMoney; state.ownedTools = keepTools;
      }
      for (const lvl of ["curb", "carport"]) {
        state.workshopLevel = lvl; setShopSub("workspace"); render("full");
        if (!document.querySelector(".re-window")) { bad.push("the realty window did not render"); break; }
        if (over() > 0) bad.push(`Space (${lvl}) scrolls ${over()}px`);
      }
      // The results table, at its fullest: a judged show, six on the sheet,
      // the ribbon, the clipboard and the envelope all out.
      const judged = SHOWS_MASTER.find((x) => x.axis && !isRaceShow(x.name));
      const keepResult = state.result, keepView = state.view;
      state.result = { show: judged.name, tier: judged.tier, week: 9, season: seasonNum(), car: `${car.year} ${car.make} ${car.model}`, place: 1, score: 88, prize: 2200, bonusCash: 75, fee: 150, localSponsorCovered: false, fuelUsed: 12, net: 2125, gained: 1400, repDelta: 4, repTitle: "Local Legend",
        standings: Array.from({ length: 6 }, (_, i) => ({ name: i ? `Rival ${i}'s '6${i} Coupe` : `Your ${car.year} ${car.make} ${car.model}`, score: 88 - i * 5, isPlayer: !i })),
        judgingLine: "Clean enough to eat off.", tasteId: "purist", tasteEdge: 1, axis: judged.axis,
        judgeCard: { label: JUDGING_AXES[judged.axis].label, overall: 80, axisScore: 84, cats: Object.entries(JUDGING_AXES[judged.axis].weights).map(([cat, w]) => ({ cat, w, val: 70 })) },
        rivalReactions: [{ kicker: "THE RIVAL", color: "#e07070", line: "Buck packed up before the trophies came out. Says the judges were blind." }, { kicker: "NEW ALLY", color: "#87c77b", line: "Hector shook your hand on the way out." }] };
      // A full render, the way the game arrives here: the result view hides
      // the tab strip, and measuring with it still up would be a page that
      // never exists.
      state.view = "result"; render("full");
      if (!document.querySelector(".res-table")) bad.push("the results table did not render");
      else if (over() > 0) bad.push(`the results table scrolls ${over()}px`);
      state.result = keepResult; state.view = keepView; render("full");
      return bad.length ? bad.join("; ") : true;
    });
    if (lapFit !== true) fail(`laptop ${lw}x${lh}: ${lapFit}`);
    pass(`Next Jobs, Marketplace, Compete, the tool store, Space and the results fit ${lw}x${lh} without a scroll`);
    await lap.close();
  }

  // ── the itch embed ────────────────────────────────────────────────────────
  // itch serves the game in an iframe and the host decides whether that frame
  // may scroll; its scrollbars option defaults off. A build that relies on
  // document scroll is cut off at the fold there with no way down, which is
  // most of the Build tab. So: the document must NOT be the scroller, and the
  // app column must be.
  {
    const embed = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    // The host has to be a real file next to the game: a file:// iframe inside
    // an about:blank parent (what setContent gives you) is cross-origin and
    // never loads, which looks exactly like the failure this check is for.
    const efs = require("fs");
    const hostPath = path.resolve(__dirname, "..", ".qa-embed-host.html");
    efs.writeFileSync(
      hostPath,
      "<!doctype html><html><head><meta charset=\"utf-8\"><style>" +
        "html,body{margin:0;height:100%;overflow:hidden}" +
        "iframe{display:block;width:100%;height:100%;border:0}</style></head><body>" +
        `<iframe scrolling="no" src="${GAME}"></iframe></body></html>`,
    );
    const cleanupHost = () => { try { efs.unlinkSync(hostPath); } catch (e) {} };
    await embed.goto("file://" + hostPath);
    await embed.waitForTimeout(1200);
    const gf = embed.frames().find((f) => f.url().includes("Car_Guy_Sim"));
    if (!gf) fail("itch embed: the game frame never loaded");
    await gf.waitForFunction(() => typeof window.startGame === "function");
    await gf.evaluate(() => startGame());
    await embed.waitForTimeout(800);
    for (let i = 0; i < 8; i++) {
      await gf.evaluate(() => {
        if (state.cutscene) dismissCutscene(true);
        state.noticeQueue = []; state.pendingScene = null; state.pendingUnlock = null;
        const cr = document.getElementById("cutsceneRoot"); if (cr) cr.innerHTML = "";
        const mr = document.getElementById("modalRoot"); if (mr) mr.innerHTML = "";
      });
      await embed.waitForTimeout(110);
    }
    await gf.evaluate(() => {
      state.tutorialComplete = true;
      Object.keys(state.milestones).forEach((k) => (state.milestones[k] = true));
      state.onboardStage = 3; state.preWeek = 0; state.week = 13;
      state.money = 25000; state.installsDone = 12;
      // The Legacy Wall: ninety-odd achievements, always taller than any
      // frame. Build used to be the long screen here, and now it fits.
      setView("legacy"); requestRender("full");
    });
    await embed.waitForTimeout(700);
    const e1 = await gf.evaluate(() => {
      const app = document.querySelector(".app");
      return {
        docScrolls: document.documentElement.scrollHeight > window.innerHeight + 2,
        appScrolls: app.scrollHeight > app.clientHeight + 2,
        tall: app.scrollHeight, frame: app.clientHeight,
      };
    });
    if (e1.docScrolls) fail("itch embed: the document is the scroller, so a no-scroll frame cuts the game off");
    if (!e1.appScrolls) fail(`itch embed: the app column cannot scroll (${e1.tall}px in a ${e1.frame}px frame)`);
    await gf.evaluate(() => { const a = document.querySelector(".app"); a.scrollTop = 99999; });
    await embed.waitForTimeout(250);
    const e2 = await gf.evaluate(() => {
      const a = document.querySelector(".app");
      return a.scrollTop + a.clientHeight >= a.scrollHeight - 4;
    });
    if (!e2) fail("itch embed: cannot reach the bottom of the Legacy Wall inside the frame");
    pass(`itch embed: scrolls inside scrolling="no" (${e1.tall}px of game in a ${e1.frame}px frame)`);
    cleanupHost();
    await embed.close();
  }

  await browser.close();
  console.log("\nALL SMOKE CHECKS PASSED — safe to upload.");
})().catch((e) => fail(e.message));
