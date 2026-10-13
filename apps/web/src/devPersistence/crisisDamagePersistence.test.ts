import { foldCrisisDamage, NO_CRISIS_DAMAGE } from "@cr/game";

import { describe, expect, it } from "vitest";

import {
  type CityDevSession,
  createCityDevSession,
  D1_NODE_IDS,
} from "../city/citySession";
import {
  BUILDABLE_RADIUS,
  footprintFor,
  isPlacementValid,
  occupiedCells,
} from "../city/worldLayout";
import {
  createDevSessionStore,
  DEV_SESSION_SCHEMA_VERSION,
  type DevSessionStorage,
  withDevPersistence,
} from "./devSession";
import { ECONOMY_DEV_SCHEMA_VERSION } from "./economyPersistence";

/**
 * **A RUIN SURVIVES A RELOAD, OR THE FEATURE IS A DECORATION.**
 *
 * The blocking defect this whole change exists for is that a crisis could damage a city and
 * the city had no way to remember it, let alone recover. So the claim here is durability, end
 * to end through the REAL store: damage recorded, blob written, blob parsed, session restored,
 * ruin still there — and the same for a repair, which must also survive or the player pays
 * again on the next visit.
 *
 * It also pins the SCHEMA DECISION, in both directions, because `crisis_damage` is optional
 * and an optional field is caught by no compiler check: the city's version had to move and the
 * economy's had to not.
 */

function memStorage(): { storage: DevSessionStorage; map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    storage: {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    },
  };
}

function store(storage: DevSessionStorage) {
  return createDevSessionStore({ storage, enabled: true, debounceMs: 0 });
}

/**
 * Let the persistence wrapper's capture land.
 *
 * `withDevPersistence` snapshots by calling `session.load().then(store.save)`, so the queued
 * write appears a microtask AFTER the mutator's own promise resolves. Awaiting the mutator is
 * not enough, and a `flush()` before this has nothing pending to write.
 */
function settle(): Promise<void> {
  return Promise.resolve().then(() => undefined);
}

/**
 * A session whose `load()` resolves a tick later than the in-memory one's does.
 *
 * NOT a contrivance: `citySession.load()` waits on the layout-write tail whenever a write is
 * in flight (a civic purchase awaits an external ledger call in the middle of one), and
 * `apiCitySession.load()` awaits hydration from `GET /api/city`. One microtask is the FASTEST
 * a real `load()` resolves in, and the wrapper may not depend on it being the only one.
 */
function withSlowLoad(session: CityDevSession): CityDevSession {
  return { ...session, load: () => Promise.resolve().then(() => session.load()) };
}

const NODE = D1_NODE_IDS[0] as string;

/**
 * **THE WAY IN, and the ordering that makes it durable at the moment of the press.**
 *
 * Every other crisis-damage path through this wrapper CLEARS. `recordCrisisDamage` is the one
 * that records, and it is what the Hard Winter's carry-back writes through now that writing
 * the blob behind the session's back has been shown to reach nothing on screen
 * (`city/carryBackReachesTheIsland.test.tsx`).
 */
describe("a crisis's damage recorded through the session is persisted", () => {
  it("writes the fold to the blob, mint and damage ids included", async () => {
    const { storage } = memStorage();
    const live = store(storage);
    const session = withDevPersistence(createCityDevSession(), live);
    await session.recordCrisisDamage({ buildings: [NODE], cells: ["4,0"] });
    live.flush();

    const restored = createCityDevSession(store(storage).load());
    const damage = restored.crisisDamage();
    expect(damage.ruined_buildings).toEqual([{ node_id: NODE, damage_id: "d1" }]);
    expect(damage.ruined_cells).toEqual([{ cell: "4,0", damage_id: "d1" }]);
    expect(damage.next_damage_id).toBe(2);
  });

  /**
   * **THE SNAPSHOT IS QUEUED BEFORE THE CALL RESOLVES**, which is why this one forwarder
   * awaits its capture where the others fire and forget.
   *
   * `App.tsx` flushes the store the instant the carry-back lands, keeping the promise
   * `scarLiveCity.ts` used to keep with its own `flush()`: the player is one click from
   * navigating back to their island, and a debounce window is a window for a closing tab to
   * fall into. A flush can only land what is already pending — so if the capture were still
   * a microtask away, the flush would write the city from BEFORE the crisis.
   *
   * There is deliberately no `settle()` here. That helper exists a few lines up because the
   * other mutators DO need one, and needing one is exactly what this forwarder must not.
   */
  it("queues it before resolving, so a flush at the press lands the damage", async () => {
    const { storage } = memStorage();
    const live = store(storage);
    const session = withDevPersistence(withSlowLoad(createCityDevSession()), live);

    await session.recordCrisisDamage({ buildings: [NODE], cells: [] });
    live.flush();

    expect(
      live.load()?.crisis_damage?.ruined_buildings.map((b) => b.node_id),
      "the damage was still a microtask from being queued when the flush ran",
    ).toEqual([NODE]);
  });
});

