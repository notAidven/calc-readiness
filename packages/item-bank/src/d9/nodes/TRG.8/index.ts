import { type ItemTemplate, type Rng, solutionSetAnswer } from "../../../template";

/**
 * TRG.8 practice templates: solving a basic trigonometric equation over one full revolution
 * and handing back EVERY heading that fits. Five shapes across the locked 1xL1 / 2xL2 / 2xL3
 * mix, each assigned to one of the node's three registry families (TRG.8 is `item_family:
 * true` with empty `prereqs`, so the families are its real prerequisites):
 *
 *  - L1  `sine-basic`        `unit_circle`       a positive sine, read straight off the circle;
 *  - L2a `cosine-negative`   `unit_circle`       the same move with the sign carrying the work;
 *  - L2b `tangent-basic`     `unit_circle`       a period of 180, so the pair is half a turn apart;
 *  - L3a `linear-in-trig`    `linear_form`       one algebra step, and only then the roster;
 *  - L3b `quadratic-in-form` `quadratic_in_form` factored by substitution, three headings out.
 *
 * ## Every roster is in DEGREES, and that is a checker finding rather than a preference
 *
 * Measured against the real v2 checker before any of this was written (D9_Domain_Plan.md,
 * "Solution-set rosters grade ONLY in degrees"):
 *
 *  - A roster cannot hold pi under `solutionSetAnswer`, under `exactSolutionSetAnswer`, or
 *    under either with `allowed_symbols: ["pi"]`. The failure is AT THE KEY, returning
 *    `scoring_error/invalid_answer_key`, which is the checker calling the item unauthorable
 *    rather than the learner wrong. So no prompt, hint or worked-solution step here is in
 *    radians, and no learner is ever shown a spelling the field would refuse.
 *  - The degree path is complete: braces are optional, order is free, and four-member rosters
 *    grade. `210 degrees` is `invalid_input/unknown_symbol`, so every prompt says to write the
 *    numbers only.
 *  - Members carry NO tolerance: `{36.9, 143.1}` is a `value_mismatch` against
 *    `{36.87, 143.13}`. Every roster below therefore lands on exact special headings, which is
 *    why each template draws a reference angle out of 30, 45 and 60 rather than a value.
 *
 * ## Why the hints are shaped the way they are
 *
 * The roster comparator separates three failures, and they are what makes this node
 * diagnostic: `incomplete_solution_set` (stopped after one heading), `extra_solution` (one
 * heading too many), and `value_mismatch` (the right count in the wrong quadrant). Stopping
 * early and picking the wrong quadrant are the two real misconceptions, so no hint here says
 * "check your work". Each hint ladder splits the value into its SIZE, which fixes the acute
 * reference angle, and its SIGN, which fixes the quadrants, because that split is exactly the
 * difference between the two failure codes.
 *
 * The sign hint states the rule over BOTH signs and stops there, which is `tangent-basic`'s
 * shape and now every shape's. Two of them used to state the placement for the learner's own
 * draw instead — *"so both headings sit in the second and third, one on each side of
 * $180^{\circ}$"* — which is the diagnosis this node exists to grade, performed for them.
 * Nothing flagged it and nothing could: those hints are FIXED across every draw, so no
 * variance check sees them move, and `hint_leaks_answer` matches the key as a value, which a
 * sentence of quadrant names never contains.
 *
 * ## Seeding note
 *
 * Shape seeded from *Precalculus: An Investigation of Functions* (Lippman & Rasmussen),
 * catalogued at opentextbookstore.com under Precalculus and licensed CC BY-SA: its
 * solving-trigonometric-equations section works `sin(t) = k` and `2cos(t) = 1` over one period
 * and its identities chapter runs the quadratic-by-substitution exercises. Nothing is
 * transcribed: the book solves over `[0, 2pi)` in radians, which the spike above rules out
 * entirely, so every instance here is re-derived by hand on the degree circle and every value
 * is redrawn by `generate()`.
 */

export const TRG8_NODE = "TRG.8";

/** The stated window, identical in all five prompts. */
const WINDOW = "0^{\\circ} \\le x < 360^{\\circ}";

type Fn = "sin" | "cos" | "tan";

const FN_TEX: Record<Fn, string> = { sin: "\\sin", cos: "\\cos", tan: "\\tan" };
const FN_WORD: Record<Fn, string> = { sin: "sine", cos: "cosine", tan: "tangent" };

/** The numeric code a `Fn` is recorded under in `template_params`, for the worked SVG. */
const FN_CODE: Record<Fn, number> = { sin: 0, cos: 1, tan: 2 };

