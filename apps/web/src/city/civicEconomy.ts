import { findCivicBuilding, materialForEra } from "@cr/economy";
import type { EraId } from "@cr/skill-graph";

import type {
  CivicPurchaseOutcome,
  EconomyClient,
  RepairOutcome,
  WalletView,
} from "../economy/economyClient";

/**
 * The CIVIC-BUILDING material-spend SEAM (composition-root decorator).
 *
 * Buying a civic building spends the era's material (era one: `stone`, 80–120 a
 * building), and it is REPEATABLE — the catalogue is buildable *"as many times as you
 * can afford"*. `@cr/economy` has the right primitive for it, `applyMaterialSpend`,
 * whose own header says it is *"a seam for a server-side catalogue"*. What it did NOT
 * have when this was written was a way to reach it: `EconomyClient` exposed
 * `purchaseCosmetic` and the three earn reports, and no material spend at all. (Both of
 * those are gone now — the cosmetic purchase with the 2026-08-03 shop sunset, the star
 * report with XP — and `purchaseCivicBuilding` is the ledger-backed spend that landed.)
 *
 * So this follows the pattern the gold sink already set (`roadsEconomy.ts`, verbatim:
 * *"the roads spend is recorded on the CITY side and this thin decorator nets it out of
 * the ONE shared wallet"*): `citySession.placeCivic` records the spend, and this nets it
 * out of the stockpile the HUD and the affordability check both read.
 *
 * Same discipline, same three properties:
 *   - it NEVER mints material — it only ever SUBTRACTS a recorded spend from the
 *     server-authoritative stockpile and clamps at zero;
 *   - ONE stockpile for every material sink, so two sinks can never each spend the
 *     same stone;
 *   - fail-closed: a purchase the netted stockpile cannot cover is refused with
 *     nothing spent (`placeCivic` returns `insufficient_material`).
 *
 * **THE FOLLOW-UP, stated so it is not mistaken for finished:** the right shape is
 * `EconomyClient.spendMaterial` delegating to `applyMaterialSpend`, which would put the
 * spend in the LEDGER — idempotent per placement id, and durable without a session
 * counter riding alongside. That is a change to Gabriel's interface and his in-memory
 * adapter, which is his to take; `roadsEconomy.ts` flagged the identical follow-up for
 * gold and it is still open. Until then a civic spend survives a refresh through
 * `CityDevSnapshot.civic_material_spent` rather than through the ledger, exactly as a
 * road spend survives through `road_gold_spent`.
 *
 * ## THE GOLD-DROP MADE THE OTHER TWO SINKS SHARE THIS STOCKPILE
 *
 * This file used to say it *"nets GOLD nothing, which is not an omission: no row of any
 * of the ten catalogues is priced in gold, and roads are priced in nothing else."* That
 * was true and is now false in the half that mattered: `integration` retired gold, so
 * **roads are priced in the era material too**, and three sinks — roads, civic buildings,
 * crisis repair — draw on one number. (Cosmetics were a fourth until the shop was
 * sunset.) The claim that the decorators *"compose rather than compete — each touches the
 * other's resource not at all"* went with it.
 *
 * So the guards below are not new policy, they are this file's own third property
 * (*"ONE stockpile for every material sink, so two sinks can never each spend the same
 * stone"*) finally having someone to enforce it against. The shape is `roadsEconomy.ts`'s,
 * deliberately verbatim rather than re-invented — its header already named *"(in time) the
 * civic build menu"* as the third reader, and two sinks guarding one balance in two
 * different shapes is how they drift.
 *
 * Netting lands on `spendable` and NOT on `materials`, again following that file:
 * `materials` is the ledger's own raw per-material projection and a civic spend is not in
 * the ledger, while `spendable` is what every affordability check reads.
 */
