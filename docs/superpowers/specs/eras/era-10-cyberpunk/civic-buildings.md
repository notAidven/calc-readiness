# Era 10 — Cyberpunk Era: civic buildings

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

Era ten's answer to **O-12**, and to the identity half of **O-6**.

**Era multiplier: ×512.**

---

## 0. The contract

Skill buildings are **earned**; civic buildings are **bought** (D-ERA7). **Neither produces**
on a per-tick basis, and both are **frozen in the era they were built** — the Town Hall is the
one building that rethemes. Civic buildings are **frozen in era ten forever**, the catalogue is **era-exclusive**,
and there is **no renovation** (D-ERA11). Teardown only, for a cost, no refund (D-ERA12). Full
table in `../era-02-neolithic/civic-buildings.md` §0.

---

## 1. The era's resource: data

**Proposed answer to O-6: data.** §7 names the sequence's endpoint explicitly as *"credits or
data"*, and data is the better of the two — **credits would read as money returning**, which
D-ERA13 deliberately moved away from when it dropped gold.

It closes an arc worth stating once: stone (useful), grain (edible), bronze (made), silver (minted),
coins (counted), gems (held), coal (burned), electricity (generated), silicon (fabricated), data
(accumulated). Ten resources, each materially different from the last, which is
what makes the run feel like a civilization instead of a renamed counter.

> **Era ten's own id `data` is UNCHANGED** by the 2026-07-29 recognisability ruling, and is kept
> *flagged as reviewable* rather than settled — it was not in the ruling's list and it is the one
> kept name whose category membership is arguable. It passes both halves of the stated test (data is
> the thing, gigabytes are the unit) and most people alive meter, buy and run out of data monthly,
> which is also the spend semantics this resource wants.
>
> **But this file was NOT on the ruling's list of stale documents and should have been**: the arc
> above named **six** retired ids (`flint`, `ingots`, `coin`, `guild marks`, `florins`,
> `kilowatt-hours`, `compute cycles` — seven strings across six renames). Corrected. **The list was
> built from "which files name their OWN material", and the arc list names everyone else's** —
> which is exactly how a rename recorded at its definition site misses its citation sites.
>
> **Two parenthetical readings had to change with the words**, and the change is an improvement
> rather than a loss: `kilowatt-hours (measured)` and `compute cycles (spent)` were both describing
> *units*, which is what the ruling rejected, so the arc no longer ends in three abstractions.

**The forward-conversion rate does not apply here** — there is no era eleven to convert into. Worth
recording, because O-6's second half is otherwise assumed to exist for every era.

---

## 2. The catalogue: four types

§7's anchors at **×512**. Illustrative anchors, not shipping numbers. Footprints in grid cells.

| Building | Footprint | Provides | Cost | Wins on | Loses on |
| --- | --- | --- | --- | --- | --- |
| **The Vertical Farm** | 1×1 | food for ~10,240 + 2,560 happiness | 40,960 data | **land efficiency — food on one cell, a first in the run**, and fresh food is the one domestic luxury this city has | **resource efficiency** |
| **The Pod Apartments** | 1×1 | 10,240 livability | 35,840 data | **the cheapest livability in the era**, and land efficiency — the whole population on one cell | **no happiness at all**, and they are the least dignified housing in the game |
| **The Night Market** | 3×2 | 10,240 happiness | 46,080 data | it is the warmest place in a cold city, and the era's signature | **land efficiency** — 6 cells |
| **The Nightclub** | 2×2 | 5,120 livability + 5,120 happiness | 61,440 data | **the blend, and the only warm room in the era anybody may walk into** | **resource efficiency** |

**How they trade (D-ERA24), and what is different about the last catalogue.** Both the food
building and the dwelling are now **1×1 towers** — the era's answer to everything is to build up.
That makes **land efficiency nearly worthless as a differentiator here**, since the island has
finished growing and two of the four options already win it. So **era ten trades primarily on
resource efficiency and on mix**, which is the right shape for the final catalogue and is what §12's
note about land expansion implies once expansion stops.

