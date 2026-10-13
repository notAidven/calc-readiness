import { civicCatalogueForEra } from "@cr/economy";
import { GOLD_MASTERY } from "@cr/mastery-service";
import { ERA_SEQUENCE, type EraId, getEraOrThrow, getNodeOrThrow } from "@cr/skill-graph";
import { afterEach, describe, expect, it } from "vitest";

import { createArchipelagoSession } from "../archipelago/archipelagoSession";
import { createCityDevSession } from "../city/citySession";
import { parseCivicPlacementId } from "../city/civic";
import { eraIslandBuildableRadius } from "../city/islandLand";
import { MASTERY_STAR_TOTAL, masteryStarsFor } from "../city/masteryVisuals";
import { parseRoadCellKey, roadCellKey } from "../city/roads";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import { resetCityEra, setCityEraForPreview } from "../city/useCityEra";
import {
  footprintCells,
  footprintFor,
  isCellBuildable,
  isFootprintInBounds,
  type PlacedTransform,
  unreachableNodeIds,
} from "../city/worldLayout";
import {
  presenterCivicPlacementIds,
  presenterFixtureFor,
  presenterIsland,
  presenterRoadBounds,
  presenterUnbuiltNodeId,
  presenterUnbuiltPrerequisiteIds,
  validatePresenterEraLayout,
} from "./presenterFixtures";
import { buildShowcaseCityFixture } from "./showcaseFixtures";

const REQUEST = {
  enabled: true,
  legacy: false,
  preset: "bronze-city",
  surface: "city",
  eraId: "neolithic",
} as const;
const CANONICAL_ERA_IDS = [
  "prehistoric",
  "neolithic",
  "bronze_age",
  "classical",
  "medieval",
  "renaissance",
  "industrial",
  "atomic_age",
  "information_age",
  "cyberpunk",
] as const;

function occupants(
  placements: readonly PlacedTransform[],
  civic: readonly PlacedTransform[],
  townHall: PlacedTransform | null = {
    nodeId: TOWN_HALL_ID,
    ...TOWN_HALL_CENTER_TRANSFORM,
  },
): readonly PlacedTransform[] {
  return [...(townHall ? [townHall] : []), ...placements, ...civic];
}

function assertConnectedRoadRun(
  eraId: EraId,
  roads: readonly { readonly col: number; readonly row: number }[],
): void {
  const roadKeys = new Set(roads.map((cell) => roadCellKey(cell.col, cell.row)));
  const first = roads[0];
  expect(first, `${eraId} has no road cell to start its connectivity walk`).toBeDefined();
  if (!first) {
    return;
  }
  const visited = new Set([roadCellKey(first.col, first.row)]);
  const queue = [first];
  while (queue.length > 0) {
    const cell = queue.shift();
    if (!cell) {
      continue;
    }
    for (const [col, row] of [
      [cell.col, cell.row - 1],
      [cell.col + 1, cell.row],
      [cell.col, cell.row + 1],
      [cell.col - 1, cell.row],
    ] as const) {
      const key = roadCellKey(col, row);
      if (roadKeys.has(key) && !visited.has(key)) {
        visited.add(key);
        queue.push({ col, row });
      }
    }
  }
  expect(visited.size, `${eraId} roads scatter into disconnected tiles`).toBe(roads.length);
}

function roadRunConnected(
  roads: readonly { readonly col: number; readonly row: number }[],
): boolean {
  const roadKeys = new Set(roads.map((cell) => roadCellKey(cell.col, cell.row)));
  const first = roads[0];
  if (!first) {
    return false;
  }
  const visited = new Set([roadCellKey(first.col, first.row)]);
  const queue = [first];
  for (let at = 0; at < queue.length; at += 1) {
    const cell = queue[at];
    if (!cell) {
      continue;
    }
    for (const [dc, dr] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
      const neighbor = { col: cell.col + dc, row: cell.row + dr };
      const key = roadCellKey(neighbor.col, neighbor.row);
      if (roadKeys.has(key) && !visited.has(key)) {
        visited.add(key);
        queue.push(neighbor);
      }
    }
  }
  return visited.size === roads.length;
}

