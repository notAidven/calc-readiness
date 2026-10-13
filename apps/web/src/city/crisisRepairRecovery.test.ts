import { DRILL_PAID_SETS_PER_ERA, EARN, materialForEra } from "@cr/economy";
import { HARD_WINTER, hardWinterRepairPrices } from "@cr/game";
import { describe, expect, it } from "vitest";
import {
  createDevSessionStore,
  type DevSessionStorage,
  withDevPersistence,
} from "../devPersistence/devSession";
import { createInMemoryEconomyClient } from "../economy/economySession";
import { snapshotWithWinterDamage } from "../winter/scarLiveCity";
import { createCityDevSession, D1_NODE_IDS } from "./citySession";
import { repairCrisisDamage, repairPriceFor } from "./crisisRepair";
import { CURRENT_ERA_ID } from "./eraDressing";

/**
 * **A PLAYER WITH NO MATERIAL AND A RUINED CITY IS NEVER STUCK.**
 *
 * This is the property the whole failure floor rests on, and it is not a hope about the
 * economy — it is a consequence of two facts, both of which are measured below rather than
 * asserted in prose:
 *
 *  1. **A refused repair costs nothing.** The spend is atomic, so trying with an empty
 *     stockpile leaves the ledger untouched. There is no penalty for trying and no way to
 *     spend yourself into a corner.
 *  2. **A ruin is a state, not a removal.** The building stays in `placements` with its
 *     mastery intact, so the practice that pays material is still reachable — which is the
 *     other half of why the roster and the lesson menu must never hide a ruin
 *     (`ruinLessonAccess.test.tsx`).
 *
 * Put together: practise → earn → repair, at 10 material per cleared practice set (era-one
 * scale) against 60 per ruined building and 3 per scarred cell. This walks that loop with the
 * REAL economy client and the REAL session, so a change to either price, either payout, or the
 * spend's atomicity breaks it here.
 *
 * The material figure is the shipped one and NOT a magic number in this file: it is read from
 * `EARN.interleaved.material`, and the set count is derived from it, so a retune moves the
 * arithmetic rather than failing the test for the wrong reason.
 */

function memStorage(): DevSessionStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

/** A city with one building placed and mastered, then ruined — and an EMPTY wallet. */
async function brokeWithARuinedCity() {
  const store = createDevSessionStore({
    storage: memStorage(),
    enabled: true,
    debounceMs: 0,
  });
  const built = withDevPersistence(createCityDevSession(), store);
  const nodeId = D1_NODE_IDS[0] as string;
  await built.placeSkill(nodeId, { col: 2, row: 2, rot: 0 });
  await built.advanceMasteryDev(nodeId, 3);
  store.flush();

  const saved = store.load();
  if (saved === null) {
    throw new Error("the fixture city did not save");
  }
  store.save(
    snapshotWithWinterDamage(saved, { buildings: [nodeId], cells: ["4,0", "4,1"] }),
  );
  store.flush();

  const restored = store.load();
  if (restored === null) {
    throw new Error("the fixture damage did not save");
  }
  const session = withDevPersistence(createCityDevSession(restored), store);

  // A brand-new ledger: nothing earned, nothing spent. This is the broke player.
  const economy = createInMemoryEconomyClient(null);

  return { session, economy, nodeId };
}

async function spendable(economy: ReturnType<typeof createInMemoryEconomyClient>) {
  return (await economy.getWallet()).spendable;
}

