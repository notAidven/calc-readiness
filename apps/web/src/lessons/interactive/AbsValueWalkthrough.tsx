/**
 * FUN.10 slide 3: reading a finished vee, by walking a marker along it and then stopping.
 *
 * Play and Step sweep a marker from the left end, down one arm, through the corner and part
 * of the way up the other, naming which way the trace is going at each frame. Then it STOPS.
 * Pressing Play alone produces nothing: the turning height is typed by the learner, and the
 * shape of the range is a call they have to make, so the walkthrough lays the structure out
 * and the learner supplies the two readings it was heading for.
 *
 * A wrong call on the range locks that option rather than leaving the other two on offer, so
 * a three-way question is a question rather than a sequence of guesses.
 */

import { type ReactNode, useEffect, useState } from "react";

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
import { usePlayingSignal } from "./usePlayingSignal";

/* ------------------------------------------------------------------------- the plane */

const X_MIN = -8;
const X_MAX = 8;
const Y_MIN = -6;
const Y_MAX = 8;
/**
 * The plot sits 34 down rather than 24, for the same reason it does on the vertex slider: the
 * heading `SvgMath` centres at `y={13}` reaches about 22, so a frame at 24 left it two units.
 * Both edges move down together so the plot's HEIGHT is unchanged; the sweep note moves with
 * them to `y={226}`, and `VIEW_H` trims to 240 so the empty band under the plane does not
 * stay as tall as the old box.
 */
const PLOT = { left: 46, right: 394, top: 34, bottom: 212 };
const VIEW_H = 240;
const TICK_SIZE = 11;
const X_GRID = [-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7];
const Y_GRID = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7];
const X_TICKS = [-6, -4, -2, 2, 4, 6];
const Y_TICKS = [-4, -2, 2, 4, 6];

const mapX = (x: number): number =>
  PLOT.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (PLOT.right - PLOT.left);
const mapY = (y: number): number =>
  PLOT.top + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (PLOT.bottom - PLOT.top);

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

/* ------------------------------------------------------------------------- the rounds */

type Shape = "above" | "below" | "all";

interface Round {
  /** The trace `a|x - h| + k`, with `a` of magnitude one so the arms read cleanly. */
  a: number;
  h: number;
  k: number;
  /** The order the three options are dealt in, so the answer is never the first chip. */
  options: readonly Shape[];
}

/**
 * Two rounds, one opening upward and one opening downward, so the correct reading rotates
 * and a learner shown a floor is re-asked about a ceiling. Neither trace is the check's.
 */
const ROUNDS: readonly Round[] = [
  { a: 1, h: 2, k: -3, options: ["below", "above", "all"] },
  { a: -1, h: -1, k: 4, options: ["above", "below", "all"] },
];

const OPTION_TEXT: Readonly<Record<Shape, { label: string; aria: string }>> = {
  above: {
    label: "every output is at or above the turning height",
    aria: "every output is at or above the turning height",
  },
  below: {
    label: "every output is at or below the turning height",
    aria: "every output is at or below the turning height",
  },
  all: {
    label: "every output is possible",
    aria: "every output is possible",
  },
};

/** How many marker positions the sweep lays out before it stops. */
const FRAMES = 4;
const FRAME_MS = 900;

/** `x - 2` / `x + 1`, the argument as the learner reads it. */
function argTex(h: number): string {
  return h < 0 ? `x + ${-h}` : `x - ${h}`;
}

/** The tail outside the bars: ` + 4`, ` - 3`, or nothing. */
function tailTex(k: number): string {
  if (k === 0) {
    return "";
  }
  return k < 0 ? ` - ${-k}` : ` + ${k}`;
}

/** The coefficient in front of the bars, with the unit magnitudes tidied away. */
function coeffTex(a: number): string {
  if (a === 1) {
    return "";
  }
  if (a === -1) {
    return "-";
  }
  return `${a}`;
}

export function AbsValueWalkthrough(props: LessonWidgetProps) {
  const variant = useWidgetVariants(ROUNDS.length, props);
  const round = ROUNDS[variant.index] ?? (ROUNDS[0] as Round);
  return (
    <AbsValueWalkthroughBody
      key={variant.nonce}
      round={round}
      onSolved={variant.latch}
      onRestart={variant.restart}
      onPlayingChange={props.onPlayingChange}
    />
  );
}