/**
 * The exact value of `fn` at an acute special heading, unsigned, as LaTeX.
 *
 * Only 30, 45 and 60 are ever passed: those are the three whose values are exact, and the
 * checker's lack of tolerance makes anything else unauthorable.
 */
function exactTex(fn: Fn, ref: number): string {
  if (fn === "sin") {
    return ref === 30
      ? "\\dfrac{1}{2}"
      : ref === 45
        ? "\\dfrac{\\sqrt{2}}{2}"
        : "\\dfrac{\\sqrt{3}}{2}";
  }
  if (fn === "cos") {
    return ref === 30
      ? "\\dfrac{\\sqrt{3}}{2}"
      : ref === 45
        ? "\\dfrac{\\sqrt{2}}{2}"
        : "\\dfrac{1}{2}";
  }
  return ref === 30 ? "\\dfrac{\\sqrt{3}}{3}" : ref === 45 ? "1" : "\\sqrt{3}";
}

/** The same value with its sign in front. */
function signedTex(fn: Fn, ref: number, negative: boolean): string {
  return negative ? `-${exactTex(fn, ref)}` : exactTex(fn, ref);
}

/** The two quadrants the named function is negative (or positive) in, in words. */
function quadrantWords(fn: Fn, negative: boolean): string {
  if (fn === "sin") {
    return negative ? "third and fourth" : "first and second";
  }
  if (fn === "cos") {
    return negative ? "second and third" : "first and fourth";
  }
  return negative ? "second and fourth" : "first and third";
}

interface Placement {
  /** How this heading is reached from the reference angle, as LaTeX. */
  tex: string;
  value: number;
}

/**
 * The two headings, in ascending order, each written as the arithmetic that reaches it.
 *
 * The first-quadrant case is written as the bare reference angle rather than as
 * `0 + ref = ref`, which would be an equation restating itself and is what
 * `hasIdentityRestatement` fails a worked-solution step for.
 */
function placements(fn: Fn, ref: number, negative: boolean): Placement[] {
  const q1: Placement = { tex: `${ref}^{\\circ}`, value: ref };
  const q2: Placement = {
    tex: `180^{\\circ} - ${ref}^{\\circ} = ${180 - ref}^{\\circ}`,
    value: 180 - ref,
  };
  const q3: Placement = {
    tex: `180^{\\circ} + ${ref}^{\\circ} = ${180 + ref}^{\\circ}`,
    value: 180 + ref,
  };
  const q4: Placement = {
    tex: `360^{\\circ} - ${ref}^{\\circ} = ${360 - ref}^{\\circ}`,
    value: 360 - ref,
  };
  if (fn === "sin") {
    return negative ? [q3, q4] : [q1, q2];
  }
  if (fn === "cos") {
    return negative ? [q2, q3] : [q1, q4];
  }
  return negative ? [q2, q4] : [q1, q3];
}

/** The answer key: ascending, comma separated, braced. Order is free at the checker. */
function roster(headings: readonly number[]): string {
  return `{${[...headings].sort((a, b) => a - b).join(", ")}}`;
}

/**
 * The same roster typeset, for a worked-solution step.
 *
 * It carries the degree marks the prompt asks the learner to FIND, which the answer field
 * refuses on the way back in: `{60°, 120°}` is `invalid_input/parse_error` and
 * `{60 degrees, 120 degrees}` is `invalid_input/unknown_symbol`, both scored as a format
 * failure rather than as a wrong answer. So no step prints this alone. Every closing step
 * pairs it with {@link roster}, which is the spelling the field takes, the same way TRG.7's
 * intervals and TRG.9's radicals close on "typed as ...".
 */
function rosterTex(headings: readonly number[]): string {
  return `\\{${[...headings]
    .sort((a, b) => a - b)
    .map((h) => `${h}^{\\circ}`)
    .join(",\\; ")}\\}`;
}

/**
 * The one prompt shape all five templates share.
 *
 * It states the window in degrees and asks for the numbers only. Both halves are load
 * bearing: `210 degrees` grades `invalid_input/unknown_symbol`, and a window left unstated
 * turns a two-heading roster into a question with no finite answer.
 */
function solvePrompt(equationTex: string): string {
  return `Solve $${equationTex}$ for $${WINDOW}$. List every heading that fits, measured in degrees, and write the numbers only with no degree sign.`;
}

