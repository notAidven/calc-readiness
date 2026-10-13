/**
 * Worked-solution figures for D6's FUN.9 practice templates: transformations, and the even/odd
 * test.
 *
 * The two POINT shapes are planes, and nothing else would do: their parent function is deliberately
 * unknown, so there is no rule to evaluate and the only thing available is the correspondence
 * between two graphs. That correspondence IS a movement on the plane, so the figure draws the point
 * where it was, an arrow, and the point where it landed. The two value shapes and the parity test
 * are reduction columns, because each is a chain of substitutions.
 *
 * The parity column derives its exponents through `d6ParityExponents`, exported from the item bank
 * for this figure. The alternative was a copy of the bank's shape table here, and a stale copy
 * would not merely mislabel the diagram: this template's verdict is derived FROM the exponents, so
 * a drifted copy could tell a learner with a correct answer that they were wrong. That is exactly
 * the defect the D10 round found in a figure with hardcoded triangle vertices, and it is worth one
 * exported function to make it impossible.
 */

import { d6ParityExponents } from "@cr/item-bank";
import type { JSX } from "react";

import { BRICK, CIVIC, LABEL, SIGNAL, SOFT } from "../svgKit";
import {
  ExpressionReductionWorked,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";
import { coeffTex, D6Chart, pointTex, sp } from "./d6Kit";

/** `+ 5` / `- 5`, as FUN.9's own generator prints a joined constant. */
function signTerm(value: number): string {
  return `${value < 0 ? "-" : "+"} ${Math.abs(value)}`;
}

interface PolyTerm {
  coef: number;
  exp: number;
}

/** A term as it is written in the rule, with the `+` dropped on the first one. */
function termTex(term: PolyTerm, leading: boolean): string {
  const magnitude = Math.abs(term.coef);
  const power = term.exp === 1 ? "x" : `x^{${term.exp}}`;
  const body =
    term.exp === 0 ? `${magnitude}` : `${magnitude === 1 ? "" : magnitude}${power}`;
  if (leading) {
    return term.coef < 0 ? `-${body}` : body;
  }
  return `${term.coef < 0 ? "-" : "+"} ${body}`;
}

function polyTex(terms: readonly PolyTerm[]): string {
  return terms.map((term, index) => termTex(term, index === 0)).join(" ");
}

/** The rule with every `x` replaced by `-x`, before any of it is simplified. */
function substitutedTex(terms: readonly PolyTerm[]): string {
  return terms
    .map((term, index) => {
      const magnitude = Math.abs(term.coef);
      const lead = magnitude === 1 ? "" : `${magnitude}`;
      const body =
        term.exp === 0
          ? `${magnitude}`
          : term.exp === 1
            ? `${lead}(-x)`
            : `${lead}(-x)^{${term.exp}}`;
      if (index === 0) {
        return term.coef < 0 ? `-${body}` : body;
      }
      return `${term.coef < 0 ? "-" : "+"} ${body}`;
    })
    .join(" ");
}

/** Each coefficient after `x` becomes `-x`: a sign flip on the odd powers only. */
function reflected(terms: readonly PolyTerm[]): PolyTerm[] {
  return terms.map((term) => ({
    coef: term.exp % 2 === 0 ? term.coef : -term.coef,
    exp: term.exp,
  }));
}

/** A window with a margin proportional to the spread, and a floor under it. */
function windowAround(values: readonly number[]): { min: number; max: number } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(2, Math.round((hi - lo) * 0.28));
  return { min: lo - pad, max: hi + pad };
}

