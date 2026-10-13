import {
  type GenerateContext,
  type ItemTemplate,
  multipleChoiceAnswer,
  numericAnswer,
  pointAnswer,
  type Rng,
} from "../../../template";

/**
 * FUN.9 practice templates: transformations of a graph (shift, reflect, stretch) and the
 * even/odd symmetry test.
 *
 * ## The one idea every shape here is built around
 *
 * A constant or a multiplier INSIDE the function's own brackets acts on the INPUT, and so
 * moves the graph the opposite way to the way its sign reads; outside the brackets it acts
 * on the OUTPUT and behaves as written. That is the whole counter-intuition of the node, so
 * four of the five shapes below put an inside change and an outside change in the same
 * question, where getting one right and the other backwards is a visible, gradable miss.
 *
 * Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  where one point of an unknown $f$ lands under a translation, inside and outside;
 *  - L2a a reading off a shifted rule, so the substitution has to be worked from the inside;
 *  - L2b the even/odd/neither call, settled by replacing $x$ with $-x$ rather than by eye;
 *  - L3a where one point lands when the input is SCALED and the output is scaled and flipped;
 *  - L3b a reading off a stretch, a reflection and a shift together, where the ORDER of the
 *        two outside operations changes the value.
 *
 * ## Seeding
 *
 * Shapes are seeded from Lippman & Rasmussen, *Precalculus: An Investigation of Functions*
 * 2nd ed. (opentextbookstore.com/precalc, CC BY-SA 4.0), Chapter 1 section 1.5
 * "Transformation of Functions", verified against the book's own chapter listing rather
 * than assumed. That section is the node: vertical and horizontal shifts written as
 * $f(x) + k$ and $f(x + k)$, the two reflections $-f(x)$ and $f(-x)$, the even and odd tests
 * $f(-x) = f(x)$ and $f(-x) = -f(x)$, vertical and horizontal stretches $af(x)$ and $f(bx)$,
 * and combining them, where the section states outright that the order is not free.
 *
 * The section ships as a PDF and a DOCX, neither of which the authoring tooling can read,
 * and the skill's extraction warning applies twice over here: this topic is written almost
 * entirely in stacked notation and printed graphs. So no exercise text was transcribed.
 * Each shape below is the section's own exercise SHAPE re-derived by hand, and every number
 * is drawn fresh by `generate()` with its key computed by real arithmetic:
 *
 *  - "given a point on $f$, give the corresponding point on the transformed graph" -> L1 and
 *    L3a, diversified so the inside constant runs either side of zero (the textbook's
 *    ladder leads with the rightward shift) and so L3a scales BOTH input and output at once,
 *    which the section only reaches in its closing combined-transformation subsection.
 *  - "given $f$, evaluate a transformed rule at a value" -> L2a and L3b, with the parent
 *    kept as a quadratic so the learner can finish the arithmetic unaided.
 *  - "determine whether the function is even, odd, or neither" -> L2b, widened off the
 *    textbook's list so that a constant term (an even power in disguise) and a mixed-parity
 *    pair both appear, which is where a learner reading the picture instead of the algebra
 *    comes unstuck.
 *
 * ## Distinct from the FUN.9 DIAGNOSTIC slice
 *
 * `graph/slices.ts` already owns `graph.fun-9.transform.v2`, which asks a learner to DRAW
 * $g(x) = (x + 3)^{2} - 2$ and mark its vertex and $y$-intercept. That is a different
 * surface with a different grader, and nothing here reuses or renumbers it: no template
 * below asks for a drawing, none uses that shift pair, and no parent here is the bare
 * $x^{2}$ that slice transforms.
 *
 * ## Era, and how far the theming goes
 *
 * FUN.9 is an ATOMIC AGE node (`packages/skill-graph/src/eras.ts`), so the framing is the
 * telemetry loft of `docs/superpowers/specs/eras/era-08-atomic/style-guide.md`, whose
 * "Lesson framings" table gives this node three settings: the same trace recorded an hour
 * later (a horizontal shift, which on chart paper is literally a distance), the recorder's
 * gain turned up (a vertical stretch), and a load pattern symmetric about noon (the even
 * and odd cases). Three of the five prompts take one of those; nothing leans on a building
 * name (D-ERA8), and nothing on that era's "Explicitly absent" list (composite rainscreen
 * cladding, a sealed jointless skin, an emissive surface, exposed conduit, a deck over the
 * ground, and brick or timber as a wall material) appears in any prompt. The guide's tone
 * caution is observed too: these are recorders, readings and gains, never reactors or yield.
 *
 * L2a and L3b stay NEUTRAL on purpose. Both are "evaluate this composed rule at a value",
 * where a story would decorate arithmetic it does not change, and the skill's rule is that
 * context is added only where it makes the problem a genuine word problem.
 *
 * Theming is applied only when `ctx.form === "practice"`, and no `answer`, `params`,
 * `difficulty` or grader spec depends on the wording.
 *
 * ## Answer shapes
 *
 * Three graders, each on the only form its answer can take. Where a point lands is a
 * `pointAnswer`, so the field advertises a coordinate pair and a swapped answer is reported
 * as swapped rather than as simply wrong. A reading is a plain `numericAnswer`. The symmetry
 * call is a one-word `multipleChoiceAnswer` over three options the prompt lists, which is
 * graded by exact match after the shared card folds case and collapses spacing.
 *
 * Every key here is an integer, an integer pair, or one of three lowercase words. None of
 * them carries a fraction bar, a caret, a root, absolute-value bars or a star the grader
 * cannot read past, so no field needs a notation key row and none is left advertising
 * syntax it does not offer.
 *
 * ## Two hint hazards this file is written around
 *
 * `hint_leaks_answer` matches the answer key as a standalone value with DIGIT boundaries
 * only, so the two `numericAnswer` shapes (L2a, L3b) have keys that are small signed
 * integers and their hints are written entirely digit-free: a hint reading "compare it with
 * $5$" would leak on precisely the draws whose reading is $5$ and pass on every other one,
 * which is worse than a constant leak because whether the sweep catches it depends on the
 * seed.
 *
 * L2b is the sharper case, because its key is a WORD and the match has no word boundary at
 * all: on an even draw any occurrence of the letters `even` leaks, including inside `seven`
 * or `eleven`, and because the check strips whitespace first, `in either` would leak
 * `neither`. Its three hints therefore avoid all three verdict words as substrings, spaced
 * or not, and describe the two symmetries instead of naming them.
 */

