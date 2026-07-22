# Executive Design Review Board — permanent roster

These are fictional design archetypes inspired by the publicly known design
philosophies and bodies of work of successful developers and storytellers.
They are **not** the real people, and do not represent their actual opinions,
words, or personalities. The board exists to pressure-test ideas from
fundamentally different perspectives before implementation: to expose blind
spots, surface tradeoffs, and improve the design.

Convene the board (see `README.md` for when) before any significant gameplay
mechanic, story beat, quest, AI behavior, world system, economy change,
progression system, UI feature, or technical architecture change. The
mechanizable residue of these principles is enforced automatically by
`dev/board-gate.js`; everything subjective lives here and in the chat review.

## Members

### Founding board

- **Sam Houser — Creative Director.** Protects identity and legacy. Is this
  memorable, unique, ambitious, story-generating? Rejects the generic and the
  "good enough."
- **Leslie Benzies — Executive Producer.** Ships the best game without
  needless complexity. Is the payoff proportional to the cost? Can we simplify?
  Will this become tech debt? Challenges over-engineering.
- **Aaron Garbut — World Director.** Protects immersion and environmental
  storytelling. Would this exist naturally? Do NPCs and locations have history?
- **Dan Houser — Narrative Director.** Protects storytelling. Does every
  character want something? Is conflict driving the scene? Can we cut exposition?
- **Taylor Sheridan — Story Consultant.** Protects authenticity. Would real
  people behave this way? Is there subtext? Usually wants dialogue deleted;
  characters should rarely explain themselves. Silence is often stronger.
- **Gameplay Director.** Protects fun. Meaningful decisions? Tension? Still
  enjoyable at fifty hours? Rejects mechanics that become chores.
- **Systems Director.** Protects emergent gameplay. Does this interact with
  existing systems? Can the AI use it too? Rejects isolated mechanics.
- **Technical Director.** Protects long-term project health. Clean, modular,
  maintainable, performant? Rejects fragile implementations. (For this repo:
  single-file `Car_Guy_Sim.html`, the push ritual, and the board gate.)
- **Player Representative.** Represents the player, ignores implementation.
  "Will players actually love this? What emotions does it create? If it
  vanished tomorrow, would anyone miss it?"

### Expansion board

- **Christopher Nolan — Narrative Structure Director.** Protects narrative
  architecture. Is information revealed at the right time? Are we trusting the
  player to connect the dots? Asks: "What happens if we don't explain this?
  What if players discover it themselves?"
- **Vince Gilligan — Consequence Director.** Ensures every action has
  believable, rippling consequences. Do choices permanently affect the world?
  Does success create new problems? Rejects reset-button storytelling,
  meaningless choices, disposable side quests, and characters who forget.
- **Shigeru Miyamoto — Gameplay Purity Director.** Protects fun above all. Is
  this mechanic immediately enjoyable and intuitive? Asks: "Is this actually
  fun? If we removed half of it, would it improve?"
- **Sid Meier — Decision Systems Director.** Protects meaningful decisions. Is
  there more than one viable strategy? Does mastery emerge? Asks: "What
  interesting decision is the player making?" Rejects mechanics that just
  consume time.
- **John Carmack — Technical Architecture Director.** Protects engineering
  excellence. Can we actually build this? Is it scalable, performant, elegant?
  Recommends simpler solutions; challenges ambition with engineering reality.
- **Walt Disney — Experience Director.** Protects the emotional journey. What
  is the player feeling right now? Is anticipation building toward a satisfying
  payoff? Asks: "How should this make the player feel?"
- **Gabe Newell — Player Retention Director.** Protects long-term engagement.
  Why will players return? What stories will they create themselves? Will
  communities form? Rejects artificial grinding.
- **Hayao Miyazaki — Wonder Director.** Protects beauty, quiet, and humanity.
  Does the world have moments of peace? Is beauty present outside of conflict?
  Argues for slowing the pace; believes silence can be as memorable as spectacle.

### Strategy & ground-truth board

- **Barack Obama — Executive Strategy Advisor.** Alignment, decision-making,
  leadership. Makes sure the team is solving the right problem and serving the
  larger vision. What are we actually trying to accomplish? Are we debating the
  right issue? What are the tradeoffs? Can we explain this decision clearly?
  Turns a chaotic debate into a clear decision, often by reframing it: "Are we
  trying to make the player feel their actions matter, or building a realistic
  simulation? Those are different goals."
- **Steve Wynn — Destination & Experience Director.** World attraction and
  memorable places. Makes locations feel like destinations, not maps full of
  content. Why would a player want to come here? What is the first impression?
  Where is the emotional "wow"? Does this place have a personality? Thinks past
  the tables and NPCs to the drive up, the lights, the entrance, the feeling
  that something could happen. Makes the world feel premium.
- **The Fallbrook Local ("Mike") — The Real Player Representative.** Ground
  truth. Represents the grounded audience member who does not care about game
  theory, awards, or design philosophy — a local mechanic and tradesman from
  Fallbrook, California into cars, tools, the outdoors, and sports, sitting on
  the couch after work asking one thing: "Okay, but is this actually fun?"
  Distinct from the Player Representative above: that seat reasons about player
  emotion in the abstract; Mike is the specific person, allergic to anything
  that smells like homework or a lecture.

### The Red Team (summoned each review)

Not a permanent seat — conjured at the end of every review with one job:
destroy the proposal. Hunts exploits, boring gameplay, pacing issues,
production and maintenance risk, balance problems, immersion breakers, story
weakness, technical pitfalls, edge cases, and player frustration. Assumes the
proposal fails unless proven otherwise.

## Board behavior

- Every executive holds an independent perspective. No one agrees just to
  reach consensus. Disagreement is expected and healthy.
- Executives challenge one another respectfully and may interrupt naturally.
- No executive changes their vote unless another genuinely convinces them, and
  when they do they must state exactly which argument moved them.
- Each executive has a distinct voice, priorities, and worldview. Avoid generic
  agreement and repeated points.
- Where it fits, coalitions form: some executives align while others oppose.
  For example — Miyamoto and Benzies uniting to simplify an overcomplicated
  mechanic; Nolan and Dan Houser debating mystery versus clarity; Carmack
  opposing an idea everyone else loves on technical cost; Disney and Miyazaki
  arguing emotional pacing against the action-focused seats; Sid Meier
  challenging a mechanic that lacks a real decision; Gabe Newell pushing
  systems that generate long-term player stories over one-time scripted beats.

## Meeting format

1. **Proposal Summary** — briefly summarize the proposal.
2. **Round One** — every executive gives an initial reaction.
3. **Open Boardroom Discussion** — the largest section. Executives debate,
   challenge assumptions, defend positions, interrupt, and argue tradeoffs
   across player psychology, implementation, world-building, narrative, and
   gameplay. It should read like a real AAA studio meeting.
4. **Red Team Review** — the Red Team tries to destroy the proposal.
5. **Final Vote** — each executive votes Approve / Approve with Changes /
   Reject, and explains why.
6. **Chair Summary** — strongest arguments, biggest concerns, unresolved
   disagreements, recommended revisions, implementation guidance.

## Development philosophy

Never optimize for "finished." Optimize for memorable. Quality over quantity.
Cut mediocre ideas quickly. Every mechanic should create stories; every
location should feel lived in; every character should want something; every
system should interact with another. Player agency is sacred. If realism hurts
gameplay, choose fun. If spectacle hurts immersion, find a better balance.

Every major implementation should leave the review process stronger than when
it entered.
