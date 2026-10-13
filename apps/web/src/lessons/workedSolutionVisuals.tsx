/**
 * Parameterized SVG worked solutions for practice problems, styled to match the
 * mini-lesson diagrams in `visuals.tsx` (same theme tokens, viewBox conventions,
 * and shared primitives) but driven by each item instance's `template_params`.
 *
 * Every D1 `template_id` is registered here, so revealed D1 worked solutions render
 * as an SVG figure (like a mini-lesson visual). Any template without an entry (e.g.
 * a future non-D1 bank) falls back to the colorful step cards in `WorkedSolution.tsx`.
 * See the SVG skill at `.cursor/skills/svg/SKILL.md` for the alignment rules.
 *
 * Archetypes:
 *  - ExpressionReductionWorked (from `workedKit.tsx`, with the number/LaTeX formatters
 *    and the `WorkedSolutionVisual` shape): tiered row reduction (order-of-operations,
 *    signed arithmetic, combine-like-terms, distribute-then-combine).
 *  - AreaModelWorked: distributive area model.
 *  - PercentBarWorked / SignedNumberLineWorked / FractionBarsWorked /
 *    FractionMultiplyWorked / FractionDivideAddWorked / UnitRateWorked: the
 *    geometric families.
 */

import { expressionVariable, radicalSymbolPair, unitRateObject } from "@cr/item-bank";
import type { JSX } from "react";

import {
  BRICK,
  CIVIC,
  type EqToken,
  LABEL,
  LINE,
  SIGNAL,
  SOFT,
  SvgMath,
  stackGapMid,
} from "./svgKit";
import { CFU_D1_D2_WORKED_SOLUTIONS } from "./worked/cfuD1D2";
import { CFU_D4_D5_WORKED_SOLUTIONS } from "./worked/cfuD4D5";
import { CFU_D6_WORKED_SOLUTIONS } from "./worked/cfuD6";
import { CFU_D7_D8_D10_WORKED_SOLUTIONS } from "./worked/cfuD7D8D10";
import { CFU_D9_WORKED_SOLUTIONS } from "./worked/cfuD9";
import { NUM2_L2B_WORKED_SOLUTIONS } from "./worked/d1NUM2";
import { NUM3_L3B_WORKED_SOLUTIONS } from "./worked/d1NUM3";
import { NUM4_L3B_WORKED_SOLUTIONS } from "./worked/d1NUM4";
import { NUM5_L3B_WORKED_SOLUTIONS } from "./worked/d1NUM5";
import { NUMF_L3B_WORKED_SOLUTIONS } from "./worked/d1NUMF";
import { NUMS_L3B_WORKED_SOLUTIONS } from "./worked/d1NUMS";
import { LIN1_WORKED_SOLUTIONS } from "./worked/d3LIN1";
import { LIN3_WORKED_SOLUTIONS } from "./worked/d3LIN3";
import { LIN4_WORKED_SOLUTIONS } from "./worked/d3LIN4";
import { LIN5_WORKED_SOLUTIONS } from "./worked/d3LIN5";
import { LIN6_WORKED_SOLUTIONS } from "./worked/d3LIN6";
import { POL1_WORKED_SOLUTIONS } from "./worked/d4POL1";
import { POL2_WORKED_SOLUTIONS } from "./worked/d4POL2";
import { POL3_WORKED_SOLUTIONS } from "./worked/d4POL3";
import { POL4_WORKED_SOLUTIONS } from "./worked/d4POL4";
import { POL5_WORKED_SOLUTIONS } from "./worked/d4POL5";
import { POL6_POL7_WORKED_SOLUTIONS } from "./worked/d4POL6POL7";
import { POL8_WORKED_SOLUTIONS } from "./worked/d4POL8";
import {
  complexFrac,
  excludedRow,
  linTex,
  monicQuadTex,
  NESTED_ROW_H,
  ratTail,
  ratTerm,
  scaledQuadTex,
  signOp,
} from "./worked/d5Kit";
import { CG1_PRACTICE_WORKED_SOLUTIONS } from "./worked/d6CG1";
import { FUN1_PRACTICE_WORKED_SOLUTIONS } from "./worked/d6FUN1";
import { FUN2_PRACTICE_WORKED_SOLUTIONS } from "./worked/d6FUN2";
import { FUN3_PRACTICE_WORKED_SOLUTIONS } from "./worked/d6FUN3";
import { FUN4_PRACTICE_WORKED_SOLUTIONS } from "./worked/d6FUN4";
import { FUN5_PRACTICE_WORKED_SOLUTIONS } from "./worked/d6FUN5";
import { FUN6_PRACTICE_WORKED_SOLUTIONS } from "./worked/d6FUN6";
import { FUN7_PRACTICE_WORKED_SOLUTIONS } from "./worked/d6FUN7";
import { FUN8_PRACTICE_WORKED_SOLUTIONS } from "./worked/d6FUN8";
import { FUN9_PRACTICE_WORKED_SOLUTIONS } from "./worked/d6FUN9";
import { FUN10_PRACTICE_WORKED_SOLUTIONS } from "./worked/d6FUN10";
import { LF1_WORKED_SOLUTIONS } from "./worked/d7LF1";
import { LF2_WORKED_SOLUTIONS } from "./worked/d7LF2";
import { LF3_WORKED_SOLUTIONS } from "./worked/d7LF3";
import { LF4_WORKED_SOLUTIONS } from "./worked/d7LF4";
import { EL1_WORKED_SOLUTIONS } from "./worked/d8EL1";
import { EL2_WORKED_SOLUTIONS } from "./worked/d8EL2";
import { EL3_WORKED_SOLUTIONS } from "./worked/d8EL3";
import { EL4_WORKED_SOLUTIONS } from "./worked/d8EL4";
import { EL5_WORKED_SOLUTIONS } from "./worked/d8EL5";
import { EL6_WORKED_SOLUTIONS } from "./worked/d8EL6";
import { TRG1_WORKED_SOLUTIONS } from "./worked/d9TRG1";
import { TRG2_WORKED_SOLUTIONS } from "./worked/d9TRG2";
import { TRG3_WORKED_SOLUTIONS } from "./worked/d9TRG3";
import { TRG4_WORKED_SOLUTIONS } from "./worked/d9TRG4";
import { TRG5_WORKED_SOLUTIONS } from "./worked/d9TRG5";
import { TRG6_WORKED_SOLUTIONS } from "./worked/d9TRG6";
import { TRG7_WORKED_SOLUTIONS } from "./worked/d9TRG7";
import { TRG8_WORKED_SOLUTIONS } from "./worked/d9TRG8";
import { TRG9_WORKED_SOLUTIONS } from "./worked/d9TRG9";
import { GEO1_WORKED_SOLUTIONS } from "./worked/d10GEO1";
import { GEO2_WORKED_SOLUTIONS } from "./worked/d10GEO2";
import {
  CHIP,
  DIV_INK,
  ExpressionReductionWorked,
  frac,
  fracSpoken,
  fracTex,
  MINUS,
  MINUS_INK,
  numStr,
  PLUS,
  PLUS_INK,
  type ReductionRow,
  reduce,
  reduceTail,
  sp,
  spoken,
  TIMES,
  TIMES_INK,
  vt,
  type WorkedSolutionVisual,
} from "./workedKit";

/**
 * Every string below is one of three kinds, and they must not be mixed up:
 *  - LaTeX, for `SvgMath` / `EqToken.text` / `$...$` inside a caption (`\times`, `\dfrac`);
 *  - spoken English, for `aria-label` and `<title>` ("negative 7", "3 over 4");
 *  - plain text, for the handful of `<text>` labels that are bare integers or words.
 */

/** A signed *magnitude* + flag with negatives parenthesized, e.g. `(-5)` or `5`. */
function sopd(magnitude: number, negative: boolean): string {
  return negative ? `(-${magnitude})` : `${magnitude}`;
}

/** A dollar amount as LaTeX, e.g. `\$0.5` (a bare `$` is not valid math). */
function dollars(v: number): string {
  return `\\$${numStr(v)}`;
}

/**
 * A dollar amount for caption prose. The `$` is a Markdown escape and the numeral is
 * its own math span, matching the item bank's money prompts — inside `$...$` a literal
 * `$` would close the span early.
 */
function dollarsProse(v: number): string {
  return `\\$$${numStr(v)}$`;
}

/* -------------------------------------------------------------------------- */
/* Tiered row reduction (the arithmetic + algebra families)                    */
/* -------------------------------------------------------------------------- */

/** `a + b x c` (or `b x c + a` when `order = 1`): multiply first, then add. */
function pemdasProductSumRows(a: number, b: number, c: number, order = 0): ReductionRow[] {
  const product = b * c;
  const productToken: EqToken = { text: `${b} \\times ${c}`, role: "muldiv" };
  const aToken: EqToken = { text: `${a}`, role: "addsub" };
  const row0 = order === 1 ? [productToken, PLUS, aToken] : [aToken, PLUS, productToken];
  return [
    { chip: CHIP.times, tokens: row0 },
    {
      chip: CHIP.plus,
      tokens: [
        {
          text: order === 1 ? `${product} + ${a}` : `${a} + ${product}`,
          role: "addsub",
        },
      ],
    },
    { tokens: [{ text: `${a + product}` }] },
  ];
}

/** `a + b x c +/- e`: multiply first, then add/subtract left to right (two additive steps). */
function pemdasProductSumExtraRows(
  a: number,
  b: number,
  c: number,
  e: number,
  op = 0,
): ReductionRow[] {
  const product = b * c;
  const partial = a + product;
  const value = op === 1 ? partial - e : partial + e;
  const opSym = op === 1 ? "-" : "+";
  return [
    {
      chip: CHIP.times,
      tokens: [
        { text: `${a}`, role: "addsub" },
        PLUS,
        { text: `${b} \\times ${c}`, role: "muldiv" },
        op === 1 ? MINUS : PLUS,
        { text: `${e}`, role: "addsub" },
      ],
    },
    {
      chip: CHIP.plus,
      tokens: [{ text: `${a} + ${product} ${opSym} ${e}`, role: "addsub" }],
    },
    { tokens: [{ text: `${partial} ${opSym} ${e}`, role: "addsub" }] },
    { tokens: [{ text: `${value}` }] },
  ];
}

/**
 * `(a + b)^2 - c x d` (or `c x d + (a + b)^2` when `op = 1`): parentheses,
 * exponent, multiply, then add/subtract.
 */
function pemdasSquareRows(
  a: number,
  b: number,
  c: number,
  d: number,
  op = 0,
): ReductionRow[] {
  const s = a + b;
  const sq = s * s;
  const prod = c * d;
  const parenTok: EqToken = { text: `(${a} + ${b})`, role: "paren", sup: "2" };
  const expTok: EqToken = { text: `${s}`, role: "exp", sup: "2" };
  // The exponent tier has already been applied by this row, so the square is a plain value.
  const sqTok: EqToken = { text: `${sq}`, role: "exp" };
  const prodExpr: EqToken = { text: `${c} \\times ${d}`, role: "muldiv" };
  if (op === 1) {
    // product-first addition: c x d + (a + b)^2
    return [
      { chip: CHIP.paren, tokens: [prodExpr, PLUS, parenTok] },
      { chip: CHIP.exp, tokens: [prodExpr, PLUS, expTok] },
      { chip: CHIP.times, tokens: [prodExpr, PLUS, sqTok] },
      { chip: CHIP.plus, tokens: [{ text: `${prod} + ${sq}`, role: "addsub" }] },
      { tokens: [{ text: `${prod + sq}` }] },
    ];
  }
  return [
    { chip: CHIP.paren, tokens: [parenTok, MINUS, prodExpr] },
    { chip: CHIP.exp, tokens: [expTok, MINUS, prodExpr] },
    { chip: CHIP.times, tokens: [sqTok, MINUS, prodExpr] },
    { chip: CHIP.minus, tokens: [{ text: `${sq} - ${prod}`, role: "addsub" }] },
    { tokens: [{ text: `${sq - prod}` }] },
  ];
}

/** `(±a) + (±b) x (±c)` (product first when `order = 1`): multiply, then add. */
function signedProductSumRows(
  a: number,
  b: number,
  c: number,
  sa: number,
  sb: number,
  sc: number,
  order: number,
): ReductionRow[] {
  const opA = sa === 1 ? -a : a;
  const product = (sb === 1 ? -b : b) * (sc === 1 ? -c : c);
  const productExpr: EqToken = {
    text: `${sopd(b, sb === 1)} \\times ${sopd(c, sc === 1)}`,
    role: "muldiv",
  };
  const aTok: EqToken = { text: `${sopd(a, sa === 1)}`, role: "addsub" };
  const row0 = order === 1 ? [productExpr, PLUS, aTok] : [aTok, PLUS, productExpr];
  return [
    { chip: CHIP.times, tokens: row0 },
    {
      chip: CHIP.plus,
      tokens: [
        {
          text: order === 1 ? `${sp(product)} + ${sp(opA)}` : `${sp(opA)} + ${sp(product)}`,
          role: "addsub",
        },
      ],
    },
    { tokens: [{ text: `${opA + product}` }] },
  ];
}

/** `(±a)(±b) + (±c)(±d)`: two signed products, then add. */
function signedTwoProductsRows(
  a: number,
  b: number,
  c: number,
  d: number,
  sa: number,
  sb: number,
  sc: number,
  sd: number,
): ReductionRow[] {
  const p1 = (sa === 1 ? -a : a) * (sb === 1 ? -b : b);
  const p2 = (sc === 1 ? -c : c) * (sd === 1 ? -d : d);
  return [
    {
      chip: CHIP.times,
      tokens: [
        {
          text: `${sopd(a, sa === 1)} \\times ${sopd(b, sb === 1)}`,
          role: "muldiv",
        },
        PLUS,
        {
          text: `${sopd(c, sc === 1)} \\times ${sopd(d, sd === 1)}`,
          role: "muldiv",
        },
      ],
    },
    {
      chip: CHIP.plus,
      tokens: [{ text: `${sp(p1)} + ${sp(p2)}`, role: "addsub" }],
    },
    { tokens: [{ text: `${p1 + p2}` }] },
  ];
}

/** `pv + qv`: add the coefficients. */
function combineRows(p: number, q: number, v: string): ReductionRow[] {
  return [
    {
      tokens: [
        { text: `${p}`, color: SIGNAL },
        { text: v, tight: true },
        PLUS_INK,
        { text: `${q}`, color: SIGNAL },
        { text: v, tight: true },
      ],
    },
    {
      tokens: [
        { text: `${p + q}`, color: SIGNAL },
        { text: v, tight: true },
      ],
    },
  ];
}

/** `pv + qv - r`: add the coefficients, keep the constant. */
function combineWithConstantRows(
  p: number,
  q: number,
  r: number,
  v: string,
): ReductionRow[] {
  return [
    {
      tokens: [
        { text: `${p}`, color: SIGNAL },
        { text: v, tight: true },
        PLUS_INK,
        { text: `${q}`, color: SIGNAL },
        { text: `${v} - ${r}`, tight: true },
      ],
    },
    {
      tokens: [
        { text: `${p + q}`, color: SIGNAL },
        { text: `${v} - ${r}`, tight: true },
      ],
    },
  ];
}

/** `m(v - k) + nv` (or `nv + m(v - k)` when `order = 1`): distribute, then combine. */
function distributeCombineRows(
  m: number,
  k: number,
  n: number,
  v: string,
  order = 0,
): ReductionRow[] {
  const distributed = `${m}(${v} - ${k})`;
  const other = vt(n, v);
  return [
    {
      tokens: [
        { text: order === 1 ? `${other} + ${distributed}` : `${distributed} + ${other}` },
      ],
    },
    {
      // Keep the same left-to-right order as the prompt so the rewrite reads naturally.
      tokens:
        order === 1
          ? [
              { text: vt(n, v), color: CIVIC },
              PLUS_INK,
              { text: vt(m, v), color: CIVIC },
              MINUS_INK,
              { text: `${m * k}` },
            ]
          : [
              { text: vt(m, v), color: CIVIC },
              MINUS_INK,
              { text: `${m * k}` },
              PLUS_INK,
              { text: vt(n, v), color: CIVIC },
            ],
    },
    {
      tokens: [{ text: vt(m + n, v), color: CIVIC }, MINUS_INK, { text: `${m * k}` }],
    },
  ];
}

/** `a(v + b) + c(v + d)`: distribute both, then combine. */
function expandCombineRows(
  a: number,
  b: number,
  c: number,
  d: number,
  v: string,
): ReductionRow[] {
  return [
    { tokens: [{ text: `${a}(${v} + ${b}) + ${c}(${v} + ${d})` }] },
    {
      tokens: [
        { text: vt(a, v), color: CIVIC },
        PLUS_INK,
        { text: `${a * b}` },
        PLUS_INK,
        { text: vt(c, v), color: CIVIC },
        PLUS_INK,
        { text: `${c * d}` },
      ],
    },
    {
      tokens: [
        { text: vt(a + c, v), color: CIVIC },
        PLUS_INK,
        { text: `${a * b + c * d}` },
      ],
    },
  ];
}

/** `(±a) + (±b) + (±c)`: a three-term signed sum reduced left to right. */
function signedSumRows(
  a: number,
  b: number,
  c: number,
  sa: number,
  sb: number,
  sc: number,
): ReductionRow[] {
  const opA = sa === 1 ? -a : a;
  const opB = sb === 1 ? -b : b;
  const opC = sc === 1 ? -c : c;
  const partial = opA + opB;
  const total = partial + opC;
  return [
    {
      chip: CHIP.plus,
      tokens: [
        {
          text: `${sopd(a, sa === 1)} + ${sopd(b, sb === 1)} + ${sopd(c, sc === 1)}`,
          role: "addsub",
        },
      ],
    },
    {
      chip: CHIP.plus,
      tokens: [{ text: `${sp(partial)} + ${sp(opC)}`, role: "addsub" }],
    },
    { tokens: [{ text: `${total}` }] },
  ];
}

/** `|±a| ± |±b|`: take each absolute value (drop the sign), then add/subtract. */
function absCombineRows(
  a: number,
  b: number,
  sa: number,
  sb: number,
  op: number,
): ReductionRow[] {
  const insideA = sa === 1 ? `-${a}` : `${a}`;
  const insideB = sb === 1 ? `-${b}` : `${b}`;
  const opSym = op === 1 ? "-" : "+";
  const value = op === 1 ? a - b : a + b;
  return [
    {
      tokens: [{ text: `\\lvert ${insideA} \\rvert ${opSym} \\lvert ${insideB} \\rvert` }],
    },
    {
      chip: op === 1 ? CHIP.minus : CHIP.plus,
      tokens: [{ text: `${a} ${opSym} ${b}`, role: "addsub" }],
    },
    { tokens: [{ text: `${value}` }] },
  ];
}

/** `|(±a) + (±b)|`: evaluate inside the bars first, then take the absolute value. */
function absOfSumRows(a: number, b: number, sa: number, sb: number): ReductionRow[] {
  const opA = sa === 1 ? -a : a;
  const opB = sb === 1 ? -b : b;
  const inner = opA + opB;
  const value = Math.abs(inner);
  return [
    {
      chip: CHIP.plus,
      tokens: [
        {
          text: `\\lvert ${sopd(a, sa === 1)} + ${sopd(b, sb === 1)} \\rvert`,
          role: "addsub",
        },
      ],
    },
    { tokens: [{ text: `\\lvert ${sp(inner)} \\rvert` }] },
    { tokens: [{ text: `${value}` }] },
  ];
}

/**
 * Simplify using an inverse then an identity. kind 0: `pv + m - m` (the constant
 * and its additive inverse cancel to 0, the additive identity). kind 1:
 * `m x (1/m) x pv` (a number times its reciprocal is 1, the multiplicative identity).
 */
function inverseIdentityRows(
  kind: number,
  m: number,
  p: number,
  v: string,
): ReductionRow[] {
  if (kind === 1) {
    return [
      {
        chip: CHIP.times,
        tokens: [
          // \tfrac, not \dfrac: a display fraction would outgrow the 40-unit row pitch.
          { text: `${m} \\times \\tfrac{1}{${m}}`, role: "muldiv" },
          TIMES,
          { text: vt(p, v), color: CIVIC },
        ],
      },
      {
        tokens: [{ text: "1", role: "muldiv" }, TIMES, { text: vt(p, v), color: CIVIC }],
      },
      { tokens: [{ text: vt(p, v), color: CIVIC }] },
    ];
  }
  return [
    {
      chip: CHIP.plus,
      tokens: [
        { text: vt(p, v), color: CIVIC },
        PLUS,
        { text: `${m} - ${m}`, role: "addsub" },
      ],
    },
    {
      tokens: [{ text: vt(p, v), color: CIVIC }, PLUS_INK, { text: "0" }],
    },
    { tokens: [{ text: vt(p, v), color: CIVIC }] },
  ];
}

/** `(a + b) x c - d`: parentheses, then multiply, then subtract. */
function parenTimesMinusRows(a: number, b: number, c: number, d: number): ReductionRow[] {
  const sum = a + b;
  const product = sum * c;
  const value = product - d;
  return [
    {
      chip: CHIP.paren,
      tokens: [
        { text: `(${a} + ${b})`, role: "paren" },
        TIMES,
        { text: `${c}`, role: "muldiv" },
        MINUS,
        { text: `${d}`, role: "addsub" },
      ],
    },
    {
      chip: CHIP.times,
      tokens: [
        { text: `${sum}`, role: "paren" },
        TIMES,
        { text: `${c}`, role: "muldiv" },
        MINUS,
        { text: `${d}`, role: "addsub" },
      ],
    },
    {
      chip: CHIP.minus,
      tokens: [{ text: `${product} - ${d}`, role: "addsub" }],
    },
    { tokens: [{ text: `${value}` }] },
  ];
}

