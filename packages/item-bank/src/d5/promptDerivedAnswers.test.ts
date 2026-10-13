/**
 * Every D5 answer key, re-derived from the RENDERED PROMPT TEXT.
 *
 * Deriving from `template_params` agrees with the key by construction and passes over exactly
 * the defect this sweep is built to catch, so the derivations read nothing but `prompt`.
 */

import { describe, expect, it } from "vitest";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import { D5_PRACTICE_TEMPLATES } from "./practice";

const SWEEP_SEEDS = Array.from({ length: 40 }, (_, i) => 4001 + i * 7);

/** Every `$...$` span in a prompt, math only, in order. */
function mathSpans(prompt: string): string[] {
  return [...prompt.matchAll(/\$([^$]+)\$/g)].map((m) => m[1] ?? "");
}

/**
 * LaTeX to a JS expression. Handles the shapes D5's prompts actually use: nested
 * `\dfrac{a}{b}`, `\times`, `\div`, `x^{2}`, and implicit multiplication (`3x`, `2x^{2}`,
 * `6(x + 3)`).
 */
function latexToJs(tex: string): string {
  let out = tex.trim();
  // Exponents first: `x^{2}` inside a `\dfrac` argument would otherwise block the
  // brace-balanced match below and the fraction would come out unconverted.
  out = out.replace(/\^\{([^{}]*)\}/g, "**($1)").replace(/\^(\d)/g, "**$1");
  // Innermost-first, so nesting resolves without a parser. Every division becomes `div(a, b)`
  // rather than `a / b`, because IEEE division is too forgiving for this job: dividing BY a
  // subexpression that is itself undefined gives `finite / Infinity === 0`, so
  // `(x+3)/6 \div (x+3)/(6x-30)` would read as defined at x = 5, where it is not.
  for (let guard = 0; guard < 40 && out.includes("\\dfrac"); guard += 1) {
    // `#` stands in for the helper's name until the implicit-multiplication pass is done,
    // which would otherwise read the `v(` of `div(` as a variable meeting a bracket.
    out = out.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/, "#(($1),($2))");
  }
  out = out
    .replaceAll("\\times", "*")
    .replaceAll("\\div", "/")
    .replaceAll("\\left", "")
    .replaceAll("\\right", "")
    .replaceAll("\\,", " ")
    .replaceAll("\\;", " ");
  // Implicit multiplication.
  out = out
    .replace(/(\d)\s*([a-z(])/g, "$1*$2")
    .replace(/([a-z)])\s*\(/g, "$1*(")
    .replace(/\)\s*([a-z\d])/g, ")*$1");
  if (/[\\{}]/.test(out)) {
    throw new Error(`unconverted LaTeX left in ${JSON.stringify(tex)} -> ${out}`);
  }
  return wrapTopLevelDivision(out).replaceAll("#(", "div(");
}

/**
 * Rewrite a depth-zero `a / b` (what `\div` between two fractions leaves behind) as
 * `div(a, b)`, so the whole chain runs through the strict helper.
 */
function wrapTopLevelDivision(js: string): string {
  let depth = 0;
  for (let i = 0; i < js.length; i += 1) {
    const c = js[i];
    if (c === "(") depth += 1;
    else if (c === ")") depth -= 1;
    else if (c === "/" && depth === 0) {
      return `#((${wrapTopLevelDivision(js.slice(0, i))}),(${wrapTopLevelDivision(
        js.slice(i + 1),
      )}))`;
    }
  }
  return js;
}

/** Division that reports "undefined here" instead of Infinity, and propagates it. */
function div(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return Number.NaN;
  const r = a / b;
  return Number.isFinite(r) ? r : Number.NaN;
}

/** Compile `f(v)` for a single variable name. */
function compile(js: string, variable: string): (v: number) => number {
  // eslint-disable-next-line no-new-func
  const fn = new Function("div", variable, `"use strict"; return (${js});`) as (
    d: typeof div,
    v: number,
  ) => number;
  return (v: number) => {
    try {
      return fn(div, v);
    } catch {
      return Number.NaN;
    }
  };
}

const INTEGERS = Array.from({ length: 161 }, (_, i) => i - 80);

/** Integers at which the expression is undefined: a 0/0 cancel (NaN) or a pole (Infinity). */
function derivedExclusions(f: (v: number) => number): number[] {
  return INTEGERS.filter((x) => !Number.isFinite(f(x)));
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  const norm = (xs: readonly number[]) => [...new Set(xs)].sort((p, q) => p - q).join(",");
  return norm(a) === norm(b);
}

/** Sample points off the integers, so a pole is never hit while comparing two functions. */
const SAMPLES = [-17.31, -9.13, -4.27, -2.61, 0.37, 1.43, 3.29, 5.71, 8.17, 13.53, 21.11];

