import {
  correct,
  floatEqual,
  type InternalResult,
  incorrect,
  invalid,
  numMath,
  parseSafeExpression,
  scoringError,
  unsupported,
  withVersion,
} from "./checker-core";
import type { CheckAnswerResult, GraphPoint } from "./index";

/**
 * The Section 8 geometric graph comparator (Answer_Equivalence_Spec Section 8,
 * CI invariant Section 13.15) — a SPIKE first cut. It is intentionally separate
 * from the text answer-checker (`product-answer-checker.ts`), which returns
 * `graph_uses_geometric_comparator` for a `graph` answer_type: graph scoring has
 * distinct geometric failure modes and is gated by its own golden set.
 *
 * It scores a structured, numeric `GraphResponsePayload` (never a bitmap) against
 * an author-declared `GraphExpected` by (1) a sampled-point curve match within an
 * absolute tolerance over the declared domain, and (2) per-feature matching of the
 * declared scored features (intercepts, vertex, asymptotes, period, amplitude),
 * each with its own tolerance. Cosmetic aspects (color, gridlines, off-domain
 * behavior) are un-scorable because the payload does not carry them.
 *
 * It is pure + deterministic, so Node and Chromium return identical verdicts. See
 * `docs/Graph_Comparator_Spike.md` for the design.
 *
 * Region / shading scoring is now IMPLEMENTED (was a typed stub in the spike): a
 * `region` feature declares ground-truth probe memberships and the widget reports
 * the student's inside/outside call at the same probes; the comparator checks
 * boolean agreement (no tolerance). This covers linear-inequality (half-plane)
 * shading and rational/polynomial sign regions. A region declared with no probes
 * is an unsupported descriptor and fails closed (authoring reject). The
 * interactive scored-SVG input lives in `graph-input.tsx` (same lane).
 */
export const GRAPH_COMPARATOR_VERSION = 2;

export type GraphFeatureKind =
  | "point"
  | "x_intercept"
  | "y_intercept"
  | "vertex"
  | "hole"
  | "vertical_asymptote"
  | "horizontal_asymptote"
  | "period"
  | "amplitude"
  | "region";

/** Point-like features carry a point; scalar features carry a single value. */
const SCALAR_FEATURES: ReadonlySet<GraphFeatureKind> = new Set([
  "vertical_asymptote",
  "horizontal_asymptote",
  "period",
  "amplitude",
]);

export type GraphCurve =
  | { kind: "function"; expression: string; symbol?: string }
  | { kind: "polyline"; points: readonly GraphPoint[] };

/**
 * One author-declared region probe: a point plus the ground-truth membership of
 * that point in the correct region (`inside`). Region/shading scoring is boolean
 * membership agreement at these probes (Section 8 follow-up plan), never a bitmap
 * and never a tolerance: a probe is chosen to be unambiguously in or out.
 */
export interface RegionProbe {
  x: number;
  y: number;
  inside: boolean;
}

/** The student's reported membership at a probe point (widget-emitted). */
export type RegionMembership = RegionProbe;

export interface ScoredFeature {
  kind: GraphFeatureKind;
  point?: GraphPoint;
  value?: number;
  /**
   * Author-declared probe memberships for a `region` feature. Boolean agreement
   * at every probe is required (no tolerance). Supported region shapes are those
   * a finite probe set characterizes: linear-inequality (half-plane) shading and
   * rational/polynomial sign regions. A `region` feature with no probes is an
   * authoring reject (fail-closed); other region descriptors are unsupported.
   */
  region?: { probes: readonly RegionProbe[] };
  /** Per-feature tolerance (Section 8: no implicit tolerance). Ignored for `region`. */
  tolerance: number;
  /**
   * Stable id for authoring diagnostics. REQUIRED for `region` features: the
   * student's membership payload (`response.regions`) is keyed by this label so
   * the widget and comparator agree on which region a membership set answers.
   */
  label?: string;
}

export interface GraphExpected {
  domain: readonly [number, number];
  sampleCount?: number;
  samplePoints?: readonly number[];
  curve?: GraphCurve;
  /** Absolute y-tolerance for the sampled-point match; REQUIRED when curve is set. */
  curveTolerance?: number;
  /** Asymptote / hole x's skipped in the sampled-point match. */
  excludedX?: readonly number[];
  /** Declared scored features; >= 1 required (Section 8 authoring gate). */
  features: readonly ScoredFeature[];
}

