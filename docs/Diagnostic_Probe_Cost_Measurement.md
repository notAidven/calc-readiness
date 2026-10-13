# Diagnostic Probe-Cost Measurement (62-node full scope)

**Measured 2026-07-25. Status: HISTORICAL MEASUREMENT RECORD — the decision it left open is
CLOSED.** Owner: Gabe (diagnostic lane). Companion to
`Contracts_Amendment_Adaptive_Diagnostic_v2.md` §4.2.

> ## ⚠ READ THIS FIRST (banner added 2026-07-26)
>
> **The open decision this note deliberately did not make was made, and the instrument changed
> underneath the note.** It is kept because it is the *evidence* the change rests on and a record of
> a policy that no longer ships — not because it describes today's instrument.
>
> **→ For what ships now, read `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md`.** It
> implements §11(B) + §11(D) of this note together, adds a **70-item instrument ceiling**, and takes
> the full-scope median from **82 items to 38** (truth accuracy 97.9% → 95.6%; the live D1 scope is
> bit-identical). Landed as PR #89; INV-DIAG-7/8 ratified 2026-07-26.
>
> **What in here is now superseded, section by section — nothing below has been rewritten:**
>
> | Section | What it says | Status |
> |---|---|---|
> | Header | "OPEN DECISION" | **Closed.** §11(B)+§11(D) chosen; see the probe-policy amendment §2. |
> | §1 | Headline **median 82** items, p90 111, p99 132, max 145 | **Pre-#89 baseline.** The shipped policy measures **38 / 62 / 70 / 70** on the same harness and cohort. Both figures are real; this one is the "before" row. |
> | §5 | "The pinned **48** in `walk-scale.test.ts`" | **Re-derived to 38 nodes / 56 items** by the amendment (probe-policy §4). §5's *argument* — that a node count is not an instrument-length bound — was accepted, and the test now pins **items as well as nodes** because of it. |
> | §6 | "There is **no cap anywhere**"; "`selectNextProbe` returns `null` **only when the unknown set is empty**" | **Both false now.** `DEFAULT_WALK_POLICY.maxItems = 70`, and `selectNextProbe` returns `null` when the budget is spent (`walk.ts`, the `servedItemCount(state) >= policy.maxItems` guard) as well as when the unknown set empties. The two reasons are distinguished by `ceiling_reached`. §6's risk analysis is *why* the ceiling exists. |
> | §12 | Recommends prototyping B, adding a cap as a backstop, keeping D for all-hands | **Done.** #89 shipped B **and** D together (measurement showed neither alone sufficed) plus the ceiling. §12's "do not restate the §4.2 bound yet" has also been overtaken — it has now been re-measured and restated in both units. |
>
> **Still live, and worth reading:** §5's node-vs-item unit argument, §8's naive-cap tradeoff, §9's
> external reference points, §10's method, and §13 as the analysis that became the amendment. §11's
> option set is the menu the decision was chosen from.

This is a **rationale/evidence record**, not a normative amendment. It changes no invariant, no
budget, and no engine behaviour. It exists because the numbers below were produced by ~100,000
simulated walks and, until now, lived nowhere in the repo.

The measurement answers the question §4.2's PR #78 caveat explicitly asked for: *what does the
adaptive walk actually cost on the current 62-node graph?* The answer contradicts a rationale
recorded in §1.1, so the remediation is written up as **four costed options and left open** —
this document deliberately does **not** decide it.

**Reproduce** with the committed harness, from the repo root:

```
npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts
```

The default run is the recorded one — ~102,000 walks, several minutes, no flags needed. It is
excluded from `npm run test:unit` and from CI, and lives outside the package `tsconfig`, so it
costs the normal build nothing. See §10 for method and the harness header for details.

---

## 1. Headline

> *Superseded as a description of the instrument — this is the **pre-#89 baseline**. The shipped
> policy medians **38 items / 30 nodes** on the same harness and cohort; see
> `Contracts_Amendment_Diagnostic_Probe_Policy.md` §1, which reproduces the row below as its "before".*

Full 62-node scope, pooled across all three ability profiles, slip 0.10 / guess 0.05, **n = 6,000**:

| | median | p90 | p99 | max |
|---|---|---|---|---|
| **Items answered** | **82** | **111** | **132** | **145** |
| Nodes probed | 35 | 43 | 49 | 52 |

