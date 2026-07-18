# Gemini Cut-Scene Prompt Bible

Copy-paste prompts for generating the game's pixel-art cut scenes in Gemini.

> This mirrors the **"ART PROMPT BIBLE"** comment block inside
> `Car_Guy_Sim.html` (search that phrase — it sits right above the
> `CUTSCENE_ART` map). This markdown copy exists because the HTML file is huge
> and slow to open; keep the two in sync if you edit prompts.

---

## ▶ The style anchor — paste at the top of EVERY prompt

Prepend this before the scene text so the whole set looks like one world:

```
Match the pixel-art style of the reference images exactly: chunky
hand-placed pixels, warm dusk color palette (deep purple sky fading to
gold), strong rim lighting on subjects, cozy garage Americana, dithered
gradients, cinematic composition, eye-level camera. No text, no logos,
no watermarks, no UI elements in the image — art only.
```

**Rules that apply to every prompt**
- **No baked-in text.** The game draws its own titles/buttons over the art; AI text always comes out mangled.
- **Generate at 2× display size** (1920×1080 for 16:9). Pixel art downscales cleanly, never upscales.
- **Wide cut-scene slots:** keep the **lower-left** calm (the caption sits there).
- **Banner / show slots:** keep the **lower-center** calm (car + text cards sit there).
- **Order:** generate the scene closest to the inspo art **first**, then feed *that* image back as a reference for the rest.

---

## Chapter 1 — The Barn Find (game open)

### `title-screen` — Title / splash · 16:9 (upper third calm for logo)
```
A wide pixel-art scene inside a dim home garage at dusk, the roll-up door
open to a purple-and-gold sunset. A rusty 1960s American pickup truck in
faded patina blue sits in the middle of the garage, front wheel removed, on
a jack stand. A mechanic in silhouette kneels at the wheel with a wrench. A
single hanging droplight casts a warm cone of light over the truck. Pegboard
with tools, red rolling tool chest, stacked tires, a creeper on the floor.
Leave the upper third of the sky area calm and uncluttered for a title logo
overlay. 16:9 aspect ratio.
```

### `scene-barn-find` — Intro tutorial beat · 2:1
```
Pixel art, early morning light: a weathered barn with its doors just pulled
open, dust hanging in sunbeams, revealing the silhouette of a car under a
dusty tarp. A set of keys dangling from a hand in the foreground corner.
Hopeful, "found treasure" mood. Wide banner composition, subject
centered-low. 2:1 aspect ratio.
```

---

## Chapter 2 — The Grind (build / restoration arc)

Workspace tiers: one image per tier, shown in the upgrade popup. Generate in
order **4 → 5 → 3 → 2 → 1** (tier 4 is closest to the inspo art; use it as the
reference for the rest).

### `workspace-curb` — Tier 1, The Curb · 16:9
```
A pixel-art scene of working on a classic car at the curb in front of a
modest suburban house at night. The car sits on metal ramps at the roadside
under a single buzzing streetlamp that casts a cone of warm light. A cheap
plastic toolbox sits open on the sidewalk, a few tools scattered on an old
towel. A mechanic in silhouette crouches by the front wheel. Mailbox,
cracked driveway, dark house windows behind. Humble, scrappy, "starting from
nothing" mood.
```

### `workspace-carport` — Tier 2, The Carport · 16:9
```
A pixel-art scene of a lean aluminum carport attached to a small house at
dusk. A classic car parked under the sloped roof, hood open. A caged work
light hangs from a rafter on an orange extension cord, casting warm light
over the engine bay. A folding card table holds hand tools, a shop rag, and
a coffee thermos. A mechanic in silhouette leans over the fender. One step
up from the curb — sheltered but cramped.
```

### `workspace-storage` — Tier 3, The Storage Unit · 16:9
```
A pixel-art scene of a rented self-storage unit at night, its orange roll-up
door open, warm light spilling out onto the asphalt. Inside, a classic car
takes up most of the space, surrounded by metal shelving with parts boxes, a
clamp-on work lamp, and a small rolling tool cart. A mechanic in silhouette
works at the rear of the car. Other closed storage doors stretch away into
the dark. Secret hideout mood.
```

