# Diagnostic 11-Node Scope Measurement (D1 + D2)

**Measured 2026-07-26. Status: MEASUREMENT RECORD — non-normative.** Owner: Gabe (diagnostic lane).
Companion to `Diagnostic_Probe_Cost_Measurement.md` (the 62-node cost record) and
`Contracts_Amendment_Diagnostic_Probe_Policy.md` (the policy that ships).

This record changes no invariant, no budget, and no engine behaviour. **No production code was
changed to produce it.** It answers the two empirical questions that gate widening the live
diagnostic past its current 6-node D1 scope, so the decision is made on numbers rather than on
argument.

The candidate scope is **D1 + D2 = 11 nodes**:

```
NUM.S  NUM.F  NUM.2  NUM.3  NUM.4  NUM.5    (D1, product_scope=mvp)
EXP.1  RAD.1  RAD.2  RAD.3  RAD.4           (D2, product_scope=target)
```

The 62-node full scope is not a candidate: `createItemPackWalkSource` throws for a node with no
authored items (`packages/item-bank/src/bank.ts`), and most of the 62 have none — the opening probe
at 62 nodes is `FUN.6`, which has none, so `start()` would 500 on the first request.

**Closure claim, verified rather than assumed.** The 11-node set is prerequisite-closed: no in-scope
node has a transitive prerequisite outside the set. The harness re-derives and prints that check on
every run. It matters because `resolveKnowledgeState` only ever credits a node whose *in-scope*
prereqs passed, so an out-of-scope prerequisite silently drops out of the resolution rather than
being measured. Every one of the 11 also has a lesson shell, a practice pool, and ≥3 distinct walk
items per form.

---

## 1. Headline

| | answer |
|---|---|
| **Does the live v1 checker grade the D2 walk items?** | **No.** 22 of 66 walk-servable items are ungradable, and 4 of the 5 D2 nodes would hang the walk. **A checker change is required.** |
| **What does the 11-node walk cost?** | **12 items median** (p90 14, p99 17, max 22), 6 nodes probed, **96.0% truth accuracy**, **0.0%** hit the 70-item ceiling. |
| **What is the opening probe?** | **`NUM.2`** — unchanged from the live D1 scope, and a sensible first question. |
| **What does the new `confirmThreshold = 1` regime cost?** | **−1.8 items, −1.5 accuracy points.** It never credits or prunes anything: at 11 nodes a single-item decision is structurally incapable of cascading. |

---

## 2. Question 1 — the v1 checker cannot grade the D2 walk items

Both walk composition points hardcode `createD1AnswerChecker` at checker version 1
(`services/diagnostic-runtime/src/aurora-server.ts`, `apps/web/src/diagnostic/browserRuntime.ts`),
and v1 is stamped on every submission. The D2 nodes' walk items live in `PRODUCT_ITEM_PACK`, which
is only ever validated through `createProductAnswerChecker` at version 2.