Noise is not what makes this expensive:

| Noise condition | median | p90 | p99 | max |
|---|---|---|---|---|
| Noiseless | 75 | 106 | 128 | 143 |
| Mild (slip 0.10 / guess 0.05) | 82 | 111 | 132 | 145 |
| Moderate (slip 0.15 / guess 0.10) | 85 | 114 | 136 | **175** |

Noiseless simulation is optimistic, but only mildly. Moderate noise pushes the tail to 175 items.

---

## 2. The finding that decides the question

§1.1 of the ratified amendment rejects the flat MST partly on length. Its second listed weakness:

> **Length.** A flat "≈1 item per node" instrument runs ~57–64 items on the full graph, with no
> pruning — too long for a diagnostic.

The measured walk is **~35% longer than that at the median and ~1.8× at p90.**

**The adaptive walk is longer than the design it was created to replace, on the grounds that the
replaced design was too long.** That is the single fact that makes this a design question rather
than a documentation cleanup.

---

## 3. The cost driver is the multiplier, not the node count

The walk prunes exactly as designed: only **35 of 62 nodes** are probed at the median, a **44%
reduction**. The pruning claim in §4.2 holds.

But adjudication costs **2.34 items per probed node**, and **35 × 2.34 = 82**. The per-node 2-of-3
adjudication (§4.3) more than eats the savings from pruning.

Any remediation that reduces *nodes probed* is attacking the part that already works. The
multiplier is the cost.

---

## 4. Shape: bimodal, with no short path for a mid or strong learner

The distribution is not a bell curve around the median. It is bimodal:

- **~28% of students finish under 40 items.** These are the weak students, pruned out fast. The
  §4.2 "weakest exits fastest" design claim **holds** and is worth preserving.
- Then a **trough**.
- Then a **second mode at 80–120 items holding roughly half of all students.**

So the median of 82 is not a typical-case number that a minority of long walks drags upward — the
long walk *is* the modal experience for anyone who is not weak. **There is no short path through
the instrument for a mid or strong learner.**

---

## 5. The pinned 48 in `walk-scale.test.ts` is not an upper bound

> *The **argument** here was accepted and acted on; the **number** has moved. The pin was re-derived
> to **38 nodes**, and the test now pins **items (56) as well as nodes** precisely because of the
> unit confusion this section identifies. See `Contracts_Amendment_Diagnostic_Probe_Policy.md` §4.*

`walk-scale.test.ts` pins a worst case of 48. That figure should not be read as a ceiling on
instrument length, for three independent reasons.

**It counts NODES; students answer ITEMS.** `probedNodeCount` is `Object.keys(state.probed).length`.
At the measured 2.34 items/node, 48 nodes is ~112 items. Quoting "48" as an instrument-length
bound silently swaps the unit.

**Its oracle is noiseless and INCOHERENT.** The pinned figure is the max over 50 fixed seeds of a
synthetic depth oracle: `pass iff prereqDepth(node) < cut[domain]`, with each domain's cutoff drawn
independently. That construction permits a student to "know" `EXP.3` while failing its prerequisite
`NUM.4` — **not a downward-closed knowledge state**, and therefore not a state a real learner can
occupy. It is also a perfectly consistent responder: no slips, no lucky guesses.

**Coherent students exceed it.** Driving the same engine with downward-closed students:

- **51 nodes with zero noise** — the pinned 48 is beaten without any noise at all.
- **Up to 60 nodes / 175 items** with noise.

The harness reproduces the test's exact 50-seed sweep and gets `nodes=48`, confirming it drives the
same engine; that run costs **132 items**. So 48 is a *sampled maximum of one idealized family*,
not a worst case.

**The test itself is fine and was left alone.** It is a deterministic regression pin on a fixed
sweep, and it does its job. Only the interpretation of the number is wrong.

---

## 6. There is no cap anywhere, and that is its own risk

> **⚠ NO LONGER TRUE — this section is why the cap now exists.** There *is* a cap:
> `DEFAULT_WALK_POLICY.maxItems = 70` (`engines/diagnostic/src/walk.ts`). `selectNextProbe` returns
> `null` when the item budget is spent as well as when the unknown set empties — the two are
> distinguished by `ceiling_reached`, which requires an actually-unresolved node so a walk that
> finished on its last affordable item is not mislabelled truncated. The undesigned tail this
> section warns about is bounded; the fail-closed handling it describes is unchanged, and the cohort
> evidence for choosing 70 over 60 is `Contracts_Amendment_Diagnostic_Probe_Policy.md` §6.

