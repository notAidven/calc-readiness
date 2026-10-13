/**
 * Helpers shared by the D4 node files: prompt formatting, and the two authoring guards that
 * have to hold across every template in the pool.
 */

/** `+ 7` / `- 7`, so a drawn constant reads as an operator rather than as a signed term. */
export function signed(value: number): string {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}

/** `3x` / `x` / `-x`, so a drawn coefficient of one never prints as `1x`. */
export function coeff(value: number, variable = "x"): string {
  if (value === 1) {
    return variable;
  }
  if (value === -1) {
    return `-${variable}`;
  }
  return `${value}${variable}`;
}

/**
 * A term in a running polynomial: `+ 3x`, `- x`, `+ 12`.
 *
 * **A coefficient of zero prints NOTHING**, because a term of zero is not part of the sum it
 * would be printed into. Without that, `signedTerm(0, "x^{2}")` renders whatever it is handed
 * and a generator whose middle coefficient can come out at zero prints
 * `f(x) = x^{3} + 0x^{2} - 4x`, which no author sees because the branch is rare: POL.7's
 * expanded cubic reaches it on every draw whose two roots are negatives of one another, which
 * is a pair the shape wants (see its own note) rather than one to draw around.
 *
 * The omission belongs here rather than in each caller because the defect is the PRINTER's:
 * a caller that filters its own zeros leaves the next caller to discover the same thing. Since
 * the return is then empty, assemble a running polynomial with {@link termSum}, which closes
 * the gap the missing term leaves behind.
 */
export function signedTerm(value: number, variable: string): string {
  if (value === 0) {
    return "";
  }
  const magnitude = Math.abs(value);
  const body = variable === "" ? `${magnitude}` : coeff(magnitude, variable);
  return value < 0 ? `- ${body}` : `+ ${body}`;
}

/**
 * A polynomial written as a leading term followed by its signed terms, skipping the empty ones.
 *
 * `termSum("x^{3}", signedTerm(0, "x^{2}"), signedTerm(-4, "x"))` is `x^{3} - 4x`: the term
 * that printed nothing takes its separator with it, so the line has no double space where a
 * zero coefficient used to be.
 */
export function termSum(...parts: readonly string[]): string {
  return parts.filter((part) => part !== "").join(" ");
}

/**
 * True when a fraction `numerator / denominator` is already in lowest terms.
 *
 * A key is a STRING here, so nothing downstream reduces it: `{-6, 2/4}` is the literal roster
 * a learner is shown on reveal and the literal string the checker compares against. Coprimality
 * has to hold at the draw or it never holds at all.
 */
export function inLowestTerms(numerator: number, denominator: number): boolean {
  let a = Math.abs(numerator);
  let b = Math.abs(denominator);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a === 1;
}

/**
 * The two rosters `SOLUTION_SET_PLACEHOLDER` prints as its own example: "Every solution: 13
 * or {-1, 4}".
 *
 * R30 forbids a placeholder that answers a served item, and the leak sweep in
 * `answerFormat.test.ts` GRADES both strings against every served solution-set item rather
 * than string-matching them, so a key of `{13}` is answered by the bare `13` as well. No D4
 * key may be either roster, which is a live constraint rather than a precaution: this pool
 * serves 21 solution sets over two nodes and its natural parameter ranges reach both.
 */
export const ADVERTISED_SOLUTIONS: readonly string[] = ["{13}", "{-1, 4}"];

/** A solution-set key, sorted ascending so a pair is written the way it is read. */
export function solutionKey(...values: readonly number[]): string {
  return `{${[...values].sort((a, b) => a - b).join(", ")}}`;
}

/** True when a drawn pair of roots would spell one of {@link ADVERTISED_SOLUTIONS}. */
export function isAdvertisedSolution(...values: readonly number[]): boolean {
  return ADVERTISED_SOLUTIONS.includes(solutionKey(...values));
}
