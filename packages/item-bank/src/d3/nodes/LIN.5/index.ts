import { type ItemTemplate, type Rng, solutionSetAnswer } from "../../../template";
import { signed } from "../_shared";

/**
 * LIN.5 practice templates: solve an absolute-value equation. Five shapes across the locked
 * 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  `|x - c| = k`, the two-branch shape with nothing else to do first;
 *  - L2a a COEFFICIENT inside the bars, so each branch is solved rather than sign-flipped;
 *  - L2b a term ADDED outside the bars, so the bars have to be isolated before splitting;
 *  - L3a the two degenerate right-hand sides: a zero, which collapses the branches into one,
 *        and a negative, which admits nothing at all;
 *  - L3b a MULTIPLIER outside the bars, so the isolating step is a division.
 *
 * ## Answer path
 *
 * Every shape answers as a `solution_set`, which is the shape the question actually has: an
 * absolute-value equation usually has two solutions and the roster of them is a set. The category
 * is cleared at checker version 2, `prod.golden.lin-5.*` pins four of these shapes against the
 * real checker, and the bars appear only in the PROMPT, which is KaTeX text the checker never
 * parses. The `abs` grammar gap that keeps FUN.10 gated therefore does not reach this node.
 *
 * The empty set is a first-class key here (`{}`), and the comparator accepts "no solution" and
 * "none" for it as well, which is why the negative-right-hand-side case can be a real graded
 * question rather than something the pool has to route around.
 *
 * ## The two keys the placeholder rules out
 *
 * `SOLUTION_SET_PLACEHOLDER` reads "Every solution: 13 or {-1, 4}", and R30 forbids a placeholder
 * that answers a served item. So no shape below may key `{13}` or `{-1, 4}`: the one-element
 * shapes draw from lists excluding 13, and every two-element key is checked against `{-1, 4}` by
 * `d3.test.ts` rather than left to a reader's care.
 *
 * ## Why every hint covers both branches in one wording
 *
 * A hint that arrived only for the negative-right-hand-side draw would announce which draw the
 * learner had (R13): being sent to check the sign of the right-hand side is itself the answer on
 * that draw. So each shape's hints are written to be true and non-revealing for every draw it can
 * make, including the degenerate ones.
 *
 * The same rule reaches the PROMPT, which is where it was first broken: `degenerate.l3` carried
 * its empty-set notation note on the empty draws only, so the note and the answer stood in exact
 * correspondence. It is now on both draws, and `d3.test.ts` asserts that no D3 prompt's wording
 * varies across its draws at all.
 */

export const LIN5_NODE = "LIN.5";

/** A solution set from two roots, written low to high. The comparator is order-insensitive. */
function pair(low: number, high: number): string {
  return `{${low}, ${high}}`;
}

/**
 * L1, the plain two-branch shape. The quantity inside the bars is a simple difference, so nothing
 * stands between the split and the answer, and the tier measures whether the second branch gets
 * written at all.
 */
