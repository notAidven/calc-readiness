/**
 * FUN.5 interactive (slide 0): the average rate of change, built out of two marks on a
 * chart recorder's trace.
 *
 * The whole trace is drawn, and only two of its marks are highlighted, because the point of
 * the slide is that the rate consults the endpoints and nothing else. The learner builds the
 * fraction rather than being shown it: the top slot takes the change in the reading and the
 * bottom slot takes the change in the hours, and only once both are right does the quotient
 * row open. Two answers, not one, so a reveal on the fraction hands the board back with the
 * quotient still the learner's to produce.
 *
 * No coordinate pair appears anywhere on it. The plane is not a prerequisite of this node, so
 * a mark is labelled with its reading alone and its hour is read off a dropped guide line to
 * the axis, which is how a chart recorder is read in any case.
 *
 * Three traces rotate on "start over": one rising, one falling throughout, and one that
 * levels off inside the window without changing what the endpoints report. None of them is
 * the end-of-lesson check's trace or any instance the practice bank draws.
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
import { WidgetBeside } from "../widgetBeside";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  type RevealFilledEntry,
  type RevealFillProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Board {
  /** One reading per hour, so the index into this list IS the hour. */
  readings: readonly number[];
  /** The two marks the question is about. */
  from: number;
  to: number;
  /** What the trace is a record of, for the accessible description. */
  what: string;
}

const BOARDS: readonly Board[] = [
  // Rising: 9 at hour 1 to 21 at hour 5, so 12 units over 4 hours.
  { readings: [6, 9, 13, 18, 20, 21, 24], from: 1, to: 5, what: "coolant flow" },
  // Falling throughout: 30 at hour 0 to 18 at hour 4, so a negative rate.
  { readings: [30, 27, 26, 22, 18, 17, 12], from: 0, to: 4, what: "chamber pressure" },
  // Level in the middle, which changes nothing the two endpoints report.
  { readings: [5, 11, 14, 14, 19, 26, 30], from: 2, to: 6, what: "rotor speed" },
];

const LEFT = 54;
const RIGHT = 420;
const TOP = 16;
const BOTTOM = 172;
const LABEL_SIZE = 13;

function boardAt(index: number): Board {
  return BOARDS[index] ?? (BOARDS[0] as Board);
}

/** A typed integer, or null when the entry is not one. */
function parseInteger(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "");
  return /^-?\d+$/.test(cleaned) ? Number(cleaned) : null;
}

function spoken(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

/**
 * One blank in the fraction, in the position of the value it holds. A settled slot keeps its
 * outline, which is what keeps a negative change readable next to the bar above it.
 */
function Slot({
  state,
  value,
  settled,
  aria,
  color,
  entryProps,
  onChange,
  onEnter,
}: {
  state: "locked" | "open" | "done";
  value: string;
  settled: string;
  aria: string;
  color: string;
  entryProps: RevealFilledEntry | RevealFillProps;
  onChange: (next: string) => void;
  onEnter: () => void;
}) {
  if (state === "done") {
    return (
      <span className="lesson-equation__slot lesson-equation__slot--done" style={{ color }}>
        <InlineMath latex={settled} />
      </span>
    );
  }
  if (state === "locked") {
    return <span className="lesson-equation__slot lesson-equation__slot--locked" />;
  }
  return (
    <input
      className="lesson-equation__slot"
      style={{ color }}
      type="text"
      inputMode="text"
      value={value}
      aria-label={aria}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter();
        }
      }}
      {...entryProps}
    />
  );
}

