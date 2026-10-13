/**
 * Worked-solution figures for the D9 TRG.2 practice templates: a ratio read off three named
 * sides, an exact value at a special angle, two guy-wire lengths, and the complement a
 * cofunction names.
 *
 * All five are FIGURES rather than step columns, and for one reason: every question on this
 * node is a claim about which side is which. A learner who missed one has almost always
 * paired the wrong two lengths, and no column of arithmetic shows them that, because the
 * arithmetic was never the part that went wrong. So each figure draws the triangle, marks the
 * angle the question is asked from, and inks the sides the ratio actually compares. The
 * tangent inks TWO of them and the hypotenuse none, which is the whole of what a learner who
 * reached for the hypotenuse needs to see.
 *
 * **Every triangle here is drawn to the shape its own numbers describe.** One unit is
 * computed from the draw's longer leg and the other follows from it, so the $30^{\circ}$
 * reference triangle really is longer than it is tall and a wire at $60^{\circ}$ really does
 * stand up. A fixed outline would put a near-square triangle under the labels $1$ and
 * $\sqrt{3}$, teaching against the very ratio printed beside it.
 *
 * Everything is driven by the owning template's `template_params`, with a default for every
 * key, and each figure recomputes what `generate()` computed by the same route rather than
 * reading a stored answer back.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { numStr, type WorkedSolutionVisual } from "../workedKit";

/* -------------------------------------------------------------------------- */
/* The shared right triangle                                                   */
/* -------------------------------------------------------------------------- */

/** The three sides, named by where they sit in the fixed orientation below. */
export type Side = "up" | "base" | "hyp";

