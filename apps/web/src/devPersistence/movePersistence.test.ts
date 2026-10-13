import { describe, expect, it } from "vitest";

import { type CityDevSession, createCityDevSession } from "../city/citySession";
import { civicTestPayment } from "../city/civicTestSupport";
import type { CityLoad } from "../city/types";
import {
  BUILDABLE_RADIUS,
  findOpenCell,
  footprintFor,
  occupiedCells,
  type PlacedTransform,
  type Transform,
} from "../city/worldLayout";
import {
  createDevSessionStore,
  type DevSessionStorage,
  withDevPersistence,
} from "./devSession";

/**
 * Regression coverage for RELOCATION on the dev-persistence path.
 *
 * The move feature was verified via the UNPERSISTED `?mock` session, while the
 * real app runs the session wrapped in {@link withDevPersistence}. These tests
 * exercise `moveSkill` specifically through that wrapper and across a snapshot
 * save/restore, so a move can never silently fail to persist the way placement
 * round-trips already cover.
 *
 * The Town Hall is PRE-SEEDED at the island centre (design 2026-07-26), so skills
 * are placed CLEAR of the origin block; the hall itself is only ever relocated.
 */

function memStorage(): DevSessionStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

/** Two microtasks so the wrapper's fire-and-forget capture settles. */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

/** Enough era material that a civic purchase here is never refused on price. */
const RICH = 100_000;

/**
 * A legal spot for a campfire on whatever is already standing.
 *
 * DERIVED rather than a literal, for the reason `civicPurchase.test.ts` states at
 * length: era one's island is a 22-unit disc on a 4-unit grid, so a hardcoded cell tests
 * the geometry of the disc and fails looking exactly like a broken purchase path. Here it
 * also has to keep working after a campfire is already down, since `moveCivic` asks for a
 * second spot with the first one occupied.
 */
async function openSpotFor(session: CityDevSession): Promise<Transform> {
  const load = await session.load();
  const others: PlacedTransform[] = [
    ...(load.placements ?? []),
    ...(load.town_hall ? [load.town_hall] : []),
    ...(load.civic ?? []),
  ];
  const nodeId = `civic:prehistoric_campfire:${Number.MAX_SAFE_INTEGER}`;
  const spot = findOpenCell(
    footprintFor(nodeId),
    occupiedCells(others),
    BUILDABLE_RADIUS,
    0,
    {
      nodeId,
      others,
    },
  );
  if (!spot) {
    throw new Error("the island has no legal spot left for a campfire");
  }
  return spot;
}

function placementFor(load: CityLoad, nodeId: string): PlacedTransform | undefined {
  return (load.placements ?? []).find((p) => p.nodeId === nodeId);
}

