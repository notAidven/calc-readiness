import {
  type GenerateContext,
  type ItemTemplate,
  numericAnswer,
  type Rng,
} from "../../../template";
import { latexVarTerm } from "../../../promptFormat";

/**
 * FUN.1 practice templates: function notation and evaluation, and deciding whether a
 * relation is a function at all.
 *
 * ## Where the shapes come from
 *
 * Seeded from Section 1.1 ("Functions and Function Notation") of *Precalculus: An
 * Investigation of Functions*, Lippman & Rasmussen, 2nd ed., listed on
 * opentextbookstore.com and licensed CC BY-SA. Its exercise set supplies five shapes, and
 * each is diversified here rather than transcribed: the numbers are re-derived by
 * `generate()` and every key is computed by real arithmetic.
 *
 *  - Ex 21-34, "evaluate f at -2, -1, 0, 1, 2" -> the L1 constant-first rule and the L2
 *    quadratic at a NEGATIVE input.
 *  - Ex 7-10, "select all of the following tables which represent y as a function of x" ->
 *    the L2 count over four logs. The textbook asks which; this asks how many, so the
 *    answer is a number a checker can grade rather than a multi-select.
 *  - Ex 37-38, "let f(t) = 3t + 5: evaluate f(0), solve f(t) = 0" -> the L3 solve for the
 *    input. The target output is drawn away from zero, so undoing both operations is real.
 *  - Ex 35-36, "suppose f(x) = x^2 + 8x - 4: compute f(-1) + f(1) and f(-1) - f(1)" -> the
 *    L3 pair of opposite inputs, generalized off the textbook's fixed input of one.
 *
 * ## Distinct from the frozen FUN.1 ASSESSMENT item
 *
 * `product/nodes/FUN.1/index.ts` owns two shapes already: `prod.fun-1.l2`, which evaluates
 * `a*x + b` at a POSITIVE input, and a golden fixture asking yes or no about a relation.
 * Neither is reproduced, deliberately:
 *
 *  - The L1 rule here is CONSTANT FIRST with the product taken away from it, and the L2
 *    evaluate is a quadratic at a negative input, so no template here is `a*x + b` at a
 *    positive input with new numbers.
 *  - Nothing here answers yes or no. The relation shape asks HOW MANY of four logs record
 *    a function, which cannot be got right by a coin flip and which forces the learner to
 *    read logs that pass as well as logs that fail.
 *
 * ## Era, and how far the theming goes
 *
 * FUN.1 is an INDUSTRIAL era node (`packages/skill-graph/src/eras.ts`), so the framing is
 * the machine hall of `docs/superpowers/specs/eras/era-07-industrial/style-guide.md`: line
 * shafting overhead, a governor arm set by a dial, an automaton answering one setting with
 * one motion. Nothing on that era's "Explicitly absent" list (reinforced concrete, the
 * cantilever, aluminium, plate glass, the curtain wall, anything that glows of its own
 * accord) appears in any prompt, and no prompt leans on a building NAME.
 *
 * Only two of the five are word problems, and only where the story changes what is being
 * asked. `d6.fun1.evaluate-rule.l1` reads a machine's travel off its dial setting, which is
 * what an input and an output ARE on this node; `d6.fun1.log-function-count.l2` reads
 * settings against motions, which is what makes "one output per input" concrete. The other
 * three are abstract evaluation and solving, which do not word-problem without decoration,
 * so they stay neutral. Theming is applied only when `ctx.form === "practice"`, and no
 * `answer`, `params`, `difficulty` or grader spec depends on the wording.
 *
 * ## Answer shapes
 *
 * Every key is a plain integer under `numericAnswer`, so every field advertises "a single
 * number" and none of them needs a notation key row: no key here carries a bar, a caret, a
 * root, absolute-value bars or a load-bearing star.
 */

export const FUN1_NODE = "FUN.1";

/* ------------------------------------------------------------------ shared helpers */

/** Function names, paired by index with {@link VARS} so a learner never reads only `f(x)`. */
const NAMES = ["f", "g", "h", "p"] as const;