export const FUN9_NODE = "FUN.9";

/* ------------------------------------------------------------------ shared helpers */

/** `+ 7` / `- 7`: the operator and magnitude of a signed constant, spaced for KaTeX. */
function signTerm(value: number): string {
  return `${value < 0 ? "-" : "+"} ${Math.abs(value)}`;
}

/** A signed value standing on its own inside an expression, bracketed when negative. */
function operand(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** A coefficient as written in front of a term: `1` is dropped, `-1` becomes a bare minus. */
function coefficient(value: number): string {
  if (value === 1) {
    return "";
  }
  return value === -1 ? "-" : `${value}`;
}

/* ---------------------------------------------------------------------------- L1 */

/**
 * L1, where one point goes under a translation.
 *
 * The parent is deliberately UNKNOWN: with no rule to evaluate, the only thing available is
 * the correspondence between the two graphs, which is what a translation IS. Both constants
 * are non-zero, so every instance asks about the inside and the outside at once, and the
 * inside constant runs either side of zero so its direction has to be read rather than
 * remembered.
 */
export const d6_fun9_shift_point_l1: ItemTemplate = {
  template_id: "d6.fun9.shift-point.l1",
  node_id: FUN9_NODE,
  difficulty: 1,
  generate(rng: Rng, ctx?: GenerateContext) {
    let px = 0;
    let py = 0;
    let inside = 0;
    let outside = 0;
    do {
      px = rng.int(-6, 6);
      py = rng.int(-8, 8);
      inside = rng.int(-5, 5);
      outside = rng.int(-6, 6);
      // A zero constant on either side would leave that half of the question with nothing
      // in it, and the point of the shape is that both halves are always live. A zero
      // ordinate would also make the vertical move read off the axis rather than off a value.
    } while (inside === 0 || outside === 0 || py === 0);
    const landedX = px - inside;
    const landedY = py + outside;
    const rule = `g(x) = f(x ${signTerm(inside)}) ${signTerm(outside)}`;
    const neutral = `The point $(${px},\\, ${py})$ lies on the graph of $f$. Give the point that must lie on the graph of $${rule}$. Write your answer as a coordinate pair.`;
    const themed = `A chart recorder's trace passes through the point $(${px},\\, ${py})$. The telemetry loft replays the same run as $${rule}$, which slides the trace along the paper and moves it on the scale. Give the point the replayed trace must pass through. Write your answer as a coordinate pair.`;
    return {
      prompt: ctx?.form === "practice" ? themed : neutral,
      answer: pointAnswer(`(${landedX}, ${landedY})`),
      params: { px, py, inside, outside },
      hints: [
        "The rule carries two constants and they sit in different places: one is inside the function's own brackets, beside the input, and one is outside them, beside the output. Take them one at a time.",
        "The constant inside the brackets acts on the INPUT, so ask which input of $g$ makes that bracket come out equal to the $x$ you were given. That is the only place the old point's value is available, and it moves the graph the opposite way to the way the sign reads.",
        "The constant outside the brackets acts on the OUTPUT, so it is applied to the $y$ you were given, sign and all.",
      ],
      worked_solution: [
        `The constant inside the brackets acts on the input, so the new point is the input that makes the bracket read $${px}$. Solve $x ${signTerm(inside)} = ${px}$, which gives $x = ${landedX}$.`,
        `The constant outside the brackets acts on the output, so it is applied to the ordinate: $${py} ${signTerm(outside)} = ${landedY}$.`,
        `So the point on $g$ is $(${landedX}, ${landedY})$.`,
      ],
    };
  },
  // Keyed on the LANDED point, which is the answer, so a cell never freezes two questions a
  // learner could answer with the same pair.
  varietyKey: (params) =>
    `s:${(params.px ?? 0) - (params.inside ?? 0)}:${(params.py ?? 0) + (params.outside ?? 0)}`,
};

/* ---------------------------------------------------------------------------- L2 */

/**
 * L2a, a reading off a shifted rule.
 *
 * Here the parent IS given, so the inside change has to be carried out as a substitution
 * rather than reasoned about: the bracket has to be settled first, because until it is there
 * is no input to put through $f$. A learner who applies the outside constant to the input,
 * or the inside constant to the output, lands on a different number every time.
 *
 * The parent is always $x^{2} - m$ with $m$ at least one, so the second hint's "take away
 * the constant the rule subtracts" is true on every draw. The input to $f$ is never $0$ or
 * $\pm 1$, so squaring it is real work.
 */
export const d6_fun9_inside_outside_value_l2: ItemTemplate = {
  template_id: "d6.fun9.inside-outside-value.l2",
  node_id: FUN9_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    let m = 0;
    let inside = 0;
    let outside = 0;
    let inner = 0;
    let value = 0;
    do {
      m = rng.int(1, 9);
      inside = rng.int(-5, 5);
      outside = rng.int(-7, 7);
      inner = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]);
      value = inner * inner - m + outside;
      // Both constants stay live, and a reading of zero would make the last step read as
      // though no arithmetic happened.
    } while (inside === 0 || outside === 0 || value === 0);
    const at = inner - inside;
    const parentValue = inner * inner - m;
    return {
      prompt: `The function $f$ is given by $f(x) = x^{2} - ${m}$, and a second function by $g(x) = f(x ${signTerm(inside)}) ${signTerm(outside)}$. Find $g(${at})$. Enter one number.`,
      answer: numericAnswer(`${value}`),
      params: { m, inside, outside, inner },
      hints: [
        "Work from the inside out. The constant inside the brackets is part of the input, so combine it with the given value first, and that tells you which input of $f$ the question is really asking about.",
        "Now use $f$'s own rule at that input: square it, then take away the constant the rule subtracts.",
        "The constant outside the brackets acts on the output, so it is applied last, to the value of $f$ you have just found.",
      ],
      worked_solution: [
        `Settle the bracket first: $${at} ${signTerm(inside)} = ${inner}$, so $g(${at}) = f(${inner}) ${signTerm(outside)}$.`,
        `Use $f$'s own rule at that input: $f(${inner}) = ${operand(inner)}^{2} - ${m} = ${parentValue}$.`,
        `The constant outside the brackets is applied last: $${parentValue} ${signTerm(outside)} = ${value}$.`,
        `So $g(${at}) = ${value}$.`,
      ],
    };
  },
  // Keyed on the READING, tagged so it cannot collide with the symmetry shape sharing this
  // cell. Recomputed from the params rather than stored, so the key cannot drift.
  varietyKey: (params) =>
    `v:${(params.inner ?? 0) ** 2 - (params.m ?? 0) + (params.outside ?? 0)}`,
};

