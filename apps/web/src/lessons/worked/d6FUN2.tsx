/**
 * Worked-solution figures for D6's FUN.2 practice templates: domain and range.
 *
 * All five answer with an INTERVAL, and D3's `SolutionLineWorked` is already the figure this
 * tree draws an interval on — filled endpoint for a bound the set takes in, hollow for one it
 * leaves out, an arrowhead where the set runs off the drawn scale. Reusing it is not just
 * economy: the same picture, drawn the same way, is what makes `[3, 7)` and `(3, 7]` tell apart
 * on sight, and a learner who has met it solving inequalities in D3 has met it before.
 *
 * The line above each figure is the REQUIREMENT rather than the rule, because that is the step
 * the answer comes out of: what a root needs, what a denominator forbids. The two range shapes
 * are the exception and carry the rule instead, since there the line is a line of OUTPUTS and
 * the rule is what bounds them.
 *
 * Nothing here is authored twice: `SolutionLineWorked` derives its own window from the bounds it
 * is handed, so a domain can never be drawn on a scale that clips itself.
 */

import type { JSX } from "react";

import { type WorkedSolutionVisual, spoken } from "../workedKit";
import { SolutionLineWorked } from "./d3Kit";

/** `+ 5` or `- 5`, as FUN.2's own generator prints a joined constant. */
function signed(value: number): string {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}

/** A ray in interval notation, as the answer box wants it. */
function rayTex(bound: number, closed: boolean, upward: boolean): string {
  return upward
    ? `${closed ? "[" : "("}${bound},\\, \\infty)`
    : `(-\\infty,\\, ${bound}${closed ? "]" : ")"}`;
}

