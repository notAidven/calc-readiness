import { describe, expect, it } from "vitest";

import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
} from "./product-answer-checker";
import { PRODUCT_GOLDEN_CASES, PRODUCT_SPIKE_ITEMS } from "./product-checker-fixtures";

const checker = createProductAnswerChecker({ itemVersions: PRODUCT_SPIKE_ITEMS });

describe("product (Phase-2) answer checker", () => {
  it.each(PRODUCT_GOLDEN_CASES)(
    "$name",
    ({ item_version_id, raw_answer, expected_status, expected_reason }) => {
      const result = checker({
        raw_answer,
        item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      });

      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: expected_status === "correct",
        checker_version: PRODUCT_CHECKER_VERSION,
      });
    },
  );

  it("is version 2 (a distinct checker from the locked D1 v1)", () => {
    expect(PRODUCT_CHECKER_VERSION).toBe(2);
  });

  it("covers every Phase-2 category", () => {
    const types = new Set(PRODUCT_SPIKE_ITEMS.map((i) => i.answer.answer_spec.answer_type));
    for (const type of [
      "numeric",
      "expression",
      "solution_set",
      "interval",
      "point",
      "equation_form",
      "rational_answer",
      "graph",
    ]) {
      expect(types.has(type as never)).toBe(true);
    }
  });

  it("every valid answer key passes its own checker (CI invariant §13.1)", () => {
    // Each item whose key is directly answerable is graded correct when fed its key.
    const directlyKeyed = PRODUCT_SPIKE_ITEMS.filter(
      (i) =>
        i.answer.answer_key !== undefined &&
        i.answer.answer_spec.answer_type !== "rational_answer",
    );
    for (const version of directlyKeyed) {
      const result = checker({
        raw_answer: version.answer.answer_key,
        item_version_id: version.item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      });
      expect(result.status, `${version.item_version_id} key should self-pass`).toBe(
        "correct",
      );
    }
  });

  it("fails closed for a checker-version mismatch", () => {
    expect(
      checker({
        raw_answer: "2*sqrt(2)",
        item_version_id: "spike:rad-1:sqrt:v2",
        equivalence_checker_version: 1,
      }),
    ).toMatchObject({
      status: "scoring_error",
      reason_code: "checker_version_unsupported",
      client_correct: false,
      checker_version: PRODUCT_CHECKER_VERSION,
    });
  });

  it("fails closed when the immutable item version is missing", () => {
    expect(
      checker({
        raw_answer: "1",
        item_version_id: "missing:v2",
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      }),
    ).toMatchObject({
      status: "scoring_error",
      reason_code: "item_version_not_found",
      client_correct: false,
    });
  });

  it("treats malformed student input as unanswered, never wrong", () => {
    const result = checker({
      raw_answer: "(",
      item_version_id: "spike:pol-2:factor:v2",
      equivalence_checker_version: PRODUCT_CHECKER_VERSION,
    });
    expect(result.status).toBe("invalid_input");
    expect(result.client_correct).toBe(false);
  });
});

/**
 * The union JOIN, spelled every way a learner writes it.
 *
 * `parseIntervals` normalised `∪` to `U` and then split on `/\s+U\s+/`, so the normalisation
 * bought nothing for the TIGHT glyph — which is the only way anybody writes it, and which is what
 * the packs themselves print: `d3/LIN.4.json` renders `(-\infty, 12) \cup (30, \infty)` and the
 * reveal figure prints `\cup`. A learner copying what they were shown got `parse_error`, so
 * nothing told them the mathematics was right and only the spacing was not. Every other answer
 * shape in the checker is whitespace-insensitive, and the set-builder parser in the same file
 * already tolerated the tight glyph, so the file disagreed with itself.
 *
 * The population is DERIVED — every `interval` fixture whose key is a union — and each spelling
 * is a transformation OF that key, so this measures the join and not two hand-typed strings.
 */
const UNION_KEY_ITEMS = PRODUCT_SPIKE_ITEMS.filter(
  (version) =>
    version.answer.answer_spec.answer_type === "interval" &&
    / U /.test(version.answer.answer_key ?? ""),
);

const UNION_SPELLINGS: readonly {
  readonly name: string;
  readonly spell: (key: string) => string;
}[] = [
  { name: "as authored", spell: (key) => key },
  { name: "cup glyph, spaced", spell: (key) => key.replace(/ U /g, " \u222a ") },
  { name: "cup glyph, tight", spell: (key) => key.replace(/ U /g, "\u222a") },
  { name: "U, no spaces", spell: (key) => key.replace(/ U /g, "U") },
  { name: "u lowercase, no spaces", spell: (key) => key.replace(/ U /g, "u") },
  { name: "U, space before only", spell: (key) => key.replace(/ U /g, " U") },
  { name: "U, space after only", spell: (key) => key.replace(/ U /g, "U ") },
  { name: "every space deleted", spell: (key) => key.replace(/\s+/g, "") },
  { name: "or, spaced", spell: (key) => key.replace(/ U /g, " or ") },
];

const UNION_SPELLING_CASES = UNION_KEY_ITEMS.flatMap((version) =>
  UNION_SPELLINGS.map((spelling) => ({
    name: `${version.item_version_id} :: ${spelling.name}`,
    item_version_id: version.item_version_id,
    raw_answer: spelling.spell(version.answer.answer_key ?? ""),
  })),
);

describe("a union grades on its mathematics, not on the spaces around the join", () => {
  it(`sweeps ${UNION_SPELLING_CASES.length} spellings of the join over ${UNION_KEY_ITEMS.length} union keys`, () => {
    expect(
      UNION_KEY_ITEMS.length,
      "no interval fixture is keyed as a union any more",
    ).toBeGreaterThanOrEqual(2);
    expect(UNION_SPELLING_CASES.length).toBe(
      UNION_KEY_ITEMS.length * UNION_SPELLINGS.length,
    );
    // Both the glyph and the letter have to be in the sweep, on both sides of the space
    // question, or it stops being about the join and becomes about one string.
    const spelt = new Set(UNION_SPELLING_CASES.map((testCase) => testCase.raw_answer));
    expect(spelt.size, "the spellings collapsed onto each other").toBe(
      UNION_SPELLING_CASES.length,
    );
    expect(
      UNION_SPELLING_CASES.filter((testCase) => /\u222a/.test(testCase.raw_answer)).length,
      "the cup glyph left the sweep",
    ).toBeGreaterThanOrEqual(UNION_KEY_ITEMS.length * 2);
  });

  it.each(UNION_SPELLING_CASES)("accepts $name", ({ item_version_id, raw_answer }) => {
    const result = checker({
      raw_answer,
      item_version_id,
      equivalence_checker_version: PRODUCT_CHECKER_VERSION,
    });
    expect(result, raw_answer).toMatchObject({
      status: "correct",
      client_correct: true,
      checker_version: PRODUCT_CHECKER_VERSION,
    });
  });
});
