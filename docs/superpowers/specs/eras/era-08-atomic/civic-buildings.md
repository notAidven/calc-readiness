# Era 8 — Atomic Age: civic buildings

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

Era eight's answer to **O-12**, and to the identity half of **O-6**.

**Era multiplier: ×128.**

---

## 0. The contract

Skill buildings are **earned**; civic buildings are **bought** (D-ERA7). **Neither produces**
on a per-tick basis, and both are **frozen in the era they were built** — the Town Hall is the
one building that rethemes. Civic buildings are **frozen in era eight forever**, the catalogue is
**era-exclusive**, and there is **no renovation** (D-ERA11). Teardown only, for a cost, no
refund (D-ERA12). Full table in `../era-02-neolithic/civic-buildings.md` §0.

---

## 1. The era's resource: electricity

> **RENAMED 2026-07-29 from `kilowatt_hours` to `electricity`, by the team lead's recognisability ruling** —
> *every material must be immediately recognisable to the vast majority of users*. A kilowatt-hour is a *unit of measurement rather than a thing* — the lead's own example. Name the substance, not its unit.
> Seven of the ten ids changed in the same pass; the full before/after table and the reasoning
> are at `../../2026-07-29-era-resource-model-design.md` §4.1a, and the code landed in `#233`.

**Era eight's material is `electricity`.** It suits *the century that measured everything per
hour*, and it is the first resource in the sequence that is **generated rather than dug or
minted**, which is a genuine escalation over coal rather than a rename.

> **The pre-rename argument was that the resource was *measured rather than held*, and the
> rename is precisely a rejection of that**, so it is recorded rather than reworded. Being a
> measurement is what made `kilowatt_hours` fail: the ruling's second failure mode is *a unit of
> measurement rather than a thing*. `electricity` is the substance the unit measures.

It also sets up the last two eras cleanly: electricity, then silicon, then data. The
sequence ends in three resources that are all *substances of the information age*, which is what
makes the arc from stone feel like a civilization rather than a list.

---

## 2. The catalogue: four types

§7's anchors at **×128**. Illustrative anchors, not shipping numbers. Footprints in grid cells.

| Building | Footprint | Provides | Cost | Wins on | Loses on |
| --- | --- | --- | --- | --- | --- |
| **The Supermarket** | 2×2 | food for ~2,560 | 8,960 electricity | **resource efficiency** — the cheapest row in the era, and the supermarket is why | a big flat box — the least interesting silhouette in the era |
| **The Apartment Tower** | 1×1 | 2,560 livability | 18,560 electricity | **land efficiency, by a wide margin — one cell, the whole population** | **resource efficiency** — the era's steepest premium, and now the **dearest building in the era** at 2.07× the Supermarket |
| **The Swimming Pool** | 3×2 | 2,560 happiness | 14,080 electricity | the era's most-loved building, and it is cheaper than either the tower or the blend | **land efficiency badly** — 6 cells |
| **The Fire Station** | 2×1 | 1,280 livability + 1,280 happiness | 17,280 electricity | **the blend, and it fits along a frontage** | **resource efficiency** |

**How they trade (D-ERA24).** The Apartment Tower is the era's headline: **a single cell that
houses the whole city**, which is the most extreme land win in the run — and it costs accordingly.
**Since 2026-07-30 that sentence is priced rather than asserted**: the tower is the dearest of the
four, which no other era's dwelling is.
The paradox worth designing into is that **land is now cheap**, so its advantage is at its least
valuable exactly when it is at its greatest. That is the trade: the tower is a *tempting* purchase
that is usually the wrong one, and only correct when a quarter is genuinely boxed in.

**Cost dominates.** Seven expansions in, ground is plentiful, so the land column is nearly
decorative. This is the clearest illustration of D-ERA24's *"which is better depends on whether the
player is short of resource or short of space, which itself changes era by era as land expands."*