### `workspace-home-garage` — Tier 4, The Home Garage (reference look) · 16:9
```
A pixel-art scene inside a proper two-car home garage at dusk, roll-up door
open to a purple-and-gold sunset. A classic car centered on a clean concrete
floor with a hanging droplight above it. Full pegboard wall of organized
tools, a red rolling tool chest, an air compressor, tires stacked in the
corner, a creeper on the floor. A mechanic in silhouette kneels at a wheel.
Established, capable, cozy — this is the reference garage look.
```

### `workspace-dream-shop` — Tier 5, The Dream Shop · 16:9
```
A pixel-art scene of a dream hot-rod shop at night. A classic car raised on
a two-post lift over a glossy checkered floor, bathed in cool overhead shop
lights with a warm neon sign glow (abstract neon shapes, no readable text)
on the back wall. Stainless tool cabinets, a parts washer, an engine on a
stand, a shelf of gold trophies catching the light. A mechanic in silhouette
stands beneath the lifted car, wrench in hand. Triumphant "made it" mood,
richer lighting than a home garage.
```

### `scene-tool-truck` — The Snap-it truck delivers the 72" bank · 16:9 (lower-left calm)
> Fires on the top tool-storage upgrade (the "I made it" box). ✅ IN GAME.
```
A big boxy chrome-and-red dealer tool truck (in the spirit of a Snap-on truck,
no readable logos or text) parked at the curb of a suburban driveway at golden
hour, its roll-up side door open and its lift gate lowered. On the lift gate
sits a gleaming stainless-steel 72-inch rolling tool bank: deep drawers, chrome
handles, a hutch on top, catching the low sun. A uniformed delivery driver in
silhouette steadies it as it rolls down. In the foreground, the mechanic stands
hands-on-hips, seen from behind, just taking it in, the box he has worked years
toward. Behind him the open home garage glows warm, and his old milk crate and
dented hand-me-down box sit small beside the new bank. A nosy neighbor peeks
over the fence. Long shadows reaching toward camera, deep purple dusk sky above.
Proud, arrival, "I finally made it" energy. Keep the lower-left quarter calm for
a caption. 16:9.
```

### `scene-restoration-complete` — Restoration-complete reveal · 16:9
```
Pixel art: a freshly restored classic American car gleaming under a garage
droplight, mechanic standing back wiping hands with a rag, admiring it.
Sparkle glints on the chrome bumper and paint. The garage around it is tidy
now. Proud, quiet, satisfying mood — golden hour light through the open
door. 16:9.
```

---

## Chapter 3 — The Hustle (marketplace + social unlock)

### `scene-marketplace` — Marketplace unlock · 2:1
```
Pixel art: a dusty swap-meet / salvage yard at golden hour, rows of old car
parts on folding tables, a hand-painted "PARTS" sign, a haggling handshake
in the foreground, stacked rims and chrome bumpers catching the sunset. Busy
but warm. 2:1 banner.
```

### `scene-social` — Social unlock (Snapgram opens) · 2:1
```
Pixel art: over-the-shoulder view of hands holding a smartphone,
photographing a patina project truck in a driveway at dusk. The phone screen
shows the truck framed in the camera app (no readable text). Soft bokeh-style
pixel glow from a porch light. 2:1 banner.
```

### `scene-pick-a-pull` — First Pick-A-Part / yard-pull visit · 2:1
```
A pixel-art scene of a self-service junkyard at golden hour, rows of dead
cars on their rims stretching to the horizon in haze. In the foreground a
man in work gloves triumphantly wheels a rattling hand cart loaded with a
greasy engine part, wrenches sticking out of his back pocket, huge grin
implied in his posture. Around him: cars with hoods up like open mouths, a
doors-off shell, stacked windshields, weeds through wheel wells, a
hand-painted arrow sign (blank, no text). A crow on a roof watches.
Treasure-hunt mood — a graveyard that feels like a candy store, dusty
sunbeams.
```

### `scene-swap-meet` — First Pomona swap-meet trip · 2:1
```
A pixel-art scene of a massive fairground swap meet at sunrise, shot from
slightly above head height at the entrance gates so the scale reads: an
ocean of vendor rows, folding tables, open trunks and truck beds full of
chrome bumpers, steel wheels, carburetors, hubcap pyramids, and neon signs
propped against fenders, stretching into morning haze with mountains on the
horizon. In the foreground a man steps through the gate mid-stride with an
empty canvas parts bag and a folded wad of cash, sunrise flaring past him
down the center aisle. Early birds with flashlights already haggling in
silhouette. Pilgrimage energy — the promised land of rusty treasure.
```

---

## Chapter 4 — Show Season (compete arc)

