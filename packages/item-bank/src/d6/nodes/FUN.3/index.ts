import { expressionVariable, latexDollarInt } from "../../../promptFormat";
import {
  type GenerateContext,
  type ItemTemplate,
  numericAnswer,
  type Rng,
} from "../../../template";

/**
 * FUN.3 practice templates: piecewise functions, one machine with a different rule on each
 * stretch of its input range, evaluated by first deciding which piece the input falls in.
 * Themed for "The Gearwright's Menagerie"; Industrial era.
 *
 * ## Every shape is built around the one mistake this node is about
 *
 * A learner who substitutes into the wrong piece computes flawlessly and reports a number
 * that is simply not the function's value, so every template here GUARDS that the two
 * formulas disagree at the input it asks about. Without that guard a draw can quietly reward
 * picking the wrong piece, and the item stops measuring the only thing it exists to measure.
 *
 * The boundary is the second load-bearing idea, so the strictness of each inequality is a
 * drawn parameter rather than a constant, and the L2 boundary shape puts the input exactly ON
 * the break, where the size of the number settles nothing and the signs settle everything.
 *
 * ## Seeding
 *
 * Seeded from Lippman and Rasmussen, "Precalculus: An Investigation of Functions" (2nd ed.,
 * CC BY-SA, opentextbookstore.com/precalc), chapter 1 section 1.2, whose closing subsection is
 * piecewise functions. That section ships as a PDF, which the authoring tooling cannot read,
 * so the exercise SHAPES were checked against the parallel open treatment of the same topic
 * (OpenStax Precalculus section 1.2, CC BY, on LibreTexts) and every number here was re-derived
 * by hand. Four shapes in those sources: a per-unit charge that becomes a flat fee past a
 * threshold, a base charge plus a per-unit rate past a threshold, a three-piece definition
 * mixing a square, a constant and a linear rule, and a two-piece sketch. This pool diversifies
 * off them by keeping every value a whole number, by making the two pieces DISAGREE at the
 * break where both sources happen to make them agree, and by adding a shape neither source
 * has: one that evaluates on both sides of a break and adds the two values.
 *
 * Every key is a plain integer, computed by real arithmetic, so `validateTemplates` grades each
 * sampled instance correct. Each template declares a `varietyKey` over its answer and the side
 * of the break it lands on, which the D6 pool ENFORCES, so a cell never freezes two near-twins.
 */

export const FUN3_NODE = "FUN.3";

/** The letters this node's inputs may take. `y` is skipped: `f(y)` reads as an output. */
const INPUT_LETTERS: readonly number[] = [0, 2, 3];

/** A slope magnitude of at least two, so a coefficient is always written out. */
function slope(rng: Rng): number {
  const magnitude = rng.int(2, 6);
  return rng.int(0, 1) === 1 ? -magnitude : magnitude;
}

/** ` + 7` / ` - 7`, as the operator that precedes the magnitude. Empty at zero. */
function tail(value: number): string {
  if (value === 0) {
    return "";
  }
  return value < 0 ? ` - ${-value}` : ` + ${value}`;
}

/** `4x + 7`. Every draw keeps the coefficient at two or more, so it is always written. */
function linear(m: number, b: number, v: string): string {
  return `${m}${v}${tail(b)}`;
}

/** The same formula with the input written in: `4(-3) + 7`. */
function linearAt(m: number, b: number, p: number): string {
  return `${m}(${p})${tail(b)}`;
}

/** `x < 4` or `x \le 4`. */
function below(v: string, c: number, strict: boolean): string {
  return `${v} ${strict ? "<" : "\\le"} ${c}`;
}

/** `x > 4` or `x \ge 4`. */
function above(v: string, c: number, strict: boolean): string {
  return `${v} ${strict ? ">" : "\\ge"} ${c}`;
}

/**
 * A `cases` block, one row per piece: `\begin{cases} f & cond \\ ... \end{cases}`.
 *
 * KaTeX renders `cases` inline as well as in display, which is what lets a whole definition
 * sit inside an ordinary `$...$` span in a prompt.
 */
