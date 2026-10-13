import { describe, expect, it } from "vitest";

import {
  canonicalExprBuilderPayload,
  EXPR_BUILDER_COMPARATOR_VERSION,
  type ExprBuilderSpec,
  scoreExprBuilderResponse,
  toExprBuilderWorkspace,
  validateExprBuilderSpec,
} from "./comparator";
import { EXPR_BUILDER_FALSE_POSITIVE_CASES, EXPR_BUILDER_GOLDEN_CASES } from "./fixtures";

describe("expr_builder comparator: golden + alternate-valid cases", () => {
  it.each(EXPR_BUILDER_GOLDEN_CASES)(
    "$name grades correct",
    ({ spec, response, expected_status, expected_reason }) => {
      const result = scoreExprBuilderResponse(spec, response);
      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: expected_status === "correct",
        checker_version: EXPR_BUILDER_COMPARATOR_VERSION,
      });
    },
  );

  it("aligns to the shared v2 generation", () => {
    expect(EXPR_BUILDER_COMPARATOR_VERSION).toBe(2);
  });
});

describe("expr_builder comparator: reason-coded near-miss + false-positive battery", () => {
  it("has broad coverage (base, exponent, missing, malformed)", () => {
    expect(EXPR_BUILDER_FALSE_POSITIVE_CASES.length).toBeGreaterThanOrEqual(8);
  });

  it("never grades a wrong build correct", () => {
    for (const testCase of EXPR_BUILDER_FALSE_POSITIVE_CASES) {
      const result = scoreExprBuilderResponse(testCase.spec, testCase.response);
      expect(result.status, testCase.name).not.toBe("correct");
      expect(result.client_correct, testCase.name).toBe(false);
    }
  });

  it.each(EXPR_BUILDER_FALSE_POSITIVE_CASES)(
    "rejects with the correct reason: $name",
    ({ spec, response, expected_status, expected_reason }) => {
      const result = scoreExprBuilderResponse(spec, response);
      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: false,
        checker_version: EXPR_BUILDER_COMPARATOR_VERSION,
      });
    },
  );
});

describe("expr_builder comparator: the base symbol is case-insensitive", () => {
  // A student typing `X` for a spec whose base is `x` was previously graded
  // `base_mismatch`, failing a CORRECT build on letter case alone. Case is not the
  // skill under test in any base-bearing shape, so it is normalized on both sides.
  const CASE_VARIANTS: readonly [string, ExprBuilderSpec, unknown][] = [
    [
      "positive_power",
      { kind: "positive_power", base: "x", exp: 3 },
      { kind: "positive_power", base: "X", exp: 3 },
    ],
    [
      "radical_form",
      { kind: "radical_form", base: "x", power: 3, index: 4 },
      { kind: "radical_form", base: "X", exp: 3, index: 4 },
    ],
    [
      "rational_power",
      { kind: "rational_power", base: "x", num: 3, den: 4 },
      { kind: "rational_power", base: "X", num: 3, den: 4 },
    ],
  ];

  it.each(CASE_VARIANTS)(
    "%s: an uppercase base grades correct",
    (_kind, spec, response) => {
      expect(scoreExprBuilderResponse(spec, response)).toMatchObject({
        status: "correct",
        reason_code: "match",
        client_correct: true,
      });
    },
  );

  it.each(CASE_VARIANTS)(
    "%s: an uppercase base with surrounding whitespace grades correct",
    (_kind, spec, response) => {
      const padded = { ...(response as Record<string, unknown>), base: "  X  " };
      expect(scoreExprBuilderResponse(spec, padded)).toMatchObject({
        status: "correct",
        client_correct: true,
      });
    },
  );

  it("normalizes an UPPERCASE author spec too, so the comparison stays symmetric", () => {
    const spec = { kind: "positive_power", base: "X", exp: 3 } as ExprBuilderSpec;
    for (const base of ["x", "X", " x "]) {
      expect(
        scoreExprBuilderResponse(spec, { kind: "positive_power", base, exp: 3 }),
      ).toMatchObject({ status: "correct", client_correct: true });
    }
  });

  it("still rejects a genuinely different letter, in either case", () => {
    const spec: ExprBuilderSpec = { kind: "positive_power", base: "x", exp: 3 };
    for (const base of ["y", "Y", "z"]) {
      expect(
        scoreExprBuilderResponse(spec, { kind: "positive_power", base, exp: 3 }),
      ).toMatchObject({
        status: "incorrect",
        reason_code: "base_mismatch",
        client_correct: false,
      });
    }
  });
});

