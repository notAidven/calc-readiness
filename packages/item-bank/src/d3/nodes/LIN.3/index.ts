import { type ItemTemplate, numericAnswer, type Rng } from "../../../template";

/**
 * LIN.3 practice templates: rearrange a formula to isolate a chosen variable. Five shapes across
 * the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  a two-term rule, `P = 2l + 2w`, solved for the doubled side;
 *  - L2a a rule with a SUBTRACTED term, so isolating past it adds rather than subtracts;
 *  - L2b a rule whose target is multiplied by another named quantity, so the division is by a
 *        name and not by a digit;
 *  - L3a the target inside a GROUP under a divisor, which forces the outermost-first order;
 *  - L3b the target inside a group that is subtracted, so both the order and the sign matter.
 *
 * ## Every answer here is a NUMBER, and that is a measured limitation rather than a preference
 *
 * The natural answer to "rearrange this rule" is the rearranged rule, and the v2 checker cannot
 * grade one. Measured against the real `createProductAnswerChecker`:
 *
 *  - a multi-variable `expression` key does not grade correct even against ITSELF. The comparator
 *    is `symbolicEqual`, which reads the numerator of `math.rationalize((left) - (right))`, and
 *    `rationalize` does not cancel a multi-variable difference: `((p - 2*w)/2) - ((p - 2*w)/2)`
 *    leaves `0.5 * p + w - 0.5 * p - w`, which is not the string `0`, so the verdict is
 *    `incorrect / value_mismatch` on a right answer;
 *  - any key with a NAME in a denominator is refused earlier still, as
 *    `invalid_input / unsupported_symbolic_denominator`, which rules out `d/t` and `I/(P*r)`;
 *  - and even in one variable, a division whose numerator is a parenthesised sum throws inside
 *    the same comparator: `(x - 6)/2` grades `invalid_input / parse_error` against itself, while
 *    the identical value written `x/2 - 3` grades correct. `(P - 28)/2` is how a learner writes a
 *    rearranged rule, so the one single-variable route open here is a trap rather than a fix.
 *
 * `answer_type: "equation_form"` is no help either: it dispatches only `is_slope_intercept` and
 * `is_standard_form`, both of which are about a line in `x` and `y`.
 *
 * So each shape here states the rule, gives every quantity but one, and asks for the missing one
 * as a number. The rearrangement is the method and the number is the report, which is honest but
 * measures the skill INDIRECTLY: a learner who substitutes first and solves the resulting
 * one-variable equation reaches the same number without ever re-pointing the rule. The lesson's
 * own widgets do grade the symbolic form, because they compare against authored options rather
 * than through the checker, so the teaching is assessed where the checker cannot reach. This node
 * wants a second pass once general literal-equation equivalence is cleared.
 *
 * ## Why the drawn quantities are bounded away from zero and from each other
 *
 * Every shape divides at some point, and a divisor drawn as zero would make the key undefined. The
 * `|| ` fallbacks below are that guard, not a style choice. Each shape also fixes its answer
 * FIRST and computes the given total from it, so the key is a whole number by construction rather
 * than by luck.
 */

export const LIN3_NODE = "LIN.3";

/**
 * L1, the curb rule solved for the width. Both terms are doubled, so the learner meets a rule
 * where the coefficient on the target is a plain number and the other term is fully known.
 */
export const d3_lin3_kerb_width_l1: ItemTemplate = {
  template_id: "d3.lin3.kerb-width.l1",
  node_id: LIN3_NODE,
  difficulty: 1,
  concept: "isolate-two-term",
  generate(rng: Rng) {
    const width = rng.int(3, 18);
    const length = rng.int(4, 22);
    const perimeter = 2 * length + 2 * width;
    return {
      prompt: `A casting floor's curb runs $P = 2l + 2w$, where $l$ is its length and $w$ its width. Rearrange the rule to give the width, then use it: a floor has $P = ${perimeter}$ cubits and $l = ${length}$ cubits. How wide is it, in cubits? Enter one number.`,
      answer: numericAnswer(`${width}`),
      params: { width, length, perimeter },
      hints: [
        "Isolate $w$ before any measurement goes in. The term $2l$ is ADDED to $2w$, so it is the first thing to take off both sides.",
        "That leaves the coefficient on $w$ multiplying it on its own, so one division finishes the rearrangement. Only then put the two measurements in.",
      ],
      worked_solution: [
        `Take $2l$ off both sides: $P - 2l = 2w$.`,
        `Divide both sides by $2$: $w = \\dfrac{P - 2l}{2}$.`,
        `Now the measurements: $2l = 2(${length}) = ${2 * length}$, so $P - 2l = ${perimeter} - ${2 * length} = ${perimeter - 2 * length}$.`,
        `Dividing that by $2$ gives $w = ${width}$ cubits.`,
      ],
    };
  },
  varietyKey: (params) => `${params.length ?? 0}:${params.width ?? 0}`,
};

