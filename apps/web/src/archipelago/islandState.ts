import type { CrisisDamage } from "@cr/game";
import { NO_CRISIS_DAMAGE } from "@cr/game";
import { ERA_SEQUENCE, type EraId, eraNumber } from "@cr/skill-graph";

import type { RoadCell } from "../city/roads";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import type { CityLoad } from "../city/types";
import type { PlacedTransform } from "../city/worldLayout";

/**
 * **AN ISLAND IS A PLACE, AND THIS IS WHAT MAKES IT ONE.**
 *
 * Authority: `docs/superpowers/specs/2026-08-04-archipelago-design.md` §7 stage 3 and §8. #644
 * the earlier staged crossing said in its own report exactly what it staged:
 * *"No `city_road` migration, no island-local coordinates, no per-island wallets, no
 * `city_placement` partition, no overview, no way back. Pressing 'Enter the Neolithic' lands
 * the learner on the same island re-themed, with their era-one buildings still on it."*
 *
 * This module is the partition that was staged. It holds no React, no storage and no
 * rendering: it is the answer to *"what does a learner's civilization consist of when it is
 * spread over ten places"*, and everything else in this directory is built on it.
 *
 * ## ISLAND-LOCAL COORDINATES ARE THE PARTITION, NOT A SECOND COORDINATE SYSTEM
 *
 * This is the finding that made stage 3 much smaller than §7 costed it at, and it is worth
 * stating plainly because it reads like a shortcut and is not one. A placement is already a
 * `{col, row, rot}` on ONE island's grid — `worldLayout.ts` centres that grid on the island's
 * own origin and `BUILDABLE_RADIUS` bounds it — so the shipped coordinates are already
 * island-local. What made them look global is that there has only ever been one island to be
 * local to.
 *
 * So there is no migration from a world frame to an island frame, because nothing was ever in
 * a world frame. What was missing is that two islands could not both hold a building at
 * `(0, 0)`, and that is a fact about the CONTAINER rather than about the coordinate.
 * {@link ArchipelagoState} is that container, and `islandState.test.ts` measures the property
 * directly: two islands, the same cell, two different buildings, neither disturbing the other.
 *
 * ## WHAT IS PER-ISLAND AND WHAT IS THE LEARNER'S, SAID ONCE HERE
 *
 * The split is not a taste. It is the difference between a fact about a PLACE and a fact about
 * a PERSON, and getting it wrong in either direction is a visible defect:
 *
 *  - **Per-island** ({@link IslandLayout}): the skill buildings standing on it, its roads and
 *    what they cost, its town hall, its bought civic buildings and what they cost, and what a
 *    crisis did to it. Move to another island and none of these come with you — which is the
 *    owner's ruling that *"resources stay on the island that earned them"* made structural.
 *  - **The learner's, and therefore shared**: `node_states` (mastery, lesson stage, placement
 *    estimate) and the neighborhood checkpoint. A skill learned on era one's island is learned
 *    on era five's, and a model that forgot that would re-lock the learner's own knowledge
 *    every time they sailed.
 *
 * **MATERIAL IS PER-ISLAND WITHOUT THIS MODULE DOING ANYTHING**, and that is worth recording
 * so nobody adds a second mechanism for it. `@cr/economy`'s materials are ERA-denominated
 * (`materials.ts`: one material per era, credited from the completed node's own era), and an
 * island IS an era, so era one's stone and era two's grain are already two different purses.
 * What this module adds on top is the SPEND: both spend counters are per island here, so
 * buying on one island cannot draw down another island's stockpile. §8.2 calls the first half
 * *"material is already era-denominated"*; the second half is the half that was missing.
 *
 * **BOTH SINKS ARE ERA MATERIAL, and `road_gold_spent` is only still called that because the
 * field name is persisted.** `roadsEconomy.ts` records the change in full: *"THIS USED TO NET
 * OUT GOLD. The gold-drop retired that currency and made the era's material the purchase point
 * for everything, so roads draw on the SAME stockpile as civic buildings and crisis repair."*
 * That is what makes the per-island reading of BOTH counters correct rather than a choice —
 * they are netted out of `WalletView.spendable`, which is the LIVE era's material, and the
 * live era is the standing island's era. So {@link roadMaterialSpentOn} and
 * {@link materialSpentOn} are both per island and neither is summed; summing them would net
 * era two's grain spend out of an era-one stone stockpile. {@link totalRoadMaterialSpent}
 * exists for a reader that wants the bay's whole outlay and is deliberately not what the
 * wallet reads.
 */

