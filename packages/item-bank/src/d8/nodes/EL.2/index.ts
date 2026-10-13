import {
  expressionAnswer,
  type ItemTemplate,
  multipleChoiceAnswer,
  numericAnswer,
  pointAnswer,
  type Rng,
} from "../../../template";

/**
 * EL.2 practice templates: the graph of an exponential, and what a transformation does to
 * it. Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix, ordered by how much of the
 * transformation the learner has to reconstruct rather than read:
 *
 *  - L1  the horizontal asymptote of `a b^x + k`, which is the constant on the end;
 *  - L2a the `y`-intercept value, where the power collapses to one and a sign can flip it;
 *  - L2b where the anchor point `(0, 1)` lands after a described move;
 *  - L3a the exponent after TWO horizontal shifts, so the directions have to be combined;
 *  - L3b the name of the transformation between two rules, over six candidate answers.
 *
 * ## Why the L3a shape asks for the EXPONENT and not the whole right-hand side
 *
 * The domain plan's row for this shape reads "the expression after the equals sign", and
 * that is not gradable: the v2 checker's expression grammar accepts a `^` only over a
 * CONSTANT INTEGER exponent, so `3*2^(x - 4)` is rejected `invalid_input/unsupported_exponent`
 * before any comparison happens. That is measured rather than read off the spec, and it is
 * pinned in `packages/item-bank/src/d8el2.test.ts` so the reason this shape is scoped the way
 * it is cannot quietly stop being true.
 *
 * So the prompt prints the coefficient and the base, leaves the exponent as the blank, and
 * asks for the expression that fills it. Nothing is lost pedagogically: a horizontal shift
 * changes only the exponent, the direction reversal (`right` subtracts) is the whole of the
 * misconception this tier exists to catch, and composing the given shift with a new one is
 * genuine second-step work. What IS avoided is a prompt that invites an answer the grader
 * cannot parse, which would fail a learner for answering exactly what was asked.
 *
 * No shape asks for a two-sided equation, following the LF.2 and RAT.5 discipline.
 *
 * ## Why the hints in this file carry no standalone digits
 *
 * Three keys here are small integers and `hint_leaks_answer` matches a key as a standalone
 * value, so a hint reading "compare it with $1$" would leak on precisely the draws whose
 * answer is $1$ and pass on every other one: a leak that depends on the seed is worse than a
 * constant one. The hints are written digit-free instead, exactly as EL.3's are.
 *
 * The two non-numeric shapes have the same problem in words. `d8.el2.which-transform.l3`
 * answers with one of six phrases, and the leak check strips whitespace before matching, so a
 * hint containing "shift up" would leak the key `shift up`; the hints there describe what
 * each piece of the rule DOES and never name a direction beside the word for moving. The
 * `d8.el2.transform-rhs.l3` key is an expression in $x$, so its hints never print a concrete
 * exponent either.
 *
 * ## Seeding
 *
 * The shapes are seeded from Lippman & Rasmussen, *Precalculus: An Investigation of
 * Functions* (opentextbookstore.com), section 4.2 "Graphs of Exponential Functions", whose
 * exercise ladder runs from reading a horizontal asymptote and an intercept off a graph,
 * through "find a formula for the function graphed", up to describing the long-run behavior
 * of a shifted and reflected exponential. Extracted PDF text flattens an exponent onto the
 * line beside its base (`2 x` for `2^x`), so every rule, key and asymptote below was
 * re-derived by hand rather than transcribed. The diversification off the seed: the seed's
 * transformation exercises hand over one move at a time, while L3a composes a second shift
 * onto a rule that already carries one, and L3b withholds the name of the move entirely so
 * the learner has to read it off the two rules rather than confirm a stated one.
 *
 * Every template declares a `varietyKey` over the numbers that fix its instance, so a cell
 * never freezes two items that are the same question in new clothes.
 */

export const EL2_NODE = "EL.2";

/** The task line every ordered-pair prompt carries. Only the math is delimited. */
const PAIR_TASK = " Give the answer as an ordered pair, typed like `(3, -2)`.";

/** The six phrases `d8.el2.which-transform.l3` grades against, in a fixed order. */
export const EL2_TRANSFORM_NAMES: readonly string[] = [
  "shift up",
  "shift down",
  "shift left",
  "shift right",
  "reflect over the x-axis",
  "reflect over the y-axis",
];

