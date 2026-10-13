import {
  expressionAnswer,
  type GenerateContext,
  type ItemTemplate,
  numericAnswer,
  type Rng,
  standardPolyAnswer,
} from "../../../template";

/**
 * FUN.7 practice templates: composition of functions, two automata coupled in series, so
 * one machine's output is the next machine's input. Themed for "The Gearwright's
 * Menagerie"; Industrial era.
 *
 * ## The order is the node, so the pool is built around it
 *
 * Composition does not commute, and every one of the five shapes below is chosen so that
 * running the two functions the other way round gives a DIFFERENT answer. The L1 and L2a
 * generators redraw until the two orders disagree, rather than leaving it to luck, because
 * an instance where they happen to agree rewards exactly the misreading the node exists to
 * correct. The two L3 shapes go further and are the same pair of function SHAPES composed
 * both ways: `(f \circ g)` puts a linear function inside a square and produces three terms,
 * `(g \circ f)` puts the square inside a linear function and produces two. A five-slot set
 * draws one of each, so a learner meets the demonstration inside one sitting.
 *
 * ## Theming, and where it stops
 *
 * Only L1 becomes a word problem, and only for `form === "practice"`. Two machines in a line
 * on the workshop floor is a genuine restatement of the mathematics: the prompt has to say
 * which machine the setting goes into, which is the whole question. The other four ask for
 * a value or a formula read off the circle notation, and reading that notation is the skill
 * being measured, so a workshop lead-in would be decoration over an abstract exercise and is
 * left off. The Industrial style guide's "Explicitly absent" list (reinforced concrete, the
 * cantilever, aluminium, plate glass, the curtain wall, anything self-luminous) is untouched
 * by a dial, an intake and an output arm.
 *
 * Answers are integers or fully collected polynomials, so every key grades through the v2
 * product checker, and no key carries a `*`: `${m}x + ${b}` is the spelling `d7/nodes/LF.3`
 * already ships, so juxtaposition is what the grader is handed rather than a star it would
 * have to read past.
 *
 * SEEDING: shapes seeded from *Precalculus: An Investigation of Functions* (Lippman &
 * Rasmussen, opentextbookstore `details.php?id=6`), section 1.4 "Composition of Functions",
 * whose exercise ladder runs numeric composition at a point, then composition of two
 * formulas, then a composite carrying a square. Every number here is re-derived and drawn
 * fresh; nothing is transcribed.
 */

export const FUN7_NODE = "FUN.7";

/** The shared task line for the shapes whose answer is one number. */
const NUMBER_TASK = " Enter one number.";

/** The shared task line for the shape whose answer is a LINEAR formula. */
const FORMULA_TASK = " Write it as a single simplified expression in $x$.";

/**
 * The task line for the two shapes whose answer carries a squared term.
 *
 * They are graded by `standardPolyAnswer` rather than `expressionAnswer`, because
 * `combined_polynomial` cannot express a quadratic: `hasDuplicateSymbolTermsInChain`
 * counts any two terms holding the same SYMBOL, so it reads `16x^2 - 8x - 1` as two
 * uncombined `x` terms and marks a correct answer `not_simplified`. The standard-form
 * comparator wants strictly descending degrees, so the task line says so rather than
 * leaving the learner to be marked wrong for an order nothing asked for.
 */
const POLY_TASK =
  " Multiply it out and write it as one expression in $x$, highest power first.";

