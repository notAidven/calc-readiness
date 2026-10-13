# Era 5 — Medieval Era: civic buildings

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

Era five's answer to **O-12**, and to the identity half of **O-6**.

**Era multiplier: ×16.**

---

## 0. The contract

Skill buildings are **earned**; civic buildings are **bought** (D-ERA7). **Neither produces**
on a per-tick basis, and both are **frozen in the era they were built** — the Town Hall is the
one building that rethemes. Civic buildings are **frozen in era five forever**, the catalogue is
**era-exclusive**, and there is **no renovation** (D-ERA11). Teardown only, for a cost, no
refund (D-ERA12). Full table in `../era-02-neolithic/civic-buildings.md` §0.

---

## 1. The era's resource: coins

> **RENAMED 2026-07-29 from `guild_marks` to `coins`, by the team lead's recognisability ruling** —
> *every material must be immediately recognisable to the vast majority of users*. *Guild marks* is opaque — a reader who has not studied the period cannot picture one. `coins` is the category the ruling itself invoked, and era five is guild ledgers and tithes: money recorded and paid.
> Seven of the ten ids changed in the same pass; the full before/after table and the reasoning
> are at `../../2026-07-29-era-resource-model-design.md` §4.1a, and the code landed in `#233`.
>
> **The lead offered `gold` and it is UNAVAILABLE**, which is why this is `coins` and not the more
> obvious word. `gold` is already a `ResourceType` on the same ledger, so an era holding it would
> make `resource_type` ambiguous between the legacy currency and a material — the exact field
> `computeBalances` and `computeMaterialBalances` split on. Forcing era five to `gold` fails
> fourteen assertions. **Era five takes `gold` the day D-ERA13's gold-drop frees the word**, at
> which point it is a one-line change plus a stored-data migration. **Recorded here as a deferral
> rather than a rejection**, because the lead's preference stands and only the timing is the
> problem; it is also open item 9 on the resource-model record.

**Era five's material is `coins`.** A ledger entry as much as a struck coin — credit recorded in
a book, backed by a guild rather than by metal.

That fits the era's own theming (*guild ledgers, tithes, land divided into shares*) and it keeps
each era's resource feeling **materially different** from the last rather than renamed: stone is
useful, grain is edible, bronze is made, silver is minted, and coins are **counted and recorded**.
The sequence is a genuine progression in abstraction, which is what makes era nine's silicon
and era ten's data land as the end of a line rather than as arbitrary.

---

## 2. The catalogue: four types

§7's anchors at **×16**. Illustrative anchors, not shipping numbers. Footprints in grid cells.

| Building | Footprint | Provides | Cost | Wins on | Loses on |
| --- | --- | --- | --- | --- | --- |
| **The Great Barn** | 2×2 | food for ~320 | 1,600 coins | **resource efficiency among the livability rows** — the cheapest way to sustain anybody here | one enormous roof and nothing else — no secondary benefit at all, and it is the **dearest food row in the run relative to its era** |
| **The Castle** | 2×1 | 320 livability | 2,080 coins | **the cheapest livability per CELL in the era** | it sprawls: two of these eat a quarter's frontage — and it is the dearest housing of the first seven eras, because a castle is what a lord actually spends on |
| **The Fairground** | 2×2 | 320 happiness | 1,280 coins | **cost — the cheapest building in the era, and the only era in the run whose amenity is**, because a fair is ground kept clear rather than a building | **land efficiency**, and it contributes no livability at all |
| **The Chapel** | 1×1 | 160 livability + 160 happiness | 2,400 coins | **the smallest plot** | **resource efficiency** |

**How they trade (D-ERA24).** The Castle is deliberately the odd one: at 2×1 it is the
*best* value per cell in the era, but because it only ever comes as a long thin strip it
constrains what you can put beside it — a land win that costs you layout, and it is paid for in
coins as well. The Fairground wants to be seen and needs its openness, and it is the one thing here
you get cheaply: **era five is the era where the building is dear and the ground is cheap.** The
Chapel is the premium plot-saver.

