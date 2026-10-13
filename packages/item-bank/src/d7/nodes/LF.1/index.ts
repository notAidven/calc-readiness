import {
  type ItemTemplate,
  multipleChoiceAnswer,
  numericAnswer,
  type Rng,
  reducedFraction,
  representedNumericAnswer,
} from "../../../template";

/**
 * LF.1 practice templates: slope as a CONSTANT rate of change, and the sign of that rate as
 * the classification of the line. Five problem shapes across the locked 1xL1 / 2xL2 / 2xL3
 * practice mix, one per way the rate can reach the learner:
 *
 *  - L1  a table of ordered pairs stepping by a fixed amount (read the rate off the steps);
 *  - L2a a rise and a run described as a move on the grid (the triangle, without the grid);
 *  - L2b two points, classified increasing / decreasing / constant (the SIGN only);
 *  - L3a two points with negative coordinates, run through the full slope formula;
 *  - L3b an ordinary rate-of-change word problem, where the quantity may be falling.
 *
 * Every prompt is plain mathematical or everyday language. There is no island, guild or
 * building framing anywhere in this node.
 *
 * ## Answer paths
 *
 * Only two graders are used, both already cleared by the product checker for this node
 * (see `prod.lf-1.l2` and its golden fixtures): a numeric value, asked as a FRACTION via
 * `representedNumericAnswer` when the slope is a genuine fraction and left
 * representation-free via `numericAnswer` (the same spec with `representation: "any"`) when
 * it is a whole number, and a three-way `multiple_choice` word. Under `"fraction"` with
 * `simplification: "none"` an unreduced equivalent still grades correct, so those prompts
 * say "as a fraction" rather than promising a lowest-terms check the grader does not make.
 *
 * The two fraction shapes both reroll until `dx` does NOT divide `dy`, so the answer is
 * never a whole number wearing a fraction's representation requirement.
 *
 * This pool never touches the frozen LF.1 product ASSESSMENT item (`prod.lf-1.l2`):
 * different template ids, different prompt wording, different parameter ranges, and a
 * different pool. The L3a shape additionally rerolls away from the two point pairs the
 * LESSON works (the CFU and the slide-3 walkthrough), so practice never hands back an
 * instance the learner just watched.
 *
 * Each template declares a `varietyKey` over its answer so a cell never freezes two items
 * with the same slope. The classify shape is the one exception the answer space forces:
 * with only three possible words, its key is the verdict PLUS the slope, which is strictly
 * finer than the verdict alone and still keeps near-twins out of a cell.
 */

export const LF1_NODE = "LF.1";

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** Reduce a fraction, carrying the sign in the numerator. */
function reduceParts(n: number, d: number): { n: number; d: number } {
  const g = gcd(n, d);
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g, d: Math.abs(d) / g };
}

/** A stacked fraction exactly as written. */
function frac(n: number, d: number): string {
  return `\\dfrac{${n}}{${d}}`;
}

/** The reduced fraction, collapsing to a bare integer when the denominator becomes 1. */
function fracTex(n: number, d: number): string {
  const r = reduceParts(n, d);
  return r.d === 1 ? `${r.n}` : frac(r.n, r.d);
}

/**
 * `\dfrac{n}{d}`, followed by `= <reduced>` ONLY when reducing changes something. Written
 * unconditionally the step would print the same fraction on both sides of the equals sign
 * on every draw that arrived already reduced, claiming work the numbers never needed.
 */
function reduceTail(n: number, d: number): string {
  const r = reduceParts(n, d);
  return r.n === n && r.d === d ? frac(n, d) : `${frac(n, d)} = ${fracTex(n, d)}`;
}