/** The steps shared by every shape once the function stands alone on the left. */
function rosterSteps(fn: Fn, ref: number, negative: boolean): string[] {
  const spots = placements(fn, ref, negative);
  const values = spots.map((s) => s.value);
  return [
    `Take the size of that value on its own. The acute heading whose ${FN_WORD[fn]} is $${exactTex(fn, ref)}$ is $${ref}^{\\circ}$, so the reference angle is $${ref}^{\\circ}$.`,
    `The value is ${negative ? "negative" : "positive"}, and ${FN_WORD[fn]} is ${negative ? "negative" : "positive"} in the ${quadrantWords(fn, negative)} quadrants, so the reference angle is placed in each of those: $${spots[0]?.tex ?? ""}$ and $${spots[1]?.tex ?? ""}$.`,
    `Both headings lie inside $${WINDOW}$, so the answer is $${rosterTex(values)}$, typed as ${roster(values)}.`,
  ];
}

/* ------------------------------------------------------------------ L1, `unit_circle` */

/**
 * L1, family `unit_circle`: a positive sine read straight off the circle.
 *
 * The baseline of the node, and the shape everything else is defined against: no algebra
 * before the lookup and no sign to negotiate, so the only thing being asked is whether the
 * learner knows the answer has TWO headings in it. A learner who submits `{30}` here gets
 * `incomplete_solution_set` back, which is the diagnosis this slot exists to make.
 *
 * THIN CELL, and knowingly so: the value has to be one of the three whose sine is exact, and
 * the positive sign is what keeps the slot at L1, so the parameter space is exactly three
 * instances. Widening it means either a negative value (which is L2's shape) or a
 * non-special heading (which the checker's lack of tolerance rules out).
 */
export const d9_trg8_sine_basic_l1: ItemTemplate = {
  template_id: "d9.trg8.sine-basic.l1",
  node_id: TRG8_NODE,
  difficulty: 1,
  concept: "roster-from-a-positive-sine",
  generate(rng: Rng) {
    const ref = rng.pick([30, 45, 60] as const);
    const spots = placements("sin", ref, false);
    const headings = spots.map((s) => s.value);
    return {
      prompt: solvePrompt(`\\sin x = ${exactTex("sin", ref)}`),
      answer: solutionSetAnswer(roster(headings)),
      params: { fn: FN_CODE.sin, ref, neg: 0 },
      hints: [
        "Start with the acute heading. Ask which angle between $0^{\\circ}$ and $90^{\\circ}$ has that sine, and keep it as the reference angle.",
        "The sign decides where it goes: sine is positive in the first and second quadrants and negative in the third and fourth. Either way that is two quadrants, so the window holds more than one heading.",
      ],
      worked_solution: [
        `The sine already stands alone, so the value can be read off as it is: $\\sin x = ${exactTex("sin", ref)}$.`,
        ...rosterSteps("sin", ref, false),
      ],
    };
  },
  varietyKey: (params) => `sin:${params.ref ?? 0}`,
};

/* ----------------------------------------------------------------- L2a, `unit_circle` */

/**
 * L2a, family `unit_circle`: a NEGATIVE cosine, where the sign does the work.
 *
 * The step up from L1 is not arithmetic, it is that the minus sign has to be spent twice: once
 * discarded, so the acute reference angle can be found from the size alone, and once put back,
 * to decide which two quadrants the headings sit in. A learner who keeps the sign attached
 * while hunting for the acute heading finds nothing; one who drops it and forgets it returns
 * the first-quadrant pair and gets `value_mismatch`.
 */
export const d9_trg8_cosine_negative_l2: ItemTemplate = {
  template_id: "d9.trg8.cosine-negative.l2",
  node_id: TRG8_NODE,
  difficulty: 2,
  concept: "roster-from-a-negative-cosine",
  generate(rng: Rng) {
    const ref = rng.pick([30, 45, 60] as const);
    const spots = placements("cos", ref, true);
    const headings = spots.map((s) => s.value);
    return {
      prompt: solvePrompt(`\\cos x = ${signedTex("cos", ref, true)}`),
      answer: solutionSetAnswer(roster(headings)),
      params: { fn: FN_CODE.cos, ref, neg: 1 },
      hints: [
        "Set the minus sign aside for a moment. The acute heading you want is the one whose cosine matches the *size* of that value, and that acute heading is the reference angle.",
        "Now put the sign back. The sign decides where it goes: cosine is positive in the first and fourth quadrants and negative in the second and third.",
      ],
      worked_solution: [
        `The cosine already stands alone: $\\cos x = ${signedTex("cos", ref, true)}$.`,
        ...rosterSteps("cos", ref, true),
      ],
    };
  },
  varietyKey: (params) => `cos-neg:${params.ref ?? 0}`,
};

