/**
 * FUN.6 interactive (slide 3): put a whole difference quotient in the order it has to happen
 * in.
 *
 * The five moves are a chain rather than a list, and each rung is refused until the one it
 * rests on is down: nothing can be collected before both outputs are written out, nothing can
 * be factored before the terms without an `h` have gone, and nothing can be divided before
 * `h` is a factor of the whole numerator. An animation of the same five lines shows the order
 * without ever asking for it, so a learner can watch a correct simplification and still reach
 * for the division two lines early, which is the mistake this slide exists to prevent.
 *
 * The dividing line is dealt near the front on both boards, so "divide now" is available as a
 * move and is refused.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The rule, and how it is read aloud. */
  ruleTex: string;
  spoken: string;
  /** `f(x + h)`, substituted and then multiplied out. */
  substituted: string;
  expandedTex: string;
  /** The numerator after `f(x)` is taken away, then with `h` pulled out in front. */
  numerator: string;
  factored: string;
  /** What the quotient comes to. */
  answer: string;
  /** The order the five lines are dealt in. Never in order, and never opening on the first. */
  dealt: readonly number[];
}

/**
 * Two boards, neither of them the check's rule. The first has a negative linear term, so a
 * sign has to survive the whole chain; the second scales the square, so the doubled middle
 * term is not the bare `2xh` of the first.
 */
const BOARDS: readonly Board[] = [
  {
    ruleTex: "x^{2} - 4x",
    spoken: "x squared minus 4x",
    substituted: "(x + h)^{2} - 4(x + h)",
    expandedTex: "x^{2} + 2xh + h^{2} - 4x - 4h",
    numerator: "2xh + h^{2} - 4h",
    factored: "h(2x + h - 4)",
    answer: "2x + h - 4",
    dealt: [4, 1, 3, 0, 2],
  },
  {
    ruleTex: "5x^{2} + x",
    spoken: "5 x squared plus x",
    substituted: "5(x + h)^{2} + (x + h)",
    expandedTex: "5x^{2} + 10xh + 5h^{2} + x + h",
    numerator: "10xh + 5h^{2} + h",
    factored: "h(10x + 5h + 1)",
    answer: "10x + 5h + 1",
    dealt: [2, 4, 0, 3, 1],
  },
];

export function DifferenceQuotientOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { ruleTex, substituted, expandedTex, numerator, factored, answer } = board;

  const steps: readonly OrderedStep[] = [
    {
      id: "substitute",
      latex: `f(x + h) = ${substituted}`,
      spoken: "the later output written with the whole input substituted",
      why: (
        <>
          Nothing can come before this. The top of the quotient is a difference of two
          outputs, and this is the first of them: every <InlineMath latex="x" /> in the rule
          takes the whole input <InlineMath latex="x + h" />, brackets and all.
        </>
      ),
    },
    {
      id: "expand",
      latex: `= ${expandedTex}`,
      spoken: "the same output with the square multiplied out",
      why: (
        <>
          It rests on the substitution, because there is no bracket to open until{" "}
          <InlineMath latex="x + h" /> is in place. Until the square is multiplied out there
          is also nothing to collect, since the terms are still locked inside it.
        </>
      ),
    },
    {
      id: "subtract",
      latex: `f(x + h) - f(x) = ${numerator}`,
      spoken: "the starting output subtracted and the terms collected",
      why: (
        <>
          This needs both outputs written out, and it is the move that removes every term
          with no <InlineMath latex="h" /> in it. Those terms are identical in the two
          outputs, so the subtraction is what makes them disappear.
        </>
      ),
    },
    {
      id: "factor",
      latex: `= ${factored}`,
      spoken: "h factored out of the numerator",
      why: (
        <>
          It rests on the collecting. Only once no term is left without an{" "}
          <InlineMath latex="h" /> can <InlineMath latex="h" /> be a factor of the WHOLE
          numerator, which is what this line claims.
        </>
      ),
    },
    {
      id: "divide",
      latex: `\\dfrac{${factored}}{h} = ${answer}`,
      spoken: "the numerator and the denominator divided by h",
      why: (
        <>
          Last, and it rests on the factoring. One <InlineMath latex="h" /> underneath
          cancels a factor of the whole numerator, never one term of a sum, so this line is
          only available once the line above it has been written.
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
          Goal: build the five lines that simplify the difference quotient of{" "}
          <InlineMath latex={`f(x) = ${ruleTex}`} />, in an order where each line rests on
          the one above it.
        </>
      }
      prompt="Tap the line that comes next in this simplification."
      conclusion={
        <>
          Substitute, multiply out, subtract, factor, divide. The last two cannot be swapped
          and the division cannot be brought forward: an <InlineMath latex="h" /> underneath
          divides a factor of the whole numerator, so it has to be made one first.
        </>
      }
      ariaLabel={`Five lines of work simplifying the difference quotient of ${board.spoken}, to be put in order`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different rule"
    />
  );
}