export interface GraphResponsePayload {
  samples?: readonly GraphPoint[];
  points?: readonly GraphPoint[];
  scalars?: Partial<Record<GraphFeatureKind, number>>;
  /**
   * Per-region membership the widget emits, keyed by the region feature's `label`.
   * Each entry reports the student's inside/outside call at the item's declared
   * probe points (the widget is handed the probe coordinates, never the truth).
   */
  regions?: Readonly<Record<string, readonly RegionMembership[]>>;
}

export interface GraphItemVersion {
  item_version_id: string;
  node_id: string;
  expected: GraphExpected;
}

export interface GraphCheckInput {
  response: unknown;
  item_version_id: string;
  equivalence_checker_version: number;
}

export interface FeatureResult {
  label: string;
  matched: boolean;
  reason: string;
}

/** The per-feature scoring outcome; `unsupported` routes to `unsupported_expression`. */
interface FeatureOutcome {
  matched: boolean;
  reason: string;
  /** A genuinely-unsupported sub-case (fail-closed as an application fault, §12). */
  unsupported?: boolean;
}

export type GraphCheckResult = CheckAnswerResult & {
  feature_results?: readonly FeatureResult[];
};

const DEFAULT_SAMPLE_COUNT = 25;

function isFinitePoint(value: unknown): value is GraphPoint {
  return (
    !!value &&
    typeof value === "object" &&
    Number.isFinite((value as GraphPoint).x) &&
    Number.isFinite((value as GraphPoint).y)
  );
}

/** Even sample x's across the (inclusive) domain, or the explicit list. */
function sampleXs(expected: GraphExpected): number[] {
  if (expected.samplePoints?.length) {
    return [...expected.samplePoints];
  }
  const [lo, hi] = expected.domain;
  const count = Math.max(2, expected.sampleCount ?? DEFAULT_SAMPLE_COUNT);
  const step = (hi - lo) / (count - 1);
  return Array.from({ length: count }, (_unused, index) => lo + index * step);
}

/**
 * The exact sample x's the comparator will score a curve at. Exported so the
 * graphing widget can resample its plotted curve on the SAME grid (the widget is
 * handed this via the answer-free workspace, never the reference curve itself).
 */
export function graphSampleXs(expected: GraphExpected): number[] {
  return sampleXs(expected);
}

const CURVE_FUNCTIONS: ReadonlySet<string> = new Set(["sqrt", "nthRoot", "cbrt", "abs"]);

/** Reference y at x for the declared curve, or undefined where it is not defined. */
function referenceYAt(curve: GraphCurve, x: number): number | undefined {
  if (curve.kind === "polyline") {
    return interpolateY(curve.points, x);
  }
  const symbol = curve.symbol ?? "x";
  const safe = parseSafeExpression(curve.expression, [symbol], {
    allowedFunctions: CURVE_FUNCTIONS,
    allowSymbolicDenominator: true,
    allowNegativeExponent: true,
  });
  if (safe.result || !safe.node) {
    return undefined;
  }
  try {
    const value = numMath.parse(curve.expression).evaluate({ [symbol]: x }) as unknown;
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Linear interpolation of y at x from sorted-or-unsorted sample points. */
function interpolateY(points: readonly GraphPoint[], x: number): number | undefined {
  const finite = points.filter(isFinitePoint);
  if (finite.length === 0) {
    return undefined;
  }
  const sorted = [...finite].sort((a, b) => a.x - b.x);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last || x < first.x - 1e-9 || x > last.x + 1e-9) {
    return undefined; // outside the sampled range: cannot vouch for the value.
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const left = sorted[i];
    const right = sorted[i + 1];
    if (left && right && x >= left.x - 1e-9 && x <= right.x + 1e-9) {
      if (floatEqual(left.x, right.x)) {
        return left.y;
      }
      const t = (x - left.x) / (right.x - left.x);
      return left.y + t * (right.y - left.y);
    }
  }
  return last.y;
}

/** Nearest point in `candidates` to `target`, with its Euclidean distance. */
function nearestPoint(
  candidates: readonly GraphPoint[],
  target: GraphPoint,
): { point?: GraphPoint; distance: number } {
  let best: GraphPoint | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = Math.hypot(candidate.x - target.x, candidate.y - target.y);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return { point: best, distance: bestDistance };
}

export function validateExpected(expected: GraphExpected): InternalResult | undefined {
  if (!expected.features.length) {
    return scoringError("no_scored_features"); // Section 8 authoring reject.
  }
  const [lo, hi] = expected.domain;
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi) {
    return scoringError("invalid_domain");
  }
  if (expected.curve && expected.curveTolerance === undefined) {
    return scoringError("missing_curve_tolerance"); // no implicit tolerance (Section 6).
  }
  // Region authoring gates: a scored region must carry a stable label (the payload
  // key) and >= 1 ground-truth probe. A region with no probes is an unsupported
  // descriptor, so it fails closed as an authoring reject (never a silent pass).
  for (const feature of expected.features) {
    if (feature.kind !== "region") {
      continue;
    }
    if (!feature.label) {
      return scoringError("region_missing_label");
    }
    const probes = feature.region?.probes ?? [];
    if (probes.length === 0) {
      return scoringError("region_no_probes");
    }
    if (probes.some((probe) => !Number.isFinite(probe.x) || !Number.isFinite(probe.y))) {
      return scoringError("region_invalid_probe");
    }
  }
  return undefined;
}

