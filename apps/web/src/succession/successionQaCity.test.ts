import { civicCatalogueForEra } from "@cr/economy";
import {
  cityRosterNodeIds,
  midEraCrisisCall,
  midEraCrisisNodeIds,
  SUCCESSION_ERA,
} from "@cr/game";
import { getEraNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { civicPlacementId } from "../city/civic";
import { eraBuildableDiscRadius } from "../city/islandLand";
import { TOWN_HALL_ID } from "../city/townHall";
import {
  footprintCells,
  footprintFor,
  occupiedCells,
  unreachableNodeIds,
} from "../city/worldLayout";
import { createSuccessionQaCitySeed } from "./successionQaCity";

describe("the deterministic learner city behind the Succession QA route", () => {
  it("seats the complete real roster, Hall, and current civic population without an orphan", () => {
    const seed = createSuccessionQaCitySeed();
    const roster = cityRosterNodeIds(SUCCESSION_ERA);
    const skillPlacements = seed.placements ?? [];
    const civicPlacements = seed.civic ?? [];
    const hall = seed.townHall;

    expect(roster.length).toBeGreaterThan(getEraNodes(SUCCESSION_ERA).length);
    expect(skillPlacements.map((placement) => placement.nodeId).sort()).toEqual(
      [...roster].sort(),
    );
    expect(hall?.nodeId).toBe(TOWN_HALL_ID);

    const expectedCivics = civicCatalogueForEra(SUCCESSION_ERA).map((row, index) =>
      civicPlacementId(row.id, index),
    );
    expect(expectedCivics.length).toBeGreaterThanOrEqual(4);
    expect(civicPlacements.map((placement) => placement.nodeId)).toEqual(expectedCivics);

    const all = [...skillPlacements, ...(hall ? [hall] : []), ...civicPlacements];
    expect(new Set(all.map((placement) => placement.nodeId)).size).toBe(all.length);
    expect(
      occupiedCells(all).size,
      "two QA buildings overlap or a footprint was dropped",
    ).toBe(
      all.reduce(
        (total, placement) =>
          total + footprintCells(placement, footprintFor(placement.nodeId)).length,
        0,
      ),
    );
    expect(unreachableNodeIds(all, eraBuildableDiscRadius(SUCCESSION_ERA))).toEqual([]);
  });

  it("reaches the real crisis trigger through practiced mastery and no farther", () => {
    const seed = createSuccessionQaCitySeed();
    const states = seed.nodeStates ?? [];
    const triggerIds = midEraCrisisNodeIds(SUCCESSION_ERA);
    const currentIds = getEraNodes(SUCCESSION_ERA);
    const current = new Map(
      states
        .filter((state) => currentIds.includes(state.node_id))
        .map((state) => [state.node_id, state]),
    );

    expect(current.size).toBe(currentIds.length);
    const call = midEraCrisisCall(SUCCESSION_ERA, states);
    expect(call.standing).toBe(true);
    expect(call.mastered).toBe(call.trigger);
    expect(call.mastered).toBeLessThan(call.era_nodes);
    expect(
      triggerIds.map((nodeId) => current.get(nodeId)?.last_practiced_at ?? null),
    ).not.toContain(null);
    expect(
      currentIds
        .filter((nodeId) => !triggerIds.includes(nodeId))
        .map((nodeId) => current.get(nodeId)?.mastery),
    ).toEqual(currentIds.filter((nodeId) => !triggerIds.includes(nodeId)).map(() => 0));

    const priorStates = states.filter((state) => !currentIds.includes(state.node_id));
    expect(priorStates.length).toBeGreaterThan(currentIds.length);
    expect(priorStates.every((state) => state.last_practiced_at !== null)).toBe(true);
  });
});
