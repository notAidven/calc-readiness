/**
 * NUM.F interactive: multiply 2/3 x 4/5 with an area model. On a 3-row by 5-col grid the
 * learner shades a block by tapping a cell (its top-left rectangle fills) or by nudging the
 * row/column steppers. The shaded fraction is read off as (rows x cols) / 15. Gates the
 * lesson once the block is exactly 2 rows by 4 cols, revealing 8/15.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

const ROWS = 3; // denominator of 2/3
const COLS = 5; // denominator of 4/5
const TARGET_ROWS = 2; // numerator of 2/3
const TARGET_COLS = 4; // numerator of 4/5
const TOTAL = ROWS * COLS; // 15

const frac = (n: number, d: number) => `\\dfrac{${n}}{${d}}`;
/** Compact fractions for the edge labels, which sit tight against the grid. */
const tfrac = (n: number, d: number) => `\\tfrac{${n}}{${d}}`;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function FractionMultiplyPlay({ onComplete }: { onComplete?: () => void }) {
  const [rows, setRows] = useState(0);
  const [cols, setCols] = useState(0);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const shaded = rows * cols;
  const solved = rows === TARGET_ROWS && cols === TARGET_COLS;

  function apply(nextRows: number, nextCols: number) {
    setRows(nextRows);
    setCols(nextCols);
    if (nextRows === TARGET_ROWS && nextCols === TARGET_COLS && !done) {
      setDone(true);
      success();
      onComplete?.();
    }
  }

  function reset() {
    setRows(0);
    setCols(0);
  }

  const gx = 130;
  const gy = 44;
  const cw = 44;
  const ch = 40;
  const gw = COLS * cw;
  const gh = ROWS * ch;

  return (
    <div className="lesson-interactive lesson-interactive--multiply">
      <svg
        viewBox="0 0 440 210"
        role="img"
        aria-label={`Area model: ${rows} of ${ROWS} rows by ${cols} of ${COLS} columns shaded`}
      >
        <title>Area model for two thirds times four fifths</title>
        {Array.from({ length: ROWS * COLS }, (_, idx) => {
          const r = Math.floor(idx / COLS);
          const c = idx % COLS;
          const on = r < rows && c < cols;
          return (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid of equal cells
              key={idx}
              x={gx + c * cw}
              y={gy + r * ch}
              width={cw}
              height={ch}
              fill={on ? CIVIC : "var(--paper)"}
              fillOpacity={on ? 0.35 : 1}
              stroke={LINE}
              strokeWidth={1}
              style={{ cursor: "pointer" }}
              onPointerDown={() => apply(r + 1, c + 1)}
            />
          );
        })}
        <rect
          x={gx}
          y={gy}
          width={gw}
          height={gh}
          fill="none"
          stroke={LINE}
          strokeWidth={1.5}
        />
        <SvgMath
          latex={`${tfrac(TARGET_COLS, COLS)} \\text{ wide}`}
          x={gx + gw / 2}
          y={gy - 17}
          fontSize={13}
          color={CIVIC}
          w={160}
        />
        <g transform={`rotate(-90 ${gx - 14} ${gy + gh / 2})`}>
          <SvgMath
            latex={`${tfrac(TARGET_ROWS, ROWS)} \\text{ tall}`}
            x={gx - 14}
            y={gy + gh / 2}
            fontSize={13}
            color={CIVIC}
            w={160}
          />
        </g>
        <SvgMath
          latex={`${frac(TARGET_ROWS, ROWS)} \\times ${frac(TARGET_COLS, COLS)} = ${frac(
            shaded,
            TOTAL,
          )}`}
          x={220}
          y={gy + gh + 26}
          fontSize={17}
          color={solved ? CIVIC : LABEL}
        />
      </svg>

      <div className="lesson-interactive__controls">
        <span className="lesson-interactive__field-label">rows</span>
        <button
          type="button"
          className="lesson-interactive__step"
          aria-label="Fewer rows"
          disabled={rows === 0}
          onClick={() => apply(clamp(rows - 1, 0, ROWS), cols)}
        >
          <InlineMath latex="-" />
        </button>
        <span className="lesson-interactive__step-eq">
          <InlineMath latex={String(rows)} />
        </span>
        <button
          type="button"
          className="lesson-interactive__step"
          aria-label="More rows"
          disabled={rows === ROWS}
          onClick={() => apply(clamp(rows + 1, 0, ROWS), cols)}
        >
          <InlineMath latex="+" />
        </button>

        <span className="lesson-interactive__field-label">cols</span>
        <button
          type="button"
          className="lesson-interactive__step"
          aria-label="Fewer columns"
          disabled={cols === 0}
          onClick={() => apply(rows, clamp(cols - 1, 0, COLS))}
        >
          <InlineMath latex="-" />
        </button>
        <span className="lesson-interactive__step-eq">
          <InlineMath latex={String(cols)} />
        </span>
        <button
          type="button"
          className="lesson-interactive__step"
          aria-label="More columns"
          disabled={cols === COLS}
          onClick={() => apply(rows, clamp(cols + 1, 0, COLS))}
        >
          <InlineMath latex="+" />
        </button>

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
            The overlap is <InlineMath latex={String(TARGET_ROWS)} /> by{" "}
            <InlineMath latex={String(TARGET_COLS)} /> of{" "}
            <InlineMath latex={String(TOTAL)} /> cells, so{" "}
            <InlineMath
              latex={`${tfrac(TARGET_ROWS, ROWS)} \\times ${tfrac(
                TARGET_COLS,
                COLS,
              )} = ${tfrac(shaded, TOTAL)}`}
            />
            .
          </>
        ) : (
          <>
            Shade <InlineMath latex={String(TARGET_ROWS)} /> rows and{" "}
            <InlineMath latex={String(TARGET_COLS)} /> columns. Tap a cell or use the
            steppers.
          </>
        )}
      </p>
    </div>
  );
}
