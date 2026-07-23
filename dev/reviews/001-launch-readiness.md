# Review 001 — Launch readiness: code lock and Steam "done"

- **Date:** 2026-07-23
- **Proposed by:** Hayley (via the Chair)
- **Status:** Approved with Changes
- **Touches:** No code. Process and exit criteria only. Names the save/season
  dead-end matrix as the top technical risk (SAVE_VERSION does not move with
  releases, so old saves into Season 2 are the prime suspect).

## Proposal Summary

No feature was on the table. The board was asked to define the exit criteria
for the project: the conditions for a code lock (freezing the code) and the
conditions under which the game is good enough to launch on Steam. The
charitable concrete version the board reviewed: establish a written, checkable
definition of "done" so that "one more thing" stops being the answer forever,
and so a launch date can actually be committed to. State at review: 0.41.0,
single-file, two seasons of content live.

## Round One

- **Sam Houser:** Lock when the game is undeniably itself, not when the bug list hits zero.
- **Benzies:** Finally. The most expensive word in this project is "almost." Bound it.
- **Garbut:** Done is when the world stops feeling like it has holes, not when the feature list stops growing.
- **Dan Houser:** Done is when the ending lands. Does it land yet? That is my whole vote.
- **Sheridan:** You lock it when you stop adding lines. I bet we are still adding lines.
- **Gameplay Director:** Fun at fifty hours, or fun for the length players actually play? Pick the real number.
- **Systems Director:** Lock when the systems stop surprising us with bad interactions. Not before.
- **Technical Director:** Code lock has a hard meaning: board gate green, smoke suite passing, single-file build self-contained, no crash-on-launch. Everything else is content.
- **Player Rep:** Done is when a stranger finishes it, feels something, and tells a friend. Measurable if we go find the stranger.
- **Nolan:** Wrong word. Define "enough," not "done." Different threshold.
- **Gilligan:** Launchable when the consequences hold together start to finish with no dead ends.
- **Miyamoto:** Is the first ten minutes fun? If not, nothing else matters and we are not close.
- **Sid Meier:** Ship when the core decision loop is provably fun in isolation. Content is polish on top.
- **Carmack:** Code lock is a discipline, not a feeling. Declare it, then only P0 bugs get in.
- **Disney:** Launch when the first five minutes make a promise the ending keeps.
- **Newell:** Steam is not a finish line, it is a start line. Ask what is good enough for day one of a live game.
- **Miyazaki:** Ready is when it can be quiet without feeling empty. Not sure it can yet.
- **Obama:** We are conflating three different locks. Let me name them before this goes in circles.
- **Wynn:** Does the store page make someone want the drive up? First impression sells the code lock nobody sees.
- **Mike:** If I bought this Friday night after work, am I still playing Sunday? Nobody has said how we would know.

## Open Boardroom Discussion

**Obama** cut in first and reframed the whole question: three locks are hiding
inside one, and they have different owners. One, *code lock*, is technical and
the smallest word here (Carmack). Two, *content complete*, a game with a
beginning, middle and end with nothing stubbed (Dan and Garbut). Three,
*ship-ready*, a stranger has a good time unassisted (Player Rep and Mike). You
cannot hit them in the right order by accident.

**Carmack** took code lock off the table as the easy one people keep
mystifying. In this repo it is already half-defined by the push ritual:
GAME_VERSION bumped, `node --check` clean, board gate exits zero, smoke suite
green, single-file build self-contained. Code lock is that plus a *freeze rule*:
after the lock, the only commits allowed are crash fixes, save-corruption fixes,
and softlocks. The value is not the checklist, it is the word "no."

**Benzies** pounced: this project has never said "no." Forty-one minor bumps of
"one more thing." The freeze rule is the actual proposal and he would fight for
it.

**Miyamoto** warned that a freeze on a game that is not fun yet just preserves
the un-fun. Correct lock, premature if the first ten minutes do not hook. Has
anyone watched a new player's first ten minutes without talking? **Player Rep**:
no, and that is the hole in every "are we done" conversation. We grade our own
homework. We have each played this hundreds of times, we are the worst possible
judges of whether it is good.

