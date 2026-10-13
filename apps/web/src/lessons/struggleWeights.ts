/**
 * The one place struggle data is turned into something a surface can act on: how many slots
 * a skill gets in a drill cycle, and how much one SHAPE of problem on that skill outdraws
 * the node's others.
 *
 * It sits between `struggleStore` (which only knows what happened) and the drill (which
 * only knows how to serve items), so neither has to hold the other's rules. It is also the
 * boundary the one-way invariant is easiest to read at: everything here flows from history
 * towards the DRILL and the ECONOMY, and nothing flows back towards item selection for a
 * practice set.
 */

import type { FrozenItem } from "@cr/item-bank";
import {
  type ItemWeight,
  MAX_ITEM_WEIGHT,
  MAX_SLOTS_PER_CYCLE,
  type NodeWeights,
} from "./infiniteScheduler";
import {
  readStruggleRecord,
  type StruggleStorage,
  type StruggleTier,
  struggleLevelOf,
  struggleTierOf,
  templateStruggleLevelOf,
} from "./struggleStore";

/**
 * Slots per cycle by tier.
 *
 * Written as a table rather than a formula because these three numbers are a product
 * decision, not a derivation: a struggling skill comes round three times in the span the
 * rest come round once, a shaky one twice, and a skill in hand once. Every tier is at least
 * one, which is what keeps the drill interleaved.
 */
const SLOTS_BY_TIER: Record<StruggleTier, number> = {
  struggling: MAX_SLOTS_PER_CYCLE,
  shaky: 2,
  solid: 1,
};

export function slotsForTier(tier: StruggleTier): number {
  return SLOTS_BY_TIER[tier];
}

/** A node's standing, as the scheduler and the payout read it. */
export interface NodeStruggle {
  readonly level: number;
  readonly tier: StruggleTier;
}

/** Levels and tiers for a set of nodes, read once so the drill does not re-read per draw. */
export function readNodeStruggle(
  nodeIds: readonly string[],
  storage?: StruggleStorage | null,
): Map<string, NodeStruggle> {
  const struggle = new Map<string, NodeStruggle>();
  for (const nodeId of nodeIds) {
    const level =
      storage === undefined
        ? struggleLevelOf(readStruggleRecord(nodeId))
        : struggleLevelOf(readStruggleRecord(nodeId, storage));
    struggle.set(nodeId, { level, tier: struggleTierOf(level) });
  }
  return struggle;
}

/** The scheduler's view of the same data. */
export function weightsFromStruggle(
  struggle: ReadonlyMap<string, NodeStruggle>,
): NodeWeights {
  const weights = new Map<string, number>();
  for (const [nodeId, entry] of struggle) {
    weights.set(nodeId, slotsForTier(entry.tier));
  }
  return weights;
}

/**
 * The drill's within-node draw: how much each SHAPE of problem outdraws its node's others.
 *
 * Reads each node's record ONCE and closes over the result, because the returned function is
 * called on every draw and a `localStorage` read plus a `JSON.parse` per problem served is a
 * cost the drill has no reason to pay. That does mean the weights are a snapshot from when
 * the drill opened, matching how `weightsFromStruggle` already treats cycle slots: a session
 * is tailored to the learner who sat down, and re-tailoring mid-session would move the
 * ground under them.
 *
 * The level maps straight onto `[1, MAX_ITEM_WEIGHT]` rather than through a tier table.
 * Tiers exist for the cycle because a slot count is an integer and three names are easier to
 * reason about than a curve; a draw weight has no such constraint, and a shape at 0.9 really
 * should come up a little more often than one at 0.6.
 */
export function itemWeightsFromStruggle(
  nodeIds: readonly string[],
  storage?: StruggleStorage | null,
): ItemWeight {
  const records = new Map(
    nodeIds.map((nodeId) => [
      nodeId,
      storage === undefined
        ? readStruggleRecord(nodeId)
        : readStruggleRecord(nodeId, storage),
    ]),
  );
  return (item: FrozenItem): number => {
    const record = records.get(item.node_id);
    if (!record) {
      return 1;
    }
    const level = templateStruggleLevelOf(record, item.template_id);
    return 1 + (MAX_ITEM_WEIGHT - 1) * level;
  };
}

/**
 * The mean level across the nodes a paid round touched, which is what the payout scales on.
 *
 * A round is a run of correct answers across a mixed cycle, so no single node owns it.
 * Averaging is what makes the reward track "how hard was this round for this learner"
 * rather than whichever skill happened to land last.
 */
export function roundStruggleLevel(levels: readonly number[]): number {
  if (levels.length === 0) {
    return 0;
  }
  return levels.reduce((sum, level) => sum + level, 0) / levels.length;
}
