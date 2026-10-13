import {
  type ItemTemplate,
  numericAnswer,
  type Rng,
  solutionSetAnswer,
} from "../../../template";
import { isAdvertisedSolution, signedTerm, solutionKey, termSum } from "../_shared";

/**
 * POL.5 practice templates: reading a parabola's vertex, its intercepts and its extreme value.
 * Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix, and the ladder is one idea approached
 * from four sides rather than four ideas:
 *
 *  - L1  the vertex's `x`-coordinate of a quadratic in standard form, which is the single move
 *        the rest of the node is built on;
 *  - L2a the EXTREME VALUE of a quadratic in standard form, which is that move followed by a
 *        substitution, and the first shape whose answer is a height rather than a position;
 *  - L2b the `y`-intercept of a quadratic in VERTEX form, which is the intercept nothing has to
 *        be solved to find and the one a learner reaches for the vertex's own height instead;
 *  - L3a the `x`-intercepts of an expanded quadratic, which cannot be read until it is factored;
 *  - L3b the extreme value of a quadratic in FACTORED form, reached from the symmetry between
 *        its two intercepts rather than from the standard-form formula.
 *
 * ## Where the cross-skill dependency sits, and why it sits at L3
 *
 * Only L3a needs anything from outside this node's prerequisites. `POL.5` takes `FUN.1`, `CG.1`
 * and `POL.1`, and `Node_Spine_v4.md` records the reason as *"prereqs fixed: graphing != solving
 * mastery"*, so factoring a trinomial is deliberately NOT assumed here. That shape carries a
 * `PRACTICE_NPC_NOTES` line naming `POL.2`, per the rule of thumb in the `practice-hints` skill:
 * same domain, and the two nodes are not prerequisites of each other.
 *
 * **Keeping it at L3 is load-bearing rather than tidy.** `practice-walk.ts` freezes the L2 tier
 * ONLY, so the four items the diagnostic probes this node with are drawn from L1's successor
 * shapes and never from L3a. A learner meeting `POL.5` in a placement is therefore asked nothing
 * that its own prerequisite closure does not cover, which is what stops a wrong answer here from
 * recording a gap that is really a gap somewhere else.
 *
 * ## Answer paths
 *
 * A vertex coordinate, an extreme value and a `y`-intercept are all single readings on an axis,
 * so all four of those shapes are `numeric`. A pair of `x`-intercepts is a roster and so is a
 * `solution_set`. Nothing here keys an expression, which is why no prompt in this file invites a
 * caret or a bracket: measured against the real v2 checker, a vertex-form key like `2(x - 3)^2 - 5`
 * is refused `invalid_input / unsupported_syntax` for the same monomial-times-bracket reason
 * `POL.2`'s L1 shape and `POL.7`'s docblock both record, so "give the rule in vertex form" is not
 * an authorable question on this bank and is left to the lesson's own widgets.
 *
 * ## Why no hint here contains a digit AT ALL, `x^{2}` included
 *
 * Four of the five shapes key a small signed integer and `hint_leaks_answer` matches the key as
 * a standalone value, so a hint reading "halve the coefficient, which is $6$ here" would leak on
 * exactly the draws whose answer is $6$ and pass on every other one. That is worse than a
 * constant leak, because whether the sweep catches it depends on the seed.
 *
 * **The trap that is easy to miss is that the exponent counts.** The leak pattern is
 * `(?<!\d)KEY(?!\d)` over the hint with its whitespace stripped, so in "the coefficient of the
 * $x^{2}$ term" the `2` sits between a brace and a brace, which are not digits, and a draw
 * keyed `2` leaks through the notation rather than through anything the author meant to say.
 * Every hint below therefore says "the squared term" and "twice", and carries no numeral
 * anywhere. The worked solutions are full of numbers, which is correct: they arrive after the
 * attempt.
 */

export const POL5_NODE = "POL.5";

/** `3x^{2}` / `x^{2}` / `-x^{2}`: the leading term, with a coefficient of one left unwritten. */
function squareTerm(coefficient: number): string {
  if (coefficient === 1) {
    return "x^{2}";
  }
  return coefficient === -1 ? "-x^{2}" : `${coefficient}x^{2}`;
}

/** `ax^{2} + bx + c`, with any zero coefficient dropped rather than printed. */
function standardForm(a: number, b: number, c: number): string {
  return termSum(squareTerm(a), signedTerm(b, "x"), signedTerm(c, ""));
}

