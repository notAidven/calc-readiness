/**
 * Worked-solution figures for the D3 LIN.6 practice templates (solve an absolute-value inequality).
 *
 * The single discrimination this node teaches is which direction of sign gives ONE band and which
 * gives TWO, and that is a fact about a picture. So every figure draws the answer on a scale, and
 * the band figures and the union figures are visibly different objects: a shaded stretch between
 * two ends, or two shaded rays with an unshaded gap between them. Read side by side after two
 * reveals, the pair is the argument.
 *
 * The set-builder shape draws the same line as the interval shapes and writes the SET under it
 * rather than the interval, because on that shape the notation is the graded skill and the figure
 * has to show the form it is graded on.
 */

import type { JSX } from "react";

import { numStr, type WorkedSolutionVisual } from "../workedKit";
import { SolutionLineWorked } from "./d3Kit";

function signedTex(value: number): string {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}

function bandTex(low: number, high: number, closed: boolean): string {
  return closed ? `[${numStr(low)}, ${numStr(high)}]` : `(${numStr(low)}, ${numStr(high)})`;
}

function unionTex(low: number, high: number, closed: boolean): string {
  return closed
    ? `(-\\infty, ${numStr(low)}] \\cup [${numStr(high)}, \\infty)`
    : `(-\\infty, ${numStr(low)}) \\cup (${numStr(high)}, \\infty)`;
}

