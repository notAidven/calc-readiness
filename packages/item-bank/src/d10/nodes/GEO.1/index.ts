import {
  type ItemTemplate,
  numericAnswer,
  type Rng,
  radicalAnswer,
} from "../../../template";

/**
 * GEO.1 practice templates: the three relations that let one length or angle in a figure be
 * computed from the others. Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  the hypotenuse from two legs, on a Pythagorean triple (the relation run forwards);
 *  - L2a a missing LEG from the hypotenuse and one leg, which is the same relation run
 *        backwards and is where subtracting rather than adding is what the learner must see;
 *  - L2b an angle, either the third of a triangle or the supplement of a given one;
 *  - L3a the diagonal of a rectangle as an exact simplified radical;
 *  - L3b a missing side of a pair of similar triangles, where the scale factor need not be
 *        whole.
 *
 * ## Answer path, measured rather than assumed
 *
 * Four shapes are `numericAnswer` and one is `radicalAnswer`, and the split is forced by the
 * checker rather than chosen for variety. Graded against the real v2 checker before any of
 * this was written:
 *
 *  - A numeric key REJECTS a `sqrt` call: against key `10`, `sqrt(100)` grades
 *    `invalid_input/unsupported_syntax`. So the three whole-number length shapes ask for the
 *    value and no prompt or hint may invite leaving it under a root.
 *  - `radicalAnswer` accepts `5*sqrt(2)`, `5 * sqrt(2)` and `5sqrt(2)`, and REJECTS the
 *    unsimplified `sqrt(50)` as `not_simplified`, so the simplification this node teaches is
 *    the thing the checker actually enforces. A decimal is `wrong_representation`.
 *  - The `sqrt` glyph is a parse error, so every TYPED answer shown to a learner is written
 *    `sqrt(...)`. KaTeX `\sqrt{}` inside a prompt is prose and is unaffected.
 *  - A unit or a degree sign in a typed answer is `invalid_input/unknown_symbol`, so every
 *    prompt states its unit and asks for a plain number.
 *
 * ## Why no hint here contains a standalone digit
 *
 * `hint_leaks_answer` matches an answer key as a standalone value, and several keys in this
 * file are one- or two-digit numbers. A hint reading "compare it with $5$" would leak on
 * exactly the draws whose answer is five and pass on every other, which is a leak whose
 * discovery depends on the seed. The hints name the relation instead of ever substituting
 * into it, which is also what R13 asks for.
 *
 * Every template declares a `varietyKey` keyed on the numbers that fix the instance rather
 * than on the answer, because several draws can reach one answer by different routes and a
 * cell that froze two of those would be asking a learner the same question twice.
 */

export const GEO1_NODE = "GEO.1";

/**
 * Pythagorean triples, as `[leg, leg, hypotenuse]`.
 *
 * Listed rather than generated because the constraint is that all three come out whole: a
 * generated pair of legs almost never does, and the L1/L2 tiers exist precisely so that the
 * arithmetic is clean and the RELATION is the only thing being tested. The multiples of the
 * 3-4-5 are kept alongside their primitive because the knotted cord in the mini lesson is a
 * 3-4-5 and a learner should meet it at more than one size.
 */
const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [6, 8, 10],
  [9, 12, 15],
  [12, 16, 20],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [10, 24, 26],
  [15, 20, 25],
];

/**
 * Rectangles whose diagonal is irrational but SIMPLIFIES, as `[width, height, a, b]` for a
 * diagonal of `a*sqrt(b)`.
 *
 * Both conditions are load-bearing and neither is automatic. A diagonal that came out whole
 * would make the exact-radical instruction meaningless, and one already in lowest terms
 * (`a = 1`) would never exercise the simplification the checker enforces, so every row here
 * has `a > 1` and `b` squarefree.
 *
 * A third condition is invisible from inside this file: the 5-by-5 square is ABSENT because
 * its diagonal is `5*sqrt(2)`, which is the literal example `RADICAL_PLACEHOLDER` prints in
 * the answer field. An item whose key is the placeholder standing above it is answerable
 * without reading the question, and `answerFormat.test.ts` fails on exactly that.
 */
