import { latexDollarInt } from "../../../promptFormat";
import {
  expressionAnswer,
  type ItemTemplate,
  numericAnswer,
  type Rng,
} from "../../../template";

/**
 * LF.3 practice templates: build a linear model from a description or from data, then
 * read a prediction off it. Five problem shapes across the locked 1xL1 / 2xL2 / 2xL3
 * practice mix, with two genuinely different shapes at each of L2 and L3 so the
 * round-robin five-slot set never serves the same task twice.
 *
 * The shapes escalate along ONE axis: how much of the model is handed to you.
 *
 *   L1  both numbers are stated in the sentence, so only the assembly is new;
 *   L2a neither number is stated, and the rate has to come out of two table rows;
 *   L2b both numbers are stated, but the answer is a prediction rather than the model;
 *   L3a nothing is stated, the rate may be NEGATIVE, and the prediction sits past the
 *       last row of the table, so the whole method runs end to end;
 *   L3b the rate is given but the point is not the intercept, so the starting value has
 *       to be recovered by substituting a point and solving for it, and the rate may be
 *       NEGATIVE.
 *
 * ## Falling models, and why they were briefly impossible
 *
 * A "write the right-hand side" item is graded by `expressionAnswer(..., "combined_polynomial")`.
 * That profile used to reject every falling model: mathjs parses BOTH `-15x + 320` and
 * `-15*x + 320` as `multiply(unaryMinus(15), x)`, and `hasExpandableProduct` matched any
 * `*` node with an operator child whose `op` is `"-"`, so a correct answer came back
 * `not_simplified`. Authoring could not route around it, because the STUDENT's equally
 * correct `-15x + 320` was rejected however the key was written. `hasExpandableProduct`
 * now also requires two operands, which is what separates a unary minus from a real sum,
 * so a falling model grades correctly and `d7.lf3.point-rate-model.l3` carries one. If a
 * falling model ever starts grading `not_simplified` again, that guard is what regressed.
 *
 * Every displayed amount stays positive even when the rate is negative: the falling draws
 * fix the amount remaining at the given input first and build the starting value up from
 * it, so no prompt reports a tank holding negative liters.
 *
 * Scenario wording is drawn LAST in every template, after every math param, so the frozen
 * pool stays deterministic and a re-draw of the wording never shifts the numbers. No
 * scenario changes an answer, a param, or a difficulty: the units are what make an applied
 * model worth building, not a story.
 *
 * Every key is computed by real arithmetic so `validateTemplates` grades each sampled
 * instance correct, and each template declares a `varietyKey` over its answer so a cell
 * never freezes two instances that come out the same.
 */

export const LF3_NODE = "LF.3";

/** The shared task line for the shapes that ask for the model itself. */
const MODEL_TASK = " Write the right-hand side of $y = \\ldots$.";

/** The shared task line for the shapes that ask for one predicted value. */
const NUMBER_TASK = " Enter one number.";

