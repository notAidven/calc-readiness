import { type ItemTemplate, numericAnswer, type Rng } from "../../../template";

/**
 * EL.3 practice templates: a logarithm is an exponent, so every shape here asks for one
 * of the three numbers in `b^k = y` given the other two, plus the two named logarithms.
 * Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  the common logarithm of a power of ten (the exponent, with the base implied);
 *  - L2a the logarithm of an exact power of a stated base (the exponent, base written);
 *  - L2b a log equation solved for its ARGUMENT, which forces the conversion to `b^k = y`;
 *  - L3a the natural logarithm, including a reciprocal, so the exponent comes out negative;
 *  - L3b a log equation solved for its BASE, the one direction the other four never ask.
 *
 * ## Answer path
 *
 * Every shape is a plain `numericAnswer`, because every answer is one of the three numbers
 * in `b^k = y` and each is a value rather than a form. Nothing here asks the learner to
 * type a logarithm: measured against the real v2 checker, a numeric answer submitted as
 * `log10(1000)` or `log(1000)` grades `invalid_input/unsupported_syntax`, so a prompt that
 * invited a log call would fail a learner for answering it literally. Each prompt therefore
 * says "Enter one number".
 *
 * ## Why no hint in this file contains a standalone digit
 *
 * The keys here are small integers, and `hint_leaks_answer` matches a key as a standalone
 * value. A hint reading "compare it with $1$" would therefore leak the answer on precisely
 * the draws whose exponent is $1$, and pass on all the others: a leak that only appears for
 * some parameters is worse than a constant one, because the sweep that catches it depends
 * on the seed. The hints are written digit-free instead, except where a digit is part of a
 * longer numeral like $10$, which cannot match a one-digit key.
 *
 * Every template declares a `varietyKey`, keyed on the numbers that fix the instance rather
 * than on the answer alone: several shapes can reach the same small exponent by different
 * routes, and a cell that froze two of those would be asking one question twice.
 */

export const EL3_NODE = "EL.3";

/** `$b^{1} = b$, $b^{2} = ...$` up to `b^k`, the ladder a learner climbs to find `k`. */
function powerLadder(b: number, k: number): string {
  return Array.from(
    { length: k },
    (_, index) => `${b}^{${index + 1}} = ${b ** (index + 1)}`,
  )
    .map((step) => `$${step}$`)
    .join(", ");
}

/**
 * The powers of ten walked from $10^{1}$ out to $10^{k}$, in whichever direction `k` lies.
 * {@link powerLadder} cannot do this job: it counts up from exponent one, so a negative `k`
 * would give it an empty ladder and the worked solution would silently lose its middle step.
 */
function tenLadder(k: number): string {
  const steps = k > 0 ? [1, k] : [-1, k];
  const from = Math.min(...steps);
  const to = Math.max(...steps);
  const exponents =
    k > 0
      ? Array.from({ length: to - from + 1 }, (_, index) => from + index)
      : Array.from({ length: to - from + 1 }, (_, index) => to - index);
  return exponents.map((e) => `$10^{${e}} = ${10 ** e}$`).join(", ");
}

/**
 * `$2^{k} = ...$, $3^{k} = ...$` up to `$b^{k} = ...$`: the candidates tried when the BASE
 * is the unknown. This is a different ladder from {@link powerLadder}, which holds the base
 * fixed and walks the exponent; here the exponent is fixed and the base is what varies.
 */
function baseLadder(b: number, k: number): string {
  const from = Math.max(2, b - 2);
  return Array.from({ length: b - from + 1 }, (_, index) => from + index)
    .map((candidate) => `$${candidate}^{${k}} = ${candidate ** k}$`)
    .join(", ");
}

/**
 * Every `(base, exponent)` pair the reciprocal shape may draw: bases two through nine,
 * exponents two through four, capped so the denominator stays a number a learner can read
 * at a glance. Twenty pairs, which is what makes the shape wide enough to fund a walk cell
 * on top of its own retry variants (`practice-walk.ts`'s ledger); the two shapes that were
 * already here hold five and two fresh draws between them, and neither is enough alone.
 */
