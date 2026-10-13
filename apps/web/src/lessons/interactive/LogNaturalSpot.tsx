import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type Correction, SpotTheError, type WorkedLine } from "./kinds/SpotTheError";

/**
 * EL.3 slide 3: the two named logarithms, and the sign that goes missing under them.
 *
 * Both boards are the same misconception met in the two places it shows up: an argument below
 * $1$ needs a NEGATIVE exponent, and the reciprocal notation hides that. A learner who has
 * only ever counted zeros upward reads $0.001$ as three of something and writes $3$, and the
 * work in front of them looks reasonable until the sign is checked.
 *
 * `SpotTheError` is the shape because the mistake survives being told about it: the wrong move
 * is already made, in a line that follows plausibly from the one above it, which is how it will
 * turn up in the learner's own writing.
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
        Somebody evaluated <InlineMath latex="\log 0.001" /> and reached an answer above
        zero, for a number smaller than <InlineMath latex="1" />.
      </>
    ),
    lines: [
      {
        id: "b0-l0",
        latex: "\\log 0.001 \\text{ has base } 10",
        spoken: "log of 0.001 has base 10",
        fine: "That line is right: a log written with no base underneath is the common logarithm, and its base is 10.",
      },
      {
        id: "b0-l1",
        latex: "0.001 = \\dfrac{1}{1000}",
        spoken: "0.001 equals one over 1000",
        fine: "That line is right: three decimal places is a thousandth, so the reciprocal is correct.",
      },
      {
        id: "b0-l2",
        latex: "\\dfrac{1}{1000} = 10^{3}",
        spoken: "one over 1000 equals 10 to the 3",
        wrong: true,
      },
      {
        id: "b0-l3",
        latex: "\\log 0.001 = 3",
        spoken: "log of 0.001 equals 3",
        fine: "That line follows correctly from the one above it, which is why it is not where the work first goes wrong.",
      },
    ],
    corrections: [
      {
        id: "b0-c0",
        latex: "\\dfrac{1}{1000} = 10^{-3}",
        spoken: "one over 1000 equals 10 to the negative 3",
        correct: true,
      },
      {
        id: "b0-c1",
        latex: "\\dfrac{1}{1000} = 10^{\\tfrac{1}{3}}",
        spoken: "one over 1000 equals 10 to the one third",
        miss: (
          <>
            A fractional exponent is a ROOT, and <InlineMath latex="10^{\tfrac{1}{3}}" /> is
            a little over <InlineMath latex="2" />. The reciprocal that has to be undone is
            a negative exponent, not a fractional one.
          </>
        ),
      },
      {
        id: "b0-c2",
        latex: "\\dfrac{1}{1000} = -10^{3}",
        spoken: "one over 1000 equals negative 10 to the 3",
        miss: (
          <>
            That is <InlineMath latex="-1000" />, a negative NUMBER, where{" "}
            <InlineMath latex="\dfrac{1}{1000}" /> is a small positive one. The minus sign
            belongs on the exponent, which shrinks the value, rather than in front of the
            whole power, which flips its sign.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        A reciprocal is a negative power, so{" "}
        <InlineMath latex="\dfrac{1}{1000} = 10^{-3}" /> and not{" "}
        <InlineMath latex="10^{3}" />, which is <InlineMath latex="1000" /> itself.
      </>
    ),
    remedy: (
      <>
        With <InlineMath latex="\dfrac{1}{1000} = 10^{-3}" /> the common logarithm reads the
        exponent off directly: <InlineMath latex="\log 0.001 = -3" />. An argument below{" "}
        <InlineMath latex="1" /> always gives a negative logarithm, because it is the
        reciprocal of an argument above <InlineMath latex="1" />, and a reciprocal is the
        same power with its exponent negated.
      </>
    ),
    conclusion: (
      <>
        <InlineMath latex="\log 0.001 = -3" />. A logarithm hands back an exponent, and an
        exponent is free to be negative, which is exactly what an argument between{" "}
        <InlineMath latex="0" /> and <InlineMath latex="1" /> forces.
      </>
    ),
    ariaLabel:
      "Four lines of work evaluating the common logarithm of 0.001, one of which does not follow",
  },
  {
    heading: (
      <>
        Somebody evaluated <InlineMath latex="\ln \dfrac{1}{e^{3}}" /> and reached a
        positive answer.
      </>
    ),
    lines: [
      {
        id: "b1-l0",
        latex: "\\ln \\text{ has base } e",
        spoken: "l n has base e",
        fine: "That line is right: the natural logarithm is the logarithm whose base is e.",
      },
      {
        id: "b1-l1",
        latex: "\\dfrac{1}{e^{3}} = e^{-3}",
        spoken: "one over e cubed equals e to the negative 3",
        fine: "That line is right: a reciprocal is the same power with a negative exponent.",
      },
      {
        id: "b1-l2",
        latex: "\\ln e^{-3} = 3",
        spoken: "l n of e to the negative 3 equals 3",
        wrong: true,
      },
    ],
    corrections: [
      {
        id: "b1-c0",
        latex: "\\ln e^{-3} = -3",
        spoken: "l n of e to the negative 3 equals negative 3",
        correct: true,
      },
      {
        id: "b1-c1",
        latex: "\\ln e^{-3} = \\tfrac{1}{3}",
        spoken: "l n of e to the negative 3 equals one third",
        miss: (
          <>
            The reciprocal has already been dealt with on the line above: it became the
            minus sign on the exponent. Turning it into a fraction as well undoes it twice.
          </>
        ),
      },
      {
        id: "b1-c2",
        latex: "\\ln e^{-3} = e^{-3}",
        spoken: "l n of e to the negative 3 equals e to the negative 3",
        miss: (
          <>
            A logarithm hands back the EXPONENT it finds, not the power it was given. This
            line leaves the answer as the thing that was being read, which is a statement
            that says nothing.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        The natural logarithm returns the exponent on <InlineMath latex="e" /> exactly as it
        stands, and the exponent here is <InlineMath latex="-3" />. Dropping the minus keeps
        the SIZE of the exponent and throws away its direction.
      </>
    ),
    remedy: (
      <>
        <InlineMath latex="\ln e^{-3} = -3" />, which is the whole exponent, sign included.
        The value has to be negative anyway, because <InlineMath latex="\dfrac{1}{e^{3}}" />{" "}
        is smaller than <InlineMath latex="1" /> and only a negative exponent takes{" "}
        <InlineMath latex="e" /> below <InlineMath latex="1" />.
      </>
    ),
    conclusion: (
      <>
        <InlineMath latex="\ln \dfrac{1}{e^{3}} = -3" />. The reciprocal becomes a negative
        exponent, and the natural logarithm reads that exponent off with its sign attached.
      </>
    ),
    ariaLabel:
      "Three lines of work evaluating the natural logarithm of one over e cubed, one of which does not follow",
  },
];

export function LogNaturalSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <SpotTheError
      key={variant.nonce}
      objective="Goal: find the first line of this evaluation that does not follow from the one above it, then choose the line that belongs there instead."
      heading={board.heading}
      lines={board.lines}
      corrections={board.corrections}
      diagnosis={board.diagnosis}
      remedy={board.remedy}
      findPrompt="One line of this work does not follow. Tap the first one that fails."
      fixPrompt="Now choose what that line should say."
      conclusion={board.conclusion}
      ariaLabel={board.ariaLabel}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on a different evaluation"
    />
  );
}
