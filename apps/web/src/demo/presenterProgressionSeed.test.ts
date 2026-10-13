import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  PRESENTER_PROGRESSION_TARGETS,
  presenterCivicPlacementIds,
  presenterFixtureFor,
  presenterUnbuiltNodeId,
  presenterUnbuiltPrerequisiteIds,
} from "./presenterFixtures";
import { PRESENTER_PRESETS } from "./presenterMode";
import { presenterEraBuildPlan } from "./presenterState";

function expectedFocus(eraId: EraId): string {
  const era = ERA_SEQUENCE.find((candidate) => candidate.id === eraId);
  if (!era || era.nodes.length === 0) {
    throw new Error(`The Presenter seed guard cannot find a skill for ${eraId}.`);
  }
  return era.nodes.includes("LF.1") ? "LF.1" : (era.nodes[0] as string);
}

describe("Presenter progression-ready city plans", () => {
  it("selects the full-frame-reviewed Era 2 target through the centralized mapping", () => {
    expect(PRESENTER_PROGRESSION_TARGETS.neolithic).toBe("RAD.3");
    expect(presenterUnbuiltNodeId("neolithic")).toBe(
      PRESENTER_PROGRESSION_TARGETS.neolithic,
    );
  });

  it("covers every registered era and preset with exactly one unbuilt target", () => {
    expect(
      ERA_SEQUENCE.length,
      "the all-era Presenter seed population dropped below the ten registered eras",
    ).toBeGreaterThanOrEqual(10);

    const checked = new Set<string>();
    for (const era of ERA_SEQUENCE) {
      for (const preset of PRESENTER_PRESETS) {
        const fixture = presenterFixtureFor({
          enabled: true,
          legacy: false,
          preset,
          surface: "city",
          eraId: era.id,
        });
        const focusNodeId = expectedFocus(era.id);
        const unbuiltNodeId = presenterUnbuiltNodeId(era.id);
        const placedSkillIds = new Set(
          fixture.city.seed.placements.map((placement) => placement.nodeId),
        );
        const targetState = fixture.city.seed.nodeStates.find(
          (state) => state.node_id === unbuiltNodeId,
        );

        expect(fixture.city.focusNodeId, `${era.id}/${preset} chose the wrong focus`).toBe(
          focusNodeId,
        );
        expect(unbuiltNodeId).not.toBe(focusNodeId);
        expect(
          placedSkillIds.has(focusNodeId),
          `${era.id}/${preset} lost its retained lesson focus`,
        ).toBe(true);
        expect(
          era.nodes.filter((nodeId) => !placedSkillIds.has(nodeId)),
          `${era.id}/${preset} must leave one and only one current-era skill unbuilt`,
        ).toEqual([unbuiltNodeId]);
        expect(targetState).toMatchObject({
          mastery: 0,
          lesson_stage: "not_started",
          completion_status: "locked",
        });
        expect(
          (fixture.city.seed.civic ?? []).map((placement) => placement.nodeId),
          `${era.id}/${preset} did not retain its required civic fixture`,
        ).toEqual(presenterCivicPlacementIds(era.id));
        checked.add(`${era.id}:${preset}`);
      }
    }

    expect(checked.size).toBe(ERA_SEQUENCE.length * PRESENTER_PRESETS.length);
  });

  it("keeps the same unbuilt target in every Unlock & build era plan", () => {
    expect(
      ERA_SEQUENCE.length,
      "the all-era Presenter build-plan population dropped below the registry floor",
    ).toBeGreaterThanOrEqual(10);

    const unbuilt = new Map<EraId, string>();
    for (const era of ERA_SEQUENCE) {
      const plan = presenterEraBuildPlan(era.id);
      const focusNodeId = expectedFocus(era.id);
      const unbuiltNodeId = presenterUnbuiltNodeId(era.id);
      const placed = plan.skillPlacements.map((placement) => placement.nodeId);
      const placedCurrentEra = placed.filter((nodeId) => era.nodes.includes(nodeId));

      expect(placedCurrentEra, `${era.id} did not place every non-target skill`).toEqual(
        era.nodes.filter((nodeId) => nodeId !== unbuiltNodeId),
      );
      expect(placed, `${era.id} lost its retained lesson focus`).toContain(focusNodeId);
      expect(placed, `${era.id} placed the target that must begin unbuilt`).not.toContain(
        unbuiltNodeId,
      );
      expect(
        plan.completedNodeIds,
        `${era.id} pre-mastered its unbuilt target`,
      ).not.toContain(unbuiltNodeId);
      expect(
        presenterUnbuiltPrerequisiteIds(era.id).every(
          (nodeId) => placed.includes(nodeId) && plan.completedNodeIds.includes(nodeId),
        ),
        `${era.id} did not ready every building needed to make its target available`,
      ).toBe(true);
      expect(
        plan.civicPlacements.map((placement) => placement.nodeId),
        `${era.id} did not retain its required civics`,
      ).toEqual(presenterCivicPlacementIds(era.id));
      unbuilt.set(era.id, unbuiltNodeId);
    }

    expect(unbuilt.get("atomic_age"), "Atomic Age needs a target separate from LF.1").toBe(
      "FUN.4",
    );
    expect(unbuilt.size).toBe(ERA_SEQUENCE.length);
  });
});
