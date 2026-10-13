/**
 * EXP.1 interactive (slide 8): find the line where somebody added exponents on two
 * different bases, then say what should have been written instead.
 *
 * The mistake this slide is about is one learners make while their attention is on the
 * signs, not while they are thinking about bases, so meeting it as a finished-looking piece
 * of work is closer to how they will meet it in their own. Flagging the line is only half:
 * naming the replacement is what the gate turns on, because knowing that a step is wrong is
 * not the same as knowing what belongs there.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { SpotTheError } from "./kinds/SpotTheError";

interface Board {
  /** The two variables, and the exponents on them. */
  a: string;
  p: number;
  b: string;
  q: number;
}

/** Neither board is the slide's own $x^{3} \cdot y^{-4}$. */
const BOARDS: readonly Board[] = [
  { a: "m", p: 5, b: "n", q: 2 },
  { a: "a", p: 2, b: "c", q: 6 },
];

export function UnlikeBaseSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { a, p, b, q } = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const net = p - q;
  const tail = net >= 0 ? `${a}^{${net}}` : `\\dfrac{1}{${a}^{${-net}}}`;

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Find the line that combines two different bases as though they were one, then
          choose what should have been written in its place.
        </>
      }
      heading={
        <>
          Somebody has written <InlineMath latex={`${a}^{${p}} \\cdot ${b}^{-${q}}`} /> with
          positive exponents only. One line does not follow.
        </>
      }
      lines={[
        {
          id: "l1",
          latex: `${a}^{${p}} \\cdot ${b}^{-${q}}`,
          spoken: `${a} to the ${p} times ${b} to the minus ${q}`,
          fine: "That is just the question copied down, so there is nothing wrong with it yet.",
        },
        {
          id: "l2",
          latex: `= ${a}^{${p} + (-${q})}`,
          spoken: `equals ${a} to the ${p} plus negative ${q}`,
          wrong: true,
        },
        {
          id: "l3",
          latex: `= ${a}^{${net}}`,
          spoken: `equals ${a} to the ${net}`,
          fine: (
            <>
              Taken on its own that line is correct arithmetic,{" "}
              <InlineMath latex={`${p} + (-${q}) = ${net}`} />. The step that put those two
              exponents together is the one to look at.
            </>
          ),
        },
        {
          id: "l4",
          latex: `= ${tail}`,
          spoken: "the last line",
          fine: "That line does follow from the one above it. A negative total does move the power to the bottom of a fraction, so this step is fine. Look higher up.",
        },
      ]}
      corrections={[
        {
          id: "keep",
          latex: `= \\dfrac{${a}^{${p}}}{${b}^{${q}}}`,
          spoken: `${a} to the ${p} over ${b} to the ${q}`,
          correct: true,
        },
        {
          id: "drop",
          latex: `= ${a}^{${p}}${b}^{${q}}`,
          spoken: `${a} to the ${p} times ${b} to the ${q}`,
          miss: (
            <>
              That keeps both variables apart, which is right, but it has thrown the minus
              sign away. <InlineMath latex={`${b}^{-${q}}`} /> is{" "}
              <InlineMath latex={`\\tfrac{1}{${b}^{${q}}}`} />, so the{" "}
              <InlineMath latex={`${b}`} /> belongs underneath rather than beside.
            </>
          ),
        },
        {
          id: "group",
          latex: `= \\left(${a}${b}\\right)^{${net}}`,
          spoken: `${a} times ${b}, all to the ${net}`,
          miss: (
            <>
              Putting the two variables in a bracket does not let their exponents combine
              either. <InlineMath latex={`\\left(${a}${b}\\right)^{${net}}`} /> means{" "}
              <InlineMath latex={`${a}^{${net}}${b}^{${net}}`} />, which gives{" "}
              <InlineMath latex={`${b}`} /> an exponent it never had.
            </>
          ),
        },
      ]}
      diagnosis={
        <>
          The exponents were added, and adding exponents needs the same base on both. Here
          the bases are <InlineMath latex={`${a}`} /> and <InlineMath latex={`${b}`} />,
          which are different variables, so there is nothing to add in the first place.
        </>
      }
      remedy={
        <>
          With different bases each variable is handled on its own.{" "}
          <InlineMath latex={`${a}^{${p}}`} /> already has a positive exponent, so it stays
          on top; <InlineMath latex={`${b}^{-${q}}`} /> has a negative one, so it moves to
          the bottom. That gives <InlineMath latex={`\\dfrac{${a}^{${p}}}{${b}^{${q}}}`} />,
          which is a different number from{" "}
          <InlineMath latex={net >= 0 ? `${a}^{${net}}` : `${a}^{${net}}`} /> rather than
          the same number written differently.
        </>
      }
      findPrompt="Tap the first line that does not follow from the one above it."
      fixPrompt="Now pick the line that should have been written there instead."
      conclusion={
        <>
          Only powers on the same base combine. Two different variables means two separate
          jobs:{" "}
          <InlineMath
            latex={`${a}^{${p}} \\cdot ${b}^{-${q}} = \\dfrac{${a}^{${p}}}{${b}^{${q}}}`}
          />
          , and the exponents never meet.
        </>
      }
      ariaLabel={`Four lines of work simplifying ${a} to the ${p} times ${b} to the minus ${q}`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with different variables"
    />
  );
}
