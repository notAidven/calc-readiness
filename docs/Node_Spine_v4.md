# Node Spine v4: Curated Calculus-Readiness Skill Graph

*Content-complete candidate. Domains adopted from MDTP/ALEKS; nodes grounded in OpenStax objectives, curated against calculus-readiness criteria, then corrected for node-boundary and prerequisite accuracy (v4 review pass). Descriptions in our own wording. **v4 is the stable-ID baseline**: item authoring will reference these IDs, so from here IDs are fixed (suffix, don't renumber, for future changes).*

## Provenance framing
> We adopt the domain structure from validated placement frameworks (MDTP, cross-checked with ALEKS), ground skill nodes in published learning objectives, and curate them against calculus-readiness criteria for an underprepared population.

Expert-curated / framework-grounded (CourseMapper middle path). Copyright: we take the *skills* (uncopyrightable facts) with our own selection, arrangement, and wording; items come from MyOpenMath (CC BY) + original authoring, so OpenStax expression never enters the product.

## Legend
- **Node:** one measurable prerequisite skill, the atomic unit that is tested, taught, and mastered (e.g. `RAT.1`). Each row below is one node. Each node is taught by its **own lesson** (1 node = 1 lesson = 1 building); closely-related nodes may reuse one **interaction archetype** — a reusable lesson-build template (see Lesson_Cluster_Sketch / PRD §1.5).
- **Scope:** CORE = candidate content for the full-product diagnostic. The Day-12 MVP diagnostic covers only the 6 D1 nodes marked `product_scope: "mvp"` in `skill_graph.json`; the registry wins for current product scope. (Cuts and extended areas are recorded at the end.)
- **Prereqs:** within-graph node IDs this skill depends on: the routing edges. Where a node bundles methods with *different* prereqs, prereqs are annotated per-subskill.
- **Source:** OpenStax section the skill was identified from (College Algebra 2e unless noted; trig from Precalculus 2e).

---

## D1: Real Numbers & Arithmetic Fluency  *(Tier 0: foundation)*

| Node | Skill | Prereqs | Source | Notes |
|------|-------|---------|--------|-------|
| NUM.S | Signed-number arithmetic (operate with negatives) |: | authored (ALEKS-motivated) | split from old NUM.0 |
| NUM.F | Fraction arithmetic (operate with fractions in expressions) |: | authored (ALEKS-motivated) | split from old NUM.0; top bottleneck |
| ~~NUM.1~~ | ~~Recognize number types~~ | §1.1 | **CUT**: not load-bearing for calc; number-classification kept only as a secondary tag under NUM.4 / RAD.1 / FUN.2 |
| NUM.2 | Apply order of operations | NUM.S, NUM.F | §1.1 | |
| NUM.3 | Use field properties (commutative/associative/distributive/identity/inverse) |: | §1.1 | |
| NUM.4 | Evaluate and simplify algebraic expressions | NUM.S, NUM.F, NUM.2, NUM.3 | §1.1 | |
| NUM.5 | Ratios, rates, proportions, percents, and units | NUM.F | §ref (proportional reasoning) | **restored**: foundational for slope, rates, scaling, growth |

## D2: Exponents & Radicals

| Node | Skill | Prereqs | Source | Notes |
|------|-------|---------|--------|-------|
| EXP.1 | Apply exponent laws to evaluate and simplify expressions (incl. zero & negative exponents) | NUM.4 | §1.2 | merged EXP.1+EXP.2; finer rules (product/quotient/power/zero/negative) kept as internal misconception tags, not nodes |
| ~~EXP.2~~ | ~~(merged into EXP.1)~~ | §1.2 | **RETIRED**: ID not reused |
| RAD.1 | Evaluate and simplify roots (product/quotient reasoning) | NUM.4 | §1.3 | |
| RAD.2 | Combine radical terms; clear radicals from denominators | RAD.1 | §1.3 | |
| RAD.3 | Convert between fractional-exponent and radical form | EXP.1, RAD.1 | §1.3 | |
| RAD.4 | Simplify radicals with VARIABLE radicands (`sqrt(x^5)` → `x^2·sqrt(x)`); `sqrt(x^2) = abs(x)` and why the absolute value is required; even roots of negatives are undefined over the reals | RAD.1, EXP.1, NUM.S | §1.3 | **ADDED (2026-07-25 D2 QA pass)**: every other radicand in the graph is a positive integer, so a student reached D4 having never simplified a variable radicand and was never taught the absolute-value result or the even-root domain restriction. NUM.S edge because NUM.S is the graph's only definition of absolute value. Items checker-gated (variable radicands + `abs()` uncleared) |

## D3: Linear Equations, Inequalities & Absolute Values

| Node | Skill | Prereqs | Source | Notes |
|------|-------|---------|--------|-------|
| LIN.1 | Solve one-variable linear equations | NUM.4 | §2.2 | |
| LIN.3 | Rearrange a formula to isolate a chosen variable | LIN.1 | §2.3 | |
| LIN.4 | Solve linear **and compound** inequalities (and/or, chained); interval notation | LIN.1 | §2.7 | wording expanded per review |
| LIN.5 | Solve absolute-value equations | LIN.1 | §2.6 | |
| LIN.6 | Solve absolute-value inequalities | LIN.4, LIN.5 | §2.7 | |

*(Rational equations moved out of D3 → RAT.6, fixing the backward tier edge. Old LIN.2 ID retired.)*

## D4: Polynomials & Quadratics

| Node | Skill | Prereqs | Source | Notes |
|------|-------|---------|--------|-------|
| POL.1 | Add/subtract/multiply polynomials (FOIL, multivariable) | NUM.4 | §1.4 | |
| POL.2 | Factor polynomials (GCF, trinomials, grouping, perfect squares, diff. of squares) | POL.1 | §1.5 | |
| POL.3 | Solve quadratics by factoring and the square-root property | *per-family:* factoring items → POL.2; square-root items → RAD.1 | §2.5 | split from old POL.4; prereqs are per-item-family, not both-always |
| POL.4 | Solve quadratics by completing the square and the quadratic formula | POL.1, RAD.1 | §2.5 | split: **does NOT require POL.2** |
| POL.5 | Graph quadratics: vertex, intercepts, min/max | FUN.1, CG.1, POL.1 | §5.1 | prereqs fixed: graphing ≠ solving mastery |
| POL.6 | Describe polynomial end behavior from degree & leading coefficient | POL.1 | §5.2 | merge candidate w/ POL.7 |
| POL.7 | Analyze polynomial graphs: real zeros, multiplicity, turning points | POL.2, POL.6 | §5.3 | merge candidate w/ POL.6 |
| POL.8 | Polynomial long & synthetic division | POL.2 | §5.4 | **ADDED (2026-07-24 coverage expansion)**: re-judged IN for calc readiness (division-into-quotient underlies rational-function analysis & the factor theorem); §5.4 was previously a cut |

## D5: Rational Expressions & Functions

| Node | Skill | Prereqs | Source | Notes |
|------|-------|---------|--------|-------|
| RAT.1 | Simplify rational expressions (factor, reduce, track excluded values) | POL.2 | §1.6 | |
| RAT.2 | Multiply and divide rational expressions | RAT.1 | §1.6 | |
| RAT.3 | Add and subtract rational expressions | RAT.1 | §1.6 | |
| RAT.4 | Simplify complex/nested rational expressions | RAT.2, RAT.3 | §1.6 | KEEP but **low item weight**: 1 screening item, more only if surprising; lower remediation priority than RAT.1–3 |
| RAT.5 | Graph & analyze rational functions: domain, intercepts, holes, vertical & end-behavior asymptotes | RAT.1, POL.2 | §5.6 | wording expanded per review |
| RAT.6 | Solve rational equations; reject extraneous solutions | LIN.1, RAT.1 | §2.2 | **moved here from D3** (fixes tier violation; source §2.2 is correct) |

## D6: Functions & their Graphs

| Node | Skill | Prereqs | Source | Notes |
|------|-------|---------|--------|-------|
| CG.1 | Coordinate plane: plot points, intercepts, distance, midpoint | NUM.4 | §2.1 | |
| FUN.1 | Use function notation; evaluate functions; determine whether a relation is a function (vertical-line test) | NUM.4 | §3.1 | one-to-one moved to FUN.8 |
| FUN.2 | Determine domain and range | FUN.1 | §3.2 | |
| FUN.3 | Evaluate and graph piecewise-defined functions | FUN.1, FUN.2 | §3.2 | |
| FUN.4 | Read key features from a graph (increasing/decreasing, extrema) | FUN.1, CG.1 | §3.3 | split from old FUN.4 |
| FUN.5 | Compute average rate of change | FUN.1, LF.1 | §3.3 | split; depends on LF.1 (slope first: see tiers) |
| FUN.6 | Form and simplify the difference quotient | *base:* FUN.1, POL.1; *polynomial-family items:* POL.1 only (**does NOT require POL.2**); *rational-family items:* +RAT.1–RAT.3 as applicable | §3.3 | per-item-family prereqs: a weak RAT.1 must not suppress polynomial-quotient testing. Polynomial family does NOT require POL.2: factoring out the single common `h` is trivial GCF inside POL.1's expand/combine scope, not the full factoring skill (aligns with registry/edge-doc) |
| FUN.7 | Compose and decompose functions | FUN.1 | §3.4 | |
| FUN.8 | Determine one-to-one; find & verify inverse functions | FUN.1, FUN.7 | §3.7 | absorbs one-to-one/horizontal-line test |
| FUN.9 | Apply transformations: shifts, reflections, stretches; identify even/odd | FUN.1, CG.1 | §3.5 | |
| FUN.10 | Graph and interpret absolute-value functions | FUN.9, LIN.5 | §3.6 | |

## D7: Linear Functions  *(partly foundational: see partial-order note)*

| Node | Skill | Prereqs | Source | Notes |
|------|-------|---------|--------|-------|
| LF.1 | Interpret slope as a (constant) rate of change; classify a line's behavior | FUN.1, CG.1 | §4.1 | **feeds FUN.5**: slope-as-rate precedes general average rate of change |
| LF.2 | Write and graph line equations; parallel & perpendicular | LF.1 | §4.1 | |
| LF.3 | Build a linear model from a description or data | LF.2 | §4.2 | |
| LF.4 | Solve a system of two linear equations (graphing, substitution, elimination) | LIN.1, LF.2 | §7.1 | |

## D8: Exponential & Logarithmic Functions

| Node | Skill | Prereqs | Source |
|------|-------|---------|--------|
| EL.1 | Evaluate exponential functions; base e; compound interest | EXP.1, FUN.1 | §6.1 |
| EL.2 | Graph exponential functions & transformations | EL.1, FUN.9 | §6.2 |
| EL.3 | Convert exponential↔logarithmic form; evaluate common & natural logs | EL.1 | §6.3 |
| EL.4 | Graph logarithmic functions; state domain | EL.3, FUN.9 | §6.4 |
| EL.5 | Apply logarithm properties (product/quotient/power, expand/condense, change of base) | EL.3 | §6.5 |
| EL.6 | Solve exponential and logarithmic equations | EL.5, LIN.1 | §6.6 |

## D9: Trigonometry

| Node | Skill | Prereqs | Source | Notes |
|------|-------|---------|--------|-------|
| TRG.1 | Measure angles; convert degrees↔radians; coterminal angles | NUM.4 | §7.1 | |
| TRG.2 | Right-triangle trig; 30/45/60 values; cofunctions | TRG.1, RAD.1 | §7.2 | |
| TRG.3 | Unit circle & reference angles for sine/cosine | TRG.1, TRG.2 | §7.3 | |
| TRG.4 | All six functions; even/odd; fundamental identities | TRG.3 | §7.4 | |
| TRG.5 | Graph sine & cosine (amplitude, period, phase shift) | TRG.3, FUN.9 | §8.1 | |
| TRG.6 | Graph tangent & reciprocal trig functions (period, asymptotes) | TRG.4, TRG.5 | §8.2 | **PROMOTED to active CORE target (2026-07-24)** (was SECONDARY/institution-enabled); lower-confidence promotion |
| TRG.7 | Evaluate and compose inverse trig functions | TRG.4, FUN.8 | §8.3 | |
| TRG.8 | Solve **basic** trig equations over an interval (unit-circle values, inverses, simple algebraic/quadratic-by-substitution forms) | TRG.4, POL.3 | §9.5 | **narrowed**: dropped multiple-angle (needs the trimmed identity machinery) |
| TRG.9 | Core trig identities: sum/difference & double-angle (verify/simplify/apply) | TRG.4 | §9.2-9.4 | **ADDED (2026-07-24 coverage expansion)**: the *core* sum/difference & double-angle identities re-judged IN for calc readiness (needed for later simplification/rewriting); product-to-sum & half-angle remain excluded. Items checker-gated (general identity equivalence uncleared) |

## D10: Geometry  *(NEW domain — 2026-07-24 coverage expansion)*

*Added to close the geometry coverage gap flagged in the audit: Pythagorean/similar-triangle reasoning and standard-figure measurement are load-bearing for coordinate geometry, related rates, and volumes-of-revolution setup. Domain grounded in the same MDTP/ALEKS + OpenStax objectives framing as the rest of the spine (geometry objectives from standard placement frameworks; wording our own). **Presented as a new island; game/theme presentation (hue, buildings, advisor) is UNASSIGNED and needs Evan (game/island) + Anthony (theme).***

| Node | Skill | Prereqs | Source | Notes |
|------|-------|---------|--------|-------|
| GEO.1 | Pythagorean theorem, similar triangles & basic angle relationships | NUM.4 | geometry (placement-framework objective) | foundational; additive edge to existing foundational node NUM.4 only |
| GEO.2 | Area, perimeter, volume & surface area of standard figures | GEO.1 | geometry (placement-framework objective) | standard-figure measurement |

---

## Prerequisite structure is a partial order, not a strict domain ladder

The review's key structural correction, accepted: domains are **presentation categories**, but real routing uses the **node-level edges**, which cross domain boundaries. Notable cross-domain edges:
- `CG.1 → LF.1 → LF.2` and `FUN.1 → LF.1`
- `LF.1 → FUN.5`: **slope-as-rate (linear) precedes general average rate of change.** So D7 is *partly foundational*, not wholly downstream of D6.
- `FUN.9 (transformations) → EL.2, TRG.5`
- `FUN.8 (inverse) → EL.3-ish, TRG.7`
- `POL.2 (factoring) → RAT.1, POL.3, POL.7, FUN.6`: factoring is a major hub.

**Domain tiers (rough sequencing guide, NOT a strict gate):**
Tier 0: D1 · Tier 1: D2, D3, D4, and the *foundational slice of D7* (LF.1) · Tier 2: D5, D6 · Tier 3: rest of D7, D8, D9.

## Gating rule: SOFT/WEIGHTED (the actual design principle)
- **Testing order** follows tiers (hard rule; costs nothing).
- **Item allocation** is weighted, not gated: weak upstream → *fewer* downstream items (confirm the expected weakness), reallocating to where information is still useful. Downstream domains are never switched off: spiky students (weak foundation, unexpectedly OK downstream) must stay detectable.
- **Hard floor only at the very bottom:** only if NUM.S/NUM.F are failing does a hard stop on far-downstream depth (D8/D9) apply.
- **Corrected framing (review point 13):** weak D6 performance *lowers confidence and sampling priority* for D7–D9; it does **not** make their results "noise." A student can evaluate exponentials procedurally or know unit-circle values while weak on formal domain/range: still informative.

---

## Cuts (recorded)
Scientific notation (§1.2); advanced factoring: cubes & fractional-exponent (§1.5); polynomial zeros theorems (§5.5); complex numbers (§2.4); linear regression / best fit (§4.3); exp/log modeling & data fitting (§6.7–6.8); **multiple-angle trig equations** (implied by narrowing TRG.8).

**Re-judged IN (2026-07-24 coverage expansion — no longer cut):** **polynomial long & synthetic division (§5.4)** is now IN as **POL.8** (division-into-quotient underlies rational-function analysis and the factor theorem).

## Excluded areas (below the readiness line)
Systems beyond 2-var; matrices; partial fractions; Cramer's (Ch. 7 except LF.4 — the 2×2 linear system, now an active product node). Conic sections (Ch. 8). Sequences/series/counting/probability (Ch. 9). Product-to-sum and half-angle trig identities (§9.3–9.4).

**Re-judged IN (2026-07-24 coverage expansion — no longer excluded/extended):**
- **Rational exponents ↔ radical form** (RAD.3), **absolute-value equations** (LIN.5) & **inequalities** (LIN.6), **rational equations** (RAT.6), **inverse trig** (TRG.7), **graph logarithmic functions** (EL.4), **graph tangent/reciprocal** (TRG.6), **polynomial-graph analysis** (POL.7), **absolute-value functions** (FUN.10), and the **2×2 linear system** (LF.4) — all promoted from `extended`/`secondary` into product target (re-judged load-bearing for calc readiness).
- **Core sum/difference & double-angle identities** (§9.2) are now IN as **TRG.9** (only the *core* slice; product-to-sum & half-angle remain excluded above).
- **Geometry** — Pythagorean theorem / similar triangles / basic angle relationships (GEO.1) and area/perimeter/volume/surface-area of standard figures (GEO.2) — is now IN as the new **D10 Geometry** domain.
- Items for **TRG.9** (and TRG.7 if authored in solved form) are **checker-gated** even though the nodes are in product: the residual uncleared checker categories are general equation/inequality equivalence and general trig/log identities (see `Answer_Equivalence_Spec.md` §10). Lessons are **not** gated; only their items. **LIN.5 and LIN.6 were listed here as gated on the same residual and were un-gated on 2026-07-27** (spec v0.16): an absolute-value equation answers as a `solution_set` and an absolute-value inequality as an `interval`, both long cleared, and the bars appear only in the prompt, which the checker never parses. **FUN.10** is gated, on the narrower `abs`-in-expression grammar gap rather than on this residual.

**Re-judged IN (2026-07-25 D2 QA pass — no longer an implicit gap):**
- **Variable radicands, `sqrt(x^2) = abs(x)`, and the even-root domain restriction** are now IN as **RAD.4** (D2). Every radicand elsewhere in the graph is a positive integer, so nothing taught a variable radicand, the absolute-value result, or "even roots of negatives are undefined over the reals" — a student reached D4 having never simplified `sqrt(x^5)`. RAD.4's **items are checker-gated** on a *different* residual than the ones above: the v2 checker's radical path cannot evaluate a free variable, its `simplified_radical` predicate only inspects CONSTANT radicands, and `abs()` is outside its accepted grammar. Its **lesson is not gated**.

---

## Count (corrected)
**62 CORE nodes** *(after the 2026-07-24 coverage expansion and the 2026-07-25 D2 QA append; was 56 CORE + 1 SECONDARY)*. The expansion promoted TRG.6 from SECONDARY into active CORE (+1), and appended 4 new CORE nodes — POL.8 (D4), TRG.9 (D9), GEO.1 & GEO.2 (new D10 Geometry) (+4): 56 + 1 + 4 = **61**. The D2 QA pass then appended **RAD.4** (D2) (+1) = **62**. All 62 are product target (the `extended`/`secondary` populations are now empty). Per-domain CORE now: D1:6 · D2:5 · D3:5 · D4:8 · D5:6 · D6:11 · D7:4 · D8:6 · D9:9 · D10:2 = 62. *(Authoritative counts are computed by graph_invariants.py from skill_graph.json; this line is the human-readable echo.)*

### Historical (pre-expansion) count
**56 CORE nodes** + 1 SECONDARY (TRG.6).
- Pre-trim v4 total was **59** (D1:7 · D2:6 · D3:5 · D4:7 · D5:6 · D6:11 · D7:4 · D8:6 · D9:8): *my earlier "55" was an arithmetic error: I carried the v3 count without re-adding v4's net +4 (NUM.5 added, NUM.0/FUN.4/POL.4 splits, LIN.2→RAT.6).*
- Length-control trims applied: cut NUM.1 (−1), merge EXP.1+EXP.2 (−1), move TRG.6 to SECONDARY (−1 from CORE).
- **59 − 3 = 56 CORE.** *(The review's "52" was built on the wrong 55 baseline; the calls were all correct, only the starting number was off.)*
- Final per-domain CORE: D1:6 · D2:4 · D3:5 · D4:7 · D5:6 · D6:11 · D7:4 · D8:6 · D9:7 (TRG.6 secondary, excluded). Sums to 56. *(Authoritative counts are computed by graph_invariants.py from skill_graph.json; this line is the human-readable echo.)*

## Length-control decisions: RESOLVED
- **NUM.1** → **CUT** (number classification kept as secondary tag only).
- **EXP.1 + EXP.2** → **MERGED** into EXP.1 (finer rules become internal misconception tags).
- **POL.6 + POL.7** → **KEPT SEPARATE** (different competencies, different prereqs, different remediation).
- **RAT.4** → **KEPT**, low item weight (1 screening item, lower remediation priority).
- **TRG.6** → **SECONDARY** (institution-enabled, not CORE).

## Status
**CONTENT LOCKED AT 56 CORE NODES**: pending only prerequisite-edge validation by your team. That review should check each edge for: (1) hard vs. soft vs. item-family-specific; (2) unintended cycles; (3) whether prereq failure truly makes the downstream item uninterpretable; (4) whether two nodes share a remediation destination (redundancy). Math coverage is ready for the blueprint.

Also confirm at edge-review: the restored **NUM.5** (proportional reasoning) and the **LF.1 → FUN.5** ordering (linear slope feeds general average rate of change: the one intentional D7-is-partly-foundational edge).

## Verification note
The review is LLM-generated; its math-substance points are sound and mostly accepted. One claim was rejected: it asserted LIN.2's source was "principally §2.6," but your pasted §2.2 objectives include "solve a rational equation," so §2.2 is correct: only the *tier placement* was wrong (now fixed via RAT.6). Prereq edges remain first-pass drafting for team review.
