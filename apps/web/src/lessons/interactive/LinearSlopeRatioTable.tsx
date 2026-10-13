/**
 * LF.1 interactive (slide 0): slope is a CONSTANT rate of change, filled in row by row.
 *
 * Two tables of ordered pairs share one column of ratios. Table A gives the same ratio for
 * every consecutive pair, so a single number describes it; table B never settles, which is
 * the whole reason "constant" is worth saying out loud. Both tables have to be finished, so
 * nobody concludes "the ratio is always the same" from the one table that cooperates.
 *
 * A table is the shape this argument already has, and filling it is what makes the constancy
 * a finding rather than an announcement: the row above stays on screen while the next one is
 * worked, so a learner watches the ratio repeat in one table and move in the other. Revealing
 * the same rows for them, which is what this slide used to do, asked no question at all.
 *
 * The chips include the change in $y$ on its own and the ratio upside down, because reading
 * the rise as the rate and dividing the wrong way round are the two mistakes available here.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
  /** Table A's one ratio, and the three table B never settles on. */
  steady: string;
  moving: string;
}

/** Neither board's points are the CFU's $(-3, 7)$ and $(5, 3)$. */
const BOARDS: readonly Board[] = [
  {
    steady: "3",
    moving: "1, \\; 2, \\; 4",
    rows: [
      {
        id: "b0-a1",
        fixed: ["A", "(1, 2) \\to (3, 8)"],
        value: "3",
        blank: false,
        spoken: "table A, from 1 comma 2 to 3 comma 8",
      },
      {
        id: "b0-a2",
        fixed: ["A", "(3, 8) \\to (5, 14)"],
        value: "3",
        blank: true,
        spoken: "table A, from 3 comma 8 to 5 comma 14",
        why: (
          <>
            <InlineMath latex="y" /> climbs from <InlineMath latex="8" /> to{" "}
            <InlineMath latex="14" />, a change of <InlineMath latex="6" />, while{" "}
            <InlineMath latex="x" /> steps by <InlineMath latex="2" />. That is{" "}
            <InlineMath latex="\tfrac{6}{2} = 3" />, the same ratio as the row above, which
            is what a constant rate looks like.
          </>
        ),
      },
      {
        id: "b0-a3",
        fixed: ["A", "(5, 14) \\to (7, 20)"],
        value: "3",
        blank: true,
        spoken: "table A, from 5 comma 14 to 7 comma 20",
        why: (
          <>
            <InlineMath latex="\tfrac{20 - 14}{7 - 5} = \tfrac{6}{2} = 3" /> again. Every
            pair in this table gives <InlineMath latex="3" />, so one number describes the
            whole line rather than one stretch of it.
          </>
        ),
      },
      {
        id: "b0-b1",
        fixed: ["B", "(0, 1) \\to (2, 3)"],
        value: "1",
        blank: false,
        spoken: "table B, from 0 comma 1 to 2 comma 3",
      },
      {
        id: "b0-b2",
        fixed: ["B", "(2, 3) \\to (4, 7)"],
        value: "2",
        blank: true,
        spoken: "table B, from 2 comma 3 to 4 comma 7",
        why: (
          <>
            <InlineMath latex="\tfrac{7 - 3}{4 - 2} = \tfrac{4}{2} = 2" />, and the row
            above it gave <InlineMath latex="1" />. The <InlineMath latex="x" /> steps are
            still even, so it is the <InlineMath latex="y" /> steps that have changed size.
          </>
        ),
      },
      {
        id: "b0-b3",
        fixed: ["B", "(4, 7) \\to (6, 15)"],
        value: "4",
        blank: true,
        spoken: "table B, from 4 comma 7 to 6 comma 15",
        why: (
          <>
            <InlineMath latex="\tfrac{15 - 7}{6 - 4} = \tfrac{8}{2} = 4" />. Three pairs,
            three different ratios, so no single number is the rate here and these points do
            not lie on a line.
          </>
        ),
      },
    ],
    options: [
      { id: "one", latex: "1", spoken: "1" },
      { id: "two", latex: "2", spoken: "2" },
      { id: "three", latex: "3", spoken: "3" },
      { id: "four", latex: "4", spoken: "4" },
      { id: "six", latex: "6", spoken: "6" },
      { id: "third", latex: "\\tfrac{1}{3}", spoken: "one third" },
    ],
  },
  {
    steady: "-2",
    moving: "3, \\; 5, \\; 7",
    rows: [
      {
        id: "b1-a1",
        fixed: ["A", "(2, 1) \\to (5, -5)"],
        value: "-2",
        blank: false,
        spoken: "table A, from 2 comma 1 to 5 comma negative 5",
      },
      {
        id: "b1-a2",
        fixed: ["A", "(5, -5) \\to (8, -11)"],
        value: "-2",
        blank: true,
        spoken: "table A, from 5 comma negative 5 to 8 comma negative 11",
        why: (
          <>
            <InlineMath latex="y" /> falls by <InlineMath latex="6" /> while{" "}
            <InlineMath latex="x" /> steps forward by <InlineMath latex="3" />, so the ratio
            is <InlineMath latex="\tfrac{-6}{3} = -2" />. A fall makes the rate negative; it
            does not make it any less constant.
          </>
        ),
      },
      {
        id: "b1-a3",
        fixed: ["A", "(8, -11) \\to (11, -17)"],
        value: "-2",
        blank: true,
        spoken: "table A, from 8 comma negative 11 to 11 comma negative 17",
        why: (
          <>
            <InlineMath latex="\tfrac{-17 - (-11)}{11 - 8} = \tfrac{-6}{3} = -2" />, the
            same as both rows above. Subtracting a negative is what keeps the numerator{" "}
            <InlineMath latex="-6" /> rather than <InlineMath latex="-28" />.
          </>
        ),
      },
      {
        id: "b1-b1",
        fixed: ["B", "(1, 1) \\to (2, 4)"],
        value: "3",
        blank: false,
        spoken: "table B, from 1 comma 1 to 2 comma 4",
      },
      {
        id: "b1-b2",
        fixed: ["B", "(2, 4) \\to (3, 9)"],
        value: "5",
        blank: true,
        spoken: "table B, from 2 comma 4 to 3 comma 9",
        why: (
          <>
            <InlineMath latex="\tfrac{9 - 4}{3 - 2} = 5" />, where the row above gave{" "}
            <InlineMath latex="3" />. The inputs step by <InlineMath latex="1" />{" "}
            throughout, so the ratio is just the change in <InlineMath latex="y" /> here,
            and it is growing.
          </>
        ),
      },
      {
        id: "b1-b3",
        fixed: ["B", "(3, 9) \\to (4, 16)"],
        value: "7",
        blank: true,
        spoken: "table B, from 3 comma 9 to 4 comma 16",
        why: (
          <>
            <InlineMath latex="\tfrac{16 - 9}{4 - 3} = 7" />. The ratios run{" "}
            <InlineMath latex="3, \; 5, \; 7" />, so this table has no single rate of change
            at all.
          </>
        ),
      },
    ],
    options: [
      { id: "minus-two", latex: "-2", spoken: "negative 2" },
      { id: "two", latex: "2", spoken: "2" },
      { id: "three", latex: "3", spoken: "3" },
      { id: "five", latex: "5", spoken: "5" },
      { id: "seven", latex: "7", spoken: "7" },
      { id: "minus-six", latex: "-6", spoken: "negative 6" },
    ],
  },
];

export function LinearSlopeRatioTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      headings={["table", "consecutive points", "change in y over change in x"]}
      rows={board.rows}
      options={board.options}
      objective="Goal: finish the ratio column in both tables, until it says which of the two sets of points lies on a line and which does not."
      prompt="Work out the change in y over the change in x for each pair of points, one row at a time."
      conclusion={
        <>
          Table A gives <InlineMath latex={board.steady} /> for every pair, so one number is
          its rate of change and its points lie on a line. Table B gives{" "}
          <InlineMath latex={board.moving} />, so there is no single rate to name. Constant
          is the word that separates them.
        </>
      }
      ariaLabel="Two tables of points, one with a constant ratio of the change in y to the change in x and one without"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with two different tables"
    />
  );
}
