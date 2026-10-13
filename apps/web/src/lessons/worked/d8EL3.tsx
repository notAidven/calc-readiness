/**
 * Worked-solution figures for the D8 EL.3 practice templates (a logarithm is an exponent:
 * evaluate one, or recover the argument or the base from one).
 *
 * Three of the five shapes are searches along a ladder, and it is the SAME picture with a
 * different rung held fixed: the evaluation shapes walk the exponent with the base pinned, and
 * the missing-base shape walks the base with the exponent pinned. `PowerRungs` draws both,
 * because what a learner has to see is which of the three numbers is being varied, and a
 * column of steps that all looked alike is how the base ends up varied in a question about the
 * exponent.
 *
 * The conversion shape gets the only figure that is not a search: nothing has to be tried,
 * because the three numbers are already given and the work is entirely in which role each one
 * plays. `FormBridge` names those roles between the two forms rather than after them.
 *
 * The natural-logarithm shape is a genuine reduction (a reciprocal becomes a negative
 * exponent, and then the logarithm reads it off), so it is `ExpressionReductionWorked`, the
 * shared column.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for each
 * one, and recomputes what `generate()` computed rather than being told the answer: the rung
 * that is highlighted is found by comparing values, so a figure cannot highlight a rung that
 * the arithmetic does not support.
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
/* The rung ladder (evaluate, and solve for the base)                          */
/* -------------------------------------------------------------------------- */

interface Rung {
  latex: string;
  /** The one rung the search stops on. Exactly one is expected. */
  hit: boolean;
}

/**
 * A short column of candidate statements with the one that lands marked, under the question
 * being asked and above the answer it produces.
 *
 * The marked rung is boxed AND recoloured, because the box is what says "the search stopped
 * here" to a learner who cannot separate the hues.
 */
function PowerRungs({
  question,
  rungs,
  answer,
  ariaLabel,
  title,
}: {
  question: string;
  rungs: readonly Rung[];
  answer: string;
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const firstY = 62;
  const pitch = 26;
  const rungY = (index: number): number => firstY + index * pitch;
  const answerY = rungY(rungs.length - 1) + 38;
  const height = answerY + 24;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <SvgMath latex={question} x={220} y={28} fontSize={18} color={LABEL} w={420} />
      <line x1={30} y1={44} x2={410} y2={44} stroke={LINE} strokeWidth={1} />

      {rungs.map((rung, index) => (
        <g key={`rung-${rung.latex}`}>
          {rung.hit && (
            <rect
              x={128}
              y={rungY(index) - 13}
              width={184}
              height={26}
              rx={6}
              fill="none"
              stroke={CIVIC}
              strokeWidth={1.4}
            />
          )}
          <SvgMath
            latex={rung.latex}
            x={220}
            y={rungY(index)}
            fontSize={15}
            color={rung.hit ? CIVIC : SOFT}
            w={176}
          />
        </g>
      ))}

      <SvgMath latex={answer} x={220} y={answerY} fontSize={18} color={CIVIC} w={420} />
    </svg>
  );
}

/** The powers of ten from $10^{1}$ out to $10^{k}$, in whichever direction `k` lies. */
function tenRungs(k: number): Rung[] {
  const exponents =
    k > 0
      ? Array.from({ length: k }, (_, index) => index + 1)
      : Array.from({ length: -k }, (_, index) => -(index + 1));
  return exponents.map((e) => ({
    latex: `10^{${e}} = ${numStr(10 ** e)}`,
    hit: e === k,
  }));
}

/** The base's own powers, climbed from the first factor up to the one that lands. */
function climbRungs(b: number, k: number): Rung[] {
  return Array.from({ length: k }, (_, index) => index + 1).map((e) => ({
    latex: `${b}^{${e}} = ${b ** e}`,
    hit: e === k,
  }));
}