> **THE POOLED RULING DELETED MIX, AND THESE TWO NUMBERS PUT IT BACK — RULED 2026-07-29 (the team
> lead: *"differentiate these"*).** Housing and food became one pool that morning
> (`../era-01-prehistoric/civic-buildings.md` §2), and for one afternoon the Vertical Farm and the
> Pod Apartments provided the **same 10,240 of the same quantity on the same one cell** with the Farm
> 5,120 cheaper — 40,960 against 46,080 — so it **weakly dominated** the Homes outright and nobody
> would ever have built them. This was the last catalogue the D-ERA24 sweep could not clear, and it
> was carried as a declared exception for exactly as long as it took to rule on.
>
> **Two numbers separate them, and each lands on the row that can carry it:**
>
> - **The Farm gains 2,560 happiness** — a quarter of the era's magnitude, the same proportion the
>   dwellings of eras one, two, three and six carry. Fresh food grown in the city is a **luxury** in
>   a neon era that otherwise eats out of vending banks and the Night Market, so happiness here is
>   earned by what the building is. It was contradictory on the capsules and is not contradictory
>   here, which is exactly why the secondary changed rows.
> - **The Pod Apartments drop to 35,840 data** — era seven's dwelling coefficient (`70 × 2^(N-1)`),
>   the cheapest in the run. Capsule housing is **volume bought by accepting less**, so it should
>   have been the cheap option all along; pricing it *above* the food tower was the real defect the
>   aggregation flip exposed rather than caused. At 3.5 data per person it is the cheapest livability
>   in this era, and era seven's Cold Store keeps its *"cheapest in the run so far"* superlative at
>   3.0.
>
> **Neither dominates.** The Homes win on cost, the Farm wins on happiness, and footprint and
> magnitude tie. It took two numbers rather than one because at equal footprint and equal magnitude
> a single axis can only ever favour one row — a second axis has to exist, and either number alone
> leaves the *other* row dominated.
>
> **This honours Evan's ruling rather than overriding it.** #235 ruled that both towers stay,
> because *"a catalogue whose two premium plot-savers are separated by cost **and mix** satisfies"*
> D-ERA24. His criterion was never wrong: **its second term had been deleted out from under it** by
> the consolidation, which made a food row and a dwelling row the same contribution. The Farm's
> happiness restores mix as a real second term and the price cut restores cost, so the pair satisfies
> the criterion he actually stated, under the model as it now is. Nothing here goes back to him.
>
> **`test/eraCivicCatalogueDominance.test.ts` now carries no exceptions list at all**, so all ten
> catalogues are swept with no holes.

**These are the only civic buildings that never age behind a later era.** D-ERA23's decay measures a
building against how far it sits behind the *current* era, and there is no era eleven — so era ten's
catalogue is **permanently current**, and the endgame city actually runs on it. Every earlier quarter
is charm rather than load. That is worth stating because it makes this the one catalogue whose
balance is load-bearing at the end of the run.

> ## ⚑ AMENDED 2026-07-29 — heights are stated as an ORDER, not as world-unit figures
>
> Three of the four below carried a `Height ~N units` figure — The Nightclub already stated its
> as a ranking — while `style-guide.md` §3 states height as a ranking and says in terms that the
> guide *"deliberately gives no world-unit targets"*. **The ranking wins on a mechanical ground
> rather than an editorial one:** every stage is contain-fit to its plot by one uniform scale, so
> the same model stands at two different heights on two different plots and a figure is not
> something a modeller can aim at. Proportion is the only lever, and **the more slender of two
> neighbours is simply the taller one** (`../README.md`, "Constraints every guide inherits";
> `../era-01-prehistoric/style-guide.md` §0). **Nothing is lost, because the order is what the
> figures were encoding** — The Pod Apartments, then The Vertical Farm, then The Night Market's
> canopy, then The Nightclub — and it is now stated directly. **The 24-unit ceiling
> (`MAX_BUILD_HEIGHT`) is the one real number**, it is a cap rather than a target, and this is the
> era it actually binds: the folder records that only era ten's mast is authored to approach it,
> so the two towers below keep their proximity to the cap as a stated fact. Flagged independently
> by the era two, five and six image-generation briefs, so this is a folder-wide split between
> the two file types rather than an era-ten slip. **This is the only change made to this file:**
> the height clause of each `*Materials:*` line and nothing else, since this era's building briefs
> are being written right now.

