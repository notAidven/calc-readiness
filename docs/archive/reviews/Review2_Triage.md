> **HISTORICAL. NOT AN IMPLEMENTATION SOURCE.** This is a triage of a prior external review, kept for decision context only. Some specifics (e.g. 16-node counts) were superseded. Do not extract rules from this file.

# Second Review Triage

*The strongest review yet. Verdict: mostly correct, catches real structural cracks. Sorted: CONFIRMED (fix), ADOPT (judgment, agree), CONTESTABLE (partly right/overstated), and the honest scope reckoning. It caught a genuine closure error of mine.*

---

## CONFIRMED: factual/logical, must fix

**1. MVP is 18 nodes, not 16: closure error confirmed.** The edge doc says `NUM.2 → NUM.4` and `NUM.3 → NUM.4`. My last closure check used a hand-typed prereq map where NUM.4 had no prereqs, so I checked against wrong data and wrongly declared closure. Re-run with the real edges: **NUM.2 (order of operations) and NUM.3 (field properties) are missing prerequisites of NUM.4.** Fix: add them → **18-node MVP**, OR explicitly fold their content into NUM.4/LIN.1/POL.1 as embedded refreshers and qualify the language to "instructionally self-contained," not "dependency-closed." *(This is the 3rd count/closure error of this type: the fix is the automated closure test below, run in CI, so a hand map never gates it again.)*

**2. PRD contradicts Contracts on who writes mastery.** Contracts says diagnostic writes `diagnostic_estimate`, never `mastery`, mastery starts at 0. But PRD §8 still says "diagnostic writes mastery once," §9.1 says the diagnostic engine "writes mastery once," and the Week-1 timeline says "writes per-node mastery." **Direct contradiction across the two authoritative docs.** Fix: make Contracts authoritative, update every stale PRD reference. This is a must-fix-before-code.

