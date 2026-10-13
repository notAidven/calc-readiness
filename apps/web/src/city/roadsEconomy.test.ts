import { DRILL_PAID_SETS_PER_ERA, findCivicBuilding, materialForEra } from "@cr/economy";
import { describe, expect, it, vi } from "vitest";

import type {
  CivicPurchaseOutcome,
  EconomyClient,
  RepairOutcome,
  WalletView,
} from "../economy/economyClient";
import { createCityDevSession } from "./citySession";
import { CURRENT_ERA_ID } from "./eraDressing";
import { ROAD_TILE_GOLD_COST } from "./roads";
import { createRoadSpendEconomy } from "./roadsEconomy";

/**
 * **THIS SUITE WAS WRITTEN AGAINST GOLD**, whose only sinks were cosmetics and roads.
 * The gold-drop retired that currency, so every figure below is now the ERA MATERIAL —
 * the same stockpile civic buildings are bought from, which is what makes a road tile a
 * real tradeoff rather than loose change.
 *
 * The mechanism under test is unchanged and so are the assertions' shapes: the
 * decorator subtracts a recorded road spend from the authoritative balance, clamps at
 * zero, and never mints. What moved is WHICH field carries that balance —
 * `wallet.spendable` rather than `wallet.balances.gold`.
 *
 * **THE OTHER SINK IT GUARDED AGAINST WAS A COSMETIC PURCHASE, and that is sunset.** The
 * double-spend claim is unchanged and is now made against the CIVIC purchase, which is
 * the sink that is really in the ledger: a building roads have already paid for is the
 * same defect a skin roads had already paid for was.
 */

/** Era one's material, so a fixture cannot be funded in a currency nothing spends. */
const SPENDABLE_MATERIAL = materialForEra(CURRENT_ERA_ID);

/** A minimal fake economy whose spendable stockpile we control, with a spyable purchase. */
function fakeBase(spendable: number) {
  const wallet: WalletView = {
    materials: SPENDABLE_MATERIAL === null ? {} : { [SPENDABLE_MATERIAL.id]: spendable },
    spendable,
    spendableMaterial: SPENDABLE_MATERIAL,
  };
  const noGrant = { applied: false, materials: {}, grantedMaterials: {} };
  // The third sink on the shared stockpile (crisis repair). Reports the AUTHORITATIVE
  // balance untouched, exactly as the fake purchase does, so the decorator's netting is the
  // only thing that can move the number a test reads.
  const repairRuin = vi.fn(
    async (): Promise<RepairOutcome> => ({
      status: "spent",
      spendable: wallet.spendable,
      cost: 0,
    }),
  );
  // The other sink, and the one that is really in the ledger. Reports the AUTHORITATIVE
  // balance untouched like the repair fake, so the decorator's netting stays the only
  // thing that can move the number a test reads.
  const purchaseCivicBuilding = vi.fn(
    async (): Promise<CivicPurchaseOutcome> => ({
      status: "spent",
      spendable: wallet.spendable,
      cost: 0,
      building: null,
    }),
  );
  const base: EconomyClient = {
    getWallet: async () => wallet,
    appliedEventIds: async () => [],
    repairRuin,
    purchaseCivicBuilding,
    reportIslandFounded: async () => noGrant,
    resetIslandWallet: async () => undefined,
    reportPracticeSetComplete: async () => ({
      ...noGrant,
      eventId: "practice_complete:test",
      rewardEra: "prehistoric",
      groupKey: "practice_complete:test",
      rewardKind: "repeat_practice",
      paidSets: 0,
      setsRemaining: DRILL_PAID_SETS_PER_ERA,
      setsBound: DRILL_PAID_SETS_PER_ERA,
    }),
    reportLessonComplete: async () => noGrant,
    reportInterleavedClear: async () => ({
      ...noGrant,
      paidSets: 0,
      setsRemaining: DRILL_PAID_SETS_PER_ERA,
      setsBound: DRILL_PAID_SETS_PER_ERA,
    }),
    reportCivicBootstrap: async () => noGrant,
  };
  return { base, repairRuin, purchaseCivicBuilding };
}

