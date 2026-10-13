# Native Math Input (WYSIWYG answer entry) — Scope & Recommendation (v0.1)

> **Status: SCOPING / DESIGN NOTE. Not a build commitment. No production code was changed to write this.** Every file:line reference below is a read-only scan of `origin/integration` at `40f5143`, and every number is measured on that tree rather than estimated. Where a claim is an inference rather than a measurement it says so inline, and §10 lists the three things this note could **not** establish.
>
> **Two dated updates have been appended since, and nothing in the original text has been edited.** §3.3.1 records what the D5 keypad work did to §3.3's argument, and §7.1 carries a note saying its own most-perishable finding has expired. Both are marked with the date and the tree they were read at, and §10 carries their provenance. So a SHA-pinned claim in the body still means "true at `40f5143`" and nowhere else; where a later reading contradicts one, the later reading says so in place rather than replacing it.
>
> **Recommendation: phased, and the first phase is NOT a math editor.** Ship an **input-boundary normalizer plus an insert-template keypad over the existing plain text fields** (Phase 1), extend `expr_builder` with the two shapes the item bank actually needs (Phase 2), and treat a full WYSIWYG field as Phase 3, gated on a named trigger that has not fired. The reason is not caution about the library. It is that **the conversion layer a WYSIWYG field needs is the entire risk, and Phase 1 buys most of the learner benefit while leaving every checker byte-identical.**

---

## 0. The question

Verbatim, from the owner:

> "honestly, this might be worth developing like an answer-input tool that lets them do fractions and expressions such as squares natively instead of having to do `^` and `/`"

The prompt was an **EXP.1 Check-Your-Understanding panel** asking the learner to simplify `(x^2)^3 · x^-8` and type the answer into a plain text field. The expected answer is `1/x^2`. The learner must know to write `^` for the exponent and `/` for the fraction bar, with no on-screen affordance telling them so.

The complaint is real and this note does not argue otherwise. What it argues is about **where** to fix it.

---

## 1. What reaches the checker today, per surface (measured)

There are **six** learner-facing surfaces that produce a graded answer. Three of them are plain typed-text entry points (rows 1-3), one is a two-field text variant (row 4), one is a dispatcher into the interactive modules (row 5), and one is a module widget reached directly (row 6). Everything else in the app that looks like an answer field is not one.

| # | Surface | File | What reaches the grader | Grader |
|---|---|---|---|---|
| 1 | `MathInput` | `packages/shared-components/src/math-input.tsx` | one `rawAnswer` string, verbatim | injected `checkAnswer` |
| 2 | CFU field | `apps/web/src/lessons/cfu.tsx` | the raw `value` string, **un-normalized** | `cfuChecker` when `cfu.check` is set, **else an accepted-list string match that never reaches a checker at all** |
| 3 | Practice text branch | `apps/web/src/lessons/PracticeAnswer.tsx` (lines 88-98) | `normalizeTextSubmission(value, answerType)` | the versioned global `checkAnswer` |
| 4 | `rational_answer` two-field branch | `PracticeAnswer.tsx` (lines 128-176) | `{ expression, excluded_values }` object | same |
| 5 | Interactive branch | `PracticeAnswer.tsx` (lines 52-75) | the module's structured payload | `createInteractiveAnswerChecker` |
| 6 | `GraphInput` | `packages/shared-components/src/graph-input.tsx` | `GraphResponsePayload` | `createGraphComparator` |

Consumers, verified by grep: `MathInput` is rendered in exactly two places (`diagnostic/DiagnosticRunner.tsx:622`, `CheckerLab.tsx:29`); `PracticeAnswer` in exactly two (`LessonPractice.tsx:331`, `InfiniteDrill.tsx:254`); `LessonCfu` in three (`LessonPlayer.tsx:19`, `DevLessons.tsx:105`, `lessons/AdvisorLesson.tsx:303`); `GraphInput` in one (`diagnostic/GraphProbe.tsx:95`).

### 1.1 The CFU path is the one that already accepts LaTeX, and that is a liability

`cfu.tsx` has two grading paths and they disagree about notation. When `cfu.check` is absent, correctness is `accepted.has(normalizeAcceptedAnswer(value))`: a trim, a lowercase and a whitespace strip against a hand-authored list (`answerFormat.ts:108-110`). No checker is consulted.

Measured across `content/lessons/`: **21 lesson packs, all 21 carry a `cfu.accepted` list, 214 accepted strings in total, and 20 of those 214 are LaTeX spellings on 7 packs.**

| Pack | accepted | LaTeX | first LaTeX entries |
|---|---|---|---|
| `d2/EXP.1.json` | 9 | 4 | `\frac{1}{x^2}`, `\frac{1}{x^{2}}`, `\dfrac{1}{x^2}`, `\dfrac{1}{x^{2}}` |
| `d2/RAD.1.json` | 13 | 4 | `6\sqrt{2}/5`, `6\sqrt2/5`, `\frac{6\sqrt{2}}{5}`, `\dfrac{6\sqrt{2}}{5}` |
| `d2/RAD.2.json` | 9 | 2 | `\sqrt{10}`, `\sqrt10` |
| `d5/RAT.1.json` | 18 | 4 | `\dfrac{x + 8}{x + 5}, x = 8, x = -5`, … |
| `d5/RAT.2.json` | 14 | 2 | `\dfrac{x + 7}{x + 4}; x = -6, -4, 7`, … |
| `d5/RAT.4.json` | 19 | 2 | `\dfrac{5}{4x}; x = -4, 0`, … |
| `d7/LF.1.json` | 17 | 2 | `\dfrac{-1}{2}, decreasing`, `-\dfrac{1}{2}, decreasing` |

**So somebody already anticipated LaTeX-shaped answers and handled it by hand-enumerating them, on the one path where enumeration is possible.** That is the same CFU-versus-practice inconsistency `Answer_Equivalence_Spec.md` documents for the `√` glyph, and this note establishes that it is **not confined to RAD.1/RAD.2**: it now covers EXP.1 and four of Anthony's packs as well.

### 1.2 Measured: every LaTeX spelling the CFU accepts is refused by the practice grader

Graded through the real v2 `createProductAnswerChecker` over the live `D2_PRACTICE_ITEMS` pool, against the item whose answer key **is** `1/x^2` (`d2.exp.net.l2:practice:61012`):

| submitted | verdict |
|---|---|
| `1/x^2` | `correct` / `match` |
| `1/(x^2)` | `correct` / `match` |
| `x^-2` | `incorrect` / `not_simplified` |
| `1/x^{2}` | **`invalid_input` / `parse_error`** |
| `1/x**2` | **`invalid_input` / `parse_error`** |
| `\frac{1}{x^2}` | **`invalid_input` / `parse_error`** |
| `\frac{1}{x^{2}}` | **`invalid_input` / `parse_error`** |
| `\dfrac{1}{x^2}` | **`invalid_input` / `parse_error`** |
| `\dfrac{1}{x^{2}}` | **`invalid_input` / `parse_error`** |

Two details matter more than the headline.

**Braces alone are fatal.** `1/x^{2}` carries no LaTeX command at all, only the brace grouping a WYSIWYG field emits around every superscript, and it does not parse. Nor does `{x^5}` against a key of `x^5`. So the conversion layer is not a matter of translating a handful of `\command` names; it has to strip and re-associate grouping.

**Nothing LaTeX-shaped parses, anywhere.** On a plain `expression` item, all of `\left(x+1\right)`, `2\cdot x`, `2 \times x`, `\frac{1}{2}`, `x^{2}` and `\,` return `invalid_input` / `parse_error`.

**The failure is `invalid_input`, not `incorrect`.** Per `Answer_Equivalence_Spec` §12, `invalid_input` is treated as **unanswered** and never counts as wrong, so a learner who types LaTeX into practice is not scored against. They are re-prompted with `"Check the format so the expression can be read."` and given no idea what the reader wants. That is milder than being marked wrong and worse than being helped.

### 1.3 There is no LaTeX-to-grammar conversion anywhere in the repo today

Prompts go the other way: `packages/item-bank/src/promptFormat.ts` is a set of hand-written **ASCII-to-LaTeX** builders (`latexFrac`, `latexAbs`, `latexVar`). There is no inverse. A conversion layer would be new code with no existing analogue to inherit tests from.

---

## 2. The versioning question, and the answer

This is the load-bearing section. The owner's framing was right: inserting a converter in front of a versioned grader creates a correctness surface where none exists. The resolution is that **it does not have to go in front of the grader at all.**

