/**
 * Worked-solution figures for the D9 TRG.7 practice templates (evaluating an inverse
 * trigonometric function, naming its restricted range, and composing a function with its
 * inverse).
 *
 * Four of the five are drawn on the unit circle rather than as a column of steps, because
 * every question this node asks is a question about WHICH of several headings a ratio is
 * allowed to come back as. A learner who got one wrong has almost always found a correct
 * heading that the inverse is not permitted to return, and the only way to show them that is
 * to draw the permitted arc and their heading in the same picture. The fifth is a right
 * triangle, since a bearing read off two offsets is a statement about a triangle.
 *
 * **Every angle in this file is in degrees, and that is a grading constraint rather than a
 * preference.** `intervalAnswer("[-pi/2, pi/2]")` is a parse error on the key itself, so the
 * range item is answered in degrees, and a figure that drew the same range in radians would
 * be teaching a learner a spelling their answer field refuses. The one radian result on the
 * node, `arccos-radian`, is reached in degrees and converted in the last row, which is the
 * order its worked solution walks.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for
 * each, and recomputes what `generate()` computed by the same route.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import {
  ExpressionReductionWorked,
  numStr,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";

/* -------------------------------------------------------------------------- */
/* Shared geometry and the special-value table                                 */
/* -------------------------------------------------------------------------- */

const CX = 112;
const CY = 100;
const R = 68;
/** Where the equations beside each circle are centered. */
const COLUMN = 316;
const COLUMN_W = 232;

/** How far past the rim a ray's degree label is struck, and the size it is drawn at. */
const TAG_REACH = R + 24;
const TAG_SIZE = 14;
/** How far that label's ink reaches either side of the point it is centered on. */
const TAG_HALF = 8;

/** The note under each circle: its size, its ink either side of its baseline, its clearance. */
const NOTE_SIZE = 10;
const NOTE_ASCENT = 8;
const NOTE_DESCENT = 3;
const NOTE_CLEAR = 6;

/**
 * Where the note under each circle is set, and the frame that holds it.
 *
 * Both are DERIVED rather than chosen. The note is a band across the whole width of the
 * figure and it never moves; the degree label above it rides its ray and goes wherever the
 * heading points. Against a frame sized for the headings that happened to be in front of us
 * the two clear each other above the horizontal and collide below it: a straight-down
 * heading puts its label on the note's own baseline, and the `-60^{\circ}` a composition
 * draws misses it by about a pixel, which is not a margin. So the note begins below the
 * deepest a label can hang and the frame is whatever fits it.
 */
const NOTE_Y = CY + TAG_REACH + TAG_HALF + NOTE_CLEAR + NOTE_ASCENT;
/** The frame the three circle figures share. */
const CIRCLE_H = NOTE_Y + NOTE_DESCENT + 3;

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** A point on a circle of the given radius, at a heading measured the usual way. */
function pt(deg: number, radius = R): { x: number; y: number } {
  return {
    x: Number((CX + radius * Math.cos(rad(deg))).toFixed(2)),
    y: Number((CY - radius * Math.sin(rad(deg))).toFixed(2)),
  };
}

/**
 * An arc swept from one heading to another.
 *
 * The sweep flag is `0` because SVG measures its positive direction with `y` running DOWN,
 * so an increasing heading, which is counterclockwise on the page, is its negative direction.
 */