**Mike** called that the truest thing said: five people who have never seen it,
no help, watch where they get bored and where they quit. Five couches. Not a
vote in this room.

**Newell** went further and dissented from the framing: "done and good enough
for Steam" is a single-player mindset. Steam launch is the day telemetry
*starts*. The bar is "the first hundred players do not refund and we can patch
fast enough to keep the next thousand." Good enough to learn in public.
**Sam Houser** pushed back: "good enough to patch later" is how you launch
generic and spend a year apologizing. The refund window is two hours. If the
first two hours are not us at our most distinctive, telemetry just tells you
precisely why they left. **Newell** clarified he wants the first two hours
excellent and stable, not all fifty perfect. **Obama** flagged the convergence:
Sam wants the first two hours unmistakably this game, Gabe wants them stable and
refund-proof. Same two hours. **The opening is the launch gate, not the whole
game.**

**Disney** anchored it: the first five minutes make a promise, the ending keeps
it, and those two anchors must be finished and locked to a shine even if the
middle has rough edges. **Dan Houser** kept pressing: do we have an ending, or a
place where content currently stops? A Steam player feels the difference in
their spine. **Sheridan** gave the test: if the last scene explains itself, it
is a stopping point; if it trusts the player to sit in it, it is an ending. Is
there silence at the end, or a paragraph telling the player what they felt?

**Nolan** framed "enough" versus "done": you do not need every season, you need
an *arc that closes*. A player who finishes Season 2 and feels the shape
complete forgives a hundred missing features; a player who hits a wall labeled
"more coming" refunds. Early Access exists to make that promise honest.

**Garbut** grounded "done" in holes: the wife, the family, the quiet weeks. If
the player pokes the obvious places and gets nothing back, it reads as
unfinished even when the main line is complete. Done is: no obvious poke returns
emptiness. A finite list we could write this week. **Systems Director** seized
"finite list": his fear is not missing content, it is the systems surprising us.
Two seasons of interacting systems, save/load across them. Does a Season 1
choice ever softlock a Season 2 state? Until proven otherwise, not lockable,
because that is the bug that turns a good review into "lost my save, do not buy."
**Gilligan** agreed: the consequence chain must survive the full runtime with no
dead ends. A choice that ripples is our identity; a choice that ripples into a
crash is a refund with a story attached.

**Carmack** consolidated the emerging list: (1) first two hours excellent and
stable, (2) an arc that closes with the ending polished, (3) no dead ends across
the full save/season runtime, (4) obvious world-pokes return something, then
(5) the freeze. **Sid Meier** added the load-bearing upstream item: before
content-complete means anything, the core loop has to be provably fun in a
five-minute slice with no story attached. If the wrench-and-decide loop is not
fun stripped naked, all we lock is a nice-looking chore. **Miyamoto** formed the
coalition: the order in the room was wrong, fun-of-the-loop is upstream of arc
and world holes. **Benzies** loved it because "fun loop plus polished open plus
closed arc plus no dead ends" is a *cuttable* scope, a budget that says what NOT
to build. Everything else is post-launch.

**Wynn** pulled the room into the parking lot: nobody is standing outside the
game. A Steam launch is the store page, the capsule art, the first screenshot,
the trailer's first three seconds. Ten times as many people never buy because
the page did not promise a destination as refund in the first two hours. Ready
for Steam includes: does the page make a tired guy on his couch want the drive
up? **Mike** backed him: he finds games because a buddy sends a screenshot that
looks like something. If the screenshot is a menu, he is out before he starts.

**Obama** kept it from sprawling: we now have an *inside* gate (Sid's loop,
Disney's open-and-close, Systems' no-dead-ends, Garbut's no-empty-pokes, then
Carmack's freeze) and an *outside* gate (Wynn's store page). Both real, different
owners, same launch.

**Miyazaki** named the thing every list missed: the game is ready not when it is
full but when it can be *empty* well. Can the player sit in a quiet week and feel
peace instead of feeling the content ran out? If the silence feels like a bug,
you are not done. If it feels like a breath, you were done a while ago and did
not notice. **Dan Houser** called it the same knife as Sheridan's ending:
absence mislabeled as intention.

