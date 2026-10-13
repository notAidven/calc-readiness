# Mastery-Scoring Spec (v1)

*The single deterministic rule for how a node becomes mastered. This resolves the three conflicting definitions the reviews flagged (node-level L2+L3, lesson-level 4/5, skip-route 3/3) into ONE mechanism. Every item author, the grading module, the mastery service, and the building-completion UI build against this doc. Locked before authoring. No exceptions, no per-surface variants.*

*(Term: a **node** is one measurable prerequisite skill, the atomic unit tested/taught/mastered, e.g. `RAT.1` = "simplify rational expressions." Mastery is always per node. 56 CORE nodes total; the depth-first D1 MVP contains 6. Full definitions in PRD §1.5.)*

---

## 0. The one-sentence rule

**A node is mastered when the student answers at least 80% (4 of 5) of that node's practice set correctly, where the set is built to span a difficulty mix by construction.** Hints count as correct. A revealed answer counts as not correct (retry a fresh instance). Mastery starts at 0, is confirmed only through practice/evidence, and never decreases.

That is the whole rule. Everything below is the precise definition of each term so two people implementing different surfaces get the same answer.

---

## 1. Why accuracy, not difficulty-tier gating (the resolved fork)

We considered gating mastery on clearing a hard (difficulty-3) item unaided. **Rejected, deliberately.** Reason: it is not *interpretable*. A student who answers everything right but sees no building completion (because one item was "not hard enough" or was hinted) experiences the system as broken and punitive, which is the exact failure mode for an anxious learner, the person this product exists for. A rigorous rule the UI cannot cleanly explain is not a finished rule.

**Accuracy across a difficulty-balanced set gives us rigor AND legibility:**
- Rigor comes from *set composition*, not a gate. Because every node's practice set contains harder items by construction (see §3), scoring 4/5 means the student handled hard items in the normal course, without a separate opaque hurdle.
- Legibility comes from the rule a student already understands: "get most of them right and the building finishes."

So difficulty tags do real work; their job is to shape *what is on the test*, not to be a second hidden pass condition. This is the same model Anthony's lesson design already implements, so it also removes the two-mechanisms collision (lesson practice bar vs. a separate node rule).

---

## 2. Definitions

**Practice set:** the fixed pool of scored items presented for a node during a lesson's practice phase. Default size **5** (see §3 for composition and §7 for edge sizes).

**Attempt:** one submitted response to one item instance.

**Correct (for mastery purposes):** the authoritative server-recomputed correctness of the response (see §6), subject to the hint/reveal rules in §4. `client_correct` from the client grader drives instant UX only and is never the mastery input.

