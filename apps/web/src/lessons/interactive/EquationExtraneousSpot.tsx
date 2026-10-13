import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type Correction, SpotTheError, type WorkedLine } from "./kinds/SpotTheError";

/**
 * EL.6 slide 3: the root that solves the tidied equation and not the one that was asked.
 *
 * Both boards are the same misconception met on two bases: gathering two logarithms into one
 * WIDENS what the equation will accept, because a product is positive whenever both of its
 * factors are negative, so the quadratic that comes out of the gathered form offers a root the
 * original could never take. Every line of the algebra is correct, which is exactly why the
 * work reads as finished, and the only thing that catches the surplus root is putting each
 * candidate back into the equation as it was given.
 *
 * `SpotTheError` is the shape because nothing in the writing looks wrong. The learner is not
 * hunting an arithmetic slip: they are being asked where a correct chain of algebra stops
 * being an answer, which is a judgement they have to make about work that already looks done.
 */

interface Board {
  lines: readonly WorkedLine[];
  corrections: readonly Correction[];
  heading: ReactNode;
  diagnosis: ReactNode;
  remedy: ReactNode;
  conclusion: ReactNode;
  ariaLabel: string;
}

const BOARDS: readonly Board[] = [
  {
    heading: (
      <>
        Somebody solved <InlineMath latex="\log x + \log(x - 15) = 2" /> and finished with
        two solutions, one of them negative.
      </>
    ),
    lines: [
      {
        id: "b0-l0",
        latex: "\\log\\left(x(x - 15)\\right) = 2",
        spoken: "log of x times x minus 15 equals 2",
        fine: "That line is right: a sum of logarithms of one base is the logarithm of the product, so the two gather into one. Gathering does widen what the equation will accept, which is why the roots have to be tested at the end, but the line itself follows.",
      },
      {
        id: "b0-l1",
        latex: "x(x - 15) = 10^{2}",
        spoken: "x times x minus 15 equals 10 squared",
        fine: "That line is right: a single common logarithm equal to 2 says that its argument is 10 raised to the 2.",
      },
      {
        id: "b0-l2",
        latex: "x^{2} - 15x - 100 = 0",
        spoken: "x squared minus 15 x minus 100 equals 0",
        fine: "That line is right: multiplying out and taking the 100 across gives exactly that quadratic.",
      },
      {
        id: "b0-l3",
        latex: "(x - 20)(x + 5) = 0",
        spoken: "x minus 20 times x plus 5 equals 0",
        fine: "That line is right: those factors multiply back to the quadratic above, so both numbers really are roots of the quadratic.",
      },
      {
        id: "b0-l4",
        latex: "\\text{solution set } \\{20, -5\\}",
        spoken: "solution set 20 and negative 5",
        wrong: true,
      },
    ],
    corrections: [
      {
        id: "b0-c0",
        latex: "\\{20\\}",
        spoken: "the set whose only member is 20",
        correct: true,
      },
      {
        id: "b0-c1",
        latex: "\\{20, -5\\}",
        spoken: "the set containing 20 and negative 5",
        miss: (
          <>
            Both numbers are roots of the quadratic, and the quadratic is the equation
            GATHERING produced rather than the one that was asked. The test that settles it
            is <InlineMath latex="\log x + \log(x - 15) = 2" />, and{" "}
            <InlineMath latex="-5" /> does not survive it.
          </>
        ),
      },
      {
        id: "b0-c2",
        latex: "\\{-5\\}",
        spoken: "the set whose only member is negative 5",
        miss: (
          <>
            <InlineMath latex="-5" /> is the root that FAILS the check:{" "}
            <InlineMath latex="\log(-5)" /> has no value, so the original equation cannot
            take it. The candidate that survives the check is the one that is kept.
          </>
        ),
      },
      {
        id: "b0-c3",
        latex: "\\{\\}",
        spoken: "the empty set",
        miss: (
          <>
            <InlineMath latex="20" /> passes the check:{" "}
            <InlineMath latex="\log 20 + \log 5 = \log 100 = 2" />, with both arguments
            positive. Only a candidate that sends an argument to zero or below is thrown
            out.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        Gathering widened what the equation accepts, so the quadratic offers a root the
        original cannot take: <InlineMath latex="x = -5" /> turns{" "}
        <InlineMath latex="\log x" /> into <InlineMath latex="\log(-5)" />, and a logarithm
        has nothing to say about a negative number.
      </>
    ),
    remedy: (
      <>
        Only <InlineMath latex="x = 20" /> survives the original equation:{" "}
        <InlineMath latex="\log 20 + \log 5 = \log 100 = 2" />, and both arguments are above
        zero. <InlineMath latex="x = -5" /> is extraneous, so the line should read{" "}
        <InlineMath latex="\{20\}" />.
      </>
    ),
    conclusion: (
      <>
        <InlineMath latex="\log x + \log(x - 15) = 2" /> has the single solution{" "}
        <InlineMath latex="x = 20" />. A candidate is tested in the equation that was ASKED,
        never in the tidied one, because tidying is what let the extra root in.
      </>
    ),
    ariaLabel:
      "Five lines of work solving log x plus log of x minus 15 equals 2, one of which the original equation does not support",
  },
  {
    heading: (
      <>
        Somebody solved <InlineMath latex="\log_{3} x + \log_{3}(x - 6) = 3" /> and kept
        both roots the quadratic offered.
      </>
    ),
    lines: [
      {
        id: "b1-l0",
        latex: "\\log_{3}\\left(x(x - 6)\\right) = 3",
        spoken: "log base 3 of x times x minus 6 equals 3",
        fine: "That line is right: two logarithms of base 3 added together are the base 3 logarithm of the product. Gathering is also what widens the equation, which is why the roots are tested at the end, but the line follows.",
      },
      {
        id: "b1-l1",
        latex: "x(x - 6) = 3^{3}",
        spoken: "x times x minus 6 equals 3 cubed",
        fine: "That line is right: a single logarithm of base 3 equal to 3 says that its argument is 3 raised to the 3.",
      },
      {
        id: "b1-l2",
        latex: "x^{2} - 6x - 27 = 0",
        spoken: "x squared minus 6 x minus 27 equals 0",
        fine: (
          <>
            That line is right: <InlineMath latex="3^{3} = 27" />, and taking it across
            gives exactly that quadratic.
          </>
        ),
      },
      {
        id: "b1-l3",
        latex: "(x - 9)(x + 3) = 0",
        spoken: "x minus 9 times x plus 3 equals 0",
        fine: "That line is right: those factors multiply back to the quadratic above, so both numbers really are roots of the quadratic.",
      },
      {
        id: "b1-l4",
        latex: "\\text{solution set } \\{9, -3\\}",
        spoken: "solution set 9 and negative 3",
        wrong: true,
      },
    ],
    corrections: [
      {
        id: "b1-c0",
        latex: "\\{9\\}",
        spoken: "the set whose only member is 9",
        correct: true,
      },
      {
        id: "b1-c1",
        latex: "\\{9, -3\\}",
        spoken: "the set containing 9 and negative 3",
        miss: (
          <>
            Both numbers satisfy <InlineMath latex="x^{2} - 6x - 27 = 0" />, which is what
            gathering produced. The equation that was asked is{" "}
            <InlineMath latex="\log_{3} x + \log_{3}(x - 6) = 3" />, and that is where each
            candidate has to be tried.
          </>
        ),
      },
      {
        id: "b1-c2",
        latex: "\\{-3\\}",
        spoken: "the set whose only member is negative 3",
        miss: (
          <>
            <InlineMath latex="-3" /> is the root being discarded, not the one being kept:{" "}
            <InlineMath latex="\log_{3}(-3)" /> has no value, and neither does{" "}
            <InlineMath latex="\log_{3}(-9)" /> beside it.
          </>
        ),
      },
      {
        id: "b1-c3",
        latex: "\\{\\}",
        spoken: "the empty set",
        miss: (
          <>
            <InlineMath latex="9" /> passes the check:{" "}
            <InlineMath latex="\log_{3} 9 + \log_{3} 3 = 2 + 1 = 3" />, with both arguments
            above zero. A check throws out the candidates that fail it, not every candidate
            on the page.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        The gathered equation accepts more than the original does, because{" "}
        <InlineMath latex="x(x - 6)" /> is positive for <InlineMath latex="x = -3" /> while{" "}
        <InlineMath latex="\log_{3}(-3)" /> has no value at all. That root solves the
        quadratic without solving the question.
      </>
    ),
    remedy: (
      <>
        Testing <InlineMath latex="x = 9" /> in the original gives{" "}
        <InlineMath latex="\log_{3} 9 + \log_{3} 3 = 2 + 1 = 3" />, so it stands, and{" "}
        <InlineMath latex="x = -3" /> is extraneous. The line should read{" "}
        <InlineMath latex="\{9\}" />.
      </>
    ),
    conclusion: (
      <>
        <InlineMath latex="\log_{3} x + \log_{3}(x - 6) = 3" /> has the single solution{" "}
        <InlineMath latex="x = 9" />. Gathering two logarithms is allowed to hand back a
        root the question cannot take, so the last step of one of these is always the check.
      </>
    ),
    ariaLabel:
      "Five lines of work solving log base 3 of x plus log base 3 of x minus 6 equals 3, one of which the original equation does not support",
  },
];

export function EquationExtraneousSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <SpotTheError
      key={variant.nonce}
      objective="Goal: find the first line of this solution that the original equation does not support, then choose the solution set that belongs there instead."
      heading={board.heading}
      lines={board.lines}
      corrections={board.corrections}
      diagnosis={board.diagnosis}
      remedy={board.remedy}
      findPrompt="Every line of algebra here is correct, and one line is still not true of the equation that was asked. Tap the first line that fails it."
      fixPrompt="Now choose the solution set that belongs there."
      conclusion={board.conclusion}
      ariaLabel={board.ariaLabel}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on a different equation"
    />
  );
}
