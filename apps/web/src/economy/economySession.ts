import {
  applyCivicPurchase,
  applyGrant,
  applyRepairSpend,
  assertLedgerEntryInvariant,
  civicBootstrapGrant,
  computeMaterialBalances,
  countInterleavedGrants,
  DRILL_PAID_SETS_PER_ERA,
  drillSetsRemaining,
  type GrantInput,
  hasLessonCompletionGrant,
  interleavedGrant,
  type LedgerEntry,
  type LedgerView,
  lessonCompleteGrant,
  islandFoundingGrant,
  eraMaterialTotal,
  type MaterialIdentity,
  materialForEra,
  practiceSetGrant,
  REASON_ISLAND_RESET_PREFIX,
} from "@cr/economy";
import type { EraId } from "@cr/skill-graph";

import { cityEraId } from "../city/useCityEra";
import type {
  CivicPurchaseAsk,
  CivicPurchaseOutcome,
  EconomyClient,
  GrantOutcome,
  PracticeSetCompleteOutcome,
  RepairAsk,
  RepairOutcome,
  WalletView,
} from "./economyClient";

/**
 * The in-memory economy adapter (dev/CI/demo), mirroring `citySession.ts` /
 * `work-upload/store.ts`: it holds the append-only ledger in memory and delegates EVERY
 * rule (grant idempotency, atomic spend, the cap, the drill bound) to the pure
 * `@cr/economy` core. When `services/economy-api` lands, `createEconomyClient` swaps to a
 * server client satisfying the same interface — the core is identical, so nothing can
 * diverge.
 *
 * **IT HELD THREE PIECES OF STATE AND NOW HOLDS ONE.** The owned-prestige set (cosmetics
 * granted by crossing an XP level) and the slot→cosmetic equipped map went with the
 * 2026-08-03 shop and XP sunset. The ledger is what is left, and it was always the only
 * source of truth; the other two existed because ownership and an equip choice were the
 * two facts a ledger of grants and spends could not express.
 *
 * SERVER-AUTHORITATIVE SHAPE, kept even in memory: the client never mutates a
 * balance directly. It appends the pure core's returned ledger rows and RE-DERIVES
 * balances (`balance = sum(grants) - sum(spends)`), so a replayed grant is a
 * no-op and a purchase is atomic — exactly as the Lambda will behave.
 *
 * REFRESH SURVIVAL (#96). "In memory" used to mean "for one page view": every one
 * of the four pieces of state below was a closure variable, so a reload dropped
 * the wallet AND the ledger it is derived from. That was not merely lossy —
 * `reconcileProgress` re-derives grants from learning state on every city load, and
 * spends are NOT derivable from learning state, so a refresh refunded spent material
 * and handed back every already-paid practice set. The
 * adapter therefore opens on a restored {@link EconomyDevSnapshot} and can hand its
 * whole state back out ({@link InMemoryEconomyClient.snapshot}); the saving side is
 * `devPersistence/economyPersistence.ts`, a sibling of the city's dev store.
 */

const DEMO_STUDENT_ID = "demo-student";

/**
 * The era every priced call is made in — **the LIVE one**, read from the city's era store
 * (`useCityEra.cityEraId`) rather than declared here, so the economy and the city can never
 * disagree about which era the player is in. The pure core takes the era as a parameter
 * precisely so this adapter is the only thing that has to know: `packages/economy` may not
 * import `apps/`, and should not have to.
 *
 * ## ⚑ THIS WAS PINNED TO `CURRENT_ERA_ID`, AND THE PIN WAS A LIVE DEFECT
 *
 * It read *"Era advance is not wired, so this is era one and will be for as long as era one
 * is the only era with authored content"*. The advance **is** wired (`eraState.ts` +
 * `useCityEra.ts`), and all ten eras mint, so both halves of that sentence had expired.
 *
 * Measured at `03d5a2b9` by minting one lesson completion per era through this adapter and
 * reading the wallet back: era one granted `{stone: 100}` and the wallet answered
 * `spendable: 100, spendableMaterial: stone`; era two granted `{grain: 240}` and the wallet
 * answered **`spendable: 0, spendableMaterial: stone`**, and so on for all of eras three
 * through ten with their own materials. The GRANT path was already era-aware — it resolves
 * the node's era (`lessonCompleteGrant`) — so the credit was real, landed in the ledger,
 * and sat in a resource the HUD never displayed and no sink could spend.
 *
 * **A non-component module cannot call the hook, and that is the whole reason the pin
 * survived.** `cityEraId()` is the store's own snapshot exported for exactly this, so this
 * adapter is not a second source of truth about the era; see its docblock for why it is not
 * `loadEraId()` and why nothing here holds a module-level era of its own. Read on every
 * call rather than captured once, because this module is initialised during `App`'s first
 * render and the era moves under it later.
 */
