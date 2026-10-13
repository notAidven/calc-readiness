/**
 * Worked-solution figures for the D8 EL.6 practice templates (solving exponential and
 * logarithmic equations).
 *
 * Only one of the five shapes is a plain chain of rewrites, and it is the one that has to
 * be: taking a logarithm of both sides is a sequence, and what a learner gets wrong is the
 * ORDER of it, so `ExpressionReductionWorked` carries it with every middle row naming the
 * rule that moved the line.
 *
 * The other four are not chains, and a column would have hidden the thing each one teaches.
 * Matching bases is an alignment, so `SameBaseMatch` pulls the two exponents down into a
 * pair of chips side by side and the equality between them is a thing you can see rather
 * than a sentence you are asked to believe. Converting a logarithm is a rotation of three
 * roles, so `LogRotation` names those roles between the two forms rather than after them.
 * Rejecting a root is a TEST, and a test needs two results to be a test, so `DomainTest`
 * runs both candidates side by side and strikes one out. And a quadratic in an exponential
 * forks, so `ExpQuadraticSplit` forks: two roots, each carried back through its own
 * logarithm, in two columns that never merge until the solution set.
 *
 * The struck-out root is struck AND its panel is dashed AND its verdict is spelled out in
 * words, so none of the three colour channels is carrying the rejection alone. `BRICK` is
 * reserved for the root the domain forbids, `CIVIC` for the value that survives, and
 * `SIGNAL_DEEP` for a quantity that is merely standing on the board (the two exponents
 * waiting to be equated, the substitute's value) and is not a verdict on anybody.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for
 * each one it reads, and it RECOMPUTES what `generate()` computed rather than being handed
 * the answer: the power, the solution, the shift between the two roots and the quadratic's
 * coefficients are all derived here, so a figure cannot disagree with the prompt above it.
 */

import type { JSX } from "react";