/** A coordinate as it appears inside a difference: negatives keep their parentheses. */
function sub(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** An ordered pair as LaTeX, with the comma spaced the way the lesson diagrams space it. */
function point(x: number, y: number): string {
  return `(${x},\\, ${y})`;
}

/**
 * L1, read the constant rate off a table. Four ordered pairs stepping forward in `x` by the
 * same amount, so every consecutive pair gives the same change in `y`. The slope is a whole
 * number here, which is what keeps this the entry tier: the skill being tested is noticing
 * that the ratio repeats, not dividing.
 */
export const d7_lf1_table_rate_l1: ItemTemplate = {
  template_id: "d7.lf1.table-rate.l1",
  node_id: LF1_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const step = rng.int(2, 4);
    const mag = rng.int(2, 7);
    const negative = rng.int(0, 1);
    const m = negative === 1 ? -mag : mag;
    const x0 = rng.int(-4, 4);
    const y0 = rng.int(-6, 6);
    const pairs = [0, 1, 2, 3]
      .map((index) => `$${point(x0 + index * step, y0 + index * step * m)}$`)
      .join(", ");
    const dy = step * m;
    return {
      prompt: `A line contains these points, listed in order: ${pairs}. Each step forward in $x$ is the same size, so $y$ changes by the same amount every time. Find the slope of the line. Enter one number.`,
      answer: numericAnswer(`${m}`),
      params: { x0, y0, step, mag, negative, m },
      hints: [
        "Slope is the change in $y$ for one step in $x$, so subtract one listed point from the next to get the step in $x$ and the step in $y$, keeping the same order for both.",
        "Divide the change in $y$ by the change in $x$. Check a second pair of points as well, and the value should come out the same.",
      ],
      worked_solution: [
        `The step in $x$ is the same every time: $${x0 + step} - ${sub(x0)} = ${step}$.`,
        `The step in $y$ is the same every time: $${y0 + dy} - ${sub(y0)} = ${dy}$.`,
        `Slope is the change in $y$ divided by the change in $x$: $m = ${reduceTail(dy, step)}$.`,
        `The slope is $m = ${m}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m ?? 0}`,
};

/**
 * L2a, the rise-over-run triangle described in words. No grid is given, so the learner has
 * to decide which move is the rise and which is the run, and carry the sign of a downward
 * move into the numerator. Rerolled until the run does not divide the rise, so the answer is
 * a genuine fraction.
 */
export const d7_lf1_rise_run_l2: ItemTemplate = {
  template_id: "d7.lf1.rise-run.l2",
  node_id: LF1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const run = rng.int(2, 6);
    let riseMag = rng.int(1, 11);
    while (riseMag % run === 0) {
      riseMag = rng.int(1, 11);
    }
    const up = rng.int(0, 1);
    const rise = up === 1 ? riseMag : -riseMag;
    return {
      prompt: `Start at a point on a line. Moving $${run}$ units to the right and then $${riseMag}$ units ${up === 1 ? "up" : "down"} lands you on the line again. Find the slope of the line. Write your answer as a fraction.`,
      answer: representedNumericAnswer(reducedFraction(rise, run), "fraction", "none"),
      params: { run, riseMag, up },
      hints: [
        "A slope compares the vertical change with the horizontal change, so decide which of the two moves is the rise and which is the run.",
        "The rise goes on top and the run goes on the bottom. Moving to the right is a positive run, and the rise takes its sign from the vertical move: upward is positive and downward is negative.",
        "Write the rise over the run, then reduce the fraction if the two numbers share a factor.",
      ],
      worked_solution: [
        `Moving to the right is the run: $\\text{run} = ${run}$.`,
        `Moving ${up === 1 ? "up" : "down"} is the rise: $\\text{rise} = ${rise}$.`,
        `Slope is rise over run: $m = ${reduceTail(rise, run)}$.`,
        `The slope is $m = ${fracTex(rise, run)}$.`,
      ],
    };
  },
  varietyKey: (params) => {
    const rise = (params.up ?? 0) === 1 ? (params.riseMag ?? 0) : -(params.riseMag ?? 0);
    return reducedFraction(rise, params.run ?? 1);
  },
};

/**
 * L2b, classify from two points. Only the SIGN of the rise matters, so the item is short,
 * but the draw deliberately spends a third of its instances on a level line: a rise of zero
 * is the case a learner is most likely to call by the shape of the numbers rather than by
 * the definition.
 *
 * The three allowed words are named in the prompt because the learner types one of them.
 */
export const d7_lf1_direction_l2: ItemTemplate = {
  template_id: "d7.lf1.direction.l2",
  node_id: LF1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const x1 = rng.int(-6, 4);
    const y1 = rng.int(-7, 7);
    const dx = rng.int(2, 7);
    // 0 level, 1 rising, 2 falling: drawn as a KIND first so the level case is not a
    // one-in-nineteen accident of the rise draw.
    const kind = rng.int(0, 2);
    const dy = kind === 0 ? 0 : kind === 1 ? rng.int(1, 9) : -rng.int(1, 9);
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const verdict = kind === 0 ? "constant" : kind === 1 ? "increasing" : "decreasing";
    const sense =
      dy > 0
        ? "The change in $y$ is positive, so the slope is positive and the line rises from left to right."
        : dy < 0
          ? "The change in $y$ is negative, so the slope is negative and the line falls from left to right."
          : "The change in $y$ is zero, so the slope is zero and the line stays level.";
    return {
      prompt: `A line passes through $${point(x1, y1)}$ and $${point(x2, y2)}$. As $x$ increases, is the line increasing, decreasing, or constant? Type one of those three words.`,
      answer: multipleChoiceAnswer(verdict),
      params: { x1, y1, dx, dy, kind },
      hints: [
        "You do not need the exact slope here, only its sign, so start at the point with the smaller $x$-value and ask whether $y$ goes up, goes down, or stays level as you move to the other point.",
        "A line that rises from left to right has a positive slope, a line that falls has a negative slope, and a level line has a slope of zero. Match what you found to one of the three words in the prompt.",
      ],
      worked_solution: [
        `The first point has the smaller $x$-value, so read from $${point(x1, y1)}$ to $${point(x2, y2)}$.`,
        `The change in $y$ is $${y2} - ${sub(y1)} = ${dy}$.`,
        `The change in $x$ is $${x2} - ${sub(x1)} = ${dx}$, which is positive.`,
        sense,
        `The line is ${verdict}.`,
      ],
    };
  },
  varietyKey: (params) => {
    const dy = params.dy ?? 0;
    const verdict = dy === 0 ? "constant" : dy > 0 ? "increasing" : "decreasing";
    return `${verdict}:${reducedFraction(dy, params.dx ?? 1)}`;
  },
};

/**
 * The point pairs the LESSON already works, so practice never returns one the learner just
 * watched: the CFU, then the slide-3 walkthrough. Stored left point first, which is how
 * this template always draws them.
 */
const TAUGHT_PAIRS: readonly (readonly [number, number, number, number])[] = [
  [-3, 7, 5, 3],
  [-2, 5, 4, -4],
];

/**
 * L3a, the full two-point formula. The left point always has a negative `x`, so the
 * denominator is a subtraction of a negative and the "same order top and bottom" rule has
 * something to bite on. The `order` flag lists the RIGHT point first half the time, which
 * removes the crutch of reading the first-listed point as `(x_1, y_1)` and calls for a
 * deliberate choice instead.
 */
export const d7_lf1_two_point_l3: ItemTemplate = {
  template_id: "d7.lf1.two-point.l3",
  node_id: LF1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let x1 = 0;
    let y1 = 0;
    let dx = 0;
    let dy = 0;
    // Reroll until the slope is a genuine non-zero fraction and the pair is not one of the
    // two the lesson works.
    do {
      x1 = rng.int(-8, -1);
      y1 = rng.int(-8, 8);
      dx = rng.int(3, 9);
      dy = rng.int(-11, 11);
    } while (
      dy === 0 ||
      dy % dx === 0 ||
      TAUGHT_PAIRS.some(
        ([tx1, ty1, tx2, ty2]) =>
          tx1 === x1 && ty1 === y1 && tx2 === x1 + dx && ty2 === y1 + dy,
      )
    );
    const order = rng.int(0, 1);
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const first = order === 1 ? point(x2, y2) : point(x1, y1);
    const second = order === 1 ? point(x1, y1) : point(x2, y2);
    return {
      prompt: `A line passes through $${first}$ and $${second}$. Use $m = \\dfrac{y_2 - y_1}{x_2 - x_1}$ to find the slope of the line. Write your answer as a fraction.`,
      answer: representedNumericAnswer(reducedFraction(dy, dx), "fraction", "none"),
      params: { x1, y1, dx, dy, order },
      hints: [
        "Pick one of the two points to be the first and the other to be the second, then keep that choice for both subtractions.",
        "The top is the difference of the $y$-values and the bottom is the difference of the $x$-values, taken in the same order. Subtracting a negative coordinate adds its size.",
        "Work out the top and the bottom separately, then write the quotient as a fraction and reduce it if the two numbers share a factor.",
      ],
      worked_solution: [
        `Take the left point as the first one: $(x_1,\\, y_1) = ${point(x1, y1)}$ and $(x_2,\\, y_2) = ${point(x2, y2)}$.`,
        `The numerator is $y_2 - y_1 = ${y2} - ${sub(y1)} = ${dy}$.`,
        `The denominator is $x_2 - x_1 = ${x2} - ${sub(x1)} = ${dx}$.`,
        `Divide: $m = ${reduceTail(dy, dx)}$.`,
        `The slope is $m = ${fracTex(dy, dx)}$.`,
      ],
    };
  },
  varietyKey: (params) => reducedFraction(params.dy ?? 0, params.dx ?? 1),
};

