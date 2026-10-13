# Era 3 — Bronze Age: civic buildings

**Status: PROPOSED.** The companion to `style-guide.md`. That file covers the **skill
buildings** — earned 1:1 with lessons. This one covers the **civic
buildings**: bought, and **providing** the city's food, livability and happiness.

> **AMENDED 2026-07-29 by two team-lead rulings, both of which overturned a decided item.**
> *(1)* **There is no generation economy**: no building produces, so *"which **produce**"*
> is cut from the line above and from §0. A skill building's only credit was always the
> one-time lump paid for **completing its lesson**
> (`../../2026-07-29-era-resource-model-design.md` §5). *(2)* **Skill buildings no longer
> re-dress across eras** — only the Town Hall rethemes, on the stated grounds of art
> overhead (`../../2026-07-27-era-progression-design.md` §6.1, §6.4a). **The two classes are
> now split by how they are ACQUIRED — earned against bought — and nothing else.**

Era three's answer to **O-12**, and to the identity half of **O-6**.

**Era multiplier: ×4.**

---

## 0. The contract

Skill buildings are **earned**; civic buildings are **bought** (D-ERA7). **Neither produces**
on a per-tick basis, and both are **frozen in the era they were built** — the Town Hall is the
one building that rethemes. Civic buildings are **frozen in era three forever**, the catalogue is
**era-exclusive** — buildable only while the player is in this era — and there is **no
renovation** (D-ERA11). Teardown is the only way to reclaim the ground, for a cost and with no
refund (D-ERA12). Full contract table in `../era-02-neolithic/civic-buildings.md` §0.

---

## 1. The era's resource: bronze

> **RENAMED 2026-07-29 from `ingots` to `bronze`, by the team lead's recognisability ruling** —
> *every material must be immediately recognisable to the vast majority of users*. An ingot is *a shape metal comes in* — a specimen of a category — and the substance is the era's own name. Seven of
> the ten ids changed in the same pass; the full before/after table and the reasoning are at
> `../../2026-07-29-era-resource-model-design.md` §4.1a, and the code landed in `#233`.

**Era three's material is `bronze`.** Cast, weighed, stacked and traded — and it pairs with the
era's own theming (*what weight of tin balances this copper*) without any building carrying the
maths on its face, which D-ERA8 forbids.

It is the first resource in the sequence that is **made rather than gathered**, which is a real
escalation over stone and grain rather than a rename. In the HUD it wants to read as stacked
bars.

**It must not reach for mastery gold `#FFB703`.** Bronze reads as warm brown-green patina.

---

## 2. The catalogue: four types

§7's anchors at **×4**. Illustrative anchors, not shipping numbers. Footprints in grid cells.

| Building | Footprint | Provides | Cost | Wins on | Loses on |
| --- | --- | --- | --- | --- | --- |
| **The Terraced Fields** | 1×2 | food for ~80 | 260 bronze | **resource efficiency** — earthworks and water, not building | it is mostly ground — no vertical presence at all |
| **The Walled Houses** | 2×2 | 80 livability + 20 happiness | 340 bronze | **the enclosed court** — the building's own amenity, and a private one | **land efficiency** — the Fields sustain as many on half the ground, for 80 bronze less |
| **The Steam House** | 3×2 | 80 happiness | 460 bronze | the era's strongest single amenity | **land efficiency badly** — the largest civic footprint yet — **and cost: 1.77× the Fields**, the era's showpiece premium |
| **The Trading Post** | 1×1 | 40 livability + 40 happiness | 520 bronze | **the smallest plot** | **resource efficiency** |

**How they trade (D-ERA24).** The Walled Houses sustain the same 80 as the Terraced Fields, plus 20
happiness, because the enclosed court *is* an amenity and the residents have it to themselves — and
they pay for that by taking 2×2 where the Fields take 1×2 **and by costing 80 bronze more**.
**Without the court they would simply be Fields on twice the ground**, which the
pooled ruling (`../era-01-prehistoric/civic-buildings.md` §2) makes an outright D-ERA24 failure
rather than a dull choice. The Steam House is the first genuinely *desirable* amenity in the run,
and it is priced and sized so that wanting it costs you something real — 6 cells is a lot at this
point in the island's growth, and at 460 it is also the dearest amenity relative to its era's food
row in the first five eras. The Trading Post is dearest per unit and buys a plot.

**Land is still the sharp axis here, but less so than era two.** The island has grown once and
sixteen skill buildings stand. This is the last era where a 3×2 amenity is a genuinely painful
purchase; from era four onward the expanding island softens it, which is the shift D-ERA24
anticipates.

