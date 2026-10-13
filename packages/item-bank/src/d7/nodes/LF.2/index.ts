import {
  expressionAnswer,
  type ItemTemplate,
  multipleChoiceAnswer,
  type Rng,
} from "../../../template";

/**
 * LF.2 practice templates: write and graph line equations, and decide when two lines are
 * parallel or perpendicular. Five problem shapes across the locked 1xL1 / 2xL2 / 2xL3
 * practice mix, with two genuinely different shapes at each of L2 and L3 so a five-slot
 * set never round-robins onto the same problem twice.
 *
 * ## Why every expression prompt asks for the RIGHT-HAND SIDE
 *
 * A two-sided equation (`y = 2x + 5`) is not a cleared checker category, so no prompt here
 * asks for one. Each expression shape asks for the expression that follows the equals sign
 * and says so in the prompt, and the key is graded by `expressionAnswer(..., ["x"],
 * "combined_polynomial")`: symbolic equivalence, so `5 - 3x` grades the same as `-3x + 5`,
 * with the form profile rejecting an undistributed product or uncombined like terms. That
 * matters most for the point-slope shape, where copying the prompt's `m(x - x_1)` back is
 * exactly the non-answer the profile is there to catch.
 *
 * The classify shape has no expression to write at all, so it is a `multipleChoiceAnswer`
 * over three words. That comparator is an exact string match, so its prompt states the
 * three allowed words AND that they are typed in lowercase.
 *
 * ## Seeding
 *
 * The shapes are seeded from Lippman & Rasmussen, *Precalculus: An Investigation of
 * Functions* (opentextbookstore.com), section 2.2 "Graphs of Linear Functions", whose
 * exercise ladder runs from reading a slope and an intercept off a graph, through writing
 * the equation of a line through a point, up to "write the equation of the line parallel /
 * perpendicular to the given line through the given point". Extracted PDF text flattens
 * stacked fractions, so every slope, intercept and key below was re-derived by hand and
 * recomputed by real arithmetic rather than transcribed. The diversification off the seed:
 * the seed's parallel and perpendicular exercises hand over both lines in the same form,
 * while the L2 classify shape here always presents the second line unsolved for `y`, and
 * the L3 perpendicular shape starts from a standard-form equation whose reciprocal is an
 * integer, so the answer never needs a fraction typed into a text box.
 *
 * Every key is computed from the drawn params, and each template declares a `varietyKey`
 * over the answer it produces, so a cell never freezes two near-twin instances.
 */

export const LF2_NODE = "LF.2";

/** The shared task line. Only the math is delimited; the instruction stays outside. */
const RHS_TASK =
  " Give only the right-hand side of $y = \\ldots$, the expression that follows the equals sign.";

/** `+` or `-` for a signed value, as the operator that precedes its magnitude. */
function op(value: number): string {
  return value < 0 ? "-" : "+";
}

/** A signed value with negatives parenthesized, e.g. `(-4)` or `7`. */
function sp(value: number): string {
  return value < 0 ? `(-${-value})` : `${value}`;
}

/** The slope term as LaTeX: `3x`, `-x`, `x`. */
function slopeTermTex(m: number): string {
  if (m === 1) {
    return "x";
  }
  if (m === -1) {
    return "-x";
  }
  return `${m}x`;
}

/** A whole linear expression as LaTeX: `-3x + 5`, `x - 7`, `4x`. */
function lineTex(m: number, b: number): string {
  const term = slopeTermTex(m);
  return b === 0 ? term : `${term} ${op(b)} ${Math.abs(b)}`;
}

/** The same expression as a mathjs-parseable answer key: `-3*x + 5`, `x - 7`. */
function linearKey(m: number, b: number): string {
  const term = m === 1 ? "x" : m === -1 ? "-x" : `${m}*x`;
  return b === 0 ? term : `${term} ${op(b)} ${Math.abs(b)}`;
}

