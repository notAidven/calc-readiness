import { createProductAnswerChecker } from "@cr/components";
import { describe, expect, it } from "vitest";

import { toProductItemVersions } from "../../../bank";
import { generateFromTemplate, type ItemTemplate } from "../../../template";
import { PRODUCT_CHECKER_CONFIG } from "../../../validate";
import { TRG9_TEMPLATES } from "./index";

/**
 * The arithmetic behind `d9.trg9.compound-angle.l3`, checked against the angles rather than
 * against the generator's own table.
 *
 * ## Why this file exists at all
 *
 * The template reaches its answer through a table of four formulas and two sign conventions:
 * which product pairs with which, whether the operator between the products matches the one
 * between the angles or reverses it, and which of the sine and the cosine is negative in each
 * quadrant. Every one of those is a place a single character can be wrong, and none of them
 * is visible from outside: a flipped sign produces a perfectly well-formed fraction, over the
 * right denominator, of the right size, and `validateTemplates` grades it clean because it
 * submits the key against itself. The item would ship marking a correct learner wrong, and
 * the only surface that could tell is a reveal nobody reads until it has already happened.
 *
 * So the check below never touches the template's formulas. It rebuilds the two angles from
 * the seven published params, takes their actual sine or cosine with `Math.atan2` and
 * `Math.sin`, and compares that to the key as a number. A sign error anywhere in the chain
 * moves the value and fails here.
 *
 * Demonstrated rather than argued. Flipping the one line that joins the two products, from
 * `isSine === isDifference ? first - second : first + second` to the reverse, fails on the
 * first draw of the sweep:
 *
 * > `d9.trg9.compound-angle.l3:practice:991000` keys `77/85` (0.905882) where the angles give
 * > -0.152941: Given $\cos A = \dfrac{8}{17}$ ... find the exact value of $\cos(A + B)$
 *
 * Note what the flipped generator still produced: a reduced fraction, over the right
 * denominator, of a size a cosine is allowed to have, in a prompt that reads perfectly. The
 * other seven assertions in this file all stayed green on that same run.
 *
 * ## The rest of the file
 *
 * Three properties the coordinator's censuses and another worker's guards depend on, pinned
 * here because they are facts about this generator: the published `shape` numbering (a
 * worked-solution SVG decodes it), the reduced-fraction shape of every key, and the rule that
 * no draw prints a number the size of its own answer. Plus one about the grader rather than
 * the generator: the prompt asks for "a fraction" and not for lowest terms, so the unreduced
 * spelling a learner writes straight off the two products has to grade correct against a key
 * that is reduced. That is measured through the real product checker, because it is a claim
 * about the checker and reading its profile would not settle it.
 */

const DRAWS = 400;
const SEED_BASE = 991_000;

function templateFor(id: string): ItemTemplate {
  return TRG9_TEMPLATES.find((candidate) => candidate.template_id === id) as ItemTemplate;
}

const compoundAngle = templateFor("d9.trg9.compound-angle.l3");

/**
 * `TRIPLES` as the template holds it, transcribed rather than imported.
 *
 * A copy is the point: the prompt assertion below rebuilds each given value from this table
 * and requires the template's own prompt to print it, so the two tables coming apart fails
 * loudly instead of leaving both halves agreeing with each other about a wrong number.
 */
const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
];

interface Reconstructed {
  sineA: number;
  cosineA: number;
  sineB: number;
  cosineB: number;
  hypA: number;
  hypB: number;
  /** The numerator of the value the prompt states for each angle, sign included. */
  givenA: number;
  givenB: number;
}

/**
 * The two angles' four functions, rebuilt from the seven params alone.
 *
 * This is the same reconstruction the worked-solution SVG has to perform, so a param
 * contract too thin to support it would fail here first: the given value is the FIRST leg of
 * its triple over the hypotenuse, `givenSine*` says which function it is, and the quadrant
 * fixes both signs.
 */
function reconstruct(params: Record<string, number>): Reconstructed {
  const [firstA, secondA, hypA] = TRIPLES[params.tripleA as number] ?? [0, 0, 1];
  const [firstB, secondB, hypB] = TRIPLES[params.tripleB as number] ?? [0, 0, 1];
  const quadrantA = params.quadrantA as number;
  const quadrantB = params.quadrantB as number;
  const sineSignA = quadrantA <= 2 ? 1 : -1;
  const cosineSignA = quadrantA === 1 || quadrantA === 4 ? 1 : -1;
  const sineSignB = quadrantB <= 2 ? 1 : -1;
  const cosineSignB = quadrantB === 1 || quadrantB === 4 ? 1 : -1;
  const givenSineA = params.givenSineA === 1;
  const givenSineB = params.givenSineB === 1;

  const sineA = sineSignA * (givenSineA ? firstA : secondA);
  const cosineA = cosineSignA * (givenSineA ? secondA : firstA);
  const sineB = sineSignB * (givenSineB ? firstB : secondB);
  const cosineB = cosineSignB * (givenSineB ? secondB : firstB);
  return {
    sineA,
    cosineA,
    sineB,
    cosineB,
    hypA,
    hypB,
    givenA: givenSineA ? sineA : cosineA,
    givenB: givenSineB ? sineB : cosineB,
  };
}