describe("crisis damage survives a reload", () => {
  it("carries a ruined building and scarred ground across a fresh session", async () => {
    const { storage } = memStorage();
    const first = store(storage);
    const session = withDevPersistence(createCityDevSession(first.load()), first);
    // AWAITED, not fired. `withDevPersistence`'s capture is `session.load().then(save)`, so
    // the snapshot is queued a microtask later than the mutator resolves — a `flush()` on the
    // same tick lands nothing. Two of these tests were written without the await and passed
    // for the wrong reason (the blob they read back was the one saved a step earlier), which
    // is what `settle` exists to stop.
    await session.placeSkill(NODE, { col: 2, row: 2, rot: 0 });
    await settle();
    first.flush();

    // Damage arrives the way the winter's carry-back writes it: a snapshot-level merge.
    const saved = first.load();
    if (saved === null) {
      throw new Error("nothing saved");
    }
    first.save({
      ...saved,
      crisis_damage: foldCrisisDamage(NO_CRISIS_DAMAGE, {
        buildings: [NODE],
        cells: ["4,0", "4,1"],
      }),
    });
    first.flush();

    // A brand-new store over the SAME storage: this is the reload.
    const reloaded = store(storage);
    const restored = createCityDevSession(reloaded.load());
    const damage = restored.crisisDamage();
    expect(damage.ruined_buildings).toEqual([{ node_id: NODE, damage_id: "d1" }]);
    expect(damage.ruined_cells.map((c) => c.cell)).toEqual(["4,0", "4,1"]);
    // The MINT survives too, which is what stops the next crisis re-issuing `d1`.
    expect(damage.next_damage_id).toBe(2);
  });

  it("carries a REPAIR across a reload, so nobody pays for the same ruin twice", async () => {
    const { storage } = memStorage();
    const first = store(storage);
    const damaged = {
      node_states: [],
      neighborhood_states: [],
      placements: [{ nodeId: NODE, col: 2, row: 2, rot: 0 }],
      roads: [],
      road_gold_spent: 0,
      town_hall: null,
      crisis_damage: foldCrisisDamage(NO_CRISIS_DAMAGE, {
        buildings: [NODE],
        cells: ["4,0"],
      }),
    };
    first.save(damaged);
    first.flush();

    const session = withDevPersistence(createCityDevSession(first.load()), first);
    await session.repairRuinedBuilding(NODE);
    await settle();
    first.flush();

    const reloaded = store(storage);
    const restored = createCityDevSession(reloaded.load());
    // The building is repaired and stayed repaired; the cell they did not buy back is still
    // scarred, which is the partial state a per-item repair is meant to be able to leave.
    expect(restored.crisisDamage().ruined_buildings).toEqual([]);
    expect(restored.crisisDamage().ruined_cells.map((c) => c.cell)).toEqual(["4,0"]);
    // And the mint did NOT rewind, so a later crisis cannot re-issue the id the repair was
    // charged under.
    expect(restored.crisisDamage().next_damage_id).toBe(2);
  });

  it("restores an undamaged city from a blob with no crisis_damage at all", () => {
    // Which is every city saved before this feature, and every city nothing has happened to.
    const { storage } = memStorage();
    const first = store(storage);
    first.save({
      node_states: [],
      neighborhood_states: [],
      placements: [],
      roads: [],
      road_gold_spent: 0,
      town_hall: null,
    });
    first.flush();
    const restored = createCityDevSession(store(storage).load());
    expect(restored.crisisDamage()).toEqual(NO_CRISIS_DAMAGE);
  });

  it("keeps a ruined building in `placements`, which is the whole failure floor", () => {
    const { storage } = memStorage();
    const first = store(storage);
    first.save({
      node_states: [],
      neighborhood_states: [],
      placements: [{ nodeId: NODE, col: 2, row: 2, rot: 0 }],
      roads: [],
      road_gold_spent: 0,
      town_hall: null,
      crisis_damage: foldCrisisDamage(NO_CRISIS_DAMAGE, {
        buildings: [NODE],
        cells: [],
      }),
    });
    first.flush();
    const restored = createCityDevSession(store(storage).load());
    return restored.load().then((load) => {
      expect(load.placements?.map((p) => p.nodeId)).toContain(NODE);
      expect(load.crisis_damage?.ruined_buildings.map((b) => b.node_id)).toEqual([NODE]);
    });
  });
});

