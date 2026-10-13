---
name: practice-templates
description: >-
  Author a full calc-readiness practice problem template end-to-end: seeding the
  problem shape from an open textbook (opentextbookstore.com), difficulty tagging,
  generate() with grader-safe keys and KaTeX prompts,
  progressive hints + worked_solution steps, WORKED_SOLUTION_VISUALS SVG, pool
  registration (D1_EXTRA / practice-only), and template_id-keyed NPC cross-skill
  notes. Use when adding or reshaping a practice template in packages/item-bank
  (d1/practice.ts, d1/templates.ts), pairing it with a worked-solution diagram,
  or covering a mini-lesson concept the item bank does not yet test.
---

# Practice templates (generate + worked solution)

One practice template is a **paired deliverable**: an item-bank `ItemTemplate` whose `generate()` freezes a prompt, answer, params, hints, and `worked_solution`, **plus** a `WORKED_SOLUTION_VISUALS[template_id]` SVG driven by the same `template_params`. Never ship one without the other.

**American English:** all learner-visible prompt, hint, and `worked_solution` strings use American spelling (`meter`, `curb`, `center`, `recognize`, `behavior`, etc.). Keep existing `template_id` values and internal param keys unchanged unless a migration is explicitly requested.

Deep-dives (read when authoring those pieces):

- **`lesson-katex`** — `$...$` wrapping, prompt builders, and the `SvgMath` / `InlineMath` diagram renderers.
- **`practice-hints`** — 1–3 progressive hints + `worked_solution` steps array.
- **`worked-solution-svg`** — archetypes and `WORKED_SOLUTION_VISUALS` registration.
- **`svg`** — viewBox / alignment when building a new SVG.

This skill owns the **pipeline and the pairing**: seed → shape → generate → pool → SVG → NPC note → validate.

## When to add a template

- A mini-lesson teaches a concept the item bank never exercises (e.g. NUM.3 identities/inverses, NUM.S absolute value). **Cover the whole mini-lesson**, not only the diagnostic routing shape.
- A difficulty tier needs a genuinely different problem **shape** (same cell, alternate template) so round-robin practice does not feel like the same problem twice.
- Confirm the **difficulty tag** (`1` / `2` / `3`) with the user before authoring when the level is ambiguous.

**Diagnostic vs practice-only:** Prefer `D1_EXTRA_PRACTICE_TEMPLATES` or `D1_PRACTICE_ONLY_TEMPLATES` in [`packages/item-bank/src/d1/practice.ts`](packages/item-bank/src/d1/practice.ts) so forms A/B and `template.test.ts.snap` stay unchanged. Only edit `D1_TEMPLATES` in [`templates.ts`](packages/item-bank/src/d1/templates.ts) when the user explicitly accepts regenerating the assessment snapshot.

## Seed from an open textbook, then diversify

Before inventing a shape, look at how an open textbook exercises the concept. The seed sets the **shape and difficulty ladder**; `generate()` then re-derives its own numbers. Never copy problem text verbatim into a `prompt` — these books are mostly **CC BY-SA**, and paraphrasing the shape while parameterizing the numbers is both the licensing-safe path and what randomized serving requires anyway.

