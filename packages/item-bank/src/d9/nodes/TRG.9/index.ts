import {
  exactTrigValueAnswer,
  type ItemTemplate,
  multipleChoiceAnswer,
  type Rng,
} from "../../../template";

/**
 * TRG.9 practice templates: the sum, difference and double-angle identities, asked in the
 * only two shapes this node can be graded in.
 *
 * ## The gate that shapes every template here
 *
 * The expression grammar behind the checker contains NO trigonometric functions, measured
 * rather than assumed (`docs/D9_Domain_Plan.md`, "No symbolic identity shape grades"): a key
 * of `cos(2*t)` returns `invalid_input/unsupported_syntax` against ITSELF, and
 * `2*cos(t)^2 - 1` submitted against it fails the same way. So the identities cannot be
 * asked for symbolically at all. Not "expand $\cos(A + B)$", not "reduce $2\sin t\cos t$ to
 * one function", not "verify this identity". No amount of careful typing works around a
 * grammar that has no `cos` in it.
 *
 * Every one of the five slots below is therefore an EVALUATION or a NAMING:
 *
 *  - L1  a sum-formula value at a non-special angle, exact;
 *  - L2a $\sin 2\theta$ from a given $\sin\theta$ and a quadrant, which needs the
 *        Pythagorean identity first;
 *  - L2b which identity collapses a shown expression to one function, as a choice of word;
 *  - L3a $\cos 2\theta$ from whichever of its three forms matches the function handed over;
 *  - L3b a compound angle read off TWO separately given functions, which needs the
 *        Pythagorean identity twice, two independent sign decisions, and then the right one
 *        of the four combining formulas.
 *
 * ## The two slots that moved, and where the difference formula went
 *
 * `formula-name` used to be L3b. The paragraph on that template records why its answer
 * cannot be read off the operator, and that observation is still true: it is a genuine
 * recognition task and a fine L2. What it is not is the hardest thing this node can ask,
 * because the answer is one of three words printed in its own prompt, and picking between
 * three printed words is a different order of difficulty from chaining identities. It is now
 * L2b.
 *
 * The composition is locked at exactly 1xL1 / 2xL2 / 2xL3 per node, in `d9.test.ts` and in
 * `validate.ts` both, so demoting one item FORCED an L2 out. The one retired was
 * `d9.trg9.difference-exact.l2`, whose only step up from the L1 beside it was the sign
 * between the two products, over the same four special angles and the same two keys.
 *
 * The difference formula did not leave with it. `compound-angle.l3` draws all four combining
 * shapes, two of which are differences, so the sign pattern that slot existed to test is now
 * tested inside a problem that also has to find two of its four inputs first.
 *
 * ## Answer path, measured rather than assumed
 *
 * Four shapes are `exactTrigValueAnswer` and one is `multipleChoiceAnswer`:
 *
 *  - The two radical keys are the two the spike graded end to end. Key
 *    `(sqrt(6)-sqrt(2))/4` accepts itself and the split spelling `sqrt(6)/4 - sqrt(2)/4`,
 *    and rejects `0.2588` as `wrong_representation`. Every angle here is chosen so the value
 *    lands on that key or on `(sqrt(6)+sqrt(2))/4`; `\cos 105^{\circ}`, whose value is
 *    `(sqrt(2)-sqrt(6))/4`, is deliberately ABSENT because nothing measured that shape.
 *  - A plain fraction key under `exactTrigValueAnswer` grades and does NOT have to be in
 *    lowest terms, but a decimal against it is `wrong_representation`. So the three
 *    fraction-answered prompts ask for a fraction and no hint claims a reduction is
 *    required. `compound-angle` reduces its key anyway, for a reason that is about the
 *    notation tag rather than about the grader, and its own docstring gives it; the
 *    unreduced spelling a learner writes straight off the two products still grades, which
 *    `practiceShapes.test.ts` asserts through the real checker rather than assuming.
 *  - `sqrt` needs its parentheses (`sqrt3/2` is `unknown_symbol`) and `^(1/2)` is not a
 *    spelling of a root, so every prompt that wants a radical names the `sqrt(...)` form.
 *  - Multiple choice is a byte-exact match INCLUDING case, so the three option words are
 *    printed in the prompt exactly as they must be typed.
 *
 * ## Why the hints here name no formula by its own name
 *
 * `hint_leaks_answer` matches the answer key as a standalone value after stripping
 * whitespace, and `formula-name`'s keys ARE the words `sum`, `difference` and
 * `double-angle`. A hint reading "count the angles: two of them means a sum or a difference"
 * would leak on exactly the draws whose answer is one of those words. So that template's
 * hints describe the SHAPE and the sign instead, which is also what R13 asks for.
 */

export const TRG9_NODE = "TRG.9";

/**
 * The two exact values every sum draw in this file lands on, as the checker's own spelling.
 * Named rather than inlined because the whole authorable set of this node's RADICAL shapes
 * is these two keys, and a third one would be an unmeasured claim. The fraction-answered
 * slots are a separate matter: their values come from Pythagorean triples and are exact
 * without being radicals.
 */
const MINUS_KEY = "(sqrt(6)-sqrt(2))/4";
const PLUS_KEY = "(sqrt(6)+sqrt(2))/4";

/**
 * Each special angle's exact sine and cosine as the RADICAND over 2: `2` means
 * $\dfrac{\sqrt{2}}{2}$ and `1` means $\dfrac{1}{2}$.
 *
 * Carried as a radicand rather than as LaTeX so that a product of two of them is a
 * multiplication of two integers, which is what lets one helper print every product in this
 * file without a table of special cases.
 */
const RADICAND: Record<number, { sin: number; cos: number }> = {
  30: { sin: 1, cos: 3 },
  45: { sin: 2, cos: 2 },
  60: { sin: 3, cos: 1 },
};

/** One special-angle value, as LaTeX. */
function valueTex(radicand: number): string {
  return radicand === 1 ? "\\dfrac{1}{2}" : `\\dfrac{\\sqrt{${radicand}}}{2}`;
}

/**
 * The product of two special-angle values, as LaTeX over 4.
 *
 * Every case in this file multiplies radicands from `{1, 2, 3}` with the two never equal, so
 * the product is 2, 3 or 6 and always squarefree. The whole-root branch exists so the helper
 * cannot print `\sqrt{4}` if a later case pairs an angle with itself.
 */
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

/** A degree measure, with the degree mark KaTeX needs rather than a bare number. */
function angleTex(degrees: number): string {
  return `${degrees}^{\\circ}`;
}

