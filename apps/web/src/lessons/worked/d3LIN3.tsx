/**
 * Worked-solution figures for the D3 LIN.3 practice templates (rearrange a formula, then use it).
 *
 * Every one of these is TWO reductions rather than one, and keeping them apart is the point: the
 * rule is re-pointed first, in names only, and the measurements go in afterwards. A single column
 * running from the rule to the number would let a learner read the whole thing as arithmetic and
 * miss that not one line of the first half depended on a value.
 *
 * So each figure is one column with a rule between the halves: `SIGNAL` on the rearranging moves,
 * a divider, then `LABEL` on the substitution and `CIVIC` on the value. The divider is the figure's
 * whole argument, which is why it is drawn rather than described.
 *
 * The prompts here ask for a number and the answer key is a number, which is a measured limitation
 * of the checker rather than a claim that the number is the skill (see `nodes/LIN.3/index.ts`).
 * These figures are where the rearrangement is shown, so the reveal teaches the skill the item can
 * only measure indirectly.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import {
  DISPLAY_FRACTION_ROW_H,
  numStr,
  PLAIN_ROW_H,
  ROW_GAP,
  type WorkedSolutionVisual,
} from "../workedKit";

/** One line of a rearrangement or a substitution. */
interface Line {
  latex: string;
  colour: string;
}

/** Ink top of the first row, which clears the `re-point the rule` caption on the line above. */
const TOP_INK = 20;

/** Room below the divider for the `now the measurements` caption before the first row's ink. */
const LABEL_BAND = 20;

const BOTTOM_PAD = 12;

/**
 * How much vertical room a row's typeset maths needs, in user units.
 *
 * `workedKit`'s own numbers, imported rather than restated: a one-line row is 28 and a display
 * fraction about twice that. Those were measured at `fontSize` 18 and these figures set 17, so
 * the reserved boxes are a shade generous here, which errs towards clearance.
 *
 * Rows here used to sit on a fixed pitch of 30, which is a claim that every row is the same
 * height. Four of the five LIN.3 figures put a `\dfrac` directly under a plain row, and the
 * fraction's numerator was drawn into the line above it.
 */
function rowInkHeight(line: Line): number {
  return line.latex.includes("dfrac") ? DISPLAY_FRACTION_ROW_H : PLAIN_ROW_H;
}

interface Placed {
  line: Line;
  /** The row's vertical CENTRE, which is what `SvgMath` takes. */
  y: number;
  ink: number;
}

/**
 * Stack rows on their own ink heights: each centre sits a half-row plus one gap below the
 * previous one, so an all-one-line half reproduces the old 30 pitch and only the halves
 * carrying a fraction grow.
 */
function stack(lines: readonly Line[], firstInkTop: number): Placed[] {
  let above: Placed | undefined;
  return lines.map((line) => {
    const ink = rowInkHeight(line);
    const y = above ? above.y + above.ink / 2 + ROW_GAP + ink / 2 : firstInkTop + ink / 2;
    above = { line, y, ink };
    return above;
  });
}

/** Where a half's ink ends, or `fallback` when it drew no rows. */
function inkBottom(placed: readonly Placed[], fallback: number): number {
  const last = placed.at(-1);
  return last ? last.y + last.ink / 2 : fallback;
}

/**
 * The two halves of a literal-equation solution, separated by a rule.
 *
 * The divider is not decoration: the claim the whole node rests on is that the moves above it need
 * no measurement, and a learner who cannot see where the numbers arrived cannot check that claim.
 */
