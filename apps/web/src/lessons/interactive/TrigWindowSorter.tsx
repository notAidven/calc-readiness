/**
 * TRG.8 slide 3: which of a general solution's headings the stated window actually keeps.
 *
 * A general solution is an infinite list, and the window is what turns it into an answer. The
 * two places that go wrong are both on the board rather than in the prose: the lower bound is
 * NOT strict, so a heading of exactly zero stays, and the upper bound IS strict, so a heading
 * of exactly a full turn goes. Those two rows sit side by side under identical-looking numbers,
 * which is the whole reason for making the call four times instead of reading a sentence about
 * it.
 *
 * Each board is one general solution, so a row is a candidate drawn from it rather than an
 * unrelated angle: the learner is filtering a list, which is the move the practice items ask
 * for, and not classifying angles in the abstract.
 *
 * Built on `BinaryRowSort`, which owns the mechanic, the lock on a wrong tap and the board's
 * single reveal.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

/**
 * The two calls on offer under every row, in the order they are drawn.
 *
 * The question the objective poses is one question — does this heading belong in the answer for
 * $0^{\circ} \le x < 360^{\circ}$? — so both calls answer that one and nothing else. They used
 * to read "Keep it" and "Outside the window", which is an imperative about what to do with the
 * row paired with a statement about where the number sits: two well-formed labels on two
 * different axes, which is the R22 shape, and the five sibling `BinaryRowSort` boards in this
 * domain all pair on one. Worse, only the negative call named the window at all, so the concept
 * the slide exists to teach was carried entirely by the "no" side, and a learner could read
 * "Keep it" as "this is still a solution of the equation" — which every candidate on the board
 * is, and which is exactly the distinction being drawn.
 */
const CALLS = ["Inside the window", "Outside the window"] as const;

interface Board {
  /** The equation whose general solution the rows are drawn from. */
  equation: string;
  equationSpoken: string;
  /** The general solution itself, stated in the objective. */
  general: string;
  rows: readonly BinaryRow[];
}

const BOARDS: readonly Board[] = [
  {
    equation: "\\tan x = 1",
    equationSpoken: "tangent x equals 1",
    general: "x = 45^{\\circ} + 180^{\\circ}n",
    rows: [
      {
        id: "tan-45",
        latex: "45^{\\circ}",
        spoken: "45 degrees",
        first: true,
        note: "It sits between the two bounds, so nothing excludes it.",
        why: (
          <>
            Taking <InlineMath latex="n = 0" /> in the general solution gives{" "}
            <InlineMath latex="45^{\circ}" />, comfortably inside the window on both sides.
          </>
        ),
      },
      {
        id: "tan-405",
        latex: "405^{\\circ}",
        spoken: "405 degrees",
        first: false,
        note: "A full turn past 45 degrees, so it is past the top of the window.",
        why: (
          <>
            <InlineMath latex="405^{\circ} = 360^{\circ} + 45^{\circ}" />, so it points
            exactly where <InlineMath latex="45^{\circ}" /> points and its tangent really is{" "}
            <InlineMath latex="1" />. Being a solution is not the question: the window asks
            for headings below <InlineMath latex="360^{\circ}" />, and this one has gone
            round again.
          </>
        ),
      },
      {
        id: "tan-225",
        latex: "225^{\\circ}",
        spoken: "225 degrees",
        first: true,
        note: "It sits between the two bounds, so nothing excludes it.",
        why: (
          <>
            <InlineMath latex="n = 1" /> gives{" "}
            <InlineMath latex="45^{\circ} + 180^{\circ} = 225^{\circ}" />, half a turn on
            from the first heading and still inside one revolution. This is the second
            member of the roster.
          </>
        ),
      },
      {
        id: "tan-neg135",
        latex: "-135^{\\circ}",
        spoken: "negative 135 degrees",
        first: false,
        note: "The window starts at zero, and this heading is measured the other way.",
        why: (
          <>
            <InlineMath latex="n = -1" /> gives <InlineMath latex="-135^{\circ}" />, which
            is a genuine solution reached by turning clockwise. Adding a full turn brings it
            to <InlineMath latex="225^{\circ}" />, and THAT is the member of the roster; the
            negative spelling of it is not.
          </>
        ),
      },
    ],
  },
  {
    equation: "\\sin x = 0",
    equationSpoken: "sine x equals 0",
    general: "x = 0^{\\circ} + 180^{\\circ}n",
    rows: [
      {
        id: "sin-180",
        latex: "180^{\\circ}",
        spoken: "180 degrees",
        first: true,
        note: "It sits between the two bounds, so nothing excludes it.",
        why: (
          <>
            <InlineMath latex="n = 1" /> gives <InlineMath latex="180^{\circ}" />, pointing
            straight back along the horizontal with a height of zero. Inside the window on
            both sides.
          </>
        ),
      },
      {
        id: "sin-360",
        latex: "360^{\\circ}",
        spoken: "360 degrees",
        first: false,
        note: "The upper bound is strict, so a whole turn is one step too far.",
        why: (
          <>
            The window is <InlineMath latex="0^{\circ} \le x < 360^{\circ}" />, and the
            second sign is a strict one. A full turn points exactly where{" "}
            <InlineMath latex="0^{\circ}" /> points, so keeping both would put the same
            direction in the roster twice. That is why one end of the window is closed and
            the other is open.
          </>
        ),
      },
      {
        id: "sin-0",
        latex: "0^{\\circ}",
        spoken: "0 degrees",
        first: true,
        note: "The lower bound is not strict, so the window includes its own start.",
        why: (
          <>
            This is the row the upper bound tempts you to match. The first sign in{" "}
            <InlineMath latex="0^{\circ} \le x < 360^{\circ}" /> allows equality, so{" "}
            <InlineMath latex="0^{\circ}" /> is a member of the roster. The two bounds are
            written differently on purpose.
          </>
        ),
      },
      {
        id: "sin-neg180",
        latex: "-180^{\\circ}",
        spoken: "negative 180 degrees",
        first: false,
        note: "Below the start of the window, so it is not one of the headings asked for.",
        why: (
          <>
            <InlineMath latex="n = -1" /> gives <InlineMath latex="-180^{\circ}" />, a real
            solution measured clockwise. Add a full turn and it becomes{" "}
            <InlineMath latex="180^{\circ}" />, which is already on the board, so nothing is
            lost by leaving this spelling out.
          </>
        ),
      },
    ],
  },
];

export function TrigWindowSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective={
        <>
          Every solution of <InlineMath latex={board.equation} /> is{" "}
          <InlineMath latex={board.general} /> for a whole number <InlineMath latex="n" />.
          Decide for each of these four candidates whether it belongs in the answer for{" "}
          <InlineMath latex="0^{\circ} \le x < 360^{\circ}" />.
        </>
      }
      options={CALLS}
      rows={board.rows}
      prompt="Compare each heading with both bounds, and read the two signs carefully: one of them allows equality and one does not."
      conclusion={
        <>
          The general solution is an endless list and the window is what cuts it down to an
          answer. Read the bounds as they are written: <InlineMath latex="0^{\circ}" /> is
          in, a full turn is out, and a heading measured clockwise belongs to the roster
          only once a turn has been added to bring it inside.
        </>
      }
      missedNote="That is all four called, so you are good to carry on. Every row you missed says why just underneath it, and the working is there if you want it."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="A different general solution"
      missedRestartLabel="Try a fresh set"
    />
  );
}