interface CombineCase {
  /** `true` for the sine formula, `false` for the cosine one. */
  isSine: boolean;
  /** The two special angles, in the order the prompt writes them. */
  a: number;
  b: number;
}

/**
 * The sum draws: six ways of reaching one of the two graded keys.
 *
 * The order of `a` and `b` is a real variety axis rather than a cosmetic one. For sine the two
 * products swap, so $\sin(30^{\circ} + 45^{\circ})$ asks the learner to pair $\sin 30^{\circ}$
 * with $\cos 45^{\circ}$ where $\sin(45^{\circ} + 30^{\circ})$ pairs the other way round, and a
 * learner running on the shape of the previous instance puts the wrong two values together.
 *
 * `cos` appears only at $75^{\circ}$: $\cos(60^{\circ} + 45^{\circ})$ is negative and keys as a
 * shape the spike never graded.
 */
const SUM_CASES: readonly CombineCase[] = [
  { isSine: false, a: 45, b: 30 },
  { isSine: false, a: 30, b: 45 },
  { isSine: true, a: 45, b: 30 },
  { isSine: true, a: 30, b: 45 },
  { isSine: true, a: 60, b: 45 },
  { isSine: true, a: 45, b: 60 },
];

/**
 * One sum evaluation, rendered.
 *
 * This took a second argument until `d9.trg9.difference-exact.l2` was retired, and rendered
 * the difference draws down the same path with the sign flipped. Nothing renders a
 * difference here now, so the branch is gone rather than left standing unreachable: the
 * `a - b` heading, the `\sin(A - B)` formula line and the "difference formula" wording have
 * no caller. The sine-against-cosine split below is a different thing and stays, because
 * both of those ARE drawn.
 */
function renderCombine(chosen: CombineCase) {
  const { isSine, a, b } = chosen;
  const target = a + b;
  const inner = `${angleTex(a)} + ${angleTex(b)}`;
  const fn = isSine ? "\\sin" : "\\cos";

  // The two products, in the order the formula writes them. Sine pairs each function with
  // the other angle's cofunction; cosine pairs like with like.
  const firstPair = isSine
    ? [RADICAND[a]?.sin ?? 1, RADICAND[b]?.cos ?? 1]
    : [RADICAND[a]?.cos ?? 1, RADICAND[b]?.cos ?? 1];
  const secondPair = isSine
    ? [RADICAND[a]?.cos ?? 1, RADICAND[b]?.sin ?? 1]
    : [RADICAND[a]?.sin ?? 1, RADICAND[b]?.sin ?? 1];
  const [firstLeft, firstRight] = firstPair as [number, number];
  const [secondLeft, secondRight] = secondPair as [number, number];

  // Cosine flips the sign it was given, sine keeps it. Over a SUM that reads as one branch,
  // but it is the same rule `compound-angle` applies over all four combining shapes, which
  // is why both files spell it the same way.
  const op = isSine ? "+" : "-";
  const key = op === "-" ? MINUS_KEY : PLUS_KEY;
  const answerTex = `\\dfrac{\\sqrt{6} ${op} \\sqrt{2}}{4}`;

  const formulaTex = isSine
    ? `\\sin(A + B) = \\sin A\\cos B + \\cos A\\sin B`
    : `\\cos(A + B) = \\cos A\\cos B - \\sin A\\sin B`;

  const firstProduct = productTex(firstLeft, firstRight);
  const secondProduct = productTex(secondLeft, secondRight);

  return {
    prompt: `Evaluate $${fn} ${angleTex(target)}$ exactly by writing it as $${fn}(${inner})$ and using the sum formula. Leave the radicals in place rather than rounding, put the result over a whole number rather than over a root, and write a square root as sqrt(...), simplified so that no perfect square is left under the root, for example sqrt(2)/2.`,
    answer: exactTrigValueAnswer(key),
    params: {
      isSine: isSine ? 1 : 0,
      // Pinned rather than dropped now that nothing draws a difference. The web visual
      // decodes this key (`evaluationVisual` in `worked/d9TRG9.tsx`), so removing it would
      // change a shipped params contract to say exactly what a `0` already says.
      isDifference: 0,
      a,
      b,
      target,
    },
    hints: [
      `Both $${angleTex(a)}$ and $${angleTex(b)}$ are special angles, so all four values the formula asks for are exact ones you already know. Write those down before you substitute anything.`,
      isSine
        ? `The sum formula for sine pairs each angle's sine with the OTHER angle's cosine, and the sign between the two products is the same sign that sits between the angles.`
        : `The sum formula for cosine multiplies the two cosines, multiplies the two sines, and carries the OPPOSITE sign to the one between the angles. It is not the two cosines added.`,
      // Deliberately NOT branched on `op`. `op` selects the key outright, since this slot has
      // exactly two of them, so a hint that said "add" on one branch and "take away" on the
      // other would partition the answers perfectly and hand over the sign — which is the
      // whole graded skill of the slot. It stated the conclusion for the learner's own draw
      // and `hint_leaks_answer` could not see it, because neither wording contains a digit or
      // a radical. This states what is true of both cases and leaves the sign where the
      // formula in hint 2 put it. Retiring the difference template made the point sharper,
      // not weaker: with only sums left, `op` is now fixed by `isSine` alone.
      "Both products come out over the same denominator, so the two numerators combine over that one denominator, carrying whichever sign the formula put between them, and the radicals stay as they stand.",
    ],
    worked_solution: [
      `$${angleTex(target)}$ is not a special angle, but $${inner}$ is built from two that are, so the sum formula applies with $A = ${angleTex(a)}$ and $B = ${angleTex(b)}$.`,
      `The formula is $${formulaTex}$.`,
      `Substituting the exact values gives $${valueTex(firstLeft)} \\cdot ${valueTex(firstRight)} ${op} ${valueTex(secondLeft)} \\cdot ${valueTex(secondRight)}$.`,
      `Each product is one radical over $4$: $${firstProduct} ${op} ${secondProduct}$.`,
      `${op === "-" ? "Subtracting" : "Adding"} over that shared denominator gives $${fn} ${angleTex(target)} = ${answerTex}$, typed as ${key}.`,
    ],
  };
}

