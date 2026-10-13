/**
 * Worked-solution figures for the D8 EL.1 practice templates (evaluate an exponential model,
 * including the continuous base-$e$ one).
 *
 * Two of the five shapes are the same picture twice over: a starting amount and a chain of
 * equal factors between the values it passes through, running up for growth and down for
 * decay. `FactorLadder` draws that, because the thing a learner has to see is that the STEP
 * changes while the FACTOR does not, and a column of rows hides it: the ladder puts the
 * amounts side by side with the factor written on the arc between each pair.
 *
 * The classify shape has a word for an answer rather than a value, so it gets the only figure
 * that decides anything: a base laid against $1$ on an axis, with the region it lands in
 * naming the verdict. The two L3 shapes are reductions, because their work is genuinely
 * sequential (turn the percent into a factor, or the rate and the time into one exponent)
 * and `ExpressionReductionWorked` is that column.
 *
 * Every figure is driven only by its own template's `template_params` with a default for each
 * one, and recomputes the same values `generate()` did, by the same route: the exponent of $e$
 * is `(ratePct * t) / 100` rather than `(ratePct / 100) * t`, because the second one prints
 * `0.21000000000000002` for a three-percent rate over seven years.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import {
  ExpressionReductionWorked,
  numStr,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";

/* -------------------------------------------------------------------------- */
/* The factor ladder (growth and decay)                                        */
/* -------------------------------------------------------------------------- */

/**
 * The amounts a model passes through, and the one factor sitting between every pair.
 *
 * `amounts` is already in reading order, so decay hands it over falling; the arc label is
 * given rather than derived for the same reason, since decay's factor is a fraction of what
 * remains and printing `0.5` there would drop the very reading the shape teaches.
 */
