/**
 * EL.4 slide 2: the asymptote and the domain as one boundary, tuned to a shifted logarithm.
 *
 * The curve is NOT drawn while the question is open, and that is the whole design. Drawn, the
 * dial becomes a matter of sliding a line until it lines up with something already on the
 * board; undrawn, the only thing to work from is the argument in the heading, which is the
 * algebra the slide is about. The curve and the shaded domain arrive when the answer lands.
 *
 * Two answers, one gate. The dial names the boundary and the box names the smallest integer
 * the domain actually contains, so a learner who has the boundary and thinks it belongs to the
 * domain is caught by the second half. A dial alone could be walked through its positions
 * until something looked right, and the box alone would not say where the wall is.
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

interface Board {
  /** The boundary: the argument is `x - h`, so the domain is `x > h`. */
  h: number;
  /** The log token as LaTeX, and the base the curve is drawn in. */
  token: string;
  base: number;
}

/**
 * Two boards, one shifting right and one shifting left, so the sign inside the argument has to
 * be read rather than assumed. Neither is the CFU's reflected logarithm.
 */
const BOARDS: readonly Board[] = [
  { h: 3, token: "\\log", base: 10 },
  { h: -2, token: "\\ln", base: Math.E },
];

const DIAL_MIN = -6;
const DIAL_MAX = 6;

/**
 * The plot keeps its 154 units of height and is moved DOWN, rather than being squashed to
 * make room: the heading above it is a line of math about 18 units tall drawn centred, so at
 * a top of 26 its glyphs reached above the canvas and lost the tops of their parentheses.
 * The canvas grows by the same 8 units the plot moved, so the curve is unchanged.
 */
const PLOT = { left: 56, right: 396, top: 34, bottom: 188 };
const VIEW_H = 234;
const X_MIN = -7;
const X_MAX = 7;
const Y_MIN = -3.5;
const Y_MAX = 3.5;
const TICK_SIZE = 11;

const mapX = (x: number): number =>
  PLOT.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (PLOT.right - PLOT.left);
const mapY = (y: number): number =>
  PLOT.top + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (PLOT.bottom - PLOT.top);

/** `x - 3` or `x + 2`, the argument as the learner reads it. */
function argTex(h: number): string {
  return h < 0 ? `x + ${-h}` : `x - ${h}`;
}

