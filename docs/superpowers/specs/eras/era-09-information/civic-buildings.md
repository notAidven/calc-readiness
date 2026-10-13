# Era 9 — Information Age: civic buildings

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

Era nine's answer to **O-12**, and to the identity half of **O-6**.

**Era multiplier: ×256.**

---

## 0. The contract

Skill buildings are **earned**; civic buildings are **bought** (D-ERA7). **Neither produces**
on a per-tick basis, and both are **frozen in the era they were built** — the Town Hall is the
one building that rethemes. Civic buildings are **frozen in era nine forever**, the catalogue is
**era-exclusive**, and there is **no renovation** (D-ERA11). Teardown only, for a cost, no
refund (D-ERA12). Full table in `../era-02-neolithic/civic-buildings.md` §0.

---

## 1. The era's resource: silicon

> **RENAMED 2026-07-29 from `compute_cycles` to `silicon`, by the team lead's recognisability ruling** —
> *every material must be immediately recognisable to the vast majority of users*. A compute cycle *measures* work instead of being a substance. `silicon` is the substance — the era's own rationale is "doubling transistors, orders of magnitude", and transistors are silicon. `microchips` was considered and refused on the ruling's own logic: a chip is a manufactured specimen, exactly the way an ingot was.
> Seven of the ten ids changed in the same pass; the full before/after table and the reasoning
> are at `../../2026-07-29-era-resource-model-design.md` §4.1a, and the code landed in `#233`.

**Era nine's material is `silicon`.** §7 names the sequence's endpoint as `data`, so this era
wants the step just before it — the **substance the computing is done on**, which sets up era
ten's data without duplicating it. "Silicon Valley" has already done the recognisability work for
a global audience.

> **The pre-rename argument does not transfer and is recorded rather than reworded.** This section
> argued that *"against era eight's kilowatt-hours, cycles are the same idea one level up: energy
> spent becomes work done"*. **Both halves of that comparison were renamed** — era eight is now
> `electricity` — and the argument was in any case for a unit over a substance, which is the thing
> the ruling forbids. What survives is its conclusion: the last three eras must not all read as
> "some abstract number", and **electricity, silicon, data** are three substances rather than
> three abstractions, so it holds better than it did.

---

## 2. The catalogue: four types

§7's anchors at **×256**. Illustrative anchors, not shipping numbers. Footprints in grid cells.

| Building | Footprint | Provides | Cost | Wins on | Loses on |
| --- | --- | --- | --- | --- | --- |
| **The Distribution Center** | 2×2 | food for ~5,120 | 15,360 silicon | **resource efficiency** — global logistics put this level with era seven's, the cheapest food coefficient in the run | it is a shed with a logo; contributes nothing to the skyline |
| **The Condominium** | 1×1 | 5,120 livability | 24,320 silicon | **land efficiency** | **resource efficiency** |
| **The Roof Garden** | 3×2 | 5,120 happiness | 30,720 silicon | it is the only green in a glass city, and it reads from any angle | **land efficiency** — 6 cells, and mostly not building — **and cost**: at 2× the Distribution Center it carries the largest amenity premium in the run |
| **The Hospital** | 1×2 | 2,560 livability + 2,560 happiness | 33,280 silicon | **the blend, in a shape that lines a street** | **resource efficiency** |

**How they trade (D-ERA24).** By now the pattern is established and the interesting question is
the one this era makes hardest — see below. Note the Roof Garden is the era's *only* building that is
mostly ground, which after eight eras of increasing density is what makes it desirable rather than
merely pleasant — **and since 2026-07-30 that scarcity is in its price**: open ground is what a glass
city has least of, so the Garden takes the largest amenity premium in the catalogue.

