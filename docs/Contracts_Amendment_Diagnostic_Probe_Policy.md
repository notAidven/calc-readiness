# Contracts Amendment: Diagnostic Probe Policy (proposed 2026-07-25 — RATIFIED 2026-07-26)

*__Status: RATIFIED 2026-07-26 — by Gabe, as diagnostic-lane owner.__ **All five §7 boxes are
closed:** (a) and (b) ratified 2026-07-26, (c) decided 2026-07-25, **(d) ratified 2026-07-26
conditionally** — re-tuning `7/62` by measurement is delegated, on the normative conditions in
**§3.4.1** — and (e) declined 2026-07-25. §3.4 (no version bump) settled 2026-07-26. **FOLDED into
`docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` on 2026-07-26**, which is what §7 instructed
once (b) and (d) closed: the amended **INV-DIAG-6/7/8** text now lives in **v2 §3.3** and the
amended per-node adjudication in **v2 §4.3**, and **v2 is the normative source for the shipped
policy**. __This document remains the rationale / evidence record__ — the measurement the change
rests on, the ceiling analysis, the declined terminal rule, the versioning proof, and the approval
checklist. One part of it is still normative and is held here rather than duplicated: **§3.4.1, the
conditions on re-tuning the confirmation threshold**, which governs future changes to the constant
rather than describing the shipped instrument. **Where this document and v2 disagree about what
ships, v2 wins.** This amended a __RATIFIED__ position: v2 (RATIFIED 2026-07-22)
§4.3. It changed text for **INV-DIAG-7** and **INV-DIAG-8** only — no record table, no
write-mapping, no port. Owner: Gabe. Companion docs:
`docs/Diagnostic_Probe_Cost_Measurement.md` (the evidence this rests on),
`docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.*

> **This closes the diagnostic lane's ratification gates. It does not mean everything is settled.**
> One item is still genuinely owed by another owner, is untouched by this fold, and must not be read
> as closed by it: **Anthony's agreement to the production mastery-service completion trigger** for
> tested-out nodes (`docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §7, recorded outstanding
> in PR #106). That is an implementation commitment rather than a ratification gate — which is why
> it does not block this fold — and it remains open.

> **INV-DIAG-6 is NOT amended — no behaviour of it changes, in either direction.** A terminal rule
> crediting unresolved nodes at the instrument ceiling was proposed, measured, and **declined by
> Gabe on 2026-07-25** to keep fail-closed intact. §5 records the analysis in full so a future reader
> wanting a shorter instrument finds it rather than redoing it. **§6 records why the ceiling is 70
> rather than 60: it fixes the same truncated cohort the terminal rule would have, without touching
> INV-DIAG-6.**
>
> **One caveat, and it is about words only: §3.6 restates INV-DIAG-6's clause (i)** (now folded into
> v2 §3.3, where the corrected clause lives). Clause (i) said "confirmed", which the amended
> instrument's single-item pass is not, so the ratified sentence had stopped describing what the
> invariant actually does. **No threshold moves and no code changes** — it was the sentence that was
> wrong, not the rule.

---

## 1. Why

`docs/Diagnostic_Probe_Cost_Measurement.md` measured the ratified walk on the 62-node graph at a
**median of 82 items**, p90 111, p99 132, max 145 — longer than the flat MST that v2 §1.1 rejected
*on the grounds that the MST was too long*. §3 of that note isolates the cause: pruning works (only
35 of 62 nodes are probed), but **adjudication costs 2.34 items per probed node**.

The note left four options open (§11) and deliberately decided none of them. This amendment
implements **§11(B) + §11(D)** together, because measurement showed each is necessary and neither
is sufficient: attacking the multiplier alone lands at ~42 items, and reordering alone at ~73.

**Measured result** (harness `engines/diagnostic/sim/policy-sweep.sim.test.ts`, n = 6,000, mild
noise, pooled profiles; the legacy control in that harness reproduces the recorded baseline
exactly):

| 62-node full scope | median | p90 | p99 | max | items/node | truth accuracy |
|---|---|---|---|---|---|---|
| Before (ratified policy) | 82 items / 35 nodes | 111 / 43 | 132 / 49 | 145 / 52 | 2.34 | 97.9% |
| After (this amendment) | **38 items / 30 nodes** | 62 / 40 | 70 / 45 | 70 / 50 | 1.45 | **95.6%** |

The **live D1 scope is bit-identical**: 7 items median, p90 12, p99 15, max 18, 98.0% accuracy,
unchanged in every figure — the before and after rows agree digit for digit, and D1 never approaches
the ceiling at either value. §3.2 explains why that is by construction rather than by luck.

---

## 2. What changes in the instrument

Two mechanisms, plus a backstop. Only the first and third touch a ratified invariant.

**(a) Confirmation proportional to consequence (§11(D)).** Every node opens with one item. The
decision stands on that item *unless it would cascade*, in which case the node falls through to the
existing adaptive 2-of-3 unchanged. "Would cascade" is measured by a **static** property of the
node within the scope: for a pass, the size of its in-scope transitive prerequisite closure — what
test-out would credit; for a failure, the size of its in-scope transitive dependent cone — what
pruning would remove. The two directions are judged independently.

