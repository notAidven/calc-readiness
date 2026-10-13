import {
  canonicalCivicPlacementId,
  civicBuildingOrThrow,
  civicLiftSuspensionCost,
  civicTeardownCost,
} from "@cr/economy";
import {
  foldCrisisDamage,
  HARD_WINTER,
  hardWinterRepairPrices,
  NO_CRISIS_DAMAGE,
} from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import { describe, expect, it, vi } from "vitest";

import type { RepairAsk, RepairOutcome } from "../economy/economyClient";
import type { RuinClearResult } from "./citySession";
import { type CrisisRepairDeps, repairCrisisDamage, repairPriceFor } from "./crisisRepair";

/**
 * **THE ORDERING OF A REPAIR, and what happens when half of it lands.**
 *
 * The two halves — the material spend and the state clear — live in different lanes and
 * neither can see the other, so the sequence is the whole of the correctness and it is
 * asserted here rather than argued in a docblock. The failure modes are deliberately
 * asymmetric (see `crisisRepair.ts`): the survivable one is charged-but-not-cleared, and the
 * unrecoverable one is cleared-but-not-charged. Every case below pins which side of that a
 * given outcome lands on.
 */

/** The era the city is standing in, and so the era a lift is priced and paid in. */
const ERA: EraId = "prehistoric";

/** The bought building era four's Succession and era nine's Intrusion both shutter. */
const LODGE = civicBuildingOrThrow("prehistoric_longhouse");
const LODGE_PLACEMENT = canonicalCivicPlacementId(LODGE, 0);

const DAMAGED = foldCrisisDamage(NO_CRISIS_DAMAGE, {
  buildings: ["NUM.3"],
  cells: ["4,0"],
  suspended_civic: [LODGE_PLACEMENT],
});

/** A recording double for the two seams, with a scriptable spend outcome. */
function deps(spend: RepairOutcome, damage = DAMAGED) {
  const asks: RepairAsk[] = [];
  const cleared: string[] = [];
  const repairRuin = vi.fn(async (ask: RepairAsk): Promise<RepairOutcome> => {
    asks.push(ask);
    return spend;
  });
  const clearBuilding = vi.fn(async (nodeId: string): Promise<RuinClearResult> => {
    cleared.push(`building:${nodeId}`);
    return { cleared: true, damage_id: "d1" };
  });
  const clearCell = vi.fn(
    async (cell: { col: number; row: number }): Promise<RuinClearResult> => {
      cleared.push(`ground:${cell.col},${cell.row}`);
      return { cleared: true, damage_id: "d1" };
    },
  );
  const clearCivic = vi.fn(async (placementId: string): Promise<RuinClearResult> => {
    cleared.push(`civic:${placementId}`);
    return { cleared: true, damage_id: "d1" };
  });
  const seams: CrisisRepairDeps = {
    damage: () => damage,
    economy: { repairRuin },
    clearBuilding,
    clearCell,
    clearCivic,
    eraId: ERA,
  };
  return { seams, asks, cleared, repairRuin, clearBuilding, clearCell, clearCivic };
}

const SPENT: RepairOutcome = { status: "spent", spendable: 40, cost: 60 };
const BROKE: RepairOutcome = { status: "insufficient_material", spendable: 12, cost: 0 };
const REPLAY: RepairOutcome = { status: "already_spent", spendable: 40, cost: 0 };

