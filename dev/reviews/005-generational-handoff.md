# Review 005 — The generational handoff ("Somebody Else's Tarp")

- **Date:** 2026-09-17
- **Proposed by:** The reach audit (`dev/story-notes-reach-audit.md`), which
  listed it as "the one true finale left to write" and said it should come last.
- **Status:** Approved with Changes (8 Approve, 12 Approve with Changes, 0 Reject)
- **Touches:** `renderVictoryModal()` stage 7, `handoffUnlocked()`,
  `maybeKidWrenchBeat()`, the load migration, `.cs-caption-long`, the art prompt
  bible. New flag `state.kidRightOne`. **No `SAVE_VERSION` change**, the flag is
  optional and back-compatible, and veterans are grandfathered on load.
- **Note:** retroactive. The beat shipped in 0.87.0 and was reviewed after the
  fact at the user's request. The board's accepted revisions went in as 0.87.1
  before the release was pushed live.

## Proposal Summary

A seventh stage on the victory ceremony, after the next tarp. The player drives
across town to a rented bay behind a tire shop and watches their grown kid pull
the cover off a project car. They stay at the fence and do not go in, which is
what Ray was doing at the back of that Regional years ago. Gated on
`handoffUnlocked()`: the season-three "The Right One" beat must have landed
(`state.kidRightOne`) AND this must be career build #3 or later. Everyone short
of that still ends on the next tarp. The Ray paragraph branches on
`uncleRegionalSeen`; the kid is under the player's first Legacy Wall model.

## Round One

- **Sam Houser:** The thing the game has been circling for eighty versions.
- **Benzies:** One render function and a boolean. Suspiciously cheap.
- **Garbut:** A rented bay behind a tire shop is the right address. Nobody's
  first space is a nice space.
- **Dan Houser:** Everybody in it wants something and nobody says it.
- **Sheridan:** Ninety words too long, and one of those words is "finally".
- **Gameplay Director:** A cutscene bolted to a cutscene. Not my department.
- **Systems Director:** It touches nothing. Reads two flags and renders.
- **Technical Director:** Clean. The art fallback worries me.
- **Player Rep:** I'd sit there a minute before clicking. That's the review.
- **Nolan:** The Ray branch does the player's thinking for them.
- **Gilligan:** Nothing changes after. Where's the ripple?
- **Miyamoto:** I'd remove about a fifth.
- **Sid Meier:** There is no decision here. Somebody should say it out loud.
- **Carmack:** Two booleans and a template string. I have nothing, which never
  happens.
- **Disney:** The payoff the ceremony builds to, and almost nobody sees it.
- **Newell:** That bothers me too, from the other end.
- **Miyazaki:** He stands at a fence and does not go in. Leave it alone.
- **Obama:** Before we relitigate the gate, what is this screen *for*?
- **Wynn:** It plays over the player's own trophy wall. That's a brag.
- **Mike:** The 9/16 line got me. The rest I skimmed.

## Open Boardroom Discussion

**The gate.** Disney opened by running the funnel: build #3 plus a season-three
beat is the last one percent. Newell defended scarcity as the reason people talk
about a thing; Disney drew the line between a rare reward and a room nobody
opens. Mike grounded it: "I play a season, maybe two, I put it down when the
season ends. You built the best part of your game for somebody who isn't me."

Obama reframed and broke the loop: **are we arguing about the gate, or about
what the screen is?** If it is a reward, the gate is correct. If it is the
game's thesis, then locking it behind three careers means most players never
learn what the game was about. Sheridan said it is the thesis and has been since
the toolbox showed up with rust on it. Dan Houser followed: then it cannot be a
trophy.

Newell resolved it, and this is the argument that carried the room: **the thesis
is already in the game.** The wrong wrench, holding the light, the right one
before you asked. Seasons one through three, everybody gets them. This screen is
the *receipt*, not the argument. Gilligan said that was the first thing in the
meeting that moved him on the gate. Disney conceded the gate on that framing and
said the reach would have to come from somewhere else.

**The ripple.** Gilligan's standing objection: nothing changes after. You watch
it, click Start a Legacy Build, and build four is identical to build three. "An
ending you then click past into more game is an intermission with good
lighting." The Technical Director priced a real fix (new state, a beat pool, a
DM variant) and Carmack added the migration cost across every existing save.
Benzies: "One line I can fund. A system I can't." Obama parked it as a logged
follow-up rather than a blocker.

