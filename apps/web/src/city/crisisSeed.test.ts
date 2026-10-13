import { CRISIS_MASTERY_GATE, midEraCrisisNodeIds, midEraCrisisTrigger } from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import type { Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { D1_NODE_IDS } from "./citySession";
import {
  type CrisisSeedPlan,
  crisisSeedMessage,
  planCrisisSeed,
  runCrisisSeed,
} from "./crisisSeed";
import { CURRENT_ERA_ID } from "./eraDressing";
import { TOWN_HALL_ID } from "./townHall";
import {
  BUILDABLE_RADIUS,
  footprintCells,
  footprintFor,
  isPlacementValid,
  occupiedCells,
  type PlacedTransform,
} from "./worldLayout";

/**
 * THE DEV SEED — that it stands up the state the crisis fires from, and that it does
 * nothing else.
 *
 * The second half is the point. A control that opened the advisor would pass any test
 * about the advisor being on screen while the trigger was broken or absent, so what is
 * asserted here is the SHAPE of what the seed does: it calls the two session writes the
 * game calls, with the node set the trigger derives, and it returns.
 */

function recorder() {
  const placed: { nodeId: string; transform: PlacedTransform }[] = [];
  const mastered: { nodeId: string; mastery: Mastery }[] = [];
  return {
    placed,
    mastered,
    port: {
      placeSkill: (nodeId: string, transform: PlacedTransform) => {
        placed.push({ nodeId, transform });
      },
      advanceMastery: (nodeId: string, mastery: Mastery) => {
        mastered.push({ nodeId, mastery });
      },
    },
  };
}

const emptyPlan = (): CrisisSeedPlan =>
  planCrisisSeed({
    eraId: CURRENT_ERA_ID,
    buildableNodeIds: D1_NODE_IDS,
    placedNodeIds: new Set(),
    masteredNodeIds: new Set(),
  });

describe("planning the seed", () => {
  it("takes the era's trigger prefix, never a fixed three", () => {
    // Derived from the same function the trigger reads, so an era of nine nodes seeds five
    // and era one seeds three without this file knowing either number.
    for (const era of ERA_SEQUENCE) {
      const plan = planCrisisSeed({
        eraId: era.id,
        buildableNodeIds: era.nodes,
        placedNodeIds: new Set(),
        masteredNodeIds: new Set(),
      });
      expect(plan.nodeIds.length, era.id).toBe(midEraCrisisTrigger(era.id));
      expect([...plan.nodeIds], era.id).toEqual([...midEraCrisisNodeIds(era.id)]);
      expect([...plan.toPlace], era.id).toEqual([...plan.nodeIds]);
      expect([...plan.toMaster], era.id).toEqual([...plan.nodeIds]);
      expect(plan.unavailable, era.id).toEqual([]);
    }
    // ...and the prefix length really does vary across the sequence, so the loop above is
    // not ten copies of the same assertion.
    const sizes = new Set(ERA_SEQUENCE.map((era) => midEraCrisisNodeIds(era.id).length));
    expect(sizes.size).toBeGreaterThan(1);
  });

  it("skips what the city already has", () => {
    const nodes = midEraCrisisNodeIds(CURRENT_ERA_ID);
    const first = nodes[0] ?? "";
    const plan = planCrisisSeed({
      eraId: CURRENT_ERA_ID,
      buildableNodeIds: D1_NODE_IDS,
      placedNodeIds: new Set([first]),
      masteredNodeIds: new Set([first]),
    });
    expect(plan.toPlace).not.toContain(first);
    expect(plan.toMaster).not.toContain(first);
    expect(plan.toPlace.length).toBe(nodes.length - 1);
  });

  it("refuses, by name, for an era whose buildings this island does not have", () => {
    // Nine of the ten. The refusal has to be visible: a half-seeded city that never fires
    // reads as a broken trigger rather than as missing content.
    const later = ERA_SEQUENCE.filter((era) => era.id !== CURRENT_ERA_ID);
    expect(later.length).toBe(9);
    for (const era of later) {
      const plan = planCrisisSeed({
        eraId: era.id,
        buildableNodeIds: D1_NODE_IDS,
        placedNodeIds: new Set(),
        masteredNodeIds: new Set(),
      });
      expect(plan.unavailable.length, era.id).toBe(plan.nodeIds.length);
      expect(
        crisisSeedMessage(plan, { placed: [], mastered: [], noRoom: [] }),
        era.id,
      ).toMatch(/none on the island yet/);
    }
    // ...and era one is not in that state, so the assertion above is discriminating.
    expect(emptyPlan().unavailable).toEqual([]);
  });
});

describe("running the seed", () => {
  it("places then masters, through the session writes the game itself uses", async () => {
    const { placed, mastered, port } = recorder();
    const plan = emptyPlan();
    const result = await runCrisisSeed(plan, new Set(), port);

    expect(result.placed).toEqual([...plan.nodeIds]);
    expect(result.mastered).toEqual([...plan.nodeIds]);
    expect(result.noRoom).toEqual([]);
    expect(placed.map((entry) => entry.nodeId)).toEqual([...plan.nodeIds]);
    // The bar is the engine's, so the seeded city counts as mastered by the same rule the
    // trigger reads and the era trial opens on.
    for (const entry of mastered) {
      expect(entry.mastery).toBe(CRISIS_MASTERY_GATE);
    }
  });

  it("gives every seeded building its own ground", async () => {
    const { placed, port } = recorder();
    await runCrisisSeed(emptyPlan(), new Set(), port);
    expect(placed.length).toBeGreaterThanOrEqual(3);

    // Each transform is checked against everything placed before it, using the island's
    // own validity rule. Two buildings on one cell would be a city the player could never
    // have built, and the seed's whole claim is that this is a state they could have.
    const laid: PlacedTransform[] = [];
    for (const { nodeId, transform } of placed) {
      expect(
        isPlacementValid(transform, { w: 1, d: 1 }, occupiedCells(laid), BUILDABLE_RADIUS),
        nodeId,
      ).toBe(true);
      laid.push(transform);
    }
    expect(occupiedCells(laid).size).toBeGreaterThanOrEqual(laid.length);
  });

  it("avoids ground the island has already spoken for, the pre-seeded hall included", async () => {
    // THE DEFECT THIS EXISTS FOR, reproduced: the Town Hall is pre-seeded at the island
    // centre and does not appear in `placements`, so a seed handed only the buildings'
    // cells picked the centre, `placeSkill` refused the overlap, and the mastery write
    // behind it no-opped against an unplaced node. The city then sat one skill short of
    // its own trigger with nothing on screen to explain it.
    const hall = occupiedCells([{ nodeId: TOWN_HALL_ID, col: 0, row: 0, rot: 0 }]);
    expect(hall.size).toBeGreaterThan(0);

    const { placed, port } = recorder();
    await runCrisisSeed(emptyPlan(), hall, port);
    expect(placed.length).toBeGreaterThanOrEqual(3);
    for (const { nodeId, transform } of placed) {
      for (const cell of footprintCells(transform, footprintFor(nodeId))) {
        expect(hall.has(cell), `${nodeId} landed on the hall at ${cell}`).toBe(false);
      }
    }
  });

  it("does not re-place a building the city already has", async () => {
    const nodes = midEraCrisisNodeIds(CURRENT_ERA_ID);
    const already: PlacedTransform = { nodeId: nodes[0] ?? "", col: 0, row: 0, rot: 0 };
    const { placed, mastered, port } = recorder();
    const plan = planCrisisSeed({
      eraId: CURRENT_ERA_ID,
      buildableNodeIds: D1_NODE_IDS,
      placedNodeIds: new Set([already.nodeId]),
      masteredNodeIds: new Set(),
    });
    await runCrisisSeed(plan, occupiedCells([already]), port);

    expect(placed.map((entry) => entry.nodeId)).not.toContain(already.nodeId);
    // It is still mastered, because being on the island is not being finished.
    expect(mastered.map((entry) => entry.nodeId)).toContain(already.nodeId);
  });

  it("says what it did, and that the sequence after it is not its doing", async () => {
    const plan = emptyPlan();
    const result = await runCrisisSeed(plan, new Set(), recorder().port);
    const spoken = crisisSeedMessage(plan, result);
    expect(spoken).toMatch(/developer stand-in/i);
    expect(spoken).toMatch(/fire on their own/i);
  });
});
