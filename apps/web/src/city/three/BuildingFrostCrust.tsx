import { useFrame } from "@react-three/fiber";
import { type RefObject, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import type { Footprint } from "../worldLayout";
import { frostShellModel } from "./frostStage";

/**
 * **THE DAMAGE CRUST, BANDED AGAINST THE HEIGHT THE BUILDING ACTUALLY RENDERS AT.**
 *
 * `frostStage.ts` owns what a crust looks like and knows nothing about how tall any particular
 * building is: it takes a height and returns a crust that is a fraction of it. This is the mount
 * that supplies the height, and it measures the LIVE model box rather than taking one off the
 * footprint, for exactly the reason `BuildingShield.tsx` measures for the storm roof and
 * `MasteryStars` measures for the star row. A node's building is whatever its GLB turned out to
 * be after the contain-fit, it changes as the node builds `site` to `construction` to `built`,
 * and it changes again mid-cross-fade.
 *
 * **A CONSTANT HERE IS THE DEFECT THIS COMPONENT EXISTS TO END.** The crust was sized against
 * `MAX_BUILD_HEIGHT`, which is a ceiling no era-one building comes within 14 units of, so the
 * stage-two crust was 2.56u on every building and swallowed the two that render under 2.2u
 * outright. `frostStage.ts`'s header carries the measurements and the ruling.
 *
 * ## WHY IT IS A `useState` AND NOT A PER-FRAME TRANSFORM
 *
 * The storm roof is LIFTED every frame, which is one number written onto a `position`. A crust is
 * RESIZED, which is geometry, and rebuilding a box per frame would allocate a mesh per frame for
 * a number that only moves when a build stage does. So the measurement runs every frame and the
 * geometry is rebuilt only when the height has really moved, by more than {@link HEIGHT_STEP}.
 * The one-shot completion pop scales the group this sits in, and the parent's own scale is
 * divided out below, so a pop cannot rebuild anything.
 */

/**
 * The smallest change in a measured height worth rebuilding a crust for, in world units.
 *
 * Coarser than `frostStage.ts`'s cache quantum, so a height that jitters around a quantum
 * boundary cannot rebuild on alternate frames, and fine enough that the shortest building era one
 * ships (1.828u) is measured to better than 2%.
 */
const HEIGHT_STEP = 0.03;

export function BuildingFrostCrust({
  footprint,
  stage,
  stages,
  measureRef,
}: {
  readonly footprint: Footprint;
  /** `winterDamageStage`'s reading for this building, out of `stages`. */
  readonly stage: number;
  readonly stages: number;
  /** The rendered model group whose live height the crust is a fraction of. */
  readonly measureRef: RefObject<THREE.Object3D | null>;
}) {
  const [height, setHeight] = useState(0);
  const anchorRef = useRef<THREE.Group>(null);
  const boundsRef = useRef(new THREE.Box3());
  const anchorPosRef = useRef(new THREE.Vector3());
  const anchorScaleRef = useRef(new THREE.Vector3());

  useFrame(() => {
    const target = measureRef.current;
    const anchor = anchorRef.current;
    if (!target || !anchor) {
      return;
    }
    boundsRef.current.setFromObject(target);
    if (!Number.isFinite(boundsRef.current.max.y)) {
      return;
    }
    // The box comes back in world units and the crust is built in the anchor's own, so the
    // anchor's world position and scale are divided out rather than ignored. Both reads refresh
    // the world matrix chain on the way past, which is why they are `getWorld*` calls.
    anchor.getWorldPosition(anchorPosRef.current);
    anchor.getWorldScale(anchorScaleRef.current);
    const scale = anchorScaleRef.current.y || 1;
    const measured = (boundsRef.current.max.y - anchorPosRef.current.y) / scale;
    if (measured > 0 && Math.abs(measured - height) > HEIGHT_STEP) {
      setHeight(measured);
    }
  });

  // Cloned per lot, the way `prepareModel` clones a stage template: the cache holds one shell
  // per footprint, stage and height, and two damaged buildings must not share an `Object3D`.
  const crust = useMemo(() => {
    const template = frostShellModel(footprint, stage, stages, height);
    return template ? template.clone(true) : null;
  }, [footprint, stage, stages, height]);

  return <group ref={anchorRef}>{crust && <primitive object={crust} />}</group>;
}
