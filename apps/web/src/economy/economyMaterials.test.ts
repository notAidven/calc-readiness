import {
  applyMaterialSpend,
  buildEventIdFor,
  DRILL_PAID_SETS_PER_ERA,
  EARN,
  ECONOMY_RESOURCES,
  eraMaterialTotal,
  eraScaledPrice,
  lessonCompleteEventId,
  lessonMaterialAmount,
  lessonMaterialAmountAfterFounding,
  materialForEra,
  materialForNode,
  practiceCompleteEventId,
} from "@cr/economy";
import { ERA_SEQUENCE, getEraNodes } from "@cr/skill-graph";
import { afterEach, describe, expect, it } from "vitest";

import { resetCityEra, setCityEra } from "../city/useCityEra";
import type { DevSessionStorage } from "../devPersistence/devSession";
import {
  createEconomyDevStore,
  ECONOMY_DEV_SCHEMA_VERSION,
  type EconomyDevStore,
  withEconomyDevPersistence,
} from "../devPersistence/economyPersistence";
import { createInMemoryEconomyClient, type InMemoryEconomyClient } from "./economySession";

/**
 * THE END-TO-END SLICE for era materials, on the layer that had no coverage: a
 * lesson completion in era one credits stone, the stone reads out of the wallet, it
 * survives a refresh through the real dev store, and it can then be spent on a
 * placement.
 *
 * Written against the REAL in-memory adapter and the REAL store (the precedent
 * `economyPersistence.test.ts` set), so the same `@cr/economy` core the app runs
 * decides every number here. Nothing is stubbed except the storage bytes.
 */

/** A localStorage stand-in whose bytes are the only thing a "refresh" carries over. */
function memoryStorage(): { storage: DevSessionStorage; entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    storage: {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => {
        entries.set(key, value);
      },
      removeItem: (key) => {
        entries.delete(key);
      },
    },
  };
}

/**
 * Open the economy exactly as `createEconomyClient` does. Calling this twice on ONE
 * storage IS the refresh under test: the second call is a new page view holding
 * nothing but the bytes the first one left behind.
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

/**
 * An era-one node, and the stone one of its lessons pays.
 *
 * The rate is DERIVED now (`ERA_MATERIAL_TOTAL ÷ the era's node count, × the ladder`)
 * rather than being a constant on `EARN.lessonComplete`, so it is read from the core
 * here. Era one is the ×1 era with six nodes, so it is still 100.
 */
const ERA_ONE_NODE = "NUM.S";
const LUMP = lessonMaterialAmount("prehistoric");

/**
 * The adapter reads the LIVE era, so every test here runs in whichever era the city store
 * is standing in — era one unless a test moves it. Reset after each, or the era one test
 * left behind becomes the era the next one silently measures.
 */
afterEach(resetCityEra);

