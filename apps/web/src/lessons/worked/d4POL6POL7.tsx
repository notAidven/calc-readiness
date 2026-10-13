/**
 * Worked-solution figures for the D4 Early Modern graph-reading templates (POL.6 end behavior,
 * POL.7 zeros, multiplicity and turning points).
 *
 * Eight of the ten are `ExpressionReductionWorked`, the shared column, and that is the right
 * archetype rather than a shortcut: each of those eight is a CHAIN of readings off one
 * expression, where every row is justified by the row above it, and a column is what shows a
 * chain. Two of the ten make a claim about WHERE something sits rather than about what it
 * equals, and those two get pictures:
 *
 *  - {@link EndsFigure} draws the two ends of a graph as arrows leaving an axis, because "the
 *    left end goes up" is a statement about a direction and a row of algebra saying `up` is a
 *    word where a direction was meant. The transform template needs it most, since its whole
 *    difficulty is that one reflection moves the ends and the other swaps them.
 *  - {@link ZeroLineFigure} marks the zeros on an axis, because a roster is a set and the thing
 *    the learner is being taught is that the set is a set of PLACES. It also draws the sign flip
 *    that a bracket performs, which is where the roster goes wrong.
 *
 * Every figure recomputes what `generate()` computed from `template_params` rather than being
 * told the answer, and every parameter is coalesced, so a check reaching one of these entries
 * with a hand-written parameter set outside its template's own range still draws something true.
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
/* Shared LaTeX helpers                                                        */
/* -------------------------------------------------------------------------- */

/** `x^{4}` / `x` / an empty string for a constant. */
function power(exponent: number): string {
  return exponent === 0 ? "" : exponent === 1 ? "x" : `x^{${exponent}}`;
}

/** A monomial with its sign: `-3x^{4}`, `x^{5}`, `-x`. */
function monomial(coefficient: number, exponent: number): string {
  const body =
    exponent === 0
      ? `${Math.abs(coefficient)}`
      : Math.abs(coefficient) === 1
        ? power(exponent)
        : `${Math.abs(coefficient)}${power(exponent)}`;
  return coefficient < 0 ? `-${body}` : body;
}

/** `+ 7` / `- 7`, so a following term reads as an operation rather than a signed value. */
function trailing(coefficient: number, exponent: number): string {
  const body =
    exponent === 0
      ? `${Math.abs(coefficient)}`
      : Math.abs(coefficient) === 1
        ? power(exponent)
        : `${Math.abs(coefficient)}${power(exponent)}`;
  return `${coefficient < 0 ? "-" : "+"} ${body}`;
}

/** A negative factor in parentheses, so a bare minus never reads as the operator before it. */
function factorTex(value: number): string {
  return value < 0 ? `\\left(${value}\\right)` : `${value}`;
}

/** `(x - 3)` / `(x + 2)`: the bracket a zero contributes, with its sign flipped. */
function bracket(zero: number): string {
  return `(x ${zero < 0 ? `+ ${-zero}` : `- ${zero}`})`;
}

/** The same bracket at its multiplicity, bare when that is one. */
function bracketPower(zero: number, multiplicity: number): string {
  return multiplicity === 1 ? bracket(zero) : `${bracket(zero)}^{${multiplicity}}`;
}

/* -------------------------------------------------------------------------- */
/* The two ends of a graph, drawn                                              */
/* -------------------------------------------------------------------------- */

/**
 * One or two graphs' ends, as arrows leaving a horizontal axis.
 *
 * Only the ENDS are drawn and the middle is deliberately left empty. A polynomial's middle is
 * not decided by anything on this node, so a curve drawn through it would be inventing turning
 * points the leading term says nothing about, and a learner would reasonably read them as part
 * of the claim.
 */