function cases(rows: readonly (readonly [string, string])[]): string {
  return `\\begin{cases} ${rows.map(([f, c]) => `${f} & ${c}`).join(" \\\\ ")} \\end{cases}`;
}

/**
 * L1: two linear pieces, evaluated at an input well inside one of them.
 *
 * The simplest form of the node's whole question. The input is never on the break, so the
 * strictness cannot bite, but the two formulas are guaranteed to disagree there, so the piece
 * still has to be chosen rather than guessed.
 */
export const d6_fun3_two_piece_eval_l1: ItemTemplate = {
  template_id: "d6.fun3.two-piece-eval.l1",
  node_id: FUN3_NODE,
  difficulty: 1,
  concept: "choose-the-piece-then-substitute",
  generate(rng: Rng) {
    const varIndex = INPUT_LETTERS[rng.int(0, INPUT_LETTERS.length - 1)] ?? 0;
    const v = expressionVariable(varIndex);
    const c = rng.int(-4, 5);
    // 1 puts the strict sign on the lower stretch, so the upper one claims the break.
    const strict = rng.int(0, 1);
    let m1 = 0;
    let b1 = 0;
    let m2 = 0;
    let b2 = 0;
    let side = 0;
    let p = 0;
    let value = 0;
    do {
      m1 = slope(rng);
      b1 = rng.int(-9, 9);
      m2 = slope(rng);
      b2 = rng.int(-9, 9);
      side = rng.int(0, 1);
      p = side === 0 ? c - rng.int(1, 4) : c + rng.int(1, 4);
      value = side === 0 ? m1 * p + b1 : m2 * p + b2;
    } while (
      // Two identical formulas are one formula written twice.
      (m1 === m2 && b1 === b2) ||
      // The wrong piece must produce a DIFFERENT number, or the item rewards picking it.
      m1 * p + b1 === m2 * p + b2 ||
      Math.abs(value) > 60
    );
    const lowCondition = below(v, c, strict === 1);
    const highCondition = above(v, c, strict === 0);
    const definition = cases([
      [linear(m1, b1, v), lowCondition],
      [linear(m2, b2, v), highCondition],
    ]);
    const held = side === 0 ? lowCondition : highCondition;
    const substitution = side === 0 ? linearAt(m1, b1, p) : linearAt(m2, b2, p);
    return {
      prompt: `Evaluate $f(${p})$ for $f(${v}) = ${definition}$. Enter one number.`,
      answer: numericAnswer(String(value)),
      params: { m1, b1, m2, b2, c, strict, side, p, varIndex, value },
      hints: [
        "Do not substitute anything yet. Test the input against each condition and keep the one formula whose condition it satisfies.",
        "Only that formula is allowed to touch this input, so write the input in place of the variable in it and work the arithmetic out from there.",
      ],
      worked_solution: [
        `The input is $${v} = ${p}$, and the condition it satisfies is $${held}$, so that stretch's formula is the one to use.`,
        `Substitute into that formula alone: $f(${p}) = ${substitution}$.`,
        `Working that out, $f(${p}) = ${value}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.side}:${params.value}:${params.p}`,
};

/**
 * L2a: the same two-piece shape, evaluated exactly ON the break.
 *
 * The size of the input settles nothing here, because both conditions are written about it.
 * The two formulas are guaranteed to disagree at the break, so reading the inequality signs is
 * the whole of the work, and the strictness is drawn rather than fixed so the answer is not
 * always on the same side.
 */
export const d6_fun3_boundary_eval_l2: ItemTemplate = {
  template_id: "d6.fun3.boundary-eval.l2",
  node_id: FUN3_NODE,
  difficulty: 2,
  concept: "which-piece-claims-the-break-point",
  generate(rng: Rng) {
    const varIndex = INPUT_LETTERS[rng.int(0, INPUT_LETTERS.length - 1)] ?? 0;
    const v = expressionVariable(varIndex);
    const c = rng.int(-5, 6);
    // 0 leaves the lower stretch non-strict, so IT claims the break; 1 hands it upward.
    const strict = rng.int(0, 1);
    let m1 = 0;
    let b1 = 0;
    let m2 = 0;
    let b2 = 0;
    let value = 0;
    do {
      m1 = slope(rng);
      b1 = rng.int(-9, 9);
      m2 = slope(rng);
      b2 = rng.int(-9, 9);
      value = strict === 0 ? m1 * c + b1 : m2 * c + b2;
    } while (
      // Without a genuine disagreement at the break there is nothing here to get wrong.
      m1 * c + b1 === m2 * c + b2 ||
      Math.abs(value) > 60
    );
    const lowCondition = below(v, c, strict === 1);
    const highCondition = above(v, c, strict === 0);
    const definition = cases([
      [linear(m1, b1, v), lowCondition],
      [linear(m2, b2, v), highCondition],
    ]);
    const ownerCondition = strict === 0 ? lowCondition : highCondition;
    const otherCondition = strict === 0 ? highCondition : lowCondition;
    const substitution = strict === 0 ? linearAt(m1, b1, c) : linearAt(m2, b2, c);
    return {
      prompt: `Evaluate $f(${c})$ for $f(${v}) = ${definition}$. Enter one number.`,
      answer: numericAnswer(String(value)),
      params: { m1, b1, m2, b2, c, strict, varIndex, value },
      hints: [
        "This input lands exactly where the two conditions meet, so its size settles nothing. Look at which of the two signs there takes the input in rather than leaving it out.",
        "Exactly one condition can hold, because one input may have only one value. Substitute into the formula beside that condition and no other.",
      ],
      worked_solution: [
        `The input is $${v} = ${c}$, which is exactly where the two conditions meet.`,
        `Only one of them takes it in: $${ownerCondition}$ holds and $${otherCondition}$ does not, so that stretch owns this input.`,
        `Substitute into its formula alone: $f(${c}) = ${substitution}$.`,
        `Working that out, $f(${c}) = ${value}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.strict}:${params.value}:${params.c}`,
};

/**
 * L2b: three pieces, with the middle one carrying a DOUBLE condition.
 *
 * A compound condition is two tests rather than one, and reading it as a single test is the
 * mistake this shape is for. The two outer stretches are flat, so a learner who lands on one
 * of them reports a number with no arithmetic in it at all; both flat values are guarded away
 * from the answer so that mistake is always visible.
 */
export const d6_fun3_three_piece_eval_l2: ItemTemplate = {
  template_id: "d6.fun3.three-piece-eval.l2",
  node_id: FUN3_NODE,
  difficulty: 2,
  concept: "read-a-double-condition-as-two-tests",
  generate(rng: Rng) {
    const varIndex = INPUT_LETTERS[rng.int(0, INPUT_LETTERS.length - 1)] ?? 0;
    const v = expressionVariable(varIndex);
    const a = rng.int(-6, 0);
    const c = a + rng.int(2, 5);
    let m = 0;
    let b = 0;
    let k1 = 0;
    let k2 = 0;
    let p = 0;
    let value = 0;
    do {
      m = slope(rng);
      b = rng.int(-9, 9);
      k1 = rng.int(-12, 12);
      k2 = rng.int(-12, 12);
      p = rng.int(a, c - 1);
      value = m * p + b;
    } while (
      k1 === k2 ||
      // Both flat stretches must differ from the answer, so a wrong piece is always visible.
      value === k1 ||
      value === k2 ||
      Math.abs(value) > 60
    );
    const lowCondition = below(v, a, true);
    const midCondition = `${a} \\le ${v} < ${c}`;
    const highCondition = above(v, c, false);
    const definition = cases([
      [String(k1), lowCondition],
      [linear(m, b, v), midCondition],
      [String(k2), highCondition],
    ]);
    return {
      prompt: `Evaluate $f(${p})$ for $f(${v}) = ${definition}$. Enter one number.`,
      answer: numericAnswer(String(value)),
      params: { a, c, m, b, k1, k2, p, varIndex, value },
      hints: [
        "One of the three conditions is a double condition. Read it as two separate tests, because an input only belongs there when it clears both halves of it.",
        "Once one condition has been settled, substitute the input into the formula beside that condition and no other.",
      ],
      worked_solution: [
        `The input is $${v} = ${p}$. It is not below $${a}$, and it is below $${c}$, so it clears both halves of $${midCondition}$.`,
        `That stretch's formula is $${linear(m, b, v)}$, so substitute the input into it: $f(${p}) = ${linearAt(m, b, p)}$.`,
        `Working that out, $f(${p}) = ${value}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.value}:${params.p}:${params.k1}`,
};

/**
 * L3a: two inputs on opposite sides of the break, and their two values added.
 *
 * Neither of the seed sources has this shape, and it is the one that most nearly asks what
 * the node is for: the piece has to be chosen twice, from two different conditions, and the
 * second input is drawn so that it sometimes lands exactly on the break.
 *
 * Themed for practice as a goods shed's freight rate, which is the Industrial era's own
 * framing for a rule that changes at a break point. The assessment forms keep the neutral
 * prompt, so the frozen forms and the pinned content hashes are untouched.
 */
export const d6_fun3_across_pieces_sum_l3: ItemTemplate = {
  template_id: "d6.fun3.across-pieces-sum.l3",
  node_id: FUN3_NODE,
  difficulty: 3,
  concept: "evaluate-on-both-sides-of-one-break",
  generate(rng: Rng, context?: GenerateContext) {
    let rateLow = 0;
    let rateHigh = 0;
    let fee = 0;
    let c = 0;
    let p = 0;
    let q = 0;
    do {
      rateLow = rng.int(5, 12);
      rateHigh = rng.int(2, rateLow - 1);
      fee = rng.int(4, 30);
      c = rng.int(4, 12);
      p = rng.int(1, c - 1);
      q = c + rng.int(0, 5);
    } while (
      // The two formulas must disagree at the break, or the second input's condition does
      // not matter on the draws where it lands there.
      rateLow * c ===
      rateHigh * c + fee
    );
    const first = rateLow * p;
    const second = rateHigh * q + fee;
    const total = first + second;
    const lowCondition = below("t", c, true);
    const highCondition = above("t", c, false);
    const definition = cases([
      [`${rateLow}t`, lowCondition],
      [`${rateHigh}t + ${fee}`, highCondition],
    ]);
    const neutral = `For $C(t) = ${definition}$, find $C(${p}) + C(${q})$. Enter one number.`;
    const themed =
      `A goods shed charges ${latexDollarInt(rateLow)} a ton for a load under $${c}$ tons, and ` +
      `${latexDollarInt(rateHigh)} a ton plus a flat ${latexDollarInt(fee)} handling charge for a load of $${c}$ tons or more. ` +
      `One load of $${p}$ tons and one of $${q}$ tons come in. What do the two of them cost together? Enter one number, in dollars.`;
    return {
      prompt: context?.form === "practice" ? themed : neutral,
      answer: numericAnswer(String(total)),
      params: { rateLow, rateHigh, fee, c, p, q, first, second, total },
      hints: [
        "Settle each input on its own before any arithmetic. Test it against the conditions, and where an input sits exactly where two conditions meet, the inequality signs are what decide.",
        "Work the two values out separately, each from the formula its own condition names, and add them only at the end.",
      ],
      worked_solution: [
        `Take the inputs one at a time. For $t = ${p}$ the condition $${lowCondition}$ holds, so $C(${p}) = ${rateLow} \\times ${p} = ${first}$.`,
        `For $t = ${q}$ the condition $${highCondition}$ holds, so $C(${q}) = ${rateHigh} \\times ${q} + ${fee} = ${second}$.`,
        `Add the two values: $${first} + ${second} = ${total}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.total}:${params.c}:${params.q}`,
};

/**
 * L3b: a squared piece beside a linear one, with the input free to land on the break.
 *
 * Two things stack here. Which piece owns the input is drawn, and can be settled by the
 * inequality signs rather than by the size of the number; and the squared formula takes the
 * whole input, sign included, so a negative input has to go into brackets before it is
 * squared. The two formulas are guarded to disagree at the input, as everywhere in this pool.
 */
export const d6_fun3_square_piece_eval_l3: ItemTemplate = {
  template_id: "d6.fun3.square-piece-eval.l3",
  node_id: FUN3_NODE,
  difficulty: 3,
  concept: "evaluate-a-piecewise-rule-with-a-squared-piece",
  generate(rng: Rng) {
    const varIndex = INPUT_LETTERS[rng.int(0, INPUT_LETTERS.length - 1)] ?? 0;
    const v = expressionVariable(varIndex);
    const c = rng.int(-3, 3);
    // 0 leaves the lower (squared) stretch non-strict, so IT claims the break.
    const strict = rng.int(0, 1);
    let b = 0;
    let m = 0;
    let k = 0;
    let atBreak = 0;
    let side = 0;
    let p = 0;
    let squareOwns = false;
    let value = 0;
    do {
      b = rng.int(-9, 9);
      m = slope(rng);
      k = rng.int(-9, 9);
      atBreak = rng.int(0, 1);
      side = rng.int(0, 1);
      p = atBreak === 1 ? c : side === 0 ? c - rng.int(1, 4) : c + rng.int(1, 4);
      squareOwns = atBreak === 1 ? strict === 0 : side === 0;
      value = squareOwns ? p * p + b : m * p + k;
    } while (
      // A zero constant on either piece would print a formula with a dangling operator.
      b === 0 ||
      k === 0 ||
      // The wrong piece must produce a DIFFERENT number here too.
      p * p + b === m * p + k ||
      Math.abs(value) > 60
    );
    const lowCondition = below(v, c, strict === 1);
    const highCondition = above(v, c, strict === 0);
    const squareFormula = `${v}^{2}${tail(b)}`;
    const definition = cases([
      [squareFormula, lowCondition],
      [linear(m, k, v), highCondition],
    ]);
    const ownerCondition = squareOwns ? lowCondition : highCondition;
    const substitution = squareOwns ? `(${p})^{2}${tail(b)}` : linearAt(m, k, p);
    const opening =
      atBreak === 1
        ? `The input is $${v} = ${c}$, exactly where the two conditions meet, and only $${ownerCondition}$ takes it in.`
        : `The input is $${v} = ${p}$, and the condition it satisfies is $${ownerCondition}$.`;
    return {
      prompt: `Evaluate $f(${p})$ for $f(${v}) = ${definition}$. Enter one number.`,
      answer: numericAnswer(String(value)),
      params: { c, strict, b, m, k, atBreak, side, p, varIndex, value },
      hints: [
        "Settle the condition before you touch the arithmetic, and where the input lands exactly where the two conditions meet, the inequality signs are what decide it.",
        "Write the input in brackets when you substitute it, so a negative input is squared whole and a negative coefficient keeps its sign.",
      ],
      worked_solution: [
        opening,
        `Substitute into that stretch's formula alone, keeping the input in brackets: $f(${p}) = ${substitution}$.`,
        `Working that out, $f(${p}) = ${value}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.value}:${params.p}:${params.atBreak}`,
};

/** Every FUN.3 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const FUN3_TEMPLATES: readonly ItemTemplate[] = [
  d6_fun3_two_piece_eval_l1,
  d6_fun3_boundary_eval_l2,
  d6_fun3_three_piece_eval_l2,
  d6_fun3_across_pieces_sum_l3,
  d6_fun3_square_piece_eval_l3,
];
