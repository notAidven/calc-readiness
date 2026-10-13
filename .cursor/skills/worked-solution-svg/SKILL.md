---
name: worked-solution-svg
description: Register parameterized SVG worked-solution visuals for calc-readiness practice templates and lesson checks. Use when adding or changing a practice template's problem shape so its revealed worked solution renders as a mini-lesson-style SVG driven by template_params, not just the step-card fallback, or when a lesson CFU needs a figure on its authored question or its re-ask. Covers the WORKED_SOLUTION_VISUALS registry, the existing archetypes, KaTeX-typeset diagram math and captions, the cfu.* check-only keys and worked_solution_template, and how to add a new params-driven SVG.
---

# Worked-solution SVG visuals

Revealed practice solutions render as **parameterized SVG diagrams** styled exactly like the mini-lesson visuals (`apps/web/src/lessons/visuals.tsx`), driven by each instance's `template_params`. The registry lives in `apps/web/src/lessons/workedSolutionVisuals.tsx`; `WorkedSolution` looks up `getWorkedSolutionVisual(template_id)` and, on a hit, renders a `<figure className="lesson-visual">` with the SVG plus a Markdown caption rendered through `LessonProse`. An unregistered `template_id` falls back to the colorful step cards built from the `worked_solution` array.

All math in these diagrams is typeset by KaTeX through `SvgMath` / `EquationRow` from `svgKit.tsx`, and the caption's math is `$...$` Markdown. Follow the **`lesson-katex`** and **`svg`** skills for the conventions; the notes below are what they mean for this file.

For the **full template pipeline** (shape, generate, pool, hints, NPC notes), follow the **`practice-templates`** skill. This skill is the deep-dive for the SVG half of the pair.

## Both are required for every new practice template

1. The `worked_solution` steps array (item-bank; what `validateTemplates` checks; the step-card fallback) — see the `practice-hints` skill.
2. A `WORKED_SOLUTION_VISUALS[template_id]` entry (web; the primary reveal UI).

All current D1 templates are registered. When you author a **new** practice template (or change a problem shape enough that the existing SVG is wrong), add or update the SVG entry — never leave a new `template_id` on the step-card fallback.

## The other caller: a lesson CFU's authored question

A registered visual has a second audience. The end-of-lesson check's reveal renders through this
same `WorkedSolution`, and its re-asked question carries a real `template_id` and
`template_params`, so it lands on your figure exactly as a practice card does. Two consequences
for anything you register or change here:

- **The params you honour are not only the ones `generate()` draws.** A pack's `cfu.worked_solution_params` is a HAND-WRITTEN set aimed at the same entry, so a figure can be
  asked to draw a value outside its template's range: `d8.el1.decay-value.l2` draws `b` from
  `{2, 3}`, and `d8.el3.evaluate-base.l2` draws `k` from 2 to 4, while a CFU reaches both with
  `b: 4` and `k: 5`. Coalesce, compute, and lay out from the params rather than from the range,
  and prefer a height derived from the row count over a fixed one.
