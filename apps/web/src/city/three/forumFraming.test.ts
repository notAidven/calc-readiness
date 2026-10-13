import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  buildForum,
  FLOOR_ACROSS,
  FORUM_FURNITURE_NAME,
  SUCCESSION_CAMERA,
} from "../../succession/successionForum";
import { SUCCESSION_SCENARIOS } from "../../succession/successionScenarios";
import {
  SUCCESSION_FORUM,
  type SuccessionForum,
  successionStands,
} from "../../succession/successionStands";
import { successionView } from "../../succession/successionView";
import { applyCityFraming, type ViewOffsetCamera } from "./cityFraming";
import { forumCameraDistance, forumFraming } from "./forumFraming";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { buildCivicBuilding, CIVIC_FABRIC_NAME, FLOOR_NAME } from "./successionScene";

/**
 * **THE FORUM IS IN THE FRAME, AND THE DISC IT STANDS ON IS BEING USED.**
 *
 * Two claims the play-test frame failed, measured rather than asserted, because both are the
 * kind of thing a reviewer can only judge by eye and a reviewer's eye was busy elsewhere.
 *
 *  1. **Framing.** At 1024x580 the crisis panel leaves the canvas 624 wide, and the arc of
 *     districts ran off both sides of it: the composition's corners reached ndc x -2.2 and +2.8,
 *     so a player was looking at roughly the middle third of the forum. Nobody had noticed,
 *     because the lead's own window is more than twice as wide and frames far more of it — which
 *     is precisely why `.cursor/rules/qa-verification.mdc` insists a spatial claim names its
 *     viewport;
 *  2. **Spread.** *"It also needs to be spread out a lot more and not all cramped into this
 *     little batch."* {@link discReach} is what that sentence is worth as a number: the share of
 *     the paved disc with anything within a few paces of it. It was **54%** on the board in the
 *     play-test frame, which is the *"roughly two-thirds of the tan disc is empty"* the lead was
 *     looking at, and the floor below is set under where it now sits.
 *
 * ## THE FLOOR IS NOT THE INTERESTING HALF, AND THE CONTRAST IS
 *
 * A coverage floor passes the day it is written and drifts quietly downward afterwards, so
 * beside it this measures the OLD arrangement — the shipped layout with its sweep and reach put
 * back — and requires the two to be far apart. That makes the instrument's own sensitivity part
 * of the test: a metric that scored a cramped arc and a spread one the same would fail here
 * rather than certify the new one.
 */

/** The lead's own short laptop window, less the crisis panel's `min(400px, 44vw)`. */
const CANVAS = { width: 1024 - 400, height: 580 } as const;

/** The shipped camera, after `OrbitControls` clamps its locked tilt, with the frame on it. */
function shippedCamera(view: { width: number; height: number }): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    SUCCESSION_CAMERA.fov,
    view.width / view.height,
    1,
    900,
  );
  const target = new THREE.Vector3(...SUCCESSION_CAMERA.target);
  const spherical = new THREE.Spherical().setFromVector3(
    new THREE.Vector3(...SUCCESSION_CAMERA.position).sub(target),
  );
  spherical.phi = SUCCESSION_CAMERA.polar;
  camera.position.copy(target.clone().add(new THREE.Vector3().setFromSpherical(spherical)));
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  applyCityFraming(camera as unknown as ViewOffsetCamera, forumFraming({ view }), view);
  camera.updateProjectionMatrix();
  return camera;
}

/** Every placed object's world footprint. The floor is left out: it IS the disc. */
function footprints(forum: THREE.Group, districtsOnly = false): THREE.Box3[] {
  forum.updateMatrixWorld(true);
  const boxes: THREE.Box3[] = [];
  forum.traverse((node) => {
    const isDistrict = node.name.startsWith("succession-district-");
    if (!(node.name === FORUM_FURNITURE_NAME || isDistrict)) {
      return;
    }
    if (districtsOnly && !isDistrict) {
      return;
    }
    for (const object of node.children) {
      if (object.name === FLOOR_NAME) {
        continue;
      }
      const box = new THREE.Box3().setFromObject(object);
      if (!box.isEmpty()) {
        boxes.push(box);
      }
    }
  });
  return boxes;
}

/** How close a cell has to be to something before the paving there is doing any work. */
const NEAR = 4;

/**
 * **THE SHARE OF THE PAVED DISC WITH SOMETHING WITHIN {@link NEAR} OF IT.**
 *
 * Footprint coverage alone would be the wrong instrument: a forum's open square is SUPPOSED to
 * be open, and a measure that rewarded filling it would be pushing the layout toward the one
 * thing era four's brief refuses. What *"a pile in a car park"* actually describes is ground
 * with nothing anywhere near it, so that is what this counts.
 *
 * Only what stands ON the paving. A hull at anchor is not part of the composition the disc
 * carries, and counting one would let the anchorage flatter the figure.
 */
