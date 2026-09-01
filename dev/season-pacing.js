/*
 * Season-one pacing probe: where are the dead weeks?
 *
 * Not an economy audit (that's season-audit-bot.js). This one asks a single
 * question, once per week: with the money, tools and calendar the player
 * actually has in front of them, is there anything to DO this week besides
 * click Next Week?
 *
 * Each week it takes a read-only census BEFORE acting, then plays an average
 * player, then reports what that week actually contained. A week is scored:
 *   SOLID   - real work happened (job started, show entered, trip taken, a
 *             beat with a choice in it)
 *   THIN    - only filler was available (post content, list a part)
 *   DEAD    - nothing but Next Week
 * and every DEAD/THIN week carries the reason it was empty.
 *
 * Strategy knobs let the same season be replayed under a different player, so
 * a finding can be separated from one bot's habits:
 *   SKIP_COFFEE=1  never enter Cars & Coffee
 *   COFFEE_CAP=n   enter Cars & Coffee only until n are banked (2 unlocks Local)
 *   TOOLHUNGRY=1   buy every tool that unlocks work
 *   YARDRAT=1      spend a broke Saturday at the junkyard instead of idling
 *   SAVER=n        hold $n back instead of spending down to gas money
 *
 * Usage: QA_CHROMIUM=/opt/pw-browsers/chromium node dev/season-pacing.js [seed]
 * Emits one JSON blob: per-week census + what the player did + beats emitted.
 */
