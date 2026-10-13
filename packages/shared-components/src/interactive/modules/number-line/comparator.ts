import {
  correct,
  type InternalResult,
  incorrect,
  invalid,
  scoringError,
  withVersion,
} from "../../../checker-core";
import type { CheckAnswerResult } from "../../../index";
import { compareIntervalLists, type Interval } from "../../../interval-helpers";

/**
 * The deterministic `number_line` comparator — the SECOND concrete interactive
 * answer type (after `graph`). A student places point(s) and/or interval(s) on a
 * 1-D number line; the widget emits a structured {@link NumberLinePayload} that
 * this pure comparator scores against the author-declared {@link NumberLineExpected}
 * spec (the answer key). Like the graph comparator it is pure + never throws, so
 * Node and Chromium return identical verdicts (Answer_Equivalence_Spec §13.15).
 *
 * Points are matched order-insensitively by nearest value within an absolute
 * `tolerance`; intervals are compared through the SHARED `compareIntervalLists`
 * (endpoints + inclusivity), so a number-line interval grades exactly as a text
 * interval-notation answer does.
 *
 * Aligned to the shared v2 generation (`INTERACTIVE_CHECKER_VERSION`).
 */
export const NUMBER_LINE_COMPARATOR_VERSION = 2;

/** One author-declared / student-placed interval on the line. */
export interface NumberLineInterval {
  lo: number;
  hi: number;
  loClosed: boolean;
  hiClosed: boolean;
}

/** The private spec (the answer key): the target points and/or intervals. */
export interface NumberLineExpected {
  /** The visible axis span; every scored value lies within it. */
  domain: readonly [number, number];
  /** Optional tick spacing for the axis + keyboard nudge (cosmetic + UX only). */
  tick?: number;
  /** Target point values (order-insensitive, matched within `tolerance`). */
  points?: readonly number[];
  /** Target intervals (endpoints + inclusivity). */
  intervals?: readonly NumberLineInterval[];
  /** Absolute tolerance for point placement (no implicit tolerance, §6). */
  tolerance: number;
}