/* ----------------------------------------------------------------- L2b, `unit_circle` */

/**
 * L2b, family `unit_circle`: a tangent, which repeats every HALF turn.
 *
 * Sine and cosine train a learner to expect a pair reflected about an axis; tangent's pair is
 * half a revolution apart, and the two headings are in opposite quadrants rather than adjacent
 * ones. Both signs are drawn, because a learner who has memorized "tangent gives x and x plus
 * 180" without reading the sign puts the negative draws in the first and third quadrants and
 * gets `value_mismatch` on exactly half the cell.
 */
export const d9_trg8_tangent_basic_l2: ItemTemplate = {
  template_id: "d9.trg8.tangent-basic.l2",
  node_id: TRG8_NODE,
  difficulty: 2,
  concept: "roster-from-a-tangent",
  generate(rng: Rng) {
    const ref = rng.pick([30, 45, 60] as const);
    const negative = rng.int(0, 1) === 1;
    const spots = placements("tan", ref, negative);
    const headings = spots.map((s) => s.value);
    return {
      prompt: solvePrompt(`\\tan x = ${signedTex("tan", ref, negative)}`),
      answer: solutionSetAnswer(roster(headings)),
      params: { fn: FN_CODE.tan, ref, neg: negative ? 1 : 0 },
      hints: [
        "Take the size of the value on its own and find the acute heading whose tangent matches it. That acute heading is the reference angle.",
        "The sign decides where it goes: tangent is positive in the first and third quadrants and negative in the second and fourth.",
        "Tangent repeats every $180^{\\circ}$ rather than every $360^{\\circ}$, so the two headings are exactly half a turn apart. That is worth using as a check once you have both.",
      ],
      worked_solution: [
        `The tangent already stands alone: $\\tan x = ${signedTex("tan", ref, negative)}$.`,
        ...rosterSteps("tan", ref, negative),
        `Tangent repeats every $180^{\\circ}$, and those two headings differ by exactly that, which is the check that nothing has been missed inside the window.`,
      ],
    };
  },
  varietyKey: (params) => `tan:${params.ref ?? 0}:${params.neg ?? 0}`,
};

/* ----------------------------------------------------------------- L3a, `linear_form` */

/** One drawn linear equation: `a * f(x) + bNum * sqrt(bRad) = 0`. */
interface LinearShape {
  fn: Fn;
  /** The coefficient in front of the function. Always at least 2, so a division is owed. */
  a: number;
  /** The constant's integer part. Its sign is the sign it carries in the equation. */
  bNum: number;
  /** The radicand under the constant, or 1 when the constant is rational. */
  bRad: number;
  ref: number;
  negative: boolean;
}

/**
 * The six linear draws, each checked by hand against the value it isolates.
 *
 * None of them is the check's own $2\sin x + 1 = 0$, which would hand the learner the check's
 * question back inside the practice set. Every draw owes BOTH algebra steps (a constant to
 * move and a coefficient to divide by), so the hints can name both without ever claiming work
 * a particular draw did not require.
 */
const LINEAR_SHAPES: readonly LinearShape[] = [
  // 2 sin x - 1 = 0  ->  sin x = 1/2
  { fn: "sin", a: 2, bNum: -1, bRad: 1, ref: 30, negative: false },
  // 2 cos x + 1 = 0  ->  cos x = -1/2
  { fn: "cos", a: 2, bNum: 1, bRad: 1, ref: 60, negative: true },
  // 2 sin x + sqrt(2) = 0  ->  sin x = -sqrt(2)/2
  { fn: "sin", a: 2, bNum: 1, bRad: 2, ref: 45, negative: true },
  // 2 cos x - sqrt(3) = 0  ->  cos x = sqrt(3)/2
  { fn: "cos", a: 2, bNum: -1, bRad: 3, ref: 30, negative: false },
  // 2 tan x + 2 = 0  ->  tan x = -1
  { fn: "tan", a: 2, bNum: 2, bRad: 1, ref: 45, negative: true },
  // 3 tan x - sqrt(3) = 0  ->  tan x = sqrt(3)/3
  { fn: "tan", a: 3, bNum: -1, bRad: 3, ref: 30, negative: false },
];

/** The constant as it appears in the equation, with its own sign, e.g. `+ \sqrt{2}`. */
function constantTex(bNum: number, bRad: number): string {
  const size = Math.abs(bNum);
  const body =
    bRad === 1 ? `${size}` : size === 1 ? `\\sqrt{${bRad}}` : `${size}\\sqrt{${bRad}}`;
  return `${bNum < 0 ? "-" : "+"} ${body}`;
}

