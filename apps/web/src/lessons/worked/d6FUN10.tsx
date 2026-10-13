/**
 * Worked-solution figures for D6's FUN.10 practice templates: absolute-value functions.
 *
 * All five are the SAME picture with a different mark on it, and that is the argument for drawing
 * them rather than reducing them. A vee is what `a|x - h| + k` looks like, and every one of this
 * node's five questions is a question about that shape: how high the arms are at one input, where
 * the corner sits, where a given height is met, which readings the arms can reach, and where a
 * shifted and scaled vee crosses a target. Answering them in a column asks a learner to hold the
 * shape in their head while the figure talks about arithmetic.
 *
 * The vee is `veeArms`, shared with the CFU figure for this node, so a practice reveal and a check
 * reveal draw the corner the same way. The window is derived from each instance's own corner and
 * reach, which is why the plane's axes are drawn only where the window actually holds the origin: a
 * vee shifted up to `k = 6` has no `y = 0` on it, and a zero line pinned to the floor of the frame
 * would claim the arms come down to zero when the draw puts them at six.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, LABEL, SIGNAL, SOFT } from "../svgKit";
import { spoken, type WorkedSolutionVisual } from "../workedKit";
import { barsTex, coeffTex, D6Chart, pointTex, shiftedInput, sp, veeArms } from "./d6Kit";

/** The vertical margin a vee's window gets above and below the ink it holds. */
function verticalWindow(low: number, high: number): { min: number; max: number } {
  const pad = Math.max(1, (high - low) * 0.18);
  return { min: low - pad, max: high + pad };
}