**Use [opentextbookstore.com](https://www.opentextbookstore.com/catalog.php?disc=Mathematics).** Catalog pages and full-book PDFs are both publicly fetchable, and the PDFs auto-convert to searchable text. D1-relevant titles:

| Book | Covers | Notes |
|------|--------|-------|
| Basic Arithmetic Workbook (Scottsdale CC, `details.php?id=24`) | NUM.S, NUM.F, NUM.2, NUM.5 | Best source. Per-lesson `PRACTICE PROBLEMS` + `ASSESS YOUR LEARNING` sets, answers in Appendix A. |
| Fundamentals of Mathematics (`details.php?id=4`) | arithmetic, percent | Second opinion when the workbook's layout garbles. |
| Beginning and Intermediate Algebra (Algebra section) | NUM.3 distributing, NUM.4 like terms | |
| Arithmetic for College Students (`details.php?id=13`) | — | **Narrative only, no exercises.** Skip for seeding. |

**Do not try to fetch MyOpenMath.** The question bank is login-walled and instructor-only; the only public pages are attribution stubs with no problem text. If the user pastes seeds from their own account, treat them like any other seed.

### Extraction fidelity (verified — do not skip)

Text extracted from these PDFs is trustworthy for **inline integer arithmetic** (`7 + 2(5 - 3)`, `51 - (47 - 2) ÷ 5`) and for **prose word problems** (which extract cleanly and are good raw material for `theming.ts` builders). It is **not** trustworthy for 2-D notation:

- **Superscripts silently flatten.** `3 2 + 6 - 5` is really `3^2 + 6 - 5`. Indistinguishable from juxtaposition.
- **Stacked fractions collapse into table soup.** One fraction expression extracted as `3 - 5 1 +6 4 1 +34 3 | 9 15 8 6`. Unrecoverable.
- **Grouping is lost** in complex fractions and braced systems.

So: re-derive every seed's shape by hand, and **compute the answer yourself** before encoding it. Never transcribe an extracted fraction or exponent directly. When a shape only exists in stacked-fraction form (most of NUM.F), design it from the mini-lesson instead of from extracted text.

### Diversify off the seed

The seed is a reference, not a template. Vary sign patterns, operand ranges, variable letters, term order, and which slot the unknown sits in, so a learner meeting several instances does not see the textbook's exact ladder replayed. Check the shape is not already covered by an existing `template_id` in the same cell.

## Pipeline checklist (do in order)

1. **Seed** — pull the concept's exercises from an open textbook (above), verify the math by hand, and note the difficulty ladder before designing.
2. **Shape + difficulty** — unique `template_id` (e.g. `d1.num-s.l2c`), `node_id`, `difficulty: 1|2|3`.
3. **`generate(rng)`** — draw params, guards, KaTeX prompt, answer helper, `params`, 1–3 hints, `workedSolution([...])`.
4. **Register in a pool array** — `D1_EXTRA_PRACTICE_TEMPLATES` (alternate shape in an existing cell) or `D1_PRACTICE_ONLY_TEMPLATES` (tier the diagnostic does not serve).
5. **Worked-solution SVG** — reuse an archetype or add a params-driven SVG (all math through `SvgMath` / `EquationRow`); register `WORKED_SOLUTION_VISUALS[template_id]` with a Markdown `caption` whose math is in `$...$`.
6. **Cross-skill NPC note (if needed)** — add `PRACTICE_NPC_NOTES[template_id]` only for shapes that genuinely need another node's skill (never by node+difficulty alone).
7. **Validate** — `validateTemplates(D1_PRACTICE_TEMPLATES)` via the item-bank suite; `tsc --build packages/item-bank apps/web`; biome on touched files. Snapshot must not change for practice-only templates.

## generate() shape

Mirror an existing template in `practice.ts` / `templates.ts`. Return:

| Field | Rule |
|-------|------|
| `prompt` | Shared builder from `promptFormat.ts` (`evaluateMath`, `simplifyMath`, `latexAbs`, `additiveInversePrompt`, `latexDollar` / `latexDollarInt`, …). No bare ASCII math. **Money:** never write `` `$\\$${n}$` `` — that nests `\$` inside `$...$` and remark-math closes the span early. Use `latexDollarInt(n)` (whole dollars) or `latexDollar(n)` (cents). |
| `answer` | `numericAnswer` / `expressionAnswer` / `combinedConstantsAnswer` / `reducedFractionAnswer` — key must grade correct under the D1 checker. The helper also decides whether the learner gets the notation note and the preview (below). |
| `params` | `Record<string, number>` only. Encode letters/orders/ops/signs as numeric flags (`varIndex`, `order`, `op`, `sa`/`sb`, `kind`). |
| `hints` | 1–3 progressive, ideally **param-free**, never leak `answer_key`, and **true for every draw** the guards allow, not just the typical one (see **`practice-hints`**: state the rule instead of the operations a draw happens to contain, or interpolate the `op`/`order`-derived word). |
| `worked_solution` | Ordered steps via `workedSolution([...])`; last step is the final answer; same params as the prompt. |

### The answer helper also buys (or loses) the math input

The notation note and the live KaTeX preview under the answer field are **earned by the answer spec, not chosen by a component**. `MathAnswerColumn` stacks both under the field and returns the bare field when the notation row is empty, so a template gets math input exactly when `answerNotation()` in [`apps/web/src/lessons/answerFormat.ts`](../../../apps/web/src/lessons/answerFormat.ts) — reading `answer_spec` + `allowed_symbols` + `answer_key` — hands it a non-empty row. Picking the loosest helper that grades is therefore not free: it can leave a learner in front of a bar or a caret with nothing on screen naming it.

Match the helper to the shape of the key, not to the loosest spec that passes:

| Answer shape | Helper | Tag → keys |
|---|---|---|
| Fraction that must be in lowest terms | `reducedFractionAnswer` | `reduced_fraction` → `/` |
| Fraction where a decimal must be refused | `representedNumericAnswer(key, "fraction")` | `fraction` → `/` |
| Plain value that happens to be `int/int` | `numericAnswer` | `fraction_bar` → `/` (an integer key stays bare) |
| Root over a constant / over a variable | `radicalAnswer` / `variableRadicalAnswer` | `constant_radical_*` → `sqrt() * /` · `variable_radical` → `sqrt() abs() ^ *` |
| Power with no negative exponent left | `positiveExponentAnswer` | `positive_exponents` → `^ /` |
| Roster holding a fraction / only integers | `solutionSetAnswer` | `solution_set_fraction` → `/` · `solution_set` → nothing |
| Two-field rational (expression + exclusions) | `rationalAnswer` | `rational_quotient` → `/` · `_power` → `^ /` · `_product` → `/ *` · `rational_expression` → nothing |

Two consequences worth stating outright:

- **`numericAnswer` earns the bar only when the whole key is two integers over one** (`isPlainFractionAnswerText` is whole-string: `1/32` and `4/3` yes, `0` and `125` no). It says nothing about the form, which is the point on `d2.rad3.negeval.l3` where a decimal often grades too — but reaching for it on an answer that really must be reduced, or must not be a decimal, trades a truthful line for a weaker one while keeping the same single key.
- **An `expression` key carrying a `/` or a `^` reaches no tag at all.** `expressionAnswer`, `standardPolyAnswer`, `factoredAnswer`, `expandedLogAnswer` and `condensedLogAnswer` are covered only by the load-bearing-star rule, so a bar or a caret in an expression key returns `"none"` and the field goes bare. That shape needs a new tag in `answerNotation` with its own placeholder (and its three placeholder guards), not a condition in a consumer: `placeholderForNotation` and `keypadForNotation` are condition-free switches over the tag.

**Confirm it by running [`apps/web/src/lessons/answerKeypad.test.ts`](../../../apps/web/src/lessons/answerKeypad.test.ts), not by reading the dispatch.** It sweeps seven pools (the six registered domain pools plus the interactive one, 1,120 served items) plus all 31 authored packs, names any item whose own answer key uses notation its field never advertises, and grades every notation it does advertise against every item that would be offered it. A `*` is the case inspection gets wrong: it is usually optional (`STAR_IS_OPTIONAL` re-grades 26 templates starless through the real checker) and load-bearing on three, where `log(maq)` grades `invalid_input / unknown_symbol` and `x(x + 6)` grades `invalid_input / unsupported_syntax`. The test is whether the answer grades without the star, not whether it contains one.

### Grader guards (hard)

- **`reduced_fraction`:** result must stay an `n/d` string with denominator `> 1`. Reroll while the reduced form is a whole number. Improper fractions (e.g. `4/3`) are fine. The field shows "A fraction in lowest terms: 7/9" with a `/` key under it, so the guard and the advertised line have to keep agreeing: a key that came out a whole number would advertise a form the item no longer wants.
- **`combined_polynomial`:** fully expanded, **positive** leading variable coefficient **≥ 2** (coeff `1` is dropped; negative leading terms get reordered/`not_simplified`). Keep coeff ≠ constant to avoid factorable `Nx + N`.
- **`combined_constants`** (`combinedConstantsAnswer`): the lenient sibling for a node that teaches distribution but **not** collecting like terms (currently only `d1.num-3.l3`). Author the key fully combined under the same guards; the profile just lets a student submit `2x + 4x + 14` for `6x + 14`. Un-distributed parentheses and a loose second constant (`2x + 6 + 4x + 8`) still fail. Pair it with a `PRACTICE_NPC_NOTES` line saying the plain numbers must still be combined.
- **Bare variable keys** (e.g. answer `x`): the hint-leak check matches standalone letters; prefer a coefficiented monomial (`3x`) when the concept allows, or keep hints free of that letter as a word.
- **A guard that changes the SHAPE of the key changes the notation row too.** The row is derived per item from the key, so a reroll that turns a quotient into a polynomial (or a fraction into a whole number) moves that instance to a different tag and can take its guidance away — `d5.rat5.level.l2` is the worked example, six of its seven served instances keyed `0` or `3` and keyless, the seventh keyed `4/3` and carrying the bar. That is correct behavior, not a bug, but it means the per-tag counts in `answerKeypad.test.ts` are per ITEM: check the row on the extreme draws your guards allow, not only on the interesting one.

### Params must match the SVG

Decode `varIndex` / `order` / `op` / sign flags **identically** in `generate()` and in `WORKED_SOLUTION_VISUALS`. A mismatch fails `validateTemplates` stress sampling or shows a figure that does not match the prompt.

## Practice surface contract (web)

The host draws the answer row; a template supplies what goes in it. **The host owns the CHROME as well as the prompt**, and an interactive answer widget therefore:

- **draws no box of its own.** `<fieldset>` is the right grouping element and the browser's frame is not the right drawing of it, so strip the UA border; `answerRowChrome.browser.test.tsx` measures that over every served interactive item.
- **echoes no format string.** A widget printing its own `workspace.template` says `base^exponent` over fields already labelled Base and Exponent: the same instruction twice, in the notation the learner is here to be taught. The field labels are the shape. `template` stays on the workspace, where the comparator's tests pin it.
- **spaces its fields**, so two adjacent controls cannot read as one.
- **does not make the Check button a slab.** That is the row's `align-items`, not a per-caller opt-in.

Guard: `apps/web/src/lessons/answerRowChrome.browser.test.tsx`, over every served interactive item plus a direct mount for `GraphInput`, which no item reaches.

## Era-themed prompts

**A node is themed by its ERA, not by its domain** (`docs/Content_Authoring_Split.md` §10.3), so resolve it with `getEraOfNode(nodeId)` from `@cr/skill-graph` and read that era's `docs/superpowers/specs/eras/era-NN-<name>/style-guide.md`: its **Lesson framings** section for the per-node framing, its world sections for the vocabulary, and its **"Explicitly absent"** list as a hard boundary on materials and technology. Three domains span eras, so the directory the template lives in does not tell you the theme. **Frame from the era's world, never from the node's building** (D-ERA8): building names are plain and era-neutral (`D1_NODE_BUILDINGS` is Assembly Hall, Store, Dwellings, Workshop, Commons, Tower) and carry no mathematical meaning.

D1 is the Prehistoric era, which withholds metal, agriculture and trade, so **money is not available as a framing there**; its scenarios are a notched waterline stake, coils of cord counted in paces, tool bundles handed to groups, and drying racks. Add era context to the **`prompt` only**, and **only when it makes the problem a genuine word problem**; never touch the answer/params/grader. Do NOT prepend decorative framing (e.g. "At the Workshop, the tools are checked. Evaluate ...") to an abstract exercise: context is not needed for every problem, and a prefix that does not change the math should be left off.

- **Thread the form.** `generate(rng, ctx?: GenerateContext)` gets the item `form`. Build the neutral prompt as before, then build the word problem only when `ctx?.form === "practice"`; return the neutral prompt for `"A"` / `"B"` so the assessment snapshot (`template.test.ts.snap`) and `validateTemplates` (which samples form `"A"`) are unaffected. A template with no natural word problem keeps the plain neutral prompt and takes no `ctx` param.

```ts
return {
  prompt:
    ctx?.form === "practice"
      ? cordPercentOf(p, base) // real word problem via a theming.ts builder
      : percentOf(p, base),
  answer: numericAnswer(numStr(value)),
  // params / hints / worked_solution unchanged
};
```

- **Word problem only where the math fits; otherwise neutral.** [`d1/theming.ts`](../../..//packages/item-bank/src/d1/theming.ts) exports exactly four builders: `waterlineReadingSum` (signed sums as a running water level against a notched stake, `NUM.S`), `cordPercentOf` (a percent OF a measured length, `NUM.5`), `toolBundleExpand` (distributive, `NUM.3`), `dryingRackFractionCombine` (`NUM.F` fraction add/subtract, but ONLY when the result is a proper fraction in `[0, 1]`, i.e. `num < denom`; gate the branch on that plus `ctx?.form === "practice"`). For anything that does not word-problem cleanly (order of operations, combine-like-terms, fraction multiply/divide, improper fraction sums) leave the prompt as plain math. **Choosing the quantity is the real work:** a percent of a measured *length* may legally come out fractional where a people-count would force integers, which is why `cordPercentOf` measures cord in paces rather than counting objects. A later era's domain writes its own builders in its own `theming.ts`; do not reach for era one's.
- **Answer/param immutability (hard).** The themed prompt must ask for the exact same value the neutral prompt does. Do not add scenario data to `template_params` (the `WORKED_SOLUTION_VISUALS` SVG reads params, not the story, so it needs no change), and keep numeric answers numeric with the "Enter one number" / unit guidance.
- **One anachronism is deliberately left standing.** `d1.num-5.l3`, the unit-rate template, is denominated in dollars and stationery across its prompt, hints and worked solution, and its neutral prompt is shared with the frozen assessment forms. Re-framing it as barter needs all three plus a deliberate re-freeze, so it serves the neutral prompt in every form rather than a half-themed one. Do not "fix" half of it.
- **Draw scenario strings last.** Any `rng` draw for the scenario must come after every math param is drawn, so form A/B stays byte-identical and the pool rebuild stays deterministic.

## Pool registration

| Array | Use when |
|-------|----------|
| `D1_TEMPLATES` | Diagnostic + practice (forms A/B). Touching changes the pinned snapshot. |
| `D1_PRACTICE_ONLY_TEMPLATES` | Tier the diagnostic does not serve (e.g. root-node L3). |
| `D1_EXTRA_PRACTICE_TEMPLATES` | Second (or third) shape sharing a `(node, difficulty)` cell. |

`buildD1PracticePool` round-robins multi-template cells. Reveal→retry prefers the same `template_id` via `drawD1PracticeInstance(..., { templateId })`.

## Worked solution (paired)

Both required:

1. **`worked_solution` steps** (item-bank; step-card fallback) — see **`practice-hints`**.
2. **`WORKED_SOLUTION_VISUALS[template_id]`** (web; primary reveal) — see **`worked-solution-svg`**.

Reuse archetypes first (`ExpressionReductionWorked` + row builders, `FractionBarsWorked`, `InverseRecallWorked`, `PercentSolveWorked`, …). New SVGs reuse `svgKit` / `visuals` primitives, typeset every math label with `SvgMath` / `EquationRow`, and pass the SVG alignment checklist.

Both halves are written once and rendered for **every** param draw, so **branch on the values before claiming a step**: a "reduce" step or a `raw = reduced` row prints `3/5 = 3/5` on the draws that arrived already reduced. Both deep-dives cover the mechanics (`workedSolution([])` drops a blank step; `reduceTail` appends the tail only when it changes something), and `validateTemplates` plus `visualsMath.test.tsx` fail on the narrow `X = X` case.

## Cross-skill NPC notes

Key by **`template_id`**, not node/difficulty. A shared tier can hold shapes that do **not** need the other skill (false warning bug: NUM.S OOO on three-term sums / abs-value).

In [`apps/web/src/lessons/practiceNotes.ts`](apps/web/src/lessons/practiceNotes.ts):

```ts
PRACTICE_NPC_NOTES["d1.num-s.l2"] = NUM_S_OOO_NPC_LINE;
// Only list templates that genuinely need node B.
```

`LessonPractice` resolves via `getPracticeNpcNote(frozen.template_id)`. Do **not** put the disclaimer in the prompt, hints, or `worked_solution`.

Rule of thumb: same domain, and the two nodes are **not** prerequisites of each other → note. Skip prereq / cross-domain / trivial foundation deps.

## Verify before finishing

- [ ] Shape seeded from (or checked against) an open textbook, with the math re-derived by hand rather than transcribed, and diversified off the seed's numbers.
- [ ] Unique `template_id`; registered in the correct practice array.
- [ ] `generate()` guards keep the answer grader-safe; params are all numbers.
- [ ] The answer helper matches the key's shape, so any `/`, `^`, `sqrt(`, `abs(` or non-droppable `*` in the key reaches a notation tag and the field earns the notation note + preview; confirmed by running `apps/web/src/lessons/answerKeypad.test.ts`, not by reading the dispatch.
- [ ] Prompts use shared builders; all math in `$...$`; no em dashes.
- [ ] Prompt becomes an era word problem only where the math fits (else left neutral, no decorative framing), framed from the era `getEraOfNode` resolved and drawing on nothing its style guide lists as "Explicitly absent", gated to `ctx?.form === "practice"`, with the answer/params/grader and worked-solution SVG unchanged.
- [ ] 1–3 progressive non-leaking hints, each true on every draw + ordered `worked_solution`.
- [ ] No step, row or caption claims work the params did not require (read the already-reduced / nothing-to-combine draw).
- [ ] `WORKED_SOLUTION_VISUALS` entry driven by the same params, with its diagram math typeset by `SvgMath` / `EquationRow` and its caption's math in `$...$`; `apps/web/src/lessons/visualsMath.test.tsx` green.
- [ ] Cross-skill note present **only** if this exact shape needs another node (keyed by `template_id`).
- [ ] Item-bank suite green; practice-only changes leave `template.test.ts.snap` unchanged.
- [ ] `tsc --build packages/item-bank apps/web` and biome clean on touched files.
