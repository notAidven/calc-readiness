import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { frostCrustHeight, MAX_SHELL_RATIO } from "../frostStage";
import {
  CRISIS_BADGE_SLOT,
  CRISIS_OVERLAY_MAX_SHARE,
  CRISIS_RUIN_MAX_SCAFFOLD_SHARE,
  crisisBadgeLocalY,
  crisisMeasuredRooflineY,
} from "./buildingMark";
import { HARD_WINTER_DAMAGE_OVERLAY, HARD_WINTER_RUIN } from "./hardWinter";

/**
 * **THE SLOT ABOVE THE ROOFLINE IS SHARED; WHAT SITS IN IT IS NOT.**
 *
 * `CrisisStatusMarker.tsx` now reads its badge height through this seam rather than computing it,
 * so the first thing to prove is that it computes the SAME height. Era one's badge has to be where
 * it always was — 2.4 world units above whatever the building actually measures, with the stars'
 * own fallback of 6 until it measures at all.
 */

describe("the slot is era one's, unchanged", () => {
  it("keeps the shipped margin and fallback", () => {
    expect(CRISIS_BADGE_SLOT.margin).toBe(2.4);
    expect(CRISIS_BADGE_SLOT.fallbackTopY).toBe(6);
  });

  it("reproduces the arithmetic the marker used to do inline", () => {
    // `worldTop - parentY + MARKER_MARGIN`, which is the line this replaced.
    expect(crisisBadgeLocalY(9.769, 0)).toBeCloseTo(9.769 + 2.4, 10);
    expect(crisisBadgeLocalY(2.608, 1.2)).toBeCloseTo(2.608 - 1.2 + 2.4, 10);
    // Negative parents work too: a building on ground below the surface still gets a badge over
    // its own roof rather than over the world origin.
    expect(crisisBadgeLocalY(4, -1)).toBeCloseTo(5 + 2.4, 10);
  });
});

describe("the roofline is measured, never assumed", () => {
  const box = new THREE.Box3();

  it("falls back only when there is nothing to measure", () => {
    expect(crisisMeasuredRooflineY(null, box)).toBe(CRISIS_BADGE_SLOT.fallbackTopY);
  });

  it("falls back on an empty group, whose bounds are not finite", () => {
    // `Box3.setFromObject` over a group with no geometry leaves the box empty, so `max.y` is
    // -Infinity. A badge placed at -Infinity is a badge nobody ever sees, and the guard is what
    // stops the fallback branch being deleted as unreachable.
    expect(crisisMeasuredRooflineY(new THREE.Group(), box)).toBe(
      CRISIS_BADGE_SLOT.fallbackTopY,
    );
  });

  it("reads the real roofline of a measurable building", () => {
    const building = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4));
    mesh.position.y = 1.5;
    building.add(mesh);
    building.updateMatrixWorld(true);
    expect(crisisMeasuredRooflineY(building, box)).toBeCloseTo(3, 6);
  });

  it("rides above whatever the crisis ADDED to the building, not above the model", () => {
    // The property `CrisisStatusMarker.tsx` calls the other half of a deliberately split pair: a
    // shielded building's badge has to clear its storm roof. Measured off the group holding both.
    const building = new THREE.Group();
    const model = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4));
    model.position.y = 1.5;
    building.add(model);
    building.updateMatrixWorld(true);
    const bare = crisisMeasuredRooflineY(building, box);

    const stormRoof = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 5));
    stormRoof.position.y = 3.3;
    building.add(stormRoof);
    building.updateMatrixWorld(true);
    const shielded = crisisMeasuredRooflineY(building, box);

    expect(shielded).toBeGreaterThan(bare);
    expect(crisisBadgeLocalY(shielded, 0)).toBeGreaterThan(crisisBadgeLocalY(bare, 0));
  });
});

describe("era one's damage and ruin bind to the shared contracts", () => {
  it("keeps the frost crust inside the shared overlay ceiling on every building height", () => {
    // Swept over heights a building could render at rather than over the seven era one ships, so
    // the ceiling is a property of the banding and not of this island's current catalogue. Era
    // one's own ratio is 0.4; the shared ceiling is where `frostStage.ts` says its browser guard
    // sits, which leaves a second crisis room to spend more and still owe the silhouette.
    expect(MAX_SHELL_RATIO).toBeLessThan(CRISIS_OVERLAY_MAX_SHARE);
    let checked = 0;
    for (let height = 0.5; height <= 24; height += 0.25) {
      for (const stage of [1, 2, 3]) {
        expect(
          frostCrustHeight(height, stage, 3),
          `${height}u stage ${stage}`,
        ).toBeLessThan(height * CRISIS_OVERLAY_MAX_SHARE);
        checked += 1;
      }
    }
    // A floor, because a sweep over an empty range passes.
    expect(checked).toBeGreaterThan(200);
  });

  it("returns nothing for an unmeasured building rather than picking a height", () => {
    const footprint = { w: 2, d: 2 } as const;
    expect(HARD_WINTER_DAMAGE_OVERLAY(footprint, 1, 3, 0)).toBeNull();
    expect(HARD_WINTER_DAMAGE_OVERLAY(footprint, 0, 3, 4)).toBeNull();
    // And it does draw something when it can, or the two nulls above prove nothing.
    expect(HARD_WINTER_DAMAGE_OVERLAY(footprint, 1, 3, 4)).not.toBeNull();
  });

  it("gives a ruin real volume, because the click target IS the geometry", () => {
    // The one thing crisis damage may not do is take a node's lesson away from the pointer.
    const ruin = HARD_WINTER_RUIN({ w: 2, d: 2 });
    const box = new THREE.Box3().setFromObject(ruin);
    const size = box.getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(0);
    expect(size.y).toBeGreaterThan(0);
    expect(size.z).toBeGreaterThan(0);
    expect(CRISIS_RUIN_MAX_SCAFFOLD_SHARE).toBeLessThan(1);
  });
});