const { chromium } = require("playwright");
const GAME = "file:///home/user/restoration/Car_Guy_Sim.html";
const SEED = Number(process.argv[2] || 1);
// Strategy knobs, so the same season can be replayed under a different player.
//   SKIP_COFFEE=1  never enter the $0-prize Cars & Coffee (it still costs a week)
//   SAVER=<n>      hold $n back instead of spending down to gas money
const SKIP_COFFEE = process.env.SKIP_COFFEE === "1";
//   COFFEE_CAP=<n> enter Cars & Coffee only until n are banked (2 unlocks Local)
const COFFEE_CAP = process.env.COFFEE_CAP ? Number(process.env.COFFEE_CAP) : null;
//   TOOLHUNGRY=1   buy every tool that unlocks work, as soon as it is affordable
const TOOLHUNGRY = process.env.TOOLHUNGRY === "1";
//   YARDRAT=1      spend a broke Saturday at the junkyard instead of idling
const YARDRAT = process.env.YARDRAT === "1";
const BUFFER = Number(process.env.SAVER || 250);

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

  await page.evaluate((seed) => {
    let s = (seed * 2654435761) % 4294967296;
    window.__rand = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    window.__beats = [];       // story beats read by the player, tagged with the week they were read
    window.__queued = [];      // story beats EMITTED by the game, tagged with the week they were emitted
    const wk = () => (inPreSeason() ? "P" + state.preWeek : "W" + state.week);
    const qs = window.queueScene;
    window.queueScene = function (sc) { window.__queued.push({ w: wk(), kind: "scene", id: (sc && (sc.id || sc.title)) || "?" }); return qs.apply(this, arguments); };
    const pc = window.playCutscene;
    window.playCutscene = function (cs) { window.__queued.push({ w: wk(), kind: "cutscene", id: (cs && (cs.title || cs.art)) || "?" }); return pc.apply(this, arguments); };
    window.__pay = [];
    const rmc = window.recordMoneyChange;
    window.recordMoneyChange = function (amt, why) { if (amt > 0) window.__pay.push({ w: wk(), amt: Math.round(amt), why: String(why || "").slice(0, 40) }); return rmc.apply(this, arguments); };
  }, SEED);

  // ── the census ───────────────────────────────────────────────────────────
  // Pure read. Never mutates state. Answers "what is on the table right now".
  const census = () => page.evaluate(() => {
    const car = currentCar();
    const overall = car ? getOverall(car) : 0;
    const open = [];
    const jobs = car ? PARTS.filter((p) =>
      !car.installedParts.includes(p.id) && !findActiveTask(car.id, p.id) && car[p.category] < 100) : [];
    const slotFree = car ? activeTasksForCar(car.id).length < workspaceData().maxActive : false;
    const atShop = car ? activeTasksByMethod(car.id, "shop").length > 0 : false;
    const toolsOk = (p) => !(p.tools || []).some((t) => !state.ownedTools.includes(t));

    const diyReady = jobs.filter((p) => toolsOk(p) && state.money >= partCost(p, "diy"));
    const diyBroke = jobs.filter((p) => toolsOk(p) && state.money < partCost(p, "diy"));
    const diyToolLocked = jobs.filter((p) => !toolsOk(p));
    const shopReady = jobs.filter((p) => state.money >= partCost(p, "shop"));
    const cheapestJob = jobs.length
      ? Math.min(...jobs.map((p) => (toolsOk(p) ? partCost(p, "diy") : Infinity)), ...jobs.map((p) => partCost(p, "shop")))
      : null;

    // A tool that would open up work the player cannot otherwise reach.
    const buyableUnlockTool = (() => {
      if (state.ownedTools.length >= toolStorageData().maxTools) return null;
      for (const p of diyToolLocked) {
        const missing = (p.tools || []).filter((t) => !state.ownedTools.includes(t));
        const tool = TOOLS_LIST.find((t) => t.id === missing[0]);
        if (tool && canOwnTool(tool).ok && state.money >= tool.cost + partCost(p, "diy")) return tool.name;
      }
      return null;
    })();

    const shows = (typeof tabUnlocked === "function" && tabUnlocked("shows")) ? getCurrentShows() : [];
    const showsHere = shows.filter((s) => s.weeksUntil === 0 && showProgressRequirement(s).ok);
    const showsEnterable = showsHere.filter((s) =>
      overall >= (s.minScore || 0) && state.money >= (s.fee || 0) && state.fuel >= (s.fuel || 0));
    const showsBlocked = showsHere.filter((s) => !showsEnterable.includes(s)).map((s) =>
      s.name + (overall < (s.minScore || 0) ? ` [needs ${s.minScore} overall]`
        : state.money < (s.fee || 0) ? ` [needs $${s.fee}]` : ` [needs ${s.fuel} gal]`));

    const postable = ["youtube", "reel", "insta"].filter((t) => !creatorPostBlockedReason(t));
    const unlisted = (state.partsInventory || []).filter((i) => !i.listed && !i.sold).length;
    const tripsOpen = ["yard", "swap"].filter((w) => typeof tripKnown === "function" && tripKnown(w));

    return {
      week: state.week, pre: inPreSeason() ? state.preWeek : 0,
      money: state.money, fuel: state.fuel, overall,
      roadworthy: car ? roadworthy(car) : false,
      installsDone: state.installsDone || 0,
      tabs: ["workshop", "garage", "career", "dealership", "legacy", "shows"].filter((t) =>
        typeof tabUnlocked === "function" ? tabUnlocked(t) : true),
      slotFree, atShop, jobsLeft: jobs.length,
      diyReady: diyReady.length, diyBroke: diyBroke.length, diyToolLocked: diyToolLocked.length,
      shopReady: shopReady.length, cheapestJob: cheapestJob === Infinity ? null : cheapestJob,
      buyableUnlockTool,
      showsEnterable: showsEnterable.map((s) => s.name + " (" + s.tier + ")"),
      showsBlocked,
      nextShow: (() => { const u = getUpcomingSummary(); return u && u.nextShowText; })(),
      postable: postable.length, unlisted, tripsOpen,
      postShowLock: !!state.postShowWeekLocked,
      activeJobs: car ? activeTasksForCar(car.id).length : 0,
    };
  });

  // ── modal drain ──────────────────────────────────────────────────────────
  const drain = async () => {
    const fired = [];
    for (let i = 0; i < 80; i++) {
      const acted = await page.evaluate(() => {
        const tag = (t, id, weighty) => { window.__beats.push({ week: state.week, pre: inPreSeason() ? state.preWeek : 0, t, id, weighty: !!weighty }); };
        if (state.cutscene) { tag("cutscene", state.cutscene.title || state.cutscene.art, true); dismissCutscene(true); return "cutscene"; }
        if (!state.tutorialComplete) {
          const b = document.querySelector("#modalRoot .tutorial-primary");
          if (b) { b.click(); return "tutorial"; }
        }
        if (state.pendingVictory) { startLegacyRun(); return "victory"; }
        if (state.seasonWrap) { window.__wrapped = true; return null; }
        if (state.showLoading && state.showStage) { advanceShowStage(); return "showStage"; }
        if (state.result && state.view === "result") { leaveResultScreen(); return "result"; }
        if (state.pendingScene) { tag("scene", state.pendingScene.id || state.pendingScene.title, true); resolvePendingScene(0); return "scene"; }
        if (state.pendingUnlock) { tag("unlock", state.pendingUnlock.tab, true); acknowledgeUnlock(false); return "unlock"; }
        if (state.pendingEvent) { tag("event", (state.pendingEvent && state.pendingEvent.title) || "event", true); resolveEvent(state.money > 800); return "event"; }
        if (state.pendingMarketplaceOffer) {
          if (state.pendingMarketplaceOffer.scenarioActive) { respondMarketplaceScenario(0); return "mkScenario"; }
          respondMarketplaceOffer(true); return "mkOffer";
        }
        if (state.pendingCarOffer) { respondCarOffer("decline"); return "carOffer"; }
        if (state.weekRecap) { dismissWeekRecap(); return "recap"; }
        if (state.noticeQueue && state.noticeQueue.length) { tag("notice", (state.noticeQueue[0] && state.noticeQueue[0].title) || "notice", false); dismissNotice(); return "notice"; }
        if (document.querySelector("#vibePickerRoot .vp-card")) { document.querySelector("#vibePickerRoot .vp-card").click(); return "vibe"; }
        const modalBtn = document.querySelector("#modalRoot .notice-primary, #modalRoot .victory-primary, #modalRoot button");
        if (modalBtn && document.querySelector("#modalRoot").innerHTML.trim()) { modalBtn.click(); return "genericBtn"; }
        return null;
      });
      if (!acted) return fired;
      fired.push(acted);
      await page.waitForTimeout(50);
    }
    const dbg = await page.evaluate(() => ({ week: state.week, view: state.view, wrap: state.seasonWrap }));
    throw new Error("modal drain did not settle: " + JSON.stringify(fired.slice(-12)) + " " + JSON.stringify(dbg));
  };

  // ── average-player week ──────────────────────────────────────────────────
  const playWeek = () => page.evaluate(({ SKIP_COFFEE, BUFFER, COFFEE_CAP, TOOLHUNGRY, YARDRAT }) => {
    const R = window.__rand;
    const car = currentCar();
    const acts = [];
    const solid = [];   // real work
    const filler = [];  // busywork

    if (!car) return { acts, solid, filler };

    // Fuel top-up when a show needs it and there is slack.
    if (state.fuel < 12 && state.money > 900) { buyFuel(Math.min(20, 60 - state.fuel)); filler.push("fuel"); }

    // Content ~60% of weeks.
    if (R() < 0.6) {
      for (const t of ["youtube", "reel", "insta"]) {
        if (!creatorPostBlockedReason(t)) { doCreatorPost(t); filler.push("post"); break; }
      }
    }
    (state.partsInventory || []).forEach((i) => { if (!i.listed && !i.sold) { listPartOnMarketplace(i.id); filler.push("list"); } });

    const buffer = BUFFER; // an average player keeps gas money back, not a war chest
    const toolsOk = (p) => !(p.tools || []).some((t) => !state.ownedTools.includes(t));
    const jobsNow = () => PARTS.filter((p) => !car.installedParts.includes(p.id) && !findActiveTask(car.id, p.id) && car[p.category] < 100);
    const need = { engine: 1, transmission: 1, brakes: 1, steering: 1 };
    const rank = (p) => (!roadworthy(car) && need[p.category] && car[p.category] < 25 ? 1000 : 0) + (p.imp || 0) * 3;

    // Buy the one tool that opens the most work, when it is comfortably affordable.
    for (const p of jobsNow().sort((a, b) => rank(b) - rank(a)).slice(0, TOOLHUNGRY ? 100 : 6)) {
      if (toolsOk(p)) continue;
      const missing = (p.tools || []).filter((t) => !state.ownedTools.includes(t));
      const tool = TOOLS_LIST.find((t) => t.id === missing[0]);
      if (!tool) continue;
      if (state.ownedTools.length >= toolStorageData().maxTools) {
        const ns = typeof nextToolStorage === "function" && nextToolStorage();
        if (ns && state.money > ns.cost + buffer + 400) { upgradeToolStorage(); solid.push("tool storage"); }
        break;
      }
      if (state.money > tool.cost + partCost(p, "diy") + buffer && canOwnTool(tool).ok) { buyTool(tool.id); solid.push("tool:" + tool.name); }
      if (!TOOLHUNGRY) break;
    }

    // Wrench until the money or the parts list runs out. Timers are
    // fast-forwarded: a week is long enough to finish what you can pay for.
    let rounds = 12;
    let started = 0;
    while (rounds-- > 0) {
      let any = false;
      let guard = 4;
      while (guard-- > 0 && activeTasksForCar(car.id).length < workspaceData().maxActive) {
        const doable = jobsNow().filter((p) => toolsOk(p) && state.money - buffer >= partCost(p, "diy"));
        if (!doable.length) break;
        doable.sort((a, b) => rank(b) - rank(a));
        const pick = doable[Math.floor(R() * Math.min(3, doable.length))];
        const before = state.activeRestorations.length;
        installPart(pick.id, "diy", false);
        if (state.activeRestorations.length === before) break;
        any = true; started++;
      }
      if (!any && !activeTasksForCar(car.id).length) break;
      state.activeRestorations.forEach((t) => { if (!t.completed) t.finishTime = Date.now() - 1; });
      resolveCompletedRestorations(false);
    }
    if (started) solid.push("diy x" + started);

    // Big jobs go to the shop when the wallet is genuinely comfortable.
    let shopRounds = 4, shopped = 0;
    while (shopRounds-- > 0) {
      const big = jobsNow().find((p) => (p.tier === "Quality" || p.tier === "Show Grade") &&
        state.money - 1200 >= partCost(p, "shop"));
      if (!big) break;
      const before = state.activeRestorations.length;
      installPart(big.id, "shop", false);
      if (state.activeRestorations.length === before) break;
      state.activeRestorations.forEach((t) => { if (!t.completed) t.finishTime = Date.now() - 1; });
      resolveCompletedRestorations(false);
      shopped++;
    }
    if (shopped) solid.push("shop x" + shopped);

    // A broke Saturday at the yard: parts at 40% off DIY for $15 and the week.
    let trip = null;
    if (YARDRAT && tripKnown("yard") && !hasActiveRestorations() && state.money < 500 && state.money > 120 && !state.atTrip) {
      commitScavengeTrip("junkyard");
      if (state.atTrip) {
        trip = "yard";
        let g = 12;
        while (g-- > 0) {
          const affordable = (state.junkyardStock || []).filter((st) => {
            const part = PARTS.find((pp) => pp.id === st.partId);
            return part && state.money >= st.price && !(part.tools || []).some((t) => !state.ownedTools.includes(t));
          });
          if (!affordable.length) break;
          const before = (state.yardPulls || []).length;
          pullYardPart(affordable[0].partId);
          if ((state.yardPulls || []).length === before) break;
        }
        endScavengeTrip(true);
        solid.push("yard trip");
      }
    }
    // Yard pulls install free, so drop them on the truck.
    let g2 = 12;
    while (g2-- > 0) {
      const pulls = (state.yardPulls || []).filter((y) => y.carId === car.id);
      if (!pulls.length || activeTasksForCar(car.id).length >= workspaceData().maxActive) break;
      const before = state.activeRestorations.length;
      installYardPull(pulls[0].id);
      if (state.activeRestorations.length === before) break;
      state.activeRestorations.forEach((t) => { if (!t.completed) t.finishTime = Date.now() - 1; });
      resolveCompletedRestorations(false);
      solid.push("yard install");
    }

    const wsNext = WORKSPACE_LEVELS[getWorkspaceIndex(state.workshopLevel) + 1];
    if (wsNext && state.money > wsNext.cost + 3000) { upgradeWorkspace(); solid.push("workspace"); }

    // Shows: enter the best one open, skip ~20% of chances.
    let entered = null;
    if (typeof tabUnlocked === "function" && tabUnlocked("shows") && !state.enteredShowsThisWeek.length && !state.postShowWeekLocked && R() >= 0.2) {
      const tierRank = { National: 3, Regional: 2, Local: 1, "Cars & Coffee": 0 };
      const open = getCurrentShows().filter((s) => s.weeksUntil === 0 && showProgressRequirement(s).ok &&
        !(SKIP_COFFEE && s.tier === "Cars & Coffee") &&
        !(COFFEE_CAP != null && s.tier === "Cars & Coffee" && getShowCounts().coffee >= COFFEE_CAP) &&
        getOverall(car) >= (s.minScore || 0) && state.money >= (s.fee || 0) + 100 && state.fuel >= (s.fuel || 0));
      open.sort((a, b) => (tierRank[b.tier] || 0) - (tierRank[a.tier] || 0));
      if (open.length) { entered = open[0].name; enterShow(open[0].id); solid.push("show:" + open[0].name); }
    }
    return { acts, solid, filler, entered, trip };
  }, { SKIP_COFFEE, BUFFER, COFFEE_CAP, TOOLHUNGRY, YARDRAT });

  // ── run season one ───────────────────────────────────────────────────────
  // Entering a show calls advanceWeek("after show") itself, so the harness
  // only advances when the week did NOT already move. Double-advancing here
  // is what silently swallows the post-show weeks, which are the strongest
  // dead-week candidates in the game.
  const weeks = [];
  let ticks = 0;
  while (ticks++ < 300) {
    const done = await page.evaluate(() => !!window.__wrapped || (state.seasonNumber || 1) > 1);
    if (done) break;

    await drain();
    const before = await census();
    const key = before.pre ? "P" + before.pre : "W" + before.week;
    const beatsBefore = await page.evaluate(() => window.__beats.length);

    const played = await playWeek();
    await page.waitForTimeout(60);
    await drain();
    const after = await census();
    const weighty = await page.evaluate((n) => window.__beats.slice(n).filter((b) => b.weighty).map((b) => b.t + ":" + b.id), beatsBefore);

    weeks.push({ key, before, played, after, weighty });

    const nowKey = await page.evaluate(() => (inPreSeason() ? "P" + state.preWeek : "W" + state.week));
    if (nowKey === key) {
      await page.evaluate(() => advanceWeek("time"));
      await page.waitForTimeout(100);
      const settled = await page.evaluate(() => (inPreSeason() ? "P" + state.preWeek : "W" + state.week));
      if (settled === key) {
        const stuckN = weeks.filter((x) => x.key === key).length;
        if (stuckN > 4) { errors.push("stuck at " + key); break; }
      }
    }
  }

  const beats = await page.evaluate(() => window.__beats);
  const queued = await page.evaluate(() => window.__queued);
  const pay = await page.evaluate(() => window.__pay);
  console.log(JSON.stringify({ weeks, beats, queued, pay, errors }, null, 0));
  await browser.close();
  process.exit(0);
})();
