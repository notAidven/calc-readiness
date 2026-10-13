import type {
  GraphExpected,
  GraphItemVersion,
  GraphPoint,
  GraphResponsePayload,
} from "@cr/components";

/**
 * Authored GRAPH item slices for the wave-2 nodes the geometric comparator now
 * clears (Answer_Equivalence_Spec §8, `Graph_Comparator_Spike.md`): POL.5 (plot a
 * parabola: curve + vertex + intercepts), FUN.9 (graph a transformation), RAT.5
 * (rational asymptotes), and FUN.4 (read features off a graph + shade a region).
 *
 * These are the REFERENCE items that validate the brand-new graph infra, so they
 * are authored here (bulk product-standard authoring is Anthony's, but the graph
 * slices exercise Gabe's comparator + widget). They do NOT use the text
 * `AnswerSpec`/`ItemPackEntry` shape — a graph response is a structured numeric
 * payload scored by `createGraphComparator` (checker version 2), never the text
 * product checker. Each slice bundles the author-owned `expected` answer key with a
 * `valid` response, >=2 `alternate_valid` responses, and reason-coded `near_miss`
 * responses; `validateGraphPool` grades them all through the real comparator.
 */
export interface GraphAuthoredSlice {
  item_version_id: string;
  node_id: string;
  prompt: string;
  /** The author-owned answer key (reference curve, scored features, tolerances). */
  expected: GraphExpected;
  /** The canonical correct response; must grade `correct`. */
  valid: GraphResponsePayload;
  /** Equivalent correct responses (within tolerance / reordered); must grade `correct`. */
  alternate_valid: readonly GraphResponsePayload[];
  /** Plausible wrong responses; must grade NOT-correct with the noted reason code. */
  near_miss: readonly { response: GraphResponsePayload; reason: string }[];
}

/** Sample a curve on the SAME even grid the comparator derives (non-finite dropped). */
function sampleFunction(
  fn: (x: number) => number,
  lo: number,
  hi: number,
  count: number,
): GraphPoint[] {
  const step = (hi - lo) / (count - 1);
  const points: GraphPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = lo + index * step;
    const y = fn(x);
    if (Number.isFinite(y)) {
      points.push({ x, y });
    }
  }
  return points;
}

// --- POL.5 — plot y = (x - 2)^2 - 1: curve + vertex + both x-intercepts + y-int ---
const pol5Fn = (x: number): number => (x - 2) ** 2 - 1;
const POL5_DOMAIN: readonly [number, number] = [-1, 5];
const POL5_SAMPLES = 13;
const pol5Points: GraphPoint[] = [
  { x: 2, y: -1 }, // vertex
  { x: 1, y: 0 }, // left x-intercept
  { x: 3, y: 0 }, // right x-intercept
  { x: 0, y: 3 }, // y-intercept
];
const pol5: GraphAuthoredSlice = {
  item_version_id: "graph.pol-5.parabola.v2",
  node_id: "POL.5",
  prompt:
    "Plot y = (x - 2)^2 - 1 over -1 <= x <= 5. Draw the parabola, then mark its vertex, both x-intercepts, and the y-intercept.",
  expected: {
    domain: POL5_DOMAIN,
    sampleCount: POL5_SAMPLES,
    curve: { kind: "function", expression: "(x - 2)^2 - 1" },
    curveTolerance: 0.25,
    features: [
      { kind: "vertex", point: { x: 2, y: -1 }, tolerance: 0.3, label: "vertex" },
      { kind: "x_intercept", point: { x: 1, y: 0 }, tolerance: 0.3, label: "root_left" },
      { kind: "x_intercept", point: { x: 3, y: 0 }, tolerance: 0.3, label: "root_right" },
      { kind: "y_intercept", point: { x: 0, y: 3 }, tolerance: 0.3, label: "y_intercept" },
    ],
  },
  valid: {
    samples: sampleFunction(pol5Fn, POL5_DOMAIN[0], POL5_DOMAIN[1], POL5_SAMPLES),
    points: pol5Points,
  },
  alternate_valid: [
    // A curve rendered slightly high but within the 0.25 tolerance; exact features.
    {
      samples: sampleFunction(
        (x) => pol5Fn(x) + 0.1,
        POL5_DOMAIN[0],
        POL5_DOMAIN[1],
        POL5_SAMPLES,
      ),
      points: pol5Points,
    },
    // Exact curve; the four feature points marked in a different order (order-free).
    {
      samples: sampleFunction(pol5Fn, POL5_DOMAIN[0], POL5_DOMAIN[1], POL5_SAMPLES),
      points: [
        { x: 0, y: 3 },
        { x: 3, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: -1 },
      ],
    },
  ],
  near_miss: [
    // Curve shifted up 0.5 (past tolerance); features fine -> the curve phase fails.
    {
      response: {
        samples: sampleFunction(
          (x) => pol5Fn(x) + 0.5,
          POL5_DOMAIN[0],
          POL5_DOMAIN[1],
          POL5_SAMPLES,
        ),
        points: pol5Points,
      },
      reason: "curve_mismatch",
    },
    // Curve exact; vertex marked with a sign slip on k (2, 1) instead of (2, -1).
    {
      response: {
        samples: sampleFunction(pol5Fn, POL5_DOMAIN[0], POL5_DOMAIN[1], POL5_SAMPLES),
        points: [
          { x: 2, y: 1 },
          { x: 1, y: 0 },
          { x: 3, y: 0 },
          { x: 0, y: 3 },
        ],
      },
      reason: "vertex_mismatch",
    },
    // Curve exact; right root read at x = 4 instead of x = 3.
    {
      response: {
        samples: sampleFunction(pol5Fn, POL5_DOMAIN[0], POL5_DOMAIN[1], POL5_SAMPLES),
        points: [
          { x: 2, y: -1 },
          { x: 1, y: 0 },
          { x: 4, y: 0 },
          { x: 0, y: 3 },
        ],
      },
      reason: "x_intercept_mismatch",
    },
    // The curve stops at x = 2, never covering the declared domain.
    {
      response: {
        samples: sampleFunction(pol5Fn, -1, 2, 7),
        points: pol5Points,
      },
      reason: "curve_incomplete",
    },
  ],
};

