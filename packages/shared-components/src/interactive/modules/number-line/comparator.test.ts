import { describe, expect, it } from "vitest";

import {
  canonicalNumberLinePayload,
  NUMBER_LINE_COMPARATOR_VERSION,
  type NumberLineExpected,
  scoreNumberLineResponse,
  toNumberLineWorkspace,
  validateNumberLineExpected,
} from "./comparator";
import { NUMBER_LINE_FALSE_POSITIVE_CASES, NUMBER_LINE_GOLDEN_CASES } from "./fixtures";

describe("number_line comparator: golden + alternate-valid cases", () => {
  it.each(NUMBER_LINE_GOLDEN_CASES)(
    "$name grades correct",
    ({ spec, response, expected_status, expected_reason }) => {
      const result = scoreNumberLineResponse(spec, response);
      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: expected_status === "correct",
        checker_version: NUMBER_LINE_COMPARATOR_VERSION,
      });
    },
  );

  it("aligns to the shared v2 generation", () => {
    expect(NUMBER_LINE_COMPARATOR_VERSION).toBe(2);
  });
});

describe("number_line comparator: reason-coded near-miss + false-positive battery", () => {
  it("has broad coverage (points, intervals, inclusivity, malformed)", () => {
    expect(NUMBER_LINE_FALSE_POSITIVE_CASES.length).toBeGreaterThanOrEqual(8);
  });

  it("never grades a wrong placement correct", () => {
    for (const testCase of NUMBER_LINE_FALSE_POSITIVE_CASES) {
      const result = scoreNumberLineResponse(testCase.spec, testCase.response);
      expect(result.status, testCase.name).not.toBe("correct");
      expect(result.client_correct, testCase.name).toBe(false);
    }
  });

  it.each(NUMBER_LINE_FALSE_POSITIVE_CASES)(
    "rejects with the correct reason: $name",
    ({ spec, response, expected_status, expected_reason }) => {
      const result = scoreNumberLineResponse(spec, response);
      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: false,
        checker_version: NUMBER_LINE_COMPARATOR_VERSION,
      });
    },
  );
});

describe("number_line validateSpec (fail closed)", () => {
  it("passes a well-formed spec", () => {
    expect(
      validateNumberLineExpected({ domain: [-5, 5], points: [3], tolerance: 0.25 }),
    ).toBeUndefined();
  });

  it.each([
    ["invalid_domain", { domain: [5, -5], points: [1], tolerance: 0.25 }],
    ["no_scored_targets", { domain: [-5, 5], tolerance: 0.25 }],
    ["invalid_tolerance", { domain: [-5, 5], points: [1], tolerance: Number.NaN }],
    [
      "invalid_point",
      { domain: [-5, 5], points: [Number.POSITIVE_INFINITY], tolerance: 0.25 },
    ],
    [
      "invalid_interval",
      {
        domain: [-5, 5],
        intervals: [{ lo: 4, hi: 1, loClosed: true, hiClosed: true }],
        tolerance: 0.25,
      },
    ],
  ] as const)("fails closed with %s", (reason, spec) => {
    expect(scoreNumberLineResponse(spec as NumberLineExpected, {})).toMatchObject({
      status: "scoring_error",
      reason_code: reason,
      checker_version: NUMBER_LINE_COMPARATOR_VERSION,
    });
  });
});

describe("number_line comparator: never throws on adversarial input", () => {
  const spec: NumberLineExpected = { domain: [-5, 5], points: [1], tolerance: 0.25 };
  it("fails closed, never correct", () => {
    for (const response of [null, undefined, [], 42, "x", { points: 5 }, () => 1]) {
      const run = () => scoreNumberLineResponse(spec, response);
      expect(run).not.toThrow();
      expect(run().status).not.toBe("correct");
    }
  });
});

describe("number_line workspace never leaks the answer key", () => {
  const spec: NumberLineExpected = {
    domain: [-5, 5],
    tick: 1,
    points: [3, -2],
    intervals: [{ lo: 1, hi: 4, loClosed: true, hiClosed: false }],
    tolerance: 0.25,
  };

  it("projects only counts + axis config, no coordinates", () => {
    const workspace = toNumberLineWorkspace(spec);
    expect(workspace).toEqual({
      domain: [-5, 5],
      tick: 1,
      pointCount: 2,
      intervalCount: 1,
    });
    // The workspace must not carry the target arrays under any key.
    expect((workspace as unknown as Record<string, unknown>).points).toBeUndefined();
    expect((workspace as unknown as Record<string, unknown>).intervals).toBeUndefined();
    // Belt-and-braces: no key coordinate (3, -2, 4) survives serialization, and the
    // only numbers present are the domain span, tick, and the two counts.
    const numbers = JSON.stringify(workspace).match(/-?\d+(?:\.\d+)?/g) ?? [];
    expect(numbers.sort()).toEqual(["-5", "1", "1", "2", "5"].sort());
  });

  it("the canonical payload DOES reconstruct the key (server-side only)", () => {
    expect(canonicalNumberLinePayload(spec)).toEqual({
      points: [3, -2],
      intervals: [{ lo: 1, hi: 4, loClosed: true, hiClosed: false }],
    });
    // And that canonical payload grades correct against its own spec.
    expect(scoreNumberLineResponse(spec, canonicalNumberLinePayload(spec)).status).toBe(
      "correct",
    );
  });
});
