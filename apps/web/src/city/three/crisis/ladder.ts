import type { EraId } from "@cr/skill-graph";

import { roadStackTop } from "../Roads";
import { GROUND_DECAL_STEP } from "../StarterIsland";

/**
 * **THE SHARED GROUND-DECAL DEPTH LADDER, CONTINUED PAST THE ROADS FOR ANY CRISIS.**
 *
 * `crises/README.md` calls it *"the cheapest place in the whole renderer to put new art"*, and it
 * is: flat things laid on the ground do not fight for depth because they sit on one uniform
 * ladder of `GROUND_DECAL_STEP` rungs, continued through the island's own decals, then the road
 * stack, then the crisis. This is that continuation, with the era it is continuing from as a
 * parameter instead of era one's constant.
 *
 * ## WHY THIS IS GENUINELY SHARED, AND THE ONE PLACE THE HYPOTHESIS WAS WRONG
 *
 * Shared because the defect it prevents is a property of the renderer: `Roads.tsx`'s own note and
 * `depthPrecision.test.ts` record what happens when a second layer starts a second ladder over
 * one ground plane, and any crisis that lays ground art can make that mistake in exactly the same
 * way. `winterCourseTop` already derives itself from `roadStackTop(CURRENT_ERA_ID)`, so era one
 * is not a special case of this — it is this, with one era substituted in.
 *
 * **But it is not universal, and the starting hypothesis said it would be.** Checked against the
 * three unbuilt briefs rather than assumed:
 *
 *  - **era six** lays link bands, per link rather than per cell — on the ladder;
 *  - **era nine** lays lifted covers and duct-marker collars — on the ladder;
 *  - **era four lays no ground layer at all.** `crises/README.md`'s per-era reach table calls it
 *    *"the only one of the nine that lays no ground layer"*, and `era-04-succession-crisis.md`
 *    §2.2 makes it a ruling rather than an oversight: a fill *"would cover the paving, which is
 *    the era's whole ground identity, and it would make the board read as a map rather than as a
 *    city"*, and era four's buildable radius of 43 against a drawn grass radius of 30 means a
 *    per-cell layer would paint past the drawn island anyway.
 *
 * So the ladder is a seam a crisis MAY take and not one it must, which is why
 * {@link CrisisGroundLadder} is handed to a propagation layer rather than assumed by one, and why
 * a crisis's registry entry states `usesGroundLadder` rather than leaving it implied.
 *
 * ## WHAT IS OWED HERE AND DELIBERATELY NOT DONE
 *
 * `winterCourseTop` still lives in `WinterGround.tsx` and still computes this itself.
 * **#407 is open over that file**, so
 * moving it would be editing an open pull request's source. `crisisLadder.test.ts` instead
 * asserts that the two agree rung for rung, which proves the extraction is correct without making
 * it; the one-line delegation is owed once #407 lands.
 */

/**
 * Where crisis course `index` (0 = lowest) puts its top face in world Y, for one era.
 *
 * `roadStackTop(eraId)` is the highest face the roads present in that era, so an era that
 * surfaces its roads with more courses pushes its crisis layer up with it and a crisis can never
 * end up underneath the roads it is falling on.
 */
export function crisisCourseTop(eraId: EraId, index: number): number {
  return roadStackTop(eraId) + (index + 1) * GROUND_DECAL_STEP;
}

/**
 * The ladder handed to a crisis's own propagation layer, so the layer never computes a rung.
 *
 * A value object rather than a loose function because the two things a layer needs are the rung
 * arithmetic AND the step, and a layer that reached for `GROUND_DECAL_STEP` itself is one edit
 * away from inventing a rung between two of them.
 */
export interface CrisisGroundLadder {
  /** The era whose road stack this ladder continues from. */
  readonly eraId: EraId;
  /** One rung, in world units. Uniform across the whole island by construction. */
  readonly step: number;
  /** Where rung `index` puts its top face, in world Y. */
  readonly top: (index: number) => number;
}

/** The ladder for one era. */
export function crisisGroundLadder(eraId: EraId): CrisisGroundLadder {
  return {
    eraId,
    step: GROUND_DECAL_STEP,
    top: (index: number) => crisisCourseTop(eraId, index),
  };
}
