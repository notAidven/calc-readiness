> **Companion doc, NOT the authority — and HISTORICAL terminology.** As of **2026-07-21** the student-facing unit is the **per-node lesson** (1 node = 1 lesson = 1 building); what this doc calls a "lesson shell" / "lesson build" is now the **interaction archetype** — a reusable lesson-build *template* several nodes' lessons share for build savings (invisible to the student). `skill_graph.json` is authoritative for the node→archetype assignment (field `lesson_shell`, renaming to `lesson_archetype`) and for product scope. This file explains the *reuse* REASONING behind those assignments. The specific archetype numbers and node counts below reflect an earlier ~38-node scope; the current 62-node product target maps to ~45 archetypes, computed by graph_invariants.py (it was "48-node / ~31 archetypes" until the 2026-07-24 coverage expansion, PR #50, and the 2026-07-25 RAD.4 append, PR #63). Where this doc and the registry disagree on counts, the registry wins.
>
> **MVP SCOPE UPDATE (mentor pivot):** the MVP is now DEPTH-FIRST on Domain D1 only, **6 nodes / 6 per-node lessons reusing ~3 archetypes** (L1 = NUM.S+NUM.F, L2 = NUM.2+NUM.3+NUM.4, L3 = NUM.5). The reuse reasoning below informs ranked Phase-2 expansion toward the full product ceiling (62 nodes as of 2026-07-25, per the registry); it is no longer the MVP set. For the MVP, all 6 D1 per-node lessons are built (richly).

# Lesson-Cluster Sketch (historical pre-pivot scoping rationale)

*Shows how the v1 node set collapses into shared lesson-build units. Node count (measurable skills, cheap) is decoupled from lesson-build count (interactive content, expensive). Cluster assignments are a FIRST-PASS HYPOTHESIS: your team confirms when lesson format is defined, because "these share a shell" is easy to assert and sometimes false once you build the actual interaction.*

## Historical budget model (why this mattered)
- **Nodes** = measurable skills in the diagnostic (items + 1–3 tag). Cheap. ~28–30 is fine.
- **Lesson builds** = original interactive content. Expensive, the binding 4-week constraint. Folding reduces THIS number.

Rule used below: nodes cluster into one build if they share the same instructional core and differ only by entry point / difficulty / one added step. Nodes needing a genuinely distinct interaction get their own build.

---

## Historical pre-pivot clusters

**Historical node set = strict 25 + cheap fold-in adds (LIN.4, POL.5, RAT.3, FUN.7).** ~29 measurable nodes. This is not the current MVP or product manifest; use `skill_graph.json` for the current 6-node MVP (~3 archetypes) and 62-node / ~45-archetype product target.

| # | Lesson build unit | Nodes covered | Build cost |
|---|-------------------|---------------|-----------|
| L1 | Signed numbers & fractions | NUM.S, NUM.F | 1 (2 entry points) |
| L2 | Order of ops, field properties, evaluate/simplify | NUM.2, NUM.3, NUM.4 | 1 (shared core, staged) |
| L3 | Ratios, rates, proportions, percents, units | NUM.5 | 1 |
| L4 | Exponent laws | EXP.1 | 1 |
| L5 | Simplify roots / radicals | RAD.1 | 1 |
| L6 | Solve linear equations **+ inequalities** | LIN.1, LIN.4 | 1 (inequalities = added entry point) |
| L7 | Polynomial arithmetic **+ factoring** | POL.1, POL.2 | 1 (factoring builds on arithmetic; shared unit, 2 stages) |
| L8 | Solve quadratics (factoring + square-root) **+ quadratic graphs** | POL.3, POL.5 | 1 (graphing folds in as the visual stage) |
| L9 | Rational expressions: simplify **+ add/subtract** | RAT.1, RAT.3 | 1 |
| L10 | Coordinate plane | CG.1 | 1 |
| L11 | Functions: notation/evaluation **+ domain/range + composition** | FUN.1, FUN.2, FUN.7 | 1 (shared "function shell," 3 stages) |
| L12 | Reading graph features | FUN.4 | 1 |
| L13 | Difference quotient *(poly + simple cancellable rational only)* | FUN.6 | 1 |
| L14 | Slope as constant rate of change | LF.1 | 1 |
| L15 | Exponential functions (evaluate, base e) | EL.1 | 1 |
| L16 | Logarithms: form conversion + basic evaluation | EL.3 | 1 |
| L17 | Angles & radians | TRG.1 | 1 |
| L18 | Right-triangle trig + special triangles **→** unit circle & reference angles | TRG.2, TRG.3 | 1 (the natural bridge; 2 stages) |
| L19 | Six trig functions + fundamental identities | TRG.4 | 1 |

**~29 nodes → 19 lesson builds.**

---

