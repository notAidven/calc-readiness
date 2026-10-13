/**
 * Worked-solution figures for the D9 TRG.3 practice templates (reference angles in degrees
 * and radians, the sign of a function at a heading, an exact value, and one named coordinate
 * of the point on the circle).
 *
 * All five are one picture, because all five ARE one picture: a heading drawn in standard
 * position, the acute angle it makes with the horizontal axis, and the point where its
 * terminal side crosses the unit circle. A learner who got any of these wrong is nearly
 * always measuring to the wrong axis or reading the sign off the wrong coordinate, and a
 * column of steps cannot show them which. So there is one archetype here and the five entries
 * differ only in what they ask it to draw and what they write beside it.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for
 * each, and recomputes what `generate()` computed by the same route. In particular the exact
 * values are rebuilt from the reference angle and the quadrant rather than being passed
 * across, so the figure cannot print a value the item did not key.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { spoken, type WorkedSolutionVisual } from "../workedKit";

const CENTER = { x: 104, y: 100 } as const;
const RADIUS = 72;

/** How far to the side of the vertical drop its value is written. */
const ACROSS_STEP = 30;
/** The room that label's plate needs before the frame clips it. */
const PLATE_ROOM = 40;
/** How far past the point it sits, so its plate clears the other reach's dashed line. */
const ACROSS_CLEAR = 14;

/** Where a heading lands, at a given fraction of the radius. */
function at(deg: number, reach: number): { x: number; y: number } {
  const t = (deg * Math.PI) / 180;
  return { x: CENTER.x + reach * Math.cos(t), y: CENTER.y - reach * Math.sin(t) };
}

/**
 * An arc swept counterclockwise from the smaller heading to the larger.
 *
 * The sweep flag is 0 rather than 1 because SVG's y axis points down, so a counterclockwise
 * turn in the mathematics is a negative sweep on the screen. Getting that backwards draws the
 * reflex angle, which on a reference-angle figure is precisely the wrong claim.
 */
