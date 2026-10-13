import {
  exactRadianAnswer,
  exactTrigValueAnswer,
  type GenerateContext,
  type ItemTemplate,
  multipleChoiceAnswer,
  numericAnswer,
  type Rng,
} from "../../../template";

/**
 * TRG.3 practice templates: a heading, and the position on the unit circle it names.
 *
 * Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix, and they escalate along one axis
 * rather than by getting arithmetically heavier:
 *
 *  - L1  the reference angle of a degree heading, which is the subtraction alone;
 *  - L2a the same idea in radians, where the axis is at pi rather than at a degree measure;
 *  - L2b the SIGN of a named function at a heading, which is the quadrant alone;
 *  - L3a the exact sine or cosine at a non-acute special heading, which is the reference
 *        angle and the sign together for the first time;
 *  - L3b the same three facts run BACKWARDS: one exact reading and the sign of the other are
 *        given, and the HEADING is the answer, so a size has to be recognized rather than
 *        produced and the acute angle has to be placed rather than subtracted.
 *
 * L3a and L3b were one shape until the L3b note below was written: both drew the same
 * `(function, heading)` cases and both keyed the same value, so the tier ran one procedure
 * twice. Read that note before changing either of them.
 *
 * ## What the checkers forced, from the domain plan's spike
 *
 * An ordered pair CANNOT hold a radical: `pointAnswer("(sqrt(2)/2, sqrt(2)/2)")` is a parse
 * error on the key itself, and every heading this node is about has a radical in at least one
 * coordinate. So no template here asks for the point as a pair. `coordinates.l3` gives one
 * coordinate exactly and the sign of the other and asks for the heading, which keeps both
 * halves of the point in the item behind a single answer. See that template's own note for why
 * the `multipartAnswer` it was first authored with could not be answered at all.
 *
 * A multiple-choice key must be LOWER CASE, so `quadrant-sign`'s three options are exactly
 * `positive`, `negative` and `zero`, and the prompt prints them in that spelling. The checker
 * compares a choose-one answer with a bare `===`, but the answer field lower-cases every
 * choose-one submission before it gets there, so a key carrying a capital cannot be matched
 * by anything a learner types. TRG.4 shipped a capitalized `Pythagorean` on that
 * misunderstanding and lost a third of one slot's draws to it.
 *
 * A degree sign or a unit in a typed answer is `invalid_input/unknown_symbol`, so no prompt
 * here invites one: the reference-angle shapes say "in degrees" in the question and ask for a
 * plain number. `exactTrigValueAnswer` refuses a decimal as `wrong_representation`, which is
 * why the exact shapes say so rather than leaving it to be guessed.
 *
 * ## Why no hint here names a value
 *
 * `hint_leaks_answer` matches the answer key as a standalone value over the hint with its
 * whitespace stripped, and three of these five have keys a hint could reach by accident. The
 * degree keys are two-digit numbers, so the hints mention only $180^{\circ}$ and $360^{\circ}$,
 * whose digits cannot be a standalone match for any reference angle in range. The
 * `quadrant-sign` keys are the WORDS `positive`, `negative` and `zero`, so no hint on that
 * template uses any of the three, which is a sharper constraint than it looks and is why its
 * hints talk about sides of axes instead. The radian keys carry a slash, so its hints write
 * every fraction with `\dfrac` and never as `pi/n`.
 */

export const TRG3_NODE = "TRG.3";

/** The example notation a prompt prints, chosen so it is never any draw's answer. */
const RADIAN_EXAMPLE = "2pi/9";

interface SpecialHeading {
  /** The heading in degrees. */
  deg: number;
  /** Which quadrant the terminal side lands in. */
  quadrant: 1 | 2 | 3 | 4;
  /** The acute angle back to the nearer end of the horizontal axis, in degrees. */
  reference: number;
  /** The horizontal reach, as the checker spells it. */
  cosKey: string;
  /** The vertical reach, as the checker spells it. */
  sinKey: string;
  /** The same two, as KaTeX. */
  cosTex: string;
  sinTex: string;
}

