/**
 * NUM.F interactive: build an equivalent fraction for 12/16. The learner taps an operation
 * applied to BOTH the numerator and denominator; a second bar splits into a different
 * number of parts but keeps the same shaded width, proving the value is unchanged. Gates
 * the lesson once the learner has produced at least one correct equivalent fraction.
 *
 * The base is deliberately NOT in lowest terms, so dividing is available too. A fraction
 * like 3/4 can only be scaled up, which teaches half the rule; from 12/16 the learner can
 * reduce to 3/4 as well, which is what the CFU and the lesson's lowest-terms rule need.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";

const BASE = { n: 12, d: 16 };

interface Op {
  kind: "div" | "mul";
  by: number;
}

/** Every option lands on the same value, so no invalid-choice state is needed. */
const OPS: readonly Op[] = [
  { kind: "div", by: 2 },
  { kind: "div", by: 4 },
  { kind: "mul", by: 2 },
];

const opKey = (op: Op) => `${op.kind}${op.by}`;

const frac = (n: number, d: number) => `\\dfrac{${n}}{${d}}`;

/** One fraction bar split into `parts`, with `filled` cells shaded left to right. */
function Bar({
  x,
  y,
  w,
  parts,
  filled,
  color,
}: {
  x: number;
  y: number;
  w: number;
  parts: number;
  filled: number;
  color: string;
}) {
  const h = 40;
  const cell = w / parts;
  return (
    <g>
      <rect x={x} y={y} width={cell * filled} height={h} fill={color} fillOpacity={0.85} />
      {Array.from({ length: parts }, (_, i) => (
        <line
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid of equal cells
          key={i}
          x1={x + i * cell}
          y1={y}
          x2={x + i * cell}
          y2={y + h}
          stroke={LINE}
          strokeWidth={1}
        />
      ))}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={LINE} strokeWidth={1.25} />
    </g>
  );
}

export function EquivalentFractionPlay({ onComplete }: { onComplete?: () => void }) {
  const [op, setOp] = useState<Op | null>(null);
  const [done, setDone] = useState(false);

  const solved = op !== null;
  const scale = (value: number) =>
    op === null ? value : op.kind === "div" ? value / op.by : value * op.by;
  const eqN = scale(BASE.n);
  const eqD = scale(BASE.d);

  function pick(next: Op) {
    setOp(next);
    if (!done) {
      setDone(true);
      onComplete?.();
    }
  }

  function reset() {
    setOp(null);
  }

  const x0 = 60;
  const width = 340;

  return (
    <div className="lesson-interactive lesson-interactive--equivalent">
      <svg
        viewBox="0 0 440 200"
        role="img"
        aria-label={`${BASE.n} over ${BASE.d} equals ${eqN} over ${eqD}`}
      >
        <title>Equivalent fractions for twelve sixteenths</title>
        {/* The rows sit well apart: a stacked \dfrac label is about 2.2x the font size
            tall, so a flat-text row spacing would overlap. */}
        <SvgMath
          latex={frac(BASE.n, BASE.d)}
          x={x0}
          y={24}
          anchor="start"
          fontSize={15}
          color={LABEL}
          w={120}
        />
        <Bar x={x0} y={44} w={width} parts={BASE.d} filled={BASE.n} color={CIVIC} />

        <SvgMath
          latex={frac(eqN, eqD)}
          x={x0}
          y={108}
          anchor="start"
          fontSize={15}
          color={solved ? LABEL : SOFT}
          w={120}
        />
        {solved ? (
          <Bar x={x0} y={128} w={width} parts={eqD} filled={eqN} color={CIVIC} />
        ) : (
          <rect
            x={x0}
            y={128}
            width={width}
            height={40}
            fill="var(--paper)"
            stroke={LINE}
            strokeWidth={1.25}
          />
        )}

        <SvgMath
          latex="\text{same shaded width} = \text{same value}"
          x={x0 + width / 2}
          y={188}
          fontSize={13}
          color={SOFT}
        />
      </svg>

      <div className="lesson-interactive__controls">
        {OPS.map((candidate) => (
          <button
            key={opKey(candidate)}
            type="button"
            className="lesson-interactive__chip"
            // Neutral, because the three operations are options the learner has not picked
            // yet and `--civic` is the correctness channel (R26). Painting them green said
            // "these are right" before a tap, on a board whose whole point is that the
            // learner chooses one. The chosen one is drawn by `[aria-pressed="true"]`, which
            // fills and rings in `currentColor`, so the state survives the hue leaving.
            style={{ color: LABEL, borderColor: LINE }}
            aria-label={`${candidate.kind === "div" ? "divide" : "times"} ${candidate.by}`}
            aria-pressed={op !== null && opKey(op) === opKey(candidate)}
            onClick={() => pick(candidate)}
          >
            <InlineMath
              latex={`${candidate.kind === "div" ? "\\div" : "\\times"} ${candidate.by}`}
            />
          </button>
        ))}
        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={reset}>
            Start over
          </button>
        )}
      </div>

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            <InlineMath latex={`${frac(BASE.n, BASE.d)} = ${frac(eqN, eqD)}`} />:{" "}
            {op.kind === "div" ? "dividing" : "multiplying"} top and bottom by{" "}
            <InlineMath latex={String(op.by)} /> keeps the same value
            {op.kind === "div" && op.by === 4 ? ", and this one is in lowest terms" : ""}.
          </>
        ) : (
          "Tap an operation to scale both the top and bottom by the same number."
        )}
      </p>
    </div>
  );
}
