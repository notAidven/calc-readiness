import { eraMaterialTotal, lessonMaterialAmount } from "@cr/economy";
import { buildCityViewModel, FOUNDING_POPULATION } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type CityDevSnapshot, createCityDevSession } from "../city/citySession";
import { cityCitizenRoster } from "../city/citizens";
import { eraIslandLandIsClamped, eraIslandLandRadius } from "../city/islandLand";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import { BUILDABLE_RADIUS, defaultPlacements } from "../city/worldLayout";
import type { EconomyClient } from "../economy/economyClient";
import { createInMemoryEconomyClient } from "../economy/economySession";
import { type ArchipelagoSession, createArchipelagoSession } from "./archipelagoSession";

const ERA_ONE = ERA_SEQUENCE[0]?.id as EraId;
const ERA_TWO = ERA_SEQUENCE[1]?.id as EraId;
const ERA_TWO_NODE = ERA_SEQUENCE[1]?.nodes[0] as string;

interface CompleteArchipelagoSession extends ArchipelagoSession {
  resetIsland(eraId: EraId): Promise<void>;
}

interface CompleteEconomyClient extends EconomyClient {
  reportIslandFounded(input: {
    eraId: EraId;
  }): ReturnType<EconomyClient["reportLessonComplete"]>;
  resetIslandWallet(input: { eraId: EraId }): Promise<void>;
}

function completeSession(session: ArchipelagoSession): CompleteArchipelagoSession {
  return session as CompleteArchipelagoSession;
}

function completeEconomy(client: EconomyClient): CompleteEconomyClient {
  return client as CompleteEconomyClient;
}

let handedOver: CityDevSnapshot[] = [];
let session: CompleteArchipelagoSession | null = null;

function buildSession(): CompleteArchipelagoSession {
  handedOver = [];
  return completeSession(
    createArchipelagoSession({
      initial: createCityDevSession(),
      makeIsland: (snapshot) => {
        handedOver.push(snapshot);
        return createCityDevSession(snapshot);
      },
    }),
  );
}

beforeEach(resetCityEra);

afterEach(() => {
  session?.dispose();
  session = null;
  resetCityEra();
});

describe("each island is sized for its own era", () => {
  it("uses the ten owner-ruled own-era radii and never reaches the cumulative clamp", () => {
    expect(ERA_SEQUENCE.map((era) => [era.id, eraIslandLandRadius(era.id)])).toEqual([
      ["prehistoric", 30],
      ["neolithic", 32],
      ["bronze_age", 32],
      ["classical", 32],
      ["medieval", 30],
      ["renaissance", 32],
      ["industrial", 32],
      ["atomic_age", 35],
      ["information_age", 33],
      ["cyberpunk", 33],
    ]);
    expect(ERA_SEQUENCE.filter((era) => eraIslandLandIsClamped(era.id))).toEqual([]);
    expect(
      new Set(ERA_SEQUENCE.map((era) => eraIslandLandRadius(era.id))).size,
    ).toBeGreaterThan(1);
  });
});

describe("founding an island", () => {
  it("grants one lesson of that island's material exactly once and keeps the era total fixed", async () => {
    const economy = completeEconomy(createInMemoryEconomyClient());
    expect(typeof economy.reportIslandFounded).toBe("function");
    setCityEra(ERA_TWO);

    const first = await economy.reportIslandFounded({ eraId: ERA_TWO });
    const afterFirst = (await economy.getWallet()).spendable;
    expect(first.applied).toBe(true);
    expect(afterFirst).toBe(lessonMaterialAmount(ERA_TWO));

    const replay = await economy.reportIslandFounded({ eraId: ERA_TWO });
    expect(replay.applied).toBe(false);
    expect((await economy.getWallet()).spendable).toBe(afterFirst);

    for (const nodeId of ERA_SEQUENCE[1]?.nodes ?? []) {
      await economy.reportLessonComplete({ nodeId });
    }
    expect((await economy.getWallet()).spendable).toBe(eraMaterialTotal(ERA_TWO));
  });

  it("founds one permanent Town Hall without copying the previous island's layout", async () => {
    session = buildSession();
    const firstHall = (await session.load()).town_hall;
    await session.sailTo(ERA_TWO);
    const founded = await session.load();

    expect(founded.town_hall).toEqual({
      nodeId: TOWN_HALL_ID,
      ...TOWN_HALL_CENTER_TRANSFORM,
    });
    expect(founded.town_hall).toEqual(firstHall);
    expect(founded.placements).toEqual([]);
    expect(founded.roads).toEqual([]);
    expect(handedOver).toHaveLength(1);

    await session.sailTo(ERA_ONE);
    await session.sailTo(ERA_TWO);
    expect((await session.load()).town_hall).toEqual(founded.town_hall);
  });
});

