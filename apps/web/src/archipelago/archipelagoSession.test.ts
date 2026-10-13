import { ERA_SEQUENCE } from "@cr/skill-graph";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type CityDevSnapshot, createCityDevSession } from "../city/citySession";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import { BUILDABLE_RADIUS, defaultPlacements, type Transform } from "../city/worldLayout";
import { type ArchipelagoSession, createArchipelagoSession } from "./archipelagoSession";

/**
 * **DOES SPENDING ON ONE ISLAND MOVE ANOTHER ISLAND'S WALLET, AND DOES A BUILDING STAY WHERE
 * IT WAS PUT?**
 *
 * `islandState.test.ts` measures the model. This measures the SESSION — the object `App.tsx`
 * actually hands to `CitySurface` — because a correct model behind a wrapper that reads the
 * wrong island is exactly the shape of defect the model cannot see. Every assertion here goes
 * through the real `createCityDevSession`, the real placement gate and the real spend
 * counters; nothing is stubbed but the persistence seam.
 *
 * ## THE ISOLATION CLAIM, STATED SO IT CAN FAIL
 *
 * Three things, and each has an injection recorded beside it:
 *
 *  1. a placement made on one island is on THAT island after a crossing and a return;
 *  2. material spent on one island does not draw down another island's counter;
 *  3. what the learner KNOWS crosses with them, because it is theirs and not the ground's.
 *
 * ## THE ERA STORE IS THE CONTROL, so it is what these tests drive
 *
 * `archipelagoSession.ts` subscribes to `eraState`'s store rather than exposing a private
 * navigation path, which is what let `CitySurface.completeCeremony` stay unedited. Driving
 * `setCityEra` here is therefore driving the same route the shipped ceremony drives, not a
 * back door — `sailTo` is checked separately and is a thin call over it.
 */

const ERA_ONE = (ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number]).id;
const ERA_TWO = (ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number]).id;
const ERA_THREE = (ERA_SEQUENCE[2] as (typeof ERA_SEQUENCE)[number]).id;

/** Nodes that really are in the registry, so `placeSkill` does not no-op on an unknown id. */
const NODE_A = "NUM.S";
const NODE_B = "NUM.F";

/**
 * A legal seat for each node, clear of the pre-seeded hall — `citySession.test.ts`'s own
 * helper, so these placements go through the shipped gate rather than round it.
 */
const SEATS: ReadonlyMap<string, Transform> = new Map(
  defaultPlacements(
    [NODE_A, NODE_B],
    [{ nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM }],
    BUILDABLE_RADIUS,
  ).map((t) => [t.nodeId, { col: t.col, row: t.row, rot: t.rot }] as const),
);
const seatFor = (nodeId: string): Transform => SEATS.get(nodeId) as Transform;

/** Road cells a few rows out from the hall, exactly as `roadsSession.test.ts` picks them. */
const ROAD_CELLS = [
  { col: 0, row: 3 },
  { col: 1, row: 3 },
] as const;

/** Everything `makeIsland` was handed, so a test can assert what crossed and what did not. */
let handedOver: CityDevSnapshot[] = [];

function build(
  options: {
    readonly stashed?: Parameters<typeof createArchipelagoSession>[0]["stashed"];
  } = {},
): ArchipelagoSession {
  handedOver = [];
  return createArchipelagoSession({
    initial: createCityDevSession(null),
    makeIsland: (restoreFrom) => {
      handedOver.push(restoreFrom);
      return createCityDevSession(restoreFrom);
    },
    ...(options.stashed ? { stashed: options.stashed } : {}),
  });
}

let session: ArchipelagoSession | null = null;

beforeEach(() => {
  resetCityEra();
});

afterEach(() => {
  session?.dispose();
  session = null;
  resetCityEra();
});

describe("a learner who has never left", () => {
  it("stands on one island and reads exactly the city they always did", async () => {
    session = build();
    expect(session.standing()).toBe(ERA_ONE);
    expect(session.islands()).toEqual([ERA_ONE]);

    const load = await session.load();
    expect(load.town_hall?.nodeId).toBe(TOWN_HALL_ID);
    expect(load.placements).toEqual([]);
    // Nothing was rebuilt, so nothing crossed: the wrapper is inert until an era moves.
    expect(handedOver).toHaveLength(0);
  });
});