### 2.1 The four version constants, and which one the marketed metric uses

| Constant | Value | Defined | Status |
|---|---|---|---|
| `D1_CHECKER_VERSION` | 1 | `d1-answer-checker.ts:20` | **LOCKED** |
| `PRODUCT_CHECKER_VERSION` | 2 | `product-answer-checker.ts` | v0.16, not locked |
| `GRAPH_COMPARATOR_VERSION` | 2 | `graph-comparator.ts:40` | cleared v0.13 |
| `INTERACTIVE_CHECKER_VERSION` | 2 | `interactive/checker.ts:20` | pinned equal to both v2s by test (`interactive.test.ts:125-127`) |

`DIAGNOSTIC_CHECKER_VERSION = D1_CHECKER_VERSION` (`diagnostic/browserRuntime.ts:58`). **The diagnostic, which produces the marketed pre/post metric, grades on the locked v1 checker.** Any change reaching `checker-core.ts` reaches it, which is exactly the second blocker the `√` decision packet identified and called "the more serious of the two."

### 2.2 The re-score rule, and why input-boundary normalization satisfies it by construction

`Answer_Equivalence_Spec` §13.13 asks one question: could any **recorded** response replay to a different verdict? `createVersionedAnswerChecker` (`answer-checker-registry.ts:28-43`) routes by the response's own recorded `equivalence_checker_version` and fails closed on an unknown one, so a bump means maintaining that generation forever.

The owner's recorded finding is that input-boundary normalization in `MathInput` leaves every checker byte-identical and satisfies the rule by construction. **It generalizes, and it is stronger here than the spec's own write-up of it claims.**

**Status (2026-08-18): the narrow `√` slice now ships using this safe shape.** The shared canonicalizer runs before persistence, accepts only unambiguous root scope, and refuses strings such as `√2x` rather than guessing. The broader LaTeX/native-math phases in this document remain proposals.

Option C in that spec's resolved `√` decision packet attached a caveat: *"the server-side recompute has to apply the identical normalization or client and server will disagree."* That caveat is true of one implementation shape and false of another, and the difference is worth stating precisely, because the repo implements the safe shape.

Read the flow:

- `engines/lesson/src/index.ts:242-282` — `submitAnswer` passes `submission.raw_answer` to `checkAnswer` (line 245) **and** stores the same value as `provisional.raw_answer` (line 276).
- `services/scorer/src/index.ts:33-41` — the authoritative scorer calls `checker({ raw_answer: submission.raw_answer, … })`. It applies **no normalization of its own.**
- `apps/web/src/diagnostic/DiagnosticRunner.tsx:630-634` — takes `submission.raw_answer` straight from `MathInput`'s `onChecked` and persists it (line 125).

So the value graded and the value recorded are **the same string**, and the server replays the recorded one. Therefore:

> **If the normalizer runs on the value that BECOMES `raw_answer`, the server needs no counterpart. If it runs only on the copy handed to the local checker, client and server diverge.**

### 2.3 Proven, not argued

Run against the real v2 checker and the real `createAuthoritativeScorer`, on `d2.exp.net.l2:practice:61012` (key `1/x^2`), with a toy `\frac`/`^{}` rewriter:

| shape | client | server | agree? |
|---|---|---|---|
| `\frac{1}{x^{2}}` submitted verbatim | `invalid_input` | `invalid_input` | yes, both refuse |
| normalized **before** `raw_answer` → `(1)/(x^(2))` | `correct` | `correct`, `authoritative_correct: true`, recorded `raw_answer` = `(1)/(x^(2))` | **yes, and no server change was needed** |
| normalized **only for grading**, raw string recorded | `correct`, `client_correct: true` | `invalid_input`, `authoritative_correct: false` | **no. This is the divergence §11/§15 forbid, reproduced live** |

And the additivity leg: on all five strings the checker **already** handles (`1/x^2`, `1/(x^2)`, `x^-2`, `1/x^3`, `x^2`) the normalizer is the identity function, and the before/after `CheckAnswerResult` objects are deeply equal. A rewriter that only ever touches strings the grader currently **refuses** cannot change the verdict of a string it currently **accepts**, and the refused ones are all `invalid_input`, which §12 already treats as unanswered.

**Conclusion: no version bump, on either generation, for any of the three phases below.** This is the strong durable ground (`checker-core.ts` untouched), not the weak "no production response exists" deployment fact the `√` note correctly refused to lean on.

### 2.4 Two costs the boundary approach does carry, and neither is a version

**(a) A regex rewriter is wrong on nested braces, and I hit it on the first attempt.** My first normalizer ordered the `\frac` pass before the exponent pass, so its `[^{}]+` denominator could not match `x^{2}`, and `\frac{1}{x^{2}}` passed through **silently unconverted**. It produced no error; it simply did not fire. Reordering fixed that case and does not fix the general one. **A conversion layer needs a brace-matching parser, and it must refuse rather than guess** where scope is genuinely ambiguous, which is the discipline `rewritePipeAbsolute` already applies to pipes and which the `√` note demands of `√2x`.

**(b) Normalizing at the boundary overwrites the learner's literal keystrokes.** `AssessmentItemSubmission` (`packages/shared-state-schema/src/index.ts:56-64`) has exactly one field for the answer: `raw_answer`. There is no `raw_answer_as_typed`. Once normalized, the response log holds `(1)/(x^(2))` and not what the learner actually pressed, which degrades misconception analysis and any future "show me what they typed" review. `normalizeTextSubmission` already has this property today for `multiple_choice`, where it is harmless because case is all that is folded. It stops being harmless when the rewrite is structural. **If we want the literal input, that is an additive schema field, and it is a separate decision (§9).**

---

## 3. The cost, in surfaces that must change

The fear worth pricing first: *"roughly a hundred widgets each with their own input."*

**It is not true, and the number that makes it untrue is zero.**

`apps/web/src/lessons/interactive/` holds **96 non-test `.tsx` widgets**. Of those:

| modality | count |
|---|---|
| contains a `<button>` (click / tap / drag) | 89 |
| contains any `<input>` at all | 26 |
| `type="text"` | 12 |
| `type="number"` | 12 |
| `type="range"` (slider) | 4 |
| `<select>` | 0 |
| **call `checkAnswer`, use `MathInput`, or reach any grader** | **0** |

These are gated teaching visuals, not answer surfaces. They self-check locally to unlock the advisor's "Next" button. **None of them would change, because none of them grades anything.** The `<select>` count of 0 is consistent with the house rule in `.cursor/skills/interactive-visuals` that lesson widgets use no dropdowns.

> **Re-measured 2026-08-09: the `type="number"` row reads 42 today rather than 12, and it is annotated rather than corrected, because the two figures are not measuring the same thing.** Read at `36271021`, the branch point of `anthony/lesson-numeric-entry-consistency`. Three things separate them and only the first is time.
>
> 1. **The tree tripled.** `interactive/` held **103** non-test `.tsx` widgets at `40f5143` and holds **273** at `36271021`. The files carrying any `<input>` went 26 to 84. Most of the gap is simply widgets authored since.
> 2. **The row counts FILES, and the interesting number is inputs.** The 42 files at the branch point render **49** number inputs between them; the dozen at `40f5143` rendered **18**.
> 3. **The 12 is a grep, and it is one high on its own tree.** Grepping `type="number"` over non-test `.tsx` under `interactive/` at `40f5143` returns exactly the twelve files this row reports, and one of them, `MixedRadicandSolver.tsx`, carries the literal only inside a DOCBLOCK ruling the attribute out. Parsing `<input>` tag bodies with comments stripped returns **11**. The same method gap runs the other way on the newer tree: at `36271021` a grep finds 41 files where a parse finds 42, because `CompleteSquareSolver.tsx` builds its `type` with a ternary and the literal never appears in it. That one file carries three of the 49.
>
> **The rest of the row, measured the same way at `36271021`:** 273 widgets, 84 with an `<input>`, and by type `number` 48 written out plus the one ternary, `text` 43, `range` 20. The `<select>` count is still **0**.
>
> **None of this touches the section's conclusion, which is the sentence under the table rather than the table.** Those widgets still reach no grader, so a native math field still would not change one of them, and the 0 in the last row is the number that makes §3's point. What did change all 42 is a concern this note never had: a `type="number"` box draws the browser's spin arrows, and where the answer space is a single digit the arrows walk a learner to the answer without doing the work the slot exists to ask for. All 49 boxes are plain entry with an `inputMode` today, pinned by `apps/web/src/lessons/numericEntryConsistency.test.ts`. **The two graded surfaces in §1 that DO keep `type="number"` were deliberately not touched**: `graph-input.tsx` and its number-line sibling, on the stated ground that every scored coordinate should be operable from the keyboard.
>
> **One bookkeeping note, left as prose rather than fixed.** The header says two dated updates have been appended. Counting the blocks there are already more than two before this one, so read that sentence as a description and not as a tally; nothing above the line is edited here either.

