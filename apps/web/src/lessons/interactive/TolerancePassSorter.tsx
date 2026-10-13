/**
 * LIN.6 slide 0: pass or reject, one stamped weight at a time.
 *
 * The slide states the inspector's rule in words and then in symbols, and the thing worth doing
 * before either shape is solved is applying it: a learner who can say whether a given weight passes
 * has understood that the rule is about a distance, and a learner who cannot has not.
 *
 * Two of the weights on each board sit exactly ON the tolerance, which is where the boundary is won
 * or lost: the passes are stated with an at-most sign, so the boundary weight passes, and reading
 * that off the sign rather than off the picture is the whole of the row.
 *
 * Built on `BinaryRowSort`, which owns the mechanic and the marks on a settled row.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

interface Board {
  standard: number;
  tolerance: number;
  /** The stamped weights presented, in the order they are drawn. */
  weights: readonly number[];
}

/** Neither board is the paragraph's own standard of 60 with a tolerance of 2. */
const BOARDS: readonly Board[] = [
  { standard: 50, tolerance: 3, weights: [47, 54, 53, 46] },
  { standard: 80, tolerance: 5, weights: [86, 75, 84, 74] },
];

const CALLS = ["Passes", "Rejected"] as const;

export function TolerancePassSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  const rows: BinaryRow[] = board.weights.map((weight) => {
    const error = Math.abs(weight - board.standard);
    const passes = error <= board.tolerance;
    return {
      id: String(weight),
      latex: `w = ${weight}`,
      spoken: `a stamped weight of ${weight} minas`,
      first: passes,
      note: passes
        ? `Its error is ${error}, which the tolerance of ${board.tolerance} still allows.`
        : `Its error is ${error}, which is past the tolerance of ${board.tolerance}.`,
      why: passes ? (
        <>
          The error is{" "}
          <InlineMath latex={`\\lvert ${weight} - ${board.standard} \\rvert`} /> ={" "}
          <InlineMath latex={String(error)} />, and the rule passes anything at{" "}
          <InlineMath latex={String(board.tolerance)} /> or under.
          {error === board.tolerance ? (
            <>
              {" "}
              This one sits exactly ON the tolerance, and the sign in{" "}
              <InlineMath
                latex={`\\lvert w - ${board.standard} \\rvert \\le ${board.tolerance}`}
              />{" "}
              is the at-most kind, so the boundary weight is one of the passes.
            </>
          ) : null}
        </>
      ) : (
        <>
          The error is{" "}
          <InlineMath latex={`\\lvert ${weight} - ${board.standard} \\rvert`} /> ={" "}
          <InlineMath latex={String(error)} />, which is more than{" "}
          <InlineMath latex={String(board.tolerance)} />, so it fails. The direction of the
          drift makes no difference at all, because the bars report the size of the gap and
          nothing else.
        </>
      ),
    };
  });

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective={
        <>
          Decide for each of these four stamped weights whether the inspector passes it,
          given a standard of <InlineMath latex={String(board.standard)} /> and a tolerance
          of <InlineMath latex={String(board.tolerance)} />.
        </>
      }
      options={CALLS}
      rows={rows}
      prompt="Work out how far each weight sits from the standard, then compare that distance with the tolerance."
      conclusion={
        <>
          Every call came from one distance and one comparison. The passing weights are the
          ones whose error is at most <InlineMath latex={String(board.tolerance)} />, which
          is a whole band of the scale rather than the two weights an equals sign would have
          picked out.
        </>
      }
      missedNote="That is all four called, so you are good to carry on. Every row you missed says why just underneath it, and the working is there if you want it."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="New set of four weights"
      missedRestartLabel="Try a fresh set"
    />
  );
}
