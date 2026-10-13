/**
 * Worked-solution figures for the D10 GEO.2 practice templates (area, perimeter, the volume
 * of a prism and of a cylinder, and the surface area of a box).
 *
 * Every entry is a labelled FIGURE rather than a column of steps, because the mistake this
 * node produces is almost never arithmetic: it is answering a different question from the one
 * asked. Covering, bounding and filling are three readings of the same three numbers, so the
 * figure's job is to show WHICH part of the solid the answer counts. The rectangle is shaded
 * over the surface it measures; the perimeter figure inks the boundary and nothing inside it;
 * the prism is drawn as a stack of one floor; the box's faces are unfolded flat, where the
 * total is visibly a sum of six rectangles rather than a product of three numbers.
 *
 * Each figure is drawn TO THE SHAPE ITS NUMBERS DESCRIBE, scaled off its own longest
 * dimension, so a $3$ by $14$ slab does not arrive under the outline of a square.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for
 * each, and recomputes what `generate()` computed by the same route.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL, SIGNAL_DEEP, SOFT, SvgMath } from "../svgKit";
import { numStr, spoken, type WorkedSolutionVisual } from "../workedKit";

/** A wash, so a measured region can be tinted without borrowing the correctness palette. */
function wash(colour: string, percent: number): string {
  return `color-mix(in srgb, ${colour} ${percent}%, var(--paper))`;
}

