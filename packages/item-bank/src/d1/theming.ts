/**
 * Era-specific theming for D1 lesson PRACTICE prompts.
 *
 * D1's nodes are the whole PREHISTORIC ERA (`ERA_SEQUENCE` in
 * `packages/skill-graph/src/eras.ts`), so the scenarios below are drawn from what era
 * one actually renders: a shoreline camp of thatch and lashed timber, tally notches cut
 * into a post, woven baskets, drying racks, cordage, and cleared earth.
 *
 * ## THE CIVIC SCENARIOS THAT USED TO LIVE HERE ARE GONE, AND THEY MUST NOT COME BACK
 *
 * This file previously framed every prompt as a modern civic building (a City Bank
 * ledger, a Public Library shelf, a Community School classroom, a Clock Tower plaza
 * ticket booth). `apps/web/src/city/buildingAssets.ts` renamed the six buildings to an
 * era-neutral set on 2026-07-28 (D-ERA29) and recorded that the old names "cannot
 * exist" in era one's art; the prompts were left behind, because the SCENARIOS were
 * built on the modern buildings and a find-and-replace would only have produced
 * "Assembly Hall's account starts at $0". The scenarios themselves are rewritten here.
 *
 * **Money is the specific thing to watch.** Era one withholds metal, agriculture and
 * trade infrastructure, so a balance in dollars is not available as a framing. Signed
 * quantities read off a waterline stake and percents taken of a measured length of cord
 * carry the same arithmetic without one.
 *
 * Hard rules for callers:
 *  - Theme the PROMPT string only. Never let the theme change `answer`, `params`,
 *    `difficulty` or the worked solution. The answer must stay the same value the
 *    neutral prompt asks for, so graders and `validateTemplates` are unaffected.
 *    Where a HINT names the scenario it is worded to match the prompt it accompanies,
 *    because a hint pointing at a booth that no longer exists is worse than no flavour.
 *  - Only theme when `context.form === "practice"`. The diagnostic assessment forms
 *    ("A" / "B") stay neutral and byte-identical (their content hashes are pinned).
 *  - Scenario wording is frozen into the prompt at `generate()` time and is NOT
 *    stored in `template_params`, so the params-driven worked-solution SVGs (which
 *    render the math, not the story) need no change.
 *  - Every number stays wrapped in `$...$` KaTeX; no em dashes anywhere.
 *
 * **One anachronism is knowingly left standing:** NUM.5's unit-rate template
 * (`d1.num-5.l3`) is denominated in dollars and stationery in its prompt, its hints and
 * its worked solution, and its neutral prompt (`unitRatePrompt`) is shared with the
 * frozen assessment forms. Re-framing it as barter would need all three plus a
 * deliberate re-freeze, so it now serves the neutral prompt in every form rather than a
 * half-themed one. Owner: Anthony.
 */

import { FRACTION_LOWEST_TERMS_SUFFIX, latexNum } from "../promptFormat";

/**
 * NUM.S: a running reading from $0$ through a sequence of signed changes in the water
 * level against a notched stake (a positive value is a rise, a negative value is a
 * fall). The final reading equals the sum of `changes`, which the caller keeps equal to
 * the neutral signed-sum value. Answer is a single (possibly negative) number.
 */
export function waterlineReadingSum(changes: readonly number[]): string {
  const moves = changes.map((c) =>
    c >= 0 ? `rises ${latexNum(c)} notches` : `falls ${latexNum(-c)} notches`,
  );
  return `The water sits level with the mark cut on the stake, so the reading is ${latexNum(0)} notches. It ${joinSteps(moves)}. What is the reading now, counting notches above the mark as positive?`;
}

/**
 * NUM.5: a percent OF a measured length (a coil of cord counted in paces), chosen
 * because a percent of a whole number is often fractional and a length takes a
 * fractional value where a count of objects cannot. Answer equals `percent%` of `base`,
 * the same value the neutral `percentOf` prompt asks for.
 */
export function cordPercentOf(percent: number, base: number): string {
  return `A coil of cord measures ${latexNum(base)} paces. How long is $${percent}\\%$ of it, in paces?`;
}

/**
 * NUM.3: frame a distributive product as identical bundles of tools handed to the
 * groups on the swept ground, keeping the explicit "Expand" instruction so the
 * expression grader still requires the expanded form. `inner` is the (already
 * KaTeX-inner) sum, e.g. `x + 4` or `2x + 5`; `factor` is the outside multiplier.
 */
export function toolBundleExpand(factor: number, inner: string): string {
  return `Each of the ${latexNum(factor)} groups on the swept ground needs the same $${inner}$ tools. Expand $${factor}(${inner})$ to find the total.`;
}

/**
 * NUM.F: add or subtract two fractions framed as parts of one drying rack. Callers MUST
 * only use this when the result is a proper fraction in [0, 1] (subtraction always is;
 * addition only when the sum stays below 1), so the "fraction of one rack" story stays
 * accurate. Answer equals the same value the neutral `Evaluate` prompt asks for. `op` is
 * "add" (lay more out) or "sub" (take some down).
 */
export function dryingRackFractionCombine(
  a: number,
  d1: number,
  b: number,
  d2: number,
  op: "add" | "sub",
): string {
  const first = `$\\dfrac{${a}}{${d1}}$`;
  const second = `$\\dfrac{${b}}{${d2}}$`;
  const question =
    op === "add"
      ? `The camp lays split fish over ${first} of a drying rack, then ${second} more of the rack. What fraction of the rack is covered now?`
      : `A drying rack is ${first} covered. The camp takes ${second} of the rack down. What fraction of the rack is left?`;
  return `${question}${FRACTION_LOWEST_TERMS_SUFFIX}`;
}

/** Join scenario steps as "a, then b, then c" (Oxford-free, no em dashes). */
function joinSteps(steps: readonly string[]): string {
  if (steps.length <= 1) {
    return steps[0] ?? "";
  }
  return steps.join(", then ");
}