export function AverageRateExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  return (
    <AverageRateExploreBody
      key={variant.nonce}
      board={boardAt(variant.index)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function AverageRateExploreBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** 0 the two differences, 1 the quotient, 2 done. */
  const [stage, setStage] = useState(0);
  const [changeEntry, setChangeEntry] = useState("");
  const [hoursEntry, setHoursEntry] = useState("");
  const [changeDone, setChangeDone] = useState(false);
  const [hoursDone, setHoursDone] = useState(false);
  const [rateEntry, setRateEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const hourMax = board.readings.length - 1;
  const readingMax = Math.max(...board.readings);
  const yMax = Math.ceil((readingMax + 1) / 10) * 10;
  const first = board.readings[board.from] as number;
  const second = board.readings[board.to] as number;
  const change = second - first;
  const hours = board.to - board.from;
  const rate = change / hours;
  const solved = stage >= 2;

  const mapX = (hour: number): number => LEFT + (hour / hourMax) * (RIGHT - LEFT);
  const mapY = (reading: number): number => BOTTOM - (reading / yMax) * (BOTTOM - TOP);

  const frame = plotLabelFrame({ left: LEFT, right: RIGHT, top: TOP, bottom: BOTTOM }, 8);

  function checkDifferences() {
    setAttempted(true);
    // A fresh attempt: the reveal steps aside so it can be offered for the step in hand.
    setRevealed(false);
    const nextChange = changeDone || parseInteger(changeEntry) === change;
    const nextHours = hoursDone || parseInteger(hoursEntry) === hours;
    const landed = (nextChange && !changeDone) || (nextHours && !hoursDone);
    setChangeDone(nextChange);
    setHoursDone(nextHours);
    if (landed) {
      success();
    }
    if (nextChange && nextHours) {
      setFeedback(null);
      setStage(1);
      return;
    }
    setFeedback(
      <>
        Not yet. The top of the fraction is the reading at the later mark minus the reading
        at the earlier one, sign included, and the bottom is the number of hours between the
        two marks.
      </>,
    );
  }

  function checkRate() {
    setAttempted(true);
    setRevealed(false);
    const typed = parseInteger(rateEntry);
    if (typed === rate) {
      setFeedback(null);
      setStage(2);
      success();
      onSolved();
      return;
    }
    setFeedback(
      <>
        Not yet. Divide the change in the reading by the hours it took:{" "}
        <InlineMath latex={`\\dfrac{${change}}{${hours}}`} />.
      </>,
    );
  }

  function reveal() {
    setRevealed(true);
    if (stage === 0) {
      setChangeDone(true);
      setHoursDone(true);
      setStage(1);
      return;
    }
    setRateEntry(String(rate));
    setStage(2);
    onSolved();
  }

  /*
   * The two reading labels are placed rather than nudged: the marks rotate with the board, so
   * a fixed offset walks one of them off the plot as soon as a reading lands near the top.
   * The earlier mark is placed first and then avoided, so a short window cannot stack the two.
   */
  const firstLabel = labelSpot({
    x: mapX(board.from),
    y: mapY(first),
    frame,
    dx: -1,
    dy: change > 0 ? 1 : -1,
    halfW: labelHalfW(String(first), LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 12,
  });
  const secondLabel = labelSpot({
    x: mapX(board.to),
    y: mapY(second),
    frame,
    dx: 1,
    dy: change > 0 ? -1 : 1,
    halfW: labelHalfW(String(second), LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 12,
    avoid: [firstLabel] as readonly LabelBox[],
  });

  const yTicks: number[] = [];
  for (let value = 10; value < yMax; value += 10) {
    yTicks.push(value);
  }

  /**
   * The trace as (hour, reading) pairs. The hour IS the index into `readings`, but pairing
   * them up front means every drawn element keys off a value the board carries rather than
   * off a position in a list.
   */
  const marks = board.readings.map((reading, hour) => ({ hour, reading }));

  const tracePoints = marks
    .map((mark) => `${mapX(mark.hour)},${mapY(mark.reading)}`)
    .join(" ");

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        The reading changed by <InlineMath latex={String(change)} /> over{" "}
        <InlineMath latex={String(hours)} /> hours, so it averaged{" "}
        <InlineMath latex={String(rate)} /> units per hour across that window.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (stage === 1) {
    status = (
      <>
        Both differences are in. Now divide the top by the bottom to get the rate for one
        hour.
      </>
    );
  } else {
    status = (
      <>
        Only the two highlighted marks matter. Read them off the chart and fill in the
        fraction.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      <WidgetTask>
        Goal: the average rate of change of the reading between the two highlighted marks,
        in units per hour.
      </WidgetTask>

      <WidgetBeside
        figure={
          <svg
            viewBox="0 0 440 208"
            role="img"
            aria-label={`A recorder trace of ${board.what} with marks highlighted at hour ${board.from}, reading ${spoken(first)} units, and hour ${board.to}, reading ${spoken(second)} units`}
          >
            <title>A chart recorder trace with two marks highlighted</title>

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
            {marks.map(({ hour }) => (
              <line
                key={`hour-${hour}`}
                x1={mapX(hour)}
                y1={TOP}
                x2={mapX(hour)}
                y2={BOTTOM}
                stroke={LINE}
                strokeWidth={0.5}
                opacity={0.45}
              />
            ))}

            <polyline
              points={tracePoints}
              fill="none"
              stroke={SOFT}
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {/* The two marks the window is bounded by, each with a guide dropped to its hour. */}
            {[board.from, board.to].map((hour) => (
              <line
                key={`guide-${hour}`}
                x1={mapX(hour)}
                y1={mapY(board.readings[hour] as number)}
                x2={mapX(hour)}
                y2={BOTTOM}
                stroke={SIGNAL}
                strokeWidth={1.2}
                strokeDasharray="4 3"
              />
            ))}

            {marks.map(({ hour, reading }) => {
              const marked = hour === board.from || hour === board.to;
              return (
                <circle
                  key={`dot-${hour}`}
                  cx={mapX(hour)}
                  cy={mapY(reading)}
                  r={marked ? 5.5 : 3}
                  fill={marked ? SIGNAL : SOFT}
                />
              );
            })}

            <PlotLabel
              box={firstLabel}
              latex={String(first)}
              fontSize={LABEL_SIZE}
              color={LABEL}
            />
            <PlotLabel
              box={secondLabel}
              latex={String(second)}
              fontSize={LABEL_SIZE}
              color={LABEL}
            />

            {/* Axis numbers sit OUTSIDE the plot, the way a chart prints them. */}
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
            {marks.map(({ hour }) => (
              <text
                key={`xtick-${hour}`}
                x={mapX(hour)}
                y={BOTTOM + 16}
                textAnchor="middle"
                fontSize={10}
                fill={hour === board.from || hour === board.to ? LABEL : SOFT}
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
        }
      >
        <div className="lesson-equation">
          <div className="lesson-equation__row" data-state={stage === 0 ? "open" : "done"}>
            <span className="lesson-equation__stage">per hour</span>
            <span className="lesson-equation__body">
              <span className="lesson-equation__frac">
                <span className="lesson-equation__part">
                  <Slot
                    state={changeDone ? "done" : stage === 0 ? "open" : "done"}
                    value={changeEntry}
                    settled={String(change)}
                    aria="the change in the reading between the two marks"
                    color={BRICK}
                    entryProps={fill.entry(change)}
                    onChange={setChangeEntry}
                    onEnter={checkDifferences}
                  />
                </span>
                <span className="lesson-equation__bar" />
                <span className="lesson-equation__part">
                  <Slot
                    state={hoursDone ? "done" : stage === 0 ? "open" : "done"}
                    value={hoursEntry}
                    settled={String(hours)}
                    aria="the number of hours between the two marks"
                    color={CIVIC}
                    entryProps={fill.entry(hours)}
                    onChange={setHoursEntry}
                    onEnter={checkDifferences}
                  />
                </span>
              </span>
            </span>
            {stage === 0 ? (
              <button
                type="button"
                className="lesson-interactive__check"
                onClick={checkDifferences}
              >
                Check
              </button>
            ) : null}
          </div>

          <div
            className="lesson-equation__row"
            data-state={stage === 1 ? "open" : stage > 1 ? "done" : "locked"}
          >
            <span className="lesson-equation__stage">rate</span>
            <span className="lesson-equation__body">
              <InlineMath latex="=" />
              <Slot
                state={stage === 1 ? "open" : stage > 1 ? "done" : "locked"}
                value={rateEntry}
                settled={String(rate)}
                aria="the average rate of change, in units per hour"
                color={CIVIC}
                entryProps={fill.entry(rate)}
                onChange={setRateEntry}
                onEnter={checkRate}
              />
            </span>
            {stage === 1 ? (
              <button
                type="button"
                className="lesson-interactive__check"
                onClick={checkRate}
              >
                Check
              </button>
            ) : null}
          </div>
        </div>

        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different trace
          </button>
        )}

        <WidgetReveal
          available={attempted && !solved}
          revealed={revealed}
          answer={
            stage === 0 ? (
              <>
                <InlineMath latex={String(change)} /> over{" "}
                <InlineMath latex={String(hours)} />
              </>
            ) : (
              <InlineMath latex={String(rate)} />
            )
          }
          why={
            stage === 0 ? (
              <>
                The trace reads <InlineMath latex={String(first)} /> at hour{" "}
                <InlineMath latex={String(board.from)} /> and{" "}
                <InlineMath latex={String(second)} /> at hour{" "}
                <InlineMath latex={String(board.to)} />, so the reading changes by{" "}
                <InlineMath latex={`${second} - ${first} = ${change}`} /> across{" "}
                <InlineMath latex={`${board.to} - ${board.from} = ${hours}`} /> hours. Every
                mark between those two is left out, because a rate over an interval consults
                its ends only.
              </>
            ) : (
              <>
                A change of <InlineMath latex={String(change)} /> spread over{" "}
                <InlineMath latex={String(hours)} /> hours is{" "}
                <InlineMath latex={`\\dfrac{${change}}{${hours}} = ${rate}`} /> in each
                hour, and the sign is the one the subtraction gave: the reading ends{" "}
                {change < 0 ? "below" : "above"} where it started.
              </>
            )
          }
          onReveal={reveal}
          // The quotient row is still outstanding while the fraction is being explained.
          othersRemain={stage === 0}
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {status}
        </p>
      </WidgetBeside>
    </div>
  );
}
