import { expressionVariable } from "../../../promptFormat";
import {
  type ItemTemplate,
  numericAnswer,
  type Rng,
  variableRadicalAnswer,
} from "../../../template";

/**
 * RAD.4 practice templates for the "Boomtown Square" island: roots with a LETTER inside.
 * Three ideas, five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  1. An even root of an even power is an ABSOLUTE VALUE, not the letter itself:
 *     `sqrt(v^2) = |v|`. Bars are required exactly when the power that comes out is
 *     ODD, because only then can it be negative.
 *  2. Pulling the largest extractable factor out of a variable radicand
 *     (`sqrt(v^7) = v^3*sqrt(v)`), on its own and mixed with a constant.
 *  3. The EVEN-ROOT DOMAIN restriction: an even root of a negative is not real, while
 *     an odd root of a negative is. That restriction is also WHY the odd-power shapes
 *     need no bars: an even root already forces the letter to be non-negative.
 *
 * Every text shape is graded by the v2 product checker's VARIABLE-aware radical path,
 * which the item reaches by declaring `allowed_symbols` (`variableRadicalAnswer`);
 * value is decided by domain-aware sampling and form by the canonical simplified
 * radical of Answer_Equivalence_Spec v0.15 §4 (every extractable factor outside, a
 * minimal radicand). The one numeric shape (`realroot.l2`) grades through the plain
 * exact-value path.
 *
 * Two authoring constraints the shapes are built around, both learned from the real
 * checker rather than assumed:
 *
 *  - Only a PRODUCT radicand is decomposed, so no shape here puts a sum, a quotient,
 *    or a power of a product under the root.
 *  - `xsqrt(x)` does not parse (mathjs reads a bare symbol glued to a function name as
 *    one symbol), while `x^2sqrt(x)` does. So every odd-power shape draws an exponent
 *    of at least 5, which always leaves an explicit power in front of the root and
 *    keeps the natural juxtaposed typing gradable.
 *  - The parse grammar caps an exponent at `MAX_EXPONENT` (8). No shape ever DISPLAYS a
 *    higher one, so a learner who types the prompt's own radicand straight back is told
 *    `not_simplified` (the teaching verdict) rather than `invalid_input`, which the
 *    session scores as unanswered and which explains nothing.
 *
 * Every key is computed by real arithmetic, so `validateTemplates` grades each sampled
 * instance correct through the REAL checker. Each template declares a `varietyKey` over
 * its simplified answer, and the D2 pool ENFORCES it (see `d2/practice.ts`), so a case
 * space has to admit more distinct answers than the pool draws from it.
 *
 * Wording is PLAIN FIRST: the math leads and the flavour is an everyday noun (a wooden
 * beam). The 2026-07-26 pass dropped the mining vocabulary (peg readings, a ledger, sluice
 * runs, assays) and says "absolute value" where it used to say "magnitude"; the quantities,
 * keys, difficulties, hint structure and worked-solution steps are unchanged.
 */

export const RAD4_NODE = "RAD.4";

/** Square-free constants: `b` never hides a perfect square, so `sqrt(b*v)` is minimal. */
const SQUARE_FREE: readonly number[] = [2, 3, 5, 6, 7];

/**
 * Two-letter pairs for the hardest shape. `template_params` holds only numbers, so the
 * pair is recorded as its index and decoded through {@link radicalSymbolPair}, which the
 * worked-solution SVG imports rather than re-listing (the same arrangement
 * `expressionVariable` already has with the D1 diagrams).
 */
const SYMBOL_PAIRS: readonly (readonly [string, string])[] = [
  ["x", "y"],
  ["m", "n"],
  ["p", "t"],
];

/** The two letters a `d2.rad4.twovar.l3` instance uses, from its `pairIndex` param. */
export function radicalSymbolPair(pairIndex: number): readonly [string, string] {
  return SYMBOL_PAIRS[pairIndex] ?? (SYMBOL_PAIRS[0] as readonly [string, string]);
}