/** The same constant moved across the equals sign, so its sign flips. */
function movedConstantTex(bNum: number, bRad: number): string {
  const size = Math.abs(bNum);
  const body =
    bRad === 1 ? `${size}` : size === 1 ? `\\sqrt{${bRad}}` : `${size}\\sqrt{${bRad}}`;
  return `${bNum < 0 ? "" : "-"}${body}`;
}

/**
 * L3a, family `linear_form`: one algebra step, and only then the roster.
 *
 * This is the shape where the two skills have to be run in the right order. A learner who
 * reaches for the unit circle while the coefficient is still attached is reading the wrong
 * value off it, and the reference angle that follows is wrong before any quadrant is chosen.
 * Isolating first turns the problem back into L1 or L2, which is the whole point of the slot.
 */
export const d9_trg8_linear_in_trig_l3: ItemTemplate = {
  template_id: "d9.trg8.linear-in-trig.l3",
  node_id: TRG8_NODE,
  difficulty: 3,
  concept: "isolate-the-function-then-roster",
  generate(rng: Rng) {
    const shape = rng.pick(LINEAR_SHAPES);
    const { fn, a, bNum, bRad, ref, negative } = shape;
    const spots = placements(fn, ref, negative);
    const headings = spots.map((s) => s.value);
    const equation = `${a}${FN_TEX[fn]} x ${constantTex(bNum, bRad)} = 0`;
    return {
      prompt: solvePrompt(equation),
      answer: solutionSetAnswer(roster(headings)),
      params: {
        fn: FN_CODE[fn],
        a,
        bNum,
        bRad,
        ref,
        neg: negative ? 1 : 0,
      },
      hints: [
        "Nothing about headings can be read off this while the trig function is still tied up in it. Move the constant to the other side, then divide both sides by the number multiplying the function.",
        "Once the function stands alone you have a plain value. Its *size* fixes the acute reference angle and its *sign* fixes which two quadrants the headings sit in, so a roster with one heading in it is unfinished rather than wrong.",
      ],
      worked_solution: [
        `Move the constant across first: $${a}${FN_TEX[fn]} x = ${movedConstantTex(bNum, bRad)}$.`,
        `Divide both sides by $${a}$, which leaves the function alone: $${FN_TEX[fn]} x = ${signedTex(fn, ref, negative)}$.`,
        ...rosterSteps(fn, ref, negative),
      ],
    };
  },
  varietyKey: (params) =>
    `lin:${params.fn ?? 0}:${params.a ?? 0}:${params.bNum ?? 0}:${params.bRad ?? 0}`,
};

/* ------------------------------------------------------------ L3b, `quadratic_in_form` */

/**
 * L3b, family `quadratic_in_form`: factored by substitution, three headings out.
 *
 * Every draw is $2u^2 - (2q + p)u + pq = 0$ with $u$ the trig function and $p, q \in \{1, -1\}$,
 * which factors as $(2u - p)(u - q)$ and hands back $u = p/2$ and $u = q$. That pairing is
 * chosen rather than incidental: $\pm\tfrac{1}{2}$ is reached at TWO headings in the window and
 * $\pm 1$ at exactly ONE, so every instance has a roster of three. A four-member roster would
 * let a learner who found only the easy factor still land on an even count and think the shape
 * looked right; an odd count cannot be reached by solving half the problem.
 *
 * Eight instances, which is the deepest cell on the node.
 */