/** `+` or `-` as the operator that precedes a signed value's magnitude. */
function op(value: number): string {
  return value < 0 ? "-" : "+";
}

/** A constant tail on a rule: ` + 5`, ` - 3`, or nothing at all when it is zero. */
function tail(k: number): string {
  return k === 0 ? "" : ` ${op(k)} ${Math.abs(k)}`;
}

/**
 * `unit` or `units`, agreeing with the distance printed in front of it.
 *
 * Every shift here is drawn, so a magnitude of one turns up on its own schedule and the
 * plural was written once for all of them. Signed values are accepted and read by magnitude,
 * because a shift of `-1` prints as one down.
 */
function units(distance: number): string {
  return Math.abs(distance) === 1 ? "unit" : "units";
}

/**
 * An exponent of the form `x - p`, written with `p`'s sign folded into the operator.
 *
 * It doubles as the mathjs-parseable answer KEY, which is safe only because it carries no
 * LaTeX macro: `x - 4` reads the same to KaTeX and to the grader. Anything richer would need
 * the two spellings kept apart, the way LF.2 keeps `lineTex` and `linearKey` apart.
 */
function shiftedExponent(p: number): string {
  return p === 0 ? "x" : `x ${op(-p)} ${Math.abs(p)}`;
}

/** A coordinate pair as LaTeX, with the comma spaced the way KaTeX wants it. */
function pointTex(x: number, y: number): string {
  return `(${x},\\, ${y})`;
}

/** A nonzero magnitude in `[1, max]`, signed by a fresh coin flip. */
function signedInt(rng: Rng, max: number, min = 1): number {
  const magnitude = rng.int(min, max);
  return rng.int(0, 1) === 1 ? -magnitude : magnitude;
}

/**
 * L1, the horizontal asymptote of `a b^x + k`.
 *
 * The whole tier is one reading: a power of a base above one never reaches zero, so the far
 * end of the graph is decided by the constant and by nothing else. The coefficient is always
 * at least two so the rule prints a real product, and the constant is never zero, so the
 * answer is never the `y = 0` a learner can give without looking at the rule at all.
 */