**3. Lesson count still says 15.** Week 3: "all 15 done" → should be 18 (was 16, now 18 after #1).

**4. The posttest overwrites the pretest in the state model.** `diagnostic_estimate` is one mutable field; a post administration overwrites the pre. The raw log keeps answers but the state loses the concept of distinct administrations, and the city could visually *shrink* after the posttest if noise drops the estimate. Fix: immutable `assessment_administration` + `assessment_node_score` records (the metric computes from these), and a separate `placement_estimate` for onboarding visuals that the posttest never touches.

**5. Client `correct` can't be authoritative for a marketed metric.** We store a client-provided `correct`. Fix: rename to `client_correct` (or drop it); the **authoritative scorer recomputes correctness from the raw answer + versioned key/equivalence-checker server-side**. Plus enforce append-only via Supabase RLS (client can INSERT, not UPDATE/DELETE; `student_id` from auth not payload; server timestamps; idempotency key). This refines the client-grade decision: grade on client for *instant UX*, recompute server-side for the *auditable metric*. Both, not either.

**6. Metric versioning gaps.** Add `scoring_engine_version`, `assessment_blueprint_version`, `mastery_rule_version`, immutable item/key snapshot, server-issued `assessment_session_id`, `response_id`/idempotency key. For symbolic math the *equivalence-checker* version matters, not just the answer-key version. Adopt.

**7. Delete "measurement error cancels in pre-minus-post."** Overstated (I wrote it). It cancels only on average under assumptions; form differences, guessing, regression-to-mean, differential attrition don't auto-cancel. Fix the wording in PRD + Architecture + Contracts.

**8. `source_of_last_change` is meaningless at row level** (a posttest updating `diagnostic_estimate` sets it to `diagnostic` even though a lesson last changed mastery). Fix: field-specific timestamps (`mastery_updated_at`, etc.) or lean on the evidence table.

**9. Mastery monotonicity undefined.** Can a storm/lesson/posttest *lower* mastery? Fix: `mastery_new = max(existing, evidenced)` (no decay in the current model). Define it.

---

## ADOPT: judgment, agree

**10. The storm should NOT be an exception mastery-writer: one mastery service, many evidence sources.** This is the review's best architectural catch. Instead of `confirmMasteryViaStorm(nodeIds, results)` (which makes the game supply the nodes AND the results AND the write), have lessons and storms both `submitAssessmentEvidence({context, responses})`, and ONE mastery service recomputes correctness, applies the rules, updates only nodes the evidence actually supports, idempotently, recording the evidence ID. **No storm exception; one writer, several evidence sources.** Cleaner than my carve-out, and it fixes the "game is a mastery writer with a wrapper" leak. Adopt.

**11. Storm bulk-confirmation is invalid under all-nodes mastery.** Clearing a storm can't confirm a node the storm never assessed. Adopt **Option 3**: storm confirms only *directly assessed* nodes; the neighborhood *clears* only when all its required nodes are already mastered. So the storm is a checkpoint + partial evidence source, not a bulk stamp.

**12. `mastery=2` + `lesson_stage=not-started` inconsistency.** Since storms/evidence can raise mastery without a lesson, lesson_stage and mastery can contradict. Fix: derive building completion from mastery (+ a `completion_status` the mastery service sets), not from lesson_stage alone. Adopt.

**13. Placement mode ≠ pre/post outcome mode.** Placement may branch/stop early; the pre/post assessment must be **fixed parallel forms, same blueprint** (or branching creates a comparability confound: a "improved" student gets different items). Adopt: two modes, one instrument family. This is important and we hadn't separated them.

**14. Don't claim node-level gain; report aggregate.** ~2 items/node is too noisy for per-node gain claims (one guess swings 0→3). Report overall + domain-level assessment score for the metric; keep node estimates for *routing* but labeled as estimates. Adopt.

**15. Dual metrics, not conflated:** (a) assessment outcome = pre/post parallel-form score; (b) product progression = % foundational nodes with confirmed mastery. Adopt: cleaner than one blurred "mastery gain."

**16. Rename metric to "foundational assessment gain,"** not "prerequisite mastery gain." Adopt (ties to #14).

**17. Drop the "protects the gain size" rationale for the field split.** Near-zero gain for a ceiling student is *correct*, not a flaw. Justify the split as "two different constructs," not "protects the marketed number." Adopt: this was sloppy reasoning on my part.

**18. Mastery-scoring + answer-equivalence specs CANNOT be deferred.** The review is right and this overrides what I told you last turn ("team-blockers first, your spec later"). Those rules determine what items get authored, how many, what storms contain, what the checker returns, when buildings complete, what "ready" means. **They're a shared semantic contract even though one person writes them. Lock Day 1, before freezing contracts.** Adopt: I was wrong to defer this.

**19. Automate the closure test** (+ the other graph invariants: valid edges, no cycles, transitive closure in-set, reachability, item-family variant prereqs, lesson-assumed-ops covered, storm blueprint only confirms assessed nodes). Adopt: and it's the fix for my repeated hand-check errors.

**20. Basic usability testing ≠ efficacy cohort.** "No cohort" doesn't mean "no user testing." Need a few users to test diagnostic fatigue, whether the placed-high/zero-confirmed-mastery state confuses, storm feel, math input, foundational-vs-full clarity. Adopt: cheap, catches demo-killers.

**21. Front-of-PRD still overpromises.** North star + user story say "prepared for Calculus I, point to the city as proof," but MVP is foundational readiness. Align the opening to "builds and measures foundational prerequisite readiness." Adopt.

**22. Diagnostic length unresolved / assess only the 16→18 actionable nodes.** MVP diagnostic should test the built nodes, not all 40; remaining nodes are roadmap, untested. Define hard cap + expected time. Adopt.

**23. 4 items/node is too thin.** 4 = exactly 2 pre + 2 post, no inventory for invalidation/retakes/storm/confirmation/exposure. Either grow the bank or keep diagnostic/lesson/storm pools strictly separate. Adopt: grow the bank for MVP nodes.

---

## CONTESTABLE: partly right / a judgment you've already made

**24. Timed storms "unvalidated persona contradiction."** You already decided this deliberately: timed *game battle* ≠ timed *test*, and the game wrapper is the point. The review concedes "that may be true" but wants it tested. Fair to *test* it in usability (#20), but it's not a blocker and your call stands. **Keep timed; validate in user testing rather than pre-emptively neuter it.** (Don't over-adopt the reviewer's caution here: you made this call for a reason.)

**25. Scope: "choose two of {16-node breadth, rigor, rich game}."** Correct in spirit (scope is too big), and it aligns with cutting decay/economy/infinite-practice/branching, which we largely did. But its Configuration B (drop to 8 nodes) conflicts with your locked "foundational readiness needs the closed set." **Adopt Configuration A** (keep the ~18 nodes, thin the *product* richness): that's the one that preserves the readiness claim. The 8-node version guts the thing the project is about.

---

## The scope reckoning (the review's real headline)
Both reviews now agree: **the MVP is only feasible as a demo-quality standardized-content system, not the fully-described shippable product.** The honest move is to formally adopt **Configuration A**: 18-node fixed placement/pre/post + one reusable lesson shell + 18 content packs + one numeric/expression answer system + basic city + one reusable storm/checkpoint + Supabase + aggregate pre/post report. **Cut: branching, decay, economy, infinite practice, bespoke per-lesson interactives, per-neighborhood unique mechanics, per-building custom NPC flows, full 40-node diagnostic, mobile, advanced graph manipulation.**

## Priority order before Day 1 freeze
1. **Make Contracts authoritative; fix all contradicting PRD sections** (#2). Blocks coding.
2. **Lock mastery-scoring + answer-equivalence specs** (#18). Blocks authoring: no longer deferrable.
3. **Resolve NUM.2/NUM.3 → 18 nodes or documented fold-in** (#1); automate the closure test (#19).
4. **Rework the metric + storage:** immutable assessment administrations, aggregate (not node) gain, fixed parallel forms for pre/post, server-recomputed correctness, rename to "foundational assessment gain," delete the "error cancels" line (#4,5,6,7,13,14,15,16).
5. **One mastery service, evidence-based; storm confirms only assessed nodes; derive completion from mastery** (#10,11,12).
6. **Adopt Configuration A scope; align the PRD opening to foundational readiness** (#21,25).
7. **State-model cleanups:** monotonicity, field-timestamps, grow item bank, RLS enforcement (#8,9,23,5).
8. Plan light usability testing (#20).

## Where the review is NOT a blocker (don't over-correct)
- Timed storm (#24): your call, validate later.
- The 8-node Config B: rejected in favor of Config A.
- Everything else is genuinely worth doing.