/** One term of a polynomial, as a coefficient over a power of $x$. */
interface PolyTerm {
  coef: number;
  exp: number;
}

/** A term as it is written in the rule. `leading` drops the `+` on the first one. */
function termTex(term: PolyTerm, leading: boolean): string {
  const magnitude = Math.abs(term.coef);
  const power = term.exp === 1 ? "x" : `x^{${term.exp}}`;
  const body =
    term.exp === 0 ? `${magnitude}` : `${magnitude === 1 ? "" : magnitude}${power}`;
  if (leading) {
    return term.coef < 0 ? `-${body}` : body;
  }
  return `${term.coef < 0 ? "-" : "+"} ${body}`;
}

/** The whole rule, e.g. `3x^{4} - 5x^{2}`. */
function polyTex(terms: readonly PolyTerm[]): string {
  return terms.map((term, index) => termTex(term, index === 0)).join(" ");
}

/** The same rule with every $x$ replaced by $-x$, before any simplification. */
function substitutedTex(terms: readonly PolyTerm[]): string {
  return terms
    .map((term, index) => {
      const magnitude = Math.abs(term.coef);
      const lead = magnitude === 1 ? "" : `${magnitude}`;
      const body =
        term.exp === 0
          ? `${magnitude}`
          : term.exp === 1
            ? `${lead}(-x)`
            : `${lead}(-x)^{${term.exp}}`;
      if (index === 0) {
        return term.coef < 0 ? `-${body}` : body;
      }
      return `${term.coef < 0 ? "-" : "+"} ${body}`;
    })
    .join(" ");
}

