import {
  exactTrigValueAnswer,
  type ItemTemplate,
  numericAnswer,
  type Rng,
  radicalAnswer,
} from "../../../template";

/**
 * TRG.2 practice templates: the three ratios of a right triangle, the three angles whose
 * ratios are exact, and the complement relation that ties a sine to a cosine. Five shapes
 * across the locked 1xL1 / 2xL2 / 2xL3 mix, as `docs/D9_Domain_Plan.md` fixes them:
 *
 *  - L1  a ratio read off three integer sides, which is the definition applied once;
 *  - L2a the exact value at one of the special angles, where the FORM is the work;
 *  - L2b a missing length solved with a special-angle ratio, landing on a whole number;
 *  - L3a a missing length that comes out an exact simplified radical;
 *  - L3b the complementary angle a cofunction names.
 *
 * ## Answer path, taken from the plan's spike rather than assumed
 *
 * The plan graded every one of these categories through the real v2 product checker before
 * a line of this file existed, and four of its findings decide the shapes here:
 *
 *  - **`exactTrigValueAnswer` enforces a simplification check.** A radical denominator is a
 *    FORM miss: against key `sqrt(2)/2` the answer `1/sqrt(2)` grades `not_simplified`. That
 *    is precisely the rationalization this node teaches, so every prompt that can reach a
 *    radical says it wants the rationalized form rather than leaving the learner to guess
 *    which of two correct-valued spellings the field will take.
 *  - **`sqrt` needs its parentheses.** `sqrt3/2` is `invalid_input/unknown_symbol` and
 *    `3^(1/2)/2` is `unsupported_exponent`, so every TYPED answer named in a prompt or a
 *    worked solution is written `sqrt(...)`. KaTeX `\sqrt{}` inside a prompt is prose and is
 *    unaffected.
 *  - **A decimal is refused rather than approximated** under `exactTrigValueAnswer` (`0.866`
 *    against `sqrt(3)/2` is `wrong_representation`), so no prompt in this file invites
 *    rounding and no worked solution shows a decimal.
 *  - **A unit or a degree sign in a typed answer is `invalid_input/unknown_symbol`**, so
 *    every word problem states its unit in the prompt and asks for a plain number.
 *
 * The one shape the plan had to design out is here too: the SYMBOLIC cofunction form does
 * not grade at all, because the expression grammar has no trigonometric functions in it and
 * a key containing `sin` or `cos` does not grade against itself. So `cofunction-angle.l3`
 * asks for the ANGLE the cofunction names and takes a plain `numericAnswer`.
 *
 * ## Why no hint here carries a digit
 *
 * `hint_leaks_answer` strips whitespace from a hint and looks for the answer key as a
 * standalone value. Several keys in this file are one- or two-digit numbers and one of them
 * (`1/2`) is a short fraction, so a hint that named any number would leak on the draws whose
 * answer happened to be that number and pass on every other one, which is a defect whose
 * discovery depends on the seed. Every hint below names the rule and never substitutes into
 * it, which is also what R13 asks for.
 *
 * That same rule is why `tan 45` is absent from {@link SPECIAL_VALUES}. Its exact value is
 * the key `1`, and the leak pattern for `1` is any standalone `1` anywhere in a hint, which
 * would silently forbid `\dfrac{1}{2}` and `1^{2}` in prose written for the other eight
 * draws. Dropping the one entry that carries neither a radical nor a fraction costs the tier
 * nothing: the FORM is what this tier is for, and `1` has none.
 *
 * ## Era framing (era 10, Cyberpunk)
 *
 * `getEraOfNode("TRG.2")` resolves to era 10, whose style guide gives this node the guy wire
 * running from a mast to its anchor pad: the height, the deck run and the wire are a
 * right triangle, and any two of them give the third. That framing is used on the two shapes
 * where it makes a GENUINE word problem, `missing-side.l2` and `exact-side-radical.l3`, and
 * on neither of the three abstract ones, where a lead-in would change nothing about the
 * mathematics. It is drawn from the era's world and not from the node's building (D-ERA8),
 * and nothing in it reaches back for a material the era's closing ledger has retired.
 *
 * Every template declares a `varietyKey` over the numbers that fix the QUESTION, so a cell
 * cannot freeze two draws that reduce to the same thing. On the L1 shape that key is the
 * answer rather than the sides, because 3-4-5 and 6-8-10 reach an identical ratio by an
 * identical route and are one question in two sets of clothes.
 */

