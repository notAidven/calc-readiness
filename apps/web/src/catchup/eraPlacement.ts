import {
  DIAGNOSTIC_MASTERY_PLACEMENT_GATE,
  diagnosticEraIsMastered,
  diagnosticEraPlacement,
} from "@cr/game";
import { ERA_SEQUENCE, type EraId, eraNumber, getEraOrThrow } from "@cr/skill-graph";
import type { PlacementEstimate } from "@cr/state-schema";

/**
 * WHICH AGE THE DIAGNOSTIC PLACED THE LEARNER IN, and which ages it would hand over.
 *
 * Authority: **§10.9** of `docs/superpowers/specs/2026-08-01-test-out-experience-review.md`
 * (the stopping point, and the prefix property it forces) over §10.1's reading of
 * **D-ERA17** — *"the diagnostic discharges lessons. It never discharges mastery or a
 * trial, except for the eras the prologue places you past, while its evidence is still
 * fresh."* The ruled state hands a prologue-placed age over with **zero** confirmation
 * questions, which is why nothing in this module grades anything.
 *
 * ## The era decision is a CONJUNCTION, and that is the whole derivation
 *
 * `engines/diagnostic/sim/era-placement.sim.test.ts` defines an era as firing when
 * *"every era node resolved `passed`"*, and everything measured in
 * `docs/superpowers/specs/2026-08-01-diagnostic-placement-accuracy.md` is measured against
 * that definition. {@link eraFires} is that sentence and nothing else, so the surface and
 * the accuracy record are talking about the same event.
 *
 * The conjunction is also what makes this fail-closed for free, and it is worth naming
 * because it is the property the whole catch-up leans on: a node the diagnostic never
 * probed is absent from `placement_by_node`, absent reads as `0`, and `0` is below the
 * pass bar. So an era the instrument cannot see **cannot** fire. #386's structural finding
 * is the same argument from the other end — the conjunction *"multiplies the fail-open
 * probability down… harder the larger the era"*.
 *
 * ## ⚑ IT DEPENDS ON THE SHAPE OF THE PLACEMENT AND NEVER ON ITS SCOPE
 *
 * There is no node count, no `getNodesByScope` call and no era literal anywhere below.
 * The population is `ERA_SEQUENCE` and the evidence is whatever `placement_by_node`
 * happens to carry, so this module is correct at the six-node D1 walk shipping today and
 * correct unchanged the day the walk widens to the full in-product set. That is deliberate
 * and it is load-bearing: the widening is a live, separately-owned piece of work
 * (**O-TX3**, and **O-END1** behind it), and a module that assumed six nodes would need
 * editing on the day it landed.
 *
 * At today's D1-only scope the honest answer for almost every learner is *"nothing was
 * handed over"* — {@link eraPlacementFromSeed} returns an empty {@link EraPlacement.skipped}
 * and the catch-up has no work to do. `catchUpWalk.ts` treats that as the ordinary case
 * rather than as a degenerate one.
 */

function placementStates(placementByNode: Readonly<Record<string, number>>) {
  return Object.entries(placementByNode).map(([node_id, placement_estimate]) => ({
    node_id,
    placement_estimate,
  }));
}

/**
 * Whether an era's every node resolved `passed` — the event the accuracy record calls
 * `fires`, and the only thing that licenses handing an age over.
 *
 * An era with no evidence at all does not fire, because every absent node reads `0`.
 */
export function eraFires(
  eraId: EraId,
  placementByNode: Readonly<Record<string, number>>,
): boolean {
  return diagnosticEraIsMastered(eraId, placementStates(placementByNode));
}

/** How many of an era's nodes the diagnostic passed. Feeds the prompt, never a decision. */
export function eraPassedCount(
  eraId: EraId,
  placementByNode: Readonly<Record<string, number>>,
): number {
  return getEraOrThrow(eraId).nodes.filter(
    (nodeId) => (placementByNode[nodeId] ?? 0) >= DIAGNOSTIC_MASTERY_PLACEMENT_GATE,
  ).length;
}

/** What a completed pretest says about where this learner's game starts. */
export interface EraPlacement {
  /**
   * The age ordinary play begins in: the FIRST era the diagnostic did not clear, which is
   * §10.12's *"the first age with skills still to learn"*.
   *
   * At the end of the sequence there is no such age, so this holds the last era and
   * {@link clearedEverything} is what says so. A learner has to stand somewhere.
   */
  readonly placedEra: EraId;
  /**
   * The ages before {@link placedEra}, in play order — the ones the catch-up walks. **A
   * prefix of `ERA_SEQUENCE` by construction** (§10.9), so nothing downstream has to
   * represent a gap in the middle.
   */
  readonly skipped: readonly EraId[];
  /** The exact island prefix opened by placement, including the working destination. */
  readonly unlocked: readonly EraId[];
  /**
   * Every era fired, so the learner is placed past the whole sequence and
   * {@link placedEra} is the last age rather than the first unclear one. The k=9 case
   * §10.13 prices, and rare: #386 puts it at 0.2% of generated students.
   */
  readonly clearedEverything: boolean;
}

/**
 * Read a completed pretest's `placement_by_node` as an era placement.
 *
 * **The scan stops at the first era that does not fire**, and that is the prefix property
 * rather than an optimisation: D-ERA17 records that *"a student's knowledge may not be a
 * prefix of the sequence"*, so era four may well fire while era three does not. §10.9 rules
 * that the skipped set is a prefix anyway, because one founding cannot express a gap, and
 * the learner is handed the contiguous run and taught the rest. A scan that collected every
 * firing era would produce a set no ceremony can play.
 */
export function eraPlacementFromSeed(
  placementByNode: Readonly<Record<string, number>>,
): EraPlacement {
  const placement = diagnosticEraPlacement(placementStates(placementByNode));
  return {
    placedEra: placement.destinationEra,
    skipped: placement.masteredPrefix,
    unlocked: placement.unlockedPrefix,
    clearedEverything: placement.allMastered,
  };
}

/**
 * A placement seed that hands over exactly the first `count` ages, for a demo or a test
 * that needs to enter at a known point.
 *
 * **Derived from `ERA_SEQUENCE`, so it widens with the diagnostic.** It writes
 * {@link UNLOCK_PLACEMENT_THRESHOLD} rather than 3, which is the weaker of the two passing
 * grades and therefore the one that exercises the boundary the unlock rule actually reads.
 *
 * Nodes outside the handed-over ages are left absent rather than written as `0`, because
 * absent is what a real `placement_by_node` carries for a node the walk never probed and
 * the reader has to be correct about that case.
 */
export function seedPlacingAtEra(placedEra: EraId): Record<string, PlacementEstimate> {
  const handOver = ERA_SEQUENCE.slice(0, eraNumber(placedEra) - 1);
  const seed: Record<string, PlacementEstimate> = {};
  for (const era of handOver) {
    for (const nodeId of era.nodes) {
      seed[nodeId] = DIAGNOSTIC_MASTERY_PLACEMENT_GATE;
    }
  }
  return seed;
}