export function LogShiftSlider(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <LogShiftSliderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LogShiftSliderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
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

  /** The smallest integer strictly greater than the boundary. */
  const smallest = board.h + 1;
  const equation = `y = ${board.token}(${argTex(board.h)})`;

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
      setFeedback("Set the boundary, and enter the smallest integer the domain contains.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about setting the argument above zero, which would answer a
    // question the learner did not ask. The attempt above still stands, so the reveal stays
    // on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (dial === board.h && read.value === smallest) {
      finish(true);
      return;
    }
    setFeedback(
      "Not yet. Set the argument above zero and solve it for x: the value the inequality turns on is the boundary, and the domain starts strictly past it, so the boundary itself is not in it.",
    );
  }

  function reveal() {
    setDial(board.h);
    setEntry(String(smallest));
    setRevealed(true);
    finish(false);
  }

  const gridX: number[] = [];
  for (let value = X_MIN + 1; value <= X_MAX - 1; value += 1) {
    if (value !== 0) {
      gridX.push(value);
    }
  }
  const gridY = [-3, -2, -1, 1, 2, 3];
  const numberedX = fittingTicks({
    ticks: gridX,
    place: mapX,
    half: (tick) => labelHalfW(String(tick), TICK_SIZE),
    start: PLOT.left,
    end: PLOT.right,
  });
  const numberedY = fittingTicks({
    ticks: gridY,
    place: mapY,
    half: () => labelHalfH(TICK_SIZE),
    start: PLOT.top,
    end: PLOT.bottom,
  });

  /** The curve, sampled to the right of the boundary and clipped to the window. */
  function curvePath(): string {
    const points: string[] = [];
    const steps = 320;
    for (let step = 1; step <= steps; step += 1) {
      const x = board.h + ((X_MAX - board.h) * step) / steps;
      const y = Math.log(x - board.h) / Math.log(board.base);
      if (!Number.isFinite(y) || y < Y_MIN || y > Y_MAX) {
        continue;
      }
      points.push(`${mapX(x).toFixed(2)} ${mapY(y).toFixed(2)}`);
    }
    return points.length > 1 ? `M ${points.join(" L ")}` : "";
  }

  const path = solved ? curvePath() : "";

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: put the boundary line where this logarithm's domain begins, and give the
        smallest integer the domain contains.
      </WidgetTask>

      <svg
        viewBox={`0 0 440 ${VIEW_H}`}
        role="img"
        aria-label={`An empty grid for ${equation}, with a movable boundary line currently at x equals ${dial}`}
      >
        <title>A shifted logarithm, its boundary line, and the inputs it accepts</title>

        {/* `y` is an ink CENTRE, so it has to clear half the glyph height of the canvas top
            as well as leaving the plot frame at 34 alone. */}
        <SvgMath latex={equation} x={220} y={14} fontSize={16} color={LABEL} w={300} />

        <rect
          data-plot-frame=""
          x={PLOT.left}
          y={PLOT.top}
          width={PLOT.right - PLOT.left}
          height={PLOT.bottom - PLOT.top}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1}
          rx={6}
        />

        {/* The inputs the logarithm accepts, shaded once the boundary has been settled. */}
        {solved && (
          <rect
            x={mapX(board.h)}
            y={PLOT.top + 1}
            width={PLOT.right - mapX(board.h) - 1}
            height={PLOT.bottom - PLOT.top - 2}
            fill={CIVIC}
            fillOpacity={0.1}
          />
        )}

        {gridX.map((tick) => (
          <line
            key={`gx${tick}`}
            x1={mapX(tick)}
            y1={PLOT.top}
            x2={mapX(tick)}
            y2={PLOT.bottom}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.5}
          />
        ))}
        {gridY.map((tick) => (
          <line
            key={`gy${tick}`}
            x1={PLOT.left}
            y1={mapY(tick)}
            x2={PLOT.right}
            y2={mapY(tick)}
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
          strokeWidth={1.25}
        />
        <line
          x1={mapX(0)}
          y1={PLOT.top}
          x2={mapX(0)}
          y2={PLOT.bottom}
          stroke={SOFT}
          strokeWidth={1.25}
        />

        {path !== "" && <path d={path} fill="none" stroke={CIVIC} strokeWidth={2.4} />}

        {/* The candidate boundary. Amber while it is a guess, because it reports on nothing
            the learner has answered yet, and green only once the pair has been accepted. */}
        <line
          x1={mapX(dial)}
          y1={PLOT.top + 1}
          x2={mapX(dial)}
          y2={PLOT.bottom - 1}
          stroke={solved ? CIVIC : SIGNAL_DEEP}
          strokeWidth={2}
          strokeDasharray="6 4"
        />

        {numberedX.map((tick) => (
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
        {numberedY.map((tick) => (
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
      </svg>

      <label
        className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
        htmlFor="el4-boundary"
      >
        Boundary line <InlineMath latex={`x = ${dial}`} />
      </label>
      <input
        id="el4-boundary"
        className="lesson-interactive__range"
        type="range"
        min={DIAL_MIN}
        max={DIAL_MAX}
        step={1}
        value={dial}
        disabled={solved}
        aria-valuetext={`boundary line at x equals ${dial}`}
        onChange={(e) => {
          setDial(Number(e.target.value));
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
              smallest integer in the domain
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label="The smallest integer the domain contains"
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
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
            the boundary is <InlineMath latex={`x = ${board.h}`} />, and the smallest
            integer in the domain is <InlineMath latex={String(smallest)} />
          </>
        }
        why={
          <>
            A logarithm accepts only a positive argument, so this one needs{" "}
            <InlineMath latex={`${argTex(board.h)} > 0`} />, which is{" "}
            <InlineMath latex={`x > ${board.h}`} />. The boundary of the domain is therefore{" "}
            <InlineMath latex={`x = ${board.h}`} />, and that is exactly where the vertical
            asymptote stands. The inequality is strict, so{" "}
            <InlineMath latex={String(board.h)} /> itself is not an input at all and the
            smallest integer the domain holds is the next one along,{" "}
            <InlineMath latex={String(smallest)} />.
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
            <InlineMath latex={`${argTex(board.h)} > 0`} /> gives{" "}
            <InlineMath latex={`x > ${board.h}`} />, so the shaded inputs are the domain and
            the asymptote stands on its boundary. The curve plunges beside that line and
            never crosses it.
          </>
        ) : (
          (feedback ??
          "The argument decides everything here. Require it to be positive, solve for x, and the boundary of the domain is the value that condition turns on.")
        )}
      </p>
    </div>
  );
}