function discReach(forum: THREE.Group, districtsOnly = false, step = 0.5): number {
  const boxes = footprints(forum, districtsOnly).filter((box) => {
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    return Math.hypot(cx, cz) <= FLOOR_ACROSS;
  });
  let inside = 0;
  let near = 0;
  for (let x = -FLOOR_ACROSS; x <= FLOOR_ACROSS; x += step) {
    for (let z = -FLOOR_ACROSS; z <= FLOOR_ACROSS; z += step) {
      if (Math.hypot(x, z) > FLOOR_ACROSS) {
        continue;
      }
      inside += 1;
      const close = boxes.some((box) => {
        const dx = Math.max(box.min.x - x, 0, x - box.max.x);
        const dz = Math.max(box.min.z - z, 0, z - box.max.z);
        return Math.hypot(dx, dz) <= NEAR;
      });
      if (close) {
        near += 1;
      }
    }
  }
  return near / inside;
}

/** The furthest any corner of the composition strays outside the frame, in ndc. */
function worstOffFrame(
  forum: THREE.Group,
  camera: THREE.PerspectiveCamera,
): { readonly out: number; readonly what: string } {
  let worst = { out: 0, what: "nothing" };
  for (const box of footprints(forum)) {
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const ndc = new THREE.Vector3(x, y, z).project(camera);
          const out = Math.max(Math.abs(ndc.x), Math.abs(ndc.y));
          if (out > worst.out) {
            worst = { out, what: `${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}` };
          }
        }
      }
    }
  }
  return worst;
}

/** The six-ward board settled by hesitating — the board in the play-test screenshot. */
function playTestBoard(): THREE.Group {
  const scenario = SUCCESSION_SCENARIOS.find((entry) => entry.id === "suspended");
  if (!scenario) {
    throw new Error("no long-board scenario, so nothing here measures the reported board");
  }
  return buildForum(successionView(scenario.build()));
}

/**
 * **THE ARRANGEMENT AS IT SHIPPED BEFORE THIS PASS**, so the floors below have a control.
 *
 * The three numbers that were changed and nothing else, which is what makes the comparison a
 * measurement of the LAYOUT rather than of everything at once.
 */
const CRAMPED: SuccessionForum = {
  ...SUCCESSION_FORUM,
  reach: 13.5,
  sweep: 1.76,
  bearing: -0.88,
  setback: 7.4,
};

