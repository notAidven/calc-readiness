import { ERA_SEQUENCE, getEraNodes, getEraOfNode } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { eraPlacementFromSeed, seedPlacingAtEra } from "../catchup/eraPlacement";
import { resolveBuildingModel } from "./buildingAssets";
import { buildingDisplayName } from "./eraDressing";
import { skillBuildingHomeEra } from "./skillBuildingEra";

describe("skill-building home-era ownership", () => {
  it("keeps banked skills in their authored era regardless of the live city era", () => {
    const nodeId = getEraNodes("industrial")[0] as string;
    expect(skillBuildingHomeEra(nodeId)).toBe("industrial");

    const names = ERA_SEQUENCE.map((liveEra) => buildingDisplayName(nodeId, liveEra.id));
    expect(new Set(names).size).toBe(1);
    expect(resolveBuildingModel(nodeId, "built").node_id).toBe(nodeId);
  });

  it("gives catch-up buildings their node's home era without persisted built-era data", () => {
    const placement = eraPlacementFromSeed(seedPlacingAtEra("industrial"));
    expect(placement.skipped.length).toBeGreaterThan(1);
    expect("builtEra" in placement).toBe(false);
    expect("built_era" in placement).toBe(false);

    for (const skippedEra of placement.skipped) {
      for (const nodeId of getEraNodes(skippedEra)) {
        expect(skillBuildingHomeEra(nodeId), nodeId).toBe(getEraOfNode(nodeId)?.id);
        expect(buildingDisplayName(nodeId, placement.placedEra), nodeId).toBe(
          buildingDisplayName(nodeId, skippedEra),
        );
        expect(resolveBuildingModel(nodeId, "built"), nodeId).toBeTruthy();
      }
    }
  });

  it("fails closed for an unknown node", () => {
    expect(skillBuildingHomeEra("NO.SUCH.NODE")).toBeNull();
    expect(resolveBuildingModel("NO.SUCH.NODE", "built")).toMatchObject({
      kind: "built",
      url: null,
    });
  });
});
