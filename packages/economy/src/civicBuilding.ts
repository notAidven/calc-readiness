import { type EraId, eraNumber } from "@cr/skill-graph";

import {
  type CapacityContribution,
  type CityCapacities,
  deriveCapacities,
  NO_CONTRIBUTION,
} from "./capacity";
import {
  type CivicBuildingDefinition,
  civicBuildingForRole,
  civicBuildingOrThrow,
  findCivicBuilding,
} from "./civicCatalogue";
import {
  LEGACY_DECAY_FLOOR,
  LEGACY_DECAY_PER_ERA,
  TEARDOWN_COST_FRACTION,
} from "./constants";
import { applyMaterialSpend, type MaterialSpendResult } from "./materialSpend";
import { materialForEra } from "./materials";
import type { LedgerView, MaterialId } from "./types";

/**
 * **CIVIC BUILDING MECHANICS — purchase, teardown (O-4) and legacy decay (O-5).**
 *
 * Pure, like everything else here: no clock, no I/O, no React. The catalogue it
 * prices from is `civicCatalogue.ts`; the ledger it spends against is the same one
 * gold and materials already share.
 *
 * **WHERE THIS LANE STOPS.** Nothing here places anything. There is no grid, no
 * collision, no coordinates and no 3D — a `placementId` is an opaque string this
 * module uses only to make a spend idempotent. Choosing where a building goes, and
 * refusing an overlap, is game-side (Evan's lane); the shared wire types and the
 * service API are Gabriel's. This module answers exactly three questions: *may I
 * afford it*, *what does clearing it cost*, and *what is it worth now*.
 */

/** What a placement records. The era is NOT stored — see {@link civicPlacementEra}. */
export interface CivicPlacement {
  /** Stable id of this instance; the spend's idempotency key. */
  readonly placementId: string;
  readonly building: string;
  /**
   * **SUSPENDED: the building stands, is still owned, and contributes nothing.**
   *
   * The one state a crisis is allowed to put a civic building into (team lead,
   * 2026-07-30: a crisis may leave buildings *"temporarily unusable"* and reduce *"civic
   * capacity"*, but may never *"permanently remove an earned building"*). So this is a
   * FLAG and not a deletion, and it is optional rather than required so an undamaged city
   * is byte-for-byte the shape it always was.
   *
   * It sits on the placement rather than on the catalogue definition because it is a fact
   * about ONE instance: a crisis ruins the lodge on the shore, not every lodge. The
   * catalogue stays what a building type provides; this is whether this copy of it is
   * currently providing it.
   *
   * Suspension does not touch what it COST or what clearing it costs. `civicTeardownCost`
   * is priced off the current era's equivalent and is deliberately unaware of this flag —
   * a suspended building is still a building you may choose to clear.
   */
  readonly suspended?: boolean;
}

/**
 * The era a placement is frozen in, which is always its building's catalogue era.
 *
 * Buildings are era-exclusive (buildable only while the player is in that era) and
 * never renovate (D-ERA11), so those two facts pin the built era to the id. Stating
 * it as a function rather than a stored field removes the whole class of defect
 * where persisted state disagrees with the catalogue.
 */
export function civicPlacementEra(placement: CivicPlacement): EraId {
  return civicBuildingOrThrow(placement.building).era;
}

/* -------------------------------------------------------------------------- */
/*  O-5 — legacy decay                                                         */
/* -------------------------------------------------------------------------- */

/**
 * **O-5: `0.9 ^ (eras behind the current era)`, floored at `0.5`.**
 *
 * A frozen building keeps working and contributes less against a city whose needs
 * have scaled by `2^(N-1)`. One era behind is 0.9; three behind 0.729; six behind
 * 0.531; **seven or more sits on the floor**, since `0.9 ** 7 ≈ 0.478` is the first
 * power under it.
 *
 * Never above 1: a building in its own era, or somehow ahead of the current one,
 * contributes in full rather than being rewarded for it.
 *
 * NOT THE CONDITION CLOCK, which is sunset. This is keyed on ERAS ADVANCED — a pure
 * function of learning state, moved only by learning — where that was keyed on
 * wall-clock time away. The clocklessness sweep (`clockless.test.ts`) is what keeps
 * the distinction structural rather than nominal.
 */