export const LIN6_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** The at-most shape: one band, with the compound inequality written under it. */
  "d3.lin6.band.l1": {
    Svg: (params): JSX.Element => {
      const centre = params.centre ?? 30;
      const tolerance = params.tolerance ?? 4;
      const closed = (params.closed ?? 1) === 1;
      const sign = closed ? "\\le" : "<";
      const low = centre - tolerance;
      const high = centre + tolerance;
      return (
        <SolutionLineWorked
          statement={`\\lvert x ${signedTex(-centre)} \\rvert ${sign} ${numStr(tolerance)} \\;\\; \\rightarrow \\;\\; -${numStr(tolerance)} ${sign} x ${signedTex(-centre)} ${sign} ${numStr(tolerance)}`}
          solved={bandTex(low, high, closed)}
          pieces={[{ from: low, to: high, fromClosed: closed, toClosed: closed }]}
          ariaLabel={`One band from ${numStr(low)} to ${numStr(high)}, drawn on a scale`}
          title="An at-most absolute-value inequality and the single band it leaves"
        />
      );
    },
    caption: (params) =>
      `The sign points towards the bars, so being close to $${numStr(params.centre ?? 30)}$ is ONE condition and the answer is one stretch of the scale. Both ends carry the same bracket, because both came from the same sign.`,
  },

  /** The away-from shape: two rays with a gap between them. */
  "d3.lin6.union.l2": {
    Svg: (params): JSX.Element => {
      const centre = params.centre ?? 14;
      const tolerance = params.tolerance ?? 6;
      const closed = (params.closed ?? 0) === 1;
      const sign = closed ? "\\ge" : ">";
      const low = centre - tolerance;
      const high = centre + tolerance;
      return (
        <SolutionLineWorked
          statement={`\\lvert x ${signedTex(-centre)} \\rvert ${sign} ${numStr(tolerance)} \\;\\; \\rightarrow \\;\\; x ${signedTex(-centre)} ${sign} ${numStr(tolerance)} \\;\\text{ or }\\; x ${signedTex(-centre)} ${closed ? "\\le" : "<"} -${numStr(tolerance)}`}
          solved={unionTex(low, high, closed)}
          pieces={[
            { from: null, to: low, toClosed: closed },
            { from: high, to: null, fromClosed: closed },
          ]}
          ariaLabel={`Two rays, below ${numStr(low)} and above ${numStr(high)}, drawn on a scale with a gap between them`}
          title="An away-from absolute-value inequality and the two rays it leaves"
        />
      );
    },
    caption: (params) =>
      `The unshaded gap in the middle is the whole reason this cannot be one interval: everything in it is closer to $${numStr(params.centre ?? 14)}$ than the tolerance allows, so it satisfies neither branch.`,
  },

  /** A coefficient inside the bars, on the band shape: the compound inequality is divided
   * through. */
  "d3.lin6.scaled-band.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? -9;
      const k = params.k ?? 6;
      const centre = params.centre ?? 3;
      const tolerance = params.tolerance ?? 2;
      const closed = (params.closed ?? 1) === 1;
      const sign = closed ? "\\le" : "<";
      const low = centre - tolerance;
      const high = centre + tolerance;
      return (
        <SolutionLineWorked
          statement={`\\lvert ${numStr(a)}x ${signedTex(b)} \\rvert ${sign} ${numStr(k)} \\;\\; \\rightarrow \\;\\; -${numStr(k)} ${sign} ${numStr(a)}x ${signedTex(b)} ${sign} ${numStr(k)}`}
          solved={bandTex(low, high, closed)}
          pieces={[{ from: low, to: high, fromClosed: closed, toClosed: closed }]}
          ariaLabel={`One band from ${numStr(low)} to ${numStr(high)} after dividing the compound inequality through`}
          title="A coefficient inside the bars, on a band"
        />
      );
    },
    caption: (params) =>
      `Every move on a compound inequality applies right across all three of its parts, the division by $${numStr(params.a ?? 3)}$ included. That divisor is positive, so neither of the two signs turned over.`,
  },

  /** A coefficient inside the bars, on the union shape: both hard features at once. */
  "d3.lin6.scaled-union.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 4;
      const b = params.b ?? -8;
      const k = params.k ?? 12;
      const centre = params.centre ?? 2;
      const tolerance = params.tolerance ?? 3;
      const closed = (params.closed ?? 0) === 1;
      const sign = closed ? "\\ge" : ">";
      const low = centre - tolerance;
      const high = centre + tolerance;
      return (
        <SolutionLineWorked
          statement={`\\lvert ${numStr(a)}x ${signedTex(b)} \\rvert ${sign} ${numStr(k)} \\;\\; \\rightarrow \\;\\; ${numStr(a)}x ${signedTex(b)} ${sign} ${numStr(k)} \\;\\text{ or }\\; ${numStr(a)}x ${signedTex(b)} ${closed ? "\\le" : "<"} -${numStr(k)}`}
          solved={unionTex(low, high, closed)}
          pieces={[
            { from: null, to: low, toClosed: closed },
            { from: high, to: null, fromClosed: closed },
          ]}
          ariaLabel={`Two rays, below ${numStr(low)} and above ${numStr(high)}, after solving both branches`}
          title="A coefficient inside the bars, on a union"
        />
      );
    },
    caption: () =>
      "Two branches, each an ordinary two-step inequality, and the shape was settled before either of them was solved. The arithmetic here is identical to the band case; only the shape it was poured into differs.",
  },

  /** Set-builder notation: the same line, with the SET written under it. */
  "d3.lin6.set-builder.l3": {
    Svg: (params): JSX.Element => {
      const away = (params.away ?? 1) === 1;
      const centre = params.centre ?? 10;
      const tolerance = params.tolerance ?? 4;
      const closed = (params.closed ?? 0) === 1;
      const sign = away ? (closed ? "\\ge" : ">") : closed ? "\\le" : "<";
      const low = centre - tolerance;
      const high = centre + tolerance;
      const lowRel = closed ? "\\le" : "<";
      const highRel = away ? (closed ? "\\ge" : ">") : closed ? "\\le" : "<";
      const set = away
        ? `\\{x \\mid x ${lowRel} ${numStr(low)} \\text{ or } x ${highRel} ${numStr(high)}\\}`
        : `\\{x \\mid ${numStr(low)} ${sign} x ${sign} ${numStr(high)}\\}`;
      return (
        <SolutionLineWorked
          statement={`\\lvert x ${signedTex(-centre)} \\rvert ${sign} ${numStr(tolerance)}`}
          solved={set}
          pieces={
            away
              ? [
                  { from: null, to: low, toClosed: closed },
                  { from: high, to: null, fromClosed: closed },
                ]
              : [{ from: low, to: high, fromClosed: closed, toClosed: closed }]
          }
          ariaLabel={
            away
              ? `Two rays written as a set, below ${numStr(low)} or above ${numStr(high)}`
              : `One band written as a set, from ${numStr(low)} to ${numStr(high)}`
          }
          title="An absolute-value inequality written in set-builder notation"
        />
      );
    },
    caption: (params) =>
      (params.away ?? 1) === 1
        ? "The set is the same two rays the interval notation describes, said a different way: braces, the variable, a bar, and the condition, with the two pieces joined by the word or rather than a union symbol."
        : "The set is the same band the interval notation describes, said a different way: braces, the variable, a bar, and the single condition it has to satisfy.",
  },
};