export const d9_trg8_quadratic_in_form_l3: ItemTemplate = {
  template_id: "d9.trg8.quadratic-in-form.l3",
  node_id: TRG8_NODE,
  difficulty: 3,
  concept: "quadratic-by-substitution-then-roster",
  generate(rng: Rng) {
    const fn = rng.pick(["sin", "cos"] as const);
    const p = rng.pick([1, -1] as const);
    const q = rng.pick([1, -1] as const);

    // 2u^2 - (2q + p)u + pq, written from the factors so the two can never drift apart.
    const linearCoeff = -(2 * q + p);
    const constant = p * q;
    const f = FN_TEX[fn];
    // A coefficient of 1 is not written, so `2u^2 + u - 1` never renders as `2u^2 + 1u - 1`.
    const linearSize = Math.abs(linearCoeff) === 1 ? "" : `${Math.abs(linearCoeff)}`;
    const linearTerm = `${linearCoeff < 0 ? "-" : "+"} ${linearSize}${f} x`;
    const constantTerm = `${constant < 0 ? "-" : "+"} ${Math.abs(constant)}`;
    const equation = `2${f}^{2} x ${linearTerm} ${constantTerm} = 0`;
    const factored = `(2${f} x ${p < 0 ? "+" : "-"} 1)(${f} x ${q < 0 ? "+" : "-"} 1) = 0`;

    // u = p/2 is reached at two headings; u = q is a peak or a trough, reached at one.
    const halfRef = fn === "sin" ? 30 : 60;
    const pairSpots = placements(fn, halfRef, p < 0);
    const pair = pairSpots.map((s) => s.value);
    const single = fn === "sin" ? (q > 0 ? 90 : 270) : q > 0 ? 0 : 180;
    const headings = [...pair, single];

    const halfTex = p < 0 ? "-\\dfrac{1}{2}" : "\\dfrac{1}{2}";
    const singleTex = q < 0 ? "-1" : "1";
    const extremeWord =
      fn === "sin"
        ? q > 0
          ? "straight up the circle"
          : "straight down the circle"
        : q > 0
          ? "straight along the circle to the right"
          : "straight along the circle to the left";

    return {
      prompt: solvePrompt(equation),
      answer: solutionSetAnswer(roster(headings)),
      params: { fn: FN_CODE[fn], p, q },
      hints: [
        `Read $${f} x$ as a single unknown and this is an ordinary quadratic in it, so factor it the way you would factor a quadratic in $u$.`,
        "Set each factor to zero on its own. That gives two separate values for the function, and each of them has to be solved over the window by itself.",
        "One of those two values is $1$ or $-1$, which the sweep reaches at exactly one heading, while the other is reached at two. Collect all of them into a single roster before comparing it with the window.",
      ],
      worked_solution: [
        `Treat $${f} x$ as one unknown. The equation $${equation}$ is a quadratic in it, and it factors: $${factored}$.`,
        `Set the first factor to zero: $${f} x = ${halfTex}$.`,
        `That value has size $\\dfrac{1}{2}$, so its reference angle is $${halfRef}^{\\circ}$, and ${FN_WORD[fn]} is ${p < 0 ? "negative" : "positive"} in the ${quadrantWords(fn, p < 0)} quadrants: $${pairSpots[0]?.tex ?? ""}$ and $${pairSpots[1]?.tex ?? ""}$.`,
        `Set the second factor to zero: $${f} x = ${singleTex}$. That is the largest size the ${FN_WORD[fn]} ever reaches, so it happens at one heading only, pointing ${extremeWord}, which is $${single}^{\\circ}$.`,
        `Collect the three inside $${WINDOW}$: the answer is $${rosterTex(headings)}$, typed as ${roster(headings)}.`,
      ],
    };
  },
  varietyKey: (params) => `quad:${params.fn ?? 0}:${params.p ?? 0}:${params.q ?? 0}`,
};

/* ------------------------------------------------------- L2c and L2d, `unit_circle` */

/**
 * The two shapes that vary the WINDOW instead of the value, which is the half of this node's
 * fourth slide nothing else exercises.
 *
 * That slide is explicit about it: *"a sine or cosine equation with one solution also has that
 * solution plus $360^{\circ}n$ for every whole number $n$, while a tangent repeats twice as
 * often"*, and *"read the bounds exactly as written"*. All five locked-mix shapes state the
 * identical `0 <= x < 360`, so a learner can finish the node having answered "how many headings
 * are there" with "two, or three when a factor gives a peak" every single time, which is a fact
 * about that window and not about the equation.
 *
 * The value machinery is untouched and deliberately so: the reference angle still comes from the
 * size and the quadrants still come from the sign, so what these two add is one extra step at
 * the end rather than a second method. The checker's lack of tolerance still binds, so every
 * reference angle is drawn from 30, 45 and 60 exactly as above.
 */

/** The stated window for {@link d9_trg8_two_turn_window_l2}: two full revolutions. */
const TWO_TURN_WINDOW = "0^{\\circ} \\le x < 720^{\\circ}";

/** The stated window for {@link d9_trg8_signed_window_l2}: half a turn either side of zero. */
const SIGNED_WINDOW = "-180^{\\circ} \\le x < 180^{\\circ}";

/**
 * The prompt shape the two window shapes share, which is {@link solvePrompt} with the window
 * passed in rather than fixed.
 *
 * A separate function rather than a parameter on `solvePrompt`, because every one of the five
 * locked-mix shapes is already frozen against that function's exact output and threading a
 * default through it would be one refactor away from re-wording five frozen prompts.
 */
