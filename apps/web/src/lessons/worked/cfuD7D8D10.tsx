/**
 * Worked-solution figures for the D7, D8 and D10 CHECKS, whose questions no practice template
 * asks.
 *
 * Six of these eight are composite, and each one is composite for a stated reason: LF.1 wants a
 * slope AND the word it implies, LF.3 a model AND a prediction made with it, EL.2 an asymptote
 * AND the anchor's new home, EL.4 a domain AND the asymptote at its boundary. So every figure
 * here has to close on the whole answer, and where the two parts are read off different features
 * of one picture, the picture says both.
 *
 * Five reuse the component their node's practice figures are drawn with, which is what keeps a
 * check looking like the lesson it ends: `DirectionFigure` for LF.1, `ExpWorkedPlane` for EL.2,
 * `LogPlane` for EL.4, `BoxNetWorked` for GEO.2. Two of those needed one option each -- a
 * closing answer line, and a lid drawn bare -- both defaulted off, so the pooled shapes render
 * exactly as before. Sideways imports between `worked/` modules are safe; only an import of the
 * REGISTRY would make a cycle.
 *
 * GEO.1's is the one purpose-built drawing. Its answer is a length on a scaled copy, and the
 * only honest picture of that is two rectangles, so it draws them.
 */

import { el5Symbol } from "@cr/item-bank";
import type { JSX } from "react";

