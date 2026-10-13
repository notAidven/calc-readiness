# Era 02 — Neolithic building briefs

Image-generation briefs for the ten buildings era two owes: **five skill buildings**, **the
hub**, and **four civic buildings**. Written with the `era-building-briefs` project skill from
the era's own two documents, and from nothing else:

- `docs/superpowers/specs/eras/era-02-neolithic/style-guide.md`
- `docs/superpowers/specs/eras/era-02-neolithic/civic-buildings.md`
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §0, for the hard constraints
  every era inherits

**Era one's six buildings are not here and are not owed.** Since the 2026-07-29 re-dressing
ruling a skill building is drawn once and keeps that look for the whole run, so era one's six
stay Prehistoric and no later era re-dresses them. The only building that rethemes every era is
the hub.

> ## ⚑ `output/imagegen/era-02-neolithic-skill-buildings/` IS SUPERSEDED. This document replaces it
>
> **That folder predates the re-dressing ruling and its framing is dead.** Its README says it
> covers *"the eleven lesson buildings: the six earlier skill masses re-dressed for the Neolithic
> era and the five nodes introduced in Era 02"*, and **six of those eleven images are re-dresses
> that will never be built** — `num-s-granary-rotunda`, `num-f-raised-grain-store`,
> `num-2-dwellings`, `num-3-tablet-workshop`, `num-4-commons-threshing-floor` and
> `num-5-granary-tower`. Era one's six keep era one's looks permanently, so nothing re-dresses
> them.
>
> **Its five era-two images are superseded rather than wrong, and two of them are now wrong.**
> `rad-2-threshing-circle` no longer depicts what `RAD.2` is — that node has been re-authored as a
> **sheep pen** (`style-guide.md` §5) — and `num-4-commons-threshing-floor` is a re-dress of era
> one's yard that will not be built. The other four still show the right buildings and were
> generated before the plots were corrected and the names finalised.
>
> **Nothing in that folder is deleted, and this document does not point at it for reference.**
> The generated art is kept: it is genuine concept work and it cost real time. **This README is
> the authority for era two's ten buildings**, and an artist opening that folder should read this
> one instead. *(Judged 2026-07-29 rather than actioned there: the folder is untracked and
> user-owned, so the superseding statement is recorded here, in a tracked file, where it cannot be
> lost.)*

## The names below are FINAL

**These are the team lead's finalised era-two names**, and as of this document they are what the
era's two files say — the renames landed with this brief rather than after it. **Every slot is
now settled**; the last one, `tower`, was locked on 2026-07-29.

| Building | **Final name** | What it was |
| --- | --- | --- |
| EXP.1, `store` | **the Bee House** | the Seed House — **and the building changed with it, 2026-07-30** |
| RAD.1, `workshop` | **the Potter's Kiln** | unchanged |
| RAD.2, `yard` | **the Sheep Pen** | the Threshing Floor — **and the building changed with it** |
| RAD.3, `hall` | **the Meeting House** | the Harvest House |
| RAD.4, `tower` | **the Stone Tower** | the Grain Silo |
| hub, `town-hall` | **the Elders' Hearth** | the Shrine — **and the building changed with it, 2026-07-30** |

> ## ⚑ TWO BUILDINGS WERE WITHDRAWN BY EVAN ON 2026-07-30, AND THEIR BRIEFS BELOW ARE REWRITTEN
>
> **Do not draw `EXP.1` or the hub from a cached copy of this document.** Briefs **#1** and **#6**
> describe different buildings than they did this morning, and the two names moved *with* their
> buildings rather than as a naming pass. The superseded descriptions are quoted in the
> withdrawn-text appendix at the foot of this document and **nothing there is to be drawn from**.
>
> | | Was | **Is** | Evan's words |
> | --- | --- | --- | --- |
> | **#1 `EXP.1`** | the Seed House — a long boarded box on collared stone stumps, lifted clear of the ground | **the Bee House** — a long block of load-bearing brick standing on the ground, an uneven rank of moulded clay hive tubes through both long faces | *"its design did not feel realistic… replaced with another building that can be represented in this era and still have significance"* |
> | **#6 hub** | the Shrine — a domed clay oven on a raised earth platform under a long thatch canopy | **the Elders' Hearth** — a communal hearth room sunk a step into the earth, walled in brick under a flat roof the settlement stands on | *"i do not like the building description or the neolithic shrine. I would like a completely different building instead"* |
>
> **One thesis covers both, and it is checkable.** §2 authors five materials and the era's body is
> **straw-tempered sun-dried brick**. The withdrawn `EXP.1` was *"boarded closed on every side"* and
> the withdrawn hub carried *"no brick wall"* at all, by its own brief. **So the era's `store` and
> the era's landmark were the two buildings least made of what the era is made of** — which is
> exactly the objection Evan raised by eye, and `style-guide.md` §5a now carries the fabric census
> for all ten.
>
> **Three things did NOT change and must not be re-litigated from these briefs.** The **plots** are
> frozen (INV-ERA-1): `EXP.1` is 2×1 and the hub is 3×2. The **hub still re-themes every era on its
> own placement**, with the stable name **Civic Center** (D-TH7), so the mechanism is untouched and
> only the dressing moved. And the hub is still **a sheltered communal fire** — the nine-era chain
> is a *function*, not a form, which is why a ring of standing stones, a walled furnace court, a
> guildhall and a data hall are all links in it.
>
> **The art consequence, named and not actioned here:** `exp-1-site.glb`,
> `exp-1-construction.glb`, `exp-1-built.glb` and
> `apps/web/src/city/art/models/townhall/townhall-neolithic-built.glb` all depict withdrawn
> buildings and need re-authoring. **Four models, not three.** No basename moves — `EXP.1`'s derive
> from the node id and the hub's from the era — and the seeded exporter's pinned digests will move
> with the meshes.
>
> **Two delivered renders in THIS folder now depict withdrawn buildings, and they are being kept
> rather than deleted:** `exp-1-seed-house.png` and `townhall-neolithic-shrine.png`. **Neither is
> committed**, untracked art has been lost twice this week, and a render is genuine concept work that
> cost real time — the same reasoning the superseded-folder box at the head of this document applies
> to the folder it replaces. **They are superseded, not wrong to have made.** Whoever regenerates
> should write to new filenames rather than overwriting them.
>
> **The image-generation prompt set needs three changes before it is next run.**
> `era02-neolithic-concept-art.jsonl` holds **nine** prompts and **the hub is not one of
> them**, which was right while the hub was out of scope beyond the palette. Two of the three are
> obvious: **`exp-1-seed-house.png`'s prompt describes the withdrawn seed store** and must be
> rewritten from brief #1, and **the hub arguably belongs back in the set** now that its building is
> new work rather than a re-theme of delivered art. The third is smaller and easy to miss:
> **`civic-granary.png`'s
> constraint line reads *"distinguish from sealed Seed House: short plain stumps with no rat
> collars…"***, and that distinction no longer describes anything — The Granary is now the era's only
> lifted building. **Flagged here, not actioned; the prompt file is Evan's to run.**
>
> **⚑ THE PROMPT FILES NOW LIVE IN THIS FOLDER, 2026-07-31.** All three were in
> `tmp/imagegen/`, which is untracked scratch, and they are the only thing the art can be
> regenerated from — this document is tracked and the images beside it are not, so a lost disk
> would have left a brief describing art nobody could remake. They are committed here, beside
> the art each produced:
>
> | File | Prompts | What it produced |
> | --- | --- | --- |
> | `era02-neolithic-concept-art.jsonl` | 9 | **Eight of the shipped ten** — `rad-1` to `rad-4` and the four civics. Its ninth, `exp-1-seed-house.png`, is the withdrawn store |
> | `era02-neolithic-reauthor.jsonl` | 2 | **The other two shipped** — `exp-1-bee-house.png` and `townhall-neolithic-elders-hearth.png`, the two buildings Evan withdrew and replaced |
> | `era02-neolithic-shrine.jsonl` | 1 | `townhall-neolithic-shrine.png`, the withdrawn hub. Superseded by the reauthor file |
>
> **So two of the three changes flagged just above were actioned in a separate file rather than
> in `era02-neolithic-concept-art.jsonl`**, which still holds the withdrawn seed store's prompt
> and still carries the stale Granary constraint line. **Read the reauthor file as the current
> one for `EXP.1` and the hub, and this one as current for the other eight.**

**The hall taking "the Meeting House" is what freed that name from the hub, so the hub's rename
is a consequence of the hall's rather than a separate idea.** *(That lineage produced *the Shrine*
and it still binds the slot: the hall holds the era's only *-House* gathering name, which is why
**the Elders' Hearth** does not take a second one — see the rejected names in `style-guide.md`'s
subtitle row.)*

**✅ The `tower` name is LOCKED at "the Stone Tower", and the name is not a description of the
fabric.** The objection this brief raised — §2 permits undressed stone at footing level only, and
the building is authored **squat** rather than tall — is **overruled by the lock**, and the answer
to it is this: **the name refers to the stone footing and to the massiveness of the drum**, and
**the building is a mud-brick drum with stone only at its footing and is deliberately not tall.**
Brief #5's form below is unchanged and is what to model; **do not draw stone courses above the
footing and do not make it tall.** *(Only its must-not-resemble line moved, on 2026-07-30, because
the building it is measured against was re-authored.)* The lead's earlier replacement *"the Lookout"* remains **unusable at
any point in the run**: it is era one's `tower` dressing, shipped in
`apps/web/src/city/eraDressing.ts` and standing on the island permanently under the re-dressing
ruling.

**"the Sheep Pen" is no longer a mismatch.** It was flagged in the first version of this document
because the files described a threshing circle. The lead kept the name and **re-authored the
building**; brief #3 below is the pen, not the circle, and it is what the files now say.

The four civic names — **The Granary, The Village Houses, The Bread Oven, The Village Well** —
are unchanged.

**Nothing about the names is now outstanding.** What remains open at the foot of this document is
**three contradictions between the era's own documents**, plus **one question about `RAD.2`'s form
that is Evan's to settle** — none of which is a name waiting on anything.

## The theme brief

*Read once. Every building below inherits all of it, and none of them restates it.*

> **⚑ RE-SCHEMED 2026-07-30, and the ten briefs below are UNCHANGED and still what to model.**
> This paragraph opened on the brick and the repeated unit. **The era's signature move is now the
> WORKED LAND** — see the paragraph immediately below and `style-guide.md` §1 — and the brick is
> demoted from the era's signature to the era's **building language**: unchanged, still true, and
> no longer the headline. **No building moved, no name moved, no plot moved, and not one of the
> ten generated images is invalidated**, because the re-scheme is about the ground the buildings
> stand on. The general principle is **D-ERA32** (*the island carries the era; the buildings carry
> the lesson*).

Era two is **a settlement that has started to work the land** — small hand-broken plots in a
patchwork of freshly turned soil, standing cereal, stubble and fallow; boundaries made of the
stone that came out of the plot they divide; sheep behind hurdling; grain in pits, on drying
racks and in raised stores. **That is the era, and it is what a player should see at a glance**:
the Neolithic Revolution is agriculture, not masonry, and every building below stands in the
middle of it. **None of the briefs draws the land** — the buildings sit on the settlement's
swept ground and the fields are around them — but every one of them is a building *for* the
harvest, and knowing that is what keeps a store from being drawn as a shed.

