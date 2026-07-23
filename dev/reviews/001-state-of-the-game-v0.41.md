# Review 001 — State of the Game at v0.41.0, and the week's direction

- **Date:** 2026-07-23
- **Proposed by:** The chair (board convened on the whole game, not a single feature)
- **Status:** Approved with Changes (converge and deepen, not add)
- **Touches:** the family/time layer, week advance, season rollover, the wife
  and restraint arcs, one destination arrival, one quiet week. Save format:
  additive fields only, no `SAVE_VERSION` bump.

## The identity sentence (the load-bearing outcome of this review)

**Car Guy Simulator is a game about what the obsession costs, with cars as the
engine of that cost.** The build-buy-sell loop, the shows, the rivals, the
followers, and the money are the vivid, satisfying machine the player drives.
The point of driving it is what it takes from the marriage and the family. When
a future change is weighed, this is the measure: does it make the cost land
harder and truer, or does it just add another thing to do? Breadth that does
not sharpen the cost is not this game getting bigger. It is this game thinning
out. Every `/board` from here measures against this paragraph.

## Proposal Summary

No new mechanic. The board was asked to pressure-test the game as it stands at
v0.41.0 and return a priority list for the week. The build is content-rich: a
full scavenge-build-show-sell loop, a social layer, named rivals with two-way
respect, a family cost layer (the wife arc, the restraint arc, kid beats, quiet
weeks), a season structure, radio, a synth music engine, and rebuilt cutscene
art, all in one 24k-line single file. The question the room actually answered:
is it memorable and focused, or broad and thinning, and what gets the week.

## Round One

The fault line showed in the first pass. Sam Houser, Wynn, and Disney: the
family and restraint arcs are the soul and are underweighted. Benzies, Miyamoto,
and Mike: too many systems, some are chores, cut or deepen. Carmack and the
Technical Director: 24k lines in one file, the risk is maintainability, not
performance. Gilligan and Nolan: the family beats reset and arrive at a constant
rate, so they carry no weight. Sid Meier and Newell: most weeks are errands, not
decisions, and systems run in parallel instead of generating stories. Miyazaki:
there is no week that asks nothing. Obama reframed it: half the room thinks this
is a business sim and half thinks it is a marriage story, and we have never
written down which.

## Open Boardroom Discussion

Obama forced the identity question first, and the room converged on the marriage
story with cars as its engine (see the identity sentence above). From there a
rare cross-bench consensus formed. Sheridan, Nolan, Gilligan, and Mike arrived
from four directions at the same prescription for the family arc: rarer, later,
permanent. Fewer beats, higher stakes, no reset. Sheridan wanted the wife's
dialogue cut and colder as things worsen, silence after a missed week doing the
work; the Player Rep held the line that one beat must stay unmissable so the
"is it broken?" player is safe. Disney named the missing second-act emotion:
week one is pure delight, week forty is empty, and the marriage arc is exactly
what should fill it, but only if paced like a story, not a meter.

