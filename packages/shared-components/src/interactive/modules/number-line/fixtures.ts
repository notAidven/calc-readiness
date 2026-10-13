import type { NumberLineExpected, NumberLinePayload } from "./comparator";

/**
 * Cross-runtime fixtures for the `number_line` comparator (mirrors the graph
 * comparator's golden + false-positive fixtures). Shared by the Node unit suite and
 * the Chromium parity suite so BOTH runtimes are asserted to return identical
 * verdicts (Answer_Equivalence_Spec §13.15).
 */

export interface NumberLineGoldenCase {
  name: string;
  spec: NumberLineExpected;
  response: NumberLinePayload;
  expected_status: "correct" | "incorrect" | "invalid_input" | "scoring_error";
  expected_reason: string;
}

// --- A single point: solve x = 3 (place the solution on the line) ---
const POINT_SPEC: NumberLineExpected = {
  domain: [-5, 5],
  tick: 1,
  points: [3],
  tolerance: 0.25,
};

// --- Two points: the roots {-2, 2} ---
const TWO_POINT_SPEC: NumberLineExpected = {
  domain: [-5, 5],
  tick: 1,
  points: [-2, 2],
  tolerance: 0.25,
};

// --- One closed interval: [-1, 4] ---
const INTERVAL_SPEC: NumberLineExpected = {
  domain: [-6, 6],
  tick: 1,
  intervals: [{ lo: -1, hi: 4, loClosed: true, hiClosed: true }],
  tolerance: 0.25,
};

// --- Half-open interval: (2, 5] (a strict-vs-inclusive inequality solution) ---
const HALF_OPEN_SPEC: NumberLineExpected = {
  domain: [0, 8],
  tick: 1,
  intervals: [{ lo: 2, hi: 5, loClosed: false, hiClosed: true }],
  tolerance: 0.25,
};

export const NUMBER_LINE_GOLDEN_CASES: readonly NumberLineGoldenCase[] = [
  {
    name: "single point exact",
    spec: POINT_SPEC,
    response: { points: [3] },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "single point within tolerance",
    spec: POINT_SPEC,
    response: { points: [3.2] },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "two points in reverse order (order-insensitive)",
    spec: TWO_POINT_SPEC,
    response: { points: [2, -2] },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "closed interval exact",
    spec: INTERVAL_SPEC,
    response: { intervals: [{ lo: -1, hi: 4, loClosed: true, hiClosed: true }] },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "half-open interval exact",
    spec: HALF_OPEN_SPEC,
    response: { intervals: [{ lo: 2, hi: 5, loClosed: false, hiClosed: true }] },
    expected_status: "correct",
    expected_reason: "match",
  },
];

export const NUMBER_LINE_FALSE_POSITIVE_CASES: readonly NumberLineGoldenCase[] = [
  {
    name: "point just past tolerance",
    spec: POINT_SPEC,
    response: { points: [3.5] },
    expected_status: "incorrect",
    expected_reason: "point_mismatch",
  },
  {
    name: "point sign slip (-3 for 3)",
    spec: POINT_SPEC,
    response: { points: [-3] },
    expected_status: "incorrect",
    expected_reason: "point_mismatch",
  },
  {
    name: "missing a required point",
    spec: TWO_POINT_SPEC,
    response: { points: [2] },
    expected_status: "incorrect",
    expected_reason: "point_missing",
  },
  {
    name: "extra unexpected point",
    spec: TWO_POINT_SPEC,
    response: { points: [-2, 2, 0] },
    expected_status: "incorrect",
    expected_reason: "extra_point",
  },
  {
    name: "wrong endpoint value",
    spec: INTERVAL_SPEC,
    response: { intervals: [{ lo: -1, hi: 3, loClosed: true, hiClosed: true }] },
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "wrong inclusivity (open where closed expected)",
    spec: HALF_OPEN_SPEC,
    response: { intervals: [{ lo: 2, hi: 5, loClosed: false, hiClosed: false }] },
    expected_status: "incorrect",
    expected_reason: "wrong_bound_inclusivity",
  },
  {
    name: "stray interval where only a point is expected",
    spec: POINT_SPEC,
    response: {
      points: [3],
      intervals: [{ lo: 0, hi: 1, loClosed: true, hiClosed: true }],
    },
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "malformed payload (array, not object)",
    spec: POINT_SPEC,
    response: [] as unknown as NumberLinePayload,
    expected_status: "invalid_input",
    expected_reason: "invalid_number_line_response",
  },
  {
    name: "non-finite point value",
    spec: POINT_SPEC,
    response: { points: [Number.NaN] },
    expected_status: "invalid_input",
    expected_reason: "invalid_point",
  },
];