/** Candidate BASES at one fixed exponent: the other search, run along the other axis. */
function baseRungs(b: number, k: number): Rung[] {
  const from = Math.max(2, b - 2);
  return Array.from({ length: b - from + 1 }, (_, index) => from + index).map(
    (candidate) => ({
      latex: `${candidate}^{${k}} = ${candidate ** k}`,
      hit: candidate === b,
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* The two forms, with the roles named between them                            */
/* -------------------------------------------------------------------------- */

/**
 * One statement in both forms, with the three roles laid out in between.
 *
 * The roles are what the shape is actually about: every number is already on the board, so the
 * only thing that can go wrong is putting one of them in the wrong place, and the swap that
 * does it is invisible in a figure that only prints the two forms one above the other.
 */
function FormBridge({
  base,
  exponent,
  ariaLabel,
}: {
  base: number;
  exponent: number;
  ariaLabel: string;
}): JSX.Element {
  // The result stays the unknown for as long as the figure is describing the STATEMENT: it is
  // what the shape asks for, and printing its value in the two forms above would answer the
  // question in the middle of explaining how the question is read.
  const columns: readonly { label: string; latex: string; x: number }[] = [
    { label: "base", latex: numStr(base), x: 92 },
    { label: "exponent", latex: numStr(exponent), x: 220 },
    { label: "result", latex: "y", x: 348 },
  ];

  return (
    <svg viewBox="0 0 440 186" role="img" aria-label={ariaLabel}>
      <title>One statement in logarithm form and in exponential form</title>

      <SvgMath
        latex={`\\log_{${numStr(base)}} y = ${numStr(exponent)}`}
        x={220}
        y={28}
        fontSize={18}
        color={LABEL}
        w={420}
      />

      {columns.map((column) => (
        <g key={column.label}>
          <text x={column.x} y={62} textAnchor="middle" fontSize={11} fill={SOFT}>
            {column.label}
          </text>
          <SvgMath
            latex={column.latex}
            x={column.x}
            y={86}
            fontSize={16}
            color={SIGNAL}
            w={112}
          />
        </g>
      ))}

      <line x1={30} y1={110} x2={410} y2={110} stroke={LINE} strokeWidth={1} />

      <SvgMath
        latex={`${numStr(base)}^{${numStr(exponent)}} = y`}
        x={220}
        y={134}
        fontSize={18}
        color={LABEL}
        w={420}
      />

      <SvgMath
        latex={`y = ${numStr(base)}^{${numStr(exponent)}} = ${numStr(base ** exponent)}`}
        x={220}
        y={166}
        fontSize={18}
        color={CIVIC}
        w={420}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Row builder for the natural logarithm                                       */
/* -------------------------------------------------------------------------- */

/**
 * `ln` undoes a power of $e$, and a power of $e$ in a denominator is that power with a
 * negative exponent. The reciprocal draw earns the extra row, because it is where the sign
 * comes from; the written draw has the exponent in front of it already.
 */
/**
 * The same reduction at a base that is written out, where recognising the power is the work.
 *
 * `naturalRows` can go straight from the reciprocal to the sign because $\ln$'s argument
 * already prints its power of $e$. Off base $e$ the denominator is a plain number, so the
 * column earns one row the natural-logarithm figure does not need: the denominator named as
 * a power of the base, before anything is done about the sign.
 */
function reciprocalBaseRows(b: number, k: number): ReductionRow[] {
  return [
    { tokens: [{ text: `\\log_{${b}} \\dfrac{1}{${b ** k}}`, color: LABEL }] },
    { tokens: [{ text: `${b ** k} = ${b}^{${k}}`, color: SIGNAL }] },
    { tokens: [{ text: `\\dfrac{1}{${b}^{${k}}} = ${b}^{-${k}}`, color: SIGNAL }] },
    { tokens: [{ text: `\\log_{${b}} ${b}^{-${k}} = -${k}`, color: CIVIC }] },
  ];
}

function naturalRows(reciprocal: boolean, n: number, written: number): ReductionRow[] {
  if (reciprocal) {
    return [
      { tokens: [{ text: `\\ln \\dfrac{1}{e^{${n}}}` }] },
      { tokens: [{ text: `\\dfrac{1}{e^{${n}}} = e^{-${n}}`, color: SIGNAL }] },
      { tokens: [{ text: `\\ln e^{-${n}} = -${n}`, color: CIVIC }] },
    ];
  }
  return [
    { tokens: [{ text: `\\ln e^{${written}}`, color: LABEL }] },
    { tokens: [{ text: `\\ln \\text{ has base } e`, color: SIGNAL }] },
    { tokens: [{ text: `\\ln e^{${written}} = ${written}`, color: CIVIC }] },
  ];
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const EL3_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d8.el3.evaluate-common.l1": {
    Svg: ({ k = 1 }) => (
      <PowerRungs
        question={`\\log ${numStr(10 ** k)} = \\;?`}
        rungs={tenRungs(k)}
        answer={`\\log ${numStr(10 ** k)} = ${numStr(k)}`}
        ariaLabel={`Walking the powers of 10 to reach ${numStr(10 ** k)}, which takes exponent ${spoken(k)}`}
        title="The powers of ten, walked until one lands"
      />
    ),
    caption: ({ k = 1 }) =>
      k > 0
        ? `A $\\log$ with no base written is the common logarithm, so its base is $10$. Walking up the powers of $10$ lands on $${numStr(10 ** k)}$ at exponent $${numStr(k)}$.`
        : `A $\\log$ with no base written is the common logarithm, so its base is $10$. A number below $1$ is reached by walking DOWN, into the negative exponents, which is why $\\log ${numStr(10 ** k)} = ${numStr(k)}$.`,
  },

  "d8.el3.evaluate-base.l2": {
    Svg: ({ b = 2, k = 2, value = 4 }) => (
      <PowerRungs
        question={`\\log_{${b}} ${value} = \\;?`}
        rungs={climbRungs(b, k)}
        answer={`\\log_{${b}} ${value} = ${k}`}
        ariaLabel={`Climbing the powers of ${spoken(b)} to reach ${spoken(value)}, which takes ${spoken(k)} factors`}
        title="The base's own powers, climbed one factor at a time"
      />
    ),
    caption: ({ b = 2, k = 2, value = 4 }) =>
      `Off base $10$ there are no zeros to count, so the base's own powers are climbed instead. The ladder reaches $${value}$ after $${k}$ factors of $${b}$, and that COUNT is what $\\log_{${b}} ${value}$ hands back.`,
  },

  "d8.el3.to-exponential.l2": {
    Svg: ({ b = 2, k = 2 }) => (
      <FormBridge
        base={b}
        exponent={k}
        ariaLabel={`The statement log base ${spoken(b)} of y equals ${spoken(k)} rewritten as ${spoken(b)} to the ${spoken(k)} equals y, giving ${spoken(b ** k)}`}
      />
    ),
    caption: ({ b = 2, k = 2 }) =>
      `Nothing has to be searched for here: all three numbers are given and only their ROLES move. The base stays the base, the value the logarithm equals becomes the exponent, and what is left is a power to evaluate: $${b}^{${k}} = ${b ** k}$.`,
  },

  "d8.el3.reciprocal-base.l2": {
    // `value` is recomputed from `b` and `k` rather than read, so a CFU reaching this entry
    // with a hand-written param set cannot print a denominator the power above it does not
    // produce. `d8.el3.evaluate-base.l2` already gets `k: 5` from a check, outside its
    // template's own range, so the range is not something a figure here may lean on.
    Svg: ({ b = 2, k = 2 }) => (
      <ExpressionReductionWorked
        rows={reciprocalBaseRows(b, k)}
        title="A reciprocal argument is the base's power with a negative exponent"
        ariaLabel={`One over ${spoken(b ** k)} is ${spoken(b)} to the negative ${spoken(k)}, so the logarithm to base ${spoken(b)} of it is negative ${spoken(k)}`}
      />
    ),
    caption: ({ b = 2, k = 2 }) =>
      `Below $1$ a logarithm still hands back an exponent, and off base $10$ there are no zeros to count. So the denominator is named as a power of the base first, $${b ** k} = ${b}^{${k}}$, and the reciprocal then carries that same power with its sign turned around.`,
  },

  "d8.el3.evaluate-natural.l3": {
    Svg: ({ reciprocal = 0, n = 2, written = 2 }) => (
      <ExpressionReductionWorked
        rows={naturalRows(reciprocal === 1, n, written)}
        title="The natural logarithm returns the exponent on e"
        ariaLabel={
          reciprocal === 1
            ? `One over e to the ${spoken(n)} is e to the negative ${spoken(n)}, so the natural logarithm of it is negative ${spoken(n)}`
            : `The natural logarithm of e to the ${spoken(written)} is ${spoken(written)}`
        }
      />
    ),
    caption: ({ reciprocal = 0, n = 2, written = 2 }) =>
      reciprocal === 1
        ? `$\\ln$ is the logarithm with base $e$, so it hands back the exponent on $e$. The power sits in a denominator, and a reciprocal is a negative power, so the exponent it hands back is $-${n}$.`
        : `$\\ln$ is the logarithm with base $e$, so it hands back the exponent on $e$ exactly as it stands, sign included: $${numStr(written)}$.`,
  },

  "d8.el3.missing-base.l3": {
    Svg: ({ b = 2, k = 2, value = 4 }) => (
      <PowerRungs
        question={`\\log_{b} ${value} = ${k} \\;\\Rightarrow\\; b^{${k}} = ${value}`}
        rungs={baseRungs(b, k)}
        answer={`b = ${b}`}
        ariaLabel={`Trying candidate bases at exponent ${spoken(k)} until one reaches ${spoken(value)}, which is base ${spoken(b)}`}
        title="Candidate bases at one fixed exponent"
      />
    ),
    caption: ({ b = 2, k = 2, value = 4 }) =>
      `The unknown is the BASE this time, so the ladder cannot be climbed from it. In exponential form the statement reads $b^{${k}} = ${value}$, and trying the small whole numbers at that same exponent settles it: $b = ${b}$.`,
  },
};
