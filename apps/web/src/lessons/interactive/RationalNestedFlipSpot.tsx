/**
 * RAT.4 interactive (slide 1): find the line where somebody flipped the wrong fraction.
 *
 * Route (a) through a complex fraction is four moves, and only one of them can go wrong in a
 * way that still looks like the rule: the main bar is a division, division multiplies by the
 * reciprocal, and the reciprocal belongs to the DIVISOR. Flipping the top instead turns the
 * answer upside down while every other line stays correct, which is why watching the route
 * animate does not inoculate anybody against it. Meeting the finished work with a value
 * substituted, so the last line is plainly the wrong number, does.
 *
 * The three replacements are the three orientations a learner actually writes: flip the
 * divisor, flip both, flip neither.
 */

import { ComplexFractionInline } from "../complexFraction";
import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { SpotTheError } from "./kinds/SpotTheError";

interface Board {
  /** The inner denominator shared by both mixtures. */
  n: number;
  /** The value substituted to expose the bad line, and what each side gives there. */
  at: number;
  trueValue: string;
  theirValue: string;
  spokenTrue: string;
  spokenTheir: string;
}

/** Board 0 is the expression the node's other route also clears, so the two agree. */
const BOARDS: readonly Board[] = [
  {
    n: 3,
    at: 1,
    trueValue: "2",
    theirValue: "\\tfrac{1}{2}",
    spokenTrue: "2",
    spokenTheir: "one half",
  },
  {
    n: 5,
    at: 1,
    trueValue: "\\tfrac{3}{2}",
    theirValue: "\\tfrac{2}{3}",
    spokenTrue: "three halves",
    spokenTheir: "two thirds",
  },
];

export function RationalNestedFlipSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { n, at } = board;
  const stackNum = `\\dfrac{1}{x} + \\dfrac{1}{${n}}`;
  const stackDenom = `\\dfrac{1}{x} - \\dfrac{1}{${n}}`;
  const stack = `\\dfrac{${stackNum}}{${stackDenom}}`;
  const top = `\\dfrac{${n} + x}{${n}x}`;
  const bottom = `\\dfrac{${n} - x}{${n}x}`;
  const combined = `\\dfrac{${top}}{${bottom}}`;
  const right = `\\dfrac{${n} + x}{${n} - x}`;

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Find the line where this route stops agreeing with the expression it started from,
          then choose the line that would have kept the two equal.
        </>
      }
      heading={
        <>
          Somebody has cleared{" "}
          <ComplexFractionInline numerator={stackNum} denominator={stackDenom} /> and
          finished with <InlineMath latex={`\\dfrac{${n} - x}{${n} + x}`} />. At{" "}
          <InlineMath latex={`x = ${at}`} /> the expression they started from is{" "}
          <InlineMath latex={board.trueValue} />, but their answer gives{" "}
          <InlineMath latex={board.theirValue} />. One line is where it went wrong.
        </>
      }
      lines={[
        {
          id: "l1",
          latex: stack,
          complex: { numerator: stackNum, denominator: stackDenom },
          spoken: `one over x plus one over ${n}, all over one over x minus one over ${n}`,
          fine: "That is the expression copied down, so there is nothing wrong with it yet.",
        },
        {
          id: "l2",
          latex: combined,
          complex: { numerator: top, denominator: bottom },
          spoken: `${n} plus x over ${n}x, all over ${n} minus x over ${n}x`,
          fine: `Both mixtures are combined correctly here. Each one was written over the inner denominator ${n}x, which is what turns the board into a single fraction divided by a single fraction.`,
        },
        {
          id: "l3",
          latex: `\\dfrac{${n}x}{${n} + x} \\times ${bottom}`,
          spoken: `${n}x over ${n} plus x, times ${n} minus x over ${n}x`,
          wrong: true,
        },
        {
          id: "l4",
          latex: `\\dfrac{${n} - x}{${n} + x}`,
          spoken: `${n} minus x over ${n} plus x`,
          fine: `The cancelling on this line is done correctly: the ${n}x above and below really does divide out. The trouble is which fraction was turned over on the line before.`,
        },
      ]}
      corrections={[
        {
          id: "flip-divisor",
          latex: `${top} \\times \\dfrac{${n}x}{${n} - x}`,
          spoken: `${n} plus x over ${n}x, times ${n}x over ${n} minus x`,
          correct: true,
        },
        {
          id: "flip-both",
          latex: `\\dfrac{${n}x}{${n} + x} \\times \\dfrac{${n}x}{${n} - x}`,
          spoken: `${n}x over ${n} plus x, times ${n}x over ${n} minus x`,
          miss: (
            <>
              Turning both fractions over is two changes where the rule asks for one.
              Nothing would cancel either: <InlineMath latex={`${n}x`} /> would be on top
              twice, giving{" "}
              <InlineMath latex={`\\dfrac{${n}^{2}x^{2}}{(${n} + x)(${n} - x)}`} />, which
              is not even close to the value the original takes at{" "}
              <InlineMath latex={`x = ${at}`} />.
            </>
          ),
        },
        {
          id: "no-flip",
          latex: `${top} \\times ${bottom}`,
          spoken: `${n} plus x over ${n}x, times ${n} minus x over ${n}x`,
          miss: (
            <>
              This multiplies the two mixtures instead of dividing them. The main bar is a
              division sign, and division only becomes multiplication once one of the two
              fractions has been turned over, so leaving both as they are answers a
              different question entirely.
            </>
          ),
        },
      ]}
      diagnosis={
        <>
          The wrong fraction was turned over. The main bar divides the top by the bottom, so
          it is the DIVISOR, <InlineMath latex={bottom} />, whose reciprocal is multiplied
          in. Flipping the top instead turns the whole quotient upside down, which is
          exactly the relationship between{" "}
          <InlineMath latex={`\\dfrac{${n} - x}{${n} + x}`} /> and the right answer.
        </>
      }
      remedy={
        <>
          Keep the numerator as it stands and multiply by the reciprocal of the denominator:{" "}
          <InlineMath latex={`${top} \\times \\dfrac{${n}x}{${n} - x}`} />. That is the same
          move as{" "}
          <InlineMath latex="\tfrac{a}{b} \div \tfrac{c}{d} = \tfrac{a}{b} \times \tfrac{d}{c}" />
          , where only the second fraction turns over.
        </>
      }
      findPrompt="Tap the first line that does not follow."
      fixPrompt="Now pick the line that should have been written there instead."
      conclusion={
        <>
          With the divisor flipped, <InlineMath latex={`${n}x`} /> cancels and{" "}
          <InlineMath latex={right} /> is left, which is{" "}
          <InlineMath latex={board.trueValue} /> at <InlineMath latex={`x = ${at}`} /> as it
          should be. Only the fraction UNDER the main bar ever turns over.
        </>
      }
      ariaLabel={`Four lines of work clearing a complex fraction whose inner denominators are x and ${n}`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different complex fraction"
    />
  );
}