// --- FUN.9 — graph the transformation g(x) = (x + 3)^2 - 2: curve + vertex + y-int ---
const fun9Fn = (x: number): number => (x + 3) ** 2 - 2;
const FUN9_DOMAIN: readonly [number, number] = [-6, 0];
const FUN9_SAMPLES = 13;
const fun9Points: GraphPoint[] = [
  { x: -3, y: -2 }, // translated vertex
  { x: 0, y: 7 }, // y-intercept g(0) = 9 - 2
];
const fun9: GraphAuthoredSlice = {
  item_version_id: "graph.fun-9.transform.v2",
  node_id: "FUN.9",
  prompt:
    "The parent function is f(x) = x^2. Graph g(x) = (x + 3)^2 - 2 over -6 <= x <= 0 (a shift left 3, down 2), then mark the transformed vertex and the y-intercept.",
  expected: {
    domain: FUN9_DOMAIN,
    sampleCount: FUN9_SAMPLES,
    curve: { kind: "function", expression: "(x + 3)^2 - 2" },
    curveTolerance: 0.25,
    features: [
      { kind: "vertex", point: { x: -3, y: -2 }, tolerance: 0.3, label: "vertex" },
      { kind: "y_intercept", point: { x: 0, y: 7 }, tolerance: 0.3, label: "y_intercept" },
    ],
  },
  valid: {
    samples: sampleFunction(fun9Fn, FUN9_DOMAIN[0], FUN9_DOMAIN[1], FUN9_SAMPLES),
    points: fun9Points,
  },
  alternate_valid: [
    {
      samples: sampleFunction(
        (x) => fun9Fn(x) - 0.12,
        FUN9_DOMAIN[0],
        FUN9_DOMAIN[1],
        FUN9_SAMPLES,
      ),
      points: fun9Points,
    },
    {
      samples: sampleFunction(fun9Fn, FUN9_DOMAIN[0], FUN9_DOMAIN[1], FUN9_SAMPLES),
      points: [
        { x: 0, y: 7 },
        { x: -3, y: -2 },
      ],
    },
  ],
  near_miss: [
    // Shifted RIGHT instead of left: g(x) = (x - 3)^2 - 2. Curve phase fails.
    {
      response: {
        samples: sampleFunction(
          (x) => (x - 3) ** 2 - 2,
          FUN9_DOMAIN[0],
          FUN9_DOMAIN[1],
          FUN9_SAMPLES,
        ),
        points: fun9Points,
      },
      reason: "curve_mismatch",
    },
    // Curve exact; vertex read with the wrong horizontal-shift sign (3, -2).
    {
      response: {
        samples: sampleFunction(fun9Fn, FUN9_DOMAIN[0], FUN9_DOMAIN[1], FUN9_SAMPLES),
        points: [
          { x: 3, y: -2 },
          { x: 0, y: 7 },
        ],
      },
      reason: "vertex_mismatch",
    },
    // Curve exact; vertex fine; y-intercept read at (0, 9) (forgot the down-2 shift).
    {
      response: {
        samples: sampleFunction(fun9Fn, FUN9_DOMAIN[0], FUN9_DOMAIN[1], FUN9_SAMPLES),
        points: [
          { x: -3, y: -2 },
          { x: 0, y: 9 },
        ],
      },
      reason: "y_intercept_mismatch",
    },
  ],
};

