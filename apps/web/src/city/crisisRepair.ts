import { civicLiftSuspensionCost, parseCivicPlacementId } from "@cr/economy";
import {
  type CrisisDamage,
  hardWinterRepairPrices,
  ruinedBuilding,
  ruinedCell,
} from "@cr/game";
import type { EraId } from "@cr/skill-graph";

import type { EconomyClient } from "../economy/economyClient";
import type { RuinClearResult } from "./citySession";
import { type RoadCell, roadCellKey } from "./roads";

/**
 * **THE REPAIR ACTION: spend material, clear one ruin.** The one place the economy and the
 * city's crisis damage meet.
 *
 * Everything the two halves need is already shipped and neither knows about the other:
 * `@cr/economy`'s `applyRepairSpend` is atomic and idempotent per ruin and knows nothing
 * about what a ruin is; the city session's `repairRuinedBuilding` / `reclaimRuinedCell` are
 * pure state clears that know nothing about material. This module is the sequence, and it
 * is deliberately a plain function rather than a hook so the ordering is testable without a
 * renderer.
 *
 * ## The ordering, and why it is this way round
 *
 * READ the ruin's damage id, SPEND under it, CLEAR only on a spend that landed.
 *
 * The two failure modes are not symmetric, so the ordering is chosen for the survivable one:
 *
 *  - **Spend lands, clear does not.** The player is down the material and the ruin is still
 *    there — visible, and retryable. The retry is FREE, because the spend is idempotent on
 *    `repair:<damage_id>:…`: the ledger reports `already_spent`, no second row is written,
 *    and this function clears the ruin anyway (see {@link repairSettled}). So the state
 *    converges and nobody is charged twice.
 *  - **Clear lands, spend does not.** A free repair, with nothing in the ledger to find it
 *    by. The ledger is the reconstructable source of truth for the whole economy, so a
 *    debit that never happened is unrecoverable rather than merely wrong.
 *
 * That asymmetry is also why `already_spent` is treated as SUCCESS here rather than as a
 * refusal. It is the only status that means "you have paid for this ruin", and refusing on
 * it would strand exactly the player the first failure mode already charged.
 *
 * ## The price comes from an authored table, never from here
 *
 * `hardWinterRepairPrices()` reads `HARD_WINTER.rebuild_cost_per_ruin` (60 per ruined
 * building) and `HARD_WINTER.reclaim_cost_per_cell` (3 per ruined cell) — the two
 * authored numbers, derived against each other so twenty cells cost what one building does.
 * A civic suspension's lift is `civicLiftSuspensionCost`, which is the CATALOGUE's price
 * for that building's role at the current era, at the teardown rate. No number is invented
 * in this file, and there is no per-repair discount or bulk rate.
 *
 * **THE THIRD PRICE SCALES WITH THE ERA AND THE FIRST TWO DO NOT**, which is a fact about
 * their subjects rather than an inconsistency here: a ruined SKILL building has no purchase
 * price for a fraction to be taken of, so era one authored a flat number, and a suspended
 * CIVIC building has one in every era. `repairPriceFor` carries the argument.
 *
 * **THE CELL PRICE OUTLIVED THE ACTION IT WAS AUTHORED FOR, and that is why it moved.** It read
 * `HARD_WINTER.abandon.reclaim_cost_per_cell` until 2026-08-02, when the give-up-ground action was
 * ruled out and that block went with it. A winter can no longer scar ground, so nothing this
 * function is handed today carries a cell price — but a SAVED city can: the crisis damage report
 * persists `ruined_cells`, and a session saved before the ruling still has some. The constant is
 * therefore a top-level `HARD_WINTER` value now rather than a casualty of the removal, and
 * `crisisRepair.test.ts` charges it over exactly that case.
 *
 * ## A BROKE PLAYER IS NEVER STUCK, and that is a property of the spend rather than a hope
 *
 * A repair is refused with nothing debited when the stockpile will not cover it, so a player
 * with a ruined city and no material loses nothing by trying. The way out is the way in:
 * material is earned by finishing lessons (`EARN.lessonComplete`, the era total spread over
 * the era's nodes) and by clearing practice sets (`EARN.interleaved`, 10 at era-one scale,
 * repeatable and bounded by effort rather than by time). Both remain reachable while the city
 * is in ruins, because a ruin is a state on a building and never a removal: the building is
 * still in `placements`, still carries its mastery, and its lesson menu's first card is never
 * gated. So the loop is *practise the skills you have → earn material → repair* — 6 practice
 * sets for one building, 1 for two cells and a bit. `crisisRepairRecovery.test.ts` walks it.
 */

/**
 * Which piece of crisis damage a repair is aimed at — one member per set of
 * `CrisisDamage`, so a crisis cannot leave something behind that has no way out.
 */
export type RepairTarget =
  | { readonly kind: "building"; readonly nodeId: string }
  | { readonly kind: "ground"; readonly cell: RoadCell }
  | { readonly kind: "civic"; readonly placementId: string };

/**
 * What a repair attempt did.
 *
 * `not_ruined` is its own status rather than folded into a failure, because it is the one
 * outcome that is nobody's fault: a double-click, or a stale panel, aiming at a ruin that
 * has already been repaired. Nothing is spent and nothing is cleared.
 */
