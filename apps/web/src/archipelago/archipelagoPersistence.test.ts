import { NO_CRISIS_DAMAGE } from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";
import { TOWN_HALL_ID } from "../city/townHall";
import type { DevSessionStorage } from "../devPersistence/devSession";
import {
  ARCHIPELAGO_SCHEMA_VERSION,
  createArchipelagoStore,
  parseStoredArchipelago,
} from "./archipelagoPersistence";
import {
  archipelagoFrom,
  foundIsland,
  foundingLayout,
  type IslandLayout,
} from "./islandState";

/**
 * **DOES A BAY SURVIVE A RELOAD, AND DOES A BAD ONE TAKE THE CITY WITH IT?**
 *
 * Two claims, and the second is the one that needs the harder evidence. Round-tripping is easy
 * to assert and easy to get right; what `devSession.ts` calls *"a stale blob half-loading into
 * new code"* is the failure that actually costs a learner something, so most of this file
 * drives malformed blobs through the real parser and asserts the whole thing is refused.
 *
 * A fake storage rather than `localStorage`, so these run under node with no jsdom and cannot
 * leak between files.
 */

const ERA_ONE = (ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number]).id;
const ERA_TWO = (ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number]).id;

function fakeStorage(seed: Record<string, string> = {}): DevSessionStorage & {
  readonly map: Map<string, string>;
} {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

const A_LAYOUT: IslandLayout = {
  ...foundingLayout(),
  placements: [{ nodeId: "NUM.S", col: 4, row: 4, rot: 0 }],
  roads: [{ col: 0, row: 3 }],
  road_gold_spent: 10,
  civic_material_spent: 120,
};

function store(storage: DevSessionStorage) {
  return createArchipelagoStore({ storage, enabled: true });
}

describe("a bay across a reload", () => {
  it("comes back with every island except the one the learner is standing on", () => {
    const storage = fakeStorage();
    const saved = store(storage);
    let bay = archipelagoFrom(ERA_ONE, A_LAYOUT);
    bay = foundIsland(bay, ERA_TWO, foundingLayout());
    saved.write(bay);

    // A fresh store over the same storage — a reload.
    const restored = store(storage).read(ERA_TWO);
    expect(restored.map((island) => island.eraId)).toEqual([ERA_ONE]);
    expect(restored[0]?.layout.placements).toEqual([
      { nodeId: "NUM.S", col: 4, row: 4, rot: 0 },
    ]);
    expect(restored[0]?.layout.road_gold_spent).toBe(10);
    expect(restored[0]?.layout.civic_material_spent).toBe(120);
    expect(restored[0]?.layout.town_hall?.nodeId).toBe(TOWN_HALL_ID);
  });

  /**
   * **THE STANDING ISLAND IS DROPPED ON THE WAY OUT, not merely left out on the way in.**
   *
   * Injection that fails this: drop the filter in `read`, and the bay hands back a copy of the
   * live city frozen at the last landfall — two writers for one island, with `devSessionStore`
   * holding the fresh one and no rule for which wins.
   */
  it("refuses to hand back a stale copy of the island under the learner's feet", () => {
    const storage = fakeStorage();
    let bay = archipelagoFrom(ERA_ONE, A_LAYOUT);
    bay = foundIsland(bay, ERA_TWO, foundingLayout());
    store(storage).write(bay);

    expect(
      store(storage)
        .read(ERA_ONE)
        .map((i) => i.eraId),
    ).toEqual([ERA_TWO]);
    expect(
      store(storage)
        .read(ERA_TWO)
        .map((i) => i.eraId),
    ).toEqual([ERA_ONE]);
  });

  it("reads nothing at all before anything has been written", () => {
    expect(store(fakeStorage()).read(ERA_ONE)).toEqual([]);
  });
});

describe("a blob that is not exactly right", () => {
  const key = `cr.archipelago.v${ARCHIPELAGO_SCHEMA_VERSION}.local`;

  function refuses(label: string, blob: unknown): void {
    it(`refuses ${label}, and deletes the key`, () => {
      const storage = fakeStorage({ [key]: JSON.stringify(blob) });
      expect(store(storage).read(ERA_TWO)).toEqual([]);
      // Deleted rather than left to be re-read on the next load, exactly as the dev store does.
      expect(storage.map.has(key)).toBe(false);
    });
  }

  const good = {
    version: ARCHIPELAGO_SCHEMA_VERSION,
    islands: [{ eraId: ERA_ONE, layout: A_LAYOUT }],
  };

  refuses("a different schema version", {
    ...good,
    version: ARCHIPELAGO_SCHEMA_VERSION + 1,
  });
  refuses("an era the sequence does not author", {
    ...good,
    islands: [{ eraId: "atlantis", layout: A_LAYOUT }],
  });
  refuses("the same era twice", {
    ...good,
    islands: [
      { eraId: ERA_ONE, layout: A_LAYOUT },
      { eraId: ERA_ONE, layout: foundingLayout() },
    ],
  });
  refuses("a placement that is not on a whole cell", {
    ...good,
    islands: [
      {
        eraId: ERA_ONE,
        layout: {
          ...A_LAYOUT,
          placements: [{ nodeId: "NUM.S", col: 1.5, row: 0, rot: 0 }],
        },
      },
    ],
  });
  refuses("a negative material spend", {
    ...good,
    islands: [{ eraId: ERA_ONE, layout: { ...A_LAYOUT, civic_material_spent: -1 } }],
  });
  refuses("a rewound damage mint", {
    ...good,
    islands: [
      {
        eraId: ERA_ONE,
        layout: {
          ...A_LAYOUT,
          crisis_damage: {
            ruined_buildings: [{ node_id: "NUM.S", damage_id: "d7" }],
            ruined_cells: [],
            suspended_civic: [],
            next_damage_id: 2,
          },
        },
      },
    ],
  });

  it("refuses text that is not JSON at all", () => {
    expect(parseStoredArchipelago("{not json")).toBeNull();
  });

  /**
   * The other direction, so the refusals above are not passing over a parser that refuses
   * everything: the same blob, unmodified, parses.
   */
  it("accepts the blob every case above was a mutation of", () => {
    const islands = parseStoredArchipelago(JSON.stringify(good));
    expect(islands).not.toBeNull();
    expect(islands?.map((island) => island.eraId)).toEqual([ERA_ONE]);
    expect(islands?.[0]?.layout.crisis_damage).toEqual(NO_CRISIS_DAMAGE);
  });
});

describe("the store's own gate", () => {
  it("touches nothing at all while it is disabled", () => {
    const storage = fakeStorage();
    const off = createArchipelagoStore({ storage, enabled: false });
    off.write(archipelagoFrom(ERA_ONE, A_LAYOUT));
    expect(storage.map.size).toBe(0);
    expect(off.read(ERA_TWO)).toEqual([]);
    expect(off.storageKey()).toBe("");
  });

  it("keeps its own key, so a city bump cannot delete the bay and the reverse", () => {
    const storage = fakeStorage();
    store(storage).write(archipelagoFrom(ERA_ONE, A_LAYOUT));
    const keys = [...storage.map.keys()];
    expect(keys).toHaveLength(1);
    expect(keys[0]).toContain("cr.archipelago.v");
    expect(keys[0]).not.toContain("cr.devSession");
  });
});