/** Each term's coefficient after $x$ is replaced by $-x$: a sign flip on the odd powers. */
function reflected(terms: readonly PolyTerm[]): PolyTerm[] {
  return terms.map((term) => ({
    coef: term.exp % 2 === 0 ? term.coef : -term.coef,
    exp: term.exp,
  }));
}

/** Every term negated: the rule the odd test compares against. */
function negated(terms: readonly PolyTerm[]): PolyTerm[] {
  return terms.map((term) => ({ coef: -term.coef, exp: term.exp }));
}

/**
 * The exponent pairs each verdict is built from, indexed by verdict.
 *
 * An exponent of $0$ is a constant term, and it is here on purpose: a constant is an even
 * power in disguise, so it leaves an even rule even and it stops an otherwise odd rule from
 * being odd. Both of those are exactly the reading a learner who classifies by eye misses.
 */
const PARITY_SHAPES: readonly (readonly (readonly [number, number])[])[] = [
  // Every exponent even.
  [
    [4, 2],
    [2, 0],
    [4, 0],
    [6, 2],
  ],
  // Every exponent odd.
  [
    [3, 1],
    [5, 1],
    [5, 3],
  ],
  // One of each, so the rule matches neither test.
  [
    [3, 2],
    [2, 1],
    [3, 0],
    [4, 1],
  ],
];

/** The three answers, in the order the prompt lists them. */
const PARITY_VERDICTS = ["even", "odd", "neither"] as const;

