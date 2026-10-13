import { evaluateMath, latexAbs } from "../../../promptFormat";
import {
  type GenerateContext,
  type ItemTemplate,
  numericAnswer,
  type Rng,
} from "../../../template";
import type { GoldenFixture } from "../../golden";
import { signed, workedSolution } from "../../hints";
import { waterlineReadingSum } from "../../theming";
import { numStr, signedOperand } from "../_shared";

/** Diagnostic L1 (down stage) — a two-term signed sum. */
export const numS_l1: ItemTemplate = {
  template_id: "d1.num-s.l1",
  node_id: "NUM.S",
  difficulty: 1,
  concept: "signed-add",
  generate(rng: Rng, ctx?: GenerateContext) {
    // A two-term signed sum with mixed signs (`sa`,`sb`: 1 = negative). At least
    // one addend is negative (a genuine signed problem) and the sum is nonzero.
    let a = rng.int(2, 9);
    let b = rng.int(2, 9);
    let sa = rng.int(0, 1);
    let sb = rng.int(0, 1);
    let value = (sa === 1 ? -a : a) + (sb === 1 ? -b : b);
    while (!(sa === 1 || sb === 1) || value === 0) {
      a = rng.int(2, 9);
      b = rng.int(2, 9);
      sa = rng.int(0, 1);
      sb = rng.int(0, 1);
      value = (sa === 1 ? -a : a) + (sb === 1 ? -b : b);
    }
    const sameSign = (sa === 1) === (sb === 1);
    // Practice: a waterline-stake reading word problem (rises/falls from $0$);
    // the assessment forms keep the neutral signed sum.
    const prompt =
      ctx?.form === "practice"
        ? waterlineReadingSum([sa === 1 ? -a : a, sb === 1 ? -b : b])
        : evaluateMath(`${signedOperand(a, sa === 1)} + ${signedOperand(b, sb === 1)}`);
    return {
      prompt,
      answer: numericAnswer(numStr(value)),
      params: { a, b, sa, sb },
      hints: [
        "A rise counts up from the mark and a fall counts down, so write each change as a signed number before you combine anything.",
        "Combine the signed changes: two changes with the same sign add together, while two with opposite signs partly cancel, so subtract the smaller size from the larger.",
        "The reading ends up with the sign of whichever side is bigger: if both changes pull the same way the total keeps that shared sign, and if they oppose each other the larger change decides.",
      ],
      worked_solution: sameSign
        ? workedSolution([
            "The signs match, so add the sizes and keep that sign.",
            `Add the sizes: $${a} + ${b} = ${a + b}$.`,
            `Result: $${numStr(value)}$.`,
          ])
        : workedSolution([
            "The signs differ, so subtract the smaller size from the larger.",
            `Subtract: $${Math.max(a, b)} - ${Math.min(a, b)} = ${Math.abs(a - b)}$.`,
            `Take the sign of the larger size: $${numStr(value)}$.`,
          ]),
    };
  },
};

/** Diagnostic L2 (routing stage) — a signed term added to a signed product. */
export const numS_l2: ItemTemplate = {
  template_id: "d1.num-s.l2",
  node_id: "NUM.S",
  difficulty: 2,
  concept: "sign-rules-multiply",
  generate(rng: Rng) {
    // A signed term added to a signed product: (±a) + (±b)×(±c). Sign flags
    // `sa`,`sb`,`sc` (1 = negative); `order = 1` shows the product first. At
    // least one factor/term is negative so the sign work is real.
    let a = rng.int(2, 9);
    let b = rng.int(2, 6);
    let c = rng.int(2, 6);
    let sa = rng.int(0, 1);
    let sb = rng.int(0, 1);
    let sc = rng.int(0, 1);
    while (!(sa === 1 || sb === 1 || sc === 1)) {
      a = rng.int(2, 9);
      b = rng.int(2, 6);
      c = rng.int(2, 6);
      sa = rng.int(0, 1);
      sb = rng.int(0, 1);
      sc = rng.int(0, 1);
    }
    const order = rng.int(0, 1);
    const opA = sa === 1 ? -a : a;
    const opB = sb === 1 ? -b : b;
    const opC = sc === 1 ? -c : c;
    const product = opB * opC;
    const value = opA + product;
    const aStr = signedOperand(a, sa === 1);
    const productStr = `${signedOperand(b, sb === 1)} \\times ${signedOperand(c, sc === 1)}`;
    const expr = order === 1 ? `${productStr} + ${aStr}` : `${aStr} + ${productStr}`;
    return {
      prompt: evaluateMath(expr),
      answer: numericAnswer(numStr(value)),
      params: { a, b, c, sa, sb, sc, order },
      hints: [
        "Order of operations: do the multiplication before the addition.",
        "Two factors with the same sign give a positive product and two with different signs give a negative one. Add that product to the remaining term, keeping its sign.",
      ],
      worked_solution: workedSolution([
        `Multiply first: $${signed(opB)} \\times ${signed(opC)} = ${signed(product)}$.`,
        `Add: $${signed(opA)} + ${signed(product)} = ${numStr(value)}$.`,
      ]),
    };
  },
};

