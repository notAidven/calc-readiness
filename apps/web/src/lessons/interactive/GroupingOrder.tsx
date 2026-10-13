/**
 * POL.2 slide 5: build the chain that takes four terms to a product.
 *
 * Grouping is the one method in the lesson where the intermediate line does not look like
 * progress: $x^{2}(x + 3) + 2(x + 3)$ is longer than what it came from and is still a sum, and
 * a learner who cannot see why it is a step forward abandons the method there. The chain is the
 * argument, because the rung that follows can only rest on the identical brackets the rung
 * before it produced.
 *
 * The finished product is dealt before the pairing step, so a learner who reaches for the
 * answer is refused with the reason rather than carried to it.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** Factors as $(x + a)(x^{2} + b)$, so the four terms are $x^3 + a x^2 + b x + ab$. */
  a: number;
  b: number;
  dealt: readonly number[];
}

/** Neither board is the slide's own $x^{3} + 3x^{2} + 2x + 6$. */
const BOARDS: readonly Board[] = [
  { a: 5, b: 3, dealt: [2, 0, 3, 1] },
  { a: 4, b: 7, dealt: [1, 3, 0, 2] },
];

export function GroupingOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { a, b } = board;
  const given = `x^{3} + ${a}x^{2} + ${b}x + ${a * b}`;

  const steps: readonly OrderedStep[] = [
    {
      id: "pair",
      latex: `(x^{3} + ${a}x^{2}) + (${b}x + ${a * b})`,
      spoken: "the four terms bracketed in two pairs",
      why: (
        <>
          First, because nothing else can be done until the terms are paired: no single
          number or power divides all four, so the only route is to look for a factor inside
          each half. The pairing keeps the terms in the order they arrived, which is what
          makes the two halves share anything at all.
        </>
      ),
    },
    {
      id: "extract",
      latex: `x^{2}(x + ${a}) + ${b}(x + ${a})`,
      spoken: `x squared times x plus ${a}, plus ${b} times x plus ${a}`,
      why: (
        <>
          Each half has its own common factor taken out: <InlineMath latex={`x^{2}`} /> from
          the first and <InlineMath latex={`${b}`} /> from the second. The line is longer
          than the one above it and it is still a sum, which is exactly why it looks like no
          progress, and the identical brackets are the progress.
        </>
      ),
    },
    {
      id: "common",
      latex: `\\text{Both halves now carry } (x + ${a})\\text{, a common factor}`,
      spoken: `both halves now carry x plus ${a}, a common factor`,
      why: (
        <>
          This is the observation the method exists to reach, and it cannot come earlier
          because the bracket does not exist earlier. It is also the check on the pairing:
          if the two brackets had come out different, the terms were paired the wrong way
          round.
        </>
      ),
    },
    {
      id: "product",
      latex: `(x + ${a})(x^{2} + ${b})`,
      spoken: `x plus ${a}, times x squared plus ${b}`,
      why: (
        <>
          Last, because taking the shared bracket out is a single move once it is known to
          be shared. What is left inside the second bracket is the two things it was
          multiplying, <InlineMath latex={`x^{2}`} /> and <InlineMath latex={`${b}`} />.
        </>
      ),
    },
  ];

  return (
    <OrderSteps
      key={variant.nonce}
      steps={steps}
      dealt={board.dealt}
      objective={
        <>
          Goal: build the chain that takes <InlineMath latex={given} /> from four terms with
          nothing common to all of them to a product of two.
        </>
      }
      prompt="Tap the line that can come next, given only what is already on the board."
      conclusion={
        <>
          <InlineMath latex={`${given} = (x + ${a})(x^{2} + ${b})`} />, and the middle line
          was the one that mattered: it made a common factor exist where none had been. That
          is why the two brackets coming out identical is the check on whether the pairing
          was right.
        </>
      }
      ariaLabel={`Four lines factoring ${given} by grouping, to be put in order`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with four different terms"
    />
  );
}
