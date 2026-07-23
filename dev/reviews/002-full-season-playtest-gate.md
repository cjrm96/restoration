# Review 002 — Play the season before adding a fourth system

- **Date:** 2026-07-23
- **Proposed by:** The chair (board convened on "what's next" after 0.44.0)
- **Status:** Approved (unanimous), with three hardening conditions
- **Touches:** no new code by itself. This is the gate that decides the next
  build. Instrumentation only; the fork it selects becomes the next review.

## Proposal Summary

Three weeks produced three interlocking systems that have never run together in
a real game: the family time budget (0.42.0), the choose-home weekend (0.43.0),
and the Setup (0.44.0). Each was unit-tested in isolation. The board declined to
add a fourth system and instead approved a single move: play one full 22-week
season with all three live, instrumented against a written bar, because the
result forks every candidate next-build. If the week is crowded, cut radio to
relieve it; if the Setup feels like a real decision, deepen it by giving rivals
their own Setups; if a reload erases the marriage, permanence jumps the queue.

## The pass bar (written before playing, per the Red Team)

Two play styles, minimum: a **balanced** player (enters shows at a normal
cadence, takes an occasional home weekend, rarely re-tunes) and a
**show-min-maxer** (chases matched shows, re-tunes the Setup often, skips home).

1. **Four-way week economy, no soft-lock.** Home, Setup re-tune, show entry, and
   junkyard run all burn a week. Across 22 weeks the min-maxer must always have
   a *choice*, never a state where they cannot afford the week or the cash to do
   the necessary thing. A soft-lock is a fail.
2. **Strain fires honestly under real play.** The show-min-maxer who skips home
   trips the marriage strain; the balanced player who takes even an occasional
   home weekend never does. (The 0.43.0 bar, now under a full mixed season, not
   a synthetic cadence.)
3. **The Setup reads as a real decision.** In the min-maxer season the Setup is
   re-tuned at least once for a nameable reason (a show's axis, a rival's
   build). If the optimal play is set-it-once-and-forget, the decision is thin
   and that is a finding.
4. **Reload does not trivially erase the marriage.** If reaching The Porch Light
   invites a reload-to-undo (the beat fires, then a reload of a prior autosave
   wipes the strain and its permanent carry), permanence is theater and becomes
   its own next item.
5. **The three systems interact correctly, not just coexist.** Specifically:
   a week spent on an *away* activity (junkyard, swap meet, Setup re-tune) must
   count as away, not accidentally heal the marriage because "no parts were
   installed." If an away week reads as home, that is an interaction bug and a
   fail of this gate.

Any fail is a finding to fix before the deepening build; it does not sink the
systems, it re-orders the queue.

## Round One

Obama: we've added three systems and never watched them run together, that's the
question. Benzies: radio, deferred three times, is avoidance. Newell and the
Systems Director: give rivals Setups, every show becomes a read, that's where
the stories are. Mike and the Player Rep: nobody has played a season with all of
this in it. Carmack: rivals-with-Setups is a cheap field but the rival-difficulty
re-balance is not; and four things now compete for a 22-week budget. Gilligan:
permanence is still a lie a reload erases. Miyamoto: the loop is finally good,
deepen an existing thing, don't add a fourth. Disney: we do not know what all
three feel like at once. Sheridan: the wife's cut lines were a theory, untested
by a real save.

## Open Boardroom Discussion

The camps were deepen (Newell, Systems, Sid) versus consolidate (Mike, Player
Rep, Disney, Sheridan), with Benzies pressing radio regardless. Newell made the
case that rivals-with-Setups is the payoff of everything built: Buck bringing a
Brawler turns a stat check into a read the player narrates. Mike punctured it by
naming a concrete risk nobody had priced: choose-home burns a week, Setup
re-tune burns a week, a show burns a week, a junkyard run burns a week, and
three of those four are new this month. Carmack confirmed the four-way scarce
week economy could be tense or a soft-lock and nobody had run the numbers.
Disney reframed caution as information: we cannot pace or deepen a feeling we
have not watched a player have. Gilligan held that the playthrough answers his
question too, watch whether the tester reloads. Obama landed it: almost everyone
wants the same first move for different reasons, and the playthrough gates every
fork, so it is the informative move, not the cautious one.

## Red Team Review

No instrumentation, no result: "does it feel good" is not a pass condition, and
without one written first the playthrough will ratify whatever the room already
wanted to build. One run is an anecdote: a balanced tester never hits the
four-way crunch, declares it fine, and the soft-lock ships to the min-maxers.
Rivals-with-Setups is priced as "one field" but the rival-difficulty re-tune
across every tier is the real cost. And radio has been called noise for three
sessions without anyone checking whether players are attached to it; measure
before amputating.

## Final Vote

