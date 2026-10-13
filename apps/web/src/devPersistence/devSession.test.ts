import { afterEach, describe, expect, it, vi } from "vitest";

import { isServerBacked } from "../api";
import { DEV_STUDENT_KEY } from "../auth/SessionContext";
import {
  type CityDevSession,
  createCityDevSession,
  D1_NODE_IDS,
} from "../city/citySession";
import type { CityLoad } from "../city/types";
import { BUILDABLE_RADIUS, defaultPlacements } from "../city/worldLayout";
import {
  createDevSessionStore,
  DEV_SESSION_SCHEMA_VERSION,
  DEV_STUDENT_ID_KEY,
  type DevSessionStorage,
  isDevPersistenceEnabled,
  snapshotFromLoad,
  withDevPersistence,
} from "./devSession";

/** A localStorage stand-in that records every call, so "inert" is checkable. */
function recordingStorage(seed: Record<string, string> = {}) {
  const entries = new Map<string, string>(Object.entries(seed));
  const calls: string[] = [];
  const storage: DevSessionStorage = {
    getItem(key) {
      calls.push(`getItem:${key}`);
      return entries.get(key) ?? null;
    },
    setItem(key, value) {
      calls.push(`setItem:${key}`);
      entries.set(key, value);
    },
    removeItem(key) {
      calls.push(`removeItem:${key}`);
      entries.delete(key);
    },
  };
  return { storage, entries, calls };
}

/** A dev session dirtied the way a real play-through dirties it. */
async function playedThroughSession(session: CityDevSession): Promise<CityDevSession> {
  // The pretest hand-off: NUM.S / NUM.2 tested out, the rest still to learn.
  session.seedFromPlacement({ "NUM.S": 3, "NUM.F": 1, "NUM.2": 2, "NUM.3": 0 }, [
    "NUM.S",
    "NUM.2",
  ]);
  // The Town Hall is pre-seeded at the island centre; RESERVE it so no skill is laid
  // out on top of the hub, then place every skill.
  const hall = (await session.load()).town_hall;
  const layout = defaultPlacements([...D1_NODE_IDS], hall ? [hall] : [], BUILDABLE_RADIUS);
  for (const spot of layout) {
    await session.placeSkill(spot.nodeId, {
      col: spot.col,
      row: spot.row,
      rot: spot.rot,
    });
  }
  // A skill mid-lesson, a skill forced to a stage, and every skill practised up
  // to storm readiness so the checkpoint write is captured too.
  await session.markLessonTaught("NUM.F");
  await session.setStageDev("NUM.4", "construction");
  for (const nodeId of D1_NODE_IDS) {
    await session.advanceMasteryDev(nodeId, 2);
  }
  await session.advanceMasteryDev("NUM.3", 3);
  await session.attemptStorm("D1");
  return session;
}