export type RepairStatus =
  | "repaired"
  | "not_ruined"
  | "insufficient_material"
  | "invalid_cost"
  | "era_material_unauthored";

export interface CrisisRepairResult {
  readonly status: RepairStatus;
  /** True only when the ruin is gone from the city's damage. */
  readonly repaired: boolean;
  /** What it cost, or what it WOULD have cost on a refusal — so the copy can say the price. */
  readonly cost: number;
  /**
   * The era material's stockpile after the attempt; unchanged on a refusal, and NULL on
   * `not_ruined` — no spend was attempted, so no balance was read, and reporting a number
   * nobody asked for is how a stale figure ends up on screen.
   */
  readonly spendable: number | null;
  /** The ruin that was settled, for the announcement. Null when there was none. */
  readonly damageId: string | null;
}

/** The seams this needs, so a test can supply three functions instead of a session. */
export interface CrisisRepairDeps {
  /** The city's standing crisis damage, read fresh at the moment of the attempt. */
  readonly damage: () => CrisisDamage;
  readonly economy: Pick<EconomyClient, "repairRuin">;
  readonly clearBuilding: (nodeId: string) => Promise<RuinClearResult>;
  readonly clearCell: (cell: RoadCell) => Promise<RuinClearResult>;
  /** Lift one civic suspension — the state half, exactly as the two above. */
  readonly clearCivic: (placementId: string) => Promise<RuinClearResult>;
  /**
   * The era the SPEND is denominated in, which a civic lift's price is read at.
   *
   * A dependency rather than a second argument to {@link repairCrisisDamage}, because it is
   * a fact about the city this repair is happening in, exactly like `damage` and the three
   * clears — and because the alternative is a positional argument every caller of a
   * two-argument function would have to be trusted to keep in step with its wallet.
   */
  readonly eraId: EraId;
}

/**
 * What clearing this one piece of damage costs, in the CURRENT era's material.
 *
 * **THE TWO RUIN PRICES ARE THE CRISIS'S AND THE LIFT PRICE IS THE CATALOGUE'S**, and the
 * split is not an inconsistency: a ruined SKILL building has no purchase price to be a
 * fraction of, so era one authored a flat number for it; a suspended CIVIC building has
 * one, in every era, which is why `civicLiftSuspensionCost` can scale where
 * `hardWinterRepairPrices` cannot. Neither number is invented here. See that function for
 * the derivation and for why it is the teardown rate.
 *
 * An unparseable civic id prices at 0, which `applyRepairSpend` refuses as `invalid_cost`
 * with nothing debited. That is the right refusal rather than a guess: a placement id no
 * catalogue row backs is one this city cannot show, cannot value and must not charge for.
 */
export function repairPriceFor(target: RepairTarget, eraId: EraId): number {
  if (target.kind === "civic") {
    const row = parseCivicPlacementId(target.placementId)?.row;
    return row === undefined ? 0 : civicLiftSuspensionCost(row, eraId);
  }
  const prices = hardWinterRepairPrices();
  return target.kind === "building" ? prices.per_building : prices.per_cell;
}

/**
 * Whether a spend status means the player has paid for this ruin.
 *
 * `already_spent` counts, and that is the whole of the retry story: a repair whose debit
 * landed but whose state clear did not is settled as far as the ledger is concerned, so
 * refusing here would leave the player charged and the ruin standing forever.
 */
function repairSettled(status: string): boolean {
  return status === "spent" || status === "already_spent";
}

export async function repairCrisisDamage(
  deps: CrisisRepairDeps,
  target: RepairTarget,
): Promise<CrisisRepairResult> {
  const cost = repairPriceFor(target, deps.eraId);
  const damage = deps.damage();

  // The damage's own id — read BEFORE anything is spent, because it is the spend's
  // idempotency key and it stops existing the moment the damage does.
  const record =
    target.kind === "building"
      ? ruinedBuilding(damage, target.nodeId)
      : target.kind === "ground"
        ? ruinedCell(damage, roadCellKey(target.cell.col, target.cell.row))
        : (damage.suspended_civic.find(
            (entry) => entry.placement_id === target.placementId,
          ) ?? null);

  if (record === null) {
    return {
      status: "not_ruined",
      repaired: false,
      cost,
      spendable: null,
      damageId: null,
    };
  }

  const subject =
    target.kind === "building"
      ? target.nodeId
      : target.kind === "ground"
        ? roadCellKey(target.cell.col, target.cell.row)
        : target.placementId;

  const spend = await deps.economy.repairRuin({
    damageId: record.damage_id,
    subjectKind: target.kind,
    subject,
    cost,
  });

  if (!repairSettled(spend.status)) {
    return {
      status:
        spend.status === "insufficient_material"
          ? "insufficient_material"
          : spend.status === "invalid_cost"
            ? "invalid_cost"
            : "era_material_unauthored",
      repaired: false,
      cost,
      spendable: spend.spendable,
      damageId: record.damage_id,
    };
  }

  const cleared =
    target.kind === "building"
      ? await deps.clearBuilding(target.nodeId)
      : target.kind === "ground"
        ? await deps.clearCell(target.cell)
        : await deps.clearCivic(target.placementId);

  return {
    status: "repaired",
    repaired: cleared.cleared,
    cost,
    spendable: spend.spendable,
    damageId: cleared.damage_id ?? record.damage_id,
  };
}
