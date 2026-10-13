/**
 * FUN.4 interactive (slide 3): every feature of one trace, filled in as a features table.
 *
 * Four blanks, and the pairing is the teaching. Two of them ask for a STRETCH and are typed as
 * an interval over the hours; the other two ask about the same turn from opposite sides, the
 * reading it reaches and the hour it reaches it at, so the two numbers of one mark have to be
 * written in two different rows under two different names. A learner who has not separated
 * them fills both with the same number and finds out immediately.
 *
 * The blanks are TYPED rather than chosen from a tray, so the learner produces each value
 * instead of uncovering it, and each row is judged and latched on its own: getting the
 * intervals right and the turn wrong is answered per row rather than with one line about the
 * whole board. The gate needs all four.
 *
 * The two boards turn opposite ways, so the second deals a minimum where the first dealt a
 * maximum, and neither is the chart the check for understanding or the item bank uses.
 */

import { type ReactNode, useState } from "react";

import {
  CIVIC,
  InlineMath,
  interiorTicks,
  LABEL,
  LINE,
  labelHalfH,
  labelHalfW,
  labelSpot,
  PlotLabel,
  plotLabelFrame,
  SIGNAL_DEEP,
  SOFT,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { partName, WidgetPartNote, WidgetPartVerdict } from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";

const PLOT = { left: 46, right: 424, top: 14, bottom: 178 };
const VIEW_H = 216;
const TICK_SIZE = 11;
const LABEL_SIZE = 13;
const LABEL_FRAME = plotLabelFrame(PLOT, 8);

type Mark = readonly [number, number];

/** One blank in the features table. */
interface Row {
  id: string;
  /** The row's name, as the learner reads it. */
  label: string;
  /** The same name spelled out for assistive tech, saying what kind of number is wanted. */
  spoken: string;
  /** A stretch of the input, or a single number. */
  kind: "interval" | "value";
  /** The canonical answer, as the reveal prints it and the learner is asked to type it. */
  answer: string;
  /** Every spelling accepted, already normalized (lowercased, whitespace stripped). */
  accepted: readonly string[];
  /** Why that is the answer, for the reveal. */
  why: ReactNode;
}

interface Board {
  marks: readonly Mark[];
  hours: number;
  readings: number;
  /** The turn's hour and reading, which two of the rows split apart. */
  turnHour: number;
  turnReading: number;
  peak: boolean;
  rows: readonly Row[];
  aria: string;
}

/** The spellings of `(a, b)` a learner may reasonably type, normalized. */
function intervalForms(a: number, b: number): readonly string[] {
  return [`(${a},${b})`, `[${a},${b}]`, `${a}<x<${b}`, `${a}<=x<=${b}`];
}

const BOARDS: readonly Board[] = [
  {
    marks: [
      [0, 2],
      [4, 8],
      [9, 3],
    ],
    hours: 9,
    readings: 10,
    turnHour: 4,
    turnReading: 8,
    peak: true,
    rows: [
      {
        id: "up",
        label: "increasing on",
        spoken: "the stretch of hours the reading is increasing on, in interval notation",
        kind: "interval",
        answer: "(0, 4)",
        accepted: intervalForms(0, 4),
        why: (
          <>
            The reading climbs from the opening mark to the turn, so the stretch runs over
            the hours between them. It is named by its hours, so it starts at{" "}
            <InlineMath latex="0" /> and ends at <InlineMath latex="4" />.
          </>
        ),
      },
      {
        id: "down",
        label: "decreasing on",
        spoken: "the stretch of hours the reading is decreasing on, in interval notation",
        kind: "interval",
        answer: "(4, 9)",
        accepted: intervalForms(4, 9),
        why: (
          <>
            After the turn the reading falls for the rest of the shift, so this stretch runs
            from the turn's hour to the last hour on the chart.
          </>
        ),
      },
      {
        id: "value",
        label: "maximum",
        spoken: "the maximum on the chart, a value off the vertical scale",
        kind: "value",
        answer: "8",
        accepted: ["8"],
        why: (
          <>
            The turn is the highest the pen ever gets, and its reading is read across to the
            vertical scale rather than down to the hours.
          </>
        ),
      },
      {
        id: "hour",
        label: "hour of the maximum",
        spoken: "the hour the maximum is reached at, a value off the horizontal scale",
        kind: "value",
        answer: "4",
        accepted: ["4"],
        why: (
          <>
            The same mark read the other way. Dropping from the turn to the horizontal scale
            gives the hour, which is a different number from the reading above it.
          </>
        ),
      },
    ],
    aria: "A strip chart climbing from a reading of 2 at hour 0 to a peak of 8 at hour 4, then falling to 3 at hour 9",
  },
  {
    marks: [
      [0, 9],
      [3, 1],
      [10, 7],
    ],
    hours: 10,
    readings: 10,
    turnHour: 3,
    turnReading: 1,
    peak: false,
    rows: [
      {
        id: "down",
        label: "decreasing on",
        spoken: "the stretch of hours the reading is decreasing on, in interval notation",
        kind: "interval",
        answer: "(0, 3)",
        accepted: intervalForms(0, 3),
        why: (
          <>
            The reading falls from the opening mark to the turn, so the stretch runs over
            the hours between them and is named by those hours.
          </>
        ),
      },
      {
        id: "up",
        label: "increasing on",
        spoken: "the stretch of hours the reading is increasing on, in interval notation",
        kind: "interval",
        answer: "(3, 10)",
        accepted: intervalForms(3, 10),
        why: (
          <>
            After the turn the reading climbs for the rest of the shift, so this stretch
            runs from the turn's hour to the last hour on the chart.
          </>
        ),
      },
      {
        id: "value",
        label: "minimum",
        spoken: "the minimum on the chart, a value off the vertical scale",
        kind: "value",
        answer: "1",
        accepted: ["1"],
        why: (
          <>
            The turn is the lowest the pen ever gets, and its reading is read across to the
            vertical scale rather than down to the hours.
          </>
        ),
      },
      {
        id: "hour",
        label: "hour of the minimum",
        spoken: "the hour the minimum is reached at, a value off the horizontal scale",
        kind: "value",
        answer: "3",
        accepted: ["3"],
        why: (
          <>
            The same mark read the other way. Dropping from the turn to the horizontal scale
            gives the hour, which is a different number from the reading above it.
          </>
        ),
      },
    ],
    aria: "A strip chart falling from a reading of 9 at hour 0 to a trough of 1 at hour 3, then climbing to 7 at hour 10",
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function GraphFeatureTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <GraphFeatureTableBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function GraphFeatureTableBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [verdicts, setVerdicts] = useState<Record<string, "right" | "wrong">>({});
  const [taught, setTaught] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const openRows = board.rows.filter((row) => verdicts[row.id] !== "right");
  const solved = openRows.length === 0;
  const stuck = board.rows.find((row) => verdicts[row.id] === "wrong") ?? null;

  const mapX = (x: number): number =>
    PLOT.left + (x / board.hours) * (PLOT.right - PLOT.left);
  const mapY = (y: number): number =>
    PLOT.bottom - (y / board.readings) * (PLOT.bottom - PLOT.top);

  /** Settle one row. `earned` is false when the learner was handed the answer. */
  function settle(row: Row, right: boolean, earned: boolean) {
    const next = { ...verdicts, [row.id]: right ? ("right" as const) : ("wrong" as const) };
    setVerdicts(next);
    if (!right) {
      return;
    }
    if (earned) {
      success();
    }
    if (board.rows.every((candidate) => next[candidate.id] === "right") && !done) {
      setDone(true);
      onSolved();
    }
  }

  function check(row: Row) {
    if (verdicts[row.id] === "right") {
      return;
    }
    settle(row, row.accepted.includes(normalize(entries[row.id] ?? "")), true);
  }

  /**
   * Explain one row, and leave it OPEN.
   *
   * It used to latch the row right and write the answer into its box, and both halves were
   * wrong while another row was still outstanding — which is when `othersRemain` hands the
   * board back. The learner got their table returned with the explained row already answered,
   * so the row they were taught was the one row they never produced, and on the last row open
   * that same latch opened the gate on an answer they were given.
   *
   * `fill.entry` shows the answer beside the passage for as long as the passage is up, and it
   * clears with it, so nothing is lost by leaving the row's own state alone.
   */
  function reveal(row: Row) {
    setTaught(row.id);
  }

  const path = board.marks.map((mark) => `${mapX(mark[0])},${mapY(mark[1])}`).join(" ");
  const turnLatex = `(${board.turnHour},\\, ${board.turnReading})`;
  const turnBox = labelSpot({
    x: mapX(board.turnHour),
    y: mapY(board.turnReading),
    frame: LABEL_FRAME,
    dx: 0,
    dy: board.peak ? 1 : -1,
    halfW: labelHalfW(turnLatex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 12,
  });

  const hourTicks = Array.from({ length: board.hours + 1 }, (_unused, at) => at).filter(
    (tick) => tick % 2 === 0,
  );
  /** Every even reading gets a grid line, including the one on the plot's top edge. */
  const readingLines = Array.from(
    { length: board.readings + 1 },
    (_unused, at) => at,
  ).filter((tick) => tick > 0 && tick % 2 === 0);
  /**
   * Which of those may carry a NUMBER, which is fewer: `board.readings` is 10 on both boards,
   * so the top tick lands exactly on the plot's border and its number is centred there, half
   * of it in the margin the "reading" caption is written in. `interiorTicks` is where that
   * rule lives; the same collision was on three of FUN.4's four planes.
   */
  const readingTicks = interiorTicks(readingLines, 0, board.readings);

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        The whole chart is written down. Two of those rows name stretches of hours and two
        name single numbers, and the last two are the same mark read along each scale in
        turn.
      </>
    );
  } else if (stuck !== null) {
    status = (
      <>
        Check what that row is asking for. A stretch is a pair of hours; a reading is one
        value off the vertical scale.
      </>
    );
  } else {
    status = (
      <>
        Fill each row from the chart. A stretch of hours is written as an interval, for
        example <InlineMath latex={"(2,\\, 6)"} />.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--table">
      <WidgetTask>
        Goal: complete all four rows of the features table for this chart, so the two
        stretches are intervals of hours and the turn is reported as a reading and an hour
        separately.
      </WidgetTask>

      <svg viewBox={`0 0 440 ${VIEW_H}`} role="img" aria-label={board.aria}>
        <title>A strip chart with one turn, beside a table of its features</title>

        <rect
          data-plot-frame=""
          x={PLOT.left}
          y={PLOT.top}
          width={PLOT.right - PLOT.left}
          height={PLOT.bottom - PLOT.top}
          rx={6}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1}
        />
        {readingLines.map((tick) => (
          <line
            key={`gy${tick}`}
            x1={PLOT.left}
            y1={mapY(tick)}
            x2={PLOT.right}
            y2={mapY(tick)}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.6}
          />
        ))}
        {hourTicks.map((tick) => (
          <line
            key={`gx${tick}`}
            x1={mapX(tick)}
            y1={PLOT.top}
            x2={mapX(tick)}
            y2={PLOT.bottom}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.6}
          />
        ))}

        <polyline
          points={path}
          fill="none"
          stroke={LABEL}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {board.marks.map((mark) => (
          <circle
            key={`m${mark[0]}`}
            cx={mapX(mark[0])}
            cy={mapY(mark[1])}
            r={4}
            fill={LABEL}
          />
        ))}

        {/* The turn is named only once the whole table is right, so the picture confirms the
            reading rather than supplying it. */}
        {solved && (
          <PlotLabel box={turnBox} latex={turnLatex} fontSize={LABEL_SIZE} color={CIVIC} />
        )}
        <circle
          cx={mapX(board.turnHour)}
          cy={mapY(board.turnReading)}
          r={6}
          fill="none"
          stroke={solved ? CIVIC : SIGNAL_DEEP}
          strokeWidth={2}
        />

        {hourTicks.map((tick) => (
          <text
            key={`tx${tick}`}
            x={mapX(tick)}
            y={PLOT.bottom + 16}
            textAnchor="middle"
            fontSize={TICK_SIZE}
            fill={SOFT}
          >
            {tick}
          </text>
        ))}
        {readingTicks.map((tick) => (
          <text
            key={`ty${tick}`}
            x={PLOT.left - 8}
            y={mapY(tick) + 4}
            textAnchor="end"
            fontSize={TICK_SIZE}
            fill={SOFT}
          >
            {tick}
          </text>
        ))}
        <text
          x={(PLOT.left + PLOT.right) / 2}
          y={VIEW_H - 2}
          textAnchor="middle"
          fontSize={11}
          fill={SOFT}
        >
          hour
        </text>
        <text x={PLOT.left - 8} y={PLOT.top - 2} textAnchor="end" fontSize={11} fill={SOFT}>
          reading
        </text>
      </svg>

      <div className="lesson-interactive__rows">
        {board.rows.map((row) => {
          const verdict = verdicts[row.id] ?? null;
          const settled = verdict === "right";
          return (
            <div key={row.id} className="lesson-interactive__row">
              <div className="lesson-interactive__field" style={{ color: CIVIC }}>
                <span className="lesson-interactive__field-label">{row.label}</span>
                <input
                  className="lesson-interactive__input"
                  type="text"
                  inputMode={row.kind === "value" ? "numeric" : "text"}
                  style={row.kind === "interval" ? { width: 96 } : undefined}
                  disabled={settled}
                  aria-label={partName(row.spoken, verdict)}
                  value={entries[row.id] ?? ""}
                  {...(stuck?.id === row.id ? fill.entry(row.answer) : {})}
                  onChange={(event) =>
                    setEntries((prev) => ({ ...prev, [row.id]: event.target.value }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      check(row);
                    }
                  }}
                />
              </div>
              {/* The mark on EITHER verdict. It used to be drawn only on a row that had
                  landed, so a row that was submitted and missed carried its sentence and no
                  mark, and the row above it carried a tick: on a half-right table the two
                  states were told apart by one of them having something to read. */}
              {verdict !== null && <WidgetPartVerdict verdict={verdict} />}
              {settled ? null : (
                <button
                  type="button"
                  className="lesson-interactive__check lesson-interactive__check--part"
                  onClick={() => check(row)}
                >
                  Check
                </button>
              )}
              {verdict === "wrong" && (
                <WidgetPartNote>
                  {row.kind === "interval"
                    ? "Not yet. A stretch is written from the hour it starts at to the hour it ends at, in round brackets."
                    : "Not yet. Read that number off the scale the row names, and check you have not given the other one."}
                </WidgetPartNote>
              )}
            </div>
          );
        })}
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different chart
        </button>
      )}

      <WidgetReveal
        available={stuck !== null && !solved}
        revealed={taught !== null && taught === stuck?.id}
        // Live: the other rows are still the learner's to fill, so one explained row must not
        // spend a table they are part way through. False once this is the last row open.
        othersRemain={openRows.length > 1}
        answer={stuck === null ? null : <InlineMath latex={stuck.answer} />}
        why={stuck === null ? null : stuck.why}
        onReveal={() => {
          if (stuck !== null) {
            reveal(stuck);
          }
        }}
        // Named by the row it is about. Four rows are live at once and "Reveal that row" was
        // true of any of them.
        label={
          stuck === null ? "Reveal that row" : `Reveal the row asking for ${stuck.label}`
        }
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : stuck !== null ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
