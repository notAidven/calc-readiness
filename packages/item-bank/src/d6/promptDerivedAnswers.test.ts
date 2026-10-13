/**
 * Every D6 answer key, re-derived from the RENDERED PROMPT TEXT.
 *
 * `validateTemplates` grades each sampled key through the product checker, but it takes the
 * key AS AUTHORED: a template whose prompt prints one problem and whose key answers another
 * passes it, because both halves come out of the same `generate()` closure and agree with
 * each other by construction. So does any sweep that re-derives from `template_params`, for
 * the same reason. During D6 authoring FUN.7 shipped a middle term written `- 8` where the
 * expansion wanted `- 8x`, and FUN.10 shipped a prompt reading `f((-5))`; both survived a
 * green `validateTemplates`, and each was caught only by re-solving the printed problem.
 *
 * The derivations below therefore read NOTHING but `prompt`. They parse the LaTeX a learner
 * actually sees, re-solve it with arithmetic written here rather than imported from the
 * template, and compare against `answer.answer_key`. A prompt that prints a coefficient the
 * key does not use, a reading the key does not use, or a bracket the parser cannot read
 * fails here. A prompt shape that stops matching its derivation's regex is a failure too,
 * deliberately: an unreadable prompt is the FUN.10 defect, not an excuse to skip a draw.
 *
 * ## The population
 *
 * Derived from `D6_PRACTICE_TEMPLATES`, the pool the domain actually ships, and asserted
 * equal to the case table in both directions, so a new template cannot join the pool without
 * a derivation and a derivation cannot outlive its template. Under that sit a floor on the
 * pool size and a per-node floor, because a floor constrains size and not shape: eleven
 * nodes each owe at least three derived templates, so the sweep cannot drift into measuring
 * one node deeply and the rest not at all.
 */

import { describe, expect, it } from "vitest";

import { createRng, type ItemTemplate } from "../template";
import { D6_PRACTICE_TEMPLATES } from "./index";

/* -------------------------------------------------------------------------- */
/* Reading the rendered LaTeX                                                  */
/* -------------------------------------------------------------------------- */

/** Array access that names what was missing instead of handing back `undefined`. */
function at<T>(items: readonly T[], index: number, what: string): T {
  const value = items[index];
  if (value === undefined) {
    throw new Error(`${what}: no entry at ${index}`);
  }
  return value;
}

/** A capture group that must have participated in the match. */
function group(match: RegExpMatchArray, index: number, what: string): string {
  const value = match[index];
  if (value === undefined) {
    throw new Error(`${what}: capture ${index} did not match`);
  }
  return value;
}

function must(
  match: RegExpMatchArray | null,
  what: string,
  prompt: string,
): RegExpMatchArray {
  if (!match) {
    throw new Error(`${what} could not be read from the prompt: ${prompt}`);
  }
  return match;
}

/** Every ordered pair written the way the prompts space them: `(x,\, y)`. */
function promptPoints(text: string): (readonly [number, number])[] {
  return [...text.matchAll(/\((-?\d+),\\,\s*(-?\d+)\)/g)].map(
    (match) => [Number(match[1]), Number(match[2])] as const,
  );
}

/**
 * LaTeX to a JS expression, over the shapes D6's prompts use: `\sqrt{}`, `\dfrac{}{}`, both
 * spellings of the absolute-value bars, `x^{2}`, `(x - 2)^2` and implicit multiplication.
 *
 * The two function names are carried as `#A` and `#S` until the implicit-multiplication pass
 * has run, because that pass would otherwise read the `s` of `sqrt` as a variable standing
 * next to a bracket.
 */
