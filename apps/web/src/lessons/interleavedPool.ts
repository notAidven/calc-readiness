import type { FrozenItem } from "@cr/item-bank";
import { type EraId, getEra } from "@cr/skill-graph";

import { INTERLEAVED_PRACTICE_MIN_COMPLETED } from "../city/townHall";
import { practiceItemsById } from "./practiceChecker";

/**
 * The ONE place the interleaved drill's problem pool is derived, so the surface that
 * OFFERS the drill and the drill itself can never disagree about what there is to
 * interleave.
 *
 * `EraInfinitePractice` builds its scheduler from {@link interleavedPool}; the Town Hall
 * gates its entry point on the same call. Because both read this module, an enabled entry
 * point always opens a drill with something in it — a gate computed from any other notion
 * of "completed" can enable a button that lands the learner on the locked screen (a
 * tested-out node is `completion_status: "complete"` at `mastery: 0`, so it has no
 * practiced skills to mix).
 *
 * ## THE POPULATION IS THE ERA'S, NOT A DOMAIN'S
 *
 * This module keyed on `LESSON_DOMAINS` and `domain.ownsNode` until the era model
 * landed, and the swap is a behaviour change rather than a rename: **domain and era are
 * not 1:1**, so the two derivations disagree about real nodes. Three domains span eras
 * (`docs/Content_Authoring_Split.md` §10.3), which means `RAT.5` mixes with the
 * Early Modern rather than with the other five `RAT` nodes, and the Atomic Age mixes the
 * four `LF` nodes with `FUN` ones from a different directory. The era is what a learner
 * plays through, so the era is what a chapter's drill interleaves.
 *
 * The node set comes from `ERA_SEQUENCE` via `getEra`, never from a list written down
 * here and never derived from a `DomainId` (INV-ERA-5). Membership is authored data that
 * has already moved once — #210 moved `POL.6`, `POL.7` and `RAT.5` between eras — so a
 * transcribed copy would be a second opinion waiting to go stale.
 *
 * ## ⚑ AN ERA THAT CANNOT MIX IS NOT THE END OF THE OFFER
 *
 * The era's own pool was the ONLY pool until 2026-07-31, and pinning it there is what
 * killed the hub's one repeatable activity from era two onward. Measured at `03d5a2b9`:
 * drive the real panel in all ten eras with all six era-one skills practised and era one
 * reads *"Mixed problems drawn from the 6 skills you have practiced"* while eras two
 * through ten read `aria-disabled="true"` and *"(0 of 6 so far)"* — a learner who has
 * just finished six skills told they have finished none, in a state they cannot play out
 * of, because the pool intersects the era's nodes with the learner's completed nodes and
 * a learner can only complete era one's nodes today (`descriptors.ts` admits `mvp`-scope
 * nodes only, so eras two through ten resolve to zero plots).
 *
 * So {@link interleavedPool} takes {@link WhenEraCannotMix}: a caller may ask for the
 * learner's WHOLE practised set when the era's own cannot be interleaved, and the pool
 * reports which of the two it handed back ({@link InterleavedPool.source}) so the offer
 * can say what it is doing rather than pass era-one's mix off as the era's own.
 *
 * **The floor is not loosened by any of this.** {@link INTERLEAVED_PRACTICE_MIN_COMPLETED}
 * is still the bar, and it is still measured on the pool that will actually be drilled;
 * what the fallback changes is WHICH pool the bar is measured against. A learner who has
 * practised one skill anywhere is still below it, in every era.
 */

/**
 * What a caller wants when the ERA's own practised skills cannot be interleaved — fewer
 * than {@link INTERLEAVED_PRACTICE_MIN_COMPLETED} of them, which includes none at all.
 *
 * - `"lock"` — hand back the era's own pool as it stands, so an empty era reads as empty.
 *   **The default, and the right answer for a surface whose subject IS the era's content**:
 *   the `?dev` era list prints each era's drillable count and its buttons must reach the
 *   locked panel, or the page stops being able to report what each era holds.
 * - `"revisit-practiced"` — widen to every skill the learner has practised, in any era.
 *   For a learner-facing entry point that has to offer SOMETHING repeatable.
 */
export type WhenEraCannotMix = "lock" | "revisit-practiced";

