import {
  FRACTION_LOWEST_TERMS_SUFFIX,
  latexFracDivGroupAdd,
  latexFracMul,
  latexFracOp,
} from "../../../promptFormat";
import {
  type GenerateContext,
  gcd,
  type ItemTemplate,
  numericAnswer,
  type Rng,
  reducedFraction,
  reducedFractionAnswer,
} from "../../../template";
import type { GoldenFixture } from "../../golden";
import { fracFromString, workedSolution } from "../../hints";
import { dryingRackFractionCombine } from "../../theming";

/** Diagnostic L1 (down stage) — same-denominator add or subtract. */
export const numF_l1: ItemTemplate = {
  template_id: "d1.num-f.l1",
  node_id: "NUM.F",
  difficulty: 1,
  concept: "add-sub-like",
  generate(rng: Rng, ctx?: GenerateContext) {
    // Same-denominator add or subtract (`op`: 1 = subtract) with varied
    // numerators; subtraction is kept as (a - b) with a > b so the result is
    // positive and nonzero. Addition rerolls when the sum reaches the
    // denominator, since a whole-number result (e.g. 1/5 + 4/5 = 1) can't be
    // written as the `n/d` form the reduced-fraction grader requires.
    const d = rng.int(3, 6);
    const op = rng.int(0, 1);
    let a = rng.int(1, d - 1);
    let b = rng.int(1, d - 1);
    if (op === 1) {
      while (a <= b) {
        a = rng.int(1, d - 1);
        b = rng.int(1, d - 1);
      }
    } else {
      while ((a + b) % d === 0) {
        a = rng.int(1, d - 1);
        b = rng.int(1, d - 1);
      }
    }
    const num = op === 1 ? a - b : a + b;
    const opSym: "+" | "-" = op === 1 ? "-" : "+";
    const opWord = op === 1 ? "subtract" : "add";
    // Combining can land straight in lowest terms, in which case step 1 already
    // ended on the answer and a "reduce" step would just restate it.
    const alreadyReduced = gcd(num, d) === 1;
    // Practice: a drying-rack word problem, but only when the result is
    // a proper fraction in (0, 1) so "fraction of one rack" stays accurate
    // (num === d is already rerolled, so num < d means the value is below 1).
    const themable = ctx?.form === "practice" && num < d;
    return {
      prompt: themable
        ? dryingRackFractionCombine(a, d, b, d, op === 1 ? "sub" : "add")
        : `Evaluate ${latexFracOp(a, d, opSym, b, d)}.${FRACTION_LOWEST_TERMS_SUFFIX}`,
      answer: reducedFractionAnswer(reducedFraction(num, d)),
      params: { a, b, d, op },
      hints: [
        `Both amounts count the same size piece, so the denominators already match: ${opWord} the numerators and keep the denominator as it is.`,
        "Check the result before you answer, since it may still reduce to lowest terms.",
      ],
      worked_solution: workedSolution([
        `The denominators match, so ${opWord} the numerators: $\\dfrac{${a}}{${d}} ${opSym} \\dfrac{${b}}{${d}} = \\dfrac{${num}}{${d}}$.`,
        alreadyReduced
          ? `$\\dfrac{${num}}{${d}}$ is already in lowest terms, so that is the answer.`
          : `Reduce to lowest terms: ${fracFromString(reducedFraction(num, d))}.`,
      ]),
    };
  },
};

/**
 * How many times a rejection draw in `numF_l2` may re-roll before it stops asking the
 * rng and completes the draw itself.
 *
 * A rejection loop with no cap is the defect, not just the one draw that tripped it:
 * `while (a * d2 === b * d1) { b = rng.int(1, d2 - 1); }` re-drew ONLY `b` while its
 * condition constrained `b` against `a`, `d1` and `d2`, so a draw of `d1 = 4, d2 = 2,
 * a = 2` pinned `b` at its single candidate and the loop never exited. That is not a
 * corner: 10,274 of the first 1,000,000 seeds (1.03%) draw it, seed 16 first, and
 * `buildD1PracticeVariants` walks a shared seed counter through this template at module
 * scope, so one landing there hangs the package at import.
 *
 * The cap is 64 against a measured worst case of 10 re-rolls over 2,000,000 seeds, so no
 * draw the generator has ever made reaches it and every frozen item keeps the rng stream
 * it was frozen on. `templateTermination.test.ts` owns the standing guard, and it is
 * scoped to every template the package exports rather than to this one: the shape that
 * admits this defect appears about twenty more times across seven domains.
 */