/** `\left(x - 3\right)` / `\left(x + 2\right)`: the bracket that vanishes at `root`. */
function bracket(root: number): string {
  return `\\left(x ${root < 0 ? `+ ${-root}` : `- ${root}`}\\right)`;
}

/**
 * A signed number as a FACTOR: `\left(-3\right)` where it is negative and `4` where it is not.
 *
 * A bare minus sign directly after `\times` reads as an operator rather than as part of the
 * number it belongs to, which is why `lesson-katex` asks for a negative in parentheses. POL.6's
 * file carries the same helper for the same reason.
 */
function paren(value: number): string {
  return value < 0 ? `\\left(${value}\\right)` : `${value}`;
}

/** `x - 3` continued: subtracting a value, written so a negative reads as an addition. */
function takeAway(value: number): string {
  return value < 0 ? `+ ${-value}` : `- ${value}`;
}

/**
 * `2 \times ` / `\left(-1\right) \times ` / nothing at all: a leading factor about to multiply
 * something else.
 *
 * A coefficient of one is dropped rather than written, and a negative one is written in full
 * rather than as a bare minus sign: `-3 \times \left(-3\right)` reads as a subtraction of the
 * product where the leading factor is $-1$, which is a different expression.
 */
function timesFront(value: number): string {
  return value === 1 ? "" : `${paren(value)} \\times `;
}

/**
 * A roster TYPESET, with its braces escaped so KaTeX draws them.
 *
 * {@link solutionKey} builds the grader-legal key, whose braces are plain characters; dropped
 * into `$...$` unescaped they are LaTeX grouping and vanish, so a step reads `-5, 2` where it
 * meant to read a set. POL.3 and POL.7 escape them the same way.
 */
function rosterTex(...values: readonly number[]): string {
  return `\\{${[...values].sort((left, right) => left - right).join(", ")}\\}`;
}

/** The word a parabola's extreme value goes by, which is decided by which way it opens. */
function extremeWord(a: number): string {
  return a > 0 ? "minimum" : "maximum";
}

/** `opens upward` / `opens downward`, for a worked-solution step that has to say which. */
function openingWord(a: number): string {
  return a > 0 ? "opens upward" : "opens downward";
}

/**
 * Leading coefficients drawn for the standard-form shapes: never zero, and both signs, so the
 * extreme value is a minimum on some draws and a maximum on others.
 */
const LEAD_POOL: readonly number[] = [-4, -3, -2, -1, 1, 2, 3, 4];

/** Roots for the factored and expanded shapes: never zero, so every factor is a real bracket. */
const ROOT_POOL: readonly number[] = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6];

/**
 * L1, the vertex's `x`-coordinate of a quadratic in standard form.
 *
 * This is the move the whole node rests on, and it is asked on its own before anything is done
 * with it. Two errors are live on every draw and the shape is drawn to keep both live: the minus
 * sign in $x = -\dfrac{b}{2a}$ is dropped, which lands the learner on the reflection of the right
 * answer, and the denominator is read as $a$ rather than as $2a$, which lands them at twice it.
 * So `b` is never zero, both signs of `a` are drawn, and `a` is never one on every draw, because
 * each of those would quietly retire one of the two errors.
 */