/** Practice-only L3 — two signed products combined. */
export const numS_l3: ItemTemplate = {
  template_id: "d1.num-s.l3",
  node_id: "NUM.S",
  difficulty: 3,
  generate(rng: Rng) {
    // Two signed products combined: (±a)(±b) + (±c)(±d). Sign flags sa..sd
    // (1 = negative); at least one factor is negative so the sign work is real.
    let a = rng.int(2, 5);
    let b = rng.int(2, 5);
    let c = rng.int(2, 5);
    let d = rng.int(2, 5);
    let sa = rng.int(0, 1);
    let sb = rng.int(0, 1);
    let sc = rng.int(0, 1);
    let sd = rng.int(0, 1);
    while (!(sa === 1 || sb === 1 || sc === 1 || sd === 1)) {
      a = rng.int(2, 5);
      b = rng.int(2, 5);
      c = rng.int(2, 5);
      d = rng.int(2, 5);
      sa = rng.int(0, 1);
      sb = rng.int(0, 1);
      sc = rng.int(0, 1);
      sd = rng.int(0, 1);
    }
    const opA = sa === 1 ? -a : a;
    const opB = sb === 1 ? -b : b;
    const opC = sc === 1 ? -c : c;
    const opD = sd === 1 ? -d : d;
    const p1 = opA * opB;
    const p2 = opC * opD;
    const value = p1 + p2;
    return {
      prompt: evaluateMath(
        `${signedOperand(a, sa === 1)} \\times ${signedOperand(b, sb === 1)} + ${signedOperand(c, sc === 1)} \\times ${signedOperand(d, sd === 1)}`,
      ),
      answer: numericAnswer(numStr(value)),
      params: { a, b, c, d, sa, sb, sc, sd },
      hints: [
        "Do both multiplications before you add, then combine the two products.",
        "Each product takes its sign from its own two factors: matching signs give a positive, differing signs give a negative. Settle both signs before you add.",
      ],
      worked_solution: workedSolution([
        `First product: $${signed(opA)} \\times ${signed(opB)} = ${signed(p1)}$.`,
        `Second product: $${signed(opC)} \\times ${signed(opD)} = ${signed(p2)}$.`,
        `Add: $${signed(p1)} + ${signed(p2)} = ${numStr(value)}$.`,
      ]),
    };
  },
};

/** Extra practice shape — L1: combine two absolute values. */
export const numS_l1b: ItemTemplate = {
  template_id: "d1.num-s.l1b",
  node_id: "NUM.S",
  difficulty: 1,
  generate(rng: Rng) {
    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    let sa = rng.int(0, 1);
    let sb = rng.int(0, 1);
    // At least one value inside the bars is negative, so taking the absolute
    // value does real sign work rather than being a no-op.
    while (sa === 0 && sb === 0) {
      sa = rng.int(0, 1);
      sb = rng.int(0, 1);
    }
    const op = rng.int(0, 1);
    const opSym = op === 1 ? "-" : "+";
    const insideA = sa === 1 ? `-${a}` : `${a}`;
    const insideB = sb === 1 ? `-${b}` : `${b}`;
    const value = op === 1 ? a - b : a + b;
    return {
      prompt: evaluateMath(`${latexAbs(insideA)} ${opSym} ${latexAbs(insideB)}`),
      answer: numericAnswer(numStr(value)),
      params: { a, b, sa, sb, op },
      hints: [
        "Absolute value is distance from zero, so each pair of bars turns whatever is inside into its size, with no sign attached.",
        "Combine those two distances with the operation shown between the bars.",
      ],
      worked_solution: workedSolution([
        `Take each absolute value: $${latexAbs(insideA)} = ${a}$ and $${latexAbs(insideB)} = ${b}$.`,
        `${op === 1 ? "Subtract" : "Add"}: $${a} ${opSym} ${b} = ${numStr(value)}$.`,
      ]),
    };
  },
};

