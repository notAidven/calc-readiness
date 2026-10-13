# D1 item packs

Create separate versioned files for `NUM.S`, `NUM.F`, `NUM.2`, `NUM.3`,
`NUM.4`, and `NUM.5`.

Each masterable node eventually needs:

- a validated five-slot practice pool with the locked 1×L1, 2×L2, 2×L3 mix;
- two distinct fixed-form assessment pools (A and B), one L2 and one L3 item
  per node;
- immutable item-version IDs, answer specs, and hashes (misconception tags are optional — error typing is deferred post-MVP, 2026-07-20);
- golden valid, alternate-valid, and near-miss-invalid checker fixtures.

No authored item should be shared between practice and pre/post forms.

**Adaptive-diagnostic note.** The diagnostic is a multistage adaptive test, so
each assessment form (A and B) needs one item per (node, difficulty) **cell the
multistage spec serves**: L2 on every node, L3 on the higher-tier nodes
(NUM.2/NUM.4/NUM.5), and L1 on the roots (NUM.S/NUM.F/NUM.3) — about 12 items per
form.

**Authoring model: parameterized templates (not hand-written items).** The
authoring unit is a **template** per cell (`packages/item-bank/src/d1/templates.ts`):
it draws parameters from a seeded RNG and computes the key by real arithmetic, so
one template covers a whole cell and the two parallel forms are just different
seeds. Forms A and B are **frozen** deterministically from the templates
(`freezeParallelForms`), with a guarantee that no cell's B item equals its A item.
The `@cr/item-bank` harness validates both templates (`validateTemplates`: sample
instances, each key self-consistent via the real checker) and frozen packs
(`validateItemBank`: unique ids, full A/B coverage, no practice/assessment reuse,
no parallel-form collision). An immutability snapshot pins the frozen hashes so a
template edit that changes a published form must be explicit. See
`packages/item-bank/README.md`.

**Practice pools + golden fixtures (done, 2026-07-21).** The locked five-slot
practice mix (1×L1/2×L2/2×L3 per node) is authored + frozen as `D1_PRACTICE_POOL`
(`packages/item-bank/src/d1/practice.ts`); practice-only difficulty tiers (L1 on
the higher-tier nodes, L3 on the roots) fill the cells the diagnostic spec does
not serve, and no practice item shares content with an assessment form
(`validatePracticePool` + `validateItemBank` enforce this). Golden fixtures — the
prompt-vs-key correctness anchor, with valid / alternate-valid / near-miss-invalid
cases per node — live in `packages/item-bank/src/d1/golden.ts` and run through the
real checker in `golden.test.ts`.

**Shape depth per cell (2026-07-30).** The mix gives L2 and L3 two slots each, so
a cell holding a single problem SHAPE fills both from it and the learner sees one
question type twice with only the numbers swapped. Six cells were in that position
(`NUM.2` at L2, every other node at L3), which made the repeat deterministic rather
than unlucky, in the first practice set anybody works. Every two-slot cell now holds
at least two shapes; the one-slot L1 cells may hold one. `d1.test.ts` asserts this
over all twelve two-slot cells, with the former exception list empty and pinned
empty, and the reshuffle sweep requires two DIFFERENT shapes served in each of them.
Adding a shape to a cell changes the pool, so expect the content pin to move.

The pool is one frozen snapshot; on a reveal→retry the lesson swaps in a
number-swapped sibling via `drawD1PracticeInstance(node, difficulty, { avoid })`,
backed by a pre-built, checker-registered variant set (`D1_PRACTICE_VARIANTS` /
`D1_PRACTICE_ITEMS`). Consuming that in the lesson runner is the lesson lane's job
(`engines/lesson`, Anthony).