describe("resetting a past island", () => {
  it("restores that island's wallet to the authored era total", async () => {
    const economy = completeEconomy(createInMemoryEconomyClient());
    setCityEra(ERA_TWO);
    await economy.reportIslandFounded({ eraId: ERA_TWO });
    for (const nodeId of ERA_SEQUENCE[1]?.nodes ?? []) {
      await economy.reportLessonComplete({ nodeId });
    }
    const spent = await economy.repairRuin({
      damageId: "d1",
      subjectKind: "ground",
      subject: "1,1",
      cost: 100,
    });
    expect(spent.status).toBe("spent");
    expect((await economy.getWallet()).spendable).toBe(eraMaterialTotal(ERA_TWO) - 100);

    await economy.resetIslandWallet({ eraId: ERA_TWO });
    expect((await economy.getWallet()).spendable).toBe(eraMaterialTotal(ERA_TWO));
  });

  it("wipes learner layout, roads, spend and damage but preserves the Hall and learned state", async () => {
    session = buildSession();
    await session.sailTo(ERA_TWO);
    const seat = defaultPlacements(
      [ERA_TWO_NODE],
      [{ nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM }],
      BUILDABLE_RADIUS,
    )[0];
    expect(seat).toBeDefined();
    await session.placeSkill(ERA_TWO_NODE, seat as NonNullable<typeof seat>);
    await session.advanceMasteryDev(ERA_TWO_NODE, 3);
    await session.layRoads([{ col: 0, row: 3 }], 1_000_000);
    await session.recordCrisisDamage({ buildings: [ERA_TWO_NODE], cells: ["4,4"] });
    const hall = (await session.load()).town_hall;
    const learnedBefore = (await session.load()).node_states.find(
      (node) => node.node_id === ERA_TWO_NODE,
    );
    expect(learnedBefore?.mastery).toBe(3);
    expect(session.roadGoldSpent()).toBeGreaterThan(0);

    await session.sailTo(ERA_ONE);
    expect(typeof session.resetIsland).toBe("function");
    await session.resetIsland(ERA_TWO);
    await session.sailTo(ERA_TWO);
    const reset = await session.load();

    expect(reset.town_hall).toEqual(hall);
    expect(reset.placements).toEqual([]);
    expect(reset.civic).toEqual([]);
    expect(reset.roads).toEqual([]);
    expect(reset.road_gold_spent).toBe(0);
    expect(reset.civic_material_spent).toBe(0);
    expect(reset.crisis_damage?.ruined_buildings).toEqual([]);
    expect(reset.crisis_damage?.ruined_cells).toEqual([]);
    expect(reset.crisis_damage?.suspended_civic).toEqual([]);
    expect(reset.node_states.find((node) => node.node_id === ERA_TWO_NODE)?.mastery).toBe(
      3,
    );
  });

  it("returns to the founding population, then refills when mastered buildings are replaced", async () => {
    session = buildSession();
    await session.sailTo(ERA_TWO);
    const seat = defaultPlacements(
      [ERA_TWO_NODE],
      [{ nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM }],
      BUILDABLE_RADIUS,
    )[0] as NonNullable<ReturnType<typeof defaultPlacements>[number]>;
    await session.placeSkill(ERA_TWO_NODE, seat);
    await session.advanceMasteryDev(ERA_TWO_NODE, 3);
    await session.sailTo(ERA_ONE);
    await session.resetIsland(ERA_TWO);
    await session.sailTo(ERA_TWO);

    const emptied = await session.load();
    expect(emptied.placements).toEqual([]);
    const emptiedRoster = cityCitizenRoster({
      viewModel: buildCityViewModel({
        node_states: emptied.node_states,
        neighborhood_state: emptied.neighborhood_state ?? null,
        era_id: ERA_TWO,
      }),
      placements: emptied.placements ?? [],
    });
    expect(emptiedRoster.population).toBe(FOUNDING_POPULATION);
    await session.placeSkill(ERA_TWO_NODE, seat);
    const replaced = await session.load();
    expect((replaced.placements ?? []).map((placed) => placed.nodeId)).toEqual([
      ERA_TWO_NODE,
    ]);
    expect(
      replaced.node_states.find((node) => node.node_id === ERA_TWO_NODE)?.mastery,
    ).toBe(3);
    const refilledRoster = cityCitizenRoster({
      viewModel: buildCityViewModel({
        node_states: replaced.node_states,
        neighborhood_state: replaced.neighborhood_state ?? null,
        era_id: ERA_TWO,
      }),
      placements: replaced.placements ?? [],
    });
    expect(refilledRoster.population).toBeGreaterThan(emptiedRoster.population);
  });
});