**Land is softening as an axis.** The island has grown four times and twenty-six skill buildings
stand, so a 2×2 amenity no longer hurts the way era three's Bathhouse did. From here the sharp
axis is increasingly **resource efficiency**, which is exactly the era-by-era shift D-ERA24
predicts.

> ## ⚑ RE-PRICED 2026-07-30 — the ONE era in the run whose amenity is the cheapest of its four
>
> **THE RULING (team lead, 2026-07-30, verbatim):** *"the buildings shouldn't all have the same
> price ratios and be priced the exact same relative to each other across eras. Doesn't need to be
> drastic; just some kind of variance would be nice."* Era five's `1,280 / 1,440 / 1,600 / 1,920` was
> `1 : 1.125 : 1.25 : 1.5`, shared verbatim with eras six and nine; every era in the catalogue ran
> food ≤ dwelling < amenity < blend, so the *order* was as uniform as the ratios.
>
> **Era five is where that order breaks, and this file already said why.** The Fairground is *"the
> only civic building here that is mostly open ground"* — a medieval fair is a licence and a cleared
> field, not a building — so it drops to **1,280** and becomes the cheapest thing in the era. The two
> real buildings rise to meet it: a tithe barn is one of the largest structures a medieval village
> ever raises, so the Great Barn goes to **1,600**, and the Castle to **2,080**, the dearest housing
> coefficient of the first seven eras. The Chapel holds its place as the premium plot-saver at
> **2,400**.
>
> **Read against era two, which is its opposite.** Era two pays the steepest premium any era's 1×1
> blend pays over its own food row, because land is scarcest there; era five pays its premium for
> *fabric* and gets its
> happiness almost free. Materially poor and festively rich is the era, and the prices now say it.
>
> **What did NOT move.** The four plots, both contributions on all four rows, and era five's
> **solvency** — the era's optimal city still costs 8,640 coins against a mintable 9,600, because the
> ladder fixes what a city costs and this ruling only changes which of the four you pay it to.
>
> **THE ONE CELL THAT HAD TO BE REWRITTEN RATHER THAN RE-NUMBERED.** The Great Barn's `Wins on` read
> a bare *"resource efficiency"*, and with the Fairground now the cheapest row that is no longer true
> without a qualifier: measured per point of anything, the Fairground is the era's best value. The
> Barn is the cheapest of the **livability** rows, which is the claim that matters — a city cannot be
> built out of Fairgrounds, since they carry no livability at all — and the cell says so now. **This
> is not a D-ERA24 failure**: `test/eraCivicCatalogueDominance.test.ts` clears all six of era five's
> pairs, because the amenity wins cost and happiness while every other row beats it on livability.
>
> **Three notes below say *"no number moved"* and all three remain true of the pass they were written
> for.** The Castle's two entries cite `2×1, 320 livability, 1,440 coins` and the Fairground's cites
> `2×2, 320 happiness, 1,600 coins`; the plots and contributions still hold, and the costs are now
> 2,080 and 1,280.