export const FUN10_PRACTICE_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** How far one reading sits from the set point, drawn as the height of the arm above it. */
  "d6.fun10.deviation.l1": {
    Svg: (params): JSX.Element => {
      const setPoint = params.setPoint ?? 9;
      const reading = params.reading ?? 4;
      const value = Math.abs(reading - setPoint);
      const span = Math.max(value * 1.35, 2);
      const window = verticalWindow(-span * 0.16, span);
      return (
        <D6Chart
          xMin={setPoint - span - 1}
          xMax={setPoint + span + 1}
          yMin={window.min}
          yMax={window.max}
          paths={[
            { points: veeArms(1, setPoint, 0, span), color: SIGNAL },
            {
              points: [
                [reading, 0],
                [reading, value],
              ],
              color: BRICK,
              dashed: true,
            },
          ]}
          dots={[
            { x: setPoint, y: 0, color: LABEL, hollow: true },
            { x: reading, y: value, color: CIVIC },
          ]}
          labels={[
            {
              x: reading,
              y: value,
              latex: `${value}`,
              color: CIVIC,
              dx: reading > setPoint ? -1 : 1,
              dy: -1,
            },
          ]}
          xTicks={[setPoint, reading]}
          yTicks={[value]}
          footers={[`${barsTex(`${sp(reading)} - ${setPoint}`)} = ${value}`]}
          title="A vee whose height at one reading is that reading's distance from the set point"
          ariaLabel={`A reading of ${spoken(reading)} sitting ${spoken(value)} away from the set point ${spoken(setPoint)}`}
        />
      );
    },
    caption: (params) => {
      const setPoint = params.setPoint ?? 9;
      const reading = params.reading ?? 4;
      const diff = reading - setPoint;
      return `The bars measure a DISTANCE, so what comes out is never negative however the subtraction went. Here the subtraction gives $${diff}$${diff < 0 ? `, and the distance is $${Math.abs(diff)}$: the reading sits below the set point, and a distance below is still a distance` : ", which is already positive"}. On the picture that is the height of the arm above the corner.`;
    },
  },

  /** The corner itself, which is what the vertex is, read straight off the two constants. */
  "d6.fun10.vertex.l2": {
    Svg: (params): JSX.Element => {
      const amag = params.amag ?? 2;
      const a = (params.aneg ?? 0) === 1 ? -amag : amag;
      const h = params.h ?? 3;
      const k = params.k ?? -4;
      const span = 3;
      const armY = a * span + k;
      const window = verticalWindow(Math.min(k, armY), Math.max(k, armY));
      return (
        <D6Chart
          xMin={h - span - 1}
          xMax={h + span + 1}
          yMin={window.min}
          yMax={window.max}
          paths={[{ points: veeArms(a, h, k, span), color: SIGNAL }]}
          dots={[{ x: h, y: k, color: CIVIC }]}
          labels={[
            {
              x: h,
              y: k,
              latex: pointTex(h, k),
              color: CIVIC,
              dx: 0,
              dy: a > 0 ? -1 : 1,
            },
          ]}
          xTicks={[h]}
          yTicks={[k]}
          footers={[pointTex(h, k)]}
          title="The corner of a vee, which is where the bars are handed a zero"
          ariaLabel={`A vee ${a > 0 ? "opening upward" : "opening downward"} with its corner at ${spoken(h)} comma ${spoken(k)}`}
        />
      );
    },
    caption: (params) => {
      const h = params.h ?? 3;
      const k = params.k ?? -4;
      return `The corner is the one input where the bars are handed a zero, and that is where $${shiftedInput(h)}$ is zero, so the first coordinate is $${h}$, the OPPOSITE of the number written inside. The bars then contribute nothing, and whatever is added outside is all that is left, which is the second coordinate $${k}$.`;
    },
  },

  /** One height, met twice: once on each arm, the same distance either side of the corner. */
  "d6.fun10.reach.l2": {
    Svg: (params): JSX.Element => {
      const setPoint = params.setPoint ?? 9;
      const height = params.height ?? 3;
      const low = setPoint - height;
      const high = setPoint + height;
      const span = Math.max(height * 1.5, 2);
      /*
       * The ink runs from the corner at zero up to the arm tips at `span`, and the window is
       * taken around exactly that so the margin above the tips equals the one below the corner.
       * Reserving a further 0.16 of the span under the corner on top of that margin bought a
       * blank quarter of the plot below the axis and paid for it out of the arms: on the
       * five heights this template draws it left the tips a seventh of the frame from the top
       * edge while nothing at all was drawn in the bottom band.
       */
      const window = verticalWindow(0, span);
      return (
        <D6Chart
          xMin={setPoint - span - 1}
          xMax={setPoint + span + 1}
          yMin={window.min}
          yMax={window.max}
          paths={[
            { points: veeArms(1, setPoint, 0, span), color: SIGNAL },
            {
              points: [
                [setPoint - span, height],
                [setPoint + span, height],
              ],
              color: SOFT,
              dashed: true,
            },
          ]}
          dots={[
            { x: setPoint, y: 0, color: LABEL, hollow: true },
            { x: low, y: height, color: CIVIC },
            { x: high, y: height, color: CIVIC },
          ]}
          labels={[
            { x: low, y: height, latex: `${low}`, color: CIVIC, dx: -1, dy: -1 },
            { x: high, y: height, latex: `${high}`, color: CIVIC, dx: 1, dy: -1 },
          ]}
          xTicks={[low, setPoint, high]}
          yTicks={[height]}
          footers={[`\\{${low},\\, ${high}\\}`]}
          title="A dashed height crossing both arms of a vee, the same step either side of the corner"
          ariaLabel={`The height ${spoken(height)} met at hour ${spoken(low)} and hour ${spoken(high)}, each ${spoken(height)} from the set point ${spoken(setPoint)}`}
        />
      );
    },
    caption: (params) => {
      const setPoint = params.setPoint ?? 9;
      const height = params.height ?? 3;
      return `A distance of $${height}$ from $${setPoint}$ can be taken in either direction, so the dashed rule crosses the vee twice and there are always TWO answers. One is $${setPoint} - ${height}$ and the other is $${setPoint} + ${height}$. Giving only the one on the right is the usual half-answer here.`;
    },
  },

  /** Which readings the arms can reach, which is a ray starting at the corner's height. */
  "d6.fun10.range.l3": {
    Svg: (params): JSX.Element => {
      const amag = params.amag ?? 2;
      const a = (params.aneg ?? 0) === 1 ? -amag : amag;
      const h = params.h ?? 3;
      const k = params.k ?? -4;
      const span = 3;
      const armY = a * span + k;
      const window = verticalWindow(Math.min(k, armY), Math.max(k, armY));
      return (
        <D6Chart
          xMin={h - span - 1}
          xMax={h + span + 1}
          yMin={window.min}
          yMax={window.max}
          paths={[
            { points: veeArms(a, h, k, span), color: SIGNAL },
            {
              points: [
                [h - span, k],
                [h + span, k],
              ],
              color: SOFT,
              dashed: true,
            },
          ]}
          dots={[{ x: h, y: k, color: CIVIC }]}
          labels={[
            {
              x: h,
              y: k,
              latex: `${k}`,
              color: CIVIC,
              dx: 0,
              dy: a > 0 ? -1 : 1,
            },
          ]}
          xTicks={[h]}
          yTicks={[k]}
          footers={[a > 0 ? `[${k},\\, \\infty)` : `(-\\infty,\\, ${k}]`]}
          title="The readings a vee's arms can reach, bounded by the height of its corner"
          ariaLabel={`A vee opening ${a > 0 ? "upward" : "downward"} from ${spoken(k)}, so its readings run ${a > 0 ? "upward" : "downward"} from ${spoken(k)}`}
        />
      );
    },
    caption: (params) => {
      const amag = params.amag ?? 2;
      const a = (params.aneg ?? 0) === 1 ? -amag : amag;
      const k = params.k ?? -4;
      return `The bars are never negative, so ${a > 0 ? `multiplying by the positive $${a}$ keeps them at or above zero and $${k}$ is the SMALLEST reading the arms reach` : `multiplying by the negative $${a}$ turns them over and $${k}$ becomes the LARGEST`}. The bracket at $${k}$ is square because the corner is actually reached, and the range is a set of OUTPUTS, so it is built from $${k}$ and not from the input it happens at.`;
    },
  },

  /** The bars isolated first, then split into the two inputs that satisfy them. */
  "d6.fun10.setpoint.l3": {
    Svg: (params): JSX.Element => {
      const amag = params.amag ?? 3;
      const a = (params.aneg ?? 0) === 1 ? -amag : amag;
      const h = params.h ?? 4;
      const k = params.k ?? -5;
      const distance = params.distance ?? 3;
      const target = a * distance + k;
      const low = h - distance;
      const high = h + distance;
      const span = Math.max(distance * 1.4, 2);
      const armY = a * span + k;
      const window = verticalWindow(Math.min(k, armY, target), Math.max(k, armY, target));
      return (
        <D6Chart
          xMin={h - span - 1}
          xMax={h + span + 1}
          yMin={window.min}
          yMax={window.max}
          paths={[
            { points: veeArms(a, h, k, span), color: SIGNAL },
            {
              points: [
                [h - span, target],
                [h + span, target],
              ],
              color: SOFT,
              dashed: true,
            },
          ]}
          dots={[
            { x: h, y: k, color: LABEL, hollow: true },
            { x: low, y: target, color: CIVIC },
            { x: high, y: target, color: CIVIC },
          ]}
          labels={[
            {
              x: low,
              y: target,
              latex: `${low}`,
              color: CIVIC,
              dx: -1,
              dy: a > 0 ? -1 : 1,
            },
            {
              x: high,
              y: target,
              latex: `${high}`,
              color: CIVIC,
              dx: 1,
              dy: a > 0 ? -1 : 1,
            },
          ]}
          xTicks={[low, h, high]}
          yTicks={[target]}
          footers={[
            `${barsTex(shiftedInput(h))} = ${distance}`,
            `\\{${low},\\, ${high}\\}`,
          ]}
          title="A scaled and shifted vee cut at a target, and the two inputs that reach it"
          ariaLabel={`A vee whose corner is at ${spoken(h)} comma ${spoken(k)}, cut at ${spoken(target)} by the inputs ${spoken(low)} and ${spoken(high)}`}
        />
      );
    },
    caption: (params) => {
      const amag = params.amag ?? 3;
      const a = (params.aneg ?? 0) === 1 ? -amag : amag;
      const h = params.h ?? 4;
      const k = params.k ?? -5;
      const distance = params.distance ?? 3;
      const target = a * distance + k;
      return `Nothing can be split until the bars stand alone. The $${k < 0 ? `-${Math.abs(k)}` : `+${k}`}$ comes off both sides and the $${coeffTex(a) === "" ? "1" : a}$ is divided away, which leaves $${barsTex(shiftedInput(h))} = ${distance}$. Only now are there two cases, $${distance}$ each side of $${h}$. Splitting the bars while $${target}$ is still on the other side gives two wrong numbers rather than one.`;
    },
  },
};