/** The variable each name takes, so the rule and the notation agree. */
const VARS = ["x", "t", "n", "s"] as const;

/** `+ 7` / `- 7`: the operator and the magnitude of a signed constant, spaced for KaTeX. */
function signTerm(value: number): string {
  return `${value < 0 ? "-" : "+"} ${Math.abs(value)}`;
}

/** A coefficient as it is written in front of a term: `1` is dropped, everything else is not. */
function coefficient(value: number): string {
  return value === 1 ? "" : `${value}`;
}

/**
 * `+ 3n` / `- n`: a signed term that CARRIES the variable, so a magnitude of one goes unwritten
 * the way {@link coefficient} already leaves it unwritten on the squared term. Without this the
 * one printed rule spells the convention both ways, as `h(n) = n^{2} - 1n - 8` did.
 */
function signVarTerm(value: number, variable: string): string {
  return `${value < 0 ? "-" : "+"} ${latexVarTerm(Math.abs(value), variable)}`;
}

/** A signed value as a term to be SUBTRACTED, bracketed when it is itself negative. */
function subtrahend(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/* ---------------------------------------------------------------------------- L1 */

/**
 * L1, one reading off one rule: substitute a dial setting into `b - a*v`.
 *
 * The rule is CONSTANT FIRST so the subtraction has a direction to get wrong, which is the
 * one place a first evaluation usually goes astray, and it keeps this shape clear of the
 * frozen assessment item's `a*x + b`.
 *
 * `b` is drawn ABOVE `a * k`, so the reading is always a positive number of notches. That
 * guard belongs to the mathematics rather than to the story: it is applied in every form,
 * so the neutral and the themed prompt ask for the identical value.
 */
export const d6_fun1_evaluate_rule_l1: ItemTemplate = {
  template_id: "d6.fun1.evaluate-rule.l1",
  node_id: FUN1_NODE,
  difficulty: 1,
  generate(rng: Rng, ctx?: GenerateContext) {
    const nameIndex = rng.int(0, 3);
    const a = rng.int(2, 7);
    const k = rng.int(2, 9);
    const b = a * k + rng.int(1, 25);
    const name = NAMES[nameIndex] as string;
    const v = VARS[nameIndex] as string;
    const value = b - a * k;
    const rule = `${name}(${v}) = ${b} - ${a}${v}`;
    const neutral = `The function $${name}$ is given by $${rule}$. Find $${name}(${k})$. Enter one number.`;
    const themed = `A governor arm on the mill floor is set by a dial, and the travel it allows in notches at dial setting $${v}$ is given by $${rule}$. Find $${name}(${k})$, the travel at dial setting $${k}$. Enter one number.`;
    return {
      prompt: ctx?.form === "practice" ? themed : neutral,
      answer: numericAnswer(`${value}`),
      params: { nameIndex, a, b, k },
      hints: [
        "The number inside the brackets is the input the rule is being asked about, so write it in place of the variable everywhere the variable appears.",
        "Settle the multiplication before the subtraction, and keep the subtraction the way the rule writes it: the product is taken away from the constant, not the other way round.",
      ],
      worked_solution: [
        `$${name}(${k})$ asks what the rule returns when the input is $${k}$, so replace every $${v}$ with $${k}$: $${name}(${k}) = ${b} - ${a}(${k})$.`,
        `Multiplication is settled before subtraction: $${a} \\times ${k} = ${a * k}$, which leaves $${b} - ${a * k}$.`,
        `$${b} - ${a * k} = ${value}$, so $${name}(${k}) = ${value}$.`,
      ],
    };
  },
  // Keyed on the READING, so a cell never freezes two machines that answer the same. The
  // `r:` tag keeps it clear of the other L1 shapes' keys if this cell ever gains one.
  varietyKey: (params) => `r:${(params.b ?? 0) - (params.a ?? 0) * (params.k ?? 0)}`,
};

/* ---------------------------------------------------------------------------- L2 */

/**
 * L2a, a quadratic rule evaluated at a NEGATIVE input.
 *
 * Two things are being tested and they pull opposite ways: a negative squared comes out
 * positive, while the term carrying a single variable comes out negative. A learner who
 * substitutes without brackets loses one of the two, which is why the middle coefficient is
 * always positive here: the sign of that term then depends entirely on the input.
 */
export const d6_fun1_evaluate_negative_l2: ItemTemplate = {
  template_id: "d6.fun1.evaluate-negative.l2",
  node_id: FUN1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    let nameIndex = 0;
    let b = 0;
    let c = 0;
    let k = 0;
    let value = 0;
    do {
      nameIndex = rng.int(0, 3);
      b = rng.int(2, 9);
      c = rng.int(-9, 9);
      k = rng.int(2, 6);
      value = k * k - b * k + c;
      // A constant of zero would drop a term out of the rule as printed, and a value of
      // zero makes the last step read as though nothing was added up.
    } while (c === 0 || value === 0);
    const name = NAMES[nameIndex] as string;
    const v = VARS[nameIndex] as string;
    const rule = `${name}(${v}) = ${v}^{2} ${signTerm(b)}${v} ${signTerm(c)}`;
    return {
      prompt: `The function $${name}$ is given by $${rule}$. Find $${name}(-${k})$. Enter one number.`,
      answer: numericAnswer(`${value}`),
      params: { nameIndex, b, c, k },
      hints: [
        "A negative input is substituted in brackets, so every place the variable stands takes the whole negative number, its sign included.",
        "A negative number squared comes out positive, while the term carrying a single variable comes out negative. Work those two terms out separately, then add the constant as it already stands.",
      ],
      worked_solution: [
        `$${name}(-${k})$ replaces every $${v}$ with $(-${k})$, brackets and all: $${name}(-${k}) = (-${k})^{2} ${signTerm(b)}(-${k}) ${signTerm(c)}$.`,
        `A negative squared is positive, so $(-${k})^{2} = ${k * k}$, and the variable term is $${b} \\times (-${k}) = ${-b * k}$.`,
        `Adding the three parts: $${k * k} ${signTerm(-b * k)} ${signTerm(c)} = ${value}$, so $${name}(-${k}) = ${value}$.`,
      ],
    };
  },
  // Keyed on the OUTPUT, tagged so it cannot collide with the count shape sharing this
  // cell: a mask of 3 and an output of 3 are different facts about different questions.
  varietyKey: (params) =>
    `v:${(params.k ?? 0) ** 2 - (params.b ?? 0) * (params.k ?? 0) + (params.c ?? 0)}`,
};

