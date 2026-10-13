/**
 * POL.6 slide 1: find the leading term wherever the polynomial happens to be written.
 *
 * Slide 0 leaves the learner with one term to look for, and this board is about the fact that
 * looking is not enough. Each of the four polynomials is written in a form that hides its
 * leading term somewhere other than the front: one has its powers out of order, one is a
 * product of brackets with nothing expanded, one is a bracket raised to a power, and one leads
 * with a constant. Matching is the right interaction because the four leading terms are all on
 * the board at once, so a learner who reads a position rather than a power finds their answer
 * already taken by somebody else.
 *
 * Two of the four leading terms differ only in SIGN, so a join cannot be made on the degree
 * alone, and two share a degree, so it cannot be made on the coefficient alone either.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { MatchPairs } from "./kinds/MatchPairs";

interface Written {
  id: string;
  /** The polynomial as the learner meets it. */
  left: string;
  /** Its leading term. */
  right: string;
  leftSpoken: string;
  rightSpoken: string;
  /** What made the leading term hard to see in this particular form. */
  hid: string;
}

interface Board {
  written: readonly [Written, Written, Written, Written];
  rightOrder: readonly number[];
}

const BOARDS: readonly Board[] = [
  {
    written: [
      {
        id: "jumbled",
        left: "7 - 2x^{5} + 4x^{2}",
        right: "-2x^{5}",
        leftSpoken: "7 minus 2 x to the fifth plus 4 x squared",
        rightSpoken: "negative 2 x to the fifth",
        hid: "the powers are out of order, so the highest one is written in the middle",
      },
      {
        id: "product",
        left: "(2x^{2} - 1)(x^{3} + 5)",
        right: "2x^{5}",
        leftSpoken: "2 x squared minus 1, times x cubed plus 5",
        rightSpoken: "2 x to the fifth",
        hid: "nothing is expanded, so the leading term has to be built from the two brackets",
      },
      {
        id: "power",
        left: "-(x + 3)^{4}",
        right: "-x^{4}",
        leftSpoken: "minus, x plus 3, all to the fourth",
        rightSpoken: "negative x to the fourth",
        hid: "the degree is on the bracket rather than on an x, and the minus sign is outside it",
      },
      {
        id: "constant-first",
        left: "12 + 3x^{4}",
        right: "3x^{4}",
        leftSpoken: "12 plus 3 x to the fourth",
        rightSpoken: "3 x to the fourth",
        hid: "the constant is written first, and a constant has no degree at all",
      },
    ],
    rightOrder: [2, 3, 0, 1],
  },
  {
    written: [
      {
        id: "jumbled",
        left: "5x^{2} - 3x^{6} + 8",
        right: "-3x^{6}",
        leftSpoken: "5 x squared minus 3 x to the sixth plus 8",
        rightSpoken: "negative 3 x to the sixth",
        hid: "the powers are out of order, so the highest one is written in the middle",
      },
      {
        id: "product",
        left: "(3x^{4} + 2)(x^{2} - 7)",
        right: "3x^{6}",
        leftSpoken: "3 x to the fourth plus 2, times x squared minus 7",
        rightSpoken: "3 x to the sixth",
        hid: "nothing is expanded, so the leading term has to be built from the two brackets",
      },
      {
        id: "power",
        left: "-(x - 2)^{3}",
        right: "-x^{3}",
        leftSpoken: "minus, x minus 2, all cubed",
        rightSpoken: "negative x cubed",
        hid: "the degree is on the bracket rather than on an x, and the minus sign is outside it",
      },
      {
        id: "constant-first",
        left: "9 + 4x^{3}",
        right: "4x^{3}",
        leftSpoken: "9 plus 4 x cubed",
        rightSpoken: "4 x cubed",
        hid: "the constant is written first, and a constant has no degree at all",
      },
    ],
    rightOrder: [3, 0, 2, 1],
  },
];

export function LeadingTermMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={board.written.map((item) => ({
        id: item.id,
        left: item.left,
        right: item.right,
        leftSpoken: item.leftSpoken,
        rightSpoken: item.rightSpoken,
        why: (
          <>
            Here {item.hid}. The leading term is the one of highest DEGREE, which is a
            question about the exponents and never about the order or the position, so{" "}
            <InlineMath latex={item.left} /> leads with <InlineMath latex={item.right} />.
          </>
        ),
      }))}
      rightOrder={board.rightOrder}
      objective={
        <>
          Goal: pair each polynomial with its own leading term, so that four forms that put
          the highest power in four different places end up read the same way.
        </>
      }
      prompt="Drag a polynomial onto its leading term, or tap the polynomial and then the term."
      conclusion={
        <>
          None of those four wrote its leading term first, and two of the four terms differ
          only by a minus sign. So the leading term is found by comparing EXPONENTS, and in
          a form with nothing expanded it has to be built: the degrees of the factors add
          and their leading coefficients multiply.
        </>
      }
      ariaLabel="Four polynomials in four different written forms, to be matched with their leading terms"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with four different polynomials"
    />
  );
}
