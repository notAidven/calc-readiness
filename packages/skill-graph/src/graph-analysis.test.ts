import { describe, expect, it } from "vitest";

import {
  getNode,
  prereqDepth,
  teachingOrder,
  transitiveDependents,
  transitivePrereqs,
} from "./index";

describe("prereqDepth (longest path from a root)", () => {
  it("places D1 roots at depth 0", () => {
    expect(prereqDepth("NUM.S")).toBe(0);
    expect(prereqDepth("NUM.F")).toBe(0);
    expect(prereqDepth("NUM.3")).toBe(0);
  });

  it("climbs the D1 arithmetic taproot", () => {
    expect(prereqDepth("NUM.2")).toBe(1); // {NUM.S, NUM.F}
    expect(prereqDepth("NUM.5")).toBe(1); // {NUM.F}
    expect(prereqDepth("NUM.4")).toBe(2); // needs NUM.2 (depth 1)
  });

  it("reaches the deepest cross-domain chains", () => {
    expect(prereqDepth("POL.1")).toBe(3); // NUM.4 → +1
    expect(prereqDepth("POL.2")).toBe(4); // POL.1 → +1
    expect(prereqDepth("RAT.1")).toBe(5); // POL.2 → +1
    expect(prereqDepth("RAT.2")).toBe(6); // RAT.1 → +1
    expect(prereqDepth("RAT.4")).toBe(7); // max(RAT.2=6, RAT.3=6) → +1
  });

  it("is deterministic across repeated calls (memoized)", () => {
    expect(prereqDepth("RAT.4")).toBe(prereqDepth("RAT.4"));
  });
});

describe("teachingOrder (topological teaching sequence)", () => {
  it("sequences the six D1 buildings foundations-first from the prereq edges", () => {
    // NUM.S/NUM.F/NUM.3 are roots (depth 0); NUM.2 & NUM.5 sit one level up
    // (depth 1); NUM.4 is deepest (depth 2, needs NUM.2). Ties keep input order.
    expect(teachingOrder(["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"])).toEqual([
      "NUM.S",
      "NUM.F",
      "NUM.3",
      "NUM.2",
      "NUM.5",
      "NUM.4",
    ]);
  });

  it("places every node after all of its prerequisites, whatever the input order", () => {
    const order = teachingOrder(["NUM.4", "NUM.5", "NUM.2", "NUM.3", "NUM.F", "NUM.S"]);
    const rank = (id: string) => order.indexOf(id);
    for (const id of order) {
      for (const prereq of getNode(id)?.prereqs ?? []) {
        if (order.includes(prereq)) {
          expect(rank(prereq), `${prereq} before ${id}`).toBeLessThan(rank(id));
        }
      }
    }
  });

  it("does not mutate the input array", () => {
    const input = ["NUM.4", "NUM.S"];
    teachingOrder(input);
    expect(input).toEqual(["NUM.4", "NUM.S"]);
  });
});

describe("transitivePrereqs (downward closure)", () => {
  it("collects the whole D1 foundation under NUM.4", () => {
    expect(transitivePrereqs("NUM.4")).toEqual(
      new Set(["NUM.S", "NUM.F", "NUM.2", "NUM.3"]),
    );
  });

  it("pulls the arithmetic taproot in under a mid-graph node", () => {
    const prereqs = transitivePrereqs("POL.2");
    expect(prereqs).toContain("POL.1");
    expect(prereqs).toContain("NUM.4");
    expect(prereqs).toContain("NUM.S");
    expect(prereqs.has("POL.2")).toBe(false); // excludes itself
  });

  it("is empty for a root", () => {
    expect(transitivePrereqs("NUM.S").size).toBe(0);
  });
});

describe("transitiveDependents (upward closure — the prune set)", () => {
  it("shows NUM.4 gating the upper graph", () => {
    const dependents = transitiveDependents("NUM.4");
    // Every domain's entry node hangs off the arithmetic taproot.
    for (const id of ["EXP.1", "RAD.1", "LIN.1", "POL.1", "CG.1", "FUN.1", "TRG.1"]) {
      expect(dependents).toContain(id);
    }
    expect(dependents).toContain("EL.1"); // D8, transitively
    expect(dependents).toContain("RAT.4"); // deep D5, transitively
    expect(dependents.has("NUM.S")).toBe(false); // a prereq, not a dependent
    expect(dependents.has("NUM.4")).toBe(false); // excludes itself
  });

  it("is empty for a leaf node nothing depends on", () => {
    expect(transitiveDependents("RAT.4").size).toBe(0);
  });
});
