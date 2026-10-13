/**
 * Worked-solution figures for the D10-shaped TRG.4 practice templates: turning a reading
 * over, dividing one reading by another, naming the family a line belongs to, recovering the
 * reading you were not given, and collapsing a two-factor compound onto a single function.
 *
 * Three of the five are pictures rather than step columns, and each is a picture because the
 * template's usual miss is not arithmetic. A learner who gets `reciprocal-value` wrong has
 * almost always paired the cosine with the cosecant, which is a fact about WHICH two boxes are
 * joined; one who gets `pythagorean-solve` or `compound-evaluate` wrong has usually taken the
 * positive root, which is a fact about WHERE on the pad the point sits. Neither shows up in a
 * column of equations.
 *
 * `quotient-value` is the exception and it takes the shared `ExpressionReductionWorked`
 * archetype, because there the work really is a chain: the identity, the division, the
 * cancellation, the sign.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for
 * each, and recomputes what `generate()` computed by the same route.
 */

import { TRG4_HEADINGS, TRG4_IDENTITY_LINES } from "@cr/item-bank";
import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { ExpressionReductionWorked, type WorkedSolutionVisual } from "../workedKit";

/* -------------------------------------------------------------------------- */
/* Shared vocabulary, mirroring the item bank's                                */
/* -------------------------------------------------------------------------- */

/**
 * The vertical pitch between two rows of the working column, in user units.
 *
 * Read off the rows that were already there rather than chosen: `PythagoreanSolveWorked` sets
 * them at 48, 104 and 164, and a display fraction paints about 37 units tall, so this is the
 * gap that keeps two stacked fractions apart. Named because the closing row TRG.4's check adds
 * has to keep the same one.
 */
const ROW_PITCH = 56;

/** `-\dfrac{a}{b}` or `\dfrac{a}{b}`, with the sign kept outside the fraction. */
function tex(n: number, d: number, negative: boolean): string {
  return `${negative ? "-" : ""}\\dfrac{${n}}{${d}}`;
}

/** How a fraction is read aloud, for an `aria-label`. */
function spokenFrac(n: number, d: number, negative: boolean): string {
  return `${negative ? "negative " : ""}${n} over ${d}`;
}

const NUMERAL: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };

function sineNegative(quadrant: number): boolean {
  return quadrant === 3 || quadrant === 4;
}

function cosineNegative(quadrant: number): boolean {
  return quadrant === 2 || quadrant === 3;
}

interface FunctionFacts {
  sym: string;
  name: string;
  even: boolean;
}

/** The six, in the order the item bank's `fn` param indexes them. */
const FUNCTIONS: readonly FunctionFacts[] = [
  { sym: "\\sin", name: "sine", even: false },
  { sym: "\\cos", name: "cosine", even: true },
  { sym: "\\tan", name: "tangent", even: false },
  { sym: "\\csc", name: "cosecant", even: false },
  { sym: "\\sec", name: "secant", even: true },
  { sym: "\\cot", name: "cotangent", even: false },
];

function facts(fn: number): FunctionFacts {
  return FUNCTIONS[fn] ?? (FUNCTIONS[0] as FunctionFacts);
}

/** The three reciprocal pairs as `[plain, reciprocal]` indices, as the item bank orders them. */
const RECIPROCAL_PAIRS: readonly (readonly [number, number])[] = [
  [0, 3],
  [1, 4],
  [2, 5],
];

/**
 * The plain function a reciprocal one turns over, or `undefined` when it is already plain.
 *
 * Read off `RECIPROCAL_PAIRS` rather than written out again, so the two answers cannot come
 * apart: the L1 figure and the L3 caption are both claiming the same three pairings.
 */
function turnsOver(fn: number): FunctionFacts | undefined {
  const pair = RECIPROCAL_PAIRS.find(([, reciprocal]) => reciprocal === fn);
  return pair === undefined ? undefined : facts(pair[0]);
}

/** Which two functions an L1 draw is about, given its `pair` and `direction`. */
function reciprocalRoles(
  pair: number,
  direction: number,
): {
  given: FunctionFacts;
  target: FunctionFacts;
} {
  const [plain, reciprocal] = (RECIPROCAL_PAIRS[pair] ?? RECIPROCAL_PAIRS[0]) as readonly [
    number,
    number,
  ];
  return {
    given: facts(direction === 0 ? plain : reciprocal),
    target: facts(direction === 0 ? reciprocal : plain),
  };
}

