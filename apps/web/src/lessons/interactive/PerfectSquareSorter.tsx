/**
 * POL.2 slide 4: call each trinomial a perfect square or not, one row at a time.
 *
 * The shape is recognised by three conditions and mis-recognised by two, so the rows are built
 * to separate them: every row has square outer terms, and only some have a middle term equal to
 * twice the product of their roots. A learner reading the ends alone gets exactly half of them
 * right, which is the point of putting four side by side rather than asking about one.
 *
 * A wrong call locks the row, because with two options a nudge-and-retry is not a question. The
 * board still opens once every row has been CALLED, so a miss on the first row does not send a
 * learner back through the three they already knew.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { BinaryRowSort } from "./kinds/BinaryRowSort";

interface Row {
  /** The trinomial is $x^{2} + bx + r^{2}$; it is a square exactly when $b = 2r$. */
  r: number;
  b: number;
}

interface Board {
  rows: readonly [Row, Row, Row, Row];
}

/**
 * Two squares and two near misses per board, and the near misses are near: the middle term is
 * off by a small amount rather than obviously wrong, so the test has to be done rather than
 * eyeballed.
 */
const BOARDS: readonly Board[] = [
  {
    rows: [
      { r: 5, b: 10 },
      { r: 3, b: 8 },
      { r: 7, b: 14 },
      { r: 4, b: 9 },
    ],
  },
  {
    rows: [
      { r: 6, b: 13 },
      { r: 2, b: 4 },
      { r: 8, b: 16 },
      { r: 9, b: 17 },
    ],
  },
];

export function PerfectSquareSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective={
        <>
          Goal: decide for each of these four whether its two sides are identical, using the
          middle term rather than the ends.
        </>
      }
      options={["a perfect square", "not a perfect square"]}
      rows={board.rows.map(({ r, b }) => {
        const square = b === 2 * r;
        return {
          id: `r${r}b${b}`,
          latex: `x^{2} + ${b}x + ${r * r}`,
          spoken: `x squared plus ${b} x plus ${r * r}`,
          first: square,
          note: square ? (
            <>
              Twice <InlineMath latex={`${r}`} /> really is <InlineMath latex={`${b}`} />,
              so this one is a square and the call was the other way round.
            </>
          ) : (
            <>
              Twice <InlineMath latex={`${r}`} /> is <InlineMath latex={`${2 * r}`} /> and
              the middle term here is <InlineMath latex={`${b}`} />, so the two sides cannot
              be identical.
            </>
          ),
          why: square ? (
            <>
              The end term <InlineMath latex={`${r * r}`} /> is{" "}
              <InlineMath latex={`${r}^{2}`} />, and the middle term is twice{" "}
              <InlineMath latex={`${r}`} />, which is exactly the condition. So both sides
              are <InlineMath latex={`x + ${r}`} /> and the trinomial is{" "}
              <InlineMath latex={`(x + ${r})^{2}`} />.
            </>
          ) : (
            <>
              The end term <InlineMath latex={`${r * r}`} /> is{" "}
              <InlineMath latex={`${r}^{2}`} />, so the ends are square and the shape looks
              right. The middle term would have to be <InlineMath latex={`${2 * r}x`} /> for
              the two sides to be identical, and it is <InlineMath latex={`${b}x`} />, so
              this one is not a square at all.
            </>
          ),
        };
      })}
      prompt="Call each row, using the two buttons under it. A row locks on its first call."
      conclusion={
        <>
          Square ends are not enough on their own, and the middle term is what settles it: a
          perfect square trinomial has a middle term equal to twice the product of the two
          roots. Recognising the shape is a shortcut rather than a requirement, since the
          pair search finds the same two identical sides anyway.
        </>
      }
      missedNote="Two rows on this board have square ends and are not squares, so the middle term is the only thing that separates them."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with four new trinomials"
      missedRestartLabel="Try a fresh set of four"
    />
  );
}
