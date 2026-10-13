/**
 * POL.7 slide 1: at this zero, does the graph go through the axis or come back off it?
 *
 * Two polynomials can have exactly the same zeros and different graphs, and multiplicity is the
 * whole of the difference. The call is decided by one thing only, the PARITY of the exponent on
 * that factor, which is why this is worth being a question: a learner who reads "a bigger
 * exponent means it flattens and turns" gets every odd multiplicity above one wrong, and a
 * cubed factor is on both boards for exactly that reason. It does flatten, and it still goes
 * through.
 *
 * Each row names one factor of a stated polynomial rather than a bare power, so the exponent has
 * to be found on the right bracket. The other brackets on the row carry their own exponents, and
 * they say nothing about the zero being asked about.
 *
 * Built on `BinaryRowSort`, which owns the mechanic, the marks on a settled row and the board's
 * one reveal. Row 0 answers with the first option and row 1 with the second, which is that
 * file's contract on its adopters.
 *
 * **The calls do not alternate below row 1, and that is deliberate.** Both boards answer cross,
 * turn, turn, cross, so no walk down one column and up the other clears a board. An alternating
 * board is one a learner can pass in a rhythm, which is the same anti-brute-force rule as
 * dealing options in a derangement; measured, `widgetRevealReAsk.browser.test.tsx` walks the
 * chips from the last backwards and cleared an alternating version of this board without ever
 * needing the reveal.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

/** The two calls on offer under every row, in the order they are drawn. */
const CALLS = ["Crosses straight through", "Turns back off the axis"] as const;

interface Row {
  id: string;
  /** The polynomial, and the zero being asked about. */
  polynomial: string;
  zero: string;
  spoken: string;
  /** The exponent on the factor belonging to that zero. */
  multiplicity: number;
}

const BOARDS: readonly (readonly Row[])[] = [
  [
    {
      id: "b0-odd-1",
      polynomial: "(x - 2)(x + 3)^{2}",
      zero: "x = 2",
      spoken: "x minus 2, times x plus 3 squared, at x equals 2",
      multiplicity: 1,
    },
    {
      id: "b0-even-2",
      polynomial: "(x - 2)(x + 3)^{2}",
      zero: "x = -3",
      spoken: "x minus 2, times x plus 3 squared, at x equals negative 3",
      multiplicity: 2,
    },
    {
      id: "b0-even-4",
      polynomial: "(x - 5)^{3}(x + 1)^{4}",
      zero: "x = -1",
      spoken: "x minus 5 cubed, times x plus 1 to the fourth, at x equals negative 1",
      multiplicity: 4,
    },
    {
      id: "b0-odd-3",
      polynomial: "(x - 5)^{3}(x + 1)^{4}",
      zero: "x = 5",
      spoken: "x minus 5 cubed, times x plus 1 to the fourth, at x equals 5",
      multiplicity: 3,
    },
  ],
  [
    {
      id: "b1-odd-3",
      polynomial: "(x + 4)^{3}(x - 1)^{2}",
      zero: "x = -4",
      spoken: "x plus 4 cubed, times x minus 1 squared, at x equals negative 4",
      multiplicity: 3,
    },
    {
      id: "b1-even-2",
      polynomial: "(x + 4)^{3}(x - 1)^{2}",
      zero: "x = 1",
      spoken: "x plus 4 cubed, times x minus 1 squared, at x equals 1",
      multiplicity: 2,
    },
    {
      id: "b1-even-4",
      polynomial: "(x - 3)^{4}(x + 2)",
      zero: "x = 3",
      spoken: "x minus 3 to the fourth, times x plus 2, at x equals 3",
      multiplicity: 4,
    },
    {
      id: "b1-odd-1",
      polynomial: "(x - 3)^{4}(x + 2)",
      zero: "x = -2",
      spoken: "x minus 3 to the fourth, times x plus 2, at x equals negative 2",
      multiplicity: 1,
    },
    // Board one already reads cross, turn, turn, cross without reordering: its two even
    // multiplicities sit in the middle.
  ],
];

/** Wrap one row's content in the reasoning that is the same on every row of every board. */
function toBinaryRow(row: Row): BinaryRow {
  const odd = row.multiplicity % 2 === 1;
  return {
    id: row.id,
    // Written as parts so the polynomial and the zero can wrap apart on a narrow board.
    latex: [row.polynomial, `\\text{at }${row.zero}`],
    spoken: row.spoken,
    first: odd,
    note: odd
      ? `That factor appears an odd number of times, so the sign of the polynomial changes there and the graph passes through.`
      : `That factor appears an even number of times, so the sign does not change there and the graph comes back off the side it arrived on.`,
    why: (
      <>
        The factor belonging to <InlineMath latex={row.zero} /> carries an exponent of{" "}
        <InlineMath latex={`${row.multiplicity}`} />, and{" "}
        {odd ? (
          <>
            an odd number of copies changes the polynomial's SIGN as the input passes the
            zero, because an odd power keeps the sign of what it is given. A sign change
            means the graph has to be on the other side of the axis afterwards, so it goes
            through.
            {row.multiplicity > 1
              ? " A higher odd exponent flattens the graph against the axis on the way, which is a different fact and not this call."
              : ""}
          </>
        ) : (
          <>
            an even number of copies leaves the polynomial's SIGN unchanged as the input
            passes the zero, because an even power discards the sign of what it is given.
            With no sign change the graph must return to the side it came from, so it turns
            back off.
          </>
        )}{" "}
        The exponents on the other brackets are about their own zeros and do not enter this
        call.
      </>
    ),
  };
}

export function MultiplicityCrossSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rows = (BOARDS[variant.index] ?? (BOARDS[0] as readonly Row[])).map(toBinaryRow);

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective="Decide for each named zero whether the graph passes through the axis there or turns back off it."
      options={CALLS}
      rows={rows}
      prompt="Find the factor belonging to the zero named, read the exponent on that factor, and call the row by whether it is odd or even."
      conclusion="An odd multiplicity changes the sign of the polynomial at the zero, so the graph has to cross; an even one does not, so it has to come back. It is the PARITY that decides it and not the size: a cubed factor flattens against the axis and still goes straight through."
      missedNote="That is all four called, so you are good to carry on. Every row you missed says why just underneath it, and the working is there if you want it."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="New set of four zeros"
      missedRestartLabel="Try a fresh set"
    />
  );
}