### The Vertical Farm *(1×1, food)*

A slender tower of stacked growing trays behind translucent panels, pink-white grow light bleeding
through, a service core on one face with an external lift, water tanks at the crown. The most
legible "the future feeds itself" object in the city.

**The produce has to read as food people eat**, not as industrial biomass: the 2,560 happiness in
§2 is the luxury of fresh food in a city that otherwise eats out of vending banks, so green has to
be visible through the panels at the locked tilt. A tower that reads as a chemical plant would be
claiming an amenity the player cannot see.

*Materials:* translucent polycarbonate panel, steel frame, emissive grow-light glow. **Height:
second of the four**, just below The Pod Apartments and close to the `MAX_BUILD_HEIGHT` ceiling.

### The Pod Apartments *(1×1, livability)*

A structural rack holding stacked living modules, each a lit rectangle with a small window, open
walkway galleries on the outer face, exposed services running up one side, signage layered over
everything. **Deliberately the least dignified housing in the game** — and note the tone rule below.

*Materials:* steel rack, capsule modules in composite, mesh galleries, emissive signage.
**Height: the tallest of the four**, and the civic building that sits hardest against the
`MAX_BUILD_HEIGHT` ceiling.

### The Night Market *(3×2, happiness)*

Mostly covered ground: a tensile canopy over stalls on a wet paved floor, layered neon and hanging
signage, steam and cooking smoke, seating at low tables, reflections everywhere. **The warmest and
most human place in the era**, deliberately set against the towers around it.

*Materials:* tensile fabric canopy, steel stall frames, dense emissive signage, wet paving.
**Height: third of the four**, above only The Nightclub — the canopy is the whole of it, and it
sits far below the era's two towers.

**What it must not be confused with, and this is now a hard requirement rather than a nicety.** The
blend row is **The Nightclub**, so the era holds two bought places-to-go whose names both say *night*
and no longer separate them. **The separation is stated on the Nightclub's own entry below and it is
structural, not decorative:** the Night Market is **open covered ground at deck level** — a canopy on
stall frames with the paving continuing straight through it and no walls at all — and the Nightclub is
**an enclosed room below the deck** that you go down into. **Ground you walk across against a room you
go inside, at two different levels.** Neither can be mistaken for the other at any zoom, and neither
relies on reading a sign.

### The Nightclub *(2×2, blend)*

**One warm room sunk into the deck, and almost nothing of it above.** At deck level the plot is a
**broad flight of steps going down** into a **single wide portal** cut through the deck slab, its
reveal lined in seamed dark composite panel with **one emissive line following the whole opening**;
beside it, a **queue rail** and nothing else. Below, **one undivided hall the full 2×2** — low,
wide, and read from above through **grated slots let into the deck**, so the lit interior shows up
through the pavement as bands of colour and the building's presence at street level is **the ground
glowing rather than a facade**. Above the deck only three things break the surface: the portal, the
**run of grated slots**, and **two ventilation cowls with heat visible over them.** Inside the hall,
and visible from the steps and through the slots: **a lit bar wall, low seating in continuous
banks, a water point free at the end of the bar, and heated air pouring out of the portal.** No
signage stack, no animated display, no tower, no canopy. **The whole building is an interior**, which
is the one thing nothing else in era ten is.