/**
 * L1, a sum-formula value. The tier is L1 because nothing has to be decided: the split is
 * handed over in the prompt, and the work is substituting four values a learner already knows
 * into a formula the lesson has just stated.
 *
 * The prompt names the square-free radicand because the checker enforces it. Without that
 * clause `(sqrt(24) - sqrt(8))/8` — equal to the key, and obeying every instruction that WAS
 * printed — graded `not_simplified`, so a learner could be refused for a rule the prompt
 * never stated. Three prompts in TRG.2, TRG.3 and TRG.6 carried the same defect and were
 * fixed alongside it; the sweep in `answerFormat.test.ts` now runs over the whole population
 * with no exemptions, so a fourth cannot appear silently.
 */
export const d9_trg9_sum_exact_l1: ItemTemplate = {
  template_id: "d9.trg9.sum-exact.l1",
  node_id: TRG9_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const chosen =
      SUM_CASES[rng.int(0, SUM_CASES.length - 1)] ?? (SUM_CASES[0] as CombineCase);
    return renderCombine(chosen);
  },
  varietyKey: (params) => `${params.isSine ?? 0}:${params.a ?? 0}:${params.b ?? 0}`,
};

/**
 * Pythagorean triples as `[leg, leg, hypotenuse]`, so a given sine or cosine has an exact
 * rational partner and every double-angle value comes out as a fraction rather than a
 * radical. A radical here would be unauthorable: only two radical keys are graded on this
 * node and neither is a double-angle value.
 *
 * Exported because `compound-angle.l3`'s `tripleA` and `tripleB` params are INDEXES into this
 * array, so nothing downstream can resolve either param without the array itself. The worked
 * figure in `apps/web/src/lessons/worked/d9TRG9.tsx` held a copy of these five rows until it
 * was pointed here, and a copy is the one arrangement that fails silently: reorder a row on
 * this side and the figure goes on rendering, goes on passing its layout sweep, and draws a
 * different triangle than the question asks about. No gate compares an answer to a picture,
 * so exporting the table removes the failure mode rather than guarding it.
 *
 * It is also load-bearing for a REJECTION rather than only for variety. `compound-angle.l3`
 * refuses the `[3, 4, 5]` / `[7, 24, 25]` pairing, because the second is the double-angle
 * image of the first and the combined angle can land back on one of the two given ones,
 * printing the answer on the face of the question (measured: 128 of 5120 draws). That proof is
 * a fact about these five rows and not about the mathematics, so a sixth triple added here
 * owes a re-measurement there.
 */
export const TRG9_TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
];

/** The quadrant names, in the register the prompts use. */
const QUADRANT_NAME: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
};

/**
 * L2b, $\sin 2\theta$ from a given sine and a quadrant.
 *
 * Two ideas at once, which is what makes it L2 rather than L1: the doubling identity needs
 * BOTH functions, so the Pythagorean identity has to produce the cosine first, and the
 * quadrant is what decides its sign. A learner who takes the positive root every time gets
 * the magnitude right and the sign wrong on half the draws, which is the specific error this
 * tier exists to provoke.
 *
 * The sine is always positive here, so the quadrant is genuinely one of two rather than
 * being fixed by the given value.
 */
