/**
 * POL.2 slide 0: match each area to the pair of sides that produces it.
 *
 * Factoring opens as a recognition problem rather than a method, because the point of the slide
 * is that expanding and factoring are one relationship read in two directions. Matching is the
 * interaction that says so: the only way to check a join is to multiply the sides back out, so
 * the learner uses the skill they already have to answer a question about the one they do not.
 *
 * Every distractor on the right is somebody else's correct answer, so a wrong join costs two,
 * and the four areas are chosen to share a constant term in pairs: two of them end in the same
 * number, so a learner reading only the last term cannot separate them.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { MatchPairs } from "./kinds/MatchPairs";

interface Pair {
  p: number;
  q: number;
}

interface Board {
  pairs: readonly [Pair, Pair, Pair, Pair];
  rightOrder: readonly number[];
}

/**
 * On each board two courts share a constant term, so the pair that multiplies to it has to be
 * separated by the middle coefficient rather than read off the end of the amount.
 */
const BOARDS: readonly Board[] = [
  {
    pairs: [
      { p: 2, q: 6 },
      { p: 3, q: 4 },
      { p: 1, q: 8 },
      { p: 5, q: 5 },
    ],
    rightOrder: [2, 3, 0, 1],
  },
  {
    pairs: [
      { p: 2, q: 9 },
      { p: 3, q: 6 },
      { p: 1, q: 18 },
      { p: 4, q: 7 },
    ],
    rightOrder: [3, 0, 2, 1],
  },
];

export function FactorPairsMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={board.pairs.map(({ p, q }) => ({
        id: `p${p}q${q}`,
        left: `x^{2} + ${p + q}x + ${p * q}`,
        right: `(x + ${p})(x + ${q})`,
        leftSpoken: `x squared plus ${p + q} x plus ${p * q}`,
        rightSpoken: `x plus ${p}, times x plus ${q}`,
        why: (
          <>
            Multiplying <InlineMath latex={`(x + ${p})(x + ${q})`} /> back out gives{" "}
            <InlineMath latex={`x^{2} + ${p}x + ${q}x + ${p * q}`} />, and the two strips
            collect into <InlineMath latex={`${p + q}x`} />. So the two numbers multiply to
            the constant <InlineMath latex={`${p * q}`} /> and add to the middle coefficient{" "}
            <InlineMath latex={`${p + q}`} />, which is the pair of conditions every one of
            these joins turns on.
          </>
        ),
      }))}
      rightOrder={board.rightOrder}
      objective={
        <>
          Goal: pair each area with the two side lengths that produce it, so that four
          totals with nothing obvious in common turn out to be four rectangles.
        </>
      }
      prompt="Drag an area onto the pair of sides that produces it, or tap the area and then the sides."
      conclusion={
        <>
          Every one of those joins can be checked by multiplying the sides back out, which
          is the whole relationship: to <strong>factor</strong> is to write an amount as a
          product, and expanding is the same statement read the other way. Two of these
          areas end in the same number, so the constant alone never settles a join.
        </>
      }
      ariaLabel="Four paved areas to be matched with the four pairs of side lengths that produce them"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with four different courts"
    />
  );
}
