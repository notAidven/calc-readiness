import {
  type ItemTemplate,
  numericAnswer,
  type Rng,
  solutionSetAnswer,
} from "../../../template";
import { latexVarTerm } from "../../../promptFormat";
import { signed } from "../_shared";

/**
 * LIN.1 practice templates: solve a one-variable linear equation. Five shapes across the
 * locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  the two-step shape `ax + b = c`, the one the lesson's balance opens on;
 *  - L2a the same skill in the era's own words, answered as a weight rather than as a set;
 *  - L2b the variable on BOTH sides, which is the move the lesson's third slide adds;
 *  - L3a a bracket to distribute before anything can be gathered;
 *  - L3b a NEGATIVE coefficient on the variable, so the last division is by a negative.
 *
 * ## Answer path
 *
 * Four shapes answer as a `solution_set` and one as a plain `numeric`, and the split is the
 * PROMPT's rather than a matter of taste. "Solve for x" asks which values satisfy the
 * equation, and the roster of them is a set: the category is cleared at checker version 2 and
 * `prod.lin-1.l2` already keys `{x0}` on this node. "What does one ingot weigh" asks for a
 * quantity, and a quantity is a number. Measured against the real v2 checker, a bare `3`
 * grades CORRECT against a key of `{3}`, so the set shape costs a learner who writes the
 * number nothing, while a set typed into a shape asking for a weight would be answering a
 * question nobody put.
 *
 * ## Two keys the placeholder rules out
 *
 * `SOLUTION_SET_PLACEHOLDER` reads "Every solution: 13 or {-1, 4}", so a served
 * `solution_set` item keyed `{13}` would be answered outright by the field's own example
 * (R30). Every shape below draws its solution from a list that excludes 13, and none of them
 * can produce a two-element set at all, so `{-1, 4}` is out of reach by construction.
 *
 * ## Why no hint here contains a standalone digit
 *
 * `hint_leaks_answer` matches an answer key as a standalone value, and these keys are small
 * integers. A hint reading "compare it with 3" would leak on exactly the draws whose solution
 * is 3 and pass on every other, which is worse than a constant leak because whether the sweep
 * catches it depends on the seed. The hints are written digit-free, except inside a longer
 * numeral that cannot match a one-digit key.
 *
 * ## Why no hint here names the DIRECTION the plain number is undone in
 *
 * `b` is drawn from either side of zero on three of these shapes, so a hint saying the constant
 * "was added on" and instructing the learner to "take that plain number off both sides" was false
 * on 196 of 400 draws and on 4 of the 7 served instances, where the move that works is an
 * addition and the item's own worked solution performs one. A hints array is authored once and
 * rendered for every draw, so a direction is only sayable where the generator fixed it: on
 * `negative-coefficient.l3`, which always subtracts, and nowhere else on this node. `d3.test.ts`
 * derives that population from the rendered prompts and asserts it.
 */

export const LIN1_NODE = "LIN.1";

/** The solutions a shape may draw. 13 is excluded: see the note on the placeholder above. */
const SOLUTIONS: readonly number[] = [
  -8, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12,
];

/**
 * L1, the two-step shape. The coefficient multiplies and the constant is added, so exactly two
 * inverse operations separate the equation from its solution, in the one order that works.
 */