/**
 * **ONE ISLAND'S OWN LAYOUT — the partition of `CityLoad` that belongs to a place.**
 *
 * Exactly the fields of {@link CityLoad} that describe GROUND, and none of the fields that
 * describe the learner. Held as a plain immutable value rather than as a session, so a
 * non-standing island costs nothing to keep and cannot be mutated behind the standing one's
 * back.
 */
export interface IslandLayout {
  /** Skill buildings on this island's own grid. */
  readonly placements: readonly PlacedTransform[];
  /** Road tiles on the same grid. */
  readonly roads: readonly RoadCell[];
  /** Gold sunk into THIS island's roads. Net of refunds, never below zero. */
  readonly road_gold_spent: number;
  /** This island's hall. Every founded island has one standing (§8.4). */
  readonly town_hall: PlacedTransform | null;
  /** The civic buildings bought and standing here. */
  readonly civic: readonly PlacedTransform[];
  /** This island's era material sunk into those civic buildings. */
  readonly civic_material_spent: number;
  /** What a crisis did HERE. A winter on era two's island does not scar era one's. */
  readonly crisis_damage: CrisisDamage;
}

/** One island in the bay: its era, and what stands on it. */
export interface IslandRecord {
  readonly eraId: EraId;
  readonly layout: IslandLayout;
}

/**
 * **THE WHOLE CIVILIZATION, as places.**
 *
 * `standing` is where the learner is right now, and it is ALWAYS one of {@link islands} — an
 * invariant the two mutators below maintain and `islandState.test.ts` asserts in both
 * directions, because a standing era with no island is a city with no ground under it.
 *
 * `islands` is the FOUNDED set and nothing else. An era the learner has not reached has no
 * record here at all, which is what makes {@link isFounded} a fact rather than a heuristic
 * over empty layouts: an island whose learner demolished everything on it and an island that
 * does not exist are different things, and only the first has a hall.
 */
export interface ArchipelagoState {
  /** The island the learner is standing on. Always present in {@link islands}. */
  readonly standing: EraId;
  /** Every founded island, in `ERA_SEQUENCE` order. */
  readonly islands: readonly IslandRecord[];
}

/** An island with nothing on it at all — not even a hall. Used only as a starting point. */
export const BARE_LAYOUT: IslandLayout = {
  placements: [],
  roads: [],
  road_gold_spent: 0,
  town_hall: null,
  civic: [],
  civic_material_spent: 0,
  crisis_damage: NO_CRISIS_DAMAGE,
};

/**
 * **WHAT A NEWLY FOUNDED ISLAND HAS ON IT: a hall, at its centre, and nothing else.**
 *
 * §8.4, in terms: *"a new island arrives with its hall standing"*. The hall is the founding
 * grant's visible half, so an island that arrived without one would contradict the founding
 * reveal the learner just watched.
 *
 * `TOWN_HALL_CENTER_TRANSFORM` is the same seat `citySession.ts` pre-seeds era one's hall at,
 * shared rather than restated so the two islands cannot found their halls in different places.
 * The fallback branch `seededTownHallTransform` carries is deliberately not reached here:
 * nothing else is on this island, so the centre is free by construction.
 */
export function foundingLayout(): IslandLayout {
  return {
    ...BARE_LAYOUT,
    town_hall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
  };
}