The graded item bank, measured over all five registered pools:

| | items | distinct templates |
|---|---|---|
| **Text-graded** | 693 | **99** |
| **Widget-graded** (`expr_builder`, `number_line`) | 77 | **11** |
| Total | 770 | 110 |

By answer type: `numeric` 308/44, `expression` 147/21, `rational_answer` 140/20, `expr_builder` 42/6, `point` 35/5, `solution_set` 35/5, `number_line` 35/5, `multiple_choice` 21/3, `interval` 7/1.

### 3.1 The number that should decide scope

Of the **99 text templates**, classified by what their answer keys actually contain:

| answer key contains | templates (any instance) | templates (first instance only) |
|---|---|---|
| a `/` (fraction) | **27** | 23 |
| a `^` (exponent) | **10** | 9 |
| a root (`sqrt`/`cbrt`/`nthRoot`) | **11** | 11 |
| **none of the three** | **60** | 62 |

**39 of 99 text templates (39%) have an answer a native math field would render differently. For the other 60 it is pure overhead**, because their answers are plain numbers, coordinate pairs, solution rosters and single words. A `multiple_choice` item whose answer is the word `decreasing` does not want a math editor, and 21 items across 3 templates are exactly that.

**The two columns are one recount, not a drift.** This section first read 23 / 9 / 11 / 62 = 37, which is what classifying each template by its FIRST instance gives; reading every instance gives 27 / 10 / 11 / 60 = 39. Both were measured on the pools as they stand today, so nothing rotted — the earlier figure was the weaker method. Every instance is the right denominator because every instance is served: `D*_PRACTICE_ITEMS` is `POOL ∪ VARIANTS`, and `buildRandomizedD2PracticeSet` draws from the union, so a variant whose key carries a `/` reaches a learner exactly as the canonical one does. Four templates key a `/` on some instance and not on the one that happens to be first.

### 3.2 So the cost estimate, in surfaces

| Phase | Surfaces that must change |
|---|---|
| **1. Boundary normalizer + keypad** | **3** typed-text entry points (`math-input.tsx`, `cfu.tsx`, `PracticeAnswer.tsx`), plus **1** shared helper module (`answerFormat.ts`). Zero content files, zero checkers, zero lesson widgets. |
| **2. Two new `expr_builder` shapes** | **1** comparator + **1** widget + **1** registry entry (all inside the existing module), plus **N** item-bank templates re-pointed, where N is chosen per node and starts at 1. Zero checkers: `expr_builder` grades by construction. |
| **3. Full WYSIWYG field** | **1** new interactive module, **plus** the conversion layer, **plus** all 3 typed-text entry points, **plus** a decision about each of the **99** text templates (opt in or stay ASCII), **plus** the 7 content packs carrying hand-enumerated LaTeX, **plus** 5 test files that locate the answer field by `getByRole("textbox")`. |

### 3.3 The `rational_answer` two-field branch: why Phase 1's keypad stops at its edge

Phase 1 shipped in PR #211 and reaches **163 items across 24 templates**. The largest thing it does not reach is surface 4 in §1: `rational_answer`, **140 items across 20 templates**, roughly a fifth of the graded bank, all of D5's RAT.1-RAT.4. This section is the evaluation of what a keypad there would cost, measured rather than estimated, and it recommends **not building one yet**.

**The stated blocker dissolves on measurement, and a bigger one is behind it.** The reason recorded in `answerFormat.ts` was that a keypad "needs to know which of its two fields has the caret". It does not, because the second field wants no keys:

| | measured over all 140 served instances |
|---|---|
| exclusions per item | 1 to 3 |
| distinct excluded values in the pool | 22, from `-12` to `10` |
| excluded values that are **not** a plain integer | **0** |

The comparator splits that field on commas and evaluates each piece as a number, so its entire notation is digits, `-` and `,` — three characters a phone keyboard shows on its first layer, and none of them is a key `answerKeypad` offers to anything. So no keypad ever spans the two fields, and "which field has the caret" is not a question that has to be answered.

**What is actually in the way is the dispatch's unit.** `answerNotation` answers *per item*, and this branch needs an answer *per field*. Three facts make that concrete:

1. **The two-field branch already bypasses the dispatch.** `PracticeAnswer.tsx` returns `RationalAnswerInput` before the text branch, and that component hard-codes `RATIONAL_EXPRESSION_PLACEHOLDER` and `RATIONAL_EXCLUSIONS_PLACEHOLDER` rather than reading `practicePlaceholder`. `answerNotation` returns `none` for every one of the 140, so the item's own placeholder is `GENERIC_PLACEHOLDER` and nothing shows it. The one-dispatch invariant is intact only because this surface is outside it.
2. **`MathKeypad` and `MathAnswerColumn` are single-field by contract, in three places each**: one `field: RefObject<HTMLInputElement | null>`, one `value: string`, one `onChange: (next: string) => void`. They compose with a two-field surface only by being instantiated around ONE of the two inputs. That is not hard, but it is a per-field call, which is the change in 1.
3. **Focus is not tracked anywhere.** `RationalAnswerInput` has no `useRef`, no `useState` and no `onFocus`; both strings are derived from the `value` prop. Nothing would have to be added if the exclusions half takes no keys, and a new piece of state would if it ever did.

**And a per-item row would reproduce the defect the radical placeholders were just split to fix.** Of the 20 templates, **12 (84 instances) carry a `/` in every key and 8 (56 instances) carry one in none** — `d5.rat2.charm.l1` keys `4*x`, `d5.rat1.difference.l2` keys `x + 10`. A fraction key offered to all 140 would advertise notation 56 of them never use, which is exactly what one radical line did to 20 radical items. Avoiding that means reading the answer key per template, the way `radicalShape` now does. For scale on the other keys: 89 of 140 keys carry a `*` and **2** carry a `^`.

**So the fork, stated so it can be decided rather than improvised:**

- **(a) Does the notation dispatch become per-FIELD?** The honest shape is an `answerFields(item)` seam returning one entry per input, each with its own placeholder and key row — the single-line branch returns one, `rational_answer` returns two. That subsumes the hard-coded pair in `PracticeAnswer.tsx` and puts this surface back inside the one dispatch. It is a contract change to a module both practice surfaces and the CFU card read, and it is the piece that is not small.
- **(b) Which keys does the expression half get, and read off what?** `/` and `*` are the candidates; `^` serves 2 instances of 140 and probably fails the "not itself the graded skill" rule. Whether a fraction key belongs on the 56 instances whose answers are polynomials is a **content** judgement about RAT.1-RAT.4, and those packs are Anthony's. `PracticeAnswer.tsx` and `answerFormat.ts` are shared, so the wiring is ours and the call on (b) is his.
- **(c) Tab order.** Keys sit under their field, so a row under the expression input lands *between the two answer fields*: Tab would go expression → 2-3 buttons → exclusions → Check. On the single-field surfaces the keys sit between the field and Check, which is why this has not come up.

Nothing here is expensive on its own. What makes it not-now is that (a) is a shared-contract change and (b) is not ours to decide.

#### 3.3.1 What shipped against that argument — recorded 2026-07-30

> **Provenance, before any of it.** Everything in this sub-section was read off `apps/web/src/lessons/answerFormat.ts` and `PracticeAnswer.tsx`, plus the assertions in `answerFormat.test.ts`, `answerKeypad.test.ts` and `mathKeypad.browser.test.tsx`, in the **working tree on top of `2814951`**. That work is uncommitted, so there is no commit to attribute it to and none is invented here: "the working tree on top of `2814951`" is the whole of its address, and every reference below expires the moment it lands under a real SHA. The counts are the ones those tests assert, read at the current tree state — **the suites were not run for this note**, so each is a reading of an assertion rather than a fresh measurement, which is a weaker warrant than §3.3's own numbers above and is why the distinction is stated rather than smoothed over.
>
> **Nothing above this line has been edited.** The argument for "not yet" is left standing verbatim, including the parts of it that turned out to be wrong, because the point of recording an outcome against a decision is that both can be read.