function AbsValueWalkthroughBody({
  round,
  onSolved,
  onRestart,
  onPlayingChange,
}: {
  round: Round;
  onSolved: () => void;
  onRestart: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [entry, setEntry] = useState("");
  const [heightDone, setHeightDone] = useState(false);
  const [called, setCalled] = useState<Shape | null>(null);
  const [locked, setLocked] = useState<readonly Shape[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  usePlayingSignal(playing, onPlayingChange);
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const { a, h, k } = round;
  const opensUp = a > 0;
  const correct: Shape = opensUp ? "above" : "below";
  const equation = `y = ${coeffTex(a)}\\left\\lvert ${argTex(h)} \\right\\rvert${tailTex(k)}`;
  const solved = heightDone && called === correct;

  // Auto-advance timer: re-scheduled per frame, self-stops at the end, cleaned up on unmount.
  useEffect(() => {
    if (!playing) {
      return;
    }
    if (frame >= FRAMES) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setFrame((current) => current + 1), FRAME_MS);
    return () => clearTimeout(timer);
  }, [playing, frame]);

  /** Open the gate once both readings are the learner's own or have been handed over. */
  function maybeFinish(heightIn: boolean, callIn: Shape | null) {
    if (heightIn && callIn === correct && !done) {
      setDone(true);
      onSolved();
    }
  }

  function checkHeight() {
    if (heightDone) {
      return;
    }
    setAttempted(true);
    const typed = entry.trim();
    if (typed === "") {
      setFeedback("Give the height the trace turns at.");
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
    if (read.value === k) {
      setHeightDone(true);
      setFeedback(null);
      success();
      maybeFinish(true, called);
      return;
    }
    setFeedback(
      <>
        Not yet. The turn happens where the bars hold zero, so read the height off the rule
        at that input rather than off the sweep.
      </>,
    );
  }

  function call(option: Shape) {
    if (locked.includes(option) || called === correct) {
      return;
    }
    setAttempted(true);
    if (option === correct) {
      setCalled(option);
      setFeedback(null);
      success();
      maybeFinish(heightDone, option);
      return;
    }
    setLocked((prev) => [...prev, option]);
    setFeedback(
      option === "all" ? (
        <>
          The trace never reaches past its own corner, so a whole column of outputs is
          missing. A vee is bounded on one side.
        </>
      ) : (
        <>
          The arms both run away from the corner in the same direction, so the corner is an
          end of the outputs rather than a point in the middle of them.
        </>
      ),
    );
  }

  /** The reveal hands over whichever reading is still outstanding. */
  function reveal() {
    setRevealed(true);
    setFeedback(null);
    if (!heightDone) {
      setEntry(String(k));
      setHeightDone(true);
      maybeFinish(true, called);
      return;
    }
    setCalled(correct);
    maybeFinish(heightDone, correct);
  }

  function replay() {
    setFrame(0);
    setPlaying(false);
  }

  /** The trace, sampled and clamped to the window. */
  function tracePath(): string {
    const points: string[] = [];
    for (let step = 0; step <= 160; step += 1) {
      const x = X_MIN + ((X_MAX - X_MIN) * step) / 160;
      const y = a * Math.abs(x - h) + k;
      if (y < Y_MIN || y > Y_MAX) {
        continue;
      }
      points.push(`${mapX(x).toFixed(2)} ${mapY(y).toFixed(2)}`);
    }
    return points.length > 1 ? `M ${points.join(" L ")}` : "";
  }

  /** Where the sweep's marker sits at each frame, and what the trace is doing there. */
  const stops: readonly { x: number; note: string }[] = [
    { x: Math.max(X_MIN + 1, h - 5), note: opensUp ? "falling" : "rising" },
    { x: Math.max(X_MIN + 1, h - 2), note: opensUp ? "falling" : "rising" },
    { x: h, note: "the turn" },
    { x: Math.min(X_MAX - 1, h + 3), note: opensUp ? "rising" : "falling" },
  ];
  const shown = stops.slice(0, frame);
  const marker = shown[shown.length - 1];
  const laid = frame >= FRAMES;

  /** True while the reveal would explain one of two readings the learner still owes. */
  const bothOutstanding = !heightDone && called !== correct;

  let status: ReactNode;
  if (feedback) {
    status = feedback;
  } else if (solved) {
    status = (
      <>
        The turn sits at <InlineMath latex={`(${h},\\, ${k})`} />, and both arms run{" "}
        {opensUp ? "upward" : "downward"} from it, so the outputs are{" "}
        {opensUp ? "bounded below" : "bounded above"} and stretch away without limit on the
        other side. On the way in the trace {opensUp ? "falls" : "rises"} and on the way out
        it {opensUp ? "rises" : "falls"}.
      </>
    );
  } else if (!laid) {
    status = (
      <>
        The sweep walks the trace from the left. Watch what it does before the corner and
        after it.
      </>
    );
  } else {
    status = (
      <>
        The sweep stops here. Read the turning height off the rule, and settle what the
        whole set of outputs looks like.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <WidgetTask>
        Goal: give the height this trace turns at, and settle which outputs it can reach.
      </WidgetTask>

      <svg
        viewBox={`0 0 440 ${VIEW_H}`}
        role="img"
        aria-label={`A vee-shaped trace on a grid, turning at the point ${h}, ${k}, with a marker sweeping along it`}
      >
        <title>A vee-shaped trace, swept from one end to the other</title>

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

        <path d={tracePath()} fill="none" stroke={CIVIC} strokeWidth={2.6} />

        {/* The turning height, drawn as a rule across the plot only once it is settled. */}
        {heightDone && (
          <line
            x1={PLOT.left + 1}
            y1={mapY(k)}
            x2={PLOT.right - 1}
            y2={mapY(k)}
            stroke={BRICK}
            strokeWidth={1.6}
            strokeDasharray="5 4"
          />
        )}

        {shown.map((stop) => (
          <circle
            key={`stop${stop.x}`}
            cx={mapX(stop.x)}
            cy={mapY(a * Math.abs(stop.x - h) + k)}
            r={3}
            fill={SOFT}
          />
        ))}
        {marker && (
          <circle
            cx={mapX(marker.x)}
            cy={mapY(a * Math.abs(marker.x - h) + k)}
            r={6}
            fill="none"
            stroke={SIGNAL_DEEP}
            strokeWidth={2.4}
          />
        )}

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

        {marker && (
          <text x={220} y={226} textAnchor="middle" fontSize={14} fill={SIGNAL_DEEP}>
            {marker.note}
          </text>
        )}
      </svg>

      {!solved && (
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__step"
            onClick={() => setPlaying(true)}
            disabled={playing || laid}
          >
            Play
          </button>
          <button
            type="button"
            className="lesson-interactive__step"
            onClick={() => setFrame((current) => Math.min(FRAMES, current + 1))}
            disabled={playing || laid}
          >
            Step
          </button>
          {frame > 0 && (
            <button
              type="button"
              className="lesson-interactive__step"
              onClick={replay}
              disabled={playing}
            >
              Replay
            </button>
          )}
        </div>
      )}

      {laid && !solved && (
        <>
          <div className="lesson-interactive__controls">
            <div className="lesson-interactive__field" style={{ color: BRICK }}>
              <span className="lesson-interactive__field-label">turning height</span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("integer")}
                value={entry}
                disabled={heightDone}
                aria-label="the height the trace turns at"
                onChange={(event) => setEntry(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    checkHeight();
                  }
                }}
              />
            </div>
            {!heightDone && (
              <button
                type="button"
                className="lesson-interactive__check"
                onClick={checkHeight}
              >
                Check
              </button>
            )}
          </div>
          <div className="lesson-interactive__controls">
            {round.options.map((option) => (
              <button
                key={option}
                type="button"
                className="lesson-interactive__chip"
                style={{ color: LABEL, borderColor: LINE }}
                data-state={
                  locked.includes(option)
                    ? "wrong"
                    : called === option
                      ? "solved"
                      : undefined
                }
                disabled={locked.includes(option) || called === correct}
                aria-label={OPTION_TEXT[option].aria}
                onClick={() => call(option)}
              >
                {OPTION_TEXT[option].label}
              </button>
            ))}
          </div>
        </>
      )}

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different trace
        </button>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        othersRemain={bothOutstanding}
        answer={!heightDone ? <InlineMath latex={String(k)} /> : OPTION_TEXT[correct].label}
        why={
          !heightDone ? (
            <>
              The trace turns where the bars hold zero, which is{" "}
              <InlineMath latex={`x = ${h}`} />. The bars give nothing there, so the height
              is whatever stands outside them, <InlineMath latex={String(k)} />.
            </>
          ) : (
            <>
              Away from the corner the bars are positive, and{" "}
              <InlineMath latex={coeffTex(a) === "-" ? "-1" : "1"} /> is{" "}
              {opensUp ? "positive" : "negative"}, so every other output is{" "}
              {opensUp ? "above" : "below"} <InlineMath latex={String(k)} /> and the arms
              run away without limit on that side alone.
            </>
          )
        }
        onReveal={reveal}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
