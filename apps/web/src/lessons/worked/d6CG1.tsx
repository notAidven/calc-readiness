/**
 * Worked-solution figures for D6's CG.1 practice templates: the coordinate plane.
 *
 * All five are PLANES rather than columns, which is unusual for a node in this tree and is the
 * right answer for exactly this node: every one of its five questions is answered by a POSITION
 * or by a LENGTH ON the plane, and the mistake each one is built to catch is spatial. A learner
 * who reads two measurements as magnitudes lands in the wrong quadrant; one who subtracts the
 * midpoint from the known end instead of the other way round lands on a point reflected through
 * the wrong one; one who takes an intercept to be the number the division gave reports a
 * coordinate where a point was asked for. A column of algebra can state each correction and a
 * plane can show it, and the marks are already what the prompt talks about.
 *
 * The two distance shapes turn `square` on, because there the SHAPE is the claim: the legs are
 * at right angles to each other or Pythagoras does not apply, and a plane that stretches one
 * axis draws a triangle whose right angle is visibly not one.
 *
 * Four of the five turn `grid` on, and the exception is deliberate. A leg counted off in squares,
 * a walk taken across then up, a midpoint read as a step: all three arguments are about UNITS, so
 * the units have to be on the picture, and the captions here say so in words ("the two dashed
 * legs run along the grid"). `intercept.l2` is the one whose argument is not about units — it is
 * about which coordinate of a crossing is the zero — so it gets the two axes and nothing else.
 *
 * Every figure recomputes from its own `template_params`, and every param has a default, so a
 * partial params record degrades to a drawable figure rather than throwing.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, SIGNAL, SOFT } from "../svgKit";
import { spoken, type WorkedSolutionVisual } from "../workedKit";
import { D6Chart, PLOT_ASPECT, pointTex, sp } from "./d6Kit";

/** Greatest common divisor, positive, as CG.1's own generator computes it. */
function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/**
 * The standard-form coefficients of the line crossing at `(xi, 0)` and `(0, yi)`.
 *
 * The same derivation the item bank runs, because the figure has to print the equation the
 * prompt printed and the params record only the two intercepts.
 */
function lineCoefficients(xi: number, yi: number): { a: number; b: number; c: number } {
  const c = (Math.abs(xi) * Math.abs(yi)) / gcd(xi, yi);
  return { a: c / xi, b: c / yi, c };
}

/** A window with a margin proportional to the spread, and a floor under it. */
function windowAround(values: readonly number[]): { min: number; max: number } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(2, Math.round((hi - lo) * 0.22));
  return { min: lo - pad, max: hi + pad };
}

/**
 * A window shaped to the PLOT BOX, for a figure drawn on square units.
 *
 * `square` draws at the smaller of the two scales, so a window that is not the box's own
 * ratio is scaled by its tighter axis and the surplus on the other one comes out as blank
 * paper INSIDE the frame. The commonest distance draw is a 3-by-4 triangle: padded per axis
 * it made a 7-by-8 window against a box that is twice as wide as it is tall, so the plane was
 * drawn across 44% of the width with 28% of the box empty at each end.
 *
 * Padding the data proportionally and then widening whichever axis is short of the box's
 * ratio makes the two scales equal, which spends the whole frame on plane and grows the
 * triangle by a third rather than growing the margins. The pad itself has a one-unit floor
 * rather than the two `windowAround` uses, for the same reason the break line's does: on the
 * legs this template draws, a two-unit floor is most of the window.
 */
function planeWindow(
  xs: readonly number[],
  ys: readonly number[],
): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const padded = (values: readonly number[]): { min: number; max: number } => {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max(1, (hi - lo) * 0.15);
    return { min: lo - pad, max: hi + pad };
  };
  const widened = (
    window: { min: number; max: number },
    span: number,
  ): { min: number; max: number } => {
    const mid = (window.min + window.max) / 2;
    return { min: mid - span / 2, max: mid + span / 2 };
  };
  const x = padded(xs);
  const y = padded(ys);
  const xSpan = x.max - x.min;
  const ySpan = y.max - y.min;
  if (xSpan < ySpan * PLOT_ASPECT) {
    const wide = widened(x, ySpan * PLOT_ASPECT);
    return { xMin: wide.min, xMax: wide.max, yMin: y.min, yMax: y.max };
  }
  const tall = widened(y, xSpan / PLOT_ASPECT);
  return { xMin: x.min, xMax: x.max, yMin: tall.min, yMax: tall.max };
}

