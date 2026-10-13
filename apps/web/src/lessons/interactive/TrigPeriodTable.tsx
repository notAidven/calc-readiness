/**
 * TRG.5 slide 1: how long one cycle takes, and where inside it the trace does each of the
 * things it does.
 *
 * `FillTable` is the shape because the argument this slide makes is "the same move, applied
 * again": every row asks how far along $x$ the inside of the function needs to run to cover
 * one whole turn, and the answer is always that turn shared out by the coefficient. The
 * worked row is the pattern and the blanks are what the pattern forces. Showing one
 * coefficient at a time would hide the only thing worth noticing here, which is that a
 * bigger coefficient makes a SHORTER cycle.
 *
 * **The two boards are two different tables on purpose**, and this is the one place this
 * node departs from the plan's one-line description of the widget. The plan asks it to fill
 * "the coefficient, the period, and the five key headings", and a `FillTable` blanks the
 * LAST column only, so it can ask for exactly one kind of value per board. Board 0 asks for
 * the period, given the coefficient; board 1 takes one period and asks where the quarter,
 * the half and the three-quarter marks of that cycle land, which is the five key headings.
 * A restart moves between them, so a learner who has done one meets the other rather than
 * the same table with different numbers.
 *
 * **The distractors are the two real mistakes.** A learner who reaches for the coefficient
 * and MULTIPLIES finds $4\pi$ and $6\pi$ waiting, and a learner who divides the turn but
 * loses the $2$ finds a fraction that looks right. Neither is caught by re-reading the rule,
 * because both feel like the rule was applied, so both are on the tray.
 *
 * `FillTable` passes its own live `othersRemain`, so a learner told one row is handed the
 * table back with every row they already filled still filled.
 *
 * **Board 0's filled column is headed "period", which it was not.** It read "how long that
 * cycle is", a paraphrase standing in the slot the term owns (R21) on the node that introduces
 * the word — TRG.5's prose uses it six times, and `TrigFeatureLabel` on the same node already
 * names "period" as a label slot, so the house style was the fix. Board 1 always did use the
 * word, which is why this was the milder half of the same defect: a learner who reached the
 * second table met the term attached to a value, and one who latched on the first did not.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  headings: readonly string[];
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
  objective: ReactNode;
  prompt: string;
  conclusion: ReactNode;
  ariaLabel: string;
  restartLabel: string;
}

const BOARDS: readonly Board[] = [
  {
    headings: ["the rule", "one cycle closes where", "period"],
    rows: [
      {
        id: "p-1",
        fixed: ["y = \\sin(x)", "x = 2\\pi"],
        value: "2\\pi",
        blank: false,
        spoken: "sine of x",
      },
      {
        id: "p-2",
        fixed: ["y = \\sin(2x)", "2x = 2\\pi"],
        value: "\\pi",
        blank: true,
        spoken: "sine of 2 x",
        why: (
          <>
            The inside has to reach <InlineMath latex="2\pi" /> for the cycle to close, and
            the inside is <InlineMath latex="2x" />, so the cycle closes at{" "}
            <InlineMath latex="x = \pi" />. Doubling the coefficient HALVES the cycle,
            because the inside gets where it is going in half the distance.
          </>
        ),
      },
      {
        id: "p-3",
        fixed: ["y = \\sin(3x)", "3x = 2\\pi"],
        value: "\\dfrac{2\\pi}{3}",
        blank: true,
        spoken: "sine of 3 x",
        why: (
          <>
            Dividing both sides of <InlineMath latex="3x = 2\pi" /> by{" "}
            <InlineMath latex="3" /> leaves <InlineMath latex="x = \dfrac{2\pi}{3}" />.
            Nothing cancels there, and it does not have to: a period is allowed to keep a{" "}
            <InlineMath latex="2" /> on top.
          </>
        ),
      },
      {
        id: "p-6",
        fixed: ["y = \\sin(6x)", "6x = 2\\pi"],
        value: "\\dfrac{\\pi}{3}",
        blank: true,
        spoken: "sine of 6 x",
        why: (
          <>
            <InlineMath latex="\dfrac{2\pi}{6}" /> is the same number as{" "}
            <InlineMath latex="\dfrac{\pi}{3}" />, and this cycle is half as long as the one
            above it, which is what happens when the coefficient doubles from{" "}
            <InlineMath latex="3" /> to <InlineMath latex="6" />.
          </>
        ),
      },
    ],
    options: [
      { id: "o-pi", latex: "\\pi", spoken: "pi" },
      { id: "o-2pi3", latex: "\\dfrac{2\\pi}{3}", spoken: "2 pi over 3" },
      { id: "o-pi3", latex: "\\dfrac{\\pi}{3}", spoken: "pi over 3" },
      { id: "o-4pi", latex: "4\\pi", spoken: "4 pi" },
      { id: "o-6pi", latex: "6\\pi", spoken: "6 pi" },
      { id: "o-pi6", latex: "\\dfrac{\\pi}{6}", spoken: "pi over 6" },
    ],
    objective: (
      <>
        Goal: finish the period column, so the table shows what the coefficient beside{" "}
        <InlineMath latex="x" /> does to the length of one cycle.
      </>
    ),
    prompt:
      "Read where the middle column says the cycle closes, then bring over the value of x that closes it.",
    conclusion: (
      <>
        Every row is the same move: the inside covers <InlineMath latex="2\pi" /> in one
        cycle, so the cycle ends where the inside equals <InlineMath latex="2\pi" />, and
        dividing by the coefficient says how far along <InlineMath latex="x" /> that is.
        That distance is the period. A bigger coefficient gives a SHORTER cycle, because the
        inside gets there sooner.
      </>
    ),
    ariaLabel:
      "A table of four sine rules, each with the coefficient beside x and the period it gives",
    restartLabel: "Start over with the headings inside one cycle",
  },
  {
    headings: ["point in the cycle", "that much of one period", "the heading it lands on"],
    rows: [
      {
        id: "k-start",
        fixed: ["\\text{the start}", "0"],
        value: "0",
        blank: false,
        spoken: "the start of the cycle",
      },
      {
        id: "k-quarter",
        fixed: ["\\text{a quarter through}", "\\dfrac{1}{4} \\times \\dfrac{\\pi}{2}"],
        value: "\\dfrac{\\pi}{8}",
        blank: true,
        spoken: "a quarter through the cycle",
        why: (
          <>
            A quarter of <InlineMath latex="\dfrac{\pi}{2}" /> is{" "}
            <InlineMath latex="\dfrac{\pi}{8}" />, because quartering a fraction multiplies
            what is underneath by <InlineMath latex="4" />. This is where the trace reaches
            its highest point, one quarter of the way into the cycle.
          </>
        ),
      },
      {
        id: "k-half",
        fixed: ["\\text{halfway}", "\\dfrac{1}{2} \\times \\dfrac{\\pi}{2}"],
        value: "\\dfrac{\\pi}{4}",
        blank: true,
        spoken: "halfway through the cycle",
        why: (
          <>
            Half of <InlineMath latex="\dfrac{\pi}{2}" /> is{" "}
            <InlineMath latex="\dfrac{\pi}{4}" />, which is where the trace is back on its
            midline and heading downward. It is exactly twice the quarter heading above it,
            which is the check worth making.
          </>
        ),
      },
      {
        id: "k-three",
        fixed: ["\\text{three quarters through}", "\\dfrac{3}{4} \\times \\dfrac{\\pi}{2}"],
        value: "\\dfrac{3\\pi}{8}",
        blank: true,
        spoken: "three quarters through the cycle",
        why: (
          <>
            Three quarters of <InlineMath latex="\dfrac{\pi}{2}" /> is three of the quarter
            steps, so it is <InlineMath latex="3" /> times{" "}
            <InlineMath latex="\dfrac{\pi}{8}" />, which is{" "}
            <InlineMath latex="\dfrac{3\pi}{8}" />. The trace is at its lowest point here.
          </>
        ),
      },
      {
        id: "k-end",
        fixed: ["\\text{the end}", "1 \\times \\dfrac{\\pi}{2}"],
        value: "\\dfrac{\\pi}{2}",
        blank: false,
        spoken: "the end of the cycle",
      },
    ],
    options: [
      { id: "k-pi8", latex: "\\dfrac{\\pi}{8}", spoken: "pi over 8" },
      { id: "k-pi4", latex: "\\dfrac{\\pi}{4}", spoken: "pi over 4" },
      { id: "k-3pi8", latex: "\\dfrac{3\\pi}{8}", spoken: "3 pi over 8" },
      { id: "k-pi16", latex: "\\dfrac{\\pi}{16}", spoken: "pi over 16" },
      { id: "k-3pi4", latex: "\\dfrac{3\\pi}{4}", spoken: "3 pi over 4" },
      { id: "k-pi6", latex: "\\dfrac{\\pi}{6}", spoken: "pi over 6" },
    ],
    objective: (
      <>
        Goal: mark the five headings that carve one cycle of{" "}
        <InlineMath latex="y = \sin(4x)" /> into quarters, so the trace can be drawn from
        five points rather than sketched.
      </>
    ),
    prompt:
      "Work out the fraction of a period the middle column names, then bring over the heading it lands on.",
    conclusion: (
      <>
        One cycle of <InlineMath latex="y = \sin(4x)" /> runs from <InlineMath latex="0" />{" "}
        to <InlineMath latex="\dfrac{\pi}{2}" />, and its quarter marks are evenly spaced
        across that. Those five headings are where the trace is on its midline, at its
        highest, back on the midline, at its lowest, and back at the start.
      </>
    ),
    ariaLabel:
      "A table of the five headings that carve one cycle of sine of 4 x into quarters",
    restartLabel: "Start over with the periods table",
  },
];

export function TrigPeriodTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      headings={board.headings}
      rows={board.rows}
      options={board.options}
      objective={board.objective}
      prompt={board.prompt}
      conclusion={board.conclusion}
      ariaLabel={board.ariaLabel}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel={board.restartLabel}
    />
  );
}