describe("the slice — a lesson completion credits the era material", () => {
  it("resolves era one's node to stone before anything is granted", () => {
    expect(materialForNode(ERA_ONE_NODE)?.id).toBe("stone");
    expect(LUMP).toBe(100);
  });

  it("credits the lump as the ONLY row under its event id", async () => {
    const { storage } = memoryStorage();
    const { client } = openEconomy(storage);

    const outcome = await client.reportLessonComplete({ nodeId: ERA_ONE_NODE });
    expect(outcome.applied).toBe(true);
    expect(outcome.grantedMaterials).toEqual({ stone: LUMP });

    // ONE row, one event. It was three while gold existed and two while XP did, and the
    // idempotency key `(student_id, event_id, resource_type)` is unchanged throughout.
    const rows = client.snapshot().entries;
    expect(rows).toHaveLength(1);
    expect(new Set(rows.map((r) => r.event_id))).toEqual(
      new Set([lessonCompleteEventId(ERA_ONE_NODE)]),
    );
    expect(rows.map((r) => r.resource_type)).toEqual(["stone"]);
  });

  it("reads the stockpile out of the wallet, and the wallet is nothing else", async () => {
    const { storage } = memoryStorage();
    const { client } = openEconomy(storage);
    await client.reportLessonComplete({ nodeId: ERA_ONE_NODE });

    const wallet = await client.getWallet();
    expect(wallet.materials).toEqual({ stone: LUMP });
    // `balances` and `xpLevel` sat beside these until the 2026-08-03 sunset, and the
    // assertion here was that a material must NOT be absorbed into the xp wallet. There
    // is one projection now, so the claim becomes a census of the fields the wallet has.
    expect(Object.keys(wallet).sort()).toEqual([
      "materials",
      "spendable",
      "spendableMaterial",
    ]);
    // And the one number every sink spends from, which is the stockpile itself.
    expect(wallet.spendable).toBe(LUMP);
    expect(wallet.spendableMaterial?.id).toBe("stone");
  });

  it("is idempotent — a replayed completion pays no second lump", async () => {
    const { storage } = memoryStorage();
    const { client } = openEconomy(storage);
    await client.reportLessonComplete({ nodeId: ERA_ONE_NODE });
    const replay = await client.reportLessonComplete({ nodeId: ERA_ONE_NODE });

    expect(replay.applied).toBe(false);
    expect(replay.grantedMaterials).toEqual({});
    expect(replay.materials).toEqual({ stone: LUMP });
    expect((await client.getWallet()).materials).toEqual({ stone: LUMP });
  });

  it("selects one first-set transaction, pays a genuine repeat, and survives a reload", async () => {
    const { storage } = memoryStorage();
    const firstPage = openEconomy(storage);
    const first = await firstPage.client.reportPracticeSetComplete({
      evidenceId: "ordinary-set-1",
      nodeId: ERA_ONE_NODE,
      mastery: 2,
    });
    expect(first).toMatchObject({
      applied: true,
      rewardKind: "skill_completion",
      groupKey: lessonCompleteEventId(ERA_ONE_NODE),
      grantedMaterials: { stone: LUMP },
    });
    const reconciled = await firstPage.client.reportLessonComplete({
      nodeId: ERA_ONE_NODE,
    });
    expect(reconciled).toMatchObject({ applied: false, grantedMaterials: {} });
    expect(firstPage.client.snapshot().entries).toHaveLength(1);

    const repeat = await firstPage.client.reportPracticeSetComplete({
      evidenceId: "ordinary-set-2",
      nodeId: ERA_ONE_NODE,
      mastery: 3,
    });
    expect(repeat).toMatchObject({
      applied: true,
      rewardKind: "repeat_practice",
      eventId: practiceCompleteEventId("ordinary-set-2"),
      grantedMaterials: { stone: EARN.interleaved.material },
    });
    const exactDelta = LUMP + EARN.interleaved.material;
    expect((await firstPage.client.getWallet()).spendable).toBe(exactDelta);

    const reloaded = openEconomy(storage).client;
    const replay = await reloaded.reportPracticeSetComplete({
      evidenceId: "ordinary-set-2",
      nodeId: ERA_ONE_NODE,
      mastery: 3,
    });
    expect(replay.applied).toBe(false);
    expect(replay.grantedMaterials).toEqual({});
    expect((await reloaded.getWallet()).spendable).toBe(exactDelta);
    expect(reloaded.snapshot().entries).toHaveLength(2);
  });

  it("pays a later era's OWN material through the real adapter, not nothing", async () => {
    // **THE END-TO-END PROOF THAT D-5 IS CLOSED**, through the shipped adapter and the
    // shipped store rather than through the pure core. This asserted `{}` — era two's
    // lesson paid XP and no material at all, because minting was gated on whether the
    // era's learner-facing WORDS were authored. Nine eras out of ten were in that state.
    //
    // EXP.1 sits in era two. Its island already received the 240-grain founding advance,
    // so each of its five lessons pays 192 and the complete era still totals 1,200.
    const { storage } = memoryStorage();
    const { client } = openEconomy(storage);
    const outcome = await client.reportLessonComplete({ nodeId: "EXP.1" });

    expect(outcome.applied).toBe(true);
    expect(outcome.grantedMaterials).toEqual({ grain: 192 });
    expect((await client.getWallet()).materials).toEqual({ grain: 192 });
    // And it is era TWO's material, not era one's — the fail-safe that mattered when the
    // gate was shut still matters now that it is open, for the opposite reason.
    expect((await client.getWallet()).materials.stone).toBeUndefined();
  });

  it("keeps Presenter LF.1 on its Atomic wallet while the visible city remains Era 2", async () => {
    setCityEra("neolithic");
    const { storage } = memoryStorage();
    const { client } = openEconomy(storage);
    await client.resetIslandWallet({ eraId: "neolithic" });
    await client.resetIslandWallet({ eraId: "atomic_age" });
    const before = await client.getWallet();
    const outcome = await client.reportPracticeSetComplete({
      evidenceId: "presenter-lf1-set-1",
      nodeId: "LF.1",
      mastery: 3,
    });
    const exactDelta = lessonMaterialAmountAfterFounding("LF.1");

    expect(before.spendableMaterial?.id).toBe("grain");
    expect(before.spendable).toBe(eraMaterialTotal("neolithic"));
    expect(before.materials.electricity).toBe(eraMaterialTotal("atomic_age"));
    expect(outcome).toMatchObject({
      applied: true,
      rewardEra: "atomic_age",
      rewardKind: "skill_completion",
      grantedMaterials: { electricity: exactDelta },
    });
    const after = await client.getWallet();
    expect(after.materials.electricity).toBe(
      (before.materials.electricity ?? 0) + exactDelta,
    );
    expect(after.spendableMaterial?.id).toBe("grain");
    expect(after.spendable).toBe(before.spendable);
    expect(after.materials.grain).toBe(before.materials.grain);

    const repeat = await client.reportPracticeSetComplete({
      evidenceId: "presenter-lf1-set-2",
      nodeId: "LF.1",
      mastery: 3,
    });
    const repeatDelta = eraScaledPrice(EARN.interleaved.material, "atomic_age");
    expect(repeat).toMatchObject({
      applied: true,
      rewardEra: "atomic_age",
      rewardKind: "repeat_practice",
      grantedMaterials: { electricity: repeatDelta },
    });
    const afterRepeat = await client.getWallet();
    expect(afterRepeat.materials.electricity).toBe(
      (before.materials.electricity ?? 0) + exactDelta + repeatDelta,
    );
    expect(afterRepeat.spendable).toBe(before.spendable);
    expect(afterRepeat.materials.grain).toBe(before.materials.grain);
  });

  it("reads that later era's credit back as SPENDABLE, in the era's own material", async () => {
    // **THE OTHER HALF OF THE ROUND TRIP, WHICH THE CASE ABOVE DOES NOT COVER.** That one
    // asserts `grantedMaterials` and `materials` and stops there, and that gap was a live
    // defect: measured at `03d5a2b9`, era two granted `{grain: 240}` and the same wallet
    // answered `spendable: 0, spendableMaterial: stone`, because the adapter's `currentEra`
    // was pinned to `CURRENT_ERA_ID` while the grant path resolved the node's era. The
    // credit was real and landed where the HUD never displays and no sink can spend.
    setCityEra("neolithic");
    const { storage } = memoryStorage();
    const { client } = openEconomy(storage);
    await client.reportLessonComplete({ nodeId: "EXP.1" });

    const wallet = await client.getWallet();
    expect(wallet.spendableMaterial?.id).toBe("grain");
    expect(wallet.spendable).toBe(lessonMaterialAmountAfterFounding("EXP.1"));
    expect(wallet.spendable).toBe(192);
    // The one number every sink reads agrees with the stockpile it is drawn from, which is
    // the property that was false: 240 granted, 0 spendable.
    expect(wallet.spendable).toBe(wallet.materials.grain);
  });

  it("does it for ALL TEN eras, so nothing is pinned to a first or a last", async () => {
    // The defect held in nine eras, so the fix is measured in ten rather than argued from
    // one. Each era mints through its OWN first node while the city stands in that era —
    // both halves matter, since the grant resolves the node and the wallet resolves the
    // city.
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    for (const era of ERA_SEQUENCE) {
      const nodeId = getEraNodes(era.id)[0];
      if (nodeId === undefined) {
        throw new Error(`${era.id} curates no nodes, so nothing can mint there`);
      }
      setCityEra(era.id);
      const { storage } = memoryStorage();
      const { client } = openEconomy(storage);
      const grant = await client.reportLessonComplete({ nodeId });
      const wallet = await client.getWallet();
      const expected = materialForEra(era.id);
      if (expected === null) {
        throw new Error(`${era.id} resolves no material, which the registry forbids`);
      }

      expect(wallet.spendableMaterial?.id, `${era.id} spends the wrong material`).toBe(
        expected.id,
      );
      expect(wallet.spendable, `${era.id} credits nothing spendable`).toBe(
        lessonMaterialAmountAfterFounding(nodeId),
      );
      expect(grant.grantedMaterials, `${era.id} granted something else`).toEqual({
        [expected.id]: lessonMaterialAmountAfterFounding(nodeId),
      });
    }
  });

  it("keeps a balance the learner already held when the era advances", async () => {
    // The question an advance raises for a learner mid-run, answered as behaviour rather
    // than in a comment: `spendable` is "what can I spend HERE", so it is the live era's
    // stockpile and reads 0 on arrival — and the stone is not confiscated. It stays on the
    // append-only ledger, stays in `materials` (the full picture), and is handed straight
    // back on returning to the era that can spend it.
    //
    // Summing the two instead would be a 4x windfall at era two's prices, and the ratified
    // rule for the leftover is the opposite direction — `materialCarryForward` is a HAIRCUT
    // of half the purchasing power. That conversion is authored and still unwired; nothing
    // here may quietly stand in for it, in either direction.
    setCityEra("prehistoric");
    const { storage } = memoryStorage();
    const { client } = openEconomy(storage);
    await client.reportLessonComplete({ nodeId: ERA_ONE_NODE });
    expect((await client.getWallet()).spendable).toBe(LUMP);

    setCityEra("neolithic");
    const advanced = await client.getWallet();
    expect(advanced.spendableMaterial?.id).toBe("grain");
    expect(advanced.spendable).toBe(0);
    // NOT LOST — the distinction this whole case exists to make.
    expect(advanced.materials).toEqual({ stone: LUMP });

    setCityEra("prehistoric");
    const back = await client.getWallet();
    expect(back.spendable).toBe(LUMP);
    expect(back.spendableMaterial?.id).toBe("stone");
  });

  it("credits nothing at all for a node in no era, and writes no row", async () => {
    // It "still paid xp" until the sunset, so this was an `applied` grant with an empty
    // material record. There is nothing left to pay, so the whole grant is a no-op —
    // which is honest about a node the era registry cannot place.
    const { storage } = memoryStorage();
    const { client } = openEconomy(storage);
    const outcome = await client.reportLessonComplete({ nodeId: "NOT.A.NODE" });

    expect(outcome.applied).toBe(false);
    expect(outcome.grantedMaterials).toEqual({});
    expect(client.snapshot().entries).toEqual([]);
  });

  it("credits the era material on an interleaved clear", async () => {
    // This asserted that neither row 2 nor row 3 paid a material, and it has moved twice:
    // practice pays the currency per the gold-drop ruling, and row 3 is gone entirely
    // with XP, so there is no star half left to contrast it against.
    const { storage } = memoryStorage();
    const { client } = openEconomy(storage);

    const interleaved = await client.reportInterleavedClear({ sessionId: "sess-1" });
    expect(interleaved.applied).toBe(true);
    expect(interleaved.grantedMaterials).toEqual({
      stone: EARN.interleaved.material,
    });

    expect((await client.getWallet()).materials).toEqual({
      stone: EARN.interleaved.material,
    });
  });
});

