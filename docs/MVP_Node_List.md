# Foundational Node Set (context doc; MVP is now D1-only, see banner)

> **SCOPE UPDATE (mentor pivot): the MVP is now DEPTH-FIRST on Domain D1 (Real Numbers & Arithmetic) only, 6 nodes (NUM.S, NUM.F, NUM.2, NUM.3, NUM.4, NUM.5) / 6 per-node lessons (~3 interaction archetypes), built out richly.** The 18-node cross-domain set described below is NO LONGER the MVP; it is the **foundational tier used to prioritize ranked Phase-2 expansion** toward the full product ceiling (62 in-product nodes as of 2026-07-25, per the registry; "48-node" here was superseded by the 2026-07-24 coverage expansion, PR #50). The authoritative MVP scope is `product_scope: "mvp"` in the registry (the 6 D1 nodes) and MVP_Definition.md. This doc is kept for the foundational-set reasoning it still captures. Where it says "MVP" below, read "the foundational tier of the full product."*

*Original decision (now the full-product foundational tier, not the MVP): diagnostic engine working + all 9 neighborhoods established + foundational nodes only (18 nodes, whose per-node lessons reuse 14 interaction archetypes per the registry's node→archetype field), not all buildings.*

**The 18-node foundational set** (was mislabeled ~15). NUM.2 and NUM.3 were added to close the prerequisites of NUM.4 (the most-depended-on node). Verified prereq-closed and order-completable by graph_invariants.py reading `skill_graph.json`. (The 6-node D1 MVP subset is likewise closed, verified with MVP count = 6.)

*(Reminder: the section below describes the 18-node cross-domain FOUNDATIONAL TIER of the full product, built in Phase 2. The actual MVP is the 6 D1 nodes only. The D1 six are the "1. Real Numbers" row below.)*

## The rule (for the full-product foundational tier)
- **Diagnostic tests:** all 9 domains (so the city has all neighborhoods, storm metaphor works everywhere). *(In the MVP, only D1 is diagnosed/built.)*
- **Lessons in the foundational tier:** the 18 foundational nodes, each its own per-node lesson, reusing **14 interaction archetypes** (per the registry node→archetype field). *(The MVP subset is 6 per-node lessons / ~3 archetypes.)*
- **"Only diagnose what you can remediate":** the placement diagnostic assesses only nodes with built lessons; the rest show as unassessed roadmap. *(MVP: the 6 D1 nodes.)*

## Foundational tier set (18 nodes; only the D1 row ships in the MVP)

| Domain (neighborhood) | Foundational node(s) | Why these |
|---|---|---|
| 1. Real Numbers **(the 6-node depth-first MVP domain)** | **NUM.2** order of ops, **NUM.3** field properties, **NUM.S** signed numbers, **NUM.F** fractions, **NUM.4** evaluate/simplify, **NUM.5** proportions | NUM.4 is the most-depended-on node in the whole graph; NUM.2/NUM.3/NUM.S/NUM.F are its prerequisites (closure), NUM.5 feeds LF.1 and TRG.2. **These 6, and only these 6, are the Day-12 MVP.** |
| 2. Exponents & Radicals | **EXP.1** exponent laws, **RAD.1** simplify roots | The two entry skills of the domain |
| 3. Linear Eqns/Ineq | **LIN.1** solve linear equations | The hub; inequalities/abs-value build on it |
| 4. Polynomials & Quadratics | **POL.1** polynomial arithmetic, **POL.2** factoring | POL.2 is a major cross-domain hub (feeds rationals, quadratics, difference quotient) |
| 5. Rational Expressions | **RAT.1** simplify rational expressions | Domain hub; depends on POL.2 |
| 6. Functions & Graphs | **CG.1** coordinate plane, **FUN.1** function notation/eval | FUN.1 is the pivotal hub, 3 domains depend on it |
| 7. Linear Functions | **LF.1** slope as rate of change | Domain entry; feeds average-rate-of-change |
| 8. Exp/Log | **EL.1** evaluate exponentials | Domain entry |
| 9. Trigonometry | **TRG.1** angles/radians, **TRG.2** right-triangle trig | The base of the trig chain |

**Count: 18 foundational-tier nodes** (the MVP is the 6 D1 nodes of these; the other 12 are Phase-2 foundational builds). Real Numbers carries 6 because closing NUM.4's prerequisites pulls in NUM.2/NUM.3 (this is exactly the closure that a hand-count missed three times), and it is self-contained, which is why it makes a clean depth-first MVP.

## Dependency check (why this set is coherent)
Checked by graph_invariants.py reading `skill_graph.json`: both the 6-node D1 MVP set AND the 18-node foundational tier are prereq-closed and order-completable (each node depends only on others within its set). Authoritative because the test and product read the same registry. D1 is fully self-contained (all 6 nodes' prereqs are inside D1), which is what makes it a clean depth-first MVP. **Do not edit these sets without re-running the invariant test.**

## Full target (post-MVP backlog)
Everything beyond the foundational tier: EXP/RAD second tiers, LIN.4/5/6, POL.3/4/5, RAT.2/3/5/6, FUN.2/4/5/6/7/8/9, LF.2, EL.3/5/6, TRG.3/4/5. At MVP, placement/build is D1 only; the rest of the graph (including the other-domain foundational nodes) is Phase-2 roadmap. The authoritative in/out and scope status per node is the registry `product_scope` field (`mvp` = the 6 D1 nodes; `target` = the other 56 product nodes as of 2026-07-25 — was 42 before the 2026-07-24 coverage expansion, PR #50).

## Implication for the "before/after" success metric
At MVP, the before/after gain is measured on the **6 D1 nodes** (a small, honest instrument: "measured pre/post gain on foundational arithmetic-fluency skills," scoped to D1). When the full foundational tier is built (Phase 2), the metric broadens to the foundational set. Parallel forms still required (different items pre vs. post) or the gain is retest-inflated.

## Open
- **Node-count reconciliation (RESOLVED).** One machine-readable registry now exists (`skill_graph.json`); graph_invariants.py reads it and computes counts. Full graph = **62 CORE** (6 `active_mvp` + 56 `active_post_mvp`) as of 2026-07-25, plus retired/cut dead IDs; the `extended` and `secondary` populations are empty. Product scope: 6 `mvp` + 56 `target` = **62 in-product nodes**, i.e. all of CORE. The old "40" was untraceable and is retired; the later "56 CORE + 1 secondary / 48 in-product / 9 extended" reading was superseded by the 2026-07-24 coverage expansion (PR #50) and the 2026-07-25 RAD.4 append (PR #63).
