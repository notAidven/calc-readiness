# Contracts Amendment: Adaptive Diagnostic (RATIFIED 2026-07-20 · SUPERSEDED 2026-07-22)

> **⛔ SUPERSEDED by v2 (RATIFIED 2026-07-22):** `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` replaces this MST + frontier-`θ` design with a **prerequisite-gated adaptive walk over the DAG** scored on **depth-weighted readiness coverage**. This document is retained for history/rationale only. **Note:** the shipped D1 MVP still *runs* this (v1) model in code until v2 reaches parity and the default `scoring_model_version` is flipped (v2 §9 steps 6–8); v1 therefore remains the live instrument, not the authoritative design.

*__Status: RATIFIED / APPROVED at all-hands on 2026-07-20.__ This amendment to `docs/Contracts.md` (v2, authoritative) and `docs/Assessment_Scoring_Spec.md` (v1) has been approved and __folded in__: the single onboarding instrument (the pretest, which also seeds placement) is now a __multistage adaptive test (MST)__ scored on a __difficulty-aware ability frontier__ rather than a fixed parallel form scored on raw percent-correct. Its normative content now lives in `docs/Contracts.md` §2 (the `assessment_administration` `purpose` wording + the additive `routing_path` / `scoring_model_version` fields) and supersedes `docs/Assessment_Scoring_Spec.md` §3/§5 as noted there; __this document remains the rationale/detail record__ (design reasoning, the MST/frontier model, and the approval-blockers checklist, all satisfied at ratification). Owner: Gabe (diagnostic lane). Companion docs: `docs/Contracts.md` §2/§3, `docs/Assessment_Scoring_Spec.md`, `engines/diagnostic`.*

---

## 1. Summary & scope

Today the frozen contract specifies one fixed, parallel-form pretest that doubles as the placement source (Assessment_Scoring_Spec §1) and is scored on raw item accuracy. This amendment replaces the *instrument mechanics* — not the record tables, not the write-mapping, not the mastery firewall — with an adaptive design:

- **One fused instrument.** The pretest remains the only onboarding instrument and still doubles as placement (no separate placement test). This is unchanged and reaffirmed.
- **Multistage adaptive (MST).** The student starts in a mixed-difficulty routing stage and is routed to a harder or easier follow-on stage based on performance (SAT-style multistage, not item-level CAT). Acing the foundational stage routes the student up and lets us *infer* correlated untested subskills instead of exhaustively testing every node.
- **Difficulty-aware frontier scoring.** The reported score is an ability frontier `θ` (how far up the difficulty scale the student demonstrated competence), NOT raw percent-correct. This is what keeps an adaptive instrument valid and comparable pre-to-post (the same principle that lets the digital SAT cap the score of a student who misses easy items early).

What does **not** change (and is restated as preserved invariants in §3): the immutable record tables (Contracts §2), the write-mapping (Contracts §3 — diagnostic writes `placement_estimate` + assessment records, never `mastery`), server-side authoritative recomputation, and the "metric reads only answered items" rule (Assessment_Scoring_Spec §6).

This affects primarily Gabe's lane and the *definition* of the marketed metric. It does not change the shared types, and teammates' consumption points (the record shapes, the mastery service, state reads) are untouched.

---

## 2. Contract text this changes

### 2.1 Contracts §2 — `assessment_administration.purpose`

- **Current wording:** *"`pre` / `post` / `placement`. **Pre and post use fixed parallel forms, same blueprint. Only `placement` may branch/stop early.**"*
- **Proposed wording:** *"`pre` / `post` / `placement`. Pre and post use the **same adaptive blueprint and scoring-model version**, administered as a multistage adaptive test; comparability comes from a **shared difficulty-aware scoring model and counterbalanced parallel item pools**, not from identical fixed forms. The routing path taken is recorded (see §2.2) so the score is deterministically recomputable."*

### 2.2 Contracts §2 — new recorded field on `assessment_administration`

- Add: `routing_path` (jsonb) — the ordered list of stage ids served, plus the scoring-model version. Required so the frontier score is reproducible from immutable records (Assessment_Scoring_Spec §9). Additive; no existing field changes.
- Add: `scoring_model_version` (int) — the frontier scoring model in force (distinct from `scoring_engine_version`, which is the answer-checker/scorer). Pre and post MUST share it to be comparable.

### 2.3 Assessment_Scoring_Spec §3 and §5

- §3 ("Two fixed parallel forms … Neither is adaptive or branching") is superseded by the MST design in §4 below. Parallel *item pools* and counterbalancing are retained (a student still never sees an identical item pre and post); "fixed non-adaptive form" is replaced by "fixed adaptive blueprint + scoring model."
- §5 ("Administration score = correct items / scorable items, as a percent") is replaced for the reported metric by the **frontier ability score `θ`** (§4.3). Per-item binary correctness and the "answered-items-only" denominator rule (§6) are retained and feed the frontier computation.

Everything else in Assessment_Scoring_Spec (edge cases §6, honest-disclosure §7/§7a, deferred psychometrics §10) is unchanged.

---

## 3. Invariants preserved (must remain true by construction)