const NUM_F_L2_MAX_REDRAWS = 64;

/** Diagnostic L2 (routing stage) — unlike-denominator add or subtract. */
export const numF_l2: ItemTemplate = {
  template_id: "d1.num-f.l2",
  node_id: "NUM.F",
  difficulty: 2,
  concept: "add-sub-unlike",
  generate(rng: Rng, ctx?: GenerateContext) {
    // Unlike-denominator add or subtract (`op`: 1 = subtract) with small proper
    // numerators. For subtraction the fractions are ordered so the result is
    // positive and nonzero.
    //
    // Every rejection draw below is capped (see `NUM_F_L2_MAX_REDRAWS`) and finishes
    // deterministically if the cap runs out. `1/d1` against `1/d2` is the completion
    // each one falls back to, and it satisfies both constraints for free: the two
    // denominators are distinct, so `1/d1` and `1/d2` are never equal (what subtract
    // needs) and never sum to a whole number either, since `d1 + d2 = d1 * d2` only at
    // `d1 = d2 = 2` (what add needs).
    let d1 = rng.int(2, 5);
    let d2 = rng.int(2, 6);
    for (let attempt = 0; attempt < NUM_F_L2_MAX_REDRAWS && d2 === d1; attempt += 1) {
      d2 = rng.int(2, 6);
    }
    if (d2 === d1) {
      // `d1` never exceeds 5, so 6 is always the distinct denominator this wanted.
      d2 = 6;
    }
    const op = rng.int(0, 1);
    let a = rng.int(1, d1 - 1);
    let b = rng.int(1, d2 - 1);
    if (op === 1) {
      for (
        let attempt = 0;
        attempt < NUM_F_L2_MAX_REDRAWS && a * d2 === b * d1;
        attempt += 1
      ) {
        b = rng.int(1, d2 - 1);
      }
      if (a * d2 === b * d1) {
        a = 1;
        b = 1;
      }
      if (a * d2 < b * d1) {
        [a, b] = [b, a];
        [d1, d2] = [d2, d1];
      }
    } else {
      // A sum that lands on a whole number (e.g. 1/2 + 1/2 = 1) can't be
      // written as the `n/d` form the reduced-fraction grader requires.
      for (
        let attempt = 0;
        attempt < NUM_F_L2_MAX_REDRAWS && (a * d2 + b * d1) % (d1 * d2) === 0;
        attempt += 1
      ) {
        a = rng.int(1, d1 - 1);
        b = rng.int(1, d2 - 1);
      }
      if ((a * d2 + b * d1) % (d1 * d2) === 0) {
        a = 1;
        b = 1;
      }
    }
    const denom = d1 * d2;
    const leftNum = a * d2;
    const rightNum = b * d1;
    const num = op === 1 ? leftNum - rightNum : leftNum + rightNum;
    const opSym: "+" | "-" = op === 1 ? "-" : "+";
    const opWordCap = op === 1 ? "Subtract" : "Add";
    // The combined numerator can already be coprime with the common denominator,
    // in which case a "reduce" step would restate the line above it.
    const alreadyReduced = gcd(num, denom) === 1;
    // Practice: a drying-rack word problem when the result is a proper
    // fraction in (0, 1) (num === denom is already rerolled). Subtraction already
    // swaps operands so a/d1 is the larger, which the "take down" framing needs.
    const themable = ctx?.form === "practice" && num < denom;
    return {
      prompt: themable
        ? dryingRackFractionCombine(a, d1, b, d2, op === 1 ? "sub" : "add")
        : `Evaluate ${latexFracOp(a, d1, opSym, b, d2)}.${FRACTION_LOWEST_TERMS_SUFFIX}`,
      answer: reducedFractionAnswer(reducedFraction(num, denom)),
      params: { a, b, d1, d2, op },
      hints: [
        "The two amounts are counted in different size pieces, so rewrite them over a common denominator before combining anything.",
        "Multiplying the two denominators always gives a common denominator. Scale each numerator by the same factor you used on its denominator.",
        `${opWordCap} the numerators over that common denominator, then reduce if the result shares a factor.`,
      ],
      worked_solution: workedSolution([
        `Common denominator: $${d1} \\times ${d2} = ${denom}$.`,
        `Rewrite: $\\dfrac{${leftNum}}{${denom}} ${opSym} \\dfrac{${rightNum}}{${denom}}$.`,
        `${opWordCap} the numerators: $\\dfrac{${num}}{${denom}}$.`,
        alreadyReduced
          ? `$\\dfrac{${num}}{${denom}}$ is already in lowest terms, so that is the answer.`
          : `Reduce: ${fracFromString(reducedFraction(num, denom))}.`,
      ]),
    };
  },
};

