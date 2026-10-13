/**
 * FUN.10 slide 1: the vertex stands where the inside of the bars is zero.
 *
 * The vee is NOT drawn while the question is open, and that is the whole design. Drawn, the
 * dial becomes a matter of sliding a line until it meets a corner already on the board;
 * undrawn, the only thing to work from is the argument in the heading, which is the algebra
 * the slide is about. The curve and the vertex label arrive when both answers land.
 *
 * Two answers, one gate. The dial names where the corner stands and the box names the height
 * the graph reaches at one fixed input away from it, so a learner who has read the sign
 * backwards is caught twice rather than once: `x - 3` turns at positive three, and the second
 * answer moves with the same sign the first one does.
 */

import { useState } from "react";

import {
  BRICK,
  CIVIC,
  fittingTicks,
  InlineMath,
  LABEL,
  LINE,
  labelHalfH,
  labelHalfW,
  labelSpot,
  PlotLabel,
  plotLabelFrame,
  SIGNAL_DEEP,
  SOFT,
  SvgMath,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

/* ------------------------------------------------------------------------- the plane */

const X_MIN = -8;
const X_MAX = 8;
const Y_MIN = -3;
const Y_MAX = 10;
/**
 * The plot sits 34 down rather than 24, which is headroom for the heading above it.
 *
 * `SvgMath` centres its ink on the `y` it is given, so the equation at `y={13}` in 16 reaches
 * about 22 and a frame starting at 24 left it two units of air; the bars of
 * `\left\lvert \right\rvert` are drawn taller than a plain glyph, so it read as touching. Both
 * edges of the plot move down together so its HEIGHT is unchanged. `VIEW_H` is then trimmed
 * to fourteen under the new bottom, rather than left at the old 252: that leftover band was
 * empty SVG and read as a beige gap under the plane. Buying the heading gap by growing the
 * box would have been the wrong trade, since a gated widget's height is already the scarce
 * thing on a short viewport.
 */
const PLOT = { left: 46, right: 394, top: 34, bottom: 212 };
const VIEW_H = 226;
const TICK_SIZE = 11;
const X_GRID = [-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7];
const Y_GRID = [-2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const X_TICKS = [-6, -4, -2, 2, 4, 6];
const Y_TICKS = [2, 4, 6, 8];

const DIAL_MIN = -7;
const DIAL_MAX = 7;

/** The input the second answer is read at, well clear of every board's own vertex. */
const PROBE = 1;

const mapX = (x: number): number =>
  PLOT.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (PLOT.right - PLOT.left);
const mapY = (y: number): number =>
  PLOT.top + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (PLOT.bottom - PLOT.top);

const LABEL_FRAME = plotLabelFrame(PLOT, 6);
const LABEL_SIZE = 13;

const NUMBERED_X = fittingTicks({
  ticks: X_TICKS,
  place: mapX,
  half: (tick) => labelHalfW(String(tick), TICK_SIZE),
  start: PLOT.left,
  end: PLOT.right,
});
const NUMBERED_Y = fittingTicks({
  ticks: Y_TICKS,
  place: mapY,
  half: () => labelHalfH(TICK_SIZE),
  start: PLOT.top,
  end: PLOT.bottom,
});

/** The axis numbers, as obstacles the vertex label has to steer clear of. */
const TICK_BOXES = [
  ...NUMBERED_X.map((tick) => ({
    x: mapX(tick),
    y: mapY(0) + 11,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
  ...NUMBERED_Y.map((tick) => ({
    x: mapX(0) - 8 - labelHalfW(String(tick), TICK_SIZE),
    y: mapY(tick),
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
];

/* ------------------------------------------------------------------------- the boards */

/**
 * Two boards, one shifting right and one shifting left, so the sign inside the argument has
 * to be read rather than assumed. Neither is the check's own shift.
 */
const SHIFTS: readonly number[] = [5, -3];

/** `x - 5` or `x + 3`, the argument as the learner reads it. */
function argTex(h: number): string {
  return h < 0 ? `x + ${-h}` : `x - ${h}`;
}

/** The same argument read aloud, for an accessible name. */
function argSpoken(h: number): string {
  return h < 0 ? `x plus ${-h}` : `x minus ${h}`;
}

export function AbsValueVertexSlider(props: LessonWidgetProps) {
  const variant = useWidgetVariants(SHIFTS.length, props);
  const shift = SHIFTS[variant.index] ?? (SHIFTS[0] as number);
  return (
    <AbsValueVertexSliderBody
      key={variant.nonce}
      shift={shift}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function AbsValueVertexSliderBody({
  shift,
  onSolved,
  onRestart,
}: {
  shift: number;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [dial, setDial] = useState(DIAL_MIN);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const height = Math.abs(PROBE - shift);
  const equation = `y = \\left\\lvert ${argTex(shift)} \\right\\rvert`;

  /** Close the round out. `earned` is false when the learner was told the answer. */
  function finish(earned: boolean) {
    setSolved(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (!done) {
      setDone(true);
      onSolved();
    }
  }

  function check() {
    if (solved) {
      return;
    }
    setAttempted(true);
    const typed = entry.trim();
    if (typed === "") {
      setFeedback(
        "Set the corner, and give the height the graph reaches at the marked input.",
      );
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to a note about where the bars hold zero, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (dial === shift && read.value === height) {
      finish(true);
      return;
    }
    setFeedback(
      "Not yet. Ask which input makes the quantity inside the bars come out as zero, and put the marked input through the same bars for the height.",
    );
  }

  function reveal() {
    setDial(shift);
    setEntry(String(height));
    setRevealed(true);
    finish(false);
  }

  /** The vee, clipped to the window, drawn only once both answers have landed. */
  function veePath(): string {
    const leftX = Math.max(X_MIN, shift - Y_MAX);
    const rightX = Math.min(X_MAX, shift + Y_MAX);
    return [
      `M ${mapX(leftX)} ${mapY(shift - leftX)}`,
      `L ${mapX(shift)} ${mapY(0)}`,
      `L ${mapX(rightX)} ${mapY(rightX - shift)}`,
    ].join(" ");
  }

  const vertexLatex = `(${shift},\\, 0)`;
  const vertexLabel = labelSpot({
    x: mapX(shift),
    y: mapY(0),
    frame: LABEL_FRAME,
    dx: shift < 0 ? 1 : -1,
    dy: -1,
    halfW: labelHalfW(vertexLatex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 12,
    avoid: TICK_BOXES,
  });

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: stand the corner line where this graph turns, and give the height the graph
        reaches at the marked input.
      </WidgetTask>

      <svg
        viewBox={`0 0 440 ${VIEW_H}`}
        role="img"
        aria-label={`An empty grid for y equals the absolute value of ${argSpoken(shift)}, with a movable corner line currently at x equals ${dial}`}
      >
        <title>A shifted absolute-value graph and where its corner stands</title>

        <SvgMath latex={equation} x={220} y={13} fontSize={16} color={LABEL} w={320} />

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

        {X_GRID.map((value) => (
          <line
            key={`gx${value}`}
            x1={mapX(value)}
            y1={PLOT.top}
            x2={mapX(value)}
            y2={PLOT.bottom}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.5}
          />
        ))}
        {Y_GRID.map((value) => (
          <line
            key={`gy${value}`}
            x1={PLOT.left}
            y1={mapY(value)}
            x2={PLOT.right}
            y2={mapY(value)}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.5}
          />
        ))}

        <line
          x1={PLOT.left}
          y1={mapY(0)}
          x2={PLOT.right}
          y2={mapY(0)}
          stroke={SOFT}
          strokeWidth={1.3}
        />
        <line
          x1={mapX(0)}
          y1={PLOT.top}
          x2={mapX(0)}
          y2={PLOT.bottom}
          stroke={SOFT}
          strokeWidth={1.3}
        />

        {solved && <path d={veePath()} fill="none" stroke={CIVIC} strokeWidth={2.6} />}

        {/* The candidate corner. Amber while it is a guess, because it reports on nothing the
            learner has answered yet, and green only once the pair has been accepted. */}
        <line
          x1={mapX(dial)}
          y1={PLOT.top + 1}
          x2={mapX(dial)}
          y2={PLOT.bottom - 1}
          stroke={solved ? CIVIC : SIGNAL_DEEP}
          strokeWidth={2}
          strokeDasharray="6 4"
        />

        {/* The input the typed height is read at, marked so the question has a place. */}
        <line
          x1={mapX(PROBE)}
          y1={mapY(0) - 5}
          x2={mapX(PROBE)}
          y2={mapY(0) + 5}
          stroke={BRICK}
          strokeWidth={2}
        />
        {solved && <circle cx={mapX(PROBE)} cy={mapY(height)} r={4.5} fill={BRICK} />}

        {NUMBERED_X.map((tick) => (
          <text
            key={`tx${tick}`}
            x={mapX(tick)}
            y={mapY(0) + 15}
            textAnchor="middle"
            fontSize={TICK_SIZE}
            fill={SOFT}
            stroke="var(--paper)"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {tick}
          </text>
        ))}
        {NUMBERED_Y.map((tick) => (
          <text
            key={`ty${tick}`}
            x={mapX(0) - 8}
            y={mapY(tick) + 4}
            textAnchor="end"
            fontSize={TICK_SIZE}
            fill={SOFT}
            stroke="var(--paper)"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {tick}
          </text>
        ))}

        {solved && (
          <PlotLabel
            box={vertexLabel}
            latex={vertexLatex}
            fontSize={LABEL_SIZE}
            color={CIVIC}
          />
        )}
      </svg>

      <label
        className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
        htmlFor="fun10-corner"
      >
        Corner line <InlineMath latex={`x = ${dial}`} />
      </label>
      <input
        id="fun10-corner"
        className="lesson-interactive__range"
        type="range"
        min={DIAL_MIN}
        max={DIAL_MAX}
        step={1}
        value={dial}
        disabled={solved}
        aria-valuetext={`corner line at x equals ${dial}`}
        onChange={(event) => {
          setDial(Number(event.target.value));
          setFeedback(null);
        }}
      />

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different shift
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: BRICK }}>
            <span className="lesson-interactive__field-label">
              height at <InlineMath latex={`x = ${PROBE}`} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label={`the height of the graph at x equals ${PROBE}`}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  check();
                }
              }}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={
          <>
            the corner stands at <InlineMath latex={`x = ${shift}`} />, and the height at{" "}
            <InlineMath latex={`x = ${PROBE}`} /> is <InlineMath latex={String(height)} />
          </>
        }
        why={
          <>
            The bars hand back a distance, and the smallest distance available is zero, so
            the graph bottoms out at the input that empties them. Solving{" "}
            <InlineMath latex={`${argTex(shift)} = 0`} /> gives{" "}
            <InlineMath latex={`x = ${shift}`} />, which is why a{" "}
            {shift < 0 ? "plus" : "minus"} sign inside moves the corner to the{" "}
            {shift < 0 ? "left" : "right"}. Putting <InlineMath latex={`x = ${PROBE}`} />{" "}
            through the same bars gives{" "}
            <InlineMath
              latex={`\\left\\lvert ${PROBE} ${shift < 0 ? "+" : "-"} ${Math.abs(shift)} \\right\\rvert = ${height}`}
            />
            .
          </>
        }
        onReveal={reveal}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            <InlineMath latex={`${argTex(shift)} = 0`} /> at{" "}
            <InlineMath latex={`x = ${shift}`} />, so the corner stands there and every
            other input is a distance away from it. The arms climb at the same rate on both
            sides.
          </>
        ) : (
          (feedback ??
          "The bars never hand back anything below zero, so the graph is lowest exactly where the quantity inside them is zero.")
        )}
      </p>
    </div>
  );
}