/** Sort islands into `ERA_SEQUENCE` order, which is the order the bay draws them in. */
function inEraOrder(islands: readonly IslandRecord[]): readonly IslandRecord[] {
  return [...islands].sort((a, b) => eraNumber(a.eraId) - eraNumber(b.eraId));
}

/**
 * **THE ARCHIPELAGO A LEARNER STARTS WITH: one island, the one they are standing on.**
 *
 * The layout comes IN rather than being founded here, because the first island is the one that
 * already exists — a learner arriving with a saved era-one city has a hall, six buildings and
 * a road network on it, and founding over that would delete their city. Callers with nothing
 * to hand over pass {@link foundingLayout}.
 */
export function archipelagoFrom(eraId: EraId, layout: IslandLayout): ArchipelagoState {
  return { standing: eraId, islands: [{ eraId, layout }] };
}

/** Whether this era's island exists yet. */
export function isFounded(state: ArchipelagoState, eraId: EraId): boolean {
  return state.islands.some((island) => island.eraId === eraId);
}

/** The eras that have islands, in sequence order. */
export function foundedEras(state: ArchipelagoState): readonly EraId[] {
  return state.islands.map((island) => island.eraId);
}

/** What stands on one island, or `null` when that island has not been founded. */
export function layoutOf(state: ArchipelagoState, eraId: EraId): IslandLayout | null {
  return state.islands.find((island) => island.eraId === eraId)?.layout ?? null;
}

/**
 * **FOUND A NEW ISLAND — the durable state half of the unlock reveal.**
 *
 * Idempotent on an era that already has one, and that is fail-SAFE rather than fail-loud on
 * purpose: the ceremony is re-enterable (`CitySurface`'s ☰ Menu → Advance the age is
 * deliberately ungated), so a learner standing in era two who runs the ceremony again would
 * otherwise wipe era two's island and everything on it. Refusing is the only direction in
 * which nothing is lost.
 *
 * **It does not move the learner.** Founding and arriving are separate calls;
 * {@link standOn} is the explicit travel half.
 */
export function foundIsland(
  state: ArchipelagoState,
  eraId: EraId,
  layout: IslandLayout = foundingLayout(),
): ArchipelagoState {
  if (isFounded(state, eraId)) {
    return state;
  }
  return {
    standing: state.standing,
    islands: inEraOrder([...state.islands, { eraId, layout }]),
  };
}

/**
 * **SAIL TO AN ISLAND.**
 *
 * Refuses an island that does not exist, by returning the state unchanged. A learner cannot
 * navigate to an era they have not reached, and the check is here rather than only in the
 * navigation surface for the reason `citySession.ts` gates placement in the session rather
 * than only in the ghost: a surface that is the only guard is a guard that the next surface
 * does not have.
 */
export function standOn(state: ArchipelagoState, eraId: EraId): ArchipelagoState {
  if (!isFounded(state, eraId) || state.standing === eraId) {
    return state;
  }
  return { standing: eraId, islands: state.islands };
}

/**
 * Write a layout back to one island. Unfounded eras are refused (unchanged), so a stray write
 * cannot create an island by the side door and skip the founding grant.
 */
export function withLayout(
  state: ArchipelagoState,
  eraId: EraId,
  layout: IslandLayout,
): ArchipelagoState {
  if (!isFounded(state, eraId)) {
    return state;
  }
  return {
    standing: state.standing,
    islands: state.islands.map((island) =>
      island.eraId === eraId ? { eraId, layout } : island,
    ),
  };
}

/**
 * Clear a founded, non-standing island back to its founding state. The Hall's exact transform
 * survives; learner placements, roads, both spend counters and all crisis damage do not.
 */
export function resetPastIsland(state: ArchipelagoState, eraId: EraId): ArchipelagoState {
  const existing = layoutOf(state, eraId);
  if (existing === null || state.standing === eraId) {
    return state;
  }
  return withLayout(state, eraId, {
    ...BARE_LAYOUT,
    town_hall: existing.town_hall ?? foundingLayout().town_hall,
  });
}

