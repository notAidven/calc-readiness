import { type EraId, getEraOrThrow } from "@cr/skill-graph";
import type { Mastery } from "@cr/state-schema";

import { ISLAND_UNLOCK_MASTERY_GATE } from "./island-unlock-exam";

/**
 * WHEN A MID-ERA CRISIS FIRES — the entry condition, and nothing else.
 *
 * Authority: `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md` **D-CRISIS-9**
 * (the crisis fires after `ceil(n / 2)` of that era's own nodes), **D-CRISIS-24** (that
 * arithmetic is stated as the formula and never as *"the median, rounded up"*), and
 * **D-CRISIS-10** (the crisis announces itself and the player chooses when to answer the
 * call — so nothing here opens anything; it reports that the call stands).
 *
 * ## The trigger is DERIVED from the era's size, and that is the whole point
 *
 * D-CRISIS-9: *"Not a fixed node index, and not a fraction of the era. The trigger is
 * derived from the era's own size, so an era that gains or loses a node moves its own
 * crisis and no table needs editing."* `ERA_SEQUENCE`'s node counts are the input, so
 * there is no per-era table here to fall out of step with the one in
 * `packages/skill-graph/src/eras.ts` — the numbers below are consequences of that array
 * and are quoted rather than authored:
 *
 * | Era | Nodes | Fires after |
 * | --- | --: | --: |
 * | 1 Prehistoric, 6 Early Modern, 7 Industrial, 9 Information Age | 6 | **3** |
 * | 2 Neolithic, 3 Bronze Age, 4 Classical, 5 Medieval | 5 | **3** |
 * | 8 Atomic Age, 10 Cyberpunk | 9 | **5** |
 *
 * **A literal 3 would be wrong for two of the ten and right for the wrong reason in the
 * other eight**, and `mid-era-crisis.test.ts` is written so that replacing the
 * computation with any constant fails: it re-derives the expectation from
 * `ERA_SEQUENCE` itself and asserts that the set of trigger points is not a singleton.
 *
 * ## Why "the median, rounded up" is not what this computes
 *
 * D-CRISIS-24 exists because the English form reads 3.5 → **4** on an even count, which
 * would move eras one, six, seven and nine off the trigger the lead named. The formula
 * leads and the word follows it as the thing it disambiguates. **An implementer codes
 * `ceil(n / 2)`, not the sentence.**
 *
 * ## The accuracy gate that is not in the spec
 *
 * The entry condition is remembered around the team as *"the era's midpoint, gated on the
 * learner's median accuracy within that era"*. The spec at this tip contains no such
 * gate: D-CRISIS-9 counts NODES, and accuracy enters the design one level down, at
 * INV-CRISIS-4, where it sizes the action a round earns and is explicitly never
 * permission. So nothing here reads an accuracy, and adding one would be building a rule
 * the design does not have. Recorded rather than quietly resolved, because the two
 * readings are one word apart and only one of them is written down.
 */

/**
 * Mastery an era node must hold to count toward the trigger.
 *
 * Imported, not chosen: `ISLAND_UNLOCK_MASTERY_GATE` is the authoritative full-mastery bar
 * and the bar `eraTimelineView.ts` reports "N of 6 skills mastered" against. §5.12 sizes
 * the trigger as *"3 of its 6 nodes are MASTERED"*, so this is the same fact those two
 * surfaces already state and there is no second copy of "mastered" to drift.
 */
export const CRISIS_MASTERY_GATE: Mastery = ISLAND_UNLOCK_MASTERY_GATE;

/**
 * `ceil(n / 2)` — the arithmetic on its own, over any node count.
 *
 * **It is exported so the derivation can be tested at counts the era table does not
 * contain**, which is the only assertion that can tell a computation from a lookup table.
 * A sweep over `ERA_SEQUENCE` catches `return 3` (eras eight and ten fire at five) and a
 * hand-written table keyed by era id would sail through it; driving this across the whole
 * pacing band, and pinning that {@link midEraCrisisTrigger} agrees with it era by era,
 * catches both. `mid-era-crisis.test.ts` does exactly that.
 */
export function crisisTriggerForNodeCount(nodeCount: number): number {
  return Math.ceil(nodeCount / 2);
}

/**
 * How many of an era's nodes must be mastered before its crisis fires: `ceil(n / 2)`
 * over the era's AUTHORED node set (D-CRISIS-9, D-CRISIS-24).
 *
 * Fails loud on an unknown era through `getEraOrThrow`, following `eraBuildableRadius`:
 * a crisis silently defaulting to era one's 3 would be a wrong answer wearing a right
 * one's clothes.
 */
export function midEraCrisisTrigger(eraId: EraId): number {
  return crisisTriggerForNodeCount(getEraOrThrow(eraId).nodes.length);
}

/**
 * The era's nodes up to and INCLUDING the one whose mastery fires the crisis, in the
 * authored order `ERA_SEQUENCE` fixes.
 *
 * This is the set a learner has finished at the moment the call arrives, and so the set a
 * dev seed has to stand up for the call to arrive legitimately. Derived from the same
 * count as {@link midEraCrisisTrigger}, so the two cannot disagree about which node is
 * the last one before the crisis.
 */
export function midEraCrisisNodeIds(eraId: EraId): readonly string[] {
  return getEraOrThrow(eraId).nodes.slice(0, midEraCrisisTrigger(eraId));
}

/** Where an era stands against its own crisis trigger. */
export interface MidEraCrisisCall {
  readonly era_id: EraId;
  /** `ceil(n / 2)` for this era (D-CRISIS-9). */
  readonly trigger: number;
  /** How many of THIS ERA's nodes are mastered. Nodes of other eras do not count. */
  readonly mastered: number;
  /** How many of this era's nodes there are, so a caller can say "3 of 6". */
  readonly era_nodes: number;
  /** Whether the crisis has been called. It then WAITS (D-CRISIS-10). */
  readonly standing: boolean;
}

/**
 * Read an era's crisis call from a learner's node states.
 *
 * It takes the raw states rather than a pre-filtered id list so the mastery bar is applied
 * in exactly one place — the same reason `cityEraTimeline` takes them. Nodes outside this
 * era are ignored rather than counted: an era's crisis is about that era's own work, and a
 * learner who advanced with an era unfinished must not carry the shortfall forward as
 * credit (or the surplus as a head start).
 */
export function midEraCrisisCall(
  eraId: EraId,
  nodeStates: readonly { readonly node_id: string; readonly mastery: Mastery }[],
): MidEraCrisisCall {
  const nodes = getEraOrThrow(eraId).nodes;
  const eraNodes = new Set(nodes);
  const masteredIds = new Set(
    nodeStates
      .filter((state) => state.mastery >= CRISIS_MASTERY_GATE)
      .map((state) => state.node_id),
  );
  const mastered = [...eraNodes].filter((nodeId) => masteredIds.has(nodeId)).length;
  const trigger = midEraCrisisTrigger(eraId);

  return {
    era_id: eraId,
    trigger,
    mastered,
    era_nodes: nodes.length,
    standing: mastered >= trigger,
  };
}