- **A caption denominated in the template's SCENARIO limits where the figure can be reused.**
  `d8.el1.decay-value.l2`'s caption counted milligrams by the day, which is right for its own
  prompt and wrong under a CFU asking about a job queue by the hour. It was reworded in terms
  of STEPS, which is true of both. A caption that talks about the STRUCTURE ("the sign points
  towards the bars", "the whole numerator is divided by 4") travels; one that names the story
  does not, and re-denominating it is usually cheaper than refusing the figure.
- **A pack can point its authored figure somewhere else.** `cfu.worked_solution_template` names
  a different registered template for the authored question alone, so a figure that fits the
  re-ask but not the authored prompt no longer forces a choice between the two.

### Registering a figure for a CHECK-ONLY template

Fifteen checks re-ask from a `CFU_ONLY_TEMPLATES` generator in
`apps/web/src/lessons/cfuVariants.ts` rather than a practice pool, because no pool item asks
their question. **The registry is not keyed on practice templates only**: those generators own
`cfu.<node>.<shape>` keys in it, authored in `worked/cfuD1D2.tsx`, `worked/cfuD4D5.tsx` and
`worked/cfuD7D8D10.tsx` and spread-merged like every other module. Register one the same way
you would a practice figure, reading the schema off the generator's own `params` record.

**A composite answer has to be closed on in full.** These generators exist because the check
asks two or three things at once — an expression AND the values its denominator forbade, a hole
AND two asymptotes, a slope AND the direction it implies — and a diagram that ends on the first
part looks finished while answering a third of the question. Print every part on the closing
row: `cfu.rat5.hole-asymptotes` ends `(4, 5) ; x = 1 ; y = 3`.

`.cursor/skills/author/reference.md` §5a owns the authoring side. Three guards hold the claim
up: `cfuAuthoredFigure.test.tsx` (each authored figure names its question's answer),
`cfuFigureCoverage.test.tsx` (both questions of all 39 packs resolve a figure, and each
bespoke one names every part of its answer over six draws) and the check-only block in
`visualsMath.test.tsx` (KaTeX, no glued operators, no raw math in caption prose, twelve draws
per template).

## Existing archetypes (reuse these first)

Each is driven by `template_params`:

- `ExpressionReductionWorked` — tiered row reduction with optional PEMDAS chips and colored terms (order-of-operations, signed arithmetic, absolute value, combine-like-terms, distribute-then-combine, inverse-then-identity). Feed it a `ReductionRow[]` builder (e.g. `pemdasProductSumExtraRows`, `signedSumRows`, `absCombineRows`, `absOfSumRows`, `inverseIdentityRows`, `distributeConstantRows`).
- `AreaModelWorked` — two-cell distributive area model.
- `SignedNumberLineWorked` — number line with arc jumps (adding two signed numbers; each jump goes left/right per its sign flag).
- `InverseRecallWorked` — recall an inverse (`kind` 0: additive inverse as the mirror of a value across 0; `kind` 1: reciprocal as a numerator/denominator swap).
- `FractionBarsWorked` — bars over a common denominator (add/subtract via explicit `fillSum`; an improper sum in `(1, 2)` renders as a full unit bar plus a second remainder bar).
- `FractionMultiplyWorked` — multiply straight across, then reduce (stacked `\dfrac` rows via `FracReductionRows`).
- `FractionDivideAddWorked` — grouped divide-then-add, `(\dfrac{a}{b} \div \dfrac{c}{d}) + \dfrac{e}{f}`, as stacked `\dfrac` rows.
- `PercentBarWorked` — shaded percent bar for "p% of X".
- `PercentSolveWorked` — "what percent of X is Y" (shade Y within a bar of length X).
- `UnitRateWorked` — divide-to-one then scale up, as `\dfrac{\$12}{3\ \text{notebooks}}` rate labels.

## How to add or reuse one

1. **Check for a fitting archetype.** If one fits the problem shape, add a `WORKED_SOLUTION_VISUALS[template_id]` entry with `Svg(params)` (wiring the archetype / row-builder) and a `caption(params)` returning Markdown whose math is in `$...$`.
2. **If no archetype fits,** build a new params-driven SVG in `workedSolutionVisuals.tsx` that reuses the exported `svgKit.tsx` / `visuals.tsx` primitives (`SvgMath`, `EquationRow`, theme color tokens, `PEMDAS`, `EqToken`, `stackGapMid`), following the `svg` skill at `.cursor/skills/svg/SKILL.md` (viewBox + lesson-visual alignment checklist), then register it.
3. **Never set a `font-family`.** KaTeX brings the face for every piece of math, and a non-math label is prose that belongs in the body font. There is no monospace token to reach for.
4. **Drive everything from `template_params`** so the figure stays accurate for every random instance. Match the param names the template's `generate()` records (e.g. `{a,b}`, `{p,base}`, `{kind,a,b,s}`). Coalesce possibly-undefined params (e.g. `({ a = 0, b = 0 })`) so `tsc` passes.
5. **Keep the `worked_solution` steps array in sync** with the same params — the SVG is a rendering upgrade, not a replacement for the authored steps.
6. **Honor variety axes** (`order`, `op`, sign flags, `kind`) the same way `generate()` does so the figure matches the shown prompt.

## Math and caption conventions in this file

- **Build LaTeX with the local helpers,** not by hand: `frac(n, d)` for a `\dfrac` in a diagram and `frac(n, d, true)` for the `\tfrac` a caption sentence wants, `fracTex(n, d)` for a fraction reduced first (it collapses a denominator of 1 to the bare integer), `dollars(v)` for `\$` inside a diagram, `dollarsProse(v)` for a dollar amount in caption prose, `numStr` / `spoken` / `fracSpoken` for the `aria-label` reading.
- **Stacked fractions are `\dfrac`.** There are no hand-rolled numerator/denominator/rule layouts left; `FracReductionRows` renders a column of `\dfrac` rows.
- **Number-line tick labels stay plain `<text>`.** They are bare integers, so KaTeX would buy nothing and cost ~15 `foreignObject`s per diagram. The equation above the line still goes through `SvgMath`.
- **A rotated label stays plain `<text>`.** `foreignObject` content does not rotate reliably, so the area model's height label is plain text (bare integers only).
- **Watch the `$` collision in captions.** A literal `$` inside a `$...$` span closes it early and dumps the rest of the caption into prose. `dollarsProse` is the way out: it escapes the sign for Markdown and gives the numeral its own span, so a caption reads `` `Divide to one: ${dollarsProse(price)} for $${count}$ notebooks.` ``. `visualsMath.test.tsx` fails on exactly this mistake.
- **A coordinate plane follows the plane rules in the `svg` skill.** Tag the plot rect `data-plot-frame`, place each point's label with `labelSpot` inside a `plotLabelFrame` and draw it with `PlotLabel`, and number only the ticks that clear the border. This matters more here than in a widget: a worked plane is rendered for every param draw, so the point can be anywhere, and a fixed offset like `mapX(x) + 42` clamped back into the box is how a label ends up parked on the axis numbers. If the window is sized to the data rather than fixed, its outermost tick moves too, so pick the numbered ticks with `fittingTicks` rather than `interiorTicks`. `worked/d7LF2.tsx`'s `WorkedPlane` is the worked example.
- **Never write `X = <reduced X>` unconditionally.** An `Svg`, its `footer` and its `caption` are written once and rendered for every param draw, so joining a raw value to its reduced form prints `3/5 = 3/5` whenever the draw was already reduced, and the row claims a step that did not happen. Use `reduceTail(n, d, inline)`, which appends `= <reduced>` only when reducing changes the value; the `l1`/`l2` fraction-bar footers and `FractionMultiplyWorked` all go through it. The same care applies to any row pair whose two sides can coincide. `visualsMath.test.tsx` fails on a rendered row or a caption that repeats itself across an `=`, sharing `hasIdentityRestatement` with the item bank's `validateTemplates`.

## Verify before finishing

- Every new/changed `template_id` has a `WORKED_SOLUTION_VISUALS` entry driven by `template_params`.
- The SVG reuses `svgKit` / theme tokens and passes the SVG alignment checklist.
- All diagram math goes through `SvgMath` / `EquationRow`, and `caption(params)` is Markdown with its math in `$...$`.
- `visualsMath.test.tsx` passes: it renders your entry for every frozen instance in the practice pool and fails on bare math in a `<text>`, a Unicode operator inside a LaTeX string, a caption whose `$...$` did not typeset, or a row/caption that repeats itself across an `=`.
- `plotLayout.test.tsx` passes if the figure draws a coordinate plane: it renders the same frozen instances and fails on a label that leaves the plot or an axis number centered against a border.
- No row or caption claims a reduction the params did not need: check the already-reduced draw, not just the one that reduces.
- `apps/web` `tsc --build` and `biome lint` are green.
