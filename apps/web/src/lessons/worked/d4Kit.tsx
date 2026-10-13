/**
 * The one figure D4's worked solutions add to the shared column: a rectangle divided into its
 * four products.
 *
 * The Classical era's rationale is *areas as products*, and the whole of POL.1 and POL.2 is
 * one relationship read in two directions: a product is a rectangle, and factoring is being
 * handed the area and asked for the sides. A column of algebra can state that and cannot show
 * it, and the step a learner loses is the COUNT of pieces rather than any arithmetic in them,
 * so the reveal draws the pieces.
 *
 * ## Why the cells are not to scale
 *
 * They are drawn on a fixed 2 by 2 grid rather than in proportion to the drawn parameters. A
 * proportional figure would make the constant cell vanish whenever the constant was small
 * against $x$, which is most draws, and the cell that vanishes is the one carrying the product
 * a learner most often forgets. The figure is a diagram of the four products, not a scale plan
 * of a court, and it says so by labelling every edge.
 *
 * ## The colours
 *
 * The two cross terms carry `SIGNAL`, because they are the pair that collects and the pair a
 * learner drops; everything else is ink. Nothing here is a verdict on the learner, so the
 * correctness palette is not used at all (R26).
 */

import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";

const LEFT = 96;
/**
 * Where the grid starts, which is also what separates the two label bands above it.
 *
 * The figure stacks a STATEMENT band (the product, centred at `y = 22`) on a COLUMN-LABEL band
 * (the two pieces of the top edge, at `TOP - EDGE_GAP`), and at `TOP = 44` those two bands
 * intersected: the statement's typeset ink runs about ten units either side of its centre, the
 * column labels' about eight either side of theirs, and 30 - 22 is not enough room for both. So
 * `x` and `6` printed through `(x + 5)(x + 6)` on every draw of five templates. The bands are
 * separated here rather than by shrinking either one, because both are already at the smallest
 * size the figure can be read at.
 */
const TOP = 66;
/** How far the top edge's labels sit above the grid. */
const EDGE_GAP = 14;
const WIDE = 128;
const NARROW = 74;
const TALL = 96;
const SHORT = 56;

/**
 * The statement's reserved band, rather than `SvgMath`'s default `fontSize * 3`.
 *
 * The default would give the 17-unit statement a 51-unit box reaching from y -3.5 to 47.5, which
 * is three times the ink it holds and overlaps the grid itself. Nothing clips — the box is
 * `overflow: visible` and its content is flex-centred on `y` either way — but a box that claims
 * three times its band is what made the collision above hard to see in the source.
 */
const STATEMENT_BAND = 26;

/**
 * A product of two binomials, drawn as a rectangle in four pieces with every edge labelled
 * and every cell holding its own area.
 *
 * `statement` is typeset above the figure and `result` below it, so the diagram sits between
 * the question and the answer rather than replacing either.
 */
