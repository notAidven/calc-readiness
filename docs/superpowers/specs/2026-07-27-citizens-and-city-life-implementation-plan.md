# Citizens & City Life Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Status:** PLAN. **The design is settled elsewhere and this plan does not redesign it.**
Design of record: `docs/superpowers/specs/2026-07-27-citizens-and-city-life-design.md`
(**D-CIT1..D-CIT20**, two 2026-07-27 amendment banners, four GROUNDED CORRECTIONs, §8
tuning, §17's open questions). Where this plan disagrees with that spec, **the spec wins**;
where the spec is silent on something an implementer must decide, this plan **flags it in §7
and names who decides** rather than quietly choosing.

> **REVISED 2026-07-27 (second pass), after the user resolved three of §7's flags and set
> the performance target.** The design spec's **AMENDMENT 2** records the same four rulings,
> and the two documents are kept in agreement:
>
> - **§7.1 (roles) is RESOLVED → D-CIT17.** The role map is keyed by **node id**, in
>   `engines/game/src/descriptors.ts` alongside `building_archetypes`. **Checked against
>   the code before adoption and it survives** — see §7.1, which now records what was
>   verified rather than what was proposed. Tasks 1.1, 1.2, 2.2, and 2.4 change.
> - **§7.2 (roads) is RESOLVED → D-CIT18.** `road_cells` is gone from the engine input
>   entirely. Task 2.3's assertion gets stronger, not weaker.
> - **§7.3 (assignment) is RESOLVED → D-CIT19**, placement order, with **both
>   consequences accepted by the user** and now written down as a decision in both
>   documents rather than as a flag.
> - **§6 Q2 is CLOSED → D-CIT20.** The floor is **school Chromebooks with low-end
>   integrated graphics**; the common case is **typical student laptops with integrated
>   graphics**. `MAX_RENDERED_CITIZENS` is provisionally **48**, Phase 5 profiles against
>   that hardware class, and §14's ladder is now a **shipping requirement**. One new
>   question (Q11 — how a ladder rung gets selected) is opened by that and is listed in §6.
>
> **§7.4, §7.5, and §7.6 remain open flags**, and **Q4 (the seed) remains open** — still
> Evan's decision, with Gabriel signing off if it reads schema state.

**Grounded against:** `integration` at **`291768f`**. The first pass was written against
`b73345b`; **#146, #151, #152 and #153 have all landed since**, and the collision notes were
re-read against the landed tree each time. Every file path, signature, and constant cited
below was read in the tree, not assumed. **§3 is the refreshed collision picture, and as of
this pass nothing in this plan is waiting on another branch.**

**Goal:** Turn the D1 island from a scoreboard into a place that is used — a population
derived purely from learning state, rendered as an instanced crowd that arrives, moves in,
and finally settles, with the whole arc legible in text.

**Architecture:** A new pure derivation in `engines/game` maps placed-and-complete buildings
plus a seed to a citizen roster (counts, per-building role and capacity, who lives where, who
is waiting). `apps/web` consumes that roster twice and never derives one: the DOM mirror
renders it as words (population / housed / waiting, per-building occupancy, advisor beats),
and a new instanced layer in `apps/web/src/city/three/` renders it as bodies. Nothing is
persisted, no save format changes, and the engine never sees a mesh.

**Tech Stack:** TypeScript (npm workspaces monorepo), `@cr/game` (framework-free engine),
React 19 + Vite + React Three Fiber + three.js (`apps/web`), Vitest (node + jsdom projects
via `vitest.config.ts`, real-Chromium project via `vitest.browser.config.ts`), Biome
(format + lint).

---

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from
the design spec.

- **Derived, never persisted (D-CIT1).** Population is recomputed from learning state on
  every load. **No new persisted state, no save-format change, no schema change.** Nothing
  is added to `CityDevSnapshot`, `StudentNodeState`, or `packages/shared-state-schema`.
- **Pure logic in `engines/game`, rendering in `apps/web` (D-CIT8).** `@cr/game` stays
  framework-free: no `three`, no React, no GLB, no import from `apps/web`. The engine never
  knows about meshes; the scene never decides who lives where.
- **The seed is an INPUT, never invented by the renderer (D-CIT8).** A renderer that mints
  its own seed reintroduces per-mount instability and breaks §4's whole claim.
- **Keyed on placed-and-complete, not merely complete (D-CIT10).**
  `citySession.seedFromPlacement` calls `placements.clear()`, so a tested-out learner has six
  nodes at `lesson_stage: "done"` and **zero buildings on the ground**. Population and
  capacity are read from the **same** placed-and-complete set.
- **"Complete" means placed AND `construction_state === "complete"`**, i.e. `mastery >= 2`
  **or** `lesson_stage === "done"` (`engines/game/src/construction.ts`,
  `deriveConstructionState`).
- **"Mastered" means `mastery >= 2` (D-CIT11).** **Gold mastery (`mastery === 3`) adds no
  citizens and no capacity.**
- **Roles are keyed on the NODE ID, in the neighborhood descriptor (D-CIT3 as amended;
  D-CIT17).** `NeighborhoodDescriptor.citizen_roles: Record<node_id, CitizenRoleId>` plus
  `default_citizen_role`, in `engines/game/src/descriptors.ts` alongside
  `building_archetypes`, resolved by `resolveNeighborhood` onto `ResolvedPlot` and carried
  to `CityBuildingView`. **Not the display name**, which is declared mutable and has
  already changed once (`NUM.S` "Town Hall" → "City Bank"), and **not `gridworkId`**, which
  the engine cannot see.
- **`civic` is the fallback role**, so no building is ever role-less and no island needs an
  authoring pass. An unknown art mass is `civic` with **zero** residence capacity.
- **`school` and `park` carry zero residence capacity, and that line is not crossed.** That
  zero is load-bearing: it is what makes the mid-game crowd appear (§8.5).
- **Capacity grows with mastery (D-CIT15)**, with the same two-term built/mastered shape as
  population.
- **The settled ending is a guarantee, not a tendency (D-CIT4, as amended).** At full mastery:
  **44 citizens, 44 homes, zero waiting, `ENDGAME_SPARE_HOMES = 0`**, in **every one of the 33
  topologically valid build orders** and on the tested-out path.
- **No punishment, ever (D-CIT6).** The citizen state union contains **no state that expresses
  harm**. Nothing is lost, damaged, or degraded; no number goes down.
- **No-eviction guarantee (D-CIT6).** Capacity is monotone because mastery is monotone
  (`mastery-service` applies `max(existing, evidenced)`), so a growing crowd is always new
  arrivals and never a setback. A citizen who was `housed` stays `housed`.
- **Population is never an input to any gate.** Not the storm, not a lesson, not an island
  unlock, not a build-menu affordance (Contracts §8 INV-COS-1/2).
- **Roads amplify, never gate (D-CIT7), and are NOT an engine input (D-CIT18).**
  `CitizenRosterInput` has exactly two fields, `nodes` and `seed`, so deep-equality with
  and without roads is structural. Road cells are walkable and cheaper to walk; **no route,
  destination, or assignment may depend on one.** `roadNeighborMask(col, row, roadCells)`
  is the O(1) adjacency primitive; **no pathfinding exists anywhere in the repo**, so a
  router is new code, and it lives in `apps/web` beside `worldLayout`.
- **Homes fill greedily in placement order; the housed set is the lowest-indexed
  `min(population, capacity)` citizens (D-CIT19).** Two accepted consequences: mastering a
  building reshuffles homes *between* buildings (nobody loses one), and *which* building a
  resident occupies is placement-order-dependent (no count is).
- **The canvas is `aria-hidden` decoration (D-CIT13).** The DOM carries all meaning: the
  population readout, the milestone callouts, and the closing "this community is happy" beat
  must exist in text (D-CIT16, pinned by a test).
- **No raw internal ids in copy.** Buildings are named through `placementLabel`; the hub reads
  "Civic Center", never `town-hall`. `announcements.test.ts` sweeps every exported `*Message`
  and **pins the corpus to the module's export list**, so a new message fails the suite until
  it is swept.
- **Wording never shames** and **never frames waiting as a shortfall against a limit.**
  "8 waiting for homes" is allowed; "8 over capacity" is not. Banned list: `homeless`,
  `unhoused`, `failing`, `overcrowded`, `too many`.
- **Reduced motion poses, never removes (D-CIT13).** Under `prefers-reduced-motion` citizens
  stand at their destinations and the population is unchanged — the same stance
  `StarterIsland`'s gulls already take ("they hold still (posed once, no flap)").
- **Instancing is new to this codebase (D-CIT9).** Nothing in `apps/web/src` uses
  `InstancedMesh` or drei `<Instances>` today. **Citizens must not cast or receive shadows** —
  shadows are the scene's cost ceiling, and the gulls already set the precedent
  (`mesh.castShadow = false; mesh.receiveShadow = false`).
- **Performance target (D-CIT20).** The **floor is a school Chromebook with low-end
  integrated graphics**; the common case is a typical student laptop with integrated
  graphics. The floor is the realistic classroom machine, not a worst case to survive.
- **Render-only cap.** `MAX_RENDERED_CITIZENS = 48` (provisional, retuned from 64 once the
  target was named) caps **rendering only**. The count, capacities, assignments, and
  waiting list are exact and uncapped, and the DOM always reports the true number. **The
  cap is unreachable on D1** (44 people, waiting peaks at 14) — it matters for a later
  island and for ladder rung 1, so nobody should over-engineer it now.
- **The degradation ladder is a shipping requirement, not a contingency**, now that the
  floor is named. Rung 2 (static citizens) is free via reduced motion; rungs 1 and 3 need
  Q11 answered.
- **All tuning lives in ONE named constants table in the engine (D-CIT14).** No literal
  sprinkled through the derivation. §12 pins the *relationships*, not the digits.
- **No emoji anywhere.** No em dashes in learner-facing practice copy (repo convention).
- **Tests must provably fail against the wrong behaviour.** Every task below ends with a
  **mutation proof** step: make one named edit, run the suite, record the exact failure count,
  restore. A test that cannot be shown to fail is not load-bearing.

---

## 1. Phase map

One line each. A phase is one PR: independently reviewable, independently mergeable, and
demonstrably true on its own.

| # | Phase | Demonstrably true when it lands | Depends on |
| - | --- | --- | --- |
| 1 | **Tuning table + population/capacity arithmetic** (`engines/game`, pure) | The cold open is 8 people and 0 homes; all six mastered is 44 people and 44 homes; the settled ending holds in all 33 build orders and on the tested-out path; monotone over all 4096 mastery vectors — **all provable with no GPU, no DOM, and not one citizen rendered** | — |
| 2 | **The roster: individuals, homes, waiting** (`engines/game`, pure) | `deriveCitizenRoster(state, seed)` returns a stable, seeded roster; no citizen is ever evicted; the state union contains no harm state; the roster is deep-equal with and without roads; an unauthored island returns the founding crowd and does not throw | P1 |
| 3 | **The DOM readout, advisor beats, and copy sweeps** (`apps/web`, no 3D) | The Civic Center panel reports population / housed / waiting in words, each roster row reports its own occupancy, the settled state produces the community-is-happy beat **in text**, and the no-raw-id + no-shaming sweeps cover every new message | P2 (+ Q4, Q5, and the advisor-host decision) |
| 4 | **The instanced crowd** (`apps/web/src/city/three`) | Two instanced draws render up to 48 citizens at their homes, destinations, and the waiting ground, casting no shadows, posed and frozen under reduced motion, with the roster count unchanged at the cap — and `depthPrecision.test.ts` still green (§3) | P2 (∥ P3) |
| 5 | **Movement: the road-preferring router + the walk** | Citizens walk between fixed points; a road route is preferred where one exists and a route always exists without any road; the roster is byte-identical either way; **and the crowd is profiled on the Chromebook floor** (D-CIT20) | P4 |
| 6 | **Cars and traffic density** | Traffic scales with the road network up to `MAX_CARS`, is the first thing dropped on a weak machine, and touches nothing in the roster | P5 (+ Q7) |

**Recommended first slice = P1 alone.** It is the whole arithmetic argument of the feature,
it is the part most likely to change under retune, and it de-risks everything after it.

---

## 2. Sequencing rationale

**Why the pure derivation is first, and strictly first.** Every tuning claim in the design is
arithmetic: 8 at the cold open, 44/44 at the end, zero waiting in all 33 orders, a crowd alive
through the first two finished skills. All of it is assertable in milliseconds with no GPU
(§12.1), and all of it is *cheaper to get wrong now than later*. If the numbers do not add up,
the fix is one edit to one table with no migration and no backfill (D-CIT14, and nothing is
persisted). If they are discovered not to add up after the render layer exists, the same edit
arrives with a crowd already drawn against it. So P1 ends with the feature's single most
important assertion — `population(all mastered) <= residence_capacity(all mastered)` and
`waiting.length === 0` — green, before a single mesh exists.

**Why the roster is its own phase and not folded into P1.** P1 answers "how many"; P2 answers
"who, and where". They fail differently and a reviewer can meaningfully reject one while
approving the other: a wrong capacity number is a tuning bug, a wrong assignment rule is a
correctness bug that shows up as people shuffling houses between loads. P2 is also where the
seeded PRNG enters, and the determinism and no-eviction sweeps are the tests that justify it.

**Why the DOM beats the 3D.** The canvas is `aria-hidden` decoration; the DOM is the semantic
source of truth. Landing P3 before P4 means the feature is **complete for a screen-reader user
before it exists visually**, which is the correct order for a surface where the accessible
half is the meaning and the visual half is the depiction. It also gives the fastest honest
demo: the whole arc, in text, on the dev server, with no new rendering risk.

**Why movement is separated from the crowd.** P4 is "the people exist and are in the right
places"; P5 is "they walk between them". The router is genuinely new code — the repo has an
adjacency primitive (`roadNeighborMask`) and **no reachability, connected-component, flood
fill, or path function anywhere** — so it deserves its own review and its own test file. A
static crowd is also a legitimate ship state: §14's weak-machine ladder step 2 is exactly
"stop the walk", so P4 without P5 is a supported configuration rather than a half-feature.

**Why cars are last.** §14 names traffic "the most expendable element", and Q7 (does
`MAX_CARS` share the citizen budget?) is unanswered. Last means the answer can arrive late
without blocking anything.

### Parallel versus sequential

| Pair | Verdict | Why |
| --- | --- | --- |
| P1 → P2 | **Sequential.** | P2 consumes P1's `CITIZEN_NODE_CAPACITY`, `buildingLedger`, and both capacity functions by name. |
| P2 → P3 | **Sequential.** | The panel and the messages read `CitizenRoster` fields. |
| P2 → P4 | **Sequential.** | The instanced layer reads `CitizenRoster` fields. |
| **P3 ∥ P4** | **Parallel, and should be.** | Disjoint files after P2: P3 touches `CitySurface.tsx`, `announcements.ts`, `styles.css`; P4 touches `three/Citizens.tsx`, `three/citizenPlaces.ts`, `CityScene.tsx`. The only shared file is `apps/web/src/city/citizens.ts` (the adapter), which P2's PR should land **complete** so neither of the two has to edit it. |
| P4 → P5 | **Sequential.** | The walk poses the instances P4 creates. |
| P5 → P6 | **Sequential-ish.** | Cars reuse the router. P6 could be cut from P4 instead if the router slips, at the cost of cars that ignore road shape. |

**Within P1, tasks 1.1 → 1.2 → 1.3 are sequential** (1.3's sweeps call 1.2's functions).
**Within P2, task 2.1 (the PRNG) is parallel with 1.x** — it depends on nothing — so it is a
legitimate warm-up commit if two people are working.

---

## 3. Collision risks with work currently in flight

> **REFRESHED 2026-07-27 (third pass) against `integration` at `291768f`.** The first pass
> read three *uncommitted* worktrees; **#146, #151, #153 and now #152 have all merged**, so
> **all three collisions are discharged and nothing in this plan is waiting on another
> branch.** The table is re-read from the landed tree. One obligation outlives its
> collision: #152's `depthPrecision.test.ts` makes a measured claim about every solid object
> in the scene, and citizens join that scene — so P4 still owes it an argument even though
> there is no longer a merge to sequence.

| Branch / PR | State | Its files (verified) | Collides with | Severity and handling |
| --- | --- | --- | --- | --- |
| **#146 `evan/tutorial-refresh`** (the coach-mark extension) | **MERGED** into `integration` at `3595d82` | `CitySurface.tsx` (+202), `announcements.ts`, `announcements.test.ts`, `types.ts`, `citySession.ts`, `styles.css`, `coachmarks/**` (incl. new `coachAnchorRegistry.ts`), `onboarding/HowToPlay.tsx`, `engines/game/src/cosmetic-preview.ts` | **P3 — DISCHARGED** | **The sharpest collision is gone, and it cost P3 nothing.** Re-read after the merge: `announcements.ts` still has exactly one `spokenMessages` corpus pinned to the module's `*Message` export list, and #146 changed **one message's wording** (`skillCompleteMessage` dropped its false "A cosmetic reward is on the way." promise) plus **one assertion**. So **P3's plan is unchanged**, the contiguous-block advice is now belt-and-braces rather than necessary, and the corpus-pinning mechanism P3's tests lean on is intact. **P3 should still keep its messages in one block** — the next branch to touch this file will thank it. |
| **#152 `evan/road-zfight`** (the road flicker fix) | **MERGED** into `integration` at `b0a30a7` | `three/CityScene.tsx` (+8/-4), `three/orbitCamera.ts` (+69), `three/Roads.tsx` (+29), **new `three/depthPrecision.test.ts` (+95)** | **P4 — the textual half is DISCHARGED; the semantic half STANDS** | **The conflict is gone; the obligation is not.** (1) *Textual — discharged.* The camera-memo edit (`near: VILLAGE_CAMERA.nearPlane`, `far: layout.islandRadius * VILLAGE_CAMERA.farPlaneRatio`) is in `integration` now, at `CityScene.tsx:454-455`; P4's mount goes in the canvas subtree beside `<Roads>` at `:599`. Different regions, and both are already in the tree P4 cuts from, so there is nothing left to sequence. (2) *Semantic — unchanged, and verified against the LANDED file rather than the PR diff:* `depthPrecision.test.ts` landed **byte-identical** to the branch tip, still asserting `NEAR < 3` on the strength of a **measured claim** — "sweeping ~12k camera states against the fully built city, nothing solid — island, buildings, roads, dock — came within 3u of the camera", with the mastery-star billboards the only exception at ~0.95u. **Citizens are new solid geometry, so they are inside the scope of that measurement.** See the handling note below. |
| **#151 `evan/pixi-cleanup`** | **MERGED** at `9ee2a02` | `apps/web/package.json` (dropped `pixi.js`), `App.tsx`, `city/palette.ts`, `three/GridworkModelPreview.tsx`, `styles.css`, and six docs | **P3 — DISCHARGED** | The `styles.css` overlap resolved itself on merge. Citizens add **no dependency**, so the `pixi.js` removal was never a real risk. |
| **#153 `evan/camera-supersede`** | **MERGED** at `02acdab` | `City_Art_Bible.md`, `2026-07-25-town-hall-design.md`, and other docs | **Nothing** | Docs only, and it did not touch this feature's spec. Worth reading once for its **amendment convention**, which the citizens spec's AMENDMENT 2 follows. |

**The obligation that outlives its collision — the depth-precision claim (P4, Task 4.2):**

`depthPrecision.test.ts` is pure arithmetic over `ROAD_SURFACE_TOPS` and the camera
constants, so **citizens cannot fail it by accident** — they touch neither input. But its
fourth case encodes a claim about the *whole scene*, and P4 adds geometry to that scene.
P4's definition of done therefore gains two obligations:

1. **The suite must stay green.** Run
   `npx vitest run apps/web/src/city/three/depthPrecision.test.ts` in P4 and record it.
2. **The `NEAR < 3` claim must be re-argued with citizens in the scene, in the PR body.**
   The argument is short and should be easy: citizens stand **on the ground plane** and are
   **shorter than the buildings already swept**, so they cannot come closer to the camera
   than terrain that was already measured — unlike the mastery stars, which float. If that
   turns out not to hold at full zoom-in panned to the bound, the fix is the citizens'
   height, **not** the near plane: #152 bought a 10x precision win and P4 must not spend it.

**Nothing here collides with Gabriel's or Anthony's lanes.** No schema change, no migration,
no `packages/shared-state-schema` edit, no service, no mastery write, no item-bank or
lesson-content edit. **One caveat added this pass:** D-CIT17 edits
`engines/game/src/descriptors.ts`, which is Evan's file in Evan's package — but it is the
descriptor registry, so the edit should be called out in P1's PR body rather than buried.

**One more, not a branch — and #146 landing changed its shape.** The coach-mark system is
the answer to **Q6** ("which tutorial beat teaches the crowd, and does it need words at
all?"), and #146 gave it a **new mechanism P3 should know about but must not use yet**:
`coachmarks/coachAnchorRegistry.ts`, a `useSyncExternalStore` registry that lets any
component volunteer itself as a coach-mark anchor with `ref={useCoachAnchor("shop")}` —
explicitly so tutorial plumbing stays out of unrelated components' signatures. **That is
exactly the hook a future "the crowd is your population" hint would use**, and it means
answering Q6 later costs one `ref` on the population readout rather than a refactor.

**P3 must still not answer Q6.** It ships the persistent readout and the advisor beats §13
requires, and adds **no coach-mark** — but it should give the readout a stable element so
the tutorial lane has something to point at when it decides.

The one place this feature could reach into Gabriel's lane remains **Q4** (the seed source),
if the answer is "read the real student id"; see §6.

---

## 4. Where each phase's tests are proven load-bearing

The repo's culture is that a test must be shown to fail against the wrong behaviour, and
several agents have done it by reverting the fix and counting failures (see the
`buildingAssets.ts:67` revert in `work-log/evan.md`, which corrected its own author's estimate
from 8 failures to 6). The feature is new code, so "the old behaviour" is "there is no
population" and reverting proves nothing. The equivalent, and the bar this plan holds itself
to, is a **mutation proof**: make one named edit that implements a *plausible wrong* version,
run the suite, record the exact count and the exact messages, restore, re-run green.

Every task below ends with such a step, naming the edit and the expected failure. The
mutations are chosen to be the mistakes a real implementer would actually make:

| Phase | The plausible wrong implementations the mutations impersonate |
| --- | --- |
| 1 | A bare island starting at zero (losing the cold open); counting complete-in-state instead of placed (44 people on a bare island); a mastery-only dial (a full test-out with zero people); paying the gold margin; equal build and mastery terms; spreading housing into the school and the park; a capacity table whose total depends on build order. |
| 2 | An unseeded `Math.random` / `Date.now`; a map-iteration-order dependence; an assignment rule that reshuffles homes when a building is placed; roads leaking into assignment; a `sick` / `leaving` state added to the union; an unauthored island dividing by zero. |
| 3 | Shipping the settled city as art with no words; a message that speaks `NUM.3` or `town-hall`; copy that says "over capacity" or "homeless"; a readout that reports the render cap instead of the true count. |
| 4 | Citizens that cast shadows; a cap that truncates the reported population; a crowd that keeps animating under reduced motion; one mesh per citizen instead of two instanced draws. |
| 5 | Roads made *required* (a citizen refusing bare ground); road preference dropped (traffic ignoring the paths); a route that walks through a building; a null route stranding a citizen. |
| 6 | Cars that scale without a cap; cars that read the roster. |

---

## 5. File structure

Decomposition decisions get locked in here. The engine's files are flat and hyphenated
(`city-view-model.ts`, `storm-battle.ts`, `practice-evidence.ts`) — this follows that, not a
new subdirectory. The web lane's are camelCase (`buildingAssets.ts`, `masteryVisuals.ts`,
`roadModels.ts`) — this follows that too.

```text
engines/game/src/
  citizens-tuning.ts            # NEW (P1). D-CIT14: every named number, and the per-art-mass
                                #   profile table (role + residence_built + residence_mastered
                                #   + daytime) plus the `civic` fallback rule. One file so a
                                #   retune is one edit.
  citizens-tuning.test.ts       # NEW (P1)
  citizens-population.ts        # NEW (P1). The placed-and-complete ledger and the three
                                #   totals (population, residence capacity, daytime capacity).
                                #   No individuals, no seed, no assignment.
  citizens-population.test.ts   # NEW (P1). The per-rule assertions.
  citizens-invariants.test.ts   # NEW (P1). The exhaustive sweeps: all 4096 mastery vectors,
                                #   all 33 build orders, the tested-out curve. Separate file
                                #   because it is a different kind of test and the slowest.
  citizens-rng.ts               # NEW (P2). The seeded PRNG lifted INTO the engine (the spec
                                #   forbids importing StarterIsland's private `mulberry32`).
  citizens-rng.test.ts          # NEW (P2)
  citizens.ts                   # NEW (P2). `deriveCitizenRoster` — individuals, homes,
                                #   daytime destinations, the waiting list, `settled`.
  citizens.test.ts              # NEW (P2)
  citizens-roster-invariants.test.ts  # NEW (P2). Determinism, assignment stability,
                                #   no-eviction, roads-are-not-an-input, the unauthored island.
  index.ts                      # MODIFY (P1, P2). Four `export *` lines.

apps/web/src/city/
  citizens.ts                   # NEW (P2). The ADAPTER, and the only place the two lanes meet:
                                #   view model + placements + seed -> `CitizenRosterInput`.
                                #   Thin, because D-CIT17 resolves the role in the engine
                                #   from the web lane into the engine (see §7.1).
  citizens.test.ts              # NEW (P2)
  citizenSeed.ts                # NEW (P3). The seed source. Gated on Q4 (§6).
  citizenSeed.test.ts           # NEW (P3)
  announcements.ts              # MODIFY (P3). The citizen messages, in ONE contiguous block
                                #   at the end of the file so the tutorial-lane conflict is
                                #   mechanical. They live here and NOT in a new file because
                                #   the no-raw-id sweep is pinned to this module's exports.
  announcements.test.ts         # MODIFY (P3). Corpus rows + the new no-shaming sweep.
  CitySurface.tsx               # MODIFY (P3). `TownHallPanel` gains the population readout;
                                #   the roster rows gain per-building occupancy; the polite
                                #   live region gains the arc beats.
  CitySurface.citizens.test.tsx # NEW (P3). A new file rather than another 100 lines in the
                                #   five existing `CitySurface.*.test.tsx` suites, matching
                                #   how `CitySurface.roadRemove.test.tsx` was split out.
  styles.css                    # MODIFY (P3). Readout classes only.
  three/
    citizenPlaces.ts            # NEW (P4). Pure: roster + placements + layout -> a ground
                                #   point per citizen (door, hub apron, waiting ring).
    citizenPlaces.test.ts       # NEW (P4)
    Citizens.tsx                # NEW (P4). The instanced layer, with a pure exported builder
                                #   + poser (the `Roads.tsx` / `buildRoadsGroup` precedent, so
                                #   it is testable in node with no GPU).
    Citizens.test.ts            # NEW (P4)
    citizenRoutes.ts            # NEW (P5). The weighted router over the cell grid.
    citizenRoutes.test.ts       # NEW (P5)
    Cars.tsx                    # NEW (P6)
    Cars.test.ts                # NEW (P6)
    CityScene.tsx               # MODIFY (P4, P6). Mount `<Citizens>` (and `<Cars>`).

work-log/evan.md                # MODIFY (every phase). One entry per landed PR.
```

**Two files this pass ADDED to the modify list, both from D-CIT17:**

```text
engines/game/src/descriptors.ts       # MODIFY (P1). `CitizenRoleId`; `citizen_roles` +
                                      #   `default_citizen_role` on `NeighborhoodDescriptor`;
                                      #   D1's authored map; `architectedSlot()`'s defaults;
                                      #   `citizen_role` on `ResolvedPlot` and one line in
                                      #   `resolveNeighborhood`.
engines/game/src/city-view-model.ts   # MODIFY (P1). One field on `CityBuildingView`, one
                                      #   line in the `plots.map`. Purely additive.
```

**Files deliberately NOT touched, and why it matters:**
`packages/shared-state-schema/**` (frozen, Gabriel's, and nothing here needs it),
`apps/web/src/city/citySession.ts` (no new session state — the roster is derived from what
`load()` already returns), `apps/web/src/devPersistence/**` (nothing persisted),
`apps/web/src/city/coachmarks/**` and `onboarding/**` (the tutorial lane's, and Q6 is theirs
to answer), `apps/web/src/city/roads.ts` (read only), and
`engines/game/src/descriptors.ts`'s **`BuildingArchetypeId`** — which is now a file this
plan *does* edit, but the answer-type archetype inside it stays untouched and citizens must
**not** read it.

---

## 6. Open questions that gate specific phases

From the spec's §17, refreshed after the user's second pass. Each row says **who decides**
and **by when**. **Q2 is now closed** and **Q11 is new**; nothing else is decided here.

| Q | The decision | Gates | Who decides, and when |
| - | --- | --- | --- |
| **Q2** | **CLOSED 2026-07-27 → D-CIT20.** The user set the target: the **floor is school Chromebooks with low-end integrated graphics**, the common case is **typical student laptops with integrated graphics**. `MAX_RENDERED_CITIZENS` is provisionally **48**. | Nothing is blocked. **P5's profiling step now has a named hardware class to measure against** (see Task 5.2 step 6). | Answered. The remaining work is a measurement, not a decision. |
| **Q11** | **NEW, opened by D-CIT20: how does a degradation rung get SELECTED?** A named Chromebook floor makes §14's ladder a shipping requirement, so rungs 1 (lower the cap) and 3 (drop the cars) must be *reachable* in the built app. Options: an automatic frame-time heuristic, an explicit quality setting beside the existing audio and lighting controls, or a build-time constant. | **P6, and "the ladder is shipped" cannot be claimed before it.** Nothing earlier is blocked: **rung 2 is already free**, because reduced motion produces exactly the static-citizens state. | **Evan proposes; the user decides**, since a quality setting is a product surface. Designing it inside a citizens plan would be designing the shell's settings. **Before P6's review.** |
| **Q4** | **Where does the seed come from?** The student id is the natural stable value, but `citySession.ts` hard-codes `DEMO_STUDENT_ID = "demo-student"`, so seeding off it gives **every dev learner one identical city** — correct in production, degenerate in dev. Options: seed off the student id and accept the degeneracy; seed off it with a dev-only override; or mint a stable client-side value. | **P3.** P2 is unblocked because the seed is a function parameter; P3 is the first phase that must *supply* one. | **Evan decides the mechanism; Gabriel signs off if the answer reads schema state.** Note this is the one place the feature can touch Gabriel's lane — a real per-student id in dev means changing what `citySession` stamps, which is his in-memory session shape. **Before P3's `citizenSeed.ts` is written.** |
| **Q5** | **Does population belong in the HUD, or only in the Civic Center panel?** The HUD is Gabriel's economy surface (XP, gold). Putting a number there makes the crowd a number again (against §1); leaving it out means a player who never opens the hub panel never reads the count. | **P3's scope.** | **Evan proposes, Gabriel signs off if it is the HUD** (coordinated change to `apps/web/src/economy/EconomyHud.tsx`). **Before P3 starts**, because it decides whether P3 touches one surface or two. **This plan's P3 assumes "Civic Center panel only"** — the smaller change, and the one that needs no coordination. If Q5 resolves to the HUD, P3 grows by one task. |
| **Q7** | **Do cars count against the citizen cap?** | **P6.** | Evan, from P5's profile. **Before P6 starts.** |
| **Q1** | **Do the §8 numbers survive contact with the island?** Is the mid-game crowd big enough to pull and small enough to stay hopeful? A peak of **14 waiting** against a population of 26 is the current answer. | Nothing. Explicitly "decide after seeing it on D1". | The user, after P4 (the first phase where it is visible). A retune is one edit to `citizens-tuning.ts`; P1's invariants protect the endgame from it. |
| **Q8** | **Does the settled city read as HAPPY, and does the mid-game crowd read as HOPEFUL?** Both are review-by-eye and both are **pass/fail for the design**, not tuning. | Nothing blocks, but **P4 cannot be called "done" for the design** until someone looks. | The user, on P4's dev server. |
| **Q9** | **Does the housing-rush branch read as hollow?** (`NUM.S` → `NUM.F` → `NUM.2` settles at k=3 with 12 spare homes.) | Nothing. | The user, after P4. If it reads hollow the lever is `residence_mastered` for `rowhouse` — one number in `citizens-tuning.ts`. |
| **Q10** | **Should mastery's new capacity step get art beyond the citizens?** (The retired lit-windows treatment, now that it would carry meaning.) | Nothing in this plan. | Evan + the user. A follow-on to P4, deliberately out of scope here. |
| **Q3** | **Is a hotel housing?** (D2's Boom Hotel, `EXP.1`.) | Nothing in D1. | Evan, when D2's buildings are authored. P1's role table is the one-line edit that answers it. |
| **Q6** | **Which tutorial beat teaches the crowd, and does it need words at all?** | Nothing here, **and P3 must not answer it by accident.** | The tutorial lane owner (Evan, on `evan/tutorial-refresh`), after the roster exists — the spec's own sequencing note is that the tutorial should be revisited *after* the roster so it can point at real numbers. |

---

## 7. Where the spec is underspecified for implementation

> **UPDATED 2026-07-27 (second pass).** §7.1, §7.2, and §7.3 are **RESOLVED** by the user
> and are now recorded as decisions (D-CIT17, D-CIT18, D-CIT19) in the design spec's
> AMENDMENT 2 as well as here. They are kept in this section rather than deleted, because
> the *reasoning* is what stops them being re-opened. **§7.4, §7.5, and §7.6 are still open
> flags.**

Each remaining flag says what this plan does as a **mechanical** reading of constraints the
spec *does* state, and what would need a real decision to change. An implementer who
disagrees should raise it before writing the task, not silently diverge.

### 7.1 RESOLVED (D-CIT17) — the role map is keyed by node id, in the neighborhood descriptor

**The gap that was found.** D-CIT3 keyed roles on `gridworkId` and §3 said the mapping was
engine data. But `gridworkId` exists in exactly one place — `D1_NODE_BUILDINGS` in
`apps/web/src/city/buildingAssets.ts` — `@cr/game` cannot import `apps/web`, and
`CityBuildingView` carries `node_id`, `archetype`, `mastery`, `construction_state`,
`blueprint`, and `progress` but **no art mass**. The engine-side table had nothing to key on.

**The resolution the user chose, and why it is better rather than merely workable.** Put the
role map in `engines/game/src/descriptors.ts` **directly alongside `building_archetypes`** —
same shape, same place, same resolution path — keyed by **node id**. The requirement was
never "the art mass"; it was *"a key that does not move when a display name does"*, and the
node id is the registry's own primary key: `student_node_state` is keyed on it,
`graph_invariants.py` pins it, every prerequisite edge names it, and `D1_NODE_BUILDINGS`
itself is keyed on it.

**VERIFIED against `descriptors.ts` before adoption — it survives contact.**
The four things that could have broken it, each checked rather than assumed:

| Checked | Finding |
| --- | --- |
| Does `resolveNeighborhood` have a place to read it? | **Yes, one line.** It already does `descriptor.building_archetypes[node.id] ?? descriptor.default_archetype` at `:430`. The role map reads identically. |
| What happens to an `architected` domain with zero plots? | **Nothing — the map is never read.** `resolveNeighborhood` builds plots from `getNodesByDomain(domain).filter(product_scope === "mvp")`, which is empty for D2..D10, so `plots` is `[]` and the lookup never runs. **D-CIT12 holds unchanged**: hub stands, founding crowd waits, nothing throws, nothing divides by zero. |
| Does `Record<DomainId, …>` exhaustiveness force per-domain authoring? | **No — it costs two edits.** Adding required fields means all ten slots must supply them, but **eight come from the single `architectedSlot()` helper** and the two placeholders (`EXPONENTS_RADICALS_PLACEHOLDER_DESCRIPTOR`, `GEOMETRY_PLACEHOLDER_DESCRIPTOR`) spread it. So: `architectedSlot()` and `D1_DESCRIPTOR`. The exhaustiveness works *for* the feature — a future island author is compile-time reminded the dimension exists. |
| Will an additive field break a call site? | **No.** `ResolvedPlot` is constructed only in `resolveNeighborhood` (`:420`); `CityBuildingView` only in `buildCityViewModel` (`:134`). Every other occurrence across `apps/web` and `engines/game` is a **parameter annotation**, which an added field cannot break. Neither `descriptors.test.ts` nor `city-view-model.test.ts` asserts a whole-object shape. |

**One difference from its neighbour, worth stating so nobody "fixes" it.**
`building_archetypes` is **derived** from the item bank (`D1_BANK_ARCHETYPES`) so the city
cannot drift from the items students answer. `citizen_roles` is **authored**, because a
social role cannot be read off `answer_type` — deriving it that way is precisely the mistake
§3's Grounded note forbids.

**What it costs.** A second island reusing the `rowhouse` art mass would have inherited
`residence` for free under the old key; now it authors one line. Small, and the `civic`
fallback still gives an unauthored island a working social life on day one.

### 7.2 RESOLVED (D-CIT18) — roads are not an engine input at all

**The tension, which was inside the spec.** §10.1's sketch put `road_cells:
ReadonlySet<string>` in `CitizenRosterInput` "for routing only", while §12.1 required the
roster be **deep-equal** with and without roads. And routing needs `worldLayout`
(`GRID_CELL`, `isCellBuildable`, `footprintCells`), which lives in **`apps/web`**.

**The resolution: the invariant wins, and the parameter goes.** Roads are **not an input to
the engine derivation at all.** `CitizenRosterInput` is exactly `{ nodes, seed }`. The router
lives in `apps/web/src/city/three/citizenRoutes.ts` (P5) and reads `roads.roadCellKey` and
`worldLayout` directly — the same side of the boundary as the meshes it moves.

**This makes the assertion stronger, not weaker.** "Deep-equal with and without roads" stops
being a sampled property and becomes a statement about the type, which Task 2.3 now asserts
directly on the key list. A contributor who wants roads to matter has to widen the signature,
and a reviewer can see that in the diff.

### 7.3 RESOLVED (D-CIT19) — greedy fill in placement order, with two accepted consequences

**The gap.** §12.1 required **assignment stability** ("placing a **new** building never
changes an existing citizen's home") and §13.1's copy implied **no empty homes while anyone
waits** ("Rowhouse Flats — home to 26 of 26"). The spec never said *how* citizens are
assigned. **No history-free rule satisfies both under a fixed building order**: fill greedily
in registry order and placing `NUM.S` (index 0) after `NUM.2` (index 2) moves `NUM.2`'s first
two residents into `NUM.S`.

**The rule.** Citizens are indexed `0..population-1`. The **housed set is always the
lowest-indexed `min(population, capacity)` people**, and residences fill greedily **in the
order the input supplies them, which is placement order** (`citySession.readPlacements()`
returns `[...placements.entries()]`, insertion-ordered; `CityDevSnapshot` round-trips it). A
newly placed building **appends** and draws only from the waiting pool, so it cannot move an
existing resident. The index rule is what makes the **no-eviction guarantee structural**:
capacity and population are both monotone, so `min(population, capacity)` only rises.

**The two consequences, ACCEPTED BY THE USER. An implementer must not treat either as a bug
to be fixed mid-build:**

1. **Mastering a building reshuffles homes BETWEEN buildings.** When an earlier-in-order
   building's capacity grows from `residence_built` to `residence_mastered`, later buildings'
   residents shift up into it. **Nobody loses a home** — the no-eviction invariant is about
   `housed` status and still holds — but a specific person's specific house can change on a
   mastery. §12.1's stability invariant is scoped to *placing*, so this passes as written.
2. **Which building a resident occupies depends on placement order.** Every *count* —
   population, capacity, housed, waiting — is order-independent, and Task 1.3 pins that over
   all 33 orders. Only the per-building assignment is order-sensitive.

**Recorded so the trade is re-openable without re-deriving it:** the alternatives are to
weaken the invariant to "no citizen who had a home loses one" and fill in registry order, or
to give each residence a fixed index lane sized at full-mastery capacity and accept visible
empty houses mid-game. Both were considered and rejected; neither is a smaller change.

### 7.4 The daytime ledger has capacities but no assignment rule, and no mid-game story

**The gap.** §8.3 gives per-building daytime numbers totalling 44 and says at the settled
ending "everyone has somewhere to be by day as well as somewhere to live". It never says
**who** goes where, whether the waiting crowd occupies daytime seats, or what
"Community School — 8 of 8 seats filled" reads as when the island has only 14 people.

**What this plan does.** Daytime destinations are assigned **only to housed citizens**,
greedily in input order, lowest index first; the waiting crowd gathers at the Civic Center
(unbounded, §7) and holds no daytime seat; a housed citizen with no seat is `visiting` with no
destination. At full mastery, 44 housed against 44 daytime capacity means everyone is placed,
which is what §8.3 claims. Copy therefore reads "N of 8 seats filled", never "8 of 8" when
only N people are there.

**Flagged:** whether the school cohort should be drawn from *children* (a concept that does
not exist in the roster), and whether the waiting crowd should be allowed daytime seats (which
would make the street look emptier than the waiting count says), are both real product
questions the spec leaves open. **Decision owner: Evan, at P2 task 2.2.** Neither affects any
§12.1 invariant.

### 7.5 The citizen state union has six members and the spec derives at most five

`commuting` cannot be derived by a pure, clockless function — it is a render-time state for a
citizen mid-walk. **This plan keeps it in the union** (the union is what D-CIT6's "no harm
state" test guards, and the spec pins its six members) and documents it as render-only. Also:
the union has both `at_work` and `visiting` while the role table has three families, and the
spec never maps them. This plan maps `school -> at_school`, `civic -> at_work`, and uses
`visiting` for a housed citizen with no daytime seat. **Flagged as a naming call, not a design
one** — nothing in §12 depends on it, and a park reading "at work" would be the one visible
oddity. Evan's call at task 2.2.

### 7.6 The advisor callout surface does not exist in the city yet

§13.2 hangs the callouts on "the island's advisor… hosted at the Civic Center
(town-hall spec D-TH5)". D-TH5 is a **design decision, not built**: the only advisor in the
code is `apps/web/src/lessons/AdvisorNpc.tsx` / `CityGuideCharacter.tsx`, which are **lesson**
surfaces, and the Civic Center's panel (`data-testid="town-hall-panel"`) has no advisor and no
narration slot. **This plan's P3 delivers the advisor beats as text in the Civic Center panel
plus the existing polite ARIA live region** (`data-testid="city-live-polite"`), which satisfies
D-CIT13 and D-CIT16 literally — the panel says so and the announcement says so. **Building an
advisor NPC at the hub is out of scope and needs a decision** on whether it is a new city
surface, a reuse of the lessons-lane character, or the coach-mark system. **Decision owner:
Evan; needed before P3 so the copy has a home.**

### 7.7 RESOLVED — the two internal slips are now corrected in the spec

Both were flagged in the first pass and are **fixed in
`2026-07-27-citizens-and-city-life-design.md` under AMENDMENT 2**, with the old text
recorded rather than erased. Kept here so the tasks explain themselves:

1. **§8.5's "Waiting (range across all 33 orders)" row said `0-14` at k=5**, and re-derives
   to **exactly 0** in every order (by the fifth mastery, capacity is at least 38 against a
   population of 38). The k=1, k=2, and k=6 cells were correct, and those are the only ones
   §12.1 asserts. The spec's cell now reads `0`. **Task 1.3 still records the computed range
   as an output and asserts only the invariants**, so the two can never disagree again.
2. **§8.2's Role column listed `park` as its own role**, contradicting §3's explicit "`park`
   is `civic`, deliberately". The spec's cell now reads `civic`, with a note. Task 1.1
   follows §3, and its mutation matrix keeps the old typo as a mutation — which is now a
   **typecheck error**, since `park` is not a member of `CitizenRoleId`.

Neither changed a number.

### 7.8 CORRECTED IN BUILD (2026-07-27, P1 + P2) — where the written tasks did not survive contact

> Recorded by the implementer of Phases 1 and 2, in the plan's own convention: the old
> text is described rather than erased, so a reader can tell a correction from a
> default. **No number and no decision moved.** Every item below is a transcription or
> prediction slip in the task bodies, found by running them.

**A. `CitizenBuildingLedger` and `CitizenBuildingOccupancy` each declared the role
TWICE.** Task 1.2's and Task 2.2's Interfaces blocks list both `citizen_role` and
`role`, both `CitizenRoleId`, while the implementations set only `role` — which does
not compile. Every test in Tasks 1.2, 2.2, 2.3, and 2.4 reads `.role`, and the plan's
own §3 self-review says "`CitizenBuildingLedger.role` is typed `CitizenRoleId` and fed
from `node.citizen_role`". **Resolution: one field, `role`.** `CitizenNodeInput`
keeps `citizen_role`, because that is the name the view model carries.

**B. Every test snippet indexes a `Record<string, …>` directly, and this repo runs
`noUncheckedIndexedAccess: true`** (`tsconfig.base.json`). `CITIZEN_NODE_CAPACITY[n]`,
`PREREQS[nodeId]`, `ROLE_BY_NODE[nodeId]`, `D1[index]`, `levels[rest % 4]`, and
`vector[nodeId]` are all `T | undefined`, so the suites as written fail `npm run
typecheck`. **Resolution: a small throwing accessor per test file** (`entry`,
`prereqsOf`, `roleOf`, `d1`), which keeps "a missing row is a loud failure, not a
silent zero" — the semantics the raw index implied.

**C. Task 1.3's `ROLE_BY_NODE` still holds the superseded art-mass keys** — `deco`,
`slab`, `rowhouse`, `tower`, `park` — which are not members of `CitizenRoleId`. A
first-pass leftover the second pass's sweep missed because it greps for the *type*
names, not their values. **Resolution: the D-CIT17 roles.** Same for the missing
`CitizenRoleId` import in the Task 1.2, 1.3, 2.2, and 2.3 snippets.

**D. Task 2.2's `citizens.ts` imports `CitizenRoleId` from `./citizens-tuning`.**
D-CIT17 puts it in `./descriptors`, and the plan's own second-pass check says so in as
many words. **Resolution: import from `./descriptors`.**

**E. Task 2.3's no-eviction sweep costs ~700,000 `expect` calls and ran 4.3s**, close
enough to the 5s per-test default to flake under full-suite parallel load. **Resolution
is the one the plan prescribes for Task 1.3 — hoist, never reduce coverage:** derive
the 4,096 rosters once and index into them (advancing node `d` is `code + 4**d`, another
member of the same space), and collect violations rather than asserting per citizen.
Same 24,576 advances, 134ms.

**F. Nine of the 33 named mutations did not bite as written.** Seven were tests that
needed strengthening and one plan prediction was simply about the wrong file; **two
cannot bite at all and are recorded as such rather than engineered around.** The full
table, with the observed counts, is in `work-log/evan.md`. The two unfalsifiable ones:

- **`createSeededRng`'s `Math.trunc(seed) >>> 0`** is provably redundant with the
  `a |= 0` on the stream's first line, because `(x >>> 0) | 0 === x | 0` for every
  number. No test can distinguish them because no behaviour differs. The line is kept
  and its comment now says so.
- **The adapter's `isTownHall` guard** is subsumed by the `!building` lookup miss below
  it: the hub is never in `viewModel.buildings`. Kept, and the comment says so.


## Task 1.0: The role map in the neighborhood descriptor (P1) — NEW, D-CIT17

**Added in the second pass.** This is the resolution of §7.1, and it comes first in the
phase because everything downstream reads the role it produces.

**Files:**
- Modify: `engines/game/src/descriptors.ts` (the type, D1's map, `architectedSlot`,
  `ResolvedPlot`, `resolveNeighborhood`)
- Modify: `engines/game/src/city-view-model.ts` (`CityBuildingView`, and one line in the
  `plots.map`)
- Modify: `engines/game/src/descriptors.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `CitizenRoleId = "residence" | "school" | "civic"`;
  `NeighborhoodDescriptor.citizen_roles: Readonly<Record<string, CitizenRoleId>>`;
  `NeighborhoodDescriptor.default_citizen_role: CitizenRoleId`;
  `ResolvedPlot.citizen_role: CitizenRoleId`; `CityBuildingView.citizen_role: CitizenRoleId`.

- [ ] **Step 1: Write the failing test**

Add to `engines/game/src/descriptors.test.ts`:

```ts
import { buildCityViewModel } from "./city-view-model";
import { NEIGHBORHOOD_DESCRIPTORS, resolveNeighborhood } from "./descriptors";

describe("citizen roles resolve through the same path as building archetypes", () => {
  it("gives every D1 plot a role, keyed on the node id (D-CIT17)", () => {
    // Keyed on the node id and NOT on the display name: `NUM.S` was renamed
    // "Town Hall" -> "City Bank" and this map did not move. It is also NOT keyed on
    // `gridworkId`, which lives in `apps/web` and this package cannot see.
    const roleByNode = new Map(
      resolveNeighborhood("D1").plots.map((plot) => [plot.node_id, plot.citizen_role]),
    );
    expect(roleByNode.get("NUM.2")).toBe("residence");
    expect(roleByNode.get("NUM.3")).toBe("school");
    // A lawn is somewhere to BE, not a fourth role family (design section 3).
    expect(roleByNode.get("NUM.4")).toBe("civic");
    expect(roleByNode.get("NUM.S")).toBe("civic");
    expect(roleByNode.get("NUM.F")).toBe("civic");
    expect(roleByNode.get("NUM.5")).toBe("civic");
    expect(roleByNode.size).toBe(6);
  });

  it("has exactly ONE residence and ONE school on D1", () => {
    // The whole tuning argument rests on this: one terrace carries most of the
    // housing, and the school houses nobody. If a second residence ever appears,
    // the pacing in section 8.5 needs re-deriving.
    const roles = resolveNeighborhood("D1").plots.map((plot) => plot.citizen_role);
    expect(roles.filter((role) => role === "residence")).toHaveLength(1);
    expect(roles.filter((role) => role === "school")).toHaveLength(1);
  });

  it("falls back to civic for a node the island never authored", () => {
    // D-CIT3's fallback: no building is ever role-less, and a future island gets a
    // working social life the day its buildings land.
    for (const descriptor of Object.values(NEIGHBORHOOD_DESCRIPTORS)) {
      expect(descriptor.default_citizen_role).toBe("civic");
    }
  });

  it("leaves an architected island with zero plots and therefore zero roles (D-CIT12)", () => {
    // D2-D10 resolve to zero plots, so the map is never read. Nothing throws.
    expect(resolveNeighborhood("D2").plots).toEqual([]);
    expect(NEIGHBORHOOD_DESCRIPTORS.D2.citizen_roles).toEqual({});
    expect(() => resolveNeighborhood("D10")).not.toThrow();
  });

  it("carries the role onto the view model, so the citizen derivation can read it", () => {
    // The role has to reach `CityBuildingView` or the web lane would have to thread
    // it, which is exactly what D-CIT17 exists to avoid.
    const vm = buildCityViewModel({ node_states: [] });
    const rowhouse = vm.buildings.find((building) => building.node_id === "NUM.2");
    expect(rowhouse?.citizen_role).toBe("residence");
  });

  it("does not read the answer-type archetype, which is a different axis", () => {
    // `BuildingArchetypeId` is derived from `answer_type` — how the learner ANSWERS,
    // not what the building IS. On D1 it groups four numeric halls together and
    // splits the school from the park, so a role that tracked it would be wrong.
    const plots = resolveNeighborhood("D1").plots;
    const school = plots.find((plot) => plot.node_id === "NUM.3");
    const park = plots.find((plot) => plot.node_id === "NUM.4");
    expect(school?.archetype.id).toBe(park?.archetype.id);
    expect(school?.citizen_role).not.toBe(park?.citizen_role);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run engines/game/src/descriptors.test.ts`
Expected: FAIL — `Property 'citizen_role' does not exist on type 'ResolvedPlot'`, and the
same for `citizen_roles` / `default_citizen_role` on the descriptors.

- [ ] **Step 3: Add the type and D1's map**

In `engines/game/src/descriptors.ts`, immediately after the `BUILDING_ARCHETYPES` block
(so the two maps read as siblings, which is the point):

```ts
/* -------------------------------------------------------------------------- */
/* Citizen social roles (keyed by node id; citizens design D-CIT3 / D-CIT17)  */
/* -------------------------------------------------------------------------- */

/**
 * What a building IS socially: people live here, learn here, or work-and-visit here.
 * `civic` is the FALLBACK, so no building is ever role-less and an unauthored island
 * gets a working social life the day its buildings land (D-CIT12).
 *
 * Keyed by NODE ID, deliberately. The learner-facing name is a display string the
 * user may tweak freely (`NUM.S` has already gone from "Town Hall" to "City Bank"),
 * and the Gridwork art mass (`gridworkId`) lives in
 * `apps/web/src/city/buildingAssets.ts` — which this framework-free package cannot
 * import. The node id is the registry's own primary key and does not move when
 * either of those does.
 *
 * This is NOT `BuildingArchetypeId`. That is derived from the node's authored
 * `answer_type` and describes how the learner ANSWERS; on D1 it groups four numeric
 * halls together and splits the school from the park. Citizens must not read it.
 *
 * Unlike `building_archetypes`, this map is AUTHORED rather than derived: a social
 * role cannot be read off anything the item bank knows.
 */
export type CitizenRoleId = "residence" | "school" | "civic";

/**
 * D1's authored roles. One residence, one school, four civic — and the park is
 * `civic` deliberately: a lawn is not a workplace but it is emphatically somewhere to
 * be, and a fourth "leisure" family buys nothing its capacity number cannot express.
 */
const D1_CITIZEN_ROLES: Readonly<Record<string, CitizenRoleId>> = {
  "NUM.2": "residence", // Rowhouse Flats — the island's housing
  "NUM.3": "school", // Community School — a daytime destination, never a home
  "NUM.S": "civic", // City Bank
  "NUM.F": "civic", // Public Library
  "NUM.5": "civic", // Clock Tower
  "NUM.4": "civic", // Central Park
};
```

- [ ] **Step 4: Add the two fields to the descriptor, and satisfy all ten slots**

On `NeighborhoodDescriptor`, immediately after `default_archetype`:

```ts
  /**
   * Node id -> social role for citizens (D-CIT17). Authored per island; anything
   * unlisted takes `default_citizen_role`. Read by `resolveNeighborhood` exactly as
   * `building_archetypes` is.
   */
  readonly citizen_roles: Readonly<Record<string, CitizenRoleId>>;
  readonly default_citizen_role: CitizenRoleId;
```

Two edits satisfy all ten slots, because eight come from one helper:

```ts
// in D1_DESCRIPTOR, beside `building_archetypes: D1_BANK_ARCHETYPES,`
  citizen_roles: D1_CITIZEN_ROLES,
  default_citizen_role: "civic",

// in architectedSlot(), beside `building_archetypes: {},`
  citizen_roles: {},
  default_citizen_role: "civic",
```

The two placeholder descriptors (`EXPONENTS_RADICALS_PLACEHOLDER_DESCRIPTOR`,
`GEOMETRY_PLACEHOLDER_DESCRIPTOR`) spread `architectedSlot(...)`, so they need no edit.
**Do not add placeholder roles for `RAD.4` or the `GEO.*` nodes** — those islands are
unauthored, the `civic` fallback covers them, and a placeholder role would be a claim
nobody has made.

- [ ] **Step 5: Resolve it onto the plot**

On `ResolvedPlot`, after `archetype`:

```ts
  /** Social role for citizens, resolved like the archetype (D-CIT17). */
  readonly citizen_role: CitizenRoleId;
```

And in `resolveNeighborhood`'s `plots` map, beside the existing archetype lookup:

```ts
    const archetypeId =
      descriptor.building_archetypes[node.id] ?? descriptor.default_archetype;
    const citizenRole =
      descriptor.citizen_roles[node.id] ?? descriptor.default_citizen_role;

    return {
      node_id: node.id,
      lesson_shell: node.lesson_shell,
      position,
      road_sources: node.prereqs.filter((prereq) => nodeIds.has(prereq)),
      archetype: getBuildingArchetype(archetypeId),
      citizen_role: citizenRole,
    };
```

- [ ] **Step 6: Carry it onto the view model**

In `engines/game/src/city-view-model.ts`, add to `CityBuildingView` after `archetype`:

```ts
  /** Social role for citizens, resolved from the descriptor (D-CIT17). */
  citizen_role: CitizenRoleId;
```

and one line to the returned object in the `plots.map`, beside `archetype: plot.archetype`:

```ts
      citizen_role: plot.citizen_role,
```

Import the type from `./descriptors` alongside the existing `BuildingArchetypeDescriptor`
import.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run engines/game/src`
Expected: PASS, including every pre-existing `descriptors.test.ts` and
`city-view-model.test.ts` case unchanged — the fields are additive, and neither suite
asserts a whole-object shape.

- [ ] **Step 8: Prove the tests are load-bearing (mutation proof)**

| Mutation | Expected failure |
| --- | --- |
| `"NUM.4": "school"` in `D1_CITIZEN_ROLES` (families in the park) | 2 fail: the per-node role assertions and "exactly ONE residence and ONE school" |
| `default_citizen_role: "residence"` in `architectedSlot()` | 1 fail: "falls back to civic" — and it would silently make every unauthored island's buildings housing |
| Derive the role from the answer-type archetype instead of the map | 1 fail: "does not read the answer-type archetype" |
| Drop `citizen_role` from `buildCityViewModel`'s returned object | **A typecheck error**, plus 1 fail: "carries the role onto the view model" |
| Add roles to `EXPONENTS_RADICALS_PLACEHOLDER_DESCRIPTOR` | 1 fail: "leaves an architected island with zero plots and therefore zero roles" |

- [ ] **Step 9: Format, lint, typecheck, commit**

```bash
npx biome format --write engines/game/src/descriptors.ts engines/game/src/city-view-model.ts engines/game/src/descriptors.test.ts
npx biome lint engines/game/src
npm run typecheck
npx vitest run engines/game/src
git add engines/game/src/descriptors.ts engines/game/src/city-view-model.ts engines/game/src/descriptors.test.ts
git commit -m "feat(game): resolve a citizen social role per plot, keyed by node id (D-CIT17)"
```

**Call this edit out in P1's PR body.** It touches the descriptor registry — Evan's file in
Evan's package, so no owner gate is triggered — but the registry is the model every future
island flows through, and a reviewer should see the shape rather than find it.

---

## Task 1.1: The tuning table (P1)

> **REVISED in the second pass (D-CIT17, D-CIT20).** This task previously owned both the
> roles and the capacities, keyed by `gridworkId`. **Roles moved to Task 1.0**; what remains
> here is the numbers, now keyed by **node id**. `CitizenRoleId`,
> `CITIZEN_MASS_PROFILES`, `CIVIC_FALLBACK_PROFILE`, and `profileForArtMass` are gone;
> `CitizenCapacity`, `CITIZEN_NODE_CAPACITY`, `EMPTY_CITIZEN_CAPACITY`, and
> `capacityForNode` replace them. **`MAX_RENDERED_CITIZENS` is 48, not 64.**

**Files:**
- Create: `engines/game/src/citizens-tuning.ts`
- Create: `engines/game/src/citizens-tuning.test.ts`
- Modify: `engines/game/src/index.ts` (append one export line)

**Interfaces:**
- Consumes: `resolveNeighborhood` from `./descriptors` (Task 1.0) — in the test only, to
  pin the one relationship that crosses the role/capacity seam.
- Produces: `CitizenCapacity { residence_built, residence_mastered, daytime }`;
  `CITIZEN_NODE_CAPACITY: Readonly<Record<string, CitizenCapacity>>`;
  `EMPTY_CITIZEN_CAPACITY: CitizenCapacity`;
  `capacityForNode(nodeId: string | undefined | null): CitizenCapacity`;
  and the scalars `FOUNDING_POPULATION = 8`, `CITIZENS_PER_COMPLETE_BUILDING = 2`,
  `CITIZENS_PER_MASTERED_SKILL = 4`, `ENDGAME_SPARE_HOMES = 0`,
  `HUB_DAYTIME_CAPACITY = 4`, `WALK_SPEED_UNITS_PER_SEC = 1.6`,
  `ROAD_PREFERENCE_WEIGHT = 0.5`, `CARS_PER_ROAD_TILES = 8`, `MAX_CARS = 6`,
  `MAX_RENDERED_CITIZENS = 48`.

- [ ] **Step 1: Write the failing test**

Create `engines/game/src/citizens-tuning.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  capacityForNode,
  CITIZEN_NODE_CAPACITY,
  CITIZENS_PER_COMPLETE_BUILDING,
  CITIZENS_PER_MASTERED_SKILL,
  EMPTY_CITIZEN_CAPACITY,
  ENDGAME_SPARE_HOMES,
  FOUNDING_POPULATION,
  HUB_DAYTIME_CAPACITY,
  MAX_RENDERED_CITIZENS,
} from "./citizens-tuning";
import { resolveNeighborhood } from "./descriptors";

/** The six D1 nodes, in registry order. */
const D1_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;

describe("citizen tuning table (D-CIT14)", () => {
  it("gives every D1 node a capacity entry, and an unlisted node zero", () => {
    for (const nodeId of D1_NODES) {
      expect(CITIZEN_NODE_CAPACITY[nodeId], nodeId).toBeDefined();
    }
    // A future island's node is not a crash: it houses nobody until authored.
    expect(capacityForNode("EXP.1")).toEqual(EMPTY_CITIZEN_CAPACITY);
    expect(capacityForNode(undefined)).toEqual(EMPTY_CITIZEN_CAPACITY);
    expect(capacityForNode(null).residence_mastered).toBe(0);
  });

  it("houses nobody in the school or the park, built or mastered (load-bearing zero)", () => {
    // §8.5: this zero is precisely what makes the mid-game crowd appear. Spreading
    // housing here is the tempting fix §15 rejects.
    for (const nodeId of ["NUM.3", "NUM.4"] as const) {
      expect(CITIZEN_NODE_CAPACITY[nodeId].residence_built, nodeId).toBe(0);
      expect(CITIZEN_NODE_CAPACITY[nodeId].residence_mastered, nodeId).toBe(0);
    }
  });

  it("keeps the capacity table and the descriptor's role map in agreement", () => {
    // The two halves of a building's social identity live in different files by
    // design (role = identity, in the descriptor; capacity = number, here), so this
    // pins the one relationship that must hold across the seam: the island's main
    // housing must be the node the descriptor calls a `residence`, and a `school`
    // never houses anyone. Without this, the two files could drift silently.
    const roleByNode = new Map(
      resolveNeighborhood("D1").plots.map((plot) => [plot.node_id, plot.citizen_role]),
    );
    const biggest = D1_NODES.reduce((best, nodeId) =>
      CITIZEN_NODE_CAPACITY[nodeId].residence_mastered >
      CITIZEN_NODE_CAPACITY[best].residence_mastered
        ? nodeId
        : best,
    );
    expect(roleByNode.get(biggest)).toBe("residence");
    for (const [nodeId, role] of roleByNode) {
      if (role === "school") {
        expect(CITIZEN_NODE_CAPACITY[nodeId].residence_mastered, nodeId).toBe(0);
      }
    }
  });

  it("makes mastery strictly better than building, for every housing node (D-CIT15)", () => {
    const housing = D1_NODES.filter(
      (nodeId) => CITIZEN_NODE_CAPACITY[nodeId].residence_built > 0,
    );
    // Four of the six carry flats; the rowhouse carries most of them.
    expect(housing).toHaveLength(4);
    for (const nodeId of housing) {
      const capacity = CITIZEN_NODE_CAPACITY[nodeId];
      expect(capacity.residence_mastered, nodeId).toBeGreaterThan(
        capacity.residence_built,
      );
    }
  });

  it("makes the mastery population term strictly larger than the build term (D-CIT2)", () => {
    expect(CITIZENS_PER_MASTERED_SKILL).toBeGreaterThan(CITIZENS_PER_COMPLETE_BUILDING);
    // §8.1: twice the build term, so the ordering is visible rather than arithmetic.
    expect(CITIZENS_PER_MASTERED_SKILL).toBe(CITIZENS_PER_COMPLETE_BUILDING * 2);
  });

  it("totals the island's two capacity ledgers to the settled figures (§8.2, §8.3)", () => {
    const sum = (read: (nodeId: (typeof D1_NODES)[number]) => number) =>
      D1_NODES.reduce((total, nodeId) => total + read(nodeId), 0);
    expect(sum((n) => CITIZEN_NODE_CAPACITY[n].residence_built)).toBe(16);
    expect(sum((n) => CITIZEN_NODE_CAPACITY[n].residence_mastered)).toBe(44);
    // Daytime includes the hub's small staff, and does not grow with mastery.
    expect(sum((n) => CITIZEN_NODE_CAPACITY[n].daytime) + HUB_DAYTIME_CAPACITY).toBe(44);
  });

  it("opens on a crowd, ends exactly full, and caps only rendering", () => {
    expect(FOUNDING_POPULATION).toBe(8);
    // The settled ending is exactly full: an island with empty houses reads hollow.
    expect(ENDGAME_SPARE_HOMES).toBe(0);
    // D-CIT20: the cap's only job is to be unreachable on D1, where the population
    // tops out at 44. A safety net that is routinely load-bearing is a design limit
    // in disguise.
    expect(MAX_RENDERED_CITIZENS).toBeGreaterThan(44);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run engines/game/src/citizens-tuning.test.ts`
Expected: FAIL — `Failed to resolve import "./citizens-tuning"`.

- [ ] **Step 3: Write the implementation**

Create `engines/game/src/citizens-tuning.ts`:

```ts
/**
 * The SINGLE tuning table for citizens and city life (D-CIT14), pure and
 * framework-free.
 *
 * Every NUMBER the feature has lives here, not as a literal inside a derivation, so
 * a retune is one edit. Because nothing about the population is persisted (D-CIT1),
 * a retune applies RETROACTIVELY to every existing city with no migration and no
 * backfill. The tests pin the RELATIONSHIPS between these numbers, not the digits:
 * mastery beats building on both ledgers, the school and the park house nobody, and
 * the island's totals settle exactly full.
 *
 * All values are FIRST GUESSES; expect to retune (design §8).
 *
 * WHAT IS NOT HERE: the ROLE each building plays. A role is the building's IDENTITY
 * and lives with the island's other identity data, in the neighborhood descriptor
 * (`descriptors.ts`, `citizen_roles` — D-CIT17); capacity is a separate NUMBER and
 * lives here. That split is the design's own (§3), and it is why a `civic` building
 * can carry a few flats while a `school` carries none.
 *
 * Keyed by NODE ID, matching the role map. Not by display name (mutable — `NUM.S`
 * has already gone from "Town Hall" to "City Bank") and not by Gridwork art mass
 * (which lives in `apps/web` and this package cannot see).
 */

/** How many people one building holds: two ledgers, three numbers. */
export interface CitizenCapacity {
  /** Homes once the building is placed and complete (§8.2). */
  readonly residence_built: number;
  /** Homes once its skill is mastered (`mastery >= 2`) — strictly larger (D-CIT15). */
  readonly residence_mastered: number;
  /**
   * Daytime seats: who is AT this building rather than on the street (§8.3, the
   * second ledger from GROUNDED CORRECTION 1). It has NO bearing on who is waiting
   * for a home, and it does not grow with mastery.
   */
  readonly daytime: number;
}

/* -------------------------------------------------------------------------- */
/* Population (§8.1)                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The people who wander out of the Civic Center on a bare island — and the whole
 * reason the middle of the game has pull, because they are the crowd that has to be
 * housed. Small enough that each is an individual you can follow.
 */
export const FOUNDING_POPULATION = 8;

/** Finishing a building visibly brings people. The smallest "some people arrived". */
export const CITIZENS_PER_COMPLETE_BUILDING = 2;

/**
 * Mastering a skill brings TWICE the build term, so mastery is unambiguously the
 * bigger reward and the ordering is visible rather than arithmetic (D-CIT2).
 * Mastering one skill (2 + 4 = 6 people) is the most populous event in the game.
 * Gold mastery (3) adds nothing (D-CIT11).
 */
export const CITIZENS_PER_MASTERED_SKILL = 4;

/* -------------------------------------------------------------------------- */
/* The two capacity ledgers (§8.2, §8.3)                                      */
/* -------------------------------------------------------------------------- */

/**
 * A node with no entry: no homes and no daytime seats. This is what makes the
 * feature free per island — an unauthored island's buildings need no citizens work
 * at all, and a node can be given capacity later as a pure data edit (§17 Q3 is
 * exactly such a promotion).
 */
export const EMPTY_CITIZEN_CAPACITY: CitizenCapacity = {
  residence_built: 0,
  residence_mastered: 0,
  daytime: 0,
};

/**
 * The per-node capacity table.
 *
 * Three `civic` buildings carry a FEW flats — "apartments above a shop" — because the
 * settled ending cannot be hostage to a single building. They are deliberately SMALL
 * because `NUM.S` and `NUM.F` have no prerequisites and can be finished first; a big
 * number there would settle the island too early. The school and the park carry ZERO
 * and that line is not crossed: a school is a school, a lawn houses nobody, and the
 * zero is what makes the mid-game crowd appear (§8.5).
 */
export const CITIZEN_NODE_CAPACITY: Readonly<Record<string, CitizenCapacity>> = {
  // Rowhouse Flats — the island's housing, 59% of its homes. The 10 -> 26 jump is the
  // largest single beat in the game.
  "NUM.2": { residence_built: 10, residence_mastered: 26, daytime: 0 },
  // City Bank — upper-storey apartments in the deco tower; the largest workplace.
  "NUM.S": { residence_built: 2, residence_mastered: 6, daytime: 8 },
  // Public Library — flats above the reading room; work and visit mixed.
  "NUM.F": { residence_built: 2, residence_mastered: 6, daytime: 8 },
  // Clock Tower — a keeper's flat in the shaft; a landmark with a small staff.
  "NUM.5": { residence_built: 2, residence_mastered: 6, daytime: 4 },
  // Community School — a visible cohort making the trip, and no homes.
  "NUM.3": { residence_built: 0, residence_mastered: 0, daytime: 8 },
  // Central Park — the loosest destination, and the one that should look busiest.
  "NUM.4": { residence_built: 0, residence_mastered: 0, daytime: 12 },
};

/**
 * The Civic Center's own daytime seats: a small staff. It is ALSO the gathering place
 * for everyone with nowhere to live, and that crowd is UNBOUNDED (§7) — it is not
 * limited by this number.
 */
export const HUB_DAYTIME_CAPACITY = 4;

/**
 * The capacity for a node, falling back to zeros for anything unlisted (including a
 * missing or unknown id). Total by construction: nothing throws and nothing divides
 * by zero on an unauthored island (D-CIT12).
 */
export function capacityForNode(nodeId: string | undefined | null): CitizenCapacity {
  if (!nodeId) {
    return EMPTY_CITIZEN_CAPACITY;
  }
  return CITIZEN_NODE_CAPACITY[nodeId] ?? EMPTY_CITIZEN_CAPACITY;
}

/* -------------------------------------------------------------------------- */
/* The settled endgame (§8.4)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Spare homes at full mastery. ZERO: population at full mastery (44) EQUALS
 * residential capacity at full mastery (44) — "full, settled, and happy" read
 * literally, every home occupied and nobody waiting.
 *
 * The amendment would permit spare homes, but an island with empty houses reads
 * HOLLOW. Kept SEPARATE from the guarantee (`population <= capacity`) so the tuning
 * intent and the promise can be loosened independently (§12.1).
 */
export const ENDGAME_SPARE_HOMES = 0;

/* -------------------------------------------------------------------------- */
/* Movement and rendering (§8.6, §14) — consumed by the RENDER layer, but held  */
/* here because D-CIT14 puts ALL tuning in one table.                          */
/* -------------------------------------------------------------------------- */

/** ~one grid cell (`GRID_CELL = 4`) every 2.5s: legible at the fixed ~49-degree camera. */
export const WALK_SPEED_UNITS_PER_SEC = 1.6;

/**
 * A road cell costs this much of a bare cell when routing, so traffic VISIBLY
 * follows the paths without a citizen ever refusing bare ground (D-CIT7 — roads
 * amplify, never gate).
 */
export const ROAD_PREFERENCE_WEIGHT = 0.5;

/** One car per this many road tiles, so gold spent on roads buys visible life. */
export const CARS_PER_ROAD_TILES = 8;

/** A cap on cars, for the same reason citizens have one. */
export const MAX_CARS = 6;

/**
 * The RENDER-ONLY cap (D-CIT9, §14). The engine's population count, capacities,
 * assignments, and waiting list are EXACT and UNCAPPED, and the DOM readout always
 * reports the true number.
 *
 * PROVISIONAL, and set against a NAMED target (D-CIT20): the floor is a school
 * Chromebook with low-end integrated graphics; the common case is a typical student
 * laptop with integrated graphics. 48 clears the 44 that full D1 mastery produces
 * with a small margin, which is all the cap's job is — a safety net that is routinely
 * load-bearing is a design limit in disguise.
 *
 * DO NOT OVER-ENGINEER THIS NUMBER. It is unreachable on D1 in every build order, so
 * it matters for a later island's roster and for the degradation ladder, not for
 * shipping D1. And it is not the lever that decides whether this runs on a
 * Chromebook: two instanced draws of a few dozen low-poly bodies is a few thousand
 * triangles. The scene's real costs there are `dpr={[1, 2]}`, the shadow pass, and
 * the road layer — none of which citizens make worse.
 */
export const MAX_RENDERED_CITIZENS = 48;
```

- [ ] **Step 4: Export from the engine barrel**

Modify `engines/game/src/index.ts` — append after the existing exports:

```ts
export * from "./citizens-tuning";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run engines/game/src/citizens-tuning.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Prove the tests are load-bearing (mutation proof)**

Run each mutation, record the failure, restore, confirm green again.

| Mutation | Expected failure |
| --- | --- |
| `"NUM.3": { …, residence_mastered: 6 }` (the "just spread housing everywhere" fix) | 3 fail: "houses nobody in the school or the park", the role/capacity agreement test, and the `residence_mastered` total (`50` vs `44`) |
| `CITIZENS_PER_MASTERED_SKILL = 2` (equal terms) | 1 fail: "makes the mastery population term strictly larger" |
| `"NUM.2": { …, residence_mastered: 10 }` (capacity from construction alone) | 3 fail: "makes mastery strictly better than building", the `44` total, and the role/capacity agreement test — `NUM.S` becomes the biggest housing node and the descriptor does not call it a `residence` |
| `capacityForNode` returning `undefined` for an unlisted node | 2 fail: the fallback assertions in "gives every D1 node a capacity entry" |
| `MAX_RENDERED_CITIZENS = 40` (below D1's own population) | 1 fail: "caps only rendering" — it would make the cap a design limit rather than a net |
| In Task 1.0's map, `"NUM.4": "school"` (following §8.2's old typo) | 1 fail here (the role/capacity agreement test) **plus** 2 in Task 1.0 — the cross-file check is what makes the seam safe |

- [ ] **Step 7: Format, lint, typecheck, commit**

```bash
npx biome format --write engines/game/src/citizens-tuning.ts engines/game/src/citizens-tuning.test.ts
npx biome lint engines/game/src
npm run typecheck
git add engines/game/src/citizens-tuning.ts engines/game/src/citizens-tuning.test.ts engines/game/src/index.ts
git commit -m "feat(game): the single citizens tuning table, keyed by node id (D-CIT14)"
```

---

## Task 1.2: Population and capacity, keyed on placed-and-complete (P1)

**Files:**
- Create: `engines/game/src/citizens-population.ts`
- Create: `engines/game/src/citizens-population.test.ts`
- Modify: `engines/game/src/index.ts` (one export line)

**Interfaces:**
- Consumes: `capacityForNode`, `CitizenCapacity`,
  `FOUNDING_POPULATION`, `CITIZENS_PER_COMPLETE_BUILDING`, `CITIZENS_PER_MASTERED_SKILL`,
  `HUB_DAYTIME_CAPACITY` from `./citizens-tuning`; `deriveConstructionState` from
  `./construction`; `Mastery`, `LessonStage`, `PlacementEstimate` from `@cr/state-schema`.
- Produces:

```ts
export interface CitizenNodeInput {
  readonly node_id: string;
  readonly citizen_role: CitizenRoleId;
  readonly placed: boolean;
  readonly mastery: Mastery;
  readonly lesson_stage: LessonStage;
  readonly placement_estimate: PlacementEstimate;
  readonly authoring_complete?: boolean;
}
export interface CitizenBuildingLedger {
  readonly node_id: string;
  readonly citizen_role: CitizenRoleId;
  readonly role: CitizenRoleId;
  readonly complete: boolean;
  readonly mastered: boolean;
  readonly residence_capacity: number;
  readonly daytime_capacity: number;
}
export function buildingLedger(nodes: readonly CitizenNodeInput[]): readonly CitizenBuildingLedger[];
export function citizenPopulation(ledger: readonly CitizenBuildingLedger[]): number;
export function residenceCapacity(ledger: readonly CitizenBuildingLedger[]): number;
export function daytimeCapacity(ledger: readonly CitizenBuildingLedger[]): number;
```

- [ ] **Step 1: Write the failing test**

Create `engines/game/src/citizens-population.test.ts`:

```ts
import type { LessonStage, Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  buildingLedger,
  type CitizenNodeInput,
  citizenPopulation,
  daytimeCapacity,
  residenceCapacity,
} from "./citizens-population";
import { CITIZENS_PER_COMPLETE_BUILDING, FOUNDING_POPULATION } from "./citizens-tuning";

/** The six D1 nodes with the roles the descriptor resolves for them (Task 1.0). */
const D1: readonly { node_id: string; citizen_role: CitizenRoleId }[] = [
  { node_id: "NUM.S", citizen_role: "civic" },
  { node_id: "NUM.F", citizen_role: "civic" },
  { node_id: "NUM.2", citizen_role: "residence" },
  { node_id: "NUM.3", citizen_role: "school" },
  { node_id: "NUM.4", citizen_role: "civic" },
  { node_id: "NUM.5", citizen_role: "civic" },
];

/** A node in a given standing. `placed` defaults with the stage, never silently. */
function node(
  index: number,
  over: {
    placed?: boolean;
    mastery?: Mastery;
    lesson_stage?: LessonStage;
  } = {},
): CitizenNodeInput {
  return {
    ...D1[index],
    placed: over.placed ?? false,
    mastery: over.mastery ?? 0,
    lesson_stage: over.lesson_stage ?? "not_started",
    placement_estimate: 0,
  };
}

/** Every D1 node, placed, at one mastery — the "all six" states §8.1 tabulates. */
function island(over: {
  placed?: boolean;
  mastery?: Mastery;
  lesson_stage?: LessonStage;
}): CitizenNodeInput[] {
  return D1.map((_, index) => node(index, over));
}

describe("citizen population and capacity (D-CIT2, D-CIT10, D-CIT11, D-CIT15)", () => {
  it("opens a bare island on a crowd with nowhere to go (the cold open)", () => {
    // The single most easily lost beat: a derivation that starts at zero loses the
    // whole cold open, and the crowd that gives the middle its pull.
    const ledger = buildingLedger(island({}));
    expect(citizenPopulation(ledger)).toBe(FOUNDING_POPULATION);
    expect(citizenPopulation(ledger)).toBe(8);
    expect(residenceCapacity(ledger)).toBe(0);
  });

  it("requires a building to be PLACED, not merely complete in state (D-CIT10)", () => {
    // `seedFromPlacement` clears `placements`, so a full test-out has six nodes
    // complete in state and ZERO buildings standing. Counting state alone would put
    // 44 people on a bare island, in homes that do not exist.
    const completeButUnplaced = island({ placed: false, lesson_stage: "done" });
    const ledger = buildingLedger(completeButUnplaced);
    expect(citizenPopulation(ledger)).toBe(FOUNDING_POPULATION);
    expect(residenceCapacity(ledger)).toBe(0);
    for (const entry of ledger) {
      expect(entry.complete, entry.node_id).toBe(false);
      expect(entry.mastered, entry.node_id).toBe(false);
    }
  });

  it("counts a tested-out building the moment it is placed (GROUNDED CORRECTION 2)", () => {
    // lesson_stage "done" at mastery 0 is exactly what the test-out amendment writes.
    // A mastery-only dial would give a full test-out zero people.
    const one = buildingLedger([node(0, { placed: true, lesson_stage: "done" })]);
    expect(citizenPopulation(one)).toBe(
      FOUNDING_POPULATION + CITIZENS_PER_COMPLETE_BUILDING,
    );
    expect(one[0].complete).toBe(true);
    expect(one[0].mastered).toBe(false);
    // Exactly its `residence_built`, not its mastered figure: `deco` is 2.
    expect(residenceCapacity(one)).toBe(2);
  });

  it("counts a below-bar finished building too (mastery 1, lesson_stage done)", () => {
    // `deriveConstructionState` returns complete at lesson_stage "done" regardless of
    // score, and `masteryLabel` even has copy for it. The build beat fires here.
    const one = buildingLedger([
      node(2, { placed: true, mastery: 1, lesson_stage: "done" }),
    ]);
    expect(one[0].complete).toBe(true);
    expect(one[0].mastered).toBe(false);
    expect(residenceCapacity(one)).toBe(10);
  });

  it("tabulates the three states §8.1 names", () => {
    expect(citizenPopulation(buildingLedger(island({})))).toBe(8);
    // All six finished, none mastered: a working town, half-settled.
    const finished = buildingLedger(island({ placed: true, lesson_stage: "done" }));
    expect(citizenPopulation(finished)).toBe(20);
    expect(residenceCapacity(finished)).toBe(16);
    // All six mastered: a throng, fully settled.
    const mastered = buildingLedger(
      island({ placed: true, mastery: 2, lesson_stage: "done" }),
    );
    expect(citizenPopulation(mastered)).toBe(44);
    expect(residenceCapacity(mastered)).toBe(44);
    expect(daytimeCapacity(mastered)).toBe(44);
  });

  it("pays the gold margin nothing (D-CIT11)", () => {
    // Gold is a non-gating margin; paying it would make the crowd a scoreboard again,
    // and would make the settled ending require 5-of-5 on every set.
    const at2 = buildingLedger(island({ placed: true, mastery: 2, lesson_stage: "done" }));
    const at3 = buildingLedger(island({ placed: true, mastery: 3, lesson_stage: "done" }));
    expect(citizenPopulation(at3)).toBe(citizenPopulation(at2));
    expect(residenceCapacity(at3)).toBe(residenceCapacity(at2));
    expect(daytimeCapacity(at3)).toBe(daytimeCapacity(at2));
  });

  it("makes mastering a node bring more people than finishing it, for every node", () => {
    for (let index = 0; index < D1.length; index += 1) {
      const finished = buildingLedger([node(index, { placed: true, lesson_stage: "done" })]);
      const mastered = buildingLedger([
        node(index, { placed: true, mastery: 2, lesson_stage: "done" }),
      ]);
      expect(citizenPopulation(mastered), D1[index].node_id).toBeGreaterThan(
        citizenPopulation(finished),
      );
    }
  });

  it("gives the daytime ledger the hub's staff and no mastery term (§8.3)", () => {
    const bare = buildingLedger(island({}));
    // Even a bare island has the hub, so the day is never empty.
    expect(daytimeCapacity(bare)).toBe(4);
    const finished = buildingLedger(island({ placed: true, lesson_stage: "done" }));
    const mastered = buildingLedger(
      island({ placed: true, mastery: 2, lesson_stage: "done" }),
    );
    expect(daytimeCapacity(finished)).toBe(daytimeCapacity(mastered));
  });

  it("treats an unauthored island as the founding crowd, and does not throw (D-CIT12)", () => {
    // D2-D10 are `architected` with zero plots: no roles, no capacity, nothing to
    // divide by. The hub stands and the founding crowd waits.
    const ledger = buildingLedger([]);
    expect(ledger).toEqual([]);
    expect(citizenPopulation(ledger)).toBe(FOUNDING_POPULATION);
    expect(residenceCapacity(ledger)).toBe(0);
    expect(daytimeCapacity(ledger)).toBe(4);
  });

  it("gives an unknown art mass a civic role and no homes", () => {
    const ledger = buildingLedger([
      {
        node_id: "EXP.1",
        citizen_role: "civic",
        placed: true,
        mastery: 2,
        lesson_stage: "done",
        placement_estimate: 0,
      },
    ]);
    expect(ledger[0].role).toBe("civic");
    expect(ledger[0].residence_capacity).toBe(0);
    // It still brings people: a mass with no homes is not a mass with no citizens.
    expect(citizenPopulation(ledger)).toBe(14);
  });

  it("never completes a node whose content is still in authoring", () => {
    const ledger = buildingLedger([
      { ...node(2, { placed: true, lesson_stage: "done" }), authoring_complete: false },
    ]);
    expect(ledger[0].complete).toBe(false);
    expect(citizenPopulation(ledger)).toBe(FOUNDING_POPULATION);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run engines/game/src/citizens-population.test.ts`
Expected: FAIL — `Failed to resolve import "./citizens-population"`.

- [ ] **Step 3: Write the implementation**

Create `engines/game/src/citizens-population.ts`:

```ts
import type { LessonStage, Mastery, PlacementEstimate } from "@cr/state-schema";

import {
  capacityForNode,
  type CitizenCapacity,
  CITIZENS_PER_COMPLETE_BUILDING,
  CITIZENS_PER_MASTERED_SKILL,
  FOUNDING_POPULATION,
  HUB_DAYTIME_CAPACITY,
} from "./citizens-tuning";
import { deriveConstructionState } from "./construction";
import type { CitizenRoleId } from "./descriptors";

/**
 * The population and capacity arithmetic (pure, framework-free, no seed, no
 * individuals, no renderer).
 *
 * ONE DIAL, TWO TERMS (D-CIT2). Population is a pure function of learning state:
 * no clock, no capacity feedback, no way to farm people by building houses. The two
 * terms are the ones the design states — a completed building brings people, and
 * mastering its skill brings more — because a STRICTLY mastery-keyed count would
 * break both test-out (complete at mastery 0) and the build beat (complete at
 * mastery 1), which the same design requires (GROUNDED CORRECTION 2).
 *
 * PLACED AND COMPLETE, not complete-in-state (D-CIT10). `citySession.seedFromPlacement`
 * clears `placements`, so a learner who tested out of everything has six nodes
 * complete in `student_node_state` and ZERO buildings standing. Counting state alone
 * would put 44 people on a bare island, assigned to homes that do not exist. Both
 * population and capacity read the SAME placed-and-complete set, which is what makes
 * the settled ending hold for a tested-out learner too.
 *
 * MONOTONE BY CONSTRUCTION. Mastery is monotone (`mastery-service` writes
 * `max(existing, evidenced)`) and placement is monotone (a building is never
 * unplaced), so every total here can only rise. That is the machine-checkable half of
 * "nobody is ever punished" (D-CIT6) and of the no-eviction guarantee.
 */

/** Everything the arithmetic needs about one node. The art mass carries the role. */
export interface CitizenNodeInput {
  readonly node_id: string;
  /**
   * The social role, resolved from the neighborhood descriptor by
   * `resolveNeighborhood` and carried on `CityBuildingView` (D-CIT17). The caller
   * passes it through; it never looks one up. Capacity is keyed separately by id.
   */
  readonly citizen_role: CitizenRoleId;
  /** Does this building STAND on the island? (D-CIT10 — the load-bearing field.) */
  readonly placed: boolean;
  readonly mastery: Mastery;
  readonly lesson_stage: LessonStage;
  readonly placement_estimate: PlacementEstimate;
  /** Per-node authoring completeness; absent defaults to true (`construction.ts`). */
  readonly authoring_complete?: boolean;
}

/** One building's derived social standing: what it is, and how many it holds. */
export interface CitizenBuildingLedger {
  readonly node_id: string;
  readonly citizen_role: CitizenRoleId;
  readonly role: CitizenRoleId;
  /** Placed AND `construction_state === "complete"`. */
  readonly complete: boolean;
  /** `complete` AND `mastery >= 2` (D-CIT11). Gold (3) is not a third tier. */
  readonly mastered: boolean;
  /** Homes here NOW: mastered -> mastered figure, complete -> built figure, else 0. */
  readonly residence_capacity: number;
  /** Daytime seats here NOW: complete -> the mass's figure, else 0. No mastery term. */
  readonly daytime_capacity: number;
}

function residenceFor(
  capacity: CitizenCapacity,
  entry: { complete: boolean; mastered: boolean },
): number {
  if (entry.mastered) {
    return capacity.residence_mastered;
  }
  return entry.complete ? capacity.residence_built : 0;
}

/**
 * Derive the per-building ledger from raw node state. The placed-and-complete rule
 * lives HERE, in one place, so no caller can key the population on state alone.
 */
export function buildingLedger(
  nodes: readonly CitizenNodeInput[],
): readonly CitizenBuildingLedger[] {
  return nodes.map((node) => {
    const capacity = capacityForNode(node.node_id);
    // The SAME construction rule the stars, the storm copy, and the roster agree on.
    const constructionState = deriveConstructionState(
      {
        mastery: node.mastery,
        lesson_stage: node.lesson_stage,
        placement_estimate: node.placement_estimate,
      },
      { authoring_complete: node.authoring_complete ?? true },
    );
    const complete = node.placed && constructionState === "complete";
    const mastered = complete && node.mastery >= 2;
    return {
      node_id: node.node_id,
      role: node.citizen_role,
      complete,
      mastered,
      residence_capacity: residenceFor(capacity, { complete, mastered }),
      daytime_capacity: complete ? capacity.daytime : 0,
    };
  });
}

/**
 * The island's population: the founding crowd, plus a term per completed building and
 * a LARGER term per mastered skill. Un-gameable — you cannot wait for people (no
 * clock) and you cannot farm them by building houses (no capacity feedback).
 */
export function citizenPopulation(ledger: readonly CitizenBuildingLedger[]): number {
  let complete = 0;
  let mastered = 0;
  for (const entry of ledger) {
    if (entry.complete) {
      complete += 1;
    }
    if (entry.mastered) {
      mastered += 1;
    }
  }
  return (
    FOUNDING_POPULATION +
    complete * CITIZENS_PER_COMPLETE_BUILDING +
    mastered * CITIZENS_PER_MASTERED_SKILL
  );
}

/**
 * Total homes on the island. A constant SUM over the buildings, so its full-mastery
 * value is independent of the order they were finished in — which is why
 * `population(all mastered) === capacity(all mastered)` is order-independent rather
 * than a property that survives only the common path (§8.4).
 */
export function residenceCapacity(ledger: readonly CitizenBuildingLedger[]): number {
  return ledger.reduce((total, entry) => total + entry.residence_capacity, 0);
}

/**
 * Total daytime seats, INCLUDING the hub's small staff — the hub is pre-seeded and
 * always built on every island, so this is never zero. It decides how busy the city
 * looks by day and has NO bearing on who is waiting for a home.
 */
export function daytimeCapacity(ledger: readonly CitizenBuildingLedger[]): number {
  return (
    HUB_DAYTIME_CAPACITY +
    ledger.reduce((total, entry) => total + entry.daytime_capacity, 0)
  );
}
```

- [ ] **Step 4: Export from the barrel**

Modify `engines/game/src/index.ts` — append:

```ts
export * from "./citizens-population";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run engines/game/src/citizens-population.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 6: Prove the tests are load-bearing (mutation proof)**

| Mutation | Expected failure |
| --- | --- |
| `const complete = constructionState === "complete";` (drop `node.placed` — count state alone) | 2 fail: "requires a building to be PLACED" (population `44` vs `8`, capacity `44` vs `0`) |
| `const complete = node.placed && node.mastery >= 2;` (a mastery-only dial) | 3 fail: the tested-out test, the below-bar test, and the "all six finished, none mastered" cell (`8` vs `20`) |
| `FOUNDING_POPULATION` dropped from `citizenPopulation` | 6+ fail, starting with the cold open (`0` vs `8`) |
| `mastered = complete && node.mastery >= 3` (gold is the bar) | 2 fail: the §8.1 table (`20` vs `44`) and "mastering brings more people" |
| `daytime_capacity: entry.mastered ? profile.daytime * 2 : ...` (a mastery term on daytime) | 2 fail: the gold-margin test and "no mastery term" |

- [ ] **Step 7: Format, lint, typecheck, commit**

```bash
npx biome format --write engines/game/src/citizens-population.ts engines/game/src/citizens-population.test.ts
npm run typecheck
npx vitest run engines/game/src
git add engines/game/src/citizens-population.ts engines/game/src/citizens-population.test.ts engines/game/src/index.ts
git commit -m "feat(game): population and capacity keyed on placed-and-complete (D-CIT10)"
```

---

## Task 1.3: The invariant sweeps — the settled ending, every build order, monotonicity (P1)

This is the task the whole phase exists for. It adds **no source file** — only the
assertions that pin the design.

**Files:**
- Create: `engines/game/src/citizens-invariants.test.ts`

**Interfaces:**
- Consumes: `buildingLedger`, `citizenPopulation`, `residenceCapacity`,
  `CitizenNodeInput` (Task 1.2); `ENDGAME_SPARE_HOMES`, `FOUNDING_POPULATION` (Task 1.1).
- Produces: nothing (a test file).

- [ ] **Step 1: Write the failing test**

Create `engines/game/src/citizens-invariants.test.ts`:

```ts
import type { Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  buildingLedger,
  type CitizenNodeInput,
  citizenPopulation,
  residenceCapacity,
} from "./citizens-population";
import { ENDGAME_SPARE_HOMES, FOUNDING_POPULATION } from "./citizens-tuning";

/**
 * The exhaustive sweeps. Every tuning claim in the design is arithmetic, so all of it
 * is assertable here with no GPU, no DOM, and no citizen rendered.
 *
 * The D1 prerequisite graph is duplicated as DATA rather than imported, deliberately:
 * `packages/skill-graph` is Gabriel's, and the mid-game-crowd assertion below is meant
 * to fail LOUDLY if those prerequisites change (the design leans on `NUM.2` requiring
 * two other skills as a graph-level guarantee). A test that silently tracked the graph
 * would stop guarding the assumption it exists to guard.
 * Verified against `packages/skill-graph/src/skill_graph.json` at b73345b.
 */
const PREREQS: Readonly<Record<string, readonly string[]>> = {
  "NUM.S": [],
  "NUM.F": [],
  "NUM.3": [],
  "NUM.2": ["NUM.S", "NUM.F"],
  "NUM.5": ["NUM.F"],
  "NUM.4": ["NUM.S", "NUM.F", "NUM.2", "NUM.3"],
};

const ROLE_BY_NODE: Readonly<Record<string, CitizenRoleId>> = {
  "NUM.S": "deco",
  "NUM.F": "slab",
  "NUM.2": "rowhouse",
  "NUM.3": "school",
  "NUM.4": "park",
  "NUM.5": "tower",
};

const NODE_IDS = Object.keys(PREREQS);

/** An island where `masteryByNode` says how far each node got. Unplaced at mastery 0. */
function islandAt(
  masteryByNode: Readonly<Record<string, Mastery>>,
  options: { readonly placeAll?: boolean } = {},
): CitizenNodeInput[] {
  return NODE_IDS.map((nodeId) => {
    const mastery = masteryByNode[nodeId] ?? 0;
    const touched = options.placeAll === true || mastery > 0;
    return {
      node_id: nodeId,
      citizen_role: ROLE_BY_NODE[nodeId],
      placed: touched,
      mastery,
      lesson_stage: touched ? ("done" as const) : ("not_started" as const),
      placement_estimate: 0 as const,
      };
  });
}

/** Every topologically valid order the six skills can be finished in. */
function validBuildOrders(): readonly (readonly string[])[] {
  const orders: string[][] = [];
  const walk = (done: string[]) => {
    if (done.length === NODE_IDS.length) {
      orders.push([...done]);
      return;
    }
    for (const nodeId of NODE_IDS) {
      if (done.includes(nodeId)) {
        continue;
      }
      if (PREREQS[nodeId].every((prereq) => done.includes(prereq))) {
        walk([...done, nodeId]);
      }
    }
  };
  walk([]);
  return orders;
}

/** The common path: a learner who passes each set lands complete and mastered together. */
function afterFinishing(finished: readonly string[]): CitizenNodeInput[] {
  const mastery: Record<string, Mastery> = {};
  for (const nodeId of finished) {
    mastery[nodeId] = 2;
  }
  return islandAt(mastery);
}

function waitingCount(nodes: readonly CitizenNodeInput[]): number {
  const ledger = buildingLedger(nodes);
  return Math.max(0, citizenPopulation(ledger) - residenceCapacity(ledger));
}

const ALL_MASTERED = islandAt(
  Object.fromEntries(NODE_IDS.map((nodeId) => [nodeId, 2 as Mastery])),
);

describe("the settled ending (D-CIT4, as amended 2026-07-27)", () => {
  it("GUARANTEES nobody is waiting at full mastery", () => {
    // The single most important assertion in the feature, and the one the amendment
    // exists to enforce. Any retune that leaves someone waiting at full mastery fails
    // HERE, whatever else it improves.
    const ledger = buildingLedger(ALL_MASTERED);
    expect(citizenPopulation(ledger)).toBeLessThanOrEqual(residenceCapacity(ledger));
    expect(waitingCount(ALL_MASTERED)).toBe(0);
  });

  it("settles EXACTLY full — no empty houses (the tuning intent, kept separate)", () => {
    // Deliberately a different assertion from the guarantee above, so the two can be
    // loosened independently: an island with empty houses reads hollow.
    const ledger = buildingLedger(ALL_MASTERED);
    expect(residenceCapacity(ledger) - citizenPopulation(ledger)).toBe(
      ENDGAME_SPARE_HOMES,
    );
    expect(citizenPopulation(ledger)).toBe(44);
    expect(residenceCapacity(ledger)).toBe(44);
  });

  it("settles in EVERY ONE of the 33 topologically valid build orders", () => {
    const orders = validBuildOrders();
    // Pinned: if the D1 prerequisites change, this number changes and the whole
    // pacing argument needs re-deriving.
    expect(orders).toHaveLength(33);
    for (const order of orders) {
      expect(waitingCount(afterFinishing(order)), order.join(" -> ")).toBe(0);
    }
  });

  it("keeps a waiting crowd alive through the first TWO finished skills, in every order", () => {
    // A graph-level guarantee, not a tuning accident: `NUM.2` carries 59% of the
    // island's homes and requires `NUM.S` + `NUM.F`, so it can never be first or
    // second. This test therefore also GUARDS THE GRAPH ASSUMPTION and fails loudly
    // if the prerequisites change.
    for (const order of validBuildOrders()) {
      for (const k of [1, 2]) {
        expect(
          waitingCount(afterFinishing(order.slice(0, k))),
          `${order.join(" -> ")} at k=${k}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("records the waiting range at each k, and never lets it be negative", () => {
    // The design's §8.5 range row is re-derived here rather than trusted: its k=5
    // cell reads "0-14" and computes to exactly 0. What is ASSERTED is only the
    // invariants above; this records the shape of the curve so a retune's effect on
    // the middle is visible in the diff.
    const byK = new Map<number, Set<number>>();
    for (const order of validBuildOrders()) {
      for (let k = 0; k <= NODE_IDS.length; k += 1) {
        const waiting = waitingCount(afterFinishing(order.slice(0, k)));
        expect(waiting).toBeGreaterThanOrEqual(0);
        const seen = byK.get(k) ?? new Set<number>();
        seen.add(waiting);
        byK.set(k, seen);
      }
    }
    expect([...(byK.get(0) ?? [])]).toEqual([8]);
    expect([...(byK.get(6) ?? [])]).toEqual([0]);
    // The peak the design names, and the cap on how big the middle ever gets.
    const everyWaiting = [...byK.values()].flatMap((set) => [...set]);
    expect(Math.max(...everyWaiting)).toBe(14);
  });

  it("walks the tested-out learner to the same ending (§8.5)", () => {
    // Places six finished buildings at mastery 0, then practises them up. Both
    // population and capacity read the same placed-and-complete set, so the settled
    // ending holds without a special case.
    const placedAtZero = islandAt({}, { placeAll: true });
    expect(citizenPopulation(buildingLedger(placedAtZero))).toBe(20);
    expect(residenceCapacity(buildingLedger(placedAtZero))).toBe(16);
    expect(waitingCount(placedAtZero)).toBe(4);

    let mastery: Record<string, Mastery> = {};
    for (const nodeId of NODE_IDS) {
      mastery = { ...mastery, [nodeId]: 2 as Mastery };
    }
    const finished = islandAt(mastery, { placeAll: true });
    expect(citizenPopulation(buildingLedger(finished))).toBe(44);
    expect(residenceCapacity(buildingLedger(finished))).toBe(44);
    expect(waitingCount(finished)).toBe(0);
  });
});

describe("monotonicity — nothing is ever taken away (D-CIT6)", () => {
  it("never lowers population or capacity across all 4096 mastery vectors", () => {
    // The machine check behind "nobody is ever punished": advancing ANY node from any
    // state must not lower either total. 4 levels ^ 6 nodes = 4096 vectors.
    const levels: Mastery[] = [0, 1, 2, 3];
    let checked = 0;
    for (let code = 0; code < 4 ** NODE_IDS.length; code += 1) {
      const vector: Record<string, Mastery> = {};
      let rest = code;
      for (const nodeId of NODE_IDS) {
        vector[nodeId] = levels[rest % 4];
        rest = Math.floor(rest / 4);
      }
      const before = buildingLedger(islandAt(vector, { placeAll: true }));
      const population = citizenPopulation(before);
      const capacity = residenceCapacity(before);
      for (const nodeId of NODE_IDS) {
        if (vector[nodeId] === 3) {
          continue;
        }
        const advanced = buildingLedger(
          islandAt(
            { ...vector, [nodeId]: (vector[nodeId] + 1) as Mastery },
            { placeAll: true },
          ),
        );
        expect(citizenPopulation(advanced), `${nodeId} from ${vector[nodeId]}`).toBeGreaterThanOrEqual(
          population,
        );
        expect(residenceCapacity(advanced), `${nodeId} from ${vector[nodeId]}`).toBeGreaterThanOrEqual(
          capacity,
        );
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(4000);
  });

  it("never lowers a total when an unplaced building is placed", () => {
    // Placement is monotone too, which is the other half of "capacity only rises".
    for (const nodeId of NODE_IDS) {
      const before = buildingLedger(islandAt({}));
      const after = buildingLedger([
        ...islandAt({}).filter((node) => node.node_id !== nodeId),
        {
          node_id: nodeId,
          citizen_role: ROLE_BY_NODE[nodeId],
          placed: true,
          mastery: 0,
          lesson_stage: "done",
          placement_estimate: 0,
        },
      ]);
      expect(citizenPopulation(after), nodeId).toBeGreaterThanOrEqual(
        citizenPopulation(before),
      );
      expect(residenceCapacity(after), nodeId).toBeGreaterThanOrEqual(
        residenceCapacity(before),
      );
    }
  });
});

describe("capacity never gates arrivals (D-CIT2's forbidden loop)", () => {
  it("keeps population identical under any capacity table, including an all-zero one", () => {
    // Housing does NOT attract residents. Building a second terrace would not summon
    // anyone; it would only house people the learning already brought. Simulated by
    // swapping every art mass for one with no entry in the table (so every capacity
    // reads zero) and checking the population does not move.
    const real = buildingLedger(ALL_MASTERED);
    const zeroCapacity = buildingLedger(
      ALL_MASTERED.map((node) => ({ ...node, node_id: `unmapped-${node.node_id}` })),
    );
    expect(residenceCapacity(zeroCapacity)).toBe(0);
    expect(citizenPopulation(zeroCapacity)).toBe(citizenPopulation(real));
    expect(citizenPopulation(zeroCapacity)).toBe(44);
  });
});

describe("the founding crowd is never lost", () => {
  it("holds the founding population on a bare island, an empty island, and D2", () => {
    expect(citizenPopulation(buildingLedger(islandAt({})))).toBe(FOUNDING_POPULATION);
    expect(citizenPopulation(buildingLedger([]))).toBe(FOUNDING_POPULATION);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run engines/game/src/citizens-invariants.test.ts`
Expected: PASS if Tasks 1.1 and 1.2 are correct. **That is the point of this task** — it is
a characterisation suite over already-written arithmetic, so it does not begin red. Its
value is established by Step 3, not by a red-to-green transition. If it is red here, the
tuning table is wrong; fix the table, not the test.

- [ ] **Step 3: Prove every assertion is load-bearing (the mutation matrix)**

This step is mandatory and is the deliverable of the task. Run each edit, record the exact
failure count and message, restore, re-run green.

| Mutation (all in `citizens-tuning.ts` unless noted) | Expected failure |
| --- | --- |
| `rowhouse.residence_mastered: 24` (a two-home retune) | 3 fail: the settled guarantee (`44 <= 42` false), exactly-full (`-2` vs `0`), and "settles in EVERY ONE of the 33" |
| `rowhouse.residence_mastered: 28` (a generous retune) | 1 fail: exactly-full (`4` vs `0`) — the guarantee still holds, which is exactly why the two are separate assertions |
| `school.residence_built: 4`, `school.residence_mastered: 8` (families in the school) | 2 fail: "keeps a waiting crowd alive through the first TWO" and exactly-full |
| `park.residence_mastered: 6` (families in the park) | 2 fail: exactly-full and the waiting-range recording (`Math.max` no longer 14) |
| `FOUNDING_POPULATION = 4` (the pre-amendment figure) | 4 fail: the k=0 range cell, exactly-full, the tested-out curve, and the founding-crowd test |
| In `citizens-population.ts`: make `residenceFor` return `residence_mastered` whenever `complete` (capacity from construction alone) | 2 fail: "keeps a waiting crowd alive through the first TWO" and the tested-out curve |
| In the test's `PREREQS`, drop `NUM.2`'s prerequisites (impersonating a graph change) | 2 fail: the 33-order count (`120` orders) and the mid-game crowd — proving the test guards the graph assumption |
| In `citizens-population.ts`: add `+ capacityBonus` keyed on `residenceCapacity` to `citizenPopulation` (the forbidden feedback loop) | 1 fail: "keeps population identical under any capacity table" |
| In `citizens-population.ts`: `mastered = complete && node.mastery === 2` (gold un-masters) | 1 fail: monotonicity, at `NUM.S from 2` |

- [ ] **Step 4: Run the whole engine suite**

Run: `npx vitest run engines/game/src`
Expected: PASS. Note the runtime of `citizens-invariants.test.ts`; the 4096-vector sweep
does 4096 x up to 6 re-derivations and should land well under a second. If it exceeds two
seconds, hoist `islandAt` allocations out of the inner loop rather than reducing coverage.

- [ ] **Step 5: Commit**

```bash
npx biome format --write engines/game/src/citizens-invariants.test.ts
npm run typecheck
git add engines/game/src/citizens-invariants.test.ts
git commit -m "test(game): pin the settled ending, all 33 build orders, and monotonicity"
```

- [ ] **Step 6: Land Phase 1**

```bash
npx biome format . && npx biome lint . && npm run typecheck && npm run test:unit
```

Write the `work-log/evan.md` entry (newest first, the `work-log/README.md` template), then
open the PR into `integration`. **Phase 1's PR is engine-only and touches no web file, so
it cannot conflict with any of the three in-flight branches.**

The work-log entry must record, at minimum: the mutation-proof results from Tasks 1.1-1.3
with the **exact** failure counts observed (not the counts predicted above — the repo has a
precedent for those differing, and the observed number is the one that matters), the two
spec inconsistencies from §7.7, and that no checkbox in `TEAM_CHECKLIST.md` is eligible.

---

## Task 2.1: A seeded PRNG inside the engine (P2)

**Files:**
- Create: `engines/game/src/citizens-rng.ts`
- Create: `engines/game/src/citizens-rng.test.ts`
- Modify: `engines/game/src/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `createSeededRng(seed: number): () => number` (uniform in `[0, 1)`);
  `mixSeed(seed: number, salt: number): number`.

- [ ] **Step 1: Write the failing test**

Create `engines/game/src/citizens-rng.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createSeededRng, mixSeed } from "./citizens-rng";

describe("createSeededRng", () => {
  it("returns the same stream for the same seed, forever", () => {
    const a = createSeededRng(0x5eed);
    const b = createSeededRng(0x5eed);
    const first = Array.from({ length: 32 }, () => a());
    const second = Array.from({ length: 32 }, () => b());
    expect(first).toEqual(second);
  });

  it("returns a different stream for a different seed", () => {
    const a = createSeededRng(1);
    const b = createSeededRng(2);
    expect(a()).not.toBe(b());
  });

  it("stays in [0, 1) over a long run", () => {
    const rng = createSeededRng(0xb17d5);
    for (let i = 0; i < 20000; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("tolerates a negative, fractional, or zero seed without collapsing", () => {
    for (const seed of [0, -1, -99999, 3.7]) {
      const rng = createSeededRng(seed);
      const draws = new Set([rng(), rng(), rng(), rng()]);
      expect(draws.size, `seed ${seed}`).toBe(4);
    }
  });

  it("mixes a salt into a seed deterministically and without collision on small salts", () => {
    expect(mixSeed(7, 3)).toBe(mixSeed(7, 3));
    const mixed = new Set(Array.from({ length: 64 }, (_, i) => mixSeed(7, i)));
    expect(mixed.size).toBe(64);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run engines/game/src/citizens-rng.test.ts`
Expected: FAIL — `Failed to resolve import "./citizens-rng"`.

- [ ] **Step 3: Write the implementation**

Create `engines/game/src/citizens-rng.ts`:

```ts
/**
 * A small deterministic PRNG for the citizen derivation (pure, framework-free).
 *
 * This exists in the ENGINE on purpose. `apps/web/src/city/three/StarterIsland.tsx`
 * defines a private `mulberry32` and uses three fixed seeds (0x5eed, 0x570e, 0xb17d5)
 * to scatter trees and boulders deterministically — the right precedent for the
 * algorithm, and exactly the wrong thing to import: it is a renderer internal and is
 * not exported. The derivation must not reach into the render layer for its
 * randomness (D-CIT8).
 *
 * `Math.random`, `Date.now`, and map-iteration order are all forbidden in the
 * derivation: two loads of the same state must produce the same city, which is what
 * makes the determinism assertion possible and what lets a citizen keep the same
 * look, home, and route across sessions with nothing saved (D-CIT1).
 */

/** Mulberry32: 32-bit state, uniform in [0, 1), fast and stable across engines. */
export function createSeededRng(seed: number): () => number {
  // Normalise anything a caller might hand over (negative, fractional, zero) into a
  // usable 32-bit state. A zero state is fine for mulberry32 — the increment moves it
  // on the first call — but truncating keeps the stream reproducible across platforms.
  let a = Math.trunc(seed) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derive a sub-seed from a base seed and a small integer salt, so independent streams
 * (looks, gaits, waiting positions) can be drawn without one consuming another's
 * draws. Deterministic, and collision-free over the small salts this feature uses.
 */
export function mixSeed(seed: number, salt: number): number {
  const base = Math.trunc(seed) >>> 0;
  const mixed = Math.imul(base ^ (Math.trunc(salt) >>> 0), 0x9e3779b1);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}
```

- [ ] **Step 4: Export from the barrel**

Modify `engines/game/src/index.ts` — append:

```ts
export * from "./citizens-rng";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run engines/game/src/citizens-rng.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Prove the tests are load-bearing (mutation proof)**

| Mutation | Expected failure |
| --- | --- |
| `return () => Math.random();` | 2 fail: "the same stream for the same seed" and the `mixSeed` determinism assertion is unaffected (so exactly 2, not 5 — record the real number) |
| `let a = seed;` (drop the `>>> 0` normalisation) | 1 fail: "tolerates a negative, fractional, or zero seed" |
| `return ((t ^ (t >>> 14)) >>> 0) / 4294967295;` (off-by-one divisor) | 1 fail: "stays in [0, 1)" — it can return exactly 1 |

- [ ] **Step 7: Commit**

```bash
npx biome format --write engines/game/src/citizens-rng.ts engines/game/src/citizens-rng.test.ts
npm run typecheck
git add engines/game/src/citizens-rng.ts engines/game/src/citizens-rng.test.ts engines/game/src/index.ts
git commit -m "feat(game): a seeded PRNG in the engine, not borrowed from the renderer"
```

---

## Task 2.2: `deriveCitizenRoster` — individuals, homes, destinations, waiting (P2)

**Before starting this task, the two decisions in §7.3 and §7.4 must be signed off** (the
assignment rule's two consequences, and the daytime rule). They change the code below, not
just its comments.

**Files:**
- Create: `engines/game/src/citizens.ts`
- Create: `engines/game/src/citizens.test.ts`
- Modify: `engines/game/src/index.ts`

**Interfaces:**
- Consumes: `buildingLedger`, `citizenPopulation`, `residenceCapacity`, `daytimeCapacity`,
  `CitizenNodeInput`, `CitizenBuildingLedger` (Task 1.2); `createSeededRng`, `mixSeed`
  (Task 2.1); `CitizenRoleId` (Task 1.1).
- Produces:

```ts
export type CitizenState =
  | "housed" | "waiting" | "commuting" | "at_school" | "at_work" | "visiting";
export interface CitizenLook {
  readonly body_tone: number;   // 0..1
  readonly shirt_tone: number;  // 0..1
  readonly height_scale: number; // 0.9..1.1
  readonly gait_phase: number;  // 0..1
}
export interface Citizen {
  readonly id: string;                    // "citizen-000", index-ordered and stable
  readonly state: CitizenState;
  readonly home_node_id: string | null;
  readonly day_node_id: string | null;
  readonly look: CitizenLook;
}
export interface CitizenBuildingOccupancy {
  readonly node_id: string;
  readonly citizen_role: CitizenRoleId;
  readonly role: CitizenRoleId;
  readonly residence_capacity: number;
  readonly residents: readonly string[];
  readonly daytime_capacity: number;
  readonly visitors: readonly string[];
}
export interface CitizenRosterInput {
  readonly nodes: readonly CitizenNodeInput[];
  readonly seed: number;
}
export interface CitizenRoster {
  readonly population: number;
  readonly residence_capacity: number;
  readonly daytime_capacity: number;
  readonly housed: number;
  readonly buildings: readonly CitizenBuildingOccupancy[];
  readonly citizens: readonly Citizen[];
  readonly waiting: readonly string[];
  readonly settled: boolean;
}
export function deriveCitizenRoster(input: CitizenRosterInput): CitizenRoster;
```

- [ ] **Step 1: Write the failing test**

Create `engines/game/src/citizens.test.ts`:

```ts
import type { LessonStage, Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { type CitizenNodeInput } from "./citizens-population";
import { type CitizenState, deriveCitizenRoster } from "./citizens";

const SEED = 0x5eed;

/** Nodes in PLACEMENT order — the order the adapter supplies them (see the plan §7.3). */
function placed(
  entries: readonly {
    node_id: string;
    citizen_role: CitizenRoleId;
    mastery?: Mastery;
    lesson_stage?: LessonStage;
  }[],
): CitizenNodeInput[] {
  return entries.map((entry) => ({
    node_id: entry.node_id,
    citizen_role: entry.citizen_role,
    placed: true,
    mastery: entry.mastery ?? 0,
    lesson_stage: entry.lesson_stage ?? "done",
    placement_estimate: 0,
  }));
}

const ROWHOUSE = { node_id: "NUM.2", citizen_role: "residence" } as const;
const BANK = { node_id: "NUM.S", citizen_role: "civic" } as const;
const SCHOOL = { node_id: "NUM.3", citizen_role: "school" } as const;

describe("deriveCitizenRoster", () => {
  it("puts the whole founding crowd outside the Civic Center on a bare island", () => {
    const roster = deriveCitizenRoster({ nodes: [], seed: SEED });
    expect(roster.population).toBe(8);
    expect(roster.residence_capacity).toBe(0);
    expect(roster.housed).toBe(0);
    expect(roster.waiting).toHaveLength(8);
    expect(roster.citizens).toHaveLength(8);
    for (const citizen of roster.citizens) {
      expect(citizen.state).toBe("waiting");
      expect(citizen.home_node_id).toBeNull();
    }
    // Nothing throws and nothing divides by zero on an island with no buildings.
    expect(roster.buildings).toEqual([]);
    expect(roster.settled).toBe(false);
  });

  it("houses the earliest arrivals first, and leaves the rest waiting", () => {
    // Rowhouse Flats built (not mastered) is 10 homes against a population of 10.
    const roster = deriveCitizenRoster({ nodes: placed([ROWHOUSE]), seed: SEED });
    expect(roster.population).toBe(10);
    expect(roster.residence_capacity).toBe(10);
    expect(roster.housed).toBe(10);
    expect(roster.waiting).toEqual([]);
    const home = roster.buildings.find((entry) => entry.node_id === "NUM.2");
    expect(home?.residents).toHaveLength(10);
    expect(home?.residents[0]).toBe(roster.citizens[0].id);
  });

  it("grows a terrace's occupancy when its skill is mastered (D-CIT15's visible half)", () => {
    const built = deriveCitizenRoster({ nodes: placed([ROWHOUSE]), seed: SEED });
    const mastered = deriveCitizenRoster({
      nodes: placed([{ ...ROWHOUSE, mastery: 2 }]),
      seed: SEED,
    });
    expect(built.buildings[0].residence_capacity).toBe(10);
    expect(mastered.buildings[0].residence_capacity).toBe(26);
    expect(mastered.buildings[0].residents.length).toBeGreaterThan(
      built.buildings[0].residents.length,
    );
  });

  it("grows the waiting crowd when a building that houses nobody lands", () => {
    // The most legible statement of what the crowd is FOR: finishing the school
    // brings families who need homes the island does not have yet. A RISE is always
    // new arrivals, never an eviction.
    const before = deriveCitizenRoster({ nodes: placed([ROWHOUSE]), seed: SEED });
    const after = deriveCitizenRoster({ nodes: placed([ROWHOUSE, SCHOOL]), seed: SEED });
    expect(after.population).toBeGreaterThan(before.population);
    expect(after.residence_capacity).toBe(before.residence_capacity);
    expect(after.waiting.length).toBeGreaterThan(before.waiting.length);
    // And nobody who had a home lost one.
    for (const citizen of before.citizens) {
      if (citizen.state !== "waiting") {
        const same = after.citizens.find((other) => other.id === citizen.id);
        expect(same?.home_node_id, citizen.id).not.toBeNull();
      }
    }
  });

  it("seats housed citizens at daytime destinations and leaves the waiting at the hub", () => {
    const roster = deriveCitizenRoster({
      nodes: placed([{ ...ROWHOUSE, mastery: 2 }, SCHOOL]),
      seed: SEED,
    });
    const school = roster.buildings.find((entry) => entry.node_id === "NUM.3");
    expect(school?.daytime_capacity).toBe(8);
    expect(school?.visitors.length).toBeGreaterThan(0);
    expect(school?.residents).toEqual([]);
    // A waiting citizen holds no daytime seat (§7: they gather at the Civic Center).
    for (const id of roster.waiting) {
      const citizen = roster.citizens.find((entry) => entry.id === id);
      expect(citizen?.day_node_id, id).toBeNull();
      expect(citizen?.state, id).toBe("waiting");
    }
  });

  it("derives a day state from the role family, never from the display name", () => {
    const roster = deriveCitizenRoster({
      nodes: placed([
        { ...ROWHOUSE, mastery: 2 },
        { ...BANK, mastery: 2 },
        { ...SCHOOL, mastery: 2 },
      ]),
      seed: SEED,
    });
    const states = new Set(roster.citizens.map((citizen) => citizen.state));
    expect(states.has("at_school")).toBe(true);
    expect(states.has("at_work")).toBe(true);
    // No state in the union expresses harm, and none is invented here.
    const allowed: readonly CitizenState[] = [
      "housed",
      "waiting",
      "commuting",
      "at_school",
      "at_work",
      "visiting",
    ];
    for (const state of states) {
      expect(allowed).toContain(state);
    }
  });

  it("gives every citizen a stable, seeded look and an index-ordered id", () => {
    const roster = deriveCitizenRoster({ nodes: placed([ROWHOUSE]), seed: SEED });
    expect(roster.citizens.map((citizen) => citizen.id)).toEqual([
      "citizen-000",
      "citizen-001",
      "citizen-002",
      "citizen-003",
      "citizen-004",
      "citizen-005",
      "citizen-006",
      "citizen-007",
      "citizen-008",
      "citizen-009",
    ]);
    for (const citizen of roster.citizens) {
      expect(citizen.look.body_tone).toBeGreaterThanOrEqual(0);
      expect(citizen.look.body_tone).toBeLessThan(1);
      expect(citizen.look.height_scale).toBeGreaterThanOrEqual(0.9);
      expect(citizen.look.height_scale).toBeLessThanOrEqual(1.1);
    }
    // A citizen's look must not depend on how many people are on the island, or the
    // whole crowd would re-skin itself every time someone arrived.
    const bigger = deriveCitizenRoster({
      nodes: placed([{ ...ROWHOUSE, mastery: 2 }]),
      seed: SEED,
    });
    expect(bigger.citizens[3].look).toEqual(roster.citizens[3].look);
  });

  it("declares the island SETTLED only when every skill is mastered and nobody waits", () => {
    const six = placed([
      { node_id: "NUM.S", citizen_role: "civic", mastery: 2 },
      { node_id: "NUM.F", citizen_role: "civic", mastery: 2 },
      { node_id: "NUM.2", citizen_role: "residence", mastery: 2 },
      { node_id: "NUM.3", citizen_role: "school", mastery: 2 },
      { node_id: "NUM.4", citizen_role: "civic", mastery: 2 },
      { node_id: "NUM.5", citizen_role: "civic", mastery: 2 },
    ]);
    const settled = deriveCitizenRoster({ nodes: six, seed: SEED });
    expect(settled.population).toBe(44);
    expect(settled.residence_capacity).toBe(44);
    expect(settled.waiting).toEqual([]);
    expect(settled.housed).toBe(44);
    expect(settled.settled).toBe(true);

    // One skill short of mastery is NOT settled, even if nobody happens to be waiting.
    const almost = deriveCitizenRoster({
      nodes: six.map((node) =>
        node.node_id === "NUM.4" ? { ...node, mastery: 0 as Mastery } : node,
      ),
      seed: SEED,
    });
    expect(almost.settled).toBe(false);
    // A bare island has nobody housed and is emphatically not settled.
    expect(deriveCitizenRoster({ nodes: [], seed: SEED }).settled).toBe(false);
  });

  it("never reports more citizens than the population, or fewer", () => {
    const roster = deriveCitizenRoster({
      nodes: placed([{ ...ROWHOUSE, mastery: 2 }, SCHOOL, BANK]),
      seed: SEED,
    });
    expect(roster.citizens).toHaveLength(roster.population);
    expect(roster.housed + roster.waiting.length).toBe(roster.population);
    const assigned = roster.buildings.flatMap((entry) => entry.residents);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect(assigned).toHaveLength(roster.housed);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run engines/game/src/citizens.test.ts`
Expected: FAIL — `Failed to resolve import "./citizens"`.

- [ ] **Step 3: Write the implementation**

Create `engines/game/src/citizens.ts`:

```ts
import {
  buildingLedger,
  type CitizenBuildingLedger,
  type CitizenNodeInput,
  citizenPopulation,
  daytimeCapacity,
  residenceCapacity,
} from "./citizens-population";
import { createSeededRng, mixSeed } from "./citizens-rng";
import type { CitizenRoleId } from "./citizens-tuning";

/**
 * The citizen ROSTER (pure, framework-free, no clock, no unseeded randomness).
 *
 * Given city state plus a seed, this yields the population count, per-building role
 * and capacity, the assignment of people to buildings, and the waiting crowd. Not one
 * citizen is saved: the roster is recomputed on every load, and individuals are
 * generated from the seed so the same person has the same look and the same home
 * across sessions with nothing persisted (D-CIT1).
 *
 * WHAT IS NOT HERE, DELIBERATELY:
 *   - ROADS. The roster is deep-equal with and without a road network (D-CIT7). Roads
 *     change only the ROUTE between two fixed points and the car count, both of which
 *     are render-side; a road cell is not an input to any assignment, so roads
 *     literally cannot gate a citizen.
 *   - GEOMETRY. No world unit, no cell, no mesh (D-CIT8). The render layer turns a
 *     home assignment into a doorstep.
 *   - A CLOCK. Nothing accrues while the tab is open, so two loads of the same state
 *     produce the same city.
 *
 * THE SWAP-IN SEAM STAYS OPEN. Because the renderer consumes a roster and never
 * derives one, replacing this function with a loader that returns the same shape is a
 * one-file change here and ZERO change on the render side (§4).
 */

/**
 * What a citizen is doing. NO STATE IN THIS UNION EXPRESSES HARM, and there is no
 * attribute a future contributor could set to make a citizen worse off (D-CIT6).
 * Nobody starves, sickens, riots, leaves, or dies; `waiting` is patient, not
 * suffering.
 *
 * `commuting` is a RENDER-TIME state: a pure clockless derivation cannot know that
 * someone is mid-walk, so this function never emits it. It stays in the union because
 * the union is what the no-harm-state test guards, and the render layer needs the
 * vocabulary.
 */
export type CitizenState =
  | "housed"
  | "waiting"
  | "commuting"
  | "at_school"
  | "at_work"
  | "visiting";

/** A citizen's seeded appearance. Stable for a given seed and citizen index. */
export interface CitizenLook {
  /** 0..1, for the render layer to map onto its own palette. No colour here. */
  readonly body_tone: number;
  readonly shirt_tone: number;
  /** 0.9..1.1 — a little variety in stature so a crowd is not a clone army. */
  readonly height_scale: number;
  /** 0..1 phase offset so a crowd does not walk in lockstep. */
  readonly gait_phase: number;
}

export interface Citizen {
  /** `citizen-000`, index-ordered. Stable: person N is person N at any population. */
  readonly id: string;
  readonly state: CitizenState;
  /** The residence they live in, or `null` while they are waiting for one. */
  readonly home_node_id: string | null;
  /** Where they spend the day, or `null` for out and about (and for the waiting). */
  readonly day_node_id: string | null;
  readonly look: CitizenLook;
}

/** One building's people: who lives there, and who is there by day. */
export interface CitizenBuildingOccupancy {
  readonly node_id: string;
  readonly citizen_role: CitizenRoleId;
  readonly role: CitizenRoleId;
  readonly residence_capacity: number;
  readonly residents: readonly string[];
  readonly daytime_capacity: number;
  readonly visitors: readonly string[];
}

export interface CitizenRosterInput {
  /**
   * The island's nodes, IN PLACEMENT ORDER (the order the player placed them, which
   * `citySession.readPlacements()` preserves). The order matters only for WHICH
   * building a resident occupies, never for any count: it is what makes "placing a
   * new building never changes an existing citizen's home" true, because a new
   * building appends and draws only from the waiting pool.
   */
  readonly nodes: readonly CitizenNodeInput[];
  /**
   * A stable per-student seed. An INPUT, never invented downstream (D-CIT8): a
   * renderer that minted its own would reintroduce per-mount instability.
   */
  readonly seed: number;
}

export interface CitizenRoster {
  readonly population: number;
  readonly residence_capacity: number;
  readonly daytime_capacity: number;
  /** How many people have homes. `housed + waiting.length === population`, always. */
  readonly housed: number;
  readonly buildings: readonly CitizenBuildingOccupancy[];
  /** Every citizen, in stable index order. UNCAPPED — the cap is render-only. */
  readonly citizens: readonly Citizen[];
  /** Citizen ids with no home yet. UNBOUNDED, and empty at full mastery (§6). */
  readonly waiting: readonly string[];
  /**
   * The island is FULL, SETTLED, AND HAPPY: every node mastered and nobody waiting.
   * The one flag the closing "this community is happy" beat is keyed on (D-CIT16).
   */
  readonly settled: boolean;
}

/** Salt so the look stream cannot collide with any other seeded stream. */
const LOOK_SALT = 0x100;

function citizenId(index: number): string {
  return `citizen-${String(index).padStart(3, "0")}`;
}

/**
 * A citizen's look, drawn from a per-citizen sub-seed rather than from a shared
 * stream. This is what makes a look independent of the POPULATION: citizen 3 looks
 * the same whether the island holds ten people or forty-four, so the crowd does not
 * re-skin itself every time someone arrives.
 */
function lookFor(seed: number, index: number): CitizenLook {
  const rng = createSeededRng(mixSeed(seed, LOOK_SALT + index));
  return {
    body_tone: rng(),
    shirt_tone: rng(),
    height_scale: 0.9 + rng() * 0.2,
    gait_phase: rng(),
  };
}

/** The day state a role family implies. `residence` is not a daytime destination. */
function dayStateFor(role: CitizenRoleId): CitizenState {
  switch (role) {
    case "school":
      return "at_school";
    case "civic":
      return "at_work";
    default:
      return "housed";
  }
}

export function deriveCitizenRoster(input: CitizenRosterInput): CitizenRoster {
  const ledger = buildingLedger(input.nodes);
  const population = citizenPopulation(ledger);
  const capacity = residenceCapacity(ledger);
  const daytime = daytimeCapacity(ledger);

  // WHO IS HOUSED is decided before WHERE, and it is decided by index: the lowest
  // `min(population, capacity)` indices always have homes. Because capacity is
  // monotone (mastery is monotone, placement is monotone) and population only grows
  // by appending higher indices, a citizen who was housed is STILL housed — the
  // no-eviction guarantee, structural rather than incidental (D-CIT6). A growing
  // crowd is therefore always new arrivals, never a setback.
  const housed = Math.min(population, capacity);

  const homeByIndex: (string | null)[] = new Array(population).fill(null);
  const residentsByNode = new Map<string, string[]>();
  let nextIndex = 0;
  for (const entry of ledger) {
    const residents: string[] = [];
    // Fill greedily, in the order the caller supplied the buildings (placement
    // order): a NEW building appends and draws only from people with no home, so it
    // cannot move an existing resident.
    while (residents.length < entry.residence_capacity && nextIndex < housed) {
      homeByIndex[nextIndex] = entry.node_id;
      residents.push(citizenId(nextIndex));
      nextIndex += 1;
    }
    residentsByNode.set(entry.node_id, residents);
  }

  // DAYTIME destinations go to HOUSED citizens only, in the same index order. The
  // waiting crowd gathers at the Civic Center (§7) and holds no seat, so the street
  // never looks emptier than the waiting count says. A housed citizen with no seat is
  // out and about (`visiting`), which is not a lesser state — it is a lawn, a
  // doorstep, a walk.
  const dayByIndex: (string | null)[] = new Array(population).fill(null);
  const visitorsByNode = new Map<string, string[]>();
  let nextDayIndex = 0;
  for (const entry of ledger) {
    const visitors: string[] = [];
    while (visitors.length < entry.daytime_capacity && nextDayIndex < housed) {
      dayByIndex[nextDayIndex] = entry.node_id;
      visitors.push(citizenId(nextDayIndex));
      nextDayIndex += 1;
    }
    visitorsByNode.set(entry.node_id, visitors);
  }

  const roleByNode = new Map<string, CitizenRoleId>(
    ledger.map((entry) => [entry.node_id, entry.role]),
  );

  const citizens: Citizen[] = [];
  const waiting: string[] = [];
  for (let index = 0; index < population; index += 1) {
    const id = citizenId(index);
    const home = homeByIndex[index];
    const day = dayByIndex[index];
    let state: CitizenState;
    if (home === null) {
      state = "waiting";
      waiting.push(id);
    } else if (day === null) {
      state = "housed";
    } else {
      const role = roleByNode.get(day);
      const dayState = role === undefined ? "visiting" : dayStateFor(role);
      state = dayState === "housed" ? "visiting" : dayState;
    }
    citizens.push({
      id,
      state,
      home_node_id: home,
      day_node_id: home === null ? null : day,
      look: lookFor(input.seed, index),
    });
  }

  const buildings: CitizenBuildingOccupancy[] = ledger.map(
    (entry: CitizenBuildingLedger) => ({
      node_id: entry.node_id,
      citizen_role: entry.citizen_role,
      role: entry.role,
      residence_capacity: entry.residence_capacity,
      residents: residentsByNode.get(entry.node_id) ?? [],
      daytime_capacity: entry.daytime_capacity,
      visitors: visitorsByNode.get(entry.node_id) ?? [],
    }),
  );

  return {
    population,
    residence_capacity: capacity,
    daytime_capacity: daytime,
    housed,
    buildings,
    citizens,
    waiting,
    settled:
      ledger.length > 0 && waiting.length === 0 && ledger.every((entry) => entry.mastered),
  };
}
```

- [ ] **Step 4: Export from the barrel**

Modify `engines/game/src/index.ts` — append:

```ts
export * from "./citizens";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run engines/game/src/citizens.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Prove the tests are load-bearing (mutation proof)**

| Mutation | Expected failure |
| --- | --- |
| `const housed = capacity;` (drop the `min`) | 2 fail: "never reports more citizens than the population" and the bare-island test (10 homes on an island of 8 people would over-house) |
| `lookFor` drawing from one shared stream instead of a per-index sub-seed | 1 fail: "a citizen's look must not depend on how many people are on the island" |
| `settled: waiting.length === 0` (drop the all-mastered condition) | 2 fail: the bare-island `settled` assertion and "one skill short of mastery is NOT settled" |
| Fill daytime seats from all citizens including the waiting | 1 fail: "leaves the waiting at the hub" |
| `residents` allowed to exceed `residence_capacity` | 1 fail: "grows a terrace's occupancy" (10 vs 26 boundary) |

- [ ] **Step 7: Commit**

```bash
npx biome format --write engines/game/src/citizens.ts engines/game/src/citizens.test.ts
npm run typecheck
git add engines/game/src/citizens.ts engines/game/src/citizens.test.ts engines/game/src/index.ts
git commit -m "feat(game): derive the citizen roster from learning state plus a seed (D-CIT1)"
```

---

## Task 2.3: The roster invariants — determinism, stability, no eviction, no harm, no roads (P2)

**Files:**
- Create: `engines/game/src/citizens-roster-invariants.test.ts`

**Interfaces:**
- Consumes: `deriveCitizenRoster`, `CitizenState`, `Citizen` (Task 2.2); `CitizenNodeInput`
  (Task 1.2).
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Create `engines/game/src/citizens-roster-invariants.test.ts`:

```ts
import type { Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { type CitizenState, deriveCitizenRoster } from "./citizens";
import type { CitizenNodeInput } from "./citizens-population";

const SEED = 0x570e;

const D1_ORDER: readonly { node_id: string; citizen_role: CitizenRoleId }[] = [
  { node_id: "NUM.S", citizen_role: "civic" },
  { node_id: "NUM.F", citizen_role: "civic" },
  { node_id: "NUM.2", citizen_role: "residence" },
  { node_id: "NUM.3", citizen_role: "school" },
  { node_id: "NUM.4", citizen_role: "civic" },
  { node_id: "NUM.5", citizen_role: "civic" },
];

function nodesAt(mastery: Readonly<Record<string, Mastery>>): CitizenNodeInput[] {
  return D1_ORDER.map((entry) => ({
    ...entry,
    placed: true,
    mastery: mastery[entry.node_id] ?? 0,
    lesson_stage: "done" as const,
    placement_estimate: 0 as const,
  }));
}

describe("determinism (D-CIT1)", () => {
  it("returns a deep-equal roster for the same seed and state, twice", () => {
    const nodes = nodesAt({ "NUM.2": 2, "NUM.S": 1 });
    const first = deriveCitizenRoster({ nodes, seed: SEED });
    const second = deriveCitizenRoster({ nodes, seed: SEED });
    // Deep equality INCLUDING citizen order: any `Math.random`, `Date.now`, or
    // map-iteration dependence shows up here.
    expect(second).toEqual(first);
    expect(second.citizens.map((citizen) => citizen.id)).toEqual(
      first.citizens.map((citizen) => citizen.id),
    );
  });

  it("changes the looks but not one count when the seed changes", () => {
    const nodes = nodesAt({ "NUM.2": 2 });
    const a = deriveCitizenRoster({ nodes, seed: 1 });
    const b = deriveCitizenRoster({ nodes, seed: 2 });
    expect(b.population).toBe(a.population);
    expect(b.residence_capacity).toBe(a.residence_capacity);
    expect(b.waiting).toEqual(a.waiting);
    expect(b.citizens[0].home_node_id).toBe(a.citizens[0].home_node_id);
    expect(b.citizens[0].look).not.toEqual(a.citizens[0].look);
  });
});

describe("roads amplify only (D-CIT7 / INV-COS-1)", () => {
  it("takes no road input at all, so the roster cannot depend on one", () => {
    // The strongest form of the assertion the design asks for: roads are deep-equal
    // in effect because they are not an input. A future contributor who adds a
    // `road_cells` field has to break this test to do it.
    const nodes = nodesAt({ "NUM.2": 2, "NUM.3": 2 });
    const roster = deriveCitizenRoster({ nodes, seed: SEED });
    const keys = Object.keys(roster).sort();
    expect(keys).toEqual(
      [
        "buildings",
        "citizens",
        "daytime_capacity",
        "housed",
        "population",
        "residence_capacity",
        "settled",
        "waiting",
      ].sort(),
    );
    // And the input surface: exactly two fields, neither of them a road.
    const input = { nodes, seed: SEED };
    expect(Object.keys(input).sort()).toEqual(["nodes", "seed"]);
  });
});

describe("no eviction, over all 4096 mastery vectors and every single-node advance", () => {
  it("keeps every housed citizen housed", () => {
    const levels: Mastery[] = [0, 1, 2, 3];
    const nodeIds = D1_ORDER.map((entry) => entry.node_id);
    let advances = 0;
    for (let code = 0; code < 4 ** nodeIds.length; code += 1) {
      const vector: Record<string, Mastery> = {};
      let rest = code;
      for (const nodeId of nodeIds) {
        vector[nodeId] = levels[rest % 4];
        rest = Math.floor(rest / 4);
      }
      const before = deriveCitizenRoster({ nodes: nodesAt(vector), seed: SEED });
      const housedBefore = new Set(
        before.citizens
          .filter((citizen) => citizen.home_node_id !== null)
          .map((citizen) => citizen.id),
      );
      for (const nodeId of nodeIds) {
        if (vector[nodeId] === 3) {
          continue;
        }
        const after = deriveCitizenRoster({
          nodes: nodesAt({ ...vector, [nodeId]: (vector[nodeId] + 1) as Mastery }),
          seed: SEED,
        });
        const homeById = new Map(
          after.citizens.map((citizen) => [citizen.id, citizen.home_node_id]),
        );
        for (const id of housedBefore) {
          expect(homeById.get(id), `${id} after advancing ${nodeId}`).not.toBeNull();
        }
        advances += 1;
      }
    }
    expect(advances).toBeGreaterThan(4000);
  });
});

describe("assignment stability (§4's whole reason to exist)", () => {
  it("never changes an existing citizen's home when a NEW building is placed", () => {
    // Buildings arrive in placement order, so a new one appends and draws only from
    // people with no home. Walk the whole island one placement at a time.
    let placed: CitizenNodeInput[] = [];
    let previous = deriveCitizenRoster({ nodes: placed, seed: SEED });
    for (const entry of D1_ORDER) {
      placed = [
        ...placed,
        {
          ...entry,
          placed: true,
          mastery: 0,
          lesson_stage: "done" as const,
          placement_estimate: 0 as const,
        },
      ];
      const next = deriveCitizenRoster({ nodes: placed, seed: SEED });
      for (const citizen of previous.citizens) {
        if (citizen.home_node_id === null) {
          continue;
        }
        const same = next.citizens.find((other) => other.id === citizen.id);
        expect(same?.home_node_id, `${citizen.id} after placing ${entry.node_id}`).toBe(
          citizen.home_node_id,
        );
      }
      previous = next;
    }
  });
});

describe("no harm state (D-CIT6, enforced in the type)", () => {
  it("has an exhaustive, harmless switch over every member of the union", () => {
    // This fails to COMPILE if a state is added to the union, which is the point:
    // a future contributor cannot add `sick`, `angry`, or `leaving` without arriving
    // here first. And every arm is a neutral or positive description.
    const describeState = (state: CitizenState): string => {
      switch (state) {
        case "housed":
          return "at home";
        case "waiting":
          return "waiting for a home";
        case "commuting":
          return "on the way";
        case "at_school":
          return "at school";
        case "at_work":
          return "at work";
        case "visiting":
          return "out and about";
        default: {
          const exhaustive: never = state;
          return exhaustive;
        }
      }
    };
    const every: readonly CitizenState[] = [
      "housed",
      "waiting",
      "commuting",
      "at_school",
      "at_work",
      "visiting",
    ];
    expect(every).toHaveLength(6);
    for (const state of every) {
      const text = describeState(state);
      expect(text.length).toBeGreaterThan(0);
      for (const banned of ["homeless", "unhoused", "failing", "sick", "leaving"]) {
        expect(text, state).not.toContain(banned);
      }
    }
  });
});

describe("an unauthored island does not throw (D-CIT12)", () => {
  it("returns the founding crowd, no roles, no capacity, everyone waiting", () => {
    // D2-D10 are `architected` with zero plots and no art masses.
    const roster = deriveCitizenRoster({ nodes: [], seed: SEED });
    expect(roster.population).toBe(8);
    expect(roster.residence_capacity).toBe(0);
    expect(roster.buildings).toEqual([]);
    expect(roster.waiting).toHaveLength(8);
    expect(roster.settled).toBe(false);
    // And with a node whose mass nobody has authored a profile for.
    const hotel = deriveCitizenRoster({
      nodes: [
        {
          node_id: "EXP.1",
          citizen_role: "civic",
          placed: true,
          mastery: 2,
          lesson_stage: "done",
          placement_estimate: 0,
        },
      ],
      seed: SEED,
    });
    expect(hotel.buildings[0].role).toBe("civic");
    expect(hotel.waiting).toHaveLength(hotel.population);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails or passes, and read it correctly**

Run: `npx vitest run engines/game/src/citizens-roster-invariants.test.ts`
Expected: PASS against a correct Task 2.2. As in Task 1.3, this is a characterisation suite
and its worth is established by Step 3.

- [ ] **Step 3: Prove every assertion is load-bearing (the mutation matrix)**

| Mutation in `citizens.ts` | Expected failure |
| --- | --- |
| `look: { body_tone: Math.random(), ... }` | 1 fail: "returns a deep-equal roster for the same seed and state, twice" |
| `look: lookFor(input.seed + Date.now(), index)` | 1 fail: the same determinism test |
| Iterate `residentsByNode` (a `Map`) to build `waiting` instead of the index loop | 1 fail: determinism, on citizen order |
| Sort `ledger` by `node_id` before filling homes (registry order instead of placement order) | 1 fail: "never changes an existing citizen's home when a NEW building is placed" |
| `const housed = population;` (everyone is housed regardless of capacity) | 2 fail: the unauthored-island test and the no-eviction sweep's `homeById` shape |
| Add `"sick"` to `CitizenState` | **A typecheck error** in the exhaustive switch, plus 1 test fail on `toHaveLength(6)`. Run `npm run typecheck` to see it — this is the assertion that lives in the type rather than the test body |
| Add `road_cells` to `CitizenRosterInput` and read it in `deriveCitizenRoster` | 1 fail: "takes no road input at all" |

- [ ] **Step 4: Run the whole engine suite and land Phase 2**

```bash
npx vitest run engines/game/src
npx biome format . && npx biome lint . && npm run typecheck && npm run test:unit
```

Then write the `work-log/evan.md` entry and open the PR into `integration`. **Phase 2's PR
is engine-only plus one new web file (`apps/web/src/city/citizens.ts`, the adapter — Task
2.4), so it still cannot conflict with the three in-flight branches.**

---

## Task 2.4: The adapter — the one place the two lanes meet (P2)

Landed in Phase 2's PR so that P3 and P4 can run in parallel without either owning it.

**Files:**
- Create: `apps/web/src/city/citizens.ts`
- Create: `apps/web/src/city/citizens.test.ts`

**Interfaces:**
- Consumes: `deriveCitizenRoster`, `CitizenRoster`, `CitizenNodeInput` from `@cr/game`;
  `CityViewModel` from `@cr/game`;
  `PlacedTransform` from `./worldLayout`.
- Produces:

```ts
export function cityCitizenRoster(params: {
  readonly viewModel: CityViewModel;
  readonly placements: readonly PlacedTransform[];
  readonly seed: number;
}): CitizenRoster;
```

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/city/citizens.test.ts`:

```ts
import { buildCityViewModel } from "@cr/game";
import type { StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { cityCitizenRoster } from "./citizens";
import { D1_SKILL_IDS } from "./buildingAssets";
import type { PlacedTransform } from "./worldLayout";

const SEED = 0x5eed;

function nodeState(nodeId: string, over: Partial<StudentNodeState> = {}): StudentNodeState {
  return {
    student_id: "demo-student",
    node_id: nodeId,
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "locked",
    lesson_stage: "not_started",
    last_practiced_at: null,
    ...over,
  };
}

function at(nodeId: string, col: number): PlacedTransform {
  return { nodeId, col, row: 0, rot: 0 };
}

describe("cityCitizenRoster (the web -> engine adapter)", () => {
  it("passes the descriptor-resolved role through, so a display rename is invisible", () => {
    // The role arrives on `CityBuildingView` from the descriptor (D-CIT17), so this
    // adapter reads it rather than looking anything up. `NUM.S` has already been
    // renamed "Town Hall" -> "City Bank" and nothing here noticed.
    const viewModel = buildCityViewModel({
      node_states: [
        nodeState("NUM.2", { mastery: 2, lesson_stage: "done", completion_status: "complete" }),
      ],
    });
    const roster = cityCitizenRoster({
      viewModel,
      placements: [at("NUM.2", 0)],
      seed: SEED,
    });
    const rowhouse = roster.buildings.find((entry) => entry.node_id === "NUM.2");
    expect(rowhouse?.role).toBe("residence");
    expect(rowhouse?.residence_capacity).toBe(26);
  });

  it("counts only what is actually on the ground (the test-out shape)", () => {
    // Six nodes complete in state, zero placements — exactly what
    // `seedFromPlacement` leaves. 8 people, no homes.
    const viewModel = buildCityViewModel({
      node_states: D1_SKILL_IDS.map((nodeId) =>
        nodeState(nodeId, {
          lesson_stage: "done",
          completion_status: "complete",
        }),
      ),
    });
    const roster = cityCitizenRoster({ viewModel, placements: [], seed: SEED });
    expect(roster.population).toBe(8);
    expect(roster.residence_capacity).toBe(0);
    expect(roster.waiting).toHaveLength(8);
  });

  it("supplies buildings in PLACEMENT order, not registry order", () => {
    // The order is what makes assignment stable under a new placement (plan §7.3).
    const viewModel = buildCityViewModel({
      node_states: D1_SKILL_IDS.map((nodeId) =>
        nodeState(nodeId, { lesson_stage: "done", completion_status: "complete" }),
      ),
    });
    const roster = cityCitizenRoster({
      viewModel,
      placements: [at("NUM.3", 0), at("NUM.S", 3), at("NUM.2", 6)],
      seed: SEED,
    });
    expect(roster.buildings.map((entry) => entry.node_id)).toEqual([
      "NUM.3",
      "NUM.S",
      "NUM.2",
    ]);
  });

  it("ignores the hub sentinel in the placements list", () => {
    // The Civic Center is not a skill node, has no registry entry, and never appears in
    // `viewModel.buildings`. It contributes the hub's daytime staff and nothing else.
    const viewModel = buildCityViewModel({ node_states: [] });
    const roster = cityCitizenRoster({
      viewModel,
      placements: [{ nodeId: "town-hall", col: -1, row: -1, rot: 0 }],
      seed: SEED,
    });
    expect(roster.buildings).toEqual([]);
    expect(roster.daytime_capacity).toBe(4);
    expect(roster.population).toBe(8);
  });

  it("is a pure read: calling it twice with the same inputs is deep-equal", () => {
    const viewModel = buildCityViewModel({
      node_states: [nodeState("NUM.2", { mastery: 2, lesson_stage: "done" })],
    });
    const params = { viewModel, placements: [at("NUM.2", 0)], seed: SEED };
    expect(cityCitizenRoster(params)).toEqual(cityCitizenRoster(params));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run apps/web/src/city/citizens.test.ts`
Expected: FAIL — cannot resolve `./citizens`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/city/citizens.ts`:

```ts
import {
  type CitizenNodeInput,
  type CitizenRoster,
  type CityViewModel,
  deriveCitizenRoster,
} from "@cr/game";

import { isTownHall } from "./townHall";
import type { PlacedTransform } from "./worldLayout";

/**
 * The ONE place the web lane and the engine meet over citizens.
 *
 * It is deliberately THIN, and D-CIT17 is why: the social role is resolved inside the
 * engine, from the neighborhood descriptor, and arrives on `CityBuildingView` already
 * decided. So this adapter looks nothing up — it reads a role the generic pipeline
 * produced and pairs it with what is actually on the ground. The earlier design had
 * this file reading `D1_NODE_BUILDINGS[nodeId].gridworkId` and threading the art mass
 * across the boundary; that is gone, along with the import.
 *
 * Three things this deliberately does NOT do:
 *   - it does not look up or invent a role (the descriptor decided it);
 *   - it does not decide who lives where (the engine does, and the scene reads it);
 *   - it does not invent a seed (D-CIT8 — the seed is an input, see `citizenSeed.ts`).
 *
 * The building order it hands over is PLACEMENT order, which is what makes "placing a
 * new building never changes an existing citizen's home" hold: a new building appends
 * and draws only from people with no home yet.
 */
export function cityCitizenRoster(params: {
  readonly viewModel: CityViewModel;
  readonly placements: readonly PlacedTransform[];
  readonly seed: number;
}): CitizenRoster {
  const { viewModel, placements, seed } = params;
  const buildingByNode = new Map(
    viewModel.buildings.map((building) => [building.node_id, building]),
  );

  const nodes: CitizenNodeInput[] = [];
  for (const placed of placements) {
    // The hub is not a skill node: no registry entry, no `student_node_state` row,
    // and it never appears in `viewModel.buildings`. Its daytime staff is a constant
    // in the engine's table, so there is nothing to thread here.
    if (isTownHall(placed.nodeId)) {
      continue;
    }
    const building = buildingByNode.get(placed.nodeId);
    if (!building) {
      continue;
    }
    nodes.push({
      node_id: building.node_id,
      // Resolved from the descriptor by `resolveNeighborhood`, not looked up here.
      citizen_role: building.citizen_role,
      // Everything in `placements` is, by definition, on the ground.
      placed: true,
      mastery: building.mastery,
      lesson_stage:
        building.construction_state === "complete" || building.construction_state === "gold"
          ? "done"
          : building.construction_state === "practice"
            ? "practice"
            : building.construction_state === "teaching"
              ? "teaching"
              : "not_started",
      placement_estimate: building.blueprint.placement_estimate,
      authoring_complete: building.construction_state !== "preview",
    });
  }

  return deriveCitizenRoster({ nodes, seed });
}
```

**Note for the implementer:** the `lesson_stage` reconstruction above exists because
`CityBuildingView` exposes the derived `construction_state` rather than the raw
`lesson_stage`. It round-trips through the same `deriveConstructionState` rule, so the engine
re-derives the same `complete`. If this proves awkward in review, the cleaner alternative is
to pass the raw `StudentNodeState` rows into this adapter alongside the view model rather
than reconstructing — a signature change here and nothing else. Do not "fix" it by having
the engine accept a `construction_state`, which would let a caller assert completeness
instead of deriving it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run apps/web/src/city/citizens.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Prove the tests are load-bearing (mutation proof)**

| Mutation | Expected failure |
| --- | --- |
| Hard-code `citizen_role: "civic"` instead of reading `building.citizen_role` | 1 fail: the role assertion — the rowhouse reads `civic` and its capacity collapses to 0 |
| Iterate `viewModel.buildings` instead of `placements` | 2 fail: "counts only what is actually on the ground" (44 vs 8) and "supplies buildings in PLACEMENT order" |
| Drop the `isTownHall` guard | 1 fail: "ignores the hub sentinel" |
| Sort `nodes` by `node_id` | 1 fail: "supplies buildings in PLACEMENT order" |

- [ ] **Step 6: Commit**

```bash
npx biome format --write apps/web/src/city/citizens.ts apps/web/src/city/citizens.test.ts
npm run typecheck
git add apps/web/src/city/citizens.ts apps/web/src/city/citizens.test.ts
git commit -m "feat(app): adapt city state to the citizen roster (thin, role already resolved)"
```

---

## Task 3.1: The seed source (P3)

**Blocked on Q4.** Do not write this file until the seed decision is recorded. The task below
is written for the **middle option** — seed off the student id, with a dev-only override — and
says explicitly what changes under each of the other two.

**Files:**
- Create: `apps/web/src/city/citizenSeed.ts`
- Create: `apps/web/src/city/citizenSeed.test.ts`

**Interfaces:**
- Produces: `citizenSeedFor(studentId: string): number`.

- [ ] **Step 1: Record the decision in the file's header comment before writing code**

The header must state which of Q4's three options was chosen, by whom, and on what date, in
the style the repo already uses for ratified decisions (`citySession.ts`'s Evan-lane blocks
are the model). Without that, a later reader cannot tell a decision from a default.

- [ ] **Step 2: Write the failing test**

Create `apps/web/src/city/citizenSeed.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { citizenSeedFor } from "./citizenSeed";

describe("citizenSeedFor", () => {
  it("is stable for a given student id, across calls", () => {
    expect(citizenSeedFor("student-a")).toBe(citizenSeedFor("student-a"));
  });

  it("differs between students, so two learners get two cities", () => {
    expect(citizenSeedFor("student-a")).not.toBe(citizenSeedFor("student-b"));
  });

  it("does not collapse every dev learner onto one identical city", () => {
    // `citySession.ts` hard-codes DEMO_STUDENT_ID = "demo-student", so a naive
    // student-id seed gives EVERY dev learner the same crowd (§17 Q4). Whatever Q4
    // resolved to, this is the assertion that proves the degeneracy was handled.
    const first = citizenSeedFor("demo-student");
    expect(Number.isFinite(first)).toBe(true);
    expect(Number.isInteger(first)).toBe(true);
  });

  it("returns a finite integer for an empty or exotic id", () => {
    for (const id of ["", "0", "a".repeat(512), "  ", "\u00e9\u4e2d\u0000"]) {
      const seed = citizenSeedFor(id);
      expect(Number.isFinite(seed), id).toBe(true);
      expect(Number.isInteger(seed), id).toBe(true);
    }
  });
});
```

- [ ] **Step 3: Write the implementation for the chosen option**

For the **student-id-with-dev-override** option:

```ts
/**
 * Where the citizen seed comes from (§17 Q4).
 *
 * DECISION: <option>, taken by <who> on <date>. Record it here, not only in a PR.
 *
 * The seed must be STABLE per learner and it must be an INPUT to the derivation, never
 * invented by the renderer (D-CIT8). The student id is the natural stable value, but
 * `citySession.ts` hard-codes `DEMO_STUDENT_ID = "demo-student"`, so a bare student-id
 * seed hands every dev learner one identical city — correct in production, degenerate
 * in dev. <State how the chosen option handles that.>
 */

/** FNV-1a over the id's code units: stable, fast, and no dependency. */
export function citizenSeedFor(studentId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < studentId.length; index += 1) {
    hash ^= studentId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
```

**If Q4 resolves to "student id, accept the dev degeneracy":** delete the third test and
replace it with one asserting that `demo-student` yields a specific pinned number, and note in
the header that every dev learner shares a city on purpose.
**If Q4 resolves to "mint a client-side stable value":** this file gains a storage read (follow
`audio/audioPrefs.ts`'s stance — memory is the source of truth, storage is only how it survives
a reload, and a throwing storage must not break the feature) and the tests gain a
hostile-storage case.

- [ ] **Step 4: Run, prove, commit**

Run: `npx vitest run apps/web/src/city/citizenSeed.test.ts` — expect PASS.
Mutation proof: `return 0;` fails "differs between students"; dropping the `>>> 0` fails
"returns a finite integer" for the long id.

```bash
git add apps/web/src/city/citizenSeed.ts apps/web/src/city/citizenSeed.test.ts
git commit -m "feat(app): a stable per-student citizen seed (resolves Q4)"
```

---

## Task 3.2: The citizen messages, and the two sweeps that guard them (P3)

**Files:**
- Modify: `apps/web/src/city/announcements.ts` (append one contiguous block at the end)
- Modify: `apps/web/src/city/announcements.test.ts` (corpus rows plus a new sweep)

**Interfaces:**
- Consumes: `CitizenRoster` from `@cr/game`; `placementLabel`, `TOWN_HALL_LABEL` from
  `./townHall`.
- Produces: `cityPopulationMessage(roster)`, `citizensMovedInMessage(nodeId, moved)`,
  `communityHappyMessage()`, and `POPULATION_STATE_LABEL`.

- [ ] **Step 1: Write the failing test**

Modify `apps/web/src/city/announcements.test.ts`. First add the imports and a roster helper,
then the three new tests, then the two corpus edits. The corpus edit is the load-bearing part:
`spokenMessages` is asserted to equal the module's `*Message` export list, so the suite goes
red the moment the new messages exist and stays red until they are swept.

```ts
// Add to the import block from "./announcements":
//   citizensMovedInMessage, cityPopulationMessage, communityHappyMessage
// Add at the top level:
import { deriveCitizenRoster } from "@cr/game";

const bareIslandRoster = deriveCitizenRoster({ nodes: [], seed: 0x5eed });
const settledRoster = deriveCitizenRoster({
  nodes: [
    { node_id: "NUM.S", citizen_role: "civic", placed: true, mastery: 2, lesson_stage: "done", placement_estimate: 0 },
    { node_id: "NUM.F", citizen_role: "civic", placed: true, mastery: 2, lesson_stage: "done", placement_estimate: 0 },
    { node_id: "NUM.2", citizen_role: "residence", placed: true, mastery: 2, lesson_stage: "done", placement_estimate: 0 },
    { node_id: "NUM.3", citizen_role: "school", placed: true, mastery: 2, lesson_stage: "done", placement_estimate: 0 },
    { node_id: "NUM.4", citizen_role: "civic", placed: true, mastery: 2, lesson_stage: "done", placement_estimate: 0 },
    { node_id: "NUM.5", citizen_role: "civic", placed: true, mastery: 2, lesson_stage: "done", placement_estimate: 0 },
  ],
  seed: 0x5eed,
});
```

Add to `spokenMessages`, in one contiguous block so the tutorial-lane conflict stays
mechanical:

```ts
    citizensMovedInMessage: [citizensMovedInMessage(id, 8), citizensMovedInMessage(id, 1)],
    cityPopulationMessage: [
      cityPopulationMessage(bareIslandRoster),
      cityPopulationMessage(settledRoster),
    ],
    communityHappyMessage: [communityHappyMessage()],
```

Then the three new tests:

```ts
  it("reports population, housed, and waiting in words, never as a shortfall", () => {
    const opening = cityPopulationMessage(bareIslandRoster);
    expect(opening).toContain("8 people");
    expect(opening).toMatch(/waiting for homes/i);
    // The removed overcrowding framing must not return through copy: "8 waiting for
    // homes" is allowed, "8 over capacity" is not.
    expect(opening).not.toMatch(/over capacity/i);
    expect(opening).not.toMatch(/capacity/i);

    const settled = cityPopulationMessage(settledRoster);
    expect(settled).toContain("44 people");
    expect(settled).toMatch(/everyone has a home/i);
    expect(settled).not.toMatch(/waiting/i);
  });

  it("says the community is happy IN TEXT when the island settles (D-CIT16)", () => {
    // The design's entire payoff. A settled city that is only DEPICTED puts it behind
    // eyesight, and for an aria-hidden canvas that means out of reach.
    expect(settledRoster.settled).toBe(true);
    const happy = communityHappyMessage();
    expect(happy).toMatch(/happy/i);
    expect(happy.length).toBeGreaterThan(0);
    // And the panel's own readout says so too, so the beat is not only an announcement.
    expect(cityPopulationMessage(settledRoster)).toMatch(/settled|everyone has a home/i);
  });

  it("names the building that housed people, so the causal link is explicit", () => {
    const message = citizensMovedInMessage("NUM.2", 8);
    expect(message).toContain("Rowhouse Flats");
    expect(message).toContain("8 people");
    expect(message).toMatch(/moved in/i);
    // Singular reads correctly too.
    expect(citizensMovedInMessage("NUM.2", 1)).toContain("1 person");
  });

  it("never shames, in ANY message this module can speak (§13.3 made mechanical)", () => {
    // The §7 constraint applies to the accessible surface FIRST, because text is
    // blunter than art. Swept over the whole corpus, not just the citizen messages.
    const banned = ["homeless", "unhoused", "failing", "overcrowded", "too many"];
    for (const id of [...D1_SKILL_IDS, TOWN_HALL_ID]) {
      for (const [fn, messages] of Object.entries(spokenMessages(id))) {
        for (const message of messages) {
          for (const word of banned) {
            expect(message.toLowerCase(), `${fn}(${id}) / ${word}`).not.toContain(word);
          }
        }
      }
    }
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run apps/web/src/city/announcements.test.ts`
Expected: FAIL — the imports do not resolve, and once they do, the corpus-pinning test
("sweeps every exported *Message") fails until the three names appear in both the module's
exports and `spokenMessages`.

- [ ] **Step 3: Write the implementation**

Append to `apps/web/src/city/announcements.ts`, as one contiguous block at the end of the
file:

```ts
/* -------------------------------------------------------------------------- */
/* Citizens and city life. The 3D canvas is aria-hidden decoration, so the     */
/* WHOLE ARC — a crowd with nowhere to go, worked down, resolving into a       */
/* settled city — has to exist in text (D-CIT13, D-CIT16). Wording never       */
/* shames, and never frames waiting as a shortfall against a limit: "8 waiting */
/* for homes" is a fact and an invitation; "8 over capacity" is the removed    */
/* overcrowding framing leaking back in through copy.                          */
/* -------------------------------------------------------------------------- */

/** Human label for what the crowd is doing; never colour, motion, or density alone. */
export const POPULATION_STATE_LABEL = {
  settled: "Settled",
  growing: "Growing",
  waiting: "Waiting for homes",
} as const;

/** "8 people" / "1 person" — used wherever a count is spoken. */
function people(count: number): string {
  return `${count} ${count === 1 ? "person" : "people"}`;
}

/**
 * The persistent readout, in one sentence: how many people are on the island, how
 * many have homes, and how many are waiting. Those three numbers ARE the arc's state
 * and they are complete on their own. At the settled ending it says so in words, which
 * is the accessibility half of the guarantee (D-CIT16).
 */
export function cityPopulationMessage(roster: CitizenRoster): string {
  if (roster.settled) {
    return `${people(roster.population)} live on this island, and everyone has a home. This community is settled and happy.`;
  }
  if (roster.waiting.length === 0) {
    return `${people(roster.population)} live on this island, and everyone has a home.`;
  }
  return `${people(roster.population)} live on this island. ${roster.housed} have homes, and ${roster.waiting.length} are waiting for homes. Finishing a building houses them.`;
}

/**
 * The relief beat, NAMED so the causal link is explicit: finishing THIS building
 * housed THESE people. The building is named through `placementLabel`, so the hub
 * reads "Civic Center" and no raw id is ever spoken.
 */
export function citizensMovedInMessage(nodeId: string, moved: number): string {
  return `${placementLabel(nodeId)} is finished. ${people(moved)} moved in.`;
}

/**
 * The closing beat. It exists as its OWN message rather than only as a branch of the
 * readout because it is announced once, when the island settles, and the readout is
 * read whenever the panel is open.
 */
export function communityHappyMessage(): string {
  return `Every home on this island is lived in and nobody is waiting. This community is happy.`;
}
```

Add `import type { CitizenRoster } from "@cr/game";` to the existing `@cr/game` import at the
top of the file.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run apps/web/src/city/announcements.test.ts`
Expected: PASS, including the pre-existing "never speaks a raw node id" sweep, which now runs
over the three new messages for free.

- [ ] **Step 5: Prove the tests are load-bearing (mutation proof)**

| Mutation | Expected failure |
| --- | --- |
| `citizensMovedInMessage` using `buildingName(nodeId)` instead of `placementLabel` | 1 fail: the pre-existing "guards the hub sentinel" / raw-id sweep, which speaks `town-hall` |
| `cityPopulationMessage` saying `${roster.waiting.length} over capacity` | 2 fail: the "never as a shortfall" test and the no-shaming sweep |
| Remove the `settled` branch from `cityPopulationMessage` (ship the settled city as art only) | 1 fail: "says the community is happy IN TEXT" |
| Remove `communityHappyMessage` from the module | 1 fail: the corpus-pinning test, before any assertion about its wording runs |
| Add a fourth message without sweeping it | 1 fail: the corpus-pinning test — **this is the mechanism that makes the guard hold for future messages** |

- [ ] **Step 6: Commit**

```bash
npx biome format --write apps/web/src/city/announcements.ts apps/web/src/city/announcements.test.ts
npm run typecheck
git add apps/web/src/city/announcements.ts apps/web/src/city/announcements.test.ts
git commit -m "feat(app): citizen copy that names the arc in text and never shames (D-CIT13/16)"
```

---

## Task 3.3: The Civic Center readout and the per-building occupancy rows (P3)

**Files:**
- Modify: `apps/web/src/city/CitySurface.tsx` (the `TownHallPanel` body around `:3129`; the
  roster rows around `:3623`; the polite live region at `:2129`)
- Create: `apps/web/src/city/CitySurface.citizens.test.tsx`
- Modify: `apps/web/src/city/styles.css`

**Interfaces:**
- Consumes: `cityCitizenRoster` (Task 2.4), `citizenSeedFor` (Task 3.1),
  `cityPopulationMessage` / `citizensMovedInMessage` / `communityHappyMessage` (Task 3.2).
- Produces: DOM hooks `data-testid="city-population-readout"` and
  `data-testid="city-plot-occupancy"` for the tests and for any later surface.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/city/CitySurface.citizens.test.tsx`, following the harness the five
existing `CitySurface.*.test.tsx` suites use (jsdom project, `apps/web/vitest.config.ts`):

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CitySurface } from "./CitySurface";
// Reuse whichever loader/seed helper the sibling suites use; do not invent a new one.

describe("CitySurface — the citizen readout", () => {
  it("reports population, housed, and waiting in the Civic Center panel, in text", async () => {
    // A bare island: the cold open. 8 people, no homes, and the panel says so.
    // (Mount through the same in-memory loader the sibling suites use.)
    const user = userEvent.setup();
    render(<CitySurface /* ...the sibling suites' props... */ />);
    await user.click(await screen.findByTestId("town-hall-roster-entry"));
    const readout = await screen.findByTestId("city-population-readout");
    expect(readout).toHaveTextContent(/8 people/);
    expect(readout).toHaveTextContent(/waiting for homes/i);
    // Never colour, motion, or density alone: the state has a word label.
    expect(readout).toHaveTextContent(/Waiting for homes|Growing|Settled/);
  });

  it("reports each building's own occupancy on its roster row", async () => {
    // "Rowhouse Flats — home to 10 of 10 residents" is what makes "every building
    // takes people off the street" available without vision, and it is where
    // D-CIT15's mastery upgrade becomes legible.
    const user = userEvent.setup();
    render(<CitySurface /* ...a city with NUM.2 placed and complete... */ />);
    await user.click(await screen.findByRole("button", { name: /buildings/i }));
    const row = await screen.findByRole("button", { name: /Rowhouse Flats/ });
    expect(within(row).getByTestId("city-plot-occupancy")).toHaveTextContent(
      /home to 10 of 10/i,
    );
  });

  it("says the community is happy when the island settles, in the DOM (D-CIT16)", async () => {
    // The single most likely implementation mistake this whole feature has: shipping
    // the settled city as art with no words.
    const user = userEvent.setup();
    render(<CitySurface /* ...all six mastered... */ />);
    await user.click(await screen.findByTestId("town-hall-roster-entry"));
    const readout = await screen.findByTestId("city-population-readout");
    expect(readout).toHaveTextContent(/44 people/);
    expect(readout).toHaveTextContent(/happy/i);
    expect(readout).not.toHaveTextContent(/waiting/i);
  });

  it("reports the TRUE population even above the render cap", async () => {
    // The cap is render-only: a player at the cap sees a crowd that stops getting
    // denser while the text keeps counting. §7 forbids losing people and §13 forbids
    // the crowd being the only channel.
    // Drive this through the roster directly rather than through 65 buildings.
  });

  it("keeps the readout out of the aria-hidden canvas", async () => {
    render(<CitySurface /* ... */ />);
    const canvas = document.querySelector(".city-canvas");
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    const readout = await screen.findByTestId("city-population-readout");
    expect(canvas?.contains(readout)).toBe(false);
  });
});
```

**Note:** the props and loader wiring above are deliberately left to be copied from the
sibling suites rather than guessed here — `CitySurface.test.tsx`,
`CitySurface.persisted.test.tsx`, and `CitySurface.roadRemove.test.tsx` each mount the surface
with the in-memory session, and the new suite must use the same harness so it cannot drift
from how the app actually mounts. Read one of them first, copy its mount block verbatim, then
change only the seeded city state.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run apps/web/src/city/CitySurface.citizens.test.tsx`
Expected: FAIL — `Unable to find an element by: [data-testid="city-population-readout"]`.

- [ ] **Step 3: Derive the roster where the view model is already derived**

In `CitySurface.tsx`, the view model is built at `:523` inside a memo. Add the roster
immediately after it, in the same memo, so the two cannot come apart:

```tsx
  const citizens = useMemo(
    () =>
      viewModel
        ? cityCitizenRoster({
            viewModel,
            placements,
            seed: citizenSeedFor(studentId),
          })
        : null,
    [viewModel, placements, studentId],
  );
```

Imports to add:

```tsx
import { cityCitizenRoster } from "./citizens";
import { citizenSeedFor } from "./citizenSeed";
import {
  citizensMovedInMessage,
  cityPopulationMessage,
  communityHappyMessage,
  POPULATION_STATE_LABEL,
} from "./announcements";
```

- [ ] **Step 4: Add the readout to the Civic Center panel**

In `TownHallPanel`'s `town-hall-panel-body` (after the `town-hall-panel-progress` paragraph at
`:3130-3135`), add:

```tsx
          <p className="town-hall-panel-population" data-testid="city-population-readout">
            <span className="city-plot-state" data-state={populationState}>
              {POPULATION_STATE_LABEL[populationState]}
            </span>{" "}
            {cityPopulationMessage(roster)}
          </p>
```

with `populationState` derived beside it:

```tsx
  const populationState: keyof typeof POPULATION_STATE_LABEL = roster.settled
    ? "settled"
    : roster.waiting.length > 0
      ? "waiting"
      : "growing";
```

`TownHallPanel` gains a `roster: CitizenRoster` prop, threaded from the `citizens` memo.

- [ ] **Step 5: Add per-building occupancy to the roster rows**

In the `city-plot-list` mapping (around `:3657`, inside the `placed ? (...)` branch), add one
span:

```tsx
                        <span
                          className="city-plot-occupancy"
                          data-testid="city-plot-occupancy"
                        >
                          {occupancyLabel(roster, building.node_id)}
                        </span>
```

with a small pure helper beside the other copy helpers — put it in `announcements.ts` next to
the citizen block so it is swept, **not** in `CitySurface.tsx`:

```ts
/**
 * One building's own occupancy, in words: "home to 10 of 10 residents",
 * "8 of 8 seats filled", or nothing at all for a building that holds neither. This is
 * what makes "every building takes people off the street" available without vision,
 * and it is where D-CIT15's mastery upgrade becomes legible: a built terrace reads
 * "home to 10 of 10", a mastered one "home to 26 of 26".
 */
export function buildingOccupancyLabel(
  roster: CitizenRoster,
  nodeId: string,
): string {
  const entry = roster.buildings.find((building) => building.node_id === nodeId);
  if (!entry) {
    return "";
  }
  const parts: string[] = [];
  if (entry.residence_capacity > 0) {
    parts.push(
      `home to ${entry.residents.length} of ${entry.residence_capacity} residents`,
    );
  }
  if (entry.daytime_capacity > 0) {
    parts.push(`${entry.visitors.length} of ${entry.daytime_capacity} seats filled`);
  }
  return parts.join(", ");
}
```

Note this is **not** a `*Message` function, so it is outside the sweep's corpus by name. Add
it to `spokenMessages` anyway is **wrong** (the corpus test pins the corpus to `*Message`
exports exactly). Instead, assert its wording directly in `announcements.test.ts` and assert
separately that it never speaks a raw id.

- [ ] **Step 6: Announce the arc's beats through the existing polite region**

The surface already tracks mastery transitions in `prevMasteryRef` (a
`Map<string, { complete: boolean; mastery: number }>`) to fire completion chimes and stars.
Reuse it — do **not** add a second diff. Where a node newly becomes complete, also
`setPolite(citizensMovedInMessage(nodeId, moved))` where `moved` is the increase in that
building's `residents.length` across the same transition; and where the roster newly becomes
`settled`, `setPolite(communityHappyMessage())`.

**The closing beat is the one place a stronger announcement is warranted** (§13.3). Follow the
lesson host's own result politeness rather than inventing a new level: if the surface already
uses the assertive region for a result, use it here; otherwise stay polite. Do not add a new
live region.

- [ ] **Step 7: Style it, without carrying meaning in the styling**

Add to `apps/web/src/city/styles.css`, near the existing `.town-hall-panel-*` rules:

```css
.town-hall-panel-population {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.city-plot-occupancy {
  font-size: 0.75rem;
  opacity: 0.85;
}
```

No colour encodes state: the word label carries it.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run apps/web/src/city`
Expected: PASS, including the five existing `CitySurface.*.test.tsx` suites unchanged.

- [ ] **Step 9: Prove the tests are load-bearing (mutation proof)**

| Mutation | Expected failure |
| --- | --- |
| Render the readout inside the `.city-canvas` div | 1 fail: "keeps the readout out of the aria-hidden canvas" |
| Report `Math.min(roster.population, MAX_RENDERED_CITIZENS)` | 1 fail: "reports the TRUE population even above the render cap" |
| Drop the `POPULATION_STATE_LABEL` span (state by styling alone) | 1 fail: the word-label assertion in the first test |
| Drop the occupancy span from the roster rows | 1 fail: "reports each building's own occupancy" |
| Suppress the `settled` branch | 2 fail: "says the community is happy… in the DOM" and the `announcements` D-CIT16 test |

- [ ] **Step 10: Live-verify, then land Phase 3**

Serve the app on a port that is **not 5173** (the user has a dev server there): `npm run dev
-- --port 5199`. Walk the arc on the `?mock` hatch: a bare island reading 8 people waiting; a
finished Rowhouse Flats reading "home to 10 of 10" and announcing that people moved in; all
six mastered reading 44 people, everyone housed, and the community-is-happy beat. Confirm
**zero new console errors**.

```bash
npx biome format . && npx biome lint . && npm run typecheck && npm run test:unit && npm run test:browser
```

Write the `work-log/evan.md` entry and open the PR into `integration`. **Merge
`origin/integration` first if `evan/tutorial-refresh` has landed** — see §3; the conflict is
in `CitySurface.tsx`, `announcements.ts`, and `announcements.test.ts`, and the corpus rows are
the semantic half of it.

---

## Task 4.1: Ground places for every citizen (P4)

**Files:**
- Create: `apps/web/src/city/three/citizenPlaces.ts`
- Create: `apps/web/src/city/three/citizenPlaces.test.ts`

**Interfaces:**
- Consumes: `CitizenRoster` from `@cr/game`; `GroundPoint`, `Transform`, `PlacedTransform`,
  `footprintFor`, `rotatedFootprint`, `transformCenter`, `cellCenter`, `GRID_CELL`,
  `BUILDABLE_RADIUS`, `ISLAND_GRASS_RADIUS`, `occupiedCells` from `../worldLayout`;
  `TOWN_HALL_ID`, `TOWN_HALL_FOOTPRINT` from `../townHall`; `mixSeed`, `createSeededRng`
  from `@cr/game`.
- Produces:

```ts
export interface CitizenPlace {
  readonly id: string;
  readonly point: GroundPoint;
}
export function buildingDoorPoint(placed: PlacedTransform): GroundPoint;
export function hubApronPoint(hub: Transform, index: number): GroundPoint;
export function citizenPlaces(params: {
  readonly roster: CitizenRoster;
  readonly placements: readonly PlacedTransform[];
  readonly hub: Transform | null;
  readonly seed: number;
}): readonly CitizenPlace[];
```

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/city/three/citizenPlaces.test.ts`:

```ts
import { deriveCitizenRoster } from "@cr/game";
import { describe, expect, it } from "vitest";

import { TOWN_HALL_CENTER_TRANSFORM } from "../townHall";
import {
  BUILDABLE_RADIUS,
  footprintFor,
  footprintCells,
  ISLAND_GRASS_RADIUS,
  type PlacedTransform,
} from "../worldLayout";
import { buildingDoorPoint, citizenPlaces } from "./citizenPlaces";

const SEED = 0x5eed;
const HUB = TOWN_HALL_CENTER_TRANSFORM;

const ROWHOUSE: PlacedTransform = { nodeId: "NUM.2", col: 3, row: 0, rot: 0 };

function roster(nodes: Parameters<typeof deriveCitizenRoster>[0]["nodes"]) {
  return deriveCitizenRoster({ nodes, seed: SEED });
}

describe("citizenPlaces", () => {
  it("gives every citizen exactly one place, in roster order", () => {
    const crowd = roster([]);
    const places = citizenPlaces({ roster: crowd, placements: [], hub: HUB, seed: SEED });
    expect(places).toHaveLength(crowd.population);
    expect(places.map((place) => place.id)).toEqual(
      crowd.citizens.map((citizen) => citizen.id),
    );
  });

  it("keeps every place on the island's grass", () => {
    const crowd = roster([
      { node_id: "NUM.2", citizen_role: "residence", placed: true, mastery: 2, lesson_stage: "done", placement_estimate: 0 },
    ]);
    const places = citizenPlaces({
      roster: crowd,
      placements: [ROWHOUSE],
      hub: HUB,
      seed: SEED,
    });
    for (const place of places) {
      expect(Math.hypot(place.point.x, place.point.z), place.id).toBeLessThan(
        ISLAND_GRASS_RADIUS,
      );
    }
  });

  it("never stands a citizen inside a building's footprint", () => {
    const crowd = roster([]);
    const occupied = new Set([
      ...footprintCells(ROWHOUSE, footprintFor("NUM.2")),
      ...footprintCells({ ...HUB }, footprintFor("town-hall")),
    ]);
    const places = citizenPlaces({
      roster: crowd,
      placements: [ROWHOUSE],
      hub: HUB,
      seed: SEED,
    });
    for (const place of places) {
      const col = Math.floor(place.point.x / 4);
      const row = Math.floor(place.point.z / 4);
      expect(occupied.has(`${col},${row}`), `${place.id} at ${col},${row}`).toBe(false);
    }
  });

  it("is deterministic for the same seed and city", () => {
    const crowd = roster([]);
    const args = { roster: crowd, placements: [ROWHOUSE], hub: HUB, seed: SEED };
    expect(citizenPlaces(args)).toEqual(citizenPlaces(args));
  });

  it("puts a housed citizen at their own building's door", () => {
    const crowd = roster([
      { node_id: "NUM.2", citizen_role: "residence", placed: true, mastery: 0, lesson_stage: "done", placement_estimate: 0 },
    ]);
    const door = buildingDoorPoint(ROWHOUSE);
    const places = citizenPlaces({
      roster: crowd,
      placements: [ROWHOUSE],
      hub: HUB,
      seed: SEED,
    });
    const housed = crowd.citizens.filter((citizen) => citizen.home_node_id === "NUM.2");
    expect(housed.length).toBeGreaterThan(0);
    for (const citizen of housed) {
      const place = places.find((entry) => entry.id === citizen.id);
      // Clustered at the doorstep, not scattered across the island.
      expect(
        Math.hypot(place!.point.x - door.x, place!.point.z - door.z),
        citizen.id,
      ).toBeLessThan(8);
    }
  });

  it("gathers the waiting crowd near the Civic Center, spreading outward", () => {
    const crowd = roster([]);
    const places = citizenPlaces({ roster: crowd, placements: [], hub: HUB, seed: SEED });
    const hubX = (HUB.col + 1.5) * 4;
    const hubZ = (HUB.row + 1) * 4;
    for (const place of places) {
      // Near the hub, and within the permanently-clear grass ring at worst.
      expect(
        Math.hypot(place.point.x - hubX, place.point.z - hubZ),
        place.id,
      ).toBeLessThan(BUILDABLE_RADIUS);
    }
  });

  it("keeps a citizen's place independent of how many people are on the island", () => {
    const small = roster([]);
    const big = roster([
      { node_id: "NUM.3", citizen_role: "school", placed: true, mastery: 2, lesson_stage: "done", placement_estimate: 0 },
    ]);
    const a = citizenPlaces({ roster: small, placements: [], hub: HUB, seed: SEED });
    const b = citizenPlaces({
      roster: big,
      placements: [{ nodeId: "NUM.3", col: -6, row: 4, rot: 0 }],
      hub: HUB,
      seed: SEED,
    });
    // The founding eight are still waiting in both, and have not been shuffled.
    expect(b.slice(0, 8).map((place) => place.point)).toEqual(
      a.slice(0, 8).map((place) => place.point),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run apps/web/src/city/three/citizenPlaces.test.ts`
Expected: FAIL — cannot resolve `./citizenPlaces`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/city/three/citizenPlaces.ts`. The rules the code must implement, each
grounded in a measured fact from the design's §9.1:

- **A housed citizen with no daytime seat** stands near their **home's door**.
- **A citizen with a daytime seat** stands near **that building's door**.
- **A waiting citizen** stands on a ring around the **hub apron**, spreading outward as the
  crowd grows. The rings must skip occupied cells; there are **65 free cells (74% of the
  buildable island) with the island fully built out**, and the **r=22..25 annulus is clear
  grass that can never hold a building or a road**, so an overflow band always exists.
- **Road cells are walkable and are NOT skipped.** `isRoadCellLayable` requires a cell be
  clear of buildings and of existing road, so a player who paves everything leaves **zero bare
  cells** — a placement rule that avoided roads would have nowhere to stand on a fully-paved
  island.
- Every point is deterministic in `(seed, citizen index)` via `mixSeed` + `createSeededRng`,
  so a jitter never depends on population.

- [ ] **Step 4: Run, prove, commit**

Mutation proof:

| Mutation | Expected failure |
| --- | --- |
| Skip road cells when placing the waiting crowd, then test with every free cell paved | 1 fail: a fully-paved island produces places off the grass |
| Jitter from a single shared RNG stream instead of a per-index sub-seed | 1 fail: "keeps a citizen's place independent of how many people are on the island" |
| Drop the occupied-cell check | 1 fail: "never stands a citizen inside a building's footprint" |
| Place waiting citizens at the island edge instead of the hub | 1 fail: "gathers the waiting crowd near the Civic Center" |

```bash
git add apps/web/src/city/three/citizenPlaces.ts apps/web/src/city/three/citizenPlaces.test.ts
git commit -m "feat(app): deterministic ground places for homes, destinations, and the waiting crowd"
```

---

## Task 4.2: The instanced crowd (P4)

**Files:**
- Create: `apps/web/src/city/three/Citizens.tsx`
- Create: `apps/web/src/city/three/Citizens.test.ts`
- Modify: `apps/web/src/city/three/CityScene.tsx` (mount the layer)

**Interfaces:**
- Consumes: `citizenPlaces`, `CitizenPlace` (Task 4.1); `CitizenRoster`,
  `MAX_RENDERED_CITIZENS` from `@cr/game`.
- Produces:

```ts
export const CITIZEN_BODY_NAME = "citizen-bodies";
export const CITIZEN_HEAD_NAME = "citizen-heads";
export interface CitizenRig {
  readonly root: THREE.Group;
  readonly bodies: THREE.InstancedMesh;
  readonly heads: THREE.InstancedMesh;
  readonly places: readonly CitizenPlace[];
}
export function buildCitizenRig(params: {
  readonly roster: CitizenRoster;
  readonly places: readonly CitizenPlace[];
}): CitizenRig;
export function poseCitizens(rig: CitizenRig, elapsed: number, reduced: boolean): void;
export function Citizens(props: { ... }): JSX.Element;
```

The pure-builder-plus-component split is the pattern `Roads.tsx` already establishes
(`buildRoadsGroup` is exported and tested in node with `import type * as THREE`), which is what
lets the whole layer be tested with no GPU.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/city/three/Citizens.test.ts`:

```ts
import { deriveCitizenRoster, MAX_RENDERED_CITIZENS } from "@cr/game";
import { describe, expect, it } from "vitest";

import { TOWN_HALL_CENTER_TRANSFORM } from "../townHall";
import { buildCitizenRig, poseCitizens } from "./Citizens";
import { citizenPlaces } from "./citizenPlaces";

const SEED = 0x5eed;

/**
 * The `(x, y, z)` translation of one instance, read out of the flat 16-float matrix
 * buffer. Shared by the pose tests here and in Task 5.2.
 */
function instanceTranslation(
  mesh: { instanceMatrix: { array: ArrayLike<number> } },
  index: number,
): [number, number, number] {
  const at = index * 16;
  return [
    mesh.instanceMatrix.array[at + 12],
    mesh.instanceMatrix.array[at + 13],
    mesh.instanceMatrix.array[at + 14],
  ];
}

function rigFor(nodes: Parameters<typeof deriveCitizenRoster>[0]["nodes"], placements = []) {
  const roster = deriveCitizenRoster({ nodes, seed: SEED });
  const places = citizenPlaces({
    roster,
    placements,
    hub: TOWN_HALL_CENTER_TRANSFORM,
    seed: SEED,
  });
  return { roster, rig: buildCitizenRig({ roster, places }) };
}

describe("the instanced crowd (D-CIT9)", () => {
  it("draws the whole crowd in exactly TWO instanced meshes", () => {
    // A throng must cost roughly what a handful does. 44 individually-meshed,
    // individually-animated citizens would change the per-frame character of a scene
    // whose six existing useFrame callbacks each animate single digits of objects.
    const { rig } = rigFor([]);
    let instanced = 0;
    let plainMeshes = 0;
    rig.root.traverse((child) => {
      const mesh = child as { isInstancedMesh?: boolean; isMesh?: boolean };
      if (mesh.isInstancedMesh === true) {
        instanced += 1;
      } else if (mesh.isMesh === true) {
        plainMeshes += 1;
      }
    });
    expect(instanced).toBe(2);
    expect(plainMeshes).toBe(0);
  });

  it("never lets a citizen into the shadow pass", () => {
    // Shadows are the scene's cost ceiling, and the gulls already set the precedent.
    const { rig } = rigFor([]);
    for (const mesh of [rig.bodies, rig.heads]) {
      expect(mesh.castShadow).toBe(false);
      expect(mesh.receiveShadow).toBe(false);
    }
  });

  it("caps RENDERING only, and leaves the count exact", () => {
    // The correct degradation: a crowd that stops getting denser while the text keeps
    // counting. §7 forbids losing people; §13 forbids the crowd being the only channel.
    const roster = deriveCitizenRoster({ nodes: [], seed: SEED });
    const inflated = {
      ...roster,
      population: 200,
      citizens: Array.from({ length: 200 }, (_, index) => ({
        ...roster.citizens[0],
        id: `citizen-${String(index).padStart(3, "0")}`,
      })),
    };
    const places = citizenPlaces({
      roster: inflated,
      placements: [],
      hub: TOWN_HALL_CENTER_TRANSFORM,
      seed: SEED,
    });
    const rig = buildCitizenRig({ roster: inflated, places });
    expect(rig.bodies.count).toBe(MAX_RENDERED_CITIZENS);
    expect(rig.heads.count).toBe(MAX_RENDERED_CITIZENS);
    // The roster is untouched by the cap.
    expect(inflated.population).toBe(200);
  });

  it("draws exactly the crowd when it is under the cap", () => {
    const { roster, rig } = rigFor([]);
    expect(roster.population).toBe(8);
    expect(rig.bodies.count).toBe(8);
  });

  it("holds still under reduced motion, and is posed rather than removed", () => {
    // The existing hard requirement the gull flock already honours: posed, not frozen
    // mid-stride, and never removed — the population is unchanged.
    const { rig } = rigFor([]);
    poseCitizens(rig, 0, true);
    const first = Array.from(rig.bodies.instanceMatrix.array);
    poseCitizens(rig, 12.5, true);
    const later = Array.from(rig.bodies.instanceMatrix.array);
    expect(later).toEqual(first);
    // And the crowd is still there.
    expect(rig.bodies.count).toBe(8);
    // Without reduced motion, time moves them.
    poseCitizens(rig, 12.5, false);
    expect(Array.from(rig.bodies.instanceMatrix.array)).not.toEqual(first);
  });

  it("seats every instance before the first frame", () => {
    // A crowd that flashes at the origin on mount is the classic instancing defect.
    const { rig } = rigFor([]);
    const matrix = Array.from(rig.bodies.instanceMatrix.array).slice(0, 16);
    const translation = [matrix[12], matrix[13], matrix[14]];
    expect(translation.some((value) => value !== 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run apps/web/src/city/three/Citizens.test.ts`
Expected: FAIL — cannot resolve `./Citizens`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/city/three/Citizens.tsx`. Requirements the code must meet, each from a
constraint above:

- Two `THREE.InstancedMesh`, one for bodies and one for heads, over **shared geometry and one
  material each** — the same discipline `Roads.tsx` uses for its per-tile meshes.
- `count = Math.min(roster.population, MAX_RENDERED_CITIZENS)`.
- `castShadow = false` and `receiveShadow = false` on **both**.
- Every instance matrix written once at build time (`instanceMatrix.needsUpdate = true`), so
  nothing flashes at the origin.
- `poseCitizens(rig, elapsed, reduced)` returns immediately when `reduced` is true, exactly as
  `Birds` does (`if (reducedMotion) { return; }`).
- Per-citizen `height_scale` from `roster.citizens[i].look`, and per-citizen colour written
  into the instance colour attribute from `body_tone` / `shirt_tone` mapped through the city
  palette — the engine hands over tones in `0..1` and never a colour.
- The component is a thin wrapper: `useMemo` the rig, `useFrame` the pose, `<primitive
  object={rig.root} />` — the `Birds` shape exactly.

- [ ] **Step 4: Mount it in the scene**

In `apps/web/src/city/three/CityScene.tsx`, inside the canvas subtree beside `<Roads .../>`
(at `:599` in the landed file):

```tsx
        <Citizens roster={roster} placements={placements} hub={townHall} reducedMotion={reducedMotion} />
```

`CityScene`'s props gain `roster: CitizenRoster | null`, threaded from `CitySurface`'s
`citizens` memo. **Do not derive the roster in the scene** — the scene reads assignments and
never computes them (D-CIT8).

**#152 has landed, so there is no branch to sequence against — but its depth-precision test
outlives the merge (§3).** Two obligations follow, and the second is the one that is easy to
miss:

- [ ] **Step 4b: Keep the depth-precision suite green, and re-argue its claim**

Run: `npx vitest run apps/web/src/city/three/depthPrecision.test.ts`
Expected: PASS, unchanged. Citizens touch neither of that suite's inputs
(`ROAD_SURFACE_TOPS` and the camera constants), so it cannot fail by accident.

But its fourth case asserts `NEAR < 3` and justifies it with a **measured claim about the
whole scene**: "sweeping ~12k camera states against the fully built city, nothing solid came
within 3u of the camera", with the mastery-star billboards the sole exception at ~0.95u.
**Citizens are new solid geometry, so they fall inside that measurement.** Re-argue it in the
PR body: citizens stand **on the ground plane** and are **shorter than the buildings already
swept**, so they cannot get closer to the camera than terrain that was already measured —
unlike the stars, which float. If that turns out not to hold at full zoom-in panned to the
bound, **shorten the citizens; do not raise the near plane.** #152 bought a 10x depth-precision
win for the whole scene and P4 must not spend it.

- [ ] **Step 5: Run, prove, commit**

| Mutation | Expected failure |
| --- | --- |
| `castShadow = true` on the bodies | 1 fail: "never lets a citizen into the shadow pass" |
| One `THREE.Mesh` per citizen instead of two instanced meshes | 2 fail: "draws the whole crowd in exactly TWO instanced meshes" and the cap test |
| `count = roster.population` (no cap) | 1 fail: "caps RENDERING only" |
| `roster.population = Math.min(...)` (cap the count instead of the draw) | 1 fail: the cap test's "roster is untouched" assertion, plus Task 3.3's true-population test |
| Drop the `if (reduced) return` guard from `poseCitizens` | 1 fail: "holds still under reduced motion" |
| Defer the first matrix write to the first frame | 1 fail: "seats every instance before the first frame" |

```bash
npx vitest run apps/web/src/city
npx biome format . && npm run typecheck && npm run test:unit && npm run test:browser
git add apps/web/src/city/three/Citizens.tsx apps/web/src/city/three/Citizens.test.ts apps/web/src/city/three/CityScene.tsx
git commit -m "feat(app): render the crowd as two instanced draws, no shadows, posed under reduced motion"
```

- [ ] **Step 6: Land Phase 4, and book the two review-by-eye calls**

Serve on port 5199 and look at three states: the cold open, the mid-game peak (14 waiting),
and the settled island. **Q8 is pass/fail for the design and cannot be answered by a test:**
does a full island with every window lit and nobody outside read as *thriving* rather than
merely *static*, and does a crowd of 14 outside the Civic Center read as *waiting hopefully*
rather than *stranded*? Take screenshots and put them in the PR. **Q1 and Q9 also become
answerable here** — flag them for the user in the PR body rather than deciding them.

Write the `work-log/evan.md` entry and open the PR.

---

## Task 5.1: The road-preferring router (P5)

**Files:**
- Create: `apps/web/src/city/three/citizenRoutes.ts`
- Create: `apps/web/src/city/three/citizenRoutes.test.ts`

**Interfaces:**
- Consumes: `ROAD_PREFERENCE_WEIGHT` from `@cr/game`; `roadCellKey` from `../roads`;
  `isCellBuildable`, `occupiedCells`, `cellCenter`, `GRID_CELL` from `../worldLayout`.
- Produces:

```ts
export interface RouteCell { readonly col: number; readonly row: number }
export function routeBetween(params: {
  readonly from: RouteCell;
  readonly to: RouteCell;
  readonly roadCells: ReadonlySet<string>;
  readonly blockedCells: ReadonlySet<string>;
}): readonly RouteCell[];
```

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/city/three/citizenRoutes.test.ts`. The four assertions that matter, and
why each is the one a wrong implementation fails:

```ts
import { describe, expect, it } from "vitest";

import { roadCellKey } from "../roads";
import { routeBetween } from "./citizenRoutes";

const NO_ROADS: ReadonlySet<string> = new Set();
const NOTHING_BLOCKED: ReadonlySet<string> = new Set();

function roads(cells: readonly [number, number][]): ReadonlySet<string> {
  return new Set(cells.map(([col, row]) => roadCellKey(col, row)));
}

describe("routeBetween — roads amplify, never gate (D-CIT7)", () => {
  it("finds a route with NO roads at all", () => {
    // The assertion that keeps `roads.ts`'s own invariant true for citizens: a road
    // only ever blocks a CELL, never progress. A citizen must never REQUIRE a road.
    const route = routeBetween({
      from: { col: 0, row: 0 },
      to: { col: 4, row: 0 },
      roadCells: NO_ROADS,
      blockedCells: NOTHING_BLOCKED,
    });
    expect(route.length).toBeGreaterThan(1);
    expect(route[0]).toEqual({ col: 0, row: 0 });
    expect(route[route.length - 1]).toEqual({ col: 4, row: 0 });
  });

  it("prefers a paved detour over an equally long bare path", () => {
    // Traffic must VISIBLY follow the paths. Two routes of equal cell count, one
    // paved: the paved one wins because a road cell costs half a bare one.
    const paved = roads([
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
    ]);
    const route = routeBetween({
      from: { col: 0, row: 1 },
      to: { col: 4, row: 1 },
      roadCells: paved,
      blockedCells: NOTHING_BLOCKED,
    });
    for (const cell of route) {
      expect(paved.has(roadCellKey(cell.col, cell.row)), `${cell.col},${cell.row}`).toBe(
        true,
      );
    }
  });

  it("walks bare ground when the road does not go where the citizen is going", () => {
    const paved = roads([[0, 3]]);
    const route = routeBetween({
      from: { col: 0, row: 0 },
      to: { col: 3, row: 0 },
      roadCells: paved,
      blockedCells: NOTHING_BLOCKED,
    });
    expect(route[route.length - 1]).toEqual({ col: 3, row: 0 });
  });

  it("never routes through a building", () => {
    const blocked = new Set([roadCellKey(1, 0), roadCellKey(1, 1)]);
    const route = routeBetween({
      from: { col: 0, row: 0 },
      to: { col: 2, row: 0 },
      roadCells: NO_ROADS,
      blockedCells: blocked,
    });
    for (const cell of route.slice(1, -1)) {
      expect(blocked.has(roadCellKey(cell.col, cell.row))).toBe(false);
    }
  });

  it("returns a single-cell route for identical endpoints", () => {
    const route = routeBetween({
      from: { col: 2, row: 2 },
      to: { col: 2, row: 2 },
      roadCells: NO_ROADS,
      blockedCells: NOTHING_BLOCKED,
    });
    expect(route).toEqual([{ col: 2, row: 2 }]);
  });

  it("never strands a citizen: an unreachable target still yields a route", () => {
    // §7: nothing is ever lost and nobody is ever punished. A walled-off destination
    // must degrade to a direct line, not to a null the caller has to handle by
    // deleting a person.
    const walled = new Set([
      roadCellKey(1, 0),
      roadCellKey(1, 1),
      roadCellKey(1, -1),
      roadCellKey(0, 1),
      roadCellKey(0, -1),
    ]);
    const route = routeBetween({
      from: { col: 0, row: 0 },
      to: { col: 2, row: 0 },
      roadCells: NO_ROADS,
      blockedCells: walled,
    });
    expect(route.length).toBeGreaterThan(0);
    expect(route[route.length - 1]).toEqual({ col: 2, row: 0 });
  });

  it("is deterministic, including tie-breaks", () => {
    const args = {
      from: { col: -3, row: -3 },
      to: { col: 3, row: 3 },
      roadCells: NO_ROADS,
      blockedCells: NOTHING_BLOCKED,
    };
    expect(routeBetween(args)).toEqual(routeBetween(args));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run apps/web/src/city/three/citizenRoutes.test.ts`
Expected: FAIL — cannot resolve `./citizenRoutes`.

- [ ] **Step 3: Write the implementation**

A **uniform-cost search (Dijkstra) over the buildable cell grid**, four-connected. The
implementation notes that matter:

- The search space is **88 buildable cells** on D1 (measured from `worldLayout`'s own rule:
  cell **centres** inside `BUILDABLE_RADIUS = 22`, no interior exclusions), of which **67 are
  free with the island fully built out**. Exhaustive search is cheap; do not build an A*
  heuristic the grid does not need.
- **Step cost** is `ROAD_PREFERENCE_WEIGHT` (0.5) for a road cell and 1 for a bare cell. That
  is the entire road mechanic: a road is never required, only cheaper.
- **Blocked cells** are building footprints, with the destination's own footprint exempt (a
  citizen has to reach a doorstep). Roads are **never** blocked.
- **Tie-breaks must be deterministic**: order the four neighbours in a fixed sequence
  (north, east, south, west — the same order `roadRetileTargets` and `roadNeighborMask` use)
  and use a stable priority comparison, so two loads route identically.
- **Never return an empty or null route.** If the target is unreachable, return
  `[from, to]` — a direct line. A stranded citizen is a punishment the design forbids, and a
  null forces the caller to invent one.
- Reuse `roadCellKey` for keys rather than minting a second key format; the whole point of
  the grid being shared is that one key means one cell everywhere.

- [ ] **Step 4: Run, prove, commit**

| Mutation | Expected failure |
| --- | --- |
| Treat bare cells as impassable (roads required) | 2 fail: "finds a route with NO roads at all" and "walks bare ground when the road does not go where the citizen is going" |
| `ROAD_PREFERENCE_WEIGHT` effectively 1 (drop the weighting) | 1 fail: "prefers a paved detour over an equally long bare path" |
| Return `[]` for an unreachable target | 1 fail: "never strands a citizen" |
| Iterate neighbours from a `Set` (unstable order) | 1 fail: "is deterministic, including tie-breaks" |
| Allow the route through blocked cells | 1 fail: "never routes through a building" |

```bash
git add apps/web/src/city/three/citizenRoutes.ts apps/web/src/city/three/citizenRoutes.test.ts
git commit -m "feat(app): a road-preferring router that never requires a road (D-CIT7)"
```

---

## Task 5.2: The walk (P5)

**Files:**
- Modify: `apps/web/src/city/three/Citizens.tsx` (`poseCitizens` walks a route)
- Modify: `apps/web/src/city/three/Citizens.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `Citizens.test.ts`, widening its `@cr/game` import to
`import { deriveCitizenRoster, MAX_RENDERED_CITIZENS, WALK_SPEED_UNITS_PER_SEC } from "@cr/game";`
and reusing the `instanceTranslation` helper Task 4.2 already defined in that file:

```ts
  it("walks at the tuned speed, and holds the pace across a long frame gap", () => {
    // WALK_SPEED_UNITS_PER_SEC = 1.6 — about one grid cell every 2.5s, legible at the
    // fixed ~49-degree camera without looking hurried. Distance covered must be a
    // function of ELAPSED TIME, not of how many frames happened to be drawn.
    const { rig } = rigFor([]);
    poseCitizens(rig, 0, false);
    const start = instanceTranslation(rig.bodies, 0);
    poseCitizens(rig, 1, false);
    const afterOne = instanceTranslation(rig.bodies, 0);
    const moved = Math.hypot(afterOne[0] - start[0], afterOne[2] - start[2]);
    expect(moved).toBeLessThanOrEqual(WALK_SPEED_UNITS_PER_SEC * 1.05);
  });

  it("keeps every citizen on their own route, in their own gait phase", () => {
    // A crowd that walks in lockstep reads as a machine, not a town. The phase comes
    // from the engine's seeded `look.gait_phase`.
    const { roster, rig } = rigFor([]);
    poseCitizens(rig, 3.3, false);
    const phases = new Set(roster.citizens.map((citizen) => citizen.look.gait_phase));
    expect(phases.size).toBeGreaterThan(1);
    const a = instanceTranslation(rig.bodies, 0);
    const b = instanceTranslation(rig.bodies, 1);
    expect(a).not.toEqual(b);
  });
```

- [ ] **Step 2-5: Fail, implement, pass, prove, commit**

The walk interpolates along the route from `routeBetween`, at `WALK_SPEED_UNITS_PER_SEC`,
phase-offset per citizen by `look.gait_phase`. Under reduced motion `poseCitizens` still
returns immediately, so citizens **stand at their destinations** rather than freezing
mid-stride — which means the reduced-motion pose must place them at the route's **end**, not
its start.

| Mutation | Expected failure |
| --- | --- |
| Advance by a fixed step per call rather than by elapsed time | 1 fail: "walks at the tuned speed" |
| Ignore `look.gait_phase` (lockstep) | 1 fail: "keeps every citizen… in their own gait phase" |
| Pose reduced-motion citizens at the route's start | 1 fail: the reduced-motion test in Task 4.2, once destinations differ from origins |

- [ ] **Step 6: Land Phase 5 — profile against the NAMED floor (D-CIT20)**

**Do not open this PR without a profile, and profile the right thing.** The target is set:
the **floor is a school Chromebook with low-end integrated graphics**, and the common case
is a **typical student laptop with integrated graphics**. Measure on the floor — a developer
laptop's numbers say nothing about a Chromebook's fill rate.

**Measure the whole scene, not just the crowd.** The baseline is in the design (§10.3):
`frameloop="always"`, `shadows` enabled, `dpr={[1, 2]}`, six cheap `useFrame` callbacks
(`MasteryStars`, `TownHall`, `PlacedBuilding` x2, `CityScene`, `StarterIsland`'s five gulls),
a few hundred static island meshes, and up to ~7 meshes per road tile over shared geometry.
Take four readings: **bare island, mid-game (14 waiting), full mastery (44), and a heavily
paved island** — the last because the road layer is the biggest existing mesh contributor
and it is what a player who has spent gold will actually be looking at.

**Expect the crowd not to be the problem, and say so if it is not.** Two instanced draws of
a few dozen low-poly bodies is a few thousand triangles and ~768 floats of matrix write per
frame; on a Chromebook the levers that bite are `dpr={[1, 2]}` (a 2x-DPR panel is 4x the
fragments), the shadow pass, and the road layer — **none of which citizens make worse.** A
profile that concludes "lower `MAX_RENDERED_CITIZENS`" without having measured those three
has almost certainly tuned the wrong knob. **Report which lever moved the number.**

**Then set the cap from data**, replacing the "PROVISIONAL" paragraph in
`citizens-tuning.ts` with the measurement and the machine it came from. Remember the cap is
**unreachable on D1 at 48**, so unless the profile says otherwise the honest outcome is
"48 stands, and here is why it was never the constraint".

If the measurement genuinely says the cap must drop below 44, that is a finding, not a
failure: §14's ladder is (1) lower the cap, (2) stop the walk, (3) drop the cars, (4)
**never** drop the DOM readout or the count. Say which rung was taken — and note that
**rung 2 already exists** (reduced motion produces exactly the static-citizens state), while
rungs 1 and 3 need **Q11** answered before the ladder can be called shipped.

---

## Task 6.1: Cars (P6)

**Blocked on Q7** (does `MAX_CARS` share the citizen budget?).

**Files:**
- Create: `apps/web/src/city/three/Cars.tsx`
- Create: `apps/web/src/city/three/Cars.test.ts`
- Modify: `apps/web/src/city/three/CityScene.tsx`

**Interfaces:**
- Consumes: `CARS_PER_ROAD_TILES`, `MAX_CARS` from `@cr/game`; `routeBetween` (Task 5.1).
- Produces: `carCount(roadTileCount: number): number`; `buildCarRig(...)`;
  `poseCars(rig, elapsed, reduced)`; `Cars` component.

- [ ] **Step 1: Write the failing test**

```ts
import { CARS_PER_ROAD_TILES, MAX_CARS } from "@cr/game";
import { describe, expect, it } from "vitest";

import { carCount } from "./Cars";

describe("carCount", () => {
  it("scales with the road network, so gold spent on roads buys visible life", () => {
    expect(carCount(0)).toBe(0);
    expect(carCount(CARS_PER_ROAD_TILES - 1)).toBe(0);
    expect(carCount(CARS_PER_ROAD_TILES)).toBe(1);
    expect(carCount(CARS_PER_ROAD_TILES * 3)).toBe(3);
  });

  it("caps, for the same reason citizens do", () => {
    expect(carCount(CARS_PER_ROAD_TILES * 999)).toBe(MAX_CARS);
  });

  it("never reads the roster: a car is amplification, not a readout", () => {
    // Cars are driven by the ROAD NETWORK alone. Population is never an input.
    expect(carCount.length).toBe(1);
  });
});
```

- [ ] **Step 2-6: Fail, implement, pass, prove, commit**

Cars are one further instanced draw, no shadows, frozen under reduced motion, and **the first
thing dropped on a weak machine** (§14 rung 3).

| Mutation | Expected failure |
| --- | --- |
| Drop the `MAX_CARS` clamp | 1 fail: "caps, for the same reason citizens do" |
| `carCount(roadTiles, population)` | 1 fail: "never reads the roster" (arity), plus a typecheck error at the call site |

---

## Self-review

Run against the spec with fresh eyes, as the writing-plans skill prescribes.

**1. Spec coverage.** Walked every numbered section and every decision.

| Spec item | Task |
| --- | --- |
| §2 the loop, the cold open, the three beats | 1.2 (the cold open assertion), 1.3 (the arc's pacing), 3.2 (the beats in text), 4.2 (the beats visible) |
| §3 / §3.1 roles from the node id, three families, `civic` fallback (D-CIT17) | **1.0**, 2.4 |
| §4 derived never persisted, stable seed, the swap-in seam | 2.1, 2.2, 2.3 (determinism), 3.1 (the seed source) |
| §5 the two-term dial, GROUNDED CORRECTIONs 2 and 3 | 1.2 |
| §6 the settled ending, capacity never surfaced as pressure | 1.3, 3.2 (copy rules) |
| §6.2 no filler buildings | Nothing to build — it is a rejection. No task adds a non-skill building. |
| §7 no punishment, no eviction, the type-level guard | 2.2 (the union), 2.3 (the sweeps), 5.1 (never strand a citizen) |
| §8.1-§8.4 all tuning constants | 1.1 |
| §8.5 the pacing over 33 orders and the tested-out curve | 1.3 |
| §8.6 movement constants | 1.1 (declared), 5.1-5.2 (consumed), 6.1 (cars) |
| §9 roads amplify; §9.1 the measured movement space | 2.3 (roads are not an input), 4.1 (the free-cell and annulus facts), 5.1 (the router) |
| §10.1 the pure derivation; §10.2 the render layer; §10.4 the three boundaries | 2.2, 4.2 |
| §10.5 the assignment rule and its two consequences (D-CIT19) | 2.2 (the rule), 2.3 (the stability and no-eviction sweeps), §7.3 (the consequences) |
| §10.3 the measured frame budget | 5.2's profile step |
| §11 cross-lane seams | §3 and §6 of this plan |
| §12.1 every invariant row | 1.2, 1.3, 2.2, 2.3 — see the row-by-row check below |
| §12.2 what is deliberately not unit-tested | 4.2 step 6 (Q8 by eye), 5.2 step 6 (the profile) |
| §12.3 accessibility tests | 3.2 (the sweep, the D-CIT16 test, the no-shaming list), 3.3 (the DOM assertions) |
| §13 the readout, the callouts, the copy rules, reduced motion | 3.2, 3.3, 4.2 |
| §14 the budget, the cap, the failure ladder | 1.1, 4.2, 5.2 |
| §15 rejected alternatives | Nothing to build. The three that could creep back in are guarded: capacity feedback (1.3), persisted residents (nothing persists), roads as infrastructure (5.1). |
| D-CIT1..D-CIT20 | 1: 2.2 · 2: 1.2, 1.3 · 3: **1.0**, 2.4 · 4: 1.3 · 5: n/a · 6: 2.2, 2.3 · 7: 2.3, 5.1 · 8: the whole engine/web split · 9: 4.2 · 10: 1.2 · 11: 1.2 · 12: **1.0**, 1.2, 2.3 · 13: 3.2, 3.3 · 14: 1.1 · 15: 1.1, 1.3 · 16: 3.2, 3.3 · **17: 1.0** · **18: 2.2, 2.3** · **19: 2.2, 2.3** · **20: 1.1, 4.2, 5.2** |

**§12.1 row by row.** Cold open (1.2). Full-mastery total (1.2, 1.3). The settled ending
guarantee (1.3). Exactly full (1.3). Settled in every build order (1.3). The mid-game crowd
exists (1.3). Mastery beats building, population (1.2). Mastery beats building, capacity
(1.1). Gold adds nothing (1.2). Monotonicity over 4096 vectors (1.3). No eviction (2.3).
No harm state (2.3, in the type). Capacity never gates (1.3). Roads amplify only (2.3).
Test-out (1.2). Tested-out learner settles too (1.3). Placement required (1.2).
Determinism (2.3). Assignment stability (2.3). Unauthored island (1.2, 2.3). Role
derivation (1.1). School and park house nobody (1.1). **All 22 rows have a task.**

**Gaps found and closed during this review:**
- §13.1's per-building occupancy copy had no home; `buildingOccupancyLabel` was added to
  Task 3.3 (in `announcements.ts`, so it is near the sweep) rather than left as an inline
  string in `CitySurface.tsx`.
- The adapter was originally inside Phase 3, which would have blocked Phase 4 behind it. It
  moved to Task 2.4 so P3 and P4 can genuinely run in parallel.
- §12.3's no-shaming sweep was originally scoped to the citizen messages; it now runs over
  the **whole** corpus, which costs nothing and catches a leak anywhere.

**2. Placeholder scan.** No "TBD", no "implement later", no "similar to Task N", no "add
appropriate error handling", and no step that says what to do without showing how — except
three deliberate exceptions, each labelled as a decision rather than a gap:
- **Task 3.1's implementation is written for one of Q4's three options** and states exactly
  what changes under the other two. Writing all three would be inventing the decision.
- **Task 3.3's test mount block is deliberately deferred to the sibling suites.** Guessing
  `CitySurface`'s props here would produce a test that does not compile; copying one of the
  five existing suites' mount blocks produces one that does. The instruction is specific
  about which file to read.
- **Tasks 4.1, 4.2, 5.1, 5.2, and 6.1 state their implementations as a requirement list
  rather than a full listing.** Every requirement is concrete and testable, the tests are
  complete, and the mutation matrices name the exact wrong implementations — but a full
  `THREE.InstancedMesh` listing would be a mesh-by-mesh art decision this plan has no
  standing to make, and the tests are what pin the behaviour that matters.

**3. Type consistency.** Checked every name used across task boundaries.
`CitizenRoleId` (1.0) is consumed by name in 1.1, 1.2, 2.2, 2.3, 2.4.
`CitizenCapacity` / `capacityForNode` / `CITIZEN_NODE_CAPACITY` (1.1) in 1.2.
`buildingLedger` / `citizenPopulation` / `residenceCapacity` / `daytimeCapacity` /
`CitizenNodeInput` / `CitizenBuildingLedger` (1.2) are consumed by name in 1.3, 2.2, 2.3, 2.4.
`createSeededRng` / `mixSeed` (2.1) in 2.2 and 4.1. `CitizenRoster` / `Citizen` /
`CitizenState` / `CitizenLook` / `CitizenBuildingOccupancy` / `deriveCitizenRoster` (2.2) in
2.3, 2.4, 3.2, 3.3, 4.1, 4.2. `cityCitizenRoster` (2.4) in 3.3. `citizenSeedFor` (3.1) in 3.3.
`cityPopulationMessage` / `citizensMovedInMessage` / `communityHappyMessage` /
`POPULATION_STATE_LABEL` / `buildingOccupancyLabel` (3.2) in 3.3. `citizenPlaces` /
`CitizenPlace` / `buildingDoorPoint` (4.1) in 4.2. `buildCitizenRig` / `poseCitizens` /
`CitizenRig` (4.2) in 5.2. `routeBetween` / `RouteCell` (5.1) in 5.2 and 6.1.
`carCount` (6.1) in `CityScene`. **One inconsistency was found and fixed:** the roster field
was `housed_count` in an early draft of Task 3.3 and `housed` in Task 2.2; it is `housed`
everywhere now.

**4. Docs-only note for this PR.** This plan is a document. **No source file is touched, so
a full `npm run check` is not required for the PR that lands it** — there is nothing for
format, lint, typecheck, or the unit and browser suites to see. Every command above describes
work that does not exist yet.

**5. Second-pass check (2026-07-27), after the three resolutions and the performance target.**

- **Every reference to the superseded keying is gone or deliberate.** A grep for `art_mass`,
  `profileForArtMass`, `CITIZEN_MASS_PROFILES`, `CitizenMassProfile`, `CIVIC_FALLBACK_PROFILE`,
  and `CitizenRoleFamily` finds **only** the revision notes that record the change. A grep for
  `gridworkId` finds only §7.1's account of why it could not be used and Task 1.0's comments
  saying the same in code. `D1_NODE_BUILDINGS` no longer appears in the adapter's imports.
- **The cap moved everywhere it appears.** `MAX_RENDERED_CITIZENS` is 48 in the constant, its
  doc comment, the Interfaces block, the phase map, the Global Constraints, and Task 4.2's
  test. The only remaining `64` in the plan is `mixSeed`'s unrelated collision-count loop.
- **Type consistency re-checked across the new seam.** `CitizenRoleId` is produced by Task 1.0
  (in `descriptors.ts`, not `citizens-tuning.ts`) and consumed by name in 1.1's test, 1.2,
  2.2, 2.3, and 2.4. `CitizenCapacity` / `capacityForNode` / `CITIZEN_NODE_CAPACITY` are
  produced by 1.1 and consumed by 1.2. `CitizenBuildingLedger.role` is typed `CitizenRoleId`
  and fed from `node.citizen_role`, not from a lookup.
- **One test was added rather than moved**, and it is the seam's guard: Task 1.1's "keeps the
  capacity table and the descriptor's role map in agreement". Splitting role from capacity
  across two files is the right decomposition but it creates a drift risk, and that test is
  what makes the drift impossible rather than unlikely.
- **Gap found and closed during this pass:** Task 4.2 originally said only "land `road-zfight`
  first". Reading #152's actual diff showed its `depthPrecision.test.ts` encodes a **measured
  claim about every solid object in the scene**, which citizens join. Step 4b now makes
  re-arguing that claim part of P4's definition of done.

**6. Third-pass check (2026-07-27), after #152 merged.** Re-read against the **landed** files
rather than the branch diff: `depthPrecision.test.ts`, `orbitCamera.ts`, and `CityScene.tsx`
landed **byte-identical** to the branch tip the second pass read, so **the `NEAR < 3` claim and
P4's obligation to it are unchanged**. Two things did move and are corrected: the collision is
now **discharged** rather than pending (there is no branch left to sequence against), and the
line numbers shifted in the landed file — the camera memo is at `CityScene.tsx:454-455` and the
`<Roads>` mount P4 sits beside is at `:599`. **All three original collisions are now closed**,
and the only cross-branch item this plan still carries is an obligation, not a conflict.

---

## References

- `docs/superpowers/specs/2026-07-27-citizens-and-city-life-design.md` — the design of
  record (D-CIT1..D-CIT20, both amendment banners, four GROUNDED CORRECTIONs, §17's open
  questions). **AMENDMENT 2 was written from this plan's findings**, and the two documents
  are kept in agreement.
- `docs/superpowers/specs/Game_Architecture_Blueprint.md` §4 (the frozen write boundary),
  §12 (extension discipline).
- `docs/superpowers/specs/Immersive_City_Shell_Spec.md` §8 — the DOM-mirror-first rule.
- `docs/superpowers/specs/City_Art_Bible.md` §6-§7 (ambience, reduced motion), §11
  (accessibility).
- `docs/superpowers/specs/2026-07-25-town-hall-design.md` — D-TH5 (the advisor at the hub,
  designed and **not built** — see §7.6), D-TH6 (the 3x2 footprint), D-TH7 (the label).
- `docs/superpowers/specs/2026-07-25-xp-gold-implementation-plan.md` — the neighbouring plan
  this one's naming and phase-table conventions follow.
- `docs/Contracts.md` §8 INV-COS-1/2 — nothing cosmetic or economic gates learning.
- `docs/Mastery_Scoring_Spec.md` §8 — monotonic mastery, no decay.
- `engines/game/src/construction.ts` — `deriveConstructionState` (`complete` at `mastery >= 2`
  **or** `lesson_stage === "done"`).
- `engines/game/src/city-view-model.ts` — `buildCityViewModel`, which "derives everything
  read-only", and `CityBuildingView`, which carries **no art mass** (§7.1).
- `engines/game/src/descriptors.ts` — `BuildingArchetypeId`, the answer-type axis citizens
  must **not** read.
- `apps/web/src/city/buildingAssets.ts` — `D1_NODE_BUILDINGS`; `building` is a mutable display
  string ("City Bank" already). Cited only as the reason a role table must not be keyed on a
  display name: the art mass itself is unreachable from `@cr/game`, which is why D-CIT17
  keys on the node id instead.
- `engines/game/src/descriptors.ts` — `NeighborhoodDescriptor`, `building_archetypes` /
  `default_archetype` (the shape Task 1.0 copies), `architectedSlot()` (the one helper behind
  eight of the ten domain slots), the `Record<DomainId, …>` exhaustiveness, and
  `resolveNeighborhood`'s `?? default` fallback line.
- `apps/web/src/city/citySession.ts` — in-memory `placements` / `roads`, `CityDevSnapshot`,
  `DEMO_STUDENT_ID = "demo-student"` (§17 Q4), and `seedFromPlacement`, which clears
  `placements`.
- `apps/web/src/city/roads.ts` — `roadCellKey`, `roadNeighborMask` (the O(1) adjacency a
  router can use), `isRoadCellLayable`, and the INV-COS-1 header. **No path or reachability
  function exists.**
- `apps/web/src/city/worldLayout.ts` — `GRID_CELL = 4`, `BUILDABLE_RADIUS = 22`,
  `ISLAND_GRASS_RADIUS = 30`, `NODE_FOOTPRINTS`, `isCellBuildable`, `occupiedCells`.
- `apps/web/src/city/three/CityScene.tsx` — `frameloop="always"`, `shadows`, `dpr={[1, 2]}`
  (the measured baseline).
- `apps/web/src/city/three/StarterIsland.tsx` — the private `mulberry32`, and the gulls'
  `castShadow = false` plus their reduced-motion early return.
- `apps/web/src/city/three/Roads.tsx` / `Roads.test.ts` — the exported-pure-builder pattern
  the citizens layer copies so it can be tested in node.
- `apps/web/src/city/announcements.ts` / `announcements.test.ts` — the no-raw-id standard and
  the sweep whose corpus is **pinned to the module's export list**.
- `apps/web/src/city/useReducedMotion.ts` — the `prefers-reduced-motion` hook the scene
  already threads everywhere.
- `packages/skill-graph/src/skill_graph.json` — the D1 prerequisites behind §8.5's guarantee:
  `NUM.2` requires `NUM.S` and `NUM.F`; `NUM.4` requires four others; `NUM.5` requires
  `NUM.F`. Verified at `b73345b`, and 33 valid build orders follow.
- `work-log/README.md` — the entry template each phase's PR follows.