/** The structured response the widget emits (never a bitmap). */
export interface NumberLinePayload {
  points?: readonly number[];
  intervals?: readonly NumberLineInterval[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Authoring-time validation of the spec (fail closed as `scoring_error`): a finite
 * domain with lo < hi, at least one scored target (point or interval), a finite
 * non-negative tolerance, and finite/well-ordered target values.
 */
export function validateNumberLineExpected(
  spec: NumberLineExpected,
): InternalResult | undefined {
  if (!spec || typeof spec !== "object") {
    return scoringError("invalid_spec");
  }
  const domain = spec.domain ?? ([] as readonly number[]);
  const lo = domain[0];
  const hi = domain[1];
  if (!isFiniteNumber(lo) || !isFiniteNumber(hi) || lo >= hi) {
    return scoringError("invalid_domain");
  }
  const pointCount = spec.points?.length ?? 0;
  const intervalCount = spec.intervals?.length ?? 0;
  if (pointCount + intervalCount < 1) {
    return scoringError("no_scored_targets");
  }
  if (!isFiniteNumber(spec.tolerance) || spec.tolerance < 0) {
    return scoringError("invalid_tolerance");
  }
  if (spec.points?.some((point) => !isFiniteNumber(point))) {
    return scoringError("invalid_point");
  }
  if (
    spec.intervals?.some(
      (interval) =>
        !isFiniteNumber(interval.lo) ||
        !isFiniteNumber(interval.hi) ||
        interval.lo > interval.hi ||
        typeof interval.loClosed !== "boolean" ||
        typeof interval.hiClosed !== "boolean",
    )
  ) {
    return scoringError("invalid_interval");
  }
  return undefined;
}

/** Reject a payload whose top-level shape is not `{ points?: [], intervals?: [] }`. */
function normalizePayload(response: unknown): NumberLinePayload | undefined {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return undefined;
  }
  const payload = response as NumberLinePayload;
  const pointsOk = payload.points === undefined || Array.isArray(payload.points);
  const intervalsOk = payload.intervals === undefined || Array.isArray(payload.intervals);
  if (!pointsOk || !intervalsOk) {
    return undefined;
  }
  return payload;
}

/**
 * Order-insensitive nearest-match point scoring: every expected point must be
 * matched by a distinct submitted point within `tolerance`, with no extra points.
 */
function comparePoints(
  expected: readonly number[],
  submitted: readonly number[],
  tolerance: number,
): InternalResult {
  if (submitted.some((value) => !isFiniteNumber(value))) {
    return invalid("invalid_point");
  }
  if (submitted.length < expected.length) {
    return incorrect("point_missing");
  }
  if (submitted.length > expected.length) {
    return incorrect("extra_point");
  }
  const used = submitted.map(() => false);
  for (const target of expected) {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < submitted.length; i += 1) {
      if (used[i]) {
        continue;
      }
      const distance = Math.abs((submitted[i] as number) - target);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    if (bestIndex < 0 || bestDistance > tolerance) {
      return incorrect("point_mismatch");
    }
    used[bestIndex] = true;
  }
  return correct();
}

function toInterval(interval: NumberLineInterval): Interval | undefined {
  if (!interval || typeof interval !== "object") {
    return undefined;
  }
  if (
    !isFiniteNumber(interval.lo) ||
    !isFiniteNumber(interval.hi) ||
    typeof interval.loClosed !== "boolean" ||
    typeof interval.hiClosed !== "boolean"
  ) {
    return undefined;
  }
  return {
    lo: interval.lo,
    loClosed: interval.loClosed,
    hi: interval.hi,
    hiClosed: interval.hiClosed,
  };
}

const bySpan = (a: Interval, b: Interval): number => a.lo - b.lo || a.hi - b.hi;

/** Interval scoring via the SHARED list comparator (endpoints + inclusivity). */
function compareIntervals(
  expected: readonly NumberLineInterval[],
  submitted: readonly NumberLineInterval[],
): InternalResult {
  const submittedIntervals = submitted.map(toInterval);
  if (submittedIntervals.some((interval) => interval === undefined)) {
    return invalid("invalid_interval");
  }
  const expectedIntervals = expected.map(toInterval);
  if (expectedIntervals.some((interval) => interval === undefined)) {
    return scoringError("invalid_interval");
  }
  const submittedSorted = [...(submittedIntervals as Interval[])].sort(bySpan);
  const expectedSorted = [...(expectedIntervals as Interval[])].sort(bySpan);
  return compareIntervalLists(submittedSorted, expectedSorted);
}

/**
 * Score one structured number-line response against the expected spec. Pure +
 * deterministic; never throws. A malformed spec fails closed as `scoring_error`;
 * a malformed payload as `invalid_input`; a wrong placement as `incorrect` with a
 * reason code.
 */
export function scoreNumberLineResponse(
  spec: NumberLineExpected,
  response: unknown,
): CheckAnswerResult {
  const invalidSpec = validateNumberLineExpected(spec);
  if (invalidSpec) {
    return withVersion(invalidSpec, NUMBER_LINE_COMPARATOR_VERSION);
  }
  const payload = normalizePayload(response);
  if (!payload) {
    return withVersion(
      invalid("invalid_number_line_response"),
      NUMBER_LINE_COMPARATOR_VERSION,
    );
  }

  const expectedPoints = spec.points ?? [];
  const submittedPoints = payload.points ?? [];
  if (expectedPoints.length > 0 || submittedPoints.length > 0) {
    const pointResult = comparePoints(expectedPoints, submittedPoints, spec.tolerance);
    if (pointResult.status !== "correct") {
      return withVersion(pointResult, NUMBER_LINE_COMPARATOR_VERSION);
    }
  }

  const expectedIntervals = spec.intervals ?? [];
  const submittedIntervals = payload.intervals ?? [];
  if (expectedIntervals.length > 0 || submittedIntervals.length > 0) {
    const intervalResult = compareIntervals(expectedIntervals, submittedIntervals);
    if (intervalResult.status !== "correct") {
      return withVersion(intervalResult, NUMBER_LINE_COMPARATOR_VERSION);
    }
  }

  return withVersion(correct(), NUMBER_LINE_COMPARATOR_VERSION);
}

/** An answer-free description of what a number-line item elicits (no answer values). */
export interface NumberLineWorkspace {
  domain: readonly [number, number];
  tick?: number;
  pointCount: number;
  intervalCount: number;
}

/**
 * Project the answer-free workspace the widget renders from. It carries the axis
 * span + tick and HOW MANY points/intervals to elicit, with every ANSWER value
 * (target coordinates + inclusivity) stripped — the client never receives the key.
 */
export function toNumberLineWorkspace(spec: NumberLineExpected): NumberLineWorkspace {
  return {
    domain: spec.domain,
    tick: spec.tick,
    pointCount: spec.points?.length ?? 0,
    intervalCount: spec.intervals?.length ?? 0,
  };
}

/** The canonical correct payload for a spec (the answer key as a widget payload). */
export function canonicalNumberLinePayload(spec: NumberLineExpected): NumberLinePayload {
  const payload: NumberLinePayload = {};
  if (spec.points?.length) {
    payload.points = [...spec.points];
  }
  if (spec.intervals?.length) {
    payload.intervals = spec.intervals.map((interval) => ({ ...interval }));
  }
  return payload;
}