function arcPath(from: number, to: number, radius = R): string {
  const a = pt(from, radius);
  const b = pt(to, radius);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 0 ${b.x} ${b.y}`;
}

/** The reference angle of a heading: how far it sits from the horizontal. */
function refAngle(deg: number): number {
  const wrapped = ((deg % 360) + 360) % 360;
  if (wrapped <= 90) return wrapped;
  if (wrapped <= 180) return 180 - wrapped;
  if (wrapped <= 270) return wrapped - 180;
  return 360 - wrapped;
}

export type TrigKind = "sin" | "cos" | "tan";

/** The size of each function at each special reference angle, as LaTeX. */
const MAGNITUDE: Record<number, Record<TrigKind, string>> = {
  0: { sin: "0", cos: "1", tan: "0" },
  30: { sin: "\\dfrac{1}{2}", cos: "\\dfrac{\\sqrt{3}}{2}", tan: "\\dfrac{\\sqrt{3}}{3}" },
  45: { sin: "\\dfrac{\\sqrt{2}}{2}", cos: "\\dfrac{\\sqrt{2}}{2}", tan: "1" },
  60: { sin: "\\dfrac{\\sqrt{3}}{2}", cos: "\\dfrac{1}{2}", tan: "\\sqrt{3}" },
  90: { sin: "1", cos: "0", tan: "\\text{undefined}" },
};

/**
 * The exact value of one function at one special heading.
 *
 * The size comes from the reference angle and the SIGN is measured rather than tabulated, so
 * a quadrant cannot be mistabulated: a row of the table can only ever be wrong about how big
 * the value is, never about which way it points.
 */
export function specialValueTex(kind: TrigKind, deg: number): string {
  const row = MAGNITUDE[refAngle(deg)];
  const size = row === undefined ? "0" : row[kind];
  const numeric =
    kind === "sin"
      ? Math.sin(rad(deg))
      : kind === "cos"
        ? Math.cos(rad(deg))
        : Math.tan(rad(deg));
  if (Math.abs(numeric) < 1e-9) return "0";
  return numeric < 0 ? `-${size}` : size;
}

/** A heading, parenthesized where a leading minus would run into the function beside it. */
function angleTex(deg: number): string {
  return deg < 0 ? `\\left(${deg}^{\\circ}\\right)` : `${deg}^{\\circ}`;
}

/** The circle, its two axes, and the arc the inverse in question is allowed to answer on. */
function CircleFrame({
  bandFrom,
  bandTo,
}: {
  bandFrom: number;
  bandTo: number;
}): JSX.Element {
  return (
    <g>
      <line
        x1={CX - R - 16}
        y1={CY}
        x2={CX + R + 16}
        y2={CY}
        stroke={SOFT}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <line
        x1={CX}
        y1={CY - R - 16}
        x2={CX}
        y2={CY + R + 16}
        stroke={SOFT}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={LINE} strokeWidth={1.4} />
      <path
        d={arcPath(bandFrom, bandTo)}
        fill="none"
        stroke={CIVIC}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.5}
      />
    </g>
  );
}

/** A terminal ray from the center out to a heading, with its dot and its degree label. */
function Ray({
  deg,
  color,
  label,
}: {
  deg: number;
  color: string;
  label: boolean;
}): JSX.Element {
  const tip = pt(deg);
  const tag = pt(deg, TAG_REACH);
  return (
    <g>
      <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke={color} strokeWidth={1.8} />
      <circle cx={tip.x} cy={tip.y} r={3.6} fill={color} />
      {label ? (
        <SvgMath
          latex={`${deg}^{\\circ}`}
          x={tag.x}
          y={tag.y}
          fontSize={TAG_SIZE}
          color={color}
          w={62}
        />
      ) : null}
    </g>
  );
}

/** The stack of equations to the right of every circle, the last one in the answer color. */
function Rows({ rows }: { rows: readonly string[] }): JSX.Element {
  return (
    <g>
      {rows.map((latex, index) => (
        <SvgMath
          key={latex}
          latex={latex}
          x={COLUMN}
          y={54 + index * 44}
          fontSize={index === rows.length - 1 ? 17 : 15}
          color={index === rows.length - 1 ? CIVIC : LABEL}
          w={COLUMN_W}
        />
      ))}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* L1: arcsine read off the height                                             */
/* -------------------------------------------------------------------------- */

/**
 * The heading whose sine was given, with the height it produces marked on the vertical axis
 * and the half of the circle arcsine is allowed to answer on drawn behind it.
 *
 * The height label steps aside when the heading is nearly horizontal, because at zero the
 * reading sits exactly where the horizontal axis is already drawn.
 */
function ArcsinHeightWorked({ deg }: { deg: number }): JSX.Element {
  const value = specialValueTex("sin", deg);
  const tip = pt(deg);
  const shallow = Math.abs(deg) < 15;

  return (
    <svg
      viewBox={`0 0 440 ${CIRCLE_H}`}
      role="img"
      aria-label={`A unit circle with the right half marked as the range of arcsine, and a heading of ${spoken(deg)} degrees whose height is the given sine`}
    >
      <title>The height a heading produces, and the one heading arcsine gives back</title>

      <CircleFrame bandFrom={-90} bandTo={90} />
      <line
        x1={CX}
        y1={tip.y}
        x2={tip.x}
        y2={tip.y}
        stroke={SIGNAL}
        strokeWidth={1.4}
        strokeDasharray="4 3"
      />
      <Ray deg={deg} color={SIGNAL} label />
      {/* The reading is pinned a fixed distance left of the vertical axis while the height it
        names rides the heading, so it meets the rim wherever the two happen to cross. Over
        the nine headings arcsine is asked at, five put it on the circle stroke, at plus and
        minus 45 and 60 and again at minus 90; only the three shallow ones and the top of the
        range fall in clear space. Plated rather than moved for the reason the offset exists:
        the label has to stay beside the height it measures.

        Bare `plate`, which is the CARD. `plate="plot"` paints `var(--paper)` against this
        figure's `var(--paper-deep)` card and reads as a white box, which is what #456 took
        off these same circles. The degree tag is deliberately NOT plated: `TAG_REACH` already
        stands it clear of everything drawn, confirmed over all nine draws. */}
      <SvgMath
        latex={value}
        x={CX - 34}
        y={shallow ? tip.y - 20 : tip.y}
        fontSize={14}
        color={SIGNAL}
        w={66}
        plate
      />

      <text x={CX} y={NOTE_Y} textAnchor="middle" fontSize={NOTE_SIZE} fill={SOFT}>
        arcsine answers only on the marked half
      </text>

      <Rows
        rows={[
          `\\sin ${angleTex(deg)} = ${value}`,
          `\\arcsin\\left(${value}\\right) = ${deg}^{\\circ}`,
        ]}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* L2a: arccosine read off the horizontal, then converted                      */
/* -------------------------------------------------------------------------- */

/**
 * The same picture turned on its side for cosine: the reading is a horizontal position, the
 * permitted arc is the top half, and a third row carries the degree answer into radians.
 */
function ArccosRadianWorked({
  deg,
  num,
  den,
}: {
  deg: number;
  num: number;
  den: number;
}): JSX.Element {
  const value = specialValueTex("cos", deg);
  const tip = pt(deg);
  const upright = Math.abs(tip.x - CX) < 12;
  const radianTex = num === 1 ? `\\dfrac{\\pi}{${den}}` : `\\dfrac{${num}\\pi}{${den}}`;

  return (
    <svg
      viewBox={`0 0 440 ${CIRCLE_H}`}
      role="img"
      aria-label={`A unit circle with the top half marked as the range of arccosine, and a heading of ${spoken(deg)} degrees whose horizontal reading is the given cosine`}
    >
      <title>The heading arccosine gives back, and the same angle in radians</title>

      <CircleFrame bandFrom={0} bandTo={180} />
      <line
        x1={tip.x}
        y1={CY}
        x2={tip.x}
        y2={tip.y}
        stroke={SIGNAL}
        strokeWidth={1.4}
        strokeDasharray="4 3"
      />
      <Ray deg={deg} color={SIGNAL} label />
      {/* Plated for the same reason the arcsine reading above is, and it is the same figure
        turned on its side: the reading is pinned below the horizontal axis while the position
        it names rides the heading, and four of the seven headings arccosine is asked at land
        it on the rim, at 30, 45, 135 and 150. */}
      <SvgMath
        latex={value}
        x={upright ? CX + 30 : tip.x}
        y={CY + 22}
        fontSize={14}
        color={SIGNAL}
        w={66}
        plate
      />

      <text x={CX} y={NOTE_Y} textAnchor="middle" fontSize={NOTE_SIZE} fill={SOFT}>
        arccosine answers only on the marked half
      </text>

      <Rows
        rows={[
          `\\arccos\\left(${value}\\right) = ${deg}^{\\circ}`,
          `${deg}^{\\circ} \\times \\dfrac{\\pi}{180^{\\circ}} = ${radianTex}`,
        ]}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* L2b: the restricted range as a stretch of a degree line                     */
/* -------------------------------------------------------------------------- */

const LINE_LEFT = 42;
const LINE_RIGHT = 402;
const LINE_FROM = -180;
const LINE_TO = 360;
const LINE_Y = 116;

const atDeg = (deg: number): number =>
  Number(
    (
      LINE_LEFT +
      ((deg - LINE_FROM) / (LINE_TO - LINE_FROM)) * (LINE_RIGHT - LINE_LEFT)
    ).toFixed(2),
  );

/**
 * The band drawn on a line of headings rather than on the circle, because what this item
 * grades is the pair of BRACKETS as much as the pair of numbers: a closed end and an open one
 * are two different answers to the checker, and a filled dot against a hollow one is the only
 * drawing of that difference a learner can read at a glance.
 *
 * The line runs a turn and a half so that all three bands are visibly different stretches of
 * ONE sweep. Drawn only as far as its own band, each would look like the whole of what there
 * is, which is the misreading the item exists to catch.
 */
function RestrictedBandWorked({
  inverse,
  forwardWord,
  lo,
  hi,
  closed,
}: {
  inverse: string;
  forwardWord: string;
  lo: number;
  hi: number;
  closed: boolean;
}): JSX.Element {
  const ticks = [-180, -90, 0, 90, 180, 270, 360];
  const bracket = closed
    ? `[${lo}^{\\circ}, ${hi}^{\\circ}]`
    : `(${lo}^{\\circ}, ${hi}^{\\circ})`;

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={`A line of headings from negative 180 to 360 degrees, with the stretch from ${spoken(lo)} to ${spoken(hi)} degrees marked as ${closed ? "including" : "excluding"} its ends`}
    >
      <title>The one stretch of headings the inverse is allowed to answer on</title>

      <SvgMath latex={bracket} x={220} y={46} fontSize={19} color={CIVIC} w={300} />
      <text x={220} y={74} textAnchor="middle" fontSize={11} fill={SOFT}>
        {`the stretch ${forwardWord} is cut down to, and every angle ${inverse} can return`}
      </text>

      <line
        x1={LINE_LEFT}
        y1={LINE_Y}
        x2={LINE_RIGHT}
        y2={LINE_Y}
        stroke={LINE}
        strokeWidth={1.4}
      />
      <line
        x1={atDeg(lo)}
        y1={LINE_Y}
        x2={atDeg(hi)}
        y2={LINE_Y}
        stroke={CIVIC}
        strokeWidth={4.5}
        opacity={0.55}
      />

      {ticks.map((tick) => {
        const edge = tick === lo || tick === hi;
        return (
          <g key={tick}>
            <line
              x1={atDeg(tick)}
              y1={LINE_Y - 6}
              x2={atDeg(tick)}
              y2={LINE_Y + 6}
              stroke={SOFT}
              strokeWidth={1}
            />
            <SvgMath
              latex={`${tick}^{\\circ}`}
              x={atDeg(tick)}
              y={LINE_Y + 26}
              fontSize={12}
              color={edge ? CIVIC : SOFT}
              w={58}
            />
          </g>
        );
      })}

      {[lo, hi].map((end) => (
        <circle
          key={end}
          cx={atDeg(end)}
          cy={LINE_Y}
          r={5}
          fill={closed ? CIVIC : "var(--paper)"}
          stroke={CIVIC}
          strokeWidth={2}
        />
      ))}

      {/* Both readings are kept short of the 440-unit frame: the longer wording measured
          325.7px against 304.8px of column in CI's font, which an SVG root clips. */}
      <text x={220} y={176} textAnchor="middle" fontSize={11} fill={SOFT}>
        {closed
          ? `${forwardWord} has a value at both ends, so the brackets are square`
          : `${forwardWord} runs off without limit, so the brackets are round`}
      </text>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* L3a: two headings sharing one reading                                       */
/* -------------------------------------------------------------------------- */

interface ComposeKind {
  kind: TrigKind;
  inner: string;
  outer: string;
}

const SINE_KIND: ComposeKind = { kind: "sin", inner: "\\sin", outer: "\\arcsin" };

const COMPOSE_KINDS: Record<number, ComposeKind> = {
  0: SINE_KIND,
  1: { kind: "cos", inner: "\\cos", outer: "\\arccos" },
  2: { kind: "tan", inner: "\\tan", outer: "\\arctan" },
};

/**
 * The heading that went in and the heading that came back, drawn on one circle with the
 * reading they share dashed between them.
 *
 * The dashed segment is the whole argument, and it draws itself differently for each function
 * without being told to: two headings with one sine are level, so it comes out horizontal; two
 * with one cosine are plumb, so it comes out vertical; and two with one tangent are half a turn
 * apart, so it comes out as a diameter through the center. A learner who thinks a composition
 * hands its input straight back is looking at the one picture where the two ends of that
 * segment are visibly different points.
 */
export function ComposeWorked({
  fn,
  inner,
  principal,
}: {
  fn: number;
  inner: number;
  principal: number;
}): JSX.Element {
  const { kind, inner: innerTex, outer: outerTex } = COMPOSE_KINDS[fn] ?? SINE_KIND;
  const value = specialValueTex(kind, inner);
  const from = pt(inner);
  const to = pt(principal);
  const band = kind === "cos" ? { lo: 0, hi: 180 } : { lo: -90, hi: 90 };
  const shared =
    kind === "sin"
      ? "one height, so one sine"
      : kind === "cos"
        ? "one horizontal reading, so one cosine"
        : "one straight line, so one tangent";

  return (
    <svg
      viewBox={`0 0 440 ${CIRCLE_H}`}
      role="img"
      aria-label={`A unit circle carrying a heading of ${spoken(inner)} degrees and a heading of ${spoken(principal)} degrees, which share a reading, with only the second inside the range the inverse may answer on`}
    >
      <title>Two headings with one reading, and the only one the inverse may return</title>

      <CircleFrame bandFrom={band.lo} bandTo={band.hi} />
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={SOFT}
        strokeWidth={1.4}
        strokeDasharray="4 3"
      />
      <Ray deg={inner} color={SIGNAL} label />
      <Ray deg={principal} color={CIVIC} label />

      <text x={CX} y={NOTE_Y} textAnchor="middle" fontSize={NOTE_SIZE} fill={SOFT}>
        {shared}
      </text>

      <Rows
        rows={[
          `${innerTex} ${angleTex(inner)} = ${value}`,
          `${outerTex}\\left(${value}\\right) = ${principal}^{\\circ}`,
        ]}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* L3b: a bearing off two offsets                                              */
/* -------------------------------------------------------------------------- */

/**
 * The right triangle the two offsets make, drawn TO THE SHAPE ITS OWN NUMBERS DESCRIBE: the
 * longer offset fills the space and the shorter follows from the ratio, so a `24` beside a `7`
 * really does produce the shallow angle the arithmetic beside it reports.
 *
 * The last row is written with `\approx` and not `=`, because the answer is rounded and the
 * item accepts a learner who carried more digits than it shows.
 */
function BearingWorked({ across, along }: { across: number; along: number }): JSX.Element {
  const exact = (Math.atan2(along, across) * 180) / Math.PI;
  const unit = 104 / Math.max(across, along);
  const corner = { x: 60, y: 160 };
  const far = { x: Number((60 + across * unit).toFixed(2)), y: 160 };
  const top = { x: far.x, y: Number((160 - along * unit).toFixed(2)) };
  // The angle's arc and its label are both struck from the corner, and the label rides the
  // BISECTOR rather than a fixed offset: the drawn angle runs from 16 to 74 degrees across the
  // pool, and anything nailed to one spot lands inside the triangle at one end of that and
  // outside it at the other.
  const arcR = 26;
  const onArc = (degrees: number, radius: number) => ({
    x: Number((corner.x + radius * Math.cos(rad(degrees))).toFixed(2)),
    y: Number((corner.y - radius * Math.sin(rad(degrees))).toFixed(2)),
  });
  const arcEnd = onArc(exact, arcR);
  const arcTag = onArc(exact / 2, arcR + 17);

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={`A right triangle whose adjacent side is ${spoken(across)} and whose opposite side is ${spoken(along)}, with the angle between the adjacent side and the hypotenuse measuring about ${exact.toFixed(2)} degrees`}
    >
      <title>
        The angle a pair of offsets fixes, read back out with the inverse tangent
      </title>

      <path
        d={`M ${corner.x} ${corner.y} L ${far.x} ${far.y} L ${top.x} ${top.y} Z`}
        fill="none"
        stroke={LINE}
        strokeWidth={1.6}
      />
      <path
        d={`M ${far.x - 13} ${far.y} L ${far.x - 13} ${far.y - 13} L ${far.x} ${far.y - 13}`}
        fill="none"
        stroke={SOFT}
        strokeWidth={1.2}
      />
      <path
        d={`M ${corner.x + arcR} ${corner.y} A ${arcR} ${arcR} 0 0 0 ${arcEnd.x} ${arcEnd.y}`}
        fill="none"
        stroke={SIGNAL}
        strokeWidth={1.6}
      />
      <SvgMath
        latex="\theta"
        x={arcTag.x}
        y={arcTag.y}
        fontSize={14}
        color={SIGNAL}
        w={40}
      />

      <SvgMath
        latex={numStr(across)}
        x={(corner.x + far.x) / 2}
        y={corner.y + 20}
        fontSize={14}
        color={LABEL}
        w={62}
      />
      <SvgMath
        latex={numStr(along)}
        x={far.x + 22}
        y={(corner.y + top.y) / 2}
        fontSize={14}
        color={LABEL}
        w={54}
      />

      <Rows
        rows={[
          `\\tan\\theta = \\dfrac{${along}}{${across}}`,
          `\\theta = \\arctan\\left(\\dfrac{${along}}{${across}}\\right) = ${exact.toFixed(4)}^{\\circ}`,
          `\\theta \\approx ${exact.toFixed(2)}^{\\circ}`,
        ]}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

const BAND_WORDS: Record<number, { inverse: string; forwardWord: string }> = {
  0: { inverse: "arcsine", forwardWord: "sine" },
  1: { inverse: "arccosine", forwardWord: "cosine" },
  2: { inverse: "arctangent", forwardWord: "tangent" },
};

/* -------------------------------------------------------------------------- */
/* The two shapes that ask for a principal value at the other two inverses     */
/* -------------------------------------------------------------------------- */

/**
 * The band each inverse answers inside, as LaTeX, keyed on the `fn` flag the two new templates
 * record (`0` for the first of the pair, `1` for arctangent).
 *
 * A separate table from {@link BAND_WORDS} because these two shapes carry the band as the thing
 * the reasoning turns on rather than as the answer, and because their `fn` flag has only two
 * values where the range shape's has three.
 */
const PRINCIPAL_BANDS = [
  ["\\arccos", "[0^{\\circ}, 180^{\\circ}]"],
  ["\\arctan", "(-90^{\\circ}, 90^{\\circ})"],
] as const;

const SIGNED_BANDS = [
  ["\\arcsin", "[-90^{\\circ}, 90^{\\circ}]"],
  ["\\arctan", "(-90^{\\circ}, 90^{\\circ})"],
] as const;

/**
 * A chain of three readings: which inverse, which band, which angle.
 *
 * The shared reduction column rather than a picture, and for a reason: what these two shapes
 * are about is which of three BANDS the answer has to come from, and a band is an interval the
 * column can name where a circle would have to draw it and then still name the ratio, the
 * heading and the conversion around it. {@link RestrictedBandWorked} already draws the bands
 * for the shape whose ANSWER is a band.
 */
function principalRows(
  inverse: string,
  band: string,
  ratio: string,
  answerTex: string,
): ReductionRow[] {
  return [
    { tokens: [{ text: `${inverse}\\left(${ratio}\\right)`, color: LABEL }] },
    { tokens: [{ text: `\\text{answers only inside } ${band}`, color: SIGNAL }] },
    { tokens: [{ text: answerTex, color: CIVIC }] },
  ];
}

/** `\dfrac{\pi}{6}` / `\dfrac{2\pi}{3}`, signed. */
function signedRadianTex(num: number, den: number, negative: boolean): string {
  const body = num === 1 ? `\\dfrac{\\pi}{${den}}` : `\\dfrac{${num}\\pi}{${den}}`;
  return negative ? `-${body}` : body;
}

export const TRG7_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d9.trg7.arcsin-degree.l1": {
    Svg: ({ deg = 30 }) => <ArcsinHeightWorked deg={deg} />,
    caption: ({ deg = 30 }) =>
      `Arcsine may only answer inside $[-90^{\\circ}, 90^{\\circ}]$, and on that half of the circle exactly one heading reaches the height $${specialValueTex("sin", deg)}$, so $\\arcsin\\left(${specialValueTex("sin", deg)}\\right) = ${deg}^{\\circ}$.`,
  },

  "d9.trg7.arccos-radian.l2": {
    Svg: ({ deg = 60, num = 1, den = 3 }) => (
      <ArccosRadianWorked deg={deg} num={num} den={den} />
    ),
    caption: ({ deg = 60, num = 1, den = 3 }) =>
      `Arccosine may only answer inside $[0^{\\circ}, 180^{\\circ}]$, and the heading there with that cosine is $${deg}^{\\circ}$. Multiplying by $\\dfrac{\\pi}{180^{\\circ}}$ turns it into $${num === 1 ? `\\dfrac{\\pi}{${den}}` : `\\dfrac{${num}\\pi}{${den}}`}$.`,
  },

  "d9.trg7.range-interval.l2": {
    Svg: ({ fn = 0, lo = -90, hi = 90, closed = 1 }) => {
      const words = BAND_WORDS[fn] ?? { inverse: "arcsine", forwardWord: "sine" };
      return (
        <RestrictedBandWorked
          inverse={words.inverse}
          forwardWord={words.forwardWord}
          lo={lo}
          hi={hi}
          closed={closed === 1}
        />
      );
    },
    caption: ({ fn = 0, lo = -90, hi = 90, closed = 1 }) => {
      const words = BAND_WORDS[fn] ?? { inverse: "arcsine", forwardWord: "sine" };
      const bracket =
        closed === 1
          ? `[${lo}^{\\circ}, ${hi}^{\\circ}]`
          : `(${lo}^{\\circ}, ${hi}^{\\circ})`;
      return closed === 1
        ? `Cutting ${words.forwardWord} down to one stretch it never repeats a value on leaves $${bracket}$, and it has a value at both ends, so both ends are included.`
        : `Cutting ${words.forwardWord} down to one stretch it never repeats a value on leaves $${bracket}$, and it runs off without limit at both ends, so neither end is included.`;
    },
  },

  "d9.trg7.principal-degree.l2": {
    // The ratio is not in `template_params` — it is a table row the generator picked — so the
    // figure recomputes nothing about it and states the band and the angle, which ARE recorded.
    Svg: ({ fn = 0, deg = 60 }) => {
      const [inverse, band] = PRINCIPAL_BANDS[fn === 1 ? 1 : 0];
      return (
        <ExpressionReductionWorked
          rows={principalRows(
            inverse,
            band,
            "r",
            `${inverse}(r) = ${numStr(deg)}^{\\circ}`,
          )}
          title="Which band the inverse answers inside, and the angle in it"
          ariaLabel={`The inverse answers only inside its own band, and the angle in that band with this ratio is ${spoken(deg)} degrees`}
        />
      );
    },
    caption: ({ fn = 0, deg = 60 }) =>
      fn === 1
        ? `Arctangent is cut across the quarter turn either side of zero, so it answers negatively for a negative ratio and can never reach a quarter turn itself. The angle in that band is $${numStr(deg)}^{\\circ}$.`
        : `Arccosine is cut forward from zero across a half turn, so it never answers with a negative angle and a negative ratio comes back in the SECOND quadrant rather than below zero. The angle in that band is $${numStr(deg)}^{\\circ}$.`,
  },

  "d9.trg7.signed-radian.l2": {
    Svg: ({ fn = 0, num = 1, den = 6, neg = 0 }) => {
      const [inverse, band] = SIGNED_BANDS[fn === 1 ? 1 : 0];
      const negative = neg === 1;
      const deg = (negative ? -180 : 180) * (num / den);
      return (
        <ExpressionReductionWorked
          rows={[
            ...principalRows(inverse, band, "r", `${numStr(deg)}^{\\circ}`),
            {
              tokens: [
                {
                  text: `${numStr(deg)}^{\\circ} \\times \\dfrac{\\pi}{180^{\\circ}} = ${signedRadianTex(num, den, negative)}`,
                  color: CIVIC,
                },
              ],
            },
          ]}
          title="The angle in degrees first, then converted with its sign"
          ariaLabel={`The angle in the band is ${spoken(deg)} degrees, which converts to ${negative ? "negative " : ""}${num} pi over ${den} radians`}
        />
      );
    },
    caption: ({ fn = 0, num = 1, den = 6, neg = 0 }) =>
      neg === 1
        ? `Both of these inverses answer inside the quarter turn either side of zero, so a negative ratio comes back BELOW zero rather than as a heading past a half turn. The conversion carries the sign through unchanged: $${signedRadianTex(num, den, true)}$.`
        : `The ratio is positive, so the angle is above zero, and multiplying a degree measure by $\\dfrac{\\pi}{180^{\\circ}}$ turns it into $${signedRadianTex(num, den, false)}$. Arccosine is the one inverse whose answers can never be negative; ${fn === 1 ? "arctangent" : "arcsine"} is not it.`,
  },

  "d9.trg7.compose-principal.l3": {
    Svg: ({ fn = 0, inner = 150, principal = 30 }) => (
      <ComposeWorked fn={fn} inner={inner} principal={principal} />
    ),
    caption: ({ fn = 0, inner = 150, principal = 30 }) => {
      const { kind } = COMPOSE_KINDS[fn] ?? SINE_KIND;
      return `Both $${inner}^{\\circ}$ and $${principal}^{\\circ}$ give the reading $${specialValueTex(kind, inner)}$, but only $${principal}^{\\circ}$ is inside the range the inverse may answer on, so that is what the composition hands back rather than the $${inner}^{\\circ}$ it was given.`;
    },
  },

  "d9.trg7.arctan-round.l3": {
    Svg: ({ across = 4, along = 3 }) => <BearingWorked across={across} along={along} />,
    caption: ({ across = 4, along = 3 }) => {
      const exact = (Math.atan2(along, across) * 180) / Math.PI;
      return `The offset facing the angle over the offset beside it is the tangent, so $\\tan\\theta = \\dfrac{${along}}{${across}}$. Undoing the tangent gives $${exact.toFixed(4)}^{\\circ}$, which rounds to $${exact.toFixed(2)}^{\\circ}$.`;
    },
  },
};
