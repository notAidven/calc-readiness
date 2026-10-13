/**
 * Shared formatting helpers for D1 practice hints and worked solutions.
 *
 * Hints are progressive scaffolds (Mastery_Scoring_Spec §4): they name the next
 * step or strategy and NEVER state the final answer or write a full solving
 * expression (they are authored param-free for exactly that guarantee). Worked
 * solutions (shown only on reveal) DO carry the full steps and the final value.
 * Everything renders through `LessonProse` (remark-math + KaTeX), so inline math
 * uses `$...$`.
 */

import { latexFrac } from "../promptFormat";

/**
 * Normalize worked-solution steps into the ordered array carried on the item.
 * The web renderer supplies step numbering and colors, so steps are stored without
 * leading numbers; this just trims and drops any blank entries.
 */
export function workedSolution(steps: readonly string[]): readonly string[] {
  return steps.map((step) => step.trim()).filter((step) => step.length > 0);
}

/** Signed integer for KaTeX; negatives render parenthesized, e.g. `(-3)`. */
export function signed(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/** Render a reduced-fraction string ("n/d" or an integer) as inline KaTeX. */
export function fracFromString(value: string): string {
  const [numerator, denominator] = value.split("/");
  if (denominator === undefined) {
    return `$${numerator}$`;
  }
  return latexFrac(Number(numerator), Number(denominator));
}
