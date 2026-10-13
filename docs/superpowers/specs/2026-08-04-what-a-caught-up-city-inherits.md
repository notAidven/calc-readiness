# What a caught-up city inherits: the seeding, and what the panel then reads (MEASURED)

**Recorded 2026-08-04 on `cursor/catch-up-city-seeds-its-civics-ae84`, forward-merged from
`integration` @ `ef39c070`. Re-measured on the same branch at `bd994cc4`, after #544 landed and
after the seeding moved from the diagnostic's hand-off to each age's own founding — every figure
in §1, §3, §4 and §5 is the second measurement.** Every one of them was produced by running the
code: the vitality figures are read off a rendered `CityVitalityPanel` at 1024x580, the seating
counts are read back off a real `createCityDevSession` after driving the walk through the real
`CitySurface`, and the closing-city loadouts are derived by exhaustive search over
`CIVIC_CATALOGUE`.

This is the follow-on to
[`2026-08-04-what-a-caught-up-city-is-worth.md`](./2026-08-04-what-a-caught-up-city-is-worth.md),
which measured the defect and costed three options. The product lead chose Option B — seed the
civic buildings — and then stated the intent behind it:

> *"lowkey just have it auto-seed one copy of each of the civic buildings"*
>
> *"structure it in the seeding to where they start with the livability/happiness they would
> have if they previously built those buildings"*

