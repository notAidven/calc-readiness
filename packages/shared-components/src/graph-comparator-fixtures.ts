import type {
  GraphExpected,
  GraphItemVersion,
  GraphResponsePayload,
} from "./graph-comparator";
import type { AnswerStatus, GraphPoint } from "./index";

/**
 * Golden set for the Section 8 geometric graph comparator (SPIKE). Each item
 * carries a valid response, at least one alternate-valid response, and near-miss
 * responses per scored feature / curve. The same suite runs in Node and Chromium
 * (`graph-comparator.browser.test.ts`) to prove cross-runtime parity
 * (Answer_Equivalence_Spec Section 13.15). See `docs/Graph_Comparator_Spike.md`.
 */

/** Sample a JS curve on the SAME even grid the comparator derives from the item. */
function sampleCurve(
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

const parabola = (x: number): number => (x - 1) ** 2 - 4; // vertex (1,-4)
const rational = (x: number): number => 1 / (x - 2); // VA x=2, HA y=0
const line = (x: number): number => 2 * x + 1;

const PARABOLA_DOMAIN: readonly [number, number] = [-3, 5];
const PARABOLA_SAMPLES = 17;
const RATIONAL_DOMAIN: readonly [number, number] = [-3, 7];
const RATIONAL_SAMPLES = 21;
const LINE_DOMAIN: readonly [number, number] = [-2, 3];
const LINE_SAMPLES = 6;

/** Ground truth for the half-plane y > 2x + 1 (2 inside, 2 outside, no boundary). */
const REGION_ABOVE_LINE_PROBES: readonly { x: number; y: number; inside: boolean }[] = [
  { x: 0, y: 5, inside: true }, // 5 > 1
  { x: -2, y: 5, inside: true }, // 5 > -3
  { x: 0, y: -5, inside: false }, // -5 > 1 is false
  { x: 2, y: 0, inside: false }, // 0 > 5 is false
];

const parabolaExpected: GraphExpected = {
  domain: PARABOLA_DOMAIN,
  sampleCount: PARABOLA_SAMPLES,
  curve: { kind: "function", expression: "(x - 1)^2 - 4" },
  curveTolerance: 0.25,
  features: [
    { kind: "vertex", point: { x: 1, y: -4 }, tolerance: 0.3, label: "vertex" },
    { kind: "x_intercept", point: { x: -1, y: 0 }, tolerance: 0.3, label: "root_left" },
    { kind: "x_intercept", point: { x: 3, y: 0 }, tolerance: 0.3, label: "root_right" },
    { kind: "y_intercept", point: { x: 0, y: -3 }, tolerance: 0.3, label: "y_intercept" },
  ],
};

const rationalExpected: GraphExpected = {
  domain: RATIONAL_DOMAIN,
  sampleCount: RATIONAL_SAMPLES,
  curve: { kind: "function", expression: "1 / (x - 2)" },
  curveTolerance: 0.15,
  excludedX: [2],
  features: [
    { kind: "vertical_asymptote", value: 2, tolerance: 0.2, label: "VA" },
    { kind: "horizontal_asymptote", value: 0, tolerance: 0.2, label: "HA" },
  ],
};

const lineExpected: GraphExpected = {
  domain: LINE_DOMAIN,
  samplePoints: [-2, -1, 0, 1, 2, 3],
  curve: {
    kind: "polyline",
    points: sampleCurve(line, LINE_DOMAIN[0], LINE_DOMAIN[1], LINE_SAMPLES),
  },
  curveTolerance: 0.2,
  features: [
    { kind: "y_intercept", point: { x: 0, y: 1 }, tolerance: 0.3, label: "y_intercept" },
  ],
};

const featuresOnlyExpected: GraphExpected = {
  domain: [-5, 5],
  features: [
    { kind: "vertex", point: { x: 2, y: 5 }, tolerance: 0.5, label: "maximum" },
    { kind: "x_intercept", point: { x: -1, y: 0 }, tolerance: 0.5, label: "root" },
  ],
};

export const GRAPH_SPIKE_ITEMS: readonly GraphItemVersion[] = [
  {
    item_version_id: "graph:pol-5:parabola:v2",
    node_id: "POL.5",
    expected: parabolaExpected,
  },
  {
    item_version_id: "graph:rat-5:asymptotes:v2",
    node_id: "RAT.5",
    expected: rationalExpected,
  },
  { item_version_id: "graph:fun-9:line:v2", node_id: "FUN.9", expected: lineExpected },
  {
    item_version_id: "graph:fun-4:features:v2",
    node_id: "FUN.4",
    expected: featuresOnlyExpected,
  },
  // authoring rejects (Section 8): no scored features / a curve with no tolerance.
  {
    item_version_id: "graph:invalid:noFeatures:v2",
    node_id: "POL.5",
    expected: { domain: [-3, 5], features: [] },
  },
  {
    item_version_id: "graph:invalid:noTolerance:v2",
    node_id: "POL.5",
    expected: {
      domain: [-3, 5],
      curve: { kind: "function", expression: "x^2" },
      features: [{ kind: "vertex", point: { x: 0, y: 0 }, tolerance: 0.3 }],
    },
  },
  // region / shading membership (now IMPLEMENTED): a half-plane y > 2x + 1, scored
  // by boolean agreement at author-declared ground-truth probes.
  {
    item_version_id: "graph:fun-4:region:v2",
    node_id: "FUN.4",
    expected: {
      domain: [-5, 5],
      features: [
        {
          kind: "region",
          tolerance: 0,
          label: "above_line",
          region: { probes: REGION_ABOVE_LINE_PROBES },
        },
      ],
    },
  },
  // a region declared with NO probes is an unsupported descriptor: authoring reject.
  {
    item_version_id: "graph:invalid:regionNoProbes:v2",
    node_id: "FUN.4",
    expected: {
      domain: [-5, 5],
      features: [{ kind: "region", tolerance: 0, label: "shaded" }],
    },
  },
];

const parabolaPoints: GraphPoint[] = [
  { x: 1, y: -4 },
  { x: -1, y: 0 },
  { x: 3, y: 0 },
  { x: 0, y: -3 },
];

export interface GraphGoldenCase {
  name: string;
  item_version_id: string;
  response: unknown;
  expected_status: AnswerStatus;
  expected_reason: string;
}

export const GRAPH_GOLDEN_CASES: readonly GraphGoldenCase[] = [
  // parabola (POL.5): curve + vertex + intercepts
  {
    name: "parabola accepts an exact curve with all features marked",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: sampleCurve(
        parabola,
        PARABOLA_DOMAIN[0],
        PARABOLA_DOMAIN[1],
        PARABOLA_SAMPLES,
      ),
      points: parabolaPoints,
    } satisfies GraphResponsePayload,
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "parabola accepts a curve within the declared tolerance",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: sampleCurve(
        (x) => parabola(x) + 0.1,
        PARABOLA_DOMAIN[0],
        PARABOLA_DOMAIN[1],
        PARABOLA_SAMPLES,
      ),
      points: parabolaPoints,
    } satisfies GraphResponsePayload,
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "parabola rejects a curve outside the tolerance (shifted up 1)",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: sampleCurve(
        (x) => parabola(x) + 1,
        PARABOLA_DOMAIN[0],
        PARABOLA_DOMAIN[1],
        PARABOLA_SAMPLES,
      ),
      points: parabolaPoints,
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "curve_mismatch",
  },
  {
    name: "parabola rejects a curve that does not cover the domain",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: sampleCurve(parabola, -3, 0, 7),
      points: parabolaPoints,
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "curve_incomplete",
  },
  {
    name: "parabola flags a mismarked vertex (curve fine)",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: sampleCurve(
        parabola,
        PARABOLA_DOMAIN[0],
        PARABOLA_DOMAIN[1],
        PARABOLA_SAMPLES,
      ),
      points: [
        { x: 1, y: -3 },
        { x: -1, y: 0 },
        { x: 3, y: 0 },
        { x: 0, y: -3 },
      ],
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "vertex_mismatch",
  },
  // rational (RAT.5): curve across an asymptote + scalar asymptote features
  {
    name: "rational accepts the curve plus both asymptotes",
    item_version_id: "graph:rat-5:asymptotes:v2",
    response: {
      samples: sampleCurve(
        rational,
        RATIONAL_DOMAIN[0],
        RATIONAL_DOMAIN[1],
        RATIONAL_SAMPLES,
      ),
      scalars: { vertical_asymptote: 2, horizontal_asymptote: 0 },
    } satisfies GraphResponsePayload,
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "rational flags a wrong vertical asymptote",
    item_version_id: "graph:rat-5:asymptotes:v2",
    response: {
      samples: sampleCurve(
        rational,
        RATIONAL_DOMAIN[0],
        RATIONAL_DOMAIN[1],
        RATIONAL_SAMPLES,
      ),
      scalars: { vertical_asymptote: 3, horizontal_asymptote: 0 },
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "vertical_asymptote_mismatch",
  },
  {
    name: "rational flags a missing horizontal asymptote",
    item_version_id: "graph:rat-5:asymptotes:v2",
    response: {
      samples: sampleCurve(
        rational,
        RATIONAL_DOMAIN[0],
        RATIONAL_DOMAIN[1],
        RATIONAL_SAMPLES,
      ),
      scalars: { vertical_asymptote: 2 },
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "horizontal_asymptote_missing",
  },
  // polyline reference curve (FUN.9)
  {
    name: "polyline-referenced line accepts a matching curve + intercept",
    item_version_id: "graph:fun-9:line:v2",
    response: {
      samples: sampleCurve(line, LINE_DOMAIN[0], LINE_DOMAIN[1], LINE_SAMPLES),
      points: [{ x: 0, y: 1 }],
    } satisfies GraphResponsePayload,
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "polyline-referenced line rejects the wrong line",
    item_version_id: "graph:fun-9:line:v2",
    response: {
      samples: sampleCurve(
        (x) => line(x) + 1,
        LINE_DOMAIN[0],
        LINE_DOMAIN[1],
        LINE_SAMPLES,
      ),
      points: [{ x: 0, y: 1 }],
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "curve_mismatch",
  },
  // features-only (FUN.4): read features off a supplied graph, no drawn curve
  {
    name: "features-only accepts the marked extremum + root",
    item_version_id: "graph:fun-4:features:v2",
    response: {
      points: [
        { x: 2, y: 5 },
        { x: -1, y: 0 },
      ],
    } satisfies GraphResponsePayload,
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "features-only flags a mislocated extremum",
    item_version_id: "graph:fun-4:features:v2",
    response: {
      points: [
        { x: 2, y: 3 },
        { x: -1, y: 0 },
      ],
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "vertex_mismatch",
  },
  {
    name: "features-only treats no points as unanswered feature (missing)",
    item_version_id: "graph:fun-4:features:v2",
    response: { points: [] } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "vertex_missing",
  },
  // fail-closed: authoring rejects + malformed input + region stub
  {
    name: "a graph item with no scored features is an authoring reject",
    item_version_id: "graph:invalid:noFeatures:v2",
    response: { points: [{ x: 0, y: 0 }] } satisfies GraphResponsePayload,
    expected_status: "scoring_error",
    expected_reason: "no_scored_features",
  },
  {
    name: "a curve with no declared tolerance is an authoring reject",
    item_version_id: "graph:invalid:noTolerance:v2",
    response: {
      samples: [{ x: 0, y: 0 }],
      points: [{ x: 0, y: 0 }],
    } satisfies GraphResponsePayload,
    expected_status: "scoring_error",
    expected_reason: "missing_curve_tolerance",
  },
  {
    name: "a malformed (non-object) response is unanswered, never wrong",
    item_version_id: "graph:pol-5:parabola:v2",
    response: "not a graph",
    expected_status: "invalid_input",
    expected_reason: "invalid_graph_response",
  },
  // region / shading membership (IMPLEMENTED): boolean agreement at the probes
  {
    name: "region accepts membership that agrees at every probe",
    item_version_id: "graph:fun-4:region:v2",
    response: {
      regions: { above_line: REGION_ABOVE_LINE_PROBES },
    } satisfies GraphResponsePayload,
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "region flags a membership that disagrees at a probe",
    item_version_id: "graph:fun-4:region:v2",
    response: {
      regions: {
        above_line: [
          { x: 0, y: 5, inside: false }, // wrong: (0,5) IS above the line
          { x: -2, y: 5, inside: true },
          { x: 0, y: -5, inside: false },
          { x: 2, y: 0, inside: false },
        ],
      },
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "region_mismatch",
  },
  {
    name: "region treats an unanswered region as missing (not wrong)",
    item_version_id: "graph:fun-4:region:v2",
    response: { regions: {} } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "region_missing",
  },
  {
    name: "region treats an unreported probe as incomplete",
    item_version_id: "graph:fun-4:region:v2",
    response: {
      regions: {
        above_line: [
          { x: 0, y: 5, inside: true },
          { x: -2, y: 5, inside: true },
          { x: 0, y: -5, inside: false },
          // (2, 0) probe omitted
        ],
      },
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "region_incomplete",
  },
  {
    name: "a region with no declared probes is an authoring reject",
    item_version_id: "graph:invalid:regionNoProbes:v2",
    response: {
      regions: { shaded: [{ x: 0, y: 0, inside: true }] },
    } satisfies GraphResponsePayload,
    expected_status: "scoring_error",
    expected_reason: "region_no_probes",
  },
];

/** A parabola response with all four key features marked correctly. */
function parabolaSamplesFrom(fn: (x: number) => number): GraphPoint[] {
  return sampleCurve(fn, PARABOLA_DOMAIN[0], PARABOLA_DOMAIN[1], PARABOLA_SAMPLES);
}

/**
 * The FALSE-POSITIVE tolerance battery (Answer_Equivalence_Spec §8, §13.15). Every
 * case feeds a WRONG graph — a slightly-off curve, a wrong or missing feature, a
 * wrong region, or a just-past-tolerance near-miss — and asserts the geometric
 * comparator REJECTS it with the correct reason code. The goal is to prove the
 * comparator does not accept an incorrect graph: NONE of these grade `correct`.
 * Runs in Node (`graph-comparator.falsepos.test.ts`) and Chromium for parity.
 */
export const GRAPH_FALSE_POSITIVE_CASES: readonly GraphGoldenCase[] = [
  // --- slightly-off curves: uniform shift, wrong scale, reflection, h-shift ---
  {
    name: "rejects a curve shifted just past the 0.25 tolerance (+0.26)",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: parabolaSamplesFrom((x) => parabola(x) + 0.26),
      points: parabolaPoints,
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "curve_mismatch",
  },
  {
    name: "rejects a too-narrow parabola (wrong leading coefficient)",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: parabolaSamplesFrom((x) => 1.5 * (x - 1) ** 2 - 4),
      points: parabolaPoints,
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "curve_mismatch",
  },
  {
    name: "rejects a downward-opening parabola (reflected)",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: parabolaSamplesFrom((x) => -((x - 1) ** 2) - 4),
      points: parabolaPoints,
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "curve_mismatch",
  },
  {
    name: "rejects a horizontally-shifted vertex (x - 2 instead of x - 1)",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: parabolaSamplesFrom((x) => (x - 2) ** 2 - 4),
      points: parabolaPoints,
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "curve_mismatch",
  },
  {
    name: "rejects a curve that stops short of the declared domain",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: sampleCurve(parabola, -3, 1, 9),
      points: parabolaPoints,
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "curve_incomplete",
  },
  // --- wrong / missing features (curve exact so the feature phase is reached) ---
  {
    name: "rejects a vertex marked just past its 0.3 tolerance (0.31 off)",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: parabolaSamplesFrom(parabola),
      points: [
        { x: 1, y: -4 + 0.31 },
        { x: -1, y: 0 },
        { x: 3, y: 0 },
        { x: 0, y: -3 },
      ],
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "vertex_mismatch",
  },
  {
    name: "rejects a mislocated x-intercept (root at 2 instead of 3)",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: parabolaSamplesFrom(parabola),
      points: [
        { x: 1, y: -4 },
        { x: -1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: -3 },
      ],
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "x_intercept_mismatch",
  },
  {
    name: "rejects a response that marks no features at all",
    item_version_id: "graph:pol-5:parabola:v2",
    response: {
      samples: parabolaSamplesFrom(parabola),
      points: [],
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "vertex_missing",
  },
  // --- wrong / missing scalar features (rational asymptotes) ---
  {
    name: "rejects a vertical asymptote just past its 0.2 tolerance",
    item_version_id: "graph:rat-5:asymptotes:v2",
    response: {
      samples: sampleCurve(
        rational,
        RATIONAL_DOMAIN[0],
        RATIONAL_DOMAIN[1],
        RATIONAL_SAMPLES,
      ),
      scalars: { vertical_asymptote: 2.25, horizontal_asymptote: 0 },
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "vertical_asymptote_mismatch",
  },
  {
    name: "rejects a rational curve shifted up 1 (wrong horizontal asymptote shape)",
    item_version_id: "graph:rat-5:asymptotes:v2",
    response: {
      samples: sampleCurve(
        (x) => rational(x) + 1,
        RATIONAL_DOMAIN[0],
        RATIONAL_DOMAIN[1],
        RATIONAL_SAMPLES,
      ),
      scalars: { vertical_asymptote: 2, horizontal_asymptote: 0 },
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "curve_mismatch",
  },
  {
    name: "rejects a missing horizontal asymptote",
    item_version_id: "graph:rat-5:asymptotes:v2",
    response: {
      samples: sampleCurve(
        rational,
        RATIONAL_DOMAIN[0],
        RATIONAL_DOMAIN[1],
        RATIONAL_SAMPLES,
      ),
      scalars: { vertical_asymptote: 2 },
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "horizontal_asymptote_missing",
  },
  // --- wrong / missing features on a features-only (read-off) item ---
  {
    name: "rejects a mislocated extremum on a features-only item",
    item_version_id: "graph:fun-4:features:v2",
    response: {
      points: [
        { x: 2, y: 6 },
        { x: -1, y: 0 },
      ],
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "vertex_mismatch",
  },
  {
    name: "rejects a mislocated root on a features-only item",
    item_version_id: "graph:fun-4:features:v2",
    response: {
      points: [
        { x: 2, y: 5 },
        { x: 1, y: 0 },
      ],
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "x_intercept_mismatch",
  },
  // --- wrong regions (shading membership) ---
  {
    name: "rejects a region with a flipped membership at one probe",
    item_version_id: "graph:fun-4:region:v2",
    response: {
      regions: {
        above_line: [
          { x: 0, y: 5, inside: true },
          { x: -2, y: 5, inside: true },
          { x: 0, y: -5, inside: false },
          { x: 2, y: 0, inside: true }, // wrong: (2,0) is BELOW the line
        ],
      },
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "region_mismatch",
  },
  {
    name: "rejects a region answered at the wrong probe coordinates",
    item_version_id: "graph:fun-4:region:v2",
    response: {
      regions: {
        above_line: [
          { x: 1, y: 1, inside: true },
          { x: -1, y: -1, inside: false },
        ],
      },
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "region_incomplete",
  },
  {
    name: "rejects an inverted region (every membership flipped)",
    item_version_id: "graph:fun-4:region:v2",
    response: {
      regions: {
        above_line: [
          { x: 0, y: 5, inside: false },
          { x: -2, y: 5, inside: false },
          { x: 0, y: -5, inside: true },
          { x: 2, y: 0, inside: true },
        ],
      },
    } satisfies GraphResponsePayload,
    expected_status: "incorrect",
    expected_reason: "region_mismatch",
  },
  // --- adversarial: malformed graph payload is unanswered, never wrong/correct ---
  {
    name: "treats a numeric payload as unanswered (invalid, not wrong)",
    item_version_id: "graph:pol-5:parabola:v2",
    response: 42,
    expected_status: "invalid_input",
    expected_reason: "invalid_graph_response",
  },
];