/** The settings a log may record. Small whole numbers, so the reading stays about pairing. */
const SETTINGS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** The motions a log may record, kept clear of the settings so the two columns never blur. */
const MOTIONS: readonly number[] = [3, 5, 6, 7, 9, 10, 12, 14, 15, 18];

/** The four logs, named as the prompt names them. */
const LOG_LABELS: readonly string[] = ["A", "B", "C", "D"];

/** One drawn log: its pairs, whether it is a function, and what breaks it when it is not. */
interface DrawnLog {
  pairs: readonly (readonly [number, number])[];
  isFunction: boolean;
  /** The setting recorded twice, on a log that fails. Zero on one that passes. */
  repeated: number;
  /** The two different motions recorded against it. Both zero on one that passes. */
  clash: readonly [number, number];
}

/** `count` distinct members of `pool`, drawn without replacement. */
function drawDistinct(rng: Rng, pool: readonly number[], count: number): number[] {
  const rest = [...pool];
  const taken: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const [value] = rest.splice(rng.int(0, rest.length - 1), 1);
    taken.push(value as number);
  }
  return taken;
}

/**
 * One log of three pairs, built to pass or to fail the one-output-per-input rule.
 *
 * Half the passing logs repeat an OUTPUT, and that is the whole reason this shape is worth
 * asking: a learner who scans for any repeated number rather than a repeated INPUT calls
 * those wrong, and a learner who has understood the rule does not.
 */
