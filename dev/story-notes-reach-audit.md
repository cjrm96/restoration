# Car Guy Simulator - Story Department Notes

### The reach audit: which narrative beats a real player actually sees

Companion to `story-notes-sheridan-pass.md`. That pass added the weight; this
one asks the harder question: **of everything we wrote, how much does a median
player ever reach?** Estimates below are structural, derived from the trigger
gates in `Car_Guy_Sim.html`, not live telemetry. Split by how a median
one-season and a median three-season (legacy) player actually plays.

Reach tiers: Ubiquitous / Common / Uncommon / Rare / Buried.

## The table

| Beat | Gate (from code) | 1-season | 3-season |
|---|---|---|---|
| Kid: "The Wrong Wrench" | wk >= 3, ~12%/wk roll | Ubiquitous (~90%) | Ubiquitous |
| Uncle Ray at the fence | first Regional show | Common | Common |
| Dale intro | first shop visit | Common (DIY-only players miss it) | Common |
| Birthday card | eligible + ~30%/wk | Common | Common |
| Victory trilogy / Wife DM / Buck's father confession | win Nationals | Common if they win, else Never | Common |
| Dale milestone (discount reveal) | ~5-6 shop visits (trust >= 5) | Uncommon | Common |
| "He Remembers Her" (Dale, '89 brakes) | 12% discount AND own '65 F-100 | Uncommon (S1 starter only) | Buried (wrong car) |
| Shark at the show | took shark loan + show while owing | Uncommon | Uncommon |
| Ally confessions (Harlow/Ricky/Sammy/Leo) | rival reaches ally tier (each separate) | Uncommon | Uncommon |
| Fairground thread | season >= 2 (main line) | Rare (barely present S1) | Common |
| Kid: "Holding the Light" | reach season 2 + roll | n/a | Uncommon |
| Her car's history / the sale | choose to sell the wife's car | Rare | Rare |
| Kid: "The Right One" (the payoff) | reach season 3 + roll | n/a | Rare |
| Dale "Thursday" (Fresno / mortality) | 25% discount (max trust + ~8 visits) | Buried | Rare |
| Ring pawn -> aftermath -> redeem | wife's car sold + all 3 loans maxed + 35% roll | Buried | Buried |

## The three findings

**1. The best writing is the hardest to reach.** The ring-pawn arc, the game's
moral spine, requires the player to have already sold the wife's car AND have
the bank loan, the loan shark, and the tool-truck all outstanding at once, then
win a 35% roll. That is a financial self-destruct sequence. A careful player,
probably the majority, never sees it. This is exactly the Sheridan warning: if
your best scene is behind a door most people never open, the fix is the door,
not another scene.

**2. The well-behaved median player gets the thinnest story.** Play responsibly
and you land on `cleanHands`, which was dramatized with a single porch-light
line at the very end. The two extremes were inverted: reckless players unlocked
the richest arc, disciplined players got the sparsest one. The median
experience was weaker than the tails.

**3. Two of the best character beats were locked to a car and a calendar.** "He
Remembers Her" only fired on the '65 F-100 (the season-one starter), so it was
structurally impossible on any legacy build. The kid arc's actual payoff ("The
Right One") and Dale's mortality beat ("Thursday") both need a three-season
commitment plus deep loyalty, so a one-and-done player meets the kid and Dale
but never sees either arc land.

## What shipped against this audit (v0.38.0)

1. **Ring arc, second door.** Added `maybeOfferRingPawnStretch()`: the fork now
   also appears late in a season when the player is genuinely cornered chasing
   the big show (broke, a loan working, truck ready) WITHOUT having already
   sold the wife's car. Mutually exclusive with the reckless path by the
   `wifeCarSold` gate, so no double-offer. An ordinarily desperate player can
   now reach the moral choice.

2. **"He Remembers Her," un-caged.** Dale now remembers whatever project car
   you bring him, tracked per car id (`daleTruckToldCars`), with the F-100
   keeping its specific '89 lines and other builds getting a general version.
   Frees the beat from the season-one starter and makes Dale the keeper of the
   town's memory across builds, as intended.

3. **Virtue path, dramatized.** Added `maybeVirtueBeat()`: once a season, when
   the strain is real (thin on cash or deep into a build), a `cleanHands`
   player gets a quiet scene where she names the sacrifice out loud. The mirror
   of the ring aftermath: same marriage, quieter cost. Also nudges
   `wifePepTalks`, so her presence echoes back through the world-talks-back
   radio. The median player's story now has weight before the finale.

## Still open (deliberately not shipped yet)

- **Dale "Thursday" and the kid's "Right One"** remain multi-season / deep-
  loyalty gated. That is arguably correct (payoffs should cost something), but
  worth revisiting if legacy-run completion turns out to be rare.
- **The generational handoff** (the kid pulls the tarp off their own car, you
  stand at the fence like Ray) is still the one true finale left to write. It
  should come last, once we know the road to it is well-traveled.
