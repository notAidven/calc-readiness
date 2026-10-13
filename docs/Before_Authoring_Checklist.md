# Before Authoring Scales: the pre-authoring gate

*Two operational tasks that gate item authoring. Neither is design (the specs are settled); both are "prove it works before we generate content against it." Skipping either means authoring fast against rules that might not hold, which is the expensive-rework trap both reviews warned about.*

---

## Gate 1: D1 answer-checker capability spike (moves the MVP slice of Answer_Equivalence_Spec from v0.8 to locked)

**Goal:** prove the chosen parser/evaluator handles the 6-node D1 MVP's item forms in BOTH the browser and the server runtime, with identical verdicts. Until this passes, authoring proceeds only for D1 categories the spike has cleared. The graph comparator is a separate Phase-2 gate because the D1 MVP has no graph-response items.

**Current status:** implementation candidate PASSES 22 shared golden cases in Node and Chromium. See `D1_Checker_Spike.md`. Team review of fixture coverage and accepted grammar is still required before the D1 slice is declared locked.

**Steps:**
1. Pick the candidate stack (math.js-class evaluator + a symbolic-equality routine; graph comparator separate).
2. For each D1 MVP node (`NUM.S`, `NUM.F`, `NUM.2`, `NUM.3`, `NUM.4`, `NUM.5`), assemble a tiny probe set: one clearly-valid answer, one near-miss-invalid, and one alternate-valid form where relevant.
3. Run every probe through the checker in the browser AND the server/edge runtime. Verdicts must match each other and the intended result.
4. For any category that fails, record the decision: narrow the accepted grammar, write a node-specific deterministic checker, or drop that item form from MVP.

**Run the D1 risks first:**
- **NUM.S / NUM.F:** unary-minus precedence and fraction-vs-decimal representation.
- **NUM.2 / NUM.3 / NUM.4:** order-of-operations parsing, equivalent expression forms, and the declared definition of "simplified."
- **NUM.5:** proportion answers, percent representation, and required exact-unit aliases.

**Phase-2 high-risk categories:** before authoring later product nodes, separately clear `RAT.1` domain-aware rational equality, `POL.2` factoring structure, `RAD.1` radical canonicalization, solution sets, exact trig values, and graph responses. The graph comparator gets its own browser/server golden set before the first graph-bearing lesson is authored.

**Done when:** every D1 MVP category is either passing in both runtimes or explicitly narrowed/deferred with the decision written down. Then lock the D1 checker slice; later answer categories remain gated until their Phase-2 spikes pass.

---

## Gate 2: Automated invariant test (permanent fix for the count/closure errors)

**Already built and reading the source of truth:** `graph_invariants.py` reads `skill_graph.json` (the registry the product also consumes) and checks: the 6-node D1 MVP set is prereq-closed, the MVP is completable in a valid order, there are no cycles or dangling/non-live prerequisites, and the product / lesson-archetype counts remain consistent. Counts are computed from the registry, never asserted. Currently PASSES.

**Current status and next checks:**
1. **DONE:** the TypeScript loader and product scaffold read `skill_graph.json` directly, so the product and invariant test share one registry.
2. **DONE:** graph invariants run in CI on every push and pull request.
3. **NEXT:** add item-bank invariants as content lands: every item declares a full AnswerSpec; predicates/profiles exist; no pre/post item uses a deferred feature; rational answers declare exclusions. (Diagnostic distractor misconception tags are NOT an MVP invariant — error typing is deferred post-MVP, 2026-07-20; the `misconception_tag` field stays optional.)

**Why it matters:** the MVP set was called "dependency-closed" three times while missing NUM.2/NUM.3/NUM.4. This test makes that specific mistake impossible to repeat, because closure is computed from the real edges, never a hand count.

---

## Also flagged (not blocking, but don't lose it)
- **Node-count reconciliation (RESOLVED).** Previously the spine, the edge file, and a "40-node" label disagreed. Now there is one machine-readable registry, `skill_graph.json`, with a lifecycle status per node. Counts are computed by graph_invariants.py, never asserted in prose: as of 2026-07-25, **62 CORE** (6 `active_mvp` + 56 `active_post_mvp`) + retired/cut IDs, with the `extended` and `secondary` populations empty. Product scope is a separate axis but now coincides with CORE: 6 `mvp` + 56 `target` = **62 in-product nodes**. The untraceable "40" is retired, and so is the "56 CORE + 1 secondary (TRG.6) / 48 in-product / 9 extended" reading — superseded by the 2026-07-24 coverage expansion (PR #50) and the 2026-07-25 RAD.4 append (PR #63).