**The warmth is load-bearing, because it is the whole building and it is both numbers at once.** In
a city housed in pods and fed out of vending banks, **a warm room anybody may walk into is the only
shelter the city offers** — that is the 5,120 livability, and it is not a half bolted on behind
something else: it is the same room, at the same moment, as the 5,120 happiness. The player has to
be able to see both, and the slots are how: **light and heat coming up through the pavement, and
people going down the steps out of the cold.** A sealed box with a door in it would be claiming a
capacity the player cannot see — the same defect era six's closed carriage arch and this era's own
grow-light panels are drawn to avoid.

**Where it stands in the blend lineage, stated plainly rather than smoothed.** `../README.md`'s
fifth naming point records that the blend building is always **the small shared amenity everyone in
the settlement uses**, and that **six of the ten are literally water**: era one's **Spring**, era
two's **Village Well**, era four's **Fountain**, era five's **Chapel** with its well against the
side wall, era nine's **Hospital** — and era ten's. **A nightclub is the loosest fit in that column
and the lead has chosen it knowing so.** What holds the family together here is the mechanic rather
than the water: it is the era's smallest-but-two plot, it is free at the door, and it is the one
place in the era the whole city goes to for the same reason. **The free water point at the end of
the bar is what carries the lineage's literal thread**, and it is authored deliberately for that.

*Materials:* dark composite panel, exposed conduit and cable tray, grated deck slots, a single
emissive line, emissive interior surfaces seen through the slots. **Deliberately the LOWEST building
in the era** — almost all of it is under the deck — so it reads as ground rather than as another
tower, and it is the only civic building here that does.

> ## ⚡ THE NIGHTCLUB IS REINSTATED, AND THE *NIGHT* COLLISION IS ACCEPTED — do not re-litigate it
>
> **RULED by the team lead in the consolidated pass: the blend row is *The Nightclub*.** This row has
> now been `The Station` → `The Nightclub` → `The Reservoir` → **`The Nightclub`**, and the banner
> below is kept in full as the record of the middle two moves. **The collision it was reverted for is
> accepted**: era ten holds *The Nightclub* beside *The Night Market*, both bought, both frozen, both
> in the same four-row buy menu. That is settled and is not an open question.
>
> **What the lead did require, and it is the reason this entry was re-authored rather than just
> renamed back: THE TWO MUST NOW SEPARATE VISUALLY, because they no longer separate by name.**
> Stated as the axis an artist can hold:
>
> | | The Night Market (3×2, happiness) | The Nightclub (2×2, blend) |
> | --- | --- | --- |
> | **Level** | **On** the deck | **Under** the deck |
> | **Enclosure** | Open covered ground — a canopy on frames, no walls | One enclosed room, entered by descending |
> | **How you read it from outside** | You see the stalls, the steam and the people directly | You see **the pavement glowing through grated slots** and a portal with steps |
> | **Roofline** | A tensile canopy — the whole building is its roof | **No roofline at all** — two cowls and a run of slots |
> | **Signage** | Layered neon and hanging signage everywhere | **None** — one emissive line round the portal |
>
> **Ground you walk across against a room you go inside, at two different levels**, with the market's
> whole identity being its canopy and the club's being that it has no exterior. **Neither reading
> needs the name and neither survives being swapped.** The Night Market's own entry above carries the
> same table's conclusion so an artist meets it from either end.
>
> **What the re-author had to fix, since the reversion's objection was correct on its own terms.** The
> banner below records that the *first* Nightclub *"had to argue its own livability into existence"* —
> it read *"the ordinary half of the building is on show at the back — food counters, a water point,
> heated seating and lockers along the service side"*, and then *"that back half is load-bearing,
> because it is the 5,120 livability"*, which is **a capacity bolted on behind a building that did
> not want it.** **This version does not have a back half.** The livability and the happiness are the
> same room read two ways: warm and open to anyone is the shelter, and it being the one place the city
> goes is the pleasure. That is what a blend row is supposed to look like.
>
> **NO NUMBER MOVED, across any of the four names:** 2×2, 5,120 livability + 5,120 happiness, 61,440
> data, unchanged since it was the Station. `test/eraCivicCatalogueDominance.test.ts` reads this row
> as the era's even blend and asserts its happiness sits above the Vertical Farm's 2,560 secondary;
> that assertion is untouched, and it finds the row **by shape rather than by name**, so this rename
> cannot make it vacuous. The `Wins on` cell moved with the building, as it did the last two times:
> *"the only one that reads as civic generosity"* under the Station, *"warm, fed and open all night"*
> under the first club, *"the only thing in the era the city gives away"* under the Reservoir, and now
> **"the only warm room in the era anybody may walk into"**.
>
> **The tone rule below still governs it** (`../../../../Game_Visual_Design_Brief.md` §2: calm,
> non-punishing, warm). A nightclub in a cyberpunk city is the obvious place to reach for something
> squalid or predatory; **this one is drawn as the warm place**, which is both the tonally correct
> reading and the only one that earns the livability.