/** Practice-only L3 — grouped division of two fractions, then add a third. */
export const numF_l3: ItemTemplate = {
  template_id: "d1.num-f.l3",
  node_id: "NUM.F",
  difficulty: 3,
  generate(rng: Rng) {
    // Grouped division of two reduced proper fractions, then add a third:
    // (a/b ÷ c/d) + e/f. Divide first (flip the divisor and multiply across),
    // then add the last fraction over a common denominator and reduce. Every
    // fraction stays reduced and proper; the final result stays positive and is
    // never a whole number (the reduced-fraction grader needs an `n/d` string,
    // and an improper key like 4/3 is fine but a whole number is not).
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;
    let e = 0;
    let f = 0;
    let quotN = 0;
    let quotD = 0;
    let sumN = 0;
    let sumD = 0;
    let finalN = 0;
    let finalD = 0;
    do {
      a = rng.int(1, 3);
      b = rng.int(2, 4);
      c = rng.int(1, 3);
      d = rng.int(2, 4);
      e = rng.int(1, 3);
      f = rng.int(2, 4);
      // a/b ÷ c/d = (a*d)/(b*c), reduced.
      const rawQuotN = a * d;
      const rawQuotD = b * c;
      const gq = gcd(rawQuotN, rawQuotD) || 1;
      quotN = rawQuotN / gq;
      quotD = rawQuotD / gq;
      // quot + e/f over a common denominator, reduced.
      sumN = quotN * f + e * quotD;
      sumD = quotD * f;
      const gs = gcd(sumN, sumD) || 1;
      finalN = sumN / gs;
      finalD = sumD / gs;
    } while (
      gcd(a, b) !== 1 ||
      gcd(c, d) !== 1 ||
      gcd(e, f) !== 1 ||
      a * d === b * c || // the division would collapse to a trivial 1
      finalD === 1 // never a whole number
    );

    // The division can resolve to a whole number (quotD === 1); render it plainly.
    const quotTex = quotD === 1 ? `${quotN}` : `\\dfrac{${quotN}}{${quotD}}`;
    const quotStr = quotD === 1 ? `${quotN}` : `${quotN}/${quotD}`;
    const finalStr = `${finalN}/${finalD}`;
    // The sum often lands in lowest terms already, so the closing step confirms
    // that rather than restating the same fraction under a "Reduce" label.
    const alreadyReduced = sumD === finalD;
    return {
      prompt: `Evaluate ${latexFracDivGroupAdd(a, b, c, d, e, f)}.${FRACTION_LOWEST_TERMS_SUFFIX}`,
      answer: reducedFractionAnswer(finalStr),
      params: { a, b, c, d, e, f },
      hints: [
        "The parentheses come first, so finish the division before the third fraction enters at all.",
        "Dividing by a fraction is the same as multiplying by its reciprocal, so flip the divisor and multiply straight across.",
        "Before that quotient and the third fraction can be added they have to share a denominator, so rewrite them over a common one if they do not already, and the sum may still reduce.",
      ],
      worked_solution: workedSolution([
        `Divide first. Flip the divisor: $\\dfrac{${a}}{${b}} \\times \\dfrac{${d}}{${c}}$.`,
        `Multiply across: ${fracFromString(quotStr)}.`,
        `Add the third fraction: $${quotTex} + \\dfrac{${e}}{${f}}$.`,
        `Add over the common denominator ${sumD}: $\\dfrac{${sumN}}{${sumD}}$.`,
        alreadyReduced
          ? `$\\dfrac{${sumN}}{${sumD}}$ is already in lowest terms, so that is the answer.`
          : `Reduce: ${fracFromString(finalStr)}.`,
      ]),
    };
  },
};

