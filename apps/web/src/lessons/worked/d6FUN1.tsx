/**
 * Worked-solution figures for D6's FUN.1 practice templates: function notation, evaluating a
 * rule at a value, and reading whether a relation is a function at all.
 *
 * Four of the five are reduction columns, because four of the five ARE reductions: a rule with a
 * letter in it becomes a rule with a number in it, and then a number. The column is what this
 * tree draws an algebraic chain with, and the substitution row is where the work is, so the
 * substituted value is inked apart on the row that introduces it.
 *
 * The fifth is a LEDGER, because its prompt is four tables and its answer is a per-table
 * verdict. What it can show is limited by what the bank records: `params` carries the count and
 * the bit mask of which logs pass, not the pairs themselves, which are drawn from the rng and
 * gone by the time a figure is rendered. So the ledger names the four logs as the prompt names
 * them and puts the verdict against each, which is the shape of the reading; the pairs stay in
 * the prompt above it, where the learner is still looking at them.
 *
 * `NAMES` and `VARS` are copied from the bank's own file. That is a mirror, and it is worth
 * being clear about what it can cost: if the bank's letters change, a figure prints `f` where
 * the prompt printed `g`. It cannot make an ANSWER wrong, which is the failure mode that
 * matters, and the alternative is exporting two four-element arrays across a package boundary
 * for the sake of a letter.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, LABEL, SIGNAL } from "../svgKit";
import {
  ExpressionReductionWorked,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";
import { D6Ledger, type LedgerRow, sp } from "./d6Kit";

/** The function letters FUN.1 draws from, in the bank's order. */
const NAMES = ["f", "g", "h", "p"] as const;

/** And the input letter each one is written in. */
const VARS = ["x", "t", "n", "s"] as const;

/** The four logs, named as FUN.1's prompt names them. */
const LOG_LABELS = ["A", "B", "C", "D"] as const;

function nameOf(index: number): string {
  return NAMES[Math.min(Math.max(index, 0), 3)] as string;
}

function varOf(index: number): string {
  return VARS[Math.min(Math.max(index, 0), 3)] as string;
}

/** `+ 5` or `- 5`, joined onto a term already written, as the bank prints it. */
function signTerm(value: number): string {
  return `${value < 0 ? "-" : "+"} ${Math.abs(value)}`;
}

/** A leading coefficient: `1` is not written in front of a term. */
function lead(value: number): string {
  return value === 1 ? "" : `${value}`;
}

/** What a log records twice, and the two different motions it records against it. */
interface Violation {
  label: string;
  repeated: number;
  one: number;
  two: number;
}

/**
 * The break in log `index`, or `null` when the params do not record one.
 *
 * The bank writes `rep`/`one`/`two` per log and zeroes them on a log that passes, and zero is
 * outside both the settings and the motions it draws from, so a zero here means "no violation
 * recorded" and never "the setting nought". Two motions that came out equal would not be a
 * violation either, so that is refused as well rather than printed as one.
 */
function violationAt(params: Record<string, number>, index: number): Violation | null {
  const repeated = params[`rep${index}`] ?? 0;
  const one = params[`one${index}`] ?? 0;
  const two = params[`two${index}`] ?? 0;
  if (repeated === 0 || one === two) {
    return null;
  }
  return { label: LOG_LABELS[index] ?? "", repeated, one, two };
}