function solvePromptIn(equationTex: string, windowTex: string): string {
  return `Solve $${equationTex}$ for $${windowTex}$. List every heading that fits, measured in degrees, and write the numbers only with no degree sign.`;
}

/**
 * The value-reading steps only, for a shape whose window is NOT one revolution.
 *
 * {@link rosterSteps} closes by naming its roster "the answer" inside the fixed
 * {@link WINDOW}, which is true for the five locked-mix shapes and false for these two: there
 * the roster over one revolution is a working step and the stated window is a different
 * interval. Taking the first two steps and supplying a closing line of its own keeps
 * `rosterSteps` byte-identical for the shapes already frozen against it.
 */
function valueSteps(fn: Fn, ref: number, negative: boolean): string[] {
  return rosterSteps(fn, ref, negative).slice(0, 2);
}

/** Every `(function, reference angle, sign)` the two window shapes draw from. */
interface WindowDraw {
  fn: Fn;
  ref: number;
  negative: boolean;
}

const WINDOW_DRAWS: readonly WindowDraw[] = (["sin", "cos", "tan"] as const).flatMap((fn) =>
  [30, 45, 60].flatMap((ref) => [false, true].map((negative) => ({ fn, ref, negative }))),
);

/**
 * L2c, family `unit_circle`: the same equation over TWO revolutions.
 *
 * Every roster here holds four headings rather than two, and the second pair is the first pair
 * plus a full turn. That is the general solution made concrete: the window is what makes the
 * list finite, so doubling the window doubles the list, and a learner who has learned "the
 * answer has two headings in it" gets `incomplete_solution_set` back on every draw.
 *
 * Tangent is drawn as well as sine and cosine, and it is the interesting case: its period is
 * half a turn, so its two base headings are already half a revolution apart and the two further
 * ones continue the same spacing. Four evenly spaced headings, where sine's and cosine's four
 * are two reflected pairs.
 *
 * Eighteen instances, three functions by three reference angles by two signs.
 */
export const d9_trg8_two_turn_window_l2: ItemTemplate = {
  template_id: "d9.trg8.two-turn-window.l2",
  node_id: TRG8_NODE,
  difficulty: 2,
  concept: "roster-over-two-revolutions",
  generate(rng: Rng) {
    const { fn, ref, negative } = rng.pick(WINDOW_DRAWS);
    const base = placements(fn, ref, negative).map((spot) => spot.value);
    const headings = [...base, ...base.map((value) => value + 360)];
    return {
      prompt: solvePromptIn(
        `${FN_TEX[fn]} x = ${signedTex(fn, ref, negative)}`,
        TWO_TURN_WINDOW,
      ),
      answer: solutionSetAnswer(roster(headings)),
      params: { fn: FN_CODE[fn], ref, neg: negative ? 1 : 0, turns: 2 },
      hints: [
        "Start where you always would, over one revolution: the size of the value fixes the acute reference angle and the sign fixes which two quadrants it is measured into.",
        "Then read the window, which is wider than one revolution here. A heading and that heading plus a full turn point the same way, so every heading you found inside the first revolution has a partner a full turn further on, and the partner is inside the window too.",
        "Collect all of them before comparing the list with the window, and check the largest against the upper bound: the bound is not included, so a heading equal to it does not belong.",
      ],
      worked_solution: [
        `The ${FN_WORD[fn]} already stands alone: $${FN_TEX[fn]} x = ${signedTex(fn, ref, negative)}$.`,
        ...rosterSteps(fn, ref, negative),
        `The window runs to two full revolutions, and adding $360^{\\circ}$ to a heading leaves it pointing the same way, so each of those headings has a partner a full turn on: $${rosterTex(base.map((value) => value + 360))}$.`,
        `Collecting all four inside $${TWO_TURN_WINDOW}$: the answer is $${rosterTex(headings)}$, typed as ${roster(headings)}.`,
      ],
    };
  },
  varietyKey: (params) =>
    `two-turn:${params.fn ?? 0}:${params.ref ?? 0}:${params.neg ?? 0}`,
};

/**
 * A heading from `[0, 360)` re-expressed inside `[-180, 180)`: the same direction, named the
 * way the stated window names it.
 */
function intoSignedWindow(value: number): number {
  return value < 180 ? value : value - 360;
}

