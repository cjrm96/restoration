# Review 004 — The beats a good player never sees

- **Date:** 2026-09-05
- **Proposed by:** Hayley (from play: "we keep losing beats, or players rarely get to them")
- **Status:** Approved with Changes (7 Approve / 13 Approve with Changes / 0 Reject)
- **Touches:** `maybeTriggerBankIntro`, `maybeOfferRingPawnStretch`, new
  `buildOutranTheWallet()` helper, ring stretch scene text. No save format
  change, no new tracked state, no new screens.

## Proposal Summary

Three of the heaviest story beats (the loan shark working a show lot, the wife
raising the bank at the kitchen table, the pawn shop open late with the wedding
ring on the dresser) were gated on the player being financially cornered.
Measured over 100 simulated seasons, a comfortable player saw them in 0% of
seasons and a struggling player in 100% / 100% / 74%. The border-run paint beat
had the same fault inverted: gated behind a $7,500 warehouse paint booth, so
the player who wanted cheap paint could not reach it and the player who could
reach it did not want it. The question put to the board: should these beats key
off being broke at all, or off something the player chooses.

## Round One

Sam Houser: we hid our best writing behind losing. Benzies: the beats work
perfectly, for the player they were specified for. Garbut: a pawnbroker waits
for you to want something, not to be broke. Dan Houser: every one of these
scenes is about wanting, and we attached them to not having. Sheridan: the ring
scene fires for the player least equipped to feel it. Gameplay Director: a
player doing well is punished with silence. Systems Director: one input, one
gate, that is why it is brittle. Technical Director: eligibility predicates in
one file, the risk is scope not code. Player Rep: players never know what they
missed. Nolan: some things should stay unreachable. Gilligan: the shark needs
you exposed, not broke. Miyamoto: three beats, three predicates, not a system.
Sid Meier: the player makes no decision that summons these. Carmack: do not
confuse the delivery bug you already fixed with this one. Disney: nobody
anticipates a scene they have never heard of. Newell: "I pawned the ring" is
the story players tell each other. Miyazaki: better one player in ten never
forgets it than everyone sees it and it becomes furniture. Obama: we are
arguing two questions as one. Wynn: the pawn shop is a place with its light on
and 90% of customers never drive past it. Mike: I never met the shark, and it
felt like the game had less in it than you said.

## Open Boardroom Discussion

Obama separated the two questions: is being broke the wrong trigger, and should
good players see this content. Gilligan took the first: poverty is not the
wrong trigger, it is a **lagging** one. By the time the account is under $250
the decisions that put it there happened eight weeks ago, so the scene arrives
as a status report rather than a consequence. Sid Meier pressed the same point
from the decision side: nothing the player is doing right now summons any of it.

Sheridan supplied the argument that carried the room. The ring scene turns on
one line, *"she has never once doubted this build"*, and that line only lands if
there is something worth doubting. A broke player has nothing. A player deep
into a truck that is finally beautiful is exactly who it was written for, and
exactly who never sees it. The trigger is not poverty, it is **investment**: he
is not tempted because he is poor, he is tempted because he is close.

Garbut gave it the world's version: the shark does not read your bank
statement, he works show lots looking for a truck too nice for its owner's
tools. Disney noted this inverts the feeling for the better, dread arriving
inside a good moment rather than at the bottom.

Miyazaki defended the silence: the season already carries about 1.2 events a
week, the quiet weeks are where the truck is, and every proposal that begins
"find the right player" ends at 100%. Gilligan agreed with the pattern and
disagreed on the case: re-keying to investment does not raise the rate to 100%,
it moves it to the players the scene was written for, and a cautious player who
never overreaches still never sees it. Miyazaki's condition: write that
constraint where the code can see it, not only in the meeting.

Nolan argued the shark might be better as a rumour, and put it to Mike, who
said the opposite: not knowing is fine, knowing and never reaching it is
missing out, and nobody plays a car game trying to go broke. Nolan conceded the
position.

Benzies and Carmack held the line on cost. Carmack priced the cheap version
(replace the predicates with reads of state already in the save, no meter, no
migration) and would sign that; he would fight an ambition system that writes
new state weekly. Sid Meier accepted cheap on one condition: the trigger has to
be legible, and Sheridan pointed out the scenes already say it out loud, so it
costs a sentence rather than a system. The Gameplay Director named the
deliverable nobody had: assert the delivery rates in the smoke suite the way
the birthday card is now asserted, or this meeting happens again in four months.

## Red Team Review