export const FUN9_PRACTICE_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** One point under a translation, with the move drawn as the move it is. */
  "d6.fun9.shift-point.l1": {
    Svg: (params): JSX.Element => {
      const px = params.px ?? 2;
      const py = params.py ?? 3;
      const inside = params.inside ?? -2;
      const outside = params.outside ?? 4;
      const landedX = px - inside;
      const landedY = py + outside;
      const xWin = windowAround([px, landedX]);
      const yWin = windowAround([py, landedY]);
      return (
        <D6Chart
          xMin={xWin.min}
          xMax={xWin.max}
          yMin={yWin.min}
          yMax={yWin.max}
          square
          paths={[
            {
              points: [
                [px, py],
                [landedX, py],
                [landedX, landedY],
              ],
              color: SOFT,
              dashed: true,
            },
          ]}
          arrows={[{ from: [px, py], to: [landedX, landedY], color: CIVIC }]}
          dots={[
            { x: px, y: py, color: SOFT, hollow: true },
            { x: landedX, y: landedY, color: CIVIC },
          ]}
          labels={[
            {
              x: px,
              y: py,
              latex: pointTex(px, py),
              color: SOFT,
              dx: px > landedX ? 1 : -1,
              dy: py > landedY ? 1 : -1,
            },
            {
              x: landedX,
              y: landedY,
              latex: pointTex(landedX, landedY),
              color: CIVIC,
              dx: landedX > px ? 1 : -1,
              dy: landedY > py ? -1 : 1,
            },
          ]}
          xTicks={[px, landedX]}
          yTicks={[py, landedY]}
          footers={[
            `(${px} - ${sp(inside)},\\; ${py} ${signTerm(outside)})`,
            pointTex(landedX, landedY),
          ]}
          title="One point of a trace and the point the replay must pass through"
          ariaLabel={`The point ${spoken(px)} comma ${spoken(py)} moving to ${spoken(landedX)} comma ${spoken(landedY)}`}
        />
      );
    },
    caption: (params) => {
      const inside = params.inside ?? -2;
      const outside = params.outside ?? 4;
      return `The two constants do opposite-feeling things, and only one of them is surprising. The one OUTSIDE simply ${outside < 0 ? "lowers" : "raises"} the reading by $${Math.abs(outside)}$. The one INSIDE moves the trace ${inside < 0 ? "LEFT" : "RIGHT"}: $f(x ${signTerm(inside)})$ reaches a given output ${inside < 0 ? "earlier" : "later"}, so the input SUBTRACTS it. That is why the dashed walk goes ${inside < 0 ? "left" : "right"} and not the other way.`;
    },
  },

  /** One value through a translated rule, with the parent evaluated on its own row. */
  "d6.fun9.inside-outside-value.l2": {
    Svg: (params): JSX.Element => {
      const m = params.m ?? 4;
      const inside = params.inside ?? -2;
      const outside = params.outside ?? 5;
      const inner = params.inner ?? 3;
      const at = inner - inside;
      const parentValue = inner * inner - m;
      const value = parentValue + outside;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `g(x) = f(x ${signTerm(inside)}) ${signTerm(outside)}`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `g(${at}) = f(${at} ${signTerm(inside)}) ${signTerm(outside)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [{ text: `g(${at}) = f(${inner}) ${signTerm(outside)}`, color: SIGNAL }],
        },
        {
          tokens: [
            {
              text: `f(${inner}) = (${inner})^{2} - ${m} = ${parentValue}`,
              color: BRICK,
            },
          ],
        },
        { tokens: [{ text: `g(${at}) = ${value}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Evaluating the translated rule at ${spoken(at)}, which asks the parent for ${spoken(inner)} and then adjusts by ${spoken(outside)}, giving ${spoken(value)}`}
          title="A translated rule at one input, with the parent asked separately"
        />
      );
    },
    caption: (params) => {
      const at = (params.inner ?? 3) - (params.inside ?? -2);
      const inner = params.inner ?? 3;
      return `The inside constant is dealt with BEFORE the parent is consulted: $g(${at})$ does not ask $f$ for $${at}$, it asks $f$ for $${inner}$. Only then does the outside constant adjust the answer. Doing them in the other order, or applying the inside constant to the OUTPUT, is what this shape measures.`;
    },
  },

  /** The rule at `-x` set against the rule at `x`, term by term. */
  "d6.fun9.parity-test.l2": {
    Svg: (params): JSX.Element => {
      const exponents = d6ParityExponents(params.kind ?? 0, params.shapeIndex ?? 0);
      const terms: PolyTerm[] = [
        { coef: params.first ?? 3, exp: exponents[0] },
        { coef: params.second ?? -5, exp: exponents[1] },
      ];
      const allEven = terms.every((term) => term.exp % 2 === 0);
      const allOdd = terms.every((term) => term.exp % 2 === 1);
      const verdict = allEven ? "even" : allOdd ? "odd" : "neither";
      const rows: ReductionRow[] = [
        { tokens: [{ text: `h(x) = ${polyTex(terms)}`, color: LABEL }] },
        { tokens: [{ text: `h(-x) = ${substitutedTex(terms)}`, color: SIGNAL }] },
        { tokens: [{ text: `h(-x) = ${polyTex(reflected(terms))}`, color: BRICK }] },
        { tokens: [{ text: `\\text{${verdict}}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Replacing x by minus x and comparing, which makes the rule ${verdict}`}
          title="The rule at minus x, set against the rule at x"
        />
      );
    },
    caption: (params) => {
      const exponents = d6ParityExponents(params.kind ?? 0, params.shapeIndex ?? 0);
      const allEven = exponents.every((exp) => exp % 2 === 0);
      const allOdd = exponents.every((exp) => exp % 2 === 1);
      if (allEven) {
        return "Every exponent divides by $2$, so no term changes sign and the rule comes back exactly as it was: $h(-x) = h(x)$, which is what even MEANS. A constant term counts as an even power, so it does not break this.";
      }
      if (allOdd) {
        return "No exponent divides by $2$, so every term changes sign and the rule comes back as its own opposite: $h(-x) = -h(x)$, which is what odd means. Note that odd is not the same as \u201cnot even\u201d; it is a second condition in its own right.";
      }
      return "One exponent divides by $2$ and one does not, so one term comes back unchanged while the other flips. The result matches neither $h(x)$ nor $-h(x)$, so the rule is neither even nor odd. Most rules are neither, and a constant term is the quiet way an otherwise odd rule ends up here.";
    },
  },

  /** One point under a stretch, where the inside factor divides rather than multiplies. */
  "d6.fun9.stretch-point.l3": {
    Svg: (params): JSX.Element => {
      const px = params.px ?? 4;
      const py = params.py ?? 3;
      const scale = params.scale ?? 2;
      const gain = params.gain ?? -2;
      const landedX = px / scale;
      const landedY = gain * py;
      const xWin = windowAround([px, landedX, 0]);
      const yWin = windowAround([py, landedY]);
      return (
        <D6Chart
          xMin={xWin.min}
          xMax={xWin.max}
          yMin={yWin.min}
          yMax={yWin.max}
          paths={[]}
          arrows={[{ from: [px, py], to: [landedX, landedY], color: CIVIC }]}
          dots={[
            { x: px, y: py, color: SOFT, hollow: true },
            { x: landedX, y: landedY, color: CIVIC },
          ]}
          labels={[
            {
              x: px,
              y: py,
              latex: pointTex(px, py),
              color: SOFT,
              dx: px > landedX ? 1 : -1,
              dy: py > landedY ? 1 : -1,
            },
            {
              x: landedX,
              y: landedY,
              latex: pointTex(landedX, landedY),
              color: CIVIC,
              dx: landedX > px ? 1 : -1,
              dy: landedY > py ? -1 : 1,
            },
          ]}
          xTicks={[px, landedX]}
          yTicks={[py, landedY]}
          footers={[
            `\\left( \\dfrac{${px}}{${scale}},\\; ${sp(gain)} \\times ${sp(py)} \\right)`,
            pointTex(landedX, landedY),
          ]}
          title="One point of a trace under a change of gain and paper speed"
          ariaLabel={`The point ${spoken(px)} comma ${spoken(py)} moving to ${spoken(landedX)} comma ${spoken(landedY)}`}
        />
      );
    },
    caption: (params) => {
      const scale = params.scale ?? 2;
      const gain = params.gain ?? -2;
      return `Two stretches, and they pull in opposite directions on the page. The gain $${gain}$ is OUTSIDE, so it multiplies the reading${gain < 0 ? " and, being negative, flips it across the axis as well" : ""}. The $${scale}$ is INSIDE, so it DIVIDES the input: $f(${scale}x)$ has already reached at $x$ what the parent reached at $${scale}x$. Multiplying the first coordinate by $${scale}$ is the standard slip.`;
    },
  },

  /** A stretch and a shift on the outside, where the order they are applied in decides the answer. */
  "d6.fun9.order-value.l3": {
    Svg: (params): JSX.Element => {
      const m = params.m ?? 3;
      const inside = params.inside ?? -2;
      const gain = params.gain ?? -2;
      const shift = params.shift ?? 5;
      const inner = params.inner ?? 3;
      const at = inner - inside;
      const parentValue = inner * inner + m;
      const stretched = gain * parentValue;
      const value = stretched + shift;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `g(x) = ${coeffTex(gain)}f(x ${signTerm(inside)}) ${signTerm(shift)}`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `g(${at}) = ${coeffTex(gain)}f(${inner}) ${signTerm(shift)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `f(${inner}) = (${inner})^{2} + ${m} = ${parentValue}`,
              color: BRICK,
            },
          ],
        },
        {
          tokens: [
            {
              text: `g(${at}) = ${sp(gain)} \\times ${parentValue} ${signTerm(shift)}`,
              color: SIGNAL,
            },
          ],
        },
        { tokens: [{ text: `g(${at}) = ${value}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`The parent gives ${spoken(parentValue)}, the gain takes it to ${spoken(stretched)}, and the shift takes it to ${spoken(value)}`}
          title="A gain and a shift on the outside, applied in the order the rule writes them"
        />
      );
    },
    caption: (params) => {
      const gain = params.gain ?? -2;
      const shift = params.shift ?? 5;
      const inner = params.inner ?? 3;
      const m = params.m ?? 3;
      const parentValue = inner * inner + m;
      return `The gain multiplies the parent's output and the shift is added to the RESULT, not to the output before it: $${gain} \\times ${parentValue} = ${gain * parentValue}$ first, then $${shift < 0 ? `- ${Math.abs(shift)}` : `+ ${shift}`}$. Doing it the other way round gives $${gain * (parentValue + shift)}$, which is a different number, and that is the whole content of this shape.`;
    },
  },
};