export function legacyDecayFactor(builtEra: EraId, currentEra: EraId): number {
  const behind = eraNumber(currentEra) - eraNumber(builtEra);
  if (behind <= 0) {
    return 1;
  }
  return Math.max(LEGACY_DECAY_FLOOR, LEGACY_DECAY_PER_ERA ** behind);
}

/**
 * One placement's contribution, decayed for its age.
 *
 * **Floors each axis.** Livability is people the city can sustain and happiness is
 * coverage of them, so a fractional person is not a quantity the readouts can spend.
 * Flooring is also the conservative direction — it can under-report capacity and
 * never over-report it — which matches `greedyPlanCost` being an upper bound on cost
 * and `materialCarryForward` flooring a conversion.
 */
export function civicContribution(
  building: CivicBuildingDefinition,
  currentEra: EraId,
): CapacityContribution {
  const factor = legacyDecayFactor(building.era, currentEra);
  return {
    livability: Math.floor(building.provides.livability * factor),
    happiness: Math.floor(building.provides.happiness * factor),
  };
}

/**
 * The city's two capacities from everything it has built, at the era it is in now.
 *
 * The one entry point the HUD's capacity readout wants: it folds decay in and hands
 * the result to the SHIPPED `deriveCapacities` rather than summing here, so the
 * pooled-livability ruling has exactly one implementation.
 *
 * **A SUSPENDED placement contributes nothing**, which is what makes "a crisis reduced
 * your civic capacity" expressible at all (see {@link CivicPlacement.suspended}). It is
 * subtracted here rather than by the caller for the same reason decay is: a second place
 * that decides what a placement is worth is a second place for the two to disagree.
 */
export function civicCityCapacities(
  placements: readonly CivicPlacement[],
  currentEra: EraId,
): CityCapacities {
  return deriveCapacities(
    placements.map((placement) =>
      placement.suspended === true
        ? NO_CONTRIBUTION
        : civicContribution(civicBuildingOrThrow(placement.building), currentEra),
    ),
  );
}

/**
 * **WHAT SUSPENSION IS WITHHOLDING RIGHT NOW** — the capacity the city would have if
 * nothing were suspended, minus the capacity it has.
 *
 * This exists so a penalty the player is paying can be NAMED wherever capacity is shown.
 * A readout that only had {@link civicCityCapacities} could show a city short of
 * livability with no way to say why, and a shortfall with no cause is the kind of thing a
 * player reports as a bug — they would be counting standing buildings against a number
 * that does not include them.
 *
 * Zero on both axes when nothing is suspended, so a readout can branch on it without
 * asking about the placements itself.
 */
export function civicSuspendedCapacity(
  placements: readonly CivicPlacement[],
  currentEra: EraId,
): CityCapacities {
  return deriveCapacities(
    placements
      .filter((placement) => placement.suspended === true)
      .map((placement) =>
        civicContribution(civicBuildingOrThrow(placement.building), currentEra),
      ),
  );
}

/* -------------------------------------------------------------------------- */
/*  O-4 — teardown                                                             */
/* -------------------------------------------------------------------------- */

/**
 * **O-4: clearing a building costs 25% of the CURRENT era's build cost for that
 * building type, and refunds nothing.**
 *
 * "That building type" is the ROLE, not the building. Buildings are era-exclusive,
 * so era one's Smokehouse has no era-five namesake to take a percentage of; what
 * era five has is its own food row, and that is the equivalent. Every era holds
 * exactly one of each role, which is what makes this total.
 *
 * Deliberately **not** 25% of what the building originally cost. The ladder doubles
 * every era, so clearing an era-two Granary in era eight would otherwise cost 40
 * coins against an economy running in five figures — loose change, and a decision
 * nobody would think about. Priced against the current era it stays a real one.
 *
 * Rounds UP, so clearing is never free: the cheapest teardown in the game is era
 * one's 20 stone, and no rounding rule may turn a cost into a zero.
 */
export function civicTeardownCost(
  building: CivicBuildingDefinition,
  currentEra: EraId,
): number {
  const currentEquivalent = civicBuildingForRole(currentEra, building.role);
  return Math.ceil(currentEquivalent.cost * TEARDOWN_COST_FRACTION);
}

/**
 * The material a teardown is paid in: the CURRENT era's, not the building's.
 *
 * Falls out of pricing against the current era — you cannot pay an era-eight bill in
 * era-two grain, and a leftover era-two stockpile has long since been through
 * `materialCarryForward` anyway.
 */