Show backdrops are **2:1 banners**, lower-center calm. Generate **National
first** (closest to the inspo art), then step down. Bonus podium/results
variant: same prompt + `Confetti pixels drifting through the spotlight beams,
celebratory mood.`

### `show-cars-and-coffee` — Cars & Coffee morning · 2:1
```
A pixel-art scene of an early-morning cars-and-coffee meet in a grocery
store parking lot, sun just rising in gold and pink. A loose row of classic
American cars parked side by side, hoods up on a couple of them. Folding
chairs, coffee cups and donut boxes on an open tailgate, a small cluster of
people in silhouette chatting. Shopping cart corral and store facade in the
far background (blank signage). Casual, friendly, Saturday-morning mood —
the humble first rung of the show ladder.
```

### `show-local` — Local Car Show, Main Street · 2:1
> No dedicated Main-Street master was generated; this slot currently reuses a
> small-town look. If regenerating, adapt the Cars & Coffee prompt:
```
A classic-car show lining a small-town Main Street at golden hour, storefronts
and hanging flags, cars angle-parked along the curb, families walking the
sidewalk in silhouette, a blank banner strung across the street. 2:1 banner,
lower-center calm.
```

### `show-regional` — Regional, The Fairground Show · 2:1
```
A pixel-art scene of a regional car show at a county fairground at dusk.
Classic cars parked on grass in judged rows, each with a folding number
stand beside it (blank cards, no readable text). Strings of warm cafe lights
zigzag overhead. A small wooden stage with a blank banner, a judge
silhouette with a clipboard leaning over a hood, food stand glow in the
background, ferris wheel silhouette on the horizon against the sunset.
Festive but competitive — a real event with stakes.
```

### `show-national` — National, The Championship Hall · 2:1
```
A pixel-art scene of a national indoor car show at night inside a huge
convention hall. A mirror-polished classic car on a low rotating platform
under three white spotlight beams, velvet ropes around it. A dense crowd of
silhouettes beyond the ropes, camera flashes as single bright pixels, giant
dark hall ceiling with truss lighting. A table of gold trophies gleaming at
the edge of the light. Grand, theatrical, big-league mood — the top of the
mountain.
```

### `scene-dig-race` — Buck's dig race at the school stoplight · 2:1
```
Pixel art: two classic American cars side by side at a stoplight on an empty
suburban street on a Sunday evening, a school building and flagpole in the
background. Heat shimmer from exhaust, brake lights glowing, the drivers
eyeing each other. Tense, playful, cinematic dusk light. 2:1 banner.
```

---

## Chapter 5 — Legacy (endgame)

### `scene-victory` — National Champion finale · 16:9 (top quarter calm)
```
Pixel art hero shot: a flawless restored classic car on a podium under three
golden spotlights, confetti pixels drifting down, a huge trophy beside it,
silhouetted crowd applauding in the dark around the pool of light.
Triumphant, warm gold against deep purple darkness. Leave the top quarter
calm for overlay text. 16:9.
```

### `scene-legacy-wall` — Legacy Wall / new-run start · 16:9
```
Pixel art: a garage wall covered in framed photos of restored classic cars,
trophies and plaques on a shelf below, a worn leather chair, warm lamp light.
One empty frame waiting to be filled. Nostalgic, "life's work" mood. 16:9.
```

### The Finale Trilogy — the "Ran When Parked" director's-cut ceremony

These three land back-to-back at the very end of the victory sequence — all
three are ✅ IN GAME. Shoot `scene-restored-barn` **first** if regenerating —
it's a deliberate callback to `scene-barn-find`, so generate that intro image,
feed it back as the reference, and match its framing exactly. Each stage falls
back to existing art (`scene-barn-find`, `scene-season-end`,
`scene-season-start`) if its key ever goes missing.

#### `scene-restored-barn` — the tarp comes off, bookend to the barn find · 2:1 (lower third calm)
```
Pixel art, EXACT same composition and camera as scene-barn-find: the same
weathered barn, doors pulled open, dust hanging in the sunbeams, viewed from
the same low angle with the subject centered-low. But the story has turned:
where the dusty tarp once hid a silhouette, a flawless, fully restored classic
American car now stands finished and gleaming in the doorway, chrome and fresh
paint catching the light, the crumpled tarp pooled on the ground beside a front
tire. The cold grey dawn of the original has warmed into a triumphant golden
hour — long amber shafts pouring through the barn, dust motes glowing gold. The
same hand from the intro rests on the fender instead of dangling keys.
Full-circle, "we finished it" catharsis. Wide banner composition, subject
centered-low, keep the lower third calm for a caption. 2:1 aspect ratio.
```