> ## ⚑ AMENDED 2026-07-29 — heights are stated as an ORDER, and The Chapel's stone is reconciled with `style-guide.md` §2
>
> **(1) Heights.** Each of the four below carried a `Height ~N units` figure while
> `style-guide.md` §3 states height as a ranking and says in terms that the guide *"deliberately
> gives no world-unit targets"* — so the era's two files disagreed about what a height even is.
> **The ranking wins on a mechanical ground rather than an editorial one:** every stage is
> contain-fit to its plot by one uniform scale, so the same model stands at two different heights
> on two different plots and a figure is not something a modeller can aim at. Proportion is the
> only lever they hold, and **the more slender of two neighbours is simply the taller one**
> (`../README.md`, "Constraints every guide inherits"; `../era-01-prehistoric/style-guide.md`
> §0). **Nothing is lost, because the order is what the figures were encoding** — The Great Barn,
> then The Castle, then The Chapel, then The Fairground — and that order is now stated directly.
> The one real number is the 24-unit ceiling (`MAX_BUILD_HEIGHT`), a cap rather than a target,
> and nothing in this era approaches it. Flagged independently by the era two, five and six
> image-generation briefs, so this is a folder-wide split between the two file types rather than
> an era-five slip.
>
> **(2) The Chapel's dressed stone.** It sat outside §2's four materials, whose stone is
> **coursed rubble in mortar** and whose guide is pointed that era four's fine level bed is gone.
> **Reconciled by admitting it in §2 rather than by dropping it here**, so nothing the art is
> being generated from moves: worked stone is confined to the openings — the bellcote's arched
> head, the lancet surround, the quoins and the door — with coursed rubble between them, squared
> and coursed and never era four's fine level bed. §2's banner carries the boundary and the
> reason. The lead roof was never in question and is right either way.

### The Great Barn *(2×2, food)*

An enormous stone-gabled barn, buttressed side walls, opposed cart entries with a threshing bay
between, an oak cruck roof under stone slates. Its whole character is the roof — vast, steep,
and out of proportion to everything around it.

*Materials:* coursed rubble stone, oak cruck framing, stone slate. **Height: the tallest of the
four**, and all of it is roof.

### The Castle *(2×1, livability)*

A compact castle along the strip: a square keep at one end with a forestair and a battlemented
parapet, and a walled bailey running off it, lodgings built into the inner face of the curtain
wall under one continuous tiled roof, a gate with a portcullis at the far end. Chimneys along the
wall head, washing between them, a well in the bailey. **The whole town lives inside it**, which
is what a castle was for and what makes this the era's densest housing.

> ## ⚔ THIS IS ERA FIVE'S ENTRY IN THE DEFENCE LINEAGE, and it is the only civic in that line
>
> **Ruled by the team lead: era five's defence building is The Castle**, and a medieval era's could not
> be anything else. **Nothing changes here** — form, cost, plot and capacity are all as authored above,
> 2×1 for 1,440 coins with 320 livability, and the keep, curtain wall, portcullis and battlemented
> parapet are already the building. **This is recognition, not a re-author.**
>
> **The lineage is one building per era from era three onward** — era three's Stronghold, era four's
> Barracks, **this**, era six's Cannon Tower, era seven's Cannon Factory, era eight's Nuclear Weapons
> Facility, era nine's Air Force Base and era ten's Drone Command. Eras one and two have none,
> deliberately.
>
> **Era five's is the ONE that is bought rather than earned.** Every other entry is a **skill**
> building on a node, drawn once and kept; this one is a **civic**, bought from the catalogue and
> repeatable. **The lineage is therefore not uniform, which is not a defect but is worth knowing** —
> *"the defence building is always a skill building"* is true of seven of the eight and false of this
> one. `../README.md` carries the full table and the same caveat.

*Materials:* coursed rubble stone, half-timber lodgings, clay tile, oak gate. **Height: second of
the four** — the keep's parapet is the era's second-tallest civic point and the wall head is
about half of it, so the profile falls sharply from one end of the strip to the other.

