# Era 7 — Industrial Era: civic buildings

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

Era seven's answer to **O-12**, and to the identity half of **O-6**.

**Era multiplier: ×64.**

---

## 0. The contract

Skill buildings are **earned**; civic buildings are **bought** (D-ERA7). **Neither produces**
on a per-tick basis, and both are **frozen in the era they were built** — the Town Hall is the
one building that rethemes. Civic buildings are **frozen in era seven forever**, the catalogue is
**era-exclusive**, and there is **no renovation** (D-ERA11). Teardown only, for a cost, no
refund (D-ERA12). Full table in `../era-02-neolithic/civic-buildings.md` §0.

---

## 1. The era's resource: coal

**Proposed answer to O-6: coal.** It is the era's literal input, it reads as **consumable** where
the last three resources all read as money, and it makes *a machine is input to output* physical
without a building having to carry the maths (D-ERA8).

It is also the first resource since grain that is **burned rather than banked**, which resets the
sequence's texture before it abstracts again into electricity, silicon and data.

> **Era seven's own id `coal` is UNCHANGED** by the 2026-07-29 recognisability ruling — a substance,
> a category, known to everyone. **But this file was NOT on the ruling's list of stale documents and
> should have been**, because the sentence above cites eras eight and nine by their retired names
> (`kilowatt-hours`, `compute cycles`). Corrected. **Recorded because it is the general failure:** a
> rename recorded at the definition site does not reach the citation sites, and a file whose own id
> did not move is exactly the file nobody re-reads.

---

## 2. The catalogue: four types

§7's anchors at **×64**. Illustrative anchors, not shipping numbers. Footprints in grid cells.

| Building | Footprint | Provides | Cost | Wins on | Loses on |
| --- | --- | --- | --- | --- | --- |
| **The Food Works** | 2×2 | food for ~1,280 | 3,840 coal | **resource efficiency — the cheapest livability in the run so far** | pure infrastructure, and it is noisy scenery beside housing |
| **The Workers' Houses** | 2×1 | 1,280 livability | 4,480 coal | **land efficiency** — 1,280 people on two cells where The Food Works needs four | **resource efficiency** — The Food Works sustains as many for 640 less, and they can only ever be built in strips |
| **The Railroad Station** | 2×2 | 1,280 happiness | 6,400 coal | it is the era's genuine social good, and **easier travel is the amenity** | **resource efficiency** — dearest amenity yet relative to a dwelling |
| **The Library** | 1×1 | 640 livability + 640 happiness | 7,680 coal | **the smallest plot** | **resource efficiency** |

**How they trade (D-ERA24), and note the inversion.** The **industrial era makes bulk cheap**: The
Food Works sustains 1,280 for 3,840 coal, the best price per person anywhere in the run so far, and
it pays for that by eating four cells and being noisy scenery next to housing. The Workers' Houses
sustain the same 1,280 on **two** cells for 640 more — the player short of coal builds the works and
plans around it, the player short of ground builds terraces, and the player with coal to spare buys
a Railroad Station and a Library. That is the axis genuinely trading rather than one building
dominating.