/** `v` for a power of 1, else `v^{k}` — the LaTeX a lesson would actually print. */
function powerTex(symbol: string, exponent: number): string {
  return exponent === 1 ? symbol : `${symbol}^{${exponent}}`;
}

/** `v` for a power of 1, else `v^k` — the checker-parseable spelling. */
function powerKey(symbol: string, exponent: number): string {
  return exponent === 1 ? symbol : `${symbol}^${exponent}`;
}

/**
 * L1, the node's headline: an even root of an even power returns the ABSOLUTE VALUE.
 * `sqrt(v^{2k})` comes out as `v^k`, and that needs bars exactly when `k` is ODD, since
 * an even `k` is already never negative. Drawing both parities is the point: a learner
 * who has decided "always add bars" is wrong half the time.
 */
export const d2_rad4_magnitude_l1: ItemTemplate = {
  template_id: "d2.rad4.magnitude.l1",
  node_id: RAD4_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const varIndex = rng.int(0, 3);
    const v = expressionVariable(varIndex);
    const half = rng.int(1, 3);
    const power = 2 * half;
    const needsBars = half % 2 === 1;
    const outside = powerKey(v, half);
    const outsideTex = powerTex(v, half);
    return {
      prompt: `Nobody wrote down whether $${v}$ is positive or negative. Simplify $\\sqrt{${powerTex(v, power)}}$.`,
      answer: variableRadicalAnswer(needsBars ? `abs(${outside})` : outside, [v]),
      params: { varIndex, half, power, bars: needsBars ? 1 : 0 },
      hints: [
        "An even root gives back one value, and that value is never negative.",
        "Halve the exponent to bring the variable out, then ask whether what came out could itself be negative.",
      ],
      worked_solution: [
        `The root is even and $${power} \\div 2 = ${half}$, so $${outsideTex}$ comes out of the root.`,
        needsBars
          ? half === 1
            ? `That leaves $${v}$ itself, which is negative whenever $${v}$ is. An even root never gives back a negative value, so the answer is the absolute value.`
            : `$${half}$ is odd and an odd power keeps its sign, so $${outsideTex}$ is negative whenever $${v}$ is. An even root never gives back a negative value, so the answer takes bars.`
          : `$${half}$ is even and an even power is never negative, so $${outsideTex}$ already matches what an even root gives back and no bars are needed.`,
        `Simplified: $\\sqrt{${powerTex(v, power)}} = ${needsBars ? `\\left|${outsideTex}\\right|` : outsideTex}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.varIndex}:${params.half}`,
};

/**
 * L2a, extract from an ODD power: `sqrt(v^n)` splits as `v^{n-1} * v`, and half of the
 * even part comes out. No bars here, and the reason is the domain: an even root is real
 * only where the number inside is not negative, so an odd `v^n` under a square root
 * already forces `v >= 0`. The exponent starts at 5 so the answer always carries an
 * explicit power in front of the root (see the parse note in the file header).
 */
export const d2_rad4_extract_l2: ItemTemplate = {
  template_id: "d2.rad4.extract.l2",
  node_id: RAD4_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const varIndex = rng.int(0, 3);
    const v = expressionVariable(varIndex);
    const power = rng.pick([5, 7]);
    const even = power - 1;
    const outside = even / 2;
    return {
      prompt: `A wooden beam is $\\sqrt{${powerTex(v, power)}}$ meters long. Write that length as a simplified radical.`,
      answer: variableRadicalAnswer(`${powerKey(v, outside)}*sqrt(${v})`, [v]),
      params: { varIndex, power, even, outside },
      hints: [
        "Split the power into the largest EVEN power times the single copy left over.",
        "Half of that even power comes out in front; the one leftover copy of the variable stays under the root.",
      ],
      worked_solution: [
        `Split the power: $${powerTex(v, power)} = ${powerTex(v, even)} \\cdot ${v}$.`,
        `Half of $${even}$ is $${outside}$, so $\\sqrt{${powerTex(v, even)}} = ${powerTex(v, outside)}$.`,
        `A square root is real only where the number inside is not negative, so $${powerTex(v, power)} \\ge 0$ forces $${v} \\ge 0$. That already makes $${powerTex(v, outside)}$ non-negative, so it needs no bars.`,
        `Simplified: $${powerTex(v, outside)}\\sqrt{${v}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.varIndex}:${params.power}`,
};

/**
 * L2b, the EVEN-ROOT DOMAIN restriction, asked so it cannot be guessed: three roots of
 * negative numbers are listed and exactly one of them is real. The learner has to reject
 * both even roots (nothing real squared, or raised to the fourth, is negative) AND
 * evaluate the odd one, so picking the wrong one produces no answer at all rather than a
 * lucky mark. Which slot holds the odd root rotates, so "it is always the last one" never
 * becomes the strategy.
 */
export const d2_rad4_realroot_l2: ItemTemplate = {
  template_id: "d2.rad4.realroot.l2",
  node_id: RAD4_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const cube = rng.int(2, 9);
    const fourth = rng.int(2, 4);
    // The three radicands must PRINT differently, or the list reads as a trick:
    // 8^2 and 4^3 are both 64, and 4^2 / 9^2 collide with 2^4 / 3^4.
    let square = rng.int(2, 9);
    while (square * square === cube ** 3 || square * square === fourth ** 4) {
      square = rng.int(2, 9);
    }
    const slot = rng.int(0, 2);
    const squareTex = `\\sqrt{-${square * square}}`;
    const fourthTex = `\\sqrt[4]{-${fourth ** 4}}`;
    const cubeTex = `\\sqrt[3]{-${cube ** 3}}`;
    const logged: readonly [string, string, string] =
      slot === 0
        ? [cubeTex, squareTex, fourthTex]
        : slot === 1
          ? [squareTex, cubeTex, fourthTex]
          : [squareTex, fourthTex, cubeTex];
    return {
      prompt: `Here are three roots: $${logged[0]}$, $${logged[1]}$, and $${logged[2]}$. Exactly one of them is a real number. Work out that one.`,
      answer: numericAnswer(`${-cube}`),
      params: { cube, square, fourth, slot },
      hints: [
        "An even root of a negative number is not real: nothing real, squared or raised to the fourth, comes out negative.",
        "An odd power keeps the sign of what it is applied to, so read the index of each root before ruling any of them in or out.",
      ],
      worked_solution: [
        `$${squareTex}$ is not real: no real number squared gives a negative.`,
        `$${fourthTex}$ is not real either: a fourth power is an even power, so it is never negative.`,
        `$${cubeTex}$ IS real, because $(-${cube})^{3} = -${cube ** 3}$.`,
        `So the real one comes out to $-${cube}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.cube}`,
};

/**
 * L3a, the MIXED radicand of Answer_Equivalence_Spec §4: a constant AND a variable power
 * under one root, so three extractions have to happen and be assembled
 * (`sqrt(8*v^5) = 2*v^2*sqrt(2*v)`). Strictly more work than either L2: the L2 extract
 * shape does the variable half alone, and this adds the constant half plus a two-factor
 * leftover radicand.
 */
export const d2_rad4_mixed_l3: ItemTemplate = {
  template_id: "d2.rad4.mixed.l3",
  node_id: RAD4_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const varIndex = rng.int(0, 3);
    const v = expressionVariable(varIndex);
    const root = rng.int(2, 3);
    const free = rng.pick(SQUARE_FREE);
    const power = rng.pick([5, 7]);
    const even = power - 1;
    const outside = even / 2;
    const square = root * root;
    const constant = square * free;
    return {
      prompt: `A wooden beam is $\\sqrt{${constant}${powerTex(v, power)}}$ meters long. Write that length as a simplified radical.`,
      answer: variableRadicalAnswer(`${root}*${powerKey(v, outside)}*sqrt(${free}*${v})`, [
        v,
      ]),
      params: { varIndex, root, free, power, even, outside, square, constant },
      hints: [
        "Take the number and the variable one at a time, then put the two results side by side.",
        "Take a perfect square out of the number, and the largest even power out of the variable.",
        "One copy of the variable is left under the root, beside whatever the number left behind.",
      ],
      worked_solution: [
        `Split what is inside: $${constant}${powerTex(v, power)} = ${square} \\cdot ${free} \\cdot ${powerTex(v, even)} \\cdot ${v}$.`,
        `The perfect square gives $\\sqrt{${square}} = ${root}$, and the even power gives $\\sqrt{${powerTex(v, even)}} = ${powerTex(v, outside)}$.`,
        `$${free}$ has no perfect square in it and only one $${v}$ is left, so both stay under the root.`,
        `Simplified: $${root}${powerTex(v, outside)}\\sqrt{${free}${v}}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.varIndex}:${params.root}:${params.free}:${params.outside}`,
};

/**
 * L3b, the hardest slot: TWO letters under one root, one at an even power and one at an
 * odd power, so both halves of the node have to be applied in the same problem and told
 * apart. `sqrt(18*v^2*w^5) = 3*|v|*w^2*sqrt(2*w)`: the even-power letter comes out as an
 * ABSOLUTE VALUE (its sign is unknown and the root can never return a negative), while the
 * odd-power letter needs no bars at all, because the root's own domain has already forced
 * it non-negative. Dropping the bars is graded a value miss, not a form miss.
 */
export const d2_rad4_twovar_l3: ItemTemplate = {
  template_id: "d2.rad4.twovar.l3",
  node_id: RAD4_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const pairIndex = rng.int(0, SYMBOL_PAIRS.length - 1);
    const [v, w] = radicalSymbolPair(pairIndex);
    const root = rng.int(2, 3);
    const free = rng.pick(SQUARE_FREE);
    const power = rng.pick([5, 7]);
    const even = power - 1;
    const outside = even / 2;
    const square = root * root;
    const constant = square * free;
    const radicandTex = `${constant}${v}^{2}${powerTex(w, power)}`;
    return {
      prompt: `Simplify $\\sqrt{${radicandTex}}$. Nobody wrote down whether $${v}$ is positive or negative. Write the answer as a simplified radical.`,
      answer: variableRadicalAnswer(
        `${root}*abs(${v})*${powerKey(w, outside)}*sqrt(${free}*${w})`,
        [v, w],
      ),
      params: { pairIndex, root, free, power, even, outside, square, constant },
      hints: [
        "Work the number, the first variable, and the second variable one at a time.",
        "Ask the bars question separately for each variable that comes out, and ask it about what came OUT rather than about what went in: could that be negative? An even root never hands back a negative value.",
        "Whatever the halving leaves over stays under the root, beside whatever the number left behind.",
      ],
      worked_solution: [
        `Split what is inside: $${radicandTex} = ${square} \\cdot ${free} \\cdot ${v}^{2} \\cdot ${powerTex(w, even)} \\cdot ${w}$.`,
        `$\\sqrt{${square}} = ${root}$ and $\\sqrt{${powerTex(w, even)}} = ${powerTex(w, outside)}$.`,
        `$\\sqrt{${v}^{2}}$ is the absolute value $\\left|${v}\\right|$, because $${v}$ may be negative and an even root never gives back a negative value.`,
        `$${free}$ and one $${w}$ have no perfect square left, so they stay under the root.`,
        `Simplified: $${root}\\left|${v}\\right|${powerTex(w, outside)}\\sqrt{${free}${w}}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.pairIndex}:${params.root}:${params.free}:${params.outside}`,
};

/** Every RAD.4 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const RAD4_TEMPLATES: readonly ItemTemplate[] = [
  d2_rad4_magnitude_l1,
  d2_rad4_extract_l2,
  d2_rad4_realroot_l2,
  d2_rad4_mixed_l3,
  d2_rad4_twovar_l3,
];
