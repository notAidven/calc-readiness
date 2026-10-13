import { describe, expect, it } from "vitest";

import type { GraphExpected } from "./graph-comparator";
import { sampleSmoothCurve, seedControlXs, toGraphWorkspace } from "./graph-workspace";

const parabolaExpected: GraphExpected = {
  domain: [-1, 5],
  sampleCount: 13,
  curve: { kind: "function", expression: "(x - 2)^2 - 1" },
  curveTolerance: 0.25,
  features: [
    { kind: "vertex", point: { x: 2, y: -1 }, tolerance: 0.3, label: "vertex" },
    { kind: "x_intercept", point: { x: 1, y: 0 }, tolerance: 0.3, label: "root_left" },
    { kind: "y_intercept", point: { x: 0, y: 3 }, tolerance: 0.3, label: "y_intercept" },
  ],
};

const regionExpected: GraphExpected = {
  domain: [-5, 5],
  features: [
    { kind: "vertex", point: { x: 1, y: -4 }, tolerance: 0.4, label: "vertex" },
    { kind: "vertical_asymptote", value: -1, tolerance: 0.2, label: "VA" },
    {
      kind: "region",
      tolerance: 0,
      label: "nonneg",
      region: {
        probes: [
          { x: -3, y: 2, inside: true },
          { x: 0, y: 1, inside: false },
        ],
      },
    },
  ],
};

describe("toGraphWorkspace (answer-free elicitation spec)", () => {
  it("splits features into points / scalars / regions and flags the curve", () => {
    const workspace = toGraphWorkspace(parabolaExpected);
    expect(workspace.curve).toBe(true);
    expect(workspace.points.map((p) => p.label)).toEqual([
      "vertex",
      "root_left",
      "y_intercept",
    ]);
    expect(workspace.scalars).toHaveLength(0);
    expect(workspace.regions).toHaveLength(0);
    expect(workspace.sampleXs).toHaveLength(13);
    expect(workspace.sampleXs[0]).toBe(-1);
    expect(workspace.sampleXs.at(-1)).toBe(5);
  });

  it("classifies scalar + region features and withholds every answer value", () => {
    const workspace = toGraphWorkspace(regionExpected);
    expect(workspace.curve).toBe(false);
    expect(workspace.points.map((p) => p.label)).toEqual(["vertex"]);
    expect(workspace.scalars.map((s) => s.kind)).toEqual(["vertical_asymptote"]);
    expect(workspace.regions).toHaveLength(1);
    const region = workspace.regions[0];
    expect(region?.label).toBe("nonneg");
    // Probe coordinates are exposed but the inside/outside TRUTH is stripped.
    expect(region?.probes).toEqual([
      { x: -3, y: 2 },
      { x: 0, y: 1 },
    ]);
    for (const probe of region?.probes ?? []) {
      expect("inside" in probe).toBe(false);
    }
  });

  it("does not leak feature coordinates into the point/scalar entries", () => {
    const workspace = toGraphWorkspace(parabolaExpected);
    for (const point of workspace.points) {
      expect(Object.keys(point).sort()).toEqual(["kind", "label"]);
    }
  });
});

describe("sampleSmoothCurve (student curve -> sampled points)", () => {
  const parabola = (x: number): number => (x - 2) ** 2 - 1;
  const sampleXs = Array.from({ length: 13 }, (_v, i) => -1 + i * 0.5);
  const control = [-1, 0, 1, 2, 3, 4, 5].map((x) => ({ x, y: parabola(x) }));

  it("reproduces a parabola within a plottable tolerance across the grid", () => {
    const samples = sampleSmoothCurve(control, sampleXs);
    expect(samples).toHaveLength(sampleXs.length);
    for (const sample of samples) {
      expect(Math.abs(sample.y - parabola(sample.x))).toBeLessThan(0.35);
    }
  });

  it("is near-exact on interior intervals (Catmull-Rom tangents are exact there)", () => {
    const samples = sampleSmoothCurve(control, [2.5]);
    expect(samples[0]?.y ?? Number.NaN).toBeCloseTo(parabola(2.5), 6);
  });

  it("emits nothing outside the control-point span (leaves the curve incomplete)", () => {
    const samples = sampleSmoothCurve(
      [
        { x: 0, y: 0 },
        { x: 2, y: 4 },
      ],
      [-1, 1, 3],
    );
    expect(samples.map((p) => p.x)).toEqual([1]);
  });

  it("returns no samples for an empty curve", () => {
    expect(sampleSmoothCurve([], sampleXs)).toEqual([]);
  });
});

describe("seedControlXs", () => {
  it("spans the domain endpoints with 3..7 control x's", () => {
    const xs = seedControlXs(toGraphWorkspace(parabolaExpected));
    expect(xs.length).toBeGreaterThanOrEqual(3);
    expect(xs.length).toBeLessThanOrEqual(7);
    expect(xs[0]).toBe(-1);
    expect(xs.at(-1)).toBe(5);
  });
});
