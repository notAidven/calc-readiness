/**
 * LF.2 interactive (slide 0): the two letters of slope-intercept form, under the learner's
 * hands. Two sliders set `m` and `b`, the line and its equation redraw live, and a Check
 * button rules on the current setting.
 *
 * Gating needs TWO different targets, and only the first is handed over as an equation.
 * The second is described in words ("crosses the y-axis at (0, 4) and drops 2 units for
 * every step right"), so it cannot be matched by copying digits out of a formula: the
 * learner has to decide which described quantity is the slope and which is the intercept.
 * A wrong Check names WHICH letter is off without naming its value, so the correction is
 * still a hint rather than the answer.
 *
 * Neither target is used by the CFU or the practice bank.
 *
 * Two PAIRS of targets rotate on "start over", each pair keeping that shape: one line handed
 * over as an equation, one described in words. The second pair reverses both signs and both
 * roles, so the equation now falls steeply and the description now climbs gently, and every
 * one of the four numbers is new.
 *
 * The reveal is owed because nothing on the board converges: the plot draws the LEARNER's
 * line, never the target's, so a learner who has misread which described quantity is the
 * slope can slide both controls all day without the picture ever telling them so. It names
 * the equation the words describe and says which half of the sentence produced which letter.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, interiorTicks, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { WidgetBeside } from "../widgetBeside";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

/* The plotting window: 18 user units per grid square in BOTH directions, so a slope of
   1 really does look like a 45 degree rise. */
const X_MIN = -9;
const X_MAX = 9;
const Y_MIN = -6;
const Y_MAX = 6;
const LEFT = 58;
const RIGHT = 382;
const TOP = 14;
const BOTTOM = 230;

function mapX(x: number): number {
  return LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * (RIGHT - LEFT);
}

function mapY(y: number): number {
  return BOTTOM - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (BOTTOM - TOP);
}

/** The slope term of a line, with the unit coefficients written the way algebra writes them. */
function slopeTerm(m: number): string {
  if (m === 1) {
    return "x";
  }
  if (m === -1) {
    return "-x";
  }
  return `${m}x`;
}