function scoreCurve(
  expected: GraphExpected,
  samples: readonly GraphPoint[],
): InternalResult | undefined {
  if (!expected.curve) {
    return undefined;
  }
  const tolerance = expected.curveTolerance ?? 0;
  const excluded = expected.excludedX ?? [];
  const isExcluded = (x: number): boolean =>
    excluded.some((value) => Math.abs(value - x) <= 1e-9);
  let comparedAny = false;
  for (const x of sampleXs(expected)) {
    if (isExcluded(x)) {
      continue;
    }
    const expectedY = referenceYAt(expected.curve, x);
    if (expectedY === undefined) {
      continue; // reference undefined here (e.g. near an asymptote): not scored.
    }
    const studentY = interpolateY(samples, x);
    if (studentY === undefined) {
      return incorrect("curve_incomplete"); // student never covered this x.
    }
    comparedAny = true;
    if (Math.abs(expectedY - studentY) > tolerance) {
      return incorrect("curve_mismatch");
    }
  }
  return comparedAny ? undefined : incorrect("curve_incomplete");
}

const REGION_PROBE_EPSILON = 1e-6;

/**
 * Score a region/shading feature by boolean membership agreement (Section 8
 * follow-up). The author declares ground-truth probe memberships; the widget
 * reports the student's inside/outside call at the SAME probe coordinates. Every
 * probe must be reported (else the region is unanswered) and every reported call
 * must match the truth. No tolerance: a probe is chosen to be unambiguously in or
 * out, so the check is exact boolean agreement, deterministic across runtimes.
 */
function scoreRegion(
  feature: ScoredFeature,
  response: GraphResponsePayload,
): FeatureOutcome {
  const probes = feature.region?.probes ?? [];
  // Guarded by validateExpected, but stay defensive: no probes = unsupported.
  if (!feature.label || probes.length === 0) {
    return { matched: false, reason: "region_unsupported", unsupported: true };
  }
  const submitted = response.regions?.[feature.label];
  if (!Array.isArray(submitted)) {
    return { matched: false, reason: "region_missing" };
  }
  const memberships = submitted.filter(
    (entry): entry is RegionMembership =>
      !!entry &&
      typeof entry === "object" &&
      Number.isFinite((entry as RegionMembership).x) &&
      Number.isFinite((entry as RegionMembership).y) &&
      typeof (entry as RegionMembership).inside === "boolean",
  );
  for (const probe of probes) {
    const reported = memberships.find(
      (entry) =>
        Math.abs(entry.x - probe.x) <= REGION_PROBE_EPSILON &&
        Math.abs(entry.y - probe.y) <= REGION_PROBE_EPSILON,
    );
    if (!reported) {
      return { matched: false, reason: "region_incomplete" }; // probe not answered.
    }
    if (reported.inside !== probe.inside) {
      return { matched: false, reason: "region_mismatch" };
    }
  }
  return { matched: true, reason: "match" };
}