const RADICAL_RECTANGLES: readonly (readonly [number, number, number, number])[] = [
  [2, 2, 2, 2],
  [2, 4, 2, 5],
  [2, 6, 2, 10],
  [3, 6, 3, 5],
  [3, 9, 3, 10],
  [4, 4, 4, 2],
  [4, 8, 4, 5],
  [5, 10, 5, 5],
  [6, 6, 6, 2],
  [6, 12, 6, 5],
];

/**
 * L1, the hypotenuse from two legs. The relation run in the direction it is stated in, so
 * the only decisions are which side is the hypotenuse and that the squares are added.
 */
export const d10_geo1_hypotenuse_l1: ItemTemplate = {
  template_id: "d10.geo1.hypotenuse.l1",
  node_id: GEO1_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const [a, b, c] = TRIPLES[rng.int(0, TRIPLES.length - 1)] ?? [3, 4, 5];
    return {
      prompt: `A right triangle has legs of $${a}$ meters and $${b}$ meters. How long is its hypotenuse, in meters? Enter one number.`,
      answer: numericAnswer(`${c}`),
      params: { a, b, c },
      hints: [
        "The hypotenuse is the side opposite the right angle, and it is the longest of the three. The other two sides are the legs.",
        "The Pythagorean theorem says the squares of the two legs add to the square of the hypotenuse. Square each leg, add them, and the hypotenuse is the number whose square that total is.",
      ],
      worked_solution: [
        `The right angle sits between the two legs, so the unknown side is the hypotenuse and the Pythagorean theorem reads $${a}^{2} + ${b}^{2} = c^{2}$.`,
        `Square each leg and add: $${a}^{2} + ${b}^{2} = ${a * a} + ${b * b} = ${c * c}$.`,
        `So $c^{2} = ${c * c}$, and taking the square root gives a hypotenuse of $${c}$ meters.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.b ?? 0}`,
};

/**
 * L2a, the same relation solved for a LEG. The step up is not arithmetic but direction: the
 * hypotenuse's square is now the total rather than a part, so the squares SUBTRACT. A learner
 * who has taken "add the squares" as the whole rule gets a number here that is too big, which
 * is the specific error this tier exists to provoke.
 */
export const d10_geo1_leg_l2: ItemTemplate = {
  template_id: "d10.geo1.leg.l2",
  node_id: GEO1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const [a, b, c] = TRIPLES[rng.int(0, TRIPLES.length - 1)] ?? [3, 4, 5];
    // Which of the two legs is hidden is itself a draw, so the answer is not always the
    // larger of the pair and cannot be guessed from the shape of the numbers.
    const hideLonger = rng.int(0, 1) === 1;
    const known = hideLonger ? a : b;
    const missing = hideLonger ? b : a;
    return {
      prompt: `A right triangle has a hypotenuse of $${c}$ meters and one leg of $${known}$ meters. How long is the other leg, in meters? Enter one number.`,
      answer: numericAnswer(`${missing}`),
      params: { known, missing, c },
      hints: [
        "The hypotenuse is the side opposite the right angle, and here it is the side you were given rather than the one you are looking for.",
        "In the Pythagorean theorem the squares of the two legs add to the square of the hypotenuse, so the hypotenuse's square is the total. Take the known leg's square away from it.",
        "That leaves the missing leg's square, and the leg itself is the number whose square that is.",
      ],
      worked_solution: [
        `The side given as the hypotenuse is opposite the right angle, so the theorem reads $${known}^{2} + b^{2} = ${c}^{2}$, with $b$ the missing leg.`,
        `Square the two known sides: $${known}^{2} = ${known * known}$ and $${c}^{2} = ${c * c}$.`,
        `The hypotenuse's square is the total, so subtract rather than add: $b^{2} = ${c * c} - ${known * known} = ${missing * missing}$.`,
        `Taking the square root gives a leg of $${missing}$ meters.`,
      ],
    };
  },
  varietyKey: (params) => `${params.c ?? 0}:${params.missing ?? 0}`,
};

/**
 * L2b, an angle rather than a length. Two draws of one idea: a straight line and a triangle
 * are both totals a set of angles has to fill, and the missing one is what is left. The hints
 * are worded to cover both draws identically, since a hint that arrived only for the triangle
 * would announce which draw the learner had.
 */
export const d10_geo1_angle_third_l2: ItemTemplate = {
  template_id: "d10.geo1.angle-third.l2",
  node_id: GEO1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const triangle = rng.int(0, 1) === 1;
    const first = rng.int(25, 80);
    // The second angle is only drawn for the triangle, but it is drawn either way so that
    // both branches consume the same number of values and one seed keeps one instance.
    const second = rng.int(25, 80);
    const answer = triangle ? 180 - first - second : 180 - first;
    const prompt = triangle
      ? `Two angles of a triangle measure $${first}$ degrees and $${second}$ degrees. What does the third angle measure, in degrees? Enter one number.`
      : `An angle of $${first}$ degrees sits on a straight line beside one other angle. What does that other angle measure, in degrees? Enter one number.`;
    return {
      prompt,
      answer: numericAnswer(`${answer}`),
      params: { triangle: triangle ? 1 : 0, first, second, answer },
      hints: [
        // "a half turn" was here, twice, and nowhere else in the era. It is not glossed but
        // AVOIDED: a hint is the surface a stuck learner reaches for, so it is the wrong
        // place to introduce a term, and $180$ degrees is what this node's prompts, prose
        // and worked solutions already say. 180 is never an answer here (the triangle
        // branch runs 20 to 130 and the straight-line branch 100 to 155), so naming it
        // cannot leak one.
        "Angles that together fill a straight line are supplementary, and their measures add to $180$ degrees. The three angles of any triangle add to that same total.",
        "So the figure fixes a total, and the angles you were given use up part of it. Take what is given away from that total.",
      ],
      worked_solution: triangle
        ? [
            `The three angles of a triangle add to $180$ degrees, so the two given angles and the third fill that total.`,
            `The two given angles use up $${first} + ${second} = ${first + second}$ degrees.`,
            `What is left is the third angle: $180 - ${first + second} = ${answer}$ degrees.`,
          ]
        : [
            `Two angles that fill a straight line are supplementary, so together they measure $180$ degrees.`,
            `One of them is given as $${first}$ degrees, so the other is what remains of that total.`,
            `Subtracting gives $180 - ${first} = ${answer}$ degrees.`,
          ],
    };
  },
  varietyKey: (params) => `${params.triangle ?? 0}:${params.answer ?? 0}`,
};

