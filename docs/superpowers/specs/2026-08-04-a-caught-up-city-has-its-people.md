# A caught-up city has the crowd its age has: the ruling reread, the separation, and what the panel then says (MEASURED)

**Recorded 2026-08-04 on `cursor/population-tracks-the-era-792c`, which was `integration` @
`1bca837a` with #558 merged in.**
Every figure below was produced by running the code on that tree. Vitality figures are read
off a rendered `CityVitalityPanel` at 1024x580; the disc-independent figures are driven
through the real `deriveCityVitality` at each era's own authored radius.

> **⚑ RE-MEASURED 2026-08-05 after #558 was squash-merged into trunk, and §5.1 IS CLOSED.**
> The #558 this branch carried was mid-flight: it seeded every handed age's civic buildings at
> the diagnostic's **hand-off**, before any founding had grown the island, which is the cause
> §5.1 identifies below. #558's FINAL form — `25bcbdfd` on `integration`, `mergedAt`
> 2026-08-04T20:53:28Z — seeds each age **as that age is founded** and moved the seating into
> `catchup/civicSeats.ts`. That is §5.1's own recommended way out, taken by the change that
> caused it, so the finding is resolved rather than outstanding.
>
> What that moves, measured on the merged tree at the same 1024x580 (§6's frames re-shot):
>
> ```
> placed in      civics seated        panel reads
>                BEFORE    AFTER      BEFORE                        AFTER
> neolithic      6 of  6   6 of  6    44 ·  152 ·  44 of  44        unchanged
> bronze_age     5 of 12  12 of 12    73 ·  152 ·  40 of  74 (!)    74 ·  312 ·  74 of  74
> medieval       1 of 24  23 of 24   103 ·  152 ·   0 of 134 (!)   134 · 1032 · 134 of 134
> ```
>
> The two `(!)` rows were in the **departure warning**. Neither is now, so §4's honest read —
> *"at two and four it still reads wrong, and I am not going to claim otherwise"* — is retired
> rather than restated. §5.1 is kept below as the record of a finding and its closure; do not
> read its figures as current.
>
> One string in §5's table has also been renamed out from under it by
> #619: the happiness row's low
> band was *"Wants more to do"* and is now *"Your people are unhappy!"*. It appears twice in
> the table below, in the era-one control's two columns, and nowhere in this change's own
> behaviour. `docs/design-refs/caught-up-crowd/cold-start-at-era-one.json` carries the current
> string.
>
> Two other things this branch recorded are also closed and are corrected where they appear:
> the **BLOCKING** failure of `catchUpCannotShortenTheAdvance.test.ts` (#558's final form
> removed the `catchup/` imports from `inheritedCivics.ts`, and that guard is **10 passed** on
> `integration`), and the API this spec's own harness called — `inheritedCivicLoadout` and
> `inheritedCivicPlacementIds` now take the handed **eras** rather than a placement.

The follow-on to
[`2026-08-04-what-a-caught-up-city-inherits.md`](./2026-08-04-what-a-caught-up-city-inherits.md),
whose §5 named the problem this closes: *"the panel is a crowd measured against a capacity. A
caught-up learner's crowd is 8 because population is downstream of mastery; matching their
capacity to a played-through city's makes the ratio worse, not better."*

The product lead, asked how to size the numbers: **_"population should be proportional to era
always"_**, plus copy naming what the city is short of.

---

## 1. The answer in five lines

1. **Population and mastery CAN be separated, and they are.** The 2026-07-30 ruling rests on
   one stated reason and it is a solvency reason, not a "the learner has not earned it"
   reason. Nothing in it needs mastery to move.
2. **The ruling is answered rather than reopened, because its premise moved.** It closed
   *"the ONE state where mouths arrived with no possible means"*. #558 hands a caught-up
   learner the means, in buildings rather than currency.
3. **A third ledger term, keyed on the passed placement.** `CitizenBuildingLedger.inherited`.
   The population and the homes read it; `mastery`, `complete`, `mastered`, `roster.settled`,
   the trial gate, the ceremony, the stars and the economy's lesson grant do not.
4. **The panel can no longer say a caught-up city has nothing to fix**, structurally:
   `shortfalls.practice` is a term of `shortfalls.none`.
5. **It reads correctly at every placement, once the civics are seeded age by age.** As
   recorded, this was *"correct only at a one-age placement"*: #544 had unblocked the SKILL
   layout (four handed ages seat 21 of 21, up from 18) and the inherited CIVIC buildings were
   still 1 of 24, because the seeding ran at the diagnostic's hand-off and the island does not
   grow until the foundings that come after it. §5.1 is that finding with what it cost and the
   three ways out; #558's final form took the recommended one, and four handed ages now seat
   **23 of 24** at **134 people · 1032 sustained · 134 of 134 · Content**. See the note at the
   top of this file for the re-measurement.

---

## 2. The ruling, read in full, and why population and mastery come apart

`engines/game/src/citizens-population.ts` carries the 2026-07-30 change and its reasoning.
Two grounds are given for keying both population terms on `mastery >= PRACTICED_MASTERY`,
and only one of them is about test-out:

> The first term used to fire on `construction_state === "complete"` alone, which is a union
> including `lesson_stage === "done"` — so it fired on **ATTENDANCE**.

> The economy's lesson grant … is gated on the mastery bar now, and **population had to move
> with it or the solvency invariant would break at its foundation.** INV-ERA-4 rests on the
> means arriving alongside the mouths; paying at the bar while housing people at attendance is
> exactly a window where a learner has citizens and no material.

And the clause it traded away, named:

> *"A building obtained by testing out is still a building, so it still houses people"* is the
> sentence being traded away, and what is bought is that the **ONE state where mouths arrived
> with no possible means is gone**.

**Neither ground is a claim that a tested-out learner has not learned.** The file says the
opposite in its own next sentence: *"A tested-out learner is not punished."* The grounds are
(a) do not pay for turning up, and (b) do not seat a crowd the learner has no material to
provide for.

**So the two are separable, and the separation is clean in the code as well as in the
argument.** `citizenPopulation` and `residenceCapacity` read the LEDGER; nothing else does,
except `roster.settled`. Mastery gates the lesson, the practice set, the era trial
(`eraTrialUnlockState`), the completion ceremony, the stars, `isNeighborhoodReady` and the
economy's lesson grant, and every one of those reads `student_node_state.mastery` directly.
A ledger term that never touches `mastery` therefore cannot reach any of them.

### (a) is untouched, and (b) is answered by #558

**Attendance still pays nobody.** The new term is keyed on `placement_estimate >=
TESTED_OUT_PLACEMENT`, which is the one of test-out's three writes that attendance cannot
forge — `PRACTICED_MASTERY`'s own docblock draws exactly that distinction: *"a diagnostic
test-out writes `completion_status: "complete"`, `lesson_stage: "done"` and a passed
`placement_estimate` while leaving `mastery: 0`"*. A finished lesson on a placement the
learner failed brings nobody, and `citizens-population.test.ts` now asserts that over a
fixture that is genuinely attendance (see §6).

**The means now arrive with the mouths.** #558 seeds a caught-up learner the *cheapest closing
city* of every handed age, which is the model INV-ERA-4 measures solvency against. Measured at
each era's own authored disc, through the real derivation:

```
placed in         crowd   sustains   amenities reach   alarmed
neolithic            44        152         44 of  44      no
bronze_age           74        312         74 of  74      no
classical           104        552        104 of 104      no
medieval            134       1032        134 of 134      no
renaissance         164       1032        164 of 164      no
industrial          200       1032        200 of 200      no
atomic_age          236       1032        236 of 236      no
information_age     290       1032        290 of 290      no
cyberpunk           326       1032        326 of 326      no
```

The margin only widens, and that is structural rather than lucky: an era's capacity target is
`3 x 20 x 2^(N-1)` and doubles per age, while the crowd grows by six per node. Asserted per
placement in `caughtUpCityHasItsPeople.test.tsx`, and forced red by inflating
`CITIZENS_PER_MASTERED_SKILL` to 400.

**`sustains` flattening at 1032 from the fifth age on is the civic ART, not the model**: eras
five to ten have no authored civic buildings yet, so `civicOptionsForEra` fails closed and
nothing is inherited from them. The crowd keeps growing and still never catches the four ages
that are authored.

---

## 3. What is granted, and what is emphatically not

`CitizenBuildingLedger` gains `inherited`: **placed, `construction_state === "complete"`, and
`placement_estimate >= TESTED_OUT_PLACEMENT`.**

| reads it | why |
| --- | --- |
| `citizenPopulation` | the lead's ruling. A handed-over building holds what a mastered one holds. |
| `residence_capacity` | D-CIT10 requires population and capacity to come from the SAME set, so a crowd is never assigned to homes that do not exist. It also retires the stated reason the 2026-07-30 floor was applied here: *"a pre-built node with homes and nobody in them would read hollow"*. There is somebody in them now. |

| does NOT read it | why |
| --- | --- |
| `mastery` and everything gated on it | the whole point. Lessons, practice, the era trial, the ceremony, the stars and the lesson grant are exactly where they were. |
| `complete` / `mastered` | they still mean *"the learner scored a set"* and *"the learner cleared the bar"*. |
| `roster.settled` | it is `ledger.every(e => e.mastered)`, a claim about the LEARNER. A caught-up learner is never settled. |
| the skill buildings' D-ERA7 amenity term | #558 measured it as part of the gap and the lead did not reopen it. It is the one figure that still records that this city's skills are undone. |
| `daytime_capacity` | render-only, no mastery term of its own, and outside what was asked. |

### The bar is the PLACEMENT, and monotonicity is why

`placement_estimate` is immutable after onboarding (Contracts §1), so a handed-over node stays
handed over: practising it to mastery 1 keeps it at the mastered figure instead of dropping it
to the built one. **A signal that switched off on the first practice set — `tested_out`, or
`mastery < PRACTICED_MASTERY` — would take four people away from a learner for doing the
work.** D-CIT6 forbids it and the 4096-vector sweep catches it; the injection is in the ledger
and it goes red at *"never takes people back off a handed-over building for practising it"*.

The accepted consequence, stated rather than discovered: a learner who tested out of a node
and then scores 3 of 5 on it holds the mastered crowd rather than the built one. The
diagnostic's verdict is what the city is sized on, and it does not un-say itself.

---

## 4. The copy, and the band

**The arrival note**, in `CityVitalityPanel.tsx`:

> *"The city arrived with its crowd, and 6 of its skills are still waiting for a first practice
> set."*

It replaces the settled note rather than joining it, and structurally: the count behind it is
`shortfalls.practice`, which is a term of `shortfalls.none`, so *"Everybody is sustained, and
an amenity reaches all of them"* **cannot be printed over a city with unpractised skills at
all**. That is item 3 of the brief closed with a boolean rather than with a case somebody has
to remember.

It passes `test/cityCopyRegister.test.ts` on both the shipped rule and
#538's widened one, and that was
checked rather than assumed: injecting *"Nothing here has been practised yet, …"* and *"No
practice has been done here, …"* into each of its two branches puts
`CityVitalityPanel.tsx` in both rules' offender lists.

**The happiness BAND still reads "Content" and should.** It is the happiness row's own label
for *"an amenity reaches everybody"*, which is true, and it is the same constant the departure
rule reads (`departureThresholdIsShared.test.tsx`) — moving it would make the panel disagree
with the mechanic. What was wrong was never the band; it was the panel-level claim that there
was **nothing to fix**, and that is what is gone.

**The population explainer gained a clause**, because it named a mechanic that no longer
produced the number in front of the one learner who most needs it explained:

> *"Population counts everyone your skill buildings have brought to the island, **including
> the ones you tested out of**. Practising a skill brings people and mastering it brings twice
> as many again, while buying a building brings nobody."*

---

## 5. What the panel reads, before and after

At 1024x580, the lead's own window, on the tree named at the top (so: **with #544 merged, and
with #558 as it stood mid-flight**). Frames in
[`docs/design-refs/caught-up-crowd/`](../../design-refs/caught-up-crowd/), **re-shot on the
merged tree** — the two deep frames moved, and that README carries both columns side by side.
The AFTER column below is the mid-flight reading; read it with the re-measurement at the top of
this file.

**Both columns are measured on the SAME tree after the SAME walk**, the before one by
injecting `inherited = false` into `buildingLedger` and re-driving it. An earlier draft took
the before figures from the arrival instead, which happens to give the same numbers and is a
different measurement.

```
                        BEFORE (inherited term off)              AFTER
one age (neolithic)     8 people · 108 sustained ·   8 of   8    44 people · 152 sustained ·  44 of  44
  6 of 6 civics seated  Content                                  Content
  6 of 6 skills         "Everybody is sustained, and an          "The city arrived with its crowd, and 6
                         amenity reaches all of them."            of its skills are still waiting for a
                                                                  first practice set."

two ages (bronze_age)   8 people · 108 sustained ·   8 of   8    73 people · 152 sustained ·  40 of  74
  5 of 12 civics        Content                                  "The people are unhappy, and will start
  11 of 11 skills       "Everybody is sustained…"                 leaving soon!"  + 1 person has left

four ages (medieval)    8 people · 108 sustained ·   0 of   8   103 people · 152 sustained ·   0 of 134
  1 of 24 civics        Wants more to do                         "The people are unhappy…" + 31 have left
  21 of 21 skills

era one (control)       8 people ·  28 sustained ·   0 of   8    8 people ·  28 sustained ·   0 of   8
                        Wants more to do                         Wants more to do        (unchanged)
```

The livability column moves by exactly 44 at every handed placement, which is
`residenceCapacity` over era one's six nodes: the homes half of the change, visible.

### ⚑ The honest read, and its closure

**At one handed age the panel communicates.** The crowd matches the skyline, the mastery meter
above it reads `0/11`, and the arrival note says where the people came from and what is owed.

**At two and four handed ages it did not, and the reason was §5.1 rather than the crowd.**
5 of 12 and 1 of 24 inherited civic buildings were standing, so amenity coverage was 40 and 0
against crowds of 74 and 134, and the city dropped into the departure warning. That was **more
honest than what it replaced** — a twenty-one-building city with no amenity at all really is
in trouble — and it was **worse to arrive at**. The population change did not cause it; it made
an existing shortfall loud enough to trip a threshold. At each era's own disc the identical
loadout seated in full and nothing was alarmed (§2), which is the measurement that said the
crowd was not the fault.

> **⚑ CLOSED 2026-08-05, by the change that caused it.** The sentence above named the disc as
> the *symptom* and §5.1 named the *timing* as the cause; #558's final form fixed the timing.
> Re-measured on the merged tree: 12 of 12 and 23 of 24 seated, coverage 74 of 74 and 134 of
> 134, **Content** at both, nobody leaving. The paragraph is left standing because the
> reasoning in it was right and is what got the timing changed — but *"at two and four it still
> reads wrong"* is no longer a true statement about the product. The re-shot frames are the
> evidence, and the one-age frame and the era-one control came back **byte-identical**, which
> is the floor under "only the two frames that should have moved did".

### 5.1 ⚑ #544 unblocked the SKILLS and not the CIVICS, and the reason is timing

`inheritedCivics.ts` predicted the seam in its own words before #544 landed: *"it is era one's
disc even for a learner placed in era six … the seeding happens at the hand-off, BEFORE the
foundings that grow the island"*, and expected #544 to close it. **It does not, and this is
measured on the merged tree rather than predicted.**

```
                        skills seated        inherited civics seated
placed in           before #544   after     before #544   after
neolithic              6 of  6    6 of  6      6 of  6    6 of  6
bronze_age            11 of 11   11 of 11      5 of 12    5 of 12
medieval              18 of 21   21 of 21      1 of 24    1 of 24
```

The skill layout moved because `CityCatchUp.autoPlace` runs **after** each founding, and each
founding's beat two grows the shore one age further, so by the time age four is seated
`liveBuildableRadius()` is already era four's. The civic seeding runs in
`citySession.seedFromPlacement` — the diagnostic's hand-off, **before the first founding** —
so its disc is era one's whatever age the learner was placed in, and `refuseLayoutWrite` drops
anything beyond it.

**What it costs, exactly**: the amenity half of every deep arrival. Livability survives
because the free Smokehouse, the hub and `residenceCapacity` carry it; happiness does not,
because the only thing that reaches people at scale is a civic amenity and none of them are
standing.

**Three ways out, none of them this change's to take.** Seed each age's civics as that age is
FOUNDED, alongside its skills, which is the one that composes with the growing island and is
arguably what these buildings are anyway. Or defer the whole seeding to the landing, which
costs #558's structural argument that *"the seeding is finished before the learner is offered
a road"*. Or publish the placed era's land before seeding, which would write buildings onto
water for the duration of the walk. **The first is the one to price**, and it is the seeding
lane's call.

> **⚑ TAKEN, 2026-08-04, by the seeding lane.** #558's final form (`25bcbdfd` on
> `integration`) is the first way out: the ages are seeded one founding at a time and the
> seating moved out of this file into `catchup/civicSeats.ts`, which is also what removed the
> `catchup/` imports that had turned `catchUpCannotShortenTheAdvance.test.ts` red. Re-measured
> on the merged tree, the right-hand column of the table above becomes **6 of 6, 12 of 12, 23
> of 24**, and the paragraph below about what it costs no longer describes the product. The
> analysis stands as the reason the change was made; the figures are history.

