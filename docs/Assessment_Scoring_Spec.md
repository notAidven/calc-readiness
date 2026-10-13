# Assessment-Scoring Spec (v1)

*The authoritative spec for the pre/post assessment and the marketed "foundational assessment gain" number. This is a DIFFERENT system from mastery scoring, and the two must never blur: mastery scoring (Mastery_Scoring_Spec) governs in-game building completion and progression; THIS governs the fixed pre/post instrument that produces the outcome metric. They share the answer-checker (Answer_Equivalence_Spec) and the immutable record tables (Contracts §2), and nothing else. No em dashes.*

*(Term: a **node** is one measurable prerequisite skill, e.g. `RAT.1`; the blueprint below assesses the 6 MVP nodes, all of Domain D1, since the MVP is depth-first on D1. Full definitions in PRD §1.5.)*

**Why separate:** mastery is confirmed adaptively, through play, monotonically, with hints allowed. The assessment metric must be the opposite: fixed, un-hinted, parallel-form, immutable, and comparable pre-to-post. Reusing mastery scoring for the metric would inflate the gain (hints, retries, monotonic max) and destroy comparability.

---

## 1. What this instrument is, and is not

**Is:** a fixed-blueprint test administered twice (pre, then post), producing an aggregate score each time, whose difference is the reported gain.

**Is not:** the in-game mastery signal. Assessment and mastery are different uses of items (Contracts §1 to §3).