function agreesOffThePoles(
  prompt: (v: number) => number,
  key: (v: number) => number,
): string | null {
  let compared = 0;
  for (const x of SAMPLES) {
    const a = prompt(x);
    const b = key(x);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a) > 1e6 || Math.abs(b) > 1e6) continue;
    compared += 1;
    const scale = Math.max(1, Math.abs(a), Math.abs(b));
    if (Math.abs(a - b) / scale > 1e-9) {
      return `at x = ${x} the prompt gives ${a} and the key gives ${b}`;
    }
  }
  return compared >= 4
    ? null
    : `only ${compared} of ${SAMPLES.length} samples were comparable`;
}

/** The expression a RAT.1 / RAT.2 / RAT.4 prompt poses, as JS. */
function expressionFromPrompt(item: FrozenItem): string {
  const spans = mathSpans(item.prompt);
  if (item.template_id.startsWith("d5.rat3.")) {
    // "Subtract $A$ from $B$" is B - A, and the word order is the only thing that says so.
    if (/Subtract .* from /.test(item.prompt)) {
      const [a, b] = spans;
      return `(${latexToJs(a ?? "")}) * -1 + (${latexToJs(b ?? "")})`;
    }
    return latexToJs(spans[0] ?? "");
  }
  return latexToJs(spans[0] ?? "");
}

/** The `P(x) = ...` right-hand side a RAT.5 prompt poses, as JS. */
function functionFromPrompt(item: FrozenItem): string {
  const span = mathSpans(item.prompt).find((s) => s.includes("P(x)"));
  if (!span) throw new Error(`no P(x) span in ${item.prompt}`);
  return latexToJs(span.slice(span.indexOf("=") + 1));
}

/** The equation a RAT.6 prompt poses, split at `=`, plus the variable it solves for. */
function equationFromPrompt(item: FrozenItem): {
  left: string;
  right: string;
  variable: string;
} {
  const solve = item.prompt.match(/Solve (\$[^$]+\$)/);
  const span = solve
    ? (mathSpans(solve[1] ?? "")[0] ?? "")
    : (mathSpans(item.prompt).find((s) => s.includes("=")) ?? "");
  const [lhs, rhs] = span.split("=");
  const left = latexToJs(lhs ?? "");
  const right = latexToJs(rhs ?? "");
  // Read the unknown off the CONVERTED text: `\dfrac` carries a `d` of its own, which is
  // how this first read `14/(x - 6) = 7` as an equation in `d`.
  const letters = new Set(`${left}${right}`.match(/[a-z]/g) ?? []);
  const variable = ["x", "t", "d"].find((name) => letters.has(name)) ?? "x";
  return { left, right, variable };
}

function keyNumbers(text: string): number[] {
  return [...text.matchAll(/-?\d+(?:\.\d+)?(?:\/\d+)?/g)].map((m) => {
    const raw = m[0];
    if (raw.includes("/")) {
      const [n, d] = raw.split("/");
      return Number(n) / Number(d);
    }
    return Number(raw);
  });
}

function instances(template: ItemTemplate, seeds: readonly number[]): FrozenItem[] {
  return seeds.map((seed) => generateFromTemplate(template, "A", seed));
}

