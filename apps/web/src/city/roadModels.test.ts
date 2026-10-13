import { ERA_SEQUENCE, getEraNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  cityModelUrls,
  MODEL_STAGES,
  nodeFilePrefix,
  nodeModelUrls,
  SKILL_MODEL_NODES,
} from "./buildingAssets";
import { ROAD_STRAIGHT_FILE, roadModelUrl, roadModelUrls } from "./roadModels";

/**
 * Roads live in `art/models/roads/`, a subdirectory ON PURPOSE: the building loader globs
 * `art/models/*.glb` non-recursively, so its skill-node URL count must NOT absorb road
 * assets. These tests lock that invariant so the count assertion in
 * `buildingAssets.test.ts` stays true AND meaningful.
 *
 * THE NUMBER USED TO BE THE LITERAL 18 AND THE NUMBER WAS NEVER THE CLAIM. Era two's five
 * skill buildings landed fifteen more node-derived basenames in that flat directory, so 18
 * would have had to become 33 — a literal no less hostage to era three than the last one.
 * The claim is that roads stay OUT of whatever the node-derived set is, so the expected
 * count is now read from the live model registry, and the composition and disjointness checks
 * below are what the test is really for.
 */
describe("road model registry (subdir, separate from the node-derived building URLs)", () => {
  it("bundles the authored straight kit sample", () => {
    expect(roadModelUrl(ROAD_STRAIGHT_FILE)).toBeTruthy();
    expect(roadModelUrls().length).toBeGreaterThanOrEqual(1);
  });

  it("keeps the building loader at the node-derived URLs only (roads never leak in)", () => {
    const building = cityModelUrls();
    const eraNodes = ERA_SEQUENCE.flatMap((era) => getEraNodes(era.id));
    const modelBackedNodes = eraNodes.filter(
      (nodeId) => nodeModelUrls(nodeId).length === MODEL_STAGES.length,
    );
    // The production population follows actual registry behaviour in both directions.
    expect(new Set(SKILL_MODEL_NODES)).toEqual(new Set(modelBackedNodes));
    expect(SKILL_MODEL_NODES).toHaveLength(56);
    const unsupported = eraNodes.filter((nodeId) => !SKILL_MODEL_NODES.includes(nodeId));
    expect(unsupported).toHaveLength(6);
    expect(unsupported).toEqual([...getEraNodes("renaissance")]);

    expect(building).toHaveLength(168);
    expect(building).toHaveLength(SKILL_MODEL_NODES.length * MODEL_STAGES.length);
    const buildingSet = new Set(building);
    const expectedBasenames = SKILL_MODEL_NODES.flatMap((nodeId) =>
      MODEL_STAGES.map((stage) => `${nodeFilePrefix(nodeId)}-${stage}.glb`),
    ).sort();
    const actualBasenames = building
      .map((url) => (url.split("?")[0] ?? url).split("/").pop() as string)
      .sort();
    expect(actualBasenames).toEqual(expectedBasenames);
    // A FLOOR under the disjointness sweep: containment and non-membership both hold
    // trivially over an empty road set, which is exactly what a `roads/` glob broken by a
    // rename would produce.
    const roads = roadModelUrls();
    expect(roads.length).toBeGreaterThanOrEqual(1);
    for (const url of roads) {
      expect(buildingSet.has(url)).toBe(false);
    }
    // And in the other direction, by basename, so a road model dropped FLAT (where the
    // subdirectory is what keeps it out today) fails here rather than joining the set.
    for (const url of building) {
      expect(url).not.toMatch(/\/road-|road-straight/);
    }
  });
});
