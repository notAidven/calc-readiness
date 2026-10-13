import { GOLD_MASTERY } from "@cr/mastery-service";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { footprintCells, footprintFor, transformCenter } from "../city/worldLayout";
import { presenterFixtureFor } from "./presenterFixtures";

const REQUEST = {
  enabled: true,
  legacy: false,
  preset: "bronze-city",
  surface: "city",
  eraId: "bronze_age",
} as const;

describe("the presenter city is composed across the real island", () => {
  const fixture = presenterFixtureFor(REQUEST);
  const placements = fixture.city.seed.placements;

  it("keeps every real footprint disjoint", () => {
    const occupied = new Set<string>();
    for (const placement of [fixture.city.seed.townHall, ...placements]) {
      for (const cell of footprintCells(placement, footprintFor(placement.nodeId))) {
        expect(occupied.has(cell), `${placement.nodeId} overlaps ${cell}`).toBe(false);
        occupied.add(cell);
      }
    }
  });

  it("uses the visible island instead of packing one center knot", () => {
    const centers = placements.map((placement) =>
      transformCenter(placement, footprintFor(placement.nodeId)),
    );
    const radial = centers.map(({ x, z }) => Math.hypot(x, z));
    const quadrants = new Set(
      centers.map(({ x, z }) => `${x < 0 ? "W" : "E"}${z < 0 ? "N" : "S"}`),
    );
    let closest = Number.POSITIVE_INFINITY;
    for (let first = 0; first < centers.length; first += 1) {
      for (let second = first + 1; second < centers.length; second += 1) {
        const a = centers[first];
        const b = centers[second];
        if (a && b) {
          closest = Math.min(closest, Math.hypot(a.x - b.x, a.z - b.z));
        }
      }
    }

    expect(Math.min(...radial), "a skill is still in the Town Hall knot").toBeGreaterThan(
      7,
    );
    expect(
      Math.max(...radial),
      "the settlement has spread back to the island rim",
    ).toBeLessThan(27);
    expect(
      quadrants.size,
      "the settlement still reads as one-sided",
    ).toBeGreaterThanOrEqual(3);
    expect(closest, "skill footprints are visually clustered").toBeGreaterThanOrEqual(7);
  });

  it("seeds every founded island and gold selected-era skill population", () => {
    const seeded = presenterFixtureFor({
      ...REQUEST,
      eraId: "industrial",
      surface: "bay",
    });
    expect(seeded.archipelago.islands.map((island) => island.eraId)).toEqual(
      ERA_SEQUENCE.map((era) => era.id),
    );
    const current = seeded.city.seed.nodeStates.filter((node) =>
      seeded.city.seed.placements.some((placement) => placement.nodeId === node.node_id),
    );
    expect(
      current.every(
        (node) =>
          node.mastery === GOLD_MASTERY &&
          node.lesson_stage === "done" &&
          node.completion_status === "complete",
      ),
    ).toBe(true);
    expect(seeded.city.seed.placements).toHaveLength(current.length);
    expect(
      seeded.city.seed.nodeStates.some(
        (node) =>
          node.lesson_stage === "not_started" &&
          !seeded.city.seed.placements.some(
            (placement) => placement.nodeId === node.node_id,
          ),
      ),
    ).toBe(true);
  });
});
