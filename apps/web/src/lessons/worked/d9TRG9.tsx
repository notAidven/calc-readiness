/**
 * Worked-solution figures for the D9 TRG.9 practice templates (the sum, difference and
 * double-angle identities).
 *
 * Four archetypes across the five templates, because the five ask four different questions
 * of a learner and a figure that answered all of them the same way would be decoration:
 *
 *  - **The split circle**, for the exact evaluation. What a learner is really doing there
 *    is noticing that an angle nobody memorized sits one special angle away from one they did,
 *    so the figure draws the split: two wedges off the horizontal whose boundary rays are the
 *    angle asked for and the angle it was built from. The substitution rows underneath then
 *    carry the arithmetic, which is the part the step cards already say well.
 *  - **The quadrant triangle**, for the two doubling shapes. The value handed over is a ratio
 *    of two sides, and both the missing side and the SIGN come off the picture, so a triangle
 *    drawn in its own quadrant says in one glance what two sentences of a step list say. The
 *    cosine shape dashes the side it never needs, which is the whole of its L3 lift: choosing
 *    the form written in the function you were given means the other side is never computed
 *    and the quadrant never matters.
 *  - **The pattern board**, for naming the identity. Its content is a near miss: the three
 *    candidate patterns are printed together, two of them differing in exactly one operator,
 *    with the drawn expression's own match ringed. A learner who read the sign off the middle
 *    of a cosine expansion and answered backwards can see the row they should have matched
 *    sitting directly under the one they did.
 *  - **The pair of circles**, for the compound angle built from two separately given
 *    functions. There are two angles here and each carries its own recovered partner and its
 *    own quadrant sign, so a single picture would have to say four things about two objects
 *    it had not distinguished. Drawn side by side, each circle owns one letter of the formula
 *    and the substitution row underneath reads left to right off the two of them.
 *
 * Everything is recomputed from `template_params` by the route `generate()` took, with a
 * default for every parameter, and no figure ever prints a spelling the answer field would
 * refuse: the exact values are radicals over a whole number, and the naming figure's answer is
 * one of the three option words.
 */

import { TRG9_TRIPLES } from "@cr/item-bank";
import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL_DEEP, SOFT, SvgMath } from "../svgKit";
import { gcd, type WorkedSolutionVisual } from "../workedKit";

/* -------------------------------------------------------------------------- */
/* The exact special-angle values, recomputed                                  */
/* -------------------------------------------------------------------------- */

/**
 * What sits under the radical for each special angle, so $\sin 30^{\circ}$ and
 * $\cos 60^{\circ}$ are both `1`, meaning $\dfrac{1}{2}$, and every other value is
 * $\dfrac{\sqrt{n}}{2}$. Mirrors the table in `d9/nodes/TRG.9`.
 */
const RADICAND: Record<number, { sin: number; cos: number }> = {
  30: { sin: 1, cos: 3 },
  45: { sin: 2, cos: 2 },
  60: { sin: 3, cos: 1 },
};

function sinRadicand(deg: number): number {
  return RADICAND[deg]?.sin ?? 1;
}

function cosRadicand(deg: number): number {
  return RADICAND[deg]?.cos ?? 1;
}

/** One exact value, as LaTeX: `\dfrac{1}{2}` when the radicand is one. */
function valueTex(radicand: number): string {
  return radicand === 1 ? "\\dfrac{1}{2}" : `\\dfrac{\\sqrt{${radicand}}}{2}`;
}

/** The product of two exact values, whose radicands multiply, over $4$. */
function productTex(first: number, second: number): string {
  const radicand = first * second;
  if (radicand === 1) {
    return "\\dfrac{1}{4}";
  }
  if (radicand === 4) {
    return "\\dfrac{1}{2}";
  }
  return `\\dfrac{\\sqrt{${radicand}}}{4}`;
}

function degTex(deg: number): string {
  return `${deg}^{\\circ}`;
}

/* -------------------------------------------------------------------------- */
/* Archetype 1: the split circle                                               */
/* -------------------------------------------------------------------------- */

const CX = 220;
/**
 * Center of the circle band. Low enough that a ray at $105^{\circ}$, whose measure is printed
 * outside the rim, clears the split equation printed along the top.
 */
const CY = 140;
const R = 74;
/** How far past the rim the horizontal axis runs. */
const REACH = R + 20;
/** Where a boundary ray's measure is printed, from the center. */
const RAY_LABEL_R = R + 26;
/** Everything above the algebra strip fits inside this. */
const CIRCLE_BAND = 230;
/** Pitch between two algebra rows, which all hold a display fraction. */
const FRACTION_PITCH = 48;

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function on(deg: number, radius: number): { x: number; y: number } {
  return { x: CX + radius * Math.cos(rad(deg)), y: CY - radius * Math.sin(rad(deg)) };
}

/** A filled wedge from `from` to `to`, in the given ink. */
function Wedge({
  from,
  to,
  radius,
  color,
}: {
  from: number;
  to: number;
  radius: number;
  color: string;
}): JSX.Element {
  const start = on(from, radius);
  const end = on(to, radius);
  // Every wedge here is well under a half turn, so the small-arc flag is always correct.
  const path = `M ${CX} ${CY} L ${start.x} ${start.y} A ${radius} ${radius} 0 0 0 ${end.x} ${end.y} Z`;
  return <path d={path} fill={color} fillOpacity={0.16} stroke={color} strokeWidth={1.2} />;
}

/**
 * The evaluation figure: the angle asked for, drawn as a split into two special angles, with
 * the substitution rows underneath.
 *
 * The two wedges share a boundary ray, and which of the three rays is the ANSWER differs
 * between the two templates: for a sum it is the outer ray, for a difference the inner one.
 * That is exactly the thing a learner has to see, so the answer's ray is the only one drawn in
 * the accent ink whichever shape it is.
 */