**Status: BUILT, and it now reaches the learner. One question left for the lead**, and it is a
smaller one than the two findings the first version of this record carried: those were *"the
island cannot hold this"* (closed — #544 landed, and the seeding moved to the moment the island
exists) and *"where it fits the panel reads worse"* (closed as far as this change can close it —
the panel reads correctly with #567's population beside it, and does not without).

---

## 1. The answer in five lines

1. **One of each is the wrong quantity and the wrong composition.** A played-through era-one
   city is **four Family Lodges and two Campfires** — six buildings, two of the four rows.
   One of each provides 50 livability against a target of 60.
2. **The right reference already exists in the tree**: an era's *cheapest closing city*, the
   model INV-ERA-4 measures solvency against. Derived here and cross-checked against
   `ERA_LAND_DEMAND`'s independently authored civic column — **all ten eras agree exactly**.
3. **Livability and happiness now come out within exactly the two mastery-derived terms of a
   played-through city.** Those two terms, and the population, are the three things no civic
   building can supply, by the ruling the lead declined to reopen.
4. **⚑ THE MOMENT WAS THE WHOLE OF IT, AND IT WAS NOT THE HAND-OFF.** Seeded at
   `seedFromPlacement` the buildings landed on era one's 22-unit disc, because every founding
   that grows the island runs afterwards: **1 of 24 seated** at four handed ages. Seeded age by
   age as each age is founded, on the land that age's own beat two opened, it is **23 of 24** —
   and the skill buildings are 21 of 21 either way.
5. **⚑ IT IS NECESSARY AND NOT SUFFICIENT, MEASURED BOTH WAYS.** With the civics seated and
   nothing else, a four-age arrival reads *"8 people · 988 sustained · room for 980 more · 8 of
   8 · Content"* — the amenities are real and the crowd is not. With
   #567's population beside it, the
   same city reads *"134 people · 1032 sustained · 134 of 134 · Content"* under the sentence
   *"The city arrived with its crowd, and 21 of its skills are still waiting for a first
   practice set."* **That pair reads correctly and neither half does alone.**

---

## 2. The reference, which was the crux

### An era's closing city, not one of each

`packages/economy/src/civicSolvency.test.ts` defines the capacity an era's population needs as
three times its headline magnitude — `3 × 20 × 2^(N-1)`, era one's *"sustains ~60"* — and
prices the cheapest whole-building plan that reaches it on both axes. That plan is what a
learner who played the era has standing when they leave it.

Derived at the tip, with `ERA_LAND_DEMAND`'s authored cumulative civic-cell column beside it:

```
era               closing city                                    cells  cum  authored
prehistoric       4x Family Lodge,        2x Campfire                24   24        24
neolithic         4x Village Houses,      2x Bread Oven              24   48        48
bronze_age        3x Terraced Fields,     3x Steam House             24   72        72
classical         3x Grain Dock,          3x Baths                   30  102       102
medieval          3x Great Barn,          3x Fairground              24  126       126
renaissance       3x Covered Market,      3x Town Square             30  156       156
industrial        3x Food Works,          3x Railroad Station        24  180       180
atomic_age        3x Supermarket,         3x Swimming Pool           30  210       210
information_age   3x Distribution Center, 3x Roof Garden             30  240       240
cyberpunk         3x Pod Apartments,      3x Night Market            21  261       261
```

**Ten of ten agree.** That column was authored in `packages/skill-graph`, derived by another
lane's exhaustive search in `packages/economy`, and `skill-graph` cannot import the catalogue
that would let it check itself. Two independent searches over one catalogue landing on the
same ten numbers is what makes *"this is what a played-through player has"* a measurement
rather than a claim. `apps/web/src/city/inheritedCivics.test.ts` asserts it per era.

### Why the bar is the TARGET and not equality with a particular city

**Exact equality is not well posed, and this is measured rather than hedged.** Era two has
**two** cheapest cities: three Granaries plus three Bread Ovens, and four Village Houses plus
two Bread Ovens, both exactly 1,080 grain. They do not provide the same thing — **120
livability against 160**. A learner may buy either, so there is no single figure *"the"*
played-through learner has.

So the guard asserts the property every played-through city shares: **the inherited loadout
reaches `3 × 20 × 2^(N-1)` on both axes for every age it covers.** Where a tie has to be broken
anyway, because buildings must stand somewhere, it takes D-ERA25's own tie-break — the larger
footprint — which is the loadout each era's radius was sized for.

### What it cannot match: three numbers alone, ONE of them on the merged tree

```
placed in the fifth age (four ages handed over, 21 nodes, 24 civic buildings)

                             THIS CHANGE ALONE                MERGED WITH #567
played through:            population 134  sustains 1032    population 134  sustains 1032
caught up + full loadout:  population   8  sustains  988    population 134  sustains 1032
gap:                                   126            44                  0             0

coverage, both trees:      played 942, caught up 900, gap 42
```

The 44 is `residenceCapacity(ledger)`; the 42 is `Σ SKILL_HAPPINESS_BY_ROLE` over complete
buildings. Both, like the population, were gated on `mastery >= PRACTICED_MASTERY`, and
`citizens-population.ts` said in as many words that *"since 2026-07-30 you cannot test out into
them either"*. The lead rejected lowering that floor. **So the civic halves match exactly, and
none of the three mastery-derived figures could be matched by anything in this change.**

**⚑ Two of them are matched now, and the merged column above is measured rather than argued.**
#567 moves the crowd for a caught-up
learner **without** touching the mastery floor: `CitizenBuildingLedger.inherited` reads the passed
`placement_estimate`, not `mastery`, and `residence_capacity` reads it too because D-CIT10 pairs
the crowd with the homes. So the population and the livability halves become equalities and
**D-ERA7's amenity term is the one surviving gap** — keyed on a building the learner FINISHED,
which was not reopened, and the one figure in the panel that still records that this city's skills
are undone. `caughtUpCityIsFurnished.test.ts` asserts both closures as equalities, with a floor
under the surviving one so it cannot become two zeroes agreeing. §4 has both readings.

---

## 3. Finding one, CLOSED: the island is too small — and so was the moment

`ERA_LAND_DEMAND` says a learner standing in the fifth age is standing on **217 cells** — 85
skill, 126 civic, 6 hall. Era one's disc gives every learner **88**.

Two separate things put the civics on that 88-cell disc, and only one of them was #544's.

**The first was the disc**, which #544 fixed by making it follow the drawn land: 22 at era one,
30, 35, then 38 wherever the growth ceiling binds.

**The second was the MOMENT, and it was this change's own.** The seeding ran in
`citySession.seedFromPlacement` — the diagnostic's hand-off — which is *before every founding
that grows the island*. So `liveBuildableRadius()` answered era one's 22 however deep the
placement, and #544 changed nothing about it. Measured at the branch tip after #544 landed,
through the real hand-off and the mounted walk:

| placed in | ages handed | skills seated | inherited civics seated |
| --- | --- | --- | --- |
| neolithic | 1 | 6 of 6 | **6 of 6** |
| bronze_age | 2 | 11 of 11 | **5 of 12** |
| classical | 3 | 16 of 16 | **3 of 18** |
| medieval | 4 | 21 of 21 | **1 of 24** |
| renaissance | 5 | 26 of 26 | **1 of 24** |

The skill column is #544 working. The civic column is the moment being wrong.

### Seeded age by age, at the founding of the age that owes them

Founding age `N` walks the shore out to age `N+1`'s radius at beat two, so by the time an age has
been founded there is land for its buildings — which is the same reason `CityCatchUp.autoPlace`
seats age `N`'s skill roster on the disc age `N-1`'s founding opened. Driven through the shipped
`CitySurface`, one fake-clocked founding per handed age:

| placed in | ages handed | skills seated | inherited civics seated | disc per age |
| --- | --- | --- | --- | --- |
| neolithic | 1 | 6 of 6 | **6 of 6** | 30 |
| bronze_age | 2 | 11 of 11 | **12 of 12** | 30, 35 |
| classical | 3 | 16 of 16 | **18 of 18** | 30, 35, 38 |
| medieval | 4 | 21 of 21 | **23 of 24** | 30, 35, 38, 38 |
| renaissance | 5 | 26 of 26 | **23 of 30** | 30, 35, 38, 38, 38 |
| industrial | 6 | 32 of 32 | **18 of 30** | 30, 35, 38, 38, 38, 38 |

**The five- and six-age denominators moved while this was being measured, and that is the
derivation working rather than a re-tune.** `integration` @ `27dcb4df` landed the MEDIEVAL civic
catalogue's art, so era five became model-backed: a five-age learner is owed 30 rather than 24,
with no edit in this lane. `civicOptionsForEra` fails closed on a part-authored era, so eras six to
ten still inherit nothing and still seat nothing — asserted in both directions rather than
promised, and one driven depth is chosen specifically because it founds an age with no art.

**Where in the founding, and it is not a free choice.** `islandLand.ts` documents the trap twice:
`islandEra` swaps at beat four's halfway mark — a beat and a half after the land grows — and beat
two itself reports three to five intermediate radii while the shore animates. #537 (the island's
dressing) and #544 (the buildable disc) both key off `ceremonySurvey` and latch at `>= 1`; so does
this. `inheritedCivicsSeatedAtTheFounding.test.tsx` asserts the disc each age was seeded at, that
each disc is a radius some era actually authors, and that the seeding fires in the beat after the
land grew rather than in the re-theme. Injecting each of the three wrong conditions fails it.