/** `+ 5` / `- 3`: the operator and magnitude that follow a term. */
function tail(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** A linear body such as `3x + 2` or `5x - 1`. */
function linTex(slope: number, constant: number): string {
  return `${slope}x ${tail(constant)}`;
}

/**
 * `+ 30x` / `- 8x`: a following term that still carries its variable.
 *
 * Separate from {@link tail} because losing the `x` here is invisible to
 * `validateTemplates`, which grades an answer key against ITSELF. A middle term written
 * `- 8` instead of `- 8x` is a self-consistent key for a different polynomial, and it
 * validates green.
 */
function tailX(value: number): string {
  return `${value < 0 ? "-" : "+"} ${Math.abs(value)}x`;
}

/** A signed value with negatives parenthesized, e.g. `(-6)` or `7`. */
function sp(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/**
 * L1: the chain at a point, both functions linear. The learner has to work out the inner
 * value and carry it, which is the one move the node is built on, and nothing else.
 *
 * The redraw guard rules out two degenerate draws: an inner value that comes back equal to
 * the input (so the chain would grade the same whichever machine went first), and a pair
 * whose two orders happen to agree.
 */
export const d6_fun7_series_value_l1: ItemTemplate = {
  template_id: "d6.fun7.series-value.l1",
  node_id: FUN7_NODE,
  difficulty: 1,
  concept: "evaluate-a-chain-of-two-linear-machines",
  generate(rng: Rng, ctx?: GenerateContext) {
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;
    let n = 0;
    do {
      a = rng.int(2, 6);
      b = rng.int(-9, 9);
      c = rng.int(2, 6);
      d = rng.int(-8, 8);
      n = rng.int(1, 9);
    } while (
      b === 0 ||
      d === 0 ||
      // The inner value must actually move, or the second machine is handed the setting.
      c * n + d === n ||
      // The two orders must disagree: a(cn + d) + b against c(an + b) + d.
      a * (c * n + d) + b === c * (a * n + b) + d
    );
    const inner = c * n + d;
    const value = a * inner + b;
    const neutral = `Given $f(x) = ${linTex(a, b)}$ and $g(x) = ${linTex(c, d)}$, evaluate $(f \\circ g)(${n})$.${NUMBER_TASK}`;
    const themed = `Two automata are coupled in a line on the workshop floor. The first takes the dial setting $x$ and returns $g(x) = ${linTex(c, d)}$. The second takes whatever the first hands it and returns $f(x) = ${linTex(a, b)}$. With the dial set to $${n}$, what comes off the second machine's output arm?${NUMBER_TASK}`;
    return {
      prompt: ctx?.form === "practice" ? themed : neutral,
      answer: numericAnswer(`${value}`),
      params: { a, b, c, d, n },
      hints: [
        "Two functions in a chain run in one order only: one of them acts on the input, and the other is given whatever the first returns. Settle which one acts first before computing anything.",
        "Work out the first function's value at the given input and write it down as a single number. Feed that number, not the original input, into the second function.",
      ],
      worked_solution: [
        `The inner function acts first: $g(${n}) = ${c} \\times ${n} ${tail(d)} = ${inner}$.`,
        `The outer function is handed that value and nothing else: $f(${inner}) = ${a} \\times ${sp(inner)} ${tail(b)} = ${value}$.`,
        `$(f \\circ g)(${n}) = ${value}$.`,
      ],
    };
  },
  varietyKey: (params) => {
    const inner = (params.c ?? 0) * (params.n ?? 0) + (params.d ?? 0);
    return `${inner}:${(params.a ?? 0) * inner + (params.b ?? 0)}`;
  },
};

/**
 * L2a: the same evaluation, but the notation decides the order and one of the two functions
 * squares what it is given, so the two orders are far apart. The `order` flag serves both
 * `(f \circ g)` and `(g \circ f)`, and the hints are written so neither branch reads as the
 * dead half of a sentence.
 *
 * Left neutral in every form. The question is which function the notation puts next to the
 * input, and a workshop lead-in would answer it in prose.
 */
export const d6_fun7_order_value_l2: ItemTemplate = {
  template_id: "d6.fun7.order-value.l2",
  node_id: FUN7_NODE,
  difficulty: 2,
  concept: "read-the-order-off-the-circle-notation",
  generate(rng: Rng) {
    let order = 0;
    let a = 0;
    let b = 0;
    let k = 0;
    let n = 0;
    do {
      order = rng.int(0, 1);
      a = rng.int(2, 4);
      b = rng.int(-7, 7);
      k = rng.int(-9, 9);
      n = rng.int(-3, 4);
    } while (
      b === 0 ||
      k === 0 ||
      n === 0 ||
      // The two orders must disagree, or the item cannot measure reading the notation.
      a * (n * n + k) + b === (a * n + b) * (a * n + b) + k
    );
    const inner = order === 1 ? a * n + b : n * n + k;
    const value = order === 1 ? inner * inner + k : a * inner + b;
    const composite = order === 1 ? "(g \\circ f)" : "(f \\circ g)";
    return {
      prompt: `Given $f(x) = ${linTex(a, b)}$ and $g(x) = x^{2} ${tail(k)}$, evaluate $${composite}(${n})$.${NUMBER_TASK}`,
      answer: numericAnswer(`${value}`),
      params: { order, a, b, k, n },
      hints: [
        "Read the order off the notation rather than off the alphabet. In $(p \\circ q)(x)$ the function standing next to the input is $q$, so $q$ acts first and $p$ acts on what it returns.",
        "Work the inner function out at the given input and write it as one number. That number is the input to the outer function, and the original input is not used again.",
        "One of these two functions squares whatever it is handed, so square only the value that actually reaches it.",
      ],
      worked_solution:
        order === 1
          ? [
              `The notation puts $f$ next to the input, so $f$ acts first: $f(${n}) = ${a} \\times ${sp(n)} ${tail(b)} = ${inner}$.`,
              `Only that value reaches $g$: $g(${inner}) = ${sp(inner)}^{2} ${tail(k)} = ${value}$.`,
              `$(g \\circ f)(${n}) = ${value}$.`,
            ]
          : [
              `The notation puts $g$ next to the input, so $g$ acts first: $g(${n}) = ${sp(n)}^{2} ${tail(k)} = ${inner}$.`,
              `Only that value reaches $f$: $f(${inner}) = ${a} \\times ${sp(inner)} ${tail(b)} = ${value}$.`,
              `$(f \\circ g)(${n}) = ${value}$.`,
            ],
    };
  },
  varietyKey: (params) => `${params.order}:${params.n}:${params.a}:${params.k}`,
};

/**
 * L2b: compose two linear functions into one formula, with no number to evaluate at. The
 * substitution has to be written with brackets and then multiplied out, which is where a
 * learner who has only ever composed at a point discovers there is anything to do.
 *
 * `konst !== coeff` keeps the answer off `Nx + N`, which factors and invites a "simplified"
 * form the grader does not want.
 */
export const d6_fun7_linear_formula_l2: ItemTemplate = {
  template_id: "d6.fun7.linear-formula.l2",
  node_id: FUN7_NODE,
  difficulty: 2,
  concept: "compose-two-linear-functions-into-a-formula",
  generate(rng: Rng) {
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;
    do {
      a = rng.int(2, 6);
      b = rng.int(-9, 9);
      c = rng.int(2, 6);
      d = rng.int(-8, 8);
    } while (b === 0 || d === 0 || a * d + b === 0 || a * d + b === a * c);
    const coeff = a * c;
    const konst = a * d + b;
    return {
      prompt: `Given $f(x) = ${linTex(a, b)}$ and $g(x) = ${linTex(c, d)}$, write $(f \\circ g)(x)$.${FORMULA_TASK}`,
      answer: expressionAnswer(`${coeff}x ${tail(konst)}`, ["x"], "combined_polynomial"),
      params: { a, b, c, d },
      hints: [
        "Composing is substitution: wherever the outer function writes its input, write the whole inner function instead, brackets and all.",
        "The inner function has two terms, so nothing can be collected until the bracket has been multiplied out. Multiply the outer coefficient into both of them.",
        "Two plain numbers end up outside the variable term: the one the bracket produces and the one that was already sitting beside it. Gather those into a single constant.",
      ],
      worked_solution: [
        `The inner function goes inside the outer one: $(f \\circ g)(x) = f(${linTex(c, d)})$.`,
        `Write it wherever $f$ writes its input: $f(${linTex(c, d)}) = ${a}(${linTex(c, d)}) ${tail(b)}$.`,
        `Multiply through the bracket: $${a}(${linTex(c, d)}) = ${coeff}x ${tail(a * d)}$.`,
        `Gather the two plain numbers: $${coeff}x ${tail(a * d)} ${tail(b)} = ${coeff}x ${tail(konst)}$.`,
        `$(f \\circ g)(x) = ${coeff}x ${tail(konst)}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${(params.a ?? 0) * (params.c ?? 0)}:${(params.a ?? 0) * (params.d ?? 0) + (params.b ?? 0)}`,
};

/**
 * L3a: a linear function inside a square. `(ax + b)^2` is where the "square each term"
 * shortcut fails, so the middle term is the whole of the difficulty, and it cannot be
 * avoided: `b` is never zero.
 *
 * This is the same pair of function shapes as L3b, composed the other way round, so the two
 * L3 slots of one practice set stand next to each other as the node's own demonstration.
 */
export const d6_fun7_square_outer_l3: ItemTemplate = {
  template_id: "d6.fun7.square-outer.l3",
  node_id: FUN7_NODE,
  difficulty: 3,
  concept: "compose-a-linear-function-inside-a-square",
  generate(rng: Rng) {
    let a = 0;
    let b = 0;
    let e = 0;
    do {
      a = rng.int(2, 5);
      b = rng.int(-6, 6);
      e = rng.int(-9, 9);
    } while (b === 0 || e === 0 || b * b + e === 0);
    const lead = a * a;
    const mid = 2 * a * b;
    const konst = b * b + e;
    return {
      prompt: `Given $f(x) = x^{2} ${tail(e)}$ and $g(x) = ${linTex(a, b)}$, write $(f \\circ g)(x)$.${POLY_TASK}`,
      answer: standardPolyAnswer(`${lead}x^2 ${tailX(mid)} ${tail(konst)}`, ["x"]),
      params: { a, b, e },
      hints: [
        "The outer function squares its input, and its input is the whole inner function, so the entire bracket goes inside the square.",
        "Squaring a two-term bracket is not squaring its terms one at a time. Multiply the bracket by itself and keep the middle term that comes out of it.",
        "The outer function's own constant is added after the square, so it joins the constant the square has already left behind.",
      ],
      worked_solution: [
        `Substitute the whole inner function: $(f \\circ g)(x) = f(${linTex(a, b)}) = (${linTex(a, b)})^{2} ${tail(e)}$.`,
        `Multiply the bracket by itself: $(${linTex(a, b)})^{2} = ${lead}x^{2} ${tailX(mid)} ${tail(b * b)}$.`,
        `Add the outer function's constant: $${lead}x^{2} ${tailX(mid)} ${tail(b * b)} ${tail(e)} = ${lead}x^{2} ${tailX(mid)} ${tail(konst)}$.`,
        `$(f \\circ g)(x) = ${lead}x^{2} ${tailX(mid)} ${tail(konst)}$.`,
      ],
    };
  },
  varietyKey: (params) => {
    const a = params.a ?? 0;
    const b = params.b ?? 0;
    return `${a * a}:${2 * a * b}:${b * b + (params.e ?? 0)}`;
  },
};

/**
 * L3b: the same two function shapes as L3a, composed the other way. The square is now the
 * INNER function, so nothing is squared twice and the answer has two terms rather than
 * three. A learner who reaches for L3a's expansion here has read the notation backwards,
 * which is the miss this cell is built to expose.
 */
export const d6_fun7_square_inner_l3: ItemTemplate = {
  template_id: "d6.fun7.square-inner.l3",
  node_id: FUN7_NODE,
  difficulty: 3,
  concept: "compose-a-square-inside-a-linear-function",
  generate(rng: Rng) {
    let a = 0;
    let b = 0;
    let e = 0;
    do {
      a = rng.int(2, 6);
      b = rng.int(-9, 9);
      e = rng.int(-8, 8);
    } while (b === 0 || e === 0 || a * e + b === 0);
    const konst = a * e + b;
    return {
      prompt: `Given $f(x) = x^{2} ${tail(e)}$ and $g(x) = ${linTex(a, b)}$, write $(g \\circ f)(x)$.${POLY_TASK}`,
      answer: standardPolyAnswer(`${a}x^2 ${tail(konst)}`, ["x"]),
      params: { a, b, e },
      hints: [
        "The function standing next to the input is the one that acts first, so here it is the squaring function whose output the other one is handed.",
        "Substitute the whole of that inner function, brackets and all, wherever the outer function writes its input, then multiply the bracket out.",
        "Two plain numbers end up outside the squared term: the one the bracket produces and the one that was already sitting beside it. Gather those into a single constant.",
      ],
      worked_solution: [
        `Substitute the whole inner function: $(g \\circ f)(x) = g(x^{2} ${tail(e)}) = ${a}(x^{2} ${tail(e)}) ${tail(b)}$.`,
        `Multiply through the bracket: $${a}(x^{2} ${tail(e)}) = ${a}x^{2} ${tail(a * e)}$.`,
        `Gather the two plain numbers: $${a}x^{2} ${tail(a * e)} ${tail(b)} = ${a}x^{2} ${tail(konst)}$.`,
        `$(g \\circ f)(x) = ${a}x^{2} ${tail(konst)}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.a}:${(params.a ?? 0) * (params.e ?? 0) + (params.b ?? 0)}`,
};

/** Every FUN.7 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const FUN7_TEMPLATES: readonly ItemTemplate[] = [
  d6_fun7_series_value_l1,
  d6_fun7_order_value_l2,
  d6_fun7_linear_formula_l2,
  d6_fun7_square_outer_l3,
  d6_fun7_square_inner_l3,
];