function texToJs(tex: string): string {
  let out = tex.trim();
  out = out.replace(/\\left\\lvert(.*?)\\right\\rvert/g, "#A($1)");
  out = out.replace(/\\left\|(.*?)\\right\|/g, "#A($1)");
  for (let guard = 0; guard < 20 && out.includes("\\sqrt"); guard += 1) {
    out = out.replace(/\\sqrt\{([^{}]*)\}/, "#S($1)");
  }
  out = out.replace(/\^\{([^{}]*)\}/g, "**($1)").replace(/\^(\d)/g, "**$1");
  for (let guard = 0; guard < 20 && out.includes("frac"); guard += 1) {
    out = out.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/, "(($1)/($2))");
  }
  out = out
    .replaceAll("\\cdot", "*")
    .replaceAll("\\times", "*")
    .replaceAll("\\left", "")
    .replaceAll("\\right", "")
    .replaceAll("\\,", " ")
    .replaceAll("\\;", " ");
  out = out
    .replace(/(\d)\s*([a-z(#])/g, "$1*$2")
    .replace(/\)\s*([a-z\d(#])/g, ")*$1")
    // `-x**6` is a syntax error in JS, which reads it as an ambiguous unary minus.
    .replace(/-\s*([a-z])\s*\*\*/g, "-1*$1**");
  if (/[\\{}]/.test(out)) {
    throw new Error(`unconverted LaTeX left in ${JSON.stringify(tex)} -> ${out}`);
  }
  return out.replaceAll("#A", "abs").replaceAll("#S", "sqrt");
}

/** A one-variable numeric function compiled out of the prompt's own LaTeX. */
function compileTex(tex: string, variable: string): (v: number) => number {
  const js = texToJs(tex);
  const fn = new Function("abs", "sqrt", variable, `"use strict"; return (${js});`) as (
    a: typeof Math.abs,
    s: typeof Math.sqrt,
    v: number,
  ) => number;
  return (v: number) => {
    try {
      const result = fn(Math.abs, Math.sqrt, v);
      return typeof result === "number" ? result : Number.NaN;
    } catch {
      return Number.NaN;
    }
  };
}

/* -------------------------------------------------------------------------- */
/* Small numeric toolkit                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Integer coefficients, lowest power first, of a function the prompt promises is a
 * polynomial. Fitted rather than parsed, then VERIFIED at every further input in a window: a
 * fit that rounded to the wrong integers cannot survive the verification, so this never
 * invents a polynomial for a function that is not one.
 *
 * The fitting points start at 1 rather than straddling 0, because a difference quotient is
 * the one shape here with a hole in it and the hole is at 0.
 */
function fitPolynomial(f: (v: number) => number, maxDegree: number): number[] {
  const size = maxDegree + 1;
  const rows: number[][] = [];
  for (let i = 0; i < size; i += 1) {
    const x = i + 1;
    const row: number[] = [];
    for (let power = 0; power < size; power += 1) {
      row.push(x ** power);
    }
    row.push(f(x));
    rows.push(row);
  }
  for (let col = 0; col < size; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < size; r += 1) {
      if (
        Math.abs(at(at(rows, r, "row"), col, "cell")) >
        Math.abs(at(at(rows, pivot, "row"), col, "cell"))
      ) {
        pivot = r;
      }
    }
    const swap = at(rows, col, "row");
    rows[col] = at(rows, pivot, "row");
    rows[pivot] = swap;
    const pivotRow = at(rows, col, "row");
    const pivotValue = at(pivotRow, col, "pivot");
    if (Math.abs(pivotValue) < 1e-12) {
      throw new Error("the sampled points do not determine a polynomial");
    }
    for (let r = 0; r < size; r += 1) {
      if (r === col) {
        continue;
      }
      const row = at(rows, r, "row");
      const factor = at(row, col, "cell") / pivotValue;
      for (let c = col; c <= size; c += 1) {
        row[c] = at(row, c, "cell") - factor * at(pivotRow, c, "cell");
      }
    }
  }
  const coefficients = rows.map((row, i) =>
    Math.round(at(row, size, "rhs") / at(row, i, "diag")),
  );
  let verified = 0;
  for (let x = -9; x <= 9; x += 1) {
    const actual = f(x);
    if (!Number.isFinite(actual)) {
      continue;
    }
    let sum = 0;
    for (let power = 0; power < coefficients.length; power += 1) {
      sum += at(coefficients, power, "coefficient") * x ** power;
    }
    if (Math.abs(sum - actual) > 1e-6) {
      throw new Error(
        `the fitted polynomial disagrees with the prompt at ${x}: ${sum} against ${actual}`,
      );
    }
    verified += 1;
  }
  // A floor, so a function undefined nearly everywhere cannot pass the verification by
  // having nothing left to check.
  if (verified < 12) {
    throw new Error(`only ${verified} inputs were available to verify the fit against`);
  }
  return coefficients;
}

/** `4x^2 + 12x + 18`, highest power first, zero terms dropped, `1` and `-1` unwritten. */
function polynomialText(coefficients: readonly number[], variable: string): string {
  const terms: string[] = [];
  for (let power = coefficients.length - 1; power >= 0; power -= 1) {
    const value = at(coefficients, power, "coefficient");
    if (value === 0) {
      continue;
    }
    const magnitude = Math.abs(value);
    const symbol = power === 0 ? "" : power === 1 ? variable : `${variable}^${power}`;
    const digits = magnitude === 1 && power > 0 ? "" : `${magnitude}`;
    const body = `${digits}${symbol}`;
    if (terms.length === 0) {
      terms.push(value < 0 ? `-${body}` : body);
    } else {
      terms.push(value < 0 ? `- ${body}` : `+ ${body}`);
    }
  }
  return terms.length === 0 ? "0" : terms.join(" ");
}

/** Integers in a wide window at which two prompt-derived functions agree. */
function integerSolutions(
  left: (v: number) => number,
  right: (v: number) => number,
  span = 200,
): number[] {
  const found: number[] = [];
  for (let x = -span; x <= span; x += 1) {
    const a = left(x);
    const b = right(x);
    if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9) {
      found.push(x);
    }
  }
  return found;
}

interface Piece {
  low: number;
  lowClosed: boolean;
  high: number;
  highClosed: boolean;
}

const NEGATIVE_INFINITY_TEXT = "-inf";
const POSITIVE_INFINITY_TEXT = "inf";

function intervalText(piece: Piece): string {
  const low =
    piece.low === Number.NEGATIVE_INFINITY ? NEGATIVE_INFINITY_TEXT : `${piece.low}`;
  const high =
    piece.high === Number.POSITIVE_INFINITY ? POSITIVE_INFINITY_TEXT : `${piece.high}`;
  const open = piece.lowClosed ? "[" : "(";
  const close = piece.highClosed ? "]" : ")";
  return `${open}${low}, ${high}${close}`;
}

/**
 * The set of inputs the prompt's own expression is defined at, as intervals.
 *
 * Walked as CELLS -- each integer, and each open gap between neighbouring integers -- so a
 * single undefined integer punctures the run rather than being stepped over. Every boundary
 * D6 draws is an integer, and the scan window is far wider than any of them.
 */
function derivedDomain(f: (v: number) => number, limit = 60): Piece[] {
  const defined = (x: number) => Number.isFinite(f(x));
  const pieces: Piece[] = [];
  let current: Piece | null = null;
  const openCell = (low: number, high: number) => {
    if (current) {
      current.high = high;
      current.highClosed = false;
    } else {
      current = { low, lowClosed: false, high, highClosed: false };
    }
  };
  const closeRun = () => {
    if (current) {
      pieces.push(current);
      current = null;
    }
  };
  for (let k = -limit; k <= limit; k += 1) {
    if (k > -limit) {
      if (defined(k - 0.5)) {
        openCell(k - 1, k);
      } else {
        closeRun();
      }
    }
    if (defined(k)) {
      if (current) {
        current.high = k;
        current.highClosed = true;
      } else {
        current = { low: k, lowClosed: true, high: k, highClosed: true };
      }
    } else {
      closeRun();
    }
  }
  closeRun();
  return pieces.map((piece) => {
    const runsOffTheLeft = piece.low <= -limit;
    const runsOffTheRight = piece.high >= limit;
    return {
      low: runsOffTheLeft ? Number.NEGATIVE_INFINITY : piece.low,
      lowClosed: runsOffTheLeft ? false : piece.lowClosed,
      high: runsOffTheRight ? Number.POSITIVE_INFINITY : piece.high,
      highClosed: runsOffTheRight ? false : piece.highClosed,
    };
  });
}

function domainText(f: (v: number) => number): string {
  const pieces = derivedDomain(f);
  if (pieces.length === 0) {
    throw new Error("the prompt's expression is defined nowhere in the scanned window");
  }
  return pieces.map(intervalText).join(" U ");
}

/**
 * The set of outputs, for the one-sided shapes D6 asks about: a floor with no ceiling, or a
 * ceiling with no floor. Anything else throws rather than guessing a spelling.
 */
function rangeText(f: (v: number) => number): string {
  const values: number[] = [];
  for (let step = -600; step <= 600; step += 1) {
    const value = f(step / 2);
    if (Number.isFinite(value)) {
      values.push(value);
    }
  }
  if (values.length < 100) {
    throw new Error("too little of the prompt's expression is defined to read a range");
  }
  const low = Math.min(...values);
  const high = Math.max(...values);
  const far = Math.max(f(1e7), f(-1e7));
  const near = Math.min(f(1e7), f(-1e7));
  if (far > 1e6 && near > -1e6) {
    return intervalText({
      low,
      lowClosed: true,
      high: Number.POSITIVE_INFINITY,
      highClosed: false,
    });
  }
  if (near < -1e6 && far < 1e6) {
    return intervalText({
      low: Number.NEGATIVE_INFINITY,
      lowClosed: false,
      high,
      highClosed: true,
    });
  }
  throw new Error("the prompt's expression is bounded at neither end or at both");
}

function pointText(x: number, y: number): string {
  return `(${x}, ${y})`;
}

/* -------------------------------------------------------------------------- */
/* Shapes several derivations share                                            */
/* -------------------------------------------------------------------------- */

/** `The function $h$ is given by $h(n) = ...$`, as a compiled function of its own letter. */
function namedRule(prompt: string): {
  name: string;
  variable: string;
  f: (v: number) => number;
} {
  const match = must(
    prompt.match(/The function \$(\w)\$ is given by \$\w\((\w)\) = ([^$]+)\$/),
    "a named rule",
    prompt,
  );
  const variable = group(match, 2, "rule variable");
  return {
    name: group(match, 1, "rule name"),
    variable,
    f: compileTex(group(match, 3, "rule body"), variable),
  };
}

/** `ax + by = c` exactly as the CG.1 prompts print a line. */
function standardLine(span: string): { a: number; b: number; c: number } {
  const match = must(
    span.match(/^(-?\d*)x ([+-]) (\d*)y = (-?\d+)$/),
    "a standard-form line",
    span,
  );
  const leading = group(match, 1, "x coefficient");
  const magnitudeText = group(match, 3, "y coefficient");
  const magnitude = magnitudeText === "" ? 1 : Number(magnitudeText);
  return {
    a: leading === "" ? 1 : leading === "-" ? -1 : Number(leading),
    b: group(match, 2, "y sign") === "-" ? -magnitude : magnitude,
    c: Number(group(match, 4, "constant")),
  };
}

function exactQuotient(numerator: number, denominator: number): number {
  if (denominator === 0 || numerator % denominator !== 0) {
    throw new Error(`the prompt's numbers do not divide: ${numerator} / ${denominator}`);
  }
  return numerator / denominator;
}

/** The `\begin{cases}` block, as branches that can be tested against an input. */
function casesFromPrompt(prompt: string): {
  variable: string;
  evaluate: (input: number) => number;
} {
  const match = must(
    prompt.match(/\$\w\((\w)\) = \\begin\{cases\}(.+?)\\end\{cases\}\$/),
    "a piecewise rule",
    prompt,
  );
  const variable = group(match, 1, "piecewise variable");
  const branches = group(match, 2, "piecewise body")
    .split("\\\\")
    .map((row) => {
      const [body, condition] = row.split("&");
      if (body === undefined || condition === undefined) {
        throw new Error(`a piecewise row carries no condition: ${row}`);
      }
      return { f: compileTex(body, variable), condition: condition.trim() };
    });
  if (branches.length < 2) {
    throw new Error(`a piecewise rule with ${branches.length} branches: ${prompt}`);
  }
  const holds = (condition: string, input: number): boolean => {
    const band = condition.match(/^(-?\d+) \\le \w < (-?\d+)$/);
    if (band) {
      return (
        input >= Number(group(band, 1, "band floor")) &&
        input < Number(group(band, 2, "band ceiling"))
      );
    }
    const simple = must(
      condition.match(/^\w (\\le|\\ge|<|>) (-?\d+)$/),
      `the condition ${JSON.stringify(condition)}`,
      condition,
    );
    const bound = Number(group(simple, 2, "bound"));
    switch (group(simple, 1, "comparator")) {
      case "\\le":
        return input <= bound;
      case "\\ge":
        return input >= bound;
      case "<":
        return input < bound;
      default:
        return input > bound;
    }
  };
  return {
    variable,
    evaluate(input) {
      const matched = branches.filter((branch) => holds(branch.condition, input));
      if (matched.length !== 1) {
        throw new Error(`${matched.length} branches claim the input ${input}`);
      }
      return at(matched, 0, "branch").f(input);
    },
  };
}

/** The marks of a FUN.4 chart, in the order the prompt walks them. */
function chartMarks(prompt: string): (readonly [number, number])[] {
  const marks = promptPoints(prompt);
  if (marks.length < 3) {
    throw new Error(`a chart with ${marks.length} marks: ${prompt}`);
  }
  for (let i = 1; i < marks.length; i += 1) {
    if (at(marks, i, "mark")[0] <= at(marks, i - 1, "mark")[0]) {
      throw new Error(`the chart's marks do not run left to right: ${prompt}`);
    }
  }
  return marks;
}

function legDirection(
  from: readonly [number, number],
  to: readonly [number, number],
): string {
  if (to[1] > from[1]) {
    return "increasing";
  }
  return to[1] < from[1] ? "decreasing" : "constant";
}

/** `f(x) = ...` and `g(x) = ...` as the FUN.7 prompts give them. */
function composePair(prompt: string): {
  f: (v: number) => number;
  g: (v: number) => number;
} {
  const match = must(
    prompt.match(/Given \$f\(x\) = ([^$]+)\$ and \$g\(x\) = ([^$]+)\$/),
    "the two functions",
    prompt,
  );
  return {
    f: compileTex(group(match, 1, "f"), "x"),
    g: compileTex(group(match, 2, "g"), "x"),
  };
}

function composedInOrder(
  prompt: string,
  outer: string,
  inner: string,
): (v: number) => number {
  const { f, g } = composePair(prompt);
  const pick = (name: string) => (name === "f" ? f : g);
  if (outer === inner) {
    throw new Error(`the prompt composes ${outer} with itself: ${prompt}`);
  }
  return (v: number) => pick(outer)(pick(inner)(v));
}

/** The difference quotient the FUN.6 prompts pose, as a function of `h`. */
function differenceQuotient(
  f: (v: number) => number,
  point: number,
): (h: number) => number {
  return (h: number) => (f(point + h) - f(point)) / h;
}

/* -------------------------------------------------------------------------- */
/* One derivation per template                                                 */
/* -------------------------------------------------------------------------- */

type Derive = (prompt: string) => string;

const CASES: Readonly<Record<string, Derive>> = {
  /* ------------------------------ CG.1 ---------------------------------- */

  "d6.cg1.plot-offset.l1": (prompt) => {
    const match = must(
      prompt.match(
        /sits \$(\d+)\$ units? to the (left|right) of it and \$(\d+)\$ units? (above|below) it/,
      ),
      "the two offsets",
      prompt,
    );
    const across = Number(group(match, 1, "across"));
    const up = Number(group(match, 3, "up"));
    return pointText(
      group(match, 2, "across direction") === "left" ? -across : across,
      group(match, 4, "up direction") === "below" ? -up : up,
    );
  },

  "d6.cg1.intercept.l2": (prompt) => {
    const match = must(
      prompt.match(/Find the \$([xy])\$-intercept of the line \$([^$]+)\$/),
      "the intercept asked for",
      prompt,
    );
    const { a, b, c } = standardLine(group(match, 2, "line"));
    return group(match, 1, "axis") === "x"
      ? pointText(exactQuotient(c, a), 0)
      : pointText(0, exactQuotient(c, b));
  },

  "d6.cg1.other-endpoint.l2": (prompt) => {
    const points = promptPoints(prompt);
    if (points.length !== 2) {
      throw new Error(`expected an endpoint and a midpoint, saw ${points.length}`);
    }
    const [end, middle] = points as [readonly [number, number], readonly [number, number]];
    return pointText(2 * middle[0] - end[0], 2 * middle[1] - end[1]);
  },

  "d6.cg1.distance.l3": (prompt) => {
    const points = promptPoints(prompt);
    if (points.length !== 2) {
      throw new Error(`expected two points, saw ${points.length}`);
    }
    const [one, two] = points as [readonly [number, number], readonly [number, number]];
    const squared = (two[0] - one[0]) ** 2 + (two[1] - one[1]) ** 2;
    const length = Math.sqrt(squared);
    if (!Number.isInteger(length)) {
      throw new Error(`the printed points are ${length} apart, which the key cannot spell`);
    }
    return `${length}`;
  },

  "d6.cg1.intercept-span.l3": (prompt) => {
    const match = must(
      prompt.match(/The line \$([^$]+)\$ crosses both axes/),
      "the line",
      prompt,
    );
    const { a, b, c } = standardLine(group(match, 1, "line"));
    const xAxis = exactQuotient(c, a);
    const yAxis = exactQuotient(c, b);
    const length = Math.sqrt(xAxis ** 2 + yAxis ** 2);
    if (!Number.isInteger(length)) {
      throw new Error(`the two intercepts are ${length} apart, which the key cannot spell`);
    }
    return `${length}`;
  },

  /* ------------------------------ FUN.1 --------------------------------- */

  "d6.fun1.evaluate-rule.l1": (prompt) => evaluateNamedRule(prompt),
  "d6.fun1.evaluate-negative.l2": (prompt) => evaluateNamedRule(prompt),

  "d6.fun1.log-function-count.l2": (prompt) => {
    const relations = [...prompt.matchAll(/\$\\\{(.*?)\\\}\$/g)].map((match) =>
      promptPoints(group(match, 1, "relation")),
    );
    if (relations.length !== 4) {
      throw new Error(`expected four relations, saw ${relations.length}`);
    }
    const functions = relations.filter((pairs) => {
      if (pairs.length < 2) {
        throw new Error("a relation printed fewer than two pairs");
      }
      return new Set(pairs.map(([input]) => input)).size === pairs.length;
    });
    return `${functions.length}`;
  },

  "d6.fun1.solve-setting.l3": (prompt) => {
    const { name, variable, f } = namedRule(prompt);
    const match = must(
      prompt.match(
        new RegExp(
          `Find the value of \\$${variable}\\$ for which \\$${name}\\(${variable}\\) = (-?\\d+)\\$`,
        ),
      ),
      "the target output",
      prompt,
    );
    const target = Number(group(match, 1, "target"));
    const solutions = integerSolutions(f, () => target);
    if (solutions.length !== 1) {
      throw new Error(`${solutions.length} integers send the printed rule to ${target}`);
    }
    return `${at(solutions, 0, "solution")}`;
  },

  "d6.fun1.opposite-inputs.l3": (prompt) => {
    const { name, f } = namedRule(prompt);
    const match = must(
      prompt.match(
        new RegExp(`Compute \\$${name}\\((-?\\d+)\\) ([+-]) ${name}\\((-?\\d+)\\)\\$`),
      ),
      "the two readings",
      prompt,
    );
    const left = f(Number(group(match, 1, "first input")));
    const right = f(Number(group(match, 3, "second input")));
    return `${group(match, 2, "operator") === "-" ? left - right : left + right}`;
  },

  /* ------------------------------ FUN.2 --------------------------------- */

  "d6.fun2.root-domain.l1": (prompt) => domainOrRange(prompt),
  "d6.fun2.quotient-domain.l2": (prompt) => domainOrRange(prompt),
  "d6.fun2.output-range.l2": (prompt) => domainOrRange(prompt),
  "d6.fun2.root-flip-domain.l3": (prompt) => domainOrRange(prompt),
  "d6.fun2.root-over-linear.l3": (prompt) => domainOrRange(prompt),

  /* ------------------------------ FUN.7 --------------------------------- */

  "d6.fun7.series-value.l1": (prompt) => composedValue(prompt),
  "d6.fun7.order-value.l2": (prompt) => composedValue(prompt),
  "d6.fun7.linear-formula.l2": (prompt) => composedFormula(prompt, 1),
  "d6.fun7.square-outer.l3": (prompt) => composedFormula(prompt, 2),
  "d6.fun7.square-inner.l3": (prompt) => composedFormula(prompt, 2),

  /* ------------------------------ FUN.5 --------------------------------- */

  "d6.fun5.two-readings.l1": (prompt) => averageRateOverWindow(prompt),
  "d6.fun5.chart-window.l2": (prompt) => averageRateOverWindow(prompt),

  "d6.fun5.function-rule.l2": (prompt) => {
    const match = must(
      prompt.match(
        /For \$f\(x\) = ([^$]+)\$, find the average rate of change from \$x = (-?\d+)\$ to \$x = (-?\d+)\$/,
      ),
      "the rule and its window",
      prompt,
    );
    const f = compileTex(group(match, 1, "rule"), "x");
    const from = Number(group(match, 2, "window start"));
    const to = Number(group(match, 3, "window end"));
    return `${exactQuotient(f(to) - f(from), to - from)}`;
  },

  "d6.fun5.two-windows.l3": (prompt) => {
    const readings = promptReadings(prompt);
    const windows = [...prompt.matchAll(/from \$(-?\d+)\$ to \$(-?\d+)\$/g)].map(
      (match) =>
        [Number(group(match, 1, "start")), Number(group(match, 2, "end"))] as const,
    );
    if (windows.length !== 2) {
      throw new Error(`expected two windows, saw ${windows.length}`);
    }
    if (!/the first of those minus the second/.test(prompt)) {
      throw new Error(
        `the prompt no longer asks for the first rate minus the second: ${prompt}`,
      );
    }
    const rate = ([from, to]: readonly [number, number]) =>
      exactQuotient(readingAt(readings, to) - readingAt(readings, from), to - from);
    return `${rate(at(windows, 0, "window")) - rate(at(windows, 1, "window"))}`;
  },

  "d6.fun5.missing-reading.l3": (prompt) => {
    const match = must(
      prompt.match(
        /average rate of \$\(?(-?\d+)\)?\$ per unit of input from \$(-?\d+)\$ to \$(-?\d+)\$, and it reads \$(-?\d+)\$ at \$(-?\d+)\$/,
      ),
      "the rate and the reading",
      prompt,
    );
    const rate = Number(group(match, 1, "rate"));
    const from = Number(group(match, 2, "window start"));
    const to = Number(group(match, 3, "window end"));
    const start = Number(group(match, 4, "starting reading"));
    if (Number(group(match, 5, "reading input")) !== from) {
      throw new Error(`the prompt reads its starting value somewhere other than ${from}`);
    }
    return `${start + rate * (to - from)}`;
  },

  /* ------------------------------ FUN.3 --------------------------------- */

  "d6.fun3.two-piece-eval.l1": (prompt) => piecewiseValue(prompt),
  "d6.fun3.boundary-eval.l2": (prompt) => piecewiseValue(prompt),
  "d6.fun3.three-piece-eval.l2": (prompt) => piecewiseValue(prompt),
  "d6.fun3.square-piece-eval.l3": (prompt) => piecewiseValue(prompt),

  "d6.fun3.across-pieces-sum.l3": (prompt) => {
    const { evaluate } = casesFromPrompt(prompt);
    const match = must(
      prompt.match(/find \$C\((-?\d+)\) \+ C\((-?\d+)\)\$/),
      "the two loads",
      prompt,
    );
    return `${evaluate(Number(group(match, 1, "first load"))) + evaluate(Number(group(match, 2, "second load")))}`;
  },

  /* ------------------------------ FUN.8 --------------------------------- */

  "d6.fun8.table-swap.l1": (prompt) => {
    const pairs = [...prompt.matchAll(/\$f\((-?\d+)\) = (-?\d+)\$/g)].map(
      (match) =>
        [Number(group(match, 1, "input")), Number(group(match, 2, "output"))] as const,
    );
    if (pairs.length < 3) {
      throw new Error(`expected a table of readings, saw ${pairs.length}`);
    }
    const match = must(
      prompt.match(/Find \$f\^\{-1\}\((-?\d+)\)\$/),
      "the output asked back",
      prompt,
    );
    const wanted = Number(group(match, 1, "output"));
    const hits = pairs.filter(([, output]) => output === wanted);
    if (hits.length !== 1) {
      throw new Error(`${hits.length} table rows carry the output ${wanted}`);
    }
    return `${at(hits, 0, "row")[0]}`;
  },

  "d6.fun8.inverse-value.l2": (prompt) => {
    const match = must(
      prompt.match(/For \$f\(x\) = ([^$]+)\$, find \$f\^\{-1\}\((-?\d+)\)\$/),
      "the rule and the output",
      prompt,
    );
    const f = compileTex(group(match, 1, "rule"), "x");
    const wanted = Number(group(match, 2, "output"));
    const solutions = integerSolutions(f, () => wanted);
    if (solutions.length !== 1) {
      throw new Error(`${solutions.length} integers reach the output ${wanted}`);
    }
    return `${at(solutions, 0, "solution")}`;
  },

  "d6.fun8.swap-solve-group.l2": (prompt) => inverseRule(prompt),
  "d6.fun8.swap-solve-divide.l3": (prompt) => inverseRule(prompt),

  "d6.fun8.not-one-to-one.l3": (prompt) => {
    const match = must(
      prompt.match(/For \$f\(x\) = ([^$]+)\$, \$f\((-?\d+)\) = (-?\d+)\$/),
      "the rule and its known reading",
      prompt,
    );
    const f = compileTex(group(match, 1, "rule"), "x");
    const known = Number(group(match, 2, "known input"));
    const output = Number(group(match, 3, "known output"));
    if (Math.abs(f(known) - output) > 1e-9) {
      throw new Error(`the printed rule sends ${known} to ${f(known)}, not to ${output}`);
    }
    const others = integerSolutions(f, () => output).filter((x) => x !== known);
    if (others.length !== 1) {
      throw new Error(`${others.length} other integers share the output ${output}`);
    }
    return `${at(others, 0, "partner")}`;
  },

  /* ------------------------------ FUN.4 --------------------------------- */

  "d6.fun4.direction.l1": (prompt) => {
    const marks = chartMarks(prompt);
    const match = must(
      prompt.match(/Between \$x = (-?\d+)\$ and \$x = (-?\d+)\$/),
      "the stretch asked about",
      prompt,
    );
    const from = Number(group(match, 1, "stretch start"));
    const to = Number(group(match, 2, "stretch end"));
    const index = marks.findIndex(
      ([x], i) =>
        x === from && at(marks, i + 1 >= marks.length ? i : i + 1, "mark")[0] === to,
    );
    if (index < 0 || index + 1 >= marks.length) {
      throw new Error(`no single leg runs from ${from} to ${to}: ${prompt}`);
    }
    return legDirection(at(marks, index, "mark"), at(marks, index + 1, "mark"));
  },

  "d6.fun4.rising-interval.l2": (prompt) => {
    const marks = chartMarks(prompt);
    const match = must(
      prompt.match(/On which interval is the function (increasing|decreasing)\?/),
      "the direction asked about",
      prompt,
    );
    const wanted = group(match, 1, "direction");
    const legs = legsMatching(marks, wanted);
    if (legs.length !== 1) {
      throw new Error(`${legs.length} legs are ${wanted}, but the prompt asks for one`);
    }
    return at(legs, 0, "leg");
  },

  "d6.fun4.peak-value.l2": (prompt) => extremeReading(prompt),
  "d6.fun4.absolute-extreme.l3": (prompt) => extremeReading(prompt),

  "d6.fun4.fall-union.l3": (prompt) => {
    const marks = chartMarks(prompt);
    const match = must(
      prompt.match(
        /List every interval on which the function is (increasing|decreasing)\./,
      ),
      "the direction asked about",
      prompt,
    );
    const legs = legsMatching(marks, group(match, 1, "direction"));
    if (legs.length !== 2) {
      throw new Error(`${legs.length} legs run that way, but the prompt promises two`);
    }
    return legs.join(" U ");
  },

  /* ------------------------------ FUN.9 --------------------------------- */

  "d6.fun9.shift-point.l1": (prompt) => {
    const points = promptPoints(prompt);
    if (points.length !== 1) {
      throw new Error(`expected one point on f, saw ${points.length}`);
    }
    const [x, y] = at(points, 0, "point");
    const match = must(
      prompt.match(/\$g\(x\) = f\(x ([+-]) (\d+)\) ([+-]) (\d+)\$/),
      "the transformation",
      prompt,
    );
    const inside = signed(group(match, 1, "inside sign"), group(match, 2, "inside shift"));
    const outside = signed(
      group(match, 3, "outside sign"),
      group(match, 4, "outside shift"),
    );
    // `g(x) = f(x + inside)`, so the input that reproduces `x` is `x - inside`.
    return pointText(x - inside, y + outside);
  },

  "d6.fun9.stretch-point.l3": (prompt) => {
    const points = promptPoints(prompt);
    if (points.length !== 1) {
      throw new Error(`expected one point on f, saw ${points.length}`);
    }
    const [x, y] = at(points, 0, "point");
    const match = must(
      prompt.match(/\$g\(x\) = (-?\d*)f\((-?\d*)x\)\$/),
      "the stretch",
      prompt,
    );
    const outside = coefficient(group(match, 1, "outer factor"));
    const inside = coefficient(group(match, 2, "inner factor"));
    return pointText(exactQuotient(x, inside), y * outside);
  },

  "d6.fun9.inside-outside-value.l2": (prompt) => transformedValue(prompt),
  "d6.fun9.order-value.l3": (prompt) => transformedValue(prompt),

  "d6.fun9.parity-test.l2": (prompt) => {
    const { f } = namedRule(prompt);
    const probes = [0.37, 1.43, 2.61, 3.29, 4.71];
    let even = true;
    let odd = true;
    for (const x of probes) {
      const forward = f(x);
      const mirrored = f(-x);
      if (!Number.isFinite(forward) || !Number.isFinite(mirrored)) {
        throw new Error(`the printed rule is undefined at ${x}`);
      }
      const scale = Math.max(1, Math.abs(forward));
      if (Math.abs(mirrored - forward) / scale > 1e-9) {
        even = false;
      }
      if (Math.abs(mirrored + forward) / scale > 1e-9) {
        odd = false;
      }
    }
    if (even && odd) {
      throw new Error(
        "the printed rule is identically zero, which the key cannot classify",
      );
    }
    return even ? "even" : odd ? "odd" : "neither";
  },

  /* ------------------------------ FUN.10 -------------------------------- */

  "d6.fun10.deviation.l1": (prompt) => {
    const match = must(
      prompt.match(/Evaluate \$f\((-?\d+)\)\$ for \$f\(x\) = ([^$]+)\$/),
      "the reading asked for",
      prompt,
    );
    const f = compileTex(group(match, 2, "rule"), "x");
    return `${f(Number(group(match, 1, "input")))}`;
  },

  "d6.fun10.vertex.l2": (prompt) => {
    const f = veeRule(prompt);
    // Read the corner off the graph rather than off the bars: the turn is where the two
    // arms meet, and either arm alone extrapolates past it.
    const samples: (readonly [number, number])[] = [];
    for (let k = -400; k <= 400; k += 1) {
      const x = k / 4;
      const y = f(x);
      if (Number.isFinite(y)) {
        samples.push([x, y] as const);
      }
    }
    const rising = f(1e4) > f(0);
    const corner = samples.reduce((best, current) =>
      rising
        ? current[1] < best[1]
          ? current
          : best
        : current[1] > best[1]
          ? current
          : best,
    );
    if (!Number.isInteger(corner[0]) || !Number.isInteger(corner[1])) {
      throw new Error(
        `the printed vee turns at ${corner[0]}, ${corner[1]}, which is not a pair the key can spell`,
      );
    }
    return pointText(corner[0], corner[1]);
  },

  "d6.fun10.range.l3": (prompt) => rangeText(veeRule(prompt)),

  "d6.fun10.reach.l2": (prompt) => solvedSet(prompt),
  "d6.fun10.setpoint.l3": (prompt) => solvedSet(prompt),

  /* ------------------------------ FUN.6 --------------------------------- */

  "d6.fun6.linear.l1": (prompt) => {
    const match = must(
      prompt.match(
        /For \$f\(x\) = ([^$]+)\$, simplify the difference quotient \$\\dfrac\{f\(x \+ h\) - f\(x\)\}\{h\}\$/,
      ),
      "the rule",
      prompt,
    );
    const f = compileTex(group(match, 1, "rule"), "x");
    // A quotient that does not depend on x is what makes the key a single number, so it is
    // measured at several inputs rather than asserted.
    const values = [-3, 0, 2, 7].flatMap((x) => [1, 4].map((h) => (f(x + h) - f(x)) / h));
    const first = at(values, 0, "quotient");
    if (values.some((value) => Math.abs(value - first) > 1e-9)) {
      throw new Error(
        `the printed rule's difference quotient moves with x: ${values.join(", ")}`,
      );
    }
    return polynomialText([Math.round(first)], "h");
  },

  // The one shape whose prompt prints the quotient AND names its numerator separately, so
  // the point is spelled five times over. All five are captured and required to agree: this
  // is the template where the two halves could drift apart silently, because the printed
  // fraction is the context and the printed numerator is the question.
  "d6.fun6.numerator.l2": (prompt) => {
    const match = must(
      prompt.match(
        /For \$f\(x\) = ([^$]+)\$, the difference quotient at \$x = (-?\d+)\$ is \$\\dfrac\{f\((-?\d+) \+ h\) - f\((-?\d+)\)\}\{h\}\$\. Expand and simplify its numerator, \$f\((-?\d+) \+ h\) - f\((-?\d+)\)\$, and stop there: do not divide by \$h\$\./,
      ),
      "the rule and the point",
      prompt,
    );
    const f = compileTex(group(match, 1, "rule"), "x");
    const point = Number(group(match, 2, "point"));
    const spellings = [
      ["shifted point in the quotient", 3],
      ["base point in the quotient", 4],
      ["shifted point in the numerator", 5],
      ["base point in the numerator", 6],
    ] as const;
    for (const [what, index] of spellings) {
      if (Number(group(match, index, what)) !== point) {
        throw new Error(
          `the prompt names the point five ways and the ${what} disagrees: ${prompt}`,
        );
      }
    }
    return polynomialText(
      fitPolynomial((h) => f(point + h) - f(point), 2),
      "h",
    );
  },

  "d6.fun6.square-point.l2": (prompt) => simplifiedQuotient(prompt),
  "d6.fun6.point-full.l3": (prompt) => simplifiedQuotient(prompt),
  "d6.fun6.factored-point.l3": (prompt) => simplifiedQuotient(prompt),
};

/* -------------------------------------------------------------------------- */
/* Derivations several templates share                                         */
/* -------------------------------------------------------------------------- */

function signed(sign: string, magnitude: string): number {
  return sign === "-" ? -Number(magnitude) : Number(magnitude);
}

/** A LaTeX coefficient, where an empty string means 1 and a bare `-` means -1. */
function coefficient(text: string): number {
  if (text === "" || text === "+") {
    return 1;
  }
  return text === "-" ? -1 : Number(text);
}

function evaluateNamedRule(prompt: string): string {
  const { name, f } = namedRule(prompt);
  const match = must(
    prompt.match(new RegExp(`Find \\$${name}\\((-?\\d+)\\)\\$`)),
    "the input asked for",
    prompt,
  );
  const value = f(Number(group(match, 1, "input")));
  if (!Number.isInteger(value)) {
    throw new Error(`the printed rule returns ${value}, which the key cannot spell`);
  }
  return `${value}`;
}

function domainOrRange(prompt: string): string {
  const match = must(
    prompt.match(/Give the (domain|range) of \$\w\(x\) = ([^$]+)\$ in interval notation/),
    "the set asked for",
    prompt,
  );
  const f = compileTex(group(match, 2, "rule"), "x");
  return group(match, 1, "set") === "domain" ? domainText(f) : rangeText(f);
}

function composedOrder(prompt: string): { outer: string; inner: string } {
  const match = must(
    prompt.match(/\$\((f|g) \\circ (f|g)\)\((?:-?\d+|x)\)\$/),
    "the order of composition",
    prompt,
  );
  return { outer: group(match, 1, "outer"), inner: group(match, 2, "inner") };
}

function composedValue(prompt: string): string {
  const { outer, inner } = composedOrder(prompt);
  const composed = composedInOrder(prompt, outer, inner);
  const match = must(
    prompt.match(/\\circ (?:f|g)\)\((-?\d+)\)\$/),
    "the input to the composition",
    prompt,
  );
  const value = composed(Number(group(match, 1, "input")));
  if (!Number.isInteger(value)) {
    throw new Error(`the composition returns ${value}, which the key cannot spell`);
  }
  return `${value}`;
}

function composedFormula(prompt: string, degree: number): string {
  const { outer, inner } = composedOrder(prompt);
  return polynomialText(fitPolynomial(composedInOrder(prompt, outer, inner), degree), "x");
}

/** `$27$ at input $1$` and `$43$ at $6$`: the two spellings the FUN.5 prompts use. */
function promptReadings(prompt: string): (readonly [number, number])[] {
  const readings = [...prompt.matchAll(/\$(-?\d+)\$ at (?:input )?\$(-?\d+)\$/g)].map(
    (match) =>
      [Number(group(match, 2, "input")), Number(group(match, 1, "reading"))] as const,
  );
  if (readings.length < 2) {
    throw new Error(`expected at least two readings, saw ${readings.length}`);
  }
  return readings;
}

function readingAt(
  readings: readonly (readonly [number, number])[],
  input: number,
): number {
  const hits = readings.filter(([x]) => x === input);
  if (hits.length !== 1) {
    throw new Error(`${hits.length} readings are printed at input ${input}`);
  }
  return at(hits, 0, "reading")[1];
}

function averageRateOverWindow(prompt: string): string {
  const readings = promptReadings(prompt);
  const match = must(
    prompt.match(/average rate of change from \$(-?\d+)\$ to \$(-?\d+)\$/),
    "the window",
    prompt,
  );
  const from = Number(group(match, 1, "window start"));
  const to = Number(group(match, 2, "window end"));
  return `${exactQuotient(readingAt(readings, to) - readingAt(readings, from), to - from)}`;
}

function piecewiseValue(prompt: string): string {
  const { evaluate } = casesFromPrompt(prompt);
  const match = must(
    prompt.match(/Evaluate \$f\((-?\d+)\)\$/),
    "the input asked for",
    prompt,
  );
  return `${evaluate(Number(group(match, 1, "input")))}`;
}

function inverseRule(prompt: string): string {
  const match = must(
    prompt.match(/Find the rule for \$f\^\{-1\}\(x\)\$ when \$f\(x\) = ([^$]+)\$/),
    "the rule to invert",
    prompt,
  );
  const f = compileTex(group(match, 1, "rule"), "x");
  // Built by UNDOING the printed rule numerically: the inverse's value at y is the x the
  // printed rule sends to y, found by inverting the line f fits rather than by reading it.
  const slope = f(1) - f(0);
  const intercept = f(0);
  if (Math.abs(slope) < 1e-12) {
    throw new Error("the printed rule is flat, so it has no inverse");
  }
  const inverse = (y: number) => (y - intercept) / slope;
  for (const probe of [-4, 0, 3, 11]) {
    if (Math.abs(f(inverse(probe)) - probe) > 1e-9) {
      throw new Error(
        `the printed rule is not linear: undoing ${probe} does not return it`,
      );
    }
  }
  return polynomialText(fitPolynomial(inverse, 1), "x");
}

function legsMatching(
  marks: readonly (readonly [number, number])[],
  direction: string,
): string[] {
  const found: string[] = [];
  for (let i = 1; i < marks.length; i += 1) {
    const from = at(marks, i - 1, "mark");
    const to = at(marks, i, "mark");
    if (legDirection(from, to) === direction) {
      found.push(`(${from[0]}, ${to[0]})`);
    }
  }
  return found;
}

function extremeReading(prompt: string): string {
  const marks = chartMarks(prompt);
  const match = must(
    prompt.match(/[Ww]hat is the (largest|smallest) value the function takes/),
    "the extreme asked for",
    prompt,
  );
  const heights = marks.map(([, y]) => y);
  return `${group(match, 1, "extreme") === "largest" ? Math.max(...heights) : Math.min(...heights)}`;
}

function transformedValue(prompt: string): string {
  const match = must(
    prompt.match(
      /The function \$f\$ is given by \$f\(x\) = ([^$]+)\$, and a second function by \$g\(x\) = (-?\d*)f\(x ([+-]) (\d+)\) ([+-]) (\d+)\$\. Find \$g\((-?\d+)\)\$/,
    ),
    "the base rule and its transformation",
    prompt,
  );
  const f = compileTex(group(match, 1, "rule"), "x");
  const outer = coefficient(group(match, 2, "outer factor"));
  const inside = signed(group(match, 3, "inside sign"), group(match, 4, "inside shift"));
  const outside = signed(group(match, 5, "outside sign"), group(match, 6, "outside shift"));
  const input = Number(group(match, 7, "input"));
  const value = outer * f(input + inside) + outside;
  if (!Number.isInteger(value)) {
    throw new Error(`the transformed rule returns ${value}, which the key cannot spell`);
  }
  return `${value}`;
}

function veeRule(prompt: string): (v: number) => number {
  const match = must(
    prompt.match(/The graph of \$f\(x\) = ([^$]+)\$ is a vee/),
    "the vee's rule",
    prompt,
  );
  return compileTex(group(match, 1, "rule"), "x");
}

function solvedSet(prompt: string): string {
  const match = must(prompt.match(/Solve \$([^$]+)\$/), "the equation to solve", prompt);
  const [lhs, rhs] = group(match, 1, "equation").split("=");
  if (lhs === undefined || rhs === undefined) {
    throw new Error(`the prompt's equation has no single equals sign: ${prompt}`);
  }
  const left = compileTex(lhs, "x");
  const right = compileTex(rhs, "x");
  const roots = integerSolutions(left, right);
  if (roots.length !== 2) {
    throw new Error(
      `${roots.length} integers solve the printed equation, and the key spells two`,
    );
  }
  return `{${roots.join(", ")}}`;
}

function simplifiedQuotient(prompt: string): string {
  const match = must(
    prompt.match(
      /For \$f\(x\) = ([^$]+)\$, simplify the difference quotient at \$x = (-?\d+)\$, \$\\dfrac\{f\((-?\d+) \+ h\) - f\((-?\d+)\)\}\{h\}\$/,
    ),
    "the rule and the point",
    prompt,
  );
  const f = compileTex(group(match, 1, "rule"), "x");
  const point = Number(group(match, 2, "point"));
  if (
    Number(group(match, 3, "shifted point")) !== point ||
    Number(group(match, 4, "base point")) !== point
  ) {
    throw new Error(`the prompt names the point three ways and they disagree: ${prompt}`);
  }
  return polynomialText(fitPolynomial(differenceQuotient(f, point), 1), "h");
}

/* -------------------------------------------------------------------------- */
/* The sweep                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Templates whose answer cannot be re-derived from the prompt independently of the key, each
 * with its reason. Asserted in both directions below.
 *
 * It is EMPTY, and that is a measurement rather than an omission: every one of D6's 55
 * templates prints enough to re-solve, the two verdict templates (`d6.fun4.direction.l1`,
 * `d6.fun9.parity-test.l2`) included, because each prints the graph or the rule the verdict
 * is about rather than only the choices. The mechanism is kept because the next template may
 * not, and an exception has to be named where it can fail rather than left out quietly.
 */
const NOT_INDEPENDENTLY_DERIVABLE: readonly string[] = [];

/** How many independent draws each template is re-solved on. */
const DRAWS_PER_TEMPLATE = 60;

/** A floor under the pool, so a sweep over a shrunken pool cannot read as a pass. */
const MIN_TEMPLATES = 50;

/** Shape, not size: every node owes derivations, so the sweep cannot pool up in one place. */
const MIN_PER_NODE = 3;

const templatesById = new Map<string, ItemTemplate>(
  D6_PRACTICE_TEMPLATES.map((template) => [template.template_id, template]),
);

/** `d6.fun7.square-outer.l3` belongs to `fun7`. */
function nodeOf(templateId: string): string {
  return at(templateId.split("."), 1, `a node in ${templateId}`);
}

/**
 * Spacing and the explicit `*` are notation, not mathematics: `6*x + 7` and `6x + 7` are one
 * answer, and D6 spells the same shape both ways across nodes. Everything else -- the
 * numbers, the signs, the order of the terms, the brackets -- has to agree exactly.
 */
function canon(text: string): string {
  return text.replace(/\s+/g, "").replaceAll("*", "");
}

describe("D6 keys re-derived from the rendered prompt", () => {
  it("covers every D6 template, and no template it does not own", () => {
    const authored = [...templatesById.keys()].sort();
    const covered = [...Object.keys(CASES), ...NOT_INDEPENDENTLY_DERIVABLE].sort();
    expect(covered).toEqual(authored);
    expect(authored.length, "the D6 pool shrank").toBeGreaterThanOrEqual(MIN_TEMPLATES);
  });

  it("derives at least three answers for each of D6's nodes", () => {
    const byNode = new Map<string, number>();
    for (const templateId of Object.keys(CASES)) {
      const node = nodeOf(templateId);
      byNode.set(node, (byNode.get(node) ?? 0) + 1);
    }
    // Composition, beside the floor: eleven nodes, each with derivations of its own. A floor
    // of 50 alone is satisfied by one node contributing all of them.
    const authoredNodes = new Set([...templatesById.keys()].map(nodeOf));
    expect([...byNode.keys()].sort()).toEqual([...authoredNodes].sort());
    expect(authoredNodes.size, "D6 lost a node").toBeGreaterThanOrEqual(11);
    for (const [node, count] of byNode) {
      expect(count, `${node} contributes only ${count} derivations`).toBeGreaterThanOrEqual(
        MIN_PER_NODE,
      );
    }
  });

  /**
   * The exception list, both ways. A listed template that no longer exists fails; a listed
   * template that has acquired a derivation fails; and a template that drops out of `CASES`
   * without being listed fails at the census above. The list can also never swallow the
   * population it excuses.
   */
  it("names exactly the templates no derivation is owed for", () => {
    for (const templateId of NOT_INDEPENDENTLY_DERIVABLE) {
      expect(
        templatesById.get(templateId),
        `${templateId} is a declared exception that no longer exists`,
      ).toBeDefined();
      expect(
        Object.hasOwn(CASES, templateId),
        `${templateId} is excused from derivation but has quietly acquired one`,
      ).toBe(false);
    }
    expect(
      NOT_INDEPENDENTLY_DERIVABLE.length,
      "the exception list has grown into the population it excuses",
    ).toBeLessThan(6);
    expect(Object.keys(CASES).length).toBeGreaterThanOrEqual(MIN_TEMPLATES);
  });

  for (const [templateId, derive] of Object.entries(CASES)) {
    it(`${templateId} answers the question its prompt asks, on ${DRAWS_PER_TEMPLATE} draws`, () => {
      const template = templatesById.get(templateId);
      expect(template, templateId).toBeDefined();
      if (!template) {
        return;
      }
      let checked = 0;
      for (let seed = 1; seed <= DRAWS_PER_TEMPLATE; seed += 1) {
        const instance = template.generate(createRng(seed * 7919 + 13));
        const key = instance.answer.answer_key;
        if (key === undefined) {
          throw new Error(`${templateId} seed ${seed}: the item carries no answer_key`);
        }
        let derived: string;
        try {
          derived = derive(instance.prompt);
        } catch (error) {
          throw new Error(
            `${templateId} seed ${seed}: ${(error as Error).message}\nprompt: ${instance.prompt}`,
          );
        }
        expect(
          canon(derived),
          `${templateId} seed ${seed}\nprompt: ${instance.prompt}\nkey: ${key}`,
        ).toBe(canon(key));
        checked += 1;
      }
      expect(checked).toBe(DRAWS_PER_TEMPLATE);
    });
  }
});