export const TRG2_NODE = "TRG.2";

/* -------------------------------------------------------------------------- */
/* Shared tables                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Pythagorean triples as `[legA, legB, hypotenuse]`.
 *
 * Listed rather than generated: the L1 tier exists so that the RATIO is the only thing
 * under test, and a generated pair of legs almost never gives a whole hypotenuse. Multiples
 * are kept alongside their primitives so a learner meets the same ratio at more than one
 * size, which is the similarity argument the mini lesson makes.
 */
const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [6, 8, 10],
  [9, 12, 15],
  [12, 16, 20],
  [5, 12, 13],
  [10, 24, 26],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [15, 20, 25],
];

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** The three ratios, in the order `fn` indexes them. */
const FUNCTION_NAMES = ["sin", "cos", "tan"] as const;

/* -------------------------------------------------------------------------- */
/* L1: a ratio from three integer sides                                        */
/* -------------------------------------------------------------------------- */

/**
 * L1, the definition applied once. The triangle's three sides are handed over already named
 * as opposite, adjacent and hypotenuse, so the only decisions are which two sides the named
 * ratio compares and which of them goes on top.
 *
 * The key is written in lowest terms, and the prompt does not ask for lowest terms, because
 * the checker does not require them: the plan measured `-2/4` grading correct against key
 * `-1/2` under this builder. A prompt demanding a reduction the grader will not enforce is a
 * rule the learner has to obey on trust.
 */
