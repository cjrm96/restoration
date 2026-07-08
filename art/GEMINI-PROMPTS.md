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
