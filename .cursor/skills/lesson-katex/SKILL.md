---
name: lesson-katex
description: KaTeX/LaTeX math formatting conventions for calc-readiness lesson content. Use when authoring or editing any learner-visible math string — a lesson JSON, CFU, practice-item prompt, hint, worked-solution step, an interactive widget or worked-solution diagram, or a figure caption. Covers $...$ wrapping, JSON backslash escaping, operator/fraction/percent conventions, the SvgMath/InlineMath/EquationRow diagram primitives, the item-bank prompt builders, and the ASCII input grammar the answer field, its notation note and the preview speak (including cfu.accepted[0]).
---

# Calc-readiness math formatting (KaTeX)

**Every learner-visible math element is typeset with KaTeX.** There is no second notation: a learner never sees `1/2`, `2 + 3 x 4`, `4(x + 6)`, `25%`, or Unicode `−`/`×`/`÷` anywhere in the product.

Two rendering paths, same LaTeX either way:

| Where the math lives | How it renders | Delimiters |
|---|---|---|
| Markdown strings: mini-lesson dialogue, CFU `prompt`/`hint`, practice prompts, hints, `worked_solution` steps, figure captions | `LessonProse` (remark-math + rehype-katex) | wrap in `$...$` |
| Teaching slide section 2 (`worked_examples[i]`, both the `prompt` and the `steps`) | `LessonProse` (same as CFU steps) | wrap in `$...$` |
| Inside a visual: interactive widgets (`apps/web/src/lessons/interactive/*.tsx`) and worked-solution diagrams (`workedSolutionVisuals.tsx`) | `SvgMath` / `EquationRow` / `InlineMath` from `svgKit.tsx` | none — the prop value **is** the LaTeX |

## Conventions

The notation below is the same on both paths; the `$...$` in these examples belongs to the Markdown path, and inside a visual you pass the identical LaTeX without delimiters.

- **Wrap all math, not just fractions.** Any number in a math context and any expression goes inside `$...$` — `$-7 + 4$` not `-7 + 4`; `$5x$` not `5x`.
- **Fractions:** `\dfrac{a}{b}` (stacked) — e.g. `$\dfrac{1}{3} + \dfrac{1}{6}$`.
- **Operators:** multiplication is `\times` (or `\cdot`), division is `\div`. Never a bare `x`, `*`, or `/` for an operator.
- **Negatives:** render as `$(-3)$`.
- **Percent:** `$25\%$`.
- **Keep instruction text outside the delimiters.** Plain-language directions ("Write your answer as a fraction in lowest terms.") stay outside `$...$`; only the math is delimited.

## JSON escaping (critical)

Lesson content lives in JSON, so **every backslash is doubled** in the string:

```json
"$\\dfrac{2}{3}$"
"$3 \\times 4$"
"$25\\%$"
"$-7 + 4$"
```

A single backslash in the JSON source is invalid/again-escaped and will render wrong.

TSX source is not JSON, so a widget or diagram written in `.tsx` still needs the backslash escaped for the **string literal**: `latex="\\dfrac{2}{3}"` (or a template literal `` `\\dfrac{${n}}{${d}}` ``).

## What the learner READS is LaTeX; what the learner TYPES is ASCII

The rule above governs every string a learner reads. The answer they write back is the one place the notation is deliberately different, and the two are easy to confuse because they sit inches apart on the same card: the prompt asks for `$\dfrac{1}{3}$`, and the field, the notation note under it and the live preview under that all speak plain ASCII, so the answer is `1/3`.

- **The input grammar is the checker's grammar, unconverted.** Every notation the field advertises is a literal ASCII spelling and nothing else — `/`, `^`, `sqrt()`, `abs()`, `*`, `pi` (`MathKey.insert` in [`answerFormat.ts`](../../../apps/web/src/lessons/answerFormat.ts)) — so what a learner types goes to `checkAnswer` unconverted, with no normalization pass anywhere between the field and the grader. (There was a tappable `Insert notation` keypad over this grammar until 2026-08-05; `loadBearingNotation.browser.test.tsx` carries the measurement behind its removal.) Never author LaTeX into anything the learner is expected to reproduce: `\dfrac{1}{3}` is not a gradable answer.
- **The preview is one-directional.** [`MathPreview`](../../../apps/web/src/lessons/MathPreview.tsx) reads the field's ASCII, draws it through the same KaTeX in the bundle (`1/x^2` becomes a stacked fraction), and discards the LaTeX; the value itself goes to the grader untouched. It is a reading, never a verdict, so an undrawn preview means only that there is nothing safe to draw yet.
- **`cfu.accepted[0]` must be the canonical ASCII spelling**, because it does double duty. `cfuNotation` reads it to choose the placeholder and the key row the card offers, so a LaTeX spelling there misroutes the dispatch and can leave a learner with a bare "Your answer" over a bar they cannot guess; and `WidgetReveal` prints that same string back as the answer the learner is then asked to produce, so it has to be a string they can type. List the spacing and star variants after it (`["6*sqrt(2)/5", "6sqrt(2)/5", "6sqrt2/5"]`) — the first entry is the canonical one, and `answerFormat.test.ts` pins it byte-identical to `check.answer_key` for every spec-carrying CFU.
- **So the prompt and the answer disagree on purpose**, and both are right: `"Evaluate $\\dfrac{1}{3} + \\dfrac{1}{6}$."` with `"accepted": ["1/2"]`. The placeholder under the field is what closes the gap for the learner, and it is chosen by the answer spec rather than authored per item (see the `practice-templates` skill and `.cursor/agents/lesson-planner.md` §"Answer input format").

