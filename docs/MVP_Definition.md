# MVP Definition (the single "what ships" reference)

*One place that captures the entire MVP. It synthesizes what is otherwise spread across the PRD, the specs, and the registry. Where a detail has a deeper home, this doc points to it, but the scope summary here is complete. If this and the registry/PRD ever disagree, THOSE win (this is a synthesis, not a new source of truth).*

**One-line MVP:** a credible foundational-readiness game, DEPTH-FIRST on one domain (D1, Real Numbers & Arithmetic), the full diagnose to learn to practice to checkpoint loop over the 6 D1 skills, with a working pre/post measurement pipeline. Framed as tier 1 of the larger calculus-readiness product.

*Why depth-first: mentors advised depth over shallow breadth. One fully-realized neighborhood is a stronger demo and a cleaner build than 9 thin ones. So the MVP narrows everything (diagnostic, city, lessons, measurement) to D1, built out deep, rather than spreading thin across all 9 domains. The other 9 domains/neighborhoods are post-MVP. Days 13-24 pull from a ranked backlog toward the full product stretch ceiling — 62 in-product nodes across 10 domains as of 2026-07-25, per the registry (§8); only the MVP scope narrowed.*

---

## 1. What ships (in scope)

**The playable loop, end to end, all scoped to D1 (Real Numbers & Arithmetic):**
- **Diagnostic / pretest** over the **6 D1 nodes only** (short, anxiety-sensitive; the pretest doubles as placement, no separate placement instrument). Only the D1 neighborhood is built and assessed at MVP; the other 8 neighborhoods show as locked/roadmap, never a dead-end "coming soon."
- **City:** the D1 neighborhood built out richly, with the other 8 neighborhoods visible but locked. Each of the 6 nodes is one building; placement seeds a blueprint ghost per building (a preview + fast lane), never a pre-built building. *(⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26** (Evan ack'd; Anthony did not), folded into `docs/Contracts.md` §1.1: a **passed** placement (`>= 2`, measured or graph-inferred) now DOES pre-build — unlocks + completes the building without the lesson; only failed nodes (0/1) show as an un-built ghost/lot. See `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.)*
- **Lessons:** the 6 D1 nodes, delivered as **6 per-node lessons** — **1 node = 1 lesson = 1 building** (related lessons reuse ~3 interaction archetypes for build savings; see §3). Each: mini-lesson, check-for-understanding, ~5-item practice set, scaffolded hints, reveal, error-typed feedback. A high `placement_estimate` lets a student skip the teaching and enter at the practice; the building is still earned by that practice (see §4).
- **Mastery** confirmed per node by the one rule: 4 of 5 on the practice set (see §4).
- **Storm = neighborhood checkpoint** (climactic game moment; sets `neighborhood_checkpoint_cleared` once all D1 nodes are mastered; never masters nodes itself).
- **Rich game layer for D1:** because the MVP goes deep on one domain, the D1 game is rich, not cosmetic-only. Different question/answer types (per the `answer_type` taxonomy in Answer_Equivalence_Spec) render as visually distinct BUILDING types (numeric-answer, multiple-choice, constructed-response, etc.), and mastering different item types yields different RESOURCES used to build and customize the city. This makes the city-builder deep for the one MVP domain (see §3 note).
- **Measurement pipeline:** immutable pre/post records, server-recomputed correctness, an auditable aggregate gain scoped to D1 (see §5).

**The 6 MVP nodes (all of Domain D1, dependency-closed, verified in CI):**
D1: NUM.S, NUM.F, NUM.2, NUM.3, NUM.4, NUM.5.
*(Depth-first on D1: the MVP is the single Real Numbers & Arithmetic neighborhood, fully built. Closure holds within D1: NUM.4 depends on NUM.2/NUM.3, and NUM.S/NUM.F are foundational. The invariant test keeps this honest, MVP count = 6. Source of truth: `packages/skill-graph/src/skill_graph.json`, nodes with `product_scope: "mvp"`.)*

---

## 2. What does NOT ship (deferred, by design, not omission)
- **The other 9 domains / 56 product-`target` nodes** (the MVP is D1 only; the rest are ranked post-MVP work per Post_MVP_Backlog). *(Read "8 domains / 42 nodes … the separate 9 `extended` CORE nodes are outside the 48-node product readiness target" until the 2026-07-24 coverage expansion (PR #50) promoted all 9 `extended` nodes into target and added the Geometry domain; the `extended` population is now empty, so no CORE node sits outside the readiness target. Count per `packages/skill-graph/src/skill_graph.json`.)*
- **"Attacks = Calculus I" endgame** (roadmap vision, see §8a): once a student's city of prerequisites is built, actual Calc I concepts (limits, derivatives, integrals) arrive as ATTACKS the student defends against. Documented only, no MVP build.
- Adaptive/branching placement (the fixed pretest is the placement source in MVP).
- Decay / spaced review (mastery is monotonic in v1; `review_due` is post-MVP).
- **Error typing entirely** (misconception vocabulary, distractor/item tagging, error-typed feedback, and routing/re-weighting) — deferred post-MVP as of 2026-07-20 (granular lessons + adaptive-diagnostic descent already localize failures). The optional `misconception_tag` log field stays defined so it needs no schema change later. See Error_Typing_Spec.
- Mobile QR work-upload, cosmetic economy depth, full-graph diagnostic, efficacy cohort study. *(The cosmetic economy is a ratified post-MVP amendment — Contracts §8 / `Contracts_Amendment_Cosmetic_Economy.md`, Days 13-24 expansion; it is one-way and purely cosmetic, so it never affects mastery, completion, placement, or storm access, and does not touch MVP scope.)*
- Deferred answer-checker categories (general equation equivalence, log/trig identities, etc., per Answer_Equivalence_Spec).

---

## 3. Nodes, lessons, and archetypes (the count that confuses people)
- **6 MVP nodes** = 6 measurable D1 skills (each tested + mastered independently).
- **6 per-node lessons** = **1 node = 1 lesson = 1 building** (all 1:1). Finishing a node's lesson builds exactly that node's building; a lesson never spans or builds multiple nodes.
- **~3 interaction archetypes** = reusable lesson-interaction *templates* shared across nodes with the same instructional core (e.g. the three expression-manipulation nodes NUM.2 / NUM.3 / NUM.4 reuse one template). Archetypes save *build effort* (build the template once, feed it each node's content); they are **invisible to the student** and are NOT a grouping the learner experiences.
- Archetype reuse saves build effort and shared UI; it does NOT reduce content — each of the 6 nodes still needs its own items, tags, mastery outcome, lesson, and building.
- Authoritative mapping: the registry's node→archetype field (`lesson_shell` today; rename to `lesson_archetype` tracked as a code migration). Reuse reasoning: Lesson_Cluster_Sketch.md. *(This resolves the former "provisional shell consolidation" review — the outcome is per-node lessons with archetype-level build reuse; see §7.)*
- **Game-depth note:** the D1 game layer is rich. Question/answer types map to distinct building types and yield distinct resources (see §1), so the one MVP domain is a deep city-builder.

---

## 4. How mastery works in the MVP (summary; full rule in Mastery_Scoring_Spec)
- A node is **mastered** at **4 of 5** correct on its practice set (set = 1 easy + 2 medium + 2 hard, so rigor is built into the composition).
- Hints count as correct; a full reveal counts as not-correct (retry a fresh item).
- Mastery is 0 to 3 (2 = mastered, 3 = "gold" at 5/5, cosmetic), monotonic (never drops), and written by ONE mastery service.
- Error/misconception tags never affect mastery (and error typing is deferred post-MVP regardless; see §2).
- **Placement routes the entry, not the outcome:** a high `placement_estimate` lets a student skip a node's teaching and start at the 5-item practice; mastery is still earned only by that practice (4 of 5). Placement never sets mastery and never completes a building — nothing is pre-built. *(⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26** (Evan ack'd; Anthony did not), folded into `docs/Contracts.md` §1.1 — build-without-lesson: for a **passed** node (`placement_estimate >= 2`, measured or inferred) the building is now unlocked + completed on placement **without** the lesson/practice. The diagnostic still writes only `placement_estimate`; the mastery lane completes on the passed placement. Only failed/unresolved nodes (0/1) still earn it by practice. See `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.)*

---

## 5. The measurement claim (summary; full rule in Assessment_Scoring_Spec)
- Fixed parallel forms (A/B), pre and post, un-hinted, over the 6 D1 nodes (~12 items/administration at 2/node).
- Correctness recomputed server-side from immutable records; client grade is UX-only.
- Reported as an **aggregate** D1 gain, never per-node (too noisy).
- **Scoped honestly:** the claim is a foundational arithmetic-fluency gain on Domain D1. A 6-node instrument is small, so the claim is deliberately narrow and stated as such, not a full-graph readiness claim.
- **Ship requirement:** the pipeline can reproducibly compute a blueprint-matched pre/post score difference from versioned test records. NOT a psychometric-validity claim, that is deferred.
- **This parallel-form in-house gain IS the success metric** (founder decision; Assessment_Scoring_Spec §7a). We BUILD the pipeline that a controlled study needs (treatment/control assignment, immutable records, parallel forms, clean export); we do NOT run the study, the control-vs-treatment comparison happens after handoff. Any gain we report pre-handoff is an uncontrolled within-instrument pre/post (honest with n/means/attrition), not proven efficacy. Control group required for the efficacy claim; external instruments + downstream outcomes are optional future evidence.

---

## 6. Readiness definition (scoped)
- **Foundational ready** = all 6 D1 MVP nodes mastered. (This is the MVP's claim: D1 arithmetic-fluency foundation.)
- **Product ready** = all in-product nodes mastered (post-MVP) — 62 as of 2026-07-25; the population is `product_scope` ∈ {`mvp`, `target`} in the registry, not a hard-coded number.
- Readiness is scope-tagged (`isReady(student, scope)`), never a single global flag.

---

## 7. Gates before content authoring scales (from Before_Authoring_Checklist)
1. **D1 answer-checker candidate passes Node + Chromium; team review remains before lock.** Do not author beyond the fixture-cleared categories.
2. **Team edge-verification** (Week 1): confirm the prerequisite edges are real.
3. **DONE:** product scaffold reads the registry directly and graph invariants run in CI. Add item-bank invariants as authored content lands.
4. **DONE (resolved 2026-07-21):** the lesson-grouping review resolved to **per-node lessons** (1 node = 1 lesson = 1 building); build reuse is captured by interaction archetypes, not by teaching multiple nodes in one lesson. No further shell-consolidation review is pending.

---

## 8. Timeline milestones (from PRD §15)
**MVP is DONE by Day 12. Days 13 to 24 pull from the ranked backlog toward the full product ceiling (62 in-product nodes as of 2026-07-25, per the registry).** The pace is unchanged, but the MVP content is now just the 6 D1 node-lessons (≈3 interaction archetypes), so the MVP is LESS content than the old 18-node plan. That slack goes into DEPTH on D1 (rich building types, resources, deeper city mechanics), not breadth. Day 24 ships a coherent product at the breadth the team has fully validated; the full 62-node target is the stretch ceiling, not a flat commitment.
- **Day 2:** skeleton stood up, frozen interfaces, skill-graph wired, three lanes building against stubs. (Much of this scaffold already exists.)
- **Day 5:** core loop closed end to end, diagnostic places, one lesson completes a building, storm clears the D1 neighborhood, mastery + measurement pipeline writing records.
- **Day 9:** all 6 D1 per-node lessons built (all 6 D1 nodes remediable; reusing ~3 interaction archetypes), rich D1 game layer (building types + resources), pre/post pipeline reproducibly computing a blueprint-matched D1 aggregate score difference on test input.
- **Day 12: MVP COMPLETE**, polished depth-first D1 foundational-readiness game, demoable.
- **Days 13 to 20:** expand to the other 9 domains toward the full product target (remaining 56 `target` nodes + their per-node lessons, reusing ~45 interaction archetypes), pulling from the ranked backlog.
- **Days 21 to 23:** polish, integration hardening, usability passes on the full build.
- **Day 24:** coherent ship at achieved breadth, demo, and handoff (see `Post_MVP_Backlog.md` ship states).

---

## 8a. Roadmap vision (documented only, NOT MVP): "Attacks = Calculus I"
Endgame arc beyond "prerequisites mastered." Once a student's city (their prerequisite skills) is built, actual Calculus I concepts (limits, derivatives, integrals) arrive as **attacks** on the city that the student defends against using the skills they have built. This extends the product past prerequisite readiness into calculus itself. Roadmap/future scope only, no MVP build; captured here so the endgame vision is not lost.

---

## Where each piece is authoritative
| Topic | Authoritative source |
|---|---|
| The nodes, edges, scope, lesson mapping (6 MVP D1 nodes; 62 in-product as of 2026-07-25 — the registry is the count, not this table) | `skill_graph.json` (registry) |
| Product scope + vision + timeline | PRD_Full.md |
| Data model + interfaces | Contracts.md |
| Mastery rule | Mastery_Scoring_Spec.md |
| Pre/post metric | Assessment_Scoring_Spec.md |
| Single-answer correctness | Answer_Equivalence_Spec.md (v0.8) |
| Error typing | Error_Typing_Spec.md |
| What's deferred + build order | Post_MVP_Backlog.md |
| Pre-authoring gates | Before_Authoring_Checklist.md |