export function createCivicMaterialEconomy(
  base: EconomyClient,
  /** Era material sunk into civic buildings — `citySession.civicMaterialSpent`. */
  civicMaterialSpent: () => number,
  /** The era the city is in, which decides WHICH material the spend comes out of. */
  eraId: EraId | (() => EraId),
): EconomyClient {
  const spent = (): number => Math.max(0, Math.trunc(civicMaterialSpent()));
  const currentEra = (): EraId => (typeof eraId === "function" ? eraId() : eraId);

  const netWallet = async (): Promise<WalletView> => {
    const wallet = await base.getWallet();
    const material = materialForEra(currentEra());
    // An era whose material nobody has authored credits none and can spend none, so
    // there is nothing to net and the wallet forwards untouched. `earn.ts` takes the
    // same position on the grant side, which is what keeps the two consistent.
    if (material === null) {
      return wallet;
    }
    // `spendable` is only ours to net when it is denominated in the material this
    // decorator was built for. In every era in play they are the same material; the check
    // is what keeps that a fact rather than an assumption.
    if (wallet.spendableMaterial?.id !== material.id) {
      return wallet;
    }
    return {
      ...wallet,
      spendable: Math.max(0, wallet.spendable - spent()),
    };
  };

  return {
    getWallet: netWallet,
    // A pure ledger read: a civic spend nets out of the STOCKPILE, never out of which
    // earn events have been recorded, so this forwards untouched.
    appliedEventIds: () => base.appliedEventIds(),
    async purchaseCivicBuilding(input): Promise<CivicPurchaseOutcome> {
      // A sink on the one stockpile, and the one this decorator is named after.
      // Guarded against the CIVIC-NET balance for the same reason the others are, and
      // `roadsEconomy.ts`'s wording is followed deliberately rather than re-invented — two
      // sinks guarding one balance in two different shapes is how they drift.
      //
      // FORWARDING IT UNTOUCHED IS THE DOUBLE-SPEND, measured rather than argued: the base
      // sees the AUTHORITATIVE stockpile while the material already sunk into civic
      // buildings lives in a counter only this decorator nets out, so a second building is
      // sold out of material the first one spent and the outcome reports 160 to a player
      // who has 80. `civicEconomy.test.ts` fails at both lines when this is a bare forward.
      //
      // The cost is read from the CATALOGUE rather than re-derived: a guard that computes
      // a price a second way is a guard that can disagree with the spend it guards. Civic
      // costs are authored at each era's own scale, so there is no `eraScaledPrice` here.
      const building = findCivicBuilding(input.building);
      const wallet = await netWallet();
      if (building !== null && wallet.spendable < building.cost) {
        return {
          status: "insufficient_material",
          spendable: wallet.spendable,
          cost: 0,
          building: null,
        };
      }
      const outcome = await base.purchaseCivicBuilding(input);
      return { ...outcome, spendable: Math.max(0, outcome.spendable - spent()) };
    },
    async repairRuin(input): Promise<RepairOutcome> {
      // A crisis repair is the third sink on the one stockpile and it arrived from
      // another lane, so it gets the same guard for the same reason: material a civic
      // building already claimed must not fund a repair, and the balance the refusal
      // reports has to be the netted one the player can actually see.
      const wallet = await netWallet();
      if (wallet.spendable < input.cost) {
        return { status: "insufficient_material", spendable: wallet.spendable, cost: 0 };
      }
      const outcome = await base.repairRuin(input);
      return { ...outcome, spendable: Math.max(0, outcome.spendable - spent()) };
    },
    reportIslandFounded: (input) => base.reportIslandFounded(input),
    foundDiagnosticPrefix: base.foundDiagnosticPrefix,
    resetIslandWallet: (input) => base.resetIslandWallet(input),
    reportPracticeSetComplete: (input) => base.reportPracticeSetComplete(input),
    reportLessonComplete: (input) => base.reportLessonComplete(input),
    reportInterleavedClear: (input) => base.reportInterleavedClear(input),
    // A grant, not a sink — nothing here nets against the civic-spend counter.
    reportCivicBootstrap: (input) => base.reportCivicBootstrap(input),
  };
}

/**
 * The stockpile of the era's material in a wallet, or `null` when the era authors no
 * material (era two onward today — O-6's identity half is per-era). `null` is
 * deliberately not 0: *"no material for this era"* and *"none left"* are different
 * sentences, and the build menu says different things about them.
 */
export function eraMaterialStockpile(
  wallet: WalletView | null,
  eraId: EraId,
): {
  readonly id: string;
  /** Learner-facing name, e.g. "Stone". */
  readonly displayName: string;
  /** The unit the count reads in — era one section 1's "count of worked pieces". */
  readonly unitNoun: string;
  readonly amount: number;
} | null {
  const material = materialForEra(eraId);
  if (material === null) {
    return null;
  }
  return {
    id: material.id,
    displayName: material.display_name,
    unitNoun: material.unit_noun,
    // `spendable` when it denominates this material, because that is the number the two
    // spend decorators NET and `materials` is the raw ledger projection they leave alone.
    // Reading `materials` here was correct while roads were priced in gold and became a
    // silent over-report the moment the gold-drop put roads on this stockpile: the build
    // menu would have offered a building the road spend had already paid for.
    amount:
      wallet !== null && wallet.spendableMaterial?.id === material.id
        ? wallet.spendable
        : (wallet?.materials[material.id] ?? 0),
  };
}
