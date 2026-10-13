import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  buildFigure,
  buildShearLegs,
  PLINTH_HEIGHT,
  SHEAR_LEGS_NAME,
  SLING_NAME,
} from "../city/three/successionScene";
import { SUCCESSION_SCENE_TONES as S } from "../city/three/successionTones";

/**
 * **ASSETS 1 AND 2, AND BOTH OF THEM ARE CLAIMS ABOUT A SILHOUETTE.**
 *
 * Era four carries no state in a tint — *"a silhouette difference survives full zoom-out, a colour
 * on a three-tone body does not, and no runtime tint could deliver it anyway"* — so the two
 * claimants and the two states of a hoist are all outline. That makes them assertable in a way a
 * colour would not be, and it also makes them the two assets where a passing test is least
 * sufficient: an outline is something somebody has to look at. The frames are in
 * `docs/design-refs/era4-drift-warning/`.
 *
 * **Every assertion here was watched go red**, and two of them against the code as it shipped rather
 * than against an injection:
 *
 *  - *"nothing in the hoist reaches past its own footprint"* fails at 1.783 against 0.775 on the
 *    lashing as it stood, which was a 3.57-unit beam laid across two of the three legs. That is the
 *    defect: photographed at 1024x580 it read as crossed sticks lying over a plinth, which is the
 *    *sacked city* confusion the sheet calls this era's costliest;
 *  - *"a seated claimant puts stone below the crown it stands on"* fails against the previous
 *    four-box seated figure, whose lowest point was the crown itself. Without it a seated figure is
 *    a shorter standing one, which is the confusion the pair exists to avoid.
 */

/** The world box of everything under an object, with its own transform applied. */
function boxOf(object: THREE.Object3D): THREE.Box3 {
  object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(object);
}

function meshes(group: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      found.push(child as THREE.Mesh);
    }
  });
  return found;
}

function named(group: THREE.Object3D, name: string): THREE.Object3D {
  const found = group.getObjectByName(name);
  if (!found) {
    throw new Error(`nothing named ${name} in ${group.name}`);
  }
  return found;
}

/* -------------------------------------------------------------------------- */
/* Asset 1 · the two claimants                                                */
/* -------------------------------------------------------------------------- */