export function civicTeardownMaterial(currentEra: EraId): string | null {
  return materialForEra(currentEra)?.id ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Lifting a crisis suspension                                                */
/* -------------------------------------------------------------------------- */

/**
 * **WHAT LIFTING ONE CRISIS SUSPENSION COSTS, in the current era's material.**
 *
 * The product lead ruled on 2026-08-04 that a suspension is paid off rather than waited
 * out — *"paying makes sense just to keep the model consistent"* — which closed the
 * question `crisisRepairCost` had left open in terms (*"whether a suspension is cleared by
 * paying, by time, or by an in-crisis action is … design and nobody has ruled on it; a
 * price invented in this function would read as authored"*) and the question
 * `succession-mechanics.ts` records as *"the price is owed a ruling before the city
 * surface can charge one"*.
 *
 * ## THE PRICE IS DERIVED, AND THE DERIVATION IS THE TEARDOWN RATE
 *
 * It is {@link civicTeardownCost} — a quarter of the CURRENT era's cost for that ROLE,
 * rounded up — and it is that function rather than a copy of its arithmetic, so the two
 * cannot drift apart. Three things force it and none of them is a number chosen here:
 *
 *  - **`TEARDOWN_COST_FRACTION` is the tree's ONE existing rate for an intervention on a
 *    civic building the player already owns.** Lifting a suspension and clearing a
 *    building are the same kind of transaction — neither buys the building, both act on
 *    one that is already standing — so pricing them apart would need an argument, and
 *    there isn't one. Pricing them together needs no new constant.
 *  - **It scales with the era through AUTHORED data rather than through a multiplier.**
 *    Every era's four costs are authored (`civicCatalogue.ts`: *"costs are authored data
 *    and cannot be derived from a multiplier"*), so an era-nine lift is expensive because
 *    era nine's catalogue is, and a catalogue retune moves it with no edit here. That is
 *    the one property a flat crisis price cannot have: era one's `rebuild_cost_per_ruin`
 *    is 60 stone at every era, because the winter is an era-one crisis and never had to
 *    answer the question.
 *  - **It lands BELOW the winter's rebuild, which is the ordering the failure floor
 *    requires.** Measured at era one: a ruined skill building costs 60 stone to rebuild
 *    and a suspended Family Lodge costs 20 stone to un-shutter. A ruin is destruction and
 *    a suspension is *"temporarily unusable"*; a lift that cost more than a rebuild would
 *    say the opposite. `civicBuilding.test.ts` asserts the inequality against the winter's
 *    own constant rather than against the digit.
 *
 * ## WHY IT IS A NAMED FUNCTION AND NOT A CALL TO `civicTeardownCost`
 *
 * A caller charging a teardown price for something that is not a teardown reads as a bug
 * at every call site, and the next reader would "fix" it. The alias is where the ruling
 * and its derivation live, so a later decision to price the two apart is one edit here
 * rather than a hunt through the city surface.
 */
export function civicLiftSuspensionCost(
  building: CivicBuildingDefinition,
  currentEra: EraId,
): number {
  return civicTeardownCost(building, currentEra);
}

/* -------------------------------------------------------------------------- */
/*  Purchase                                                                   */
/* -------------------------------------------------------------------------- */

export type CivicPurchaseStatus =
  | MaterialSpendResult["status"]
  | "unknown_building"
  | "wrong_era"
  | "era_material_unauthored";

export interface CivicPurchaseInput {
  readonly studentId: string;
  /** Stable id for this instance. Two placements of one type differ here. */
  readonly placementId: string;
  readonly building: string;
  /** The era the player is in. A building may only be bought in its own era. */
  readonly currentEra: EraId;
  readonly nowMs: number;
}

export interface CivicPurchaseResult {
  readonly status: CivicPurchaseStatus;
  /** The era material's stockpile after a success; UNCHANGED on every rejection. */
  readonly balance: number;
  /** The single debit row to append; empty unless `status === "spent"`. */
  readonly rows: MaterialSpendResult["rows"];
  /** What was bought, on success. Null on every rejection. */
  readonly building: CivicBuildingDefinition | null;
  /**
   * What it cost, read from the catalogue; **0 on every rejection**.
   *
   * Carried so a caller can say *"spent 80 stone"* without re-reading the catalogue and
   * risking a second answer — the reason {@link SpendResult} carries the same two fields.
   * A rejection reports 0 rather than the price it would have been, so a status and a
   * cost can never be read together as a spend that did not happen.
   */
  readonly cost: number;
  /** What the cost is denominated in. Null on a rejection that never resolved one. */
  readonly material: MaterialId | null;
}

/**
 * **Buy a civic building.** Atomic and idempotent, because it is `applyMaterialSpend`
 * underneath: a rejection leaves the ledger untouched, and a replayed `placementId`
 * reports `already_spent` and changes nothing.
 *
 * **The price is read from the catalogue and can never come from a caller.** There
 * is no `cost` parameter, which is the difference between this and the raw
 * `applyMaterialSpend` it wraps — that function takes a cost precisely because no
 * catalogue existed when it was written, and its own comment says the cost "must be
 * read from IT and never from a client payload (INV-COS-4)" once one did. This is
 * that catalogue.
 *
 * **DUPLICATES ARE ALLOWED.** Nothing here looks at what the player already owns.
 * Every catalogue says "buildable as many times as you can afford", so a second
 * Family Lodge is a second `placementId` and a second 80 stone, and that is all.
 *
 * ## WHAT A CALLER MUST PASS, and what it must NOT
 *
 * Four fields, and the two that are absent are the point of the design.
 *
 *  - `studentId` — whose ledger.
 *  - `placementId` — **the idempotency key.** A stable id for THIS instance, minted
 *    once when the placement is created and reused on every retry. The event id is
 *    `build:<placement_id>`, so two placements of one building type differ here and a
 *    replay of the same id reports `already_spent` and writes nothing. It must contain
 *    no `:` — `buildEventId` rejects one, because colon is the id delimiter.
 *  - `building` — the catalogue row's shipped `id` (`prehistoric_longhouse`), not its
 *    display name. Ids are stable across renames by design; display names are not.
 *  - `nowMs` — the row's timestamp, and nothing reads it as a clock.
 *
 * **There is no `cost` parameter and there must never be one** (INV-COS-4): the price is
 * read from the catalogue here, which is the whole difference between this and the
 * `applyMaterialSpend` it wraps.
 *
 * **There is no `material` parameter either.** The era decides it, through the registry
 * rather than through the row's denormalised copy — a check written against
 * `building.material` would look right and spend from a stockpile the era does not mint.
 *
 * ## The rejections, each named so a caller never has to guess
 *
 *  - `unknown_building` — no such id.
 *  - `wrong_era` — era-exclusivity. Buildable only while in its own era.
 *  - `insufficient_material` — the honest affordability answer: save up.
 *  - `already_spent` — this `placementId` is already paid for. Not an error.
 *  - `invalid_cost` — a catalogue row priced at zero or a fraction; a data defect.
 *  - `era_material_unauthored` — **no longer reachable through the shipped registry**,
 *    since every era resolves a material. It used to mean "nine of ten eras cannot pay
 *    at all" and now means the registry failed to resolve one, which is a defect rather
 *    than a state. Kept because that defect is worth naming distinctly from "save up",
 *    and proved reachable by injection in `civicBuilding.test.ts` rather than left as a
 *    branch no test covers.
 */
export function applyCivicPurchase(
  view: LedgerView,
  input: CivicPurchaseInput,
): CivicPurchaseResult {
  const rejected = (
    status: CivicPurchaseStatus,
    balance = 0,
    material: MaterialId | null = null,
  ): CivicPurchaseResult => ({
    status,
    balance,
    rows: [],
    building: null,
    cost: 0,
    material,
  });

  const building = findCivicBuilding(input.building);
  if (building === null) {
    return rejected("unknown_building");
  }
  if (building.era !== input.currentEra) {
    return rejected("wrong_era");
  }
  // Not `building.material`: the check is that the era can MINT, which is the
  // registry's question, and the catalogue's copy of the id is a denormalisation.
  const material = materialForEra(input.currentEra);
  if (material === null) {
    return rejected("era_material_unauthored");
  }

  const spend = applyMaterialSpend(view, {
    studentId: input.studentId,
    placementId: input.placementId,
    material: material.id,
    cost: building.cost,
    nowMs: input.nowMs,
  });

  return {
    status: spend.status,
    balance: spend.balance,
    rows: spend.rows,
    building: spend.status === "spent" ? building : null,
    cost: spend.status === "spent" ? building.cost : 0,
    material: material.id,
  };
}