export const CG1_PRACTICE_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** Across then up from the bench mark, with the two counts drawn as the walk they describe. */
  "d6.cg1.plot-offset.l1": {
    Svg: (params): JSX.Element => {
      const ax = params.ax ?? 4;
      const ay = params.ay ?? 3;
      const x = (params.ex ?? 0) === 1 ? -ax : ax;
      const y = (params.ey ?? 0) === 1 ? -ay : ay;
      const xWin = windowAround([0, x]);
      const yWin = windowAround([0, y]);
      return (
        <D6Chart
          xMin={xWin.min}
          xMax={xWin.max}
          yMin={yWin.min}
          yMax={yWin.max}
          square
          grid
          paths={[
            {
              points: [
                [0, 0],
                [x, 0],
                [x, y],
              ],
              color: SOFT,
              dashed: true,
            },
          ]}
          dots={[
            { x: 0, y: 0, color: SOFT, hollow: true },
            { x, y, color: CIVIC },
          ]}
          labels={[
            {
              x,
              y,
              latex: pointTex(x, y),
              color: CIVIC,
              dx: x < 0 ? 1 : -1,
              dy: y < 0 ? 1 : -1,
            },
            {
              x: x / 2,
              y: 0,
              latex: `${x}`,
              color: SOFT,
              dx: 0,
              dy: y < 0 ? -1 : 1,
            },
            // The climb, numbered the same way the walk across it is. Without it the figure
            // states one of the two counts the pair is made of and leaves the other to be
            // counted off the grid, which is the half of the answer a learner reading two
            // measurements as magnitudes gets wrong.
            {
              x,
              y: y / 2,
              latex: `${y}`,
              color: SOFT,
              dx: x < 0 ? -1 : 1,
              dy: 0,
            },
          ]}
          xTicks={[x]}
          yTicks={[y]}
          footers={[pointTex(x, y)]}
          title="The walk from the bench mark: so far across, then so far up"
          ariaLabel={`A point reached by counting ${spoken(x)} across from the origin and then ${spoken(y)} up, written as ${spoken(x)} comma ${spoken(y)}`}
        />
      );
    },
    caption: (params) => {
      const across = (params.ex ?? 0) === 1 ? "left" : "right";
      const up = (params.ey ?? 0) === 1 ? "below" : "above";
      return `The dashed walk goes across first and up second, which is the order the pair is written in. ${across === "left" ? "Left" : "Right"} counts ${across === "left" ? "negative" : "positive"} and ${up} counts ${up === "below" ? "negative" : "positive"}, so both signs are settled before anything is written down.`;
    },
  },

  /** The line, both its crossings, and only the asked one claimed. */
  "d6.cg1.intercept.l2": {
    Svg: (params): JSX.Element => {
      const xi = params.xi ?? 6;
      const yi = params.yi ?? 4;
      const which = params.which ?? 0;
      const { a, b, c } = lineCoefficients(xi, yi);
      // Run the line a quarter past each crossing, so it reads as a line rather than as the
      // segment between them, which is a different CG.1 question two templates down.
      const reach = 0.3;
      const xWin = windowAround([0, xi, -reach * xi]);
      const yWin = windowAround([0, yi, -reach * yi]);
      const asked: readonly [number, number] = which === 0 ? [xi, 0] : [0, yi];
      const other: readonly [number, number] = which === 0 ? [0, yi] : [xi, 0];
      return (
        <D6Chart
          xMin={xWin.min}
          xMax={xWin.max}
          yMin={yWin.min}
          yMax={yWin.max}
          paths={[
            {
              points: [
                [xi * (1 + reach), -reach * yi],
                [-reach * xi, yi * (1 + reach)],
              ],
              color: SIGNAL,
            },
          ]}
          dots={[
            { x: other[0], y: other[1], color: SOFT, hollow: true },
            { x: asked[0], y: asked[1], color: CIVIC },
          ]}
          labels={[
            {
              x: asked[0],
              y: asked[1],
              latex: pointTex(asked[0], asked[1]),
              color: CIVIC,
              dx: which === 0 ? 0 : 1,
              dy: which === 0 ? 1 : 0,
            },
          ]}
          xTicks={[xi]}
          yTicks={[yi]}
          footers={[
            which === 0 ? `${a}x = ${c}` : `${b}y = ${c}`,
            pointTex(asked[0], asked[1]),
          ]}
          title="A line in standard form and the axis crossing that was asked for"
          ariaLabel={`The line crossing the horizontal axis at ${spoken(xi)} and the vertical axis at ${spoken(yi)}, with the ${which === 0 ? "horizontal" : "vertical"} crossing marked as the answer`}
        />
      );
    },
    caption: (params) => {
      const which = params.which ?? 0;
      const zeroed = which === 0 ? "y" : "x";
      const kept = which === 0 ? "x" : "y";
      return `On the ${which === 0 ? "horizontal" : "vertical"} axis $${zeroed} = 0$, so putting that zero into the equation drops a whole term and leaves one division for $${kept}$. The hollow mark is the other crossing, which the question did not ask for, and the answer is the POINT rather than the number the division gave.`;
    },
  },

  /** One end, the marked centre, and the arrow on to the end that was wanted. */
  "d6.cg1.other-endpoint.l2": {
    Svg: (params): JSX.Element => {
      const ax = params.ax ?? -2;
      const ay = params.ay ?? 3;
      const bx = params.bx ?? 6;
      const by = params.by ?? -1;
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const xWin = windowAround([ax, bx]);
      const yWin = windowAround([ay, by]);
      return (
        <D6Chart
          xMin={xWin.min}
          xMax={xWin.max}
          yMin={yWin.min}
          yMax={yWin.max}
          square
          grid
          paths={[
            {
              points: [
                [ax, ay],
                [mx, my],
              ],
              color: SOFT,
            },
          ]}
          arrows={[{ from: [mx, my], to: [bx, by], color: CIVIC }]}
          dots={[
            { x: ax, y: ay, color: SOFT },
            { x: mx, y: my, color: SIGNAL },
            { x: bx, y: by, color: CIVIC },
          ]}
          labels={[
            {
              x: bx,
              y: by,
              latex: pointTex(bx, by),
              color: CIVIC,
              dx: bx < mx ? -1 : 1,
              dy: by < my ? 1 : -1,
            },
            { x: mx, y: my, latex: pointTex(mx, my), color: SIGNAL, dx: 0, dy: -1 },
          ]}
          xTicks={[ax, bx]}
          yTicks={[ay, by]}
          footers={[
            `2 \\times ${sp(mx)} - ${sp(ax)} = ${bx}`,
            `2 \\times ${sp(my)} - ${sp(ay)} = ${by}`,
            pointTex(bx, by),
          ]}
          title="One end, the centre between the ends, and the other end stepped out from it"
          ariaLabel={`The known end at ${spoken(ax)} comma ${spoken(ay)} and the centre at ${spoken(mx)} comma ${spoken(my)}, with the far end at ${spoken(bx)} comma ${spoken(by)}`}
        />
      );
    },
    caption: () =>
      "The centre averages the two ends one coordinate at a time, so the ends add up to TWICE the centre. Doubling the centre and taking the known end away is the average run backwards; taking the centre away from the known end instead reflects the point through the wrong one, which is the arrow pointing back the way it came.",
  },

  /** The right triangle the two points make with the grid, and the leg lengths on it. */
  "d6.cg1.distance.l3": {
    Svg: (params): JSX.Element => {
      const x1 = params.x1 ?? -3;
      const y1 = params.y1 ?? 2;
      const x2 = params.x2 ?? 1;
      const y2 = params.y2 ?? 5;
      const legX = Math.abs(x2 - x1);
      const legY = Math.abs(y2 - y1);
      const square = legX * legX + legY * legY;
      const distance = Math.round(Math.sqrt(square));
      const win = planeWindow([x1, x2], [y1, y2]);
      return (
        <D6Chart
          xMin={win.xMin}
          xMax={win.xMax}
          yMin={win.yMin}
          yMax={win.yMax}
          square
          grid
          paths={[
            {
              points: [
                [x1, y1],
                [x2, y1],
                [x2, y2],
              ],
              color: SOFT,
              dashed: true,
            },
            {
              points: [
                [x1, y1],
                [x2, y2],
              ],
              color: SIGNAL,
            },
          ]}
          dots={[
            { x: x1, y: y1, color: SOFT },
            { x: x2, y: y2, color: SOFT },
          ]}
          labels={[
            {
              x: (x1 + x2) / 2,
              y: y1,
              latex: `${legX}`,
              color: BRICK,
              dx: 0,
              dy: y2 > y1 ? 1 : -1,
            },
            {
              x: x2,
              y: (y1 + y2) / 2,
              latex: `${legY}`,
              color: BRICK,
              dx: x2 > x1 ? -1 : 1,
              dy: 0,
            },
          ]}
          xTicks={[x1, x2]}
          yTicks={[y1, y2]}
          footers={[
            `${legX}^{2} + ${legY}^{2} = ${legX * legX} + ${legY * legY} = ${square}`,
            `\\sqrt{${square}} = ${distance}`,
          ]}
          title="Two plotted points, the right triangle they make with the grid, and the direct route"
          ariaLabel={`A right triangle with legs ${spoken(legX)} and ${spoken(legY)} whose hypotenuse joins ${spoken(x1)} comma ${spoken(y1)} to ${spoken(x2)} comma ${spoken(y2)} and measures ${spoken(distance)}`}
        />
      );
    },
    caption: () =>
      "The two dashed legs run along the grid, so each one is just how far apart a pair of coordinates is. A gap is a LENGTH, so it counts positive whichever order the subtraction went in, and squaring removes the sign anyway. The solid route is the hypotenuse.",
  },

  /** Both crossings produced first, then the triangle they make with the bench mark. */
  "d6.cg1.intercept-span.l3": {
    Svg: (params): JSX.Element => {
      const xi = params.xi ?? 8;
      const yi = params.yi ?? -6;
      const legX = Math.abs(xi);
      const legY = Math.abs(yi);
      const square = legX * legX + legY * legY;
      const distance = Math.round(Math.sqrt(square));
      const xWin = windowAround([0, xi]);
      const yWin = windowAround([0, yi]);
      return (
        <D6Chart
          xMin={xWin.min}
          xMax={xWin.max}
          yMin={yWin.min}
          yMax={yWin.max}
          square
          grid
          paths={[
            {
              points: [
                [xi, 0],
                [0, 0],
                [0, yi],
              ],
              color: SOFT,
              dashed: true,
            },
            {
              points: [
                [xi, 0],
                [0, yi],
              ],
              color: SIGNAL,
            },
          ]}
          dots={[
            { x: xi, y: 0, color: SOFT },
            { x: 0, y: yi, color: SOFT },
          ]}
          labels={[
            {
              x: xi,
              y: 0,
              latex: pointTex(xi, 0),
              color: SOFT,
              dx: 0,
              dy: yi < 0 ? -1 : 1,
            },
            {
              x: 0,
              y: yi,
              latex: pointTex(0, yi),
              color: SOFT,
              dx: xi < 0 ? 1 : -1,
              dy: 0,
            },
          ]}
          xTicks={[xi]}
          yTicks={[yi]}
          footers={[
            `${legX}^{2} + ${legY}^{2} = ${legX * legX} + ${legY * legY} = ${square}`,
            `\\sqrt{${square}} = ${distance}`,
          ]}
          title="The piece of a line between its two crossings, measured off the triangle it makes"
          ariaLabel={`The crossings at ${spoken(xi)} comma 0 and 0 comma ${spoken(yi)}, joined by a segment of length ${spoken(distance)} across a right angle at the origin`}
        />
      );
    },
    caption: (params) => {
      const xi = params.xi ?? 8;
      const yi = params.yi ?? -6;
      const { a, b, c } = lineCoefficients(xi, yi);
      return `Neither end was given, so both come out of the equation first: $${a}x = ${c}$ and $${b}y = ${c}$. The two crossings and the bench mark make a right angle because the axes do, and the legs are how FAR each crossing sits from it, so a negative intercept still gives a positive leg.`;
    },
  },
};
