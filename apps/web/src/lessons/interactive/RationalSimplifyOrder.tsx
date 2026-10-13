/**
 * RAT.1 interactive (slide 3): put a full simplification in the order it has to happen in.
 *
 * The four moves of the Reducing Bench are a chain, not a list. Nothing can cancel until both
 * parts are products; the excluded values have to be read off the denominator while the
 * factor carrying one of them is still there; and the answer is not finished until both parts
 * are written together. Sequencing is the only interaction that makes that dependency the
 * answer. An animation of the same four moves shows the order without ever asking for it, so
 * a learner can watch a restriction survive the cancel and still write it down last, which is
 * the mistake this slide exists to prevent.
 *
 * The line that cancels is dealt alongside the line that states the excluded values, so
 * "cancel first, then read what is left" is available as a move and is refused.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The expression as written, unfactored. */
  top: string;
  bottom: string;
  /** Its factors. */
  topFactors: string;
  bottomFactors: string;
  /** The factor that cancels, and the two values the ORIGINAL denominator excludes. */
  shared: string;
  excluded: string;
  /** The value the cancelled factor would have taken the restriction of. */
  hidden: string;
  /** What is left after the cancel. */
  reducedTop: string;
  reducedBottom: string;
  spokenExpression: string;
  /** The order the four lines are dealt in. Never in order. */
  dealt: readonly number[];
}

/**
 * Neither board is the CFU's $\frac{x^{2} - 64}{x^{2} - 3x - 40}$. In both, the shared factor
 * is the one whose excluded value the cancel would erase.
 */
const BOARDS: readonly Board[] = [
  {
    top: "x^{2} + 9x + 20",
    bottom: "x^{2} + x - 12",
    topFactors: "(x + 5)(x + 4)",
    bottomFactors: "(x + 4)(x - 3)",
    shared: "(x + 4)",
    excluded: "x \\ne -4, \\;\\; x \\ne 3",
    hidden: "x \\ne -4",
    reducedTop: "x + 5",
    reducedBottom: "x - 3",
    spokenExpression: "x squared plus 9x plus 20, over x squared plus x minus 12",
    dealt: [3, 1, 0, 2],
  },
  {
    top: "x^{2} + 7x + 10",
    bottom: "x^{2} + 2x - 15",
    topFactors: "(x + 5)(x + 2)",
    bottomFactors: "(x + 5)(x - 3)",
    shared: "(x + 5)",
    excluded: "x \\ne -5, \\;\\; x \\ne 3",
    hidden: "x \\ne -5",
    reducedTop: "x + 2",
    reducedBottom: "x - 3",
    spokenExpression: "x squared plus 7x plus 10, over x squared plus 2x minus 15",
    dealt: [2, 0, 3, 1],
  },
];

export function RationalSimplifyOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { top, bottom, topFactors, bottomFactors, shared, excluded, hidden } = board;
  const factored = `\\dfrac{${topFactors}}{${bottomFactors}}`;
  const reduced = `\\dfrac{${board.reducedTop}}{${board.reducedBottom}}`;

  const steps: readonly OrderedStep[] = [
    {
      id: "factor",
      latex: `\\dfrac{${top}}{${bottom}} = ${factored}`,
      spoken: "the expression rewritten with both parts factored",
      why: (
        <>
          Factoring comes first because nothing can cancel against a sum. Written as{" "}
          <InlineMath latex={factored} /> both parts are products, which is what puts a
          cancellable factor on the board and what makes each excluded value readable.
        </>
      ),
    },
    {
      id: "exclude",
      latex: excluded,
      spoken: "the excluded values",
      why: (
        <>
          The excluded values are read off the denominator{" "}
          <InlineMath latex={bottomFactors} /> while it still has both factors, because the
          next line divides <InlineMath latex={shared} /> out. Leave this until after the
          cancel and <InlineMath latex={hidden} /> is nowhere in the work to be read from,
          even though the original expression is still undefined there.
        </>
      ),
    },
    {
      id: "cancel",
      latex: `${factored} = ${reduced}`,
      spoken: "the shared factor cancelled",
      why: (
        <>
          Only now is cancelling safe. <InlineMath latex={shared} /> above and below divides
          out to <InlineMath latex="1" />, leaving <InlineMath latex={reduced} />, and the
          restriction it was carrying is already recorded on the line above.
        </>
      ),
    },
    {
      id: "answer",
      latex: `${reduced}, \\;\\; ${excluded}`,
      spoken: "the reduced expression together with its excluded values",
      why: (
        <>
          The answer has two parts, so it is finished only when they are written together.{" "}
          <InlineMath latex={reduced} /> on its own would be defined at{" "}
          <InlineMath latex={hidden.replace("\\ne", "=")} />, where the expression it came
          from is not, so it is not the same function until the restriction travels with it.
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
          Goal: build the four lines that simplify{" "}
          <InlineMath latex={`\\dfrac{${top}}{${bottom}}`} />, in an order where every value
          the original denominator rules out is still somewhere on the board when it is
          written down.
        </>
      }
      prompt="Tap the line that comes next in simplifying this expression."
      conclusion={
        <>
          Factor, exclude, cancel, then state both parts. <InlineMath latex={hidden} /> made
          it into the answer only because it was read off the denominator before its factor
          cancelled, which is the whole reason the middle two lines cannot be swapped.
        </>
      }
      ariaLabel={`Four lines of work simplifying ${board.spokenExpression}, to be put in order`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different expression"
    />
  );
}
