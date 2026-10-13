/**
 * POL.5 slide 2: getting from standard form to the extreme value, in the order the steps rest
 * on each other.
 *
 * Standard form does not show the turning point anywhere, and the route to it is a chain rather
 * than a formula: the axis of symmetry comes out of two coefficients, the position comes off the
 * axis, and the HEIGHT only exists once that position has been put back into the rule. The last
 * link is the one learners drop. Asked for a minimum they hand back the input at which it
 * happens, which is a correct number answering a question about the wrong axis, and it is
 * exactly the mistake an ordering board can catch: the two steps are both on the table, and
 * placing the substitution before the position is refused.
 *
 * Built on `OrderSteps`, which owns the chain mechanic, the refusal and the board's one reveal.
 * The deal is a derangement, so no chip starts in its own slot and the first chip on offer is
 * never the first step.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { OrderSteps } from "./kinds/OrderSteps";

interface Board {
  a: number;
  b: number;
  c: number;
  /** The order the chips are dealt in. Never the identity, and never leading with step 0. */
  dealt: readonly number[];
}

/**
 * Two boards, drawn so the vertex's position is a whole number and the two extremes differ in
 * sign. Neither reuses the slide's own parabola or the check's.
 */
const BOARDS: readonly Board[] = [
  { a: 2, b: -12, c: 5, dealt: [2, 0, 3, 1] },
  { a: -3, b: -18, c: 4, dealt: [1, 3, 0, 2] },
];

export function ExtremeValueOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { a, b, c, dealt } = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const h = -b / (2 * a);
  const value = a * h * h + b * h + c;
  const opensUp = a > 0;
  const word = opensUp ? "minimum" : "maximum";
  const written = `${a}x^{2} ${b < 0 ? `- ${-b}` : `+ ${b}`}x ${c < 0 ? `- ${-c}` : `+ ${c}`}`;

  return (
    <OrderSteps
      key={variant.nonce}
      steps={[
        {
          id: "read",
          text: `Read the two coefficients that matter: the squared term's is ${a} and the x term's is ${b}.`,
          spoken: `read the coefficients ${a} and ${b}`,
          why: (
            <>
              Nothing can be computed before the coefficients are named, and the constant{" "}
              <InlineMath latex={`${c}`} /> is deliberately not one of them: sliding the
              curve up or down moves the turning point without moving the line it sits on.
            </>
          ),
        },
        {
          id: "axis",
          latex: `x = -\\dfrac{${b}}{2 \\times ${a < 0 ? `\\left(${a}\\right)` : a}} = ${h}`,
          spoken: `the axis of symmetry is x equals ${h}`,
          why: (
            <>
              The curve is symmetric about a vertical line and the turning point sits on it,
              so this is where along the bottom of the page to look. It rests on the step
              above because it is built from those two coefficients and nothing else.
            </>
          ),
        },
        {
          id: "substitute",
          latex: `f\\left(${h}\\right) = ${a} \\times \\left(${h}\\right)^{2} ${b < 0 ? `- ${-b}` : `+ ${b}`} \\times \\left(${h}\\right) ${c < 0 ? `- ${-c}` : `+ ${c}`}`,
          spoken: `substitute x equals ${h} back into the rule`,
          why: (
            <>
              This is the link that turns a position into a height, and it cannot come
              earlier because there is nothing to substitute until the axis is known. A
              learner who stops at the step above answers <InlineMath latex={`${h}`} />,
              which is where the extreme value happens rather than what it is.
            </>
          ),
        },
        {
          id: "state",
          text: `The parabola opens ${opensUp ? "upward" : "downward"}, so that height is its ${word}: ${value}.`,
          spoken: `the ${word} value is ${value}`,
          why: (
            <>
              The arithmetic gives a height either way; which of the two words it earns
              comes from the sign of the squared term's coefficient, which is{" "}
              <InlineMath latex={opensUp ? "\\text{positive}" : "\\text{negative}"} /> here.
              So this step rests on both of the two before it.
            </>
          ),
        },
      ]}
      dealt={dealt}
      objective={
        <>
          Goal: build the chain that gets from <InlineMath latex={`f(x) = ${written}`} /> to
          the height of its turning point, one step at a time, so each step rests on the one
          above it.
        </>
      }
      prompt="Tap the step that comes next. A step whose working is not available yet is refused."
      conclusion={
        <>
          Two moves, in an order that cannot be swapped. The coefficients give the axis of
          symmetry, which says WHERE the turning point is; putting that input back into the
          rule says HOW HIGH it is. The sign of the squared term's coefficient then decides
          whether that height is called a minimum or a maximum, and it is the only thing
          that does.
        </>
      }
      ariaLabel={`An ordering board building the route from ${written} to the height of its turning point`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different parabola"
    />
  );
}
