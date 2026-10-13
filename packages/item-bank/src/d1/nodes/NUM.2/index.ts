import { evaluateMath } from "../../../promptFormat";
import { type ItemTemplate, numericAnswer, type Rng } from "../../../template";
import type { GoldenFixture } from "../../golden";
import { workedSolution } from "../../hints";
import { numStr } from "../_shared";

/** Diagnostic L2 (routing stage) — one product wrapped by two additive terms. */
export const num2_l2: ItemTemplate = {
  template_id: "d1.num-2.l2",
  node_id: "NUM.2",
  difficulty: 2,
  concept: "precedence-multiply-first",
  generate(rng: Rng) {
    // One product wrapped by TWO additive terms, evaluated left to right:
    // a + b*c +/- e (`op`: 1 = subtract the trailing term). This adds a second
    // add/sub step over the L1 filler. For subtraction `e` is clamped so the
    // result stays non-negative.
    const b = rng.int(2, 6);
    const c = rng.int(2, 6);
    const product = b * c;
    const a = rng.int(1, 9);
    const op = rng.int(0, 1);
    const e = op === 1 ? rng.int(1, Math.min(9, a + product)) : rng.int(1, 9);
    const opSym = op === 1 ? "-" : "+";
    const opWord = op === 1 ? "subtract" : "add";
    const partial = a + product;
    const value = op === 1 ? partial - e : partial + e;
    return {
      prompt: evaluateMath(`${a} + ${b} \\times ${c} ${opSym} ${e}`),
      answer: numericAnswer(numStr(value)),
      params: { a, b, c, e, op },
      hints: [
        "Order of operations: do the multiplication before any adding or subtracting, then rewrite the expression with that product in place.",
        "Once that product is in place, nothing that is left outranks anything else, so work straight through from left to right.",
      ],
      worked_solution: workedSolution([
        `Multiply first: $${b} \\times ${c} = ${product}$.`,
        `Rewrite: $${a} + ${product} ${opSym} ${e}$.`,
        `Work left to right: $${a} + ${product} = ${partial}$.`,
        `Then ${opWord}: $${partial} ${opSym} ${e} = ${value}$.`,
      ]),
    };
  },
};

/** Diagnostic L3 (up stage) — a squared sum combined with a product. */
export const num2_l3: ItemTemplate = {
  template_id: "d1.num-2.l3",
  node_id: "NUM.2",
  difficulty: 3,
  concept: "exponents",
  generate(rng: Rng) {
    // (a+b)^2 combined with a product via - (`op=0`) or + (`op=1`, with the
    // product shown first). Exercises the full P-E-MD-AS ramp either way.
    const a = rng.int(2, 5);
    const b = rng.int(2, 5);
    const c = rng.int(1, 5);
    const d = rng.int(2, 5);
    const op = rng.int(0, 1);
    const square = (a + b) ** 2;
    const product = c * d;
    const value = op === 1 ? product + square : square - product;
    // Name the closing move in full: "subtract the two results" would not say
    // which way round the subtraction goes.
    const finishStep =
      op === 1 ? "add the two results" : "subtract the product from the square";
    const prompt =
      op === 1
        ? `${c} \\times ${d} + (${a} + ${b})^{2}`
        : `(${a} + ${b})^{2} - ${c} \\times ${d}`;
    return {
      prompt: evaluateMath(prompt),
      answer: numericAnswer(numStr(value)),
      params: { a, b, c, d, op },
      hints: [
        "Work inside the parentheses first: add the two numbers there before you square anything, since squaring a sum is not the same as squaring each piece.",
        `Square that sum, work out the product separately, then ${finishStep}.`,
      ],
      worked_solution: workedSolution([
        `Parentheses: $${a} + ${b} = ${a + b}$.`,
        `Exponent: $${a + b}^2 = ${square}$.`,
        `Multiply: $${c} \\times ${d} = ${product}$.`,
        op === 1
          ? `Add: $${product} + ${square} = ${value}$.`
          : `Subtract: $${square} - ${product} = ${value}$.`,
      ]),
    };
  },
};

/** Practice-only L1 — a single precedence step. */
export const num2_l1: ItemTemplate = {
  template_id: "d1.num-2.l1",
  node_id: "NUM.2",
  difficulty: 1,
  generate(rng: Rng) {
    // Single precedence step: one product then a sum, small numbers. `order`
    // optionally shows the product first, e.g. b×c + a.
    const a = rng.int(1, 5);
    const b = rng.int(2, 4);
    const c = rng.int(2, 4);
    const order = rng.int(0, 1);
    const expr = order === 1 ? `${b} \\times ${c} + ${a}` : `${a} + ${b} \\times ${c}`;
    return {
      prompt: evaluateMath(expr),
      answer: numericAnswer(numStr(a + b * c)),
      params: { a, b, c, order },
      hints: [
        "Order of operations: multiply before you add.",
        "Work out the product, then add the remaining number to it.",
      ],
      worked_solution: workedSolution([
        `Multiply first: $${b} \\times ${c} = ${b * c}$.`,
        `Add: $${a} + ${b * c} = ${a + b * c}$.`,
      ]),
    };
  },
};

