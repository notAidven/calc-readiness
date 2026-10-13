/**
 * LF.2 interactive (slide 2): rule on four pairs of lines as parallel, perpendicular, or
 * neither. Tapping a pair plots both lines in their own colour, so the verdict can be
 * checked against the picture after it is made from the slopes.
 *
 * Two of the four pairs exist to break a rule applied by shape rather than by value. The
 * flipped fraction pair looks perpendicular and is not, because flipping without negating
 * gives a product of 1. The horizontal-and-vertical pair IS perpendicular and cannot be
 * shown so by the product test, because a vertical line has no slope to multiply.
 *
 * A wrong tap locks that pair as a miss and answers with the specific misreading it
 * represents, so the board cannot be brute-forced through three chips. The gate then turns
 * on all four pairs being CALLED rather than on all four being right: a learner who misread
 * one pair, was told what it actually does, and ruled the other three correctly has done the
 * work, and the cross stays on the chip either way. None of the pairs is used by the CFU or
 * the practice bank.
 *
 * Two sets of four rotate on "start over". The second set keeps the same four KINDS, because
 * two of them are the traps the board exists for and dropping either would make the reset a
 * softer board rather than a different one, but every slope and every intercept is new: the
 * parallel pair now falls, the flipped fraction is three quarters against four thirds, and
 * the perpendicular pair is a positive slope against a negative reciprocal rather than the
 * other way round.
 */

import { type ReactNode, useState } from "react";

