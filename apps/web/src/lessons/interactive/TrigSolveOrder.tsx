/**
 * TRG.8 slide 1: the order the four moves have to run in.
 *
 * Every step here rests on the one before it, which is what makes the chain a question rather
 * than a preference. The reference angle cannot be found while a coefficient is still attached,
 * because the value being looked up is the wrong one; the quadrants cannot be chosen before
 * there is a sign to read; and the roster cannot be checked against the window before there
 * are headings to check. A learner who reaches for the circle first is not being slow, they
 * are reading a real number off it, and this board is where that costs them a tap.
 *
 * Built on `OrderSteps`, which owns the mechanic, the refusal of an out-of-order tap and the
 * reveal that hands the chain back with every rung already built still built.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The equation the chain solves, as LaTeX. */
  equation: string;
  /** How a screen reader says it. */
  equationSpoken: string;
  steps: readonly OrderedStep[];
  /** Indices into `steps`, in the order the chips are dealt. Never the identity. */
  dealt: readonly number[];
  /** The roster the chain arrives at, typeset. */
  roster: string;
}

/**
 * Two boards, each one function and each one sign, so the shape the first board plants is the
 * one the second refuses. A negative cosine puts its pair either side of the half turn; a
 * positive sine puts its pair either side of the quarter turn, and a learner carrying the first
 * arrangement across arrives at the wrong two headings.
 *
 * Neither is the check's own equation and neither is a draw the practice pool makes, so a
 * learner who works this board has not been handed a practice answer.
 */
const BOARDS: readonly Board[] = [
  {
    equation: "2\\cos x + \\sqrt{2} = 0",
    equationSpoken: "2 cosine x plus root 2 equals 0",
    roster: "\\{135^{\\circ},\\; 225^{\\circ}\\}",
    dealt: [2, 0, 3, 1],
    steps: [
      {
        id: "isolate",
        latex: "\\cos x = -\\dfrac{\\sqrt{2}}{2}",
        spoken: "cosine x equals negative root 2 over 2",
        why: (
          <>
            Nothing can be read off the circle while the cosine is still multiplied by{" "}
            <InlineMath latex="2" /> and has a constant beside it. Moving the constant
            across and dividing by <InlineMath latex="2" /> leaves a plain value on the
            right, and that value is what every later step is about.
          </>
        ),
      },
      {
        id: "reference",
        latex: "\\text{reference angle} = 45^{\\circ}",
        spoken: "the reference angle is 45 degrees",
        why: (
          <>
            The reference angle comes from the SIZE of the value with the sign set aside:{" "}
            <InlineMath latex="\cos 45^{\circ} = \dfrac{\sqrt{2}}{2}" />. It is an acute
            angle every time, so hunting for one whose cosine is negative finds nothing.
          </>
        ),
      },
      {
        id: "quadrants",
        latex: "180^{\\circ} - 45^{\\circ} \\;\\text{and}\\; 180^{\\circ} + 45^{\\circ}",
        spoken: "180 degrees minus 45 degrees, and 180 degrees plus 45 degrees",
        why: (
          <>
            Now the sign is spent. A cosine is negative in the second and third quadrants,
            so the reference angle is measured off the horizontal into each of them. This
            step needs the previous one: there is nothing to place until the reference angle
            exists.
          </>
        ),
      },
      {
        id: "roster",
        latex: "x \\in \\{135^{\\circ},\\; 225^{\\circ}\\}",
        spoken: "x is in the set 135 degrees and 225 degrees",
        why: (
          <>
            Both headings fall inside <InlineMath latex="0^{\circ} \le x < 360^{\circ}" />,
            so both stay, and the answer is the pair rather than either one of them.
            Checking the window is the last move because there is nothing to check until the
            headings exist.
          </>
        ),
      },
    ],
  },
  {
    equation: "2\\sin x - \\sqrt{2} = 0",
    equationSpoken: "2 sine x minus root 2 equals 0",
    roster: "\\{45^{\\circ},\\; 135^{\\circ}\\}",
    dealt: [1, 3, 0, 2],
    steps: [
      {
        id: "isolate",
        latex: "\\sin x = \\dfrac{\\sqrt{2}}{2}",
        spoken: "sine x equals root 2 over 2",
        why: (
          <>
            The sine has to stand alone before its value means anything. Move the constant
            across, divide both sides by <InlineMath latex="2" />, and the right side is a
            plain value at last.
          </>
        ),
      },
      {
        id: "reference",
        latex: "\\text{reference angle} = 45^{\\circ}",
        spoken: "the reference angle is 45 degrees",
        why: (
          <>
            <InlineMath latex="\sin 45^{\circ} = \dfrac{\sqrt{2}}{2}" />, so the acute angle
            that matches the size of this value is <InlineMath latex="45^{\circ}" />. It is
            found from the size alone, which is why it comes before anything about
            quadrants.
          </>
        ),
      },
      {
        id: "quadrants",
        latex: "45^{\\circ} \\;\\text{and}\\; 180^{\\circ} - 45^{\\circ}",
        spoken: "45 degrees, and 180 degrees minus 45 degrees",
        why: (
          <>
            A sine is positive in the first and second quadrants, so the reference angle is
            placed in both. A positive value does not mean one answer: it means the two
            quadrants above the horizontal rather than the two below it.
          </>
        ),
      },
      {
        id: "roster",
        latex: "x \\in \\{45^{\\circ},\\; 135^{\\circ}\\}",
        spoken: "x is in the set 45 degrees and 135 degrees",
        why: (
          <>
            Both headings lie inside <InlineMath latex="0^{\circ} \le x < 360^{\circ}" />,
            so neither is dropped and neither needs a turn added to it. The roster of both
            is the answer.
          </>
        ),
      },
    ],
  },
];

export function TrigSolveOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <OrderSteps
      key={variant.nonce}
      steps={board.steps}
      dealt={board.dealt}
      objective={
        <>
          Build the solution of <InlineMath latex={board.equation} /> over{" "}
          <InlineMath latex="0^{\circ} \le x < 360^{\circ}" /> one move at a time, so that
          every line rests on the line above it.
        </>
      }
      prompt="Tap whichever line can be justified next. A line that needs something not yet on the board is refused."
      ariaLabel={`The four moves that solve ${board.equationSpoken} over one revolution, shuffled`}
      conclusion={
        <>
          Isolate, then size, then sign, then window. The middle two are the pair worth
          keeping apart: the size of the value fixes the reference angle and the sign of it
          fixes the quadrants, so the answer comes out as{" "}
          <InlineMath latex={board.roster} /> rather than as one heading of it.
        </>
      }
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Order a different equation"
    />
  );
}
