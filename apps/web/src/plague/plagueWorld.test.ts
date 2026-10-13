import { createPlague, plagueReducer } from "@cr/game";
import { describe, expect, it } from "vitest";

import { TOWN_HALL_ID } from "../city/townHall";
import type { PlacedTransform } from "../city/worldLayout";
import { buildCareHouseLayer, disposeCareHouseLayer } from "./careHouseScene";
import { plagueWorldFrom } from "./plagueWorld";

const TOWN_HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, col: -1, row: -1, rot: 0 };
const PLACEMENTS: readonly PlacedTransform[] = [
  { nodeId: "NUM.S", col: -4, row: -2, rot: 0 },
  { nodeId: "NUM.F", col: 2, row: 2, rot: 1 },
  { nodeId: "NUM.2", col: 3, row: -2, rot: 2 },
  { nodeId: "NUM.3", col: -2, row: 3, rot: 3 },
  { nodeId: "NUM.4", col: 0, row: -4, rot: 0 },
];

describe("the Plague renderer maps the authored graph onto the live city", () => {
  it("uses the Town Hall and four distinct real placements in a deterministic order", () => {
    const first = plagueWorldFrom(PLACEMENTS, TOWN_HALL);
    const second = plagueWorldFrom([...PLACEMENTS].reverse(), TOWN_HALL);

    expect(first).toEqual(second);
    expect(first.nodes).toHaveLength(5);
    expect(new Set(first.nodes.map((node) => node.transform.nodeId)).size).toBe(5);
    expect(first.nodes.find((node) => node.id === "care-house")?.transform.nodeId).toBe(
      TOWN_HALL_ID,
    );
    expect(first.routes).toHaveLength(5);
    expect(first.routes.every((route) => route.from !== route.to)).toBe(true);
  });

  it("builds bounded route, infection, exposure, and intervention geometry from engine state", () => {
    const world = plagueWorldFrom(PLACEMENTS, TOWN_HALL);
    let state = createPlague();
    state = plagueReducer(state, {
      type: "choose_action",
      action: { kind: "quarantine", route_id: "market-care" },
      question_ids: ["q1", "q2", "q3"],
      expected_revision: state.revision,
    });
    state = plagueReducer(state, {
      type: "answer",
      question_id: "q1",
      correct: true,
      expected_revision: state.revision,
    });

    const layer = buildCareHouseLayer({ state, world });
    const names: string[] = [];
    let meshes = 0;
    layer.traverse((child) => {
      names.push(child.name);
      if ("isMesh" in child && child.isMesh) {
        meshes += 1;
      }
    });

    expect(layer.name).toBe("plague-live-city-layer");
    expect(names.filter((name) => name.startsWith("plague-route:"))).toHaveLength(5);
    expect(names).toContain("plague-infected:market");
    expect(names).toContain("plague-exposed:care-house");
    expect(names).toContain("plague-exposed:printworks");
    expect(names).toContain("plague-pending-quarantine:market-care");
    expect(names.some((name) => /particle|glow/i.test(name))).toBe(false);
    expect(meshes).toBeGreaterThan(10);
    expect(meshes).toBeLessThan(100);

    disposeCareHouseLayer(layer);
  });
});