**Player Rep** brought it home: everything technical we can measure ourselves.
The two things we cannot measure from these chairs are the two that decide it,
does the quiet land and does a stranger stay. There is no version of "we are
ready" we can vote into existence. **Newell** gave the uncomfortable honest
answer: you do not *know* from the inside. Define the internal gates, pass them,
then find out from a small closed cohort. Early Access is the tool built for
that uncertainty. **Sam Houser** accepted Early Access on one non-negotiable
condition: the opening two hours ship at full quality, labeled rough only after
that. Nobody gets a second first impression. **Benzies** closed the loop: polish
the front door to a mirror, be honest about the rest, freeze the code around it,
shippable this quarter instead of never.

## Red Team Review

The Red Team assumed it all fails and went after it:

- **"Code lock" is theater if you have never held one.** Forty-one bumps on
  "one more thing" means zero muscle for saying no. The first P1-that-feels-like-
  a-P0 lands and the freeze thaws within a day. A lock you break is worse than no
  lock. Where is the *written* rule for what breaks the freeze, and who is allowed
  to say yes?
- **"Playtest five strangers" has no pipeline.** No build distribution to
  non-devs, no feedback capture, no cohort. A process described as a checkbox but
  never run. Months, not a sprint, and uncosted.
- **The save/season dead-end fear is under-specified and probably already real.**
  Two seasons, branching consequences, a SAVE_VERSION deliberately not bumped
  with releases. Bet an old save already loads into a subtly broken Season 2
  state right now. "No dead ends" is a QA matrix of every choice times every
  season transition times every save version. Who builds it? Nobody named.
- **"First two hours excellent" is unmeasured.** No timing pass. You do not know
  if hour one is the hour a new player experiences or twenty minutes lost in a
  menu.
- **The store page is a whole second project waved at.** Capsule, trailer,
  screenshots, copy, all in-world, no production jargon, no em-dashes, same bar
  as the game. Currently one sentence from Wynn.
- **Miyazaki's "quiet that lands" is unfalsifiable.** Operationalize it or admit
  it is a veto one person holds hostage.
- **Biggest one: none of this has a date.** Exit criteria with no owner and no
  date is a nicer way to never ship. "This quarter" was said once and never
  written down.

## Final Vote

| Executive | Vote | Reason |
| --- | --- | --- |
| Sam Houser | Approve with Changes | Front two hours at full quality, non-negotiable; Early Access label on the rest is fine. |
| Leslie Benzies | Approve with Changes | Approve the scope discipline; attach a date this week or it rots. |
| Aaron Garbut | Approve | The "no empty pokes" list is finite and honest; I will write it. |
| Dan Houser | Approve with Changes | Only if we confirm the ending is an ending, not a content wall. |
| Taylor Sheridan | Approve with Changes | Cut the ending's explanation; if it explains itself it is not done. |
| Gameplay Director | Approve with Changes | Pick the real playtime the fun bar is measured against. |
| Systems Director | Reject (until scoped) | No lock until the save/season dead-end matrix exists; right now it is a hope. |
| Technical Director | Approve | Code lock already has a real definition in the push ritual; add the freeze rule and it is operational. |
| Player Representative | Approve | Finally an admission we cannot judge this from our own chairs. |
| Christopher Nolan | Approve | "An arc that closes" beats "every season done." |
| Vince Gilligan | Approve with Changes | No dead ends has to be proven, not asserted. |
| Shigeru Miyamoto | Approve with Changes | Prove the first ten minutes hook before anything else locks. |
| Sid Meier | Approve with Changes | Add the isolated-loop fun test first, upstream of everything. |
| John Carmack | Approve with Changes | Only if the freeze rule is written down with a named person who can break it. |
| Walt Disney | Approve | Lock the open and the close to a shine; let the middle breathe. |
| Gabe Newell | Approve | Early Access is the honest tool for the uncertainty we actually have. |
| Hayao Miyazaki | Approve with Changes | The quiet has to land; test it on a stranger or it is not measured. |
| Barack Obama | Approve | Right frame: three locks, clear owners, do not ship on a feeling you cannot measure. |
| Steve Wynn | Approve with Changes | The store page is a launch gate, not an afterthought; scope it as its own deliverable. |
| The Fallbrook Local (Mike) | Approve with Changes | Five strangers on five couches or I do not believe any of it. |