**The writing.** Nolan and Sheridan arrived independently at the same sentence:
"Standing at this fence you finally get it." Sheridan's case is that the image
has already said it, the reader reaches Ray on their own about four words early,
and the line beats the player to their own realization, converting it from their
idea into the game's. Dan Houser proposed cutting the clause and keeping the
paragraph, because "He wasn't leaving early. He was staying out of the way"
lands harder with nothing in front of it. Agreed without dissent.

Miyamoto pushed on length (five paragraphs on the last screen of a six-screen
ceremony) and Mike confirmed he read two of five. The Player Rep argued two of
five landing on the final screen after twenty hours is a good rate. Miyazaki
entered the one protected line: **"You get as far as the fence." Six words alone
on a line. Do not cut it for length.**

**The art.** Wynn made the sharpest catch of the session. The art does not exist,
so the beat falls back to `scene-legacy-wall`, which is *the player's own wall of
trophies and framed cars*. A scene about humbly standing outside somebody else's
rented garage was playing over a monument to the player's wins. Not a
placeholder, a contradiction. Garbut made it worse: the Legacy Wall is a specific
place in this world and it belongs to the player, so using it here says the kid's
bay is the player's bay.

Wynn proposed reordering to the barn find. Nolan immediately went further: **the
last image in the game is the first image in the game.** Same barn, same cover,
same shape nobody has looked under, except this time it is not yours. Sam Houser
said he would almost ship that as the intended art. Garbut talked him down: the
written prompt (chain-link fence, rented bay) is the honest version of the scene,
but barn-find is the right stand-in and a much better accident than the shipped
one.

**Agency.** Sid Meier asked what decision the player makes and got "none" from
the Gameplay Director, who pointed out the previous six screens also have none,
so the objection lands on the whole finale or nowhere. Sid withdrew it as an
objection and kept it as a note: seven consecutive screens without agency, in a
game whose pitch is agency. The Systems Director said that was his own objection
stated better than he had managed.

## Red Team Review

**The flag is retroactively unreachable and nobody in the room caught it.**
`state.kidRightOne` is only written going forward, at the moment the
season-three beat fires. Every existing save that watched "The Right One" months
ago carries no flag. That population is *exactly* the one that qualifies on build
count. They are locked out and must sit through the same kid beat a second time
in a later season to unlock a scene they already earned. This file writes a dozen
careful migrations grandfathering veterans in, each with a comment explaining
why, and this one was skipped. `state.kidWrenchSeason >= 3` was sitting right
there.

**The art contradiction is shipped, not pending.** Treated as an aesthetic
quibble when it is live in a pushed build.

**The two gate conditions were never checked against each other.**
`kidRightOne` implies season 3+; `legacyBuilds.length >= 2` implies roughly
season 4+. Nobody demonstrated the second does not make the first redundant. A
two-part gate that is really a one-part gate wearing a coat.

**Five paragraphs in an absolutely positioned box with `overflow-y: auto`.**
Overflow was tested at three landscape viewports. The scroll path exists
precisely so the copy *can* exceed the box. When it does, the player scrolls
inside a cinematic frame with no scrollbar affordance. A scroll region with no
scroll signifier.

**"Career build #3" counts builds, not wins.** `legacyBuilds` takes every
completed build, including via `dismissVictoryCallItDone`. The gate says "came
back out for another one"; what it measures is "finished three cars."

**The scene has no failure state.** Every other emotional beat branches on the
moral ledger. The finale's own cost screen knows whether you sold her car,
pawned the ring, took the shark's money. The handoff does not care. A player who
burned every relationship gets the identical warm scene as one who held the line.
The game's best screen is the only one that does not know who you were.

## Final Vote