> ## ⚑ RE-PRICED 2026-07-30 — the cheapest logistics in the run against the dearest amenity
>
> **THE RULING (team lead, 2026-07-30, verbatim):** *"the buildings shouldn't all have the same
> price ratios and be priced the exact same relative to each other across eras. Doesn't need to be
> drastic; just some kind of variance would be nice."* Era nine's `20,480 / 23,040 / 25,600 / 30,720`
> was `1 : 1.125 : 1.25 : 1.5`, the same ratio vector as eras five and six.
>
> **The new shape reads the era's two extremes off its own art descriptions.** The Distribution Center
> is *"a shed with a logo"* in the era that invented same-day delivery, so it drops to **15,360** and
> draws level with era seven's as the cheapest food coefficient in the run. The Roof Garden is *"the only
> green in a glass city"* — the one thing this era genuinely cannot buy cheaply — so it rises to
> **30,720**, twice the Center, which is the largest amenity premium in the catalogue. The
> Condominium sits at **24,320** and the Hospital keeps the blend's place at **33,280**.
>
> **§2's *"hardest era for different, not better"* rule is not breached, and it is worth checking
> rather than asserting.** That rule forbids adding *"a second advantage on top of the multiplier — no
> better ratios, no extra effects, no lower relative cost"* against an earlier era. Era nine's **city
> still costs 540 at era-one scale**, exactly as era three's does: the optimal city is 138,240 silicon
> against a mintable 153,600, unchanged by this pass. What moved is the distribution of that price
> among the four, which is a within-era question and the only one this ruling is about.
>
> **What did NOT move.** The four plots, both contributions on all four rows, and the solvency figure
> above. **Three notes below cite a cost and all three stay true of the pass they were written for**:
> the Distribution Center's rename records *"still 20,480 silicon"*, and the hospital-swap notes cite
> the Condominium at *"1×1, 5,120 livability, 23,040 silicon"* and the Roof Garden at *"5,120
> happiness, 25,600 silicon"*. The plots and contributions still hold; the costs are now 15,360,
> 24,320 and 30,720.

### The hardest era for "different, not better"

**D-ERA24's rule is under most strain here.** Nine eras of catalogues sit behind the player, and an
Information Age building is the most plausible candidate for being simply *stronger* than a Bronze
Age one — which is exactly the ladder the decision forbids.

**The resolution, stated so nobody re-derives it wrongly: era scaling already handles cross-era
power.** Every value moves by `2^(N-1)`, so a Bronze building is weaker in absolute terms *and*
proportionally correct for when it was built. **What this file must not do is add a second
advantage on top of the multiplier** — no better ratios, no extra effects, no lower relative cost.
Within era nine the four options must trade against each other, and against era three they should
be *equivalent in proportion*.

> ## ⚑ AMENDED 2026-07-29 — heights are stated as an ORDER, not as world-unit figures
>
> Each of the four below carried a `Height ~N units` figure while `style-guide.md` §3 states
> height as a ranking and says in terms that the guide *"deliberately gives no world-unit
> targets"*. **The ranking wins on a mechanical ground rather than an editorial one:** every stage
> is contain-fit to its plot by one uniform scale, so the same model stands at two different
> heights on two different plots and a figure is not something a modeller can aim at. Proportion
> is the only lever, and **the more slender of two neighbours is simply the taller one**
> (`../README.md`, "Constraints every guide inherits"; `../era-01-prehistoric/style-guide.md`
> §0). **Nothing is lost, because the order is what the figures were encoding** — The
> Condominium, then The Hospital, then The Distribution Center, then The Roof Garden's podium, with
> the Garden's trees as the one thing that rises past the Center's roofline — and it is now
> stated directly, the Garden's two levels included. The one real number is the 24-unit ceiling
> (`MAX_BUILD_HEIGHT`), a cap rather than a target, and the Condominium's proximity to it is kept
> below as a fact about the cap. Flagged independently by the era two, five and six
> image-generation briefs, so this is a folder-wide split between the two file types rather than
> an era-nine slip. **This is the only change made to this file:** the height clause of each
> `*Materials:*` line and nothing else, since this era's building briefs are being written right
> now.

### The Distribution Center *(2×2, food)*

A tilt-slab shed with a long dock face, trailers on the apron, a small glazed office corner, roof
plant and solar array. Deliberately banal.

*Materials:* precast concrete panel, profiled steel roof, plate glass corner. **Height: third of
the four**, above only The Roof Garden's podium.