export const d3_lin5_shift_l1: ItemTemplate = {
  template_id: "d3.lin5.shift.l1",
  node_id: LIN5_NODE,
  difficulty: 1,
  concept: "two-branches",
  generate(rng: Rng) {
    const centre = rng.int(-12, 30);
    const distance = rng.int(2, 14);
    return {
      prompt: `Solve for $x$: $\\lvert x ${signed(-centre)} \\rvert = ${distance}$. Give the solution set.`,
      answer: solutionSetAnswer(pair(centre - distance, centre + distance)),
      params: { centre, distance },
      hints: [
        "The bars report a distance from zero, and a distance is available on either side of zero. So the quantity inside them has two values it could take.",
        "Write the two ordinary equations that gives, one with the number on the right as it stands and one with its sign turned over, then solve each of them separately.",
      ],
      worked_solution: [
        `The bars leave the sign of $x ${signed(-centre)}$ free, so it can be $${distance}$ or $-${distance}$.`,
        `First branch: $x ${signed(-centre)} = ${distance}$ gives $x = ${centre + distance}$.`,
        `Second branch: $x ${signed(-centre)} = -${distance}$ gives $x = ${centre - distance}$.`,
        `Both satisfy the original, so the solution set is $\\{${centre - distance}, ${centre + distance}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.centre ?? 0}:${params.distance ?? 0}`,
};

/**
 * L2a, a coefficient inside the bars. Each branch is a linear equation in its own right, so the
 * two solutions are mirror images of the quantity inside the bars and NOT of the variable, which
 * is the misconception `prod.golden.lin-5.coefficient` records as `{-4, 3}` for `{-3, 4}`.
 *
 * The constant is drawn as a multiple of the coefficient so both roots are whole numbers: a
 * fractional root is a harder arithmetic problem wearing this skill's clothes.
 */
export const d3_lin5_coefficient_l2: ItemTemplate = {
  template_id: "d3.lin5.coefficient.l2",
  node_id: LIN5_NODE,
  difficulty: 2,
  concept: "coefficient-inside",
  generate(rng: Rng) {
    const a = rng.int(2, 6);
    const root = rng.int(-7, 9);
    const step = rng.int(1, 6);
    // b and k are built from the two roots, so a * (root +/- step) - b lands on +/- k exactly.
    const other = root - 2 * step;
    const b = a * (root - step) * -1;
    const k = a * step;
    return {
      prompt: `Solve for $x$: $\\lvert ${a}x ${signed(b)} \\rvert = ${k}$. Give the solution set.`,
      answer: solutionSetAnswer(pair(Math.min(root, other), Math.max(root, other))),
      params: { a, b, k, root, other },
      hints: [
        "Split first and solve second. The quantity inside the bars can be the number on the right or its negative, so there are two ordinary equations before any arithmetic starts.",
        "Each of those two is a two-step linear equation, so neither is finished at the moment it is written. What gets negated is the number on the right, never the quantity inside the bars and never the solutions.",
      ],
      worked_solution: [
        `The bars leave the sign of $${a}x ${signed(b)}$ free, so it is $${k}$ or $-${k}$.`,
        `First branch: $${a}x ${signed(b)} = ${k}$ gives $${a}x = ${k - b}$ and then $x = ${(k - b) / a}$.`,
        `Second branch: $${a}x ${signed(b)} = -${k}$ gives $${a}x = ${-k - b}$ and then $x = ${(-k - b) / a}$.`,
        // The mirror claim is about the quantity inside the bars, and when `b` is zero that
        // quantity IS a multiple of x, so the roots really are a plus-and-minus pair on those
        // draws and saying otherwise would correct a learner who had it right.
        b === 0
          ? `Dividing by the coefficient inside each branch is what turns those two into values of $x$, so the solution set is $\\{${Math.min(root, other)}, ${Math.max(root, other)}\\}$.`
          : `The two roots are mirror images of $${a}x ${signed(b)}$ rather than of $x$, so the solution set is $\\{${Math.min(root, other)}, ${Math.max(root, other)}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.root ?? 0}:${params.other ?? 0}`,
};

/**
 * L2b, a term added outside the bars. The number beside the bars is not the distance until the
 * bars stand alone, so a learner who splits first splits on the wrong number, and the draws
 * include right-hand sides that are positive both before AND after the isolating step so the
 * shortcut is never rewarded.
 */
export const d3_lin5_isolate_l2: ItemTemplate = {
  template_id: "d3.lin5.isolate.l2",
  node_id: LIN5_NODE,
  difficulty: 2,
  concept: "isolate-the-bars",
  generate(rng: Rng) {
    const centre = rng.int(-10, 24);
    const distance = rng.int(2, 12);
    const outside = rng.int(2, 15);
    const right = distance + outside;
    return {
      prompt: `Solve for $x$: $\\lvert x ${signed(-centre)} \\rvert + ${outside} = ${right}$. Give the solution set.`,
      answer: solutionSetAnswer(pair(centre - distance, centre + distance)),
      params: { centre, distance, outside, right },
      hints: [
        "Nothing can be split while something is added to the bars, because the number on the right is not yet the distance the bars report.",
        "Get the bars on their own first by undoing what is added to them, and only then read the right-hand side as a distance and write the two branches.",
      ],
      worked_solution: [
        `Take $${outside}$ off both sides so the bars stand alone: $\\lvert x ${signed(-centre)} \\rvert = ${distance}$.`,
        `Now the right-hand side is the distance, so the quantity inside can be $${distance}$ or $-${distance}$.`,
        `The two branches give $x = ${centre + distance}$ and $x = ${centre - distance}$.`,
        `So the solution set is $\\{${centre - distance}, ${centre + distance}\\}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.centre ?? 0}:${params.distance ?? 0}:${params.outside ?? 0}`,
};

/**
 * L3a, the two degenerate right-hand sides. A zero collapses the branches into one and a negative
 * admits nothing, and both are visible before any algebra: this is the tier where "always two
 * answers" stops working.
 *
 * The single-root draws are constrained away from 13, which the solution-set placeholder answers
 * outright, and the shape cannot produce a two-element set at all.
 */
export const d3_lin5_degenerate_l3: ItemTemplate = {
  template_id: "d3.lin5.degenerate.l3",
  node_id: LIN5_NODE,
  difficulty: 3,
  concept: "degenerate-right-side",
  generate(rng: Rng) {
    const empty = rng.int(0, 1) === 1;
    const a = rng.int(2, 5);
    const root = rng.pick([-9, -7, -6, -4, -3, -1, 2, 4, 6, 8, 11, 14]);
    const b = -a * root;
    const negative = rng.int(2, 17);
    // The notation note stands on BOTH draws. Carried only by the empty one it was an answer
    // key in prose: over 400 draws the clause and the empty set corresponded exactly, so a
    // learner could settle the question off the sentence without ever reading the right-hand
    // side, which is the read this shape exists to measure (R13).
    const rightHandSide = empty ? `-${negative}` : "0";
    const prompt = `Solve for $x$: $\\lvert ${a}x ${signed(b)} \\rvert = ${rightHandSide}$. Give the solution set, and write $\\{\\}$ if there is no solution.`;
    return {
      prompt,
      answer: solutionSetAnswer(empty ? "{}" : `{${root}}`),
      params: { empty: empty ? 1 : 0, a, b, root, negative },
      hints: [
        "Read the number on the right of the isolated bars before splitting anything, because it decides how many branches there are to write.",
        "The bars report a distance, and a distance has a range of values it can possibly take. Compare the number on the right against that range first.",
      ],
      worked_solution: empty
        ? [
            `The bars are already on their own, so the number on the right is the distance they report.`,
            `A distance is never negative, so nothing can sit $-${negative}$ away from zero.`,
            `There is no branch to write and no value of $x$ satisfies the equation.`,
            `The solution set is empty: $\\{\\}$.`,
          ]
        : [
            `The bars are already on their own, so the number on the right is the distance they report.`,
            `Only zero sits zero away from zero, so $${a}x ${signed(b)} = 0$ is the whole of it: $-0$ and $0$ are the same number, so the two branches say the same thing.`,
            `Solving that one equation gives $${a}x = ${-b}$ and then $x = ${root}$.`,
            `One branch, one solution, so the solution set is $\\{${root}\\}$.`,
          ],
    };
  },
  varietyKey: (params) =>
    `${params.empty ?? 0}:${params.root ?? 0}:${params.negative ?? 0}`,
};

/**
 * L3b, a multiplier outside the bars. The isolating step is a division rather than a subtraction,
 * and the number beside the bars before that division is not the distance, so this is the shape
 * where a learner who has learned "take the number off" has to generalise the move.
 */
export const d3_lin5_scaled_l3: ItemTemplate = {
  template_id: "d3.lin5.scaled.l3",
  node_id: LIN5_NODE,
  difficulty: 3,
  concept: "divide-outside-the-bars",
  generate(rng: Rng) {
    const scale = rng.int(2, 7);
    const centre = rng.int(-9, 22);
    const distance = rng.int(2, 13);
    const right = scale * distance;
    return {
      prompt: `Solve for $x$: $${scale}\\lvert x ${signed(-centre)} \\rvert = ${right}$. Give the solution set.`,
      answer: solutionSetAnswer(pair(centre - distance, centre + distance)),
      params: { scale, centre, distance, right },
      hints: [
        "The bars are multiplied by something, so the number on the right is not the distance they report yet. Get the bars standing alone first.",
        "Undoing a multiplier means dividing both sides by it, and only after that does the right-hand side say how far from zero the quantity inside the bars sits.",
      ],
      worked_solution: [
        `Divide both sides by $${scale}$ so the bars stand alone: $\\lvert x ${signed(-centre)} \\rvert = ${distance}$.`,
        `Now the right-hand side is the distance, and it is positive, so there are two branches.`,
        `They give $x = ${centre + distance}$ and $x = ${centre - distance}$.`,
        `So the solution set is $\\{${centre - distance}, ${centre + distance}\\}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.scale ?? 0}:${params.centre ?? 0}:${params.distance ?? 0}`,
};

/** LIN.5's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const LIN5_TEMPLATES: readonly ItemTemplate[] = [
  d3_lin5_shift_l1,
  d3_lin5_coefficient_l2,
  d3_lin5_isolate_l2,
  d3_lin5_degenerate_l3,
  d3_lin5_scaled_l3,
];