/**
 * The two exponents an instance was drawn with, recovered from the params it recorded.
 *
 * Exported because the practice worked-solution FIGURE has to print the rule the prompt printed,
 * and `params` records which shape was drawn rather than the shape itself. The alternative was a
 * copy of {@link PARITY_SHAPES} in the web layer, which is free to drift off this one, and a
 * drifted copy does not merely mislabel a diagram: this template's verdict is DERIVED from the
 * exponents, so a figure reading a stale table would classify a rule the learner was never
 * shown and could contradict a correct answer. Nothing about the drawn coefficients is needed,
 * since `first` and `second` are already in the params.
 */
export function d6ParityExponents(
  kind: number,
  shapeIndex: number,
): readonly [number, number] {
  const shapes =
    PARITY_SHAPES[kind] ?? (PARITY_SHAPES[0] as readonly (readonly [number, number])[]);
  return shapes[shapeIndex] ?? (shapes[0] as readonly [number, number]);
}

/**
 * L2b, the symmetry call, settled algebraically.
 *
 * The verdict is derived from the drawn exponents rather than from the branch that drew
 * them, so the printed rule and the key cannot disagree. Every instance carries two terms,
 * which is the fewest that lets the mixed case exist at all: with one term the answer is
 * readable off a single exponent, and the whole point of the third option is a rule where
 * one term holds still while the other flips.
 */
export const d6_fun9_parity_test_l2: ItemTemplate = {
  template_id: "d6.fun9.parity-test.l2",
  node_id: FUN9_NODE,
  difficulty: 2,
  generate(rng: Rng, ctx?: GenerateContext) {
    const kind = rng.int(0, 2);
    const shapes: readonly (readonly [number, number])[] = PARITY_SHAPES[kind] ?? [[4, 2]];
    const shapeIndex = rng.int(0, shapes.length - 1);
    const exponents: readonly [number, number] = shapes[shapeIndex] ?? [4, 2];
    const first = rng.int(1, 6) * (rng.int(0, 1) === 1 ? -1 : 1);
    const second = rng.int(1, 9) * (rng.int(0, 1) === 1 ? -1 : 1);
    const terms: PolyTerm[] = [
      { coef: first, exp: exponents[0] },
      { coef: second, exp: exponents[1] },
    ];
    const allEven = terms.every((term) => term.exp % 2 === 0);
    const allOdd = terms.every((term) => term.exp % 2 === 1);
    const verdict = allEven
      ? PARITY_VERDICTS[0]
      : allOdd
        ? PARITY_VERDICTS[1]
        : PARITY_VERDICTS[2];
    const rule = polyTex(terms);
    const answerLine =
      "Answer with exactly one of `even`, `odd`, or `neither`, typed in lowercase.";
    const neutral = `The function $h$ is given by $h(x) = ${rule}$. Is $h$ even, odd, or neither? ${answerLine}`;
    const themed = `A load trace over one shift is logged as $h(x) = ${rule}$, with $x$ counted in hours before and after noon. Set the readings at $-x$ against the readings at $x$: is $h$ even, odd, or neither? ${answerLine}`;
    const flipped = reflected(terms);
    const evidence = `h(-x) = ${substitutedTex(terms)} = ${polyTex(flipped)}`;
    const settled = allEven
      ? `Every exponent divides by $2$, so no term changes sign and the rule comes back exactly as it was: $h(-x) = h(x)$.`
      : allOdd
        ? `No exponent divides by $2$, so every term changes sign and the rule comes back as its own opposite: $h(-x) = -h(x)$.`
        : `One exponent divides by $2$ and one does not, so one term comes back unchanged while the other changes sign. That leaves $h(-x) = ${polyTex(flipped)}$, which is neither $h(x) = ${rule}$ nor $-h(x) = ${polyTex(negated(terms))}$.`;
    const named = allEven
      ? `So $h$ is even.`
      : allOdd
        ? `So $h$ is odd.`
        : `So $h$ is neither even nor odd.`;
    return {
      prompt: ctx?.form === "practice" ? themed : neutral,
      answer: multipleChoiceAnswer(verdict),
      params: { kind, shapeIndex, first, second },
      hints: [
        "Replace every $x$ in the rule with $-x$, then tidy the brackets. That substitution is the only thing that settles this, and a glance at the shape of the graph is not.",
        "Compare what you get with the original rule, and also with the original rule multiplied by $-1$. A match with the first is symmetry in the $y$-axis; a match with the second is symmetry through the origin; if no match holds, there is no symmetry to report.",
        "A power of $x$ changes sign under that substitution exactly when its exponent does not divide by $2$, so read the exponent on each term, remembering that a plain number is a power with exponent zero, and then see whether the rule changes sign as a whole, holds still as a whole, or does some of each.",
      ],
      worked_solution: [
        `Replace every $x$ with $-x$ and tidy the brackets: $${evidence}$.`,
        settled,
        named,
      ],
    };
  },
  // Keyed on the SHAPE and the coefficients rather than on the verdict, because there are
  // only three verdicts and this template owes six distinct retry variants. Tagged so it
  // cannot collide with the reading shape sharing this cell.
  varietyKey: (params) =>
    `p:${params.kind}:${params.shapeIndex}:${params.first}:${params.second}`,
};