/**
 * L3a, the diagonal left exact. The arithmetic is the L1 shape, so what makes this the harder
 * tier is the FORM: the total under the root is not a perfect square, and the answer has to be
 * simplified rather than evaluated. The checker enforces both halves, rejecting an
 * unsimplified radical as `not_simplified` and a decimal as `wrong_representation`, so the
 * prompt says exact and names the typed spelling it expects.
 */
export const d10_geo1_exact_diagonal_l3: ItemTemplate = {
  template_id: "d10.geo1.exact-diagonal.l3",
  node_id: GEO1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const [w, h, a, b] = RADICAL_RECTANGLES[rng.int(0, RADICAL_RECTANGLES.length - 1)] ?? [
      2, 4, 2, 5,
    ];
    const total = w * w + h * h;
    return {
      prompt: `A rectangle measures $${w}$ meters by $${h}$ meters. Give the exact length of its diagonal, in meters, as a simplified radical. Write a square root as sqrt(...), for example 3*sqrt(7).`,
      answer: radicalAnswer(`${a}*sqrt(${b})`),
      params: { w, h, a, b, total },
      hints: [
        "A diagonal cuts the rectangle into two right triangles, and the two sides of the rectangle are the legs of each one.",
        "So the Pythagorean theorem gives the square of the diagonal. Add the squares of the two sides to get the number that sits under the root.",
        "That number is not a perfect square, so leave it under the root and simplify it: pull out the largest perfect-square factor and take its root outside.",
      ],
      worked_solution: [
        `The diagonal cuts the rectangle into two right triangles whose legs are its sides, so $d^{2} = ${w}^{2} + ${h}^{2}$.`,
        `Add the squares of the sides: $${w}^{2} + ${h}^{2} = ${w * w} + ${h * h} = ${total}$, so $d = \\sqrt{${total}}$.`,
        `That is not a perfect square, so take out its largest perfect-square factor: $${total} = ${a * a} \\times ${b}$.`,
        `The root of that factor comes outside, leaving a diagonal of $${a}\\sqrt{${b}}$ meters, typed as ${a}*sqrt(${b}).`,
      ],
    };
  },
  varietyKey: (params) => `${params.w ?? 0}:${params.h ?? 0}`,
};