**Mastery score:** an integer 0 to 3 stored per (student, node). Meaning:
- **0** = not yet demonstrated (default; placement never sets this above 0). *(⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26** (Evan ack'd; Anthony did not), folded into `docs/Contracts.md` §1.1: the **diagnostic** still never sets mastery above 0, but a **passed** placement (`>= 2`) is a completion trigger the mastery lane honors — so a tested-out node reaches mastered without the lesson. See `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.)*
- **1** = engaged, below bar (attempted the set, scored under 80%).
- **2** = mastered (scored >= 80% / 4-of-5 on the set).
- **3** = mastered with margin (scored 100% / 5-of-5 on the set, hints allowed).

**Mastered** = mastery score >= 2. Building completion and neighborhood/storm clearing key off "mastered," i.e. the 2 threshold. The 3 exists only as a non-gating "gold" distinction for cosmetic/celebration purposes; nothing is locked behind a 3. (This preserves interpretability: 4/5 finishes the building; 5/5 makes it shine.)

**Placement estimate (`placement_estimate`):** the diagnostic-set, immutable seed used to render the initial city (the blueprint ghost) and to route each node's lesson entry point (a high placement lets a student skip teaching and start at the "prove it" practice). Distinct field, never equals mastery, never written by lessons/storms, never touched by the posttest. See Contracts. *(⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26** (Evan ack'd; Anthony did not), folded into `docs/Contracts.md` §1.1: a **passed** placement (`>= 2`, measured or graph-inferred) now unlocks + completes the node's building **without the lesson** — build-without-lesson / test-out. Placement stays a distinct field the diagnostic never writes as mastery; the mastery lane honors a passed placement as a completion trigger. Failed nodes (0/1) still route into the lesson. See `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.)*

---

## 3. Set composition (where rigor lives)

The default practice set of 5 items follows the locked ~1:2:1 difficulty mix, rounded for a 5-item set:
- **1x L1** (single-step, clean numbers)
- **2x L2** (multi-step or one complication)
- **2x L3** (multi-step + a twist)  *(the "harder half" is the majority, so 4/5 cannot be reached by clearing only easy items)*

**Consequence that gives us rigor for free:** the set is 1x L1 + 2x L2 + 2x L3, so **four of the five items are harder (L2/L3)**. To hit 4/5 a student must therefore get at least three of those four harder items right (missing at most one item total). To hit 5/5 they must clear every hard item. So "handles hard problems" is enforced by the *composition*, without a separate gate the UI has to explain. This is the design substitute for the rejected "clean L2 + clean L3" rule, and it does the same job legibly.

**Authoring requirement:** every node's practice set MUST contain at least two items tagged L2-or-higher and at least one L3. An author cannot ship a node whose set is all-L1; the closure/invariant test (see §9) rejects it.

---

## 4. Hints, reveals, and attempts (the edge cases the reviews said were undefined)

**Hints (scaffolded, do not show the answer):** a hinted-then-correct response **counts as correct** for mastery. Rationale: this is a learning tool, not a credential; retrieval with support is legitimate learning, and the set's difficulty mix already carries the rigor. Making hints reduce credit reintroduces exactly the "why is my score 3.5/5 when I got them all right" opacity we rejected in §1. So hints are free of mastery penalty by design.
- Hints ARE logged (`hints_used` per response) for the inheritor's later difficulty calibration. Logged, not scored.

**Reveal (student exhausts hints and the full worked answer is shown):** the revealed item **counts as not correct** for that attempt, because the student did not produce the answer. It is intuitive to the student ("I looked at the answer, so that one doesn't count"). To recover the credit, the student answers a **fresh instance** of an item at the same node and difficulty (drawn from the bank or a parameterized template). The revealed instance is retired for that student's current set-scoring.
- A node cannot reach mastered on a set where a revealed item is left unresolved; the fresh-instance retry must be answered.

**Attempts / retries on a non-revealed item:** a wrong answer that the student then corrects on a later fresh instance counts by its **final resolved state on a fresh instance**, same as reveal-recovery. Within a single item instance we do not do best-of-N; correctness is the state of the fresh instance that closes it. (Practically: get it wrong, you get another number-swapped instance; the instance you close is what counts.)

**Set scoring is on distinct item slots, not attempts.** The 5 slots each resolve to correct/not-correct by the rules above; mastery = count(correct slots) / 5.

---

## 5. One mastery service, many evidence sources (no per-surface writers)

Per the review's best architectural catch, mastery is written in exactly ONE place. **Lessons** (and post-MVP confirmation sets) do not write mastery directly; they **submit evidence**. The **storm does not submit evidence at all** (see Storm rule below); it is checkpoint-only.

```
submitAssessmentEvidence({
  student_id,        // from auth, not payload
  context,           // "lesson" | "diagnostic-practice"  (NOT storm: storm does not submit mastery evidence, see below)
  node_id,
  responses[],       // raw answers + item/version refs, per §6
  evidence_id        // idempotency key
})
```

The mastery service:
1. Recomputes correctness server-side from raw responses + versioned key/equivalence-checker (§6).
2. Applies the §2/§3/§4 rules to compute the set score for the node.
3. Updates mastery **monotonically**: `mastery_new = max(mastery_existing, mastery_evidenced)`. Nothing lowers mastery in v1 (no decay). A weaker later showing never demotes a node.
4. Updates only the nodes the evidence actually assessed. (Evidence comes from lessons/confirmation sets only; the storm is not an evidence source, per the Storm rule below.)
5. Records the `evidence_id`; a duplicate submission is a no-op (idempotent).

**Storm (MVP rule, simplified):** the storm does NOT master nodes. Node mastery is established only by lesson practice sets (and, post-MVP, standalone confirmation sets). The storm is a mixed-retention game moment that controls exactly ONE thing: `neighborhood_checkpoint_cleared`, a cosmetic/progression flag. It can only be attempted, and only clears, once all the neighborhood's required nodes are already mastered (>= 2). So the storm never independently masters an unfinished node. *(⚠ Corrected 2026-07-26, was "mastered (>= 2) **through lessons**". The gate has always been the mastery value itself, never the route to it — and under the test-out amendment a tested-out learner reaches mastery **through the practice with no lesson at all**, so naming lessons in the gate was wrong. `isNeighborhoodReady` (`engines/game/src/neighborhood.ts`) keys on `mastery >= 2` and is **correct as written** — a tested-out learner is not blocked from the storm, they are simply not finished yet, because test-out skips the lesson and not the practice. See `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §8.2 for the progression model.)* *(The post-MVP cosmetic economy does not change this: earned resources and cosmetics are one-way and purely cosmetic — they never affect mastery or storm/checkpoint eligibility, which remains a pure function of mastery. See Contracts §8.)*

*Why this rule and not "storm as partial evidence":* mastery is a per-node 5-item-set computation (§2). A storm covering a 6-node neighborhood would need ~30 scored responses to master all six independently, which is not a short climactic battle, and combining partial storm slots with prior lesson slots across contexts is undefined and error-prone. Making the storm a checkpoint-only gate keeps the game moment fun without turning every storm into a second full assessment. (This supersedes the earlier "partial evidence source" framing.) The storm therefore does NOT call `submitAssessmentEvidence`; it reads mastery and sets the checkpoint flag.

**Diagnostic:** writes `placement_estimate` only. It never calls `submitAssessmentEvidence` for mastery; mastery starts at 0 regardless of how high a student places. Placing high seeds a taller blueprint ghost and may route the node's lesson straight to the "prove it" practice (skipping teaching); it never pre-completes the building — mastery is earned only by that practice. *(⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26** (Evan ack'd; Anthony did not), folded into `docs/Contracts.md` §1.1 — build-without-lesson: for a **passed** node (`placement_estimate >= 2`, measured or inferred) the building is now unlocked + completed on placement **without** the lesson/practice. The diagnostic engine still writes only `placement_estimate` and never calls `submitAssessmentEvidence` (mastery firewall intact); instead the mastery/city lane treats a passed placement as a completion trigger — production persistence still flows through this one mastery service, dev/in-memory simulates it. Only failed/unresolved nodes (0/1) still earn the building through practice. **The tested-out building completes at `mastery` 0 — zero stars: test-out skips the lesson, never the stars, which are still earned by practising the already-built skill** (settled 2026-07-26; see that amendment's §8.1/§8.2, and note the storm gate in §5 below is unaffected). See `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.)*

---

## 6. Authoritative correctness (client grades for UX, server recomputes for the metric)

- The client grades instantly for responsive UX and drives the in-lesson feel. This value is `client_correct` and is **non-authoritative**.
- Every response is appended to the raw-response log with the raw answer, `item_id` + `item_version`, `template_id` + params (if generated), `form` + version, `answer_key_version`, `equivalence_checker_version`, `context`, `attempt`, `hints_used`, `time_on_item`, server timestamp, `response_id`.
- The mastery service and the marketed metric recompute correctness from the raw answer against the versioned key/equivalence-checker **server-side**. This is the authoritative correctness used for mastery and for pre/post gain.
- Log is append-only (the Lambda is the only DB writer and only ever INSERTs — never UPDATE/DELETE; `student_id` from the verified Cognito token, not the payload).

This is "both, not either": client grade for instant feel, server recompute for the auditable number.

---

## 7. Set-size edge cases

- **Default set = 5** (composition per §3).
- If a node's validated bank cannot yet fill a 5-item set at the required mix, the node is **not authoring-complete** and does not ship as masterable. It may appear as a preview building only. (Better to show fewer real buildings than a building that completes on a thin set.)
- **Pre/post assessment items are a separate, fixed parallel-form pool** and are NOT drawn from the practice set. Practice mastery and the pre/post metric are different instruments (see Contracts / metric spec). Do not let a practice item double as a pre/post item.

---

## 8. What this rule does NOT do (scope guard)

- It does not gate anything behind a difficulty-3-unaided hurdle (rejected, §1).
- It does not implement decay or demotion (monotonic in v1; `review_due` is a non-punitive post-MVP nudge).
- It does not make the diagnostic confer mastery (placement only).
- It does not do per-node gain claims (the metric reports aggregate; node mastery is for progression/routing, per triage #14/#15).
- It does not read misconception/error tags. Error typing (Error_Typing_Spec) drives feedback and, as a stretch, what a student practices next; it is NEVER an input to the 4/5 mastery computation. A node is mastered on accuracy alone, regardless of which misconceptions appeared along the way.

---

## 9. Invariants the automated test must enforce (so authoring at speed stays safe)

1. Every masterable node has a practice set of >= 5 validated items.
2. Every practice set contains >= 2 items tagged L2+ and >= 1 tagged L3 (rigor-by-composition, §3).
3. No practice item shares an ID with a pre/post form item (§7).
4. Mastery thresholds are the single constants (0/1/2/3 with 80% and 100% cuts) referenced everywhere, not re-hardcoded per surface.
5. The mastery service is the only writer of the `mastery` field; grep-level check that no engine writes `mastery` directly.
6. Every logged response carries all version fields in §6.

These join the graph-closure invariants (valid edges, no cycles, in-set transitive closure) in the same CI check.

---

## 10. UI contract (rule + representation ship together)

Because §1's whole point is legibility, the completion UI is part of this spec, not an afterthought, and it is cross-owner (Anthony's lesson UI, Evan's building visual):
- The building's progress reflects **set accuracy** ("4 of 5 correct, building complete"), a representation the student already understands. Minimum viable: show the count.
- A revealed item visibly shows "this one needs a fresh try to count," so a not-yet-complete set is never mysterious.
- 5/5 triggers the "gold" building state (non-gating celebration).

That is the minimum the MVP must render so the rule is never opaque. Richer framing (advisor NPC naming difficulty, hint-tradeoff prompts) is optional polish, not required.

---

## Locked decisions captured here
- Mastery = accuracy on a difficulty-balanced 5-item set; 4/5 = mastered (2), 5/5 = gold (3). *(Gabe, this session.)*
- Hints count as correct. *(Gabe.)*
- Reveal = not correct for that attempt; recover via a fresh instance. *(Gabe.)*
- Difficulty tags drive set composition + diagnostic branching, not the mastery gate. *(Resolves the two-definitions collision; aligns with Anthony's lesson model.)*
- One mastery service, evidence-based (lessons/confirmation sets only), monotonic. Storm is checkpoint-only, never masters a node. *(Review triage #10/#11 + later review: storm-as-evidence dropped for the checkpoint-only rule.)*
- Client grades for UX, server recomputes for the metric. *(Review triage #5, adopted.)*
