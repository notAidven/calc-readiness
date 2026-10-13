/**
 * TRG.1 slide 2: which of these headings leave the dish where the given one does.
 *
 * Sorting is the right shape because coterminal is a RELATION, and a relation is learned by
 * being asked about cases that fail it as well as cases that hold. Four calls against one
 * reference heading is what separates the rule from four remembered answers.
 *
 * The board is built around the two ways the idea goes wrong, and both are on every board:
 *
 *  - **Half a turn looks like a turn.** A heading exactly $180^{\circ}$ away is the closest
 *    thing to coterminal that is not, and the dish it describes points the opposite way. That
 *    row is on both boards and it is the one most often called wrong.
 *  - **Turns can go backwards, and there can be two of them.** A negative measure is a sweep
 *    the other way round and is coterminal with the same headings, so every board carries one
 *    heading below zero and one that is more than a single turn away.
 *
 * The opening board answers its first two rows opposite ways, which is a property
 * `binaryRowMarks.browser.test.tsx` asserts by name across every widget built on this kind,
 * and its four rows alternate so no board can be swept by tapping down one column.
 *
 * Built on `BinaryRowSort`, which owns the lock on a wrong tap, the marks a settled row keeps,
 * the sentence a missed row prints and the board's single reveal.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

/** The two calls on offer under every row, in the order they are drawn. */
const CALLS = ["Coterminal", "Not coterminal"] as const;

interface Board {
  /** The heading every row on the board is compared against. */
  given: number;
  headings: readonly number[];
}

/** A signed measure read aloud, so a minus sign is not lost to a screen reader. */
function spokenDegrees(value: number): string {
  return value < 0 ? `negative ${-value} degrees` : `${value} degrees`;
}

/** How many whole turns a difference is, signed, as LaTeX. */
function turnsTex(difference: number): string {
  const turns = difference / 360;
  return `${turns} \\times 360^{\\circ}`;
}

/** One heading, as a row about the board's given heading. */
function row(given: number, heading: number): BinaryRow {
  const difference = heading - given;
  const coterminal = difference % 360 === 0;
  const halfTurn = Math.abs(difference) === 180;
  const turns = Math.abs(difference) / 360;

  return {
    id: `cot-${given}-${heading}`,
    latex: `${heading}^{\\circ}`,
    spoken: spokenDegrees(heading),
    first: coterminal,
    note: coterminal
      ? `The two measures differ by ${turns === 1 ? "one whole turn" : `${turns} whole turns`}, so the dish finishes in the same place either way.`
      : halfTurn
        ? "The two measures differ by half a turn, which leaves the dish pointing the opposite way."
        : `The two measures differ by ${Math.abs(difference)} degrees, which is not a whole number of turns.`,
    why: (
      <>
        Two headings are coterminal exactly when their measures differ by a whole number of
        full turns, so the test is one subtraction:{" "}
        <InlineMath
          latex={`${heading}^{\\circ} - ${given}^{\\circ} = ${difference}^{\\circ}`}
        />
        .{" "}
        {coterminal ? (
          <>
            That is <InlineMath latex={turnsTex(difference)} />, a whole number of turns
            {difference < 0 ? " taken the other way round, which counts just the same" : ""}
            , so the sweep ends where the given one ends and the dish points the same way.
          </>
        ) : (
          <>
            That is not a whole number of turns, so the sweep stops somewhere else.{" "}
            {halfTurn ? (
              <>
                Half a turn is the trap worth naming: it lands the arm back on the same
                LINE, which looks close, and points the dish the exact opposite way.
              </>
            ) : (
              <>
                Landing near the given heading is not the test either. Only a difference
                that is a multiple of <InlineMath latex="360^{\circ}" /> counts.
              </>
            )}
          </>
        )}
      </>
    ),
  };
}

/**
 * Two boards, sharing no heading. Each alternates its calls down the column, so the pattern
 * cannot be tapped, and each carries one negative measure, one heading more than a single turn
 * away, and the half-turn near miss.
 */
const BOARDS: readonly Board[] = [
  { given: 40, headings: [400, 220, -320, 140] },
  { given: 150, headings: [330, 510, 60, -570] },
];

export function TrigCoterminalSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective={
        <>
          A dish is parked at a heading of <InlineMath latex={`${board.given}^{\\circ}`} />.
          Decide for each of these four measures whether a sweep of that size would leave
          the dish pointing the same way.
        </>
      }
      options={CALLS}
      rows={board.headings.map((heading) => row(board.given, heading))}
      prompt="Subtract the parked heading from the measure, then ask whether what is left is a whole number of full turns."
      conclusion={
        <>
          Two headings are <strong>coterminal</strong> when they differ by a whole number of
          full turns, so their sweeps finish on the same terminal side. That is one
          subtraction and one question about the result: <InlineMath latex="360^{\circ}" />{" "}
          counts, so does <InlineMath latex="720^{\circ}" />, and so does{" "}
          <InlineMath latex="-360^{\circ}" />, because a sweep the other way round is still
          a whole turn. <InlineMath latex="180^{\circ}" /> does not, however close it looks:
          half a turn leaves the dish facing backwards.
        </>
      }
      missedNote="That is all four called, so you are good to carry on. Every row you missed says why just underneath it, and the working is there if you want it."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="New parked heading and four new measures"
      missedRestartLabel="Try a fresh set"
    />
  );
}