function arc(fromDeg: number, toDeg: number, reach: number): string {
  const start = at(Math.min(fromDeg, toDeg), reach);
  const end = at(Math.max(fromDeg, toDeg), reach);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${reach} ${reach} 0 ${large} 0 ${end.x} ${end.y}`;
}

export const NUMERAL: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };

/** Which quadrant a heading lands in, and the end of the horizontal axis nearest it. */
export function quadrantOf(deg: number): 1 | 2 | 3 | 4 {
  if (deg < 90) {
    return 1;
  }
  if (deg < 180) {
    return 2;
  }
  if (deg < 270) {
    return 3;
  }
  return 4;
}

function nearAxis(deg: number): number {
  const quadrant = quadrantOf(deg);
  return quadrant === 1 ? 0 : quadrant === 4 ? 360 : 180;
}

/** The acute angle back to that axis. */
export function referenceOf(deg: number): number {
  const quadrant = quadrantOf(deg);
  if (quadrant === 1) {
    return deg;
  }
  if (quadrant === 2) {
    return 180 - deg;
  }
  if (quadrant === 3) {
    return deg - 180;
  }
  return 360 - deg;
}

/**
 * A special angle's exact value as KaTeX, rebuilt from the reference angle and the sign.
 *
 * Only the three special reference angles reach this, because only those headings are drawn
 * by the two templates that call it. A reference angle outside that set falls through to the
 * degree measure itself, which is what the reference-angle figures want anyway.
 */
export function exactTex(reference: number, negative: boolean, sine: boolean): string {
  const numerator =
    reference === 30
      ? sine
        ? "1"
        : "\\sqrt{3}"
      : reference === 45
        ? "\\sqrt{2}"
        : sine
          ? "\\sqrt{3}"
          : "1";
  return `${negative ? "-" : ""}\\dfrac{${numerator}}{2}`;
}

interface CircleFigureProps {
  /** The heading, in degrees, as the figure draws it. */
  deg: number;
  /** What to write beside the terminal side; defaults to the degree measure. */
  headingTex?: string;
  /** The acute angle back to the horizontal axis, as KaTeX. Omitted where none is drawn. */
  referenceTex?: string;
  /** The two reaches, written at the feet of the dashed drops. */
  along?: string;
  across?: string;
  /** Which drop to draw in the success color; both stay soft when neither is named. */
  highlight?: "along" | "across" | "both" | "none";
  /** The derivation beside the figure. The last row is drawn in the success color. */
  rows: readonly string[];
  ariaLabel: string;
  title: string;
}

export function UnitCircleWorked({
  deg,
  headingTex,
  referenceTex,
  along,
  across,
  highlight = "none",
  rows,
  ariaLabel,
  title,
}: CircleFigureProps): JSX.Element {
  const tip = at(deg, RADIUS);
  const axis = nearAxis(deg);
  const alongInk = highlight === "along" || highlight === "both" ? CIVIC : SOFT;
  const acrossInk = highlight === "across" || highlight === "both" ? CIVIC : SOFT;

  /**
   * Where the vertical reach gets written: out past the point and a little beyond it, at the
   * far end of the drop it names.
   *
   * The two obvious spots are both taken. Hung off the CENTER at the drop's midpoint the
   * plate lands on the turn's own label for any upper-left heading (12.1x8.6px of shared ink
   * at $120^{\circ}$); hung off the drop line at that midpoint it lands on the reference
   * angle's, which occupies the same wedge (6.7x8.6px at the same heading). Past the point is
   * the one corner neither angle label reaches. Two adjustments keep it there: where the
   * outward side would run off the frame the label crosses to the inner side of the drop, and
   * the step away from the horizontal keeps its plate off the OTHER reach's dashed line,
   * which it would otherwise sit on top of and appear to be measuring.
   */
  const acrossOut = tip.x >= CENTER.x ? tip.x + ACROSS_STEP : tip.x - ACROSS_STEP;
  const acrossX =
    acrossOut < PLATE_ROOM || acrossOut > 440 - PLATE_ROOM
      ? tip.x + (tip.x >= CENTER.x ? -ACROSS_STEP : ACROSS_STEP)
      : acrossOut;
  const acrossY = tip.y + (tip.y >= CENTER.y ? ACROSS_CLEAR : -ACROSS_CLEAR);

  return (
    <svg viewBox="0 0 440 200" role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <line
        x1={CENTER.x - RADIUS - 18}
        y1={CENTER.y}
        x2={CENTER.x + RADIUS + 18}
        y2={CENTER.y}
        stroke={LINE}
        strokeWidth={1.2}
      />
      <line
        x1={CENTER.x}
        y1={CENTER.y - RADIUS - 18}
        x2={CENTER.x}
        y2={CENTER.y + RADIUS + 18}
        stroke={LINE}
        strokeWidth={1.2}
      />
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={RADIUS}
        fill="none"
        stroke={LINE}
        strokeWidth={1.6}
      />

      {/* The turn itself, from the start line round to the heading. Skipped at zero, where
          the two ends coincide and the path would be an instruction to draw nothing. */}
      {deg > 0 ? (
        <path d={arc(0, deg, 26)} fill="none" stroke={SIGNAL} strokeWidth={1.6} />
      ) : null}

      {/* The acute angle back to the nearer end of the horizontal axis: the whole subject of
          two of the five figures, and drawn only where the item is about it. */}
      {referenceTex === undefined || deg === axis ? null : (
        <path d={arc(axis, deg, 44)} fill="none" stroke={CIVIC} strokeWidth={2} />
      )}

      <line
        x1={tip.x}
        y1={tip.y}
        x2={tip.x}
        y2={CENTER.y}
        stroke={acrossInk}
        strokeWidth={1.2}
        strokeDasharray="4 3"
      />
      <line
        x1={tip.x}
        y1={tip.y}
        x2={CENTER.x}
        y2={tip.y}
        stroke={alongInk}
        strokeWidth={1.2}
        strokeDasharray="4 3"
      />

      <line
        x1={CENTER.x}
        y1={CENTER.y}
        x2={tip.x}
        y2={tip.y}
        stroke={LABEL}
        strokeWidth={2.2}
      />
      <circle cx={tip.x} cy={tip.y} r={4.5} fill={LABEL} />

      <SvgMath
        latex={headingTex ?? `${deg}^{\\circ}`}
        x={at(deg / 2, 40).x}
        y={at(deg / 2, 40).y}
        fontSize={13}
        color={SIGNAL}
        w={72}
        plate
      />
      {referenceTex === undefined || deg === axis ? null : (
        <SvgMath
          latex={referenceTex}
          x={at((axis + deg) / 2, 62).x}
          y={at((axis + deg) / 2, 62).y}
          fontSize={13}
          color={CIVIC}
          w={72}
          plate
        />
      )}

      {along === undefined ? null : (
        <SvgMath
          latex={along}
          x={(CENTER.x + tip.x) / 2}
          y={tip.y > CENTER.y ? CENTER.y - 16 : CENTER.y + 16}
          fontSize={13}
          color={alongInk === SOFT ? LABEL : CIVIC}
          w={76}
          plate
        />
      )}
      {across === undefined ? null : (
        <SvgMath
          latex={across}
          x={acrossX}
          y={acrossY}
          fontSize={13}
          color={acrossInk === SOFT ? LABEL : CIVIC}
          w={76}
          plate
        />
      )}

      {rows.map((latex, index) => (
        <SvgMath
          key={latex}
          latex={latex}
          x={318}
          y={46 + index * 38}
          fontSize={16}
          color={index === rows.length - 1 ? CIVIC : LABEL}
          w={230}
        />
      ))}
    </svg>
  );
}

/** How the reference-angle subtraction reads, in degrees, for a heading's quadrant. */
export function degreeSubtraction(deg: number): string {
  const quadrant = quadrantOf(deg);
  const reference = referenceOf(deg);
  if (quadrant === 2) {
    return `180^{\\circ} - ${deg}^{\\circ} = ${reference}^{\\circ}`;
  }
  if (quadrant === 3) {
    return `${deg}^{\\circ} - 180^{\\circ} = ${reference}^{\\circ}`;
  }
  return `360^{\\circ} - ${deg}^{\\circ} = ${reference}^{\\circ}`;
}

/** `a\pi/b` as KaTeX, with the numerator dropped when it is one. */
function radianTex(numerator: number, denominator: number): string {
  return `\\dfrac{${numerator === 1 ? "" : numerator}\\pi}{${denominator}}`;
}

/**
 * The reference-angle subtraction in radians, with the axis measure written over the heading's
 * own denominator, branched the three ways `TRG.3/index.ts` branches `differenceTex`.
 *
 * Quadrant III is the case that has to be separate: there the heading lies PAST the half turn,
 * so the half turn comes off the heading. Folding it in with Quadrant II prints the operands
 * the wrong way round, and the result stated beside them is then the negative of what the
 * subtraction has.
 */
function radianSubtraction(k: number, d: number, quadrant: number): string {
  const axisOver = radianTex(quadrant === 4 ? 2 * d : d, d);
  const heading = radianTex(k, d);
  return quadrant === 3 ? `${heading} - ${axisOver}` : `${axisOver} - ${heading}`;
}

export const TRG3_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d9.trg3.reference-degree.l1": {
    Svg: ({ deg = 215, quadrant = 3, reference = 35 }) => (
      <UnitCircleWorked
        deg={deg}
        referenceTex={`${reference}^{\\circ}`}
        rows={[
          `\\text{Quadrant ${NUMERAL[quadrant] ?? "I"}}`,
          degreeSubtraction(deg),
          `\\text{reference angle } = ${reference}^{\\circ}`,
        ]}
        ariaLabel={`A heading of ${spoken(deg)} degrees drawn in standard position, with the acute angle of ${spoken(reference)} degrees back to the horizontal axis marked`}
        title="The reference angle is measured to the horizontal axis, not to where the turn started"
      />
    ),
    caption: ({ deg = 215, quadrant = 3, reference = 35 }) =>
      `The heading lands in Quadrant ${NUMERAL[quadrant] ?? "I"}, so the nearer end of the horizontal axis is the one the subtraction runs to: $${degreeSubtraction(deg)}$. The reference angle is $${reference}^{\\circ}$.`,
  },

  "d9.trg3.reference-radian.l2": {
    Svg: ({ k = 19, d = 12, quadrant = 4, rk = 5, rd = 12 }) => (
      <UnitCircleWorked
        deg={(k / d) * 180}
        headingTex={radianTex(k, d)}
        referenceTex={radianTex(rk, rd)}
        rows={[
          `\\text{Quadrant ${NUMERAL[quadrant] ?? "I"}}`,
          radianSubtraction(k, d, quadrant),
          `= ${radianTex(rk, rd)}`,
        ]}
        ariaLabel={`A heading of ${k} pi over ${d} radians drawn in standard position, with its reference angle of ${rk} pi over ${rd} marked`}
        title="In radians the horizontal axis sits at pi and at two pi"
      />
    ),
    caption: ({ k = 19, d = 12, quadrant = 4, rk = 5, rd = 12 }) =>
      `The heading lands in Quadrant ${NUMERAL[quadrant] ?? "I"}, so the nearer end of the horizontal axis is at $${quadrant === 4 ? "2\\pi" : "\\pi"}$. Written over the heading's own denominator that is $${radianTex(quadrant === 4 ? 2 * d : d, d)}$, and taking the smaller measure from the larger leaves $${radianSubtraction(k, d, quadrant)} = ${radianTex(rk, rd)}$.`,
  },

  "d9.trg3.quadrant-sign.l2": {
    Svg: ({ deg = 215, isSine = 1, onAxis = 0 }) => {
      const sine = isSine === 1;
      const value = sine
        ? Math.sin((deg * Math.PI) / 180)
        : Math.cos((deg * Math.PI) / 180);
      const sign = Math.abs(value) < 1e-9 ? "zero" : value > 0 ? "positive" : "negative";
      const symbol = sine ? "\\sin" : "\\cos";
      return (
        <UnitCircleWorked
          deg={deg}
          highlight={sine ? "across" : "along"}
          rows={[
            `${symbol} ${deg}^{\\circ}`,
            onAxis === 1
              ? "\\text{on an axis}"
              : `\\text{Quadrant ${NUMERAL[quadrantOf(deg)] ?? "I"}}`,
            `\\text{${sign}}`,
          ]}
          ariaLabel={`A heading of ${spoken(deg)} degrees drawn in standard position, with the ${sine ? "vertical" : "horizontal"} reach of its point marked, which is ${sign}`}
          title="The quadrant settles the sign before any value is worked out"
        />
      );
    },
    caption: ({ deg = 215, isSine = 1, onAxis = 0 }) => {
      const sine = isSine === 1;
      const value = sine
        ? Math.sin((deg * Math.PI) / 180)
        : Math.cos((deg * Math.PI) / 180);
      const sign = Math.abs(value) < 1e-9 ? "zero" : value > 0 ? "positive" : "negative";
      const which = sine ? "second" : "first";
      const symbol = sine ? "\\sin" : "\\cos";
      return onAxis === 1
        ? `A heading of $${deg}^{\\circ}$ puts the terminal side straight along an axis, where one coordinate carries the full radius and the other has none. The ${which} coordinate is $${symbol} ${deg}^{\\circ}$, so the reading is **${sign}**.`
        : `The ${which} coordinate of the point is $${symbol} ${deg}^{\\circ}$, and the terminal side lands in Quadrant ${NUMERAL[quadrantOf(deg)] ?? "I"}, where that coordinate is **${sign}**. No value had to be worked out.`;
    },
  },

  "d9.trg3.exact-value-circle.l3": {
    Svg: ({ deg = 330, isSine = 1, quadrant = 4, reference = 30 }) => {
      const sine = isSine === 1;
      const negative = sine
        ? quadrant === 3 || quadrant === 4
        : quadrant === 2 || quadrant === 3;
      const symbol = sine ? "\\sin" : "\\cos";
      return (
        <UnitCircleWorked
          deg={deg}
          referenceTex={`${reference}^{\\circ}`}
          along={sine ? undefined : exactTex(reference, negative, false)}
          across={sine ? exactTex(reference, negative, true) : undefined}
          highlight={sine ? "across" : "along"}
          rows={[
            `${symbol} ${reference}^{\\circ} = ${exactTex(reference, false, sine)}`,
            `\\text{Quadrant ${NUMERAL[quadrant] ?? "I"}}`,
            `${symbol} ${deg}^{\\circ} = ${exactTex(reference, negative, sine)}`,
          ]}
          ariaLabel={`A heading of ${spoken(deg)} degrees with its reference angle of ${spoken(reference)} degrees marked, and the exact ${sine ? "vertical" : "horizontal"} reach of its point written on`}
          title="The reference angle gives the size and the quadrant gives the sign"
        />
      );
    },
    caption: ({ deg = 330, isSine = 1, quadrant = 4, reference = 30 }) => {
      const sine = isSine === 1;
      const negative = sine
        ? quadrant === 3 || quadrant === 4
        : quadrant === 2 || quadrant === 3;
      const symbol = sine ? "\\sin" : "\\cos";
      return `The reference angle is $${degreeSubtraction(deg)}$, and at that acute angle the value is $${exactTex(reference, false, sine)}$. Quadrant ${NUMERAL[quadrant] ?? "I"} makes that coordinate ${negative ? "negative" : "positive"}, so $${symbol} ${deg}^{\\circ} = ${exactTex(reference, negative, sine)}$.`;
    },
  },

  /**
   * The reading is given here and the HEADING is the answer, so the figure reads the other way
   * along than the two above it.
   *
   * The item used to ask for one named coordinate at a heading, which made it
   * `exact-value-circle.l3` under a second name: the same case list, the same key. It now hands
   * over one exact reach and the sign of the other and asks which heading that is. So the row
   * the answer color lands on is the heading rather than the value, and the value is drawn on
   * the axis it was GIVEN on rather than as something worked out.
   *
   * The other reach is still left undrawn. The prompt gives only its sign, and a figure that
   * wrote its exact value on would hand over a value the cell has yet to ask for.
   */
  "d9.trg3.coordinates.l3": {
    Svg: ({ deg = 330, isSine = 0, quadrant = 4, reference = 30 }) => {
      const sine = isSine === 1;
      const negative = sine
        ? quadrant === 3 || quadrant === 4
        : quadrant === 2 || quadrant === 3;
      const symbol = sine ? "\\sin" : "\\cos";
      return (
        <UnitCircleWorked
          deg={deg}
          referenceTex={`${reference}^{\\circ}`}
          along={sine ? undefined : exactTex(reference, negative, false)}
          across={sine ? exactTex(reference, negative, true) : undefined}
          highlight={sine ? "across" : "along"}
          rows={[
            `${symbol} = ${exactTex(reference, negative, sine)}`,
            `\\text{ref } ${reference}^{\\circ}, \\text{ Quadrant ${NUMERAL[quadrant] ?? "I"}}`,
            `\\text{heading} = ${deg}^{\\circ}`,
          ]}
          ariaLabel={`The exact ${sine ? "vertical" : "horizontal"} reach given, marked on the unit circle, with the heading of ${spoken(deg)} degrees it belongs to drawn in standard position`}
          title="A reading and two signs name one heading"
        />
      );
    },
    caption: ({ deg = 330, isSine = 0, quadrant = 4, reference = 30 }) => {
      const sine = isSine === 1;
      const negative = sine
        ? quadrant === 3 || quadrant === 4
        : quadrant === 2 || quadrant === 3;
      const otherNegative = sine
        ? quadrant === 2 || quadrant === 3
        : quadrant === 3 || quadrant === 4;
      const reading = sine ? "vertical" : "horizontal";
      const other = sine ? "horizontal" : "vertical";
      return `A reach of that size belongs to a reference angle of $${reference}^{\\circ}$, whichever way it is signed. The ${reading} reach being ${negative ? "negative" : "positive"} and the ${other} one being ${otherNegative ? "negative" : "positive"} put the point in Quadrant ${NUMERAL[quadrant] ?? "I"} between them, and placing $${reference}^{\\circ}$ there gives a heading of $${deg}^{\\circ}$.`;
    },
  },
};
