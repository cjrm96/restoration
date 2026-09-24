# Review 006 — Texting her back

- **Date:** 2026-09-24
- **Proposed by:** The user. "~100 optional messages to send the wife, she then
  replies something that digs further into the story of the wife," in the
  marketplace's choose-a-reply style. Boarded before implementation at their
  request.
- **Status:** Approved with Changes (6 Approve, 14 Approve with Changes, 0 Reject)
- **Touches:** `renderWifeThread()`, `pushWifeMessage()`, `maybeWifeWeeklyLine()`,
  `maybeWifeShowDM()`, the victory ceremony's cost stage, `.imsg-*` styles. New:
  `WIFE_REPLIES`, `wifeReplyOptions()`, `sendWifeReply()`,
  `state.wifeRepliesSent`, and a topic key `k` on every thread entry.
  **No `SAVE_VERSION` change**: old thread entries carry no `k` and fall through
  to the default pool, which is the behaviour we want anyway.
- **Shipped in:** 0.89.0

## Proposal Summary

Give the player roughly 100 optional messages they can send the wife from her
phone thread, in the marketplace's choose-a-reply style. Each lands a joke or a
jab, and she replies with something that opens her up further. Comedy from the
player's side, more of her story out of it.

## What the board was told first

Three facts from the code, because they decided the review:

- The thread is **deliberately one-way**. `.imsg-bubble` had no sent variant.
  The footer read **"You never text back. You go downstairs."** The empty state
  read "She is downstairs. You could just go and talk to her, but here we are."
  A code comment defended it: her side is kept "so a player who is here for the
  trucks still watches a marriage happen in the corner of the screen."
- She had **28 pooled lines** total across five weekly moods plus win/loss
  variants, and 14 one-off beats. That was the entire character.
- `WIFE_THREAD_MAX = 40`, and the thread splices off the oldest on overflow.

## Round One

- **Sam Houser:** A hundred jokes into the one part of this game that isn't a joke.
- **Dan Houser:** I want it. He never speaks in this marriage.
- **Sheridan:** The footer *is* the character. You are proposing to delete the
  best line in the game and replace it with a hundred worse ones.
- **Garbut:** Men like this do text back. Badly. Three words, eight hours late.
- **Player Rep:** People will love talking to her. What it costs is the question.
- **Mike:** Finally. I have been reading her texts like a man watching his own
  voicemail.
- **Benzies:** 200 pieces of writing for a character who has 28. That is 700% more wife.
- **Carmack:** The thread caps at forty. Fill it with chat and her story falls off the top.
- **Gilligan:** Does any of it stick, or is it a joke dispenser with her face on it?
- **Sid Meier:** Free and repeatable means no decision. It is a slot machine.
- **Miyamoto:** A hundred. Make it thirty and they will be better.
- **Nolan:** The silence is information. You are filling it with noise and calling it depth.
- **Disney:** Or it is the payoff the thread has been setting up. Depends whether he can fail at it.
- **Newell:** Screenshot potential is enormous. That is a real argument.
- **Miyazaki:** She talks into a quiet room. Do not fill the room.
- **Obama:** The real question is whether texting back is a feature or a characterization.
- **Wynn:** That thread is the classiest screen in the game. One bad joke and it is a chat app.
- **Systems Director:** If her reply is the same whether you sold her car or not, it is wallpaper.
- **Technical Director:** There is no sent-bubble style. That is an afternoon. The rest is not.

## Open Boardroom Discussion

**The footer fight, and the line that ended it.** Sheridan opened unreasonably
and on purpose: "You never text back. You go downstairs" tells you what he is
like, forgives him, and says the marriage survives on something other than
words. All three die the moment there is a send button.

Dan Houser answered with the change that reshaped the whole feature: only if
texting back is free. Make the reply available while her message is fresh, so
you come in from the garage and either answer now or go downstairs like you
always do. **The footer is not deleted. It is earned by the player who does not
text.** Miyazaki withdrew on the spot: "That is the version I can live with."

