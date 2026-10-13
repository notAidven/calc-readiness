import { getNodesByScope, getProductNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  computeCoverage,
  computeCoverageMeasurement,
  coverageWeight,
  type NodeResolution,
  perDomainCoverage,
} from "./coverage";

const D1_IDS = getNodesByScope("mvp").map((node) => node.id);
const PRODUCT_IDS = getProductNodes().map((node) => node.id);

function passed(ids: readonly string[], source: "measured" | "inferred"): NodeResolution[] {
  return ids.map((node_id) => ({ node_id, status: "passed", source }));
}

describe("depth-weighted readiness coverage", () => {
  it("is 0 for an empty state and 1 when the whole scope is passed", () => {
    expect(computeCoverage([]).coverage).toBe(0);
    const full = computeCoverage(passed(PRODUCT_IDS, "measured"));
    expect(full.coverage).toBeCloseTo(1, 10);
    expect(full.coverage_measured).toBeCloseTo(1, 10);
    // 2026-07-24 coverage expansion: product scope is now 61 nodes (was 48).
    // 2026-07-25 D2 QA append (RAD.4): 62.
    expect(full.scope_count).toBe(62);
  });

  it("weights deeper nodes more (climbing the ladder counts for more)", () => {
    expect(coverageWeight("NUM.S")).toBe(1); // root, depth 0
    expect(coverageWeight("RAT.4")).toBe(8); // depth 7
    const deep = computeCoverage([{ node_id: "RAT.4", status: "passed" }]);
    const shallow = computeCoverage([{ node_id: "NUM.S", status: "passed" }]);
    expect(deep.weighted_passed).toBe(8);
    expect(shallow.weighted_passed).toBe(1);
    expect(deep.coverage).toBeGreaterThan(shallow.coverage);
  });

  it("counts inferred passes in coverage but not in coverage_measured (INV-DIAG-2)", () => {
    const result = computeCoverage([
      { node_id: "POL.1", status: "passed", source: "inferred" },
    ]);
    expect(result.coverage).toBeGreaterThan(0);
    expect(result.coverage_measured).toBe(0);
  });

  it("ignores failed/pruned/unknown and out-of-scope nodes", () => {
    const state: NodeResolution[] = [
      { node_id: "NUM.S", status: "failed" },
      { node_id: "NUM.F", status: "pruned" },
      { node_id: "NUM.2", status: "unknown" },
      // 2026-07-24 coverage expansion promoted the former `extended` nodes (incl.
      // RAD.3) into product scope, so the out-of-scope example is now a cut/retired
      // dead ID: NUM.1 (cut) is in the registry but never in product scope.
      { node_id: "NUM.1", status: "passed", source: "measured" }, // cut → out of product scope
    ];
    expect(computeCoverage(state).coverage).toBe(0);
  });

  it("restricts to a blueprint scope (the D1 gate)", () => {
    const d1Full = computeCoverage(passed(D1_IDS, "measured"), D1_IDS);
    expect(d1Full.coverage).toBeCloseTo(1, 10);
    expect(d1Full.scope_count).toBe(6);
  });
});

describe("per-domain coverage profile", () => {
  it("reports mastered arithmetic, empty trig", () => {
    const profile = perDomainCoverage(passed(D1_IDS, "measured"));
    expect(profile.D1).toBeCloseTo(1, 10);
    expect(profile.D9).toBe(0);
  });
});

describe("paired coverage gain", () => {
  it("reports a positive gain from more of the graph resolved post", () => {
    const pre = passed(["NUM.S"], "measured");
    const post = passed(D1_IDS, "measured");
    const measurement = computeCoverageMeasurement(pre, post);
    expect(measurement.coverage_post).toBeGreaterThan(measurement.coverage_pre);
    expect(measurement.coverage_gain).toBeCloseTo(
      measurement.coverage_post - measurement.coverage_pre,
      10,
    );
    expect(measurement.coverage_gain).toBeGreaterThan(0);
    expect(measurement.per_domain_post.D1).toBeCloseTo(1, 10);
  });
});