const currentEra = (): EraId => cityEraId();

/**
 * The current era's material stockpile — the one number every sink spends from.
 *
 * ## WHAT AN ADVANCE DOES TO A BALANCE THE LEARNER ALREADY HELD
 *
 * **Nothing takes it away, and it does not follow them either.** `spendable` answers *what
 * can I spend right now*, so it is the LIVE era's stockpile and only that: a learner who
 * advances holding 40 stone reads their new era's material at 0 until they earn some. The
 * stone is not lost — the ledger is append-only, `computeMaterialBalances` still totals it,
 * `WalletView.materials` still carries it (that field is *"the full picture ... what a
 * per-era readout wants"*), and stepping back to era one reports the same 40.
 *
 * **Summing the materials instead would be wrong twice over.** Prices climb `2^(N-1)`
 * (`eraCostMultiplier`), so era-one stone spent at era-three prices is a 4x windfall; and
 * `computeBalances`'s own docblock names the failure — *"a wallet that absorbed a material
 * would silently make an era-scoped balance look permanent"*. The ratified rule for the
 * leftover is a HAIRCUT, not a free carry: O-6 sets `materialCarryForward(amount)` =
 * `floor(amount x 0.5 / 2)`, i.e. half the purchasing power.
 *
 * **That conversion is authored and still unwired, deliberately not wired here.** It needs a
 * ledger event of its own (`REASON_ERA_ADVANCE_PREFIX` exists, and `ledgerInvariant.test.ts`
 * already admits both legs under one `era_advance:<era_id>` id), an idempotency key per era,
 * and a caller at the advance — a feature, not a nullable read. Retaining a balance is the
 * conservative half and can never destroy one; converting it debits the learner, so it
 * belongs with whoever wires it rather than riding in on a wallet fix.
 */
function spendableOf(view: LedgerView): {
  spendable: number;
  spendableMaterial: MaterialIdentity | null;
} {
  const material = materialForEra(currentEra());
  if (material === null) {
    return { spendable: 0, spendableMaterial: null };
  }
  return {
    spendable: computeMaterialBalances(view)[material.id] ?? 0,
    spendableMaterial: material,
  };
}

/**
 * The persistable state of this adapter — the ONE piece it holds, and nothing derived.
 * `entries` is the source of truth for every balance and for which practice sets have
 * been paid. Deliberately snake_case like `CityDevSnapshot`, since it is a stored payload
 * rather than a live object.
 *
 * ## It has had four fields, then three, then one
 *
 * `last_restored_at_ms` (per-island restore timestamps) went out with the condition
 * clock, which is what {@link ECONOMY_DEV_SCHEMA_VERSION} v2 marks. `owned_prestige` and
 * `equipped` went out with the shop and XP on 2026-08-03, which is what v3 marks: they
 * were the two facts a ledger of grants and spends genuinely could not express, and
 * there is nothing left for them to express.
 */
export interface EconomyDevSnapshot {
  /** The append-only ledger, in append order. */
  readonly entries: readonly LedgerEntry[];
}

/**
 * The in-memory adapter, plus the dev-only read the persistence layer needs.
 * {@link snapshot} is NOT on {@link EconomyClient}: the server adapter will hold no
 * client-side state to snapshot, and dev persistence must not leak into the seam
 * both adapters share.
 */
export interface InMemoryEconomyClient extends EconomyClient {
  /** Everything this adapter holds, ready to store. */
  snapshot(): EconomyDevSnapshot;
}