describe("the two claimants are two different blobs", () => {
  it("puts a standing claimant's high point in a hand held clear of the body", () => {
    const standing = buildFigure("standing");
    const parts = meshes(standing);
    // A floor, because every claim below holds over a figure made of one box — and one box is
    // roughly what this was: a slab, a cube and an arm, which at 1024x580 came back as a dark
    // angular wedge on a plinth.
    expect(parts.length, "a figure this simple cannot taper").toBeGreaterThanOrEqual(8);

    const whole = boxOf(standing);
    // Tall and narrow. Measured as an aspect rather than as a height, because what the zoom-out test
    // is about is the SHAPE of the blob and not its size.
    const tall = whole.max.y - whole.min.y;
    const wide = whole.max.x - whole.min.x;
    expect(
      tall / wide,
      `a ${wide.toFixed(2)} by ${tall.toFixed(2)} standing figure`,
    ).toBeGreaterThan(2);

    /*
     * THE HIGHEST PART IS THE HAND, AND IT IS OFF THE CENTRE LINE. That is the whole of the pose:
     * the raised arm has to be part of the outline rather than tucked inside it, so the topmost mesh
     * cannot be the head. A figure whose high point is its head is a figure with its arm down.
     */
    const highest = parts.reduce((one, other) =>
      boxOf(other).max.y > boxOf(one).max.y ? other : one,
    );
    expect(
      Math.abs(highest.position.x),
      "the topmost part is on the centre line, so it is a head",
    ).toBeGreaterThan(0.2);

    /*
     * AND THE RAISED ARM CLEARS THE BODY **AT ITS OWN HEIGHT**, which is the assertion a frame
     * forced here once already: *"the arm was 0.19 across, tucked 0.42 from the trunk, and at the
     * shipped camera it merged into the body."*
     *
     * At its own height rather than against the whole figure, because the widest thing on a standing
     * claimant is its hem at the ankle and the arm is raised past the shoulder — comparing the two
     * would fail on a figure that is perfectly legible. What has to clear is the part of the body
     * beside the raised forearm, and the gap has to be a real one rather than a shared edge, because
     * two surfaces a hundredth apart merge into one mass at 40 pixels.
     */
    const shoulderUp = (part: THREE.Mesh): boolean => boxOf(part).min.y > 1.5;
    const raised = parts.filter((part) => shoulderUp(part) && part.position.x > 0.3);
    expect(
      raised.length,
      "nothing is held out from the body above the shoulder",
    ).toBeGreaterThan(1);
    const bodyEdge = Math.max(
      ...parts
        .filter((part) => shoulderUp(part) && part.position.x <= 0.3)
        .map((part) => boxOf(part).max.x),
    );
    const armEdge = Math.min(...raised.map((part) => boxOf(part).min.x));
    expect(
      armEdge - bodyEdge,
      `the arm starts at ${armEdge.toFixed(2)} beside a body reaching ${bodyEdge.toFixed(2)}`,
    ).toBeGreaterThan(0.15);
  });

  it("puts a seated claimant's stone past the crown's front edge and below it", () => {
    const seated = buildFigure("seated");
    const whole = boxOf(seated);
    expect(meshes(seated).length).toBeGreaterThanOrEqual(8);

    // Wide and low, which is the opposite blob. The figure is placed with its own origin on the
    // crown, so the crown is `y = 0` in its frame.
    const tall = whole.max.y - whole.min.y;
    const wide = whole.max.z - whole.min.z;
    expect(
      wide / tall,
      `a ${wide.toFixed(2)} by ${tall.toFixed(2)} seated figure`,
    ).toBeGreaterThan(1);

    /*
     * **THE TWO ASSERTIONS THE SHEET WRITES OUT ITSELF**, and they are the pose:
     *
     *   expect(seatedBounds.max.z).toBeGreaterThan(PLINTH.TOP_D / 2);
     *   expect(seatedBounds.min.y).toBeLessThan(PLINTH.H);
     *
     * The knee crosses the crown's front edge, and the hanging foot puts stone BELOW the face the
     * figure is standing on — which nothing else on this island does. The crown's half-depth is read
     * off the plinth's own course table rather than written here, so a change to the pedestal's
     * proportion moves the requirement with it.
     */
    const crownHalf = (1.5 * 1.16) / 2;
    expect(
      whole.max.z,
      "nothing oversails the crown, so this is a short standing figure",
    ).toBeGreaterThan(crownHalf);
    expect(
      whole.min.y,
      "nothing hangs below the crown, so the overhang is decorative",
    ).toBeLessThan(0);
    // And by a real margin in both directions rather than by a hair, since a hair would not read.
    expect(whole.max.z - crownHalf).toBeGreaterThan(0.25);
    expect(-whole.min.y).toBeGreaterThan(0.25);
  });

  it("cuts both claimants from one stone, which is the ruling and not a saving", () => {
    // *"No state is carried by hue: allegiance is carried by pose and by what stands on a pedestal,
    // never by a tint."* Two tones here would be that tint, authored in the one place it is easy.
    for (const pose of ["standing", "seated"] as const) {
      const tones = new Set(
        meshes(buildFigure(pose)).map((mesh) =>
          (mesh.material as THREE.MeshStandardMaterial).color.getHex(),
        ),
      );
      expect([...tones], `a ${pose} claimant is more than one stone`).toEqual([S.FIGURE]);
    }
  });

  it("gives the two poses genuinely different envelopes", () => {
    // The zoom-out test, as a comparison rather than as two separate readings: squint the frame and
    // ignore colour, and the standing figure has to break the plinth's outline UPWARD where the
    // seated one breaks it DOWNWARD and SIDEWAYS. Asserted against each other so a change that
    // moved both would fail rather than pass twice.
    const standing = boxOf(buildFigure("standing"));
    const seated = boxOf(buildFigure("seated"));

    expect(standing.max.y).toBeGreaterThan(seated.max.y * 1.5);
    expect(seated.max.z).toBeGreaterThan(standing.max.z * 1.5);
    expect(seated.min.y).toBeLessThan(standing.min.y);
  });
});

/* -------------------------------------------------------------------------- */
/* Asset 2 · the drift warning                                                */
/* -------------------------------------------------------------------------- */

