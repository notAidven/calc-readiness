# Prerequisite Edges: for routing & roads (simplified)

*Plain A→B dependency map. NOTE: `skill_graph.json` is now the machine-readable source of truth for edges and node status; this doc is the human-readable companion. If they disagree, the JSON wins and this doc should be updated. Full graph = 62 CORE nodes as of 2026-07-25 (the `secondary` and `extended` populations are empty; count from the JSON, not from this line). Edges drive diagnostic routing (where to send a student who fails) and the game's road network. **Cut-score no longer uses this**: readiness is scope-tagged all-nodes-mastered (foundational = the 6 D1 MVP nodes; product = the in-product nodes, all 62 of them), so there's no hub list to maintain. Three nodes have authored item-family breakdowns. First-pass from standard math structure; team verifies edges in Week 1.*

## Design decision: no typed-edge schema
Considered a metadata system (type: hard/soft/item-family, routing_weight, storm_weight, road_visible, cut_score_gate). **Rejected as over-engineered for the sprint.** Edges are plain A→B. Cut-score = all in-scope nodes mastered (doesn't read edges). Only the authored item-family nodes get a note. Roads = the edges, shown as-is.

## Edges by domain (A → B = A is prerequisite of B)

**D1 Real Numbers**
- NUM.S → NUM.2; NUM.F → NUM.2 (order-of-operations practice runs on signed/fraction values)
- NUM.2 → NUM.4; NUM.3 → NUM.4; NUM.S → NUM.4; NUM.F → NUM.4 (evaluate/simplify needs order-of-ops, properties, and signed/fraction fluency)
- NUM.F → NUM.5 (proportions use fractions)

**D2 Exponents & Radicals**
- NUM.4 → EXP.1; NUM.4 → RAD.1
- RAD.1 → RAD.2; EXP.1 + RAD.1 → RAD.3

**D3 Linear Equations**
- NUM.4 → LIN.1
- LIN.1 → LIN.4; LIN.1 → LIN.5; LIN.4 + LIN.5 → LIN.6

**D4 Polynomials & Quadratics**
- NUM.4 → POL.1 → POL.2
- POL.1 + CG.1 + FUN.1 → POL.5 (graph quadratics)
- POL.1 → POL.6 → POL.7 [backlog]
- **POL.3: ITEM-FAMILY node** (solve quadratics): *factoring items* need POL.2; *square-root items* need RAD.1; *completing-square / formula items* need POL.1 + LIN.1 + RAD.1. Not one universal prereq.

**D5 Rational**
- POL.2 → RAT.1 → RAT.2; RAT.1 + NUM.F → RAT.3
- RAT.2 + RAT.3 → RAT.4 [backlog]
- RAT.1 + FUN.1 (+ FUN.2 for domain items) → RAT.5 (rational graphs)
- LIN.1 + RAT.1 → RAT.6 [backlog]

**D6 Functions**
- NUM.4 → CG.1; NUM.4 → FUN.1
- FUN.1 → FUN.2; FUN.1 + CG.1 → FUN.4
- FUN.1 → FUN.5 (avg rate of change). *(LF.1 → FUN.5 is a soft/conceptual precursor, not a hard gate: slope motivates avg-rate but isn't required to compute it.)*
- FUN.1 → FUN.7; FUN.1 + CG.1 → FUN.9
- **FUN.6: ITEM-FAMILY node** (difference quotient): *polynomial items* need POL.1 (expand/combine); *rational items* need RAT.1–3 (combine fractions). Initial Phase-2 authoring family = polynomial only.
- **FUN.8: ITEM-FAMILY node** (inverses): *one-to-one test* needs FUN.1 + FUN.4; *find inverse algebraically* needs FUN.1 + LIN.1; *verify by composition* needs FUN.7. Not universally FUN.7.

**D7 Linear Functions**
- FUN.1 + CG.1 → LF.1 → LF.2 (LIN.1 → LF.2 for converting forms/intercepts)
- NUM.5 → LF.1 (contextual rate interpretation)

**D8 Exp/Log**
- EXP.1 + FUN.1 → EL.1 → EL.3 → EL.5
- **EL.6: ITEM-FAMILY node** (solve exp/log eqns): *same-base exponential* needs EXP.1 + LIN.1; *log-requiring exponential* needs EL.3/EL.5 + LIN.1; *log equations* need EL.5 + LIN.1; *domain/extraneous items* add FUN.2. Not universally EL.5.

**D9 Trigonometry**
- NUM.4 → TRG.1 (radians/angles)
- TRG.2 (right-triangle trig) needs NUM.5 + RAD.1 (special-triangle values): **not gated behind TRG.1**; right-triangle trig is learnable in degrees without radians.
- TRG.3 (unit circle/reference angles): TRG.1 + TRG.2 are conceptual precursors (soft), not hard gates.
- TRG.3 → TRG.4
- TRG.3 + FUN.9 → TRG.5 (graphs) [product target; not D1 MVP]
- **TRG.8: ITEM-FAMILY node** (solve trig eqns): *unit-circle equations* need TRG.4; *linear forms* need TRG.4 + LIN.1; *quadratic-in-form* need TRG.4 + POL.3. Not universally POL.3. [full target, not MVP]

## Corrections taken from review (regardless of simplification)
- **Removed universal TRG.1 → TRG.2** (right-triangle trig doesn't require radians first).
- **Removed universal POL.3 → TRG.8** (only quadratic-in-form trig items need it: now an item-family note).
- **LF.1 → FUN.5 is soft**, not a hard gate.
- **Added NUM.F → RAT.3, FUN.1/FUN.2 → RAT.5, NUM.5 → LF.1** (missing edges).

## The 3 item-family nodes (the only ones needing a note)
| Node | Families & their upstream needs |
|------|--------------------------------|
| POL.3 solve quadratics | factoring→POL.2 · square-root→RAD.1 · formula/complete-square→POL.1+LIN.1+RAD.1 |
| FUN.6 difference quotient | polynomial→POL.1 · rational→RAT.1–3 (initial Phase-2 family: polynomial only) |
| EL.6 solve exp/log | same-base→EXP.1+LIN.1 · log-requiring→EL.3/5+LIN.1 · log eqns→EL.5+LIN.1 |

## What the team verifies (Week 1)
1. Each edge real (does B genuinely need A)? Any missing? Any cycles?
2. The 3 item-family breakdowns correct?
3. Cross-domain edges (highest blast radius): POL.2→RAT.1, FUN.1→EL.1, EXP.1→EL.1, FUN.9→TRG.5. (LF.1→FUN.5 now soft, lower stakes.)

## Note
Cut-score = all nodes in the requested readiness scope mastered, so a wrong edge now only affects *routing and roads*, not the readiness verdict: lower blast radius than the earlier hub-based design. `foundational` covers the 6 D1 MVP nodes; `product` covers the in-product nodes (62 as of 2026-07-25 — the population is `product_scope` ∈ {`mvp`, `target`} in the registry, not this number).
