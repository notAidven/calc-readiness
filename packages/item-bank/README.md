# @cr/item-bank (Gabe's lane)

> **Authoring a new item pack?** Start with **[`AUTHORING.md`](./AUTHORING.md)** — a
> step-by-step "author + validate an item pack" quickstart (answer-type→helper→checker
> map, golden fixtures, running the v2 checker, and an end-to-end worked example).
> This README is the design rationale + status companion.

Single source of truth for D1 items. Each authored item feeds **both** the
diagnostic bank (serving) and the authoritative checker (grading), so the two
never drift. Designed for the full build: **parameterized templates** are the
authoring unit, not hand-written items.

## Authoring model

1. **Templates** (`src/d1/templates.ts`) — one `ItemTemplate` per (node,
   difficulty) cell. `generate(rng)` draws parameters from a seeded, deterministic
   RNG and computes the answer key by real arithmetic, so keys are correct by
   construction. One template covers a whole cell.
2. **Freeze** (`freezeParallelForms`) — deterministically freeze one instance per
   template into the two parallel assessment forms (A = pre pool, B = post pool),
   guaranteeing no cell's B item is identical to its A item. Frozen items carry
   `template_id` + `template_params` for provenance (Contracts §4.1).
3. **Validate** — `validateTemplates` samples many instances per template and
   confirms each grades `correct` through the real D1 checker (catches a
   parameter range that yields a bad key before anything is frozen).
   `validateItemBank` checks the frozen packs: unique ids, full coverage of every
   spec cell per form, no practice/assessment reuse, no parallel-form collision,
   and per-item self-consistency.
4. **Serve / grade** — `createItemBank(entries)` implements the diagnostic
   engine's `DiagnosticItemBank` port; `toD1ItemVersions(entries)` projects the
   checker registry from the same entries.

## Practice pools

Lessons need a per-node practice set, not the served diagnostic cells. `src/d1/practice.ts`
adds the practice-only difficulty tiers (L1 on the higher-tier nodes, L3 on the
roots) so every node has a full L1/L2/L3 grid, then freezes `D1_PRACTICE_POOL` —
the locked **1×L1/2×L2/2×L3** five-slot mix per node (`PRACTICE_SET_SIZE`), tagged
`form: "practice"`. The freeze avoids every assessment item's content hash, so no
item is shared between a practice and an assessment pool. `validatePracticePool`
checks the composition, distinctness, and per-key self-consistency;
`createItemBank` never serves `practice` items.

### Retry variants (number-swap on reveal)

The 30 pool items are one frozen snapshot; the templates generate many
number-swapped variants of the same skill. `D1_PRACTICE_VARIANTS` pre-builds up to
`D1_PRACTICE_RETRY_VARIANTS_PER_CELL` distinct variants per cell (disjoint from the
assessment forms **and** the pool), and `drawD1PracticeInstance(node, difficulty, { avoid })`
serves the next unused one on a reveal→retry. Because the global checker is
configured **once** (`configureAnswerChecker`), the gradable set is fixed at
startup — so a consumer registers the whole practice set once and draws only from it:

```ts
configureAnswerChecker(
  createD1AnswerChecker({
    itemVersions: toD1ItemVersions([...D1_ITEM_PACK, ...D1_PRACTICE_ITEMS]),
  }),
);
const initial = getD1PracticeSet("NUM.2");                    // the canonical 5
const fresh = drawD1PracticeInstance("NUM.2", 2, { avoid });  // reveal -> retry
```

`drawD1PracticeInstance` returns `undefined` once a cell's variants are exhausted
(many retries on one slot, or a tiny cell like NUM.F L1 = `1/d + 1/d`) — the
consumer falls back to reuse or advances. Every returned item is in
`D1_PRACTICE_ITEMS`, so it is gradable once that set is registered.

## Golden fixtures

`src/d1/golden.ts` is the prompt-vs-key correctness anchor templates can't give:
hand-authored, human-reviewed fixtures with a fixed prompt, the key + equivalent
`alternate_valid` forms that MUST grade correct, and the `near_miss` wrong answers
(order-of-operations slips, sign errors, unsimplified forms) that MUST grade
incorrect. `golden.test.ts` runs them through the real D1 checker.