`selectNextProbe` returns `null` **only when the unknown set is empty**, so the walk runs until
every in-scope node is resolved. `MAX_PROBE_ITEMS = 3` bounds **a single node**, not the
instrument. Nothing in `walk.ts`, `walk-engine.ts`, `walk-runtime.ts`, or the transport bounds
total length.

Instrument length is therefore whatever the graph and the student's response pattern produce. **The
175-item tail is undesigned** — it is not a bound anyone chose.

**Stopping early today degrades gracefully but harshly.** There is no crash and no error path:
`resolveKnowledgeState` returns unprobed nodes as `unknown`, `placementFor` maps `unknown` to `0`,
and the student is told to rebuild skills they already have. The failure mode is silent and
conservative, which is worse for the learner than it sounds — see §8.

---

## 7. Live scope is unaffected — this is not a student-facing regression

The shipped diagnostic is **D1-only**, and its cost is not a problem:

| Scope | median items | p90 | p99 | max |
|---|---|---|---|---|
| **D1 (live, 6 nodes)** | **7** | 12 | 15 | 18 |
| Full (62 nodes) | 82 | 111 | 132 | 145 |

Since the **2026-07-24 default flip** (§9.1), the shipped instrument is the walk and
`engines/diagnostic/src/routing.ts` is the **legacy rollback path**, so live scope must be read off
the walk's own composition points rather than off routing. All three independently pin it to the
six D1 nodes:

- `apps/web/src/diagnostic/browserRuntime.ts` — `D1_WALK_SCOPE`
- `createAuroraWalkDiagnosticServer` (`services/diagnostic-runtime/src/aurora-server.ts`) — default `config.scope`
- `services/diagnostic-api/src/reads.ts` — `scope: MVP_NODE_IDS`

**No hotfix is warranted.** This is a design constraint on a full-scope diagnostic that has not
been built.

**But the scaling between the two scopes that matter is unfavourable.** 6 → 62 nodes is **10.3×**;
median items 7 → 82 is **11.7×**. Cost grows **slightly super-linearly** here. The "scales
sub-linearly with node count" claim in §4.2 was validated on synthetic DAGs and does not show up as
a benefit across the D1 → full-scope step.

---

## 8. Cap tradeoff: a naive hard cap is not viable

Truth accuracy is the fraction of the 62 nodes classified correctly against each student's known
ground truth. n = 6,000, mild noise, pooled profiles. **Uncapped ceiling: 97.8%.**

| Item cap | truth accuracy |
|---|---|
| 20 | 68.7% |
| 25 | 70.7% |
| **30** (ALEKS-comparable) | **72.9%** |
| 40 | 77.0% |
| 60 | 84.7% |
| 80 | 91.2% |

At an ALEKS-comparable 30 items you give up ~25 points of accuracy. **A naive hard cap is not a
viable fix.**

**The crucial caveat: that loss is dominated by fail-closed resolution converting "unprobed" into
"not ready," not by measurement error.** The capped walk has not mis-measured those nodes; it has
simply not reached them, and resolution then reports them as gaps. **A cap paired with a terminal
inference rule** — extrapolating each unresolved domain from the frontier the walk has already
established — **would lose far less than this table shows.** The naive version was measured because
the smarter version does not exist yet, and building it is precisely the decision in §9(A).

---

## 9. External reference points

- **MDTP Calculus Readiness (CR45A12)** — 45 fixed multiple-choice items, 60 minutes. This is the
  framework **this repo's own domain structure derives from** (`Node_Spine_v4.md`, `PRD_Full.md`
  §5.2), so it is a same-family comparison, not a generic benchmark.
- **ALEKS PPL** — adaptive, knowledge-space model, **open-response**, 20–35 questions, **hard-capped
  at ~30** at most institutions.

ALEKS is the **closest structural analogue**: a knowledge-space adaptive placement instrument over a
comparably large topic space, using open-response items as we do, that solves the problem **within
30 questions**. That makes ~30 an **existence proof** that this class of instrument can be short,
rather than an arbitrary bar to hold ourselves to.