describe("island-local placement across a crossing", () => {
  /**
   * **A BUILDING LANDS ON THE ISLAND IT WAS PLACED ON, and stays there.**
   *
   * Injection that fails this: drop the `withLayout` write in `landOn` — i.e. sail without
   * keeping what was standing — and era one comes back bare.
   */
  it("keeps era one's building on era one when the learner sails and returns", async () => {
    session = build();
    await session.placeSkill(NODE_A, seatFor(NODE_A));
    expect((await session.load()).placements).toHaveLength(1);

    // The crossing, driven exactly as the ceremony drives it.
    setCityEra(ERA_TWO);
    await session.load();
    expect(session.standing()).toBe(ERA_TWO);

    // The new island is new: a hall, and nothing the learner built on era one.
    const onTwo = await session.load();
    expect(onTwo.town_hall?.nodeId).toBe(TOWN_HALL_ID);
    expect(onTwo.placements).toEqual([]);

    // Sail back. Era one is exactly as it was left.
    await session.sailTo(ERA_ONE);
    const backOnOne = await session.load();
    expect(backOnOne.placements).toEqual([{ nodeId: NODE_A, ...seatFor(NODE_A) }]);
  });

  /**
   * **TWO ISLANDS, ONE CELL — island-local coordinates through the real placement gate.**
   *
   * Injection that fails this: partition anything other than per island and the second
   * `placeSkill` is refused for overlapping a building on a different island, so era two's
   * placements come back empty.
   */
  it("lets two islands hold different buildings on the very same cell", async () => {
    session = build();
    const cell = seatFor(NODE_A);
    await session.placeSkill(NODE_A, cell);

    await session.sailTo(ERA_TWO);
    await session.placeSkill(NODE_B, cell);

    const onTwo = await session.load();
    expect(onTwo.placements).toEqual([{ nodeId: NODE_B, ...cell }]);

    await session.sailTo(ERA_ONE);
    const onOne = await session.load();
    expect(onOne.placements).toEqual([{ nodeId: NODE_A, ...cell }]);
  });
});

describe("the wallets", () => {
  /**
   * **SPENDING ON ONE ISLAND DOES NOT MOVE ANOTHER ISLAND'S WALLET.**
   *
   * Driven through the real road commit rather than by writing the counter, so the number
   * being isolated is a number the shipped sink produced. Both spend counters net out of
   * `WalletView.spendable`, which is the LIVE era's material, so the session serving the
   * standing island's figure is the whole of the isolation on the wallet side.
   *
   * Injection that fails this: have `roadGoldSpent` sum the bay instead of reading the
   * standing island, and era two opens holding era one's outlay against its own grain.
   */
  it("charges the island the roads were laid on and no other", async () => {
    session = build();
    const laid = await session.layRoads([...ROAD_CELLS], 100_000);
    expect(laid.status).toBe("committed");
    const spentOnOne = session.roadGoldSpent();
    expect(spentOnOne).toBeGreaterThan(0);

    await session.sailTo(ERA_TWO);
    // A fresh island has spent nothing, whatever was spent on the one behind it.
    expect(session.roadGoldSpent()).toBe(0);
    expect((await session.load()).roads).toEqual([]);

    await session.sailTo(ERA_ONE);
    expect(session.roadGoldSpent()).toBe(spentOnOne);
    expect((await session.load()).roads).toHaveLength(2);
  });

  it("keeps a crisis on the island it happened to", async () => {
    session = build();
    await session.sailTo(ERA_TWO);
    await session.recordCrisisDamage({ buildings: [NODE_A], cells: [] });
    expect(session.crisisDamage().ruined_buildings).toHaveLength(1);

    await session.sailTo(ERA_ONE);
    expect(session.crisisDamage().ruined_buildings).toEqual([]);

    await session.sailTo(ERA_TWO);
    expect(session.crisisDamage().ruined_buildings).toHaveLength(1);
  });

  /**
   * **THE DAMAGE MINT IS THE BAY'S, so two islands cannot both issue `d1`.**
   *
   * Injection that fails this: hand the island its own stored mint instead of
   * `bayDamageMint`, and era one's first ruin is `d1` again — the id era two's repair spend is
   * already keyed under, so the ledger reports `already_spent` and the ruin never clears.
   */
  it("never re-issues a damage id a different island already used", async () => {
    session = build();
    await session.sailTo(ERA_TWO);
    await session.recordCrisisDamage({ buildings: [NODE_A], cells: [] });
    const onTwo = session.crisisDamage().ruined_buildings[0]?.damage_id;

    await session.sailTo(ERA_ONE);
    await session.recordCrisisDamage({ buildings: [NODE_B], cells: [] });
    const onOne = session.crisisDamage().ruined_buildings[0]?.damage_id;

    expect(onTwo).toBeTruthy();
    expect(onOne).toBeTruthy();
    expect(onOne).not.toBe(onTwo);
  });
});