> ## ⚑ RE-PRICED 2026-07-30 — the ONE era whose dwelling is the dearest of its four
>
> **THE RULING (team lead, 2026-07-30, verbatim):** *"the buildings shouldn't all have the same
> price ratios and be priced the exact same relative to each other across eras. Doesn't need to be
> drastic; just some kind of variance would be nice."* Era eight's `10,240 / 12,800 / 12,800 / 15,360`
> was `1 : 1.25 : 1.25 : 1.5` — the same ratio vector as era four, with a tie in the middle of it.
>
> **The era's own words decided the new shape.** §2 calls the Apartment Tower *"the era's steepest
> premium"* while pricing it level with the Swimming Pool, so the superlative had nothing behind it.
> At **18,560** it is now the dearest building in era eight and the only dwelling in the run that is
> dearest in its own era — which is what *a single cell that houses the whole city* should cost. And
> this is the age of the supermarket, so the food row drops to **8,960** and becomes the era's
> cheapest, which is the other end of the same argument. The Pool holds the middle at **14,080** and
> the Fire Station at **17,280**.
>
> **What did NOT move.** The four plots, both contributions on all four rows, and era eight's
> **solvency** — the optimal city still costs 69,120 electricity against a mintable 76,797, which is
> still the narrowest margin in the run at 9.997% and still narrow for the same reason: this era's
> nine-node rate rounds down and lands 3 under 76,800. The ladder fixes what a city costs; this ruling
> only changes which of the four you pay it to.
>
> **The Fire Station's rename note below ends *"No number moved: 2×1, 1,280 livability + 1,280
> happiness, 15,360 electricity"*, and it stays true of the 2026-07-29 pass it was written for.** The
> plot and both contributions are current; the cost is now 17,280.

> ## ⚑ AMENDED 2026-07-29 — heights are stated as an ORDER, not as world-unit figures
>
> Each of the four below carried a `Height ~N units` figure while `style-guide.md` §3 states
> height as a ranking and says in terms that the guide *"deliberately gives no world-unit
> targets"*. **The ranking wins on a mechanical ground rather than an editorial one:** every stage
> is contain-fit to its plot by one uniform scale, so the same model stands at two different
> heights on two different plots and a figure is not something a modeller can aim at. Proportion
> is the only lever, and **the more slender of two neighbours is simply the taller one**
> (`../README.md`, "Constraints every guide inherits"; `../era-01-prehistoric/style-guide.md`
> §0) — which is exactly what §4's closed question about the 1×1 tower says in its own words.
> **Nothing is lost, because the order is what the figures were encoding** — The Apartment Tower,
> then The Swimming Pool, then The Fire Station, then The Supermarket — and it is now stated
> directly. **The 24-unit ceiling (`MAX_BUILD_HEIGHT`) is the one real number** and is a cap
> rather than a target, which is why the Apartment Tower's proximity to it is kept below as a
> fact about the cap. §4's decision record is left verbatim as the history of that ruling.
> Flagged independently by the era two, five and six image-generation briefs, so this is a
> folder-wide split between the two file types rather than an era-eight slip. **This is the only
> change made to this file:** the height clause of each `*Materials:*` line and nothing else,
> since this era's building briefs are being written right now.

### The Supermarket *(2×2, food)*

A single-storey box with a folded-plate concrete roof, a full-width glazed front under a deep
canopy, a service yard with refrigerated bays at the rear, a pole sign at the corner.

*Materials:* concrete folded-plate roof, plate glass, brick infill, steel canopy. **Height: the
lowest of the four.**

### The Apartment Tower *(1×1, livability)*

Twelve storeys on one cell: a concrete frame with infill panels in two alternating tones, ribbon
balconies on the long faces, a plant room and lift overrun on the roof, a glazed ground-floor
lobby. **Nothing in the game is this tall on this little ground**, and against the 24-unit ceiling
in `MAX_BUILD_HEIGHT` (`worldLayout.ts`) it should sit close to the cap.

*Materials:* precast concrete panel, plate glass, steel balcony rail. **Height: the tallest of the
four**, and one of the few buildings in the run authored close to the
ceiling, deliberately.

### The Swimming Pool *(3×2, happiness)*

A parabolic concrete shell over a glazed pool hall, a shallow diving stage at one end, a terrazzo
entrance block with a mosaic panel, sun terraces along the south side. The era's set piece, and
the building the shell roof exists for.

*Materials:* thin-shell concrete, plate glass, terrazzo, mosaic tile. **Height: second of the
four**, well below The Apartment Tower and above The Fire Station.

### The Fire Station *(2×1, blend)*

A low two-storey range: three appliance bays at ground level behind folding glazed doors with the
engines visible in them, watch and training rooms above behind ribbon glazing, a canted entrance
canopy, a drill tower at the far end, and a small paved forecourt with a hose-drying rack and a
noticeboard. **The doors are the whole point** — this is the one building in the era you can see
the machinery inside from the street.

*Materials:* concrete frame, brick infill, plate glass, aluminium trim. **Height: third of the
four**, above only The Supermarket, measured to the
roofline, the drill tower a little above it.

