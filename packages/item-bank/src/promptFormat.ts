/**
 * LaTeX/Markdown prompt builders for item-bank templates. Practice (and assessment)
 * prompts render through `LessonProse` (remark-math + KaTeX), matching lesson/CFU style.
 */

/** Plain suffix after fraction prompts (outside math delimiters). */
export const FRACTION_LOWEST_TERMS_SUFFIX =
  " Write your answer as a fraction in lowest terms.";

/**
 * Plain suffix for a rational-power prompt whose exponent must be reduced (outside
 * math delimiters). The counterpart of {@link FRACTION_LOWEST_TERMS_SUFFIX} for items
 * where the ANSWER is a power and it is the EXPONENT that carries the fraction, so an
 * exact num/den grader is not silently requiring an unstated form.
 */
export const EXPONENT_LOWEST_TERMS_SUFFIX = " Write the exponent in lowest terms.";

/** KaTeX for π in prompts/hints. Never use in answer keys. */
export function latexPi(): string {
  return `$\\pi$`;
}

/** Wrap a numeric literal for KaTeX; negatives render as $(-3)$. */
export function latexNum(n: number): string {
  if (n < 0) {
    return `$(${n})$`;
  }
  return `$${n}$`;
}

/** Stacked fraction for display math. */
export function latexFrac(n: number, d: number): string {
  return `$\\dfrac{${n}}{${d}}$`;
}

/** Two stacked fractions joined by + or − in a single KaTeX span. */
export function latexFracOp(
  a: number,
  da: number,
  op: "+" | "-",
  b: number,
  db: number,
): string {
  return `$\\dfrac{${a}}{${da}} ${op} \\dfrac{${b}}{${db}}$`;
}

/** Two stacked fractions joined by × in a single KaTeX span. */
export function latexFracMul(a: number, da: number, b: number, db: number): string {
  return `$\\dfrac{${a}}{${da}} \\times \\dfrac{${b}}{${db}}$`;
}

/**
 * A grouped fraction division added to a third fraction: `(a/b ÷ c/d) + e/f`. The
 * explicit parentheses make the divide-first order unambiguous (no reliance on
 * operator precedence). Single KaTeX span.
 */
export function latexFracDivGroupAdd(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): string {
  return `$\\left(\\dfrac{${a}}{${b}} \\div \\dfrac{${c}}{${d}}\\right) + \\dfrac{${e}}{${f}}$`;
}

/** "What percent of X is Y?" prompt with X and Y wrapped for KaTeX. */
export function percentWhat(x: number, y: number): string {
  return `What percent of $${x}$ is $${y}$?`;
}

/**
 * Absolute-value bars around an inner math fragment: `\left|inner\right|`. Returns
 * the fragment WITHOUT `$...$` so it can be composed into a larger KaTeX span (e.g.
 * `evaluateMath(\`${latexAbs("-6")} + ${latexAbs("4")}\`)`).
 */
export function latexAbs(inner: string): string {
  return `\\left|${inner}\\right|`;
}

/** "What is the additive inverse of m?" with the value wrapped for KaTeX. */
export function additiveInversePrompt(m: number): string {
  return `What is the additive inverse of ${latexNum(m)}?`;
}

/** "What is the reciprocal of a/b?" with the fraction wrapped for KaTeX. */
export function reciprocalFracPrompt(a: number, b: number): string {
  return `What is the reciprocal of $\\dfrac{${a}}{${b}}$?`;
}

/**
 * A variable term as a bare fragment: `3x`, `x`, `-x`. Returns the fragment WITHOUT `$...$`,
 * like {@link latexAbs}, so it composes into a larger KaTeX span — which is what a prompt
 * assembled from several terms needs, and what {@link latexVar} cannot give it.
 *
 * A coefficient of one prints no digit, and that is a curriculum rule rather than a
 * preference: `content/lessons/d1/NUM.4.json` teaches that a coefficient of one "is written
 * by leaving it off". A generator that prints `1x` contradicts the lesson, and contradicts the
 * figure beside it, which goes through a printer like this one.
 */
