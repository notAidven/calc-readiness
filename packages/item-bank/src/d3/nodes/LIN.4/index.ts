import { type ItemTemplate, intervalAnswer, type Rng } from "../../../template";
import {
  rayKey,
  signed,
  unadvertisedBound,
  unadvertisedUnionLow,
  unionKey,
} from "../_shared";

/**
 * LIN.4 practice templates: solve a linear or compound inequality and write it in interval
 * notation. Six shapes over the locked 1xL1 / 2xL2 / 2xL3 mix, which serves two of the three L2
 * shapes:
 *
 *  - L1  a one-step inequality, so the notation is the whole of the new work;
 *  - L2a a two-step inequality with a POSITIVE coefficient, where no sign reverses;
 *  - L2b a NEGATIVE coefficient, so the direction turns over on the dividing step;
 *  - L2c a compound OR at ONE move per half, so the two-piece answer arrives without the
 *        two-move halves L3b pairs it with;
 *  - L3a a compound AND, written as one three-part inequality, which resolves to a single
 *        bounded interval;
 *  - L3b a compound OR, which resolves to a UNION of two rays.
 *
 * ## Why there is a third L2 shape when the mix serves two
 *
 * `d3.lin4.compound-or.l2` exists for the CHECK rather than for the practice pool. The end-of-
 * lesson check re-asks from a pool template, and this node teaches a split between a one-piece
 * answer and a two-piece one, so a check whose every question answers in one piece never measures
 * the split (`apps/web/src/lessons/cfuAnswerShape.test.tsx`). The only two-piece shape here used
 * to be `compound-or.l3`, and pointing the re-ask at it would have handed a learner who has just
 * missed the check a strictly HARDER question. This shape is the two-piece answer at the check's
 * own tier: one move per half against L3b's two.
 *
 * It is appended AFTER the two served L2 entries deliberately. `buildPool` round-robins
 * `templates[index % templates.length]` over the cell's slots, so a third entry in third place
 * leaves slots 0 and 1 on `two-step.l2` and `negative-coefficient.l2` and the frozen pool
 * unmoved. Its own instances reach a learner through the check's re-ask and through the retry
 * variants, both of which draw from every template.
 *
 * ## Answer path, and the three input rules the field has to advertise
 *
 * Every shape answers as an `interval`, cleared at checker version 2, and this node is the first
 * SERVED cohort to reach `INTERVAL_PLACEHOLDER`: every interval item in the bank before it
 * declared `required_notation: "set_builder"` and took the earlier branch. That placeholder
 * carries three measured input rules, and until now they reached no learner. Three consequences
 * for the shapes below, each measured against the real checker rather than assumed:
 *
 *  - a union KEY is authored whitespace-delimited, `(-inf, 3) U (8, inf)`, because that is the
 *    spelling the placeholder shows. It is a house style and NOT a checker rule: graded through
 *    the product checker over all 13 served LIN.4 union items, the spaced key, the same key
 *    closed up around the `U` and the same key with every space removed all score
 *    `correct/match` on 13 of 13, so no hint here may tell a learner the field reads that
 *    symbol with a space either side of it;
 *  - infinity is `inf` or `infinity`, never `oo`. This one the field DOES enforce: `oo` scores
 *    `invalid_input/parse_error` on 13 of 13 of those same items, so it is the rule the hints
 *    state, and it is the only one of the two worth a stuck learner's attention;
 *  - and an empty solution set has NO interval spelling at all, so no shape here may produce
 *    one. Every draw below is satisfiable by construction: the AND shape's bounds are ordered
 *    and the OR shape's rays are separated, so neither can collapse.
 *
 * R30 forbids a placeholder that answers a served item, and the example it shows is
 * `INTERVAL_PLACEHOLDER_TEXT` in `../_shared`, parsed there into the union and each ray rather
 * than transcribed here: a second hand-copy of that string is the defect this file used to
 * carry, quoting a bound the field stopped advertising. Both union shapes route their bounds
 * through `unadvertisedUnionLow`, and the single rays through `unadvertisedBound`, so no key
 * here can be an advertised form whatever the example moves to.
 *
 * ## Why the L2b coefficient is always negative, and never merely sometimes
 *
 * A shape that reversed the sign on some draws and not others would serve the reversal as a
 * coin toss, and a learner who never met it would still see the cell as covered. The negative is
 * fixed, and the positive-coefficient case lives in L2a where it belongs.
 */

