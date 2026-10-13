/**
 * Worked-solution figures for the D3 LIN.4 practice templates (solve a linear or compound
 * inequality and write it in interval notation).
 *
 * Every one of these is a `SolutionLineWorked`, and the reason is the same for all six: the answer
 * is a SET, the notation is a description of its shape, and the two things a learner gets wrong are
 * which way it runs and whether its ends are in. Both of those are visible on a line and neither is
 * visible in a column of algebra. The solved inequality is typeset under the line as well, so the
 * figure connects the picture to the notation rather than replacing one with the other.
 *
 * The one shape that is NOT only about shape is the negative-coefficient one, where the direction
 * turns over on the dividing step. Its caption is the only one that names a move rather than a
 * shape, because on that shape the move is what the picture cannot show.
 */

import type { JSX } from "react";

import { numStr, type WorkedSolutionVisual } from "../workedKit";
import { SolutionLineWorked } from "./d3Kit";

/** The interval, typeset, from a finite bound and which way the range runs. */
function rayTex(bound: number, closed: boolean, upward: boolean): string {
  return upward
    ? `${closed ? "[" : "("}${numStr(bound)}, \\infty)`
    : `(-\\infty, ${numStr(bound)}${closed ? "]" : ")"}`;
}

function signedTex(value: number): string {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}

