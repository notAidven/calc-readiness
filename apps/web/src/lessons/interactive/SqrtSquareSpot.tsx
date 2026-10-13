/**
 * RAD.4 interactive (slide 1): find the line where somebody cancelled a square against a
 * square root and got the sign wrong.
 *
 * $\sqrt{x^{2}} = x$ is the most reasonable-looking wrong line in the whole node. It is
 * true half the time, the half a learner usually checks, so being told the rule does not
 * dislodge it. Meeting it inside finished work, with a value substituted that makes the
 * last line plainly false, does: the learner can see the contradiction before they are
 * told which step caused it.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { SpotTheError } from "./kinds/SpotTheError";

interface Board {
  /** The negative value substituted in, which is what exposes the bad line. */
  value: number;
}

/** Neither value is the paragraph's own $-6$. */
const BOARDS: readonly Board[] = [{ value: -4 }, { value: -9 }];

export function SqrtSquareSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { value } = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const squared = value * value;
  const magnitude = Math.abs(value);

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Find the line that stops being true once <InlineMath latex="x" /> is negative,
          then choose the line that is true on both sides of zero.
        </>
      }
      heading={
        <>
          Somebody has worked out <InlineMath latex="\sqrt{x^{2}}" /> at{" "}
          <InlineMath latex={`x = ${value}`} /> and reached an answer that cannot be right.
          One line is where it went wrong.
        </>
      }
      lines={[
        {
          id: "l1",
          latex: `\\sqrt{x^{2}} \\text{ at } x = ${value}`,
          spoken: `the square root of x squared, at x equals ${value}`,
          fine: "That is the question copied down, so there is nothing wrong with it yet.",
        },
        {
          id: "l2",
          latex: "\\sqrt{x^{2}} = x",
          spoken: "the square root of x squared equals x",
          wrong: true,
        },
        {
          id: "l3",
          latex: `= ${value}`,
          spoken: `equals ${value}`,
          fine: `Substituting ${value} for x is done correctly here. The trouble is what x was claimed to equal on the line above.`,
        },
      ]}
      corrections={[
        {
          id: "abs",
          latex: "\\sqrt{x^{2}} = |x|",
          spoken: "the square root of x squared equals the absolute value of x",
          correct: true,
        },
        {
          id: "neg",
          latex: "\\sqrt{x^{2}} = -x",
          spoken: "the square root of x squared equals negative x",
          miss: (
            <>
              That fixes this one case and breaks the other. At{" "}
              <InlineMath latex={`x = ${magnitude}`} /> it would give{" "}
              <InlineMath latex={`-${magnitude}`} />, and a square root never hands back a
              negative. What is needed is a rule that is right on both sides of zero.
            </>
          ),
        },
        {
          id: "pm",
          latex: "\\sqrt{x^{2}} = \\pm x",
          spoken: "the square root of x squared equals plus or minus x",
          miss: (
            <>
              A radical names one value, not two. Both <InlineMath latex={`${magnitude}`} />{" "}
              and <InlineMath latex={`${value}`} /> square to{" "}
              <InlineMath latex={`${squared}`} />, but the symbol is defined to pick the one
              that is not negative, which is the only reason a root can be written down as
              an answer at all.
            </>
          ),
        },
      ]}
      diagnosis={
        <>
          Squaring throws the sign away, so{" "}
          <InlineMath latex={`(${value})^{2} = ${squared}`} /> and{" "}
          <InlineMath latex={`${magnitude}^{2} = ${squared}`} /> alike, and the root that
          follows has no way to know which one it started from. It returns{" "}
          <InlineMath latex={`${magnitude}`} />, so the two sides of that line disagree
          whenever <InlineMath latex="x" /> is negative.
        </>
      }
      remedy={
        <>
          What comes back is the distance of <InlineMath latex="x" /> from zero with the
          sign discarded, and that is written <InlineMath latex="|x|" />. It is right on
          both sides of zero at once: at <InlineMath latex={`x = ${value}`} /> it gives{" "}
          <InlineMath latex={`${magnitude}`} />, and at{" "}
          <InlineMath latex={`x = ${magnitude}`} /> it gives{" "}
          <InlineMath latex={`${magnitude}`} /> as well.
        </>
      }
      findPrompt="Tap the first line that is not true for every value of x."
      fixPrompt="Now pick the line that should have been written there instead."
      conclusion={
        <>
          <InlineMath latex="\sqrt{x^{2}} = |x|" />, not <InlineMath latex="x" />. The bars
          are not decoration on the answer; they are what makes the line true when{" "}
          <InlineMath latex="x" /> is negative, which is exactly the case the plain version
          gets wrong.
        </>
      }
      ariaLabel={`Three lines of work evaluating the square root of x squared at x equals ${value}`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different value"
    />
  );
}
