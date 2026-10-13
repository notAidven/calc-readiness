/**
 * Worked-solution figures for D6's FUN.7 practice templates: composition of functions.
 *
 * All five are CHAINS, drawn with `D6Chain`: two boxes coupled in a line, the inner one inked
 * `SIGNAL` and the outer `CIVIC`, with what the first hands on written on the arrow between them.
 *
 * A reduction column would have been half the work and the wrong figure. Every one of these five
 * shapes is drawn so that running the two machines the OTHER way round gives a different answer —
 * the bank rerolls until the two orders disagree — and the mistake the node exists to catch is
 * reading `(f \circ g)` left to right. A column of rows makes the order a claim in a first line of
 * prose. Two boxes with an arrow between them make it geometry: the machine that acted first is
 * the one the input reaches first, and it is above the other on the page.
 *
 * Two shapes ask for a FORMULA rather than a number, and they get the same chain with `x` running
 * through it instead of a value, which is the honest picture of what composing symbolically is.
 */

import type { JSX } from "react";

import { spoken, type WorkedSolutionVisual } from "../workedKit";
import { type ChainStage, D6Chain } from "./d6Kit";

/** `+ 5` / `- 5`, as FUN.7's own generator prints a joined constant. */
function tail(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** `+ 5x` / `- 5x`, for a joined middle term. */
function tailX(value: number): string {
  return `${value < 0 ? "-" : "+"} ${Math.abs(value)}x`;
}

function linTex(slope: number, constant: number): string {
  return `${slope}x ${tail(constant)}`;
}

/** The heading over the box the input reaches first, and over the one that takes its output. */
const FIRST = "\\text{acts first, on the input}";
const SECOND = "\\text{acts second, on what it was handed}";

/**
 * The chain for a line and a square composed at a value, either way round.
 *
 * Exported because FUN.7's CHECK asks the practice pool's own question — a linear $f$, a
 * square $g$, and $(f \circ g)$ at a number — and used to answer it with a reduction column
 * while every practice card answered it with this chain. Two figures for one question is
 * worse than either of them: a learner who met the chain in practice and the column in the
 * check has to recognise them as the same argument before they can use the second one. So
 * `cfu.fun7.compose-evaluate` calls THIS, with `order` pinned to the direction its prompt
 * always writes, rather than keeping a second drawing of the same shape in step.
 */
export function composeOrderChain(params: Record<string, number>): JSX.Element {
  const order = params.order ?? 0;
  const a = params.a ?? 3;
  const b = params.b ?? -4;
  const k = params.k ?? 5;
  const n = params.n ?? 2;
  const inner = order === 1 ? a * n + b : n * n + k;
  const value = order === 1 ? inner * inner + k : a * inner + b;
  const composite = order === 1 ? "(g \\circ f)" : "(f \\circ g)";
  const stages: ChainStage[] = [
    {
      heading: FIRST,
      body:
        order === 1
          ? `f(${n}) = ${a}(${n}) ${tail(b)} = ${inner}`
          : `g(${n}) = (${n})^{2} ${tail(k)} = ${inner}`,
      out: `\\text{hands on } ${inner}`,
    },
    {
      heading: SECOND,
      body:
        order === 1
          ? `g(${inner}) = (${inner})^{2} ${tail(k)} = ${value}`
          : `f(${inner}) = ${a}(${inner}) ${tail(b)} = ${value}`,
    },
  ];
  return (
    <D6Chain
      input={`x = ${n}`}
      stages={stages}
      answer={`${composite}(${n}) = ${value}`}
      title="The order taken off the notation, with the inner machine drawn first"
      ariaLabel={`The ${order === 1 ? "f then g" : "g then f"} order at ${spoken(n)}, which passes through ${spoken(inner)} and lands on ${spoken(value)}`}
    />
  );
}

export const FUN7_PRACTICE_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** Two linear machines coupled in series, evaluated at one dial setting. */
  "d6.fun7.series-value.l1": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? -4;
      const c = params.c ?? 2;
      const d = params.d ?? 5;
      const n = params.n ?? 4;
      const inner = c * n + d;
      const value = a * inner + b;
      const stages: ChainStage[] = [
        {
          heading: FIRST,
          body: `g(${n}) = ${c}(${n}) ${tail(d)} = ${inner}`,
          out: `\\text{hands on } ${inner}`,
        },
        { heading: SECOND, body: `f(${inner}) = ${a}(${inner}) ${tail(b)} = ${value}` },
      ];
      return (
        <D6Chain
          input={`x = ${n}`}
          stages={stages}
          answer={`(f \\circ g)(${n}) = ${value}`}
          title="Two machines coupled in a line, with the value carried between them"
          ariaLabel={`A setting of ${spoken(n)} into g gives ${spoken(inner)}, and ${spoken(inner)} into f gives ${spoken(value)}`}
        />
      );
    },
    caption: (params) => {
      const n = params.n ?? 4;
      const inner = (params.c ?? 2) * n + (params.d ?? 5);
      return `$g$ is the machine the dial is wired to, so it goes first, and $f$ never sees the setting $${n}$ at all: it sees $${inner}$. Feeding $${n}$ into $f$ instead answers a different question, and the numbers here are chosen so that it gives a different number too.`;
    },
  },

  /** The order read off the circle notation, with the inner machine named by position. */
  "d6.fun7.order-value.l2": {
    Svg: composeOrderChain,
    caption: (params) => {
      const order = params.order ?? 0;
      const inner = order === 1 ? "f" : "g";
      const outer = order === 1 ? "g" : "f";
      return `The notation is read from the INSIDE out: in $${order === 1 ? "(g \\circ f)(x)" : "(f \\circ g)(x)"}$ the machine written closest to the $x$ is $${inner}$, so $${inner}$ acts first and $${outer}$ takes its output. Reading it left to right runs the chain backwards, and the two orders give different numbers here.`;
    },
  },

  /** Two lines composed symbolically, so `x` runs the chain instead of a value. */
  "d6.fun7.linear-formula.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? -4;
      const c = params.c ?? 2;
      const d = params.d ?? 5;
      const coeff = a * c;
      const konst = a * d + b;
      const stages: ChainStage[] = [
        {
          heading: FIRST,
          body: `g(x) = ${linTex(c, d)}`,
          out: `\\text{hands on } ${linTex(c, d)}`,
        },
        {
          heading: SECOND,
          body: `f(g(x)) = ${a}(${linTex(c, d)}) ${tail(b)}`,
        },
      ];
      return (
        <D6Chain
          input="x"
          stages={stages}
          answer={`(f \\circ g)(x) = ${coeff}x ${tail(konst)}`}
          title="Two lines composed into one rule, with the inner rule substituted whole"
          ariaLabel={`Substituting g's rule into f gives ${spoken(coeff)} x ${konst < 0 ? "minus" : "plus"} ${spoken(Math.abs(konst))}`}
        />
      );
    },
    caption: (params) => {
      const a = params.a ?? 3;
      const d = params.d ?? 5;
      const b = params.b ?? -4;
      return `The whole inner rule goes where $f$'s own $x$ was, brackets and all, and the $${a}$ then multiplies BOTH terms inside them: that is where $${a} \\times ${d} = ${a * d}$ comes from, before $f$'s own $${b < 0 ? `-${Math.abs(b)}` : `+${b}`}$ joins it. Distributing over only the first term is the usual slip, and it leaves the coefficient right and the constant wrong.`;
    },
  },

  /** A line handed into a square, so the bracket has to be expanded. */
  "d6.fun7.square-outer.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? -2;
      const e = params.e ?? 5;
      const lead = a * a;
      const mid = 2 * a * b;
      const konst = b * b + e;
      const stages: ChainStage[] = [
        {
          heading: FIRST,
          body: `g(x) = ${linTex(a, b)}`,
          out: `\\text{hands on } ${linTex(a, b)}`,
        },
        {
          heading: SECOND,
          body: `f(g(x)) = (${linTex(a, b)})^{2} ${tail(e)}`,
        },
      ];
      return (
        <D6Chain
          input="x"
          stages={stages}
          answer={`${lead}x^{2} ${tailX(mid)} ${tail(konst)}`}
          title="A line substituted inside a square, which then has to be expanded"
          ariaLabel={`Squaring g's rule gives ${spoken(lead)} x squared ${mid < 0 ? "minus" : "plus"} ${spoken(Math.abs(mid))} x ${konst < 0 ? "minus" : "plus"} ${spoken(Math.abs(konst))}`}
        />
      );
    },
    caption: (params) => {
      const a = params.a ?? 3;
      const b = params.b ?? -2;
      const e = params.e ?? 5;
      return `Squaring a bracket is not squaring its terms: the middle term $${2 * a * b < 0 ? "-" : ""}${Math.abs(2 * a * b)}x$ comes from $2 \\times ${a}x \\times ${b < 0 ? `(${b})` : b}$ and is the part that goes missing. The constant is $${b} \\times ${b} ${tail(e)} = ${b * b + e}$, so $f$'s own $${Math.abs(e)}$ is added AFTER the square, not inside it.`;
    },
  },

  /** A square handed into a line, where nothing needs expanding at all. */
  "d6.fun7.square-inner.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? -4;
      const e = params.e ?? 5;
      const konst = a * e + b;
      const stages: ChainStage[] = [
        {
          heading: FIRST,
          body: `f(x) = x^{2} ${tail(e)}`,
          out: `\\text{hands on } x^{2} ${tail(e)}`,
        },
        {
          heading: SECOND,
          body: `g(f(x)) = ${a}(x^{2} ${tail(e)}) ${tail(b)}`,
        },
      ];
      return (
        <D6Chain
          input="x"
          stages={stages}
          answer={`${a}x^{2} ${tail(konst)}`}
          title="A square substituted inside a line, which needs only distributing"
          ariaLabel={`Substituting f's rule into g gives ${spoken(a)} x squared ${konst < 0 ? "minus" : "plus"} ${spoken(Math.abs(konst))}`}
        />
      );
    },
    caption: (params) => {
      const a = params.a ?? 3;
      return `This is the same pair the other way round, and it is much less work: the square is already there, so the $${a}$ only has to be distributed across two terms and no bracket is expanded. The two orders give different rules, and comparing this answer with the other one is the clearest evidence that composition does not commute.`;
    },
  },
};