function touchesRoad(placement: PlacedTransform, roadKeys: ReadonlySet<string>): boolean {
  return footprintCells(placement, footprintFor(placement.nodeId)).some((key) => {
    const cell = parseRoadCellKey(key);
    return (
      [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const
    ).some(([dc, dr]) => roadKeys.has(roadCellKey(cell.col + dc, cell.row + dr)));
  });
}

afterEach(() => {
  resetCityEra();
});

describe("the canonical Presenter final-demo seed", () => {
  it("starts every pre-seeded skill at canonical three-star gold mastery", () => {
    const fixture = presenterFixtureFor(REQUEST);
    const targetIds = new Set(ERA_SEQUENCE.map((era) => presenterUnbuiltNodeId(era.id)));
    const expectedGoldIds = ERA_SEQUENCE.flatMap((era) => era.nodes)
      .filter((nodeId) => !targetIds.has(nodeId))
      .sort();
    const states = new Map(
      fixture.city.seed.nodeStates.map((state) => [state.node_id, state] as const),
    );

    expect.soft(ERA_SEQUENCE.map((era) => era.id)).toEqual(CANONICAL_ERA_IDS);
    expect
      .soft(fixture.archipelago.islands.map((island) => island.eraId))
      .toEqual(CANONICAL_ERA_IDS);
    expect
      .soft(targetIds.size, "the ten eras must have ten distinct live targets")
      .toBe(10);
    expect
      .soft(expectedGoldIds.length, "the mastered-skill population became vacuously small")
      .toBeGreaterThanOrEqual(50);
    expect
      .soft(GOLD_MASTERY, "mastery service gold drifted from the three-star visual")
      .toBe(MASTERY_STAR_TOTAL);
    expect.soft(masteryStarsFor(GOLD_MASTERY, "built")).toEqual({
      filled: MASTERY_STAR_TOTAL,
      total: MASTERY_STAR_TOTAL,
      celebratory: true,
    });

    const actualGoldIds = [...states.values()]
      .filter(
        (state) =>
          state.mastery === GOLD_MASTERY &&
          state.lesson_stage === "done" &&
          state.completion_status === "complete",
      )
      .map((state) => state.node_id)
      .sort();
    expect
      .soft(actualGoldIds.length, "the canonical seed lost completed gold skill rows")
      .toBe(expectedGoldIds.length);
    expect
      .soft(actualGoldIds, "gold rows are not exactly every skill except the live targets")
      .toEqual(expectedGoldIds);

    const census = ERA_SEQUENCE.map((era) => {
      const target = presenterUnbuiltNodeId(era.id);
      const island = fixture.archipelago.islands.find(
        (candidate) => candidate.eraId === era.id,
      );
      const placedOwnSkills = era.nodes.filter((nodeId) =>
        island?.layout.placements.some((placement) => placement.nodeId === nodeId),
      );
      const goldOwnSkills = placedOwnSkills.filter((nodeId) => {
        const state = states.get(nodeId);
        return (
          state?.mastery === GOLD_MASTERY &&
          state.lesson_stage === "done" &&
          state.completion_status === "complete"
        );
      });
      return {
        eraId: era.id,
        totalSkills: era.nodes.length,
        seededSkills: placedOwnSkills.length,
        goldSkills: goldOwnSkills.length,
        unbuiltTarget: target,
        nonGoldSeededSkills: placedOwnSkills.filter(
          (nodeId) => !goldOwnSkills.includes(nodeId),
        ),
      };
    });
    expect.soft(census).toEqual(
      ERA_SEQUENCE.map((era) => ({
        eraId: era.id,
        totalSkills: era.nodes.length,
        seededSkills: era.nodes.length - 1,
        goldSkills: era.nodes.length - 1,
        unbuiltTarget: presenterUnbuiltNodeId(era.id),
        nonGoldSeededSkills: [],
      })),
    );

    for (const era of ERA_SEQUENCE) {
      const target = presenterUnbuiltNodeId(era.id);
      const island = fixture.archipelago.islands.find(
        (candidate) => candidate.eraId === era.id,
      );
      expect
        .soft(states.get(target), `${era.id}/${target} must remain foundation-ready`)
        .toMatchObject({
          mastery: 0,
          mastery_updated_at: null,
          lesson_stage: "not_started",
          completion_status: "locked",
          last_practiced_at: null,
        });
      expect
        .soft(
          island?.layout.placements.some((placement) => placement.nodeId === target),
          `${era.id}/${target} was pre-built`,
        )
        .toBe(false);
      for (const prerequisite of presenterUnbuiltPrerequisiteIds(era.id)) {
        expect
          .soft(
            states.get(prerequisite),
            `${era.id}/${target} prerequisite ${prerequisite} is not gold-ready`,
          )
          .toMatchObject({
            mastery: GOLD_MASTERY,
            lesson_stage: "done",
            completion_status: "complete",
          });
        expect
          .soft(
            island?.layout.placements.some(
              (placement) => placement.nodeId === prerequisite,
            ),
            `${era.id}/${target} prerequisite ${prerequisite} is not standing`,
          )
          .toBe(true);
      }
    }

    const civicIds = fixture.archipelago.islands.flatMap((island) =>
      island.layout.civic.map((placement) => placement.nodeId),
    );
    expect
      .soft(civicIds.length, "the civic exclusion would be vacuous over an empty fixture")
      .toBe(43);
    expect.soft(civicIds.filter((nodeId) => states.has(nodeId))).toEqual([]);
  });

  it("pins the complete Island 1 and Island 2 reference coordinate and road census", () => {
    const census = (eraId: "prehistoric" | "neolithic") => {
      const layout = presenterIsland(eraId).layout;
      const placement = ({ nodeId, col, row, rot }: PlacedTransform) =>
        `${nodeId}@${col},${row},r${rot}`;
      return {
        townHall: layout.town_hall ? placement(layout.town_hall) : null,
        skills: layout.placements.map(placement),
        civics: layout.civic.map(placement),
        roads: layout.roads.map(({ col, row }) => `${col},${row}`),
      };
    };

    const actual = {
      prehistoric: census("prehistoric"),
      neolithic: census("neolithic"),
    };
    const expected = {
      prehistoric: {
        townHall: "town-hall@-1,-2,r0",
        skills: [
          "NUM.S@-5,-3,r0",
          "NUM.2@-1,1,r0",
          "NUM.3@1,-3,r0",
          "NUM.4@2,3,r0",
          "NUM.5@3,-2,r0",
        ],
        civics: [
          "civic:prehistoric_smokehouse:0@-2,-4,r0",
          "civic:prehistoric_longhouse:1@-5,-1,r0",
          "civic:prehistoric_storage_pit:2@-2,-2,r0",
          "civic:prehistoric_storage_pit:3@-2,-1,r0",
          "civic:prehistoric_smokehouse:4@-3,1,r0",
        ],
        roads: [
          "0,-4",
          "-3,-3",
          "-2,-3",
          "-1,-3",
          "0,-3",
          "-3,-2",
          "2,-2",
          "-3,-1",
          "2,-1",
          "-3,0",
          "-2,0",
          "-1,0",
          "0,0",
          "1,0",
          "2,0",
          "-5,1",
          "-4,1",
          "1,1",
          "-4,2",
          "-3,2",
          "-2,2",
          "1,2",
          "-2,3",
          "-1,3",
          "0,3",
          "1,3",
        ],
      },
      neolithic: {
        townHall: "town-hall@-1,-1,r0",
        skills: ["EXP.1@-2,-5,r0", "RAD.1@-3,2,r0", "RAD.2@-6,-2,r0", "RAD.4@2,3,r0"],
        civics: [
          "civic:neolithic_granary:0@3,-4,r0",
          "civic:neolithic_village_houses:1@3,-1,r0",
          "civic:neolithic_bread_oven:2@-3,-3,r0",
          "civic:neolithic_village_well:3@-1,2,r0",
          "civic:neolithic_village_houses:4@-3,-1,r0",
          "civic:neolithic_granary:5@0,1,r0",
        ],
        roads: [
          "-4,-4",
          "-4,-3",
          "-3,-4",
          "-2,-4",
          "-1,-4",
          "0,-4",
          "1,-4",
          "2,-4",
          "-1,-3",
          "2,-3",
          "-4,-2",
          "-1,-2",
          "2,-2",
          "3,-2",
          "-4,-1",
          "2,-1",
          "-5,0",
          "-4,0",
          "2,0",
          "-4,1",
          "-3,1",
          "-2,1",
          "-1,1",
          "2,1",
          "0,2",
          "1,2",
          "2,2",
        ],
      },
    };
    const floors = {
      prehistoric: { skills: 5, civics: 5, roads: 20 },
      neolithic: { skills: 4, civics: 6, roads: 20 },
    } as const;
    for (const eraId of ["prehistoric", "neolithic"] as const) {
      expect(actual[eraId].townHall, `${eraId} Town Hall coordinate drifted`).toBe(
        expected[eraId].townHall,
      );
      for (const key of ["skills", "civics", "roads"] as const) {
        expect(
          actual[eraId][key].length,
          `${eraId} ${key} population became vacuously small`,
        ).toBeGreaterThanOrEqual(floors[eraId][key]);
        expect(new Set(actual[eraId][key]).size, `${eraId} repeats a ${key} identity`).toBe(
          actual[eraId][key].length,
        );
        expect(new Set(actual[eraId][key]), `${eraId} ${key} set drifted`).toEqual(
          new Set(expected[eraId][key]),
        );
      }
    }
  });

  it("pins both reference civic populations by unique placement identity", () => {
    const references = [
      {
        eraId: "prehistoric",
        floor: 5,
        expected: [
          "civic:prehistoric_smokehouse:0",
          "civic:prehistoric_longhouse:1",
          "civic:prehistoric_storage_pit:2",
          "civic:prehistoric_storage_pit:3",
          "civic:prehistoric_smokehouse:4",
        ],
      },
      {
        eraId: "neolithic",
        floor: 6,
        expected: [
          "civic:neolithic_granary:0",
          "civic:neolithic_village_houses:1",
          "civic:neolithic_bread_oven:2",
          "civic:neolithic_village_well:3",
          "civic:neolithic_village_houses:4",
          "civic:neolithic_granary:5",
        ],
      },
    ] as const;

    expect(references.length, "the reference-island civic sweep became partial").toBe(2);
    for (const reference of references) {
      const canonicalTypes = civicCatalogueForEra(reference.eraId).map((row) => row.id);
      const actual = presenterIsland(reference.eraId).layout.civic.map(
        (placement) => placement.nodeId,
      );
      const actualTypes = actual.map(
        (placementId) => parseCivicPlacementId(placementId)?.catalogueId ?? "",
      );

      expect(
        canonicalTypes.length,
        `${reference.eraId} canonical civic floor`,
      ).toBeGreaterThanOrEqual(4);
      expect(
        actual.length,
        `${reference.eraId} visible civic population floor`,
      ).toBeGreaterThanOrEqual(reference.floor);
      expect(new Set(actual).size, `${reference.eraId} repeats a placement identity`).toBe(
        actual.length,
      );
      expect(new Set(actual), `${reference.eraId} civic placement set drifted`).toEqual(
        new Set(reference.expected),
      );
      expect(new Set(presenterCivicPlacementIds(reference.eraId))).toEqual(
        new Set(reference.expected),
      );
      const canonicalTypeSet = new Set<string>(canonicalTypes);
      expect(
        actualTypes.every((catalogueId) => canonicalTypeSet.has(catalogueId)),
        `${reference.eraId} reference contains a non-canonical civic type`,
      ).toBe(true);
    }
    expect(
      presenterIsland("prehistoric").layout.civic.some((placement) =>
        placement.nodeId.includes("campfire"),
      ),
      "the new reference contains no Campfire structure",
    ).toBe(false);
  });

  it("founds all ten deterministic cities with one live target, required civics, and roads", () => {
    const first = presenterFixtureFor(REQUEST);
    const second = presenterFixtureFor(REQUEST);

    expect(
      ERA_SEQUENCE.length,
      "the canonical Presenter seed population dropped below the ten product eras",
    ).toBe(10);
    expect(first.archipelago.islands.map((island) => island.eraId)).toEqual(
      ERA_SEQUENCE.map((era) => era.id),
    );
    expect(second).toEqual(first);
    expect(
      first.archipelago.islands.flatMap((island) => island.layout.civic),
      "the all-era civic census must retain both dense reference populations",
    ).toHaveLength(43);
    expect(
      first.archipelago.islands.flatMap((island) => island.layout.roads).length,
      "the all-era road census became vacuously small",
    ).toBeGreaterThanOrEqual(80);

    const bounds = new Map(
      ERA_SEQUENCE.map((era) => [era.id, presenterRoadBounds(era.id)] as const),
    );
    expect(
      new Set([...bounds.values()].map(({ floor, ceiling }) => `${floor}:${ceiling}`)).size,
      "road limits collapsed to one hardcoded count despite different island sizes",
    ).toBeGreaterThan(1);

    for (const era of ERA_SEQUENCE) {
      const island = first.archipelago.islands.find(
        (candidate) => candidate.eraId === era.id,
      );
      expect(island, `${era.id} has no founded Presenter island`).toBeDefined();
      if (!island) {
        continue;
      }
      const target = presenterUnbuiltNodeId(era.id);
      const ownPlacements = island.layout.placements.filter((placement) =>
        era.nodes.includes(placement.nodeId),
      );
      expect(
        era.nodes.filter(
          (nodeId) => !ownPlacements.some((placement) => placement.nodeId === nodeId),
        ),
        `${era.id} must retain exactly its one intentional live-build target`,
      ).toEqual([target]);
      const targetState = first.city.seed.nodeStates.find(
        (state) => state.node_id === target,
      );
      expect(targetState, `${era.id}/${target} has no seeded learning row`).toMatchObject({
        mastery: 0,
        lesson_stage: "not_started",
        completion_status: "locked",
      });
      expect(
        presenterUnbuiltPrerequisiteIds(era.id).every((nodeId) => {
          const state = first.city.seed.nodeStates.find(
            (candidate) => candidate.node_id === nodeId,
          );
          return (
            state?.mastery === GOLD_MASTERY &&
            state.lesson_stage === "done" &&
            state.completion_status === "complete" &&
            island.layout.placements.some((placement) => placement.nodeId === nodeId)
          );
        }),
        `${era.id}/${target} is not ready through completed, standing prerequisites`,
      ).toBe(true);

      const civicIds = island.layout.civic.map((placement) => {
        const parsed = parseCivicPlacementId(placement.nodeId);
        expect(
          parsed,
          `${era.id} civic ${placement.nodeId} is not canonical`,
        ).not.toBeNull();
        expect(parsed?.row.era, `${era.id} civic belongs to another era`).toBe(era.id);
        return placement.nodeId;
      });
      const canonicalTypes = civicCatalogueForEra(era.id).map((row) => row.id);
      expect(canonicalTypes, `${era.id} canonical civic catalogue drifted`).toHaveLength(4);
      expect(
        civicIds.length,
        `${era.id} civic placement population became vacuously small`,
      ).toBeGreaterThanOrEqual(4);
      expect(new Set(civicIds), `${era.id} civic placement set drifted`).toEqual(
        new Set(presenterCivicPlacementIds(era.id)),
      );
      expect(new Set(civicIds).size, `${era.id} repeats a civic placement identity`).toBe(
        civicIds.length,
      );

      const roadKeys = new Set<string>();
      const allOccupants = occupants(
        island.layout.placements,
        island.layout.civic,
        island.layout.town_hall,
      );
      expect(
        allOccupants.length,
        `${era.id} has no placed city population`,
      ).toBeGreaterThan(5);
      const occupied = new Set<string>();
      for (const placement of allOccupants) {
        expect(
          isFootprintInBounds(
            placement,
            footprintFor(placement.nodeId),
            eraIslandBuildableRadius(era.id),
          ),
          `${era.id}/${placement.nodeId} footprint is off-island`,
        ).toBe(true);
        for (const cell of footprintCells(placement, footprintFor(placement.nodeId))) {
          expect(
            occupied.has(cell),
            `${era.id}/${placement.nodeId} overlaps another footprint at ${cell}`,
          ).toBe(false);
          occupied.add(cell);
        }
      }
      expect(
        unreachableNodeIds(allOccupants, eraIslandBuildableRadius(era.id)),
        `${era.id} contains a building without reachable open ground`,
      ).toEqual([]);
      const limit = bounds.get(era.id);
      expect(limit).toBeDefined();
      expect(
        island.layout.roads.length,
        `${era.id} road network is below its island-derived floor`,
      ).toBeGreaterThanOrEqual(limit?.floor ?? Number.POSITIVE_INFINITY);
      expect(
        island.layout.roads.length,
        `${era.id} road network exceeds its island-derived clutter ceiling`,
      ).toBeLessThanOrEqual(limit?.ceiling ?? Number.NEGATIVE_INFINITY);
      for (const road of island.layout.roads) {
        const key = roadCellKey(road.col, road.row);
        expect(roadKeys.has(key), `${era.id} duplicates road ${key}`).toBe(false);
        expect(
          isCellBuildable(road.col, road.row, eraIslandBuildableRadius(era.id)),
          `${era.id} road ${key} is off its real buildable island`,
        ).toBe(true);
        expect(occupied.has(key), `${era.id} road ${key} overlaps a building`).toBe(false);
        roadKeys.add(key);
      }
      assertConnectedRoadRun(era.id, island.layout.roads);
      const townHall = allOccupants.find((placement) => placement.nodeId === TOWN_HALL_ID);
      expect(townHall, `${era.id} lost Town Hall`).toBeDefined();
      expect(
        townHall ? touchesRoad(townHall, roadKeys) : false,
        `${era.id} roads do not reach Town Hall`,
      ).toBe(true);
      for (const civic of island.layout.civic) {
        expect(
          touchesRoad(civic, roadKeys),
          `${era.id}/${civic.nodeId} has no road path into the Town Hall network`,
        ).toBe(true);
      }
      for (const skill of island.layout.placements) {
        expect(
          touchesRoad(skill, roadKeys),
          `${era.id}/${skill.nodeId} has no road path into the Town Hall network`,
        ).toBe(true);
      }
    }
  });

  it("reloads every founded city from a fresh in-memory Presenter session", async () => {
    const fixture = presenterFixtureFor(REQUEST);
    const freshSessionLoads = async () => {
      setCityEraForPreview(REQUEST.eraId);
      const session = createArchipelagoSession({
        initial: createCityDevSession(null, fixture.city.seed),
        standingEra: REQUEST.eraId,
        stashed: fixture.archipelago.islands.filter(
          (island) => island.eraId !== REQUEST.eraId,
        ),
        makeIsland: (snapshot) => createCityDevSession(snapshot),
        presenterMutationsEnabled: true,
      });

      expect(session.islands()).toEqual(ERA_SEQUENCE.map((era) => era.id));
      const loads = [];
      for (const era of ERA_SEQUENCE) {
        await session.sailTo(era.id);
        const loaded = await session.load();
        const expected = fixture.archipelago.islands.find(
          (island) => island.eraId === era.id,
        )?.layout;
        expect(expected, `${era.id} fixture layout is missing`).toBeDefined();
        expect(
          {
            placements: loaded.placements,
            roads: loaded.roads,
            town_hall: loaded.town_hall,
            civic: loaded.civic,
          },
          `${era.id} did not reload byte-for-byte from the disposable Presenter bay`,
        ).toEqual({
          placements: expected?.placements,
          roads: expected?.roads,
          town_hall: expected?.town_hall,
          civic: expected?.civic,
        });
        const target = presenterUnbuiltNodeId(era.id);
        expect(loaded.placements?.some((placement) => placement.nodeId === target)).toBe(
          false,
        );
        expect(
          loaded.node_states.find((state) => state.node_id === target),
          `${era.id}/${target} was mastered while reloading another island`,
        ).toMatchObject({
          mastery: 0,
          lesson_stage: "not_started",
          completion_status: "locked",
        });
        loads.push(loaded);
      }
      session.dispose();
      return loads;
    };

    const first = await freshSessionLoads();
    const second = await freshSessionLoads();
    expect(second, "two fresh Presenter sessions produced different era snapshots").toEqual(
      first,
    );
  });

  it("leaves the ordinary session and non-Presenter showcase fixture unchanged", async () => {
    const ordinary = await createCityDevSession().load();
    expect(ordinary.placements).toEqual([]);
    expect(ordinary.roads).toEqual([]);
    expect(ordinary.civic).toEqual([]);
    expect(ordinary.town_hall).toEqual({
      nodeId: TOWN_HALL_ID,
      ...TOWN_HALL_CENTER_TRANSFORM,
    });
    expect(
      ordinary.node_states.every(
        (state) =>
          state.mastery === 0 &&
          state.lesson_stage === "not_started" &&
          state.completion_status === "locked",
      ),
    ).toBe(true);

    const showcase = buildShowcaseCityFixture("economy-city");
    expect(showcase.eraId).toBe("prehistoric");
    expect(showcase.seed.placements).toHaveLength(
      getEraOrThrow("prehistoric").nodes.length,
    );
    expect(showcase.seed.roads).toHaveLength(12);
    expect(showcase.seed.civic).toBeUndefined();
  });

  it("keeps every global target out of every other target's prerequisite set", () => {
    const targets = new Set(ERA_SEQUENCE.map((era) => presenterUnbuiltNodeId(era.id)));
    expect(targets.size).toBe(ERA_SEQUENCE.length);
    for (const target of targets) {
      expect(
        getNodeOrThrow(target).prereqs.filter((prerequisite) => targets.has(prerequisite)),
        `${target} cannot be demo-ready while another era deliberately leaves its prerequisite unbuilt`,
      ).toEqual([]);
    }
  });

  it("rejects civic under-count, over-count, duplicate-id, and wrong-composition mutations", () => {
    const eraId = "neolithic";
    const layout = presenterIsland(eraId).layout;
    expect(() =>
      validatePresenterEraLayout(eraId, { ...layout, civic: layout.civic.slice(0, -1) }),
    ).toThrow(/must place exactly 6 reference civics/);
    expect(() =>
      validatePresenterEraLayout(eraId, {
        ...layout,
        civic: [
          ...layout.civic,
          {
            ...(layout.civic[0] as PlacedTransform),
            nodeId: "civic:neolithic_granary:6",
          },
        ],
      }),
    ).toThrow(/must place exactly 6 reference civics/);

    const first = layout.civic[0] as PlacedTransform;
    expect(() =>
      validatePresenterEraLayout(eraId, {
        ...layout,
        civic: [...layout.civic, first],
      }),
    ).toThrow(/repeats a civic placement identity/);

    const last = layout.civic.at(-1) as PlacedTransform;
    expect(() =>
      validatePresenterEraLayout(eraId, {
        ...layout,
        civic: [
          ...layout.civic.slice(0, -1),
          { ...last, nodeId: "civic:neolithic_village_well:5" },
        ],
      }),
    ).toThrow(/wrong reference count for civic neolithic_granary/);
  });

  it("rejects disconnected civic and overlapping-placement mutations", () => {
    const eraId = "neolithic";
    const layout = presenterIsland(eraId).layout;
    const radius = eraIslandBuildableRadius(eraId);
    const moving = layout.civic[0] as PlacedTransform;
    const stationary = occupants(
      layout.placements,
      layout.civic.filter((placement) => placement !== moving),
    );
    const blocked = new Set([
      ...stationary.flatMap((placement) =>
        footprintCells(placement, footprintFor(placement.nodeId)),
      ),
      ...layout.roads.map((road) => roadCellKey(road.col, road.row)),
    ]);
    const roadKeys = new Set(layout.roads.map((road) => roadCellKey(road.col, road.row)));
    const reach = Math.ceil(radius / 4) + 1;
    let disconnected: PlacedTransform | null = null;
    for (let row = -reach; row <= reach && disconnected === null; row += 1) {
      for (let col = -reach; col <= reach; col += 1) {
        const candidate = { ...moving, col, row };
        const cells = footprintCells(candidate, footprintFor(candidate.nodeId));
        if (
          isFootprintInBounds(candidate, footprintFor(candidate.nodeId), radius) &&
          cells.every((cell) => !blocked.has(cell)) &&
          unreachableNodeIds([...stationary, candidate], radius).length === 0 &&
          !touchesRoad(candidate, roadKeys)
        ) {
          disconnected = candidate;
          break;
        }
      }
    }
    expect(
      disconnected,
      "the disconnected-civic injection found no legal bare plot",
    ).not.toBe(null);
    expect(() =>
      validatePresenterEraLayout(eraId, {
        ...layout,
        civic: [disconnected as PlacedTransform, ...layout.civic.slice(1)],
      }),
    ).toThrow(/civic .* is disconnected from the road network/);

    const movingSkill = layout.placements[0] as PlacedTransform;
    const stationaryForSkill = occupants(
      layout.placements.filter((placement) => placement !== movingSkill),
      layout.civic,
    );
    const skillBlocked = new Set([
      ...stationaryForSkill.flatMap((placement) =>
        footprintCells(placement, footprintFor(placement.nodeId)),
      ),
      ...layout.roads.map((road) => roadCellKey(road.col, road.row)),
    ]);
    let disconnectedSkill: PlacedTransform | null = null;
    for (let row = -reach; row <= reach && disconnectedSkill === null; row += 1) {
      for (let col = -reach; col <= reach; col += 1) {
        const candidate = { ...movingSkill, col, row };
        const cells = footprintCells(candidate, footprintFor(candidate.nodeId));
        if (
          isFootprintInBounds(candidate, footprintFor(candidate.nodeId), radius) &&
          cells.every((cell) => !skillBlocked.has(cell)) &&
          unreachableNodeIds([...stationaryForSkill, candidate], radius).length === 0 &&
          !touchesRoad(candidate, roadKeys)
        ) {
          disconnectedSkill = candidate;
          break;
        }
      }
    }
    expect(
      disconnectedSkill,
      "the disconnected-skill injection found no legal bare plot",
    ).not.toBe(null);
    expect(() =>
      validatePresenterEraLayout(eraId, {
        ...layout,
        placements: [disconnectedSkill as PlacedTransform, ...layout.placements.slice(1)],
      }),
    ).toThrow(/skill .* is disconnected from the road network/);

    const firstSkill = layout.placements[0] as PlacedTransform;
    const secondSkill = layout.placements[1] as PlacedTransform;
    expect(() =>
      validatePresenterEraLayout(eraId, {
        ...layout,
        placements: [
          firstSkill,
          { ...secondSkill, col: firstSkill.col, row: firstSkill.row },
          ...layout.placements.slice(2),
        ],
      }),
    ).toThrow(/overlaps footprint/);
  });

  it("rejects off-grid, footprint-overlapping, disconnected, and miscounted roads", () => {
    const eraId = "neolithic";
    const layout = presenterIsland(eraId).layout;
    const radius = eraIslandBuildableRadius(eraId);
    expect(() => validatePresenterEraLayout(eraId, { ...layout, roads: [] })).toThrow(
      /roads fall below floor/,
    );
    expect(() =>
      validatePresenterEraLayout(eraId, {
        ...layout,
        roads: new Array(presenterRoadBounds(eraId).ceiling + 1).fill({
          col: 0,
          row: 0,
        }),
      }),
    ).toThrow(/roads exceed ceiling/);
    expect(() =>
      validatePresenterEraLayout(eraId, {
        ...layout,
        roads: [{ col: 999, row: 999 }, ...layout.roads.slice(1)],
      }),
    ).toThrow(/road 999,999 is off-island/);

    const footprintCell = parseRoadCellKey(
      footprintCells(
        layout.placements[0] as PlacedTransform,
        footprintFor((layout.placements[0] as PlacedTransform).nodeId),
      )[0] as string,
    );
    expect(() =>
      validatePresenterEraLayout(eraId, {
        ...layout,
        roads: [footprintCell, ...layout.roads.slice(1)],
      }),
    ).toThrow(/overlaps a footprint/);

    const originalKeys = new Set(
      layout.roads.map((road) => roadCellKey(road.col, road.row)),
    );
    const leafIndex = layout.roads.findIndex((road, index) => {
      const neighbors = [
        roadCellKey(road.col, road.row - 1),
        roadCellKey(road.col + 1, road.row),
        roadCellKey(road.col, road.row + 1),
        roadCellKey(road.col - 1, road.row),
      ].filter((key) => originalKeys.has(key)).length;
      return (
        neighbors <= 1 &&
        roadRunConnected(layout.roads.filter((_, candidate) => candidate !== index))
      );
    });
    expect(
      leafIndex,
      "the disconnected-road injection found no removable leaf",
    ).toBeGreaterThan(-1);
    const occupied = new Set(
      occupants(layout.placements, layout.civic).flatMap((placement) =>
        footprintCells(placement, footprintFor(placement.nodeId)),
      ),
    );
    let isolated: { col: number; row: number } | null = null;
    const reach = Math.ceil(radius / 4) + 1;
    for (let row = -reach; row <= reach && isolated === null; row += 1) {
      for (let col = -reach; col <= reach; col += 1) {
        const key = roadCellKey(col, row);
        if (
          isCellBuildable(col, row, radius) &&
          !occupied.has(key) &&
          !originalKeys.has(key) &&
          [
            roadCellKey(col, row - 1),
            roadCellKey(col + 1, row),
            roadCellKey(col, row + 1),
            roadCellKey(col - 1, row),
          ].every((neighbor) => !originalKeys.has(neighbor))
        ) {
          isolated = { col, row };
          break;
        }
      }
    }
    expect(
      isolated,
      "the disconnected-road injection found no isolated legal cell",
    ).not.toBe(null);
    expect(() =>
      validatePresenterEraLayout(eraId, {
        ...layout,
        roads: layout.roads.map((road, index) =>
          index === leafIndex ? (isolated as { col: number; row: number }) : road,
        ),
      }),
    ).toThrow(/roads are not one coherent network/);
  });
});
