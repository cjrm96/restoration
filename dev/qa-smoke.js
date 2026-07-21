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
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  if (await page.evaluate(() => !!state.cutscene || !!document.getElementById("cutsceneRoot")))
    fail("intro cutscene did not dismiss");
  pass("barn-find intro cut scene");

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
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  pass("3 installs → Social unlock");

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
  await page.waitForTimeout(300);
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
  const buckIntro = await page.evaluate(() => (state.characterDMs || []).some((d) => d.id === "buck-intro"));
  if (!buckIntro) fail("Buck's intro DM did not land when Compete unlocked");
  pass("first listing → Compete unlock (+ Buck intro DM)");

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
    // Everything clear → recap finally surfaces.
    state.pendingScene = null;
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

  await browser.close();
  console.log("\nALL SMOKE CHECKS PASSED — safe to upload.");
})().catch((e) => fail(e.message));
