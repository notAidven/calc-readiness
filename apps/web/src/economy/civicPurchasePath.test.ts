import { buildEventIdFor, civicBuildingOrThrow, lessonMaterialAmount } from "@cr/economy";
import { describe, expect, it } from "vitest";

import type { DevSessionStorage } from "../devPersistence/devSession";
import {
  createEconomyDevStore,
  type EconomyDevStore,
  withEconomyDevPersistence,
} from "../devPersistence/economyPersistence";
import { createInMemoryEconomyClient, type InMemoryEconomyClient } from "./economySession";

/**
 * **THE CIVIC PURCHASE PATH, END TO END THROUGH THE LEDGER.**
 *
 * `applyCivicPurchase` and the `applyMaterialSpend` under it were shipped, correct, and
 * unreachable: they had no production call site anywhere, and `EconomyClient` exposed
 * `purchaseCosmetic`, `repairRuin` and the three earn reports and no civic spend at all.
 * `city/civicEconomy.ts` names the gap in as many words — *"`@cr/economy` has the right
 * primitive for it ... What it does NOT have is a way to reach it"* — and flags the
 * ledger wiring as the economy owner's follow-up. This file is the guard on that wiring.
 *
 * **WHY IT MATTERS THAT IT IS THE LEDGER AND NOT A COUNTER.** The alternative shape, and
 * the one the city runs today, nets the spend out of a city-session counter. That is not
 * idempotent per placement: a double-click, a re-render or a replayed queue spends twice,
 * because nothing anywhere holds the fact that THIS placement is already paid for. The
 * ledger holds exactly that, under `build:<placement_id>`, and the two directions of it
 * are asserted below — a replay must be free, and a genuinely second placement must not.
 *
 * Written against the REAL adapter and the REAL store, the precedent
 * `economyMaterials.test.ts` set. Nothing is stubbed but the storage bytes.
 */

/** A localStorage stand-in whose bytes are the only thing a "refresh" carries over. */
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

/** Open the economy as `createEconomyClient` does; twice on one storage IS a refresh. */
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

const LODGE = civicBuildingOrThrow("prehistoric_longhouse");
const LUMP = lessonMaterialAmount("prehistoric");

/** A wallet funded the only way anything is funded: completed lessons. */
async function fundedEconomy(
  storage: DevSessionStorage,
  lessons: readonly string[],
): Promise<InMemoryEconomyClient> {
  const { client } = openEconomy(storage);
  for (const nodeId of lessons) {
    await client.reportLessonComplete({ nodeId });
  }
  return client;
}

