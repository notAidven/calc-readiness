/**
 * Worked-solution figures for the D9 TRG.1 practice templates (angle measure in degrees and in
 * radians, coterminal headings, and arc length).
 *
 * Three figures across the five templates, and the grouping is by what a learner gets wrong
 * rather than by what the prompt asks:
 *
 *  - **One ray, labelled twice** (`deg-to-rad`, `rad-to-deg`). The conversion templates are one
 *    picture run in two directions, and the picture is the point: a single terminal side with
 *    a degree measure inside the wedge and a radian measure outside it. The failure this
 *    addresses is treating the two units as two ANGLES rather than two names, and a figure
 *    that drew them as separate rays would confirm exactly that.
 *  - **The extra turns, drawn** (`coterminal-degree`, `coterminal-radian`). A coterminal
 *    heading is invisible in a still picture, because the whole claim is that two different
 *    measures put the dish in the same place. So the figure draws ONE ray and loops the
 *    surplus turns around it as dashed circles, with the arithmetic underneath. What a step
 *    card cannot show and this can is that nothing moves.
 *  - **The sector** (`arc-length`). The radius and the swept angle are two sides of one wedge
 *    and the answer is the third, curved, side, so the figure shades the wedge and prints the
 *    arc length along the arc itself.
 *
 * Everything is recomputed from `template_params` by the same route `generate()` took, with a
 * default for every parameter, and every label is typeset through `SvgMath` rather than
 * `<text>`.
 *
 * All three share one vertical layout, `circleLayout` below, because all three hang a measure
 * off the terminal side and then write full-width bands above or below the circle. Where the
 * measure lands is the heading's business and where the bands land is not, so the frame is
 * derived from the two together rather than fixed.
 *
 * A note on why the radian figures still measure their geometry in degrees: the drawing needs
 * an angle in degrees to place a ray, and `180 * top / bottom` is that number. It never
 * reaches a label. Every measure a learner READS off a radian figure is written as a multiple
 * of pi, because that is what its prompt asked for and what its answer field accepts.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL_DEEP, SOFT, SvgMath } from "../svgKit";
import { gcd, type WorkedSolutionVisual } from "../workedKit";

/* -------------------------------------------------------------------------- */
/* Typesetting a multiple of pi                                                */
/* -------------------------------------------------------------------------- */

/** `n/d` times pi as LaTeX, printing a bare multiple when the bottom is one. */
export function radTex(numerator: number, denominator: number): string {
  const sign = numerator < 0 ? "-" : "";
  const size = Math.abs(numerator);
  const top = size === 1 ? "\\pi" : `${size}\\pi`;
  return denominator === 1 ? `${sign}${top}` : `${sign}\\dfrac{${top}}{${denominator}}`;
}

/** The same value read aloud, for an aria-label. */
export function radSpoken(numerator: number, denominator: number): string {
  const sign = numerator < 0 ? "negative " : "";
  const size = Math.abs(numerator);
  const top = size === 1 ? "pi" : `${size} pi`;
  return denominator === 1 ? `${sign}${top}` : `${sign}${top} over ${denominator}`;
}

/* -------------------------------------------------------------------------- */
/* The circle                                                                  */
/* -------------------------------------------------------------------------- */

const CX = 200;
const CY = 148;
const R = 84;
/** How far past the rim the axes run. */
const REACH = R + 20;
/** Where a measure printed outside the rim sits, from the center. */
const OUTER_R = R + 30;
/** The ring the outside measure is written on, far enough out to clear the rim. */
const MEASURE_R = OUTER_R + 14;
/** The size that measure is drawn at. */
const MEASURE_SIZE = 15;
/** The radius of the shaded wedge that shows the swept angle. */
const WEDGE_R = 46;
const ROW_PITCH = 34;
/** The size the arithmetic rows are drawn at. */
const ROW_SIZE = 16;
/**
 * How deep the shared frame's own ink runs, measured from the top of the viewBox.
 *
 * The AXES, not the rim: `CircleFrame` runs both of them out to `REACH`, which overshoots the
 * circle by twenty units, and the vertical one comes down the middle of the frame exactly where
 * the arithmetic strip is centered. A clearance rule written against the rim leaves the strip
 * sitting on the axis tip.
 */