describe("D5 answers, re-derived from the rendered prompt", () => {
  const expressionNodes = ["d5.rat1.", "d5.rat2.", "d5.rat3.", "d5.rat4."];

  it("RAT.1 to RAT.4: the key expression and excluded set are what the prompt implies", () => {
    const failures: string[] = [];
    let checked = 0;
    for (const template of D5_PRACTICE_TEMPLATES) {
      if (!expressionNodes.some((p) => template.template_id.startsWith(p))) continue;
      for (const item of instances(template, SWEEP_SEEDS)) {
        checked += 1;
        const promptF = compile(expressionFromPrompt(item), "x");
        const key = item.answer as {
          answer_key: string;
          excluded_values?: readonly string[];
        };
        const keyF = compile(latexToJs(key.answer_key), "x");
        const mismatch = agreesOffThePoles(promptF, keyF);
        if (mismatch) {
          failures.push(`${item.item_version_id}: ${mismatch}\n    ${item.prompt}`);
        }
        const derived = derivedExclusions(promptF);
        const claimed = (key.excluded_values ?? []).map(Number);
        if (!sameSet(derived, claimed)) {
          failures.push(
            `${item.item_version_id}: the prompt is undefined at {${derived.join(", ")}} ` +
              `but the key excludes {${claimed.join(", ")}}\n    ${item.prompt}`,
          );
        }
      }
    }
    expect(checked).toBeGreaterThan(700);
    expect(failures.slice(0, 12).join("\n")).toBe("");
  });

  it("RAT.5: domain, vertical asymptote, level, hole and crossing come out of the prompt", () => {
    const failures: string[] = [];
    let checked = 0;
    for (const template of D5_PRACTICE_TEMPLATES) {
      if (!template.template_id.startsWith("d5.rat5.")) continue;
      for (const item of instances(template, SWEEP_SEEDS)) {
        checked += 1;
        const f = compile(functionFromPrompt(item), "x");
        const key = item.answer as { answer_key: string };
        const claimed = keyNumbers(key.answer_key);
        const undefinedAt = derivedExclusions(f);
        /** A pole the graph runs off at, as opposed to a cancel that leaves a hole. */
        const blowsUp = (c: number) =>
          Math.abs(f(c + 1e-6)) > 1e4 && Math.abs(f(c - 1e-6)) > 1e4;
        const id = item.template_id;
        if (id.startsWith("d5.rat5.domain")) {
          if (!sameSet(undefinedAt, claimed)) {
            failures.push(
              `${item.item_version_id}: undefined at {${undefinedAt.join(", ")}}, ` +
                `domain excludes {${claimed.join(", ")}}`,
            );
          }
        } else if (id.startsWith("d5.rat5.vertical")) {
          const poles = undefinedAt.filter(blowsUp);
          if (!sameSet(poles, claimed)) {
            failures.push(
              `${item.item_version_id}: the prompt's poles are {${poles.join(", ")}}, ` +
                `key says {${claimed.join(", ")}}`,
            );
          }
        } else if (id.startsWith("d5.rat5.level")) {
          const far = f(1e7);
          const farther = f(1e8);
          const target =
            claimed.length === 2
              ? (claimed[0] ?? Number.NaN) / (claimed[1] ?? Number.NaN)
              : claimed[0];
          if (
            !Number.isFinite(far) ||
            Math.abs(far - (target ?? Number.NaN)) > 1e-3 ||
            Math.abs(farther - (target ?? Number.NaN)) > 1e-4
          ) {
            failures.push(
              `${item.item_version_id}: P(1e7) = ${far} and P(1e8) = ${farther}, ` +
                `key says the level is ${target}\n    ${item.prompt}`,
            );
          }
        } else if (id.startsWith("d5.rat5.hole")) {
          const holes = undefinedAt.filter((c) => !blowsUp(c));
          const [hx, hy] = claimed;
          if (!sameSet(holes, [hx ?? Number.NaN])) {
            failures.push(
              `${item.item_version_id}: the cancels sit at {${holes.join(", ")}}, ` +
                `key's hole is at x = ${hx}`,
            );
          } else {
            const height = f((hx ?? 0) + 1e-7);
            if (!Number.isFinite(height) || Math.abs(height - (hy ?? Number.NaN)) > 1e-4) {
              failures.push(
                `${item.item_version_id}: the prompt approaches ${height} at x = ${hx}, ` +
                  `key's hole is at y = ${hy}`,
              );
            }
          }
        } else if (id.startsWith("d5.rat5.crossing")) {
          const crossings = INTEGERS.filter((x) => Number.isFinite(f(x)) && f(x) === 0);
          const [cx, cy] = claimed;
          if (!sameSet(crossings, [cx ?? Number.NaN]) || cy !== 0) {
            failures.push(
              `${item.item_version_id}: the prompt is zero at {${crossings.join(", ")}}, ` +
                `key's intercept is (${cx}, ${cy})`,
            );
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(150);
    expect(failures.slice(0, 12).join("\n")).toBe("");
  });

  it("RAT.6: every key solution solves the prompt's own equation, and none is extraneous", () => {
    const failures: string[] = [];
    let checked = 0;
    for (const template of D5_PRACTICE_TEMPLATES) {
      if (!template.template_id.startsWith("d5.rat6.")) continue;
      for (const item of instances(template, SWEEP_SEEDS)) {
        checked += 1;
        const { left, right, variable } = equationFromPrompt(item);
        const lhs = compile(left, variable);
        const rhs = compile(right, variable);
        const key = item.answer as { answer_key: string };
        const claimed = keyNumbers(key.answer_key);
        for (const s of claimed) {
          const a = lhs(s);
          const b = rhs(s);
          if (!Number.isFinite(a) || !Number.isFinite(b)) {
            failures.push(
              `${item.item_version_id}: the key offers ${s}, where the equation is undefined ` +
                `(lhs ${a}, rhs ${b})\n    ${item.prompt}`,
            );
            continue;
          }
          const scale = Math.max(1, Math.abs(a), Math.abs(b));
          if (Math.abs(a - b) / scale > 1e-9) {
            failures.push(
              `${item.item_version_id}: ${variable} = ${s} gives ${a} and ${b}, ` +
                `so it does not solve the prompt\n    ${item.prompt}`,
            );
          }
        }
        // Completeness, over the twelfths: any other value that satisfies the equation and is
        // not in the key would be a solution the item drops.
        for (let k = -720; k <= 720; k += 1) {
          const v = k / 12;
          const a = lhs(v);
          const b = rhs(v);
          if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
          if (Math.abs(a) > 1e6 || Math.abs(b) > 1e6) continue;
          const scale = Math.max(1, Math.abs(a), Math.abs(b));
          if (
            Math.abs(a - b) / scale < 1e-12 &&
            !claimed.some((s) => Math.abs(s - v) < 1e-9)
          ) {
            failures.push(
              `${item.item_version_id}: ${variable} = ${v} also solves the equation and is ` +
                `not in the key ${key.answer_key}\n    ${item.prompt}`,
            );
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(150);
    expect(failures.slice(0, 12).join("\n")).toBe("");
  });
});