function buildLog(rng: Rng, isFunction: boolean): DrawnLog {
  const motions = drawDistinct(rng, MOTIONS, 3);
  const first = motions[0] as number;
  const second = motions[1] as number;
  const third = motions[2] as number;
  if (isFunction) {
    const settings = drawDistinct(rng, SETTINGS, 3);
    const shareOutput = rng.int(0, 1) === 1;
    const outputs = shareOutput ? [first, second, first] : [first, second, third];
    return {
      pairs: settings.map((setting, index) => [setting, outputs[index] as number] as const),
      isFunction: true,
      repeated: 0,
      clash: [0, 0],
    };
  }
  const settings = drawDistinct(rng, SETTINGS, 2);
  const repeated = settings[0] as number;
  const other = settings[1] as number;
  return {
    // The clashing pair sits at the two ends, so the repeat is never two adjacent rows.
    pairs: [
      [repeated, first],
      [other, third],
      [repeated, second],
    ],
    isFunction: false,
    repeated,
    clash: [first, second],
  };
}

/**
 * Where each failing log breaks, recorded so the reveal figure can point at it.
 *
 * The pairs themselves are drawn from the rng and gone by the time a figure renders, so a
 * figure reading only `count` and `mask` can say that a log is not a function and cannot say
 * WHICH of its three rows makes it one. These three numbers per log are the whole violation:
 * the setting logged twice, and the two different motions recorded against it. A log that
 * passes records zeroes, which is outside `SETTINGS` and `MOTIONS` and so cannot be mistaken
 * for a real row.
 */
function violationParams(logs: readonly DrawnLog[]): Record<string, number> {
  const recorded: Record<string, number> = {};
  logs.forEach((log, index) => {
    recorded[`rep${index}`] = log.repeated;
    recorded[`one${index}`] = log.clash[0];
    recorded[`two${index}`] = log.clash[1];
  });
  return recorded;
}

/** A log as a KaTeX set of ordered pairs. */
function setTex(pairs: readonly (readonly [number, number])[]): string {
  return `\\{${pairs.map(([input, output]) => `(${input},\\, ${output})`).join(",\\, ")}\\}`;
}

/** How many of the four logs a mask marks as functions. */
function markedCount(mask: number): number {
  return [0, 1, 2, 3].filter((bit) => (mask & (1 << bit)) !== 0).length;
}

/** Every arrangement of four logs holding at least one function and at least one failure. */
const MIXED_MASKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/** The same sentence with its first letter capitalized. */
function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * L2b, how many of four logs record a function.
 *
 * A count rather than a yes or no, so the answer cannot be guessed and so every instance
 * puts logs that pass beside logs that fail. Every board holds at least one of each, which
 * is what stops the shape degenerating into "find the repeat".
 */
