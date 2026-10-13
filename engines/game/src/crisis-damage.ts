/**
 * **WHAT A CRISIS DID TO A CITY, as durable state — and the failure floor it may not
 * breach.**
 *
 * THE RULING (team lead, 2026-07-30, verbatim): *"Crises can damage, disable, scar, or
 * reduce capacity, but they cannot undo mastery or permanently remove an earned
 * building."* Permitted: buildings temporarily unusable, civic capacity reduced,
 * structures needing repair, visible scars, resources lost. Always preserved: completed
 * lessons, earned skill buildings, unlocked eras, permanent city history.
 *
 * This module is that ruling expressed as a TYPE. Every field below names something a
 * crisis is allowed to do, and the shape has no field for anything it is not — there is
 * no `removed_buildings`, no `lost_mastery`, no `relocked_nodes`, and adding one would be
 * a visible change to this file rather than a quiet write somewhere downstream.
 *
 * ## Why a ruin is a SET OF IDS and never a removal
 *
 * A ruined skill building is still that node's building: same node id, same mastery, same
 * lesson, same cell. So damage is recorded as *which* placements are in a ruined state,
 * beside a placement list this module never touches. That is the whole of how the floor is
 * kept structurally rather than by discipline — there is no code path from "a crisis
 * happened" to "a placement was deleted", because damage does not carry placements.
 *
 * It also means a ruined building stays CLICKABLE: the city surface renders from
 * `placements`, so a ruin is still a building the learner can open to reread its lesson.
 * `apps/web/src/city/ruinLessonAccess.test.tsx` is the measurement of that, and it fails
 * if a ruin is ever filtered out of the roster.
 *
 * ## Three consumers, one shape
 *
 * The Hard Winter (`hard-winter.ts`) ruins buildings with cold and ground with
 * abandonment. The Lost Herd — a crisis that does not exist yet — locks CIVIC CAPACITY
 * rather than ruining anything, and {@link CrisisDamage.suspended_civic} is the field that
 * carries it, so that crisis needs no new state and no second migration. The third
 * consumer is the repair action, which reads all three sets and prices them.
 *
 * ## No clock, in any form
 *
 * Damage is a set of ids and a mint counter. Nothing here is denominated in time, expires,
 * heals on its own, or asks what the instant is — a scar that faded while the tab was shut
 * would be exactly the passive mechanic INV-ERA-3 and the resource design forbid, and it
 * would make the repair price optional in the one way the player cannot see.
 * `test/hardWinterClockless.test.ts` sweeps this module through the winter's import
 * closure.
 */

/** A ground cell, as the city grid and the winter island both index it. */
export type CrisisCellKey = string;

/**
 * ONE ROUND OF DAMAGE, identified.
 *
 * Every ruin carries the id of the crisis run that made it, and that id is what a repair
 * spend is keyed by (`repair:<damage_id>:<kind>:<subject>`). Keyed on the building alone a
 * second ruin of the same building could never be paid for — the ledger would report the
 * repair as already spent — so the same building ruined by two winters is two subjects,
 * not one.
 */
export interface CrisisRuinedBuilding {
  /** The placement's node id. Unchanged by the crisis; this is not a new building. */
  readonly node_id: string;
  readonly damage_id: string;
}

/** One scarred ground cell, with the run that scarred it. */
export interface CrisisRuinedCell {
  readonly cell: CrisisCellKey;
  readonly damage_id: string;
}

/** One civic placement whose contribution a crisis has suspended, with the run. */
export interface CrisisSuspendedCivic {
  /**
   * The civic placement id — the same opaque string the economy package keys a spend by.
   *
   * NAMED IN PROSE AND NOT IN IMPORT FORM, deliberately, for the reason `hard-winter.ts`'s
   * `HardWinterPayout.event_id` gives: INV-COS-1 is enforced as a STRING SCAN over the
   * learning-path trees (`one-way-invariant.test.ts`), so writing the module specifier here
   * would fail that guard even in a comment. The first draft of this line did, and it did.
   */
  readonly placement_id: string;
  readonly damage_id: string;
}

