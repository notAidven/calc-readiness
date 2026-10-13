import { findCivicBuilding } from "@cr/economy";
import type {
  CivicPurchaseOutcome,
  EconomyClient,
  RepairOutcome,
  WalletView,
} from "../economy/economyClient";

/**
 * The roads MATERIAL-spend SEAM (composition-root decorator).
 *
 * **THIS USED TO NET OUT GOLD.** The gold-drop retired that currency and made the era's
 * material the purchase point for everything, so roads draw on the SAME stockpile as
 * civic buildings and crisis repair. Nothing about the mechanism changed — the decorator
 * still only ever subtracts a recorded spend and never mints — but the stakes did: a
 * road tile now costs material a civic building could have used, which is exactly the
 * tradeoff the single currency exists to create.
 *
 * Roads are a REPEATABLE sink with no placement id and no catalogue row, so there is
 * still no ledger event they can be keyed on. (This paragraph used to argue from the
 * COSMETIC spend path being idempotent-per-item and hard-requiring a `cosmetic_id`; that
 * path is sunset, and the conclusion is unchanged — `applyMaterialSpend` is keyed on a
 * placement, which a road tile does not have.)
 *
 * So the roads spend is recorded on the CITY side (`citySession.roadGoldSpent`) and
 * this thin decorator nets it out of the ONE shared wallet:
 *   - NEVER mints material — it only ever SUBTRACTS a recorded spend from the
 *     server-authoritative balance and clamps at zero. A REMOVAL refund is that
 *     recorded spend going back DOWN (never a credit invented here), so the balance
 *     can climb back to — and never past — the authoritative figure.
 *   - Keeps a SINGLE consistent balance for every sink: because the road tool, the civic
 *     build menu and crisis repair all read this decorated wallet, a purchase can never
 *     spend material roads already consumed and vice-versa (no double-spend /
 *     divergence).
 *   - Is fail-closed: a purchase (or a road commit) that the shared balance can't
 *     cover is refused with nothing debited.
 *
 * This is a stand-in for a real `@cr/economy.spendMaterial({ amount, reason })` +
 * `EconomyClient.spendMaterial`, which is the recommended follow-up and is now MORE
 * warranted than it was: with one currency, "spend N of the era material for a stated
 * reason" is the primitive three sinks want rather than two.
 *
 * **THAT FOLLOW-UP HAS NOW LANDED FOR ONE OF THE SINKS, and roads are not it.**
 * `EconomyClient.purchaseCivicBuilding` is ledger-backed and idempotent per placement
 * id, so a civic spend needs no counter on this side at all. Roads still do: a road tile
 * has no placement id and no catalogue row, so the repeatable "spend N for a stated
 * reason" primitive this file asks for is still the thing it is waiting on. The civic
 * method is forwarded below with the same guard the other sinks get — this decorator
 * still owns the netting, because the road spend is still not in the ledger.
 */
export function createRoadSpendEconomy(
  base: EconomyClient,
  roadMaterialSpent: () => number,
): EconomyClient {
  const spent = (): number => Math.max(0, Math.trunc(roadMaterialSpent()));

  const netWallet = async (): Promise<WalletView> => {
    const wallet = await base.getWallet();
    return {
      // `materials` is the RAW per-material projection and forwards untouched — it is
      // the ledger's own read, and the road spend is not in the ledger. The netting
      // happens on `spendable`, which is what every affordability check reads.
      materials: wallet.materials,
      spendable: Math.max(0, wallet.spendable - spent()),
      spendableMaterial: wallet.spendableMaterial,
    };
  };

  return {
    getWallet: netWallet,
    // A pure ledger read: roads net out of the BALANCE, never out of which earn
    // events have been recorded, so this forwards untouched.
    appliedEventIds: () => base.appliedEventIds(),
    async purchaseCivicBuilding(input): Promise<CivicPurchaseOutcome> {
      // A sink on the one wallet, and the only one genuinely in the ledger. Guarded
      // against the SHARED (road-net) balance for the same reason the others are:
      // without it, material roads have already claimed would fund a building.
      //
      // The cost is read from the catalogue rather than re-derived — a guard that
      // computes a price a second way is a guard that can disagree with the spend it
      // guards. Civic costs are authored at each era's OWN scale, so there is no
      // `eraScaledPrice` here.
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
      // A repair is the third sink on the one wallet, so it is guarded against the SHARED
      // (road-net) balance exactly as a purchase is: without this, material roads have
      // already claimed would fund a repair and the two sinks would disagree about the
      // balance. Fail-closed — nothing is debited on a refusal, and the reported balance is
      // the net one the player can actually see.
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
    // A grant, not a sink — nothing here nets against the road-spend counter.
    reportCivicBootstrap: (input) => base.reportCivicBootstrap(input),
  };
}