/** `a(v + b) + c`: distribute one product, then combine the trailing constant. */
function distributeConstantRows(
  a: number,
  b: number,
  c: number,
  v: string,
): ReductionRow[] {
  return [
    { tokens: [{ text: `${a}(${v} + ${b}) + ${c}` }] },
    {
      tokens: [{ text: vt(a, v), color: CIVIC }, PLUS_INK, { text: `${a * b} + ${c}` }],
    },
    {
      tokens: [{ text: vt(a, v), color: CIVIC }, PLUS_INK, { text: `${a * b + c}` }],
    },
  ];
}

/** `pv - qv + r`: subtract the coefficients, keep the constant. */
function subtractCombineRows(p: number, q: number, r: number, v: string): ReductionRow[] {
  return [
    {
      tokens: [
        { text: `${p}`, color: SIGNAL },
        { text: v, tight: true },
        MINUS_INK,
        { text: `${q}`, color: SIGNAL },
        { text: `${v} + ${r}`, tight: true },
      ],
    },
    {
      tokens: [
        { text: `${p - q}`, color: SIGNAL },
        { text: `${v} + ${r}`, tight: true },
      ],
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Exponent laws (D2 / Boomtown Square)                                        */
/* -------------------------------------------------------------------------- */

/** The multiplication dot between two powers, untinted so the bases carry the color. */
const CDOT: EqToken = { text: "\\cdot" };

/** `x^a \cdot x^b` -> `x^{a+b}` -> `x^{sum}`: keep the base, add the exponents. */
function productExponentRows(base: string, a: number, b: number): ReductionRow[] {
  return [
    {
      tokens: [
        { text: base, sup: `${a}`, color: CIVIC },
        CDOT,
        { text: base, sup: `${b}`, color: CIVIC },
      ],
    },
    { tokens: [{ text: base, sup: `${a} + ${b}`, color: CIVIC }] },
    { tokens: [{ text: base, sup: `${a + b}`, color: CIVIC }] },
  ];
}

/** `x^a \cdot x^{-b}` -> `x^{a+(-b)}` -> positive-exponent form. */
function netExponentRows(base: string, a: number, b: number): ReductionRow[] {
  const net = a - b;
  const finalRow: ReductionRow =
    net >= 0
      ? { tokens: [{ text: base, sup: `${net}`, color: CIVIC }] }
      : { tokens: [{ text: frac(1, `${base}^{${-net}}`, true), color: CIVIC }] };
  return [
    {
      tokens: [
        { text: base, sup: `${a}`, color: CIVIC },
        CDOT,
        { text: base, sup: `-${b}`, color: BRICK },
      ],
    },
    { tokens: [{ text: base, sup: `${a} + (-${b})`, color: CIVIC }] },
    finalRow,
  ];
}

/**
 * `v^a · v^-b · v^c` -> `v^{a+(-b)+c}` -> `v^{net}`, with the NEGATIVE running total shown
 * on its own row. That middle row is the whole difference between this L3 and the L2 net
 * shape: two factors going straight to an answer is the same problem one difficulty down.
 */
function threeFactorNetRows(base: string, a: number, b: number, c: number): ReductionRow[] {
  return [
    {
      tokens: [
        { text: base, sup: `${a}`, color: CIVIC },
        CDOT,
        { text: base, sup: `-${b}`, color: BRICK },
        CDOT,
        { text: base, sup: `${c}`, color: CIVIC },
      ],
    },
    { tokens: [{ text: base, sup: `${a} + (-${b}) + ${c}`, color: CIVIC }] },
    { tokens: [{ text: base, sup: `${a - b} + ${c}`, color: BRICK }] },
    { tokens: [{ text: base, sup: `${a - b + c}`, color: CIVIC }] },
  ];
}

/**
 * `v^a / v^b` -> `v^{a-b}` -> the positive-exponent form, which is `1` when the exponents
 * cancel. The zero case is the reason the shape exists, so it gets its own final row
 * rather than being folded into the subtraction.
 */
function quotientExponentRows(base: string, a: number, b: number): ReductionRow[] {
  const net = a - b;
  const rows: ReductionRow[] = [
    { tokens: [{ text: frac(`${base}^{${a}}`, `${base}^{${b}}`, true), color: CIVIC }] },
    { tokens: [{ text: base, sup: `${a} - ${b}`, color: CIVIC }] },
    { tokens: [{ text: base, sup: `${net}`, color: net > 0 ? CIVIC : BRICK }] },
  ];
  // A positive net is already in finished form, so it takes no fourth row: repeating it
  // would print the same thing twice and claim a step that did not happen.
  if (net === 0) {
    rows.push({ tokens: [{ text: "1", color: CIVIC }] });
  } else if (net < 0) {
    rows.push({ tokens: [{ text: frac(1, `${base}^{${-net}}`, true), color: CIVIC }] });
  }
  return rows;
}

/** `(x^a)^b` -> `x^{a \cdot b}` -> `x^{prod}`: a power of a power multiplies exponents. */
function powerOfPowerRows(base: string, a: number, b: number): ReductionRow[] {
  return [
    {
      tokens: [
        { text: `(${base}`, sup: `${a}`, color: CIVIC },
        // The closing paren continues the group rather than following it, so it is
        // glued on: an operator-sized gap would read as `(x^2` times `)^3`.
        { text: ")", sup: `${b}`, color: SIGNAL, tight: true },
      ],
    },
    { tokens: [{ text: base, sup: `${a} \\cdot ${b}`, color: CIVIC }] },
    { tokens: [{ text: base, sup: `${a * b}`, color: CIVIC }] },
  ];
}

/** `x^a \cdot y^{-b}` -> `\dfrac{x^a}{y^b}`: each base handled on its own. */
function twoVarExponentRows(a: number, b: number): ReductionRow[] {
  return [
    {
      tokens: [
        { text: "x", sup: `${a}`, color: CIVIC },
        CDOT,
        { text: "y", sup: `-${b}`, color: BRICK },
      ],
    },
    { tokens: [{ text: frac(`x^{${a}}`, `y^{${b}}`, true), color: CIVIC }] },
  ];
}

/* -------------------------------------------------------------------------- */
/* D2 radicals + rational exponents (RAD.1 / RAD.2 / RAD.3)                     */
/* -------------------------------------------------------------------------- */

/**
 * How a root of this index is SAID, for a caption sentence. English names the first two
 * and takes `th` after that, so interpolating `${index}-th` shipped "the 3-th root of 27"
 * and "the 2-th root of 4" (seven of RAD.3's ten evaluation cases have an index of 2
 * or 3).
 */
function rootName(index: number): string {
  if (index === 2) {
    return "square";
  }
  return index === 3 ? "cube" : `${index}th`;
}

/** `\sqrt{x}`, or `\sqrt[n]{x}` when the index is something other than 2. */
function sqrtTex(radicand: number | string, index?: number): string {
  // A square root is written bare. Emitting `\sqrt[2]{...}` is legal LaTeX but is not how
  // RAD.1 / RAD.2 draw a square root, so an index of 2 would make the same object look
  // like two different notations across one domain.
  return index === undefined || index === 2
    ? `\\sqrt{${radicand}}`
    : `\\sqrt[${index}]{${radicand}}`;
}

/** `sqrt(k^2) = k`: evaluate a perfect square root. */
function rootEvalRows(area: number, k: number): ReductionRow[] {
  return [
    { tokens: [{ text: sqrtTex(area), color: CIVIC }] },
    { tokens: [{ text: `${k}`, color: CIVIC }] },
  ];
}

/** `sqrt(k^2·m) = k·sqrt(m)`: take perfect squares out until none are left. */
function simplifyRadicalRows(radicand: number, k: number, m: number): ReductionRow[] {
  return [
    { tokens: [{ text: sqrtTex(radicand), color: CIVIC }] },
    { tokens: [{ text: sqrtTex(`${k * k} \\cdot ${m}`) }] },
    { tokens: [{ text: `${k}${sqrtTex(m)}`, color: CIVIC }] },
  ];
}

/** `sqrt(m / c^2) = sqrt(m) / c`: quotient rule with a perfect-square denominator. */
function quotientRadicalRows(m: number, c: number, denom: number): ReductionRow[] {
  return [
    { tokens: [{ text: sqrtTex(frac(m, denom, true)), color: CIVIC }] },
    { tokens: [{ text: frac(sqrtTex(m), sqrtTex(denom), true) }] },
    { tokens: [{ text: frac(sqrtTex(m), c, true), color: CIVIC }] },
  ];
}

/** `c·sqrt(k^2·m) = (c·k)·sqrt(m)`: pull the square out from under a coefficient. */
function coeffRadicalRows(
  c: number,
  radicand: number,
  k: number,
  m: number,
  coeff: number,
): ReductionRow[] {
  return [
    { tokens: [{ text: `${c}${sqrtTex(radicand)}`, color: CIVIC }] },
    { tokens: [{ text: `${c} \\cdot ${k}${sqrtTex(m)}` }] },
    { tokens: [{ text: `${coeff}${sqrtTex(m)}`, color: CIVIC }] },
  ];
}

/** `a·sqrt(m) + b·sqrt(m) = (a+b)·sqrt(m)`: combine like radicals. */
function combineLikeRows(a: number, b: number, m: number, sum: number): ReductionRow[] {
  return [
    { tokens: [{ text: `${a}${sqrtTex(m)} + ${b}${sqrtTex(m)}`, color: CIVIC }] },
    { tokens: [{ text: `${sum}${sqrtTex(m)}`, color: CIVIC }] },
  ];
}

/** `sqrt(first)·sqrt(j) = sqrt(j^2·m) = j·sqrt(m)`: multiply under one root, then simplify. */
function productRadicalRows(
  first: number,
  j: number,
  radicand: number,
  m: number,
): ReductionRow[] {
  return [
    {
      tokens: [{ text: sqrtTex(first), color: CIVIC }, CDOT, { text: sqrtTex(j) }],
    },
    { tokens: [{ text: sqrtTex(radicand) }] },
    { tokens: [{ text: `${j}${sqrtTex(m)}`, color: CIVIC }] },
  ];
}

/**
 * `sqrt(p^2·a) + sqrt(q^2·b) = p·sqrt(a) + q·sqrt(b)` with a != b: simplifying proves the
 * roots really are different, so the two-term sum IS the answer.
 */
function unlikeRadicalRows(
  first: number,
  second: number,
  p: number,
  a: number,
  q: number,
  b: number,
): ReductionRow[] {
  return [
    { tokens: [{ text: `${sqrtTex(first)} + ${sqrtTex(second)}`, color: CIVIC }] },
    {
      tokens: [
        { text: `${p}${sqrtTex(a)} + ${q}${sqrtTex(b)}`, color: CIVIC },
        { text: "\\text{(unlike)}", color: BRICK },
      ],
    },
  ];
}

/** `sqrt(p^2·m) + mid·sqrt(m) + sqrt(q^2·m) = sum·sqrt(m)`: a three-term combine. */
function threeTermCombineRows(
  first: number,
  mid: number,
  third: number,
  p: number,
  q: number,
  m: number,
  sum: number,
): ReductionRow[] {
  return [
    {
      tokens: [
        {
          text: `${sqrtTex(first)} + ${mid}${sqrtTex(m)} + ${sqrtTex(third)}`,
          color: CIVIC,
        },
      ],
    },
    {
      tokens: [{ text: `${p}${sqrtTex(m)} + ${mid}${sqrtTex(m)} + ${q}${sqrtTex(m)}` }],
    },
    { tokens: [{ text: `${sum}${sqrtTex(m)}`, color: CIVIC }] },
  ];
}

/** `sqrt(first) + sqrt(second) = p·sqrt(m) + q·sqrt(m) = sum·sqrt(m)`. */
function simplifyCombineRows(
  first: number,
  second: number,
  p: number,
  q: number,
  m: number,
  sum: number,
): ReductionRow[] {
  return [
    { tokens: [{ text: `${sqrtTex(first)} + ${sqrtTex(second)}`, color: CIVIC }] },
    { tokens: [{ text: `${p}${sqrtTex(m)} + ${q}${sqrtTex(m)}` }] },
    { tokens: [{ text: `${sum}${sqrtTex(m)}`, color: CIVIC }] },
  ];
}

/** `1/sqrt(p) = sqrt(p)/p`: rationalize a unit denominator. */
function rationalizeUnitRows(p: number): ReductionRow[] {
  return [
    { tokens: [{ text: frac(1, sqrtTex(p), true), color: CIVIC }] },
    {
      tokens: [{ text: frac(sqrtTex(p), `${sqrtTex(p)} \\cdot ${sqrtTex(p)}`, true) }],
    },
    { tokens: [{ text: frac(sqrtTex(p), p, true), color: CIVIC }] },
  ];
}

/** `c/sqrt(p) = t·sqrt(p)` with `c = t·p`: rationalize with a coefficient. */
function rationalizeCoeffRows(c: number, p: number, t: number): ReductionRow[] {
  return [
    { tokens: [{ text: frac(c, sqrtTex(p), true), color: CIVIC }] },
    { tokens: [{ text: frac(`${c}${sqrtTex(p)}`, p, true) }] },
    { tokens: [{ text: `${t}${sqrtTex(p)}`, color: CIVIC }] },
  ];
}

/** `base^(num/den) = value`: evaluate a rational power (root, then power). */
function rationalEvalRows(
  base: number,
  num: number,
  den: number,
  root: number,
  value: number,
): ReductionRow[] {
  return [
    { tokens: [{ text: `${base}`, sup: frac(num, den, true), color: CIVIC }] },
    { tokens: [{ text: `${root}`, sup: `${num}`, color: CIVIC }] },
    { tokens: [{ text: `${value}`, color: CIVIC }] },
  ];
}

/**
 * `base^(-num/den) = 1/value`: a negative rational power is a reciprocal.
 *
 * The `root^num` row is the arithmetic the diagram used to skip. Without it the chain
 * ran `16^{-5/4}` to `1/16^{5/4}` to `1/32`, so the fourth root of 16 was never named
 * and the power was never applied. A reveal forfeits the slot, so that row is the whole
 * paid look; the positive sibling ({@link rationalEvalRows}) always showed it.
 */
function rationalNegEvalRows(
  base: number,
  num: number,
  den: number,
  root: number,
  value: number,
): ReductionRow[] {
  return [
    { tokens: [{ text: `${base}`, sup: `-${frac(num, den, true)}`, color: BRICK }] },
    { tokens: [{ text: frac(1, `${base}^{${frac(num, den, true)}}`, true) }] },
    { tokens: [{ text: frac(1, `${root}^{${num}}`, true) }] },
    { tokens: [{ text: frac(1, value, true), color: CIVIC }] },
  ];
}

/**
 * `x^(num/den)` and its radical form, the `den`-th root of `x^num`. The index and the
 * radicand share one token because `\sqrt[n]{...}` is a single KaTeX span, so the row
 * cannot tint the index on its own the way a two-token row would.
 */
function toRadicalRows(num: number, den: number): ReductionRow[] {
  return [
    { tokens: [{ text: "x", sup: frac(num, den, true), color: CIVIC }] },
    { tokens: [{ text: sqrtTex(`x^{${num}}`, den), color: CIVIC }] },
  ];
}

/** The `den`-th root of `x^num` and its rational-exponent form `x^(num/den)`. */
function toExponentRows(num: number, den: number): ReductionRow[] {
  return [
    { tokens: [{ text: sqrtTex(`x^{${num}}`, den), color: CIVIC }] },
    { tokens: [{ text: "x", sup: frac(num, den, true), color: CIVIC }] },
  ];
}

/** `x^(n1/d1)·x^(n2/d2) = x^(rn/rd)`: add fractional exponents on the same base. */
function rationalProductRows(
  n1: number,
  d1: number,
  n2: number,
  d2: number,
  rn: number,
  rd: number,
): ReductionRow[] {
  return [
    {
      tokens: [
        { text: "x", sup: frac(n1, d1, true), color: CIVIC },
        CDOT,
        { text: "x", sup: frac(n2, d2, true), color: CIVIC },
      ],
    },
    {
      tokens: [
        {
          text: "x",
          sup: `${frac(n1, d1, true)} + ${frac(n2, d2, true)}`,
          color: CIVIC,
        },
      ],
    },
    { tokens: [{ text: "x", sup: frac(rn, rd, true), color: CIVIC }] },
  ];
}

/* -------------------------------------------------------------------------- */
/* D5 rational expressions (shared row helpers)                                */
/* -------------------------------------------------------------------------- */

/*
 * Most of this block now lives in `worked/d5Kit.tsx`, because RAT.1 to RAT.5 each have a CHECK
 * whose figure answers in the same vocabulary and which cannot import from this file. The two
 * left here are the two nothing else uses.
 */

/** A power of x: `x`, `x^{2}`, ... */
function xPowTex(power: number): string {
  return power === 1 ? "x" : `x^{${power}}`;
}

/** A linear factor read aloud, e.g. `x minus 3`, for aria-labels. */
function linSpoken(c: number): string {
  return `x ${c < 0 ? "minus" : "plus"} ${Math.abs(c)}`;
}

/* -------------------------------------------------------------------------- */
/* D5 rational expressions (RAT.1: reduce, then keep the original's zeros)     */
/* -------------------------------------------------------------------------- */

/** `a x^p / (b x^q)`: split the numbers from the powers, then reduce each. */
function monomialReduceRows(
  a: number,
  b: number,
  p: number,
  q: number,
  an: number,
  bn: number,
  k: number,
): ReductionRow[] {
  return [
    { tokens: [{ text: frac(`${a}${xPowTex(p)}`, `${b}${xPowTex(q)}`), color: CIVIC }] },
    { tokens: [{ text: `${frac(a, b)} \\cdot ${frac(xPowTex(p), xPowTex(q))}` }] },
    { tokens: [{ text: frac(`${an === 1 ? "" : an}${xPowTex(k)}`, bn), color: CIVIC }] },
    excludedRow(0),
  ];
}

/** `(c x^2 + c a x) / (x + a)`: pull the common monomial out, then cancel. */
function commonFactorRows(c: number, a: number): ReductionRow[] {
  const bottom = linTex(a);
  return [
    {
      tokens: [
        { text: frac(`${c}x^{2} ${signOp(a)} ${c * Math.abs(a)}x`, bottom), color: CIVIC },
      ],
    },
    { tokens: [{ text: frac(`${c}x(${bottom})`, bottom) }] },
    { tokens: [{ text: `${c}x`, color: CIVIC }] },
    excludedRow(-a),
  ];
}

/** `(x^2 - a^2) / (x -/+ a)`: a difference of squares over one of its own factors. */
function differenceSquaresRows(a: number, flip: number): ReductionRow[] {
  const bottom = flip === 1 ? `x + ${a}` : `x - ${a}`;
  const kept = flip === 1 ? `x - ${a}` : `x + ${a}`;
  return [
    { tokens: [{ text: frac(`x^{2} - ${a * a}`, bottom), color: CIVIC }] },
    { tokens: [{ text: frac(`(x - ${a})(x + ${a})`, bottom) }] },
    { tokens: [{ text: kept, color: CIVIC }] },
    excludedRow(flip === 1 ? -a : a),
  ];
}

/** `(c x^2 + c(a+b)x + c a b) / (x + a)`: the common number first, the trinomial second. */
function scaledTrinomialRows(a: number, b: number, c: number): ReductionRow[] {
  const bottom = linTex(a);
  return [
    { tokens: [{ text: frac(scaledQuadTex(c, a + b, a * b), bottom), color: CIVIC }] },
    { tokens: [{ text: frac(`${c}(${monicQuadTex(a + b, a * b)})`, bottom) }] },
    { tokens: [{ text: frac(`${c}(${bottom})(${linTex(b)})`, bottom) }] },
    { tokens: [{ text: `${c}x ${signOp(c * b)} ${Math.abs(c * b)}`, color: CIVIC }] },
    excludedRow(-a),
  ];
}

/**
 * `((x+s)(x+n)) / ((x+s)(x+d))`: only the SHARED factor cancels, so the reduced form is
 * still a ratio. The closing row is the whole point of the figure, because `-s` is nowhere
 * in the row above it and is forbidden anyway.
 */
function partialCancelRows(s: number, n: number, d: number): ReductionRow[] {
  return [
    {
      tokens: [
        {
          text: frac(monicQuadTex(s + n, s * n), monicQuadTex(s + d, s * d)),
          color: CIVIC,
        },
      ],
    },
    {
      tokens: [
        { text: frac(`(${linTex(s)})(${linTex(n)})`, `(${linTex(s)})(${linTex(d)})`) },
      ],
    },
    { tokens: [{ text: frac(linTex(n), linTex(d)), color: CIVIC }] },
    excludedRow(-s, -d),
  ];
}

/* -------------------------------------------------------------------------- */
/* D5 rational expressions (RAT.2: scale a batch, split it into vials)         */
/* -------------------------------------------------------------------------- */

/** A linear factor with a plain number multiplied through: `cx + ck` / `cx - c|k|`. */
function scaledLinTex(c: number, k: number): string {
  return `${c}x ${signOp(k)} ${Math.abs(c * k)}`;
}

/** `(a x^2 / b) * (bc / x)`: the conversion charm, one number and one x divide out. */
function charmProductRows(
  a: number,
  b: number,
  ratio: number,
  across: number,
  scaled: number,
): ReductionRow[] {
  return [
    {
      tokens: [
        { text: frac(`${a}${xPowTex(2)}`, b), color: CIVIC },
        TIMES_INK,
        { text: frac(ratio, "x") },
      ],
    },
    { tokens: [{ text: frac(`${across}${xPowTex(2)}`, `${b}x`) }] },
    { tokens: [{ text: `${scaled}x`, color: CIVIC }] },
    excludedRow(0),
  ];
}

/** `((cx + cp)/(x + q)) * ((x + q)/c)`: factor the number out, then cancel both. */
function scaleBatchRows(p: number, q: number, c: number): ReductionRow[] {
  const shared = linTex(q);
  const kept = linTex(p);
  return [
    {
      tokens: [
        { text: frac(scaledLinTex(c, p), shared), color: CIVIC },
        TIMES_INK,
        { text: frac(shared, c) },
      ],
    },
    { tokens: [{ text: frac(`${c}(${kept})(${shared})`, `${c}(${shared})`) }] },
    { tokens: [{ text: kept, color: CIVIC }] },
    excludedRow(-q),
  ];
}

/** `((x + p)/c) / ((x + p)/(cx + cq))`: flip, factor the flipped top, cancel. */
function vialQuotientRows(p: number, q: number, c: number): ReductionRow[] {
  const shared = linTex(p);
  const kept = linTex(q);
  return [
    {
      tokens: [
        { text: frac(shared, c), color: CIVIC },
        DIV_INK,
        { text: frac(shared, scaledLinTex(c, q)) },
      ],
    },
    {
      tokens: [
        { text: frac(shared, c) },
        TIMES_INK,
        { text: frac(`${c}(${kept})`, shared) },
      ],
    },
    { tokens: [{ text: kept, color: CIVIC }] },
    excludedRow(-p, -q),
  ];
}

/** `(trinomial/(x + p)) * ((x^2 - r^2)/(x + r))`: two factorings, then two cancels. */
function alloyProductRows(p: number, q: number, r: number): ReductionRow[] {
  const shared = linTex(p);
  const kept = linTex(q);
  return [
    {
      tokens: [
        { text: frac(monicQuadTex(p + q, p * q), shared), color: CIVIC },
        TIMES_INK,
        { text: frac(`x^{2} - ${r * r}`, `x + ${r}`) },
      ],
    },
    {
      tokens: [
        { text: frac(`(${shared})(${kept})`, shared) },
        TIMES_INK,
        { text: frac(`(x - ${r})(x + ${r})`, `x + ${r}`) },
      ],
    },
    { tokens: [{ text: `(${kept})(x - ${r})`, color: CIVIC }] },
    excludedRow(-p, -r),
  ];
}

/** `(trinomial/c) / ((x + a)/(cx + cd))`: flip, factor both tops, cancel number and factor. */
function billetQuotientRows(a: number, b: number, d: number, c: number): ReductionRow[] {
  const shared = linTex(a);
  const kept = linTex(b);
  const flipped = linTex(d);
  return [
    {
      tokens: [
        { text: frac(monicQuadTex(a + b, a * b), c), color: CIVIC },
        DIV_INK,
        { text: frac(shared, scaledLinTex(c, d)) },
      ],
    },
    {
      tokens: [
        { text: frac(`(${shared})(${kept})`, c) },
        TIMES_INK,
        { text: frac(`${c}(${flipped})`, shared) },
      ],
    },
    { tokens: [{ text: `(${kept})(${flipped})`, color: CIVIC }] },
    excludedRow(-a, -d),
  ];
}

/* -------------------------------------------------------------------------- */
/* D5 rational expressions (RAT.3: add/subtract over a common measure)         */
/* -------------------------------------------------------------------------- */

/** L1: denominators already match, so only the numerators combine. */
function sameDenomRows(
  a: number,
  b: number,
  c: number,
  op: number,
  total: number,
): ReductionRow[] {
  const den = `x + ${c}`;
  return [
    {
      tokens: [
        { text: frac(a, den) },
        op === 1 ? MINUS_INK : PLUS_INK,
        { text: frac(b, den) },
      ],
    },
    { tokens: [{ text: frac(`${a} ${op === 1 ? "-" : "+"} ${b}`, den), color: SIGNAL }] },
    { tokens: [{ text: frac(total, den), color: CIVIC }] },
    excludedRow(-c),
  ];
}

/** L2a: same denominator, two-term numerators, minus distributed across the bracket. */
function subtractNumeratorRows(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  lead: number,
  drop: number,
): ReductionRow[] {
  const den = `x + ${c}`;
  return [
    {
      tokens: [
        { text: frac(`${ratTerm(a)} + ${b}`, den) },
        MINUS_INK,
        { text: frac(`${ratTerm(d)} + ${e}`, den) },
      ],
    },
    {
      tokens: [
        {
          text: frac(`(${ratTerm(a)} + ${b}) - (${ratTerm(d)} + ${e})`, den),
          color: SIGNAL,
        },
      ],
    },
    { tokens: [{ text: frac(`${ratTerm(a)} + ${b} - ${ratTerm(d)} - ${e}`, den) }] },
    { tokens: [{ text: frac(`${ratTerm(lead)} - ${drop}`, den), color: CIVIC }] },
    excludedRow(-c),
  ];
}

/** L2b: `a/x + b/(x + p)`, common measure = the product. */
function unlikeAddRows(
  a: number,
  b: number,
  p: number,
  lead: number,
  constant: number,
): ReductionRow[] {
  const lcd = `x(x + ${p})`;
  return [
    { tokens: [{ text: frac(a, "x") }, PLUS_INK, { text: frac(b, `x + ${p}`) }] },
    { tokens: [{ text: frac(`${a}(x + ${p}) + ${b}x`, lcd), color: SIGNAL }] },
    { tokens: [{ text: frac(`${ratTerm(lead)} + ${constant}`, lcd), color: CIVIC }] },
    excludedRow(0, -p),
  ];
}

/** L3a: `a/(x + p) - b/(x + q)`, both re-expressed, then the minus distributed. */
function unlikeSubtractRows(
  a: number,
  b: number,
  p: number,
  q: number,
  lead: number,
  constant: number,
): ReductionRow[] {
  const lcd = `(x + ${p})(x + ${q})`;
  return [
    { tokens: [{ text: frac(a, `x + ${p}`) }, MINUS_INK, { text: frac(b, `x + ${q}`) }] },
    { tokens: [{ text: frac(`${a}(x + ${q}) - ${b}(x + ${p})`, lcd), color: SIGNAL }] },
    {
      tokens: [{ text: frac(`${ratTerm(a)} + ${a * q} - ${ratTerm(b)} - ${b * p}`, lcd) }],
    },
    {
      tokens: [{ text: frac(`${ratTerm(lead)} ${ratTail(constant)}`, lcd), color: CIVIC }],
    },
    excludedRow(-p, -q),
  ];
}

/** L3b: factor `x^2 + px` to see the overlap, so the measure is shared, not multiplied. */
function factorLcdRows(a: number, b: number, p: number, constant: number): ReductionRow[] {
  const lcd = `x(x + ${p})`;
  return [
    { tokens: [{ text: frac(a, "x") }, PLUS_INK, { text: frac(b, `x^2 + ${p}x`) }] },
    {
      tokens: [{ text: frac(a, "x") }, PLUS_INK, { text: frac(b, lcd), color: SIGNAL }],
    },
    { tokens: [{ text: frac(`${a}(x + ${p}) + ${b}`, lcd) }] },
    { tokens: [{ text: frac(`${ratTerm(a)} + ${constant}`, lcd), color: CIVIC }] },
    excludedRow(0, -p),
  ];
}

/* -------------------------------------------------------------------------- */
/* D5 rational functions (RAT.5: the shape the algebra draws)                  */
/* -------------------------------------------------------------------------- */

/** The monic linear factor with the given ROOT, i.e. `x - root`. */
function rootFactorTex(root: number): string {
  return linTex(-root);
}

/** The expanded monic quadratic carrying the two given roots. */
function quadFromRootsTex(r1: number, r2: number): string {
  return monicQuadTex(-(r1 + r2), r1 * r2);
}

/**
 * The aside every RAT.5 partial cancel has to record: the dose that divided out is a HOLE,
 * not the shatter. It is drawn in the signal colour rather than the exclusion brick,
 * because on this node the two fates of a forbidden dose must not look alike.
 */
function holeAsideRow(root: number): ReductionRow {
  return { tokens: [{ text: `x = ${root} \\;\\text{is a hole}`, color: SIGNAL }] };
}

/** The closing row of a RAT.5 figure: the one feature the item asked for. */
function featureRow(latex: string): ReductionRow {
  return { tokens: [{ text: latex, color: CIVIC }] };
}

/** L1: `(x + n) / (x - r)` (or a scaled bottom) down to the one dose the gauge cannot read. */
function domainRows(kind: number, k: number, root: number, n: number): ReductionRow[] {
  const bottom =
    kind === 1 ? `${k}x ${signOp(-k * root)} ${Math.abs(k * root)}` : rootFactorTex(root);
  return [
    { tokens: [{ text: frac(linTex(n), bottom), color: CIVIC }] },
    { tokens: [{ text: `${bottom} = 0` }] },
    { tokens: [{ text: `x = ${root}`, color: BRICK }] },
    featureRow(`\\{x \\mid x \\ne ${root}\\}`),
  ];
}

/** L2a: `(x^2 - h^2) / ((x -/+ h)(x - v))`, cancel, and read the surviving bottom factor. */
function verticalAsymptoteRows(h: number, flip: number, v: number): ReductionRow[] {
  const cancelled = flip === 1 ? -h : h;
  const bottom = quadFromRootsTex(cancelled, v);
  const shared = rootFactorTex(cancelled);
  const keptTop = rootFactorTex(-cancelled);
  const surviving = rootFactorTex(v);
  return [
    { tokens: [{ text: frac(`x^{2} - ${h * h}`, bottom), color: CIVIC }] },
    {
      tokens: [{ text: frac(`(x - ${h})(x + ${h})`, `(${shared})(${surviving})`) }],
    },
    { tokens: [{ text: frac(keptTop, surviving) }] },
    holeAsideRow(cancelled),
    featureRow(`x = ${v}`),
  ];
}

/** L2b: keep only the leading terms, then read the level off the degree comparison. */
function endBehaviorRows(
  kind: number,
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  ansN: number,
  ansD: number,
): ReductionRow[] {
  const top = kind === 1 ? `${a}x^{2} + ${b}x + ${c}` : `${a}x + ${b}`;
  const bottom = `${d}x^{2} + ${e}`;
  const leading = kind === 1 ? frac(`${a}x^{2}`, `${d}x^{2}`) : frac(`${a}x`, `${d}x^{2}`);
  const reduced = ansD === 1 ? `${ansN}` : frac(ansN, ansD);
  const rows: ReductionRow[] = [
    { tokens: [{ text: frac(top, bottom), color: CIVIC }] },
    { tokens: [{ text: leading, color: SIGNAL }] },
  ];
  // Only show the reduction on the draws that actually reduce, so the row never
  // prints the same ratio on both sides of the equals sign.
  if (kind === 1 && !(ansN === a && ansD === d)) {
    rows.push({ tokens: [{ text: `${frac(a, d)} = ${reduced}` }] });
  }
  rows.push(featureRow(`y = ${kind === 1 ? reduced : "0"}`));
  return rows;
}

/** L3a: cancel, then put the cancelled dose into the REDUCED gauge to get the hole's height. */
function holePointRows(h: number, v: number, m: number, p: number): ReductionRow[] {
  const shared = rootFactorTex(h);
  const keptTop = rootFactorTex(p);
  const keptBottom = rootFactorTex(v);
  const height = frac(
    `${sp(h)} ${signOp(-p)} ${Math.abs(p)}`,
    `${sp(h)} ${signOp(-v)} ${Math.abs(v)}`,
  );
  return [
    {
      tokens: [
        { text: frac(quadFromRootsTex(h, p), quadFromRootsTex(h, v)), color: CIVIC },
      ],
    },
    {
      tokens: [{ text: frac(`(${shared})(${keptTop})`, `(${shared})(${keptBottom})`) }],
    },
    { tokens: [{ text: `${height} = ${m}`, color: SIGNAL }] },
    featureRow(`(${h},\\, ${m})`),
  ];
}

/** L3b: pull the common number out, cancel, and cross zero at the SURVIVING top factor. */
function crossingRows(c: number, h: number, p: number, v: number): ReductionRow[] {
  const shared = rootFactorTex(h);
  const keptTop = rootFactorTex(p);
  const keptBottom = rootFactorTex(v);
  return [
    {
      tokens: [
        {
          text: frac(scaledQuadTex(c, -(h + p), h * p), quadFromRootsTex(h, v)),
          color: CIVIC,
        },
      ],
    },
    {
      tokens: [{ text: frac(`${c}(${shared})(${keptTop})`, `(${shared})(${keptBottom})`) }],
    },
    { tokens: [{ text: frac(`${c}(${keptTop})`, keptBottom) }] },
    holeAsideRow(h),
    { tokens: [{ text: `${keptTop} = 0` }] },
    featureRow(`(${p},\\, 0)`),
  ];
}

/* -------------------------------------------------------------------------- */
/* D5 rational equations (RAT.6: clear the measure, reject the cursed root)    */
/* -------------------------------------------------------------------------- */

/** A trailing signed variable term, `+ 3x` or `- x`. */
function ratVarTail(coeff: number): string {
  return coeff < 0 ? `- ${ratTerm(-coeff)}` : `+ ${ratTerm(coeff)}`;
}

/**
 * The forbidden list for a named unknown, drawn HIGH in every RAT.6 figure rather than at
 * the bottom: it is read off the ORIGINAL denominators, and the rows below it are the ones
 * that erase those denominators. Sibling of `excludedRow`, which is bound to `x`.
 */
function forbiddenRow(variable: string, ...values: readonly number[]): ReductionRow {
  return {
    tokens: [
      {
        text: values.map((v) => `${variable} \\neq ${v}`).join(", \\;\\; "),
        color: BRICK,
      },
    ],
  };
}

/** The candidates the clearing produced, with a cursed one struck through. */
function candidateRow(variable: string, cursed: number, kept: number): ReductionRow {
  return {
    tokens: [
      { text: `${variable} = ${cursed}`, color: BRICK, strike: true },
      { text: "\\text{or}", color: SOFT },
      { text: `${variable} = ${kept}`, color: CIVIC },
    ],
  };
}

/**
 * The closing row of every RAT.6 figure: the solution set the cauldron accepts.
 *
 * `\left\{ \right\}` rather than a bare pair, because `latex` is whatever the figure solved to
 * and one of these figures solves to a fraction. `d5.rat6.rate.l2` was closing on
 * `\{\dfrac{42}{13}\}`, a normal-size brace 0.48x the height of the display fraction inside it:
 * two stray marks beside a fraction rather than a set. `bracketSizing.browser.test.tsx`
 * measures it.
 */
function acceptedRow(latex: string): ReductionRow {
  return { tokens: [{ text: `\\left\\{${latex}\\right\\}`, color: CIVIC }] };
}

/** L1: `a/(x - p) = b` clears in one multiplication and never invents a root. */
function clearMeasureRows(
  a: number,
  b: number,
  p: number,
  r: number,
  root: number,
): ReductionRow[] {
  const den = linTex(-p);
  return [
    { tokens: [{ text: `${frac(a, den)} = ${b}`, color: CIVIC }] },
    forbiddenRow("x", p),
    { tokens: [{ text: `${a} = ${b}(${den})` }] },
    { tokens: [{ text: `${den} = ${r}` }] },
    { tokens: [{ text: `x = ${root}`, color: CIVIC }] },
    acceptedRow(`${root}`),
  ];
}

/** L2a: the combined craft rate, `1/a + 1/b = 1/t`, cleared by `abt`. */
function craftRateRows(
  a: number,
  b: number,
  num: number,
  den: number,
  answerTex: string,
): ReductionRow[] {
  return [
    {
      tokens: [
        {
          text: `${frac(1, a)} + ${frac(1, b)} = ${frac(1, "t")}`,
          color: CIVIC,
        },
      ],
    },
    forbiddenRow("t", 0),
    { tokens: [{ text: `${b}t + ${a}t = ${num}` }] },
    { tokens: [{ text: `${den}t = ${num}` }] },
    { tokens: [{ text: `t = ${answerTex}`, color: CIVIC }] },
    acceptedRow(answerTex),
  ];
}

/** L2b: mixture to target, `(s + d)/(t + d) = n/m`, cleared by cross multiplying. */
function alloyTargetRows(
  n: number,
  m: number,
  s: number,
  t: number,
  add: number,
): ReductionRow[] {
  return [
    {
      tokens: [{ text: `${frac(`${s} + d`, `${t} + d`)} = ${frac(n, m)}`, color: CIVIC }],
    },
    forbiddenRow("d", -t),
    { tokens: [{ text: `${m}(${s} + d) = ${n}(${t} + d)` }] },
    { tokens: [{ text: `${m * s} + ${m}d = ${n * t} + ${n}d` }] },
    { tokens: [{ text: `d = ${add}`, color: CIVIC }] },
    acceptedRow(`${add}`),
  ];
}

/**
 * L3a: the cursed root in its plainest form. Both sides sit over `x + p`, and the cleared
 * quadratic factors as `(x + p)(x - r)`, so one factor IS the denominator: `-p` is a root
 * the multiplication invented and the original charge forbids.
 */
function cursedRootRows(p: number, r: number, mid: number, c: number): ReductionRow[] {
  const den = `x + ${p}`;
  const top = `x^{2} ${ratVarTail(mid)}`;
  return [
    { tokens: [{ text: `${frac(top, den)} = ${frac(c, den)}`, color: CIVIC }] },
    forbiddenRow("x", -p),
    { tokens: [{ text: `${top} - ${c} = 0` }] },
    { tokens: [{ text: `(${den})(x - ${r}) = 0`, color: SIGNAL }] },
    candidateRow("x", -p, r),
    acceptedRow(`${r}`),
  ];
}

/**
 * L3b: the same cursed root behind a real common measure, `x(x + p)`.
 *
 * Every sign is formatted rather than assumed, which the practice draws do not need: they draw
 * `p` and `a` positive, and for those this prints exactly what it always did. RAT.6's CHECK is
 * the same shape with `p = -2` and `a = -5`, and the assumption showed as `x + -2` and a
 * numerator of `\frac{-5}{x}` on a figure whose arithmetic was already right.
 */
function forgeQuenchRows(p: number, r: number, a: number, b: number): ReductionRow[] {
  const den = linTex(p);
  const lcd = `x(${den})`;
  const op = a < 0 ? "-" : "+";
  const size = Math.abs(a);
  // `a` is `p - r`, so it is never zero: the two roots of this shape are always distinct.
  return [
    {
      tokens: [
        {
          text: `${frac("x", den)} ${op} ${frac(size, "x")} = ${frac(b, lcd)}`,
          color: CIVIC,
        },
      ],
    },
    forbiddenRow("x", 0, -p),
    { tokens: [{ text: `x \\cdot x ${op} ${size === 1 ? "" : size}(${den}) = ${b}` }] },
    { tokens: [{ text: `x^{2} ${op} ${ratTerm(size)} ${ratTail(-p * r)} = 0` }] },
    { tokens: [{ text: `(${den})(x - ${r}) = 0`, color: SIGNAL }] },
    candidateRow("x", -p, r),
    acceptedRow(`${r}`),
  ];
}

/* -------------------------------------------------------------------------- */
/* D5 rational expressions (RAT.4: a recipe that holds a recipe)               */
/* -------------------------------------------------------------------------- */

/** L1: `(a/x) / (b/(x + c))`. The long bar divides, so flip the bottom recipe. */
function nestedStackRows(a: number, b: number, c: number): ReductionRow[] {
  return [
    {
      ink: NESTED_ROW_H,
      tokens: [
        { text: complexFrac(frac(a, "x", true), frac(b, `x + ${c}`, true)), color: CIVIC },
      ],
    },
    {
      tokens: [
        { text: frac(a, "x") },
        TIMES_INK,
        { text: frac(`x + ${c}`, b), color: SIGNAL },
      ],
    },
    { tokens: [{ text: frac(`${a}(x + ${c})`, `${b}x`), color: CIVIC }] },
    excludedRow(0, -c),
  ];
}

/**
 * L2a: `((x + p)/x) / ((x + p)/(x + q))`. The shared recipe cancels, and the closing row is
 * the point of the figure: `-p` is nowhere in the answer and is forbidden because the recipe
 * being divided by may not be zero.
 */
function divisorTopRows(p: number, q: number): ReductionRow[] {
  return [
    {
      ink: NESTED_ROW_H,
      tokens: [
        {
          text: complexFrac(
            frac(`x + ${p}`, "x", true),
            frac(`x + ${p}`, `x + ${q}`, true),
          ),
          color: CIVIC,
        },
      ],
    },
    {
      tokens: [
        { text: frac(`x + ${p}`, "x") },
        TIMES_INK,
        { text: frac(`x + ${q}`, `x + ${p}`), color: SIGNAL },
      ],
    },
    { tokens: [{ text: frac(`x + ${q}`, "x"), color: CIVIC }] },
    excludedRow(0, -p, -q),
  ];
}

/** L2b: `(1 + a/x) / (1 - b/x)`, cleared by multiplying the whole top and bottom by `x`. */
function clearInnerRows(a: number, b: number): ReductionRow[] {
  const top = `1 + ${frac(a, "x", true)}`;
  const bottom = `1 - ${frac(b, "x", true)}`;
  return [
    { ink: NESTED_ROW_H, tokens: [{ text: complexFrac(top, bottom), color: CIVIC }] },
    {
      ink: NESTED_ROW_H,
      tokens: [
        {
          text: complexFrac(`x\\left(${top}\\right)`, `x\\left(${bottom}\\right)`),
          color: SIGNAL,
        },
      ],
    },
    { tokens: [{ text: frac(`x + ${a}`, `x - ${b}`), color: CIVIC }] },
    excludedRow(0, b),
  ];
}

/** L3a: `(a/x + b/(x + p)) / (c/(x + p))`. Combine the top first, then flip and cancel. */
function nestedSumRows(
  a: number,
  b: number,
  c: number,
  p: number,
  lead: number,
  constant: number,
): ReductionRow[] {
  const combined = `${ratTerm(lead)} + ${constant}`;
  return [
    {
      ink: NESTED_ROW_H,
      tokens: [
        {
          text: complexFrac(
            `${frac(a, "x", true)} + ${frac(b, `x + ${p}`, true)}`,
            frac(c, `x + ${p}`, true),
          ),
          color: CIVIC,
        },
      ],
    },
    {
      tokens: [
        { text: frac(combined, `x(x + ${p})`), color: SIGNAL },
        TIMES_INK,
        { text: frac(`x + ${p}`, c) },
      ],
    },
    { tokens: [{ text: frac(combined, `${c}x`), color: CIVIC }] },
    excludedRow(0, -p),
  ];
}

/**
 * L3b: `(a/x) / (1/x + 1/(x + p))`. The divisor is a MIXTURE, so the value that empties it
 * is a third forbidden dose that appears among neither the inner bottoms nor the answer.
 */
function mixtureDivisorRows(a: number, p: number, m: number): ReductionRow[] {
  const top = a === 1 ? `x + ${p}` : `${a}(x + ${p})`;
  return [
    {
      ink: NESTED_ROW_H,
      tokens: [
        {
          text: complexFrac(
            frac(a, "x", true),
            `${frac(1, "x", true)} + ${frac(1, `x + ${p}`, true)}`,
          ),
          color: CIVIC,
        },
      ],
    },
    {
      tokens: [
        { text: frac(a, "x") },
        TIMES_INK,
        { text: frac(`x(x + ${p})`, `2x + ${p}`), color: SIGNAL },
      ],
    },
    { tokens: [{ text: frac(top, `2x + ${p}`), color: CIVIC }] },
    excludedRow(0, -p, -m),
  ];
}

/* -------------------------------------------------------------------------- */
/* RAD.4: variable radicands (Boomtown Square)                                 */
/* -------------------------------------------------------------------------- */

/** `v` for a power of 1, else `v^{k}` — what a lesson would actually print. */
function powTex(symbol: string, exponent: number): string {
  return exponent === 1 ? symbol : `${symbol}^{${exponent}}`;
}

/** `\left|...\right|` when the even root has to return an absolute value, else the term bare. */
function barsTex(inner: string, bars: boolean): string {
  return bars ? `\\left|${inner}\\right|` : inner;
}

/**
 * `sqrt(v^{2k})`: rewrite the radicand as a square, then take the root. The result is
 * `|v^k|` when `k` is odd (an odd power keeps its sign) and plain `v^k` when it is even,
 * which is the distinction the node is built on, so the middle row shows the square
 * being formed rather than jumping straight to the answer.
 */
function magnitudeRootRows(v: string, half: number, bars: boolean): ReductionRow[] {
  return [
    { tokens: [{ text: sqrtTex(powTex(v, 2 * half)), color: CIVIC }] },
    { tokens: [{ text: sqrtTex(`\\left(${powTex(v, half)}\\right)^{2}`) }] },
    { tokens: [{ text: barsTex(powTex(v, half), bars), color: CIVIC }] },
  ];
}

/** `sqrt(v^n)` for odd `n`: split off the even part, halve it on the way out. */
function extractRootRows(
  v: string,
  power: number,
  even: number,
  outside: number,
): ReductionRow[] {
  return [
    { tokens: [{ text: sqrtTex(powTex(v, power)), color: CIVIC }] },
    { tokens: [{ text: sqrtTex(`${powTex(v, even)} \\cdot ${v}`) }] },
    { tokens: [{ text: `${powTex(v, outside)}${sqrtTex(v)}`, color: CIVIC }] },
  ];
}

/** `sqrt(c·v^n) = r·v^k·sqrt(f·v)`: the number and the variable each give up what they can. */
function mixedRadicandRows(
  v: string,
  constant: number,
  power: number,
  square: number,
  free: number,
  root: number,
  even: number,
  outside: number,
): ReductionRow[] {
  return [
    { tokens: [{ text: sqrtTex(`${constant}${powTex(v, power)}`), color: CIVIC }] },
    {
      tokens: [
        {
          text: sqrtTex(`${square} \\cdot ${free} \\cdot ${powTex(v, even)} \\cdot ${v}`),
        },
      ],
    },
    {
      tokens: [
        { text: `${root}${powTex(v, outside)}${sqrtTex(`${free}${v}`)}`, color: CIVIC },
      ],
    },
  ];
}

/**
 * `sqrt(c·v^2·w^n) = r·|v|·w^k·sqrt(f·w)`: both halves of the node in one expression.
 * The EVEN-power variable comes out as an absolute value, because its sign is unknown and
 * an even root cannot return a negative; the ODD-power variable needs no bars, because an even
 * root is real only where the number inside is not negative, which already forces `w >= 0`.
 */
function twoVarRadicandRows(
  v: string,
  w: string,
  constant: number,
  power: number,
  square: number,
  free: number,
  root: number,
  even: number,
  outside: number,
): ReductionRow[] {
  return [
    {
      tokens: [{ text: sqrtTex(`${constant}${v}^{2}${powTex(w, power)}`), color: CIVIC }],
    },
    {
      tokens: [
        {
          text: sqrtTex(
            `${square} \\cdot ${free} \\cdot ${v}^{2} \\cdot ${powTex(w, even)} \\cdot ${w}`,
          ),
        },
      ],
    },
    {
      tokens: [
        {
          text: `${root}\\left|${v}\\right|${powTex(w, outside)}${sqrtTex(`${free}${w}`)}`,
          color: CIVIC,
        },
      ],
    },
  ];
}

/**
 * The mill's three logged assays, each ruled real or not. Both even roots are struck out
 * for the SAME reason stated two ways, and the odd one is evaluated underneath. The
 * verdict is a WORD as well as a color, so the ruling does not depend on seeing the hue,
 * and the rows keep the prompt's own order (`slot`) so the diagram reads as that log.
 */
function RealRootLogWorked({
  cube,
  square,
  fourth,
  slot,
}: {
  cube: number;
  square: number;
  fourth: number;
  slot: number;
}): JSX.Element {
  const entries = [
    {
      latex: sqrtTex(`-${square * square}`),
      real: false,
      // The longer "no real number squared is negative" fit here in a Windows font and ran
      // 12.3px past the frame in CI's wider one, so it clipped for everybody the guard was
      // not looking at.
      note: "a square is never negative",
    },
    {
      latex: sqrtTex(`-${fourth ** 4}`, 4),
      real: false,
      // "fourth" is the radical's own index, drawn two columns to the left, and spelling it
      // out again ran the note 22 units past a 440-unit viewBox: an SVG root clips, so what
      // shipped was "a fourth power is even, so never nega" at every width.
      note: "an even power is never negative",
    },
    { latex: sqrtTex(`-${cube ** 3}`, 3), real: true, note: "an odd power keeps the sign" },
  ];
  const order = slot === 0 ? [2, 0, 1] : slot === 1 ? [0, 2, 1] : [0, 1, 2];

  return (
    <svg
      viewBox="0 0 440 186"
      role="img"
      aria-label={`Of the three roots only the cube root of negative ${cube ** 3} is real, and it equals negative ${cube}`}
    >
      <title>Which of the three roots is a real number</title>
      {order.map((entryIndex, row) => {
        const entry = entries[entryIndex];
        if (!entry) {
          return null;
        }
        const y = 34 + row * 40;
        const color = entry.real ? CIVIC : BRICK;
        return (
          <g key={entry.latex}>
            <SvgMath latex={entry.latex} x={92} y={y} fontSize={18} w={140} />
            <text x={176} y={y} dominantBaseline="central" fontSize={13} fill={color}>
              {entry.real ? "real" : "not real"}
            </text>
            {/* CI's wider text metrics put the longest note 1px past the phone frame after
                the immersive surface widened that well. Six viewBox units preserve the gap
                after the verdict and leave a real right inset under both font stacks. */}
            <text x={238} y={y} dominantBaseline="central" fontSize={12} fill={SOFT}>
              {entry.note}
            </text>
          </g>
        );
      })}
      <line x1={40} y1={140} x2={400} y2={140} stroke={LINE} strokeWidth={1} />
      <SvgMath
        latex={`(-${cube})^{3} = -${cube ** 3}, \\ \\text{so} \\ ${sqrtTex(`-${cube ** 3}`, 3)} = -${cube}`}
        x={220}
        y={166}
        fontSize={16}
        color={LABEL}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Area model (distributive)                                                   */
/* -------------------------------------------------------------------------- */

/** A two-cell area model for a distributed product. Every label is LaTeX. */
function AreaModelWorked({
  height,
  leftTop,
  leftArea,
  rightTop,
  rightArea,
  footer,
  ariaLabel,
}: {
  height: number;
  leftTop: string;
  leftArea: string;
  rightTop: string;
  rightArea: string;
  footer: string;
  ariaLabel: string;
}): JSX.Element {
  const left = 70;
  const top = 44;
  const cellH = 104;
  const leftW = 180;
  const rightW = 150;
  const split = left + leftW;
  const right = split + rightW;
  const midY = top + cellH / 2;

  return (
    <svg viewBox="0 0 440 200" role="img" aria-label={ariaLabel}>
      <title>Area model for the distributive property</title>
      <rect
        x={left}
        y={top}
        width={leftW}
        height={cellH}
        fill={SIGNAL}
        fillOpacity={0.18}
        stroke={LINE}
        strokeWidth={1.25}
      />
      <rect
        x={split}
        y={top}
        width={rightW}
        height={cellH}
        fill={CIVIC}
        fillOpacity={0.18}
        stroke={LINE}
        strokeWidth={1.25}
      />

      <SvgMath latex={leftTop} x={left + leftW / 2} y={28} fontSize={14} w={leftW} />
      <SvgMath latex={rightTop} x={split + rightW / 2} y={28} fontSize={14} w={rightW} />
      <line x1={left} y1={38} x2={right} y2={38} stroke={LINE} strokeWidth={1} />

      {/* The height is a bare integer, and rotating a foreignObject is the one
          transform browsers disagree about, so this label stays plain text. */}
      <text
        x={50}
        y={midY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14}
        fill={LABEL}
        transform={`rotate(-90 50 ${midY})`}
      >
        {height}
      </text>

      <SvgMath latex={leftArea} x={left + leftW / 2} y={midY} fontSize={16} w={leftW} />
      <SvgMath latex={rightArea} x={split + rightW / 2} y={midY} fontSize={16} w={rightW} />

      <SvgMath latex={footer} x={(left + right) / 2} y={180} fontSize={14} color={SOFT} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Percent bar                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Percent bar for `p% of base`: the full bar is the base amount, the shaded part is
 * `p%` of it, and the boundary lands on the value. The conversion is written out.
 */
function PercentBarWorked({ p, base }: { p: number; base: number }): JSX.Element {
  const x0 = 40;
  const width = 360;
  const y = 40;
  const height = 38;
  const filled = width * (p / 100);
  const dec = numStr(p / 100);
  const value = numStr((p * base) / 100);
  const boundaryX = x0 + filled;
  const bottom = y + height;

  return (
    <svg
      viewBox="0 0 440 172"
      role="img"
      aria-label={`A bar representing ${base}, with ${p} percent shaded, landing on ${value}`}
    >
      <title>{`${p} percent of ${base} is ${value}`}</title>
      <rect
        x={x0}
        y={y}
        width={width}
        height={height}
        fill="var(--paper-deep)"
        stroke={LINE}
        strokeWidth={1.25}
      />
      <rect x={x0} y={y} width={filled} height={height} fill={CIVIC} fillOpacity={0.85} />
      <rect
        x={x0}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={LINE}
        strokeWidth={1.25}
      />

      <SvgMath latex={`${p}\\%`} x={x0 + filled / 2} y={y - 14} fontSize={14} />

      {/* Endpoint ticks show the base scale (0 .. base), not 0 .. 100. */}
      <line x1={x0} y1={bottom} x2={x0} y2={bottom + 6} stroke={LINE} strokeWidth={1.25} />
      <text x={x0} y={bottom + 20} textAnchor="middle" fontSize={12} fill={SOFT}>
        0
      </text>
      <line
        x1={x0 + width}
        y1={bottom}
        x2={x0 + width}
        y2={bottom + 6}
        stroke={LINE}
        strokeWidth={1.25}
      />
      <text x={x0 + width} y={bottom + 20} textAnchor="middle" fontSize={12} fill={SOFT}>
        {base}
      </text>

      {/* The shaded boundary lands on the value. */}
      <line
        x1={boundaryX}
        y1={bottom}
        x2={boundaryX}
        y2={bottom + 6}
        stroke={CIVIC}
        strokeWidth={1.5}
      />
      <text
        x={boundaryX}
        y={bottom + 20}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill={CIVIC}
      >
        {value}
      </text>

      <SvgMath
        latex={`${p}\\% = ${dec}`}
        x={x0 + width / 2}
        y={bottom + 44}
        fontSize={15}
      />
      <SvgMath
        latex={`${dec} \\times ${base} = ${value}`}
        x={x0 + width / 2}
        y={bottom + 70}
        fontSize={15}
      />
    </svg>
  );
}

/**
 * "What percent of X is Y?": the full bar is the whole `x`, the shaded part is `y`,
 * and the boundary is labeled with the unknown percent. The fraction `y/x` is
 * reduced and read off as a percent below.
 */
function PercentSolveWorked({ x, y, p }: { x: number; y: number; p: number }): JSX.Element {
  const x0 = 40;
  const width = 360;
  const barY = 40;
  const height = 38;
  const filled = width * (y / x);
  const boundaryX = x0 + filled;
  const bottom = barY + height;

  return (
    <svg
      viewBox="0 0 440 192"
      role="img"
      aria-label={`A bar of ${x} with ${y} shaded, which is ${p} percent`}
    >
      <title>{`${y} is ${p} percent of ${x}`}</title>
      <rect
        x={x0}
        y={barY}
        width={width}
        height={height}
        fill="var(--paper-deep)"
        stroke={LINE}
        strokeWidth={1.25}
      />
      <rect
        x={x0}
        y={barY}
        width={filled}
        height={height}
        fill={CIVIC}
        fillOpacity={0.85}
      />
      <rect
        x={x0}
        y={barY}
        width={width}
        height={height}
        fill="none"
        stroke={LINE}
        strokeWidth={1.25}
      />

      <SvgMath latex={`${p}\\%`} x={x0 + filled / 2} y={barY - 14} fontSize={14} />

      {/* Endpoint ticks show the whole scale (0 .. x). */}
      <line x1={x0} y1={bottom} x2={x0} y2={bottom + 6} stroke={LINE} strokeWidth={1.25} />
      <text x={x0} y={bottom + 20} textAnchor="middle" fontSize={12} fill={SOFT}>
        0
      </text>
      <line
        x1={x0 + width}
        y1={bottom}
        x2={x0 + width}
        y2={bottom + 6}
        stroke={LINE}
        strokeWidth={1.25}
      />
      <text x={x0 + width} y={bottom + 20} textAnchor="middle" fontSize={12} fill={SOFT}>
        {x}
      </text>

      {/* The shaded boundary marks the part y. */}
      <line
        x1={boundaryX}
        y1={bottom}
        x2={boundaryX}
        y2={bottom + 6}
        stroke={CIVIC}
        strokeWidth={1.5}
      />
      <text
        x={boundaryX}
        y={bottom + 20}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill={CIVIC}
      >
        {y}
      </text>

      {/* The stacked fractions need more room than the one-line labels above. */}
      <SvgMath
        latex={`${frac(y, x)} = ${fracTex(y, x)}`}
        x={x0 + width / 2}
        y={bottom + 44}
        fontSize={15}
      />
      <SvgMath
        latex={`${fracTex(y, x)} = ${p}\\%`}
        x={x0 + width / 2}
        y={bottom + 84}
        fontSize={15}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Signed number line                                                          */
/* -------------------------------------------------------------------------- */

/**
 * `(±a) + (±b)`: two signed jumps on a number line.
 * Each jump goes left for a negative addend and right for a positive one.
 */
function SignedNumberLineWorked({
  a,
  b,
  sa = 1,
  sb = 1,
}: {
  a: number;
  b: number;
  sa?: number;
  sb?: number;
}): JSX.Element {
  const opA = sa === 1 ? -a : a;
  const opB = sb === 1 ? -b : b;
  const sum = opA + opB;
  const min = Math.min(0, opA, sum) - 1;
  const max = Math.max(0, opA, sum) + 1;
  const range = max - min;
  const leftPad = 30;
  const plotW = 440 - leftPad - 30;
  const step = plotW / range;
  const y = 96;
  const X = (v: number) => leftPad + (v - min) * step;
  const labelEvery = range > 14 ? 2 : 1;

  const jump = (from: number, to: number, color: string, latex: string) => {
    const x1 = X(from);
    const x2 = X(to);
    const mx = (x1 + x2) / 2;
    const tipX = x2;
    const tipY = y - 6;
    // Scale arc height to jump span so short jumps don't get a tall skinny loop.
    const span = Math.abs(x2 - x1);
    const rise = Math.min(56, Math.max(28, span * 0.55));
    const apex = tipY - rise;
    // Label centers just above the curve peak (midway between tip and control point).
    const labelY = (tipY + apex) / 2 - 10;
    const dx = tipX - mx;
    const dy = tipY - apex;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const size = 8;
    const bx = tipX - ux * size;
    const by = tipY - uy * size;
    const px = -uy * (size * 0.55);
    const py = ux * (size * 0.55);
    return (
      <g>
        <path
          d={`M ${x1} ${tipY} Q ${mx} ${apex} ${x2} ${tipY}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
        <path
          d={`M ${tipX} ${tipY} L ${bx + px} ${by + py} L ${bx - px} ${by - py} Z`}
          fill={color}
        />
        <SvgMath latex={latex} x={mx} y={labelY} fontSize={13} color={color} w={90} />
      </g>
    );
  };

  const ticks: number[] = [];
  for (let v = Math.ceil(min); v <= max; v += 1) {
    ticks.push(v);
  }

  const jumpLatex = (v: number) => `${v < 0 ? "-" : "+"} ${Math.abs(v)}`;

  return (
    <svg
      viewBox="0 0 440 150"
      role="img"
      aria-label={`Number line: start at 0, jump to ${spoken(opA)}, then to ${spoken(sum)}`}
    >
      <title>Adding two signed numbers on a number line</title>
      <SvgMath
        latex={`${sopd(a, sa === 1)} + ${sopd(b, sb === 1)} = ${sum}`}
        x={220}
        y={16}
        fontSize={14}
      />
      <line x1={X(min)} y1={y} x2={X(max)} y2={y} stroke={LABEL} strokeWidth={1.75} />
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={X(v)}
            y1={y - 5}
            x2={X(v)}
            y2={y + 5}
            stroke={LABEL}
            strokeWidth={1.25}
          />
          {/* Not on the landing tick: the sum gets its own bold label at this exact spot
              below, and drawing both painted the same numeral twice, one weight over the
              other, for a smeared faux-bold. It reads as a rendering fault rather than as
              emphasis, which is the opposite of what the bold is for. */}
          {v % labelEvery === 0 && v !== sum && (
            <text
              x={X(v)}
              y={y + 20}
              textAnchor="middle"
              fontSize={11}
              fill={v === 0 ? LABEL : SOFT}
              fontWeight={v === 0 ? 700 : 400}
            >
              {v}
            </text>
          )}
        </g>
      ))}
      {jump(0, opA, BRICK, jumpLatex(opA))}
      {jump(opA, sum, CIVIC, jumpLatex(opB))}
      <circle cx={X(sum)} cy={y} r={5.5} fill={LABEL} />
      <text
        x={X(sum)}
        y={y + 20}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill={LABEL}
      >
        {sum}
      </text>
    </svg>
  );
}

/**
 * Recall an inverse. kind 1: the reciprocal of `a/b` as a numerator/denominator
 * swap. kind 0: the additive inverse (opposite) of `m` as its mirror across 0 on a
 * number line, so the two values sit the same distance from zero on opposite sides.
 */
function InverseRecallWorked({
  kind,
  a,
  b,
  s,
}: {
  kind: number;
  a: number;
  b: number;
  s: number;
}): JSX.Element {
  if (kind === 1) {
    return (
      <svg
        viewBox="0 0 440 120"
        role="img"
        aria-label={`The reciprocal of ${a} over ${b} swaps to ${b} over ${a}`}
      >
        <title>Reciprocal: swap numerator and denominator</title>
        <SvgMath latex={frac(a, b)} x={150} y={58} fontSize={18} w={120} />
        <text
          x={220}
          y={58}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={22}
          fill={LINE}
        >
          &#8594;
        </text>
        <SvgMath latex={frac(b, a)} x={290} y={58} fontSize={18} w={120} />
      </svg>
    );
  }
  const m = s === 1 ? -a : a;
  const opp = -m;
  const min = -a - 1;
  const max = a + 1;
  const range = max - min;
  const leftPad = 30;
  const plotW = 440 - leftPad - 30;
  const step = plotW / range;
  const y = 74;
  const X = (v: number) => leftPad + (v - min) * step;
  const ticks: number[] = [];
  for (let v = Math.ceil(min); v <= max; v += 1) {
    ticks.push(v);
  }
  const dot = (v: number, color: string) => (
    <g>
      <circle cx={X(v)} cy={y} r={5.5} fill={color} />
      <text
        x={X(v)}
        y={y - 12}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fill={color}
      >
        {v}
      </text>
    </g>
  );
  return (
    <svg
      viewBox="0 0 440 120"
      role="img"
      aria-label={`On a number line, ${spoken(m)} and its additive inverse ${spoken(opp)} are the same distance from 0 on opposite sides`}
    >
      <title>Additive inverse: the opposite across zero</title>
      <SvgMath
        latex={`${m} \\ \\text{and} \\ ${opp} \\ \\text{are opposites}`}
        x={220}
        y={22}
        fontSize={14}
      />
      <line x1={X(min)} y1={y} x2={X(max)} y2={y} stroke={LABEL} strokeWidth={1.75} />
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={X(v)}
            y1={y - 5}
            x2={X(v)}
            y2={y + 5}
            stroke={LABEL}
            strokeWidth={1.25}
          />
          <text
            x={X(v)}
            y={y + 20}
            textAnchor="middle"
            fontSize={11}
            fill={v === 0 ? LABEL : SOFT}
            fontWeight={v === 0 ? 700 : 400}
          >
            {v}
          </text>
        </g>
      ))}
      {dot(m, CIVIC)}
      {dot(opp, SIGNAL)}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Fractions                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A stack of reduction rows, each one KaTeX expression, with a down-arrow between
 * them. `\dfrac` does the stacked-fraction layout the rows used to draw by hand, so a
 * row is now just a LaTeX string and the pitch only has to clear a display fraction.
 */
function FracReductionRows({
  rows,
  top = 44,
  pitch = 60,
  fontSize = 18,
}: {
  rows: string[];
  top?: number;
  pitch?: number;
  fontSize?: number;
}): JSX.Element {
  return (
    <>
      {rows.map((latex, index) => {
        const rowY = top + index * pitch;
        return (
          <g key={latex}>
            {index > 0 && (
              <text
                x={220}
                y={stackGapMid(rowY - pitch, rowY)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fill={LINE}
              >
                &#8595;
              </text>
            )}
            <SvgMath latex={latex} x={220} y={rowY} fontSize={fontSize} />
          </g>
        );
      })}
    </>
  );
}

/** Fraction bars over a common denominator. Labels are LaTeX. */
function FractionBarsWorked({
  parts,
  fillA,
  fillB,
  labelA,
  labelB,
  labelSum,
  footer,
  ariaLabel,
  fillSum: fillSumProp,
}: {
  parts: number;
  fillA: number;
  fillB: number;
  labelA: string;
  labelB: string;
  labelSum: string;
  footer: string;
  ariaLabel: string;
  fillSum?: number;
}): JSX.Element {
  const x0 = 96;
  const width = 300;
  const barH = 30;
  const seg = width / parts;
  const labelCx = x0 / 2;
  const fillSum = fillSumProp ?? fillA + fillB;
  // A sum >= 1 whole can't fit in a single unit bar, so show it as a full unit
  // bar plus a second "remainder" bar (a mixed-number view). Sums here stay < 2.
  const improper = fillSum > parts;
  const remainder = fillSum - parts;
  const sumY = 132;
  const sumY2 = sumY + barH + 6;
  // The footer's stacked fractions are ~2.4em tall and centered on `footerY`.
  const footerY = improper ? sumY2 + barH + 22 : 180;
  const svgH = improper ? sumY2 + barH + 40 : 198;

  const bar = (yTop: number, filled: number, color: string) => (
    <g>
      <rect
        x={x0}
        y={yTop}
        width={width}
        height={barH}
        fill="var(--paper)"
        stroke={LINE}
        strokeWidth={1.25}
      />
      <rect
        x={x0}
        y={yTop}
        width={Math.max(0, Math.min(seg * filled, width))}
        height={barH}
        fill={color}
        fillOpacity={0.85}
      />
      {Array.from({ length: parts - 1 }, (_, i) => x0 + seg * (i + 1)).map((lx) => (
        <line
          key={lx}
          x1={lx}
          y1={yTop}
          x2={lx}
          y2={yTop + barH}
          stroke={LINE}
          strokeWidth={1}
        />
      ))}
      <rect
        x={x0}
        y={yTop}
        width={width}
        height={barH}
        fill="none"
        stroke={LINE}
        strokeWidth={1.25}
      />
    </g>
  );
  const row = (yTop: number, label: string, filled: number, color: string) => (
    <>
      <SvgMath latex={label} x={labelCx} y={yTop + barH / 2} fontSize={13} w={x0 - 8} />
      {bar(yTop, filled, color)}
    </>
  );

  return (
    <svg viewBox={`0 0 440 ${svgH}`} role="img" aria-label={ariaLabel}>
      <title>Adding fractions over a common denominator</title>
      {row(28, labelA, fillA, CIVIC)}
      {row(80, labelB, fillB, SIGNAL)}
      {improper ? (
        <>
          {row(sumY, labelSum, parts, CIVIC)}
          {bar(sumY2, remainder, CIVIC)}
        </>
      ) : (
        row(sumY, labelSum, fillSum, CIVIC)
      )}
      <SvgMath latex={footer} x={220} y={footerY} fontSize={12} color={SOFT} />
    </svg>
  );
}

/** Multiply two fractions straight across, then reduce: `a/b x c/d`. */
function FractionMultiplyWorked({
  a,
  b,
  c,
  d,
}: {
  a: number;
  b: number;
  c: number;
  d: number;
}): JSX.Element {
  const num = a * c;
  const den = b * d;

  const rows = [
    `${frac(a, b)} \\times ${frac(c, d)}`,
    frac(`${a} \\times ${c}`, `${b} \\times ${d}`),
    reduceTail(num, den),
  ];

  return (
    <svg
      viewBox="0 0 440 208"
      role="img"
      aria-label={`Multiply ${a} over ${b} by ${c} over ${d} straight across as ${a} times ${c} over ${b} times ${d}, which is ${fracSpoken(num, den)}`}
    >
      <title>Multiplying two fractions</title>
      <FracReductionRows rows={rows} />
    </svg>
  );
}

/** Divide two fractions (flip the divisor), then add a third: `(a/b ÷ c/d) + e/f`. */
function FractionDivideAddWorked({
  a,
  b,
  c,
  d,
  e,
  f,
}: {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}): JSX.Element {
  const quot = reduce(a * d, b * c);
  const rawSumN = quot.n * f + e * quot.d;
  const rawSumD = quot.d * f;

  // Either the quotient or the total can land on a whole number, in which case
  // `fracTex` writes it as one rather than as an n-over-1 fraction. The last row
  // shows the sum over the common denominator before reducing it, matching the
  // step array, so the reduction is not something the diagram does silently.
  const rows = [
    `${frac(a, b)} \\div ${frac(c, d)} + ${frac(e, f)}`,
    `${frac(a, b)} \\times ${frac(d, c)} + ${frac(e, f)}`,
    `${fracTex(quot.n, quot.d)} + ${frac(e, f)}`,
    reduceTail(rawSumN, rawSumD),
  ];

  return (
    <svg
      viewBox="0 0 440 260"
      role="img"
      aria-label={`Divide ${a} over ${b} by ${c} over ${d} by flipping to times ${d} over ${c}, then add ${e} over ${f} to get ${fracSpoken(rawSumN, rawSumD)}`}
    >
      <title>Dividing fractions, then adding a third</title>
      <FracReductionRows rows={rows} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Unit rate                                                                   */
/* -------------------------------------------------------------------------- */

/** A rate whose denominator names its unit, e.g. `\dfrac{\$12}{3\ \text{notebooks}}`. */
function rate(amount: string, count: number, unit: string): string {
  return frac(amount, `${count}\\ \\text{${unit}}`);
}

/** The inner shapes for one object icon, drawn in a 0..24 local box. */
function objectIconShapes(index: number): JSX.Element {
  const stroke = { stroke: LABEL, strokeWidth: 1.3, strokeLinejoin: "round" as const };
  switch (index) {
    case 1: // pencil
      return (
        <>
          <path d="M8 16 L16 8 L19 11 L11 19 Z" fill={SIGNAL} {...stroke} />
          <path d="M16 8 L18 6 L21 9 L19 11 Z" fill={BRICK} {...stroke} />
          <path d="M8 16 L11 19 L5.5 21.5 Z" fill={SOFT} {...stroke} />
          <path d="M6.6 20.4 L8.9 18.1 L5.5 21.5 Z" fill={LABEL} />
        </>
      );
    case 2: // notebook
      return (
        <>
          <rect x={7} y={4} width={12} height={17} rx={1.5} fill={CIVIC} {...stroke} />
          <line x1={5} y1={7.5} x2={9} y2={7.5} {...stroke} />
          <line x1={5} y1={12} x2={9} y2={12} {...stroke} />
          <line x1={5} y1={16.5} x2={9} y2={16.5} {...stroke} />
          <line x1={11.5} y1={9} x2={16.5} y2={9} stroke={SOFT} strokeWidth={1.1} />
          <line x1={11.5} y1={12.5} x2={16.5} y2={12.5} stroke={SOFT} strokeWidth={1.1} />
          <line x1={11.5} y1={16} x2={16.5} y2={16} stroke={SOFT} strokeWidth={1.1} />
        </>
      );
    case 3: // marker
      return (
        <>
          <rect x={8} y={4} width={8} height={5} rx={1} fill={SIGNAL} {...stroke} />
          <rect x={8.5} y={9} width={7} height={8} fill={BRICK} {...stroke} />
          <path d="M9.5 17 L14.5 17 L13 21 L11 21 Z" fill={LABEL} {...stroke} />
        </>
      );
    case 4: // eraser
      return (
        <g transform="rotate(-14 12 13)">
          <rect x={6} y={9} width={12} height={8} rx={1.6} fill={SIGNAL} {...stroke} />
          <path
            d="M6 14 H18 V15.4 A1.6 1.6 0 0 1 16.4 17 H7.6 A1.6 1.6 0 0 1 6 15.4 Z"
            fill={BRICK}
            {...stroke}
          />
        </g>
      );
    case 5: // folder
      return (
        <>
          <path d="M4 8 H10 L12 10 H20 V19 H4 Z" fill={CIVIC} {...stroke} />
          <path d="M4 19 L6.5 12.5 H22 L19.5 19 Z" fill={SIGNAL} {...stroke} />
        </>
      );
    case 6: // apple
      return (
        <>
          <path
            d="M12 9 C8.5 6.2 4.8 8.8 5.6 13.4 C6.1 17.4 9.2 20.6 12 20.6 C14.8 20.6 17.9 17.4 18.4 13.4 C19.2 8.8 15.5 6.2 12 9 Z"
            fill={BRICK}
            {...stroke}
          />
          <path d="M12 9 L12 5" stroke={LABEL} strokeWidth={1.3} strokeLinecap="round" />
          <path d="M12 6.4 Q15 3.8 16.6 6.8 Q13.2 8.2 12 6.4 Z" fill={CIVIC} {...stroke} />
        </>
      );
    case 7: // muffin
      return (
        <>
          <path d="M8 14 L16 14 L15 21 L9 21 Z" fill={SOFT} {...stroke} />
          <line x1={10.7} y1={14} x2={10.3} y2={21} stroke={LABEL} strokeWidth={1} />
          <line x1={13.3} y1={14} x2={13.7} y2={21} stroke={LABEL} strokeWidth={1} />
          <path
            d="M6.5 14 C6.5 8.8 9 7 12 7 C15 7 17.5 8.8 17.5 14 Z"
            fill={SIGNAL}
            {...stroke}
          />
          <circle cx={10} cy={11} r={1} fill={BRICK} />
          <circle cx={13.4} cy={11.8} r={1} fill={BRICK} />
        </>
      );
    default: // 0 pen
      return (
        <>
          <path d="M7 17 L15 9 L18.5 12.5 L10.5 20.5 Z" fill={CIVIC} {...stroke} />
          <path d="M14.2 8.2 L16.8 5.6 L19.9 8.7 L17.3 11.3 Z" fill={SIGNAL} {...stroke} />
          <path d="M7 17 L10.5 20.5 L5.5 22 Z" fill={SOFT} {...stroke} />
          <path d="M6.4 21.1 L8.6 18.9 L5.5 22 Z" fill={LABEL} />
        </>
      );
  }
}

/** A small decorative icon for a unit-rate object, centered at (cx, cy). */
function ObjectIcon({
  index,
  cx,
  cy,
  size = 22,
}: {
  index: number;
  cx: number;
  cy: number;
  size?: number;
}): JSX.Element {
  const scale = size / 24;
  return (
    <g transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${scale})`}>
      {objectIconShapes(index)}
    </g>
  );
}

/** A centered row of `count` object icons (e.g. n notebooks above the left ratio). */
function ObjectIconRow({
  index,
  count,
  cx,
  cy,
  size = 16,
}: {
  index: number;
  count: number;
  cx: number;
  cy: number;
  size?: number;
}): JSX.Element {
  const gap = size + 2;
  const startX = cx - ((count - 1) * gap) / 2;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const iconCx = startX + i * gap;
        return <ObjectIcon key={iconCx} index={index} cx={iconCx} cy={cy} size={size} />;
      })}
    </g>
  );
}

/** `$total for n objects -> price per object -> x m objects`. */
function UnitRateWorked({
  unitPrice,
  n,
  m,
  objectIndex,
}: {
  unitPrice: number;
  n: number;
  m: number;
  objectIndex: number;
}): JSX.Element {
  const total = unitPrice * n;
  const answer = unitPrice * m;
  const obj = unitRateObject(objectIndex);
  const yMid = 54;

  return (
    <svg
      viewBox="0 0 440 136"
      role="img"
      aria-label={`Divide ${numStr(total)} dollars by ${n} ${obj.plural} to get ${numStr(unitPrice)} dollars per ${obj.singular}, then multiply by ${m} ${obj.plural} to get ${numStr(answer)} dollars`}
    >
      <title>{`Unit rate: find the price of one ${obj.singular}, then scale up`}</title>
      <ObjectIconRow index={objectIndex} count={n} cx={100} cy={18} />
      <ObjectIconRow index={objectIndex} count={1} cx={280} cy={18} />
      <SvgMath
        latex={rate(dollars(total), n, obj.plural)}
        x={100}
        y={yMid}
        fontSize={14}
        w={170}
      />
      <line x1={158} y1={yMid} x2={214} y2={yMid} stroke={SOFT} strokeWidth={1.5} />
      <path d={`M 214 ${yMid} L 206 ${yMid - 4} L 206 ${yMid + 4} Z`} fill={SOFT} />
      <SvgMath
        latex={`\\div ${n}`}
        x={186}
        y={yMid - 16}
        fontSize={12}
        color={SIGNAL}
        w={70}
      />
      <SvgMath
        latex={rate(dollars(unitPrice), 1, obj.singular)}
        x={280}
        y={yMid}
        fontSize={14}
        w={170}
      />
      <SvgMath
        latex={`${dollars(unitPrice)} \\times ${m}\\ \\text{${obj.plural}} = ${dollars(answer)}`}
        x={220}
        y={112}
        fontSize={15}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Registry                                                                    */
/* -------------------------------------------------------------------------- */

/** NUM.5 L1 and L2 are the same "p% of base" shape, so they share one caption. */
function percentOfCaption({ p = 0, base = 0 }: Record<string, number>): string {
  const dec = numStr(p / 100);
  return `Convert $${p}\\%$ to $${dec}$, then $${dec} \\times ${base} = ${numStr((p * base) / 100)}$.`;
}

/**
 * Parameterized SVG worked solutions keyed by item `template_id`. Every D1 template
 * is covered; multiple ids can share one archetype. Add an entry to promote a new
 * template from step-card fallback to a full SVG worked solution.
 */
const WORKED_SOLUTION_VISUALS: Record<string, WorkedSolutionVisual> = {
  // ---- NUM.S: signed numbers ----
  "d1.num-s.l1": {
    Svg: ({ a = 0, b = 0, sa = 1, sb = 1 }) => (
      <SignedNumberLineWorked a={a} b={b} sa={sa} sb={sb} />
    ),
    caption: ({ a = 0, b = 0, sa = 1, sb = 1 }) => {
      const opA = sa === 1 ? -a : a;
      const opB = sb === 1 ? -b : b;
      return `Combine the signed numbers on the line: $${sopd(a, sa === 1)} + ${sopd(b, sb === 1)} = ${opA + opB}$.`;
    },
  },
  "d1.num-s.l2": {
    Svg: ({ a = 0, b = 0, c = 0, sa = 0, sb = 0, sc = 0, order = 0 }) => (
      <ExpressionReductionWorked
        rows={signedProductSumRows(a, b, c, sa, sb, sc, order)}
        title="Signed arithmetic worked step by step"
        ariaLabel="Multiply the two factors first, then add"
      />
    ),
    caption: ({ a = 0, b = 0, c = 0, sa = 0, sb = 0, sc = 0 }) => {
      const opA = sa === 1 ? -a : a;
      const product = (sb === 1 ? -b : b) * (sc === 1 ? -c : c);
      return `Multiply first (mind the signs), then add: $${opA + product}$.`;
    },
  },
  "d1.num-s.l3": {
    Svg: ({ a = 0, b = 0, c = 0, d = 0, sa = 0, sb = 0, sc = 0, sd = 0 }) => (
      <ExpressionReductionWorked
        rows={signedTwoProductsRows(a, b, c, d, sa, sb, sc, sd)}
        title="Signed arithmetic worked step by step"
        ariaLabel="Work out both products, then add them"
      />
    ),
    caption: ({ a = 0, b = 0, c = 0, d = 0, sa = 0, sb = 0, sc = 0, sd = 0 }) => {
      const p1 = (sa === 1 ? -a : a) * (sb === 1 ? -b : b);
      const p2 = (sc === 1 ? -c : c) * (sd === 1 ? -d : d);
      return `Same signs make a positive, different signs a negative; then add: $${p1 + p2}$.`;
    },
  },
  "d1.num-s.l2b": {
    Svg: ({ a = 0, b = 0, c = 0, sa = 0, sb = 0, sc = 0 }) => (
      <ExpressionReductionWorked
        rows={signedSumRows(a, b, c, sa, sb, sc)}
        title="Signed arithmetic worked step by step"
        ariaLabel="Add the three signed numbers left to right"
      />
    ),
    caption: ({ a = 0, b = 0, c = 0, sa = 0, sb = 0, sc = 0 }) => {
      const total = (sa === 1 ? -a : a) + (sb === 1 ? -b : b) + (sc === 1 ? -c : c);
      return `Add left to right, minding each sign: $${total}$.`;
    },
  },
  "d1.num-s.l1b": {
    Svg: ({ a = 0, b = 0, sa = 0, sb = 0, op = 0 }) => (
      <ExpressionReductionWorked
        rows={absCombineRows(a, b, sa, sb, op)}
        title="Absolute value worked step by step"
        ariaLabel="Take each absolute value, then combine the results"
      />
    ),
    caption: ({ a = 0, b = 0, op = 0 }) =>
      `Absolute value drops the sign, then ${op === 1 ? "subtract" : "add"}: $${op === 1 ? a - b : a + b}$.`,
  },
  "d1.num-s.l2c": {
    Svg: ({ a = 0, b = 0, sa = 0, sb = 0 }) => (
      <ExpressionReductionWorked
        rows={absOfSumRows(a, b, sa, sb)}
        title="Absolute value worked step by step"
        ariaLabel="Evaluate inside the bars, then take the absolute value"
      />
    ),
    caption: ({ a = 0, b = 0, sa = 0, sb = 0 }) => {
      const inner = (sa === 1 ? -a : a) + (sb === 1 ? -b : b);
      return `Evaluate inside the bars, then take the distance from zero: $${Math.abs(inner)}$.`;
    },
  },

  // ---- NUM.F: fractions ----
  "d1.num-f.l1": {
    Svg: ({ a = 1, b = 1, d = 1, op = 0 }) => {
      const num = op === 1 ? a - b : a + b;
      const opSym = op === 1 ? "-" : "+";
      return (
        <FractionBarsWorked
          parts={d}
          fillA={a}
          fillB={b}
          fillSum={num}
          labelA={frac(a, d)}
          labelB={`${opSym} ${frac(b, d)}`}
          labelSum={`= ${fracTex(num, d)}`}
          footer={`${frac(a, d)} ${opSym} ${frac(b, d)} = ${reduceTail(num, d)}`}
          ariaLabel={`${a} over ${d} ${op === 1 ? "minus" : "plus"} ${b} over ${d} is ${fracSpoken(num, d)}`}
        />
      );
    },
    caption: ({ a = 1, b = 1, d = 1, op = 0 }) => {
      const num = op === 1 ? a - b : a + b;
      return `Same denominator: ${op === 1 ? "subtract" : "add"} the numerators to get $${reduceTail(num, d, true)}$.`;
    },
  },
  "d1.num-f.l2": {
    Svg: ({ a = 1, b = 1, d1 = 1, d2 = 1, op = 0 }) => {
      const P = d1 * d2;
      const left = a * d2;
      const right = b * d1;
      const num = op === 1 ? left - right : left + right;
      const opSym = op === 1 ? "-" : "+";
      return (
        <FractionBarsWorked
          parts={P}
          fillA={left}
          fillB={right}
          fillSum={num}
          labelA={frac(a, d1)}
          labelB={`${opSym} ${frac(b, d2)}`}
          labelSum={`= ${fracTex(num, P)}`}
          footer={`${frac(left, P)} ${opSym} ${frac(right, P)} = ${reduceTail(num, P)}`}
          ariaLabel={`Rewrite over ${P}ths: ${left} over ${P} ${op === 1 ? "minus" : "plus"} ${right} over ${P} is ${fracSpoken(num, P)}`}
        />
      );
    },
    caption: ({ a = 1, b = 1, d1 = 1, d2 = 1, op = 0 }) => {
      const P = d1 * d2;
      const left = a * d2;
      const right = b * d1;
      const num = op === 1 ? left - right : left + right;
      return `Common denominator ${P}: $${frac(left, P, true)} ${op === 1 ? "-" : "+"} ${frac(right, P, true)} = ${reduceTail(num, P, true)}$.`;
    },
  },
  "d1.num-f.l3": {
    Svg: ({ a = 1, b = 1, c = 1, d = 1, e = 1, f = 1 }) => (
      <FractionDivideAddWorked a={a} b={b} c={c} d={d} e={e} f={f} />
    ),
    caption: ({ a = 1, b = 1, c = 1, d = 1, e = 1, f = 1 }) => {
      const quot = reduce(a * d, b * c);
      const num = quot.n * f + e * quot.d;
      const den = quot.d * f;
      return `Divide first by flipping, then add: $${reduceTail(num, den, true)}$.`;
    },
  },
  "d1.num-f.l2b": {
    Svg: ({ a = 1, b = 1, c = 1, d = 1 }) => (
      <FractionMultiplyWorked a={a} b={b} c={c} d={d} />
    ),
    caption: ({ a = 1, b = 1, c = 1, d = 1 }) =>
      `Multiply across: $${frac(`${a} \\times ${c}`, `${b} \\times ${d}`, true)} = ${reduceTail(a * c, b * d, true)}$.`,
  },

  // ---- NUM.2: order of operations ----
  "d1.num-2.l1": {
    Svg: ({ a = 0, b = 0, c = 0, order = 0 }) => (
      <ExpressionReductionWorked
        rows={pemdasProductSumRows(a, b, c, order)}
        title="Order of operations worked step by step"
        ariaLabel={`Multiply ${b} times ${c} first, then add ${a}`}
      />
    ),
    caption: ({ a = 0, b = 0, c = 0 }) =>
      `Multiply $${b} \\times ${c}$ first, then add $${a}$ to get $${a + b * c}$.`,
  },
  "d1.num-2.l2": {
    Svg: ({ a = 0, b = 0, c = 0, e = 0, op = 0 }) => (
      <ExpressionReductionWorked
        rows={pemdasProductSumExtraRows(a, b, c, e, op)}
        title="Order of operations worked step by step"
        ariaLabel={`Multiply ${b} times ${c} first, then add and subtract left to right`}
      />
    ),
    caption: ({ a = 0, b = 0, c = 0, e = 0, op = 0 }) => {
      const value = op === 1 ? a + b * c - e : a + b * c + e;
      return `Multiply $${b} \\times ${c}$ first, then work left to right: $${value}$.`;
    },
  },
  "d1.num-2.l3": {
    Svg: ({ a = 0, b = 0, c = 0, d = 0, op = 0 }) => (
      <ExpressionReductionWorked
        rows={pemdasSquareRows(a, b, c, d, op)}
        title="Order of operations worked step by step"
        ariaLabel="Parentheses, then the exponent, then the product, then add or subtract"
      />
    ),
    caption: ({ a = 0, b = 0, c = 0, d = 0, op = 0 }) => {
      const value = op === 1 ? c * d + (a + b) ** 2 : (a + b) ** 2 - c * d;
      return op === 1
        ? `Multiply, then add the square: $${c} \\times ${d} + (${a} + ${b})^{2} = ${value}$.`
        : `Parentheses, exponent, multiply, subtract: $(${a} + ${b})^{2} - ${c} \\times ${d} = ${value}$.`;
    },
  },
  "d1.num-2.l3b": {
    Svg: ({ a = 0, b = 0, c = 0, d = 0 }) => (
      <ExpressionReductionWorked
        rows={parenTimesMinusRows(a, b, c, d)}
        title="Order of operations worked step by step"
        ariaLabel="Parentheses first, then multiply, then subtract"
      />
    ),
    caption: ({ a = 0, b = 0, c = 0, d = 0 }) =>
      `Parentheses, then multiply, then subtract: $(${a} + ${b}) \\times ${c} - ${d} = ${(a + b) * c - d}$.`,
  },

  // ---- NUM.3: distributive property ----
  "d1.num-3.l1": {
    Svg: ({ a = 0, b = 0, varIndex = 0, order = 0 }) => {
      const v = expressionVariable(varIndex);
      const inner = order === 1 ? `${b} + ${v}` : `${v} + ${b}`;
      return (
        <AreaModelWorked
          height={a}
          leftTop={order === 1 ? `${b}` : v}
          leftArea={order === 1 ? `${a * b}` : vt(a, v)}
          rightTop={order === 1 ? v : `${b}`}
          rightArea={order === 1 ? vt(a, v) : `${a * b}`}
          footer={`${a}(${inner}) = ${vt(a, v)} + ${a * b}`}
          ariaLabel={`A rectangle of height ${a} split into ${v} and ${b}, with areas ${vt(a, v)} and ${a * b}`}
        />
      );
    },
    caption: ({ a = 0, b = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return `Height $${a}$ split into $${v}$ and $${b}$: the areas $${vt(a, v)}$ and $${a * b}$ add to the answer.`;
    },
  },
  "d1.num-3.l2": {
    Svg: ({ a = 0, b = 0, c = 0, varIndex = 0, order = 0 }) => {
      const v = expressionVariable(varIndex);
      const inner = order === 1 ? `${c} + ${vt(b, v)}` : `${vt(b, v)} + ${c}`;
      return (
        <AreaModelWorked
          height={a}
          leftTop={order === 1 ? `${c}` : vt(b, v)}
          leftArea={order === 1 ? `${a * c}` : vt(a * b, v)}
          rightTop={order === 1 ? vt(b, v) : `${c}`}
          rightArea={order === 1 ? vt(a * b, v) : `${a * c}`}
          footer={`${a}(${inner}) = ${vt(a * b, v)} + ${a * c}`}
          ariaLabel={`A rectangle of height ${a} split into ${vt(b, v)} and ${c}, with areas ${vt(a * b, v)} and ${a * c}`}
        />
      );
    },
    caption: ({ a = 0, b = 0, c = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return `Height $${a}$ split into $${vt(b, v)}$ and $${c}$: the areas $${vt(a * b, v)}$ and $${a * c}$ add to the answer.`;
    },
  },
  "d1.num-3.l3": {
    Svg: ({ a = 0, b = 0, c = 0, d = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return (
        <ExpressionReductionWorked
          rows={expandCombineRows(a, b, c, d, v)}
          title="Distribute each product, then combine like terms"
          ariaLabel={`Distribute both products, then combine to ${vt(a + c, v)} + ${a * b + c * d}`}
        />
      );
    },
    caption: ({ a = 0, b = 0, c = 0, d = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return `Distribute both, then combine: $${vt(a + c, v)} + ${a * b + c * d}$.`;
    },
  },
  "d1.num-3.l2b": {
    Svg: ({ a = 0, b = 0, c = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return (
        <ExpressionReductionWorked
          rows={distributeConstantRows(a, b, c, v)}
          title="Distribute, then combine the constants"
          ariaLabel={`Distribute ${a}, then combine the constants to get ${vt(a, v)} + ${a * b + c}`}
        />
      );
    },
    caption: ({ a = 0, b = 0, c = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return `Distribute, then add the constants: $${vt(a, v)} + ${a * b + c}$.`;
    },
  },
  "d1.num-3.l1b": {
    Svg: ({ kind = 0, a = 0, b = 0, s = 0 }) => (
      <InverseRecallWorked kind={kind} a={a} b={b} s={s} />
    ),
    caption: ({ kind = 0, a = 0, b = 0, s = 0 }) => {
      if (kind === 1) {
        return `The reciprocal swaps numerator and denominator: $${frac(b, a, true)}$.`;
      }
      const m = s === 1 ? -a : a;
      return `The additive inverse is the opposite across zero: $${-m}$.`;
    },
  },
  "d1.num-3.l2c": {
    Svg: ({ kind = 0, p = 0, m = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return (
        <ExpressionReductionWorked
          rows={inverseIdentityRows(kind, m, p, v)}
          title="Simplify using an inverse and an identity"
          ariaLabel={`The inverse cancels to the identity, leaving ${vt(p, v)}`}
        />
      );
    },
    caption: ({ kind = 0, p = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return kind === 1
        ? `A number times its reciprocal is 1, leaving $${vt(p, v)}$.`
        : `A number plus its opposite is 0, leaving $${vt(p, v)}$.`;
    },
  },

  // ---- NUM.4: combine like terms ----
  "d1.num-4.l1": {
    Svg: ({ p = 0, q = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return (
        <ExpressionReductionWorked
          rows={combineRows(p, q, v)}
          title="Combine like terms by adding coefficients"
          ariaLabel={`Add the coefficients ${p} and ${q} to get ${vt(p + q, v)}`}
        />
      );
    },
    caption: ({ p = 0, q = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return `Add the coefficients: $${p} + ${q} = ${p + q}$, so $${vt(p + q, v)}$.`;
    },
  },
  "d1.num-4.l2": {
    Svg: ({ p = 0, q = 0, r = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return (
        <ExpressionReductionWorked
          rows={combineWithConstantRows(p, q, r, v)}
          title="Combine like terms, keep the constant"
          ariaLabel={`Add the ${v}-coefficients ${p} and ${q}, keep negative ${r}`}
        />
      );
    },
    caption: ({ p = 0, q = 0, r = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return `Add the $${v}$-coefficients and keep the constant: $${vt(p + q, v)} - ${r}$.`;
    },
  },
  "d1.num-4.l3": {
    Svg: ({ m = 0, k = 0, n = 0, varIndex = 0, order = 0 }) => {
      const v = expressionVariable(varIndex);
      return (
        <ExpressionReductionWorked
          rows={distributeCombineRows(m, k, n, v, order)}
          title="Distribute, then combine like terms"
          ariaLabel={`Distribute ${m}, then add the ${v}-terms to get ${vt(m + n, v)} minus ${m * k}`}
        />
      );
    },
    caption: ({ m = 0, k = 0, n = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return `Distribute first, then combine the $${v}$-terms: $${vt(m + n, v)} - ${m * k}$.`;
    },
  },
  "d1.num-4.l2b": {
    Svg: ({ p = 0, q = 0, r = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return (
        <ExpressionReductionWorked
          rows={subtractCombineRows(p, q, r, v)}
          title="Subtract like terms, keep the constant"
          ariaLabel={`Subtract the ${v}-coefficients ${p} and ${q}, keep + ${r}`}
        />
      );
    },
    caption: ({ p = 0, q = 0, r = 0, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return `Subtract the $${v}$-coefficients and keep the constant: $${vt(p - q, v)} + ${r}$.`;
    },
  },

  // ---- NUM.5: percent and rate ----
  "d1.num-5.l1": {
    Svg: ({ p = 0, base = 0 }) => <PercentBarWorked p={p} base={base} />,
    caption: percentOfCaption,
  },
  "d1.num-5.l2": {
    Svg: ({ p = 0, base = 0 }) => <PercentBarWorked p={p} base={base} />,
    caption: percentOfCaption,
  },
  "d1.num-5.l3": {
    Svg: ({ unitPrice = 0, n = 1, m = 1, objectIndex = 0 }) => (
      <UnitRateWorked unitPrice={unitPrice} n={n} m={m} objectIndex={objectIndex} />
    ),
    caption: ({ unitPrice = 0, n = 1, m = 1, objectIndex = 0 }) => {
      const obj = unitRateObject(objectIndex);
      return `One ${obj.singular} costs ${dollarsProse(unitPrice)}, from ${dollarsProse(unitPrice * n)} split across $${n}$; so ${m} ${obj.plural} cost ${dollarsProse(unitPrice * m)}.`;
    },
  },
  "d1.num-5.l2b": {
    Svg: ({ x = 1, y = 0, p = 0 }) => <PercentSolveWorked x={x} y={y} p={p} />,
    caption: ({ x = 1, y = 0, p = 0 }) =>
      `The part over the whole is $${frac(y, x, true)} = ${fracTex(y, x, true)}$, which is $${p}\\%$.`,
  },

  // ---- EXP.1: exponent laws (Boomtown Square) ----
  "d2.exp.product.l1": {
    Svg: ({ a = 1, b = 1 }) => (
      <ExpressionReductionWorked
        rows={productExponentRows("x", a, b)}
        title="Product rule worked step by step"
        ariaLabel={`Add the exponents ${a} and ${b} to get x to the ${a + b}`}
      />
    ),
    caption: ({ a = 1, b = 1 }) =>
      `Same base: add the exponents $${a} + ${b} = ${a + b}$, so $x^{${a + b}}$.`,
  },
  "d2.exp.net.l2": {
    Svg: ({ a = 1, b = 1 }) => (
      <ExpressionReductionWorked
        rows={netExponentRows("x", a, b)}
        title="Net exponent worked step by step"
        ariaLabel={`Add ${a} and negative ${b}, then write with a positive exponent`}
      />
    ),
    caption: ({ a = 1, b = 1 }) => {
      const net = a - b;
      return net >= 0
        ? `Add the exponents: $${a} + ${sp(-b)} = ${net}$, positive so $x^{${net}}$.`
        : `Add the exponents: $${a} + ${sp(-b)} = ${net}$, negative so $${frac(1, `x^{${-net}}`, true)}$.`;
    },
  },
  "d2.exp.power.l2": {
    Svg: ({ a = 1, b = 1, varIndex = 0 }) => (
      <ExpressionReductionWorked
        rows={powerOfPowerRows(expressionVariable(varIndex), a, b)}
        title="Power of a power worked step by step"
        ariaLabel={`Multiply the exponents ${a} and ${b} to get ${expressionVariable(varIndex)} to the ${a * b}`}
      />
    ),
    caption: ({ a = 1, b = 1, varIndex = 0 }) =>
      `A power of a power multiplies exponents: $${a} \\times ${b} = ${a * b}$, so $${expressionVariable(varIndex)}^{${a * b}}$.`,
  },
  "d2.exp.twovar.l3": {
    Svg: ({ a = 1, b = 1 }) => (
      <ExpressionReductionWorked
        rows={twoVarExponentRows(a, b)}
        title="Two-variable positive-exponent form"
        ariaLabel={`x to the ${a} stays up, y to the negative ${b} moves down to y to the ${b}`}
      />
    ),
    caption: ({ a = 1, b = 1 }) =>
      `$x^{${a}}$ stays up; the negative $y$-power moves down: $${frac(`x^{${a}}`, `y^{${b}}`, true)}$.`,
  },
  "d2.exp.build.l3": {
    Svg: ({ a = 1, b = 2, c = 4, varIndex = 0 }) => (
      <ExpressionReductionWorked
        rows={threeFactorNetRows(expressionVariable(varIndex), a, b, c)}
        title="Build the positive-exponent form"
        ariaLabel={`Add ${a}, negative ${b} and ${c} to build ${expressionVariable(varIndex)} to the ${a - b + c}`}
      />
    ),
    caption: ({ a = 1, b = 2, c = 4, varIndex = 0 }) =>
      `Add left to right: $${a} + ${sp(-b)} = ${a - b}$, then $${a - b} + ${c} = ${a - b + c}$. Build base $${expressionVariable(varIndex)}$, exponent $${a - b + c}$.`,
  },
  "d2.exp.quotient.l2": {
    Svg: ({ a = 4, b = 4, varIndex = 0 }) => (
      <ExpressionReductionWorked
        rows={quotientExponentRows(expressionVariable(varIndex), a, b)}
        title="Divide two powers of one base"
        ariaLabel={`${expressionVariable(varIndex)} to the ${a} over ${expressionVariable(varIndex)} to the ${b} subtracts to ${a - b}`}
      />
    ),
    caption: ({ a = 4, b = 4, varIndex = 0 }) => {
      const symbol = expressionVariable(varIndex);
      const net = a - b;
      const finish =
        net === 0
          ? `and any base to the power $0$ is $1$`
          : net > 0
            ? `positive, so $${symbol}^{${net}}$`
            : `negative, so $${frac(1, `${symbol}^{${-net}}`, true)}$`;
      return `Dividing subtracts the exponents: $${a} - ${b} = ${net}$, ${finish}.`;
    },
  },

  // ---- RAD.1: evaluate + simplify roots (Boomtown Square) ----
  "d2.rad1.eval.l1": {
    Svg: ({ area = 0, k = 0 }) => (
      <ExpressionReductionWorked
        rows={rootEvalRows(area, k)}
        title="Evaluate a perfect square root"
        ariaLabel={`The square root of ${area} is ${k}`}
      />
    ),
    caption: ({ area = 0, k = 0 }) =>
      `$${k} \\times ${k} = ${area}$, so $\\sqrt{${area}} = ${k}$.`,
  },
  "d2.rad1.simplify.l2": {
    Svg: ({ radicand = 0, k = 0, m = 0 }) => (
      <ExpressionReductionWorked
        rows={simplifyRadicalRows(radicand, k, m)}
        title="Simplify a square root"
        ariaLabel={`The square root of ${radicand} is ${k} root ${m}`}
      />
    ),
    caption: ({ radicand = 0, k = 0, m = 0 }) =>
      `$${radicand} = ${k * k} \\times ${m}$, so $\\sqrt{${radicand}} = ${k}\\sqrt{${m}}$.`,
  },
  "d2.rad1.quotient.l2": {
    Svg: ({ m = 0, c = 0, denom = 0 }) => (
      <ExpressionReductionWorked
        rows={quotientRadicalRows(m, c, denom)}
        title="Quotient rule for a square root"
        ariaLabel={`The square root of ${m} over ${denom} is root ${m} over ${c}`}
      />
    ),
    caption: ({ m = 0, c = 0, denom = 0 }) =>
      `Split the root over the fraction: $\\sqrt{${denom}} = ${c}$, giving $${frac(`\\sqrt{${m}}`, c, true)}$.`,
  },
  "d2.rad1.coeff.l3": {
    Svg: ({ c = 0, radicand = 0, k = 0, m = 0, coeff = 0 }) => (
      <ExpressionReductionWorked
        rows={coeffRadicalRows(c, radicand, k, m, coeff)}
        title="Simplify a coefficient times a root"
        ariaLabel={`${c} root ${radicand} is ${coeff} root ${m}`}
      />
    ),
    caption: ({ c = 0, k = 0, m = 0, coeff = 0 }) =>
      `Simplify the root to $${k}\\sqrt{${m}}$, then $${c} \\times ${k} = ${coeff}$, giving $${coeff}\\sqrt{${m}}$.`,
  },
  "d2.rad1.build.l3": {
    Svg: ({ first = 0, j = 0, radicand = 0, m = 0 }) => (
      <ExpressionReductionWorked
        rows={productRadicalRows(first, j, radicand, m)}
        title="Multiply two roots, then build the simplified radical"
        ariaLabel={`Root ${first} times root ${j} is root ${radicand}, which is ${j} root ${m}`}
      />
    ),
    caption: ({ first = 0, j = 0, radicand = 0, m = 0 }) =>
      `$\\sqrt{${first}} \\cdot \\sqrt{${j}} = \\sqrt{${radicand}} = ${j}\\sqrt{${m}}$: coefficient $${j}$, radicand $${m}$, index $2$.`,
  },

  // ---- RAD.2: combine radicals + rationalize (Boomtown Square) ----
  "d2.rad2.combine-like.l1": {
    Svg: ({ a = 0, b = 0, m = 0, sum = 0 }) => (
      <ExpressionReductionWorked
        rows={combineLikeRows(a, b, m, sum)}
        title="Combine like radicals"
        ariaLabel={`${a} root ${m} plus ${b} root ${m} is ${sum} root ${m}`}
      />
    ),
    caption: ({ a = 0, b = 0, m = 0, sum = 0 }) =>
      `Same root, so add the coefficients: $${a} + ${b} = ${sum}$, giving $${sum}\\sqrt{${m}}$.`,
  },
  "d2.rad2.simplify-combine.l2": {
    Svg: ({ first = 0, second = 0, p = 0, q = 0, m = 0, sum = 0 }) => (
      <ExpressionReductionWorked
        rows={simplifyCombineRows(first, second, p, q, m, sum)}
        title="Simplify then combine radicals"
        ariaLabel={`Root ${first} plus root ${second} is ${sum} root ${m}`}
      />
    ),
    caption: ({ first = 0, second = 0, p = 0, q = 0, m = 0, sum = 0 }) =>
      `Simplify each: $\\sqrt{${first}} = ${p}\\sqrt{${m}}$ and $\\sqrt{${second}} = ${q}\\sqrt{${m}}$, then add to $${sum}\\sqrt{${m}}$.`,
  },
  "d2.rad2.unlike.l2": {
    Svg: ({ first = 0, second = 0, p = 0, a = 0, q = 0, b = 0 }) => (
      <ExpressionReductionWorked
        rows={unlikeRadicalRows(first, second, p, a, q, b)}
        title="Simplify two radicals that do not combine"
        ariaLabel={`Root ${first} plus root ${second} simplifies to ${p} root ${a} plus ${q} root ${b}, which do not combine`}
      />
    ),
    caption: ({ first = 0, second = 0, p = 0, a = 0, q = 0, b = 0 }) =>
      `$\\sqrt{${first}} = ${p}\\sqrt{${a}}$ and $\\sqrt{${second}} = ${q}\\sqrt{${b}}$. The roots differ, so $${p}\\sqrt{${a}} + ${q}\\sqrt{${b}}$ is the finished answer.`,
  },
  "d2.rad2.rationalize-unit.l2": {
    Svg: ({ p = 0 }) => (
      <ExpressionReductionWorked
        rows={rationalizeUnitRows(p)}
        title="Rationalize a unit denominator"
        ariaLabel={`1 over root ${p} is root ${p} over ${p}`}
      />
    ),
    caption: ({ p = 0 }) =>
      `Multiply top and bottom by $\\sqrt{${p}}$; the bottom becomes $${p}$, giving $${frac(`\\sqrt{${p}}`, p, true)}$.`,
  },
  "d2.rad2.rationalize-coeff.l3": {
    Svg: ({ c = 0, p = 0, t = 0 }) => (
      <ExpressionReductionWorked
        rows={rationalizeCoeffRows(c, p, t)}
        title="Rationalize with a coefficient"
        ariaLabel={`${c} over root ${p} is ${t} root ${p}`}
      />
    ),
    caption: ({ c = 0, p = 0, t = 0 }) =>
      `Multiply by $${frac(`\\sqrt{${p}}`, `\\sqrt{${p}}`, true)}$; the bottom becomes $${p}$ and $${frac(c, p, true)} = ${t}$, giving $${t}\\sqrt{${p}}$.`,
  },
  "d2.rad2.build.l3": {
    Svg: ({ first = 0, mid = 0, third = 0, p = 0, q = 0, m = 0, sum = 0 }) => (
      <ExpressionReductionWorked
        rows={threeTermCombineRows(first, mid, third, p, q, m, sum)}
        title="Simplify, then build the three-term combined radical"
        ariaLabel={`Root ${first} plus ${mid} root ${m} plus root ${third} is ${sum} root ${m}`}
      />
    ),
    caption: ({ p = 0, mid = 0, q = 0, m = 0, sum = 0 }) =>
      `Simplify the outer two, then add all three: $${p} + ${mid} + ${q} = ${sum}$. Build $${sum}\\sqrt{${m}}$: coefficient $${sum}$, radicand $${m}$, index $2$.`,
  },

  // ---- RAD.3: rational exponent <-> radical form (Boomtown Square) ----
  "d2.rad3.eval.l1": {
    Svg: ({ base = 0, num = 0, den = 0, root = 0, value = 0 }) => (
      <ExpressionReductionWorked
        rows={rationalEvalRows(base, num, den, root, value)}
        title="Evaluate a rational power"
        ariaLabel={`${base} to the ${num} over ${den} is ${value}`}
      />
    ),
    caption: ({ base = 0, num = 0, den = 0, root = 0, value = 0 }) =>
      `Take the ${rootName(den)} root of $${base}$, which is $${root}$, then raise to the $${num}$: $${root}^{${num}} = ${value}$.`,
  },
  "d2.rad3.to-radical.l2": {
    Svg: ({ num = 0, den = 0 }) => (
      <ExpressionReductionWorked
        rows={toRadicalRows(num, den)}
        title="Rational power to radical form"
        ariaLabel={`x to the ${num} over ${den} is the ${den} root of x to the ${num}`}
      />
    ),
    caption: ({ num = 0, den = 0 }) =>
      `The numerator $${num}$ is the power under the root; the denominator $${den}$ is the root index: $${sqrtTex(`x^{${num}}`, den)}$.`,
  },
  "d2.rad3.to-exponent.l2": {
    Svg: ({ num = 0, den = 0 }) => (
      <ExpressionReductionWorked
        rows={toExponentRows(num, den)}
        title="Radical to rational-exponent form"
        ariaLabel={`The ${den} root of x to the ${num} is x to the ${num} over ${den}`}
      />
    ),
    caption: ({ num = 0, den = 0 }) =>
      `The power $${num}$ becomes the numerator; the index $${den}$ becomes the denominator: $x^{${frac(num, den, true)}}$.`,
  },
  "d2.rad3.negeval.l3": {
    Svg: ({ base = 0, num = 0, den = 0, root = 0, value = 0 }) => (
      <ExpressionReductionWorked
        rows={rationalNegEvalRows(base, num, den, root, value)}
        title="Evaluate a negative rational power"
        ariaLabel={`${base} to the negative ${num} over ${den} is 1 over ${value}`}
      />
    ),
    caption: ({ base = 0, num = 0, den = 0, root = 0, value = 0 }) =>
      `A negative exponent is a reciprocal. The ${rootName(den)} root of $${base}$ is $${root}$ and $${root}^{${num}} = ${value}$, so $${base}^{-${frac(num, den, true)}} = ${frac(1, value, true)}$.`,
  },
  "d2.rad3.simplify.l3": {
    Svg: ({ n1 = 0, d1 = 1, n2 = 0, d2 = 1, rn = 0, rd = 1 }) => (
      <ExpressionReductionWorked
        rows={rationalProductRows(n1, d1, n2, d2, rn, rd)}
        title="Multiply powers with fractional exponents"
        ariaLabel={`x to the ${n1} over ${d1} times x to the ${n2} over ${d2} is x to the ${rn} over ${rd}`}
      />
    ),
    caption: ({ n1 = 0, d1 = 1, n2 = 0, d2 = 1, rn = 0, rd = 1 }) =>
      `Same base, so add the exponents: $${frac(n1, d1, true)} + ${frac(n2, d2, true)} = ${frac(rn, rd, true)}$.`,
  },

  // ---- RAT.1: simplify rational expressions (Verdigris Hold) ----
  "d5.rat1.monomial.l1": {
    Svg: ({ a = 0, b = 1, p = 2, q = 1, an = 1, bn = 1, k = 1 }) => (
      <ExpressionReductionWorked
        rows={monomialReduceRows(a, b, p, q, an, bn, k)}
        title="Simplify a monomial over a monomial"
        ariaLabel={`${a} x to the ${p} over ${b} x to the ${q} reduces to ${an} x to the ${k} over ${bn}, with excluded value x not equal to 0`}
      />
    ),
    caption: ({ an = 1, bn = 1, k = 1 }) =>
      `Divide the coefficients and subtract the exponents: $${frac(`${an === 1 ? "" : an}${xPowTex(k)}`, bn, true)}$, with excluded value $x \\ne 0$ from the original denominator.`,
  },
  "d5.rat1.factor-out.l2": {
    Svg: ({ c = 1, mag = 1, neg = 0 }) => (
      <ExpressionReductionWorked
        rows={commonFactorRows(c, neg === 1 ? -mag : mag)}
        title="Factor the numerator, then cancel the denominator"
        ariaLabel={`The numerator factors into ${c} x times the denominator, leaving ${c} x, with excluded value x equals ${spoken(neg === 1 ? mag : -mag)}`}
      />
    ),
    caption: ({ c = 1, mag = 1, neg = 0 }) => {
      const a = neg === 1 ? -mag : mag;
      return `Factoring the numerator gives $${c}x(${linTex(a)})$, so cancelling $(${linTex(a)})$ leaves $${c}x$, with excluded value $x \\ne ${-a}$.`;
    },
  },
  "d5.rat1.difference.l2": {
    Svg: ({ a = 1, flip = 0 }) => (
      <ExpressionReductionWorked
        rows={differenceSquaresRows(a, flip)}
        title="A difference of squares over one of its factors"
        ariaLabel={`x squared minus ${a * a} factors into x minus ${a} times x plus ${a}, with excluded value x equals ${spoken(flip === 1 ? -a : a)}`}
      />
    ),
    caption: ({ a = 1, flip = 0 }) => {
      const bottom = flip === 1 ? `x + ${a}` : `x - ${a}`;
      const kept = flip === 1 ? `x - ${a}` : `x + ${a}`;
      return `The numerator is $(x - ${a})(x + ${a})$, so cancelling $(${bottom})$ leaves $${kept}$, with excluded value $x \\ne ${flip === 1 ? -a : a}$.`;
    },
  },
  "d5.rat1.scaled.l3": {
    Svg: ({ amag = 1, aneg = 0, bmag = 1, bneg = 0, c = 1 }) => {
      const a = aneg === 1 ? -amag : amag;
      const b = bneg === 1 ? -bmag : bmag;
      return (
        <ExpressionReductionWorked
          rows={scaledTrinomialRows(a, b, c)}
          title="Factor out the common coefficient, then factor the trinomial"
          ariaLabel={`Factor out ${c}, split the trinomial, cancel the denominator, leaving ${c} x plus ${spoken(c * b)}, with excluded value x equals ${spoken(-a)}`}
        />
      );
    },
    caption: ({ amag = 1, aneg = 0, bmag = 1, bneg = 0, c = 1 }) => {
      const a = aneg === 1 ? -amag : amag;
      const b = bneg === 1 ? -bmag : bmag;
      return `Factor out $${c}$, factor the rest into $(${linTex(a)})(${linTex(b)})$, cancel, and $${c}x ${signOp(c * b)} ${Math.abs(c * b)}$ is left, with excluded value $x \\ne ${-a}$.`;
    },
  },
  "d5.rat1.partial-cancel.l3": {
    Svg: ({ smag = 1, sneg = 0, nmag = 1, nneg = 0, dmag = 1, dneg = 0 }) => {
      const s = sneg === 1 ? -smag : smag;
      const n = nneg === 1 ? -nmag : nmag;
      const d = dneg === 1 ? -dmag : dmag;
      return (
        <ExpressionReductionWorked
          rows={partialCancelRows(s, n, d)}
          title="Cancel only the factor the numerator and denominator share"
          ariaLabel={`Both parts factor, only ${linSpoken(s)} is shared, leaving ${linSpoken(n)} over ${linSpoken(d)}, with excluded values x equals ${spoken(-s)} and x equals ${spoken(-d)}`}
        />
      );
    },
    caption: ({ smag = 1, sneg = 0, nmag = 1, nneg = 0, dmag = 1, dneg = 0 }) => {
      const s = sneg === 1 ? -smag : smag;
      const n = nneg === 1 ? -nmag : nmag;
      const d = dneg === 1 ? -dmag : dmag;
      return `Only $(${linTex(s)})$ is shared, so only it cancels, leaving $${frac(linTex(n), linTex(d), true)}$ with excluded values $x \\ne ${-s}$ and $x \\ne ${-d}$. The excluded value $x \\ne ${-s}$ is visible only in the original denominator.`;
    },
  },

  // ---- RAT.2: multiply and divide rational expressions (Verdigris Hold) ----
  "d5.rat2.charm.l1": {
    Svg: ({ a = 0, b = 1, ratio = 0, across = 0, scaled = 0 }) => (
      <ExpressionReductionWorked
        rows={charmProductRows(a, b, ratio, across, scaled)}
        title="Multiply two monomial fractions"
        ariaLabel={`${a} x squared over ${b}, times ${ratio} over x, is ${scaled} x, with excluded value x not equal to 0`}
      />
    ),
    caption: ({ b = 1, scaled = 0 }) =>
      `Multiply across, then divide out $${b}$ and one factor of $x$, leaving $${scaled}x$ with excluded value $x \\neq 0$.`,
  },
  "d5.rat2.scale.l2": {
    Svg: ({ p = 0, q = 0, c = 1 }) => (
      <ExpressionReductionWorked
        rows={scaleBatchRows(p, q, c)}
        title="Multiply by a rational expression"
        ariaLabel={`The product simplifies to ${linSpoken(p)}, with excluded value x not equal to ${-q}`}
      />
    ),
    caption: ({ p = 0, q = 0, c = 1 }) =>
      `Pull $${c}$ out of the numerator, cancel $${linTex(q)}$, and the product simplifies to $${linTex(p)}$ with excluded value $x \\neq ${-q}$. The factor remains; the restriction still applies.`,
  },
  "d5.rat2.vial.l2": {
    Svg: ({ p = 0, q = 0, c = 1 }) => (
      <ExpressionReductionWorked
        rows={vialQuotientRows(p, q, c)}
        title="Divide by multiplying by the reciprocal"
        ariaLabel={`The quotient is ${linSpoken(q)}, with excluded values x not equal to ${-p} or ${-q}`}
      />
    ),
    caption: ({ p = 0, q = 0 }) =>
      `Multiply by the reciprocal, then cancel: the quotient is $${linTex(q)}$, with excluded values $x \\neq ${-p}$ and $x \\neq ${-q}$. Both excluded values come from the divisor.`,
  },
  "d5.rat2.alloy.l3": {
    Svg: ({ p = 0, q = 0, r = 0 }) => (
      <ExpressionReductionWorked
        rows={alloyProductRows(p, q, r)}
        title="Multiply rational expressions"
        ariaLabel={`The product is ${linSpoken(q)} times x minus ${r}, with excluded values x not equal to ${-p} or ${-r}`}
      />
    ),
    caption: ({ p = 0, q = 0, r = 0 }) =>
      `Factor both numerators, cancel $${linTex(p)}$ and $x + ${r}$: the product is $(${linTex(q)})(x - ${r})$, with excluded values $x \\neq ${-p}$ and $x \\neq ${-r}$.`,
  },
  "d5.rat2.billet.l3": {
    Svg: ({ a = 0, b = 0, d = 0, c = 1 }) => (
      <ExpressionReductionWorked
        rows={billetQuotientRows(a, b, d, c)}
        title="Divide rational expressions"
        ariaLabel={`The quotient is ${linSpoken(b)} times ${linSpoken(d)}, with excluded values x not equal to ${-a} or ${-d}`}
      />
    ),
    caption: ({ a = 0, b = 0, d = 0 }) =>
      `Multiply by the reciprocal, factor both numerators, cancel: the quotient is $(${linTex(b)})(${linTex(d)})$, with excluded values $x \\neq ${-a}$ and $x \\neq ${-d}$. Neither restriction appears in the simplified form.`,
  },

  // ---- RAT.3: add and subtract rational expressions (Verdigris Hold) ----
  "d5.rat3.samedenom.l1": {
    Svg: ({ a = 0, b = 0, c = 0, op = 0, total = 0 }) => (
      <ExpressionReductionWorked
        rows={sameDenomRows(a, b, c, op, total)}
        title="Add fractions with the same denominator"
        ariaLabel={`${a} over x plus ${c} ${op === 1 ? "minus" : "plus"} ${b} over x plus ${c} is ${total} over x plus ${c}, with excluded value x not equal to negative ${c}`}
      />
    ),
    caption: ({ a = 0, b = 0, c = 0, op = 0, total = 0 }) =>
      `Same denominator already, so ${op === 1 ? "subtract" : "add"} the numerators: $${a} ${op === 1 ? "-" : "+"} ${b} = ${total}$ over $x + ${c}$, with excluded value $x \\neq ${-c}$.`,
  },
  "d5.rat3.numerator.l2": {
    Svg: ({ a = 0, b = 0, c = 0, d = 0, e = 0, lead = 0, drop = 0 }) => (
      <ExpressionReductionWorked
        rows={subtractNumeratorRows(a, b, c, d, e, lead, drop)}
        title="Subtract a whole numerator over a shared denominator"
        ariaLabel={`${a} x plus ${b} minus ${d} x plus ${e} is ${lead} x minus ${drop}, over x plus ${c}, with excluded value x not equal to negative ${c}`}
      />
    ),
    caption: ({ a = 0, b = 0, c = 0, d = 0, e = 0, lead = 0, drop = 0 }) =>
      `The minus reaches both terms: $(${ratTerm(a)} + ${b}) - (${ratTerm(d)} + ${e}) = ${ratTerm(lead)} - ${drop}$ over $x + ${c}$, with excluded value $x \\neq ${-c}$.`,
  },
  "d5.rat3.unlike.l2": {
    Svg: ({ a = 0, b = 0, p = 0, lead = 0, constant = 0 }) => (
      <ExpressionReductionWorked
        rows={unlikeAddRows(a, b, p, lead, constant)}
        title="Add over a common denominator from two unlike denominators"
        ariaLabel={`${a} over x plus ${b} over x plus ${p} is ${lead} x plus ${constant} over x times x plus ${p}, with excluded values x not equal to 0 or negative ${p}`}
      />
    ),
    caption: ({ a = 0, b = 0, p = 0, lead = 0, constant = 0 }) =>
      `Common denominator $x(x + ${p})$: $${a}(x + ${p}) + ${b}x = ${ratTerm(lead)} + ${constant}$, with excluded values $x \\neq 0$ and $x \\neq ${-p}$.`,
  },
  "d5.rat3.subtract.l3": {
    Svg: ({ a = 0, b = 0, p = 0, q = 0, lead = 0, constant = 0 }) => (
      <ExpressionReductionWorked
        rows={unlikeSubtractRows(a, b, p, q, lead, constant)}
        title="Subtract over a common denominator from two unlike denominators"
        ariaLabel={`${a} over x plus ${p} minus ${b} over x plus ${q}, over x plus ${p} times x plus ${q}, with excluded values x not equal to negative ${p} or negative ${q}`}
      />
    ),
    caption: ({ a = 0, b = 0, p = 0, q = 0, lead = 0, constant = 0 }) =>
      `Over common denominator $(x + ${p})(x + ${q})$: $${a}(x + ${q}) - ${b}(x + ${p}) = ${ratTerm(lead)} ${ratTail(constant)}$, with excluded values $x \\neq ${-p}$ and $x \\neq ${-q}$.`,
  },
  "d5.rat3.factorlcd.l3": {
    Svg: ({ a = 0, b = 0, p = 0, constant = 0 }) => (
      <ExpressionReductionWorked
        rows={factorLcdRows(a, b, p, constant)}
        title="Factor to find the LCD"
        ariaLabel={`${a} over x plus ${b} over x squared plus ${p} x is ${a} x plus ${constant} over x times x plus ${p}, with excluded values x not equal to 0 or negative ${p}`}
      />
    ),
    caption: ({ a = 0, p = 0, constant = 0 }) =>
      `Factor $x^2 + ${p}x = x(x + ${p})$, so the LCD is shared rather than multiplied: $${frac(`${ratTerm(a)} + ${constant}`, `x(x + ${p})`, true)}$, with excluded values $x \\neq 0$ and $x \\neq ${-p}$.`,
  },

  // ---- RAT.5: graph and analyze rational functions ----
  "d5.rat5.domain.l1": {
    Svg: ({ kind = 0, k = 1, root = 1, n = 1 }) => (
      <ExpressionReductionWorked
        rows={domainRows(kind, k, root, n)}
        title="The domain of a rational function"
        ariaLabel={`The denominator is zero at ${spoken(root)}, so the domain is every x except ${spoken(root)}`}
      />
    ),
    caption: ({ root = 1 }) =>
      `The denominator is zero only at $x = ${root}$, so the domain is every other input: $\\{x \\mid x \\ne ${root}\\}$.`,
  },
  "d5.rat5.vertical.l2": {
    Svg: ({ h = 2, flip = 0, v = 1 }) => (
      <ExpressionReductionWorked
        rows={verticalAsymptoteRows(h, flip, v)}
        title="Hole versus vertical asymptote from the same denominator"
        ariaLabel={`The difference of squares cancels one denominator factor, leaving a hole at ${spoken(flip === 1 ? -h : h)} and a vertical asymptote at ${spoken(v)}`}
      />
    ),
    caption: ({ h = 2, flip = 0, v = 1 }) => {
      const cancelled = flip === 1 ? -h : h;
      return `$(${linTex(-cancelled)})$ divides out, so $x = ${cancelled}$ is only a hole. The surviving $(${linTex(-v)})$ gives a vertical asymptote at $x = ${v}$.`;
    },
  },
  "d5.rat5.level.l2": {
    Svg: ({ kind = 0, a = 2, b = 1, c = 1, d = 3, e = 1, ansN = 2, ansD = 3 }) => (
      <ExpressionReductionWorked
        rows={endBehaviorRows(kind, a, b, c, d, e, ansN, ansD)}
        title="End behavior and the horizontal asymptote"
        ariaLabel={
          kind === 1
            ? `The degrees match, so the graph approaches ${fracSpoken(ansN, ansD)}`
            : "The denominator outgrows the numerator, so the graph approaches 0"
        }
      />
    ),
    caption: ({ kind = 0, ansN = 2, ansD = 3 }) =>
      kind === 1
        ? `The degrees match, so the graph approaches the ratio of the leading coefficients: $y = ${fracTex(ansN, ansD, true)}$.`
        : "The denominator outgrows the numerator, so the graph is squeezed toward the axis: $y = 0$.",
  },
  "d5.rat5.hole.l3": {
    Svg: ({ h = 1, v = 2, m = 2, p = 3 }) => (
      <ExpressionReductionWorked
        rows={holePointRows(h, v, m, p)}
        title="Find a hole from the simplified function"
        ariaLabel={`The shared factor cancels, and the simplified function equals ${spoken(m)} at ${spoken(h)}, so the hole sits at ${spoken(h)}, ${spoken(m)}`}
      />
    ),
    caption: ({ h = 1, v = 2, m = 2, p = 3 }) =>
      `Cancelling $(${linTex(-h)})$ leaves $${frac(linTex(-p), linTex(-v), true)}$, which equals $${m}$ at the cancelled input, so the hole is at $(${h},\\, ${m})$.`,
  },
  "d5.rat5.crossing.l3": {
    Svg: ({ c = 2, h = 1, p = 2, v = 3 }) => (
      <ExpressionReductionWorked
        rows={crossingRows(c, h, p, v)}
        title="Find the x-intercept after cancelling to a hole"
        ariaLabel={`Pull out ${c}, cancel the shared factor into a hole at ${spoken(h)}, and the x-intercept is at ${spoken(p)}, 0`}
      />
    ),
    caption: ({ h = 1, p = 2 }) =>
      `The input $x = ${h}$ cancels into a hole, so the graph crosses the axis only where $${linTex(-p)} = 0$, at $(${p},\\, 0)$.`,
  },

  // ---- RAT.6: solve rational equations, reject extraneous solutions ----
  "d5.rat6.clear.l1": {
    Svg: ({ a = 0, b = 0, p = 0, r = 0, root = 0 }) => (
      <ExpressionReductionWorked
        rows={clearMeasureRows(a, b, p, r, root)}
        title="Clear one denominator, then check against the excluded value"
        ariaLabel={`${a} over ${linSpoken(-p)} equals ${b}, so x is ${root}, which is not the excluded value ${p}`}
      />
    ),
    caption: ({ b = 0, p = 0, root = 0 }) =>
      `Multiply both sides by $x - ${p}$, divide by $${b}$, and the solution $x = ${root}$ is not the excluded value $x = ${p}$.`,
  },
  "d5.rat6.rate.l2": {
    Svg: ({ a = 0, b = 0, num = 0, den = 1, rn = 0, rd = 1 }) => (
      <ExpressionReductionWorked
        rows={craftRateRows(a, b, num, den, rd === 1 ? `${rn}` : frac(rn, rd))}
        title="Add two rates, then solve for the combined time"
        ariaLabel={`One over ${a} plus one over ${b} is one over t, so t is ${fracSpoken(rn, rd)} hours, with t not equal to 0`}
      />
    ),
    caption: ({ num = 0, den = 1, rn = 0, rd = 1 }) =>
      `The rates add, not the times: clearing $${num}t$ leaves $${den}t = ${num}$, so $t = ${rd === 1 ? `${rn}` : frac(rn, rd, true)}$ hours, with $t \\neq 0$.`,
  },
  "d5.rat6.alloy.l2": {
    Svg: ({ n = 0, m = 1, s = 0, t = 0, add = 0 }) => (
      <ExpressionReductionWorked
        rows={alloyTargetRows(n, m, s, t, add)}
        title="Cross multiply a mixture equation, then check the solution"
        ariaLabel={`${s} plus d over ${t} plus d is ${n} over ${m}, so d is ${add} grams, with d not equal to negative ${t}`}
      />
    ),
    caption: ({ n = 0, m = 1, t = 0, add = 0 }) =>
      `Cross multiply, gather the $d$ terms, and the mixture needs $${add}$ more grams of silver to reach $${frac(n, m, true)}$, with $d \\neq -${t}$.`,
  },
  "d5.rat6.cursed.l3": {
    Svg: ({ p = 0, r = 0, mid = 0, c = 0 }) => (
      <ExpressionReductionWorked
        rows={cursedRootRows(p, r, mid, c)}
        title="Clear a shared denominator, then reject the extraneous solution"
        ariaLabel={`Clearing ${linSpoken(p)} leaves candidates negative ${p} and ${r}; negative ${p} is excluded, so only ${r} is in the solution set`}
      />
    ),
    caption: ({ p = 0, r = 0 }) =>
      `Multiplying by $x + ${p}$ introduces the root $x = -${p}$, which that same denominator excludes, so the solution set is $\\{${r}\\}$.`,
  },
  "d5.rat6.forge.l3": {
    Svg: ({ p = 0, r = 0, a = 0, b = 0 }) => (
      <ExpressionReductionWorked
        rows={forgeQuenchRows(p, r, a, b)}
        title="Clear two denominators, then reject the extraneous solution"
        ariaLabel={`Clearing x times ${linSpoken(p)} leaves candidates ${spoken(-p)} and ${spoken(r)}; the excluded values are 0 and ${spoken(-p)}, so only ${spoken(r)} is in the solution set`}
      />
    ),
    caption: ({ p = 0, r = 0 }) =>
      `Two denominators give two excluded values. The cleared quadratic factors as $(${linTex(p)})(x - ${r})$, and $x = ${-p}$ is excluded, so the solution set is $\\{${r}\\}$.`,
  },

  // ---- RAT.4: simplify complex / nested rational expressions (Verdigris Hold) ----
  "d5.rat4.stack.l1": {
    Svg: ({ a = 0, b = 1, c = 0 }) => (
      <ExpressionReductionWorked
        rows={nestedStackRows(a, b, c)}
        title="Rewrite a complex fraction as division, then multiply by the reciprocal"
        ariaLabel={`${a} over x, stacked over ${b} over x plus ${c}, simplifies to ${a} times x plus ${c}, over ${b} x, with excluded values x not equal to 0 or ${spoken(-c)}`}
      />
    ),
    caption: ({ a = 0, b = 1, c = 0 }) =>
      `The main fraction bar means divide, so multiply by the reciprocal of the denominator: $${frac(`${a}(x + ${c})`, `${b}x`, true)}$, with excluded values $x \\neq 0$ and $x \\neq ${-c}$. That second excluded value appears in the numerator and is still excluded.`,
  },
  "d5.rat4.divisor-top.l2": {
    Svg: ({ p = 0, q = 0 }) => (
      <ExpressionReductionWorked
        rows={divisorTopRows(p, q)}
        title="Cancel the shared factor, then state excluded values from the divisor"
        ariaLabel={`The complex fraction simplifies to x plus ${q} over x, with excluded values x not equal to 0, ${spoken(-p)} or ${spoken(-q)}`}
      />
    ),
    caption: ({ p = 0, q = 0 }) =>
      `Cancelling $(x + ${p})$ leaves $${frac(`x + ${q}`, "x", true)}$, with excluded values $x \\neq 0$, $x \\neq ${-p}$ and $x \\neq ${-q}$. The excluded value $x \\neq ${-p}$ comes from the divisor being zero there.`,
  },
  "d5.rat4.clear.l2": {
    Svg: ({ a = 0, b = 0 }) => (
      <ExpressionReductionWorked
        rows={clearInnerRows(a, b)}
        title="Clear denominators by multiplying numerator and denominator"
        ariaLabel={`Multiplying numerator and denominator by x simplifies to x plus ${a} over x minus ${b}, with excluded values x not equal to 0 or ${b}`}
      />
    ),
    caption: ({ a = 0, b = 0 }) =>
      `Multiply the entire numerator and denominator by $x$: $${frac(`x + ${a}`, `x - ${b}`, true)}$, with excluded value $x \\neq 0$ from the inner denominator and excluded value $x \\neq ${b}$ from the outer denominator.`,
  },
  "d5.rat4.nested-sum.l3": {
    Svg: ({ a = 0, b = 0, c = 1, p = 0, lead = 0, constant = 0 }) => (
      <ExpressionReductionWorked
        rows={nestedSumRows(a, b, c, p, lead, constant)}
        title="Combine the numerator over one denominator, then multiply by the reciprocal and cancel"
        ariaLabel={`The expression simplifies to ${lead} x plus ${constant} over ${c} x, with excluded values x not equal to 0 or ${spoken(-p)}`}
      />
    ),
    caption: ({ c = 1, p = 0, lead = 0, constant = 0 }) =>
      `Combine the numerator over $x(x + ${p})$, then multiply by the reciprocal and cancel the shared $(x + ${p})$: $${frac(`${ratTerm(lead)} + ${constant}`, `${c}x`, true)}$, with excluded values $x \\neq 0$ and $x \\neq ${-p}$.`,
  },
  "d5.rat4.mixture-divisor.l3": {
    Svg: ({ a = 1, p = 0, m = 0 }) => (
      <ExpressionReductionWorked
        rows={mixtureDivisorRows(a, p, m)}
        title="Combine the denominator, then divide by it"
        ariaLabel={`Dividing by the combined denominator leaves ${a} times x plus ${p}, over 2 x plus ${p}, with excluded values x not equal to 0, ${spoken(-p)} or ${spoken(-m)}`}
      />
    ),
    caption: ({ a = 1, p = 0, m = 0 }) =>
      `The denominator is itself a sum of fractions, $${frac(`2x + ${p}`, `x(x + ${p})`, true)}$, so the expression simplifies to $${frac(a === 1 ? `x + ${p}` : `${a}(x + ${p})`, `2x + ${p}`, true)}$, with excluded values $x \\neq 0$, $x \\neq ${-p}$ and $x \\neq ${-m}$. That last excluded value makes the divisor zero.`,
  },

  // ---- RAD.4: variable radicands (Boomtown Square) ----
  "d2.rad4.magnitude.l1": {
    Svg: ({ varIndex = 0, half = 1, bars = 0 }) => (
      <ExpressionReductionWorked
        rows={magnitudeRootRows(expressionVariable(varIndex), half, bars === 1)}
        title="An even root returns the absolute value"
        ariaLabel={`The square root of ${expressionVariable(varIndex)} to the ${2 * half} is ${bars === 1 ? "the absolute value of " : ""}${expressionVariable(varIndex)} to the ${half}`}
      />
    ),
    caption: ({ varIndex = 0, half = 1, power = 2, bars = 0 }) => {
      const v = expressionVariable(varIndex);
      const out = powTex(v, half);
      return bars === 1
        ? `Half of $${power}$ is $${half}$, which is odd, so $${out}$ can be negative. An even root never returns a negative value, so $\\sqrt{${powTex(v, power)}} = ${barsTex(out, true)}$.`
        : `Half of $${power}$ is $${half}$, which is even, so $${out}$ is never negative and needs no bars: $\\sqrt{${powTex(v, power)}} = ${out}$.`;
    },
  },
  "d2.rad4.extract.l2": {
    Svg: ({ varIndex = 0, power = 5, even = 4, outside = 2 }) => (
      <ExpressionReductionWorked
        rows={extractRootRows(expressionVariable(varIndex), power, even, outside)}
        title="Pull the even part out of an odd variable power"
        ariaLabel={`The square root of ${expressionVariable(varIndex)} to the ${power} is ${expressionVariable(varIndex)} to the ${outside} times the square root of ${expressionVariable(varIndex)}`}
      />
    ),
    caption: ({ varIndex = 0, power = 5, even = 4, outside = 2 }) => {
      const v = expressionVariable(varIndex);
      return `Split $${powTex(v, power)}$ into $${powTex(v, even)} \\cdot ${v}$; half of $${even}$ comes out, leaving $${powTex(v, outside)}\\sqrt{${v}}$. No bars: an even root is real only where the inside is not negative, so $${v} \\ge 0$.`;
    },
  },
  "d2.rad4.realroot.l2": {
    Svg: ({ cube = 2, square = 2, fourth = 2, slot = 0 }) => (
      <RealRootLogWorked cube={cube} square={square} fourth={fourth} slot={slot} />
    ),
    caption: ({ cube = 2, square = 2, fourth = 2 }) =>
      `An even root of a negative is not a real number, so $\\sqrt{-${square * square}}$ and $\\sqrt[4]{-${fourth ** 4}}$ are out. $(-${cube})^{3} = -${cube ** 3}$, so the real one is $-${cube}$.`,
  },
  "d2.rad4.mixed.l3": {
    Svg: ({
      varIndex = 0,
      constant = 8,
      power = 5,
      square = 4,
      free = 2,
      root = 2,
      even = 4,
      outside = 2,
    }) => (
      <ExpressionReductionWorked
        rows={mixedRadicandRows(
          expressionVariable(varIndex),
          constant,
          power,
          square,
          free,
          root,
          even,
          outside,
        )}
        title="Simplify a radicand holding a number and a variable"
        ariaLabel={`The square root of ${constant} times ${expressionVariable(varIndex)} to the ${power} is ${root} times ${expressionVariable(varIndex)} to the ${outside} times the square root of ${free} times ${expressionVariable(varIndex)}`}
      />
    ),
    caption: ({ varIndex = 0, square = 4, free = 2, root = 2, even = 4, outside = 2 }) => {
      const v = expressionVariable(varIndex);
      return `$\\sqrt{${square}} = ${root}$ and $\\sqrt{${powTex(v, even)}} = ${powTex(v, outside)}$; $${free}$ and one $${v}$ have nothing square left, so they stay under the root.`;
    },
  },
  "d2.rad4.twovar.l3": {
    Svg: ({
      pairIndex = 0,
      constant = 8,
      power = 5,
      square = 4,
      free = 2,
      root = 2,
      even = 4,
      outside = 2,
    }) => {
      const [v, w] = radicalSymbolPair(pairIndex);
      return (
        <ExpressionReductionWorked
          rows={twoVarRadicandRows(
            v,
            w,
            constant,
            power,
            square,
            free,
            root,
            even,
            outside,
          )}
          title="Two variables under one root, only one of them barred"
          ariaLabel={`The square root of ${constant} times ${v} squared times ${w} to the ${power} is ${root} times the absolute value of ${v} times ${w} to the ${outside} times the square root of ${free} times ${w}`}
        />
      );
    },
    caption: ({ pairIndex = 0, free = 2, root = 2, outside = 2 }) => {
      const [v, w] = radicalSymbolPair(pairIndex);
      return `$\\sqrt{${v}^{2}}$ is the absolute value $\\left|${v}\\right|$, but $${w}$ needs no bars: an even root is real only where the inside is not negative, so $${w} \\ge 0$. That gives $${root}\\left|${v}\\right|${powTex(w, outside)}\\sqrt{${free}${w}}$.`;
    },
  },

  // ---- D7 (Linear Functions): authored one module per node under `worked/`, and merged
  // in here. Four domains' figures would not fit in one file, so a node owns its own.
  ...LF1_WORKED_SOLUTIONS,
  ...LF2_WORKED_SOLUTIONS,
  ...LF3_WORKED_SOLUTIONS,
  ...LF4_WORKED_SOLUTIONS,
  ...EL1_WORKED_SOLUTIONS,
  ...EL2_WORKED_SOLUTIONS,
  ...EL3_WORKED_SOLUTIONS,
  ...EL4_WORKED_SOLUTIONS,
  ...EL5_WORKED_SOLUTIONS,
  ...EL6_WORKED_SOLUTIONS,
  // ---- D9 (Trigonometry), one module per node under `worked/` like the domains above.
  ...TRG1_WORKED_SOLUTIONS,
  ...TRG2_WORKED_SOLUTIONS,
  ...TRG3_WORKED_SOLUTIONS,
  ...TRG4_WORKED_SOLUTIONS,
  ...TRG5_WORKED_SOLUTIONS,
  ...TRG6_WORKED_SOLUTIONS,
  ...TRG7_WORKED_SOLUTIONS,
  ...TRG8_WORKED_SOLUTIONS,
  ...TRG9_WORKED_SOLUTIONS,
  // ---- D10 (Geometry). Every figure here is the geometry itself rather than a column of
  // algebra, because the diagram IS the reasoning on this domain: a labelled triangle, a
  // rectangle carrying its diagonal, a net with its faces marked.
  ...GEO1_WORKED_SOLUTIONS,
  ...GEO2_WORKED_SOLUTIONS,
  // D10's two CHECKS are composites that no practice template asks, so their figures are
  // keyed on `cfu.*` ids and live with the rest of them at the foot of this object, in
  // `worked/cfuD7D8D10.tsx`.
  // ---- D3 (Linear Equations, Inequalities & Absolute Value). Three of its five nodes answer
  // with a SET whose SHAPE is the graded distinction, so most of these figures are a scale with
  // the answer drawn on it (`worked/d3Kit.tsx`) rather than a column of algebra.
  ...LIN1_WORKED_SOLUTIONS,
  ...LIN3_WORKED_SOLUTIONS,
  ...LIN4_WORKED_SOLUTIONS,
  ...LIN5_WORKED_SOLUTIONS,
  ...LIN6_WORKED_SOLUTIONS,
  // ---- D4 (Polynomials & Quadratics, the Classical era's five nodes). The era's own rationale
  // is areas as products, so the product and factoring shapes are drawn as the rectangle they
  // are (`worked/d4Kit.tsx`); the shapes that answer with a SET draw the roots on D3's solution
  // line, because the count of solutions is what this era gets wrong; and the chains use the
  // shared reduction column with the misconception's own line coloured.
  ...POL1_WORKED_SOLUTIONS,
  ...POL2_WORKED_SOLUTIONS,
  ...POL3_WORKED_SOLUTIONS,
  ...POL4_WORKED_SOLUTIONS,
  ...POL8_WORKED_SOLUTIONS,
  ...POL6_POL7_WORKED_SOLUTIONS,
  ...POL5_WORKED_SOLUTIONS,
  // ---- D1's six newest shapes, the ones that closed the last single-shape two-slot
  // cells. Authored one module per node under `worked/` like the domains above, rather
  // than inline with D1's older figures, because each arrived with its own template.
  ...NUM2_L2B_WORKED_SOLUTIONS,
  ...NUMS_L3B_WORKED_SOLUTIONS,
  ...NUMF_L3B_WORKED_SOLUTIONS,
  ...NUM3_L3B_WORKED_SOLUTIONS,
  ...NUM4_L3B_WORKED_SOLUTIONS,
  ...NUM5_L3B_WORKED_SOLUTIONS,
  // ---- D6 (Functions & their Graphs, eleven nodes). Grouped by problem SHAPE rather than by
  // node, because the shapes repeat ACROSS nodes here: CG.1's midpoint, FUN.4's strip chart,
  // FUN.9's translated point and FUN.10's vee are four questions about one picture. Six
  // archetypes cover all fifty-five, three of them already in the tree (the reduction column,
  // D3's number line, and the plane `cfuD6.tsx` had been keeping private), three new in
  // `worked/d6Kit.tsx`: a piecewise break line, a composition chain, and a ledger.
  ...CG1_PRACTICE_WORKED_SOLUTIONS,
  ...FUN1_PRACTICE_WORKED_SOLUTIONS,
  ...FUN2_PRACTICE_WORKED_SOLUTIONS,
  ...FUN3_PRACTICE_WORKED_SOLUTIONS,
  ...FUN4_PRACTICE_WORKED_SOLUTIONS,
  ...FUN5_PRACTICE_WORKED_SOLUTIONS,
  ...FUN6_PRACTICE_WORKED_SOLUTIONS,
  ...FUN7_PRACTICE_WORKED_SOLUTIONS,
  ...FUN8_PRACTICE_WORKED_SOLUTIONS,
  ...FUN9_PRACTICE_WORKED_SOLUTIONS,
  ...FUN10_PRACTICE_WORKED_SOLUTIONS,
  // ---- The CHECKS whose question no practice template asks, keyed on their `cfu.*` template
  // ids. Most of these are composite -- one field holding two or three answers, because
  // reporting both is what shows the distinction was seen -- which is exactly why the pool has
  // no twin to borrow a figure from, and why they had none until now. See `worked/cfuD1D2.tsx`.
  ...CFU_D1_D2_WORKED_SOLUTIONS,
  ...CFU_D4_D5_WORKED_SOLUTIONS,
  // D6 arrived through a merge, authored before the contract these figures satisfy, so all
  // eleven of its checks fell through to the step cards. Ten of the eleven are composite.
  ...CFU_D6_WORKED_SOLUTIONS,
  ...CFU_D7_D8_D10_WORKED_SOLUTIONS,
  // D9's nine are the exception to the sentence above: none of them is composite, and every
  // one of them reuses the figure its own node's practice items are already drawn with rather
  // than a shape of its own. Three take one closing line the pooled item has no use for,
  // because the check asks a step further than the item it borrows from. See `worked/cfuD9.tsx`.
  ...CFU_D9_WORKED_SOLUTIONS,
};

/** Look up a parameterized SVG worked solution for a `template_id`, if one exists. */
export function getWorkedSolutionVisual(
  templateId: string,
): WorkedSolutionVisual | undefined {
  return WORKED_SOLUTION_VISUALS[templateId];
}

/**
 * Every `template_id` this registry draws a figure for.
 *
 * Exported for the sweeps' gap census: `practiceSweep.ts`'s `NOT_SWEPT_HERE` excuses a domain
 * on the ground that no key here carries its prefix, and an exemption whose reason nothing
 * reads goes on excusing a domain it has stopped describing. Reading the keys is how that
 * reason is checked rather than asserted.
 */
export function workedSolutionVisualIds(): string[] {
  return Object.keys(WORKED_SOLUTION_VISUALS);
}