describe("what crosses with the learner", () => {
  /**
   * **MASTERY IS THE LEARNER'S, so it survives every crossing.**
   *
   * Injection that fails this: build the new island's session from the layout alone, and a
   * learner arrives in era two having forgotten era one.
   */
  it("carries node states over, so a skill learned stays learned", async () => {
    session = build();
    await session.placeSkill(NODE_A, seatFor(NODE_A));
    await session.advanceMasteryDev(NODE_A, 3);

    const before = (await session.load()).node_states.find((s) => s.node_id === NODE_A);
    expect(before?.mastery).toBe(3);

    await session.sailTo(ERA_TWO);
    const after = (await session.load()).node_states.find((s) => s.node_id === NODE_A);
    expect(after?.mastery).toBe(3);
    expect(after?.completion_status).toBe("complete");

    // ...and the snapshot the host was handed carried them, which is where it happens.
    expect(handedOver.at(-1)?.node_states.some((s) => s.node_id === NODE_A)).toBe(true);
  });

  it("leaves the ground behind, which is the other half of the same claim", async () => {
    session = build();
    await session.placeSkill(NODE_A, seatFor(NODE_A));
    await session.sailTo(ERA_TWO);
    // The snapshot for era two carries the learner and NOT era one's ground.
    const handed = handedOver.at(-1);
    expect(handed?.placements).toEqual([]);
    expect(handed?.node_states.length ?? 0).toBeGreaterThan(0);
  });
});

describe("founding", () => {
  it("gives a brand-new island its hall, standing, with nothing else on it", async () => {
    session = build();
    await session.sailTo(ERA_THREE);
    const load = await session.load();
    expect(load.town_hall?.nodeId).toBe(TOWN_HALL_ID);
    expect(load.placements).toEqual([]);
    expect(load.civic).toEqual([]);
    expect(session.islands()).toEqual([ERA_ONE, ERA_THREE]);
  });

  it("does not re-found an island the learner already has a city on", async () => {
    session = build();
    await session.sailTo(ERA_TWO);
    await session.placeSkill(NODE_A, seatFor(NODE_A));
    await session.sailTo(ERA_ONE);
    await session.sailTo(ERA_TWO);
    expect((await session.load()).placements).toHaveLength(1);
  });
});

describe("islands restored from storage", () => {
  it("opens the bay the learner left, and lands them back on a stashed island", async () => {
    session = build({
      stashed: [
        {
          eraId: ERA_TWO,
          layout: {
            placements: [{ nodeId: NODE_B, ...seatFor(NODE_B) }],
            roads: [],
            road_gold_spent: 0,
            town_hall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
            civic: [],
            civic_material_spent: 210,
            crisis_damage: {
              ruined_buildings: [],
              ruined_cells: [],
              suspended_civic: [],
              overwritten_records: [],
              next_damage_id: 1,
            },
          },
        },
      ],
    });
    expect(session.islands()).toEqual([ERA_ONE, ERA_TWO]);

    await session.sailTo(ERA_TWO);
    expect((await session.load()).placements).toEqual([
      { nodeId: NODE_B, ...seatFor(NODE_B) },
    ]);
    expect(session.civicMaterialSpent()).toBe(210);
  });
});

describe("the era store is the one control", () => {
  it("lands the learner wherever anything moves the era to", async () => {
    session = build();
    // `completeCeremony` calls `advanceCityEra`, `landCatchUp` calls `setCityEra`, and the dev
    // era control calls `setEra`. All three are this.
    setCityEra(ERA_THREE);
    await session.load();
    expect(session.standing()).toBe(ERA_THREE);
    expect(session.islands()).toEqual([ERA_ONE, ERA_THREE]);
  });

  it("stops listening once disposed, so a torn-down session cannot land anywhere", async () => {
    session = build();
    session.dispose();
    setCityEra(ERA_TWO);
    await session.load();
    expect(session.standing()).toBe(ERA_ONE);
  });
});