/**
 * **THE DRILL BOUND RENEWS ON AN ADVANCE, WHICH `ledger.ts` CLAIMED AND THIS TREE DID NOT
 * DO.** `countInterleavedGrants`'s docblock says scoping the count by the MATERIAL is what
 * makes the bound per-era *"without anything storing an era: an era advance renews the
 * allowance for free"*. The ledger half was always right; the adapter half was not. Measured
 * at `03d5a2b9`: a cleared set minted `stone` in every one of the ten eras, so every set
 * counted against the same `stone` rows and the allowance was spent once for the whole run.
 */
describe("the slice — the interleaved payout follows the era, so its bound renews", () => {
  it("pays the era's own material for a cleared set, in every era", async () => {
    for (const era of ERA_SEQUENCE) {
      setCityEra(era.id);
      const { storage } = memoryStorage();
      const { client } = openEconomy(storage);
      const material = materialForEra(era.id);
      if (material === null) {
        throw new Error(`${era.id} resolves no material, which the registry forbids`);
      }

      const cleared = await client.reportInterleavedClear({ sessionId: `set-${era.id}` });
      expect(cleared.grantedMaterials, `${era.id} paid the wrong material`).toEqual({
        [material.id]: eraScaledPrice(EARN.interleaved.material, era.id),
      });
      // A fresh era's first paid set, so the whole allowance bar this one is still ahead.
      expect(cleared.paidSets, `${era.id} did not count its own set`).toBe(1);
      expect(cleared.setsRemaining).toBe(DRILL_PAID_SETS_PER_ERA - 1);
    }
  });

  it("hands back a full allowance in era two after era one's is spent to the last set", async () => {
    // The renewal, driven rather than reasoned about: exhaust era one, watch it stop paying,
    // advance, watch the next era pay from set one. On one ledger throughout, because a
    // fresh ledger would prove nothing about renewal.
    setCityEra("prehistoric");
    const { storage } = memoryStorage();
    const { client } = openEconomy(storage);

    for (let set = 1; set <= DRILL_PAID_SETS_PER_ERA; set += 1) {
      const paid = await client.reportInterleavedClear({ sessionId: `era1-${set}` });
      expect(paid.paidSets, `era one lost count at set ${set}`).toBe(set);
      expect(paid.grantedMaterials).toEqual({
        stone: eraScaledPrice(EARN.interleaved.material, "prehistoric"),
      });
    }

    // THE BOUND BITING, which is the floor under the renewal below: without this the next
    // era paying would be indistinguishable from a bound that never bound anything.
    const overrun = await client.reportInterleavedClear({ sessionId: "era1-overrun" });
    expect(overrun.grantedMaterials).toEqual({});
    expect(overrun.setsRemaining).toBe(0);
    // Nothing is credited at all past the bound since the XP sunset, so the grant is
    // unapplied and `setsRemaining` is the only thing that says which nothing this is.
    expect(overrun.applied).toBe(false);

    setCityEra("neolithic");
    const renewed = await client.reportInterleavedClear({ sessionId: "era2-1" });
    expect(renewed.grantedMaterials).toEqual({
      grain: eraScaledPrice(EARN.interleaved.material, "neolithic"),
    });
    expect(renewed.paidSets).toBe(1);
    expect(renewed.setsRemaining).toBe(DRILL_PAID_SETS_PER_ERA - 1);

    // And era one's spent allowance is still spent — the renewal is per era, not a reset.
    setCityEra("prehistoric");
    const eraOneAgain = await client.reportInterleavedClear({ sessionId: "era1-after" });
    expect(eraOneAgain.grantedMaterials).toEqual({});
    expect(eraOneAgain.setsRemaining).toBe(0);
  });
});