The Systems Director and Newell supplied the mechanism: the family layer
currently touches nothing, so it is a diorama. Wire the family cost to the same
scarce resource as everything else, time, and Sid Meier gets his interesting
decision, every race entry and junkyard run becomes a week not spent home.
Carmack agreed the idea was right but insisted it be done narrow, one clean
connection, because in a single-file build with global state, "just connect
them" is where the fragile bugs breed. The Technical Director went further:
seams first, a named region and a pure time budget the family arc reads and
writes in one place, before any consequence is threaded through. Benzies
reframed his cut list, not the family arc, but the systems that do not compete
for the time pile (radio was named as a future cut, not this week's). Miyamoto
pulled the room to the first act: the back half of the build loop is clicks, not
decisions, so cut the chore clicks. Wynn and Garbut argued the destinations
deserve arrivals and thresholds, not menu teleports. Miyazaki held that one week
must ask nothing, and no one answered him, so it made the list.

## Red Team Review

The Red Team's hits that shaped the plan: "rare, late, permanent" fires for a
tiny fraction of sessions and reload erases any permanence the moment saving is
free, so permanence must be answered in design, not just written. Making weeks
newly scarce breaks every number tuned when weeks were free and invites a
soft-lock where a player who spent weeks at home cannot afford the parts that
pay rent. Cutting chore clicks reads as the game getting shallower unless a real
decision replaces them. Arrivals in a single 24k-line file are a bug farm of new
states a save can get stuck in. And a quiet week with no memo reads as a broken
week. The plan below is built to dodge these: weeks are not made newly scarce
(the season is already 22 weeks), the budget is derived from data the game
already records, one beat stays unmissable, and the seam lands before the wire.

## Final Vote

| Executive | Vote | Reason |
| --- | --- | --- |
| Sam Houser | Approve with Changes | Only if the week makes the marriage matter more. |
| Leslie Benzies | Approve with Changes | Net systems must not increase; deepen, do not widen. |
| Aaron Garbut | Approve with Changes | Thresholds between places, or the world stays a menu. |
| Dan Houser | Approve with Changes | She has to want something that persists; fix the reset. |
| Taylor Sheridan | Approve with Changes | Cut the wife's dialogue down before adding a beat. |
| Gameplay Director | Approve with Changes | Back half of the build loop needs a decision or a delete. |
| Systems Director | Approve with Changes | One real system-to-system wire, done properly. |
| Technical Director | Reject until seams exist | Add the region and the time budget first, or it rots. |
| Player Representative | Approve with Changes | Protect one unmissable beat. |
| Christopher Nolan | Approve with Changes | Rare and late, delivered through arrivals, not menus. |
| Vince Gilligan | Approve with Changes | Consequence only counts if reload cannot erase it. |
| Shigeru Miyamoto | Approve with Changes | Cut the chore clicks in the same week we add depth. |
| Sid Meier | Approve | The moment weeks are scarce and shared, this is a game. |
| John Carmack | Approve with Changes | Narrow, one connection, clean. |
| Walt Disney | Approve | The quiet week and the late beat are the missing second act. |
| Gabe Newell | Approve | Family-cost-as-currency is the story engine. |
| Hayao Miyazaki | Approve with Changes | There must be one week that asks nothing. |
| Barack Obama | Approve with Changes | Converge, do not add; write the identity down first. |
| Steve Wynn | Approve with Changes | Give one destination a real arrival as the proof. |
| The Fallbrook Local (Mike) | Approve with Changes | Less reading, more wrenching. |

Tally: 6 Approve, 13 Approve with Changes, 1 Reject-until-seams. Unanimous on
direction: converge and deepen, not add.

## Chair Summary

- **Strongest arguments:** the identity is the marriage story with cars as its
  engine (Obama); the family arc must be rare, late, and permanent, arrived at
  independently by Sheridan, Nolan, Gilligan, and Mike; and the way to make it
  matter is to wire the family cost to time so being home competes with the race
  and the junkyard run (Systems Director, Sid Meier, Newell).
- **Biggest concerns:** permanence versus free reload (Gilligan, Red Team);
  balance shock if weeks become newly scarce (Red Team); and threading
  consequence through a single 24k-line file without seams first (Technical
  Director's Reject, Carmack).
- **Unresolved disagreements:** how deep to cut the wife's weekly dialogue
  (Sheridan wants it stripped, Player Rep wants one guaranteed beat kept); and
  whether radio survives the next convergence pass (Benzies flagged it, no vote
  taken).
- **Recommended revisions:** do not make weeks newly scarce; derive the time
  budget from data the game already records so no existing number is invalidated;
  keep exactly one unmissable beat; land the seam before the wire.
- **Implementation guidance (the week, in order):** (1) log this identity review
  [done, this file]; (2) add a named FAMILY TIME BUDGET region plus one pure
  helper the family arc reads and writes, no behavior change; (3) one clean wire,
  the family arc reads the budget so a busy week is visibly a week not home;
  (4) re-pace the wife arc to rare/late/earned beats, one unmissable, at least
  one surviving into next season; (5) one quiet week that asks nothing and one
  destination arrival. Not this week: deleting radio, and reworking polish/paint
  into decisions (right, but a fast-follow). Push ritual: bump `GAME_VERSION`
  0.41.0 to 0.42.0, keep all new text in-world with no production jargon and no
  em-dashes, run the board gate then the smoke suite, verify new visuals with a
  real render.
