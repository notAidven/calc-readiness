import { buildCityViewModel } from "@cr/game";
import type { StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { D1_SKILL_IDS } from "./buildingAssets";
import { cityCitizenRoster } from "./citizens";
import type { PlacedTransform } from "./worldLayout";

const SEED = 0x5eed;

function nodeState(nodeId: string, over: Partial<StudentNodeState> = {}): StudentNodeState {
  return {
    student_id: "demo-student",
    node_id: nodeId,
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "locked",
    lesson_stage: "not_started",
    last_practiced_at: null,
    ...over,
  };
}

function at(nodeId: string, col: number): PlacedTransform {
  return { nodeId, col, row: 0, rot: 0 };
}

describe("cityCitizenRoster (the web -> engine adapter)", () => {
  it("passes the descriptor-resolved role through, so a display rename is invisible", () => {
    // The role arrives on `CityBuildingView` from the descriptor (D-CIT17), so this
    // adapter reads it rather than looking anything up. `NUM.S` has already been
    // renamed twice — "Town Hall" -> "City Bank" (#148) -> "Assembly Hall" (D-ERA29) —
    // and nothing here noticed either time.
    const viewModel = buildCityViewModel({
      node_states: [
        nodeState("NUM.2", {
          mastery: 2,
          lesson_stage: "done",
          completion_status: "complete",
        }),
      ],
    });
    const roster = cityCitizenRoster({
      viewModel,
      placements: [at("NUM.2", 0)],
      seed: SEED,
    });
    const rowhouse = roster.buildings.find((entry) => entry.node_id === "NUM.2");
    expect(rowhouse?.role).toBe("residence");
    expect(rowhouse?.residence_capacity).toBe(30);
  });

  it("counts only what is actually on the ground (the test-out shape)", () => {
    // Six nodes complete in state, zero placements — exactly what
    // `seedFromPlacement` leaves. 12 people (FOUNDING_POPULATION), no homes.
    const viewModel = buildCityViewModel({
      node_states: D1_SKILL_IDS.map((nodeId) =>
        nodeState(nodeId, {
          lesson_stage: "done",
          completion_status: "complete",
        }),
      ),
    });
    const roster = cityCitizenRoster({ viewModel, placements: [], seed: SEED });
    expect(roster.population).toBe(12);
    expect(roster.residence_capacity).toBe(0);
    expect(roster.waiting).toHaveLength(12);
  });

  it("supplies buildings in PLACEMENT order, not registry order", () => {
    // The order is what makes assignment stable under a new placement (plan 7.3).
    const viewModel = buildCityViewModel({
      node_states: D1_SKILL_IDS.map((nodeId) =>
        nodeState(nodeId, { lesson_stage: "done", completion_status: "complete" }),
      ),
    });
    const roster = cityCitizenRoster({
      viewModel,
      placements: [at("NUM.3", 0), at("NUM.S", 3), at("NUM.2", 6)],
      seed: SEED,
    });
    expect(roster.buildings.map((entry) => entry.node_id)).toEqual([
      "NUM.3",
      "NUM.S",
      "NUM.2",
    ]);
  });

  it("ignores the hub sentinel in the placements list", () => {
    // The Civic Center is not a skill node, has no registry entry, and never appears
    // in `viewModel.buildings`. It contributes the hub's daytime staff and nothing
    // else.
    const viewModel = buildCityViewModel({ node_states: [] });
    const roster = cityCitizenRoster({
      viewModel,
      placements: [{ nodeId: "town-hall", col: -1, row: -1, rot: 0 }],
      seed: SEED,
    });
    expect(roster.buildings).toEqual([]);
    expect(roster.daytime_capacity).toBe(4);
    expect(roster.population).toBe(12);
  });

  it("does not assert completeness for a building that is still going up", () => {
    // The adapter reconstructs `lesson_stage` from the derived `construction_state`,
    // and the engine re-derives completeness from it. Handing over a flat "done"
    // would let the WEB lane declare a building finished — the one thing D-CIT10
    // exists to prevent — and a half-built terrace would bring people and hand out
    // homes it has not earned.
    const viewModel = buildCityViewModel({
      node_states: [nodeState("NUM.2", { lesson_stage: "teaching" })],
    });
    const roster = cityCitizenRoster({
      viewModel,
      placements: [at("NUM.2", 0)],
      seed: SEED,
    });
    expect(roster.population).toBe(12);
    expect(roster.residence_capacity).toBe(0);
    expect(roster.buildings.find((entry) => entry.node_id === "NUM.2")?.residents).toEqual(
      [],
    );

    // And the same for a node whose content is still in authoring: it renders as a
    // permanent preview and can never reach complete.
    const inAuthoring = buildCityViewModel({
      node_states: [nodeState("NUM.2", { mastery: 2, lesson_stage: "done" })],
      authoring_complete: { "NUM.2": false },
    });
    const previewRoster = cityCitizenRoster({
      viewModel: inAuthoring,
      placements: [at("NUM.2", 0)],
      seed: SEED,
    });
    expect(previewRoster.population).toBe(12);
    expect(previewRoster.residence_capacity).toBe(0);
  });

  it("is a pure read: calling it twice with the same inputs is deep-equal", () => {
    const viewModel = buildCityViewModel({
      node_states: [nodeState("NUM.2", { mastery: 2, lesson_stage: "done" })],
    });
    const params = { viewModel, placements: [at("NUM.2", 0)], seed: SEED };
    expect(cityCitizenRoster(params)).toEqual(cityCitizenRoster(params));
  });
});