**One thing reads oddly at every placement and is nobody's bug here**: *"room for 108 more"*
under a city that looks full. Livability targets are `3 x 20 x 2^(N-1)` per age while the
citizens model produces six people per node, so a played-through learner sees the same
surplus. It is the two models never having been reconciled (O-20), not the caught-up path.

---

## 6. Three guards that were measuring a state the product cannot produce

Both found by injecting the defect, not by reading the code.

**`citizens-population.test.ts` and `citizens-invariants.test.ts` called
`lesson_stage: "done"` at `mastery: 0` a TEST-OUT, at `placement_estimate: 0`.** It is not
one: the diagnostic writes a passed placement alongside the pre-build. Four assertions across
the two files were measuring a learner who attended a lesson without being placed out of it,
which no shipped path produces. Both shapes are now exercised, each under its own name, and
the 8.5 walk's opening row moves from 8 / 0 / 8 to **44 / 44 / 0** for the real tested-out
learner while the attended one stays 8 / 0 / 8.

**`requires a building to be PLACED` stopped detecting a dropped `placed` conjunct.** Measured:
with `node.placed` removed from `buildingLedger`, the file reported green, because at a failed
placement neither surviving term fires either way. Now swept at both placements.

**`keeps the settled note` had one control and needed two.** With the arrival note keyed on
`entry.inherited` alone rather than `inherited && !complete`, a learner the diagnostic passed
nothing of never sets the flag, so the single control stayed green. The separating state is the
caught-up learner who has since practised everything, and that learner has to get their settled
city back.