describe("the civic purchase path reaches the ledger", () => {
  it("debits the stockpile, writes ONE spend row, and names what was bought", async () => {
    const client = await fundedEconomy(memoryStorage(), ["NUM.S", "NUM.F"]);
    expect((await client.getWallet()).spendable).toBe(2 * LUMP);

    const outcome = await client.purchaseCivicBuilding({
      placementId: "plot-1",
      building: LODGE.id,
    });

    expect(outcome.status).toBe("spent");
    expect(outcome.cost).toBe(LODGE.cost);
    expect(outcome.building?.id).toBe(LODGE.id);
    expect(outcome.spendable).toBe(2 * LUMP - LODGE.cost);
    expect((await client.getWallet()).spendable).toBe(2 * LUMP - LODGE.cost);

    // IN THE LEDGER, which is the whole point — one row, a spend, in the era's material,
    // naming the placement. A session counter would leave the ledger empty here.
    const rows = client.snapshot().entries.filter((entry) => entry.kind === "spend");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.event_id).toBe(buildEventIdFor("plot-1"));
    expect(rows[0]?.resource_type).toBe("stone");
    expect(rows[0]?.amount).toBe(LODGE.cost);
    expect(rows[0]?.reason_code).toBe("build:plot-1");
    // The reason NAMES the subject, which is the surviving row invariant. It used to
    // also assert `cosmetic_id: null`; the column went with the shop.
    expect(Object.keys(rows[0] ?? {})).not.toContain("cosmetic_id");
  });

  it("is IDEMPOTENT per placement id — a replay debits nothing", async () => {
    const client = await fundedEconomy(memoryStorage(), ["NUM.S", "NUM.F"]);
    const first = await client.purchaseCivicBuilding({
      placementId: "plot-1",
      building: LODGE.id,
    });
    expect(first.status).toBe("spent");
    const afterFirst = (await client.getWallet()).spendable;

    const replay = await client.purchaseCivicBuilding({
      placementId: "plot-1",
      building: LODGE.id,
    });

    expect(replay.status).toBe("already_spent");
    // Fail-closed on every axis: no second row, no second debit, and `cost` is 0 rather
    // than the price it would have been, so a caller cannot read a replay as a spend.
    expect(replay.cost).toBe(0);
    expect(replay.building).toBeNull();
    expect((await client.getWallet()).spendable).toBe(afterFirst);
    expect(client.snapshot().entries.filter((e) => e.kind === "spend")).toHaveLength(1);
  });

  it("is idempotent in the OTHER direction too — a second placement pays again", async () => {
    // The half that makes the half above a real claim. Idempotency that refused every
    // repeat would be indistinguishable from a broken sink, and every catalogue says a
    // building is buildable "as many times as you can afford" — so two placements of one
    // type are two spends, and only the id tells them apart.
    const client = await fundedEconomy(memoryStorage(), ["NUM.S", "NUM.F"]);
    const first = await client.purchaseCivicBuilding({
      placementId: "plot-1",
      building: LODGE.id,
    });
    const second = await client.purchaseCivicBuilding({
      placementId: "plot-2",
      building: LODGE.id,
    });

    expect([first.status, second.status]).toEqual(["spent", "spent"]);
    expect(second.spendable).toBe(2 * LUMP - 2 * LODGE.cost);
    const rows = client.snapshot().entries.filter((entry) => entry.kind === "spend");
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.event_id)).toEqual([
      buildEventIdFor("plot-1"),
      buildEventIdFor("plot-2"),
    ]);
  });

  it("SURVIVES A REFRESH, so a reload cannot hand the building back for free", async () => {
    // The reason a ledger row beats a session counter, stated as the failure it prevents:
    // a spend the economy does not remember is a building the city keeps and a wallet
    // that refills. Two page views over one storage, nothing carried but the bytes.
    const storage = memoryStorage();
    const before = await fundedEconomy(storage, ["NUM.S", "NUM.F"]);
    await before.purchaseCivicBuilding({ placementId: "plot-1", building: LODGE.id });
    const spentBalance = (await before.getWallet()).spendable;

    const { client: after } = openEconomy(storage);
    expect((await after.getWallet()).spendable).toBe(spentBalance);
    // And the replay still knows, which is the property a counter cannot restore.
    const replay = await after.purchaseCivicBuilding({
      placementId: "plot-1",
      building: LODGE.id,
    });
    expect(replay.status).toBe("already_spent");
    expect((await after.getWallet()).spendable).toBe(spentBalance);
  });

  it("persists a canonical structured civic id and replays its exact event for free", async () => {
    const storage = memoryStorage();
    const placementId = "civic:prehistoric_longhouse:0";
    const before = await fundedEconomy(storage, ["NUM.S", "NUM.F"]);
    const bought = await before.purchaseCivicBuilding({
      placementId,
      building: LODGE.id,
    });
    expect(bought.status).toBe("spent");

    const { client: after } = openEconomy(storage);
    expect(after.snapshot().entries).toContainEqual(
      expect.objectContaining({
        event_id: "build:civic:prehistoric_longhouse:0",
        reason_code: "build:civic:prehistoric_longhouse:0",
      }),
    );
    const replay = await after.purchaseCivicBuilding({
      placementId,
      building: LODGE.id,
    });
    expect(replay.status).toBe("already_spent");
    expect(after.snapshot().entries.filter((entry) => entry.kind === "spend")).toHaveLength(
      1,
    );
  });

  it("refuses what the wallet cannot cover, leaving the ledger untouched", async () => {
    const client = await fundedEconomy(memoryStorage(), []);
    const outcome = await client.purchaseCivicBuilding({
      placementId: "plot-1",
      building: LODGE.id,
    });

    expect(outcome.status).toBe("insufficient_material");
    expect(outcome.cost).toBe(0);
    expect(outcome.building).toBeNull();
    expect(outcome.spendable).toBe(0);
    expect(client.snapshot().entries).toEqual([]);
    // And the refusal is not permanent: fund it and the SAME placement id now lands,
    // which is what distinguishes "cannot afford" from "already spent".
    await client.reportLessonComplete({ nodeId: "NUM.S" });
    const retry = await client.purchaseCivicBuilding({
      placementId: "plot-1",
      building: LODGE.id,
    });
    expect(retry.status).toBe("spent");
  });

  it("names the WORLD rejections apart from the wallet, and writes nothing for either", async () => {
    const client = await fundedEconomy(memoryStorage(), ["NUM.S", "NUM.F"]);

    const unknown = await client.purchaseCivicBuilding({
      placementId: "plot-1",
      building: "not_a_building",
    });
    expect(unknown.status).toBe("unknown_building");

    // Era-exclusivity, through the adapter's own era rather than a parameter: the city
    // is in era one, so an era-two row is refused however much grain a wallet held.
    const wrongEra = await client.purchaseCivicBuilding({
      placementId: "plot-2",
      building: "neolithic_granary",
    });
    expect(wrongEra.status).toBe("wrong_era");

    expect(client.snapshot().entries.filter((e) => e.kind === "spend")).toEqual([]);
  });

  it("takes no price from the caller — the ask carries only WHICH, never HOW MUCH", async () => {
    // INV-COS-4 as a key census on the seam rather than as a comment. A `cost` or a
    // `material` field added to `CivicPurchaseAsk` later fails here, which is the one
    // way a client could ever name its own price.
    const client = await fundedEconomy(memoryStorage(), ["NUM.S", "NUM.F"]);
    const ask = { placementId: "plot-1", building: LODGE.id };
    expect(Object.keys(ask).sort()).toEqual(["building", "placementId"]);

    const outcome = await client.purchaseCivicBuilding(ask);
    // The price came from the catalogue, and the catalogue is the only place it exists.
    expect(outcome.cost).toBe(LODGE.cost);
    expect(outcome.cost).toBe(civicBuildingOrThrow(LODGE.id).cost);
  });
});