/* ---------------------------------------------------------------------------- L3 */

/**
 * L3a, where one point goes when the input is SCALED and the output is scaled and flipped.
 *
 * A scale inside the brackets is the hardest case in the node, because undoing it divides
 * where the written number multiplies. The outside multiplier is never $\pm 1$, so it is
 * always printed and always does something, and it may be negative, so a learner who
 * carries the magnitude and drops the sign is caught.
 *
 * The abscissa is drawn as a MULTIPLE of the inside scale, so the landed point stays on the
 * integer lattice and the answer is an ordinary coordinate pair.
 */
export const d6_fun9_stretch_point_l3: ItemTemplate = {
  template_id: "d6.fun9.stretch-point.l3",
  node_id: FUN9_NODE,
  difficulty: 3,
  generate(rng: Rng, ctx?: GenerateContext) {
    const scale = rng.int(2, 3);
    let landedX = 0;
    let py = 0;
    let gain = 0;
    do {
      landedX = rng.int(-4, 4);
      py = rng.int(-6, 6);
      gain = rng.pick([-3, -2, 2, 3]);
      // A zero abscissa is the one input a scale inside the brackets leaves alone, so it
      // hides the whole point of the shape; a zero ordinate does the same to the multiplier.
    } while (landedX === 0 || py === 0);
    const px = landedX * scale;
    const landedY = gain * py;
    const rule = `g(x) = ${coefficient(gain)}f(${scale}x)`;
    const neutral = `The point $(${px},\\, ${py})$ lies on the graph of $f$. Give the point that must lie on the graph of $${rule}$. Write your answer as a coordinate pair.`;
    const themed = `A chart recorder's trace passes through the point $(${px},\\, ${py})$. The telemetry loft re-runs it as $${rule}$, which changes the recorder's gain and the speed the paper is drawn at. Give the point the re-run trace must pass through. Write your answer as a coordinate pair.`;
    return {
      prompt: ctx?.form === "practice" ? themed : neutral,
      answer: pointAnswer(`(${landedX}, ${landedY})`),
      params: { px, py, scale, gain },
      hints: [
        "Two multipliers are at work and they sit in different places: one multiplies the input inside the function's brackets, the other multiplies the output outside them.",
        "Inside the brackets, the multiplier is applied to the input, so the new $x$ is the value that makes the bracket come out equal to the $x$ you were given. Undoing a multiplication means dividing, so the graph is drawn in toward the vertical axis rather than pulled away from it.",
        "Outside the brackets, the multiplier is applied to the output, so the new $y$ is the $y$ you were given times that number, sign and all.",
      ],
      worked_solution: [
        `The multiplier inside the brackets acts on the input, so the new point is the input that makes the bracket read $${px}$. Solve $${scale}x = ${px}$, which gives $x = ${landedX}$.`,
        `The multiplier outside the brackets acts on the output: $${gain} \\times ${operand(py)} = ${landedY}$.`,
        `So the point on $g$ is $(${landedX}, ${landedY})$.`,
      ],
    };
  },
  // Keyed on the LANDED point, which is the answer.
  varietyKey: (params) =>
    `t:${(params.px ?? 0) / (params.scale ?? 1)}:${(params.gain ?? 0) * (params.py ?? 0)}`,
};

