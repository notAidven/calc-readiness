import {
  type GenerateContext,
  type ItemTemplate,
  numericAnswer,
  pointAnswer,
  type Rng,
} from "../../../template";

/**
 * CG.1 practice templates: the coordinate plane. Plot a point from two signed measurements,
 * read an intercept off a line in standard form, recover a missing endpoint from a midpoint,
 * and measure between two points with the distance formula.
 *
 * ## Era, and why this file does not read like the rest of D6
 *
 * CG.1 is the ONE Renaissance node on "The Gearwright's Menagerie" island; its ten siblings
 * are Industrial or Atomic Age. So the practice framing is surveying rather than machinery,
 * drawn from `docs/superpowers/specs/eras/era-06-early-modern/style-guide.md` (Lesson
 * framings, CG.1): a surveyor's grid chalked over the piazza with a bench mark at the origin,
 * ranging rods standing at plotted points, a distance across ground nobody can walk, and a
 * facade centered between its two ends. The vocabulary matches `../../theming.ts`'s
 * `SURVEY_YARD_NOUNS`. Nothing on that era's "Explicitly absent" list (structural iron,
 * machine-made brick, soot, reinforced concrete, the curtain wall) appears in any prompt.
 *
 * The theme is SKIN. It is applied only when `ctx.form === "practice"`, so the neutral
 * assessment forms stay byte-identical, and no `answer`, `params`, `difficulty` or grader
 * spec depends on the wording. Every scenario string is chosen after all the math params are
 * drawn, so the pool rebuild stays deterministic.
 *
 * ## Distinct from the frozen CG.1 ASSESSMENT items
 *
 * `product/nodes/CG.1/index.ts` already owns two shapes for this node: `prod.cg-1.l2`, the
 * midpoint of two given points, and a golden distance fixture answered as an exact simplified
 * radical, `sqrt(13)`. Neither is reproduced here, deliberately and in both directions:
 *
 *  - MIDPOINT is inverted. `d6.cg1.other-endpoint.l2` gives the learner one end and the
 *    midpoint and asks for the other end, which is the same rule run backwards rather than
 *    the same question with new numbers.
 *  - DISTANCE is drawn from Pythagorean triples, so both distance shapes here answer with a
 *    WHOLE number under `numericAnswer` instead of a simplified radical. CG.1's registry
 *    prereq is `NUM.4` alone, so signed arithmetic may be assumed and radical form may not.
 *
 * Every key is computed by real arithmetic, so `validateTemplates` grades each sampled
 * instance correct, and each template declares a `varietyKey` over the answer it produces so
 * a cell never freezes two instances that reduce to the same point or the same length.
 */

export const CG1_NODE = "CG.1";

/* ------------------------------------------------------------------ shared helpers */