// --- RAT.5 — graph y = 1/(x + 1) + 2: curve across the asymptote + VA + HA ---
const rat5Fn = (x: number): number => 1 / (x + 1) + 2;
const RAT5_DOMAIN: readonly [number, number] = [-5, 3];
const RAT5_SAMPLES = 17;
const rat5: GraphAuthoredSlice = {
  item_version_id: "graph.rat-5.asymptotes.v2",
  node_id: "RAT.5",
  prompt:
    "Graph y = 1/(x + 1) + 2 over -5 <= x <= 3. Sketch the curve, then give the vertical and horizontal asymptotes.",
  expected: {
    domain: RAT5_DOMAIN,
    sampleCount: RAT5_SAMPLES,
    curve: { kind: "function", expression: "1/(x + 1) + 2" },
    curveTolerance: 0.2,
    excludedX: [-1],
    features: [
      { kind: "vertical_asymptote", value: -1, tolerance: 0.2, label: "VA" },
      { kind: "horizontal_asymptote", value: 2, tolerance: 0.2, label: "HA" },
    ],
  },
  valid: {
    samples: sampleFunction(rat5Fn, RAT5_DOMAIN[0], RAT5_DOMAIN[1], RAT5_SAMPLES),
    scalars: { vertical_asymptote: -1, horizontal_asymptote: 2 },
  },
  alternate_valid: [
    {
      samples: sampleFunction(
        (x) => rat5Fn(x) + 0.1,
        RAT5_DOMAIN[0],
        RAT5_DOMAIN[1],
        RAT5_SAMPLES,
      ),
      scalars: { vertical_asymptote: -1, horizontal_asymptote: 2 },
    },
    {
      samples: sampleFunction(
        (x) => rat5Fn(x) - 0.12,
        RAT5_DOMAIN[0],
        RAT5_DOMAIN[1],
        RAT5_SAMPLES,
      ),
      scalars: { vertical_asymptote: -1, horizontal_asymptote: 2 },
    },
  ],
  near_miss: [
    // Vertical asymptote read at x = 1 (sign slip on the shift) instead of x = -1.
    {
      response: {
        samples: sampleFunction(rat5Fn, RAT5_DOMAIN[0], RAT5_DOMAIN[1], RAT5_SAMPLES),
        scalars: { vertical_asymptote: 1, horizontal_asymptote: 2 },
      },
      reason: "vertical_asymptote_mismatch",
    },
    // Horizontal asymptote never given (only the vertical one).
    {
      response: {
        samples: sampleFunction(rat5Fn, RAT5_DOMAIN[0], RAT5_DOMAIN[1], RAT5_SAMPLES),
        scalars: { vertical_asymptote: -1 },
      },
      reason: "horizontal_asymptote_missing",
    },
    // Curve shifted up 1 (forgot the +2 became +3); asymptotes given right.
    {
      response: {
        samples: sampleFunction(
          (x) => 1 / (x + 1) + 3,
          RAT5_DOMAIN[0],
          RAT5_DOMAIN[1],
          RAT5_SAMPLES,
        ),
        scalars: { vertical_asymptote: -1, horizontal_asymptote: 2 },
      },
      reason: "curve_mismatch",
    },
  ],
};

