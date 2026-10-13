import {
  type GraphExpected,
  type GraphFeatureKind,
  graphSampleXs,
} from "./graph-comparator";
import type { GraphPoint } from "./index";

/**
 * The answer-free bridge between an item's expected answer and the graphing widget
 * (`graph-input.tsx`). Pure + JSX-free so it is unit-testable in Node. A
 * {@link GraphWorkspace} describes WHAT to elicit (domain, sample grid, which
 * features to place / set / shade) with every ANSWER value stripped — no reference
 * curve, no feature coordinates, no region membership truth — exactly what a server
 * can hand a client while keeping the answer key server-side.
 */

const POINT_KINDS: ReadonlySet<GraphFeatureKind> = new Set([
  "point",
  "x_intercept",
  "y_intercept",
  "vertex",
  "hole",
]);
const SCALAR_KINDS: ReadonlySet<GraphFeatureKind> = new Set([
  "vertical_asymptote",
  "horizontal_asymptote",
  "period",
  "amplitude",
]);

export const READABLE_KIND: Record<GraphFeatureKind, string> = {
  point: "point",
  x_intercept: "x-intercept",
  y_intercept: "y-intercept",
  vertex: "vertex",
  hole: "hole",
  vertical_asymptote: "vertical asymptote (x =)",
  horizontal_asymptote: "horizontal asymptote (y =)",
  period: "period",
  amplitude: "amplitude",
  region: "region",
};

/** An answer-free description of what a graph item elicits (no answer values). */
export interface GraphWorkspace {
  domain: readonly [number, number];
  /** The visible y-window (cosmetic; scored quantities may lie outside it). */
  range: readonly [number, number];
  /** The x's the comparator scores the curve at (the widget resamples here). */
  sampleXs: readonly number[];
  /** Whether the item asks the student to plot a curve. */
  curve: boolean;
  points: readonly { label: string; kind: GraphFeatureKind }[];
  scalars: readonly { label: string; kind: GraphFeatureKind }[];
  /** Region probes carry coordinates only; the inside/outside truth is withheld. */
  regions: readonly { label: string; probes: readonly GraphPoint[] }[];
}

/**
 * Build the answer-free workspace from an item's expected answer. This is what a
 * server hands a client: the domain + sample grid + which features to elicit, with
 * every ANSWER value stripped (no reference curve, no feature coordinates, no
 * region membership truth — only the probe coordinates the student must classify).
 */
export function toGraphWorkspace(expected: GraphExpected): GraphWorkspace {
  const points: { label: string; kind: GraphFeatureKind }[] = [];
  const scalars: { label: string; kind: GraphFeatureKind }[] = [];
  const regions: { label: string; probes: readonly GraphPoint[] }[] = [];
  expected.features.forEach((feature, index) => {
    const label = feature.label ?? `${feature.kind}:${index}`;
    if (feature.kind === "region") {
      regions.push({
        label,
        // Coordinates only: the `inside` truth is intentionally dropped.
        probes: (feature.region?.probes ?? []).map((probe) => ({ x: probe.x, y: probe.y })),
      });
    } else if (SCALAR_KINDS.has(feature.kind)) {
      scalars.push({ label, kind: feature.kind });
    } else if (POINT_KINDS.has(feature.kind)) {
      points.push({ label, kind: feature.kind });
    }
  });
  const [lo, hi] = expected.domain;
  const half = Math.min(20, Math.max(8, Math.ceil((hi - lo) * 1.5)));
  return {
    domain: expected.domain,
    range: [-half, half],
    sampleXs: graphSampleXs(expected),
    curve: !!expected.curve,
    points,
    scalars,
    regions,
  };
}

/** Up to 7 evenly spaced control x's across the domain (for the curve plotter). */
export function seedControlXs(workspace: GraphWorkspace): number[] {
  const [lo, hi] = workspace.domain;
  const count = Math.min(7, Math.max(3, workspace.sampleXs.length));
  const step = (hi - lo) / (count - 1);
  return Array.from({ length: count }, (_unused, index) =>
    Number((lo + index * step).toFixed(4)),
  );
}

/**
 * Smoothly resample a set of student control points at the requested x's using
 * piecewise cubic Hermite interpolation (Catmull-Rom tangents). Only x's inside
 * the control-point span are emitted, so a curve that does not cover the domain is
 * left incomplete (and the comparator flags `curve_incomplete`). Pure + deterministic.
 */
export function sampleSmoothCurve(
  controlPoints: readonly GraphPoint[],
  xs: readonly number[],
): GraphPoint[] {
  const pts = controlPoints
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .sort((a, b) => a.x - b.x)
    .filter((p, i, arr) => i === 0 || Math.abs(p.x - (arr[i - 1]?.x ?? p.x)) > 1e-9);
  const n = pts.length;
  if (n === 0) {
    return [];
  }
  if (n === 1) {
    const only = pts[0] as GraphPoint;
    return xs.filter((x) => Math.abs(x - only.x) < 1e-9).map((x) => ({ x, y: only.y }));
  }
  // Catmull-Rom tangent at each node (endpoints one-sided).
  const tangents = pts.map((_p, i) => {
    const prev = pts[Math.max(0, i - 1)] as GraphPoint;
    const next = pts[Math.min(n - 1, i + 1)] as GraphPoint;
    return (next.y - prev.y) / (next.x - prev.x || 1);
  });
  const first = pts[0] as GraphPoint;
  const last = pts[n - 1] as GraphPoint;
  const out: GraphPoint[] = [];
  for (const x of xs) {
    if (x < first.x - 1e-9 || x > last.x + 1e-9) {
      continue; // outside the plotted span: leave it uncovered.
    }
    let i = 0;
    while (i < n - 1 && x > (pts[i + 1] as GraphPoint).x) {
      i += 1;
    }
    const a = pts[i] as GraphPoint;
    const b = pts[Math.min(n - 1, i + 1)] as GraphPoint;
    const h = b.x - a.x || 1;
    const t = (x - a.x) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    const y =
      h00 * a.y +
      h10 * h * (tangents[i] as number) +
      h01 * b.y +
      h11 * h * (tangents[Math.min(n - 1, i + 1)] as number);
    out.push({ x, y });
  }
  return out;
}