describe("the slice — the stockpile survives a refresh", () => {
  it("restores the stone from the stored ledger, not from learning state", async () => {
    const { storage } = memoryStorage();

    const first = openEconomy(storage);
    await first.client.reportLessonComplete({ nodeId: ERA_ONE_NODE });
    expect((await first.client.getWallet()).materials).toEqual({ stone: LUMP });

    // The refresh: a new adapter with nothing but the bytes.
    const second = openEconomy(storage);
    expect((await second.client.getWallet()).materials).toEqual({ stone: LUMP });
    // And the event is still recorded, so reconciliation will not re-pay it.
    expect(await second.client.appliedEventIds()).toContain(
      lessonCompleteEventId(ERA_ONE_NODE),
    );
  });

  it("stamps the CURRENT schema version, so a bump is never silent", async () => {
    const { storage, entries } = memoryStorage();
    const { store, client } = openEconomy(storage);
    await client.reportLessonComplete({ nodeId: ERA_ONE_NODE });

    const raw = entries.get(store.storageKey());
    expect(raw).toBeDefined();
    expect(JSON.parse(raw ?? "{}").version).toBe(ECONOMY_DEV_SCHEMA_VERSION);
    // Pinned to the literal, and the value carries its reason. It read 1 while
    // materials were the newest change (they widened a value set and bought no bump),
    // 2 when the condition clock was sunset and `last_restored_at_ms` left the
    // snapshot, and 3 for the gold-drop — see the constant's docblock for why a
    // REPURPOSED id needs a bump where a retired one does not.
    expect(ECONOMY_DEV_SCHEMA_VERSION).toBe(4);
  });

  it("DISCARDS a blob holding an xp row, which it used to load happily", async () => {
    const { storage, entries } = memoryStorage();
    const store = createEconomyDevStore({ storage, enabled: true });
    // **THIS CASE HAS TURNED OVER, AND THE TURN IS THE SUNSET.** It was the
    // MATERIAL-WIDENING claim: a blob written before materials existed held only `xp`
    // rows and had to parse identically, so nobody's saved wallet was discarded by the
    // widening. `xp` left `ECONOMY_RESOURCES` on 2026-08-03, so the derived allow-list
    // now rejects that same row and the all-or-nothing parse drops the blob — which is
    // the `flint` outcome, and the right one: a wallet whose only rows are denominated
    // in a resource the game no longer has is not a wallet worth restoring.
    entries.set(
      store.storageKey(),
      JSON.stringify({
        version: ECONOMY_DEV_SCHEMA_VERSION,
        saved_at: "2026-07-27T10:00:00.000Z",
        economy: {
          entries: [
            {
              student_id: "demo-student",
              event_id: lessonCompleteEventId(ERA_ONE_NODE),
              resource_type: "xp",
              kind: "grant",
              amount: 15,
              reason_code: "lesson_complete",
              created_at: "2026-07-27T10:00:00.000Z",
            },
          ],
        },
      }),
    );

    expect(ECONOMY_RESOURCES as readonly string[]).not.toContain("xp");
    expect(store.load()).toBeNull();
    const client = withEconomyDevPersistence(
      createInMemoryEconomyClient(store.load()),
      store,
    );
    const wallet = await client.getWallet();
    expect(wallet.materials).toEqual({});
    expect(wallet.spendable).toBe(0);
  });

  it("refuses to read a pre-gold-drop blob whose `gold` row means the currency", async () => {
    // **THE EVIDENCE FOR THE v3 BUMP**, and it is the case the earlier material rename
    // did NOT have. `flint` was RETIRED, so it fell out of `ECONOMY_RESOURCES` and the
    // derived allow-list rejected it for free. `gold` was REPURPOSED: it is in that
    // union before the drop and after it, so the allow-list admits the row either way
    // and cannot see that the word changed meaning from the wallet to era five's
    // stockpile.
    //
    // Without the bump this blob restores cleanly and the 15 lands as an era FIVE
    // stockpile for a player in era one — a silently wrong wallet, which this store's
    // own all-or-nothing parse exists to prevent. The version is part of the storage
    // key, so a pre-drop payload is never fetched at all.
    const { storage, entries } = memoryStorage();
    const store = createEconomyDevStore({ storage, enabled: true });
    const preDropBlob = JSON.stringify({
      version: 2,
      saved_at: "2026-07-29T18:00:00.000Z",
      economy: {
        entries: [
          {
            student_id: "demo-student",
            event_id: lessonCompleteEventId(ERA_ONE_NODE),
            resource_type: "gold",
            kind: "grant",
            amount: 15,
            reason_code: "lesson_complete",
            cosmetic_id: null,
            created_at: "2026-07-29T18:00:00.000Z",
          },
        ],
      },
    });

    // At the v2 key it lived at, which the store no longer resolves — route 1 of the
    // three the parser's docblock lists. The key is DERIVED from today's rather than
    // written out, so this stays true when the version moves again.
    const currentKey = store.storageKey();
    expect(currentKey).toContain(`.v${ECONOMY_DEV_SCHEMA_VERSION}.`);
    entries.set(
      currentKey.replace(`.v${ECONOMY_DEV_SCHEMA_VERSION}.`, ".v2."),
      preDropBlob,
    );
    expect(store.load()).toBeNull();

    // And route 2, forced: even handed the payload under TODAY's key, the version
    // check rejects it outright rather than restoring per-field.
    entries.set(store.storageKey(), preDropBlob);
    expect(store.load()).toBeNull();

    // The row itself is the proof that the allow-list is no defence here: it would be
    // admitted by `isLedgerEntry` on its own, because `gold` is a live resource id.
    expect(ECONOMY_RESOURCES as readonly string[]).toContain("gold");

    // So the app comes up on an EMPTY wallet, which is reconstructable from learning
    // state, rather than on a wrong one, which is not.
    const wallet = await createInMemoryEconomyClient(store.load()).getWallet();
    expect(wallet.materials).toEqual({});
    expect(wallet.spendable).toBe(0);
  });

  it("discards a blob whose material row is forged into a spend of XP", async () => {
    const { storage, entries } = memoryStorage();
    const store = createEconomyDevStore({ storage, enabled: true });
    entries.set(
      store.storageKey(),
      JSON.stringify({
        version: ECONOMY_DEV_SCHEMA_VERSION,
        saved_at: "2026-07-29T10:00:00.000Z",
        economy: {
          entries: [
            {
              student_id: "demo-student",
              event_id: "forged",
              resource_type: "xp",
              kind: "spend",
              amount: 100,
              reason_code: "build:p1",
              created_at: "2026-07-29T10:00:00.000Z",
            },
          ],
        },
      }),
    );

    // The widened allow-list admits `stone`; it must NOT have admitted a spend of xp.
    //
    // The fixture is stamped at the CURRENT version, not the literal 1 it used to
    // carry. At `version: 1` the parser rejected it on the version check and never
    // reached the row guard at all, so this case was green for the wrong reason — it
    // proved that a v1 blob is not read, which is a different test that already exists.
    expect(store.load()).toBeNull();
  });

  it("discards a blob holding a PRE-RENAME material id, and deletes it", async () => {
    // The one durable surface the 2026-07-29 rename reached: a wallet saved in the
    // minutes between #227 merging and `flint` becoming `stone`. `flint` is no longer
    // in ECONOMY_RESOURCES, so the all-or-nothing parse rejects the blob rather than
    // restoring a stockpile denominated in a resource that no longer exists — and it
    // REMOVES it, which is why that rename needed no schema bump of its own.
    //
    // Stamped at the current version for the same reason as the case above: at
    // `version: 1` the allow-list was never consulted.
    const { storage, entries } = memoryStorage();
    const store = createEconomyDevStore({ storage, enabled: true });
    const key = store.storageKey();
    entries.set(
      key,
      JSON.stringify({
        version: ECONOMY_DEV_SCHEMA_VERSION,
        saved_at: "2026-07-29T16:50:00.000Z",
        economy: {
          entries: [
            {
              student_id: "demo-student",
              event_id: lessonCompleteEventId(ERA_ONE_NODE),
              resource_type: "flint",
              kind: "grant",
              amount: 100,
              reason_code: "lesson_complete",
              cosmetic_id: null,
              created_at: "2026-07-29T16:50:00.000Z",
            },
          ],
        },
      }),
    );

    expect(store.load()).toBeNull();
    expect(entries.has(key)).toBe(false);

    // And the app comes up on an empty wallet rather than a half-restored one.
    const client = createInMemoryEconomyClient(store.load());
    const wallet = await client.getWallet();
    expect(wallet.materials).toEqual({});
    expect(wallet.spendable).toBe(0);
  });

  it("discards a blob denominated in a resource that does not exist", async () => {
    const { storage, entries } = memoryStorage();
    const store = createEconomyDevStore({ storage, enabled: true });
    entries.set(
      store.storageKey(),
      JSON.stringify({
        version: ECONOMY_DEV_SCHEMA_VERSION,
        saved_at: "2026-07-29T10:00:00.000Z",
        economy: {
          entries: [
            {
              student_id: "demo-student",
              event_id: "e",
              resource_type: "unobtanium",
              kind: "grant",
              amount: 100,
              reason_code: "lesson_complete",
              cosmetic_id: null,
              created_at: "2026-07-29T10:00:00.000Z",
            },
          ],
        },
      }),
    );

    expect(store.load()).toBeNull();
  });
});

