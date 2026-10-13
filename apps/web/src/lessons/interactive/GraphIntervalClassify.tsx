/**
 * FUN.4 interactive (slide 0): increasing and decreasing are properties of an INTERVAL OF THE
 * INPUT, and one trace does different things on different intervals.
 *
 * The board is a strip chart broken into its legs, and the chips the learner picks a leg by
 * are labelled with the leg's INTERVAL rather than with a letter or a position. That is the
 * whole reason the widget exists: the thing being classified has to arrive already named as a
 * stretch of hours, so "increasing on $(0,\, 3)$" is the shape of the answer before the
 * learner has said anything. Every leg has to be called, and the gate needs all of them right.
 *
 * A wrong call LOCKS that leg, which is what makes a three-option question a question. The
 * standing right answer then appears beside it in the amber that is not a verdict on anybody,
 * because green there would credit a pick the learner never made.
 *
 * Both boards carry a LEVEL leg, which is the case a learner is likeliest to file under one of
 * the other two, and neither board is used by the check for understanding or the item bank.
 */

import { type ReactNode, useState } from "react";

import {
  BRICK,
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
import { WidgetBeside } from "../widgetBeside";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

/* -------------------------------------------------------------------------- */
/* The chart                                                                    */
/* -------------------------------------------------------------------------- */

const PLOT = { left: 46, right: 424, top: 14, bottom: 190 };
const VIEW_H = 228;
const TICK_SIZE = 11;
const LABEL_SIZE = 13;
const LABEL_FRAME = plotLabelFrame(PLOT, 8);

/** One recorded mark: the hour, and the reading at it. */
type Mark = readonly [number, number];

type Verdict = "up" | "down" | "level";

/** The three calls, in one fixed order, all rendered in the same neutral token. */
const CALLS: readonly { id: Verdict; label: string; spoken: string }[] = [
  { id: "up", label: "Increasing", spoken: "increasing on this stretch" },
  { id: "down", label: "Decreasing", spoken: "decreasing on this stretch" },
  { id: "level", label: "Constant", spoken: "constant on this stretch" },
];

const CALL_WORD: Record<Verdict, string> = {
  up: "increasing",
  down: "decreasing",
  level: "constant",
};

interface Board {
  marks: readonly Mark[];
  hours: number;
  readings: number;
  aria: string;
}

const BOARDS: readonly Board[] = [
  {
    marks: [
      [0, 2],
      [3, 8],
      [6, 8],
      [10, 3],
    ],
    hours: 10,
    readings: 10,
    aria: "A strip chart climbing from a reading of 2 at hour 0 to 8 at hour 3, holding at 8 until hour 6, then falling to 3 at hour 10",
  },
  {
    marks: [
      [0, 9],
      [2, 4],
      [5, 4],
      [8, 11],
      [12, 6],
    ],
    hours: 12,
    readings: 12,
    aria: "A strip chart falling from a reading of 9 at hour 0 to 4 at hour 2, holding at 4 until hour 5, climbing to 11 at hour 8, then falling to 6 at hour 12",
  },
];

/** One leg of the run: the interval it covers, and what the readings do across it. */
interface Leg {
  id: string;
  from: number;
  to: number;
  fromY: number;
  toY: number;
  verdict: Verdict;
  latex: string;
}

function legsOf(board: Board): readonly Leg[] {
  return board.marks.slice(1).map((mark, index) => {
    const previous = board.marks[index] as Mark;
    return {
      id: `${previous[0]}-${mark[0]}`,
      from: previous[0],
      to: mark[0],
      fromY: previous[1],
      toY: mark[1],
      verdict: mark[1] > previous[1] ? "up" : mark[1] < previous[1] ? "down" : "level",
      latex: `(${previous[0]},\\, ${mark[0]})`,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* The widget                                                                   */
/* -------------------------------------------------------------------------- */

export function GraphIntervalClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <GraphIntervalClassifyBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function GraphIntervalClassifyBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const legs = legsOf(board);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [calls, setCalls] = useState<Record<string, Verdict>>({});
  const [taught, setTaught] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const selected = legs.find((leg) => leg.id === selectedId) ?? null;
  const uncalled = legs.filter((leg) => calls[leg.id] === undefined);
  const missedLeg =
    legs.find((leg) => {
      const call = calls[leg.id];
      return call !== undefined && call !== leg.verdict;
    }) ?? null;
  const finished = uncalled.length === 0;
  const solved = finished && missedLeg === null;

  const mapX = (x: number): number =>
    PLOT.left + (x / board.hours) * (PLOT.right - PLOT.left);
  const mapY = (y: number): number =>
    PLOT.bottom - (y / board.readings) * (PLOT.bottom - PLOT.top);

  function call(verdict: Verdict) {
    if (selected === null || calls[selected.id] !== undefined) {
      return;
    }
    const next = { ...calls, [selected.id]: verdict };
    setCalls(next);
    setSelectedId(null);
    if (verdict === selected.verdict) {
      success();
    }
    const allIn = legs.every((leg) => next[leg.id] !== undefined);
    const allRight = legs.every((leg) => next[leg.id] === leg.verdict);
    if (allIn && allRight && !done) {
      setDone(true);
      onSolved();
    }
  }

  /* The pen's path, and the leg currently being looked at drawn thicker. */
  const path = board.marks.map((mark) => `${mapX(mark[0])},${mapY(mark[1])}`).join(" ");

  /* Each called leg carries its verdict word on the plot, placed rather than nudged. */
  const placed: { x: number; y: number; halfW: number; halfH: number }[] = [];
  const legLabels = legs.flatMap((leg) => {
    const answered = calls[leg.id];
    if (answered === undefined) {
      return [];
    }
    const right = answered === leg.verdict;
    const latex = `\\text{${CALL_WORD[leg.verdict]}}`;
    const box = labelSpot({
      x: (mapX(leg.from) + mapX(leg.to)) / 2,
      y: (mapY(leg.fromY) + mapY(leg.toY)) / 2,
      frame: LABEL_FRAME,
      dx: 0,
      dy: leg.verdict === "down" ? 1 : -1,
      halfW: labelHalfW(latex, LABEL_SIZE),
      halfH: labelHalfH(LABEL_SIZE),
      gap: 12,
      avoid: [...placed],
    });
    placed.push(box);
    return [{ id: leg.id, box, latex, color: right ? CIVIC : SIGNAL_DEEP }];
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
   * Which of those may carry a NUMBER, which is fewer: `board.readings` is even on both
   * boards, so the top tick lands exactly on the plot's border and its number is centred
   * there, half of it in the margin the "reading" caption is written in. That is the
   * collision `interiorTicks` exists to stop, stated once in `svgKit` rather than fixed by
   * nudging either label out of the other's way.
   */
  const readingTicks = interiorTicks(readingLines, 0, board.readings);

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Every leg called. A stretch is named by its INPUT values, so each answer here is an
        interval of hours and never a reading.
      </>
    );
  } else if (finished && missedLeg !== null) {
    status = (
      <>
        Every leg is called, and the call on <InlineMath latex={missedLeg.latex} /> is not
        what the chart does across it. The reveal explains that leg, and starting over deals
        a fresh chart for a clean run.
      </>
    );
  } else if (missedLeg !== null) {
    status = (
      <>
        Not that one for <InlineMath latex={missedLeg.latex} />. Compare only the two
        readings at the ends of a leg, taking the earlier mark first.
      </>
    );
  } else if (selected !== null) {
    status = (
      <>
        Across <InlineMath latex={selected.latex} />, do the readings climb, fall, or hold
        steady?
      </>
    );
  } else {
    status = "Choose a stretch of hours, then call what the reading does across it.";
  }

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <WidgetTask>
        Goal: call every stretch of hours on this chart increasing, decreasing or constant.
        A wrong call settles that stretch, so the chart passes only when all of them are
        right.
      </WidgetTask>

      <WidgetBeside
        figure={
          <svg viewBox={`0 0 440 ${VIEW_H}`} role="img" aria-label={board.aria}>
            <title>A strip chart broken into stretches of hours</title>

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

            {/* The stretch under consideration, shaded, so the interval on the chips is the
            interval on the chart. */}
            {selected !== null && (
              <rect
                x={mapX(selected.from)}
                y={PLOT.top}
                width={mapX(selected.to) - mapX(selected.from)}
                height={PLOT.bottom - PLOT.top}
                fill={SIGNAL_DEEP}
                fillOpacity={0.12}
              />
            )}

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

            {legLabels.map((entry) => (
              <PlotLabel
                key={`lab${entry.id}`}
                box={entry.box}
                latex={entry.latex}
                fontSize={LABEL_SIZE}
                color={entry.color}
              />
            ))}

            {/* Axis numbers live in the MARGIN, outside the plot rect, so they are captions
            rather than text drawn on the grid. */}
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
            <text
              x={PLOT.left - 8}
              y={PLOT.top - 2}
              textAnchor="end"
              fontSize={11}
              fill={SOFT}
            >
              reading
            </text>
          </svg>
        }
      >
        <div className="lesson-interactive__controls">
          {legs.map((leg) => {
            const answered = calls[leg.id];
            const right = answered !== undefined && answered === leg.verdict;
            const wrong = answered !== undefined && answered !== leg.verdict;
            return (
              <button
                key={leg.id}
                type="button"
                className="lesson-interactive__chip"
                data-state={right ? "solved" : wrong ? "wrong" : undefined}
                disabled={answered !== undefined}
                aria-label={
                  answered === undefined
                    ? `the stretch from hour ${leg.from} to hour ${leg.to}`
                    : `the stretch from hour ${leg.from} to hour ${leg.to}, ${
                        right ? "called correctly" : `called ${CALL_WORD[answered]}, wrong`
                      }`
                }
                style={{
                  color: right ? CIVIC : wrong ? BRICK : LABEL,
                  borderColor: right ? CIVIC : wrong ? BRICK : LINE,
                }}
                onClick={() => setSelectedId(leg.id)}
              >
                <InlineMath latex={leg.latex} />
                {answered === undefined ? null : (
                  <span aria-hidden="true" className="lesson-classify__mark">
                    {right ? "\u2713" : "\u2717"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className="lesson-interactive__controls">
            {CALLS.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="lesson-interactive__step"
                style={{ color: LABEL, borderColor: LINE }}
                aria-label={`call it ${choice.spoken}`}
                onClick={() => call(choice.id)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}

        {finished && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different chart
          </button>
        )}

        <WidgetReveal
          available={missedLeg !== null && !solved}
          revealed={taught !== null && taught === missedLeg?.id}
          // Live: the other legs are still the learner's to call while any remain uncalled, so
          // one explained leg must not cost them the board they are part way through.
          othersRemain={uncalled.length > 0}
          answer={
            missedLeg === null ? null : (
              <>
                <InlineMath latex={missedLeg.latex} /> is {CALL_WORD[missedLeg.verdict]}
              </>
            )
          }
          why={
            missedLeg === null ? null : (
              <>
                Across that stretch the reading goes from{" "}
                <InlineMath latex={String(missedLeg.fromY)} /> at hour{" "}
                <InlineMath latex={String(missedLeg.from)} /> to{" "}
                <InlineMath latex={String(missedLeg.toY)} /> at hour{" "}
                <InlineMath latex={String(missedLeg.to)} />, so the later reading is the{" "}
                {missedLeg.verdict === "up"
                  ? "larger of the two and the trace climbs"
                  : missedLeg.verdict === "down"
                    ? "smaller of the two and the trace falls"
                    : "same as the earlier one and the trace holds level"}
                . The stretch is named by its hours, not by those readings.
              </>
            )
          }
          onReveal={() => setTaught(missedLeg?.id ?? null)}
          label="Reveal what that stretch does"
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : missedLeg !== null ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {status}
        </p>
      </WidgetBeside>
    </div>
  );
}