## Product pack (Phase-2 / v2)

`src/product/` authors the expansion item banks for the full 12-node
foundational spine the **v2 product checker** (`createProductAnswerChecker`,
`PRODUCT_CHECKER_VERSION`) clears: LIN.1, POL.1, POL.2, RAT.1, CG.1, FUN.1, LF.1,
RAD.1, EL.1, EXP.1, TRG.1, TRG.2. Same model as D1: one parameterized L2
`ItemTemplate` per node (`product/templates.ts`, keys computed by real arithmetic,
each with a structural `varietyKey`), frozen via `freezeDeepParallelForms` into
`PRODUCT_ITEM_PACK` (a walk-style pool, >=3 parallel items per served node per form
= 12 x 3 x 2 = 72 items), plus per-node `product/golden.ts` anchors with
reason-coded near-misses. The validation harness is checker-parameterized: pass
`PRODUCT_CHECKER_CONFIG` to `validateTemplates`/`validateWalkPool`/... to grade a
v2 pack (the default stays the locked D1 v1 checker, so existing packs are
unaffected). Product answer-def helpers (`radicalAnswer`, `solutionSetAnswer`,
`standardPolyAnswer`, `factoredAnswer`, `rationalAnswer`, `pointAnswer`,
`precisionAnswer`, `representedNumericAnswer`, `multipleChoiceAnswer`,
`positiveExponentAnswer`, `exactTrigValueAnswer`, `exactRadianAnswer`,
`multipartAnswer`) sit next to `numericAnswer`/`expressionAnswer`. Goldens run
through the v2 checker in Node (`product-golden.test.ts`) AND Chromium
(`product-golden.browser.test.ts`).

EXP.1 (`positive_exponents`), TRG.2 (`canonical_exact_trig_value` special-angle
values, authored as a multipart angle->value table), and TRG.1 (exact radian /
`pi`-multiple conversions) were the last three, unblocked when the v2 checker
gained those features. The product pack is **authored + validated but not yet
served**: the live diagnostic stays D1-scoped until the matching lessons exist
(only diagnose what you can remediate).

## Immutability

Freezing is deterministic (fixed seed bases), so the forms are stable item
versions. A snapshot test pins the frozen content hashes: a template edit that
changes a published form fails CI until the change is made explicit (a version
event). Eventual publish to the S3 asset bucket (Contracts §5) exports these
frozen packs; the deterministic freeze is the current source.

**Provenance — v1 D1 forms rebaselined (2026-07-23).** The v1 D1 assessment forms
and their pinned `template.test.ts.snap` hashes were **rebaselined by PR #17** (a
cross-lane change to the shared `combined_polynomial` grader + NUM.F
`reducedFractionAnswer`) and **ratified by the owner (Gabe)** under the cross-lane
change policy (`OWNERS.md`; `docs/Answer_Equivalence_Spec.md`). The re-pinned
snapshot is correct as ratified; a future *unexplained* diff is still a version event.

## Scope / limits

- Prompt-vs-key **correctness** is anchored by the golden fixtures above
  (`src/d1/golden.ts`), covering every D1 node.
- D1 practice pools (1×L1/2×L2/2×L3) are authored + validated (`src/d1/practice.ts`).
  Wiring `D1_PRACTICE_POOL` into the lesson runner (fresh-instance retries drawing
  siblings) is the lesson lane's job.
- Difficulty tiers are author-assigned (provisional; IRT calibration deferred,
  Adaptive-Diagnostic amendment §10).
- Expansion domains: the v2-cleared categories (radicals, univariate factoring,
  domain-aware rationals, solution sets, points, target polynomial form, numeric
  precision, positive-exponent form, exact special-angle trig values, exact radian
  / `pi` conversions) are now authored for the full 12-node foundational spine (see
  "Product pack" above). The still-gated categories (graphs, `is_vertex_form`,
  `set_builder`, general equation/inequality equivalence incl. general trig/log
  identities) remain blocked on the checker (Answer_Equivalence_Spec v0.10).

Build against the frozen shared interfaces; do not edit them (or another owner's lane) without the owning developer's review + explicit approval, documented per the cross-lane change policy (`OWNERS.md`).