export const d4_pol5_vertex_x_standard_l1: ItemTemplate = {
  template_id: "d4.pol5.vertex-x-standard.l1",
  node_id: POL5_NODE,
  difficulty: 1,
  concept: "vertex-x-from-standard-form",
  generate(rng: Rng) {
    const a = rng.pick(LEAD_POOL);
    // `h` is the answer, drawn first and never zero, so `b` follows from it and the division
    // always comes out whole. Drawing `b` instead and rejecting the fractional draws would bias
    // the parameter space towards the small `a` values, which are the easy ones.
    const h = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
    const b = -2 * a * h;
    const c = rng.pick([-9, -7, -5, -3, 3, 5, 7, 9, 11]);
    return {
      prompt: `The graph of $f(x) = ${standardForm(a, b, c)}$ is a parabola. What is the $x$-coordinate of its vertex? Enter one number, with its sign.`,
      answer: numericAnswer(`${h}`),
      params: { a, b, c, h },
      hints: [
        "A parabola is symmetric about the vertical line through its vertex, and the two arms of the curve are mirror images across that line. So the vertex sits at the one input the two halves of the graph agree on, and the coefficients settle where that is without any graphing.",
        "Take the coefficient of the $x$ term over twice the coefficient of the squared term, and then change its sign. Both parts matter: the doubling belongs in the denominator, and the sign is flipped after the division rather than left as it stands. The constant term plays no part at all, since sliding a parabola up or down moves the vertex without moving the line it sits on.",
      ],
      worked_solution: [
        `Read the two coefficients that matter: the $x^{2}$ term has coefficient $${a}$ and the $x$ term has coefficient $${b}$.`,
        `The vertex sits at $x = -\\dfrac{b}{2a}$, so substitute those two: $x = -\\dfrac{${b}}{2 \\times ${paren(a)}}$.`,
        `The denominator works out to $${2 * a}$, and $-\\dfrac{${b}}{${2 * a}}$ is $${h}$.`,
        `So the $x$-coordinate of the vertex is $${h}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.h ?? 0}`,
};

/**
 * L2a, the extreme value of a quadratic in standard form.
 *
 * The step up from L1 is that the answer is a HEIGHT rather than a position, so the vertex's
 * `x` is now the middle of the work instead of the end of it. That is the error this shape is
 * built around: a learner who stops at L1's answer reports the `x` where the extreme value
 * happens rather than the value itself.
 *
 * **The prompt names which of the two it is, and that is not a giveaway.** Which way a parabola
 * opens is a one-glance reading off the sign of `a`, and it is asked for in its own right by the
 * lesson's second widget; what this shape is for is the two-step computation underneath. The
 * word is DERIVED from the sign rather than drawn, so a prompt promising a minimum for a
 * downward parabola is impossible here, and `promptDerive.ts` re-checks the pairing off the
 * rendered text rather than taking it on trust.
 */
export const d4_pol5_extreme_value_standard_l2: ItemTemplate = {
  template_id: "d4.pol5.extreme-value-standard.l2",
  node_id: POL5_NODE,
  difficulty: 2,
  concept: "extreme-value-from-standard-form",
  generate(rng: Rng) {
    const a = rng.pick(LEAD_POOL);
    const h = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
    const b = -2 * a * h;
    const c = rng.pick([-11, -8, -6, -4, -1, 2, 5, 7, 10, 13]);
    // f(h) = a h^2 + b h + c, and with b = -2ah that collapses to c - a h^2. Both spellings are
    // computed the long way below so the worked solution walks the substitution the learner does.
    const value = a * h * h + b * h + c;
    return {
      prompt: `The graph of $f(x) = ${standardForm(a, b, c)}$ is a parabola. What is the ${extremeWord(a)} value of $f$? Enter one number, with its sign.`,
      answer: numericAnswer(`${value}`),
      params: { a, b, c, h, value },
      hints: [
        "The turning point is the only place a parabola stops rising or stops falling, so the value being asked for is the height of the graph at its vertex and nowhere else. That makes this two moves rather than one.",
        "Find the input at the vertex first, from the coefficient of $x$ over twice the coefficient of the squared term, with its sign changed. Then put that input back into the rule and work it out, because the question asks for a height and the input on its own is a position along the bottom of the page.",
      ],
      worked_solution: [
        `First locate the vertex along the $x$-axis: $x = -\\dfrac{${b}}{2 \\times ${paren(a)}} = ${h}$.`,
        `The parabola ${openingWord(a)}, since the $x^{2}$ coefficient is ${a > 0 ? "positive" : "negative"}, so the height there is its ${extremeWord(a)}.`,
        `Substitute $x = ${h}$ back into the rule: $${a} \\times ${paren(h)}^{2} ${signedTerm(b, "")} \\times ${paren(h)} ${signedTerm(c, "")}$.`,
        `That is $${a * h * h} ${signedTerm(b * h, "")} ${signedTerm(c, "")}$, which comes to $${value}$.`,
        `So the ${extremeWord(a)} value of $f$ is $${value}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.h ?? 0}:${params.c ?? 0}`,
};

/**
 * L2b, the `y`-intercept of a quadratic written in VERTEX form.
 *
 * The other two shapes at this tier and below start from standard form, where the `y`-intercept
 * is the constant term and there is nothing to do. Vertex form hides it, and hides it behind the
 * one number a learner has just been trained to care about: the `k` sitting outside the bracket
 * is the vertex's height, and taking it for the `y`-intercept is the whole of the mistake. So
 * `h` is never zero, which is exactly the draw on which the two coincide and the shape stops
 * asking anything.
 *
 * Nothing here needs expanding. A `y`-intercept is the value at an input of zero, which is
 * `FUN.1`'s evaluation and is a prerequisite of this node.
 */
export const d4_pol5_y_intercept_vertex_form_l2: ItemTemplate = {
  template_id: "d4.pol5.y-intercept-vertex-form.l2",
  node_id: POL5_NODE,
  difficulty: 2,
  concept: "y-intercept-from-vertex-form",
  generate(rng: Rng) {
    const a = rng.pick([-3, -2, -1, 1, 2, 3]);
    const h = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]);
    const k = rng.pick([-12, -9, -7, -4, -2, 1, 3, 6, 8, 11]);
    const shifted = a * h * h;
    const value = shifted + k;
    const inner = `x ${h < 0 ? `+ ${-h}` : `- ${h}`}`;
    const front = a === 1 ? "" : a === -1 ? "-" : `${a}`;
    return {
      prompt: `The graph of $f(x) = ${front}\\left(${inner}\\right)^{2} ${signedTerm(k, "")}$ is a parabola. At what value of $y$ does it cross the $y$-axis? Enter one number, with its sign.`,
      answer: numericAnswer(`${value}`),
      params: { a, h, k, value },
      hints: [
        "A graph meets the $y$-axis where the input is zero, and that is true of every graph rather than of parabolas in particular. So this is a question about evaluating the rule at one input, and nothing has to be multiplied out to do it.",
        "Put zero in for $x$ and work the rule from the inside out: the bracket first, then the square, then the multiplication, then the number added on the end. The number standing outside the bracket is the height of the vertex, which is a different point on the curve, so it is not the answer on its own.",
      ],
      worked_solution: [
        `The graph crosses the $y$-axis where $x = 0$, so evaluate the rule there.`,
        `Inside the bracket: $0 ${takeAway(h)} = ${-h}$.`,
        `Square it and multiply by the number in front: $${a} \\times ${paren(-h)}^{2} = ${shifted}$.`,
        `Add the number standing outside the bracket: $${shifted} ${signedTerm(k, "")} = ${value}$.`,
        `So the graph crosses the $y$-axis at $y = ${value}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.h ?? 0}:${params.k ?? 0}`,
};

/**
 * L3a, the `x`-intercepts of a quadratic that arrives EXPANDED.
 *
 * The reading itself is the easy half: a graph meets the `x`-axis where its output is zero. What
 * makes it L3 is that nothing can be read until the trinomial is factored, which is the one
 * competence on this node that its own prerequisites do not supply, and the `PRACTICE_NPC_NOTES`
 * line keyed to this template is what tells the learner so.
 *
 * The trinomial is always monic and always splits over the integers, because the question is
 * about intercepts rather than about the quadratic formula. Both roots are drawn away from zero
 * so the constant term is never zero and the two intercepts are always two distinct points.
 */
export const d4_pol5_x_intercepts_expanded_l3: ItemTemplate = {
  template_id: "d4.pol5.x-intercepts-expanded.l3",
  node_id: POL5_NODE,
  difficulty: 3,
  concept: "x-intercepts-of-an-expanded-quadratic",
  generate(rng: Rng) {
    const pool = [...ROOT_POOL];
    const first = pool.splice(rng.int(0, pool.length - 1), 1)[0] as number;
    let second = pool.splice(rng.int(0, pool.length - 1), 1)[0] as number;
    // No roster here may spell a placeholder the answer field advertises (R30).
    if (isAdvertisedSolution(first, second)) {
      second = second === 6 ? 5 : second + 1;
    }
    const [low, high] = first < second ? [first, second] : [second, first];
    const b = -(first + second);
    const c = first * second;
    return {
      prompt: `The graph of $f(x) = ${standardForm(1, b, c)}$ is a parabola. Give every value of $x$ where it crosses the $x$-axis. List the numbers only, separated by commas.`,
      answer: solutionSetAnswer(solutionKey(first, second)),
      params: { first: low, second: high, b, c },
      hints: [
        "A graph meets the $x$-axis exactly where its output is zero, so the question is asking which inputs send this rule to zero.",
        "Write the rule as two brackets multiplied together, which needs a pair of numbers whose product is the constant term and whose sum is the coefficient of $x$. A product is zero only when one of the things being multiplied is zero, so each bracket then gives one intercept on its own, and a bracket that adds a number is zero at the negative of it.",
      ],
      worked_solution: [
        `The graph crosses the $x$-axis where $f(x) = 0$, so solve $${standardForm(1, b, c)} = 0$.`,
        `Look for two numbers multiplying to $${c}$ and adding to $${b}$: those are $${-low}$ and $${-high}$.`,
        `So the rule factors as $${bracket(low)}${bracket(high)} = 0$.`,
        `A product is zero when one of its brackets is, which gives $x = ${low}$ and $x = ${high}$.`,
        `So the graph crosses the $x$-axis at $${rosterTex(low, high)}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.first ?? 0}:${params.second ?? 0}`,
};

/**
 * L3b, the extreme value of a quadratic in FACTORED form, reached through its symmetry.
 *
 * L2a's route would work here too, after multiplying out, and multiplying out is precisely what
 * the shape is for: the two intercepts are already on the page, the vertex sits exactly halfway
 * between them because the curve is symmetric, and the extreme value is the rule evaluated
 * there. That is three lines against the ten expanding would cost, and it is the reading the
 * node is named for rather than an algebraic shortcut.
 *
 * The two roots are drawn with the same parity, so their midpoint is a whole number and the
 * value at it is a whole number too. That is a constraint on the DRAW rather than on the
 * printer: a fractional midpoint is a perfectly good parabola and a bad numeric key.
 */
export const d4_pol5_extreme_from_factored_l3: ItemTemplate = {
  template_id: "d4.pol5.extreme-from-factored.l3",
  node_id: POL5_NODE,
  difficulty: 3,
  concept: "extreme-value-from-factored-form",
  generate(rng: Rng) {
    const a = rng.pick([-3, -2, -1, 1, 2, 3]);
    const first = rng.pick(ROOT_POOL);
    // Same parity as `first`, and never equal to it, so the midpoint is whole and the parabola
    // genuinely has two distinct intercepts to be symmetric between.
    const candidates = ROOT_POOL.filter(
      (root) => root !== first && (root - first) % 2 === 0,
    );
    const second = rng.pick(candidates);
    const [low, high] = first < second ? [first, second] : [second, first];
    const midpoint = (low + high) / 2;
    const value = a * (midpoint - low) * (midpoint - high);
    const front = a === 1 ? "" : a === -1 ? "-" : `${a}`;
    return {
      prompt: `The graph of $f(x) = ${front}${bracket(low)}${bracket(high)}$ is a parabola. What is the ${extremeWord(a)} value of $f$? Enter one number, with its sign.`,
      answer: numericAnswer(`${value}`),
      params: { a, low, high, midpoint, value },
      hints: [
        "Nothing has to be multiplied out. Written this way the rule already shows where the graph meets the $x$-axis, since a product is zero exactly when one of its brackets is.",
        "A parabola is symmetric, so its turning point sits exactly halfway between those two crossings, and the input there is the average of them. Evaluate the rule at that input to get the height, which is what the question asks for.",
      ],
      worked_solution: [
        `Each bracket is zero at one crossing, so the graph meets the $x$-axis at $x = ${low}$ and $x = ${high}$.`,
        `The curve is symmetric, so the vertex sits midway between them: $x = \\dfrac{${low} + ${paren(high)}}{2} = ${midpoint}$.`,
        `Evaluate there: $${front}\\left(${midpoint} ${takeAway(low)}\\right)\\left(${midpoint} ${takeAway(high)}\\right) = ${timesFront(a)}${paren(midpoint - low)} \\times ${paren(midpoint - high)}$.`,
        `The parabola ${openingWord(a)}, so that height is its ${extremeWord(a)}, and it comes to $${value}$.`,
        `So the ${extremeWord(a)} value of $f$ is $${value}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.low ?? 0}:${params.high ?? 0}`,
};

/** POL.5's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const POL5_TEMPLATES: readonly ItemTemplate[] = [
  d4_pol5_vertex_x_standard_l1,
  d4_pol5_extreme_value_standard_l2,
  d4_pol5_y_intercept_vertex_form_l2,
  d4_pol5_x_intercepts_expanded_l3,
  d4_pol5_extreme_from_factored_l3,
];
