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
 * save → reload → state intact → export/import/backup sanity.
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
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  pass("boot + splash");

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

  // ── list a part → Compete unlock ──
  await page.evaluate(() => {
    if (!(state.partsInventory || []).length)
      state.partsInventory = [{ id: "qa1", name: "Take-off Carb", baselineValue: 60, askingPrice: 70 }];
    state.partsInventory[0].listed = true;
    state.noticeQueue = []; render("full");
  });
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