**Method.** Every walk-servable item for the 11-node scope — 11 nodes × 2 forms × 3 attempts = **66
items**, taken from the real `createItemPackWalkSource` over `D1_WALK_ITEM_PACK + PRODUCT_ITEM_PACK`
— was graded through `createD1AnswerChecker` twice: once on the item's own answer key, and once per
plainly-correct alternate spelling (whitespace variants, implicit multiplication, parenthesised,
skipping alternates that would legitimately violate the item's declared representation). 158
alternates in total.

| node | items | key grades `correct` | non-scorable | key graded wrong | verdict |
|---|---|---|---|---|---|
| `NUM.S` | 6 | 6 | 0 | 0 | clean under v1 |
| `NUM.F` | 6 | 6 | 0 | 0 | clean under v1 |
| `NUM.2` | 6 | 6 | 0 | 0 | clean under v1 |
| `NUM.3` | 6 | 6 | 0 | 0 | clean under v1 |
| `NUM.4` | 6 | 6 | 0 | 0 | clean under v1 |
| `NUM.5` | 6 | 6 | 0 | 0 | clean under v1 |
| `EXP.1` | 6 | 2 | **4** | 0 | **wedges the walk** |
| `RAD.1` | 6 | 0 | **6** | 0 | **wedges the walk** |
| `RAD.2` | 6 | 0 | **6** | 0 | **wedges the walk** |
| `RAD.3` | 6 | 6 | 0 | 0 | clean under v1 |
| `RAD.4` | 6 | 0 | **6** | 0 | **wedges the walk** |
| **total** | **66** | **44** | **22** | **0** | **4 of 11 nodes wedge** |

Every alternate spelling of a gradable key also graded `correct` (96 of 96 on the clean nodes); no
alternate on a wedging node was gradable at all.

**Why each one fails** — v1's grammar, not its arithmetic:

| reason code | count | cause |
|---|---|---|
| `invalid_input` / `unsupported_syntax` | 15 | `sqrt(...)` and `abs(...)` are not in v1's function grammar (`parseSafeExpression` is called with no `allowedFunctions`). All of `RAD.1`, all of `RAD.2`, `RAD.4` form B. |
| `invalid_input` / `unsupported_symbolic_denominator` | 4 | `EXP.1`'s `1/x^2` positive-exponent form; v1 rejects a variable denominator. |
| `invalid_input` / `unknown_symbol` | 3 | `RAD.4`'s variable radicands; `radicalAnswer` declares no `allowed_symbols`, which is the gate routing an item to v2's variable-aware radical path. |

**Two details that make this worse than the failure mode anticipated.**

**(a) It is `invalid_input`, not `scoring_error`.** Both are equally fatal to the walk — `isScorable`
admits only `correct` and `incorrect`, so `submitProbe` leaves the state unchanged, `attemptCount`
does not advance, and the identical item is re-served forever. But only `scoring_error` and
`unsupported_expression` are in `FAULT_STATUSES`, so an `invalid_input` wedge does **not** count
toward the fault budget and never trips `needs_review`. The administration would hang with a **0%
fault rate** and look healthy in every metric.

**(b) `EXP.1` is form-dependent.** Form A wedges on attempt 0 — the learner's very first `EXP.1`
question. Form B grades attempt 0 and wedges on attempt 1. So the hang is not reliably reproducible
from a single manual pass, which is how it would escape a smoke test.

`RAD.3` is the only D2 node v1 handles, and only because its keys are plain rationals
(`answer_type: numeric`, `simplification: none`) with no radical in the answer.

### 2.1 Verdict

**A checker change IS required for an 11-node scope.** This is not a latent risk that happens to be
fine in practice; 4 of the 5 D2 nodes hang the walk on the first or second item served.

---

## 3. What the checker change costs

**The fix is sufficient and does not regress D1.** `createProductAnswerChecker` (version 2) grades
**all 66** walk-servable items `correct`, including all 36 D1 items, plus all 158 alternate
spellings. The v2 checker is a superset of v1 over this pool; no third checker and no per-item
routing is needed.

**Comparability is not the cost — the premise that it is does not survive checking.**
`equivalence_checker_version` is **not read by either comparability gate**. `comparabilityStatus` in
`engines/diagnostic/src/coverage-measurement.ts` and in `engines/diagnostic/src/measurement.ts` both
compare exactly three things: `blueprint_version`, `scoring_model_version`, and that `form_id`
differs between pre and post. Bumping the checker stamp from 1 to 2 therefore makes **zero existing
administrations non-comparable**. (`walk-runtime.ts` line 38-39 is
`DEFAULT_WALK_BLUEPRINT_VERSION` — the *blueprint* version, which is in the gate. The checker
version, three lines above it, is not.)

**Historical records recompute unchanged.** `rebuildWalkState` reads the stored `scoring_status` and
`authoritative_correct` off the immutable response rows and never re-invokes a checker, so no past
administration is re-graded by a change of composed checker.

**The real cost is that the version stamp must move atomically across three files.** Both checkers
fail closed on a version mismatch — measured in both directions, each returns
`scoring_error` / `checker_version_unsupported`:

| file | what it carries |
|---|---|
| `services/diagnostic-runtime/src/aurora-server.ts` | the server-side checker + the item pack it grades over |
| `apps/web/src/diagnostic/browserRuntime.ts` | the browser checker **and** `DIAGNOSTIC_CHECKER_VERSION` |
| `services/diagnostic-runtime/src/walk-runtime.ts` | `DEFAULT_WALK_VERSIONS.equivalence_checker_version`, stamped on the administration |

The sharp one is the client stamp: `DiagnosticRunner.tsx` puts `DIAGNOSTIC_CHECKER_VERSION` on every
submission and the server grades that submission with whatever checker it composed. A half-migration
(client still stamping 1, server composed at 2) returns `scoring_error` on **every** item including
D1's — a total wedge, not a partial one. So yes: both composition points must move together, and the
client-side constant with them.

Widening the scope separately requires widening the **item pack** at the same composition points
(`aurora-server.ts` defaults `itemPack = D1_WALK_ITEM_PACK`), or `createItemPackWalkSource` throws
for the D2 nodes before any checker is reached.

---

## 4. Question 2 — what the 11-node scope costs

Pooled across all three ability profiles, slip 0.10 / guess 0.05, **n = 6,000**, shipped
`DEFAULT_WALK_POLICY`:

| | min | median | mean | p90 | p99 | max |
|---|---|---|---|---|---|---|
| **Items answered** | 7 | **12** | 11.8 | **14** | **17** | **22** |
| Nodes probed | 4 | 6 | 5.8 | 7 | 8 | 11 |

- **Truth accuracy: 96.0%** (fraction of the 11 nodes classified correctly against each student's
  generated ground truth).
- **Students hitting the 70-item ceiling: 0.0%.** The longest walk observed was 22 items. The
  ceiling never binds at this scope, and `ceiling_reached` is never set.
- Item distribution: 9.3% finish in 6-8, 29.0% in 9-11, 52.2% in 12-14, 8.8% in 15-17, 0.7% in
  18-20, and a rounding-error tail at 21-23.

Across noise conditions the scope is insensitive — median 12 at all three:

| noise | items med / p90 / p99 / max | nodes med / p90 / p99 / max |
|---|---|---|
| noiseless | 12 / 12 / 12 / 12 | 6 / 7 / 7 / 7 |
| mild (slip .10 / guess .05) | 12 / 14 / 17 / 22 | 6 / 7 / 8 / 11 |
| moderate (slip .15 / guess .10) | 12 / 15 / 18 / 23 | 6 / 7 / 8 / 11 |

**This is a shippable instrument length.** 12 items sits inside the anxiety-sensitive band the D1
diagnostic was sized for, well under the 30-45 industry band, and roughly a doubling of the live
7-item walk for nearly a doubling of the assessed graph.

---

## 5. The opening probe stays `NUM.2`

`nearestToTarget` breaks depth ties on how many **in-scope** unknowns a node reaches, so the opening
probe is scope-sensitive and could not be settled by reading. Measured:

| scope | opens on | depth | domain | passClosure | failCone |
|---|---|---|---|---|---|
| D1 (6, live) | **`NUM.2`** | 1 | D1 | 2 | 1 |
| **D1+D2 (11)** | **`NUM.2`** | 1 | D1 | 2 | 6 |
| full (62) | `FUN.6` | 0 | D6 | 0 | 0 |

**The 11-node opening probe is `NUM.2`, the same node the live instrument opens on.** The
per-domain stage picks the domain with the most unknowns — D1's 6 beats D2's 5 — then bisects to
`ENTRY_DEPTH = 1` within it, where `NUM.2` beats `NUM.5` on the span tie-break (8 in-scope unknowns
reached versus 1).

This is a sensible first question and a good outcome for the widening: `NUM.2` is a depth-1 D1 node
whose pass credits two prerequisites and whose failure prunes six, so the first item is maximally
informative, and — unlike the 62-node scope, which opens on an isolated `FUN.6` — the learner's
first impression of a wider diagnostic is unchanged from today's. **No opening-probe work is needed
to widen to 11 nodes.** The §8 first-impression problem recorded in the probe-policy amendment is a
full-scope problem, not an 11-node one.

---

## 6. What `confirmThreshold = 1` costs — isolated from the scope change

`confirmThresholdFor(11, 7/62) = 1`, versus **0** at D1 and 7 at 62 nodes. At threshold 0 every
decision is confirmed (the ratified 2-of-3) and the `itemCount === 1` branch of `adjudicate` is
unreachable. At 11 nodes it goes live for the first time on a shipped scope. That is a **regime
change layered on a scope change**, so the two are separated here: the same cohort, with the same
pre-drawn responses, run twice.

### 6.1 Which decisions the threshold can take on one item

A one-item decision is permitted only when its cascade is smaller than the threshold — so at
threshold 1, only when it cascades **nothing at all**:

| node | depth | passClosure | failCone | one-item pass? | one-item fail? |
|---|---|---|---|---|---|
| `NUM.3` | 0 | 0 | 6 | **yes** | no |
| `NUM.F` | 0 | 0 | 8 | **yes** | no |
| `NUM.S` | 0 | 0 | 7 | **yes** | no |
| `NUM.2` | 1 | 2 | 6 | no | no |
| `NUM.5` | 1 | 1 | 0 | no | **yes** |
| `NUM.4` | 2 | 4 | 5 | no | no |
| `EXP.1` | 3 | 5 | 2 | no | no |
| `RAD.1` | 3 | 5 | 3 | no | no |
| `RAD.2` | 4 | 6 | 0 | no | **yes** |
| `RAD.3` | 4 | 7 | 0 | no | **yes** |
| `RAD.4` | 4 | 7 | 0 | no | **yes** |

**A single-item pass at this scope credits a prerequisite closure exactly never.** The only three
nodes that can pass on one item are the roots, whose in-scope prerequisite closure is empty, so
there is nothing for `infers` to credit. Symmetrically, the only four nodes that can fail on one
item are leaves with an empty dependent cone, so a one-item failure prunes nothing. The measurement
confirms the structural argument: **0.000 nodes per session** are credited `inferred` by a
single-item pass alone.

That is the design working as intended, and it is worth stating plainly because it is the risk the
threshold exists to bound: at 11 nodes, the `itemCount === 1` branch cannot make a cascading
mistake, only a local one.

### 6.2 The isolation

Same 6,000 students, same pre-drawn responses, mild noise:

| | items med | items mean | p90 | p99 | max | truth accuracy | one-item decisions/session |
|---|---|---|---|---|---|---|---|
| **Shipped (`confirmThreshold = 1`)** | **12** | 11.79 | 14 | 17 | 22 | **96.0%** | 1.14 (0.54 pass + 0.60 fail) |
| Threshold pinned to 0 (2-of-3 everywhere) | 13 | 13.58 | 17 | 21 | 30 | 97.5% | 0.00 |
| **delta** | **−1** | **−1.79** | −3 | −4 | −8 | **−1.51 pts** | +1.14 |

**Threshold 1 buys 1.8 items and costs 1.5 accuracy points.** It decides **1.14 nodes per session
on a single item — 19.8% of all probed nodes** — split roughly evenly between passes (0.54) and
fails (0.60).

The accuracy cost is entirely **local mis-measurement** of the seven cascade-free nodes: one item is
noisier than 2-of-3, so a slip on `NUM.S` records a failure that a confirming item would have
caught. It is never a wrong cascade, because §6.1 shows a cascade is structurally impossible here.
The tail is where the threshold pays most: p99 drops 21 → 17 and max 30 → 22.

**Whether that trade is acceptable is a judgment, not a measurement, and this note does not make
it.** For calibration: the same trade at 62 nodes was ratified at a much worse exchange rate
(97.9% → 95.6% for 82 → 38 items). Pinning the fraction to 0 for an 11-node scope is a one-line
policy option that costs 1.8 items and is available if 96.0% is judged too low — but it would make
the 11-node walk behave differently from the 62-node one, which is exactly what the scope-relative
fraction exists to avoid.

---

## 7. Do not interpolate between the measured scopes

Under the shipped policy, at n = 6,000, mild noise:

| scope | nodes | items median | nodes probed (median) | confirmThreshold |
|---|---|---|---|---|
| D1 (live) | 6 | 7 | 3 | 0 |
| **D1+D2** | **11** | **12** | **6** | **1** |
| full | 62 | 38 | 30 | 7 |

Linear interpolation on node count between the two known scopes predicts **9.8 items** at 11 nodes.
The measured value is **12** — interpolation understates by 18%. The threshold moving in integer
steps is one reason; the other is that the marginal node's cost depends on where it sits in the DAG,
and D2's five nodes are a deep chain hanging off `NUM.4` rather than five independent probes.

Cost scaling across the two steps is **sub-linear in node count** under the shipped policy (6 → 11
nodes is ×1.83 for ×1.71 items; 6 → 62 is ×10.3 for ×5.4), which is a different picture from the
pre-#89 policy that `Diagnostic_Probe_Cost_Measurement.md` §7 recorded as slightly super-linear.
Both are true of their own policy; quote the shipped one.

---

## 8. The D1 baseline is unchanged

The harness addition disturbs nothing. On the same run that produced everything above, both
published baselines reproduce **digit for digit**:

| scope | figure | recorded | this run |
|---|---|---|---|
| D1 (6 nodes), mild | items med / p90 / p99 / max | 7 / 12 / 15 / 18 | **7 / 12 / 15 / 18** |
| 62-node, mild | items med / p90 / p99 / max | 38 / 62 / 70 / 70 | **38 / 62 / 70 / 70** |
| 62-node, mild | nodes med / p90 / p99 / max | 30 / 40 / 45 / 50 | **30 / 40 / 45 / 50** |

Independently confirmed by running the pre-change harness file side by side with the changed one on
the same seeds: every shared measurement is byte-identical. The only behavioural change to the
harness is that `runWalk` now takes an optional policy argument, defaulted to `DEFAULT_WALK_POLICY`,
which is what it previously used unconditionally.

---

## 9. Method and reproduction

Same method as `Diagnostic_Probe_Cost_Measurement.md` §10, unchanged: the real engine
(`startWalk` / `recordScoredOutcome` / `resolveKnowledgeState`) over the real registry graph;
coherent synthetic students forced downward-closed over the actual DAG; three ability profiles
(homogeneous / heterogeneous / independent-strands) pooled; slip and guess injected at the responder
with every `(node, attempt)` response pre-drawn, so the §6.2 A/B is a paired comparison rather than
two independent samples.

**Read `Diagnostic_Probe_Cost_Measurement.md` §13.7 before scoring any new policy on this harness.**
The student model makes same-depth same-domain nodes near-perfectly correlated, so a policy that
infers across siblings will post a fake win. Everything measured here is DAG-structural.

Reproduce from the repo root:

```
echo 2000 > engines/diagnostic/sim/sample-size.local
npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
  engines/diagnostic/sim/probe-cost.sim.test.ts --disableConsoleIntercept
```

**`--disableConsoleIntercept` is required and was missing here until 2026-07-31.** Under vitest
4.1.10 a passing test's `console.log` is swallowed without it, so the command as previously written
runs green and prints nothing at all — every figure in this note is a `console.log`.

`sample-size.local` is gitignored and is the reliable channel: `SIM_N` in the environment does not
reach the vitest worker through `npx` on Windows. **Always check the printed `n=` before believing a
sample size** — the figures above are all `n=6000`, which is `SIM_N = 2000 × 3` pooled profiles. The
whole file takes about 100 seconds; the 11-node test alone is about 1 second.

Re-run on 2026-07-31 at `c870c0b5`: every figure in §4, §5, §6.1 and §6.2 reproduces digit for digit.

The harness remains **excluded from CI by design**: it lives outside `engines/diagnostic/src/`, so
neither the root `vitest.config.ts` (`engines/**/src/**/*.test.ts`) nor `vitest.browser.config.ts`
collects it, and it is outside the package `tsconfig` (`include: ["src/**/*"]`) so `tsc --build`
never sees it. Confirmed still true after this addition.

The Question 1 checker probe was a **throwaway** and was deleted; §2 records its output. It is
cheaply rebuilt: grade `createItemPackWalkSource` output for the 11 nodes through
`createD1AnswerChecker`, or equivalently run `validateWalkPool(pack, expected, D1_CHECKER_CONFIG)`
over the combined pack, which applies the same self-consistency check.

---

## 10. What this decides, and what it does not

**Settled by measurement:**

- The 11-node set is prerequisite-closed and fully resourced (items, lesson, practice).
- v1 cannot grade 4 of the 5 D2 nodes. **A checker change is a hard prerequisite**, not an
  optimization.
- Moving both composition points plus the client stamp to v2 is sufficient and regresses nothing.
- No existing administration becomes non-comparable.
- The instrument costs 12 items at the median, never reaches the ceiling, and opens on `NUM.2`.
- The threshold-1 regime cannot cascade a single-item decision at this scope.

**Not decided here, deliberately:**

- Whether 96.0% truth accuracy is acceptable, or whether the confirm fraction should be pinned to 0
  for this scope (§6.2).
- Whether to widen at all, and on what schedule.
- The coverage-denominator consequences of a scope change (`Diagnostic_Probe_Cost_Measurement.md`
  §11(C) flags that widening changes what "ready for X% of the graph" means).

### 10.1 Evidence gathered for the two open items (2026-07-31)

**Both remain open and both are still Gabe's call.**
`Diagnostic_11_Node_Scope_Decision_Evidence.md` gathers the numbers so they are cheaper to make,
and it changes nothing here except the two §6.2 corrections below. Its findings in brief:

- **The widen question has no content-depth component.** All 15 practice cells across the five D2
  nodes are shape-complete (gap 0 everywhere), and all five hold exactly `MAX_PROBE_ITEMS = 3` walk
  items per form. Nothing is owed authoring. §3 of that record is the per-cell table.
- **What "throws for pool thinness" on a scope flip is a pack-composition gap, not a pool.** The
  five nodes hold **0** items in `D1_WALK_ITEM_PACK`, which is what both composition points default
  to; `createItemPackWalkSource` reports an absent node with the same *"pool too thin for the
  2-of-3 rule"* message it uses for a genuinely short one. Measured over the combined pack at
  11-node scope, the throw disappears and is replaced by exactly the §2 wedge on `RAD.1`; with the
  v2 checker the walk completes in 12 items and resolves 11 of 11. So §3's bill is the whole bill.
- **96.0% is not spread thin.** A 54.5% cohort pays 2.76 points and the other 45.5% pays nothing.
  The error runs about 39:1 in the fail-closed direction — redundant review, not missed gaps.

**Two corrections to §6.2, which this note has wrong on its own §6.1 table:**

1. §6.2 illustrates the cost with *"a slip on `NUM.S` records a failure that a confirming item would
   have caught."* **It cannot.** `NUM.S`'s `failCone` is 7, and `adjudicate` defers whenever
   `reach >= confirmThreshold` (`adjudicator.ts:152`), so a miss on `NUM.S` buys a confirming item
   exactly as the ratified rule would — which is what §6.1's own `one-item fail? no` says. Measured,
   `NUM.S` contributes **+0.07** points.
2. §6.2 attributes the cost to *"the seven cascade-free nodes."* Measured, it is **four**: the three
   that can take a one-item PASS (`NUM.3`, `NUM.F`, `NUM.S`) cost nothing, and the four that can
   take a one-item FAIL (`NUM.5`, `RAD.2`, `RAD.3`, `RAD.4`) carry **100.8%** of it, reconciled to a
   residual of 0.0000 points against the headline.

The second correction matters for the decision rather than the wording: a one-item pass costs 0.14
accuracy points for 1.12 items and a one-item fail costs 7.33 for 2.00, so the single exchange rate
§6.2 quotes is really two, roughly thirty-fold apart. That opens a third option beside "accept
96.0%" and "pin the fraction to 0" — confirm fails only — which is **not** covered by the §3.4.1
delegation and is **not** priced in that record either.