describe("scarred ground is unbuildable until it is reclaimed", () => {
  /** A session whose ground at `4,0` and `4,1` a crisis scarred. */
  function withScarredGround() {
    return createCityDevSession({
      node_states: [],
      neighborhood_states: [],
      placements: [],
      roads: [],
      road_gold_spent: 0,
      town_hall: { nodeId: "town-hall", col: -1, row: -1, rot: 0 },
      crisis_damage: foldCrisisDamage(NO_CRISIS_DAMAGE, {
        buildings: [],
        cells: ["4,0", "4,1"],
      }),
    });
  }

  it("refuses a placement onto a scar, and allows the same placement once reclaimed", async () => {
    const session = withScarredGround();
    // `NUM.3` is a 1x1, so its whole footprint is the scarred cell — no ambiguity about
    // which cell the refusal is about.
    expect(footprintFor("NUM.3")).toEqual({ w: 1, d: 1 });

    await session.placeSkill("NUM.3", { col: 4, row: 0, rot: 0 });
    expect((await session.load()).placements).toEqual([]);

    // The SAME call, after reclaiming that cell, succeeds — which is what makes the refusal
    // above a fact about the scar rather than about the cell, the footprint or the island.
    const cleared = await session.reclaimRuinedCell({ col: 4, row: 0 });
    expect(cleared).toEqual({ cleared: true, damage_id: "d1" });
    await session.placeSkill("NUM.3", { col: 4, row: 0, rot: 0 });
    expect((await session.load()).placements).toEqual([
      { nodeId: "NUM.3", col: 4, row: 0, rot: 0 },
    ]);
  });

  it("refuses a ROAD onto a scar too, so nothing can be paved over the damage", async () => {
    const session = withScarredGround();
    const result = await session.layRoads([{ col: 4, row: 1 }], 1000);
    expect(result.laidCount).toBe(0);
    expect(result.cost).toBe(0);
    expect((await session.load()).roads).toEqual([]);
    // And it is the scar doing it: the neighbouring clear cell lays fine.
    const ok = await session.layRoads([{ col: 4, row: 2 }], 1000);
    expect(ok.laidCount).toBe(1);
  });

  it("refuses a MOVE onto a scar, ignore-self included", async () => {
    const session = withScarredGround();
    await session.placeSkill("NUM.3", { col: 3, row: 0, rot: 0 });
    await session.moveSkill("NUM.3", { col: 4, row: 0, rot: 0 });
    // Still where it was: a relocation cannot launder a building onto scarred ground.
    expect((await session.load()).placements).toEqual([
      { nodeId: "NUM.3", col: 3, row: 0, rot: 0 },
    ]);
    // The ignore-self rule still works for a legal move, so this is not the whole check
    // having been broken.
    await session.moveSkill("NUM.3", { col: 3, row: 1, rot: 0 });
    expect((await session.load()).placements).toEqual([
      { nodeId: "NUM.3", col: 3, row: 1, rot: 0 },
    ]);
  });

  it("is the ISLAND's own rule that would otherwise allow it, so the refusal is the scar's", async () => {
    // Without this the refusals above could be passing because `4,0` is off the island or
    // already occupied, and the guard would be measuring nothing.
    const session = withScarredGround();
    const load = await session.load();
    const occupied = occupiedCells([...(load.placements ?? [])]);
    expect(
      isPlacementValid(
        { col: 4, row: 0, rot: 0 },
        footprintFor("NUM.3"),
        occupied,
        BUILDABLE_RADIUS,
      ),
    ).toBe(true);
  });
});

