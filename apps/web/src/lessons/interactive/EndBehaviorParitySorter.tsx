/**
 * POL.6 slide 2: do the two ends of this graph agree, or oppose each other?
 *
 * The four cases of end behavior are two independent decisions, and running them together is
 * where the reading goes wrong. This board isolates the FIRST of them: whether the two ends
 * point the same way is decided by the degree's parity and by nothing else, so the sign of the
 * leading coefficient is irrelevant on every row here. That is why the board is worth making a
 * question rather than a table. A learner who believes a negative leading coefficient makes the
 * ends disagree will get the negative rows wrong and the positive rows right, which is a
 * diagnosis the board hands back row by row.
 *
 * The signs are drawn both ways at each parity for exactly that reason, and one row is a
 * bracket raised to a power, so the degree has to be worked out rather than read.
 *
 * Built on `BinaryRowSort`, which owns the mechanic, the marks on a settled row and the board's
 * one reveal. Row 0 answers with the first option and row 1 with the second, which is that
 * file's contract on its adopters.
 *
 * **The calls do not alternate below row 1, and that is deliberate.** Both boards answer
 * same, opposite, opposite, same, so no walk down one column and up the other clears a board:
 * an alternating board is one a learner can pass by tapping in a rhythm, which is the same
 * anti-brute-force rule as dealing options in a derangement. `trg-quadrant-sorter` reorders its
 * headings for exactly this reason. Measured: `widgetRevealReAsk.browser.test.tsx` walks the
 * chips from the last backwards, and on an alternating board it landed four correct calls in a
 * row and opened the gate without ever needing the reveal.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

/** The two calls on offer under every row, in the order they are drawn. */
const CALLS = ["Both ends the same way", "Ends opposite ways"] as const;

/** One row's content, before the shared reasoning is wrapped around it. */
interface Row {
  id: string;
  latex: string;
  spoken: string;
  /** The polynomial's degree, which is the only thing that decides the call. */
  degree: number;
  /** True when the leading coefficient is negative, which decides nothing here. */
  negative: boolean;
  /** How the degree has to be got, where it is not simply written. */
  note?: string;
}

const BOARDS: readonly (readonly Row[])[] = [
  [
    {
      id: "b0-even-pos",
      latex: "4x^{4} - 9x + 1",
      spoken: "4 x to the fourth minus 9 x plus 1",
      degree: 4,
      negative: false,
    },
    {
      id: "b0-odd-neg",
      latex: "-2x^{3} + 6x^{2} - 5",
      spoken: "negative 2 x cubed plus 6 x squared minus 5",
      degree: 3,
      negative: true,
    },
    {
      id: "b0-odd-pos-bracket",
      latex: "5(x - 1)^{5}",
      spoken: "5 times, x minus 1, all to the fifth",
      degree: 5,
      negative: false,
      note: "The degree is on the bracket, so it is the degree of the whole polynomial.",
    },
    {
      id: "b0-even-neg",
      latex: "-x^{6} + 8x^{2}",
      spoken: "negative x to the sixth plus 8 x squared",
      degree: 6,
      negative: true,
    },
  ],
  [
    {
      id: "b1-even-neg",
      latex: "-3x^{2} + 7x - 4",
      spoken: "negative 3 x squared plus 7 x minus 4",
      degree: 2,
      negative: true,
    },
    {
      id: "b1-odd-pos",
      latex: "6x^{7} - x^{3} + 2",
      spoken: "6 x to the seventh minus x cubed plus 2",
      degree: 7,
      negative: false,
    },
    {
      id: "b1-odd-neg-product",
      latex: "-(x^{2} + 1)(x - 4)",
      spoken: "minus, x squared plus 1, times x minus 4",
      degree: 3,
      negative: true,
      note: "The degrees of the two brackets add: 2 from the first and 1 from the second.",
    },
    {
      id: "b1-even-pos",
      latex: "2x^{8} - 11",
      spoken: "2 x to the eighth minus 11",
      degree: 8,
      negative: false,
    },
    // Rows two and three are both `opposite`, then `same`: see the docblock on why the calls
    // must not alternate all the way down.
  ],
];

/** Wrap one row's content in the reasoning that is the same on every row of every board. */
function toBinaryRow(row: Row): BinaryRow {
  const even = row.degree % 2 === 0;
  return {
    id: row.id,
    latex: row.latex,
    spoken: row.spoken,
    first: even,
    note: even
      ? `The degree is ${row.degree}, which is even, so the two ends agree however the leading coefficient is signed.`
      : `The degree is ${row.degree}, which is odd, so the two ends must disagree however the leading coefficient is signed.`,
    why: (
      <>
        {row.note ? `${row.note} ` : ""}The degree here is{" "}
        <InlineMath latex={`${row.degree}`} />, and an{" "}
        {even ? (
          <>
            even power sends a large negative input to the same side as a large positive
            one, because the sign is squared away. So the ends agree.
          </>
        ) : (
          <>
            odd power keeps the sign of its input, so a large negative input goes the
            opposite way to a large positive one. So the ends disagree.
          </>
        )}{" "}
        The leading coefficient is{" "}
        <InlineMath latex={row.negative ? "\\text{negative}" : "\\text{positive}"} /> on
        this row, and that decides WHICH way each end goes rather than whether they agree,
        so it does not enter this call at all.
      </>
    ),
  };
}

export function EndBehaviorParitySorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rows = (BOARDS[variant.index] ?? (BOARDS[0] as readonly Row[])).map(toBinaryRow);

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective="Decide for each of these four polynomials whether its two ends point the same way or opposite ways."
      options={CALLS}
      rows={rows}
      prompt="Work out the degree of each polynomial, then say what its parity forces about the two ends."
      conclusion="An even degree squares the sign of the input away, so both ends go the same way; an odd degree keeps it, so they oppose. Two of these four had a negative leading coefficient and it changed none of those calls: the sign decides which way, and the parity decides whether they agree."
      missedNote="That is all four called, so you are good to carry on. Every row you missed says why just underneath it, and the working is there if you want it."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="New set of four polynomials"
      missedRestartLabel="Try a fresh set"
    />
  );
}