## What this buys you
- **You measure ~29 skills but build ~19 lessons.** The fold-in adds (LIN.4, POL.5, RAT.3, FUN.7: the top of the backlog) come back at **near-zero extra build cost** because each rides on a lesson you were already building (L6, L8, L9, L11).
- **19 builds across 3–4 people in 4 weeks** is comfortably inside your stated throughput (~8 lessons/person/week solo), leaving real room for the game layer + diagnostic engine: which was the actual constraint.
- **Diagnostic still routes cleanly**: every node maps to a lesson (or a stage within one), so no dead-end routes. "Only diagnose what you can remediate" holds.

## What's still expensive / deliberately OUT
These need their own standalone build and folding does NOT help: kept in backlog:
- **FUN.8 inverses** (distinct interaction, and depends on FUN.7 which is now in: so it's *newly* affordable if you want it, but still a full build)
- **FUN.9 transformations** (own build)
- **EL.5 log properties** (own build)
- **RAT.2 mult/divide, RAT.4 complex fractions, RAT.5 rational graphs**
- **POL.6/POL.7 higher-degree polynomial graphs**
- **LIN.3 literal equations, LIN.5/6 absolute value, LF.2/3/4 lines & systems**
- **TRG.5–8 trig graphs / inverse / equations**
- The ~30 TRIM/excluded nodes from the full spine.

## Caveats (honest)
1. **Cluster assignments are hypotheses.** L2 (three NUM nodes in one unit), L11 (three FUN nodes), and L18 (the trig bridge) are the biggest "sharing" claims: most likely to split into 2 builds each once you design the actual interaction. If all three split, you're at ~22 builds, still fine.
2. **"Stage" ≠ free.** A folded node still needs its own items, its 1–3 tags, and a bit of lesson content: it's cheaper, not costless. Budget maybe 0.3–0.5 of a full build per fold-in, not 0.
3. **FUN.6 scope restriction stands:** polynomial + simple cancellable rational difference-quotient items only (RAT.2/3 machinery isn't in the core, so don't author rational-family items that need it).
4. This assumes lessons are the ~single-skill interactive units your team has built before, not larger multi-topic modules. If your lesson format is heavier, the build count rises and clusters matter more.

## Historical net scoping picture (base fold)
- **~29 measurable nodes** (strict 25 + LIN.4, POL.5, RAT.3, FUN.7)
- **~19 lesson builds** (22 if the big-share clusters split)
- In this historical sketch all 9 domains were covered; the current Day-12 MVP covers D1 only.

---

## HISTORICAL TARGET-25 BUILD EXPANSION

Spending the extra ~6 builds of capacity on coverage + de-risking. All additions dependency-closed (verified against v4 graph).

**+5 new nodes (each its own build):**
| Build | Node(s) | Why | Deps (all in set) |
|-------|---------|-----|-------------------|
| L20 | FUN.8 inverse functions | Function family was the leanest area; now affordable since FUN.7 is in | FUN.1, FUN.7 |
| L21 | FUN.9 transformations | Rounds out functions; also unlocks TRG.5 | FUN.1, CG.1 |
| L22 | LF.2 equations of lines | Linear Functions was a single node (LF.1); makes it a real domain | LF.1 |
| L23 | EL.5 log properties | EL.3 alone (form conversion) is thin; completes log basics | EL.3 |
| L24 | TRG.5 graph sine & cosine | Calc-proximal; now dependency-legal (needs FUN.9, now added) | TRG.3, FUN.9 |

**+1 de-risking un-fold (no new node):**
| Build | Change | Why |
|-------|--------|-----|
| L25 | Pull **FUN.7 composition** out of the crowded L11 shell into its own build | L11 packed 3 FUN nodes into one unit (flagged as riskiest cluster); composition deserves its own interaction, and un-folding removes the biggest estimate risk |

**Result: 25 lesson shells, ~34 measurable nodes**: but see "shells ≠ builds" below; true load is ~28–31 build-equivalents, staged.

### Updated domain shape
- **Functions** goes from lean (FUN.1,2,4,6) to robust (adds 7 as own build, 8, 9): fixes the flagged weak spot.
- **Linear Functions** now LF.1 + LF.2 (slope + line equations), a real domain.
- **Exp/log** now EL.1, EL.3, EL.5: evaluation + conversion + properties.
- **Trig** now includes graphing (TRG.5) on top of the honest 1→2→3→4 chain.

### Still out (backlog, need own builds; folding doesn't help):
RAT.2/4, POL.6/7, LIN.3/5/6, LF.3/4, EL.2/4, TRG.6/7, all TRIM/excluded nodes. First back if headroom: TRG.7 inverse trig.
*(Note: RAT.5, EL.6 moved INTO scope: see readiness-validity additions below. TRG.8 is an open decision below.)*

### Corrections applied (review pass 2)

**FUN.6 scope: corrected.** Earlier caveat wrongly said RAT.2/3 aren't in core; RAT.3 *is* (L9). But rational difference quotients smuggle in RAT.2 (dividing by h = multiply by reciprocal), which is NOT in core. Clean v1 line:
> **FUN.6 v1 = polynomial-family difference quotients only. Rational-function difference quotients → backlog (pending RAT.2).** Avoids measuring a procedure the graph officially excludes.

**TRG.5 scope: bounded** (or it silently becomes one of the largest builds):
> Include: parent sine/cosine graphs, amplitude, period, vertical shift/midline, *simple* phase shifts. Exclude in v1: extracting all parameters from heavily transformed expressions, negative coefficients combined with phase shifts, equivalent-form/phase-shift ambiguity.

**Shells ≠ builds.** 25 shells ≈ **28–31 full-build-equivalents** before reuse efficiencies. Heavier-than-unit shells: L1, L2, L7, L8, L9, L18 (and L11 is reasonable-but-not-trivial). Do not treat 25 rows as 25 uniform labor units.

**L8 (quad solving + graphing) = 1.5–2 builds by default,** not a "possible risk." Solving is symbolic; graphing is visual manipulation: same object, different instructional mechanism. Only drops toward 1 if a shared graphing component (below) is proven reusable.

### Shared graphing component: the key infrastructure bet
POL.5, FUN.4, FUN.9, and TRG.5 are all graph-manipulation/interpretation builds. **If the team builds ONE reusable graphing component early, it amortizes across all four**: this is what makes the graph-heavy expanded scope feasible rather than four separate expensive builds. Genuine cross-lesson investment; build it first if pursuing the graph nodes.

### Historical pre-pivot commitment: all 25 shells / 34 nodes
This was the selected scope before the depth-first pivot. It is retained as rationale, not as a current commitment. The registry's current product target is 62 nodes / 45 shells, pulled from the ranked Phase-2 backlog. Historical set:
- **19 base shells** (L1–L19): the diagnose→remediate loop.
- **6 expansion shells** (L20–L25): FUN.8 inverses, FUN.9 transformations, LF.2 lines, EL.5 log properties, TRG.5 sin/cos graphs, and FUN.7 composition pulled to its own shell.
- **Build-effort reality:** 25 shells ≈ **28–31 full-build-equivalents** (heavier multi-node shells L1/L2/L7/L8/L9/L18; L8 alone ~1.5–2). If L2 and L18 split under real design, **ceiling ~27 shells**. Plan capacity against the build-equivalent figure, not the shell count.
- **De-risk lever if pressure hits:** the shared graphing component (below) is what keeps the four graph-heavy shells (POL.5/FUN.4/FUN.9/TRG.5) affordable: build it first. If something must give despite committing to 25, EL.5 is still the least day-one-critical (base already has exp eval + log conversion + log eval).

---

## HISTORICAL READINESS-VALIDITY ADDITIONS

**Why:** the "reasonably prepared for Calc I" claim only holds if the tested set covers the genuinely-required prerequisites. Gap review found a pattern: the earlier cut kept the *foundational half* of several skills and backlogged the *applied half*, which is closer to what calculus actually demands. Adding back the ones that are truly prerequisite. Each verified dependency-closed.

| Node | Skill | How it enters | Cost |
|------|-------|---------------|------|
| **POL.4** | Solve quadratics: completing the square + quadratic formula | **Folds into L8** (already builds quadratic solving POL.3). Most calculus quadratics don't factor → the formula is the universal tool; completing-the-square is load-bearing downstream. Near-certain earlier oversight. | fold-in, near-zero |
| **EL.6** | Solve exponential & logarithmic equations | **Folds into the EL cluster** (L23 log properties): solving *uses* the properties, natural next stage. The applied log skill (growth/decay). | fold-in, low |
| **RAT.5** | Graph & analyze rational functions: domain, asymptotes, holes, end behavior | **New build (L26)**: graphing, not expression algebra, so no fold. But rides the shared graphing component. Directly calc-proximal (limits at infinity, discontinuities). | ~1 discounted build |
| **FUN.5** | Average rate of change | **Promote to measured node, folds into L13** (difference quotient FUN.6). Fixes a dependency inversion: FUN.6 is the generalization of FUN.5; odd to test the hard version without the parent, and FUN.6's lesson teaches avg-rate anyway. | fold-in, near-zero |

**Net:** +4 measurable nodes (→ ~38 nodes), +1 new shell (→ ~26 shells). POL.4/EL.6/FUN.5 are fold-ins; only RAT.5 is a new (discounted) build. Small price for the readiness claim being true without an asterisk.

### Historical open decision: TRG.8 (now resolved by the registry)
The pre-pivot sketch asked whether solving trig equations belonged in the product. The registry now resolves that question: `TRG.8` is a Phase-2 product-target node mapped to its own `L31` shell. It is not part of the 6-node D1 MVP.

### Historical revised pre-pivot scope
- **~38 measurable nodes** across **~26 lesson shells** (~29–32 build-equivalents).
- Readiness claim now defensible: the applied-half skills calculus actually demands (quadratic formula, solving exp/log eqns, rational-function behavior) are IN, not backlogged.
- Remaining backlog (RAT.2/4, POL.6/7, LIN.3/5/6, LF.3/4, EL.2/4, TRG.6/7, ±TRG.8) is now genuinely completeness-tier, not "required-but-cut."
