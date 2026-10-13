/**
 * TRG.8 slide 2: the roster that stopped after one answer, met already made.
 *
 * This is the node's signature defect and it is the reason the roster comparator separates
 * `incomplete_solution_set` from `value_mismatch` at all. It survives being told about it,
 * because nothing in the work looks wrong: every line before the last is a correct line, the
 * heading the work lands on IS a solution, and a learner checking their own working reads four
 * true statements and finds nothing. What is missing is a line that was never written.
 *
 * Both boards carry the same defect with a different function and a different sign, because
 * the class is what the slide is about. The replacements on offer are all rosters somebody
 * would plausibly write: one with a heading from the quadrant next door, and one with the
 * reference angle itself left in beside the answer, which is the wrong-quadrant failure the
 * checker reports as `value_mismatch` rather than as an incomplete set.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type Correction, SpotTheError, type WorkedLine } from "./kinds/SpotTheError";

interface Board {
  heading: ReactNode;
  lines: readonly WorkedLine[];
  corrections: readonly Correction[];
  diagnosis: ReactNode;
  remedy: ReactNode;
  conclusion: ReactNode;
  ariaLabel: string;
}

const BOARDS: readonly Board[] = [
  {
    heading: (
      <>
        Somebody solved <InlineMath latex="\sin x = -\dfrac{\sqrt{2}}{2}" /> over{" "}
        <InlineMath latex="0^{\circ} \le x < 360^{\circ}" /> and handed in this.
      </>
    ),
    lines: [
      {
        id: "a1",
        latex: "\\sin x = -\\dfrac{\\sqrt{2}}{2}",
        spoken: "sine x equals negative root 2 over 2",
        fine: "That is the equation as it was given, copied down unchanged. Read on.",
      },
      {
        id: "a2",
        latex:
          "\\text{size} = \\dfrac{\\sqrt{2}}{2} \\Rightarrow \\text{reference angle} = 45^{\\circ}",
        spoken: "the size is root 2 over 2, so the reference angle is 45 degrees",
        fine: "Setting the sign aside and matching the size is exactly how a reference angle is found, and 45 degrees is the right one. Read on.",
      },
      {
        id: "a3",
        latex: "\\sin x < 0 \\;\\text{in Quadrants III and IV}",
        spoken: "sine is negative in Quadrants 3 and 4",
        fine: "True, and stated as TWO quadrants rather than one. Read on, and notice what the work does with them.",
      },
      {
        id: "a4",
        latex: "x = 225^{\\circ}",
        spoken: "x equals 225 degrees",
        wrong: true,
      },
    ],
    corrections: [
      {
        id: "a-fix-pair",
        latex: "x \\in \\{225^{\\circ},\\; 315^{\\circ}\\}",
        spoken: "x is in the set 225 degrees and 315 degrees",
        correct: true,
      },
      {
        id: "a-fix-wrong-quadrant",
        latex: "x \\in \\{225^{\\circ},\\; 135^{\\circ}\\}",
        spoken: "x is in the set 225 degrees and 135 degrees",
        miss: (
          <>
            Two headings, which is the right count, but <InlineMath latex="135^{\circ}" />{" "}
            is in the second quadrant, where a sine is POSITIVE. The line above named the
            third and fourth quadrants and this roster takes one from each side of the top
            instead.
          </>
        ),
      },
      {
        id: "a-fix-reference",
        latex: "x \\in \\{45^{\\circ},\\; 225^{\\circ}\\}",
        spoken: "x is in the set 45 degrees and 225 degrees",
        miss: (
          <>
            The reference angle has been left in the answer beside the heading it produced.{" "}
            <InlineMath latex="45^{\circ}" /> is where the sine is{" "}
            <InlineMath latex="+\dfrac{\sqrt{2}}{2}" />, so it is a tool for finding the
            answer rather than a member of it.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        The line above says the sine is negative in TWO quadrants, and this line answers
        with one heading. Nothing written down is false: the work simply stopped once it had
        found an answer, rather than once it had found them all.
      </>
    ),
    remedy: (
      <>
        The fourth-quadrant placement is the one that was never written:{" "}
        <InlineMath latex="360^{\circ} - 45^{\circ} = 315^{\circ}" />. Both headings sit
        inside the window, so the answer is{" "}
        <InlineMath latex="\{225^{\circ},\; 315^{\circ}\}" />.
      </>
    ),
    conclusion: (
      <>
        Found and fixed. A quadrant named and not used is the tell: whenever the reasoning
        offers two places for the reference angle, the answer owes a heading from each of
        them.
      </>
    ),
    ariaLabel:
      "Four lines of work solving a negative sine equation over one revolution, one of which does not follow",
  },
  {
    heading: (
      <>
        Somebody solved <InlineMath latex="\cos x = -\dfrac{\sqrt{3}}{2}" /> over{" "}
        <InlineMath latex="0^{\circ} \le x < 360^{\circ}" /> and handed in this.
      </>
    ),
    lines: [
      {
        id: "b1",
        latex: "\\cos x = -\\dfrac{\\sqrt{3}}{2}",
        spoken: "cosine x equals negative root 3 over 2",
        fine: "That is the equation as it was given, copied down unchanged. Read on.",
      },
      {
        id: "b2",
        latex:
          "\\text{size} = \\dfrac{\\sqrt{3}}{2} \\Rightarrow \\text{reference angle} = 30^{\\circ}",
        spoken: "the size is root 3 over 2, so the reference angle is 30 degrees",
        fine: (
          <>
            The cosine of <InlineMath latex="30^{\circ}" /> really is{" "}
            <InlineMath latex="\dfrac{\sqrt{3}}{2}" />, so the size has been matched
            correctly. Read on.
          </>
        ),
      },
      {
        id: "b3",
        latex: "\\cos x < 0 \\;\\text{in Quadrants II and III}",
        spoken: "cosine is negative in Quadrants 2 and 3",
        fine: "True, and both quadrants are named. Read on, and watch what happens to them.",
      },
      {
        id: "b4",
        latex: "x = 150^{\\circ}",
        spoken: "x equals 150 degrees",
        wrong: true,
      },
    ],
    corrections: [
      {
        id: "b-fix-mirror",
        latex: "x \\in \\{150^{\\circ},\\; 330^{\\circ}\\}",
        spoken: "x is in the set 150 degrees and 330 degrees",
        miss: (
          <>
            Two headings, and the second one is in the fourth quadrant, where a cosine is
            positive. The reference angle has been mirrored across the horizontal axis, and
            that reflection leaves a COSINE exactly where it was: it negates the vertical
            coordinate, so the SINE is the reading whose sign changes.{" "}
            <InlineMath latex="\cos 330^{\circ}" /> is the same{" "}
            <InlineMath latex="+\dfrac{\sqrt{3}}{2}" /> as{" "}
            <InlineMath latex="\cos 30^{\circ}" />. A cosine's sign is settled by which side
            of the VERTICAL axis the heading lands on, and both of those sit on the same
            side of it.
          </>
        ),
      },
      {
        id: "b-fix-pair",
        latex: "x \\in \\{150^{\\circ},\\; 210^{\\circ}\\}",
        spoken: "x is in the set 150 degrees and 210 degrees",
        correct: true,
      },
      {
        id: "b-fix-reference",
        latex: "x \\in \\{30^{\\circ},\\; 150^{\\circ}\\}",
        spoken: "x is in the set 30 degrees and 150 degrees",
        miss: (
          <>
            <InlineMath latex="30^{\circ}" /> is the reference angle, and it is in the first
            quadrant, where a cosine is positive. It was the route to the answer rather than
            a part of it.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        Two quadrants are named on the line above and only one of them reaches the answer.
        The heading given is genuinely a solution, which is exactly why the mistake is easy
        to read past: the roster is incomplete rather than wrong.
      </>
    ),
    remedy: (
      <>
        The third-quadrant placement is missing:{" "}
        <InlineMath latex="180^{\circ} + 30^{\circ} = 210^{\circ}" />. Both headings are
        inside one revolution, so the answer is{" "}
        <InlineMath latex="\{150^{\circ},\; 210^{\circ}\}" />.
      </>
    ),
    conclusion: (
      <>
        Found and fixed. Solving over an interval asks for every heading that fits, so a
        single heading is an unfinished answer even when the heading itself is correct.
      </>
    ),
    ariaLabel:
      "Four lines of work solving a negative cosine equation over one revolution, one of which does not follow",
  },
];

export function TrigRosterSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Goal: find the one line in this work that does not follow from the line above it,
          then say what that line should have said.
        </>
      }
      heading={board.heading}
      lines={board.lines}
      corrections={board.corrections}
      diagnosis={board.diagnosis}
      remedy={board.remedy}
      findPrompt="Read down the work until a line stops following, then flag that line."
      fixPrompt="Now choose what the flagged line should have said."
      conclusion={board.conclusion}
      ariaLabel={board.ariaLabel}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Try another piece of work"
    />
  );
}
