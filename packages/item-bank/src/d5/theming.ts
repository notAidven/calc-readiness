/**
 * Era-specific theming for D5 lesson PRACTICE prompts on Early Modern nodes.
 *
 * RAT.5 sits in Early Modern era (`getEraOfNode("RAT.5")`), where the Cannon Tower's
 * ranging yard reads rational graphs off a depth-staff and a graduated cistern: a forbidden
 * reading the staff cannot show, a hole where factors cancel, a vertical line where the
 * chart runs off the page, and a level the reading settles toward far out like a vanishing
 * point that is approached but never reached.
 *
 * Hard rules for callers:
 *  - Theme the PROMPT string only. Never let the theme change `answer`, `params`,
 *    `difficulty`, or the worked solution.
 *  - Scenario wording is frozen into the prompt at `generate()` time.
 */

/** Domain of a rational function plotted on the depth-staff ranging chart. */
export function depthStaffDomainPrompt(top: string, bottom: string): string {
  return `On the depth-staff chart for $P(x) = \\dfrac{${top}}{${bottom}}$, give the domain in set-builder form. Type it like this example: \`{x | x != 12}\`.`;
}

/** Vertical asymptote after a partial cancel on the ranging chart. */
export function rangingVerticalAsymptotePrompt(bottomExpanded: string, h: number): string {
  return `For $P(x) = \\dfrac{x^{2} - ${h * h}}{${bottomExpanded}}$, one excluded value corresponds to a hole where factors cancel; the other corresponds to a vertical asymptote on the ranging chart. Give the x-value of the vertical asymptote. Enter one number.`;
}

/** Horizontal asymptote: the level the depth-staff reading settles toward far out. */
export function depthStaffLevelPrompt(top: string, bottom: string): string {
  return `For $P(x) = \\dfrac{${top}}{${bottom}}$, find the horizontal asymptote, the level the ranging chart settles toward far out along the x-axis. Give its y-value. Enter one number; a fraction such as \`5/12\` is fine.`;
}

/** Hole as a missing point on the ranging chart. */
export function rangingHolePrompt(top: string, bottom: string): string {
  return `For $P(x) = \\dfrac{${top}}{${bottom}}$, exactly one excluded value is a hole where the ranging chart cancels. Give that hole as a coordinate pair, like \`(7, 4)\`.`;
}

/** x-intercept after a cancel on the ranging chart. */
export function rangingCrossingPrompt(top: string, bottom: string): string {
  return `For $P(x) = \\dfrac{${top}}{${bottom}}$, the ranging chart crosses the x-axis at only one x-value; the other zero of the numerator is a hole where factors cancel. Give the x-intercept as a coordinate pair, like \`(8, 0)\`.`;
}
