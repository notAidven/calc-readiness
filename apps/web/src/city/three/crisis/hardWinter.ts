import type * as THREE from "three";

import { frostShellModel } from "../frostStage";
import { ruinedStageModel } from "../ruinStage";
import type { FrostFrontApproach } from "../winterFrostFront";
import { buildFrostFrontGroup, FROST_FRONT_NAME } from "../winterFrostFront";
import type { CrisisDamageOverlay, CrisisRuinTemplate } from "./buildingMark";
import type { CrisisPropagation } from "./propagation";

/**
 * **ERA ONE, FITTED TO THE FRAMEWORK. Nothing here re-implements the winter.**
 *
 * The Hard Winter is the only crisis that exists, so it is the only honest test of whether these
 * seams are the right shape. This file is that test: every value below is era one's SHIPPED
 * builder, bound to a framework type, so the fit is checked by the compiler and by
 * `crisisPropagationSeparation.test.ts` against the geometry the island actually draws — not by a
 * copy of the winter written to suit the framework.
 *
 * **A seam era one cannot fill through its own shipped code is a seam this pass got wrong**, and
 * the two places that happened are recorded rather than papered over:
 *
 *  - the propagation CARRIER holds no rung, because era one's rung is derived from its own snow
 *    course relief and cell dish and belongs to the winter (see `propagation.ts`);
 *  - `winterCourseTop` is still `WinterGround.tsx`'s and is not delegated to `ladder.ts`, because
 *    #407 is open over that file.
 *    `crisisLadder.test.ts` asserts the two agree rung for rung instead.
 */

/**
 * **WHAT ERA ONE'S PROPAGATION LAYER NEEDS TO DRAW ONE CELL OF THE FRONT.**
 *
 * This type is the demonstration that `TMark` is genuinely the crisis's. Every field is era one's
 * own vocabulary and none of it means anything to another crisis: `approach` is a pair of side
 * lists read off a cell's NEIGHBOURS, which is a question era four cannot ask because it has no
 * neighbours, and `topY` is a rung on a ladder era four does not stand on.
 */
export interface FrostFrontMark {
  /** The cell's centre in world X and Z (`cellCenter`). */
  readonly x: number;
  readonly z: number;
  /** The rung the front stands on, in world Y (`winterCourseTop(RUNG.frostNext)`). */
  readonly topY: number;
  /** Which sides carry the wall, and which the shards' heading is summed from. */
  readonly approach: FrostFrontApproach;
}

/**
 * **THE FROST, CREEPING, along tile adjacency, as a front advancing inward.**
 *
 * `build` is `buildFrostFrontGroup` with the mark unpacked and nothing else: the framework calls
 * it and never looks inside, which is what *"the propagation layer must be a thing each crisis
 * supplies entirely"* means when it is written down as code rather than as an intention.
 *
 * The one-word read is **creeping** and the player's job is to WATCH AN EDGE, which is why the
 * layer's own file spends its length on a boundary rather than on a patch: *"a cell on its own
 * cannot see one"*.
 */
export const HARD_WINTER_PROPAGATION: CrisisPropagation<FrostFrontMark> = {
  read: "creeping",
  job: "watch-an-edge",
  topology: {
    kind: "tile-adjacency",
    advance: "inward-from-the-rim",
    frontSubject: "cell-boundary",
  },
  layer: {
    kind: "built",
    carrier: { kind: "ground-course" },
    markName: FROST_FRONT_NAME,
    build: (mark: FrostFrontMark): THREE.Group =>
      buildFrostFrontGroup(mark.x, mark.z, mark.topY, mark.approach),
  },
};

/**
 * Era one's damage overlay, bound to the shared contract.
 *
 * An assignment and not a wrapper, deliberately: a wrapper would let the two signatures drift and
 * still compile, and the whole value of this line is that it stops compiling if they do.
 */
export const HARD_WINTER_DAMAGE_OVERLAY: CrisisDamageOverlay = frostShellModel;

/** Era one's ruin, bound the same way. */
export const HARD_WINTER_RUIN: CrisisRuinTemplate = ruinedStageModel;
