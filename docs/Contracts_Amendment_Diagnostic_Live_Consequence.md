# Contracts Amendment: Live Consequence Reading (RATIFIED 2026-08-04)

*__Status: RATIFIED 2026-08-04 — by Gabe, as diagnostic-lane owner, on the product lead's
approval.__ This amends a __RATIFIED__ position: `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md`
**§4.3**'s static-property clause (folded in 2026-07-26 from
`docs/Contracts_Amendment_Diagnostic_Probe_Policy.md`, itself amending text ratified 2026-07-22) and
the quantifier of **INV-DIAG-8** in **v2 §3.3**, with a clarifying clause added to **INV-DIAG-7**.
No record table, no write-mapping, no port, and no shared type changes. It is **single-lane** —
diagnostic adjudication and the recompute path, both Gabe's — so under the `OWNERS.md` "Cross-lane
change policy (amended 2026-07-23)" it is recorded on the owner's authority rather than circulated
as an all-hands. **FOLDED into `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` on 2026-08-04**:
the amended per-node adjudication now lives in **v2 §4.3** and the amended INV-DIAG-7/8 text in
**v2 §3.3**, and **v2 remains the normative source for the shipped policy — where this document and
v2 disagree about what ships, v2 wins.** __This document is the rationale / evidence record__: it
keeps the **superseded text verbatim** (§3), the reconstruction of why the clause was written (§1),
what falsified it (§1.2), what the amendment deliberately does **not** license (§4), the evidence
(§5), the version record (§6) and the ratification gate (§7). It holds **no second copy of the
rule**. Owner: __Gabe__ (diagnostic lane). Companion docs:
`docs/Diagnostic_Tail_Policy_Measurement.md` (#534 — the curve and the reasoning),
`docs/Diagnostic_Tail_Cut_Landed.md` (#572 — what the setting measures at, **arriving with that PR,
see §8**), `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §3.4/§3.4.1 (the versioning
mechanism this change pays into), `docs/Diagnostic_Probe_Cost_Measurement.md` §13.2 (where the
static requirement was first written down).*

> **This ratification is a paperwork gate that was deliberately left open, and closing it changes
> nothing else.** No code moves with it, no measured figure moves with it, and it settles nothing
> about any other open item in the lane. In particular it does **not** discharge **Anthony's
> agreement to the production mastery-service completion trigger** for tested-out nodes
> (`docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §6(b)/§7, recorded outstanding in
> PR #106), and it does not touch the two findings probe-policy §8 and §9.2 route to Gabe. All
> three remain open.

---

## 1. Why this needed ratifying rather than assuming

### 1.1 What §4.3 said, and the reason it said it

The clause is v2 §4.3's first bullet, and its reason is written **inside the sentence**:

> **"Would cascade" is a static property of `(node, scope, graph)`** — never of the walk's evolving
> unknown set, because `rebuildWalkState` re-buckets response rows by node and re-adjudicates each
> in isolation rather than replaying the walk, and a dynamic rule could not be reproduced that way
> (INV-DIAG-4).

**Reconstructed from the record rather than from inference, the staticness was never a claim about
what makes a good instrument.** It was a reproducibility constraint imported from one
implementation of the recompute path, and the document that first wrote it down gives exactly one
ground for it. `docs/Diagnostic_Probe_Cost_Measurement.md` §13.2 (2026-07-25) — the design-direction
analysis that became the probe-policy amendment — names the dynamic reading explicitly, in the
words a later reader would use for it, and rules it out under its own heading:

> **Why the definition must be static and not dynamic.** A dynamic notion of consequence — "how many
> *currently unknown* nodes does this resolve" — would break reproducibility. `rebuildWalkState` in
> `coverage-measurement.ts` does not replay the walk: it buckets the append-only response rows by
> `node_id` and re-adjudicates each node in isolation, deliberately leaving the order-dependent
> fields (`entry_tier`, `target_tier`, `current`) neutral, because probe order is irrelevant to the
> resolved state. A confirmation rule keyed on the walk's evolving unknown set could not be
> reproduced that way; it would force `rebuildWalkState` to become a full replay.

Three things follow, and they are what make this amendment tractable rather than a reversal:

1. **The reason was true when it was written.** `rebuildWalkState` did exactly that, and nothing in
   the tree could fold a rule along the walk's own order. §13.2's own correction box states the
   constraint at its narrowest: **re-bucket and re-adjudicate, never replay.**
2. **Staticness was chosen as the way to satisfy that constraint, not as the property being
   protected.** What INV-DIAG-4 asks for is that a stored record re-decides to the same resolution
   it was scored under. A static consequence gives that, because it is a pure function of
   `(node, scope, graph)` and none of those three moves. It is a *sufficient* condition, and in
   2026-07-25 it was the only one available.
3. **It was load-bearing, not decorative.** Probe-policy §3.4's additivity proof — the argument that
   let PR #101 change the adjudication rules without bumping `scoring_model_version` — turns on
   `adjudicate` reading `consequence` only at `itemCount === 1` over a frozen population. That
   argument is only available if the consequence is computable from the record at all.

The clause was then carried into the normative text with its justification attached, which is
unusually honest drafting and is precisely what makes it amendable now: **the sentence names the
fact it depends on**, so when that fact changed there was something to check rather than a
preference to argue with. `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §3.3 states the same
dependency from the other side, listing INV-DIAG-4 as untouched *and as the thing that constrained
the design*.

### 1.2 What falsified it

**`adjudicateRecordedWalk` (`engines/diagnostic/src/walk.ts`), landed by
#534 — merged 2026-08-04, `mergedAt`
read rather than inferred.** It re-decides every node of a recorded walk by folding along
`routing_path`: an immutable recorded field that was **already an input to `rebuildWalkState`**. At
each node it rebuilds the resolution the recorded order had reached by that point and adjudicates
against it.

**It is not the "full replay" §13.2 refused, and the distinction is exact.** A replay would have to
reconstruct probe **selection** — which node the policy *would have* chosen next, from
`frontierTarget`, `nearestToTarget`, the domain stage and the tie-breaks. The fold reconstructs
none of that. It consumes the order that actually happened, because that order is recorded, and it
never asks why that order was produced. The order-dependent fields §13.2 names as deliberately left
neutral (`entry_tier`, `target_tier`, `current`) are still left neutral; the fold reads none of
them.

So the premise of the clause — *"a dynamic rule could not be reproduced that way"* — is false as of
#534. Both halves are pinned rather than argued (`docs/Diagnostic_Tail_Policy_Measurement.md` §6.1):

- under the static rules the fold is **exactly equivalent** to adjudicating each node's outcomes on
  their own, which `engines/diagnostic/src/coverage-measurement.test.ts` pins — so nothing about
  the existing recompute changed;
- a walk driven under a live pass closure re-decides to a **byte-identical `probed` map** through
  the fold, and the same record re-decided under the static rules **disagrees about at least ten of
  its nodes** (`engines/diagnostic/src/walk.test.ts`) — so the fold is load-bearing rather than
  decorative, and the rules genuinely travel with the record.

**What was actually making the property well-defined, stated as the rule it always was.** Not
staticness. **Recoverability from the immutable record without reconstructing probe selection.**
Staticness satisfies that trivially, which is why it was mistaken for the requirement. A live pass
closure satisfies it too, by a mechanism that did not exist when the clause was drafted.

One bound widens rather than being hidden, and it is recorded in #534 §6.1: invalidating response
rows out of a stored record already had a documented effect on adjudication (probe-policy §3.4). A
live rule propagates that effect **forward along `routing_path`** instead of stopping at the node
whose rows were dropped, because a changed result changes what every later node's cascade has left
to reach.

### 1.3 Why the sentence still had to be amended, and not merely noted as stale

**A ratified sentence is not repealed by its rationale expiring.** Three reasons this could not be
treated as discharged by §1.2 alone:

- **The delegation in probe-policy §3.4.1 does not reach it.** What §3.4.1 delegates to measurement
  is *"authority over the **value** of `confirmScopeFraction`"*. A live reading does not move that
  value; it changes **which quantity** is compared against the threshold the value produces. The
  two routes §3.4.1 lays out are routes for carrying a **rules change** safely, not a licence to
  make one — and §3.4.1's own framing (*"governs future changes to the constant rather than
  describing the shipped instrument"*) says which of the two it is.
- **v2 is normative and says so about itself.** *"v2 is the single normative source for the shipped
  policy from here on."* An instrument shipping outside the letter of that document is a
  contradiction that costs nothing today and costs a reader their bearings in six months, when
  nobody remembers that it was noticed on purpose.
- **It was already flagged twice and declined once, deliberately.** #534 §6.3 and §8 both name it
  and both refuse to settle it — *"whether INV-DIAG-7/8's text should be restated to match a live
  reading, or the live reading refused as an amendment to them … is a ratification question, not a
  measurement"* — and #572 raised it
  again in its own description rather than letting it pass silently. It arrives here as a decision
  that was queued, not as a discovery.

**And the invariants needed more than a pointer, because of how they fail.** #534 §6.3 makes the
sharp point: under a live reading INV-DIAG-8's protected clause becomes **vacuous rather than
satisfied**. *"No closure is ever large once it has been credited, so the protected case stops
occurring."* Leaning on INV-DIAG-7's existing justification sentence — *"a failure whose cone falls
below that share may be taken on a single scorable item, because there is no subtree for it to
remove"* — would be **true** and would still leave the ratified invariant describing a case that no
longer arises. An invariant whose protected case cannot occur is not a satisfied invariant; it is a
sentence nobody can test. So the quantifier is restated in the invariant text, which is what §3.2
does.

---

## 2. The rule as amended

Stated here once, in full, because §7 ratifies this wording and v2 §4.3/§3.3 now carry it. Someone
should be able to implement it from this section without reading the code.

**"Would cascade" is evaluated per direction, and the two directions are judged independently, as
before.**

- **For a failure it is unchanged and remains static**: the size of the node's **in-scope transitive
  dependent cone**, a pure function of `(node, scope, graph)`. What pruning would remove.
- **For a pass it may be read live**, under a policy that says so (`livePassClosure`), once the walk
  has **already** served at least `liveConsequenceFrom` scorable items — the count is taken over the
  whole walk and **excludes the item being adjudicated**. Read live, it is the number of the node's
  **in-scope transitive prerequisites still `unknown`** in the resolution derived from the walk's
  decided nodes so far: excluding any prerequisite already measured-passed or measured-failed,
  already credited by an inference-licensed pass, or already pruned behind a confirmed failure. That
  is what test-out would **newly** credit. Below the switch point, and under any policy that does not
  ask, the pass side is the whole static closure, unchanged.
- **The threshold is unchanged**, and it is still static: `floor(|scope| × confirmScopeFraction)`,
  rounding down, so a scope small enough that the share falls below one node confirms everything.
  Confirmation is required when the count **reaches** the threshold (`>=`), exactly as before.
- **The live count is by construction ≤ the static count**, since it is the same set minus the
  members already resolved. Nothing becomes *more* consequential by being read live.
- **The reading is part of the resolution rules a record is scored under.** The pair
  (`livePassClosure`, `liveConsequenceFrom`) is registered as a frozen literal in the version-keyed
  registry (`RESOLUTION_RULES_BY_VERSION`, `engines/diagnostic/src/coverage-measurement.ts`) under
  the `scoring_model_version` it ships at, beside every outgoing version's own literals, and a
  record re-decides under the entry for **its own** version.
- **Reproducibility is discharged by the fold, not by staticness** (INV-DIAG-4). A recorded walk is
  re-decided by folding along `routing_path` and adjudicating each node against the resolution the
  recorded order had reached. Probe **selection** is never reconstructed.

**The ratified setting is `livePassClosure: true`, `liveConsequenceFrom: 20`**, registered at
`COVERAGE_SCORING_MODEL_VERSION` **3** (§6.1). `liveFailCone` is **off** and stays off (§3.3, §4).
For what is actually live in the tree as against what is ratified here, read §8.

---

## 3. Invariants

### 3.1 v2 §4.3, the static-property clause — AMENDED, FOLDED INTO v2 §4.3

**The amended text is deliberately not reproduced here.** It was ratified as written on 2026-08-04
and folded into `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` **§4.3** the same day, which is
its single normative home; a second verbatim copy beside it is exactly the drift the fold exists to
prevent. What this section keeps is the *before* text and the reason it changed.

**Superseded text (v2 §4.3, first bullet, as folded in 2026-07-26):**

> - **"Would cascade" is a static property of `(node, scope, graph)`** — never of the walk's
>   evolving unknown set, because `rebuildWalkState` re-buckets response rows by node and
>   re-adjudicates each in isolation rather than replaying the walk, and a dynamic rule could not be
>   reproduced that way (INV-DIAG-4). For a **pass** it is the size of the node's in-scope
>   transitive prerequisite closure (what test-out would credit); for a **failure**, the size of its
>   in-scope transitive dependent cone (what pruning would remove). **The two directions are judged
>   independently.**

**Why.** The `because` clause is falsified (§1.2) and the `never` it justifies goes with it, for the
**pass** direction only. The two sentences that follow it are kept: the definition of each
direction's reach and the independence of the two directions are unchanged, and the failure
direction is still exactly the static cone.

### 3.2 INV-DIAG-8 (proportionate test-out) — QUANTIFIER AMENDED, FOLDED INTO v2 §3.3

**The amended text is deliberately not reproduced here**, for the reason given in §3.1.

**Superseded text (v2 §3.3, as amended 2026-07-26 and ratified as written that day):**

> - **INV-DIAG-8 (proportionate test-out).** Downward inference (crediting a passed node's
>   unmeasured prerequisites) fires only on a pass that is **adequately confirmed for its
>   consequence**. A pass that would credit a prerequisite closure reaching a defined share of the
>   scope fires only on a **robust** pass — two correct in a row — exactly as before. A pass whose
>   closure falls below that share may fire on a single scorable item, since it credits little. A
>   **borderline pass never credits the closure at any size**: a mixed 2-of-3 remains non-inferring,
>   and the walk descends to verify instead. *(Amended 2026-07-26, superseding the "ONLY on a robust
>   pass" text ratified 2026-07-22. Large closures — the cases the invariant was written to protect
>   — still require a clean 2/2, and the borderline case it names explicitly is untouched.
>   Rationale: probe-policy §3.2.)*

**Why, and what is honestly given up.** The clause that moves is *"a prerequisite closure reaching a
defined share of the scope"*. Read live, that quantifies over the part of the closure the walk has
**not already credited**, so the sentence goes on meaning what it always meant — *do not credit a
large cascade on one item* — with "cascade" now counting only what the decision can still cause.
What it no longer means is *"a deep node with many prerequisites is always confirmed"*, and that is
a real loss rather than a rewording: the frontier bisection ascends, so by the time a deep node is
probed its prerequisites are usually credited already, and the protected case stops occurring rather
than being satisfied (#534 §6.3, §5.1). **`liveConsequenceFrom: 20` is what keeps the clause from
being vacuous.** Below the switch point the ratified static reading applies unchanged, so the clause
bites for every learner's first twenty items and — because the threshold rounds to 0 there — for the
whole of the D1 walk. That is a narrowing, and it is stated as one.

### 3.3 INV-DIAG-7 (proportionate confirmation) — NOT AMENDED IN SUBSTANCE; one clause added

The failure direction is **not** read live, and after this amendment that is written into the
invariant instead of being left to the absence of a knob.

**Ratified text (v2 §3.3, as amended 2026-07-26), which stands word for word:**

> - **INV-DIAG-7 (proportionate confirmation).** A subtree is pruned only after a failure that is
>   **adequately confirmed for its consequence**. A failure that would prune a dependent cone
>   reaching a defined share of the scope requires a **confirmed** failure (2-of-3), exactly as
>   before; a single miss never removes such a subtree from the instrument or from the readiness
>   denominator. A failure whose cone falls below that share may be taken on a single scorable item,
>   because there is no subtree for it to remove. On any scope small enough that the share rounds
>   below one node, every failure requires confirmation. The instrument remains biased toward
>   false-negatives (redo easy content) over false-positives (uncovered gaps).

**What is added, and only this:** a sentence recording that the cone is judged **statically**, that
the asymmetry with INV-DIAG-8 is deliberate, and why. Adding a clause to a ratified invariant is
still a change to ratified text, which is why it goes through this gate rather than being slipped in
as a clarification.

**The reason is measured, not aesthetic.** #534 §4.4 priced the two directions apart. A live fail
cone buys **nothing** where the tail is — p90 and p99 sit unmoved at 62 and 70 — and makes the
failure that hurts **worse**, already-mastered skills sent back rising 2.42 → 2.52, because an
unconfirmed miss is a mastered skill failed on one item. That is the exact direction INV-DIAG-7 says
the instrument leans away from. The two directions cost different things, so they are not made
symmetric merely because they are described by one sentence.

### 3.4 Preserved unchanged

- **INV-DIAG-4 (reproducibility) — PRESERVED, by a different mechanism.** A stored record still
  re-decides to the resolution it was scored under. What changed is how: the fold along
  `routing_path` rather than the coincidence that the rules did not depend on the walk. Pinned both
  ways (§1.2), and the recompute resolves the record's rules from the version-keyed registry rather
  than reading today's `DEFAULT_WALK_POLICY` — the mechanism probe-policy §3.4 installed, doing the
  job it was installed for.
- **INV-DIAG-6 (fail-closed placement) — PRESERVED, untouched.** Nothing here credits an unresolved
  node. Nodes the instrument ceiling leaves unresolved still resolve `unknown` and seed **0**. The
  terminal rule that would have weakened this was declined on 2026-07-25 (probe-policy §5) and stays
  declined. It is worth noting that the tail cut removes the population the terminal rule was about
  — measured truncation goes to 0.00% (§5) — which strengthens the decline rather than reopening it.
- **INV-DIAG-1 / INV-DIAG-2 / INV-DIAG-3 / INV-DIAG-5 — PRESERVED, untouched.** The diagnostic still
  writes only `placement_estimate`; measured-only coverage is still computable for audit and no new
  inferred-pass source is introduced; one instrument; pre/post comparability is unchanged **as a
  rule**, though the version bump moves which pairs satisfy it (§6.2).
- **`robust` is NOT redefined**, for the third time and for the reason
  `docs/Diagnostic_Probe_Cost_Measurement.md` §13.3 gives: it is still exactly a clean 2/2, it still
  drives the top city seed of 3, and the 0–3 placement scale v2 §4.4 ratifies is untouched. So is
  the `placement_estimate >= 2` test-out unlock boundary (`docs/Contracts.md` §1.1).
- **v2 §4.2 probe ordering** — unaffected. This is a resolution rule, not a selection rule; §4.2's
  standing as a tunable policy is neither used nor needed here.
- **`MAX_PROBE_ITEMS = 3`, the 70-item instrument ceiling, and v2 §8's ≥3-items-per-served-cell
  pool depth** — all unchanged. The amendment reduces how often a second item is drawn; it moves no
  maximum.

---

## 4. What this does NOT license

**This is the half most likely to be dropped, so it is written as a list of refusals rather than as
context.** The delegation is a live **pass** reading at the **ratified setting**, carried under the
version mechanism. It is not a general licence.

1. **The fail side stays static, and is not delegated.** `liveFailCone` is off and turning it on is
   a new amendment, refused on #534 §4.4's numbers (§3.3). "The pass side was allowed, so the fail
   side follows by symmetry" is exactly the inference this section exists to block: the two
   directions were measured apart precisely because they are not symmetric.
2. **The threshold does not become dynamic.** `confirmThresholdFor(|scope|, confirmScopeFraction)`
   is still a function of the scope size alone. Only the **reach** compared against it is read live,
   and only on the pass side. A threshold that moved with the walk would be a different change and
   is not ratified here.
3. **The value of `liveConsequenceFrom` is NOT delegated to measurement**, unlike
   `confirmScopeFraction`. It is ratified at **20**, and moving it — in particular to 0 — returns to
   this gate. The reason is in the evidence: #534 §5.3 prices 0 against 20 and finds the difference
   is not an accuracy question at all. At 0 the completion ceremony names **0.00** skills in **0%**
   of sessions; at 20 it names fewer but the share of sessions naming at least one does not move
   (59% → 58%). That is a product judgment about the ending, and a measurement cannot settle it, so
   it is not the kind of number §3.4.1's delegation was written for. The drift guard in
   `coverage-measurement.test.ts` is what makes this mechanical rather than honour-based: it reddens
   when `liveConsequenceFrom` slides away from the entry registered for the current version, and
   #572 re-observed that red at 20 → 15.
4. **`inferOnMajorityPass` is not turned on, and inference licensing is not widened.** A borderline
   2-of-3 pass still credits nothing at any size. v2 §4.3's clause that a mixed 2-of-3 is a genuine
   pass which tests out of its own lesson is untouched, and so is the separation of `infers` from
   `robust`.
5. **No other static property becomes dynamic by precedent, and the test is narrow.** A quantity in
   the resolution rules is eligible to be read against the walk's evolving state **only** when all
   three hold: (a) it is recoverable from the immutable record — `routing_path` plus the append-only
   response rows plus the caller-supplied scope and the graph — **without reconstructing probe
   selection**; (b) that recoverability is pinned by a differential that fails when the fold is
   replaced by isolated re-adjudication, so the fold is demonstrated load-bearing rather than
   assumed; and (c) the change is carried under Route A or Route B of probe-policy §3.4.1. Anything
   that would need the walk's **selection** rebuilt — anything reading `entry_tier`, `target_tier`,
   `current`, or asking which node the policy *would have* chosen — **remains forbidden**, because
   those are the order-dependent fields `rebuildWalkState` deliberately leaves neutral and
   `routing_path` records the order that happened, not the rule that produced it. §13.2's constraint
   survives in that form: **re-bucket or fold, never replay.**
6. **The scope, the depth weights, the coverage formula and the reported metric are untouched.**
   v2 §5 is not in this amendment's path at all.
7. **This is not a licence to edit v2 in place without a gate.** The convention that produced this
   document — superseded text kept verbatim, amended text folded into v2 with a dated note, a
   ratification gate that names who ratified what and when — is the thing that makes a considered
   change legible as one. A future reader finding a §4.3 that has quietly changed shape should treat
   the absence of a record as the defect.

---

## 5. The evidence

**Cited, not restated as new work.** Everything below is measured in #534 and re-measured in #572;
neither number was produced here.

**The curve — `docs/Diagnostic_Tail_Policy_Measurement.md` (#534, merged 2026-08-04).** 62-node
scope, n = 6,000, mild noise, paired seeds, the real engine over the real registry graph. Its §1
sweeps the dial and its §4.4 splits the two directions; §5.3 recommends `livePassClosure: true,
liveConsequenceFrom: 20` and §5.4 attaches a precondition about **when**, not what.

**What the setting measures at — `docs/Diagnostic_Tail_Cut_Landed.md` (#572).** Both published
baselines reproduced digit for digit before anything was changed. 62 nodes, n = 6,000, mild noise,
**teaching order — the order `DIAGNOSTIC_WALK_SCOPE` is in, so this is the instrument a learner is
administered** (that record's §2.1):

| | median | p90 | p99 | max | truncated | truth accuracy | mastered sent back | gaps through | skills named | sessions naming ≥ 1 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **before** | 38 | **62** | **70** | 70 | **1.43%** | 95.5% | 2.45 | 0.31 | 6.18 | 59% |
| **after (the ratified setting)** | **36** | **47** | **53** | **58** | **0.00%** | **95.6%** | **2.34** | 0.40 | 2.36 | **58%** |

**On truth accuracy, be precise about which row is being quoted, because the two orderings differ
by a tenth of a point.** On the live teaching order it reads **95.5% → 95.6%** — it does not fall,
and it ticks very slightly up. It is **95.6% → 95.6%, unchanged**, on `getProductNodes()` order,
which is #534's published row and where the rest of that row reads p90 62 → 48, p99 70 → 54,
sent-back 2.42 → **2.30**, reproducing #534's prediction exactly (#572 §2.2). Both orderings are the
same 62 nodes; `resolveKnowledgeState` walks `state.scope`, so they are very slightly different
instruments (#572 §1.1). Neither figure is a discrepancy and neither is sampling.

**The number the aggregates hide, and the strongest single thing the change does** (#572 §2.4): the
1.4% of learners the ceiling truncated were being scored at **84.6%** and told to rebuild **9.5**
skills they already held, against 95.7% and 2.31 for everyone else. **That cohort is empty** — not
because the ceiling moved, but because the longest walk observed in 6,000 falls from the 70-item
ceiling to 58.

**The price, stated rather than buried.** Gaps let through rise 0.31 → 0.40 per session, which is
the direction INV-DIAG-7 asks the instrument to lean away from, and the completion ceremony names
6.18 → 2.36 skills. The share of sessions naming at least one skill is 59% → 58%. Both are the
reason the setting is 20 and not 0 (§4, item 3).

**D1 is bit-identical, measured rather than argued** (#572 §3). `d1BitIdentity.test.ts` replays 400
D1 learners' pre-drawn answers to both policies and compares **whole traces** — probe order, every
`node#attempt` served, and the final `probed` map with outcomes, result, robustness and inference
licence — with floors so a degenerate cohort cannot pass by comparing nothing, and a 62-node control
that must come apart, which failed under injection. The mechanism is the one INV-DIAG-7 already
carries: `confirmThresholdFor(6, 7/62)` is 0, and a threshold of 0 confirms every decision whatever
the consequence is read as.

**Why the precondition #534 §5.4 attached is met.** That section recommended not flipping before the
scope passes the sixth era, because at `be72c537` six nodes had no servable content, the placement
horizon cut at the sixth era, and the instrument a learner actually took was 34 nodes at p90 41 —
which has no tail to cut. `POL.5` was the last in-product node with no authored content; with it
authored the derived scope and the in-product set coincide at all 62 nodes and the horizon cuts
nothing. The 62-node row stopped being a projection and became the instrument.

---

## 6. The version record — two records, not one

**These are two different changes and neither substitutes for the other.** #572 was careful to keep
them apart; this document is too, because conflating them is how one of them gets skipped.

### 6.1 `scoring_model_version` 2 → 3 — this amendment's own cost, under Route A

Probe-policy §3.4.1 offers two routes for a rules change. **Route B does not close here**, and the
reason is #534 §6.2's, pinned in `coverage-measurement.test.ts` rather than asserted: a live count is
always ≤ the static one and `adjudicate` reads `consequence` only at `itemCount === 1`, so on every
**decided** node the two rule sets are the same function — but a node the instrument **ceiling**
leaves with a single outcome and **no decision** diverges, and `recordScoredOutcome` handles the
ceiling landing mid-node explicitly, so a *finalized* record can contain one. Unlike PR #89's bound,
which was confined to invalidation, that population is **not frozen**, and Route B's bar is
enumerate-pin-and-freeze. *"No such record exists today because the live scope never truncates"* is
exactly the weak deployment leg `docs/Answer_Equivalence_Spec.md` §13.13 refuses and §3.4.1 names as
not qualifying.

**So Route A**, and §3.4.1 requires all four parts: bump `COVERAGE_SCORING_MODEL_VERSION` to **3**;
register the new rules as a **frozen literal** under version 3 in `RESOLUTION_RULES_BY_VERSION`;
**leave version 2's literals in place**, so a record written under version 2 still recomputes under
its own rules; and **record the INV-DIAG-5 comparability impact** rather than acknowledging it.
#572 walks all four.

### 6.2 The comparability impact, named

**Every existing pre/post pair becomes `not_comparable`** — the D1 pairs and any pair taken on the
widened scope — and all of them were administered at `scoring_model_version` **2**.
`comparabilityStatus` fails on either version field, so a version-2 pre against a version-3 post
fails on this one.

**That population was already `not_comparable` before this change**, because the blueprint bump in
§6.3 had already caught it. So this bump strands no cohort the other had not already stranded. It is
recorded separately anyway, for the reason §6 opens with.

### 6.3 `blueprint_version` 5 → 6 — a DIFFERENT record, and not this amendment's

Required by **D-END4** (`docs/superpowers/specs/2026-07-31-game-completion-ceremony-design.md` §4.4
and its §16 ruling table) and made by the **POL.5 scope-widening work**, not by this change: the node
set the instrument administers grew, and because the coverage denominator is a read-time argument
rather than a field on the record, leaving the version alone would have silently re-denominated
every baseline already collected instead of marking it `not_comparable`. **Turning a knob does not
move the node set**, so this amendment neither makes nor needs a blueprint bump.

*Read the constant rather than the arithmetic, because the widening arrived in two steps on a
stacked pair of open PRs and `integration` is behind both:* `DEFAULT_WALK_BLUEPRINT_VERSION`
(`services/diagnostic-runtime/src/walk-runtime.ts`) is **4** on `integration` at the time of
writing, **5** on #524's branch (`EL.3`/`EL.4`/`EL.5`, plus `POL.6`/`POL.7`/`TRG.7`/`TRG.8`) and
**6** on #565's (`POL.5`). The 5 → 6 step is the one #572's record names, and it is the last of them
rather than the whole of them. Which node set each version denotes is recorded in
`services/diagnostic-runtime/src/walkInstrumentScope.test.ts`, with the composition half in
`engines/diagnostic/src/blueprintScope.test.ts` — the D-END4 register, which is where to look rather
than at any prose count.

Do not read the two bumps as one act, and do not let either stand in for the other: they are
recorded by different work, they are justified by different rulings — D-END4 for the node set,
probe-policy §3.4.1 Route A for the resolution rules — and a future reader who merges them will
conclude that a scope widening pays for a rules change or the reverse. Neither is true.

---

## 7. Approval checklist (ratification gate)

- [x] **(a) The static-property clause in v2 §4.3 is amended for the PASS direction only** (§2,
      §3.1), on the falsification in §1.2 rather than on convenience. — **RATIFIED by Gabe,
      2026-08-04, on the product lead's approval.** In his own lane; recorded rather than
      circulated, per the `OWNERS.md` cross-lane policy.
- [x] **(b) INV-DIAG-8's quantifier is restated to match**, and the narrowing is written down rather
      than papered over with INV-DIAG-7's justification sentence (§3.2). — **RATIFIED by Gabe,
      2026-08-04.** Ticked as part of (a) and not as a separate judgment: there is no coherent
      option in which the rule ships and the invariant goes on quantifying over a case that cannot
      occur. What is a separate judgment is the switch point, which is (d).
- [x] **(c) The FAIL direction stays static, and INV-DIAG-7 gains a clause saying so** (§3.3). —
      **RATIFIED by Gabe, 2026-08-04**, on #534 §4.4's measurement: a live fail cone buys nothing at
      p90/p99 and makes already-mastered-sent-back worse, 2.42 → 2.52. Ticked on its own merits,
      because (a) says nothing about the other direction and the symmetric reading is the obvious
      wrong inference from it.
- [x] **(d) The switch point is ratified at `liveConsequenceFrom: 20` and is NOT delegated to
      measurement** (§4, item 3). — **RATIFIED by Gabe, 2026-08-04.** Deliberately unlike
      `confirmScopeFraction`, whose value §3.4.1 does delegate. The dial's endpoints differ on a
      dimension measurement cannot rank: at 0 the ceremony names nothing in 0% of sessions, at 20 the
      share of sessions naming at least one skill does not move. Moving it returns to this gate, and
      §3.4's drift test is what makes that mechanical.
- [x] **(e) The version record is Route A, walked in full, with the comparability impact named**
      (§6.1, §6.2), and the `blueprint_version` bump is recorded as a **separate** record belonging
      to the POL.5 widening under D-END4 (§6.3). — **RATIFIED by Gabe, 2026-08-04.** Route B is
      refused on #534 §6.2's counterexample, not on preference.
- [x] **(f) The refusals in §4 are part of what is ratified**, not commentary attached to it — in
      particular items 1, 3 and 5. — **RATIFIED by Gabe, 2026-08-04.** A permission recorded without
      its boundary is read as the general case by whoever needs it to be.

**All six boxes are closed, so the condition for the fold is met and the fold was performed the same
day:** the amended §4.3 clause and the amended INV-DIAG-7/8 text now live in
`docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` §4.3 and §3.3, and **v2 remains the single
normative source for the shipped policy.**

---

## 8. What ships today, and how to check rather than believe this document

**Read the tree, not this section, and this section says how.** A ratification is a statement about
what is permitted; whether the knob is on is a fact about the code, and the two move on different
days.

**Merge state at the time of writing, `mergedAt` read rather than inferred from titles. Everything
in this section was read on `integration` at `7d4ff50f`; a finding is evidence about a SHA, so
re-read it at the current tip rather than trusting this table once anything in the lane has
merged.**

| PR | state | what it carries |
|---|---|---|
| #534 | **MERGED** 2026-08-04 | `adjudicateRecordedWalk`, the three off-by-default knobs, and the measurement record this rests on |
| #572 | **OPEN** (`mergedAt: null`) | the setting itself, the Route A bump, `d1BitIdentity.test.ts` and `docs/Diagnostic_Tail_Cut_Landed.md` |
| #565 (POL.5), #524 | **OPEN** | the scope widening that met #534 §5.4's precondition, and the `blueprint_version` 5 → 6 record of §6.3 |

So on `integration` at the time of writing, `DEFAULT_WALK_POLICY` still reads
`livePassClosure: false, liveConsequenceFrom: 0` and `COVERAGE_SCORING_MODEL_VERSION` is still **2**.
**That is not a contradiction with this amendment and it is not a defect.** This document ratifies
the rule and the setting; #572 is the change that turns it on. Until #572 merges, a statement about
what the instrument does is a statement about that PR's diff and not about the tree.

**Three places to read instead of trusting a sentence here**, each of which is a fact rather than a
claim:

- `DEFAULT_WALK_POLICY` (`engines/diagnostic/src/walk.ts`) — what the live instrument does.
- `RESOLUTION_RULES_BY_VERSION` and `COVERAGE_SCORING_MODEL_VERSION`
  (`engines/diagnostic/src/coverage-measurement.ts`) — what every stored record re-decides under,
  version by version.
- `docs/Diagnostic_Tail_Cut_Landed.md`, once #572 has merged — the re-measurement, the injection
  table for every guard that changed, and the defect the bump exposed in `measurement-read.ts`.
