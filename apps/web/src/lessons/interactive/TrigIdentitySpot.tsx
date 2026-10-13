/**
 * TRG.4 slide 3: the two ways a piece of identity work goes wrong, met already made.
 *
 * Both boards are misconceptions that survive being told about them, which is what this kind
 * is for. The first is the one the slide warns about in words and learners do anyway: the
 * Pythagorean identity fixes the SIZE of a reading and says nothing about its sign, so a
 * square root taken without consulting the quadrant is right half the time and never knows
 * which half. The second is the quotient identity used in the wrong direction, where every
 * line is a real identity and the work still lands on the tangent where the cotangent was
 * asked for.
 *
 * The replacements on offer are all things the work could plausibly have said. On the first
 * board $\pm\dfrac{4}{5}$ is the answer of a learner who knows a root has two candidates and
 * has not noticed the quadrant already chose, and $\dfrac{16}{25}$ is the same work with the
 * root not taken at all; on the second, $\dfrac{17}{8}$ is a reciprocal of the right shape
 * belonging to the wrong function.
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
        A reading came in as <InlineMath latex="\sin\theta = \dfrac{3}{5}" /> with{" "}
        <InlineMath latex="\theta" /> in the second quadrant, and somebody recovered the
        cosine from it like this.
      </>
    ),
    lines: [
      {
        id: "a1",
        latex: "\\sin^{2}\\theta + \\cos^{2}\\theta = 1",
        spoken: "sine squared plus cosine squared equals one",
        fine: "That is the Pythagorean identity, and it holds at every heading, so starting from it is fair. Read on.",
      },
      {
        id: "a2",
        latex: "\\left(\\dfrac{3}{5}\\right)^{2} + \\cos^{2}\\theta = 1",
        spoken: "three fifths squared plus cosine squared equals one",
        fine: "Only the reading has been substituted in here, and nothing has been claimed about the cosine yet. Read on.",
      },
      {
        id: "a3",
        latex: "\\cos^{2}\\theta = 1 - \\dfrac{9}{25} = \\dfrac{16}{25}",
        spoken:
          "cosine squared equals one minus nine twenty-fifths, which is sixteen twenty-fifths",
        fine: "The arithmetic is right, and this line is still about the SQUARE of the cosine rather than the cosine. Read on.",
      },
      {
        id: "a4",
        latex: "\\cos\\theta = \\dfrac{4}{5}",
        spoken: "cosine equals four fifths",
        wrong: true,
      },
    ],
    corrections: [
      {
        id: "a-fix-both",
        latex: "\\cos\\theta = \\pm\\dfrac{4}{5}",
        spoken: "cosine equals plus or minus four fifths",
        miss: (
          <>
            Both candidates, and the question already told you which one. The quadrant is
            information, so carrying <InlineMath latex="\pm" /> forward leaves the work
            unfinished rather than careful.
          </>
        ),
      },
      {
        id: "a-fix-neg",
        latex: "\\cos\\theta = -\\dfrac{4}{5}",
        spoken: "cosine equals negative four fifths",
        correct: true,
      },
      {
        id: "a-fix-square",
        latex: "\\cos\\theta = \\dfrac{16}{25}",
        spoken: "cosine equals sixteen twenty-fifths",
        miss: (
          <>
            That is the value of <InlineMath latex="\cos^{2}\theta" />, copied down with the
            square quietly dropped from the left-hand side. It is a legal size for a cosine,
            so nothing about the number itself gives the slip away: the root has simply not
            been taken.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        A square root offers two candidates and this line kept only the positive one. The
        Pythagorean identity fixes the SIZE of the cosine and says nothing whatever about
        its sign.
      </>
    ),
    remedy: (
      <>
        In the second quadrant the horizontal coordinate is negative, and the cosine is the
        horizontal coordinate, so <InlineMath latex="\cos\theta = -\dfrac{4}{5}" />. The
        identity supplies the size and the quadrant supplies the sign, and a piece of work
        that uses only the first of those is right half the time by accident.
      </>
    ),
    conclusion: (
      <>
        Found and fixed. Two things are needed to pin a reading down and this work only had
        one of them: the identity says how big, and the quadrant says which way.
      </>
    ),
    ariaLabel:
      "Four lines of work recovering a cosine from a sine reading, one of which does not follow",
  },
  {
    heading: (
      <>
        Two readings came in as <InlineMath latex="\sin\theta = \dfrac{8}{17}" /> and{" "}
        <InlineMath latex="\cos\theta = \dfrac{15}{17}" />, and somebody worked out the
        cotangent like this.
      </>
    ),
    lines: [
      {
        id: "b1",
        latex: "\\cot\\theta = \\dfrac{1}{\\tan\\theta}",
        spoken: "cotangent equals one over tangent",
        fine: "That is a reciprocal identity and it is true, so the plan this work is following is a sound one. Read on.",
      },
      {
        id: "b2",
        latex: "\\tan\\theta = \\dfrac{\\sin\\theta}{\\cos\\theta}",
        spoken: "tangent equals sine over cosine",
        fine: "That is the quotient identity, written the right way up. Read on.",
      },
      {
        id: "b3",
        latex: "\\tan\\theta = \\dfrac{8}{17} \\div \\dfrac{15}{17} = \\dfrac{8}{15}",
        spoken:
          "tangent equals eight seventeenths divided by fifteen seventeenths, which is eight fifteenths",
        fine: (
          <>
            The shared denominator cancels and the tangent really is{" "}
            <InlineMath latex="\dfrac{8}{15}" />. Read on.
          </>
        ),
      },
      {
        id: "b4",
        latex: "\\cot\\theta = \\dfrac{8}{15}",
        spoken: "cotangent equals eight fifteenths",
        wrong: true,
      },
    ],
    corrections: [
      {
        id: "b-fix-csc",
        latex: "\\cot\\theta = \\dfrac{17}{8}",
        spoken: "cotangent equals seventeen eighths",
        miss: (
          <>
            A reciprocal of the right shape belonging to the wrong function: turning the
            SINE over gives <InlineMath latex="\dfrac{17}{8}" />, and that is the cosecant.
            The line above is about the tangent, so the tangent is what has to be turned
            over.
          </>
        ),
      },
      {
        id: "b-fix-neg",
        latex: "\\cot\\theta = -\\dfrac{15}{8}",
        spoken: "cotangent equals negative fifteen eighths",
        miss: (
          <>
            Nothing in this work asked for a sign change. Both readings are positive and no
            heading was reversed, so the only thing the last line owes is the turn.
          </>
        ),
      },
      {
        id: "b-fix-recip",
        latex: "\\cot\\theta = \\dfrac{15}{8}",
        spoken: "cotangent equals fifteen eighths",
        correct: true,
      },
    ],
    diagnosis: (
      <>
        Every line above is a genuine identity, and then the last one copies the tangent
        across instead of turning it over. The work reached the tangent and stopped one move
        early.
      </>
    ),
    remedy: (
      <>
        Turning <InlineMath latex="\dfrac{8}{15}" /> over gives{" "}
        <InlineMath latex="\dfrac{15}{8}" />, which is what dividing the cosine by the sine
        would have given straight away:{" "}
        <InlineMath latex="\dfrac{15}{17} \div \dfrac{8}{17} = \dfrac{15}{8}" />.
      </>
    ),
    conclusion: (
      <>
        Found and fixed. The order of a division is part of the recipe, so a cotangent is
        never a tangent copied across, however many correct identities got the work to it.
      </>
    ),
    ariaLabel:
      "Four lines of work computing a cotangent from two readings, one of which does not follow",
  },
];

export function TrigIdentitySpot(props: LessonWidgetProps) {
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
