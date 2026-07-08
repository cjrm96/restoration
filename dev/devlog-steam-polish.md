# Big Garage Cleanup — Bug Squash & Polish Update

Hey car folks 👋

This one's a chunky patch. I've been sitting with a stack of your bug reports and playtest notes, and this update knocks out **20+ fixes and additions** — everything from a nasty freeze bug to a whole new tab for the family. Thanks to everyone who wrote in with screenshots and save files; almost every line below started as a message from one of you.

Here's the rundown.

---

## 🐞 Bug Fixes

**The "everything froze" bug is dead.** A few of you hit a show that locked you out — and it didn't just block the show, it quietly froze your random events, loans, and part-selling too. Turns out they all shared one traffic light, and a stuck "show loading" flag kept it red forever. Fixed the root cause *and* added a self-heal so any save that got stuck in this state cleans itself up the moment you load it. If you had a frozen save, it should just work now.

**Advance Week button no longer gets stuck grayed out.** After finishing a show, some players found the Advance Week button permanently disabled — refreshing didn't help. The "Back to Garage" button was leaving a leftover result hanging around that the button mistook for "you're still looking at results." Now leaving the results screen actually clears it, the button unlocks, and old broken saves fix themselves on load.

**MotorTube said "22 weeks" — it meant 2.** The video cooldown timer was using an absolute week number that didn't reset between seasons, so it'd show wild numbers like "22 weeks left." It now reads the correct short cooldown, and it resets properly when a new season starts.

**Season recap now names your *best* result correctly.** Won Nationals but the end-of-season card bragged about your Cars & Coffee showing? Yeah. The ranking had a bug that sorted Cars & Coffee *above* a National win. Now a National trophy always outranks a lesser one, exactly like it should.

**Swap-meet buttons stop teasing you.** Buy buttons were showing up gold (the "you can afford this!" color) even when the tool box was full or you were short on cash. Now they only glow gold when you can actually buy the thing, and otherwise tell you *why* not — box full, no space, or not enough cash.

**No more phantom car in show photos.** A drive-by car from the garage backdrop was sneaking into the show-recap background. It's been shown the exit.

---

## 🔧 Show & Event Flow

**Show sequencing is way tighter.** Finishing a show could get sloppy — a random "found a tool in the driveway" event would pop *over* your results, or the prize-money line would flash back up mid-cinematic. I rebuilt how the game decides "is something already on screen?" so queued events, cutscenes, cinematics, and results now wait their turn cleanly instead of stepping on each other. This applies to every show tier, Local through Nationals.

**Random events know when to stay home.** Events and garage moments no longer roll on the same week you're at a show, so your big day doesn't get interrupted by unrelated drama.

**Road trips respect your active builds.** You can't leave on a scavenge trip while you've got a restoration in progress anymore — and while you're out on a trip, the game keeps you on the trip instead of letting you wander into other tabs and desync things.

**Dig-race timing fixed.** Buck's stoplight challenge no longer tries to trigger on show weeks.

---

## ✨ New Stuff

**Family Saturday has its own tab.** Instead of being buried in the Compete screen, "❤ Family" now sits right up front as its own pill. Take the day off, the build waits, and you get a proper Sunday-drive cutscene. Sometimes the shop can close for a day.

**The Spouse Scenario.** A new event that puts you in the doghouse — the lawnmower's dead, but so is the project's engine block, and you've only got the budget for one. Choose wisely. (Occasionally themed to whatever car's currently on your lift.)

**Buy a bigger tool chest at the swap.** Tired of the "box full" message? You can now buy a larger tool chest right at the Pomona swap meet — 20% off the usual, because it's a swap meet. More slots, more tools.

**Flip parts for profit.** The Pomona swap now stocks a few cheap parts you can buy low and resell — a light little side hustle for players who like working the margins. Look for the "Flip It" cards on your swap trips.

**DMs that grow with your fame.** The old "Messages" app is now **DMs**, and it fills up with fan messages that scale as your following grows. The more famous you get, the busier your inbox.

**One-tap yard-pull installs.** Pulled a part at the yard? There's now a one-tap "Install Pull" button (and it's free), plus a banner shortcut so you're not digging through menus.

**Season cutscenes.** Wrapping a season now plays a winter garage scene — trophies on the shelf, first snow outside — and starting a new one plays a warm spring-morning "pull the cover off" scene. (These just went live with fresh art.)

---

## 🎨 UI & Text Polish

- **Cleaner labels everywhere.** "Storage Speed" is now the clearer "Build Speed"; "Next Event" is "Next Big Event"; the roadworthy row hides itself once your car actually *is* roadworthy; fuel buttons are more compact.
- **Paint booth buttons make sense now.** Relabeled to "Keep it stock" / "Make it a restomod" with a note that it's a build-direction choice, not just a paint color.
- **No more achievement spoilers** sneaking in over the results and cutscene screens.
- **Sponsor watch is tidier** — shows the next 3 upcoming, with an expand option instead of a giant wall.
- **The phone stays one size** and scrolls cleanly, instead of resizing itself as content changes.
- **Show buttons tell you the plan** — "Starts in N weeks," "Opens week X," "Closed until spring," etc., instead of leaving you guessing.
- **Topbar decluttered** and orientation subtitles fade out once you're past the tutorial.

---

That's the batch. As always, keep the reports coming — the screenshots and save files genuinely make these fixes faster. Now get back out there and finish that build. 🏁

— WINNXT Studios
