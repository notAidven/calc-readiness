> **HISTORICAL. NOT AN IMPLEMENTATION SOURCE.** This is a triage of a prior external review, kept for decision context only. Some specifics (e.g. 16-node counts) were superseded. Do not extract rules from this file.

# Review Triage: what to act on before Day 1

*Sorting the external review into: CONFIRMED (real, fix it), JUDGMENT (agree, adopt), CONTESTABLE (partly right / overstated), and VERIFY (a factual claim to check). The review is strong; most of it holds. Flagged honestly where it overreaches.*

---

## CONFIRMED: factual, fix immediately

**1. MVP set is 14 nodes, not 15.** Verified: 2+2+1+2+1+2+1+1+2 = 14. Every "~15" reference (lesson schedule, item budget, metrics) is off by one. **Decision:** either add a 15th (the review suggests FUN.2: reasonable, it's the next Functions node and D6 is the pivotal hub) or change all refs to 14. *Recommend adding FUN.2*: it makes D6 slightly less thin at MVP, which was already a flagged weak spot.

**2. Dependency-closure of the MVP set is NOT verified, despite the label.** The review is right that we *called* it dependency-closed without a machine check, and it names real suspects: FUN.1 may need NUM.4 (not in MVP); EL.1 compound-interest may need NUM.5 (not in MVP). **Decision:** run an actual closure check on the 14 (soon 15) against the edge map before locking. This is a Day-1 task, and it may pull 1–2 more nodes into MVP (NUM.4 especially looks required).

---

## CONFIRMED: real contradictions, must resolve

**3. The MVP can't reach its own "readiness" definition.** Readiness = all 40 nodes mastered, but MVP only teaches ~14. A student who fails a non-built node is told "coming soon" with no path. **This is the deepest issue and the review is exactly right.** Fix: introduce tiered readiness: **foundational readiness** (the built set) vs. **full calculus readiness** (all 40). MVP claims only foundational-readiness improvement. This cascades into the metric, the storms, and the marketing claim.

**4. Storm ownership contradicts the architecture.** Storm is described as a mastery *assessment that clears nodes*, but it lives in the game, and the game is read-only on mastery. Genuine contradiction. Fix (pick one): storm is **purely visual** (lessons establish mastery; storm just reflects it), OR the storm calls a shared assessment service allowed to write. *Recommend purely visual for MVP*: simplest, keeps the read-only rule clean, and the lessons already establish mastery.

**5. Storm meaning is undefined at MVP.** All 9 neighborhoods have storms, but most nodes per neighborhood have no lesson, so "clear storm = all neighborhood nodes mastered" can't be honest. Fix: a **foundation storm** = "the built foundational nodes in this neighborhood are cleared." Full-domain storm is post-MVP. Ties to #3.

**6. Mastery has three incompatible definitions.** Node mastery (L2+L3), lesson mastery (4/5), skip route (3/3): and the edge cases are undefined (4 correct but missed the L3? full reveal used? correct on 2nd attempt?). The review is right that this needs ONE deterministic spec. **This is the highest-priority pre-authoring task**: you can't author items or build grading against three conflicting rules. Write a single mastery-scoring spec covering difficulty, attempts, hints, reveals, placement, storms, review.

---

## JUDGMENT: agree, adopt for MVP

**7. Storms untimed by default.** Correct and important: a timed high-stakes event directly recreates Maya's test anxiety. Timer becomes optional-challenge/animation, not readiness-gating. Adopt.

**8. Decay: keep mastery permanent, add `review_due` instead.** Right: visible decay tells an anxious learner their work is being taken away, and it's ambiguous whether it revokes mastery. Cut visible decay from MVP; use a non-punitive `review_due` state. Adopt.

**9. Rename "AI NPC tutor" → "scripted advisor / adaptive hint tutor."** Correct: we have no runtime LLM, so calling it an AI tutor over-promises free-form dialogue. Pure naming fix, adopt.

**10. Don't diagnose gaps the MVP can't remediate (or frame as preview).** Right: a journey that ends in "coming soon" gaps feels broken. Either hide unserviceable nodes or frame them explicitly as an informational preview, not a playable objective. Adopt (ties to #3).

**11. City economy is undefined.** Correct gap: resources are mentioned but never defined (what they buy, why run shifts post-mastery). Fix: either a minimal cosmetic economy (materials → customize city, never affects mastery/learning) or cut resources from MVP. *Recommend cosmetic-only or cut*: don't let it become learning-blocking overhead.

**12. Define the full mastery + answer-grading spec BEFORE authoring.** Correct sequencing: authoring against undefined grading rules produces inconsistent items. Adopt as a Day 1–2 gate.

**13. Testing must start Day 7–10, not Day 23.** Correct: you can't recruit + pretest + expose + posttest starting Day 23. Move usability tests to Day 7–10, second round 17–20, Day 23 consolidates. Adopt.

**14. Continuous QA, not Day-23 QA + Week-1 smoke test.** Right: incorrect items and integration bugs must be caught continuously; an automated end-to-end smoke test from Week 1 protects the seam. Adopt.

**15. First lesson should use a non-graph skill.** Correct: putting the graphing widget on the Day-7 critical path is needless risk. Build the first lesson on something like signed-number arithmetic. Adopt (small timeline reorder).

**16. "15 lessons" only works as content packs in one reusable engine, not 15 bespoke experiences.** This was always the intent but the PRD didn't say it forcefully. Make it explicit: one lesson engine, node-specific content packs. Adopt.

---

## CONTESTABLE: partly right, or overstated

**17. "Client grading weakens the marketed metric."** *Partly right, and it walks back something we deliberately decided.* We chose client grading precisely because the threat model is empty (self-directed tool, no payoff to cheating). The review's fix: compute correctness *later* from the recorded raw answer + versioned answer key: is actually elegant and cheap, and it's compatible with client-side grading (grade on client for instant UX; recompute server-side from the log for the auditable metric). **Adopt the review's version: it's better than pure client-trust and doesn't require cloud grading in the hot path.** This refines, not reverses, our decision.

**18. Timeline / content workload understated.** *Correct in direction, possibly overstated in magnitude.* The review's "160 diagnostic items + 250 total interactions" assumes 4 items/node authored fresh: but templates (parameterized) and the fact that MVP is ~14 nodes, not 40, cut this a lot. Still, the core point stands: content is the bottleneck and Gabe is overloaded. **Adopt the concern; the number is high-end.** MVP diagnostic bank is ~14 nodes × 4 = ~56 items, not 160 (160 is the full 40-node target, which is post-MVP).

**19. State object needs more fields.** *Mostly right, some over-engineering.* Genuinely missing and worth adding: `diagnostic_estimate` separate from confirmed `mastery` (the review's best catch here: placement ≠ confirmed mastery, and conflating them is a real bug), `review_due_at`, `content_version`/item-version on logged responses (needed to interpret history after fixing an item), and an **append-only attempt table** instead of item-IDs-in-node-state. `storm_status`, `source_of_last_change` are nice-to-have. **Adopt the core (diagnostic_estimate, versioning, attempt table); treat the rest as optional.**

**20. Content/form versioning missing.** *Correct, adopt.* Every logged response should carry item+version, template+params, form+version, answer-key version, graph version, app version. Cheap now, essential for interpreting the pre/post data later. This is a real gap in our logging spec.

**21. Template generation needs automated/property-based validation.** *Correct, and it reinforces "templates post-MVP."* "Validate once" is insufficient: parameter combos create div-by-zero, degenerate cases, difficulty drift. Since templates are already post-MVP, this is a post-MVP requirement, not a Day-1 one.

---

## DEPENDENCY-CLOSURE CHECK (ran it: review was right)
The MVP set was NOT dependency-closed. Machine check found two required prereqs missing:
- **NUM.4** (evaluate/simplify expressions): needed by 7 MVP nodes (EXP.1, RAD.1, TRG.1, POL.1, CG.1, LIN.1, FUN.1). The most-depended-on node, and it was missing. Glaring.
- **NUM.5** (proportions): needed by TRG.2 and LF.1.
**Fix: add NUM.4 and NUM.5 → MVP is now 16 nodes** (was mislabeled 15, actually 14, now correctly closed at 16). This supersedes the "add FUN.2 for depth" idea: FUN.2 is optional; NUM.4/NUM.5 are *required for closure*. Building without NUM.4 would test skills whose prerequisite is never taught.
Final MVP-16: NUM.S, NUM.F, **NUM.4**, **NUM.5**, EXP.1, RAD.1, LIN.1, POL.1, POL.2, RAT.1, CG.1, FUN.1, LF.1, EL.1, TRG.1, TRG.2.

## DECISIONS MADE (this pass)
- **A. Reframe:** honest foundational-readiness *measurement*, ambitious "tier 1 of calculus readiness" *framing*. Adopted.
- **B. Storm: keep TIMED + climactic, and let it WRITE/unlock mastery.** Overrode the review's "untimed/visual" fix. Rationale: "Maya is anxious about timed *tests*" does not transfer to a *game boss battle*: timed game tension is fun, not threatening; that's the whole point of the game wrapper. And letting the storm be a legitimate assessment that writes mastery resolves the architecture contradiction the other way: the contract rule becomes "**game may write mastery ONLY via the storm-battle assessment**" (a deliberate carve-out, not a violation).
- **C. City economy: cosmetic, Evan's discretion.** Adopted.
- **D. Rename AI-tutor→scripted advisor; first lesson non-graph; one engine + content packs; continuous QA + Week-1 smoke test.** Adopted.
- **Testing (#13): review MISREAD the context: REJECTED.** There is no cohort during development; the team builds and hands off, someone else tests later. So "can't start a cohort on Day 23" is moot. The only ship requirement is that the **measurement pipeline works** (diagnostic can administer a pre and a post; raw log captures both; a valid gain number is computable on test input). Day-23 deliverable changes from "run a cohort" to "verify the pre/post pipeline produces a valid gain on test data": a self-test, not a study.
- **Metric reframe (knock-on):** deliverable is "the system that *can* measure improvement, demonstrated on test input," NOT "we measured X% in a cohort." The efficacy study is the inheritor's, using the data pipeline built here.

## The review's headline recommendation
> Either build a credible **foundational-readiness game** in 24 days, or a broad calculus-readiness prototype that can't fulfill its promise. The PRD currently claims the second while resourced for the first.

**This is correct and it's the single most important strategic point.** Everything in #3/#5/#10 flows from it. The honest move: **explicitly reframe the MVP as a foundational-readiness product**: 9 neighborhoods visible, but the built/claimed scope is the foundational set, with full readiness as the documented growth path. That makes every downstream claim honest and resolves the "coming soon" dead-end.

## What I'd bring to the meeting (priority order)
1. **Reframe to foundational readiness** (#3, #5, #10, headline): the strategic decision everything hangs on.
2. **Write the single mastery + answer-grading spec** (#6, #12): the pre-authoring blocker.
3. **Fix the 14-vs-15 + run dependency-closure** (#1, #2): may pull NUM.4 into MVP.
4. **Storm = visual, untimed** (#4, #5, #7): resolves the ownership contradiction + the anxiety conflict.
5. **Cut decay/economy/QR/infinite-practice from committed MVP** (#8, #11): scope honesty.
6. **Move testing to Day 7–10, add versioning to the log + diagnostic_estimate field** (#13, #19, #20).