const FRAME_BOTTOM = CY + REACH;
/** The same for the sector figure, which draws the rim on its own with no axes through it. */
const RIM_BOTTOM = CY + R;
/** Blank frame left under the last arithmetic row. */
const STRIP_FOOT = 20;
/** Where the coterminal figure writes the given measure, and at what size. */
const HEADER_Y = 20;
const HEADER_SIZE = 17;
/** The clear space a label keeps from anything it is not part of. */
const LABEL_CLEAR = 8;

/**
 * Half the ink height of one label, as a share of the size it is drawn at.
 *
 * An allowance rather than a measurement, because KaTeX has not laid the label out when the
 * layout below is chosen and a measure-then-place pass would cost a second render of every
 * figure. It is sized for the TALL case, which is every case that matters here: a `\dfrac`
 * stands about 1.9 times its font size from the top of its numerator to the bottom of its
 * denominator, and every label these figures place can be one.
 */
function stackHalf(fontSize: number): number {
  return fontSize * 0.95;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function on(degrees: number, radius = R): { x: number; y: number } {
  return {
    x: CX + radius * Math.cos(toRadians(degrees)),
    y: CY - radius * Math.sin(toRadians(degrees)),
  };
}

/**
 * A counterclockwise arc from the positive horizontal round to `degrees`.
 *
 * The sweep flag is 0 rather than 1 because SVG's y axis points down, so a counterclockwise
 * turn on the page is a negative-sweep arc in user space. Every caller passes an angle
 * strictly inside one turn, which is what keeps the arc from degenerating to a point.
 */
function arcPath(degrees: number, radius: number): string {
  const end = on(degrees, radius);
  const large = degrees > 180 ? 1 : 0;
  return `M ${CX + radius} ${CY} A ${radius} ${radius} 0 ${large} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** The frame every figure shares: the rim, the two axes, and the initial side. */
function CircleFrame(): JSX.Element {
  return (
    <g>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={LINE} strokeWidth={1.5} />
      <line x1={CX - REACH} y1={CY} x2={CX + REACH} y2={CY} stroke={LINE} strokeWidth={1} />
      <line x1={CX} y1={CY - REACH} x2={CX} y2={CY + REACH} stroke={LINE} strokeWidth={1} />
      <line
        x1={CX}
        y1={CY}
        x2={CX + R}
        y2={CY}
        stroke={SOFT}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </g>
  );
}

/** The terminal side, drawn from the center out to the rim with a dot on the end. */
function TerminalSide({ degrees }: { degrees: number }): JSX.Element {
  const tip = on(degrees);
  return (
    <g>
      <line
        x1={CX}
        y1={CY}
        x2={tip.x}
        y2={tip.y}
        stroke={CIVIC}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <circle cx={tip.x} cy={tip.y} r={5} fill={CIVIC} />
    </g>
  );
}

/** The shaded wedge from the initial side round to the terminal side. */
function SweptWedge({ degrees }: { degrees: number }): JSX.Element {
  const tip = on(degrees, WEDGE_R);
  const large = degrees > 180 ? 1 : 0;
  return (
    <path
      d={`M ${CX} ${CY} L ${CX + WEDGE_R} ${CY} A ${WEDGE_R} ${WEDGE_R} 0 ${large} 0 ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} Z`}
      fill={CIVIC}
      fillOpacity={0.14}
      stroke={CIVIC}
      strokeWidth={1.2}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Where the circle sits between the bands above and below it                  */
/* -------------------------------------------------------------------------- */

interface CircleLayout {
  /** How far the circle and every label hung off it is pushed down the frame. */
  readonly drop: number;
  /** Where the first arithmetic row is centered. */
  readonly strip: number;
  readonly height: number;
}

/**
 * The vertical layout of one circle figure, derived from where its outside measure lands.
 *
 * That measure rides the terminal side, so it goes wherever the heading points. The two
 * things it can run into do not move at all: underneath every figure is the arithmetic
 * strip, a band of rows that spans the full width, and above the coterminal figure is the
 * given measure, another full-width band. Placed against CONSTANT bands the label clears
 * both in the upper right, where these figures were first drawn, and lands on them
 * elsewhere: on the strip for a heading past a half turn, and on the header for one near
 * straight up. Neither is a property of any particular heading, which is why the bands are
 * computed from the geometry rather than nudged per draw.
 *
 * So the bands are reserved and the circle is placed between them. `drop` pushes the whole
 * circle down until the measure clears whatever is written above it, and `strip` puts the
 * first row below the measure's own ink wherever that has ended up.
 *
 * BOTH of the things above the strip are measured to their ink, and that is the correction a
 * hand-tuned band could not hold. The strip used to be pinned at a constant, chosen once
 * against a heading that swung its measure into the upper right; for a heading that does not,
 * the constant is whatever it was, and at $60^{\circ}$ it left the first row's ink 2.8 units
 * off the circle. Derived from `figureBottom` instead, the gap is `LABEL_CLEAR` at every
 * heading, because the thing being cleared is now in the formula rather than in the number.
 */
function circleLayout({
  measure,
  fontSize,
  rows,
  headerBottom = 0,
  figureBottom = FRAME_BOTTOM,
}: {
  /** Where the outside measure is centered, before any drop. */
  measure: number;
  /** The size it is drawn at. */
  fontSize: number;
  /** How many arithmetic rows follow the circle. */
  rows: number;
  /** The bottom of the band written above the circle, for a figure that writes one. */
  headerBottom?: number;
  /** How deep the circle's own drawing runs, before any drop. */
  figureBottom?: number;
}): CircleLayout {
  const half = stackHalf(fontSize);
  const rowHalf = stackHalf(ROW_SIZE);
  const drop = Math.round(Math.max(0, headerBottom + LABEL_CLEAR + half - measure));
  const strip = Math.round(
    Math.max(
      figureBottom + drop + LABEL_CLEAR + rowHalf,
      measure + drop + half + LABEL_CLEAR + rowHalf,
    ),
  );
  return {
    drop,
    strip,
    height: Math.round(strip + (rows - 1) * ROW_PITCH + rowHalf + STRIP_FOOT),
  };
}

/* -------------------------------------------------------------------------- */
/* Figure one: one ray, labelled in both units                                 */
/* -------------------------------------------------------------------------- */

/**
 * The conversion figure. The degree measure sits inside the wedge and the radian measure sits
 * outside the rim on the same ray, so the two labels are visibly describing one arrow.
 *
 * `emphasis` says which of the two the item asked for, and only the emphasized one is drawn in
 * the answer color. Drawing both in it would make the figure say the learner had to produce
 * both, which on this node is the misreading rather than an accident.
 */
function TwoUnitHeadingWorked({
  degrees,
  top,
  bottom,
  emphasis,
  rows,
  ariaLabel,
  title,
}: {
  degrees: number;
  top: number;
  bottom: number;
  emphasis: "degrees" | "radians";
  rows: readonly string[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const inside = on(degrees / 2, WEDGE_R + 26);
  const outside = on(degrees, MEASURE_R);
  const { drop, strip, height } = circleLayout({
    measure: outside.y,
    fontSize: MEASURE_SIZE,
    rows: rows.length,
  });

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <g transform={`translate(0 ${drop})`}>
        <CircleFrame />
        <SweptWedge degrees={degrees} />
        <TerminalSide degrees={degrees} />

        <SvgMath
          latex={`${degrees}^{\\circ}`}
          x={inside.x}
          y={inside.y}
          fontSize={MEASURE_SIZE}
          color={emphasis === "degrees" ? CIVIC : SOFT}
          plate
          w={72}
        />
        <SvgMath
          latex={radTex(top, bottom)}
          x={outside.x}
          y={outside.y}
          fontSize={MEASURE_SIZE}
          color={emphasis === "radians" ? CIVIC : SOFT}
          plate
          w={96}
        />
      </g>

      {rows.map((row, index) => (
        <SvgMath
          key={row}
          latex={row}
          x={220}
          y={strip + index * ROW_PITCH}
          fontSize={ROW_SIZE}
          color={LABEL}
          w={430}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Figure two: the surplus turns, looped around one ray                        */
/* -------------------------------------------------------------------------- */

/**
 * The coterminal figure. One terminal side, the surplus turns as dashed loops inside the rim,
 * and the arithmetic that strips them underneath.
 *
 * The loops are the whole figure. A learner who has not got this yet believes a bigger measure
 * points somewhere else, and the only thing that answers that is seeing the extra turns land
 * back where they started.
 */
export function CoterminalWorked({
  degrees,
  givenTex,
  answerTex,
  turnTex,
  turns,
  clockwise,
  rows,
  ariaLabel,
  title,
}: {
  /** Where the terminal side is drawn, which both measures share. */
  degrees: number;
  givenTex: string;
  answerTex: string;
  /**
   * One full turn, in the unit THIS board's measures are written in: `360^{\circ}` on a degree
   * board and `2\pi` on a radian one.
   *
   * Required rather than defaulted, because the loop label is the only place the unit is not
   * carried in by a caller's own string, and a default of $2\pi$ printed `1 \times 2\pi` beside
   * a heading reading $765^{\circ}$ and a column of degree subtractions. Mixing the two units
   * inside one figure is the mistake this node is here to prevent.
   */
  turnTex: string;
  turns: number;
  clockwise: boolean;
  rows: readonly string[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const inside = on(degrees / 2, WEDGE_R + 26);
  const outside = on(degrees, MEASURE_R);
  const loopRadii = Array.from({ length: turns }, (_unused, index) => R - 14 - index * 13);
  // The one figure here that writes a band ABOVE the circle as well as below it, so the
  // given measure's own ink is what the circle has to be dropped clear of.
  const { drop, strip, height } = circleLayout({
    measure: outside.y,
    fontSize: MEASURE_SIZE,
    rows: rows.length,
    headerBottom: HEADER_Y + stackHalf(HEADER_SIZE),
  });

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <SvgMath
        latex={givenTex}
        x={220}
        y={HEADER_Y}
        fontSize={HEADER_SIZE}
        color={SIGNAL_DEEP}
      />

      <g transform={`translate(0 ${drop})`}>
        <CircleFrame />

        {loopRadii.map((radius) => (
          <circle
            key={radius}
            cx={CX}
            cy={CY}
            r={radius}
            fill="none"
            stroke={SIGNAL_DEEP}
            strokeWidth={1.4}
            strokeDasharray="5 5"
          />
        ))}

        <SweptWedge degrees={degrees} />
        <TerminalSide degrees={degrees} />

        <SvgMath
          latex={`${turns} \\times ${clockwise ? "-" : ""}${turnTex}`}
          x={CX}
          y={CY + R - 30}
          fontSize={13}
          color={SIGNAL_DEEP}
          plate
          w={92}
        />
        <SvgMath
          latex={answerTex}
          x={outside.x}
          y={outside.y}
          fontSize={MEASURE_SIZE}
          color={CIVIC}
          plate
          w={96}
        />
        <SvgMath
          latex="\text{same heading}"
          x={inside.x}
          y={inside.y}
          fontSize={11}
          color={SOFT}
          plate
          w={108}
        />
      </g>

      {rows.map((row, index) => (
        <SvgMath
          key={row}
          latex={row}
          x={220}
          y={strip + index * ROW_PITCH}
          fontSize={ROW_SIZE}
          color={LABEL}
          w={430}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Figure three: the sector                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The arc-length figure. The two straight sides are the radius, the curved side is the answer,
 * and the shaded wedge between them is the angle, so the formula's three quantities are the
 * three parts of one drawing.
 */
function ArcLengthWorked({
  degrees,
  radiusLabel,
  angleTex,
  arcTex,
  rows,
  ariaLabel,
  title,
}: {
  degrees: number;
  radiusLabel: string;
  angleTex: string;
  arcTex: string;
  rows: readonly string[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const inside = on(degrees / 2, WEDGE_R + 24);
  // The arc length is written on the BISECTOR, so it stays in the upper half whatever the
  // swept angle is and the strip below is never in its way. It goes through the same layout
  // anyway, because what keeps it clear of the top of the frame is the same reservation.
  const arcLabel = on(degrees / 2, MEASURE_R);
  const tip = on(degrees);
  const { drop, strip, height } = circleLayout({
    measure: arcLabel.y,
    fontSize: MEASURE_SIZE,
    rows: rows.length,
    figureBottom: RIM_BOTTOM,
  });

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <g transform={`translate(0 ${drop})`}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={LINE} strokeWidth={1.2} />

        <path
          d={`M ${CX} ${CY} L ${CX + R} ${CY} A ${R} ${R} 0 ${degrees > 180 ? 1 : 0} 0 ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} Z`}
          fill={SOFT}
          fillOpacity={0.1}
          stroke="none"
        />

        <line
          x1={CX}
          y1={CY}
          x2={CX + R}
          y2={CY}
          stroke={SOFT}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <line
          x1={CX}
          y1={CY}
          x2={tip.x}
          y2={tip.y}
          stroke={SOFT}
          strokeWidth={2.4}
          strokeLinecap="round"
        />

        <path
          d={arcPath(degrees, R)}
          fill="none"
          stroke={CIVIC}
          strokeWidth={4}
          strokeLinecap="round"
        />

        <SvgMath
          latex={angleTex}
          x={inside.x}
          y={inside.y}
          fontSize={14}
          color={SIGNAL_DEEP}
          plate
          w={96}
        />
        <SvgMath
          latex={radiusLabel}
          x={CX + R / 2}
          y={CY + 18}
          fontSize={13}
          color={SOFT}
          plate
          w={82}
        />
        <SvgMath
          latex={arcTex}
          x={arcLabel.x}
          y={arcLabel.y}
          fontSize={MEASURE_SIZE}
          color={CIVIC}
          plate
          w={110}
        />
      </g>

      {rows.map((row, index) => (
        <SvgMath
          key={row}
          latex={row}
          x={220}
          y={strip + index * ROW_PITCH}
          fontSize={ROW_SIZE}
          color={LABEL}
          w={430}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Recomputing the arithmetic the templates ran                                */
/* -------------------------------------------------------------------------- */

/** The chain of measures a coterminal reduction passes through, in order. */
function stripTurns(
  from: number,
  step: number,
  turns: number,
  clockwise: boolean,
): number[] {
  const chain: number[] = [];
  let running = from;
  for (let index = 0; index < turns; index += 1) {
    running = clockwise ? running + step : running - step;
    chain.push(running);
  }
  return chain;
}

/* -------------------------------------------------------------------------- */
/* The five entries                                                            */
/* -------------------------------------------------------------------------- */

export const TRG1_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d9.trg1.deg-to-rad.l1": {
    Svg: ({ degrees = 135, top = 3, bottom = 4 }) => (
      <TwoUnitHeadingWorked
        degrees={degrees}
        top={top}
        bottom={bottom}
        emphasis="radians"
        rows={[
          `${degrees}^{\\circ} \\times \\dfrac{\\pi}{180^{\\circ}} = \\dfrac{${degrees}\\pi}{180} = ${radTex(top, bottom)}`,
        ]}
        ariaLabel={`One terminal side on a circle, carrying two labels for the same heading: ${degrees} degrees inside the wedge and ${radSpoken(top, bottom)} radians outside the rim.`}
        title="The same heading written in degrees and in radians"
      />
    ),
    caption: ({ degrees = 135, top = 3, bottom = 4 }) =>
      `The arrow is drawn once. $${degrees}^{\\circ}$ and $${radTex(top, bottom)}$ radians are two names for where it points, not two headings, and multiplying by $\\dfrac{\\pi}{180^{\\circ}}$ is what swaps one name for the other. That factor is worth one, which is why the arrow does not move when it is applied.`,
  },

  "d9.trg1.rad-to-deg.l2": {
    Svg: ({ degrees = 135, top = 3, bottom = 4 }) => (
      <TwoUnitHeadingWorked
        degrees={degrees}
        top={top}
        bottom={bottom}
        emphasis="degrees"
        rows={[
          `${radTex(top, bottom)} \\times \\dfrac{180^{\\circ}}{\\pi} = \\dfrac{${top} \\times 180}{${bottom}} = ${degrees}^{\\circ}`,
        ]}
        ariaLabel={`One terminal side on a circle, carrying two labels for the same heading: ${radSpoken(top, bottom)} radians outside the rim and ${degrees} degrees inside the wedge.`}
        title="Reading a radian heading back in degrees"
      />
    ),
    caption: ({ degrees = 135 }) =>
      `The same one arrow, converted the other way. Turning it upside down is what makes the difference: $\\dfrac{180^{\\circ}}{\\pi}$ cancels the $\\pi$ instead of introducing one, and what is left is the plain number $${degrees}$. An answer that still carries a $\\pi$ is the factor used the wrong way up.`,
  },

  "d9.trg1.coterminal-degree.l2": {
    Svg: ({ given = 765, base = 45, turns = 2, clockwise = 0 }) => {
      const isClockwise = clockwise === 1;
      const chain = stripTurns(given, 360, turns, isClockwise);
      return (
        <CoterminalWorked
          degrees={base}
          givenTex={`${given}^{\\circ}`}
          answerTex={`${base}^{\\circ}`}
          turnTex="360^{\circ}"
          turns={turns}
          clockwise={isClockwise}
          rows={chain.map((value, index) => {
            const from = index === 0 ? given : (chain[index - 1] ?? given);
            return `${from}^{\\circ} ${isClockwise ? "+" : "-"} 360^{\\circ} = ${value}^{\\circ}`;
          })}
          ariaLabel={`A circle with one terminal side at ${base} degrees. The ${turns === 1 ? "one full turn" : "two full turns"} between it and the given measure of ${given} degrees are drawn as dashed loops that end where they began.`}
          title="Stripping full turns off a heading"
        />
      );
    },
    caption: ({ given = 765, base = 45, turns = 2, clockwise = 0 }) => {
      const isClockwise = clockwise === 1;
      return `The dashed loops are the ${turns === 1 ? "single full turn" : "two full turns"} the measure carries and the picture does not: they finish exactly where they start, so $${given}^{\\circ}$ and $${base}^{\\circ}$ leave the dish pointing the same way. ${isClockwise ? "Because the given measure is below zero, the turns are ADDED to climb into the window rather than taken away." : "Taking one full turn away at a time is what brings the measure under $360^{\\circ}$."}`;
    },
  },

  "d9.trg1.coterminal-radian.l3": {
    Svg: ({
      givenTop = 17,
      bottom = 6,
      top = 5,
      reducedTop = 5,
      reducedBottom = 6,
      turns = 1,
      clockwise = 0,
    }) => {
      const isClockwise = clockwise === 1;
      const fullTurn = 2 * bottom;
      const chain = stripTurns(givenTop, fullTurn, turns, isClockwise);
      return (
        <CoterminalWorked
          degrees={(180 * top) / bottom}
          givenTex={radTex(givenTop, bottom)}
          answerTex={radTex(reducedTop, reducedBottom)}
          turnTex="2\pi"
          turns={turns}
          clockwise={isClockwise}
          rows={chain.map((value, index) => {
            const from = index === 0 ? givenTop : (chain[index - 1] ?? givenTop);
            return `${radTex(from, bottom)} ${isClockwise ? "+" : "-"} ${radTex(fullTurn, bottom)} = ${radTex(value, bottom)}`;
          })}
          ariaLabel={`A circle with one terminal side at ${radSpoken(reducedTop, reducedBottom)} radians. The ${turns === 1 ? "one full turn" : "two full turns"} between it and the given measure of ${radSpoken(givenTop, bottom)} are drawn as dashed loops that end where they began.`}
          title="Stripping full turns off a radian heading"
        />
      );
    },
    caption: ({
      givenTop = 17,
      bottom = 6,
      reducedTop = 5,
      reducedBottom = 6,
      clockwise = 0,
    }) => {
      const fullTurn = 2 * bottom;
      const isClockwise = clockwise === 1;
      return `A full turn is $2\\pi$, and over this heading's own bottom that is $${radTex(fullTurn, bottom)}$. Written that way it comes off the top and the bottom never changes, which is the step the degree version had no need of. ${isClockwise ? "The given measure is below zero, so the turns go ON rather than off" : "Each loop drawn is one turn removed"}, and $${radTex(givenTop, bottom)}$ and $${radTex(reducedTop, reducedBottom)}$ end up pointing the same way.`;
    },
  },

  "d9.trg1.arc-length.l3": {
    Svg: ({ radius = 6, top = 5, bottom = 6, arcTop = 5, arcBottom = 1 }) => (
      <ArcLengthWorked
        degrees={(180 * top) / bottom}
        radiusLabel={`r = ${radius}`}
        angleTex={`\\theta = ${radTex(top, bottom)}`}
        arcTex={`s = ${radTex(arcTop, arcBottom)}`}
        rows={[
          `s = r\\theta = ${radius} \\times ${radTex(top, bottom)} = ${radTex(arcTop, arcBottom)}`,
        ]}
        ariaLabel={`A wedge of a circle of radius ${radius}. Its two straight sides are the radius and its curved side, drawn heavy, is the arc of length ${radSpoken(arcTop, arcBottom)}.`}
        title="Arc length as the curved side of a wedge"
      />
    ),
    caption: ({ radius = 6, top = 5, bottom = 6, arcTop = 5, arcBottom = 1 }) => {
      const divisor = gcd(radius * top, bottom);
      const reduced =
        divisor === 1
          ? ""
          : ` Both parts of $\\dfrac{${radius * top}\\pi}{${bottom}}$ divide by $${divisor}$, which tidies it to $${radTex(arcTop, arcBottom)}$, though the untidied form is graded the same.`;
      return `The heavy curve is the answer, and the wedge is why $s = r\\theta$ works: a radian angle is already measured in radius lengths, so the arc is $${radius}$ of them repeated $${radTex(top, bottom)}$ times over. No conversion happens first, and a degree measure could not be used here without one.${reduced}`;
    },
  },
};
