# The Diagnostic Tail Cut, Landed (what shipped, re-measured)

**Measured and shipped 2026-08-04. Status: DECISION + MEASUREMENT RECORD.** Owner: Gabe
(diagnostic lane). Companion to `Diagnostic_Tail_Policy_Measurement.md` (#534 — the curve, the
reasoning and the recommendation this acts on), `Contracts_Amendment_Diagnostic_Probe_Policy.md`
§3.4.1 (the route this took) and `Contracts_Amendment_Adaptive_Diagnostic_v2.md` §4.3 (the
normative text, and the one place this change and that text disagree — §7).

**What changed, in one line.** `DEFAULT_WALK_POLICY` now carries `livePassClosure: true,
liveConsequenceFrom: 20`, and `COVERAGE_SCORING_MODEL_VERSION` moved 2 → 3 to pay for it.

---

## 0. The precondition, and why it was worth waiting for

#534 §5.4 recommended the setting and attached a condition to the timing: **not before the scope
passes the sixth era.** The reason was not caution in the abstract. At `be72c537` six nodes had no
servable content, the placement horizon cut at the sixth era, and the instrument a learner actually
took was **34 nodes with p90 41** — which does not have a tail problem. Cutting a tail that does not
exist would have bought nothing and cost the completion ceremony half its named skills.

**The condition is met.** `POL.5` was the last in-product node with no authored content. With it
authored, `placementHorizon` finds no era it cannot fully serve, so the derived scope and the
in-product set coincide: **all 62 nodes, servable, administered, across ten of ten eras and
domains.** The 62-node row of #534's table stopped being a projection and became the instrument.

That is the whole reason the numbers below are worth acting on and the same numbers were not,
yesterday.

---

## 1. Both published baselines reproduce, digit for digit — before anything was changed

Run first, on the unmodified tree, because a figure measured on a harness that has drifted off the
record is worse than no figure. n = 6,000 (`SIM_N` 2,000 × 3 pooled profiles), mild noise
(slip .10 / guess .05).