> ## ⚡ RENAMED **The Food Warehouse → The Distribution Center** by the team lead, in the consolidated pass
>
> **The row is unchanged in every number**: still 2×2, still food for ~5,120, still 20,480 silicon,
> still the **food** role, still third of the four on height, and the building above is unchanged.
> Only the display name moves, and it moves **on both sides at once** —
> `packages/economy/src/civicCatalogue.ts` carries the same string under the stable id
> `information_age_food_warehouse`, which does **not** change with a display name, and
> `test/eraCivicCatalogueParity.test.ts` joins the two copies on `era/name`, so either half alone
> would fail it.
>
> **It closes a *warehouse* the run was spending twice.** `../era-04-classical/style-guide.md`'s
> subtitle row records rejecting *the Warehouse* for `POL.4` partly because it *"would have made a
> third warehouse in the run beside era seven's and era nine's civic one"* — this being era nine's.
> With this rename the bought column holds no *Warehouse* at all, and era four's reasoning is now
> over-satisfied rather than merely honoured.
>
> **TWO THINGS ARE REPORTED, neither of them a reason to hold the rename.**
>
> *(1)* **This is the only food name in the run that does not name food or where food is kept.** The
> other nine are *The Smokehouse, The Granary, The Terraced Fields, The Grain Dock, The Great Barn,
> The Covered Market, The Cold Store, The Supermarket* and *The Vertical Farm*.
> `output/imagegen/era-07-industrial-building-briefs/README.md` made exactly this objection against a
> *pending* rename of era seven's food row and observed that *"on the buy menu the name is the only
> thing telling a player which is which."* **The art answers it as far as art can** — the dock face,
> the trailers and the apron are all still authored — but the name does not.
>
> *(2)* **It re-introduces a *Cent(er/re)* into this era, which an earlier pass removed.** The skill
> `store` cell was *the Distribution Centre* before it became *the Parcel Depot*, and one recorded
> reason was that it *"would also have made a second *Centre* in one era beside the Data Centre"*.
> Era nine's `hall` is still **the Data Centre**, so the era now holds *The Distribution Center* and
> *the Data Centre* at once — **one bought, one earned, and spelled differently**, American in the
> catalogue against British in the subtitle row, which era nine's own brief had already logged as a
> cosmetic inconsistency against the stable hub name *Civic Center*. **There is no exact collision**
> and the one-namespace check clears it; the two share a head noun and their qualifiers are a
> logistics verb against a substance, which passes the *synonymous qualifiers are the defect* test.
> **Reported, not re-litigated.**

### The Condominium *(1×1, livability)*

Fifteen storeys of composite cladding in two tones, projecting balconies on alternating floors, a
double-height glazed lobby with a desk in it, and a plant screen at the crown. **The lobby is what
the name is for** — a managed entrance with somebody behind a counter is what separates this from
every earlier dwelling in the run, which had a door.

*Materials:* composite panel, plate glass, anodised balcony rail. **Height: the tallest of the
four**, and authored close to the
`MAX_BUILD_HEIGHT` ceiling.

