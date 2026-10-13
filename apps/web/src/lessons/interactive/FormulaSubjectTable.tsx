/**
 * LIN.3 slide 1: the same two moves, on three different rules.
 *
 * The slide claims isolating a quantity needs no new technique. A claim about a method being the
 * same everywhere is a claim about several instances, so the table is the shape it already has:
 * the first row is worked, and the rows under it are the same pair of moves on rules that look
 * nothing like it. Each finished row stays on screen while the next is worked, so the learner
 * watches the method repeat rather than being told it repeats.
 *
 * The options include the rearrangement that subtracts and divides in the wrong ORDER, which is
 * the only mistake the two moves can make between them, and the one that divides a single term
 * instead of the whole side.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
}

/** Neither board uses the paragraph's own curb rule solved for $w$, which is worked in full. */
const BOARDS: readonly Board[] = [
  {
    rows: [
      {
        id: "a0",
        fixed: ["v = u + at", "a"],
        value: "a = \\dfrac{v - u}{t}",
        blank: false,
        spoken: "v equals u plus a t, solved for a",
      },
      {
        id: "a1",
        fixed: ["C = 2\\pi r", "r"],
        value: "r = \\dfrac{C}{2\\pi}",
        blank: true,
        spoken: "C equals 2 pi r, solved for r",
        why: (
          <>
            Nothing is added to <InlineMath latex="r" /> here, so there is no subtraction to
            make: <InlineMath latex="2\pi" /> multiplies it and one division undoes that. A
            rule with only one operation in it takes only one move to re-point.
          </>
        ),
      },
      {
        id: "a2",
        fixed: ["y = mx + b", "x"],
        value: "x = \\dfrac{y - b}{m}",
        blank: true,
        spoken: "y equals m x plus b, solved for x",
        why: (
          <>
            The <InlineMath latex="b" /> is added last, so it comes off first and leaves{" "}
            <InlineMath latex="y - b = mx" />. Dividing by <InlineMath latex="m" /> then
            isolates <InlineMath latex="x" />, and the whole of <InlineMath latex="y - b" />{" "}
            goes over the bar because the whole of it was equal to <InlineMath latex="mx" />
            .
          </>
        ),
      },
      {
        id: "a3",
        fixed: ["P = 2l + 2w", "l"],
        value: "l = \\dfrac{P - 2w}{2}",
        blank: true,
        spoken: "P equals 2 l plus 2 w, solved for l",
        why: (
          <>
            This is the curb rule turned the other way, and the two moves do not change:
            take <InlineMath latex="2w" /> off both sides, then divide by the{" "}
            <InlineMath latex="2" /> that multiplies <InlineMath latex="l" />. Which of the
            two sides is wanted makes no difference to the method.
          </>
        ),
      },
    ],
    options: [
      { id: "circ", latex: "r = \\dfrac{C}{2\\pi}", spoken: "r equals C over 2 pi" },
      { id: "line", latex: "x = \\dfrac{y - b}{m}", spoken: "x equals y minus b over m" },
      {
        id: "kerb",
        latex: "l = \\dfrac{P - 2w}{2}",
        spoken: "l equals P minus 2 w over 2",
      },
      {
        id: "order",
        latex: "x = \\dfrac{y}{m} - b",
        spoken: "x equals y over m minus b",
      },
      { id: "part", latex: "r = C - 2\\pi", spoken: "r equals C minus 2 pi" },
    ],
  },
  {
    rows: [
      {
        id: "b0",
        fixed: ["S = 2n + k", "n"],
        value: "n = \\dfrac{S - k}{2}",
        blank: false,
        spoken: "S equals 2 n plus k, solved for n",
      },
      {
        id: "b1",
        fixed: ["A = lw", "w"],
        value: "w = \\dfrac{A}{l}",
        blank: true,
        spoken: "A equals l w, solved for w",
        why: (
          <>
            <InlineMath latex="l" /> multiplies <InlineMath latex="w" /> and nothing else
            happens to it, so one division is the whole rearrangement. The absence of an
            addition is what makes this the shortest row on the board.
          </>
        ),
      },
      {
        id: "b2",
        fixed: ["D = rt + s", "t"],
        value: "t = \\dfrac{D - s}{r}",
        blank: true,
        spoken: "D equals r t plus s, solved for t",
        why: (
          <>
            The <InlineMath latex="s" /> comes off both sides first, leaving{" "}
            <InlineMath latex="D - s = rt" />, and dividing by <InlineMath latex="r" />{" "}
            finishes it. This is the same shape as the worked row with different names on
            it.
          </>
        ),
      },
      {
        id: "b3",
        fixed: ["V = 3q - h", "q"],
        value: "q = \\dfrac{V + h}{3}",
        blank: true,
        spoken: "V equals 3 q minus h, solved for q",
        why: (
          <>
            Here <InlineMath latex="h" /> is SUBTRACTED, so isolating past it adds it, and{" "}
            <InlineMath latex="V + h = 3q" />. The sign of the move is the sign the rule is
            undoing, never the sign written in the rule.
          </>
        ),
      },
    ],
    options: [
      { id: "area", latex: "w = \\dfrac{A}{l}", spoken: "w equals A over l" },
      { id: "dist", latex: "t = \\dfrac{D - s}{r}", spoken: "t equals D minus s over r" },
      { id: "vol", latex: "q = \\dfrac{V + h}{3}", spoken: "q equals V plus h over 3" },
      { id: "sign", latex: "q = \\dfrac{V - h}{3}", spoken: "q equals V minus h over 3" },
      { id: "split", latex: "t = \\dfrac{D}{r} - s", spoken: "t equals D over r minus s" },
    ],
  },
];

export function FormulaSubjectTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      headings={["the rule as written", "wanted alone", "the rule re-pointed"]}
      rows={board.rows}
      options={board.options}
      objective="Goal: finish the last column, until the table shows the same two moves re-pointing three rules that look nothing like each other."
      prompt="Work out which quantity is added to the wanted one and which multiplies it, then complete that row."
      conclusion={
        <>
          Three rules, three sets of names, and one method: undo the addition, then undo the
          multiplication. Not one row needed a measurement, because no step in either move
          depends on what the quantities are.
        </>
      }
      ariaLabel="A table of rules, each with one quantity to be isolated and the rearranged rule to complete"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with three different rules"
    />
  );
}