**MVP onboarding: the pretest IS the placement source (no separate placement instrument).** To avoid a redundant double-onboarding wall (a separate placement plus the pretest) that would recreate exactly the anxiety Maya rejects, the MVP uses ONE onboarding instrument: the fixed pretest (Form A or B) is administered, its aggregate score is the pre-score, AND its per-node results seed `placement_estimate` for the initial city (which seeds the blueprint ghost and routes each node's lesson entry point — a high placement lets the student skip teaching and start at the "prove it" practice; placement is never mastery and never pre-builds a building *(⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26**, folded into `docs/Contracts.md` §1.1: a **passed** placement (`>= 2`, measured or graph-inferred) DOES pre-build — unlocks + completes the building without the lesson, at **mastery 0**, so the practice still earns every star; only failed/unresolved nodes (0/1) still require the lesson. The diagnostic still writes only `placement_estimate`; the city/mastery lane completes on the passed placement. Normative: `docs/Contracts.md` §1.1; rationale: `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`)*). At MVP this is a short instrument (the 6 D1 nodes, ~12 items). Flow: `pretest form -> foundational D1 score + placement_estimate -> initial city`. A separate adaptive/branching placement instrument is DEFERRED post-MVP (we lack the time and the evidence to justify two onboarding instruments in v1). The posttest is the other parallel form, administered at the end.

**The claim it supports:** "measured pre/post change on foundational D1 (Real Numbers & Arithmetic) prerequisite skills, on this instrument." NOT a psychometric-validity claim, NOT a calculus-grade prediction. A 6-node instrument is small, so the claim is deliberately scoped to D1 arithmetic fluency and stated as such. Validity is a later empirical argument, not asserted at ship (see §10).

---

## 2. Blueprint (what is on the test)

- **Scope:** the 6 MVP D1 nodes (all of Domain D1, Real Numbers & Arithmetic, the built set). Not the full graph, the other 9 domains are roadmap and untested at MVP.
- **Items per node:** 2 scored items per node per administration (one L2, one L3, from the locked difficulty scale). So one administration = ~12 scored items. This is deliberately thin per node, which is exactly why the metric is reported in aggregate, never per-node (§5).
- **Domain coverage:** Domain D1 only at MVP (the 6 nodes are all D1). The other 9 domains build post-MVP; the blueprint expands then.
- **Small-instrument caveat:** a 6-node / ~12-item instrument is small, so the gain claim is scoped to D1 foundational arithmetic fluency, stated honestly, not a broad readiness claim.
- **Blueprint is versioned** (`blueprint_version`, Contracts §2). Pre and post MUST use the same blueprint version. A blueprint change invalidates cross-version pre/post comparison.

---

## 3. Forms and counterbalancing (how pre and post stay comparable)

> **Superseded in part (adaptive-diagnostic amendment, ratified 2026-07-20).** The "two fixed parallel forms, neither adaptive or branching" rule below is replaced by a multistage adaptive test on a fixed adaptive blueprint + shared `scoring_model_version`. Parallel *item pools* and counterbalancing are retained (a student still never sees an identical item pre and post). See `docs/Contracts_Amendment_Adaptive_Diagnostic.md` and Contracts §2.

- **Two fixed parallel forms, Form A and Form B**, built to the same blueprint: same node coverage, same difficulty mix, matched item structure, different surface numbers/context. Neither is adaptive or branching. (In the MVP there is no separate adaptive placement instrument at all, see §1: the pretest form IS the placement source, so the `purpose=placement` administration type is unused in v1 and reserved for a post-MVP adaptive placement.)
- **Assignment:** a student gets one form at pre and the OTHER at post (A-then-B or B-then-A). This removes item-memorization inflation (the student never sees the identical item twice).
- **Counterbalancing:** assign the pre-form (A or B) in alternating/random order across students, so any residual A-vs-B difficulty difference does not correlate with pre-vs-post and bias the aggregate gain in one direction.
- **Forms are frozen with immutable item versions** (Contracts §2). Editing an item mints a new item version; a form in use is a fixed snapshot.

---

## 4. Administration rules

- Each sitting creates one immutable `assessment_administration` (purpose = pre | post) with its form, blueprint, scorer, and checker versions (Contracts §2).
- **Un-hinted, single-attempt, no reveal.** Unlike lessons, the assessment offers no hints and no second try; a hint or reveal would break comparability with mastery-scoring's rules and inflate the score. (Hints/retries live only in lessons.)
- **No feedback during the assessment** beyond "recorded" (right/wrong is not shown mid-test; showing it would let a student infer and adjust, and it changes the construct).
- Every response is appended to the raw-response log (Contracts §6) and scored server-side (§5).

---

## 5. Scoring (how a number comes out)

> **Superseded in part (adaptive-diagnostic amendment, ratified 2026-07-20).** The reported metric is now the difficulty-aware ability frontier `θ ∈ [0,3]` (see the amendment §4.3), NOT "correct items / scorable items as a percent." Per-item binary correctness and the answered-items-only denominator (§6) are retained and feed `θ`; gain is still `θ_post − θ_pre`.

- **Correctness:** authoritative server recomputation via the versioned answer-checker (Answer_Equivalence_Spec). `client_correct` is ignored for the metric.
- **Item score:** 1 if `authoritative_correct`, else 0. No partial credit on the assessment (partial credit is a mastery/lesson concept; the metric stays binary per item for interpretability).
- **Administration score:** report at these grains only:
  - **Overall** = correct items / scorable items, as a percent. (The primary marketed number.)
  - **Optional broad STRAND level** post-MVP, where a strand has enough items to be non-trivial (e.g. arithmetic/algebra, functions, trigonometry). Report a strand only if it aggregates several nodes. At MVP there is one strand only (D1 arithmetic), so the reported number is a single overall D1 aggregate.
  - **NEVER per-node.** At MVP the whole instrument is Domain D1 (6 nodes), so the marketed number is one aggregate D1 gain; a per-node or per-single-domain breakdown at ~2 items/node is exactly the noise we reject. (Post-MVP, as other domains build, use overall + broad strands, never a single-node domain gain.)
- **Gain** = post overall minus pre overall (and per-strand post minus pre where reported). This is the "foundational assessment gain", the objective success metric (see §7a; parallel-form pre/post on our own aligned instrument).
- **Aggregation is over SCORABLE items only** (see §6 for what is scorable), and the pre and post denominators must be reported alongside the gain so a reader can see the base.

---

## 6. Edge cases (the rules that keep the number honest)

**Incomplete administration** (student quits partway): 
- An administration is **valid only if a minimum completion threshold is met** (default: >= 90% of blueprint items answered). Below that, the administration is marked `incomplete` and is EXCLUDED from the gain (it is not scored as if blanks were wrong, which would fabricate a low pre-score and inflate gain).
- A student without BOTH a valid pre and a valid post contributes to neither the paired-gain statistic nor is silently half-counted.

**Invalidated item** (an item later found to be broken/mis-keyed): 
- The item is marked invalid at its `item_version`; it is **dropped from the scorable denominator** for every administration that used it, pre and post symmetrically. Never rescored as wrong.
- Because forms are versioned, invalidating an item is a version event, and the golden-set/regression rules in Answer_Equivalence_Spec §13 apply.

**Scoring error / unsupported expression** (application fault, not the student's, per Answer_Equivalence_Spec §12): 
- That item response is **excluded from the denominator** (scored as neither right nor wrong), and flagged for review. If such faults exceed a threshold in an administration (default > 5% of items), the whole administration is flagged `needs_review` and withheld from the reported metric until resolved. An app bug must never masquerade as a student getting an answer wrong.

**Missing response** (item presented, no answer, within a valid administration): scored 0 (unlike a fault, a genuine non-answer on a completed test is a legitimate wrong, distinct from `invalid_input` which is re-prompted during the test).

**Form-version mismatch** (pre used blueprint v1, post used v2): the pair is **not comparable**; the gain is not computed for that student and the pair is flagged. Cross-version comparison is never silently performed.

---

## 7. What the marketed number may and may not say

**May say:** "On this 6-node D1 (Real Numbers & Arithmetic) foundational instrument, students improved their aggregate arithmetic-fluency score by X percentage points pre to post (n = valid pairs, pre mean, post mean shown)." The instrument is deliberately small and the claim is scoped to D1.

**May not say:** that this predicts calculus success, that it is a validated instrument, that per-node or per-student gains are reliable, or that measurement error "cancels out." (It does not auto-cancel: form differences, guessing, regression to the mean, and differential attrition are real and are disclosed as limitations, per the PRD metric section.)

**Attrition disclosure:** the reported gain is over students with valid pre AND post. If many students have a pre but no post, that attrition must be reported, because the completers can be a biased (more-engaged) subset.

---

## 7a. The success metric + the control group (founder decision)

**The objective metric IS the in-house pre/post gain, administered in parallel form.** Every product needs an objective metric and "teaching to the test" is the universal condition of any test-based measure, so we use our own aligned instrument rather than chasing an external test for the core number.

**A control group is REQUIRED for any efficacy claim, but we do NOT run it, we build the pipeline that makes it possible, and the controlled study is run after we hand off.** This is the key split:
- **What the team builds (in scope):** the measurement pipeline that a controlled study needs, distinct treatment vs. control assignment, immutable per-administration records, parallel pre/post forms, server-recomputed correctness, and a clean per-student export. The product must be *capable* of a controlled comparison out of the box.
- **What the team does NOT do (out of scope):** recruit students, run a live cohort, or execute the controlled study. There is no student cohort during the build; the team builds and hands off (consistent with PRD §11). The actual control-vs-treatment study is the inheritor's, run after we leave.
- **Why the control is non-negotiable for the claim:** a single-group pre/post drifts up ~0.25 to 0.5 SD from retest effects + regression to the mean regardless of learning. So a bare in-house gain is NOT an efficacy claim on its own; it becomes one only when the eventual study compares treatment against a control that absorbs those artifacts. Until that study runs, we report the gain honestly as an uncontrolled within-instrument pre/post (see disclosure below), never as proven efficacy.

**Parallel forms (required, already specced):** the student never sees identical items pre and post, so the gain is not pure re-testing of the same questions. This is the one safeguard that ships in the product itself.

**Honest disclosure to attach to any number WE report** (pre-handoff): it is an uncontrolled, within-instrument pre/post gain on our own aligned test, with n, pre mean, post mean, and attrition. The controlled efficacy claim depends on the post-handoff study. External instruments and downstream Calculus I outcomes remain available as future evidence, not required for the core metric.

---

## 8. Relationship to the other specs (no blur)

| Concern | Owned by |
|---|---|
| Is a single answer correct? | Answer_Equivalence_Spec (shared checker) |
| Did a building/node get mastered in-game? | Mastery_Scoring_Spec (hints ok, monotonic, adaptive) |
| The pre/post outcome number | THIS spec (fixed, un-hinted, parallel-form, aggregate) |
| Record tables + API + write-ownership | Contracts (interface authority) |
| Which 6 D1 MVP nodes | `skill_graph.json` (MVP_Node_List is rationale only) |

The assessment reads the same immutable `assessment_administration` / `assessment_item_response` tables defined in Contracts §2; it does not introduce new storage. It never reads or writes `mastery` or `placement_estimate`.

---

## 9. Pipeline ship requirement (corrected wording)

The MVP ship requirement is NOT "a valid gain." It is:

> The pipeline can **reproducibly compute a blueprint-matched pre/post aggregate score difference from versioned, immutable test records**, correctly excluding incomplete administrations, invalidated items, and application faults per §6.

Demonstrated on test input (synthetic pre/post records), not on a live cohort. "Valid" (the psychometric argument) is explicitly deferred to the inheritor.

---

## 10. Deferred (not MVP)
- Any psychometric validity / IRT calibration (needs response volume the build does not produce).
- Reliability estimates, form-equating beyond structural matching.
- Per-node or per-student gain reporting.
- Predictive-validity against downstream calculus outcomes.
These require the data the append-only log is designed to collect later; they are the inheritor's work, not a ship deliverable.

---

## Status
**Scoring semantics LOCKED (as amended); item blueprint PROVISIONAL.** The edge-case handling (§6) and honest-disclosure rules (§7/§7a) are frozen. The reported-metric mechanic in §5 was amended 2026-07-20 to the adaptive difficulty-aware frontier `θ` (all-hands ratified; `docs/Contracts_Amendment_Adaptive_Diagnostic.md`); the answered-items-only and no-fault-counts-as-wrong rules are unchanged. The blueprint (§2: which item forms, how many per node) remains provisional, pending the capability-spike outcome (Answer_Equivalence v0.8) and the adaptive item-pool depth (amendment §6). Item difficulties are provisional/author-assigned pending post-hoc calibration (§10).
