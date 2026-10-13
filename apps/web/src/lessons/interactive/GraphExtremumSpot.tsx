/**
 * FUN.4 interactive (slide 1): an extremum is a VALUE, and the input it is reached at is a
 * different number with a different name.
 *
 * The board is a shift report somebody else has already written, with one line wrong, and the
 * line that is wrong is the one that reports the peak as the HOUR it happened at. That is the
 * characteristic miss of this node, so the learner meets it as a mistake already made, in a
 * report that otherwise reads perfectly well, which is how they will meet it in their own
 * writing.
 *
 * Two answers, in order: flag the line, then choose what it should have said. The gate turns
 * on the second, and the two wrong replacements are the other two numbers on the chart, so
 * picking by "which number have I not used yet" does not work.
 *
 * Neither chart is used by the check for understanding or the item bank.
 */

import { Fragment, type ReactNode, useState } from "react";

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
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

const PLOT = { left: 46, right: 424, top: 14, bottom: 178 };
const VIEW_H = 216;
const TICK_SIZE = 11;
const LABEL_SIZE = 13;
const LABEL_FRAME = plotLabelFrame(PLOT, 8);

type Mark = readonly [number, number];

/**
 * One run of a report line: prose as written, or a number to typeset.
 *
 * An ordered list rather than a `before` / `value` / `after` triple, because a triple can hold
 * exactly ONE typeset number and these sentences name two hours. The second was stranded in
 * the `after` prose as a bare digit beside a KaTeX one, which is the defect this shape fixes.
 */
type Run = string | number;

/** One line of the written report. Exactly one carries `wrong`. */
interface ReportLine {
  id: string;
  /**
   * The sentence in order, each string carrying its OWN spaces where one is wanted.
   *
   * Not spaced by the JSX, because a line whose number ends the sentence takes only its full
   * stop and a space in front of that reads as "the shift is 6 ." The space used to be
   * invisible for the opposite reason: a whitespace-only run is not a flex item, so the old
   * `inline-flex` button dropped it and printed "the shift is6."
   */
  runs: readonly Run[];
  spoken: string;
  wrong?: boolean;
  /** Why this line is fine, said only when it is flagged by mistake. */
  fine?: string;
}

interface Board {
  marks: readonly Mark[];
  hours: number;
  readings: number;
  /** Whether the turn is a peak (true) or a trough. */
  peak: boolean;
  /** The hour and the reading at the turn, which is what the report gets confused. */
  turnHour: number;
  turnReading: number;
  lines: readonly ReportLine[];
  /** The replacement numbers on offer, the first correct one marked. */
  fixes: readonly { id: string; value: number; correct?: boolean; miss?: string }[];
  aria: string;
}

const BOARDS: readonly Board[] = [
  {
    marks: [
      [0, 1],
      [6, 7],
      [10, 2],
    ],
    hours: 10,
    readings: 8,
    peak: true,
    turnHour: 6,
    turnReading: 7,
    lines: [
      {
        id: "climb",
        runs: ["The trace climbs from hour ", 0, " to hour ", 6, "."],
        spoken: "the trace climbs from hour 0 to hour 6",
        fine: "That line reads the chart correctly: the pen does climb from the first mark to the turn.",
      },
      {
        id: "peak",
        runs: ["The highest reading of the shift is ", 6, "."],
        spoken: "the highest reading of the shift is 6",
        wrong: true,
      },
      {
        id: "fall",
        runs: ["After the turn the trace falls to ", 2, " by the end of the shift."],
        spoken: "after the turn the trace falls to 2 by the end of the shift",
        fine: "That line reads the chart correctly: the last mark really does sit at that reading.",
      },
    ],
    fixes: [
      { id: "seven", value: 7, correct: true },
      {
        id: "ten",
        value: 10,
        miss: "That is the last hour of the shift, so it is another input rather than a reading.",
      },
      {
        id: "one",
        value: 1,
        miss: "That is the reading the shift opened on, which the pen climbed away from.",
      },
    ],
    aria: "A strip chart climbing from a reading of 1 at hour 0 to a peak at hour 6, then falling to 2 at hour 10",
  },
  {
    marks: [
      [0, 6],
      [4, 1],
      [9, 8],
    ],
    hours: 9,
    readings: 9,
    peak: false,
    turnHour: 4,
    turnReading: 1,
    lines: [
      {
        id: "fall",
        runs: ["The trace falls from hour ", 0, " to hour ", 4, "."],
        spoken: "the trace falls from hour 0 to hour 4",
        fine: "That line reads the chart correctly: the pen does fall from the first mark to the turn.",
      },
      {
        id: "trough",
        runs: ["The lowest reading of the shift is ", 4, "."],
        spoken: "the lowest reading of the shift is 4",
        wrong: true,
      },
      {
        id: "climb",
        runs: ["After the turn the trace climbs to ", 8, " by the end of the shift."],
        spoken: "after the turn the trace climbs to 8 by the end of the shift",
        fine: "That line reads the chart correctly: the last mark really does sit at that reading.",
      },
    ],
    fixes: [
      { id: "one", value: 1, correct: true },
      {
        id: "nine",
        value: 9,
        miss: "That is the last hour of the shift, so it is another input rather than a reading.",
      },
      {
        id: "six",
        value: 6,
        miss: "That is the reading the shift opened on, which the pen fell away from.",
      },
    ],
    aria: "A strip chart falling from a reading of 6 at hour 0 to a trough at hour 4, then climbing to 8 at hour 9",
  },
];