export const d9_trg9_double_sine_l2: ItemTemplate = {
  template_id: "d9.trg9.double-sine.l2",
  node_id: TRG9_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const [first, second, hyp] = TRG9_TRIPLES[rng.int(0, TRG9_TRIPLES.length - 1)] ?? [
      3, 4, 5,
    ];
    // Which leg the sine is drawn from is itself a draw, so the cosine is not always the
    // larger of the pair and the prompt cannot be read off the shape of the numbers.
    const sineIsFirst = rng.int(0, 1) === 1;
    const sineLeg = sineIsFirst ? first : second;
    const cosineLeg = sineIsFirst ? second : first;
    // Sine is positive in both, so both quadrants are consistent with the given value.
    const quadrant = rng.int(0, 1) === 1 ? 2 : 1;
    const cosineNegative = quadrant === 2;
    const doubled = (cosineNegative ? -2 : 2) * sineLeg * cosineLeg;
    const square = hyp * hyp;

    const sineTex = `\\dfrac{${sineLeg}}{${hyp}}`;
    const cosineTex = cosineNegative
      ? `-\\dfrac{${cosineLeg}}{${hyp}}`
      : `\\dfrac{${cosineLeg}}{${hyp}}`;
    const answerTex =
      doubled < 0 ? `-\\dfrac{${-doubled}}{${square}}` : `\\dfrac{${doubled}}{${square}}`;

    return {
      prompt: `Given $\\sin\\theta = ${sineTex}$ with $\\theta$ in the ${QUADRANT_NAME[quadrant]} quadrant, find the exact value of $\\sin 2\\theta$. Enter it as a fraction.`,
      answer: exactTrigValueAnswer(`${doubled}/${square}`),
      params: {
        sineLeg,
        cosineLeg,
        hyp,
        quadrant,
        doubled,
      },
      hints: [
        "The doubling identity for sine is $\\sin 2\\theta = 2\\sin\\theta\\cos\\theta$, so it needs the cosine as well as the sine you were handed.",
        "Get the cosine from $\\sin^{2}\\theta + \\cos^{2}\\theta = 1$: take the square of the given value away from $1$ and root what is left. That fixes the size of the cosine but not its sign.",
        "The quadrant is what fixes the sign, and the sign travels straight through the multiplication into the final answer.",
      ],
      worked_solution: [
        `The identity to use is $\\sin 2\\theta = 2\\sin\\theta\\cos\\theta$, so the cosine has to be found before anything can be multiplied.`,
        `Rearrange the Pythagorean identity so the cosine stands alone: $\\cos^{2}\\theta = 1 - \\sin^{2}\\theta$.`,
        `Substitute the sine that was handed over: $\\cos^{2}\\theta = 1 - \\dfrac{${sineLeg * sineLeg}}{${square}}$.`,
        `That subtraction leaves $\\cos^{2}\\theta = \\dfrac{${cosineLeg * cosineLeg}}{${square}}$.`,
        `In the ${QUADRANT_NAME[quadrant]} quadrant the cosine is ${cosineNegative ? "negative" : "positive"}, so $\\cos\\theta = ${cosineTex}$.`,
        `Then $\\sin 2\\theta = 2 \\cdot ${sineTex} \\cdot ${cosineTex.startsWith("-") ? `\\left(${cosineTex}\\right)` : cosineTex}$.`,
        `That gives $\\sin 2\\theta = ${answerTex}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.hyp ?? 0}:${params.sineLeg ?? 0}:${params.quadrant ?? 0}`,
};

/**
 * L3a, $\cos 2\theta$ from whichever of its three forms fits.
 *
 * The L3 lift is a CHOICE the learner has to make before any arithmetic: cosine has three
 * right-hand sides, and only one of them is written in the function they were handed. Picking
 * that one means the other function is never needed, and it also means the quadrant, which
 * the prompt states and which fixes the sign of that other function, changes nothing at all,
 * because the given value appears squared. A learner who reaches for
 * $\cos^{2}\theta - \sin^{2}\theta$ every time does two extra steps and gives the sign a
 * chance to go wrong on the way.
 *
 * The 3-4-5 triple is deliberately absent: with $\sin\theta = \dfrac{3}{5}$ in the first
 * quadrant this is the lesson's own check-for-understanding question, and a practice slot
 * that re-asked it would be testing recall of the CFU.
 */
export const d9_trg9_double_cosine_l3: ItemTemplate = {
  template_id: "d9.trg9.double-cosine.l3",
  node_id: TRG9_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const usable = TRG9_TRIPLES.filter(([leg]) => leg !== 3);
    const [first, second, hyp] = usable[rng.int(0, usable.length - 1)] ?? [5, 12, 13];
    const givenIsSine = rng.int(0, 1) === 1;
    const givenIsFirst = rng.int(0, 1) === 1;
    const givenLeg = givenIsFirst ? first : second;
    const negative = rng.int(0, 1) === 1;
    // The quadrants consistent with the sign of the value that was given, so the prompt is
    // never self-contradictory: sine is positive above the axis, cosine to the right of it.
    const quadrant = givenIsSine
      ? negative
        ? rng.pick([3, 4])
        : rng.pick([1, 2])
      : negative
        ? rng.pick([2, 3])
        : rng.pick([1, 4]);

    const square = hyp * hyp;
    const givenSquare = givenLeg * givenLeg;
    // $1 - 2\sin^{2}\theta$ when the sine was given, $2\cos^{2}\theta - 1$ when the cosine
    // was. Both read the given value only, and both square it.
    const value = givenIsSine ? square - 2 * givenSquare : 2 * givenSquare - square;

    const givenTex = negative
      ? `-\\dfrac{${givenLeg}}{${hyp}}`
      : `\\dfrac{${givenLeg}}{${hyp}}`;
    const functionTex = givenIsSine ? "\\sin\\theta" : "\\cos\\theta";
    const formTex = givenIsSine
      ? "\\cos 2\\theta = 1 - 2\\sin^{2}\\theta"
      : "\\cos 2\\theta = 2\\cos^{2}\\theta - 1";
    const substituted = givenIsSine
      ? `1 - 2 \\cdot \\dfrac{${givenSquare}}{${square}}`
      : `2 \\cdot \\dfrac{${givenSquare}}{${square}} - 1`;
    const overCommon = givenIsSine
      ? `\\dfrac{${square}}{${square}} - \\dfrac{${2 * givenSquare}}{${square}}`
      : `\\dfrac{${2 * givenSquare}}{${square}} - \\dfrac{${square}}{${square}}`;
    const answerTex =
      value < 0 ? `-\\dfrac{${-value}}{${square}}` : `\\dfrac{${value}}{${square}}`;

    return {
      prompt: `Given $${functionTex} = ${givenTex}$ with $\\theta$ in the ${QUADRANT_NAME[quadrant]} quadrant, find the exact value of $\\cos 2\\theta$. Enter it as a fraction.`,
      answer: exactTrigValueAnswer(`${value}/${square}`),
      params: {
        givenIsSine: givenIsSine ? 1 : 0,
        givenLeg,
        hyp,
        negative: negative ? 1 : 0,
        quadrant,
        value,
      },
      hints: [
        "Cosine has three doubling forms: $\\cos 2\\theta = \\cos^{2}\\theta - \\sin^{2}\\theta$, $\\cos 2\\theta = 1 - 2\\sin^{2}\\theta$ and $\\cos 2\\theta = 2\\cos^{2}\\theta - 1$. Choose the one written in the function you were actually handed.",
        "That form asks for the given value SQUARED, and squaring leaves no sign behind, so the other function is never needed and neither is its sign.",
        "Work over the square of the denominator: the squared fraction already sits over it, and $1$ is that same number over itself.",
      ],
      worked_solution: [
        `The value handed over is the ${givenIsSine ? "sine" : "cosine"}, so the form to reach for is the one written in that function alone: $${formTex}$.`,
        `Square it: $\\left(${givenTex}\\right)^{2} = \\dfrac{${givenSquare}}{${square}}$. Squaring removes any sign, which is why the quadrant does not enter this calculation.`,
        `Substituting gives $${substituted} = ${overCommon}$.`,
        `So $\\cos 2\\theta = ${answerTex}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.hyp ?? 0}:${params.givenLeg ?? 0}:${params.givenIsSine ?? 0}:${params.negative ?? 0}`,
};

/** How an angle argument is written when its multiplier is 1. */
function argTex(multiple: number): string {
  return multiple === 1 ? "t" : `${multiple}t`;
}

interface NameCase {
  /** The option word this expression's identity is called. */
  key: "sum" | "difference" | "double-angle";
  /** The expression the learner reads, as LaTeX. */
  expression: string;
  /** The general pattern it matches, as LaTeX. */
  pattern: string;
  /** What it collapses to, as LaTeX. */
  collapsed: string;
  /** How the reasoning reads: what the sign and the angles say. */
  reading: string;
}

/**
 * Every expression `formula-name` can show, built for a drawn pair of multipliers.
 *
 * The two combining families are each given both of their shapes, because the sign is the
 * whole trap: a plus between two products of sine and cosine means a plus between the angles,
 * while a plus between two products of like functions means a MINUS between them. Two
 * expressions that differ only in one operator therefore have different answers, and a
 * learner reading the operator alone gets one of the two wrong.
 */
function nameCases(m: number, n: number): readonly NameCase[] {
  const outer = argTex(m);
  const inner = argTex(n);
  return [
    {
      key: "sum",
      expression: `\\sin ${outer}\\cos ${inner} + \\cos ${outer}\\sin ${inner}`,
      pattern: "\\sin A\\cos B + \\cos A\\sin B",
      collapsed: `\\sin ${argTex(m + n)}`,
      reading:
        "each product pairs a sine with the other angle's cosine, and the plus between the products is the same plus that sits between the angles",
    },
    {
      key: "sum",
      expression: `\\cos ${outer}\\cos ${inner} - \\sin ${outer}\\sin ${inner}`,
      pattern: "\\cos A\\cos B - \\sin A\\sin B",
      collapsed: `\\cos ${argTex(m + n)}`,
      reading:
        "the products pair like function with like, and cosine carries the opposite sign, so the minus in the middle means the angles are added",
    },
    {
      key: "difference",
      expression: `\\sin ${outer}\\cos ${inner} - \\cos ${outer}\\sin ${inner}`,
      pattern: "\\sin A\\cos B - \\cos A\\sin B",
      collapsed: `\\sin ${argTex(Math.abs(m - n))}`,
      reading:
        "each product pairs a sine with the other angle's cosine, and the minus between the products is the same minus that sits between the angles",
    },
    {
      key: "difference",
      expression: `\\cos ${outer}\\cos ${inner} + \\sin ${outer}\\sin ${inner}`,
      pattern: "\\cos A\\cos B + \\sin A\\sin B",
      collapsed: `\\cos ${argTex(Math.abs(m - n))}`,
      reading:
        "the products pair like function with like, and cosine carries the opposite sign, so the plus in the middle means one angle is taken from the other",
    },
    {
      key: "double-angle",
      expression: `2\\sin ${outer}\\cos ${outer}`,
      pattern: "2\\sin A\\cos A",
      collapsed: `\\sin ${argTex(2 * m)}`,
      reading: "both factors sit at the same angle, so no pair of angles is being combined",
    },
    {
      key: "double-angle",
      expression: `\\cos^{2} ${outer} - \\sin^{2} ${outer}`,
      pattern: "\\cos^{2} A - \\sin^{2} A",
      collapsed: `\\cos ${argTex(2 * m)}`,
      reading: "both squares sit at the same angle, so no pair of angles is being combined",
    },
    {
      key: "double-angle",
      expression: `1 - 2\\sin^{2} ${outer}`,
      pattern: "1 - 2\\sin^{2} A",
      collapsed: `\\cos ${argTex(2 * m)}`,
      reading:
        "only one angle appears anywhere in it, and this is the form of the doubling identity written in the sine alone",
    },
    {
      key: "double-angle",
      expression: `2\\cos^{2} ${outer} - 1`,
      pattern: "2\\cos^{2} A - 1",
      collapsed: `\\cos ${argTex(2 * m)}`,
      reading:
        "only one angle appears anywhere in it, and this is the form of the doubling identity written in the cosine alone",
    },
  ];
}

/** The option words, printed in the prompt exactly as the checker matches them. */
const NAME_OPTIONS = "`sum`, `difference`, or `double-angle`";

/**
 * L2b, naming the identity.
 *
 * This is the slot that replaces "reduce this to a single function", which is unauthorable
 * here: the answer to it would be an expression containing `sin` or `cos` and no such key
 * grades. Naming the identity keeps the recognition work, which is the part a learner
 * actually gets wrong, and moves the answer into a grammar the checker has.
 *
 * ## Why this is L2 and not the node's L3
 *
 * It shipped as L3 on the argument that the answer cannot be read off the operator: the sign
 * in a cosine expansion is the opposite of the sign between its angles, so two of the four
 * combining shapes say the reverse of what they look like. That observation is true, it is
 * measured below, and it is precisely why this is a real L2 rather than a recall drill.
 *
 * What it does not make it is the hardest item on the node. The learner is choosing one of
 * three words printed in their own prompt, a blind guess is right a third of the time, and
 * nothing has to be computed, carried or combined to answer. The tier moved DELIBERATELY,
 * against `d9.trg9.compound-angle.l3`, which asks for a value no prompt on the node prints
 * and takes six steps to reach. Do not read the demotion as a judgement that the recognition
 * work here is easy or dispensable: it is the same item, at the tier it fits.
 *
 * ## Why the prompt names the cut instead of leaving it to hint 1
 *
 * Two of the eight shapes are the degenerate $A = B$ case of a listed sum pattern:
 * $2\sin 5t\cos 5t$ is $\sin A\cos B + \cos A\sin B$ at $A = B$, and
 * $\cos^{2}5t - \sin^{2}5t$ is $\cos A\cos B - \sin A\sin B$ at $A = B$. Both collapse to a
 * single function of a single angle by the combining identity as well as by the doubling one,
 * which is how the doubling identity is normally derived in the first place, so on those
 * draws the prompt's stated criterion admitted TWO of the three options and only one was
 * keyed. Choose-one is compared with `===`, so the other defensible reading came back
 * `value_mismatch` — a learner told their mathematics was wrong for deriving it correctly.
 * Measured at `24493680`: 186 of 800 draws, 23.3%.
 *
 * The criterion that separates them — count the DISTINCT angles — already existed, but it
 * lived in hint 1 and in each case's `reading`, which surfaces in the worked solution. Both
 * arrive after the attempt, and a learner is not owed a hint to make a prompt answerable. So
 * the cut moved into the question and the hints moved down a rung: the first now covers the
 * two doubling shapes that are written as a square rather than as a product, which is the
 * part of the count that is genuinely easy to miss, and the second still separates the two
 * combining families by their operator.
 */
export const d9_trg9_formula_name_l2: ItemTemplate = {
  template_id: "d9.trg9.formula-name.l2",
  node_id: TRG9_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const m = rng.int(2, 5);
    // Strictly SMALLER than `m`, not merely different from it. Two different angles is what a
    // combining shape needs, but sine is odd, so a difference drawn the other way round would
    // collapse to $\sin(n - m)t$, whose value is the NEGATIVE of what the third worked step
    // would print. Keeping the larger multiplier first makes every collapsed angle positive.
    const n = rng.int(1, m - 1);
    const cases = nameCases(m, n);
    const index = rng.int(0, cases.length - 1);
    const chosen = cases[index] ?? (cases[0] as NameCase);
    const combines = chosen.key !== "double-angle";

    return {
      prompt: `One identity from this lesson rewrites $${chosen.expression}$ as a single trigonometric function of a single angle. Sort it by how many different angles the expression is written over, since a pattern given over two angles also fits when the two happen to be equal. Which identity is it? Answer with exactly one of ${NAME_OPTIONS}, typed in lowercase.`,
      answer: multipleChoiceAnswer(chosen.key),
      params: { shape: index, m, n },
      hints: [
        "Two of the doubling shapes are written as a $1$ and a square rather than as a product, so an expression carrying nothing but one angle is still that one however little it looks like a pair of factors.",
        "Where two unequal angles do appear, the operator is what tells the remaining pair apart. Where each product pairs a sine with the other angle's cosine, the operator in the middle is the one between the angles; where the products pair like function with like, it is the reverse.",
      ],
      worked_solution: [
        combines
          ? `Two unequal angles appear, $${argTex(m)}$ and $${argTex(n)}$, so this is one of the two identities that combine a pair of angles rather than the one that doubles a single angle.`
          : `Every function in the expression sits at the one angle $${argTex(m)}$, so nothing here is combining two different angles.`,
        `The pattern to match is $${chosen.pattern}$: ${chosen.reading}.`,
        `Read with $A = ${argTex(m)}$${combines ? ` and $B = ${argTex(n)}$` : ""}, it collapses to $${chosen.collapsed}$.`,
        `The identity that does it is the ${chosen.key} formula, so the answer is ${chosen.key}.`,
      ],
    };
  },
  varietyKey: (params) => `${params.shape ?? 0}:${params.m ?? 0}:${params.n ?? 0}`,
};

/** The greatest common divisor of two non-negative integers. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** A signed rational as LaTeX, with the sign OUTSIDE the fraction, as every key here is. */
function signedFracTex(numerator: number, denominator: number): string {
  return numerator < 0
    ? `-\\dfrac{${-numerator}}{${denominator}}`
    : `\\dfrac{${numerator}}{${denominator}}`;
}

/** The same value bracketed when it is negative, so no minus sign lands against an operator. */
function factorTex(numerator: number, denominator: number): string {
  const tex = signedFracTex(numerator, denominator);
  return numerator < 0 ? `\\left(${tex}\\right)` : tex;
}

interface CompoundShape {
  /** `true` for a sine of the combined angle, `false` for a cosine of it. */
  isSine: boolean;
  /** `true` when the two angles are subtracted. */
  isDifference: boolean;
}

/**
 * The four combining shapes, INDEXED BY THE `shape` PARAM.
 *
 * The order is a published contract rather than an internal detail: `0` is $\sin(A + B)$,
 * `1` is $\sin(A - B)$, `2` is $\cos(A + B)$ and `3` is $\cos(A - B)$, and the
 * worked-solution visual for this template in `apps/web/src/lessons/worked/d9TRG9.tsx` reads
 * the same number off `template_params` to decide which formula it draws. Reordering this
 * array therefore re-labels every frozen instance's figure without touching the figure, and
 * nothing on the web side can notice. `practiceShapes.test.ts` pins each index against the
 * prompt it actually produces, which is the half of the contract this package can hold.
 */
const COMPOUND_SHAPES: readonly CompoundShape[] = [
  { isSine: true, isDifference: false },
  { isSine: true, isDifference: true },
  { isSine: false, isDifference: false },
  { isSine: false, isDifference: true },
];

/** One drawn compound-angle instance, with everything the render needs already computed. */
interface SolvedCompound {
  tripleA: number;
  tripleB: number;
  givenSineA: number;
  givenSineB: number;
  quadrantA: number;
  quadrantB: number;
  shape: number;
  /** Each function's numerator over its own hypotenuse, carrying the quadrant's sign. */
  sineA: number;
  cosineA: number;
  sineB: number;
  cosineB: number;
  hypA: number;
  hypB: number;
  /** The two products the formula multiplies, before its operator joins them. */
  firstProduct: number;
  secondProduct: number;
  /** The combination over `hypA * hypB`, and the same value in lowest terms. */
  rawNumerator: number;
  rawDenominator: number;
  divisor: number;
  numerator: number;
  denominator: number;
}

/**
 * Draw a compound-angle instance and solve it.
 *
 * `tripleB` steps off `tripleA` by a non-zero offset rather than being drawn and re-drawn,
 * so the two triples are different by construction. That matters for more than variety: it
 * is what makes the zero and integer answers unreachable, argued on the template below.
 *
 * The sign of every value is read off the quadrant rather than drawn, which is what keeps a
 * prompt from contradicting itself, and it is also why the seven published params are
 * enough to reconstruct the whole item. The prompt states the FIRST leg of its triple over
 * the hypotenuse in both cases, so `givenSineA` alone says which function that leg belongs
 * to and which one the learner has to recover.
 */
function drawCompound(rng: Rng): SolvedCompound {
  const tripleA = rng.int(0, TRG9_TRIPLES.length - 1);
  const tripleB = (tripleA + rng.int(1, TRG9_TRIPLES.length - 1)) % TRG9_TRIPLES.length;
  const givenSineA = rng.int(0, 1);
  const givenSineB = rng.int(0, 1);
  const quadrantA = rng.int(1, 4);
  const quadrantB = rng.int(1, 4);
  const shape = rng.int(0, COMPOUND_SHAPES.length - 1);

  const [firstA, secondA, hypA] = TRG9_TRIPLES[tripleA] ?? [3, 4, 5];
  const [firstB, secondB, hypB] = TRG9_TRIPLES[tripleB] ?? [5, 12, 13];

  // Sine is positive above the horizontal axis, cosine to the right of the vertical one.
  const sineSignA = quadrantA <= 2 ? 1 : -1;
  const cosineSignA = quadrantA === 1 || quadrantA === 4 ? 1 : -1;
  const sineSignB = quadrantB <= 2 ? 1 : -1;
  const cosineSignB = quadrantB === 1 || quadrantB === 4 ? 1 : -1;

  const sineA = sineSignA * (givenSineA === 1 ? firstA : secondA);
  const cosineA = cosineSignA * (givenSineA === 1 ? secondA : firstA);
  const sineB = sineSignB * (givenSineB === 1 ? firstB : secondB);
  const cosineB = cosineSignB * (givenSineB === 1 ? secondB : firstB);

  const { isSine, isDifference } = COMPOUND_SHAPES[shape] ?? {
    isSine: true,
    isDifference: false,
  };
  // Sine pairs each angle's sine with the other's cosine; cosine pairs like with like. The
  // operator is the one `renderCombine` uses: sine keeps the sign between the angles and
  // cosine reverses it.
  const firstProduct = isSine ? sineA * cosineB : cosineA * cosineB;
  const secondProduct = isSine ? cosineA * sineB : sineA * sineB;
  const rawNumerator =
    isSine === isDifference ? firstProduct - secondProduct : firstProduct + secondProduct;
  const rawDenominator = hypA * hypB;
  const divisor = gcd(Math.abs(rawNumerator), rawDenominator) || 1;

  return {
    tripleA,
    tripleB,
    givenSineA,
    givenSineB,
    quadrantA,
    quadrantB,
    shape,
    sineA,
    cosineA,
    sineB,
    cosineB,
    hypA,
    hypB,
    firstProduct,
    secondProduct,
    rawNumerator,
    rawDenominator,
    divisor,
    numerator: rawNumerator / divisor,
    denominator: rawDenominator / divisor,
  };
}

/** The numerator of the value the prompt states for each angle, sign included. */
function givenNumerators(solved: SolvedCompound): readonly [number, number] {
  return [
    solved.givenSineA === 1 ? solved.sineA : solved.cosineA,
    solved.givenSineB === 1 ? solved.sineB : solved.cosineB,
  ];
}

/**
 * Whether a draw may be served.
 *
 * Three rejections in two kinds, and they are nothing like equally live:
 *
 *  - **A zero answer** and **an answer that reduces to a whole number** are both provably
 *    UNREACHABLE while the two triples differ, and an enumeration of the entire draw space
 *    agrees: 0 of 5120. $\sin(A \pm B) = 0$ needs $\tan A = \mp\tan B$ and
 *    $\cos(A \pm B) = 0$ needs $\tan A\tan B = \pm 1$, so both need the two tangents to
 *    match in size; but a triple's two tangents are $\frac{p}{q}$ and $\frac{q}{p}$, and no
 *    two of the five triples share either. A value of $\pm 1$ is the same condition on the
 *    cofunction, so it goes the same way, and with the value strictly inside $(-1, 1)$ and
 *    never $0$ the reduced denominator is never $1$. The guard stays because it is one
 *    comparison and because the proof is a fact about {@link TRG9_TRIPLES}: add a triple similar
 *    to one already there, say `[6, 8, 10]`, and it starts firing.
 *  - **An answer equal in size to a value the prompt prints** is genuinely reachable, and
 *    exactly one pair of triples reaches it: `[7, 24, 25]` is the double-angle image of
 *    `[3, 4, 5]`, since $\cos(2\arctan\frac{3}{4}) = \frac{7}{25}$, so pairing those two can
 *    land $A \pm B$ back on $\pm A$ or $\pm B$ and hand the learner their answer off the
 *    face of their own question. Measured over the full 5120-draw space: **128 draws, 2.5%,
 *    all of them that one pair in one order or the other.** Size rather than value, because
 *    a prompt printing $\dfrac{3}{5}$ against an answer of $-\dfrac{3}{5}$ is the same
 *    defect one sign along.
 *
 * A rejected draw is re-drawn whole rather than patched, so no axis ends up conditioned on
 * the rejection.
 */
function isAuthorable(solved: SolvedCompound): boolean {
  if (solved.numerator === 0 || solved.denominator === 1) {
    return false;
  }
  const [givenA, givenB] = givenNumerators(solved);
  // Cross-multiplied, so the comparison is exact integer arithmetic rather than two floats.
  return (
    Math.abs(solved.numerator) * solved.hypA !== Math.abs(givenA) * solved.denominator &&
    Math.abs(solved.numerator) * solved.hypB !== Math.abs(givenB) * solved.denominator
  );
}

/**
 * L3b, a compound angle read off two SEPARATELY given functions.
 *
 * ## Why this is the node's hardest slot
 *
 * Every other shape here hands the learner everything the identity needs, or needs one
 * Pythagorean recovery and one sign decision. This one needs six moves that each depend on
 * the last: recover the missing function on $A$, sign it from $A$'s quadrant, do both again
 * on $B$ over a different triple, choose the formula for the shape asked, and only then
 * multiply and combine. The two sign decisions are the point. They are taken from two
 * quadrants drawn independently, so a learner who settles one correctly has learned nothing
 * about the other, and there is no way to arrive at the value by pattern-matching the
 * prompt: nothing in it is the answer, and no draw prints a number of the size the answer
 * has (see {@link isAuthorable}).
 *
 * ## Why it asks for a value and not an expansion
 *
 * The obvious L3 for this node is "expand $\cos(A + B)$", and the grammar gate in the file
 * docstring rules it out: no key containing `cos` grades against anything, itself included.
 * So the chaining has to COLLAPSE, and the only thing it can collapse to is one exact
 * rational. Pythagorean triples are what make that possible, which is the same reason the
 * two double-angle slots use them.
 *
 * ## What the seven params carry
 *
 * `tripleA`, `tripleB`, `givenSineA`, `givenSineB`, `quadrantA`, `quadrantB` and `shape`,
 * in that order, and between them they determine the item outright: the given value is
 * always the FIRST leg of its triple over the hypotenuse, and its sign is not a param
 * because the quadrant already fixes it. Nothing here needs an eighth, including the
 * `varietyKey`, which is those seven concatenated.
 *
 * ## Why the key is reduced when the grader does not ask for it
 *
 * `exactTrigValueAnswer` compares by value, so `-20/65` grades against a key of `-4/13` and
 * the prompt asks only for "a fraction". The reduction is for the notation dispatch instead:
 * `answerNotation` reads the KEY, and a key that came out a whole number would tag the item
 * differently and take the fraction bar off the field. Reducing and then refusing a
 * denominator of $1$ keeps every instance of this template on the same tag.
 *
 * ## It does not re-ask the lesson's check
 *
 * `double-cosine.l3` excludes the 3-4-5 triple because with $\sin\theta = \frac{3}{5}$ in
 * the first quadrant it IS the lesson's CFU. This template keeps that triple, because no
 * draw of it can be that question: the CFU gives one angle and asks for its double, and
 * every draw here gives two angles and asks for their sum or difference. What it excludes
 * instead is pairing 3-4-5 with 7-24-25, and for an unrelated reason.
 */
export const d9_trg9_compound_angle_l3: ItemTemplate = {
  template_id: "d9.trg9.compound-angle.l3",
  node_id: TRG9_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let solved = drawCompound(rng);
    // 2.5% of the space is rejected and the draws are independent, so 24 consecutive misses
    // sits around 10^-38. A draw that somehow survived the loop would still be a correct
    // question, only an easier one, which is the right way for this to degrade.
    for (let attempt = 0; attempt < 24 && !isAuthorable(solved); attempt += 1) {
      solved = drawCompound(rng);
    }

    const {
      sineA,
      cosineA,
      sineB,
      cosineB,
      hypA,
      hypB,
      firstProduct,
      secondProduct,
      rawNumerator,
      rawDenominator,
      divisor,
      numerator,
      denominator,
    } = solved;
    const { isSine, isDifference } = COMPOUND_SHAPES[solved.shape] ?? {
      isSine: true,
      isDifference: false,
    };

    const [givenA, givenB] = givenNumerators(solved);
    const missingA = solved.givenSineA === 1 ? cosineA : sineA;
    const missingB = solved.givenSineB === 1 ? cosineB : sineB;
    const givenFnA = solved.givenSineA === 1 ? "\\sin A" : "\\cos A";
    const givenFnB = solved.givenSineB === 1 ? "\\sin B" : "\\cos B";
    const missingFnA = solved.givenSineA === 1 ? "\\cos A" : "\\sin A";
    const missingFnB = solved.givenSineB === 1 ? "\\cos B" : "\\sin B";
    const missingSqA = solved.givenSineA === 1 ? "\\cos^{2}A" : "\\sin^{2}A";
    const missingSqB = solved.givenSineB === 1 ? "\\cos^{2}B" : "\\sin^{2}B";

    const between = isDifference ? "-" : "+";
    const op = isSine === isDifference ? "-" : "+";
    const compoundTex = `${isSine ? "\\sin" : "\\cos"}(A ${between} B)`;
    const formulaTex = isSine
      ? `\\sin(A ${between} B) = \\sin A\\cos B ${op} \\cos A\\sin B`
      : `\\cos(A ${between} B) = \\cos A\\cos B ${op} \\sin A\\sin B`;

    // The two products in the order the formula writes them, so the substitution step reads
    // left to right against the formula step above it.
    const firstFactors: readonly [number, number] = isSine
      ? [sineA, cosineB]
      : [cosineA, cosineB];
    const secondFactors: readonly [number, number] = isSine
      ? [cosineA, sineB]
      : [sineA, sineB];
    // The second product after the formula's operator has been folded into its sign, so the
    // two terms can be printed as one signed sum rather than as a sign against an operator.
    const secondTerm = op === "-" ? -secondProduct : secondProduct;
    const key = `${numerator}/${denominator}`;

    return {
      prompt: `Given $${givenFnA} = ${signedFracTex(givenA, hypA)}$ with $A$ in the ${QUADRANT_NAME[solved.quadrantA]} quadrant and $${givenFnB} = ${signedFracTex(givenB, hypB)}$ with $B$ in the ${QUADRANT_NAME[solved.quadrantB]} quadrant, find the exact value of $${compoundTex}$. Enter it as a fraction.`,
      answer: exactTrigValueAnswer(key),
      params: {
        tripleA: solved.tripleA,
        tripleB: solved.tripleB,
        givenSineA: solved.givenSineA,
        givenSineB: solved.givenSineB,
        quadrantA: solved.quadrantA,
        quadrantB: solved.quadrantB,
        shape: solved.shape,
      },
      hints: [
        "A combining formula needs the sine AND the cosine of both angles, and one of each is all you were given, so the two that are missing have to come out of $\\sin^{2}\\theta + \\cos^{2}\\theta = 1$ before anything can be substituted.",
        "Rooting that identity fixes how big each missing value is and says nothing about its sign. Each angle carries its own quadrant, and the two are stated separately, so whichever sign one of them takes leaves the other still to decide.",
        "Sine's formulas pair each angle's sine with the OTHER angle's cosine and put the same sign between the products as sits between the angles; cosine's pair like function with like and put the opposite one. Either way both products land over the two denominators multiplied together, so they combine over that one denominator.",
      ],
      worked_solution: [
        `The formula needs the sine and the cosine of both angles, and the prompt states one of each, so the Pythagorean identity $\\sin^{2}\\theta + \\cos^{2}\\theta = 1$ has to supply the other two first.`,
        `For $A$ it leaves $${missingSqA} = 1 - \\dfrac{${givenA * givenA}}{${hypA * hypA}}$, which comes to $\\dfrac{${missingA * missingA}}{${hypA * hypA}}$.`,
        `$A$ is in the ${QUADRANT_NAME[solved.quadrantA]} quadrant, where the ${missingFnA === "\\cos A" ? "cosine" : "sine"} is ${missingA < 0 ? "negative" : "positive"}, so $${missingFnA} = ${signedFracTex(missingA, hypA)}$.`,
        `For $B$ it leaves $${missingSqB} = 1 - \\dfrac{${givenB * givenB}}{${hypB * hypB}}$, which comes to $\\dfrac{${missingB * missingB}}{${hypB * hypB}}$.`,
        `$B$ is in the ${QUADRANT_NAME[solved.quadrantB]} quadrant, where the ${missingFnB === "\\cos B" ? "cosine" : "sine"} is ${missingB < 0 ? "negative" : "positive"}, so $${missingFnB} = ${signedFracTex(missingB, hypB)}$.`,
        `The shape asked for is a ${isSine ? "sine" : "cosine"} of ${isDifference ? "a difference" : "a sum"}, so the formula is $${formulaTex}$.`,
        `Substituting all four values gives $${factorTex(firstFactors[0], hypA)} \\cdot ${factorTex(firstFactors[1], hypB)} ${op} ${factorTex(secondFactors[0], hypA)} \\cdot ${factorTex(secondFactors[1], hypB)}$.`,
        `Each product is one fraction over $${rawDenominator}$, and the two signs together with the operator leave $${signedFracTex(firstProduct, rawDenominator)} ${secondTerm < 0 ? "-" : "+"} \\dfrac{${Math.abs(secondTerm)}}{${rawDenominator}}$.`,
        ...(divisor > 1
          ? [
              `Over that shared denominator those come to $${signedFracTex(rawNumerator, rawDenominator)}$.`,
              `Numerator and denominator share a factor of $${divisor}$, so $${compoundTex} = ${signedFracTex(numerator, denominator)}$, entered as ${key}.`,
            ]
          : [
              `Over that shared denominator those come to $${compoundTex} = ${signedFracTex(numerator, denominator)}$, entered as ${key}.`,
            ]),
      ],
    };
  },
  varietyKey: (params) =>
    `${params.tripleA ?? 0}:${params.tripleB ?? 0}:${params.givenSineA ?? 0}${params.givenSineB ?? 0}:${params.quadrantA ?? 0}${params.quadrantB ?? 0}:${params.shape ?? 0}`,
};

/** TRG.9's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const TRG9_TEMPLATES: readonly ItemTemplate[] = [
  d9_trg9_sum_exact_l1,
  d9_trg9_double_sine_l2,
  d9_trg9_formula_name_l2,
  d9_trg9_double_cosine_l3,
  d9_trg9_compound_angle_l3,
];
