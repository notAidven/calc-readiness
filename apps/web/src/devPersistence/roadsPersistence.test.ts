import { describe, expect, it } from "vitest";

import { createCityDevSession } from "../city/citySession";
import { ROAD_TILE_GOLD_COST } from "../city/roads";
import {
  createDevSessionStore,
  type DevSessionStorage,
  withDevPersistence,
} from "./devSession";

/** A localStorage stand-in backed by a plain map. */
function memoryStorage(): DevSessionStorage {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
  };
}

/** Let the wrapper's post-mutation snapshot capture (a microtask) settle. */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("dev persistence — roads survive a refresh round-trip", () => {
  it("restores laid roads AND the spent total through the wrapper", async () => {
    const storage = memoryStorage();
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });

    // The production path: App wraps the session, then the city lays roads on it.
    // Roads are laid clear of the pre-seeded Town Hall hub (the 3×2 centre block).
    const session = withDevPersistence(createCityDevSession(), store);
    await session.layRoads(
      [
        { col: 0, row: 3 },
        { col: 1, row: 3 },
        { col: 2, row: 3 },
      ],
      100_000,
    );
    await settle();
    store.flush();

    const before = await session.load();
    expect(before.roads).toHaveLength(3);
    expect(before.road_gold_spent).toBe(3 * ROAD_TILE_GOLD_COST);

    // A fresh session opened on the saved snapshot is the session that was saved.
    const rehydrated = createCityDevSession(
      createDevSessionStore({ storage, enabled: true }).load(),
    );
    const after = await rehydrated.load();
    expect(after.roads).toEqual(before.roads);
    expect(after.road_gold_spent).toBe(before.road_gold_spent);
    expect(rehydrated.roadGoldSpent()).toBe(3 * ROAD_TILE_GOLD_COST);
  });

  it("a removed road does not come back after a reload (removal is captured)", async () => {
    const storage = memoryStorage();
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });
    const session = withDevPersistence(createCityDevSession(), store);

    await session.layRoads(
      [
        { col: 0, row: 3 },
        { col: 1, row: 3 },
      ],
      100_000,
    );
    await settle();
    await session.removeRoads([{ col: 1, row: 3 }]);
    await settle();
    store.flush();

    const rehydrated = createCityDevSession(
      createDevSessionStore({ storage, enabled: true }).load(),
    );
    const after = await rehydrated.load();
    expect(after.roads).toEqual([{ col: 0, row: 3 }]);
    // The REFUND persists with it: the restored spend covers only the tile that is
    // still standing, so a reload can neither resurrect the road nor re-charge for
    // it (nor quietly hand the refund back a second time).
    expect(after.road_gold_spent).toBe(ROAD_TILE_GOLD_COST);
    expect(rehydrated.roadGoldSpent()).toBe(ROAD_TILE_GOLD_COST);
  });
});