The 0% was measured on a harness that pins wealth to a fixed value every week;
a real comfortable player dips under $250 routinely, right after an $850 paint
job and right before payday. Measure a real play trace before rewriting
anything. "Investment and exposure" is a mood, not a predicate, and the moment
it is written it becomes `overall > 60 && history.length > 4`, which finds every
competent player at the same point in every run: a scripted cutscene in an
emergent costume. The delivery bug was only just fixed and these beats have not
been re-measured since, so eligibility may be about to overshoot into "the
shark will not leave me alone". Once-ever on the ring deletes the best scene
from every virtuous run. The shark line must not claim "every show this season"
when the gate is five Cars & Coffee visits, which is week six. And the three
beats currently form a **ladder** down one axis; re-key them to three axes and
there are three good scenes and no descent.

## Final Vote

| Executive | Vote | Reason |
| --- | --- | --- |
| Sam Houser | Approve with Changes | The writing exists to be read, but keep the ladder intact. |
| Leslie Benzies | Approve with Changes | Cheap version only, coverage checks mandatory. |
| Aaron Garbut | Approve | The shark works show lots, not bank statements. |
| Dan Houser | Approve with Changes | Re-key to wanting, not lacking, and let the scene say why. |
| Taylor Sheridan | Approve | Investment, not poverty. One line makes it legible. |
| Gameplay Director | Approve with Changes | Only with the delivery-rate assertions. |
| Systems Director | Approve with Changes | Cheap version now, ambition input revisited later. |
| Technical Director | Approve with Changes | No save migration, no new tracked state. |
| Player Representative | Approve | Players cannot miss what they never knew existed. |
| Christopher Nolan | Approve with Changes | Mike moved me, but keep something nobody is guaranteed to see. |
| Vince Gilligan | Approve | Poverty is lagging, exposure is the real consequence. |
| Shigeru Miyamoto | Approve with Changes | Three predicates. If it grows a meter I flip to Reject. |
| Sid Meier | Approve with Changes | Only if the trigger is legible in the writing. |
| John Carmack | Approve with Changes | Cheap version signed, and re-measure with a real trace first. |
| Walt Disney | Approve | Dread inside a good moment beats dread at the bottom. |
| Gabe Newell | Approve | Let more players earn the story they tell afterwards. |
| Hayao Miyazaki | Approve with Changes | The right player, never every player, and write it into the code. |
| Barack Obama | Approve with Changes | Re-key three predicates, do not touch the economy. |
| Steve Wynn | Approve | The pawn shop is a destination. Let people drive past it. |
| The Fallbrook Local (Mike) | Approve | I am not going broke on purpose to see your best writing. |

## Chair Summary

Approved with changes, contingent on measuring a real play trace first.

**The contingency was run before any code changed.** Money was left unpinned
and allowed to move the way a season moves it: the wage on its own four-week
clock, the weekly tabs billing themselves, and the player spending on parts.
300 seasons per profile. The Red Team was right to demand it and wrong about
the outcome: a careful debt-free builder never dipped below $3,452 and still
saw 0% / 0% / 0%.

Implemented, in the cheap form Carmack and Benzies funded:

- `buildOutranTheWallet(factor, floor)`, reading only `getOverall(currentCar())`
  and `state.money`. No new state, no migration, no screen. The threshold
  scales with the build, because the better the truck the more it costs to keep
  moving, so the same few hundred dollars that was comfortable early is thin
  later. `floor` is how far along the build must be before this reads as
  temptation rather than an ordinary broke week.
- The **bank** intro, which is the entry to the whole ladder and the actual
  blockage, now opens on either three lean weeks (as before) or a build that
  has got ahead of the account, at a low floor of 30.
- The **ring** stretch road keeps its loan requirement, which *is* the ladder,
  and trades its flat $250 for the same test at a floor of 55.
- The **shark** was left alone. He already reads exposure plus thin money and
  was firing; the bank fix raises him on its own.
- The ring scene no longer claims the account is "thirty bucks from empty",
  since the gate no longer checks that. Per the Red Team's warning about text
  claiming what the gate does not.

Measured after, same traces:

| player | shark | bank | ring |
| --- | --- | --- | --- |
| careful, no debt | 0% | 0% | 0% |
| normal, no debt | 12% | 0% then 14% | 0% |
| normal + tool truck tab | 59% | 6% then 60% | 13% then 23% |
| aggressive + tab | 100% | 96% then 100% | 74% |

Miyazaki's constraint holds: the builder who is genuinely never cornered still
gets silence. Nothing that was not already at 100% moved to 100%.

The Gameplay Director's coverage requirement is in the smoke suite as "the
money beats find a cornered builder and leave a comfortable one alone", which
fails in both directions: if a comfortable builder starts being chased, and if
the bank falls back below 20% for a cornered one.

**Unresolved and deliberately not actioned:** whether the ring is once-ever or
once-a-season. It currently stands at once-a-season. Disney's objection, that
once-ever deletes the scene from every virtuous run, was never answered, and
Gilligan's counter was asserted rather than argued. Also unactioned: the Red
Team's ladder warning is respected here only because the ring kept its loan
requirement; if a future change removes that, the descent goes with it.