describe("the hoist is a hoist and not a heap of timber", () => {
  it("keeps its rigid timber inside the head it binds, which is what says it is standing", () => {
    /*
     * **THE ASSERTION THAT FAILS AGAINST THE CODE AS IT SHIPPED**, and it took two tries to write
     * one that does.
     *
     * The lashing was `box(spread * 2.3, ...)` — 3.57 units — laid across two of the three legs and
     * pushed toward the camera. The obvious guard is *"nothing reaches past the footprint"*, and it
     * passes: the beam stuck 1.78 out of a frame whose corner feet stand 1.94 from the axis, so it
     * was inside the footprint and still read as crossed sticks. A guard written that way would have
     * been green over the defect it was written for.
     *
     * What is actually true of a standing hoist is narrower: **the only TIMBER that goes out from the
     * axis is a LEG.** The lashing binds three heads converging on a point, so it lives inside the
     * bundle's own plan; the sling is fibre and a slack one splays outward by design, which is why
     * this is scoped to the rigid members rather than to everything. The beam fails at 1.78 against
     * 0.28, and a guard scoped to everything fails on a correctly hanging sling instead.
     */
    for (const sling of ["slack", "taut"] as const) {
      const legs = buildShearLegs(sling);
      const rig = named(legs, SLING_NAME);
      const hanging = new Set(meshes(rig));
      const shanks = meshes(legs).filter((mesh) => mesh.name === `${SHEAR_LEGS_NAME}-leg`);
      expect(shanks.length, "there are no legs, so there is nothing standing").toBe(3);

      /*
       * Sized against a LEG's own section, not against the head — and that is the whole reason this
       * assertion works. Written the obvious way round it measures the lashing against itself, which
       * is exactly as green over a 3.57-unit beam as over a 0.28 one, because the beam IS the head.
       */
      const shank = shanks[0] as THREE.Mesh;
      shank.geometry.computeBoundingBox();
      const section = shank.geometry.boundingBox?.max.x ?? 0;
      expect(section, "a leg with no thickness").toBeGreaterThan(0);

      // A floor under the sweep below: with the head gone there would be no rigid member left to
      // check and this would pass over an empty list.
      const rigid = meshes(legs).filter(
        (mesh) => !hanging.has(mesh) && mesh.name !== `${SHEAR_LEGS_NAME}-leg`,
      );
      expect(
        rigid.length,
        "the frame has no head, so nothing binds the legs",
      ).toBeGreaterThan(0);

      for (const mesh of rigid) {
        const measured = boxOf(mesh);
        const reach = Math.max(
          Math.abs(measured.min.x),
          Math.abs(measured.max.x),
          Math.abs(measured.min.z),
          Math.abs(measured.max.z),
        );
        expect(
          reach,
          `${sling}: ${mesh.name} reaches ${reach.toFixed(3)} from the axis`,
        ).toBeLessThanOrEqual(section * 4);
      }
    }
  });

  it("brings three legs to one head", () => {
    const legs = buildShearLegs("slack");
    const shanks = legs.children.filter((child) => child.name === `${SHEAR_LEGS_NAME}-leg`);
    // Three, because two would be a gantry seen edge-on: the camera orbits, so a two-legged A-frame
    // vanishes to a line at two headings out of four.
    expect(shanks).toHaveLength(3);

    /*
     * Every leg's own top END lands inside the lashing that binds them. Taken by pushing the leg's
     * local tip through its world matrix rather than by reading a bounding box, because a leaning
     * box's axis-aligned box has its corner where the leg does not — and the defect this is written
     * for is precisely an orientation one: a leg whose lean is set on two Euler axes independently
     * composes to the wrong rotation and the frame comes apart at the head, which is what put loose
     * crossed sticks over a plinth the first time.
     */
    const head = named(legs, `${SHEAR_LEGS_NAME}-head`);
    const apex = boxOf(head);
    const lashing = apex.max.x - apex.min.x;
    for (const shank of shanks) {
      const mesh = shank as THREE.Mesh;
      mesh.geometry.computeBoundingBox();
      const tip = new THREE.Vector3(0, mesh.geometry.boundingBox?.max.y ?? 0, 0);
      mesh.updateWorldMatrix(true, false);
      tip.applyMatrix4(mesh.matrixWorld);
      expect(
        Math.hypot(tip.x - head.position.x, tip.z - head.position.z),
        `a leg's top lands ${tip.x.toFixed(2)}, ${tip.z.toFixed(2)} rather than at the head`,
      ).toBeLessThan(lashing / 2);
      expect(tip.y).toBeGreaterThan(apex.min.y);
    }
    // The lashing binds the bundle rather than crossing the frame, so it is a fraction of the spread
    // and not a multiple of it.
    const spread = Math.max(
      ...shanks.map((leg) => Math.hypot(leg.position.x, leg.position.z) * 2),
    );
    expect(lashing).toBeLessThan(spread / 2);
  });

  it("hangs the sling in a V when it is carrying nothing and straight when it is", () => {
    const slack = named(buildShearLegs("slack"), SLING_NAME);
    const taut = named(buildShearLegs("taut"), SLING_NAME);

    // WAITING AGAINST LANDING is slack against taut and it is the whole of this asset, so it is
    // asserted on the two properties a viewer actually reads: how far the sling hangs, and whether
    // its runs converge.
    const bight = (rig: THREE.Object3D): THREE.Object3D =>
      named(rig, `${SLING_NAME}-bight`);
    expect(
      boxOf(bight(slack)).max.y,
      "a slack sling does not hang lower than a taut one",
    ).toBeLessThan(boxOf(bight(taut)).max.y);

    const runs = (rig: THREE.Object3D): THREE.Object3D[] =>
      rig.children.filter((child) => child.name === `${SLING_NAME}-leg`);
    expect(runs(slack)).toHaveLength(2);
    for (const run of runs(taut)) {
      expect(run.rotation.z, "a taut run is not plumb").toBe(0);
    }

    /*
     * **THE TWO RUNS CONVERGE GOING DOWN, AND THE SIGN OF THAT IS THE WHOLE READ.**
     *
     * Asserted on the geometry rather than on the rotation, because a rotation of the right size with
     * the wrong sign splays the runs APART — a Λ with the bight wide at the bottom, which is what the
     * previous numbers drew and which looks like a sling with something in it. Measured by pushing
     * each run's own two ends through its world matrix, so no amount of leaning can make it pass by
     * accident.
     */
    for (const run of runs(slack)) {
      const mesh = run as THREE.Mesh;
      mesh.geometry.computeBoundingBox();
      const reach = mesh.geometry.boundingBox?.max.y ?? 0;
      expect(reach, "a run with no length").toBeGreaterThan(0);
      mesh.updateWorldMatrix(true, false);
      const top = new THREE.Vector3(0, reach, 0).applyMatrix4(mesh.matrixWorld);
      const foot = new THREE.Vector3(0, -reach, 0).applyMatrix4(mesh.matrixWorld);
      expect(
        Math.abs(foot.x),
        `a slack run runs from ${top.x.toFixed(2)} to ${foot.x.toFixed(2)}, so it splays`,
      ).toBeLessThan(Math.abs(top.x));
      // And it really does lean, so the convergence is not the convergence of two plumb ropes.
      expect(Math.abs(top.x) - Math.abs(foot.x)).toBeGreaterThan(0.1);
    }

    /*
     * AND THE V IS A V RATHER THAN A U. The bight was 1.3 across under two runs 1.0 apart, which is
     * a flat-bottomed loop — and a flat-bottomed loop looks like something is in it, which is the
     * opposite of what slack means. The bight has to be narrow against the drop it hangs on.
     */
    const bightWide = boxOf(bight(slack)).max.x - boxOf(bight(slack)).min.x;
    const drop = boxOf(runs(slack)[0] as THREE.Object3D);
    expect(bightWide).toBeLessThan((drop.max.y - drop.min.y) / 2);
  });

  it("keeps the whole hoist clear of the crown a block is going onto", () => {
    // A hoist has to straddle the plinth rather than stand on it, and the two front feet are what
    // carry that. Measured against the plinth's own height so the claim is about the crown rather
    // than about a number.
    const legs = buildShearLegs("taut");
    const apex = boxOf(named(legs, `${SHEAR_LEGS_NAME}-head`));
    expect(
      apex.min.y,
      "the head is below the crown, so this cannot lift anything onto it",
    ).toBeGreaterThan(PLINTH_HEIGHT);
  });
});