> ## ⚑ RENAMED 2026-07-29 from *The Residential Tower*, and it had to clear TWO collisions, not one
>
> **The one that was flagged:** this era's skill `tower` dressing is **the Office Tower**, so the era
> held a Residential Tower beside an Office Tower — and under the freeze ruling both stand in the
> same city permanently. *Office Tower* is the concrete, era-locked half of that pair and the `tower`
> column is on the lead's keep list, so **the bought building is the one that moved.**
>
> **The one nobody had raised, and it is the reason a bare rename was not enough:** era eight's
> bought housing is **The Apartment Tower**. Two *adjacent* eras whose bought housing was
> *&lt;adjective&gt; Tower*, both frozen, both in the same buy history. A replacement that cleared
> *Office Tower* but kept *Tower* would have solved one axis and left the other, so **the word had to
> go entirely** — which also rules out *Apartment*, *Flats* (this era's own skill dwelling is the
> **Podium Flats**, since renamed the **Glass Apartments**), *Block* (era eight's skill dwelling is
> the **Walk-Up Blocks**, since renamed the **Housing Blocks**) and *Homes* (era ten's bought
> housing is the **Capsule Homes**, since renamed **The Pod Apartments**).
>
> > **RE-CHECKED after the consolidated rename pass, and the conclusion holds while three of its
> > four premises have moved.** *Flats* and *Homes* have both left the run — era nine's skill
> > dwelling is now *the Glass Apartments* and era ten's bought housing is *The Pod Apartments* — and
> > *Block* survives only in era eight's *the Housing Blocks*. **So two of the words this bullet
> > ruled out are now free, and *Apartment* — which it also ruled out — is now used by two other
> > buildings.** `Condominium` is nevertheless **kept**: it was chosen for being *unambiguously
> > housing* and *an institution rather than a form*, and neither reason depended on the words that
> > moved. **What is no longer available as an argument** is the sentence that the word *Apartment*
> > *"had to go entirely"*; the lead has since put *Apartments* in eras nine and ten deliberately,
> > and `../README.md`'s own rule is that a repeated head noun is not the defect. Nothing here is a
> > rename recommendation.
>
> **Why *Condominium*.** It is the one candidate left that is **unambiguously housing**, which is the
> naming rule's primary test and the thing *The High-Rise* — the obvious alternative — fails: a
> high-rise beside an Office Tower does not tell a learner which of the two it is. A condominium is
> also an **institution rather than a form** — owned flats in a managed building with shared
> amenities — and that is what §2's art already draws: the double-height glazed lobby, the plant
> screen, and the private podium garden this era's skill dwelling carries. It is era-locked to the
> late-century condo development in the way *Lighthouse* is era-locked to a port.
>
> **What it costs, stated rather than hidden.** *Condominium* is the most formal word in the civic
> column and more Latinate than the rule likes. The judgement is that a learner meets it constantly
> in property listings and on television and can define it; it is nowhere near *horrea* or *insula*.
> **If the lead disagrees, the fallback is *The High-Rise*** and the cost of taking it is the
> ambiguity above. **No number moved:** 1×1, 5,120 livability, 23,040 silicon.

### The Roof Garden *(3×2, happiness)*

A whole garden carried on the roof of a podium, so the ground floor is a city and the first floor
is a park: lawn, clipped trees and a long water channel on top, a spiral ramp and a glass lift
climbing the outside, planting spilling over the parapet, glazed retail and a station entrance
tucked underneath. **The point is the level change** — you go up to reach the green, and from the
deck you look down on the glass city rather than along it.

*Materials:* concrete podium, plate-glass retail base, deck planting, stone paving, glass
balustrade. **Height: the lowest built mass of the four** — but the trees on the deck are the one
thing in this catalogue that rises past The Distribution Center's roofline, so the podium ranks last
and the planting reads above it.

> **RENAMED 2026-07-29 from *The Park*, on the lead's note that it could be more exciting.** *The
> Park* was the flattest name in the catalogue and it undersold the building it was attached to,
> which was never a park at ground level: the description already had it raised on a podium over
> shops and a station, and that is the interesting thing about it. **A roof garden is the same
> object with the surprise put into the name** — everyone knows what one is, so nothing is spent on
> recognisability, and it dates the building to the era of the podium development rather than to
> any century with grass in it. It also stops sharing a word with this era's own `yard` dressing,
> *the Campus Green*, and with era one's newly renamed `yard` mass. **No number moved:** 3×2,
> 5,120 happiness, 25,600 silicon.

### The Hospital *(1×2, blend)*

A six-storey range with the era's sealed skin: a glazed ground-floor entrance and waiting hall
under a deep canopy, ward and treatment floors above behind horizontal louvres, a heli-pad and
plant screen on the roof, an ambulance bay at one end with its own canopy, and a small planted
courtyard the wards look into. **The full institution rather than a front door to one** — this is
where the whole city goes, and it should read as the most serious building on its street.

*Materials:* composite panel, plate glass, aluminium louvre, anodised canopy. **Height: second of
the four**, below The Condominium and clear of everything else.