The threshold is a **share of the scope** (`7/62`), not an absolute count, because the damage a
wrong call does is inherently relative to the size of the instrument: a cascade of five nodes is
most of the 6-node D1 walk and a rounding error in the 62-node walk. It rounds **down**, so on a
small scope it reaches 0 and everything is confirmed.

**(b) Two-stage bisection at domain granularity (§11(B)).** The frontier target is computed **per
domain** rather than by scanning the whole scope, so evidence from one strand no longer aims the
probe for an unrelated one. **This is pure probe ORDERING, which §4.2 already declares "a tunable
policy" whose invariants "hold regardless of order," so it needs no ratification** and is recorded
here only because it is half the measured effect.

**(c) An instrument ceiling of 70 scorable items.** There is currently **no instrument-level
ceiling at all** — `MAX_PROBE_ITEMS = 3` bounds a single node — so the 145-to-175-item tail is
undesigned rather than chosen. The ceiling is a backstop: the median sits at 38 and 1.7% of students
reach it. Nodes it leaves unresolved resolve **fail-closed, unchanged** (§5). Bounding the
instrument and crediting unmeasured nodes are separate decisions, and only the second was declined.
**70 rather than 60 for the reason set out in §6** — a tighter ceiling is not free, it is a
concentrated cost paid by whoever hits it.

---

## 3. Invariants

### 3.1 INV-DIAG-7 (asymmetric confirmation) — AMENDED, FOLDED INTO v2 §3.3

**The amended text is deliberately not reproduced here.** It was ratified as written on 2026-07-26
and folded into `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` **§3.3** the same day, which is
now its single normative home. A second verbatim copy beside it is exactly the drift the fold exists
to prevent, so what this section keeps is the *before* text and the reason it changed.

**Superseded text (v2 §3.3 as ratified 2026-07-22):**

> **INV-DIAG-7 (asymmetric confirmation).** A subtree is pruned only after a **confirmed** failure
> (2-of-3). A single miss never removes a node from the instrument or from the readiness
> denominator. The instrument is biased toward false-negatives (redo easy content) over
> false-positives (uncovered gaps).

**Why.** The clause being relaxed is "a single miss never removes a node," and it is relaxed only
where there is nothing to remove. The cascade guarantee — *don't prune a subtree on one item* — is
preserved intact. What is removed is a node with no dependents paying for a confirmation it cannot
cascade.

### 3.2 INV-DIAG-8 (conservative test-out) — AMENDED, FOLDED INTO v2 §3.3

**The amended text is deliberately not reproduced here**, for the reason given in §3.1: it was
ratified as written on 2026-07-26 and folded into
`docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` **§3.3**, which now holds the only copy.

**Superseded text (v2 §3.3 as ratified 2026-07-22):**

> **INV-DIAG-8 (conservative test-out).** Downward inference (crediting a passed node's unmeasured
> prerequisites) fires ONLY on a robust pass — a confirmed pass at/above the node's own tier.
> Borderline or low passes do not credit the closure; the walk descends to verify instead.

**Why.** Large closures — the cases the invariant was written to protect — still require a clean
2/2. The relaxation is confined to closures too small to matter, and the *borderline* case the
invariant names explicitly is untouched.

**A note on `robust`, which is NOT redefined** (the rule itself is in v2 §4.3; this is why it was
designed that way). Inference licensing moved to a separate flag rather than widening `robust`,
because widening it would have silently shifted the 0–3 placement scale that v2 §4.4 ratifies and
that the test-out unlock amendment builds on. One visible consequence, recorded because it surprises
people: **a measured pass no longer implies seed 3**, since an inconsequential node passes on one
item and seeds 2. The unlock boundary is unaffected — it keys on `placement_estimate >= 2`.

### 3.3 Preserved unchanged

- **INV-DIAG-1** (mastery firewall), **INV-DIAG-3** (one instrument), **INV-DIAG-5** (pre/post
  comparability) — untouched.
- **INV-DIAG-2** (resolved-state metric) — untouched. Measured-only coverage remains computable for
  audit, and no new inferred-pass source was introduced.
- **INV-DIAG-6** (fail-closed placement) — **design intent untouched; clause (i) needs a wording
  fix. See §5 for the terminal-rule amendment that was declined, and §3.6 for the wording.**
