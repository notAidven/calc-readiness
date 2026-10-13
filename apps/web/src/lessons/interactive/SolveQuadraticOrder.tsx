/**
 * POL.3 slide 2: build the chain from a stated area to a pair of solutions.
 *
 * The slide's claim is about ORDER, so the chain is the argument: gathering at zero has to
 * precede factoring, because a factored form is only useful against zero, and a learner who
 * reaches for the factoring first is refused with that reason rather than nudged.
 *
 * The solved conditions and the finished reading are both dealt before the gathering step, so
 * the board cannot be walked forwards from the answer.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The court is $x$ by $x + gap$, covering `area`, with the useful root `root`. */
  gap: number;
  root: number;
  dealt: readonly number[];
}

/** Neither board is the slide's own $x(x + 3) = 54$ nor the check's $x(x + 2) = 35$. */
const BOARDS: readonly Board[] = [
  { gap: 4, root: 5, dealt: [3, 1, 0, 2] },
  { gap: 7, root: 4, dealt: [2, 0, 3, 1] },
];

export function SolveQuadraticOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { gap, root } = board;
  const area = root * (root + gap);
  const other = -(root + gap);

  const steps: readonly OrderedStep[] = [
    {
      id: "zero",
      latex: `x^{2} + ${gap}x - ${area} = 0`,
      spoken: `x squared plus ${gap} x minus ${area} equals zero`,
      why: (
        <>
          First, because the whole method rests on a product being zero and this equation
          arrives as a product equal to <InlineMath latex={`${area}`} />. Multiplying out
          and moving everything to one side is what makes the next line worth writing.
        </>
      ),
    },
    {
      id: "factor",
      latex: `(x - ${root})(x + ${root + gap}) = 0`,
      spoken: `x minus ${root}, times x plus ${root + gap}, equals zero`,
      why: (
        <>
          The trinomial splits into two sides whose numbers multiply to{" "}
          <InlineMath latex={`-${area}`} /> and add to <InlineMath latex={`${gap}`} />. It
          has to come after the gathering, because factoring an expression that equals{" "}
          <InlineMath latex={`${area}`} /> would leave a product with nothing useful on the
          other side of it.
        </>
      ),
    },
    {
      id: "split",
      latex: `\\text{Either } x - ${root} = 0 \\;\\text{ or }\\; x + ${root + gap} = 0`,
      spoken: `either x minus ${root} equals zero, or x plus ${root + gap} equals zero`,
      why: (
        <>
          A product is zero exactly when one of its factors is, so the single equation above
          becomes these two conditions. Nothing can be split this way until the product is
          written and the other side is zero, which is what the two rungs above supply.
        </>
      ),
    },
    {
      id: "read",
      latex: `x = ${root} \\;\\text{ or }\\; x = ${other}`,
      spoken: `x equals ${root}, or x equals ${other}`,
      why: (
        <>
          Last, because each condition is a one-step equation once it exists. Both values
          solve the quadratic, and only <InlineMath latex={`${root}`} /> measures a stretch
          of ground, which is a separate reading made after the algebra rather than during
          it.
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
          Goal: build the chain that takes an order for{" "}
          <InlineMath latex={`x(x + ${gap}) = ${area}`} /> to a pair of values, where each
          line rests on the one above it.
        </>
      }
      prompt="Tap the line that can come next, given only what is already on the board."
      conclusion={
        <>
          <InlineMath latex={`x(x + ${gap}) = ${area}`} /> gives{" "}
          <InlineMath latex={`x = ${root}`} /> and <InlineMath latex={`x = ${other}`} />,
          and the gathering had to come first: the split into conditions is available
          against zero and against nothing else.
        </>
      }
      ariaLabel={`Four lines solving x times x plus ${gap} equals ${area}, to be put in order`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different court"
    />
  );
}