### ⚑ A third, opened by the merge itself: the replay stopped building the city the product builds

**`the settled note is gone and the arrival note names the practice` passed for the wrong reason,
and the injection ledger is what said so rather than a reading of the code.**
`caughtUpCityHasItsPeople.test.tsx`'s `catchUpThrough` placed the skill buildings and nothing else
— correct while #558 seeded the civics inside `seedFromPlacement`, wrong the moment its final form
moved them to each age's own founding. The replay then built a caught-up city with a crowd and
ZERO civic amenities, which no shipped path produces.

That is not a neutral difference. With the amenity gap non-zero, `shortfalls.none` is already
false whatever `shortfalls.practice` says, so the settled note is absent for a reason that has
nothing to do with the term under test. Measured at `68c81083`: delete the `unpractised === 0`
conjunct from `shortfalls.none` and this file reports **60 passed, 0 failed** —
`output/population-injections.mjs` came back **13 red, 1 green**, and the green row was
`the unpractised count is dropped from shortfalls.none`.

The replay now performs the walk's three writes per handed age, `seedCivicBuildings` at each
founding included, and the same injection is **RED at 7 of the 9 placements** with *"the panel
congratulates a caught-up city: 'Everybody is sustained, and an amenity reaches all of them.'"*
The two deepest stay green for the right reason: eras five to ten have no civic art, so their
amenity gap is genuinely non-zero, which §2 asserts.

