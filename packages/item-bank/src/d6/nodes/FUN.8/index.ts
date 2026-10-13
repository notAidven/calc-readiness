import {
  expressionAnswer,
  type GenerateContext,
  type ItemTemplate,
  numericAnswer,
  type Rng,
} from "../../../template";

/**
 * FUN.8 practice templates: inverse functions, an automaton run backwards, and the
 * one-to-one condition that decides whether it can be. Five problem shapes across the
 * locked 1xL1 / 2xL2 / 2xL3 practice mix, one per way the idea reaches a learner:
 *
 *  - L1  a ledger of settings and readings, read from the reading column (the swap, no algebra);
 *  - L2a evaluate the inverse at one value, which is the forward rule solved for its input;
 *  - L2b swap and solve where the whole numerator sits over the bar, so the inverse is `ax + c`;
 *  - L3a swap and solve where only the variable sits over the bar, so the last step distributes;
 *  - L3b a squaring rule, and the second input that lands on the same reading, which is exactly
 *        what stops it being one to one.
 *
 * ## Why no inverse here is a quotient
 *
 * The obvious shape for this node is `f(x) = ax + b`, whose inverse is `(x - b)/a`. It is
 * deliberately absent. FUN.8's registry prereqs are `FUN.1` and `FUN.7`, which do not include
 * rational expressions, and an answer key carrying a bar reaches no notation tag in
 * `apps/web/src/lessons/answerFormat.ts`, so the learner would meet a bare "Your answer" field
 * over notation nothing on screen names. Both expression shapes below therefore put the
 * division in the PROMPT and take it out of the answer: every key here is either a plain
 * integer or a simplified linear expression in `x`.
 *
 * ## Answer paths
 *
 * Three of the five are `numericAnswer` over an integer key, because the answer is a value
 * rather than a form: a setting, an input, the twin of an input. The two "find the rule"
 * shapes are `expressionAnswer(..., ["x"], "combined_polynomial")`, the same grader LF.2 and
 * LF.3 use for a written-out linear expression, so a learner who leaves `4(x + 3)` factored is
 * asked to multiply it out. Both prompts say so.
 *
 * ## Hints carry no standalone digits
 *
 * Three keys here are small integers and `hint_leaks_answer` matches a key as a standalone
 * value, so a hint reading "step across by $2$" would leak on precisely the draws whose answer
 * is $2$ and pass on every other one. Every hint below is written digit-free and param-free,
 * except where a params-derived WORD (the sign of the constant) is interpolated.
 *
 * ## Theming
 *
 * `FUN.8` sits in the INDUSTRIAL era (`packages/skill-graph/src/eras.ts`), whose style guide
 * gives this node three framings: a mould and its casting, a machine that can be run backwards
 * only if no two blanks ever produced the same part, and a conversion table read from either
 * column. The three shapes whose mathematics is genuinely a story about running a machine
 * backwards take a themed prompt when `ctx?.form === "practice"`; the two abstract "find the
 * rule" shapes stay neutral in every form rather than wearing a decorative prefix. Nothing in
 * any prompt touches the era's "Explicitly absent" list, and the framing is drawn from the
 * era's world rather than from the node's building (D-ERA8).
 *
 * Every template declares a `varietyKey` over the numbers that FIX the instance, so a cell
 * never freezes two items that reduce to the same question.
 */

export const FUN8_NODE = "FUN.8";

/** `+` or `-`, for building a signed term. */
function op(value: number): string {
  return value < 0 ? "-" : "+";
}

/** A linear expression as LaTeX: `4x + 12`, `3x - 5`. */
function lineTex(m: number, b: number): string {
  return b === 0 ? `${m}x` : `${m}x ${op(b)} ${Math.abs(b)}`;
}