**What is still short is the growth ceiling, not the seeding.** `islandLand.ts` holds the drawn
land at grass 46, so eras four to ten all build on a disc of 38 against the 42-to-69 their budgets
author — and the deeper the placement the more skill buildings share it (21 cells' worth at four
ages, 26 at five, 32 at six), which is why the civic column turns over at five rather than growing.
`civicSeats.test.ts` seats every era's closing city in full on the disc that era's own budget asks
for, which is what makes the difference the ceiling's cost rather than this change's — the same
ceiling that leaves the nine-age skill roster at 50 of 53. **Raising it is the road lane's depth
budget work and is not this change's to take:** the two figures that decide it are
`ISLAND_GROWTH_CEILING` and `depthPrecision.test.ts`'s 4-step bar.

### And a third thing, which the fix exposed rather than caused

`CitySurface` wrote the walk's placements to the session and **never re-read them**. The walk's
`occupants` and `placedNodeIds` props are derived from that read, so `autoPlace` laid age `N`'s
roster out against an island holding only the hall, the seats landed on ages `1..N-1`'s buildings,
and `placeSkill` refused every one of them silently — a refusal is a no-op, and `ringLayout` had
already reported success, so the shortfall notice never fired either.

**Measured through the surface at four handed ages: 6 of 21 skill buildings.**
`eraDiscSeatsTheRoster.test.tsx` reported 21 of 21 throughout, because its harness hands the walk
fresh occupants of its own and calls that *"the one line of `CitySurface` these counts depend
on"*. It was standing in for a line that was not there. Every other host write on that surface is
already `await onX(); await refresh()`; the walk's two now are too.

---

## 4. Finding two, as far as this change can close it: necessary, not sufficient

### The frames, at 1024x580, the lead's own window

Six, in [`docs/design-refs/caught-up-vitality/`](../../design-refs/caught-up-vitality/), with a
README naming what each shows. Whole-window rather than cropped, for
`.cursor/rules/qa-verification.mdc`'s reason: the panel is the one part of the picture nobody
doubted.