/**
 * L3b, the same rate read out of an ordinary situation rather than off a pair of points.
 * Half the draws describe a quantity that is FALLING, where the rate of change is negative,
 * which is the interpretation half of this node stated in units.
 */
export const d7_lf1_rate_context_l3: ItemTemplate = {
  template_id: "d7.lf1.rate-context.l3",
  node_id: LF1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const kind = rng.int(0, 1);
    const t1 = rng.int(1, 4);
    const gap = rng.int(2, 5);
    const t2 = t1 + gap;
    const mag = kind === 0 ? rng.int(35, 75) : rng.int(4, 18);
    const rate = kind === 0 ? mag : -mag;
    const rest = rng.int(5, 60);
    // Distance grows from nothing; the tank falls to `rest` gallons.
    const v1 = kind === 0 ? mag * t1 : rest + mag * gap;
    const v2 = kind === 0 ? mag * t2 : rest;
    const dv = v2 - v1;
    const timeUnit = kind === 0 ? "hours" : "minutes";
    const quantity = kind === 0 ? "distance" : "water";
    const valueUnit = kind === 0 ? "miles" : "gallons";
    const rateUnit = kind === 0 ? "miles per hour" : "gallons per minute";
    const story =
      kind === 0
        ? `A car travels at a constant rate. After $${t1}$ hours it has gone $${v1}$ miles, and after $${t2}$ hours it has gone $${v2}$ miles. Find the rate of change of distance with respect to time, in miles per hour.`
        : `A tank drains at a constant rate. After $${t1}$ minutes it holds $${v1}$ gallons, and after $${t2}$ minutes it holds $${v2}$ gallons. Find the rate of change of the amount of water, in gallons per minute.`;
    return {
      prompt: `${story} Enter one number, using a negative number if the quantity is going down.`,
      answer: numericAnswer(`${rate}`),
      params: { kind, t1, t2, v1, v2, rate },
      hints: [
        "A constant rate of change is the change in the measured quantity divided by the change in time, so find both of those changes first.",
        "Subtract the earlier reading from the later one, and subtract the earlier time from the later time, so both differences run in the same direction.",
        "Divide the change in the quantity by the change in time. A quantity that grew gives a positive change and a positive rate, and one that fell gives a negative change and a negative rate.",
      ],
      worked_solution: [
        `The change in time is $${t2} - ${sub(t1)} = ${gap}$ ${timeUnit}.`,
        `The change in ${quantity} is $${v2} - ${sub(v1)} = ${dv}$ ${valueUnit}.`,
        `Divide the change in ${quantity} by the change in time: $m = ${reduceTail(dv, gap)}$.`,
        `The rate of change is $${rate}$ ${rateUnit}.`,
      ],
    };
  },
  varietyKey: (params) => `${params.rate ?? 0}`,
};

/** Every LF.1 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const LF1_TEMPLATES: readonly ItemTemplate[] = [
  d7_lf1_table_rate_l1,
  d7_lf1_rise_run_l2,
  d7_lf1_direction_l2,
  d7_lf1_two_point_l3,
  d7_lf1_rate_context_l3,
];