/**
 * **THE ISLAND'S OWN CIVIC SPEND, and it is deliberately NOT summed over the bay.**
 *
 * Era material is era-denominated (`@cr/economy`'s `materials.ts`), so era one's stone and era
 * two's grain are already separate purses and summing their spends would net grain out of a
 * stone stockpile. An island's spend is drawn against its OWN era's material and nothing else,
 * which is the whole of *"resources stay on the island that earned them"* on the spend side.
 *
 * `0` for an unfounded island, which is the honest answer: nothing has been bought on a place
 * that does not exist.
 */
export function materialSpentOn(state: ArchipelagoState, eraId: EraId): number {
  return layoutOf(state, eraId)?.civic_material_spent ?? 0;
}

/**
 * **THE ISLAND'S OWN ROAD SPEND, per island for exactly the reason the civic one is.**
 *
 * Since the gold-drop a road tile is priced in the era's material (`roadsEconomy.ts`), so this
 * is the second sink on the same era-denominated stockpile and takes the same reading. The
 * stored field is still called `road_gold_spent` because it is persisted under that name in
 * `CityDevSnapshot` and in `POST /api/city`; renaming it would be a schema bump for a word.
 */
export function roadMaterialSpentOn(state: ArchipelagoState, eraId: EraId): number {
  return layoutOf(state, eraId)?.road_gold_spent ?? 0;
}

/**
 * The whole bay's road outlay, for a reader that wants one number for the civilization.
 *
 * **Not what the wallet nets**, and the distinction matters: `spendable` is one era's
 * material, so netting a sum over ten eras out of it would charge era two's grain against era
 * one's stone. `archipelagoSession.ts` serves the standing island's figure to the wallet and
 * this to nobody but a summary.
 */
export function totalRoadMaterialSpent(state: ArchipelagoState): number {
  return state.islands.reduce((total, island) => total + island.layout.road_gold_spent, 0);
}

/**
 * **THE BAY'S DAMAGE MINT: one past the highest id any island has issued.**
 *
 * A repair spend is keyed `n<damage_id>:<kind>:<subject>` (`@cr/economy`'s
 * `materialSpend.ts`), and `crisisDamageId` mints `d1`, `d2`, … per session. Left per island
 * that is a collision waiting to happen: two islands each ruin their hall, each mints `d1`,
 * and the second repair reports `already_spent` — a ruin the economy believes is paid for and
 * the learner has no way to clear. It is not on the demo route, which is exactly why it would
 * have shipped.
 *
 * So a landfall raises the island it lands on to this figure and the mint is monotone across
 * the whole civilization. It only ever goes UP, which is the direction
 * `devSession.ts`'s `isCrisisDamage` guard requires: every stamped id must be strictly below
 * the mint, and raising the mint cannot break that for an id already stamped.
 */
export function bayDamageMint(state: ArchipelagoState): number {
  return state.islands.reduce(
    (highest, island) => Math.max(highest, island.layout.crisis_damage.next_damage_id),
    1,
  );
}

/** The partition of a `CityLoad` that belongs to the ground it was loaded from. */
export function layoutFromLoad(load: CityLoad): IslandLayout {
  return {
    placements: load.placements ?? [],
    roads: load.roads ?? [],
    road_gold_spent: load.road_gold_spent ?? 0,
    town_hall: load.town_hall ?? null,
    civic: load.civic ?? [],
    civic_material_spent: load.civic_material_spent ?? 0,
    crisis_damage: load.crisis_damage ?? NO_CRISIS_DAMAGE,
  };
}

/**
 * Every era the bay has a place for, in order — `ERA_SEQUENCE`'s ids.
 *
 * Re-derived here rather than written down so an era added to the sequence gets an island
 * without this module being edited (INV-ERA-5: order is array position and nothing else).
 */
export const BAY_ERAS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);
