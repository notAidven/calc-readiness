/**
 * POL.5 slide 0: does this parabola have a lowest point or a highest one?
 *
 * Every parabola has exactly one turning point and the sign of the squared term's coefficient
 * decides which kind it is, so the reading is one glance once a learner knows where to look.
 * What makes it worth a board rather than a sentence is that the coefficient is not always the
 * number in front: two rows here hide the sign somewhere other than position zero, which is
 * where a learner who has learned "read the first number" gets it wrong while getting the plain
 * rows right. That is a diagnosis the board hands back row by row.
 *
 * The constant term is drawn both ways on both boards and it decides nothing here, which is the
 * same separation `EndBehaviorParitySorter` makes on POL.6: sliding a parabola up or down moves
 * the turning point without turning it over.
 *
 * Built on `BinaryRowSort`, which owns the mechanic, the marks on a settled row and the board's
 * one reveal. Row 0 answers with the first option and row 1 with the second, which is that
 * file's contract on its adopters. Below row 1 the calls deliberately stop alternating, so no
 * walk down one column and up the other clears a board.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

/** The two calls on offer under every row, in the order they are drawn. */
const CALLS = ["Lowest point", "Highest point"] as const;

/** One row's content, before the shared reasoning is wrapped around it. */
interface Row {
  id: string;
  latex: string;
  spoken: string;
  /** True when the coefficient of the squared term is positive, which is the whole call. */
  opensUp: boolean;
  /** Where the deciding sign is, when it is not the number written first. */
  note?: string;
}

const BOARDS: readonly (readonly Row[])[] = [
  [
    {
      id: "b0-plain-up",
      latex: "f(x) = 3x^{2} - 12x + 7",
      spoken: "f of x equals 3 x squared minus 12 x plus 7",
      opensUp: true,
    },
    {
      id: "b0-plain-down",
      latex: "f(x) = -2x^{2} + 8x - 1",
      spoken: "f of x equals negative 2 x squared plus 8 x minus 1",
      opensUp: false,
    },
    {
      id: "b0-vertex-down",
      latex: "f(x) = -\\left(x - 5\\right)^{2} + 9",
      spoken: "f of x equals minus, x minus 5, squared, plus 9",
      opensUp: false,
      note: "The minus sign is outside the bracket, so it multiplies the whole square.",
    },
    {
      id: "b0-jumbled-up",
      latex: "f(x) = 6 - 5x + 4x^{2}",
      spoken: "f of x equals 6 minus 5 x plus 4 x squared",
      opensUp: true,
      note: "The squared term is written last here, so the first number on the page is not its coefficient.",
    },
  ],
  [
    {
      id: "b1-vertex-up",
      latex: "f(x) = 2\\left(x + 3\\right)^{2} - 8",
      spoken: "f of x equals 2 times, x plus 3, squared, minus 8",
      opensUp: true,
    },
    {
      id: "b1-plain-down",
      latex: "f(x) = -7x^{2} - 2x + 11",
      spoken: "f of x equals negative 7 x squared minus 2 x plus 11",
      opensUp: false,
    },
    {
      id: "b1-jumbled-down",
      latex: "f(x) = 10 + 3x - x^{2}",
      spoken: "f of x equals 10 plus 3 x minus x squared",
      opensUp: false,
      note: "The squared term is written last and its coefficient is a bare minus sign, so it is negative one.",
    },
    {
      id: "b1-plain-up",
      latex: "f(x) = x^{2} + 14x + 40",
      spoken: "f of x equals x squared plus 14 x plus 40",
      opensUp: true,
    },
    // Rows two and three do not continue the alternation: see the docblock.
  ],
];

/** Wrap one row's content in the reasoning that is the same on every row of every board. */
function toBinaryRow(row: Row): BinaryRow {
  return {
    id: row.id,
    latex: row.latex,
    spoken: row.spoken,
    first: row.opensUp,
    note: row.opensUp
      ? "The squared term has a positive coefficient, so the arms rise on both sides and the turning point is the lowest place on the graph."
      : "The squared term has a negative coefficient, so the arms fall on both sides and the turning point is the highest place on the graph.",
    why: (
      <>
        {row.note ? `${row.note} ` : ""}Look only at the coefficient of{" "}
        <InlineMath latex="x^{2}" />, which is{" "}
        <InlineMath latex={row.opensUp ? "\\text{positive}" : "\\text{negative}"} /> here.
        Far from the turning point the squared term is much larger than everything else, so
        it decides where both arms go, and{" "}
        {row.opensUp ? (
          <>
            a positive coefficient sends them both up. A curve that goes up on both sides
            has to come back down to meet in the middle, so the turning point is the lowest
            point and the value there is a minimum.
          </>
        ) : (
          <>
            a negative coefficient sends them both down. A curve that goes down on both
            sides has to come up to meet in the middle, so the turning point is the highest
            point and the value there is a maximum.
          </>
        )}{" "}
        Nothing else in the rule enters this call: the constant slides the whole curve up or
        down without turning it over.
      </>
    ),
  };
}

export function ParabolaOpeningSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rows = (BOARDS[variant.index] ?? (BOARDS[0] as readonly Row[])).map(toBinaryRow);

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective="Decide for each of these four rules whether its turning point is the lowest point on the graph or the highest."
      options={CALLS}
      rows={rows}
      prompt="Find the coefficient of the squared term, sign included, then say which kind of turning point that forces."
      conclusion="One coefficient decides it every time: positive and the arms rise, so the turning point is a lowest point and its height is a minimum; negative and the arms fall, so it is a highest point and a maximum. Two of these four wrote the squared term somewhere other than first, and reading position rather than power is the only way to miss them."
      missedNote="That is all four called, so you are good to carry on. Every row you missed says why just underneath it, and the working is there if you want it."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="New set of four rules"
      missedRestartLabel="Try a fresh set"
    />
  );
}
