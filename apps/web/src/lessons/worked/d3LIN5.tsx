/**
 * Worked-solution figures for the D3 LIN.5 practice templates (solve an absolute-value equation).
 *
 * The distance reading is the whole node, so every figure here draws it: the standard, the two
 * points at the stated distance from it, and the equal spans between them. A learner who lost the
 * second branch is looking at the reason on the picture rather than reading about it.
 *
 * The degenerate shape is the exception and takes a different figure, because there is nothing to
 * draw a pair of: a zero right-hand side collapses the two points onto one, and a negative one
 * leaves the line empty. Drawing an empty line with the reason written on it is more honest than
 * borrowing the pair figure and marking nothing, which would read as a rendering fault.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { numStr, type WorkedSolutionVisual } from "../workedKit";
import { SolutionLineWorked } from "./d3Kit";

function signedTex(value: number): string {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}

/**
 * The letter inside the bars, which every practice draw spells `x`.
 *
 * `template_params` carries numbers only, so the letter arrives as an index: LIN.5's CHECK
 * asks its question about a weight `w`, and a figure captioned in `x` over a prompt asking
 * about `w` is the one thing a learner reading both cannot resolve. Anything unknown falls
 * back to `x` rather than throwing, as the numeric params do.
 */
const BAR_VARIABLES: readonly string[] = ["x", "w"];

function barVariable(varIndex = 0): string {
  return BAR_VARIABLES[varIndex] ?? "x";
}

/** The pair figure: two points, and the statement they came from. */
function pairFigure(
  statement: string,
  low: number,
  high: number,
  ariaLabel: string,
  title: string,
): JSX.Element {
  return (
    <SolutionLineWorked
      statement={statement}
      solved={`\\{${numStr(low)}, ${numStr(high)}\\}`}
      points={[{ at: low }, { at: high }]}
      ariaLabel={ariaLabel}
      title={title}
    />
  );
}

/**
 * The degenerate figure: one point, or none, with the reason typeset where the pair would be.
 *
 * It carries `BRICK` on the empty case and `CIVIC` on the single one, and the two are told apart by
 * the WORDS as well, because a learner who cannot separate the hues still has to be able to see
 * which of the two happened.
 *
 * ## Why it closes on the roster like every other figure here
 *
 * It used to end on the reason, so a learner who reached this reveal after saying they could not
 * solve it was handed a picture of an empty line and left to work out what to type. `{}` appeared
 * nowhere on the surface that the prompt had explicitly asked for `{}`, and the single-root draw
 * printed the bare number over the mark and never the set. The step array underneath does name
 * both, but `WorkedSolution` returns the figure and never falls through to it. The other four
 * LIN.5 figures print their roster through `pairFigure`'s `solved` slot, so this one does too.
 */
