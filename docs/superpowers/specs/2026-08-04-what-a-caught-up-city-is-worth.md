# What a caught-up city is worth: the statistics a test-out learner arrives with (MEASURED, one decision owed)

**Recorded 2026-08-04 at `integration` @ `886482dc`.** Every figure below was measured by
running the code at that tip, not derived from reading it: the vitality figures are read off a
rendered `CityVitalityPanel`, the placement counts are read back off a real `createCityDevSession`
after a real walk, and the departure figures are produced by running
#500's own `deriveDepartures` at those
inputs. **Status: MEASUREMENT plus one recommendation. No design ruled. The decision in §5 is the
product lead's.**

**The question, from the product lead, verbatim:**

> *"whats the behavior on livability/happiness metrics if the user isnt building the civic
> buildings for that era? or are they? what are the buildings that are being built"*

---

## 1. The answer in four lines

1. **The catch-up places one skill building per handed-over skill node, and no civic buildings and
   no roads.** Measured: `composition: skill-node=N, civic=0, roads=0` at every placement.
2. **A learner who catches up to the Classical or Medieval era arrives with a vitality panel
   IDENTICAL to a cold learner's on an empty island**: population **8**, livability **28
   sustained**, happiness **0 of 8**, *"Wants more to do"*. Eighteen buildings standing change
   none of the three figures.
3. **The reason is not the missing civics.** It is that `buildingLedger` requires
   `mastery >= PRACTICED_MASTERY` for a building to count at all, and a tested-out node is
   mastery 0 by ratified rule. The same 21 buildings, practised, give population **134** and
   residence capacity **44**. Tested out they give **8** and **0**.
4. **Nothing punishes them for it**, and that is measured rather than assumed: #500's departure
   rule takes nobody, because its floor is `FOUNDING_POPULATION` and their population *is* the
   founding population.

---

## 2. What is actually placed

Driven through `CityCatchUp` against a real `createCityDevSession`, taking the auto-layout road at
every handed age, then reading the session back:

```
placed in        handed  roster  standing  civic  roads  cumulative
neolithic             1       6         6      0      0  [6]
bronze_age            2      11        11      0      0  [6, 11]
classical             3      16        16      0      0  [6, 11, 16]
medieval              4      21        18      0      0  [6, 11, 16, 18]
renaissance           5      26        19      0      0  [6, 11, 16, 18, 19]
industrial            6      32        19      0      0  [6, 11, 16, 18, 19, 19]
```

**The composition is one building per skill node and nothing else.** `ringLayout` is called with
`eraRosterNodeIds(eraId)`, which is `getEraOrThrow(eraId).nodes` — the era's skill nodes. There is
no civic term anywhere in the path, and the 62-of-62 figure quoted in the stage-1 PR is exactly the
skill-node count for that reason.

**This is not an oversight in the walk so much as an absence of anywhere to get them.** Civic
buildings are bought, not placed: `placeCivic` takes a payment callback and refuses on an
unaffordable purchase. A layout pass has no wallet and should not have one.

---

## 3. What the panel says, measured off a rendered panel

Read off `CityVitalityPanel` after the walk above, with the city standing in the era it landed in:

| | population | livability | happiness | terms |
| --- | --- | --- | --- | --- |
| **Caught up to Classical** (16 buildings) | **8 people** | **28 sustained**, room for 20 more | **0 of 8** | *Wants more to do* |
| **Caught up to Medieval** (18 buildings) | **8 people** | **28 sustained**, room for 20 more | **0 of 8** | *Wants more to do* |
| **Cold learner, empty island** | **8 people** | **28 sustained**, room for 20 more | **0 of 8** | *Wants more to do* |

**All three rows are the same row.** The live announcement is byte-identical too: *"8 people.
Livability sustains 8 of them with 20 to spare. Happiness 0 percent: an amenity reaches 0. Wants
more to do."*

### Why, and it is ruled rather than broken

`buildingLedger` (`engines/game/src/citizens-population.ts`) is explicit, in a comment that names
this exact case:

> *"BOTH TERMS READ MASTERY… `complete = node.placed && constructionState === "complete" &&
> node.mastery >= PRACTICED_MASTERY`"*

and the function above it:

> *"Un-gameable — you cannot wait for people (no clock), you cannot farm them by building houses
> (no capacity feedback), and **since 2026-07-30 you cannot test out into them either**."*

A tested-out node is `completion_status: "complete"` at `mastery: 0` by ratified rule
(`docs/Contracts.md` §1.1). So it clears the construction check and fails the mastery floor, and
contributes **no citizens, no residence capacity and no daytime seats**. Measured over the 21-node
roster:

```
tested out (mastery 0):  ledger complete=0   mastered=0   population=8    residenceCapacity=0
fully practised:         ledger complete=21  mastered=21  population=134  residenceCapacity=44
```

The 28 livability is the free Smokehouse's 20 (`ERA_ONE_FREE_CIVIC`) plus the hub, i.e. exactly
what an empty island starts with.

### And they cannot buy their way out of it

Measured on the real economy client after a catch-up:

| | wallet `spendable` | civic options in that era | cheapest | affordable |
| --- | --- | --- | --- | --- |
| Caught up to Bronze Age | **0** | 4 | 260 bronze | no |
| Caught up to Medieval | **0** | **0 — none authored** | n/a | no catalogue at all |

Two separate walls, and the second is the harder one. **Civic buildings are authored for eras one
to four only**; eras five through ten return zero options, so the Civic tab is empty for any
learner standing in them however rich they are. And the wallet is zero because row 1 of the earn
table pays on `mastery >= LESSON_GRANT_MASTERY_BAR`, which a tested-out node does not meet — §7.2
of the test-out review predicted this (*"the tested-out learner arrives broke, by ruled design"*)
and it reproduces.

---

## 4. The departure consequence: measured, and there is none

#500 is **OPEN** (`mergedAt: null`,
read from the API on 2026-08-04), so none of this is live yet. Its `deriveDepartures` was run at
the measured inputs:

```
caught up to era 4 (16 buildings)  happiness=0%  pressure=1.00  => leaving 0, remaining 8, warned false
caught up to era 5 (18 buildings)  happiness=0%  pressure=1.00  => leaving 0, remaining 8, warned false
cold learner, empty island         happiness=0%  pressure=1.00  => leaving 0, remaining 8, warned false
same roster fully mastered         happiness=0%  pressure=1.00  => leaving 31, remaining 103, warned true
```

**At the deepest pressure the model can express, a caught-up learner loses nobody and is not
alarmed.** The rule is `(population - floor) × pressure × share` with
`floor = min(FOUNDING_POPULATION, population)`, and their population *is* the founding population,
so the first factor is zero. #500's own header calls that case out by name.

**The irony is worth stating, because it is the whole shape of the problem.** The learner is
protected from the departure mechanic *precisely because* their eighteen buildings brought nobody.
Fix the population and the protection goes: the same roster with the practice done loses **31
people** at zero coverage.

---

## 5. THE DECISION, which is the lead's

**A caught-up city is statistically an empty city.** That is the finding. What to do about it has
real arguments on each side and is not a code question.

### Option A: leave it exactly as it is

The city is a record of demonstrated learning, and this learner has demonstrated the *lessons* and
not the *practice*. Population, livability and happiness are all downstream of practice by ruled
design, and an empty panel is the honest reading of *"you have eighteen buildings and no stars"*.

**For:** changes nothing, breaks no ruling, keeps the population un-gameable, and keeps the
practice the only thing that moves a statistic. **Against:** the game has just spent five minutes
and four ceremonies telling the learner their city is founded and standing, and then shows them a
panel that says nothing has happened. That contradiction is on screen at the moment the demo lands.

### Option B: hand over the civic buildings too

Seat each handed age's civic buildings alongside its skill buildings.

**For:** the panel would move, and the city would look as furnished as it is tall. **Against:**
three things, and the third is disqualifying on its own. It spends the learner's aesthetic choice
for them on the one category that is *purely* aesthetic. It contradicts the panel's own shipped
copy, which tells the learner in as many words that *"buying a building brings nobody"* — a civic
building raises livability, not population, so the population row would still read 8. And **there
is nothing to seat past era four**: eras five to ten have no authored civic catalogue, so the
option does not exist for the learner who needs it most.

### Option C: give them the material instead, and let them furnish it themselves

Grant the caught-up learner the material their skipped ages' lesson channel would have paid, and
leave the buying to them.

**For:** it is the option that gives agency rather than spending it, it uses shipped mechanics end
to end (the Civic tab, the prices, the placement), and it turns *"your city is empty"* into
*"here is what to do next"*, which is the thing an arrival screen most wants. It also answers
**O-TX3** (*"what the tested-out learner earns"*), which is open and is exactly this question one
level down. **Against:** it is a real ruling in the economy lane — row 1 pays on practice evidence
specifically to close the test-out seam, and this would open it deliberately. It also still leaves
eras five to ten with nothing to spend on.

### Recommended: C, with A as the honest fallback

**Recommend C** — grant the material, not the buildings — and treat the amount as the economy
lane's to set rather than this record's. It is the only option that moves the panel without either
spending the learner's choice for them or contradicting the panel's own copy, and it lands in a
lane that already has an open question shaped exactly like it.

**If C is declined, take A rather than B**, and fix the contradiction in copy rather than in
mechanics: the arrival screen should say what the city has and has not got, so a learner reading
*"0 of 8"* has already been told why. That is one sentence and no ruling.

**What NOT to do, stated because it is the tempting one:** do not lower the mastery floor in
`buildingLedger` so that tested-out buildings bring citizens. It would move all three figures at
once and it would reopen the seam the 2026-07-30 change closed on purpose, which is the sentence
in the shipped comment: *"you cannot test out into them either."*

---

## 6. What is NOT established here

- **Whether an empty panel actually reads as broken to a learner.** Nobody has watched one arrive.
  The contradiction is real on the page; how loud it is, is not measured and cannot be from here.
- **The right material figure under Option C.** §7.2 quotes 600 stone for era one's lesson channel
  against a catalogue whose livability-and-happiness target is 540, but the per-era figures for
  ages two onward are the economy lane's and are not re-derived.
- **Anything about eras five to ten.** They have no civic catalogue, so every option above is
  era-one-to-four work with a gap after it. That gap is a content dependency and is not this
  record's to close.