/** A signed value with negatives parenthesized, e.g. `(-6)` or `7`. */
function sp(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** A coefficient on `x` as LaTeX, e.g. `4x` or `-6x`. */
function rateTermTex(m: number): string {
  return m === 1 ? "x" : m === -1 ? "-x" : `${m}x`;
}

/**
 * L1: both numbers are in the sentence. The rate is marked by "for each" or "per" and
 * the starting value by a flat fee or an amount already present, so the only new move is
 * putting them in the right slots of `mx + b`.
 */
export const d7_lf3_describe_model_l1: ItemTemplate = {
  template_id: "d7.lf3.describe-model.l1",
  node_id: LF3_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const m = rng.int(2, 9);
    // A multiple of 5 from 15 up, so the starting value always reads as the "flat" number
    // and can never coincide with the rate (which stops at 9).
    const b = rng.int(3, 12) * 5;
    const scen = rng.int(0, 2);
    const description =
      scen === 1
        ? `A print shop charges a setup fee of ${latexDollarInt(b)}, plus ${latexDollarInt(m)} for each poster. Let $x$ be the number of posters and $y$ the total cost in dollars.`
        : scen === 2
          ? `A tank already holds $${b}$ liters, and a hose adds $${m}$ liters every minute. Let $x$ be the number of minutes and $y$ the liters in the tank.`
          : `A bike rental charges a flat fee of ${latexDollarInt(b)}, plus ${latexDollarInt(m)} for each hour. Let $x$ be the number of hours and $y$ the total cost in dollars.`;
    return {
      prompt: `${description}${MODEL_TASK}`,
      answer: expressionAnswer(`${m}x + ${b}`, ["x"], "combined_polynomial"),
      params: { m, b, scen },
      hints: [
        "The sentence hides two numbers: one that repeats for each unit of the input, and one that is already there before the input starts counting.",
        "The words for each and per mark the rate, so that number multiplies the input. A flat fee or an amount already present does not depend on the input at all.",
        "Write the rate times the input, then add the starting value. The right-hand side has exactly two terms.",
      ],
      worked_solution: [
        `The amount that repeats for each unit of the input is the rate: $${m}$.`,
        `The amount already there before the input starts counting is the starting value: $${b}$.`,
        `Multiply the rate by the input and add the starting value: $y = ${m}x + ${b}$.`,
        `Right-hand side: $${m}x + ${b}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m}:${params.b}`,
};

/**
 * L2a: three table rows and no starting value anywhere. The inputs step by 2, 3 or 4, so
 * dividing by the input gap is forced rather than optional, and the row at `x = 0` has to
 * be walked back to.
 */
export const d7_lf3_table_model_l2: ItemTemplate = {
  template_id: "d7.lf3.table-model.l2",
  node_id: LF3_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const m = rng.int(2, 9);
    const b = rng.int(2, 12) * 5;
    const x1 = rng.int(2, 5);
    const step = rng.int(2, 4);
    const scen = rng.int(0, 1);
    const x2 = x1 + step;
    const x3 = x2 + step;
    const y1 = m * x1 + b;
    const y2 = m * x2 + b;
    const y3 = m * x3 + b;
    const description =
      scen === 1
        ? `A tutoring bill grows steadily with the hours worked. After $${x1}$ hours the bill is ${latexDollarInt(y1)}, after $${x2}$ hours it is ${latexDollarInt(y2)}, and after $${x3}$ hours it is ${latexDollarInt(y3)}. Let $x$ be hours and $y$ the bill in dollars.`
        : `A tank fills at a steady rate. After $${x1}$ minutes it holds $${y1}$ liters, after $${x2}$ minutes it holds $${y2}$ liters, and after $${x3}$ minutes it holds $${y3}$ liters. Let $x$ be minutes and $y$ the liters in the tank.`;
    return {
      prompt: `${description}${MODEL_TASK}`,
      answer: expressionAnswer(`${m}x + ${b}`, ["x"], "combined_polynomial"),
      params: { m, b, x1, step, scen },
      hints: [
        "Two rows are enough to find the rate: divide the change in the output by the change in the input.",
        "The inputs do not step by one here, so divide by the gap between the two inputs you actually used.",
        "No row sits at input zero, so walk back to it: subtract the rate times one row's input from that row's output.",
      ],
      worked_solution: [
        `Change in the output between the first two rows: $${y2} - ${y1} = ${y2 - y1}$.`,
        `Change in the input over those same rows: $${x2} - ${x1} = ${step}$.`,
        `Rate: $\\dfrac{${y2 - y1}}{${step}} = ${m}$.`,
        `Walk the first row back to $x = 0$: $${y1} - ${m} \\times ${x1} = ${b}$.`,
        `Right-hand side: $${m}x + ${b}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m}:${params.b}`,
};

/**
 * L2b: the same description shape as L1, but the answer is a value rather than a model,
 * so the model has to be built and then USED. A learner who stops at the model has done
 * most of the work and still has nothing to type.
 */
export const d7_lf3_predict_l2: ItemTemplate = {
  template_id: "d7.lf3.predict.l2",
  node_id: LF3_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const m = rng.int(3, 9);
    const b = rng.int(2, 12) * 5;
    const xq = rng.int(4, 12);
    const scen = rng.int(0, 1);
    const total = m * xq + b;
    const description =
      scen === 1
        ? `A pool already holds $${b}$ liters, and a hose adds $${m}$ liters every minute. How many liters are in the pool after $${xq}$ minutes?`
        : `A moving van rents for a flat ${latexDollarInt(b)}, plus ${latexDollarInt(m)} for each hour. What does a $${xq}$ hour rental cost, in dollars?`;
    return {
      prompt: `${description}${NUMBER_TASK}`,
      answer: numericAnswer(`${total}`),
      params: { m, b, xq, total, scen },
      hints: [
        "Build the model before you substitute anything: the rate multiplies the input, and the starting value is added on once however large the input is, rather than once per unit.",
        "Now put the given input into your model and evaluate it, multiplying before you add.",
      ],
      worked_solution: [
        `The rate is $${m}$ for each unit of the input, and the starting value is $${b}$.`,
        `Model: $y = ${m}x + ${b}$.`,
        `Substitute the given input: $y = ${m} \\times ${xq} + ${b}$.`,
        `Multiply first, then add: $${m * xq} + ${b} = ${total}$.`,
        `The prediction is $${total}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.total}`,
};

/**
 * L3a: the whole method end to end, and the node's only FALLING shape. Two rows, no
 * starting value, and a requested input past the last row, so the rate has to be found
 * (with its sign), the starting value recovered, and the model used somewhere the table
 * never went. The answer is a plain number, which is what lets the rate be negative here:
 * see the module note on `combined_polynomial`.
 */
export const d7_lf3_table_predict_l3: ItemTemplate = {
  template_id: "d7.lf3.table-predict.l3",
  node_id: LF3_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const mag = rng.int(3, 9);
    const dir = rng.int(0, 1);
    const x1 = rng.int(1, 4);
    const step = rng.int(2, 3);
    const gap = rng.int(2, 5);
    // The leftover at the requested input for a falling quantity: drawn before the
    // starting value so a falling instance can never predict a negative amount.
    const tail = rng.int(2, 20);
    const rise = rng.int(2, 10) * 5;
    const scen = rng.int(0, 1);
    const m = dir === 1 ? -mag : mag;
    const x2 = x1 + step;
    const xq = x2 + gap;
    const b = dir === 1 ? mag * xq + tail : rise;
    const y1 = m * x1 + b;
    const y2 = m * x2 + b;
    const total = m * xq + b;
    const description =
      dir === 1
        ? scen === 1
          ? `A pallet is being unloaded at a steady rate. After $${x1}$ minutes $${y1}$ boxes are left, and after $${x2}$ minutes $${y2}$ boxes are left. How many boxes are left after $${xq}$ minutes?`
          : `A tank drains at a steady rate. After $${x1}$ minutes it holds $${y1}$ liters, and after $${x2}$ minutes it holds $${y2}$ liters. How many liters does it hold after $${xq}$ minutes?`
        : scen === 1
          ? `A savings balance grows steadily. After $${x1}$ weeks it is ${latexDollarInt(y1)}, and after $${x2}$ weeks it is ${latexDollarInt(y2)}. What is the balance after $${xq}$ weeks, in dollars?`
          : `A tank fills at a steady rate. After $${x1}$ minutes it holds $${y1}$ liters, and after $${x2}$ minutes it holds $${y2}$ liters. How many liters does it hold after $${xq}$ minutes?`;
    return {
      prompt: `${description}${NUMBER_TASK}`,
      answer: numericAnswer(`${total}`),
      params: { mag, dir, x1, step, xq, b, total, scen },
      hints: [
        "Start with the rate: the change in the output divided by the change in the input. An output that grows with the input gives a positive rate, and one that falls gives a negative rate.",
        "Neither row sits at input zero, so recover the starting value by subtracting the rate times a row's input from that row's output.",
        "That gives you the whole model. Substitute the requested input and evaluate, multiplying before you add.",
      ],
      worked_solution: [
        `Change in the output: $${y2} - ${y1} = ${y2 - y1}$.`,
        `Change in the input: $${x2} - ${x1} = ${step}$.`,
        `Rate: $\\dfrac{${y2 - y1}}{${step}} = ${m}$.`,
        `Walk the first row back to $x = 0$: $${y1} - ${sp(m)} \\times ${x1} = ${b}$.`,
        `Model: $y = ${rateTermTex(m)} + ${b}$.`,
        `Substitute the requested input: $y = ${sp(m)} \\times ${xq} + ${b} = ${total}$.`,
        `The prediction is $${total}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.total}:${params.mag}`,
};

/**
 * L3b: the rate is handed over, but the point that comes with it is NOT the intercept, so
 * the starting value has to be solved for. The trap this shape exists to catch is reading
 * the given output as the starting value, which is exactly what a learner does when the
 * description sounds like L1.
 */
export const d7_lf3_point_rate_model_l3: ItemTemplate = {
  template_id: "d7.lf3.point-rate-model.l3",
  node_id: LF3_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const mag = rng.int(3, 12);
    const dir = rng.int(0, 1);
    const xp = rng.int(3, 8);
    // For a falling quantity this is the amount still left at the given input. Drawing it
    // first and building the starting value up from it keeps every displayed amount
    // positive, so a draining tank never reports negative liters.
    const tail = rng.int(2, 15) * 5;
    const m = dir === 1 ? -mag : mag;
    const b = dir === 1 ? mag * xp + tail : tail;
    const scen = rng.int(0, 1);
    const yp = m * xp + b;
    const description =
      dir === 1
        ? scen === 1
          ? `A tank drains at a steady $${mag}$ liters per minute. After $${xp}$ minutes it holds $${yp}$ liters. Let $x$ be minutes and $y$ the liters in the tank.`
          : `A prepaid balance falls by ${latexDollarInt(mag)} each week. After $${xp}$ weeks the balance is ${latexDollarInt(yp)}. Let $x$ be weeks and $y$ the balance in dollars.`
        : scen === 1
          ? `A tank fills at a steady $${mag}$ liters per minute. After $${xp}$ minutes it holds $${yp}$ liters. Let $x$ be minutes and $y$ the liters in the tank.`
          : `A savings balance grows by ${latexDollarInt(mag)} each week. After $${xp}$ weeks the balance is ${latexDollarInt(yp)}. Let $x$ be weeks and $y$ the balance in dollars.`;
    return {
      prompt: `${description}${MODEL_TASK}`,
      answer: expressionAnswer(`${rateTermTex(m)} + ${b}`, ["x"], "combined_polynomial"),
      params: { m, xp, b, scen },
      hints: [
        "The rate is stated outright, so the only number still missing is the starting value. A quantity described as growing has a positive rate, and one described as falling has a negative rate.",
        "The output you are given does not sit at input zero, so it is not the starting value. Substitute that input and output into $y = mx + b$ and leave the starting value as the unknown.",
        "Work out the rate times the given input, then subtract that product from the given output. Mind the sign: when the rate is negative that product is negative too, and subtracting it leaves a starting value above the reading you were handed, which is what a falling quantity should give.",
      ],
      worked_solution: [
        `The rate is stated: $${m}$ for each unit of the input.`,
        `Substitute the given point into $y = ${rateTermTex(m)} + b$: $${yp} = ${sp(m)} \\times ${xp} + b$.`,
        `The rate term at that input is $${sp(m)} \\times ${xp} = ${m * xp}$.`,
        `Subtract it from the given output: $b = ${yp} - ${sp(m * xp)} = ${b}$.`,
        `Right-hand side: $${rateTermTex(m)} + ${b}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m}:${params.b}`,
};

/** Every LF.3 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const LF3_TEMPLATES: readonly ItemTemplate[] = [
  d7_lf3_describe_model_l1,
  d7_lf3_table_model_l2,
  d7_lf3_predict_l2,
  d7_lf3_table_predict_l3,
  d7_lf3_point_rate_model_l3,
];