/**
 * L3b, a reading off a stretch, a reflection and a shift together, where the order of the
 * two OUTSIDE operations decides the value.
 *
 * This is the node's flagship shape, and its last worked step is the reason it exists: it
 * carries out the same two outside operations in the wrong order and prints the different
 * number that comes out, so "the order is not free" is a computed fact on the page rather
 * than a rule the learner is asked to take on trust. The two values cannot coincide, because
 * $a \cdot v + k$ and $a(v + k)$ agree only when the multiplier is one or the constant is
 * zero, and the guards below rule out both.
 *
 * The parent is $x^{2} + m$ with $m$ at least one, so the second hint's "add the constant
 * the rule carries" holds on every draw.
 */
export const d6_fun9_order_value_l3: ItemTemplate = {
  template_id: "d6.fun9.order-value.l3",
  node_id: FUN9_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let m = 0;
    let inside = 0;
    let gain = 0;
    let shift = 0;
    let inner = 0;
    let value = 0;
    do {
      m = rng.int(1, 6);
      inside = rng.int(-5, 5);
      gain = rng.pick([-3, -2, 2, 3]);
      shift = rng.int(-8, 8);
      inner = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]);
      value = gain * (inner * inner + m) + shift;
      // Both outside numbers stay live (a zero shift would make the order question vacuous,
      // and the multiplier is never one), and a reading of zero would make the final step
      // read as though nothing was added.
    } while (inside === 0 || shift === 0 || value === 0);
    const at = inner - inside;
    const parentValue = inner * inner + m;
    const stretched = gain * parentValue;
    const wrongOrder = gain * (parentValue + shift);
    return {
      prompt: `The function $f$ is given by $f(x) = x^{2} + ${m}$, and a second function by $g(x) = ${coefficient(gain)}f(x ${signTerm(inside)}) ${signTerm(shift)}$. Find $g(${at})$. Enter one number.`,
      answer: numericAnswer(`${value}`),
      params: { m, inside, gain, shift, inner },
      hints: [
        "Start inside the brackets: put the given value into the expression there, and that tells you which input of $f$ the question actually needs.",
        "Use $f$'s own rule at that input, squaring it before you add the constant the rule carries.",
        "The two numbers outside the brackets are not interchangeable. The multiplier is applied to $f$'s value first, and the constant on the end is applied to the result of that.",
      ],
      worked_solution: [
        `Settle the bracket first: $${at} ${signTerm(inside)} = ${inner}$, so $g(${at}) = ${coefficient(gain)}f(${inner}) ${signTerm(shift)}$.`,
        `Use $f$'s own rule at that input: $f(${inner}) = ${operand(inner)}^{2} + ${m} = ${parentValue}$.`,
        `The multiplier outside the brackets acts on that value first: $${gain} \\times ${parentValue} = ${stretched}$.`,
        `The constant on the end is applied to the result: $${stretched} ${signTerm(shift)} = ${value}$.`,
        `So $g(${at}) = ${value}$. Taking the constant first instead would give $${gain} \\times (${parentValue} ${signTerm(shift)}) = ${wrongOrder}$, a different reading, so the order of those two is not free.`,
      ],
    };
  },
  // Keyed on the READING, recomputed from the params, and tagged so it cannot collide with
  // the landed-point key of the other L3 shape.
  varietyKey: (params) =>
    `o:${(params.gain ?? 0) * ((params.inner ?? 0) ** 2 + (params.m ?? 0)) + (params.shift ?? 0)}`,
};

/** Every FUN.9 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const FUN9_TEMPLATES: readonly ItemTemplate[] = [
  d6_fun9_shift_point_l1,
  d6_fun9_inside_outside_value_l2,
  d6_fun9_parity_test_l2,
  d6_fun9_stretch_point_l3,
  d6_fun9_order_value_l3,
];