function DegenerateFigure({
  statement,
  reason,
  solved,
  root,
  ariaLabel,
  title,
}: {
  statement: string;
  reason: string;
  /** The answer, written as the solution set the prompt asked for. */
  solved: string;
  /** The one solution, or `null` when the set is empty. */
  root: number | null;
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const left = 42;
  const right = 404;
  const axisY = 92;
  const mid = (left + right) / 2;

  return (
    <svg viewBox="0 0 440 186" role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <SvgMath latex={statement} x={220} y={26} fontSize={18} color={LABEL} w={420} />
      <line x1={30} y1={44} x2={410} y2={44} stroke={LINE} strokeWidth={1} />

      <line x1={left} y1={axisY} x2={right} y2={axisY} stroke={LINE} strokeWidth={1.5} />
      {/* Centred a little right of the axis start rather than on it: this caption is about 86
          units wide, so centring it on `left` hangs it past x=0 in a wide font and clips. */}
      <text x={left + 8} y={axisY + 22} textAnchor="middle" fontSize={11} fill={SOFT}>
        the whole scale
      </text>

      {root === null ? (
        <SvgMath
          latex="\text{no point anywhere on it}"
          x={mid}
          y={axisY - 18}
          fontSize={14}
          color={BRICK}
          w={280}
        />
      ) : (
        <>
          <circle cx={mid} cy={axisY} r={6} fill={CIVIC} stroke="none" />
          <text
            x={mid}
            y={axisY - 16}
            textAnchor="middle"
            fontSize={13}
            fill={CIVIC}
            fontWeight={700}
          >
            {numStr(root)}
          </text>
        </>
      )}

      <SvgMath
        latex={reason}
        x={220}
        y={132}
        fontSize={15}
        color={root === null ? BRICK : SIGNAL}
        w={420}
      />

      <SvgMath latex={solved} x={220} y={166} fontSize={18} color={CIVIC} w={420} />
    </svg>
  );
}

export const LIN5_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** `|x - c| = k`: two points, equally far from the standard. */
  "d3.lin5.shift.l1": {
    Svg: (params): JSX.Element => {
      const centre = params.centre ?? 34;
      const distance = params.distance ?? 5;
      const v = barVariable(params.varIndex);
      return pairFigure(
        `\\lvert ${v} ${signedTex(-centre)} \\rvert = ${numStr(distance)}`,
        centre - distance,
        centre + distance,
        `Two points, each ${numStr(distance)} from ${numStr(centre)}, marked on a scale`,
        "An absolute-value equation and the two points it names",
      );
    },
    caption: (params) =>
      `A distance of $${numStr(params.distance ?? 5)}$ is available on either side of $${numStr(params.centre ?? 34)}$, which is why one equation with bars names two values and not one.`,
  },

  /** A coefficient inside the bars: the mirror is of the quantity inside, not of x. */
  "d3.lin5.coefficient.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? -2;
      const k = params.k ?? 10;
      const root = params.root ?? 4;
      const other = params.other ?? -2;
      return pairFigure(
        `\\lvert ${numStr(a)}x ${signedTex(b)} \\rvert = ${numStr(k)}`,
        Math.min(root, other),
        Math.max(root, other),
        `The two solutions of an absolute-value equation with a coefficient inside the bars`,
        "An absolute-value equation whose bars hold a coefficient",
      );
    },
    // The mirror is of the quantity inside the bars, and the generator can draw that quantity as
    // a bare multiple of x: `b` comes out zero whenever the root equals the step, on 20 of 400
    // draws. On those the roots ARE a plus-and-minus pair, so the standing caption would be
    // correcting a learner whose instinct was right. The division out of the coefficient is the
    // part that holds either way, so that is what the zero draw keeps.
    caption: (params) =>
      (params.b ?? -2) === 0
        ? `With nothing but $${numStr(params.a ?? 3)}x$ inside the bars the two solutions do come out as a plus-and-minus pair, and the coefficient still has to be divided out inside each branch before they are values of $x$.`
        : `The two solutions are mirror images of $${numStr(params.a ?? 3)}x ${signedTex(params.b ?? -2)}$ rather than of $x$, which is why they are not a plus-and-minus pair and why the coefficient has to be divided out inside each branch.`,
  },

  /** A term outside the bars: the picture is the same once the bars stand alone. */
  "d3.lin5.isolate.l2": {
    Svg: (params): JSX.Element => {
      const centre = params.centre ?? 20;
      const distance = params.distance ?? 6;
      const outside = params.outside ?? 5;
      const right = params.right ?? distance + outside;
      return pairFigure(
        `\\lvert x ${signedTex(-centre)} \\rvert + ${numStr(outside)} = ${numStr(right)} \\;\\; \\rightarrow \\;\\; \\lvert x ${signedTex(-centre)} \\rvert = ${numStr(distance)}`,
        centre - distance,
        centre + distance,
        "An absolute-value equation with the bars isolated first, then its two solutions",
        "The bars isolated, then the two points read off",
      );
    },
    caption: (params) =>
      `The $${numStr(params.right ?? 11)}$ was never the distance: only after the $${numStr(params.outside ?? 5)}$ came off do the bars stand alone and the number beside them mean how far from zero the inside sits.`,
  },

  /** The degenerate right-hand sides: one point, or none at all. */
  "d3.lin5.degenerate.l3": {
    Svg: (params): JSX.Element => {
      const empty = (params.empty ?? 1) === 1;
      const a = params.a ?? 3;
      const b = params.b ?? -6;
      const root = params.root ?? 2;
      const negative = params.negative ?? 8;
      return (
        <DegenerateFigure
          statement={
            empty
              ? `\\lvert ${numStr(a)}x ${signedTex(b)} \\rvert = -${numStr(negative)}`
              : `\\lvert ${numStr(a)}x ${signedTex(b)} \\rvert = 0`
          }
          reason={
            empty
              ? "\\text{a distance is never negative, so nothing qualifies}"
              : "\\text{only zero is zero away from zero, so both branches agree}"
          }
          solved={empty ? "\\{\\}" : `\\{${numStr(root)}\\}`}
          root={empty ? null : root}
          ariaLabel={
            empty
              ? "An absolute-value equation with a negative right-hand side, an empty scale, and the empty solution set"
              : `An absolute-value equation equal to zero, with one point marked at ${numStr(root)} and the one-element solution set`
          }
          title="An absolute-value equation whose right-hand side breaks the pair"
        />
      );
    },
    caption: (params) =>
      (params.empty ?? 1) === 1
        ? "Both branches would need the quantity inside the bars to sit a negative distance from zero, and no number does that, so the solution set is empty."
        : "The two branches say the same thing when the right-hand side is zero, because $-0$ and $0$ are one number, so the pair collapses to a single solution.",
  },

  /** A multiplier outside the bars: divide first, then the same pair. */
  "d3.lin5.scaled.l3": {
    Svg: (params): JSX.Element => {
      const scale = params.scale ?? 3;
      const centre = params.centre ?? 12;
      const distance = params.distance ?? 5;
      const right = params.right ?? scale * distance;
      return pairFigure(
        `${numStr(scale)}\\lvert x ${signedTex(-centre)} \\rvert = ${numStr(right)} \\;\\; \\rightarrow \\;\\; \\lvert x ${signedTex(-centre)} \\rvert = ${numStr(distance)}`,
        centre - distance,
        centre + distance,
        "An absolute-value equation divided by its outside multiplier, then its two solutions",
        "A multiplier divided out, then the two points read off",
      );
    },
    caption: (params) =>
      `Dividing both sides by $${numStr(params.scale ?? 3)}$ is what leaves the bars alone. Splitting into branches before that would have split on $${numStr(params.right ?? 15)}$, which is not the distance the bars report.`,
  },
};
