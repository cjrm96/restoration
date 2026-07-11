# The Big Build — Fresh Art, Deeper Scene & a Results Glow-Up

Hey car folks 👋

Buckle up, because this is the biggest stretch of updates the shop has ever pushed. Over the last few days I put out **90 commits** — a full repaint of every car, a mountain of new content, a whole new way to make your workspace yours, and a top-to-bottom rework of what happens after a show. Almost every line below started as a note from one of you.

Here's everything that landed.

---

## 🎨 Every Car Got Repainted

The headline: **all eleven car bodies were redrawn from scratch.** The old sprites were flat and a little lifeless; the new ones use a proper light model — a top-left key light, banded highlights and shadows down the panels, split-tone chrome, raked glass, and clean round wheels. They read like actual sheetmetal now.

- **All 11 bodies** got the treatment: the Camaro, Bel Air, Mustang, Corvette, Eldorado, Trans Am, Shelby GT500, Marauder, C10, F-250, and the F-100.
- **Round wheels across the fleet**, plus per-car wheel styles so a muscle car and a work truck don't roll on the same rims.
- **Body-line fixes from your notes:** the Mustang now has a true continuous fastback roofline, the '57 Bel Air got its signature side cove and raked hardtop C-pillar, and the Camaro lost those floating "unfinished" keylines around the nose and deck that a few of you flagged.

If your car looked good before, it looks *finished* now.

## 🏙️ Every Backdrop, Too

With the cars looking that sharp, the scenes behind them had to keep up. So they all got redrawn in the same light-model language:

- **Your workspaces** — the curbside, the carport, and the storage unit.
- **The show venues** — Cars & Coffee is now a real parking-lot meet with a crowd, Local is a small-town Main Street lineup, Regional is a county fairgrounds, and Nationals got polished up.
- **Dedicated venues for the specialty events** — the hill climb, drag night, autocross, drift battles, and the concours each have their own setting now instead of borrowing a generic one.

---

## 🔧 Make It Your Own — Workspace Vibes

When you upgrade your workspace, you no longer just get *a* garage — **you pick the one you want.** Each tier now offers **six different looks**, and the move-in cutscene waits for you to choose:

- **Home Garage:** DIY Hobbyist, Woodshop, Gearhead, Rural Barn, Suburban Clean, and the Classic Garage.
- **Dream Shop:** Industrial, Pro Race Warehouse, Restoration Shop, Hot Rod Shop, Collector Showroom, and the Classic Shop.

Each one has its own character — string lights and a beer fridge, a NASCAR-team fab bay, a rotisserie and paint booth, neon and a checker floor. Pick a fresh vibe every playthrough. (The two "Classic" picks bring back the original shop looks for anyone who's attached to them.)

---

## 🏆 The Results Screen Got a Glow-Up

After a show, you used to get a placement and a number and not much else. Now the results screen actually *explains itself* and reacts to you:

- **"How the Judges Scored It."** Specialty shows weigh specific systems — a drag night cares about power, a concours cares about paint and chrome. The results now break your score down system by system, with weighted bars, and your weakest areas show up in red so you know exactly what to fix before the next one.
- **Scene reputation.** Placing well (or badly) at judged shows moves your standing in the scene, and now you can see it — a reputation readout and your current title, right on the results.
- **"Word Around the Paddock."** This is the big one. Instead of a single canned line, the rivals actually react now — someone crossing into respect (or a full alliance) leads the reactions, then Buck weighs in based on how the gap went *and* your history (the first time you ever beat him hits different), then another rival chimes in depending on how you placed. Cars & Coffee gets a lighter, friendlier version — just scene chatter, no grudges.

---

## 🌟 Deeper Systems

A lot of the plumbing under the game got richer this stretch:

- **Rivals became real.** What started as four rivals with a presence in the ticker grew into a full system — they attend specific show types, warm up to you or don't, can become allies, and their reactions are throttled so they land instead of spamming.
- **Shows judge different builds differently.** The new judging axes mean a purpose-built car swings by venue — you can't win drag night on looks alone, and a rough runner won't take the concours.
- **The scene remembers.** Notable moments stick, your name starts carrying weight, and your reputation quietly nudges the marketplace.
- **Car flipping.** You can list a finished build, field offers, haggle, and sell it — a real exit for a project you're done with.
- **Season cutscenes and more story beats** — a winter wrap and a spring "pull the cover off," plus the maiden voyage, first sale, and buddy-hang scenes.

## 📈 A Mountain of Content

- **Cars: 18 → 40.** More than double the roster.
- **Achievements: 32 → 90.** Nearly triple, and they reward the new systems.
- **Shows: 5 → 19**, with heavy multi-factor gating so the calendar opens up as you earn it.
- **Paint:** eight new respray colors, plus five finishes — gloss, metallic, pearl, satin, and matte.
- **Swap-meet upgrades:** buy-and-resell flip parts, and a bigger tool chest when you're out of slots.
- **DMs** that fill with fan messages as your following grows, and a **Family Saturday** tab so you can take the day off (your marriage will thank you).

---

## 🐞 Bugs Squashed & Rough Edges Sanded

- **The "everything froze" bug class is dead.** A stuck show-loading flag could quietly freeze your events, loans, and part-selling all at once. Fixed the root cause and added a self-heal so old stuck saves clean themselves up on load.
- **Advance Week no longer locks after a show.** An orphaned result was leaving the button permanently grayed out. It clears properly now, and broken saves repair themselves.
- **Show sequencing is tight now.** Queued events, cutscenes, cinematics, and results wait their turn instead of stepping on each other — no more random tool-find popping over your trophy.
- **Sloppy startup fixed.** The intro was letting the game UI flash through before the welcome cutscene faded in. Now the boot holds a clean cover until the cutscene is fully up.
- **The mystery engine smoke is gone.** That odd little smoke box on the engine has been removed everywhere, for good.
- Plus the smaller stuff: the season recap now ranks a National win above Cars & Coffee, MotorTube's cooldown reads the right number across season rollovers, swap-meet buttons stop teasing you when you can't buy, and a phantom drive-by car no longer sneaks into show photos.

---

## 🧪 Behind the Scenes

Every one of these went out through an expanded pre-release smoke test that now drives a full play session end to end — boot, tutorial, a show, the new results panels, the workspace pickers, save/reload, and backup recovery — and refuses to ship on any error. It's why the pace stayed fast without things breaking under you.

---

That's the big one. Thanks, as always, for the screenshots, the save files, and the brutally honest feedback — it's the whole reason the shop keeps getting better. Now go pick a garage and build something.

— The shop