/**
 * L2a, a rule with a subtracted term. Isolating past a subtraction ADDS, and writing the sign the
 * rule shows rather than the sign the move needs is the mistake this shape exists to catch.
 */
export const d3_lin3_melt_tin_l2: ItemTemplate = {
  template_id: "d3.lin3.melt-tin.l2",
  node_id: LIN3_NODE,
  difficulty: 2,
  concept: "isolate-past-subtraction",
  generate(rng: Rng) {
    const tin = rng.int(4, 26);
    const copper = rng.int(20, 70);
    const loss = rng.int(2, 9);
    const bar = copper + tin - loss;
    return {
      prompt: `A crucible rule gives a finished bar as $B = c + t - m$, where $c$ is the copper charged, $t$ the tin charged and $m$ the weight lost in the melt. Rearrange it to give the tin, then use it: a bar finished at $${bar}$ minas from $${copper}$ minas of copper with $${loss}$ minas lost. How much tin went in, in minas? Enter one number.`,
      answer: numericAnswer(`${tin}`),
      // `namedLoss` tells the reveal figure which rule to rearrange. A practice draw states the
      // melt loss as the NAME `m` and gives its value in the sentence after; LIN.3's check states
      // the same rule with the loss already baked in as a literal (`B = c + t - 2`) and passes
      // this figure its `worked_solution_params` without the flag. The figure defaults to the
      // literal, so neither surface is shown a symbol its own question never mentioned.
      params: { tin, copper, loss, bar, namedLoss: 1 },
      hints: [
        "Two quantities stand on $t$'s side of the rule, and they are not treated the same way: one is added to it and one is subtracted from it.",
        "Isolating past an addition subtracts, and isolating past a subtraction adds. Apply each move to both sides before any measurement goes in.",
      ],
      worked_solution: [
        `Take $c$ off both sides: $B - c = t - m$.`,
        `The melt loss is SUBTRACTED, so add $m$ to both sides: $t = B - c + m$.`,
        `Now the measurements: $B - c = ${bar} - ${copper} = ${bar - copper}$.`,
        `Adding the loss gives $t = ${bar - copper} + ${loss} = ${tin}$ minas.`,
      ],
    };
  },
  varietyKey: (params) => `${params.copper ?? 0}:${params.tin ?? 0}`,
};

/**
 * L2b, a target multiplied by another NAME. The last division is by a quantity rather than by a
 * digit, which is the step that separates rearranging a formula from solving an equation: nothing
 * about the move needs to know what that quantity turns out to be.
 */
export const d3_lin3_duty_count_l2: ItemTemplate = {
  template_id: "d3.lin3.duty-count.l2",
  node_id: LIN3_NODE,
  difficulty: 2,
  concept: "divide-by-a-name",
  generate(rng: Rng) {
    const count = rng.int(3, 16);
    const price = rng.pick([3, 4, 5, 6, 7, 8, 9, 12]);
    const fixed = rng.int(2, 20);
    const total = count * price + fixed;
    return {
      prompt: `A duty bill runs $C = np + f$, where $n$ is the number of ingots, $p$ the duty per ingot and $f$ a fixed charge. Rearrange it to give the number of ingots, then use it: a bill of $${total}$ minas at $${price}$ minas an ingot with a fixed charge of $${fixed}$. How many ingots did it cover? Enter one number.`,
      answer: numericAnswer(`${count}`),
      params: { count, price, fixed, total },
      hints: [
        "The fixed charge is added on, so it comes off both sides first. What is left is the duty per ingot multiplying the count.",
        "Dividing both sides by that per-ingot duty isolates the count, and the move does not depend on what the duty happens to be.",
      ],
      worked_solution: [
        `Take $f$ off both sides: $C - f = np$.`,
        `Divide both sides by $p$: $n = \\dfrac{C - f}{p}$.`,
        `Now the numbers: $C - f = ${total} - ${fixed} = ${total - fixed}$.`,
        `Dividing by the per-ingot duty gives $n = ${total - fixed} \\div ${price} = ${count}$ ingots.`,
      ],
    };
  },
  varietyKey: (params) => `${params.count ?? 0}:${params.price ?? 0}`,
};