describe("the price is an authored one, never invented here", () => {
  it("charges the tuning table's figures, per building and per cell", () => {
    expect(repairPriceFor({ kind: "building", nodeId: "NUM.3" }, ERA)).toBe(
      HARD_WINTER.rebuild_cost_per_ruin,
    );
    expect(repairPriceFor({ kind: "ground", cell: { col: 4, row: 0 } }, ERA)).toBe(
      HARD_WINTER.reclaim_cost_per_cell,
    );
    // And they are the same two numbers the engine's own read-out quotes, so the panel and
    // the outcome screen cannot disagree about what a ruin costs.
    expect(repairPriceFor({ kind: "building", nodeId: "NUM.3" }, ERA)).toBe(
      hardWinterRepairPrices().per_building,
    );
    expect(repairPriceFor({ kind: "ground", cell: { col: 0, row: 0 } }, ERA)).toBe(
      hardWinterRepairPrices().per_cell,
    );
  });

  /**
   * A LIFT IS THE CATALOGUE'S PRICE, and the assertion is the derivation rather than the
   * digit: the same discipline `hard-winter.test.ts` keeps over `reclaim_cost_per_cell`,
   * where *"the derivation rather than the digit"* is asserted so a retune has to answer it.
   */
  it("charges the catalogue's lift price for a civic suspension, at the CURRENT era", () => {
    expect(repairPriceFor({ kind: "civic", placementId: LODGE_PLACEMENT }, ERA)).toBe(
      civicLiftSuspensionCost(LODGE, ERA),
    );
    // …which is the teardown rate, which is where the ruling and the argument live.
    expect(civicLiftSuspensionCost(LODGE, ERA)).toBe(civicTeardownCost(LODGE, ERA));
    // IT SCALES WITH THE ERA, which is the property a flat crisis price cannot have. The
    // same era-one Lodge lifted in era five is priced off era five's dwelling row.
    expect(
      repairPriceFor({ kind: "civic", placementId: LODGE_PLACEMENT }, "medieval"),
      "an era-one suspension lifted in era five is still an era-one bill",
    ).toBeGreaterThan(repairPriceFor({ kind: "civic", placementId: LODGE_PLACEMENT }, ERA));
    // AND IT SITS BELOW A REBUILD at the era both are authored for, which is the failure
    // floor's ordering: a ruin is destruction and a suspension is "temporarily unusable".
    expect(
      repairPriceFor({ kind: "civic", placementId: LODGE_PLACEMENT }, ERA),
    ).toBeLessThan(HARD_WINTER.rebuild_cost_per_ruin);
  });

  /**
   * A placement id no catalogue row backs prices at zero, which `applyRepairSpend` refuses
   * as `invalid_cost` with nothing debited. Asserted because the alternative — a guessed
   * price — is the one INV-COS-4 exists to forbid, and because the crises' authored boards
   * really do carry stand-in ids until a caller plays one over a real city.
   */
  it("prices an unbacked civic id at zero rather than guessing", () => {
    expect(
      repairPriceFor({ kind: "civic", placementId: "succession-harbour-grain-dock" }, ERA),
    ).toBe(0);
  });
});

describe("a repair SPENDS FIRST and clears second", () => {
  it("keys the spend by the RUIN's damage id, read before anything is cleared", async () => {
    const { seams, asks, cleared } = deps(SPENT);
    const result = await repairCrisisDamage(seams, {
      kind: "building",
      nodeId: "NUM.3",
    });

    expect(asks).toEqual([
      {
        damageId: "d1",
        subjectKind: "building",
        subject: "NUM.3",
        cost: HARD_WINTER.rebuild_cost_per_ruin,
      },
    ]);
    expect(cleared).toEqual(["building:NUM.3"]);
    expect(result).toMatchObject({ status: "repaired", repaired: true, damageId: "d1" });
  });

  it("passes a ground repair's cell key as the subject", async () => {
    const { seams, asks, cleared } = deps({ ...SPENT, spendable: 97, cost: 3 });
    await repairCrisisDamage(seams, { kind: "ground", cell: { col: 4, row: 0 } });
    expect(asks[0]).toMatchObject({
      subjectKind: "ground",
      subject: "4,0",
      cost: HARD_WINTER.reclaim_cost_per_cell,
    });
    expect(cleared).toEqual(["ground:4,0"]);
  });

  it("CLEARS NOTHING when the spend was refused — the unrecoverable direction", async () => {
    // A cleared ruin with no ledger row is a free repair nothing can find afterwards, so this
    // is the one ordering failure that must never happen.
    const { seams, clearBuilding, clearCell } = deps(BROKE);
    const result = await repairCrisisDamage(seams, {
      kind: "building",
      nodeId: "NUM.3",
    });
    expect(result.status).toBe("insufficient_material");
    expect(result.repaired).toBe(false);
    expect(clearBuilding).not.toHaveBeenCalled();
    expect(clearCell).not.toHaveBeenCalled();
    // The price is still reported, so the copy can tell the player what to save for.
    expect(result.cost).toBe(HARD_WINTER.rebuild_cost_per_ruin);
    expect(result.spendable).toBe(12);
  });

  it("SPENDS NOTHING when there is no ruin there", async () => {
    const { seams, repairRuin } = deps(SPENT);
    const result = await repairCrisisDamage(seams, {
      kind: "building",
      nodeId: "NUM.5",
    });
    expect(result.status).toBe("not_ruined");
    expect(repairRuin).not.toHaveBeenCalled();
    // No balance was read, so none is reported — a stale figure on screen is worse than none.
    expect(result.spendable).toBeNull();
    expect(result.damageId).toBeNull();
  });

  it("passes an invalid_cost and an unauthored era through as themselves", async () => {
    for (const [spend, status] of [
      [
        { status: "invalid_cost", spendable: 100, cost: 0 } as RepairOutcome,
        "invalid_cost",
      ],
      [
        { status: "era_material_unauthored", spendable: 0, cost: 0 } as RepairOutcome,
        "era_material_unauthored",
      ],
    ] as const) {
      const { seams, clearBuilding } = deps(spend);
      const result = await repairCrisisDamage(seams, {
        kind: "building",
        nodeId: "NUM.3",
      });
      expect(result.status).toBe(status);
      expect(result.repaired).toBe(false);
      expect(clearBuilding).not.toHaveBeenCalled();
    }
  });
});