#### `scene-empty-garage` — the cost, the quiet after the trophy · 16:9 (upper third calm)
```
Pixel art, still and melancholy: the player's own home garage late at night,
AFTER. The car is gone — an empty rectangle of clean concrete where it lived, a
faint oil ghost on the floor. The workbench is wiped down and bare, tools hung
and quiet, a single gold trophy alone on the shelf catching a low amber
droplight. The roll-up door stands open to a dark, empty driveway and a deep
blue-black night beyond. No people anywhere in frame — just the space someone
left. A folded shop rag, a cold coffee mug, the droplight swaying almost
imperceptibly. Warm pooled amber light against cold shadow, long and lonely.
Bittersweet, "what did it cost, was it worth it" quiet. Eye-level, composed and
symmetrical. Keep the upper third calm for a caption. 16:9.
```

#### `scene-next-tarp` — the cycle begins again, the hook out · 16:9 (center-low calm)
```
Pixel art at first light: the same driveway the next dawn, cold and clear, the
sky bleeding from indigo into rose and gold at the horizon. Backed into the
driveway sits a fresh silhouette under a NEW tarp — the unmistakable hump of
another project car waiting, its shape rough and mysterious under the cover, a
trailer just visible with its ramps still down behind it. Dew on the grass, one
porch light still on, the garage door closed. The mechanic stands small in the
foreground seen from behind, a fresh coffee in hand, just looking at the covered
shape — the itch already back. Hopeful, inevitable, "here we go again" energy,
sunrise palette echoing the barn-find dawn. Keep the center-low calm for a
caption. 16:9.
```

---

## The wife's car (the game's most-talked-about beat) — 2:1, lower-left calm

### `scene-wife-car-sale` — Selling the wife's car (the crime itself) · 2:1
```
A pixel-art scene loaded with tension and dark comedy: a tidy suburban
driveway at dusk. In the foreground a man shakes hands with a buyer next to
a sensible, spotless family sedan — a FOR SALE sign still tucked under the
wiper (blank sign, no readable text), cash changing hands low between them
like a drug deal. Behind them, framed dead-center in the warm kitchen window
of the house, the wife's silhouette stands perfectly still with her arms
crossed, backlit, watching. A kid's bicycle lies on the lawn. The husband's
rusty project truck lurks smugly at the edge of frame under a tarp.
Heist-movie energy, guilty golden-hour light, long shadows pointing at the
house.
```

### `scene-wife-car-keyed` — The morning after (bad outcome) · 2:1
```
Same driveway the next morning, cold blue-grey dawn light. The man stands
frozen with a coffee mug, seen from behind, staring at his beloved classic
project car — a long, deep, unmistakable key scratch running the entire
length of the freshly painted side, catching the light. The kitchen window
behind him is empty now, curtains drawn. A single lawn sprinkler runs
obliviously. Crime-scene stillness, deadpan comedy.
```

---

## Season bookends — 16:9, lower-left calm

### `scene-season-end` — "That's a wrap on the season." · 16:9
```
A pixel-art home garage on the first cold night of the year. The finished
project car sits under a fitted cover, trophies and ribbons from the season
lined up on a shelf above the workbench catching the warm droplight. Through
the open door, a deep blue dusk with the season's first snowflakes drifting
down and bare trees. The mechanic stands with a coffee, looking at the
covered car — reflective, satisfied, end-of-year quiet. Warm interior light
against cold blue outside. Keep the lower-left calm.
```

### `scene-season-start` — "The air's warming up." · 16:9
```
A pixel-art suburban driveway on the first warm spring morning. The garage
door is rolling up, sunlight and green budding trees outside, the last patch
of dirty snow melting at the curb. The mechanic pulls a car cover off a
project in one motion, dust and light catching in the air. Birds on the
power line, a robin on the lawn, sprinklers just starting. Hopeful,
fresh-start, engines-firing-back-up energy. Bright golden morning light.
Keep the lower-left calm.
```

---

## Nightlife — 16:9, lower-left calm

