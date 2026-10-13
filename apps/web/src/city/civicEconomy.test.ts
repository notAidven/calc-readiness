import { DRILL_PAID_SETS_PER_ERA, findCivicBuilding, materialForEra } from "@cr/economy";
import { describe, expect, it, vi } from "vitest";

import type {
  CivicPurchaseOutcome,
  EconomyClient,
  RepairOutcome,
  WalletView,
} from "../economy/economyClient";
import { createCivicMaterialEconomy } from "./civicEconomy";
import { CURRENT_ERA_ID } from "./eraDressing";

/**
 * THE DOUBLE-SPEND, reproduced through the PUBLIC purchase path.
 *
 * ## The bug, exactly
 *
 * Since the gold-drop every sink draws on one stockpile, and `integration` added another:
 * `EconomyClient.purchaseCivicBuilding`, ledger-backed and idempotent per placement id.
 * (There were four when this was written; the cosmetic purchase left with the 2026-08-03
 * shop sunset, so there are three.)
 * `createCivicMaterialEconomy` was written when there were two sinks and did not implement
 * it, so the composed client (civic wrapping roads wrapping the core) had no
 * `purchaseCivicBuilding` at all — and the obvious repair, forwarding it untouched to the
 * base, is the double-spend: the base sees the AUTHORITATIVE stockpile, while the material
 * this session has already sunk into civic buildings lives in a counter only this decorator
 * nets out. So a second building gets bought with material the first one already spent.
 *
 * ## WHY THE TEST DRIVES `purchaseCivicBuilding` AND NOT THIS FILE'S INTERNALS
 *
 * The civic spend path is scheduled for replacement (the follow-up this file's own header
 * flags: `purchaseCivicBuilding` in the ledger, no session counter). A test that reached into
 * `netWallet` or asserted the counter's arithmetic would be deleted along with it. This one
 * asks the only question that outlives the rewrite — **can two sinks spend the same
 * balance?** — of the composed client's public methods, so it keeps its meaning when the
 * counter goes away and the ledger does the netting instead.
 *
 * The DURABLE half is `sinkStockpileParity.test.ts`, which derives the sink population from
 * `EconomyClient`'s own source rather than from a written-down list. A written-down count
 * is precisely the shape that let `repairRuin` open this hole in silence, and then let
 * `purchaseCivicBuilding` do it again — and it is the shape that would have gone stale
 * again when the shop sunset took one back out.
 *
 * NO PURCHASE UI IS TOUCHED by the fix this pins. The Civic tab, its cards and
 * `citySession.placeCivic` are all unchanged; the only edit is the decorator gaining the
 * civic method with the same guard the others already carry.
 */

/** Era one's material, so a fixture cannot be funded in a currency nothing spends. */
const SPENDABLE_MATERIAL = materialForEra(CURRENT_ERA_ID);

/** A real catalogue row, so the cost under test is the shipped one and not invented. */
const LONGHOUSE = findCivicBuilding("prehistoric_longhouse");

/**
 * A base economy that reports the AUTHORITATIVE stockpile from every sink, untouched.
 *
 * That is the whole point of the fixture: the core knows nothing about a session counter, so
 * the decorator's netting is the only thing that can move the number a test reads. If the
 * decorator forwards a sink untouched, the base's own full balance is what comes back — and
 * that is the double-spend, visible as a number.
 */