/** Extra practice shape — L3: parentheses, then multiply, then subtract. */
export const num2_l3b: ItemTemplate = {
  template_id: "d1.num-2.l3b",
  node_id: "NUM.2",
  difficulty: 3,
  generate(rng: Rng) {
    const a = rng.int(2, 5);
    const b = rng.int(2, 5);
    const c = rng.int(2, 5);
    const product = (a + b) * c;
    // Keep the final result >= 0 so it stays a friendly whole number.
    const d = rng.int(1, Math.min(9, product - 1));
    const value = product - d;
    return {
      prompt: evaluateMath(`(${a} + ${b}) \\times ${c} - ${d}`),
      answer: numericAnswer(numStr(value)),
      params: { a, b, c, d },
      hints: [
        "Order of operations: add inside the parentheses first, then multiply that sum by the outside number.",
        "Subtract the last number from that product to finish, not before the multiplication.",
      ],
      worked_solution: workedSolution([
        `Parentheses first: $${a} + ${b} = ${a + b}$.`,
        `Multiply: $${a + b} \\times ${c} = ${product}$.`,
        `Subtract: $${product} - ${d} = ${value}$.`,
      ]),
    };
  },
};

/**
 * Extra practice shape — L2: a divide-then-multiply chain, then one additive term.
 *
 * The cell's other shape (`d1.num-2.l2`) is cleared by "multiply before you add", and a
 * learner can hold that rule without ever meeting the tier it belongs to. Here the top
 * tier carries a division AND a multiplication side by side, so the rule that decides the
 * value is the one the mini-lesson's second slide teaches: the two share one tier and are
 * taken left to right. Reaching for the multiplication first pairs `b` with `c` and lands
 * somewhere else entirely, which is exactly the mistake worth surfacing.
 *
 * The dividend is built as `b * q`, so the quotient is a whole number on every draw, and
 * the trailing term is clamped under the chain's value so the answer never goes negative.
 */
export const num2_l2b: ItemTemplate = {
  template_id: "d1.num-2.l2b",
  node_id: "NUM.2",
  difficulty: 2,
  generate(rng: Rng) {
    const b = rng.int(2, 5);
    const q = rng.int(2, 6);
    // The dividend is the product of the divisor and the quotient, never drawn directly,
    // so `a / b` is exact for every parameter set the template can deal.
    const a = b * q;
    const c = rng.int(2, 5);
    const chainValue = q * c;
    // `order = 1` puts the lone term in front. It can only be ADDED there: leading with a
    // subtraction would need the chain to be the smaller side, which no draw promises.
    const order = rng.int(0, 1);
    const op = order === 1 ? 0 : rng.int(0, 1);
    const d = op === 1 ? rng.int(1, Math.min(9, chainValue - 1)) : rng.int(1, 9);
    const opSym = op === 1 ? "-" : "+";
    const chain = `${a} \\div ${b} \\times ${c}`;
    const value = op === 1 ? chainValue - d : chainValue + d;
    return {
      prompt: evaluateMath(order === 1 ? `${d} + ${chain}` : `${chain} ${opSym} ${d}`),
      answer: numericAnswer(numStr(value)),
      params: { a, b, c, d, op, order },
      hints: [
        "Multiplication and division share one tier of the order of operations, so both of them are resolved before any adding or subtracting.",
        "Work that shared tier strictly left to right: the division comes first here, and multiplying first would pair up the wrong two numbers.",
      ],
      worked_solution: workedSolution([
        `Top tier first, left to right. Divide: $${a} \\div ${b} = ${q}$.`,
        `Stay on that tier and multiply: $${q} \\times ${c} = ${chainValue}$.`,
        order === 1
          ? `Rewrite: $${d} + ${chainValue}$.`
          : `Rewrite: $${chainValue} ${opSym} ${d}$.`,
        order === 1
          ? `Add: $${d} + ${chainValue} = ${value}$.`
          : op === 1
            ? `Subtract: $${chainValue} - ${d} = ${value}$.`
            : `Add: $${chainValue} + ${d} = ${value}$.`,
      ]),
    };
  },
};

/** Prerequisite-gated walk L2 (tightened, commutativity-guarded). */
export const num2_walk: ItemTemplate = {
  template_id: "d1w.num-2.l2",
  node_id: "NUM.2",
  difficulty: 2,
  generate(rng: Rng) {
    const a = rng.int(1, 9);
    // Order the product operands (b ≤ c) so `b × c` can't twin `c × b`.
    let b = rng.int(2, 6);
    let c = rng.int(2, 6);
    if (b > c) {
      [b, c] = [c, b];
    }
    return {
      prompt: `Evaluate: ${a} + ${b} × ${c}`,
      answer: numericAnswer(numStr(a + b * c)),
      params: { a, b, c },
    };
  },
  // A cell's instances must differ in the leading (a, b) shape, not just `c`
  // (so no `6 + 2 × 6` alongside `6 + 2 × 3`).
  varietyKey: (params) => `${params.a}:${params.b}`,
};

/** Golden fixtures for NUM.2 — order of operations. */
export const num2_golden: readonly GoldenFixture[] = [
  {
    item_version_id: "d1.golden.num-2.1",
    node_id: "NUM.2",
    prompt: "Evaluate: 2 + 3 × 4",
    answer: numericAnswer("14"),
    valid: "14",
    alternate_valid: [14],
    // 20: (2+3)×4 left-to-right; 24: wrong; 9: added all.
    near_miss: ["20", "24", "9"],
  },
  {
    item_version_id: "d1.golden.num-2.2",
    node_id: "NUM.2",
    prompt: "Evaluate: (5 + 1)^2 - 2 × 3",
    answer: numericAnswer("30"),
    valid: "30",
    alternate_valid: [30],
    // 102: (36-2)×3 left-to-right; 34: 36-2 (skipped ×3); 108: 36×3.
    near_miss: ["102", "34", "108"],
  },
];