describe("roadsEconomy — nets road spend out of the shared wallet", () => {
  it("subtracts the recorded road spend from the authoritative stockpile", async () => {
    const { base } = fakeBase(100);
    const economy = createRoadSpendEconomy(base, () => 40);
    expect((await economy.getWallet()).spendable).toBe(60);
  });

  it("never mints material or reports a negative balance (clamps at zero)", async () => {
    const { base } = fakeBase(30);
    const economy = createRoadSpendEconomy(base, () => 999);
    expect((await economy.getWallet()).spendable).toBe(0);
  });

  it("forwards the RAW per-material projection unnetted", async () => {
    const { base } = fakeBase(100);
    const economy = createRoadSpendEconomy(base, () => 40);
    // The XP half of this test went with XP. What is left is the half that still holds:
    // the road spend is not
    // in the ledger, so the ledger's own read must not pretend it is. Only `spendable`
    // nets, which is the one number every affordability check goes through.
    const wallet = await economy.getWallet();
    expect(SPENDABLE_MATERIAL).not.toBeNull();
    expect(wallet.materials[SPENDABLE_MATERIAL?.id ?? "stone"]).toBe(100);
  });

  it("credits a refund back into the shared balance, exactly", async () => {
    // The net road spend is what the wallet subtracts, so refunding a tile (the
    // session lowering that total) simply returns the material — never more than was
    // taken, since the balance can only climb back to the authoritative figure.
    const { base } = fakeBase(100);
    const session = createCityDevSession();
    const economy = createRoadSpendEconomy(base, () => session.roadGoldSpent());

    await session.layRoads([{ col: 0, row: 3 }], 100);
    expect((await economy.getWallet()).spendable).toBe(100 - ROAD_TILE_GOLD_COST);

    await session.removeRoads([{ col: 0, row: 3 }]);
    expect((await economy.getWallet()).spendable).toBe(100);

    // Removing a tile that is already gone cannot push the balance past the real one.
    await session.removeRoads([{ col: 0, row: 3 }]);
    expect((await economy.getWallet()).spendable).toBe(100);
  });
});

describe("roadsEconomy — a civic build can't double-spend what roads already took", () => {
  /** Era one's cheapest catalogue row, read from the catalogue rather than written down. */
  const CIVIC = "prehistoric_campfire";

  it("refuses a build the road-net balance can't cover, with nothing debited", async () => {
    // Raw stockpile 100, but 90 already spent on roads, against a building that costs
    // more than the 10 that leaves. Refused BEFORE the base client is touched.
    const cost = findCivicBuilding(CIVIC)?.cost ?? 0;
    expect(cost).toBeGreaterThan(10);
    const { base, purchaseCivicBuilding } = fakeBase(100);
    const economy = createRoadSpendEconomy(base, () => 90);
    const outcome = await economy.purchaseCivicBuilding({
      placementId: "civic:prehistoric_campfire:0",
      building: CIVIC,
    });
    expect(outcome.status).toBe("insufficient_material");
    expect(outcome.spendable).toBe(10);
    expect(purchaseCivicBuilding).not.toHaveBeenCalled();
  });

  it("allows a build the road-net balance covers, delegating to the base", async () => {
    const cost = findCivicBuilding(CIVIC)?.cost ?? 0;
    const { base, purchaseCivicBuilding } = fakeBase(100);
    const economy = createRoadSpendEconomy(base, () => 100 - cost); // exactly affordable
    const outcome = await economy.purchaseCivicBuilding({
      placementId: "civic:prehistoric_campfire:1",
      building: CIVIC,
    });
    expect(outcome.status).toBe("spent");
    expect(purchaseCivicBuilding).toHaveBeenCalledTimes(1);
    // The returned balance is netted too, so every sink reads one consistent number.
    expect(outcome.spendable).toBe(cost);
  });
});

/**
 * **A CRISIS REPAIR IS THE THIRD SINK ON THIS ONE WALLET**, so it owes the same guard a
 * civic build does. Without it, material roads have already claimed would fund a repair and
 * the two sinks would report different balances for the same stockpile — the exact
 * divergence this decorator exists to prevent.
 */
describe("roadsEconomy — a repair can't double-spend what roads already took", () => {
  it("refuses a repair the road-net balance can't cover, with nothing debited", async () => {
    // Raw stockpile 100, 90 already sunk into roads → 10 spendable, against a 60-material
    // building repair. Refused BEFORE the base client is reached.
    const { base, repairRuin } = fakeBase(100);
    const economy = createRoadSpendEconomy(base, () => 90);
    const outcome = await economy.repairRuin({
      damageId: "d1",
      subjectKind: "building",
      subject: "NUM.3",
      cost: 60,
    });
    expect(outcome.status).toBe("insufficient_material");
    expect(outcome.spendable).toBe(10);
    expect(repairRuin).not.toHaveBeenCalled();
  });

  it("allows a repair the road-net balance covers, delegating to the base", async () => {
    const { base, repairRuin } = fakeBase(100);
    const economy = createRoadSpendEconomy(base, () => 40); // 60 spendable, repair costs 60
    const outcome = await economy.repairRuin({
      damageId: "d1",
      subjectKind: "building",
      subject: "NUM.3",
      cost: 60,
    });
    expect(outcome.status).toBe("spent");
    expect(repairRuin).toHaveBeenCalledTimes(1);
    // The returned balance is netted too, so every sink reads one consistent number.
    expect(outcome.spendable).toBe(60);
  });
});
