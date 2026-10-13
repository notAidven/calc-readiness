/**
 * The one figure D3's worked solutions are built around: a scale with the answer drawn on it.
 *
 * Every node in this domain answers with a SET of numbers rather than a single value, and the
 * shape of that set is the whole content of three of the five nodes: a bounded band, a ray, a
 * union of two rays, or a pair of isolated points. A column of algebra steps cannot show a shape,
 * and it is the shape a learner gets wrong, so the reveal draws it.
 *
 * ## Why the endpoint marks are what they are
 *
 * An included endpoint is a FILLED disc and an excluded one is a hollow ring, which is the
 * standard notation and, more to the point here, is not a hue: the two ends of one interval can
 * differ, so any carrier that were shared with the correctness palette would collide with itself.
 * The shaded span carries `CIVIC` because a revealed worked solution is showing the right answer
 * and nothing else on the figure is a verdict on anybody.
 *
 * ## Why the caption is not the answer
 *
 * Each node's caption says what SHAPE the answer has and why, in words, because the interval is
 * already written on the figure and repeating it costs a line and teaches nothing. The reveal
 * passage above it states the value.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SOFT, SvgMath } from "../svgKit";

/** One drawn piece of a solution set: a span between two bounds, or a single point. */
export interface SolutionPiece {
  /** The finite lower bound, or `null` for a ray running to negative infinity. */
  from: number | null;
  /** The finite upper bound, or `null` for a ray running to positive infinity. */
  to: number | null;
  /** Whether each finite end is part of the set. Ignored on an infinite end. */
  fromClosed?: boolean;
  toClosed?: boolean;
}

/** A single value in the solution set, drawn as a marked point rather than a span. */
export interface SolutionPoint {
  at: number;
  /**
   * What to print over the mark, as LATEX, when the value's own decimal is not what the
   * answer is. A root of `1/3` is named by the fraction and not by `0.33`, and a fraction is
   * math, so this is typeset rather than written into the `<text>` the plain marks use.
   */
  label?: string;
}

const LEFT = 42;
const RIGHT = 404;
const AXIS_Y = 92;

/**
 * A tick's number as a reader can take it in.
 *
 * The ticks were printed with `{value}`, which is a JavaScript number rendered at full
 * precision, and a solution that is not a terminating decimal comes out as sixteen digits:
 * `d4.pol4.formula.l3` at `a = 3, p = 1` put `0.3333333333333333` under a point already
 * labelled `1/3`, and the window bound derived from it printed `2.3333333333333335` beside
 * it — two seventeen-character labels 33px apart, overlapping by 32.7px.
 *
 * A marked point no longer reaches this at all: the tick list below is the window's ends and
 * the PIECE bounds, so the `1/3` case is gone rather than rounded. What this still guards is a
 * fractional piece bound, and the window ends, which are snapped to whole numbers before the
 * padding is added and so pass through it unchanged.
 */
function tickText(value: number): string {
  return String(Number(value.toFixed(2)));
}

/**
 * A number line carrying the solution set, under the statement being solved.
 *
 * The window is derived from the pieces rather than passed in, so a figure can never be drawn on a
 * scale that clips its own answer: the finite bounds set the span and a fixed margin is added, and
 * a set with no finite bound at all falls back to a window around zero.
 */