> **RENAMED 2026-07-29 from *The Cottages*, on the lead's instruction that era five's housing
> should read as a castle. It does, and the footprint made that a real design problem worth
> recording.** A 2×1 strip is not a castle's shape, and INV-ERA-1 freezes it, so the building is
> drawn as **a keep plus a curtain-wall range** rather than as a scaled-down fortress: the strip is
> the wall, which is the one castle element that genuinely is long and thin, and the keep gives the
> silhouette its vertical. That keeps every property the closure below argues for — the shape still
> eats a quarter's frontage, and it is still the best livability per cell in the era.
>
> ### The lead's aside about moving Cottages to the Renaissance is NOT taken, and here is why
>
> The instruction added that Cottages *"could be reassigned to the Renaissance or something"*, and
> that was offered as permission rather than as a direction. **Taken literally it inverts the era
> ladder.** Era six is grander than era five in every other document in the folder — it is the era
> of the dome, the rustication and the cornice, it costs twice as much, and its civic set piece is
> the best-looking thing in the city. Moving *cottages* into it would make the Renaissance's
> housing humbler than the Medieval's, so a player advancing from five to six would watch their
> housing option go **down** a rung, which is the one thing an era advance must never do.
>
> **It also leaves era six worse off on the lead's own rule.** Era six needed a dwelling name that
> reads Renaissance (item 6), and *Cottages* reads Medieval-or-earlier: it would have replaced one
> mismatched name with another and still owed era six a rename. **The Renaissance dwelling is
> instead *The Merchant Houses*** — the period's own housing type, a courtyard house built by the
> people the era is about — and the pair then reads forwards rather than backwards: **the
> fortified castle gives way to the unfortified town house**, which is what actually happened
> between those two centuries and is a better story than either name alone.
>
> **What is genuinely lost: nothing at all**, and this paragraph used to say the name itself was.
>
> > **CORRECTED 2026-07-29 — the sentence was true when it was written and was falsified by its own
> > paired rename.** It read *"nothing in the run is now called cottages, and cottages are a
> > perfectly recognisable name. If the lead wants them back, the honest place is a later era than
> > six, not an earlier one, and era seven's dwelling slot is already The Workers' Houses."*
> > **Era four's livability civic IS *The Cottages*** — `../era-04-classical/civic-buildings.md` §2,
> > and `../README.md`'s table of the fifteen — and it took the name **because this rename vacated
> > it**, which era four's own note states in as many words: *"The lead chose `The Cottages`, and it
> > is available because era five's housing became `The Castle` in the same review."* **So the name
> > is not lost; it moved one era EARLIER**, which is the direction this paragraph did not consider
> > and which satisfies the ladder argument above rather than breaking it, because era four
> > **precedes** the castle instead of following it. The run reads **Cottages → Castle → Merchant
> > Houses** across eras four, five and six. The rest of the sentence stands: era seven's dwelling
> > slot is still *The Workers' Houses*. **Two documents recorded half of one swap each and only era
> > four's was kept current** — the same failure the era-wide reviews exist to catch, one file apart
> > rather than one era apart.
>
> **No number moved:** 2×1, 320 livability, 1,440 coins.

### The Fairground *(2×2, happiness)*

Mostly open ground, and set out for the annual fair: beaten earth and cobble with a stepped stone
cross at the centre, trestle booths and awnings round three sides, a roped ring at one end, bunting
strung between poles, a pollarded tree. **The place the whole town gathers once a year**, and it
should look like a day off rather than a working day.

*Materials:* cobble and beaten earth, dressed stone cross, oak trestles, canvas awnings and
bunting. **Height: the lowest of the four** — nothing on it above the cross and the poles.

> **RENAMED 2026-07-29 from *The Market Square*, which collided with era six's *The Town Square*.**
> Both are frozen, both are mostly open paving with something ornamental at the centre, and both
> stand in the same endgame city — so the pair failed on exactly the ground the naming rule cares
> about, two buildings a player cannot tell apart from their names.
>
> **The fix is a different institution rather than a different adjective.** A medieval town's public
> ground did two separate jobs: the weekly **market**, which is commerce, and the annual **fair**,
> which is the holiday. The fair is the one that is unambiguously an amenity — it is what a
> happiness building should be — and *fairground* is a word every learner owns. It also clears a
> second rub the old name had: era six's food building is *The Covered Market*, so era five's
> happiness building and era six's food building were both markets, one era apart.
>
> **Era six's *Town Square* is deliberately KEPT**, and that is a decision rather than an omission.
> With this one renamed there is no collision left, and every alternative for era six is either
> Italian (which is the exact failure `../README.md` records era six being punished for), an
> adjective on a generic word, or less recognisable than what it has. **One rub is left behind and
> flagged rather than fixed:** era six's `yard` dressing is *the Paved Square*, so that era holds
> "The Town Square" beside "Commons, the Paved Square". The cheaper repair is the **subtitle**, not
> the civic name — era six's own §5 already calls that mass *the parterre court* — and subtitles are
> ratified, so it is left for the lead. **No number moved:** 2×2, 320 happiness, 1,600 coins.