describe("the slice — the restored stockpile can then be spent", () => {
  it("places a building out of stone that a refresh carried over", async () => {
    const { storage } = memoryStorage();

    const first = openEconomy(storage);
    await first.client.reportLessonComplete({ nodeId: ERA_ONE_NODE });

    const second = openEconomy(storage);
    const restored = second.client.snapshot();

    // Era one's Family Lodge: 80 stone (`civic-buildings.md` §3).
    const spend = applyMaterialSpend(
      { entries: restored.entries },
      {
        studentId: "demo-student",
        placementId: "longhouse-12-7",
        material: "stone",
        cost: 80,
        nowMs: Date.parse("2026-07-29T12:00:00.000Z"),
      },
    );
    expect(spend.status).toBe("spent");
    expect(spend.balance).toBe(LUMP - 80);
    expect(spend.rows[0]?.event_id).toBe(buildEventIdFor("longhouse-12-7"));

    // And it cannot outspend the stockpile that survived.
    const overspend = applyMaterialSpend(
      { entries: restored.entries },
      {
        studentId: "demo-student",
        placementId: "hearth-3-4",
        material: "stone",
        cost: LUMP + 1,
        nowMs: Date.parse("2026-07-29T12:00:00.000Z"),
      },
    );
    expect(overspend.status).toBe("insufficient_material");
    expect(overspend.balance).toBe(LUMP);
  });
});