/** `\dfrac{...}{2}`, negated where the quadrant says so. */
function half(tex: string, negative: boolean): string {
  return `${negative ? "-" : ""}\\dfrac{${tex}}{2}`;
}

function key(body: string, negative: boolean): string {
  return `${negative ? "-" : ""}${body}/2`;
}

/**
 * The twelve non-quadrantal special headings, each with the exact point it names.
 *
 * Written out rather than derived, because a derivation would have to encode the same twelve
 * facts in a rule and the rule is what the node is teaching: a table a reader can check line
 * by line is the safer artifact for the thing every other file here is graded against.
 */
function special(
  deg: number,
  quadrant: 1 | 2 | 3 | 4,
  reference: 30 | 45 | 60,
): SpecialHeading {
  const cosNegative = quadrant === 2 || quadrant === 3;
  const sinNegative = quadrant === 3 || quadrant === 4;
  const cosBody = reference === 30 ? "sqrt(3)" : reference === 45 ? "sqrt(2)" : "1";
  const sinBody = reference === 30 ? "1" : reference === 45 ? "sqrt(2)" : "sqrt(3)";
  const cosTexBody = reference === 30 ? "\\sqrt{3}" : reference === 45 ? "\\sqrt{2}" : "1";
  const sinTexBody = reference === 30 ? "1" : reference === 45 ? "\\sqrt{2}" : "\\sqrt{3}";
  return {
    deg,
    quadrant,
    reference,
    cosKey: key(cosBody, cosNegative),
    sinKey: key(sinBody, sinNegative),
    cosTex: half(cosTexBody, cosNegative),
    sinTex: half(sinTexBody, sinNegative),
  };
}

const SPECIAL_HEADINGS: readonly SpecialHeading[] = [
  special(30, 1, 30),
  special(45, 1, 45),
  special(60, 1, 60),
  special(120, 2, 60),
  special(135, 2, 45),
  special(150, 2, 30),
  special(210, 3, 30),
  special(225, 3, 45),
  special(240, 3, 60),
  special(300, 4, 60),
  special(315, 4, 45),
  special(330, 4, 30),
];

/** Quadrant numerals, indexed by quadrant. */
const NUMERAL: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };

function headingOf(deg: number): SpecialHeading {
  return (
    SPECIAL_HEADINGS.find((entry) => entry.deg === deg) ??
    (SPECIAL_HEADINGS[0] as SpecialHeading)
  );
}

/** How the reference-angle subtraction reads for a heading's quadrant. */
function subtractionTex(deg: number, quadrant: number, reference: number): string {
  if (quadrant === 2) {
    return `180^{\\circ} - ${deg}^{\\circ} = ${reference}^{\\circ}`;
  }
  if (quadrant === 3) {
    return `${deg}^{\\circ} - 180^{\\circ} = ${reference}^{\\circ}`;
  }
  return `360^{\\circ} - ${deg}^{\\circ} = ${reference}^{\\circ}`;
}

// ── L1: the reference angle of a degree heading ──────────────────────────────

/**
 * L1, the subtraction on its own.
 *
 * Quadrant I is excluded from the draw. There the reference angle IS the heading, so the item
 * would be answerable by copying the prompt, and a cell holding those draws would report a
 * learner as having the idea on the strength of the one case that needs none of it.
 */