/**
 * The same expression as an answer key: `4x + 12`.
 *
 * IMPLICIT MULTIPLICATION, because the key has to be sayable on the keypad the learner is
 * given and `times` is not a key D6 offers. mathjs parses `4x` as `4*x`, so the explicit form
 * this used to emit bought nothing and cost the whole node its grading: `answerKeypad.test.ts`
 * reads every served key for the notations it uses and reports one with no key as short.
 *
 * It is also what the rest of the tree already writes. `lineTex` above, `FUN.7` in this same
 * domain and D7's `LF.3` all build linear keys as `${m}x`; this helper was the only place in
 * the item bank spelling the operator out.
 */
function lineKey(m: number, b: number): string {
  return b === 0 ? `${m}x` : `${m}x ${op(b)} ${Math.abs(b)}`;
}

/** `x - 5`, or `x + 3` when the shift is negative, for the inside of a squared bracket. */
function shiftedTex(h: number): string {
  return h === 0 ? "x" : `x ${op(-h)} ${Math.abs(h)}`;
}

/** ` + 2` / ` - 6`, or nothing at all when the constant is zero. */
function tailTex(k: number): string {
  return k === 0 ? "" : ` ${op(k)} ${Math.abs(k)}`;
}

/**
 * L1, the ledger read from the other column. Four settings and the readings they produced,
 * with one reading named; the answer is the setting beside it. No algebra at all, which is
 * what keeps this the entry tier: the skill being tested is that an inverse reads the same
 * pairing backwards.
 *
 * The named reading is never the first pair, so the answer cannot be read off the top of the
 * list by a learner who has not understood the question.
 */