export const d6_fun1_log_function_count_l2: ItemTemplate = {
  template_id: "d6.fun1.log-function-count.l2",
  node_id: FUN1_NODE,
  difficulty: 2,
  generate(rng: Rng, ctx?: GenerateContext) {
    const count = rng.int(1, 3);
    const mask = rng.pick(MIXED_MASKS.filter((option) => markedCount(option) === count));
    const logs = [0, 1, 2, 3].map((bit) => buildLog(rng, (mask & (1 << bit)) !== 0));
    const themed = ctx?.form === "practice";
    const noun = themed ? "log" : "relation";
    const inputWord = themed ? "setting" : "input";
    const outputWord = themed ? "motion" : "output";
    const verb = themed ? "records" : "is";
    const items = logs.map(
      (log, index) => `${noun} ${LOG_LABELS[index]} ${verb} $${setTex(log.pairs)}$`,
    );
    const listed = capitalized(`${items[0]}, ${items[1]}, ${items[2]}, and ${items[3]}.`);
    const question = `In how many of the four ${noun}s is the ${outputWord} a function of the ${inputWord}? Enter one number.`;
    const opening = themed
      ? "Four automata on the mill floor each keep a log of dial setting and the motion it produced."
      : "Four relations are given as sets of ordered pairs.";
    return {
      prompt: `${opening} ${listed} ${question}`,
      answer: numericAnswer(`${count}`),
      params: { count, mask, ...violationParams(logs) },
      hints: [
        `Each pair records one ${inputWord} and the ${outputWord} that came with it, so read the first number of every pair as the input and the second as the output.`,
        `A ${noun} fails only when one ${inputWord} appears twice against two different ${outputWord}s. The same ${outputWord} turning up under two different ${inputWord}s is allowed, so compare the ${inputWord}s first and only then look at what sits beside a repeated one.`,
      ],
      worked_solution: [
        ...logs.map((log, index) =>
          log.isFunction
            ? `${capitalized(noun)} ${LOG_LABELS[index]} lists the ${inputWord}s $${log.pairs.map((pair) => pair[0]).join("$, $")}$, all different, so each one carries exactly one ${outputWord} and it is a function.`
            : `${capitalized(noun)} ${LOG_LABELS[index]} lists the ${inputWord} $${log.repeated}$ twice, once against $${log.clash[0]}$ and once against $${log.clash[1]}$, so one ${inputWord} carries two different ${outputWord}s and it is not a function.`,
        ),
        `Counting the ones that pass gives $${count}$ of the four, so the answer is $${count}$.`,
      ],
    };
  },
  // Keyed on WHICH logs pass rather than on how many, because the count has only three
  // values and this template owes six distinct retry variants. Tagged so a mask cannot
  // collide with the output of the evaluate shape sharing this cell.
  varietyKey: (params) => `m:${params.mask}`,
};

/* ---------------------------------------------------------------------------- L3 */

/**
 * L3a, the notation run backwards: the output is given and the input is missing.
 *
 * The target output is whatever the rule returns at a drawn INPUT, so the answer is always a
 * whole number and both operations always have to be undone: the constant is never zero, so
 * there is always something on the outside, and the input is never zero, so it is never the
 * number a learner reaches for without solving. The input may be negative, which is where a
 * learner who guesses rather than solves comes unstuck.
 */
export const d6_fun1_solve_setting_l3: ItemTemplate = {
  template_id: "d6.fun1.solve-setting.l3",
  node_id: FUN1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let nameIndex = 0;
    let a = 0;
    let b = 0;
    let input = 0;
    do {
      nameIndex = rng.int(0, 3);
      a = rng.int(2, 9);
      b = rng.int(-20, 20);
      input = rng.int(-9, 9);
      // A zero constant would leave nothing to undo on the outside, and a zero input would
      // make the answer the one number a learner reaches for without solving anything.
    } while (b === 0 || input === 0);
    const name = NAMES[nameIndex] as string;
    const v = VARS[nameIndex] as string;
    const output = a * input + b;
    const rule = `${name}(${v}) = ${a}${v} ${signTerm(b)}`;
    return {
      prompt: `The function $${name}$ is given by $${rule}$. Find the value of $${v}$ for which $${name}(${v}) = ${output}$. Enter one number.`,
      answer: numericAnswer(`${input}`),
      params: { nameIndex, a, b, input },
      hints: [
        "This runs the notation the other way round: the output is given and the input is what is missing. Write the rule equal to that output first, so there is an equation to undo.",
        "Undo the addition or subtraction on the outside before undoing the multiplication by the coefficient, then check your value by putting it back through the rule.",
      ],
      worked_solution: [
        `$${name}(${v}) = ${output}$ says the rule returns $${output}$, so set the rule equal to it: $${a}${v} ${signTerm(b)} = ${output}$.`,
        b > 0
          ? `Take $${b}$ from both sides: $${a}${v} = ${output - b}$.`
          : `Add $${-b}$ to both sides: $${a}${v} = ${output - b}$.`,
        `Divide both sides by $${a}$: $${v} = ${input}$.`,
        `Check it back through the rule: $${a}(${input}) ${signTerm(b)} = ${output}$, so the input is $${input}$.`,
      ],
    };
  },
  // Keyed on the INPUT, which is the answer, so the cell never holds two questions a
  // learner could answer with the same number.
  varietyKey: (params) => `i:${params.input}`,
};

