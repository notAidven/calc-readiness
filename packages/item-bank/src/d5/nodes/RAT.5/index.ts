import {
  type ItemTemplate,
  numericAnswer,
  pointAnswer,
  type Rng,
  setBuilderAnswer,
} from "../../../template";
import { latexVarTerm } from "../../../promptFormat";
import {
  depthStaffDomainPrompt,
  depthStaffLevelPrompt,
  rangingCrossingPrompt,
  rangingHolePrompt,
  rangingVerticalAsymptotePrompt,
} from "../../theming";

/**
 * RAT.5 practice templates (Early Modern era: graph and analyze rational functions:
 * domain, intercepts, holes, vertical and end-behavior asymptotes). Five problem shapes
 * across the locked 1xL1 / 2xL2 / 2xL3 practice mix, themed as the Cannon Tower's
 * ranging yard, where the depth-staff chart plots a reading against how far the cistern
 * has been drawn down.
 *
 * The theme is skin only. An input that empties the denominator is a forbidden reading,
 * the one that sends the trace off the chart is a vertical asymptote, the one that
 * cancels is a hole, and the level the reading settles onto far out is the end-behavior
 * asymptote. A student who ignores the setting entirely still reads domain, asymptote,
 * hole, intercept.
 *
 * ## The distinction this node exists to teach
 *
 * Both kinds of forbidden dose come off the SAME original denominator, which is why this
 * node sits on RAT.1. A factor that also appears on the top divides out and leaves a HOLE
 * at that dose; a factor that survives underneath is a VERTICAL ASYMPTOTE. Three of the
 * five shapes below are built around a partial cancel for exactly that reason, and each
 * one asks for a DIFFERENT feature of the same picture, so a student who confuses the two
 * fates is wrong in a visible way rather than half-credited.
 *
 * ## Answer types (verified against the live v2 product checker)
 *
 * RAT.5 practice is text-answered, and each shape is authored to the one form its answer
 * can actually take:
 *
 *  - **Domain** is `setBuilderAnswer`, because writing the notation IS the skill here. The
 *    comparator can conjoin only single-interval conditions, so `{x | x != 2}` grades and
 *    `{x | x != -3 and x != 2}` comes back `wrong_notation` even as the answer key. The L1
 *    shape therefore has EXACTLY ONE forbidden dose, by construction.
 *  - **An asymptote or a single coordinate value** is `numericAnswer`. `LessonPractice`
 *    rejects anything that is not a bare number for a numeric item, so those prompts ask
 *    for a VALUE ("give the x-value ...") and never for an equation such as `x = -1`.
 *  - **A hole or an intercept** is `pointAnswer`, an ordered pair.
 *
 * No shape here is a `graph` item: a graph answer is scored by its own interactive module,
 * which lesson practice never routes to. The graphing is taught by the four gated widgets
 * in the lesson pack instead.
 *
 * ## Seeding
 *
 * Shapes are seeded from Lippman & Rasmussen, *Precalculus: An Investigation of Functions*
 * (opentextbookstore.com), section 3.7 "Rational Functions": its exercise ladder runs
 * linear-over-linear ("find the horizontal intercepts, the vertical intercept, the vertical
 * asymptotes, and the horizontal asymptote") up to quadratic-over-quadratic, and its
 * worked text is where the hole-versus-asymptote split is drawn. The extracted PDF text
 * flattens every stacked fraction and exponent, so each shape below was re-derived by hand
 * and every key recomputed by real arithmetic rather than transcribed. The diversification
 * off the seed is that each of the five asks for ONE feature rather than the seed's "find
 * all four", the numbers are re-drawn per instance, and the cancel that produces a hole is
 * built into three shapes the seed only mentions in passing.
 *
 * Every template declares a `varietyKey` over the feature it asks for, which the D5 pool
 * ENFORCES (see `d5/practice.ts`), so a cell never freezes two near-twin instances.
 */

export const RAT5_NODE = "RAT.5";

/** `+` or `-` for a signed value, as the operator that precedes its magnitude. */
function op(value: number): string {
  return value < 0 ? "-" : "+";
}

/** A signed value with negatives parenthesized, e.g. `(-4)` or `7`. */
function sp(value: number): string {
  return value < 0 ? `(-${-value})` : `${value}`;
}

/** A linear factor `x + c` / `x - |c|`, whose zero sits at `-c`. */
function linTex(c: number): string {
  return `x ${op(c)} ${Math.abs(c)}`;
}

/** The monic linear factor with the given ROOT, i.e. `x - root`. */
function factorTex(root: number): string {
  return linTex(-root);
}