Nolan pushed it further. A reply to a specific thing she said at a specific
moment carries context; a menu of a hundred jokes you can open any time carries
none. Sam Houser: so it is not a hundred messages, it is a hundred reply
options. Mike objected that he wanted to send something stupid and be roasted,
then conceded the better version himself: "Answering her is funnier than talking
to nobody."

**The cost.** Benzies priced 200 pieces of writing as unfundable. Dan Houser
re-scoped it: if replies hang off her existing lines, you write two or three per
line she can send, and her comeback is the same shape as the pool she is already
in. "That is a content pass, not a new game."

**The reframe that carried the room.** Sid Meier asked what decision the player
is making. The Gameplay Director said tone, if she remembers it. Gilligan said
she had better, restating his objection from review 005: if four seasons of
texting never reaches the ending, none of it happened.

Obama then named what the argument was actually about: **every other
relationship in this game is something the player does. Hers is the only one
that happens to him. Texting back is the first verb he has ever had in it.** Sam
Houser asked for it in writing.

**How he writes.** Wynn required that it not look like a chat app: her bubbles
read as somebody else's world, his must be small, gold, and fewer. Garbut added
the register: he is a man who types "ok" and means "I love you and I'm ashamed."
The comedy is not that he is witty, it is that he is trying. That is the note
that finally won Sheridan: "Not one-liners. A man who is bad at this, visibly."
Disney turned it into the structure: three registers, the deflection, the honest
one, and the one where he is an idiot. Dan Houser closed it: she reads all three
correctly, because she has never once been fooled.

**Rate and cap.** Newell asked what stops farming. The Technical Director
offered one reply per message she sends. Carmack raised the forty-cap: two
bubbles per exchange means her early story falls off twice as fast. Resolved by
not counting his messages against it at all. "Her thread stays her thread."

Miyamoto restated his one note: seventy good ones beat a hundred with twenty
duds, and the duds are what people screenshot. Benzies ruled: write to the
number the user asked for, cut what does not earn it, do not pad to hit it.

## Red Team Review

**The footer is now a lie for most players.** "You never text back" renders
under a thread where he demonstrably texted back four times. Nobody in that
self-congratulatory discussion said what it reads when he has replied.

**"One per message she sends" is not a rate limit, it is a backlog.** She sends
roughly one line every two weeks and the thread holds forty. Ignore the phone
for a season and you open it to twelve unanswered messages and fire twelve
replies in ten seconds. Your limiter is a queue.

**Three registers is the tell that this is 200+ strings, not 70.** Dan Houser
said "two or three options per line" and the room heard "70 to 80." Twenty-eight
pooled lines times three, each needing its own reply, plus ledger variants, in a
file already at 1.86MB as a single HTML document.

**The 14 one-off beats were never discussed.** Her best writing is not in the
pools, it is the pep talks, the victory DM, the restraint arc. Reply options
there and the count explodes; none and the feature is absent from exactly the
moments players care most about.

**Comedy will eat the ache.** ~100 options means most are filler, and filler in a
comedy register is quips. The pawn-shop beat and the porch-light beat now sit in
a thread where the player has been doing bits for four seasons.

**Nobody specified the strained path.** If she is cold and he sends the idiot
option, does she engage? A wife who always has a funny comeback is not a wife
running out of patience. That is the hardest writing in the feature and it got
one sentence.

## Final Vote

