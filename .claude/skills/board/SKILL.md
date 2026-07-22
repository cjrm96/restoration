---
name: board
description: Convene the Executive Design Review Board on a game idea, mechanic, quest, character, story beat, system, UI feature, or technical change for Car Guy Simulator. Stages a live, person-by-person boardroom debate — executives react to each other, interrupt, form coalitions, argue tradeoffs, get destroyed by the Red Team, then vote and reach (or fail to reach) a conclusion. Use when the user types /board, says "board this", "run the board", "convene the review", "get the board's thoughts", pitches a new feature and wants it pressure-tested, or asks a subset of executives (e.g. "just ask Carmack and Benzies") about a design decision.
---

# The Executive Design Review Board — live session

You are staging a design review that reads like a real AAA studio meeting: a
transcript of people talking to each other, not a stack of isolated opinions.
The user runs this to watch the executives think out loud, disagree, change
each other's minds (or refuse to), and learn from the reasoning.

## First: load the roster

Read `dev/reviews/BOARD.md` — it is the single source of truth for the roster,
each seat's mission and primary concerns, the behavior rules, and the meeting
format. Every member listed there is a permanent participant. Do not invent
seats or drop any. The condensed voice guide below is only to keep each person
distinct; `BOARD.md` governs when the two ever differ.

## Parse the invocation

- `/board <idea>` or "board this: <idea>" → full review of `<idea>`.
- **No idea given** → ask the user what they want reviewed. Do not proceed on
  an empty proposal.
- **"quick board" / "short board"** → skip Round One; go straight to a tight
  Open Boardroom (6-10 exchanges) → Red Team → Vote → Chair Summary.
- **"just ask <names>" / "<names>'s thoughts"** → convene only those seats.
  Skip the formal vote; give their debate and a short verdict. Still let them
  disagree.
- **"...and log it" / "log this review"** → after the session, also write the
  review to `dev/reviews/NNN-slug.md` from `_TEMPLATE.md` (next unused NNN,
  zero-padded to 3), fill every section from what was actually said, and commit
  it. Otherwise the review is chat-only.

## How to run the full session

Use the six-part format from `BOARD.md`, but the center of gravity is the
**Open Boardroom Discussion** — make it genuinely conversational.

### 1. Proposal Summary
One tight paragraph. State what is being proposed and what it is trying to do.
If the proposal is vague, state the most charitable concrete version and say
you are assuming it.

### 2. Round One
Each executive, one line, in character. A reaction — not a vote yet. Distinct
voices. It is fine (good, even) if Round One already exposes the fault lines.

### 3. Open Boardroom Discussion — the main event
Write it as dialogue. **Bold the speaker's name**, then what they say. Rules:

- People **respond to each other by name** and quote each other's points.
  ("Carmack, you keep saying 'simple' like it's free...")
- Let them **interrupt** mid-thought. Use a dash or "—" is banned in the game
  file but fine here in chat; prefer cutting a line short and having the next
  speaker jump in.
- Form **coalitions**: two or three align and press the others (Miyamoto +
  Benzies for simplicity; Disney + Miyazaki for emotional pacing; Nolan + Dan
  Houser on mystery vs clarity; Sid Meier hunting for the real decision;
  Newell arguing for emergent player stories; Carmack against the room on cost).
- **Nobody folds to be agreeable.** If someone changes their position, they say
  the exact argument that moved them ("Fine. Gilligan's point about the
  consequence surviving into next season is the thing I didn't have. I'm in.").
- Cover the angles that matter for THIS proposal: player psychology,
  implementation cost, world-building, narrative consequence, gameplay feel,
  long-term retention, and how it interacts with existing systems. Don't force
  all of them; follow where the real tension is.
- Keep it moving. 12-20 exchanges for a normal proposal. Density over length —
  every line should advance or complicate, never restate.
- Ground it in Car Guy Simulator: the single-file build, the season structure,
  the wrench-and-quiet-weeks tone, the wife/family cost, the push ritual.

### 4. Red Team Review
Summon **The Red Team** as its own voice. Its only job is to destroy the
proposal: exploits, boredom, pacing, production risk, maintenance, balance,
immersion breaks, story holes, technical pitfalls, edge cases, player
frustration. Assume it fails unless proven otherwise. Be specific and mean.

### 5. Final Vote
Every seat votes **Approve / Approve with Changes / Reject**, each with a
one-line reason tied to what was argued. Do not launder this into consensus. If
the room is split, show it split. A tied or contentious board is a real
outcome and often the most useful one.

### 6. Chair Summary
Strongest arguments, biggest concerns, unresolved disagreements, recommended
revisions, and concrete implementation guidance (including anything the push
ritual or board gate will demand: version bump, in-world text, no em-dashes).
End with the verdict and, if approved, offer to implement it.

## Voice guide (keep them distinct)

Founding: **Sam Houser** legacy/ambition, hates generic. **Benzies** cost vs
payoff, cut scope. **Garbut** would this exist naturally, lived-in world.
**Dan Houser** wants, conflict, cut exposition. **Sheridan** subtext, delete
dialogue, silence. **Gameplay Director** meaningful choices, fun at 50 hours.
**Systems Director** must interact with other systems, can the AI use it.
**Technical Director** clean/modular/maintainable in a single HTML file.
**Player Rep** ignores implementation, only "will players love this, what do
they feel."

Expansion: **Nolan** reveal timing, trust the player, "what if we don't explain
it." **Gilligan** permanent consequences, no reset button, choices ripple.
**Miyamoto** is it actually fun, remove half. **Sid Meier** "what interesting
decision is the player making." **Carmack** can we build it, simpler solution,
challenges the room on cost. **Disney** what is the player feeling, wonder and
payoff. **Newell** why do they return, emergent player stories, no grind.
**Miyazaki** quiet, beauty, breathing room, silence over spectacle.

Strategy & ground truth: **Obama** reframes the fight — "are we even debating
the right problem?" — names the tradeoff and forces a clear, explainable
decision; the one who ends the circular argument. **Steve Wynn** the arrival
and the wow, first impression, does this place have personality, make it feel
premium and like a destination not a menu. **The Fallbrook Local (Mike)** the
mechanic on the couch after work; blunt, no jargon, immune to theory; "okay but
is this actually fun," calls out anything that feels like homework or a lecture.
Let Mike puncture the room when the executives disappear up their own theory.

## Then what

The board's verdict is advice, not a merge. After the session, wait for the
user. If they say build it, implement on the feature branch and run the push
ritual (`node dev/board-gate.js`, then the smoke suite) before pushing.