/** Extra practice shape — L2: a three-term signed sum reduced left to right. */
export const numS_l2b: ItemTemplate = {
  template_id: "d1.num-s.l2b",
  node_id: "NUM.S",
  difficulty: 2,
  generate(rng: Rng) {
    // Sign flags sa/sb/sc (1 = negative); at least one negative and a nonzero
    // total keep the sign work real and the answer unambiguous.
    let a = rng.int(2, 9);
    let b = rng.int(2, 9);
    let c = rng.int(2, 9);
    let sa = rng.int(0, 1);
    let sb = rng.int(0, 1);
    let sc = rng.int(0, 1);
    let opA = sa === 1 ? -a : a;
    let opB = sb === 1 ? -b : b;
    let opC = sc === 1 ? -c : c;
    while (!(sa === 1 || sb === 1 || sc === 1) || opA + opB + opC === 0) {
      a = rng.int(2, 9);
      b = rng.int(2, 9);
      c = rng.int(2, 9);
      sa = rng.int(0, 1);
      sb = rng.int(0, 1);
      sc = rng.int(0, 1);
      opA = sa === 1 ? -a : a;
      opB = sb === 1 ? -b : b;
      opC = sc === 1 ? -c : c;
    }
    const partial = opA + opB;
    const value = partial + opC;
    return {
      prompt: evaluateMath(
        `${signedOperand(a, sa === 1)} + ${signedOperand(b, sb === 1)} + ${signedOperand(c, sc === 1)}`,
      ),
      answer: numericAnswer(numStr(value)),
      params: { a, b, c, sa, sb, sc },
      hints: [
        "Combine the numbers one pair at a time, working left to right, and carry the running total into the last number.",
        "Like signs add together, and unlike signs subtract and keep the sign of the larger size.",
      ],
      worked_solution: workedSolution([
        `Add the first two: $${signed(opA)} + ${signed(opB)} = ${signed(partial)}$.`,
        `Add the third: $${signed(partial)} + ${signed(opC)} = ${numStr(value)}$.`,
      ]),
    };
  },
};

/** Extra practice shape — L2: absolute value of a signed sum. */
export const numS_l2c: ItemTemplate = {
  template_id: "d1.num-s.l2c",
  node_id: "NUM.S",
  difficulty: 2,
  generate(rng: Rng) {
    let a = rng.int(2, 9);
    let b = rng.int(2, 9);
    let sa = rng.int(0, 1);
    let sb = rng.int(0, 1);
    let opA = sa === 1 ? -a : a;
    let opB = sb === 1 ? -b : b;
    // At least one negative (real sign work) and a nonzero inside (unambiguous).
    while ((sa === 0 && sb === 0) || opA + opB === 0) {
      a = rng.int(2, 9);
      b = rng.int(2, 9);
      sa = rng.int(0, 1);
      sb = rng.int(0, 1);
      opA = sa === 1 ? -a : a;
      opB = sb === 1 ? -b : b;
    }
    const inner = opA + opB;
    const value = Math.abs(inner);
    const innerExpr = `${signedOperand(a, sa === 1)} + ${signedOperand(b, sb === 1)}`;
    return {
      prompt: evaluateMath(latexAbs(innerExpr)),
      answer: numericAnswer(numStr(value)),
      params: { a, b, sa, sb },
      hints: [
        "Work inside the bars first: combine the two signed numbers following the sign rules.",
        "Then take the absolute value of that result, since distance from zero is never negative.",
      ],
      worked_solution: workedSolution([
        `Evaluate inside the bars: $${signed(opA)} + ${signed(opB)} = ${signed(inner)}$.`,
        `Take the absolute value: $${latexAbs(signed(inner))} = ${numStr(value)}$.`,
      ]),
    };
  },
};

/**
 * The divisors of `n` that leave a whole quotient of at least 2, capped at 9 so a
 * divisor stays in the same friendly range as the node's other operands. Every `n` here
 * is a product of two numbers in 2..6, so it is composite and its smallest prime factor
 * (at most 6, with a cofactor of at least 2) always qualifies: the list is never empty.
 */
function exactDivisors(n: number): number[] {
  const divisors: number[] = [];
  for (let candidate = 2; candidate <= Math.min(9, n / 2); candidate += 1) {
    if (n % candidate === 0) {
      divisors.push(candidate);
    }
  }
  return divisors;
}