/** Which population {@link interleavedPool} drew from. */
export type InterleavedPoolSource =
  /** The era's own nodes, which is the normal reading and the one the drill is about. */
  | "era"
  /** Every skill the learner has practised, because the era's own could not be mixed. */
  | "practiced";

export interface InterleavedPool {
  readonly items: readonly FrozenItem[];
  /**
   * The distinct skills the pool can serve problems for — i.e. how many skills there are
   * to interleave. This is the number an entry point gates on, not the raw completed
   * count: a completed skill the item bank has no items for contributes nothing to a mix.
   */
  readonly skillIds: readonly string[];
  readonly source: InterleavedPoolSource;
}

const EMPTY_POOL: InterleavedPool = { items: [], skillIds: [], source: "era" };

function skillIdsOf(items: readonly FrozenItem[]): readonly string[] {
  return [...new Set(items.map((item) => item.node_id))];
}

/**
 * The practice items an interleaved session may draw from, and which population they came
 * from: the era's own items restricted to the skills the learner has finished a practice
 * set on, widening to every practised skill when `whenEraCannotMix` asks for it.
 *
 * `"all"` skips the completion restriction and is a DEV PREVIEW escape hatch only (the
 * `?dev` page). **It never widens**, whatever `whenEraCannotMix` says, and that is not a
 * missing case: the fallback is the LEARNER's practised set, and `"all"` has no learner
 * set to widen to. Widening it would mean "every item in the bank", which is a
 * drill-everything mode nobody has asked for and which would take the `?dev` page's
 * per-era count with it.
 *
 * Empty when the era is unknown or nothing survives the gate — the caller decides whether
 * that is a locked screen or a disabled entry point. **An era can be empty for a reason
 * that is not a bug**, and a pool below the two-skill floor interleaving needs is the same
 * supported state: that is the era model reporting the content it has. How many eras are
 * in either state is deliberately NOT written down here. It was, and the sentence was
 * wrong within weeks of every authoring run; the registry is the only copy of that figure
 * that cannot go stale, and `interleavedPool.test.ts` reads it there.
 */
export function interleavedPool(
  eraId: EraId,
  completedNodeIds: readonly string[] | "all",
  whenEraCannotMix: WhenEraCannotMix = "lock",
): InterleavedPool {
  const era = getEra(eraId);
  if (!era) {
    return EMPTY_POOL;
  }
  const eraNodes = new Set<string>(era.nodes);
  const unlocked = completedNodeIds === "all" ? null : new Set<string>(completedNodeIds);
  const bank = Array.from(practiceItemsById.values());
  const items = bank.filter(
    (item) =>
      eraNodes.has(item.node_id) && (unlocked === null || unlocked.has(item.node_id)),
  );
  const skillIds = skillIdsOf(items);
  if (
    unlocked === null ||
    whenEraCannotMix === "lock" ||
    skillIds.length >= INTERLEAVED_PRACTICE_MIN_COMPLETED
  ) {
    return { items, skillIds, source: "era" };
  }

  const practicedItems = bank.filter((item) => unlocked.has(item.node_id));
  const practicedSkillIds = skillIdsOf(practicedItems);
  // Report `"era"` unless the widening actually widened. A learner below the floor
  // EVERYWHERE has nothing more to be offered, and telling them the pool was widened
  // would name a fallback that handed back the same thing.
  if (practicedSkillIds.length <= skillIds.length) {
    return { items, skillIds, source: "era" };
  }
  return { items: practicedItems, skillIds: practicedSkillIds, source: "practiced" };
}

/**
 * The era's own pool, as items. A thin read of {@link interleavedPool} at its default,
 * kept because three callers want exactly the era's content and nothing wider: the `?dev`
 * page's per-era drillable count, the advance ceremony's question source, and
 * `drillBound.test.ts`'s measurement of where an era's fresh shapes run out.
 */
export function interleavedPoolItems(
  eraId: EraId,
  completedNodeIds: readonly string[] | "all",
): readonly FrozenItem[] {
  return interleavedPool(eraId, completedNodeIds).items;
}

/** The era's own pool, as the distinct skills it can serve. */
export function interleavedSkillIds(
  eraId: EraId,
  completedNodeIds: readonly string[] | "all",
): readonly string[] {
  return interleavedPool(eraId, completedNodeIds).skillIds;
}
