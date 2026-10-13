> # ⛔ LEGACY — SUPERSEDED, AND AUTHORITATIVE FOR NOTHING
>
> **This brief is built on the island model, which no longer exists.** The owner ruled on
> 2026-07-29 that *"there is no such thing as multiple islands now — it's all one island and it
> changes based on the era."* The archipelago was replaced by **one city advancing through ten
> eras** (`2026-07-27-era-progression-design.md`, D-ERA1, merged as #177), and the same ruling
> retired `Island_Lesson_Themes_Design_Spec.md`, of which this document is the one worked
> per-island example.
>
> **Do not model from this file, and do not theme from it.** Exponents & Radicals is the
> **Neolithic Era**, and every building identity below is out of period by roughly five thousand
> years: a Railhouse, a Telegraph Office, a Toll Gate, a Kiln Yard fired to a temperature the era
> cannot reach. **Its successor is `eras/era-02-neolithic/`** — style guide and civic buildings,
> which carry the era's materials, its advisor, its subtitle row and its lesson framings.
>
> **What survives, and it is the reason this is retained rather than deleted: the IDENTITY
> layer.** D-ERA20 defines an identity as era-agnostic — a building's type, its footprint, what
> it does for the city, and its **through-line** — and all of that transfers. The Kiln Yard's
> real identity is *"a yard where raw material is transformed in batches, and a brick is the unit
> square"*, which in the Neolithic is a firing pit or a threshing floor: same through-line, same
> read on the mathematics, completely different architecture. **Era two's guide records this as
> the answer to O-11**: the through-lines survive, the buildings do not. Read this file for what
> each building is *for*; never for what it looks like.
>
> **This also moots a defect rather than fixing it.** §0 guardrail 2 and §7 carry 2026-07-28
> corrections about a **gold gild on mastery** — the body treatment was retired and never shipped,
> and mastery renders as stars above the building. Those corrections are accurate and their four
> cited files still say so at this tip. They are now moot along with the rest of the document,
> and the live statement of the rule is `City_Art_Bible.md`'s reservation of `#FFB703` plus
> `masteryVisuals.ts`. Nothing here needs correcting again because nothing here is authoritative.
>
> **Two things it is still good for.** It is the record of a full worked building-identity
> exercise, including three rendered alternatives per node and the reasoning that chose between
> them, which is a method worth reusing. And its **plain-language finding** is load-bearing and
> outlived its own theme: forced theming made D2 unreadable, so the shipped packs lead with the
> mathematics in everyday nouns. Era two's guide carries that forward as the reason the re-theme
> costs no content rework.

# D2 / Island 2 — "Boomtown Square" — Island Design & Modelling Brief (PROPOSED) — **LEGACY, see the banner above**

**Status:** PROPOSED / draft for review. This is a **modelling brief** for the D2
island's game/city art — an asset spec the modeller can build straight from.
It is **split by audience** so each reader finds what they need:

- **Part I — the designer brief (§1–§3)** is **pure visual description.** Someone
  who has never seen this project or its other islands should be able to model
  every building and the town around it from Part I alone — no node ids, no tile
  counts, no filenames, no math.
- **Part II — implementation (§4–§10)** carries everything the engine and the
  pipeline need: the node-to-building map, footprints, filenames, the scale/fit
  rules, the construction stages, and the terrain palette.
- **Part III — design rationale (§11–§12)** records *why* the theme works and how
  each skill reads in its building. It is design reasoning, kept out of the
  modeller's way.

The **theme is decided** (a frontier **boomtown that keeps growing**, on dusty
red-clay flats); this doc turns that theme into concrete, buildable assets.

**Owner:** Evan (game/city lane — `engines/game`, `apps/web/src/city`). This doc
does **not** touch math, node identity, prerequisite order, lesson prose, or the
advisor persona (Anthony's lane — see §13).

**Date:** 2026-07-26. **Lane:** presentation/skin only (per
`Island_Lesson_Themes_Design_Spec.md` §1.4 — theming is a skin, never a
contract).

> **⚠ Annotation — Gabe, 2026-07-27 (FINAL): D2's advisor persona is EVAN'S.**
> *(Annotated inline in Evan's doc; nothing here is restructured or removed. This
> replaces a 2026-07-26 annotation rather than stacking on it, so this brief
> carries one answer and not three.)* The advisor persona and voice belong to
> **Evan**, for every island, because he does all of the design
> (`docs/Content_Authoring_Split.md` §1.1). So wherever this doc says the advisor
> persona is "Anthony's lane" — the Owner note above, the hub's advisor-home note
> (§5), and §13's first bullet — read **Evan's**, which is to say: yours.
>
> **The Town Foreman is a PROPOSAL you inherit, not a decision you have to live
> with.** It was registered on 2026-07-26 under a since-reversed rule that gave the
> persona to the domain's lesson author. Keep it, rename it, or replace it: it
> **was never implemented**, so no lesson string, no widget and no item depends on
> the name (`rg "Town Foreman"` over `content/`, `apps/` and `packages/` returns
> nothing, and `AdvisorNpc.tsx` hard-codes no persona name). The full register is
> in `.cursor/skills/author/reference.md` §6 if it is worth keeping.
>
> **This doc's boundary is unaffected and stays exactly as written.** It is still
> skin-only; it still writes none of the advisor's voice; it still only says *where
> the advisor stands* (at the Land Office counter). What moved is who names the
> character, not what belongs in this brief.
>
> **One constraint to carry into whatever you decide, from §0 guardrail 1.** The
> Town Foreman as proposed is **full narration** — he carries every slide — but
> what he narrates is **the math, plainly. He does not narrate the town.** This
> brief deliberately keeps the setting in the art and terrain, and the
> plain-language pass exists because forced theming made D2 unreadable; a narrating
> advisor must not re-inflate the prose. That holds for any replacement too.

---

## 0. Read-me-first: a settled name and two guardrails

**Naming — settled as "Boomtown Square."** This island is **Boomtown Square — a
frontier town that keeps growing** (`Island_Lesson_Themes_Design_Spec.md` §4 D2
row, Gabe's 2026-07-26 plain-language rename, adopted for the **visual skin**
too). It is **townscape, not minescape** — the register is dusty and sun-baked and
the hue is **Clay `#C9A15E`**, but what you are modelling is a **town**, never a
dig site or a mining camp. That distinction is mathematical as much as visual: D2
is **Exponents** & Radicals, and *a town that keeps growing* is a far more direct
metaphor for **exponential growth** than a dig site — so **growth is the island's
spine, not its wallpaper** (§11).

Two guardrails a modeller must not trip over:

1. **"Rich visuals" and "plain-language prose" do not collide — they are
   different lanes.** Gabe's plain-language pass constrains the **word-problem
   prose** ("everyday nouns only," so a remedial learner never decodes the setting
   to reach the math). It does **not** constrain the **buildings and terrain**.
   This is exactly the §1.4 skin-only split: the world can be a vivid boomtown
   square while the CFU still says "a square patch of ground" and "a wooden beam."
   **Nothing in this doc asks Anthony to make the prose more elaborate.** The town
   is the wallpaper; the math prose stays plain.

2. **A boomtown must not paint with gold.** `#FFB703` (mastery gold) and `#F4A261`
   (warm gold: gilding, rewards, focus) are **reserved meaning colours**
   (`Game_Visual_Design_Brief.md` §4.1). So **no gold trim, gilded signage, or gold
   glints may appear in the terrain or on a building's body.** Gold appears **only** as the
   **mastery stars floating above a mastered building** (and on UI accents). Lean into it: in
   Boomtown Square the town **"strikes gold"** as those stars light up over a finished
   building. The gold is the payoff, never the wallpaper — arguably an even better fit for a
   boomtown than it was for a mine.

   > **CORRECTED 2026-07-28 — the guardrail stands; one sentence explaining it did not.** This
   > read *"Gold appears **only** when a building is mastered (it gilds) … a building literally
   > **"strikes gold" when you master it.**"* The **gold BODY treatment was retired and never
   > shipped**: `apps/web/src/city/buildingAssets.ts:44` — *"Full mastery renders as the normal
   > `built` model — there is no gold-mastered stage and no gold tint"*; `palette.ts:253-254` —
   > *"No stage is ever tinted gold — mastery is not shown as a gold building"*;
   > `masteryVisuals.ts:16` — *"Stars REPLACE the retired gold body-tint."* **The reservation is
   > unaffected and this guardrail is unchanged:** `#FFB703` and `#F4A261` stay reserved, and a
   > boomtown still must not paint with them. What changes is only *where* the earned gold lands —
   > on the stars above the building (`three/MasteryStars.tsx:69`), not on its body. The theme's
   > payoff survives; it is a strike above the roofline rather than a gilding of the walls. See
   > §7's banner and `Game_Visual_Design_Brief.md` §4.1.

> **The four working buildings, and the rule that tells them apart.** D2's four
> radicals nodes are hosted by four buildings drawn from four **different corners
> of a boomtown**, so no two of them share a register:
>
> | Node | Building | Register |
> | --- | --- | --- |
> | RAD.1 | **The Kiln Yard** | industrial |
> | RAD.2 | **The Railhouse** | transport |
> | RAD.3 | **The Telegraph Office** | communications |
> | RAD.4 | **The Toll Gate** | infrastructure |
>
> **Not one of them is a gabled work-shed.** Together they tell one story — *the
> town got connected* — which is a true picture of a boom, and they leave the
> **civic** register uncontested to the hub. With the **Boom Hotel** (EXP.1) on the
> square and the **Land Office** as the hub, that is the whole built roster (§2).
>
> **All the distinctiveness is building type, massing, and silhouette,** which is
> the axis the visual brief asks us to compete on (`Game_Visual_Design_Brief.md`
> §4.3, "silhouette-first") — never a second colour. The body hue is Clay
> `#C9A15E` for every building, there is no second body colour, and there is no
> decorative gold (guardrail 2).
>
> **The alternatives are on the record.** Three options were rendered per node and
> the chosen four came out of that comparison; the eight unchosen concepts, with
> their pitches and their trade-offs, are kept in
> `2026-07-26-d2-building-concept-options.md`. This spec does not restate them.
>
> **This closes §14 Q2** (RAD.4's placeholder building) — see that entry.

> **Also pending (do not depend on it):** a PROPOSED archipelago **narrative
> frame** is being drafted for `Island_Lesson_Themes_Design_Spec.md` **§1.6** and
> is **not yet on `integration`** as of this branch. Boomtown Square stands on its
> own as the D2 island regardless of which frame lands; this doc references §1.6
> only as *pending* and builds on nothing from it.

---

# PART I — THE DESIGNER BRIEF (model straight from this)

*Everything in Part I is pure visual description. There are no node ids, tile
counts, filenames, or math here — those live in Part II. Proportions are given in
plain words ("tall and narrow," "wider than it is deep") because they matter for
how a building sits, and they are not jargon.*

## 1. The setting and the town's materials

**The place.** Boomtown Square is a raw frontier **boomtown mid-boom**, thrown up
on dusty **red-clay flats** under a hazy, sun-baked sky. It is built around a
central **town square** that the settlement keeps outgrowing — new false-front
buildings going up on every side, lots staked and re-staked, roofs multiplying as
the crowd and the trade pour in. Everything is recent and hard-working: **rough-cut
timber, squared stone, packed earth, painted plank signs.** You have just **ridden
into town** and staked your first lot. Build for that mood — **weathered, dusty,
optimistic, visibly half-finished and still growing.**

**One family of buildings.** Every building shares **one warm, sun-baked clay /
adobe body colour**, so the whole town reads as a single family. Tell the buildings
apart by their **shape and their props** — never by giving one a different body
colour. The buildings are timber-and-clay frontier construction: **false fronts,
plank walls, shingle or plank roofs, stone footings** — and, where the town has
started building things that have to take heat or weight, **clay-brick domes and
vaults, arched openings, and dark ironwork.** A boomtown that has got as far as a
kiln and a railhead is not built only out of planks; the point is that it is still
built out of the **same clay**.

**Materials and colour — plain rules that matter:**

- **Permanent timber must look weathered, not fresh.** Use a **darker, weathered
  brown** for any wood that is meant to be permanent — boardwalks, false-front
  framing, posts, the water tower, telegraph poles. **Pale, raw, freshly-sawn
  lumber tan is reserved to mean "this is still under construction."** If you leave
  permanent woodwork pale and raw, finished buildings will read as **perpetually
  half-built.** Keep the pale raw-lumber tone for the lumber stacks and scaffolds at
  lots that are genuinely still going up.
- **Keep gold off everything.** No gold trim, gilded signs, or gold glints anywhere
  on a building's body, its props, or the ground. **Gold is reserved as the mastery
  accent**, and the engine carries it on the **stars above** a mastered building, never
  on the building — so it must never appear in the base models or the scenery.
  *(This read "a special reward **finish** that appears only when a building is
  'completed' in play", which implied the retired gold body; see §0 guardrail 2's banner.
  The rule itself — keep gold out of your models — is unchanged.)*
- **Brick is clay, not red.** Several buildings are now brick or vaulted work — kiln
  domes, arched stall heads, a chimney stack. Author every brick and every vault in
  the **same warm clay tan as the walls**, coursed rather than recoloured. A red
  brick reads as a second body colour and breaks the family instantly.
- **Iron is a neutral, and it is dark.** Hoop bands, hinges, rails, chains, a
  turntable, a swing bar: keep all of it a **dark desaturated grey** so it reads as
  hardware against the clay. Iron is the one thing in town allowed to be near-black;
  it must never be a second *body* colour, only fittings.
- **Warm, dusty palette overall** — clay tans, weathered browns, red-clay earth,
  dust-road ochre, and a desaturated grey-sage for the scrub. Nothing lush or green;
  no open water anywhere.

## 2. The buildings

Six buildings: five working buildings around the square, and the town's civic seat
(the hub). Each description below is the whole visual brief for that building.

**Telling them apart at a glance.** These buildings are seen small, from one fixed
angle, side by side on a grid, and they all share one body colour — so **each one
must own a different signature shape**, big enough to survive being shrunk. Read
across the set before modelling any single one:

| Building | Its one signature shape | The read from far away |
| --- | --- | --- |
| Boom Hotel | Repeated identical storeys, zig-zag stair up one face | A tall striped column |
| Kiln Yard | Three **domes** in a row under one solid **tapering stack** | A row of humps with a spike |
| Railhouse | A **semicircular fan** of arched stalls round a turntable, one boxy **coaling tower** behind | A half-disc with a crate up on legs |
| Telegraph Office | A small block under an **open lattice mast**, **wires fanning** to the lot's edge | A dot with taut lines running off it |
| Toll Gate | A **timber arch across a road** with the bar down, a pyramid-roofed lodge beside it | A gate you can see through |
| Land Office (hub) | A broad dignified false front with a bell | A wide civic frontage |

**No two of these are the same class of shape.** Domes, a curved fan, an open
lattice, and a pass-through arch — against the Hotel's stacked column and the hub's
wide frontage. Nothing in the set is a rectangle with a pitched roof, which is what
went wrong twice before.

**The one collision that survives the choice: three tall thin things.** The Kiln
Yard's stack, the Railhouse's coaling tower, and the Telegraph Office's mast are all
"a tall element over a low building," and at grid scale that is exactly the kind of
resemblance that erases a silhouette. Keep them apart on **weight, transparency, and
what sits at the top** — three properties that survive being shrunk:

| The tall thing | Weight | See through it? | At the top |
| --- | --- | --- | --- |
| Kiln Yard — **the stack** | Solid masonry, square section, tapering | No, fully opaque | Nothing but a plain cap and a thin smoke curl |
| Railhouse — **the coaling tower** | A heavy closed box carried on four splayed legs | Under it only, between the legs | A big loaded mass, with one steep diagonal chute off it |
| Telegraph Office — **the mast** | An open braced lattice, almost no mass | Yes, all the way up | Thin crossarms, and wires running out and down to the lot's edge |

So: **solid**, **loaded**, and **transparent**. The wires belong to the Telegraph
Office alone, the diagonal chute to the Railhouse alone, and the smoke to the Kiln
Yard alone — one exclusive cue each, on top of the weight difference.

**And the height ladder is fixed: the Boom Hotel stays the tallest thing in town by
a clear margin.** Author each of these three tall elements to top out around
**two-thirds of the Hotel's height or less**, measured in each model's own
proportions (§9.1 — the engine rescales, so what matters is the ratio, not units).
The Kiln Yard's stack is the tallest of the three, then the coaling tower, then the
mast. Nothing on a working building competes with the Hotel; height is the Hotel's
one job.

**One rule they all share — the town is still going up.** Every finished building
carries **one visibly unfinished addition**: a new bay framed but not yet clad, a
stubbed-out upper storey, fresh posts standing where the next extension will go.
Keep it to *one* per building, off to a side, never obscuring the signature shape.
This is what makes the whole square read as one growing town rather than a row of
finished set pieces, and it means every "built" model still obviously came from a
scaffolded one (§7).

### 2.1 The Boom Hotel

A **tall, narrow tower** — the tallest thing in town — built as the **same storey
repeated over and over**, one identical floor stacked on the next, as if the hotel
keeps adding rooms as fast as the town grows. An **external staircase zig-zags up
one face.** The top is capped with a small **cupola or a water-barrel cap.** A
**painted tally board** on the front face keeps a running count of storeys or rooms.
Character: proud, ever-rising, the boomtown's showpiece — height is the whole point.
Proportion: distinctly **tall and narrow.**

### 2.2 The Kiln Yard

**The shape:** a **row of three squat domed kilns** standing shoulder to shoulder on
a low stone footing, linked along their backs by a **low arched flue duct**, with one
**tall tapering stack** rising behind the middle of the row. That is the whole
silhouette: **three humps and a spike.** Nothing else in town is round-topped and
nothing else has a chimney, so this reads from clear across the island.

**The kilns** are the building — do not bury them behind a shed. Each is a **rounded
beehive dome** of coursed clay brick, banded with **dark iron hoops**, with a single
**arched iron door** at the front and a small draught port low at one side. Build
them **identical and evenly spaced**; the repetition is what makes the row read as a
row rather than a lump. One kiln stands with its door open on a glowing empty
interior, one is bricked up mid-firing, one is cold.

**The stack** is solid, square in section, tapering as it rises, coursed in the same
clay brick, with a plain cap and **one thin curl of grey smoke** and nothing else at
the top. It must be unmistakably **masonry, not framework** (see the three-tall-things
table above).

**The sorting is the point, so build the two piles as real objects.** Along one flank,
under an open-sided **drying shelter** of weathered timber, raw and fired bricks are
stacked in **clean, perfect square pallets sorted by size** — a stack of big, a stack
of middling, a stack of small, each stack a tidy square block in its own right. At the
far end of the yard, well clear of the shelter, sits a **loose heap of broken and
misfired brick** — the material that would not make a whole unit. **The contrast
between the sorted square stacks and the formless heap is the building's whole idea**
and must survive being shrunk: keep the stacks squared and regular and the heap
visibly ragged.

**Props, in rough order of how much they matter:** a **painted batch board** on the
shelter's end wall tallying the firing; a **barrow of raw clay** and a **pug pit** of
worked clay at the near end; **timber pallets and a hand-truck**; a **stack of iron
kiln bands** leaning against the stack's base; a **water butt**; ash rakes and long
iron peels hung on the shelter posts.

**Its unfinished addition:** a **fourth kiln, half-built** at the end of the row — a
waist-high ring of brickwork with pale bare timber **scaffolding** standing round it
and a ladder in.

**Character:** hot, industrious, methodical — the building that turns formless clay
into whole square units, and the reason the rest of the town has anything to build
with. **Proportion: wide and low, except the stack**, which is the one thing allowed
to be tall.

### 2.3 The Railhouse

**The shape:** a **semicircular fan** — six engine stalls radiating around a **sunken
turntable pit**, each stall fronted by a **tall arched opening** with heavy timber
doors, all under one **shallow fan-shaped roof** with a row of little smoke jacks
along its ridge. Behind the fan, a **boxy coaling tower** stands on four splayed
timber legs. The read is **a half-disc with a crate up on legs** — the only curved
plan in D2 and the only shape on the island that is not built out of straight walls.

**The turntable is what makes the fan legible**, so it must be a real sunken object,
not a disc painted on the ground: a **stone-lined circular pit** with a **timber
turntable bridge** across it carrying a short length of rail, sitting a step below
grade. **Short stubs of rail** run from each stall's doorway to the pit's rim and stop
there.

**Contain the railway on the lot.** Track exists only inside this building's own pad
and terminates at the lot edge in **timber buffer stops**. The **island terrain
carries no railway** (§3, §10 are unchanged by this pass): the road into town is still
the way in, and this building is the railhead *arriving*, not a rail network already
built. A future terrain pass may choose to answer it; nothing here depends on that.

**The sorting is the point.** Off the fan, a short **sorting siding** holds a **rake of
matched cars coupled into one train** — identical cars, coupled nose to tail — and,
standing apart on a stub of its own, **two or three odd cars that do not match the
rake and so have not been coupled to it**. Like couples to like; the mismatched ones
wait on their own road. Author the matched rake as visibly *one object* and the odd
cars as visibly *separate*, because that distinction is the skill.

**The coaling tower** is a heavy closed timber hopper carried high on four raking
braced legs, with **one steep diagonal chute** running down from it toward the
turntable and a small ladder up one leg. It is the loaded, opaque tall thing in town.

**Props:** the blunt front of a small **dark iron locomotive** just visible in one open
stall; an **ash pit** sunk under one stall's rail with **clinker raked out into a heap
beside it** (an engine gets the rough dropped out from underneath before it goes back
on the road — this prop carries the rationalizing read, §12.3, so do not drop it); a
**water crane** with a swing arm at the pit's edge; **iron rail stacked in lengths**
and a barrel of spikes; a **sand box**; a **train-order board** on the centre stall's
gable; oil cans and a lantern on a hook.

**Its unfinished addition:** **two stalls at one end of the fan are only framed** —
bare pale timber arches and rafters, unclad and unroofed, with the arc of the fan
obviously meant to continue.

**Character:** the loudest possible evidence that the boom is real — the day the line
reached town. Busy, sooty, and clearly built to be extended. **Proportion: broad and
low in plan, roughly square overall**, with the coaling tower the only height.

### 2.4 The Telegraph Office

**The shape:** a **small, compact two-storey office** — a plain block with a hipped
shingle roof and a narrow shaded porch on timber posts — carrying a **tall open
lattice mast** that rises straight out of the roof ridge, with **taut wires fanning
away** from its crossarms to short pole stubs at the edges of the lot. The read is **a
dot with lines running off it**: the fan of wires gives the smallest building in town
real reach without giving it any footprint.

**The mast** is an **open braced timber lattice** — see-through top to bottom, almost
no mass — carrying **three crossarms** strung with rows of small glass insulators. It
is the transparent tall thing in town, and the only one with wires.

**Author the wires inside the model's own ground box.** The engine contain-fits every
model to its footprint by its bounding box (§9.1), so wires that fly far out sideways
will shrink the whole building. Run them **down and out to pole stubs that stand just
inside the lot**, not off to the horizon. Keep them **chunky enough to survive low-poly
export** — a wire authored at true thickness disappears.

**The front is where the skill lives.** Beside the door, **two notice boards mounted
side by side and framed identically**: the same day's traffic posted twice, once in
plain writing and once in code. They are twins on purpose. Through the front window,
a **desk with a telegraph key, a sounder, and spools of paper tape**. On the front
gable, a **two-armed semaphore** — a stout post carrying two pivoting arms set at
different angles, reading as an instrument rather than a decoration.

**Props:** a **coil of spare wire** on a drum by the porch; a crate of **glass
insulators**; a **message spike** and a slate on the porch shelf; a **lamp** on a
bracket by the door; a bundle of **spare crossarms** leaning on the wall.

**Its unfinished addition:** a **small rear extension framed but not clad** — three
bare posts and a tie beam on a laid footing course, with a fourth pole stub already
planted for the wire run it will carry.

**Character:** small, quick, connected — the town's link to everywhere else, and the
one building whose whole trade is turning one thing into another form of itself.
**Proportion: compact in plan and modest in body**; the mast and the wire fan are what
make it findable.

### 2.5 The Toll Gate

**The shape:** deliberately **not a building on a lot but a gate across a road.** A
**heavy timber gantry arch** straddles a rutted road that runs **front to back through
the lot**, so from the camera you look **through** it; a **long counterweighted swing
bar** is **down** across the road beneath the beam; and a small **keeper's lodge**
stands to one side. The read is **a gate you can see through** — the only pass-through
structure in D2, and the only lot with a road running across it.

**The arch** is two stout braced posts on stone pads carrying a deep cross beam. From
the beam hang the **painted rate board** (the toll listed line by line) and a
**lantern**. The bar is a long tapering timber pole banded in plain dark and off-white,
pivoting on an iron post with a **stone counterweight** on the short arm.

**Two gates, and they mean different things — this is the building's whole idea.**
The **main bar is down but liftable**: pay and pass. Beside it, a **second, narrower
side gate is nailed shut and boarded across** with a weathered board over it, its
posts braced, plainly not opening for anyone. One way is *restricted*; the other is
*closed*. Author them close enough together to be read as a pair and different enough
to be read as a contrast.

**The lodge** is a small clay block with a **shallow pyramid roof** and a **lamp
finial**, and a **canted bay window** projecting toward the road so the keeper sees
**both directions at once**. A narrow stoop carries a **payment shelf** and an iron
cash drawer.

**The ground carries the measuring.** A squat **milepost** stands at the roadside with
distances **cut into two faces, one for each direction**, counting away from the gate
both ways. Along the verge, low **wheel-count stones** mark off the road in even
intervals. The gate is zero; both directions count off positive from it.

**Props:** a **wheel-rut grader beam** and a barrow of gravel; a **hitching rail** by
the lodge; a **water trough**; a stack of spare bar timbers; a hooded **lamp on a post**
at the closed gate.

**Its unfinished addition:** a **second arch begun** further along the road — two
post-holes dug and one post standing plumb in its stone pad, no beam yet.

**Character:** official, patient, slightly unwelcoming — the one place in town whose
job is to decide what may come through. **Proportion: long front-to-back along the
road, low overall**; the arch is the tallest thing on the lot and it is not very tall.

### 2.6 The Land Office (the hub)

The town's **civic seat** and its best building — **noticeably better built and
more finished** than its rough-and-ready neighbours, the one place that looks
**established and permanent** the day you arrive. A dignified **false front** rises
above the roofline, topped with a **bell or a flag.** Out front: a **public
counter**, a **plat board** posting the town's lots, a **hitching rail**, and a
**stovepipe chimney.** Character: dignified, official, welcoming — the founding
landmark that anchors the central square. Proportion: **noticeably wider than it is
deep** — a **broad civic frontage, not a square block.**

## 3. The surrounding town (terrain and scene-dressing)

The buildings sit on a broad, flat **red-clay flat** that crumbles to dust and
scrub at its edges (a low earthen berm). Beyond it, **open dusty frontier plain**
runs to a hazy horizon — **no water anywhere**; a rutted **freight road** trails in
from the distance. Vegetation is **sparse high-plains scrub**: sagebrush clumps, a
lone **cottonwood** by the well, the odd yucca, and an occasional **tumbleweed**
drifting through.

The town's **growth edge** is visibly still going up: **staked-but-empty lots**
(survey stakes with claim-rope strung between them), **stacks of fresh-cut lumber**,
brick and stone piles, and a parked **freight wagon.** The way in is the **main
street into the square**: a rutted road with a painted **TOWN sign**, boardwalks,
and hitching rails — the "you just rode into town" landmark.

On the skyline: a **water tower on stilts**, a **church or bell steeple** (or a
**windmill pump**), and **telegraph poles** marching off to the horizon. Overhead,
**hawks or buzzards** circle and a slow **dust haze** drifts. On the ground itself,
the buildable area is ruled out like a **surveyor's plat** — chalk-and-lime
peg-and-rope **lot lines** drawn across the clay.

---

# PART II — IMPLEMENTATION (nodes, footprints, files, engine fit)

*This part carries the material the modeller and the engine need but the pure
visual brief (Part I) leaves out: which node each building is, footprints and
placement, body/lighting and the meaning-colour accents, the construction stages,
the exact filenames, the scale/fit rules, and the terrain palette.*

## 4. One building per node — the map

The five live D2 nodes (verified against `packages/skill-graph/src/skill_graph.json`
and `docs/Node_Spine_v4.md`), each as **one building** whose form makes the skill
legible. Skill text is quoted from the registry — **not guessed.** Prereqs are
recorded so the modeller understands the island's build order (EXP.1 and RAD.1 are
the two entry buildings off D1's `NUM.4`).

**At a glance:**

| Node | Skill (registry) | Building (PROPOSED) | Silhouette | Footprint | Accent trim (provisional — see note) |
| --- | --- | --- | --- | --- | --- |
| **EXP.1** | Apply exponent laws to evaluate & simplify (incl. zero & negative exponents) | **The Boom Hotel** | Tall stepped tower of repeated identical storeys | **2×2** | constructed-response amber `#CC7A3B` |
| **RAD.1** | Evaluate & simplify roots (product/quotient reasoning) | **The Kiln Yard** | Three domed kilns in a row under one solid tapering stack; sorted square brick stacks against a ragged rubble heap | **2×1** | numeric teal `#4E7C8A` |
| **RAD.2** | Combine radical terms; clear radicals from denominators | **The Railhouse** | Semicircular fan of arched stalls round a sunken turntable + a boxy coaling tower on splayed legs | **2×2** | constructed-response amber `#CC7A3B` |
| **RAD.3** | Convert between fractional-exponent and radical form | **The Telegraph Office** | Small block under an open lattice mast, wires fanning to the lot's edge; twin notice boards | **1×1** | constructed-response amber `#CC7A3B` |
| **RAD.4** | Variable radicands; `sqrt(x^2)=abs(x)`; even-root domain restriction | **The Toll Gate** | Timber arch across a front-to-back road, bar down, a nailed-shut side gate + a pyramid-roofed lodge | **1×2** | constructed-response amber `#CC7A3B` |
| *hub* | *(non-skill)* | **The Land Office** | Dignified false-front civic building — **wider than deep** | **3×2** (D-TH6) | *(none — hub)* |

## 5. Footprints and placement

Footprints come from D1's fixed vocabulary — **{2×2, 2×1, 1×2, 1×1}** — plus the
shared Town Hall footprint for the hub. The engine's contain-fit and origin rules
(§9) make these the levers that matter; author each model's **long axis** to match
its footprint's long axis (§9.4).

- **Boom Hotel (EXP.1) — 2×2.** A boomtown "hotel" is often a *wide* false-front
  block, but the exponent read needs **vertical** repetition, so this is
  deliberately a **storey-stacking tower**, not a wide row. A tower is compact in
  plan and earns its size in **height**; 2×2 matches D1's tower footprints
  (`NUM.S`/`NUM.5`) and is **even**, so it snaps dead-centre on a lot beside the
  square (§9.2). Height is capped at `MAX_BUILD_HEIGHT` (§9.1), so it reads tall but
  never throws its silhouette past its plot. **And 2×2 is the right plot for a tower for a
  reason worth knowing before modelling: rendered height is set by the PLOT, not the model
  (§9.1), so a SMALLER plot would make this read shorter, not more slender.** `NUM.5` was
  briefly moved to 1×1 on exactly that mistaken intuition and reverted the same day, after
  the renders showed it losing 2.03× its height against a same-plot neighbour for no gain in
  proportion. Earn the tower in the model's slenderness; take the full 2×2.
> **D2 uses the footprint vocabulary in full.** Between them the five buildings use
> **all four** footprints — 2×2, 2×1, 1×2, 1×1 — so the island reads differently in
> **plan** as well as in profile, even at maximum zoom-out. Two of them need their
> size for a specific reason: RAD.2 is **2×2** because a semicircular fan cannot
> live in a two-cell strip, and RAD.4 is **1×2** because a road has to run *through*
> the lot.

- **Kiln Yard (RAD.1) — 2×1.** A kiln row is **wide**: three identical domes side by
  side, the flue duct behind them, and the sorting shelter along one flank all lay
  out on a long working face, and a narrow plot would stack them into a lump. Author
  the model **long along X** so its two tiles run left-to-right (the rule D1's wide
  **Glass Slab** follows; §9.4 — the Brownstones followed it too until their plot became a
  square 2×2 on 2026-07-28, so the Glass Slab is now the only 2×1 in the city). The
  **building** is low — but author
  the **stack** clearly above the domes (roughly twice their height); it is half the
  silhouette, and the contain-fit binds on the ground axis, not the height, so the
  stack costs nothing (§9.1).
- **Railhouse (RAD.2) — 2×2.** A fan needs a **square-ish plot** — the arc has to
  sweep, and squeezing it into a two-cell strip turns the semicircle into a bent
  shed and loses the one curved plan on the island. 2×2 is **even on both axes**, so
  it snaps dead-centre on its lot (§9.2), which is right for a radial building: the
  turntable wants to sit on the middle of the plot. **It shares its footprint with
  the Boom Hotel and that is fine** — D1 has **three** 2×2s as of 2026-07-28 (`NUM.S`,
  `NUM.2`, `NUM.5`) — because the two are maximally different in *profile*: a slim tall
  column against a low wide half-disc. D1's own three make the same case on two further
  axes: a tall deco tower, a low group of huts round a yard, and an open climbing frame, all
  on 8×8 and told apart by **mass and grain** rather than by plan. Author the fan's flat face
  toward the camera-facing side so the arc of arches is read across, not end-on.
- **Telegraph Office (RAD.3) — 1×1.** The smallest building in town, and it should
  stay that way: the office is a single compact block and every bit of its presence
  comes from the **mast and the wire fan**, which are tall and thin and cost no
  ground area. This is the island's smallest silhouette (a single cell, like D1's
  **School** — the only 1×1 in the city). **Note that a 1×1 makes this building render
  SMALL, mast included**: the plot sets the scale (§9.1), so the mast's presence has to come
  from the model's proportions rather than from the tile. The **wires and the
  pole stubs must be modelled within the model's own
  ground box** — the engine contain-fits to that box, so a wire run that flies far
  out sideways will shrink the whole building (§9.1). Wires down and out to stubs
  just inside the lot; never off the plot.
- **Toll Gate (RAD.4) — 1×2.** A gate is only a gate if the road **passes through
  it**, so the road runs **front-to-back**, away from the camera, and you look
  through the arch. Author the model **long along Z** so its two tiles run
  front-to-back (the rule D1's **Park** follows; §9.4); authoring it long along X
  would turn the gate side-on and destroy the pass-through read. The lodge sits
  beside the road inside the same two cells, and the arch is the tallest thing on the
  lot but is not tall (§2).

  > **RAD.4's placeholder is now closed.** `Island_Lesson_Themes_Design_Spec.md` §4
  > marked RAD.4's building as *"a PLACEHOLDER pending Evan"* and `descriptors.ts`
  > reserves only `"RAD.4": "generic"`. The building is **decided** as of this pass
  > (§14 Q2). The `descriptors.ts` entry is a **node→building engine hook** and is a
  > separate wiring task (§13), so it stays as it is until that task runs.

- **Land Office (hub) — 3×2 (D-TH6).** The shared Town Hall footprint was set to
  **3×2** by decision **D-TH6** (implemented on PR #94), replacing the earlier 2×2.
  Because **3 is odd**, the hub **cannot centre on the world origin**: it seats about
  **2 u (half a `GRID_CELL`) east** of centre on its **width (X)** axis, while its
  **depth (Z) is even, so Z stays centred** (§9.2). Model it as a **broad civic
  frontage — wider than deep, not a square block.**

  > **The old "town square" geometry no longer holds.** An earlier version of this
  > brief argued the hub was an **even 2×2** that "snapped dead-centre on the origin
  > = the town square everything booms around." Under **D-TH6** the hub is **3×2**
  > and sits half a cell off exact centre, so **that argument is dropped.** Half a
  > cell off is not visually significant — the Land Office still **fronts** the
  > central square the town booms around (see §11) — it simply is not mathematically
  > dead-centre, and must not be modelled or described as a perfectly centred square
  > block.

- **The hub hosts the island's advisor.** The advisor NPC stands at the **Land
  Office counter** (Town Hall spec D-TH5). This doc only says *where* the advisor
  stands; it writes none of the persona or voice. *(⚠ Gabe, 2026-07-27: that persona
  is **Evan's** — his for every island — and D2's advisor is proposed as **the Town
  Foreman**, recorded in `.cursor/skills/author/reference.md` §6 for him to keep or
  replace. See the annotation under the header. This note still only says where he
  stands.)*

## 6. Body, lighting, and the accent (meaning-)colours

**Body + lighting for every building:** body hue is **Clay `#C9A15E`**, rendered in
the fixed 3-tone face lighting — **top face** lightened ~26% toward white, **left
wall** the hue itself, **right wall** darkened ~28% toward black
(`Game_Visual_Design_Brief.md` §4.2). The **only** non-Clay colours on a finished
building are (a) its small answer-type accent trim on the sunlit wall and (b) nothing
else — mastery gold `#FFB703` rides on the **stars above** the building, not on the
building, so it is never a colour *on* a finished model (§0, guardrail 2's banner).
Every themed detail (false front, derrick,
scale, weathervane) is modelled in the Clay body or neutral weathered timber/stone —
**never a second body colour.** The hub carries **no** answer-type accent (it is not
a skill), though it may carry a small **civic accent** (a flag, a painted sign) so it
reads as the hub.

> **Accent-trim note (read before assigning colours).** In this system the small
> accent trim is a **meaning colour**: it encodes the node's **answer type**
> (numeric → deep teal `#4E7C8A`, multiple-choice → plum `#7E5A7A`,
> constructed-response → burnt amber `#CC7A3B`, generic → slate `#6C7A88`), and it
> is **derived from the item bank's authored `answer_type`**, not hand-picked
> (`engines/game/src/descriptors.ts::archetypeForAnswerType`). **D2 now has authored
> items** (`packages/item-bank/src/d2/nodes/{EXP.1,RAD.1–4}`), but they declare
> answers through per-item constructors rather than a single node-level
> `answer_type`, and `descriptors.ts` still reserves only `"RAD.4": "generic"`, so
> the node→archetype hook is not wired for D2 yet. The accent colours in §4 therefore
> remain **inference from each skill, to be confirmed against the bank** when that
> wiring lands (§14 Q3, still open). It is
> **fine and expected** that several D2 buildings share the amber trim — D1 has
> **four** numeric halls that all share the teal trim and are told apart by their
> **per-node silhouettes**, which is the system working as designed
> (`Game_Visual_Design_Brief.md` §4.1: buildings "share the body hue and differ by
> **silhouette + accent**, never a second body colour").

Each finished building's accent trim is carried by **one** authored prop — one only,
so the trim keeps meaning something:

| Building | The prop that carries the accent |
| --- | --- |
| Boom Hotel | The **storey-tally board** on the front face |
| Kiln Yard | The **painted batch board** on the drying shelter's end wall (the kiln domes, their iron hoops, and the stack are all neutral clay brick and dark iron) |
| Railhouse | The **train-order board** on the centre stall's gable (the coaling tower, the rails, and the turntable are all neutral timber and dark iron) |
| Telegraph Office | The **twin notice boards** flanking the door (both boards, identically — they are a pair on purpose) |
| Toll Gate | The **rate board** hanging from the arch beam (the bar's banding is plain dark and off-white, *not* the accent — see below) |

> **Building type carries the difference, not colour.** Everything §2 describes —
> kiln domes, a chimney stack, a semicircular fan of arches, a turntable, a coaling
> tower, a lattice mast and its wires, a gantry arch and a swing bar — is
> **building type, massing, and
> structure**, and all of it is modelled in the **Clay `#C9A15E`** body, in
> **weathered timber `#6F5334` / `#8A7355`**, in **dressed stone**, or in **dark
> iron**. No building gains a second body colour, no prop introduces a new hue, and
> **nothing gains gold** (§0, guardrail 2). Three places are easy to trip over now:
>
> - **Brick is clay.** The kiln domes, the flue duct, the stack, and the stall arch
>   heads are **large areas of brickwork**, and brick's default is red. Author every
>   one of them in the **Clay body hue, coursed** — the coursing is the texture, the
>   hue does not change. A red kiln is a second body colour.
> - **Stone stays under the body.** Footings, the turntable pit lining, the arch pads,
>   and the milepost are **dressed stone**: keep it a **desaturated warm grey-tan that
>   sits under the Clay body in both saturation and lightness**, so stone reads as a
>   *material* the Clay buildings stand on, never as a rival body colour.
> - **Iron is dark, and there is a lot of it.** Hoop bands, stall door strapping,
>   rails, the turntable, chains, the swing bar's pivot, the locomotive:
>   all **dark desaturated grey**, read as fittings. It is the one near-black in town
>   and it must stay on hardware, never on a wall.
>
> The Toll Gate's **swing bar** is the single banded object worth stating: its bands
> are **plain dark iron-grey and whitewash off-white**, not a new pigment and not the
> accent trim.

## 7. The three construction stages, in this theme

Every skill building is authored as **three GLB stages** — `site` → `construction` →
`built` — exactly like D1 (`apps/web/src/city/buildingAssets.ts`: each node has its
own `*-site.glb` / `*-construction.glb` / `*-built.glb`, and the engine cross-fades
between them as the node's mastery advances; `advanced` reuses the `built` model, so
**only these three are authored per node**). D1's site is hoarding + footings +
survey stakes; a boomtown's stages are its own thing — and the town is *visibly going
up* on every lot:

| Stage | D1 (harbour city) | D2 (Boomtown Square) — build this |
| --- | --- | --- |
| **`site`** (not started / preview) | Hoarding + perimeter footings + survey stakes on a cleared pad | **A staked lot.** A cleared **red-clay pad**, **corner survey stakes** with claim-rope strung between them, a **lot-notice / deed board**, a few tools; reads "staked, not yet built." |
| **`construction`** (teaching / practice) | Rising scaffolded frame in timber `#B08968`, open top, a small bobbing crate | **A false front going up.** Bare-timber **scaffolding** (this is where `#B08968` belongs), a simple **gin-pole or A-frame hoist** (not a modern tower crane), stacked fresh lumber, a **bobbing material crate** on the hoist (the crate-bob ambient beat). |
| **`built`** (finished) | Full volume, roof detail + accent trim, topped out | **The finished building** in Clay, its signature shape complete (the Hotel's stacked storeys; the Kiln Yard's three domes under its stack; the Railhouse's fan of arches round its turntable; the Telegraph Office's mast and wire fan; the Toll Gate's arch over the road with the bar down), roof detail + the answer-type accent trim — **plus the one unfinished addition** every D2 building carries (§2). |

**Per-building `site` / `construction` flavour.** The four buildings were chosen
partly because each one is genuinely **built in visible increments**, so the three
stages tell a single story rather than three unrelated ones — and in every case the
middle stage is *the finished shape, partly present*, not a generic scaffold box:

| Building | `site` | `construction` |
| --- | --- | --- |
| **Boom Hotel** | Staked lot + the first sill plate | Rises **storey by storey** — the growth read is visible mid-build |
| **Kiln Yard** | Pad with the **three circular kiln footings ringed out in stone** and the flue trench dug | **The first kiln is domed and firing** while the second is a waist-high ring inside scaffolding and the third is bare footing; the stack stands at half height, capped off temporarily |
| **Railhouse** | The **turntable pit dug and ringed in stone**, with the stall footings radiating out from it like spokes | **Two stalls complete and doored** while the rest of the arc stands as bare timber arches; the turntable bridge is in but has no rail; the coaling tower's four legs are up and braced with no hopper on them |
| **Telegraph Office** | **Pole holes dug** and the wire route staked across the lot; no mast | The office is **half-walled**; the **mast is stepped up in braced sections**, only the lowest crossarm strung, a single slack wire run to the nearest stub |
| **Toll Gate** | The **road ruts graded** through the lot and the two arch post-holes dug | The **arch posts stand** and the beam is being hoisted between them on a gin pole; the lodge is a half-built shell with no bay window; **the bar is not hung yet, so the road is open** |

**The hub is the exception — one model, already built.** Per the **in-flight Town
Hall redesign** (the hub becomes **pre-seeded and already built**, so it needs
**one** model, not three), author **only the finished `built` model** for the Land
Office. **This supersedes** the committed `2026-07-25-town-hall-design.md`, which
still describes a **three-stage, self-building** hall (D-TH4) that the player places
first (D-TH1). Confirm the redesign has landed before wiring (§14 Q1); if the
three-stage version survives instead, the D2 hub would need
`site`/`construction`/`built` like a skill building.

**Mastery = the gold strike (no new model).** As in D1, the `advanced` and mastered
looks are **derived in-engine from the `built` model** — the model is reused unchanged, and
full mastery floats **three gold `#FFB703` mastery stars above the roofline**. So a mastered
building **"strikes gold"** with no extra asset, and **no change to the building itself**.
This is the theme's payoff and the *only* place gold appears (§0, guardrail 2).

> **CORRECTED 2026-07-28 — the conclusion holds (no extra asset); the mechanism did not.** This
> read *"a soft grounding glow, and the reserved **gold `#FFB703`** gild on full mastery"*. The
> **gold body treatment was retired and never shipped**, and so was the grounding glow: full
> mastery renders the **plain** `built` model (`buildingAssets.ts:202` — *"Full mastery renders the
> plain `built` model (no gold pass)"*; `palette.ts:253-254` — *"No stage is ever tinted gold"*),
> and there is **no** body-glow or "comes alive" treatment (`masteryVisuals.ts:10`). Mastery is
> carried entirely by the stars above the building (`masteryVisuals.ts:16`,
> `three/MasteryStars.tsx:69`). **The asset consequence for D2 is unchanged and is the point of
> this section:** you still author only `built`, and `advanced`/mastered still need no new model —
> now because nothing is derived at all, rather than because the derivation is cheap. `#FFB703`
> stays reserved. See §0 guardrail 2's banner.

## 8. Asset checklist — exact filenames

The engine derives a node's file prefix by **lowercasing the node id and replacing `.`
with `-`** (`buildingAssets.ts::nodeFilePrefix`: `"NUM.S" -> "num-s"`), then loads
`<prefix>-<stage>.glb` for `stage in {site, construction, built}`. **Filenames are
node-derived, not building-derived, so the D2 paths follow mechanically from the
node ids and are unaffected by what each building is called:**

```text
# EXP.1 — The Boom Hotel
exp-1-site.glb
exp-1-construction.glb
exp-1-built.glb

# RAD.1 — The Kiln Yard
rad-1-site.glb
rad-1-construction.glb
rad-1-built.glb

# RAD.2 — The Railhouse
rad-2-site.glb
rad-2-construction.glb
rad-2-built.glb

# RAD.3 — The Telegraph Office
rad-3-site.glb
rad-3-construction.glb
rad-3-built.glb

# RAD.4 — The Toll Gate
rad-4-site.glb
rad-4-construction.glb
rad-4-built.glb

# Hub — the Land Office  (ONE model, already built — §7)
townhall-d2-built.glb
```

- **Count: 15 skill-building GLBs (5 nodes × 3 stages) + 1 hub GLB = 16.**
- **Skill-building GLBs** live alongside D1's in `apps/web/src/city/art/models/` (the
  `*.glb` glob that `buildingAssets.ts` bundles).
- **The hub GLB** goes in the **`art/models/townhall/` subdirectory** (outside that
  glob, so it does not break the model-count test), loaded by the dedicated town-hall
  loader — the same placement D1's town-hall assets use
  (`2026-07-25-town-hall-design.md` §8). The hub name **`townhall-d2-built.glb`** is
  **PROPOSED** — the per-island hub naming/registry (`TOWN_HALL_DESCRIPTORS`) is not
  built yet, so treat the exact hub filename as Evan's to finalize (§14 Q1).

> **Naming derivation, stated plainly (so it generalizes):** `<node-id lowercased,
> dots→dashes>-<stage>.glb`. `EXP.1 → exp-1`, `RAD.4 → rad-4`. This is the same
> convention D1 uses (`num-s-built.glb`, `num-4-construction.glb`).

## 9. Modelling constraints that will save rework

These are the constraints that actually determine whether an asset drops in cleanly.
Read this section before modelling anything. *(This is engine behaviour, independent
of the theme.)*

### 9.1 Relative proportion matters; absolute scale does not

Every model — every stage of every building — is **contain-fit to its footprint by
its own bounding box** and then **height-capped**, in engine
(`apps/web/src/city/three/PlacedBuilding.tsx` → `worldLayout.ts::footprintFitScale`):

- The engine measures your model's **native ground box** (`sizeX × sizeZ`), then
  applies **one uniform scale** = `min(fitX, fitZ)` so the **binding** ground axis
  fills **`FOOTPRINT_FILL = 0.95`** of the footprint's cell span — a "contain" fit
  with no overhang (`GRID_CELL = 4` world units per cell).
- Height is then capped at **`MAX_BUILD_HEIGHT = GRID_CELL * 6 = 24` units** (~6
  cells); over-tall models get a **gentle vertical squash**.

**Consequence — model in whatever units you like.** The engine rescales everything,
so **absolute size is irrelevant.** What the modeller controls, and all that matters,
is each model's **proportion**: a tower's height-to-base ratio, a shed's
width-to-depth ratio, which ground axis is longer. Do **not** try to "match units" to
the city — match **proportion.**

**Worked example — a tall 2×2 (the Boom Hotel, using D1's Deco Tower numbers).** The
Deco Tower is authored at roughly **14.5 (X) × 50.45 (H) × 15 (Z)**. In a 2×2 plot
(8×8 u), the fill target is `0.95 * 8 = 7.6` u. The binding ground axis is the 15-u
depth, so scale `= 7.6 / 15 ≈ 0.507`. That makes the base ~`7.35 × 7.6` u (fills the
tiles) and the height `50.45 * 0.507 ≈ 25.6` u — over the 24-u cap, so it is gently
squashed to 24 u. Net: a ~24-u-tall tower on a ~7.5-u base (~3:1) — tall, but inside
its plot. **The lesson: author the Hotel *tall relative to its base*; the actual
numbers wash out.**

**Worked example — a wide 2×1 (the Kiln Yard, using D1's Glass Slab).** The Glass
Slab is **26 (X) × 10.6 (Z)**. In a 2×1 plot (8×4 u), the wide X axis binds: scale `=
7.6 / 26 ≈ 0.292`, giving `7.6` u across the two tiles and only `~3.1` u deep (a slim
yard front/back in its single tile). **The lesson: author the kiln row *long along
X*; if you accidentally author it long along Z, the contain-fit shrinks it to the 4-u
tile and the three domes crush into one lump** (§9.4).

### 9.2 Even footprint centres on the origin; odd sits ~2 u off

An **even** footprint axis snaps **dead-centre on the world origin**; an **odd** one
(1×1, or the odd axis of a 2×1 / 1×2 / 3×2) sits **~2 u off** (half a `GRID_CELL`).
Concretely for D2:

- The **Boom Hotel (2×2)** and the **Railhouse (2×2)** are even on both axes, so both
  **centre cleanly** on their lots. This matters more for the Railhouse than for the
  Hotel: it is a **radial** building, and its turntable wants to sit on the middle of
  the plot rather than half a cell off it.
- The **hub (the Land Office, 3×2)** is **even on depth (Z)** but **odd on width
  (X)**, so it centres in Z but seats **~2 u east** on X (§5). It is a **broad civic
  frontage half a cell off exact centre**, *not* an origin-snapped square block.
- The **Kiln Yard (2×1)** is even on X, odd on Z; the **Toll Gate (1×2)** is odd on X,
  even on Z — so the Toll Gate's road, which runs along Z, is **centred on its lot**,
  which is what you want for a road you look down.
- The **1×1 Telegraph Office** sits **slightly off-origin**, which is fine for a small
  building.

### 9.3 The buildable disc and grid are unchanged — skin only

D2 reuses D1's `worldLayout.ts` verbatim: `GRID_CELL = 4`, `BUILDABLE_RADIUS = 22`,
the same placement/occupancy math, footprints from the same **{2×2, 2×1, 1×2, 1×1}**
vocabulary (plus the shared hub footprint, §5). The terrain art (§3, §10) is a
**re-skin of `StarterIsland.tsx`**; it must keep the flat, clear, fully-buildable
clay disc and the same-pitch grid so nothing about placement changes. (Wiring a
`D2_NODE_BUILDINGS` map + footprints + model registry is a separate **engine** task,
not this modelling brief — §13.)

### 9.4 Match the model's long axis to the footprint's 2-tile axis

Because the fit binds on the **larger** native ground axis, a wide building must be
authored **long along X** (for a 2×1) and a deep building **long along Z** (for a 1×2),
or it gets crushed into the single short tile (§9.1, second worked example;
`worldLayout.ts` documents this explicitly). Concretely for D2: **Kiln Yard = long
along X** (the row of domes reads across); **Toll Gate = long along Z** (the road runs
away from the camera, so you look through the arch). Getting either backwards does not
just squash the model, it destroys the read.

### 9.5 Style, poly budget, and exporter — match the Gridwork family

- **Low-poly, flat-shaded**, one soft key light baked as the 3-tone faces (§6) — the
  same look as the existing D1 models (`docs/design-refs/BUILDING_ASSETS.md`).
- **Triangle budget: keep each model in the existing ~600–3,500-triangle range.**
  Reference: the D1 Town Hall's three stages measure **628 → 2,554 → 3,514** triangles
  (`2026-07-25-town-hall-design.md`). A `site` stage should be light (few hundred); a
  finished `built` model can approach the top of the range.
- **Same exporter/pipeline** as the existing Gridwork models: GLB, +Y up, real-world
  proportions (engine rescales), single material set per building where possible,
  authored so a **bottom-centre** anchor lands on the tile.
- **Reference D1 native ground boxes** (world units, `X × Z`, measured from the GLBs in
  `apps/web/src/city/worldLayout.test.ts`) so "in scale with the existing city" is
  concrete:

| D1 building | Footprint | Native `X × Z` (u) | Note |
| --- | --- | --- | --- |
| Deco Tower (`NUM.S`) | 2×2 | ~14.5 × 15 (H ≈ 50.45) | slender tall tower |
| Clock Tower (`NUM.5`) | 2×2 | 15 × 15 | near-square plan, slender |
| Glass Slab (`NUM.F`) | 2×1 | 26 × 10.6 | wide, long along X |
| Brownstones (`NUM.2`) | **2×2** | 28.81 × 12.42 | near-square row round a yard |
| Community School (`NUM.3`) | 1×1 | 24.1 × 18.05 | compact |
| Central Park (`NUM.4`) | 1×2 | ~48 × 85 | long lawn, long along Z |
| Town Hall hub (built) | 3×2 (D-TH6) | 25.4 × 20.65 (H ≈ 28.8) | aspect ≈ 1.23 — wider than deep |

> **`NUM.2` was re-footprinted 2026-07-28** (`2×1 → 2×2`) while era one's art was being
> fitted, and INV-ERA-1 freezes it there. `NUM.5` was moved to 1×1 in the same pass and
> **reverted to 2×2** the same day. The `X × Z` boxes are unchanged throughout — they are the
> shipped Gridwork measurements, and only the plots moved. **D1 now has three 2×2s (`NUM.S`,
> `NUM.2`, `NUM.5`), one 2×1, one 1×2 and one 1×1**, which is what §5's D2 footprint arguments
> should be read against.

Again: these are **references for proportion**, not targets to hit — the engine scales
all of them to the same footprints.

## 10. Terrain palette and terrain-layer notes

### 10.1 Terrain palette (PROPOSED)

Stays inside the warm "parchment city" system; only the **environment** tones shift
from green/teal to dusty clay. These are **terrain** tones — they are **not**
building bodies and do not touch the one-hue-per-district building rule (every D2
building body is Clay `#C9A15E`, §6).

| Terrain role | Proposed hex | Note |
| --- | --- | --- |
| Buildable clay flat | `#D8C39A` | Deliberately **paler** than the Clay building body `#C9A15E` so buildings read against the ground |
| Flat tile-shade / deep clay | `#C2A874` | The D2 analogue of "Parchment deep" |
| Red-clay ground edge / berm | `#B5673F` · `#8C4A2F` | The dusty red earth at the town's crumbling edges; **avoid** the reserved warm-gold `#F4A261` |
| Dust road / dry wash | `#E4D2A6` | The rutted main street + any dry wash |
| Sparse scrub | `#8A9A6E` | A **desaturated grey-sage** — kept clearly off the reserved success-green `#2DC653` and off D4's sage-green body `#8FA97E` |
| Permanent town timber | `#6F5334` · `#8A7355` | Weathered wood for boardwalks, false-front framing, the water tower, telegraph poles — see the guardrail below |
| Fresh-sawn lumber (growth edge) | `#CBB088` | New stacked lumber at staked lots — a pale raw-wood tone kept off the reserved timber `#B08968` |
| Sky / distance | warm dust haze | Carried by the finishing pass (§4.10 of the brief) |

**Timber guardrail (important):** the reserved **timber `#B08968`** specifically
means **"under construction / scaffolding"** (`Game_Visual_Design_Brief.md` §4.1). A
boomtown is timber-heavy (boardwalks, false fronts, the water tower), so
**permanent** town timber must use a **distinct weathered-wood tone** (D1's pier
posts use `#6F5334`), and the growth-edge **fresh lumber** stacks their own pale
tone — reserve `#B08968` for the actual construction-stage scaffolds (§7), or a
placed, finished building (and every lumber pile) will read as perpetually under
construction. (This is the technical restatement of the plain-language rule in §1.)

### 10.2 The terrain layer is a decorative re-skin of `StarterIsland`

D1's `StarterIsland.tsx` is a **green harbour island in a teal lagoon**: a stepped
grass shore, blossom/green tree copses, shoreline boulders, a plank dock, and a
flock of gulls, all ringing a clean buildable meadow with a green tile grid. D2
keeps the **same island-in-a-void framing and the same buildable disc** (the grid
math is untouched — §9.3) but swaps every piece of that vocabulary for the
frontier-town one described in §3. The mapping, for the engineer re-skinning the
component:

| D1 (harbour island) | D2 (Boomtown Square) — build this instead |
| --- | --- |
| Teal lagoon ring (`buildSea`) | **Open dusty frontier plain** to a hazy horizon — the town is a settled square amid open country; a rutted **freight road** trails in from the distance (no open water) |
| Stepped green grass shore | **Stepped red-clay ground / a low earthen berm** — the town sits on a broad clay flat whose edges crumble to dust and scrub |
| Blossom + green tree copses | **Sparse high-plains scrub** — sagebrush clumps, a lone **cottonwood** by the well, the odd yucca; an occasional **tumbleweed** (motion-gated) |
| Shoreline boulder clusters | **The growth edge** — staked-but-empty **lots** (survey stakes + claim-rope), **stacked fresh lumber**, brick/stone piles, a parked **freight wagon**: the town is visibly still going up |
| Plank dock / harbour berth (the arrival) | **Main street into the square** — a rutted road with a painted **TOWN sign**, boardwalks + hitching rails: the "you just rode in" landmark |
| Landmark scenery | A **water tower on stilts**, a **church/bell steeple** or **windmill pump**, **telegraph poles** marching to the horizon (the town wiring itself to the world = growth) |
| Wheeling gulls (`Birds`) | **Circling hawks / buzzards** (reuse the `Birds` rig, re-skinned darker) + slow drifting **dust haze** |
| Green baked tile grid (`buildGrid`) | The **surveyor's town plat** — chalk/lime peg-and-rope **lot lines** on the clay (same cell pitch, ochre instead of green); the grid *is* the plat that growth keeps extending |

Everything in the terrain layer is **decorative** (the whole canvas is
`aria-hidden`) and must obey the **same keep-clear rule as D1**: all props ring
**outside** `BUILDABLE_RADIUS = 22` (D1 uses `innerR = BUILDABLE_RADIUS + 3`), the
buildable clay flat stays clean, and the **main-street approach lane** is kept clear
the way D1 keeps the harbour mouth clear. Build it once, memoized + seeded, like
`StarterIsland`; animate only the buzzards + dust + a tumbleweed on the frame loop,
motion-gated (freeze under reduced motion, exactly like the gulls).

---

# PART III — DESIGN RATIONALE (why the theme works; the skill mapping)

*This part is design reasoning, not a modelling instruction. It records why each
building is the shape it is and how the skill it hosts reads off its form. A
modeller does not need it to build the assets (that is Parts I–II); it is here so the
theming stays coherent and so whoever authors D2's lessons can see the intended
read.*

## 11. Growth is the spine

D2 is **Exponents & Radicals**, and *a town that keeps growing* is a far more direct
metaphor for **exponential growth** than a dig site — so growth is the island's
spine, not its wallpaper. The two mathematical motions read straight off a booming
town:

- **Exponents = growth by repeated multiplication** — *the boom itself.* The town
  doubles, compounds, stacks storey on storey. This is the island's centrepiece
  idea, carried most literally by the **Boom Hotel** (§2.1), and it should feel like
  the reason the place exists — not incidental flavour.
- **Radicals = how a growing town is supplied, sorted, translated, and policed.**
  Roots are the **inverse** motion: pulling the whole units out of a bulk quantity
  (the Kiln Yard), telling what combines from what does not and getting the mess out
  from underneath (the Railhouse), moving between two forms of the same value (the
  Telegraph Office), and knowing which inputs are simply not admitted (the Toll
  Gate). Exponents are the boom; roots are everything the town has to build to
  **handle** the boom.

  The root half is about **running the town**, not laying it out — which is why the
  four buildings are a kiln, a railhead, a wire office, and a gate rather than four
  surveying and stonecutting sheds.

The central **square** is the town's anchor: the hub — the **Land Office** — fronts
it, and the whole settlement booms *around* it. (The Land Office does **not** sit
mathematically dead-centre on the world origin — its footprint is **3×2** and seats
about half a cell off, per **D-TH6**; see §5 and §9.2. It anchors the square by
**presence and frontage**, not by exact centring. An earlier version of this brief
built a "an even 2×2 snaps dead-centre = the town square" argument here; under D-TH6
that geometry is false and has been dropped.)

## 12. How each skill reads in its building

### 12.1 EXP.1 — the Boom Hotel (exponent laws) — the island's spine

- **Skill (registry):** *"Apply exponent laws to evaluate and simplify expressions
  (incl. zero & negative exponents)"* — product/quotient/power rules, and the
  zero/negative cases. Prereq: `NUM.4` (a D1 gateway node). One of D2's two entry
  buildings, and the **centrepiece** of the growth theme.
- **Why this building:** the town's grand hotel on the square — the building most
  obviously **growing** as the boom compounds, adding an identical storey every time
  the town doubles. **Height, not ground area, is the "growth" lever.** The tower
  reads as **repeated multiplication made physical**: another identical storey =
  another factor.
- **How the skill reads:**
  1. **Stacked storeys = repeated multiplication.** Each identical storey the boom
     adds is another factor of the base; `b, b^2, b^3, ...` climb the tower.
     **Product rule** = butting two stacks of storeys together (add the exponents);
     **quotient rule** = tearing storeys back down (subtract).
  2. **Ground floor = 1; cellar = reciprocal.** The ground storey is the datum
     (`b^0 = 1`, "growth hasn't started"); the **cellar / below-grade** level is the
     **negative exponent** (`b^-n = 1/b^n`, growth reversed below the street).
  3. **Power of a power** = a wing framed as "floors of floors" (blocks of identical
     storeys repeated) — multiply the exponents.

### 12.2 RAD.1 — the Kiln Yard (evaluate & simplify roots)

- **Skill (registry):** *"Evaluate and simplify roots (product/quotient
  reasoning)."* Prereq: `NUM.4`. D2's **other** entry building (the root half of the
  island — what the town has to build to supply itself).
- **Why this building:** the yard where the town **bakes its own bricks** — the one
  place that turns a formless bulk of clay into **whole square units**, and sets
  aside whatever will not make one. The skill's inversion (a quantity in, a side
  out) is the yard's actual daily output, and the by-product of that output — the
  heap of broken and misfired brick — is the other half of the identity, standing
  right there next to the good stacks.
- **Why it reads at grid scale:** the mathematical read — **whole units out,
  remainder left behind** — hangs on a building type that owns a silhouette nothing
  else in town can borrow (three domes under a tall stack) and on a process that
  visibly *produces* the units rather than merely storing them.
- **How the skill reads:**
  1. **Simplify a root = pull the whole units out of the heap.** `sqrt(12) =
     sqrt(4*3) = 2*sqrt(3)`: what comes out of the pile as a **clean square unit**
     goes out front as the coefficient; what will not make one **stays under the
     root**. This is why the yard is authored as **sorted square pallets against a
     ragged rubble heap** — the two piles are the two sides of the identity, and they
     are the one thing in the building that must survive being shrunk.
  2. **Product rule = one firing split into two.** A kiln fires a **whole batch** —
     a rectangular array of bricks — in one go, so `sqrt(a*b) = sqrt(a)*sqrt(b)` is
     the ordinary act of reckoning a batch as so many by so many, and of running two
     smaller firings instead of one big one.
  3. **Quotient reasoning:** `sqrt(a/b) = sqrt(a)/sqrt(b)` — a firing drawn down into
     equal loads, each barrow taking the same share.
  4. **Evaluate a root = how many to a side.** "A square yard of paving this big
     needs how many bricks along its edge" is the yard's most literal question, and
     the sorted stacks (each itself a squared block) are the answer already built.

### 12.3 RAD.2 — the Railhouse (combine radical terms; rationalize)

- **Skill (registry):** *"Combine radical terms; clear radicals from
  denominators."* Prereq: `RAD.1`.
- **Why this building:** an engine yard is the town's **sorting machine**. Its whole
  trade is deciding what couples to what: like joins to like and becomes one train,
  and what does not match waits on a road of its own. It also happens to be the
  loudest possible statement that the boom is real — the day the line reached town —
  so the island's spine shows up in the building type itself.
- **Why it reads at grid scale:** the like-terms idea rides on **coupled rolling
  stock**, which is legible as a single object at any size rather than on a rack of
  small parts that dissolves when the building is shrunk. The turntable then adds a
  second read (below) that no other candidate for this node could carry. It is also
  the only curved plan in D2.
- **How the skill reads:**
  1. **Combine like radicals = couple the matched cars.** `2*sqrt(3) + 5*sqrt(3) =
     7*sqrt(3)` — same radicand, so they couple into **one rake**; `2*sqrt(3) +
     5*sqrt(2)` do **not** couple and stand on separate roads. The yard is authored
     to show exactly this: a **rake of identical cars coupled nose to tail**, and two
     or three **odd cars standing apart, uncoupled**. The sorting rule is legible
     before anyone reads a word of it.
  2. **The turntable is the step learners skip.** `sqrt(12) + sqrt(27)` looks like it
     will not combine until both are **turned to face the same way** —
     `2*sqrt(3) + 3*sqrt(3)` — and then it does. A turntable is precisely the machine
     for bringing something to a **common orientation before it can be joined**, and
     it sits at the centre of the building. No other option considered for this node
     had an object for that step.
  3. **Clear radicals from the denominator = drop the clinker out from underneath.**
     An engine is run over the **ash pit** and the rough is raked out from **under**
     it before it goes back on the road. Rationalizing is the same housekeeping:
     multiply top and bottom so nothing rough is left underneath, and the expression
     stands on a clean whole number. The conjugate trick is clearing a two-part
     bottom in one pass.

### 12.4 RAD.3 — the Telegraph Office (fractional-exponent ↔ radical form)

- **Skill (registry):** *"Convert between fractional-exponent and radical form."*
  Prereqs: `EXP.1`, `RAD.1` (it literally sits where the exponent half and the root
  half of the island meet — a nice placement read).
- **Why this building:** a telegraph office is a **conversion machine**, and it is
  the only building in a frontier town whose entire trade is **writing one thing in
  another script and back with nothing added and nothing lost.** The operator does
  the node's exercise all day: take a message in one notation, put it out in another,
  and be answerable for the two being the same message.
- **Why it reads at grid scale:** it is the island's **smallest** building, so its
  outline has to be broken by something other than the mass itself. Rather than
  hanging an arm off the block, it **puts a transparent lattice mast over the block
  and fans wires across the lot** — real reach without a single extra square of
  footprint — and the pairing idea sits on the twin notice boards at the door.
- **How the skill reads:**
  1. **Two scripts, one message.** `x^(1/2)` and `sqrt(x)` are the **same value
     written two ways**, exactly as a line of plain writing and its coded equivalent
     are the same message. The **two identically framed notice boards** by the door
     say it without a word: same day's traffic, posted twice.
  2. **The index is the denominator, the power is the numerator.** `x^(p/q)` = the
     `q`-th root of `x^p` — two numbers, one reading, which is what the **two-armed
     semaphore** on the gable is: one arm and the other arm are only meaningful
     together, and they resolve to a single signal.
  3. **Nothing is gained or lost in transmission.** The office's whole professional
     discipline is that what arrives is what was sent. That is the actual content of
     "these are equal" — a conversion is not an approximation — and it is why this
     node must not be skinned as a **weighing**, which is a process that can come out
     uneven.

### 12.5 RAD.4 — the Toll Gate (variable radicands, |x|, domain)

- **Skill (registry):** *"Simplify radicals with VARIABLE radicands (`sqrt(x^5) ->
  x^2*sqrt(x)`); `sqrt(x^2) = abs(x)` and why the absolute value is required; even
  roots of negatives are undefined over the reals."* Prereqs: `RAD.1`, `EXP.1`, and
  **`NUM.S`** — the last because NUM.S is the graph's only definition of `abs(x)` (as
  **distance from zero**). Added in the 2026-07-25 D2 QA pass; its **items are
  checker-gated** (variable radicands + `abs()` are outside the v2 checker), though
  its **lesson is not**.
- **Why this building:** a gate is the physical form of **"this input is not
  admitted."** It is the only building in town whose job is to **decide what may come
  through**, and — because a toll is reckoned by distance travelled, the same either
  way you are going — it also happens to be the only everyday object that measures a
  **magnitude regardless of direction.** Both of the node's hard ideas come off the
  building's actual function, not off a symbol painted on it.
- **Why it reads at grid scale:** both hard ideas are carried by **objects that do
  something** — a bar you can see is down, a gate you can see is nailed shut, and a
  milepost cut on two faces — rather than by a motif that has to be read off empty
  ground (a roped-off patch of clay is the least legible thing you can put on a lot).
- **How the skill reads:**
  1. **Even roots of negatives are undefined = the gate that is nailed shut.** The
     building deliberately carries **two** gates and they mean different things: the
     **main bar is down but liftable** (pay and pass — restricted, but allowed), and
     the **side gate is boarded across** (not opening for anyone — not admitted at
     all). That is exactly the distinction learners blur, between a value that is
     merely awkward and a value that is **outside the domain**, and here it is two
     objects standing side by side.
  2. **`sqrt(x^2) = abs(x)` = the toll is the same whichever way you are going.** The
     charge is by **distance from the gate**, and the **milepost is cut on two faces,
     one for each direction**, counting off positive both ways from a gate that reads
     zero. That is the `abs(x)` = "distance from zero" idea it inherits from its
     `NUM.S` prereq (D1's Town Hall elevator: `|floor|` = distance from the lobby),
     and here it rides on an object the gate actually uses to do its job.
  3. **Variable radicands = whole miles at the rate, the part-mile reckoned
     separately.** `sqrt(x^5) = x^2*sqrt(x)`: take out the **whole part** and charge
     the **remainder** under its own head — which is precisely how a rate board
     reckons a journey that does not come out even.

---

# BACK-MATTER

## 13. What is explicitly NOT in this doc

- **The advisor persona and any word-problem / lesson prose** — Anthony's lane
  (`engines/lesson`, `content/lessons/d2`, `packages/item-bank`). This doc only says
  the advisor **stands at the Land Office**; it writes none of its voice, and it asks
  for **no** change to the plain-language prose (§0, guardrail 1). *(⚠ Gabe,
  2026-07-27: **"Anthony's lane" is superseded** — the advisor persona and voice are
  **Evan's**, for every island (`docs/Content_Authoring_Split.md` §1.1). D2's
  advisor is proposed as **the Town Foreman** in
  `.cursor/skills/author/reference.md` §6, never implemented in content, and his to
  keep or replace. The *word-problem and lesson prose* half of this bullet still
  belongs to D2's lesson author. Everything else holds — this doc still writes none
  of the voice and still asks for no change to the plain-language prose, which any
  persona here is bound by: narrate the math plainly, do not narrate the town.)*
- **Anything that changes math, node identity, or prerequisite order** — the registry
  is frozen/Gabe's (`skill_graph.json`); this is skin-only
  (`Island_Lesson_Themes_Design_Spec.md` §1.4). The five nodes, their skills, and
  their prereqs are quoted as-is.
- **The engine wiring** — a `D2_NODE_BUILDINGS` map, D2 footprints, the model
  registry/glob, and the `StarterIsland` → "BoomtownIsland" terrain component are a
  **separate implementation task**; this doc is the asset/modelling brief that wiring
  will consume.
- **The item-bank answer types** that fix each building's accent-trim colour (§6)
  — those are read from the bank once D2 is authored.

## 14. Open questions (taste calls left for the team, not invented here)

*(The island's name is **not** an open question: it is **Boomtown Square**, settled
in §0. The list below is numbered from what remains.)*

1. **Hub model count — one or three.** This doc assumes the **in-flight** Town Hall
   redesign (pre-seeded, already built, **one** model). If the committed three-stage
   self-building hall (D-TH4) survives instead, the D2 hub needs
   `townhall-d2-{site,construction,built}.glb` (3 GLBs, total 18). Confirm which before
   authoring the hub. Also confirm the exact hub filename / registry
   (`TOWN_HALL_DESCRIPTORS`), which is not built yet.
2. ~~**RAD.4's building (the flagged placeholder).**~~ **CLOSED — 2026-07-26.**
   RAD.4's building is **The Toll Gate** (§2.5, §12.5), at **1×2**, long along Z. The
   decision was made by rendering three alternatives per node and choosing between
   them; the unchosen concepts are recorded in
   `2026-07-26-d2-building-concept-options.md`.

   **One thing this does *not* close.** `engines/game/src/descriptors.ts` still
   reserves only `"RAD.4": "generic"`; that is
   the **node→building engine hook**, and wiring it is the separate implementation
   task in §13, not part of this brief. RAD.4's items are still **checker-gated**, so
   whether its building ships in the first D2 art drop or a follow-up is a scheduling
   call, unchanged by this decision.
3. **Answer-type accents.** The §4/§6 accent colours are inferred from each skill and
   must be **confirmed against the item bank's authored `answer_type`** once D2 is
   authored (numeric→teal, MC→plum, CR→amber). If, say, EXP.1 or RAD.1 turns out
   **numeric**, its trim is teal, not amber — the silhouettes are unaffected.
4. **Hub skin — Land Office vs. an alternative.** This doc proposes the **Land Office**
   (a boomtown's first permanent building; the "record every deed" read fits interleaved
   practice). Alternatives worth a look: a **Claims Office** (nearly synonymous) or the
   town's first **Meeting House / Town Hall** proper. Pick one.
5. **Terrain palette + the "no decorative gold" rule.** Confirm the §10.1 clay/dust
   terrain hexes read well beside the Clay `#C9A15E` bodies in day/night/colorblind
   environments, and confirm the team is comfortable with a boomtown whose gold shows
   **only** on the mastery stars above mastered buildings (§0, guardrail 2).

## 15. References

- `docs/superpowers/specs/2026-07-26-d2-building-concept-options.md` — the twelve
  concepts (three per node) this pass chose from, with the pitch, the silhouette, the
  skill read, and the trade-off for each, plus the eight **unchosen** alternatives.
  That doc is the **record of what was considered and why**; this spec is the
  decision. Its §5 collision list is folded into §2 here.
- **Concept renders for the chosen four** —
  `output/imagegen/d2-boomtown-square/rad-1-kiln-yard.png`,
  `rad-2-railhouse.png`, `rad-3-telegraph-office.png`, `rad-4-toll-gate.png`
  (alongside the existing `exp-1-boom-hotel.png`, `d2-land-office.png`, and
  `d2-boomtown-square-island.png`). These are **concept art at presentation
  fidelity**, not target geometry — read them for shape, massing, and character; the
  shipped assets are low-poly flat-shaded GLBs in the Gridwork family (§9.5).
- `docs/superpowers/specs/Island_Lesson_Themes_Design_Spec.md` — §4 D2 row (theme +
  node hooks this doc deepens — now "Boomtown Square", Gabe's rename), §2 (D1 worked
  example — the depth matched here), §3 (reusable island template), §1.4 (skin-only
  guardrail), §1.5 (grounded→fantastical arc), §1.6 (pending narrative frame — not
  depended on).
- `docs/Game_Visual_Design_Brief.md` — §4.1 hue families (Clay `#C9A15E`) + reserved
  meaning colours, §4.2 three-tone face lighting, §4.3 silhouette-first archetypes.
- `docs/Node_Spine_v4.md` — D2 skill text (EXP.1, RAD.1–4).
- `packages/skill-graph/src/skill_graph.json` — D2 node ids, prereqs, RAD.4's note.
- `apps/web/src/city/buildingAssets.ts` — `nodeFilePrefix`, the 3-stage model pattern,
  `D1_NODE_BUILDINGS`.
- `apps/web/src/city/worldLayout.ts` — `NODE_FOOTPRINTS`, `GRID_CELL`,
  `footprintFitScale`, `FOOTPRINT_FILL`, `MAX_BUILD_HEIGHT`, `BUILDABLE_RADIUS`.
- `apps/web/src/city/worldLayout.test.ts` — the measured D1 native ground boxes cited
  in §9.5.
- `apps/web/src/city/three/StarterIsland.tsx` — the D1 terrain this doc re-skins.
- `apps/web/src/city/three/PlacedBuilding.tsx` — the per-stage contain-fit + height cap
  (§9.1).
- `docs/superpowers/specs/2026-07-25-town-hall-design.md` — the hub design (D-TH5/6, the
  three-stage grammar the in-flight redesign supersedes), Town Hall measured dims,
  triangle counts.
- `engines/game/src/descriptors.ts` — answer-type → archetype derivation; D2's
  `RAD.4: "generic"` placeholder.
- `docs/design-refs/BUILDING_ASSETS.md` — the Gridwork drop-in format / style family.