export const d9_trg3_reference_degree_l1: ItemTemplate = {
  template_id: "d9.trg3.reference-degree.l1",
  node_id: TRG3_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const quadrant = rng.pick([2, 3, 4] as const);
    const reference = rng.int(10, 80);
    const deg =
      quadrant === 2 ? 180 - reference : quadrant === 3 ? 180 + reference : 360 - reference;
    return {
      prompt: `A heading of $${deg}^{\\circ}$ is drawn in standard position. What is its reference angle, in degrees? Enter one number, with no degree sign.`,
      answer: numericAnswer(`${reference}`),
      params: { deg, quadrant, reference },
      hints: [
        "A reference angle is measured to the HORIZONTAL axis. It is never measured to the vertical one, and never back to where the turn started.",
        "Settle which quadrant the heading lands in, because that decides which end of the horizontal axis is nearer. For a heading in the upper left or the lower left of the circle that end is at $180^{\\circ}$; for one in the lower right it is at $360^{\\circ}$.",
        "Take the smaller of the two measures away from the larger, so what you are left with is acute.",
      ],
      worked_solution: [
        `A heading of $${deg}^{\\circ}$ puts the terminal side in Quadrant ${NUMERAL[quadrant]}.`,
        quadrant === 4
          ? `The nearer end of the horizontal axis in Quadrant IV is the full turn at $360^{\\circ}$, so the reference angle is measured back from there.`
          : `The nearer end of the horizontal axis in Quadrant ${NUMERAL[quadrant]} is the one at $180^{\\circ}$, so the reference angle is measured against that.`,
        `Subtracting gives $${subtractionTex(deg, quadrant, reference)}$.`,
        `The reference angle is $${reference}^{\\circ}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.deg ?? 0}`,
};

// ── L2a: the reference angle of a radian heading ─────────────────────────────

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

interface RadianHeading {
  /** The heading as `k` pi over `d`, in lowest terms. */
  k: number;
  d: number;
  quadrant: 2 | 3 | 4;
  /** The reference angle as `rk` pi over `rd`, in lowest terms. */
  rk: number;
  rd: number;
}

/**
 * Every radian heading this template can draw: a multiple of pi in lowest terms over one of
 * five denominators, lying outside Quadrant I and off the axes.
 *
 * Derived rather than listed, because the interesting property is a fact about the derivation:
 * the reference angle of `k*pi/d` is `(d-k)*pi/d`, `(k-d)*pi/d` or `(2d-k)*pi/d`, and each of
 * those numerators is coprime to `d` whenever `k` is. So a reference angle here is ALWAYS
 * already in lowest terms, which is why no hint or step on this template claims a reduction:
 * an unconditional "now reduce" would print work no draw ever requires.
 */
const RADIAN_HEADINGS: readonly RadianHeading[] = (() => {
  const out: RadianHeading[] = [];
  for (const d of [3, 4, 6, 8, 12]) {
    for (let k = 1; k < 2 * d; k++) {
      // The heading itself has to be in lowest terms, or two draws print the same angle.
      if (gcd(k, d) !== 1) {
        continue;
      }
      // Quadrant I and the four quadrantal headings are both out: in the first the reference
      // angle is the heading, and on the axes it is not what the node is asking about.
      if (2 * k <= d || k === d || 2 * k === 3 * d) {
        continue;
      }
      const quadrant = k < d ? 2 : 2 * k < 3 * d ? 3 : 4;
      const numerator = quadrant === 2 ? d - k : quadrant === 3 ? k - d : 2 * d - k;
      const factor = gcd(numerator, d);
      out.push({ k, d, quadrant, rk: numerator / factor, rd: d / factor });
    }
  }
  return out;
})();

/** `a*pi/b` as the checker spells it, with the numerator dropped when it is one. */
function radianKey(numerator: number, denominator: number): string {
  return `${numerator === 1 ? "" : numerator}pi/${denominator}`;
}

/** The same measure as KaTeX. */
function radianTex(numerator: number, denominator: number): string {
  return `\\dfrac{${numerator === 1 ? "" : numerator}\\pi}{${denominator}}`;
}

/**
 * L2a, the same measurement with the axis at pi.
 *
 * The step up from L1 is not the subtraction, it is knowing where the axes ARE once the
 * heading stops being a degree measure. A learner who has the degree rule and no picture
 * reaches for $180$ here and gets nothing that parses.
 */
export const d9_trg3_reference_radian_l2: ItemTemplate = {
  template_id: "d9.trg3.reference-radian.l2",
  node_id: TRG3_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const drawn = rng.pick(RADIAN_HEADINGS);
    const { k, d, quadrant, rk, rd } = drawn;
    const headingTex = radianTex(k, d);
    const axisTex = quadrant === 4 ? "2\\pi" : "\\pi";
    const axisOver =
      quadrant === 4 ? `\\dfrac{${2 * d}\\pi}{${d}}` : `\\dfrac{${d}\\pi}{${d}}`;
    const differenceTex =
      quadrant === 2
        ? `${axisOver} - ${headingTex} = ${radianTex(d - k, d)}`
        : quadrant === 3
          ? `${headingTex} - ${axisOver} = ${radianTex(k - d, d)}`
          : `${axisOver} - ${headingTex} = ${radianTex(2 * d - k, d)}`;
    return {
      prompt: `A heading of $${headingTex}$ radians is drawn in standard position. What is its reference angle, in radians? Write it as an exact multiple of $\\pi$, for example \`${RADIAN_EXAMPLE}\`, and do not give a decimal.`,
      answer: exactRadianAnswer(radianKey(rk, rd)),
      params: { k, d, quadrant, rk, rd },
      hints: [
        "A reference angle is still measured to the horizontal axis. In radians the two ends of that axis are at $\\pi$ and at $2\\pi$, so those are the measures to work against.",
        "Compare the heading with $\\dfrac{\\pi}{2}$, $\\pi$ and $\\dfrac{3\\pi}{2}$ to place it, then subtract toward whichever of $\\pi$ and $2\\pi$ is nearer, always taking the smaller measure from the larger.",
        "Write the axis measure over the heading's own denominator first. Then the two fractions already match and only the numerators subtract.",
      ],
      worked_solution: [
        `Comparing $${headingTex}$ with $\\dfrac{\\pi}{2}$, $\\pi$ and $\\dfrac{3\\pi}{2}$ puts the terminal side in Quadrant ${NUMERAL[quadrant]}.`,
        `The nearer end of the horizontal axis is at $${axisTex}$, so the reference angle is the gap between the heading and that measure.`,
        `Over the heading's own denominator, $${axisTex} = ${axisOver}$, so the subtraction is $${differenceTex}$.`,
        `The reference angle is $${radianTex(rk, rd)}$, typed \`${radianKey(rk, rd)}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.k ?? 0}:${params.d ?? 0}`,
};

// ── L2b: the sign of a named function at a heading ───────────────────────────

/** The three options, byte for byte as the checker matches them. */
const SIGN_OPTIONS = ["positive", "negative", "zero"] as const;

/**
 * L2b, the sign on its own, with no value anywhere near it.
 *
 * One draw in four lands the heading ON an axis, which is the only way `zero` is reachable
 * and is also the case a learner who has memorized a quadrant grid has no rule for. The rest
 * are drawn strictly inside a quadrant, at least $8^{\circ}$ clear of the axes so the picture
 * is never ambiguous.
 *
 * The practice form is an era word problem and the assessment forms are not, because the
 * translation is real work here: the control gallery logs a horizontal reach and a vertical
 * reach, and the learner has to recognize those as the cosine and the sine before the quadrant
 * rule can be applied at all. The math, the params and the key are identical either way.
 */
export const d9_trg3_quadrant_sign_l2: ItemTemplate = {
  template_id: "d9.trg3.quadrant-sign.l2",
  node_id: TRG3_NODE,
  difficulty: 2,
  generate(rng: Rng, context?: GenerateContext) {
    const isSine = rng.int(0, 1) === 1;
    const onAxis = rng.int(0, 3) === 0;
    const quadrant = rng.int(1, 4);
    const deg = onAxis ? (quadrant - 1) * 90 : (quadrant - 1) * 90 + rng.int(8, 82);
    // On an axis one coordinate is the full radius and the other is nothing at all; inside a
    // quadrant the sign is the quadrant's, and neither coordinate is ever zero.
    const value = isSine
      ? Math.round(Math.sin((deg * Math.PI) / 180) * 1000) / 1000
      : Math.round(Math.cos((deg * Math.PI) / 180) * 1000) / 1000;
    const answer =
      value > 0 ? SIGN_OPTIONS[0] : value < 0 ? SIGN_OPTIONS[1] : SIGN_OPTIONS[2];
    const symbol = isSine ? "\\sin" : "\\cos";
    const reading = isSine ? "vertical reach" : "horizontal reach";
    const measuredFrom = isSine ? "horizontal axis" : "vertical axis";
    const coordinate = isSine ? "second" : "first";
    // Printed from the same three strings the key is drawn from, so the prompt cannot drift
    // out of byte agreement with a match that has no tolerance for case or spacing.
    const options = `\`${SIGN_OPTIONS[0]}\`, \`${SIGN_OPTIONS[1]}\` or \`${SIGN_OPTIONS[2]}\``;
    // Drawn AFTER every math parameter, so the assessment forms stay byte-identical.
    const themed =
      `A rotating antenna reaches one unit from the center of its pad and is aimed at a heading of $${deg}^{\\circ}$. ` +
      `The control gallery logs the ${reading} of the tip, measured from the ${measuredFrom}. Is that logged reading positive, negative, or zero? ` +
      `Answer with exactly one of ${options}, in lowercase.`;
    const neutral =
      `Is $${symbol} ${deg}^{\\circ}$ positive, negative, or zero? ` +
      `Answer with exactly one of ${options}, in lowercase.`;
    return {
      prompt: context?.form === "practice" ? themed : neutral,
      answer: multipleChoiceAnswer(answer),
      params: { deg, isSine: isSine ? 1 : 0, quadrant, onAxis: onAxis ? 1 : 0 },
      hints: [
        "The horizontal reach of the tip is the cosine of the heading and its vertical reach is the sine, so either way the question is about ONE coordinate of the point where the terminal side crosses the unit circle.",
        "Settle where the terminal side lands, then ask which side of each axis that puts the point on: right or left of the vertical axis for the horizontal reach, above or below the horizontal axis for the vertical reach.",
        "A terminal side lying straight ON an axis is the case to watch, because there one of the two coordinates is exactly $0$ and no quadrant rule applies to it.",
      ],
      worked_solution: [
        `The ${coordinate} coordinate of the point where the terminal side crosses the unit circle is $${symbol} ${deg}^{\\circ}$, so that coordinate is what the reading asks about.`,
        onAxis
          ? `A heading of $${deg}^{\\circ}$ puts the terminal side straight on an axis rather than inside a quadrant.`
          : `A heading of $${deg}^{\\circ}$ puts the terminal side inside Quadrant ${NUMERAL[quadrant]}.`,
        onAxis
          ? answer === "zero"
            ? `On an axis one coordinate carries the full radius and the other has no reach at all, and here it is the ${coordinate} one that has none.`
            : `On an axis one coordinate carries the full radius and the other has no reach at all. Here the ${coordinate} one carries the full radius, and it is measured in the ${answer} direction.`
          : `In Quadrant ${NUMERAL[quadrant]} the ${coordinate} coordinate of a point is ${answer}.`,
        `So the reading is ${answer}, typed \`${answer}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.isSine ?? 0}:${params.deg ?? 0}`,
};

// ── L3a: the exact sine or cosine at a non-acute special heading ─────────────

/**
 * Every (function, heading) pair `exact-value-circle.l3` may draw.
 *
 * Two exclusions, and both are about not asking a learner something they were just shown.
 * Quadrant I is out because there the reference angle is the heading and the item collapses
 * to the right-triangle values of TRG.2. Five further pairs are out because the lesson itself
 * works them: the CFU evaluates the cosine at $240^{\circ}$, slide three's two boards work the
 * cosine at $210^{\circ}$ and the sine at $150^{\circ}$, and slide zero writes BOTH coordinates
 * at $225^{\circ}$ onto the pad.
 */
const TAUGHT_PAIRS: readonly string[] = [
  "cos:240",
  "cos:210",
  "sin:150",
  "cos:225",
  "sin:225",
];

const EXACT_VALUE_PAIRS: readonly { isSine: boolean; deg: number }[] =
  SPECIAL_HEADINGS.filter((entry) => entry.quadrant !== 1).flatMap((entry) =>
    [false, true]
      .map((isSine) => ({ isSine, deg: entry.deg }))
      .filter(
        (pair) => !TAUGHT_PAIRS.includes(`${pair.isSine ? "sin" : "cos"}:${pair.deg}`),
      ),
  );

/**
 * L3a, the reference angle and the sign in one item.
 *
 * This is the first shape that needs both halves of the lesson at once, and the two halves
 * fail differently: a learner who misses the reference angle gets the wrong magnitude, and one
 * who misses the quadrant gets the right magnitude with the wrong sign. The checker separates
 * those (`value_mismatch` against `sign_error`), which is what makes the tier diagnostic.
 *
 * The prompt names three form rules and the profile enforces four. `sqrt(12)/4` against a key
 * of `sqrt(3)/2` is the same number, writes its root as `sqrt(...)`, leaves no radical in a
 * denominator and is not a decimal, and `canonical_exact_trig_value` refuses it because the
 * radicand is not square-free. The rule is the right one for exact-value work; a rule the
 * prompt does not print is not. It prints it now.
 */
export const d9_trg3_exact_value_circle_l3: ItemTemplate = {
  template_id: "d9.trg3.exact-value-circle.l3",
  node_id: TRG3_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const { isSine, deg } = rng.pick(EXACT_VALUE_PAIRS);
    const entry = headingOf(deg);
    const symbol = isSine ? "\\sin" : "\\cos";
    const answerKey = isSine ? entry.sinKey : entry.cosKey;
    const answerTex = isSine ? entry.sinTex : entry.cosTex;
    const negative = answerKey.startsWith("-");
    const acuteTex = answerTex.replace(/^-/, "");
    const acuteKey = answerKey.replace(/^-/, "");
    return {
      prompt: `Give the exact value of $${symbol} ${deg}^{\\circ}$. Write any square root as \`sqrt(...)\`, simplified so that no perfect square is left under the root, leave no radical in a denominator, and do not give a decimal.`,
      answer: exactTrigValueAnswer(answerKey),
      params: {
        deg,
        isSine: isSine ? 1 : 0,
        quadrant: entry.quadrant,
        reference: entry.reference,
      },
      hints: [
        "Two separate things settle an exact value at a heading like this: how big it is, and which way it is signed. Work them out one at a time rather than together.",
        "The size comes from the reference angle. Measure the heading back to the nearer end of the horizontal axis, and take the named function of that acute angle.",
        "The sign comes from the quadrant, and it is attached to the size you already have rather than worked out again: it is the sign that coordinate of the point carries there.",
      ],
      worked_solution: [
        `A heading of $${deg}^{\\circ}$ puts the terminal side in Quadrant ${NUMERAL[entry.quadrant]}.`,
        `The reference angle is $${subtractionTex(deg, entry.quadrant, entry.reference)}$.`,
        `At that acute angle the value is $${symbol} ${entry.reference}^{\\circ} = ${acuteTex}$, which fixes the size.`,
        negative
          ? `In Quadrant ${NUMERAL[entry.quadrant]} that coordinate of the point is negative, so the size takes a minus sign.`
          : `In Quadrant ${NUMERAL[entry.quadrant]} that coordinate of the point is positive, so the size is left as it stands.`,
        `So $${symbol} ${deg}^{\\circ} = ${answerTex}$, typed \`${negative ? `-${acuteKey}` : acuteKey}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.isSine ?? 0}:${params.deg ?? 0}`,
};

// ── L3b: the heading a named reading and a sign name ─────────────────────────

/**
 * Every (coordinate, heading) pair `coordinates.l3` may draw.
 *
 * The same two exclusions {@link EXACT_VALUE_PAIRS} takes, and now for the same reason: once
 * the prompt names ONE coordinate, a pair the lesson itself works is a question the learner
 * was just shown, exactly as it is for L3a. Quadrant I goes for its own reason, that there the
 * reference angle is the heading, so the two signs would settle nothing and the item would
 * have no placement in it.
 *
 * Every pair here names ONE heading and no other. Inside a single quadrant a sine and a
 * cosine are each one-to-one, so an exact reading plus the sign of the other coordinate picks
 * out exactly one of the twelve special headings.
 */
const COORDINATE_PAIRS: readonly { isSine: boolean; deg: number }[] =
  SPECIAL_HEADINGS.filter((entry) => entry.quadrant !== 1).flatMap((entry) =>
    [false, true]
      .map((isSine) => ({ isSine, deg: entry.deg }))
      .filter(
        (pair) => !TAUGHT_PAIRS.includes(`${pair.isSine ? "sin" : "cos"}:${pair.deg}`),
      ),
  );

/** Where a reference angle sits once the quadrant is known, as the addition it really is. */
function placementTex(quadrant: number, reference: number): string {
  if (quadrant === 2) {
    return `180^{\\circ} - ${reference}^{\\circ}`;
  }
  if (quadrant === 3) {
    return `180^{\\circ} + ${reference}^{\\circ}`;
  }
  return `360^{\\circ} - ${reference}^{\\circ}`;
}

/**
 * L3b, the same four facts read BACKWARDS: the reading is given and the heading is the answer.
 *
 * ## Why it runs backwards rather than asking for a coordinate
 *
 * It used to ask for one named coordinate at a heading, and that made it `exact-value-circle.l3`
 * under another name. The two case lists were the same comprehension character for character
 * and both took their key off the same `sinKey` / `cosKey` column, so the measured overlap was
 * total: 13 cases each, 13 shared, the same answer on all 13. Since a served set fills both L3
 * slots from distinct SHAPES, every TRG.3 set ran the four moves twice and the tier had half
 * the variety it advertised. `d9.test.ts` could not see it, because what it asserts at each
 * level is two distinct `template_id`s, which two identical procedures under two names
 * satisfy. `l3ShapesDiffer.test.ts` holds the property now.
 *
 * Run backwards the item uses the same three facts and none of the same moves. A size has to
 * be recognized rather than produced, which is the reference table read from the value column;
 * the two signs have to be combined into a quadrant, which is slide one's "a heading has to be
 * signed twice" used as a conclusion rather than as a rule; and the acute angle has to be
 * PLACED, which is the one thing the forward shape never asks, since there the subtraction is
 * handed over by the heading. A wrong answer means something different too: the forward shape
 * separates a size slip from a sign slip, and here a learner who has the size and mis-signs
 * lands on the mirror heading in another quadrant.
 *
 * ## Why the point is still not asked as a pair
 *
 * A first draft keyed both coordinates at once through `multipartAnswer`, on the strength of a
 * spike that measured `{cos: "-1/2", sin: "sqrt(3)/2"}` grading `correct` with a per-part
 * reason code. That measurement is true and it is about the CHECKER. The surfaces are the
 * other half: there is no multi-field answer input in the web tree at all, both practice
 * surfaces submit a plain string, and `compareMultipart` refuses anything that is not an
 * object keyed by `part_id`, so every submission a learner could make came back
 * `invalid_input/invalid_multipart_answer`. The item could not be answered, correctly or
 * otherwise. Asking for the heading keeps BOTH coordinates in the item — one exactly, one by
 * its sign — behind the one answer the field can take.
 */
export const d9_trg3_coordinates_l3: ItemTemplate = {
  template_id: "d9.trg3.coordinates.l3",
  node_id: TRG3_NODE,
  difficulty: 3,
  generate(rng: Rng, context?: GenerateContext) {
    const { isSine, deg } = rng.pick(COORDINATE_PAIRS);
    const entry = headingOf(deg);
    const symbol = isSine ? "\\sin" : "\\cos";
    const givenKey = isSine ? entry.sinKey : entry.cosKey;
    const givenTex = isSine ? entry.sinTex : entry.cosTex;
    const acuteTex = givenTex.replace(/^-/, "");
    // The coordinate the prompt does NOT give exactly: its sign is what fixes the quadrant
    // once the size has fixed the reference angle.
    const otherNegative = (isSine ? entry.cosKey : entry.sinKey).startsWith("-");
    const otherWord = otherNegative ? "negative" : "positive";
    const givenOrdinal = isSine ? "second" : "first";
    const otherOrdinal = isSine ? "first" : "second";
    const givenReading = isSine ? "vertical reach" : "horizontal reach";
    const otherReading = isSine ? "horizontal reach" : "vertical reach";
    const givenFrom = isSine ? "horizontal axis" : "vertical axis";
    const givenNegativeWay = isSine ? "a downward reach" : "a leftward reach";
    // Which side of ONE axis each coordinate's sign puts the point on. The given reading is
    // signed by the axis it is measured from, and the other reading by the other axis, so the
    // two together name the quadrant.
    const sideOf = (vertical: boolean, negative: boolean): string =>
      vertical
        ? negative
          ? "below the horizontal axis"
          : "above the horizontal axis"
        : negative
          ? "left of the vertical axis"
          : "right of the vertical axis";
    const givenNegative = givenKey.startsWith("-");
    const givenSide = sideOf(isSine, givenNegative);
    const otherSide = sideOf(!isSine, otherNegative);
    const format = "Enter one number, with no degree sign.";
    // Drawn AFTER every math parameter, so the assessment forms stay byte-identical.
    const themed =
      `A rotating antenna reaches one unit from the center of its pad. Its exact ${givenReading}, ` +
      `measured from the ${givenFrom} with ${givenNegativeWay} counting as negative, is $${givenTex}$, ` +
      `and its ${otherReading} is ${otherWord}. Which heading is it aimed at, in degrees? ${format}`;
    const neutral =
      `The terminal side of one heading in standard position crosses the unit circle at a point whose ` +
      `${givenOrdinal} coordinate is exactly $${givenTex}$ and whose ${otherOrdinal} coordinate is ${otherWord}. ` +
      `Give that heading in degrees. ${format}`;
    return {
      prompt: context?.form === "practice" ? themed : neutral,
      answer: numericAnswer(`${deg}`),
      params: {
        deg,
        isSine: isSine ? 1 : 0,
        quadrant: entry.quadrant,
        reference: entry.reference,
      },
      hints: [
        "The horizontal reach of the tip is the first coordinate of the point where the terminal side crosses the unit circle, and its vertical reach is the second. Start from the SIZE of the reading you were given and put its sign aside for a moment.",
        "A size like that belongs to an acute angle you already know from the reference triangles, and the heading's reference angle is that acute angle. Read the table from the value back to the angle rather than from the angle to the value.",
        "Then the two signs place it. Each of them says which side of one axis the point is on, and together they name the quadrant, which is what decides whether the reference angle is measured forward from the half turn or back from the nearer end of the horizontal axis.",
      ],
      worked_solution: [
        `The ${givenReading} of the tip is the ${givenOrdinal} coordinate of the point where the terminal side crosses the unit circle, so the reading given is $${symbol}$ of the heading.`,
        `Setting its sign aside, a reading of that size belongs to a reference angle of $${entry.reference}^{\\circ}$, since $${symbol} ${entry.reference}^{\\circ} = ${acuteTex}$.`,
        `The reading itself is ${givenNegative ? "negative" : "positive"}, which puts the point ${givenSide}, and the ${otherReading} is ${otherWord}, which puts it ${otherSide}. Those two together are Quadrant ${NUMERAL[entry.quadrant]}.`,
        `Placing a reference angle of $${entry.reference}^{\\circ}$ in Quadrant ${NUMERAL[entry.quadrant]} gives $${placementTex(entry.quadrant, entry.reference)}$.`,
        `So the heading is $${deg}^{\\circ}$, entered as ${deg}.`,
      ],
    };
  },
  varietyKey: (params) => `${params.isSine ?? 0}:${params.deg ?? 0}`,
};

/** TRG.3's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const TRG3_TEMPLATES: readonly ItemTemplate[] = [
  d9_trg3_reference_degree_l1,
  d9_trg3_reference_radian_l2,
  d9_trg3_quadrant_sign_l2,
  d9_trg3_exact_value_circle_l3,
  d9_trg3_coordinates_l3,
];