export const d3_lin1_two_step_l1: ItemTemplate = {
  template_id: "d3.lin1.two-step.l1",
  node_id: LIN1_NODE,
  difficulty: 1,
  concept: "solve-two-step",
  generate(rng: Rng) {
    const a = rng.int(2, 7);
    const x0 = rng.pick(SOLUTIONS);
    const b = rng.int(-9, 9) || 4;
    const c = a * x0 + b;
    return {
      prompt: `Solve for $x$: $${a}x ${signed(b)} = ${c}$. Give the solution set.`,
      answer: solutionSetAnswer(`{${x0}}`),
      params: { a, b, c, x0 },
      hints: [
        "Two things were done to the variable: it was multiplied, and then a plain number was added on or taken off. Whichever of those it was, it happened last, so it is the first that can come away.",
        "Undo that plain number on BOTH sides, adding it back where it was subtracted and taking it off where it was added. That leaves the coefficient multiplying the variable on its own, and dividing both sides by the coefficient finishes it.",
      ],
      worked_solution: [
        `The plain number went on last, so it is undone first: $${a}x ${signed(b)} ${signed(-b)} = ${c} ${signed(-b)}$.`,
        `That leaves $${a}x = ${c - b}$.`,
        `Dividing both sides by $${a}$ gives $x = ${x0}$.`,
        `Checking it: $${a}(${x0}) ${signed(b)} = ${c}$, so the two sides agree and the solution set is $\\{${x0}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.x0 ?? 0}`,
};

/**
 * L2a, the same two-step skill stated as a weighing. The answer is a quantity rather than a
 * roster, so this is the one shape on the node keyed `numeric`, and reading the equation out of
 * the words is the step the bare shape never asks for.
 */
export const d3_lin1_balance_word_l2: ItemTemplate = {
  template_id: "d3.lin1.balance-word.l2",
  node_id: LIN1_NODE,
  difficulty: 2,
  concept: "solve-from-words",
  generate(rng: Rng) {
    const count = rng.int(3, 8);
    const weight = rng.pick([4, 5, 6, 7, 8, 9, 11, 12, 14, 15]);
    const loose = rng.int(3, 18);
    const crate = count * weight + loose;
    return {
      prompt: `A sealed crate marked $${crate}$ minas balances against $${count}$ ingots of equal weight together with a loose weight of $${loose}$ minas. What does one ingot weigh, in minas? Enter one number.`,
      answer: numericAnswer(`${weight}`),
      params: { count, weight, loose, crate },
      hints: [
        "A level beam says the two pans hold the same amount, so write that as an equation with the unknown ingot weight as the variable.",
        "The loose weight is added to the pile of ingots, so it comes off both pans first. What is left is the whole pile against a single number, and dividing by the count splits it.",
      ],
      worked_solution: [
        `The beam says $${count}x + ${loose} = ${crate}$, where $x$ is one ingot's weight.`,
        `Taking the loose $${loose}$ off both pans gives $${count}x = ${crate - loose}$.`,
        `Dividing both pans by $${count}$ gives $x = ${weight}$.`,
        `So one ingot weighs $${weight}$ minas, and $${count}(${weight}) + ${loose} = ${crate}$ confirms it.`,
      ],
    };
  },
  varietyKey: (params) => `${params.count ?? 0}:${params.weight ?? 0}`,
};

/**
 * L2b, the variable on both sides. Gathering it onto one side is the move that makes this a
 * step up, and the coefficients are drawn so the gathered coefficient divides the gathered
 * constant exactly, which keeps the solution a whole number.
 */
export const d3_lin1_both_sides_l2: ItemTemplate = {
  template_id: "d3.lin1.both-sides.l2",
  node_id: LIN1_NODE,
  difficulty: 2,
  concept: "gather-both-sides",
  generate(rng: Rng) {
    const gathered = rng.int(2, 6);
    const right = rng.int(1, 4);
    const a = gathered + right;
    const x0 = rng.pick(SOLUTIONS);
    const b = rng.int(-9, 9) || -3;
    // d - b must be gathered * x0, so the constant on the right is fixed by the rest.
    const d = b + gathered * x0;
    return {
      prompt: `Solve for $x$: $${a}x ${signed(b)} = ${latexVarTerm(right)} ${signed(d)}$. Give the solution set.`,
      answer: solutionSetAnswer(`{${x0}}`),
      params: { a, b, right, d, x0, gathered },
      hints: [
        "Both sides carry the variable, so nothing can be divided away until one of them does not. Take the smaller variable term off both sides.",
        "That leaves the variable on one side with a plain number beside it, which is the two-step shape again: that plain number is undone on both sides, then the coefficient is divided away.",
      ],
      worked_solution: [
        `Take $${latexVarTerm(right)}$ off both sides: $${a}x - ${latexVarTerm(right)} = ${gathered}x$, so the equation becomes $${gathered}x ${signed(b)} = ${d}$.`,
        `Now the plain number is undone on both sides, giving $${gathered}x = ${d - b}$.`,
        `Dividing both sides by $${gathered}$ gives $x = ${x0}$.`,
        `The solution set is $\\{${x0}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.gathered ?? 0}:${params.x0 ?? 0}`,
};

/**
 * L3a, a bracket to distribute first. Nothing in the equation can be gathered while one side is
 * still a product, so the distributing is forced rather than optional, and it is the step a
 * learner who has only met the two-step shape has no route past.
 */
export const d3_lin1_distribute_l3: ItemTemplate = {
  template_id: "d3.lin1.distribute.l3",
  node_id: LIN1_NODE,
  difficulty: 3,
  concept: "distribute-then-solve",
  generate(rng: Rng) {
    const a = rng.int(2, 6);
    const inner = rng.int(-8, 8) || 5;
    const x0 = rng.pick(SOLUTIONS);
    const tail = rng.int(-9, 9) || -6;
    const c = a * (x0 + inner) + tail;
    return {
      prompt: `Solve for $x$: $${a}(x ${signed(inner)}) ${signed(tail)} = ${c}$. Give the solution set.`,
      answer: solutionSetAnswer(`{${x0}}`),
      params: { a, inner, tail, c, x0 },
      hints: [
        "The left side is a product standing beside a plain number, and nothing can be collected while it stays a product. Multiply the bracket out first, so the coefficient reaches both terms inside it.",
        "With the bracket gone there are two plain numbers on the left, and combining them leaves the two-step shape the rest of the method already handles.",
      ],
      worked_solution: [
        `Multiply the bracket out: $${a}(x ${signed(inner)}) = ${a}x ${signed(a * inner)}$.`,
        `The left side is now $${a}x ${signed(a * inner + tail)}$, so the equation reads $${a}x ${signed(a * inner + tail)} = ${c}$.`,
        `Undoing that plain number on both sides gives $${a}x = ${a * x0}$.`,
        `Dividing by $${a}$ gives $x = ${x0}$, so the solution set is $\\{${x0}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.inner ?? 0}:${params.x0 ?? 0}`,
};

/**
 * L3b, a negative coefficient on the variable. The last division is by a negative number, which
 * is where a sign is lost, and the constant is written first so the variable term does not sit
 * where a learner expects to find it.
 */
export const d3_lin1_negative_coefficient_l3: ItemTemplate = {
  template_id: "d3.lin1.negative-coefficient.l3",
  node_id: LIN1_NODE,
  difficulty: 3,
  concept: "negative-coefficient",
  generate(rng: Rng) {
    const a = rng.int(2, 7);
    const x0 = rng.pick(SOLUTIONS);
    const b = rng.int(4, 20);
    const c = b - a * x0;
    return {
      prompt: `Solve for $x$: $${b} - ${a}x = ${c}$. Give the solution set.`,
      answer: solutionSetAnswer(`{${x0}}`),
      params: { a, b, c, x0 },
      hints: [
        "The variable term is being SUBTRACTED here, so the number it is subtracted from is what comes off both sides first.",
        "That leaves a negative coefficient multiplying the variable. Dividing both sides by a negative number is the last step, and the sign of the result depends on it.",
      ],
      worked_solution: [
        `Take $${b}$ off both sides: $-${a}x = ${c - b}$.`,
        `The coefficient is $-${a}$, so divide both sides by $-${a}$.`,
        `That gives $x = ${x0}$, because dividing $${c - b}$ by $-${a}$ turns the sign over.`,
        `Checking it: $${b} - ${a}(${x0}) = ${c}$, so the solution set is $\\{${x0}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.x0 ?? 0}`,
};

/** LIN.1's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const LIN1_TEMPLATES: readonly ItemTemplate[] = [
  d3_lin1_two_step_l1,
  d3_lin1_balance_word_l2,
  d3_lin1_both_sides_l2,
  d3_lin1_distribute_l3,
  d3_lin1_negative_coefficient_l3,
];
