/**
 * LIN.5 slide 2: the negation lands on the quantity inside the bars, and here is what happens
 * when it lands somewhere else.
 *
 * The slide states the rule and names the wrong answer it protects against. Reading that is not
 * the same as catching it, so the board hands over a finished piece of work carrying exactly that
 * mistake: a solver who negated the SOLUTIONS instead of the right-hand side, which is the
 * misconception this node exists to measure.
 *
 * The replacements include the line the mistake produces one step later, so recognising that
 * something is wrong is not enough on its own.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type Correction, SpotTheError, type WorkedLine } from "./kinds/SpotTheError";

interface Board {
  given: string;
  spokenGiven: string;
  claimed: string;
  answer: string;
  lines: readonly WorkedLine[];
  corrections: readonly Correction[];
  diagnosis: ReactNode;
  remedy: ReactNode;
}

const BOARDS: readonly Board[] = [
  {
    given: "\\lvert 3x - 2 \\rvert = 10",
    spokenGiven: "the absolute value of 3 x minus 2 equals 10",
    claimed: "\\{-4, 4\\}",
    answer: "\\left\\{-\\tfrac{8}{3}, 4\\right\\}",
    lines: [
      {
        id: "a0",
        latex: "\\lvert 3x - 2 \\rvert = 10",
        spoken: "the absolute value of 3 x minus 2 equals 10",
      },
      { id: "a1", latex: "3x - 2 = 10", spoken: "3 x minus 2 equals 10" },
      { id: "a2", latex: "x = 4", spoken: "x equals 4" },
      {
        id: "a3",
        latex: "x = 4 \\;\\text{ or }\\; x = -4",
        spoken: "x equals 4 or x equals negative 4",
        wrong: true,
      },
    ],
    corrections: [
      {
        id: "a-fix",
        latex: "3x - 2 = -10",
        spoken: "3 x minus 2 equals negative 10",
        correct: true,
      },
      {
        id: "a-inside",
        latex: "-3x + 2 = 10",
        spoken: "negative 3 x plus 2 equals 10",
        miss: (
          <>
            This negates the quantity INSIDE the bars and leaves the right-hand side alone,
            which is the same statement written backwards: multiplying it through by{" "}
            <InlineMath latex="-1" /> gives <InlineMath latex="3x - 2 = -10" />. It happens
            to be equivalent, and it is not the line the work is missing, because the work
            has already used up the positive branch and needs the negative one stated in the
            same form.
          </>
        ),
      },
      {
        id: "a-solved",
        latex: "x = -\\tfrac{8}{3}",
        spoken: "x equals negative eight thirds",
        miss: (
          <>
            That is where the missing branch ENDS, and the line the work needs is where it
            begins. Putting a solved value here skips the branch it came from, so the next
            reader cannot tell whether it was worked or guessed.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        The last line makes a second solution by negating the first one. The bars never said
        the solutions come in a plus-and-minus pair; they said the quantity{" "}
        <InlineMath latex="3x - 2" /> could be <InlineMath latex="10" /> or{" "}
        <InlineMath latex="-10" />, and only the first of those has been used.
      </>
    ),
    remedy: (
      <>
        The second branch is <InlineMath latex="3x - 2 = -10" />, which gives{" "}
        <InlineMath latex="3x = -8" /> and then <InlineMath latex="x = -\tfrac{8}{3}" />.
        The coefficient inside the bars is exactly why the two solutions are not mirror
        images: they are mirror images of <InlineMath latex="3x - 2" />, not of{" "}
        <InlineMath latex="x" />.
      </>
    ),
  },
  {
    given: "\\lvert 2x + 6 \\rvert = 4",
    spokenGiven: "the absolute value of 2 x plus 6 equals 4",
    claimed: "\\{-1, 1\\}",
    answer: "\\{-5, -1\\}",
    lines: [
      {
        id: "b0",
        latex: "\\lvert 2x + 6 \\rvert = 4",
        spoken: "the absolute value of 2 x plus 6 equals 4",
      },
      { id: "b1", latex: "2x + 6 = 4", spoken: "2 x plus 6 equals 4" },
      { id: "b2", latex: "x = -1", spoken: "x equals negative 1" },
      {
        id: "b3",
        latex: "x = -1 \\;\\text{ or }\\; x = 1",
        spoken: "x equals negative 1 or x equals 1",
        wrong: true,
      },
    ],
    corrections: [
      {
        id: "b-fix",
        latex: "2x + 6 = -4",
        spoken: "2 x plus 6 equals negative 4",
        correct: true,
      },
      {
        id: "b-inside",
        latex: "2x - 6 = 4",
        spoken: "2 x minus 6 equals 4",
        miss: (
          <>
            This flips the sign of the <InlineMath latex="6" /> instead of the sign of the
            right-hand side. The bars leave the sign of the WHOLE quantity{" "}
            <InlineMath latex="2x + 6" /> free, not the sign of one term inside it, so
            nothing inside the bars changes when the second branch is written.
          </>
        ),
      },
      {
        id: "b-solved",
        latex: "x = -5",
        spoken: "x equals negative 5",
        miss: (
          <>
            That is the value the missing branch produces, so it belongs after the branch
            rather than instead of it. The line the work is short of is the equation, and
            this is its answer.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        The last line invents a second solution by flipping the sign of the first. The bars
        said <InlineMath latex="2x + 6" /> can be <InlineMath latex="4" /> or{" "}
        <InlineMath latex="-4" />, and the work only ever used <InlineMath latex="4" />.
      </>
    ),
    remedy: (
      <>
        The branch that is missing is <InlineMath latex="2x + 6 = -4" />, giving{" "}
        <InlineMath latex="2x = -10" /> and then <InlineMath latex="x = -5" />. Both
        solutions turn out negative here, which is the plainest sign that a plus-and-minus
        pair was never the rule.
      </>
    ),
  },
];

export function AbsBranchSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Goal: find the first line that does not follow, and put the branch that should
          have been written there in its place, so the pair of branches accounts for both
          signs the bars allow.
        </>
      }
      heading={
        <>
          Somebody solved <InlineMath latex={board.given} /> and reached{" "}
          <InlineMath latex={board.claimed} />, and only one of those two values survives a
          check.
        </>
      }
      lines={board.lines}
      corrections={board.corrections}
      diagnosis={board.diagnosis}
      remedy={board.remedy}
      findPrompt="Tap the first line that does not follow from the line above it."
      fixPrompt="Tap the line that should have been written instead."
      conclusion={
        <>
          With the second branch written properly the answer is{" "}
          <InlineMath latex={board.answer} />. The two solutions are mirror images of the
          quantity inside the bars and not of the variable, which is what the coefficient in
          there changes.
        </>
      }
      ariaLabel={`A worked solution to ${board.spokenGiven} with one line that does not follow`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Try a different piece of work"
    />
  );
}
