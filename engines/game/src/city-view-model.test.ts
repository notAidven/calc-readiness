import { getNodesByScope } from "@cr/skill-graph";
import type { Mastery, NeighborhoodState, StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { buildCityViewModel } from "./city-view-model";

function nodeState(
  node_id: string,
  over: Partial<StudentNodeState> = {},
): StudentNodeState {
  return {
    student_id: "s",
    node_id,
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "locked",
    lesson_stage: "not_started",
    last_practiced_at: null,
    ...over,
  };
}

/**
 * Every MVP node at one mastery level. Mastery only ever rises through a writer
 * that stamps `last_practiced_at`, so any node at mastery >= 1 carries practice
 * evidence — modelling it null would be a state production cannot reach (the
 * test-out seam is the only finish without it, and that one sits at mastery 0).
 */
function allStates(mastery: Mastery): StudentNodeState[] {
  return getNodesByScope("mvp").map((node) =>
    nodeState(node.id, {
      mastery,
      lesson_stage: mastery >= 2 ? "done" : "practice",
      completion_status: mastery >= 2 ? "complete" : "in_progress",
      last_practiced_at: mastery >= 1 ? PRACTICED_AT : null,
    }),
  );
}

/** A fixed practice stamp, for the nodes below that really have been practised. */
const PRACTICED_AT = "2026-07-01T12:00:00.000Z";

/** The city's test-out pre-build: Complete at mastery 0 with no practice evidence. */
function testedOutState(node_id: string): StudentNodeState {
  return nodeState(node_id, {
    placement_estimate: 3,
    mastery: 0,
    lesson_stage: "done",
    completion_status: "complete",
    last_practiced_at: null,
  });
}

describe("buildCityViewModel", () => {
  it("composes six buildings with derived construction and completion", () => {
    const vm = buildCityViewModel({
      node_states: [
        nodeState("NUM.S", { mastery: 3, lesson_stage: "done" }),
        nodeState("NUM.2", { mastery: 1, lesson_stage: "done" }),
      ],
    });

    expect(vm.buildings).toHaveLength(6);

    // 3-step: the built variants collapse into the single Complete stage; the gold
    // quality shows via `.gold` / MasteryStars, not a separate "gold" state.
    const mastered = vm.buildings.find((building) => building.node_id === "NUM.S");
    expect(mastered?.construction_state).toBe("complete");
    expect(mastered?.completion_status).toBe("complete");
    expect(mastered?.gold).toBe(true);

    // A finished practice set (lesson_stage "done") reads Complete regardless of the
    // score — a below-bar mastery-1 node is Complete (built), just not gold.
    const belowBar = vm.buildings.find((building) => building.node_id === "NUM.2");
    expect(belowBar?.construction_state).toBe("complete");
    expect(belowBar?.gold).toBe(false);

    // A node with no state row renders as a fresh, not-started plot.
    const untouched = vm.buildings.find((building) => building.node_id === "NUM.3");
    expect(untouched?.construction_state).toBe("not_started");
    expect(untouched?.mastery).toBe(0);
  });

  it("flags a tested-out building and never claims practice it did not do (#103)", () => {
    const vm = buildCityViewModel({
      node_states: [
        // Tested out: pre-built by `seedFromPlacement` at mastery 0, zero items answered.
        testedOutState("NUM.S"),
        // Practised to the bar through its own practice set.
        nodeState("NUM.F", {
          mastery: 2,
          lesson_stage: "done",
          completion_status: "complete",
          last_practiced_at: PRACTICED_AT,
        }),
      ],
    });
    const byNode = new Map(vm.buildings.map((building) => [building.node_id, building]));

    const testedOut = byNode.get("NUM.S");
    // The building is genuinely built — that half must not regress.
    expect(testedOut?.construction_state).toBe("complete");
    expect(testedOut?.tested_out).toBe(true);
    // ...but the copy claims no score, and 4 of 5 survives only as a target.
    expect(testedOut?.progress.label).not.toBe("4 of 5 correct");
    expect(testedOut?.progress.label).toMatch(/tested out/i);
    expect(testedOut?.progress.label).toContain("earns its mastery stars");

    const practised = byNode.get("NUM.F");
    expect(practised?.construction_state).toBe("complete");
    expect(practised?.tested_out).toBe(false);
    expect(practised?.progress.label).toBe("4 of 5 correct");

    // An unbuilt node is not "tested out" just because it has no practice evidence.
    expect(byNode.get("NUM.3")?.tested_out).toBe(false);

    // The storm gate is unmoved: test-out does not open the checkpoint.
    expect(vm.storm.phase).toBe("locked");
  });

  it("surfaces descriptor-driven neighborhood label, status, and building archetypes", () => {
    const vm = buildCityViewModel({ node_states: [] });

    // Label + status come from the resolved descriptor, not a hard-coded string.
    expect(vm.label).toBe("Real Numbers & Arithmetic");
    expect(vm.status).toBe("populated");

    // Each building carries its answer-type archetype, DERIVED from the item bank.
    // NUM.S/NUM.F author `numeric` items (numeric hall); NUM.3 authors `expression`
    // items (expression workshop = `constructed_response`).
    const byNode = new Map(vm.buildings.map((building) => [building.node_id, building]));
    expect(byNode.get("NUM.S")?.archetype.id).toBe("numeric");
    expect(byNode.get("NUM.3")?.archetype.id).toBe("constructed_response");
    expect(byNode.get("NUM.F")?.archetype.id).toBe("numeric");
    // Every building has a resolved archetype with a human label.
    for (const building of vm.buildings) {
      expect(building.archetype.label.length).toBeGreaterThan(0);
    }
  });

  it("derives roads and the nine distant locked districts", () => {
    const vm = buildCityViewModel({ node_states: [] });

    // D10 (Geometry) joined the product registry in the 2026-07-24 coverage
    // expansion, so it now shows as a ninth distant locked district (PLACEHOLDER
    // island, pending Evan). Districts are the in-product domains minus the active one.
    expect(vm.locked_districts.map((district) => district.domain)).toEqual([
      "D2",
      "D3",
      "D4",
      "D5",
      "D6",
      "D7",
      "D8",
      "D9",
      "D10",
    ]);
    expect(vm.roads).toContainEqual({ from: "NUM.F", to: "NUM.5" });
    expect(vm.roads).toContainEqual({ from: "NUM.S", to: "NUM.2" });
  });

  it("locks the storm until all six are mastered, then ready, then cleared", () => {
    expect(buildCityViewModel({ node_states: allStates(1) }).storm.phase).toBe("locked");
    expect(buildCityViewModel({ node_states: allStates(2) }).storm.phase).toBe("ready");

    const clearedNeighborhood: NeighborhoodState = {
      student_id: "s",
      neighborhood_id: "D1",
      checkpoint_cleared: true,
    };
    expect(
      buildCityViewModel({
        node_states: allStates(2),
        neighborhood_state: clearedNeighborhood,
      }).storm.phase,
    ).toBe("cleared");

    expect(buildCityViewModel({ node_states: [] }).storm.required_correct).toBe(4);
  });

  it("carries no cosmetic projection at all, which is what the sunset removed", () => {
    // `cosmetic_preview` was a field on this model: a count of the cosmetic rewards the
    // learner's mastery WOULD earn under the deferred Contracts §8 economy, plus a static
    // catalogue teaser. Both went on 2026-08-03 with the shop, so the assertion is the
    // absence — over a fully mastered city, which is the state the projection was largest
    // in and so the one where a survivor would still be here.
    const vm = buildCityViewModel({ node_states: allStates(3) });
    expect(vm.buildings.filter((b) => b.complete)).toHaveLength(vm.buildings.length);
    expect(vm.buildings.length).toBeGreaterThan(0);
    expect(Object.keys(vm)).not.toContain("cosmetic_preview");
    expect(JSON.stringify(vm)).not.toMatch(/cosmetic/i);
  });
});