/**
 * Every draw for {@link d9_trg8_signed_window_l2}, which is {@link WINDOW_DRAWS} less the one
 * combination where the window changes nothing.
 *
 * EVERY ROW RE-EXPRESSES AT LEAST ONE HEADING. A positive sine puts both of its headings in the
 * first half turn, so its roster over `[-180, 180)` is identical to its roster over `[0, 360)`,
 * and a learner who never converted would be right. That is a draw on which the third hint
 * ("a heading past a half turn has to be renamed") would be dead weight, and it is also the L1
 * shape's own arrangement, so it is dropped rather than the hint weakened. `COMPOSITIONS` in
 * `TRG.7` drops rows for exactly the same reason.
 *
 * Fifteen instances: five of the six function-and-sign pairs, by three reference angles.
 */
const SIGNED_WINDOW_DRAWS: readonly WindowDraw[] = WINDOW_DRAWS.filter(
  (draw) =>
    !placements(draw.fn, draw.ref, draw.negative).every(
      (spot) => intoSignedWindow(spot.value) === spot.value,
    ),
);

/**
 * L2d, family `unit_circle`: the same equation over a window that STARTS below zero.
 *
 * The step here is not arithmetic either, it is reading the bounds as written. The general
 * solution is the same endless family; what changes is which of its members the window admits,
 * and a heading of $210^{\circ}$ is outside this one while the identical direction written
 * $-150^{\circ}$ is inside it. A learner who solves over the revolution they are used to and
 * hands that roster in has every direction right and every number wrong, which is
 * `value_mismatch` rather than an incomplete set: a different failure code from the one the
 * other window shape produces, and that is the point of having both.
 */
export const d9_trg8_signed_window_l2: ItemTemplate = {
  template_id: "d9.trg8.signed-window.l2",
  node_id: TRG8_NODE,
  difficulty: 2,
  concept: "roster-over-a-window-below-zero",
  generate(rng: Rng) {
    const { fn, ref, negative } = rng.pick(SIGNED_WINDOW_DRAWS);
    const base = placements(fn, ref, negative).map((spot) => spot.value);
    const headings = base.map(intoSignedWindow);
    const renamed = base.filter((value) => intoSignedWindow(value) !== value);
    return {
      prompt: solvePromptIn(
        `${FN_TEX[fn]} x = ${signedTex(fn, ref, negative)}`,
        SIGNED_WINDOW,
      ),
      answer: solutionSetAnswer(roster(headings)),
      params: { fn: FN_CODE[fn], ref, neg: negative ? 1 : 0, signed: 1 },
      hints: [
        "Solve it over one revolution first, the way you always would: the size of the value fixes the acute reference angle and the sign fixes which two quadrants it is measured into.",
        "Then read the stated window, which starts below zero rather than at it. Subtracting a full turn from a heading leaves it pointing the same way, so a heading at or past a half turn is renamed as the negative heading that points the same way, and it is that name the window admits.",
        "Check both ends as written: the lower bound is included and the upper is not, so the two ends do not treat a heading of the same size alike.",
      ],
      worked_solution: [
        `The ${FN_WORD[fn]} already stands alone: $${FN_TEX[fn]} x = ${signedTex(fn, ref, negative)}$.`,
        ...valueSteps(fn, ref, negative),
        `Measured from zero those headings are $${rosterTex(base)}$, and the stated window does not name them that way.`,
        `It starts below zero, so a heading at or past a half turn is named by subtracting a full revolution from it, which leaves it pointing the same way: ${renamed
          .map(
            (value) => `$${value}^{\\circ}$ becomes $${intoSignedWindow(value)}^{\\circ}$`,
          )
          .join(", ")}.`,
        `Collecting them inside $${SIGNED_WINDOW}$: the answer is $${rosterTex(headings)}$, typed as ${roster(headings)}.`,
      ],
    };
  },
  varietyKey: (params) => `signed:${params.fn ?? 0}:${params.ref ?? 0}:${params.neg ?? 0}`,
};

/**
 * The two shapes that share the L2 cell with the locked-mix pair, held separately so the mix
 * stays exactly two frozen slots and no already-frozen retry variant is re-seeded. See
 * `D9_EXTRA_PRACTICE_TEMPLATES` in `d9/practice.ts`.
 */
export const TRG8_EXTRA_TEMPLATES: readonly ItemTemplate[] = [
  d9_trg8_two_turn_window_l2,
  d9_trg8_signed_window_l2,
];

/** The node's five templates, in the locked 1xL1 / 2xL2 / 2xL3 order. */
export const TRG8_TEMPLATES: readonly ItemTemplate[] = [
  d9_trg8_sine_basic_l1,
  d9_trg8_cosine_negative_l2,
  d9_trg8_tangent_basic_l2,
  d9_trg8_linear_in_trig_l3,
  d9_trg8_quadratic_in_form_l3,
];