/** Extra practice shape — L2: multiply two proper fractions, then reduce. */
export const numF_l2b: ItemTemplate = {
  template_id: "d1.num-f.l2b",
  node_id: "NUM.F",
  difficulty: 2,
  generate(rng: Rng) {
    // Each factor is a reduced proper fraction (< 1), so the product is proper and
    // the reduce step is the real work.
    let a = rng.int(1, 3);
    let b = rng.int(2, 5);
    while (a >= b || gcd(a, b) !== 1) {
      a = rng.int(1, 3);
      b = rng.int(2, 5);
    }
    let c = rng.int(1, 3);
    let d = rng.int(2, 5);
    while (c >= d || gcd(c, d) !== 1) {
      c = rng.int(1, 3);
      d = rng.int(2, 5);
    }
    const num = a * c;
    const denom = b * d;
    const reduced = reducedFraction(num, denom);
    const alreadyReduced = reduced === `${num}/${denom}`;
    return {
      prompt: `Evaluate ${latexFracMul(a, b, c, d)}.${FRACTION_LOWEST_TERMS_SUFFIX}`,
      answer: reducedFractionAnswer(reduced),
      params: { a, b, c, d },
      hints: [
        "Multiplying fractions works straight across, with no common denominator needed: numerator times numerator over denominator times denominator.",
        "Check the product before you answer, since it may still reduce to lowest terms.",
      ],
      worked_solution: workedSolution([
        `Multiply straight across: $\\dfrac{${a}}{${b}} \\times \\dfrac{${c}}{${d}} = \\dfrac{${a} \\times ${c}}{${b} \\times ${d}}$.`,
        alreadyReduced
          ? `Evaluate: $\\dfrac{${a} \\times ${c}}{${b} \\times ${d}} = \\dfrac{${num}}{${denom}}$.`
          : `Evaluate and reduce: $\\dfrac{${a} \\times ${c}}{${b} \\times ${d}} = \\dfrac{${num}}{${denom}} = $ ${fracFromString(reduced)}.`,
      ]),
    };
  },
};

/**
 * A grouped fraction sum multiplied by a third fraction: `(a/b + c/d) × e/f`.
 *
 * The mirror of the shared `latexFracDivGroupAdd`, kept local to this node rather
 * than added to the shared prompt builders, since only this template speaks it. The
 * explicit parentheses make the add-first order unambiguous. Single KaTeX span.
 */
function latexFracAddGroupMul(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): string {
  return `$\\left(\\dfrac{${a}}{${b}} + \\dfrac{${c}}{${d}}\\right) \\times \\dfrac{${e}}{${f}}$`;
}

/** Extra practice shape — L3: grouped addition of two fractions, then multiply by a third. */
export const numF_l3b: ItemTemplate = {
  template_id: "d1.num-f.l3b",
  node_id: "NUM.F",
  difficulty: 3,
  generate(rng: Rng) {
    // Grouped addition of two reduced proper fractions, then multiply by a third:
    // (a/b + c/d) × e/f. The mirror of `numF_l3`, which groups the DIVISION: here the
    // common denominator is the first move and multiplying straight across is the
    // last, so the same two mini-lesson slides are exercised from the other end.
    // The two inside denominators are kept distinct so the sum genuinely needs a
    // common denominator. Every fraction stays reduced and proper, so the result
    // stays positive, and it is never a whole number (the reduced-fraction grader
    // needs an `n/d` string; an improper key like 4/3 is fine, a whole one is not).
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;
    let e = 0;
    let f = 0;
    let sumN = 0;
    let sumD = 0;
    let finalN = 0;
    let finalD = 0;
    do {
      a = rng.int(1, 3);
      b = rng.int(2, 5);
      c = rng.int(1, 3);
      d = rng.int(2, 5);
      e = rng.int(1, 3);
      f = rng.int(2, 5);
      // a/b + c/d over the product denominator, reduced.
      const rawSumN = a * d + c * b;
      const rawSumD = b * d;
      const gs = gcd(rawSumN, rawSumD) || 1;
      sumN = rawSumN / gs;
      sumD = rawSumD / gs;
      // That sum times e/f, straight across, reduced.
      const rawProdN = sumN * e;
      const rawProdD = sumD * f;
      const gp = gcd(rawProdN, rawProdD) || 1;
      finalN = rawProdN / gp;
      finalD = rawProdD / gp;
    } while (
      a >= b ||
      c >= d ||
      e >= f || // every fraction proper
      gcd(a, b) !== 1 ||
      gcd(c, d) !== 1 ||
      gcd(e, f) !== 1 || // and already in lowest terms
      b === d || // the sum must actually need a common denominator
      finalD === 1 // never a whole number
    );

    const common = b * d;
    const leftNum = a * d;
    const rightNum = c * b;
    const rawSumN = leftNum + rightNum;
    const prodN = sumN * e;
    const prodD = sumD * f;
    const finalStr = `${finalN}/${finalD}`;
    // Either combining or multiplying can land straight in lowest terms, and a step
    // that reduced nothing would just restate the line above it.
    const sumAlreadyReduced = rawSumN === sumN;
    const productAlreadyReduced = prodD === finalD;
    return {
      prompt: `Evaluate ${latexFracAddGroupMul(a, b, c, d, e, f)}.${FRACTION_LOWEST_TERMS_SUFFIX}`,
      answer: reducedFractionAnswer(finalStr),
      params: { a, b, c, d, e, f },
      hints: [
        "The parentheses come first, so the two fractions inside have to become one fraction before the outside factor multiplies anything.",
        "Those two amounts are counted in different size pieces, so rewrite them over a common denominator, then add the numerators and keep that denominator.",
        "Multiplying by the last fraction goes straight across, numerator times numerator over denominator times denominator, and that product may still reduce.",
      ],
      worked_solution: workedSolution([
        `Work inside the parentheses first. Common denominator: $${b} \\times ${d} = ${common}$.`,
        `Rewrite and add the numerators: $\\dfrac{${leftNum}}{${common}} + \\dfrac{${rightNum}}{${common}} = \\dfrac{${rawSumN}}{${common}}$.`,
        sumAlreadyReduced
          ? ""
          : `That sum reduces: $\\dfrac{${rawSumN}}{${common}} = \\dfrac{${sumN}}{${sumD}}$.`,
        `Now multiply straight across: $\\dfrac{${sumN}}{${sumD}} \\times \\dfrac{${e}}{${f}} = \\dfrac{${sumN} \\times ${e}}{${sumD} \\times ${f}}$.`,
        productAlreadyReduced
          ? `Evaluate: $\\dfrac{${sumN} \\times ${e}}{${sumD} \\times ${f}} = \\dfrac{${prodN}}{${prodD}}$.`
          : `Evaluate and reduce: $\\dfrac{${sumN} \\times ${e}}{${sumD} \\times ${f}} = \\dfrac{${prodN}}{${prodD}} = $ ${fracFromString(finalStr)}.`,
      ]),
    };
  },
};