export function AreaGridWorked({
  leftEdge,
  rightEdge,
  topEdge,
  bottomEdge,
  cells,
  statement,
  result,
  ariaLabel,
  title,
}: {
  /** The two pieces of the vertical side, top first. */
  leftEdge: string;
  rightEdge: string;
  /** The two pieces of the horizontal side, left first. */
  topEdge: string;
  bottomEdge: string;
  /** The four areas, reading top-left, top-right, bottom-left, bottom-right. */
  cells: readonly [string, string, string, string];
  statement: string;
  result: string;
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const midX = LEFT + WIDE;
  const midY = TOP + TALL;
  const height = TOP + TALL + SHORT + 72;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <SvgMath
        latex={statement}
        x={220}
        y={22}
        fontSize={17}
        color={LABEL}
        w={420}
        h={STATEMENT_BAND}
      />

      {/* The four cells. The two cross terms are tinted, because they are the pair that
          collects and the pair a learner drops. */}
      <rect
        x={LEFT}
        y={TOP}
        width={WIDE}
        height={TALL}
        fill="none"
        stroke={LINE}
        strokeWidth={1.4}
      />
      <rect
        x={midX}
        y={TOP}
        width={NARROW}
        height={TALL}
        fill={`color-mix(in srgb, ${SIGNAL} 14%, transparent)`}
        stroke={LINE}
        strokeWidth={1.4}
      />
      <rect
        x={LEFT}
        y={midY}
        width={WIDE}
        height={SHORT}
        fill={`color-mix(in srgb, ${SIGNAL} 14%, transparent)`}
        stroke={LINE}
        strokeWidth={1.4}
      />
      <rect
        x={midX}
        y={midY}
        width={NARROW}
        height={SHORT}
        fill="none"
        stroke={LINE}
        strokeWidth={1.4}
      />

      <SvgMath
        latex={cells[0]}
        x={LEFT + WIDE / 2}
        y={TOP + TALL / 2}
        fontSize={16}
        color={LABEL}
        w={WIDE}
      />
      <SvgMath
        latex={cells[1]}
        x={midX + NARROW / 2}
        y={TOP + TALL / 2}
        fontSize={15}
        color={LABEL}
        w={NARROW}
      />
      <SvgMath
        latex={cells[2]}
        x={LEFT + WIDE / 2}
        y={midY + SHORT / 2}
        fontSize={15}
        color={LABEL}
        w={WIDE}
      />
      <SvgMath
        latex={cells[3]}
        x={midX + NARROW / 2}
        y={midY + SHORT / 2}
        fontSize={15}
        color={LABEL}
        w={NARROW}
      />

      {/* Edge labels: the two pieces of each side, outside the rectangle. */}
      <SvgMath
        latex={topEdge}
        x={LEFT + WIDE / 2}
        y={TOP - EDGE_GAP}
        fontSize={14}
        color={SOFT}
        w={WIDE}
      />
      <SvgMath
        latex={bottomEdge}
        x={midX + NARROW / 2}
        y={TOP - EDGE_GAP}
        fontSize={14}
        color={SOFT}
        w={NARROW}
      />
      <SvgMath
        latex={leftEdge}
        x={LEFT - 34}
        y={TOP + TALL / 2}
        fontSize={14}
        color={SOFT}
        w={64}
      />
      <SvgMath
        latex={rightEdge}
        x={LEFT - 34}
        y={midY + SHORT / 2}
        fontSize={14}
        color={SOFT}
        w={64}
      />

      <SvgMath
        latex={result}
        x={220}
        y={TOP + TALL + SHORT + 40}
        fontSize={18}
        color={CIVIC}
        w={420}
      />
    </svg>
  );
}

/** `+ 7` / `- 7`, matching the item-bank prompt formatter so a figure reads like its prompt. */
export function signedTex(value: number): string {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}

/** A coefficient printed the way a prompt prints it: `3x`, `x`, `-x`. */
export function coeffTex(value: number, variable = "x"): string {
  if (value === 1) {
    return variable;
  }
  if (value === -1) {
    return `-${variable}`;
  }
  return `${value}${variable}`;
}

/**
 * A term in a running polynomial: `+ 3x`, `- x`, `+ 12`.
 *
 * The item bank's `signedTerm` in `packages/item-bank/src/d4/nodes/_shared.ts` is this
 * function, and the pairing matters: a figure stands in for the reveal of the prompt beside
 * it, so `signedTex(b) + "x"` printing `- 1x` under a prompt that printed `- x` states the
 * question twice in two notations and leaves the learner deciding which one is the tree's.
 * Use this wherever a signed term carries a variable, and `signedTex` only for the constant.
 */
export function signedTermTex(value: number, variable = "x"): string {
  const body = variable === "" ? `${Math.abs(value)}` : coeffTex(Math.abs(value), variable);
  return value < 0 ? `- ${body}` : `+ ${body}`;
}

/** A quadratic in standard form from its three coefficients. */
export function quadraticTex(a: number, b: number, c: number): string {
  return `${coeffTex(a, "x^{2}")} ${signedTermTex(b, "x")} ${signedTex(c)}`;
}