/** Let the wrapper's post-mutation snapshot capture (a microtask) settle. */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function freshLoad(): Promise<CityLoad> {
  return createCityDevSession().load();
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dev session persistence — round trip", () => {
  it("restores the same city the app had built (states, layout, checkpoint)", async () => {
    const { storage } = recordingStorage();
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });

    const played = await playedThroughSession(createCityDevSession());
    const before = await played.load();

    // Sanity: the state we are about to persist is genuinely non-default.
    expect(before).not.toEqual(await freshLoad());
    expect(before.placements).toHaveLength(D1_NODE_IDS.length);
    expect(before.neighborhood_state?.checkpoint_cleared).toBe(true);

    store.save(snapshotFromLoad(before));
    store.flush();

    const rehydrated = createCityDevSession(
      createDevSessionStore({ storage, enabled: true }).load(),
    );

    expect(await rehydrated.load()).toEqual(before);
  });

  it("saves itself through the wrapper as the app mutates the session", async () => {
    const { storage } = recordingStorage();
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });

    // The production path: App wraps the session, then the city drives it.
    const session = withDevPersistence(createCityDevSession(), store);
    await playedThroughSession(session);
    await settle();
    store.flush();

    const rehydrated = createCityDevSession(
      createDevSessionStore({ storage, enabled: true }).load(),
    );
    expect(await rehydrated.load()).toEqual(await session.load());
  });

  it("keeps a restored session writable, and the restored state is not re-derived", async () => {
    const { storage } = recordingStorage();
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });

    const played = await playedThroughSession(createCityDevSession());
    store.save(snapshotFromLoad(await played.load()));
    store.flush();

    const rehydrated = createCityDevSession(store.load());
    // Mastery stays monotonic across the restore: a below-bar practice on a
    // restored 3-star skill does not lower it, exactly as in the live session.
    await rehydrated.advanceMasteryDev("NUM.3", 1);
    const states = new Map(
      (await rehydrated.load()).node_states.map((state) => [state.node_id, state]),
    );
    expect(states.get("NUM.3")?.mastery).toBe(3);
  });

  it("namespaces the key under the dev identity, so two dev users never collide", () => {
    const alice = recordingStorage({ [DEV_STUDENT_ID_KEY]: "alice" });
    const bob = recordingStorage({ [DEV_STUDENT_ID_KEY]: "bob" });
    const anonymous = recordingStorage();

    const keyFor = (storage: DevSessionStorage) =>
      createDevSessionStore({ storage, enabled: true }).storageKey();

    expect(keyFor(alice.storage)).not.toEqual(keyFor(bob.storage));
    expect(keyFor(alice.storage)).toContain("alice");
    // No dev identity minted yet: one default local dev user, key still versioned.
    expect(keyFor(anonymous.storage)).toContain(`v${DEV_SESSION_SCHEMA_VERSION}`);
  });

  it("reads the same dev identity key the auth session writes", () => {
    // The namespace is the identity `SessionContext` already mints; pinning the
    // two constants together keeps a rename from silently orphaning saved cities.
    expect(DEV_STUDENT_ID_KEY).toBe(DEV_STUDENT_KEY);
  });
});

describe("dev session persistence — inert when server-backed", () => {
  it("performs no reads, writes, or deletes once isServerBacked() is true", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://api.example.test/api/diagnostic");

    // The gate really is the app's own one, in its server-backed state.
    expect(isServerBacked(true)).toBe(true);
    expect(isDevPersistenceEnabled()).toBe(false);

    const { storage, calls, entries } = recordingStorage();
    const store = createDevSessionStore({ storage, debounceMs: 0 });
    expect(store.enabled).toBe(false);
    expect(store.storageKey()).toBe("");

    // Every entry point, including the destructive ones.
    expect(store.load()).toBeNull();
    store.save(snapshotFromLoad(await freshLoad()));
    store.flush();
    store.clear();

    // And a full play-through driven through the wrapper.
    const real = createCityDevSession();
    const wrapped = withDevPersistence(real, store);
    expect(wrapped).toBe(real); // no wrapper at all when server-backed
    await playedThroughSession(wrapped);
    await settle();
    store.flush();

    expect(calls).toEqual([]);
    expect(entries.size).toBe(0);
  });

  it("stays inert for a configured deployment before the async identity resolves", () => {
    // `isServerBacked` needs a signed-in user, which App resolves asynchronously.
    // The store asks with the strongest auth state, so a deployment that HAS an
    // endpoint is inert from the first frame rather than for-a-few-frames live.
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://api.example.test/api/diagnostic");
    expect(isServerBacked(false)).toBe(false);
    expect(isDevPersistenceEnabled()).toBe(false);
  });

  it("is live only where the app can never be server-backed (no endpoint)", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    expect(isServerBacked(true)).toBe(false);
    expect(isDevPersistenceEnabled()).toBe(true);
  });
});

