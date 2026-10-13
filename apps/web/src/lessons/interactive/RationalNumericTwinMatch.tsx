/**
 * RAT.3 interactive (slide 0): join each move on a numeric sum to the same move on a sum of
 * rational expressions.
 *
 * This slide is the "you already know this" beat, and its content is a correspondence: the
 * three moves that add $\tfrac14 + \tfrac16$ are the three moves that add $\tfrac1x +
 * \tfrac{1}{x + 2}$, line for line. A reveal that printed both columns for the learner to
 * read let them agree with it without ever having to say which algebraic line answers which
 * numeric one, and agreeing is not the same as recognising.
 *
 * Matching also makes the mix-up cost something: the rewritten sum and the combined sum are
 * both on offer on the right, so a learner who thinks combining happens before the rewrite
 * takes the wrong chip and finds the one they needed already spent.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type MatchPair, MatchPairs } from "./kinds/MatchPairs";

interface Board {
  /** The two numeric denominators, and the LCD they share. */
  a: number;
  b: number;
  lcd: number;
  /** The offset in the algebraic pair: $\frac{1}{x} + \frac{1}{x + shift}$. */
  shift: number;
  /** How the right column is dealt: indices into the four pairs. Never in order. */
  dealt: readonly number[];
}

/**
 * Board 0 is the pair the slide's own prose names. Board 1 keeps the shape and changes every
 * number, so the second run cannot be finished from the first one's answers.
 */
const BOARDS: readonly Board[] = [
  { a: 4, b: 6, lcd: 12, shift: 2, dealt: [2, 0, 3, 1] },
  { a: 6, b: 9, lcd: 18, shift: 3, dealt: [1, 3, 0, 2] },
];

export function RationalNumericTwinMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { a, b, lcd, shift, dealt } = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  /** What each numeric fraction was missing, and so what its numerator becomes. */
  const upA = lcd / a;
  const upB = lcd / b;
  const total = upA + upB;
  const algLcd = `x(x + ${shift})`;

  const pairs: MatchPair[] = [
    {
      id: "start",
      left: `\\dfrac{1}{${a}} + \\dfrac{1}{${b}}`,
      right: `\\dfrac{1}{x} + \\dfrac{1}{x + ${shift}}`,
      leftSpoken: `one over ${a} plus one over ${b}`,
      rightSpoken: `one over x plus one over x plus ${shift}`,
      why: (
        <>
          Both are a sum of two fractions with nothing in common underneath, which is the
          position every one of these problems starts from. The only difference is that one
          pair of denominators is written with digits and the other with{" "}
          <InlineMath latex="x" />.
        </>
      ),
    },
    {
      id: "lcd",
      left: `${lcd}`,
      right: algLcd,
      leftSpoken: `${lcd}`,
      rightSpoken: `x times x plus ${shift}`,
      why: (
        <>
          Each is the least common denominator of its own pair: the smallest thing both
          denominators divide into. <InlineMath latex={`${lcd}`} /> includes every factor of{" "}
          <InlineMath latex={`${a}`} /> and of <InlineMath latex={`${b}`} />, and{" "}
          <InlineMath latex={algLcd} /> includes <InlineMath latex="x" /> and{" "}
          <InlineMath latex={`x + ${shift}`} />. Neither carries anything extra.
        </>
      ),
    },
    {
      id: "rewrite",
      left: `\\dfrac{${upA}}{${lcd}} + \\dfrac{${upB}}{${lcd}}`,
      right: `\\dfrac{x + ${shift}}{${algLcd}} + \\dfrac{x}{${algLcd}}`,
      leftSpoken: `${upA} over ${lcd} plus ${upB} over ${lcd}`,
      rightSpoken: `x plus ${shift} over ${algLcd}, plus x over ${algLcd}`,
      why: (
        <>
          Both lines are the same sum rewritten over that common denominator, and neither
          has been added up yet. Each fraction was multiplied above and below by whatever it
          was missing: <InlineMath latex={`\\tfrac{1}{${a}}`} /> by{" "}
          <InlineMath latex={`${upA}`} /> and <InlineMath latex={`\\tfrac{1}{x}`} /> by{" "}
          <InlineMath latex={`x + ${shift}`} />, which is multiplying by{" "}
          <InlineMath latex="1" /> in both cases.
        </>
      ),
    },
    {
      id: "combine",
      left: `\\dfrac{${total}}{${lcd}}`,
      right: `\\dfrac{2x + ${shift}}{${algLcd}}`,
      leftSpoken: `${total} over ${lcd}`,
      rightSpoken: `2x plus ${shift}, over ${algLcd}`,
      why: (
        <>
          These are the finished sums. In each one the numerators were added and the
          denominator was left alone: <InlineMath latex={`${upA} + ${upB} = ${total}`} /> on
          one side and <InlineMath latex={`(x + ${shift}) + x = 2x + ${shift}`} /> on the
          other.
        </>
      ),
    },
  ];

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={pairs}
      rightOrder={dealt}
      prompt="Tap a line of the numeric sum on the left, then tap the line of the algebraic sum on the right that is doing the same thing. You can also drag and drop one onto the other."
      conclusion={
        <>
          Four lines, four twins: start, common denominator, rewrite, combine. Nothing in
          the right-hand column is a new move, and the only reason it looks harder is that{" "}
          <InlineMath latex={algLcd} /> cannot be multiplied out into a single number the
          way <InlineMath latex={`${lcd}`} /> can.
        </>
      }
      ariaLabel="Four lines of a numeric fraction sum, to be joined to the matching lines of a sum of rational expressions"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different pair of sums"
    />
  );
}
