# Graph Comparator Spike (scored-SVG response + Section 8 geometric comparator)

*Status: IMPLEMENTED (v0.13, 2026-07-23; was SPIKE). Owner: Gabe (with the graphing
widget). Companion to Answer_Equivalence_Spec Section 8 and CI invariant Section
13.15. The geometric comparator, region/shading membership, the interactive
scored-SVG widget, and the false-positive tolerance battery are all landed and the
graph category is CLEARED (Section 4 records what was the follow-up plan, now done;
Section 6 lists what stays out of scope). No em dashes; no runtime LLM.*

---

## 0. Why this is separate from the text checker

Answer_Equivalence_Spec Section 8 keeps graph scoring in its OWN comparator, not
the text answer-checker: the failure modes are geometric (a visually-close-but-
wrong curve is a false-positive risk; a correct curve with too tight a tolerance
is a false-negative risk), so it is isolated and gated by its own golden set. The
text checker (`product-answer-checker.ts`) intentionally returns
`unsupported_expression` / `graph_uses_geometric_comparator` for a `graph`
answer_type. This module is that separate comparator.

It unblocks the GRAPH slices of the wave-2 nodes: POL.5 (plot a parabola:
vertex + intercepts), FUN.4 (read features off a graph), FUN.9 (transformations),
and RAT.5 (rational-function domain / asymptotes). The ALGEBRAIC slices of those
same nodes are cleared separately in the v2 text checker (vertex form,
set-builder, log identities) so authoring is not fully blocked on this spike.

## 1. The scored-SVG response representation

The widget renders to SVG for the human, but SUBMITS a structured, numeric
payload in GRAPH coordinates (never a bitmap, per Section 8). The comparator only
ever reads this structured payload, so cosmetic aspects (color, gridline style,
stroke) are un-scorable by construction.

```ts
interface GraphPoint { x: number; y: number; }

interface GraphResponsePayload {
  // The student curve, sampled by the widget at the item's declared sample x's
  // (or densely; the comparator interpolates). Omitted for "mark the features"
  // items where no full curve is drawn.
  samples?: readonly GraphPoint[];
  // Discrete points the student placed (intercepts, vertex, hole markers).
  points?: readonly GraphPoint[];
  // Scalar features the student set (asymptote position, period, amplitude).
  scalars?: Partial<Record<GraphFeatureKind, number>>;
}
```

The expected graph (author-owned answer key) declares the reference curve, the
scored features, and per-item tolerances. There is NO implicit tolerance (Section
6): a graph item with no declared scored features is an authoring reject.

```ts
interface GraphExpected {
  domain: readonly [number, number];
  sampleCount?: number;           // default sample density for the curve match
  samplePoints?: readonly number[]; // explicit sample x's (overrides sampleCount)
  curve?: GraphCurve;             // optional reference curve (sampled-point match)
  curveTolerance?: number;        // REQUIRED when curve is present (absolute y)
  excludedX?: readonly number[];  // asymptote/hole x's skipped in the curve match
  features: readonly ScoredFeature[]; // >= 1 REQUIRED (Section 8 authoring gate)
}

type GraphCurve =
  | { kind: "function"; expression: string; symbol?: string } // e.g. "2*(x-1)^2-3"
  | { kind: "polyline"; points: readonly GraphPoint[] };

type GraphFeatureKind =
  | "point" | "x_intercept" | "y_intercept" | "vertex" | "hole"
  | "vertical_asymptote" | "horizontal_asymptote"
  | "period" | "amplitude" | "region";

interface ScoredFeature {
  kind: GraphFeatureKind;
  point?: GraphPoint;  // point-like features carry a point
  value?: number;      // scalar features carry a value (asymptote/period/amplitude)
  tolerance: number;   // per-feature tolerance (Section 8: each its own tolerance)
  label?: string;      // stable id for authoring diagnostics
}
```

## 2. The comparator algorithm

`scoreGraphResponse(expected, response) -> GraphCheckResult` runs three phases and
returns the first failure (fail-closed); a malformed response is `invalid_input`
(unanswered), never `incorrect` (Section 12). It is pure and deterministic, so
Node and the browser produce identical verdicts (Section 13.15).

1. **Authoring validity.** `features.length >= 1`, a finite `domain`, and a
   `curveTolerance` whenever a `curve` is present, else `scoring_error`
   (`no_scored_features` / `missing_curve_tolerance`). This encodes the Section 8
   authoring gate in the comparator itself.