/** A unit vector from `from` towards `to`, or `(0, 0)` for a degenerate pair. */
function unitTowards(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number } {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

/* -------------------------------------------------------------------------- */
/* The frame the triangle and its equations share                             */
/* -------------------------------------------------------------------------- */

/**
 * The two columns, and the frame they decide between them.
 *
 * The figure is one composition rather than two things that happen to be in the same box, and
 * the way it stopped being one was that the drawing was placed from an ANCHOR and the equations
 * from a CONSTANT. A corner nailed at `(58, 156)` with the longest leg scaled to 104 units put
 * a 7-24 triangle in the bottom left of a 440x200 frame, with its equation column starting 70
 * units above the outline's own middle and the whole right-hand side and everything under the
 * base left blank.
 *
 * So neither half is placed at a constant now. The outline is sized to fill a box, the labels
 * it hangs get their room reserved around it, and the block that makes is centered in the left
 * column. The equation rows are centered on the SAME middle. The frame is then whichever of the
 * two is taller, which is why a flat triangle's figure is short and a near-square one's is not:
 * there is no room to leave blank, because the height is what the content came to.
 */
/** The frame's width, which is the one thing here that is fixed. */
const FRAME_W = 440;
/** The box the outline itself is drawn inside, before any of its labels. */
const OUTLINE_W = 168;
const OUTLINE_H = 128;
/** Where that outline's block is centered across the frame. */
const OUTLINE_CX = 118;
/** The room the outline's own labels need outside it, side by side with the lengths. */
const LABEL_LEFT = 44;
const LABEL_RIGHT = 16;
const LABEL_ABOVE = 20;
const LABEL_BELOW = 40;
/** Where the equation column is centered, how wide a row may run, and the gap between rows. */
const ROW_X = 330;
const ROW_W = 200;
const ROW_PITCH = 46;
const ROW_SIZE = 16;
/**
 * Half the ink height of one equation row, as a share of the size it is drawn at.
 *
 * An allowance rather than a measurement, for the reason `d9TRG1.tsx` gives at length: the
 * layout is chosen before KaTeX has laid anything out. Sized for a `\dfrac`, which most of
 * these rows carry.
 */
const ROW_HALF = ROW_SIZE * 0.95;
/** Blank kept above and below whichever of the two columns is taller. */
const FRAME_PAD = 16;

/**
 * A right triangle with the right angle at the bottom left, the marked angle at the bottom
 * right, and a column of math to its right.
 *
 * The orientation is fixed rather than a prop, because it is the guy wire's own: the mast
 * stands up on the left, the deck runs out to the right, the wire closes the triangle, and
 * the angle sits at the anchor pad where the wire meets the deck. The three abstract items
 * borrow that same picture deliberately, so a learner meets one triangle across the node
 * rather than four unrelated ones.
 *
 * `upLength` and `baseLength` are what the figure is SHAPED by; `upLabel`, `baseLabel` and
 * `hypLabel` are what it SAYS. They are separate because three of the five entries label a
 * side with a root or a letter while still needing a real number to draw it at.
 */
export function TriangleWorked({
  upLength,
  baseLength,
  upLabel,
  baseLabel,
  hypLabel,
  angleLabel,
  cornerLabel,
  answered,
  rows,
  ariaLabel,
  title,
}: {
  upLength: number;
  baseLength: number;
  upLabel: string;
  baseLabel: string;
  hypLabel: string;
  /** LaTeX for the angle at the pad, e.g. `30^{\circ}` or `\theta`. */
  angleLabel: string;
  /** LaTeX for the second acute angle, drawn at the apex only when supplied. */
  cornerLabel?: string;
  /**
   * The sides the item's ratio compares, inked in the success colour.
   *
   * A list rather than one side, because a tangent compares two legs and leaves the
   * hypotenuse out. Inking a single side under a tangent would say the hypotenuse was merely
   * not the answer, when the point is that it takes no part at all.
   */
  answered: readonly Side[];
  rows: readonly string[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  // Sized to FIT the box rather than off the longer leg, because the two are not the same
  // thing once a draw is tall: scaling 24-7 by its longest side gives an outline 24 units tall
  // and one 168 units tall, and only the second of those is a shape. Whichever side runs out
  // of room first sets the unit, so every draw fills the box in one direction and neither
  // overflows it.
  const unit = Math.min(OUTLINE_W / baseLength, OUTLINE_H / upLength);
  const drawnW = baseLength * unit;
  const drawnH = upLength * unit;

  // The block is the outline plus the room its labels take, centered in the left column, and
  // the equation rows are centered on the same middle. `LABEL_BELOW` exceeds `LABEL_ABOVE`
  // because the base label hangs under the outline while the apex label sits inside it, so
  // centering the OUTLINE would leave the composition sitting high by the difference.
  const rowsHeight = (rows.length - 1) * ROW_PITCH + 2 * ROW_HALF;
  const height = Math.round(
    Math.max(drawnH + LABEL_ABOVE + LABEL_BELOW, rowsHeight) + 2 * FRAME_PAD,
  );
  const middle = height / 2;
  const corner = {
    x: OUTLINE_CX - (drawnW + LABEL_LEFT + LABEL_RIGHT) / 2 + LABEL_LEFT,
    y: middle + drawnH / 2 + (LABEL_ABOVE - LABEL_BELOW) / 2,
  };
  const top = { x: corner.x, y: corner.y - drawnH };
  const pad = { x: corner.x + drawnW, y: corner.y };

  // The hypotenuse label rides the outward normal of the hypotenuse, so it stays clear of the
  // line at every slope rather than at the one slope somebody happened to check.
  const mid = { x: (top.x + pad.x) / 2, y: (top.y + pad.y) / 2 };
  const outward = unitTowards(corner, mid);
  const hypAt = { x: mid.x + outward.x * 26, y: mid.y + outward.y * 26 };

  // The angle arc at the pad, swept from the deck round to the wire. Both endpoints come off
  // the drawn geometry, so the arc opens by exactly the angle the triangle is drawn at and
  // cannot disagree with the number written inside it. Its radius is capped against the deck
  // it is swept from, because a fixed 28 on the 38-unit base a 24-7 draw produces would reach
  // most of the way to the right angle at the far end of it.
  const arcR = Math.min(28, drawnW * 0.45);
  const padToTop = unitTowards(pad, top);
  const padToCorner = { x: -1, y: 0 };
  const arcStart = { x: pad.x + arcR * padToCorner.x, y: pad.y };
  const arcEnd = { x: pad.x + arcR * padToTop.x, y: pad.y + arcR * padToTop.y };
  const padBisector = unitTowards(
    { x: 0, y: 0 },
    { x: padToCorner.x + padToTop.x, y: padToCorner.y + padToTop.y },
  );
  const angleAt = {
    x: pad.x + padBisector.x * (arcR + 16),
    y: pad.y + padBisector.y * (arcR + 16),
  };

  // The apex angle placed the same way: out along its own bisector, so it stays inside the
  // outline and off both edges whatever shape the draw gives the triangle. A fixed nudge
  // from the apex walks through the hypotenuse the first time a triangle comes out tall.
  const topToCorner = { x: 0, y: 1 };
  const topToPad = unitTowards(top, pad);
  const topBisector = unitTowards(
    { x: 0, y: 0 },
    { x: topToCorner.x + topToPad.x, y: topToCorner.y + topToPad.y },
  );
  const cornerAt = { x: top.x + topBisector.x * 40, y: top.y + topBisector.y * 40 };

  const ink = (side: Side) => (answered.includes(side) ? CIVIC : LABEL);

  return (
    <svg viewBox={`0 0 ${FRAME_W} ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <path
        d={`M ${corner.x} ${corner.y} L ${top.x} ${top.y} L ${pad.x} ${pad.y} Z`}
        fill="none"
        stroke={LINE}
        strokeWidth={1.6}
      />
      <path
        d={`M ${corner.x} ${corner.y - 13} L ${corner.x + 13} ${corner.y - 13} L ${corner.x + 13} ${corner.y}`}
        fill="none"
        stroke={SOFT}
        strokeWidth={1.2}
      />
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none"
        stroke={SIGNAL}
        strokeWidth={1.5}
      />

      <SvgMath
        latex={angleLabel}
        x={angleAt.x}
        y={angleAt.y}
        fontSize={14}
        color={SIGNAL}
        w={62}
      />
      {cornerLabel !== undefined && (
        <SvgMath
          latex={cornerLabel}
          x={cornerAt.x}
          y={cornerAt.y}
          fontSize={14}
          color={SIGNAL}
          w={62}
        />
      )}

      <SvgMath
        latex={upLabel}
        x={corner.x - 26}
        y={(corner.y + top.y) / 2}
        fontSize={15}
        color={ink("up")}
        w={52}
      />
      <SvgMath
        latex={baseLabel}
        x={(corner.x + pad.x) / 2}
        y={corner.y + 22}
        fontSize={15}
        color={ink("base")}
        w={66}
      />
      <SvgMath
        latex={hypLabel}
        x={hypAt.x}
        y={hypAt.y}
        fontSize={15}
        color={ink("hyp")}
        w={66}
      />

      {rows.map((latex, index) => (
        <SvgMath
          key={latex}
          latex={latex}
          x={ROW_X}
          y={middle - ((rows.length - 1) * ROW_PITCH) / 2 + index * ROW_PITCH}
          fontSize={ROW_SIZE}
          color={index === rows.length - 1 ? CIVIC : LABEL}
          w={ROW_W}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared vocabulary                                                           */
/* -------------------------------------------------------------------------- */

const FUNCTION_NAMES = ["sin", "cos", "tan"] as const;
const FUNCTION_WORDS = ["sine", "cosine", "tangent"] as const;

function fnName(fn: number): string {
  return FUNCTION_NAMES[fn] ?? "sin";
}

function fnWord(fn: number): string {
  return FUNCTION_WORDS[fn] ?? "sine";
}

/** How a ratio reads in words, for the caption and the aria-label. */
function ratioWords(fn: number): string {
  return fn === 0
    ? "the opposite side over the hypotenuse"
    : fn === 1
      ? "the adjacent side over the hypotenuse"
      : "the opposite side over the adjacent side";
}

/** The two sides a ratio compares, in this figure's fixed orientation. */
function ratioSides(fn: number): readonly Side[] {
  return fn === 0 ? ["up", "hyp"] : fn === 1 ? ["base", "hyp"] : ["up", "base"];
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/* -------------------------------------------------------------------------- */
/* The special-angle reference triangles                                       */
/* -------------------------------------------------------------------------- */

/**
 * The reference triangle for one special angle: drawn lengths for the two legs, plus the
 * LaTeX each of the three sides is labelled with.
 *
 * All three special angles come off two triangles, and the figure's job is to make that
 * visible. The $30^{\circ}$ and the $60^{\circ}$ are one outline read from opposite corners,
 * which is exactly why their sines and cosines trade places.
 */
function referenceTriangle(deg: number): {
  up: number;
  base: number;
  upLabel: string;
  baseLabel: string;
  hypLabel: string;
} {
  if (deg === 45) {
    return { up: 1, base: 1, upLabel: "1", baseLabel: "1", hypLabel: "\\sqrt{2}" };
  }
  if (deg === 30) {
    // Read from the 30-degree corner, so the short leg is the one opposite it.
    return {
      up: 1,
      base: Math.sqrt(3),
      upLabel: "1",
      baseLabel: "\\sqrt{3}",
      hypLabel: "2",
    };
  }
  // The same triangle read from the 60-degree corner, so the two legs swap over.
  return {
    up: Math.sqrt(3),
    base: 1,
    upLabel: "\\sqrt{3}",
    baseLabel: "1",
    hypLabel: "2",
  };
}

/**
 * The raw ratio and the tidied one for a special angle, recomputed here from `fn` and `deg`
 * rather than carried across from the template.
 *
 * `rationalize` is null wherever nothing was owed, and every consumer branches on it, so a
 * figure never prints a rationalizing step over a value that arrived with a whole number
 * already underneath it.
 */
function specialValue(
  fn: number,
  deg: number,
): { raw: string; value: string; rationalize: string | null } {
  const tri = referenceTriangle(deg);
  const raw =
    fn === 0
      ? `\\dfrac{${tri.upLabel}}{${tri.hypLabel}}`
      : fn === 1
        ? `\\dfrac{${tri.baseLabel}}{${tri.hypLabel}}`
        : `\\dfrac{${tri.upLabel}}{${tri.baseLabel}}`;

  if (deg === 45) {
    return fn === 2
      ? { raw, value: "1", rationalize: null }
      : { raw, value: "\\dfrac{\\sqrt{2}}{2}", rationalize: "\\sqrt{2}" };
  }
  if (deg === 30) {
    if (fn === 0) return { raw, value: "\\dfrac{1}{2}", rationalize: null };
    if (fn === 1) return { raw, value: "\\dfrac{\\sqrt{3}}{2}", rationalize: null };
    return { raw, value: "\\dfrac{\\sqrt{3}}{3}", rationalize: "\\sqrt{3}" };
  }
  if (fn === 0) return { raw, value: "\\dfrac{\\sqrt{3}}{2}", rationalize: null };
  if (fn === 1) return { raw, value: "\\dfrac{1}{2}", rationalize: null };
  return { raw, value: "\\sqrt{3}", rationalize: null };
}

/** A value read aloud, for an aria-label, since KaTeX makes the rendered text unreadable. */
function spokenValue(latex: string): string {
  return latex
    .replace(/\\dfrac\{([^}]*)\}\{([^}]*)\}/g, "$1 over $2")
    .replace(/\\sqrt\{([^}]*)\}/g, "root $1")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Guy-wire side naming                                                        */
/* -------------------------------------------------------------------------- */

const WIRE_WORDS: Record<Side, string> = {
  up: "the height up the mast",
  base: "the deck run out to the pad",
  hyp: "the wire",
};

/**
 * Which of the three lengths each L2 guy-wire shape hands over and which it asks for, in the
 * same order as `WIRE_SHAPES` in the template so the two cannot drift apart.
 *
 * Four rows, because `WIRE_SHAPES` has four. A fifth sat here, `{ given: "base", wanted: "up" }`,
 * which is the tangent pairing of the $45^{\circ}$ shape the template retired: at a ratio of one
 * the answer IS the given length, so the item asked for a number its own prompt had printed.
 * `packages/item-bank/src/d9/nodes/TRG.2/index.ts` removed it and `missingSide.test.ts` pins it
 * out, so `shape` never reaches an index past three and the row drew nothing.
 */
const MISSING_SIDE_ROLES: readonly { given: Side; wanted: Side }[] = [
  { given: "hyp", wanted: "up" },
  { given: "hyp", wanted: "base" },
  { given: "up", wanted: "hyp" },
  { given: "base", wanted: "hyp" },
];

/** The same table for the L3 radical shapes, matching `RADICAL_SHAPES`. */
const RADICAL_SIDE_ROLES: readonly { given: Side; wanted: Side }[] = [
  { given: "hyp", wanted: "base" },
  { given: "base", wanted: "hyp" },
  { given: "hyp", wanted: "base" },
  { given: "base", wanted: "up" },
];

const FALLBACK_ROLE = { given: "hyp", wanted: "up" } as const;

/**
 * The hypotenuse's drawn length for a guy-wire figure, from whichever side the item supplied.
 *
 * Everything else in the outline follows from it and the angle, so this one number is what
 * keeps the drawn shape agreeing with the degree label inside it.
 */
function wireHypotenuse(
  roles: { given: Side; wanted: Side },
  angle: number,
  givenLength: number,
  wantedLength: number,
): number {
  const radians = (angle * Math.PI) / 180;
  if (roles.given === "hyp") return givenLength;
  if (roles.wanted === "hyp") return wantedLength;
  // Neither end of the story is the wire, so it comes off the leg that was given.
  return roles.given === "base"
    ? givenLength / Math.cos(radians)
    : givenLength / Math.sin(radians);
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const TRG2_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d9.trg2.ratio-from-sides.l1": {
    Svg: ({ opposite = 3, adjacent = 4, hyp = 5, fn = 0, top = 3, bottom = 5 }) => {
      const rawTop = fn === 1 ? adjacent : opposite;
      const rawBottom = fn === 2 ? adjacent : hyp;
      const reduced = gcd(rawTop, rawBottom) > 1;
      return (
        <TriangleWorked
          upLength={opposite}
          baseLength={adjacent}
          upLabel={numStr(opposite)}
          baseLabel={numStr(adjacent)}
          hypLabel={numStr(hyp)}
          angleLabel="\theta"
          answered={ratioSides(fn)}
          // A chain, and a legitimate one: the second row continues the first. It is written
          // only where the draw left a common factor, so a triple that arrives in lowest
          // terms never prints the same fraction twice with an equals sign between.
          rows={
            reduced
              ? [
                  `\\${fnName(fn)} \\theta = \\dfrac{${rawTop}}{${rawBottom}}`,
                  `= \\dfrac{${top}}{${bottom}}`,
                ]
              : [`\\${fnName(fn)} \\theta = \\dfrac{${top}}{${bottom}}`]
          }
          ariaLabel={`A right triangle whose side opposite theta is ${opposite}, whose adjacent side is ${adjacent}, and whose hypotenuse is ${hyp}, giving a ${fnWord(fn)} of ${top} over ${bottom}`}
          title="Which two sides the named ratio compares"
        />
      );
    },
    caption: ({ opposite = 3, adjacent = 4, hyp = 5, fn = 0, top = 3, bottom = 5 }) => {
      const rawTop = fn === 1 ? adjacent : opposite;
      const rawBottom = fn === 2 ? adjacent : hyp;
      return gcd(rawTop, rawBottom) > 1
        ? `The ${fnWord(fn)} is ${ratioWords(fn)}, which reads $\\dfrac{${rawTop}}{${rawBottom}}$ here and reduces to $\\dfrac{${top}}{${bottom}}$. The two sides it names are in green, and the third takes no part in it.`
        : `The ${fnWord(fn)} is ${ratioWords(fn)}, which reads $\\dfrac{${top}}{${bottom}}$ here. The two sides it names are in green, and the third takes no part in it.`;
    },
  },

  "d9.trg2.special-exact.l2": {
    Svg: ({ fn = 0, deg = 30 }) => {
      const tri = referenceTriangle(deg);
      const { raw, value, rationalize } = specialValue(fn, deg);
      const rows = [`\\${fnName(fn)} ${deg}^{\\circ} = ${raw}`];
      if (rationalize !== null) {
        rows.push(`= ${raw} \\cdot \\dfrac{${rationalize}}{${rationalize}}`);
      }
      rows.push(`= ${value}`);
      return (
        <TriangleWorked
          upLength={tri.up}
          baseLength={tri.base}
          upLabel={tri.upLabel}
          baseLabel={tri.baseLabel}
          hypLabel={tri.hypLabel}
          angleLabel={`${deg}^{\\circ}`}
          cornerLabel={`${90 - deg}^{\\circ}`}
          answered={ratioSides(fn)}
          rows={rows}
          ariaLabel={`The ${deg} degree reference triangle, giving a ${fnWord(fn)} of ${spokenValue(value)}`}
          title="The reference triangle a special angle is read off"
        />
      );
    },
    caption: ({ fn = 0, deg = 30 }) => {
      const { value, rationalize } = specialValue(fn, deg);
      const source =
        deg === 45
          ? "Half a square gives this triangle, so its two legs are equal and the Pythagorean theorem fills in the hypotenuse."
          : "Half an equilateral triangle gives this one, so the short leg is half the hypotenuse and the Pythagorean theorem fills in the third side.";
      return rationalize === null
        ? `${source} Reading ${ratioWords(fn)} off it gives exactly $${value}$, with no root left underneath.`
        : `${source} Reading ${ratioWords(fn)} off it leaves a root in the denominator, so multiplying above and below by $${rationalize}$ lifts it over the line and gives $${value}$.`;
    },
  },

  "d9.trg2.missing-side.l2": {
    Svg: ({ shape = 0, angle = 30, ratio = 0, given = 40, answer = 20 }) => {
      const roles = MISSING_SIDE_ROLES[shape] ?? FALLBACK_ROLE;
      const radians = (angle * Math.PI) / 180;
      const hypLen = wireHypotenuse(roles, angle, given, answer);
      const label = (side: Side) =>
        side === roles.given ? numStr(given) : side === roles.wanted ? numStr(answer) : "";
      const unknown = roles.wanted === "hyp" ? "c" : "x";
      return (
        <TriangleWorked
          upLength={hypLen * Math.sin(radians)}
          baseLength={hypLen * Math.cos(radians)}
          upLabel={label("up")}
          baseLabel={label("base")}
          hypLabel={label("hyp")}
          angleLabel={`${angle}^{\\circ}`}
          answered={[roles.wanted]}
          // Two separate statements, not a chain: the first is the ratio's exact value and
          // the second is the length it produced. An `=` between them would be claiming the
          // ratio equals the length. The value is the half unconditionally, since every
          // shape here is drawn at $30^{\circ}$ or $60^{\circ}$; see MISSING_SIDE_ROLES on
          // the $45^{\circ}$ shape whose ratio was one.
          rows={[
            `\\${fnName(ratio)} ${angle}^{\\circ} = \\dfrac{1}{2}`,
            `${unknown} = ${numStr(answer)}`,
          ]}
          ariaLabel={`A guy wire at ${angle} degrees, with ${WIRE_WORDS[roles.given]} measuring ${given} meters and ${WIRE_WORDS[roles.wanted]} measuring ${answer} meters`}
          title="The mast, the deck run and the wire as one right triangle"
        />
      );
    },
    caption: ({ shape = 0, angle = 30, ratio = 0, given = 40, answer = 20 }) => {
      const roles = MISSING_SIDE_ROLES[shape] ?? FALLBACK_ROLE;
      return `From the pad, ${WIRE_WORDS[roles.given]} and ${WIRE_WORDS[roles.wanted]} are the two lengths the ${fnWord(ratio)} pairs, and $\\${fnName(ratio)} ${angle}^{\\circ}$ is exactly $\\dfrac{1}{2}$. Putting $${given}$ through it leaves $${answer}$ meters, with nothing to round.`;
    },
  },

  "d9.trg2.exact-side-radical.l3": {
    Svg: ({ shape = 0, angle = 45, ratio = 1, given = 8, coeff = 4, radicand = 2 }) => {
      const roles = RADICAL_SIDE_ROLES[shape] ?? FALLBACK_ROLE;
      const radians = (angle * Math.PI) / 180;
      const answerLabel = `${coeff}\\sqrt{${radicand}}`;
      const hypLen = wireHypotenuse(roles, angle, given, coeff * Math.sqrt(radicand));
      const label = (side: Side) =>
        side === roles.given ? numStr(given) : side === roles.wanted ? answerLabel : "";
      const exactRatio = ratio === 2 ? "\\sqrt{3}" : `\\dfrac{\\sqrt{${radicand}}}{2}`;
      const unknown = roles.wanted === "hyp" ? "c" : "x";
      return (
        <TriangleWorked
          upLength={hypLen * Math.sin(radians)}
          baseLength={hypLen * Math.cos(radians)}
          upLabel={label("up")}
          baseLabel={label("base")}
          hypLabel={label("hyp")}
          angleLabel={`${angle}^{\\circ}`}
          answered={[roles.wanted]}
          rows={[
            `\\${fnName(ratio)} ${angle}^{\\circ} = ${exactRatio}`,
            `${unknown} = ${answerLabel}`,
          ]}
          ariaLabel={`A guy wire at ${angle} degrees, with a known length of ${given} meters and an exact answer of ${coeff} root ${radicand} meters`}
          title="An exact length, kept as a radical rather than rounded"
        />
      );
    },
    caption: ({ shape = 0, angle = 45, ratio = 1, coeff = 4, radicand = 2 }) => {
      const roles = RADICAL_SIDE_ROLES[shape] ?? FALLBACK_ROLE;
      return `The ${fnWord(ratio)} pairs ${WIRE_WORDS[roles.given]} with ${WIRE_WORDS[roles.wanted]}, and at $${angle}^{\\circ}$ its exact value carries a root. Carrying that root through instead of turning it into a decimal leaves a length of exactly $${coeff}\\sqrt{${radicand}}$ meters.`;
    },
  },

  "d9.trg2.cofunction-angle.l3": {
    Svg: ({ given = 25, answer = 65, dir = 0 }) => {
      const from = dir === 0 ? "sin" : "cos";
      const to = dir === 0 ? "cos" : "sin";
      const radians = (given * Math.PI) / 180;
      return (
        <TriangleWorked
          upLength={Math.sin(radians)}
          baseLength={Math.cos(radians)}
          upLabel="a"
          baseLabel="b"
          hypLabel="c"
          angleLabel={`${given}^{\\circ}`}
          cornerLabel={`${answer}^{\\circ}`}
          // Nothing is inked here: this item answers an ANGLE, and greening a side would
          // point at the wrong part of the picture.
          answered={[]}
          rows={[
            `${given}^{\\circ} + \\mathord{?} = 90^{\\circ}`,
            `\\${from} ${given}^{\\circ} = \\${to} ${answer}^{\\circ}`,
          ]}
          ariaLabel={`A right triangle whose two acute angles are ${given} and ${answer} degrees, so the ${dir === 0 ? "sine" : "cosine"} at one equals the ${dir === 0 ? "cosine" : "sine"} at the other`}
          title="The two acute angles, and why one ratio reads as the other"
        />
      );
    },
    caption: ({ given = 25, answer = 65, dir = 0 }) => {
      const from = dir === 0 ? "sine" : "cosine";
      const to = dir === 0 ? "cosine" : "sine";
      return `Standing at $${given}^{\\circ}$, side $a$ is opposite and side $b$ is adjacent. Standing at the other acute angle those two trade places, so the ${from} read at one corner is the ${to} read at the other. The pair fills $90^{\\circ}$ between them, which puts that other corner at $${answer}^{\\circ}$.`;
    },
  },
};
