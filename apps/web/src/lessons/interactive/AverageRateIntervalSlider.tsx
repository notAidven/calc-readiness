/**
 * FUN.5 interactive (slide 3): one trace, several windows, several different averages.
 *
 * The window always starts at the first mark and the slider chooses where it ends, so the
 * only thing that changes between rounds is how much of the same trace is being averaged.
 * Two windows have to be produced before the gate opens, and the four available windows all
 * give different rates, so the learner cannot finish without meeting the point of the slide.
 *
 * The trace is deliberately not straight: it turns back on itself once, inside the interval,
 * so a window can average a rise while containing a fall (or the reverse on the second
 * board). A straight trace would give the same answer for every window and the slider would
 * teach nothing.
 *
 * Nothing about a window is drawn until its rate has been produced. The chord across the
 * window and the line in the found list both arrive with the answer, never before it, so the
 * slider cannot be walked along until something looks right.
 */

import { type ReactNode, useState } from "react";

import {
  BRICK,
  CIVIC,
  InlineMath,
  LABEL,
  type LabelBox,
  LINE,
  labelHalfH,
  labelHalfW,
  labelSpot,
  PlotLabel,
  plotLabelFrame,
  SIGNAL,
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
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Board {
  /** The hour each mark was taken at, ascending, the first one opening every window. */
  hours: readonly number[];
  /** The reading at each mark, in the same order. */
  readings: readonly number[];
  what: string;
}

const BOARDS: readonly Board[] = [
  // Rising overall, with a dip between the second and third marks.
  {
    hours: [0, 3, 6, 9, 12],
    readings: [4, 25, 16, 40, 64],
    what: "output power",
  },
  // Falling overall, with a climb between the second and third marks.
  {
    hours: [0, 3, 6, 9, 12],
    readings: [66, 36, 48, 30, 6],
    what: "tank level",
  },
];

const LEFT = 54;
const RIGHT = 420;
const TOP = 16;
const BOTTOM = 172;
const LABEL_SIZE = 13;
/** How many windows have to be produced before the gate opens. */
const WINDOWS_NEEDED = 2;

function boardAt(index: number): Board {
  return BOARDS[index] ?? (BOARDS[0] as Board);
}

export function AverageRateIntervalSlider(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  return (
    <AverageRateIntervalSliderBody
      key={variant.nonce}
      board={boardAt(variant.index)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function AverageRateIntervalSliderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** Which mark closes the window, as an index into the board's marks. */
  const [end, setEnd] = useState(1);
  const [entry, setEntry] = useState("");
  const [found, setFound] = useState<readonly number[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const startHour = board.hours[0] as number;
  const startReading = board.readings[0] as number;
  const endHour = board.hours[end] as number;
  const endReading = board.readings[end] as number;
  const span = endHour - startHour;
  const change = endReading - startReading;
  const rate = change / span;
  const settled = found.includes(end);
  const solved = found.length >= WINDOWS_NEEDED;

  const hourMax = board.hours[board.hours.length - 1] as number;
  const readingMax = Math.max(...board.readings);
  const yMax = Math.ceil((readingMax + 1) / 10) * 10;

  const mapX = (hour: number): number => LEFT + (hour / hourMax) * (RIGHT - LEFT);
  const mapY = (reading: number): number => BOTTOM - (reading / yMax) * (BOTTOM - TOP);

  const frame = plotLabelFrame({ left: LEFT, right: RIGHT, top: TOP, bottom: BOTTOM }, 8);

  /** The rate of the window closing at mark `at`, which the found list prints. */
  function rateAt(at: number): number {
    const hour = board.hours[at] as number;
    const reading = board.readings[at] as number;
    return (reading - startReading) / (hour - startHour);
  }

  /** Record a resolved window. `earned` is false when the learner was told the answer. */
  function resolve(earned: boolean) {
    const next = found.includes(end) ? found : [...found, end];
    setFound(next);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next.length >= WINDOWS_NEEDED) {
      onSolved();
    }
  }

  function check() {
    if (solved) {
      return;
    }
    setAttempted(true);
    // A fresh attempt: the reveal steps aside so it can be offered for the window in hand.
    setRevealed(false);
    if (settled) {
      setFeedback(
        <>
          That window is already done. Move the end of the window to a different mark and
          work that one out.
        </>,
      );
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to a note about subtracting the readings, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(entry, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === rate) {
      setEntry("");
      resolve(true);
      return;
    }
    setFeedback(
      <>
        Not yet. Subtract the reading at the first mark from the reading at the end of the
        window, then divide by the <InlineMath latex={String(span)} /> hours the window
        covers.
      </>,
    );
  }

  function reveal() {
    setRevealed(true);
    setEntry("");
    resolve(false);
  }

  const startLabel = labelSpot({
    x: mapX(startHour),
    y: mapY(startReading),
    frame,
    dx: 1,
    dy: -1,
    halfW: labelHalfW(String(startReading), LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 12,
  });
  const endLabel = labelSpot({
    x: mapX(endHour),
    y: mapY(endReading),
    frame,
    dx: -1,
    dy: change > 0 ? 1 : -1,
    halfW: labelHalfW(String(endReading), LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 12,
    avoid: [startLabel] as readonly LabelBox[],
  });

  const yTicks: number[] = [];
  for (let value = 10; value < yMax; value += 10) {
    yTicks.push(value);
  }

  const tracePoints = board.hours
    .map((hour, at) => `${mapX(hour)},${mapY(board.readings[at] as number)}`)
    .join(" ");

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Two windows over one trace, and they do not agree. An average rate belongs to the
        window it was taken over, so it is quoted with the window rather than on its own.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (found.length === 1) {
    status = (
      <>
        One window down. Move the end of the window to a different mark and work out that
        one.
      </>
    );
  } else {
    status = (
      <>
        Every window opens at the first mark. Choose where it closes, then work out the
        average rate across it.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: the average rate of change over two different windows of this one trace, both
        measured from the first mark.
      </WidgetTask>

      <svg
        viewBox="0 0 440 208"
        role="img"
        aria-label={`A recorder trace of ${board.what} with marks every three hours, and a window running from hour ${startHour} to hour ${endHour}`}
      >
        <title>One trace averaged over windows of different lengths</title>

        <rect
          data-plot-frame=""
          x={LEFT}
          y={TOP}
          width={RIGHT - LEFT}
          height={BOTTOM - TOP}
          rx={6}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1}
        />
        {yTicks.map((value) => (
          <line
            key={`grid-${value}`}
            x1={LEFT}
            y1={mapY(value)}
            x2={RIGHT}
            y2={mapY(value)}
            stroke={LINE}
            strokeWidth={0.75}
            opacity={0.6}
          />
        ))}
        {board.hours.map((hour) => (
          <line
            key={`vgrid-${hour}`}
            x1={mapX(hour)}
            y1={TOP}
            x2={mapX(hour)}
            y2={BOTTOM}
            stroke={LINE}
            strokeWidth={0.5}
            opacity={0.45}
          />
        ))}

        {/* The window under consideration, shaded behind everything the learner reads. */}
        <rect
          x={mapX(startHour)}
          y={TOP + 1}
          width={mapX(endHour) - mapX(startHour)}
          height={BOTTOM - TOP - 2}
          fill={SIGNAL}
          opacity={0.09}
        />

        <polyline
          points={tracePoints}
          fill="none"
          stroke={SOFT}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* A chord per window already produced: the evidence arrives with the answer. */}
        {found.map((at) => (
          <line
            key={`chord-${at}`}
            x1={mapX(startHour)}
            y1={mapY(startReading)}
            x2={mapX(board.hours[at] as number)}
            y2={mapY(board.readings[at] as number)}
            stroke={rateAt(at) < 0 ? BRICK : CIVIC}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        ))}

        {board.hours.map((hour, at) => (
          <circle
            key={`dot-${hour}`}
            cx={mapX(hour)}
            cy={mapY(board.readings[at] as number)}
            r={at === 0 || at === end ? 5.5 : 3}
            fill={at === 0 || at === end ? SIGNAL : SOFT}
          />
        ))}

        <PlotLabel
          box={startLabel}
          latex={String(startReading)}
          fontSize={LABEL_SIZE}
          color={LABEL}
        />
        <PlotLabel
          box={endLabel}
          latex={String(endReading)}
          fontSize={LABEL_SIZE}
          color={LABEL}
        />

        {yTicks.map((value) => (
          <text
            key={`ytick-${value}`}
            x={LEFT - 8}
            y={mapY(value) + 3.5}
            textAnchor="end"
            fontSize={10}
            fill={SOFT}
          >
            {value}
          </text>
        ))}
        {board.hours.map((hour, at) => (
          <text
            key={`xtick-${hour}`}
            x={mapX(hour)}
            y={BOTTOM + 16}
            textAnchor="middle"
            fontSize={10}
            fill={at === 0 || at === end ? LABEL : SOFT}
          >
            {hour}
          </text>
        ))}
        <text
          x={(LEFT + RIGHT) / 2}
          y={BOTTOM + 34}
          textAnchor="middle"
          fontSize={11}
          fill={SOFT}
        >
          hours
        </text>
        <text x={LEFT - 8} y={TOP - 4} textAnchor="end" fontSize={11} fill={SOFT}>
          units
        </text>
      </svg>

      <label
        className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
        htmlFor="fun5-window-end"
      >
        Window ends at hour <InlineMath latex={String(endHour)} />
      </label>
      <input
        id="fun5-window-end"
        className="lesson-interactive__range"
        type="range"
        min={1}
        max={board.hours.length - 1}
        step={1}
        value={end}
        disabled={solved}
        aria-valuetext={`window ending at hour ${endHour}`}
        onChange={(event) => {
          setEnd(Number(event.target.value));
          setEntry("");
          setFeedback(null);
        }}
      />

      {/* The windows already produced, kept on screen so the two can be compared. The
          readout class is the one place a widget prints a value outside the controls row. */}
      {found.length > 0 && (
        <p className="lesson-interactive__coords">
          {found.map((at) => (
            <InlineMath
              key={`found-${at}`}
              latex={`${startHour} \\text{ to } ${board.hours[at]} \\text{: } ${rateAt(at)} \\text{ per hour}`}
              color={rateAt(at) < 0 ? BRICK : CIVIC}
            />
          ))}
        </p>
      )}

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different trace
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: CIVIC }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${startHour} \\text{ to } ${endHour}:`} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label={`the average rate of change from hour ${startHour} to hour ${endHour}`}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  check();
                }
              }}
              {...fill.entry(rate)}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved && !settled}
        revealed={revealed}
        answer={<InlineMath latex={String(rate)} />}
        why={
          <>
            The window runs from <InlineMath latex={String(startReading)} /> at hour{" "}
            <InlineMath latex={String(startHour)} /> to{" "}
            <InlineMath latex={String(endReading)} /> at hour{" "}
            <InlineMath latex={String(endHour)} />, so the reading changes by{" "}
            <InlineMath latex={`${endReading} - ${startReading} = ${change}`} /> across{" "}
            <InlineMath latex={String(span)} /> hours, and{" "}
            <InlineMath latex={`\\dfrac{${change}}{${span}} = ${rate}`} />. Every mark
            inside the window is passed over, which is why another window on the same trace
            can report something else entirely.
          </>
        }
        onReveal={reveal}
        // A second window is still owed while this is the first one to be resolved.
        othersRemain={found.length + 1 < WINDOWS_NEEDED}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed && !solved ? null : status}
      </p>
    </div>
  );
}