| scope | figure | recorded (#534) | this run |
|---|---|---|---|
| D1 (6 nodes) | items med / p90 / p99 / max | 7 / 12 / 15 / 18 | **7 / 12 / 15 / 18** |
| 62-node | items med / p90 / p99 / max | 38 / 62 / 70 / 70 | **38 / 62 / 70 / 70** |
| 62-node | nodes med / p90 / p99 / max | 30 / 40 / 45 / 50 | **30 / 40 / 45 / 50** |
| 62-node | truth accuracy / sent back / gaps through | 95.6% / 2.42 / 0.33 | **95.6% / 2.42 / 0.33** |
| 62-node | ceiling binds / named / sessions naming ≥ 1 | 1.47% / 6.22 / 59% | **1.47% / 6.22 / 59%** |

§3's tail anatomy reproduces line for line as well, including the finding it exists for: in the top
ability band **20.1 of 38.7 probed nodes cost two items**, against **1.99** passes that credited
nothing.

### 1.1 The brief's numbers also reproduce, and the small discrepancy has a cause worth recording

The brief quoted **1.43% truncated, 95.5% accuracy, 2.45 sent back** where #534's table says
**1.47% / 95.6% / 2.42**. Neither is wrong and neither is a sampling artefact. They are **two
orderings of the same 62 nodes**:

- **1.47% / 95.6% / 2.42** is `getProductNodes()` order — #534's "full (62)" row.
- **1.43% / 95.5% / 2.45** is **teaching order**, which is what `DIAGNOSTIC_WALK_SCOPE` is in and
  therefore what a learner is actually administered — the harness's "live" row.

Scope order is not cosmetic: `resolveKnowledgeState` walks `state.scope`, and the frontier's
tie-breaking reads it, so the two orderings are very slightly different instruments. Both
reproduced exactly, so **both published baselines reproduce**. The rest of this note reports the
live (teaching) order as the headline, because that is the instrument, and carries the product
order alongside because that is what #534 recorded.

---

## 2. What shipped, measured: before and after at 62 nodes

n = 6,000, mild noise. "Before" is the frozen pre-cut policy (`STATIC_CONSEQUENCE_WALK_POLICY`),
re-measured on this tree rather than quoted.

### 2.1 The live instrument — teaching order, what a learner takes

| | median | p90 | p99 | max | truncated | truth accuracy | mastered sent back | gaps through | skills named | sessions naming ≥ 1 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **before** | 38 | **62** | **70** | 70 | **1.43%** | 95.5% | 2.45 | 0.31 | 6.18 | 59% |
| **after (shipped)** | **36** | **47** | **53** | **58** | **0.00%** | **95.6%** | **2.34** | 0.40 | 2.36 | **58%** |

### 2.2 The product-node ordering — #534's row, for continuity with that record

| | median | p90 | p99 | max | truncated | truth accuracy | mastered sent back | gaps through | skills named | sessions naming ≥ 1 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **before** | 38 | 62 | 70 | 70 | 1.47% | 95.6% | 2.42 | 0.33 | 6.22 | 59% |
| **after (shipped)** | 36 | **48** | **54** | 62 | **0.00%** | 95.6% | **2.30** | 0.41 | 2.35 | 58% |

**#534's predicted row was p90 48, p99 54, ceiling 0.00%, accuracy 95.6%, sent-back 2.30. It
reproduced exactly.** On the live scope the cut lands slightly harder still — p90 **47**, p99 53,
max 58.

### 2.3 What the columns say

- **The tail is gone, and the ceiling with it.** p90 62 → 47, p99 70 → 53, and the longest walk
  observed in 6,000 falls from the 70-item ceiling to **58**. Truncation is 0.00% because nobody
  reaches the ceiling, not because the ceiling moved.
- **Accuracy did not move**: 95.5% → 95.6%. It went very slightly *up*.
- **The failure that hurts got better**: already-mastered skills sent back 2.45 → 2.34.
- **The price is gaps let through**, 0.31 → 0.40 per session. Real, and the direction INV-DIAG-7
  asks the instrument to lean away from. It is why the setting is 20 and not 0, where the same
  column reads 0.56.
- **The ceremony still has something to say.** Skills named falls 6.18 → 2.36, but the share of
  sessions naming **at least one** is 59% → **58%** — inside noise. That distinction is the entire
  argument for 20 over 0, where the ceremony names nothing in 0% of sessions.

### 2.4 The cohort that no longer exists

Read on the truncated cohort rather than the average, which is what #89 learned to do:

| | truncated | THEM: accuracy | THEM: sent back | EVERYONE ELSE: accuracy | sent back |
|---|--:|--:|--:|--:|--:|
| before | 1.47% | **84.6%** | **9.5** | 95.7% | 2.31 |
| after | **0.00%** | — | — | 95.6% | 2.30 |

The 1.4% who hit the ceiling were being scored at **84.6%** and told to rebuild **9.5** skills they
already had. That cohort is empty now. It is the strongest single thing this change does and it is
invisible in every aggregate.

### 2.5 The distribution acquires a shape

Under the pre-cut policy the instrument's length was close to uniform from 15 to 71 — every
three-item bucket held between 2.3% and 8.4%, which is why the median described almost nobody.
After the cut it has a mode at **42–47 items holding a quarter of the cohort**, and falls to 0.1%
above 56.

### 2.6 It holds under noise

| noise | before | after |
|---|---|---|
| noiseless | 36 / 61 / 62 / 68, 100.0% | **35 / 45 / 49 / 53**, 100.0% |
| mild (.10/.05) | 38 / 62 / 70 / 70, 95.6% | **36 / 48 / 54 / 62**, 95.6% |

The tail cut does not decay as the responder gets noisier, which is the failure mode a policy tuned
on a clean cohort would show.

---

## 3. The D1 walk is bit-identical, and it is measured rather than argued

#534 §5.3 states this as a claim resting on an argument: `confirmThresholdFor(6, 7/62)` is 0, a
threshold of 0 confirms every decision whatever the consequence is read as, so a rule that only
changes how the consequence is READ cannot reach a walk that never consults it.

The argument is correct. It is also exactly the kind of argument an assertion exists so nobody has
to take on trust, and its failure mode is silent — nothing about a D1 walk announces that it has
started confirming one item fewer. So `engines/diagnostic/src/d1BitIdentity.test.ts` measures it:

- **400 D1 learners**, answers drawn once per `(node, attempt)` and replayed to both policies, so a
  difference is a difference in the instrument rather than in the responder.
- **Whole traces compared, not distributions**: the ordered probe sequence, the `node#attempt` of
  every item served, and the final `probed` map with each node's outcomes, result, robustness and
  inference licence. Two walks agree only if the learner would have had an identical session,
  question for question. Distributional agreement would be strictly weaker — two policies can
  produce one histogram out of different walks.
- **Floors**, so a degenerate cohort cannot pass it by comparing nothing: 400 comparisons actually
  made, the longest walk at least 12 items, at least 5 distinct walk lengths.
- **A control that fails**: the same comparison at 62 nodes must come apart on at least 10 of 40
  students. Without it, `trace` could be returning something insensitive to the policy and D1 would
  pass for a reason unrelated to the threshold.

The harness agrees independently: D1 reads **7 / 12 / 15 / 18 items, 98.0% accuracy, 0.12 sent
back, 2.56 named in 97% of sessions** under both policies, unchanged in every column.

---

## 4. The version bumps — two records, two different changes

They are not the same record and neither substitutes for the other.

### 4.1 `scoring_model_version` 2 → 3 — Route A, this change's own cost

Probe-policy §3.4.1 offers two routes and #534 §6.2 establishes which one applies.

**Route B does not close.** Its bar is PR #101's: enumerate the outcome sequences, show the new
rule returns a byte-identical adjudication on all of them, and establish that the population is
**frozen**. The first part holds — a live count is always ≤ the static one and `adjudicate` reads
`consequence` only at `itemCount === 1`, so on every DECIDED node the two rule sets are the same
function, asserted exhaustively in `coverage-measurement.test.ts`. The second does not: a node the
ceiling leaves with **one outcome and no decision** diverges, and `recordScoredOutcome` handles the
ceiling landing mid-node explicitly, so a *finalized* record can contain one. Unlike #89's bound
that is not confined to invalidation, so the population can still grow. "No such record exists
today because the live scope never truncates" is the weak deployment leg `Answer_Equivalence_Spec`
§13.13 refuses.

**So Route A, walked in full:**

- [x] `COVERAGE_SCORING_MODEL_VERSION` bumped 2 → 3.
- [x] The new rules registered as a **frozen literal** under version 3 in
      `RESOLUTION_RULES_BY_VERSION`.
- [x] **Version 2's literals left in place** — the half a bare bump does not buy, and the half that
      keeps every stored record recomputing under the rules it was scored with. Asserted value by
      value in `coverage-measurement.test.ts` ("keeps the outgoing version's rules frozen at what it
      was administered under"), with a companion that fails if the two entries are ever identical,
      because a bump that changes no rule bought nothing.
- [x] **The INV-DIAG-5 comparability impact recorded, not gestured at** — §4.3 below.

### 4.2 The comparability impact, named

**Every existing pre/post pair becomes `not_comparable`**: the D1 (6-node) pairs and any pair taken
on the widened walk scope. All of them were administered at `scoring_model_version` **2**.
`comparabilityStatus` compares `blueprint_version`, `scoring_model_version` and that `form_id`
differs, so a version-2 pre against a version-3 post fails the second test.

**That population was already `not_comparable` before this change**, and the honest version of the
record says so: `DEFAULT_WALK_BLUEPRINT_VERSION` moved 5 → 6 when `POL.5` widened the instrument to
all 62 nodes, and the gate fails on **either** field. So this bump widens no population the
blueprint bump had not already caught. It is recorded separately because they are two records of
two different changes, and conflating them is how one of them gets skipped.

### 4.3 `blueprint_version` 5 → 6 — the scope widening's record, already made

Required by **D-END4** and made by the `POL.5` work, not by this change: the node set the
instrument administers grew, `scope` is an argument the reader supplies rather than a field on the
record, so leaving the version alone would have silently re-denominated every baseline already
collected instead of marking it `not_comparable`. Which node set each version denotes is recorded in
`services/diagnostic-runtime/src/walkInstrumentScope.test.ts`; the composition half is in
`engines/diagnostic/src/blueprintScope.test.ts`. **Verified present and passing on this branch**;
this change neither makes nor needs a further blueprint bump, because turning a knob does not move
the node set.

---

## 5. What the bump exposed: a live defect, not just a test re-pin

`services/diagnostic-runtime/src/measurement-read.ts` dispatched the measurement read on:

```ts
if (post.scoring_model_version === COVERAGE_SCORING_MODEL_VERSION) { /* coverage */ }
```

That reads as *"is this a coverage record"* and actually asks *"is this the **current** coverage
record"*. The two are the same function for exactly as long as there is one coverage version, which
is why it survived two versions of that file unnoticed.

At two versions they come apart, and in the worst direction: **every stored administration is
stamped 2**, so the equality routes all of them to the v1 θ branch, where `computeMeasurement` looks
up an MST stage a walk record has never had and **throws** `unknown diagnostic stage`. Not a
degraded number — an exception on read, for every existing record.

Fixed with `isCoverageScoringModelVersion`, **derived from the registry** rather than a written-down
list, so registering a version is the single act that makes it known and a new entry cannot be added
and left out of the dispatch. Observed red before the fix (the pre-existing
`aurora-walk-adapters.test.ts` case at `scoring_model_version: 2` failed with exactly that throw)
and observed red again after, by putting the equality back.

**This is the argument for doing the bump deliberately rather than as a one-line edit.** The bump
itself is safe; a bump without reading its consumers was not.

---

## 6. Risk assessment: is any of this dangerous to land before Friday?

The three questions that would make this a decision for the lead rather than a change to push
through, each answered with what was measured:

**(a) Does it invalidate stored learner state?** **No.** Records are immutable and the version is a
stamp read at recompute time. Version 2's rules stay registered, so a record stamped 2 re-decides
under them. Measured rather than asserted: `coverage-measurement.test.ts` folds a 62-node record
under the frozen pre-cut policy — which is bit-for-bit what the old build spread over
`DEFAULT_WALK_POLICY` — and asserts today's recompute of the same record agrees node for node, with
a control proving the fold is reading its policy argument. Injecting the INV-DIAG-4 regression
(recompute reading today's rules unconditionally) turns it red.

**(b) Does it require a data migration?** **No.** The column is
`scoring_model_version integer not null check (scoring_model_version > 0)` — no enum, no foreign
key, no check that 3 fails. No migration file, no backfill, no deploy ordering constraint.

**(c) Does it make any existing placement unreproducible?** **No**, by (a). Placement is written
insert-once during the walk and recomputed from the immutable rows under the record's own version.

**So: Route A, no migration, no invalidation, nothing unreproducible. This is the safe case.**

Two things that are genuinely worth a sentence each rather than being buried:

- **An in-flight walk that straddles a deploy** would be continued under the new rules while stamped
  with the old version, so its recompute would disagree with the session the learner had. This is
  not specific to this change — it is true of any policy change — and it cannot arise on the demo
  path, where walk state lives in `createInMemoryWalkStore`, a `Map` that dies with the tab. On a
  server-backed deployment (which needs **both** Cognito auth and `VITE_DIAGNOSTIC_API_URL`) it
  would want a drain. Named so it is a decision rather than a surprise.
- **The ceremony names fewer skills**: 6.18 → 2.36 per session. The share of sessions naming at
  least one does not move (59% → 58%), which is the number that matters for whether the ending
  works, but the ending is thinner and that is a product judgment rather than a measurement.

---

## 7. The one thing this change does NOT settle, and it is not a measurement question

**`Contracts_Amendment_Adaptive_Diagnostic_v2.md` §4.3 is normative and says, in terms:**

> **"Would cascade" is a static property of `(node, scope, graph)`** — never of the walk's evolving
> unknown set, because `rebuildWalkState` re-buckets response rows by node and re-adjudicates each
> in isolation rather than replaying the walk, and a dynamic rule could not be reproduced that way
> (INV-DIAG-4).

Reading a pass's consequence live makes it a property of the walk's evolving unknown set. **That is
the thing the sentence says it is never.**

The sentence's *justification* has been falsified — `adjudicateRecordedWalk` reproduces a live rule
from the immutable record by folding along `routing_path`, which is why INV-DIAG-4 still holds and
is pinned by test. But a ratified normative clause is not repealed by its rationale expiring, and
§3.4.1's delegation to measurement is scoped to **the value of `confirmScopeFraction`**, not to how
a consequence is computed. #534 §6.3 and §8 both flag this and both decline to decide it: *"whether
INV-DIAG-7/8's text should be restated to match a live reading, or the live reading refused as an
amendment to them... is a ratification question, not a measurement."*

**What is owed, precisely:** Gabe, as diagnostic-lane owner, restating §4.3's static clause and
INV-DIAG-7/8's quantifier to match a live reading — or refusing it. This is **a paperwork gate, not
a technical risk**: it changes no code, no record, no number in this document, and nothing about it
makes the change unsafe to run on Friday. It is called out here because landing a change that
contradicts a ratified sentence without saying so is how the sentence stops meaning anything, and
because #534 explicitly left it open rather than closing it quietly.

---

## 8. Guards changed, and the ones that stopped being guards

The tail cut moved `DEFAULT_WALK_POLICY`, and **three separate checks were using
`DEFAULT_WALK_POLICY` as their "unchanged" control.** A before/after comparison whose "before" is
today's default has no before in it, and all three would have gone on passing while measuring
nothing:

1. **`walk.test.ts`'s INV-DIAG-4 fold differential.** `LIVE_PASS` was
   `{ ...DEFAULT_WALK_POLICY, livePassClosure: true }` and its static control was
   `DEFAULT_WALK_POLICY`. After the cut those are the same object, so `expect(underStatic).not
   .toEqual(state.probed)` would have been comparing a thing to itself.
2. **The tail-policy harness's baseline anchors.** They print "recorded 38 / 62 / 70 / 70" beside a
   run of `DEFAULT_WALK_POLICY`. After the cut that label would have sat beside the post-cut
   distribution and "reproduced" nothing.
3. **The harness's whole dial**, built by spreading over `DEFAULT_WALK_POLICY`, which would have
   re-based every row and made "shipped (never)" the recommendation measured against itself.

All three now read `STATIC_CONSEQUENCE_WALK_POLICY`, a frozen literal that exists for this purpose.

**The drift guard was updated, not deleted.** `coverage-measurement.test.ts`'s "registers every
ADJUDICATION knob the shipped policy carries" still derives its population from
`DEFAULT_WALK_POLICY` and still fails if any adjudication knob moves away from the entry registered
for the current version — the bump and the registration are what make it green again, which is
exactly the mechanism §3.4.1 relies on. Two assertions were **added** beside it, because a second
registered version created two new ways to be silently wrong: version 2's entry being re-pinned, and
a bump that changes no rule.

### 8.1 Every assertion observed red under injection

| injection | what went red |
|---|---|
| `confirmScopeFraction` → 12/62 (the value #534 says breaks D1) | D1 bit-identity mechanism (threshold 1, not 0); D1 whole-trace equality (7 items vs 9); drift guard |
| `liveConsequenceFrom` 20 → 15 with no bump | drift guard, naming the knob |
| version 2's registry entry re-pinned to today's rules | frozen-literals check; and the end-to-end record check, proving the freeze is load-bearing rather than decorative |
| a version bump that changes no rule | "genuinely a NEW entry"; the record differential; **and D1 bit-identity's own 62-node control**, proving that check is not passing vacuously |
| dispatch reverted to `=== COVERAGE_SCORING_MODEL_VERSION` | a record stamped 2 throws `unknown diagnostic stage` on read |
| recompute reading today's rules regardless of the record's version | both INV-DIAG-4 replay checks |

---

## 9. Reproduction

Unchanged from #534 §7, and the harness's own warning is worth repeating because this run tripped
over it: **`sample-size.local` is per-profile and pooled by three**, so 2,000 gives n = 6,000.
Always read the printed `n=` rather than the file.

```
echo 2000 > engines/diagnostic/sim/sample-size.local
npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
  engines/diagnostic/sim/tail-policy.sim.test.ts --disableConsoleIntercept
```

`--disableConsoleIntercept` is required or the harness runs green and prints nothing. A full run is
about five minutes. The harness stays excluded from CI by placement, and
`test/diagnosticSimScopeMirror.test.ts` still asserts that exclusion and the live-scope mirror.

The bit-identity and versioning checks are ordinary CI tests and need no harness:

```
npx vitest run engines/diagnostic services/diagnostic-runtime
```