### `scene-friday-night-lot` — "Everybody's in the lot." · 16:9
> kicker "Friday night" · *"Hoods popped in the corner of the grocery store lot,
> no real plan. Cold drinks, warm light, the crew gearing up before the night
> gets going."* — Distinct from Cars & Coffee: this is **night**, not sunrise.
```
A pixel-art scene of a Friday-night car meet tucked in the corner of a
grocery store parking lot after dark. A loose cluster of classic American
cars backed in together, a couple with their hoods popped, one with the
trunk up. The scene is lit by the cool blue-white pool of a tall parking-lot
light overhead, mixed with the warm amber glow of the store front in the
background. Small groups of people in silhouette lean on fenders, cold drinks
and cans in hand, one sitting on a tailgate. Deep purple night sky above with
a few stars, distant town lights low on the horizon. Relaxed, low-key,
"the crew gearing up before the night gets going" energy — anticipation, not
action yet. Keep the lower-left calm for a caption.
```

---

## Chapter 6 — Drama & payoff beats (expanded, more-directive prompts)

Longer, heavily-directed prompts — use these when the generator drifts, and
feed one of your best existing cut-scene images as a style reference alongside
the text. Prefer this **expanded anchor** over the short one for these six:

```
Pixel art in the exact style of the reference images: chunky, deliberately
hand-placed pixels with visible dithering in every gradient, a limited but warm
palette (deep purple and indigo shadows fading up into amber and gold
highlights), strong colored rim lighting that separates every subject from its
background, cozy nostalgic American car-culture mood, clean cinematic
composition shot at eye level like a film still. Crisp readable silhouettes,
soft glowing light sources, gentle atmospheric haze. This is a single
illustrated scene, NOT a collage or grid. No text, no letters, no numbers, no
logos, no watermarks, no UI elements, no captions anywhere in the image. 16:9
widescreen aspect ratio.
```

### `scene-maiden-voyage` — "She lives!" first night drive · ✅ IN GAME
> Fires the first time a build crosses roadworthy.
```
A cinematic three-quarter rear view of a freshly restored classic 1960s American
muscle car cruising down the middle of a quiet small-town main street late at
night, the camera low and slightly behind so its glossy rear haunches, chrome
bumper, and glowing red taillights fill the lower-center of the frame. Deep,
wet-looking asphalt mirrors everything in long vertical streaks of color. Twin
headlight beams throw two soft cones of warm light down the empty street ahead.
On both sides, two-story brick storefronts recede into the distance with warm
yellow window glow and abstract blurred neon signs in pink, cyan, and orange
(shapes only, no readable letters), light smearing across the fresh paint and
polished trim. The driver's bare forearm rests on the open door window. A faint
haze of exhaust and subtle horizontal motion streaks trail behind the rear tires.
Deep purple-to-indigo night sky fading to amber at the horizon, dithered stars,
one distant green traffic light. Triumphant, free, a little emotional — the first
real drive after hundreds of hours. Keep the lower-left quarter calm.
```

### `scene-rival-showdown` — trash-talk staredown at a show · 🔧 WIRED, art pending
> Pull-up drama before judging; pair with a side-bet popup. Theme the rival car
> to Buck's ’67 Stallion.
```
A tense, cinematic wide shot of a face-off between two rival classic American
cars at an outdoor evening car show, framed symmetrically with one car angled in
from the left and one from the right so their front ends nearly touch in the
center. Left: the player's clean, honest muscle car in a deep confident color.
Right: the rival's flashy over-the-top show car with candy paint, chrome
everywhere, and a hood scoop. Standing in the gap between the front bumpers, two
men in a staredown at eye level: a lean grease-stained mechanic in a worn t-shirt
and ball cap, calm; opposite him a cocky loudmouth in mirrored aviators, a loud
unbuttoned patterned shirt, gold watch, arms crossed, smug smirk. Behind them a
loose ring of warm backlit spectator silhouettes with phones raised, a gleaming
gold trophy table under a canopy, café lights zigzagging overhead, other cars in
soft focus. Golden-hour sun rakes from the left, strong orange rim light on both
cars, long shadows toward camera. Warm gold vs cooling purple shadows. The calm
before the trophy ceremony. Keep the lower-left quarter calm.
```