### The Chapel *(1×1, blend)*

A tiny stone chapel with a bellcote gable and a lancet window, a covered well against its side
wall with a windlass. Water and comfort on one cell.

*Materials:* coursed rubble with **dressed stone at the openings** — the bellcote's arched head,
the lancet surround, the quoins and the door — a lead roof, an oak windlass frame. **Height:
third of the four**, above only The Fairground; but on a single cell the bellcote reads
noticeably tall for the plan, which is what a 1×1 needs in order not to disappear.

---

## 3. Halfway is where legacy decay first shows

**D-ERA23's decay** has had four eras to work by now, so this is the first era where the answer
to **O-5** is visible in play rather than theoretical.

**That makes this file the natural place to check the curve rather than merely inherit it.** If a
Prehistoric Family Lodge still meaningfully houses people here, the curve is too shallow; if the
player is being pushed to tear era one down for the land, it is too steep and the
archaeological-layers reading dies with it. **The curve remains open and is Gabriel's (O-5).**

**§8.1's solvency guarantee** holds unchanged. **All copy and art rules** are enumerated in
`../era-01-prehistoric/civic-buildings.md` §6 and inherited in full.

---

## 4. CLOSED

**Nothing here is open as of 2026-07-29.** Full statements in
`../era-01-prehistoric/civic-buildings.md` §7.

| What | Resolution | Decided |
| --- | --- | --- |
| ~~**The capacity model** contradiction~~ | Two capacities, **livability** and **happiness**; **housing and food are INPUTS to livability**, aggregated as **one pool** — `livability = Σ` every contribution. Ruled `min(Σ housing, Σ food)` in #227 and re-ruled by the team lead the same day, and **this era needed nothing either way**: it is one of the three whose sprawling food building is already cheaper than its compact dwelling, so it keeps a genuine cost-versus-land trade under both readings and none of its four prices moves | **Gabriel + Gabe, 2026-07-29 (#227, re-ruled in #236)** |
| ~~**O-6** the conversion rate~~ | **Half the purchasing power survives:** `floor(amount × 0.5 / 2)` | **Gabe, 2026-07-29 (#227)** |
| **O-4** teardown pricing | **25% of the CURRENT era's build cost for that type, no refund** | **Gabe, 2026-07-29** |
| **O-5** the legacy-decay curve | **`0.9 ^ (eras behind)`, floored at 0.5** | **Gabe, 2026-07-29** |
| Whether the Castle's 2×1 shape is a real trade or an annoyance | **A real trade, and it stays 2×1.** The test is whether the shape costs the player something they can **see**, and it does: at 2×1 the Castle is the best livability per cell in the era, and two of them eat a quarter's frontage, so buying the cheap option visibly spends the street. **An annoyance is a cost with nothing bought;** this is a cost with the era's best per-cell value bought, which is the shape D-ERA24 asks for. **The catalogue also needs one non-square footprint** or land efficiency stops being a decision about *shape* and becomes only a decision about area | **Evan, 2026-07-29** |

---

## Related

- `style-guide.md` — the **five** skill buildings this era adds. *(It re-dresses none, per the
  2026-07-29 ruling; and the count was corrected 6 → 5 when the rebalance moved `RAT.5`.)*
- `../era-01-prehistoric/civic-buildings.md` — the authored template, the full rules list, and
  the two flagged contradictions.
- `../../2026-07-27-era-progression-design.md` — §6.4, §7, §8, §12.
