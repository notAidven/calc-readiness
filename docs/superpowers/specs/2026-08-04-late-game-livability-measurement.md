# Late-Game Livability: Is It Solvable, And By How Much Does It Miss?

**Status:** Measurement only. Nothing is fixed here, and nothing should be until §7 is decided.
**Measured at:** `origin/integration@5d039a99` ("Era four's remaining assets…", #540).
**Method:** every figure below comes from driving the shipped functions —
`buildingLedger`, `citizenPopulation`, `residenceCapacity`, `deriveCityVitality`,
`deriveDepartures`, `lessonCompleteGrant`, `interleavedGrant`, `civicOptionsForEra`,
`civicContributionRowsOf`, `resolveEraPlots` — over a harness that was deleted after the run.
No arithmetic in this document is re-implemented. Where a number rests on an assumption,
the assumption is named in §8.

---

## 1. The answer

**The late game is solvable, and comfortably.** At the ceiling the widest gap is **zero**:
a player who spends each of eras one to four's income on that era's catalogue reaches
**3,432 livability** against a maximum population of **380**, with happiness at 100% and
`deriveDepartures().leaving === 0` at every one of the ten eras.

It is solvable by a wide enough margin that the *design's own* purchase plan clears it
without trying. `civicSolvency.test.ts` sizes every era's grant against "the cheapest
closing city" — three of the cheaper livability row plus three amenities. Buy exactly that
in eras one to four and nothing else ever, and the city ends era ten at **972 livability
and 1,021 happiness coverage against 380 people, shedding nobody**. That plan costs 520 +
1,080 + 2,160 + 4,320, and each era's own income covers its own line.

**So the reported finding's arithmetic is right and its conclusion is not.** Every number
in the report reproduces exactly (§2). What does not follow is "unwinnable": the report
treats eras five to ten's empty Civic tab as the only lever, and there are two others —
eras one to four's catalogue is buyable without limit and never decays, and roads buy
happiness at 5 material a tile in every era.

**What is real, and is the finding worth acting on, is a different defect: the gap is
invisible until it is unfixable.** A player who does what the panel asks — buy until nobody
is leaving, or buy until the shortfall readout is zero — lands on **272 livability** and
starts shedding at **era eight**: 4 people, then 13 at era nine, then **26 at era ten**
against a population of 380. That is a shortfall of **108 people** at the end of the run.
And by then the lever is gone: `civicOptionsForEra` returns zero rows from era five, so
**livability cannot be raised by any action available after era four**. Under-buying in the
first four eras is an irreversible, unsignposted trap, and buying "enough" is exactly what
produces it.

The two headline gaps, both measured off `deriveDepartures`:

| Play style | Livability reached | Population at era ten | First era that sheds | Shed at era ten |
|---|---|---|---|---|
| Buys nothing, lays nothing | 72 | 380 | era **one** (6 people) | **75** |
| Buys what the panel asks for | 272 | 380 | era **eight** (4 people) | **26** |
| Spends everything, eras 1–4 | 3,432 | 380 | never | **0** |

---

## 2. Verifying the finding

The report reproduces **exactly**, and the reading that produces its numbers is
"arrived in era N with every *prior* era mastered" — which is what it says.

| Claim | Verdict | Measured at `5d039a99` |
|---|---|---|
| `CITIZEN_NODE_CAPACITY` has rows only for the six `NUM.*` nodes | **Confirmed** | The table holds `NUM.2/S/F/5/3/4` and nothing else; `capacityForNode` returns `EMPTY_CITIZEN_CAPACITY` for the other 56 nodes |
| Every node in eras two to ten contributes zero homes | **Confirmed** | `residenceCapacity` is **44** at every era from one to ten, over the real `resolveEraPlots` roster at full mastery |
| `livability.sustains` is 72 at every era from two to ten | **Confirmed** | 72 at eras two through ten, arriving; decomposes as 8 hub + 20 free Smokehouse + 44 residences, exactly as reported |
| Population climbs 44 → 326 | **Confirmed** | Arriving in each era: 8, 44, 74, 104, 134, 164, 200, 236, 290, **326** |
| Early Modern is 164 people, sheds 21 | **Confirmed** | Arriving in era six: population 164, `leaving` **21**, cause `sustenance` |
| Era ten is 326 against 72, shedding 61 | **Confirmed** | Arriving in era ten: population 326, `leaving` **61** |

Two corrections of framing rather than of arithmetic:

- **Finishing era ten is 380 people, not 326.** The report's ten rows are the ten
  *arrivals*; the tenth arrival carries nine eras of mastery. A player who then masters
  era ten's own nine `TRG.*` nodes reaches **380**, and the floor sheds **75**.
- **"From era two onward" understates it.** On the buys-nothing floor the city already
  sheds **6 people at era one** (44 people, 9 coverage, 20%, `restless`). That is not a
  regression — `DEPARTURE_SHARE`'s docblock measures exactly that 1, 2, 3, 4, 5, 6 curve
  and calls it the intended trickle. But era two is not where departures begin.

**The Civic tab claim is confirmed and is a *model* gate, not a catalogue gap.**
`CIVIC_CATALOGUE` in `@cr/economy` authors all forty rows, four per era, for all ten eras.
What is missing is art: `art/models/` holds sixteen `civic-*-built.glb` files covering eras
one to four and no others, so `civicOptionsForEra` — which fails closed unless all four of
an era's rows resolve a distinct bundled GLB — returns 4 rows for eras one to four and
**0 rows for eras five to ten**. `civicModelBackedEras()` measures
`["prehistoric","neolithic","bronze_age","classical"]`. `citySession.placeCivic` refuses
with `"unavailable"` for anything outside that set, so the gate is on the purchase path and
not only on the menu.

**The phantom free row does not distort anything reported here.**
`civicContributionRowsOf([])` measures `[{livability: 20, happiness: 0}]` — one row, worth
20 livability, with no placement behind it. It is counted exactly once in every figure in
this document, because every figure goes through that one function, which is also what
`CitySurface` calls. It is worth noting for a different reason: it is 28% of the 72 that
the un-buying city sustains, so a future change that gives the Smokehouse a real placement
without deleting the row would silently add 20 livability to every city in the game.

---

## 3. The per-era table

Population is `citizenPopulation` over the full `resolveEraPlots` roster for eras 1..N at
mastery 2. Livability decomposes as **8 hub + 20 free Smokehouse + 44 era-one residences +
civics**; the first three are constant at **72** in every row of every table because
`residenceCapacity` never moves off 44. Happiness decomposes as **skill-building
per-role coverage + civic happiness + roads at 1/tile**. `leaving` is read off
`deriveCityVitality().departures`, cross-checked against a direct `deriveDepartures` call
on every row.

### A. The floor — buys nothing, lays no roads

The report's scenario, at the "finished era N" reading.

| Era | Pop | Sustains | Coverage | Level | Band | Leaving | Cause |
|---|---|---|---|---|---|---|---|
| 1 Prehistoric | 44 | 72 | 9 | 20% | restless | **6** | amenities |
| 2 Neolithic | 74 | 72 | 19 | 26% | restless | **9** | amenities |
| 3 Bronze Age | 104 | 72 | 29 | 28% | restless | **12** | amenities |
| 4 Classical | 134 | 72 | 39 | 29% | restless | **16** | amenities |
| 5 Medieval | 164 | 72 | 49 | 30% | restless | **21** | sustenance |
| 6 Early Modern | 200 | 72 | 61 | 31% | restless | **30** | sustenance |
| 7 Industrial | 236 | 72 | 73 | 31% | restless | **39** | sustenance |
| 8 Atomic | 290 | 72 | 91 | 31% | restless | **52** | sustenance |
| 9 Information | 326 | 72 | 103 | 32% | restless | **61** | sustenance |
| 10 Cyberpunk | 380 | 72 | 121 | 32% | restless | **75** | sustenance |

The cause flips from `amenities` to `sustenance` at era five, which is the point where
livability rather than happiness becomes the deeper deficiency. That is the grain of truth
behind "from era five" in the report: era five is where the *reason* changes, not where the
losses start.

### B. Panel-guided play — buys the least that keeps `leaving` at zero

Each era's purse is that era's own lesson income plus the full ten paid drill sets. Roads
are available. The player buys the cheapest thing that clears the warning and stops.

| Era | Pop | Sustains | Coverage | Level | Band | Leaving | Purse | Bought |
|---|---|---|---|---|---|---|---|---|
| 1 Prehistoric | 44 | 72 | 29 | 66% | settling | 0 | 800 | 1× Campfire |
| 2 Neolithic | 74 | 112 | 49 | 66% | settling | 0 | 1,600 | 1× Village Houses |
| 3 Bronze Age | 104 | 112 | 122 | 100% | content | 0 | 3,200 | 63 road tiles |
| 4 Classical | 134 | **272** | 132 | 99% | settling | 0 | 6,400 | 1× Grain Dock |
| 5 Medieval | 164 | 272 | 142 | 87% | settling | 0 | 12,800 | *tab empty* |
| 6 Early Modern | 200 | 272 | 154 | 77% | settling | 0 | 25,600 | *tab empty* |
| 7 Industrial | 236 | 272 | 166 | 70% | settling | 0 | 51,200 | *tab empty* |
| 8 Atomic | 290 | 272 | 184 | 63% | settling | **4** | 102,397 | *tab empty* |
| 9 Information | 326 | 272 | 196 | 60% | settling | **13** | 204,800 | *tab empty* |
| 10 Cyberpunk | 380 | 272 | 214 | 56% | restless | **26** | 409,597 | *tab empty* |

Modelling the same player as buying until `shortfalls.none` is true instead — the stronger
reading of "does what the panel says" — changes the happiness column and **not the
livability one**: it also ends at 272 and also sheds 4 / 13 / 26. The livability shortfall
is zero at every era through seven, so no shortfall readout ever asks this player to buy
more housing, and the two policies converge.

Two things about the warning on this trajectory. The alarm does fire correctly — at era
eight `cause` is `sustenance` and `warned` is true, and `departureThresholdIsShared.test.tsx`
already guarantees the panel alarms the livability row when the engine blames livability.
But at era seven `cause` is `null`, so **the panel is entirely calm right up to the era in
which people start leaving**; and the happiness band reads `settling` on both sides of that
step, because `bandFor` is a function of the happiness level alone and this deficiency is on
the other limb. So the dial a learner watches never moves, and the row that does light up is
the one row they can no longer act on.

### C. The ceiling — spends every era's whole purse

The user's "buys every civic building they can afford as soon as it is available".

| Era | Pop | Sustains | Coverage | Level | Leaving | Bought that era |
|---|---|---|---|---|---|---|
| 1 Prehistoric | 44 | 272 | 59 | 100% | 0 | 10× Family Lodge (800) |
| 2 Neolithic | 74 | 712 | 99 | 100% | 0 | 8× Granary + 3× Village Houses (1,600) |
| 3 Bronze Age | 104 | 1,672 | 129 | 100% | 0 | 11× Terraced Fields + 1× Walled Houses (3,200) |
| 4 Classical | 134 | **3,432** | 187 | 100% | 0 | 11× Grain Dock + 48 road tiles (6,400) |
| 5–10 | 164→380 | 3,432 | 328→790 | 100% | **0** | roads only; 320–655 material an era |

Livability tops out at **3,432 — nine times the population it ever has to hold.** Every
point of it is bought in the first four eras, and every point of it survives to era ten:
`legacyDecayFactor` exists in `@cr/economy` but the shipped vitality path
(`civicContributionRowsOf` → `deriveCityVitality`) reads `row.provides.livability` raw, so
an era-one Family Lodge is worth its full 20 in era ten.

Two sub-cases worth having, because they bound the assumptions:

- **Ceiling with no roads at all** (civics only): clears eras one to nine and sheds **3
  people at era ten** — happiness 221 against 380, 58%, just under the 60 line. So roads
  are load-bearing for the last era and worth about 3 citizens.
- **Ceiling on lesson income only** (no practice drill whatsoever): reaches **2,532
  livability**, and without roads sheds 3 / 6 / 12 at eras eight to ten. Lesson income
  alone still over-covers livability by 6.6×; the drill is not what makes this solvable.

### D. Affordability

Every purchase above is paid for out of the era it is made in, driven through
`lessonCompleteGrant` and `interleavedGrant`:

| Era | Lesson income | Drill income (10 sets) | Total purse | Cheapest closing city |
|---|---|---|---|---|
| 1 | 600 | 200 | 800 | 520 |
| 2 | 1,200 | 400 | 1,600 | 1,080 |
| 3 | 2,400 | 800 | 3,200 | 2,160 |
| 4 | 4,800 | 1,600 | 6,400 | 4,320 |
| 5–10 | 9,600 → 307,197 | 3,200 → 102,400 | 12,800 → 409,597 | **unbuyable** |

There is no cross-era carry: `materialCarryForward` is authored in `@cr/economy` and
**unwired** (`economySession.ts` says so at the point it declines to wire it), and
`WalletView.spendable` is the current era's material alone. So leftover era-one stone is
inert from era two onward. Each line above is self-funding regardless, so the conclusion is
unaffected — but it means the theoretical livability in §3C is genuinely reachable and not
an artefact of a carry the game does not grant.

**806,394 units of era five to ten income have no livability sink at all.** Roads at a flat
5 a tile are the only spend, and land caps those rather than money: the ceiling player ends
era ten having laid **569 tiles for 2,845 material**, which is every free cell left after
138 cells of civic footprint on a 707-cell margin. They finish the game with essentially the
entire late economy unspent and nothing left that money could buy.

---

## 4. What is actually broken

Solvable is not the same as well-designed. Four things are load-bearing here, in
descending order of how much they matter:

1. **The requirement is invisible when it is payable and visible when it is not.** In eras
   one to four the panel reports no livability shortfall, so nothing asks the player to
   buy housing. From era five the shortfall is real, growing and unfixable. Every readout
   the game has is a snapshot of the current era; nothing anywhere tells a player that
   era four is the last chance to buy a home.

2. **The recovery lever is removed exactly when it is first needed.** From era five the
   Civic tab is empty. Roads raise happiness and never livability, so `sustenance`
   departures — which are all of them from era five on — cannot be answered at all.

3. **`residenceCapacity` is flat at 44 for the whole run.** 56 of the game's 62 skill
   buildings house nobody. That is the structural cause: the city's own earned buildings
   stop contributing after the first six, so the entire ten-era crowd rests on bought
   civics from four eras.

4. **The economy and the population are on different curves.** Catalogue contributions
   scale `2 ^ (N-1)`; `citizenPopulation` grows by a flat 6 per mastered node, so +30 to
   +54 an era. One era-five Great Barn is 320 livability against a whole-run population of
   380. The mismatch reaches **80.8×** by era ten (§6), and it is why the ceiling
   over-covers so absurdly while panel-guided play under-covers.

---

## 5. Does the demo reach it?

**No — the demo cannot reach it, and the reason is a hard cap rather than a judgement about
how far anyone will play.** This is a next-week problem, with one Friday presentation
caveat.

**The `?era=` hatch caps the population at 98.** `eraExpansionSeedStates` seeds **era one
mastered plus the target era's own nodes, not-started** — it does not seed the eras in
between. So at `?era=cyberpunk` the crowd is era one's 44 plus at most era ten's nine nodes,
and mastering every one of them live in the session reaches **98 people**. The livability
shortfall in §3B needs 290. There is no hatch, and no sequence of hatches, that produces a
crowd that big; a demo would have to play eras two through seven through their real lessons.

Measured over all ten slugs, with era one mastered and nothing bought:

| Hatch state | Pop | Sustains | Coverage | Level | Band | Leaving | Cause |
|---|---|---|---|---|---|---|---|
| `?era=<any slug>`, on arrival | 44 | 72 | 9 | 20% | restless | **6** | amenities |
| `?era=<any slug>`, that era's set mastered | 74–98 | 72 | 19–27 | 26–28% | restless | **9–12** | amenities |
| `?mock&mastered` | 44 | 72 | 9 | 20% | restless | **6** | amenities |
| `?mock&paths` (18 tiles pre-laid) | 44 | 72 | 27 | 61% | settling | 0 | — |
| bare island | 8 | 28 | 0 | 0% | restless | 0 | — |

The deepest the demo can go is **12 people leaving**, at `?era=atomic_age` or
`?era=cyberpunk` with that era's nine nodes mastered. **Every departure it can reach is
`amenities`-caused**, on every slug — the amenity pressure is deeper than the sustenance
pressure at these populations — and amenities are answerable with road tiles at 5 material,
which are affordable in every era once that era's first lesson pays. So the demo cannot show
the unfixable failure, only the fixable one.

**The Friday caveat is the first row, and it is presentational.** Every later-era hatch
opens on a `restless` city already shedding six people, and at `?era=` for any era from five
the learner also has an **empty Civic tab and a zero wallet** — `spendable` is the live era's
material, and era one's lessons paid stone. Until they finish one era-N lesson there is no
action at all available. Those six departures are the authored era-one trickle rather than
the defect in this document, and `?mock&paths` or one Campfire clears them. But a demo driven
from `?era=medieval` shows an empty Civic tab beside a distressed panel, which reads as this
bug without being it. Demo from era one, or from `?mock&paths`.

---

## 6. What should have caught this

Nothing did, and the tree is green: **501 test files and 11,360 tests pass at `5d039a99`**
over a city that sheds 75 citizens at era ten. Two guards each own half of this question,
and the seam between them is unguarded.

**`packages/economy/src/civicSolvency.test.ts` sweeps all ten eras against a population the
game never produces.** Its target is `3 × 20 × 2^(N-1)` — "the era's headline magnitude" —
and it is not `citizenPopulation`:

| Era | Solvency target | Real `citizenPopulation` | Ratio |
|---|---|---|---|
| 1 | 60 | 44 | 1.4× |
| 4 | 480 | 134 | 3.6× |
| 7 | 3,840 | 236 | 16.3× |
| 10 | **30,720** | **380** | **80.8×** |

Both sides of that comparison scale by `2^(N-1)`, so the ladder cancels and the sweep is
internally consistent and structurally blind: it can never see that the real population
grows linearly while the catalogue grows exponentially, and it never touches
`residenceCapacity`, `deriveCityVitality` or `deriveDepartures` at all.

**`test/citySolvencyTrajectory.test.ts` drives the real `citizenPopulation` over era one
only.** Its population is `D1_NODES` — the six `NUM.*` — and its own header says so. It is
the file that would have caught this, at the era it does not cover.

**Every guard over the vitality path has an era-one population.** Eight test files exercise
`deriveCityVitality`, `deriveDepartures` or `cityVitality`:

- four name era one's six `NUM.*` ids directly — `engines/game/src/city-vitality.test.ts`,
  `city-vitality-civic.test.ts`, `city-departures.test.ts`, `test/capacityModelAgreement.test.ts`;
- three build their cities from `MOCK_NODE_STATES`, which is the same six —
  `departureThresholdIsShared.test.tsx`, `cityPeople.contract.test.ts`,
  `cityLifeExplainers.test.tsx`;
- the eighth, `civicLedgerPlacement.test.ts`, names `LIN.1` and `LIN.3`, but only to fund an
  in-memory economy and to assert a purchase *delta* on a city with no skill placements at
  all — its population is the founding eight.

So **no shipped guard drives the vitality path over a population drawn from more than one
era**, which is the "population is era one only" shape `.cursor/rules/qa-verification.mdc`
names. Note this is not a case of the guards being lazily scoped: each is a correct, careful
guard on its own subject, and `departureThresholdIsShared.test.tsx` in particular sweeps 48
cities across four moved thresholds. The population is right for the question each asks.
None of them asks this one.

**And none of them asserts the city is livable.** `engines/game/src/city-departures.test.ts`
asserts the departure *mechanism* — the shallow band, the floor, the monotonicity over 4096
mastery vectors, the round trip — which is a correct and thorough guard on the rule. It
does not assert that a competently played city avoids departures, and those are different
claims. `test/capacityModelAgreement.test.ts` is likewise about *agreement* between the two
capacity models, not about whether either produces a livable city.

**One further hole worth naming while it is in view:** nothing joins `civicOptionsForEra`'s
art gate to the capacity model. "Six of the ten eras can buy nothing" is a fact about the
GLB glob, and no capacity or solvency test reads it, so an era's catalogue can be priced,
swept, declared solvent and be unreachable in the product simultaneously.

The guard this wants is one that drives `citizenPopulation` and `deriveCityVitality` over
the full ten-era roster and asserts a reachable purchase plan clears `leaving === 0` — with
its population derived from `ERA_SEQUENCE`/`resolveEraPlots` rather than a written-down node
list, and with a floor asserting the roster really does span more than one era. Writing it
before §7 is decided would pin the wrong number, which is why this document stops here.

---

## 7. Recommendation

**This is not a tuning problem.** No constant in `city-vitality-tuning.ts` is mis-set:
moving `HAPPINESS_BAND_FLOOR.settling` or `DEPARTURE_SHARE` changes *when* the shortfall
bites and never whether livability can be raised after era four, and the ceiling already
clears with 9× headroom, so there is no dial whose current value is the cause. A retune
would move the symptom and leave the trap.

Four options, costed by what has to change:

**Option 1 — Ship Friday as-is.** Zero change. Defensible: the demo provably cannot reach
the late game (§5), and the era-one trickle it *can* reach is authored behaviour. Risk is
presentational — a later-era hatch shows an empty Civic tab beside a distressed panel.
Mitigated by demoing from `?mock&paths` or from era one.

**Option 2 — Commit civic art for eras five to ten.** Content: 24 GLBs, no code. The
resolver already fails closed per era, so each era joins the tab the moment its four files
land, and `placeCivic`'s `"unavailable"` branch stops firing. This removes the irreversible
trap — a player who under-bought in era four can recover in era five — and leaves the
economy's 806,394 unspendable units with somewhere to go. It does **not** make the
requirement visible, and it does not touch `residenceCapacity`.

**Option 3 — Give eras two to ten's skill buildings `CITIZEN_NODE_CAPACITY` rows.** A data
edit in `engines/game/src/citizens-tuning.ts`, plus one real consequence:
`ENDGAME_SPARE_HOMES = 0` is pinned on era one's 44 = 44, and `citizens-tuning.test.ts` and
`citizens-invariants.test.ts` hold that ending, so the settled-endgame invariant has to be
restated per era rather than for the run. This is the structural fix — it makes population
and housing move together by construction, the way era one already does, and it is the only
option that removes the dependence on bought civics entirely.

**Option 4 — Rule on the curve mismatch (§4.4) first.** The catalogue is exponential and
the population is linear, and they diverge by 80.8× (§6). Option 3's numbers cannot be
chosen without knowing whether livability is meant to stay on the `2^(N-1)` ladder: if it
is, then one late-era building will always dwarf the whole crowd and per-node housing rows
have to be tiny; if it is not, the catalogue magnitudes need re-authoring across ten eras.

**What I would do: Option 4, then 3, with 2 alongside; nothing before Friday.**

Option 4 is not deferral — it is the only question whose answer changes the other three.
Picking Option 2 or 3 first means choosing magnitudes against a ladder nobody has ruled on,
and both are expensive to redo (24 assets, ten catalogues). Option 3 is the fix that makes
the defect structurally impossible rather than merely payable, and it is the cheapest of
the three in code. Option 2 is worth doing regardless of the ruling, because an empty Civic
tab for six of ten eras is a product hole independent of the capacity model, and because it
is the only one of the three that is pure content and can proceed in parallel.

For Friday: change nothing. The demo does not reach this, and a tuning change shipped
before the ladder ruling would be a guess landing in the one file whose whole discipline is
that every number in it has an argument attached.

---

## 8. Assumptions, stated

Each of these is a modelling choice, not a measurement, and each is the generous direction
unless noted:

- **Mastery.** Every node in eras 1..N is at `mastery: 2`, `placed: true`,
  `lesson_stage: "done"`, `placement_estimate: 0`, with the citizen role resolved through
  the shipped `resolveEraPlots` rather than assumed. Mastery 3 adds nothing (D-CIT11).
- **"At era N"** means *finished* era N — eras 1..N mastered — except in §2's verification
  table, where the *arrived* reading (eras 1..N-1) is used because that is what reproduces
  the report. Both are given side by side in §2.
- **Drill income.** The full `DRILL_PAID_SETS_PER_ERA` (10) paid sets in every era,
  credited through `interleavedGrant` with `priorPaidSets` walked 0..11 so the bound is the
  shipped one. §3C gives the lesson-only figure beside it.
- **No carry-forward**, matching the shipped wallet (`materialCarryForward` is unwired).
- **Roads.** 5 material a tile flat (`ROAD_TILE_GOLD_COST`, not era-scaled), 1 happiness a
  tile, capped by free land — `buildableCellCount(eraBuildableRadius(era))` minus
  `ERA_LAND_DEMAND`'s cumulative skill cells, the hall's 6, standing civics and standing
  roads. The ceiling lays 569 tiles by era ten against 707 free cells; panel-guided play
  lays 63. Both are well inside the island.
- **Land.** Civic footprints are charged against the same free-cell budget. `ERA_LAND_DEMAND`'s
  skill column is an upper bound for eras eight to ten (2×2 default), so the free-cell
  figures are conservative.
- **No crisis.** Mid-era crisis damage can ruin buildings and suspend civic contributions,
  and none of that is modelled. Worth a separate look: `CitySurface` passes
  `civicContributionRowsOf(civicPlacements)` with the raw placement list, so a
  crisis-suspended civic still appears to contribute on the vitality path even though
  `@cr/economy`'s `civicStandingCapacity` knows how to exclude it.
- **No legacy decay**, matching the shipped path. `legacyDecayFactor` is implemented and
  tested in `@cr/economy` but is not applied by `civicContributionRowsOf`. Were it wired,
  every era-one-to-four building would be worth 50–73% of its face value in era ten and the
  §3C ceiling would fall to roughly half of 3,432 — still far above 380, so the answer in
  §1 does not turn on it.
- **The purchase plans in §3B and §3C are optimal within their own rule**, found by
  exhaustive search over whole-building counts per era against that era's purse and free
  land, scored on `deriveDepartures().leaving` (§3B) or on `livability.sustains` (§3C).
  They are greedy *across* eras, so §3C is a lower bound on the true ceiling — which only
  strengthens §1.
