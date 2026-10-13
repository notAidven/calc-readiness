/**
 * FUN.4 interactive (slide 2): a turn is only a LOCAL high or low point, and the extreme of
 * the whole shift has to beat every mark on it.
 *
 * The recorder sweeps left to right one leg at a time, naming each turn it passes as a local
 * maximum or a local minimum. Then it STOPS. Nothing on the board says which of those turns
 * wins, and no mark carries its value, so the two answers have to be read off the vertical
 * scale and compared: pressing Play alone produces nothing at all.
 *
 * Two answers, judged separately and latched separately, because a learner who has the absolute
 * maximum right and the minimum wrong should not be answered with one line about both. The gate
 * needs both.
 *
 * The lesson's own point is in the numbers rather than in the prose: on either board the first
 * turn the sweep names is a local maximum that a LATER turn beats, so the answer to "the
 * absolute maximum" is never the first thing the animation labelled.
 */

import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  CIVIC,
  InlineMath,
  interiorTicks,
  LABEL,
  type LabelBox,
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
import { numericEntryProps, readNumericEntry, WHOLE_NUMBER_MISS } from "./numericEntry";

const PLOT = { left: 46, right: 424, top: 14, bottom: 190 };
const VIEW_H = 228;
const TICK_SIZE = 11;
const LABEL_SIZE = 12;
const LABEL_FRAME = plotLabelFrame(PLOT, 8);
/** How long one leg of the sweep takes when the pen is running itself. */
const LEG_MS = 950;

type Mark = readonly [number, number];

interface Board {
  marks: readonly Mark[];
  hours: number;
  readings: number;
  aria: string;
}

const BOARDS: readonly Board[] = [
  {
    marks: [
      [0, 3],
      [2, 7],
      [5, 2],
      [8, 9],
      [11, 4],
      [12, 6],
    ],
    hours: 12,
    readings: 12,
    aria: "A strip chart over twelve hours with four turns: up to a peak at hour 2, down to a dip at hour 5, up to a higher peak at hour 8, down to a dip at hour 11, then up to the end of the shift",
  },
  {
    marks: [
      [0, 4],
      [2, 9],
      [5, 6],
      [8, 11],
      [11, 3],
      [12, 5],
    ],
    hours: 12,
    readings: 12,
    aria: "A strip chart over twelve hours with four turns: up to a peak at hour 2, down to a shallow dip at hour 5, up to a higher peak at hour 8, down to a deep dip at hour 11, then up to the end of the shift",
  },
];

/** Whether the mark at `index` is a turn, and which way it turns. */
function turnAt(marks: readonly Mark[], index: number): "max" | "min" | null {
  const before = marks[index - 1];
  const here = marks[index];
  const after = marks[index + 1];
  if (before === undefined || here === undefined || after === undefined) {
    return null;
  }
  if (here[1] > before[1] && here[1] > after[1]) {
    return "max";
  }
  if (here[1] < before[1] && here[1] < after[1]) {
    return "min";
  }
  return null;
}