/** One relay whose public record is still short after the Intrusion. */
export interface CrisisOverwrittenRecord {
  readonly placement_id: string;
  readonly damage_id: string;
  /** How many of the nine bands are still the counterfeit's. */
  readonly bands_dark: number;
  /** The optional three-question verification is single-use, including a zero score. */
  readonly verification_attempted: boolean;
}

/**
 * THE DURABLE SCAR a city carries between sessions.
 *
 * `next_damage_id` is a MONOTONE MINT and the one number here that is not a set. It exists
 * because a damage id must never repeat across the whole life of a city: the crisis's own
 * encounter index resets to one on a page reload, so two winters played in two sessions
 * would mint the same id and the second repair would be free. A counter that only ever
 * goes up cannot do that, and it is persisted with the sets for exactly that reason.
 */
export interface CrisisDamage {
  readonly next_damage_id: number;
  readonly ruined_buildings: readonly CrisisRuinedBuilding[];
  readonly ruined_cells: readonly CrisisRuinedCell[];
  readonly suspended_civic: readonly CrisisSuspendedCivic[];
  readonly overwritten_records: readonly CrisisOverwrittenRecord[];
}

/** An undamaged city. The mint starts at 1 so the first id reads `d1`. */
export const NO_CRISIS_DAMAGE: CrisisDamage = {
  next_damage_id: 1,
  ruined_buildings: [],
  ruined_cells: [],
  suspended_civic: [],
  overwritten_records: [],
};

/** The id form a mint counter takes: `d1`, `d2`, … Colon-free, so it is event-id safe. */
export function crisisDamageId(mint: number): string {
  if (!Number.isInteger(mint) || mint < 1) {
    throw new Error(
      `A crisis damage id is minted from a whole counter starting at 1 (got ${mint}). ` +
        `A repeated id would key a repair spend the ledger has already recorded, so the ` +
        `second repair of the same building would be free.`,
    );
  }
  return `d${mint}`;
}

/** True when the city carries nothing a crisis did — nothing to repair, nothing to show. */
export function isCrisisDamageClear(damage: CrisisDamage): boolean {
  return (
    damage.ruined_buildings.length === 0 &&
    damage.ruined_cells.length === 0 &&
    damage.suspended_civic.length === 0 &&
    (damage.overwritten_records?.length ?? 0) === 0
  );
}

/** What a crisis's repairs cost, per ruin. Authored by the crisis, never invented here. */
export interface CrisisRepairPrices {
  /** Material to put ONE ruined building back. */
  readonly per_building: number;
  /** Material to reclaim ONE scarred cell. */
  readonly per_cell: number;
}

/**
 * WHAT CLEARING EVERY RUIN WOULD COST, in the era's material.
 *
 * A read-out, not a bulk action. Repair is priced and bought PER RUIN (the prices are
 * authored per building and per cell), so this is the running total a surface shows next
 * to the individual buttons rather than a transaction anything can execute.
 *
 * ## SUSPENDED CIVIC CAPACITY IS STILL NOT PRICED HERE, AND THE REASON HAS CHANGED
 *
 * This read *"nobody has ruled on it; a price invented in this function would read as
 * authored"*. **A price is ruled now** — the product lead, 2026-08-04: *"paying makes sense
 * just to keep the model consistent"* — and it is still not here, because it is not this
 * function's KIND of number. `CrisisRepairPrices` is two flat figures a crisis authors; a
 * lift is a fraction of the civic CATALOGUE's price for that building's role at the era the
 * city is standing in, which is a value this module has no input for and, under INV-COS-1,
 * may not import.
 *
 * So this is the RUIN bill and always was. A caller totalling a city's whole recovery adds
 * the lift bill to it — `CitySurface`'s crisis-damage panel is the one that does, and
 * `apps/web/src/city/suspendedCivic.ts` is where the join and the price live.
 */