describe("a broke player with a ruined city can always recover", () => {
  it("starts genuinely broke, with a genuinely ruined city", async () => {
    const { session, economy, nodeId } = await brokeWithARuinedCity();
    expect(await spendable(economy)).toBe(0);
    expect(session.crisisDamage().ruined_buildings.map((b) => b.node_id)).toEqual([nodeId]);
    expect(session.crisisDamage().ruined_cells).toHaveLength(2);
    // The era mints a material at all, or "insufficient" below would be the wrong refusal.
    expect(materialForEra(CURRENT_ERA_ID)).not.toBeNull();
  });

  it("refuses the repair with NOTHING spent, so trying is free", async () => {
    const { session, economy, nodeId } = await brokeWithARuinedCity();
    const seams = {
      damage: session.crisisDamage,
      economy,
      clearBuilding: session.repairRuinedBuilding,
      clearCell: session.reclaimRuinedCell,
      clearCivic: session.liftSuspendedCivic,
      eraId: CURRENT_ERA_ID,
    };

    const refused = await repairCrisisDamage(seams, { kind: "building", nodeId });
    expect(refused.status).toBe("insufficient_material");
    expect(refused.repaired).toBe(false);
    // Nothing left the wallet and the ruin is still there — no state was consumed by the
    // attempt, so the player has lost nothing by making it.
    expect(await spendable(economy)).toBe(0);
    expect(session.crisisDamage().ruined_buildings).toHaveLength(1);
    expect((await economy.appliedEventIds()).length).toBe(0);

    // And it can be attempted as many times as they like, still for free.
    await repairCrisisDamage(seams, { kind: "building", nodeId });
    await repairCrisisDamage(seams, { kind: "building", nodeId });
    expect(await spendable(economy)).toBe(0);
    expect((await economy.appliedEventIds()).length).toBe(0);
  });

  it("earns its way out through PRACTICE, which the ruin never blocked", async () => {
    const { session, economy, nodeId } = await brokeWithARuinedCity();
    const seams = {
      damage: session.crisisDamage,
      economy,
      clearBuilding: session.repairRuinedBuilding,
      clearCell: session.reclaimRuinedCell,
      clearCivic: session.liftSuspendedCivic,
      eraId: CURRENT_ERA_ID,
    };

    const perSet = EARN.interleaved.material;
    const buildingPrice = repairPriceFor({ kind: "building", nodeId }, CURRENT_ERA_ID);
    expect(perSet).toBeGreaterThan(0);
    expect(buildingPrice).toBe(HARD_WINTER.rebuild_cost_per_ruin);

    // The cheapest repair first, because that is what a player with almost nothing can do:
    // one practice set already covers three scarred cells.
    await economy.reportInterleavedClear({ sessionId: "set-1" });
    expect(await spendable(economy)).toBe(perSet);
    const reclaimed = await repairCrisisDamage(seams, {
      kind: "ground",
      cell: { col: 4, row: 0 },
    });
    expect(reclaimed.status).toBe("repaired");
    expect(reclaimed.repaired).toBe(true);
    expect(session.crisisDamage().ruined_cells.map((c) => c.cell)).toEqual(["4,1"]);
    expect(await spendable(economy)).toBe(
      perSet - repairPriceFor({ kind: "ground", cell: { col: 4, row: 0 } }, CURRENT_ERA_ID),
    );

    // Then the building. Derived from the shipped numbers rather than written down, so a
    // retune of either changes the loop's length instead of failing here.
    const setsNeeded = Math.ceil((buildingPrice - (await spendable(economy))) / perSet);
    expect(setsNeeded).toBeGreaterThan(0);
    for (let index = 0; index < setsNeeded; index += 1) {
      await economy.reportInterleavedClear({ sessionId: `set-b${index}` });
    }
    expect(await spendable(economy)).toBeGreaterThanOrEqual(buildingPrice);

    const repaired = await repairCrisisDamage(seams, { kind: "building", nodeId });
    expect(repaired.status).toBe("repaired");
    expect(repaired.repaired).toBe(true);
    expect(session.crisisDamage().ruined_buildings).toEqual([]);

    // The city is whole again except the one cell they have not bought back yet, which is the
    // shape a per-item repair is supposed to produce: partial recovery is a legal state.
    expect(session.crisisDamage().ruined_cells).toHaveLength(1);
  });

  it("keeps the ruined building's LESSON STATE untouched throughout, so practice stays payable", async () => {
    // The reason the loop above closes at all. If ruin had touched mastery or the lesson
    // stage, the practice that funds the repair would be the thing the crisis took away.
    const { session, nodeId } = await brokeWithARuinedCity();
    const load = await session.load();
    const state = load.node_states.find((n) => n.node_id === nodeId);
    expect(state).toMatchObject({
      mastery: 3,
      lesson_stage: "done",
      completion_status: "complete",
    });
    // And the placement is still there, on the cell it was on — a ruin is never a removal.
    expect(load.placements?.find((p) => p.nodeId === nodeId)).toMatchObject({
      col: 2,
      row: 2,
    });
  });

  it("never charges twice for one ruin, even if the repair is asked for again", async () => {
    const { session, economy, nodeId } = await brokeWithARuinedCity();
    const seams = {
      damage: session.crisisDamage,
      economy,
      clearBuilding: session.repairRuinedBuilding,
      clearCell: session.reclaimRuinedCell,
      clearCivic: session.liftSuspendedCivic,
      eraId: CURRENT_ERA_ID,
    };
    const price = repairPriceFor({ kind: "building", nodeId }, CURRENT_ERA_ID);
    for (let index = 0; index < Math.ceil(price / EARN.interleaved.material); index += 1) {
      await economy.reportInterleavedClear({ sessionId: `set-${index}` });
    }
    const funded = await spendable(economy);

    await repairCrisisDamage(seams, { kind: "building", nodeId });
    const after = await spendable(economy);
    expect(after).toBe(funded - price);

    // Asked again, the ruin is gone: nothing is spent, and the status says why.
    const again = await repairCrisisDamage(seams, { kind: "building", nodeId });
    expect(again.status).toBe("not_ruined");
    expect(await spendable(economy)).toBe(after);
  });

  it("prices the whole recovery inside a realistic amount of practice", async () => {
    // The claim the tuning table makes — "a ruin is a real setback and never an
    // unrecoverable one" — as a number rather than a sentiment.
    const prices = hardWinterRepairPrices();
    const setsForABuilding = prices.per_building / EARN.interleaved.material;
    // **3 SETS AT A PAYOUT OF 20**, where it was 2.4 at 25 and 6 at the retired 10. The
    // claim this test makes — "a ruin is a real setback and never an unrecoverable one" —
    // is unchanged in direction and moves in degree with the payout, because the repair
    // prices do NOT move with it. That is the whole of what the payout half of the ruling
    // costs the crisis, and it is recorded here rather than inferred.
    expect(setsForABuilding).toBeCloseTo(3, 5);
    // A floor with a shape: a repair must still cost more than one set, or "a real
    // setback" would be a sentence with no arithmetic behind it.
    expect(setsForABuilding).toBeGreaterThan(1);
    // And a whole rim band of scarred ground (era one's shoreline is 28 cells) is the same
    // order of magnitude, not an order out: 84 material, under nine practice sets.
    expect((28 * prices.per_cell) / EARN.interleaved.material).toBeLessThanOrEqual(10);

    // **AND THE WHOLE RECOVERY FITS INSIDE THE ERA'S DRILL BOUND**, which is the check
    // the bound owes this file: a ceiling on drill income would be indefensible if the
    // worst crisis a learner can suffer cost more sets than the era will pay for. The
    // rim band plus a ruined building is the worst era-one case, and it clears with room.
    const worstCase =
      (28 * prices.per_cell + prices.per_building) / EARN.interleaved.material;
    expect(Math.ceil(worstCase)).toBeLessThanOrEqual(DRILL_PAID_SETS_PER_ERA);
  });
});