> ## ⚑ HISTORY — REPLACED TWICE. `The Station` → `The Nightclub` → `The Reservoir`, and only the last one was a BUILDING change
>
> **Kept as the record of the middle two moves. The row is now `The Nightclub` again** — see the
> reinstatement banner above, which accepts the *Night* collision this one resolved and replaces it
> with a visual separation instead.
>
> **`The Station` went because the lead could not tell what it was**, which is the naming rule
> biting on ordinary English: a *station* could be a rail stop, a bus stand, a police station or a
> power station, and in an era whose whole vocabulary is infrastructure it resolved to nothing.
> **`The Nightclub` was his own replacement** and it fixed that — but it introduced two problems the
> rename could not see, and he named both on review.
>
> **First, it opened *Night* beside *The Night Market* in the same four-building catalogue.** Both
> bought, both frozen, both in the same buy menu.
>
> **Second, and this is the one that decided it: the nightclub was the wrong BUILDING, not just the
> wrong name.** Every other blend row in the run is the small shared amenity the whole settlement
> uses — Spring, Village Well, Trading Post, Fountain, Chapel, Painters' School, Library, Fire
> Station, Hospital — and a club is the loosest fit in that column by a long way. **The clearest
> evidence is that the old entry had to argue its own livability into existence.** It read: *"the
> ordinary half of the building is on show at the back — food counters, a water point, heated
> seating and lockers along the service side"*, and then *"that back half is load-bearing, because
> it is the 5,120 livability."* A building whose stated capacity comes from a half bolted on behind
> it is a building that does not want that capacity. **A reservoir wants it.**
>
> **So the lead's read is followed rather than his earlier instruction**, because he invited exactly
> that: *"the right replacement may be a better blend building rather than a better name."* The
> Night Market keeps *Night*, which is the stronger and more era-apt of the two.
>
> **No number moved, across either replacement:** 2×2, 5,120 livability + 5,120 happiness, 61,440
> data, unchanged since it was the Station. What moved is the name, the art brief and the `Wins on`
> cell — which read *"the only one that reads as civic generosity"* under the Station, became *"warm,
> fed and open all night"* under the club, and is now **"the only thing in the era the city gives
> away"**. That is the Station's original claim, recovered by a building that can carry it.

---

## 3. Tone, and the endgame

**The Pod Apartments are the one building in the whole set that could read as punitive**, and the rules
that bound them are the same ones era seven's terraces have: **INV-ERA-3** means nothing about them may
key off study pace, absence, streaks or wall-clock time, and
`../../../../Game_Visual_Design_Brief.md` bans artificial scarcity and guilt framing. So it may be
cramped as **period texture** — cyberpunk density is a genre, not an accusation — and it must not be
framed as what the player deserves.

**If O-14 lands as "yes"** — the unbuilt calculus-attack endgame becomes era ten's trial — this
catalogue may need to answer what, if anything, a civic building contributes to withstanding an
attack. **Note INV-COS-1 forbids any of it gating progress**, so the answer can never be "you need
these to pass." O-14 is Evan's and §17 dates it *before era ten is authored*.

---

## 4. Solvency, decay, and the rules

