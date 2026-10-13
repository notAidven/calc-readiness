/**
 * FUN.5 interactive (slide 2): the sign the subtraction hands back.
 *
 * A shift is broken into four consecutive windows and two of them are already worked, one
 * rising and one falling, so the pattern on offer is not "always positive". The learner fills
 * the two blank windows, and one of those falls as well: the misconception this slide exists
 * for is reading the SIZE of the gap and dropping its direction, so the tray carries the
 * sign-flipped twin of every answer next to the answer itself, and the raw change before it
 * was divided by the hours.
 *
 * Built on `FillTable` because the argument is "the same move, applied again" and the worked
 * rows have to stay on screen beside the row being written. The archetype brings the badge,
 * the reveal, the hand-back and the restart.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  /** What the recorder was tracking, for the accessible name. */
  what: string;
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
}

const BOARDS: readonly Board[] = [
  {
    what: "coolant flow",
    rows: [
      {
        id: "a1",
        fixed: ["0 \\text{ to } 2", "8", "14"],
        value: "3",
        blank: false,
        spoken: "hour 0 to hour 2",
      },
      {
        id: "a2",
        fixed: ["2 \\text{ to } 6", "14", "6"],
        value: "-2",
        blank: false,
        spoken: "hour 2 to hour 6",
      },
      {
        id: "a3",
        fixed: ["6 \\text{ to } 9", "6", "21"],
        value: "5",
        blank: true,
        spoken: "hour 6 to hour 9",
        why: (
          <>
            The reading climbs from <InlineMath latex="6" /> to <InlineMath latex="21" />,
            which is a change of <InlineMath latex="15" />, and the window is{" "}
            <InlineMath latex="3" /> hours long, so <InlineMath latex="\dfrac{15}{3} = 5" />{" "}
            units in each hour.
          </>
        ),
      },
      {
        id: "a4",
        fixed: ["9 \\text{ to } 12", "21", "9"],
        value: "-4",
        blank: true,
        spoken: "hour 9 to hour 12",
        why: (
          <>
            The reading ends at <InlineMath latex="9" /> having started at{" "}
            <InlineMath latex="21" />, so the change is <InlineMath latex="9 - 21 = -12" />{" "}
            across <InlineMath latex="3" /> hours, and{" "}
            <InlineMath latex="\dfrac{-12}{3} = -4" />. Reporting the size of the drop alone
            would turn a fall into a rise.
          </>
        ),
      },
    ],
    options: [
      { id: "a-5", latex: "5", spoken: "5 units per hour" },
      { id: "a-neg4", latex: "-4", spoken: "negative 4 units per hour" },
      { id: "a-neg5", latex: "-5", spoken: "negative 5 units per hour" },
      { id: "a-4", latex: "4", spoken: "4 units per hour" },
      { id: "a-15", latex: "15", spoken: "15 units per hour" },
      { id: "a-neg12", latex: "-12", spoken: "negative 12 units per hour" },
    ],
  },
  {
    what: "chamber pressure",
    rows: [
      {
        id: "b1",
        fixed: ["0 \\text{ to } 3", "20", "32"],
        value: "4",
        blank: false,
        spoken: "hour 0 to hour 3",
      },
      {
        id: "b2",
        fixed: ["3 \\text{ to } 5", "32", "26"],
        value: "-3",
        blank: false,
        spoken: "hour 3 to hour 5",
      },
      {
        id: "b3",
        fixed: ["5 \\text{ to } 9", "26", "50"],
        value: "6",
        blank: true,
        spoken: "hour 5 to hour 9",
        why: (
          <>
            The reading climbs from <InlineMath latex="26" /> to <InlineMath latex="50" />,
            a change of <InlineMath latex="24" /> spread over the <InlineMath latex="4" />{" "}
            hours of the window, so <InlineMath latex="\dfrac{24}{4} = 6" /> units in each
            hour.
          </>
        ),
      },
      {
        id: "b4",
        fixed: ["9 \\text{ to } 12", "50", "35"],
        value: "-5",
        blank: true,
        spoken: "hour 9 to hour 12",
        why: (
          <>
            The reading ends at <InlineMath latex="35" /> having started at{" "}
            <InlineMath latex="50" />, so the change is <InlineMath latex="35 - 50 = -15" />{" "}
            across <InlineMath latex="3" /> hours, and{" "}
            <InlineMath latex="\dfrac{-15}{3} = -5" />. Dropping the direction would report
            a rise where the trace in fact fell.
          </>
        ),
      },
    ],
    options: [
      { id: "b-6", latex: "6", spoken: "6 units per hour" },
      { id: "b-neg5", latex: "-5", spoken: "negative 5 units per hour" },
      { id: "b-neg6", latex: "-6", spoken: "negative 6 units per hour" },
      { id: "b-5", latex: "5", spoken: "5 units per hour" },
      { id: "b-24", latex: "24", spoken: "24 units per hour" },
      { id: "b-neg15", latex: "-15", spoken: "negative 15 units per hour" },
    ],
  },
];

function boardAt(index: number): Board {
  return BOARDS[index] ?? (BOARDS[0] as Board);
}

export function AverageRateTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = boardAt(variant.index);
  return (
    <FillTable
      key={variant.nonce}
      headings={["Hours", "Reading at the start", "Reading at the end", "Units per hour"]}
      rows={board.rows}
      options={board.options}
      objective="Goal: the average rate of change for each of the two unfilled windows, sign included."
      prompt="The first two windows are worked. Fill the rest from the top down."
      conclusion="Every window keeps the sign of its own subtraction: a window that ends lower than it started reports a negative rate, however large the drop was."
      ariaLabel={`Average rate of change of ${board.what} across four consecutive windows of one shift`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different shift"
    />
  );
}
