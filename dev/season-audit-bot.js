/*
 * Three-season economy + difficulty audit bot.
 *
 * Models an AVERAGE player, not an optimizer:
 *  - posts content ~60% of weeks, skips ~20% of enterable shows
 *  - DIY-first, buys tools reactively, keeps a small cash buffer
 *  - never takes loans, never flips cars, sells take-off parts when offered
 *  - does not game judging axes or scene taste
 * Timers are fast-forwarded (that's sim time, not player skill).
 *
 * Usage: QA_CHROMIUM=/opt/pw-browsers/chromium node dev/season-audit-bot.js [seed]
 * Emits JSONL week snapshots + a season summary, and fails loudly on page
 * errors or stuck states.
 */
const { chromium } = require("/home/user/restoration/node_modules/playwright");
const GAME = "file:///home/user/restoration/Car_Guy_Sim.html";
const SEED = Number(process.argv[2] || 1);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.QA_CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1240, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("dialog", (d) => d.accept());

  await page.goto(GAME);
  await page.waitForTimeout(1000);
  await page.click("#splashActions .splash-btn");
  await page.waitForTimeout(1200);

  // Deterministic-ish average player + income ledger instrumentation.
  await page.evaluate((seed) => {
    let s = seed * 2654435761 % 4294967296;
    window.__rand = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    window.__ledger = {};
    window.__seasonLog = [];
    window.__weekLog = [];
    window.__beatLog = [];
    const orig = recordMoneyChange;
    window.recordMoneyChange = function (amount, reason) {
      const season = state.seasonNumber || 1;
      const key = season + "|" + (amount >= 0 ? "in" : "out") + "|" + (reason || "?").replace(/[0-9$,.]+/g, "#").slice(0, 44);
      window.__ledger[key] = (window.__ledger[key] || 0) + amount;
      return orig(amount, reason);
    };
  }, SEED);

  const drain = async () => {
    // Bounded modal-drain, mirrors a player clicking through whatever is up.
    for (let i = 0; i < 60; i++) {
      const acted = await page.evaluate(() => {
        if (state.cutscene) { window.__beatLog.push({ week: state.week, season: state.seasonNumber||1, t: "cutscene", id: state.cutscene.title || state.cutscene.art }); dismissCutscene(); return "cutscene"; }
        if (!state.tutorialComplete) {
          const b = document.querySelector("#modalRoot .tutorial-primary");
          if (b) { b.click(); return "tutorial"; }
        }
        if (state.pendingVictory) {
          window.__seasonLog.push({ type: "VICTORY", season: state.seasonNumber || 1, week: state.week, build: state.pendingVictory.build });
          startLegacyRun();
          return "victory";
        }
        if (state.seasonWrap) {
          window.__seasonLog.push({ type: "WRAP_NO_TITLE", season: state.seasonNumber || 1, best: state.seasonStats && state.seasonStats.bestPlace, bestTier: state.seasonStats && state.seasonStats.bestTier });
          continueSeason();
          return "wrap";
        }
        if (state.showLoading && state.showStage) { advanceShowStage(); return "showStage"; }
        if (state.result && state.view === "result") { state.result = null; state.postShowWeekLocked = false; setView("workshop"); return "result"; }
        if (state.pendingScene) { window.__beatLog.push({ week: state.week, season: state.seasonNumber||1, t: "scene", id: state.pendingScene.id || state.pendingScene.title }); resolvePendingScene(0); return "scene"; }
        if (state.pendingUnlock) { acknowledgeUnlock(false); return "unlock"; }
        if (state.pendingEvent) { window.__beatLog.push({ week: state.week, season: state.seasonNumber||1, t: "event", id: (state.pendingEvent && state.pendingEvent.title) || "event" }); resolveEvent(state.money > 800); return "event"; }
        if (state.pendingMarketplaceOffer) { respondMarketplaceOffer(true); return "mkOffer"; }
        if (state.pendingCarOffer) { respondCarOffer("decline"); return "carOffer"; }
        if (state.weekRecap) { dismissWeekRecap(); return "recap"; }
        if (state.noticeQueue && state.noticeQueue.length) { dismissNotice(); return "notice"; }
        if (document.querySelector("#vibePickerRoot .vp-card")) { document.querySelector("#vibePickerRoot .vp-card").click(); return "vibe"; }
        const modalBtn = document.querySelector("#modalRoot .notice-primary, #modalRoot .victory-primary, #modalRoot button");
        if (modalBtn && document.querySelector("#modalRoot").innerHTML.trim()) { modalBtn.click(); return "genericBtn"; }
        return null;
      });
      if (!acted) return;
      await page.waitForTimeout(60);
    }
    throw new Error("modal drain did not settle (60 iterations)");
  };

  const weekActions = () => page.evaluate(() => {
    const R = window.__rand;
    const car = (() => {
      // Average player campaigns their best car.
      let best = null;
      (state.cars || []).forEach((c) => { if (!best || getOverall(c) > getOverall(best)) best = c; });
      return best || currentCar();
    })();
    if (car && state.carId !== car.id) state.carId = car.id;
    const acts = [];
    // Fuel: keep above 15 gal when there's cash.
    if (state.fuel < 15 && state.money > 900) { buyFuel(Math.min(15, 60 - state.fuel)); acts.push("fuel"); }
    // Content: ~60% of weeks, best platform available.
    if (R() < 0.6) {
      for (const t of ["youtube", "reel", "insta"]) {
        if (!creatorPostBlockedReason(t)) { doCreatorPost(t); acts.push("post:" + t); break; }
      }
    }
    // List take-off parts.
    (state.partsInventory || []).forEach((i) => { if (!i.listed && !i.sold) { listPartOnMarketplace(i.id); acts.push("list"); } });
    // Tools: if the cheapest useful DIY is tool-blocked, buy the missing tool when affordable.
    const buffer = 700;
    const jobs = PARTS.filter((p) => car && !car.installedParts.includes(p.id) && !findActiveTask(car.id, p.id) && car[p.category] < 100);
    const need = { engine: 1, transmission: 1, brakes: 1 };
    const roadworthyFirst = car && !roadworthy(car);
    const scoreJob = (p) => (roadworthyFirst && need[p.category] ? 1000 : 0) + (p.imp || 0) * 3 - (100 - (100 - car[p.category]));
    jobs.sort((a, b) => scoreJob(b) - scoreJob(a));
    for (const p of jobs.slice(0, 6)) {
      const missing = (p.tools || []).filter((t) => !state.ownedTools.includes(t));
      if (!missing.length) continue;
      const tool = TOOLS_LIST.find((t) => t.id === missing[0]);
      if (!tool) continue;
      if (state.ownedTools.length >= toolStorageData().maxTools) {
        const ns = nextToolStorage && nextToolStorage();
        if (ns && state.money > ns.cost + buffer) { upgradeToolStorage(); acts.push("storage"); }
        break;
      }
      if (state.money > tool.cost + buffer && canOwnTool(tool).ok) { buyTool(tool.id); acts.push("tool:" + tool.name); break; }
    }
    // Wrenching: timers run in minutes while weeks advance by hand, so a
    // week holds several job cycles. Money is the real limiter; the buffer
    // and the "top 3, not the optimum" pick keep it average, not optimal.
    let rounds = 10;
    let installsThisWeek = 0;
    while (car && rounds-- > 0) {
      let started = 0;
      let guard = 4;
      while (guard-- > 0 && activeTasksForCar(car.id).length < workspaceData().maxActive) {
        const doable = jobs.filter((p) => car[p.category] < 100 && !car.installedParts.includes(p.id) && !findActiveTask(car.id, p.id) &&
          !(p.tools || []).some((t) => !state.ownedTools.includes(t)) &&
          state.money - buffer >= partCost(p, "diy"));
        if (!doable.length) break;
        const pick = doable[Math.floor(R() * Math.min(3, doable.length))];
        const before = state.activeRestorations.length;
        installPart(pick.id, "diy", false);
        if (state.activeRestorations.length === before) break;
        started++;
        installsThisWeek++;
      }
      if (!started && !activeTasksForCar(car.id).length) break;
      // Fast-forward the timers (sim time, not skill) and collect.
      state.activeRestorations.forEach((t) => { if (!t.completed) t.finishTime = Date.now() - 1; });
      resolveCompletedRestorations(false);
    }
    if (installsThisWeek) acts.push("diy x" + installsThisWeek);
    // The serious work goes to the mechanic: DIY covers Budget jobs, and
    // anything Quality or Show Grade gets sent to the shop whenever the
    // wallet can take it. This is the intended average-player path to a
    // show-ready car in the first seasons.
    let shopRounds = 6;
    while (car && shopRounds-- > 0) {
      const big = jobs.find((p) => (p.tier === "Quality" || p.tier === "Show Grade") && car[p.category] < 100 && !car.installedParts.includes(p.id) && !findActiveTask(car.id, p.id) && state.money - 1200 >= partCost(p, "shop"));
      if (!big) break;
      const before = state.activeRestorations.length;
      installPart(big.id, "shop", false);
      if (state.activeRestorations.length === before) break;
      state.activeRestorations.forEach((t) => { if (!t.completed) t.finishTime = Date.now() - 1; });
      resolveCompletedRestorations(false);
      acts.push("shop:" + big.name);
    }
    // Workspace upgrade when comfortably affordable.
    const wsNext = WORKSPACE_LEVELS[getWorkspaceIndex(state.workshopLevel) + 1];
    if (wsNext && state.money > wsNext.cost + 4000) { upgradeWorkspace(); acts.push("workspace"); }
    // Shows: enter the best enterable one, but skip ~20% of chances.
    let entered = null;
    if (car && onboardStageVal() >= 3 && R() >= 0.2 && !state.enteredShowsThisWeek.length && !state.postShowWeekLocked) {
      const rank = { National: 3, Regional: 2, Local: 1, "Cars & Coffee": 0 };
      const open = getCurrentShows().filter((s) =>
        s.weeksUntil === 0 && showProgressRequirement(s).ok &&
        getOverall(car) >= (s.minScore || 0) &&
        state.money > (s.fee || 0) + 200 && state.fuel >= (s.fuelCost || 0));
      open.sort((a, b) => (rank[b.tier] || 0) - (rank[a.tier] || 0));
      if (open.length) { entered = open[0].name + " (" + open[0].tier + ")"; enterShow(open[0].id); }
    }
    return { acts, entered };
  });

  const snapshot = () => page.evaluate(() => {
    const car = currentCar();
    return {
      season: state.seasonNumber || 1, week: state.week, money: state.money,
      followers: state.followers, fuel: state.fuel,
      overall: car ? getOverall(car) : 0, cars: (state.cars || []).length,
      rep: typeof reputationTitleOf === "function" ? reputationTitleOf() : "",
      buckW: (state.buck && state.buck.beatenCount) || 0, buckL: (state.buck && state.buck.lostToCount) || 0,
      lastShow: state.history && state.history[0] ? `${state.history[0].show}#${state.history[0].place}` : "",
    };
  });

  let ticks = 0, lastKey = "", stuck = 0;
  const weekLines = [];
  while (ticks++ < 900) {
    await drain();
    const done = await page.evaluate(() => (window.__seasonLog.filter((l) => l.season === 3 && (l.type === "VICTORY" || l.type === "WRAP_NO_TITLE")).length > 0) || (state.seasonNumber || 1) > 3);
    if (done) break;
    const { acts, entered } = await weekActions();
    await page.waitForTimeout(80);
    await drain();
    const snapBefore = await snapshot();
    if (entered) weekLines.push({ ...snapBefore, entered });
    await page.evaluate(() => advanceWeek("time"));
    await page.waitForTimeout(120);
    const snap = await snapshot();
    weekLines.push({ ...snap, acts: acts.slice(0, 5) });
    const key = snap.season + ":" + snap.week;
    if (key === lastKey) { if (++stuck > 12) { console.log("STUCK AT", key, JSON.stringify(snap)); errors.push("stuck at " + key); break; } }
    else { stuck = 0; lastKey = key; }
  }

  const seasons = await page.evaluate(() => window.__seasonLog);
  const ledger = await page.evaluate(() => window.__ledger);
  const finalState = await snapshot();
  console.log("=== WEEKS ===");
  weekLines.forEach((w) => console.log(JSON.stringify(w)));
  console.log("=== SEASONS ===");
  seasons.forEach((s) => console.log(JSON.stringify(s)));
  console.log("=== LEDGER ===");
  Object.entries(ledger).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).forEach(([k, v]) => console.log(`${k} ${Math.round(v)}`));
  console.log("=== FINAL ===", JSON.stringify(finalState), "ticks:", ticks);
  const beats = await page.evaluate(() => window.__beatLog);
  console.log("=== BEAT JAMS (>=3 heavy story beats in one week) ===");
  const byWeek = {};
  beats.forEach((b) => { const k = b.season + ":" + b.week; (byWeek[k] = byWeek[k] || []).push(b.t + ":" + b.id); });
  let jams = 0;
  Object.entries(byWeek).forEach(([k, list]) => { if (list.length >= 3) { jams++; console.log(k, "->", JSON.stringify(list)); } });
  if (!jams) console.log("none");
  console.log("=== TOTAL HEAVY BEATS ===", beats.length);
  console.log("=== ERRORS ===", errors.length ? JSON.stringify(errors.slice(0, 10)) : "none");
  await browser.close();
  process.exit(0);
})();
