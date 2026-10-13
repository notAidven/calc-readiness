/**
 * POL.5 slide 1: vertex form, and the one sign that flips on the way out of it.
 *
 * $a(x - h)^{2} + k$ has its turning point at $(h, k)$, and the two coordinates come out of it
 * by opposite rules: $k$ is read off the page unchanged and $h$ is read with its sign reversed,
 * because the bracket SUBTRACTS $h$. A learner who copies both numbers as written has the height
 * right and the position wrong, on every parabola, forever.
 *
 * A table is the shape that exposes it, because the two columns sit beside each other and the
 * worked rows show the flip happening before the learner is asked to perform it. The tray offers
 * the un-flipped coordinate, which is the answer that mistake produces, so the wrong answer is
 * on the board rather than described.
 *
 * The blank row is deliberately the one whose bracket ADDS, which is the case the flip is
 * visible on: the rows given as the pattern include a subtracting bracket, so a learner who has
 * only seen those has seen the rule do nothing.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable } from "./kinds/FillTable";

interface Board {
  /** Two worked rows and a blank one, as `a(x - h)^2 + k` triples. The blank row is `third`. */
  first: { a: number; h: number; k: number };
  second: { a: number; h: number; k: number };
  /** The blank row, whose `h` is always negative so its bracket adds. */
  third: { a: number; h: number; k: number };
}

/** Neither board reuses the slide's own parabola or the check's. */
const BOARDS: readonly Board[] = [
  {
    first: { a: 1, h: 4, k: -3 },
    second: { a: 2, h: -1, k: 5 },
    third: { a: -3, h: -6, k: 2 },
  },
  {
    first: { a: 5, h: 2, k: 7 },
    second: { a: -1, h: -4, k: -1 },
    third: { a: 4, h: -3, k: -8 },
  },
];

/** `2\left(x - 3\right)^{2} + 5`, with a coefficient of one dropped and a sign folded in. */
function ruleTex({ a, h, k }: { a: number; h: number; k: number }): string {
  const front = a === 1 ? "" : a === -1 ? "-" : `${a}`;
  const inner = h < 0 ? `x + ${-h}` : `x - ${h}`;
  const tail = k < 0 ? `- ${-k}` : `+ ${k}`;
  return `${front}\\left(${inner}\\right)^{2} ${tail}`;
}

/** `(4, -3)`, the vertex as a point. */
function pointTex(h: number, k: number): string {
  return `\\left(${h},\\, ${k}\\right)`;
}

export function VertexFormReadTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { first, second, third } = board;
  const insideThird = third.h < 0 ? `x + ${-third.h}` : `x - ${third.h}`;

  return (
    <FillTable
      key={variant.nonce}
      headings={["the rule", "what the bracket is zero at", "the vertex"]}
      rows={[
        {
          id: "first",
          fixed: [ruleTex(first), `x = ${first.h}`],
          value: pointTex(first.h, first.k),
          blank: false,
          spoken: `the rule ${ruleTex(first)}`,
        },
        {
          id: "second",
          fixed: [ruleTex(second), `x = ${second.h}`],
          value: pointTex(second.h, second.k),
          blank: false,
          spoken: `the rule ${ruleTex(second)}`,
        },
        {
          id: "third",
          fixed: [ruleTex(third), `x = ${third.h}`],
          value: pointTex(third.h, third.k),
          blank: true,
          spoken: `the rule ${ruleTex(third)}`,
          why: (
            <>
              The bracket <InlineMath latex={insideThird} /> is zero at{" "}
              <InlineMath latex={`x = ${third.h}`} />, and that is the turning point's
              position: a bracket that ADDS a number is zero at the negative of it. The
              number outside the bracket is the height and it is read exactly as written, so
              the vertex is <InlineMath latex={pointTex(third.h, third.k)} /> and not{" "}
              <InlineMath latex={pointTex(-third.h, third.k)} />. One of the two coordinates
              flips and the other does not, which is the whole of what this form asks you to
              remember.
            </>
          ),
        },
      ]}
      options={[
        {
          id: "right",
          latex: pointTex(third.h, third.k),
          spoken: `the point ${third.h}, ${third.k}`,
        },
        {
          id: "unflipped",
          latex: pointTex(-third.h, third.k),
          spoken: `the point ${-third.h}, ${third.k}`,
        },
        {
          id: "swapped",
          latex: pointTex(third.k, third.h),
          spoken: `the point ${third.k}, ${third.h}`,
        },
        {
          id: "both-flipped",
          latex: pointTex(-third.h, -third.k),
          spoken: `the point ${-third.h}, ${-third.k}`,
        },
      ]}
      objective={
        <>
          Goal: complete the last column, so the table shows how each rule's vertex comes
          out of the bracket it is written with.
        </>
      }
      prompt="Drag a point into the open row, or tap the point and then the row."
      conclusion={
        <>
          The squared bracket is zero at exactly one input and cannot be negative anywhere
          else, so the whole rule is at its most extreme there. That input is the vertex's
          position, and it is the value that makes the bracket vanish rather than the number
          printed inside it: <InlineMath latex={`\\left(${insideThird}\\right)^{2}`} />{" "}
          turns at <InlineMath latex={`x = ${third.h}`} />. The number added outside is the
          height, unchanged.
        </>
      }
      ariaLabel="A table taking each rule in vertex form to the point its graph turns at"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with different rules"
    />
  );
}
