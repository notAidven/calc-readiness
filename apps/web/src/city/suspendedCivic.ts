import { civicLiftSuspensionCost, parseCivicPlacementId } from "@cr/economy";
import type { CrisisDamage } from "@cr/game";
import type { EraId } from "@cr/skill-graph";

import type { PlacedTransform } from "./worldLayout";

/**
 * **WHAT A SUSPENDED CIVIC BUILDING COSTS THE CITY, and what lifting it costs the player.**
 *
 * `CrisisDamage.suspended_civic` is the third of the three sets a crisis may leave behind,
 * beside `ruined_buildings` and `ruined_cells`. Era four's Succession calls it *"era four's
 * whole durable consequence"*; era nine's Intrusion calls it *"era nine's whole durable
 * record"*. It was computed, folded, validated, persisted and counted in two conclusions,
 * and **nothing in the city read it**: a shuttered building went on contributing its
 * livability and its happiness exactly as if the crisis had never happened.
 *
 * This module is the reader. It is the only one, and every surface that has to answer a
 * question about a suspension asks it here.
 *
 * ## SCOPED TO A CITY, NOT TO A CRISIS — deliberately, and it is the load-bearing decision
 *
 * Nothing in this file knows what a Succession or an Intrusion is. It takes a city's
 * standing damage and the civic buildings on its ground, and it answers *which of these are
 * shuttered, what is being withheld, and what does putting one back cost*. Two crises write
 * the field today, `crisis-damage.ts` predicted a third before either existed (the Lost
 * Herd, *"a crisis that does not exist yet"*), and era six's Plague already has the shape.
 * A reader scoped to either crisis would go green over the other, which is exactly the
 * narrow-population failure `.cursor/rules/qa-verification.mdc` documents; scoped to the
 * FIELD, a third crisis is covered on the day it writes one.
 *
 * ## A SUSPENSION IS JOINED TO A PLACEMENT, AND AN UNJOINED ONE IS SILENT
 *
 * A suspension record is an opaque placement id, and the crises' authored boards carry
 * STAND-IN ids (`succession-harbour-grain-dock`) until a caller plays one over a real city,
 * exactly as `createHardWinter` takes a real city's placements. So the join here is a
 * left join against what is actually standing: a suspension naming a placement this city
 * does not hold withholds nothing, shows nothing and prices nothing, because there is no
 * building for it to be about. That is the same discipline `parseCivicPlacementId` keeps —
 * fail to `null`, never invent a row.
 */

/**
 * Placement ids this city currently has suspended.
 *
 * A SET rather than the records, because every consumer of it is asking a membership
 * question about one placement. The records themselves carry the damage id, which only the
 * spend needs; {@link standingSuspensions} is where that is joined up.
 */
export function suspendedCivicIds(damage: CrisisDamage): ReadonlySet<string> {
  return new Set(damage.suspended_civic.map((record) => record.placement_id));
}

/** One shuttered building, joined to the placement it names and priced. */
export interface StandingSuspension {
  /** The civic placement id, which is also the repair spend's subject. */
  readonly placementId: string;
  /** The crisis run that shuttered it — the repair spend's idempotency key. */
  readonly damageId: string;
  /** The authored, learner-facing name ("The Family Lodge"). */
  readonly name: string;
  /** Livability the city is not getting while this stands. */
  readonly livability: number;
  /** Happiness coverage the city is not getting while this stands. */
  readonly happiness: number;
  /** What lifting this one costs, in the CURRENT era's material. */
  readonly liftCost: number;
}

/**
 * Every suspension this city can actually show, in the order the crisis recorded them.
 *
 * The era is the one the city is STANDING in rather than the building's own, because the
 * price is (see `civicLiftSuspensionCost`): a suspension of an era-one Lodge lifted in era
 * eight is an era-eight bill, or it is loose change.
 */
export function standingSuspensions(
  damage: CrisisDamage,
  civic: readonly PlacedTransform[],
  eraId: EraId,
): StandingSuspension[] {
  const standing = new Set(civic.map((placed) => placed.nodeId));
  const rows: StandingSuspension[] = [];
  for (const record of damage.suspended_civic) {
    if (!standing.has(record.placement_id)) {
      continue;
    }
    const parsed = parseCivicPlacementId(record.placement_id);
    if (parsed === null) {
      continue;
    }
    rows.push({
      placementId: record.placement_id,
      damageId: record.damage_id,
      name: parsed.row.name,
      livability: parsed.row.provides.livability,
      happiness: parsed.row.provides.happiness,
      liftCost: civicLiftSuspensionCost(parsed.row, eraId),
    });
  }
  return rows;
}

/**
 * The two capacities the city is doing without, summed over every standing suspension.
 *
 * `@cr/economy`'s `civicSuspendedCapacity` answers the same question over `CivicPlacement`
 * rows, and this is deliberately NOT a second reading of the rule: both are a sum over the
 * suspended rows' own catalogue contributions, and the web lane holds `PlacedTransform`s
 * rather than `CivicPlacement`s. What must not fork is which buildings count, and that is
 * `standingSuspensions` — one answer, used by the panel, the caption and the arithmetic.
 */
export function suspendedCapacity(rows: readonly StandingSuspension[]): {
  readonly livability: number;
  readonly happiness: number;
} {
  let livability = 0;
  let happiness = 0;
  for (const row of rows) {
    livability += row.livability;
    happiness += row.happiness;
  }
  return { livability, happiness };
}

/**
 * **WHAT A SUSPENDED BUILDING SAYS ABOVE ITS ROOF.**
 *
 * One word, in the channel #502 established for exactly this: while a crisis is on, a
 * building's caption is replaced by its STATUS (`FROZEN` / `SHIELDED` / `IN DANGER` /
 * `SAFE`, `SkillLabels`' `CRISIS_LABEL_TEXT`). A suspension is that same kind of fact about
 * one building, so it is said in that same channel and in the same register rather than in
 * a new one.
 *
 * **IT IS NOT A MEMBER OF `CRISIS_LABEL_TEXT`, and that is the difference worth keeping.**
 * Those four are read off a LIVE board and vanish with the thaw. This is durable damage the
 * city carries after every crisis has gone home, so it is captioned in the ORDINARY city
 * and has no board to be resolved against — which is also why a suspended building keeps
 * its caption when nothing else on the island has one.
 */
export const SUSPENDED_CAPTION = "SUSPENDED";
