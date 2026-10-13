/**
 * POL.5 slide 3: which axis a question is about, and what you set to zero to answer it.
 *
 * The two intercepts are found by setting DIFFERENT things to zero and the names are close
 * enough that they get swapped: the $y$-intercept sets the input to zero and the $x$-intercepts
 * set the output to zero. Swap them and a learner solves a quadratic to answer a question that
 * needed one substitution, or substitutes zero to answer one that needed the whole equation.
 *
 * That is a CORRESPONDENCE rather than a procedure, and each answer belongs to exactly one
 * question, so `MatchPairs` is the shape. The fourth pair is the axis of symmetry, which is here
 * because it is the one reading that comes out of the intercepts rather than out of the rule: it
 * sits midway between them, which is the symmetry the whole node rests on and the cheapest route
 * to a vertex when the crossings are already known.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { MatchPairs } from "./kinds/MatchPairs";

interface Board {
  /** The parabola, as `a(x - p)(x - q)`, so both crossings are on the page. */
  a: number;
  p: number;
  q: number;
  /** Indices into `pairs`, the order the right column is dealt in. Never the identity. */
  rightOrder: readonly number[];
}

/** Neither board reuses the slide's own parabola or the check's. */
const BOARDS: readonly Board[] = [
  { a: 1, p: -2, q: 6, rightOrder: [2, 3, 1, 0] },
  { a: 2, p: -5, q: -1, rightOrder: [3, 0, 2, 1] },
];

/** `\left(x - 3\right)` / `\left(x + 2\right)`: the bracket that vanishes at `root`. */
function bracket(root: number): string {
  return `\\left(x ${root < 0 ? `+ ${-root}` : `- ${root}`}\\right)`;
}

export function InterceptRouteMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { a, p, q, rightOrder } = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const front = a === 1 ? "" : a === -1 ? "-" : `${a}`;
  const written = `${front}${bracket(p)}${bracket(q)}`;
  const yIntercept = a * -p * -q;
  const axis = (p + q) / 2;

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={[
        {
          id: "y-intercept",
          name: "the y-intercept",
          leftProse: <>Where the graph crosses the vertical axis</>,
          leftSpoken: "where the graph crosses the vertical axis",
          right: `y = ${yIntercept}`,
          rightSpoken: `y equals ${yIntercept}`,
          why: (
            <>
              Every graph meets the vertical axis where the INPUT is zero, so put{" "}
              <InlineMath latex="x = 0" /> into the rule and work it out:{" "}
              <InlineMath
                latex={`${front}\\left(${-p}\\right)\\left(${-q}\\right) = ${yIntercept}`}
              />
              . One substitution, no equation to solve. There is only ever one of these,
              because a rule hands back one output per input.
            </>
          ),
        },
        {
          id: "left-crossing",
          name: "the left x-intercept",
          leftProse: <>The smaller of the two places it crosses the horizontal axis</>,
          leftSpoken: "the smaller of the two horizontal crossings",
          right: `x = ${Math.min(p, q)}`,
          rightSpoken: `x equals ${Math.min(p, q)}`,
          why: (
            <>
              A graph meets the horizontal axis where the OUTPUT is zero, and a product is
              zero exactly when one of its brackets is. So each bracket gives one crossing,
              and <InlineMath latex={bracket(Math.min(p, q))} /> is the one that vanishes at
              the smaller value. Note the sign: a bracket that adds a number is zero at the
              negative of it.
            </>
          ),
        },
        {
          id: "right-crossing",
          name: "the right x-intercept",
          leftProse: <>The larger of the two places it crosses the horizontal axis</>,
          leftSpoken: "the larger of the two horizontal crossings",
          right: `x = ${Math.max(p, q)}`,
          rightSpoken: `x equals ${Math.max(p, q)}`,
          why: (
            <>
              The other bracket, <InlineMath latex={bracket(Math.max(p, q))} />, read the
              same way. Two brackets, two crossings, and the number standing outside them is
              never zero so it contributes none.
            </>
          ),
        },
        {
          id: "axis",
          name: "the axis of symmetry",
          leftProse: <>The vertical line the turning point sits on</>,
          leftSpoken: "the vertical line the turning point sits on",
          right: `x = ${axis}`,
          rightSpoken: `x equals ${axis}`,
          why: (
            <>
              The curve is a mirror image of itself, so the two crossings are the same
              distance from the turning point and it sits exactly halfway between them:{" "}
              <InlineMath
                latex={`\\dfrac{${Math.min(p, q)} + \\left(${Math.max(p, q)}\\right)}{2} = ${axis}`}
              />
              . That is the cheapest route to a vertex there is, and it is available
              whenever the crossings are already known.
            </>
          ),
        },
      ]}
      rightOrder={rightOrder}
      objective={
        <>
          Goal: join each feature of <InlineMath latex={`f(x) = ${written}`} /> to its
          value, so the board shows where each one comes from: setting the input to zero,
          setting the output to zero, or the two crossings once they are known.
        </>
      }
      prompt="Drag a feature onto the value it takes, or tap the feature and then the value."
      conclusion={
        <>
          Two different zeros, and swapping them is the whole difficulty. Setting the INPUT
          to zero gives the one crossing on the vertical axis; setting the OUTPUT to zero
          gives the crossings on the horizontal one, which is why that half needs the
          brackets. The axis of symmetry then comes free: it is the average of the two
          horizontal crossings, and putting it back into the rule gives the turning point's
          height.
        </>
      }
      ariaLabel={`A matching board joining each feature of ${written} to its value`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different parabola"
    />
  );
}