| Executive | Vote | Reason |
| --- | --- | --- |
| Sam Houser | Approve with Changes | The first verb he has ever had in that marriage. Not a joke menu. |
| Leslie Benzies | Approve with Changes | Fundable as a reply pass on existing lines. Not as 200 new strings. |
| Aaron Garbut | Approve with Changes | He texts badly. Write him badly on purpose or do not ship it. |
| Dan Houser | Approve | He finally speaks. Biggest narrative gain available. |
| Taylor Sheridan | Approve with Changes | Only because the footer survives for the man who goes downstairs. |
| Gameplay Director | Approve with Changes | A real decision only if she remembers. Otherwise a toy. |
| Systems Director | Approve with Changes | Must read the family and moral ledgers or it is wallpaper. |
| Technical Director | Approve with Changes | Sent bubbles are easy. Do not let his messages evict hers. |
| Player Representative | Approve | Attach it to her lines and it cannot go wrong. |
| Christopher Nolan | Approve with Changes | A reply carries context. A menu carries none. |
| Vince Gilligan | Approve with Changes | A counter reaches the finale or I am a no. My 005 objection again. |
| Shigeru Miyamoto | Approve with Changes | Seventy great ones beat a hundred with twenty duds. |
| Sid Meier | Approve with Changes | Tone is the decision. It only counts if it is recorded. |
| John Carmack | Approve with Changes | Do not count his messages against her cap. |
| Walt Disney | Approve | Three registers is the feature. Deflect, honest, idiot. |
| Gabe Newell | Approve | Most screenshotted thing you will ship this year. |
| Hayao Miyazaki | Approve with Changes | Withdrew when Dan said the footer is earned, not deleted. |
| Barack Obama | Approve with Changes | It is the input the marriage never had. Frame it that way. |
| Steve Wynn | Approve with Changes | His bubbles small, gold, fewer. It must not become a chat app. |
| The Fallbrook Local (Mike) | Approve | Answering her is funnier than talking to nobody. |

## Chair Summary

- **Strongest arguments:** Obama's reframe (this is an input, not a comedy
  feature) and Dan Houser's fix (replies hang off her lines; the footer is
  earned, not deleted). The second one turned two Rejects-in-waiting into
  Approves. Garbut's register note, that the joke is a man who is bad at this
  rather than a man who is funny, is what made the writing possible.

- **Biggest concerns:** the Red Team's backlog hole was a genuine design defect
  that the room had congratulated itself on solving. "One reply per message" is a
  queue, not a limit.

- **Unresolved disagreements:** Miyamoto never accepted the hundred as a number
  rather than a target, and was overruled on the grounds that the user asked for
  it. Sid Meier's broader note stands: this adds decisions that are tonal rather
  than mechanical, which is new ground for the game. The Red Team's "comedy will
  eat the ache" is not answered by anything in this build; it is a thing to watch
  in playtest, not a thing that was fixed.

- **What shipped, in 0.89.0:**
  1. **102 player options across 18 topics**, 306 written strings. Each option
     carries what he sends, her answer, and a separate answer for when the
     family ledger reads strained.
  2. **Reply system, not a compose box.** Options hang off the topic key now
     carried on every thread entry. Weekly lines are tagged by mood
     (`wife-week-broke`, `-flush`, `-grind`, `-proud`, `-warm`) rather than
     lumped as `wife-week`, because answering a broke week and a proud week are
     different acts. Unknown or legacy topics fall through to a default pool.
  3. **Three registers in order**: deflect, honest, idiot. Options capped at 34
     characters so he reads as a man who types four words and means a paragraph.
  4. **The footer survives**, plus two further states for a player who has
     replied, because printing "you never text back" at a man who texted forty
     times is the game not paying attention.
  5. **Backlog closed.** Only the newest message is answerable, and only within
     one week of her sending it. A conversation you can have a month late is not
     a conversation.
  6. **His half never counts against `WIFE_THREAD_MAX`.**
  7. **Gilligan's counter reaches the ending.** `state.wifeRepliesSent` branches
     the empty-garage screen at 1, 8 and 25.
  8. **Wynn's look:** his bubbles gold, right-aligned, 66% max width against her
     78%, visually subordinate.

- **Implementation guidance:** 15 checks in a Playwright harness, all passing.
  Every topic resolves to a pool of at least three; no option exceeds 34
  characters; no reply is identical to its strained variant; unknown topics fall
  back; the same message cannot be answered twice; a twelve-message stale
  backlog offers nothing; the strained path demonstrably uses the cool line; and
  the finale reads the counter at 0, 3, 10 and 40. Board gate and the full smoke
  suite green.

- **Follow-ups logged, not built:** the 14 one-off beats (pep talks, victory DM,
  restraint arc) resolve to the default pool rather than getting bespoke reply
  sets, which is the Red Team's "absent from the moments players care most about"
  in its surviving form. And nothing was done about comedy crowding the ache;
  that needs playtest, not a patch.
