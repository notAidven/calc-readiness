# Era 1 — Prehistoric Era: style guide (D1 Real Numbers & Arithmetic)

**Era id:** `prehistoric` (`ERA_SEQUENCE[0]`, `packages/skill-graph/src/eras.ts`) ·
**New nodes:** 6 · **Buildings standing by the end of this era:** 6 · **Era multiplier:** ×1

**Status: PROPOSED.** The first of the ten era style guides D-ERA20 calls for. Per
**D-ERA21** the art is authored outside this repo — this document is the written
description to design from, not a kit spec and not a model list.

**Scope: the SKILL buildings** — the six earned 1:1 with lessons, plus the Town Hall
landmark. The buildings the player *buys*, which carry the city's food, livability and
happiness, are in the sibling file **`civic-buildings.md`**.

> ## ⚑ 2026-07-29 — THIS GUIDE NO LONGER RE-DRESSES ANYTHING BUT THE TOWN HALL
>
> **Team lead, verbatim:** *"on the building upgrades, we think that everything should stay the
> same because of the art overhead, with the exception of the town hall, which should retheme."*
> This **overturns a decided item** (D-ERA8's *"Upgrading changes only the look"*); the amendment
> is at `../../2026-07-27-era-progression-design.md` §6.1, and `../README.md`'s head banner has
> the folder-wide consequences.
>
> **Era one is the one guide the ruling barely touches, and it is worth saying why before the
> caveats.** This era **introduces** all six masses and inherits nothing, so every building it
> describes is its own. Its §6 was always a set of first drawings rather than a re-dress, and it
> stays exactly that.
>
> **What this guide still OWES, unchanged:**
>
> - **Its six new nodes' buildings**, one on each of the six masses — the whole of §6.
> - **The TOWN HALL.** After this ruling the hall is the *only* thing in the city that rethemes,
>   so all ten guides still owe theirs, this one included.
> - **The island, the roads and the advisor** (§6b, §6c, D-ERA30). The ruling's words are *"on the
>   building upgrades"*; all three are separate decided items and are untouched by it.
> - **All seven footprints**, which only this era gets to set and which INV-ERA-1 then freezes for
>   the whole run. **This is now era one's only genuine asymmetry**, since it is no longer the
>   guide that carries ten renderings of its own six buildings.
>
> **What becomes REFERENCE rather than a deliverable: the nine forward PREDICTIONS.** §6's
> through-lines say what each mass *becomes* in later eras — the round plan running on to a granary
> rotunda, a tholos, a domed rotunda, a transit concourse — and none of that will ever be drawn over
> era one's buildings, which keep their Prehistoric looks permanently. **The predictions are kept in
> full and not cut**, because a later era putting its own new node on the same mass still needs to
> know what that mass *is* as a shape. §6's "Every prediction above, checked against all nine
> downstream rosters" is still the right check for exactly that reason.
>
> **Two further rulings the same day.** A building's **shape carries no mathematical meaning** —
> *"i don't think it should"* — so no mass assignment in §6 should be read as saying anything about
> its lesson; the note under §6's lesson table has it. And **there is no generation economy**, so no
> building here produces anything; see `civic-buildings.md` §0.

**What era one is, per §3 of the era progression design:** *Counting, tallying, sharing a
kill.* The first settlement of a people who have just learned to keep track of things.

**Image inspiration** goes straight into this folder; cite it from §2 (materials) or §6 (the
seven masses) with a plain relative path, e.g. `![thatch over battered earth](thatch.jpg)`.
Worth gathering: rammed earth and daub surfaces, thatch and reed roofing, timber lashing and
cordage joints, conical and domed hut forms, undressed stone footings and hearth rings, and
notched tally sticks — the era's signature ornament.

> **This guide re-dresses the only city currently in the game.** D1's shipped buildings are
> a Deco tower, a glass slab, brownstones, a school and a park — a mid-century town. Every
> one of them is wrong for era one. That makes this the heaviest of the ten guides, and
> §12 says so directly: the six Prehistoric buildings get rendered ten different ways over
> the run, while a Cyberpunk building is drawn once.
>
> > **CORRECTED 2026-07-29 — the last sentence is now exactly backwards.** Under the
> > re-dressing ruling **the six Prehistoric buildings are drawn ONCE, like every other
> > building in the game**, and §12.1 has been amended to say so. **The first half stands and
> > is unaffected:** era one still re-dresses the shipped mid-century set, because that set is
> > wrong for era one and has to be replaced regardless. **What is no longer true is that this
> > is the heaviest guide** — every era now authors exactly its own new buildings, so era one's
> > six is the same order of work as era ten's nine. Era one keeps one genuine distinction:
> > **it is the era that SETS all seven footprints**, and INV-ERA-1 freezes them for the whole
> > run.

---

## 0. What this guide has to produce, and what it must not break

**The deliverable is 21 models.** Six skill buildings plus the Town Hall, each at three
construction stages (`MODEL_STAGES` in `buildingAssets.ts` — `site`, `construction`,
`built`), because a
building rises **as itself** rather than through a generic scaffold.

**Nine constraints that are not negotiable.** Each is enforced somewhere in code or in a
ratified decision, so a design that breaks one gets rejected by a test or a reviewer rather
than by taste.

| # | Constraint | Where it comes from |
| --- | --- | --- |
| 1 | **Footprints are fixed forever.** An era may change silhouette, height and material; it may never change which cells a building occupies. Era one is the only era that gets to *set* them, and §6's table is the set as of 2026-07-28 | INV-ERA-1 / D-ERA10 |
| 2 | **Height ceiling 24 world units** (`GRID_CELL * 6`). Over-tall models get a vertical squash, so anything taller is silently compressed. Not binding for any D1 building today | `MAX_BUILD_HEIGHT`, `worldLayout.ts` |
| 3 | **The mesh fills 95% of its footprint span** — designs are sized to their plot, not floating in it, and that fit sets rendered HEIGHT as well as base (see §6) | `FOOTPRINT_FILL`, `worldLayout.ts` |
| 4 | **Gold `#FFB703` is reserved and may never be an era material.** It is the mastery accent, carried on the **stars** above a topped-out building and on UI. **A body is never gold** | `masteryVisuals.ts:16`, `palette.ts:81` |
| 5 | **One key light, three face tones per hue:** top lightened 0.26, left the hue, right darkened 0.28. No runtime lights, no baked directional detail that fights that read | `City_Art_Bible.md` §2 |
| 6 | **Every side must read.** The tilt is locked at ~49° but the azimuth orbits a full 360°, so there is no front and no hidden back | `orbitCamera.ts` `polarAngle: 0.72` |
| 7 | **Silhouette first.** One dominant shape plus one accent, legible at maximum zoom-out | `City_Art_Bible.md` §3 |
| 8 | **No rebuses.** A skill building is ordinary architecture that happens to house a lesson. It never symbolises its skill | D-ERA8 |
| 9 | **Nothing carries meaning by art alone.** The canvas is `aria-hidden`; every state a player must know is already in the DOM | `City_Art_Bible.md` §11 |

---

## 1. The era in one line, and its signature move

**One line:** a cluster of hand-built shelters on cleared earth, where every surface that
can hold a mark holds one.

**The signature move — tally marks as the era's ornament.** Notches cut in a post, pebbles
in a row, scratches on a hide. This is the one motif that appears on every building in the
era, and it is doing real work: it is the *era's* decorative language, not a symbol of
arithmetic bolted onto each building. That distinction is what keeps it inside D-ERA8 — a
tally-marked doorpost is what these people carve on everything, the same way the Renaissance
carves acanthus. It would be a rebus only if the counting building had numbers on it and the
fractions building had fractions on it.

**Why it suits this era specifically.** Era one is the only era whose buildings get redrawn
nine more times, so its motif has to be the one thing a player can watch *evolve* — notches
on a post become a chalked slate becomes a printed ledger becomes a display panel. It is the
through-line for the whole run, established here.

---

## 2. Materials

Four, and no more. The restraint is the period.

| Material | Read | Notes for modelling |
| --- | --- | --- |
| **Rammed earth / daub** | The primary body material. Matte, slightly uneven, warm | Takes the terracotta body hue directly. Corners should read softened, never chamfer-sharp |
| **Timber** | Posts, lintels, frames, ladders | Muted, close to the existing scaffold timber `#B08968` so construction stages stay coherent |
| **Thatch / reed** | Roofs, screens, drying racks | The one place fine texture is allowed, and it should read as direction rather than detail |
| **Undressed stone** | Footings, hearth rings, thresholds, the Town Hall's base | Grey-cool, sparingly, and always at ground level — stone is effort, so it marks importance |

**Explicitly absent, because they are later eras' signature moves:** fired brick and tile
(Neolithic and after), metal of any kind (Bronze Age), mortar and dressed ashlar (Classical),
glass, and any painted colour field.

---

## 3. Structural language

**Buildings stand up by leaning and by being propped.** Nothing cantilevers, nothing spans
a wide opening, nothing is a clean rectangular prism. The vocabulary is:

- **Post and lintel**, visibly. Where a load is carried, the thing carrying it is on the
  outside where you can see it.
- **Battered walls** — thicker at the base, tapering slightly upward. This single move does
  most of the era's silhouette work and reads clearly at zoom-out.
- **Conical and domed roofs** over round plans; **shallow ridge roofs** over rectangular
  ones.
- **Lashings at every joint.** Rope and hide binding, not joinery. Visible at the corners
  and under the eaves.
- **Ground worked, not paved.** Cleared earth, packed paths, stone only at thresholds.

**Heights run low, and the only real number in that is the ceiling.** Era one should leave **most
of the 24-unit ceiling unspent** (`MAX_BUILD_HEIGHT`, §0 constraint 2), so the later eras have
somewhere to climb — era one earning its "small settlement" read depends on that headroom staying
unused. **This is a cap to sit well under, and never a height to aim at.** The lever a model
actually holds is **proportion**: keep everything stocky, and let the one vertical thing earn its
height by being the slenderest model on its plot rather than by any figure (§6).

> **AMENDED 2026-07-29 — the world-unit figure is cut and the argument it served is kept whole.**
> This read *"The tallest thing in era one should sit around 12–14 units against the 24-unit
> ceiling, so the later eras have somewhere to climb."* **The argument was never wrong; the figure
> was not something anyone could act on.** Every stage is contain-fit to its plot by one uniform
> scale (§0 constraint 3), so a rendered height is `nativeHeight × FOOTPRINT_FILL × plotSpan /
> nativeGroundSpan` and the same model stands at two different heights on two different plots.
> `#264` converted **every per-building height figure in all ten `civic-buildings.md` files** to a
> ranking on exactly that ground. **This sentence is a different case, which is why it is restated
> rather than deleted:** it argues for headroom under a **cap** and is not a target for a building,
> and it is marked as one here so nobody reads it as licence to put units back on a building.
> **Measured, it holds better without the number:** §6's two rendered figures are the
> Lookout at **9.769u** and the Roundhouse at **4.821u**, so the era's tallest thing sits under
> **half** the cap rather than at the 12–14 this sentence asked for.
>
> **What this does NOT fix, flagged rather than quietly swept:** §6 below still states **seven**
> per-building heights in world units (*"Roughly 12 units tall"*, *"About 6 units"*, *"About 5
> units"* twice, *"Nothing above about 3 units"*, *"About 13–14 units"*, *"About 10 units"*), and
> two of them are contradicted by the measured renders quoted in their own entries — 12 against the
> Roundhouse's 4.821u, and 13–14 against the Lookout's 9.769u. The 2026-07-28 pass that retired this
> class named era one's figures specifically as *"invented, not derived"*
> (`../../../../../work-log/evan/2026-07-28-radius-authored-per-era-and-ten-era-folders.md`) and
> then converted **the nine later guides** only, which is how `../README.md` still words the rule
> (*"The nine later guides therefore state a ranking"*). **So whether era one keeps per-building
> figures at all is a decision about that exemption rather than a cleanup**, and it is left to
> whoever owns the rule instead of being taken here.

---

## 4. Palette

The era works **inside** the shipped calm base rather than replacing it: parchment ground
`#ECE4D3`, deeper ground `#D9CCB2`, sage for open ground `#B9C4A9`, slate mist for water
`#8FA9B8` (`City_Art_Bible.md` §1.1).

**The Prehistoric era's palette — body hue terracotta `#C98A5E`.** Per **D-ERA27** hue is an
**era** property, so this is era one's palette and not any domain's. It happens to be the same
hue the retired per-district table gave D1, which is a coincidence worth naming rather than
leaning on: terracotta is right here because rammed earth is that colour.

Within the era, buildings **share the body hue and differ by silhouette**, never by a
second body colour (`City_Art_Bible.md` §1.2). The permitted departures from the body hue
are:

- **Thatch**, a desaturated straw that reads lighter than the body at the top face.
- **Timber**, the muted `#B08968` family.
- **Stone footings**, cool grey, ground level only.
- **The answer-type accent trim**, which is *not* an era choice — it is assigned by the
  building's answer type and persists across all ten eras: numeric deep teal `#4E7C8A`,
  multiple-choice plum `#7E5A7A`, constructed-response burnt amber `#CC7A3B`, generic slate
  `#6C7A88`. In this era it should read as a dyed cord, a painted band of ochre, or a woven
  strip — something a Prehistoric builder could actually make in that colour.

---

## 5. Ornament and visible technology

**Ornament level: very low, and structural.** Everything decorative is a thing that does a
job — the lashing, the notched post, the drying rack, the hide stretched over a frame. No
applied pattern, no carving for its own sake, no symmetry for its own sake.

**Visible technology, which is the era's whole charm:** fire (a hearth, smoke), cordage,
the lever, the digging stick, hides, stacked stone, and the tally. Nothing that implies
metallurgy, the wheel, or agriculture — the wheel and cultivated grain belong to era two.

---

## 6. The six masses, dressed

The city already has six art masses, keyed by `gridworkId` on `D1_NODE_BUILDINGS` in
`apps/web/src/city/buildingAssets.ts` — **cited by symbol rather than by line, because the
line moved** (it was `:64` until `265493f` and is not a stable address). They are the same
axis as the "six ordinary types" in §12's budget, so this guide dresses **the masses that
exist** rather than inventing a parallel set.

> ## ⚑ RENAMED 2026-07-29 — the mass ids ARE the six ordinary types now, and this file was the last holdout
>
> **Team lead:** era one used `deco`, `slab`, `rowhouse`, `school` and `park` where the nine later
> guides used `hall`, `store`, `dwelling`, `workshop` and `yard`, so the folder had **two names for
> one axis** and every guide carried a translation line. It has one now.
>
> | Was | Is | Why the old word existed |
> | --- | --- | --- |
> | `deco` | **`hall`** | The retired Gridwork art was a stepped art-deco tower |
> | `slab` | **`store`** | A modern glass slab |
> | `rowhouse` | **`dwelling`** | A brownstone terrace |
> | `school` | **`workshop`** | A schoolhouse |
> | `park` | **`yard`** | A graded green lawn |
> | `tower` | **`tower`** | Unchanged — it was already the type word |
>
> **The mapping was ALREADY one to one**, recorded in every guide's §5 and in
> `buildingAssets.ts`, so the lead's standing permission to reuse a mass was not needed: no id is
> shared and no two nodes collapsed onto one. **The old words were not arbitrary** — each named
> what the *retired* Gridwork model actually was, which is why they are kept as history at
> `../../../../../apps/web/src/city/art/models/gridwork-modern/README.md` and at
> `../../../../design-refs/BUILDING_ASSETS.md` rather than rewritten there.
>
> **NOTHING ON DISK MOVED, and that was checked before the rename rather than after.** A GLB
> filename is built from the NODE ID (`nodeFilePrefix`), so all **18** live models and all **18**
> preserved ones are `num-{s,f,2,3,4,5}-{site,construction,built}.glb` and **not one file carries a
> mass name**. `buildingAssets.test.ts`'s exact-count guard (18 skill URLs, 3 hall URLs) is keyed
> on those basenames and never on `gridworkId`, so it neither had to change nor could have caught
> the rename. What did move is **six string literals with zero readers** plus this folder's prose:
> the field's job is to join these guides to the code, so it had to move with them.
>
> **The FIELD is still `gridworkId`.** Renaming it reaches a dozen design documents that cite it by
> that name and buys nothing. A `citizen_role` of `school` (`descriptors.ts`) is a separate
> namespace and is untouched.

> ## ⚑ FIVE OF THE SEVEN DRESSINGS RENAMED 2026-07-29, and era one is the only era where this is a CODE change
>
> **Off the lead's review of the full 102-building roster.** The rule he gave, by way of the names he
> approved: the tower column works because *Grain Silo*, *Stronghold*, *Lighthouse* and the rest each
> name **a specific thing that only exists in that era**. The names that failed named the mass's
> **function** with a weak adjective in front — *Long Store*, *Cleared Ground*, *Round Hall* — which
> describes the mass instead of naming a building, and blurs down the column when all ten eras are
> read at once.
>
> | Was | Is | Why |
> | --- | --- | --- |
> | the Round House | **the Roundhouse** | One word, so it reads as the building type it is rather than as an adjective plus a function. **D-ERA31's rationale survives** — it named the chain's round-plan invariant, and that invariant is stated at length below and does not depend on the space |
> | the Long Store | **the Hide Shed** | *Long* describes the plot. Hide is what is on the racks behind the open gable, and it is the era's material |
> | the Shelters | **the Hut Cluster** | *Shelters* is the era's most generic name and the lead said so. It is also the one that must stay clear of the civic **Family Lodge**, which is a single large roof — so this name says **cluster** where that one says one building |
> | the Teaching Ground | **the Tool Shelter** | *Ground* is the weak half, and *Teaching* is the closest any subtitle came to naming a lesson, which D-ERA8 forbids. §6 authors an open-sided shelter over a working floor where the band makes tools |
> | the Cleared Ground | **the Clearing** | The lead quoted this one back (*"what is 'cleared ground'"*). One ordinary word for the thing itself, and it keeps *open ground deliberately kept open* exactly |
> | the Gathering Round | **the Stone Circle** | *Round* names a shape. §6 draws a ring of upright undressed stones round a great hearth, which is the most recognisable prehistoric structure there is |
> | the Lookout | **the Lookout** | **Kept.** The lead approved the tower column, and a lookout is a specific thing on a specific plot |
>
> **This is the one era whose dressings are DATA**, so all six changed strings moved in
> `apps/web/src/city/eraDressing.ts` in the same commit, along with every test that asserted one
> (`eraDressing.test.tsx`, `coachMarksCore.test.ts`) and the docblocks in `buildingAssets.ts`,
> `townHall.ts` and `worldLayout.ts`. **Eras two to ten are markdown-only until their rows are
> wired.**
>
> **Two rejected candidates, recorded so they are not re-proposed.** *The Feast House* for the hall,
> dropped because era one would then have held a Feast House, a Family Lodge and a Hut Cluster and
> the eye cannot separate three roofed communal buildings by name alone. And *The Hut Circle* for the
> dwelling, dropped because the hub is now the **Stone** Circle and one era should not hold two
> Circles.

**The seven dressing names below are now DATA as well as prose.** Per **D-ERA29** a building's
display name is `"{stable}, {subtitle}"` — the stable name is era-neutral and fixed for all
ten eras (`buildingAssets.ts`), and the **subtitle is this section's dressing name**,
transcribed into era one's row of `apps/web/src/city/eraDressing.ts`. So renaming a dressing
here changes learner-facing copy: keep the two in step.

Footprints below are fixed by constraint 1 and must be designed to, not around. Cell sizes
are `GRID_CELL = 4` world units.

| Node | Mass | Footprint | World plot | Answer-type read | Citizen role |
| --- | --- | --- | --- | --- | --- |
| NUM.S | `hall` | 2×2 | 8×8 | numeric hall | civic |
| NUM.F | `store` | 2×1 | 8×4 | numeric hall | civic |
| NUM.2 | `dwelling` | 2×2 | 8×8 | numeric hall | **residence** |
| NUM.3 | `workshop` | 1×1 | 4×4 | expression workshop | **school** |
| NUM.4 | `yard` | 1×2 | 4×8 | expression workshop | civic |
| NUM.5 | `tower` | 2×2 | 8×8 | numeric hall | civic |
| — | `town-hall` | 3×2 | 12×8 | landmark | civic |

**One footprint changed on 2026-07-28 and one was changed and changed back, and rendered
measurement decided both.** `dwelling` moved `2×1 → 2×2` and **stands**; `tower` moved
`2×2 → 1×1` and was **reverted to 2×2** the same day. That was the last chance to set either,
since INV-ERA-1 / D-ERA10 freezes footprints from era one onwards — so **these seven shapes
are the shapes all ten eras inherit**, and later guides design to them rather than renegotiate.

**The mechanic both cases turn on, because it is not the intuitive one.** A building is
contain-fit to its plot by ONE uniform scale (`footprintFitScale`, `worldLayout.ts`), so
**rendered height is set by the PLOT, not by the model's own height**, and the model's
width:height survives the fit untouched. Two things follow. A **smaller plot cannot make
anything read taller or more slender** — it scales the whole model down and spends real
height for no change in shape. And on a **shared** plot, the taller building is simply the
more **slender** one, by the inverse ratio of their native width:height.

- **The Hut Cluster (2×1 → 2×2) is what a footprint genuinely fixes.** At 2×1 the near-square
  model filled only 4.247u of its 7.6u plot — **44.1% of the plot width empty** — and the fit
  crushed its height to **1.457u**, making it the shortest building in the settlement. At 2×2
  it fills **100% × 89.5%** and stands **2.608u**, **1.79× taller**, from plot shape alone.
- **The Lookout (2×2 → 1×1) spent exactly the height it was meant to protect.** At 2×2 it
  renders **9.769u** against the Roundhouse's **4.821u** — **2.03× taller**. At 1×1 it
  renders **4.885u**, within **1.3%** of the Round and the **smallest building on the island**.
  Its width:height is **0.778 at both plots**, because a uniform scale preserves it. The 1×1
  rationale — that a smaller plot would reinforce "slender and vertical" — was simply false.

The six D1 buildings total **17** cells, averaging **17/6 = 2.83**.

The vocabulary is still all four shapes: three 2×2 (`hall`, `dwelling`, `tower`), one 2×1
(`store`), one 1×2 (`yard`) and one 1×1 (`workshop`), plus the hub's 3×2.

### The six lessons these buildings house

One node, one lesson, one building — strictly 1:1 (D-ERA7). Titles verbatim from
`../../../../Node_Spine_v4.md`; the node set is `product_scope: "mvp"` in
`packages/skill-graph/src/skill_graph.json`.

| Node | Lesson |
| --- | --- |
| NUM.S | Signed-number arithmetic (operate with negatives) |
| NUM.F | Fraction arithmetic (operate with fractions in expressions) |
| NUM.2 | Apply order of operations |
| NUM.3 | Use field properties (commutative/associative/distributive/identity/inverse) |
| NUM.4 | Evaluate and simplify algebraic expressions |
| NUM.5 | Ratios, rates, proportions, percents, and units |

Per **D-ERA8** none of these buildings symbolises its lesson. The Tool Shelter is not the
"field properties building"; it is an ordinary shaded floor that happens to host NUM.3.

> **AND NEITHER DOES THE MASS — team lead, 2026-07-29, asked whether a building's shape should
> tell the learner something about the skill: *"i don't think it should."*** This is the residual
> question D-ERA8 left open, and it is worth stating here because **this table is the one place in
> the folder where a node and a mass sit in the same row**, so it is where a reader forms the habit.
>
> **The pairing above carries no rule and is not meant to.** `NUM.3` (field properties) is on
> `workshop`, `NUM.S` (signed numbers) on `hall`, `NUM.5` (ratios and percents) on `tower` — and no
> reading of those three recovers a principle, because there is not one to recover. **A `store`
> mass does not mean the skill is about collecting and holding; a `yard` does not mean it is about
> laying things out; a `tower` does not mean magnitude.**
>
> **What the mass genuinely determines** is the footprint (frozen by INV-ERA-1, and set by this
> very table) and the silhouette at full zoom-out. Those are decisions about the island's layout
> and legibility. **Whoever assigns a later era's node to a mass should be answering "what shape
> does the city need here", never "what shape suits this lesson"** — the second question has no
> answer, and **all ten guides now name their masses with ordinary job-words** (`hall`, `store`,
> `dwelling`, `workshop`, `yard`, `tower`) that make it very easy to think it does. *(That clause
> read "the nine later guides" while era one alone used the retired art's ids; since 2026-07-29 it
> uses these six too, so the trap it warns about reaches this table as well as theirs.)*
>
> Recorded at `../../2026-07-27-era-progression-design.md` §6.1 as an amendment to D-ERA8.

### The Prehistoric read for each

These are proposals. The identity layer is era-agnostic by D-ERA20, so what matters is that
each keeps a **through-line** recognisable when era two re-dresses it.

> **REFERENCE ONLY since 2026-07-29.** Era two does not re-dress these six — nothing does, bar the
> Town Hall. **The through-lines are kept as descriptions of what each mass IS as a shape**, which
> is what a later era needs when it puts its own new node on the same mass. See the head banner.

**`hall` — the Roundhouse (2×2, the settlement's largest roof).**
A single wide conical thatch roof on a ring of battered earth wall, one broad opening, a
smoke hole at the apex. Roughly 12 units tall, the tallest of the roofed buildings. **It now
shares its 8×8 plot with two neighbours, and is distinguished from each on a different axis:**
from the **Hut Cluster** by **grain** — one unbroken roof over one room against several small
roofs over a yard — and from the **Lookout** by **mass** — a solid volume against an open
frame you see through. The first holds at any zoom; the second is the one that wants checking
(§9). *Through-line: one big communal roof.* **It keeps its ROUND plan the whole way**, and
becomes a granary rotunda, then a colonnaded tholos, then a domed rotunda, and finally a
transit concourse.

> **RENAMED 2026-07-28 as D-ERA31: this mass was *the Gathering Round*, and that dressing has
> gone to the HUB.** The name is the only thing that moved. The description above, the 2×2
> plot, the measured 4.821u render, the *one big communal roof* through-line and the whole
> round-plan chain to the concourse all stay **here, on `hall`** — which is the load-bearing
> half of the decision, because that chain is what resolved the `POL.3` basilica and `GEO.1`
> domed-hall collisions below, and moving it would have made nine later guides wrong.
>
> **Why the swap, given this guide was internally consistent.** §6 gave the Gathering Round
> the settlement's largest roof and made it the tallest roofed building, then put the civic
> centre in a wide low canopy next door. The eye follows mass, so the *skill* building read as
> the town hall — which is what Evan saw and ruled on. The guide was not wrong about anything
> except which building a player would take for the centre.
>
> **"Roundhouse" names the chain's own invariant** rather than a period form: this mass keeps
> its round plan through all ten eras, and that is the property every later link inherits. It
> is also the one candidate that let the chain stay put. **`NUM.S`'s stable name is unchanged
> at "Assembly Hall"**, so D-TH7 still has exactly one name reading as the town hall — the
> hub's *Civic Center*.

> **CORRECTED 2026-07-28. This line used to read *"becomes a granary rotunda, then a basilica,
> then a domed hall, then a transit concourse"*, and two of those four were already taken by
> roster nodes.** Era four's `POL.3` holds *"a basilica hall, aisled, clerestory above the side
> ranges, apse at one end"*; era six's `GEO.1` holds *"a centrally-planned domed hall on a square
> plan"*. Following the prediction would have put **two basilicas and then two domed halls on one
> small island**, which D-ERA7 (one node, one building) forbids and INV-ERA-1 makes permanent by
> giving each its own frozen cells.
>
> **Both guides reached the same resolution independently and both pointed here for the fix: the
> chain keeps the round plan it has had since era two.** The corrected chain is era one's cone of
> thatch → era two's mud-brick drum → era three's corbelled drum → **era four's colonnaded
> tholos** → era five's polygon on a central pier → **era six's drum-on-a-circle under a lead dome
> and lantern** → era seven's iron-and-glass market hall → era nine's concourse. `POL.3` keeps the
> basilica, which is a long axial shed, and `GEO.1` keeps the **square-plan** domed hall; the
> chain's is the **circular** one. The pair separates in plan and in approach — a cylinder you walk
> round against a cube with a face — which holds at any zoom.
>
> **This is a better sentence than the prediction was**, and not merely a repair: a concourse is one
> span over a crowd, and a rotunda has been one span over a crowd since era two, so the round plan
> was always the thing the chain was actually carrying. **One discrepancy between the two
> resolutions, resolved in favour of era six:** era four's §5 writes the chain's era-six form as *"a
> domed hall on a square plan"*, but era six assigns the square plan to `GEO.1` and the circle to
> the chain. Era six is authoritative for era six, so the chain is round there.

**`store` — the Hide Shed (2×1, low and horizontal).**
A long low shed on stone footings, thatch ridge roof running the long axis, the gable end
open with hides rolled up. Racks visible inside. About 6 units. *Through-line: a long
horizontal roof, contents on show.* Becomes a market colonnade, then a warehouse, then a
retail block.

**`dwelling` — the Hut Cluster (2×2, the island's housing).**
Three or four small domed huts of unequal size sharing one packed-earth yard, not a
terrace — the row-ness comes from repetition, not from a party wall. About 5 units, so it is
the **lowest of the full-plot buildings**: a wide 8×8 patch of settlement that never rises,
which is what stops it competing with the Roundhouse beside it. The square plot is what
makes the yard possible — a cluster of huts around open ground needs depth as well as width,
and it is the reason this moved off the 2:1 strip. **The renders confirmed it: on the strip
the model left 44.1% of its plot width empty and the fit crushed it to 1.457u, the shortest
thing in the settlement; on the square it fills the plot and stands 1.79× taller.** *This is
the only residence on the island*
(`descriptors.ts:117`), so it should read as lived-in: a hearth, drying hides, worn ground.
*Through-line: several small dwellings, one shared yard.* **The invariant is that the yard stays
BOUNDED and the dwellings address it**, whatever the housing turns out to be — that is the half of
this chain a later era can lose without noticing, and era eight nearly did. Becomes a courtyard
block, then a terrace, then an apartment slab round a kerbed court.

**`workshop` — the Tool Shelter (1×1, the smallest plot).**
A single post-and-lintel frame with a thatch lean-to on one side, an open floor of packed
earth under it, and **the era's tally post standing at its edge** — the most notched post in
the settlement. About 5 units on a 4×4 plot, so it reads small and busy rather than grand.
It is the **only** building on a single tile, so it has no plot-mate to be confused with.
*Through-line: a shaded open floor with something to mark on.* Becomes a portico, then a
schoolhouse, then a lecture hall.

**`yard` — the Clearing (1×2, mostly not a building).**
The one plot that is landscape rather than architecture: cleared and swept earth, a hearth
ring of undressed stone at the centre, two or three boulders, a lashed drying rack, one
tree left standing. Nothing above about 3 units except the tree. *Through-line: open ground
deliberately kept open.* Becomes a garden, then a plaza, then a park.

**`tower` — the Lookout (2×2, vertical).**
A lashed timber frame rising from a stone footing, a small thatch platform at the top, a
ladder up one face. Open structure, so the silhouette is a frame rather than a mass — which
is what distinguishes it from `hall` at the same 8×8 footprint. About 13–14 units, the one
place the era goes properly vertical. **It renders 2.03× the Roundhouse's height on the
same plot** (9.769u against 4.821u), and that ratio is the whole reason it reads as the
tower: on a shared plot the slenderer model is the taller one, so the height is earned by
the model's proportions rather than by its plot. Keep it slender and the plot does the rest.
*Through-line: a slender open frame you climb to see from.* **The invariant is the CLIMB and the
OPEN HEAD rather than any particular kind of tower** — every era owes a way up expressed on the
outside and a top stage with daylight through it, whatever the tower is for. Becomes a bell tower,
then a clock tower, then a comms mast.

> **A 1×1 Lookout was proposed, written into this guide, and REVERTED on 2026-07-28.** The
> argument was that a single tile would reinforce "slender and vertical", and it does the
> opposite: the fit is one uniform scale, so a smaller plot shrinks the whole model and
> leaves its width:height at **0.778 either way**. Measured, 1×1 drops it to **4.885u** —
> within **1.3%** of the Roundhouse and the **smallest building on the island** — so the
> change spent the entire 2.03× height advantage and bought no slenderness at all. The
> superseded text also claimed the Lookout was "over three times as tall as it is wide",
> which is **not achievable at any footprint**: at 0.778 it is about **1.29×** taller than
> wide, and only the MODEL's proportions could change that. Recorded so nobody re-proposes
> 1×1 on the same reasoning.

**`town-hall` — the Stone Circle (3×2, the era's landmark).**
The chapter marker, unique by right (§12). The settlement's origin, and now the building that
reads as its centre: **a ring of upright undressed stones enclosing a large stone hearth**, the
ground inside worn smooth and pale, with **one wide conical thatch roof carried on heavy posts
over part of the ring and the rest of it open to the sky**. It is the only building permitted
significant undressed stone above footing level. About 10 units, wide rather than tall.
*Through-line: a sheltered communal fire.*

> **RENAMED 2026-07-28 as D-ERA31, and this is the entry the ruling was made for.** The hub was
> *the Great Hearth*; it now wears the era's round dressing, because the hub is where a player
> expects the round communal hall to be. **What did NOT move is the chain:** the through-line
> stays *a sheltered communal fire*, so era two's bake house, era three's furnace court, era
> four's public hearth, era five's guildhall, era six's council hall and era seven's engine
> house are all still correct and **no later guide's `town-hall` entry changed**. The hub wears
> a round in era one **without inheriting the round-plan chain**, which stayed on `hall`.
>
> The hearth is still the whole of what this building is *about* — it has gained a ring and a
> roof over part of it, not lost its fire. **Its stable name is unchanged at "Civic Center"**
> (D-TH7).

**The two rounds, and how a player tells them apart.** `eras/README.md`'s rule is that two
buildings sharing a form are separated by **scale, plan or props, never geometry**, and era one
now has two round buildings on adjacent plots — which revives §9's open plot-mate question in a
new place. They are separated on **plan** first and **scale** second:

| | `town-hall` — the Stone Circle | `hall` — the Roundhouse |
| --- | --- | --- |
| **Plan** | A **ring open at its centre**: you look *into* it and see the fire and the worn ground. The roof covers part of the ring, not the middle | A **closed cone**: you look *at* it and see one unbroken roof. One broad opening, a smoke hole at the apex |
| **Scale** | 3×2 (12×8u), renders ~9.54 × 7.60u — **wide and low** | 2×2 (8×8u), renders **4.821u** — the tallest *roofed* building, and taller than the hub |
| **Props** | The era's only significant undressed stone above footing level: the standing ring, the hearth, a smoke plume, worn pale earth | Battered earth wall and thatch. No open fire, no standing stones |

**The plan difference is the one that holds at zoom-out**, which is the test §9 applies to the
other two pairs: a ring with a hole in the middle and a solid cone read differently in
silhouette from any distance, where a height difference alone would not.

**The shipped art for both is APPROVED as it stands** (Evan, 2026-07-28): the hub reads as a
hearth with a shelter, which is what the Stone Circle names, and `num-s-built.glb` is
already the Roundhouse's cone. **No new model is required.**

### Every prediction above, checked against all nine downstream rosters

**The hall's collision was found by accident**, because somebody happened to read era four. So the
whole set was swept 2026-07-28: the six masses above name **19 predicted forms** between them (the
hub predicts none), and each was checked against **all 56 roster buildings** in the nine
later guides, in the era where that era's own §5 delivers the form.

**Seven of the 19 land on a roster node that already holds the same building type. Four were caught
by the guide that owns the era; three were not.** **All seven are now resolved**, the last three on
2026-07-28 in the guides that own them. The table keeps the history rather than only the outcome,
because *how* three of them stayed invisible is the transferable part.

| Prediction | Delivered in | Roster node holding it | Status |
| --- | --- | --- | --- |
| basilica | era 4 | `POL.3` *a basilica hall* | **Resolved** — chain diverges to a tholos (§6 above) |
| domed hall | era 6 | `GEO.1` *a centrally-planned domed hall on a square plan* | **Resolved** — chain keeps the circle |
| warehouse | era 7 | `FUN.2` *a bonded warehouse, brick bays with iron shutters* | **Resolved in place** — era 7 separates them: `FUN.2`'s is sealed by law and stays shut, the chain's is caught mid-load |
| comms mast | era 10 | `TRG.4` *a comms tower, lattice mast*; `TRG.6` *a second, slimmer mast* | **Resolved in place** — era 10 names all three and says which carries the chain |
| bell tower | era 5 | `RAT.4` *a bell tower, battered stone base, louvred belfry stage, lead spire* | **Resolved 2026-07-28** — the roster node moved, since the chain has nine eras behind it and `RAT.4` has one, and the belfry stage is all that holds this era's through-line together. `RAT.4` is now a **tower house**: a square block with a forestair and a battlemented parapet, and no spire |
| clock tower | era 7 | `POL.5` *a combined water and clock tower, brick shaft, iron tank stage, a clock face under the cornice* | **Resolved 2026-07-28** — the roster node moved, since five sibling guides already name era 7's link as *the open iron tank stage*. `POL.5` is now a **hydraulic accumulator tower**: a blank brick tower with a weight case and a gantry, no external stair and no stage you can see through |
| apartment slab | era 8 | `FUN.9` *a slab block: precast panels in two tones, ribbon balconies, a glazed ground-floor lobby* | **Resolved 2026-07-28** — the roster node moved, since five sibling guides already name era 8's link as *a slab block*. `FUN.9` is now a **deck-access maisonette block** standing free in the grass, and the chain's slab keeps the bounded court that its through-line depends on |

**The other twelve predictions are clear**, and that is a real result rather than an absence: granary
rotunda, transit concourse, market colonnade, retail block, courtyard block, terrace, portico,
schoolhouse, lecture hall, garden, plaza and park each land in an era whose roster holds nothing of
that type. Where the chain and a roster node share a mass they are differentiated as the convention
requires — a rotunda against era two's long communal hall, a market colonnade against era four's
bonded warehouse, a lecture hall against era nine's clean-room fabrication lab.

**Why three slipped through, which matters more than the three.** All three are cases where the
chain **succeeded** — the predicted form arrived exactly as era one said it would — so every guide
scored them as wins. Era ten's own §5 table checks all six chains and scored the tower *"Landed
exactly"* and the dwelling *"Landed"*, which was **true and answered a different question**: it
asks whether the destination arrived, not whether anything else was already standing there. Both
rows now carry the qualifier the score left out. A prediction
that comes true is the case nobody re-reads, and naming a *specific building type* rather than a
*property* is what makes coming true dangerous. The hall was caught only because it happened to be
the one prediction the chain could not follow.

**How the last three were resolved, and why the ROSTER node moved in all three.** Each guide
applied the separation its own convention already required — `eras/README.md` states that an
inherited building and a roster node sharing a dressing are two buildings, differentiated by scale,
plan or props and never by geometry, with the inherited instance carrying the through-line. The
chain won each judgement on the same two grounds rather than by default: **it has nine eras of
continuity to protect against the roster node's one**, and in each case **sibling guides already
name that era's link in the chain by the disputed feature** — the belfry stage, the open iron tank
stage, the slab block — so moving the chain would have made four or five other guides wrong.
Recorded because the reverse judgement is the right one whenever those two grounds do not hold.

**The two predictions now name a property as well as a form**, which is the durable half of the
fix and the same move the hall correction made. The tower's reads *the climb and the open head
rather than any particular kind of tower*, and the dwelling's *the yard stays bounded and the
dwellings address it*. A property cannot be occupied by a roster node the way a building type can,
so it cannot collide — and it also survives being right, which a named type does not.

---

## 6b. The island (D-ERA26)

> ## ⚑ 2026-07-30 — THIS IS THE LADDER'S FLOOR, AND IT IS DELIBERATELY NOT RE-SPECIFIED
>
> **All ten island sections were authored to artist depth on 2026-07-30 under D-ERA32** (*the
> island carries the era; the buildings carry the lesson* — `../../2026-07-27-era-progression-design.md`
> §5.2a, and `../README.md` for the anatomy and the ladder). **Era one's was not**, on the team
> lead's instruction, and this note records that as a decision rather than leaving it to look
> like an omission.
>
> **Era one is the floor every other era is a departure from**, and nine guides now quote it:
> era two is written against *"nothing planted, nothing in rows, nothing fenced"* verbatim, and
> the ladder runs from here. **Changing it would move nine other sections**, and era one's art is
> generated and its ground is shipped.
>
> **Asked and answered: is era one's ground under-described for this purpose? No — it is the
> BEST-specified of the ten**, and the other nine are catching up to it rather than the reverse.
> It is the only island that has all four of: authored prose (below), **shipped rendering**
> (`apps/web/src/city/three/StarterIsland.tsx`), a **measured figure-ground analysis** — that
> file's palette block records a first pass that *"authored the ground paler than the buildings'
> own earth plates (0.53 against their 0.43), which inverted figure and ground and left the
> settlement reading as dark patches on bleached terrain"* — and an **authored ground-to-road
> relation**, in D-ERA30's own entry: the verge is the island's ambient worn-earth tone exactly
> and the tread is darker than every worn tone the island uses, *"and that two-sided value
> contrast is also what makes the path read as SUNKEN rather than laid on top."*
>
> **The nine authored sections each close with three notes this one does not carry** — a
> relation to the roads, a check of the era's own *"explicitly absent"* list against the ground,
> and a contrast note against the body hue. **Era one has all three and all three are in code**,
> which is the finding rather than the gap:
>
> | Closer | Where era one's already is |
> | --- | --- |
> | Ground against the roads | **D-ERA30's own entry** — verge at the island's ambient worn-earth tone, tread darker than every worn tone on it |
> | Absent list checked against the ground | **`StarterIsland.tsx`'s header** — *"Nothing is planted, in rows or fenced, nothing flowers, and no stone meets the water: cultivation is era two's premise, and mortar and metal are later still"* |
> | Contrast against the buildings | **`StarterIsland.tsx`'s palette block** — the measured 0.53-against-0.43 figure-ground inversion, and the 0.42-against-0.41 luminance the fix was pitched at |
>
> **So what era one lacks is structural rather than substantive, and it is two things.** Its
> **Water** is in the opening paragraph rather than under its own heading, where the other nine
> give it one — the water is fully described, so this is a departure and not a gap. And **all
> three closers live in code**, so a reader of this guide alone will not find them. Both facts
> are recorded at `../README.md` rather than fixed here. **If the three are ever wanted in this
> file, each is a transcription from code and none of them is new design.**

The ground re-dresses with the era, and since 2026-07-29 it is one of only four surfaces that do
— the island, the roads, the advisor and the Town Hall (D-ERA26 / D-ERA30 / D-ERA28, and the
re-dressing ruling's named exception). *(This line read "exactly as the buildings do"; the buildings
no longer do.)* **D-ERA26 is untouched by that ruling**, whose words were *"on the building
upgrades"*. Era one's island is the
baseline every later shore is a departure from.

**A small island in calm, pale, shallow water — shallow enough near the edges to see the
bottom.** The land is barely altered: a place being *lived on* lightly rather than built on.

**Ground.** Packed bare earth and dry tussock grass, worn through to soil along the routes
people walk. **Nothing planted, nothing in rows, nothing fenced** — cultivation is era two's
premise, not era one's.

**Vegetation.** Sparse and windblown. A few low wind-shaped trees near the margins, scrub,
coarse grass clumps, reeds in the shallows. Nothing ornamental and nothing in flower.

**Shoreline.** **No built edge at all.** The land shelves gradually into gravel and coarse
sand, with rounded boulders lying in loose clusters where the water reaches — **left rather
than placed**. No quay, no jetty, no stonework meeting the water.

**Where boats land.** A worn gravel slipway with a small hide boat pulled up above the
waterline. That is the whole of it.

**Signs of habitation, around the margins and away from the buildings.** A fire-blackened
stone ring. A lashed drying rack. A midden of shells and bone gone grey. A scatter of pale
flint chips where someone works.

> **The flint chips KEEP the word, deliberately, and this is the one place in the folder where
> that needs saying.** The era's *material id* was renamed `flint` → `stone` on 2026-07-29
> (`civic-buildings.md` §1), and these chips are **an object on the ground, not the resource**.
> Flint chips being a kind of stone is exactly the recognisability argument that produced the
> rename, so the object stays flint while the stockpile becomes stone. A find-and-replace over
> this folder would get this wrong, and `StarterIsland.tsx` describes the same chips.

**Paths are not laid; they appear from use.**

**The read:** a shoreline camp that stayed long enough to become a settlement, with the land
not yet caught up.

### What the shipped island already gets right, and four things it does not

Recorded because `StarterIsland.tsx` renders a different island today, and era one is the era
that has to change most to reach the description above.

**Already right.** The boulder scatter is exactly this — *"little clusters, a lead boulder
ringed by a few pebbles"* (`:703-724`), seeded and jittered so none reads as placed. The lagoon
already runs pale at the shore to deeper outward (`buildSea`, `:300`), which is the right
direction for "see the bottom".

**Wrong for era one:**

1. **The harbour.** `buildDock` (`:411`, called unconditionally at `:728`) builds a **stone
   quay** — weathered stone abutment, stepped and bevelled shore threshold, courses of masonry
   with mortar gaps, then a plank pier on pilings with railings, **mooring bollards, cargo and a
   lamp**. Era one has no stonework meeting the water and no pier; it has a gravel slipway and a
   hide boat. Bollards and a lamp do not belong for many eras yet.
2. **The blossom and autumn trees.** `grovePalettes` (`:674-680`) mixes `blossom` and `autumn`
   into sixteen copses of deliberately *larger* canopies. Flowering ornamental trees read as
   cultivated, which is the one thing era one must not be, and sixteen copses is not "sparse".
3. **The stepped shore profile.** Five stacked rings (`:655-660`) give a terraced edge that
   reads as cut rather than shelved. Era one wants a gradual gravel shelf — the same five rings
   can deliver it, but with softened, unequal steps rather than clean courses.
4. **The harbour approach lane.** Both the tree scatter (`:687-690`) and the boulder scatter
   (`:714-716`) skip a corridor on the seaward side to keep the pier clear. With no pier, that
   corridor is a gap in the scatter with nothing to explain it.

## 6c. The advisor — Oru (D-ERA28)

The advisor re-dresses with the era, as the ground and the roads and the Town Hall do — but **not**
"as the buildings do", which is what this line said until the 2026-07-29 re-dressing ruling. **D-ERA28
is untouched by it.** Era one's
advisor is **Oru**. He is the character the learner talks to for the whole of era one: he
carries the mini-lesson, the check-your-understanding prompt and the hint in the lesson
window, and he narrates the first-run demo reel.

> ## ⚑ 2026-07-30 — ORU IS THE ADVISOR FOR ALL TEN ERAS, AND THIS IS THE ONLY NAME IN THE RUN
>
> **THE RULING (the team lead, recorded as `D-ET9` at
> `../../2026-07-29-era-trial-contract.md` §19.2), verbatim:** *"There is one continuous advisor for
> the whole run, re-themed per era. Not ten advisors."* It overturns the **identity** half of D-ERA28
> — *"one advisor per era, belonging to that era"* — and **nine names authored in the other nine
> guides are sunset.** So *"the character the learner talks to for the whole of era one"* is now
> narrower than the truth: he is the character the learner talks to for the whole run, and era one is
> where his first dressing is authored rather than where he belongs.
>
> **Nothing in this section changes**, and that is the point of citing it here. Era one's costume, its
> staff, its four poses, its palette placement and its register are era one's **dressing**, exactly as
> the nine later guides' are theirs. **The register varies by era and is meant to** — the lead, the
> same day: *"the advisor's prose should change across eras though — it's not just a static
> advisor."* Oru in era four wears a harbour architect's clothes and speaks in a harbour architect's
> idiom, and is still Oru.
>
> **This guide is also the side the ruling agreed with.** `OruAdvisorCharacter.tsx` is the tree's only
> advisor character component, so the ten-advisor reading was what had drifted from what is built.
> `../README.md` carries the folder-wide record and the table of the nine retired names.

**A Prehistoric elder — the one who knows how, and shows you.** Not a chief and not a shaman:
the person in a small settlement who has done the thing more times than anyone else and is
the one you are sent to. That read is what keeps the tone right, because the game's advisor is
never an authority marking your work — he is standing next to it with you.

**What he is wearing, and it is the four materials and nothing else.** A hide tunic over
leggings, cord-bound at the ankles. A pale **undressed-stone** hood over grey hair, which is
the era's one use of stone above ground level and marks him as the settlement's memory. A
bead necklace of small stones. A lashed **timber** staff, taller than he is, bound with dyed
cord and carrying a **thatch** tuft at the head and a hanging stone charm — the staff is his
one prop, and it is a tool rather than a sceptre. Red-ochre marks on the cheeks and brow, and
a hide bundle slung behind the shoulder. Ember motes drift up past him: he stands near the
hearth.

### The four poses

The advisor's poses are a **per-era authoring decision**, not a fixed interface, and era one's
set is four. Naming them is the point: every surface that shows him maps its own beat onto one
of these four through a total typed table, so a beat with nowhere to go is a build failure
rather than a character standing still.

| Pose | The read | Where it is used |
| --- | --- | --- |
| **`idle`** | At rest. Free arm swaying, eyes open and blinking, mouth a closed line | The resting state; no lesson beat requests it directly |
| **`talk`** | Speaking. The mouth line gives way to an open, chattering mouth | Every teaching line, and the reel's `place` / `learn` / `build` beats |
| **`point`** | Pointing at the work. The free arm swings up | A correct answer, a hint, a retry, and the reel's `unlock` beat |
| **`squint`** | Eyes narrowed. Reading, weighing, not yet convinced | Authored and unused — reserved for a surface where he is reading the learner's work rather than speaking |

**Era one has no celebration pose, and that is a deliberate limit rather than an omission.**
There is no `wave` and no `cheer`. A correct answer is met with `point` — he draws the eye
back to the work that earned it — and the congratulation is carried by the things that already
carry it: the reward chip, and the mastery star arriving over the building. This matters
beyond era one: it is the case that established **D-ERA28**'s rule that an era advance may
*shrink* the pose vocabulary, since the outgoing modern guide had both of the poses Oru lacks.

**Whoever authors era eight's advisor is free to draw a different set** — including poses era
one does not have. What is not free is assuming era one's four exist.

### Palette

**Oru sits inside the era palette rather than beside it**, which is what stops the advisor
reading as UI dropped onto the world:

| Part | Colour | Against §4 |
| --- | --- | --- |
| Skin / body | `#C08A5A` | Era one's terracotta body hue is `#C98A5E` — the same hue to within a hair, so the advisor and the rammed-earth buildings are the same warmth |
| Hide tunic, cape, hem | `#836444`, `#6B563E`, `#5F4730` | Earth / daub family |
| Staff, its gradient | `#8B6C46`, `#77593A`, `#5A412A` | Timber, the `#B08968` family darkened |
| Thatch tuft | `#A98A52`, `#BFA268`, `#82683B` | Thatch / reed, the desaturated straw §4 permits |
| Stone hood, beads, charm | `#C4BCA8`, `#B4AC98`, `#D6CDB2` | Undressed stone, grey-cool |
| Cord bindings and lashings | `#36695F` | A dyed cord — §4's accent read ("a dyed cord, a painted band of ochre, or a woven strip"), darker than the numeric trim `#4E7C8A` and its own colour rather than that token |
| Ochre face and brow marks | `#A83A16` | A red ochre, applied as pigment on skin |
| Ember motes | `#D9622E`, `#E08A46`, `#E8A05C` | Hearth sparks, terracotta-family and **not** gold-adjacent |

**No `#FFB703`.** Constraint 4 (§0) reserves it for mastery and Oru does not reach for it
anywhere — the warmest thing on him is an ember at `#E8A05C`.

**Two colours are worth naming rather than leaving to be discovered.** The **ochre face and
brow marks** at `#A83A16` are a red ochre and are not one of §4's four answer-type accent
tokens; §2 lists *"any painted colour field"* among the era's absent materials, and that list
governs **buildings** — pigment on a person is a different thing, and era one is exactly the
era in which ochre on skin is right. The **cord teal** `#36695F` is likewise its own colour
rather than the numeric accent token. Both stand as drawn.

### What the code does with him, so the art and the wiring stay in step

`apps/web/src/lessons/OruAdvisorCharacter.tsx`, ported from
`apps/web/src/city/art/sources/OruAdvisor.dc.html`. Three properties are load-bearing and an
era advance must preserve all three:

- **The character is decoration.** It is `aria-hidden` and wordless; **every word the advisor
  says is in the DOM** in the speech bubble beside him. No meaning may move into the art.
- **The markup is static and the poses are CSS**, keyed off `data-mood` and scoped under
  `.oru-advisor`, so changing pose mid-sentence re-poses him without re-mounting or
  restarting anything.
- **All motion is gated by `prefers-reduced-motion`.** Under that preference he holds still
  and the pose remains.

**The outgoing advisor is preserved, not deleted.** `CityGuideCharacter` — hard hat, hi-vis,
rolled blueprint, chest skyline badge — is roughly eras 8-10 vocabulary and is kept,
documented and deliberately unwired (`apps/web/src/city/art/sources/README.md`), the same
treatment `art/models/gridwork-modern/` gives the original building set. Which era wears it is
open.

---

## 7. The three construction stages

Each of the seven gets three models. The stage names are fixed in code
(`MODEL_STAGES` in `buildingAssets.ts` — cited by symbol, since the line number has
already moved twice), and the era's job is to make the sequence read as *this era's*
way of building.

| Stage | Engine states | Prehistoric read |
| --- | --- | --- |
| **`site`** | `not_started`, `preview` | Ground cleared and marked out: turf stripped to bare earth in the footprint's shape, corner stakes driven, a coil of rope, sometimes a shallow trench. Flat — nothing above ~1 unit |
| **`construction`** | `teaching`, `practice` | Posts standing and lashed, no roof. The frame is the finished building's real frame, so the silhouette is already recognisable. Thatch bundles stacked on the ground beside it |
| **`built`** | `unfinished`, `complete`, full mastery | The finished building as described in §6. `advanced` (mastery ≥ 2) and full mastery both reuse this model — there is no separate gilded version, and mastery rides above it as stars (`buildingAssets.ts:28-31`) |

**The stage sequence is where the era's technology shows most clearly**, and it is worth
spending effort on: era one is stakes and rope, era two adds the first mud brick, the Bronze
Age adds a hoist. A player who watches a building rise ten times over the run should be able
to date the era from the scaffold alone.

---

## 8. Props kit

§12 budgets a per-era props kit alongside the six masses, so that 62 buildings can be
covered by six types plus props. Era one's kit:

- **Tally posts** in three heights, with varying notch counts. The era's signature prop.
- **Hearths**: a stone ring, a ring with a spit, a ring with a smoke plume.
- **Drying racks**: lashed timber A-frames, one with hides, one with fish, one empty.
- **Storage**: woven baskets in two sizes, a stacked-stone cairn, a covered pit.
- **Windbreaks**: a line of upright stones, a hide screen on posts.
- **Ground detail**: worn paths, scattered flint chips, a stack of firewood, a boulder.
- **Signage**, such as it is: a hide on a frame with a painted mark, a notched lintel. This
  is how a building gets identified in-world without a written name.

---

## 8b. Lesson framings

**What this section is.** The era folder carries lesson framing (team lead, 2026-07-29) — how a
lesson sets its mathematics inside the era's world. It replaces the retired
`../../Island_Lesson_Themes_Design_Spec.md` for this era, and era one is the case where that
retirement bites hardest: the themes spec worked D1 to full authoring depth as a **civic city**,
with a Town Hall elevator, a public library, a city budget in dollars and a clock tower. Those
framings are era-appropriate for roughly era eight. **None of them survives the Prehistoric Era.**

**This era's lessons are ALREADY WRITTEN**, so this section **records** rather than invents.
`content/lessons/d1/` holds all six packs (Anthony, 2026-07-22, with several quality rounds
since). Where a row below and a shipped pack disagree, **read the pack**.

**And a warning that matters more here than anywhere else in the folder: the shipped D1 packs
were authored against the civic-city framing.** That is not a defect anyone introduced — it was
the authority at the time — but it does mean **era one is the era whose content is furthest from
its era's world**, and further from it than any of the later authored eras. Nobody should
re-theme it casually: D1 is the only fully-built, demo-critical chapter in the product. The right
disposition is that **the rows below describe where era one's lessons should end up if and when
they are re-themed**, and the decision to do that at all is Evan's with the team lead.

**Three rules the era imposes.**

1. **The framing comes from the era's WORLD, not the node's BUILDING** (§6 and D-ERA8). The
   Tool Shelter is not the field-properties building.
2. **§2's "Explicitly absent" list is a hard boundary, and it is the longest in the run** —
   **no fired brick or tile, no metal of any kind, no mortar, no dressed ashlar, no glass, and no
   painted colour field.** It rules out most of what a modern word problem reaches for: no coins,
   no money, no clock, no written records, no scales with a metal beam, no wheeled cart, no
   building above one storey.
3. **Theming follows the ERA, not the domain.** This era is one whole domain, so nothing splits.

**The era's context palette — six reusable settings, from this guide's own props:** the **shared
kill** and how it is divided; the **notched tally post**; the **hearth** and the fire kept in;
the **drying racks** and what is put by for later; the **cleared ground** paced out with cord and
stakes; and the **shoreline**, with the tide and the boats drawn up on it.

**What replaces money, and it is the single substitution that unlocks the rest.** Era one has no
currency, so every framing that would reach for price, budget or cost reaches instead for
**shares of a real thing** — portions of a kill, measures of dried fish, days of daylight, paces
of ground. This is not a loss. A share is more concrete than a coin for the anxious beginner the
starter era is written for, and it is available to the era in a way a coin is not.

| Node | The mathematics | Prehistoric framings (2 to 3 per node) | What it replaces |
| --- | --- | --- | --- |
| **NUM.S** — signed-number arithmetic | direction and distance; sign rules | (1) **Paces up the slope from the shoreline, and paces down below it** — the waterline is zero, above is positive, below is negative, and the distance from the line is the absolute value. (2) **Warm days and frost days** against the same mark. (3) **What is added to the store and what is taken out**, as a running count that can fall below what was set aside. | The Town Hall **elevator**, floors above and below ground |
| **NUM.F** — fraction arithmetic | equivalent fractions, common measures, lowest terms | (1) **Dividing a kill into shares**, and shares of shares — the era design's own phrase for this chapter. (2) **A cleared ground split into strips** for different uses, with the parts added and the remainder found. (3) **Portions of a drying rack**, combined and reduced. | Dividing **city land parcels**, the library's shelf space |
| **NUM.2** — order of operations | fixed tiers; order changes the result | (1) **A sequence of work that cannot be reordered** — bank the fire, then set the racks, then divide the catch — where doing it in the wrong order gives a different and worse answer. (2) **Counting a total by groups before adding the leftovers**, on a tally post. (3) **The cautionary version**: the same three numbers, two orders, two different counts of what the settlement has. | **Permit sequencing**, a rent and utility bill |
| **NUM.3** — field properties | commutative, associative, distributive, identity, inverse | (1) **Carrying loads in any order** to the store and arriving at the same total, which is what commutativity *is* before it is a word. (2) **Handing each of three families the same bundle** of a counted item plus a fixed extra, which distributes. (3) **A count that changes nothing** (nobody arrives) and **a count that undoes another** (what was taken out is put back). | Loading **supply trucks**, three classrooms' kits |
| **NUM.4** — simplify; combine like terms | like adds to like; unlike stays apart | (1) **Tallying the cleared ground**: fish with fish, hides with hides, and a hide is never added to a fish however convenient. (2) **Several racks' counts combined** after each is scaled by how many of it there are. (3) **Unlike things that resist combining** — a count of stakes and a count of paces of cord — which is the whole lesson. | Tallying **park benches and trees** |
| **NUM.5** — ratios, rates, proportions, percents, units | comparison and conversion | (1) **Shares per person** from a divided catch — a rate, in the era's own terms. (2) **Paces to a landmark scaled off a cord** marked in shorter lengths, which is a proportion and is how this era measures anything it cannot pace directly. (3) **How much is put by out of the whole**, expressed as *so many in every ten* rather than as a percent sign, which the era has no notation for. | **Map scale** in inches to feet, **sales tax**, city density |

**Note the last row carefully.** Percent is the one place where the era genuinely cannot carry the
notation, and the honest treatment is to **teach the mathematics in the era's language and let the
symbol be modern**, exactly as every era does with digits. A lesson may say *so many in every ten*
in its framing and still require `20%` in the answer; §1.4's rule that theming never changes the
required form is what makes that safe.

---

## 9. What this guide does not decide

Four things it raised as open, **and all four are now ruled on.** The building names became
**D-ERA29** and the hue axis **D-ERA27**, both on 2026-07-28; the road surface became **D-ERA30**
the same day and is shipped in `roadSurfacing.ts`; and the **shared-plot distinctness is decided
2026-07-29** with a dev-server look owed as verification rather than as the decision. Every item is
kept below with its resolution rather than deleted, so nobody re-raises it.

**~~The building names violate D-ERA9 in this era.~~ RESOLVED 2026-07-28 as D-ERA29.** The
shipped names were City Bank, Public Library, Rowhouse Flats, Community School, Central Park
and Clock Tower (`D1_NODE_BUILDINGS` in `buildingAssets.ts`), and a bank, a library and a
clock tower cannot exist in the Prehistoric era at all. **Evan's ruling is a stable
era-neutral name plus a per-era subtitle**, so era one reads "Dwellings, Hut Cluster": the
stable half is §6.1's ordinary type and never moves, and the subtitle half is **this guide's
§6 dressing name**, carried as data in `apps/web/src/city/eraDressing.ts`. D-ERA9's
accessibility requirement is kept in full — the announced name's leading token is identical
in all ten eras — and its "no era flavour" reading is what was amended. See era design
§6.2a. The consequence for this guide is recorded at the head of §6: **the seven dressing
names below are learner-facing copy now, not only prose.**

**~~The hue axis is keyed to the wrong thing.~~ RESOLVED 2026-07-28 as D-ERA27.** This was
raised here as an open question: `City_Art_Bible.md` §1.2 assigned a hue family per **domain**,
which under one city and ten eras expressed nothing. **Evan has retired the per-domain axis —
hue is now an era property.** §1.2 carries a superseded banner and era one's terracotta is
recorded above as the *era's* palette. This also dissolved the separate D10-hue question, since
no domain needs a colour now. See era design §5.3.

**~~Roads are dirt paths in this era, and that is load-bearing for more than looks.~~ DECIDED
2026-07-29: worn earth, one surface, no edge.** Per §5.1 of the era design, the current
three-slab road (asphalt, curb, painted dash) is what caps island growth via the depth guard, and
a single-surface packed-earth path removes that constraint outright for era one. **Era one's path
is worn earth**: a single surface, slightly darker and smoother than the ground either side of
it, with **no kerb, no edging stones and no defined boundary** — it is where people have walked,
and its edges fray into the ground rather than meeting it. A line of flat stones was the other
candidate and is rejected because it is *placed*, and era one's whole read is barely-altered land;
laid stones belong to era three's first quay. **This also sets the rule the whole run inherits:
one surface per road, always** — era seven states the general form of it for the four late eras
where the depth guard actually bites, and era one is where the pattern starts.

**Whether the three buildings sharing the 8×8 plot are distinct enough — now TWO pairs, not
one.** The original question was `hall` versus `tower`, and it is **live again**: it was briefly
dissolved on 2026-07-28 when `tower` moved to 1×1, and the revert restores it unchanged. The
proposal is unchanged too — **solid mass against open frame**, which should hold at zoom-out
and wants checking on the dev server before nine more eras inherit the distinction.

**What is genuinely new is that `dwelling` also moved onto 8×8, so three buildings now share
that plot and there are two pairs to keep apart:**

| Pair | Separated by | Confidence |
| --- | --- | --- |
| `hall` / `dwelling` | **grain** — one unbroken roof over one room against several small roofs round a yard | **DECIDED 2026-07-29.** A difference in grain survives zoom-out well |
| `hall` / `tower` | **mass** — a solid volume against a frame you see through | **DECIDED 2026-07-29.** The proposal is now the answer, with a dev-server look owed as verification rather than as the decision |

`dwelling` / `tower` needs no separate argument: it is grain *and* mass *and* a 2.03× height
difference. **The 4×4 pairing filed here on 2026-07-28 (`workshop` / `tower`) no longer exists** —
`workshop` is the only single-tile building again.

> **CLOSED 2026-07-29: both proposals are ACCEPTED as drawn.** Solid mass against open frame for
> `hall` / `tower`, grain for `hall` / `dwelling`.
>
> **Why accept rather than keep waiting for the dev server.** The table already rates the grain
> difference as the safer of the two and names mass as the original question, and **an open design
> item is the wrong container for a look-and-see**: the proposal is the only one on the table, **nine
> later eras inherit the distinction**, and holding it open costs those nine a decision they need in
> order to be authored at all. **The look is still worth doing** — it is a verification task on a
> decision, and if solid mass against open frame turns out not to hold at full zoom-out, that is an
> amendment here with a screenshot attached, which is a better artefact than a question mark.

---

## Related

- `civic-buildings.md` — the four bought types for era one, the **stone** resource *(renamed
  from `flint` on 2026-07-29 — see that file's §1)*, and the
  food / livability / happiness values this file deliberately does not carry.
- `../README.md` — the ten eras, the two-file convention, and what each guide owes.
- `../../2026-07-27-era-progression-design.md` — §3 the ten eras, §12 the art budget and
  D-ERA20/21, §5.1 the land and depth constraints.
- `../../City_Art_Bible.md` — the palette, the three-tone lighting model, the silhouette
  system, and the accessibility rules this guide sits inside.
- `../../../../Game_Visual_Design_Brief.md` — the tone bans (no scarcity, no guilt framing).
- `apps/web/src/city/buildingAssets.ts` — the six masses, the three stages, the 18 GLB
  slots era one has to fill.
- `apps/web/src/city/art/sources/README.md` — the two advisor design sources: Oru's, and the
  preserved-and-unwired modern guide waiting for its own era (§6c).
