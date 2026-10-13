import {
  buildEventIdFor,
  DRILL_PAID_SETS_PER_ERA,
  EARN,
  findCivicBuilding,
  interleavedEventId,
  LESSON_GRANT_MASTERY_BAR,
  lessonCompleteEventId,
  lessonMaterialAmount,
} from "@cr/economy";
import type { StudentNodeState } from "@cr/state-schema";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isServerBacked } from "../api";
import type { CityLoad } from "../city/types";
import {
  createInMemoryEconomyClient,
  type InMemoryEconomyClient,
} from "../economy/economySession";
import { useEconomy } from "../economy/useEconomy";
import type { DevSessionStorage } from "./devSession";
import {
  createEconomyDevStore,
  ECONOMY_DEV_SCHEMA_VERSION,
  type EconomyDevStore,
  loadEconomyDevSnapshot,
  withEconomyDevPersistence,
} from "./economyPersistence";

/**
 * The regression suite for issue #96 — the economy used to live entirely in closure
 * variables, so a refresh emptied the ledger while `reconcileProgress` re-derived the
 * grants from learning state. That did not just lose state, it REWROTE it: a spent
 * stockpile came back and every already-paid practice set became re-payable. Every test
 * here refreshes and asserts the state that survived.
 *
 * **THE BALANCE THESE READ IS `wallet.spendable`**, not `wallet.balances.gold`. The
 * gold-drop retired that currency and the 2026-08-03 sunset retired the `balances`
 * projection with XP, so the era material's stockpile is the whole wallet.
 *
 * **AND THE SPEND THAT ROUND-TRIPS IS A CIVIC BUILDING, not a cosmetic.** The claim is
 * unchanged and is the reason this file exists — a spend cannot be re-derived from
 * learning state the way a grant can, so losing it is unrecoverable — and the civic
 * purchase is the spend the game has. It is a better fixture than the cosmetic was: it
 * is ledger-backed and idempotent per placement id, so the round trip goes through the
 * same rows everything else here reads.
 *
 * Written on the dev-persistence path and against the real in-memory adapter (the
 * precedent set by `movePersistence.test.ts` / `roadsPersistence.test.ts` in PR #90),
 * so the same core the app runs decides every balance.
 */

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

/**
 * Open the economy exactly as `createEconomyClient` does: restore the adapter from
 * the store, then wrap it so every mutation saves. Calling this twice on ONE storage
 * IS the refresh under test — the second call is a new page view that has nothing but
 * the bytes the first one left behind.
 */
function openEconomy(storage: DevSessionStorage): {
  store: EconomyDevStore;
  client: InMemoryEconomyClient;
} {
  const store = createEconomyDevStore({ storage, enabled: true });
  return {
    store,
    client: withEconomyDevPersistence(createInMemoryEconomyClient(store.load()), store),
  };
}

const D1_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;

/**
 * Era one's cheapest civic row, read off the shipped catalogue — affordable from a
 * single lesson, which pays `lessonMaterialAmount` of era one's stone.
 */
const CHEAP_BUILDING = "prehistoric_campfire";
const CHEAP_PLACEMENT = "civic:prehistoric_campfire:0";
const CHEAP_COST = findCivicBuilding(CHEAP_BUILDING)?.cost ?? 0;
/** What one era-one lesson pays, derived from the era total rather than a constant. */
const LESSON_MATERIAL = lessonMaterialAmount("prehistoric");

/**
 * A node the learner has WORKED — it carries practice evidence, which is one of the two
 * things row 1 requires (issue #102: a finish with `last_practiced_at` null is a
 * test-out pre-build and deliberately pays nothing). The other is the MASTERY BAR, so a
 * paying node here must be at `LESSON_GRANT_MASTERY_BAR` or above; these tests are about
 * the ledger surviving a refresh, so their nodes must be the paying kind and mastery 1
 * no longer is.
 */