function SplitAngleWorked({
  goalDeg,
  wholeDeg,
  pieceDeg,
  isSine,
  isDifference,
  ariaLabel,
  title,
}: {
  /** The angle being evaluated. */
  goalDeg: number;
  /** The special angle the split starts from. */
  wholeDeg: number;
  /** The special angle added to it or taken off it. */
  pieceDeg: number;
  isSine: boolean;
  isDifference: boolean;
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const inner = Math.min(goalDeg, wholeDeg);
  const outer = Math.max(goalDeg, wholeDeg);
  const fnTex = isSine ? "\\sin" : "\\cos";
  const between = isDifference ? "-" : "+";
  // Cosine flips the sign it carries; sine keeps it. Same one-line rule the generator uses.
  const op = isSine === isDifference ? "-" : "+";

  const firstLeft = isSine ? sinRadicand(wholeDeg) : cosRadicand(wholeDeg);
  const firstRight = cosRadicand(pieceDeg);
  const secondLeft = isSine ? cosRadicand(wholeDeg) : sinRadicand(wholeDeg);
  const secondRight = sinRadicand(pieceDeg);

  const formulaTex = isSine
    ? `${fnTex}(A ${between} B) = \\sin A\\cos B ${op} \\cos A\\sin B`
    : `${fnTex}(A ${between} B) = \\cos A\\cos B ${op} \\sin A\\sin B`;
  const rows: { latex: string; color: string }[] = [
    { latex: formulaTex, color: SOFT },
    {
      latex: `${valueTex(firstLeft)} \\cdot ${valueTex(firstRight)} ${op} ${valueTex(secondLeft)} \\cdot ${valueTex(secondRight)}`,
      color: LABEL,
    },
    {
      latex: `= ${productTex(firstLeft, firstRight)} ${op} ${productTex(secondLeft, secondRight)}`,
      color: LABEL,
    },
    {
      latex: `${fnTex} ${degTex(goalDeg)} = \\dfrac{\\sqrt{6} ${op} \\sqrt{2}}{4}`,
      color: CIVIC,
    },
  ];
  const height = CIRCLE_BAND + rows.length * FRACTION_PITCH + 10;

  const innerRay = on(inner, R);
  const outerRay = on(outer, R);
  // The two wedge measures sit on their own bisectors at different radii. Same radius would
  // put them within a label's width of each other whenever the inner wedge is a small one.
  const innerLabel = on(inner / 2, 38);
  const outerLabel = on((inner + outer) / 2, 66);
  const innerIsGoal = inner === goalDeg;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <SvgMath
        latex={`${fnTex} ${degTex(goalDeg)} = ${fnTex}(${degTex(wholeDeg)} ${between} ${degTex(pieceDeg)})`}
        x={CX}
        y={20}
        fontSize={17}
        color={LABEL}
      />

      <circle cx={CX} cy={CY} r={R} fill="none" stroke={LINE} strokeWidth={1.5} />
      <line x1={CX - 24} y1={CY} x2={CX + REACH} y2={CY} stroke={LINE} strokeWidth={1} />

      <Wedge from={0} to={inner} radius={54} color={innerIsGoal ? CIVIC : SIGNAL_DEEP} />
      <Wedge
        from={inner}
        to={outer}
        radius={70}
        color={innerIsGoal ? SIGNAL_DEEP : CIVIC}
      />

      <line
        x1={CX}
        y1={CY}
        x2={innerRay.x}
        y2={innerRay.y}
        stroke={innerIsGoal ? CIVIC : SOFT}
        strokeWidth={innerIsGoal ? 2.4 : 1.6}
      />
      <line
        x1={CX}
        y1={CY}
        x2={outerRay.x}
        y2={outerRay.y}
        stroke={innerIsGoal ? SOFT : CIVIC}
        strokeWidth={innerIsGoal ? 1.6 : 2.4}
      />

      <SvgMath
        latex={degTex(inner)}
        x={innerLabel.x}
        y={innerLabel.y}
        fontSize={13}
        color={innerIsGoal ? CIVIC : SIGNAL_DEEP}
        plate
        w={72}
      />
      <SvgMath
        latex={degTex(outer - inner)}
        x={outerLabel.x}
        y={outerLabel.y}
        fontSize={13}
        color={innerIsGoal ? SIGNAL_DEEP : CIVIC}
        plate
        w={72}
      />
      <SvgMath
        latex={degTex(goalDeg)}
        x={on(goalDeg, RAY_LABEL_R).x}
        y={on(goalDeg, RAY_LABEL_R).y}
        fontSize={14}
        color={CIVIC}
        plate
        w={80}
      />

      {rows.map((row, index) => (
        <SvgMath
          key={row.latex}
          latex={row.latex}
          x={CX}
          y={CIRCLE_BAND + FRACTION_PITCH / 2 + index * FRACTION_PITCH}
          fontSize={16}
          color={row.color}
          w={430}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Archetype 2: the quadrant triangle                                          */
/* -------------------------------------------------------------------------- */

/** Center of the axis cross. */
const TCY = 118;
const AXIS_X = 112;
const AXIS_Y = 92;
/** The hypotenuse is drawn this long, whatever the triple. */
const HYP_PX = 84;
const TRIANGLE_BAND = 214;
const ROW_PITCH = 44;

/** Which side of the triangle the chosen identity actually reads. */
interface SidesUsed {
  opposite: boolean;
  adjacent: boolean;
}

/**
 * The doubling figure: a right triangle in the quadrant the prompt names, with the algebra
 * underneath.
 *
 * A side the identity never reads is drawn dashed and soft rather than left out, because
 * "there is a side here and you do not need it" is the point of the cosine shape, and an
 * absent side says nothing at all.
 */
export function QuadrantTriangleWorked({
  oppositeLeg,
  adjacentLeg,
  hyp,
  quadrantWord,
  used,
  rows,
  ariaLabel,
  title,
}: {
  /** Signed vertical leg: positive above the axis. */
  oppositeLeg: number;
  /** Signed horizontal leg: positive to the right. */
  adjacentLeg: number;
  hyp: number;
  quadrantWord: string;
  used: SidesUsed;
  rows: { latex: string; color: string }[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const unit = HYP_PX / hyp;
  const cornerX = CX + adjacentLeg * unit;
  const cornerY = TCY - oppositeLeg * unit;
  const height = TRIANGLE_BAND + rows.length * ROW_PITCH;
  const xDir = Math.sign(adjacentLeg) || 1;
  const yDir = Math.sign(oppositeLeg) || 1;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <line
        x1={CX - AXIS_X}
        y1={TCY}
        x2={CX + AXIS_X}
        y2={TCY}
        stroke={LINE}
        strokeWidth={1}
      />
      <line
        x1={CX}
        y1={TCY - AXIS_Y}
        x2={CX}
        y2={TCY + AXIS_Y}
        stroke={LINE}
        strokeWidth={1}
      />

      {/* The hypotenuse, which is the terminal side of the angle, always in the accent ink. */}
      <line x1={CX} y1={TCY} x2={cornerX} y2={cornerY} stroke={CIVIC} strokeWidth={2.4} />
      {/* The adjacent leg, along the horizontal axis. */}
      <line
        x1={CX}
        y1={TCY}
        x2={cornerX}
        y2={TCY}
        stroke={used.adjacent ? SIGNAL_DEEP : SOFT}
        strokeWidth={used.adjacent ? 2.2 : 1.4}
        strokeDasharray={used.adjacent ? undefined : "4 3"}
      />
      {/* The opposite leg, rising to meet the terminal side. */}
      <line
        x1={cornerX}
        y1={TCY}
        x2={cornerX}
        y2={cornerY}
        stroke={used.opposite ? SIGNAL_DEEP : SOFT}
        strokeWidth={used.opposite ? 2.2 : 1.4}
        strokeDasharray={used.opposite ? undefined : "4 3"}
      />
      {/* The right angle where the legs meet. */}
      <path
        d={`M ${cornerX - 9 * xDir} ${TCY} L ${cornerX - 9 * xDir} ${TCY - 9 * yDir} L ${cornerX} ${TCY - 9 * yDir}`}
        fill="none"
        stroke={LINE}
        strokeWidth={1}
      />
      <circle cx={cornerX} cy={cornerY} r={4} fill={CIVIC} />

      <SvgMath
        latex={`${adjacentLeg}`}
        x={(CX + cornerX) / 2}
        y={TCY + 16 * yDir}
        fontSize={13}
        color={used.adjacent ? SIGNAL_DEEP : SOFT}
        plate
        w={62}
      />
      <SvgMath
        latex={`${oppositeLeg}`}
        x={cornerX + 18 * xDir}
        y={(TCY + cornerY) / 2}
        fontSize={13}
        color={used.opposite ? SIGNAL_DEEP : SOFT}
        plate
        w={62}
      />
      <SvgMath
        latex={`${hyp}`}
        x={(CX + cornerX) / 2 - 16 * xDir}
        y={(TCY + cornerY) / 2 - 12 * yDir}
        fontSize={13}
        color={CIVIC}
        plate
        w={62}
      />

      {/* Top left, out of the way of whichever quadrant the triangle occupies. */}
      <text x={20} y={18} textAnchor="start" fontSize={13} fill={SOFT}>
        {quadrantWord} quadrant
      </text>

      {rows.map((row, index) => (
        <SvgMath
          key={row.latex}
          latex={row.latex}
          x={CX}
          y={TRIANGLE_BAND + ROW_PITCH / 2 + index * ROW_PITCH}
          fontSize={16}
          color={row.color}
          w={430}
        />
      ))}
    </svg>
  );
}

/** The quadrant a value's sign and function place the angle in, as a word. */
export const QUADRANT_WORD: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
};

/** The leg that partners `leg` in the triple with hypotenuse `hyp`. */
function otherLeg(leg: number, hyp: number): number {
  return Math.round(Math.sqrt(hyp * hyp - leg * leg));
}

export function signedFracTex(numerator: number, denominator: number): string {
  return numerator < 0
    ? `-\\dfrac{${-numerator}}{${denominator}}`
    : `\\dfrac{${numerator}}{${denominator}}`;
}

/** A value wrapped in parentheses when it is negative, so a product reads correctly. */
function factorTex(numerator: number, denominator: number): string {
  const tex = signedFracTex(numerator, denominator);
  return numerator < 0 ? `\\left(${tex}\\right)` : tex;
}

/* -------------------------------------------------------------------------- */
/* Archetype 3: the pattern board                                              */
/* -------------------------------------------------------------------------- */

const BOARD_TOP = 66;
const BOARD_PITCH = 42;

interface BoardOption {
  /** The option word, which is also the graded answer when this row is the match. */
  word: string;
  patternTex: string;
  isMatch: boolean;
}

/**
 * The naming figure: the drawn expression over the three candidate patterns, with the
 * matching one ringed and the single function it collapses to underneath.
 */
function PatternBoardWorked({
  expressionTex,
  lettersTex,
  options,
  collapsedTex,
  ariaLabel,
  title,
}: {
  expressionTex: string;
  /** What $A$ and $B$ stand for in this draw. */
  lettersTex: string;
  options: readonly BoardOption[];
  collapsedTex: string;
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const height = BOARD_TOP + options.length * BOARD_PITCH + 68;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <SvgMath latex={expressionTex} x={CX} y={22} fontSize={17} color={LABEL} w={430} />
      <SvgMath latex={lettersTex} x={CX} y={48} fontSize={14} color={SOFT} w={430} />

      {options.map((option, index) => {
        const rowY = BOARD_TOP + BOARD_PITCH / 2 + index * BOARD_PITCH;
        return (
          <g key={option.word}>
            {option.isMatch && (
              <rect
                x={22}
                y={rowY - 17}
                width={396}
                height={34}
                rx={9}
                fill={CIVIC}
                fillOpacity={0.12}
                stroke={CIVIC}
                strokeWidth={1.6}
              />
            )}
            <text
              x={36}
              y={rowY}
              textAnchor="start"
              dominantBaseline="central"
              fontSize={13}
              fill={option.isMatch ? CIVIC : SOFT}
            >
              {option.word}
            </text>
            <SvgMath
              latex={option.patternTex}
              x={286}
              y={rowY}
              fontSize={15}
              color={option.isMatch ? LABEL : SOFT}
              w={240}
            />
          </g>
        );
      })}

      <text x={CX} y={height - 46} textAnchor="middle" fontSize={13} fill={SOFT}>
        collapses to
      </text>
      <SvgMath
        latex={collapsedTex}
        x={CX}
        y={height - 22}
        fontSize={17}
        color={CIVIC}
        w={430}
      />
    </svg>
  );
}

/** How an angle argument is written when its multiplier is one. */
function argTex(multiple: number): string {
  return multiple === 1 ? "t" : `${multiple}t`;
}

/** The eight shapes `formula-name` draws from, in the generator's own order. */
function boardShapes(
  m: number,
  n: number,
): readonly {
  word: string;
  expression: string;
  pattern: string;
  collapsed: string;
  /** `true` when the shape is written in sines and cosines of one angle apiece. */
  sineFamily: boolean;
  combines: boolean;
}[] {
  const outer = argTex(m);
  const inner = argTex(n);
  return [
    {
      word: "sum",
      expression: `\\sin ${outer}\\cos ${inner} + \\cos ${outer}\\sin ${inner}`,
      pattern: "\\sin A\\cos B + \\cos A\\sin B",
      collapsed: `\\sin ${argTex(m + n)}`,
      sineFamily: true,
      combines: true,
    },
    {
      word: "sum",
      expression: `\\cos ${outer}\\cos ${inner} - \\sin ${outer}\\sin ${inner}`,
      pattern: "\\cos A\\cos B - \\sin A\\sin B",
      collapsed: `\\cos ${argTex(m + n)}`,
      sineFamily: false,
      combines: true,
    },
    {
      word: "difference",
      expression: `\\sin ${outer}\\cos ${inner} - \\cos ${outer}\\sin ${inner}`,
      pattern: "\\sin A\\cos B - \\cos A\\sin B",
      collapsed: `\\sin ${argTex(m - n)}`,
      sineFamily: true,
      combines: true,
    },
    {
      word: "difference",
      expression: `\\cos ${outer}\\cos ${inner} + \\sin ${outer}\\sin ${inner}`,
      pattern: "\\cos A\\cos B + \\sin A\\sin B",
      collapsed: `\\cos ${argTex(m - n)}`,
      sineFamily: false,
      combines: true,
    },
    {
      word: "double-angle",
      expression: `2\\sin ${outer}\\cos ${outer}`,
      pattern: "2\\sin A\\cos A",
      collapsed: `\\sin ${argTex(2 * m)}`,
      sineFamily: true,
      combines: false,
    },
    {
      word: "double-angle",
      expression: `\\cos^{2} ${outer} - \\sin^{2} ${outer}`,
      pattern: "\\cos^{2} A - \\sin^{2} A",
      collapsed: `\\cos ${argTex(2 * m)}`,
      sineFamily: false,
      combines: false,
    },
    {
      word: "double-angle",
      expression: `1 - 2\\sin^{2} ${outer}`,
      pattern: "1 - 2\\sin^{2} A",
      collapsed: `\\cos ${argTex(2 * m)}`,
      sineFamily: false,
      combines: false,
    },
    {
      word: "double-angle",
      expression: `2\\cos^{2} ${outer} - 1`,
      pattern: "2\\cos^{2} A - 1",
      collapsed: `\\cos ${argTex(2 * m)}`,
      sineFamily: false,
      combines: false,
    },
  ];
}

/**
 * The three rows the board prints: one per option word, each shown in the family the drawn
 * expression is written in.
 *
 * Printing all eight patterns would bury the near miss this figure exists for, so the two
 * combining rows are the pair that differ in exactly one operator, and the doubling row is the
 * one written in the same functions.
 */
function boardOptions(shapeIndex: number, m: number, n: number): BoardOption[] {
  const shapes = boardShapes(m, n);
  const drawn = shapes[shapeIndex] ?? shapes[0];
  const family = drawn?.sineFamily ?? true;
  /*
   * The row for the drawn word is the DRAWN shape, not the first of its word and family.
   * The doubling word covers four shapes and three of them share a family, so picking by
   * family alone ringed `\cos^{2} A - \sin^{2} A` over an expression reading `1 - 2\sin^{2} 4t`
   * or `2\cos^{2} 4t - 1`: a board whose whole point is "the row you should have matched"
   * printing a row the learner could not have matched.
   */
  const pick = (word: string) =>
    drawn?.word === word
      ? drawn
      : shapes.find((shape) => shape.word === word && shape.sineFamily === family);
  return ["sum", "difference", "double-angle"].flatMap((word) => {
    const shape = pick(word);
    return shape
      ? [{ word, patternTex: shape.pattern, isMatch: drawn?.word === word }]
      : [];
  });
}

/* -------------------------------------------------------------------------- */
/* Archetype 4: one circle per angle, side by side                             */
/* -------------------------------------------------------------------------- */

/*
 * `TRG9_TRIPLES` is the item bank's own table, imported at the top of this file rather than
 * copied, so `tripleA` and `tripleB` cannot index one array here and a different one there.
 * Its rows read `[given leg, partner leg, hypotenuse]`.
 *
 * Which leg is which is the part that is easy to get backwards, and it is fixed by the param
 * contract rather than by the shape of the numbers: the function the prompt STATES reads the
 * first leg and the one recovered from the identity reads the second. So `sin A = \tfrac{3}{5}`
 * and `cos A = \tfrac{3}{5}` are both `[3, 4, 5]`, and `givenSineA` is what says which.
 */

const ANGLE_R = 52;
const ANGLE_CY = 112;
/** Where each circle's own heading is written, above the rim. */
const ANGLE_HEADER_Y = 26;
/** The two circle centers, far enough apart that neither one's labels reach the other. */
const ANGLE_CX: readonly [number, number] = [116, 324];
/** How far off the horizontal axis a cosine reading is written. */
const COORD_GAP = 24;
/** How far off the vertical axis a sine reading is. */
const COORD_SIDE = 40;
/** Where the first substitution row is centered, clear of both circles. */
const PAIR_STRIP_TOP = 200;
const PAIR_PITCH = 50;

function sineNegativeIn(quadrant: number): boolean {
  return quadrant === 3 || quadrant === 4;
}

function cosineNegativeIn(quadrant: number): boolean {
  return quadrant === 2 || quadrant === 3;
}

interface AngleReadings {
  /** `A` or `B`, which is what the formula rows call it. */
  letter: string;
  quadrant: number;
  /** The sine's numerator over `hyp`, carrying the sign the quadrant gives it. */
  sine: number;
  /** The cosine's, likewise. */
  cosine: number;
  hyp: number;
  /** `true` when the prompt stated the sine, so the cosine is the recovered reading. */
  givenIsSine: boolean;
}

/** One angle's pair of readings, recovered from its triple and signed by its quadrant. */
function angleReadings(
  letter: string,
  triple: number,
  givenSine: number,
  quadrant: number,
): AngleReadings {
  const [given, partner, hyp] = TRG9_TRIPLES[triple] ?? ([3, 4, 5] as const);
  const givenIsSine = givenSine === 1;
  const sineLeg = givenIsSine ? given : partner;
  const cosineLeg = givenIsSine ? partner : given;
  return {
    letter,
    quadrant,
    sine: sineNegativeIn(quadrant) ? -sineLeg : sineLeg,
    cosine: cosineNegativeIn(quadrant) ? -cosineLeg : cosineLeg,
    hyp,
    givenIsSine,
  };
}

/**
 * One angle: its terminal side where the quadrant puts it, with both readings hung off the
 * axes they are measured on.
 *
 * Each reading sits on the FAR side of its own axis from the point, which is what keeps the
 * two apart at every triple in the table: the horizontal distance between them comes to the
 * point's own horizontal reach plus `COORD_SIDE`, and the shallowest triple here still reaches
 * about fifteen units. Placed on the same side as the point they would sit on the dashed drop
 * they are naming.
 *
 * The GIVEN reading is drawn in the reading ink and the RECOVERED one in the working ink, so
 * which of the two the prompt handed over survives into the picture. On this template that
 * distinction is half the question: a learner who reads both off the circle as though both
 * were given has skipped the identity.
 */
function AngleCircle({ cx, angle }: { cx: number; angle: AngleReadings }): JSX.Element {
  const { sine, cosine, hyp, givenIsSine, letter, quadrant } = angle;
  const sgnX = cosine < 0 ? -1 : 1;
  const sgnY = sine < 0 ? -1 : 1;
  const px = cx + (ANGLE_R * cosine) / hyp;
  const py = ANGLE_CY - (ANGLE_R * sine) / hyp;

  return (
    <g>
      <SvgMath
        latex={`${letter}\\;\\text{in the ${QUADRANT_WORD[quadrant] ?? "first"} quadrant}`}
        x={cx}
        y={ANGLE_HEADER_Y}
        fontSize={12}
        color={SOFT}
        w={200}
      />

      <circle
        cx={cx}
        cy={ANGLE_CY}
        r={ANGLE_R}
        fill="none"
        stroke={LINE}
        strokeWidth={1.2}
      />
      <line
        x1={cx - ANGLE_R - 10}
        y1={ANGLE_CY}
        x2={cx + ANGLE_R + 10}
        y2={ANGLE_CY}
        stroke={LINE}
        strokeWidth={1}
      />
      <line
        x1={cx}
        y1={ANGLE_CY - ANGLE_R - 10}
        x2={cx}
        y2={ANGLE_CY + ANGLE_R + 10}
        stroke={LINE}
        strokeWidth={1}
      />
      <line x1={cx} y1={ANGLE_CY} x2={px} y2={py} stroke={CIVIC} strokeWidth={2.2} />
      <line
        x1={px}
        y1={py}
        x2={px}
        y2={ANGLE_CY}
        stroke={SOFT}
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <line
        x1={px}
        y1={py}
        x2={cx}
        y2={py}
        stroke={SOFT}
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <circle cx={px} cy={py} r={4} fill={CIVIC} />

      <SvgMath
        latex={signedFracTex(cosine, hyp)}
        x={px}
        y={ANGLE_CY + sgnY * COORD_GAP}
        fontSize={12}
        color={givenIsSine ? SIGNAL_DEEP : LABEL}
        w={72}
        plate
      />
      <SvgMath
        latex={signedFracTex(sine, hyp)}
        x={cx - sgnX * COORD_SIDE}
        y={py}
        fontSize={12}
        color={givenIsSine ? LABEL : SIGNAL_DEEP}
        w={72}
        plate
      />
    </g>
  );
}

/** ` = <reduced>`, and nothing at all when reducing would not change the fraction. */
function reductionTail(numerator: number, denominator: number): string {
  const divisor = gcd(numerator, denominator);
  if (divisor === 1) {
    return "";
  }
  const top = numerator / divisor;
  const bottom = denominator / divisor;
  return ` = ${bottom === 1 ? `${top}` : signedFracTex(top, bottom)}`;
}

/** How a signed fraction is read aloud, for an `aria-label`. */
function spokenSigned(numerator: number, denominator: number): string {
  return `${numerator < 0 ? "negative " : ""}${Math.abs(numerator)} over ${denominator}`;
}

/**
 * The compound-angle figure: two circles, then the formula, the substitution and the answer.
 *
 * The formula is written in $A$ and $B$ and the two circles are headed $A$ and $B$, so the
 * substitution row below can be read straight off them left to right. That pairing is the
 * whole reason there are two pictures rather than one: this template asks for FOUR readings,
 * two of which were never given, and the ordinary miss is not the arithmetic but losing track
 * of which angle a sign belongs to.
 */
function TwoAngleWorked({
  first,
  second,
  shape,
}: {
  first: AngleReadings;
  second: AngleReadings;
  shape: number;
}): JSX.Element {
  const isSine = shape === 0 || shape === 1;
  const isDifference = shape === 1 || shape === 3;
  const between = isDifference ? "-" : "+";
  // Cosine flips the sign it carries; sine keeps it. The same one-line rule `SplitAngleWorked`
  // uses, and the same one the generator does.
  const op = isSine === isDifference ? "-" : "+";
  const fnTex = isSine ? "\\sin" : "\\cos";
  const den = first.hyp * second.hyp;
  const leading = isSine ? first.sine : first.cosine;
  const leadingPartner = second.cosine;
  const trailing = isSine ? first.cosine : first.sine;
  const trailingPartner = second.sine;
  const firstProduct = leading * leadingPartner;
  const secondProduct = (op === "+" ? 1 : -1) * trailing * trailingPartner;
  const total = firstProduct + secondProduct;

  const rows: { latex: string; color: string }[] = [
    {
      latex: isSine
        ? `\\sin(A ${between} B) = \\sin A\\cos B ${op} \\cos A\\sin B`
        : `\\cos(A ${between} B) = \\cos A\\cos B ${op} \\sin A\\sin B`,
      color: SOFT,
    },
    {
      latex: `= ${factorTex(leading, first.hyp)} \\cdot ${factorTex(leadingPartner, second.hyp)} ${op} ${factorTex(trailing, first.hyp)} \\cdot ${factorTex(trailingPartner, second.hyp)}`,
      color: LABEL,
    },
    {
      latex: `= ${signedFracTex(firstProduct, den)} ${secondProduct < 0 ? "-" : "+"} \\dfrac{${Math.abs(secondProduct)}}{${den}}`,
      color: LABEL,
    },
    {
      latex: `${fnTex}(A ${between} B) = ${signedFracTex(total, den)}${reductionTail(total, den)}`,
      color: CIVIC,
    },
  ];
  const height = PAIR_STRIP_TOP + (rows.length - 1) * PAIR_PITCH + 38;

  return (
    <svg
      viewBox={`0 0 440 ${height}`}
      role="img"
      aria-label={`Two circles side by side. A is in the ${QUADRANT_WORD[first.quadrant] ?? "first"} quadrant with sine ${spokenSigned(first.sine, first.hyp)} and cosine ${spokenSigned(first.cosine, first.hyp)}; B is in the ${QUADRANT_WORD[second.quadrant] ?? "first"} quadrant with sine ${spokenSigned(second.sine, second.hyp)} and cosine ${spokenSigned(second.cosine, second.hyp)}. The ${isSine ? "sine" : "cosine"} of A ${isDifference ? "minus" : "plus"} B comes to ${spokenSigned(total, den)}.`}
    >
      <title>
        Two angles, each with its own recovered reading and its own quadrant sign
      </title>

      <AngleCircle cx={ANGLE_CX[0]} angle={first} />
      <AngleCircle cx={ANGLE_CX[1]} angle={second} />

      {rows.map((row, index) => (
        <SvgMath
          key={row.latex}
          latex={row.latex}
          x={CX}
          y={PAIR_STRIP_TOP + index * PAIR_PITCH}
          fontSize={16}
          color={row.color}
          w={430}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The five entries                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The evaluation shape, as a factory over its fallback params.
 *
 * One caller since `difference-exact` was retired, and it stays a factory because the figure
 * it wires still draws BOTH signs: `isDifference` is a live param, not a constant folded into
 * the one surviving entry, and a check re-asking through `cfu.worked_solution_params` reaches
 * the other branch. Inlining it would bury that.
 */
function evaluationVisual(fallback: {
  isSine: number;
  a: number;
  b: number;
  target: number;
  isDifference: number;
}): WorkedSolutionVisual {
  return {
    Svg: ({
      isSine = fallback.isSine,
      isDifference = fallback.isDifference,
      a = fallback.a,
      b = fallback.b,
      target = fallback.target,
    }) => {
      const sine = isSine === 1;
      const difference = isDifference === 1;
      return (
        <SplitAngleWorked
          goalDeg={target}
          wholeDeg={a}
          pieceDeg={b}
          isSine={sine}
          isDifference={difference}
          ariaLabel={`A circle showing ${target} degrees as ${a} degrees ${difference ? "minus" : "plus"} ${b} degrees, over the substitution that evaluates the ${sine ? "sine" : "cosine"} of it exactly.`}
          title={`Evaluating a ${sine ? "sine" : "cosine"} with the ${difference ? "difference" : "sum"} formula`}
        />
      );
    },
    caption: ({
      isSine = fallback.isSine,
      isDifference = fallback.isDifference,
      a = fallback.a,
      b = fallback.b,
      target = fallback.target,
    }) => {
      const sine = isSine === 1;
      const difference = isDifference === 1;
      const op = (isSine === 1) === (isDifference === 1) ? "-" : "+";
      const fnTex = sine ? "\\sin" : "\\cos";
      const signSentence = sine
        ? `Sine keeps the sign it was given, so the two products are joined by a ${difference ? "minus" : "plus"} as well.`
        : `Cosine carries the OPPOSITE sign, so the ${difference ? "minus" : "plus"} between the angles becomes a ${op === "-" ? "minus" : "plus"} between the products.`;
      // Which wedge the accent colour lands on is not the same in the two cases, so the
      // sentence that reads them cannot be one sentence: `SplitAngleWorked` accents the wedge
      // on the GOAL's side, which is the goal itself when the goal is the smaller angle and is
      // the piece being added when it is the larger.
      const splitSentence = difference
        ? `The accent wedge is the angle asked for, left behind when the shaded $${degTex(b)}$ is taken off $${degTex(a)}$`
        : `The accent wedge is the $${degTex(b)}$ stacked onto the shaded $${degTex(a)}$, and the thicker ray it ends on is the angle asked for`;
      return `${splitSentence}, which is what makes $${degTex(target)}$ reachable at all: on its own it is not a special angle, but $${degTex(a)}$ and $${degTex(b)}$ both are. ${signSentence} Both products land over $4$, so the two numerators go over that one denominator and the radicals stay as they are: $${fnTex} ${degTex(target)} = \\dfrac{\\sqrt{6} ${op} \\sqrt{2}}{4}$.`;
    },
  };
}

export const TRG9_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d9.trg9.sum-exact.l1": evaluationVisual({
    isSine: 0,
    a: 45,
    b: 30,
    target: 75,
    isDifference: 0,
  }),

  "d9.trg9.double-sine.l2": {
    Svg: ({ sineLeg = 3, cosineLeg = 4, hyp = 5, quadrant = 1, doubled = 24 }) => {
      const negative = quadrant === 2;
      const adjacent = negative ? -cosineLeg : cosineLeg;
      const square = hyp * hyp;
      return (
        <QuadrantTriangleWorked
          oppositeLeg={sineLeg}
          adjacentLeg={adjacent}
          hyp={hyp}
          quadrantWord={QUADRANT_WORD[quadrant] ?? "first"}
          used={{ opposite: true, adjacent: true }}
          rows={[
            { latex: "\\sin 2\\theta = 2\\sin\\theta\\cos\\theta", color: SOFT },
            { latex: `\\cos\\theta = ${signedFracTex(adjacent, hyp)}`, color: LABEL },
            {
              latex: `= 2 \\cdot \\dfrac{${sineLeg}}{${hyp}} \\cdot ${factorTex(adjacent, hyp)}`,
              color: LABEL,
            },
            {
              latex: `\\sin 2\\theta = ${signedFracTex(doubled, square)}`,
              color: CIVIC,
            },
          ]}
          ariaLabel={`A right triangle in the ${QUADRANT_WORD[quadrant] ?? "first"} quadrant with legs ${adjacent} and ${sineLeg} and hypotenuse ${hyp}, over the doubling of the sine.`}
          title="Doubling a sine from a triangle in its quadrant"
        />
      );
    },
    caption: ({ cosineLeg = 4, hyp = 5, quadrant = 1, doubled = 24 }) => {
      const negative = quadrant === 2;
      const adjacent = negative ? -cosineLeg : cosineLeg;
      return `Both legs are live here, because $\\sin 2\\theta = 2\\sin\\theta\\cos\\theta$ reads the sine AND the cosine. The triangle supplies the missing leg, $${cosineLeg}$, and the quadrant supplies its sign, so $\\cos\\theta = ${signedFracTex(adjacent, hyp)}$. Multiplying through gives $${signedFracTex(doubled, hyp * hyp)}$, ${negative ? "which is negative because the cosine it multiplies is" : "which stays positive because both ratios are"}.`;
    },
  },

  "d9.trg9.formula-name.l2": {
    Svg: ({ shape = 0, m = 4, n = 2 }) => {
      const shapes = boardShapes(m, n);
      const drawn = shapes[shape] ?? shapes[0];
      if (!drawn) {
        throw new Error(`no TRG.9 naming shape at index ${shape}`);
      }
      return (
        <PatternBoardWorked
          expressionTex={drawn.expression}
          lettersTex={
            drawn.combines
              ? `A = ${argTex(m)}, \\quad B = ${argTex(n)}`
              : `A = ${argTex(m)}`
          }
          options={boardOptions(shape, m, n)}
          collapsedTex={drawn.collapsed}
          ariaLabel={`Three candidate patterns with the matching one ringed: the ${drawn.word} formula.`}
          title="Matching an expression against the three identities"
        />
      );
    },
    caption: ({ shape = 0, m = 4, n = 2 }) => {
      const shapes = boardShapes(m, n);
      const drawn = shapes[shape] ?? shapes[0];
      if (!drawn) {
        return "";
      }
      const countSentence = drawn.combines
        ? `Two different angles appear, $${argTex(m)}$ and $${argTex(n)}$, which rules out the row that folds a single angle into twice itself.`
        : `Every function here sits at the one angle $${argTex(m)}$. A combining row can still be read onto that with $A$ and $B$ equal, which is exactly why the question sorts by how many DIFFERENT angles the expression is written over, and by that count neither combining row is what this is.`;
      const signSentence = drawn.combines
        ? "The two combining rows differ in one operator only, and that is the whole question: where each product pairs a sine with the other angle's cosine the operator in the middle matches the one between the angles, and where the products pair like function with like it is the reverse."
        : "The doubling identity has more than one form and the Pythagorean identity turns one into another, so the ringed row is the form this expression is written in rather than the only form that would collapse it.";
      return `${countSentence} ${signSentence} The ringed row is the match, so the answer is ${drawn.word}, and the expression collapses to $${drawn.collapsed}$.`;
    },
  },

  "d9.trg9.double-cosine.l3": {
    Svg: ({
      givenIsSine = 1,
      givenLeg = 24,
      hyp = 25,
      negative = 0,
      quadrant = 1,
      value = -527,
    }) => {
      const partner = otherLeg(givenLeg, hyp);
      const isNegative = negative === 1;
      const sineLeg = givenIsSine === 1 ? givenLeg : partner;
      const cosineLeg = givenIsSine === 1 ? partner : givenLeg;
      // The signs the named quadrant gives each leg, so the drawing agrees with the prompt.
      const opposite = quadrant === 3 || quadrant === 4 ? -sineLeg : sineLeg;
      const adjacent = quadrant === 2 || quadrant === 3 ? -cosineLeg : cosineLeg;
      const square = hyp * hyp;
      const givenSquare = givenLeg * givenLeg;
      const signedGiven = isNegative ? -givenLeg : givenLeg;
      return (
        <QuadrantTriangleWorked
          oppositeLeg={opposite}
          adjacentLeg={adjacent}
          hyp={hyp}
          quadrantWord={QUADRANT_WORD[quadrant] ?? "first"}
          used={{ opposite: givenIsSine === 1, adjacent: givenIsSine !== 1 }}
          rows={[
            {
              latex:
                givenIsSine === 1
                  ? "\\cos 2\\theta = 1 - 2\\sin^{2}\\theta"
                  : "\\cos 2\\theta = 2\\cos^{2}\\theta - 1",
              color: SOFT,
            },
            {
              latex: `\\left(${signedFracTex(signedGiven, hyp)}\\right)^{2} = \\dfrac{${givenSquare}}{${square}}`,
              color: LABEL,
            },
            {
              latex:
                givenIsSine === 1
                  ? `= \\dfrac{${square}}{${square}} - \\dfrac{${2 * givenSquare}}{${square}}`
                  : `= \\dfrac{${2 * givenSquare}}{${square}} - \\dfrac{${square}}{${square}}`,
              color: LABEL,
            },
            { latex: `\\cos 2\\theta = ${signedFracTex(value, square)}`, color: CIVIC },
          ]}
          ariaLabel={`A right triangle in the ${QUADRANT_WORD[quadrant] ?? "first"} quadrant, with the leg the chosen identity never reads drawn dashed, over the doubling of the cosine.`}
          title="Doubling a cosine from the form written in the given function"
        />
      );
    },
    caption: ({ givenIsSine = 1, givenLeg = 24, hyp = 25, negative = 0, value = -527 }) => {
      const partner = otherLeg(givenLeg, hyp);
      const square = hyp * hyp;
      const word = givenIsSine === 1 ? "sine" : "cosine";
      const formTex =
        givenIsSine === 1
          ? "\\cos 2\\theta = 1 - 2\\sin^{2}\\theta"
          : "\\cos 2\\theta = 2\\cos^{2}\\theta - 1";
      return `The dashed leg is the one this solution never reads. Choosing $${formTex}$, the form written in the ${word} alone, means the other side of the triangle, $${partner}$, is never worked out and the quadrant never enters: the given value appears SQUARED, so ${negative === 1 ? "the minus sign it was handed disappears" : "any sign it carried would disappear"} on the way. What is left is a subtraction over $${square}$, giving $${signedFracTex(value, square)}$.`;
    },
  },

  // The defaults are the worked example the shape was authored from: $\sin A = \tfrac{3}{5}$ in
  // the second quadrant and $\cos B = \tfrac{5}{13}$ in the fourth, asked for $\cos(A - B)$.
  "d9.trg9.compound-angle.l3": {
    Svg: ({
      tripleA = 0,
      tripleB = 1,
      givenSineA = 1,
      givenSineB = 0,
      quadrantA = 2,
      quadrantB = 4,
      shape = 3,
    }) => (
      <TwoAngleWorked
        first={angleReadings("A", tripleA, givenSineA, quadrantA)}
        second={angleReadings("B", tripleB, givenSineB, quadrantB)}
        shape={shape}
      />
    ),
    caption: ({
      tripleA = 0,
      tripleB = 1,
      givenSineA = 1,
      givenSineB = 0,
      quadrantA = 2,
      quadrantB = 4,
      shape = 3,
    }) => {
      const first = angleReadings("A", tripleA, givenSineA, quadrantA);
      const second = angleReadings("B", tripleB, givenSineB, quadrantB);
      const isSine = shape === 0 || shape === 1;
      const isDifference = shape === 1 || shape === 3;
      const op = isSine === isDifference ? "-" : "+";
      const den = first.hyp * second.hyp;
      const total = isSine
        ? first.sine * second.cosine + (op === "+" ? 1 : -1) * first.cosine * second.sine
        : first.cosine * second.cosine + (op === "+" ? 1 : -1) * first.sine * second.sine;
      const recovered = `$${first.givenIsSine ? "\\cos" : "\\sin"} A$ and $${second.givenIsSine ? "\\cos" : "\\sin"} B$`;
      const signSentence = isSine
        ? `Sine keeps the sign it was given, so the ${isDifference ? "minus" : "plus"} between the angles is the ${isDifference ? "minus" : "plus"} between the products.`
        : `Cosine carries the OPPOSITE sign, so the ${isDifference ? "minus" : "plus"} between the angles becomes a ${op === "-" ? "minus" : "plus"} between the products.`;
      return `Four readings go into this and only two of them were handed over: ${recovered} come off the identity, and each one's sign comes off its own quadrant rather than the other's. That is what the two circles are for. ${signSentence} Both products land over $${den}$, so they go over that one denominator: $${signedFracTex(total, den)}${reductionTail(total, den)}$.`;
    },
  },
};