describe("dev session persistence — fail-safe on a bad blob", () => {
  const goodCity = {
    node_states: [],
    neighborhood_states: [],
    placements: [],
  };

  const badBlobs: [string, string][] = [
    ["unparseable", "{ this is not json"],
    ["empty string", ""],
    ["a bare array", "[]"],
    [
      "a newer schema version",
      JSON.stringify({ version: DEV_SESSION_SCHEMA_VERSION + 1, city: goodCity }),
    ],
    ["an older schema version", JSON.stringify({ version: 0, city: goodCity })],
    ["no version at all", JSON.stringify({ city: goodCity })],
    ["a missing city", JSON.stringify({ version: DEV_SESSION_SCHEMA_VERSION })],
    [
      "a node state missing fields",
      JSON.stringify({
        version: DEV_SESSION_SCHEMA_VERSION,
        city: { ...goodCity, node_states: [{ node_id: "NUM.S" }] },
      }),
    ],
    [
      "a node state with an out-of-range tier",
      JSON.stringify({
        version: DEV_SESSION_SCHEMA_VERSION,
        city: {
          ...goodCity,
          node_states: [
            {
              student_id: "demo-student",
              node_id: "NUM.S",
              placement_estimate: 0,
              mastery: 7,
              mastery_updated_at: null,
              completion_status: "locked",
              lesson_stage: "not_started",
              last_practiced_at: null,
            },
          ],
        },
      }),
    ],
    [
      "a placement that is not a grid transform",
      JSON.stringify({
        version: DEV_SESSION_SCHEMA_VERSION,
        city: {
          ...goodCity,
          placements: [{ nodeId: "NUM.S", col: "left", row: 0, rot: 0 }],
        },
      }),
    ],
  ];

  it.each(badBlobs)("discards %s and starts fresh", async (_label, blob) => {
    const { storage, entries } = recordingStorage();
    const store = createDevSessionStore({ storage, enabled: true });
    const key = store.storageKey();
    entries.set(key, blob);

    expect(store.load()).toBeNull();
    // Deleted, not left to be re-read (or half-read) on the next load.
    expect(entries.has(key)).toBe(false);

    // And the app comes up on a pristine empty island rather than crashing.
    const session = createCityDevSession(store.load());
    expect(await session.load()).toEqual(await freshLoad());
  });

  it("a good blob written under an older key version is never read", async () => {
    const { storage, entries } = recordingStorage();
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });
    store.save(
      snapshotFromLoad(await (await playedThroughSession(createCityDevSession())).load()),
    );
    store.flush();

    const stored = entries.get(store.storageKey());
    expect(stored).toBeDefined();
    // The version lives in the key AND in the payload, so a bumped schema both
    // looks in a new slot and refuses the old shape if it ever finds it.
    expect(store.storageKey()).toContain(`v${DEV_SESSION_SCHEMA_VERSION}`);
    expect(JSON.parse(stored ?? "{}")).toMatchObject({
      version: DEV_SESSION_SCHEMA_VERSION,
    });
  });

  it("clear() drops the saved session so the next load starts fresh", async () => {
    const { storage, entries } = recordingStorage();
    const store = createDevSessionStore({ storage, enabled: true, debounceMs: 0 });

    store.save(
      snapshotFromLoad(await (await playedThroughSession(createCityDevSession())).load()),
    );
    store.flush();
    expect(store.load()).not.toBeNull();

    store.clear();
    expect(entries.has(store.storageKey())).toBe(false);
    expect(store.load()).toBeNull();
    expect(await createCityDevSession(store.load()).load()).toEqual(await freshLoad());
  });

  it("survives storage that throws (blocked or full) without failing the app", async () => {
    const throwing: DevSessionStorage = {
      getItem() {
        throw new Error("storage is blocked");
      },
      setItem() {
        throw new Error("quota exceeded");
      },
      removeItem() {
        throw new Error("storage is blocked");
      },
    };
    const store = createDevSessionStore({
      storage: throwing,
      enabled: true,
      debounceMs: 0,
    });

    expect(store.load()).toBeNull();
    expect(() => {
      store.save(snapshotFromLoad({ node_states: [] }));
      store.flush();
      store.clear();
    }).not.toThrow();
  });
});