### `scene-breakdown` — mechanical heartbreak at the worst time · 🔧 WIRED, art pending
> Keep it **recoverable** (repair decision tree), not a run-ender. The
> paint-bubble variant is the gentler lead option.
```
A somber, cinematic scene of roadside heartbreak at night in a heavy rainstorm. A
classic American muscle car sits pulled onto a wet gravel shoulder at a
three-quarter front angle, hood raised, thin wisps of white steam and grey smoke
curling out of the engine bay lit an ominous flashing red by the car's hazard
lights. Fat streaks of rain slash diagonally across the whole frame, catching the
light. Mid-ground: the mechanic stands in the downpour facing away, shoulders
slumped, one hand on his head, holding a flashlight whose pale beam cuts the rain
and smoke into the engine bay. The road behind stretches into darkness where
blurred white-and-red traffic lights streak by, doubled in the mirror-wet asphalt
and puddles. A lonely highway sign and telephone poles fade into misty dark.
Palette: cold rain-blues, blacks, and the single warm/red glow of the failing
engine and hazards. Every surface soaked and reflective. Gut-punch, quiet, "not
now, not tonight." Keep the lower-left quarter calm.
```
*Variant `scene-paint-ruined`:* a dim garage the night before a show, the
mechanic crouched beside the car running a flashlight along the fender where fresh
paint has bubbled and cracked, tools down, coffee going cold, quiet despair.

### `scene-first-car-sale` — letting go of your baby · ✅ IN GAME
> Fires on the first sale of a genuinely built car (overall 60+).
```
A bittersweet, cinematic driveway scene at warm golden hour. In the background,
the player's beautifully restored classic car — the one the whole game was spent
building — drives away down a tree-lined suburban street, seen from behind with
taillights and chrome catching the low sun, the new owner's arm waving once out
the window. Sharp foreground, close to camera: the mechanic seen from behind and
to the side counting a thick fanned stack of cash, a crumpled brown paper bag it
came in resting nearby, leaning against the hood of his NEXT project — a rough,
rusty, dust-covered classic half-covered by a loosely pulled-back tarp. Long warm
shadows across the concrete driveway toward camera. Golden sunlight floods from
low on the left, backlighting the departing car, glowing through roadside trees,
dust motes in the beams. A basketball hoop, garden hose, and mailbox ground it in
an ordinary neighborhood. Warm amber, gold, soft green, long purple shadows.
Proud but wistful. Keep the lower-left quarter calm.
```

### `scene-buddy-help` — the crew shows up · ✅ IN GAME
> Occasional ambient beat — pays a small cash tip + goodwill.
```
A warm, cozy, cinematic scene of two buddies wrenching together in a home garage
at dusk, shot at eye level from just inside the garage looking toward the open
roll-up door. Center: a classic American car up on a jack stand, hood open; both
men lean into the engine bay side by side under the warm cone of a single hanging
droplight, sleeves rolled up, one pointing at something while the other holds a
wrench. Between them on the floor, an open cooler with cans on ice; two more cold
cans sweat on the lowered tailgate of a pickup parked to one side. A shaggy dog
curled asleep in the corner near a red rolling tool chest. Back wall: a full
pegboard of neatly hung tools, a calendar, a faded license plate. Through the open
door, a rich purple-and-gold sunset over a quiet suburban street. Warm intimate
amber droplight plus a secondary floor work-lamp glow, cool blue dusk creeping in
for contrast. Tools, rags, coffee mugs scattered naturally. Easy, unhurried
camaraderie. Keep the lower-left quarter calm.
```

### `scene-going-viral` — you wake up famous, the morning after · ⬜ not generated
> **Painted bedroom morning.** NO emoji/icons/notification shapes coming out of the
> phone, just the screen glow and his reaction. The wife's face is **never shown**,
> keep her turned away / seen from behind, as in every wife scene. Fires the first
> time a post lands a big overnight follower spike.
```
Pixel art, warm early-morning light: a suburban bedroom, sun cutting through
half-open window blinds in dusty golden bars across the bed. The mechanic sits
bolted upright against the headboard, blanket pooled at his waist, gripping his
phone in both hands and staring at it, jaw slack, eyes wide, the cold blue-white
glow of the screen throwing hard light up onto his stunned, stubbled face while
the rest of the room stays warm amber. The phone is clearly going off, a faint
motion-blur buzz around it and a bright unreadable blaze of a screen, but NO
emoji, icons, hearts, or notification shapes floating out of it, just the glow and
his disbelief. Beside him his wife is still mostly asleep, seen only from behind,
her back and tousled hair on the pillow, one shoulder and an arm above the blanket
as she just begins to stir, her face turned away and unseen. A nightstand with an
alarm clock, a lamp, a coffee mug, a set of keys. A work jacket over the chair,
boots by the door. The whole room warm and quiet except the electric glow on his
face and the look of pure disbelief. "Something just happened" energy, the morning
your life changed. Keep the lower-left quarter calm. 16:9.
```

