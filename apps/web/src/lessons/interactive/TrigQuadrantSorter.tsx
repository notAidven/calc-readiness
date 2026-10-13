/**
 * TRG.3 slide 1: which quadrant a heading lands in, and what that does to the sign.
 *
 * The slide's claim is that the quadrant settles the sign before any value is worked out, so
 * the board is four headings and the same call under each of them. Making the call four times
 * is what separates the rule from the four answers: a learner who has only seen one heading
 * has a fact, and a learner who has sorted four has a way of deciding the fifth.
 *
 * Each board asks about ONE function, named in its objective, and the two boards ask about
 * different ones. That is deliberate: a board mixing sine and cosine rows would let the
 * learner sort by the row's leading symbol rather than by where the terminal side lands, and
 * a learner who only ever met cosine would take "the left half is negative" as the whole rule.
 *
 * Built on `BinaryRowSort`, which owns the mechanic, the lock on a wrong tap, the marks a
 * settled row keeps and the board's single reveal.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

/** The two calls on offer under every row, in the order they are drawn. */
const CALLS = ["Positive", "Negative"] as const;

interface Board {
  /** The function every row on this board is about, for the objective and the closing line. */
  fn: "sine" | "cosine";
  rows: readonly BinaryRow[];
}

/** Which quadrant a heading strictly inside one lands in. */
function quadrantOf(heading: number): "I" | "II" | "III" | "IV" {
  if (heading < 90) {
    return "I";
  }
  if (heading < 180) {
    return "II";
  }
  if (heading < 270) {
    return "III";
  }
  return "IV";
}

/**
 * One heading, as a row about the named function.
 *
 * The quadrant and the coordinate the call was really about are the row's `note` and its
 * `why`, not a second spelling of the expression: the heading in the first column is what the
 * learner answered about and it stays there. See `BinaryRowSort`'s docstring.
 */
function row(fn: "sine" | "cosine", heading: number): BinaryRow {
  const quadrant = quadrantOf(heading);
  const across = quadrant === "I" || quadrant === "II";
  const along = quadrant === "I" || quadrant === "IV";
  const positive = fn === "sine" ? across : along;
  const symbol = fn === "sine" ? "\\sin" : "\\cos";
  const coordinate = fn === "sine" ? "y" : "x";
  const side =
    fn === "sine"
      ? across
        ? "above the horizontal axis"
        : "below the horizontal axis"
      : along
        ? "right of the vertical axis"
        : "left of the vertical axis";
  return {
    id: `${fn}-${heading}`,
    latex: `${symbol} ${heading}^{\\circ}`,
    spoken: `${fn} of ${heading} degrees`,
    first: positive,
    note: `The terminal side lands in Quadrant ${quadrant}, which is ${side}.`,
    why: (
      <>
        A heading of <InlineMath latex={`${heading}^{\\circ}`} /> puts the terminal side in
        Quadrant {quadrant}, so the point where it crosses the unit circle sits {side}. The{" "}
        {fn} of a heading IS that point's <InlineMath latex={coordinate} />, so it comes out{" "}
        {positive ? "positive" : "negative"} here without any value being worked out.
      </>
    ),
  };
}

/**
 * Two boards, one per function, and neither repeats a heading from the other. Each carries
 * one heading from each quadrant, in a scrambled order, so the board cannot be sorted by
 * reading down the column and alternating.
 *
 * The first two rows are not free, and the rest are. Every board built on this kind opens
 * positive-then-negative, which `BinaryRow.first` states and `binaryRowMarks` asserts as its
 * own precondition; the previous order here opened the other way round and failed there. The
 * two rows AFTER that are what carries the claim above, and they are deliberately the same
 * call twice (positive, negative, negative, positive), because the order this shipped as was
 * itself an alternation, so the sentence above was describing a board nobody had.
 */
const BOARDS: readonly Board[] = [
  {
    fn: "cosine",
    rows: [row("cosine", 340), row("cosine", 160), row("cosine", 250), row("cosine", 55)],
  },
  {
    fn: "sine",
    rows: [row("sine", 100), row("sine", 210), row("sine", 320), row("sine", 35)],
  },
];

export function TrigQuadrantSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const coordinate = board.fn === "sine" ? "y" : "x";
  const half =
    board.fn === "sine"
      ? "the top half of the circle from the bottom half"
      : "the right half of the circle from the left half";

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective={`Decide for each of these four headings whether the ${board.fn} of it comes out positive or negative, without working out a single value.`}
      options={CALLS}
      rows={board.rows}
      prompt="Find the quadrant the heading lands in, then ask which side of the axes that puts the point on."
      conclusion={
        <>
          The {board.fn} of a heading is the <InlineMath latex={coordinate} /> of the point
          where its terminal side crosses the unit circle, so the sign is settled by which
          quadrant that point is in. That is what separates {half}, and it is decided before
          any value is worked out.
        </>
      }
      missedNote="That is all four called, so you are good to carry on. Every row you missed says why just underneath it, and the working is there if you want it."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="New set of four headings"
      missedRestartLabel="Try a fresh set"
    />
  );
}