> **RENAMED 2026-07-29 from *The Community Centre*, which the lead called too broad — and "broad"
> is the exact defect.** *Community centre* is a **category** rather than a building: it is the
> word you use when you do not want to say which of a dozen things is inside. A learner reads it
> and knows only that something communal happens there, which is the recognisability rule's failure
> mode with plain English rather than with jargon. **It also duplicated its own era's hub**, whose
> ratified `town-hall` subtitle was *the Civic Centre* — so era eight held a Community Centre standing
> beside a "Civic Center, the Civic Centre". *(The hub was ruled to **the Heating Plant** later the
> same day, for the same reason read from the other side, so **the era now holds no *Centre* at
> all**.)*
>
> **A fire station is one specific institution, and it is a real blend rather than a themed one.**
> Every blend row in the run is a small public service with something loved attached — the well,
> the fountain, the chapel, the library, the hospital — and this is the mid-century version of
> exactly that: protection is a service the whole quarter draws on (the livability half) and the
> station is the building children are taken to see (the happiness half). It fits the shape it
> inherited almost unchanged: a 2×1 range along a frontage, a canted canopy, ribbon glazing above,
> a forecourt. **No number moved:** 2×1, 1,280 livability + 1,280 happiness, 15,360 electricity.

---

## 3. Where the numbers stop being readable, and what this file owes because of it

By era eight the population is in the thousands against `MAX_RENDERED_CITIZENS = 48`, so §7 is
explicit that **the crowd is a visual sample and the counter is the source of truth**. Players stop
being able to count by eye around era three.

**That is a constraint on this file, not only on the HUD.** A civic building's contribution has to
be legible as a **number in the DOM** rather than as a visible change in the crowd, because from
here the crowd cannot show it. Per D-CIT13 that readout lives in the DOM and never in the canvas
alone — which is also what keeps it accessible, since the canvas is `aria-hidden`.

---

## 4. Solvency, decay, and the rules

**§8.1's solvency guarantee** holds unchanged. **D-ERA23 legacy decay** applies; **the curve is
open (O-5, Gabriel)**. All copy and art rules are enumerated in
`../era-01-prehistoric/civic-buildings.md` §6 and inherited in full.

---

## 5. CLOSED

**Nothing here is open as of 2026-07-29.** Full statements in
`../era-01-prehistoric/civic-buildings.md` §7.

| What | Resolution | Decided |
| --- | --- | --- |
| ~~**The capacity model** contradiction~~ | Two capacities, **livability** and **happiness**; **housing and food are INPUTS to livability**, aggregated as **one pool** — `livability = Σ` every contribution. Ruled `min(Σ housing, Σ food)` in #227 and re-ruled by the team lead the same day, and **this era needed nothing either way**: it is one of the three whose sprawling food building is already cheaper than its compact Apartment Tower, so the trade survives both readings and no price moves | **Gabriel + Gabe, 2026-07-29 (#227, re-ruled in #236)** |
| ~~**O-6** the conversion rate~~ | **Half the purchasing power survives:** `floor(amount × 0.5 / 2)` | **Gabe, 2026-07-29 (#227)** |
| **O-4** teardown pricing | **25% of the CURRENT era's build cost for that type, no refund** | **Gabe, 2026-07-29** |
| **O-5** the legacy-decay curve | **`0.9 ^ (eras behind)`, floored at 0.5** | **Gabe, 2026-07-29** |
| Whether a 1×1 tower at ~22 units reads well at the locked tilt | **It reads, the footprint stays 1×1, and one authoring rule comes with it: model it with a SETBACK.** A shaft of constant section rising 22 units off a 4×4 footprint is exactly the spike the question worried about; a shaft that steps back once at roughly two-thirds height, with a shallow cap over the top, reads as a tower at this camera because the setback gives the silhouette a second horizontal to sit against. **Proportion is the only height lever an author has** — every stage is contain-fit to its plot by one uniform scale — so this is the same instrument era six's campanile uses. 22 units is comfortably inside the 24-unit `MAX_BUILD_HEIGHT` ceiling, so nothing here risks the silent squash. **A dev-server look is owed as verification** | **Evan, 2026-07-29** |

---

## Related

- `style-guide.md` — the nine skill buildings this era adds. *(It re-dresses none, per the
  2026-07-29 ruling.)*
- `../era-01-prehistoric/civic-buildings.md` — the authored template, the full rules list, and
  the two flagged contradictions.
- `../../2026-07-27-era-progression-design.md` — §6.4, §7, §8, §12.