describe("expr_builder validateSpec (fail closed)", () => {
  it.each([
    ["positive_power", { kind: "positive_power", base: "x", exp: 3 }],
    ["coeff_radical", { kind: "coeff_radical", coeff: 5, radicand: 2, index: 2 }],
    ["radical_form", { kind: "radical_form", base: "x", power: 3, index: 4 }],
    ["rational_power", { kind: "rational_power", base: "x", num: 3, den: 4 }],
  ] as const)("passes a well-formed %s spec", (_name, spec) => {
    expect(validateExprBuilderSpec(spec as ExprBuilderSpec)).toBeUndefined();
  });

  it.each([
    // positive_power
    ["invalid_base", { kind: "positive_power", base: "", exp: 3 }],
    ["invalid_exponent", { kind: "positive_power", base: "x", exp: 0 }],
    ["invalid_exponent", { kind: "positive_power", base: "x", exp: -2 }],
    ["invalid_exponent", { kind: "positive_power", base: "x", exp: 1.5 }],
    // coeff_radical
    ["invalid_coefficient", { kind: "coeff_radical", coeff: 0, radicand: 2, index: 2 }],
    ["invalid_radicand", { kind: "coeff_radical", coeff: 5, radicand: 1, index: 2 }],
    ["invalid_index", { kind: "coeff_radical", coeff: 5, radicand: 2, index: 1 }],
    // radical_form
    ["invalid_base", { kind: "radical_form", base: "", power: 3, index: 4 }],
    ["invalid_power", { kind: "radical_form", base: "x", power: 0, index: 4 }],
    ["invalid_index", { kind: "radical_form", base: "x", power: 3, index: 1 }],
    // rational_power
    ["invalid_numerator", { kind: "rational_power", base: "x", num: 0, den: 4 }],
    ["invalid_denominator", { kind: "rational_power", base: "x", num: 3, den: 1 }],
    // unknown kind
    ["unsupported_spec_kind", { kind: "quadratic_form", a: 1, b: 2 }],
  ] as const)("fails closed with %s", (reason, spec) => {
    expect(scoreExprBuilderResponse(spec as unknown as ExprBuilderSpec, {})).toMatchObject({
      status: "scoring_error",
      reason_code: reason,
      checker_version: EXPR_BUILDER_COMPARATOR_VERSION,
    });
  });
});

describe("expr_builder comparator: never throws on adversarial input", () => {
  const specs: ExprBuilderSpec[] = [
    { kind: "positive_power", base: "x", exp: 3 },
    { kind: "coeff_radical", coeff: 5, radicand: 2, index: 2 },
    { kind: "radical_form", base: "x", power: 3, index: 4 },
    { kind: "rational_power", base: "x", num: 3, den: 4 },
  ];
  it("fails closed, never correct", () => {
    for (const spec of specs) {
      for (const response of [null, undefined, [], 42, "x", { exp: {} }, () => 1]) {
        const run = () => scoreExprBuilderResponse(spec, response);
        expect(run).not.toThrow();
        expect(run().status).not.toBe("correct");
      }
    }
  });
});

describe("expr_builder workspace never leaks the answer key", () => {
  const ALL_SPECS: readonly ExprBuilderSpec[] = [
    { kind: "positive_power", base: "x", exp: 3 },
    { kind: "coeff_radical", coeff: 5, radicand: 2, index: 2 },
    { kind: "radical_form", base: "x", power: 3, index: 4 },
    { kind: "rational_power", base: "x", num: 3, den: 4 },
  ];

  it("projects only the layout + slots, no answer values", () => {
    const workspace = toExprBuilderWorkspace(ALL_SPECS[0] as ExprBuilderSpec);
    expect(workspace).toEqual({
      kind: "positive_power",
      template: "base^exponent",
      slots: [
        { id: "base", role: "base", label: "Base", control: "symbol" },
        { id: "exp", role: "exponent", label: "Exponent", control: "integer" },
      ],
    });
  });

  it.each(ALL_SPECS)(
    "$kind: no slot carries a value and no answer digit survives serialization",
    (spec) => {
      const workspace = toExprBuilderWorkspace(spec);
      // No slot carries a pre-filled answer value.
      for (const slot of workspace.slots) {
        expect((slot as unknown as Record<string, unknown>).value).toBeUndefined();
      }
      // The workspace is a pure layout: it holds no answer digits at all. (Slot
      // labels may mention a fixed root type, e.g. "2 for a square root", but that
      // is the problem's GIVEN, not an author-declared answer value, so we assert
      // no digit leaks from the template + the actual answer-bearing slot ids.)
      const answerBearing = {
        kind: workspace.kind,
        template: workspace.template,
        slotIds: workspace.slots.map((slot) => slot.id),
      };
      expect(/\d/.test(JSON.stringify(answerBearing))).toBe(false);
    },
  );

  it.each(ALL_SPECS)(
    "$kind: the canonical payload reconstructs a correct key (server-side only)",
    (spec) => {
      const payload = canonicalExprBuilderPayload(spec);
      expect(scoreExprBuilderResponse(spec, payload).status).toBe("correct");
    },
  );

  it("positive_power canonical payload is exactly the key", () => {
    const spec: ExprBuilderSpec = { kind: "positive_power", base: "x", exp: 3 };
    expect(canonicalExprBuilderPayload(spec)).toEqual({
      kind: "positive_power",
      base: "x",
      exp: 3,
    });
  });
});