### `scene-tijuana-paint` — the risky south-of-the-border repaint run · ⬜ not generated
> The optional cheap-but-risky respray path (a classic SoCal car-guy gamble).
```
Pixel art, hot dusty golden-hour light: a bustling little body shop just across
the border in a Mexican town, hand-painted signs in warm reds and yellows (no
readable text), a corrugated-metal paint booth with a car half-taped and primer
grey inside, overspray haze catching the sun. In the foreground the mechanic
stands beside his classic American car handing a set of keys to a friendly,
confident shop owner in coveralls with a respirator pushed up on his forehead, a
"trust me, amigo" grin. The mechanic's posture is torn, half hopeful, half "what
am I doing." Around them: stray dogs napping in the shade, a rack of spray guns,
taped-off chrome bumpers leaning on a wall, a hand-lettered price board, string
pennants overhead, distant hills and a busy street beyond. Warm, dusty, a little
sketchy and a lot charming, a real risk-reward car-guy adventure. Golden light,
long shadows. Keep the lower-left quarter calm. 16:9.
```

### `scene-loan-shark` — the deal itself, noir and menacing · ⬜ not generated
> Paired with `scene-loan-shark-paid` below for the payoff. Same room, opposite
> mood.
```
Pixel art, tense low-key night lighting: a dim back-room meeting lit by a single
bare bulb over a battered table. Across the table sits the loan shark, a heavyset
man in a loud unbuttoned shirt and gold chains, sleeves rolled, a thick roll of
cash and a fanned stack of hundreds on the scarred wood between them, a cigar
smoldering in an ashtray, a pinky ring catching the light. His face is half in
shadow with a knowing, dangerous half-smile. In the foreground, seen from behind
and to the side, the mechanic reaches for the cash, shoulders tight, clearly
making a deal he may regret. Behind them through a doorway, his project car sits
in shadow, the collateral. A muscle guy leans silhouetted against the wall, arms
crossed. Deep greens and browns, one warm pool of bulb light, heavy noir shadows,
cigar smoke curling. Desperate, "this is a bad idea and you're doing it anyway"
energy. Keep the lower-left quarter calm. 16:9.
```

### `scene-loan-shark-paid` — the debt is cleared, you get the title back · ⬜ not generated
> The payoff bookend to `scene-loan-shark`. Same room, noir gloom burned off.
```
Pixel art, bright and relieved daylight version of the loan-shark back room, now
lit open and warm through a doorway instead of shadowed. The same heavyset loan
shark in the loud shirt and gold chains sits back from the battered table, cigar
stubbed out in the ashtray, no cash left on the wood, sliding a folded pink car
title (the pink slip) back across the table with two fingers and a grudging
half-nod of respect. In the foreground, seen from behind and to the side, the
mechanic reaches out and takes the title, shoulders finally dropping, the weight
visibly off him, one hand loose at his side. The muscle guy by the wall is
relaxed now, arms uncrossed. Through the open doorway behind them, flooded in
clean golden sunlight instead of shadow, his project car sits waiting, his again,
free and clear. Warm honest light pouring in, the noir gloom burned off, dust
motes drifting in the sun. Exhale, relief, hard-won freedom, "I own it again"
energy. Keep the lower-left quarter calm. 16:9.
```

---

## Non-game slots (store pages / dev logs)

- **Steam capsules** (616×353 main, 231×87 small, 460×215 header): reuse the
  `title-screen` prompt + `extreme close crop on the truck and mechanic, high
  contrast, readable as a tiny thumbnail.`
- **itch.io banner + dev-log headers:** the Chapter 2 workspace series doubles
  nicely as dev-log art.

---

## Wiring a new image in (the code side)

1. Save the master PNG as `art/<key>.png` (key = its `CUTSCENE_ART` id).
2. Convert to 1920px-wide WebP q92 — PIL: `Image.save(out, "WEBP", quality=92, method=6)`.
3. Base64-embed it into `CUTSCENE_ART` in `Car_Guy_Sim.html` under `"<key>"`.
4. Add a row to `art/README.md`.

`playCutscene({ art: "<key>", ... })` picks it up automatically, and any beat
referencing a missing key falls back gracefully.
