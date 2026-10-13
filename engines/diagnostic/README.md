# @cr/diagnostic  (Gabe's lane)

Placement/pretest engine. In MVP the pretest doubles as placement — one fused instrument, no
separate placement test (`Assessment_Scoring_Spec` §1). Writes `placement_estimate` (once) and the
immutable assessment records; **never writes mastery** (INV-DIAG-1). Also home to the
graphing-widget implementation, behind the frozen `@cr/components` API.

**The authority is `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` (RATIFIED 2026-07-22; §3.3
and §4.3 amended 2026-07-26, when `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` was ratified
and folded in — that doc is now the rationale record, not a second rulebook).** This file only says
what ships; where it and v2 disagree, v2 wins.

## The instrument: a prerequisite-gated walk over the skill graph

Not a multistage test, and not scored on θ. Both were real — the MST is retired and `θ` is
superseded — see "What is retired" below.

The walk probes one node at a time and lets the prerequisite DAG do the rest:

- **`walk.ts`** — the pure engine. `selectNextProbe` bisects the *frontier*: the depth band between
  the student's deepest measured pass and their shallowest measured fail. It jumps **up** after a
  pass (a robust pass credits the whole prereq closure, so the search can skip it) and **down**
  after a confirmed fail (which prunes the dependent cone). Targeting is **per domain**, so
  evidence from one strand does not aim the probe for an unrelated one. `resolveKnowledgeState`
  collapses the walk into a downward-closed resolved state; unresolved nodes resolve **fail-closed**
  (INV-DIAG-6). Graph-agnostic via an injected `WalkGraph`, which is what lets the scale tests drive
  it off synthetic DAGs; production always uses the registry.
- **`adjudicator.ts`** — per-node adjudication, **confirmation proportional to consequence**. Every
  node opens with one item. The decision stands on that item *unless it would cascade* — crediting a
  large prerequisite closure or pruning a large dependent cone — in which case the node falls
  through to the adaptive 2-of-3. "Large" is a share of the scope (`7/62`), rounded down, so on a
  small scope it reaches 0 and everything is confirmed: **that is why the live 6-node D1 walk is
  bit-identical to its pre-amendment behaviour.** Never reads difficulty.
- **The ceiling** — `DEFAULT_WALK_POLICY.maxItems = 70` scorable items, a backstop for the tail
  rather than the mechanism that sets the typical length. Nodes it leaves unresolved resolve
  fail-closed, unchanged. `ceiling_reached` marks *genuine* truncation only: exhausting the budget
  is necessary but not sufficient, since a walk that resolved its last node on its last affordable
  item finished.
- **`coverage.ts`** — the reported metric, **depth-weighted readiness coverage** over the in-product
  nodes (`getProductNodes()`, 62 today — read it off the registry, never a literal). Weight
  `w(n) = 1 + prereqDepth(n)`. `coverage_measured` is the measured-only denominator, kept for audit.
- **`walk-engine.ts`** — the DI shell: start / serve / record / finalize over the ports, plus
  `placementFor`, which derives the 0–3 city seed from evidence already collected (measured-robust
  3, measured-non-robust or inferred 2, fail with ≥ 1 correct 1, hard fail or pruned 0).

**Measured cost** (`sim/policy-sweep.sim.test.ts`, 62-node scope, n = 6,000, mild noise): median
**38 items / 30 nodes**, p90 62, p99 70, truth accuracy 95.6%, 1.5% genuinely truncated. The live D1
scope is **7 items median** and is held bit-identical through every policy change.

**Test-out and the pass rule.** A node resolved `passed` seeds `placement_estimate >= 2`, and
`>= 2` is the test-out unlock bar — so a mixed 2-of-3 pass **does** test out, exactly as a clean 2/2
does. What a clean 2/2 additionally buys is `robust`: the top seed of 3, and (via `infers`) the
licence to credit the node's unmeasured prerequisite **closure**. That distinction is about downward
inference, never about the node's own unlock. See the probe-policy amendment §3.5, and
`docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` for what the city does with a pass.

## Records, recompute, and versioning

`coverage-measurement.ts` is the pre/post outcome metric: pure functions over the immutable records
only (the `assessment_administration` plus its append-only `assessment_item_response` rows). It
holds no state and reads or writes no `mastery` or `placement_estimate`.

`rebuildWalkState` buckets response rows by node and re-decides them by **folding along the recorded
`routing_path`** (`adjudicateRecordedWalk`) — it still does not replay probe SELECTION, which is what
keeps INV-DIAG-4 true. Adjudication consequence was originally required to be a **static** function
of `(node, scope, graph)` for that reason; the fold is what lifted the requirement, by rebuilding the
resolution the walk had reached at each node from the record itself. Under static rules the fold is
exactly equivalent to adjudicating each node alone. Recompute resolves the rules a record depends on
from a **version-keyed registry of frozen literals**, keyed by the record's own
`scoring_model_version`, and a test fails if `DEFAULT_WALK_POLICY` drifts from the entry registered
for the current version.

