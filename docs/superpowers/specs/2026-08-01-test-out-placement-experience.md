# What a learner who already knows it should DO: the test-out placement experience (DESIGN RECORD, nothing built)

> ## 2026-08-09 IMPLEMENTED AMENDMENT — DIAGNOSTIC PREFIX BYPASSES UNLOCK EXAMS
>
> The diagnostic's skipped set remains the contiguous prefix derived from `ERA_SEQUENCE`.
> Every island in that prefix is now idempotently founded without an island unlock exam.
> Catch-up uses one short Town Hall founding representation per skipped island. All older
> multi-stage, question-paced, or timed founding options below are superseded history.
>

**Recorded 2026-08-01. Every measurement below was first taken at `integration` @
`3ff0edb8`, then RE-TAKEN at `7e38ac1a`, which merges `integration` @ `5f72405e` after
#373 and
#379 landed underneath this
record mid-write. All three measurements reproduce byte for byte. What did move is a
citation: `services/diagnostic-api/src/reads.ts`'s `MVP_NODE_IDS` slid from line 36 to line
37, which is exactly the drift `.cursor/rules/qa-verification.mdc` warns a file:line
citation carries, so every one of the 47 file:line citations in this record was re-checked
against its expected token at the merged tip rather than inherited. Read the figures as
measured at `7e38ac1a`.**
**Status: DESIGN RECORD + MEASUREMENT. No production code changed. Five options, one
recommendation, and eight rulings that one option or another would need amending (§8). The
recommended one needs two, or three if its mastery clause is taken.**

> ## 2026-08-01 COMPANION, AND IT CORRECTS TWO THINGS BELOW
>
> **The lead stopped the option choice on a prior question after this record merged:**
> *"ok timeout - one thing we have to consider is the diagnostic itself; its supposed to be
> able to diagnose with relatively high accuracy which domain placement they belong in"*.
> **Every option in §5 assumes the instrument can decide an ERA, and nothing had established
> that.** It is established in
> **`docs/superpowers/specs/2026-08-01-diagnostic-placement-accuracy.md`**, measured at
> `c9001a1a`, and that record is a prerequisite for reading §5 and §6 rather than a
> footnote to them.
>
> **The verdict, so a reader of §5 does not have to leave to get it.** The published 96.0%
> is per NODE, not per era. Measured at era granularity, **precision is 97.3% to 100%** and
> the compounding the question worried about runs **entirely in the fail-closed
> direction**, because an era test-out is a conjunction and a conjunction is a fail-closed
> amplifier. **Option C stands and gains a safety argument: B's residual harm is 400x C's.**
>
> **Two things below are wrong and are corrected there rather than edited away here.**
> §5.3's *"Total interactive"* omits the residual practice an eligible learner still owes,
> about **1.96 nodes, roughly 10 items**, so *"105 practice items removed"* should read
> **about 95 of 105**. And §5.6's table implies C's benefit needs the era conjunction to
> fire; it does not, because C's gate is per node, and the measured saving for an eligible
> learner is **90.7% of the practice baseline** whether the era fires or not.
>
> **One thing below is unchanged and is now the binding constraint.** §2.6 says the
> widening is what makes any of this live. The v1 checker blocker is **still live at the
> tip**, re-measured: 22 of 66 D1+D2 walk items ungradable, 4 of the 5 D2 nodes wedge the
> walk. Nothing in §5 is reachable until that moves.

**The direction is the lead's, given verbatim:**

> *"right now the model is that if a user places out of an era, they get to place their
> buildings in the first era, then the remaining eras are a time lapse of the city being
> built up to the era that they didn't test out of. i feel like that model is a bit loose
> and kind of loses a lot of the experience, but cant really think of a middle ground that
> doesn't waste the learner's time in stuff they already know"*

There is a middle ground. It is §5.3 (**Option C**), it is what this record recommends, and
the reason it was hard to see is that the tension is usually stated on the wrong axis. §4
argues that.

---

## 1. The answer up front

**Five findings, in the order that changes the shape of the problem.**

1. **No learner can place out of anything beyond era one today, and the reason is not
   only scope.** The diagnostic's target set is exactly era one's node set, at five
   independent composition points, so eras two through ten have **zero** nodes it can
   reach. Graph inference cannot get there either, because all six of those nodes'
   prerequisites are inside the same six. §2.1, §2.2.

2. **More surprising, and it is the finding the whole record turns on: test-out does not
   place a learner out of an era even inside era one.** `eraTrialUnlockState` requires
   `mastery >= 2` on every node of the era, and test-out completes a building at
   `mastery` 0 by ratified rule. Driven through the real function, a learner who tested
   out of all six D1 nodes gets `unlocked: false` with **all six** listed as unmastered.
   **Test-out is lesson-skip, not era-skip.** §2.3.

3. **So the model in the brief is not a thing the tree can currently do, and there is no
   time-lapse anywhere in it.** There is also nothing to skip into: eras two through ten
   resolve to zero plots and nine of the ten have no authored land radius. This is a
   design question about a future state rather than a live defect. It is still owed
   **before** the diagnostic widens rather than after, because the widening is what makes
   it live and the widening is already a prerequisite of the completion ceremony (D-END3).
   §2.4, §2.5.

4. **The rulings already draw the line this question needs, one level down.** Test-out
   says a learner who has proved a skill need not be **taught** it. It does not say they
   need not **demonstrate** it, and the mastery-0 completion is exactly that distinction
   made visible. The era gate is a demonstration gate, not a teaching gate. Applying the
   ratified rule at era scale is the middle ground, and it needs one predicate changed
   rather than a new subsystem. §4, §5.3.

5. **The completion ceremony does not currently work for this learner, and the number is
   measurable.** A learner who tests out of eras one through four passes 21 of 62 nodes,
   which is depth-weighted coverage **0.271** and therefore a headline gain capped at
   **+72.9 points** against a cold learner's +100. Worse than the ceiling: **a tested-out
   node cannot flip**, so D-END7's flip-list headline structurally omits the 21 skills
   this learner is best at. §7.

---

## 2. Whether this is live, measured at the tip

### 2.1 The diagnostic's reach is exactly era one, at five call sites

There is no scope constant. Every live composition point calls `getNodesByScope("mvp")`
independently:

| Call site | Line |
| --- | --- |
| `engines/diagnostic/src/engine.ts` | `169` (`targetNodes`) |
| `engines/diagnostic/src/index.ts` | `26` (the MST spec's slots, two per node at difficulty 2 and 3) |
| `apps/web/src/diagnostic/browserRuntime.ts` | `34` (`D1_WALK_SCOPE`) |
| `services/diagnostic-runtime/src/aurora-server.ts` | `265` (the server walk config) |
| `services/diagnostic-api/src/reads.ts` | `37` (`MVP_NODE_IDS`, which is also what the authenticated city read maps over) |

The registry's `mvp` population is `["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4",
"NUM.5"]`, and `ERA_SEQUENCE[0].nodes` is the same six
(`packages/skill-graph/src/eras.ts:143`). Driven over the authored sequence, era by era:

```
DIAGNOSTIC SCOPE: ["NUM.S","NUM.F","NUM.2","NUM.3","NUM.4","NUM.5"]
ERAS THE DIAGNOSTIC CAN REACH: ["prehistoric"]
DIAGNOSTIC SCOPE === ERA ONE NODE SET: true
  era prehistoric:     6 nodes, 6 in diagnostic scope
  era neolithic:       5 nodes, 0 in diagnostic scope
  era bronze_age:      5 nodes, 0 in diagnostic scope
  era classical:       5 nodes, 0 in diagnostic scope
  era medieval:        5 nodes, 0 in diagnostic scope
  era renaissance:     6 nodes, 0 in diagnostic scope
  era industrial:      6 nodes, 0 in diagnostic scope
  era atomic_age:      9 nodes, 0 in diagnostic scope
  era information_age: 6 nodes, 0 in diagnostic scope
  era cyberpunk:       9 nodes, 0 in diagnostic scope
```

This agrees with `docs/README.md` §10a (line 126) and with the completion ceremony
record's §3.1, which found the same five call sites at `2a484b1b`. It is re-measured here
rather than inherited: `git merge-base --is-ancestor 2a484b1b 3ff0edb8` succeeds, so that
record's tip is an ancestor of this one and the tree has moved underneath it. **One of the
five moved again during this write** and is the reason the header says what it says:
`reads.ts`'s line went from 36 to 37 under #373.

### 2.2 Inference cannot reach past era one either

The test-out amendment unlocks on graph-inferred passes as well as measured ones
(`docs/Contracts.md` §1.1, line 60), and inference is downward closure over the
prerequisite DAG. Read off the registry, the six MVP nodes' `prereqs` are:

| Node | Prerequisites |
| --- | --- |
| `NUM.S` | none |
| `NUM.F` | none |
| `NUM.2` | `NUM.S`, `NUM.F` |
| `NUM.3` | none |
| `NUM.4` | `NUM.S`, `NUM.F`, `NUM.2`, `NUM.3` |
| `NUM.5` | `NUM.F` |

Every one of them is inside the same six. Downward closure has nowhere outside era one to
go, so the inferred half of the unlock rule adds no reach. The walk is scope-bounded
anyway (`FrontierWalkConfig.scope`, `walk-engine.ts:82-85`, documented as REQUIRED with no
default).

### 2.3 And test-out does not skip an era even inside era one

This is the finding that matters, and it is independent of scope.

**D-ERA5** gates the chapter break on mastering every skill in the era plus passing the
trial (`2026-07-27-era-progression-design.md:351-353`), narrowed 2026-07-31 so that an
unanswered crisis call also gates it in eras 1, 4, 6 and 9. In code that gate is
`eraTrialUnlockState` (`engines/game/src/era-trial.ts:200-215`), which filters the era's
nodes to those below `ERA_TRIAL_MASTERY_GATE`, and that constant is `2` (line 69).

Test-out writes `mastery` 0. That is the ratified rule, not an implementation accident:
`docs/Contracts.md` §1.1 line 62 says test-out completes the building at `mastery` 0, zero
of three stars, and that the practice remains the only route to mastery. The code agrees
at both seams, `seedFromPlacement` (`apps/web/src/city/citySession.ts:967-1010`) and the
`placeSkill` pre-build (`citySession.ts:703-713`).

Driven through the real function with all six nodes at `placement_estimate: 2`,
`mastery: 0`, `completion_status: "complete"`:

```
ERA_TRIAL_MASTERY_GATE: 2
TESTED-OUT LEARNER, ERA ONE TRIAL UNLOCK:
  {"era":"prehistoric","unlocked":false,
   "unmastered_nodes":["NUM.S","NUM.F","NUM.2","NUM.3","NUM.4","NUM.5"]}
