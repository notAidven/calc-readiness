import {
  type GenerateContext,
  type ItemTemplate,
  intervalAnswer,
  numericAnswer,
  pointAnswer,
  type Rng,
  solutionSetAnswer,
} from "../../../template";
// FUN.2 is D6's one copy of what the interval answer field advertises, and the guard that
// keeps a key off it. Imported rather than restated: a second copy here is exactly how the
// bound this template keys came to be the one the placeholder prints.
import { unadvertisedBound } from "../FUN.2";

/**
 * FUN.10 practice templates: absolute-value functions, the vee, its vertex, and the
 * transformations that move and reshape it. Themed for "The Gearwright's Menagerie";
 * Atomic Age era, so the world the word problems draw on is the telemetry loft's chart
 * recorder plotting a DEVIATION FROM A SET POINT, which is the framing the era's style
 * guide authors for this node. Nothing here reaches for the node's building: a power
 * station is not a picture of a vee, however tempting the lattice is (D-ERA8).
 *
 * ## The load-bearing idea, and where each shape sits against it
 *
 * The vertex is where the INSIDE of the bars is zero, which is why the vertex of
 * `|x - 3|` sits at positive three. Every shape below is built so that reading that sign
 * backwards produces a visibly wrong answer rather than a near miss:
 *
 *  - **L1** `deviation` evaluates the bare distance, so the fold is met before anything
 *    outside the bars exists.
 *  - **L2a** `vertex` asks for the corner as a coordinate pair, which is the sign question
 *    on its own.
 *  - **L2b** `reach` asks which two inputs put the trace at a given height, so the two
 *    branches the bars allow are the answer rather than a step inside one.
 *  - **L3a** `range` asks for the range in interval notation, which needs the vertex height
 *    AND the direction the arms run, and is the one shape a reflected draw answers
 *    differently.
 *  - **L3b** `setpoint` reaches the same two-branch split through a stretch and a shift, so
 *    the bars have to be isolated before they can be split.
 *
 * ## Themed only where the math forms a real word problem
 *
 * `deviation` and `reach` are genuine chart-recorder problems and are themed for
 * `form === "practice"` only, so the neutral assessment prompt stays byte-identical and
 * `validateTemplates` (which samples form "A") reads the plain mathematics. `vertex`,
 * `range` and `setpoint` are abstract graph questions that no scenario improves, so they
 * carry no framing at all rather than a decorative lead-in.
 *
 * ## Answer shapes, and why each helper
 *
 * Every key is typeable from a phone keyboard's first layer, deliberately: an
 * absolute-value expression as an ANSWER would need `abs(`, and the notation dispatch in
 * `apps/web/src/lessons/answerFormat.ts` reaches no tag for an `expression` key carrying
 * one, so the learner would meet a bare "Your answer" over notation nothing on screen
 * names. So the answers here are a number, a coordinate pair, a solution roster and an
 * interval, and the bars stay on the PROMPT side throughout.
 */

export const FUN10_NODE = "FUN.10";

/** `x - 3` / `x + 3`, the argument as a learner reads it. Its zero sits at `h`. */
function argTex(h: number): string {
  return h < 0 ? `x + ${-h}` : `x - ${h}`;
}