The industry band is **30–45 items**. Our full-scope median of 82 and p99 of 132 sit at **2–3×** the
longest comparable instrument.

---

## 10. Method

**The real engine, not a reimplementation.** The harness drives `startWalk` /
`recordScoredOutcome` / `resolveKnowledgeState` from `engines/diagnostic` over the real registry
graph. Nothing about the walk was modelled or approximated.

**Coherent synthetic students.** Each student is generated as a set of per-domain frontier depths,
then **forced downward-closed over the actual DAG**, so every true knowledge state is coherent (a
node is known only if all its in-scope prerequisites are). This is the property the
`walk-scale.test.ts` oracle lacks (§5).

**Three ability profiles:**

| Profile | Construction |
|---|---|
| homogeneous | one global ability, same frontier depth in every domain (spread 0) |
| heterogeneous | global ability ±2.5 depth jitter per domain |
| independent-strands | each domain's frontier drawn independently (strong in some strands, weak in others) |

**independent-strands is the most expensive profile — median 91 items vs 77 for homogeneous.** The
DAG's independent branches make it the realistic case, and it is the observation that points at
option B below.

**Noise is injected at the responder.** The engine has **no internal noise model** — it consumes one
boolean per item — so slip/guess is applied where the response is produced. Every `(node, attempt)`
response is **pre-drawn**, so a capped run is an **exact prefix** of the corresponding uncapped run
and the §8 comparison is like-for-like rather than two independent samples.

**Volume.** Roughly 100,000 walks in total: 18,000 for the per-profile table, 36,000 for the pooled
scope comparison, 48,000 for the cap sweep. The headline cells are n = 6,000.

**Reproduction check.** The harness was re-run on 2026-07-25 after being restored to the repo, and
independently reproduced the recorded figures: the pooled mild-noise cell returned median 82 / p90
111 / p99 132 / max 145 items and 35 / 43 / 49 / 52 nodes, noiseless returned 75 / 106 / 128 / 143,
moderate noise returned the 175-item max, and D1 returned 7 / 12 / 15 / 18. It also replays the
`walk-scale.test.ts` sweep to `nodes=48` (at a cost of **132 items**) and the uniform-cut oracle to
39 nodes, confirming it drives the same engine the pinned budgets were measured against.

---

## 11. Options — OPEN DECISION, deliberately not decided here

All four are recorded neutrally with their costs. **This document does not pick one.**

### A. Hard cap with graceful degradation

Cheap to build; the mechanism already degrades without crashing (§6).
**Cost:** the naive terminal rule costs **~25 accuracy points** at cap 30 (§8). A smarter terminal
rule — crediting unresolved nodes from the established frontier, tagged `inferred` — would recover
most of that, but it **weakens ratified INV-DIAG-6 (fail-closed)** by crediting nodes with no
confirmed pass or robust-pass inference. All-hands decision.

### B. Two-stage bisection at domain granularity

Localize each domain's frontier coarsely first, then descend only where ambiguous.
**The measurement points here.** independent-strands being the most expensive profile (91 vs 77)
says cost concentrates in resolving each domain's frontier separately, which is exactly what a
coarse first stage removes. Rough arithmetic lands it plausibly in the **30–45 band**.
**Cost:** the graph is not 10 independent chains — **`NUM.4` is the taproot for every domain entry**,
so stage 1 must probe it first or the per-domain probes are uninterpretable.
**Critically, this is pure probe ORDERING, which §4.2 already declares "a tunable policy" whose
invariants hold regardless of order — so it needs NO re-ratification.**

### C. Scope to a subset of domains

Essentially free: the walk is already scope-parameterized and the live product already does this.
**Cost:** shrinks the coverage denominator, so "ready for X% of the prereq graph" weakens and §5.1
(denominator from `getProductNodes()`) needs amending. **Defers the question rather than answering
it.**

### D. Attack the 2.34× multiplier

Serve one item per node while exploring and spend confirmations only at the frontier, where a wrong
call is consequential. At ~1.2 items/node the same walk costs **~42 items**.
**The only option that targets the actual cost driver (§3).**
**Cost:** touches ratified **INV-DIAG-7/8** (the adjudication and robust-pass rules). All-hands
decision.

---

## 12. Standing recommendation (a recommendation, not a decision)