export function latexVarTerm(coeff: number, variable = "x"): string {
  if (coeff === 1) {
    return variable;
  }
  if (coeff === -1) {
    return `-${variable}`;
  }
  return `${coeff}${variable}`;
}

/** Variable term such as $5x$ or $x$. */
export function latexVar(coeff: number, variable = "x"): string {
  return `$${latexVarTerm(coeff, variable)}$`;
}

/**
 * Dollar amount for Markdown prompts rendered by `LessonProse` / remark-math.
 *
 * Put the currency sign OUTSIDE `$...$` as a markdown-escaped `\$`, then wrap only
 * the digits: `\$$12.00$`. Never write `$\$12$` / `` `$\\$${n}$` `` — the `$` inside
 * `\$` closes the math span early and dumps the rest of the prompt as broken prose.
 *
 * The template literal needs THREE `$` before the interpolation: two survive as text
 * (the escaped sign, then the math opener) and the third is consumed by `${`. Writing
 * two leaves a lone opener whose span runs on into the next sentence.
 */
export function latexDollar(amount: number): string {
  return `\\$$${amount.toFixed(2)}$`;
}

/**
 * Whole-dollar amount (no cents). Same outside-math pattern as {@link latexDollar}.
 * Prefer this for integer money; use `latexDollar` when cents matter.
 */
export function latexDollarInt(amount: number): string {
  return `\\$$${amount}$`;
}

export function evaluateMath(inner: string): string {
  return `Evaluate $${inner}$.`;
}

export function expandMath(inner: string): string {
  return `Expand: $${inner}$.`;
}

export function expandAndCombineMath(inner: string): string {
  return `Expand and combine: $${inner}$.`;
}

export function simplifyMath(inner: string): string {
  return `Simplify: $${inner}$.`;
}

export function percentOf(percent: number, base: number): string {
  return `What is $${percent}\\%$ of $${base}$?`;
}

/** A countable object for unit-rate word problems (kept as a shared indexed list
 * so the prompt, hints, worked solution, and SVG worked-solution stay in sync). */
export interface UnitRateObject {
  singular: string;
  plural: string;
}

/** The objects the hard NUM.5 unit-rate problems can be about. Order is stable:
 * `template_params.objectIndex` indexes into this list. */
export const UNIT_RATE_OBJECTS: readonly UnitRateObject[] = [
  { singular: "pen", plural: "pens" },
  { singular: "pencil", plural: "pencils" },
  { singular: "notebook", plural: "notebooks" },
  { singular: "marker", plural: "markers" },
  { singular: "eraser", plural: "erasers" },
  { singular: "folder", plural: "folders" },
  { singular: "apple", plural: "apples" },
  { singular: "muffin", plural: "muffins" },
];

/** Resolve an object index to its (always defined) entry, defaulting to pens. */
export function unitRateObject(objectIndex = 0): UnitRateObject {
  return (
    UNIT_RATE_OBJECTS[objectIndex] ??
    UNIT_RATE_OBJECTS[0] ?? { singular: "item", plural: "items" }
  );
}

export function unitRatePrompt(
  count: number,
  totalCost: number,
  targetCount: number,
  objectIndex = 0,
): string {
  const obj = unitRateObject(objectIndex);
  return `If ${latexNum(count)} ${obj.plural} cost ${latexDollar(totalCost)}, how much do ${latexNum(targetCount)} ${obj.plural} cost (in dollars)?`;
}

/**
 * The variable letters the algebra families (NUM.3 distributive, NUM.4 combine)
 * can be authored over, so a problem is not always about `x`. Order is stable:
 * `template_params.varIndex` indexes into this list (template_params holds only
 * numbers, so the letter is encoded as its index and decoded here + in the SVG
 * worked-solution visual). Every entry is a single valid mathjs symbol.
 */
export const EXPRESSION_VARIABLES: readonly string[] = ["x", "y", "n", "t"];

/** Resolve a variable index to its (always defined) letter, defaulting to `x`. */
export function expressionVariable(varIndex = 0): string {
  return EXPRESSION_VARIABLES[varIndex] ?? EXPRESSION_VARIABLES[0] ?? "x";
}