describe("the forum is framed, and the disc it stands on is used", () => {
  it("measures against the tilt the crisis actually locks", () => {
    /*
     * `groundRingOnScreen` reads `VILLAGE_CAMERA.polarAngle` directly rather than taking one,
     * and the Succession locks `OrbitControls` to its own. They are the same today and the whole
     * of `forumFraming.ts` is wrong the day they are not — silently, because the arithmetic
     * would keep returning a frame, just one for a camera nobody is looking through.
     */
    expect(SUCCESSION_CAMERA.polar).toBe(VILLAGE_CAMERA.polarAngle);
  });

  it("leaves the player's own zoom room on both sides of where it opens", () => {
    const distance = forumCameraDistance();
    expect(distance).toBeGreaterThan(FLOOR_ACROSS * SUCCESSION_CAMERA.nearRatio);
    expect(distance).toBeLessThan(FLOOR_ACROSS * SUCCESSION_CAMERA.farRatio);
  });

  it("holds the whole composition inside the frame at 1024x580", () => {
    const worst = worstOffFrame(playTestBoard(), shippedCamera(CANVAS));
    expect(
      worst.out,
      `a corner at ${worst.what} sits ${worst.out.toFixed(2)} outside the frame at ` +
        `${CANVAS.width}x${CANVAS.height}`,
    ).toBeLessThanOrEqual(1);
  });

  it("holds it at every window a reviewer is likely to use", () => {
    // Including the lead's own, which is where the defect was invisible: his canvas is half as
    // tall as it is wide and frames far more of the forum than a short laptop does.
    const windows = [
      { width: 1024 - 400, height: 580 },
      { width: 1440 - 400, height: 900 },
      { width: 2167 - 400, height: 1143 },
      { width: 1280 - 400, height: 360 },
    ] as const;
    const forum = playTestBoard();
    for (const view of windows) {
      const worst = worstOffFrame(forum, shippedCamera(view));
      expect(
        worst.out,
        `at ${view.width}x${view.height} a corner at ${worst.what} is ${worst.out.toFixed(2)} out`,
      ).toBeLessThanOrEqual(1);
    }
  });

  /**
   * **THE FRAMING IS DOING THE WORK**, forced red rather than argued: switch it off and the
   * same composition at the same camera runs off the same canvas.
   */
  it("fails to frame the same forum with the widening taken off", () => {
    const bare = new THREE.PerspectiveCamera(
      SUCCESSION_CAMERA.fov,
      CANVAS.width / CANVAS.height,
      1,
      900,
    );
    const target = new THREE.Vector3(...SUCCESSION_CAMERA.target);
    const spherical = new THREE.Spherical().setFromVector3(
      new THREE.Vector3(...SUCCESSION_CAMERA.position).sub(target),
    );
    spherical.phi = SUCCESSION_CAMERA.polar;
    bare.position.copy(target.clone().add(new THREE.Vector3().setFromSpherical(spherical)));
    bare.lookAt(target);
    bare.updateMatrixWorld(true);
    bare.updateProjectionMatrix();

    expect(
      worstOffFrame(playTestBoard(), bare).out,
      "the unframed camera holds the whole forum, so the widening is measuring nothing",
    ).toBeGreaterThan(1);
  });

  it("keeps something within a few paces of most of the paving", () => {
    const reach = discReach(playTestBoard());
    expect(
      reach,
      `only ${(reach * 100).toFixed(1)}% of the disc has anything near it`,
    ).toBeGreaterThan(0.9);
  });

  /**
   * **AND THE ARC IS DOING PART OF IT, which is worth separating out honestly.**
   *
   * Over the WHOLE composition the old arc scores 89.5% against the new one's 97.1%, and that
   * gap is small because most of the improvement is the disc coming in from 30 to 25 and the
   * avenue and the port filling the open side — none of which the arc did. Measured over the
   * DISTRICTS alone the arc's own contribution shows: 39.6% against 55.4%.
   *
   * Both figures are in the record deliberately. A floor on the first with no control under it
   * would let a future narrowing of the arc hide behind furniture spread round the rim.
   */
  it("spreads the districts themselves further than the arrangement it replaced", () => {
    const scenario = SUCCESSION_SCENARIOS.find((entry) => entry.id === "suspended");
    if (!scenario) {
      throw new Error("no long-board scenario");
    }
    const view = successionView(scenario.build());
    const now = discReach(buildForum(view), true);
    const then = discReach(buildForum(view, CRAMPED), true);
    expect(
      then,
      `the arc this replaced puts its districts within reach of ${(then * 100).toFixed(1)}% of ` +
        `the disc against ${(now * 100).toFixed(1)}%, which is not materially worse — so the ` +
        "measure cannot tell a spread arc from a cramped one",
    ).toBeLessThan(now - 0.1);
  });

  /**
   * **HOW MUCH OPEN PAVING TWO NEIGHBOURING CIVIC BUILDINGS LEAVE, which is the lead's sentence
   * turned into a distance.**
   *
   * *"All cramped into this little batch"* is, at bottom, six buildings 5.75 units across
   * sharing 37 units of frontage. The gap between two of them was **1.6 units** — under a third
   * of a building — and at 1024x580 that reads as one continuous mass of roof rather than as six
   * civic buildings. It is **4.2** now.
   *
   * The building's own width is measured off a built one rather than restated, so a change to
   * its bay count moves this with it instead of quietly eating the clearance.
   */
  it("leaves real paving between two neighbouring civic buildings", () => {
    const scenario = SUCCESSION_SCENARIOS.find((entry) => entry.id === "suspended");
    if (!scenario) {
      throw new Error("no long-board scenario");
    }
    const view = successionView(scenario.build());
    const ids = view.districts.map((district) => district.id);
    expect(ids.length, "the long board is not long").toBeGreaterThanOrEqual(6);

    /**
     * How wide one civic building's FRONTAGE really is, measured off a built one in its own
     * frame. The fabric rather than the whole group, which is what `CIVIC_FABRIC_NAME` exists
     * for — the claim post stands off the plot's corner and is not part of the outline — and
     * unrotated, because a world box of a building turned to face the middle of an arc is wider
     * than the building.
     */
    const one = buildCivicBuilding({ claim: "unclaimed", mark: null });
    const fabric = one.getObjectByName(CIVIC_FABRIC_NAME);
    expect(fabric, "a civic building has no fabric group to measure").toBeDefined();
    /*
     * `precise`, which is not a nicety here. The roof is a four-sided pyramid turned 45 degrees,
     * and the cheap path takes the geometry's own axis-aligned box and rotates THAT — which for
     * a 45-degree turn inflates a 6.55 box to 9.26 and reports a roof half again wider than the
     * building it is on. Every vertex, or the number is fiction.
     */
    const box = new THREE.Box3().setFromObject(fabric as THREE.Object3D, true);
    const across = box.max.x - box.min.x;
    expect(across, "no civic building was measured").toBeGreaterThan(4);

    const clearance = (forum: SuccessionForum): number => {
      const stands = successionStands(ids, forum);
      let tightest = Number.POSITIVE_INFINITY;
      for (let index = 1; index < stands.length; index += 1) {
        const here = stands[index - 1]?.civic;
        const next = stands[index]?.civic;
        if (!here || !next) {
          continue;
        }
        tightest = Math.min(
          tightest,
          Math.hypot(here.x - next.x, here.z - next.z) - across,
        );
      }
      return tightest;
    };

    const now = clearance(SUCCESSION_FORUM);
    expect(
      now,
      `neighbouring civic buildings leave ${now.toFixed(2)} of open paving between them`,
    ).toBeGreaterThan(3);
    // AND THE MEASURE CATCHES THE ARC THAT PROMPTED IT, so the floor is not a number that
    // happened to pass.
    const then = clearance(CRAMPED);
    expect(
      then,
      `the arc this replaced left ${then.toFixed(2)}, which this measure does not call cramped`,
    ).toBeLessThan(2);
  });
});