## Math inside a visual

Import the three renderers from `apps/web/src/lessons/svgKit.tsx` (never from `visuals.tsx`, which would cycle):

- **`SvgMath`** — one label in SVG user space, hosted in a `foreignObject`. `y` is the label's vertical **center**, not a baseline. Use it for every math label in a diagram.
- **`EquationRow`** — a centered row of `EqToken`s, one KaTeX span per token, for equations whose parts are colored by concept. `EqToken.text` holds LaTeX; `sup` folds in as `^{...}`.
- **`InlineMath`** — math in the surrounding HTML: button labels, chips, field labels, `aria-live` status lines. `LessonProse` is wrong there because it emits a block `<p>`.

Conventions specific to visuals:

- **Colors are CSS, not `\textcolor`.** The palette is CSS variables (`var(--ink)`, `var(--civic)`), which KaTeX's color parser rejects. Pass `color` / `role` and let the span's CSS `color` do it. This is why an `EquationRow` is many spans rather than one.
- **`\dfrac` in a diagram, `\tfrac` in a control.** A stacked fraction needs vertical room; a chip or button label does not. If a `\dfrac` appears in an existing diagram, widen the `viewBox` rather than shrinking the fraction.
- **A KaTeX box's BOTTOM is its baseline plus its DEPTH, so a row mixing tall and short math must align on baselines.** Depth is whatever the deepest ink needs and it swings with the content: at the labeling figures' size, 6.4px under `(0,\, 7)` against 0.0px under a bare `3`, and `\sqrt`, subscripts and stacked fractions all move it. Line two such boxes up flush and you have set their baselines 2px apart, which is subtle enough to survive review and obvious enough that a learner sees one term sitting below the row it belongs to. Align the LINE BOXES instead: give both sides the same `line-height`, deep enough that no expression overflows it downwards, and inline layout puts every baseline on one line regardless of content (`--label-num-line` is the worked example). Centering vertically is the same trap upside down — a wrapper span holding KaTeX is a line box the math can overflow at the top, so make the wrapper a flex container and center the `.katex` box itself. When asserting any of it, read the baseline off KaTeX's own `<span class="strut">`, whose computed `vertical-align` is the negative depth; `apps/web/src/lessons/katexBaseline.ts` does this. Measured off the `.katex` box instead, the same subtraction reported 5.1px of stagger where the strut says 0.0px: a plausible number, in the right units, off by an element.
- **Only math goes through KaTeX.** Plain `<text>` still owns non-math labels ("order", "grouping", unit words in an axis title) and bare integer axis ticks, where KaTeX buys nothing and costs one `foreignObject` each.
- **Give the SVG an `aria-label`.** In-diagram math renders HTML-only (no MathML), so the accessible description lives on the `<svg role="img">`. Spell values out in words there: "negative 7", "seven twelfths".
- **A dollar amount never nests `\$` inside `$...$`.** remark-math treats every unescaped `$` as a delimiter, so `$\$12$` / `` `$\\$${n}$` `` closes the math span at the currency sign and dumps the rest of the prompt as broken prose. Put the sign **outside** math as markdown-escaped `\$`, then wrap only the digits: `\$$12$` or `\$$12.00$`. Prefer the helpers `latexDollarInt(n)` (whole dollars) and `latexDollar(n)` (cents) from `promptFormat.ts`, which emit that pattern. Hand-writing it in a template literal needs THREE `$` before the interpolation (`` `\\$$${n}$` ``): two survive as text, the third is eaten by `${`. Two leaves a lone opener that swallows the next sentence into math.

## Prefer the shared prompt builders

For practice-item prompts and worked-solution steps, use the LaTeX builders in `packages/item-bank/src/promptFormat.ts` instead of hand-writing LaTeX, so new items render exactly like existing D1 templates:

`evaluateMath`, `expandMath`, `expandAndCombineMath`, `simplifyMath`, `percentOf`, `percentWhat`, `latexFrac`, `latexFracOp`, `latexFracMul`, `latexFracDivGroupAdd`, `latexAbs`, `additiveInversePrompt`, `reciprocalFracPrompt`, `latexNum`, `unitRatePrompt`, `FRACTION_LOWEST_TERMS_SUFFIX`, `latexDollar`, `latexDollarInt`.

For worked-solution step formatting also use the helpers in `packages/item-bank/src/d1/hints.ts` (`workedSolution`, `signed`, `fracFromString`).

## Verify before finishing

- Every inline number/fraction/expression is inside `$...$`.
- Every backslash is doubled in the JSON.
- Operators use `\times` / `\div`, fractions use `\dfrac`, percents use `\%`.
- No bare ASCII math anywhere in a rendered string — and, in the other direction, no LaTeX anywhere the learner has to TYPE: `accepted[0]` is the canonical ASCII spelling (`1/3`, `6*sqrt(2)/5`), which is what the notation dispatch reads and what `WidgetReveal` prints back.
- No math left in a raw SVG `<text>`/`<tspan>` or a plain HTML label — `apps/web/src/lessons/visualsMath.test.tsx` renders every live visual and worked solution and fails on bare math, so run it after touching a diagram.
- Captions are Markdown with their math in `$...$`, and any `$` meaning "dollars" uses `latexDollar` / `latexDollarInt` (or `dollarsProse` in a worked-solution caption), producing `\$$12$` — never `$\$12$`.
- Markdown emphasis (`*word*` / `**word**`) is intentional: `em` and `strong` are styled in lesson prose / advisor bubbles. Prefer `*signal phrase*` for cue words and `**term**` for key vocabulary.