> ## ⚑ RE-PRICED 2026-07-30 — the era's own prices, and this era was one of the three sharing a shape
>
> **THE RULING (team lead, 2026-07-30, verbatim):** *"the buildings shouldn't all have the same
> price ratios and be priced the exact same relative to each other across eras. Doesn't need to be
> drastic; just some kind of variance would be nice."*
>
> **The row read `320 / 320 / 400 / 480`, which was era one's `80 / 80 / 100 / 120` at exactly ×4** —
> the same `1 : 1 : 1.25 : 1.5` era one, era two and era three all shared. Era two's was the case a
> teammate measured because it copied the footprints too; era three's was the same price shape
> without them.
>
> **What era three's own prices now say.** Bronze is *made rather than gathered* (§1), so
> **everything built carries a premium and the one thing that is not built is cheap**: the Terraced
> Fields are retaining walls, packed earth and sluices, so at 260 they are the cheapest of the four
> by a clear margin, while the Steam House — this era's showpiece, and §2's *"first genuinely
> desirable amenity in the run"* — rises to 460, **1.77× the Fields**. The enclosed private court is
> now a real 80-bronze premium over the open Fields rather than free.
>
> **What did NOT move.** Footprints, both contributions on all four rows, and era three's **city
> price**: still **2,160 bronze** against a mintable 2,400, because a city is bought as three of the
> cheaper livability row plus three amenities and `65 + 115` is the same 180 at era-one scale that
> `80 + 100` was. The ladder fixes what a city costs; this ruling changes only which of the four you
> pay it to.
>
> **ONE FIGURE DID MOVE.** The *exhaustively cheapest* city was **2,080** and is now **2,160** —
> equal to the price above. Four Walled Houses used to supply the Steam House's whole happiness
> contribution for less than three Fields plus three Steam Houses, and that only worked because the
> Houses and the Fields both cost 320. **The private court now costs 80 bronze over the open Fields,
> so the trick stops paying**, which is the uniformity being removed rather than a regression: era
> three's surplus falls from 320 to 240 and it still clears comfortably.
>
> **Two notes below say *"no number moved"* and both remain true of the 2026-07-29 naming pass they
> were written for.** The Steam House's cites `3×2, 80 happiness, 400 bronze` and the Trading Post's
> `1×1, 40 livability + 40 happiness, 480 bronze`; the plots and contributions still hold and the
> two costs are now 460 and 520.

> ## ⚑ AMENDED 2026-07-29 — heights are stated as an ORDER, not as world-unit figures
>
> Each of the four below carried a `Height ~N units` figure while `style-guide.md` §3 states
> height as a ranking and says in terms that the guide *"deliberately gives no world-unit
> targets"*. **The ranking wins on a mechanical ground rather than an editorial one:** every stage
> is contain-fit to its plot by one uniform scale, so the same model stands at two different
> heights on two different plots and a figure is not something a modeller can aim at. Proportion
> is the only lever, and **the more slender of two neighbours is simply the taller one**
> (`../README.md`, "Constraints every guide inherits"; `../era-01-prehistoric/style-guide.md`
> §0). **Nothing is lost, because the order is what the figures were encoding** — The Steam House,
> then The Walled Houses, then The Trading Post, then The Terraced Fields — and it is now stated
> directly. The one real number is the 24-unit ceiling (`MAX_BUILD_HEIGHT`), a cap rather than a
> target, and nothing in this era comes near it. Flagged independently by the era two, five and
> six image-generation briefs, so this is a folder-wide split between the two file types rather
> than an era-three slip.

### The Terraced Fields *(1×2, food)*

Two stepped earth terraces retained by undressed stone walls, a channel running along the upper
lip with timber sluice gates, crops in rows. Almost entirely horizontal — nothing rises on it
except the sluice frames.

*Materials:* undressed stone retaining, packed earth, timber sluices. **Height: the lowest of the
four**, and by a wide margin — this is ground rather than building.

### The Walled Houses *(2×2, livability)*

Mud-brick ranges on three sides of an enclosed court, flat roofs used as living space, a single
gated entrance. The era's dense dwelling and visibly a planned one, where era two's Village
Houses were accretive.

*Materials:* mud brick, timber beams, packed-earth roof terrace. **Height: second of the four**,
just below The Steam House.

### The Steam House *(3×2, happiness)*

A vaulted mud-brick hall over a stone-lined plunge basin, a smaller hot room with a hypocaust
under it, a colonnaded drying porch along the long side, steam standing under the vault and smoke
from the furnace end. The largest civic building the player has been offered so far, and **heat is
what it sells** — the furnace, the flue and the steam should read from outside.

*Materials:* mud brick, undressed and dressed stone, timber, the first visible cast-metal
fittings. **Height: the tallest of the four**, which its vaulted hall earns.