**The recommendation was overtaken for the expression half and held for the exclusions half.** `RationalAnswerInput` now wraps its expression `<input>` — and only that one — in `MathAnswerColumn`, so that field carries a keypad and the live preview; the exclusions field is still a bare `<input>` keeping its own literal. That asymmetry is the recommendation **this section itself made**, on the 0-of-140 measurement in the table above, and nothing has changed about it.

**The expression half's PLACEHOLDER followed its keys, in a second pass.** When the keypad landed, the line stayed hard-coded, so all 140 items went on being shown `Simplified, e.g. (x+3)/(x+2)` — including the 56 whose answer reduces to a polynomial and must not contain a bar. It is now `practicePlaceholder` with the item's own key, the same call the keys come from, and the `rational_expression` tag carries its own line: `Simplified, e.g. (x+1)*(x+8)`, a product because that is the shape the cohort's two hardest templates key. The example answers nothing it is shown on — graded against all 56 through the versioned checker it is `incorrect / value_mismatch` on every one, and parses on every one — where the shorter `x + 10` would have handed `d5.rat1.difference.l2` its answer. It is owed no times key: on the 35 of the 56 whose key is starred, re-grading with every `*` removed returns `correct` 35 times out of 35.

> **SUPERSEDED 2026-08-05 — the one-example line was the wrong shape for seven of the nine templates, and is now two examples.** The paragraph above is left standing because its reasoning is quoted in the constant's own note and both halves should be readable. What held: the line answers nothing it is shown on, and it is owed no times key. What did not: "a product because that is the shape the cohort's two hardest templates key" is a fact about **two** templates and was being shown to all of them. The owner hit it on the diagnostic's `prod.rat-1.l2`, where `(x^2 + 7x + 6)/(x + 1)` reduces to `x + 6` and the field advertised a product. Measured at `685566a7`, the cohort carries **48 distinct keys over 70 items** (the 56 counted above plus 14 the diagnostic serves, `prod.rat-1.l2` among them), of which 14 are products of two binomials and the rest monomials or binomials, so no single example can be right. The line is now `Simplified: 7*x or (x+2)*(x-9)`; both examples are `incorrect / value_mismatch` on all 70, and it paints at 235.4px against the 460px card's 257.3px headroom budget **measured in DejaVu Sans**, which is what `answerPlaceholderFit.browser.test.tsx` resolves to on ubuntu-latest. A five-character-longer draft measured 243.1px on a Noto Sans dev box, looked fine, and was refused by CI at 270.4px, which is the trap that guard's own header documents. **The 56 in this paragraph is still the number `answerFormat.test.ts` sweeps** — its pool is the practice items — which is why the wider 70 is stated separately rather than substituted in.

**The 12-templates / 84-items and 8 / 56 prediction held.** §3.3 counted the split independently, off the keys, before any code read them; the shipped dispatch reproduces it. `answerFormat.test.ts`'s "splits the D5 expression half by the notation its own key carries" asserts 140 `rational_answer` items served, 84 of them bar-keyed across 12 templates, and then — per item, both directions — that carrying a bar and getting a row are the same predicate. The 56 is asserted next door in `answerKeypad.test.ts`; of the four numbers only the 8 is unasserted, and the table below says so. This is the one place in this note where a number written as an argument for deferring the work was later re-derived by the work itself.

**Three claims in this section are no longer current. Each is superseded here rather than deleted above.**

1. **Fork (a) was not a prerequisite, and it is still open as a general refactor.** Both halves matter. What shipped built **no** `answerFields(item)` seam: `answerNotation` still answers once per item, and the surface composes with it by instantiating the shared column around **one** of its two inputs — which is precisely fact 2 of the three above, stated there as a cost and available all along as the cheaper route. So the piece this section called "the piece that is not small" was not on the path at all, and calling it a prerequisite was the error. The seam remains unbuilt and remains the honest shape for a genuinely per-field surface; it is now a refactor with no blocked work behind it rather than a gate.
2. **Point 1's `none` is gone, and so is the exemption that rested on it.** `answerNotation` no longer returns `none` for any of the 140: `rational_answer` is dispatched by `rationalNotation`, which reads the key. "The one-dispatch invariant is intact only because this surface is outside it" was true when written and is now false in both clauses — the surface is inside, and the invariant holds there. `answerFormat.test.ts` carried a matching exemption, excusing `RATIONAL_EXPRESSION_PLACEHOLDER` from the dispatch-agreement sweep on that same stated ground; it has been **discharged rather than reworded**, and its comment says so. What is exempt there now is `RATIONAL_EXCLUSIONS_PLACEHOLDER` and the CFU-only `NUMERIC_LITERAL_PLACEHOLDER`. A narrower exemption took its place one file over for a time, and it is now gone as well: `answerKeypad.test.ts` exempted the single tag `rational_expression` from "keys exactly where the placeholder names notation", because those 56 items shared the field's one line while wanting no keys. That premise was removed rather than re-argued — the expression field now takes its LINE from `practicePlaceholder` per item too, so the 56 get `RATIONAL_POLYNOMIAL_PLACEHOLDER` and the 84 get `RATIONAL_EXPRESSION_PLACEHOLDER`, and there is nothing left to excuse. What replaced it asserts more than it did: "splits the D5 pool by the bar in its own key, in the line and the row alike" requires the two cohorts to show DIFFERENT lines, fails in both directions per item, and pins 56 / 84 / 140 plus a count of exactly two distinct lines over the pool, so one line cannot quietly cover it again. **No exemption for this surface survives in either file.**
3. **Fork (c) is measured rather than predicted.** `mathKeypad.browser.test.tsx` drives it: focus the expression field, Tab once per key in order, then the exclusions field, then Check. Its sibling test asserts the row still holds exactly **2** textboxes, one keypad group, that group under the expression field, and no answer column around the exclusions one. Tab order was the one thing this section said single-field surfaces never had to answer; it is now answered by a browser assertion rather than by the reasoning above, which predicted the same order.

**Fork (b) was dissolved rather than decided, by the mechanism this section named.** Which keys the expression half gets is read off each item's own answer key — `rationalNotation` — which is the `radicalShape` reading §3.3 recommended by analogy two paragraphs earlier. So the content question "does a fraction key belong on the 56 polynomial-keyed items" was never put: those items are tagged `rational_expression` and get nothing, which is the answer their keys give. That is not a ruling by the packs' owner and should not be recorded as one. What remains his is anything about RAT.1-RAT.4 that a key cannot answer.

**The `*` question this section left open is now answered by measurement.** §3.3 named `/` and `*` as candidates and did not resolve the star. The resolution is that a star is usually optional notation and occasionally load-bearing, and which is which was graded rather than argued: `answerKeypad.test.ts`'s `STAR_IS_OPTIONAL` re-grades 26 templates with the star removed through the real versioned checker and requires `correct`, and three templates are deliberately outside it because they fail. On `d5.rat3.factorlcd.l3` and `d5.rat3.unlike.l2` the starless `x(x + 6)` grades `invalid_input / unsupported_syntax`; on `d8.el5.condense-sum.l2` `log(maq)` grades `invalid_input / unknown_symbol`. Those three owe a times key and nothing else does.

So the split the dispatch makes is four tags, not one row, and the counts are the tests':

| tag | items | templates | row |
|---|---|---|---|
| `rational_quotient` | 68 | 10, listed in the test | `/` |
| `rational_quotient_power` | 2 | 1 — `d5.rat1.monomial.l1` | `^` `/` |
| `rational_quotient_product` | 14 | 2 — `d5.rat3.factorlcd.l3`, `d5.rat3.unlike.l2` | `/` `*` |
| `rational_expression` | 56 | 8, derived | none |

The three quotient tags and their template lists are asserted per tag in `answerKeypad.test.ts` ("gives a %s answer exactly %s"); the 56 and the 84 are asserted against the 140-item pool in the exemption test beside it. The last row's **8 is a derivation and not an assertion** — it is this section's own 20 templates less the 12 the test pins, so it inherits the older count's provenance, and no test in the tree pins the polynomial-keyed template count on its own. `d5.rat1.monomial.l1` is in two rows because the tag is per item: the 12 bar-keyed templates are the 10 above plus that one already among them plus the two product ones. `rational_quotient_power` exists for one key, `3*x^2/2`, where the caret is as unguessable as the bar — a shape §3.3 counted (`2` of 140 carry a `^`) and then guessed would fail the "not itself the graded skill" rule. It did not.

**What is genuinely still deferred**, which is the narrow residue of (a) and (b) rather than either of them whole:

- **The per-field seam.** Both fields' placeholders are still literals in the component, `answerNotation` still answers per item, and one tag still cannot name two lines. Nothing is blocked on it; it is the tidy version of what shipped.
- **The exclusions half.** Still no keys, still on the measurement above rather than on an argument. It stays right until a served exclusion is something other than a plain integer, and the 22-value census in the table above is what would have to move first.
- **One back-reference into this section is stale in code this note did not edit.** `answerKeypad`'s doc comment in `answerFormat.ts` still describes the two-field branch as "the largest thing deliberately left out" and points here for why, several lines above the four `rational_*` cases it now dispatches. Recorded rather than fixed: this update owns the document only.

---

## 4. What `expr_builder` can and cannot express

`expr_builder` is the existing answer of the form the owner is asking about: structured, non-ASCII, graded by construction rather than by parsing a typed string. `packages/shared-components/src/interactive/modules/expr-builder/comparator.ts` defines four shapes as a discriminated union:

| `kind` | shape | used by | slots |
|---|---|---|---|
| `positive_power` | `base^exp` | D2 EXP.1 | base (symbol), exp (integer ≥ 1) |
| `coeff_radical` | `coeff · ⁿ√radicand` | RAD.1 / RAD.2 | coeff ≥ 1, radicand ≥ 2, index ≥ 2 |
| `radical_form` | `ⁿ√(base^power)` | RAD.3 | base, power ≥ 1, index ≥ 2 |
| `rational_power` | `base^(num/den)` | RAD.3 | base, num ≥ 1, den ≥ 2 |

Grading is a fails-closed exact field match with no tolerance and no alternate-form acceptance, which is deliberate: on RAD.3 the **form is the answer**, so a radical form and a rational-exponent form of the same value must be told apart, and a value-equivalence check could not do it.

**What it cannot express**, and this is the sharp finding:

- **`1/base^exp`. The exact answer in the screenshot.** `positive_power` emits `base^exp` and nothing else. The EXP.1 CFU asks for `1/x^2` and **no `expr_builder` shape can build it.** Measured on the live pool: EXP.1 has **41 items across 6 templates**, of which **7 items / 1 template** are `expr_builder` and **34 items / 5 templates** are text `expression`. Of those 34, **7 items across 2 templates have a `1/base^n` key**: `1/x^2`, `1/x^3`, `1/x^4`, `1/x^5`, `1/y^3`, `1/n^2`, `1/n^4`.
- **A coefficient on a variable power** (`3x^2`). No shape carries both.
- **Two-variable quotients.** A further **7 items across 1 template** key as `a^m/b^n`: `x^3/y^4`, `x^2/y^5`, `x^5/y^5`, `x^4/y^5`, `x^2/y^4`, `x^4/y^3`, `x^4/y^4`.
- **Any additive structure.** No sums, so nothing in NUM.3/NUM.4/POL, and nothing in D7's `expression` right-hand sides.
- **Anything non-integer in a slot.** Every non-`base` slot is `isIntegerAtLeast(value, min)`.

So `expr_builder` covers **exactly** the shapes it was authored for and extends only by adding a `kind`. The module's own doc comment says so: *"new shapes are additive: implement a new `kind`, add a `case` to `scoreExprBuilderResponse` / `toExprBuilderWorkspace`, done."*

Two new shapes (`reciprocal_power` for `1/base^exp`, `power_quotient` for `a^m/b^n`) would cover **14 of the 34 EXP.1 text items, across 3 of its 5 text templates**, and would need no checker change at all. For scale, the remaining 19 items across 4 templates key as a bare `base^n`, which `positive_power` **already** covers; one item keys as the literal `1`. Template counts overlap because one template can generate several key shapes, which is why the item count is the honest denominator here.

---

## 5. The `InteractiveAnswerModule` seam is the right home, and it already anticipated this

The contract landed in **PR #47** (`gabe/interactive-infra-spine`, merged 2026-07-24T22:27:18Z) and **PR #49** (`gabe/interactive-number-line`, merged 2026-07-24T22:28:06Z). Both merge dates read from the GitHub API, not inferred from pushes.

`packages/shared-components/src/interactive/types.ts` requires five things of a module: `answer_type`, `comparator_version`, `toWorkspace` (must strip every answer value), a pure non-throwing `compare`, and `validateSpec`. Three are registered (`registry.ts:13-19`): `graph`, `number_line`, `expr_builder`.

Two properties make this the seam rather than a seam:

**A native math field would be a new module, not a replacement for the text path.** `PracticeAnswer.tsx` dispatches on `isInteractiveAnswerType(answerType)`, so an item opts in by declaring its `answer_type`. A per-item, per-node rollout is already the architecture. That is what makes the 60-of-99 "no math notation in the answer" finding actionable instead of merely interesting: those items simply never opt in.

**The contract already carries a LaTeX seam.** `InteractiveInputProps.renderMath?: (latex: string) => ReactNode` (`types.ts:97`), documented as: *"a widget that shows the student the expression they are assembling can render it as real notation instead of ASCII, without this package taking on a math-rendering dependency (KaTeX lives in the web app, which passes its own renderer down)."* `PracticeAnswer.tsx:71` supplies `(latex) => <InlineMath latex={latex} />`.

**So the direction "structured payload out, LaTeX in for display only" is already built and shipped.** `ExprBuilderInput.tsx` renders `\sqrt[4]{x^{3}}` through the host typesetter while emitting `{ kind, base, exp, index }` to the comparator. LaTeX is presentational and never touches a verdict. A WYSIWYG field inverts that (LaTeX becomes the payload) and that inversion is the whole risk.

---

## 6. Evaluated against the named criteria

### 6.1 Accessibility — manageable, but only if we keep the house pattern

The repo has a specific, tested answer to "how does typeset math behave for a screen reader," and it is not the library's answer.

`ExprBuilderInput.tsx:239-257` renders the KaTeX preview inside `aria-hidden="true"`, with a parallel `aria-live="polite"` region carrying the same content **in words**. The rationale is in the file: *"typeset math markup reads badly aloud."* `ExprBuilderInput.browser.test.tsx:87-101` pins both halves, asserting the live region contains **`x^3`** and **`x to the 3`**. `NumberLineInput`, `GraphInput` and `ExprBuilderInput` carry 9, 15 and 20 accessibility assertions respectively.