> *Overtaken by events — **#89 did all of this**, and more than item 2 asked for: B and D shipped
> together (measurement showed neither alone reached the target band), with the cap as a backstop
> and the terminal rule explicitly declined rather than shipped naively. Item 4's "take D to
> all-hands" was satisfied by the single-owner ratification route instead, INV-DIAG-7/8 being Gabe's
> lane. The closing "do not restate the §4.2 bound yet" is also spent: it has been re-measured and
> restated **in both units** (38 items / 30 nodes at n = 6,000).*

1. **Leave the live D1 scope alone.** No student-facing change, no urgency (§7).
2. **Prototype B and measure it on this same harness before the full-scope diagnostic is built.**
   It is the highest-leverage change that requires no re-ratification, which makes it the right
   first move.
3. **Add a cap as a backstop, not the primary mechanism.** An uncapped student-facing instrument is
   a risk on its own and the p99/max tail is real — but decide the terminal rule explicitly rather
   than shipping the naive one.
4. **Take D to all-hands only if B falls short** of the 30–45 band, since it reopens a ratified
   invariant.

**Do not restate the §4.2 bound yet.** Changing "≤ ~35 probes" to "≤ 48 probes" would preserve the
node-vs-item ambiguity that is the actual defect — it would make the contract *more precisely
wrong*. The right doc update is the one that follows B's measurement and states **both units**.
§4.2's existing PR #78 caveat is accurate as written and was left untouched.

---

## 13. Design directions (analysis, not yet measured)

> **STATUS: UNVERIFIED ANALYSIS. THIS SECTION DECIDES NOTHING.**
>
> Everything below is *reasoning*, not measurement. It was salvaged from a rebuild of the probe
> policy toward a 35–40 item target that was **paused before running anything** — no engine change
> was made, no simulation was run, and none of these figures came out of the harness. The §11
> options remain open exactly as written, and nothing here narrows them.
>
> The rest of this note is evidence. This section is the *opposite kind of thing*, kept next to the
> evidence only so it is not lost, and so the next person starts from the arguments rather than
> re-deriving them. Read it as a to-measure list.

Each claim was checked against the code where checking was cheap. Where a claim did not survive that
check it is recorded **corrected**, with the correction marked inline.

### 13.1 Both levers are required, not one

Instrument length is `nodes probed × items per node`, and today that is **35 × 2.34 = 82** (§3).

Reaching 35–40 needs **both** factors moved: the multiplier down to ~1.2 *and* nodes probed down to
~28–30 (`1.2 × 30 = 36`). Attacking the multiplier alone leaves ~35 nodes at ~1.2, which is **~42
items** — better than 82, still above the band. §11(D) already records that ~42 figure.

> *Corrected:* the paused analysis put the multiplier-only landing at "roughly 45." The arithmetic
> gives 42, which is also what §11(D) already says. Directionally identical, but the two numbers
> should agree.

This is the one structural conclusion here: **§11(D) is necessary but not sufficient, and §11(B) is
necessary but not sufficient.** Neither option alone reaches the band; they are complements, not
alternatives. That is a genuinely new reading of §11, where the four options are laid out as if a
choice among them were possible.

### 13.2 Multiplier: spend confirmation in proportion to consequence

Sharpens §11(D). Serve **one item per node**, and require a confirming item **only where the
decision is consequential**. "Consequential" is defined as a **static graph property** of the node
given the scope:

- for a **pass**, the size of its **in-scope transitive prerequisite closure** — what a test-out
  would credit;
- for a **fail**, the size of its **in-scope transitive dependent cone** — what pruning would remove.

Above a tunable `CONFIRM_THRESHOLD`, fall through to the existing 2-of-3 (§4.3). Below it, one item
decides. Cheap nodes get one item; the nodes where a wrong call cascades still get confirmed.

**Why the definition must be static and not dynamic.** A dynamic notion of consequence — "how many
*currently unknown* nodes does this resolve" — would break reproducibility.
`rebuildWalkState` in `coverage-measurement.ts` does not replay the walk: it buckets the append-only
response rows by `node_id` and re-adjudicates each node in isolation, deliberately leaving the
order-dependent fields (`entry_tier`, `target_tier`, `current`) neutral, because probe order is
irrelevant to the resolved state. A confirmation rule keyed on the walk's evolving unknown set could
not be reproduced that way; it would force `rebuildWalkState` to become a full replay.
A **static** consequence is a pure function of `(node, scope, graph)` and so recomputes identically
from the records, preserving **INV-DIAG-4 (reproducibility)**.