import {
  BRICK,
  CIVIC,
  LABEL,
  LINE,
  labelHalfW,
  SIGNAL,
  SIGNAL_DEEP,
  SOFT,
  SvgMath,
} from "../svgKit";
import {
  ExpressionReductionWorked,
  frac,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";

/* -------------------------------------------------------------------------- */
/* LaTeX helpers (mirrors of the item-bank formatters)                         */
/* -------------------------------------------------------------------------- */

/** `x + 3` or `x - 3`: the shifted exponent, exactly as `generate()` writes it. */
function shiftedExponent(shift: number): string {
  return shift > 0 ? `x + ${shift}` : `x - ${-shift}`;
}

/** The same shift read aloud, for an `aria-label`. */
function shiftedSpoken(shift: number): string {
  return shift > 0 ? `x plus ${shift}` : `x minus ${-shift}`;
}

/** The argument of the single logarithm: `x`, or `x + s` on the shifted draws. */
function logArgument(kind: number, shift: number): string {
  return kind === 1 ? `x + ${shift}` : "x";
}

/** Base 10 is written bare, as every textbook writes the common logarithm. */
function logToken(base: number): string {
  return base === 10 ? "\\log" : `\\log_{${base}}`;
}

/* -------------------------------------------------------------------------- */
/* L1: the two exponents, pulled down and set beside each other                */
/* -------------------------------------------------------------------------- */

/** Where the two sides of the matched equation stand, and where their chips land. */
const SIDE_X = { left: 132, right: 308 } as const;
const CHIP = { w: 88, h: 28 } as const;

/**
 * One base on both sides, with the two exponents lifted out into a pair of chips.
 *
 * The chips are the figure. "The exponents must be equal" is a claim about two pieces of
 * one line that a learner has to find before they can compare them, and a figure that only
 * reprints the line has left them exactly where they were. Pulling each exponent straight
 * down from the side it came from puts the comparison on its own row, where it is one
 * equation with nothing else in it.
 *
 * The chips are `SIGNAL_DEEP` rather than green: nothing has been decided at that row, and
 * the correctness palette would be reporting a verdict on a step that is still in progress.
 */
function SameBaseMatch({
  base,
  exponent,
  shift,
}: {
  base: number;
  exponent: number;
  shift: number;
}): JSX.Element {
  const power = base ** exponent;
  const solution = exponent - shift;
  const shown = shiftedExponent(shift);

  return (
    <svg
      viewBox="0 0 440 274"
      role="img"
      aria-label={`Both sides written as powers of ${spoken(base)}, so the exponents ${shiftedSpoken(shift)} and ${spoken(exponent)} must be equal, which gives x equals ${spoken(solution)}`}
    >
      <title>Both sides on one base, so their exponents have to match</title>

      <SvgMath
        latex={`${base}^{${shown}} = ${power}`}
        x={220}
        y={26}
        fontSize={18}
        color={LABEL}
        w={430}
      />
      <line x1={30} y1={48} x2={410} y2={48} stroke={LINE} strokeWidth={1} />

      <SvgMath
        latex={`${power} = ${base}^{${exponent}}`}
        x={220}
        y={74}
        fontSize={16}
        color={SIGNAL}
        w={430}
      />

      <SvgMath
        latex={`${base}^{${shown}}`}
        x={SIDE_X.left}
        y={118}
        fontSize={18}
        color={LABEL}
        w={170}
      />
      <SvgMath latex="=" x={220} y={118} fontSize={18} color={LABEL} w={44} />
      <SvgMath
        latex={`${base}^{${exponent}}`}
        x={SIDE_X.right}
        y={118}
        fontSize={18}
        color={LABEL}
        w={170}
      />

      {/* Each exponent comes down from the side it belongs to, so the pairing is shown. */}
      {[SIDE_X.left, SIDE_X.right].map((x) => (
        <line
          key={`drop-${x}`}
          x1={x}
          y1={138}
          x2={x}
          y2={160}
          stroke={SIGNAL_DEEP}
          strokeWidth={1.2}
          strokeDasharray="4 4"
        />
      ))}

      {[
        { x: SIDE_X.left, latex: shown },
        { x: SIDE_X.right, latex: `${exponent}` },
      ].map((chip) => (
        <g key={`chip-${chip.latex}`}>
          <rect
            x={chip.x - CHIP.w / 2}
            y={176 - CHIP.h / 2}
            width={CHIP.w}
            height={CHIP.h}
            rx={7}
            fill={SIGNAL_DEEP}
            fillOpacity={0.14}
            stroke={SIGNAL_DEEP}
            strokeWidth={1.4}
          />
          <SvgMath
            latex={chip.latex}
            x={chip.x}
            y={176}
            fontSize={16}
            color={SIGNAL_DEEP}
            w={CHIP.w}
          />
        </g>
      ))}
      <SvgMath latex="=" x={220} y={176} fontSize={16} color={LABEL} w={44} />

      <text x={220} y={212} textAnchor="middle" fontSize={11} fill={SOFT}>
        one base on both sides, so the exponents match
      </text>

      <line x1={30} y1={230} x2={410} y2={230} stroke={LINE} strokeWidth={1} />

      <SvgMath
        latex={`x = ${solution}`}
        x={220}
        y={254}
        fontSize={18}
        color={CIVIC}
        w={430}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* L2a: the two forms, with the three roles named between them                 */
/* -------------------------------------------------------------------------- */

/** Where the three role columns stand, shared by their words and their values. */
const ROLE_X = [92, 220, 348] as const;

/** A row of the solving tail below the divider. */
interface TailRow {
  latex: string;
  color: string;
  fontSize: number;
}

/**
 * A logarithm turned into the power it stands for, with the roles named in between.
 *
 * The conversion is a rotation, not a rewrite: the same three numbers stay on the board and
 * only their places change, so the only thing that can go wrong is putting one of them
 * where another belongs. The role band is printed in the order the EXPONENTIAL form uses,
 * between the two forms, so the move each number makes is visible before it is made.
 *
 * The tail below the divider is the arithmetic, and it is shorter by a row on the unshifted
 * draws, because there the conversion has already finished the problem and an extra row
 * would be claiming a step nobody took.
 */
function LogRotation({
  base,
  exponent,
  argument,
  tail,
  ariaLabel,
}: {
  base: number;
  exponent: number;
  argument: string;
  tail: readonly TailRow[];
  ariaLabel: string;
}): JSX.Element {
  const firstTailY = 150;
  const tailPitch = 34;
  const height = firstTailY + (tail.length - 1) * tailPitch + 24;

  const roles: readonly { word: string; latex: string; x: number }[] = [
    { word: "base", latex: `${base}`, x: ROLE_X[0] },
    { word: "exponent", latex: `${exponent}`, x: ROLE_X[1] },
    { word: "argument", latex: argument, x: ROLE_X[2] },
  ];

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>A logarithm rewritten as the power it stands for</title>

      <SvgMath
        latex={`\\log_{${base}}(${argument}) = ${exponent}`}
        x={220}
        y={24}
        fontSize={18}
        color={LABEL}
        w={430}
      />

      {roles.map((role) => (
        <g key={role.word}>
          <text x={role.x} y={56} textAnchor="middle" fontSize={11} fill={SOFT}>
            {role.word}
          </text>
          <SvgMath
            latex={role.latex}
            x={role.x}
            y={80}
            fontSize={16}
            color={SIGNAL}
            w={116}
          />
        </g>
      ))}

      <text x={220} y={110} textAnchor="middle" fontSize={11} fill={SOFT}>
        the exponent moves up onto the base
      </text>

      <line x1={30} y1={126} x2={410} y2={126} stroke={LINE} strokeWidth={1} />

      {tail.map((row, index) => (
        <SvgMath
          key={row.latex}
          latex={row.latex}
          x={220}
          y={firstTailY + index * tailPitch}
          fontSize={row.fontSize}
          color={row.color}
          w={430}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* L2b: rows for the shape that has to reach for a logarithm                   */
/* -------------------------------------------------------------------------- */

/**
 * Take the logarithm, bring the exponent down, divide. The two middle rows name their rule
 * beside what the rule produced, because the failure here is doing the division before the
 * power rule has put the exponent somewhere a division can reach.
 *
 * The last two rows are the same fraction twice, once in logarithms and once in the numbers
 * they read as, which is what stops the decimal arriving from nowhere.
 */
function takeLogRows(base: number, target: number): ReductionRow[] {
  const value = Math.log(target) / Math.log(base);
  const logTarget = Math.log10(target).toFixed(6);
  const logBase = Math.log10(base).toFixed(6);
  return [
    { tokens: [{ text: `${base}^{x} = ${target}` }] },
    {
      tokens: [
        {
          text: `\\text{log both sides}\\;\\Rightarrow\\; \\log(${base}^{x}) = \\log ${target}`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [
        {
          text: `\\text{power rule}\\;\\Rightarrow\\; x \\log ${base} = \\log ${target}`,
          color: SIGNAL,
        },
      ],
    },
    { tokens: [{ text: `x = ${frac(`\\log ${target}`, `\\log ${base}`)}` }] },
    {
      tokens: [
        {
          text: `x = ${frac(logTarget, logBase)} \\approx ${value.toFixed(3)}`,
          color: CIVIC,
        },
      ],
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* L3a: both candidates tested, one of them struck out                         */
/* -------------------------------------------------------------------------- */

/** The two test panels: same size, same content slots, one dashed and one not. */
const PANEL = { w: 194, h: 120, top: 138 } as const;
const PANEL_X = { kept: 18, rejected: 228 } as const;

/**
 * A line of math with a rule drawn THROUGH it, for a candidate the domain refuses.
 *
 * The rule is an SVG `<line>`, not the `strike` flag `SvgMath` and `EqToken` both offer,
 * because that flag sets CSS `text-decoration` on a flex container and a decoration does not
 * propagate into the atomic inline-level boxes KaTeX lays its glyphs out in. Measured in
 * Chromium rather than assumed: the flagged label renders with no line over it at all, which
 * is also true of `d5.rat6`'s struck candidate row, and a rejection that is invisible is a
 * rejection carried by the red alone.
 *
 * `labelHalfW` estimates the ink from the LaTeX, with `\log` spelled out first because it
 * scores any macro as one glyph and this one sets three. The estimate runs slightly long,
 * which is what a strike should do anyway, and it is clamped so it cannot leave the panel.
 */
function StruckMath({
  latex,
  cx,
  y,
  fontSize,
  halfLimit,
}: {
  latex: string;
  cx: number;
  y: number;
  fontSize: number;
  halfLimit: number;
}): JSX.Element {
  const halfW = Math.min(
    labelHalfW(latex.replace(/\\log/g, "log"), fontSize) + 3,
    halfLimit,
  );
  return (
    <g>
      <SvgMath
        latex={latex}
        x={cx}
        y={y}
        fontSize={fontSize}
        color={BRICK}
        w={halfLimit * 2}
      />
      <line
        data-strike=""
        x1={cx - halfW}
        y1={y}
        x2={cx + halfW}
        y2={y}
        stroke={BRICK}
        strokeWidth={1.5}
      />
    </g>
  );
}

/**
 * The quadratic's two roots, each put back into the ORIGINAL equation.
 *
 * A rejection is a comparison, so both candidates get the same panel with the same slots
 * and the difference between them is left to the arguments themselves. The rejected panel
 * is marked three ways that do not depend on each other: its math is struck through, its
 * border is dashed rather than solid, and its verdict says "undefined" in words. Any one of
 * the three would carry it for a learner who cannot separate the hues, which is the point.
 */
function DomainTest({
  base,
  exponent,
  kept,
  rejected,
}: {
  base: number;
  exponent: number;
  kept: number;
  rejected: number;
}): JSX.Element {
  const shift = kept - rejected;
  const log = logToken(base);

  return (
    <svg
      viewBox="0 0 440 320"
      role="img"
      aria-label={`Testing ${spoken(kept)} leaves both logarithm arguments positive, while testing negative ${spoken(rejected)} asks for a logarithm of a negative number, so the solution set holds ${spoken(kept)} alone`}
    >
      <title>Each candidate root put back into the original equation</title>

      <SvgMath
        latex={`${log} x + ${log}(x - ${shift}) = ${exponent}`}
        x={220}
        y={26}
        fontSize={17}
        color={LABEL}
        w={430}
      />
      <SvgMath
        latex={`\\text{condense and factor}\\;\\Rightarrow\\; (x - ${kept})(x + ${rejected}) = 0`}
        x={220}
        y={56}
        fontSize={15}
        color={SIGNAL}
        w={430}
      />
      <SvgMath
        latex={`x = ${kept} \\quad \\text{or} \\quad x = -${rejected}`}
        x={220}
        y={86}
        fontSize={16}
        color={LABEL}
        w={430}
      />

      <line x1={30} y1={108} x2={410} y2={108} stroke={LINE} strokeWidth={1} />

      <text x={220} y={128} textAnchor="middle" fontSize={11} fill={SOFT}>
        put each candidate back into the original equation
      </text>

      {/* The root that survives: solid border, nothing struck. */}
      <rect
        x={PANEL_X.kept}
        y={PANEL.top}
        width={PANEL.w}
        height={PANEL.h}
        rx={8}
        fill="none"
        stroke={CIVIC}
        strokeWidth={1.4}
      />
      <SvgMath
        latex={`x = ${kept}`}
        x={PANEL_X.kept + PANEL.w / 2}
        y={162}
        fontSize={16}
        color={LABEL}
        w={PANEL.w}
      />
      <SvgMath
        latex={`${log}(${kept})`}
        x={PANEL_X.kept + PANEL.w / 2}
        y={192}
        fontSize={13}
        color={CIVIC}
        w={PANEL.w}
      />
      <SvgMath
        latex={`${log}(${kept} - ${shift}) = ${log}(${rejected})`}
        x={PANEL_X.kept + PANEL.w / 2}
        y={218}
        fontSize={13}
        color={CIVIC}
        w={PANEL.w}
      />
      <text
        x={PANEL_X.kept + PANEL.w / 2}
        y={246}
        textAnchor="middle"
        fontSize={11}
        fill={CIVIC}
      >
        both arguments positive
      </text>

      {/* The root the domain forbids: dashed border, struck math, and a named verdict. */}
      <rect
        x={PANEL_X.rejected}
        y={PANEL.top}
        width={PANEL.w}
        height={PANEL.h}
        rx={8}
        fill="none"
        stroke={BRICK}
        strokeWidth={1.4}
        strokeDasharray="6 4"
      />
      <SvgMath
        latex={`x = -${rejected}`}
        x={PANEL_X.rejected + PANEL.w / 2}
        y={162}
        fontSize={16}
        color={LABEL}
        w={PANEL.w}
      />
      <StruckMath
        latex={`${log}(-${rejected})`}
        cx={PANEL_X.rejected + PANEL.w / 2}
        y={192}
        fontSize={13}
        halfLimit={PANEL.w / 2 - 10}
      />
      <StruckMath
        latex={`${log}(-${rejected} - ${shift}) = ${log}(-${kept})`}
        cx={PANEL_X.rejected + PANEL.w / 2}
        y={218}
        fontSize={13}
        halfLimit={PANEL.w / 2 - 10}
      />
      <text
        x={PANEL_X.rejected + PANEL.w / 2}
        y={246}
        textAnchor="middle"
        fontSize={11}
        fill={BRICK}
      >
        a negative argument, undefined
      </text>

      <line x1={30} y1={274} x2={410} y2={274} stroke={LINE} strokeWidth={1} />

      <SvgMath
        latex={`\\left\\{${kept}\\right\\}`}
        x={220}
        y={298}
        fontSize={18}
        color={CIVIC}
        w={430}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* L3b: the substitution, and the fork it opens                                */
/* -------------------------------------------------------------------------- */

/**
 * A quadratic in an exponential, and the two logarithms it comes back through.
 *
 * The figure forks because the algebra forks. Both roots are carried down their own column,
 * one row at a time and side by side, so the mistake this shape invites, stopping at $u$ and
 * handing back the factors, has a whole row of the picture that it visibly has not reached.
 *
 * The `u` row is `SIGNAL_DEEP`: a value of the substitute is a real quantity standing on the
 * board, but it is not a value of $x$ and it is not yet anybody's answer.
 */
function ExpQuadraticSplit({
  first,
  second,
}: {
  first: number;
  second: number;
}): JSX.Element {
  const sum = first + second;
  const product = first * second;
  const branches: readonly { x: number; root: number }[] = [
    { x: SIDE_X.left, root: first },
    { x: SIDE_X.right, root: second },
  ];

  return (
    <svg
      viewBox="0 0 440 314"
      role="img"
      aria-label={`Substituting u for e to the x gives a quadratic whose roots are ${spoken(first)} and ${spoken(second)}, and the natural logarithm of each one gives the two solutions`}
    >
      <title>A quadratic in an exponential, and the two logarithms it returns</title>

      <SvgMath
        latex={`e^{2x} - ${sum}e^{x} + ${product} = 0`}
        x={220}
        y={26}
        fontSize={18}
        color={LABEL}
        w={430}
      />
      <SvgMath
        latex="e^{2x} = \left(e^{x}\right)^{2}"
        x={220}
        y={58}
        fontSize={16}
        color={SIGNAL}
        w={430}
      />
      <SvgMath
        latex={`\\text{let } u = e^{x}:\\;\\; u^{2} - ${sum}u + ${product} = 0`}
        x={220}
        y={88}
        fontSize={17}
        color={LABEL}
        w={430}
      />

      <line x1={30} y1={112} x2={410} y2={112} stroke={LINE} strokeWidth={1} />

      <SvgMath
        latex={`(u - ${first})(u - ${second}) = 0`}
        x={220}
        y={136}
        fontSize={17}
        color={SIGNAL}
        w={430}
      />

      {branches.map((branch) => (
        <g key={`branch-${branch.root}`}>
          <line x1={220} y1={152} x2={branch.x} y2={164} stroke={LINE} strokeWidth={1} />
          <SvgMath
            latex={`u = ${branch.root}`}
            x={branch.x}
            y={180}
            fontSize={16}
            color={SIGNAL_DEEP}
            w={170}
          />
          <line
            x1={branch.x}
            y1={194}
            x2={branch.x}
            y2={200}
            stroke={LINE}
            strokeWidth={1}
          />
          <SvgMath
            latex={`e^{x} = ${branch.root}`}
            x={branch.x}
            y={214}
            fontSize={16}
            color={LABEL}
            w={170}
          />
          <line
            x1={branch.x}
            y1={228}
            x2={branch.x}
            y2={234}
            stroke={LINE}
            strokeWidth={1}
          />
          <SvgMath
            latex={`x = \\ln(${branch.root})`}
            x={branch.x}
            y={248}
            fontSize={16}
            color={CIVIC}
            w={170}
          />
        </g>
      ))}

      <line x1={30} y1={268} x2={410} y2={268} stroke={LINE} strokeWidth={1} />

      <SvgMath
        latex={`\\left\\{\\ln(${first}),\\, \\ln(${second})\\right\\}`}
        x={220}
        y={292}
        fontSize={18}
        color={CIVIC}
        w={430}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const EL6_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d8.el6.same-base.l1": {
    Svg: ({ base = 2, exponent = 5, shift = 1 }) => (
      <SameBaseMatch base={base} exponent={exponent} shift={shift} />
    ),
    caption: ({ base = 2, exponent = 5, shift = 1 }) =>
      `Both sides are powers of $${base}$ once $${base ** exponent}$ is written as $${base}^{${exponent}}$. A power of $${base}$ takes each value exactly once, so the two exponents cannot be different numbers: $${shiftedExponent(shift)} = ${exponent}$, which leaves $x = ${exponent - shift}$.`,
  },

  "d8.el6.log-single.l2": {
    Svg: ({ base = 2, exponent = 5, kind = 0, shift = 0 }) => {
      const power = base ** exponent;
      const argument = logArgument(kind, shift);
      const tail: TailRow[] =
        kind === 1
          ? [
              {
                latex: `${base}^{${exponent}} = ${argument}`,
                color: LABEL,
                fontSize: 18,
              },
              { latex: `${power} = ${argument}`, color: SIGNAL, fontSize: 16 },
              {
                latex: `x = ${power} - ${shift} = ${power - shift}`,
                color: CIVIC,
                fontSize: 18,
              },
            ]
          : [
              { latex: `${base}^{${exponent}} = x`, color: LABEL, fontSize: 18 },
              {
                latex: `x = ${base}^{${exponent}} = ${power}`,
                color: CIVIC,
                fontSize: 18,
              },
            ];
      return (
        <LogRotation
          base={base}
          exponent={exponent}
          argument={argument}
          tail={tail}
          ariaLabel={
            kind === 1
              ? `The logarithm converts to ${spoken(base)} to the ${spoken(exponent)} equals x plus ${spoken(shift)}, and undoing the shift gives x equals ${spoken(power - shift)}`
              : `The logarithm converts to ${spoken(base)} to the ${spoken(exponent)} equals x, so x equals ${spoken(power)}`
          }
        />
      );
    },
    caption: ({ base = 2, exponent = 5, kind = 0, shift = 0 }) => {
      const power = base ** exponent;
      const argument = logArgument(kind, shift);
      return kind === 1
        ? `A logarithm is already naming an exponent, so nothing has to be solved for before it converts: $${base}^{${exponent}} = ${argument}$, with no logarithm left in it. Working out the power gives $${power} = ${argument}$, and taking the shift back off leaves $x = ${power - shift}$. The argument is then $${power}$, which is positive, so the solution stands.`
        : `A logarithm is already naming an exponent, so nothing has to be solved for before it converts: $${base}^{${exponent}} = x$, with no logarithm left in it. Working the power out finishes the problem, and $${power}$ is positive, so it is inside the logarithm's domain.`;
    },
  },

  "d8.el6.take-log.l2": {
    Svg: ({ base = 5, target = 40 }) => (
      <ExpressionReductionWorked
        rows={takeLogRows(base, target)}
        title="A logarithm taken of both sides, then the exponent divided out"
        ariaLabel={`Taking a logarithm of both sides brings the exponent down in front of log ${spoken(base)}, and dividing leaves about ${(Math.log(target) / Math.log(base)).toFixed(3)}`}
      />
    ),
    caption: ({ base = 5, target = 40 }) =>
      `No power of $${base}$ lands on $${target}$, so there are no matching bases to read the exponent off and a logarithm has to be applied to BOTH sides instead. The power rule then brings the exponent down in front, where a division can reach it: $x = \\tfrac{\\log ${target}}{\\log ${base}} \\approx ${(Math.log(target) / Math.log(base)).toFixed(3)}$.`,
  },

  "d8.el6.extraneous.l3": {
    Svg: ({ base = 10, exponent = 2, kept = 20, rejected = 5 }) => (
      <DomainTest base={base} exponent={exponent} kept={kept} rejected={rejected} />
    ),
    caption: ({ base = 10, kept = 20, rejected = 5 }) => {
      const log = logToken(base);
      return `Condensing and converting leaves a quadratic, and a quadratic hands back two roots whatever the question was. Only the ORIGINAL equation decides which of them counts: at $x = -${rejected}$ the first term asks for $${log}(-${rejected})$, and a logarithm of a negative number does not exist, so that root is thrown out. At $x = ${kept}$ both arguments, $${kept}$ and $${rejected}$, are positive, so the solution set is $\\{${kept}\\}$.`;
    },
  },

  "d8.el6.exp-quadratic.l3": {
    Svg: ({ first = 2, second = 3 }) => <ExpQuadraticSplit first={first} second={second} />,
    caption: ({ first = 2, second = 3 }) =>
      `$e^{2x}$ is $\\left(e^{x}\\right)^{2}$, so the equation is an ordinary quadratic in the one quantity $e^{x}$. Its factors give $e^{x} = ${first}$ and $e^{x} = ${second}$, and both are positive, which is the only thing an exponential can be. Each of them is still a statement about $e^{x}$ rather than about $x$, so the natural logarithm of each is what finishes it: $\\{\\ln(${first}), \\ln(${second})\\}$.`,
  },
};