```

**So a learner who aces the entry diagnostic today gets six finished buildings and is then
required to practise all six to mastery 2 before the era trial will open at all.** They do
not skip the era. They skip the teaching inside it. The lead's *"places out of an era"* is
a state nothing in the tree produces.

### 2.4 There is nothing to place out into

Two separate reasons, both authored rather than accidental:

- **No plots.** `resolveNeighborhood` filters to `product_scope === "mvp"`
  (`engines/game/src/descriptors.ts:456`), so eras two through ten resolve to zero plots.
  `apps/web/src/lessons/interleavedPool.ts:43-44` records the same fact from the other
  side, in its own words: a learner can only complete era one's nodes today.
- **No land.** Only era one carries an authored `buildable_radius`
  (`packages/skill-graph/src/eras.ts:146`). The other nine hold `UNAUTHORED_LAND`, and
  `eraBuildableRadius` throws on them by design (lines 331-343), because D-ERA25 rules
  that later eras may sit unauthored indefinitely.

**Practice content, on the other hand, is further along than either of those**, which is
worth recording because it is the input every option in §5 spends. Driving
`interleavedPoolItems(era, "all")` over the sequence:

```
era prehistoric:      6 nodes, 6 skills with items, 234 items
era neolithic:        5 nodes, 5 skills with items, 187 items
era bronze_age:       5 nodes, 5 skills with items, 175 items
era classical:        5 nodes, 5 skills with items, 175 items
era medieval:         5 nodes, 5 skills with items, 175 items
era renaissance:      6 nodes, 3 skills with items, 105 items
era industrial:       6 nodes, 0 skills with items,   0 items
era atomic_age:       9 nodes, 4 skills with items, 140 items
era information_age:  6 nodes, 6 skills with items, 210 items
era cyberpunk:        9 nodes, 0 skills with items,   0 items
```

**Eight of the ten eras have practice items and two have none**, which reproduces
**O-END5**'s finding for era ten at `2a484b1b` and extends it to era seven. Note this is
the *practice* pool rather than the diagnostic's frozen walk pool, which is a separate and
much thinner population: the completion ceremony record measured **41 of 62 nodes with no
walk items at all, 246 frozen items owed** (§3.2, at `2a484b1b`). Not re-measured here.

### 2.5 There is no time-lapse in the tree

`rg -ni "time ?lapse|timelapse|montage|fast.?forward"` over the repository returns design
documents and unrelated hits only, with no implementation. The nearest shipped surface is
the **era timeline** (`apps/web/src/city/EraTimeline.tsx`), which is a menu-opened list of
the ten eras and their concepts, explicitly designed for the empty state and explicitly not
an animation.

### 2.6 Verdict on liveness

**Future state, not a live defect.** Nobody can hit this today on either count, and two
further layers (plots and land) would stop them if the first two did not.

**It is still owed now, and not merely because deciding early is tidy.** The widening is
already a named prerequisite of the game completion ceremony (**D-END3**), and D-END4
rules that the widening must bump `blueprint_version`, which strands a cohort's baseline.
Widening twice costs two stranded cohorts. So the widening wants to happen once, and the
question of what a learner does with a wide placement result wants an answer before it,
not after. What this record must not do is pretend the question is urgent for a learner
today. It is not.

---

## 3. What is actually lost, named against D-ET8's four beats

D-ET8 rules four beats and rules their order
(`2026-07-29-era-trial-contract.md:1275-1286`), and they ship as a closed union in
`apps/web/src/city/eraCeremony.ts:95-120`. #376
puts them on the real island with a three.js `CeremonyLayer`; **read at the API rather than
inferred from pushes, that PR is OPEN with `mergedAt: null`, so its contents are not the
tree's contents.** What is in the tree at `7e38ac1a` is the four-beat logic and the
`EraAdvanceCeremony` surface; what #376 adds is the island.

Beat by beat, for a learner whose eras one through four are handed to them:

| Beat | What it is (`eraCeremony.ts:95-120`) | Seen? | What specifically goes |
| --- | --- | --- | --- |
| **1. The city gathers** | Citizens gather, scaffolding goes up on the hall, the advisor changes dress | **No** | The most expensive loss, and not for the obvious reason. §19.1 argues the beat works because the crowd is one the learner assembled: *"a crowd the learner assembled themselves is a stronger image than a crowd that was delivered."* A handed era's crowd is exactly a delivered crowd. And it would be visibly smaller: population is `FOUNDING_POPULATION + complete × CITIZENS_PER_COMPLETE_BUILDING + mastered × CITIZENS_PER_MASTERED_SKILL` (`engines/game/src/citizens-population.ts:208-210`), where `mastered` is `complete && mastery >= 2`. A tested-out node scores the first term and **not** the second, so the tested-out learner's gathering is short by one term per node |
| **2. The island makes room** | The buildable area expands | **No** as an event; the land arrives anyway | The event is what D-ERA5 item 1 promises. Note this beat cannot be authored for eras two through ten today at all (§2.4), so for now it is lost to everybody, not only to this learner |
| **3. The hall is rebuilt** | The town hall becomes the next era's landmark, through six internal phases (`REBUILD_STAGES`) | **No** | Ten authored halls, one per era, unique by right (D-ERA5 item 4, era spec §12). Four handed eras means **three halls this learner never watches build** and one they arrive standing in front of |
| **4. The age turns** | Ground, water, vegetation and roads re-theme | **No** as an event; the end state arrives | D-ERA30's per-era roads and D-ERA26's dressing land as a fait accompli |

**And three things go that are not beats, which is where most of the value actually is.**

- **The trial's own questions.** Two items per node (**D-ET10**), so 12 for era one and 10
  for each of eras two, three and four: **42 retrieval reps**, gone. Against SPOV 4 this
  is not an incidental loss, it is the loss: *"the reward for mastering a building is being
  made to use that skill again later."*
- **The mid-era crisis in eras one and four** (D-CRISIS-35 makes an unanswered call gate
  the advance). Note this one is lost twice over under a handover: the crisis pool filters
  `state.mastery >= CRISIS_MASTERY_GATE` (`engines/game/src/mid-era-crisis.ts:132`, and
  that constant is `ERA_TRIAL_MASTERY_GATE` at line 61), so **a tested-out learner's crisis
  pool is empty**. Any option that leaves tested-out nodes at mastery 0 has silently
  removed their crises whether it meant to or not.
- **The placement decisions.** 21 buildings the learner does not choose the position of.
  Layout is the one aesthetic choice the game gives, and **INV-ERA-1** protects it hard
  enough that an era advance may never reshuffle a layout the player arranged
  (`2026-07-27-era-progression-design.md:199-201`).

**One thing is not lost and is worth saying, because it is the seam.** The learner keeps
their **buildings**. Test-out already hands those over, ratified, at mastery 0. The
question this record answers is not whether they get the city. It is what paces the city
turning into the next city.

---

## 4. The lead's framing, tested rather than adopted

The brief offers a framing and asks for it to be tested: *these conflict only if "the
experience" and "slow" are the same thing; a time-lapse is loose because it is
non-interactive, not because it is fast.*

**The diagnosis is right and the axis is wrong, and the wrong half is load-bearing.**

Right: a time-lapse is indeed loose because it is non-interactive. Nobody should build one.

Wrong: "interactive" is not the property that makes the ceremony feel earned. An
interactive thing whose interaction is not **evidence** is a cutscene with a button, and
the team's own position indicts it by name. **SPOV 3**: busywork is *"unmastered math
wearing a costume"*, and *"any click that is not learning gets cut even if it adds
engagement"* (`docs/BrainLift_Game_Design.md:50`). A tap-to-advance ceremony is a click
that is not learning. It would satisfy the interactivity framing perfectly and still be the
worst option on the table.

**The axis that actually separates the options is evidential: does the transformation
advance because the learner produced evidence?** The shipped ceremony already works this
way. `beatQuotas` distributes the era's checks across the four beats
(`eraCeremony.ts:228-243`), so ten checks give `[2, 3, 2, 3]`, twelve give `[3, 3, 3, 3]`
and eighteen give `[4, 5, 4, 5]`. The hall rebuilds **because** the learner answered. That
causal link, not the button, is what makes it a graduation rather than a progress bar with
scenery.

**Re-stated on the right axis, the tension mostly dissolves, and the rulings show where.**
The test-out amendment already ruled that a learner who has proved a skill need not be
**taught** it, and deliberately did not rule that they need not **demonstrate** it. That is
precisely what completing at mastery 0 encodes: `docs/Contracts.md` §1.1 line 62 says
test-out hands over the building and never the evidenced quality the practice produces.
The brief's own reading is right, and it is the whole answer: a tested-out building is not
finished, it is unlocked with nothing proved.

**The era gate is a demonstration gate.** Mastery plus the trial, and D-ERA5 is explicit
that neither of its two gates is a build action
(`2026-07-27-era-progression-design.md:404-409`). So the correct generalisation is not
*keep agency and compress time*. It is **keep the causal link between an answer and a
transformation, and compress only the teaching**, which is the ratified rule applied one
level up.

The two commitments therefore conflict much less than they appear to. What is genuinely
irreducible is smaller and worth naming honestly: **a ceremony costs the learner time even
when every second of it is evidence.** 42 questions is 42 questions. No option gets a
tested-out learner from the diagnostic to era five for free, and any that claims to has
given up the causal link.

---

## 5. The options

**They vary on one axis: what evidence paces the transformation, and how it is packaged.**
Both extremes are included because they bound the space, and they are costed rather than
dismissed.

**The concrete case throughout: a learner who tests out of eras one through four.** That is
21 nodes (`NUM.S`, `NUM.F`, `NUM.2`, `NUM.3`, `NUM.4`, `NUM.5`, `EXP.1`, `RAD.1`, `RAD.2`,
`RAD.3`, `RAD.4`, `LIN.1`, `LIN.3`, `LIN.4`, `LIN.5`, `LIN.6`, `POL.1`, `POL.2`, `POL.3`,
`POL.4`, `POL.8`), read off `ERA_SEQUENCE`. **All of §5 assumes the diagnostic has been
widened**, since §2 establishes that none of it is reachable otherwise.

**The reference costs, so every option can be compared against the same numbers.**

| Quantity | Figure | Where it comes from |
| --- | --- | --- |
| Nodes tested out | **21** | `ERA_SEQUENCE` eras one to four |
| Practice items to master those 21 | **105** | 5-item practice set per node, `docs/Mastery_Scoring_Spec.md:51`, mastery at 4 of 5 (line 11) |
| Trial questions across those four eras | **42** | `CEREMONY_ITEMS_PER_NODE = 2` (`eraCeremony.ts:200`), so 12 + 10 + 10 + 10 |
| Mid-era crises in those eras | **2** | Eras 1 and 4 (D-CRISIS-35) |
| Entry diagnostic length for an acing learner at full scope | **57 items over 34 probed nodes** | Measured in `2026-07-31-game-completion-ceremony-design.md` §7 at `2a484b1b`. Not re-measured here |

### 5.1 Option A: play it all (the lower bound)

**No era-level test-out. Lesson-skip only, which is exactly what the tree does today.**

**Minute by minute.** Diagnostic, 57 items. *"You've unlocked 21 buildings."* They place
era one's six, already complete. The Town Hall does not offer the inspection, because
`eraTrialUnlockState` says six nodes are unmastered. So they open each of the six
buildings' practice sets and do 30 items to reach mastery 2, answer era one's crisis, take
era one's 12-question trial, and get the four beats. Era two opens: five buildings, 25
practice items, a 10-question trial, four beats. Eras three and four the same, with era
four's crisis. **Total before they reach material they do not know: 105 practice items, 42
trial questions, 2 crises, 21 placements.**

**Beats.** All four, four times. Nothing lost.

**Cost to build.** **Zero.** This is the tree at a widened scope.

**Collides with.** SPOV 3 by name, and with the test-out amendment's own stated rationale,
which describes the pre-amendment stance as making the student redo work the instrument had
already concluded they had, *"which is exactly the friction a readiness product should
avoid"* (`Contracts_Amendment_Diagnostic_TestOut_Unlock.md:48`). That sentence was written
about lessons. It reads identically about 105 practice items.

**Honest scoring.** Commitment (2), the city as the experience: **complete**. Commitment
(1), do not make them sit through what they know: **failed at era scale**, and failed in
the most expensive currency, since practice is the part an adult with maths anxiety is
least willing to be condescended by. Note it does not fail at lesson scale, which is the
part already ratified.

**Rulings needed.** None.

### 5.2 Option B: hand them the finished city (the upper bound)

**A time-lapse, or a straight cut, and the learner arrives standing in era five.**

**Minute by minute.** Diagnostic, 57 items. *"You tested out of four eras."* A 60 to 90
second sequence in which four eras of city assemble themselves. The learner watches. They
arrive in era five with 21 buildings placed by an algorithm. **Total interactive: the
diagnostic, then nothing, then era five.**

**Beats.** **None of the four**, in any of the four eras. First ceremony is era five's.

**Cost to build, and this is the part that is usually skipped.** It is **not** the cheap
option. A time-lapse must be choreographed on a clock, where the ceremony is paced by
answers and can hold indefinitely between them, so it needs its own timing authoring for
every era-count from one to nine. It needs an **auto-layout** for 21 buildings, which is
new code and which is spending the learner's one aesthetic choice on their behalf. And it
still needs every era's halls, ground ladders and dressings, because a time-lapse of eras
two to four is precisely a render of eras two to four. **A straight cut with no animation
is strictly cheaper and loses nothing extra**, which is the strongest argument against
building the time-lapse specifically: it is paying real money for the difference between
two options that are both this one.

**Collides with.**

- **D-ERA5** must be repealed for tested-out eras: nothing here masters anything and no
  trial is passed.
- **Mastery, unavoidably.** Either the 21 nodes stay at 0, in which case the citizen
  population is short by one term per node (§3), the era-four crisis pool is **empty**
  (`mid-era-crisis.ts:132`), and a quarter of the city stands at zero stars; or something
  writes mastery from a placement, which contradicts `docs/Contracts.md` §1's *"the
  diagnostic never writes `mastery`"* and §3's single-writer rule. **There is no third
  branch.**
- **The lead's own objection**, which is the real indictment and does not need a ruling
  behind it.

**Honest scoring.** Commitment (1): **complete**, and it is the only option that is. No
learner time is spent on known material at all. Commitment (2): **near zero**. Worth
stating precisely rather than sneering at, because the bound is informative: B is the
correct answer if and only if the city is a reward rather than the point. The team has
already decided it is the point (SPOV 2: the city **is** the progress bar, not a reward
skin), so B is ruled out by a position that is already held.

**Rulings needed.** D-ERA5, D-ERA16 (the trial's mastery gate), and either Contracts §1/§3
or an accepted city with 21 zero-star buildings and no era-four crisis.

### 5.3 Option C: the trial IS the test-out

**One predicate changes. `eraTrialUnlockState` reads `mastery >= 2 OR placement_estimate
>= 2`, per node. Everything else in the ceremony stays exactly as ruled.**

The reasoning is §4's. Test-out already licenses skipping the teaching; the trial is a
demonstration rather than teaching; so a learner who has proved the era on the diagnostic
has earned the right to be inspected, not the right to skip the inspection. **This does
change what the trial is for that learner, and the collision is worked through below rather
than waved at.**

**Minute by minute.**

- Diagnostic, 57 items. *"You've unlocked 21 buildings."*
- They place era one's six buildings, complete, at 0 stars. This is the part the lead
  already likes and it is untouched.
- **The Town Hall offers the final inspection immediately.** Era one's trial: 12 questions,
  `beatQuotas("prehistoric")` = `[3, 3, 3, 3]`. Three correct and the citizens gather;
  three more and the island expands; three more and the hall rebuilds; three more and the
  island turns Neolithic. **About four minutes, and every beat is caused by an answer.**
- Era two opens. Five buildings placed, a 10-question trial (`[2, 3, 2, 3]`), four beats.
- Era three, the same. Era four, the same, plus era four's mid-era crisis, drawn from
  skills that are now mastered (see the mastery clause below).
- **Era five is the first era they failed, and ordinary play resumes**: lessons, practice,
  trial.
- **Total interactive: 42 trial questions, 21 placements, 2 crises.** Roughly 25 to 35
  minutes from the diagnostic to real content, all of it played.

**Against Option A that is 105 practice items removed and 42 retrieval reps kept**, which
is the right 105 and the right 42: the items removed are the ones the instrument already
concluded were unnecessary, and the ones kept are the ones the ceremony is made of.

**Beats.** **All four, in all four eras.** Nothing is lost. This is the only option that
can say that.

**Cost to build.** The gate is one predicate in `engines/game/src/era-trial.ts`. The
ceremony, the beats, the halls, the land budgets and the dressings all have to exist for a
non-tested-out learner anyway, so **C adds no art**. The genuinely new work is three
things: the predicate, the mastery decision below, and a placement flow for buildings in an
era the learner has not lessoned, which already exists because test-out already places
completed buildings.

**The mastery clause, which is C's one real decision.** Left alone, a learner who tests out
of four eras and passes four trials still holds mastery 0 on 21 nodes. Consequences, all
measured above: 21 zero-star buildings, a citizen population short by one term per node,
and an **empty era-four crisis pool**. That last one is not cosmetic, it is a gated advance
with nothing behind the gate.

So C should also rule that **a clean trial pass writes mastery for the nodes it covered,
through the mastery service**. That is defensible on evidence rather than on convenience:
D-ET4 requires every node answered correctly, D-ET13 re-queues a further item from any node
that was missed and the ceremony cannot finish while the queue is non-empty, and D-ET11
makes a miss cost exactly what a correct answer gains, so a learner at 50% stalls and never
finishes. The effective bar is *a clean run on every node*, which is not obviously weaker
than 4 of 5 on a 5-item set. **`docs/Mastery_Scoring_Spec.md:97` already contemplates the
shape**, in its own parenthesis: node mastery is established by lesson practice sets *"(and,
post-MVP, standalone confirmation sets)"*. The write still goes through the mastery service,
so §3's single-writer rule is untouched.

**Collides with.**

- **D-ERA16 / D-ERA5's gate**, which is what the predicate changes.
- **`docs/README.md:87` and `Mastery_Scoring_Spec.md:97`** if the trial writes mastery,
  because the storm precedent is that a checkpoint never masters a node. The trial is not
  the storm and the distinction is arguable, but it is a reversal and must be recorded as
  one, and it lands in **Anthony's lane**, which already carries one outstanding ack on
  test-out.
- **D-ET1, and this is the collision that took the longest to see.** D-ET1 rules the trial
  a ceremony rather than an exam, and its argument is not a preference: *"it unlocks only
  once every node already holds mastery 2, so nothing is being discovered"*
  (`2026-07-29-era-trial-contract.md:1203`). **Option C removes that premise by
  construction.** A tested-out learner arrives at mastery 0, so for them the trial genuinely
  discovers something, and calling it a final inspection when it is the thing deciding
  whether they advance is a framing problem. **Precisely which line it approaches, since
  overclaiming here would be easy:** the literal ban at `Game_Visual_Design_Brief.md:69-70`
  is on *"countdown/urgency timers framed as pass/fail"*, and the trial has no timer, so
  that ban is not tripped. What is approached is the tone requirement above it at lines
  59-60, *"Calm and non-punishing"* and *"Failure is never a loss"*. The same structure has
  already been noticed once in this repository and resolved the same way: **D-END8**
  observes that D-ET1's reasoning *"is exactly why a cold retake discovers something"*.
- **Nothing else.** INV-COS-1 is untouched (no resource gates anything). INV-ERA-3 is
  untouched (nothing keys off pace). Mastery stays monotonic. The mastery-0 completion rule
  is untouched, because C changes what unlocks the trial and not what test-out does to a
  building.

**What answers the D-ET1 collision, and it costs nothing because it is already ruled.**
A tested-out learner who stalls in the trial has been told something true and useful: the
diagnostic over-credited them on that era. **The remedy is the lesson and the practice they
skipped, and those are already open**, because `INV-COS-1` guarantees nothing gates
learning and test-out never removed the lesson, it only stopped requiring it. So the failure
mode has a landing place that is not a wall, which is what separates this from a pass/fail
gate. Three ruled mechanics make the landing soft rather than punitive: **D-ET12** locks a
completed beat so progress never slides below one they finished, **D-ET14** makes leaving
always available and shows what they kept, and the practice door stays open the whole time.
**The copy has to say so**, and that is a real authoring requirement rather than a
reassurance: a tested-out learner entering the trial should be told it is where they prove
the era, and a stalled one should be pointed at the lessons rather than left at a wall.

**Honest scoring.** Commitment (2): **complete**. Commitment (1): **strong, not perfect,
and deliberately not perfect.** 42 questions on known material is 42 questions. The defence
is that they are the ceremony rather than a tax on it, but a learner who resents them will
resent them, and that is a real risk rather than a rhetorical one.

**Where C is genuinely weak, stated before the recommendation rather than after.** **Four
ceremonies in half an hour.** D-ET3 rules that the same ritual in all ten eras is the
point, and it is, when the ceremonies are weeks apart in a learner's life. Four in one
sitting is repetition, and repeating a ritual is how a ritual becomes a loading screen.
**And the cost falls entirely on the strongest learners**: a learner who tests out of nine
eras gets nine ceremonies back to back, which is the worst version of C and is paid by the
person who least deserves it. That is uncomfortably close to the *"nothing that reads as
punishing a learner for being good at maths"* line.

**Rulings needed.** D-ERA16 (the gate). Optionally `Mastery_Scoring_Spec` §5 and
`docs/README.md:87` (the trial as a confirmation set). **D-ET1 needs narrowing rather than
overturning**: the trial is a ceremony for a learner who mastered the era and an inspection
with something at stake for one who tested out of it, and the document should say both.

### 5.4 Option D: one founding, one ceremony

**The whole tested-out run is a single chapter break. Same evidence, one ritual.**

All 42 questions are asked in one sitting, and the four beats span the run rather than an
era: beat one gathers all 21 buildings' citizens; beat two expands the island through four
radii in one continuous push; **beat three rebuilds the hall through four halls in
sequence**, which is the same shape `REBUILD_STAGES` already gives beat three internally;
beat four re-themes the island into era five.

**Minute by minute.** Diagnostic. *"You've unlocked 21 buildings."* They place era one's
six. The founding begins: 42 questions over about twenty minutes, with each era's five or
six buildings becoming placeable as that era's questions are answered, the ground turning
under them era by era, and the four beats punctuating the whole span. They end standing in
era five.

**Beats.** **All four, once.** And **all four halls**, as phases inside beat three, so the
authored art is all seen. What is lost is three chapter *breaks* as events, not three
transformations as images.

**Cost to build.** Higher than C and lower than E. `beatQuotas` takes one era, so a
run-spanning version is new logic; the four-halls-in-one-beat choreography is new; and it
must work for one through nine tested-out eras. **No new art**, same as C.

**Collides with.**

- **D-ET8's own pacing arithmetic, which is the sharpest objection and comes from the
  lead's own ruling.** Four beats over 42 questions is **10.5 correct answers between beat
  changes**. D-ET8 rejected three beats over eighteen questions because *"six correct
  answers between visible changes"* is too long for a ceremony to go without responding to
  the learner (§19.1). D's answer is that each beat carries internal progress (the hall's
  six phases, the island's staged expansion), so visible change is far more frequent than
  once per beat. That is a real answer, but it is an argument against a ruling rather than
  a fit to it, and it should be put to the lead as such.
- **D-ET3**, in shape rather than in letter: the four beats are the same four beats, but
  the tested-out learner's chapter break is not the same object as everybody else's.
- The same gate and mastery questions as C.

**Honest scoring.** Commitment (1): **same as C**, since the evidence total is identical.
Commitment (2): **strong but not complete**. Every beat is seen and every hall is seen; the
thing given up is that four eras produce one chapter break, which tells the learner those
four eras were worth one. That is a smaller version of B's problem, and it is the reason
this record does not recommend D.

**Rulings needed.** D-ERA16, D-ET1 (narrowed, exactly as under C), D-ET8 (the beats span a
run rather than an era), D-ET3, and the same optional mastery ruling as C.

### 5.5 Option E: the reserved ceremony

**Say it outright: a tested-out era does not get a chapter break, because a chapter break is
for a chapter you lived. Give them something else, and keep the ceremony for their first
real era.**

The tested-out run becomes a **founding narrative** with its own name, art and music: the
city's history before the learner arrived, told forward. It is paced by a **sample** of the
evidence rather than all of it, one item per node rather than two, so 21 questions rather
than 42, each correct answer raising one building in its era's dressing while the ground
and the hall turn underneath.

**Minute by minute.** Diagnostic. *"Your city has a history before you arrived."* The
founding: 21 questions, about twelve minutes, 21 buildings rising as they answer. They
arrive in era five having never seen the four-beat ceremony. **Era five's trial is their
first**, and it lands with the full weight of a thing they have not seen before.

**Beats.** **None of the four, by design.** They see a different thing instead, and the
argument is that a ceremony's power is partly scarcity: handing a strong learner four
chapter breaks in half an hour is how you teach them that a chapter break is not worth
much.

**Cost to build.** **The most expensive option by a distance.** It is an entire surface
that only some learners ever see, with its own art direction, its own audio and its own
copy, and it must work for one through nine tested-out eras. Against SPOV 1's discipline
about what earns its place, a surface with a small audience needs to be very good to
justify itself.

**Collides with.** **D-ET3 hardest of any option**: the tested-out learner's ritual is
frankly a different ritual, which is the thing D-ET3 exists to forbid. **D-ET10** if the
sample is one item per node rather than two. And it weakens the evidence: 21 items over 21
nodes is one item per node, which under the probe policy is a confirm threshold nobody
would accept for a decision that unlocks four eras.

**Honest scoring.** Commitment (1): **strongest of the options that keep agency**, at half
C's question count. Commitment (2): **split, and this is the interesting part.** On the
four beats specifically it scores worst of the three middle options, because they are
withheld. On *"the city is the reward"* it arguably scores best, because the founding is
about their city specifically and is the only option whose art exists to celebrate what
they already knew. The bet it is making is that ceremony scarcity is worth more than
ceremony count.

**Rulings needed.** D-ERA16 (bypassed for tested-out eras rather than widened, since E
asks for no trial there at all), D-ET3, D-ET10, plus a new authored surface with no owner
today. **D-ET1 is NOT disturbed under E**, which is one of E's quieter merits: the trial
still opens only on mastery 2, so nothing is ever discovered in it.

### 5.6 The five, side by side

| | A: Play it all | B: Hand it over | C: Trial is the test-out | D: One founding | E: Reserved ceremony |
| --- | --- | --- | --- | --- | --- |
| Questions on known material | **147** | **0** | **42** | **42** | **21** |
| Placements the learner makes | 21 | 0 | 21 | 21 | 21 |
| Ceremonies seen | 4 | 0 | 4 | 1 | 0 (first is era five's) |
| Beats seen (of 4) | 4 | 0 | 4 | 4 | 0 |
| Halls watched build | 4 | 0 | 4 | 4 | 4, but inside the founding rather than as a beat |
| New art | none | every era's, plus a time-lapse | **none** | none | a whole surface |
| New logic | none | auto-layout, clock choreography | **one predicate** | run-spanning beats | a whole surface |
| Commitment (1), do not waste their time | fails | complete | strong | strong | strongest |
| Commitment (2), the city is the experience | complete | near zero | **complete** | strong | split |
| Rulings amended | 0 | 3+ | **2, or 3 with the mastery clause** | 4, or 5 | 3, plus a new surface |

**Read the last row with §8 open.** It counts the rulings each option forces on its own.
**D-END5's routing (§7.2) is owed by every option except A** and is deliberately not in the
count, because it is a consequence of test-out reaching further at all rather than of any
one option, and it belongs to another record's owner.

---

## 6. Recommendation, and what it gives up

**Recommend Option C, with the mastery clause.**

**Why it and not the others.** C is the only option that scores complete on commitment (2)
while removing anything at all from commitment (1)'s bill, and it is the cheapest of the
five by both measures that matter, art and rulings. It is also the option that follows from
positions the team already holds rather than from a new one: the test-out amendment already
separated teaching from demonstrating, D-ERA5 already gates the chapter break on two things
neither of which is a build action, and SPOV 4 already says the reward for mastering a skill
is being made to use it again. C is those three sentences applied at era scale. Nothing here
is a new philosophy, which is the main reason to trust it.

**What it gives up, stated so the lead can decline it on these grounds.**

1. **The ceremony gets cheaper for the learner who sees it most.** Four chapter breaks in
   half an hour is repetition, and nine in a sitting, for a learner who tests out of nine
   eras, is the worst case and is paid by the strongest learner. **This is C's real cost
   and D exists to buy it back.** If the lead's instinct is that the ritual must stay rare,
   **take D instead**, accept 10.5 answers between beats, and accept that four eras produce
   one chapter break.

2. **It does not make the time free, and it should not claim to.** 42 questions and 21
   placements is not nothing. C's whole defence is that those 42 are the ceremony rather
   than a tax on it, and a learner who does not feel that will experience C as A with fewer
   steps.

3. **It reverses a precedent in another owner's lane.** The mastery clause makes the trial
   a mastery evidence source, which the storm was explicitly denied
   (`docs/README.md:87`). Anthony owns that, and he has not yet acked the production
   completion trigger from the original test-out amendment either
   (`docs/Contracts.md` §1.1, the still-owed note at line 68). **Recommending C means asking
   him for two things instead of one.** If he declines, C still works, and the tested-out
   learner then has 21 zero-star buildings and no era-four crisis, which is a materially
   worse product rather than a cosmetic compromise.

4. **It makes the trial mean two different things, and the document has to admit it.** For
   a learner who mastered the era the trial is a ceremony and D-ET1's *"nothing is being
   discovered"* is literally true; for a tested-out learner it is the moment their placement
   is checked, and something is discovered. The mastery clause is what makes that honest
   rather than a euphemism, since a trial that can grant mastery is allowed to be the thing
   that establishes it. But a single surface now carries two meanings, and its copy has to
   carry both.

5. **It does not fix the ending.** §7 is a separate problem and C does not touch it, and it
   makes it slightly worse by letting more learners reach the ending having tested out of
   more.

**What the recommendation explicitly does not do:** it does not widen the diagnostic. That
is Gabe's, it was declined on 2026-07-26 (`engines/diagnostic/README.md:107-110`), it is
tracked as **O-END1**, and nothing here changes it. What this record adds is a second
reason to revisit it, alongside D-END3's.

---

## 7. The completion ceremony, checked for this learner

The brief asks whether the ending still works for someone who tested out of six eras, and
whether D-END4's denominator problem bites differently. **Two findings, one of them new.**

### 7.1 The ceiling, measured

`computeCoverage` is depth-weighted, `w(n) = 1 + prereqDepth(n)`
(`engines/diagnostic/src/coverage.ts:29-32`). Driven cumulatively over `ERA_SEQUENCE` at
the 62-node in-product scope, a learner who passes every node up to and including era N
scores:

```
through era prehistoric:     6/62 nodes   raw 0.097   depth-weighted 0.034   (10/291)
through era neolithic:      11/62 nodes   raw 0.177   depth-weighted 0.113   (33/291)
through era bronze_age:     16/62 nodes   raw 0.258   depth-weighted 0.199   (58/291)
through era classical:      21/62 nodes   raw 0.339   depth-weighted 0.271   (79/291)
through era medieval:       26/62 nodes   raw 0.419   depth-weighted 0.392  (114/291)
through era renaissance:    32/62 nodes   raw 0.516   depth-weighted 0.498  (145/291)
through era industrial:     38/62 nodes   raw 0.613   depth-weighted 0.605  (176/291)
through era atomic_age:     47/62 nodes   raw 0.758   depth-weighted 0.766  (223/291)
through era information_age:53/62 nodes   raw 0.855   depth-weighted 0.876  (255/291)
through era cyberpunk:      62/62 nodes   raw 1.000   depth-weighted 1.000  (291/291)
```

The era-one row reproduces the completion ceremony record's own **0.034** at `2a484b1b`,
which is the cross-check that this harness measures what that one measured.

**So the learner in §5's case starts at 0.271 and their headline gain is capped at +72.9
points**, against +100 for a learner who arrives cold. A learner who tests out of six eras
starts at 0.498 and is capped at +50.2. **The strongest learners have the smallest possible
number to show at the end**, which is arithmetically correct and reads as a punishment.

**This is a different problem from D-END4 and is not fixed by it.** D-END4 is about the
denominator moving *between* administrations, and its fix (bump `blueprint_version`) is
right and unaffected. This is a **ceiling effect** at a fixed denominator: same scope, same
weights, both administrations comparable, and the number is still small because the
numerator was already large at pre.

### 7.2 The new finding: a tested-out node cannot flip

**D-END7** makes the headline *"the skills the retake newly holds, mapped to their
buildings"*, and prefers a flip list over a delta precisely because a delta can be flat for
a learner who built a city. That reasoning is sound and this does not overturn it. But a
flip list has its own failure for this population, and it is structural rather than
statistical:

**A node the learner passed at pre and passes at post did not flip.** It was `passed`, it is
`passed`. So for the §5 learner, **21 of 62 skills cannot appear on the ceremony's headline
at all**, and those 21 are exactly the ones they are best at. Their city holds 21 buildings
the ending never names. **D-END8(a)** already rules that a skill the retake did not confirm
is off the list, which is correct for its own case and compounds this one: between them,
the ending celebrates the middle of this learner's ability and neither end.

**Both the ceiling and the flip hole point at the same fix, and it already exists.**
**D-END5** rules that a learner without a comparable pair gets a **different** ceremony
rather than a degraded one: a standing-city ceremony, making no pre/post claim, showing the
skills the retake confirmed **cold** and the city as the record of the run. **That is
exactly the right ceremony for a heavily tested-out learner**, because it names confirmed
skills rather than newly-acquired ones, so the 21 are back on screen. What D-END5 lacks is
the routing: it fires on `not_comparable`, and this learner is perfectly comparable.

**Recommended amendment, and it belongs to that record's owner rather than to this one:**
route D-END5's standing-city ceremony on **headroom** as well as on comparability. A
learner whose pre-coverage was already above some share should get the ceremony that
celebrates what they hold, not the one that celebrates what changed. The threshold is a
judgment call and is deliberately not made here. What is established here is that the
population is real, that its size is a function of how far test-out is allowed to reach,
and that **every option in §5 except A makes it larger**.

---

## 8. Rulings that would need amending

| Ruling | Where | Under which option | What changes |
| --- | --- | --- | --- |
| **D-ERA16 / D-ERA5's gate** (`eraTrialUnlockState`, `mastery >= 2` on every era node) | `2026-07-27-era-progression-design.md:351-353`; `engines/game/src/era-trial.ts:200-215` | **C, D, E**, and repealed outright under B | Under **C** and **D** the gate reads `mastery >= 2 OR placement_estimate >= 2`, per node. A per-node form is required rather than preferred, since placement is per node and a partly tested-out era must work. Under **E** the gate is not widened but bypassed, since E asks for no trial in a tested-out era at all |
| **The storm precedent that a checkpoint never masters a node** | `docs/README.md:87`; `docs/Mastery_Scoring_Spec.md:97` | **C, D** (the mastery clause) | A clean trial pass becomes a mastery evidence source for the nodes it covered, written through the mastery service. `Mastery_Scoring_Spec.md:97` already contemplates *"standalone confirmation sets"* post-MVP, so this is filling a named slot rather than opening a new one. **Anthony's lane** |
| **D-ET1** (the trial is a ceremony and not an exam, because nothing is being discovered) | `2026-07-29-era-trial-contract.md:1203`, §11.1 | **C, D** (not E, which asks for no trial in a tested-out era) | **Narrowed, not overturned.** The premise holds for a learner who mastered the era and fails for one who tested out of it at mastery 0. The document should carry both readings, and the trial's copy should differ between them. **D-END8** already reasoned this way about the cold retake |
| **D-ET8** (four beats, per era, in that order) | `2026-07-29-era-trial-contract.md:1275-1286` | **D only** | The beats span a tested-out run rather than an era. Note this contradicts D-ET8's own pacing arithmetic at 10.5 answers per beat, so it is a change the lead should make knowingly |
| **D-ET3** (the same ritual in all ten eras, and the sameness is the point) | `2026-07-29-era-trial-contract.md:21` | **D in shape, E in substance** | Under E the tested-out learner's chapter break is a different object entirely |
| **D-ET10** (two items per node) | `2026-07-29-era-trial-contract.md:101` | **E only** | One item per node for the founding sample |
| **D-ERA5** (the chapter break is gated on learning) | `2026-07-27-era-progression-design.md:351` | **B only** | Repealed for tested-out eras. Nothing is mastered and no trial is passed |
| **Contracts §1 / §3** (the diagnostic never writes `mastery`; one writer) | `docs/Contracts.md:41, 48` | **B only, and only on one of its two branches** | B must either break this or accept 21 zero-star buildings and an empty crisis pool |
| **D-END5's routing** (standing-city ceremony fires on `not_comparable`) | `2026-07-31-game-completion-ceremony-design.md:756` | **all options except A**, in proportion to how far test-out reaches | Route on headroom as well as comparability (§7.2). Owned by that record, not by this one |

**Untouched by every option, and checked rather than assumed:** `INV-COS-1` (no economy or
cosmetic state is an input to a progression decision) is not approached by anything here,
since no option gates on a balance, a population figure or a happiness reading.
`INV-ERA-3` (nothing keys off study pace) is likewise untouched, since no option reads a
clock. Mastery stays monotonic under all five. **The mastery-0 completion of a tested-out
building is untouched under A, C, D and E**, because those options change what unlocks the
trial and never what test-out does to a building; only B disturbs it, and it disturbs it
badly.

---

## 9. Open items

| Id | Question | Who | When |
| --- | --- | --- | --- |
| **O-TO1** | **Which option.** Recorded as a recommendation (C), not a decision | **Team lead** | Before the diagnostic widens |
| **O-TO2** | **Does a clean trial pass write mastery for the nodes it covered?** Required by C and D for the crisis pool and the star display to make sense. Reverses the storm precedent | **Anthony** (mastery lane), with the lead | With O-TO1 |
| **O-TO3** | **Whether to widen the diagnostic**, which is what makes any of this reachable. Declined 2026-07-26 and unchanged. This record is a second reason to revisit it, alongside **D-END3** | **Gabe** (**O-END1**) | Unchanged |
| **O-TO4** | **Route D-END5's standing-city ceremony on headroom as well as comparability** (§7.2) | Owner of `2026-07-31-game-completion-ceremony-design.md` | Before the completion ceremony ships |
| **O-TO5** | **What a partly tested-out era does.** Every option assumes whole eras. Placement is per node, so the common case is an era where four nodes passed and one did not. The per-node gate form in §8 handles the trial; what the ceremony's copy says about it is not decided here | **Team lead** or Evan (ceremony copy) | With O-TO1 |

---

## 10. Self-review

**What is measured here and what is argued.** Every claim in §2 and §7.1 was driven through
the real functions with throwaway harnesses that were deleted after the runs, first at
`3ff0edb8` and again at `7e38ac1a` after the tree moved, and the outputs are quoted
literally rather than summarised. Everything in §5 and §6 is an
argument, and §5's minute-by-minute walkthroughs are constructions from ruled numbers
(`CEREMONY_ITEMS_PER_NODE`, `beatQuotas`, the 5-item practice set) rather than observations
of anything running, because none of it can run.

**Three things this record does not establish.**

1. **That any option is buildable.** Every one of them, including doing nothing, depends on
   eras two through ten having plots, land budgets, halls and dressings that do not exist.
   That art is a prerequisite for era two existing at all, not a cost of this decision,
   which is why §5.6 shows no art difference between A, C and D. If it were a cost of this
   decision it would dominate the comparison.
2. **That 42 questions is the right number.** It falls out of D-ET10's two items per node,
   which was ratified for a learner who had just spent an era learning the material. Nobody
   has asked whether it is the right count for a learner who arrived knowing it. It may be
   too many, and E's argument that it is is not dismissed here so much as costed.
3. **Anything about how it feels.** The central claim of the recommendation, that 42
   evidential questions read as a ceremony where 105 practice items read as a tax, is a
   hypothesis about an anxious adult learner and belongs on the list in `docs/README.md`
   §8, not in the ruled column.

**One place the analysis could be wrong in the lead's favour.** §4 argues the tension
mostly dissolves on the evidential axis. If a learner's actual complaint is *"I have
answered enough questions today"* rather than *"I am being taught things I know"*, then the
axis is time after all, E is the right answer, and C is A with better manners. Nothing in
the repository settles which complaint is the real one, and a single usability session with
one strong learner would settle it faster than any further argument here.

---

## 11. References

- `docs/Contracts.md` §1 (field ownership and the placement/mastery invariants), **§1.1**
  (the normative test-out rule, mastery 0, the write boundary, and the still-owed ack)
- `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` (the rationale record; §2 for why
  inferred passes unlock, §8.1 and §8.2 for the progression model)
- `docs/Mastery_Scoring_Spec.md` §2, §3, §5 (the 5-item set, 4 of 5, and line 97 on what
  may establish mastery)
- `docs/README.md` §10a (the MVP diagnostic scope) and line 87 (the storm precedent)
- `docs/BrainLift_Game_Design.md` SPOV 1, 2, 3, 4
- `docs/Game_Visual_Design_Brief.md` §2 (the tone bans)
- `docs/superpowers/specs/2026-07-27-era-progression-design.md` §1 (INV-ERA-1..5), §4
  (**D-ERA5**), §12 (the ten halls)
- `docs/superpowers/specs/2026-07-29-era-trial-contract.md` §11.1 (**D-ET1**), §11.3
  (**D-ET3**), §19.1 (**D-ET8**), §19.3 (**D-ET10**), §19.4 (**D-ET11**, **D-ET12**,
  **D-ET13**, **D-ET14**)
- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md` (**D-CRISIS-14**,
  **D-CRISIS-35**)
- `docs/superpowers/specs/2026-07-31-game-completion-ceremony-design.md` §3 (the widening
  cost), §4.4 (**D-END4**), §5 (**D-END5**), §6 (**D-END7**, **D-END8**), §7, §8
- Code read at `7e38ac1a`: `packages/skill-graph/src/eras.ts`,
  `engines/diagnostic/src/{engine,index,coverage,walk,walk-engine}.ts`,
  `engines/game/src/{era-trial,mid-era-crisis,citizens-population,descriptors}.ts`,
  `apps/web/src/city/{eraCeremony,citySession,eraState,EraTimeline}.tsx?`,
  `apps/web/src/diagnostic/browserRuntime.ts`,
  `services/diagnostic-runtime/src/aurora-server.ts`, `services/diagnostic-api/src/reads.ts`