export const LIN4_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** One step, so the figure is almost entirely about the notation. */
  "d3.lin4.one-step.l1": {
    Svg: (params): JSX.Element => {
      const bound = params.bound ?? 6;
      const shift = params.shift ?? 4;
      const closed = (params.closed ?? 1) === 1;
      const upward = (params.upward ?? 1) === 1;
      const sign = upward ? (closed ? "\\ge" : ">") : closed ? "\\le" : "<";
      return (
        <SolutionLineWorked
          statement={`x + ${numStr(shift)} ${sign} ${numStr(bound + shift)}`}
          solved={`x ${sign} ${numStr(bound)} \\;\\; \\rightarrow \\;\\; ${rayTex(bound, closed, upward)}`}
          pieces={[
            upward
              ? { from: bound, to: null, fromClosed: closed }
              : { from: null, to: bound, toClosed: closed },
          ]}
          ariaLabel={`The solution set of x plus ${numStr(shift)} against ${numStr(bound + shift)}, drawn on a scale`}
          title="A one-step inequality and the range it leaves"
        />
      );
    },
    caption: (params) =>
      (params.closed ?? 1) === 1
        ? "The sign takes its boundary in, so the endpoint is filled and its bracket is square. The other end has no limit at all, and infinity is never taken in."
        : "The sign is strict, so the endpoint is hollow and its bracket is round: every number in the shaded part is an answer and that one value is not.",
  },

  /** Two steps and a positive coefficient: nothing reverses. */
  "d3.lin4.two-step.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 5;
      const b = params.b ?? 4;
      const bound = params.bound ?? 6;
      const closed = (params.closed ?? 1) === 1;
      const upward = (params.upward ?? 0) === 1;
      const sign = upward ? (closed ? "\\ge" : ">") : closed ? "\\le" : "<";
      return (
        <SolutionLineWorked
          statement={`${numStr(a)}x ${signedTex(b)} ${sign} ${numStr(a * bound + b)}`}
          solved={`x ${sign} ${numStr(bound)} \\;\\; \\rightarrow \\;\\; ${rayTex(bound, closed, upward)}`}
          pieces={[
            upward
              ? { from: bound, to: null, fromClosed: closed }
              : { from: null, to: bound, toClosed: closed },
          ]}
          ariaLabel={`The solution set of ${numStr(a)} x against ${numStr(a * bound + b)}, drawn on a scale`}
          title="A two-step inequality and the range it leaves"
        />
      );
    },
    caption: (params) =>
      `The plain number came off both sides and then both sides were divided by the positive $${numStr(params.a ?? 5)}$. Nothing negative was divided out, so the sign kept the direction it was written with.`,
  },

  /** A negative coefficient: the direction turns over on the dividing step. */
  "d3.lin4.negative-coefficient.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 4;
      const b = params.b ?? 6;
      const bound = params.bound ?? -3;
      const closed = (params.closed ?? 0) === 1;
      const writtenUpward = (params.writtenUpward ?? 1) === 1;
      const upward = !writtenUpward;
      const written = writtenUpward ? (closed ? "\\ge" : ">") : closed ? "\\le" : "<";
      const solved = upward ? (closed ? "\\ge" : ">") : closed ? "\\le" : "<";
      return (
        <SolutionLineWorked
          statement={`${numStr(b)} - ${numStr(a)}x ${written} ${numStr(b - a * bound)}`}
          solved={`x ${solved} ${numStr(bound)} \\;\\; \\rightarrow \\;\\; ${rayTex(bound, closed, upward)}`}
          pieces={[
            upward
              ? { from: bound, to: null, fromClosed: closed }
              : { from: null, to: bound, toClosed: closed },
          ]}
          ariaLabel={`The solution set of ${numStr(b)} minus ${numStr(a)} x, drawn on a scale after the sign reverses`}
          title="An inequality whose sign reverses on the dividing step"
        />
      );
    },
    caption: (params) =>
      `Dividing by $-${numStr(params.a ?? 4)}$ divides by a negative, so the range runs the OPPOSITE way from the sign the problem was written with. The two sides stayed as far apart as they were; which of them is larger changed hands.`,
  },

  /**
   * A compound OR at one move per half: the same two-ray picture as the L3 shape, over a
   * statement whose halves have nothing to undo before the division.
   */
  "d3.lin4.compound-or.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 4;
      const low = params.low ?? 3;
      const high = params.high ?? 9;
      const lowClosed = (params.lowClosed ?? 0) === 1;
      const highClosed = (params.highClosed ?? 1) === 1;
      const lowSign = lowClosed ? "\\le" : "<";
      const highSign = highClosed ? "\\ge" : ">";
      const union = `(-\\infty, ${numStr(low)}${lowClosed ? "]" : ")"} \\cup ${highClosed ? "[" : "("}${numStr(high)}, \\infty)`;
      return (
        <SolutionLineWorked
          statement={`${numStr(a)}x ${lowSign} ${numStr(a * low)} \\;\\text{ or }\\; ${numStr(a)}x ${highSign} ${numStr(a * high)}`}
          solved={union}
          pieces={[
            { from: null, to: low, toClosed: lowClosed },
            { from: high, to: null, fromClosed: highClosed },
          ]}
          ariaLabel="The two separated rays a consignment is turned away on, drawn on a scale"
          title="A compound or whose halves are one move each"
        />
      );
    },
    caption: (params) =>
      `Each half was divided by the positive $${numStr(params.a ?? 4)}$ and nothing had to come off first, so the work is one move a side. What the picture adds is the GAP: the accepted weights sit in it, and the answer is everything outside it.`,
  },

  /** A compound AND: one bounded band, with each bracket decided on its own. */
  "d3.lin4.compound-and.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? 3;
      const low = params.low ?? -2;
      const high = params.high ?? 6;
      const lowClosed = (params.lowClosed ?? 1) === 1;
      const highClosed = (params.highClosed ?? 0) === 1;
      const lowSign = lowClosed ? "\\le" : "<";
      const highSign = highClosed ? "\\le" : "<";
      const interval = `${lowClosed ? "[" : "("}${numStr(low)}, ${numStr(high)}${highClosed ? "]" : ")"}`;
      return (
        <SolutionLineWorked
          statement={`${numStr(a * low + b)} ${lowSign} ${numStr(a)}x ${signedTex(b)} ${highSign} ${numStr(a * high + b)}`}
          solved={`${numStr(low)} ${lowSign} x ${highSign} ${numStr(high)} \\;\\; \\rightarrow \\;\\; ${interval}`}
          pieces={[{ from: low, to: high, fromClosed: lowClosed, toClosed: highClosed }]}
          ariaLabel={`The band satisfying both halves of the compound inequality, drawn on a scale`}
          title="A compound and, and the single band it leaves"
        />
      );
    },
    caption: () =>
      "Both conditions have to hold at once, so the answer is the overlap: one band, and one pair of brackets each taken from the sign at its own end.",
  },

  /** A compound OR: two rays with a gap, joined by a union. */
  "d3.lin4.compound-or.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? -4;
      const low = params.low ?? -3;
      const high = params.high ?? 5;
      const lowClosed = (params.lowClosed ?? 0) === 1;
      const highClosed = (params.highClosed ?? 1) === 1;
      const lowSign = lowClosed ? "\\le" : "<";
      const highSign = highClosed ? "\\ge" : ">";
      const union = `(-\\infty, ${numStr(low)}${lowClosed ? "]" : ")"} \\cup ${highClosed ? "[" : "("}${numStr(high)}, \\infty)`;
      return (
        <SolutionLineWorked
          statement={`${numStr(a)}x ${signedTex(b)} ${lowSign} ${numStr(a * low + b)} \\;\\text{ or }\\; ${numStr(a)}x ${signedTex(b)} ${highSign} ${numStr(a * high + b)}`}
          solved={union}
          pieces={[
            { from: null, to: low, toClosed: lowClosed },
            { from: high, to: null, fromClosed: highClosed },
          ]}
          ariaLabel="The two separated rays satisfying either half of the compound inequality, drawn on a scale"
          title="A compound or, and the two bands it leaves"
        />
      );
    },
    caption: (params) =>
      `Nothing between $${numStr(params.low ?? -3)}$ and $${numStr(params.high ?? 5)}$ satisfies either half, so the gap in the middle of the picture is the reason no single interval can hold the answer.`,
  },
};