function scoreFeature(
  feature: ScoredFeature,
  response: GraphResponsePayload,
): FeatureOutcome {
  if (feature.kind === "region") {
    return scoreRegion(feature, response);
  }
  if (SCALAR_FEATURES.has(feature.kind)) {
    const submitted = response.scalars?.[feature.kind];
    if (typeof submitted !== "number" || !Number.isFinite(submitted)) {
      return { matched: false, reason: `${feature.kind}_missing` };
    }
    if (feature.value === undefined) {
      return { matched: false, reason: "invalid_feature_key" };
    }
    return Math.abs(submitted - feature.value) <= feature.tolerance
      ? { matched: true, reason: "match" }
      : { matched: false, reason: `${feature.kind}_mismatch` };
  }
  // point-like feature
  if (!feature.point) {
    return { matched: false, reason: "invalid_feature_key" };
  }
  const candidates = (response.points ?? []).filter(isFinitePoint);
  if (candidates.length === 0) {
    return { matched: false, reason: `${feature.kind}_missing` };
  }
  const { distance } = nearestPoint(candidates, feature.point);
  return distance <= feature.tolerance
    ? { matched: true, reason: "match" }
    : { matched: false, reason: `${feature.kind}_mismatch` };
}

function normalizeResponse(response: unknown): GraphResponsePayload | undefined {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return undefined;
  }
  const payload = response as GraphResponsePayload;
  const samplesOk = payload.samples === undefined || Array.isArray(payload.samples);
  const pointsOk = payload.points === undefined || Array.isArray(payload.points);
  const scalarsOk =
    payload.scalars === undefined ||
    (typeof payload.scalars === "object" && !Array.isArray(payload.scalars));
  const regionsOk =
    payload.regions === undefined ||
    (typeof payload.regions === "object" && !Array.isArray(payload.regions));
  if (!samplesOk || !pointsOk || !scalarsOk || !regionsOk) {
    return undefined;
  }
  return payload;
}

/**
 * Score one structured graph response against the expected graph. Pure +
 * deterministic; never throws. `feature_results` carries a per-feature breakdown
 * for authoring diagnostics regardless of the overall verdict.
 */
export function scoreGraphResponse(
  expected: GraphExpected,
  response: unknown,
): GraphCheckResult {
  const invalidExpected = validateExpected(expected);
  if (invalidExpected) {
    return withVersion(invalidExpected, GRAPH_COMPARATOR_VERSION);
  }
  const payload = normalizeResponse(response);
  if (!payload) {
    return withVersion(invalid("invalid_graph_response"), GRAPH_COMPARATOR_VERSION);
  }

  const samples = (payload.samples ?? []).filter(isFinitePoint);
  const curveIssue = scoreCurve(expected, samples);

  const outcomes = expected.features.map((feature, index) => ({
    label: feature.label ?? `${feature.kind}:${index}`,
    ...scoreFeature(feature, payload),
  }));
  const featureResults: FeatureResult[] = outcomes.map(({ label, matched, reason }) => ({
    label,
    matched,
    reason,
  }));

  // A genuinely-unsupported sub-case (e.g. an unsupported region descriptor) is an
  // application fault, never a wrong answer (§12): fail closed as unsupported.
  const unsupportedOutcome = outcomes.find((outcome) => outcome.unsupported);
  if (unsupportedOutcome) {
    return {
      ...withVersion(
        unsupported(`graph_${unsupportedOutcome.reason}`),
        GRAPH_COMPARATOR_VERSION,
      ),
      feature_results: featureResults,
    };
  }

  if (curveIssue) {
    return {
      ...withVersion(curveIssue, GRAPH_COMPARATOR_VERSION),
      feature_results: featureResults,
    };
  }

  const firstMiss = featureResults.find((result) => !result.matched);
  const base = firstMiss ? incorrect(firstMiss.reason) : correct();
  return {
    ...withVersion(base, GRAPH_COMPARATOR_VERSION),
    feature_results: featureResults,
  };
}

export interface GraphComparatorOptions {
  checkerVersion?: number;
  itemVersions: readonly GraphItemVersion[];
}

export type GraphComparator = (input: GraphCheckInput) => GraphCheckResult;

/** Build a comparator keyed by immutable item-version id (mirrors the text checkers). */
export function createGraphComparator({
  checkerVersion = GRAPH_COMPARATOR_VERSION,
  itemVersions,
}: GraphComparatorOptions): GraphComparator {
  const items = new Map(itemVersions.map((item) => [item.item_version_id, item]));
  return (input: GraphCheckInput): GraphCheckResult => {
    if (input.equivalence_checker_version !== checkerVersion) {
      return withVersion(scoringError("checker_version_unsupported"), checkerVersion);
    }
    const item = items.get(input.item_version_id);
    if (!item) {
      return withVersion(scoringError("item_version_not_found"), checkerVersion);
    }
    return scoreGraphResponse(item.expected, input.response);
  };
}