export const d6_fun8_table_swap_l1: ItemTemplate = {
  template_id: "d6.fun8.table-swap.l1",
  node_id: FUN8_NODE,
  difficulty: 1,
  concept: "inverse-swaps-pairs",
  generate(rng: Rng, ctx?: GenerateContext) {
    const a = rng.int(2, 5);
    // Non-negative, so every reading in the ledger is a positive number: this is the entry
    // tier, and a needle sitting below zero is a second thing to think about.
    const b = rng.int(0, 9);
    const start = rng.int(1, 6);
    const step = rng.int(2, 4);
    const settings = [0, 1, 2, 3].map((index) => start + index * step);
    const readings = settings.map((setting) => a * setting + b);
    // Never the first pair: the answer must be found rather than read off the top.
    const target = rng.int(1, 3);
    const setting = settings[target] ?? start;
    const reading = readings[target] ?? a * start + b;
    const pairsTex = settings
      .map((value, index) => `$f(${value}) = ${readings[index]}$`)
      .join(", ");
    const ledgerTex = settings
      .map((value, index) => `setting $${value}$ returns $${readings[index]}$`)
      .join(", ");
    return {
      prompt:
        ctx?.form === "practice"
          ? `The works ledger pairs each setting of a machine's dial with the reading its output arm returns: ${ledgerTex}. One finished run shows a reading of $${reading}$ on the output arm. Which setting produced it? Enter one number.`
          : `A function $f$ takes these values: ${pairsTex}. Find $f^{-1}(${reading})$. Enter one number.`,
      answer: numericAnswer(`${setting}`),
      params: { a, b, start, step, target },
      hints: [
        "An inverse reads the same pairing backwards, so it turns a result back into the value that produced it.",
        "Find the listed result that matches the one the prompt names, then read off the value beside it.",
      ],
      worked_solution: [
        `The pairing that produced $${reading}$ is the one to find, so look down the listed results for it.`,
        `It comes from $${setting}$, since $f(${setting}) = ${reading}$.`,
        `Reading that pairing backwards gives $f^{-1}(${reading}) = ${setting}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${(params.start ?? 0) + (params.target ?? 0) * (params.step ?? 1)}`,
};

/**
 * L2a, the inverse evaluated at one value. The forward rule is a two-step machine, and the
 * question asks which input it sends to a named output, which is the whole of what `f^{-1}(c)`
 * means before any formula for `f^{-1}` exists.
 *
 * The constant runs either side of zero, so undoing the second step is an addition on half the
 * draws and a subtraction on the other half, and the answer itself may be negative.
 */
export const d6_fun8_inverse_value_l2: ItemTemplate = {
  template_id: "d6.fun8.inverse-value.l2",
  node_id: FUN8_NODE,
  difficulty: 2,
  concept: "evaluate-inverse",
  generate(rng: Rng, ctx?: GenerateContext) {
    const a = rng.int(2, 6);
    let b = rng.int(-9, 9);
    while (b === 0) {
      b = rng.int(-9, 9);
    }
    let input = rng.int(-8, 12);
    while (input === 0 || input === 1) {
      input = rng.int(-8, 12);
    }
    const output = a * input + b;
    const ruleTex = lineTex(a, b);
    const stepWord = b > 0 ? "adds" : "subtracts";
    const undoWord = b > 0 ? "subtract" : "add";
    return {
      prompt:
        ctx?.form === "practice"
          ? `A machine on the line multiplies the setting by $${a}$ and then ${stepWord} $${Math.abs(b)}$, so its rule is $f(x) = ${ruleTex}$. Its gauge reads $${output}$. Find $f^{-1}(${output})$, the setting that produced that reading. Enter one number.`
          : `For $f(x) = ${ruleTex}$, find $f^{-1}(${output})$. Enter one number.`,
      answer: numericAnswer(`${input}`),
      params: { a, b, input, output },
      hints: [
        "You are being asked which value the rule turns into the number named inside the inverse, so set the rule equal to that number.",
        `Undo the rule's steps in reverse order. It multiplies first and ${stepWord} second, so ${undoWord} on both sides first, then divide.`,
        "Put your answer back into the original rule as a check. It should return the number the prompt named.",
      ],
      worked_solution: [
        `$f^{-1}(${output})$ is the value that $f$ sends to $${output}$, so solve $${ruleTex} = ${output}$.`,
        `Undo the ${b > 0 ? "addition" : "subtraction"}: ${undoWord} $${Math.abs(b)}$ on both sides, which gives $${a}x = ${a * input}$.`,
        `Undo the multiplication: divide both sides by $${a}$, which gives $x = ${input}$.`,
        `So $f^{-1}(${output}) = ${input}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.input ?? 0}`,
};

/**
 * The `(x +/- c) / a` rules the LESSON already works: the three the slide-1 builder rotates
 * through, then the one the check asks for. Stored as `a:c:inside`, so practice never hands
 * back a rule the learner has just been walked through.
 */
const TAUGHT_RULES: ReadonlySet<string> = new Set(["2:6:1", "3:8:0", "5:9:1", "4:5:1"]);

function taughtRule(a: number, c: number, inside: number): boolean {
  return TAUGHT_RULES.has(`${a}:${c}:${inside}`);
}

/**
 * L2b, swap and solve where the WHOLE numerator sits over the bar. Clearing the denominator
 * takes the constant with it, so the inverse comes out as a linear expression in one move and
 * nothing has to be multiplied out.
 *
 * Left neutral in every form: "find the rule for the inverse" is an abstract exercise, and a
 * workshop lead-in in front of it would change nothing about what is being asked.
 */
export const d6_fun8_swap_solve_group_l2: ItemTemplate = {
  template_id: "d6.fun8.swap-solve-group.l2",
  node_id: FUN8_NODE,
  difficulty: 2,
  concept: "swap-and-solve-grouped",
  generate(rng: Rng) {
    let a = rng.int(2, 6);
    let inside = rng.int(0, 1); // 1 adds inside the numerator, 0 subtracts.
    let c = rng.int(2, 12);
    // Two rerolls in one loop. The inverse's constant is `-c` when the numerator adds and
    // `+c` when it subtracts, and mathjs factors the exact `Nx + N` case, so a plus branch
    // whose constant equals the coefficient would grade `not_simplified` against its own
    // key. Separately, this is the one practice shape that could hand back a rule the LESSON
    // already works, so the four rules taught on this node are excluded outright.
    while ((inside === 0 && c === a) || taughtRule(a, c, inside)) {
      a = rng.int(2, 6);
      inside = rng.int(0, 1);
      c = rng.int(2, 12);
    }
    const constant = inside === 1 ? -c : c;
    return {
      prompt: `Find the rule for $f^{-1}(x)$ when $f(x) = \\dfrac{x ${inside === 1 ? "+" : "-"} ${c}}{${a}}$. Write your answer as a simplified expression in $x$.`,
      answer: expressionAnswer(lineKey(a, constant), ["x"]),
      params: { a, c, inside },
      hints: [
        "Write $y = f(x)$, then swap $x$ and $y$. The swapped equation says the same pairing read the other way, and solving it for $y$ is what produces the inverse.",
        "The bar runs under the whole numerator, so multiply both sides by the denominator before touching anything else.",
        "Then move the constant across. Whatever the numerator added, the inverse subtracts, and whatever it subtracted, the inverse adds.",
      ],
      worked_solution: [
        `Write the rule with $y$ in place of $f(x)$: $y = \\dfrac{x ${inside === 1 ? "+" : "-"} ${c}}{${a}}$.`,
        `Swap $x$ and $y$: $x = \\dfrac{y ${inside === 1 ? "+" : "-"} ${c}}{${a}}$.`,
        `Multiply both sides by $${a}$: $${a}x = y ${inside === 1 ? "+" : "-"} ${c}$.`,
        `${inside === 1 ? "Subtract" : "Add"} $${c}$ ${inside === 1 ? "from" : "to"} both sides: $y = ${lineTex(a, constant)}$.`,
        `So $f^{-1}(x) = ${lineTex(a, constant)}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.a ?? 0}:${(params.inside ?? 0) === 1 ? -(params.c ?? 0) : (params.c ?? 0)}`,
};

/**
 * L3a, swap and solve where only the VARIABLE sits over the bar. The constant is outside the
 * fraction, so it has to move first and the denominator is cleared second, which means the
 * multiplication lands on both terms and the last step is a distribution. That is the step the
 * grouped shape at L2 never asks for, and it is what puts this shape a tier above it.
 */
export const d6_fun8_swap_solve_divide_l3: ItemTemplate = {
  template_id: "d6.fun8.swap-solve-divide.l3",
  node_id: FUN8_NODE,
  difficulty: 3,
  concept: "swap-and-solve-distribute",
  generate(rng: Rng) {
    const a = rng.int(2, 6);
    const outside = rng.int(0, 1); // 1 adds outside the fraction, 0 subtracts.
    // `b` starts at 2 so the inverse's constant `a * b` can never equal the coefficient `a`,
    // which is the one product mathjs would factor back out of a plus branch.
    const b = rng.int(2, 9);
    const constant = outside === 1 ? -a * b : a * b;
    const moved = outside === 1 ? "Subtract" : "Add";
    return {
      prompt: `Find the rule for $f^{-1}(x)$ when $f(x) = \\dfrac{x}{${a}} ${outside === 1 ? "+" : "-"} ${b}$. Write your answer as a simplified expression in $x$.`,
      answer: expressionAnswer(lineKey(a, constant), ["x"]),
      params: { a, b, outside },
      hints: [
        "Write $y = f(x)$ and swap $x$ and $y$, so the equation now describes the inverse and $y$ is what you are solving for.",
        "The bar sits under $y$ alone here, so the constant is not inside the fraction. Move the constant across first, then clear the division.",
        "Multiplying by the denominator reaches both terms on the other side, so multiply out rather than leaving the answer bracketed.",
      ],
      worked_solution: [
        `Write the rule with $y$ in place of $f(x)$: $y = \\dfrac{x}{${a}} ${outside === 1 ? "+" : "-"} ${b}$.`,
        `Swap $x$ and $y$: $x = \\dfrac{y}{${a}} ${outside === 1 ? "+" : "-"} ${b}$.`,
        `${moved} $${b}$ ${outside === 1 ? "from" : "to"} both sides: $x ${outside === 1 ? "-" : "+"} ${b} = \\dfrac{y}{${a}}$.`,
        `Multiply both sides by $${a}$: $y = ${a}(x ${outside === 1 ? "-" : "+"} ${b})$.`,
        `Multiply out: $y = ${lineTex(a, constant)}$.`,
        `So $f^{-1}(x) = ${lineTex(a, constant)}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.a ?? 0}:${(params.outside ?? 0) === 1 ? -(params.a ?? 0) * (params.b ?? 0) : (params.a ?? 0) * (params.b ?? 0)}`,
};

/**
 * L3b, the rule that cannot be run backwards. A squared bracket sends two inputs either side
 * of its zero to the same output, and the item asks for the second one: the concrete evidence
 * that the rule is not one to one, rather than a verdict a learner could guess.
 *
 * Asking for the twin rather than for a yes or a no is deliberate. A two-word verdict is a coin
 * flip; the twin has to be found, and finding it is the same reasoning the horizontal-line test
 * draws a picture of.
 */
export const d6_fun8_not_one_to_one_l3: ItemTemplate = {
  template_id: "d6.fun8.not-one-to-one.l3",
  node_id: FUN8_NODE,
  difficulty: 3,
  concept: "one-to-one",
  generate(rng: Rng, ctx?: GenerateContext) {
    // Never zero: a bracket of a bare `x` would make the "step the same distance either side"
    // step print `x - 0`, and the shift is the whole reason the twin is not just the negative.
    let h = rng.int(-4, 6);
    while (h === 0) {
      h = rng.int(-4, 6);
    }
    const gap = rng.int(2, 7);
    const side = rng.int(0, 1); // 1 puts the given value above the bracket's zero.
    let k = rng.int(-9, 9);
    while (k === 0) {
      k = rng.int(-9, 9);
    }
    const given = side === 1 ? h + gap : h - gap;
    const twin = side === 1 ? h - gap : h + gap;
    const output = gap * gap + k;
    const ruleTex = `(${shiftedTex(h)})^2${tailTex(k)}`;
    return {
      prompt:
        ctx?.form === "practice"
          ? `A grinding machine's rule is $f(x) = ${ruleTex}$. The dial setting $${given}$ produces a reading of $${output}$, and exactly one other setting produces $${output}$ as well, which is why this machine cannot be run backwards. Find that other setting. Enter one number.`
          : `For $f(x) = ${ruleTex}$, $f(${given}) = ${output}$. Exactly one other value has the same output, which is why $f$ is not one to one. Find that value. Enter one number.`,
      answer: numericAnswer(`${twin}`),
      params: { h, gap, side, k },
      hints: [
        "Squaring sends two different values to the same result whenever they sit the same distance either side of the value that makes the bracket zero.",
        "Find the value that makes the bracket zero, work out how far the given one sits from it, then step that same distance the other way.",
      ],
      worked_solution: [
        `The bracket is zero when $x = ${h}$, and squaring matches the two sides of that value.`,
        `The given value sits $${gap}$ ${side === 1 ? "above" : "below"} it: $${given} - ${h < 0 ? `(${h})` : h} = ${side === 1 ? gap : -gap}$.`,
        `Step $${gap}$ the other way: $${h} ${side === 1 ? "-" : "+"} ${gap} = ${twin}$.`,
        `Check it: $f(${twin}) = (${twin < 0 ? `(${twin})` : twin} ${op(-h)} ${Math.abs(h)})^2${tailTex(k)} = ${gap * gap}${tailTex(k)} = ${output}$, the same output.`,
        `The other value is $${twin}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${(params.side ?? 0) === 1 ? (params.h ?? 0) - (params.gap ?? 0) : (params.h ?? 0) + (params.gap ?? 0)}:${params.k ?? 0}`,
};

/** Every FUN.8 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const FUN8_TEMPLATES: readonly ItemTemplate[] = [
  d6_fun8_table_swap_l1,
  d6_fun8_inverse_value_l2,
  d6_fun8_swap_solve_group_l2,
  d6_fun8_swap_solve_divide_l3,
  d6_fun8_not_one_to_one_l3,
];
