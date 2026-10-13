# Authoring & validating an item pack — quickstart

*A practical, skimmable guide for authoring a new node's item pack and getting it to
green validation without pairing. Read `README.md` first for the design rationale;
this doc is the "how do I actually add items" companion.*

**Who this is for.** Item authoring for the product-expansion nodes (the ~30
`product_scope: "target"` nodes not yet in `PRODUCT_TEMPLATES`) is now Anthony's.
> **2026-07-31: so is the rest of this package.** `docs/Content_Authoring_Split.md` §11 gave
> Anthony the item bank whole — the schema, the harness and the answer-checker as well as the
> content — on the line *Anthony has the learning, Gabe has the game*. The paragraph below is
> still an accurate account of who BUILT the machinery; it is no longer an account of who owns
> it, and a change to it now takes Anthony's review rather than Gabe's.
The item-bank harness, templates, schema, and the answer-checker (v1 D1 + v2
product) stay Gabe-owned — build against them, don't edit them (cross-lane change
policy, `OWNERS.md`).

**The one rule that governs everything.** *Only author an answer category the
checker already clears.* The library's capability, proven by a Node+Chromium
spike, decides which item forms are supportable; "author now, confirm the checker
later" is the expensive-rework trap the specs repeatedly warn about
(`Answer_Equivalence_Spec.md` §0/§9). The [category map](#3-answer-type--helper--checker-category)
below marks what is supported today vs deferred.

---

## TL;DR — the authoring loop

1. **Pick the node** and confirm its answer category is checker-supported (§3 table).
2. **Write one parameterized `ItemTemplate`** whose key is computed by real
   arithmetic (correct by construction), using an [answer-def helper](#3-answer-type--helper--checker-category).
3. **Run `validateTemplates(..., PRODUCT_CHECKER_CONFIG)`** — samples many instances
   and grades each through the *real* v2 checker.
4. **Freeze** the template into the walk pool and **run `validateWalkPool(..., PRODUCT_CHECKER_CONFIG)`**.
5. **Write ≥1 golden fixture** (fixed prompt, `alternate_valid` forms, reason-coded
   `near_miss` wrongs) so prompt↔key correctness is anchored.
6. **`npm run test:unit`** (+ `npm run test:browser` for golden parity) until green.

Every validator takes the checker config as its **last argument**. Pass
`PRODUCT_CHECKER_CONFIG` for product (v2) nodes — the default is the locked D1 v1
checker, which does not implement the product categories.

---

## 1. Where everything lives

```
packages/item-bank/
├─ README.md            design rationale + status (read first)
├─ AUTHORING.md         this guide
└─ src/
   ├─ schema.ts         ItemPackEntry (the single source-of-truth item shape) + hashItemDefinition
   ├─ template.ts       Rng, ItemTemplate, freeze* helpers, and ALL answer-def helpers
   │                    (numericAnswer, radicalAnswer, solutionSetAnswer, standardPolyAnswer,
   │                     factoredAnswer, rationalAnswer, pointAnswer, precisionAnswer,
   │                     representedNumericAnswer, multipleChoiceAnswer, reducedFractionAnswer,
   │                     positiveExponentAnswer, exactTrigValueAnswer, exactRadianAnswer, multipartAnswer)
   ├─ validate.ts       validateTemplates / validateItemBank / validateWalkPool /
   │                    validatePracticePool + CheckerConfig (D1_CHECKER_CONFIG, PRODUCT_CHECKER_CONFIG)
   ├─ bank.ts           createItemBank / createItemPackWalkSource + to{D1,Product}ItemVersions
   ├─ promptFormat.ts   KaTeX/prompt helpers (latexFrac, evaluateMath, ...)
   ├─ d1/               the locked v1 D1 pack
   │   ├─ nodes/<NODE>/ ONE dir per node (NUM.S, NUM.F, ...) — that node's generators
   │   │                (diagnostic + walk + practice-only + extra templates + golden)
   │   ├─ nodes/_shared.ts  formatting helpers shared across the node files
   │   ├─ templates.ts / walk-templates.ts / practice.ts / golden.ts  thin AGGREGATORS
   │   │                (import the per-node generators, concatenate in frozen order)
   │   └─ index.ts / hints.ts
   └─ product/          the Phase-2 v2 pack you extend
       ├─ nodes/<NODE>/ ONE dir per node (LIN.1, POL.1, ...) — that node's template + golden
       ├─ nodes/_shared.ts  formatting helpers shared across the node files
       └─ templates.ts / golden.ts / index.ts  thin AGGREGATORS + freeze/PRODUCT_NODES
```

> **Per-node layout (2026-07-24 refactor).** Each node's item content now lives in
> its own `nodes/<NODE>/index.ts` — a template's `generate()` bodies, its walk/
> practice/extra shapes, and its golden fixtures. The old `templates.ts`/`golden.ts`/
> `practice.ts`/`walk-templates.ts` files are now thin **aggregators** that import the
> per-node exports and concatenate them into the SAME exported arrays
> (`D1_TEMPLATES`, `PRODUCT_TEMPLATES`, `PRODUCT_GOLDEN_FIXTURES`, ...), preserving the
> exact element order that pins the frozen assessment forms. **This is what makes
> item authoring conflict-free:** two authors adding different nodes edit different
> `nodes/<NODE>/` dirs and never collide on a shared array. The answer-def helpers
> still live in `src/template.ts` (singular).

### The single-source-of-truth idea

One authored item carries **both** halves: the serving metadata the diagnostic
needs *and* the answer definition the checker grades against, so the served item
and the graded item can never drift.

```ts
// src/schema.ts
interface ItemPackEntry {
  item_version_id: string;   // immutable, never reused across pools
  node_id: string;           // the skill node this item measures
  difficulty: ItemDifficulty;
  form: "A" | "B" | "practice";
  prompt: string;            // student-facing question
  answer: D1AnswerDefinition; // answer_key + answer_spec, consumed verbatim by the checker
}
```

`bank.ts` projects the two views from the same entries: `createItemPackWalkSource`
(serving) and `toProductItemVersions` → `createProductAnswerChecker` (grading).

### The product pack model (what you extend)

The product pack uses the **walk** model, not the D1 multistage grid:

- **One L2 `ItemTemplate` per node** in `src/product/nodes/<NODE>/index.ts`.
  `generate(rng)` draws params from a seeded deterministic RNG and computes the key
  by real arithmetic, so the key is correct by construction. Each template also
  declares a structural `varietyKey` so a served cell can't freeze near-twins.
  `src/product/templates.ts` is the aggregator that concatenates the per-node
  templates into `PRODUCT_TEMPLATES` in the frozen order.
- **`freezeDeepParallelForms`** freezes `PRODUCT_WALK_ITEMS_PER_CELL` (= 3) parallel
  instances per node into each of Form A (pre) and Form B (post) → `PRODUCT_ITEM_PACK`.
  The walk adjudicates each node 2-of-3, so a served cell needs ≥3 distinct items
  and A must never reuse a B item.
- **Per-node golden fixtures** live in the same `src/product/nodes/<NODE>/index.ts`
  and are aggregated by `src/product/golden.ts` into `PRODUCT_GOLDEN_FIXTURES`.

Templates are authored; freezing is deterministic (fixed seed bases), so the pool
is a set of stable item versions. A snapshot test (`product.test.ts`) pins the
frozen content hashes — a template edit that changes a published item fails CI
until the change is explicit.

---

## 2. How nodes tie to lessons

`packages/skill-graph/src/skill_graph.json` is the **source of truth** for node
identity and the `node → lesson_shell` mapping. Each node carries a `product_scope`
(`mvp` / `target` / `extended`) and a `lesson_shell` (e.g. `"L6"`):

```json
{ "id": "LIN.1", "domain": "D3", "product_scope": "target",
  "prereqs": ["NUM.4"], "lesson_shell": "L6" }
```

The pipeline is **author per node → diagnose per node → remediate per lesson**:

- You author items keyed to a `node_id`. The diagnostic serves them to *measure*
  that skill; the lesson referenced by the node's `lesson_shell` *remediates* it.
- Several nodes can share one lesson shell (LIN.1/LIN.3/LIN.4 all map to `L6`).
- **"Only diagnose what you can remediate."** The product pack is authored +
  validated but **not yet served** — the live diagnostic stays D1-scoped until the
  matching lessons exist. So authoring a node's pack is decoupled from wiring it
  into serving; your job is to get the pack green and golden-anchored.

**What to author now:** the `product_scope: "target"` nodes whose answer category
the v2 checker clears (§3). The 12-node foundational spine (`PRODUCT_NODES`) is
already done as your reference; the remaining target nodes are the queue. Don't
author a node whose only sensible answer form is a **deferred** category.

---

## 3. Answer type → helper → checker category

Each item declares a **compositional `AnswerSpec`** — independent fields
(`answer_type`, `equivalence`, `representation`, `simplification`, `required_form`,
`required_notation`, `precision`, `unit_policy`), never one bundled "mode"
(`Answer_Equivalence_Spec.md` §1). Every field must be set explicitly — missing =
authoring reject (§13.3). The answer-def helpers exist precisely so you don't
hand-write specs: each one fills every field for its category.

### Supported today (helper exists)

| What the item tests | `answer_type` + key spec fields | Helper (`src/template.ts`) | Checker path (spec §) | Example node |
|---|---|---|---|---|
| Plain exact value | `numeric`, `exact_value`, rep `any` | `numericAnswer` | `compareNumericExact` (§6) | FUN.1 |
| Reduced fraction | `numeric`, rep `fraction`, `reduced_fraction` | `reducedFractionAnswer` | reduced_fraction profile (§4) | NUM.F |
| Value in a required representation | `numeric`, rep `fraction`/`decimal`/`exact` | `representedNumericAnswer` | representation axis (§1/§6) | LF.1 (slope) |
| Rounded decimal (declared precision) | `numeric` + `precision` | `precisionAnswer` | `comparePrecision` (§6) | EL.1 |
| Simplified radical | `numeric`, rep `exact`, `simplified_radical` | `radicalAnswer` | `compareRadical` (§4/§5) | RAD.1, CG.1 (distance) |
| Exact special-angle trig value | `numeric`, rep `exact`, `canonical_exact_trig_value` | `exactTrigValueAnswer` | `compareRadical` (§4) | TRG.2 |
| Exact radian (π-multiple) | `numeric`, rep `exact`, `allowed_symbols:["pi"]` | `exactRadianAnswer` | `comparePiExact` (§6) | TRG.1 |
| Solution set | `solution_set`, `structural` | `solutionSetAnswer` | `compareSolutionSet` (§2) | LIN.1, **POL.3** |
| Expand / simplify polynomial | `expression`, `symbolic`, `combined_polynomial` | `expressionAnswer` | combined_polynomial (§4) | NUM.3/NUM.4 |
| Expand, constants combined | `expression`, `symbolic`, `combined_constants` | `combinedConstantsAnswer` | combined_constants (§4) | NUM.3 L3 |
| Standard-form polynomial | `expression` + `is_standard_polynomial` | `standardPolyAnswer` | `compareStandardPolynomial` (§5) | POL.1 |
| Factor over the integers | `expression`, `structural`, `fully_factored_over_integers` | `factoredAnswer` | `compareFactored` (§5) | POL.2 |
| Positive-exponent form | `expression`, `symbolic`, `positive_exponents` | `positiveExponentAnswer` | `compareExponentExpression` (§4) | EXP.1 |
| Domain-aware rational | `rational_answer`, `structural`, `excluded_values` | `rationalAnswer` | `compareRationalAnswer` (§3) | RAT.1 |
| Ordered pair | `point`, `structural` | `pointAnswer` | `comparePoint` (§2) | CG.1 (midpoint) |
| Single-select choice | `multiple_choice` | `multipleChoiceAnswer` | `compareMultipleChoice` (§2) | FUN.1, LF.1 (classify) |
| Bundled multi-part answer | `multipart` (each part its own spec) | `multipartAnswer` | `compareMultipart` (§2) | TRG.2 (angle→value table) |

### Supported by the v2 checker, but no helper yet

The checker clears these; there's just no ready-made helper. Author the `AnswerSpec`
inline (all fields explicit) or add a small helper next to the others.

| What the item tests | `answer_type` + key spec fields | Checker path (spec §) | Example node |
|---|---|---|---|
| Inequality solution (interval) | `interval`, `required_notation:"interval"` | `compareInterval` (§2) | LIN.4 |
| Target equation form | `equation_form`, `is_slope_intercept` | `compareEquationForm` (§2/§5) | LF target-form |

### Deferred — do NOT author (checker does not clear)

Per `Answer_Equivalence_Spec.md` §10 (the source of truth), the ONLY still-uncleared
categories are:

- **General equation/inequality equivalence** and general **trig/log identities**
  beyond the EL.5 log expand/condense slice — §10. This gates the *items* of **TRG.4
  and TRG.8** only (their lessons are never blocked). It is reached only when the
  learner's **answer is itself an equation or an identity**; an item that asks for the
  *solution* of one is not gated by it, however general the equation in the prompt.

> **Cleared 2026-07-30 (spec v0.17): EL.6 left the list above.** Solving an exponential
> or logarithmic equation submits a number, a rounded number, or a `solution_set`, all
> cleared at or before checker version 2, so EL.6 was listed against a category its
> items never needed. One narrow addition was genuinely owed and is now in: a roster may
> hold **exact symbolic members** (`{ln(2), ln(3)}`) when the item declares
> `representation: "exact"`, which `exactSolutionSetAnswer()` emits. Read that helper's
> docblock before using it: members need parentheses (`ln(2)`, not `ln 2`), `log` is the
> common logarithm and `ln` the natural one, a decimal member grades
> `wrong_representation`, and `e` is not bound on this path. Items wanting a *rounded*
> root stay single-answer `precisionAnswer`; per-member precision on a roster is not
> supported. Every roster item that does not declare `representation: "exact"` takes the
> byte-identical rational path, which `d8.test.ts`'s bank-wide census pins.

> **Cleared since v0.13 (previously listed here):** vertex form
> (`required_form: "is_vertex_form"`), set-builder notation
> (`required_notation: "set_builder"`), and scored graph answers (the geometric
> comparator, §8) are all now authorable. See the graph section below for how graph
> answers are authored (a separate pack, not a text `AnswerSpec`).

> `product.test.ts` §13.4 fails CI if any authored text spec uses a blocked
> `simplification` / `required_form` / `required_notation`, or an `answer_type:
> "graph"`. The `answer_type: "graph"` guard stays: a graph answer is NEVER a text
> `AnswerSpec` item — it is authored in the separate graph pack below.

### Scored graph responses — authored separately (cleared v0.13)

Scored graph answers (`answer_type: "graph"`) are now authorable (Answer_Equivalence_Spec
§8 CLEARED, `Graph_Comparator_Spike.md`), but they do NOT use the text `AnswerSpec` /
`ItemPackEntry` shape or the product text checker. A graph answer is a structured
numeric payload (`GraphResponsePayload`: samples / points / scalars / region
memberships, never a bitmap) scored by the **separate geometric comparator**
(`createGraphComparator`, checker version 2, same generation as `PRODUCT_CHECKER_CONFIG`).

Author graph slices in **`src/graph/slices.ts`** as `GraphAuthoredSlice`s — each
bundles the author-owned `expected` answer key (reference curve + tolerances +
scored features) with a `valid` response, >=2 `alternate_valid` responses, and
reason-coded `near_miss` responses — then validate with **`validateGraphPool`**
(the graph analog of `validateWalkPool`; it grades every authored response through
the real comparator and enforces the §13.5/§13.6 golden-coverage rules). The suites
are `src/graph.test.ts` (Node) + `src/graph.browser.test.ts` (Chromium parity).
Supported curve/feature/region kinds and what stays fail-closed are in
Answer_Equivalence_Spec §8. The interactive scored-SVG input is `GraphInput`
(`@cr/components`); a served item hands the widget an ANSWER-FREE workspace via
`toGraphWorkspace`, so the client never holds the key.

Concretely, a helper just fills the compositional spec — e.g. RAT.1's domain-aware
rational answer carries the simplified expression **and** the inherited exclusions:

```ts
// src/template.ts — one representative helper
export function rationalAnswer(answer_key, excludedValues, allowedSymbols = ["x"]) {
  return {
    answer_key,
    allowed_symbols: allowedSymbols,
    excluded_values: excludedValues,          // dropping an exclusion is WRONG even if the expr is right (§3)
    answer_spec: {
      answer_type: "rational_answer", equivalence: "structural",
      representation: "any", simplification: "none",
      required_form: null, required_notation: "none",
      precision: null, unit_policy: "none",
    },
  };
}
```

---

## 4. Golden fixtures (valid / alternate-valid / near-miss)

A template guarantees a key is **self-consistent** (it grades correct under its own
spec). It does **not** guarantee the key is the *right answer to the prompt* — a
template can compute a self-consistent but wrong key. Golden fixtures close that
gap with hand-authored, human-reviewed anchors. Each fixture has three buckets:

| Bucket | Must grade | Why it matters |
|---|---|---|
| `valid` | `correct` | The canonical key answers the prompt. |
| `alternate_valid[]` | `correct` | Equivalent forms the checker must *also* accept (`x^2+5x+6` vs `x^2 + 5*x + 6`; `{3,2}` vs `{2,3}`; `sqrt(2)*2` vs `2*sqrt(2)`). Guards against an over-strict checker / over-narrow key. |
| `near_miss[]` | `incorrect` **with a specific `reason`** | The exact misconception the item catches (order-of-operations slip, sign error, unsimplified form, dropped domain exclusion). Guards against an over-lenient checker and documents the intended failure. |

CI rules the product golden suite enforces (`Answer_Equivalence_Spec.md` §13,
checked in `product-golden.test.ts`):

- **§13.5** every non-MCQ fixture has **≥2** `alternate_valid` forms.
- **§13.6** every fixture has **≥1** `near_miss`.
- **§13.9** every `rational_answer` fixture has a drop-the-exclusion
  `missing_exclusion` near-miss.
- **§13.7** the whole suite runs in **Node AND Chromium** (`product-golden.browser.test.ts`)
  with identical verdicts — client and server must agree.

The `reason` you note on a near-miss must match the checker's actual `reason_code`
exactly (the test asserts it). Common codes: `value_mismatch`, `sign_error`,
`not_simplified`, `wrong_representation`, `missing_exclusion`, `extra_solution`,
`incomplete_solution_set`, `coordinates_swapped`, `reducible_factor`,
`not_primitive`. For a multipart item the code is prefixed with the failing part id
(e.g. `cos30:not_simplified`).

---

## 5. Running validation against the v2 checker

### The validator family (`src/validate.ts`)

| Validator | Checks | Use for |
|---|---|---|
| `validateTemplates(templates, samples, config)` | Samples N instances/template; each grades `correct`; template metadata matches; (practice-only) hint/reveal invariants | **First net** — catches a bad parameter range before anything is frozen |
| `validateWalkPool(entries, {nodes, minItemsPerCell}, config)` | Every entry is an assessment item with a unique, self-consistent key; ≥`minItemsPerCell` **distinct** items per (form,node); A∩B share no item | **The product pack** (walk model) |
| `validateItemBank(entries, config)` | Unique ids; per-item self-consistency; no practice/assessment content reuse; **D1 multistage coverage**; no parallel-form collision | A full D1-style MST assessment bank + cross-pool isolation |
| `validatePracticePool(entries, {nodes, mix}, config)` | Practice-form only; the locked per-node difficulty mix; distinct content; self-consistent keys | Lesson practice pools |

> ⚠️ `validateItemBank`'s coverage check is bound to the **D1 multistage spec cells**
> (`createD1MultistageSpec`, L1/L2/L3). A product-only walk pool won't fill those,
> so `validateItemBank` reports `missing_coverage` for it — that's expected. Use
> **`validateWalkPool`** for the product pack, and reserve `validateItemBank` for
> the D1 assessment bank / cross-pool isolation over the *combined* pack.

### The `checkerVersion` — the crucial argument

Every validator's last argument is a `CheckerConfig`, which pairs a `checkerVersion`
with the checker to build:

```ts
// src/validate.ts
export const D1_CHECKER_CONFIG      = { checkerVersion: 1 /* D1_CHECKER_VERSION */,      checker: createD1AnswerChecker };
export const PRODUCT_CHECKER_CONFIG = { checkerVersion: 2 /* PRODUCT_CHECKER_VERSION */, checker: createProductAnswerChecker };
```

Each self-consistency probe declares `equivalence_checker_version: config.checkerVersion`,
and `createProductAnswerChecker` **rejects a mismatched version** (`scoring_error` /
`checker_version_unsupported`). **The default config is `D1_CHECKER_CONFIG` (v1).**
So for product nodes you MUST pass `PRODUCT_CHECKER_CONFIG` — otherwise every probe
is graded by the v1 checker (which doesn't implement radicals/factoring/solution
sets/… ) and you get a wall of `answer_key_not_correct`.

```ts
validateTemplates(PRODUCT_TEMPLATES, 1000, PRODUCT_CHECKER_CONFIG);          // ✅ v2
validateWalkPool(PRODUCT_ITEM_PACK, { nodes: PRODUCT_NODES, minItemsPerCell: 3 }, PRODUCT_CHECKER_CONFIG);
```

### How validation is actually run

There's no standalone script — validators run inside `*.test.ts` files (see
`validate.test.ts`, `product.test.ts`), asserted `toEqual([])`. Add your node's
`nodes/<NODE>/` dir and wire its exports into the `product/templates.ts` +
`product/golden.ts` aggregators, and the existing suites pick it up. From the repo
root:

```bash
npx vitest run packages/item-bank/src/product.test.ts   # the product validation + walk-pool suite
npx vitest run packages/item-bank/src                    # all item-bank unit tests
npm run test:unit                                         # every unit test
npm run setup:browsers && npm run test:browser            # Chromium golden parity (§13.7)
npm run check                                             # format + lint + typecheck + full test
```

### Reading a failure

Validators return `ItemBankIssue[]` — `{ severity, code, message }`; empty = clean.
The `message` embeds the checker's `status` + `reason_code`. Frequent codes:

| Issue `code` | Meaning / first thing to check |
|---|---|
| `template_instance_not_correct` | A sampled key didn't grade `correct` under the checker. The message includes `status`, `reason`, and the offending `params`. Usually a key-computation bug or wrong helper/spec. |
| `answer_key_not_correct` | A frozen/golden key didn't grade `correct`. If `status=scoring_error, reason=checker_version_unsupported` → you forgot `PRODUCT_CHECKER_CONFIG`. |
| `insufficient_walk_depth` | A (form,node) cell froze <3 distinct items — widen the parameter space or fix `varietyKey`. |
| `parallel_form_collision` | Form A and B share an item for a cell. |
| `missing_allowed_symbols` | An `expression` item didn't declare `allowed_symbols` (use the helper). |
| `duplicate_item_version_id` / `practice_assessment_reuse` | Id/content collisions across pools. |

Underlying checker statuses (`Answer_Equivalence_Spec.md` §12): `correct`,
`incorrect` (genuine wrong), `invalid_input` (malformed student input — not a wrong
answer), and `scoring_error` / `unsupported_expression` (an **application** fault —
never counts against a student, but for *your* key it means the checker can't grade
what you authored, so fix the spec).

---

## 6. Worked example — author POL.3 from scratch to green

**Goal:** author `POL.3` ("Solve quadratics by factoring and the square-root
property"), a `product_scope: "target"` node not yet in the pack. Solving a
quadratic yields a **solution set**, a category the v2 checker clears
(`compareSolutionSet`, §2). Full loop below.

### Step 0 — confirm the category is supported

`POL.3` → the student returns the roots → `answer_type: "solution_set"`. It's in the
[supported-today table](#3-answer-type--helper--checker-category) with helper
`solutionSetAnswer`. Green light.

### Step 1 — add the template (`src/product/nodes/POL.3/index.ts`)

Create the node's dir and drop its template there (no shared file to edit — this is
what keeps parallel authoring conflict-free). Pick roots, build the equation from
them, so the key is correct by construction
(mirrors the POL.1/POL.2 pattern). A `varietyKey` over the root pair keeps a frozen
cell from twinning.

```ts
// POL.3 — solve x^2 + bx + c = 0 by factoring -> solution_set {r1, r2}.
{
  template_id: "prod.pol-3.l2",
  node_id: "POL.3",
  difficulty: 2,
  generate(rng: Rng) {
    let r1 = rng.int(-6, 6);
    let r2 = rng.int(-6, 6);
    // Distinct, nonzero roots so the set has two members and no trivial x=0 root.
    while (r1 === 0) r1 = rng.int(-6, 6);
    while (r2 === 0 || r2 === r1) r2 = rng.int(-6, 6);
    if (r1 > r2) [r1, r2] = [r2, r1];
    const b = -(r1 + r2);   // x^2 - (r1+r2)x + r1*r2
    const c = r1 * r2;
    return {
      prompt: `Solve by factoring: x^2 ${signed(b)}x ${signed(c)} = 0`,
      answer: solutionSetAnswer(`{${r1}, ${r2}}`),
      params: { r1, r2, b, c },
    };
  },
  // Distinct root pair = distinct item (the solution set is the fingerprint).
  varietyKey: (params) => `${params.r1}:${params.r2}`,
}
```

Export `pol3_template` from `nodes/POL.3/index.ts`, then wire it into the three
aggregators: add it to `PRODUCT_TEMPLATES` in `src/product/templates.ts`, add
`POL.3` to `PRODUCT_NODES` in `src/product/index.ts` (freezing + the count
assertions pick it up automatically), and add its golden fixture to
`src/product/golden.ts` (Step 4). Import the shared `signed()`/`numStr()` helpers
from `../_shared` and `solutionSetAnswer` from `../../template`.

### Step 2 — validate the template (the first net)

```ts
validateTemplates([POL_3_TEMPLATE], 1000, PRODUCT_CHECKER_CONFIG); // expect []
```

This samples 1000 instances and grades each computed key through the real v2
checker. If a root range ever produced a bad key, you'd see
`template_instance_not_correct` with the params — not a silent bad freeze.

### Step 3 — validate the frozen walk pool

`freezeDeepParallelForms` already runs in `product/index.ts`; the pool assertions in
`product.test.ts` extend to `POL.3` once it's in `PRODUCT_NODES`:

```ts
validateWalkPool(
  PRODUCT_ITEM_PACK,
  { nodes: PRODUCT_NODES, minItemsPerCell: PRODUCT_WALK_ITEMS_PER_CELL },
  PRODUCT_CHECKER_CONFIG,
); // expect []
```

The root range above yields well over 3 distinct root pairs, so each (form, POL.3)
cell freezes 3 distinct items for the 2-of-3 walk. (If a cell can't, you'd get
`insufficient_walk_depth` — widen the range.)

### Step 4 — add a golden fixture (`src/product/nodes/POL.3/index.ts` → aggregated by `golden.ts`)

Anchor a fixed prompt with equivalent-valid forms and reason-coded near-misses.
Solve `x^2 - 5x + 6 = 0` → `(x-2)(x-3)=0` → `{2, 3}`:

```ts
{
  item_version_id: "prod.golden.pol-3.solve-by-factoring",
  node_id: "POL.3",
  prompt: "Solve by factoring: x^2 - 5x + 6 = 0",
  answer: solutionSetAnswer("{2, 3}"),
  valid: "{2, 3}",
  alternate_valid: ["{3, 2}", "2, 3"],   // order-insensitive; braces optional (§13.5: >=2)
  near_miss: [
    { answer: "{-2, -3}", reason: "value_mismatch" },          // sign slip: used the factor constants as roots
    { answer: "{2}",       reason: "incomplete_solution_set" }, // only solved one factor
    { answer: "{2, 3, 0}", reason: "extra_solution" },          // invented a spurious x = 0 root
  ],
}
```

Those three reason codes are exactly what `compareSolutionSet` emits: **only**
extra values → `extra_solution`; **only** missing values → `incomplete_solution_set`;
**both** missing and extra → `value_mismatch`.

### Step 5 — run it green

```bash
npx vitest run packages/item-bank/src/product.test.ts packages/item-bank/src/product-golden.test.ts
npm run setup:browsers && npm run test:browser   # §13.7 Node↔Chromium parity
```

Green means: every sampled POL.3 instance self-grades correct, the frozen cells have
walk depth, the golden key + both alternates grade correct, and all three near-misses
grade incorrect with the noted reason. The snapshot test will also want a fresh pin
for the new frozen hashes — that's the intended "explicit version event," so update
the snapshot deliberately (not blindly).

---

## Authoring guards & gotchas

- **All spec fields explicit (§13.3).** Use the helpers; they set every field. A
  missing field is an authoring reject.
- **`combined_polynomial` keys** (`expressionAnswer` default): mathjs `simplify`
  only factors the exact `Nx + N` case and drops a leading coefficient of 1 — keep
  coefficients ≥ 2 and avoid an identical coefficient/constant with `+`.
  `validateTemplates` catches violations.
- **`combined_constants` keys** (`combinedConstantsAnswer`): same guards as
  `combined_polynomial` — the key itself is still authored fully combined. The
  profile only widens what a STUDENT may submit (repeated variable terms), so reach
  for it when the item's node teaches distribution but not collecting like terms.
- **`representation` vs `simplification` are separate axes.** "Give a fraction"
  (`representation: "fraction"`) rejects a decimal; "reduced" (`reduced_fraction`)
  rejects `6/8`. Don't conflate them.
- **`rational_answer` needs the inherited exclusions** from the *original*
  denominator, and a `missing_exclusion` near-miss (§13.9).
- **Immutability.** Freezing is deterministic; a template edit that changes a
  published item fails the snapshot test until you re-pin it as an explicit version
  event. Never re-pin silently.
- **Practice templates only** carry hints + worked solutions (assessment/walk items
  don't). If you author practice, `validateTemplates` enforces 1–3 hints, non-empty
  steps, and no hint that leaks the answer key.

## Further reading

- `README.md` — package design, freeze/immutability, practice pools, provenance.
- `docs/Answer_Equivalence_Spec.md` — the definitive answer-category rules (cited by § above).
- `docs/Before_Authoring_Checklist.md` — the pre-authoring capability gate.
- `packages/skill-graph/` — node identity, prereqs, and `lesson_shell` mapping.