/** Greatest common divisor, positive. */
function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/** A signed integer as KaTeX, parenthesized when negative so `$8 - (-3)$` reads. */
function signed(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** An ordered pair as KaTeX, with the thin space the lesson's own diagrams use. */
function pairTex(x: number, y: number): string {
  return `(${x},\\, ${y})`;
}

/** An ordered pair as the structural point grader reads it. */
function pairKey(x: number, y: number): string {
  return `(${x}, ${y})`;
}

/**
 * `ax + by = c` as KaTeX.
 *
 * No unit-coefficient branch, because both intercept templates below redraw until
 * `|a| >= 2` and `|b| >= 2`: a coefficient of one would print `1x` and would also make the
 * "divide both sides" step restate itself.
 */
function standardFormTex(a: number, b: number, c: number): string {
  return `${a}x ${b < 0 ? "-" : "+"} ${Math.abs(b)}y = ${c}`;
}

/**
 * The standard-form line whose intercepts sit exactly at `(xi, 0)` and `(0, yi)`.
 *
 * Taking `c` as the least common multiple of the two magnitudes is what keeps every
 * coefficient whole: `a = c / xi` and `b = c / yi` are then integers by construction, and
 * they share no factor, so the equation arrives already in lowest terms.
 */
function lineThroughIntercepts(
  xi: number,
  yi: number,
): { a: number; b: number; c: number } {
  const c = (Math.abs(xi) * Math.abs(yi)) / gcd(xi, yi);
  return { a: c / xi, b: c / yi, c };
}

/**
 * True when a pair of intercepts gives an equation worth printing: both coefficients at
 * least two in magnitude, so neither side of the equation opens on a bare `x` or `y`.
 */
function usableIntercepts(xi: number, yi: number): boolean {
  const { a, b } = lineThroughIntercepts(xi, yi);
  return Math.abs(a) >= 2 && Math.abs(b) >= 2;
}

/** A count's unit noun, singular when the count is one. */
function plural(count: number, noun: string): string {
  return Math.abs(count) === 1 ? noun : `${noun}s`;
}

/** A nonzero integer in `[-max, max]`. */
function nonzeroInt(rng: Rng, max: number): number {
  let value = 0;
  while (value === 0) {
    value = rng.int(-max, max);
  }
  return value;
}

/** Which way the first coordinate is counted, as the prompt and the solution word it. */
const ACROSS_WORDS = ["to the right of", "to the left of"] as const;

/** And the second. Phrased so it reads the same after "the bench mark" or after "it". */
const UP_WORDS = ["above", "below"] as const;

/**
 * Leg pairs whose hypotenuse is a whole number, so both distance shapes answer with an
 * integer rather than a radical. Both orders of each triple are listed, so a learner meets
 * the long leg across as often as up.
 */
const WHOLE_LEG_PAIRS: readonly (readonly [number, number])[] = [
  [3, 4],
  [4, 3],
  [6, 8],
  [8, 6],
  [5, 12],
  [12, 5],
  [9, 12],
  [12, 9],
  [8, 15],
  [15, 8],
  [12, 16],
  [16, 12],
];

/* ---------------------------------------------------------------------------- L1 */

/**
 * L1, a position from two signed measurements: so many units across from the origin and so
 * many up or down from it, written as an ordered pair.
 *
 * The whole difficulty is the SIGN and the ORDER, which is why the two directions are drawn
 * independently: a learner who reads both measurements as magnitudes lands in the wrong
 * quadrant, and one who writes them the other way round lands on the reflected point.
 */
export const d6_cg1_plot_offset_l1: ItemTemplate = {
  template_id: "d6.cg1.plot-offset.l1",
  node_id: CG1_NODE,
  difficulty: 1,
  generate(rng: Rng, ctx?: GenerateContext) {
    const ax = rng.int(1, 9);
    const ay = rng.int(1, 9);
    const ex = rng.int(0, 1);
    const ey = rng.int(0, 1);
    const x = ex === 1 ? -ax : ax;
    const y = ey === 1 ? -ay : ay;
    const across = ACROSS_WORDS[ex] as string;
    const up = UP_WORDS[ey] as string;
    const neutral = `Start at the origin. A point sits $${ax}$ ${plural(ax, "unit")} ${across} it and $${ay}$ ${plural(ay, "unit")} ${up} it. Write the point as an ordered pair.`;
    const themed = `A survey grid is chalked over the piazza, and every measurement starts from the bench mark at its origin. A ranging rod stands $${ax}$ ${plural(ax, "pace")} ${across} the bench mark and $${ay}$ ${plural(ay, "pace")} ${up} it. Write the rod's position as an ordered pair.`;
    return {
      prompt: ctx?.form === "practice" ? themed : neutral,
      answer: pointAnswer(pairKey(x, y)),
      params: { ax, ay, ex, ey },
      hints: [
        "A position is two signed measurements taken from the origin, so settle the sign of each one before writing anything down: right and up count as positive, left and down count as negative.",
        "The across measurement goes first and the up measurement second, both inside one pair of parentheses with a comma between them.",
      ],
      worked_solution: [
        `The first coordinate counts across from the origin, and ${ex === 1 ? "a measurement to the left counts negative" : "a measurement to the right counts positive"}, so it is $${x}$.`,
        `The second coordinate counts up from the origin, and ${ey === 1 ? "a measurement below it counts negative" : "a measurement above it counts positive"}, so it is $${y}$.`,
        `Across first and up second, the position is $${pairTex(x, y)}$.`,
      ],
    };
  },
  varietyKey: (params) => {
    const x = params.ex === 1 ? -(params.ax ?? 0) : (params.ax ?? 0);
    const y = params.ey === 1 ? -(params.ay ?? 0) : (params.ay ?? 0);
    return `${x}:${y}`;
  },
};

/* ---------------------------------------------------------------------------- L2 */

/**
 * L2a, one intercept of a line given in standard form, reported as a POINT.
 *
 * Two things are being tested at once and the second is the one learners drop: that an
 * intercept is found by setting the OTHER coordinate to zero, and that the answer is a point
 * rather than the number the division produced. Reporting `6` where the answer is `(6, 0)`
 * is the near miss `pointAnswer`'s structural grading catches.
 */
export const d6_cg1_intercept_l2: ItemTemplate = {
  template_id: "d6.cg1.intercept.l2",
  node_id: CG1_NODE,
  difficulty: 2,
  generate(rng: Rng, ctx?: GenerateContext) {
    let xi = 0;
    let yi = 0;
    do {
      xi = nonzeroInt(rng, 9);
      yi = nonzeroInt(rng, 9);
    } while (!usableIntercepts(xi, yi));
    const { a, b, c } = lineThroughIntercepts(xi, yi);
    const which = rng.int(0, 1);
    const equation = standardFormTex(a, b, c);
    const axis = which === 0 ? "x" : "y";
    const neutral = `Find the $${axis}$-intercept of the line $${equation}$. Give it as an ordered pair.`;
    const themed = `A chalked line ruled across the surveyed piazza is recorded as $${equation}$, with the bench mark at the origin. Give the point where that line crosses the $${axis}$-axis as an ordered pair.`;
    return {
      prompt: ctx?.form === "practice" ? themed : neutral,
      answer: pointAnswer(which === 0 ? pairKey(xi, 0) : pairKey(0, yi)),
      params: { xi, yi, which },
      hints: [
        "An intercept is where the line meets an axis, and one coordinate is always zero there: on the horizontal axis the up coordinate is zero, and on the vertical axis the across coordinate is zero.",
        "Put that zero into the equation. One whole term drops out, and what is left is a single division for the coordinate you still want.",
        "The answer is a point, not just the number the division gave you, so the zero goes into the pair as well.",
      ],
      worked_solution:
        which === 0
          ? [
              `Every point on the $x$-axis has $y = 0$, so put $0$ in place of $y$.`,
              `The equation becomes $${a}x = ${c}$.`,
              `Divide both sides by $${a}$: $x = ${xi}$.`,
              `The $x$-intercept is the point $${pairTex(xi, 0)}$.`,
            ]
          : [
              `Every point on the $y$-axis has $x = 0$, so put $0$ in place of $x$.`,
              `The equation becomes $${b}y = ${c}$.`,
              `Divide both sides by $${b}$: $y = ${yi}$.`,
              `The $y$-intercept is the point $${pairTex(0, yi)}$.`,
            ],
    };
  },
  varietyKey: (params) => (params.which === 0 ? `x:${params.xi}` : `y:${params.yi}`),
};

/**
 * L2b, the midpoint rule run BACKWARDS: one end and the center are given, and the other end
 * is wanted.
 *
 * This is the shape that keeps the practice pool clear of the frozen assessment item, which
 * asks for the midpoint of two given points. It is also the harder half of the same rule,
 * because averaging forwards is one operation and undoing it is two, and the learner who
 * subtracts the midpoint from the known end instead of the other way round lands on a point
 * reflected through the wrong one.
 */
export const d6_cg1_other_endpoint_l2: ItemTemplate = {
  template_id: "d6.cg1.other-endpoint.l2",
  node_id: CG1_NODE,
  difficulty: 2,
  generate(rng: Rng, ctx?: GenerateContext) {
    let ax = 0;
    let ay = 0;
    let bx = 0;
    let by = 0;
    do {
      ax = rng.int(-8, 8);
      ay = rng.int(-8, 8);
      bx = rng.int(-8, 8);
      by = rng.int(-8, 8);
      // Both sums must be even for a lattice midpoint, and the two ends must be two
      // different points, or the "segment" is one point and the question is empty.
    } while ((ax + bx) % 2 !== 0 || (ay + by) % 2 !== 0 || (ax === bx && ay === by));
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const neutral = `The midpoint of the segment joining $${pairTex(ax, ay)}$ to a second point is $${pairTex(mx, my)}$. Find the second point, and give it as an ordered pair.`;
    const themed = `A facade is to be set out on the surveyed grid, centered exactly as this era centers everything. One end of its front stands at $${pairTex(ax, ay)}$ and the marked center of the front is at $${pairTex(mx, my)}$, both measured in paces from the bench mark. Give the position of the other end as an ordered pair.`;
    return {
      prompt: ctx?.form === "practice" ? themed : neutral,
      answer: pointAnswer(pairKey(bx, by)),
      params: { ax, ay, bx, by },
      hints: [
        "The center of a segment is the average of its two ends, taken one coordinate at a time, so the across coordinates and the up coordinates are two separate small problems.",
        "Averaging is halving, so read it backwards: the two ends add up to twice the center. Double the center coordinate, then take the known end away from it.",
      ],
      worked_solution: [
        `The center averages the two ends one coordinate at a time, so the two ends add up to twice the center in each coordinate.`,
        `Across: twice the center is $2 \\times ${signed(mx)} = ${2 * mx}$, and taking the known end away gives $${2 * mx} - ${signed(ax)} = ${bx}$.`,
        `Up: twice the center is $2 \\times ${signed(my)} = ${2 * my}$, and taking the known end away gives $${2 * my} - ${signed(ay)} = ${by}$.`,
        `The other end stands at $${pairTex(bx, by)}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.bx}:${params.by}`,
};

/* ---------------------------------------------------------------------------- L3 */

/**
 * L3a, the distance between two plotted points, with a right triangle underneath it.
 *
 * The legs are drawn from a whole-hypotenuse pair, so the answer is an integer and the
 * lesson never has to reach for radical form on a node whose only prereq is signed
 * arithmetic. Both coordinates of both points are free to be negative, which is where the
 * work is: a leg is how far apart two coordinates are, and a learner who keeps the sign of
 * the subtraction still squares it away, while one who subtracts the magnitudes does not.
 */
export const d6_cg1_distance_l3: ItemTemplate = {
  template_id: "d6.cg1.distance.l3",
  node_id: CG1_NODE,
  difficulty: 3,
  generate(rng: Rng, ctx?: GenerateContext) {
    let x1 = 0;
    let y1 = 0;
    let x2 = 0;
    let y2 = 0;
    let dx = 0;
    let dy = 0;
    do {
      const legs = rng.pick(WHOLE_LEG_PAIRS);
      dx = legs[0] as number;
      dy = legs[1] as number;
      x1 = rng.int(-12, 12);
      y1 = rng.int(-12, 12);
      x2 = rng.int(0, 1) === 1 ? x1 - dx : x1 + dx;
      y2 = rng.int(0, 1) === 1 ? y1 - dy : y1 + dy;
      // Keep the second point on a plot a learner could reasonably sketch.
    } while (Math.abs(x2) > 12 || Math.abs(y2) > 12);
    const distance = Math.round(Math.sqrt(dx * dx + dy * dy));
    const neutral = `Find the distance between $${pairTex(x1, y1)}$ and $${pairTex(x2, y2)}$. Enter one number.`;
    const themed = `Two ranging rods stand on the surveyed piazza, one at $${pairTex(x1, y1)}$ and one at $${pairTex(x2, y2)}$, measured in paces from the bench mark. A basin of standing water lies between them, so the gap cannot be paced out directly. How many paces apart are the two rods? Enter one number.`;
    return {
      prompt: ctx?.form === "practice" ? themed : neutral,
      answer: numericAnswer(String(distance)),
      params: { x1, y1, x2, y2 },
      hints: [
        "Two points and the corner square with them make a right triangle whose legs run along the grid, so start with the legs rather than with the direct route.",
        "One leg is how far apart the two across coordinates are and the other is how far apart the two up coordinates are. A gap is a length, so it counts as positive whichever order you subtract in.",
        "Square each leg, add the two squares, and the direct distance is the square root of that total.",
      ],
      worked_solution: [
        `Subtract the across coordinates: $${x2} - ${signed(x1)} = ${x2 - x1}$, so that leg is $${dx}$ long.`,
        `Subtract the up coordinates: $${y2} - ${signed(y1)} = ${y2 - y1}$, so that leg is $${dy}$ long.`,
        `Square the legs and add them: $${dx}^{2} + ${dy}^{2} = ${dx * dx} + ${dy * dy} = ${distance * distance}$.`,
        `Take the square root: $\\sqrt{${distance * distance}} = ${distance}$, so the two points are $${distance}$ apart.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${Math.abs((params.x2 ?? 0) - (params.x1 ?? 0))}:${Math.abs((params.y2 ?? 0) - (params.y1 ?? 0))}:${params.x1}:${params.y1}`,
};

/**
 * L3b, the node's composite shape: how long is the piece of a line that runs between its two
 * intercepts.
 *
 * Three of the node's four ideas stacked, which is what makes it the L3 flagship. Neither
 * endpoint is given, so both intercepts have to be produced first; the segment and the two
 * axes then make a right triangle whose corner is the origin and whose legs are the two
 * intercepts' distances from it, so the signs of the intercepts drop out of the length and a
 * learner who carries a negative into the squaring still lands correctly.
 */
export const d6_cg1_intercept_span_l3: ItemTemplate = {
  template_id: "d6.cg1.intercept-span.l3",
  node_id: CG1_NODE,
  difficulty: 3,
  generate(rng: Rng, ctx?: GenerateContext) {
    let xi = 0;
    let yi = 0;
    let legX = 0;
    let legY = 0;
    do {
      const legs = rng.pick(WHOLE_LEG_PAIRS);
      legX = legs[0] as number;
      legY = legs[1] as number;
      xi = rng.int(0, 1) === 1 ? -legX : legX;
      yi = rng.int(0, 1) === 1 ? -legY : legY;
    } while (!usableIntercepts(xi, yi));
    const { a, b, c } = lineThroughIntercepts(xi, yi);
    const equation = standardFormTex(a, b, c);
    const distance = Math.round(Math.sqrt(legX * legX + legY * legY));
    const neutral = `The line $${equation}$ crosses both axes. How long is the segment joining its two intercepts? Enter one number.`;
    const themed = `A chalked line is ruled across the surveyed piazza and recorded as $${equation}$, one unit to the pace, with the bench mark at the origin. The line is only wanted between the two axes it crosses. How many paces long is that piece of it? Enter one number.`;
    return {
      prompt: ctx?.form === "practice" ? themed : neutral,
      answer: numericAnswer(String(distance)),
      params: { xi, yi },
      hints: [
        "Neither end of the segment is given, so find them first: setting one coordinate to zero at a time turns the equation into a single division each time.",
        "The two crossings and the origin make a right triangle, because the axes meet at a right angle there.",
        "Its legs are how far each crossing sits from the origin, counted as positive lengths. Square them, add, and take the square root.",
      ],
      worked_solution: [
        `Set $y = 0$: the equation becomes $${a}x = ${c}$, so $x = ${xi}$ and the line crosses the $x$-axis at $${pairTex(xi, 0)}$.`,
        `Set $x = 0$: the equation becomes $${b}y = ${c}$, so $y = ${yi}$ and it crosses the $y$-axis at $${pairTex(0, yi)}$.`,
        `Those two crossings and the origin make a right triangle whose legs are $${legX}$ and $${legY}$ long.`,
        `Square the legs and add them: $${legX}^{2} + ${legY}^{2} = ${legX * legX} + ${legY * legY} = ${distance * distance}$.`,
        `Take the square root: $\\sqrt{${distance * distance}} = ${distance}$, so the segment between the intercepts is $${distance}$ long.`,
      ],
    };
  },
  varietyKey: (params) => `${params.xi}:${params.yi}`,
};

/** Every CG.1 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const CG1_TEMPLATES: readonly ItemTemplate[] = [
  d6_cg1_plot_offset_l1,
  d6_cg1_intercept_l2,
  d6_cg1_other_endpoint_l2,
  d6_cg1_distance_l3,
  d6_cg1_intercept_span_l3,
];