/* -------------------------------------------------------------------------- */
/* L1: one reading, turned over                                                */
/* -------------------------------------------------------------------------- */

/**
 * The given reading in one box, its partner in another, and the statement that makes them
 * partners underneath.
 *
 * Both boxes name their FUNCTION above the value, because the miss this figure is for is a
 * pairing miss rather than an arithmetic one: a learner who turned the fraction over
 * correctly and hung the wrong name on it has done the only hard part wrong, and a figure
 * showing two bare fractions would show them nothing.
 */
function ReciprocalTurnWorked({
  given,
  target,
  n,
  d,
}: {
  given: FunctionFacts;
  target: FunctionFacts;
  n: number;
  d: number;
}): JSX.Element {
  const box = (
    x: number,
    colour: string,
    entry: FunctionFacts,
    top: number,
    bottom: number,
  ) => (
    <g>
      <rect
        x={x}
        y={38}
        width={140}
        height={116}
        rx={10}
        fill="none"
        stroke={colour}
        strokeWidth={1.6}
      />
      <SvgMath
        latex={`${entry.sym}\\theta`}
        x={x + 70}
        y={62}
        fontSize={14}
        color={SOFT}
        w={120}
      />
      <SvgMath
        latex={tex(top, bottom, false)}
        x={x + 70}
        y={110}
        fontSize={18}
        color={colour === CIVIC ? CIVIC : LABEL}
        w={120}
      />
    </g>
  );

  return (
    <svg
      viewBox="0 0 440 200"
      role="img"
      aria-label={`The ${given.name} reading ${spokenFrac(n, d, false)} turned over to give the ${target.name} reading ${spokenFrac(d, n, false)}`}
    >
      <title>A reading and its reciprocal partner, side by side</title>

      {box(40, LINE, given, n, d)}
      {box(260, CIVIC, target, d, n)}

      <line x1={190} y1={96} x2={248} y2={96} stroke={SIGNAL} strokeWidth={1.6} />
      <path d="M 250 96 L 241 91 L 241 101 Z" fill={SIGNAL} />
      <text x={219} y={80} textAnchor="middle" fontSize={10} fill={SIGNAL}>
        turn it over
      </text>

      <SvgMath
        latex={`${given.sym}\\theta \\cdot ${target.sym}\\theta = 1`}
        x={220}
        y={180}
        fontSize={15}
        color={SIGNAL}
        w={280}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* L3a: the point on the pad, and the root the quadrant chose                  */
/* -------------------------------------------------------------------------- */

/**
 * The unit circle with the heading's point marked, both coordinates dropped onto their axes,
 * and the three lines of the recovery beside it.
 *
 * The point is drawn AT the item's own coordinates, so the quadrant argument in the last row
 * is a description of the picture rather than a claim beside it. That is the whole reason this
 * figure is not a step column: a learner who took the positive root has not made an
 * arithmetic error, they have not looked at where the point is.
 *
 * `closingTex` is for a question that does not STOP at the recovered reading. TRG.4's check
 * divides the two readings afterwards and is graded on the quotient, so its figure owes a
 * fourth line; the pooled item ends at the third and passes nothing, which leaves it drawn
 * exactly as before. Where it is supplied the recovered reading steps back to the working ink,
 * since it has stopped being the answer and started being a step towards one.
 */
export function PythagoreanSolveWorked({
  a,
  b,
  c,
  quadrant,
  given,
  closingTex,
}: {
  a: number;
  b: number;
  c: number;
  quadrant: number;
  given: number;
  closingTex?: string;
}): JSX.Element {
  const cx = 96;
  const cy = 100;
  const r = 62;
  const sinNeg = sineNegative(quadrant);
  const cosNeg = cosineNegative(quadrant);
  // The closing row takes a WHOLE row's pitch, the same one the three rows above it keep, and
  // the frame grows by that much. A tighter gap measures clean and reads as one stacked
  // fraction: at 28 units the bottom of $-\dfrac{3}{5}$ sat about 4px off the top of
  // $\dfrac{4}{3}$, which is two answers a learner has to pull apart before reading either.
  // The drawing is then dropped to sit against the middle of the taller column beside it,
  // rather than riding at the top of a frame that grew underneath it.
  const lift = closingTex === undefined ? 0 : ROW_PITCH / 2 + 6;
  const height = closingTex === undefined ? 200 : 200 + ROW_PITCH;
  const px = cx + (r * b * (cosNeg ? -1 : 1)) / c;
  const py = cy - (r * a * (sinNeg ? -1 : 1)) / c;

  const targetSym = given === 0 ? "\\cos" : "\\sin";
  const gn = given === 0 ? a : b;
  const tn = given === 0 ? b : a;
  const givenNeg = given === 0 ? sinNeg : cosNeg;
  const targetNeg = given === 0 ? cosNeg : sinNeg;

  return (
    <svg
      viewBox={`0 0 440 ${height}`}
      role="img"
      aria-label={`A heading in Quadrant ${NUMERAL[quadrant]} whose ${given === 0 ? "sine" : "cosine"} is ${spokenFrac(gn, c, givenNeg)}, and whose ${given === 0 ? "cosine" : "sine"} is ${spokenFrac(tn, c, targetNeg)}`}
    >
      <title>
        The point on the unit circle, and which of the two roots the quadrant takes
      </title>

      <g transform={`translate(0 ${lift})`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={LINE} strokeWidth={1.2} />
        <line
          x1={cx - r - 12}
          y1={cy}
          x2={cx + r + 12}
          y2={cy}
          stroke={LINE}
          strokeWidth={1}
        />
        <line
          x1={cx}
          y1={cy - r - 12}
          x2={cx}
          y2={cy + r + 12}
          stroke={LINE}
          strokeWidth={1}
        />
        <line x1={cx} y1={cy} x2={px} y2={py} stroke={SIGNAL} strokeWidth={1.8} />
        {/* Both coordinates dropped onto their own axes, so the two signs are read off the
          picture rather than taken on trust from the row beside it. */}
        <line
          x1={px}
          y1={py}
          x2={px}
          y2={cy}
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
        <circle cx={px} cy={py} r={4} fill={SIGNAL} />

        {/* Both names are struck at a FIXED offset from an axis while the point they belong
          to rides the heading, so where each one lands relative to the rim is a function of
          the triple. Measured over all 96 draws the template can produce, 92 of them paint
          one of these two across the circle stroke: the cosine's on the twelve headings
          whose horizontal reach is wide, the sine's on the twelve whose vertical reach is,
          and every triple is one or the other. So both are plated rather than moved — the
          offsets are what keep each name on the axis it reports, and a name nudged off the
          rim would be a name nudged off its own coordinate.

          The plate is the CARD, which is what bare `plate` resolves to. Not `plate="plot"`:
          that paints `var(--paper)`, and `.lesson-visual` fills this figure's card with
          `var(--paper-deep)`, so the lighter patch would read as an opaque white box behind
          the label. That is the exact defect #456 removed from D9's circles. */}
        <SvgMath
          latex="\cos\theta"
          x={px}
          y={cy + (sinNeg ? -16 : 16)}
          fontSize={11}
          color={given === 0 ? CIVIC : LABEL}
          w={54}
          plate
        />
        <SvgMath
          latex="\sin\theta"
          x={cx + (cosNeg ? 30 : -30)}
          y={py}
          fontSize={11}
          color={given === 0 ? LABEL : CIVIC}
          w={54}
          plate
        />
      </g>

      <SvgMath
        latex="\sin^{2}\theta + \cos^{2}\theta = 1"
        x={310}
        y={48}
        fontSize={14}
        color={LABEL}
        w={250}
      />
      <SvgMath
        latex={`${targetSym}^{2}\\theta = 1 - \\dfrac{${gn * gn}}{${c * c}} = \\dfrac{${tn * tn}}{${c * c}}`}
        x={310}
        y={104}
        fontSize={14}
        color={SIGNAL}
        w={250}
      />
      <SvgMath
        latex={`${targetSym}\\theta = ${tex(tn, c, targetNeg)}`}
        x={310}
        y={164}
        fontSize={16}
        color={closingTex === undefined ? CIVIC : LABEL}
        w={250}
      />

      {closingTex !== undefined && (
        <SvgMath
          latex={closingTex}
          x={310}
          y={164 + ROW_PITCH}
          fontSize={16}
          color={CIVIC}
          w={250}
        />
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* L3b: which of the three families                                            */
/* -------------------------------------------------------------------------- */

/** The line a `line` param names, from the item bank's own table rather than from a copy. */
function identityLine(line: number): { latex: string } {
  return (
    TRG4_IDENTITY_LINES[line] ??
    (TRG4_IDENTITY_LINES[0] as (typeof TRG4_IDENTITY_LINES)[number])
  );
}

/** The three families, in the order the item bank's `family` param indexes them. */
const FAMILY_CARDS: readonly { shape: string; label: string; name: string }[] = [
  { shape: "f^{2} + g^{2} = 1", label: "squares, against one", name: "Pythagorean" },
  { shape: "\\dfrac{f}{g} = h", label: "one reading over another", name: "quotient" },
  { shape: "f \\cdot g = 1", label: "a pair, turned over", name: "reciprocal" },
];

/** The learner's own line read aloud, for an `aria-label`. */
function spokenLine(latex: string): string {
  return latex
    .replace(
      /\\dfrac\{([^}]*)\}\{([^}]*)\}/g,
      (_match, top: string, bottom: string) =>
        `${spokenLine(top)} over ${spokenLine(bottom)}`,
    )
    .replace(/\\sin/g, "sine")
    .replace(/\\cos/g, "cosine")
    .replace(/\\tan/g, "tangent")
    .replace(/\\cot/g, "cotangent")
    .replace(/\\sec/g, "secant")
    .replace(/\\csc/g, "cosecant")
    .replace(/\\theta/g, " theta")
    .replace(/\\cdot/g, " times ")
    .replace(/\^\{2\}/g, " squared")
    .replace(/=/g, " equals ")
    .replace(/-/g, " minus ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The learner's own line across the top, and the three shapes beneath it with theirs marked.
 *
 * The cards are written with `f`, `g` and `h` rather than with named functions on purpose. The
 * whole difficulty of this template is that the same function appears in all three families, so
 * a card carrying a `\sin` in one box and a `\cos` in another would teach the learner to sort
 * by which function is written, which is exactly the wrong rule.
 *
 * **The line itself is what the top row is for, and it was missing.** This figure took only
 * `family`, which is a fact about the ANSWER, so all four Pythagorean draws rendered one
 * identical picture and the diagram never showed the learner the problem they had just been
 * asked. Twelve lines shared three pictures. Sorting is a claim about a particular line, and a
 * figure that omits it can only be read as a statement about the three cards in general: the
 * one thing the marked card has to do is answer to something visible above it.
 */
function IdentityFamilyWorked({
  family,
  latex,
}: {
  family: number;
  latex: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 440 232"
      role="img"
      aria-label={`The line ${spokenLine(latex)}, sorted into the ${FAMILY_CARDS[family]?.name ?? "Pythagorean"} one of the three families of identity`}
    >
      <title>One line, and which of three shapes it has</title>

      <SvgMath latex={latex} x={220} y={30} fontSize={17} color={LABEL} w={400} />

      {FAMILY_CARDS.map((card, index) => {
        const x = 18 + index * 138;
        const chosen = index === family;
        const colour = chosen ? CIVIC : LINE;
        return (
          <g key={card.name}>
            <rect
              x={x}
              y={78}
              width={124}
              height={100}
              rx={10}
              fill="none"
              stroke={colour}
              strokeWidth={chosen ? 2.2 : 1.2}
              strokeDasharray={chosen ? undefined : "5 4"}
            />
            <SvgMath
              latex={card.shape}
              x={x + 62}
              y={120}
              fontSize={15}
              color={chosen ? CIVIC : SOFT}
              w={116}
            />
            <text
              x={x + 62}
              y={162}
              textAnchor="middle"
              fontSize={9.5}
              fill={chosen ? CIVIC : SOFT}
            >
              {card.label}
            </text>
          </g>
        );
      })}

      <text x={220} y={206} textAnchor="middle" fontSize={10} fill={SOFT}>
        f, g and h stand for any of the six functions
      </text>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* L3c: one reading, a quadrant, and a product that collapses                  */
/* -------------------------------------------------------------------------- */

type Heading = (typeof TRG4_HEADINGS)[number];

function heading(triple: number): Heading {
  return TRG4_HEADINGS[triple] ?? (TRG4_HEADINGS[0] as Heading);
}

/**
 * Each of the six written out in sines and cosines, indexed the way `FUNCTIONS` is.
 *
 * The tangent and the cotangent are spelled as quotients rather than left as themselves,
 * because the middle row of this figure is where the cancellation happens: `\tan(-\theta)`
 * against a cosecant only visibly collapses to a secant once the sine on the top and the sine
 * underneath are both on the page.
 */
const EXPANDED: readonly string[] = [
  "\\sin\\theta",
  "\\cos\\theta",
  "\\dfrac{\\sin\\theta}{\\cos\\theta}",
  "\\dfrac{1}{\\sin\\theta}",
  "\\dfrac{1}{\\cos\\theta}",
  "\\dfrac{\\cos\\theta}{\\sin\\theta}",
];

interface CompoundShape {
  /** `FUNCTIONS` index of the factor written at the REVERSED heading. */
  first: number;
  /** `FUNCTIONS` index of the second factor, written at the heading itself. */
  second: number;
  /** `FUNCTIONS` index of the single function the product comes to. */
  collapsed: number;
  /** Whether that single function carries a minus in front of it. */
  negated: boolean;
}

/** The four products, in the order the item bank's `shape` param indexes them. */
const COMPOUND_SHAPES: readonly CompoundShape[] = [
  { first: 0, second: 4, collapsed: 2, negated: true },
  { first: 1, second: 3, collapsed: 5, negated: false },
  { first: 2, second: 3, collapsed: 4, negated: true },
  { first: 4, second: 0, collapsed: 2, negated: false },
];

function compoundShape(shape: number): CompoundShape {
  return COMPOUND_SHAPES[shape] ?? (COMPOUND_SHAPES[0] as CompoundShape);
}

/**
 * What one of the six reads at a heading, as an unsigned fraction plus the sign the quadrant
 * gives it. Every value comes off the two legs and the hypotenuse, so nothing here reduces:
 * the triples are primitive, which is the reason the item bank insists on that.
 */
function reading(
  fn: number,
  { a, b, c }: Heading,
  sinNeg: boolean,
  cosNeg: boolean,
): { n: number; d: number; negative: boolean } {
  switch (fn) {
    case 0:
      return { n: a, d: c, negative: sinNeg };
    case 1:
      return { n: b, d: c, negative: cosNeg };
    case 2:
      return { n: a, d: b, negative: sinNeg !== cosNeg };
    case 3:
      return { n: c, d: a, negative: sinNeg };
    case 4:
      return { n: c, d: b, negative: cosNeg };
    default:
      return { n: b, d: a, negative: sinNeg !== cosNeg };
  }
}

/** How far off the horizontal axis the cosine's own reading is written. */
const COORD_GAP = 24;
/** How far off the vertical axis the sine's is. */
const COORD_SIDE = 44;

/**
 * The compound figure: the heading drawn where the quadrant puts it with both readings hung
 * off their own axes, the recovery beside it, and the collapse underneath.
 *
 * Three decisions make this L3 and the figure has to carry all three, because a learner can
 * get two of them right and still be wrong. The reading they were NOT given is recovered from
 * the identity, which is the right column. Its SIGN comes from the quadrant, which is why the
 * point is drawn at the item's own coordinates rather than in a generic first-quadrant
 * sketch — the two dropped perpendiculars are what make the signs readable rather than
 * asserted. And the first factor is written at the reversed heading, so it flips or does not
 * flip according to the parity of that one function, which is the bottom strip.
 *
 * The two readings are placed on the far side of the axis from the point, the same rule
 * `PythagoreanSolveWorked` uses. That is what keeps them apart from each other at every
 * heading the table can produce: the horizontal separation between them comes to the point's
 * own reach plus `COORD_SIDE`, which is never less than about 58 units even for the shallowest
 * triple in the table.
 */
function CompoundCollapseWorked({
  entry,
  quadrant,
  givenSine,
  shape,
}: {
  entry: Heading;
  quadrant: number;
  /** `1` when the prompt states the sine, `0` when it states the cosine. */
  givenSine: number;
  shape: number;
}): JSX.Element {
  const { a, b, c } = entry;
  const cx = 104;
  const cy = 108;
  const r = 62;
  const sinNeg = sineNegative(quadrant);
  const cosNeg = cosineNegative(quadrant);
  /** Which way along each axis the point lies: the sign of that coordinate. */
  const sgnX = cosNeg ? -1 : 1;
  const sgnY = sinNeg ? -1 : 1;
  const px = cx + (sgnX * r * b) / c;
  const py = cy - (sgnY * r * a) / c;

  const givenIsSine = givenSine === 1;
  const missingSym = givenIsSine ? "\\cos" : "\\sin";
  const givenN = givenIsSine ? a : b;
  const missingN = givenIsSine ? b : a;
  const missingNeg = givenIsSine ? cosNeg : sinNeg;

  const { first, second, collapsed, negated } = compoundShape(shape);
  const firstFacts = facts(first);
  const secondFacts = facts(second);
  const collapsedFacts = facts(collapsed);
  const flipped = !firstFacts.even;
  const collapsedTex = `${negated ? "-" : ""}${collapsedFacts.sym}\\theta`;
  const answer = reading(collapsed, entry, sinNeg, cosNeg);
  const answerNegative = answer.negative !== negated;

  return (
    <svg
      viewBox="0 0 440 336"
      role="img"
      aria-label={`A heading in Quadrant ${NUMERAL[quadrant]} whose ${givenIsSine ? "sine" : "cosine"} is ${spokenFrac(givenN, c, givenIsSine ? sinNeg : cosNeg)} and whose ${givenIsSine ? "cosine" : "sine"} is ${spokenFrac(missingN, c, missingNeg)}, and the product ${firstFacts.name} of the reversed heading times ${secondFacts.name} of it, which comes to ${spokenFrac(answer.n, answer.d, answerNegative)}`}
    >
      <title>
        The two readings the quadrant fixes, and the single function the product comes to
      </title>

      <circle cx={cx} cy={cy} r={r} fill="none" stroke={LINE} strokeWidth={1.2} />
      <line
        x1={cx - r - 12}
        y1={cy}
        x2={cx + r + 12}
        y2={cy}
        stroke={LINE}
        strokeWidth={1}
      />
      <line
        x1={cx}
        y1={cy - r - 12}
        x2={cx}
        y2={cy + r + 12}
        stroke={LINE}
        strokeWidth={1}
      />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={SIGNAL} strokeWidth={1.8} />
      {/* Both coordinates dropped onto their own axes, so each sign is read off the picture
        rather than taken on trust from the row beside it. */}
      <line
        x1={px}
        y1={py}
        x2={px}
        y2={cy}
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
      <circle cx={px} cy={py} r={4} fill={SIGNAL} />

      {/* Each reading on the far side of its own axis from the point, plated against the card
        the way D9's other circles are. The RECOVERED one is drawn in the reading ink and the
        given one in the working ink, which is the pairing that carries: the recovery row on
        the right is in that same ink, so the reading the learner has to work out and the row
        that works it out are one colour, and which of the two the prompt handed over is still
        legible from the drawing rather than only from a prompt already scrolled past. */}
      <SvgMath
        latex={tex(b, c, cosNeg)}
        x={px}
        y={cy + sgnY * COORD_GAP}
        fontSize={12}
        color={givenIsSine ? SIGNAL : LABEL}
        w={72}
        plate
      />
      <SvgMath
        latex={tex(a, c, sinNeg)}
        x={cx - sgnX * COORD_SIDE}
        y={py}
        fontSize={12}
        color={givenIsSine ? LABEL : SIGNAL}
        w={72}
        plate
      />

      <text x={cx} y={196} textAnchor="middle" fontSize={11} fill={SOFT}>
        Quadrant {NUMERAL[quadrant]}
      </text>

      <SvgMath
        latex="\sin^{2}\theta + \cos^{2}\theta = 1"
        x={306}
        y={52}
        fontSize={14}
        color={SOFT}
        w={262}
      />
      <SvgMath
        latex={`${missingSym}^{2}\\theta = 1 - \\dfrac{${givenN * givenN}}{${c * c}} = \\dfrac{${missingN * missingN}}{${c * c}}`}
        x={306}
        y={106}
        fontSize={14}
        color={LABEL}
        w={262}
      />
      <SvgMath
        latex={`${missingSym}\\theta = ${tex(missingN, c, missingNeg)}`}
        x={306}
        y={162}
        fontSize={15}
        color={SIGNAL}
        w={262}
      />

      <SvgMath
        latex={`${firstFacts.sym}(-\\theta)${secondFacts.sym}\\theta = ${flipped ? "-" : ""}${EXPANDED[first]} \\cdot ${EXPANDED[second]} = ${collapsedTex}`}
        x={220}
        y={236}
        fontSize={16}
        color={LABEL}
        w={430}
      />
      <SvgMath
        latex={`${collapsedTex} = ${tex(answer.n, answer.d, answerNegative)}`}
        x={220}
        y={294}
        fontSize={17}
        color={CIVIC}
        w={430}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const TRG4_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d9.trg4.reciprocal-value.l1": {
    Svg: ({ pair = 0, direction = 0, n = 3, d = 5 }) => {
      const { given, target } = reciprocalRoles(pair, direction);
      return <ReciprocalTurnWorked given={given} target={target} n={n} d={d} />;
    },
    caption: ({ pair = 0, direction = 0, n = 3, d = 5 }) => {
      const { given, target } = reciprocalRoles(pair, direction);
      return `The ${given.name} and the ${target.name} are the pair, whatever the co- at the front of either name suggests, so the second meter reads the first one turned over: $${tex(d, n, false)}$.`;
    },
  },

  "d9.trg4.quotient-value.l2": {
    Svg: ({ a = 3, b = 4, c = 5, quadrant = 2, target = 0 }) => {
      const sinNeg = sineNegative(quadrant);
      const cosNeg = cosineNegative(quadrant);
      const answerNeg = sinNeg !== cosNeg;
      const n = target === 0 ? a : b;
      const d = target === 0 ? b : a;
      const symbol = target === 0 ? "\\tan" : "\\cot";
      const recipe =
        target === 0
          ? "\\tan\\theta = \\dfrac{\\sin\\theta}{\\cos\\theta}"
          : "\\cot\\theta = \\dfrac{\\cos\\theta}{\\sin\\theta}";
      const division =
        target === 0
          ? `${tex(a, c, sinNeg)} \\div ${tex(b, c, cosNeg)}`
          : `${tex(b, c, cosNeg)} \\div ${tex(a, c, sinNeg)}`;
      return (
        <ExpressionReductionWorked
          rows={[
            { tokens: [{ text: recipe }] },
            { tokens: [{ text: division }] },
            { tokens: [{ text: `${symbol}\\theta = ${tex(n, d, answerNeg)}` }] },
          ]}
          ariaLabel={`The quotient identity applied to two readings, giving ${spokenFrac(n, d, answerNeg)}`}
          title="The identity, the division, and the sign the two readings settle"
        />
      );
    },
    caption: ({ a = 3, b = 4, c = 5, quadrant = 2, target = 0 }) => {
      const answerNeg = sineNegative(quadrant) !== cosineNegative(quadrant);
      const n = target === 0 ? a : b;
      const d = target === 0 ? b : a;
      return `Both readings sit over $${c}$, so dividing one by the other cancels it and leaves the two numerators. In Quadrant ${NUMERAL[quadrant]} they carry ${answerNeg ? "opposite signs, so the quotient is negative" : "the same sign, so the quotient is positive"}: $${tex(n, d, answerNeg)}$.`;
    },
  },

  // Keyed on `line`, which is the QUESTION, and only then on `family`, which is the answer.
  // `family` alone left the four Pythagorean draws sharing one picture, so the figure said
  // nothing about the line in front of the learner. `line` indexes the item bank's own table,
  // imported rather than mirrored: a mirror would be a second copy of twelve strings that
  // nothing checks against the first, and the copy is what would go stale the next time a line
  // is added or rekeyed. `identityLine` falls back on the first entry the same way the other
  // lookups in this file do, so a params bag missing `line` still renders a real line.
  "d9.trg4.identity-name.l2": {
    Svg: ({ line = 0, family = 0 }) => (
      <IdentityFamilyWorked family={family} latex={identityLine(line).latex} />
    ),
    caption: ({ line = 0, family = 0 }) => {
      const card =
        FAMILY_CARDS[family] ?? (FAMILY_CARDS[0] as (typeof FAMILY_CARDS)[number]);
      return `Reading $${identityLine(line).latex}$ for its shape rather than for which functions are written on it: ${card.label}. That is the ${card.name} family.`;
    },
  },

  "d9.trg4.pythagorean-solve.l3": {
    Svg: ({ a = 8, b = 15, c = 17, quadrant = 2, given = 0 }) => (
      <PythagoreanSolveWorked a={a} b={b} c={c} quadrant={quadrant} given={given} />
    ),
    caption: ({ a = 8, b = 15, c = 17, quadrant = 2, given = 0 }) => {
      const tn = given === 0 ? b : a;
      const targetNeg = given === 0 ? cosineNegative(quadrant) : sineNegative(quadrant);
      const coordinate = given === 0 ? "horizontal" : "vertical";
      return `The identity fixes the SIZE, leaving $${tex(tn, c, false)}$ and $${tex(tn, c, true)}$ as candidates, and the quadrant fixes the sign. In Quadrant ${NUMERAL[quadrant]} the ${coordinate} coordinate is ${targetNeg ? "negative" : "positive"}, so the reading is $${tex(tn, c, targetNeg)}$.`;
    },
  },

  // The defaults are the worked example the shape was authored from: $\cos\theta = \tfrac{5}{13}$
  // in Quadrant IV, which is `HEADINGS[3]`, asked for $\sin(-\theta)\sec\theta$.
  "d9.trg4.compound-evaluate.l3": {
    Svg: ({ triple = 3, givenSine = 0, quadrant = 4, shape = 0 }) => (
      <CompoundCollapseWorked
        entry={heading(triple)}
        quadrant={quadrant}
        givenSine={givenSine}
        shape={shape}
      />
    ),
    caption: ({ triple = 3, givenSine = 0, quadrant = 4, shape = 0 }) => {
      const entry = heading(triple);
      const sinNeg = sineNegative(quadrant);
      const cosNeg = cosineNegative(quadrant);
      const givenIsSine = givenSine === 1;
      const missingSym = givenIsSine ? "\\cos" : "\\sin";
      const missingN = givenIsSine ? entry.b : entry.a;
      const missingNeg = givenIsSine ? cosNeg : sinNeg;
      const { first, second, collapsed, negated } = compoundShape(shape);
      const firstFacts = facts(first);
      const secondFacts = facts(second);
      const collapsedFacts = facts(collapsed);
      const answer = reading(collapsed, entry, sinNeg, cosNeg);
      const answerNegative = answer.negative !== negated;
      const parityClause = firstFacts.even
        ? `leaves the ${firstFacts.name} exactly where it was`
        : `turns the sign of the ${firstFacts.name} over`;
      // Whether the SECOND factor contributes a reciprocal or stands as it is, which is a
      // fact about which function it is: a sentence that assumed the reciprocal would be
      // wrong on `shape` 3, whose second factor is a plain sine.
      const turned = turnsOver(second);
      const secondClause =
        turned === undefined
          ? `the ${secondFacts.name} stands as it is`
          : `the ${secondFacts.name} is the ${turned.name} turned over`;
      const valueSentence =
        collapsedFacts.sym === "\\tan" || collapsedFacts.sym === "\\cot"
          ? `Both readings sit over $${entry.c}$, so dividing one by the other cancels it and leaves $${tex(answer.n, answer.d, answerNegative)}$.`
          : `Turning that one reading over gives $${tex(answer.n, answer.d, answerNegative)}$.`;
      return `Only one of the two readings is handed over. The identity fixes the SIZE of the other and Quadrant ${NUMERAL[quadrant]} fixes its sign, so $${missingSym}\\theta = ${tex(missingN, entry.c, missingNeg)}$. Reversing the sweep ${parityClause}, and ${secondClause}, so the two factors come to the single function $${negated ? "-" : ""}${collapsedFacts.sym}\\theta$. ${valueSentence}`;
    },
  },
};