/** Extra practice shape — L3: a signed product divided, then a signed term combined. */
export const numS_l3b: ItemTemplate = {
  template_id: "d1.num-s.l3b",
  node_id: "NUM.S",
  difficulty: 3,
  generate(rng: Rng) {
    // (±a) × (±b) ÷ (±c), then a signed term added or subtracted. Multiplication and
    // division share a tier, so the chain runs left to right and the sign rule is
    // applied twice, once to a product and once to a quotient. `c` is drawn from the
    // divisors of a×b, so the division is always exact. Sign flags sa..sd (1 =
    // negative); at least one of the three chain numbers is negative so the sign work
    // is real, and `op = 1` subtracts the trailing term.
    const a = rng.int(2, 6);
    const b = rng.int(2, 6);
    const c = rng.pick(exactDivisors(a * b));
    const d = rng.int(2, 9);
    let sa = rng.int(0, 1);
    let sb = rng.int(0, 1);
    let sc = rng.int(0, 1);
    while (sa === 0 && sb === 0 && sc === 0) {
      sa = rng.int(0, 1);
      sb = rng.int(0, 1);
      sc = rng.int(0, 1);
    }
    const sd = rng.int(0, 1);
    const op = rng.int(0, 1);
    const opSym = op === 1 ? "-" : "+";
    const opA = sa === 1 ? -a : a;
    const opB = sb === 1 ? -b : b;
    const opC = sc === 1 ? -c : c;
    const opD = sd === 1 ? -d : d;
    const product = opA * opB;
    const quotient = product / opC;
    const value = op === 1 ? quotient - opD : quotient + opD;
    return {
      prompt: evaluateMath(
        `${signedOperand(a, sa === 1)} \\times ${signedOperand(b, sb === 1)} \\div ${signedOperand(c, sc === 1)} ${opSym} ${signedOperand(d, sd === 1)}`,
      ),
      answer: numericAnswer(numStr(value)),
      params: { a, b, c, d, sa, sb, sc, sd, op },
      hints: [
        "Multiplying and dividing both outrank adding and subtracting, and they rank the same as each other, so clear that chain from left to right before you touch the last term.",
        "Each of those two steps takes its sign from the two numbers going into it: matching signs give a positive result, differing signs give a negative one.",
        `Finish with the last term: ${op === 1 ? "subtract it from" : "add it to"} the value the division left, keeping track of that term's own sign.`,
      ],
      worked_solution: workedSolution([
        `Work the multiply and divide chain from the left: $${signed(opA)} \\times ${signed(opB)} = ${signed(product)}$.`,
        `Divide: $${signed(product)} \\div ${signed(opC)} = ${signed(quotient)}$.`,
        `${op === 1 ? "Subtract" : "Add"} the last term: $${signed(quotient)} ${opSym} ${signed(opD)} = ${numStr(value)}$.`,
      ]),
    };
  },
};

/** Prerequisite-gated walk L2 (tightened, commutativity-guarded). */
export const numS_walk: ItemTemplate = {
  template_id: "d1w.num-s.l2",
  node_id: "NUM.S",
  difficulty: 2,
  generate(rng: Rng) {
    const a = rng.int(2, 9);
    // Order the multiplied operands (b ≤ c) so `b × (-c)` can't twin `c × (-b)`.
    let b = rng.int(2, 6);
    let c = rng.int(2, 6);
    if (b > c) {
      [b, c] = [c, b];
    }
    return {
      prompt: `Evaluate: (${-a}) + ${b} × (${-c})`,
      answer: numericAnswer(numStr(-a - b * c)),
      params: { a, b, c },
    };
  },
  // A cell's instances must differ in the leading (a, b) shape, not just `c`.
  varietyKey: (params) => `${params.a}:${params.b}`,
};

/** Golden fixtures for NUM.S — signed-number arithmetic. */
export const numS_golden: readonly GoldenFixture[] = [
  {
    item_version_id: "d1.golden.num-s.1",
    node_id: "NUM.S",
    prompt: "Evaluate: (-3) + (-5)",
    answer: numericAnswer("-8"),
    valid: "-8",
    alternate_valid: [-8, "-8.0"],
    // 8: dropped signs; -2: subtracted; 2: subtracted + wrong sign.
    near_miss: ["8", "-2", "2"],
  },
  {
    item_version_id: "d1.golden.num-s.2",
    node_id: "NUM.S",
    prompt: "Evaluate: (-4) + 3 × (-2)",
    answer: numericAnswer("-10"),
    valid: "-10",
    alternate_valid: [-10],
    // 2: (-4+3)×(-2) left-to-right; -3: added instead of multiplied; 10: sign.
    near_miss: ["2", "-3", "10"],
  },
];