// --- FUN.4 — read features off the graph of f(x) = (x - 1)^2 - 4 + shade f(x) >= 0 ---
// The graph is GIVEN (no curve to draw): the student reads the vertex and both
// x-intercepts and shades where f(x) >= 0 (x <= -1 or x >= 3), a sign region scored
// by boolean membership at author-declared probes.
const FUN4_NONNEG_PROBES: readonly { x: number; y: number; inside: boolean }[] = [
  { x: -3, y: 2, inside: true }, // f(-3) = 12 >= 0
  { x: 0, y: 1, inside: false }, // f(0) = -3 < 0
  { x: 4, y: 0, inside: true }, // f(4) = 5 >= 0
  { x: 1, y: 3, inside: false }, // f(1) = -4 < 0
];
const fun4Points: GraphPoint[] = [
  { x: 1, y: -4 }, // vertex (minimum)
  { x: -1, y: 0 }, // left x-intercept
  { x: 3, y: 0 }, // right x-intercept
];
const fun4: GraphAuthoredSlice = {
  item_version_id: "graph.fun-4.read-features.v2",
  node_id: "FUN.4",
  prompt:
    "The graph of f(x) = (x - 1)^2 - 4 is shown. Mark the vertex and both x-intercepts, then shade the region where f(x) >= 0.",
  expected: {
    domain: [-5, 5],
    features: [
      { kind: "vertex", point: { x: 1, y: -4 }, tolerance: 0.4, label: "vertex" },
      { kind: "x_intercept", point: { x: -1, y: 0 }, tolerance: 0.4, label: "root_left" },
      { kind: "x_intercept", point: { x: 3, y: 0 }, tolerance: 0.4, label: "root_right" },
      {
        kind: "region",
        tolerance: 0,
        label: "nonneg",
        region: { probes: FUN4_NONNEG_PROBES },
      },
    ],
  },
  valid: {
    points: fun4Points,
    regions: { nonneg: FUN4_NONNEG_PROBES },
  },
  alternate_valid: [
    // Feature points marked in a different order; region correct.
    {
      points: [
        { x: 3, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: -4 },
      ],
      regions: { nonneg: FUN4_NONNEG_PROBES },
    },
    // Region probe memberships reported in a different order (matched by coordinate).
    {
      points: fun4Points,
      regions: {
        nonneg: [
          { x: 4, y: 0, inside: true },
          { x: 1, y: 3, inside: false },
          { x: -3, y: 2, inside: true },
          { x: 0, y: 1, inside: false },
        ],
      },
    },
  ],
  near_miss: [
    // Vertex read one unit high (1, -3); region fine.
    {
      response: {
        points: [
          { x: 1, y: -3 },
          { x: -1, y: 0 },
          { x: 3, y: 0 },
        ],
        regions: { nonneg: FUN4_NONNEG_PROBES },
      },
      reason: "vertex_mismatch",
    },
    // Features fine; shading flips one probe (marks (0,1) as inside the f>=0 region).
    {
      response: {
        points: fun4Points,
        regions: {
          nonneg: [
            { x: -3, y: 2, inside: true },
            { x: 0, y: 1, inside: true }, // wrong: f(0) = -3 < 0
            { x: 4, y: 0, inside: true },
            { x: 1, y: 3, inside: false },
          ],
        },
      },
      reason: "region_mismatch",
    },
    // Features fine; the region is never shaded (unanswered).
    {
      response: { points: fun4Points, regions: {} },
      reason: "region_missing",
    },
  ],
};

export const GRAPH_ITEM_SLICES: readonly GraphAuthoredSlice[] = [pol5, fun9, rat5, fun4];

/** The wave-2 nodes whose GRAPH slice is authored + validated here. */
export const GRAPH_SLICE_NODES: readonly string[] = ["POL.5", "FUN.4", "FUN.9", "RAT.5"];

/** Project the authored slices to the comparator's item-version shape (id/node/expected). */
export function toGraphItemVersions(
  slices: readonly GraphAuthoredSlice[] = GRAPH_ITEM_SLICES,
): GraphItemVersion[] {
  return slices.map(({ item_version_id, node_id, expected }) => ({
    item_version_id,
    node_id,
    expected,
  }));
}
