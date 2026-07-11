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

  // ── 5-beat tutorial ──
  for (let beat = 0; beat < 5; beat++) {
    const btn = await page.$("#modalRoot .tutorial-primary");
    if (!btn) fail(`tutorial beat ${beat + 1} not shown`);
    await btn.click();
    await page.waitForTimeout(250);
  }
  const tutDone = await page.evaluate(() => state.tutorialComplete && onboardStageVal() === 0);
  if (!tutDone) fail("tutorial did not complete into onboarding stage 0");
  pass("tutorial (5 beats)");

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
    state.noticeQueue = []; render("full");
  });
  await page.waitForTimeout(300);
  unlock = await page.evaluate(() => state.pendingUnlock && state.pendingUnlock.tab);
  if (unlock !== "dealership") fail("Marketplace did not unlock at roadworthy (got " + unlock + ")");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  pass("roadworthy → Marketplace unlock");

  // ── list a part, let the week roll → Compete unlock ──
  // (Compete opens a week after the first listing, or on a first sale.)
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
  pass("first listing → Compete unlock");

  // ── enter a show, click through the cinematic, land on results ──
  const showOk = await page.evaluate(() => {
    state.noticeQueue = []; state.weekRecap = null; state.pendingScene = null; state.pendingEvent = null;
    state.fuel = 60; state.gloveBoxFound = true; state.familySaturdayWeek = -1;
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

  await browser.close();
  console.log("\nALL SMOKE CHECKS PASSED — safe to upload.");
})().catch((e) => fail(e.message));