export function SolutionLineWorked({
  statement,
  solved,
  pieces = [],
  points = [],
  ariaLabel,
  title,
}: {
  /** The problem as it was asked, typeset above the line. */
  statement: string;
  /** The solved form, typeset under the line. */
  solved: string;
  pieces?: readonly SolutionPiece[];
  points?: readonly SolutionPoint[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const finite = [
    ...pieces.flatMap((piece) => [piece.from, piece.to]),
    ...points.map((point) => point.at),
  ].filter((value): value is number => value !== null && Number.isFinite(value));
  const lo = finite.length ? Math.min(...finite) : -1;
  const hi = finite.length ? Math.max(...finite) : 1;
  // A margin proportional to the spread, with a floor, so a single point still gets a scale and a
  // wide band is not pressed against the ends of the axis.
  const pad = Math.max(2, Math.round((hi - lo) * 0.35));
  // Snapped outwards to whole numbers before the padding, so the two ticks that come from the
  // WINDOW rather than from the answer are always round: a fractional root would otherwise
  // carry its own fraction into both ends of the scale.
  const min = Math.floor(lo) - pad;
  const max = Math.ceil(hi) + pad;
  const x = (value: number): number =>
    LEFT + ((value - min) / (max - min)) * (RIGHT - LEFT);

  // The window's two ends, plus every PIECE bound. A marked point is deliberately absent: it
  // already prints its own value over the axis, in `CIVIC`, so a tick under it wrote the root a
  // second time on every draw that has one. On `d4.pol4.formula.l3` the second spelling was not
  // even the same number — the point prints `\tfrac{1}{3}` and the tick under it printed the
  // rounded `0.33`, a value the grader refuses. A piece bound is the opposite case and keeps its
  // tick: a span endpoint carries a circle and no label, so the tick is the only place its value
  // is written. Where a point and a bound coincide the bound's tick stands, which is the one
  // reading of "already labelled" that leaves nothing off the figure;
  // `solutionLinePointLabels.test.tsx` measures the rule over every draw of both branches.
  const pieceBounds = pieces
    .flatMap((piece) => [piece.from, piece.to])
    .filter((value): value is number => value !== null && Number.isFinite(value));
  /*
   * Deduplicated, because a set drawn as a UNION names its shared bound twice. Every D3 caller
   * hands over one piece, so the list was distinct by construction; D6's excluded-point domains
   * arrive as `(-inf, r)` alongside `(r, inf)`, and `r` from both pieces was two ticks keyed the
   * same, printing the number twice at one x with React warning about the duplicate key. Reading
   * the bounds off the pieces rather than off `finite` does not fix that on its own: a shared
   * bound is one value contributed by two pieces, so it arrives twice either way.
   */
  const ticks = [...new Set([min, ...pieceBounds, max])];

  return (
    <svg viewBox="0 0 440 172" role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <SvgMath latex={statement} x={220} y={26} fontSize={18} color={LABEL} w={420} />
      <line x1={30} y1={44} x2={410} y2={44} stroke={LINE} strokeWidth={1} />

      {/* Each piece's span, and an arrowhead where it runs off the end of the drawn scale. */}
      {pieces.map((piece) => {
        const startX = piece.from === null ? LEFT : x(piece.from);
        const endX = piece.to === null ? RIGHT : x(piece.to);
        return (
          <g key={`${piece.from}-${piece.to}`}>
            <rect
              x={startX}
              y={AXIS_Y - 9}
              width={Math.max(endX - startX, 1)}
              height={18}
              fill={CIVIC}
              fillOpacity={0.18}
            />
            <line
              x1={startX}
              y1={AXIS_Y}
              x2={endX}
              y2={AXIS_Y}
              stroke={CIVIC}
              strokeWidth={3}
            />
            {piece.from === null && (
              <path d={`M ${LEFT} ${AXIS_Y} l 9 -5 l 0 10 Z`} fill={CIVIC} stroke="none" />
            )}
            {piece.to === null && (
              <path
                d={`M ${RIGHT} ${AXIS_Y} l -9 -5 l 0 10 Z`}
                fill={CIVIC}
                stroke="none"
              />
            )}
          </g>
        );
      })}

      <line x1={LEFT} y1={AXIS_Y} x2={RIGHT} y2={AXIS_Y} stroke={LINE} strokeWidth={1.5} />

      {ticks.map((value) => (
        <g key={`tick-${value}`}>
          <line
            x1={x(value)}
            y1={AXIS_Y - 5}
            x2={x(value)}
            y2={AXIS_Y + 5}
            stroke={LINE}
            strokeWidth={1.2}
          />
          <text x={x(value)} y={AXIS_Y + 22} textAnchor="middle" fontSize={11} fill={SOFT}>
            {tickText(value)}
          </text>
        </g>
      ))}

      {/* Endpoint marks: filled for included, hollow for excluded. Never a hue difference, since
          one interval's two ends can disagree and hue is spoken for elsewhere. */}
      {pieces.flatMap((piece) =>
        [
          piece.from === null
            ? null
            : { at: piece.from, closed: piece.fromClosed === true },
          piece.to === null ? null : { at: piece.to, closed: piece.toClosed === true },
        ]
          .filter((end): end is { at: number; closed: boolean } => end !== null)
          .map((end) => (
            <circle
              key={`end-${piece.from}-${piece.to}-${end.at}`}
              cx={x(end.at)}
              cy={AXIS_Y}
              r={5.5}
              fill={end.closed ? CIVIC : "var(--paper)"}
              stroke={CIVIC}
              strokeWidth={2.2}
            />
          )),
      )}

      {points.map((point) => (
        <g key={`point-${point.at}`}>
          <circle cx={x(point.at)} cy={AXIS_Y} r={6} fill={CIVIC} stroke="none" />
          {point.label === undefined ? (
            <text
              x={x(point.at)}
              y={AXIS_Y - 14}
              textAnchor="middle"
              fontSize={12}
              fill={CIVIC}
              fontWeight={700}
            >
              {tickText(point.at)}
            </text>
          ) : (
            <SvgMath
              latex={point.label}
              x={x(point.at)}
              y={AXIS_Y - 18}
              fontSize={15}
              color={CIVIC}
              w={72}
              h={24}
            />
          )}
        </g>
      ))}

      <SvgMath latex={solved} x={220} y={136} fontSize={18} color={CIVIC} w={420} />
    </svg>
  );
}

/** `+ 7` / `- 7`, matching the item-bank prompt formatter so a figure reads like its prompt. */
export function signedTex(value: number): string {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}
