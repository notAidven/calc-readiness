/**
 * Worked-solution figures for the eleven D6 CHECKS, whose questions no practice template asks.
 *
 * Ten of the eleven are COMPOSITE, which is the whole reason this domain's checks needed
 * figures of their own rather than borrowing a pool template's: a midpoint AND a length, a
 * reading AND a ruling on a log, two charges, two average rates, a rule AND a value from it, a
 * vertex AND the word for the turn. A diagram that closes on the first of those looks finished
 * while answering half the question, so every entry here ends on a row carrying the WHOLE
 * answer in the order the prompt asks for it, under the working that won each part.
 *
 * Three of them are pictures rather than columns, because the thing being read off is a
 * position: CG.1's two axis crossings and the centre between them, FUN.4's strip chart with one
 * falling leg, FUN.10's vee and the corner it turns at. Those three share `D6Chart`, which used
 * to live here and now lives in `d6Kit` because D6's practice figures wanted the same plane.
 * The other eight are `ExpressionReductionWorked` columns, which is what the rest of the tree
 * draws an algebraic chain with.
 *
 * FUN.2 borrows D3's `SolutionLineWorked`: its answer is an interval, and D3's number line is
 * already the figure this tree draws an interval on.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, SIGNAL, SOFT } from "../svgKit";
import {
  ExpressionReductionWorked,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";
import { SolutionLineWorked } from "./d3Kit";
import { D6Chart, joinedConstant, pointTex, shiftedInput, sp, veeArms } from "./d6Kit";
import { composeOrderChain } from "./d6FUN7";

/**
 * The typed answer as one row: the parts in the prompt's order, comma separated.
 *
 * Every composite check here asks for its parts "in that order, separated by a comma", so the
 * closing row is spelled the way the answer box wants it rather than as a sentence. That is
 * also what lets one string in the figure hold the whole answer, which is the difference
 * between a diagram that reports both halves and one that reports them in two places and
 * leaves the learner to assemble the pair.
 */
function answerRow(...parts: readonly string[]): ReductionRow {
  return { tokens: [{ text: parts.join(",\\; "), color: CIVIC }] };
}

/* ----------------------------------------------------- CG.1: a centre and a length */

/** The two axis crossings, the segment between them, and the centre marked on it. */
function CrossingsWorked({ a, b }: { a: number; b: number }): JSX.Element {
  const legX = Math.abs(a);
  const legY = Math.abs(b);
  const hypotenuse = Math.round(Math.sqrt(legX * legX + legY * legY));
  const mx = a / 2;
  const my = b / 2;
  const pad = Math.max(2, Math.round(Math.max(legX, legY) * 0.22));
  return (
    <D6Chart
      xMin={Math.min(0, a) - pad}
      xMax={Math.max(0, a) + pad}
      yMin={Math.min(0, b) - pad}
      yMax={Math.max(0, b) + pad}
      square
      paths={[
        {
          points: [
            [a, 0],
            [0, 0],
            [0, b],
          ],
          color: SOFT,
          dashed: true,
        },
        {
          points: [
            [a, 0],
            [0, b],
          ],
          color: SIGNAL,
        },
      ]}
      dots={[
        { x: a, y: 0, color: SOFT },
        { x: 0, y: b, color: SOFT },
        { x: mx, y: my, color: CIVIC },
      ]}
      labels={[
        {
          x: mx,
          y: my,
          latex: pointTex(mx, my),
          color: CIVIC,
          dx: a < 0 ? -1 : 1,
          dy: b < 0 ? 1 : -1,
        },
      ]}
      xTicks={[a]}
      yTicks={[b]}
      footers={[
        `\\sqrt{${legX}^{2} + ${legY}^{2}} = \\sqrt{${hypotenuse * hypotenuse}} = ${hypotenuse}`,
        `${pointTex(mx, my)},\\; ${hypotenuse}`,
      ]}
      title="Two axis crossings, the centre between them and the length they span"
      ariaLabel={`The crossings at ${spoken(a)} comma 0 and 0 comma ${spoken(b)}, joined by a segment whose centre is ${spoken(mx)} comma ${spoken(my)} and whose length is ${spoken(hypotenuse)}`}
    />
  );
}