export const FUN2_PRACTICE_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** An even root needs a non-negative radicand, and that requirement is one inequality. */
  "d6.fun2.root-domain.l1": {
    Svg: (params): JSX.Element => {
      const bound = params.bound ?? 3;
      const shift = params.shift ?? -bound;
      return (
        <SolutionLineWorked
          statement={`x ${signed(shift)} \\ge 0`}
          solved={rayTex(bound, true, true)}
          pieces={[{ from: bound, to: null, fromClosed: true }]}
          title="The stretch of inputs a square root will accept"
          ariaLabel={`Every input from ${spoken(bound)} upwards, with ${spoken(bound)} itself included`}
        />
      );
    },
    caption: (params) => {
      const bound = params.bound ?? 3;
      const mult = params.mult ?? 1;
      return `A square root will not take a negative, so the whole domain question is what makes the radicand at least zero. The endpoint is FILLED because zero is allowed under a root: $\\sqrt{0}$ is $0$${mult === 1 ? "" : `, so $${mult}\\sqrt{0}$ is $0$ too`}, which is a perfectly good output. At $${bound}$ the radicand is exactly zero, and below it the root has nothing to give.`;
    },
  },

  /** A denominator forbids one input, which punches a hole rather than cutting a ray. */
  "d6.fun2.quotient-domain.l2": {
    Svg: (params): JSX.Element => {
      const root = params.root ?? 4;
      const k = params.k ?? 3;
      const m = params.m ?? -k * root;
      return (
        <SolutionLineWorked
          statement={`${k}x ${signed(m)} \\ne 0`}
          solved={`(-\\infty,\\, ${root}) \\cup (${root},\\, \\infty)`}
          pieces={[
            { from: null, to: root, toClosed: false },
            { from: root, to: null, fromClosed: false },
          ]}
          title="Every input but the one that empties the denominator"
          ariaLabel={`Every input except ${spoken(root)}, drawn as two rays meeting at a hollow mark`}
        />
      );
    },
    caption: (params) => {
      const root = params.root ?? 4;
      return `Nothing about the top restricts anything; the only forbidden input is the one that makes the BOTTOM zero. So the domain is the whole line with a single point taken out, which is why it is written as a union of two rays and not as an inequality. Both marks at $${root}$ are hollow, from either side.`;
    },
  },

  /** A square or an absolute value cannot go below zero, so the outputs stop somewhere. */
  "d6.fun2.output-range.l2": {
    Svg: (params): JSX.Element => {
      const kind = params.kind ?? 0;
      const up = params.up ?? 1;
      const limit = params.limit ?? 2;
      const core = kind === 1 ? "\\left|x\\right|" : "x^{2}";
      const rule =
        up === 1 ? `f(x) = ${core} ${signed(limit)}` : `f(x) = ${limit} - ${core}`;
      return (
        <SolutionLineWorked
          statement={rule}
          solved={rayTex(limit, true, up === 1)}
          pieces={
            up === 1
              ? [{ from: limit, to: null, fromClosed: true }]
              : [{ from: null, to: limit, toClosed: true }]
          }
          title="The outputs a rule built on a square or an absolute value can reach"
          ariaLabel={`Outputs running ${up === 1 ? "upward from" : "downward from"} ${spoken(limit)}, with ${spoken(limit)} itself reached`}
        />
      );
    },
    caption: (params) => {
      const kind = params.kind ?? 0;
      const up = params.up ?? 1;
      const limit = params.limit ?? 2;
      const core = kind === 1 ? "\\left|x\\right|" : "x^{2}";
      return `This line carries OUTPUTS, not inputs. $${core}$ is never negative and is zero at $x = 0$, so its smallest value is $0$ and it has no largest. ${up === 1 ? `Adding $${limit}$ lifts every output by the same amount, so the smallest becomes $${limit}$ and the range runs upward from there` : `Subtracting it from $${limit}$ turns the direction over, so $${limit}$ becomes the LARGEST output and the range runs downward`}. The endpoint is filled because $x = 0$ actually reaches it.`;
    },
  },

  /** The same root requirement with the input term reversed, which turns the ray around. */
  "d6.fun2.root-flip-domain.l3": {
    Svg: (params): JSX.Element => {
      const bound = params.bound ?? -2;
      const n = params.n ?? 3;
      const m = params.m ?? n * bound;
      const radicand = m > 0 ? `${m} - ${n}x` : `-${n}x ${signed(m)}`;
      return (
        <SolutionLineWorked
          statement={`${radicand} \\ge 0`}
          solved={rayTex(bound, true, false)}
          pieces={[{ from: null, to: bound, toClosed: true }]}
          title="A root whose input term is negative, so its stretch runs the other way"
          ariaLabel={`Every input from ${spoken(bound)} downwards, with ${spoken(bound)} itself included`}
        />
      );
    },
    caption: (params) => {
      const bound = params.bound ?? -2;
      const n = params.n ?? 3;
      return `The requirement is the same one as always, and the ray points the other way for one reason: dividing by the negative $-${n}$ turns the inequality over. So the domain runs DOWN from $${bound}$, not up from it. The constant outside the root and the multiplier in front of it restrict nothing at all; only what sits under the root can.`;
    },
  },

  /** Two restrictions at once: a root's floor, and a hole punched inside it. */
  "d6.fun2.root-over-linear.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 2;
      const b = params.b ?? 6;
      return (
        <SolutionLineWorked
          statement={`x ${signed(-a)} \\ge 0 \\;\\text{ and }\\; x ${signed(-b)} \\ne 0`}
          solved={`[${a},\\, ${b}) \\cup (${b},\\, \\infty)`}
          pieces={[
            { from: a, to: b, fromClosed: true, toClosed: false },
            { from: b, to: null, fromClosed: false },
          ]}
          title="A root's stretch with the denominator's forbidden input taken out of it"
          ariaLabel={`Every input from ${spoken(a)} upwards except ${spoken(b)}, with ${spoken(a)} included and ${spoken(b)} left out`}
        />
      );
    },
    caption: (params) => {
      const a = params.a ?? 2;
      const b = params.b ?? 6;
      return `Two restrictions, and both have to hold. The root sets a floor at $${a}$, filled because zero under a root is fine; the denominator forbids $${b}$, hollow because a zero there is not. Since $${b}$ sits INSIDE the root's stretch, the hole splits it, which is why the answer needs a union. Take either restriction on its own and the interval is wrong.`;
    },
  },
};