/** The first recorded break, for a caption that names one rather than gesturing at all four. */
function firstViolation(params: Record<string, number>): Violation | null {
  const mask = params.mask ?? 3;
  for (const index of [0, 1, 2, 3]) {
    if ((mask & (1 << index)) === 0) {
      const found = violationAt(params, index);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
}

/**
 * The verdict cell: the two rows that clash, where the bank recorded them.
 *
 * A cell reading only "one setting, two motions" is the RULE restated, and the learner still
 * has to find which of the log's three rows broke it. The pair does the pointing, and it falls
 * back to the rule when the params carry no break to point at.
 */
function verdictTex(
  passes: boolean,
  params: Record<string, number>,
  index: number,
): string {
  if (passes) {
    return "\\text{yes}";
  }
  const found = violationAt(params, index);
  return found === null
    ? "\\text{no: one setting, two motions}"
    : `\\text{no: } (${found.repeated},\\, ${found.one}) \\text{ and } (${found.repeated},\\, ${found.two})`;
}

export const FUN1_PRACTICE_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** One value into a two-term rule, with the substituted input inked apart. */
  "d6.fun1.evaluate-rule.l1": {
    Svg: (params): JSX.Element => {
      const name = nameOf(params.nameIndex ?? 0);
      const v = varOf(params.nameIndex ?? 0);
      const a = params.a ?? 4;
      const b = params.b ?? 25;
      const k = params.k ?? 3;
      const value = b - a * k;
      const rows: ReductionRow[] = [
        { tokens: [{ text: `${name}(${v}) = ${b} - ${a}${v}`, color: LABEL }] },
        { tokens: [{ text: `${name}(${k}) = ${b} - ${a}(${k})`, color: SIGNAL }] },
        { tokens: [{ text: `${name}(${k}) = ${b} - ${a * k}`, color: SIGNAL }] },
        { tokens: [{ text: `${name}(${k}) = ${value}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Evaluating the rule ${b} minus ${a} times the input at ${spoken(k)}, which gives ${spoken(value)}`}
          title="A rule evaluated at one setting, a row at a time"
        />
      );
    },
    caption: (params) => {
      const v = varOf(params.nameIndex ?? 0);
      const k = params.k ?? 3;
      return `The notation names the input: $${nameOf(params.nameIndex ?? 0)}(${k})$ asks for the output when $${v}$ is $${k}$, so every $${v}$ in the rule is replaced by $${k}$ and the rest is arithmetic.`;
    },
  },

  /** A negative input into a squared rule, where the square turns the sign back. */
  "d6.fun1.evaluate-negative.l2": {
    Svg: (params): JSX.Element => {
      const name = nameOf(params.nameIndex ?? 0);
      const v = varOf(params.nameIndex ?? 0);
      const b = params.b ?? 5;
      const c = params.c ?? -3;
      const k = params.k ?? 4;
      const value = k * k - b * k + c;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `${name}(${v}) = ${v}^{2} ${signTerm(b)}${v} ${signTerm(c)}`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `${name}(-${k}) = (-${k})^{2} ${signTerm(b)}(-${k}) ${signTerm(c)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [
            { text: `${name}(-${k}) = ${k * k} - ${b * k} ${signTerm(c)}`, color: SIGNAL },
          ],
        },
        { tokens: [{ text: `${name}(-${k}) = ${value}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Evaluating a squared rule at negative ${spoken(k)}, where the square gives positive ${spoken(k * k)} and the middle term stays negative, for ${spoken(value)}`}
          title="A negative input, with the square and the middle term treated separately"
        />
      );
    },
    caption: (params) => {
      const k = params.k ?? 4;
      const b = params.b ?? 5;
      return `Both parentheses matter and they do different things. Squaring $-${k}$ gives $+${k * k}$, because a negative times a negative is positive; the middle term multiplies $${b}$ by $-${k}$ and STAYS negative. A learner who drops the parentheses squares only the ${k} and loses the first sign.`;
    },
  },

  /** The four logs, each failure quoting the two rows that break it. */
  "d6.fun1.log-function-count.l2": {
    Svg: (params): JSX.Element => {
      const count = params.count ?? 2;
      const mask = params.mask ?? 3;
      const rows: LedgerRow[] = LOG_LABELS.map((label, index) => {
        const passes = (mask & (1 << index)) !== 0;
        return {
          cells: [`\\text{${label}}`, verdictTex(passes, params, index)],
          tone: passes ? "pick" : "bad",
        } satisfies LedgerRow;
      });
      return (
        <D6Ledger
          columns={["\\text{log}", "\\text{is the motion a function of the setting?}"]}
          rows={rows}
          footers={[`\\text{logs that pass} = ${count}`]}
          title="The four logs, with the clashing pair quoted against every log that fails"
          ariaLabel={`Four logs ruled one at a time, of which ${spoken(count)} record one motion per setting; each of the others names the setting it records twice and the two motions against it`}
        />
      );
    },
    caption: (params) => {
      const named = firstViolation(params);
      const where =
        named === null
          ? "Each failing log has the two clashing rows quoted beside it, so the reading can be checked against the pairs in the prompt rather than taken on trust."
          : `Each failing log has the two clashing rows quoted beside it: log ${named.label} records the setting $${named.repeated}$ against $${named.one}$ and again against $${named.two}$, so the reading can be checked against the pairs in the prompt rather than taken on trust.`;
      return `The test is one output per INPUT, so a log fails only when the same setting appears twice with different motions against it. ${where} A repeated MOTION breaks nothing: two settings are allowed to produce the same reading, and half the passing logs here do exactly that, which is what catches a learner scanning for any repeated number.`;
    },
  },

  /** The rule set equal to a known output and unwound one move at a time. */
  "d6.fun1.solve-setting.l3": {
    Svg: (params): JSX.Element => {
      const name = nameOf(params.nameIndex ?? 0);
      const v = varOf(params.nameIndex ?? 0);
      const a = params.a ?? 4;
      const b = params.b ?? -7;
      const input = params.input ?? 5;
      const output = a * input + b;
      const rows: ReductionRow[] = [
        { tokens: [{ text: `${name}(${v}) = ${a}${v} ${signTerm(b)}`, color: LABEL }] },
        { tokens: [{ text: `${a}${v} ${signTerm(b)} = ${output}`, color: SIGNAL }] },
        { tokens: [{ text: `${a}${v} = ${output - b}`, color: SIGNAL }] },
        { tokens: [{ text: `${v} = ${input}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Solving ${a} times the input ${b < 0 ? "minus" : "plus"} ${spoken(Math.abs(b))} equals ${spoken(output)}, which gives ${spoken(input)}`}
          title="A known output run backwards to the setting that produced it"
        />
      );
    },
    caption: (params) => {
      const name = nameOf(params.nameIndex ?? 0);
      const v = varOf(params.nameIndex ?? 0);
      return `This is the reverse of evaluating. $${name}(${v})$ is the OUTPUT, so setting it equal to the given number turns the rule into an equation, and the input is what is left when the constant comes off and the coefficient is divided away.`;
    },
  },

  /** Both inputs evaluated on their own rows, then combined the way the prompt asks. */
  "d6.fun1.opposite-inputs.l3": {
    Svg: (params): JSX.Element => {
      const name = nameOf(params.nameIndex ?? 0);
      const v = varOf(params.nameIndex ?? 0);
      const a = params.a ?? 2;
      const b = params.b ?? 5;
      const c = params.c ?? -3;
      const k = params.k ?? 3;
      const op = params.op ?? 0;
      const atNegative = a * k * k - b * k + c;
      const atPositive = a * k * k + b * k + c;
      const value = op === 0 ? atNegative + atPositive : atNegative - atPositive;
      const sign = op === 0 ? "+" : "-";
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `${name}(${v}) = ${lead(a)}${v}^{2} ${signTerm(b)}${v} ${signTerm(c)}`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `${name}(-${k}) = ${lead(a)}(-${k})^{2} ${signTerm(b)}(-${k}) ${signTerm(c)}`,
              color: SIGNAL,
            },
          ],
        },
        { tokens: [{ text: `${name}(-${k}) = ${atNegative}`, color: SIGNAL }] },
        { tokens: [{ text: `${name}(${k}) = ${atPositive}`, color: BRICK }] },
        {
          tokens: [
            { text: `${atNegative} ${sign} ${sp(atPositive)} = ${value}`, color: CIVIC },
          ],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Evaluating at negative ${spoken(k)} for ${spoken(atNegative)} and at ${spoken(k)} for ${spoken(atPositive)}, then combining them for ${spoken(value)}`}
          title="Two opposite inputs evaluated apart, then combined"
        />
      );
    },
    caption: (params) => {
      const k = params.k ?? 3;
      const op = params.op ?? 0;
      return `Two separate evaluations, then one combination. The squared term gives the same number at $-${k}$ and at $${k}$; only the middle term changes sign, which is why the two outputs differ at all. ${op === 0 ? "Adding them doubles the parts that did not change and cancels the part that did" : "Subtracting them cancels the parts that did not change and leaves twice the middle term"}, and the parentheses on the second output keep its own sign intact.`;
    },
  },
};
