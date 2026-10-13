/**
 * TRG.4 slide 2: which of the six functions survive a reversed sweep unchanged.
 *
 * Four odd against two even, so the board cannot be worked by guessing the majority call on
 * every row, and it cannot be worked off the spelling either: cosine and secant are even
 * while cosecant and cotangent are odd, and every one of those four carries the same co-.
 * What separates them is which coordinate the function reports, which is the reasoning the
 * rows are built to force.
 *
 * A wrong call LOCKS the row, because with two options a nudge-and-retry is not a question.
 * The board still opens once every row has been CALLED, so a miss on the first row does not
 * send a learner back through the five they already knew.
 *
 * The second board asks the same six questions in the form they arrive in during practice:
 * a reading already written at $-\theta$, and the call is what it does rather than what it
 * is called.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

interface Fn {
  id: string;
  /** The function itself, as it is written at a positive heading. */
  latex: string;
  /** The same function written at the reversed heading. */
  negLatex: string;
  spoken: string;
  negSpoken: string;
  even: boolean;
  why: ReactNode;
}

const FUNCTIONS: readonly Fn[] = [
  {
    id: "sin",
    latex: "\\sin\\theta",
    negLatex: "\\sin(-\\theta)",
    spoken: "sine",
    negSpoken: "sine of negative theta",
    even: false,
    why: (
      <>
        The sine reports the VERTICAL coordinate, and reversing the sweep reflects the
        position across the horizontal axis, which negates it. So{" "}
        <InlineMath latex="\sin(-\theta) = -\sin\theta" />.
      </>
    ),
  },
  {
    id: "cos",
    latex: "\\cos\\theta",
    negLatex: "\\cos(-\\theta)",
    spoken: "cosine",
    negSpoken: "cosine of negative theta",
    even: true,
    why: (
      <>
        The cosine reports the HORIZONTAL coordinate, and a reflection across the horizontal
        axis leaves that coordinate exactly where it was. So{" "}
        <InlineMath latex="\cos(-\theta) = \cos\theta" />, and the reading is worth the same
        whichever way the antenna swept to reach it.
      </>
    ),
  },
  {
    id: "tan",
    latex: "\\tan\\theta",
    negLatex: "\\tan(-\\theta)",
    spoken: "tangent",
    negSpoken: "tangent of negative theta",
    even: false,
    why: (
      <>
        The tangent divides the vertical coordinate by the horizontal one. Exactly one of
        the two changes sign, so the quotient does:{" "}
        <InlineMath latex="\tan(-\theta) = \dfrac{-\sin\theta}{\cos\theta} = -\tan\theta" />
        .
      </>
    ),
  },
  {
    id: "csc",
    latex: "\\csc\\theta",
    negLatex: "\\csc(-\\theta)",
    spoken: "cosecant",
    negSpoken: "cosecant of negative theta",
    even: false,
    why: (
      <>
        The cosecant is the sine turned over, and turning a negative value over leaves it
        negative. A reciprocal always inherits its partner's behavior here, so{" "}
        <InlineMath latex="\csc(-\theta) = -\csc\theta" />.
      </>
    ),
  },
  {
    id: "sec",
    latex: "\\sec\\theta",
    negLatex: "\\sec(-\\theta)",
    spoken: "secant",
    negSpoken: "secant of negative theta",
    even: true,
    why: (
      <>
        The secant is the cosine turned over, and the cosine did not move, so nothing built
        on it moves either: <InlineMath latex="\sec(-\theta) = \sec\theta" />. The co- in
        cosecant and cotangent is no help at all in sorting this board.
      </>
    ),
  },
  {
    id: "cot",
    latex: "\\cot\\theta",
    negLatex: "\\cot(-\\theta)",
    spoken: "cotangent",
    negSpoken: "cotangent of negative theta",
    even: false,
    why: (
      <>
        The cotangent is the tangent turned over, so it takes the tangent's sign change with
        it: <InlineMath latex="\cot(-\theta) = -\cot\theta" />.
      </>
    ),
  },
];