export const LIN4_NODE = "LIN.4";

/**
 * L1, a one-step inequality. The solving is a single move, so what the tier is really measuring
 * is the notation: which end is infinite, and which bracket the finite end takes.
 */
export const d3_lin4_one_step_l1: ItemTemplate = {
  template_id: "d3.lin4.one-step.l1",
  node_id: LIN4_NODE,
  difficulty: 1,
  concept: "write-a-ray",
  generate(rng: Rng) {
    const closed = rng.int(0, 1) === 1;
    const upward = rng.int(0, 1) === 1;
    // The answer field's own example is a pair of rays, so a drawn bound that would spell one of
    // them is shifted off it (R30): see `unadvertisedBound`.
    const bound = unadvertisedBound(rng.int(-9, 18), closed, upward);
    const shift = rng.int(2, 14);
    const sign = upward ? (closed ? "\\ge" : ">") : closed ? "\\le" : "<";
    const right = bound + shift;
    const key = rayKey(bound, closed, upward);
    return {
      prompt: `Solve for $x$ and give the answer in interval notation: $x + ${shift} ${sign} ${right}$.`,
      answer: intervalAnswer(key),
      params: { bound, shift, closed: closed ? 1 : 0, upward: upward ? 1 : 0 },
      hints: [
        "One move isolates the variable: the plain number added to it comes off both sides. Nothing negative is divided out anywhere, so the direction of the sign stays as it is.",
        "Then the notation. The unbounded side takes the infinity symbol, which is never included, and the finite end takes a square bracket when the sign includes its boundary and a round one when it does not.",
      ],
      worked_solution: [
        `Take $${shift}$ off both sides: $x ${sign} ${bound}$.`,
        upward
          ? `The range runs upward from $${bound}$, so the infinite end is on the right.`
          : `The range runs downward from $${bound}$, so the infinite end is on the left.`,
        closed
          ? `The sign includes its boundary, so $${bound}$ is taken in and its bracket is square.`
          : `The sign is strict, so $${bound}$ is left out and its bracket is round.`,
        `Written in interval notation that is $${key.replace(/inf/g, "\\infty")}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.bound ?? 0}:${params.closed ?? 0}:${params.upward ?? 0}`,
};

/**
 * L2a, a two-step inequality whose coefficient is positive. Two moves rather than one, and the
 * direction of the sign is left alone throughout, which is what makes it the baseline the
 * negative-coefficient shape is a step away from.
 */
export const d3_lin4_two_step_l2: ItemTemplate = {
  template_id: "d3.lin4.two-step.l2",
  node_id: LIN4_NODE,
  difficulty: 2,
  concept: "solve-two-step-inequality",
  generate(rng: Rng) {
    const a = rng.int(2, 8);
    const closed = rng.int(0, 1) === 1;
    const upward = rng.int(0, 1) === 1;
    const bound = unadvertisedBound(rng.int(-7, 12), closed, upward);
    const b = rng.int(-12, 12) || 5;
    const sign = upward ? (closed ? "\\ge" : ">") : closed ? "\\le" : "<";
    const right = a * bound + b;
    const key = rayKey(bound, closed, upward);
    return {
      prompt: `Solve for $x$ and give the answer in interval notation: $${a}x ${signed(b)} ${sign} ${right}$.`,
      answer: intervalAnswer(key),
      params: { a, b, bound, closed: closed ? 1 : 0, upward: upward ? 1 : 0 },
      hints: [
        "The same two inverse operations an equation would need: undo the plain number on both sides, then divide by the coefficient.",
        "Check the sign of the number you divide by, because that is the only thing in this method that can change the direction of the inequality. Then let the sign choose the bracket.",
      ],
      worked_solution: [
        `Undo the plain number on both sides: $${a}x ${sign} ${right - b}$.`,
        `The coefficient is positive, so dividing both sides by $${a}$ leaves the direction alone: $x ${sign} ${bound}$.`,
        closed
          ? `The boundary is included, so its bracket is square.`
          : `The sign is strict, so the boundary is left out and its bracket is round.`,
        `In interval notation that is $${key.replace(/inf/g, "\\infty")}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.bound ?? 0}:${params.upward ?? 0}`,
};

/**
 * L2b, a negative coefficient. The direction reverses on the dividing step, and the shape is
 * written with the variable term subtracted so the negative has to be noticed rather than read
 * off a leading minus sign.
 */
export const d3_lin4_negative_coefficient_l2: ItemTemplate = {
  template_id: "d3.lin4.negative-coefficient.l2",
  node_id: LIN4_NODE,
  difficulty: 2,
  concept: "reverse-on-a-negative",
  generate(rng: Rng) {
    const a = rng.int(2, 7);
    const b = rng.int(1, 16);
    const closed = rng.int(0, 1) === 1;
    // The sign as WRITTEN; after dividing by a negative it points the other way, so the range
    // runs the opposite way from the one a learner reads straight off the prompt.
    const writtenUpward = rng.int(0, 1) === 1;
    const upward = !writtenUpward;
    const bound = unadvertisedBound(rng.int(-8, 9), closed, upward);
    const sign = writtenUpward ? (closed ? "\\ge" : ">") : closed ? "\\le" : "<";
    const solvedSign = writtenUpward ? (closed ? "\\le" : "<") : closed ? "\\ge" : ">";
    const right = b - a * bound;
    const key = rayKey(bound, closed, upward);
    return {
      prompt: `Solve for $x$ and give the answer in interval notation: $${b} - ${a}x ${sign} ${right}$.`,
      answer: intervalAnswer(key),
      params: {
        a,
        b,
        bound,
        closed: closed ? 1 : 0,
        writtenUpward: writtenUpward ? 1 : 0,
      },
      hints: [
        "The variable term is being subtracted, so the plain number it is subtracted from comes off both sides first. That leaves a negative coefficient in front of the variable.",
        "Dividing an inequality by a negative number is the one move in the whole method that reverses its direction, so decide what the sign becomes on that step rather than after it.",
      ],
      worked_solution: [
        `Take $${b}$ off both sides: $-${a}x ${sign} ${right - b}$.`,
        `Dividing by $-${a}$ divides by a negative, which reverses the direction: $x ${solvedSign} ${bound}$.`,
        upward
          ? `So the range runs upward from $${bound}$.`
          : `So the range runs downward from $${bound}$.`,
        `In interval notation that is $${key.replace(/inf/g, "\\infty")}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.a ?? 0}:${params.bound ?? 0}:${params.writtenUpward ?? 0}`,
};

/**
 * L2c, a compound OR whose halves are one move each. The two-piece answer and the union symbol
 * are the whole of what this shape adds to a ray: each half is a single division by a positive
 * count, so nothing reverses and no constant has to come off first.
 *
 * That is the difference from `compound-or.l3`, where each half is a two-step inequality. The
 * distinction is asserted rather than described, in `d3.test.ts`'s hardness comparison, as moves
 * per half: two here against four there.
 *
 * The lower bound goes through {@link unadvertisedUnionLow} for the same reason L3b's does: the
 * interval field advertises a UNION as its own example, and R30 forbids a served item the
 * placeholder answers.
 */
export const d3_lin4_compound_or_l2: ItemTemplate = {
  template_id: "d3.lin4.compound-or.l2",
  node_id: LIN4_NODE,
  difficulty: 2,
  concept: "compound-or-one-move",
  generate(rng: Rng) {
    const a = rng.int(2, 8);
    const lowClosed = rng.int(0, 1) === 1;
    const highClosed = rng.int(0, 1) === 1;
    const drawnLow = rng.int(1, 12);
    const high = drawnLow + rng.int(4, 14);
    const low = unadvertisedUnionLow(drawnLow, lowClosed, high, highClosed);
    const lowSign = lowClosed ? "\\le" : "<";
    const highSign = highClosed ? "\\ge" : ">";
    const key = unionKey(low, lowClosed, high, highClosed);
    return {
      // The store's rule is stated in math and named in prose, so the wording is the same on
      // every draw while the two signs stay free to move: which bracket each end takes is half
      // of what this node grades, and a prompt saying "less than" would settle one of them.
      prompt: `The bonded store weighs a consignment as $${a}$ equal crates and turns it away when the copper on the scale falls outside what it accepts: $${a}x ${lowSign} ${a * low}$ or $${a}x ${highSign} ${a * high}$. Solve for the crate weight $x$ in minas and give the turned-away weights in interval notation.`,
      answer: intervalAnswer(key),
      params: {
        a,
        low,
        high,
        lowClosed: lowClosed ? 1 : 0,
        highClosed: highClosed ? 1 : 0,
      },
      hints: [
        "The two halves are joined by or, so neither one limits the other and each is solved on its own. Each of them takes a single move, and the number being divided out is a count of crates, so it is positive and no direction turns over.",
        "Nothing between the two boundaries satisfies either half, so the answer is in two pieces rather than one. Interval notation joins the two pieces with a union symbol, and an unbounded end is typed inf in this answer field, never oo. Each finite end takes its bracket from the sign that produced it, and infinity never takes a square bracket.",
      ],
      worked_solution: [
        `Divide the first half by the positive $${a}$: $x ${lowSign} ${low}$.`,
        `Divide the second half by that same $${a}$, so neither sign turns over: $x ${highSign} ${high}$.`,
        `Nothing between $${low}$ and $${high}$ satisfies either half, so the two pieces do not meet and no single interval covers them.`,
        `Joined with a union that is $${key.replace(/inf/g, "\\infty").replace(" U ", " \\cup ")}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.a ?? 0}:${params.low ?? 0}:${params.high ?? 0}:${params.lowClosed ?? 0}`,
};

/**
 * L3a, a compound AND written as one three-part inequality. Every move applies right across all
 * three parts,
 * and the answer is one bounded interval because both conditions have to hold at once.
 */
export const d3_lin4_compound_and_l3: ItemTemplate = {
  template_id: "d3.lin4.compound-and.l3",
  node_id: LIN4_NODE,
  difficulty: 3,
  concept: "compound-and",
  generate(rng: Rng) {
    const a = rng.int(2, 6);
    const low = rng.int(-9, 4);
    const width = rng.int(3, 12);
    const high = low + width;
    const b = rng.int(-10, 10) || 3;
    const lowClosed = rng.int(0, 1) === 1;
    const highClosed = rng.int(0, 1) === 1;
    const lowSign = lowClosed ? "\\le" : "<";
    const highSign = highClosed ? "\\le" : "<";
    const key = `${lowClosed ? "[" : "("}${low}, ${high}${highClosed ? "]" : ")"}`;
    return {
      prompt: `Solve for $x$ and give the answer in interval notation: $${a * low + b} ${lowSign} ${a}x ${signed(b)} ${highSign} ${a * high + b}$.`,
      answer: intervalAnswer(key),
      params: {
        a,
        b,
        low,
        high,
        lowClosed: lowClosed ? 1 : 0,
        highClosed: highClosed ? 1 : 0,
      },
      hints: [
        "This is two inequalities holding at once, so the variable has to be isolated in the middle part while both outer parts keep up. Every move is applied right across all three.",
        "Undo the plain number right across all three parts, then divide all three by the coefficient. Each end keeps whichever sign it started with, so the two brackets are decided separately.",
      ],
      worked_solution: [
        `Take $${b < 0 ? `${b}` : `${b}`}$ off all three parts: $${a * low} ${lowSign} ${a}x ${highSign} ${a * high}$.`,
        `Divide all three parts by the positive $${a}$: $${low} ${lowSign} x ${highSign} ${high}$.`,
        `Both conditions have to hold, so the answer is the single stretch between them.`,
        `In interval notation that is $${key}$, with each bracket taken from the sign at its own end.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.a ?? 0}:${params.low ?? 0}:${params.high ?? 0}:${params.lowClosed ?? 0}`,
};

/**
 * L3b, a compound OR. The two conditions cannot both hold, so the answer is a union of two rays,
 * and the shape's whole job is to be the one on this node that produces a `U` in the key.
 *
 * The drawn pair goes through {@link unadvertisedUnionLow}, so the key can never be the string
 * the interval placeholder itself advertises (R30). That is the guard rather than the draw list
 * below, which does contain the old example's bound: a list hand-filtered against one
 * transcribed number is what drifted when the placeholder moved, and the shift is derived from
 * the placeholder text instead.
 */
export const d3_lin4_compound_or_l3: ItemTemplate = {
  template_id: "d3.lin4.compound-or.l3",
  node_id: LIN4_NODE,
  difficulty: 3,
  concept: "compound-or",
  generate(rng: Rng) {
    const a = rng.int(2, 6);
    const drawnLow = rng.pick([-8, -6, -5, -4, -3, -1, 0, 1, 2, 3, 4, 5]);
    const lowClosed = rng.int(0, 1) === 1;
    const highClosed = rng.int(0, 1) === 1;
    const drawnHigh = drawnLow + rng.int(4, 14);
    // The advertised example IS a union, so the pair of bounds is guarded as a pair here rather
    // than one ray at a time (R30).
    const low = unadvertisedUnionLow(drawnLow, lowClosed, drawnHigh, highClosed);
    const high = drawnHigh;
    const b = rng.int(-9, 9) || -4;
    const lowSign = lowClosed ? "\\le" : "<";
    const highSign = highClosed ? "\\ge" : ">";
    const key = unionKey(low, lowClosed, high, highClosed);
    return {
      prompt: `Solve for $x$ and give the answer in interval notation: $${a}x ${signed(b)} ${lowSign} ${a * low + b}$ or $${a}x ${signed(b)} ${highSign} ${a * high + b}$.`,
      answer: intervalAnswer(key),
      params: {
        a,
        b,
        low,
        high,
        lowClosed: lowClosed ? 1 : 0,
        highClosed: highClosed ? 1 : 0,
      },
      hints: [
        "The two halves are joined by or, so they are solved separately and neither one constrains the other. Each half is an ordinary two-step inequality.",
        "Nothing between the two boundaries satisfies either half, so the answer is in two pieces rather than one. Interval notation joins the two pieces with a union symbol, and an unbounded end is typed inf in this answer field, never oo.",
      ],
      worked_solution: [
        `Solve the first half: undoing the plain number gives $${a}x ${lowSign} ${a * low}$, and dividing by $${a}$ gives $x ${lowSign} ${low}$.`,
        `Solve the second half the same way: $x ${highSign} ${high}$.`,
        `Nothing between $${low}$ and $${high}$ satisfies either half, so the two rays do not meet and no single interval covers them.`,
        `Joined with a union that is $${key.replace(/inf/g, "\\infty").replace(" U ", " \\cup ")}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.a ?? 0}:${params.low ?? 0}:${params.high ?? 0}:${params.highClosed ?? 0}`,
};

/**
 * LIN.4's six practice shapes, in the order the pool freezes them: the L1, then the three L2
 * shapes with the two the mix serves first, then the two L3 shapes.
 */
export const LIN4_TEMPLATES: readonly ItemTemplate[] = [
  d3_lin4_one_step_l1,
  d3_lin4_two_step_l2,
  d3_lin4_negative_coefficient_l2,
  d3_lin4_compound_or_l2,
  d3_lin4_compound_and_l3,
  d3_lin4_compound_or_l3,
];