> *Corrected:* the paused analysis described `rebuildWalkState` as reproducing decisions from
> "`scope` + `routing_path` alone." It also consumes the ordered `assessment_item_response` rows —
> `rebuildWalkState(scope, routingPath, orderedResponses, invalidated)`. The constraint it actually
> imposes is the one stated above: **re-bucket and re-adjudicate, never replay.** The conclusion is
> unaffected.

> ⚠ **SUPERSEDED IN ONE RESPECT, 2026-08-04: "Why the definition must be static and not dynamic" no
> longer holds, and this is where that reasoning was first written down.** The paragraph above is
> kept verbatim, because it is the origin of the clause v2 §4.3 carried and a reader tracing that
> decision needs to find it. What has changed is its premise. `adjudicateRecordedWalk` (`walk.ts`,
> landed by PR #534, merged 2026-08-04) reproduces a **dynamic** rule from the immutable record by
> folding along `routing_path` and adjudicating each node against the resolution that recorded order
> had already reached — which satisfies the constraint this correction box states at its narrowest,
> because probe **selection** is never reconstructed and the order-dependent fields named above
> (`entry_tier`, `target_tier`, `current`) are still left neutral. **It is a fold, not the full
> replay this section refuses.** So a static consequence turns out to have been a *sufficient*
> condition for INV-DIAG-4 rather than a necessary one. The normative consequence is
> `docs/Contracts_Amendment_Diagnostic_Live_Consequence.md` (RATIFIED 2026-08-04), which amends
> v2 §4.3's clause for the **pass** direction only and lists in its §4 what it does not license —
> in particular that the **failure** direction stays static, and that anything requiring probe
> selection to be rebuilt remains forbidden for exactly the reason this section gives.

### 13.3 Keep `robust` meaning exactly "clean 2/2"

`robust` is currently true **only** for a two-correct-in-a-row pass (`adjudicator.ts`), and
`placementFor` reads it directly: a measured pass is city seed **3** if `robust`, else **2**.

Any redefinition of `robust` therefore silently moves the 0–3 placement scale, which
`Contracts_Amendment_Adaptive_Diagnostic_v2` §4.4 ratifies and
`Contracts_Amendment_Diagnostic_TestOut_Unlock.md` builds the unlock rule on. So: **leave `robust`
alone**, and if a one-item pass should ever license prerequisite-closure inference, carry that on a
**separate stored flag**. Both remain recomputable from the records, so the record stays
self-describing and INV-DIAG-4 still holds.

### 13.4 Ordering: per-domain frontier target, behind a foundation stage

`frontierTarget` (`walk.ts`) computes `dp` (deepest measured pass) and `df` (shallowest measured
fail) by scanning **`state.scope` globally**. On a student whose domains differ, it therefore mixes
evidence across unrelated strands and aims the next probe at a midpoint that describes no domain in
particular.

**This is the most plausible explanation for independent-strands being the most expensive profile
(median 91 vs 77 homogeneous, §10)** — and it is the mechanism §11(B) is reaching for. Note that
this is a *hypothesis about a measured fact*, not itself measured: the profile gap is real, the
attribution to `frontierTarget` is not yet demonstrated. The paused analysis called it the "root
cause"; that is stronger than the evidence supports.

Proposed shape: compute the frontier target **per domain**, gated behind a **foundation stage** over
a graph-derived shared-taproot set, so the shared roots are resolved before per-domain bisection
begins (§11(B) already flags that stage 1 must probe `NUM.4` first or the per-domain probes are
uninterpretable).

**Graph facts, checked against the registry** (62 in-product nodes, 10 domains):

| Node | in-scope transitive dependents | domains spanned |
|---|---|---|
| `NUM.F` | 52 | 10 |
| `NUM.S` | 51 | 10 |
| `NUM.2` | 50 | 10 |
| `NUM.3` | 50 | 10 |
| `NUM.4` | **49** | 9 |
| `FUN.1` | 21 | 5 |
| `CG.1` | 12 | 5 |

The proposed derivation — "nodes whose in-scope transitive dependents span **two or more** domains"
— does capture `NUM.4` without hardcoding it, as claimed. **But it is too loose to be a foundation
stage:** it selects **16 of the 62 nodes**, which at today's 2.34 multiplier is ~37 items *for stage
1 alone*, already over the whole target. It admits nodes like `LIN.5` and `FUN.7` whose entire cone
is two nodes.

> *Corrected:* the criterion needs a threshold, not just "≥ 2 domains." Tightening to **≥ 5 domains**
> yields a 7-node set (the five D1 roots above plus `FUN.1` and `CG.1`) at ~16 items — a plausible
> stage 1. The exact threshold is a thing to measure, which is the point of having a harness.

`WalkGraph` would need a **`domain(id)` member** to express any of this. It currently exposes only
`prereqs` / `depth` / `transitivePrereqs` / `transitiveDependents`. The registry already carries a
`domain` field per node, so the production implementation is trivial; the member exists so the
synthetic-DAG scale tests can supply one.

**This is pure probe ORDERING**, which §4.2 declares "a tunable policy" whose invariants "hold
regardless of order (they live in resolution, not selection)." So it needs **no re-ratification** —
the same standing §11(B) already has.

### 13.5 A terminal rule, so a cap becomes viable

§8 shows the naive cap is not viable and points at a smarter terminal rule; this is a candidate for
that rule. On hitting the cap, resolve the remaining unknown nodes **shallow to deep**:

- anything with a **failed or pruned** prerequisite stays **not-ready** — fail-closed is untouched;
- anything whose **entire in-scope prerequisite closure resolved `passed`** is credited
  `passed (inferred)`.

This generalizes an **already-ratified precedent** rather than inventing one: the test-out unlock
amendment establishes that a graph-inferred pass is treated as real (`placement_estimate` 2,
building unlocked without the lesson), on the grounds that a prerequisite edge *means* the
dependent implies the prerequisite. The terminal rule applies the same inference at the ceiling.

### 13.6 How this would be framed as an amendment, if pursued

Recorded here as a **proposal only**. `Contracts_Amendment_Adaptive_Diagnostic_v2.md` was **not
edited**, and none of this is proposed to it yet.

- **INV-DIAG-7 / INV-DIAG-8** would become **proportionate** confirmation and test-out: confirmation
  spent in proportion to consequence, with large prerequisite closures and large dependent cones
  still requiring a confirmed call. The spirit — *don't prune or credit a cascade on one item* — is
  preserved; what changes is that a node with nothing downstream of it stops paying for a
  confirmation it cannot cascade.
- **INV-DIAG-6** keeps fail-closed **during** the walk and gains an explicit **terminal** rule for
  the ceiling (§13.5). Today fail-closed is doing double duty as both, which is exactly why §8's cap
  loses 25 points.

If pursued, this follows the house style of `Contracts_Amendment_Diagnostic_TestOut_Unlock.md`:
PROPOSED status banner, amended-vs-preserved invariant split, and an owner ack checklist.

### 13.7 A methodological trap that would fake a win

**Read this before evaluating any new policy on the §10 harness.**

Synthetic students are generated from a **per-domain depth cut**: each domain draws a cutoff and
every node in that domain is known iff its `prereqDepth` is below it. Consequently **same-depth
nodes in the same domain get the same truth value**, by construction of the student model rather
than by anything about the DAG.

A policy that infers across *siblings* — "she knew one depth-3 node in D4, so credit the other
depth-3 nodes in D4" — would therefore score **brilliantly on this harness and be worthless in
reality**. It would be measuring the student generator, not the instrument.

**Inference must stay DAG-structural**: prerequisite closure and dependent cone only, never
"similar" nodes. Both §13.2 and §13.5 are DAG-structural, which is not a coincidence.

> *Corrected, and the correction makes the trap subtler rather than smaller:* the paused analysis
> said same-depth siblings *always* share a truth value. They always share the **pre-closure** draw;
> `closeDownward` can then break the tie for one of them, when a node has an out-of-domain
> prerequisite that the *other* domain's cut excluded. So sibling truth values are near-perfectly
> but not perfectly correlated — which means a sibling-inference policy would post a very high score
> rather than a suspiciously perfect one, and would be **harder** to spot as an artifact.

This warning is duplicated in the harness header, because anyone reaching for the harness to
evaluate a policy needs it and may never open this note.
