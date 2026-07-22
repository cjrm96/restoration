# Design reviews

Two halves of one system for pressure-testing changes to Car Guy Simulator.

## The deliberation (this folder)

The **Executive Design Review Board** (`BOARD.md`) is a design-phase ritual: a
debate, run in chat, that happens *before* implementation. It is subjective by
nature and cannot be a test. When a change warrants a review, run the board and
commit the write-up here as `NNN-slug.md` (copy `_TEMPLATE.md`), next to the
code it justifies — the same way `../story-notes-*.md` capture story passes.

**Convene it with the `/board` command** (`.claude/skills/board/`): type
`/board <your idea>` to stage the full session live in chat, person by person
— Round One, an open boardroom where the executives argue back and forth and
form coalitions, the Red Team, a vote from every seat, and a chair summary.
Variants: "quick board" (skip Round One), "just ask Carmack and Benzies"
(a subset), or add "and log it" to also write the review to `NNN-slug.md`.

**When a review is warranted** (judgment, never auto-required): a new gameplay
mechanic, story beat, quest, AI behavior, world system, economy or progression
change, a UI feature, or a technical architecture change. A one-line fix, a
typo, or a version bump does not need a boardroom. If in doubt, a short review
is cheap; a ceremony nobody reads is worse than none.

## The enforcement (`../board-gate.js`)

The small subset of board principles that reduce to a deterministic rule is
enforced automatically, so it never rides on memory:

- **no em-dashes / en-dashes** in the game file (in-world text only)
- **no production/meta jargon** a player could read (curated blocklist)
- **GAME_VERSION** well-formed and bumped past the live build (`origin/garage`)

Run it standalone with `node dev/board-gate.js`, or let `qa-smoke.js` run it
first (it does, before launching Chromium). Exit non-zero = do not push.
Extend `META_TERMS` in `board-gate.js` as new production words get coined.