```
THE SEEDING ALONE
  one age    (neolithic)     8 people ·  108 sustained, room for 100 more ·   8 of 8   · Content
  two ages   (bronze_age)    8 people ·  268 sustained, room for 260 more ·   8 of 8   · Content
  four ages  (medieval)      8 people ·  988 sustained, room for 980 more ·   8 of 8   · Content
                             + "Everybody is sustained, and an amenity reaches all of them."
  era one    (control)       8 people ·   28 sustained, room for  20 more ·   0 of 8   · Wants more to do

WITH #567'S POPULATION IN THE TREE
  two ages   (bronze_age)   74 people ·  312 sustained, room for 238 more ·  74 of 74  · Content
  four ages  (medieval)    134 people · 1032 sustained, room for 898 more · 134 of 134 · Content
                             + "The city arrived with its crowd, and 21 of its skills are still
                                waiting for a first practice set."
```

The second pair was measured by checking #567's five source files out over this branch, shooting
the frames and reverting them. **This branch contains none of that work.**

> **⚑ 2026-08-05: THE TWO BRANCHES ARE NOW MERGED, and the prediction held.** This change
> squash-merged as `25bcbdfd`; #567 then merged trunk and #584, and the four-age frame was re-shot
> on the merged tree through `caughtUpCrowdShots.browser.test.tsx` — the shipped
> `CitySurface`, 1024x580, the walk's real per-founding seeding rather than a five-file
> substitution. It reads **134 people · 1032 sustained · room for 898 more · 134 of 134 ·
> Content**, and two ages reads **74 · 312 · 74 of 74 · Content**: the `WITH #567` block above,
> digit for digit, and the frames are at
> [`docs/design-refs/caught-up-crowd/`](../../design-refs/caught-up-crowd/). So the figures in it
> stop being a substitution's estimate and become a measurement of the product.

### The honest read of each

**The state the lead named is fixed.** Before this change a learner caught up two or four ages
arrived at a twenty-one-building city with **zero amenities**, sitting in the unhappiness warning.
They now arrive at a full island whose amenity coverage is complete, and the deep frame looks like
a city rather than a building site.

**And the seeding alone still does not read correctly.** The crowd is 8 against a capacity of 988,
so `CapacityScale` — which spans `max(population, sustains)` — puts the crowd notch at under 1% of
the livability track under the figure *"988 sustained"*, and `shortfalls.none` prints *"Everybody
is sustained"* over a city with **0 of 26 mastered**. #567's author looked at that frame and said
it still reads wrong. Re-measured here at the deep placement rather than the shallow one: it does.

**With #567 beside it, it reads correctly.** A crowd of 134 against 1032, coverage complete, and
one sentence naming what is undone. Neither half gets there alone — without the seeding #567 has
a crowd and no amenities; without #567 the seeding has amenities and no crowd.

---

## 5. The one question left, which is the lead's

**The margin.** Even together, a four-age arrival reads *"room for 898 more"*, because the civics
are seeded to the era's capacity TARGET — `3 × 20 × 2^(N-1)`, what a played-through city buys —
while the crowd is the era's population. Two ways to close it, and neither is this change's to
rule:

- **A. Leave it.** The learner is standing in the city a played-through learner would have, which
  is the lead's stated intent verbatim, and a city with room to grow into is not a defect. The
  panel says what it is short of, which is the practice.
- **B. Scale the seeding to the crowd rather than to the era's target.** A four-age city would
  then provision for its 134 rather than for 960, and the livability row would read as nearly
  full. It contradicts the stated intent — these would no longer be *"the buildings they would
  have if they previously built those buildings"* — so it is offered as a question.

**Recommendation: A**, on the grounds that the frames with #567 in the tree already read
correctly, and B trades the intent for a bar chart.

---

## 6. What is NOT established here

- **Whether a settled-but-unmastered panel actually reads as wrong to a learner.** The frames say
  it reads oddly to the people who took them. Nobody has watched a learner arrive.
- **Anything about #567 beyond the frames above.** Its five source files were checked out over
  this branch, photographed and reverted; the counts and margins that lane reports are its own.
  (**Superseded 2026-08-05**: the branches are merged and the frames re-shot on the real
  surface — see the note in §4. What is still not established here is anything about #567's own
  arithmetic, which its record owns.)
- **Anything about eras five to ten.** They have no civic art, so `civicOptionsForEra` fails
  closed and they inherit nothing. The derivation picks them up with no code change on the day
  Evan's art lands; that is asserted in both directions rather than promised.
- **The departure consequence.** Departures are being removed concurrently in another lane and
  nothing here touches that path.