/** A nonzero magnitude in `[1, max]`, signed by a fresh coin flip. */
function signedInt(rng: Rng, max: number, min = 1): number {
  const magnitude = rng.int(min, max);
  return rng.int(0, 1) === 1 ? -magnitude : magnitude;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/**
 * L1, assemble slope-intercept form from the two numbers that define it: a slope and the
 * point where the line meets the `y`-axis. Nothing to rearrange, so the whole item is the
 * question "which letter does each number belong to".
 */
export const d7_lf2_slope_intercept_l1: ItemTemplate = {
  template_id: "d7.lf2.slope-intercept.l1",
  node_id: LF2_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const m = signedInt(rng, 5);
    const b = signedInt(rng, 9);
    return {
      prompt: `A line has slope $m = ${m}$ and crosses the $y$-axis at the point $(0, ${b})$. Write that line in slope-intercept form.${RHS_TASK}`,
      answer: expressionAnswer(linearKey(m, b), ["x"], "combined_polynomial"),
      params: { m, b },
      hints: [
        "Slope-intercept form is $y = mx + b$, and this problem hands you one value for each of those two letters.",
        "The slope is the number that multiplies $x$, so it belongs in front of $x$ rather than standing on its own.",
        "Every point on the $y$-axis has $x = 0$, so the second coordinate of the given point is the constant that finishes the expression.",
      ],
      worked_solution: [
        "Slope-intercept form is $y = mx + b$, where $m$ is the slope and $b$ is the $y$-coordinate of the point where the line crosses the $y$-axis.",
        `The slope is $${m}$, so the variable term is $${slopeTermTex(m)}$.`,
        `The line crosses the $y$-axis at $(0, ${b})$, so $b = ${b}$.`,
        `Right-hand side: $${lineTex(m, b)}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m}:${params.b}`,
};

/**
 * L2a, a line PARALLEL to a given one through a given point. The slope is copied straight
 * across, so the whole problem is the second half: substitute the point and solve for the
 * intercept. The point is always off the given line, so the answer is a genuinely different
 * line rather than the one already on the page.
 */
export const d7_lf2_parallel_point_l2: ItemTemplate = {
  template_id: "d7.lf2.parallel-point.l2",
  node_id: LF2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const m = signedInt(rng, 3);
    const b0 = signedInt(rng, 8);
    const x1 = signedInt(rng, 3);
    // Draw the ANSWER's intercept and derive the point from it, rather than the other way
    // round: a nonzero `c` keeps the "solve for b" step real, `c != b0` keeps the parallel
    // line off the given one, and the point's coordinates stay small enough to plot.
    let c = signedInt(rng, 7);
    while (c === b0) {
      c = signedInt(rng, 7);
    }
    const y1 = c + m * x1;
    return {
      prompt: `The line $y = ${lineTex(m, b0)}$ is given. A second line passes through $(${x1}, ${y1})$ and is parallel to it. Write that second line in slope-intercept form.${RHS_TASK}`,
      answer: expressionAnswer(linearKey(m, c), ["x"], "combined_polynomial"),
      params: { m, b0, x1, y1, c },
      hints: [
        "Two lines that never meet have the same steepness, so the new line reuses the slope of the line you were given.",
        "Write $y = mx + b$ with that slope already in place and $b$ still unknown.",
        "Substitute the coordinates of the point for $x$ and for $y$, then solve the equation that is left for $b$.",
      ],
      worked_solution: [
        `Parallel lines have equal slopes, so the second line also has slope $${m}$.`,
        `Substitute the point $(${x1}, ${y1})$ into $y = ${slopeTermTex(m)} + b$: $${y1} = ${m} \\times ${sp(x1)} + b$.`,
        `That simplifies to $${y1} = ${m * x1} + b$, so $b = ${c}$.`,
        `Right-hand side: $${lineTex(m, c)}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m}:${params.c}`,
};

/**
 * L2b, classify a PAIR of lines. The second line is never solved for `y`, so both slopes
 * have to be brought into the same form before anything can be compared, and the three-way
 * call means a student who only knows one of the two tests cannot pass by elimination.
 *
 * The `neither` branch is the flipped-fraction trap on purpose: its second slope is the
 * first one turned upside down WITHOUT a sign change, so the pair looks perpendicular and
 * multiplies to `1`. That is the single most common miss on this node, and here it is a
 * third of the draws rather than an afterthought.
 */
export const d7_lf2_pair_classify_l2: ItemTemplate = {
  template_id: "d7.lf2.pair-classify.l2",
  node_id: LF2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    // kind 0 parallel, 1 perpendicular, 2 neither (the flipped-but-not-negated pair).
    const kind = rng.int(0, 2);
    let p = rng.int(1, 5);
    let q = rng.int(1, 5);
    // Coprime keeps the printed fraction in lowest terms; p != q keeps the flipped
    // fraction genuinely different from the original (and the slope off +/-1).
    while (p === q || gcd(p, q) !== 1) {
      p = rng.int(1, 5);
      q = rng.int(1, 5);
    }
    const sneg = rng.int(0, 1);
    const s = sneg === 1 ? -1 : 1;
    const b1 = signedInt(rng, 6);
    const k = rng.int(2, 3);
    // Line A has slope s*p/q. Line B's slope, as a fraction n2/d2 with d2 > 0.
    const n2 = kind === 0 ? s * p : kind === 1 ? -s * q : s * q;
    const d2 = kind === 0 ? q : p;
    const yCoeff = d2 * k;
    const xCoeff = n2 * k;
    let e = signedInt(rng, 4);
    // Equal slopes plus an equal intercept would be ONE line, not a parallel pair.
    while (kind === 0 && e === b1) {
      e = signedInt(rng, 4);
    }
    const constant = yCoeff * e;
    const fracTex = (num: number, den: number): string =>
      den === 1 ? `${num}` : `${num < 0 ? "-" : ""}\\dfrac{${Math.abs(num)}}{${den}}`;
    const slopeATex = fracTex(s * p, q);
    const slopeBTex = fracTex(n2, d2);
    const termA = q === 1 ? slopeTermTex(s * p) : `${slopeATex}x`;
    const termB = d2 === 1 ? slopeTermTex(n2) : `${slopeBTex}x`;
    // A negative second factor needs its own brackets, or the product reads as a subtraction.
    const factorB = n2 < 0 ? `\\left(${slopeBTex}\\right)` : slopeBTex;
    const word = kind === 0 ? "parallel" : kind === 1 ? "perpendicular" : "neither";
    const compare =
      kind === 0
        ? `The two slopes are equal and the $y$-intercepts differ, so the lines run alongside each other and never meet.`
        : kind === 1
          ? `Multiply the slopes: $${slopeATex} \\times ${factorB} = -1$, which is the test for a right angle.`
          : `Multiply the slopes: $${slopeATex} \\times ${factorB} = 1$. A right angle needs $-1$, and the slopes are not equal either, so no relationship holds.`;
    return {
      prompt: `Line A is $y = ${termA} ${op(b1)} ${Math.abs(b1)}$ and line B is $${yCoeff}y = ${xCoeff}x ${op(constant)} ${Math.abs(constant)}$. Are the two lines parallel, perpendicular, or neither? Answer with exactly one of those three words, typed in lowercase.`,
      answer: multipleChoiceAnswer(word),
      params: { kind, p, q, sneg, b1, k, e },
      hints: [
        "Two slopes can only be compared once they are read from the same form, so solve any equation that is not yet written as $y = mx + b$ for $y$ first.",
        "With both slopes in hand, run two tests: equal slopes mean the lines never meet, and slopes whose product is $-1$ mean they cross at a right angle.",
        // Every outcome word is also this template's answer key on some draw, so the
        // relationships are described rather than named: "neither" here would leak.
        "If both tests fail then no relationship holds, which is exactly what a flipped fraction gives: turning $\\dfrac{a}{b}$ into $\\dfrac{b}{a}$ and leaving the sign alone makes the product $1$, and a right angle needs $-1$.",
      ],
      worked_solution: [
        `Line A is already solved for $y$, so its slope is the coefficient of $x$: $${slopeATex}$.`,
        `Divide line B through by $${yCoeff}$: $y = ${termB} ${op(e)} ${Math.abs(e)}$, so its slope is $${slopeBTex}$.`,
        compare,
        kind === 2
          ? "The two lines are neither parallel nor perpendicular."
          : `The two lines are ${word}.`,
      ],
    };
  },
  varietyKey: (params) => `${params.kind}:${params.p}:${params.q}:${params.sneg}`,
};

/**
 * L3a, the point-slope rearrangement: `y - y_1 = m(x - x_1)` into slope-intercept form.
 * Two moves, and both are places a student loses the item: the slope has to reach BOTH
 * terms in the bracket, and the constant that was sitting beside `y` has to cross the
 * equals sign before the intercept is right. Copying the prompt's product back untouched
 * is graded `not_simplified` rather than correct, which is the point of the form profile.
 */
export const d7_lf2_point_slope_l3: ItemTemplate = {
  template_id: "d7.lf2.point-slope.l3",
  node_id: LF2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    // |m| >= 2 so the prompt never prints a bare or invisible coefficient on the bracket.
    const m = signedInt(rng, 5, 2);
    const x1 = signedInt(rng, 3);
    // The intercept is drawn and the point derived from it, so the final constant is
    // always nonzero (the "combine the constants" step is real) and always small. A point
    // on the x-axis is redrawn as well, since the prompt would then print "y - 0".
    let c = signedInt(rng, 9);
    while (c + m * x1 === 0) {
      c = signedInt(rng, 9);
    }
    const y1 = c + m * x1;
    const shifted = -m * x1;
    return {
      prompt: `Rewrite $y ${op(-y1)} ${Math.abs(y1)} = ${m}(x ${op(-x1)} ${Math.abs(x1)})$ in slope-intercept form.${RHS_TASK}`,
      answer: expressionAnswer(linearKey(m, c), ["x"], "combined_polynomial"),
      params: { m, x1, y1, c },
      hints: [
        "Point-slope form is one distribution away from slope-intercept form, so multiply the slope through the bracket before anything else, letting it reach both terms inside and not just the $x$.",
        "Once the right side is distributed, the left side still carries a constant beside $y$. Undo it with the opposite operation on both sides, then combine the two plain numbers that end up together.",
      ],
      worked_solution: [
        `Distribute the slope across the bracket: $${m}(x ${op(-x1)} ${Math.abs(x1)}) = ${slopeTermTex(m)} ${op(shifted)} ${Math.abs(shifted)}$.`,
        `The equation now reads $y ${op(-y1)} ${Math.abs(y1)} = ${slopeTermTex(m)} ${op(shifted)} ${Math.abs(shifted)}$.`,
        `${y1 > 0 ? "Add" : "Subtract"} $${Math.abs(y1)}$ on both sides to leave $y$ alone: $y = ${slopeTermTex(m)} ${op(shifted)} ${Math.abs(shifted)} ${op(y1)} ${Math.abs(y1)}$.`,
        `Combine the two constants: $${shifted} ${op(y1)} ${Math.abs(y1)} = ${c}$.`,
        `Right-hand side: $${lineTex(m, c)}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m}:${params.c}`,
};

/**
 * L3b, the node's flagship shape: a line PERPENDICULAR to one given in standard form,
 * through a given point. Three skills stacked, in an order where getting the first one
 * wrong quietly poisons the rest: solve `x + ny = c` for `y`, take the negative reciprocal
 * of the slope that appears, then substitute the point to find the intercept.
 *
 * The `x` coefficient is always `+1` or `-1`, so the reciprocal of the given slope is a
 * whole number and the answer can be typed into a text box without a fraction. The student
 * still meets the fraction: it is the slope of the GIVEN line, the one they must invert.
 */
export const d7_lf2_perpendicular_standard_l3: ItemTemplate = {
  template_id: "d7.lf2.perpendicular-standard.l3",
  node_id: LF2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const sa = rng.int(0, 1) === 1 ? -1 : 1;
    const n = signedInt(rng, 5, 2);
    // Nonzero, so neither the standard form nor the rearranged step ever prints "+ 0".
    const given = signedInt(rng, 9);
    // Slope of the given line is -sa/n; write it with a positive denominator.
    const slopeNum = n < 0 ? sa : -sa;
    const slopeDen = Math.abs(n);
    const givenSlopeTex = `${slopeNum < 0 ? "-" : ""}\\dfrac{1}{${slopeDen}}`;
    // The negative reciprocal of -sa/n is n/sa, and sa is its own reciprocal.
    const m = n * sa;
    const x1 = signedInt(rng, 3);
    // Same trick as the other point shapes: draw the intercept, derive the point. A zero
    // intercept would turn the answer into a bare monomial and erase the last step.
    const c = signedInt(rng, 9);
    const y1 = c + m * x1;
    const givenTex = `${sa === 1 ? "" : "-"}x ${op(n)} ${Math.abs(n)}y = ${given}`;
    const movedTex = `${n}y = ${sa === 1 ? "-x" : "x"} ${op(given)} ${Math.abs(given)}`;
    return {
      prompt: `The line $${givenTex}$ is given. A second line passes through $(${x1}, ${y1})$ and is perpendicular to it. Write that second line in slope-intercept form.${RHS_TASK}`,
      answer: expressionAnswer(linearKey(m, c), ["x"], "combined_polynomial"),
      params: { sa, n, given, x1, y1, m, c },
      hints: [
        "The given equation is not solved for $y$ yet, and a slope can only be read once it is, so isolate $y$ first.",
        "Perpendicular slopes are negative reciprocals: turn the slope you found upside down and change its sign.",
        "With the new slope known, substitute the coordinates of the point into $y = mx + b$ and solve for $b$.",
      ],
      worked_solution: [
        `Move the $x$ term across in the given equation: $${movedTex}$.`,
        `Divide by $${n}$: the given line has slope $${givenSlopeTex}$.`,
        `Perpendicular slopes are negative reciprocals, so flip $${givenSlopeTex}$ over and change its sign. The second line has slope $${m}$.`,
        `Substitute $(${x1}, ${y1})$ into $y = ${slopeTermTex(m)} + b$: $${y1} = ${m} \\times ${sp(x1)} + b$, so $b = ${c}$.`,
        `Right-hand side: $${lineTex(m, c)}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m}:${params.c}`,
};

/** Every LF.2 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const LF2_TEMPLATES: readonly ItemTemplate[] = [
  d7_lf2_slope_intercept_l1,
  d7_lf2_parallel_point_l2,
  d7_lf2_pair_classify_l2,
  d7_lf2_point_slope_l3,
  d7_lf2_perpendicular_standard_l3,
];
