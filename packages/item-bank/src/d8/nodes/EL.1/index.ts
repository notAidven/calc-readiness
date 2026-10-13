import { latexDollarInt } from "../../../promptFormat";
import {
  type ItemTemplate,
  multipleChoiceAnswer,
  numericAnswer,
  precisionAnswer,
  type Rng,
} from "../../../template";

/**
 * EL.1 practice templates: evaluate an exponential model, including the base $e$ one.
 * Five problem shapes across the locked 1xL1 / 2xL2 / 2xL3 mix, escalating along ONE
 * axis, how the growth factor reaches the learner:
 *
 *  - L1  the factor is stated as a whole number ("multiplied by 3 every hour");
 *  - L2a the factor is not stated at all and has to be recovered from three readings;
 *  - L2b the factor is shown inside the function and only its DIRECTION is asked for;
 *  - L3a the factor is hidden behind a percent, so it has to be built as `1 + r/100`;
 *  - L3b the factor is continuous, so the model is `P * e^(r*t)`.
 *
 * ## Answer paths, and why base `e` is a decimal
 *
 * Three graders, all cleared for this node. A count or a remaining amount is a plain
 * `numericAnswer`; the direction question is a one-word `multipleChoiceAnswer`; and both
 * L3 shapes are a `precisionAnswer` at two decimal places.
 *
 * The L3 shapes are decimals rather than exact expressions because the checker has no `e`
 * symbol binding the way it has one for `pi`: measured against the real v2 checker,
 * `1000*e^(0.15)` grades `wrong_representation` against a `decimal` spec, so a base-$e$
 * answer has to arrive as a rounded number and the prompt has to say so. Two things make
 * that fair rather than fussy. Precision is a FLOOR, so a learner who does not round is
 * still correct (`1161.8342` and the full float both grade `correct` against a `1161.83`
 * key), and every draw is rerolled until its exact value sits clear of the half-cent line,
 * so nobody loses a mark to a rounding convention. A currency symbol and comma grouping
 * are both rejected as `wrong_representation`, which is why the L3b prompt asks in as many
 * words for the number alone.
 *
 * This pool never touches the frozen EL.1 product ASSESSMENT item (`prod.el-1.l2`): that
 * one is annually compounded interest, and the two shapes here that could have collided
 * with it deliberately do not. L3a is a mass in grams rather than money, and L3b is
 * continuous rather than annual compounding, over a wider principal range.
 *
 * Every template declares a `varietyKey` over its answer so a cell never freezes two
 * items that come out at the same value. The classify shape is the exception the answer
 * space forces: with only two possible words its key is the verdict PLUS the base, which
 * is strictly finer than the verdict alone.
 */

export const EL1_NODE = "EL.1";

/**
 * True when rounding `exact` to the cent is unambiguous, i.e. its exact value does not sit
 * within a fifth of a cent of the half-cent line. A draw that fails this is rerolled: a
 * value landing on the boundary is the one case where a learner rounding correctly by a
 * different convention (half-up versus half-even) types a different number and is marked
 * wrong for it.
 */
function roundsCleanly(exact: number): boolean {
  const scaled = Math.abs(exact) * 100;
  return Math.abs(scaled - Math.floor(scaled) - 0.5) >= 0.2;
}

/**
 * L1, evaluate a stated whole-number factor. The starting amount and the factor are both
 * handed over, so the only thing being tested is that the number of steps becomes the
 * EXPONENT rather than another multiplier, which is the mistake this tier exists to catch.
 */
export const d8_el1_evaluate_l1: ItemTemplate = {
  template_id: "d8.el1.evaluate.l1",
  node_id: EL1_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const a = rng.int(2, 9);
    const b = rng.pick([2, 3, 4]);
    const x = rng.int(2, 4);
    const power = b ** x;
    const total = a * power;
    return {
      prompt: `A colony starts with $${a}$ cells, and the count is multiplied by $${b}$ every hour. How many cells are there after $${x}$ hours? Enter one number.`,
      answer: numericAnswer(`${total}`),
      params: { a, b, x, total },
      hints: [
        "The factor is applied once per hour, and applying the same factor repeatedly is what a power records. So the number of hours becomes the exponent, not a second multiplier.",
        "Write the starting amount times the factor raised to the number of hours, and evaluate the power before you multiply.",
      ],
      worked_solution: [
        `The starting amount is $${a}$, and the factor $${b}$ is applied once for each of the $${x}$ hours.`,
        `So the count is $${a} \\cdot ${b}^{${x}}$.`,
        `Evaluate the power first: $${b}^{${x}} = ${power}$.`,
        `Then multiply: $${a} \\cdot ${power} = ${total}$.`,
        `After $${x}$ hours there are $${total}$ cells.`,
      ],
    };
  },
  varietyKey: (params) => `${params.total ?? 0}`,
};