| Executive | Vote | Reason |
| --- | --- | --- |
| Barack Obama | Approve | The season makes every other decision informed, not guessed. |
| Player Representative | Approve with Changes | Written pass bar and more than one play style. |
| The Fallbrook Local (Mike) | Approve | Let me actually play it before you add more. |
| Walt Disney | Approve | The feeling is the data; instrument it. |
| John Carmack | Approve | One season answers the week-economy question. |
| Sid Meier | Approve with Changes | Frame the hypothesis: is the Setup good enough to give the AI. |
| Gabe Newell | Approve with Changes | Rivals-with-Setups stays the deepening target if it proves out. |
| Systems Director | Approve | It tells us if the three systems interact or just coexist. |
| Vince Gilligan | Approve with Changes | The playtest must check whether a reload erases the marriage. |
| Leslie Benzies | Approve with Changes | Radio cut is the pressure valve if the week is crowded. |
| Shigeru Miyamoto | Approve | Feel the third thing before adding a fourth. |
| Taylor Sheridan | Approve | Test the wife's silence with a real save. |
| Steve Wynn | Approve | World arrivals wait. |
| Aaron Garbut | Approve | No objection to the sequence. |

Unanimous approve, three hardening Changes: a written pass bar (above),
multiple play styles, and an explicit reload/permanence check.

## Chair Summary

- **Strongest argument:** the playthrough converts four open questions (do the
  systems combine, is the four-way week economy tense or broken, does it feel
  right, does reload kill permanence) into answers, and every candidate build
  forks on those answers.
- **Biggest concern:** without a pre-written bar and a min-maxer run, the test
  ratifies a foregone conclusion and ships a soft-lock to the players who push
  hardest.
- **Unresolved:** whether radio survives (measure attachment, not just noise),
  and whether rival-Setups' hidden cost is the difficulty re-balance.
- **Recommended next step:** run two instrumented seasons against the bar, then
  fork: Setup proven and week has slack, deepen with rival Setups; week crowded,
  cut radio; reload erases the marriage, fix permanence.
- **Implementation guidance:** write the bar first (done, above). One run is an
  anecdote; play balanced and min-maxer. The next review logs the fork the data
  picks and justifies the build that follows.

## Playtest Results (post-play, 2026-07-23)

Two seasons plus a control were driven through the real `performWeekAdvance` for
20 competitive weeks each. Results against the bar:

- **Item 5 (interaction) FAILED, then fixed.** The headline finding. The idle
  detector classified any week with no parts installed as "home with the
  family", including weekends spent OUT at the junkyard or swap and weeks spent
  in the shop on a Setup re-tune. Under real play the min-maxer who never chose
  home (only junkyard, re-tune, and shows) posted **13 of 20 weeks as home and
  never strained**; a control that ran the junkyard every single weekend posted
  **20 of 20 as home, a spotless marriage.** The marriage cost evaporated for
  exactly the most obsessed player. Fixed in 0.44.1: a "Saturday trip" or a
  "setup re-tune" is an away errand, never a quiet week. Re-run confirms the
  min-maxer now posts **0 home weeks, 20 away, strains at week 6**; the control
  strains at week 6; the balanced player is unchanged and never strains.
- **Item 2 (strain honest) PASS.** Balanced (a home weekend every fifth week)
  never strains; min-maxer (never home) strains at week 6, exactly the 0.43.0
  bar holding up under a full mixed season.
- **Item 1 (soft-lock) not reproduced.** The min-maxer fit twenty weeks of
  activity with choices to spare; if anything the pre-fix problem was the
  opposite of scarcity. No four-way week soft-lock observed. (Caveat: the money
  economy was not fully simulated; the week structure shows no lock.)
- **Item 4 (reload/permanence) PASS.** The strain beat sets its permanent marks
  (`homeStrainSeasons`, the recorded away week) before `saveGame()` at the end
  of the same advance, so a normal reload loads the post-beat state and keeps
  the strain. Only a deliberate restore of an older backup could undo it, which
  is acceptable.
- **Item 3 (Setup reads as a decision) deferred to the fork.** Today the Setup
  is you against a score threshold; the re-tune-versus-a-week tradeoff exists
  but has no opponent reading it. It becomes a live decision when rivals bring
  their own Setups. Not falsified; this is precisely what the deepening build
  makes real.

### The fork the data picks

The week economy is not crowded to a soft-lock, so radio is not forced. Reload
does not erase the marriage, so permanence does not jump the queue. The three
systems now combine correctly (once the interaction bug was fixed this turn).
What remains is that the Setup is a proven-correct foundation but still a solo
puzzle. **The fork points to deepening it: give rivals their own Setups**, the
Newell/Systems payoff, which also converts pass-bar item 3 into a live decision.
Carmack's flagged hidden cost stands: the real work in that build is not the
rival field, it is re-balancing rival difficulty across every tier once their
scores move. That is the next review and the next build.
