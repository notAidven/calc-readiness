import { getNodesByScope } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { getD1Plots, getNeighborhoodPlots } from "./plots";

describe("D1 plots", () => {
  it("derives exactly the six MVP D1 nodes in registry order", () => {
    const plots = getD1Plots();
    expect(plots.map((plot) => plot.node_id)).toEqual([
      "NUM.S",
      "NUM.F",
      "NUM.2",
      "NUM.3",
      "NUM.4",
      "NUM.5",
    ]);
    expect(plots).toHaveLength(getNodesByScope("mvp").length);
  });

  it("carries lesson shells straight from the registry", () => {
    const byNode = new Map(getD1Plots().map((plot) => [plot.node_id, plot.lesson_shell]));
    expect(byNode.get("NUM.S")).toBe("L1");
    expect(byNode.get("NUM.2")).toBe("L2");
    expect(byNode.get("NUM.5")).toBe("L3");
  });

  it("derives roads from registry prereqs, intersected with the plots", () => {
    const byNode = new Map(
      getD1Plots().map((plot) => [plot.node_id, [...plot.road_sources].sort()]),
    );

    expect(byNode.get("NUM.S")).toEqual([]);
    expect(byNode.get("NUM.F")).toEqual([]);
    expect(byNode.get("NUM.3")).toEqual([]);
    expect(byNode.get("NUM.2")).toEqual(["NUM.F", "NUM.S"]);
    expect(byNode.get("NUM.4")).toEqual(["NUM.2", "NUM.3", "NUM.F", "NUM.S"]);
    expect(byNode.get("NUM.5")).toEqual(["NUM.F"]);
  });

  it("assigns a unique authored position to each plot", () => {
    const plots = getNeighborhoodPlots("D1");
    const positionKeys = plots.map((plot) => `${plot.position.col},${plot.position.row}`);
    expect(new Set(positionKeys).size).toBe(plots.length);
  });
});