export const d8_el2_asymptote_l1: ItemTemplate = {
  template_id: "d8.el2.asymptote.l1",
  node_id: EL2_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const a = rng.int(2, 9);
    const b = rng.pick([2, 3, 4, 5]);
    const k = signedInt(rng, 9);
    return {
      prompt: `The graph of $y = ${a} \\cdot ${b}^{x}${tail(k)}$ has one horizontal asymptote, and it is a horizontal line $y = c$. What is $c$? Enter one number.`,
      answer: numericAnswer(`${k}`),
      params: { a, b, k },
      hints: [
        "A power of a base above one never reaches zero, however far the exponent is pushed the other way, so the power term shrinks toward nothing without ever getting there.",
        "Once that term has shrunk away, the only thing left holding the graph up is the constant on the end. Read that constant off on its own, carrying the sign written in front of it rather than dropping it: the coefficient in front of the power has no say in where the graph levels off.",
      ],
      worked_solution: [
        `As $x$ runs far to the left, the exponent becomes a large negative number and $${b}^{x}$ shrinks toward $0$ without reaching it.`,
        `So the whole term $${a} \\cdot ${b}^{x}$ shrinks toward $0$ as well.`,
        `What survives is the constant on the end, so the outputs press toward $${k}$.`,
        `The horizontal asymptote is $y = ${k}$, which makes $c = ${k}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.b ?? 0}:${params.k ?? 0}`,
};

/**
 * L2a, the `y`-intercept value of `s a b^x + k`.
 *
 * A step up from L1 because two things have to happen rather than one: the power has to
 * collapse (any base to the zero power is one, whatever the base), and the sign in front of
 * the coefficient then has to be carried into the sum. A learner who reads the intercept
 * off the constant alone gets L1's answer, which is exactly the confusion this tier
 * separates, and half the draws are reflected so the sign is a live question.
 */
export const d8_el2_intercept_l2: ItemTemplate = {
  template_id: "d8.el2.intercept.l2",
  node_id: EL2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const a = rng.int(2, 9);
    const b = rng.pick([2, 3, 4, 5]);
    const k = signedInt(rng, 9);
    const negated = rng.int(0, 1);
    const coefficient = negated === 1 ? -a : a;
    const intercept = coefficient + k;
    const lead = negated === 1 ? `-${a}` : `${a}`;
    return {
      prompt: `At what height does the graph of $y = ${lead} \\cdot ${b}^{x}${tail(k)}$ cross the $y$-axis? Enter one number.`,
      answer: numericAnswer(`${intercept}`),
      params: { a, b, k, negated, intercept },
      hints: [
        "Every point on the $y$-axis has an input of zero, so put zero in for $x$ and evaluate what is left.",
        "Any base raised to the zero power is one, whatever that base happens to be, so the power collapses and the coefficient is all that remains of that term.",
        "Add the constant on the end to that coefficient, carrying the sign written in front of it rather than dropping it.",
      ],
      worked_solution: [
        `The graph crosses the $y$-axis where $x = 0$, so substitute that input.`,
        `$y = ${lead} \\cdot ${b}^{0}${tail(k)}$.`,
        `Any base to the power $0$ is $1$, so $${b}^{0}$ contributes a factor of $1$ and the term is just $${coefficient}$.`,
        `That leaves $y = ${coefficient}${tail(k)}$, which comes to $${intercept}$.`,
        `The graph crosses the $y$-axis at a height of $${intercept}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.negated ?? 0}:${params.a ?? 0}:${params.b ?? 0}:${params.k ?? 0}`,
};

/** How the four anchor moves are described, and where each one sends `(0, 1)`. */
interface AnchorMove {
  description: string;
  x: number;
  y: number;
  /** The steps the worked solution walks, after the shared opening line. */
  steps: readonly string[];
}

/**
 * L2b, where the anchor point `(0, 1)` lands.
 *
 * `(0, 1)` sits on every `y = b^x`, whatever the base, which is what makes it the point
 * worth tracking: it is the one point a learner can carry through a transformation without
 * evaluating a power. The four moves are chosen so that each one changes a DIFFERENT part of
 * the pair: a vertical shift and a stretch rewrite the height, a horizontal shift rewrites
 * the first coordinate and leaves the height alone, and the reflected draw does both.
 */
export const d8_el2_anchor_point_l2: ItemTemplate = {
  template_id: "d8.el2.anchor-point.l2",
  node_id: EL2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const b = rng.pick([2, 3, 4, 5]);
    const kind = rng.int(0, 3);
    // Every parameter is drawn before the branch, so the draw order never depends on `kind`.
    const k = signedInt(rng, 9);
    const h = rng.int(1, 6);
    const rightward = rng.int(0, 1);
    const stretch = rng.int(2, 9);
    // A reflected anchor already sits at a height of -1, so a shift of 2 would put it back
    // on the point it started from and the figure would show a move that changed nothing.
    const mirrorShift = k === 2 ? 3 : k;
    const dx = rightward === 1 ? h : -h;

    const moves: readonly AnchorMove[] = [
      {
        description: `shifted $${Math.abs(k)}$ ${units(k)} ${k > 0 ? "up" : "down"}`,
        x: 0,
        y: 1 + k,
        steps: [
          `A vertical shift adds the same amount to every output, so the first coordinate does not move and the height gains $${k}$.`,
          `The height becomes $1 ${op(k)} ${Math.abs(k)} = ${1 + k}$.`,
        ],
      },
      {
        description: `shifted $${h}$ ${units(h)} to the ${rightward === 1 ? "right" : "left"}`,
        x: dx,
        y: 1,
        steps: [
          `A horizontal shift moves every point sideways and changes no height, so the point keeps its height of $1$.`,
          `Moving ${rightward === 1 ? "right" : "left"} by $${h}$ takes the first coordinate from $0$ to $${dx}$.`,
        ],
      },
      {
        description: `reflected over the $x$-axis and then shifted $${Math.abs(mirrorShift)}$ ${units(mirrorShift)} ${mirrorShift > 0 ? "up" : "down"}`,
        x: 0,
        y: -1 + mirrorShift,
        steps: [
          `Reflecting over the $x$-axis replaces each height with its opposite, so the height of $1$ becomes $-1$.`,
          `The shift then applies to that new height: $-1 ${op(mirrorShift)} ${Math.abs(mirrorShift)} = ${-1 + mirrorShift}$.`,
        ],
      },
      {
        description: `stretched vertically by a factor of $${stretch}$`,
        x: 0,
        y: stretch,
        steps: [
          `A vertical stretch multiplies every output by the same factor, so the first coordinate stays where it is.`,
          `The height becomes $${stretch} \\cdot 1 = ${stretch}$.`,
        ],
      },
    ];
    const move = moves[kind] ?? (moves[0] as AnchorMove);

    return {
      prompt: `The point $(0, 1)$ lies on the graph of $y = ${b}^{x}$. That graph is ${move.description}. Where does the point end up?${PAIR_TASK}`,
      answer: pointAnswer(`(${move.x}, ${move.y})`),
      params: { kind, b, k, h, rightward, stretch, mirrorShift, ax: move.x, ay: move.y },
      hints: [
        "Track the two coordinates separately and ask which of them the described move can reach. One of the two is untouched by it.",
        "A move up or down, and a vertical stretch, rewrite the height and leave the first coordinate alone. A move sideways does the reverse: it leaves the height alone and carries the first coordinate in the direction the graph itself went.",
        "Where a mirror over the $x$-axis is part of the move, apply it before any shift: it replaces the height with its opposite, and the shift is then measured from there.",
      ],
      worked_solution: [
        `The point starts at $(0, 1)$, which is on $y = ${b}^{x}$ because any base to the power $0$ is $1$.`,
        ...move.steps,
        `So the point lands at $${pointTex(move.x, move.y)}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.kind ?? 0}:${params.ax ?? 0}:${params.ay ?? 0}`,
};

/**
 * L3a, the exponent after a SECOND horizontal shift.
 *
 * The rule handed over already carries a shift, so the learner cannot read the answer off
 * the sentence: the new shift has to be combined with the one already in the exponent, and a
 * shift in the opposite direction partly undoes it. The `right subtracts` reversal is
 * therefore asked twice over in one item, which is what separates this from the L2 shapes.
 *
 * `c` is never zero, so the answer is never a bare `x`, and the two shifts never simply
 * cancel into the untransformed rule.
 */
export const d8_el2_transform_rhs_l3: ItemTemplate = {
  template_id: "d8.el2.transform-rhs.l3",
  node_id: EL2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const a = rng.int(2, 9);
    const b = rng.pick([2, 3, 5]);
    let p = signedInt(rng, 5);
    let d = signedInt(rng, 6);
    // `c` is the single shift the finished exponent records. Zero would print a bare `x`
    // and would also mean the two shifts had cancelled, which is a different question.
    while (p + d === 0) {
      p = signedInt(rng, 5);
      d = signedInt(rng, 6);
    }
    const c = p + d;
    return {
      prompt: `The graph of $y = ${a} \\cdot ${b}^{${shiftedExponent(p)}}$ is shifted $${Math.abs(d)}$ ${units(d)} to the ${d > 0 ? "right" : "left"}. The new rule can be written $y = ${a} \\cdot ${b}^{E}$, where $E$ is an expression in $x$. Write $E$. Give only that expression, not a whole equation.`,
      answer: expressionAnswer(shiftedExponent(c), ["x"], "combined_polynomial"),
      params: { a, b, p, d, c },
      hints: [
        "A sideways shift reaches only the exponent, so the coefficient and the base come through untouched and the whole question is what happens to the exponent that is already there.",
        "Moving a graph to the right takes something away from the input before the base uses it, and moving it left adds. Apply that to the exponent you were handed rather than to a bare variable, because it already records a shift of its own.",
        "The two shifts collapse into one, so work out the single amount now being taken away from the input. A second move the same way adds to the shift already there, and a move the other way cuts into it.",
      ],
      worked_solution: [
        `Shifting a graph horizontally replaces the input, so a shift of $${Math.abs(d)}$ to the ${d > 0 ? "right" : "left"} means replacing $x$ by $x ${op(-d)} ${Math.abs(d)}$.`,
        `The exponent was $${shiftedExponent(p)}$, so after the replacement it reads $(x ${op(-d)} ${Math.abs(d)}) ${op(-p)} ${Math.abs(p)}$.`,
        `Combine the two constants sitting in that exponent: $${-d} ${op(-p)} ${Math.abs(p)} = ${-c}$.`,
        `So the exponent is $${shiftedExponent(c)}$, and the new rule is $y = ${a} \\cdot ${b}^{${shiftedExponent(c)}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.p ?? 0}:${params.d ?? 0}`,
};

/**
 * L3b, name the transformation between two rules.
 *
 * Six candidate answers, and they are chosen so that no pair can be separated by a partial
 * rule: a learner who knows only that a constant moves the graph still has to decide up
 * against down, and one who spots a minus sign still has to decide which axis it mirrors
 * over. Nothing is stated in the prompt except the two rules, so the move has to be read off
 * them rather than confirmed.
 */
export const d8_el2_which_transform_l3: ItemTemplate = {
  template_id: "d8.el2.which-transform.l3",
  node_id: EL2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const a = rng.int(2, 9);
    const b = rng.pick([2, 3, 4, 5]);
    const kind = rng.int(0, 5);
    const c = rng.int(1, 8);
    const base = `${a} \\cdot ${b}^{x}`;
    const cases: readonly { name: string; tex: string; reason: string }[] = [
      {
        name: "shift up",
        tex: `${a} \\cdot ${b}^{x} + ${c}`,
        reason: `A constant is added at the very end, which raises every output by $${c}$, so the whole graph rises by $${c}$.`,
      },
      {
        name: "shift down",
        tex: `${a} \\cdot ${b}^{x} - ${c}`,
        reason: `A constant is subtracted at the very end, which lowers every output by $${c}$, so the whole graph drops by $${c}$.`,
      },
      {
        name: "shift left",
        tex: `${a} \\cdot ${b}^{x + ${c}}`,
        reason: `The constant sits inside the exponent and is ADDED, so every output arrives $${c}$ units earlier than it used to and the graph moves toward the negative side.`,
      },
      {
        name: "shift right",
        tex: `${a} \\cdot ${b}^{x - ${c}}`,
        reason: `The constant sits inside the exponent and is SUBTRACTED, so every output arrives $${c}$ units later than it used to and the graph moves toward the positive side.`,
      },
      {
        name: "reflect over the x-axis",
        tex: `-${a} \\cdot ${b}^{x}`,
        reason: `A minus sign in front of the whole expression turns every output into its opposite, which mirrors the graph over the horizontal axis.`,
      },
      {
        name: "reflect over the y-axis",
        tex: `${a} \\cdot ${b}^{-x}`,
        reason: `A minus sign is attached to the exponent's variable, so the value at $x$ is the old value at $-x$ and the two sides of the graph trade places, mirroring it over the vertical axis.`,
      },
    ];
    const chosen = cases[kind] ?? (cases[0] as (typeof cases)[number]);
    const options = EL2_TRANSFORM_NAMES.map((phrase) => `\`${phrase}\``).join(", ");
    return {
      prompt: `Let $f(x) = ${base}$ and $g(x) = ${chosen.tex}$. Which single transformation turns the graph of $f$ into the graph of $g$? Answer with exactly one of ${options}, typed in lowercase.`,
      answer: multipleChoiceAnswer(chosen.name),
      params: { kind, a, b, c: kind < 4 ? c : 0 },
      hints: [
        "Compare the two rules piece by piece: the coefficient in front, the base, the exponent, and any constant standing at the very end. Exactly one of those has changed, and which one it is decides whether the graph was moved or mirrored.",
        "A constant standing at the very end raises or lowers the whole graph. A constant living inside the exponent carries it sideways instead, and the direction it goes is the opposite of the sign written there.",
        "A minus sign in front of the whole expression turns every output into its opposite, which mirrors the graph over the horizontal axis. A minus sign attached to the exponent's variable swaps the two sides of the graph instead, mirroring it over the vertical one.",
      ],
      worked_solution: [
        `Set the two rules beside each other: $f(x) = ${base}$ and $g(x) = ${chosen.tex}$.`,
        `The base is the same in both, so the change is ${kind < 2 ? "the constant standing at the end" : kind < 4 ? "a constant inside the exponent" : "a minus sign"}.`,
        chosen.reason,
        `So the transformation is \`${chosen.name}\`.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.kind ?? 0}:${params.a ?? 0}:${params.b ?? 0}:${params.c ?? 0}`,
};

/** EL.2's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const EL2_TEMPLATES: readonly ItemTemplate[] = [
  d8_el2_asymptote_l1,
  d8_el2_intercept_l2,
  d8_el2_anchor_point_l2,
  d8_el2_transform_rhs_l3,
  d8_el2_which_transform_l3,
];