function fakeBase(spendable: number) {
  const wallet: WalletView = {
    materials: SPENDABLE_MATERIAL === null ? {} : { [SPENDABLE_MATERIAL.id]: spendable },
    spendable,
    spendableMaterial: SPENDABLE_MATERIAL,
  };
  const repairRuin = vi.fn(
    async (): Promise<RepairOutcome> => ({
      status: "spent",
      spendable: wallet.spendable,
      cost: 0,
    }),
  );
  const purchaseCivicBuilding = vi.fn(
    async (): Promise<CivicPurchaseOutcome> => ({
      status: "spent",
      spendable: wallet.spendable,
      cost: LONGHOUSE?.cost ?? 0,
      building: LONGHOUSE,
    }),
  );
  const noGrant = { applied: false, materials: {}, grantedMaterials: {} };
  const base: EconomyClient = {
    getWallet: async () => wallet,
    appliedEventIds: async () => [],
    purchaseCivicBuilding,
    repairRuin,
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
  return { base, purchaseCivicBuilding, repairRuin };
}

describe("a civic purchase cannot spend material an earlier one already took", () => {
  it("has a real catalogue row and material to test against", () => {
    // Floor under every case below: with no material or no row the whole suite would be
    // asserting over `null` and passing for the wrong reason.
    expect(SPENDABLE_MATERIAL).not.toBeNull();
    expect(LONGHOUSE).not.toBeNull();
    expect(LONGHOUSE?.cost ?? 0).toBeGreaterThan(0);
  });

  it("implements the fourth sink at all", () => {
    // The compile error, as a runtime claim: a composed client missing the method does not
    // "forward" anything — it throws `is not a function` at the call site.
    const { base } = fakeBase(1000);
    const economy = createCivicMaterialEconomy(base, () => 0, CURRENT_ERA_ID);
    expect(typeof economy.purchaseCivicBuilding).toBe("function");
  });

  it("REFUSES a second building the netted stockpile cannot cover, and spends nothing", async () => {
    const cost = LONGHOUSE?.cost ?? 0;
    // Authoritative stockpile funds exactly ONE building; one has already been bought and
    // recorded on the session side, so the netted balance is `cost - 1` — a coin short.
    const { base, purchaseCivicBuilding } = fakeBase(cost * 2 - 1);
    const economy = createCivicMaterialEconomy(base, () => cost, CURRENT_ERA_ID);

    const outcome = await economy.purchaseCivicBuilding({
      placementId: "civic:longhouse:1",
      building: "prehistoric_longhouse",
    });

    // THE DOUBLE-SPEND, as a number: forwarded untouched, the base sees `cost * 2 - 1`,
    // says `spent`, and the player has two buildings out of one-and-a-bit buildings' worth
    // of material.
    expect(outcome.status).toBe("insufficient_material");
    expect(purchaseCivicBuilding).not.toHaveBeenCalled();
    // Fail-closed: nothing bought, nothing charged, and the refusal reports the NETTED
    // balance the player can actually see rather than the authoritative one.
    expect(outcome.cost).toBe(0);
    expect(outcome.building).toBeNull();
    expect(outcome.spendable).toBe(cost - 1);
  });

  it("ALLOWS a building the netted stockpile covers, and reports the netted balance", async () => {
    const cost = LONGHOUSE?.cost ?? 0;
    const { base, purchaseCivicBuilding } = fakeBase(cost * 2);
    const economy = createCivicMaterialEconomy(base, () => cost, CURRENT_ERA_ID);

    const outcome = await economy.purchaseCivicBuilding({
      placementId: "civic:longhouse:1",
      building: "prehistoric_longhouse",
    });

    // The other direction, so the guard above cannot be satisfied by refusing everything —
    // which is how a "fix" that simply always says no would pass a one-sided test.
    expect(outcome.status).toBe("spent");
    expect(purchaseCivicBuilding).toHaveBeenCalledTimes(1);
    expect(outcome.spendable).toBe(cost);
  });

  it("keeps a REPAIR out of material a civic building already claimed", async () => {
    // The same property one sink over, because the hole is symmetric: two sinks, one
    // balance. This is the case `repairRuin` opened before `purchaseCivicBuilding` did.
    const { base, repairRuin } = fakeBase(100);
    const economy = createCivicMaterialEconomy(base, () => 80, CURRENT_ERA_ID);

    const refused = await economy.repairRuin({
      damageId: "d1",
      subjectKind: "building",
      subject: "NUM.S",
      cost: 60,
    });
    expect(refused.status).toBe("insufficient_material");
    expect(repairRuin).not.toHaveBeenCalled();
    expect(refused.spendable).toBe(20);

    const allowed = await economy.repairRuin({
      damageId: "d2",
      subjectKind: "building",
      subject: "NUM.F",
      cost: 20,
    });
    expect(allowed.status).toBe("spent");
    expect(repairRuin).toHaveBeenCalledTimes(1);
  });

  it("never reports a negative stockpile, however much has been sunk", async () => {
    const { base } = fakeBase(50);
    const economy = createCivicMaterialEconomy(base, () => 9999, CURRENT_ERA_ID);
    expect((await economy.getWallet()).spendable).toBe(0);
  });
});