const RECIPROCAL_BASE_SPACE: readonly { b: number; k: number }[] = [
  2, 3, 4, 5, 6, 7, 8, 9,
].flatMap((b) => [2, 3, 4].filter((k) => b ** k <= 1000).map((k) => ({ b, k })));

/**
 * L1, the common logarithm of a power of ten. The base is not written, which is the whole
 * point of the tier: the learner has to supply base $10$ from the notation before the
 * counting is even possible.
 *
 * The exponent runs either side of zero, and both halves are needed. Nine exponents is what
 * gives the cell enough distinct instances to fill one pool slot plus a full six retry
 * variants, and the powers below one are also where the skill stops being zero-counting: a
 * learner who reads $0.001$ by counting its two visible zeros gets the wrong exponent, which
 * is exactly the check a positive-only ladder never makes.
 */
export const d8_el3_evaluate_common_l1: ItemTemplate = {
  template_id: "d8.el3.evaluate-common.l1",
  node_id: EL3_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const k = rng.pick([-3, -2, -1, 1, 2, 3, 4, 5, 6]);
    const value = 10 ** k;
    return {
      prompt: `Evaluate the common logarithm $\\log ${value}$. Enter one number.`,
      answer: numericAnswer(`${k}`),
      params: { k },
      hints: [
        "A logarithm asks for an exponent, and $\\log$ written with no base is the common logarithm, whose base is $10$. So the question is which power of $10$ produces this number.",
        // No bare digit here may equal a key, and `k` is drawn from -3..6: `validateTemplates`
        // matches a numeric key on digit boundaries, so an anchor written `$10^{0} = 1$` leaks
        // the key on the `k = 1` draw. `$10^{0}$` carries the same anchor and no standalone key.
        "Each step of the exponent moves the decimal point exactly one place, so start at $10^{0}$ and step toward the number given: every multiplication by $10$ raises the exponent by one, and every division by $10$ lowers it by one.",
      ],
      worked_solution: [
        `$\\log$ written with no base is the common logarithm, so its base is $10$.`,
        `The question is which exponent turns $10$ into $${value}$.`,
        `Walking the powers of $10$: ${tenLadder(k)}.`,
        `So $\\log ${value} = ${k}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.k ?? 0}`,
};

/**
 * L2a, the same question with the base written out. Moving off base $10$ is what makes this
 * a step up: the learner can no longer count zeros and has to climb the base's own powers.
 */
export const d8_el3_evaluate_base_l2: ItemTemplate = {
  template_id: "d8.el3.evaluate-base.l2",
  node_id: EL3_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const b = rng.pick([2, 3, 4, 5]);
    const k = rng.int(2, 4);
    const value = b ** k;
    return {
      prompt: `Evaluate $\\log_{${b}} ${value}$. Enter one number.`,
      answer: numericAnswer(`${k}`),
      params: { b, k, value },
      hints: [
        "The small number written under the $\\log$ is the base, and a logarithm hands back the exponent that turns its base into the number inside it.",
        "Multiply the base by itself, keeping a count of how many factors you have used, until you reach the number inside the logarithm.",
      ],
      worked_solution: [
        `The base is $${b}$, so the question is which exponent turns $${b}$ into $${value}$.`,
        `Climbing the powers of $${b}$: ${powerLadder(b, k)}.`,
        `The ladder reaches $${value}$ after that many factors.`,
        `So $\\log_{${b}} ${value} = ${k}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.b ?? 0}:${params.k ?? 0}`,
};

/**
 * L2b, the definition run the other way. The exponent is given and the ARGUMENT is missing,
 * so the learner cannot climb a ladder and has to convert to `b^k = y` first. This is the
 * direction that catches a learner who has memorised "a log is an exponent" as a slogan
 * without being able to use it.
 */
export const d8_el3_to_exponential_l2: ItemTemplate = {
  template_id: "d8.el3.to-exponential.l2",
  node_id: EL3_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const b = rng.pick([2, 3, 5]);
    const k = rng.int(2, 4);
    const y = b ** k;
    return {
      prompt: `If $\\log_{${b}} y = ${k}$, what is $y$? Enter one number.`,
      answer: numericAnswer(`${y}`),
      params: { b, k, y },
      hints: [
        "Read the equation as a sentence about an exponent: it states which power the base has to be raised to in order to reach $y$.",
        "Rewrite it in exponential form. The base stays the base, the number the logarithm equals becomes the exponent, and $y$ is whatever that power evaluates to.",
      ],
      worked_solution: [
        `A logarithm equation names an exponent, so $\\log_{${b}} y = ${k}$ says $${b}^{${k}} = y$.`,
        `Evaluate that power: $${b}^{${k}} = ${y}$.`,
        `So $y = ${y}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.b ?? 0}:${params.k ?? 0}`,
};

/**
 * L2c, a logarithm whose argument sits BELOW one, at a base that is written out.
 *
 * The mini-lesson's fourth slide teaches this outright — *"arguments below $1$ bring out
 * negative values"* — and until this shape existed the node exercised it only at the two
 * bases whose logarithm is written with no base at all: {@link d8_el3_evaluate_common_l1}
 * reaches it at ten and {@link d8_el3_evaluate_natural_l3} at $e$. Both of those hand the
 * learner a shortcut the general case does not have. Counting the zeros in $0.001$ works
 * only in base ten, and $\ln \frac{1}{e^{4}}$ prints the power of $e$ on the page, so the
 * only step left is the sign. At a written base neither shortcut is available: the
 * denominator has to be recognised as a power of the base first, and the sign flipped
 * second, which is why this is the tier's third shape rather than a fourth spelling of its
 * first.
 *
 * The exponent starts at two rather than one so the recognition is a genuine climb. At
 * $k = 1$ the denominator IS the base and the ladder has a single rung, which asks nothing
 * the L1 shape has not already asked.
 */
export const d8_el3_reciprocal_base_l2: ItemTemplate = {
  template_id: "d8.el3.reciprocal-base.l2",
  node_id: EL3_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    // Drawn as a pair from the enumerated space rather than as two independent numbers,
    // because the cap couples them: it admits `k` up to four at the small bases and only
    // up to three from six upwards. Rerolling a capped pair would bias the draw toward the
    // bases whose whole range survives.
    const { b, k } = rng.pick(RECIPROCAL_BASE_SPACE);
    const value = b ** k;
    return {
      prompt: `Evaluate $\\log_{${b}} \\dfrac{1}{${value}}$. Enter one number.`,
      answer: numericAnswer(`-${k}`),
      params: { b, k, value },
      hints: [
        // Digit-free, and deliberately: every key here is a small negative integer and
        // `hint_leaks_answer` matches one as a standalone value, so a hint naming an
        // exponent in numerals would leak on exactly the draws that used it.
        "A reciprocal is the same power carried with a negative exponent, so $\\dfrac{1}{b^{n}}$ and $b^{-n}$ are two spellings of one number.",
        "So take the denominator on its own first and find which power of the base reaches it, by multiplying the base and keeping count of the factors. Moving that power into the reciprocal is what decides the sign of the exponent the logarithm hands back.",
      ],
      worked_solution: [
        `The base is $${b}$, so the logarithm is asking which exponent turns $${b}$ into $\\dfrac{1}{${value}}$.`,
        `Read the denominator as a power of the base first: ${powerLadder(b, k)}.`,
        `A reciprocal is that power with a negative exponent: $\\dfrac{1}{${value}} = ${b}^{-${k}}$.`,
        `Reading the exponent off that power gives $\\log_{${b}} \\dfrac{1}{${value}} = -${k}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.b ?? 0}:${params.k ?? 0}`,
};

/**
 * L3a, the natural logarithm, with the exponent often negative. Two instances of one idea:
 * `ln` undoes a power of $e$, and a power of $e$ in a denominator is that power with a
 * negative exponent. The hints are worded to cover both draws identically, because a hint
 * that arrived only for the reciprocal draw would announce which draw the learner had (R13).
 */
export const d8_el3_evaluate_natural_l3: ItemTemplate = {
  template_id: "d8.el3.evaluate-natural.l3",
  node_id: EL3_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const reciprocal = rng.int(0, 1);
    const n = rng.int(2, 5);
    const written = rng.pick([-4, -3, -2, 5, 6, 7]);
    const exponent = reciprocal === 1 ? -n : written;
    const prompt =
      reciprocal === 1
        ? `Evaluate $\\ln \\dfrac{1}{e^{${n}}}$. Enter one number.`
        : `Evaluate $\\ln e^{${written}}$. Enter one number.`;
    return {
      prompt,
      answer: numericAnswer(`${exponent}`),
      params: { reciprocal, n, written, exponent },
      hints: [
        "The natural logarithm is the logarithm whose base is $e$, so applied to a power of $e$ it hands straight back the exponent it finds.",
        "If the power of $e$ sits in a denominator, rewrite the reciprocal as the same power with a negative exponent, and then read that exponent off.",
      ],
      worked_solution:
        reciprocal === 1
          ? [
              `The natural logarithm has base $e$, so it returns the exponent on $e$.`,
              `A reciprocal is a negative power: $\\dfrac{1}{e^{${n}}} = e^{-${n}}$.`,
              `Reading the exponent off that power gives $\\ln e^{-${n}} = ${exponent}$.`,
            ]
          : [
              `The natural logarithm has base $e$, so it returns the exponent on $e$.`,
              `Here the power of $e$ is already written, with exponent $${written}$.`,
              `So $\\ln e^{${written}} = ${exponent}$.`,
            ],
    };
  },
  varietyKey: (params) => `${params.reciprocal ?? 0}:${params.exponent ?? 0}`,
};

/**
 * L3b, solve for the BASE. The other four shapes always hand the base over, so this is the
 * one place the learner has to treat it as the unknown, and it cannot be answered by
 * climbing a ladder whose bottom rung is unknown.
 */
export const d8_el3_missing_base_l3: ItemTemplate = {
  template_id: "d8.el3.missing-base.l3",
  node_id: EL3_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const b = rng.pick([2, 3, 4, 5, 6]);
    const k = rng.int(2, 3);
    const value = b ** k;
    return {
      prompt: `For which base $b$ is $\\log_{b} ${value} = ${k}$? Enter one number.`,
      answer: numericAnswer(`${b}`),
      params: { b, k, value },
      hints: [
        "Convert the statement to exponential form first. It says the unknown base, raised to the exponent given on the right, equals the number inside the logarithm.",
        "So you are looking for a number that reaches the number inside when it is multiplied by itself that many times. Working up through the small whole numbers settles it quickly.",
      ],
      worked_solution: [
        `In exponential form the statement says $b^{${k}} = ${value}$.`,
        `So $b$ is the number that gives $${value}$ when it is multiplied by itself $${k}$ times.`,
        `Trying candidate bases at that same exponent: ${baseLadder(b, k)}.`,
        `So $b = ${b}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.b ?? 0}:${params.k ?? 0}`,
};

/** EL.3's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const EL3_TEMPLATES: readonly ItemTemplate[] = [
  d8_el3_evaluate_common_l1,
  d8_el3_evaluate_base_l2,
  d8_el3_to_exponential_l2,
  d8_el3_evaluate_natural_l3,
  d8_el3_missing_base_l3,
];

/**
 * A third shape sharing the L2 cell, held separately from {@link EL3_TEMPLATES} for two
 * reasons that are both about not disturbing anything already frozen.
 *
 * The five-slot mix gives L2 two slots, and `buildPool` fills them round-robin from the
 * first two templates in the cell. Keeping this one out of `EL3_TEMPLATES` and appending it
 * at the END of `D8_PRACTICE_TEMPLATES` therefore leaves both of those slots on the shapes
 * they were frozen from, and leaves every LATER template's retry variants on their own
 * seeds: `buildVariants` walks the template list on one running counter, so a template
 * inserted in the middle of it re-seeds every variant behind it. `D1_EXTRA_PRACTICE_TEMPLATES`
 * is the same arrangement for the same reason.
 *
 * A learner still meets it. `buildRandomizedD8PracticeSet` draws each slot from every
 * registered instance for the cell and spreads across SHAPES before repeating one, so the
 * third shape widens what an L2 slot can serve without moving what it did serve.
 */
export const EL3_EXTRA_TEMPLATES: readonly ItemTemplate[] = [d8_el3_reciprocal_base_l2];
