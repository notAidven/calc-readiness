/**
 * NUM.S interactive: read absolute value as distance from zero. The learner steps a
 * marker along a number line from -5 to 5; the widget shades the span from 0 to the
 * marker and shows |value| = distance. Goal: visit BOTH points whose distance from zero
 * is 4 (-4 and 4). Gates the lesson only once both points have been reached.
 */

import { useEffect, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

const MIN = -5;
const MAX = 5;
const TARGET = 4;
/** `\lvert -3 \rvert = 3`, the readout shown both in the diagram and beside the steppers. */
const ABS_EQ = (value: number) => `\\lvert ${value} \\rvert = ${Math.abs(value)}`;
const LEFT = 40;
const RIGHT = 400;
const AXIS_Y = 84;
const STEP = (RIGHT - LEFT) / (MAX - MIN);
const X = (v: number) => LEFT + (v - MIN) * STEP;

export function AbsoluteValueExplore({ onComplete }: { onComplete?: () => void }) {
  const [value, setValue] = useState(0);
  const [found, setFound] = useState<ReadonlySet<number>>(() => new Set());
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const distance = Math.abs(value);
  const atTarget = distance === TARGET;
  const solved = found.has(-TARGET) && found.has(TARGET);
  const sideColor = value < 0 ? BRICK : value > 0 ? CIVIC : SOFT;

  useEffect(() => {
    if (found.has(-TARGET) && found.has(TARGET) && !done) {
      setDone(true);
      onComplete?.();
    }
  }, [found, done, onComplete]);

  function moveTo(next: number) {
    const clamped = Math.max(MIN, Math.min(MAX, next));
    setValue(clamped);
    // Stepping off a target and back is not new progress, so only the first visit counts.
    if (Math.abs(clamped) === TARGET && !found.has(clamped)) {
      success();
      setFound((prev) => {
        const nextFound = new Set(prev);
        nextFound.add(clamped);
        return nextFound;
      });
    }
  }

  const ticks: number[] = [];
  for (let v = MIN; v <= MAX; v++) {
    ticks.push(v);
  }

  const x0 = X(0);
  const xv = X(value);
  const spanX = Math.min(x0, xv);
  const spanW = Math.abs(xv - x0);

  return (
    <div className="lesson-interactive lesson-interactive--absval">
      <svg
        viewBox="0 0 440 130"
        role="img"
        aria-label={`Number line from ${MIN} to ${MAX}; absolute value of ${value} is ${distance}`}
      >
        <title>Absolute value as distance from zero</title>

        {/* distance span from zero to the marker */}
        {spanW > 0 && (
          <rect
            x={spanX}
            y={AXIS_Y - 12}
            width={spanW}
            height={24}
            fill={sideColor}
            fillOpacity={0.16}
          />
        )}

        {/* axis */}
        <line x1={LEFT} y1={AXIS_Y} x2={RIGHT} y2={AXIS_Y} stroke={LINE} strokeWidth={2} />
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={X(v)}
              y1={AXIS_Y - 5}
              x2={X(v)}
              y2={AXIS_Y + 5}
              stroke={LINE}
              strokeWidth={1.5}
            />
            <text
              x={X(v)}
              y={AXIS_Y + 22}
              textAnchor="middle"
              fontSize={12}
              fill={v === 0 ? LABEL : SOFT}
              fontWeight={v === 0 ? 700 : 400}
            >
              {v}
            </text>
          </g>
        ))}

        {/* zero anchor */}
        <circle cx={x0} cy={AXIS_Y} r={4} fill={SOFT} />

        {/* marker */}
        <circle
          cx={xv}
          cy={AXIS_Y}
          r={10}
          fill={atTarget ? CIVIC : SIGNAL}
          stroke="var(--paper)"
          strokeWidth={2}
        />
        <text
          x={xv}
          y={AXIS_Y - 16}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill={atTarget ? CIVIC : LABEL}
        >
          {value}
        </text>

        {/* distance readout */}
        <SvgMath latex={ABS_EQ(value)} x={220} y={18} fontSize={15} color={sideColor} />
      </svg>

      <div className="lesson-interactive__controls">
        <button
          type="button"
          className="lesson-interactive__step"
          onClick={() => moveTo(value - 1)}
          disabled={value <= MIN}
          aria-label="Move left one"
        >
          &#8592; <InlineMath latex="-1" />
        </button>
        <span className="lesson-interactive__step-eq">
          <InlineMath latex={ABS_EQ(value)} />
        </span>
        <button
          type="button"
          className="lesson-interactive__step"
          onClick={() => moveTo(value + 1)}
          disabled={value >= MAX}
          aria-label="Move right one"
        >
          <InlineMath latex="+1" /> &#8594;
        </button>
      </div>

      {solved && (
        <button
          type="button"
          className="lesson-interactive__reset"
          onClick={() => {
            setValue(0);
            setFound(new Set());
          }}
        >
          Start over
        </button>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            Yes. Both <InlineMath latex={`-${TARGET}`} /> and{" "}
            <InlineMath latex={String(TARGET)} /> are <InlineMath latex={String(TARGET)} />{" "}
            units from zero.
          </>
        ) : atTarget ? (
          <>
            <InlineMath latex={ABS_EQ(value)} />. Found one. Now find the other point{" "}
            <InlineMath latex={String(TARGET)} /> units from zero.
          </>
        ) : (
          <>
            Find both points whose distance from zero is{" "}
            <InlineMath latex={String(TARGET)} />. Found {found.size} of 2. Right now{" "}
            <InlineMath latex={ABS_EQ(value)} />.
          </>
        )}
      </p>
    </div>
  );
}