function EndsFigure({
  rows,
  ariaLabel,
  title,
}: {
  rows: readonly { label: string; left: boolean; right: boolean; accent: string }[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const pitch = 92;
  const height = 26 + rows.length * pitch;
  const axisX0 = 120;
  const axisX1 = 400;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>
      {rows.map((row, index) => {
        const mid = 26 + index * pitch + pitch / 2;
        // An end going UP leaves the axis towards smaller y, which is why each arrow's tip is
        // the axis line minus a rise rather than plus one.
        const rise = 30;
        const leftTip = row.left ? mid - rise : mid + rise;
        const rightTip = row.right ? mid - rise : mid + rise;
        return (
          <g key={row.label}>
            <SvgMath latex={row.label} x={62} y={mid} fontSize={15} color={LABEL} w={104} />
            <line x1={axisX0} y1={mid} x2={axisX1} y2={mid} stroke={LINE} strokeWidth={1} />
            {/* The two ends. Dashed in the middle third, because nothing on this node decides
                what happens between them and a solid line there would claim it does. */}
            <path
              d={`M ${axisX0 + 74} ${mid} C ${axisX0 + 40} ${mid}, ${axisX0 + 26} ${leftTip}, ${axisX0 + 6} ${leftTip}`}
              fill="none"
              stroke={row.accent}
              strokeWidth={2.2}
            />
            <path
              d={`M ${axisX1 - 74} ${mid} C ${axisX1 - 40} ${mid}, ${axisX1 - 26} ${rightTip}, ${axisX1 - 6} ${rightTip}`}
              fill="none"
              stroke={row.accent}
              strokeWidth={2.2}
            />
            <line
              x1={axisX0 + 74}
              y1={mid}
              x2={axisX1 - 74}
              y2={mid}
              stroke={SOFT}
              strokeWidth={1.4}
              strokeDasharray="3 4"
            />
            <text
              x={axisX0 + 6}
              y={leftTip + (row.left ? -8 : 16)}
              fontSize={11}
              fill={SOFT}
            >
              {row.left ? "up" : "down"}
            </text>
            <text
              x={axisX1 - 26}
              y={rightTip + (row.right ? -8 : 16)}
              fontSize={11}
              fill={SOFT}
            >
              {row.right ? "up" : "down"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The zeros of a polynomial marked on an axis, each labelled with the bracket that produced it.
 *
 * The label under each mark is the BRACKET rather than the value, because the sign flip between
 * the two is the mistake the figure exists to make visible: the mark for `(x + 4)` sits to the
 * LEFT of zero, and seeing the bracket printed under a mark on the negative side is the whole
 * point.
 */
function ZeroLineFigure({
  zeros,
  ariaLabel,
  title,
}: {
  zeros: readonly { value: number; label: string; multiplicity: number }[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const values = zeros.map((zero) => zero.value);
  const lo = Math.min(...values, 0) - 1;
  const hi = Math.max(...values, 0) + 1;
  const axisY = 78;
  const x0 = 40;
  const x1 = 400;
  const at = (value: number): number => x0 + ((value - lo) / (hi - lo)) * (x1 - x0);

  return (
    <svg viewBox="0 0 440 152" role="img" aria-label={ariaLabel}>
      <title>{title}</title>
      <text x={220} y={24} textAnchor="middle" fontSize={16} fill={LABEL}>
        each bracket, set to zero
      </text>
      <line x1={x0} y1={axisY} x2={x1} y2={axisY} stroke={LINE} strokeWidth={1.4} />
      {/* The origin, so "to the left of zero" is a thing the picture can say. */}
      <line
        x1={at(0)}
        y1={axisY - 7}
        x2={at(0)}
        y2={axisY + 7}
        stroke={SOFT}
        strokeWidth={1}
      />
      <text x={at(0)} y={axisY + 22} textAnchor="middle" fontSize={11} fill={SOFT}>
        0
      </text>
      {zeros.map((zero) => (
        <g key={zero.label}>
          {/* A crossing zero is a filled mark and a turning one is hollow, so the two are told
              apart without colour: the palette here is not a verdict on anybody (R26). */}
          <circle
            cx={at(zero.value)}
            cy={axisY}
            r={5.5}
            fill={zero.multiplicity % 2 === 1 ? CIVIC : "var(--paper)"}
            stroke={CIVIC}
            strokeWidth={1.8}
          />
          <SvgMath
            latex={zero.label}
            x={at(zero.value)}
            y={axisY - 26}
            fontSize={13}
            color={SIGNAL}
            w={92}
          />
          <SvgMath
            latex={`x = ${numStr(zero.value)}`}
            x={at(zero.value)}
            y={axisY + 42}
            fontSize={13}
            color={CIVIC}
            w={92}
          />
        </g>
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Row builders for the eight reduction columns                                */
/* -------------------------------------------------------------------------- */

function degreeRows(degree: number, lead: number, middleExponent: number): ReductionRow[] {
  return [
    {
      tokens: [{ text: `${monomial(lead, degree)} \\;\\cdots`, color: LABEL }],
    },
    {
      tokens: [
        {
          text: `\\text{powers present: } ${degree},\\; ${middleExponent},\\; 0`,
          color: SIGNAL,
        },
      ],
    },
    { tokens: [{ text: `\\text{degree} = ${degree}`, color: CIVIC }] },
  ];
}

function reorderRows(
  degree: number,
  lead: number,
  middle: number,
  middleExponent: number,
  constant: number,
): ReductionRow[] {
  return [
    {
      tokens: [
        {
          text: `${monomial(constant, 0)} ${trailing(middle, middleExponent)} ${trailing(lead, degree)}`,
          color: LABEL,
        },
      ],
    },
    {
      tokens: [
        {
          text: `${monomial(lead, degree)} ${trailing(middle, middleExponent)} ${trailing(constant, 0)}`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [{ text: `\\text{leading coefficient} = ${numStr(lead)}`, color: CIVIC }],
    },
  ];
}

/** Degrees add and coefficients multiply: the two rows every "without expanding" shape needs. */
function leadingTermRows(
  written: string,
  degreeSum: string,
  degree: number,
  coefficientProduct: string,
  lead: number,
): ReductionRow[] {
  return [
    { tokens: [{ text: written, color: LABEL }] },
    { tokens: [{ text: `\\text{degrees add: } ${degreeSum} = ${degree}`, color: SIGNAL }] },
    {
      tokens: [
        {
          text: `\\text{coefficients multiply: } ${coefficientProduct} = ${numStr(lead)}`,
          color: SIGNAL,
        },
      ],
    },
    { tokens: [{ text: monomial(lead, degree), color: CIVIC }] },
  ];
}

function multiplicityRows(zero: number, multiplicity: number): ReductionRow[] {
  return [
    { tokens: [{ text: `\\text{at } x = ${numStr(zero)}`, color: LABEL }] },
    { tokens: [{ text: `\\text{its factor is } ${bracket(zero)}`, color: SIGNAL }] },
    {
      tokens: [
        {
          text: `\\text{written } ${bracketPower(zero, multiplicity)}`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [{ text: `\\text{multiplicity} = ${numStr(multiplicity)}`, color: CIVIC }],
    },
  ];
}

function turningRows(first: number, second: number): ReductionRow[] {
  const degree = first + second;
  return [
    {
      tokens: [
        { text: `\\text{exponents } ${first} \\text{ and } ${second}`, color: LABEL },
      ],
    },
    {
      tokens: [
        { text: `\\text{degree} = ${first} + ${second} = ${degree}`, color: SIGNAL },
      ],
    },
    {
      tokens: [{ text: `\\text{turns} \\le ${degree} - 1 = ${degree - 1}`, color: CIVIC }],
    },
  ];
}

function expandedZeroRows(p: number, q: number): ReductionRow[] {
  const b = -(p + q);
  const c = p * q;
  return [
    {
      tokens: [
        {
          text: `x^{3} ${trailing(b, 2)} ${trailing(c, 1)}`,
          color: LABEL,
        },
      ],
    },
    {
      tokens: [
        {
          text: `x\\left(x^{2} ${trailing(b, 1)} ${trailing(c, 0)}\\right)`,
          color: SIGNAL,
        },
      ],
    },
    { tokens: [{ text: `x${bracket(p)}${bracket(q)}`, color: SIGNAL }] },
    {
      tokens: [
        {
          text: `\\{${[0, p, q]
            .sort((a, z) => a - z)
            .map(numStr)
            .join(",\\; ")}\\}`,
          color: CIVIC,
        },
      ],
    },
  ];
}

function buildRows(
  zeros: readonly number[],
  touched: number,
  lead: number,
): ReductionRow[] {
  const bare = zeros.map(bracket).join("");
  const withPower = zeros
    .map((zero) => bracketPower(zero, zero === touched ? 2 : 1))
    .join("");
  return [
    {
      tokens: [
        {
          text: `\\text{zeros } ${zeros.map(numStr).join(",\\; ")}`,
          color: LABEL,
        },
      ],
    },
    { tokens: [{ text: bare, color: SIGNAL }] },
    { tokens: [{ text: withPower, color: SIGNAL }] },
    { tokens: [{ text: `${numStr(lead)}${withPower}`, color: CIVIC }] },
  ];
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const POL6_POL7_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d4.pol6.degree-standard.l1": {
    Svg: ({ degree = 3, lead = 2, middleExponent = 1 }) => (
      <ExpressionReductionWorked
        rows={degreeRows(degree, lead, middleExponent)}
        title="The powers present, and the largest of them"
        ariaLabel={`The powers present are ${spoken(degree)}, ${spoken(middleExponent)} and zero, so the degree is ${spoken(degree)}`}
      />
    ),
    caption: ({ degree = 3 }) =>
      `The degree is the largest exponent anywhere in the polynomial, which is $${degree}$ here. It is not the number of terms and not the largest coefficient, which are the two readings a learner meeting the word reaches for first.`,
  },

  "d4.pol6.leading-coefficient-jumbled.l2": {
    Svg: ({ degree = 3, lead = 2, middle = 2, middleExponent = 1, constant = 5 }) => (
      <ExpressionReductionWorked
        rows={reorderRows(degree, lead, middle, middleExponent, constant)}
        title="Sorted by power, then read off the front"
        ariaLabel={`Reordered by descending power, the leading term is ${spoken(lead)} x to the ${spoken(degree)}, so the leading coefficient is ${spoken(lead)}`}
      />
    ),
    caption: ({ lead = 2 }) =>
      `The word *leading* is about the highest DEGREE and not about the order the terms happen to be written in, so the reordering is the whole of the work. The coefficient carries its sign with it: $${lead}$.`,
  },

  "d4.pol6.leading-term-factored.l2": {
    Svg: ({ outer = 2, inner = 2, multiplicity = 2 }) => {
      const degree = 1 + multiplicity;
      return (
        <ExpressionReductionWorked
          rows={leadingTermRows(
            `${numStr(outer)}(${inner}x \\cdots)(x \\cdots)^{${multiplicity}}`,
            `1 + ${multiplicity}`,
            degree,
            `${factorTex(outer)} \\times ${inner}`,
            outer * inner,
          )}
          title="Degrees add, coefficients multiply"
          ariaLabel={`The degrees add to ${spoken(degree)} and the coefficients multiply to ${spoken(outer * inner)}, so the leading term is that coefficient times x to the ${spoken(degree)}`}
        />
      );
    },
    caption: ({ outer = 2, inner = 2, multiplicity = 2 }) =>
      `Nothing is expanded, and nothing needs to be. Each factor contributes its own leading term, so the degrees add to $${1 + multiplicity}$ and the coefficients multiply to $${outer * inner}$. A bracket raised to a power contributes its exponent that many times over.`,
  },

  "d4.pol6.product-leading-term.l3": {
    Svg: ({ aCoefficient = 2, aExponent = 2, bCoefficient = 3, bExponent = 2 }) => {
      const degree = aExponent + bExponent;
      return (
        <ExpressionReductionWorked
          rows={leadingTermRows(
            `\\left(${monomial(aCoefficient, aExponent)} \\cdots\\right)\\left(\\cdots ${trailing(bCoefficient, bExponent)}\\right)`,
            `${aExponent} + ${bExponent}`,
            degree,
            `${factorTex(aCoefficient)} \\times ${factorTex(bCoefficient)}`,
            aCoefficient * bCoefficient,
          )}
          title="Only the two highest powers reach the leading term"
          ariaLabel={`Multiplying only the two highest powers gives ${spoken(aCoefficient * bCoefficient)} x to the ${spoken(degree)}`}
        />
      );
    },
    caption: ({ aCoefficient = 2, aExponent = 2, bCoefficient = 3, bExponent = 2 }) =>
      `Four products come out of two brackets and only one of them can be the leading term, so the other three never need computing. The second bracket writes its highest power LAST, which is why the reading has to be off the exponents rather than off the positions: $${aExponent} + ${bExponent}$ for the degree and $${aCoefficient} \\times ${bCoefficient} = ${aCoefficient * bCoefficient}$ for the coefficient.`,
  },

  "d4.pol6.ends-after-transform.l3": {
    Svg: ({ degree = 3, lead = 2, transform = 0, side = 1 }) => {
      const even = degree % 2 === 0;
      const fRight = lead > 0;
      const fLeft = even ? fRight : !fRight;
      // `-f(x)` turns both ends over in place; `f(-x)` swaps them without turning either.
      const gLeft = transform === 0 ? !fLeft : fRight;
      const gRight = transform === 0 ? !fRight : fLeft;
      return (
        <EndsFigure
          rows={[
            { label: "f", left: fLeft, right: fRight, accent: SOFT },
            {
              label: transform === 0 ? "g = -f" : "g(x) = f(-x)",
              left: gLeft,
              right: gRight,
              accent: CIVIC,
            },
          ]}
          title="The two ends of f, and what the reflection does to them"
          ariaLabel={`The graph of f goes ${fLeft ? "up" : "down"} on the left and ${fRight ? "up" : "down"} on the right; after the reflection g goes ${gLeft ? "up" : "down"} on the left and ${gRight ? "up" : "down"} on the right`}
        />
      );
    },
    caption: ({ degree = 3, lead = 2, transform = 0 }) =>
      transform === 0
        ? `A minus sign in front of the whole function turns every value over, so each end stays where it is and reverses direction. The ends of $f$ come from its leading term: degree $${degree}$ and a ${lead > 0 ? "positive" : "negative"} coefficient.`
        : `A minus sign on the INPUT reverses which side of the graph you are looking at, so each end keeps its direction and changes places. On an even degree that changes nothing at all, and this one has degree $${degree}$.`,
  },

  "d4.pol7.zeros-from-factored.l1": {
    Svg: ({ first = -5, second = 2, multiplicity = 2 }) => (
      <ZeroLineFigure
        zeros={[
          { value: first, label: bracket(first), multiplicity: 1 },
          { value: second, label: bracketPower(second, multiplicity), multiplicity },
        ]}
        ariaLabel={`The zeros at ${spoken(first)} and ${spoken(second)}, marked on the axis under the brackets that produced them`}
        title="Each bracket, and the place on the axis it marks"
      />
    ),
    caption: ({ first = -5, second = 2, multiplicity = 2 }) =>
      `A product is zero exactly when one factor is, so each bracket is solved on its own and the constant in front contributes nothing. The sign flips on the way: the bracket that ADDS a number marks a place to the left of $0$. The repeated bracket still marks one place, and its hollow mark is the ${multiplicity % 2 === 0 ? "even" : "odd"} multiplicity showing: at $x = ${second}$ the graph ${multiplicity % 2 === 0 ? "turns back off the axis" : "crosses straight through"}.`,
  },

  "d4.pol7.multiplicity-at-zero.l2": {
    Svg: ({ r0 = -5, r1 = 2, r2 = 4, m0 = 2, m1 = 1, m2 = 1, asked = 0 }) => {
      const zeros = [r0, r1, r2];
      const multiplicities = [m0, m1, m2];
      const zero = zeros[asked] ?? r0;
      const multiplicity = multiplicities[asked] ?? m0;
      return (
        <ExpressionReductionWorked
          rows={multiplicityRows(zero, multiplicity)}
          title="Which bracket the zero belongs to, and its exponent"
          ariaLabel={`The zero at ${spoken(zero)} belongs to that bracket, which is written to the power ${spoken(multiplicity)}, so the multiplicity is ${spoken(multiplicity)}`}
        />
      );
    },
    caption: ({ r0 = -5, r1 = 2, r2 = 4, m0 = 2, m1 = 1, m2 = 1, asked = 0 }) => {
      const multiplicity = [m0, m1, m2][asked] ?? m0;
      const zero = [r0, r1, r2][asked] ?? r0;
      return `The multiplicity is the exponent on the zero's OWN bracket, and the exponents on the others say nothing about it. Here it is $${multiplicity}$, and being ${multiplicity % 2 === 0 ? "even" : "odd"} it also settles what the graph does at $x = ${zero}$: it ${multiplicity % 2 === 0 ? "comes back off the side it arrived on" : "passes straight through the axis"}.`;
    },
  },

  "d4.pol7.turning-points-max.l2": {
    Svg: ({ first = 2, second = 1 }) => (
      <ExpressionReductionWorked
        rows={turningRows(first, second)}
        title="The degree from the exponents, then one fewer"
        ariaLabel={`The exponents ${spoken(first)} and ${spoken(second)} sum to a degree of ${spoken(first + second)}, so the graph turns at most ${spoken(first + second - 1)} times`}
      />
    ),
    caption: ({ first = 2, second = 1 }) =>
      `The bound is one fewer than the degree, and the degree of a product is the sum of its factors' exponents rather than the count of brackets: $${first} + ${second} = ${first + second}$, so at most $${first + second - 1}$ turns. Counting the brackets gives $2$ here, which is the reliable way to get this wrong and always errs low.`,
  },

  "d4.pol7.zeros-from-expanded.l3": {
    Svg: ({ p = -5, q = 2 }) => (
      <ExpressionReductionWorked
        rows={expandedZeroRows(p, q)}
        title="Common factor out, quadratic split, three zeros"
        ariaLabel={`Taking x out and splitting the quadratic gives zeros at zero, ${spoken(p)} and ${spoken(q)}`}
      />
    ),
    caption: ({ p = -5, q = 2 }) =>
      `Every term carries a factor of $x$, so it comes out first and the quadratic left inside splits. All three factors are then set to zero, the common factor included: dividing it away rather than solving it is how the zero at $0$ goes missing, and it is a zero of the polynomial exactly as much as $${p}$ and $${q}$ are.`,
  },

  "d4.pol7.build-from-graph.l3": {
    Svg: ({ r0 = -5, r1 = 2, r2 = 4, touched = 0, lead = 2 }) => {
      const zeros = [r0, r1, r2];
      return (
        <ExpressionReductionWorked
          rows={buildRows(zeros, zeros[touched] ?? r0, lead)}
          title="Brackets from the zeros, exponent from the behavior"
          ariaLabel={`The three zeros give three brackets, the turning one is squared, and the leading coefficient ${spoken(lead)} goes in front`}
        />
      );
    },
    caption: ({ r0 = -5, r1 = 2, r2 = 4, touched = 0, lead = 2 }) => {
      const zeros = [r0, r1, r2];
      const turning = zeros[touched] ?? r0;
      return `Each zero becomes a bracket carrying the OPPOSITE sign, the zero the graph turns back off takes an even exponent, and least degree makes that exponent $2$. The leading coefficient $${lead}$ multiplies the finished product and moves no zero. Writing every factor once would give a cubic instead, whose ends disagree, which is the check that catches it: $x = ${turning}$ is the one that repeats.`;
    },
  },
};