function TwoHalvesWorked({
  rearrange,
  substitute,
  ariaLabel,
  title,
}: {
  rearrange: readonly Line[];
  substitute: readonly Line[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const rearranged = stack(rearrange, TOP_INK);
  const dividerY = inkBottom(rearranged, TOP_INK) + ROW_GAP;
  const substituted = stack(substitute, dividerY + LABEL_BAND);
  const height = inkBottom(substituted, dividerY) + BOTTOM_PAD;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <text x={30} y={14} fontSize={10} fill={SOFT}>
        re-point the rule
      </text>
      {rearranged.map(({ line, y }) => (
        <SvgMath
          key={`re-${line.latex}`}
          latex={line.latex}
          x={220}
          y={y}
          fontSize={17}
          color={line.colour}
          w={420}
        />
      ))}

      <line
        x1={30}
        y1={dividerY}
        x2={410}
        y2={dividerY}
        stroke={LINE}
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <text x={30} y={dividerY + 14} fontSize={10} fill={SOFT}>
        now the measurements
      </text>

      {substituted.map(({ line, y }) => (
        <SvgMath
          key={`sub-${line.latex}`}
          latex={line.latex}
          x={220}
          y={y}
          fontSize={17}
          color={line.colour}
          w={420}
        />
      ))}
    </svg>
  );
}

export const LIN3_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** `P = 2l + 2w` for `w`: one subtraction, one division, then the measurements. */
  "d3.lin3.kerb-width.l1": {
    Svg: (params): JSX.Element => {
      const width = params.width ?? 9;
      const length = params.length ?? 14;
      const perimeter = params.perimeter ?? 46;
      return (
        <TwoHalvesWorked
          rearrange={[
            { latex: "P = 2l + 2w", colour: LABEL },
            { latex: "P - 2l = 2w", colour: SIGNAL },
            { latex: "w = \\dfrac{P - 2l}{2}", colour: SIGNAL },
          ]}
          substitute={[
            {
              latex: `w = \\dfrac{${numStr(perimeter)} - ${numStr(2 * length)}}{2}`,
              colour: LABEL,
            },
            { latex: `w = ${numStr(width)}`, colour: CIVIC },
          ]}
          ariaLabel={`Rearranging the curb rule for the width, then using a curb of ${numStr(perimeter)} and a length of ${numStr(length)}`}
          title="The curb rule re-pointed at the width, then used"
        />
      );
    },
    caption: () =>
      "Not one move above the line needed a measurement, which is what makes the rearranged rule reusable on any floor rather than on this one.",
  },

  /**
   * `B = c + t - m` for `t`: the subtracted term is the one that changes sign.
   *
   * The melt loss is written the way the QUESTION wrote it, which is not the same on the two
   * surfaces this figure serves. A practice draw names it `m` and gives its value in the
   * sentence after. LIN.3's check bakes it in as a literal, `B = c + t - 2`, and reaches this
   * figure through `worked_solution_params`, which carry no `namedLoss`. Hardcoding the `m` row
   * put a symbol the check never mentions on the one surface a stuck learner reads, and the
   * figure REPLACES the pack's own correct step cards, so it was the only rearrangement they
   * saw. `namedLoss` is what keeps the rearranged rule the question's own rule.
   */
  "d3.lin3.melt-tin.l2": {
    Svg: (params): JSX.Element => {
      const tin = params.tin ?? 15;
      const copper = params.copper ?? 44;
      const loss = params.loss ?? 2;
      const bar = params.bar ?? 57;
      const m = (params.namedLoss ?? 0) === 1 ? "m" : numStr(loss);
      return (
        <TwoHalvesWorked
          rearrange={[
            { latex: `B = c + t - ${m}`, colour: LABEL },
            { latex: `B - c = t - ${m}`, colour: SIGNAL },
            { latex: `t = B - c + ${m}`, colour: SIGNAL },
          ]}
          substitute={[
            {
              latex: `t = ${numStr(bar)} - ${numStr(copper)} + ${numStr(loss)}`,
              colour: LABEL,
            },
            { latex: `t = ${numStr(tin)}`, colour: CIVIC },
          ]}
          ariaLabel={`Rearranging the crucible rule for the tin, then using a bar of ${numStr(bar)} from ${numStr(copper)} of copper`}
          title="The crucible rule re-pointed at the tin, then used"
        />
      );
    },
    caption: () =>
      "The melt loss is SUBTRACTED in the rule, so isolating past it adds it. The sign of a move is the sign of what it undoes, never the sign written in the rule.",
  },

  /** `C = np + f` for `n`: the last division is by a name rather than a digit. */
  "d3.lin3.duty-count.l2": {
    Svg: (params): JSX.Element => {
      const count = params.count ?? 8;
      const price = params.price ?? 5;
      const fixed = params.fixed ?? 6;
      const total = params.total ?? 46;
      return (
        <TwoHalvesWorked
          rearrange={[
            { latex: "C = np + f", colour: LABEL },
            { latex: "C - f = np", colour: SIGNAL },
            { latex: "n = \\dfrac{C - f}{p}", colour: SIGNAL },
          ]}
          substitute={[
            {
              latex: `n = \\dfrac{${numStr(total)} - ${numStr(fixed)}}{${numStr(price)}}`,
              colour: LABEL,
            },
            { latex: `n = ${numStr(count)}`, colour: CIVIC },
          ]}
          ariaLabel={`Rearranging the duty rule for the count, then using a bill of ${numStr(total)} at ${numStr(price)} an ingot`}
          title="The duty rule re-pointed at the count, then used"
        />
      );
    },
    caption: () =>
      "The last division is by $p$, a quantity rather than a number, and it works without knowing what $p$ turns out to be. That is the whole difference from solving an equation.",
  },

  /** `A = h(a+b)/2` for `a`: the divisor is outermost, so it goes first. */
  "d3.lin3.mould-face.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 12;
      const b = params.b ?? 6;
      const h = params.h ?? 4;
      const area = params.area ?? 36;
      return (
        <TwoHalvesWorked
          rearrange={[
            { latex: "A = \\dfrac{h(a + b)}{2}", colour: LABEL },
            { latex: "2A = h(a + b)", colour: SIGNAL },
            { latex: "\\dfrac{2A}{h} = a + b", colour: SIGNAL },
            { latex: "a = \\dfrac{2A}{h} - b", colour: SIGNAL },
          ]}
          substitute={[
            {
              latex: `a = \\dfrac{2(${numStr(area)})}{${numStr(h)}} - ${numStr(b)}`,
              colour: LABEL,
            },
            { latex: `a = ${numStr(a)}`, colour: CIVIC },
          ]}
          ariaLabel={`Rearranging the mould rule for one edge, then using an area of ${numStr(area)} and a height of ${numStr(h)}`}
          title="A rule with a group under a divisor, re-pointed and used"
        />
      );
    },
    caption: () =>
      "Three wrappings come off in the reverse of the order they went on: the divisor, then the multiplier outside the bracket, then the term inside it.",
  },

  /** The assay rule: a subtracted term INSIDE the group, so both order and sign matter. */
  "d3.lin3.assay-edge.l3": {
    Svg: (params): JSX.Element => {
      const q = params.q ?? 22;
      const r = params.r ?? 4;
      const k = params.k ?? 3;
      const s = params.s ?? 27;
      const divisor = params.divisor ?? 2;
      return (
        <TwoHalvesWorked
          rearrange={[
            { latex: `S = \\dfrac{k(q - r)}{${numStr(divisor)}}`, colour: LABEL },
            { latex: `${numStr(divisor)}S = k(q - r)`, colour: SIGNAL },
            { latex: `\\dfrac{${numStr(divisor)}S}{k} = q - r`, colour: SIGNAL },
            { latex: `q = \\dfrac{${numStr(divisor)}S}{k} + r`, colour: SIGNAL },
          ]}
          substitute={[
            {
              latex: `q = \\dfrac{${numStr(divisor)}(${numStr(s)})}{${numStr(k)}} + ${numStr(r)}`,
              colour: LABEL,
            },
            { latex: `q = ${numStr(q)}`, colour: CIVIC },
          ]}
          ariaLabel={`Rearranging the assay rule for the charge, then using a reading of ${numStr(s)}`}
          title="A subtracted term inside a divided group, re-pointed and used"
        />
      );
    },
    caption: () =>
      "The residue is subtracted inside the bracket, so the last move ADDS it. Getting the order right and getting that sign right are two separate things and this rule needs both.",
  },
};