describe("the schema decision, in both directions", () => {
  it("bumped the CITY version, because crisis_damage is an optional field", () => {
    // The version is part of the storage key, so this is the only thing that keeps a blob
    // written by a build with a different `crisis_damage` shape from being fetched at all.
    //
    // IT IS 5 AND NOT 4, and the extra step is not a third migration. Two branches bumped
    // 3 to 4 for unrelated reasons — this field on `integration`, a civic type-id rename on
    // the city lane — and the identical literal merged with no conflict, which would have
    // let each build fetch the other's `...v4` blob and parse it as its own. Raised on the
    // 2026-07-30 forward-merge so the two shapes are distinguishable. Do not lower it.
    expect(DEV_SESSION_SCHEMA_VERSION).toBe(6);
    const { storage, map } = memStorage();
    const live = store(storage);
    live.save({
      node_states: [],
      neighborhood_states: [],
      placements: [],
      roads: [],
      road_gold_spent: 0,
      town_hall: null,
    });
    live.flush();
    expect([...map.keys()][0]).toContain(`.v${DEV_SESSION_SCHEMA_VERSION}.`);
  });

  it("does NOT read a v3 blob, so a pre-crisis city is orphaned rather than half-read", () => {
    const { storage, map } = memStorage();
    const live = store(storage);
    const key = live.storageKey();
    // The same payload under the previous version's key — which is what a browser that last
    // visited before this change is holding.
    map.set(
      key.replace(`.v${DEV_SESSION_SCHEMA_VERSION}.`, ".v3."),
      JSON.stringify({
        version: 3,
        saved_at: "2026-07-29T12:00:00.000Z",
        city: { node_states: [], neighborhood_states: [], placements: [] },
      }),
    );
    expect(live.load()).toBeNull();
    // Orphaned, not deleted: `discard()` removes the CURRENT key, so the v3 payload is still
    // sitting there unread. That is the trade a key-versioned store makes, stated.
    expect(map.has(key.replace(`.v${DEV_SESSION_SCHEMA_VERSION}.`, ".v3."))).toBe(true);
  });

  it("did NOT bump the ECONOMY version, so a saved wallet survives to fund the repairs", () => {
    // The two stores are siblings precisely so this is true. A player whose island resets
    // keeps the material they will need — and the economy change here is a WIDENING (one more
    // legal spend reason), which `economyPersistence.ts` already argues needs no bump: no
    // stored row's meaning moved.
    expect(ECONOMY_DEV_SCHEMA_VERSION).toBe(4);
  });

  it("discards the WHOLE blob when crisis_damage is malformed", () => {
    const { storage, map } = memStorage();
    const live = store(storage);
    const key = live.storageKey();
    const city = {
      node_states: [],
      neighborhood_states: [],
      placements: [],
      roads: [],
      road_gold_spent: 0,
      town_hall: null,
    };
    const forgeries: readonly [string, unknown][] = [
      ["not an object", 7],
      [
        "a rewound mint, which would re-issue an id the ledger has already charged",
        {
          next_damage_id: 1,
          ruined_buildings: [{ node_id: "NUM.3", damage_id: "d1" }],
          ruined_cells: [],
          suspended_civic: [],
        },
      ],
      [
        "a mint below one",
        { next_damage_id: 0, ruined_buildings: [], ruined_cells: [], suspended_civic: [] },
      ],
      [
        "a ruin with no damage id, so its repair could not be keyed",
        {
          next_damage_id: 2,
          ruined_buildings: [{ node_id: "NUM.3" }],
          ruined_cells: [],
          suspended_civic: [],
        },
      ],
      [
        "a damage id this code never mints",
        {
          next_damage_id: 2,
          ruined_buildings: [{ node_id: "NUM.3", damage_id: "winter-1" }],
          ruined_cells: [],
          suspended_civic: [],
        },
      ],
      [
        "a missing collection",
        { next_damage_id: 2, ruined_buildings: [], ruined_cells: [] },
      ],
      [
        "a cell that is not a string key",
        {
          next_damage_id: 2,
          ruined_buildings: [],
          ruined_cells: [{ cell: 4, damage_id: "d1" }],
          suspended_civic: [],
        },
      ],
    ];

    for (const [label, crisis_damage] of forgeries) {
      map.set(
        key,
        JSON.stringify({
          version: DEV_SESSION_SCHEMA_VERSION,
          saved_at: "2026-07-30T12:00:00.000Z",
          city: { ...city, crisis_damage },
        }),
      );
      expect(store(storage).load(), label).toBeNull();
    }

    // ...and the guard is not simply rejecting everything: the well-formed shape parses.
    map.set(
      key,
      JSON.stringify({
        version: DEV_SESSION_SCHEMA_VERSION,
        saved_at: "2026-07-30T12:00:00.000Z",
        city: {
          ...city,
          crisis_damage: foldCrisisDamage(NO_CRISIS_DAMAGE, {
            buildings: ["NUM.3"],
            cells: ["4,0"],
          }),
        },
      }),
    );
    expect(store(storage).load()?.crisis_damage?.ruined_buildings).toHaveLength(1);
  });
});