/* ------------------------------------------------- FUN.4: one falling leg, one high point */

/** The strip chart, with the falling leg inked apart and the shift's highest mark named. */
function StripChartWorked({
  h1,
  h2,
  h3,
  r0,
  r1,
  r2,
  r3,
}: {
  h1: number;
  h2: number;
  h3: number;
  r0: number;
  r1: number;
  r2: number;
  r3: number;
}): JSX.Element {
  const top = Math.max(r0, r1, r2, r3);
  return (
    <D6Chart
      xMin={-h3 * 0.1}
      xMax={h3 * 1.08}
      yMin={-top * 0.14}
      yMax={top * 1.2}
      paths={[
        {
          points: [
            [0, r0],
            [h1, r1],
          ],
          color: SOFT,
        },
        {
          points: [
            [h1, r1],
            [h2, r2],
          ],
          color: BRICK,
        },
        {
          points: [
            [h2, r2],
            [h3, r3],
          ],
          color: SOFT,
        },
      ]}
      dots={[
        { x: 0, y: r0, color: SOFT },
        { x: h1, y: r1, color: BRICK },
        { x: h2, y: r2, color: BRICK },
        { x: h3, y: r3, color: CIVIC },
      ]}
      labels={[
        {
          x: (h1 + h2) / 2,
          y: (r1 + r2) / 2,
          latex: "\\text{decreasing}",
          color: BRICK,
          dx: 1,
          dy: -1,
        },
        { x: h3, y: r3, latex: pointTex(h3, r3), color: CIVIC, dx: -1, dy: -1 },
        { x: h1, y: r1, latex: pointTex(h1, r1), color: SOFT, dx: -1, dy: -1 },
      ]}
      xTicks={[h1, h2, h3]}
      yTicks={[r3]}
      footers={[`(${h1},\\, ${h2}),\\; ${r3}`]}
      title="A strip chart whose one falling leg is inked apart from its two climbs"
      ariaLabel={`A chart falling only between hour ${spoken(h1)} and hour ${spoken(h2)}, whose highest reading of ${spoken(r3)} is at the closing hour ${spoken(h3)} rather than at the turn of ${spoken(r1)}`}
    />
  );
}

/* --------------------------------------------------------- FUN.10: a vee and its corner */

/** The vee, drawn from its corner, with the direction its arms take settling the verdict. */
function VertexWorked({
  stretch,
  h,
  k,
}: {
  stretch: number;
  h: number;
  k: number;
}): JSX.Element {
  const reach = 3;
  const armY = stretch * reach + k;
  const verdict = stretch < 0 ? "maximum" : "minimum";
  const lo = Math.min(k, armY);
  const hi = Math.max(k, armY);
  const pad = Math.max(2, (hi - lo) * 0.18);
  return (
    <D6Chart
      xMin={h - reach - 1}
      xMax={h + reach + 1}
      yMin={lo - pad}
      yMax={hi + pad}
      paths={[
        { points: veeArms(stretch, h, k, reach), color: SIGNAL },
        // Only as wide as the vee, so it reads as the height the corner holds rather than as a
        // rule across the whole window, and so it leaves the wall clear for the tick beside it.
        {
          points: [
            [h - reach, k],
            [h + reach, k],
          ],
          color: SOFT,
          dashed: true,
        },
      ]}
      dots={[{ x: h, y: k, color: CIVIC }]}
      labels={[
        {
          x: h,
          y: k,
          latex: pointTex(h, k),
          color: CIVIC,
          dx: 1,
          dy: stretch < 0 ? -1 : 1,
        },
      ]}
      xTicks={[h]}
      yTicks={[k]}
      footers={[`${pointTex(h, k)},\\; \\text{${verdict}}`]}
      title="A vee, and the direction its arms take from the corner"
      ariaLabel={`A vee turning at ${spoken(h)} comma ${spoken(k)} whose arms ${stretch < 0 ? "fall away from the corner, so that height is a maximum" : "rise away from the corner, so that height is a minimum"}`}
    />
  );
}