/** Prerequisite-gated walk L2 (tightened, commutativity-guarded). */
export const numF_walk: ItemTemplate = {
  template_id: "d1w.num-f.l2",
  node_id: "NUM.F",
  difficulty: 2,
  generate(rng: Rng) {
    // Distinct denominators emitted smallest-first, so `1/a + 1/b` can't twin
    // `1/b + 1/a` (the review's NUM.F duplicate). Canonicalizing collapses each
    // twin pair to ONE content hash, so the range is widened (up to /9) to keep
    // ≥25 distinct ordered pairs — ample headroom once the deep-freeze also has to
    // avoid every v1/practice NUM.F hash.
    let d1 = rng.int(2, 6);
    let d2 = rng.int(2, 9);
    while (d2 === d1) {
      d2 = rng.int(2, 9);
    }
    if (d1 > d2) {
      [d1, d2] = [d2, d1];
    }
    return {
      prompt: `Evaluate: 1/${d1} + 1/${d2}`,
      answer: numericAnswer(reducedFraction(d1 + d2, d1 * d2)),
      params: { d1, d2 },
    };
  },
  // Each instance in a cell uses a distinct denominator pair.
  varietyKey: (params) => `${params.d1}:${params.d2}`,
};

/** Golden fixtures for NUM.F — fraction arithmetic. */
export const numF_golden: readonly GoldenFixture[] = [
  {
    item_version_id: "d1.golden.num-f.1",
    node_id: "NUM.F",
    prompt: "Evaluate: 1/2 + 1/4",
    answer: reducedFractionAnswer("3/4"),
    valid: "3/4",
    alternate_valid: ["3/4"],
    // 2/6: added tops and bottoms; 1/4: only one term; 2/4: forgot common denom; 6/8/0.75: unreduced or wrong form.
    near_miss: ["2/6", "1/4", "2/4", "6/8", "0.75"],
  },
  {
    item_version_id: "d1.golden.num-f.2",
    node_id: "NUM.F",
    prompt: "Evaluate: 2/3 + 1/6",
    answer: reducedFractionAnswer("5/6"),
    valid: "5/6",
    alternate_valid: ["5/6"],
    // 3/9: added across; 3/6: kept wrong numerator; 1/2: wrong; 10/12: unreduced.
    near_miss: ["3/9", "3/6", "1/2", "10/12"],
  },
];