describe("relocation persists through withDevPersistence", () => {
  it("an immediate move through the wrapper updates the re-read placement", async () => {
    const store = createDevSessionStore({
      storage: memStorage(),
      enabled: true,
      debounceMs: 0,
    });
    const session = withDevPersistence(createCityDevSession(), store);

    await session.placeSkill("NUM.S", { col: 2, row: 0, rot: 0 });
    await settle();
    await session.moveSkill("NUM.S", { col: 3, row: 0, rot: 0 });
    await settle();

    expect(placementFor(await session.load(), "NUM.S")).toMatchObject({ col: 3, row: 0 });
  });

  it("a move survives a snapshot save -> restore round trip", async () => {
    const storage = memStorage();
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });
    const session = withDevPersistence(createCityDevSession(), store);

    await session.placeSkill("NUM.S", { col: 2, row: 0, rot: 0 });
    await session.moveSkill("NUM.S", { col: 2, row: 2, rot: 0 });
    await settle();
    store.flush();

    const rehydrated = createCityDevSession(
      createDevSessionStore({ storage, enabled: true }).load(),
    );
    expect(placementFor(await rehydrated.load(), "NUM.S")).toMatchObject({
      col: 2,
      row: 2,
    });
  });

  it("a building placed, RELOADED (restored), can still be moved (single + multi)", async () => {
    const storage = memStorage();
    const store1 = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });
    const session1 = withDevPersistence(createCityDevSession(), store1);
    // A little settlement of roots, none overlapping, all clear of the centre hub.
    await session1.placeSkill("NUM.S", { col: 2, row: 0, rot: 0 }); // 2x2
    await session1.placeSkill("NUM.F", { col: -1, row: -2, rot: 0 }); // 2x1
    await session1.placeSkill("NUM.3", { col: -2, row: -1, rot: 0 }); // 1x1
    await settle();
    store1.flush();

    // Reload: a fresh wrapped session restored from the store.
    const store2 = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });
    const session2 = withDevPersistence(createCityDevSession(store2.load()), store2);
    expect(placementFor(await session2.load(), "NUM.S")).toMatchObject({
      col: 2,
      row: 0,
    });

    // The restored building moves to open ground (ignore-self holds; others block).
    await session2.moveSkill("NUM.S", { col: 2, row: 2, rot: 0 });
    await settle();
    expect(placementFor(await session2.load(), "NUM.S")).toMatchObject({ col: 2, row: 2 });

    // And the move persists across ANOTHER reload.
    store2.flush();
    const store3 = createDevSessionStore({ storage, enabled: true });
    const session3 = createCityDevSession(store3.load());
    expect(placementFor(await session3.load(), "NUM.S")).toMatchObject({ col: 2, row: 2 });
  });

  it("persists a rotated non-square footprint move (Park 1x2 -> rotated 2x1)", async () => {
    const storage = memStorage();
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });
    const session = withDevPersistence(createCityDevSession(), store);

    await session.placeSkill("NUM.4", { col: 2, row: 0, rot: 0 }); // Park, 1x2
    await session.moveSkill("NUM.4", { col: 2, row: 2, rot: 1 }); // rotate to 2x1 at open ground
    await settle();
    store.flush();

    const rehydrated = createCityDevSession(store.load());
    expect(placementFor(await rehydrated.load(), "NUM.4")).toMatchObject({
      col: 2,
      row: 2,
      rot: 1,
    });
  });

  it("leaves node state (mastery/stage) untouched across a move + round trip", async () => {
    const storage = memStorage();
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });
    const session = withDevPersistence(createCityDevSession(), store);

    await session.placeSkill("NUM.S", { col: 2, row: 0, rot: 0 });
    await session.advanceMasteryDev("NUM.S", 2);
    await session.moveSkill("NUM.S", { col: 2, row: 2, rot: 0 });
    await settle();
    store.flush();

    const rehydrated = createCityDevSession(store.load());
    const state = (await rehydrated.load()).node_states.find((s) => s.node_id === "NUM.S");
    expect(state?.mastery).toBe(2);
    expect(state?.completion_status).toBe("complete");
    expect(placementFor(await rehydrated.load(), "NUM.S")).toMatchObject({
      col: 2,
      row: 2,
    });
  });

  it("keeps a civic deleted across a local snapshot round trip without refunding", async () => {
    const storage = memStorage();
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });
    const session = withDevPersistence(createCityDevSession(), store);
    const bought = await session.placeCivic(
      "campfire",
      await openSpotFor(session),
      civicTestPayment(RICH),
    );
    expect(bought.placementId).not.toBeNull();
    const spent = session.civicMaterialSpent();

    await session.removeCivic(bought.placementId as string);
    store.flush();

    const rehydrated = createCityDevSession(
      createDevSessionStore({ storage, enabled: true }).load(),
    );
    expect((await rehydrated.load()).civic).toEqual([]);
    expect(rehydrated.civicMaterialSpent()).toBe(spent);
  });

  /**
   * **EVERY MUTATOR PERSISTS, AND "EVERY" IS DERIVED FROM THE SESSION RATHER THAN
   * WRITTEN DOWN HERE.**
   *
   * The defect class is a session method silently missing from the persisted wrapper —
   * `moveSkill` was, before this lane — which loses whatever the learner just did on the
   * next reload with nothing to say so.
   *
   * ⚑ THIS TABLE USED TO BE A LIST OF EIGHT NAMES UNDER A TEST CALLED *"every mutator"*,
   * AND `CityDevSession` HAS TWELVE. Measured rather than argued, at `de43b481`: strip
   * `capture()` from `layRoads`, `removeRoads`, `repairRuinedBuilding` AND
   * `reclaimRuinedCell` all at once and this file reported **6 passed, 0 failed**. The
   * coverage was not absent — `roadsPersistence.test.ts` and
   * `crisisDamagePersistence.test.ts` caught it, 3 failed across 2 files — but the guard
   * whose whole job was exhaustiveness was scoped to a hand-maintained subset, so a
   * THIRTEENTH mutator arriving with no capture would have been caught by nothing.
   *
   * So the population is now `Object.keys` of a real session, partitioned by set
   * equality against a named list of the pure reads. A new method fails here until it is
   * classified as one or the other, which is the point: the classification is the
   * decision, and the guard should not let it be made by omission.
   */
  const PURE_READS: ReadonlyMap<string, string> = new Map([
    ["studentId", "a constant, not a method"],
    ["load", "the read the capture itself calls — capturing here would recurse"],
    ["roadGoldSpent", "returns the counter `layRoads`/`removeRoads` already captured"],
    [
      "crisisDamage",
      "returns the value the record/repair/reclaim mutators already captured",
    ],
    [
      "civicMaterialSpent",
      "the material-side twin of `roadGoldSpent` — returns the counter `placeCivic` " +
        "already captured, and `moveCivic` deliberately never touches",
    ],
  ]);

  /** One call per mutator, chosen to actually exercise it rather than to no-op. */
  const run: Record<string, (s: CityDevSession) => unknown> = {
    moveTownHall: (s) => s.moveTownHall({ col: 2, row: 2, rot: 0 }),
    placeSkill: (s) => s.placeSkill("NUM.F", { col: 2, row: 2, rot: 0 }),
    moveSkill: (s) => s.moveSkill("NUM.S", { col: 0, row: 2, rot: 0 }),
    layRoads: (s) => s.layRoads([{ col: 4, row: 4 }], 1000),
    removeRoads: (s) => s.removeRoads([{ col: 4, row: 4 }]),
    // The way IN. Driven with a subject the seeded city really has, so this exercises a fold
    // that records something rather than one over an empty report.
    recordCrisisDamage: (s) => s.recordCrisisDamage({ buildings: ["NUM.S"], cells: [] }),
    repairRuinedBuilding: (s) => s.repairRuinedBuilding("NUM.S"),
    reclaimRuinedCell: (s) => s.reclaimRuinedCell({ col: 4, row: 4 }),
    // The third clear, and driven against a suspension the city really carries for the
    // same reason `moveCivic` is driven against a building that is really standing: a lift
    // aimed at nothing returns `{cleared: false}` and would prove only that the forwarder
    // exists. The loop below buys and suspends before it starts counting saves.
    liftSuspendedCivic: async (s) => {
      const standing = (await s.load()).civic?.[0];
      if (!standing) {
        throw new Error("liftSuspendedCivic was driven with nothing suspended to lift");
      }
      return s.liftSuspendedCivic(standing.nodeId);
    },
    verifyOverwrittenRecord: (s) => {
      const record = s.crisisDamage().overwritten_records[0];
      if (!record) {
        throw new Error("verifyOverwrittenRecord was driven with no record to verify");
      }
      return s.verifyOverwrittenRecord(record.damage_id, 2);
    },
    attemptStorm: (s) => s.attemptStorm("D1"),
    advanceMasteryDev: (s) => s.advanceMasteryDev("NUM.S", 2),
    markLessonTaught: (s) => s.markLessonTaught("NUM.S"),
    setStageDev: (s) => s.setStageDev("NUM.S", "construction"),
    seedFromPlacement: (s) => s.seedFromPlacement({ "NUM.S": 2 }, ["NUM.S"]),
    placeCivic: async (s) =>
      s.placeCivic("campfire", await openSpotFor(s), civicTestPayment(RICH)),
    // A REAL relocation, not a no-op against an id nothing minted: the loop below buys
    // the campfire before it starts counting saves, so what this drives is a move of a
    // building that is standing, and the save it must produce is the move's own.
    moveCivic: async (s) => {
      const standing = (await s.load()).civic?.[0];
      if (!standing) {
        throw new Error("moveCivic was driven with nothing bought to move");
      }
      return s.moveCivic(standing.nodeId, await openSpotFor(s));
    },
    removeCivic: async (s) => {
      const standing = (await s.load()).civic?.[0];
      if (!standing) {
        throw new Error("removeCivic was driven with nothing bought to remove");
      }
      return s.removeCivic(standing.nodeId);
    },
    restoreCivicAfterFailedRemoval: async (s) =>
      s.restoreCivicAfterFailedRemoval({
        nodeId: "civic:prehistoric_campfire:19",
        ...(await openSpotFor(s)),
      }),
    // The catch-up's inherited seeding — a real seat on real open ground, so what this drives
    // is a write that lands rather than a batch the placement gate throws away. Its failure
    // without a capture is the road one: a city the walk furnished would reload unfurnished,
    // and the walk runs once, at the hand-off, so the buildings would be gone for good.
    seedCivicBuildings: async (s) => {
      const written = await s.seedCivicBuildings([
        { nodeId: "civic:prehistoric_campfire:9", ...(await openSpotFor(s)) },
      ]);
      if (written.length !== 1) {
        throw new Error("seedCivicBuildings was driven with a seat it refused");
      }
      return written;
    },
  };

  /** A store whose writes are counted, plus the wrapped session over it. */
  function counting(): { session: CityDevSession; flush: () => void; saves: () => number } {
    let saves = 0;
    const storage: DevSessionStorage = {
      getItem: () => null,
      setItem: () => {
        saves += 1;
      },
      removeItem: () => {},
    };
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });
    return {
      session: withDevPersistence(createCityDevSession(), store),
      flush: () => store.flush(),
      saves: () => saves,
    };
  }

  it("classifies every member of CityDevSession as a driven mutator or a named read", () => {
    const members = Object.keys(createCityDevSession());
    // A floor under the derivation: an `Object.keys` that has stopped returning the
    // members would make every set comparison below trivially satisfiable.
    expect(members.length).toBeGreaterThanOrEqual(18);
    expect(new Set(members)).toEqual(new Set([...PURE_READS.keys(), ...Object.keys(run)]));
    // And the mutator half is the larger one. Named so the two lists cannot be
    // rebalanced into "one mutator plus eleven excuses" while the equality still holds.
    expect(Object.keys(run).length).toBeGreaterThanOrEqual(14);
    // The wrapper must expose the same surface it wraps — nothing dropped on the way
    // through, which is the other half of "silently missing from the wrapper".
    expect(new Set(Object.keys(counting().session))).toEqual(new Set(members));
  });

  it("saves a fresh snapshot after every one of them", async () => {
    for (const [method, act] of Object.entries(run)) {
      const { session, flush, saves } = counting();
      expect(typeof (session as unknown as Record<string, unknown>)[method]).toBe(
        "function",
      );
      // Seed a placed skill (clear of the pre-seeded hub) where the act needs one.
      if (method !== "placeSkill" && method !== "seedFromPlacement") {
        await session.placeSkill("NUM.S", { col: 2, row: 0, rot: 0 });
        await settle();
      }
      // The two mutators whose subject must be bought first, and buying it here rather
      // than inside the runner is what keeps their assertions honest — the purchase's own
      // save lands before `before` is read.
      if (
        method === "moveCivic" ||
        method === "removeCivic" ||
        method === "liftSuspendedCivic"
      ) {
        const bought = await session.placeCivic(
          "campfire",
          await openSpotFor(session),
          civicTestPayment(RICH),
        );
        await settle();
        if (method === "liftSuspendedCivic") {
          if (bought.placementId === null) {
            throw new Error("the fixture campfire was not bought, so nothing can suspend");
          }
          await session.recordCrisisDamage({
            buildings: [],
            cells: [],
            suspended_civic: [bought.placementId],
          });
          await settle();
        }
      }
      if (method === "verifyOverwrittenRecord") {
        await session.recordCrisisDamage({
          buildings: [],
          cells: [],
          overwritten_records: [
            {
              placement_id: "civic:information_age_food_warehouse:1",
              bands_dark: 4,
            },
          ],
        });
        await settle();
      }
      flush();
      const before = saves();

      await act(session);
      await settle();
      flush();
      expect(
        saves() - before,
        `mutator ${method} should persist a snapshot`,
      ).toBeGreaterThan(0);
    }
  });

  it("keeps each named read honest — it must exist, and it must not capture", async () => {
    // The backwards direction. A read that starts writing is a mutator with an excuse
    // still attached, and the set equality above would go on passing.
    const drive: Record<string, (s: CityDevSession) => unknown> = {
      studentId: (s) => s.studentId,
      load: (s) => s.load(),
      roadGoldSpent: (s) => s.roadGoldSpent(),
      crisisDamage: (s) => s.crisisDamage(),
      civicMaterialSpent: (s) => s.civicMaterialSpent(),
    };
    expect(new Set(Object.keys(drive))).toEqual(new Set(PURE_READS.keys()));

    for (const [name, why] of PURE_READS) {
      expect(why.length).toBeGreaterThan(10);
      const { session, flush, saves } = counting();
      await session.placeSkill("NUM.S", { col: 2, row: 0, rot: 0 });
      await settle();
      flush();
      const before = saves();

      await drive[name]?.(session);
      await settle();
      flush();
      expect(saves() - before, `${name} is listed as a pure read but it wrote`).toBe(0);
    }
  });
});