**The building language, which is where the brick lives and it is unchanged.** Era two builds
in moulded brick and thatch, and **every wall is built out of the same repeated unit**. The
sun-dried mud brick is the first identical, repeatable component anybody on this island has
made — the field's habit of doing one thing a hundred times, carried indoors — so ornament stops
being era one's cut notch and becomes **the course**: regular horizontal banding, a projecting
band under an eave, a herringbone panel filling a gable, a row of headers turned to throw a
shadow line, and nothing decorative that is not also a way of building. **Five materials and no
more:** sun-dried mud brick **tempered with chopped straw** as the body, matte and dry and dusty,
faintly banded by its own courses, with square corners for the first time in the run but faces
still slightly uneven in plan and **short pale straw flecks visible in the face at close range**;
fired clay in small quantities only — tablets, vessels, oven and kiln linings, a trough, a finial at
a ridge end, a plaque above a door — much darker and redder for having been through a fire, **and
this era's accent**, but never a whole wall; **woven undyed cloth**, new to this era and the fifth
material, for a slung shade over a working floor, a hanging over a doorway and a panel lashed across
an opening, reading as a regular weave at mid-zoom and the one material here with no straight edge;
wattle and daub for **upper gables, screens and penning only and never a wall plane at ground
level**, with the woven stick armature showing where the daub has fallen away; and thatch and reed
read as **direction rather than detail**, ridges heavier and better combed than era one's and
**weathered grey-brown rather than fresh straw**. Undressed stone carries over rather than counting
as one of this era's own, and stays at **footing level only**. Buildings now **stand up by being
walls**: load-bearing mass with era one's batter much reduced, plans that close into rectangles
and true circular drums, openings small and few under timber lintels, **nothing spanning a wide
gap**, thatch ridges over the rectangles, low clay-over-reed domes over the drums, flat mud
roofs on close-set beams over the dwelling cells, and a store's floor lifted clear of the soil
on stone stumps. **One body hue for the whole era — straw-tempered sun-dried brick `#D9C288`** —
a pale, dusty straw-buff rather than a fired red, with **fired clay `#A2503A`** as the accent on
the oven mouth, kiln lining, trough, ridge finial and door plaque, sitting on the calm parchment
ground `#ECE4D3` rather than competing with it; buildings share the body hue and differ by
**silhouette**, never by a second body
colour. **Absent on purpose, because each is a later era's signature move:** metal of any kind,
lime mortar, the true arch, dressed ashlar, fired roof tile, glass. Fire is **enclosed** here
for the first time — an oven and a kiln with mouths and flues, where era one had an open ring
of stones — and the wheel arrives as **rotation only**: the potter's wheel and the turning
quern, never a cart.

> ## ⚑ THE PALETTE AND THE MATERIAL LIST CHANGED 2026-07-30, and the theme brief above carries the new ones
>
> **Status: PROPOSED for Evan, not decided.** Evan has seen this era's delivered art and asked for the
> buildings to be redesigned onto a different palette: *"i want to redesign the era 2 buildings, they
> currently look too similar to era 1."* **Do not draw from a cached copy of the paragraph above** —
> two of its sentences moved.
>
> | | Was | **Is** |
> | --- | --- | --- |
> | Body hue | mud brick `#B4714F` | **sun-dried straw-tempered brick `#D9C288`** |
> | Accent | reed thatch `#C2AE83` | **fired clay `#A2503A`** |
> | Materials | Four | **Five** — woven undyed cloth is new, daub is out of the wall plane, thatch loses the awning |
>
> **The measurement behind it.** Era one → era two was **the smallest adjacent body-hue step in the
> entire ten-era run, ΔE 10.1 in CIELAB**; the proposal measures **ΔE 25.24 from era one** and **23.72
> from era three**, and the full recomputed ladder is in `style-guide.md`'s palette section. **The
> deeper cause was the material list, not the hue:** three of the four materials this era authored
> were era one's, in era one's own words — daub *"kept on deliberately"*, thatch *"unchanged"*,
> undressed stone *"carried over"* — so only one was new, and that one was held to a hue named for a
> different material.
>
> **Two supporting values you will need and that are not palette rows.** Weathered thatch `#9A8C6E`,
> because the old accent `#C2AE83` measures **ΔE 10.44 from the new body** and a fresh-straw roof over
> a straw-tempered wall would be as close to it as era two currently is to era one. Undyed woven cloth
> `#C9BFA8`, because a near-white cloth at `#E8E2D2` measures **ΔE 1.23 from the parchment ground** and
> would vanish into it.
>
> **`style-guide.md` §5a carries the per-building direction**, aimed at the measured failures rather
> than at restyling everything, and names the four open questions it deliberately leaves to Evan.

### Constraints that bind every image below

- **Three tone steps per surface under one key light** — top face lightened, the hue on the
  left, the right darkened. **No runtime lights**: no cast shadow, no ambient occlusion, no
  specular highlight, no rim light, no gradient. Never describe a building by light falling on
  it.
- **Emitted light is an emissive surface inside that model, never a light added to the scene.**
  The kiln mouth and the oven mouth are bright in themselves and light nothing around them. No
  warm pool on the ground, no glow on a post.
- **Footprints are frozen** (INV-ERA-1). Design to the plot named in each brief; never change
  which cells a building occupies.
- **Height is a ranking, never a world-unit target.** A model is contain-fit to its plot by one
  uniform scale, so the more slender of two neighbours is simply the taller one, and a smaller
  plot shrinks a model whole rather than making it look tall. **Slenderness is a property of the
  model, not of the plot.**
- **Every building is modelled at its finished (`built`) stage.** Not the site stage, not
  construction, and not a mastery variant — mastery rides above a building as stars.
- **Mastery gold `#FFB703` is reserved.** It may never be a material and a body is never gold.
- **Every side must read.** The camera orbits a full 360°, so there is no front and no hidden
  back.