export function crisisRepairCost(damage: CrisisDamage, prices: CrisisRepairPrices): number {
  return (
    damage.ruined_buildings.length * prices.per_building +
    damage.ruined_cells.length * prices.per_cell
  );
}

/** What one crisis run did, before it is folded into a city's standing damage. */
export interface CrisisDamageReport {
  /** Node ids the crisis ruined. */
  readonly buildings: readonly string[];
  /** Ground cells the crisis scarred, as `"col,row"` keys. */
  readonly cells: readonly CrisisCellKey[];
  /** Civic placement ids the crisis suspended. */
  readonly suspended_civic?: readonly string[];
  /** Relay records the Intrusion left partially overwritten. A zero magnitude records nothing. */
  readonly overwritten_records?: readonly {
    readonly placement_id: string;
    readonly bands_dark: number;
  }[];
}

/**
 * **A CRISIS THAT DESTROYS NOTHING, as the two fields that say so.**
 *
 * Spread into a report by a crisis whose whole consequence is capacity — era four's
 * Succession is the first: *"Era four's consequence is capacity, not ruin. Nothing in this
 * crisis destroys anything, which is worth saying because the fiction of a succession
 * dispute suggests otherwise."*
 *
 * It is a named constant rather than two empty literals at the call site for a reason
 * beyond tidiness. The empty lists are a REFUSAL, and a refusal spelled out as
 * `{ buildings: [], cells: [] }` reads exactly like a report that has not been filled in
 * yet — which is the shape a future ruin would slip into unnoticed. Named here, beside the
 * floor it belongs to, it says what it means, and a crisis that starts ruining something
 * has to stop spreading it rather than quietly append to a list.
 *
 * It also keeps `cells` — which is a `"col,row"` key and therefore a claim about a GRID —
 * out of an engine whose whole design is that its propagation has no positions in it.
 * `test/successionPropagation.test.ts` sweeps for exactly that token, and a crisis with no
 * topology should be able to pass it without an exemption.
 */
export const NO_CRISIS_RUIN: Pick<CrisisDamageReport, "buildings" | "cells"> = {
  buildings: [],
  cells: [],
};

/**
 * **FOLD ONE CRISIS RUN INTO A CITY'S STANDING DAMAGE.** Pure: a new `CrisisDamage`, with
 * one fresh damage id minted for the whole run.
 *
 * ALREADY-RUINED SUBJECTS KEEP THEIR ORIGINAL DAMAGE ID rather than being re-stamped with
 * this run's. That is the difference between a set and a log, and it matters for money: the
 * repair the player has not yet paid for is keyed by the id that ruined it, so re-stamping
 * would silently invalidate a repair they were saving up for, and — the direction that
 * actually costs them — would let a second crisis over the same building make an
 * already-paid repair payable again.
 *
 * The mint advances on every fold, whether or not anything new was recorded. A crisis that
 * ruined nothing has still happened, and an id nobody used costs nothing; reusing one does.
 */