/** A number as it reads inside a larger expression: `4` stays, `-4` gains brackets. */
function numTex(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** The tail outside the bars: ` + 7`, ` - 4`, or nothing when there is no shift. */
function tailTex(k: number): string {
  if (k === 0) {
    return "";
  }
  return k < 0 ? ` - ${-k}` : ` + ${k}`;
}

/** The coefficient in front of the bars, with the unit magnitudes tidied away. */
function coeffTex(a: number): string {
  if (a === 1) {
    return "";
  }
  if (a === -1) {
    return "-";
  }
  return `${a}`;
}

/** The whole rule `a|x - h| + k` as one KaTeX fragment (no `$` delimiters). */
function ruleTex(a: number, h: number, k: number): string {
  return `${coeffTex(a)}\\left\\lvert ${argTex(h)} \\right\\rvert${tailTex(k)}`;
}

/** The bars alone, `|x - h|`, for the steps that isolate them. */
function barsTex(h: number): string {
  return `\\left\\lvert ${argTex(h)} \\right\\rvert`;
}

/**
 * The roster example a prompt shows so a learner knows the braces are wanted.
 *
 * `{4, 9}` cannot be an answer to either roster shape here: both key a pair symmetric about
 * a whole-number centre, and 4 and 9 centre on 6.5.
 */
const ROSTER_TASK = " Give every solution, listing them in braces, such as {4, 9}.";

/**
 * L1, the bare deviation: what the recorder draws for one reading against a set point.
 *
 * The whole content is the fold. Nothing sits outside the bars, so a learner who keeps the
 * sign of the difference is wrong by exactly the thing this tier is teaching, and a reading
 * is drawn on BOTH sides of the set point across the pool so neither branch can be missed.
 */
export const d6_fun10_deviation_l1: ItemTemplate = {
  template_id: "d6.fun10.deviation.l1",
  node_id: FUN10_NODE,
  difficulty: 1,
  concept: "absolute value as a distance",
  generate(rng: Rng, ctx?: GenerateContext) {
    const setPoint = rng.int(3, 14);
    let reading = rng.int(-4, 24);
    while (reading === setPoint) {
      reading = rng.int(-4, 24);
    }
    const diff = reading - setPoint;
    const value = Math.abs(diff);
    const bars = `\\left\\lvert x - ${setPoint} \\right\\rvert`;
    return {
      prompt:
        ctx?.form === "practice"
          ? `A chart recorder plots how far each reading sits from a set point of $${setPoint}$, drawing $d(x) = ${bars}$. What does it draw for a reading of $${numTex(reading)}$? Enter one number.`
          : `Evaluate $f(${reading})$ for $f(x) = ${bars}$. Enter one number.`,
      answer: numericAnswer(`${value}`),
      params: { setPoint, reading },
      hints: [
        "The bars report a distance, so subtract the number inside them from the input first and keep whatever that leaves, sign and all.",
        "Then apply the bars: a distance is never negative, so a negative difference comes back as its size and a positive one comes back unchanged.",
      ],
      worked_solution: [
        `Work inside the bars first: $${numTex(reading)} - ${setPoint} = ${numTex(diff)}$.`,
        diff < 0
          ? `The bars report a distance, so the negative difference comes back as its size: $\\left\\lvert ${numTex(diff)} \\right\\rvert = ${value}$.`
          : `The difference is already positive, so the bars hand it straight back: $\\left\\lvert ${diff} \\right\\rvert = ${value}$.`,
        `The answer is $${value}$.`,
      ],
    };
  },
  varietyKey: (params) => {
    const setPoint = params.setPoint ?? 0;
    const reading = params.reading ?? 0;
    return `dev:${Math.abs(reading - setPoint)}:${reading < setPoint ? 0 : 1}`;
  },
};

/**
 * L2a, the vertex as a coordinate pair.
 *
 * A point rather than a bare number on purpose: the x-coordinate is the sign question and
 * the y-coordinate is the shift outside the bars, so an answer that gets one and not the
 * other is marked wrong in a way that names which half went astray. The stretch is drawn
 * with both signs, and it changes neither coordinate, which is the second thing the tier
 * teaches.
 */
export const d6_fun10_vertex_l2: ItemTemplate = {
  template_id: "d6.fun10.vertex.l2",
  node_id: FUN10_NODE,
  difficulty: 2,
  concept: "vertex from the inside of the bars",
  generate(rng: Rng) {
    const amag = rng.int(1, 4);
    const aneg = rng.int(0, 1);
    const a = aneg === 1 ? -amag : amag;
    let h = 0;
    do {
      h = rng.int(-7, 7);
    } while (h === 0);
    let k = 0;
    // The shared point placeholder reads "A point, e.g. (6, -7)", and a placeholder must
    // never answer a served item, so that one pair is redrawn.
    do {
      k = rng.int(-8, 8);
    } while (k === 0 || (h === 6 && k === -7));
    return {
      prompt: `The graph of $f(x) = ${ruleTex(a, h, k)}$ is a vee. Give its vertex as a coordinate pair, written like this example: \`(9, 12)\`.`,
      answer: pointAnswer(`(${h}, ${k})`),
      params: { amag, aneg, h, k },
      hints: [
        "The corner sits where the quantity inside the bars is zero, so set that quantity equal to zero and solve it for the input.",
        "Read the sign carefully: the input that empties the bars is the one that cancels the number written inside them, not the number itself.",
        "Then put that input back through the whole rule. The bars hand back zero there, so whatever stands outside them is the height of the corner.",
      ],
      worked_solution: [
        `Set the inside of the bars to zero: $${argTex(h)} = 0$ gives $x = ${h}$.`,
        `At that input the bars hand back zero, so the number in front of them contributes nothing: $f(${h}) = ${a} \\times 0${tailTex(k)} = ${k}$.`,
        `The vertex is $(${h},\\, ${k})$.`,
      ],
    };
  },
  varietyKey: (params) => `vertex:${params.h ?? 0}:${params.k ?? 0}`,
};

/**
 * L2b, the two inputs at which a bare deviation trace reads a given height.
 *
 * Reading a height off a vee is graph interpretation rather than equation solving, and it
 * is where the two-branch structure of the bars is visible as two crossings on one picture.
 * The set point and the height are drawn so both hours land at or above one, which keeps
 * the chart-recorder reading honest.
 */
export const d6_fun10_reach_l2: ItemTemplate = {
  template_id: "d6.fun10.reach.l2",
  node_id: FUN10_NODE,
  difficulty: 2,
  concept: "where a vee reaches a given height",
  generate(rng: Rng, ctx?: GenerateContext) {
    const setPoint = rng.int(5, 14);
    const height = rng.int(1, Math.min(5, setPoint - 1));
    const low = setPoint - height;
    const high = setPoint + height;
    const bars = `\\left\\lvert x - ${setPoint} \\right\\rvert`;
    return {
      prompt:
        ctx?.form === "practice"
          ? `A chart recorder draws the deviation $d(x) = ${bars}$ against the hour $x$. At which hours does the trace read $${height}$?${ROSTER_TASK}`
          : `Solve $${bars} = ${height}$.${ROSTER_TASK}`,
      answer: solutionSetAnswer(`{${low}, ${high}}`),
      params: { setPoint, height },
      hints: [
        "The bars report a distance from the number inside them, and a given distance is available on both sides of it, so the quantity in the bars can come out positive or negative.",
        "Write the two ordinary equations that gives, one with the plain number on the right and one with its negative, then solve each on its own.",
      ],
      worked_solution: [
        `The bars say $x - ${setPoint}$ sits $${height}$ from zero, and a quantity can sit that far on either side, so the rule splits into $x - ${setPoint} = ${height}$ and $x - ${setPoint} = -${height}$.`,
        `Add $${setPoint}$ to both sides of the first: $x = ${high}$.`,
        `Do the same to the second: $x = ${low}$.`,
        `Both work, so the solution set is $\\{${low}, ${high}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `reach:${params.setPoint ?? 0}:${params.height ?? 0}`,
};

/**
 * L3a, the range in interval notation.
 *
 * The flagship interpretation shape, because it cannot be answered without BOTH readings:
 * the vertex height, and which way the arms run from it. A reflected draw answers with the
 * other ray, so a learner who has learned "the range of a vee starts at its vertex and goes
 * up" is contradicted by half the pool rather than by a sentence.
 *
 * The vertex height is reached, so its bracket is square, and the infinite end is round;
 * that pairing is what `intervalAnswer` grades and what the shared interval placeholder
 * names for the learner.
 */
export const d6_fun10_range_l3: ItemTemplate = {
  template_id: "d6.fun10.range.l3",
  node_id: FUN10_NODE,
  difficulty: 3,
  concept: "range and direction of a vee",
  generate(rng: Rng) {
    const amag = rng.int(1, 5);
    const aneg = rng.int(0, 1);
    const a = aneg === 1 ? -amag : amag;
    let h = 0;
    do {
      h = rng.int(-8, 8);
    } while (h === 0);
    let drawn = 0;
    do {
      drawn = rng.int(-9, 9);
    } while (drawn === 0);
    // A reflected vee keys the downward ray `(-inf, k]`, which the interval field prints as
    // its own example at one value of k. Shifted before anything else reads it, so the prompt,
    // the params and the worked solution all describe the vertex the answer names.
    const k = unadvertisedBound(drawn, true, a > 0);
    return {
      prompt: `The graph of $f(x) = ${ruleTex(a, h, k)}$ is a vee. Give the range of $f$ in interval notation.`,
      answer: intervalAnswer(a > 0 ? `[${k}, inf)` : `(-inf, ${k}]`),
      params: { amag, aneg, h, k },
      hints: [
        "The corner is the only turning point, so the height there is the extreme output. Find it by setting the inside of the bars to zero and reading what is left outside them.",
        "Every other input makes the bars positive, so the sign of the number multiplying them decides whether the graph climbs away from that height or drops away from it.",
        "The end at the corner is reached, so its bracket is square, while the end that runs away without limit takes the infinity symbol and a round bracket.",
      ],
      worked_solution: [
        `Set the inside of the bars to zero: $${argTex(h)} = 0$ at $x = ${h}$, and the bars hand back zero there.`,
        `So the turning height is $f(${h}) = ${a} \\times 0${tailTex(k)} = ${k}$.`,
        a > 0
          ? `Away from that input the bars are positive and $${a}$ is positive, so every other output is greater than $${k}$ and the vee opens upward.`
          : `Away from that input the bars are positive and $${a}$ is negative, so every other output is less than $${k}$ and the vee opens downward.`,
        a > 0
          ? `The outputs run upward from $${k}$ without limit, and $${k}$ itself is reached, so the range is $[${k}, \\infty)$.`
          : `The outputs run downward from $${k}$ without limit, and $${k}$ itself is reached, so the range is $(-\\infty, ${k}]$.`,
      ],
    };
  },
  varietyKey: (params) => `range:${params.aneg ?? 0}:${params.k ?? 0}`,
};

/**
 * L3b, the same two-branch split reached through a stretch and a shift.
 *
 * The bars cannot be split while anything is stacked on them, so this tier is L2b with two
 * moves in front of it, and one of those moves is a division by a number that is negative
 * on half the draws. The height is built as `a * d + k` from a whole-number distance `d`, so
 * both crossings land on integers and the roster stays typeable without a fraction bar.
 */
export const d6_fun10_setpoint_l3: ItemTemplate = {
  template_id: "d6.fun10.setpoint.l3",
  node_id: FUN10_NODE,
  difficulty: 3,
  concept: "isolate the bars, then split them",
  generate(rng: Rng) {
    const amag = rng.int(2, 4);
    const aneg = rng.int(0, 1);
    const a = aneg === 1 ? -amag : amag;
    let h = 0;
    do {
      h = rng.int(-6, 9);
    } while (h === 0);
    let k = 0;
    do {
      k = rng.int(-8, 8);
    } while (k === 0);
    const distance = rng.int(1, 6);
    const target = a * distance + k;
    const low = h - distance;
    const high = h + distance;
    return {
      prompt: `Solve $${ruleTex(a, h, k)} = ${target}$.${ROSTER_TASK}`,
      answer: solutionSetAnswer(`{${low}, ${high}}`),
      params: { amag, aneg, h, k, distance },
      hints: [
        "Get the bars standing alone before anything splits: take the number added outside them across, then divide by the number multiplying them.",
        "The number multiplying the bars may be negative, and dividing an equation by it is an ordinary step, so carry it out and read what the bars are left equal to.",
        "Once the bars stand against a plain number, the quantity inside them can sit that far above zero or that far below it, which is two ordinary equations to finish.",
      ],
      worked_solution: [
        `Take the number outside the bars across so they stand alone: $${a}${barsTex(h)} = ${a * distance}$.`,
        `Divide both sides by $${a}$: $${barsTex(h)} = ${distance}$.`,
        `A quantity sits $${distance}$ from zero on either side, so $${argTex(h)} = ${distance}$ or $${argTex(h)} = -${distance}$.`,
        `Solving each gives $x = ${high}$ and $x = ${low}$, so the solution set is $\\{${low}, ${high}\\}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `setpoint:${params.aneg ?? 0}:${(params.h ?? 0) - (params.distance ?? 0)}:${(params.h ?? 0) + (params.distance ?? 0)}`,
};

/** Every FUN.10 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const FUN10_TEMPLATES: readonly ItemTemplate[] = [
  d6_fun10_deviation_l1,
  d6_fun10_vertex_l2,
  d6_fun10_reach_l2,
  d6_fun10_range_l3,
  d6_fun10_setpoint_l3,
];