/** A key of the form `n/d` or `-n/d`, read back as two integers. */
function readKey(key: string): { numerator: number; denominator: number } {
  const [numerator, denominator] = key.split("/");
  return { numerator: Number(numerator), denominator: Number(denominator) };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const samples = Array.from({ length: DRAWS }, (_unused, index) =>
  generateFromTemplate(compoundAngle, "practice", SEED_BASE + index),
);

describe("TRG.9's compound angle evaluates to the value its two angles really have", () => {
  it("matches the sine or cosine of the combined angle at every draw", () => {
    for (const item of samples) {
      const { sineA, cosineA, sineB, cosineB, hypA, hypB } = reconstruct(
        item.template_params,
      );
      // The angles themselves, not the identity: `atan2` puts each one in the quadrant its
      // two signed legs describe, so nothing below reuses the generator's reasoning.
      const angleA = Math.atan2(sineA / hypA, cosineA / hypA);
      const angleB = Math.atan2(sineB / hypB, cosineB / hypB);
      const shape = item.template_params.shape as number;
      const expected =
        shape === 0
          ? Math.sin(angleA + angleB)
          : shape === 1
            ? Math.sin(angleA - angleB)
            : shape === 2
              ? Math.cos(angleA + angleB)
              : Math.cos(angleA - angleB);

      const key = item.answer.answer_key ?? "";
      const { numerator, denominator } = readKey(key);
      expect(
        Math.abs(numerator / denominator - expected),
        `${item.item_version_id} keys ${key} (${(numerator / denominator).toFixed(6)}) where the angles give ${expected.toFixed(6)}: ${item.prompt}`,
      ).toBeLessThan(1e-12);
    }
  });

  it("draws two different triples, so the two angles are never the same shape twice", () => {
    for (const item of samples) {
      expect(
        item.template_params.tripleA,
        `${item.item_version_id} reuses one triple for both angles`,
      ).not.toBe(item.template_params.tripleB);
    }
  });

  /**
   * The `shape` numbering is a contract with the worked-solution SVG, which decodes the same
   * four numbers off `template_params`. Asserted against the PROMPT rather than against a
   * copy of the table, because what the learner is asked is the only thing the figure has to
   * agree with. The census underneath stops a reordering from passing by never drawing the
   * index it moved.
   */
  it("keeps the published shape numbering: 0 and 1 sine, 2 and 3 cosine, odd ones differences", () => {
    const compoundTex = ["\\sin(A + B)", "\\sin(A - B)", "\\cos(A + B)", "\\cos(A - B)"];
    for (const item of samples) {
      const shape = item.template_params.shape as number;
      expect(
        item.prompt,
        `${item.item_version_id} draws shape ${shape}: ${item.prompt}`,
      ).toContain(`the exact value of $${compoundTex[shape]}$`);
    }
    const drawn = new Set(samples.map((item) => item.template_params.shape));
    expect([...drawn].sort(), "all four shapes are reachable").toEqual([0, 1, 2, 3]);
  });

  it("states the value its own params describe, sign and all", () => {
    for (const item of samples) {
      const { hypA, hypB, givenA, givenB } = reconstruct(item.template_params);
      const tex = (numerator: number, denominator: number): string =>
        numerator < 0
          ? `-\\dfrac{${-numerator}}{${denominator}}`
          : `\\dfrac{${numerator}}{${denominator}}`;
      const functionA = item.template_params.givenSineA === 1 ? "\\sin A" : "\\cos A";
      const functionB = item.template_params.givenSineB === 1 ? "\\sin B" : "\\cos B";
      expect(item.prompt, item.item_version_id).toContain(
        `$${functionA} = ${tex(givenA, hypA)}$`,
      );
      expect(item.prompt, item.item_version_id).toContain(
        `$${functionB} = ${tex(givenB, hypB)}$`,
      );
    }
    // Both signs are genuinely drawn, so the two sign decisions the item exists to test are
    // live rather than positive by habit.
    const negatives = samples.filter((item) => {
      const { givenA, givenB } = reconstruct(item.template_params);
      return givenA < 0 || givenB < 0;
    });
    expect(
      negatives.length / DRAWS,
      "the prompt states a negative value on a real share of draws",
    ).toBeGreaterThan(0.5);
  });

  it("keys a reduced fraction, never a whole number and never zero", () => {
    for (const item of samples) {
      const key = item.answer.answer_key ?? "";
      expect(key, `${item.item_version_id} keys "${key}"`).toMatch(/^-?\d+\/\d+$/);
      const { numerator, denominator } = readKey(key);
      expect(numerator, `${item.item_version_id} keys zero`).not.toBe(0);
      expect(
        denominator,
        `${item.item_version_id} keys a whole number, which changes its notation tag`,
      ).toBeGreaterThan(1);
      expect(
        gcd(Math.abs(numerator), denominator),
        `${item.item_version_id} keys "${key}", which is not in lowest terms`,
      ).toBe(1);
    }
  });

  /**
   * No draw prints a number the size of its own answer.
   *
   * Reachable, and one pair of triples reaches it: `[7, 24, 25]` is the double-angle image of
   * `[3, 4, 5]`, so pairing them can land the combined angle back on one of the two it was
   * built from. The floor underneath is what keeps this from passing over an empty
   * population, and the second expectation is what keeps the guard from being satisfied by a
   * generator that quietly stopped pairing those two triples at all: the pair is still drawn,
   * it is just never drawn into a collision.
   */
  it("never hands the answer back off the face of its own prompt", () => {
    for (const item of samples) {
      const { hypA, hypB, givenA, givenB } = reconstruct(item.template_params);
      const { numerator, denominator } = readKey(item.answer.answer_key ?? "");
      expect(
        Math.abs(numerator) * hypA,
        `${item.item_version_id} answers the value it states for A: ${item.prompt}`,
      ).not.toBe(Math.abs(givenA) * denominator);
      expect(
        Math.abs(numerator) * hypB,
        `${item.item_version_id} answers the value it states for B: ${item.prompt}`,
      ).not.toBe(Math.abs(givenB) * denominator);
    }
    const risky = samples.filter((item) => {
      const pair = [item.template_params.tripleA, item.template_params.tripleB].sort();
      return pair[0] === 0 && pair[1] === 3;
    });
    expect(
      risky.length,
      "the one pair of triples that can collide is still being drawn, so the rejection is doing work rather than being unreachable",
    ).toBeGreaterThanOrEqual(10);
  });

  it("walks the whole chain in its reveal and ends on the spelling it wants typed", () => {
    for (const item of samples) {
      expect(
        item.worked_solution.length,
        `${item.item_version_id} reveals ${item.worked_solution.length} steps for a six-move problem`,
      ).toBeGreaterThanOrEqual(4);
      const last = item.worked_solution[item.worked_solution.length - 1] ?? "";
      expect(last, item.item_version_id).toContain(item.answer.answer_key ?? "");
    }
  });

  /**
   * The prompt asks for "a fraction", not for lowest terms, so the form a learner arrives at
   * straight off the two products has to grade. The key is reduced for the notation dispatch
   * (see the template's docstring), and those two facts only coexist because
   * `exactTrigValueAnswer` compares by VALUE. That is a claim about the checker, so it is put
   * through the real one.
   */
  it("accepts the unreduced spelling a learner writes off the two products", () => {
    const checker = createProductAnswerChecker({
      itemVersions: toProductItemVersions(samples),
    });
    let unreduced = 0;
    for (const item of samples) {
      const { hypA, hypB } = reconstruct(item.template_params);
      const { numerator, denominator } = readKey(item.answer.answer_key ?? "");
      const rawDenominator = hypA * hypB;
      if (rawDenominator === denominator) {
        continue;
      }
      unreduced += 1;
      const scale = rawDenominator / denominator;
      const raw = `${numerator * scale}/${rawDenominator}`;
      const result = checker({
        raw_answer: raw,
        item_version_id: item.item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_CONFIG.checkerVersion,
      });
      expect(
        result.status,
        `${item.item_version_id} keys ${item.answer.answer_key} and refused "${raw}"`,
      ).toBe("correct");
    }
    // 11 of these 400 draws arrive unreduced, which is few enough that a sweep of a dozen
    // could have measured nothing at all and reported green.
    expect(
      unreduced,
      "there are draws whose raw combination is not already in lowest terms, so this asserted something",
    ).toBeGreaterThanOrEqual(8);
  });
});