/**
 * L3a, the target inside a group under a divisor. Two operations wrap it, so the order they come
 * off in is the whole difficulty, and clearing the divisor before touching the group is the only
 * route that keeps every line true.
 */
export const d3_lin3_mould_face_l3: ItemTemplate = {
  template_id: "d3.lin3.mould-face.l3",
  node_id: LIN3_NODE,
  difficulty: 3,
  concept: "clear-divisor-then-group",
  generate(rng: Rng) {
    const a = rng.int(3, 20);
    const b = rng.int(2, 18);
    const h = rng.pick([2, 4, 6, 8, 10]);
    const area = (h * (a + b)) / 2;
    return {
      prompt: `A mould's sloping face is $A = \\dfrac{h(a + b)}{2}$, where $h$ is its height and $a$ and $b$ its two parallel edges. Rearrange it to give the edge $a$, then use it: a face has $A = ${area}$, $h = ${h}$ and $b = ${b}$. How long is the edge $a$? Enter one number.`,
      answer: numericAnswer(`${a}`),
      params: { a, b, h, area },
      hints: [
        "Dividing by the plain number was the last thing done on that side, so undoing it is the first move, and it clears the fraction.",
        "After that the height multiplies the whole bracket, so dividing both sides by the height comes next. Only the last move touches what is inside the bracket.",
      ],
      worked_solution: [
        `Multiply both sides by $2$ to clear the divisor: $2A = h(a + b)$.`,
        `Divide both sides by $h$: $\\dfrac{2A}{h} = a + b$.`,
        `Subtract $b$: $a = \\dfrac{2A}{h} - b$.`,
        `Now the numbers: $\\dfrac{2(${area})}{${h}} = ${(2 * area) / h}$, and taking $${b}$ off gives $a = ${a}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.h ?? 0}:${params.a ?? 0}`,
};

/**
 * L3b, a subtracted group under a divisor. Both hard features at once: the order the wrappings
 * come off in, and a sign that changes when the inner term moves. The assay rule is written with
 * the difference on top, so a learner who clears the divisor and then forgets which of the two
 * inner terms is subtracted lands one sign out.
 */
export const d3_lin3_assay_edge_l3: ItemTemplate = {
  template_id: "d3.lin3.assay-edge.l3",
  node_id: LIN3_NODE,
  difficulty: 3,
  concept: "sign-inside-a-group",
  generate(rng: Rng) {
    const q = rng.int(12, 40);
    const r = rng.int(2, 10);
    const k = rng.pick([2, 3, 4, 5]);
    const divisor = rng.pick([2, 4]);
    const s = (k * (q - r)) / divisor;
    return {
      prompt: `An assay rule runs $S = \\dfrac{k(q - r)}{${divisor}}$, where $q$ is the charge weighed in and $r$ the residue. Rearrange it to give the charge, then use it: a run has $S = ${s}$, $k = ${k}$ and $r = ${r}$. What was the charge $q$? Enter one number.`,
      answer: numericAnswer(`${q}`),
      params: { q, r, k, s, divisor },
      hints: [
        "Peel the outermost operation first: the whole right-hand side is divided by a plain number, so multiplying both sides by it clears the fraction.",
        "Then the multiplier outside the bracket divides away, leaving only what is inside it. Watch which of the two inner quantities is being subtracted when it moves.",
      ],
      worked_solution: [
        `Multiply both sides by $${divisor}$: $${divisor}S = k(q - r)$.`,
        `Divide both sides by $k$: $\\dfrac{${divisor}S}{k} = q - r$.`,
        `The residue is subtracted inside the bracket, so ADD it to both sides: $q = \\dfrac{${divisor}S}{k} + r$.`,
        `Now the numbers: $\\dfrac{${divisor}(${s})}{${k}} = ${(divisor * s) / k}$, and adding $${r}$ gives $q = ${q}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.k ?? 0}:${params.q ?? 0}:${params.divisor ?? 0}`,
};

/** LIN.3's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const LIN3_TEMPLATES: readonly ItemTemplate[] = [
  d3_lin3_kerb_width_l1,
  d3_lin3_melt_tin_l2,
  d3_lin3_duty_count_l2,
  d3_lin3_mould_face_l3,
  d3_lin3_assay_edge_l3,
];
