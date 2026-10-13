/**
 * TRG.3 slide 2: the reference angle, filled in one row at a time.
 *
 * The reference angle is a table rather than a single question because the point of it is
 * that three headings in three different quadrants share one acute angle back to the
 * horizontal axis, and that is a comparison: the rows have to be on screen together or
 * "the same angle turns up again" is a claim about one heading.
 *
 * The opening row is given, so what the table hands over is the MOVE (measure back to the
 * nearer end of the horizontal axis) rather than the verdict. Neither board reuses the
 * heading the dialogue names, and every distractor on offer is a real slip: the quadrant
 * three heading paired with the quadrant two subtraction, and the quadrant four heading
 * paired with the quadrant three one.
 *
 * Built on `FillTable`, which owns the tray, the blanks and the board's reveal.
 *
 * ## The filled column is headed with the TERM, not with a description of it
 *
 * It used to read "angle back to the horizontal axis". `FillTable` renders `headings` into
 * `<th scope="col">`, so that was both the visible name of the column and the announced one,
 * and no other learner-visible string on the board carried the word either — not the objective,
 * not the aria-label, not the restart. TRG.3's own prose says "reference angle" six times and
 * every sibling widget touching the idea names it, so the one board where a learner PRODUCES
 * reference angles for the first time was the one board that refused to call them that. A
 * multi-word phrase built round a verb is a paraphrase and not a term (R21), and a learner who
 * finished this slide fluent at the move and without the word then met "the reference angle is
 * 45 degrees" as a draggable chip on TRG.8 with no way to know it named the thing they had
 * already worked out three times. The description survives as the gloss beside the term rather
 * than in its place.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
  /** The acute angle the board's three headings all come back to. */
  shared: number;
}

const QUADRANT_NAMES = ["I", "II", "III", "IV"] as const;

/** Which quadrant a heading strictly inside one lands in, as a numeral. */
function quadrantOf(heading: number): (typeof QUADRANT_NAMES)[number] {
  return QUADRANT_NAMES[Math.floor(heading / 90)] ?? "I";
}

/** The acute angle back to the nearer end of the horizontal axis. */
function referenceOf(heading: number): number {
  if (heading < 90) {
    return heading;
  }
  if (heading < 180) {
    return 180 - heading;
  }
  if (heading < 270) {
    return heading - 180;
  }
  return 360 - heading;
}

/** How the subtraction reads for the quadrant a heading is in. */
function subtraction(heading: number): string {
  if (heading < 90) {
    return `${heading}^{\\circ}`;
  }
  if (heading < 180) {
    return `180^{\\circ} - ${heading}^{\\circ}`;
  }
  if (heading < 270) {
    return `${heading}^{\\circ} - 180^{\\circ}`;
  }
  return `360^{\\circ} - ${heading}^{\\circ}`;
}

function row(heading: number, blank: boolean): TableRow {
  const quadrant = quadrantOf(heading);
  const reference = referenceOf(heading);
  return {
    id: `ref-${heading}`,
    fixed: [`${heading}^{\\circ}`, `\\text{Quadrant ${quadrant}}`],
    value: `${reference}^{\\circ}`,
    blank,
    spoken: `a heading of ${heading} degrees, in quadrant ${quadrant}`,
    why: (
      <>
        In Quadrant {quadrant} the nearer end of the horizontal axis is reached by{" "}
        <InlineMath latex={`${subtraction(heading)} = ${reference}^{\\circ}`} />, so that is
        the reference angle, and it is what the sine and cosine of{" "}
        <InlineMath latex={`${heading}^{\\circ}`} /> are read off, sign apart.
      </>
    ),
  };
}

function choice(degrees: number): { id: string; latex: string; spoken: string } {
  return {
    id: `deg-${degrees}`,
    latex: `${degrees}^{\\circ}`,
    spoken: `${degrees} degrees`,
  };
}

/**
 * Two boards, and no heading appears on both. Each opens with a given quadrant two row and
 * asks for a quadrant three and a quadrant four one, so the learner meets both subtractions
 * that are easy to run in the wrong direction. On each board TWO of the three headings come
 * back to the same acute angle, which is the comparison the table exists to make; a board on
 * which all three agreed would let the second blank be copied from the first.
 */
const BOARDS: readonly Board[] = [
  {
    rows: [row(150, false), row(210, true), row(300, true)],
    options: [choice(30), choice(45), choice(60), choice(120), choice(150)],
    shared: 30,
  },
  {
    rows: [row(135, false), row(240, true), row(315, true)],
    options: [choice(45), choice(60), choice(30), choice(120), choice(135)],
    shared: 45,
  },
];

export function TrigReferenceTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      headings={["heading", "quadrant it lands in", "reference angle"]}
      rows={board.rows}
      options={board.options}
      objective="Goal: finish the reference angle column for each heading, so the table gives the acute angle each one comes back to against the horizontal axis rather than the turn it made from the start line."
      prompt="Measure from the heading to the NEARER end of the horizontal axis, not from where the turn began."
      conclusion={
        <>
          Every heading here has a reference angle, the acute angle it comes back to against
          the horizontal axis, and it is that angle the exact values are read off. Which
          quadrant a heading is in decides only the direction the subtraction runs, and then
          the sign that gets attached: a reference angle of{" "}
          <InlineMath latex={`${board.shared}^{\\circ}`} /> turns up again from more than
          one heading, with the same magnitude every time.
        </>
      }
      ariaLabel="Three headings, the quadrant each lands in, and the reference angle of each: the acute angle it makes with the horizontal axis"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with different headings"
    />
  );
}