/**
 * L3b, similar triangles. The scale factor is allowed to be a half, which is what makes this
 * L3: the matching pair no longer differs by a whole number of times and the learner has to
 * divide rather than spot a multiple. Fractions and decimals are interchangeable in a numeric
 * key, so a learner who works in either notation is graded the same and the prompt does not
 * have to declare a form.
 */
export const d10_geo1_similar_side_l3: ItemTemplate = {
  template_id: "d10.geo1.similar-side.l3",
  node_id: GEO1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    // Halves only, and never a whole number of them: every product of a half-step factor with
    // a whole side is itself a multiple of a half, which is exactly representable and so is
    // reached by a numeric key that carries no tolerance. A whole factor of 2 or 3 would
    // collapse this into the multiple-spotting the L1 and L2 tiers already cover.
    //
    // The factor below one is kept deliberately. A scale factor is not obliged to enlarge, and
    // a template that only ever enlarged would teach a learner to divide the bigger number by
    // the smaller one and call the quotient a scale factor, which is a rule that fails the
    // moment the direction reverses.
    const scale = rng.pick([1.5, 2.5, 3.5, 0.5]);
    const first = rng.int(4, 12);
    // The two sides must differ, because the prompt names each of them by its length: on a
    // draw where they matched, "the side corresponding to the 6 meter side" would name two
    // sides at once and the item would have no determinate answer.
    let second = rng.int(3, 14);
    while (second === first) {
      second = rng.int(3, 14);
    }
    const otherFirst = first * scale;
    const otherSecond = second * scale;
    return {
      prompt: `Two triangles are similar. In the first, one pair of sides measures $${first}$ meters and $${second}$ meters. In the second triangle, the side corresponding to the $${first}$ meter side measures $${otherFirst}$ meters. How long is the side corresponding to the $${second}$ meter side, in meters? Enter one number.`,
      answer: numericAnswer(`${otherSecond}`),
      params: {
        smallFirst: first,
        smallSecond: second,
        largeFirst: otherFirst,
        largeSecond: otherSecond,
        scale,
      },
      hints: [
        "Similar figures have corresponding sides in one fixed ratio, and that ratio is the scale factor. The pair of sides that correspond to each other is the pair you know both of.",
        "Divide the side you know in the second triangle by the side it corresponds to in the first. That quotient is the scale factor, and it is the same for every corresponding pair.",
        "Then apply that same factor to the other side of the first triangle.",
      ],
      worked_solution: [
        `The two triangles are similar, so every pair of corresponding sides shares one scale factor.`,
        `The pair you know both of gives it: $${otherFirst} \\div ${first} = ${scale}$.`,
        `That factor applies to every corresponding pair, so the missing side is $${second} \\times ${scale}$.`,
        `That gives a side of $${otherSecond}$ meters.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.smallFirst ?? 0}:${params.smallSecond ?? 0}:${params.largeFirst ?? 0}`,
};

/** GEO.1's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const GEO1_TEMPLATES: readonly ItemTemplate[] = [
  d10_geo1_hypotenuse_l1,
  d10_geo1_leg_l2,
  d10_geo1_angle_third_l2,
  d10_geo1_exact_diagonal_l3,
  d10_geo1_similar_side_l3,
];