/**
 * One report line as written: prose stays a text node, every number goes through KaTeX.
 *
 * Shared by the report list and the reveal's answer, which rebuild the same sentence. Two
 * copies of the loop is how the second number came to be typeset in one place and not the
 * other, so there is one.
 */
function ReportSentence({ runs }: { runs: readonly Run[] }) {
  // Keyed by CONTENT plus how many times that content has been seen, the way `BinaryRowSort`
  // keys its repeated parts. A sentence can name the same hour twice, so the content alone is
  // not unique, and the array index is not a key at all: it changes meaning when a run moves.
  const seen = new Map<string, number>();
  const keyed = runs.map((run) => {
    const what = `${typeof run}:${run}`;
    const nth = (seen.get(what) ?? 0) + 1;
    seen.set(what, nth);
    return { run, key: `${what}#${nth}` };
  });
  return (
    <>
      {keyed.map(({ run, key }) =>
        typeof run === "string" ? (
          <Fragment key={key}>{run}</Fragment>
        ) : (
          <InlineMath key={key} latex={String(run)} />
        ),
      )}
    </>
  );
}

export function GraphExtremumSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <GraphExtremumSpotBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function GraphExtremumSpotBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [found, setFound] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [findTried, setFindTried] = useState(false);
  const [fixTried, setFixTried] = useState(false);
  const [taughtFind, setTaughtFind] = useState(false);
  const [taughtFix, setTaughtFix] = useState(false);
  const [flagged, setFlagged] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const badLine = board.lines.find((line) => line.wrong) ?? null;
  const rightFix = board.fixes.find((fix) => fix.correct) ?? null;
  const extremeWord = board.peak ? "highest" : "lowest";

  const mapX = (x: number): number =>
    PLOT.left + (x / board.hours) * (PLOT.right - PLOT.left);
  const mapY = (y: number): number =>
    PLOT.bottom - (y / board.readings) * (PLOT.bottom - PLOT.top);

  function tapLine(line: ReportLine) {
    if (found) {
      return;
    }
    if (line.wrong) {
      setFound(true);
      setFlagged(line.id);
      setFeedback(null);
      success();
      return;
    }
    setFindTried(true);
    setFlagged(line.id);
    setFeedback(line.fine ?? "That line does follow from the chart.");
  }

  function finish(earned: boolean) {
    setFixed(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    onSolved();
  }

  function tapFix(fix: (typeof board.fixes)[number]) {
    if (fixed) {
      return;
    }
    if (fix.correct) {
      finish(true);
      return;
    }
    setFixTried(true);
    setFeedback(fix.miss ?? "Not that one. Read the value off the vertical scale.");
  }

  /* The turn, labelled once found, with its two numbers named apart. */
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

  const path = board.marks.map((mark) => `${mapX(mark[0])},${mapY(mark[1])}`).join(" ");
  const hourTicks = Array.from({ length: board.hours + 1 }, (_unused, at) => at).filter(
    (tick) => tick % 2 === 0,
  );
  /** Every even reading gets a grid line, including the one on the plot's top edge. */
  const readingLines = Array.from(
    { length: board.readings + 1 },
    (_unused, at) => at,
  ).filter((tick) => tick > 0 && tick % 2 === 0);
  /**
   * Which of those may carry a NUMBER, which is fewer: the first board's range ends on an
   * even reading, so its top tick sits exactly on the plot's border with its number centred
   * there, half of it in the margin the "reading" caption is written in. `interiorTicks` is
   * where that rule lives.
   */
  const readingTicks = interiorTicks(readingLines, 0, board.readings);

  let status: ReactNode;
  if (taughtFix) {
    status = null;
  } else if (fixed) {
    status = (
      <>
        Fixed. The turn sits at <InlineMath latex={turnLatex} />, and only the second of
        those two numbers is a reading, so only the second can be the {extremeWord} reading
        of the shift.
      </>
    );
  } else if (feedback !== null) {
    status = feedback;
  } else if (found) {
    status = (
      <>
        That is the line. It reports the {extremeWord} reading as a number off the
        horizontal scale, so choose the value the pen actually reached at the turn.
      </>
    );
  } else {
    status = "One line of this report does not follow from the chart. Flag it.";
  }

  return (
    <div className="lesson-interactive lesson-interactive--spot">
      <WidgetTask>
        Goal: flag the one line of this shift report that the chart does not support, then
        pick the number it should have carried.
      </WidgetTask>

      <svg viewBox={`0 0 440 ${VIEW_H}`} role="img" aria-label={board.aria}>
        <title>A strip chart with one turn, and a report written from it</title>

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

        {/* The guides that separate the two numbers at the turn: one drops to the hour, one
            runs across to the reading. Drawn only once the line has been flagged, so the
            picture does not answer the question before it is asked. */}
        {found && (
          <>
            <line
              x1={mapX(board.turnHour)}
              y1={mapY(board.turnReading)}
              x2={mapX(board.turnHour)}
              y2={PLOT.bottom}
              stroke={SOFT}
              strokeWidth={1.4}
              strokeDasharray="5 4"
            />
            <line
              x1={mapX(board.turnHour)}
              y1={mapY(board.turnReading)}
              x2={PLOT.left}
              y2={mapY(board.turnReading)}
              stroke={fixed ? CIVIC : SIGNAL_DEEP}
              strokeWidth={1.8}
              strokeDasharray="5 4"
            />
            <PlotLabel
              box={turnBox}
              latex={turnLatex}
              fontSize={LABEL_SIZE}
              color={fixed ? CIVIC : SIGNAL_DEEP}
            />
          </>
        )}

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

      <ol className="lesson-spot__work" aria-label="the shift report, line by line">
        {board.lines.map((line) => {
          const given = fill.given && line.wrong === true && !found;
          const marked = found
            ? line.wrong === true
              ? "repair"
              : null
            : given
              ? "given"
              : line.id === flagged
                ? "wrong"
                : null;
          const colour =
            marked === "wrong" ? BRICK : marked === null ? "transparent" : SIGNAL_DEEP;
          return (
            <li key={line.id} className="lesson-spot__line" data-state={marked ?? "plain"}>
              <button
                type="button"
                /* A SENTENCE with its numbers typeset inside it, unlike the single expression
                   every board on the shared kind holds, so it needs inline flow rather than
                   the shared class's `inline-flex`. See the modifier in `styles.css`. */
                className="lesson-spot__line-button lesson-spot__line-button--prose"
                disabled={found}
                aria-label={
                  marked === "wrong"
                    ? `${line.spoken}, this line does follow`
                    : marked === null
                      ? found
                        ? line.spoken
                        : `Flag the line: ${line.spoken}`
                      : `${line.spoken}, the line being replaced`
                }
                style={{
                  borderColor: colour,
                  borderStyle: marked === "wrong" ? "solid" : "dashed",
                }}
                onClick={() => tapLine(line)}
                {...fill.mark(given)}
              >
                <ReportSentence runs={line.runs} />
              </button>
            </li>
          );
        })}
      </ol>

      {found && !fixed && (
        <div className="lesson-interactive__controls">
          {board.fixes.map((fix) => (
            <button
              key={fix.id}
              type="button"
              className="lesson-interactive__step"
              style={{ color: LABEL, borderColor: LINE }}
              aria-label={`the ${extremeWord} reading of the shift is ${fix.value}`}
              onClick={() => tapFix(fix)}
            >
              <InlineMath latex={String(fix.value)} />
            </button>
          ))}
        </div>
      )}

      {fixed && rightFix !== null && (
        <p className="lesson-sorter__result" style={{ color: LABEL }}>
          The line should read: the {extremeWord} reading of the shift is{" "}
          <InlineMath latex={String(rightFix.value)} color={CIVIC} />
        </p>
      )}

      {fixed && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different chart
        </button>
      )}

      <WidgetReveal
        available={findTried && !found}
        revealed={taughtFind}
        // Stage one of two, so the replacement is still outstanding: this reveal names the
        // line and hands the report back for the learner to correct it themselves.
        othersRemain={!fixed}
        answer={badLine === null ? null : <ReportSentence runs={badLine.runs} />}
        why={
          <>
            That line reports the {extremeWord} reading, which is a value off the vertical
            scale, and the number it gives is a number off the horizontal one. The chart
            does turn at hour <InlineMath latex={String(board.turnHour)} />, so the hour is
            not wrong; naming it as a reading is.
          </>
        }
        onReveal={() => {
          setTaughtFind(true);
          setFound(true);
          setFlagged(badLine?.id ?? null);
          setFeedback(null);
        }}
        label="Reveal which line is wrong"
      />

      {found && (
        /* Stage two is the last answer this report is asking for and the gate turns on it,
           so handing the board back here would hand over the gate. */
        <WidgetReveal
          available={fixTried && !fixed}
          revealed={taughtFix}
          answer={rightFix === null ? null : <InlineMath latex={String(rightFix.value)} />}
          why={
            <>
              The turn sits at <InlineMath latex={turnLatex} />, and a mark is written with
              its input first and its output second. The {extremeWord} reading is the
              output, so it is the second of those two numbers and the first is only the
              hour it was reached at.
            </>
          }
          onReveal={() => {
            setTaughtFix(true);
            finish(false);
          }}
          label="Reveal what it should say"
        />
      )}

      <p
        className="lesson-interactive__status"
        data-state={fixed ? "solved" : feedback !== null ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