/** The stack of equation rows every figure carries down its right-hand side. */
function Rows({
  rows,
  x = 320,
  top = 62,
  gap = 40,
}: {
  rows: readonly string[];
  x?: number;
  top?: number;
  gap?: number;
}): JSX.Element {
  return (
    <>
      {rows.map((latex, index) => (
        <SvgMath
          key={latex}
          latex={latex}
          x={x}
          y={top + index * gap}
          fontSize={index === rows.length - 1 ? 16 : 15}
          color={index === rows.length - 1 ? CIVIC : LABEL}
          w={220}
        />
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* The rectangle, shaded over the surface its answer counts                    */
/* -------------------------------------------------------------------------- */

function RectangleAreaWorked({ w, h }: { w: number; h: number }): JSX.Element {
  const unit = 112 / Math.max(w, h);
  const x0 = 56;
  const y1 = 162;
  const boxW = w * unit;
  const boxH = h * unit;
  const y0 = y1 - boxH;

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={`A rectangle ${spoken(w)} meters by ${spoken(h)} meters, shaded over the surface it covers`}
    >
      <title>The area of a rectangle is the surface inside it</title>

      <rect
        x={x0}
        y={y0}
        width={boxW}
        height={boxH}
        fill={wash(SIGNAL, 16)}
        stroke={LINE}
        strokeWidth={1.6}
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
        x={x0 - 22}
        y={(y0 + y1) / 2}
        fontSize={15}
        color={LABEL}
        w={48}
      />
      <text x={x0 + boxW / 2} y={y0 - 10} textAnchor="middle" fontSize={10} fill={SOFT}>
        the surface inside
      </text>

      <Rows
        rows={[`A = ${numStr(w)} \\times ${numStr(h)}`, `A = ${numStr(w * h)}`]}
        top={78}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The boundary, inked and nothing else                                        */
/* -------------------------------------------------------------------------- */

/**
 * The perimeter figure. On the composite draw the removed corner is left dashed IN PLACE,
 * because the point the template makes is that the two new edges are exactly as long as the
 * two they replaced, and that claim is only visible while the missing corner is still on the
 * page.
 */
function PerimeterWorked({
  w,
  h,
  cutW,
  cutH,
  composite,
}: {
  w: number;
  h: number;
  cutW: number;
  cutH: number;
  composite: boolean;
}): JSX.Element {
  const unit = 112 / Math.max(w, h);
  const x0 = 56;
  const y1 = 162;
  const boxW = w * unit;
  const boxH = h * unit;
  const y0 = y1 - boxH;
  const cx = x0 + (w - cutW) * unit;
  const cy = y0 + cutH * unit;
  const outline = composite
    ? `M ${x0} ${y1} L ${x0 + boxW} ${y1} L ${x0 + boxW} ${cy} L ${cx} ${cy} L ${cx} ${y0} L ${x0} ${y0} Z`
    : `M ${x0} ${y1} L ${x0 + boxW} ${y1} L ${x0 + boxW} ${y0} L ${x0} ${y0} Z`;

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={
        composite
          ? `An L-shaped courtyard cut from a rectangle ${spoken(w)} by ${spoken(h)}, with its boundary inked`
          : `A rectangle ${spoken(w)} meters by ${spoken(h)} meters with its boundary inked`
      }
    >
      <title>The perimeter is the distance round the edge</title>

      {composite && (
        <rect
          x={cx}
          y={y0}
          width={boxW - (cx - x0)}
          height={cy - y0}
          fill="none"
          stroke={SOFT}
          strokeWidth={1.2}
          strokeDasharray="6 4"
        />
      )}
      <path d={outline} fill="none" stroke={SIGNAL_DEEP} strokeWidth={2.6} />
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
        x={x0 - 22}
        y={(y0 + y1) / 2}
        fontSize={15}
        color={LABEL}
        w={48}
      />

      <Rows
        rows={[`P = 2 \\times (${numStr(w)} + ${numStr(h)})`, `P = ${numStr(2 * (w + h))}`]}
        top={78}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The prism, drawn as one floor stacked                                       */
/* -------------------------------------------------------------------------- */

function PrismVolumeWorked({ l, w, d }: { l: number; w: number; d: number }): JSX.Element {
  const unit = 92 / Math.max(l, d);
  const x0 = 62;
  const y1 = 158;
  const front = l * unit;
  const tall = d * unit;
  const y0 = y1 - tall;
  // One unit of width, taken into the page. Capped so a wide tank does not run off the plate.
  const step = Math.min(9, 54 / Math.max(w, 1));
  const ox = w * step;
  const oy = -w * step * 0.62;

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={`A rectangular tank ${spoken(l)} meters long, ${spoken(w)} meters wide and ${spoken(d)} meters deep`}
    >
      <title>A prism holds one floor, stacked to its depth</title>

      <polygon
        points={`${x0},${y0} ${x0 + front},${y0} ${x0 + front + ox},${y0 + oy} ${x0 + ox},${y0 + oy}`}
        fill={wash(SOFT, 10)}
        stroke={LINE}
        strokeWidth={1.3}
      />
      <polygon
        points={`${x0 + front},${y0} ${x0 + front + ox},${y0 + oy} ${x0 + front + ox},${y1 + oy} ${x0 + front},${y1}`}
        fill={wash(SOFT, 16)}
        stroke={LINE}
        strokeWidth={1.3}
      />
      {/* The floor, tinted where the first layer of cubes lies. */}
      <polygon
        points={`${x0},${y1} ${x0 + front},${y1} ${x0 + front + ox},${y1 + oy} ${x0 + ox},${y1 + oy}`}
        fill={wash(SIGNAL, 22)}
        stroke={SIGNAL_DEEP}
        strokeWidth={1.3}
      />
      <rect
        x={x0}
        y={y0}
        width={front}
        height={tall}
        fill="none"
        stroke={LINE}
        strokeWidth={1.8}
      />

      <SvgMath
        latex={numStr(l)}
        x={x0 + front / 2}
        y={y1 + 20}
        fontSize={14}
        color={LABEL}
        w={60}
      />
      <SvgMath
        latex={numStr(d)}
        x={x0 - 20}
        y={(y0 + y1) / 2}
        fontSize={14}
        color={LABEL}
        w={48}
      />
      <SvgMath
        latex={numStr(w)}
        x={x0 + front + ox / 2 + 16}
        y={y1 + oy / 2 + 10}
        fontSize={14}
        color={SOFT}
        w={48}
      />

      <Rows
        rows={[
          `${numStr(l)} \\times ${numStr(w)} = ${numStr(l * w)}`,
          `V = ${numStr(l * w)} \\times ${numStr(d)}`,
          `V = ${numStr(l * w * d)}`,
        ]}
        top={54}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The cylinder, whose floor is a circle                                       */
/* -------------------------------------------------------------------------- */

function CylinderVolumeWorked({ r, h }: { r: number; h: number }): JSX.Element {
  const unit = Math.min(46 / r, 96 / h);
  const rx = r * unit;
  const ry = Math.max(8, rx * 0.3);
  const cx = 130;
  const y0 = 48;
  const tall = h * unit;
  const y1 = y0 + tall;

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={`A cylindrical shaft of radius ${spoken(r)} meters and depth ${spoken(h)} meters`}
    >
      <title>A cylinder holds its circular floor, stacked to its depth</title>

      <path
        d={`M ${cx - rx} ${y0} L ${cx - rx} ${y1} A ${rx} ${ry} 0 0 0 ${cx + rx} ${y1} L ${cx + rx} ${y0}`}
        fill={wash(SOFT, 10)}
        stroke={LINE}
        strokeWidth={1.6}
      />
      <ellipse
        cx={cx}
        cy={y1}
        rx={rx}
        ry={ry}
        fill={wash(SIGNAL, 22)}
        stroke={SIGNAL_DEEP}
        strokeWidth={1.3}
      />
      <ellipse
        cx={cx}
        cy={y0}
        rx={rx}
        ry={ry}
        fill={wash(SOFT, 6)}
        stroke={LINE}
        strokeWidth={1.6}
      />
      <line
        x1={cx}
        y1={y0}
        x2={cx + rx}
        y2={y0}
        stroke={SIGNAL_DEEP}
        strokeWidth={1.4}
        strokeDasharray="6 4"
      />
      <SvgMath
        latex={numStr(r)}
        x={cx + rx / 2}
        y={y0 - 14}
        fontSize={14}
        color={SIGNAL_DEEP}
        plate
        w={48}
      />
      <line
        x1={cx + rx + 22}
        y1={y0}
        x2={cx + rx + 22}
        y2={y1}
        stroke={SOFT}
        strokeWidth={1.2}
      />
      <SvgMath
        latex={numStr(h)}
        x={cx + rx + 42}
        y={(y0 + y1) / 2}
        fontSize={14}
        color={LABEL}
        w={48}
      />

      <Rows
        rows={[
          `\\pi \\times ${numStr(r)}^{2} = ${numStr(r * r)}\\pi`,
          `V = ${numStr(r * r)}\\pi \\times ${numStr(h)}`,
          `V = ${numStr(r * r * h)}\\pi`,
        ]}
        top={54}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The box, unfolded                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The net of the box, with every face carrying its own area.
 *
 * Unfolding is the whole argument: the six numbers are on the page at once, so the total is
 * visibly their sum, and the pairing (two of each size) is something the learner can see
 * rather than take from a formula.
 *
 * `openTop` is GEO.2's CHECK rather than a variation on the practice item. That question lines
 * a cistern standing open, so the count is five faces and the sixth has to be visibly NOT
 * counted: unfolded, the lid is drawn as an empty dashed outline and the sum below names the
 * five it does add. A figure that simply left the lid off the drawing would be a picture of a
 * different solid, and one that drew it filled would be a picture of the mistake.
 */
export function BoxNetWorked({
  l,
  w,
  d,
  openTop = false,
}: {
  l: number;
  w: number;
  d: number;
  openTop?: boolean;
}): JSX.Element {
  const unit = Math.min(150 / (l + 2 * d), 152 / (2 * d + 2 * w));
  const netW = (l + 2 * d) * unit;
  const netH = (2 * d + 2 * w) * unit;
  const x0 = 30 + (170 - netW) / 2;
  const y0 = 20 + (160 - netH) / 2;
  const cells: readonly {
    key: string;
    x: number;
    y: number;
    across: number;
    down: number;
  }[] = [
    { key: "back", x: d, y: 0, across: l, down: d },
    { key: "left", x: 0, y: d, across: d, down: w },
    { key: "floor", x: d, y: d, across: l, down: w },
    { key: "right", x: d + l, y: d, across: d, down: w },
    { key: "front", x: d, y: d + w, across: l, down: d },
    { key: "lid", x: d, y: 2 * d + w, across: l, down: w },
  ];
  const pairSum = l * w + l * d + w * d;
  const openTotal = l * w + 2 * l * d + 2 * w * d;

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={
        openTop
          ? `The net of an open cistern ${spoken(l)} by ${spoken(w)} by ${spoken(d)}, laid out as five lined rectangles with the top left bare`
          : `The net of a box ${spoken(l)} by ${spoken(w)} by ${spoken(d)}, laid out as six rectangles`
      }
    >
      <title>
        {openTop
          ? "The five lined faces of an open cistern, unfolded flat"
          : "The six faces of a box, unfolded flat"}
      </title>

      {cells.map((cell) => {
        const bare = openTop && cell.key === "lid";
        return (
          <g key={cell.key}>
            <rect
              x={x0 + cell.x * unit}
              y={y0 + cell.y * unit}
              width={cell.across * unit}
              height={cell.down * unit}
              fill={bare ? "none" : wash(SIGNAL, 12)}
              stroke={bare ? SOFT : LINE}
              strokeWidth={1.3}
              strokeDasharray={bare ? "5 4" : undefined}
            />
            <SvgMath
              latex={bare ? "\\text{open}" : numStr(cell.across * cell.down)}
              x={x0 + (cell.x + cell.across / 2) * unit}
              y={y0 + (cell.y + cell.down / 2) * unit}
              fontSize={12}
              color={bare ? SOFT : LABEL}
              w={56}
            />
          </g>
        );
      })}

      <Rows
        rows={
          openTop
            ? [
                `${numStr(l * w)} + ${numStr(2 * l * d)} + ${numStr(2 * w * d)}`,
                `S = ${numStr(openTotal)}`,
              ]
            : [
                `${numStr(l * w)} + ${numStr(l * d)} + ${numStr(w * d)} = ${numStr(pairSum)}`,
                `S = 2 \\times ${numStr(pairSum)}`,
                `S = ${numStr(2 * pairSum)}`,
              ]
        }
        top={54}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const GEO2_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d10.geo2.rect-area.l1": {
    Svg: ({ w = 6, h = 4 }) => <RectangleAreaWorked w={w} h={h} />,
    caption: ({ w = 6, h = 4 }) =>
      `Area counts the surface inside the figure, so the two sides multiply: $${numStr(w)} \\times ${numStr(h)} = ${numStr(w * h)}$ square meters.`,
  },

  "d10.geo2.perimeter.l2": {
    Svg: ({ composite = 0, w = 12, h = 8, cutW = 4, cutH = 3 }) => (
      <PerimeterWorked w={w} h={h} cutW={cutW} cutH={cutH} composite={composite === 1} />
    ),
    caption: ({ composite = 0, w = 12, h = 8 }) =>
      composite === 1
        ? `Perimeter measures the boundary, and the two edges of the notch are exactly as long as the two pieces of rectangle they replaced, so the boundary is the full rectangle's: $2 \\times (${numStr(w)} + ${numStr(h)}) = ${numStr(2 * (w + h))}$ meters.`
        : `Perimeter measures the boundary rather than the surface inside it, and opposite sides are equal: $2 \\times (${numStr(w)} + ${numStr(h)}) = ${numStr(2 * (w + h))}$ meters.`,
  },

  "d10.geo2.prism-volume.l2": {
    Svg: ({ l = 8, w = 5, d = 3 }) => <PrismVolumeWorked l={l} w={w} d={d} />,
    caption: ({ l = 8, w = 5, d = 3 }) =>
      `One layer of cubes covering the floor is $${numStr(l)} \\times ${numStr(w)} = ${numStr(l * w)}$ square meters, and the depth says how many such layers stack: $${numStr(l * w)} \\times ${numStr(d)} = ${numStr(l * w * d)}$ cubic meters.`,
  },

  "d10.geo2.cylinder-volume-exact.l3": {
    Svg: ({ r = 3, h = 5 }) => <CylinderVolumeWorked r={r} h={h} />,
    caption: ({ r = 3, h = 5 }) =>
      `The floor is a circle, so its area is $\\pi \\times ${numStr(r)}^{2} = ${numStr(r * r)}\\pi$ square meters, and stacking it to the depth gives $${numStr(r * r)}\\pi \\times ${numStr(h)} = ${numStr(r * r * h)}\\pi$ cubic meters. Left in terms of $\\pi$, that is the exact volume.`,
  },

  "d10.geo2.prism-surface-area.l3": {
    Svg: ({ l = 7, w = 4, d = 3 }) => <BoxNetWorked l={l} w={w} d={d} />,
    caption: ({ l = 7, w = 4, d = 3 }) =>
      `Unfolded, the box is six rectangles in three matching pairs, so one of each pair adds to $${numStr(l * w)} + ${numStr(l * d)} + ${numStr(w * d)} = ${numStr(l * w + l * d + w * d)}$ square meters and the whole surface is twice that: $${numStr(2 * (l * w + l * d + w * d))}$ square meters.`,
  },
};