**§8.1's solvency guarantee** holds unchanged. **D-ERA23 legacy decay** does not reduce era ten's
own buildings, per §2 above. All copy and art rules are enumerated in
`../era-01-prehistoric/civic-buildings.md` §6 and inherited in full — including that **mastery gold
`#FFB703` stays reserved**, which a neon palette will want to reach for and cannot have.

---

## 5. CLOSED

**Nothing here is open as of 2026-07-29.** Full statements in
`../era-01-prehistoric/civic-buildings.md` §7.

| What | Resolution | Decided |
| --- | --- | --- |
| ~~**The capacity model** contradiction~~ | Two capacities, **livability** and **happiness**; **housing and food are INPUTS to livability**, aggregated as **one pool** — housing and food are not tracked separately. This row said `min(Σ housing, Σ food)` until the team lead re-ruled the aggregation later the same day; the pooled reading is what makes this era's two 1×1 rows the same contribution, and §2 records what follows | **Gabriel + Gabe, 2026-07-29 (#227, re-ruled in #236)** |
| **O-4** teardown pricing | **25% of the CURRENT era's build cost for that type, no refund.** In this era that is the most expensive teardown in the game, which is the intended shape: clearing a quarter late is a real decision rather than loose change | **Gabe, 2026-07-29** |
| **O-5** the legacy-decay curve | **`0.9 ^ (eras behind)`, floored at 0.5.** Six of the nine earlier eras sit on the floor by now | **Gabe, 2026-07-29** |
| **O-6** — there is no forward conversion | **Nothing to rule, and worth writing down rather than leaving as an absence: there is no era eleven.** A player finishing era ten keeps a balance with nowhere to go, which is the right end state for a resource whose city is complete | **Gabe, 2026-07-29** |
| **O-14** the calculus-attack endgame | **NO — it does not become this era's trial, and these four owe it nothing.** Era ten's trial is the end-of-era trial like the other nine (D-ERA16: the trial re-skins the checkpoint machinery, mastery unlocks it, passing it advances). The value of the era model is that ten chapters have one shape, and making the last one structurally different spends that on the chapter fewest players reach. **If the attack is built it sits AFTER era ten as a coda** on the finished city, gated on nothing this file authors; `ENDGAME_ATTACK_SCENE` still carries `built: false` and nothing depends on it | **Evan, 2026-07-29** |
| Whether two 1×1 towers is one too many | **Both keep 1×1, and the differentiation is restored by price rather than by shape.** A vertical farm and a capsule stack are what this era's density **is**, and the pair is the point of the final catalogue. What the question got right is that the shape axis is dead here; what follows from that is not a footprint change but a rule: **by era ten, land has stopped being the scarce axis and resource efficiency plus mix carries the trade.** D-ERA24 requires that **no building win on every axis**, not that every axis differentiate in every era, so a catalogue whose two premium plot-savers are separated by cost and mix satisfies it | **Evan, 2026-07-29** |
| ~~**Re-opened for one afternoon, because the pooled aggregation deleted the second half of the answer above**~~ | **CLOSED, and Evan's criterion is met in its own words.** *"Separated by cost and mix"* stopped holding when the consolidation made a food row and a dwelling row the same contribution: mix was deleted out from under it, and cost alone left the cheaper row winning on every axis. **The two numbers in §2 put both terms back** — the Vertical Farm carries **2,560 happiness** (mix) and the Pod Apartments drop to **35,840 data** (cost) — so the pair is separated on two axes again, neither dominates, and the sweep runs with **no exceptions list at all**. His ruling stands; nothing needs re-litigating | **The team lead (*"differentiate these"*) + Gabe, 2026-07-29** |

---

## Related

- `style-guide.md` — the nine skill buildings this era adds *(it re-dresses none: 2026-07-29)*, and the
  three era-ten constraints (worst-case road depth, emissive light against the single key light,
  gold reserved).
- `../era-01-prehistoric/civic-buildings.md` — the authored template, the full rules list, and the
  two flagged contradictions.
- `../../2026-07-27-era-progression-design.md` — §6.4, §7, §8, §12.