| Executive | Vote | Reason |
| --- | --- | --- |
| Sam Houser | Approve | The scene the game has been owed since the toolbox arrived with rust on it. |
| Leslie Benzies | Approve with Changes | Payoff enormous, cost two booleans. Take the cheap fixes, park the systems work. |
| Aaron Garbut | Approve with Changes | The address is right. The art over the player's own wall is not. |
| Dan Houser | Approve with Changes | Everyone wants something, nobody says it. Cut the clause that says it. |
| Taylor Sheridan | Approve with Changes | Delete "you finally get it." The image got there first. |
| Gameplay Director | Approve | No agency, but the whole ceremony has none. Not this screen's problem. |
| Systems Director | Approve with Changes | Isolated beat. Approving on condition the ripple is logged. |
| Technical Director | Approve with Changes | Clean implementation, but the missing migration is a real defect. |
| Player Representative | Approve | Players will sit with this one before clicking. That is the job. |
| Christopher Nolan | Approve with Changes | The callback is made by the player and then explained to them. |
| Vince Gilligan | Approve with Changes | A receipt, not an intermission, but only if something later remembers. |
| Shigeru Miyamoto | Approve with Changes | A fifth too long. Cutting the explaining clause is most of that fifth. |
| Sid Meier | Approve | No decision, withdrawn. Seventh screen without agency is a trend, not a bug. |
| John Carmack | Approve | Two booleans and a template string. Add the migration and I have nothing. |
| Walt Disney | Approve with Changes | Lost the gate to Newell's receipt framing. The backfill is how I get reach back. |
| Gabe Newell | Approve | Rare is why it gets talked about. The thesis is already in seasons one to three. |
| Hayao Miyazaki | Approve | He stands at the fence and does not go in. Do not cut "You get as far as the fence." |
| Barack Obama | Approve with Changes | Reward or thesis was the real question. It's a receipt. Gate stands, three fixes go in. |
| Steve Wynn | Approve with Changes | Fix the art fallback or the rarest screen in the game is a brag. |
| The Fallbrook Local (Mike) | Approve with Changes | The 9/16 line is great. Do the picture. I noticed the trophies. |

## Chair Summary

- **Strongest arguments:** Newell's reframe carried the room. The thesis already
  lives in the kid arc every player gets, so this screen is the receipt and is
  allowed to be rare. Obama's "reward or thesis" reframe is what made that
  reframe possible. Nolan and Sheridan independently converged on the single
  worst sentence. Wynn caught a shipped contradiction everyone else had filed
  under "art pending."

- **Biggest concerns:** the Red Team found a defect no seat caught. Veterans who
  already saw "The Right One" had no flag and were locked out of the screen they
  most qualified for, in a file that grandfathers veterans everywhere else.

- **Unresolved disagreements:** Gilligan and the Systems Director both approved
  conditionally on a ripple that is not being built. Nothing in the world
  remembers the handoff happened. Sid Meier's note stands unanswered: seven
  consecutive screens without player agency at the end of a game about agency.
  The Red Team's last point is also unanswered: the handoff is the only major
  beat that does not read the moral ledger, so it greets a player who burned
  everything exactly as warmly as one who held the line. That may be correct
  (the kid is not a verdict on the parent) but it was asserted, never argued.

- **Recommended revisions, implemented in 0.87.1:**
  1. Backfill `kidRightOne` on load from `kidWrenchSeason >= 3`, with a comment
     matching the house pattern for grandfathering migrations.
  2. Cut "Standing at this fence you finally get it."
  3. Reorder the art fallback: `scene-handoff` then `scene-barn-find`, with
     `scene-legacy-wall` dropped to last.

- **Implementation guidance:** all three verified by a Playwright harness before
  push. The backfill was checked four ways (season-3 veteran granted, season-2
  not granted, no-beat not granted, an explicit `false` respected). The Red
  Team's redundancy question was answered by test: three Legacy Wall builds with
  no `kidRightOne` does **not** open the gate, so the two conditions are
  genuinely independent. `scene-handoff` stayed out of `ART_KEYS` until the webp
  existed, which is what kept a missing file from rendering a black frame.
  Version bumped 0.87.0 to 0.87.1 (patch: fixes and polish), board gate and the
  full smoke suite green.

- **Postscript, 0.88.0:** the art landed and the key went into `ART_KEYS`. The
  delivered image answers Wynn's objection in a way nobody in the room proposed:
  it leaves the older mechanic out entirely and puts the camera behind the
  chain-link fence, so the player is not watching a man watch, the player is the
  one at the fence. The barn find stays as the fallback, so the Legacy Wall
  contradiction cannot recur if the file ever goes missing.

- **Follow-ups logged, not built:** Gilligan's ripple (one line in a later
  season that remembers the handoff), and the moral-ledger branch the Red Team
  named. Both belong to a future review, not to this push.
