---
name: era-infinite-practice
description: >-
  Wire or extend calc-readiness era-level interleaved infinite practice: the
  completion gate, shuffled-cycle scheduler, EraInfinitePractice shell,
  InfiniteDrill streak storage, dev-page entry, and the Town Hall mount. Use
  when adding era infinite practice, interleaving across an era's nodes, or
  connecting a newly authored era's practice pool to the endless drill.
---

# Era infinite practice (interleaved drill)

An **era** endless drill serves problems from every node in the era **whose practice set the learner has finished**, interleaved so each shuffled cycle visits every unlocked skill once before any repeats. It reuses the same grading, streak, skip, and worked-solution reveal behavior as node-scoped infinite practice, but does **not** write mastery.

Node-scoped infinite practice (`InfinitePractice`) is unchanged: one node, uniform random draw, per-node best streak.

## The population is the ERA's, and that is not a domain's

**This drill was domain-scoped until the era model landed, and the swap is a behaviour change rather than a rename.** `docs/Content_Authoring_Split.md` §10.3 is the authority; the consequence for this drill is that the two derivations disagree about real, authored nodes:

- Three domains span eras. `RAT.5` interleaves with the **Early Modern** while `RAT.1`-`RAT.4` and `RAT.6` interleave with the **Medieval**, even though one lesson domain owns all six.
- An era can pull nodes from up to four `content/lessons/<domain>/` directories, so an era's mix is not recoverable from any single domain registry entry.

**Derive the node set from `ERA_SEQUENCE`, never from a `DomainId`.** INV-ERA-5 (`packages/skill-graph/src/eras.ts`) bans the derivation outright, and it is not merely stylistic: a domain can sit in three eras, so no function of a `DomainId` could return one era. This is why `townHallDrillDomainId` was **deleted** rather than converted, and `townHall.test.ts` asserts that no replacement has appeared.

**Some eras have nothing to interleave, and the drill is expected to say so.** Re-measured with `interleavedSkillIds(era.id, "all")` over `ERA_SEQUENCE`: Prehistoric 6/6, Neolithic 5/5, Bronze Age 5/5, Classical 5/5, Medieval 5/5, Early Modern 3/6, Industrial 0/6, Atomic Age 4/9, Information Age 6/6, Cyberpunk 0/9. Two eras have nothing drillable, and both render the locked panel. That is the era model reporting the content that exists. Do **not** hide an empty era from a surface to make it look finished; the `?dev` page lists all ten and prints each one's drillable count, which is the figure to read — this line has already claimed "six empty eras" and then "three", and a transcribed census goes stale the next time a node's items land.

## An era that cannot mix is not the end of the offer (`whenEraCannotMix`)

**A learner can only complete era one's nodes today** — the city view model builds without a neighbourhood so it resolves D1's plots, the descriptor resolver admits `mvp`-scope nodes only, and `D1_NODE_IDS` seeds from `getNodesByScope("mvp")`, so eras two through ten resolve to **zero plots**. Pinned to the era's own pool, the hub's entry point therefore went inert the moment the learner advanced, and its reason contradicted them: measured at `03d5a2b9` with all six era-one skills finished, era one read *"Mixed problems drawn from the 6 skills you have practiced"* and eras two through ten read `aria-disabled="true"` plus *"(0 of 6 so far)"*.

So `interleavedPool` takes a third argument and `EraInfinitePractice` takes it as a prop:

| Value | Behaviour | Who passes it |
|---|---|---|
| `"lock"` (default) | The era's own pool as it stands; an empty era reads as empty. | The `?dev` page, the advance ceremony, `drillBound.test.ts` — every caller whose SUBJECT is the era's content. |
| `"revisit-practiced"` | Widen to every skill the learner has practised, in any era, when fewer than `INTERLEAVED_PRACTICE_MIN_COMPLETED` of the era's own can be mixed. | The Town Hall. |

Four rules, each with a guard in `interleavedPool.test.ts`:

1. **The floor does not move.** The bar is still `INTERLEAVED_PRACTICE_MIN_COMPLETED`, measured on the pool that will actually be drilled. One practised skill is still one, in every era.
2. **`"all"` never widens**, whatever is passed. The dev bypass has no learner set to widen to, and widening it would make six unauthored eras print era one's count under their own names.
3. **Nothing widens while the era can mix its own.** Era one asked for the fallback gets byte-identical output to era one asked for nothing.
4. **The pool says which population it drew from** (`source: "era" | "practiced"`), because a surface has to be able to name a revisit rather than pass another era's skills off as this one's.

