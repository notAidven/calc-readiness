/**
 * Worked-solution figures for the D10 GEO.1 practice templates (the Pythagorean theorem in
 * both directions, the angle totals, an exact diagonal, and a pair of similar triangles).
 *
 * Every entry here is a labelled FIGURE rather than a column of steps, because each of these
 * shapes is a statement about a picture: which side is opposite the right angle, which angles
 * fill a straight line, which sides correspond. A learner who got one wrong is far more often
 * looking at the wrong side than mis-multiplying, and a step card cannot show them that.
 *
 * The three triangle figures are drawn TO THE SHAPE THEIR NUMBERS DESCRIBE: each is scaled so
 * that its longer leg fills the space, and the other leg follows from the ratio. A fixed
 * outline would put a squat triangle under the labels 8 and 15 and teach against the
 * arithmetic printed beside it.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for
 * each, and recomputes what `generate()` computed by the same route.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { triangleFromAngles } from "../triangleFromAngles";
import { numStr, spoken, type WorkedSolutionVisual } from "../workedKit";

/* -------------------------------------------------------------------------- */
/* A right triangle with one side named as the answer                          */
/* -------------------------------------------------------------------------- */

/**
 * A right triangle with both legs and the hypotenuse labelled, the answered side in the
 * success colour, and the theorem worked out beside it.
 *
 * `rows` is passed in rather than derived, because the two templates that use this figure
 * combine their squares in opposite directions: adding for the hypotenuse and subtracting for
 * a leg. Deriving the rows here would have to re-decide that, and the decision is exactly
 * what the two shapes differ by.
 */