export const d9_trg2_ratio_from_sides_l1: ItemTemplate = {
  template_id: "d9.trg2.ratio-from-sides.l1",
  node_id: TRG2_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const [legA, legB, hyp] = TRIPLES[rng.int(0, TRIPLES.length - 1)] ?? [3, 4, 5];
    // Which corner the marked angle sits at, so the answer is not always built from the
    // shorter leg and cannot be guessed from the shape of the numbers.
    const corner = rng.int(0, 1);
    const opposite = corner === 0 ? legA : legB;
    const adjacent = corner === 0 ? legB : legA;
    const fn = rng.int(0, 2);
    const name = FUNCTION_NAMES[fn] ?? "sin";

    const rawTop = fn === 1 ? adjacent : opposite;
    const rawBottom = fn === 2 ? adjacent : hyp;
    const factor = gcd(rawTop, rawBottom);
    const top = rawTop / factor;
    const bottom = rawBottom / factor;

    const compares =
      fn === 0
        ? "the side opposite $\\theta$ with the hypotenuse"
        : fn === 1
          ? "the side adjacent to $\\theta$ with the hypotenuse"
          : "the side opposite $\\theta$ with the side adjacent to it";
    const topWord = fn === 1 ? "adjacent side" : "opposite side";
    const bottomWord = fn === 2 ? "adjacent side" : "hypotenuse";

    const worked = [
      `The ratio asked for is $\\${name} \\theta$, which compares ${compares}.`,
      `The ${topWord} is $${rawTop}$ and the ${bottomWord} is $${rawBottom}$, so $\\${name} \\theta = \\dfrac{${rawTop}}{${rawBottom}}$.`,
    ];
    // Only when the draw actually left a common factor: a reduction step written
    // unconditionally prints itself twice on the triples that arrive in lowest terms.
    if (factor > 1) {
      worked.push(
        `Both numbers share a factor of $${factor}$, so the exact value is $\\dfrac{${top}}{${bottom}}$.`,
      );
    }

    return {
      prompt: `In a right triangle, the side opposite the angle $\\theta$ measures $${opposite}$, the side adjacent to it measures $${adjacent}$, and the hypotenuse measures $${hyp}$. Give the exact value of $\\${name} \\theta$ as a fraction, not a decimal.`,
      answer: exactTrigValueAnswer(`${top}/${bottom}`),
      params: { opposite, adjacent, hyp, fn, top, bottom },
      hints: [
        "Each ratio names the two sides it compares. Sine is the opposite over the hypotenuse, cosine is the adjacent over the hypotenuse, and tangent is the opposite over the adjacent.",
        "Read the two sides your ratio names off the triangle and put the one named first on top. Writing them the other way up gives the reciprocal, which is a different ratio entirely.",
      ],
      worked_solution: worked,
    };
  },
  // Keyed on the ANSWER and not on the sides: 3-4-5 and 6-8-10 reach an identical ratio by
  // an identical route, so a cell holding both would be asking one question twice.
  varietyKey: (params) => `${params.fn ?? 0}:${params.top ?? 0}:${params.bottom ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L2a: the exact value at a special angle                                     */
/* -------------------------------------------------------------------------- */

/**
 * One special-angle value, with everything the worked solution needs to derive it.
 *
 * `family` names which reference triangle it comes off: `45` is half a square, `30` is half
 * an equilateral triangle. `rationalize` is the root that has to be moved off the bottom,
 * and is null on the draws that arrive with nothing underneath, so the last step never
 * claims a move the value did not need.
 */
interface SpecialValue {
  fn: 0 | 1 | 2;
  deg: 30 | 45 | 60;
  family: 30 | 45;
  /** The ratio straight off the reference triangle, before any tidying. */
  rawLatex: string;
  /** The canonical exact form, as LaTeX. */
  valueLatex: string;
  /** The same value in the ASCII the answer field reads. */
  typed: string;
  /** The root to multiply top and bottom by, or null when none is owed. */
  rationalize: string | null;
}

/**
 * The eight special-angle values this tier serves.
 *
 * `tan 45` is deliberately absent; the header explains why. What remains covers both
 * reference triangles, all three ratios, and both of the shapes the form check bites on: a
 * root over an integer, and a root that has to be lifted out of a denominator first.
 */
const SPECIAL_VALUES: readonly SpecialValue[] = [
  {
    fn: 0,
    deg: 30,
    family: 30,
    rawLatex: "\\dfrac{1}{2}",
    valueLatex: "\\dfrac{1}{2}",
    typed: "1/2",
    rationalize: null,
  },
  {
    fn: 1,
    deg: 30,
    family: 30,
    rawLatex: "\\dfrac{\\sqrt{3}}{2}",
    valueLatex: "\\dfrac{\\sqrt{3}}{2}",
    typed: "sqrt(3)/2",
    rationalize: null,
  },
  {
    fn: 2,
    deg: 30,
    family: 30,
    rawLatex: "\\dfrac{1}{\\sqrt{3}}",
    valueLatex: "\\dfrac{\\sqrt{3}}{3}",
    typed: "sqrt(3)/3",
    rationalize: "\\sqrt{3}",
  },
  {
    fn: 0,
    deg: 45,
    family: 45,
    rawLatex: "\\dfrac{1}{\\sqrt{2}}",
    valueLatex: "\\dfrac{\\sqrt{2}}{2}",
    typed: "sqrt(2)/2",
    rationalize: "\\sqrt{2}",
  },
  {
    fn: 1,
    deg: 45,
    family: 45,
    rawLatex: "\\dfrac{1}{\\sqrt{2}}",
    valueLatex: "\\dfrac{\\sqrt{2}}{2}",
    typed: "sqrt(2)/2",
    rationalize: "\\sqrt{2}",
  },
  {
    fn: 0,
    deg: 60,
    family: 30,
    rawLatex: "\\dfrac{\\sqrt{3}}{2}",
    valueLatex: "\\dfrac{\\sqrt{3}}{2}",
    typed: "sqrt(3)/2",
    rationalize: null,
  },
  {
    fn: 1,
    deg: 60,
    family: 30,
    rawLatex: "\\dfrac{1}{2}",
    valueLatex: "\\dfrac{1}{2}",
    typed: "1/2",
    rationalize: null,
  },
  {
    fn: 2,
    deg: 60,
    family: 30,
    rawLatex: "\\dfrac{\\sqrt{3}}{1}",
    valueLatex: "\\sqrt{3}",
    typed: "sqrt(3)",
    rationalize: null,
  },
];

/** How the reference triangle for a family is set out, said once for prompt and figure. */
function referenceSetup(family: 30 | 45): string {
  return family === 45
    ? "A $45^{\\circ}$ right triangle is half a square, so both legs are equal. Take each leg as $1$, and the Pythagorean theorem gives a hypotenuse of $\\sqrt{1^{2} + 1^{2}} = \\sqrt{2}$."
    : "Half an equilateral triangle of side $2$ is a right triangle with angles of $30^{\\circ}$ and $60^{\\circ}$, a hypotenuse of $2$, and a short leg of $1$ opposite the $30^{\\circ}$. The remaining leg follows from the Pythagorean theorem: $\\sqrt{2^{2} - 1^{2}} = \\sqrt{3}$.";
}

/**
 * L2a, the exact value at a special angle. The arithmetic is small; the FORM is the tier.
 *
 * `exactTrigValueAnswer` rejects a decimal as `wrong_representation` and a radical
 * denominator as `not_simplified`, so both halves of what the prompt asks for are enforced
 * rather than merely requested, and the prompt says so instead of leaving the learner to
 * discover it by losing an attempt.
 *
 * There is a THIRD half, and for one round the prompt did not state it. The profile also
 * requires a square-free radicand, so `sqrt(12)/4` against a key of `sqrt(3)/2` is
 * `not_simplified` — an answer that is exactly equal to the key, writes its root as
 * `sqrt(...)`, leaves nothing under a denominator and is not a decimal, so it obeyed every
 * instruction the prompt printed and was refused anyway. The rule was never in doubt; the
 * prompt's coverage of it was. It now names the perfect square, which is what
 * `exact-side-radical.l3` has always done by asking "as a simplified radical".
 */
export const d9_trg2_special_exact_l2: ItemTemplate = {
  template_id: "d9.trg2.special-exact.l2",
  node_id: TRG2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const entry =
      SPECIAL_VALUES[rng.int(0, SPECIAL_VALUES.length - 1)] ??
      (SPECIAL_VALUES[0] as SpecialValue);
    const name = FUNCTION_NAMES[entry.fn] ?? "sin";
    const compares =
      entry.fn === 0
        ? "the opposite over the hypotenuse"
        : entry.fn === 1
          ? "the adjacent over the hypotenuse"
          : "the opposite over the adjacent";

    const worked = [
      referenceSetup(entry.family),
      `From the $${entry.deg}^{\\circ}$ corner of that triangle, $\\${name}$ is ${compares}, which reads $${entry.rawLatex}$.`,
    ];
    if (entry.rationalize === null) {
      worked.push(
        `Nothing is left under a denominator, so the exact value is $${entry.valueLatex}$, typed ${entry.typed}.`,
      );
    } else {
      worked.push(
        `A root is not left in a denominator, so multiply the top and the bottom by $${entry.rationalize}$.`,
        `That gives an exact value of $${entry.valueLatex}$, typed ${entry.typed}.`,
      );
    }

    return {
      prompt: `Give the exact value of $\\${name} ${entry.deg}^{\\circ}$. Write a square root as sqrt(...), simplified so that no perfect square is left under the root, leave no root in a denominator, and do not round to a decimal.`,
      answer: exactTrigValueAnswer(entry.typed),
      params: { fn: entry.fn, deg: entry.deg, family: entry.family },
      hints: [
        "Both special triangles come from a shape you can draw from memory. Half a square gives the one with two equal legs, and half an equilateral triangle gives the other, whose short leg is half the hypotenuse.",
        "Set that triangle's three sides down as numbers, then read off the ratio the question names: opposite over hypotenuse for a sine, adjacent over hypotenuse for a cosine, opposite over adjacent for a tangent.",
        "If a root ends up underneath, multiply the top and the bottom by that same root to lift it above the line.",
      ],
      worked_solution: worked,
    };
  },
  varietyKey: (params) => `${params.fn ?? 0}:${params.deg ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L2b: a missing length that lands on a whole number                          */
/* -------------------------------------------------------------------------- */

/**
 * One guy-wire shape: which angle stands at the pad, which length is given, and which the
 * question wants. `ratio` is the function that pairs those two sides, and it is what the
 * learner has to choose.
 */
interface WireShape {
  angle: 30 | 60;
  /**
   * 0 sine, 1 cosine. The tangent is absent rather than unused: see {@link WIRE_SHAPES} on
   * why a whole-number tangent draw cannot be an item.
   */
  ratio: 0 | 1;
  /** What the problem hands over. */
  givenSide: "wire" | "mast" | "run";
  /** What it asks for. */
  wantedSide: "wire" | "mast" | "run";
}

/**
 * The four whole-number shapes, and there are exactly four because the constraint is
 * arithmetic rather than editorial: a special-angle ratio lands a whole number only where
 * the ratio is $\tfrac{1}{2}$ or its reciprocal, which is the sine at $30^{\circ}$ and the
 * cosine at $60^{\circ}$, each run in both directions.
 *
 * ## Why the ratio of $1$ is not a fifth shape
 *
 * $\tan 45^{\circ} = 1$ also lands whole, and the pairing it makes is the mast with the deck
 * run, so this list carried a fifth shape at $45^{\circ}$ for one round. The mathematics was
 * right and the ITEM was not: a ratio of one means the two legs are equal, so the length the
 * question asked for was the length the prompt had already printed. Measured over 800 draws,
 * the pad angle was $45^{\circ}$ on 162 of them and on all 162 the answer was the given, so a
 * learner who read only the numbers and applied no ratio scored one draw in five of this cell
 * without doing any trigonometry. It is not a wrong item, it is not an item, and no draw range
 * fixes it, because the equality is what $\tan 45^{\circ} = 1$ MEANS.
 *
 * That leaves the tangent out of this cell, which costs the tier nothing it can have: the two
 * tangent draws that are not degenerate are $\tan 30^{\circ}$ and $\tan 60^{\circ}$, both
 * irrational, so both belong to `exact-side-radical.l3` — where the tangent at $60^{\circ}$
 * is exactly what its fourth shape draws. `missingSide.test.ts` holds the property.
 */
const WIRE_SHAPES: readonly WireShape[] = [
  { angle: 30, ratio: 0, givenSide: "wire", wantedSide: "mast" },
  { angle: 60, ratio: 1, givenSide: "wire", wantedSide: "run" },
  { angle: 30, ratio: 0, givenSide: "mast", wantedSide: "wire" },
  { angle: 60, ratio: 1, givenSide: "run", wantedSide: "wire" },
];

/**
 * L2b, a length the special-angle ratio hands back whole.
 *
 * This is the era's own framing (`docs/superpowers/specs/eras/era-10-cyberpunk/style-guide.md`
 * gives TRG.2 the guy wire) and it is used here because it makes the item a GENUINE word
 * problem: the learner has to decide which of the three lengths is opposite, which is
 * adjacent and which is the hypotenuse before any ratio can be chosen, and that decision is
 * the whole of slide 0. Nothing about the answer, the parameters or the grading depends on
 * the story.
 */
export const d9_trg2_missing_side_l2: ItemTemplate = {
  template_id: "d9.trg2.missing-side.l2",
  node_id: TRG2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const shapeIndex = rng.int(0, WIRE_SHAPES.length - 1);
    const shape = WIRE_SHAPES[shapeIndex] ?? (WIRE_SHAPES[0] as WireShape);

    // The half is drawn as the answer and doubled into the given length, so both numbers
    // stay whole whichever direction the shape runs.
    const half = rng.int(5, 20);
    // The straight-up-the-mast shapes double their given length instead, and the range
    // stops short of the check's own 20 so a practice draw cannot reproduce it.
    //
    // The doubled length is kept off the angle printed beside it. At $30^{\circ}$ a seed of
    // 15 answers 30, which is the degree measure standing in the same sentence, so a learner
    // reading a number off the page instead of applying a ratio would be graded correct.
    // That is the same defect the fifth shape was removed for, one draw in fifty rather than
    // one in five, and `missingSide.test.ts` measures the whole prompt rather than the given
    // length alone so that it cannot come back as a different number.
    let seed = rng.int(6, 18);
    while (seed * 2 === shape.angle) {
      seed = rng.int(6, 18);
    }

    let given: number;
    let answer: number;
    if (shapeIndex === 0 || shapeIndex === 1) {
      given = half * 2;
      answer = half;
    } else {
      given = seed;
      answer = seed * 2;
    }

    const askFor =
      shape.wantedSide === "wire"
        ? "How long is the wire, in meters?"
        : shape.wantedSide === "mast"
          ? "How far up the mast does it reach, in meters?"
          : "How far along the deck from the foot of the mast is the anchor pad, in meters?";
    const giveIt =
      shape.givenSide === "wire"
        ? `runs $${given}$ meters to the top of the mast`
        : shape.givenSide === "mast"
          ? `reaches $${given}$ meters up the mast`
          : `is anchored $${given}$ meters along the deck from the foot of the mast`;

    const ratioName = FUNCTION_NAMES[shape.ratio] ?? "sin";
    // Every shape here is the half, taken one way or the other; see WIRE_SHAPES on why a
    // ratio of one is not among them.
    const exactLatex = "\\dfrac{1}{2}";
    const pairing =
      shape.ratio === 0
        ? `the height up the mast is the opposite side and the wire is the hypotenuse, so the ratio pairing them is the sine`
        : `the deck run is the adjacent side and the wire is the hypotenuse, so the ratio pairing them is the cosine`;
    const equation =
      shape.wantedSide === "wire"
        ? `\\${ratioName} ${shape.angle}^{\\circ} = \\dfrac{${given}}{c}`
        : `\\${ratioName} ${shape.angle}^{\\circ} = \\dfrac{x}{${given}}`;
    const closing =
      shape.wantedSide === "wire"
        ? `Solving for the wire gives $c = ${answer}$, so the wire is $${answer}$ meters long.`
        : shape.wantedSide === "mast"
          ? `Solving gives $x = ${answer}$, so the wire reaches $${answer}$ meters up the mast.`
          : `Solving gives $x = ${answer}$, so the pad sits $${answer}$ meters along the deck from the foot of the mast.`;

    return {
      prompt: `A guy wire leaves an anchor pad on the deck at $${shape.angle}^{\\circ}$ to the horizontal and ${giveIt}. The mast stands square to the deck. ${askFor} Enter one number.`,
      answer: numericAnswer(`${answer}`),
      params: {
        shape: shapeIndex,
        angle: shape.angle,
        ratio: shape.ratio,
        given,
        answer,
      },
      hints: [
        "Sketch the three lengths first: the mast standing up, the run along the deck, and the wire closing the triangle. The right angle is at the foot of the mast, the wire is the hypotenuse, and the angle you were given sits at the anchor pad.",
        "Name the two lengths the question involves from that angle, one known and one wanted, then take the ratio that pairs exactly those two: opposite with hypotenuse is sine, adjacent with hypotenuse is cosine, opposite with adjacent is tangent.",
        "Write that ratio as an equation with the unknown length in it and put in the special angle's exact value. It is a simple fraction, so nothing here needs rounding.",
      ],
      worked_solution: [
        `The mast, the deck run and the wire make a right triangle, with the right angle at the foot of the mast.`,
        `From the $${shape.angle}^{\\circ}$ corner at the pad, ${pairing}.`,
        `That gives $${equation}$, and $\\${ratioName} ${shape.angle}^{\\circ}$ is exactly $${exactLatex}$.`,
        closing,
      ],
    };
  },
  varietyKey: (params) => `${params.shape ?? 0}:${params.answer ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L3a: a missing length that comes out an exact radical                       */
/* -------------------------------------------------------------------------- */

/**
 * The four radical-valued guy-wire shapes, as `[angle, ratio, radicand]` with the given
 * length and the answer computed per shape below.
 */
interface RadicalShapeSpec {
  angle: 30 | 45 | 60;
  ratio: 0 | 1 | 2;
  radicand: 2 | 3;
  givenSide: "wire" | "mast" | "run";
  wantedSide: "wire" | "mast" | "run";
}

const RADICAL_SHAPES: readonly RadicalShapeSpec[] = [
  // The wire at 45 degrees, halved onto each leg: $c \cdot \tfrac{\sqrt2}{2}$.
  { angle: 45, ratio: 1, radicand: 2, givenSide: "wire", wantedSide: "run" },
  // A leg at 45 degrees, opened out onto the wire: $x\sqrt2$.
  { angle: 45, ratio: 1, radicand: 2, givenSide: "run", wantedSide: "wire" },
  // The wire at 30 degrees onto the deck run: $c \cdot \tfrac{\sqrt3}{2}$.
  { angle: 30, ratio: 1, radicand: 3, givenSide: "wire", wantedSide: "run" },
  // The deck run at 60 degrees up the mast, through the tangent: $x\sqrt3$.
  { angle: 60, ratio: 2, radicand: 3, givenSide: "run", wantedSide: "mast" },
];

/**
 * L3a, the same relation with the answer left exact.
 *
 * What makes this the harder tier is not the arithmetic but the FORM: the length does not
 * come out whole, and `radicalAnswer` enforces both halves of what that means, rejecting an
 * unsimplified radical as `not_simplified` and a decimal as `wrong_representation`.
 *
 * The coefficient is never $5$ on a $\sqrt2$ draw. `5*sqrt(2)` is the literal example the
 * answer field's own placeholder prints, and an item whose key is the example standing above
 * it is answerable without reading the question; `answerFormat.test.ts` fails on exactly
 * that (see `d10.geo1.exact-diagonal.l3`, which excludes the 5-by-5 square for this reason).
 */
export const d9_trg2_exact_side_radical_l3: ItemTemplate = {
  template_id: "d9.trg2.exact-side-radical.l3",
  node_id: TRG2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const shapeIndex = rng.int(0, RADICAL_SHAPES.length - 1);
    const shape = RADICAL_SHAPES[shapeIndex] ?? (RADICAL_SHAPES[0] as RadicalShapeSpec);

    // The coefficient of the root IS the answer's shape, so it is drawn first and the given
    // length follows from it, which keeps every given length whole.
    let coeff = rng.int(3, 12);
    while (shape.radicand === 2 && coeff === 5) {
      coeff = rng.int(3, 12);
    }
    // Shapes 0 and 2 hand over the wire and halve it; shapes 1 and 3 hand over a leg and
    // multiply it up. Either way the number printed in the prompt is an integer.
    const given = shapeIndex === 0 || shapeIndex === 2 ? coeff * 2 : coeff;

    const askFor =
      shape.wantedSide === "wire"
        ? "Give the exact length of the wire, in meters, as a simplified radical."
        : shape.wantedSide === "mast"
          ? "Give the exact height it reaches up the mast, in meters, as a simplified radical."
          : "Give the exact distance from the foot of the mast out to the pad, in meters, as a simplified radical.";
    const giveIt =
      shape.givenSide === "wire"
        ? `runs $${given}$ meters to the top of the mast`
        : `is anchored $${given}$ meters along the deck from the foot of the mast`;

    const ratioName = FUNCTION_NAMES[shape.ratio] ?? "cos";
    const exactLatex =
      shape.ratio === 2 ? `\\sqrt{3}` : `\\dfrac{\\sqrt{${shape.radicand}}}{2}`;
    const pairing =
      shape.ratio === 1
        ? "the deck run is the adjacent side and the wire is the hypotenuse, so the cosine pairs them"
        : "the deck run is the adjacent side and the height up the mast is the opposite one, so the tangent pairs them";

    const worked: string[] = [
      `The mast, the deck run and the wire make a right triangle, with the right angle at the foot of the mast.`,
      `From the $${shape.angle}^{\\circ}$ corner at the pad, ${pairing}, and $\\${ratioName} ${shape.angle}^{\\circ} = ${exactLatex}$.`,
    ];
    if (shapeIndex === 0 || shapeIndex === 2) {
      worked.push(
        `The wire is the known length here, so the unknown side is $${given} \\times ${exactLatex}$.`,
        `Halving $${given}$ leaves $${coeff}$ in front of the root, so the exact length is $${coeff}\\sqrt{${shape.radicand}}$ meters, typed ${coeff}*sqrt(${shape.radicand}).`,
      );
    } else if (shapeIndex === 1) {
      worked.push(
        `The deck run is the known length, so the wire is $${given} \\div \\dfrac{\\sqrt{2}}{2}$, which is $${given} \\times \\dfrac{2}{\\sqrt{2}}$.`,
        `Multiplying the top and the bottom by $\\sqrt{2}$ clears the root from underneath, and the wire is exactly $${coeff}\\sqrt{2}$ meters long, typed ${coeff}*sqrt(2).`,
      );
    } else {
      worked.push(
        `The deck run is the known length and it is the adjacent side, so the height is $${given} \\times \\sqrt{3}$.`,
        `The root stays as it is, so the height is exactly $${coeff}\\sqrt{3}$ meters, typed ${coeff}*sqrt(3).`,
      );
    }

    return {
      prompt: `A guy wire leaves an anchor pad on the deck at $${shape.angle}^{\\circ}$ to the horizontal and ${giveIt}. The mast stands square to the deck. ${askFor} Write a square root as sqrt(...), for example 4*sqrt(7).`,
      answer: radicalAnswer(`${coeff}*sqrt(${shape.radicand})`),
      params: {
        shape: shapeIndex,
        angle: shape.angle,
        ratio: shape.ratio,
        given,
        coeff,
        radicand: shape.radicand,
      },
      hints: [
        "Sketch the three lengths first: the mast standing up, the run along the deck, and the wire closing the triangle. The right angle is at the foot of the mast, the wire is the hypotenuse, and the angle you were given sits at the anchor pad.",
        "Choose the ratio that pairs the length you know with the length you want, put in the special angle's exact value, and solve. Every value here is exact, so no calculator is involved at any point.",
        "Carry the root through the arithmetic instead of turning it into a decimal, and if a root is left underneath, multiply the top and the bottom by it so the number below the line is whole.",
      ],
      worked_solution: worked,
    };
  },
  varietyKey: (params) =>
    `${params.shape ?? 0}:${params.coeff ?? 0}:${params.radicand ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L3b: the angle a cofunction names                                           */
/* -------------------------------------------------------------------------- */

/**
 * Angles the cofunction shape will not draw, and each is excluded for its own reason.
 *
 * $45^{\circ}$ is its own complement, so the item would answer itself with the number
 * already printed in the prompt. The other six are the angles the LESSON works through: the
 * slide 3 prose pairs $25^{\circ}$ with $65^{\circ}$, and the slide 3 widget works
 * $18^{\circ}$ with $72^{\circ}$ on one board and $37^{\circ}$ with $53^{\circ}$ on the
 * other. Practice that replayed a teaching example would be testing recall of the slide.
 */
const COFUNCTION_EXCLUDED = new Set([18, 25, 37, 45, 53, 65, 72]);

/**
 * L3b, the complementary angle a cofunction names.
 *
 * This asks for the ANGLE and not the identity, and that is forced rather than chosen: the
 * plan measured the whole symbolic category as unauthorable, since the expression grammar
 * has no trigonometric functions in it and a key of `cos(x)` does not grade even against
 * itself. The angle is the one cofunction question that grades, so it is the one that is
 * asked, and a plain `numericAnswer` is the right builder for a whole number of degrees.
 */
export const d9_trg2_cofunction_angle_l3: ItemTemplate = {
  template_id: "d9.trg2.cofunction-angle.l3",
  node_id: TRG2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let given = rng.int(10, 80);
    while (COFUNCTION_EXCLUDED.has(given)) {
      given = rng.int(10, 80);
    }
    const answer = 90 - given;
    // Which way round the pair is read. Both directions are the same relation, and a
    // template that only ever named a sine would let a learner answer without reading which
    // ratio was given.
    const dir = rng.int(0, 1);
    const from = dir === 0 ? "sin" : "cos";
    const to = dir === 0 ? "cos" : "sin";
    const toWord = dir === 0 ? "cosine" : "sine";

    return {
      prompt: `$\\${from} ${given}^{\\circ}$ has exactly the same value as the ${toWord} of one angle between $0^{\\circ}$ and $90^{\\circ}$. Which angle is it, in degrees? Enter one number, with no degree sign.`,
      answer: numericAnswer(`${answer}`),
      params: { given, answer, dir },
      hints: [
        "The right angle has already taken $90^{\\circ}$ of a triangle's total, so the other two corners share the $90^{\\circ}$ that is left. Two angles adding to a right angle are complementary.",
        "Standing at one of those two angles and then at the other swaps which leg is opposite and which is adjacent, so a sine read at one of them is a cosine read at the other.",
        "Take the angle you were given away from a right angle. What is left is its complement, and that is the angle the cofunction names.",
      ],
      worked_solution: [
        `The two acute angles of a right triangle add to $90^{\\circ}$, which is what makes them complementary.`,
        `Moving from one of them to the other swaps the opposite side with the adjacent one, so it turns a sine into a cosine and a cosine into a sine. That is the cofunction relation: $\\${from} \\theta = \\${to}(90^{\\circ} - \\theta)$.`,
        `Here $\\theta = ${given}^{\\circ}$, so the complement is $90^{\\circ} - ${given}^{\\circ}$.`,
        `That leaves $${answer}$, so $\\${from} ${given}^{\\circ} = \\${to} ${answer}^{\\circ}$ and the angle is $${answer}$ degrees.`,
      ],
    };
  },
  varietyKey: (params) => `${params.dir ?? 0}:${params.given ?? 0}`,
};

/** TRG.2's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const TRG2_TEMPLATES: readonly ItemTemplate[] = [
  d9_trg2_ratio_from_sides_l1,
  d9_trg2_special_exact_l2,
  d9_trg2_missing_side_l2,
  d9_trg2_exact_side_radical_l3,
  d9_trg2_cofunction_angle_l3,
];