function nodeState(nodeId: string, mastery: 0 | 1 | 2 | 3): StudentNodeState {
  return {
    student_id: "demo-student",
    node_id: nodeId,
    placement_estimate: 0,
    mastery,
    mastery_updated_at: null,
    completion_status: mastery >= 1 ? "complete" : "in_progress",
    lesson_stage: mastery >= 1 ? "done" : "practice",
    last_practiced_at: "2026-07-01T12:00:00.000Z",
  };
}

/** A finished D1 island: six completed lessons and eighteen stars. */
function finishedIsland(): CityLoad {
  return { node_states: D1_NODES.map((nodeId) => nodeState(nodeId, 3)) };
}

/** Let every awaited report inside `reconcileProgress`'s fire-and-forget task land. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("economy dev persistence — a purchase round-trips a refresh", () => {
  it("keeps the material spent, and the placement's event id with it", async () => {
    const { storage } = recordingStorage();

    const first = openEconomy(storage);
    await first.client.reportLessonComplete({ nodeId: "NUM.S" });
    const purchase = await first.client.purchaseCivicBuilding({
      placementId: CHEAP_PLACEMENT,
      building: CHEAP_BUILDING,
    });
    expect(purchase.status).toBe("spent");

    const before = await first.client.getWallet();
    expect(CHEAP_COST).toBeGreaterThan(0);
    expect(before.spendable).toBe(LESSON_MATERIAL - CHEAP_COST);

    // THE REFRESH.
    const after = openEconomy(storage);
    const wallet = await after.client.getWallet();

    // The debit survived — this is the half that used to be unrecoverable, because a
    // spend cannot be re-derived from learning state the way a grant can.
    expect(wallet.spendable).toBe(before.spendable);
    expect(wallet.materials).toEqual(before.materials);
    expect(await after.client.appliedEventIds()).toContain(
      buildEventIdFor(CHEAP_PLACEMENT),
    );
  });

  it("a re-purchase after the refresh is refused, since the spend came back with it", async () => {
    const { storage } = recordingStorage();
    const first = openEconomy(storage);
    await first.client.reportLessonComplete({ nodeId: "NUM.S" });
    await first.client.purchaseCivicBuilding({
      placementId: CHEAP_PLACEMENT,
      building: CHEAP_BUILDING,
    });

    const after = openEconomy(storage);
    const again = await after.client.purchaseCivicBuilding({
      placementId: CHEAP_PLACEMENT,
      building: CHEAP_BUILDING,
    });
    expect(again.status).toBe("already_spent");
    expect((await after.client.getWallet()).spendable).toBe(LESSON_MATERIAL - CHEAP_COST);
  });
});

describe("economy dev persistence — reconcileProgress reads the ledger, not just learning state", () => {
  it("does not refund the spend or re-toast the grants when the city reloads", async () => {
    const { storage } = recordingStorage();
    const load = finishedIsland();

    // SESSION 1 — play the island to completion through the hook the app wires, then
    // save up and buy something.
    const first = openEconomy(storage);
    const session1 = renderHook(() => useEconomy(first.client));
    await waitFor(() => {
      expect(session1.result.current.wallet).not.toBeNull();
    });
    act(() => {
      session1.result.current.reconcileProgress(load);
    });
    await waitFor(() => {
      expect(session1.result.current.reward).not.toBeNull();
    });
    const earnedMaterial = session1.result.current.wallet?.spendable ?? 0;
    expect(earnedMaterial).toBe(D1_NODES.length * LESSON_MATERIAL);

    // The spend goes through the CLIENT rather than through the hook: `useEconomy` lost
    // its `purchase` member with the shop, and a civic purchase is composed at the app
    // root (`App.placeCivic`) rather than exposed on the hook.
    await act(async () => {
      await first.client.purchaseCivicBuilding({
        placementId: CHEAP_PLACEMENT,
        building: CHEAP_BUILDING,
      });
      await session1.result.current.refresh();
    });
    const afterSpend = earnedMaterial - CHEAP_COST;
    expect(session1.result.current.wallet?.spendable).toBe(afterSpend);
    session1.unmount();

    // SESSION 2 — the refresh. The city is restored and fires `onCityLoad` again with
    // the SAME learning state, which is exactly the moment the bug struck.
    const second = openEconomy(storage);
    const session2 = renderHook(() => useEconomy(second.client));
    await waitFor(() => {
      expect(session2.result.current.wallet).not.toBeNull();
    });
    expect(session2.result.current.wallet?.spendable).toBe(afterSpend);

    act(() => {
      session2.result.current.reconcileProgress(load);
    });
    await settle();

    // Nothing re-fired: same balance, and no spurious "Earned …" reward flash.
    expect(session2.result.current.wallet?.spendable).toBe(afterSpend);
    expect(session2.result.current.reward).toBeNull();
    expect(session2.result.current.message).toBe("");
    session2.unmount();
  });

  it("reports the already-applied event ids back out of the ledger", async () => {
    const { storage } = recordingStorage();
    const first = openEconomy(storage);
    await first.client.reportLessonComplete({ nodeId: "NUM.S" });
    await first.client.reportInterleavedClear({ sessionId: "round-1" });

    // The read `useEconomy` primes its fired set from — the one form a server adapter
    // can answer too, so the hook needs no dev-only branch. A star report was the second
    // id here until row 3 went with XP.
    const applied = await openEconomy(storage).client.appliedEventIds();
    expect([...applied].sort()).toEqual(
      [lessonCompleteEventId("NUM.S"), interleavedEventId("round-1")].sort(),
    );
  });

  it("still credits genuinely new progress after a refresh", async () => {
    const { storage } = recordingStorage();
    const first = openEconomy(storage);
    const session1 = renderHook(() => useEconomy(first.client));
    await waitFor(() => {
      expect(session1.result.current.wallet).not.toBeNull();
    });
    act(() => {
      session1.result.current.reconcileProgress({
        node_states: [nodeState("NUM.S", LESSON_GRANT_MASTERY_BAR)],
      });
    });
    await waitFor(() => {
      expect(session1.result.current.reward).not.toBeNull();
    });
    session1.unmount();

    // A second visit where ONE more building finished: the new node pays, the old one
    // does not. Suppressing replays must never suppress real progress. Both nodes sit AT
    // the bar, which is what row 1 now requires — at mastery 1 neither would pay and
    // this test would be measuring a wallet that never moved.
    const second = openEconomy(storage);
    const session2 = renderHook(() => useEconomy(second.client));
    await waitFor(() => {
      expect(session2.result.current.wallet).not.toBeNull();
    });
    act(() => {
      session2.result.current.reconcileProgress({
        node_states: [
          nodeState("NUM.S", LESSON_GRANT_MASTERY_BAR),
          nodeState("NUM.F", LESSON_GRANT_MASTERY_BAR),
        ],
      });
    });
    await waitFor(() => {
      expect(session2.result.current.reward).not.toBeNull();
    });
    expect(session2.result.current.reward?.material).toBe(LESSON_MATERIAL);
    expect(session2.result.current.wallet?.spendable).toBe(2 * LESSON_MATERIAL);
    session2.unmount();
  });
});

describe("economy dev persistence — interleaved practice (row 2)", () => {
  it("survives a refresh, though nothing in CityLoad could rebuild it", async () => {
    const { storage } = recordingStorage();
    const first = openEconomy(storage);
    await first.client.reportInterleavedClear({ sessionId: "town-hall-round-1" });
    const before = await first.client.getWallet();
    expect(before.spendable).toBe(EARN.interleaved.material);

    const after = openEconomy(storage);
    // Row 2 is keyed by a `session_id` that appears nowhere in `CityLoad`, so unlike
    // row 1 it is not recomputable even in principle — storing it is the only way it
    // can survive at all.
    expect((await after.client.getWallet()).materials).toEqual(before.materials);
    expect((await after.client.getWallet()).spendable).toBe(before.spendable);
    expect(before.spendable).toBe(EARN.interleaved.material);
    expect(await after.client.appliedEventIds()).toContain(
      interleavedEventId("town-hall-round-1"),
    );

    // And its idempotency survives with it: a replayed round still pays nothing.
    const replay = await after.client.reportInterleavedClear({
      sessionId: "town-hall-round-1",
    });
    expect(replay.applied).toBe(false);
    expect((await after.client.getWallet()).materials).toEqual(before.materials);
  });

  it("cannot be replayed across a refresh, which is what the cap bypass really was", async () => {
    // **THE 24h CAP BYPASS THIS TEST WAS WRITTEN FOR NO LONGER EXISTS TO BYPASS.** It
    // used to grind forty rounds to the window ceiling, refresh, and assert that a
    // brand-new session credited NOTHING — because with an empty ledger the rolling
    // window was empty too and the full cap came back. The cap is per completed practice
    // set now, so a fresh set pays in full whether or not a refresh happened, and there
    // is no window state a reload could hand back.
    //
    // What survives, and is the half that was always load-bearing, is IDEMPOTENCY: the
    // recorded session ids have to cross the refresh, or a learner could re-report the
    // same set forever. That is asserted with a real payout on either side of the reload,
    // so it cannot pass over a wallet that never moved.
    const { storage } = recordingStorage();
    const first = openEconomy(storage);

    // One short of the era's drill bound, so there is room for a genuinely new set on
    // the far side of the reload. The bound itself is the next test.
    const ROUNDS = DRILL_PAID_SETS_PER_ERA - 1;
    for (let round = 0; round < ROUNDS; round += 1) {
      await first.client.reportInterleavedClear({ sessionId: `grind-${round}` });
    }
    const ground = await first.client.getWallet();
    expect(ground.spendable).toBe(ROUNDS * EARN.interleaved.material);

    const after = openEconomy(storage);

    // A REPLAY of a recorded set: still a no-op, and that is what had to survive.
    const replay = await after.client.reportInterleavedClear({ sessionId: "grind-0" });
    expect(replay.applied).toBe(false);
    expect(replay.grantedMaterials).toEqual({});
    expect((await after.client.getWallet()).spendable).toBe(ground.spendable);

    // A GENUINELY NEW set after the refresh: pays in full, exactly once. Suppressing a
    // replay must never suppress real work.
    const fresh = await after.client.reportInterleavedClear({ sessionId: "post-refresh" });
    expect(fresh.applied).toBe(true);
    expect(fresh.grantedMaterials.stone).toBe(EARN.interleaved.material);
    expect((await after.client.getWallet()).spendable).toBe(
      ground.spendable + EARN.interleaved.material,
    );
  });

  it("carries the DRILL BOUND across a refresh, because it is a ledger count", async () => {
    // **THE PROPERTY THAT MADE THE LEDGER THE RIGHT PLACE TO COUNT FROM.** A per-era
    // bound held in a session counter would be reset by every reload — the exact defect
    // #96 was filed for, and the reason a fresh page used to hand back the whole rolling
    // window. Counting grant rows makes the bound survive whatever the page does, and it
    // reads no instant while doing so.
    const { storage } = recordingStorage();
    const first = openEconomy(storage);
    for (let round = 0; round < DRILL_PAID_SETS_PER_ERA; round += 1) {
      const outcome = await first.client.reportInterleavedClear({
        sessionId: `bound-${round}`,
      });
      expect(outcome.grantedMaterials.stone, `set ${round}`).toBe(
        EARN.interleaved.material,
      );
      expect(outcome.setsRemaining).toBe(DRILL_PAID_SETS_PER_ERA - round - 1);
    }
    const spent = await first.client.getWallet();
    expect(spent.spendable).toBe(DRILL_PAID_SETS_PER_ERA * EARN.interleaved.material);

    // RELOAD, then work another brand-new set. Its session id has never been seen, so
    // idempotency cannot be what stops it — only the bound can.
    const after = openEconomy(storage);
    const beyond = await after.client.reportInterleavedClear({
      sessionId: "after-the-reload",
    });
    // **`applied` IS FALSE NOW, WHERE IT WAS TRUE.** Past the bound the recipe omits the
    // material key and there is no XP key left beside it, so the grant writes no row at
    // all. `setsRemaining` is what tells this apart from a replayed session id, and
    // `useEconomy` reads it for exactly that reason.
    expect(beyond.applied).toBe(false);
    expect(beyond.grantedMaterials).toEqual({});
    expect(beyond.setsRemaining).toBe(0);
    expect((await after.client.getWallet()).spendable).toBe(spent.spendable);
  });

  it("pays a FLAT material amount however long the player has been away", async () => {
    // This replaces "keeps the island's restore clock, so the repair payout is not
    // pinned at the floor". That test asserted the condition clock working; the clock
    // is sunset, so the property to hold now is its opposite. Two clears a simulated
    // fortnight apart — the old curve's full range, pristine through floored — must
    // pay identically.
    const { storage } = recordingStorage();
    const first = openEconomy(storage);
    const fresh = await first.client.reportInterleavedClear({ sessionId: "round-1" });
    expect(fresh.grantedMaterials.stone).toBe(EARN.interleaved.material);

    const realNow = Date.now;
    const twoWeeksLater = realNow() + 14 * 24 * 60 * 60 * 1000;
    Date.now = () => twoWeeksLater;
    try {
      const reopened = openEconomy(storage);
      const late = await reopened.client.reportInterleavedClear({ sessionId: "round-2" });
      expect(late.grantedMaterials.stone).toBe(fresh.grantedMaterials.stone);
    } finally {
      Date.now = realNow;
    }
  });

  it("stores no timestamp for the sunset clock, and cannot part-restore a v1 blob", () => {
    const { storage } = recordingStorage();
    const store = createEconomyDevStore({ storage, enabled: true });
    store.save({ entries: [] });

    // 1. Nothing written carries the field any more. A key CENSUS rather than one
    //    `not.toHaveProperty`, so a field nobody named fails here too. It was three keys
    //    until the 2026-08-03 sunset took `owned_prestige` and `equipped` with the shop.
    const written = JSON.parse(storage.getItem(store.storageKey()) ?? "{}");
    expect(written.version).toBe(ECONOMY_DEV_SCHEMA_VERSION);
    expect(Object.keys(written.economy).sort()).toEqual(["entries"]);

    // 2. A v1 blob is not merely ignored, it is unreachable: the version is part of
    //    the storage key, so a v1 payload is never fetched at all.
    expect(store.storageKey()).toContain(`.v${ECONOMY_DEV_SCHEMA_VERSION}.`);
    expect(ECONOMY_DEV_SCHEMA_VERSION).toBeGreaterThan(1);

    // 3. And forced onto TODAY's key it is rejected WHOLE rather than field by field.
    //    The ledger row below is perfectly valid and still does not survive, which is
    //    the property that matters: there is no partial restore in which the removed
    //    clock leaves a half-populated wallet behind.
    storage.setItem(
      store.storageKey(),
      JSON.stringify({
        version: 1,
        saved_at: new Date().toISOString(),
        economy: {
          entries: [
            {
              student_id: "demo-student",
              event_id: "lesson_complete:NUM.S",
              resource_type: "stone",
              kind: "grant",
              amount: 15,
              reason_code: "lesson_complete",
              created_at: new Date().toISOString(),
            },
          ],
          owned_prestige: ["prestige-a"],
          equipped: {},
          last_restored_at_ms: { D1: 1_700_000_000_000 },
        },
      }),
    );
    expect(store.load()).toBeNull();
  });
});

describe("economy dev persistence — inert when server-backed", () => {
  it("performs no reads, writes, or deletes once isServerBacked() is true", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://api.example.test/api/diagnostic");
    expect(isServerBacked(true)).toBe(true);

    const { storage, calls, entries } = recordingStorage();
    const store = createEconomyDevStore({ storage });
    expect(store.enabled).toBe(false);
    expect(store.storageKey()).toBe("");

    // Every entry point, including the destructive ones.
    expect(store.load()).toBeNull();
    store.save({ entries: [] });
    store.flush();
    store.clear();

    // And a full earn→spend loop driven through the wrapper.
    const real = createInMemoryEconomyClient(null);
    const wrapped = withEconomyDevPersistence(real, store);
    expect(wrapped).toBe(real); // no wrapper at all when server-backed
    await wrapped.reportLessonComplete({ nodeId: "NUM.S" });
    await wrapped.purchaseCivicBuilding({
      placementId: CHEAP_PLACEMENT,
      building: CHEAP_BUILDING,
    });

    expect(calls).toEqual([]);
    expect(entries.size).toBe(0);
  });
});

describe("economy dev persistence — fail-safe on a bad blob", () => {
  const goodRow = {
    student_id: "demo-student",
    event_id: "lesson_complete:NUM.S",
    resource_type: "stone",
    kind: "grant",
    amount: 15,
    reason_code: "lesson_complete",
    created_at: new Date().toISOString(),
  };
  const wrap = (economy: unknown, version = ECONOMY_DEV_SCHEMA_VERSION) =>
    JSON.stringify({ version, economy });

  const badBlobs: [string, string][] = [
    ["unparseable", "{ this is not json"],
    ["empty string", ""],
    ["a bare array", "[]"],
    ["a newer schema version", wrap({ entries: [] }, ECONOMY_DEV_SCHEMA_VERSION + 1)],
    ["an older schema version", wrap({ entries: [] }, 0)],
    ["no economy at all", JSON.stringify({ version: ECONOMY_DEV_SCHEMA_VERSION })],
    ["a missing ledger", wrap({ owned_prestige: [] })],
    ["a ledger that is not an array", wrap({ entries: {} })],
    ["a row missing fields", wrap({ entries: [{ event_id: "lesson_complete:NUM.S" }] })],
    ["a row with a negative amount", wrap({ entries: [{ ...goodRow, amount: -5 }] })],
    [
      "a row whose created_at is not a date",
      wrap({ entries: [{ ...goodRow, created_at: "whenever" }] }),
    ],
    [
      "a row with an unknown resource",
      wrap({ entries: [{ ...goodRow, resource_type: "mana" }] }),
    ],
    // The forged rows: each breaks a ledger invariant the core enforces when it MINTS
    // a row, so it could only have been hand-written into storage — or written by a
    // build from before the 2026-08-03 sunset, which is the same thing to the parser.
    [
      "a row denominated in the retired xp resource",
      wrap({ entries: [{ ...goodRow, resource_type: "xp" }] }),
    ],
    [
      "a spend of xp, which the retired invariant used to catch by name",
      wrap({ entries: [{ ...goodRow, resource_type: "xp", kind: "spend" }] }),
    ],
    [
      "a cosmetic purchase from before the shop was sunset",
      wrap({
        entries: [
          { ...goodRow, kind: "spend", reason_code: "purchase:decor.ground.wildflower" },
        ],
      }),
    ],
    ["a spend that names no subject", wrap({ entries: [{ ...goodRow, kind: "spend" }] })],
  ];
  // "a restore clock that is not epoch ms" was here, and it went out with the clock.
  // There is no `last_restored_at_ms` to validate, and a v1 blob carrying one is
  // rejected on its VERSION instead — asserted in "cannot part-restore a v1 blob"
  // above, which is a stronger check than this row was.

  it.each(badBlobs)("discards %s and starts fresh", async (_label, blob) => {
    const { storage, entries } = recordingStorage();
    const store = createEconomyDevStore({ storage, enabled: true });
    const key = store.storageKey();
    entries.set(key, blob);

    expect(store.load()).toBeNull();
    // Deleted, not left to be re-read (or half-read) on the next load.
    expect(entries.has(key)).toBe(false);

    // And the app comes up on an empty wallet rather than crashing.
    const wallet = await createInMemoryEconomyClient(store.load()).getWallet();
    expect(wallet.materials).toEqual({});
    expect(wallet.spendable).toBe(0);
  });

  it("ignores a v3 blob's owned_prestige and equipped rather than restoring them", () => {
    // The parser no longer looks for either field, so a payload carrying them parses to
    // the ledger alone. In practice a real v3 blob is never fetched — the version is
    // part of the key — but a hand-written one forced onto today's key must not smuggle
    // an equipped cosmetic back into a game that has no cosmetics.
    const { storage, entries } = recordingStorage();
    const store = createEconomyDevStore({ storage, enabled: true });
    entries.set(
      store.storageKey(),
      JSON.stringify({
        version: ECONOMY_DEV_SCHEMA_VERSION,
        economy: {
          entries: [],
          owned_prestige: ["prestige.badge.journeyman"],
          equipped: { "district:D1:decor": "decor.ground.wildflower" },
        },
      }),
    );
    const restored = store.load();
    expect(restored).not.toBeNull();
    expect(Object.keys(restored ?? {})).toEqual(["entries"]);
    expect(JSON.stringify(restored)).not.toMatch(/cosmetic|prestige/i);
  });

  it("versions the key as well as the payload, so an old blob is never read", async () => {
    const { storage, entries } = recordingStorage();
    const store = createEconomyDevStore({ storage, enabled: true });
    const client = withEconomyDevPersistence(createInMemoryEconomyClient(null), store);
    await client.reportLessonComplete({ nodeId: "NUM.S" });
    store.flush();

    expect(store.storageKey()).toContain(`v${ECONOMY_DEV_SCHEMA_VERSION}`);
    // The city's key prefix is a DIFFERENT one: adding the economy must not bump —
    // and so must not discard — any saved city.
    expect(store.storageKey()).not.toContain("cr.devSession");
    expect(JSON.parse(entries.get(store.storageKey()) ?? "{}")).toMatchObject({
      version: ECONOMY_DEV_SCHEMA_VERSION,
    });
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
    const store = createEconomyDevStore({ storage: throwing, enabled: true });
    expect(store.load()).toBeNull();
    const client = withEconomyDevPersistence(createInMemoryEconomyClient(null), store);
    await expect(client.reportLessonComplete({ nodeId: "NUM.S" })).resolves.toBeDefined();
    expect(() => {
      store.flush();
      store.clear();
    }).not.toThrow();
  });

  it("namespaces the key under the dev identity, and honours ?reset", async () => {
    const alice = createEconomyDevStore({
      storage: recordingStorage().storage,
      enabled: true,
      userKey: "alice",
    });
    const bob = createEconomyDevStore({
      storage: recordingStorage().storage,
      enabled: true,
      userKey: "bob",
    });
    expect(alice.storageKey()).not.toEqual(bob.storageKey());

    // `?reset` is the city's own hatch, shared so a reset can never wipe a city and
    // leave its wallet standing.
    const { storage } = recordingStorage();
    const store = createEconomyDevStore({ storage, enabled: true });
    const client = withEconomyDevPersistence(createInMemoryEconomyClient(null), store);
    await client.reportLessonComplete({ nodeId: "NUM.S" });
    expect(store.load()).not.toBeNull();

    const search = window.location.search;
    window.history.replaceState(null, "", "/?reset");
    try {
      expect(
        loadEconomyDevSnapshot(createEconomyDevStore({ storage, enabled: true })),
      ).toBeNull();
    } finally {
      window.history.replaceState(null, "", `/${search}`);
    }
  });
});