export function createInMemoryEconomyClient(
  restored: EconomyDevSnapshot | null = null,
): InMemoryEconomyClient {
  // The append-only ledger — the single reconstructable source of truth, and since the
  // sunset the only state this adapter holds at all.
  let entries: readonly LedgerEntry[] = restored?.entries ?? [];

  const view = (): LedgerView => ({ entries });
  const nowMs = (): number => Date.now();

  const grant = (input: GrantInput): GrantOutcome => {
    const result = applyGrant(view(), input);
    if (result.applied) {
      entries = [...entries, ...result.rows];
    }
    return {
      applied: result.applied,
      materials: result.materials,
      grantedMaterials: result.grantedMaterials,
    };
  };

  // NO RESTORE-TIME RE-DERIVATION. There were two, and both were about cosmetics:
  // prestige was re-reconciled from the restored XP balance so a retuned milestone table
  // applied retroactively, and an equip was dropped when its slot's cosmetic was not
  // owned by the restored ledger. A restored snapshot is state this adapter itself wrote,
  // so with those two gone no rule is re-run on the way in at all — which is the
  // dev-persistence contract in its plain form.

  return {
    snapshot(): EconomyDevSnapshot {
      return { entries };
    },

    getWallet(): Promise<WalletView> {
      return Promise.resolve({
        // Derived from the ledger, so it can never be a number the client invented
        // (INV-COS-4).
        materials: computeMaterialBalances(view()),
        ...spendableOf(view()),
      });
    },

    appliedEventIds(): Promise<readonly string[]> {
      return Promise.resolve([...new Set(entries.map((entry) => entry.event_id))]);
    },

    repairRuin(ask: RepairAsk): Promise<RepairOutcome> {
      const material = materialForEra(currentEra());
      if (material === null) {
        // An era nobody has authored a material for cannot fund a repair, and saying "you
        // cannot afford this" would be a lie — no balance would ever be enough. The same
        // distinction `applySpend` and `applyCivicPurchase` both draw.
        return Promise.resolve({
          status: "era_material_unauthored",
          spendable: 0,
          cost: 0,
        });
      }
      const result = applyRepairSpend(view(), {
        studentId: DEMO_STUDENT_ID,
        damageId: ask.damageId,
        subjectKind: ask.subjectKind,
        subject: ask.subject,
        material: material.id,
        cost: ask.cost,
        nowMs: nowMs(),
      });
      // Fail-closed: append the debit ONLY on a real spend; every rejection leaves the
      // ledger untouched (the core already computed the unchanged balance).
      if (result.status === "spent") {
        entries = [...entries, ...result.rows];
      }
      return Promise.resolve({
        status: result.status,
        spendable: result.balance,
        cost: result.status === "spent" ? ask.cost : 0,
      });
    },

    purchaseCivicBuilding(ask: CivicPurchaseAsk): Promise<CivicPurchaseOutcome> {
      const result = applyCivicPurchase(view(), {
        studentId: DEMO_STUDENT_ID,
        placementId: ask.placementId,
        building: ask.building,
        currentEra: currentEra(),
        nowMs: nowMs(),
      });
      // Fail-closed: append the debit ONLY on a real spend; every rejection leaves the
      // ledger untouched (the core already computed the unchanged balance). Same shape as
      // `repairRuin`, deliberately — two sinks on one stockpile written two ways is how
      // one of them stops being atomic.
      if (result.status === "spent") {
        entries = [...entries, ...result.rows];
      }
      return Promise.resolve({
        status: result.status,
        spendable: result.balance,
        cost: result.cost,
        building: result.building,
      });
    },

    reportIslandFounded({ eraId }) {
      return Promise.resolve(
        grant(
          islandFoundingGrant({
            studentId: DEMO_STUDENT_ID,
            eraId,
            nowMs: nowMs(),
          }),
        ),
      );
    },

    reportCivicBootstrap({ eraId }) {
      return Promise.resolve(
        grant(
          civicBootstrapGrant({
            studentId: DEMO_STUDENT_ID,
            eraId,
            nowMs: nowMs(),
          }),
        ),
      );
    },

    resetIslandWallet({ eraId }): Promise<void> {
      const material = materialForEra(eraId);
      if (material === null) {
        return Promise.resolve();
      }
      const balance = computeMaterialBalances(view())[material.id] ?? 0;
      const target = eraMaterialTotal(eraId);
      const delta = target - balance;
      if (delta === 0) {
        return Promise.resolve();
      }
      const generation =
        entries.filter((entry) =>
          entry.reason_code.startsWith(`${REASON_ISLAND_RESET_PREFIX}${eraId}:`),
        ).length + 1;
      const row: LedgerEntry = {
        student_id: DEMO_STUDENT_ID,
        event_id: `${REASON_ISLAND_RESET_PREFIX}${eraId}:${generation}`,
        resource_type: material.id,
        kind: delta > 0 ? "grant" : "spend",
        amount: Math.abs(delta),
        reason_code: `${REASON_ISLAND_RESET_PREFIX}${eraId}:${generation}`,
        created_at: new Date(nowMs()).toISOString(),
      };
      assertLedgerEntryInvariant(row);
      entries = [...entries, row];
      return Promise.resolve();
    },

    reportLessonComplete({ nodeId }) {
      if (hasLessonCompletionGrant(view(), nodeId)) {
        return Promise.resolve({
          applied: false,
          materials: computeMaterialBalances(view()),
          grantedMaterials: {},
        });
      }
      return Promise.resolve(
        grant(lessonCompleteGrant({ studentId: DEMO_STUDENT_ID, nodeId, nowMs: nowMs() })),
      );
    },

    reportPracticeSetComplete({
      evidenceId,
      nodeId,
      mastery,
      struggleLevel,
    }): Promise<PracticeSetCompleteOutcome> {
      const selected = practiceSetGrant(view(), {
        studentId: DEMO_STUDENT_ID,
        evidenceId,
        nodeId,
        mastery,
        nowMs: nowMs(),
        struggleLevel: struggleLevel ?? null,
      });
      const outcome = grant(selected.grant);
      const material = materialForEra(selected.rewardEra);
      const paidSets = material === null ? 0 : countInterleavedGrants(view(), material.id);
      return Promise.resolve({
        ...outcome,
        eventId: selected.grant.eventId,
        rewardEra: selected.rewardEra,
        groupKey: selected.groupKey,
        rewardKind: selected.rewardKind,
        paidSets,
        setsRemaining: drillSetsRemaining(paidSets),
        setsBound: DRILL_PAID_SETS_PER_ERA,
      });
    },

    reportInterleavedClear({ sessionId, struggleLevel }) {
      // THE DRILL BOUND'S ONE INPUT, read from the persisted ledger rather than from a
      // counter riding beside it: a row count survives a refresh, and a session counter
      // is exactly the state #96 proved cannot. Scoped to the era by the MATERIAL rather
      // than by a stored era, so advancing renews the allowance with no migration.
      //
      // THAT LAST CLAUSE WAS FALSE UNTIL `currentEra()` STOPPED BEING A PIN. The ledger
      // side of it was always right, but `currentEra()` answered era one in every era, so
      // a cleared set minted `stone` in the Bronze Age, counted against the same `stone`
      // rows, and the allowance was spent once for the whole run instead of once per era.
      const material = materialForEra(currentEra());
      const priorPaidSets =
        material === null ? 0 : countInterleavedGrants(view(), material.id);
      const outcome = grant(
        interleavedGrant({
          studentId: DEMO_STUDENT_ID,
          sessionId,
          currentEra: currentEra(),
          nowMs: nowMs(),
          priorPaidSets,
          // Forwarded, never invented. `undefined` becomes `null`, which the recipe pays
          // the full rate for: an adapter that cannot see how the round went must not
          // guess a reduction against the learner.
          struggleLevel: struggleLevel ?? null,
        }),
      );
      // Re-counted AFTER the append rather than incremented, so a clamped, replayed or
      // unauthored-material grant reports what the ledger actually holds.
      const paidSets = material === null ? 0 : countInterleavedGrants(view(), material.id);
      return Promise.resolve({
        ...outcome,
        paidSets,
        setsRemaining: drillSetsRemaining(paidSets),
        setsBound: DRILL_PAID_SETS_PER_ERA,
      });
    },
  };
}