/**
 * L3b, two outputs from one rule at opposite inputs, combined.
 *
 * Seeded from the textbook's `f(-1) + f(1)` and `f(-1) - f(1)`, with the input generalized
 * off one so the squaring is real work. The `op` flag rotates the combination, and the
 * middle coefficient takes either sign, so neither the shape of the arithmetic nor the sign
 * of the answer can be read off the question.
 */
export const d6_fun1_opposite_inputs_l3: ItemTemplate = {
  template_id: "d6.fun1.opposite-inputs.l3",
  node_id: FUN1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let nameIndex = 0;
    let a = 0;
    let b = 0;
    let c = 0;
    let k = 0;
    let op = 0;
    let atNegative = 0;
    let atPositive = 0;
    let value = 0;
    do {
      nameIndex = rng.int(0, 3);
      a = rng.int(1, 4);
      b = rng.int(-9, 9);
      c = rng.int(-9, 9);
      k = rng.int(2, 5);
      op = rng.int(0, 1);
      atNegative = a * k * k - b * k + c;
      atPositive = a * k * k + b * k + c;
      value = op === 0 ? atNegative + atPositive : atNegative - atPositive;
      // Either coefficient at zero drops a term out of the printed rule, and an output or a
      // total of zero makes one of the steps read as though no arithmetic happened.
    } while (b === 0 || c === 0 || atNegative === 0 || atPositive === 0 || value === 0);
    const name = NAMES[nameIndex] as string;
    const v = VARS[nameIndex] as string;
    const lead = coefficient(a);
    const rule = `${name}(${v}) = ${lead}${v}^{2} ${signVarTerm(b, v)} ${signTerm(c)}`;
    const sign = op === 0 ? "+" : "-";
    const combined = `${atNegative} ${sign} ${subtrahend(atPositive)}`;
    return {
      prompt: `The function $${name}$ is given by $${rule}$. Compute $${name}(-${k}) ${sign} ${name}(${k})$. Enter one number.`,
      answer: numericAnswer(`${value}`),
      params: { nameIndex, a, b, c, k, op },
      hints: [
        "Two separate outputs are wanted, so work each one out on its own before combining them. A rule is applied to whatever sits inside its brackets, one input at a time.",
        "Put each input in brackets as you substitute, so the squaring and the sign both land where they should, then combine the two results in the order the prompt writes them.",
      ],
      worked_solution: [
        `Substitute the first input, brackets and all: $${name}(-${k}) = ${lead}(-${k})^{2} ${signTerm(b)}(-${k}) ${signTerm(c)}$.`,
        `A negative squared is positive, so that first output comes to $${atNegative}$.`,
        `Now the second input: $${name}(${k}) = ${lead}(${k})^{2} ${signTerm(b)}(${k}) ${signTerm(c)}$, which comes to $${atPositive}$.`,
        `Combine them in the order the prompt writes them: $${combined} = ${value}$, so the value is $${value}$.`,
      ],
    };
  },
  // Keyed on the TOTAL, recomputed from the params rather than stored, so two draws that
  // combine to the same number never share a cell.
  varietyKey: (params) => {
    const a = params.a ?? 0;
    const b = params.b ?? 0;
    const c = params.c ?? 0;
    const k = params.k ?? 0;
    const atNegative = a * k * k - b * k + c;
    const atPositive = a * k * k + b * k + c;
    return `t:${params.op === 0 ? atNegative + atPositive : atNegative - atPositive}`;
  },
};

/** Every FUN.1 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const FUN1_TEMPLATES: readonly ItemTemplate[] = [
  d6_fun1_evaluate_rule_l1,
  d6_fun1_evaluate_negative_l2,
  d6_fun1_log_function_count_l2,
  d6_fun1_solve_setting_l3,
  d6_fun1_opposite_inputs_l3,
];