/* ------------------------------------------------------------------------- the columns */

/** FUN.1: one reading off the rule, then the ruling the log's repeated setting forces. */
function evaluateAndTestRows(
  m: number,
  c: number,
  n: number,
  value: number,
  isFunction: boolean,
): ReductionRow[] {
  const verdict = isFunction ? "yes" : "no";
  return [
    { tokens: [{ text: `f(${n}) = ${m}${sp(n)}${joinedConstant(c)}` }] },
    { tokens: [{ text: `f(${n}) = ${m * n}${joinedConstant(c)}`, color: SIGNAL }] },
    { tokens: [{ text: `f(${n}) = ${value}` }] },
    {
      tokens: [
        {
          text: isFunction
            ? "\\text{every setting logged once} \\;\\Rightarrow\\; \\text{a function}"
            : "\\text{one setting, two motions} \\;\\Rightarrow\\; \\text{not a function}",
          color: isFunction ? SIGNAL : BRICK,
        },
      ],
    },
    answerRow(`${value}`, `\\text{${verdict}}`),
  ];
}

/** FUN.3: the condition settles which piece owns each load, then each load goes in alone. */
function pieceChargeRows(
  breakAt: number,
  rateLow: number,
  rateHigh: number,
  standing: number,
  light: number,
): ReductionRow[] {
  const heavy = rateHigh * breakAt + standing;
  const cheap = rateLow * light;
  return [
    {
      tokens: [
        {
          text: `t \\ge ${breakAt} \\;\\Rightarrow\\; C(t) = ${rateHigh}t + ${standing}`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [
        { text: `C(${breakAt}) = ${rateHigh} \\times ${breakAt} + ${standing} = ${heavy}` },
      ],
    },
    {
      tokens: [
        { text: `t < ${breakAt} \\;\\Rightarrow\\; C(t) = ${rateLow}t`, color: SIGNAL },
      ],
    },
    { tokens: [{ text: `C(${light}) = ${rateLow} \\times ${light} = ${cheap}` }] },
    answerRow(`${heavy}`, `${cheap}`),
  ];
}

/** FUN.5: the same trace over two windows, each a change divided by the hours it took. */
function averageRateRows(
  t1: number,
  t2: number,
  v0: number,
  v1: number,
  v2: number,
): ReductionRow[] {
  const whole = (v2 - v0) / t2;
  const late = (v2 - v1) / (t2 - t1);
  return [
    {
      tokens: [
        {
          text: "\\text{average rate} = \\dfrac{\\text{change in reading}}{\\text{change in hours}}",
        },
      ],
    },
    {
      tokens: [
        {
          text: `\\dfrac{${v2} - ${v0}}{${t2} - 0} = \\dfrac{${v2 - v0}}{${t2}} = ${whole}`,
        },
      ],
    },
    {
      tokens: [
        {
          text: `\\dfrac{${v2} - ${v1}}{${t2} - ${t1}} = \\dfrac{${v2 - v1}}{${t2 - t1}} = ${late}`,
        },
      ],
    },
    answerRow(`${whole}`, `${late}`),
  ];
}

/** FUN.6: the whole input in, the shared constant out, and the `h` underneath divided out. */
function differenceQuotientRows(
  a: number,
  b: number,
  c: number,
  p: number,
): ReductionRow[] {
  const k = 2 * a * p + b;
  const expanded = a * p * p + k * p + c;
  return [
    {
      tokens: [
        {
          text: `f(${p} + h) = ${a}(${p} + h)^{2}${joinedConstant(b)}(${p} + h)${joinedConstant(c)}`,
        },
      ],
    },
    {
      tokens: [
        {
          text: `f(${p} + h) = ${a}h^{2}${joinedConstant(k)}h${joinedConstant(expanded)}`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [
        {
          text: `f(${p} + h) - f(${p}) = ${a}h^{2}${joinedConstant(k)}h`,
        },
      ],
    },
    {
      tokens: [
        {
          text: `\\dfrac{h(${a}h${joinedConstant(k)})}{h}`,
          color: SIGNAL,
        },
      ],
    },
    { tokens: [{ text: `${a}h${joinedConstant(k)}`, color: CIVIC }] },
  ];
}

/** FUN.8: swap the two variables, solve for the new `y`, and then use the rule once. */
function inverseRows(m: number, c: number, v: number): ReductionRow[] {
  const value = m * v - c;
  return [
    { tokens: [{ text: `y = \\dfrac{${shiftedInput(-c)}}{${m}}` }] },
    { tokens: [{ text: `x = \\dfrac{${shiftedInput(-c, "y")}}{${m}}`, color: SIGNAL }] },
    { tokens: [{ text: `f^{-1}(x) = ${m}x${joinedConstant(-c)}` }] },
    {
      tokens: [{ text: `f^{-1}(${v}) = ${m} \\cdot ${v}${joinedConstant(-c)} = ${value}` }],
    },
    answerRow(`${m}x${joinedConstant(-c)}`, `${value}`),
  ];
}

/**
 * FUN.9: the bracket first, then the symmetry, then the two moves outside it.
 *
 * The substitution row is not decoration. This column used to open its work on a bare
 * `-3 - 1 = -4`, two numbers with no stated provenance: correct, unarguable, and impossible
 * to place, because nothing on the figure said where either of them had come from. They come
 * from the question, which asks for `g(-3)`, and from the rule, which writes `x - 1` inside
 * the brackets — so the row that puts the asked input in for `x` is written out, and the
 * bracket collapses on the row after it. That turns the arithmetic into a step of a
 * substitution the learner watched happen.
 */
function transformParityRows(
  even: boolean,
  gain: number,
  shift: number,
  lift: number,
  logged: number,
  height: number,
): ReductionRow[] {
  const asked = shift - logged;
  const reflected = even ? height : -height;
  const value = gain * reflected + lift;
  return [
    {
      tokens: [{ text: `g(x) = ${gain}f(${shiftedInput(shift)})${joinedConstant(lift)}` }],
    },
    {
      tokens: [
        {
          text: `g(${asked}) = ${gain}f(${asked}${joinedConstant(-shift)})${joinedConstant(lift)}`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [
        {
          text: `g(${asked}) = ${gain}f(${-logged})${joinedConstant(lift)}`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [
        {
          text: even
            ? `f(${-logged}) = f(${logged}) = ${height}`
            : `f(${-logged}) = -f(${logged}) = ${-height}`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [
        { text: `${gain} \\times ${sp(reflected)}${joinedConstant(lift)} = ${value}` },
      ],
    },
    { tokens: [{ text: `g(${asked}) = ${value}`, color: CIVIC }] },
  ];
}

export const CFU_D6_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "cfu.cg1.plot-and-measure": {
    Svg: ({ a = -6, b = 8 }) => <CrossingsWorked a={a} b={b} />,
    caption: ({ a = -6, b = 8 }) => {
      const legX = Math.abs(a);
      const legY = Math.abs(b);
      const hypotenuse = Math.round(Math.sqrt(legX * legX + legY * legY));
      return `The two crossings are $${pointTex(a, 0)}$ and $${pointTex(0, b)}$, because a point on one axis has a $0$ in the other coordinate and a crossing on the far side of the bench mark carries a minus sign. The centre AVERAGES those two ends one coordinate at a time, which is why it lands at $${pointTex(a / 2, b / 2)}$ rather than halfway along either axis on its own. The length is a different question about the same segment: the dashed legs and the segment make a right triangle, so $${legX}$ and $${legY}$ square and add to $${hypotenuse * hypotenuse}$, and the segment is $${hypotenuse}$ paces.`;
    },
  },

  "cfu.fun1.evaluate-and-test": {
    Svg: ({ m = 4, c = -7, n = -3, value = -19, isFunction = 0 }) => (
      <ExpressionReductionWorked
        rows={evaluateAndTestRows(m, c, n, value, isFunction === 1)}
        title="One reading off the rule, and one ruling on the log"
        ariaLabel={`Substituting ${spoken(n)} gives ${spoken(value)}, and the log ${isFunction === 1 ? "records every setting once, so it is a function" : "records one setting twice with two different motions, so it is not a function"}`}
      />
    ),
    caption: ({ n = -3, value = -19, isFunction = 0 }) =>
      `The two halves are asked together because they test different things, and only one of them is arithmetic. Substituting is the arithmetic: brackets around the input keep the multiplication ahead of what follows it, giving $f(${n}) = ${value}$. The log is a RULING, and it turns on the settings column alone. ${isFunction === 1 ? "No setting appears twice, so every input still returns exactly one thing, and a repeated MOTION is harmless: two different settings are allowed to share an output." : "One setting appears twice with two different motions beside it, so that input returns two things and the log is not a function. A repeated MOTION would have been harmless; it is the repeated SETTING that rules it out."}`,
  },

  "cfu.fun2.domain-and-range": {
    Svg: ({ upward = 0, useAbs = 0, bound = 12, inner = 3 }) => {
      const body =
        useAbs === 1
          ? `\\lvert ${shiftedInput(inner)} \\rvert`
          : `\\sqrt{${shiftedInput(inner)}}`;
      const rule = upward === 1 ? `${body} + ${bound}` : `${bound} - ${body}`;
      return (
        <SolutionLineWorked
          statement={`f(x) = ${rule}`}
          solved={upward === 1 ? `[${bound},\\; \\infty)` : `(-\\infty,\\; ${bound}]`}
          pieces={[
            upward === 1
              ? { from: bound, to: null, fromClosed: true }
              : { from: null, to: bound, toClosed: true },
          ]}
          title="The outputs the rule can reach, drawn on the output line"
          ariaLabel={`Every output ${upward === 1 ? "from" : "up to"} ${spoken(bound)} shaded, with a filled endpoint at ${spoken(bound)} because that output is reached`}
        />
      );
    },
    caption: ({ upward = 0, useAbs = 0, bound = 12 }) =>
      `${useAbs === 1 ? "A pair of bars" : "A square root"} never hands back a negative number, so on its own it covers $0$ and everything above it. ${upward === 1 ? `Adding $${bound}$ lifts that whole set by $${bound}$, so the smallest output is $${bound}$ and the climb above it has no ceiling.` : `Subtracting it from $${bound}$ turns the floor into a CEILING: the largest output is $${bound}$, and the outputs fall away from it with no floor underneath.`} The endpoint is FILLED because $${bound}$ is genuinely reached, which happens at the one input where ${useAbs === 1 ? "the bars empty" : "the root hands back"} $0$. The line drawn here is the OUTPUT line, which is what makes this a range and not a domain.`,
  },

  "cfu.fun3.evaluate-by-piece": {
    Svg: ({ breakAt = 5, rateLow = 7, rateHigh = 4, standing = 18, light = 2 }) => (
      <ExpressionReductionWorked
        rows={pieceChargeRows(breakAt, rateLow, rateHigh, standing, light)}
        title="Each load tested against the conditions before either is substituted"
        ariaLabel={`The load of ${spoken(breakAt)} tons is owned by the second formula and costs ${spoken(rateHigh * breakAt + standing)}, and the load of ${spoken(light)} tons is owned by the first and costs ${spoken(rateLow * light)}`}
      />
    ),
    caption: ({ breakAt = 5, rateLow = 7, rateHigh = 4, standing = 18, light = 2 }) =>
      `The conditions are read BEFORE anything is multiplied, and the load sitting exactly at the break is where that matters: the second condition takes the break in, so the $${breakAt}$ ton load belongs to the second formula and costs $${rateHigh * breakAt + standing}$ dollars. The lighter load falls under the first formula and costs $${rateLow * light}$ dollars. Putting a load through the other piece gives a number that is arithmetically perfect and is simply not this function's value, which is the whole trap a piecewise rule sets.`,
  },

  "cfu.fun4.read-features": {
    Svg: ({ h1 = 3, h2 = 8, h3 = 12, r0 = 4, r1 = 9, r2 = 2, r3 = 11 }) => (
      <StripChartWorked h1={h1} h2={h2} h3={h3} r0={r0} r1={r1} r2={r2} r3={r3} />
    ),
    caption: ({ h1 = 3, h2 = 8, h3 = 12, r1 = 9, r3 = 11 }) =>
      `A leg between two neighbouring marks only ever does one thing, so each is settled by comparing its own two ends: only the leg from hour $${h1}$ to hour $${h2}$ falls, and it is inked apart above. The highest reading is a separate reading of the same chart, and it is not the turn. The turn at $${r1}$ beats its immediate neighbours and says nothing whatever about the rest of the shift, while the chart runs off the end at $${r3}$, higher than it ever peaked. That is why the answer names the closing hour $${h3}$ and not the turn.`,
  },

  "cfu.fun5.average-rate": {
    Svg: ({ t1 = 3, t2 = 6, v0 = 4, v1 = 28, v2 = 16 }) => (
      <ExpressionReductionWorked
        rows={averageRateRows(t1, t2, v0, v1, v2)}
        title="One trace, two windows, and the sign each subtraction carries"
        ariaLabel={`Over the whole shift the average is ${spoken((v2 - v0) / t2)} per hour, and over the last window it is ${spoken((v2 - v1) / (t2 - t1))} per hour`}
      />
    ),
    caption: ({ t1 = 3, t2 = 6, v0 = 4, v1 = 28, v2 = 16 }) => {
      const whole = (v2 - v0) / t2;
      const late = (v2 - v1) / (t2 - t1);
      return `Over a window only the marks at its two ENDS count, so the mark at hour $${t1}$ plays no part in the first calculation and is the whole of the second one's starting point. Keeping the sign the subtraction gives is what makes the two answers disagree: the shift as a whole averages $${whole}$ units per hour while its last stretch averages $${late}$. Measuring the size of the gap and dropping the direction would turn ${late < 0 ? "that fall into a rise" : "that rise into a fall"}, and the direction is half of what a rate reports.`;
    },
  },

  "cfu.fun6.difference-quotient": {
    Svg: ({ a = 2, b = -3, c = 5, p = 4 }) => (
      <ExpressionReductionWorked
        rows={differenceQuotientRows(a, b, c, p)}
        title="The whole input in, the shared constant out, and the h divided out"
        ariaLabel={`Expanding, subtracting the starting output and dividing by h leaves ${spoken(a)} h ${2 * a * p + b < 0 ? "minus" : "plus"} ${Math.abs(2 * a * p + b)}`}
      />
    ),
    caption: ({ a = 2, b = -3, c = 5, p = 4 }) => {
      const k = 2 * a * p + b;
      const start = a * p * p + b * p + c;
      return `The squared term has to be multiplied out in FULL, because $(${p} + h)^{2}$ carries a middle term that squaring the pieces separately loses, and that middle term is where the whole answer comes from. Subtracting the starting output $${start}$ then removes every term with no $h$ in it, since those terms sat in both outputs unchanged. What is left carries an $h$ in every term, so the $h$ underneath divides out of all of them at once and the quotient is $${a}h${joinedConstant(k)}$.`;
    },
  },

  /*
   * The one entry here that is NOT bespoke, and deliberately so. This check asks the practice
   * pool's own question — a linear f, a square g, and the composite at a number, which is
   * `d6.fun7.order-value.l2` with its order pinned — so it draws that template's chain rather
   * than a column of its own. `d6ComposeFigure.test.tsx` holds the two renderings identical.
   */
  "cfu.fun7.compose-evaluate": {
    Svg: ({ a = 3, b = 8, k = -4, n = 5 }) => composeOrderChain({ order: 0, a, b, k, n }),
    caption: ({ a = 3, b = 8, k = -4, n = 5 }) => {
      const inner = n * n + k;
      const value = a * inner + b;
      const swapped = a * n + b;
      return `The circle notation names the OUTER function first, which is why the input goes into the inner one and the outer rule never meets it: $${n}$ goes into $g$, $g$ hands over $${inner}$, and only that single number reaches $f$. Running the machines the other way round is a different machine and a different question, and it lands somewhere else, on $${swapped * swapped + k}$. The answer to the one that was asked is $${value}$.`;
    },
  },

  "cfu.fun8.find-inverse": {
    Svg: ({ m = 4, c = 5, v = 3 }) => (
      <ExpressionReductionWorked
        rows={inverseRows(m, c, v)}
        title="Swap the two variables, solve for the new y, then use the rule once"
        ariaLabel={`The inverse rule is ${spoken(m)} x ${-c < 0 ? "minus" : "plus"} ${Math.abs(c)}, and putting ${spoken(v)} through it gives ${spoken(m * v - c)}`}
      />
    ),
    caption: ({ m = 4, c = 5, v = 3 }) =>
      `Swapping the two variables is the whole idea: the inverse reads the same pairing the other way round, so trading $x$ and $y$ and then solving for $y$ builds the rule rather than guessing it. Multiplying both sides by $${m}$ clears the bar in one move, and what is left is a one-step solve. The second half is then only a substitution into the rule just built, which is why the rule has to be built FIRST: $f^{-1}(${v})$ is $${m * v - c}$, and it is not $${v}$ handed back.`,
  },

  "cfu.fun9.transform-and-parity": {
    Svg: ({ even = 0, gain = 2, shift = 1, lift = 5, logged = 4, height = 9 }) => (
      <ExpressionReductionWorked
        rows={transformParityRows(even === 1, gain, shift, lift, logged, height)}
        title="The asked input substituted, then the symmetry, then the two moves outside"
        ariaLabel={`Putting ${spoken(shift - logged)} in for x turns the bracket into ${spoken(-logged)}, symmetry supplies that reading as ${spoken(even === 1 ? height : -height)}, and the gain and the lift finish at ${spoken(gain * (even === 1 ? height : -height) + lift)}`}
      />
    ),
    caption: ({ even = 0, gain = 2, shift = 1, lift = 5, logged = 4, height = 9 }) => {
      const asked = shift - logged;
      const reflected = even === 1 ? height : -height;
      const value = gain * reflected + lift;
      return `The question asks for $g(${asked})$, so $${asked}$ goes in wherever the rule writes $x$, and the bracket is where that lands: the second row is the substitution, and $${asked} ${shift < 0 ? `+ ${-shift}` : `- ${shift}`} = ${-logged}$ is it being worked out. So the reading $f$ is asked for is the one at $${-logged}$, not the one at the input the question named and not the one the log gives. The log holds a single reading, and the symmetry is what turns it into the other: ${even === 1 ? `an even trace hands back the SAME output at an input and its negative, so the reading stays $${height}$` : `an odd trace hands back the OPPOSITE output at an input and its negative, so the reading becomes $${-height}$`}. Only then do the outside moves apply, in their own order: the multiplier acts on that value and the constant is added to the result, leaving $${value}$.`;
    },
  },

  "cfu.fun10.vertex-and-graph": {
    Svg: ({ stretch = -2, h = 6, k = 10 }) => (
      <VertexWorked stretch={stretch} h={h} k={k} />
    ),
    caption: ({ stretch = -2, h = 6, k = 10 }) => {
      const verdict = stretch < 0 ? "maximum" : "minimum";
      return `The bars turn the trace, and they turn it where they empty, so the input at the corner is the one that makes $${shiftedInput(h)}$ vanish. Putting that input back through the whole rule gives the height there, and the corner is $${pointTex(h, k)}$. Which KIND of turn it is comes from the sign of the number multiplying the bars, $(${stretch})$, and from nothing else: it is ${stretch < 0 ? "negative, so both arms fall away from the corner and no point of the trace rises above it" : "positive, so both arms rise away from the corner and no point of the trace falls below it"}, which makes that height a ${verdict}.`;
    },
  },
};
