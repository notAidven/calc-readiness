/**
 * Worked-solution figures for D6's FUN.3 practice templates: piecewise-defined functions.
 *
 * Every one of the five is answered in two moves, and only the second is arithmetic. The first
 * is deciding WHICH stretch of the input line owns the input, and on three of the five that
 * decision turns on the strictness of an inequality: whether `x <= c` or `x >= c` claims the
 * break. A reduction column can print the winning condition in a first row, and it cannot show
 * a learner that the two conditions meet at one point with exactly one of them taking it in.
 *
 * So these are lines. `D6BreakLine` draws every stretch, inks the one that owns the asked input
 * apart from the rest, and fills or hollows each endpoint as the two inequalities actually are.
 * The formulas sit in a legend under the line rather than over their own stretches, because a
 * three-piece rule's middle stretch can be two units wide and two formulas centred over
 * neighbouring stretches would be printed through each other.
 *
 * The one shape with two inputs marks both and owns both stretches, since there the point is
 * that one load falls each side of the break.
 */

import { expressionVariable } from "@cr/item-bank";
import type { JSX } from "react";

import { spoken, type WorkedSolutionVisual } from "../workedKit";
import { type BreakStretch, D6BreakLine } from "./d6Kit";

/** ` + 5` or ` - 5`, and nothing at all for a zero, as FUN.3's generator prints a tail. */
function tail(value: number): string {
  if (value === 0) {
    return "";
  }
  return value < 0 ? ` - ${-value}` : ` + ${value}`;
}

function linear(m: number, b: number, v: string): string {
  return `${m}${v}${tail(b)}`;
}

function linearAt(m: number, b: number, p: number): string {
  return `${m}(${p})${tail(b)}`;
}

function below(v: string, c: number, strict: boolean): string {
  return `${v} ${strict ? "<" : "\\le"} ${c}`;
}

function above(v: string, c: number, strict: boolean): string {
  return `${v} ${strict ? ">" : "\\ge"} ${c}`;
}

/** A condition and the formula it hands over, as one legend line. */
function legendLine(condition: string, formula: string): string {
  return `${condition} \\;\\Rightarrow\\; ${formula}`;
}

