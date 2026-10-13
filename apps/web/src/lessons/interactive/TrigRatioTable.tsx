/**
 * TRG.2 slide 1: the three ratios, each one built by the same move over a different pair of
 * sides.
 *
 * `FillTable` is the shape because the argument this slide makes is "the same move, applied
 * again": every row takes the two sides its middle column names, writes the first over the
 * second, and stops. The worked row is the pattern and the two blanks are what the pattern
 * forces. A widget showing one ratio at a time would hide the very thing that makes the three
 * names learnable, which is that they differ in NOTHING except which pair of sides they reach
 * for.
 *
 * **Every distractor in the tray is a reciprocal of a real answer.** That is the one mistake
 * this table is built to catch: a learner who has the pair of sides right and the order upside
 * down produces a number that looks perfectly reasonable, and no amount of re-reading the
 * definition catches it, because they believe they already applied it. Putting
 * $\dfrac{20}{16}$ on the board beside $\dfrac{16}{20}$ makes the order the thing being
 * answered rather than a detail of the notation.
 *
 * The first board's triangle is the one slide 0 named, so the learner is applying vocabulary
 * they have just placed rather than meeting three lengths cold. The second board's is a
 * triangle they have not seen, with its two legs far enough apart that the three values cannot
 * be sorted by size. Neither board is the CFU's triangle.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  /** The three lengths, from the marked corner. */
  opposite: number;
  adjacent: number;
  hypotenuse: number;
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
}

/** A chip: one value on offer, with the spoken form its accessible name needs. */
function chip(prefix: string, top: number, bottom: number) {
  return {
    id: `${prefix}-${top}-${bottom}`,
    latex: `\\dfrac{${top}}{${bottom}}`,
    spoken: `${top} over ${bottom}`,
  };
}

/**
 * One board's three rows: the sine given as the pattern, the cosine and the tangent blank.
 *
 * The sine is the row handed over because it is the ratio a learner is likeliest to half
 * remember, so giving it costs the table least and buys the clearest pattern: the middle
 * column names two sides and the last column is those two sides, in that order, over each
 * other.
 */
function rowsFor(prefix: string, opp: number, adj: number, hyp: number): TableRow[] {
  return [
    {
      id: `${prefix}-sin`,
      fixed: ["\\sin \\theta", "\\dfrac{\\text{opposite}}{\\text{hypotenuse}}"],
      value: `\\dfrac{${opp}}{${hyp}}`,
      blank: false,
      spoken: "sine of theta",
    },
    {
      id: `${prefix}-cos`,
      fixed: ["\\cos \\theta", "\\dfrac{\\text{adjacent}}{\\text{hypotenuse}}"],
      value: `\\dfrac{${adj}}{${hyp}}`,
      blank: true,
      spoken: "cosine of theta",
      why: (
        <>
          The cosine names the adjacent side first and the hypotenuse second, so the
          adjacent side goes on top: <InlineMath latex={`\\dfrac{${adj}}{${hyp}}`} />.
          Writing it the other way up gives a number bigger than <InlineMath latex="1" />,
          and no cosine of an acute angle can be, because a leg is always shorter than the
          hypotenuse.
        </>
      ),
    },
    {
      id: `${prefix}-tan`,
      fixed: ["\\tan \\theta", "\\dfrac{\\text{opposite}}{\\text{adjacent}}"],
      value: `\\dfrac{${opp}}{${adj}}`,
      blank: true,
      spoken: "tangent of theta",
      why: (
        <>
          The tangent is the only one of the three that leaves the hypotenuse out
          altogether: it compares the two legs with each other,{" "}
          <InlineMath latex={`\\dfrac{${opp}}{${adj}}`} />. Reaching for{" "}
          <InlineMath latex={`${hyp}`} /> here is reaching for a length this ratio never
          mentions.
        </>
      ),
    },
  ];
}

const BOARDS: readonly Board[] = [
  {
    opposite: 12,
    adjacent: 16,
    hypotenuse: 20,
    rows: rowsFor("b0", 12, 16, 20),
    options: [
      chip("b0", 16, 20),
      chip("b0", 12, 16),
      chip("b0", 20, 16),
      chip("b0", 16, 12),
      chip("b0", 12, 20),
      chip("b0", 20, 12),
    ],
  },
  {
    // A triangle whose two legs are far apart, so a tangent above 1 and a cosine well below
    // it cannot be told apart by size alone the way a 3-4-5 lets them be.
    opposite: 15,
    adjacent: 8,
    hypotenuse: 17,
    rows: rowsFor("b1", 15, 8, 17),
    options: [
      chip("b1", 8, 17),
      chip("b1", 15, 8),
      chip("b1", 17, 8),
      chip("b1", 8, 15),
      chip("b1", 15, 17),
      chip("b1", 17, 15),
    ],
  },
];

export function TrigRatioTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { opposite, adjacent, hypotenuse } = board;

  return (
    <FillTable
      key={variant.nonce}
      headings={["ratio", "the two sides it names", "its value here"]}
      rows={board.rows}
      options={board.options}
      objective={
        <>
          Goal: finish the last column for a triangle whose opposite side is{" "}
          <InlineMath latex={`${opposite}`} />, whose adjacent side is{" "}
          <InlineMath latex={`${adjacent}`} /> and whose hypotenuse is{" "}
          <InlineMath latex={`${hypotenuse}`} />, so the table shows all three ratios as one
          move made three times.
        </>
      }
      prompt="Read the two sides in the middle column and bring over the fraction that puts them in that order."
      conclusion={
        <>
          All three rows are the same move: take the two sides the ratio names and write the
          first one over the second. What separates a sine from a cosine from a tangent is
          only which pair they reach for, and the tangent is the one that never touches the
          hypotenuse at all.
        </>
      }
      ariaLabel={`The sine, cosine and tangent of theta in a right triangle whose opposite side is ${opposite}, adjacent side is ${adjacent} and hypotenuse is ${hypotenuse}`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different triangle"
    />
  );
}