export function GraphFeatureWalkthrough(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <GraphFeatureWalkthroughBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function GraphFeatureWalkthroughBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const last = board.marks.length - 1;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [highEntry, setHighEntry] = useState("");
  const [lowEntry, setLowEntry] = useState("");
  const [highVerdict, setHighVerdict] = useState<"right" | "wrong" | null>(null);
  const [lowVerdict, setLowVerdict] = useState<"right" | "wrong" | null>(null);
  const [highNote, setHighNote] = useState<ReactNode>(null);
  const [lowNote, setLowNote] = useState<ReactNode>(null);
  const [taughtHigh, setTaughtHigh] = useState(false);
  const [taughtLow, setTaughtLow] = useState(false);
  const [pending, setPending] = useState<"high" | "low" | null>(null);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const values = board.marks.map((mark) => mark[1]);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const highDone = highVerdict === "right";
  const lowDone = lowVerdict === "right";
  const swept = step >= last;
  const solved = highDone && lowDone;

  /*
   * One timer per leg rather than a repeating interval, so the pen stopping at the end of the
   * shift is a decision made in the effect body instead of a `setPlaying` buried inside a
   * `setStep` updater, which React is free to run twice.
   */
  useEffect(() => {
    if (!playing) {
      return;
    }
    if (step >= last) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setStep((at) => Math.min(last, at + 1)), LEG_MS);
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [playing, step, last]);

  const mapX = (x: number): number =>
    PLOT.left + (x / board.hours) * (PLOT.right - PLOT.left);
  const mapY = (y: number): number =>
    PLOT.bottom - (y / board.readings) * (PLOT.bottom - PLOT.top);

  function latchIfDone(high: boolean, low: boolean) {
    if (high && low && !done) {
      setDone(true);
      onSolved();
    }
  }

  function checkHigh() {
    if (highDone) {
      return;
    }
    const typed = highEntry.trim();
    if (typed === "") {
      setHighVerdict("wrong");
      setPending("high");
      setHighNote("Read the highest point the pen ever reaches across from the scale.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about comparing the marks, which would answer a question the
    // learner did not ask.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setHighVerdict("wrong");
      setPending("high");
      setHighNote(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === highest) {
      setHighVerdict("right");
      setPending((current) => (current === "high" ? null : current));
      setHighNote(null);
      success();
      latchIfDone(true, lowDone);
      return;
    }
    setHighVerdict("wrong");
    setPending("high");
    setHighNote(
      "Not that one. Compare every mark on the chart, the two at the ends included, and give the value rather than the hour.",
    );
  }

  function checkLow() {
    if (lowDone) {
      return;
    }
    const typed = lowEntry.trim();
    if (typed === "") {
      setLowVerdict("wrong");
      setPending("low");
      setLowNote("Read the lowest point the pen ever reaches across from the scale.");
      return;
    }
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setLowVerdict("wrong");
      setPending("low");
      setLowNote(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === lowest) {
      setLowVerdict("right");
      setPending((current) => (current === "low" ? null : current));
      setLowNote(null);
      success();
      latchIfDone(highDone, true);
      return;
    }
    setLowVerdict("wrong");
    setPending("low");
    setLowNote(
      "Not that one. Compare every mark on the chart, the two at the ends included, and give the value rather than the hour.",
    );
  }

  /* The pen's path so far, and the turns it has already named. */
  const drawn = board.marks.slice(0, step + 1);
  const path = drawn.map((mark) => `${mapX(mark[0])},${mapY(mark[1])}`).join(" ");
  const placed: LabelBox[] = [];
  const turnLabels = board.marks.flatMap((mark, index) => {
    const kind = turnAt(board.marks, index);
    if (kind === null || index > step) {
      return [];
    }
    const latex = kind === "max" ? "\\text{local max}" : "\\text{local min}";
    const box = labelSpot({
      x: mapX(mark[0]),
      y: mapY(mark[1]),
      frame: LABEL_FRAME,
      dx: 0,
      dy: kind === "max" ? -1 : 1,
      halfW: labelHalfW(latex, LABEL_SIZE),
      halfH: labelHalfH(LABEL_SIZE),
      gap: 11,
      avoid: [...placed],
    });
    placed.push(box);
    return [{ id: `${mark[0]}`, box, latex }];
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
   * Which of those may carry a NUMBER, which is fewer: `board.readings` is 12 on both boards,
   * so the top tick lands exactly on the plot's border and its number is centred there, half
   * of it in the margin the "reading" caption is written in. `interiorTicks` is where that
   * rule lives; the same collision was on three of FUN.4's four planes.
   */
  const readingTicks = interiorTicks(readingLines, 0, board.readings);

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Both read off. Four turns were named local, and only one of them holds the highest
        reading of the whole shift: a turn beats its neighbors and nothing else.
      </>
    );
  } else if (swept) {
    status = (
      <>
        The sweep is finished and every turn is named. Now compare all six marks against the
        scale, ends of the shift included.
      </>
    );
  } else if (step > 0) {
    status = "The pen is part way across. Keep going to the end of the shift.";
  } else {
    status = "Run the recorder across the shift, and watch where the trace turns.";
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <WidgetTask>
        Goal: sweep the recorder from hour <InlineMath latex="0" /> to hour{" "}
        <InlineMath latex={String(board.hours)} />, then give the highest and the lowest
        reading of the whole shift, as readings off the vertical scale.
      </WidgetTask>

      <svg viewBox={`0 0 440 ${VIEW_H}`} role="img" aria-label={board.aria}>
        <title>A recorder sweeping across a shift, naming each turn as it passes</title>

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

        {drawn.length > 1 && (
          <polyline
            points={path}
            fill="none"
            stroke={LABEL}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {drawn.map((mark) => (
          <circle
            key={`m${mark[0]}`}
            cx={mapX(mark[0])}
            cy={mapY(mark[1])}
            r={4}
            fill={LABEL}
          />
        ))}
        {/* The pen itself, at the far end of what has been drawn. */}
        <circle
          cx={mapX((board.marks[step] as Mark)[0])}
          cy={mapY((board.marks[step] as Mark)[1])}
          r={6.5}
          fill="none"
          stroke={solved ? CIVIC : SIGNAL_DEEP}
          strokeWidth={2}
        />

        {turnLabels.map((entry) => (
          <PlotLabel
            key={`turn${entry.id}`}
            box={entry.box}
            latex={entry.latex}
            fontSize={LABEL_SIZE}
            color={SIGNAL_DEEP}
          />
        ))}

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

      <div className="lesson-interactive__controls">
        <button
          type="button"
          className="lesson-interactive__step"
          style={{ color: LABEL, borderColor: LINE }}
          disabled={swept}
          onClick={() => setPlaying((on) => !on)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="lesson-interactive__step"
          style={{ color: LABEL, borderColor: LINE }}
          disabled={swept}
          onClick={() => {
            setPlaying(false);
            setStep((at) => Math.min(last, at + 1));
          }}
        >
          Step
        </button>
        <button
          type="button"
          className="lesson-interactive__step"
          style={{ color: LABEL, borderColor: LINE }}
          onClick={() => {
            setPlaying(false);
            setStep(0);
          }}
        >
          Replay
        </button>
      </div>

      {swept && (
        <div className="lesson-interactive__rows">
          <div className="lesson-interactive__row">
            <div className="lesson-interactive__field" style={{ color: CIVIC }}>
              <span className="lesson-interactive__field-label">absolute maximum</span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("integer")}
                disabled={highDone}
                aria-label={partName(
                  "the absolute maximum of the whole shift",
                  highVerdict,
                )}
                value={highEntry}
                {...(pending === "high" ? fill.entry(highest) : {})}
                onChange={(event) => setHighEntry(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    checkHigh();
                  }
                }}
              />
            </div>
            {/* The mark on EITHER verdict. Drawn only on the reading that had landed, a
                submitted-and-missed reading carried its sentence and no mark at all. */}
            {highVerdict !== null && <WidgetPartVerdict verdict={highVerdict} />}
            {highDone ? null : (
              <button
                type="button"
                className="lesson-interactive__check lesson-interactive__check--part"
                onClick={checkHigh}
              >
                Check
              </button>
            )}
            {highVerdict === "wrong" && highNote !== null && (
              <WidgetPartNote>{highNote}</WidgetPartNote>
            )}
          </div>

          <div className="lesson-interactive__row">
            <div className="lesson-interactive__field" style={{ color: CIVIC }}>
              <span className="lesson-interactive__field-label">absolute minimum</span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("integer")}
                disabled={lowDone}
                aria-label={partName("the absolute minimum of the whole shift", lowVerdict)}
                value={lowEntry}
                {...(pending === "low" ? fill.entry(lowest) : {})}
                onChange={(event) => setLowEntry(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    checkLow();
                  }
                }}
              />
            </div>
            {lowVerdict !== null && <WidgetPartVerdict verdict={lowVerdict} />}
            {lowDone ? null : (
              <button
                type="button"
                className="lesson-interactive__check lesson-interactive__check--part"
                onClick={checkLow}
              >
                Check
              </button>
            )}
            {lowVerdict === "wrong" && lowNote !== null && (
              <WidgetPartNote>{lowNote}</WidgetPartNote>
            )}
          </div>
        </div>
      )}

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different shift
        </button>
      )}

      <WidgetReveal
        available={pending === "high" && highVerdict === "wrong" && !highDone}
        revealed={taughtHigh}
        // Live: the absolute minimum is a separate answer on the same board, so explaining this
        // one must not cost the learner a board they have half finished.
        othersRemain={!lowDone}
        answer={<InlineMath latex={String(highest)} />}
        why={
          <>
            Every turn the sweep named is only local. Compared against all six marks, the
            two ends of the shift included, the largest value on the chart is{" "}
            <InlineMath latex={String(highest)} />, and that value is a reading rather than
            the hour it was reached at.
          </>
        }
        onReveal={() => {
          setTaughtHigh(true);
          setHighEntry(String(highest));
          setHighVerdict("right");
          setHighNote(null);
          // No `latchIfDone`. Where this was the last reading outstanding it IS the gate, so
          // handing it over and opening the gate in one click would let a learner past on an
          // answer they were given. The shared layer owns the release from here.
        }}
        label="Reveal the absolute maximum"
      />

      <WidgetReveal
        available={pending === "low" && lowVerdict === "wrong" && !lowDone}
        revealed={taughtLow}
        othersRemain={!highDone}
        answer={<InlineMath latex={String(lowest)} />}
        why={
          <>
            The same comparison the other way round. Across all six marks, the ends of the
            shift included, the smallest value on the chart is{" "}
            <InlineMath latex={String(lowest)} />, which is a reading and not an hour.
          </>
        }
        onReveal={() => {
          setTaughtLow(true);
          setLowEntry(String(lowest));
          setLowVerdict("right");
          setLowNote(null);
          // No `latchIfDone`, for the reason on the reveal above.
        }}
        label="Reveal the absolute minimum"
      />

      <p
        className="lesson-interactive__status"
        data-state={
          solved
            ? "solved"
            : highVerdict === "wrong" || lowVerdict === "wrong"
              ? "wrong"
              : "prompt"
        }
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