**Note what the frame suite already had and this did not.** `caughtUpCrowdShots` was fixed to
seed per founding when its frames were re-shot; the jsdom sibling was not, because a frame that
photographed a bare island is obviously wrong and an assertion that passes is not. That
asymmetry is the whole argument for running the injection ledger again after a merge rather than
reading the suite.

---

## 7. Evidence

- **Reproduction written first**, red quoted in the pull request: nine placements at
  *"stands in a crowd of 8 where a played-through learner has N"*, plus the settled note and
  the missing arrival note.
- **14 injections, 14 reds**, `output/population-injections.mjs`. Two of them were GREEN on the
  first run and both were real holes; §6 is what they found. **Re-run after the merge it was 13
  red, 1 green** — a third hole, opened by the seeding moving rather than by either change, and
  §6's last subsection is it. It is 14 red again.
- **Era one is proved rather than asserted**: 8192 comparisons over all 4096 mastery vectors,
  placed and unplaced, at both placements below the pass bar, against the pre-2026-08-04
  formula transcribed into the test rather than imported.
- **Nothing loosened.** `city-vitality.test.ts`'s shortfall-key census gained a key with the
  reason recorded; #558's *"differs by exactly the two mastery terms"* became *"by exactly the
  amenity term"* with the closed gap asserted as an equality and a floor under the surviving
  one.

## 8. What is NOT established here

- **Whether a learner reads the one-age frame the way the people who took it do.** Nobody has
  watched one arrive.
- **Anything about the deep placements as a shipping state.** They are alarmed on the shipped
  disc and quiet on the authored one, and only #544 turns the second into the first.
- **The departure consequence.** Another lane is removing the population loss while keeping the
  warning; nothing here touches that path, and the *"27 people have left"* in the medieval
  frame is that lane's to remove.