- **No rebuses.** A skill building is ordinary architecture that happens to house a lesson and
  never symbolises it. **This bites hardest on the Bee House (#1)**, because that building's
  identity is a rank of repeated openings and a rank is countable: nothing about it may **count**.
  **The rank is uneven and never a grid** — five over four, two of them stopped — and it is never
  two, four or eight of anything. No pair of anything, no rows in powers, no baskets stacked in
  twos, no tally cut into the brick.

## The ten buildings

| # | Building | Class | Node / role | Plot |
| --- | --- | --- | --- | --- |
| 1 | the Bee House | skill | EXP.1, `store` | 2×1 |
| 2 | the Potter's Kiln | skill | RAD.1, `workshop` | 2×2 |
| 3 | the Sheep Pen | skill | RAD.2, `yard` | 2×2 |
| 4 | the Meeting House | skill | RAD.3, `hall` | 2×2 |
| 5 | the Stone Tower | skill | RAD.4, `tower` | 2×2 |
| 6 | the Elders' Hearth | hub | `town-hall` | 3×2 |
| 7 | The Granary | civic | food | 2×1 |
| 8 | The Village Houses | civic | livability | 2×2 |
| 9 | The Bread Oven | civic | happiness | 2×2 |
| 10 | The Village Well | civic | blend | 1×1 |

---

## What the 2026-07-30 redesign owes, per building

**PROPOSED for Evan, not decided.** `docs/superpowers/specs/eras/era-02-neolithic/style-guide.md` §5a
owns this direction in full and this table is the artist-facing summary of it, per rule 9 below:
carry the style guide, do not duplicate it. **The palette applies to all ten. Everything else here is
narrow on purpose** — the aim is the places the measurement says the era under-delivers its own
thesis, not a restyle.

**The measurement, cited from the measuring pass rather than re-measured here.** *Squareness* is the
share of a delivered model's wall area facing a cardinal direction, with distinct azimuth clusters
beside it. Era one's six average **52.3%**; era two's five average **68.6%**.

| # | Building | Measured | What the redesign owes | What must NOT change |
| --- | --- | --- | --- | --- |
| 1 | **the Bee House** *(re-authored 2026-07-30)* | **95.5%**, 4 clusters — **measured on the WITHDRAWN model**, so this is the figure the new one has to win back rather than a property of the city | **The whole building** — brief #1. In this table's terms: the course on **all four faces**, which the withdrawn boarded shed could not carry, and a body that is brick rather than boarding | **The prism** and **the sealed read**, which are the two things worth keeping from the withdrawn design. **The lift and the collars are gone on purpose** — they are what made it the Granary's twin and what forced the boarding |
| 2 | the Potter's Kiln | 79.5%, **two of era one's lashings** | **The course, on its one low brick screen wall.** It is also the era's best pairing of its two new materials — fired-clay kiln lining against a pale straw-buff wall | **Do not square it.** It is authored *"mostly roof and air rather than wall"*; squaring it makes it the small house brief #2 warns against |
| 3 | **the Sheep Pen** | **37.7%**, 38 clusters, **zero mud brick** | **The one low brick windward wall the brief already specifies, actually delivered, carrying one course.** The design is not what is wrong here | **Nothing rises**, and **the lashings stay** — §4 keeps lashing and pegs as this era's joints. What must change is that a lashing is currently the only constructed thing on the plot |
| 4 | the Meeting House | **85.3%** | **Nothing.** It is the era's reference building for both squareness and the course | Everything. Check the others against it |
| 5 | **the Stone Tower** | **44.8%**, 24 clusters — **and the era's best course reading, 11 courses** | **Nothing.** Under the new palette eleven pale courses wrapping a drum is the era's single strongest read | **Do not square the drum.** §3 authors *"rectangles with square corners **and true circular drums**"*, so 44.8% is the drum being a drum. **And the exterior climb stays open** — see the flag at the foot of this document |
| 6 | **the Elders' Hearth** (hub) *(re-authored 2026-07-30)* | — *(never measured; the delivered hub GLB is the withdrawn building)* | **The whole building** — brief #6. The palette-only entry this row used to carry is superseded: it proposed separating the canopy from the dome *"for the first time"*, which conceded that the landmark and the civic Bread Oven had not been separated at all | **The mechanism**: 3×2, re-themes every era, stable name Civic Center, and a sheltered communal fire. **Not the dome, the canopy or the platform** |
| 7 | The Granary | 72.4% | One course under the thatched cap | **The lift.** It is now the era's ONLY building standing clear of the ground on stumps, and that uniqueness is what separates it — see brief #7 |
| 8 | The Village Houses | **95.6%** — the era's best | **Nothing** | Everything |
| 9 | The Bread Oven | A dome: **no near-horizontal wall faces at all** | Its course, on the bench wall only. Under the new palette it becomes **the largest single patch of the era's accent hue in the whole city** | **Do not square the dome.** It is authored as dominant and subordinating its plot |
| 10 | **The Village Well** | **36.2%, no brick, no course** — **less square than three of era one's four** | **One course of straw-tempered brick as a collar above the stone parapet.** It is the one building in the era carrying no era-two material at all, which is why it reads as era one's — and why it is the closest pair in the previous-era column | The windlass frame, which is the whole of its silhouette |

**Squareness and the course are separable axes, and the Stone Tower is the proof:** least square of
the five skill buildings, and the strongest course reading in the era. **So a low squareness figure is
not automatically a failure**, and demanding both axes everywhere would force a redesign of the drum
and the dome — two buildings that are already doing the job they were authored for.

---

## The previous-era column

*Read once, alongside the theme brief. Every building above has a row here whether or not its own
"What it must not resemble" block mentions era one, and this section is where era one is handled.*

**Every era-one building is standing on the island while era two is current.** Under the 2026-07-29
re-dressing ruling era one's six skill buildings keep their era-one looks permanently, and under
D-ERA11 its four civic buildings are frozen where they were bought and are never removed. So none
of the comparisons below is hypothetical: each is two models a player can see at the same time.
**Eight of the ten filled pairs sit on plots of identical size, and seven of those eight stand
simultaneously** — the `town-hall` pair shares a plot but never stands together, which is why it is
an exception rather than a row.

**This column is keyed by ROLE, not by resemblance.** The rows are enumerated from authored data
before anything is written into them — the seven mass ids in `NODE_FOOTPRINTS`
(`apps/web/src/city/worldLayout.ts`), and the four members of `CIVIC_ROLES`
(`packages/economy/src/civicCatalogue.ts`). That is the whole point of the format: a form-keyed
check finds whatever a careful reader notices, and cannot report what it failed to notice. A
role-keyed one has a fixed row count, so an unfilled row is visible as an unfilled row.

*The four civic rows are keyed by `CivicRole` — `food`, `dwelling`, `amenity`, `blend`. The roster
table above labels two of them by the capacity they provide instead (`livability` for The Village
Houses, `happiness` for The Bread Oven); the buildings are the same and the role key is what
`civicCatalogue.ts` authors.*

**Two rows are declared exceptions and are listed as such below rather than left out.** A row that
stops qualifying, and a row that starts qualifying without leaving the list, are both defects.

| Role key | Era one (standing) | Era two | Same plot? | The axis |
| --- | --- | --- | --- | --- |
| `hall` (mass) | the Roundhouse — `NUM.S`, 2×2 | the Meeting House — `RAD.3`, 2×2 | **Yes**, 2×2 | Plan: circle against rectangle |
| `store` (mass) | the Hide Shed — `NUM.F`, 2×1 | the Bee House — `EXP.1`, 2×1 | **Yes**, 2×1 | Ridge against parapet, and whether there is an opening at all |
| `workshop` (mass) | the Tool Shelter — `NUM.3`, 1×1 | the Potter's Kiln — `RAD.1`, 2×2 | No — 1 cell against 4 | Scale first, then fire |
| `yard` (mass) | the Clearing — `NUM.4`, 1×2 | the Sheep Pen — `RAD.2`, 2×2 | No — 2 cells against 4 | Fire against none. **Pending — see row 4** |
| `tower` (mass) | the Lookout — `NUM.5`, 2×2 | the Stone Tower — `RAD.4`, 2×2 | **Yes**, 2×2 | Frame against mass |
| `dwelling` (mass) | the Hut Cluster — `NUM.2`, 2×2 | **— none —** | n/a | **Asymmetry. See row 6** |
| `town-hall` (mass) | the Stone Circle — 3×2 | the Elders' Hearth — 3×2 | Same plot, **never simultaneous** | **Exception. See row 7** |
| `food` (civic) | The Smokehouse — 2×1 | The Granary — 2×1 | **Yes**, 2×1 | Frame against box, fire against none |
| `dwelling` (civic) | The Family Lodge — 2×2 | The Village Houses — 2×2 | **Yes**, 2×2 | One roof against several, pitched against flat |
| `amenity` (civic) | The Campfire — 2×2 | The Bread Oven — 2×2 | **Yes**, 2×2 | Whether the fire has a building over it |
| `blend` (civic) | The Spring — 1×1 | The Village Well — 1×1 | **Yes**, 1×1 | Whether you can see the water |

**Body hue is not an axis anywhere in this column.** Era one's terracotta `#C98A5E` and era two's
mud brick `#B4714F` were both warm earth, and each era shares one body hue across all its own
buildings by rule (`City_Art_Bible.md` §1.2). Two buildings from adjacent eras will not separate on
colour, so every row below separates on shape, support, corner or props.

> **⚠ THE REPLACEMENT HUE HAS NOW BEEN PROPOSED, 2026-07-30, and the exclusion above is CONDITIONAL
> rather than settled.** The note this box replaced said the hue clause was under review for this
> pair only, that era two's palette was still undecided, and that *"the replacement hue has not been
> chosen."* **It has now been proposed.** `style-guide.md`'s palette section proposes body
> **`#D9C288`**, a pale straw-buff, and it measures **ΔE 25.24 from era one's terracotta** against the
> **10.1** the shipped value measured — so if Evan accepts it, **hue becomes a legitimate axis for
> every era-one-to-era-two row in this column**, and by some distance: 25.2 is larger than eight of
> the ten pairs' current second tells are worth at zoom-out.
>
> **It is still `PROPOSED for Evan, not decided`, so nothing below is rewritten on the strength of
> it.** Every row's stated axis is a shape, support, corner or props axis and **every one of them
> holds with or without the palette change** — which is the right property for a column to have while
> a palette is in flight, and is why they were written that way. **If the palette lands, hue is an
> additional axis and not a replacement for any of them:** it separates two buildings at any zoom but
> says nothing about which building is which, and a colour is the first thing an art pass can undo.
>
> **Row 11 is the one this would help most** — The Village Well against era one's The Spring, *"the
> closest pair in this column by some distance"*, where both are undressed stone and timber round
> water. **It would still not be enough on its own**, because the Well as authored carries **no
> era-two material at all** and so would not take the era's body hue anywhere on it. `style-guide.md`
> §5a proposes a brick collar for exactly that reason, and until something on that building is brick,
> hue cannot separate this pair however far the two eras' bodies move apart.

---

### Row 1 — `hall` (mass) — the Meeting House must not resemble **the Roundhouse** (`NUM.S`, 2×2)

Same mass, same 2×2 plot, adjacent. **A cone against a ridge, and a closed volume against one you
see through.** Era one's is a single wide conical thatch roof on a ring of battered earth wall, with
one broad opening and a smoke hole at the apex — you look *at* it. Era two's is one long shallow
thatch ridge over a mud-brick box **open at both gable ends**, so at any azimuth you can see daylight
straight through it along its axis. The second tell is the wall: battered earth with softened corners
against square-cornered brick carrying a projecting course under the eaves for the full length.

*Already stated in `style-guide.md` §5 ("the hall it actually stands beside is era one's
Roundhouse"). Transcribed here, not re-derived.*

### Row 2 — `store` (mass) — the Bee House must not resemble **the Hide Shed** (`NUM.F`, 2×1)

Same mass, same 2×1 plot, and both are long low boxes on the ground. **A ridge against a parapet,
and an open bay against no opening at all.** Era one's is a **ridged** shed of lashed timber and
thatch on stone footings, with an **open gable end and hides rolled up in it**, racks visible inside.
Era two's is a **flat-topped mass of load-bearing brick behind a brick parapet** with **no opening
wider than a hand** — one narrow door, and a rank of hive mouths a bee can use and a person cannot.
**The roof line is what carries it at zoom-out**, and it is a silhouette difference rather than a
props one. The second tell is fabric, and it is why this building was re-authored: era one's `store`
is timber and thatch, and era two's is brick on all four faces carrying the era's course. **Neither
may borrow the other's half:** no open bay and no gable ridge on the Bee House, no brick and no
parapet on the Hide Shed.

> **REWRITTEN 2026-07-30, and the reason is worth a line, because this row's axis used to be its
> strongest asset.** It read *"Daylight under the floor and none through the walls, against exactly
> the inverse"* — era two's store was **lifted on collared stone stumps** and era one's sits on the
> ground. That axis was clean, and **it was also what made era two's `store` a duplicate of the
> civic Granary and what forced it to be built of boarded timber**, since brick cannot stand on
> stumps. The lift bought this row a free separation and cost the era both a building and its
> fabric. **The replacement axis is a roof line rather than a support, which survives zoom-out just
> as well and does not spend anything to get it.**

*`style-guide.md` §5's `store` entry states the same pair on the same axis. Transcribed.*

### Row 3 — `workshop` (mass) — the Potter's Kiln must not resemble **the Tool Shelter** (`NUM.3`, 1×1)

**Scale carries this before anything else does:** one tile of open frame over a working floor,
against a four-cell production yard with banks of drying shelves, green pots stacked in rows, a
temper heap, a puddling pit and a plume. **The second tell is fire** — `RAD.1` has an enclosed kiln
mouth as an emissive surface and era one's shelter has no fire at all. **The third is additive to §5
and is the era's own signature:** era two's carries **one low mud-brick screen wall on the windward
side with a projecting course on it**, and era one's has no wall anywhere, only posts and a lean-to.

*Scale and fire are in `style-guide.md` §5. The brick screen wall as a third tell is new here.*

### Row 4 — `yard` (mass) — the Sheep Pen must not resemble **the Clearing** (`NUM.4`, 1×2)

> **⚠ THIS ROW IS PENDING EVAN'S RULING, and it is written to hold either way.** The documents of
> record author `RAD.2` as a **sheep pen** — `style-guide.md`'s roster and §5 both do, and brief #3
> above opens *"RE-AUTHORED 2026-07-29. This brief used to describe a threshing circle."* **The
> delivered model has since been measured as a threshing circle carrying no mud brick at all**, so
> the ruling of record and the art disagree about which building this is. **That is Evan's to settle
> and is not settled here.** The instruction below therefore rests only on what is true of both
> forms, and the two tells that depend on which one wins are named as such rather than asserted.

**What holds under either form.** Both are ground rather than architecture, and **that through-line
is deliberate and must survive** — neither plot rises, and era two's is the lowest thing in all ten
eras. Do not manufacture height to separate them. **They separate on fire, and on whether the ground
carries a deliberate worked figure.** Era one's is swept earth open on every side with **a hearth
ring of undressed stone at its centre**, a drying rack, boulders and one tree left standing. Era
two's has **no fire anywhere on it** under either reading, and its ground carries a worked figure era
one's does not. §5 states the era-one half at this tip: *"era one's Clearing … is unbounded swept
earth with a hearth ring and one tree — the opposite of a continuous fence."*

**What depends on the ruling, and must not be leaned on until it lands.** Under the pen, the figure
is **a continuous run of hurdling that IS the building**, reading in plan as a rectangle with a
smaller rectangle notched into one corner for the catching pen, the earth hoof-churned dark at the
race. Under the circle, the figure is **a hard flat floor for beating grain off the stalk**. Both are
a deliberate figure against era one's unbounded sweep, which is why the axis survives the
disagreement. **Do not make the row rest on the low mud-brick windward wall** brief #3 gives the pen:
it is the one tell the delivered model does not carry, and it is the first thing to go if the circle
is reinstated.

*The era-one half is already stated in `style-guide.md` §5. Transcribed. The pending status is new
here.*

### Row 5 — `tower` (mass) — the Stone Tower must not resemble **the Lookout** (`NUM.5`, 2×2)

Same mass, same 2×2 plot, and this is the pair where era two's own documents disagree — see the flag
below. **The axis is solid mass against open frame**: an open lashed timber frame you can see
daylight through, standing on a stone footing with a small thatch platform at the top, against a
solid coursed mud-brick drum you cannot see through, capped by a low clay-over-reed dome. **Squat
against slender** is the second read, and the contain-fit preserves it at any zoom because it is a
property of the model's proportions.

> **⚠ OPEN CONTRADICTION, re-checked at this tip and NOT resolved here.** It belongs with the era's
> two existing open contradictions at the foot of this document rather than being settled in a
> comparison column. **It is also wider than it first looked: the disagreement is inside
> `style-guide.md` as well as between the two files.**
>
> Three statements say there is nothing on the outside: brief #5 above — **"nothing on the outside to
> climb"** — and `style-guide.md`'s roster, **"one high opening and no ladder on the outside"**, and
> its §5 squat/slender split, **"with nothing on the outside to climb"**.
>
> Two say the opposite: `style-guide.md` §5's chain flag, **"RESOLVED 2026-07-29 as proposed: keep
> the ladder and the head platform expressed on the outside of the drum"**, and the same guide's
> closure block, **"take the proposal — ladder and head platform on the OUTSIDE of the drum."**
>
> A ladder and a head platform on the outside are precisely the Lookout's two identifying features,
> so under the chain flag's reading this row's axis is materially weakened, and under the brief's it
> is intact. **The two can be reconciled** — the heaped earth ramp up the back is a climb expressed
> on the outside and visible from every azimuth, and may be what the resolution means — **but no file
> says so, and whoever models this needs one answer.** Until it is settled, hold the row this way:
> **whatever expresses the climb must read as attached to a solid mass and never as the structure
> itself.** No daylight between the drum and anything on it beyond the gaps between treads. That
> instruction is safe under either reading.

### Row 6 — `dwelling` (mass) — **ASYMMETRY: era two has no building on this mass**

Era one holds it with the Hut Cluster (`NUM.2`, 2×2). Era two's node set is `EXP.1` + `RAD.1–4`,
which takes `store`, `workshop`, `yard`, `hall` and `tower` and leaves `dwelling` vacant;
`style-guide.md` §5's "mud-brick houses round a yard" paragraph is **reference only and is never
built**. So there is no era-two skill building here.

**This row is not empty, because the confusion it exists to prevent is real and lands on a civic
building instead.** The Hut Cluster is 2×2 and is *several small dwellings round one shared yard*.
The nearest era-two object is **The Village Houses — the civic `dwelling`, also 2×2, also cells round
a shared court.** That pair is sharper than the role-correct civic pair in row 9, and it is the row a
column keyed only to masses would never produce, because the two buildings sit in different
namespaces.

**So: The Village Houses must not resemble the Hut Cluster.** Era one's is **domed huts of unequal
size that do not touch**, scattered round a packed-earth yard, with a hearth and drying hides. Era
two's is **four or five flat-roofed cells of equal build sharing party walls**, the roofs used as
floors, the court a gap cut into a continuous mass. Domed against flat, separate against touching,
and **hide is a material era two does not have at all** — no hide anywhere near the Village Houses.

**The dwelling-shaped building has moved from the earned namespace into the bought one between era
one and era two.** That is the finding, and it is worth recording as a design fact rather than a gap:
era three should check whether its own `dwelling` mass is filled before assuming this row stays
vacant.

### Row 7 — `town-hall` (mass) — **DECLARED EXCEPTION: no must-not-resemble line is owed**

The hub is the only building that re-themes every era. Era one's Stone Circle does not stand while
era two is current; it *becomes* the Elders' Hearth, on the same 3×2 plot, as the same placement.
There is no simultaneous pair, so there is nothing to tell apart. **The 2026-07-30 re-author does not
disturb that** — the hub is still a separate building on its own plot that re-themes at every
advance, so this row is still an exception and for the same reason.

**The property this row owes is the inverse, and it is the one the column must not fight.** The
through-line is *a sheltered communal fire*, running unbroken from era one's **ring of standing
stones open to the sky over a great hearth** to era two's **communal hearth room walled in brick
under a roof the settlement stands on**, and on through a walled furnace court, a colonnaded public
hearth, a guildhall, an engine house and a data hall. **The hub must remain recognisable as the same
civic centre.** Wide rather than tall, a roof over a fire, authority from width and never from height.

**The chain is a function and not a form, which is what makes the era-two link legible as an
advance:** era one's fire is *under the open sky inside a ring*, era two's is *indoors for the first
time in the run*, with walls all round it and one square hole in the roof for the smoke. Nothing in
the chain asks the fire to stay in the same kind of building — the links either side of era two are a
ring of stones and a walled furnace court — and this row's job is only to check that it is still a
communal fire with something over it. **It is.**

*The existing height note in brief #6 — "a shade more substantial than era one's Stone Circle" — is
correct and stays. It is a memory comparison against a building that no longer stands, which is
exactly right for a re-dress and is not a confusion check.*

### Row 8 — `food` (civic) — The Granary must not resemble **The Smokehouse** (2×1)

Same role, same 2×1 plot, both the era's food building, both standing. **A frame on the ground
against a box in the air, and fire against none.** Era one's is **lashed timber A-frames over a low
fire trench**, hung with strips of meat and fish, a hide windbreak on the exposed side, a woodpile,
and smoke sitting in the frames — nothing you could call a wall, and it reads triangular. Era two's
is a **mud-brick box with a thatched cap, lifted clear of the soil on stone stumps**, with a notched
ladder leaning at one end, reading full with baskets under the eaves and grain spilling at the
threshold. **No fire anywhere near The Granary**, and no lift on The Smokehouse.

*Additive. Nothing in either era's documents compares these two.*

### Row 9 — `dwelling` (civic) — The Village Houses must not resemble **The Family Lodge** (2×2)

Same role, same 2×2 plot. **One roof against several, and pitched against flat.** Era one's is
deliberately **ONE large rectangular communal building**: a single long thatched roof with a shallow
ridge on the long axis, carried on battered earth walls with low eaves nearly touching the ground.
Era two's is **four or five flat-roofed cells sharing party walls**, roof terraces reached by
ladders, a shared doorway court.

**Two second tells, and both are checkable.** **The ridge smoke:** era one's dwelling has to read its
own fire from outside — smoke at the ridge, firelight in the doorway — and era two's roofs carry
drying grain, a mat and a ladder and no smoke at all, because they are the first usable roof surface
in the run. **The corner:** battered earth with softened corners and eaves down near the ground,
against square corners with a projecting course under the roof line on the outward faces.

*Supersedes the one-clause comparison in brief #8 and in `civic-buildings.md` §2 — see the note under
the exception list.*

### Row 10 — `amenity` (civic) — The Bread Oven must not resemble **The Campfire** (2×2)

Same role, same 2×2 plot, and both are a fire on worked open ground inside a low ring of set
material. **This is the sharpest untreated pair in the era after row 11.** They separate on **whether
the fire has a building over it.** Era one's is mostly ground rather than building: a wide ring of
undressed stone with the fire open to the sky at its centre, seating logs and hide mats round it, the
earth worn smooth and pale, and the tallest thing on the plot is a log. Era two's fire is **inside a
built dome of fired clay that dominates its plot and reads as a mass from outside** — the only fire
you can see is the mouth, as an emissive surface. A fire you look down at, against a fire you look at
the outside of.

**Second tell, ring against bench:** era one's boundary is **undressed stone set upright**, era two's
is **a low mud-brick bench wall** carrying the era's course. Era two must keep its bench clearly built
and clearly brick.

*Additive.*

### Row 11 — `blend` (civic) — The Village Well must not resemble **The Spring** (1×1)

Same role, same 1×1 plot — the smallest in both eras — and **the closest pair in this column by some
distance.** Both are undressed stone round water with timber uprights standing over it and a trough
beside. Everything a modeller would reach for to build one, the other already has.

**They separate on whether you can see the water, and on where it goes.** Era one's rises **in a
shallow rock hollow at ground level**, visible, kerbed with undressed stone to hold it clear, a lip
worn smooth where the vessels rest, and **an overflow channel cut away downhill**. Era two's is
**invisible, down a lined shaft**, and comes up on a rope; there is no channel and no standing water.

**Second tell, what the timber carries.** Era one's poles carry **a hide awning — a roof, and hide is
not one of era two's materials at all.** Era two's uprights carry **a turning wooden axle and no roof at
all**, and the open frame above the parapet is the whole of its silhouette.

**Third, what the stone is doing.** Era one's is a kerb following a natural hollow — found water, not
dug, which is the thing era one must stay on the right side of. Era two's is a deliberate ring
parapet of set stone around a shaft that was sunk.

*Additive, and named nowhere in either era's documents.*

---

### The exception list, and what would make it wrong

**This list is prose in a design document, not a test.** Nothing runs it, so it cannot fail on its
own. What follows is the condition under which each entry stops being true, written down so a reader
can check it by hand — and so that whoever later wires this format to a guard knows what the guard
would have to assert.

| # | Exempt row | Why it is exempt | What would make the exemption wrong |
| --- | --- | --- | --- |
| 1 | `town-hall` (mass) | The hub re-themes, so era one's Stone Circle and era two's Elders' Hearth never stand at the same time and there is no pair to tell apart | **It stops qualifying** if the hub ever stops re-theming, or if a later era puts a second, simultaneously standing building on the `town-hall` mass. Either way the row is owed a real must-not-resemble line |
| 2 | `dwelling` (mass) | Era two has no node on this mass — `EXP.1` + `RAD.1–4` take `store`, `workshop`, `yard`, `hall` and `tower` — so there is no era-two building to compare | **It stops qualifying** the moment `NODE_FOOTPRINTS` gains an era-two `dwelling` node. A vacancy that gets filled may not sit in this list forever excusing nothing |

**And the list must fail the other way too.** If a listed row **adopts the property without leaving
the list** — if `town-hall` or `dwelling` (mass) acquires a genuine must-not-resemble line against a
simultaneously standing era-one building while still sitting in this table — the entry has stopped
describing what it excuses and must be removed. An exemption that outlives its reason is how a
missing row ships looking like a decision.

**The two entries are disjoint from the nine filled rows above**, and the count is the check: eleven
role keys, nine filled rows, two exemptions. If that ever fails to add up, a row has been dropped
rather than exempted.

---

## The format, for eras three through ten

1. **Enumerate the keys from source before writing any content.** Eleven rows: the seven mass ids in
   `NODE_FOOTPRINTS` (`worldLayout.ts`), and the four members of `CIVIC_ROLES`
   (`civicCatalogue.ts`). Write all eleven headers, then fill them. A row you cannot fill is a
   finding to report, never a row to drop.
2. **Qualify every key with its namespace.** `dwelling` is both a mass id and a civic role and they
   hold different buildings in the same era — era two's `dwelling` (mass) is vacant while its
   `dwelling` (civic) is The Village Houses. Always write `dwelling` (mass) or `dwelling` (civic).
3. **The counterpart is found by lookup, not by resemblance.** The civic half comes from
   `civicCatalogue.ts`, which authors one building per role per era; the mass half comes from the
   era's node-to-mass roster. Never pick the counterpart by which building looks most similar — that
   is the form-keyed method this column exists to backstop.
4. **State the plot comparison from data, never from prose.** Read both footprints from
   `NODE_FOOTPRINTS` and the catalogue's `footprint`. A shared plot raises the bar: the difference
   must survive zoom-out in silhouette alone, since scale is not available to carry it.
5. **Each row names an axis and gives a value on both sides**, checkable by putting two images side
   by side. Use axes in the order they survive zoom-out — silhouette and plan, then support (what
   holds it up, and whether you can see through it), then corner and course treatment, then surface
   and props. *"Reads more planned"* is not an axis. Never use body hue: adjacent eras share warm
   earth families and every era shares one body hue across its own buildings by rule. **The hue
   clause holds wherever the two eras' bodies are in the same family, and a proposed era-two palette
   would take the era-one/era-two pair out of that case as of 2026-07-30 — see the note under the
   column's table above. It is unchanged for every other pair, and it is a reason to write a row's
   axis on shape rather than a licence to skip one: a hue is the first thing an art pass can undo.**
6. **A pair that should look alike says so and names the through-line it is protecting.** The guides
   carry real invariants — `yard`'s *open ground deliberately kept open*, `dwelling`'s *bounded yard
   the dwellings address*, `town-hall`'s *a sheltered communal fire* — and the column must not
   manufacture a difference that breaks one. Such a row states the invariant, then still names one
   thing that must differ, or declares itself an exception under rule 7.
7. **Exceptions are a named list that fails both ways.** Era two's list has two entries with their
   reasons, set out in the table above: `town-hall` (the hub re-themes, so the pair never stands
   together) and `dwelling` (mass) (era two has no node there). An entry that stops qualifying must
   fail, so a vacancy that gets filled cannot sit in the list forever excusing nothing. An entry that
   starts qualifying without leaving the list must fail too. **Say plainly whether the list is prose
   or a guard** — era two's is prose, and says so.
8. **Do not restate the theme.** A row that could be pasted into any other row of the same era is not
   a row. The theme brief is read once at the top.
9. **Carry the style guide, do not duplicate it.** Where the era's own style guide already states an
   axis — era two's §5 does, for all five skill masses — transcribe it and cite the section rather
   than inventing a competing one. The column's own new content belongs where the style guide is
   silent.
10. **Previous era only, and it is the backstop rather than the replacement.** Era three's briefs lead
    several blocks with era four and era five, which is valuable and stays exactly where it is, in the
    per-building "What it must not resemble" blocks. Those blocks are form-keyed and opportunistic by
    design and go on catching what a reader notices in any direction. The column sits underneath them,
    bounded and exhaustive, one row per role, backwards only.
11. **Place it in the building-brief README**, as one section between the roster table and the
    per-building briefs. Not in the style guide — the README is the artefact an artist opens.
12. **Era one has no column.** It has no previous era. That is the base case, not an exception, and it
    does not go in anyone's exception list.

**Where a row's subject is itself unsettled, say so in the row and write the row to hold either
way** — row 4 above does this for `RAD.2`, whose ruling of record and delivered model disagree. A row
that quietly picks one side of an open question is worse than a row that names the question.

---

### 1. the Bee House — EXP.1, `store` mass

> **RE-AUTHORED 2026-07-30 (Evan). This brief used to describe a raised seed store, "the Seed
> House".** *"I also wanted to change the seed house building because its design did not feel
> realistic. I want the seed house building to be replaced with another building that can be
> represented in this era and still have significance."* **The plot did not move** (INV-ERA-1) and
> the node and mass did not move; everything else did. The superseded brief is quoted as **C2** in
> the appendix and is not a starting point.

**Plot: the long two-cell strip, 2×1 (8×4u).** A rank you walk along and take from, so the
building is emphatically longer than it is deep.

**Silhouette.** **A long low block of brick standing flat on the ground, flat-topped behind its own
parapet** — a rectangular mass, square-cornered, longer than it is deep, with **no gap underneath,
no ridge on top and no opening bigger than a hand.** The read is the block and the rank of dark
round mouths along both long faces. **Nothing about it is lifted**, and that is the point: this is
the era standing a wall on the ground.

**How it stands up.** Load-bearing straw-tempered brick, **the thickest walls in the era**, because
the hives live inside the wall rather than in the building. A footing of undressed stone at ground
level; a flat roof of packed mud on close-set beams, **hidden behind a low brick parapet so the
silhouette reads as a solid mass from every azimuth**; one narrow door under a timber lintel at one
end.

**Materials and ornament.** **Brick on all four faces** — body, ends and parapet — with moulded
sun-dried clay tubes bedded through both long walls, fired clay for the plugs that stop them and for
one plaque above the door, reed and clay at the roof edge, woven undyed cloth slung on two poles as
a working veil beside the door, undressed stone at footing level only. **One projecting course runs
under the parapet the full length of both long faces and returns round both ends** — the era's
ornament on all four sides, which is exactly what the withdrawn boarded shed could not carry.

**The detail that has to read: the hive mouths.** Round, small, set in an **uneven rank** through
each long face — a longer row above a shorter one, not a grid. **Each is either open, reading dark
because the recess face takes the shaded tone, or stopped with a fired-clay plug in the era's
accent; more open than stopped.** They are **apertures in a flat cardinal wall, not tubes protruding
from it** — draw them proud of the brick and the building stops being a prism, which is the one
measured property it inherits.

**The count is a trap, and it is this building's version of the no-rebus rule.** The number of hives
is a working number: **never two, four or eight, never a pair of anything, and never a rank you can
read as a power.** An uneven five-over-four with two stopped is right; anything a viewer could count
into a pattern is wrong.

**Props.** A fired-clay smoke pot with a little smoke standing out of it, a cloth veil hung on its
poles, lidded baskets for comb, a shallow clay water trough at the foot of the wall, and a swept
working strip along one long face where the keeper stands. **No grain anywhere on this plot.**

**Height.** **Low and long — the lowest built thing in the era bar the yards**, just under the
Potter's Kiln and the dwelling cells, well below the Meeting House and The Granary, and above only
the Sheep Pen's ground. *(`style-guide.md` §3's height order carries the same ranking.)* **All of the height the
withdrawn building had was in its stumps, and it is simply gone**: the era's vertical lives in the
tower and the hall, and this building's presence is its length and the weight of its wall.

**What it must not resemble.**

- **The Granary (civic, #7).** This pair used to be *"the sharpest confusion in the era"*, separated
  *"by aperture and props, never by geometry"*. **It is now separated by geometry and the note is
  resolved rather than deleted:** a block standing on the ground with no lift, no thatch and no
  ladder, against **a box in the air on stone stumps under a thatched cap with a notched ladder
  leaning at one end**. **The Granary is now the era's only building lifted clear of the ground**,
  and nothing else in era two may take a lift.
- **The Stone Tower (#5)**, the era's other sealed store standing on the ground. **Plan carries it:**
  a rectangle against a true circular drum, and a rank of mouths against a blank coursed wall filled
  over the top from a ramp.
- **The Village Houses (civic, #8)**, the era's other flat-topped brick building. **One mass with one
  parapet and no way up, against four or five cells with party walls, ladders and a court cut into
  them.** Nothing on the Bee House's roof, and nothing domestic anywhere on its plot.

**What the building is for, since the significance is the reason it is here.** It holds the
settlement's honey, its comb and its wax — the only concentrated sweetness the era has, and the wax
that seals the pots the Potter's Kiln (#2) fires. **And it holds the one asset that multiplies
itself without land:** a colony casts a swarm and one becomes two, two become four, and the stopped
tubes are next season's. That is repeated multiplication as a fact about the object, which is what
D-ERA8 requires — **the building never depicts it.**

---

### 2. the Potter's Kiln — RAD.1, `workshop` mass

**Plot: the square full plot, 2×2 (8×8u).**

**Silhouette.** A low open-sided thatch shelter on timber posts standing over a sunken kiln —
**mostly roof and air rather than wall** — with a single plume from the kiln mouth. Deliberately
squat and busy: it fills its whole plot and rises barely above it, which is what keeps it
reading as a working floor rather than as a small house.

**How it stands up.** Timber posts carry a shallow thatch roof, with no load-bearing wall on
the open sides; one low mud-brick screen wall on the windward side only. The kiln itself is a
clay-lined pit dug into the ground with a stoke mouth at one end.

**Materials and ornament.** Thatch, timber posts, a wattle-and-daub screen with its armature
showing, fired clay everywhere as product and as kiln lining, a low mud-brick wall, undressed
stone at the pit lip. A single moulded clay finial at one ridge end. Ornament otherwise
essentially none — this is a place of work.

**Emitted light.** The kiln mouth is the era's fire and it is **enclosed for the first time**.
Render the mouth as an emissive surface inside the three-tone model: bright in itself, lighting
nothing. No glow on the posts, no warm pool on the ground.

**Props.** Banks of drying shelves down one side, green pots stacked in rows, a temper heap, a
puddling pit, a potter's wheel. Everything on the plot is for making vessels.

**Height.** Among the lowest in the era, with only the Sheep Pen's ground below it.

**What it must not resemble.** **The Bread Oven (civic, #9)**, the era's other fire under a
roof. They separate on **pit against dome**: this building's fire is *sunk into the ground* and
its roof is a full open-sided shelter over a working floor; the Bread Oven's fire is a *raised
built dome* you read as a mass from outside, with no shelter over it. It must also not read as
a small house — keep the long sides genuinely open.

---

### 3. the Sheep Pen — RAD.2, `yard` mass

> **RE-AUTHORED 2026-07-29. This brief used to describe a threshing circle.** The lead kept the
> name and changed the building, so a flat round floor for beating grain off the stalk has become
> an animal enclosure. **The plot did not move** (INV-ERA-1), and it is the only thing the two
> forms share.

**Plot: the square full plot, 2×2 (8×8u).**

**Silhouette.** **A fence, and nothing else.** A continuous knee-to-waist run of woven hurdling
enclosing the whole plot, round ground trodden bare and dark by hooves. **Nothing on it rises**,
so the whole read is the plan — which is what the three-quarter overhead camera sees best — and
the plan is the thing to get right: the large holding pen **narrows into a race** barely wider
than one animal, and the race opens into a **small square catching pen** in one corner. At
zoom-out that is a rectangle with a smaller rectangle notched into it, and no other plot in the
era carries it.

**How it stands up.** It barely does, and that is correct. Withy panels woven from sticks and
lashed to driven stakes carry nothing but themselves. **One low mud-brick wall runs the windward
side**, at the hurdling's own height and no taller, on a footing of undressed stone set at ground
level. A gate of lashed poles hangs at the mouth of the race. **No roof anywhere**: the only
shelter is a reed hurdle slung along the brick wall as a windbreak, no higher than the wall.

**Materials and ornament.** Wattle hurdling — **the era's woven stick armature with the daub left
off** — plus one low mud-brick wall, a reed windbreak, lashed timber stakes and a gate, undressed
stone at footing level only, and a fired-clay trough. **The one brick side is the only ornament
this building gets and it is the reason the wall is there**: it carries a single projecting
course, so the pen belongs to an era whose whole decorative language is the way the unit is laid.
Everything else is basketry, because a hurdle is **moved** — a pen is taken down and reset as the
ground fouls, which a brick wall cannot do.

**Props.** A few sheep, standing and lying. Wool caught in the hurdle weave. A stack of spare
panels leaning against the outside. A crook of lashed timber. A fired-clay trough. **Ground
worked unevenly by use:** hoof-churned and dark at the race where the flock is funnelled, pale and
untrodden in the corners it never reaches.

**Height.** **The lowest thing in the era, and the lowest thing in all ten eras.** This plot never
rises in any era of the run; something has to hold the bottom of the band while everything else
climbs, and this is it. **The sheep are the tallest thing standing on the plot** — nothing built
on it is higher than the hurdling.

**What it must not resemble.** **The Bread Oven's swept yard (civic, #9)** at zoom-out, since both
are bounded working ground. They separate on **what the boundary is for**: here the fence *is* the
building and nothing stands on the ground it encloses, where the Bread Oven's apron is an
irregular working ground **subordinate to a dome that dominates it**. It must also not read as
**The Village Houses**' shared court (#8) — that court is cut *into* closed mud-brick cells, and
this has no cells and no roof — nor as **the Potter's Kiln** (#2), which is a roof over a working
floor where this is deliberately roofless. **And keep the interior division legible**: an
undivided rectangle of fence is a field, and a field is not what this is.

---

### 4. the Meeting House — RAD.3, `hall` mass *(the name the hub vacated)*

**Plot: the square full plot, 2×2 (8×8u).**

**Silhouette.** One long unbroken thatch ridge over a plain mud-brick box, **open at both gable
ends** so you can see straight through the building along its axis. One dominant shape, one
accent: the ridge, and the two open ends.

**How it stands up.** Load-bearing mud-brick walls carry the roof directly — the frame has
moved inside and the surface has become the building. Batter much reduced, square corners, a
timber roof plate. Both gable ends are open with no wall across them, each framed by a timber
lintel and no wider than that lintel can span.

**Materials and ornament.** Sun-dried mud-brick body, a thatch ridge heavier and better combed
than era one's, wattle-and-daub panels in the upper gables, an undressed stone plinth at the
threshold. **This building carries the era's ornament best and should show it most**: run a
projecting course under the eaves the full length, and fill one gable with a herringbone daub panel.
The course line is the era's strongest read at distance. *(Corrected 2026-07-30: this read "it has
the longest unbroken wall in the era". **The re-authored hub is longer** — twelve units on each long
face against this building's eight. **The claim this brief needs is unaffected**: at eight units of
full-height wall read at eye level from all four sides, this is still the building whose course reads
best, and it remains the era's reference for both axes.)*

**Props.** Reed mats rolled against the walls, lidded baskets, a fired-clay plaque above one
entrance.

**Height.** Single-storey, with **length rather than height** doing the work. It is a long low
hall, not a tall one.

**What it must not resemble.** Nothing else in the era is a long rectangular hall, so the risk
is not confusion but blandness: a plain box under a ridge is the easiest shape here to draw
without character. The two open gable ends are what stop it being a shed — you should be able
to see daylight through the building from end to end at any azimuth.

---

### 5. the Stone Tower — RAD.4, `tower` mass

> **The name is FINAL and it is not a description of the fabric. Read this before drawing.** **The
> building is a mud-brick drum with stone only at its footing, and it is deliberately not tall.**
> *Stone Tower* names the **stone footing the drum stands on and the massiveness of the drum
> itself** — the era's one solid mass rather than a frame or a shelter. **No stone courses above
> the footing, and no height.** §2 confines undressed stone to footing level and the roster
> authors this building squat; both still bind, and the name overrides neither. Nothing in the
> brief below changed when the name landed.

**Plot: the square full plot, 2×2 (8×8u).** It stays on the square plot for the reason era one
measured: a smaller plot makes a tower shorter, not more slender.

**Silhouette.** A broad low cylinder tapering slightly as it rises, capped by a low dome, with
**a heaped earth ramp running up the back of it**. The ramp is part of the silhouette and
should be as legible as the drum. One high opening at the head of the ramp, and **nothing on
the outside to climb**.

**How it stands up.** A true circular drum of coursed mud brick on an undressed-stone footing,
tapering; a low domed cap of clay over reed; one small high opening on the ramp side. It is
filled over the top and it is not entered from below.

**Materials and ornament.** Mud-brick body, clay-over-reed cap, undressed stone at the footing
only, packed earth ramp. **On a curved wall the horizontal banding is at its most legible, so
this is the building that shows the era's signature move best** — let the courses wrap the drum
and be the whole of its decoration.

**Props.** Baskets and sacks at the foot of the ramp, drifted husk, a lidded storage pit.

**Height.** **Squat: low and wide, and deliberately not the era's vertical.** Whatever else it
is, it must not read as a tower you could climb.

**What it must not resemble.** **The Bee House (#1)**, the era's other sealed store. **They separate
on plan, which is the axis §3 authors** — *"rectangles with square corners and true circular
drums"*: this is a **circle** filled over the top from a ramp, and that is a **rectangle** with a
rank of hive mouths through its long faces and one narrow door at the end. Both now stand **on** the
ground, so the lift is not available as a tell and must not be reintroduced to either. **A circle
against a rectangle holds at any zoom**, and the second tell is the wall itself: a blank coursed
drum against a wall full of small round openings. *(Updated 2026-07-30 — this row read "plan and
lift" while `EXP.1` was a raised store.)*

---

### 6. the Elders' Hearth — the hub, `town-hall`

> **RE-AUTHORED 2026-07-30 (Evan), with the delivered render of the withdrawn building open in
> front of him.** *"I would still like a separate building to be the upgraded town hall, however i
> do not like the building description or the neolithic shrine. I would like a completely different
> building instead."* **The mechanism did not move**: the hub is still a separate building on its
> own unchanging 3×2 placement, it still re-themes at every advance, its stable name is still
> **Civic Center** (D-TH7), and it is still **a sheltered communal fire**. **The building is new
> work rather than an edit** — the dome, the canopy, the timber posts and the raised platform are
> all gone. The superseded brief and the 2026-07-29 ruling that defended its name are quoted as
> **C3** in the appendix, and neither is a starting point.

**Plot: the wide plot, 3×2 (12×8u).** The era's landmark, and unique by right.

**Silhouette.** **A wide low mass of brick sunk a step into the ground, flat-topped, with one broad
brick screen wall standing above the roof line and a square hole in the roof with smoke coming out
of it.** Three things carry it at any zoom, in this order: the **width** of the mass, the **screen**
standing over it, and the **broad stair** cut down into one long side. A roof over a fire, and the
roof is where the settlement stands.

**How it stands up.** The floor is dug a full step below ground; the walls are that room's retaining
walls, load-bearing straw-tempered brick, rising only **shoulder-high above the outside ground**.
A **flat roof of packed mud on close-set beams** spans the room in one unbroken plane, with **a
single square opening over the fire**, kerbed in brick so nobody steps into it. **A broad brick
stair descends on one long side**, wide enough for several people abreast — the width *is* the
authority, and it must read as built rather than as a ramp or a ladder. **One brick screen wall
stands above the roof line** behind the opening, carried on the long wall below it, with nothing
behind it: it is a face, not a room.

**Materials and ornament.** Straw-tempered brick everywhere — walls, stair, parapet, kerb and screen
— plus a flat mud roof on timber beams, a fired-clay fire bed in the floor, plaster on the inner
walls worn dark with smoke above the fire, and undressed stone at footing level only. **This is the
first time era two's landmark is made of era two's body material, and it should show it:** run the
projecting course under the roof line on all four faces, unbroken except where the stair cuts it,
and fill the screen with **one herringbone daub panel** above its own course. **The course applies
here for the first time** — the withdrawn design had no brick wall to put it on.

**Emitted light.** The fire bed, as an emissive surface inside the three-tone model, **read down
through the square roof opening and up out of the stair well**, lighting nothing around it. **No warm
pool on the roof and no glow on the screen.** The three-quarter overhead camera looks into the
opening from every azimuth, so the fire reads without a scene light and without a facing.

**Props.** **Communal querns set on the roof around the opening**, flour worked pale into the roof
surface where they stand, sheaves stood in a stook beside the foot of the stair, a clay tablet and a
bowl of tokens on a brick ledge inside, brick benches down both long walls below, and **the weathered
era-one tally post still standing nearby, unused** — the cheapest way there is to show that counting
has moved off the woodwork and into the hand. **Nothing is built on the roof**: the querns, the worn
pale ring of trodden mud round the opening and the people standing on it are the whole of it.

**Height.** **Wide rather than tall, and the authority is plan area and the screen** — the widest
single built mass in the era, and the only building you stand *on*. **A shade more substantial than
era one's Stone Circle** without changing that read: era one's is a ring of stones you look into, and
this is a mass you climb onto. The screen is what keeps it from being the lowest thing in the era;
**it must not become a tower**, and nothing on this plot may compete with the Stone Tower's height.

**What it must not resemble.**

- **The Bread Oven (civic, #9).** This pair was *"the sharpest confusion in the era"* — two domed
  clay ovens, whose separation had to open *"never separate them by making the domes different
  shapes"* and then rest on the roof, the ground and how many querns each had — **and the re-author
  resolves it in silhouette instead.** A wide flat-topped rectangular mass sunk
  into the ground, against **a freestanding dome standing on a swept yard**. Nothing about the two
  reads coincides at any zoom, and **the dome now appears exactly once in the era.**
- **the Meeting House (#4)**, the era's other big brick room. **No ridge and no gable ends here**:
  that building is a long thatch ridge over a box you can see daylight through end to end, and this
  one is flat-topped, entered downward, and you cannot see through it at all.
- **The Village Houses (civic, #8)**, the era's other flat brick roof used as a surface. **One
  unbroken roof plane with a single kerbed opening and one built stair, against four or five cells
  with party walls, ladders and a court cut into them.** Nothing domestic on this roof — no mats, no
  drying grain, no cooking fire.
- **the Potter's Kiln (#2)**, the era's other fire under cover. **All wall and no post, against all
  post and no wall** — the kiln is a thatch roof on timber standing over a sunken pit, and this is a
  brick room with a mud roof over a hearth. Neither may borrow the other's support.

---

### 7. The Granary — civic, food *(2×1)*

**Plot 2×1 (8×4u). Cost 160 grain, food for ~40. The era's only food source.**

**Silhouette.** A raised timber platform on stone stumps carrying a mud-brick box with a
thatched cap, the floor clear of the ground against damp and vermin, and **a notched ladder
leaning at one end**.

**How it stands up.** Stone stumps at footing level under a timber platform; mud-brick box
above; thatched cap over.

**Materials.** Mud brick, timber, thatch, stone stumps.

**Props, and they carry the whole read.** **It reads full**: baskets stacked under the eaves,
grain spilling at the threshold, sacks visible. This is a working store in daily use.

**Height.** Level with The Village Houses and above both the Bread Oven and the Well.

**What it must not resemble.** **Nothing in era two, any more, and that is the result of the
2026-07-30 `EXP.1` re-author rather than an omission.** This building's confusion risk was against
the Seed House — *"the sharpest confusion in the era"*, two raised grain stores on identical 2×1
plots, separated only by aperture and props — and **`EXP.1` is now a brick block standing on the
ground**, so the pair separates on geometry and needs no props to do it. **What The Granary owes in
exchange is its uniqueness: it is the era's ONLY building lifted clear of the soil on stumps**, so
the lift is now its identity and no other era-two building may take one. Its live comparison is
era one's **The Smokehouse**, in row 8 of the previous-era column.

---

### 8. The Village Houses — civic, livability *(2×2)*

**Plot 2×2 (8×8u). Cost 160 grain, 40 livability + 10 happiness.** The 10 happiness is the
shared doorway court, so the court has to be visible from outside.

**Silhouette.** Four or five **flat-roofed** mud-brick cells sharing party walls, with roof
terraces reached by ladders and a single shared doorway court. Visibly a step from era one's
scattered huts to something planned: the cells now touch.

**How it stands up.** Load-bearing mud-brick walls with square corners; **flat mud roofs on
close-set beams** — the first usable roof surface in the run, so draw the roofs as being *used*:
this is the only place in the era where a roof is a floor. Grain drying, a mat, a ladder up.

**Materials and ornament.** Mud brick, timber roof beams, packed-earth terrace. A projecting
course under the roof line on the outward faces; a lighter daubed panel beside the court
doorway.

**Props.** A quern in the court, cloth drying, a covered pit, a swept threshold, a small cooking
fire. **It is the island's only residence, so it must read lived-in.**

**Height.** Level with The Granary, and it must stay the lowest of the full-plot buildings so it
never competes with its neighbours.

**What it must not resemble.** **The Potter's Kiln (#2)** at zoom-out, since both are clusters
under low roofs on a square plot. They separate on **mass against frame**: the Houses are closed
mass with party walls and a court cut into them; the Kiln is an open-sided frame you see
through, roofing a working floor.

---

### 9. The Bread Oven — civic, happiness *(2×2)*

**Plot 2×2 (8×8u). Cost 200 grain, 40 happiness.** It needs its yard and cannot share ground —
that is what it pays for.

**Silhouette.** **A domed clay oven big enough for the settlement's bread, dominant and standing
in the open**, with a swept working yard round it and a low bench wall. The dome is the
building; everything else is subordinate to it.

**How it stands up.** A built dome of fired clay with a mouth and a flue, sitting directly on
swept ground; a low mud-brick bench wall round part of the yard; a small timber lean-to at one
side.

**Materials.** Fired-clay dome, mud brick, timber lean-to. This is the largest single piece of
fired clay in the civic set, and it should read darker and redder than the mud-brick bodies
around it for having been through a fire.

**Emitted light.** The oven mouth, emissive surface only, lighting nothing.

**Props.** A woodpile, **one** quern under the lean-to, loaves and boards, flour worked into the
ground.

**Height.** ~4 units against the Granary's and Houses' ~6 — low, with the dome dominant.
**Bread shared is the era's morale**, which is why the era spends its happiness row on the oven
the settlement bakes in every day. *(The claim is about which **bought** building carries the 40
happiness — the hub is earned and carries no capacity. Two earlier catalogue wordings of it rested on
a contrast the hub ruling made false; both are retired and are quoted in the withdrawn-text appendix
at the foot of this document.)*

**What it must not resemble.** **The Potter's Kiln (#2)**, whose fire is a sunken pit rather than a
raised dome. *(Updated 2026-07-30: the hub was this building's sharpest confusion — both were domed
clay ovens — and the hub's re-author removes the dome from it entirely. **So the dome is now this
building's alone in era two**, which is what makes it the era's clearest enclosed fire and the
largest patch of its accent hue. Keep it freestanding on its swept yard: the hub's fire is now
indoors, under a flat roof, and nothing about these two silhouettes should ever meet again.)*

---

### 10. The Village Well — civic, blend *(1×1)*

**Plot 1×1 (4×4u), the smallest plot in the era. Cost 240 grain, 20 livability + 20
happiness.** The premium buys a plot: both dials on a single tile.

**Silhouette.** A low ring parapet with **a timber windlass frame standing over it** and a
trough beside. The frame is the silhouette — at this size the shaft alone would read as a
storage pit.

**How it stands up.** A shaft lined with undressed stone; a low parapet of set undressed stone
around its head; two timber uprights and a cross-piece carrying a wooden axle over the opening.

**Materials.** Undressed stone and timber, and **nothing else**.

> **⚑ PROPOSED 2026-07-30 — one course of brick, because *nothing else* is what is wrong with this
> building.** The line above is why the Well measures **36.2% square with no brick and no course** and
> is **less square than three of era one's four civic buildings**: it is **the one building in this era
> carrying no era-two material at all.** The previous-era column above measures the consequence and
> calls it and era one's The Spring *"the closest pair in this column by some distance"* — and no
> palette change can separate that pair, because a building with no brick on it never takes the era's
> body hue anywhere. **Proposal: one course of straw-tempered brick set as a collar above the stone
> parapet**, which buys the era's material, its colour and its ornament in one move. **Nothing about
> the windlass frame moves** — it is the whole of the silhouette. **This does not resolve open flag
> (b)** below: a brick collar above a stone parapet is compatible with either resolution of the
> footing-level rule, which is exactly why it is the safe change to make while that flag is open.

**The trap on this building, and it is the era's worst: no metal, anywhere.** A windlass is the
obvious place for a crank pin, a bearing, a bucket hoop or a bright edge, and metal is the
Bronze Age's whole identity — its first appearance has to be legible, so era two must be
scrupulous. The axle is wood turning in a wooden bearing, the rope is cord, the bucket is
basketry or fired clay with a cord bail. **Rotation is permitted; the wheel as transport is
not** — no cart anywhere near it.

**Props.** A trough, a cord-hung vessel, a wet patch worn dark in the swept ground.

**Height.** ~4 units including the frame, level with the Bread Oven.

**What it must not resemble.** A lidded storage pit, which is a prop in this era's kit and sits
at the same size. The windlass frame above the parapet is what separates them, so it must be
clearly taller than the parapet and clearly open.

---

## Flags

**Four of the five flags this document opened are now CLOSED**, and the one that remains is not
this document's to close. Each closed flag keeps its original claim, because the reasoning
outlives the item.

### ✅ CLOSED 1 — "the Sheep Pen" and the building now agree

This read: *"The roster and the masses section both describe RAD.2 as a threshing circle … A
sheep pen is a different object … Briefed as a threshing circle."* **The lead kept the name and
re-authored the building.** `style-guide.md`'s roster and §5 now author `RAD.2` as a sheep pen,
and brief #3 above is the pen. **The plot did not move** — INV-ERA-1 froze it — so the re-author
was made inside the square 2×2.

**The flag's own suggestion was NOT taken, and deliberately.** It proposed adding a pen at the
plot's edge *without disturbing the round floor*; the lead changed the building instead, which is
the cleaner outcome, because two objects on one plot would have left the name pointing at the
smaller one. **The threshing that leaves with the circle is answered in `style-guide.md` §7** — as
props and worked ground on buildings that already stand, not as a new building.

### ✅ CLOSED 2 — the footprint closure block's crossed node ids are fixed

This read that the block said *"RAD.2 (store) takes the long plot; EXP.1 (hall), RAD.1
(workshop), RAD.3 (yard) and RAD.4 (tower) take the square full plot"* against a roster with
**EXP.1 on `store`, RAD.2 on `yard` and RAD.3 on `hall`**, and resolved it in favour of the
masses on the block's own next sentence: *"A raised store is a long building — it is a run you
walk along and take from — and everything else here is either a round plan or a working ground,
both of which want the square."* **`style-guide.md` now reads "EXP.1 (store) takes the long plot;
RAD.1 (workshop), RAD.2 (yard), RAD.3 (hall) and RAD.4 (tower) take the square full plot."** The
plots in the table above are unchanged, so no brief moved. INV-ERA-1 freezes them forever, which
is why this was worth correcting before anything is built against it.

### ✅ CLOSED 3 — RAD.4 is "the Stone Tower", and the name is about the footing and the mass

*(Was flag 2, "the pending name 'the Stone Tower' promises stone, and a tower", then re-opened as
"RAD.4 has no name". **The team lead has locked "the Stone Tower".** The objection is overruled
rather than withdrawn, so it is kept here with the answer beside it.)*

**The objection, as it was made.** The building is a **mud-brick** drum whose only stone is its
footing, and §2 confines undressed stone to footing level and says it is *never coursed above the
ground in this era*. The roster also makes the building explicitly **squat** — *low, wide, with
nothing on the outside to climb* — so on a plain reading "Tower" promises a height the design
deliberately removes.

**The ruling, and it is what brief #5 is drawn to.** The name refers to **the stone footing the
drum stands on and the massiveness of the drum itself**, which is the era's one solid mass rather
than a frame or a shelter. **The building is a mud-brick drum with stone only at its footing and
is deliberately not tall.** Nobody should model a stone shaft from the name, and §2's
footing-level rule is untouched by it. **No form changed when the name landed**, which is why
this brief was safe to send before it did.

**"the Lookout" stays withdrawn, and that refusal is NOT overturned by the lock.** It is **era
one's `tower` dressing**: `apps/web/src/city/eraDressing.ts` ships `"NUM.5": "Lookout"`,
`era-01-prehistoric/style-guide.md` §6 authors it, and `eras/README.md`'s cross-era row carries
it. Under the re-dressing ruling era one's Lookout keeps that name permanently, so both towers
would announce as *"Tower, the Lookout"*. That is a live collision record and the name is
unusable at any point in the run.

**"the Stone Tower" was measured before it was applied, at this tip.** Against all 121 names — 40
civic and 81 skill dressings in one namespace, compared case-folded with a leading *the* stripped
— it has **no exact collision**. Near neighbours: it shares *Stone* with era one's hub **Stone
Circle** and era four's `yard` **the Barracks**, and *Tower* with five later `tower` dressings
and era eight's civic **The Apartment Tower**. **Era two itself holds exactly one *Stone* name**,
since the hub is not the *Stone Shrine* the double-*Stone* objection was raised against. *(Re-checked
2026-07-30 after the hub was re-authored: the hub is now **the Elders' Hearth**, which carries no
*Stone* either, so the claim holds on a second name rather than on the first one that satisfied it.)*

### ✅ CLOSED 4 — the hub's oven IS era two's sacred hearth

> **SUPERSEDED 2026-07-30 (Evan), and kept because two of its three findings outlive it.** The
> domed-oven-under-a-canopy form this flag was closed against is **withdrawn**, so *"nothing in brief
> #6 moves"* is no longer true — brief #6 is a different building and the hub is **the Elders'
> Hearth**. **What still binds:** *the Bake House* duplicates the era's civic Bread Oven, and *Stone*
> collides with era one's hub, so both remain unavailable and both were re-applied to the new name.
> **What is now moot:** whether a *Shrine* may be an oven, since there is no oven on this plot. The
> withdrawn text is quoted as **C3** in the appendix.

*(Was flag 3, "'the Shrine' is FINAL and names a different building type". **Ruled by the team
lead**: the name stands, the authored form stands unchanged, and the ten-era fire chain stands
unbroken.)*

**In era two the settlement's fire and its sacred place are the same thing.** That is why the
landmark is a domed communal oven under a long thatch canopy rather than a separate devotional
building, and it is why the hub's through-line — *a sheltered communal fire*, running through a
walled furnace court, a colonnaded public hearth, a guildhall, an engine house and a data hall —
is unbroken at its second link rather than broken by it. **The name does not name a different
building type after all**, because in this era those are not two buildings.

**Nothing in brief #6 moves on the strength of this.** Not the silhouette, the platform, the
querns, the finials or the emissive treatment. This is one line of reasoning, not a redesign.

**Both rejected alternatives are recorded, since each was rejected for a reason that outlives
it.** *"the Bake House"* — which would have matched the form exactly — was rejected because **era
two already holds a bread oven**: `The Bread Oven` is this era's civic happiness building
(`civic-buildings.md` §2 — 2×2, 200 grain, 40 happiness), frozen in era two by D-ERA11 and
standing for the rest of the run, so the hub would have been named for a building a few plots
away. *"Stone Shrine"* was rejected because *Stone* collides with era one's hub.

> **CORRECTED 2026-07-29 — this flag was wrong about the tip.** It said the era-one collision
> *"does not hold at this tip"*, on the grounds that era one's hub read **"Gathering Round"**.
> **It reads "Stone Circle" at `d9945e1`**, in both `era-01-prehistoric/style-guide.md` §6 and
> the shipped `apps/web/src/city/eraDressing.ts` (`[TOWN_HALL_ID]: "Stone Circle"`) — renamed
> there from *Gathering Round* as D-ERA31, after this document was written. **So the objection
> stands on both of its reasons**, and a finding expires when the tree moves.
>
> **That objection is also why era two holds only one *Stone* name now that the `tower` is the
> Stone Tower** — the hub took *the Shrine*, so the two-hubs-an-adjective-apart defect the
> objection named cannot arise. Re-checked at this tip rather than assumed.

### ⚠ STILL OPEN, and not this document's to close

*(Was flag 5. **A third contradiction was added 2026-07-30**, from the previous-era column.)* Three
contradictions between the era's own documents. *(a)* The style
guide states
**height as a ranking and deliberately gives no world-unit targets**, while `civic-buildings.md`
gives each civic a figure (~6, ~6, ~4, ~4). Used here only as the relative order the civic file
states. *(b)* §2 confines undressed stone to **footing level, never coursed above the ground**,
while The Village Well has a **stone-lined shaft and a low stone parapet** above ground.
Briefed as *set* rather than coursed stone at ankle height, which keeps both readable, but the
rule and the catalogue should be reconciled. *(c)* **The Stone Tower's exterior climb** — brief #5
and two passages of `style-guide.md` say there is **nothing on the outside to climb**, while that
same guide's chain flag and its closure block say to **keep the ladder and the head platform
expressed on the outside of the drum**. Set out in full in **Row 5** of the previous-era column
above, with an instruction that is safe under either reading. **Unlike (a) and (b) this one is
internal to `style-guide.md` as well as across the two files.**

### ⚠ ALSO OPEN — `RAD.2` is a sheep pen in the documents and a threshing circle in the delivered art

**Owned by Evan and deliberately not resolved anywhere in this document.** The files of record
author `RAD.2` as a sheep pen and brief #3 above records the 2026-07-29 re-authoring away from the
threshing circle; the delivered model has since been measured as a threshing circle carrying no mud
brick. **Row 4** of the previous-era column is written to hold under either outcome and names which
of its tells depend on the ruling. Nothing else in this document has been changed on the strength of
it.

## Appendix — withdrawn text, kept for the record and moved out of the way

**Why this section exists, 2026-07-30.** This document is the artefact an artist opens, so a withdrawn
wording quoted inside a per-building brief is a trap rather than an audit trail — the risk is that the
withdrawn version is the one that gets drawn. The record survives here instead. **Nothing in this
appendix is current and nothing in it is to be drawn from.**

**What is NOT here, deliberately.** The superseded-folder box at the head of this document, the
`Was`/`Is` palette table under the theme brief, and **the 2026-07-30 two-buildings-withdrawn box
beside the name table** all stay where they are: each is a **live warning** whose job is to stop an
artist drawing from a cached copy, and a warning moved to the foot of the document is a warning
nobody reads in time. The closed flags above keep their original claims for the
same reason the flags say — the reasoning outlives the item. And **neither side of the `RAD.2`
conflict is here**: the sheep pen is the ruling of record and the threshing circle is the delivered
art, that disagreement is Evan's open question, and both stay exactly where they stand.

### C1 — moved out of brief #9, The Bread Oven

*Two catalogue wordings of the happiness-row claim, retired 2026-07-29 under the hub ruling. The claim
itself is unchanged and is live in brief #9.*

> The catalogue's wording was "the amenity rather than a shrine", then "an oven rather than a place of
> devotion". Both are retired: under the hub ruling era two's place of devotion IS an oven, so the
> contrast was false.

### C2 — moved out of brief #1. WITHDRAWN 2026-07-30 by Evan: `EXP.1` was "the Seed House"

*"I also wanted to change the seed house building because its design did not feel realistic. I want
the seed house building to be replaced with another building that can be represented in this era and
still have significance." The live brief for `EXP.1` is #1 above, the Bee House. **Nothing here is
current and nothing in it is to be drawn from.***

> **Silhouette.** A long boarded box held up in the air on a row of stone stumps, one thatch ridge
> running the full length above it, and **clear daylight showing right under the floor**. The gap
> under the building is half the silhouette and must survive zoom-out.
>
> **How it stands up.** Undressed-stone stumps at footing level carry a timber floor frame well clear
> of the soil; mud-brick and close-boarded timber walls sit on that frame; a timber lintel over the
> one doorway; a thatch ridge along the long axis. Being off the ground is the whole idea, and it is
> the era's structural invention.
>
> **Materials and ornament.** Mud-brick and boarded-timber walls, thatch ridge, undressed stone
> stumps, a fired-clay plaque impressed with a mark set above the door. One projecting course under
> the eaves and nothing else.
>
> **The detail that has to read: the rat-guard collars.** A flat disc at the head of each stump, wider
> than the stump, so vermin cannot climb past. Every stump has one.
>
> **Props.** A removable ladder **lying on the ground** beside the building rather than leaning
> against it — it is taken away, and that is the point. Lidded baskets, drifted husk.
>
> **Height.** Lifted noticeably higher than any other store in the era, because its stumps are
> taller; the shed itself stays low and long. All of the gain is in the stumps, none in the shed.
>
> **What it must not resemble.** **The Granary (civic, #7), which is also a raised store on stone
> stumps and is the sharpest confusion in the era.** They separate by **aperture and props, never by
> geometry**: sealed and shut against full and open; taller collared stumps against shorter bare
> ones; a ladder on the ground against a notched one leaning at an end. Seed corn is the one thing a
> settlement cannot afford to lose, and everything about this building should say so.

**Why it went, in one paragraph, because the reasoning is the part worth keeping.** Two defects had
one cause. The building was mostly **boarded timber**, which is not one of §2's five materials, and
it was a **raised store on a 2×1 plot**, which is the civic Granary. **Both follow from the lift**: a
floor frame on stumps is boarded because brick cannot stand on stumps. Standing the building on the
ground makes it brick and stops it being the Granary in the same move, and the sealed read and the
prism — the two things worth keeping — both survive that change. **The cheaper alternative, "rebuild
the same raised store in mud brick", was considered and rejected**: it keeps the Granary duplication
in full, and a brick box on stumps is not a building era two knows how to stand up.

### C3 — moved out of brief #6. WITHDRAWN 2026-07-30 by Evan: the hub was "the Shrine"

*"I would still like a separate building to be the upgraded town hall, however i do not like the
building description or the neolithic shrine. I would like a completely different building instead."
The live brief for the hub is #6 above, the Elders' Hearth, and it is new work rather than an edit of
this. **Nothing here is current and nothing in it is to be drawn from.***

> **RULED 2026-07-29 (team lead): era two's communal oven IS its sacred hearth**, so the name and the
> form agree and nothing below moves. In this era the settlement's fire and its sacred place are the
> same thing, which is why the landmark is an oven under a canopy rather than a separate devotional
> building.
>
> **Silhouette.** **One long low thatch canopy on heavy timber posts, with a domed clay oven standing
> under it on a raised earth platform**, and open air on every side between the posts. A roof over a
> fire. Wide rather than tall — its authority comes from width and from being the only building in
> the era with a canopy, never from height.
>
> **How it stands up.** Heavy timber posts carry a single long thatch canopy; there are **no walls**.
> The oven is a built dome of fired clay with a mouth and a flue, standing on a raised platform of
> earth edged with undressed stone.
>
> **Materials and ornament.** Fired clay at the largest size the era permits it — the dome — plus a
> thatch canopy, heavy timber posts, a raised earth platform and an undressed stone platform edge.
> The course does not apply here, since there is no brick wall; a moulded clay finial at each end of
> the canopy ridge is the whole ornament.
>
> **Emitted light.** The oven mouth and the flue, as emissive surface inside the three-tone model,
> lighting nothing around them. **The enclosure of the fire is the clearest single reading of this
> era anywhere on the island.**
>
> **What it must not resemble.** **The Bread Oven (civic, #9), which is also a domed clay oven. This
> is the sharpest confusion in the era and needs both halves stated.** Never separate them by making
> the domes different shapes:
>
> | | the Shrine (hub) | The Bread Oven (civic) |
> | --- | --- | --- |
> | Roof | **A long thatch canopy on heavy posts over the oven** | **None.** The dome stands in the open |
> | Ground | The oven sits on **a raised earth platform** with a stone edge | The dome sits directly on **a swept yard** |
> | Querns | Several, communal, set round the platform | **One**, under a small lean-to |
> | Plot | 3×2 | 2×2 |

**Two things this entry is load-bearing for.** The **table above is the evidence for the change**: a
must-not-resemble block that has to open *"never separate them by making the domes different shapes"*
is describing one object twice, and the 2026-07-30 palette entry made it explicit by offering to
separate the canopy from the dome *"for the first time"*. And the **2026-07-29 ruling is not
overturned so much as left without a question**: it ruled that a *Shrine* may be an oven, and there
is no longer an oven on this plot. **Its two exclusions still bind and were re-applied to the new
name**: *the Bake House* duplicates the era's civic Bread Oven, and *Stone* collides with era one's
hub.

**What was kept from it, deliberately and for stated reasons.** The **props** — communal querns,
sheaves in a stook, the clay tablet and bowl of tokens, and the weathered era-one tally post standing
unused — because those belong to `style-guide.md` §7's era kit rather than to this design, and the
tally post is the era's cheapest statement that counting has moved into the hand. **The querns moved
to the roof**, because the roof is now where the village stands. **Nothing else survives.**

---

## Related

- `docs/superpowers/specs/eras/era-02-neolithic/style-guide.md` — the era's materials, palette,
  structural language, the roster, the masses, the construction stages and the props kit.
- `docs/superpowers/specs/eras/era-02-neolithic/civic-buildings.md` — the four bought types,
  their footprints, costs and capacities.
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §0 — the hard constraints
  every era inherits, and §6 for the frozen footprint table.
- `.cursor/skills/era-building-briefs/SKILL.md` — the skill that produced this document.