/**
 * L2a, the same model running downward, with the factor RECOVERED rather than read.
 *
 * The tier used to state the factor in words ("half of it remains at the end of each day"),
 * which left nothing between the sentence and the arithmetic. Slide 2 is the whole of what
 * to do when no multiplier is attached: divide any reading by the one before it and the same
 * number comes back. Nothing in the pool asked for that, and this shape is also the one the
 * lesson's own check asks, so a learner re-asked here was being handed an easier question
 * than the one they had just missed.
 *
 * Three consecutive readings, so the ratio can be taken twice and CONFIRMED rather than
 * guessed off a single pair, which is the habit slide 2 is teaching. They fall, so the factor
 * recovered is between $0$ and $1$ and the model is still decay: the tier keeps the direction
 * it always tested and gains the step in front of it. Every reading and the answer are whole
 * numbers, because the start is built as a multiple of the factor's full power.
 */
export const d8_el1_decay_value_l2: ItemTemplate = {
  template_id: "d8.el1.decay-value.l2",
  node_id: EL1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const m = rng.int(3, 12);
    const b = rng.pick([2, 3]);
    const x = b === 2 ? rng.int(2, 4) : rng.int(2, 3);
    const power = b ** x;
    // Two readings sit BEFORE the last one, so `start` carries two extra steps of the factor.
    const start = m * power * b * b;
    const second = start / b;
    const third = second / b;
    return {
      prompt: `Daily readings of a decaying sample run $${start}$ milligrams, then $${second}$, then $${third}$. How many milligrams remain $${x}$ days after the last reading? Enter one number.`,
      answer: numericAnswer(`${m}`),
      params: { m, b, x, start },
      hints: [
        "No multiplier is stated, so recover it from the readings themselves: divide any reading by the one before it, and check that the same number comes back on the other pair.",
        "The readings are falling, so what comes back is a fraction between $0$ and $1$. Applying it is multiplication, not subtraction of a fixed amount.",
        "Apply that fraction to the LAST reading rather than to the first one, once for each day that passes after it.",
      ],
      worked_solution: [
        `Divide each reading by the one before it: $${second} \\div ${start} = \\dfrac{1}{${b}}$, and $${third} \\div ${second} = \\dfrac{1}{${b}}$. The same factor comes back.`,
        `That factor is applied once per day, and $${x}$ days pass after the last reading.`,
        `So the remaining amount is $${third} \\cdot \\left(\\dfrac{1}{${b}}\\right)^{${x}}$.`,
        `$\\left(\\dfrac{1}{${b}}\\right)^{${x}} = \\dfrac{1}{${power}}$, so this divides $${third}$ by $${power}$.`,
        `$\\dfrac{${third}}{${power}} = ${m}$, so $${m}$ milligrams remain.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m ?? 0}:${params.b ?? 0}:${params.x ?? 0}`,
};

/**
 * L2b, read the DIRECTION off the base. The function is written out, so nothing has to be
 * evaluated: the test is that the base is the number being raised to the power and the
 * coefficient in front only sets the starting size. Both option words answer the same
 * question the prompt asks (R22), and the base is never exactly $1$, which would make
 * neither word right.
 */
export const d8_el1_classify_l2: ItemTemplate = {
  template_id: "d8.el1.classify.l2",
  node_id: EL1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const growing = rng.int(0, 1);
    const a = rng.int(2, 12) * 5;
    const base =
      growing === 1
        ? rng.pick([1.08, 1.25, 1.5, 2, 3])
        : rng.pick([0.25, 0.4, 0.5, 0.75, 0.9]);
    return {
      prompt: `For $f(x) = ${a}(${base})^{x}$, does the output grow or decay as $x$ increases? Type \`growth\` or \`decay\`.`,
      answer: multipleChoiceAnswer(growing === 1 ? "growth" : "decay"),
      params: { a, base, growing },
      hints: [
        "Compare the repeated multiplier with $1$. Multiplying by something above $1$ makes each step larger than the one before, and multiplying by something between $0$ and $1$ makes each step smaller.",
        "The repeated multiplier is the number being raised to the power, not the number multiplying the whole expression. The one in front only sets the starting size.",
      ],
      worked_solution: [
        `The number being raised to the power is $${base}$, so that is the factor applied at every step.`,
        `The $${a}$ in front is the starting amount, and it never changes as $x$ increases.`,
        growing === 1
          ? `$${base}$ is greater than $1$, so each step multiplies the output up.`
          : `$${base}$ lies between $0$ and $1$, so each step multiplies the output down.`,
        growing === 1 ? "The model shows growth." : "The model shows decay.",
      ],
    };
  },
  varietyKey: (params) => `${params.growing ?? 0}:${params.base ?? 0}`,
};

/**
 * L3a, the factor hidden behind a percent. Nothing is handed over as a multiplier: the
 * learner has to build $1 + \frac{r}{100}$, and the common wrong turn is multiplying by
 * the percent alone, which shrinks the mass instead of growing it. Kept in grams rather
 * than money so it cannot be confused with the frozen compound-interest assessment item.
 */
export const d8_el1_percent_growth_l3: ItemTemplate = {
  template_id: "d8.el1.percent-growth.l3",
  node_id: EL1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let m0 = 0;
    let r = 0;
    let t = 0;
    let exact = 0;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      m0 = rng.int(2, 20) * 10;
      r = rng.int(3, 9);
      t = rng.int(3, 6);
      exact = m0 * (1 + r / 100) ** t;
      if (roundsCleanly(exact)) {
        break;
      }
    }
    const factor = 1 + r / 100;
    return {
      prompt: `A culture weighs $${m0}$ grams and gains $${r}\\%$ of its mass every hour. What is its mass after $${t}$ hours? Round your answer to two decimal places.`,
      answer: precisionAnswer(
        exact.toFixed(2),
        { mode: "decimal_places", value: 2, rounding: "half_up" },
        "decimal",
      ),
      params: { m0, r, t },
      hints: [
        "Gaining a percent of the mass means the new mass is the old mass PLUS that share, so the repeated multiplier is $1$ plus the percent written as a decimal.",
        "That multiplier is applied once per hour, so it carries an exponent equal to the number of hours. Build the factor before you raise it to anything.",
      ],
      worked_solution: [
        `Write the percent as a decimal: $${r}\\% = ${r / 100}$.`,
        `Each hour the mass becomes $1 + ${r / 100} = ${factor}$ times what it was.`,
        `Over $${t}$ hours that factor applies $${t}$ times: $${m0} \\cdot ${factor}^{${t}}$.`,
        `$${factor}^{${t}} \\approx ${((1 + r / 100) ** t).toFixed(6)}$.`,
        `Multiplying through and rounding to two decimal places gives $${exact.toFixed(2)}$ grams.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m0 ?? 0}:${params.r ?? 0}:${params.t ?? 0}`,
};

/**
 * L3b, the continuous factor. This is the shape base $e$ exists for, and it is the only
 * one in the node whose answer cannot be written exactly as a decimal, which is why the
 * prompt names the rounding and asks for the bare number: a dollar sign or a comma is
 * rejected as a representation error, not as arithmetic.
 */
export const d8_el1_continuous_l3: ItemTemplate = {
  template_id: "d8.el1.continuous.l3",
  node_id: EL1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let principal = 0;
    let ratePct = 0;
    let t = 0;
    let exact = 0;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      principal = rng.int(1, 12) * 500;
      ratePct = rng.pick([2, 3, 4, 5, 6]);
      t = rng.int(2, 8);
      exact = principal * Math.exp((ratePct / 100) * t);
      if (roundsCleanly(exact)) {
        break;
      }
    }
    const rate = ratePct / 100;
    const exponent = (ratePct * t) / 100;
    return {
      prompt: `An account holds ${latexDollarInt(principal)} and earns $${ratePct}\\%$ interest compounded continuously, so its balance follows $A = Pe^{rt}$. What is the balance after $${t}$ years? Round to the nearest cent, and enter just the number with no dollar sign and no commas.`,
      answer: precisionAnswer(
        exact.toFixed(2),
        { mode: "decimal_places", value: 2, rounding: "half_up" },
        "decimal",
      ),
      params: { principal, ratePct, t },
      hints: [
        "In $A = Pe^{rt}$ the rate goes in as a decimal rather than as a percent, and the exponent is the rate multiplied by the time.",
        "Build the exponent first, then raise $e$ to it, and multiply by the starting balance last. Raising $e$ to the rate and then adding the years does not give the same thing.",
      ],
      worked_solution: [
        `Write the rate as a decimal: $r = ${rate}$, and the time is $t = ${t}$.`,
        `The exponent is the rate times the time: $rt = ${rate} \\cdot ${t} = ${exponent}$.`,
        `$e^{${exponent}} \\approx ${Math.exp(exponent).toFixed(6)}$.`,
        `Multiply by the starting balance: $${principal} \\cdot ${Math.exp(exponent).toFixed(6)} \\approx ${exact.toFixed(2)}$.`,
        `The balance is $${exact.toFixed(2)}$ dollars.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.principal ?? 0}:${params.ratePct ?? 0}:${params.t ?? 0}`,
};

/** EL.1's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const EL1_TEMPLATES: readonly ItemTemplate[] = [
  d8_el1_evaluate_l1,
  d8_el1_decay_value_l2,
  d8_el1_classify_l2,
  d8_el1_percent_growth_l3,
  d8_el1_continuous_l3,
];