**The food row cost 5,120 until 2026-07-29, and at that price it was dominated.** *(It was called
**The Cold Store** then, and through the rename pass; the name on it now is **The Food Works** —
see §5's swap banner. The plot, the cost and the capacity are the same row throughout.)* It was
dearer than the Workers' Houses *and* twice their footprint, for the same 1,280 once the pooled
livability ruling (`../era-01-prehistoric/civic-buildings.md` §2) made food and housing one
contribution — worse on every axis the model can see, so nobody would ever have built one. Cutting
it to 3,840 gives the building the property its own `Wins on` column already claimed, rather than
making the houses worse; era seven is the era where bulk logistics get cheap, so this is the era
that should carry it. The superlative moved with the number: the Workers' Houses were *"the cheapest
livability in the run so far"* and the food row now is. **What the four axes cannot see is the
strips**: two
cells in a line need frontage, and a 2×1 is harder to place than its cell count suggests. That is a
real cost of the Workers' Houses and it is deliberately not priced in, because a footprint axis
measures area.

**Cost is now the sharp axis.** Six expansions in, land is comparatively plentiful, so the
land-efficiency column matters least it ever has — which is exactly the era-by-era shift D-ERA24
describes.

> ## ⚑ AMENDED 2026-07-29 — heights are stated as an ORDER, not as world-unit figures
>
> Each of the four below carried a `Height ~N units` figure while `style-guide.md` §3 states
> height as a ranking and says in terms that the guide *"deliberately gives no world-unit
> targets"*. **The ranking wins on a mechanical ground rather than an editorial one:** every stage
> is contain-fit to its plot by one uniform scale, so the same model stands at two different
> heights on two different plots and a figure is not something a modeller can aim at. Proportion
> is the only lever, and **the more slender of two neighbours is simply the taller one**
> (`../README.md`, "Constraints every guide inherits"; `../era-01-prehistoric/style-guide.md`
> §0). **Nothing is lost, because the order is what the figures were encoding** — The Library,
> then the happiness row, then the food row, then The Workers' Houses — and it is now stated
> directly. *(By the names the rows carry now: The Library, **The Railroad Station**, **The Food
> Works**, The Workers' Houses. The order is a property of the rows and the row swap did not move
> it.)* The one real number is the 24-unit ceiling (`MAX_BUILD_HEIGHT`), a cap rather than a
> target. Flagged independently by the era two, five and six image-generation briefs, so this is
> a folder-wide split between the two file types rather than an era-seven slip. **This is the only
> change made to this file:** the height clause of each `*Materials:*` line and nothing else, since
> this era's building briefs are being written right now.

### The Food Works *(2×2, food)*

A brick cold store with a louvred vent tower and an ice hoist, alongside a covered loading dock on
a short siding, crates and churns stacked under the canopy. Unglamorous and busy.

*Materials:* brick, cast-iron columns, slate, timber dock. **Height: third of the four**, below
The Railroad Station and above The Workers' Houses.

> **This is the SAME BUILDING that stood here as The Cold Store — the name moved onto it, the form
> did not move.** The row swap put *The Food Works* on the row that actually holds the food, and the
> building it names is the one already authored above: the vent tower, the ice hoist, the siding and
> the churns are untouched, and so are the 2×2 plot, the 3,840 coal and the food for ~1,280. **No
> third form was written for this row.** A Victorian *works* is any municipal industrial plant, and a
> cold store on a siding is exactly that — which is the reading the name needed and could not get
> while it sat on the amenity row.

### The Workers' Houses *(2×1, livability)*

Two storeys of repeated brick bays under one slate roof, sash windows, a shared rear yard with
privies and a wash line, chimney stacks at regular intervals. **The most people on the least ground
of any dwelling in the run so far**, and it should read as decent rather than as squalid — see the
tone note below.

*Materials:* brick, slate, sash timber, cast-iron rainwater goods. **Height: the lowest of the
four.**

### The Railroad Station *(2×2, happiness)*

A passenger station whose front **is** a glazed iron train shed: an arched roof of iron ribs and
glass springing from a low brick plinth, open at the gable end so the platform, the canopy line and a
waiting tank engine read straight through it. Across the front, a brick booking hall under a clock in
a shaped gable, round-arched doors with the era's confident lettering over them, and a platform
canopy on cast-iron brackets. Passengers with cases, hampers and parcels, a porter with a barrow,
and a departure board. **The amenity is that ordinary people can now travel** — the shed is open and
the platform is busy, and both are visible from outside without entering.

*Materials:* brick with stone dressings, iron-and-glass shed, cast iron, slate on the booking hall.
**Height: second of the four**, just below The Library — the arched shed carries it.

> ## ✅ THE TWO ROWS WERE SWAPPED, and each name now says what its row does
>
> | Row | Was | **Now** |
> | --- | --- | --- |
> | **food** *(2×2, 3,840 coal, food for ~1,280)* | The Cold Store | **The Food Works** |
> | livability *(2×1, 4,480 coal)* | The Workers' Houses | *unchanged* |
> | **happiness** *(2×2, 6,400 coal, 1,280 happiness)* | The Wash House | **The Railroad Station** |
> | blend *(1×1, 7,680 coal)* | The Library | *unchanged* |
>
> **No number moved on either row.** Plot, cost, capacity, role and height order are all as they
> were; what changed is which name sits on which row, plus one new authored form for the happiness
> row. Both ids are stable — `industrial_cold_store` now displays *The Food Works* and
> `industrial_public_baths` now displays *The Railroad Station* — and
> `test/eraCivicCatalogueParity.test.ts` joins the two copies on `era/name`, so it would fail on
> either half alone.
>
> **THIS CLOSES THE DEFECT THIS FILE REPORTED RATHER THAN CARRYING IT.** The consolidated pass had
> renamed the *amenity* row to *The Food Works*, and this file recorded the consequence: `../README.md`'s
> naming rule says in as many words that *"a name that points at a **different** mechanic than its row
> is worse than a vague one … era one's blend was The Storage Pit and it provides **no food at all**,
> so the name promised the food row's job."* A building called *The Food Works* on the happiness row,
> standing on the buy menu beside the row that actually held the food, was that defect exactly. **The
> lead's fix moves the name to the row it describes instead of renaming again**, so the report is
> resolved at its cause and `The Food Works` now names food that exists.
>
> **`The Railway Depot` NEVER LANDS, and its objection is retired with it.** It had been pending
> against the *food* row, and `output/imagegen/era-07-industrial-building-briefs/README.md` argued at
> length that a depot names goods held rather than people fed. **That argument is not overruled — it
> is unnecessary**, because the food row is now *The Food Works* and no depot is proposed anywhere.
> The happiness row takes **The Railroad Station** instead, and the lead's reason is worth recording
> because it is what earns the row: **the amenity is easier travel.** A station is not a name pointing
> at a mechanic it does not have; getting about is the social good, which is why it can hold happiness
> where a goods depot could not.

> ## ⚠ ERA SEVEN LOSES ITS BATHING BUILDING, and this is a real reduction in what the era offers
>
> **The happiness row was the baths-and-wash-house, and that building is now gone from the run.** It
> is not renamed and not re-authored — the row's 1,280 happiness is now provided by a station, and
> nothing in era seven is a bathing building any more. Recorded rather than left to vanish, because
> the loss is invisible in the numbers: the row still reads 2×2 / 6,400 coal / 1,280 happiness either
> way.
>
> **What the era gives up.** The washing hall with its stone troughs and mangles, the walled drying
> yard, the plunge pool under its glazed lantern, and the one social good in the run that was *"where
> a whole street both washed itself and washed its clothes, once a week"* — the wash-house half that
> `../README.md` recorded as **the half no other era has**. Nobody in Rome brought their laundry, so
> when era seven leaves the family that institution leaves the run entirely, rather than moving to
> another era.
>
> **What the run keeps.** Bathing survives as **era three's The Steam House** and **era four's The
> Baths**, and era eight's swimming pool is a different thing again. `../README.md` recorded of the
> three bathing names that *"the three now share no word"* — **still true, and now trivially so,
> since there are two.**
>
> *(History of the row's names, kept because it is three moves deep: **The Public Baths** → **The
> Wash House** in the 2026-07-29 recognisability pass, because *Public* did no work when era four's
> baths were public too → **The Food Works** in the consolidated rename pass → **The Railroad
> Station** here, when the row swap moved the food name to the food row. Only this last move changed
> the building.)*

### The Library *(1×1, blend)*

A narrow three-storey brick building: reading room at ground level with tall windows, a lecture
room above, the stacks at the top, a stone doorcase. Education and dignity on one cell.

*Materials:* brick, stone dressings, slate. **Height: the tallest of the four** — tall and thin, which is what makes
1×1 work.

---

## 3. The tone risk this era carries, and the rule that bounds it

The Industrial Era is where a city-builder naturally reaches for **squalor** — overcrowding, smoke,
slums — as visual interest. Two things forbid the reading that would make it punitive:

- **INV-ERA-3 / D-ERA14:** happiness responds to **how you built**, never to how fast the player
  studies, and nothing may key off study pace, absence, streaks, or wall-clock time of any kind. A
  shortfall here must read as a management choice the player made.
- **`../../../../Game_Visual_Design_Brief.md`** bans artificial scarcity and guilt framing
  outright.

**So industrial grime is period texture, never reproach.** The Workers' Houses in particular
should look like decent homes of their time, not like a warning.

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
| ~~**The capacity model** contradiction~~ | Two capacities, **livability** and **happiness**; **housing and food are INPUTS to livability**, aggregated as **one pool** — `livability = Σ` every contribution. Ruled `min(Σ housing, Σ food)` in #227 and re-ruled by the team lead the same day. **This era was the worst case**, and the old row said so: under one pool the Workers' Houses dominated the Cold Store on **both** footprint and cost at once *(the **food** row, which carries the name **The Food Works** since the row swap)*. The fix is in §2 — the food row drops to **3,840 coal** — and it is why the argument for the limiting factor was a pricing problem in disguise: this catalogue had its dwelling priced below its food building, uniquely in the run | **Gabriel + Gabe, 2026-07-29 (#227, re-ruled in #236)** |
| ~~**O-6** the conversion rate~~ | **Half the purchasing power survives:** `floor(amount × 0.5 / 2)` | **Gabe, 2026-07-29 (#227)** |
| **O-4** teardown pricing | **25% of the CURRENT era's build cost for that type, no refund** | **Gabe, 2026-07-29** |
| **O-5** the legacy-decay curve | **`0.9 ^ (eras behind)`, floored at 0.5.** By this era the first two quarters sit at 0.59 and 0.53 of their own contribution, and against an ×64 multiplier they are already scenery. That is D-ERA23 working as intended, not a shortfall to compensate | **Gabe, 2026-07-29** |
| Whether the Workers' Houses read as decent rather than as squalor | **Decent — and the design rule that makes it so is DECIDED rather than left to the dev server: this era's housing shows MAINTENANCE.** Fresh paint on the doors, scrubbed steps, a swept back court, planting in the yard, washing on a line, and **no** broken glass, boarding, rubbish or soot streaks on the housing (the soot belongs to the mills). **The tone bans make this a rule and not a preference** (`../../../../Game_Visual_Design_Brief.md`: no scarcity, no guilt framing), so a terrace reading as squalor is a spec violation rather than a taste failure. **A dev-server look is still owed as verification, with a screenshot**, which is a better artefact than an open question | **Evan, 2026-07-29** |

---

## Related

- `style-guide.md` — the six skill buildings this era adds *(it re-dresses none: 2026-07-29)*, and
  the road constraint this era is the worst case for.
- `../era-01-prehistoric/civic-buildings.md` — the authored template, the full rules list, and
  the two flagged contradictions.
- `../../2026-07-27-era-progression-design.md` — §6.4, §7, §8, §12.