> **THE HOSPITAL MOVED HERE FROM THE RENAISSANCE ON 2026-07-29, and this slot used to be *The
> Clinic*.** The lead's instruction was that the Information Age should have the hospital and era
> six should get something artsier. **It is a clean swap and deliberately nothing more:** both
> blends were already **1×2**, so the two eras exchanged identities with no footprint, contribution
> or cost moving on either side. This era keeps 1×2, 2,560 livability + 2,560 happiness, 30,720
> silicon; era six keeps 1×2, 320 + 320, 3,840 gems, and is now **The Painters' School**.
>
> **What the swap fixes is that the run was spending two of its forty names on one institution.**
> *The Clinic* here and *The Hospital* in era six are the same building at two sizes, three eras
> apart, and a player ends the run holding both — the same near-indistinguishability the bathing
> trio had. Consolidating on **one** medical building, in the era a learner would expect a modern
> hospital, costs nothing and buys era six a name that is actually Renaissance.
>
> **The description grew with the name and the numbers did not.** A clinic is a waiting room and a
> few consulting suites; a hospital has wards, a heli-pad and an ambulance bay, so the art brief is
> larger even though the plot is identical. That is the right direction — this era's own §2 warns
> against giving a late building **a second advantage on top of the era multiplier**, and a taller
> model on the same 1×2 for the same cost is silhouette rather than power.
>
> > **⚑ 2026-07-30: this note said *"the same 30,720 silicon"* and the figure is now the Roof
> > Garden's.** The Hospital is **33,280** since the re-pricing pass in §2, so leaving the number in
> > would have named a different building in the same era. The sentence's point — *the description
> > grew and the numbers did not* — is unchanged and is true of the swap it describes: the swap moved
> > no cost, and a later pass moved this one. The two other figures this box states are current: still
> > 1×2, still 2,560 + 2,560.

---

## 3. Solvency, decay, and the rules

**§8.1's solvency guarantee** holds unchanged. **D-ERA23 legacy decay** applies; **the curve is
open (O-5, Gabriel)**. All copy and art rules are enumerated in
`../era-01-prehistoric/civic-buildings.md` §6 and inherited in full — including that a civic
building's contribution must be legible as a **number in the DOM**, since from era eight onward the
crowd is only a visual sample.

---

## 4. CLOSED, with one owed TEST that is not an open question

**No design question here is open as of 2026-07-29.** Full statements in
`../era-01-prehistoric/civic-buildings.md` §7.

| What | Resolution | Decided |
| --- | --- | --- |
| ~~**The capacity model** contradiction~~ | Two capacities, **livability** and **happiness**; **housing and food are INPUTS to livability**, aggregated as **one pool** — `livability = Σ` every contribution. Ruled `min(Σ housing, Σ food)` in #227 and re-ruled by the team lead the same day, and **this era needed nothing either way**: it is one of the three whose sprawling food building is already cheaper than its compact Condominium, so the trade survives both readings and no price moves | **Gabriel + Gabe, 2026-07-29 (#227, re-ruled in #236)** |
| ~~**O-6** the conversion rate~~ | **Half the purchasing power survives:** `floor(amount × 0.5 / 2)` | **Gabe, 2026-07-29 (#227)** |
| **O-4** teardown pricing | **25% of the CURRENT era's build cost for that type, no refund** | **Gabe, 2026-07-29** |
| **O-5** the legacy-decay curve | **`0.9 ^ (eras behind)`, floored at 0.5.** By era nine the first three eras' quarters are all on the floor, which is the intended end state: charming, half useful, never a liability | **Gabe, 2026-07-29** |
| Whether "equivalent in proportion to era three" holds once real numbers exist | **It holds by construction, and that is the answer rather than a deferral — but the sweep is still owed and it is mine.** Every cost and every provided value scales by `ERA_COST_MULTIPLIER_STEP ** (N-1)` and nothing else, so a catalogue priced off the base table is proportionally identical to era three's by arithmetic: the ×256 cancels. **What a sweep can still catch is a transcription error** — a figure typed rather than derived — which is why it stays owed as a **test over all ten catalogues** rather than as a design question, and lands with the economy implementation | **Gabe, 2026-07-29** |

---

## Related

- `style-guide.md` — the six skill buildings this era adds. *(It re-dresses none, per the
  2026-07-29 ruling.)*
- `../era-01-prehistoric/civic-buildings.md` — the authored template, the full rules list, and
  the two flagged contradictions.
- `../../2026-07-27-era-progression-design.md` — §6.4, §7, §8, §12.