- **INV-DIAG-1 (mastery firewall).** The diagnostic writes ONLY `placement_estimate`; it never writes `mastery`, `completion_status`, or evidence. Unchanged from Contracts §1/§3. (Enforceable: the engine has no mastery-writer dependency.)
- **INV-DIAG-2 (metric from answered items only).** The frontier score `θ` is computed only from items the student actually answered (scorable = `correct`/`incorrect`; faults and `invalid_input` excluded per Assessment_Scoring_Spec §6). Graph-inferred placement for *untested* nodes seeds the city visual (and, via the lesson lane, may route the lesson entry point) but is **never an input to `θ` or the gain metric**.
- **INV-DIAG-3 (one instrument).** There is exactly one onboarding instrument; placement is derived from the same run as the pre-score. No second testing wall.
- **INV-DIAG-4 (reproducibility).** Given the immutable records + `routing_path` + `scoring_model_version`, the server can deterministically recompute `θ` (Assessment_Scoring_Spec §9 ship requirement).
- **INV-DIAG-5 (pre/post comparability).** Pre and post use the same adaptive blueprint version and the same `scoring_model_version`, with counterbalanced parallel item pools; `θ_post − θ_pre` is the reported foundational gain on a common scale.

---

## 4. The adaptive design (normative once ratified)

### 4.1 Multistage structure (MVP: Domain D1, 6 nodes)

- **Routing stage:** one medium-difficulty (L2) item per D1 node.
- **Route up** (routing proportion ≥ routing bar, default 0.7): harder (L3) items on the higher-tier nodes (those with prerequisites: NUM.2, NUM.4, NUM.5). The roots are inferred cleared.
- **Route down** (below the bar): easier (L1) items on the root nodes (no prerequisites: NUM.S, NUM.F, NUM.3) to locate where the foundation breaks; the frontier is capped below "medium cleared."

Stage node sets are **derived from the prereq graph** (roots = MVP nodes with no prereqs; higher tier = MVP nodes with prereqs), so the structure extends naturally to the full graph post-MVP.

### 4.2 Graph-inferred coverage

When a student clears a higher-tier node, its transitive prerequisites are credited as **inferred** placement (foundational skills are highly correlated, so demonstrating the dependent is strong evidence for the prerequisites). Inferred placements seed the city (INV-DIAG-2) and are flagged distinctly from measured placements.

### 4.3 Frontier ability score `θ ∈ [0, 3]`

Let `r`, `h`, `e` be the scorable proportion-correct on the routing, up, and down stages respectively.

- Routed up (`r ≥ bar`): `θ = 2 + h` → `[2, 3]` (medium cleared, plus progress into hard).
- Routed down (`r < bar`), foundation solid (`e ≥ bar`): `θ = 1 + r` → `[1, 2)`.
- Routed down, foundation shaky (`e < bar`): `θ = e` → `[0, 1)`.

This is monotonic in ability and **path-invariant**: two students of equal ability reach the same route and the same `θ` regardless of which counterbalanced form they saw. The routed-down ceiling below 2 is the deliberate "missed easy items caps the score" behavior.

### 4.4 Per-node placement (city seed)

Each directly-tested node is placed by the highest difficulty it answered correctly (L3→3, L2→2, L1→1, none→0). Untested MVP nodes take the max inferred placement from any dependent tested node (§4.2), capped at 3, and are marked inferred. Placement (measured or inferred) additionally routes each node's **lesson entry point** in the lesson lane (high placement → skip teaching → "prove it" practice); the practice is always the safeguard, so a wrong inference just means the student does the practice (and, on a miss, is routed into teaching). This routing is never an input to `θ` or the gain metric (INV-DIAG-2).

---

## 5. Provisional calibration + honest disclosure

Item difficulties are **author-assigned (L1/L2/L3)** at MVP, not IRT-calibrated (calibration needs response volume the build does not produce — Assessment_Scoring_Spec §10 already defers this to the inheritor). `θ` is therefore a **provisional, uncalibrated** ability estimate. The existing honest-disclosure clause (§7a: "uncontrolled, within-instrument pre/post gain") stands and is extended with "on a provisional difficulty scale, pending post-hoc calibration." The scoring-model version lets us recompute historical `θ` once real difficulty parameters exist.

---

## 6. Item-pool depth (authoring consequence)

Adaptive + counterbalanced pre/post requires each (node, difficulty) cell to hold enough authored items that the post path does not reuse a pre item and the routing always has items to serve. The engine degrades gracefully on a thin bank (serves what exists), but the D1 authoring target (Day 8) should provision L1/L2/L3 items per node with parallel A/B pools.

---

## 7. Approval checklist (ratification gate — all satisfied 2026-07-20)

- [x] **(a) Metric validity.** The reported score is the difficulty-aware frontier `θ`, not raw percent; comparability rests on a shared scoring-model version + counterbalanced pools (INV-DIAG-5).
- [x] **(b) Mastery firewall intact.** Diagnostic writes only `placement_estimate`, never `mastery` (INV-DIAG-1).
- [x] **(c) Metric from answered items only.** Graph inference seeds the city, never `θ` (INV-DIAG-2).
- [x] **(d) Reproducibility.** `routing_path` + `scoring_model_version` recorded; `θ` recomputable from immutable records (INV-DIAG-4).
- [x] **(e) Honest disclosure.** The provisional/uncalibrated nature of `θ` is disclosed with any reported number (§5).
- [x] **(f) Additive records.** New `assessment_administration` fields (`routing_path`, `scoring_model_version`) are additive; no existing field/type changes; shared types unaffected.

---

## 8. Ownership & rollout

**Gabe** owns the diagnostic engine (MST routing + frontier scoring), the two additive `assessment_administration` fields + their migration, and the scoring-model versioning. The engine machinery lands now (behind the existing DI ports, `engines/diagnostic`); the additive record fields and the ratified metric wording land on all-hands sign-off. **Anthony** and **Evan** are unaffected in their lanes (the mastery service, state reads, and record shapes they consume are unchanged); the only shared change is the metric *definition*, which is why this is an all-hands amendment rather than a lane-local decision.
