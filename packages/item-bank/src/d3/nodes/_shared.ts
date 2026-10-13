/**
 * Helpers shared by the D3 node files: prompt formatting, and the one authoring guard that has to
 * hold across every template that can produce an interval.
 */

/** `+ 7` / `- 7`, so a drawn constant reads as an operator rather than as a signed term. */
export function signed(value: number): string {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}

/**
 * The interval answer field's own example text, restated here as D3's single copy of it.
 *
 * `apps/web/src/lessons/answerFormat.ts` owns the string a learner is shown, and
 * `packages/item-bank` cannot depend on `apps/web` — `@cr/item-bank` has no such dependency and
 * the arrow runs the other way, the app importing the bank — so a copy is unavoidable. What is
 * avoidable is a SECOND, hand-maintained copy of the forms inside it, and that is exactly what
 * drifted here: the placeholder moved its bound from 2 to 5, this file went on reading 2, and
 * the guard below spent every draw shifting off `(-inf, 2]`, which nothing advertises, while
 * leaving the advertised `(-inf, 5]` reachable. Measured over 4000 draws per interval template
 * before the fix: `(-inf, 5]` came up 127 times across `one-step.l1`, `two-step.l2` and
 * `negative-coefficient.l2`, and `(-inf, 2]` came up 0 times because the shifter was pushing
 * draws off it.
 *
 * So this file holds the TEXT and nothing else transcribes it: {@link ADVERTISED_INTERVALS} is
 * parsed out of it, and `d3.test.ts` reads `answerFormat.ts` off disk and fails if the
 * placeholder has moved away from this line. Moving the example again is therefore one edit
 * here, or one red test naming this constant. This is D6's ruling
 * (`d6/nodes/FUN.2/index.ts`), which named this copy as the same defect still outstanding.
 */
export const INTERVAL_PLACEHOLDER_TEXT = "Interval, e.g. (-inf, 5] U (7, inf)";

/**
 * Every string the interval answer field advertises: the whole union AND each ray on its own,
 * because a learner whose answer is a single ray copies the part that matches. R30 forbids a
 * placeholder that answers a served item, so no D3 key may be any of them.
 *
 * Derived rather than listed, so all three move together with the text above.
 *
 * This is not hypothetical and it is why the guard exists rather than being a comment: D3 is the
 * first pool to serve a plain interval, and on the first run with the population corrected two
 * frozen items were keyed exactly to an advertised ray.
 */
export const ADVERTISED_INTERVALS: readonly string[] = advertisedFormsOf(
  INTERVAL_PLACEHOLDER_TEXT,
);

/**
 * Split a placeholder into the forms it offers.
 *
 * Throws rather than returning nothing when the text does not carry an example, because an empty
 * form list would leave every guard below vacuously satisfied — a green run measuring no keys at
 * all, which is indistinguishable from a green run measuring clean ones.
 */
function advertisedFormsOf(placeholder: string): readonly string[] {
  const marker = "e.g. ";
  const at = placeholder.indexOf(marker);
  if (at < 0) {
    throw new Error(`no "e.g." example to guard against in ${JSON.stringify(placeholder)}`);
  }
  const example = placeholder.slice(at + marker.length).trim();
  const parts = example.split(" U ").map((part) => part.trim());
  return [...new Set(parts.length > 1 ? [example, ...parts] : parts)];
}

/** A single ray, written the way the checker parses it. */
export function rayKey(bound: number, closed: boolean, upward: boolean): string {
  return upward
    ? `${closed ? "[" : "("}${bound}, inf)`
    : `(-inf, ${bound}${closed ? "]" : ")"}`;
}

/** A union of two outward rays, whitespace-delimited as the parser requires. */
export function unionKey(
  low: number,
  lowClosed: boolean,
  high: number,
  highClosed: boolean,
): string {
  return `(-inf, ${low}${lowClosed ? "]" : ")"} U ${highClosed ? "[" : "("}${high}, inf)`;
}

/**
 * Shift a drawn bound off any value that would make its key one of {@link ADVERTISED_INTERVALS}.
 *
 * ONE shift is provably enough for every shape here, and the reason is worth stating rather than
 * trusting: exactly one triple per advertised ray is at risk, and shifting its bound by one lands
 * on a neighbour no ray spells, because the advertised rays carry two different bounds and the
 * gap between them is wider than one. A shape whose union carries the pair is corrected on its
 * LOW bound, which moves the whole string off the advertised union.
 *
 * Do not re-derive that from the numbers written into this comment. The live example is
 * {@link INTERVAL_PLACEHOLDER_TEXT} and `d3.test.ts` points this function at each ray parsed out
 * of it and watches the draw move, so the argument is asserted rather than trusted, and an
 * example whose two bounds ever land one apart fails there rather than here.
 */
export function unadvertisedBound(bound: number, closed: boolean, upward: boolean): number {
  return ADVERTISED_INTERVALS.includes(rayKey(bound, closed, upward)) ? bound + 1 : bound;
}

/**
 * The same guard for a union: returns the low bound to use, shifted when the pair of bounds would
 * spell the advertised union exactly.
 */
export function unadvertisedUnionLow(
  low: number,
  lowClosed: boolean,
  high: number,
  highClosed: boolean,
): number {
  return ADVERTISED_INTERVALS.includes(unionKey(low, lowClosed, high, highClosed))
    ? low + 1
    : low;
}