function RightTriangleWorked({
  legUp,
  legBase,
  hyp,
  answered,
  rows,
  ariaLabel,
  title,
}: {
  legUp: number;
  legBase: number;
  hyp: number;
  /** Which side the item asked for; it is the one drawn in the success colour. */
  answered: "up" | "base" | "hyp";
  rows: readonly string[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const unit = 108 / Math.max(legUp, legBase);
  const corner = { x: 62, y: 158 };
  const top = { x: 62, y: 158 - legUp * unit };
  const right = { x: 62 + legBase * unit, y: 158 };
  const mid = { x: (top.x + right.x) / 2, y: (top.y + right.y) / 2 };
  const away = Math.hypot(mid.x - corner.x, mid.y - corner.y) || 1;
  const hypLabel = {
    x: mid.x + ((mid.x - corner.x) / away) * 24,
    y: mid.y + ((mid.y - corner.y) / away) * 24,
  };
  const ink = (side: "up" | "base" | "hyp") => (side === answered ? CIVIC : LABEL);

  return (
    <svg viewBox="0 0 440 200" role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <path
        d={`M ${corner.x} ${corner.y} L ${top.x} ${top.y} L ${right.x} ${right.y} Z`}
        fill="none"
        stroke={LINE}
        strokeWidth={1.6}
      />
      <path
        d={`M ${corner.x} ${corner.y - 13} L ${corner.x + 13} ${corner.y - 13} L ${corner.x + 13} ${corner.y}`}
        fill="none"
        stroke={SOFT}
        strokeWidth={1.2}
      />

      <SvgMath
        latex={numStr(legUp)}
        x={34}
        y={(corner.y + top.y) / 2}
        fontSize={15}
        color={ink("up")}
        w={48}
      />
      <SvgMath
        latex={numStr(legBase)}
        x={(corner.x + right.x) / 2}
        y={178}
        fontSize={15}
        color={ink("base")}
        w={64}
      />
      <SvgMath
        latex={numStr(hyp)}
        x={hypLabel.x}
        y={hypLabel.y}
        fontSize={15}
        color={ink("hyp")}
        w={56}
      />
      {/* OUTSIDE the corner, below and to its left, rather than inside the triangle.
          Inside, the words are nailed to the corner while the hypotenuse label rides the
          outward normal of a side whose slope is the item's own numbers, so the two meet on
          a shallow triangle and part on a steep one: at 5-12-13 the "13" landed on "angle",
          and at 3-4-5 it cleared by 20 units. Nothing is drawn down here at any ratio the
          triples produce, and the base label is centred on a base that starts at the corner,
          so it can never reach back past it. */}
      <text x={corner.x - 2} y={corner.y + 18} textAnchor="end" fontSize={10} fill={SOFT}>
        right angle
      </text>

      {rows.map((latex, index) => (
        <SvgMath
          key={latex}
          latex={latex}
          x={318}
          y={48 + index * 40}
          fontSize={16}
          color={index === rows.length - 1 ? CIVIC : LABEL}
          w={220}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The two angle figures                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A triangle carrying two known angles, with the third one answered.
 *
 * DRAWN AT THE ANGLES IT IS LABELLED WITH, like the three side figures above it and for the
 * same reason. Three constants here put a fixed outline of about 54, 46 and 80 degrees under
 * every draw, so 60 / 60 / 60 rendered as a visibly scalene triangle with an 80-degree apex
 * and a learner checking the answer against the picture was told a correct answer was wrong.
 * The template draws each given angle anywhere in 25 to 80, which leaves the third running
 * from 20 to 130, so nothing about the shape can be assumed: the box below is the left half
 * of the canvas, and the two equations keep the right.
 */
function TriangleAnglesWorked({
  first,
  second,
  answer,
}: {
  first: number;
  second: number;
  answer: number;
}): JSX.Element {
  const triangle = triangleFromAngles(first, second, {
    x: 44,
    y: 40,
    width: 196,
    height: 126,
  });
  const { left, right: rightFoot, apex } = triangle;

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={`A triangle with angles of ${spoken(first)} and ${spoken(second)} degrees, whose third angle is ${spoken(answer)} degrees`}
    >
      <title>The three angles of a triangle, filling one fixed total</title>

      <path
        d={`M ${left.x} ${left.y} L ${apex.x} ${apex.y} L ${rightFoot.x} ${rightFoot.y} Z`}
        fill="none"
        stroke={LINE}
        strokeWidth={1.6}
      />
      {/* Each label on the bisector of its own corner, which is what `triangleFromAngles`
          returns. A fixed nudge off a vertex cannot follow a shape that changes with the
          draw: it sits inside a 60-degree corner and outside a 20-degree one. */}
      <SvgMath
        latex={`${first}^{\\circ}`}
        x={triangle.leftLabel.x}
        y={triangle.leftLabel.y}
        fontSize={14}
        color={LABEL}
        w={54}
      />
      <SvgMath
        latex={`${second}^{\\circ}`}
        x={triangle.rightLabel.x}
        y={triangle.rightLabel.y}
        fontSize={14}
        color={LABEL}
        w={54}
      />
      <SvgMath
        latex={`${answer}^{\\circ}`}
        x={triangle.apexLabel.x}
        y={triangle.apexLabel.y}
        fontSize={14}
        color={CIVIC}
        w={54}
      />

      {/* `\mathord{?}`, not a bare `?`. KaTeX classes `?` as a CLOSE atom, and TeX demotes a
          binary operator standing before a close atom to an ordinary one, which takes the
          medium space out on BOTH sides: `60^\circ +? = 180^\circ`. Wrapping it as an Ord
          restores the spacing, and changes nothing else about how it is set. */}
      <SvgMath
        latex={`${first}^{\\circ} + ${second}^{\\circ} + \\mathord{?} = 180^{\\circ}`}
        x={334}
        y={72}
        fontSize={15}
        color={LABEL}
        w={200}
      />
      <SvgMath
        latex={`180^{\\circ} - ${first + second}^{\\circ} = ${answer}^{\\circ}`}
        x={334}
        y={118}
        fontSize={16}
        color={CIVIC}
        w={200}
      />
    </svg>
  );
}

/** Two angles filling a straight line, with the second one answered. */
function StraightLineAnglesWorked({
  first,
  answer,
}: {
  first: number;
  answer: number;
}): JSX.Element {
  const pivot = { x: 160, y: 148 };
  const reach = 108;
  const radians = (first * Math.PI) / 180;
  const ray = {
    x: pivot.x + reach * Math.cos(radians),
    y: pivot.y - reach * Math.sin(radians),
  };
  // ONE shared baseline for both degree labels. The two name the angles of the same straight
  // line, so reading them as a pair is the figure's point; a staggered `y` makes them look like
  // they belong to different heights of the diagram. Kept as one constant rather than two props
  // so a later tweak cannot put the stagger back one side at a time.
  const angleY = pivot.y - 20;

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={`An angle of ${spoken(first)} degrees on a straight line, beside an angle of ${spoken(answer)} degrees`}
    >
      <title>Two angles filling a straight line</title>

      <line
        x1={pivot.x - reach}
        y1={pivot.y}
        x2={pivot.x + reach}
        y2={pivot.y}
        stroke={LINE}
        strokeWidth={1.6}
      />
      <line
        x1={pivot.x}
        y1={pivot.y}
        x2={ray.x}
        y2={ray.y}
        stroke={LINE}
        strokeWidth={1.6}
      />
      <circle cx={pivot.x} cy={pivot.y} r={3} fill={SOFT} />

      <SvgMath
        latex={`${first}^{\\circ}`}
        x={pivot.x + 44}
        y={angleY}
        fontSize={14}
        color={LABEL}
        w={54}
      />
      <SvgMath
        latex={`${answer}^{\\circ}`}
        x={pivot.x - 46}
        y={angleY}
        fontSize={14}
        color={CIVIC}
        w={54}
      />

      <SvgMath
        latex={`${first}^{\\circ} + \\mathord{?} = 180^{\\circ}`}
        x={340}
        y={70}
        fontSize={15}
        color={LABEL}
        w={180}
      />
      <SvgMath
        latex={`180^{\\circ} - ${first}^{\\circ} = ${answer}^{\\circ}`}
        x={340}
        y={116}
        fontSize={16}
        color={CIVIC}
        w={180}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The rectangle and its exact diagonal                                        */
/* -------------------------------------------------------------------------- */

function RectangleDiagonalWorked({
  w,
  h,
  a,
  b,
  total,
}: {
  w: number;
  h: number;
  a: number;
  b: number;
  total: number;
}): JSX.Element {
  const unit = 116 / Math.max(w, h);
  const x0 = 62;
  const y1 = 162;
  const boxW = w * unit;
  const boxH = h * unit;
  const y0 = y1 - boxH;

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={`A rectangle ${spoken(w)} by ${spoken(h)} with its diagonal drawn, whose exact length is ${spoken(a)} root ${spoken(b)}`}
    >
      <title>A rectangle cut into two right triangles by its diagonal</title>

      <rect
        x={x0}
        y={y0}
        width={boxW}
        height={boxH}
        fill="none"
        stroke={LINE}
        strokeWidth={1.6}
      />
      <line x1={x0} y1={y1} x2={x0 + boxW} y2={y0} stroke={SIGNAL} strokeWidth={1.8} />
      <path
        d={`M ${x0} ${y1 - 13} L ${x0 + 13} ${y1 - 13} L ${x0 + 13} ${y1}`}
        fill="none"
        stroke={SOFT}
        strokeWidth={1.2}
      />

      <SvgMath
        latex={numStr(w)}
        x={x0 + boxW / 2}
        y={y1 + 20}
        fontSize={15}
        color={LABEL}
        w={64}
      />
      <SvgMath
        latex={numStr(h)}
        x={x0 - 24}
        y={(y0 + y1) / 2}
        fontSize={15}
        color={LABEL}
        w={48}
      />
      <SvgMath
        latex={`${a}\\sqrt{${b}}`}
        x={x0 + boxW / 2 + 6}
        y={(y0 + y1) / 2 - 16}
        fontSize={15}
        color={CIVIC}
        w={78}
      />

      <SvgMath
        latex={`d^{2} = ${numStr(w)}^{2} + ${numStr(h)}^{2} = ${total}`}
        x={318}
        y={62}
        fontSize={15}
        color={LABEL}
        w={220}
      />
      <SvgMath
        latex={`${total} = ${a * a} \\times ${b}`}
        x={318}
        y={104}
        fontSize={15}
        color={SIGNAL}
        w={220}
      />
      <SvgMath
        latex={`d = \\sqrt{${total}} = ${a}\\sqrt{${b}}`}
        x={318}
        y={146}
        fontSize={16}
        color={CIVIC}
        w={220}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Two similar triangles                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The two triangles side by side, with the corresponding pairs marked and the factor between
 * them written on the arrow. Both are drawn from ONE outline scaled by the factor, so the
 * picture is similar in the way the words claim: a figure whose two triangles differed in
 * shape would be arguing against its own caption.
 *
 * The figure is TWO COLUMNS, and everything in a column shares its centre: the triangle and the
 * statement about it. Naming the centres here is what keeps the two in step, since the pair used
 * to be positioned by two different rules and drifted apart on every draw.
 */
const FIRST_COLUMN = 112;
const SECOND_COLUMN = 320;

function SimilarTrianglesWorked({
  firstSide,
  secondSide,
  otherFirst,
  otherSecond,
  scale,
}: {
  firstSide: number;
  secondSide: number;
  otherFirst: number;
  otherSecond: number;
  scale: number;
}): JSX.Element {
  // Both triangles are the SAME two sides meeting at the same angle, each drawn at its own
  // measured lengths, so the pair really is similar and each labelled side really is as long
  // as its label says. Sizing off a single unit is what carries that across the two.
  const unit = 92 / Math.max(firstSide, secondSide, otherFirst, otherSecond);
  const lean = (70 * Math.PI) / 180;

  /**
   * How wide a triangle's outline comes out, in user units.
   *
   * The foot is the leftmost point (both the apex and the far corner lie to its right at this
   * lean), so the width is whichever of those two reaches furthest.
   */
  const spread = (side: number, base: number) =>
    Math.max(side * unit * Math.cos(lean), base * unit);

  const shape = (side: number, base: number, at: number, ink: string) => {
    const foot = { x: at, y: 158 };
    const apex = {
      x: at + side * unit * Math.cos(lean),
      y: 158 - side * unit * Math.sin(lean),
    };
    const far = { x: at + base * unit, y: 158 };
    return (
      <g key={`tri-${at}`}>
        <path
          d={`M ${foot.x} ${foot.y} L ${apex.x} ${apex.y} L ${far.x} ${far.y} Z`}
          fill="none"
          stroke={LINE}
          strokeWidth={1.6}
        />
        <SvgMath
          latex={numStr(side)}
          x={(foot.x + apex.x) / 2 - 22}
          y={(foot.y + apex.y) / 2}
          fontSize={14}
          color={ink}
          w={52}
        />
        <SvgMath
          latex={numStr(base)}
          x={(foot.x + far.x) / 2}
          y={176}
          fontSize={14}
          color={ink}
          w={60}
        />
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={`Two similar triangles, the second a factor of ${numStr(scale)} times the first, so a side of ${spoken(secondSide)} becomes ${numStr(otherSecond)}`}
    >
      <title>
        Two similar triangles and the one factor between every corresponding pair
      </title>

      {/* Each triangle CENTRED on the column its own equation is centred on, rather than
          started at a fixed left edge. The two are drawn from one unit and the scale factor
          is a draw, so their widths differ by up to seven times between them and a shared
          left edge puts each one a different distance from the ratio that names it. The
          reader is being asked to match a triangle to a statement about it, and the figure
          was placing both of them well to the left of theirs. */}
      {shape(
        firstSide,
        secondSide,
        FIRST_COLUMN - spread(firstSide, secondSide) / 2,
        LABEL,
      )}
      {shape(
        otherFirst,
        otherSecond,
        SECOND_COLUMN - spread(otherFirst, otherSecond) / 2,
        CIVIC,
      )}

      <line x1={176} y1={92} x2={224} y2={92} stroke={SIGNAL} strokeWidth={1.6} />
      <path d="M 224 92 L 216 88 L 216 96 Z" fill={SIGNAL} />
      <SvgMath
        latex={`\\times ${numStr(scale)}`}
        x={200}
        y={72}
        fontSize={14}
        color={SIGNAL}
        w={72}
      />

      <SvgMath
        latex={`\\tfrac{${numStr(otherFirst)}}{${numStr(firstSide)}} = ${numStr(scale)}`}
        x={FIRST_COLUMN}
        y={30}
        fontSize={15}
        color={SIGNAL}
        w={180}
      />
      <SvgMath
        latex={`${numStr(secondSide)} \\times ${numStr(scale)} = ${numStr(otherSecond)}`}
        x={SECOND_COLUMN}
        y={30}
        fontSize={15}
        color={CIVIC}
        w={200}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const GEO1_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d10.geo1.hypotenuse.l1": {
    Svg: ({ a = 3, b = 4, c = 5 }) => (
      <RightTriangleWorked
        legUp={a}
        legBase={b}
        hyp={c}
        answered="hyp"
        rows={[
          "a^{2} + b^{2} = c^{2}",
          `${a}^{2} + ${b}^{2} = ${a * a + b * b}`,
          `c = \\sqrt{${a * a + b * b}} = ${c}`,
        ]}
        ariaLabel={`A right triangle with legs of ${spoken(a)} and ${spoken(b)} and a hypotenuse of ${spoken(c)}`}
        title="The two legs squared, added, and rooted"
      />
    ),
    caption: ({ a = 3, b = 4, c = 5 }) =>
      `The right angle sits between the legs, so the third side is the hypotenuse: $${a}^{2} + ${b}^{2} = ${a * a + b * b}$, and the side whose square is $${a * a + b * b}$ measures $${c}$ meters.`,
  },

  "d10.geo1.leg.l2": {
    Svg: ({ known = 4, missing = 3, c = 5 }) => (
      <RightTriangleWorked
        legUp={missing}
        legBase={known}
        hyp={c}
        answered="up"
        rows={[
          "a^{2} + b^{2} = c^{2}",
          `${c}^{2} - ${known}^{2} = ${c * c - known * known}`,
          `a = \\sqrt{${c * c - known * known}} = ${missing}`,
        ]}
        ariaLabel={`A right triangle with a hypotenuse of ${spoken(c)}, a known leg of ${spoken(known)}, and a missing leg of ${spoken(missing)}`}
        title="The hypotenuse's square is the total, so the known leg comes off it"
      />
    ),
    caption: ({ known = 4, missing = 3, c = 5 }) =>
      `The hypotenuse's square is the TOTAL here, not a part, so the known leg's square comes off it: $${c * c} - ${known * known} = ${c * c - known * known}$, and the missing leg measures $${missing}$ meters.`,
  },

  "d10.geo1.angle-third.l2": {
    Svg: ({ triangle = 1, first = 60, second = 60, answer = 60 }) =>
      triangle === 1 ? (
        <TriangleAnglesWorked first={first} second={second} answer={answer} />
      ) : (
        <StraightLineAnglesWorked first={first} answer={answer} />
      ),
    caption: ({ triangle = 1, first = 60, second = 60, answer = 60 }) =>
      triangle === 1
        ? `The three angles of a triangle fill $180^{\\circ}$, and the two given ones use $${first + second}^{\\circ}$ of it, so the third measures $${answer}^{\\circ}$.`
        : `Two angles filling a straight line are supplementary, so together they make $180^{\\circ}$ and the second measures $${answer}^{\\circ}$.`,
  },

  "d10.geo1.exact-diagonal.l3": {
    Svg: ({ w = 2, h = 4, a = 2, b = 5, total = 20 }) => (
      <RectangleDiagonalWorked w={w} h={h} a={a} b={b} total={total} />
    ),
    caption: ({ w = 2, h = 4, a = 2, b = 5, total = 20 }) =>
      `The diagonal is the hypotenuse of a right triangle whose legs are the sides, so $${w}^{2} + ${h}^{2} = ${total}$. That is not a perfect square, and its largest square factor is $${a * a}$, which leaves $${a}\\sqrt{${b}}$.`,
  },

  "d10.geo1.similar-side.l3": {
    Svg: ({
      smallFirst = 4,
      smallSecond = 6,
      largeFirst = 6,
      largeSecond = 9,
      scale = 1.5,
    }) => (
      <SimilarTrianglesWorked
        firstSide={smallFirst}
        secondSide={smallSecond}
        otherFirst={largeFirst}
        otherSecond={largeSecond}
        scale={scale}
      />
    ),
    caption: ({
      smallFirst = 4,
      smallSecond = 6,
      largeSecond = 9,
      largeFirst = 6,
      scale = 1.5,
    }) =>
      `The pair you know both of fixes the scale factor at $${numStr(largeFirst)} \\div ${numStr(smallFirst)} = ${numStr(scale)}$, and every corresponding pair takes it, so $${numStr(smallSecond)}$ meters becomes $${numStr(largeSecond)}$ meters.`,
  },
};