import { BRICK, CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import {
  ExpressionReductionWorked,
  frac,
  numStr,
  PLUS_INK,
  type ReductionRow,
  reduce,
  reduceTail,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";
import { DirectionFigure } from "./d7LF1";
import { ExpWorkedPlane } from "./d8EL2";
import { coefficientArg, domainTex, LogPlane } from "./d8EL4";
import { BoxNetWorked } from "./d10GEO2";

/** A coordinate pair with the comma spaced the way KaTeX wants it. */
function pointTex(x: number, y: number): string {
  return `(${numStr(x)},\\, ${numStr(y)})`;
}

/** A logarithm token: bare for base 10, subscripted otherwise. */
function logToken(base: number): string {
  return base === 10 ? "\\log" : `\\log_{${base}}`;
}

/**
 * A slope's reduced numerator and denominator, as `frac` wants them.
 *
 * The slope is a genuine fraction on every sloping draw (the generator rerolls until it is), so
 * this reduces rather than testing for a whole number -- the level case never reaches here.
 */
function slopeParts(dy: number, dx: number): [number, number] {
  const r = reduce(dy, dx);
  return [r.n, r.d];
}

/* ------------------------------------------------- LF.3: a model, then a prediction with it */

/**
 * A draining pool as a linear model, then evaluated.
 *
 * Row one is the model and row four is the prediction, and both are half of one typed answer.
 * The two middle rows are the substitution, which is the part that cannot be pattern-matched:
 * writing `-rate x + start` can be done by copying two numbers out of the sentence into the
 * right places, and substituting into what you wrote cannot.
 */
function drainModelRows(
  rate: number,
  minutes: number,
  start: number,
  left: number,
): ReductionRow[] {
  return [
    {
      tokens: [
        { text: `y = -${rate}x`, color: CIVIC },
        PLUS_INK,
        { text: `${start}`, color: CIVIC },
      ],
    },
    { tokens: [{ text: `y = -${rate}(${minutes}) + ${start}`, color: SIGNAL }] },
    { tokens: [{ text: `y = -${rate * minutes} + ${start}` }] },
    { tokens: [{ text: `y = ${left}`, color: CIVIC }] },
  ];
}

/* ------------------------------- EL.5: the coefficient goes inside before anything gathers */

/**
 * `power log base + log symbol` condensed.
 *
 * Three moves in three rows, and the first is the one the check exists for: while the
 * coefficient is still out front the sum has only one logarithm in it, so there is nothing to
 * gather yet. The middle row evaluates the power, because a plain number left as `2^{3}` is an
 * answer that stopped early.
 */
function condenseCoefficientRows(
  base: number,
  power: number,
  value: number,
  symbol: string,
): ReductionRow[] {
  const log = "\\log";
  return [
    {
      tokens: [
        { text: `${power} ${log} ${base}`, color: SIGNAL },
        PLUS_INK,
        { text: `${log} ${symbol}` },
      ],
    },
    {
      tokens: [
        { text: `${log} ${base}^{${power}}`, color: SIGNAL },
        PLUS_INK,
        { text: `${log} ${symbol}` },
      ],
    },
    {
      tokens: [{ text: `${log} ${value}` }, PLUS_INK, { text: `${log} ${symbol}` }],
    },
    { tokens: [{ text: `${log}(${value}${symbol})`, color: CIVIC }] },
  ];
}

/* --------------------------------------------- EL.6: two roots, and only one of them counts */

/**
 * Gather, convert, factor, and throw one root away.
 *
 * The last two rows are the check. A quadratic hands back two roots whatever the question was,
 * and the rejected one is drawn STRUCK rather than omitted: a figure that only showed the
 * survivor would be showing a learner who tested both roots and a learner who solved the
 * quadratic and stopped the same picture, which is exactly the pair this question separates.
 */
function solveExtraneousRows(
  base: number,
  exponent: number,
  kept: number,
  rejected: number,
): ReductionRow[] {
  const log = logToken(base);
  const shift = kept - rejected;
  const power = base ** exponent;
  return [
    { tokens: [{ text: `${log} x + ${log}(x - ${shift}) = ${exponent}` }] },
    {
      tokens: [
        { text: `${log}\\left(x(x - ${shift})\\right) = ${exponent}`, color: SIGNAL },
      ],
    },
    { tokens: [{ text: `x(x - ${shift}) = ${base}^{${exponent}} = ${power}` }] },
    { tokens: [{ text: `(x - ${kept})(x + ${rejected}) = 0` }] },
    {
      tokens: [
        { text: `x = -${rejected}`, color: SOFT, strike: true },
        { text: ",", color: SOFT },
        { text: `x = ${kept}`, color: CIVIC },
      ],
    },
  ];
}

/* ------------------------------------------ GEO.1: the foundation, and its model beside it */

/**
 * A rectangle with its diagonal, and the scaled copy whose diagonal is the answer.
 *
 * Two rectangles rather than one, because the answer is a length on the SECOND one and a figure
 * showing only the foundation would stop one step before the question. They are drawn from the
 * same outline divided by the scale, so the picture is similar in the way the words claim: the
 * model really is `1/n` of the foundation on the page, not merely labelled as such.
 *
 * The model's own size is therefore the constraint the labelling has to work around, and drawing
 * it larger is not on offer: its size IS the scale factor. At the authored tenth it is about
 * thirteen user units across, so a plated label set over its diagonal covers the whole box and
 * the second rectangle photographs as a smudge -- which is what the 1024x580 frame of the D10 QA
 * round showed. So the model's answer is named UNDER it and both boxes are captioned in words,
 * because at that size the only thing telling a reader which object is which is the caption.
 */
function ModelDiagonalWorked({
  a,
  b,
  n,
}: {
  a: number;
  b: number;
  n: number;
}): JSX.Element {
  const diagonal = Math.round(Math.sqrt(a * a + b * b));
  const answer = diagonal / n;
  // One unit serves both rectangles, so the model is drawn at exactly 1/n of the foundation.
  // The sides are always in the ratio 3:4, so this resolves to the same 120x90 outline on every
  // draw and the model's width is entirely the scale's doing.
  const unit = Math.min(120 / b, 90 / a);
  const box = (
    x: number,
    y: number,
    across: number,
    down: number,
    hypotenuse: string,
    tint: string,
    caption: string,
  ): JSX.Element => {
    // Over the diagonal where there is room for a plate, underneath where the box is smaller
    // than the plate would be. `across` rather than `n`, so a scale that leaves the model
    // legible keeps the label on the picture.
    const roomy = across >= 50;
    return (
      <g>
        <rect
          x={x}
          y={y - down}
          width={across}
          height={down}
          fill="none"
          stroke={LINE}
          strokeWidth={1.5}
        />
        <line x1={x} y1={y} x2={x + across} y2={y - down} stroke={tint} strokeWidth={2} />
        <SvgMath
          latex={hypotenuse}
          x={roomy ? x + across / 2 + 10 : x + across / 2}
          y={roomy ? y - down / 2 - 12 : y + 16}
          fontSize={14}
          color={tint}
          w={70}
          plate={roomy}
        />
        {/* Plain `<text>`, since neither word is math. */}
        <text x={x + across / 2} y={y + 34} textAnchor="middle" fontSize={10} fill={SOFT}>
          {caption}
        </text>
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 440 210"
      role="img"
      aria-label={`A rectangle ${spoken(a)} by ${spoken(b)} whose diagonal is ${spoken(diagonal)} meters, beside a model at one ${spoken(n)}th of that size whose diagonal is ${spoken(answer)} meters`}
    >
      <title>A foundation's diagonal, and the same diagonal on its scaled model</title>

      {box(20, 150, b * unit, a * unit, `${diagonal}`, SIGNAL, "foundation")}
      {box(
        20 + b * unit + 26,
        150,
        (b * unit) / n,
        (a * unit) / n,
        `${answer}`,
        CIVIC,
        "model",
      )}

      {/* A right-hand column rather than a row above and a row below, because the space under
          the boxes is where the model's own answer and both captions now sit. The closing row
          stays LAST in document order: `cfuAuthoredFigureShots` reads the final foreignObject
          as the solved line and checks it against the viewBox. */}
      <SvgMath
        latex={`${a}^{2} + ${b}^{2} = ${diagonal * diagonal}`}
        x={330}
        y={62}
        fontSize={15}
        color={LABEL}
        w={190}
      />
      <SvgMath
        latex={`${frac(diagonal, n)} = ${answer}`}
        x={330}
        y={116}
        fontSize={16}
        color={CIVIC}
        w={190}
      />
    </svg>
  );
}

export const CFU_D7_D8_D10_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "cfu.lf1.slope-direction": {
    Svg: ({ x1 = -5, y1 = 2, dx = 7, dy = 5, kind = 1 }) => {
      const verdict = kind === 0 ? "constant" : kind === 1 ? "increasing" : "decreasing";
      const slope = dy === 0 ? "0" : frac(...slopeParts(dy, dx));
      return (
        <DirectionFigure
          x1={x1}
          y1={y1}
          x2={x1 + dx}
          y2={y1 + dy}
          verdict={verdict}
          answer={`m = ${slope}, \\;\\; \\text{${verdict}}`}
        />
      );
    },
    caption: ({ dx = 7, dy = 5, kind = 1 }) => {
      const verdict = kind === 0 ? "constant" : kind === 1 ? "increasing" : "decreasing";
      const slope = dy === 0 ? "0" : reduceTail(dy, dx, true);
      return dy === 0
        ? `The two points sit at the same height, so the rise is $0$ whatever the run and the slope is $0$: the line holds level, which is what **constant** means. Nothing about the run enters the answer.`
        : `Both differences are taken from the same starting point, which is what keeps the sign honest: $m = ${slope}$. The **sign** is then the whole of the second half of the answer -- a ${dy > 0 ? "positive" : "negative"} slope ${dy > 0 ? "rises" : "falls"} from left to right, so the line is ${verdict}.`;
    },
  },

  "cfu.lf3.drain-model": {
    Svg: ({ rate = 15, minutes = 12, start = 320, left = 140 }) => (
      <ExpressionReductionWorked
        rows={drainModelRows(rate, minutes, start, left)}
        title="A model built from a rate and a starting amount, then used"
        ariaLabel={`The model is negative ${rate} x plus ${start}, and substituting ${minutes} minutes leaves ${left} liters`}
      />
    ),
    caption: ({ rate = 15, minutes = 12, start = 320, left = 140 }) =>
      `The two numbers in the sentence do different jobs: $${start}$ is the amount before the pump starts, which is the output at $x = 0$ and so the constant, and $${rate}$ is a rate per minute. Draining takes liters **away**, which is the whole reason the model reads $-${rate}x + ${start}$ rather than $${rate}x + ${start}$. The prediction is then a substitution and not a new idea: at $x = ${minutes}$ the pool is down to $${left}$ liters.`,
  },

  "cfu.el2.reflect-shift": {
    Svg: ({ base = 3, shift = 5, anchor = 4 }) => (
      <ExpWorkedPlane
        curves={[
          { fn: (x) => base ** x, color: SOFT, dashed: true },
          { fn: (x) => -(base ** x) + shift, color: CIVIC },
        ]}
        rule={{ y: shift, label: `y = ${shift}` }}
        points={[
          { x: 0, y: 1, color: SOFT, label: pointTex(0, 1) },
          { x: 0, y: anchor, color: BRICK, label: pointTex(0, anchor) },
        ]}
        include={[0, 1, shift, anchor]}
        xMin={-2}
        xMax={1.6}
        equation={`y = ${shift} \\quad \\text{and} \\quad ${pointTex(0, anchor)}`}
        title="A reflection that leaves the asymptote and a shift that carries it"
        ariaLabel={`The dashed original curve with its anchor at 0 comma 1, and the reflected and shifted curve whose asymptote is y equals ${shift} and whose anchor has moved to 0 comma ${anchor}`}
      />
    ),
    caption: ({ base = 3, shift = 5, anchor = 4 }) =>
      `The two features move differently, which is why both are asked for. Mirroring over the $x$-axis turns every height into its opposite, and $0$ is its own opposite, so the asymptote does **not** move while the anchor drops to $(0, -1)$. The shift afterwards carries both the same $${shift}$: the asymptote rises to $y = ${shift}$ and the anchor lands at $${pointTex(0, anchor)}$. Applying the shift to everything and the reflection to nothing gives $y = ${shift}$ with the anchor at $(0, ${1 + shift})$, which is the mistake this question separates. The base $${base}$ never enters either answer.`,
  },

  "cfu.el4.domain-asymptote": {
    Svg: ({ bound = 9 }) => (
      <LogPlane
        base={10}
        m={bound}
        dir={-1}
        k={1}
        equation={`${domainTex(bound, -1)} \\quad \\text{and} \\quad x = ${bound}`}
        title="A domain running left of the boundary, and the asymptote standing on it"
        ariaLabel={`A logarithm whose shaded domain is every input less than ${spoken(bound)}, with the dashed vertical asymptote at x equals ${spoken(bound)}`}
      />
    ),
    caption: ({ bound = 9 }) =>
      `A logarithm accepts exactly the positive arguments, so the condition is $${coefficientArg(1, bound)} > 0$. Solving it is where the direction is decided: the variable is being **subtracted**, so adding $x$ to both sides gives $${bound} > x$, which reads the usual way round as $x < ${bound}$. The asymptote then stands on the boundary the domain stops at, $x = ${bound}$ -- the same number as the domain's bound, and a different claim about it.`,
  },

  "cfu.el5.condense-coefficient": {
    Svg: ({ base = 2, power = 3, value = 8, symIndex = 0 }) => (
      <ExpressionReductionWorked
        rows={condenseCoefficientRows(base, power, value, el5Symbol(symIndex))}
        title="The coefficient moves inside before anything is gathered"
        ariaLabel={`The ${power} out front becomes an exponent, ${base} to the ${power} is ${value}, and the sum of two bare logarithms condenses to the logarithm of ${value} times ${el5Symbol(symIndex)}`}
      />
    ),
    caption: ({ base = 2, power = 3, value = 8, symIndex = 0 }) =>
      `Nothing can be gathered while the $${power}$ is still a multiplier out front, because a coefficient on a logarithm is not a term of the sum: it goes inside as an exponent first, giving $\\log ${base}^{${power}}$. A power of a plain number is then worth working out, so that term becomes $\\log ${value}$, and only now are both terms bare logarithms and the product rule available: $\\log(${value}${el5Symbol(symIndex)})$.`,
  },

  "cfu.el6.solve-extraneous": {
    Svg: ({ base = 10, exponent = 2, kept = 25, rejected = 4 }) => (
      <ExpressionReductionWorked
        rows={solveExtraneousRows(base, exponent, kept, rejected)}
        title="Two roots from the quadratic, one of them impossible"
        ariaLabel={`Gathering, converting and factoring gives roots ${spoken(kept)} and negative ${spoken(rejected)}, and the negative one is rejected because a logarithm cannot take it, leaving ${spoken(kept)}`}
      />
    ),
    caption: ({ base = 10, kept = 25, rejected = 4 }) =>
      `The quadratic hands back two roots whatever the question was, and only the ORIGINAL equation decides which of them is a solution. Testing $x = -${rejected}$ asks for $${logToken(base)}(-${rejected})$, which no logarithm can return, so that root is extraneous rather than wrong arithmetic. Testing $x = ${kept}$ leaves both arguments positive, $${kept}$ and $${rejected}$, so it is the one number the equation accepts.`,
  },

  "cfu.geo1.model-diagonal": {
    Svg: ({ a = 12, b = 16, n = 4 }) => <ModelDiagonalWorked a={a} b={b} n={n} />,
    caption: ({ a = 12, b = 16, n = 4 }) => {
      const diagonal = Math.round(Math.sqrt(a * a + b * b));
      return `The foundation's diagonal is the hypotenuse of a right triangle with legs $${a}$ and $${b}$, so squaring and adding gives $${diagonal * diagonal}$ and the diagonal is $${diagonal}$ meters. The model is **similar** to the foundation, which is what lets that answer be scaled rather than recomputed: every length on it is $${frac(1, n, true)}$ of the length it corresponds to, so the model's diagonal is $${diagonal / n}$ meters.`;
    },
  },

  "cfu.geo2.open-cistern-lining": {
    Svg: ({ l = 9, w = 6, d = 4 }) => <BoxNetWorked l={l} w={w} d={d} openTop />,
    caption: ({ l = 9, w = 6, d = 4 }) =>
      `Lining covers faces, so this is a surface area in square meters and not the capacity in cubic ones. Unfolded, the job is the floor ($${l} \\times ${w} = ${l * w}$) plus two pairs of walls ($${2 * l * d}$ and $${2 * w * d}$), and the sixth rectangle is drawn empty because the cistern stands open: counting it would add $${l * w}$ square meters of lead to a hole. That leaves $${l * w + 2 * l * d + 2 * w * d}$ square meters.`,
  },
};