`COVERAGE_SCORING_MODEL_VERSION` is **3** as of 2026-08-04. It did **not** bump for the probe-policy
amendment (PR #89) — that change was provably additive over the frozen record population and the
proof is in that amendment §3.4 — and it **did** bump for the tail cut, which is not: the instrument
ceiling can land mid-node, so a finalized record can hold a node with one outcome and no decision,
which the static and live rules resolve differently. That is Route A of probe-policy §3.4.1, and the
outgoing version 2 entry stays registered so records stamped 2 recompute under the rules they were
scored with. Ask `isCoverageScoringModelVersion` rather than comparing against the current version:
"is this a coverage record" and "is this the CURRENT coverage record" were the same question for as
long as there was one coverage version, and the read path shipped the equality until the second one
existed. `scoreCoverageAdministration` applies the validity gates
to one sitting (invalidated item_versions dropped from every denominator symmetrically, application
faults excluded and never scored wrong, then `incomplete` / `needs_review` / `valid`), and
`computeCoverageMeasurementFromRecords` gates a pre/post pair on comparability — same student, same
`blueprint_version` + `scoring_model_version`, counterbalanced forms — reporting the coverage gain
only when both sides are valid and comparable (INV-DIAG-5). The θ-side equivalents
(`recomputeAbilityScore`, `computeMeasurement`) live in `measurement.ts` and are part of the
rollback surface below.

### A rejected change: `invalid_input` is not an application fault

Adding `invalid_input` to `FAULT_STATUSES` has been proposed once and is recorded here
because it reads like a one-line observability win and will be proposed again. **Do not make
it.** `FAULT_STATUSES` is not in `scoring.ts`; it is two module-private, never-exported
duplicates — `measurement.ts` (v1 θ path) and `coverage-measurement.ts` (v2 coverage path, the
live instrument). Only `FAULT_THRESHOLD` is exported.

The proposal was to surface a walk that re-serves one node forever, which currently reports a
0% fault rate. The change would not do that honestly. `invalid_input` is by contract
**malformed student input** — a typo, an empty box, an unclosed paren — and
`Answer_Equivalence_Spec` §12 separates it from an application fault by name, treating it as
unanswered and re-prompted while reserving `scoring_error` / `unsupported_expression` for "the
app broke, not the student"; §12 calls collapsing the two the distinction "the v1 draft got
wrong". `Assessment_Scoring_Spec` §6 scopes `needs_review` to exactly those two statuses.

The consequence is concrete, because `FAULT_THRESHOLD` is 5% of items: a handful of typos
crosses it, which sets `needs_review`, which makes `comparabilityStatus` return
`pre_invalid` / `post_invalid`, which nulls `ability_gain` / `coverage_gain` and drops the pair
out of the reported gain. Students who typo would silently leave the marketed metric. The
number would get **less** honest, not more.

**The signal that would actually be correct** is the same node re-served N times with no state
advance — a counter in the walk engine, not a scoring-status reclassification. `submitProbe`
sets `nextState = state` on any non-scorable status, so `attemptCount` never increments and
`selectProbeItem` is called with an identical `(node_id, attempt, form_id)` key forever. It is
**not worth building yet**: no D1 answer type produces a fault status (the D1 checker set has
zero `scoring_error` / `unsupported_expression` fixtures), and an `invalid_input` re-serve is
recoverable on the student's next keystroke, which is the designed behaviour rather than a
wedge. It becomes worth building if the live scope widens past the six D1 nodes
(`getNodesByScope("mvp")`), which Gabe declined on 2026-07-26.

**Correcting one thing said while this was argued:** the change would *not* have wedged a
learner mid-session. `FAULT_STATUSES` is never read in the live serve path — `walk-engine.ts`
advances on `isScorable` alone and imports nothing from either measurement module. Both copies
are post-hoc reporting only. That objection was raised and is unfounded; the real cost is to
the metric, which is reason enough.

## What is retired, and what is kept for rollback

- **The multistage test (MST) and `θ`.** `docs/Contracts_Amendment_Adaptive_Diagnostic.md` — the
  amendment that proposed them — is **SUPERSEDED** by v2. The MST composition
  (`createAuroraDiagnosticServer`, `createD1MultistageSpec`, `measurement.ts`'s `θ` recompute) is
  **retained solely as a rollback path** from the 2026-07-24 default flip, and the legacy θ branch
  is still dispatched for any administration scored under the old model — `reads.ts` picks the
  metric off the post's `scoring_model_version`. It is not the instrument.
  Note that the item-bank validator still derives its required L1/L2/L3 coverage cells from
  `createD1MultistageSpec`, so those cells are part of this rollback surface.
- **Error typing — deferred post-MVP (2026-07-20).** No misconception vocabulary, no distractor
  tagging, no error-typed feedback in MVP scope; granular lessons plus the walk's descent already
  localize failures. The optional `misconception_tag` log field stays defined in Contracts so this
  switches on later without a schema change. See `docs/Error_Typing_Spec.md`.

## Tests

The `src/**/*.test.ts` suite runs in CI. The `sim/` harness does **not** — it is a measurement
harness of ~100,000 walks, excluded from the root vitest config and from the package `tsconfig`, and
run on demand:

```
npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts
```

## Boundaries

Stay in this dir plus the shared item-bank data files. Build against the frozen shared interfaces;
changing one needs the owning developer's sign-off per `OWNERS.md`.