2. **Sampled-point curve match** (only when a `curve` is declared). Take the
   sample x's (`samplePoints`, else `sampleCount` points evenly across `domain`),
   drop any within `excludedX` (asymptotes/holes) and any where the reference is
   undefined/non-finite. For each remaining x, the expected y is the reference
   value and the student y is linearly interpolated from `response.samples`; if
   the student never covered that x the verdict is `curve_incomplete`, and if
   `|ey - sy| > curveTolerance` it is `curve_mismatch`. This is the Section 8
   "sampled-point match within tolerance over the declared domain".
3. **Scored-feature match.** For each declared feature: point-like kinds match the
   NEAREST student point within `tolerance` (Euclidean); scalar kinds match
   `response.scalars[kind]` within `tolerance`. A miss returns `<kind>_mismatch`.
   `region` is a typed stub in this spike (returns `unsupported_expression`; see
   Section 4).

`correct` requires the curve (if any) AND every feature to match. Every phase
records a per-feature `feature_results` breakdown for authoring diagnostics.

## 3. What the first cut covers (tests-backed)

Implemented + covered by `graph-comparator-fixtures.ts` (Node + Chromium parity):

- Curve match against a `function` reference (POL.5 parabola) and a `polyline`
  reference, with `curveTolerance`, `excludedX`, `curve_incomplete` vs
  `curve_mismatch`.
- Point features: `vertex`, `x_intercept`, `y_intercept`, `hole` with per-feature
  tolerance and nearest-point matching (FUN.4 read-features, POL.5 markers).
- Scalar features: `vertical_asymptote`, `horizontal_asymptote` (RAT.5),
  `period`, `amplitude` (forward-looking TRG.5).
- Fail-closed behavior: malformed payloads are `invalid_input`; a graph item with
  no scored features is `scoring_error`; a missing `curveTolerance` is
  `scoring_error`.

This is a solid, deterministic geometric core with a golden set, exactly the
"tests-backed prototype" Section 8 asks for before graph authoring opens.

## 4. The follow-up plan — now IMPLEMENTED (v0.13)

The spike left these as typed stubs; they are now built and covered by tests.

- **Region / shading scoring** (`region` feature) — DONE. The `region` feature
  declares author ground-truth `{point, inside}` probe memberships; the widget
  reports the student's inside/outside call at the SAME probe coordinates; the
  comparator checks boolean agreement at every probe (no tolerance). Reason codes:
  `region_mismatch`, `region_missing`, `region_incomplete`. Covers linear-inequality
  (half-plane) shading and rational/polynomial sign regions. A `region` with no
  probes / no label is an unsupported descriptor and fails closed (`region_no_probes`
  / `region_missing_label` / `region_invalid_probe`, all authoring rejects).
- **The interactive scored-SVG widget** — DONE (`GraphInput`, `graph-input.tsx`).
  It emits `GraphResponsePayload` by resampling the plotted curve at the declared
  sample x's (`sampleSmoothCurve`) and capturing placed points, scalar values, and
  region toggles. It receives an ANSWER-FREE workspace (`toGraphWorkspace` strips
  the reference curve, feature coordinates, and region truth), is keyboard
  accessible, and is wired into the diagnostic answer/check flow
  (`apps/web/src/diagnostic/GraphProbe.tsx`, reached with `?graph`) over the same
  injected-checker seam `MathInput` uses. The pre-spike `GraphWidget` stub in
  `index.ts` (frozen `Contracts.md` shape) is left untouched.
- **False-positive tolerance battery** — DONE (`graph-comparator.falsepos.test.ts`,
  Node + Chromium): slightly-off curves, wrong/missing features, wrong regions, and
  just-past-tolerance near-misses are all rejected with the correct reason codes.
- **Curve match beyond a single-valued function of x** (implicit curves, closed
  shapes) — still out of MVP scope; revisit only if an item demands it.

## 5. CI + gating

- Golden set runs in Node and Chromium (invariant Section 13.15: scored-feature
  match and cosmetic-ignore in both runtimes). `cosmetic-ignore` is satisfied
  structurally: the payload has no cosmetic fields.
- This module is version 2 (same generation as the product text checker) and is
  never used to rescore a v1 response.
- Follow-up before graph AUTHORING opens: DONE (v0.13). Region membership + the
  widget are implemented, the golden set is extended with the false-positive battery
  (visually-close-but-wrong curves) called out in Section 8, and the graph category
  is marked CLEARED in Answer_Equivalence_Spec (v0.13). The authored reference
  slices (POL.5 / FUN.4 / FUN.9 / RAT.5) live in `packages/item-bank/src/graph/`,
  validated by `validateGraphPool`.

## 6. What stays out of scope (fail-closed)

The comparator fails closed (never a silent pass) on: a curve that is not a
single-valued function of x (implicit curves, closed shapes); oblique/slant
asymptotes as a scored feature; a `region` feature declared without probes; and any
bitmap/pixel scoring (the payload carries no pixels by construction).