import {
  BRICK,
  CIVIC,
  InlineMath,
  interiorTicks,
  LABEL,
  LINE,
  SOFT,
  SvgMath,
} from "../svgKit";
import {
  type LessonWidgetProps,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

/* 20 user units per grid square in both directions, so a right angle is drawn as one. */
const X_MIN = -8;
const X_MAX = 8;
const Y_MIN = -6;
const Y_MAX = 6;
const LEFT = 60;
const RIGHT = 380;
const TOP = 14;
const BOTTOM = 254;

function mapX(x: number): number {
  return LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * (RIGHT - LEFT);
}

function mapY(y: number): number {
  return BOTTOM - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (BOTTOM - TOP);
}

type Line =
  | { kind: "slope"; m: number; b: number; tex: string }
  | { kind: "vertical"; at: number; tex: string };

type Verdict = "parallel" | "perpendicular" | "neither";

interface Pair {
  id: string;
  label: string;
  a: Line;
  b: Line;
  verdict: Verdict;
  /** The whole pair read aloud, for the chip's accessible name. */
  aria: string;
  /** Why the verdict holds, revealed once the pair is ruled correctly. */
  because: string;
  /**
   * The two slopes as LaTeX, and their product where both lines have one.
   *
   * Carried on the pair rather than formatted from `m`, because these are quoted back in
   * the corrections and a slope of `2/3` has to read as a fraction there, not as `0.667`.
   */
  slopes: { a: string; b: string; product?: string };
}

const BOARDS: readonly (readonly Pair[])[] = [
  [
    {
      id: "same-slope",
      label: "Pair 1",
      a: { kind: "slope", m: 2, b: 1, tex: "y = 2x + 1" },
      b: { kind: "slope", m: 2, b: -5, tex: "y = 2x - 5" },
      verdict: "parallel",
      aria: "y equals 2 x plus 1, and y equals 2 x minus 5",
      because: "m_{1} = m_{2} = 2",
      slopes: { a: "2", b: "2", product: "4" },
    },
    {
      id: "flipped",
      label: "Pair 2",
      a: { kind: "slope", m: 2 / 3, b: 4, tex: "y = \\dfrac{2}{3}x + 4" },
      b: { kind: "slope", m: 3 / 2, b: -1, tex: "y = \\dfrac{3}{2}x - 1" },
      verdict: "neither",
      aria: "y equals two thirds x plus 4, and y equals three halves x minus 1",
      because: "\\dfrac{2}{3} \\times \\dfrac{3}{2} = 1, \\;\\; \\text{not } -1",
      slopes: { a: "\\dfrac{2}{3}", b: "\\dfrac{3}{2}" },
    },
    {
      id: "negative-reciprocal",
      label: "Pair 3",
      a: { kind: "slope", m: -1 / 4, b: 0, tex: "y = -\\dfrac{1}{4}x" },
      b: { kind: "slope", m: 4, b: 2, tex: "y = 4x + 2" },
      verdict: "perpendicular",
      aria: "y equals negative one quarter x, and y equals 4 x plus 2",
      because: "-\\dfrac{1}{4} \\times 4 = -1",
      slopes: { a: "-\\dfrac{1}{4}", b: "4" },
    },
    {
      id: "axes",
      label: "Pair 4",
      a: { kind: "slope", m: 0, b: 3, tex: "y = 3" },
      b: { kind: "vertical", at: -2, tex: "x = -2" },
      verdict: "perpendicular",
      aria: "y equals 3, and x equals negative 2",
      because: "\\text{horizontal meets vertical at a right angle}",
      slopes: { a: "0", b: "\\text{undefined}" },
    },
  ],
  [
    {
      id: "same-slope",
      label: "Pair 1",
      a: { kind: "slope", m: -3, b: 2, tex: "y = -3x + 2" },
      b: { kind: "slope", m: -3, b: -4, tex: "y = -3x - 4" },
      verdict: "parallel",
      aria: "y equals negative 3 x plus 2, and y equals negative 3 x minus 4",
      because: "m_{1} = m_{2} = -3",
      slopes: { a: "-3", b: "-3", product: "9" },
    },
    {
      id: "flipped",
      label: "Pair 2",
      a: { kind: "slope", m: 3 / 4, b: 3, tex: "y = \\dfrac{3}{4}x + 3" },
      b: { kind: "slope", m: 4 / 3, b: -2, tex: "y = \\dfrac{4}{3}x - 2" },
      verdict: "neither",
      aria: "y equals three quarters x plus 3, and y equals four thirds x minus 2",
      because: "\\dfrac{3}{4} \\times \\dfrac{4}{3} = 1, \\;\\; \\text{not } -1",
      slopes: { a: "\\dfrac{3}{4}", b: "\\dfrac{4}{3}" },
    },
    {
      id: "negative-reciprocal",
      label: "Pair 3",
      a: { kind: "slope", m: 2 / 5, b: 0, tex: "y = \\dfrac{2}{5}x" },
      b: { kind: "slope", m: -5 / 2, b: 1, tex: "y = -\\dfrac{5}{2}x + 1" },
      verdict: "perpendicular",
      aria: "y equals two fifths x, and y equals negative five halves x plus 1",
      because: "\\dfrac{2}{5} \\times \\left(-\\dfrac{5}{2}\\right) = -1",
      slopes: { a: "\\dfrac{2}{5}", b: "-\\dfrac{5}{2}" },
    },
    {
      id: "axes",
      label: "Pair 4",
      a: { kind: "slope", m: 0, b: -4, tex: "y = -4" },
      b: { kind: "vertical", at: 1, tex: "x = 1" },
      verdict: "perpendicular",
      aria: "y equals negative 4, and x equals 1",
      because: "\\text{horizontal meets vertical at a right angle}",
      slopes: { a: "0", b: "\\text{undefined}" },
    },
  ],
];

const VERDICTS: readonly { verdict: Verdict; label: string }[] = [
  { verdict: "parallel", label: "Parallel" },
  { verdict: "perpendicular", label: "Perpendicular" },
  { verdict: "neither", label: "Neither" },
];

const GRID_X = Array.from({ length: X_MAX - X_MIN + 1 }, (_unused, i) => X_MIN + i);
const GRID_Y = Array.from({ length: Y_MAX - Y_MIN + 1 }, (_unused, i) => Y_MIN + i);
/** No number on the border: one centered there is drawn half outside the plot. */
const TICKS_X = interiorTicks([-6, -3, 3, 6], X_MIN, X_MAX);
const TICKS_Y = interiorTicks([-4, -2, 2, 4], Y_MIN, Y_MAX);

/** The two visible endpoints of a line inside the plot box, in screen units. */
function clip(line: Line): [number, number, number, number] | null {
  if (line.kind === "vertical") {
    return [mapX(line.at), mapY(Y_MIN), mapX(line.at), mapY(Y_MAX)];
  }
  const { m, b } = line;
  const points: { x: number; y: number }[] = [];
  const add = (x: number, y: number) => {
    if (x < X_MIN - 1e-6 || x > X_MAX + 1e-6 || y < Y_MIN - 1e-6 || y > Y_MAX + 1e-6) {
      return;
    }
    if (points.some((p) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6)) {
      return;
    }
    points.push({ x, y });
  };
  add(X_MIN, m * X_MIN + b);
  add(X_MAX, m * X_MAX + b);
  if (m !== 0) {
    add((Y_MIN - b) / m, Y_MIN);
    add((Y_MAX - b) / m, Y_MAX);
  }
  const [start, end] = points;
  if (!start || !end) {
    return null;
  }
  return [mapX(start.x), mapY(start.y), mapX(end.x), mapY(end.y)];
}

/** The second factor of a product: a negative one keeps its parentheses. */
function factor(tex: string): string {
  return tex.startsWith("-") ? `\\left(${tex}\\right)` : tex;
}

/** The correction for tapping `chosen` on `pair`, named for the misreading it is. */
function correction(pair: Pair, chosen: Verdict): ReactNode {
  const { a, b, product } = pair.slopes;
  if (pair.id === "same-slope") {
    return chosen === "perpendicular" ? (
      <>
        Both slopes are <InlineMath latex={a} />, and{" "}
        <InlineMath latex={`${a} \\times ${factor(b)} = ${product ?? ""}`} />, which is not{" "}
        <InlineMath latex="-1" />. Pair locked as a miss.
      </>
    ) : (
      <>
        Look again: both slopes are <InlineMath latex={a} />, and equal slopes have a name.
        Pair locked as a miss.
      </>
    );
  }
  if (pair.id === "flipped") {
    return chosen === "parallel" ? (
      <>
        <InlineMath latex={a} /> and <InlineMath latex={b} /> are not the same number, so
        the two lines are not equally steep. Pair locked as a miss.
      </>
    ) : (
      <>
        Flipping alone is not enough: <InlineMath latex={`${a} \\times ${factor(b)} = 1`} />
        , and a right angle needs <InlineMath latex="-1" />. Pair locked as a miss.
      </>
    );
  }
  if (pair.id === "negative-reciprocal") {
    return chosen === "parallel" ? (
      <>
        One slope is negative and the other positive, so one line falls while the other
        rises. They cannot be equal. Pair locked as a miss.
      </>
    ) : (
      <>
        Multiply the slopes before you rule it out:{" "}
        <InlineMath latex={`${a} \\times ${factor(b)}`} /> is exactly the value the
        right-angle test looks for. Pair locked as a miss.
      </>
    );
  }
  return chosen === "parallel" ? (
    <>
      One line is horizontal and the other is vertical, so they certainly do meet. Pair
      locked as a miss.
    </>
  ) : (
    <>
      A vertical line has no slope, so no product can be formed, yet a horizontal line and a
      vertical line still cross at a right angle. Pair locked as a miss.
    </>
  );
}

export function LinearLinePairClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  return (
    <LinearLinePairClassifyBody
      key={variant.nonce}
      pairs={BOARDS[variant.index] ?? (BOARDS[0] as readonly Pair[])}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LinearLinePairClassifyBody({
  pairs,
  onSolved,
  onRestart,
}: {
  pairs: readonly Pair[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [calls, setCalls] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();

  const pair = pairs.find((candidate) => candidate.id === selectedId) ?? null;
  const called = pair !== null && calls[pair.id] !== undefined;
  const ruled = pair !== null && calls[pair.id] === true;
  const complete = Object.keys(calls).length === pairs.length;
  const missed = Object.values(calls).some((hit) => !hit);
  /**
   * Every pair called AND every call right. What the CONCLUSION below is said about, and
   * deliberately not what the gate turns on: see `rule`.
   */
  const solved = complete && !missed;

  function select(next: Pair) {
    setSelectedId(next.id);
    setFeedback(null);
  }

  function rule(verdict: Verdict) {
    if (!pair || calls[pair.id] !== undefined) {
      return;
    }
    const hit = verdict === pair.verdict;
    const next = { ...calls, [pair.id]: hit };
    setCalls(next);
    if (hit) {
      setFeedback(null);
      success();
    } else {
      setFeedback(correction(pair, verdict));
    }
    // CALLED, not called correctly. A pair that was misread is the most useful thing on this
    // board, and it has already been answered with the misreading it represents; sending the
    // learner back to re-rule the three they had right buys nothing and is what R29 names.
    if (Object.keys(next).length === pairs.length) {
      onSolved();
    }
  }

  const neutral = { color: LABEL, borderColor: LINE };
  const segmentA = pair ? clip(pair.a) : null;
  const segmentB = pair ? clip(pair.b) : null;

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <svg
        viewBox="0 0 440 320"
        role="img"
        aria-label={
          pair
            ? `Two lines on a grid: ${pair.aria}`
            : "An empty grid, waiting for a pair of lines"
        }
      >
        <title>Compare the slopes of two lines</title>

        <rect
          data-plot-frame=""
          x={LEFT}
          y={TOP}
          width={RIGHT - LEFT}
          height={BOTTOM - TOP}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1}
          rx={6}
        />
        {GRID_X.map((tick) => (
          <line
            key={`gx${tick}`}
            x1={mapX(tick)}
            y1={TOP}
            x2={mapX(tick)}
            y2={BOTTOM}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.55}
          />
        ))}
        {GRID_Y.map((tick) => (
          <line
            key={`gy${tick}`}
            x1={LEFT}
            y1={mapY(tick)}
            x2={RIGHT}
            y2={mapY(tick)}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.55}
          />
        ))}
        <line
          x1={LEFT}
          y1={mapY(0)}
          x2={RIGHT}
          y2={mapY(0)}
          stroke={SOFT}
          strokeWidth={1.25}
        />
        <line
          x1={mapX(0)}
          y1={TOP}
          x2={mapX(0)}
          y2={BOTTOM}
          stroke={SOFT}
          strokeWidth={1.25}
        />

        {segmentA && (
          <line
            x1={segmentA[0]}
            y1={segmentA[1]}
            x2={segmentA[2]}
            y2={segmentA[3]}
            stroke={CIVIC}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}
        {segmentB && (
          <line
            x1={segmentB[0]}
            y1={segmentB[1]}
            x2={segmentB[2]}
            y2={segmentB[3]}
            stroke={BRICK}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {TICKS_X.map((tick) => (
          <text
            key={`tx${tick}`}
            x={mapX(tick)}
            y={mapY(0) + 15}
            textAnchor="middle"
            fontSize={11}
            fill={SOFT}
            stroke="var(--paper)"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {tick}
          </text>
        ))}
        {TICKS_Y.map((tick) => (
          <text
            key={`ty${tick}`}
            x={mapX(0) - 8}
            y={mapY(tick) + 4}
            textAnchor="end"
            fontSize={11}
            fill={SOFT}
            stroke="var(--paper)"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {tick}
          </text>
        ))}

        {/* In the band that holds the two equations once a pair is picked, not over the
            grid: centred in the plot it crossed the axes and the gridlines behind it. */}
        {!pair && (
          <text x={220} y={278} textAnchor="middle" fontSize={13} fill={SOFT}>
            tap a pair below
          </text>
        )}
        {pair && (
          <>
            <SvgMath
              latex={pair.a.tex}
              x={124}
              y={278}
              fontSize={17}
              color={CIVIC}
              w={200}
            />
            <SvgMath
              latex={pair.b.tex}
              x={324}
              y={278}
              fontSize={17}
              color={BRICK}
              w={200}
            />
          </>
        )}
        {pair && ruled && (
          <SvgMath
            latex={pair.because}
            x={220}
            y={304}
            fontSize={14}
            color={SOFT}
            w={400}
          />
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {pairs.map((candidate) => {
          const call = calls[candidate.id];
          return (
            <button
              key={candidate.id}
              type="button"
              className="lesson-interactive__chip"
              style={neutral}
              aria-label={`show the pair ${candidate.aria}`}
              data-state={call === undefined ? undefined : call ? "solved" : "wrong"}
              onClick={() => select(candidate)}
            >
              {candidate.label}
              {call === undefined ? "" : call ? " \u2713" : " \u2717"}
            </button>
          );
        })}
      </div>

      {pair && !called && (
        <div className="lesson-interactive__controls">
          {VERDICTS.map((choice) => (
            <button
              key={choice.verdict}
              type="button"
              className="lesson-interactive__chip"
              style={neutral}
              aria-label={`${pair.label} is ${choice.verdict}`}
              onClick={() => rule(choice.verdict)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

      {complete && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with four different pairs
        </button>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : missed || feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            All four ruled. Equal slopes give parallel lines, a product of{" "}
            <InlineMath latex="-1" /> gives perpendicular lines, and a flipped fraction that
            was never negated gives neither.
          </>
        ) : complete && missed ? (
          // Says what is now true. It replaces "A clean board is every call right. Read each
          // slope off the equation, and run a fresh one.", which opened on the standard the
          // board had failed and then aimed the learner at a fresh one because a fresh one was
          // the only way past. Every called board opens the gate now, so there is nowhere to
          // send them.
          "That's all four ruled, so you're good to move on. A cross marks a pair that was called wrong, and tapping it plots both of its lines again."
        ) : (
          (feedback ??
          (pair === null ? (
            <>
              Tap a pair to plot it, then rule on it. Equal slopes give parallel lines, and
              slopes whose product is <InlineMath latex="-1" /> give perpendicular ones.
            </>
          ) : called ? (
            "This pair is already ruled. Tap another one."
          ) : (
            "Read both slopes, then rule on the pair. A wrong tap locks it."
          )))
        )}
      </p>
    </div>
  );
}