export const FUN3_PRACTICE_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** One break, one input clear of it, and the stretch that claims the input inked apart. */
  "d6.fun3.two-piece-eval.l1": {
    Svg: (params): JSX.Element => {
      const v = expressionVariable(params.varIndex ?? 0);
      const m1 = params.m1 ?? 2;
      const b1 = params.b1 ?? 3;
      const m2 = params.m2 ?? -3;
      const b2 = params.b2 ?? 1;
      const c = params.c ?? 2;
      const strict = params.strict ?? 0;
      const side = params.side ?? 0;
      const p = params.p ?? c - 2;
      const lowOwns = side === 0;
      const value = lowOwns ? m1 * p + b1 : m2 * p + b2;
      const stretches: BreakStretch[] = [
        {
          from: null,
          to: c,
          toClosed: strict === 0,
          legend: legendLine(below(v, c, strict === 1), linear(m1, b1, v)),
          owner: lowOwns,
        },
        {
          from: c,
          to: null,
          fromClosed: strict === 1,
          legend: legendLine(above(v, c, strict === 0), linear(m2, b2, v)),
          owner: !lowOwns,
        },
      ];
      return (
        <D6BreakLine
          stretches={stretches}
          inputs={[{ at: p, latex: `${v} = ${p}` }]}
          footers={[
            `f(${p}) = ${lowOwns ? linearAt(m1, b1, p) : linearAt(m2, b2, p)}`,
            `f(${p}) = ${value}`,
          ]}
          title="The input line of a two-piece rule, with the stretch that owns the input inked apart"
          ariaLabel={`An input of ${spoken(p)} falling on the ${lowOwns ? "lower" : "upper"} stretch of a rule that breaks at ${spoken(c)}, giving ${spoken(value)}`}
        />
      );
    },
    caption: (params) => {
      const v = expressionVariable(params.varIndex ?? 0);
      const p = params.p ?? 0;
      const c = params.c ?? 2;
      return `Two moves, and only the second is arithmetic. $${v} = ${p}$ is ${p < c ? "below" : "above"} the break at $${c}$, so exactly one condition holds and only that formula is ever substituted into. The other formula would give a different number, which is the whole point of the draw: guessing cannot come out right.`;
    },
  },

  /** The input sits ON the break, and only one of the two conditions takes it in. */
  "d6.fun3.boundary-eval.l2": {
    Svg: (params): JSX.Element => {
      const v = expressionVariable(params.varIndex ?? 0);
      const m1 = params.m1 ?? 2;
      const b1 = params.b1 ?? 3;
      const m2 = params.m2 ?? -3;
      const b2 = params.b2 ?? 1;
      const c = params.c ?? 2;
      const strict = params.strict ?? 0;
      const lowOwns = strict === 0;
      const value = lowOwns ? m1 * c + b1 : m2 * c + b2;
      const stretches: BreakStretch[] = [
        {
          from: null,
          to: c,
          toClosed: strict === 0,
          legend: legendLine(below(v, c, strict === 1), linear(m1, b1, v)),
          owner: lowOwns,
        },
        {
          from: c,
          to: null,
          fromClosed: strict === 1,
          legend: legendLine(above(v, c, strict === 0), linear(m2, b2, v)),
          owner: !lowOwns,
        },
      ];
      return (
        <D6BreakLine
          stretches={stretches}
          inputs={[{ at: c, latex: `${v} = ${c}` }]}
          footers={[
            `f(${c}) = ${lowOwns ? linearAt(m1, b1, c) : linearAt(m2, b2, c)}`,
            `f(${c}) = ${value}`,
          ]}
          title="An input exactly on the break, claimed by the one condition that is not strict"
          ariaLabel={`The break at ${spoken(c)} claimed by the ${lowOwns ? "lower" : "upper"} stretch, whose formula gives ${spoken(value)}`}
        />
      );
    },
    caption: (params) => {
      const c = params.c ?? 2;
      const lowOwns = (params.strict ?? 0) === 0;
      return `The input is the break itself, so the answer is decided entirely by which inequality is allowed to touch it. Only one stretch may, and the endpoint drawn at $${c}$ is that one filled: it belongs to the ${lowOwns ? "lower" : "upper"} stretch, and the other stops just short. The two formulas genuinely disagree here, so picking the wrong one is visible in the number.`;
    },
  },

  /** Three stretches, the middle one bounded on both sides by a double condition. */
  "d6.fun3.three-piece-eval.l2": {
    Svg: (params): JSX.Element => {
      const v = expressionVariable(params.varIndex ?? 0);
      const a = params.a ?? -4;
      const c = params.c ?? -1;
      const m = params.m ?? 3;
      const b = params.b ?? 2;
      const k1 = params.k1 ?? -5;
      const k2 = params.k2 ?? 7;
      const p = params.p ?? a;
      const value = m * p + b;
      const stretches: BreakStretch[] = [
        {
          from: null,
          to: a,
          toClosed: false,
          legend: legendLine(below(v, a, true), `${k1}`),
        },
        {
          from: a,
          to: c,
          fromClosed: true,
          toClosed: false,
          legend: legendLine(`${a} \\le ${v} < ${c}`, linear(m, b, v)),
          owner: true,
        },
        {
          from: c,
          to: null,
          fromClosed: true,
          legend: legendLine(above(v, c, false), `${k2}`),
        },
      ];
      return (
        <D6BreakLine
          stretches={stretches}
          inputs={[{ at: p, latex: `${v} = ${p}` }]}
          footers={[`f(${p}) = ${linearAt(m, b, p)}`, `f(${p}) = ${value}`]}
          title="Three stretches, with the double-conditioned middle one owning the input"
          ariaLabel={`An input of ${spoken(p)} inside the middle stretch running from ${spoken(a)} up to ${spoken(c)}, giving ${spoken(value)}`}
        />
      );
    },
    caption: (params) => {
      const v = expressionVariable(params.varIndex ?? 0);
      const a = params.a ?? -4;
      const c = params.c ?? -1;
      const p = params.p ?? a;
      return `The middle condition is TWO tests, not one: $${p}$ has to be at least $${a}$ AND under $${c}$, and both have to pass before that formula may be used. Its left end is filled and its right end hollow, so $${v} = ${c}$ belongs to the stretch above instead. The two flat stretches are constants, so a learner who takes the wrong one lands on a number the middle formula never produces.`;
    },
  },

  /** Two loads, one each side of the break, each priced by its own stretch. */
  "d6.fun3.across-pieces-sum.l3": {
    Svg: (params): JSX.Element => {
      const rateLow = params.rateLow ?? 8;
      const rateHigh = params.rateHigh ?? 5;
      const fee = params.fee ?? 12;
      const c = params.c ?? 6;
      const p = params.p ?? c - 2;
      const q = params.q ?? c + 1;
      const first = rateLow * p;
      const second = rateHigh * q + fee;
      const stretches: BreakStretch[] = [
        {
          from: null,
          to: c,
          toClosed: false,
          legend: legendLine(below("t", c, true), `${rateLow}t`),
          owner: true,
        },
        {
          from: c,
          to: null,
          fromClosed: true,
          legend: legendLine(above("t", c, false), `${rateHigh}t + ${fee}`),
          owner: true,
        },
      ];
      return (
        <D6BreakLine
          stretches={stretches}
          inputs={[
            { at: p, latex: `t = ${p}` },
            { at: q, latex: `t = ${q}` },
          ]}
          footers={[
            `C(${p}) = ${rateLow}(${p}) = ${first}`,
            `C(${q}) = ${rateHigh}(${q}) + ${fee} = ${second}`,
            `${first} + ${second} = ${total(first, second)}`,
          ]}
          title="Two loads on opposite sides of one break, each charged by its own stretch"
          ariaLabel={`A load of ${spoken(p)} charged on the lower stretch for ${spoken(first)} and a load of ${spoken(q)} charged on the upper stretch for ${spoken(second)}, ${spoken(total(first, second))} together`}
        />
      );
    },
    caption: (params) => {
      const c = params.c ?? 6;
      const q = params.q ?? c + 1;
      const fee = params.fee ?? 12;
      return `Both stretches are in use, so both are inked. The cheaper rate above the break does NOT make the bigger load cheaper overall, because the flat $${fee}$ goes on as well.${q === c ? ` The second load is exactly $${c}$, and the upper condition is the one that takes the break in.` : ""} Each load is priced on its own side first, and only then are the two added.`;
    },
  },

  /** A squared stretch against a linear one, with the input free to land on the break. */
  "d6.fun3.square-piece-eval.l3": {
    Svg: (params): JSX.Element => {
      const v = expressionVariable(params.varIndex ?? 0);
      const c = params.c ?? 1;
      const strict = params.strict ?? 0;
      const b = params.b ?? 3;
      const m = params.m ?? -4;
      const k = params.k ?? 5;
      const atBreak = params.atBreak ?? 0;
      const side = params.side ?? 0;
      const p = params.p ?? (atBreak === 1 ? c : side === 0 ? c - 2 : c + 2);
      const squareOwns = atBreak === 1 ? strict === 0 : side === 0;
      const value = squareOwns ? p * p + b : m * p + k;
      const stretches: BreakStretch[] = [
        {
          from: null,
          to: c,
          toClosed: strict === 0,
          legend: legendLine(below(v, c, strict === 1), `${v}^{2}${tail(b)}`),
          owner: squareOwns,
        },
        {
          from: c,
          to: null,
          fromClosed: strict === 1,
          legend: legendLine(above(v, c, strict === 0), linear(m, k, v)),
          owner: !squareOwns,
        },
      ];
      return (
        <D6BreakLine
          stretches={stretches}
          inputs={[{ at: p, latex: `${v} = ${p}` }]}
          footers={[
            `f(${p}) = ${squareOwns ? `(${p})^{2}${tail(b)}` : linearAt(m, k, p)}`,
            `f(${p}) = ${value}`,
          ]}
          title="A squared stretch and a linear one, with the input placed against the break"
          ariaLabel={`An input of ${spoken(p)} owned by the ${squareOwns ? "squared" : "linear"} stretch of a rule breaking at ${spoken(c)}, giving ${spoken(value)}`}
        />
      );
    },
    caption: (params) => {
      const p = params.p ?? 0;
      const atBreak = (params.atBreak ?? 0) === 1;
      const squareOwns = atBreak ? (params.strict ?? 0) === 0 : (params.side ?? 0) === 0;
      return `${atBreak ? "The input lands exactly on the break, so the filled endpoint settles it" : "The input is clear of the break, so one condition holds and the other does not"}. ${squareOwns ? `The squared stretch owns it, and the parentheses in $(${p})^{2}$ are doing real work: a negative input squares to a positive` : "The linear stretch owns it, so nothing is squared at all"}.`;
    },
  },
};

/** The two charges added, kept in one place so the footer and the aria line cannot disagree. */
function total(first: number, second: number): number {
  return first + second;
}