describe("a half-applied repair CONVERGES instead of stranding the player", () => {
  it("treats already_spent as settled and clears the ruin", async () => {
    // The survivable failure mode, retried: the debit landed last time and the clear did not,
    // so the ledger reports `already_spent`. Refusing here would leave a player who has paid
    // looking at a ruin they can never clear, and charging again would bill them twice.
    const { seams, cleared, repairRuin } = deps(REPLAY);
    const result = await repairCrisisDamage(seams, {
      kind: "building",
      nodeId: "NUM.3",
    });
    expect(result.status).toBe("repaired");
    expect(result.repaired).toBe(true);
    expect(cleared).toEqual(["building:NUM.3"]);
    // ...and exactly one spend attempt was made. `applyRepairSpend` writes no row on
    // `already_spent`, so this is a free retry rather than a second charge.
    expect(repairRuin).toHaveBeenCalledTimes(1);
  });

  it("reports the clear honestly when the state says there was nothing to clear", async () => {
    // The other half of convergence: the spend settled, but the clear found nothing (another
    // path already cleared it). `repaired` follows the STATE rather than the spend, so the
    // caller's announcement cannot claim a repair the city did not make.
    const asks: RepairAsk[] = [];
    const seams: CrisisRepairDeps = {
      damage: () => DAMAGED,
      economy: {
        repairRuin: async (ask) => {
          asks.push(ask);
          return REPLAY;
        },
      },
      clearBuilding: async () => ({ cleared: false, damage_id: null }),
      clearCell: async () => ({ cleared: false, damage_id: null }),
      clearCivic: async () => ({ cleared: false, damage_id: null }),
      eraId: ERA,
    };
    const result = await repairCrisisDamage(seams, {
      kind: "building",
      nodeId: "NUM.3",
    });
    expect(result.repaired).toBe(false);
    expect(result.status).toBe("repaired");
    // The damage id still comes back, from the record that was read before the spend, so an
    // announcement can name what it paid for.
    expect(result.damageId).toBe("d1");
    expect(asks).toHaveLength(1);
  });
});

/**
 * **THE THIRD SUBJECT, THROUGH THE SAME ORDERING.** A lift is not its own transaction: it
 * reads the suspension's damage id, spends under it, and clears only on a spend that landed,
 * exactly as the two ruin clears above do — which is the whole reason it goes through this
 * module rather than straight from the panel to the session.
 */
describe("lifting a civic suspension", () => {
  it("spends under the suspension's own damage id and then clears it", async () => {
    const { seams, asks, cleared, clearBuilding, clearCell } = deps({
      ...SPENT,
      cost: civicLiftSuspensionCost(LODGE, ERA),
    });
    const result = await repairCrisisDamage(seams, {
      kind: "civic",
      placementId: LODGE_PLACEMENT,
    });

    expect(asks).toEqual([
      {
        damageId: "d1",
        // The ledger's own account of what happened. A lift recorded as a `building`
        // repair would be a true debit under a false description, and the reason code is
        // the reconstructable source of truth for the whole economy.
        subjectKind: "civic",
        subject: LODGE_PLACEMENT,
        cost: civicLiftSuspensionCost(LODGE, ERA),
      },
    ]);
    expect(cleared).toEqual([`civic:${LODGE_PLACEMENT}`]);
    expect(result).toMatchObject({ status: "repaired", repaired: true, damageId: "d1" });
    // …and neither ruin clear was touched, so a lift cannot repair a building by accident.
    expect(clearBuilding).not.toHaveBeenCalled();
    expect(clearCell).not.toHaveBeenCalled();
  });

  it("SPENDS NOTHING when that building is not suspended", async () => {
    const { seams, repairRuin, clearCivic } = deps(SPENT);
    const result = await repairCrisisDamage(seams, {
      kind: "civic",
      placementId: canonicalCivicPlacementId(LODGE, 7),
    });
    expect(result.status).toBe("not_ruined");
    expect(repairRuin).not.toHaveBeenCalled();
    expect(clearCivic).not.toHaveBeenCalled();
    expect(result.spendable).toBeNull();
  });

  it("CLEARS NOTHING when the spend was refused", async () => {
    const { seams, clearCivic } = deps(BROKE);
    const result = await repairCrisisDamage(seams, {
      kind: "civic",
      placementId: LODGE_PLACEMENT,
    });
    expect(result.status).toBe("insufficient_material");
    expect(result.repaired).toBe(false);
    expect(clearCivic).not.toHaveBeenCalled();
    // The price is still quoted, so the panel can say what to save for.
    expect(result.cost).toBe(civicLiftSuspensionCost(LODGE, ERA));
  });
});