function FactorLadder({
  amounts,
  factorTex,
  footer,
  ariaLabel,
  title,
}: {
  amounts: readonly number[];
  factorTex: string;
  footer: string;
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const left = 48;
  const right = 392;
  const rowY = 76;
  const span = amounts.length > 1 ? (right - left) / (amounts.length - 1) : 0;
  const at = (index: number): number => (amounts.length > 1 ? left + index * span : 220);
  // The slot boxes must not touch, or two four-digit amounts collide at five steps.
  const slotW = Math.max(56, span - 6);

  return (
    <svg viewBox="0 0 440 150" role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <line x1={30} y1={rowY + 24} x2={410} y2={rowY + 24} stroke={LINE} strokeWidth={1} />

      {amounts.map((amount, index) => (
        <g key={`slot-${amount}`}>
          <SvgMath
            latex={numStr(amount)}
            x={at(index)}
            y={rowY}
            fontSize={17}
            color={index === amounts.length - 1 ? CIVIC : LABEL}
            w={slotW}
          />
          <text x={at(index)} y={rowY + 40} textAnchor="middle" fontSize={10} fill={SOFT}>
            {`step ${index}`}
          </text>
        </g>
      ))}

      {amounts.slice(1).map((amount, index) => {
        const from = at(index);
        const to = at(index + 1);
        const mid = (from + to) / 2;
        const tipX = to - 16;
        const tipY = rowY - 16;
        const apexY = rowY - 44;
        const dx = tipX - mid;
        const dy = tipY - apexY;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const size = 7;
        const bx = tipX - ux * size;
        const by = tipY - uy * size;
        const px = -uy * (size * 0.55);
        const py = ux * (size * 0.55);
        return (
          <g key={`arc-${amount}`}>
            <path
              d={`M ${from + 16} ${rowY - 16} Q ${mid} ${apexY} ${tipX} ${tipY}`}
              fill="none"
              stroke={SIGNAL}
              strokeWidth={1.4}
            />
            <path
              d={`M ${tipX} ${tipY} L ${bx + px} ${by + py} L ${bx - px} ${by - py} Z`}
              fill={SIGNAL}
            />
            <SvgMath
              latex={factorTex}
              x={mid}
              y={rowY - 50}
              fontSize={13}
              color={SIGNAL}
              w={Math.max(72, span)}
            />
          </g>
        );
      })}

      <SvgMath
        latex={footer}
        x={220}
        y={rowY + 62}
        fontSize={footer.length > 28 ? 16 : 18}
        color={LABEL}
        w={430}
      />
    </svg>
  );
}

/** The amounts a factor of `b` applied `x` times reaches from `a`. */
function climb(a: number, b: number, x: number): number[] {
  return Array.from({ length: x + 1 }, (_, step) => a * b ** step);
}

/** The amounts dividing by `b` reaches from `start`, `x` times over. */
function fall(start: number, b: number, x: number): number[] {
  return Array.from({ length: x + 1 }, (_, step) => start / b ** step);
}

/* -------------------------------------------------------------------------- */
/* The base laid against 1 (the classify shape)                                */
/* -------------------------------------------------------------------------- */

const AXIS = { left: 44, right: 396, y: 104, top: 4 };
/** Every base either template tier can draw sits under this, with room to label the end. */
const AXIS_MAX = 3.2;

/**
 * A base on an axis with $1$ marked on it, which is the whole decision: to the right of $1$
 * every step multiplies the amount up, and to the left of it every step keeps only part of
 * what it was handed. The coefficient is printed but deliberately unplaced, because it has no
 * say in this and a figure that gave it a position on the axis would suggest it does.
 */
function BaseAgainstOne({
  a,
  base,
  growing,
}: {
  a: number;
  base: number;
  growing: boolean;
}): JSX.Element {
  const px = (value: number): number =>
    AXIS.left + (value / AXIS_MAX) * (AXIS.right - AXIS.left);
  const one = px(1);
  const spot = px(base);

  return (
    <svg
      viewBox="0 0 440 152"
      role="img"
      aria-label={`The base ${spoken(base)} laid against 1 on an axis, landing in the ${growing ? "growth" : "decay"} side`}
    >
      <title>A base compared with 1</title>

      <SvgMath
        latex={`f(x) = ${a}(${numStr(base)})^{x}`}
        x={220}
        y={26}
        fontSize={18}
        color={LABEL}
        w={420}
      />

      <line
        x1={AXIS.left}
        y1={AXIS.y}
        x2={AXIS.right}
        y2={AXIS.y}
        stroke={LINE}
        strokeWidth={1.5}
      />
      {[0, 1, 2, 3].map((tick) => (
        <g key={`tick-${tick}`}>
          <line
            x1={px(tick)}
            y1={AXIS.y - 5}
            x2={px(tick)}
            y2={AXIS.y + 5}
            stroke={LINE}
            strokeWidth={1}
          />
          <text x={px(tick)} y={AXIS.y + 20} textAnchor="middle" fontSize={11} fill={SOFT}>
            {tick}
          </text>
        </g>
      ))}

      {/* The dividing line itself, drawn rather than described. */}
      <line
        x1={one}
        y1={AXIS.y - 34}
        x2={one}
        y2={AXIS.y + 8}
        stroke={SOFT}
        strokeWidth={1.2}
        strokeDasharray="4 3"
      />
      <text
        x={(AXIS.left + one) / 2}
        y={AXIS.y - 40}
        textAnchor="middle"
        fontSize={11}
        fill={SOFT}
      >
        decays
      </text>
      <text
        x={(one + AXIS.right) / 2}
        y={AXIS.y - 40}
        textAnchor="middle"
        fontSize={11}
        fill={SOFT}
      >
        grows
      </text>

      <circle cx={spot} cy={AXIS.y} r={5.5} fill={growing ? CIVIC : BRICK} />
      <SvgMath
        latex={`b = ${numStr(base)}`}
        x={spot}
        y={AXIS.y - 20}
        fontSize={14}
        color={growing ? CIVIC : BRICK}
        w={96}
      />

      <SvgMath
        latex={
          growing
            ? `${numStr(base)} > 1 \\;\\Rightarrow\\; \\text{growth}`
            : `${numStr(base)} < 1 \\;\\Rightarrow\\; \\text{decay}`
        }
        x={220}
        y={AXIS.y + 40}
        fontSize={16}
        color={growing ? CIVIC : BRICK}
        w={420}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Row builders for the two L3 shapes                                          */
/* -------------------------------------------------------------------------- */

/** The percent becomes a factor, the factor takes the exponent, the mass follows. */
function percentFactorRows(m0: number, r: number, t: number): ReductionRow[] {
  const rate = r / 100;
  const factor = 1 + rate;
  const exact = m0 * factor ** t;
  return [
    { tokens: [{ text: `${r}\\% = ${numStr(rate)}`, color: SIGNAL }] },
    { tokens: [{ text: `b = 1 + ${numStr(rate)} = ${numStr(factor)}`, color: CIVIC }] },
    { tokens: [{ text: `${m0} \\cdot ${numStr(factor)}^{${t}}` }] },
    { tokens: [{ text: `\\approx ${exact.toFixed(2)}`, color: BRICK }] },
  ];
}

/** The rate and the time become ONE exponent, which is the whole of $Pe^{rt}$. */
function continuousRows(principal: number, ratePct: number, t: number): ReductionRow[] {
  const rate = ratePct / 100;
  const exponent = (ratePct * t) / 100;
  const exact = principal * Math.exp(exponent);
  return [
    { tokens: [{ text: `A = Pe^{rt}`, color: SOFT }] },
    {
      tokens: [{ text: `r = ${numStr(rate)}, \\;\\; t = ${t}`, color: SIGNAL }],
    },
    {
      tokens: [
        { text: `rt = ${numStr(rate)} \\cdot ${t} = ${numStr(exponent)}`, color: CIVIC },
      ],
    },
    { tokens: [{ text: `A = ${principal}e^{${numStr(exponent)}}` }] },
    { tokens: [{ text: `\\approx ${exact.toFixed(2)}`, color: BRICK }] },
  ];
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const EL1_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d8.el1.evaluate.l1": {
    Svg: ({ a = 1, b = 2, x = 1, total = 0 }) => (
      <FactorLadder
        amounts={climb(a, b, x)}
        factorTex={`\\times ${b}`}
        footer={`${a} \\cdot ${b}^{${x}} = ${total}`}
        ariaLabel={`Starting from ${spoken(a)} and multiplying by ${spoken(b)} once an hour for ${spoken(x)} hours, reaching ${spoken(total)}`}
        title="One factor applied once per hour"
      />
    ),
    caption: ({ b = 2, x = 1, total = 0 }) =>
      `The factor $${b}$ is applied once per hour, so $${x}$ hours of it is $${b}^{${x}} = ${b ** x}$, and the count reaches $${total}$.`,
  },

  "d8.el1.decay-value.l2": {
    Svg: ({ m = 1, b = 2, x = 1, start = 0 }) => (
      <FactorLadder
        amounts={fall(start, b, x)}
        factorTex={`\\times \\tfrac{1}{${b}}`}
        footer={`${start} \\cdot \\left(\\tfrac{1}{${b}}\\right)^{${x}} = ${m}`}
        ariaLabel={`Starting from ${spoken(start)} and keeping one ${b === 2 ? "half" : `over ${spoken(b)}`} at each of ${spoken(x)} steps, leaving ${spoken(m)}`}
        title="A fraction of what remains, once per step"
      />
    ),
    // Named in steps rather than in days and milligrams, which is what the drawing itself
    // says: EL.1's CHECK is this same decay counted in hours over a queue of jobs, and a
    // caption that insisted on the practice prompt's units would be describing another
    // quantity. The prompt supplies the units; the figure supplies the arithmetic.
    caption: ({ m = 1, b = 2, x = 1, start = 0 }) =>
      `Keeping $\\tfrac{1}{${b}}$ of what is there at each step, $${x}$ steps over, divides $${start}$ by $${b}^{${x}} = ${b ** x}$, so $${m}$ is left.`,
  },

  "d8.el1.classify.l2": {
    Svg: ({ a = 1, base = 2, growing = 1 }) => (
      <BaseAgainstOne a={a} base={base} growing={growing === 1} />
    ),
    caption: ({ a = 1, base = 2, growing = 1 }) =>
      growing === 1
        ? `The base $${numStr(base)}$ is above $1$, so each step multiplies the output up and the model grows. The $${a}$ in front only says where it starts.`
        : `The base $${numStr(base)}$ lies between $0$ and $1$, so each step keeps only part of the output and the model decays. The $${a}$ in front only says where it starts.`,
  },

  "d8.el1.percent-growth.l3": {
    Svg: ({ m0 = 0, r = 0, t = 1 }) => (
      <ExpressionReductionWorked
        rows={percentFactorRows(m0, r, t)}
        title="A percent gain, turned into a repeated factor"
        ariaLabel={`A gain of ${spoken(r)} percent an hour is a factor of ${numStr(1 + r / 100)}, and ${spoken(t)} hours of it takes ${spoken(m0)} grams to about ${(m0 * (1 + r / 100) ** t).toFixed(2)}`}
      />
    ),
    caption: ({ m0 = 0, r = 0, t = 1 }) =>
      `Gaining $${r}\\%$ an hour means keeping the mass AND adding that share, so the repeated factor is $1 + ${numStr(r / 100)} = ${numStr(1 + r / 100)}$. Over $${t}$ hours it takes $${m0}$ grams to about $${(m0 * (1 + r / 100) ** t).toFixed(2)}$.`,
  },

  "d8.el1.continuous.l3": {
    Svg: ({ principal = 0, ratePct = 0, t = 1 }) => (
      <ExpressionReductionWorked
        rows={continuousRows(principal, ratePct, t)}
        title="Continuous growth: the rate and the time share one exponent"
        ariaLabel={`A rate of ${numStr(ratePct / 100)} over ${spoken(t)} years is an exponent of ${numStr((ratePct * t) / 100)}, so the balance is about ${(principal * Math.exp((ratePct * t) / 100)).toFixed(2)}`}
      />
    ),
    caption: ({ principal = 0, ratePct = 0, t = 1 }) =>
      `Compounding continuously puts the rate and the time together in the exponent: $rt = ${numStr((ratePct * t) / 100)}$, so the balance after $${t}$ years is $${principal}e^{${numStr((ratePct * t) / 100)}}$, about $${(principal * Math.exp((ratePct * t) / 100)).toFixed(2)}$ dollars.`,
  },
};