**Tally:** 8 Approve, 11 Approve with Changes, 1 Reject (conditional). Unanimous
that a feeling is not a criterion.

## Chair Summary

- **Strongest arguments:** Obama, sharpened by Player Rep and Mike, that the
  board *cannot answer this from its own chairs*. "Done" and "good enough" are
  three separate locks with three owners, and the two that decide a Steam launch,
  does the quiet land and does a stranger stay, are unmeasurable from the inside.
  The deliverable is therefore not a date but a written tiered definition of done
  plus a way to leave the room and find out. Sid and Miyamoto's upstream loop
  test (fun stripped naked before any content gate) reorders the whole checklist.

- **Biggest concerns:** The save/season dead-end matrix (lone Reject) is the top
  technical risk, and SAVE_VERSION not moving with releases makes old saves into
  Season 2 the prime suspect. No stranger-cohort pipeline exists today. No timing
  pass on the first two hours. The store page is unscoped. And the Red Team's
  landing blow: criteria without an owner and a date is a prettier way to never
  ship.

- **Unresolved disagreements:** Sam Houser vs Newell on what "good enough" means,
  resolved into doctrine the board should hold: Early Access is the honest launch
  shape, but the first two hours ship at full launch quality. Rough later chapters
  may be labeled; the front door may not.

- **Recommended revisions:** Adopt the three-lock model with the loop test moved
  upstream. Write the freeze rule down with a named authorizer. Scope the
  stranger-cohort playtest and the store page as their own deliverables. Attach a
  date.

- **Implementation guidance — the tiered definition of done:**

  **Lock 1: Code lock (Technical Director / Carmack).** Push ritual passes
  (GAME_VERSION bumped, `node --check` clean, `dev/board-gate.js` exits 0,
  `dev/qa-smoke.js` passes, single-file build self-contained) *plus* the written
  freeze rule below.

  **Freeze rule.** After code lock, only three commit types are permitted:
  crash fixes, save-corruption fixes, and softlock fixes. Any other change
  requires explicit sign-off from a single named authorizer (the project owner).
  Content, balance, and "quick polish" are not exceptions.

  **Lock 2: Content complete**, in dependency order:
  1. **Loop test (upstream of all):** the core wrench-and-decide loop is fun in a
     five-minute slice with no story attached.
  2. **Bookends:** the first five minutes make a promise and the ending closes the
     arc (an ending, not a content wall, and it does not explain itself).
  3. **Dead-end matrix:** proven no softlock across choice x season-transition x
     save-version. Old saves into Season 2 are the prime suspect.
  4. **No empty pokes:** obvious world interactions and the quiet weeks return
     something; silence reads as intention, not as content running out.

  **Lock 3: Ship-ready (Player Rep / Mike / Newell / Wynn):**
  - A closed cohort of five strangers plays the first two hours unaided; watch
    where they get bored and where they quit. This is the only trustworthy verdict
    on "the quiet lands" and "the stranger stays." The cohort pipeline is itself a
    scoped task, not a checkbox.
  - The store page is its own deliverable: capsule, trailer's first three seconds,
    screenshots that show a feeling not a menu, all in-world, no production jargon,
    no em-dashes, held to the same board gate as the game.

  **The board's definition of ready, in one sentence:** the loop is fun stripped
  naked, the arc opens and closes at full polish, no save path dead-ends, the
  world's quiet reads as intention, five strangers finish the first two hours
  without quitting, and the store page sells the drive up, then you freeze the
  code and Early Access ships.

**Verdict: Approved with Changes.** Turn these gates into a living checklist with
owners and a date, kept in the repo, pointed at on every push instead of
re-litigated.
