/**
 * Complex fractions drawn as a numerator, a long main bar, and a denominator — each part
 * typeset on its own rather than nested inside one `\dfrac`. KaTeX's nested form packs the
 * inner numerators and denominators too tight for lesson diagrams; splitting the stack is
 * what gives the inner fractions room to breathe and lets the main bar read longer.
 */

import { CIVIC, InlineMath, LABEL, SvgMath } from "./svgKit";

/** Vertical gap from the main bar to the center of each part block. */
const DEFAULT_OUTER_GAP = 30;
/** Height of each `foreignObject` hosting one part. */
const PART_H = 52;

export interface ComplexFractionParts {
  numerator: string;
  denominator: string;
}

export function ComplexFractionSvg({
  numerator,
  denominator,
  cx,
  cy,
  fontSize = 17,
  color = LABEL,
  mainBarHalfWidth = 110,
  partWidth = 280,
  outerGap = DEFAULT_OUTER_GAP,
}: ComplexFractionParts & {
  cx: number;
  cy: number;
  fontSize?: number;
  color?: string;
  /** Half-width of the main bar in SVG user units. */
  mainBarHalfWidth?: number;
  partWidth?: number;
  /** Vertical gap from the main bar to each part block; default 30. */
  outerGap?: number;
}) {
  const partH = Math.max(PART_H, fontSize * 3);
  const numY = cy - outerGap - partH / 2;
  const denomY = cy + outerGap + partH / 2;
  return (
    <>
      <SvgMath
        latex={numerator}
        x={cx}
        y={numY}
        fontSize={fontSize}
        color={color}
        w={partWidth}
        h={partH}
      />
      <line
        x1={cx - mainBarHalfWidth}
        y1={cy}
        x2={cx + mainBarHalfWidth}
        y2={cy}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <SvgMath
        latex={denominator}
        x={cx}
        y={denomY}
        fontSize={fontSize}
        color={color}
        w={partWidth}
        h={partH}
      />
    </>
  );
}

/** The solved-state colour for complex fractions that have cleared. */
export function ComplexFractionSvgSolved(
  props: ComplexFractionParts & {
    cx: number;
    cy: number;
    fontSize?: number;
    mainBarHalfWidth?: number;
    partWidth?: number;
  },
) {
  return <ComplexFractionSvg {...props} color={CIVIC} />;
}

export function ComplexFractionInline({
  numerator,
  denominator,
  color = LABEL,
}: ComplexFractionParts & { color?: string }) {
  return (
    <span className="complex-frac" style={{ color }}>
      <span className="complex-frac__part">
        <InlineMath latex={numerator} color={color} />
      </span>
      <span className="complex-frac__bar" aria-hidden="true" />
      <span className="complex-frac__part">
        <InlineMath latex={denominator} color={color} />
      </span>
    </span>
  );
}