- **INV-DIAG-4** (reproducibility) — untouched, and it constrained the design. Consequence had to be
  a **static** function of `(node, scope, graph)` rather than of the walk's evolving unknown set,
  because `rebuildWalkState` re-buckets response rows by node and re-adjudicates each in isolation;
  it does not replay the walk. A dynamic rule could not be reproduced that way.
  - *(⚠ **The last sentence is FALSIFIED as of 2026-08-04, and the bullet is left standing because
    it is the record of what constrained this amendment.** `adjudicateRecordedWalk` (`walk.ts`,
    landed by PR #534) reproduces a dynamic rule from the immutable record by folding along
    `routing_path` and adjudicating each node against the resolution that recorded order had
    reached. That is not the "full replay" this bullet rules out: probe **selection** is never
    reconstructed, only the order it produced, which is already recorded and already an input to
    `rebuildWalkState`. So staticness was a **sufficient** condition for INV-DIAG-4 rather than a
    necessary one, and the necessary one is recoverability from the record without rebuilding
    selection. INV-DIAG-4 itself is still untouched and still holds. The consequence for the
    normative text is `docs/Contracts_Amendment_Diagnostic_Live_Consequence.md`, ratified
    2026-08-04, which amends v2 §4.3's static-property clause for the **pass** direction only —
    the failure direction stays static, and §4 of that document lists what the change does not
    license.)*
- **§4.2 probe ordering** — no ratification needed, as §4.2 itself states.

### 3.4 Versioning: `COVERAGE_SCORING_MODEL_VERSION` stays 2 (settled 2026-07-26)

v2 §2.2 makes `scoring_model_version` version the coverage-weight function **and the resolution
rules**, not only the adjudication thresholds — so an amendment that changes adjudication has to
answer the bump question explicitly. It was not answered when this landed as PR #89. It is now.

**The answer is no bump, on the strong leg.** Per the precedent in `docs/Answer_Equivalence_Spec.md`
§13.13 — a version bump exists to stop an old record replaying differently, and *provable
additivity* is the durable ground for leaving one alone, as against the weaker "no record exists
yet" deployment fact — the question is whether any RECORDED response can replay differently. It
cannot, and the argument does not depend on which scope is live:

**The proof.** The amended `adjudicate` reads `consequence` and `confirmThreshold` **only at
`itemCount === 1`**. Every other branch is the ratified function, byte for byte. And a *finalized*
pre-amendment record cannot contain a node with one scorable outcome: the ratified rule never
decided on one item, so the walk never advanced off such a node, and there was no ceiling to cut it
short. It stopped a node at two items only on a clean sweep, so `[T,T,*]` is unreachable too. The
per-node outcome sequences a completed pre-amendment record can hold are therefore exactly

`[T,T]`, `[T,F,T]`, `[T,F,F]`, `[F,T,T]`, `[F,T,F]`, `[F,F,T]`, `[F,F,F]`

— on all seven of which the amended rule returns an identical `Adjudication` for **every**
consequence and **every** threshold. The added `infers` flag equals `robust` on all seven, and
`licensesInference` reads `infers ?? robust`, so no old record newly credits a prerequisite closure
either. Pinned exhaustively in `engines/diagnostic/src/coverage-measurement.test.ts`
("versioned resolution rules (INV-DIAG-4)").

Note what this argument does **not** rest on. "The live scope is D1, where
`confirmThresholdFor(6, 7/62) === 0`, so the rules coincide" is true but is the *weak* leg: the
scope is supplied by the caller (`reads.ts` passes `MVP_NODE_IDS`), it is not recorded, and
extending the diagnostic past D1 is planned work — the threshold becomes non-zero at a **9-node**
scope. That leg would expire; the additivity one does not, because the population it quantifies over
is frozen. No pre-amendment record can ever be written again.

**Two bounds, recorded rather than hidden.**

1. **Invalidation.** `scoreCoverageAdministration` accepts `invalidatedItemVersionIds`, and dropping
   rows can reduce a node to a single surviving outcome — the one shape where the rule sets
   disagree (ratified: undecided, fail-closed; amended: decided on that item). Unreachable on any
   scope whose threshold rounds to 0, which is every scope served to date.
2. **`ceiling_reached`.** #89 also made `rebuildWalkState` stamp truncation from today's 70-item
   budget, which would label a pre-amendment record of ≥70 items truncated when there was no ceiling
   to truncate it. Inert (pre-amendment D1 tops out at 18 items) and read by nothing in resolution,
   but it was a second way the new rules reached backwards.

**What was fixed, since "no bump" is not the same as "nothing to do".** The real defect was never
the constant's value; it was that `rebuildWalkState` read `DEFAULT_WALK_POLICY` unconditionally
(`coverage-measurement.ts`), so INV-DIAG-4 held only by the coincidence proved above and nothing
would have caught it if it had not. Recompute now resolves the rules a record depends on
(`confirmScopeFraction`, `maxItems`) from a **version-keyed registry of frozen literals**, keyed by
the record's own `scoring_model_version`, and a test fails if `DEFAULT_WALK_POLICY` drifts from the
entry registered for the current version. A future rule change now has to either bump and register
the old rules beside the new — which is what actually preserves recomputability, where a bare bump
would only relabel the breakage — or write down its additivity proof. Bumping *here* was rejected on
its own merits as well: it would have made every existing D1 pre/post pair `not_comparable` under
INV-DIAG-5 to guard a divergence that provably cannot occur.

### 3.4.1 Re-tuning the confirmation threshold — NORMATIVE (ratified 2026-07-26, §7 box (d))

**Authority over the *value* of `confirmScopeFraction` is delegated to measurement.** Moving `7/62`
does not require re-ratifying this amendment. That delegation is **conditional on the mechanism §3.4
installed being honoured**, and the conditions below are normative rather than advisory: a re-tune
that satisfies neither route is **not** delegated and returns to the §7 ratification gate.

**Route A — bump and register.** Bump `COVERAGE_SCORING_MODEL_VERSION`, and register the new
`confirmScopeFraction` (with `maxItems`) as a frozen literal under the new version in the
version-keyed registry (`RESOLUTION_RULES_BY_VERSION`, `engines/diagnostic/src/coverage-measurement.ts`),
**leaving the outgoing entry in place** so a record written under the old version still recomputes
under its own rules. A bare bump that retires the old entry is not Route A: as §3.4 sets out, that
relabels the breakage instead of preserving recomputability.

**Route A additionally requires the INV-DIAG-5 comparability impact to be recorded**, not merely
acknowledged. State **which existing pre/post pairs become `not_comparable`** as a result,
identified by scope and by the `scoring_model_version` they were administered under, so the affected
population can be counted rather than gestured at. On today's tree that is *every* existing D1
pre/post pair, all of which were administered at version 2.

**Route B — carry an additivity proof.** Leave the version alone and write down a proof that **no
stored record re-adjudicates differently under the new value**, so recomputation of every existing
record stays faithful.

**Route B is an established route, not a loophole,** and the bar is the one **PR #101** met when it
changed the adjudication rules and deliberately did not bump the version — the argument recorded in
§3.4 above. #101 did not assert additivity and move on. It enumerated the **seven** per-node outcome
sequences a *finalized* pre-amendment record can contain, showed the amended rule returns a
**byte-identical `Adjudication` on all seven for every consequence and every threshold**, showed
`infers` equals `robust` on all seven so that no old record newly credits a prerequisite closure,
and pinned the enumeration exhaustively in `engines/diagnostic/src/coverage-measurement.test.ts`.
It then closed the argument by establishing that the population it quantifies over is **frozen**: no
pre-amendment record can ever be written again. A Route B proof must reach that standard —
enumerated, pinned by test, and quantified over a population that cannot grow.

**What does NOT qualify as Route B.** Per the `docs/Answer_Equivalence_Spec.md` §13.13 distinction
this amendment already turns on, a proof resting on a **deployment fact** is the *weak* leg and is
refused. The specific form to expect here is *"the threshold currently rounds to 0 on D1, so the old
and new rules coincide."* That is true and it is **not sufficient**: **scope is caller-supplied**
(`reads.ts` passes `MVP_NODE_IDS`), it is not recorded on the administration, and the threshold goes
**non-zero at a 9-node scope** — so the fact expires the moment the diagnostic is extended past D1,
which is planned work. Only a proof over the **frozen record population** qualifies. The two legs
are not interchangeable and must not be cited as though they were.

**Why the delegation is safe.** Not because anyone is confident in `7/62`, but because **neither
route can be skipped silently.** §3.4's drift test fails if `DEFAULT_WALK_POLICY` moves away from
the entry registered for the current version, so a re-tune cannot reach production without Route A
or Route B being walked and written down.

### 3.5 The pass rule: a 2-of-3 correct result is a genuine pass, and it DOES test out (settled 2026-07-26)

**Decided by Gabe, 2026-07-26.** A mixed 2-of-3 correct result resolves `passed`, seeds
`placement_estimate` **2**, and therefore **clears the `>= 2` test-out unlock bar** exactly as a
robust pass does. It is not a lesser pass with a lesser downstream consequence.

**Why this is a decision about the docs and not about the code.** Nothing in production branches on
placement 3 versus placement 2. Every consumer asks `>= 2` — `UNLOCK_PLACEMENT_ESTIMATE` in
`apps/web/src/city/citySession.ts`, `UNLOCK_PLACEMENT_THRESHOLD` in the diagnostic runner, and §1.3
of `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`. The only code that treats 3 specially is
a test pinning `placementFor`'s mapping (`engines/diagnostic/src/walk-scale.test.ts`), which pins
the seed function rather than consuming the distinction. So 3-versus-2 is a **cosmetic seed grade**,
and pass/fail is the only boundary with behaviour behind it.

**What a clean 2/2 still buys, and it is not test-out.** `robust` drives two things: the top city
seed of 3, and — via `infers` — the licence to credit the node's unmeasured prerequisite **closure**
(INV-DIAG-8, §3.2). A 2-of-3 pass credits *itself* and tests out of *its own* lesson; it credits
nothing else. That distinction is about **downward inference**, not about test-out, and §3.2 keeps
it intact: a borderline pass never credits the closure at any size.

**This is what unblocks ratifying §3.1 and §3.2 as written.** The question behind box (a) was
whether proportionate confirmation would let a shakily-passed node skip its lesson. It does, and
that is intended — it was already the shipped behaviour and is now the recorded one. The comments
and test names that said otherwise (`adjudicator.ts` header and its `itemCount >= 3` branch,
`adjudicator.test.ts`) were the wrong half and are corrected alongside this decision.

### 3.6 INV-DIAG-6 clause (i): a wording correction, not a behaviour change (settled 2026-07-26)

§3.3 lists INV-DIAG-6 as preserved, and its **design intent — uncertainty resolves downward, pruned
and unresolved nodes are never credited — is honoured in full and unchanged.** What no longer
describes the instrument is its *ratified wording*. This is a **text problem only**.

**Ratified text (v2 §3.3):**

> **INV-DIAG-6 (fail-closed placement).** No node is credited `passed` without either (i) a
> confirmed measured pass, or (ii) a robust-pass-triggered inference from a measured dependent
> (INV-DIAG-8). Pruned nodes are always placed **not-ready** (never passed). Uncertainty always
> resolves downward.

Clause **(ii)** cross-references INV-DIAG-8, so it tracks §3.2 automatically. Clause **(i)** carries
no such reference and says **confirmed** — which a single-item pass on an inconsequential node is
not. Read literally, clause (i) now forbids a resolution the amended instrument produces.

**The corrected clause (i) is folded into v2 §3.3** and is not restated here, for the reason given
in §3.1. Everything else in INV-DIAG-6 stands verbatim. No threshold moves and no code changes: the
amendment that would have genuinely weakened fail-closed is the terminal rule, and it was declined
(§5) and stays declined.

---

## 4. Consequences elsewhere

- **Item pool depth (§8) is unchanged at ≥3 per served cell.** `MAX_PROBE_ITEMS` remains 3: a
  confirmed node still resolves within three items. The amendment reduces the *average* draw, never
  the maximum.
- **`walk-scale.test.ts` budgets re-derived**, and now pin **items as well as nodes**. The
  product-graph 50-seed sweep **tightens from 48 nodes to 38**, and the same sweep costs 56 items
  where it cost 132. Quoting nodes alone is how a 48-node figure came to be read as an
  instrument-length bound when at 2.34 items/node it meant ~112 items. The uniform-cut sweep moved
  40 → 41 nodes and 60 → 62 items when the ceiling went to 70: at 60 its worst case was being
  clipped by the ceiling, so the earlier figures were not that sweep's true cost.
- **No student-facing change today.** The live instrument is D1-only and is bit-identical.

---

## 5. The INV-DIAG-6 terminal rule — CONSIDERED, MEASURED, DECLINED (2026-07-25)

Recorded so a future reader wanting a shorter instrument finds the analysis instead of redoing it.
**INV-DIAG-6 keeps its ratified text.**

**What was proposed.** On hitting the ceiling, a node still unresolved would be credited
`passed (inferred, terminal)` when it had in-scope prerequisites and **every one of them** resolved
`passed` — the walk having established the whole foundation beneath it and found no failure in its
prerequisite cone. Anything blocked by a failed or pruned prerequisite would have stayed not-ready.

**What it was worth,** measured on the 62-node graph (n = 6,000, mild noise), truth accuracy with
the ceiling swept:

| ceiling | with terminal rule | fail-closed (shipped) | delta |
|---|---|---|---|
| 30 | 91.4% | 83.2% | **+8.2** |
| 35 | 92.6% | 86.3% | +6.3 |
| 40 | 93.4% | 88.8% | +4.6 |
| 45 | 94.0% | 90.9% | +3.1 |
| 50 | 94.5% | 92.6% | +1.9 |
| 60 | 95.2% | 94.8% | +0.4 |
| **70 (shipped)** | 95.6% | **95.6%** | **0.0** |
| none | 95.7% | 95.7% | 0.0 |

**Why it was declined.** At a 60-item ceiling it is worth **0.4 accuracy points**, which does not
justify weakening a ratified fail-closed invariant. It also extrapolates **upward** — a verified
foundation suggesting what sits on it — where the ratified test-out precedent infers **downward**
from a prerequisite edge, so it was never fully licensed by that precedent.

**And at the ceiling actually shipped it is worth nothing at all.** The rule's entire value is
repairing truncation damage, and §6 repairs the same damage by not truncating: at a ceiling of 70
the terminal rule changes accuracy by **0.0 points**. Raising the ceiling was chosen over
reinstating the rule precisely because it fixes the same cohort **without touching INV-DIAG-6** —
the same outcome for a smaller governance cost.

**When to revisit.** The value is entirely a function of how tight the ceiling is. At an
ALEKS-comparable 30 items it is worth 8.2 points, and it is what makes a short instrument viable at
all: §8 of the measurement note records the ratified policy with a naive 30-item cap at **72.9%**,
against **91.4%** for this policy with the terminal rule. **If a materially shorter instrument is
ever wanted, reopen this before concluding a short diagnostic cannot place accurately.**

## 6. Why the ceiling is 70, and who pays for a tighter one

A ceiling's cost never shows up in the aggregate, because the aggregate averages over a population
most of which never reaches it. It has to be read on the truncated cohort alone. Both tables below
are measured identically, on the 62-node scope at n = 6,000 with mild noise.

**At the ceiling originally proposed:**

| at a ceiling of 60 | hits ceiling | truth accuracy | nodes left `unknown` | mastered nodes told to rebuild |
|---|---|---|---|---|
| **Ceiling-hitting students** | **15.2%** of all | **87.8%** | 3.9 | **7.5** (3.6 purely from truncation) |
| Everyone else | — | 96.1% | 0 | 2.0 |

That slice sat **8.3 points below** the rest of the population and **below the ~90% floor this work
was held to**, and was told to rebuild **3.75× as many already-mastered skills** — on evidence that
was cut off rather than adverse. Fail-closed is the correct default; applying it to a sixth of all
students was not.

**At the ceiling shipped:**

| at a ceiling of 70 | hits ceiling | truth accuracy | nodes left `unknown` | mastered nodes told to rebuild |
|---|---|---|---|---|
| **Ceiling-hitting students** | **1.7%** of all | **85.8%** | 3.4 | **8.8** (3.3 purely from truncation) |
| Everyone else | — | 95.7% | 0 | 2.3 |

**Ceiling swept, on the cohort rather than the average:**

| ceiling | % hitting it | their accuracy | their mastered-nodes-told-to-rebuild | aggregate accuracy | max items |
|---|---|---|---|---|---|
| 50 | 31.3% | 83.5% | 10.1 | 92.6% | 50 |
| 55 | 23.3% | 85.4% | 9.0 | 93.9% | 55 |
| 60 | 15.2% | 87.8% | 7.5 | 94.8% | 60 |
| **70 (shipped)** | **1.7%** | 85.8% | 8.8 | **95.6%** | 70 |
| 80 | 0.2% | 89.5% | 6.5 | 95.6% | 80 |

**70 shrinks the truncated cohort ninefold (15.2% → 1.7%) and raises aggregate accuracy to 95.6%,
for ten items on a tail almost nobody reaches** — median, p90 and p99 are unchanged for everyone who
does not hit it, and the 35–40 target is unaffected either way.

Read the two cohort tables honestly: a student who is *still* truncated at 70 is **not** better off
than one truncated at 60 — 85.8% against 87.8%, 8.8 mastered skills sent back to rebuild against
7.5. If anything they are marginally worse off, because the students who still exhaust 70 items are
the hardest cases, the ones the 60-item cohort's easier members were diluting. **What changes is how
many students are in that position at all**, from roughly one in seven to roughly one in sixty. The
win is nine-tenths of that cohort never being truncated, not a better experience for those who
still are.

**This is also why §5's terminal rule stayed declined.** Both fixes target the same damage; at a
ceiling of 70 the terminal rule is worth 0.0 accuracy points, so raising the ceiling achieves the
same outcome **without touching a ratified invariant**. Cheaper in governance for an identical
result.

## 7. Approval checklist (ratification gate)

- [x] **(a)** INV-DIAG-7 and INV-DIAG-8 become proportionate rather than absolute (§3.1, §3.2).
      This is the change that buys the length reduction. — **RATIFIED by Gabe, 2026-07-26**, on the
      pass rule settled in §3.5 (a 2-of-3 pass is genuine and does test out). §3.1 and §3.2 are
      ratified **as written**; §3.6 restates INV-DIAG-6 clause (i) to match, with no behaviour
      change.
- [x] **(b)** Truth accuracy falling 97.9% → 95.6% is an acceptable price for 82 → 38 items. —
      **RATIFIED by Gabe, 2026-07-26.** Ticked as a consequence of (a), not as a separate judgment:
      those four figures are §1's before/after row for *this* amendment, so they are exactly what
      the mechanism (a) ratifies costs and buys at the ceiling (c) already fixed. Ratifying (a) and
      (c) while refusing (b) would be incoherent — there is no third option in which the
      proportionate rule ships and the price does not. This box is the price tag, and the price is
      already paid: §3.1/§3.2 have been the operative invariant text since (a) closed, and the live
      D1 instrument is bit-identical either way.
- [x] **(c)** The instrument ceiling is **70**, chosen on the cohort evidence in §6 — **decided by
      Gabe, 2026-07-25**, over the 60 originally proposed.
- [x] **(d)** The confirmation threshold of `7/62` is a policy constant tuned on a simulation, and
      the team is comfortable with it being re-tuned by measurement rather than re-ratified. —
      **RATIFIED by Gabe, 2026-07-26 — CONDITIONALLY.** Re-tuning by measurement **is** delegated
      and does **not** require re-ratifying this amendment, **provided the mechanism §3.4 installed
      is honoured.** The conditions are written out as normative text in **§3.4.1** rather than left
      as an aside in this box: a re-tune must take **Route A** — bump `scoring_model_version`,
      register the new value in the version-keyed frozen-literal registry beside the outgoing entry,
      **and record which existing pre/post pairs that makes `not_comparable` under INV-DIAG-5** — or
      **Route B**, carry its own written additivity proof over the **frozen record population**, to
      the standard PR #101 met and explicitly *not* on the weak deployment-fact leg that
      `Answer_Equivalence_Spec` §13.13 refuses. A re-tune satisfying neither is not delegated and
      returns to this gate. **Ticked on its own merits, not as a consequence of (a):** (a) ratified
      the *shape* of the rule (confirmation scaled to a defined share of the scope) and said nothing
      about who may move the number, so this box was answered separately. What makes the delegation
      safe is not confidence in `7/62` but that neither route can be taken silently — §3.4's drift
      test fails if `DEFAULT_WALK_POLICY` moves away from the registered entry. The question is also
      about to stop being hypothetical: the threshold rounds to 0 on D1 but goes **non-zero at a
      9-node scope**, and extending the diagnostic past D1 is the next planned work — which is
      precisely why the conditions are recorded now rather than improvised then.
- [x] **(e)** INV-DIAG-6 terminal rule — **DECLINED by Gabe, 2026-07-25** (§5). Fail-closed keeps
      its ratified **rule**; §3.6 corrects clause (i)'s *wording* only, which is not what (e) was
      about.

This doc is **RATIFIED** as of 2026-07-26, by Gabe as diagnostic-lane owner. **All five boxes are
closed** and §3.4 is settled, so the condition §7 set for the fold is met and **the fold into
`Contracts_Amendment_Adaptive_Diagnostic_v2.md` was performed the same day** — the amended
INV-DIAG-6/7/8 text now lives in v2 §3.3 and the amended per-node adjudication in v2 §4.3, and **v2
is the single normative source for the shipped policy from here on**. Closing (d) changed nothing
about the instrument: it is a governance question about how `7/62` may be re-tuned in future rather
than about what it is today, and §3.4.1 records the conditions that delegation carries.

**Two things this ratification does not close, kept visible on purpose.** Neither blocks the fold.

1. **Anthony's agreement to the production mastery-service completion trigger** for tested-out nodes
   (`docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §6(b)/§7, recorded outstanding in
   PR #106) is **still owed**. It is implementation work rather than a ratification gate, and it is
   the one item genuinely owed by another owner.
2. **§8 (the full-scope opening probe) and §9.2 (the validator's MST-rollback cells)** record
   measured findings and route a judgment to Gabe; neither is decided by this ratification and
   neither ships anything today.

> **Correction to the ceiling rates above (2026-07-26).** Every "% hitting it" figure in §6 was
> measured from `ceiling_reached`, which at the time was set whenever the item budget was exhausted
> — *including* when the walk had resolved its last unknown node on that same final item. Those
> students finished; they were not truncated. The flag now additionally requires an unresolved node,
> and re-measured identically (62-node scope, n = 6,000, mild noise) the shipped row reads
> **1.5% genuinely truncated against 1.7% that merely spent the budget**. The 0.2-point difference
> is the whole over-count, so §6's argument is unaffected, but the cohort tables were computed over
> the old, slightly wider cohort and their per-cohort figures shift by that margin. Not restated
> here, because they have not been re-measured.

---

## 8. The full-scope opening probe — MEASURED, not changed (2026-07-26)

v2 §4.2 step 1 says the opening probe "eases in near the foundations." At the 62-node scope it does
not: **the first item a student sees is `FUN.6`** — depth 0, zero in-scope prerequisites, zero
in-scope dependents. It is an isolated node, so whatever the student answers, the walk learns
nothing about any other node. **D1 is unaffected and opens on `NUM.2`**, so this is not a live
defect; it becomes one the moment the diagnostic is extended past D1, which is the next planned
work.

**Mechanism.** With no evidence anywhere, the per-domain stage takes the domain with the most
unknown nodes — D6 with 11 — and `frontierTarget` returns `ENTRY_DEPTH = 1`; `nearestToTarget` then
picks the D6 node closest to depth 1, which is `FUN.6`. Nothing in that chain asks whether the
chosen node is informative. The foundation stage that would have handled it is disabled
(`foundationDomainSpan = Number.POSITIVE_INFINITY`), a decision made on aggregate item cost with no
consideration of what the first item should be.

**Measured** on `sim/policy-sweep.sim.test.ts` ("opening probe"), 62-node scope, n = 6,000, mild
noise, pooled profiles, paired seeds — the same harness and cohort as §1 and §6:

| 62-node full scope | opens on | items med / p90 / p99 | truth accuracy | truncated |
|---|---|---|---|---|
| **as-is (shipped)** | **`FUN.6`** (depth 0, 0 prereqs, 0 dependents) | **38** / 62 / 70 | **95.6%** | **1.5%** |
| foundation span ≥ 4 | `NUM.2` (depth 1, 2 prereqs, 50 dependents) | 39 / 67 / 70 | 94.6% | 4.9% |
| foundation span ≥ 5 | `NUM.2` | 39 / 66 / 70 | 94.8% | 2.8% |
| foundation span ≥ 6 | `NUM.2` | 39 / 63 / 70 | 95.1% | 1.0% |
| foundation span ≥ 9 | `NUM.2` | 39 / 63 / 70 | 95.1% | 1.0% |
| reach-first opening | `NUM.4` (depth 2, 4 prereqs, 49 dependents) | 39 / 62 / 69 | 95.6% | 0.4% |

"Reach-first opening" substitutes only the FIRST probe, for the node with the largest in-scope
prereq + dependent span (ties to the shallower node, then id) — the same span metric
`nearestToTarget` already uses as a tie-break, applied with every node still unknown. It needs no
new policy knob, which is why it was measured this way rather than implemented.

**What the measurement says.**

1. **Re-enabling the foundation stage is still dominated**, at every span tried. It costs an item at
   the median and 0.5–1.0 points of truth accuracy, reproducing the result that disabled it. It does
   fix the first impression, but it is the expensive way to do it.
2. **Reach-first costs nothing on aggregate.** Identical median items and identical truth accuracy
   to the shipped policy, a point better at p99, and it shrinks the truncated cohort from 1.5% to
   0.4% — opening at the taproot buys inference early, and inference is what keeps the walk short.
   So the aggregate case for changing is *neutral-to-slightly-positive*, not compelling.
3. **It is therefore a UX judgment, not an accuracy one.** The instrument as shipped measures just
   as well opening on `FUN.6`. What is wrong is what a student is shown first: an isolated
   trigonometry-adjacent node, in a product whose first promise is that it eases in at the
   foundations. That is a question about the promise in §4.2 and about first impressions, and it is
   Gabe's call, not one the numbers settle.

**Not shipped, deliberately, and one thing to weigh if it is.** Reach-first is **not scope-local**:
on the D1 scope it also picks `NUM.4` (over the shipped `NUM.2`), which changes the **live**
instrument — median 7 items → 5, truth accuracy 98.0% → 98.6%. Better on both counts in simulation,
but it is a change to the shipped D1 walk, which has so far been held bit-identical through every
policy change, and it should be decided as such rather than ridden in on a full-scope fix. A
scope-conditional opening rule would avoid that, at the cost of a policy that behaves differently on
the two scopes for no principled reason.

---

## 9. Item requirements for the diagnostic — DECIDED, no code change (2026-07-26)

### 9.1 Diagnostic items do not need difficulty tags

**Decided by Gabe, 2026-07-26.** The walk is **difficulty-blind**. `selectNextProbe` chooses a
*node*, never a difficulty; `adjudicate` counts correctness and never reads difficulty (its own
header says so); and every item the instrument serves today is **L2**, as v2 §4.4 already records
("the walk is difficulty-agnostic — one routing tier per node until the L1/L3 pools land"). An
author writing items for the diagnostic therefore does **not** owe an L1/L2/L3 spread per node.

**This does NOT apply to practice items.** In the mastery lane difficulty is load-bearing: the
5-item set is a locked 1×L1 / 2×L2 / 2×L3 mix, and `docs/Mastery_Scoring_Spec.md` §3 derives the
whole rigor argument from that composition ("four of the five items are harder"). Its authoring
requirement — at least two L2-or-higher and at least one L3 per node — stands unchanged. The
decision above is scoped to the **diagnostic instrument only**.

### 9.2 ⚠ Before acting on §9.1: the validator's difficulty cells are the MST rollback path

**No validator code was changed, deliberately, and this is the reason.**
`packages/item-bank/src/validate.ts:229-236` derives its required coverage cells as
`{node_id}:L{difficulty}` **from `createD1MultistageSpec()`** — the *retired multistage
instrument*, not the walk:

```ts
// 4. Coverage: each assessment form must supply every cell the multistage spec serves.
const spec = createD1MultistageSpec();
```

So the L1/L2/L3 cells the validator demands are not the walk's requirement at all; they are the
MST's, and they are what keeps forms A and B able to serve the MST. The MST composition is still
registered for rollback — `createAuroraDiagnosticServer` is retained beside the walk server
precisely so the v2 flip can be reversed (v2 §"Step 7", `services/diagnostic-api/env.ts`).

**Dropping those cells would forfeit the MST rollback path.** That may well be the right call once
the walk has soaked, but it is a rollback decision, not a tidy-up, and **Gabe must make it
consciously.** §9.1 records what the *walk* needs; it does not license editing the validator.

### 9.3 The real diagnostic item bank is deferred

**Decided by Gabe, 2026-07-26.** Building out the full-scope diagnostic item bank waits until more
lesson material exists. Authors should read this as: **the 62-node instrument has no item bank to
write against yet, and is not blocked on one.** The live instrument is D1-only and fully served
(`D1_WALK_ITEM_PACK`); §8 above is measurement on a simulated full scope, not an authored one.

What this defers is only the *content*. The pool-depth requirement of v2 §8 (≥ 3 items per served
cell, unchanged by this amendment — see §4) applies when the bank is authored, and the §8 opening-
probe defect becomes live at the same moment. See `docs/Content_Authoring_Split.md` §4.4 for the
authoring queue this sits behind.