**A host that widens its OFFER must pass the same value to the drill**, or the gate measures one pool and the drill builds another — an enabled button that lands on the locked screen. Assert that by driving the real panel into the real drill in a later era, never by comparing props; a matching prop is exactly what a host gets right while still being wrong (`CitySurface.test.tsx`, *"never reports zero practiced skills to a learner who has finished six"*).

## Architecture (do not duplicate)

| Piece | File | Role |
|-------|------|------|
| Shared UI | `apps/web/src/lessons/InfiniteDrill.tsx` | Streak, no hints, skip/reveal, NPC copy |
| Node wrapper | `apps/web/src/lessons/InfinitePractice.tsx` | Filter pool by `node_id`; `createRandomScheduler` |
| Era wrapper | `apps/web/src/lessons/EraInfinitePractice.tsx` | Completion gate + `createInterleavedScheduler`; locked panel |
| Pool derivation | `apps/web/src/lessons/interleavedPool.ts` | `interleavedPool` (items + skill ids + `source`), keyed on `getEra(eraId).nodes`; `interleavedPoolItems` / `interleavedSkillIds` are thin era-strict reads of it |
| Era data | `packages/skill-graph/src/eras.ts` | `ERA_SEQUENCE`, `getEra`, `getEraNodes`, `getEraOfNode`, `eraNumber` |
| Completion rule | `apps/web/src/lessons/lessonProgress.ts` | `PRACTICED_MASTERY`, `completedNodeIdsFrom(nodeStates)` |
| Schedulers | `apps/web/src/lessons/infiniteScheduler.ts` | `createRandomScheduler` / `createInterleavedScheduler` |
| Item lookup | `apps/web/src/lessons/practiceChecker.ts` | `practiceItemsById` (every registered domain's pool items) |
| Lesson titles | `apps/web/src/lessons/domains.ts` | `lessonByNode`, aggregated across domains so a cross-directory era resolves |

**Do not** fork the drill JSX. Add a thin wrapper or mount `EraInfinitePractice` with `{ eraId, completedNodeIds, onExit }`.

**The scheduler and the shell are scope-agnostic** and needed no change when the scope moved. If a future re-scope is ever proposed, only the population, the storage key and the mounts should move; a diff that reaches `InfiniteDrill.tsx` or `infiniteScheduler.ts` is doing something else.

## Completion gate

The drill only serves skills the learner has **already practiced**, because interleaving teaches nothing on a first exposure and the drill has no hints and no teaching.

**The rule is `mastery >= 1`** (`PRACTICED_MASTERY`), per `docs/Mastery_Scoring_Spec.md` §2: a scored five-problem set never lands below 1, and nothing else raises mastery. Do **not** substitute `completion_status === "complete"`, `lesson_stage === "done"`, or `pastFoundation` — a diagnostic test-out sets all three while leaving `mastery: 0`, so they admit skills the learner never practiced.

Derive the list with the shared helper, never inline:

```ts
import { completedNodeIdsFrom } from "./lessonProgress";

const completedNodeIds = completedNodeIdsFrom(load.node_states);
```

`EraInfinitePractice` takes it as a **required** prop so no call site can silently skip the gate:

```ts
completedNodeIds: readonly string[] | "all";
```

`"all"` bypasses the gate and is a **dev-preview escape hatch only** (the `?dev` page). Never pass it from a learner-facing surface.

When the filtered pool is empty — no completed skills, or none of them have pool items, or the era is unauthored — the component renders `EraPracticeLocked` instead of the drill: same `advisor-lesson--infinite` chrome and back button, an `AdvisorNpc` line, and the shared `.advisor-lesson__gate-hint` copy class. The gate is checked **before** `createInterleavedScheduler`, whose `requireNonEmpty` would otherwise throw during render.

The locked hint **names the era only under `"lock"`**. Under `"revisit-practiced"` the pool already looked past the era and still found nothing, so *"in this era"* would point the learner at the wrong shortfall; it reads "No completed skills yet." instead.

**An unknown era id is a different case and throws.** `getEraOrThrow` is used deliberately, following `eraBuildableRadius`'s fail-loud discipline: an unauthored era and a misspelled one would otherwise be indistinguishable, and the first is a supported product state.

## Interleaving (`createInterleavedScheduler`)

Runs over the **gated** pool, so the cycle length is the learner's unlocked skill count.

1. Group pool items by `node_id`.
2. Maintain a **bag** of node ids. When empty, refill with a shuffled copy of all nodes.
3. If the first bag slot equals the last node served, swap it with a later slot (no back-to-back same skill across cycle boundaries).
4. Draw one item from the chosen node, avoiding that node's immediately previous item when alternatives exist.

Injectable `rng` in tests; production uses `Math.random`.

## Streak storage

| Scope | localStorage key |
|-------|------------------|
| Node drill | `cr.infinitePractice.bestStreak.${nodeId}` |
| Era drill | `cr.infinitePractice.bestStreak.era.${eraId}` |

Current streak is in-memory only. Best streak persists per key above.

**The pre-era `…bestStreak.domain.${domainId}` values are not migrated**, and that is a decision rather than an oversight: a domain streak and an era streak record different mixes, so carrying one over would only be right for the eras whose node set happens to match a domain's. A learner's interleaved best streak resets once. Any new key must keep the `cr.` prefix, which is what `devServerReset.test.ts` sweeps on.

## Skill label (era drill only)

`EraInfinitePractice` passes `skillLabelFor` → `lessonByNode[item.node_id]?.title ?? item.node_id`. `lessonByNode` is aggregated across every registered domain, which is what lets a cross-directory era resolve a title without knowing which directory a node came from.

- **Hidden while answering** — learner must identify the skill.
- **Shown after** correct, incorrect, or skip (`.infinite-practice__skill` chip in `.lesson-practice__head`).

Node drill omits `skillLabelFor`.

## Wiring a newly authored era

When an era's nodes already have lesson packs registered in `LESSON_DOMAINS` and practice items in `practiceItemsById`, **no pool code is required** — `interleavedPoolItems` reads `ERA_SEQUENCE`, so a node becomes drillable the moment the item bank registers it and the learner scores its practice set. There is no era registry to add an entry to, and there must not be one: nothing may key content on an era-shaped path.

Checklist for an era whose packs are landing:

1. Register each **domain directory** the era touches in `apps/web/src/lessons/domains.ts` (`defineDomain` with `practiceNodes`, loader, `practiceSource`). An era spanning four directories is four entries, not one.
2. Ensure practice items for those nodes land in `practiceItemsById` (same path as graded practice).
3. Nothing else. The dev page already lists the era, and its drillable count will move on its own.

No lesson JSON changes. No extra infinite-practice authoring per template.

## Entry points

### Dev preview (`?dev`)

`apps/web/src/DevLessons.tsx` — separate **Era practice** section (not inside the "All lessons" track, which stays domain-shaped because packs live in domain directories). One card per `ERA_SEQUENCE` entry, numbered with `eraNumber`, showing "N of M drillable skills unlocked" plus two buttons:

- **Open interleaved drill** — honours the gate, using `completedNodeIdsFrom(devSessionStore.load()?.node_states ?? [])`. The `?dev` page writes no mastery, so this reflects whatever the city saved in this browser (and shows the locked panel in a fresh one).
- **Open all skills (dev)** — passes `"all"`. The bypass exists so the drill stays previewable without city progress; do not copy it to a learner surface.

The M in "N of M" is `interleavedSkillIds(era.id, "all").length` — derived from the same pool the drill pools on, so the number printed and the drill the button opens cannot disagree.

When adding a dev-only preview for a new surface, keep era cards in their **own** `<section>` so `DevLessons.test.tsx` scoping on "All lessons" stays stable.

### Town Hall (live)

`CitySurface` mounts it at the hub, gated on `INTERLEAVED_PRACTICE_MIN_COMPLETED` (2, D-TH3):

```tsx
<EraInfinitePractice
  eraId={eraId}
  completedNodeIds={practicedNodeIds}
  whenEraCannotMix="revisit-practiced"
  backLabel="Back to city"
  onCorrectAnswer={handleInterleavedCorrect}
  onExit={closeInterleavedPractice}
/>
```

`eraId` is the surface's own prop — the era the city is wearing, the same value that picks each building's D-ERA29 dressing subtitle. Pass it through; do not read `CURRENT_ERA_ID` at the mount, or the drill stops following the chapter the learner is in (`CitySurface.interleaved.test.tsx` fails on exactly that).

`whenEraCannotMix` is `"revisit-practiced"` here because interleaved practice is the hub's only always-available repeatable activity, and it **must** be the same value the panel's gate and copy were computed from (`interleavedPool(eraId, practicedNodeIds, "revisit-practiced")`). The panel reads `pool.source` to say which mix it is offering.

Memoize `completedNodeIds` so a new array identity per render does not rebuild the scheduler (and reset the drill). Do **not** route through `AdvisorLesson` or `LessonEntry = "infinite"` — those are node-scoped. The hub drill is a standalone era activity.

## Product rules (inherited from node drill)

- **No hints.** Skip or incorrect → worked solution reveal (same `worked_solution` + `WORKED_SOLUTION_VISUALS` as graded practice).
- **No mastery writes.** Decorative streak only — the drill reads completion, it never grants it.
- **Completed skills only.** A locked era shows the unlock panel, never an empty or crashing drill.
- **Same checker** as graded practice (`practiceChecker`, `checkerVersionForItem`).
- **Same format guards** for text answers (`answerFormat.ts` numeric / reduced-fraction notes).

## Tests to add or extend

| File | What |
|------|------|
| `infiniteScheduler.test.ts` | Cycle coverage, no back-to-back nodes, empty pool throws |
| `lessonProgress.test.ts` | `mastery >= 1` kept; mastery 0 dropped even when it looks complete |
| `interleavedPool.test.ts` | The **population** guard: containment in `getEraNodes` per era, a set-equality census against the servable nodes with a floor under it, the `RAT.5` medieval/renaissance split, and the domain-keyed derivation asserted to differ. Plus the four `whenEraCannotMix` rules above, each measured over the whole era sequence rather than one worked example |
| `EraInfinitePractice.test.tsx` | Streak on correct; the era streak key written and the domain key not; skill label hidden while answering, shown after skip/answer; pool restricted to completed nodes; locked panel when none (or only another era's) are completed; **the same props plus `whenEraCannotMix="revisit-practiced"` opening instead of locking**; locked for an unauthored era; throws for a non-era id |
| `CitySurface.interleaved.test.tsx` | The stub receives `data-era` equal to `ERA_SEQUENCE[0].id`; a surface rendered in a different era offers a NAMED revisit and forwards the mode |
| `CitySurface.test.tsx` | Era two with six practised skills: the reason names the revisit, never reports zero, and the REAL drill opens on a gradable problem |
| `DevLessons.test.tsx` | Every `ERA_SEQUENCE` entry listed with drill buttons, and more cards than there are lesson domains; locked without saved progress; drill opens after a saved practice set; bypass always opens; an unauthored era reads "0 of 0" and locks |

**Write the population guard as a derivation, not a list**, per `.cursor/rules/qa-verification.mdc`: read the node set from `getEraNodes`, put a floor under any containment assertion, and prove the guard fails by moving one node. The measured injection for this drill is one line in `interleavedPoolItems` — `new Set([...era.nodes, "RAT.5"])` — which fails three assertions in `interleavedPool.test.ts`, the first naming the node and the era it leaked into.

Run from `apps/web`: `npx vitest run infiniteScheduler lessonProgress interleavedPool EraInfinitePractice CitySurface.interleaved DevLessons`.

## Verify before finishing

- `npm run typecheck`
- `npm test -w @cr/web` (the jsdom suite; it is also a project of the root `test:unit` config, so `npm run check` does cover it)
- Every era appears on the `?dev` Era practice section, including the unauthored ones, each with its drillable count
- The era drill draws from every **completed** node of that era, and only those (spot-check two different `node_id`s over ~10 problems)
- A browser with no saved progress gets the unlock panel, not a crash or an empty drill

## Out of scope

- Per-node infinite practice changes (unless explicitly requested)
- Lesson JSON or template authoring (see **`practice-templates`** — the drill consumes existing pool items as-is)
- Anything era-keyed under `content/` or `packages/item-bank/src/`. Files stay in domain directories; the era is a reading of the node set, not a path.
