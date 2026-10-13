# Era 2 — Neolithic Era: civic buildings

**Status: PROPOSED.** The companion to `style-guide.md`. That file covers the **skill
buildings** — earned 1:1 with lessons. This one covers the
**civic buildings**: the ones the player **buys**, which **provide** the city's food,
livability and happiness.

> **AMENDED 2026-07-29 (team lead), and this file carries the contract table all ten eras cite,
> so both amendments are written out in §0 below.** *(1)* **There is no generation economy** — no
> building produces, so *"which produce the era resource"* is cut from the line above and the
> two classes are split by **how they are acquired**. *(2)* **Skill buildings no longer re-dress
> across eras**; only the Town Hall rethemes. Authorities:
> `../../2026-07-29-era-resource-model-design.md` §5 and `../../2026-07-27-era-progression-design.md`
> §6.1 / §6.4a.

This file is era two's answer to **O-12** (*how many civic types, and what they are*) and to
the identity half of **O-6** (*the era's resource*).

**Era multiplier: ×2.** Every figure in §7's provisional tuning doubles here.

---

## 0. The contract

| | **Skill buildings** (`style-guide.md`) | **Civic buildings** (this file) |
| --- | --- | --- |
| How you get it | **Earned**, 1:1 with lessons, never bought | **Bought** with grain, placed freely |
| Count | 5 new this era; 6 era-one buildings already standing | **4 types**, built as often as you can afford |
| Economic role | **Neither produces.** A lesson pays a one-time lump of grain when it is completed; the building it earns pays nothing, ever | **Provide** food, livability and happiness — per placement, never per tick |
| Across eras | **Frozen** in the era it was built | **Frozen** in era two forever (D-ERA11) |
| Art cost | **One look each, ever.** Era two draws the 5 masses its own nodes use | **One look each, ever** |

> **THE TWO AMENDED ROWS, 2026-07-29, quoted so the change is legible in the nine files that
> point at this table.** *Economic role* read: **"Produce** grain; mastery doubles the rate | **Provide**
> food, livability, happiness; produce nothing". *Across eras* read: "**Re-dress** automatically
> every era | **Frozen** in era two forever". *Art cost*'s skill column read: "6 masses + props,
> re-dressed 10 times".
>
> **What survives is the split itself**, and it is now cleaner: **earned against bought.** Skill
> buildings are still 1:1 with lessons and still never bought; civic buildings are still the
> only thing money buys and still carry the capacities. What is gone is the *"produce vs
> provide"* contrast — which read like a per-tick mechanic and, on the evidence of the
> surrounding text, never was one: a skill building's "production" was always the one-time lump
> §7 pays for completing a lesson. **The Town Hall is the one exception to the frozen row** and
> rethemes at every advance.
Nothing carries into era three's menu, there is no renovation ever, and the only way to reclaim
the ground is teardown — for a cost, with no refund (D-ERA12), which *converts* the quarter
rather than modernising it. A Neolithic granary is still a Neolithic granary in the neon city.

---

## 1. The era's resource: grain

**Proposed answer to O-6 for era two: grain.** It is the era's whole premise — *first
settlements and agriculture: seed that multiplies, grain stores doubling* — it stockpiles
believably, and it is materially different from era one's stone rather than a rename.

In the HUD it wants to read as a **measured volume** (baskets, or a filled store) rather than a
count of pieces, which is how the player feels the step up from stone.

The forward-conversion rate from **stone** is decided: half the purchasing power survives (§5 below).

> **Era two's own id `grain` is UNCHANGED** by the 2026-07-29 recognisability ruling — it passes both
> halves of the test, being a category and a substance that everyone knows. **What changed here is
> era ONE's**, `flint` → `stone`, which this section cites three times; corrected above. `grain`
> **cannot become "food"**: food is a livability input in this model, never a stockpile.
> (`../../2026-07-29-era-resource-model-design.md` §4.1a.)

---

## 2. The catalogue: four types

Values are §7's anchors at **×2**. Every figure is an illustrative anchor for checking the
arithmetic, not a shipping number. Footprints are in grid cells; `GRID_CELL` is 4 world units.

| Building | Footprint | Provides | Cost | Wins on | Loses on |
| --- | --- | --- | --- | --- | --- |
| **The Granary** | 2×1 | food for ~40 | 140 grain | **resource efficiency — the first food row in the run priced below era one's**, because grain multiplies | nothing spare — it is the era's only food source |
| **The Village Houses** | 2×2 | 40 livability + 10 happiness | 160 grain | **the shared court** — an amenity that comes with the housing | **land efficiency** — the Granary sustains as many on half the ground, for 20 grain less |
| **The Bread Oven** | 2×2 | 40 happiness | 220 grain | atmosphere, and it anchors a quarter | **land efficiency** — it needs its yard, and in the era where ground is scarcest |
| **The Village Well** | 1×1 | 20 livability + 20 happiness | 300 grain | **the smallest plot in the era** | **resource efficiency** — dearest per unit, at **2.14× the Granary**: the steepest premium any era's 1×1 blend pays over its own food row |

**How they trade, which is the point (D-ERA24).** The Village Houses sustain the same 40 as the
Granary and throw in 10 happiness from the doorway court the cells share — and they pay for that
by taking 2×2 where the Granary takes 2×1, **and by costing 20 grain more**. **Those 10 happiness
are what stop them being a Granary on twice the ground**: under the pooled ruling
(`../era-01-prehistoric/civic-buildings.md` §2) a dwelling and a food building of equal
magnitude are the same contribution, so the difference has to be somewhere. The Bread Oven
costs more for the same magnitude *and* wants open ground it cannot share. The Well is the most
expensive per unit of anything, and what the premium buys is **a plot** — both dials on 1×1.
Which is correct depends on whether the player is short of grain or short of ground.

**Era two is where land is tightest in the whole run.** The island has only just begun to grow
and eleven skill buildings are now standing, so the land-efficiency axis is at its sharpest
here. It weakens steadily era by era as the island expands, which is exactly what D-ERA24 means
by *"which is better … changes era by era as land expands."*

> ## ⚑ RE-PRICED 2026-07-30 — the four costs above are era two's own, and no longer era one's doubled
>
> **THE RULING (team lead, 2026-07-30, verbatim):** *"the buildings shouldn't all have the same
> price ratios and be priced the exact same relative to each other across eras. Doesn't need to be
> drastic; just some kind of variance would be nice."*
>
> **Era two was the measured case.** Its four rows read `160 / 160 / 200 / 240` — **the same plot
> signature as era one's four (2×1, 2×2, 2×2, 1×1) at exactly 2× the price on every row**, and it
> was the only one of the nine later eras that mirrored era one on both. Era three's costs were also
> exactly 4× era one's, so the *price shape* was shared three ways; era two shared the footprints
> too, which is what made it a duplicate rather than a coincidence.
>
> **What era two's own prices now say.** Agriculture is this era's entire premise — *seed that
> multiplies, grain stores doubling* — so **the Granary is the first food row in the run priced below
> era one's anchor**, dropping to 140. And §2 above already says land is tightest here than anywhere
> in the run, so **this era pays the steepest premium any era's 1×1 blend pays over its own food
> row**: the Well rises to 300, **2.14× the Granary**, against 2.0× in eras three, four and seven and
> 1.5× in eras one and five. The ground-hungry Bread Oven rises to 220 for the same reason. Era two is
> now the *land* era of the catalogue and era five is its opposite, the era where the building is
> dear and the ground is cheap.
>
> **What did NOT move.** The footprints, both contributions on all four rows, and — measurably —
> **era two's city price**: still **1,080 grain** against a mintable 1,200, because a city is bought
> as three of the cheaper livability row plus three amenities and `70 + 110` is the same 180 at
> era-one scale that `80 + 100` was. The ladder fixes what a city costs; this ruling changes only
> which of the four you pay it to.
>
> **ONE FIGURE DID MOVE, and it is worth stating rather than glossing.** The *exhaustively cheapest*
> city was **1,040** and is now **1,080** — equal to the price above. Four Village Houses used to
> supply the Bread Oven's whole happiness contribution for less than three Granaries plus three
> Ovens, and that only worked because the Houses and the Granary cost the same 160. **Housing now
> carries a 20-grain premium, so the trick stops paying**, which is the uniformity being removed
> rather than a regression: era two's surplus falls from 160 to 120 and it still clears comfortably.
> `packages/economy/src/civicSolvency.test.ts` derives both numbers and the reason.
>
> **One citation outside this file moved with it.** `style-guide.md`'s Shrine ruling cites the Bread
> Oven as *"2×2, 200 grain, 40 happiness"*; the plot and the happiness are unchanged and the cost is
> now 220, corrected there in the same commit. **The argument it is cited for is untouched** — a hub
> called the Bake House would still name a civic building standing a few plots away, at any price.

> ## ⚑ AMENDED 2026-07-29 — heights are stated as an ORDER, not as world-unit figures
>
> Each of the four below carried a `Height ~N units` figure while `style-guide.md` §3 states
> height as a ranking and says in terms that the guide *"deliberately gives no world-unit
> targets"*. **The ranking wins on a mechanical ground rather than an editorial one:** every stage
> is contain-fit to its plot by one uniform scale, so the same model stands at two different
> heights on two different plots and a figure is not something a modeller can aim at. Proportion
> is the only lever, and **the more slender of two neighbours is simply the taller one**
> (`../README.md`, "Constraints every guide inherits"; `../era-01-prehistoric/style-guide.md`
> §0). **Nothing is lost, because the order is what the figures were encoding** — The Granary and
> The Village Houses level with each other at the top, then The Bread Oven and The Village Well
> level with each other below them — and it is now stated directly, ties included. The one real
> number is the 24-unit ceiling (`MAX_BUILD_HEIGHT`), a cap rather than a target, and nothing in
> this era comes near it. **This era's own image-generation brief raised it first**, and the era
> five and era six briefs found the same split independently, so it is a folder-wide split
> between the two file types rather than an era-two slip.

### The Granary *(2×1, food)*

A raised timber platform on stone stumps carrying a mud-brick box with a thatched cap, the floor
clear of the ground against damp and vermin, a notched ladder leaning at one end. Reads full:
baskets stacked under the eaves, grain spilling at the threshold.

*Materials:* mud brick, timber, thatch, stone stumps. **Height: joint-tallest of the four**,
level with The Village Houses.

### The Village Houses *(2×2, livability)*

Four or five flat-roofed mud-brick cells sharing party walls, roof terraces reached by ladders,
a single shared doorway court. The era's dense dwelling, and visibly a step from era one's
scattered huts to something planned.

*Materials:* mud brick, timber roof beams, packed-earth terrace. **Height: joint-tallest of the
four**, level with The Granary.

### The Bread Oven *(2×2, happiness)*

A domed clay oven big enough for the settlement's bread, a swept working yard around it, a low
bench wall, a woodpile and a quern under a lean-to. **Bread shared is the era's morale**, which
is why the era spends its happiness row on the oven the settlement bakes in every day.

> **The claim above is about which BOUGHT building carries the 40 happiness**, and it is unchanged.
> The bought amenity is the everyday bake oven on its own 2×2 yard; the hub is **earned rather than
> bought and carries no capacity at all**, so it was never the alternative this row was being weighed
> against. *(Two earlier wordings of this sentence rested on an oven-against-shrine contrast, which
> the hub ruling made false: in era two the place of devotion **is** an oven. Both wordings are
> retired and are quoted in the withdrawn-text appendix at the end of this file.)*
>
> > **RE-CHECKED 2026-07-30, because the hub changed building.** Evan withdrew the domed oven under a
> > canopy; the hub is now **the Elders' Hearth**, a sunken communal hearth room walled in brick
> > (`style-guide.md` §5). **The live sentence above does not move**, because it rests on *earned
> > against bought* — the hub carries no capacity in either form. **What has moved is the reason the
> > two earlier wordings were retired:** they were retired for resting on an oven-against-shrine
> > contrast, and era two's hub is now neither of those things. They stay retired, on the stronger
> > ground that a capacity claim should never have been argued from a building's type. **And this
> > building is now the era's only dome**, which is a gain rather than a cost: see the brief's #9.

*Materials:* fired clay dome, mud brick, timber lean-to. **Height: joint-lowest of the four**,
level with The Village Well and below the other two — with the dome dominant on its own plot.

### The Village Well *(1×1, blend)*

A stone-lined shaft with a low parapet, a timber windlass frame over it, a trough beside. Water
security *and* the place people meet, on the smallest plot available.

*Materials:* undressed stone, timber. **Height: joint-lowest of the four**, level with The Bread
Oven — the windlass frame included, since the frame is the whole of its silhouette.

---

## 2a. The civic redesign direction (PROPOSED — 2026-07-30)

**Status: PROPOSED for Evan, not decided.** He has seen this era's delivered art and asked for the
buildings to be redesigned onto a different palette because they read too close to era one's.
`style-guide.md`'s palette section carries the new hues and the ΔE arithmetic, and its **§5a** carries
the redesign direction for all ten buildings including these four. **This section is the civic half,
stated here because this file is where an artist reads about these four.**

**Nothing about the economy moves.** Costs, capacities, footprints, the D-ERA24 trade and §6's closed
list are untouched. This is art direction only.

### The palette, in one line

**Body `#D9C288`** — sun-dried brick, straw-tempered, a pale straw-buff rather than a terracotta red
— with **`#A2503A` fired clay** as the accent. The withdrawn rationale and the arithmetic are in
`style-guide.md`; the short version is that a sun-dried brick is not the colour of a fired one, and
era one → era two was the **smallest adjacent body-hue step in the whole run at ΔE 10.1**. The
proposal measures **ΔE 25.24 from era one** and **23.72 from era three**.

### What it changes for these four, per building

**Measured on the delivered models and cited rather than re-measured. Squareness is the share of wall
area facing a cardinal direction.**

| Building | Measured | Owed | Not owed |
| --- | --- | --- | --- |
| **The Village Houses** | **95.6%** — the era's best square reading | **Nothing.** It already carries the prism, the course and the flat roof | — |
| **The Granary** | 72.4% | **One projecting course** under the thatched cap | Nothing else — and **the lift**, which is now its identity. *(Updated 2026-07-30: this cell read "its confusion risk is against the Seed House and the brief handles it by aperture and props". **Evan withdrew that building**; `EXP.1` is now the Bee House, a brick block standing on the ground, so the pair separates on geometry and The Granary is **the era's only building lifted clear of the soil on stumps**. Nothing else in era two may take a lift.)* |
| **The Bread Oven** | A dome, with **no near-horizontal wall faces at all** | Its course, on the low mud-brick bench wall only | **Do not square the dome.** It is authored as dominant and subordinating everything on its plot, and under the new palette it becomes **the largest single patch of the era's accent hue anywhere in the city** — which is the job a fired-clay dome should always have had, and could not have while the accent was reed thatch |
| **The Village Well** | **36.2%, no brick, no course** — **less square than three of era one's four** | **One course of straw-tempered brick, set as a collar above the stone parapet.** See below | Nothing about the windlass frame, which is the whole of its silhouette |

**The Village Well is the weakest of the four and the reason is not its squareness.** Its authored
material line is *"undressed stone, timber"*, and `style-guide.md` §5a states the same line for it
that the brief does: *"Undressed stone and timber, and **nothing else**."* **So it is the one building
in this era carrying no era-two material at all** — which is why it reads as era one's, and the
previous-era column in `output/imagegen/era-02-neolithic-building-briefs/README.md` measures exactly
that, calling it and era one's The Spring *"the closest pair in this column by some distance."* A
brick collar gives it the era's material, the era's colour and the era's ornament in one move.

> **It bears on the brief's open flag (b) and does NOT resolve it.** `style-guide.md` §2 confines
> undressed stone to **footing level, never coursed above the ground**, and this building has a
> stone-lined shaft and a stone parapet above ground. **A brick collar above a stone parapet is
> compatible with either resolution of that flag**, which is why it is the safe change to make while
> the flag is open. The reconciliation the brief asks for is still owed and is still not this
> section's.

### Two things this section deliberately leaves open, both Evan's

1. **The delivered heights contradict this file's own pairing.** §2's amendment box states the order
   as *"The Granary and The Village Houses level with each other at the top, then The Bread Oven and
   The Village Well level with each other below them — and it is now stated directly, ties
   included."* **The delivered models measure Granary 7.76, Bread Oven 5.35, Village Houses 5.18,
   Village Well 4.82** — so the Bread Oven stands *above* the Village Houses, and neither declared
   tie holds. **This is Evan's art disagreeing with the brief and the brief is not amended to match
   it**, because which one is wrong is his call: the ranking was authored as a design intent, and a
   contain-fit means the rendered figure is not something a modeller aimed at.
2. **Whether the footprint freeze reaches civic types.** INV-ERA-1 / D-ERA10 freezes footprints
   against an **era advance**, and `apps/web/src/city/worldLayout.ts` carries **no civic footprint
   table at all** — a bought building's footprint comes from the catalogue, and the file says so in
   terms. Later eras' catalogues do use different civic plots (era three's are 1×2, 2×2, 3×2, 1×1).
   **So these four plots are not frozen by the letter of either rule, and whether they should be is
   an open question.** What is verified at this tip is the finding underneath it: **all four of era
   two's civic plots are identical to era one's four** — 2×1, 2×2, 2×2, 1×1 — which the previous-era
   column records as *"Yes"* on all four civic rows, and which open PR #293 confirms independently
   (`mergedAt: null`, so that is a statement about its diff and not about the tree). **A live proposal
   to move three of these plots was reported to this pass and could not be located as a document in
   this tree.** Flagged, not resolved.

---

## 3. Solvency, and the era-one wording it depends on

**§8.1's guarantee holds unchanged:** every population increase arrives with resource enough to
house and feed it, so a shortfall only ever originates in an allocation choice.

**From this era onward "farm" is the correct word for the food building** — era two is where
agriculture arrives. That matters because §8.1 says *"the first farm is free,"* and **era one is
pre-agricultural**, so that sentence is wrong for the era it describes. The finding is recorded
in `../era-01-prehistoric/civic-buildings.md` §4 and is **not resolved here**.

---

## 4. Legacy decay

**D-ERA23** applies to these four as well as to skill buildings: a frozen civic building keeps
working but contributes less against a city scaling by `2^(N-1)`. **The curve is open (O-5,
Gabriel)** and §7 calls it the single most load-bearing unset number in the economy.

§6.5 constrains the visual side: older buildings recede subtly, and **must not** converge with
the island-decay weathering language, because *"an old building is old, not neglected."*

---

## 5. Rules the copy and art must not break

Enumerated once in `../era-01-prehistoric/civic-buildings.md` §6 and inherited here in full.
The load-bearing ones: **INV-ERA-3** (happiness responds to how you built, never to how fast you
study — nothing may key off pace, absence, streaks or wall-clock time), **INV-COS-1** (no
shortfall gates a lesson, mastery, the trial, or an era advance), mastery gold `#FFB703` stays
reserved and can never be an era material, and nothing carries meaning by art alone.

---

## 6. CLOSED

**Nothing here is open as of 2026-07-29.** The four economy numbers are stated in full **once**, in
`../era-01-prehistoric/civic-buildings.md` §7, rather than nine times over.

| What | Resolution | Decided |
| --- | --- | --- |
| ~~**The capacity model**~~ | Two capacities, **livability** and **happiness**; **housing and food are INPUTS to livability**. This catalogue's figures already assume it | **Gabriel, 2026-07-29** |
| ~~**The aggregation**~~ | **ONE POOL** — `livability = Σ` every contribution, housing and food not tracked separately. Ruled `min(Σ housing, Σ food)` in #227 and re-ruled by the team lead the same day. **It changed this catalogue:** the Village Houses were a Granary on twice the ground, and now carry 10 happiness for the court their cells share (§2) | **Gabriel, 2026-07-29 (#227, re-ruled in #236)** |
| ~~**O-6** the stone → grain rate~~ | **Half the purchasing power survives:** `floor(amount × 0.5 / 2)`. So a leftover stone stockpile buys half as much grain as it bought stone | **Gabe, 2026-07-29 (#227)** |
| **O-4** teardown pricing | **25% of the CURRENT era's build cost for that type, no refund** | **Gabe, 2026-07-29** |
| **O-5** the legacy-decay curve | **`0.9 ^ (eras behind)`, floored at 0.5** | **Gabe, 2026-07-29** |
| **O-11** how much Boomtown theming survives | **The through-lines survive; the buildings and the place name do not.** These four are unaffected either way, being era-two civic types rather than re-dressed D2 identities. `style-guide.md` carries the ruling and the one content consequence it has for `content/lessons/d2/` | **Evan, 2026-07-29** |
| Whether four types is right for era two | **Yes. Four in every era**, for D-ERA24's reason rather than the art budget — see the box under `../era-01-prehistoric/civic-buildings.md` §3 | **Evan, 2026-07-29** |

---

## Appendix — withdrawn text, kept for the record and moved out of the way

**Why this section exists, 2026-07-30.** §2 is where an artist reads about these four buildings, so a
withdrawn wording quoted beside a live one is a trap rather than an audit trail. The record survives
here instead. **Nothing in this appendix is current.** `style-guide.md`'s own appendix carries the
same note in full, and the withdrawal banners that are *not* here — §0's two amended contract rows and
§2's height-as-an-order amendment — stay where they stand, because each is a **decision** whose
withdrawn half is what makes the decision legible in the nine files that cite it.

### B1 — moved out of §2, The Bread Oven. RECONCILED 2026-07-29 against the hub ruling

*The sentence's contrast had become false; the argument underneath it is unchanged and is live in §2.*

> It read *"which is why the era spends its happiness row on an oven rather than on a
> place of devotion"*, and before that *"which is why this is the amenity rather than a shrine"*.
> **In era two the place of devotion IS an oven.** The team lead ruled that this era's communal
> oven is its sacred hearth, which is why the hub is named **the Shrine** and is authored as a
> domed oven under a long thatch canopy (`style-guide.md` §5). *Oven* and *place of devotion* are
> therefore not opposites here, and a sentence resting on that opposition cannot stand.

---

## Related

- `style-guide.md` — the five skill buildings this era adds *(it re-dresses none: 2026-07-29)*, and the
  era's materials and palette.
- `../era-01-prehistoric/civic-buildings.md` — the authored template, the full rules list, and
  the two flagged contradictions.
- `../../2026-07-27-era-progression-design.md` — §6.4 freezing and era-exclusivity, §7 the
  economy, §8 happiness and solvency, §12 the asset budget.