export function foldCrisisDamage(
  damage: CrisisDamage,
  report: CrisisDamageReport,
): CrisisDamage {
  const damageId = crisisDamageId(damage.next_damage_id);

  const knownBuildings = new Set(damage.ruined_buildings.map((b) => b.node_id));
  const knownCells = new Set(damage.ruined_cells.map((c) => c.cell));
  const knownCivic = new Set(damage.suspended_civic.map((c) => c.placement_id));
  const knownRecords = new Set(
    damage.overwritten_records.map((record) => record.placement_id),
  );

  const addedBuildings: CrisisRuinedBuilding[] = [];
  for (const nodeId of report.buildings) {
    if (knownBuildings.has(nodeId)) {
      continue;
    }
    knownBuildings.add(nodeId);
    addedBuildings.push({ node_id: nodeId, damage_id: damageId });
  }

  const addedCells: CrisisRuinedCell[] = [];
  for (const cell of report.cells) {
    if (knownCells.has(cell)) {
      continue;
    }
    knownCells.add(cell);
    addedCells.push({ cell, damage_id: damageId });
  }

  const addedCivic: CrisisSuspendedCivic[] = [];
  for (const placementId of report.suspended_civic ?? []) {
    if (knownCivic.has(placementId)) {
      continue;
    }
    knownCivic.add(placementId);
    addedCivic.push({ placement_id: placementId, damage_id: damageId });
  }

  const addedRecords: CrisisOverwrittenRecord[] = [];
  for (const record of report.overwritten_records ?? []) {
    if (
      knownRecords.has(record.placement_id) ||
      !Number.isInteger(record.bands_dark) ||
      record.bands_dark <= 0 ||
      record.bands_dark > 9
    ) {
      continue;
    }
    knownRecords.add(record.placement_id);
    addedRecords.push({
      placement_id: record.placement_id,
      damage_id: damageId,
      bands_dark: record.bands_dark,
      verification_attempted: false,
    });
  }

  return {
    next_damage_id: damage.next_damage_id + 1,
    ruined_buildings: [...damage.ruined_buildings, ...addedBuildings],
    ruined_cells: [...damage.ruined_cells, ...addedCells],
    suspended_civic: [...damage.suspended_civic, ...addedCivic],
    overwritten_records: [...damage.overwritten_records, ...addedRecords],
  };
}

/** Drop one repaired building from the standing damage. The mint is untouched. */
export function clearRuinedBuilding(damage: CrisisDamage, nodeId: string): CrisisDamage {
  return {
    ...damage,
    ruined_buildings: damage.ruined_buildings.filter((b) => b.node_id !== nodeId),
  };
}

/** Drop one reclaimed cell from the standing damage. The mint is untouched. */
export function clearRuinedCell(damage: CrisisDamage, cell: CrisisCellKey): CrisisDamage {
  return {
    ...damage,
    ruined_cells: damage.ruined_cells.filter((c) => c.cell !== cell),
  };
}

/** Lift one civic suspension. The placement itself is never removed — only the flag. */
export function clearSuspendedCivic(
  damage: CrisisDamage,
  placementId: string,
): CrisisDamage {
  return {
    ...damage,
    suspended_civic: damage.suspended_civic.filter((c) => c.placement_id !== placementId),
  };
}

/**
 * Resolve the Intrusion's one optional verification.
 *
 * One right answer restores one band. A zero score still spends the attempt, while a whole
 * record leaves no damage row at all. Unknown and already-attempted ids return the same object.
 */
export function applyRecordVerification(
  damage: CrisisDamage,
  damageId: string,
  correct: number,
): CrisisDamage {
  if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
    throw new Error(`A record verification cannot score ${correct} of 3.`);
  }
  const target = damage.overwritten_records.find(
    (record) => record.damage_id === damageId && !record.verification_attempted,
  );
  if (!target) {
    return damage;
  }
  const bandsDark = Math.max(0, target.bands_dark - correct);
  return {
    ...damage,
    overwritten_records:
      bandsDark === 0
        ? damage.overwritten_records.filter((record) => record !== target)
        : damage.overwritten_records.map((record) =>
            record === target
              ? {
                  ...record,
                  bands_dark: bandsDark,
                  verification_attempted: true,
                }
              : record,
          ),
  };
}

/** The standing overwritten-record row for one relay placement. */
export function overwrittenRecord(
  damage: CrisisDamage,
  placementId: string,
): CrisisOverwrittenRecord | null {
  return (
    damage.overwritten_records.find((record) => record.placement_id === placementId) ?? null
  );
}

/** The standing ruin record for one building, or `null` when it is not ruined. */
export function ruinedBuilding(
  damage: CrisisDamage,
  nodeId: string,
): CrisisRuinedBuilding | null {
  return damage.ruined_buildings.find((b) => b.node_id === nodeId) ?? null;
}

/** The standing scar record for one cell, or `null` when it is clear. */
export function ruinedCell(
  damage: CrisisDamage,
  cell: CrisisCellKey,
): CrisisRuinedCell | null {
  return damage.ruined_cells.find((c) => c.cell === cell) ?? null;
}