MathLive does ship accessibility machinery: auto-generated ARIA labels, a MathML fallback, math-to-speech, `role="img"` on static output. That is a genuine effort and better than most. But it is **its own** announcement model inside a shadow root, and it has had real screen-reader focus bugs (MathLive issue #2298, spacebar focus not reaching the mathfield). Adopting it means either trusting that model or wrapping it in ours.

**Verdict: not a blocker, and not free.** A native field is answerable and announceable. What it costs is the guarantee we currently hold by construction, which is that we author the spoken string ourselves and a test pins it. The honest framing is that a11y becomes something we verify per release against a dependency instead of something we own.

### 6.2 Mobile and touch — the strongest argument FOR a keypad, not for an editor

The app is a real mobile target: `apps/web/src/styles.css` carries 22 `@media` blocks with breakpoints down to 460px.

More telling, mobile keyboards have **already caused a graded defect twice**, and both fixes are in the tree:

- `MATH_TEXT_INPUT_ATTRS` (`PracticeAnswer.tsx:110-115`) sets `autoCapitalize: "off"` / `autoCorrect: "off"` / `spellCheck: false`, documented as: *"iOS and Android capitalize the first character of an empty text field unless told not to, and a capitalized variable used to reach the checker as an unknown symbol: the attempt scored as unanswered with no indication that case was the problem."* `cfu.tsx:158-163` repeats it.
- `foldSymbolCase` (`checker-core.ts:233-258`) folds submitted symbol case inside the checker, and its comment records the measurement: **"56 of the 181 registered D2 instances rejected the upper-cased spelling of their own key as `invalid_input` / `unknown_symbol`."**

That is the same failure mode as the screenshot: a mobile learner produces something reasonable, the grader reads it as unanswered, and the UI explains nothing. Note the asymmetry in how the two were fixed: the app-side attribute fix needed no argument, and the checker-side fold needed a full additivity proof gated on `allowed_symbols`.

**On a phone, `^` and `/` are behind a symbol layer of the software keyboard.** A keypad of tappable templates is not a consolation prize on mobile; it is straightforwardly better than either a plain field or a WYSIWYG field driven by the OS keyboard.

### 6.3 Bundle and dependency risk — KaTeX genuinely does change the calculus

Measured from a real `vite build` of `apps/web`:

| | raw | gzipped |
|---|---|---|
| all JS | 3,343 KB | **927 KB** |
| all CSS | 174 KB | 35 KB |
| `.glb` 3D models | 6.4 MB | (already compressed) |
| fonts (27 files) | 492 KB | |

Largest chunks: `index` 1,377 KB (gzip 381 KB), `react-three-fiber.esm` 882 KB (gzip 234 KB), `src` 436 KB (gzip 120 KB), `bank` 260 KB (gzip 78 KB).

Two facts change the weighting:

**The KaTeX fonts are already emitted.** `apps/web/dist/assets/` contains `KaTeX_AMS-Regular-*.woff2`, `KaTeX_Caligraphic-Bold-*.woff2` and the rest. MathLive's own integration guide preloads **the same `KaTeX_*.woff2` files**. So the font half of the cost, which is the part that blocks first paint, is **already paid**. A renderer is not an editor, but here they share the exact font payload.

**Lazy loading is already the pattern.** `CheckerLab` (1.02 KB), `DiagnosticSurface` (106 KB) and `GraphProbe` (2.28 KB) are separate lazy chunks. An answer-input surface loaded behind the same `Suspense` boundary costs nothing on the city route.

MathLive is reported at roughly **728 KB minified** in a real webpack bundle, and the maintainer has stated there are **no plans to reduce it** and that tree-shaking a regular mathfield saves little. Against 927 KB of gzipped JS and 6.4 MB of models, that is a meaningful but not decisive increase, and near zero if lazily loaded.

**Verdict: not a blocker.** I did not measure MathLive's own gzipped size (§10).

### 6.4 Testability — a real cost, and a small one

`vitest.browser.config.ts` runs **41 browser test files** in headless Chromium via Playwright, in two projects. The driving pattern is uniform: `screen.getByLabelText(...)` or `screen.getByRole("textbox")` plus `fireEvent.change` / `user.type`.

Counted: **5 test files** use `getByRole("textbox")` (`mathInput.test.tsx`, `DiagnosticRunner.test.tsx`, `AdvisorLesson.test.tsx`, `DomainInfinitePractice.test.tsx`, `DevLessons.test.tsx`) and **8** touch a raw `input` element at all.

A `<math-field>` is a custom element with a shadow root. It does not expose `role="textbox"`, and `fireEvent.change` on it does nothing, so those 5 files would need to drive it through its imperative API instead. That is a rewrite of 5 helper functions, not of the suite.

Encouragingly, MathLive's changelog records that its virtual keyboard keycaps now expose `aria-label` and `data-keycap-value` **specifically so Playwright can target keys semantically**, and that its own e2e tests were moved onto those hooks. So it is drivable in Chromium.

**Verdict: not a blocker.** But note what is lost: `expr_builder` is currently testable through pure `fireEvent.change` on native inputs, which is why its comparator can be exercised in Node and its widget in Chromium and both pinned for §13.7 parity. A third-party field puts widget behaviour behind a dependency's API.

---

## 7. The partial alternative, assessed on its merits

**A keypad or toolbar of insertable templates above the existing plain text field, producing ASCII the grader already accepts.**

Taken seriously, this is not a lesser version of the request. It is a *different and better-targeted* answer to it, for five reasons grounded in this codebase.

**1. It fixes the actual defect in the screenshot.** The learner's problem is not that `^` is ugly. It is that **nothing on screen told them `^` was wanted.**

Verified by executing the placeholder expression at `cfu.tsx:76-87` against the real `content/lessons/d2/EXP.1.json`: **the field advertises exactly `"Your answer"`.** It falls all the way through, because `EXP.1` has no `cfu.check` (so there is no simplification profile to read) and its accepted-list contains no radical and no absolute-value bars (so neither notation branch fires).

Meanwhile `POSITIVE_EXPONENT_PLACEHOLDER` already exists in the same file and already says the right thing: `"Positive exponents only, e.g. x^3 or 1/x^2 or x^3/y^4"`. It is simply not reachable from that branch. A tappable `x^☐` and `☐/☐` pair is that guidance made physical.

**This is the one finding in this note most likely to expire**, because it is precisely what the concurrent placeholder work is fixing (§11). Re-check it at the tip before acting on it.

> **It has expired, and the finding stays because the defect it names is what the fix is measured against — recorded 2026-07-30.** The EXP.1 CFU field advertises `POSITIVE_EXPONENT_PLACEHOLDER`, not `"Your answer"`, and has since `e2915e6` (2026-07-28), which is an ancestor of `2814951`. Two assertions on the **real** pack rather than on a fixture: `answerPlaceholderFit.browser.test.tsx` renders `content/lessons/d2/EXP.1.json`'s card at the card's own width and asserts the rendered field's `placeholder`, and `answerKeypad.test.ts` asserts that its `accepted[0]` is `1/x^2` and that the card offers `^` and `/`. The reachability the paragraph above asks for is what `cfuPlaceholder` and `cfuNotation` in `answerFormat.ts` are: the CFU card and the two practice surfaces now read one dispatch, so the specific way this failed — practice naming the notation while the CFU card said nothing — is no longer expressible.
>
> **The same class of unreachable placeholder has been closed further in the working tree on top of `2814951`, and two cases were deliberately left open.** `cfuNotation` now recognises interval, point and solution-roster answers off `accepted`, so `INTERVAL_PLACEHOLDER`, `POINT_PLACEHOLDER` and `SOLUTION_SET_PLACEHOLDER` reach CFUs that used to meet the bare line; `answerFormat.test.ts` censuses each line against the node ids that get it (LIN.4 and LIN.6, LF.4, LIN.5 and RAT.6) rather than asserting containment. **EL.2 and EL.4 stay on the bare line on purpose**, and so does RAT.5: each of their answers is a composite of unlike parts — an asymptote equation beside a point, an inequality beside an equation, a bracketed pair beside two equations — so every one of those three lines would claim the whole answer is something it is not, and all three prompts already carry the literal typing they want. That is a named exemption with a test of its own ("leaves a composite answer of unlike parts on the bare line"), which asserts both the bare line and the prompt's typed example, not a gap. None of those three lines owes a key, so this closes guidance and adds no notation. Read the counts and cohorts at the tip: this paragraph is a reading of assertions in an uncommitted tree, and it is at least as perishable as the finding it is annotating.

**2. It has zero grader surface.** A keypad inserts `^` and `/` into a text field. The string reaching the checker is the same string a keyboard would have produced. No conversion layer, no parse, no new correctness surface, no version question, and nothing to prove about the 693 recorded-response replay path.

**3. It composes with the boundary normalizer to cover the LaTeX case anyway.** Together, keypad plus normalizer means the learner who taps gets valid ASCII, **and** the learner who pastes `\frac{1}{x^2}` from somewhere gets it rewritten. Neither needs a WYSIWYG field.

**4. It is better on mobile than either alternative** (§6.2).

**5. It keeps the a11y guarantee we own.** A `<button>` labelled "insert a fraction" has one accessible name and needs no MathML fallback.

**What it genuinely does not do**, and this should not be smoothed over: **the fraction still does not look like a fraction.** The learner sees `1/x^2` on one line, not a stacked numerator over a denominator. If the owner's objection is specifically about *visual fidelity during entry*, a keypad does not deliver it and no amount of arguing changes that. What it delivers is discoverability, correctness of what reaches the grader, and mobile ergonomics, which is most of the reported pain and none of the reported risk.

There is a middle option worth naming: a **live typeset preview under the plain field**, rendering the ASCII the learner has typed through the KaTeX that is already in the bundle. The learner types `1/x^2` and sees a stacked fraction render beneath. That is one-directional (ASCII in, LaTeX out), which is the direction `ExprBuilderInput` already proves works, and it closes most of the visual-fidelity gap for a fraction of the cost. It needs an ASCII-to-LaTeX renderer, which is presentational and cannot affect a verdict.

---

## 8. Recommendation: three phases, with a named trigger between each

### Phase 1 — now. Boundary normalization plus an insert-template keypad. **4 surfaces.**

1. **A shared input-boundary normalizer**, extending the existing `normalizeTextSubmission` seam in `answerFormat.ts`. Parser-based, not regex (§2.4a). It must **refuse rather than guess** on ambiguous scope, returning the input unchanged so the existing `invalid_input` path handles it. Scope: LaTeX brace grouping, `\frac`/`\dfrac`, `\cdot`/`\times`, `\left`/`\right`, `\sqrt`, and `**` for `^`. Applied to the value that **becomes** `raw_answer`, per §2.2.
2. **Apply it on all three typed-text entry points**, which requires fixing an existing inconsistency: `cfu.tsx:117` passes the raw `value` to `cfuChecker` with no normalization at all, while practice normalizes. That asymmetry is a live bug independent of this work.
3. **A keypad of insertable templates** above the field, driven by the item's `answer_spec` so an EXP.1 item offers `x^☐` and `☐/☐` and a `multiple_choice` item offers nothing.
4. **Optionally, the live typeset preview** (§7). Cheap, presentational, and it is the piece that most directly answers "make a fraction look like a fraction."

No checker changes. No content changes. No version bump, proven in §2.3.

**Also worth doing in Phase 1 and cheaper than any of the above:** the 20 hand-enumerated LaTeX strings across 7 content packs become **redundant** once the normalizer exists, and the CFU-versus-practice inconsistency closes as a side effect. Leave the strings in place; they are harmless once the normalizer makes them unnecessary. Do not add more.

### Phase 2 — only if Phase 1 proves insufficient. Extend `expr_builder`. **3 module files plus N templates.**

Trigger: **learners still fail EXP.1-class items on notation after Phase 1**, measured off `reason_code` distributions (`invalid_input`/`parse_error` rate per node), not impression.

Add `reciprocal_power` (`1/base^exp`) and `power_quotient` (`a^m/b^n`). Together they cover **14 of the 34 EXP.1 text items across 3 of its 5 text templates**, including the screenshot's `1/x^2`. Grading is by construction, so there is no parse and no checker change. Re-point items node by node.

### Phase 3 — a full WYSIWYG field. Do not start until all four of these are true.

1. **The conversion layer is a parser with a false-positive battery**, in the shape §13.16 requires of sampled equality. It must be provably identity on every string the checker currently accepts, evidenced the way §2.3's differential is, over the whole 693-item text corpus rather than a sample.
2. **Phase 2 has been shipped and measured insufficient.** If structured slot entry closes the gap, a general editor is a larger answer to a smaller question.
3. **A named node needs an answer no `expr_builder` shape can express AND that learners demonstrably cannot type.** Both halves. Today the closest candidate is a D7 `expression` right-hand side or a D5 `rational_answer`, and neither has evidence of a notation failure.
4. **The a11y announcement model is verified against a screen reader**, not against the library's documentation, and pinned by a test in the shape `ExprBuilderInput.browser.test.tsx:87-101` already uses.

**One thing to check before Phase 3 that could shrink it substantially:** MathLive advertises `format="ascii-math"` and MathJSON alongside LaTeX. If a mathfield can be made to emit ASCIIMath directly, and if ASCIIMath's output shape is close enough to this repo's grammar, the "conversion layer" becomes "configure the output format" plus a thin adapter. **I could not verify this** (§10) and it is a one-afternoon spike that would materially change the Phase 3 estimate.

---

## 9. Decisions, by owner

Read off `OWNERS.md` and `docs/Content_Authoring_Split.md`.

**Gabe's** (owns `packages/shared-components`, `packages/item-bank` code, and the checker):

1. **Whether the broader Phase 1 ships at all.** The narrow `√` canonicalizer is shipped; LaTeX-shaped input remains undecided.
2. **The broader normalizer's refusal policy.** The shipped root slice establishes the precedent: refuse `√2x` rather than guess. Other syntax still needs equivalent rules.
3. **Whether the literal keystrokes are worth a schema field** (§2.4b). `AssessmentItemSubmission` is `packages/shared-state-schema`, his lane. Additive, no migration risk to existing rows.
4. **Whether `expr_builder` gets the two new shapes**, and which items re-point. Changing an item's `answer_spec` changes its `hashItemDefinition` and its practice-pool entry, which is an **item-version** change and not a checker-version change, exactly as the `combined_constants` note records for `d1.num-3.l3`.
5. **How a broader normalizer reuses the shipped root boundary.** Do not create a second, competing canonicalization path.
6. **The three D2 content packs** (`EXP.1`, `RAD.1`, `RAD.2`) whose accepted-lists carry LaTeX. D2 is Gabe's domain.

**Anthony's** (owns `engines/lesson` and the D5/D7/D8/D9 content packs):

7. **The four packs whose accepted-lists carry LaTeX in his domains** (`d5/RAT.1`, `d5/RAT.2`, `d5/RAT.4`, `d7/LF.1`). Nothing needs unwinding; the question is whether to keep adding LaTeX spellings by hand once a normalizer exists. Recommendation: stop.
8. **Whether a keypad appears on the CFU surface.** `cfu.tsx` renders inside the lesson flow he owns, and a keypad changes the lesson's visual rhythm.
9. **The item-side opt-in for any new `answer_type`,** for his nodes.

**Evan's** (owns `engines/game`):

10. **Nothing on the critical path.** The one adjacent call is bundle budget: the city route carries `react-three-fiber` at 234 KB gzipped and 6.4 MB of `.glb`, so if a math editor is ever loaded eagerly it competes with his lane's budget. Lazy loading (§6.3) makes this a non-question, which is why it is a courtesy note rather than a decision.
11. `city/storm/StormBattleRound.tsx:58-64` has a plain text field that is **not** graded by any checker. If storms ever grade math it inherits this decision, and today it does not.

**Not assigned by `OWNERS.md`:** `apps/web` has no owner row. `cfu.tsx`, `PracticeAnswer.tsx` and `answerFormat.ts` all live there, and Phase 1 touches all three. **Someone should say who signs off on `apps/web/src/lessons/`** before Phase 1 starts. Flagged rather than assumed.

### 9.12 — 2026-08-05: decision 8 is closed, and the keypad is gone from every surface

Appended rather than edited, because the sections above are a record of what was decided when. Decision 8 asked whether a keypad appears on the CFU surface; the answer is that it appears on **no** surface. The product lead directed its removal everywhere, and the question the direction had to survive — *can any served item now only be answered with the strip?* — was re-derived rather than re-argued.

The population is every item any answer surface can serve, which is wider than any sweep in this note or in `#562`'s guard: the **diagnostic's own walk pack** (456 items) beside all eleven practice pools (2,265) and every rendered CFU ask (124), each graded through the checker its own surface grades with.

```
notation the strip could type ......... "*" "/" "^" "abs()" "pi" "sqrt()"
                                        all printable ASCII a keyboard has
(item, notation) the grader REQUIRES .. 373
  named by the item's own line ........ 371
  named ONLY by the key row ...........   2   d5.rat1.monomial.l1
    and both grade without it:  "3*x^2/2" as "3*x*x/2"  correct/match
                                "6*x^2/5" as "6*x*x/5"  correct/match
```

`d8.el5.condense-sum.l2` — the seven items `#573` retained the strip for — still needs its star (`log(maq)` lexes as one symbol), and its own line has read *"Use \* between letters: log(a\*b)"* throughout, so the strip was a second mention rather than the only one.

**Two things in this note are now false and are left standing as history.** §3.3's fork (c) and §10's 2026-07-30 additions describe a tab order through the keypad's buttons between the two D5 fields; there are no buttons in that column now, so the D5 order is expression, exclusions, Check, driven in `mathAnswerColumn.browser.test.tsx`. And the file those sections cite as their warrant — `mathKeypad.browser.test.tsx` — is `mathAnswerColumn.browser.test.tsx` at this tip; `loadBearingNotation.browser.test.tsx` is still itself and still carries the measurement behind the removal.

**What did NOT change is Phase 1's other half.** The placeholder dispatch, the live preview and `answerNotation`'s one tag-per-item table are all still here and still doing the work §11 describes. What replaced the strip is a durable version of the line it stood over: `MathAnswerColumn` repeats the item's own notation line under the field for as long as the field is non-empty, because a `placeholder` is painted only while the field is EMPTY — so *"Use ^ for a power"* used to disappear at the first keystroke of the power it was about.

**Still not started, and still unrecommended:** the boundary normalizer (Phase 1 steps 1-2). Decisions 1-6 above are untouched.

---

## 10. What was verified, what was inferred, and the holes

**Verified by running code** (a scratch probe against the real checkers and the real `createAuthoritativeScorer`, deleted afterwards; the tree is clean):

- Every LaTeX and brace spelling in §1.2, graded through `createProductAnswerChecker` over the live `D2_PRACTICE_ITEMS` pool.
- All five rows of §2.3, including the reproduced client/server divergence and the deep-equality of before/after verdicts on already-accepted strings.
- Pool composition in §3 and the notation classification in §3.1, computed over all five registered pools.
- Bundle sizes in §6.3, from a real `vite build`, and the presence of `KaTeX_*.woff2` in `dist/assets/`.

**Verified by reading the code at `40f5143`:** the surface table in §1; the four version constants and `DIAGNOSTIC_CHECKER_VERSION = D1_CHECKER_VERSION`; the `raw_answer` flow through `engines/lesson`, `services/scorer` and `DiagnosticRunner`; `expr_builder`'s four shapes and slot constraints; the `InteractiveAnswerModule` contract and its `renderMath` seam; the `aria-hidden` + live-region a11y pattern and its pinning tests; the mobile input attributes and `foldSymbolCase`; the widget and test counts.

**Verified by counting files:** the 96 lesson widgets and their modality breakdown; the 21 content packs and 20 LaTeX accepted strings; the 41 browser test files; the 5 `getByRole("textbox")` files.

**Verified by executing the placeholder logic against real content:** that the EXP.1 CFU field advertises exactly `"Your answer"` (§7.1). The `cfu.tsx:76-87` expression was run against `content/lessons/d2/EXP.1.json` rather than traced by eye.

**Verified by the GitHub API:** PRs #47 and #49 both `MERGED`, at 2026-07-24T22:27:18Z and 2026-07-24T22:28:06Z. Read from `mergedAt`, not inferred from pushes.

**Inferred, from outside the repo, and flagged as such:** MathLive's ~728 KB minified size and its maintainer's position on reducing it; that it shares the KaTeX fonts (corroborated by its integration guide preloading `KaTeX_*.woff2`, and consistent with those fonts already being in our `dist/`); its ARIA/MathML/speech features; that its keycaps expose Playwright hooks. All from public sources, none from this codebase.

**Inferred, from reading rather than running:** that a `<math-field>` would not answer `getByRole("textbox")` and would not respond to `fireEvent.change`. This follows from it being a shadow-DOM custom element, but **I did not install MathLive and prove it.**

### The three holes

1. **I did not measure MathLive's gzipped size, its first-paint cost, or its real behaviour in this Chromium suite.** Everything in §6.3 and §6.4 about the library is a reading of public sources plus an inference. Closing this is a spike: install it, lazy-load it behind one route, build, and drive it from one browser test.

2. **I could not establish whether MathLive's `ascii-math` output is close to this repo's grammar.** This is the single highest-leverage unknown in the note, because it is the difference between "write a LaTeX parser" and "configure an output format." It is also the cheapest to close.

3. **I could not establish whether any recorded response exists in production**, and neither could the `√` decision packet. `assessment_item_response` ships in migrations 0001-0003, `infra/lib/calc-readiness-stack.ts` defines the CDK stack, and the only workflow is `invariants.yml` with no deploy job. Absence of a deploy workflow is not evidence of absence of a deployment. **This note does not depend on the answer**, because the §2.3 argument is byte-identical-checker rather than no-responses-exist, and that is deliberate. But nobody should reach for the deployment fact to justify anything here.

**One thing I want to be explicit about not having done:** I did not build a prototype of either the keypad or the normalizer, so §7's claim that a keypad addresses the reported pain is an argument from the code and the screenshot, not a measurement of learners. The `reason_code` distribution named as Phase 2's trigger does not exist yet; it would have to be collected.

### The 2026-07-30 additions, on the same terms

Two dated blocks were appended after the original note: §3.3.1 and the expiry notice in §7.1. They are held to this section's own register rather than exempted from it.

**Verified by reading the source, in the working tree on top of `2814951`:** that `RationalAnswerInput` wraps its expression input alone in `MathAnswerColumn` and leaves the exclusions input bare (`PracticeAnswer.tsx`); that `answerNotation` dispatches `rational_answer` through `rationalNotation` and so returns a tag rather than `none` for that type; that `rationalNotation` splits on the bar first, then the caret, then a load-bearing star, into the four tags §3.3.1 lists; that `keypadForNotation` gives those tags `/`, `^ /`, `/ *` and nothing; that no `answerFields(item)` seam exists and the dispatch is still per item; and that `cfuNotation` recognises coordinate pairs, intervals and rosters.

**Verified by reading the tests' assertions, at the same tree state, and NOT by running them.** This is a weaker warrant than anything else in this section and is the reason the distinction is drawn: every count in §3.3.1 — 140, 84, 12, 68, 2, 14, 56 — and the `d5.rat3` / `d5.rat1.monomial.l1` template lists are the literals those assertions carry, in `answerFormat.test.ts` and `answerKeypad.test.ts`. The tab order, the two-textbox count, the single keypad group and the preview are the literals in `mathKeypad.browser.test.tsx`'s driven tests. A green run of those suites is claimed by the work that wrote them and is **not** re-verified here.

**Verified by the git history:** that `e2915e6` is dated 2026-07-28 and is an ancestor of `2814951`, and that `cfuPlaceholder` plus the EXP.1 placeholder assertion are present at `2814951` while the D5 column, the four `rational_*` tags and the CFU form-line recognition are not. That is what dates the §7.1 expiry to a commit and confines everything in §3.3.1 to the working tree.

**Derived rather than asserted, and flagged in place:** the 8 polynomial-keyed templates in §3.3.1's table. It is this note's own 20 less the tests' 12, so it carries the older tree's provenance and no more.

### The 2026-08-09 addition, on the same terms

One dated block was appended to §3, re-measuring the widget modality table. **Verified by running code:** a script over `git ls-tree` and `git show` at two revisions, parsing every `<input>` tag body under `apps/web/src/lessons/interactive/` for its `type`, giving 103 widgets / 26 with an input / 18 number inputs at `40f5143` and 273 / 84 / 49 at `36271021`. **Verified by `git grep`:** the twelve-file literal count at `40f5143`, enumerated rather than totalled, and `MixedRadicandSolver.tsx` among them on a docblock. **Not verified, and not claimed:** why the original read 96 widgets where the same directory at the same SHA holds 103 non-test `.tsx` files. The two counts differ by seven and the original does not say what it excluded, so the note re-measures the row it is about and leaves that one alone.

**The holes in these two blocks:**

1. **No SHA exists for the §3.3.1 work.** It is uncommitted, so every reference in that sub-section is addressed to a working tree and is void once it lands, is rebased or is amended. Re-read it, do not cite it.
2. **The suites were not run.** If an assertion in those files is itself wrong or vacuous, §3.3.1 repeats the error, and the rate at which that happens in this tree is not low — `.cursor/rules/qa-verification.mdc` records thirteen guards found green while measuring nothing or the wrong thing over two days. What can be said for these particular ones is narrower and worth saying: the D5 exemption is scoped to a tag rather than to a file, is held in both directions, and carries a count (56 exempt against 140 in the pool) rather than a containment claim, which is the shape that fails when the population empties.
3. **Nothing here measures a learner.** The whole of §3.3.1 is about which characters a field offers. Whether the D5 expression field's keypad reduces `invalid_input` on RAT.1-RAT.4 is unmeasured, exactly as the note's closing paragraph above says of the keypad generally, and it is the same missing `reason_code` distribution.

---

## 11. Interaction with the concurrent placeholder work

Another worker is fixing placeholder and syntax guidance on these same input surfaces, as the short-term mitigation for this screenshot. **No file that work touches was modified to write this note**, and the tree is clean at `40f5143`.

That work is the right immediate fix and this note does not compete with it. Three points of contact:

1. **It is Phase 1 step zero, and it should land first.** The concrete defect is that the EXP.1 CFU falls through `cfu.tsx:76-87` to `"Your answer"` while `POSITIVE_EXPONENT_PLACEHOLDER` already exists and says exactly the right thing. A branch making it reachable is a strictly smaller change than anything here.

2. **The keypad in Phase 1 step 3 should read from the same source of truth the placeholder does.** `practicePlaceholder(spec, allowedSymbols)` (`answerFormat.ts:131-159`) already dispatches on `required_notation`, `answer_type` and `simplification`. A keypad wanting "which templates does this item need" wants that same dispatch, so it should extend that function's family rather than grow a parallel table. **If that worker restructures `practicePlaceholder`, this note's Phase 1 follows their structure, not the other way round.**

3. **Resolved 2026-08-18:** `answerFormat.test.ts` and the radical placeholder now advertise `√` because the shared boundary canonicalizer accepts its unambiguous forms. The change landed with the normalizer and practice-surface tests, not as an unrelated copy edit.