/**
 * Why a missed call was wrong, in one sentence, in wording that holds on either board. The
 * two boards ask the same question in two registers, so a note written for one of them would
 * be describing the wrong control on the other.
 */
function note(fn: Fn): string {
  return fn.even
    ? `Reversing the sweep leaves the horizontal coordinate alone, and the ${fn.spoken} is built on that coordinate, so its reading comes back exactly as it was.`
    : `Reversing the sweep flips the vertical coordinate, and the ${fn.spoken} carries that coordinate somewhere in it, so its reading comes back with the opposite sign.`;
}

/**
 * The order each board reads its six functions in, as ids.
 *
 * `FUNCTIONS` above stays in the order the six are always recited in, because that is what a
 * reader of this file wants; a board wants something else from its order, and two different
 * things at that.
 *
 * The first two rows are fixed: every board on this kind opens with the first option right
 * and the second row's right call in the second option, which `BinaryRow.first` states and
 * `binaryRowMarks` asserts as its own precondition. Four of these six are odd, so nothing
 * below that can alternate even in principle, which is the property the board wants: it
 * cannot be worked by guessing a majority call or by tapping down one column.
 *
 * The two boards read in DIFFERENT orders. They ask the same six questions in two registers,
 * so a shared order would let a learner who took the first walk the second from the shape of
 * the answers rather than from the coordinate each function reports.
 */
const BOARD_ORDER: readonly (readonly string[])[] = [
  ["cos", "sin", "tan", "csc", "sec", "cot"],
  ["sec", "tan", "cos", "sin", "cot", "csc"],
];

/**
 * Board 0: the function by name. Board 1: the same reading already written at $-\theta$.
 *
 * A SORT of `FUNCTIONS` rather than a walk of `BOARD_ORDER`, so an id missing from the order
 * above cannot quietly shorten the board: it sorts to the front instead, which shows up as a
 * board opening on the wrong call rather than as five rows where six belong.
 */
function rowsFor(reversed: boolean): readonly BinaryRow[] {
  const order = BOARD_ORDER[reversed ? 1 : 0] ?? [];
  return [...FUNCTIONS]
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    .map((fn) => ({
      id: `${reversed ? "b1" : "b0"}-${fn.id}`,
      latex: reversed ? fn.negLatex : fn.latex,
      spoken: reversed ? fn.negSpoken : fn.spoken,
      first: fn.even,
      note: note(fn),
      why: fn.why,
    }));
}

const BOARDS: readonly {
  options: readonly [string, string];
  rows: readonly BinaryRow[];
  objective: ReactNode;
}[] = [
  {
    options: ["even", "odd"],
    rows: rowsFor(false),
    objective: (
      <>
        Goal: call each of the six functions even or odd, until the board shows which two
        come through a reversed sweep unchanged.
      </>
    ),
  },
  {
    options: ["unchanged", "sign flipped"],
    rows: rowsFor(true),
    objective: (
      <>
        Goal: say what each of these six readings does when the sweep runs the other way,
        until the board shows the two that are untouched by it.
      </>
    ),
  },
];

export function TrigEvenOddSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? BOARDS[0];
  if (!board) {
    return null;
  }

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective={board.objective}
      options={board.options}
      rows={board.rows}
      prompt="Ask which coordinate the function reports before you call the row. A row locks on its first call."
      conclusion={
        <>
          Two even and four odd. Cosine and secant are the pair built on the horizontal
          coordinate, which a reversed sweep leaves where it is, and every other function
          carries the vertical coordinate somewhere in it and picks up its sign change.
        </>
      }
      missedNote="The co- at the front of a name does not sort this board: cosine and secant are even while cosecant and cotangent are odd. Work from the coordinate each function reports."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on readings at a reversed heading"
      missedRestartLabel="Try a fresh set of six"
    />
  );
}