> **RENAMED 2026-07-29 from *The Bathhouse*, as one of three bathing buildings the run could not
> tell apart** — this one, era four's Baths and era seven's Public Baths. All three were a bath
> word plus nothing, or a bath word plus an adjective, so a learner met the same building three
> times. **They were three genuinely different institutions and the names now say which:** this
> era sells **heat** (a hot room over a hypocaust, the first heated building in the run), era four
> sells **a whole afternoon** (pool, hot room and an exercise court, for which *The Baths* is the
> true name and is kept), and era seven sells **a weekly wash** for houses with no bathroom, so it
> becomes *The Wash House*. Nothing here is an added adjective, which is what the naming rule in
> `../README.md` asks for. **No number moved:** 3×2, 80 happiness, 400 bronze.

### The Trading Post *(1×1, blend)*

A small square stone-footed building with a projecting timber canopy, a great balance beam
mounted beneath it, tally boards and sets of graded weights on shelves inside, bales and jars
stacked under the canopy waiting to be checked. Trade security *and* the confidence that comes
with fair measure.

*Materials:* undressed stone base, mud brick, timber canopy, bronze fittings and weights.
**Height: third of the four**, above only The Terraced Fields — one storey under a projecting
canopy.

> **RENAMED 2026-07-29 from *The Weigh House*, which failed the naming rule twice over.** A weigh
> house is a real institution and almost nobody could say what one is — it is the same class of
> failure as *the horrea* and *The Tithe Barn* in `../README.md`, a term the learner cannot look
> up and cannot be told, because a name has no sentence after it. **And it collided inside its own
> era**, against this guide's `yard` dressing *the Weighing Yard*, so the era had two buildings
> named for weighing. *Trading post* resolves on sight, and it is the institution this era is
> otherwise entirely about — the Bronze Age is where the folder puts trade, stamped weights and
> the island's first quay, with the advisor dressed and speaking as a weights-and-measures official.
> *(That role was named `Nabu` until `D-ET9` retired the nine surplus advisor names on 2026-07-30;
> the role and the register survive, the name does not.)* **The
> scales stay in the art**, which is where the fair-measure half of the blend lives. **No number
> moved:** 1×1, 40 livability + 40 happiness, 480 bronze.

---

## 3. Solvency, decay, and the rules

**§8.1's solvency guarantee** holds unchanged: population increases arrive with the resource to
cover them, so a shortfall only ever comes from an allocation choice.

**D-ERA23 legacy decay** applies to these four. Era one's civic buildings are now two eras
behind and beginning to fall off; **the curve is open (O-5, Gabriel)**.

**All the copy and art rules** are enumerated in `../era-01-prehistoric/civic-buildings.md` §6
and inherited in full — INV-ERA-3 (happiness never keys off study pace, absence, streaks or
wall-clock time), INV-COS-1 (no shortfall gates anything), gold reserved, nothing meaningful by
art alone.

---

## 4. CLOSED

**Nothing here is open as of 2026-07-29.** Full statements in
`../era-01-prehistoric/civic-buildings.md` §7.

| What | Resolution | Decided |
| --- | --- | --- |
| ~~**The capacity model** contradiction~~ | Two capacities, **livability** and **happiness**; **housing and food are INPUTS to livability**, aggregated as **one pool** — `livability = Σ` every contribution. Ruled `min(Σ housing, Σ food)` in #227 and re-ruled by the team lead the same day, which **did** reach this catalogue: the Walled Houses sustained the same 80 as the Terraced Fields for the same 320 on twice the ground, so they now carry 20 happiness for the enclosed court (§2). The old row cited this file's own ratings as evidence for the limiting factor — the dwelling winning land efficiency at 20 per cell against the food building's 40 — and that reading is what the pooled ruling retires | **Gabriel + Gabe, 2026-07-29 (#227, re-ruled in #236)** |
| ~~**O-6** the grain → bronze rate~~ | **Half the purchasing power survives:** `floor(amount × 0.5 / 2)` | **Gabe, 2026-07-29 (#227)** |
| **O-4** teardown pricing | **25% of the CURRENT era's build cost for that type, no refund** | **Gabe, 2026-07-29** |
| **O-5** the legacy-decay curve | **`0.9 ^ (eras behind)`, floored at 0.5** | **Gabe, 2026-07-29** |
| Whether four types is right for era three | **Yes. Four in every era** | **Evan, 2026-07-29** |

---

## Related

- `style-guide.md` — the five skill buildings this era adds. *(It re-dresses none — the eleven
  earlier buildings keep their own eras' looks, per the 2026-07-29 ruling.)*
- `../era-01-prehistoric/civic-buildings.md` — the authored template, the full rules list, and
  the two flagged contradictions.
- `../../2026-07-27-era-progression-design.md` — §6.4, §7, §8, §12.
