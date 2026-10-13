/**
 * FUN.7 interactive (slide 3): find the line where the two machines were run the wrong way
 * round.
 *
 * Composition not commuting is the misconception that survives being told about it, because
 * every line of the wrong work is arithmetically correct. Only the second line is wrong, and
 * it is wrong in the way a learner writes it: the input was handed to the function whose
 * name is printed first. Everything after it follows honestly from that, which is exactly
 * why watching a correct example does not inoculate anybody.
 *
 * So the board substitutes the value, the way `RationalNestedFlipSpot` does: the heading
 * says what the pair really returns and what this work returned, and the two numbers are far
 * enough apart that the answer cannot be a rounding of the question.
 *
 * The three replacements are the three things a learner writes on this line: the correct
 * chain, a product (reading the circle as multiplication), and the same swap written with a
 * circle rather than with nested brackets.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { SpotTheError } from "./kinds/SpotTheError";

interface Board {
  /** The outer function, as LaTeX in `x` and as a sentence. */
  fTex: string;
  fSpoken: string;
  /** The inner function. */
  gTex: string;
  gSpoken: string;
  /** The input the pair is evaluated at. */
  at: number;
  /** `f` of the input: the value the wrong work hands to `g`. */
  fAtInput: number;
  /** What the wrong work finishes with, `g(f(at))`. */
  theirValue: number;
  /** `g` of the input: the value the right chain hands to `f`. */
  gAtInput: number;
  /** What the pair really returns, `f(g(at))`. */
  trueValue: number;
  /** How the last correct line reads out, for the caption that says it is fine. */
  lastLineWorking: string;
}

const BOARDS: readonly Board[] = [
  {
    fTex: "x^{2}",
    fSpoken: "x squared",
    gTex: "x + 3",
    gSpoken: "x plus 3",
    at: 2,
    fAtInput: 4,
    theirValue: 7,
    gAtInput: 5,
    trueValue: 25,
    lastLineWorking: "4 + 3 = 7",
  },
  {
    fTex: "3x",
    fSpoken: "3 x",
    gTex: "x - 5",
    gSpoken: "x minus 5",
    at: 8,
    fAtInput: 24,
    theirValue: 19,
    gAtInput: 3,
    trueValue: 9,
    lastLineWorking: "24 - 5 = 19",
  },
];

export function ComposeOrderSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { fTex, gTex, at, fAtInput, theirValue, gAtInput, trueValue } = board;

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Find the line where this work stops answering the question it was asked, then
          choose the line that belongs there instead.
        </>
      }
      heading={
        <>
          For <InlineMath latex={`f(x) = ${fTex}`} /> and{" "}
          <InlineMath latex={`g(x) = ${gTex}`} />, somebody has worked out{" "}
          <InlineMath latex={`(f \\circ g)(${at})`} /> and finished with{" "}
          <InlineMath latex={`${theirValue}`} />. Sending the <InlineMath latex={`${at}`} />{" "}
          through <InlineMath latex="g" /> and handing the result to{" "}
          <InlineMath latex="f" /> returns <InlineMath latex={`${trueValue}`} />. One line
          is where it went wrong.
        </>
      }
      lines={[
        {
          id: "l1",
          latex: `(f \\circ g)(${at})`,
          spoken: `f composed with g, of ${at}`,
          fine: "That is the question copied down, so there is nothing wrong with it yet.",
        },
        {
          id: "l2",
          latex: `= g(f(${at}))`,
          spoken: `equals g of f of ${at}`,
          wrong: true,
        },
        {
          id: "l3",
          latex: `= g(${fAtInput})`,
          spoken: `equals g of ${fAtInput}`,
          fine: `This line does follow from the one above it: it is just ${board.fSpoken} worked out at ${at}. The trouble is which function was given the ${at} in the first place.`,
        },
        {
          id: "l4",
          latex: `= ${theirValue}`,
          spoken: `equals ${theirValue}`,
          fine: `The arithmetic here is right, ${board.lastLineWorking}. Every line after the mistake is honest, which is what makes the mistake hard to see.`,
        },
      ]}
      corrections={[
        {
          id: "product",
          latex: `= f(${at}) \\times g(${at})`,
          spoken: `equals f of ${at} times g of ${at}`,
          miss: (
            <>
              The circle is not a multiplication sign. It chains the two functions, so one
              of them is given the other one's output rather than both being worked out at{" "}
              <InlineMath latex={`${at}`} /> and multiplied together.
            </>
          ),
        },
        {
          id: "chain",
          latex: `= f(g(${at}))`,
          spoken: `equals f of g of ${at}`,
          correct: true,
        },
        {
          id: "swap-circle",
          latex: `= (g \\circ f)(${at})`,
          spoken: `equals g composed with f, of ${at}`,
          miss: (
            <>
              That is the same swap written with a circle instead of brackets.{" "}
              <InlineMath latex={`(g \\circ f)(${at})`} /> hands the{" "}
              <InlineMath latex={`${at}`} /> to <InlineMath latex="f" /> first, which is
              exactly the route that produced <InlineMath latex={`${theirValue}`} />.
            </>
          ),
        },
      ]}
      diagnosis={
        <>
          The two functions were run in the wrong order. In{" "}
          <InlineMath latex="(f \circ g)" /> the function standing next to the input is{" "}
          <InlineMath latex="g" />, so the <InlineMath latex={`${at}`} /> belongs to{" "}
          <InlineMath latex="g" /> and <InlineMath latex="f" /> acts on what comes back.
          This line hands the <InlineMath latex={`${at}`} /> to <InlineMath latex="f" />{" "}
          instead.
        </>
      }
      remedy={
        <>
          <InlineMath latex={`f(g(${at}))`} /> keeps the input with the inner function. Then{" "}
          <InlineMath latex={`g(${at}) = ${gAtInput}`} /> and{" "}
          <InlineMath latex={`f(${gAtInput}) = ${trueValue}`} />, which is the value the
          pair really returns.
        </>
      }
      findPrompt="Tap the first line that does not follow."
      fixPrompt="Now pick the line that should have been written there instead."
      conclusion={
        <>
          Read <InlineMath latex="(f \circ g)" /> from the inside out:{" "}
          <InlineMath latex="g" /> first, then <InlineMath latex="f" />. Run the same two
          functions the other way and you get <InlineMath latex={`${theirValue}`} /> instead
          of <InlineMath latex={`${trueValue}`} />, so the order is part of the answer
          rather than a detail of the writing.
        </>
      }
      ariaLabel={`Four lines of work evaluating f composed with g at ${at}, where f of x is ${board.fSpoken} and g of x is ${board.gSpoken}`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different pair of functions"
    />
  );
}