/** An expanded monic quadratic `x^2 + sx + p` (never drawn with a zero constant). */
function quadraticTex(sum: number, product: number): string {
  const coeff = Math.abs(sum) === 1 ? "" : `${Math.abs(sum)}`;
  const mid = sum === 0 ? "" : ` ${op(sum)} ${coeff}x`;
  return `x^{2}${mid} ${op(product)} ${Math.abs(product)}`;
}

/** The same quadratic with every coefficient scaled by `c`. */
function scaledQuadraticTex(c: number, sum: number, product: number): string {
  const mid = sum === 0 ? "" : ` ${op(c * sum)} ${Math.abs(c * sum)}x`;
  return `${c}x^{2}${mid} ${op(c * product)} ${Math.abs(c * product)}`;
}

/** The expanded monic quadratic with the two given roots. */
function quadraticFromRoots(r1: number, r2: number): string {
  return quadraticTex(-(r1 + r2), r1 * r2);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** A nonzero magnitude in `[1, max]`, signed by a fresh coin flip. */
function signedInt(rng: Rng, max: number): number {
  const magnitude = rng.int(1, max);
  return rng.int(0, 1) === 1 ? -magnitude : magnitude;
}

/**
 * L1, the domain of a recipe with exactly ONE forbidden dose: `(x + n) / (x - r)`, or the
 * same thing over a scaled bottom `k x - k r`, which makes the learner solve for the dose
 * rather than read it off. The single exclusion is not a simplification: it is what keeps
 * the answer expressible in set-builder form (see the header note on the comparator).
 */
export const d5_rat5_domain_l1: ItemTemplate = {
  template_id: "d5.rat5.domain.l1",
  node_id: RAT5_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const kind = rng.int(0, 1);
    const k = kind === 1 ? rng.int(2, 4) : 1;
    const root = signedInt(rng, 8);
    // Keep the top's zero off the bottom's zero, so nothing cancels and the only story on
    // this shape is the domain.
    let n = signedInt(rng, 9);
    while (n === -root) {
      n = signedInt(rng, 9);
    }
    const top = linTex(n);
    const bottom =
      kind === 1 ? `${k}x ${op(-k * root)} ${Math.abs(k * root)}` : factorTex(root);
    return {
      prompt: depthStaffDomainPrompt(top, bottom),
      answer: setBuilderAnswer(`{x | x != ${root}}`),
      params: { kind, k, root, n },
      hints: [
        "The domain is every value of $x$ except those that make the denominator zero, so start by setting the denominator equal to zero.",
        "Solve that equation, and leave the numerator out of it: a zero in the numerator is just a zero of the function, not an excluded value.",
        "Write the answer as the set of all values except that one, using the set-builder braces and the not-equal sign.",
      ],
      worked_solution: [
        `The domain excludes values where the denominator is zero, so set $${bottom} = 0$.`,
        kind === 1
          ? `Solve it: $${k}x = ${k * root}$, so $x = ${root}$.`
          : `That denominator is zero at $x = ${root}$, and at nothing else.`,
        `The numerator $${top}$ excludes no values, so every other $x$ is in the domain.`,
        `Domain: $\\{x \\mid x \\ne ${root}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.kind}:${params.k}:${params.root}`,
};

/**
 * L2a, the vertical asymptote AFTER a cancel: `(x^2 - h^2) / ((x -/+ h)(x - v))`. Both
 * forbidden doses come off the one bottom, and the difference of squares on top divides
 * one of them out. A student who answers with the cancelled dose has read the original
 * bottom without asking which factor survived, which is precisely the miss this node is
 * built to catch.
 */
export const d5_rat5_vertical_l2: ItemTemplate = {
  template_id: "d5.rat5.vertical.l2",
  node_id: RAT5_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const h = rng.int(2, 9);
    const flip = rng.int(0, 1);
    // flip 0 cancels (x - h), flip 1 cancels (x + h).
    const cancelled = flip === 1 ? -h : h;
    // The surviving root must differ from BOTH zeros of the top, or the second factor
    // would cancel too and the gauge would have no vertical asymptote left.
    let v = signedInt(rng, 9);
    while (v === h || v === -h) {
      v = signedInt(rng, 9);
    }
    const bottom = quadraticFromRoots(cancelled, v);
    const shared = factorTex(cancelled);
    const surviving = factorTex(v);
    return {
      prompt: rangingVerticalAsymptotePrompt(bottom, h),
      answer: numericAnswer(`${v}`),
      params: { h, flip, v, cancelled },
      hints: [
        "A vertical asymptote occurs only when a factor is still in the denominator after everything that can divide out has divided out, so factor both parts first.",
        "The numerator is a difference of two squares, so it splits into a sum times a difference, and one of those matches a factor of the denominator exactly.",
        "Cancel the shared factor. The excluded value it defined is now a hole, so the denominator factor that remains names the vertical asymptote you want.",
      ],
      worked_solution: [
        `Factor the numerator, a difference of squares: $x^{2} - ${h * h} = (x - ${h})(x + ${h})$.`,
        `Factor the denominator: $${bottom} = (${shared})(${surviving})$.`,
        `$(${shared})$ appears in both numerator and denominator, so it divides out and $x = ${cancelled}$ is a hole, not a vertical asymptote.`,
        `The denominator still carries $(${surviving})$, so the vertical asymptote is at $x = ${v}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.flip}:${params.h}:${params.v}`,
};

/**
 * L2b, the end-behavior asymptote straight off a degree comparison. Two branches: a top of
 * LOWER degree, whose reading is squeezed onto the axis, and MATCHING degrees, whose level
 * is the ratio of the leading coefficients (reduced, and often a fraction). The
 * higher-degree case is deliberately absent: "no horizontal asymptote" is not a number, so
 * it belongs in the lesson's widget rather than in a numeric-answer item.
 */
export const d5_rat5_level_l2: ItemTemplate = {
  template_id: "d5.rat5.level.l2",
  node_id: RAT5_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const kind = rng.int(0, 1);
    const a = rng.int(2, 9);
    const b = rng.int(1, 9);
    const c = rng.int(1, 9);
    // A ratio of one reads as a trick rather than a rule, so keep the leading numbers apart.
    let d = rng.int(2, 9);
    while (d === a) {
      d = rng.int(2, 9);
    }
    const e = rng.int(1, 9);
    const g = gcd(a, d);
    const ansN = a / g;
    const ansD = d / g;
    const top = kind === 1 ? `${a}x^{2} + ${latexVarTerm(b)} + ${c}` : `${a}x + ${b}`;
    const bottom = `${d}x^{2} + ${e}`;
    const leading =
      kind === 1 ? `\\dfrac{${a}x^{2}}{${d}x^{2}}` : `\\dfrac{${a}x}{${d}x^{2}}`;
    const reducedTex = ansD === 1 ? `${ansN}` : `\\dfrac{${ansN}}{${ansD}}`;
    // Only claim the reduction when it changes something: `3/2 = 3/2` would be a step
    // the draw never needed.
    const ratioTail = ansN === a && ansD === d ? "" : ` = ${reducedTex}`;
    const answerKey = kind === 1 ? (ansD === 1 ? `${ansN}` : `${ansN}/${ansD}`) : "0";
    return {
      prompt: depthStaffLevelPrompt(top, bottom),
      answer: numericAnswer(answerKey),
      params: { kind, a, b, c, d, e, ansN, ansD },
      hints: [
        "Far out on the x-axis only the highest power in each part of the rational expression still counts, so find the leading term of the numerator and the leading term of the denominator.",
        "Compare those two degrees. Whether the denominator outgrows the numerator or matches it is what decides which end-behavior rule applies.",
        // Naming the y-value of the level case would read better, but this template's
        // answer key IS that value on the lower-degree draw, so the leak check forbids it.
        "If the denominator has the higher degree it outgrows the numerator, and the graph settles onto the x-axis. If the two degrees match instead, the asymptote is the ratio of the leading coefficients, reduced if they share a factor.",
      ],
      worked_solution: [
        `Far out on the x-axis only the leading terms matter: $${leading}$.`,
        kind === 1
          ? `The degrees match, so the horizontal asymptote is the ratio of the leading coefficients: $\\dfrac{${a}}{${d}}${ratioTail}$.`
          : `The denominator has the higher degree, so it outgrows the numerator and the graph approaches the x-axis.`,
        `Horizontal asymptote: $y = ${kind === 1 ? reducedTex : "0"}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    params.kind === 0 ? `0:${params.a}:${params.d}` : `1:${params.ansN}:${params.ansD}`,
};

/**
 * L3a, the hole as a POINT: `((x - h)(x - p)) / ((x - h)(x - v))`, both parts presented
 * expanded. Finding the dose is only half of it; the height has to come from the REDUCED
 * gauge, so this is the shape that proves a hole is a missing point on a curve rather than
 * a gap in the recipe. The parameters are drawn so that height is a whole number.
 */
export const d5_rat5_hole_l3: ItemTemplate = {
  template_id: "d5.rat5.hole.l3",
  node_id: RAT5_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let h = 0;
    let v = 0;
    let m = 0;
    let p = 0;
    // Draw the hole's HEIGHT first and back the numerator's other root out of it, so the
    // reduced gauge lands on a whole number there. `m = 1` would make the top and the
    // bottom equal, and `m = 0` would put the hole on the axis where it reads as an
    // intercept, so both are redrawn.
    do {
      h = signedInt(rng, 5);
      v = signedInt(rng, 5);
      m = rng.pick([-3, -2, -1, 2, 3]);
      p = h - m * (h - v);
    } while (h === v || p === 0 || p === h || p === v || Math.abs(p) > 12);
    const top = quadraticFromRoots(h, p);
    const bottom = quadraticFromRoots(h, v);
    const shared = factorTex(h);
    const keptTop = factorTex(p);
    const keptBottom = factorTex(v);
    return {
      prompt: rangingHolePrompt(top, bottom),
      answer: pointAnswer(`(${h}, ${m})`),
      params: { h, v, m, p },
      hints: [
        "Factor the numerator and the denominator into two brackets each, and look for the bracket they share.",
        "That shared bracket divides out. An excluded value where factors cancel leaves a hole rather than a vertical asymptote, so it is the one you want.",
        "The hole sits at the cancelled excluded value. For its y-coordinate, substitute that x-value into the simplified expression, the one left after the cancel.",
      ],
      worked_solution: [
        `Factor the numerator: $${top} = (${shared})(${keptTop})$.`,
        `Factor the denominator: $${bottom} = (${shared})(${keptBottom})$.`,
        `$(${shared})$ is in both numerator and denominator, so it divides out and $x = ${h}$ is a hole, not a vertical asymptote.`,
        `The simplified expression is $\\dfrac{${keptTop}}{${keptBottom}}$. Substitute the cancelled value: $\\dfrac{${sp(h)} ${op(-p)} ${Math.abs(p)}}{${sp(h)} ${op(-v)} ${Math.abs(v)}} = ${m}$.`,
        `The hole is at $(${h},\\, ${m})$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.h}:${params.m}:${params.v}`,
};

/**
 * L3b, the node's flagship shape: a SCALED trinomial over a trinomial sharing one factor,
 * asked for its horizontal intercept. Two zeros sit on the original top and only one of
 * them is a crossing, because the other cancelled and is a hole. So a student who reads
 * "set the top to zero" off the page without cancelling first reports a point the gauge
 * never touches. The common number out front is a third factoring step and changes the
 * crossing not at all, which is worth meeting once.
 */
export const d5_rat5_crossing_l3: ItemTemplate = {
  template_id: "d5.rat5.crossing.l3",
  node_id: RAT5_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const c = rng.int(2, 4);
    let h = 0;
    let p = 0;
    let v = 0;
    do {
      h = signedInt(rng, 5);
      p = signedInt(rng, 5);
      v = signedInt(rng, 5);
    } while (h === p || h === v || p === v);
    const top = scaledQuadraticTex(c, -(h + p), h * p);
    const inner = quadraticFromRoots(h, p);
    const bottom = quadraticFromRoots(h, v);
    const shared = factorTex(h);
    const keptTop = factorTex(p);
    const keptBottom = factorTex(v);
    return {
      prompt: rangingCrossingPrompt(top, bottom),
      answer: pointAnswer(`(${p}, 0)`),
      params: { c, h, p, v },
      hints: [
        "Every term in the numerator shares a plain number. Pull it out in front, then factor what is left, and factor the denominator too.",
        "One bracket appears in both numerator and denominator and divides out. The excluded value it cancelled is a hole, and a hole is not an x-intercept.",
        "The graph is at zero where the surviving numerator bracket is zero, so solve that bracket, and remember what the y-coordinate is at an x-intercept.",
      ],
      worked_solution: [
        `Every numerator term shares $${c}$: $${top} = ${c}(${inner})$.`,
        `Factor what is left: $${inner} = (${shared})(${keptTop})$.`,
        `Factor the denominator: $${bottom} = (${shared})(${keptBottom})$.`,
        `$(${shared})$ divides out, so $x = ${h}$ is a hole and the graph does not cross there.`,
        `The surviving numerator bracket is zero when $${keptTop} = 0$, so $x = ${p}$. The plain number $${c}$ out front cannot move that.`,
        `The x-intercept is at $(${p},\\, 0)$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.c}:${params.h}:${params.p}:${params.v}`,
};

/** Every RAT.5 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const RAT5_TEMPLATES: readonly ItemTemplate[] = [
  d5_rat5_domain_l1,
  d5_rat5_vertical_l2,
  d5_rat5_level_l2,
  d5_rat5_hole_l3,
  d5_rat5_crossing_l3,
];