/** `y = 3x - 2`, `y = -x`, `y = 4`. */
function lineTex(m: number, b: number): string {
  if (m === 0) {
    return `y = ${b}`;
  }
  if (b === 0) {
    return `y = ${slopeTerm(m)}`;
  }
  return `y = ${slopeTerm(m)} ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
}

/** A signed value read aloud, since KaTeX makes `textContent` unusable for a11y. */
function spoken(n: number): string {
  return n < 0 ? `negative ${-n}` : `${n}`;
}

/** The two visible endpoints of `y = mx + b` inside the plot box, or null if it misses it. */
function clipLine(m: number, b: number): [number, number, number, number] | null {
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

interface Target {
  m: number;
  b: number;
  ask: ReactNode;
  aria: string;
}

const BOARDS: readonly (readonly Target[])[] = [
  [
    {
      m: 3,
      b: -2,
      ask: (
        <>
          Build the line <InlineMath latex="y = 3x - 2" />.
        </>
      ),
      aria: "y equals 3 x minus 2",
    },
    {
      m: -2,
      b: 4,
      ask: (
        <>
          Build the line that crosses the <InlineMath latex="y" />
          -axis at <InlineMath latex="(0, 4)" /> and drops <InlineMath latex="2" /> units
          for every step right.
        </>
      ),
      aria: "the line through 0 comma 4 that falls 2 units for each step right",
    },
  ],
  /* The second pair swaps which target is the steep one: here the stated equation falls at
     -3 and the described line is the gentlest climb there is, so a learner who solved pair
     one by expecting "equation = climbs, words = falls" is given the reverse. Every value
     sits inside the sliders' own ranges, m over [-4, 4] and b over [-5, 5]. */
  [
    {
      m: -3,
      b: 1,
      ask: (
        <>
          Build the line <InlineMath latex="y = -3x + 1" />.
        </>
      ),
      aria: "y equals negative 3 x plus 1",
    },
    {
      m: 1,
      b: -4,
      ask: (
        <>
          Build the line that crosses the <InlineMath latex="y" />
          -axis at <InlineMath latex="(0, -4)" /> and climbs <InlineMath latex="1" /> unit
          for every step right.
        </>
      ),
      aria: "the line through 0 comma negative 4 that rises 1 unit for each step right",
    },
  ],
];

const GRID_X = Array.from({ length: X_MAX - X_MIN + 1 }, (_unused, i) => X_MIN + i);
const GRID_Y = Array.from({ length: Y_MAX - Y_MIN + 1 }, (_unused, i) => Y_MIN + i);
/** No number on the border: one centered there is drawn half outside the plot. */
const TICKS_X = interiorTicks([-6, -3, 3, 6], X_MIN, X_MAX);
const TICKS_Y = interiorTicks([-4, -2, 2, 4], Y_MIN, Y_MAX);

export function LinearLineFormBuild(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const targets = BOARDS[variant.index] ?? (BOARDS[0] as readonly Target[]);
  return (
    <LinearLineFormBuildBody
      key={variant.nonce}
      targets={targets}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LinearLineFormBuildBody({
  targets,
  onSolved,
  onRestart,
}: {
  targets: readonly Target[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [m, setM] = useState(0);
  const [b, setB] = useState(0);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [solved, setSolved] = useState(false);
  const [tried, setTried] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const target = targets[index] ?? (targets[0] as Target);
  const segment = clipLine(m, b);

  function change(next: { m?: number; b?: number }) {
    if (solved) {
      return;
    }
    if (next.m !== undefined) {
      setM(next.m);
    }
    if (next.b !== undefined) {
      setB(next.b);
    }
    setFeedback(null);
  }

  function check() {
    if (solved) {
      return;
    }
    const slopeOk = m === target.m;
    const interceptOk = b === target.b;
    if (!slopeOk || !interceptOk) {
      setTried(true);
    }
    if (!slopeOk && !interceptOk) {
      setFeedback(
        <>
          Both numbers are off. <InlineMath latex="m" /> controls the tilt and{" "}
          <InlineMath latex="b" /> controls the height where the line meets the{" "}
          <InlineMath latex="y" />
          -axis.
        </>,
      );
      return;
    }
    if (!slopeOk) {
      setFeedback(
        <>
          The intercept is right. Now the tilt: a larger <InlineMath latex="m" /> makes the
          line steeper, and a negative <InlineMath latex="m" /> makes it fall as you move
          right.
        </>,
      );
      return;
    }
    if (!interceptOk) {
      setFeedback(
        <>
          The tilt is right. Now <InlineMath latex="b" />, which slides the whole line up or
          down so it crosses the <InlineMath latex="y" />
          -axis at <InlineMath latex="(0, b)" />.
        </>,
      );
      return;
    }
    setFeedback(null);
    success();
    advance();
  }

  /** Move to the next target, or close the board out if this was the last one. */
  function advance() {
    if (index < targets.length - 1) {
      setIndex(index + 1);
      setM(0);
      setB(0);
      setTried(false);
      return;
    }
    setSolved(true);
    onSolved();
  }

  /**
   * The reveal's own resolution. Only the reveal that lets the learner past runs this — the
   * first one hands the board back with this target still theirs to build — so it may move
   * the board on. The gate is the host's to open, not this widget's.
   */
  function fillIn() {
    setRevealed(true);
    setFeedback(null);
    advance();
  }

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetBeside
        figure={
          <svg
            viewBox="0 0 440 280"
            role="img"
            aria-label={`A line on a grid, currently slope ${spoken(m)} and y-intercept ${spoken(b)}`}
          >
            <title>Set the slope and the intercept of a line</title>

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

            {segment && (
              <line
                x1={segment[0]}
                y1={segment[1]}
                x2={segment[2]}
                y2={segment[3]}
                stroke={solved ? CIVIC : LABEL}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            )}
            {b >= Y_MIN && b <= Y_MAX && (
              <circle cx={mapX(0)} cy={mapY(b)} r={4.5} fill={solved ? CIVIC : LABEL} />
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

            <SvgMath
              latex={lineTex(m, b)}
              x={220}
              y={258}
              fontSize={20}
              color={solved ? CIVIC : LABEL}
              w={300}
            />
          </svg>
        }
      >
        <label
          className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
          htmlFor="lf2-slope"
        >
          Slope <InlineMath latex="m" />
        </label>
        <input
          id="lf2-slope"
          className="lesson-interactive__range"
          type="range"
          min={-4}
          max={4}
          step={1}
          value={m}
          disabled={solved}
          aria-valuetext={`slope ${spoken(m)}`}
          onChange={(event) => change({ m: Number(event.target.value) })}
        />

        <label
          className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
          htmlFor="lf2-intercept"
        >
          Intercept <InlineMath latex="b" />
        </label>
        <input
          id="lf2-intercept"
          className="lesson-interactive__range"
          type="range"
          min={-5}
          max={5}
          step={1}
          value={b}
          disabled={solved}
          aria-valuetext={`y-intercept ${spoken(b)}`}
          onChange={(event) => change({ b: Number(event.target.value) })}
        />

        {solved ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with two different lines
          </button>
        ) : (
          <div className="lesson-interactive__controls">
            <button
              type="button"
              className="lesson-interactive__check"
              aria-label={`check the line against target ${index + 1}, ${target.aria}`}
              onClick={check}
            >
              Check
            </button>
          </div>
        )}

        <WidgetReveal
          available={tried && !solved}
          revealed={revealed}
          answer={<InlineMath latex={lineTex(target.m, target.b)} />}
          why={
            <>
              Slope-intercept form keeps the two numbers in fixed places, so the target only
              has to be sorted into them: whatever the line does for each step right is{" "}
              <InlineMath latex="m" />, and wherever it cuts the <InlineMath latex="y" />
              -axis is <InlineMath latex="b" />. Here the step-right amount is{" "}
              <InlineMath latex={`${target.m}`} />, falling if it is negative, and the
              crossing is at <InlineMath latex={`(0, ${target.b})`} />. Set the sliders to
              those two numbers in either order; they do not interact.
            </>
          }
          onReveal={fillIn}
          label="Reveal which number is which"
          othersRemain={index < targets.length - 1}
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {solved ? (
            <>
              Both lines built. <InlineMath latex="m" /> decides the tilt and{" "}
              <InlineMath latex="b" /> decides where the line crosses the{" "}
              <InlineMath latex="y" />
              -axis, so the two numbers in <InlineMath latex="y = mx + b" /> are the whole
              line.
            </>
          ) : (
            (feedback ?? (
              <>
                Target {index + 1} of {targets.length}. {target.ask} Set both sliders, then
                press Check.
              </>
            ))
          )}
        </p>
      </WidgetBeside>
    </div>
  );
}
