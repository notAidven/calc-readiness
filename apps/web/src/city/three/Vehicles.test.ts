import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { vehicleForEra } from "../eraVehicles";
import { roadSurfacing } from "../roadSurfacing";
import { planVehicles, type VehiclePlan, vehiclePose } from "../vehicleRoutes";
import { GRID_CELL } from "../worldLayout";
import { roadStackTop } from "./Roads";
import { buildVehicleRig, poseVehicle, VEHICLE_OBJECT_NAME } from "./Vehicles";

/**
 * **THE BUILT OBJECT, MEASURED AGAINST THE DESIGN'S NUMBERS.**
 *
 * `vehicleRoutes.test.ts` holds the route and the rules. This holds the geometry, because a
 * dimension in `eraVehicles.ts` is a claim about a number and the bounding box of the thing
 * the renderer assembles is the object. §4.2's five sizes are only worth anything if the
 * mesh actually obeys them.
 *
 * Every case here was run red first, by growing the hauler past the declared height and by
 * seating the sled under the road instead of on it.
 */

const ERA_ONE: EraId = ERA_SEQUENCE[0]?.id as EraId;
const SURFACE_Y = roadStackTop(ERA_ONE);

/** A four-tile straight, which is exactly what one vehicle costs. */
const ROAD = Array.from({ length: 4 }, (_, i) => ({ col: i, row: 0 }));

function onlyPlan(): VehiclePlan {
  const plans = planVehicles(ROAD, vehicleForEra(ERA_ONE));
  const plan = plans[0];
  if (plan === undefined) {
    throw new Error("a four-tile road has to buy exactly one vehicle");
  }
  return plan;
}

/** The rig's bounding box in its OWN frame: heading zeroed, sitting at the origin. */
function bodyBox(): { box: THREE.Box3; plan: VehiclePlan } {
  const plan = onlyPlan();
  const rig = buildVehicleRig(plan, SURFACE_Y);
  rig.root.position.set(0, SURFACE_Y, 0);
  rig.root.rotation.y = 0;
  rig.root.updateMatrixWorld(true);
  return { box: new THREE.Box3().setFromObject(rig.root), plan };
}

describe("era one's hide sled, as built", () => {
  it("fits inside every size §4.2 gives it, and inside the road it wears", () => {
    const { box, plan } = bodyBox();
    const length = box.max.z - box.min.z;
    const width = box.max.x - box.min.x;
    const height = box.max.y - SURFACE_Y;

    // The form is what the design authored; the box is what the renderer built. Neither is
    // allowed to exceed the other.
    expect(length).toBeLessThanOrEqual(plan.form.length);
    expect(width).toBeLessThanOrEqual(plan.form.bodyWidth);
    expect(height).toBeLessThanOrEqual(plan.form.height);
    // ...and it is not so small it stops being the object: the gull's measured wing span
    // (2.64u) is the only ambient thing proven to read at this camera, so the sled is held
    // at least that long.
    expect(length).toBeGreaterThanOrEqual(2.6);
    expect(width).toBeGreaterThanOrEqual(1.0);
    expect(height).toBeGreaterThanOrEqual(1.2);
    // ...and it stays inside one 4u cell, so it reads as being ON a tile.
    expect(length).toBeLessThanOrEqual(GRID_CELL);

    // The width is measured against era one's TREAD, derived from the surfacing rather than
    // pinned: a dragged thing sits in the track it made.
    const treadWidth = Math.min(
      ...roadSurfacing(ERA_ONE)
        .courses.filter((course) => course.kind === "slab")
        .map((course) => course.widthFactor * GRID_CELL),
    );
    expect(width).toBeLessThanOrEqual(treadWidth);
  });

  it("rests ON the road surface: in contact, never floating and never sunk", () => {
    const { box } = bodyBox();
    const clearance = box.min.y - SURFACE_Y;
    // The runners are the contact (§4.2), so the lowest point is at the surface, within the
    // thickness of a pole. A positive clearance would be a sled hovering; a large negative
    // one would be a sled buried in its own road.
    expect(clearance).toBeLessThanOrEqual(0.08);
    expect(clearance).toBeGreaterThanOrEqual(-0.12);
  });

  it("casts and receives no shadow, on any of its parts", () => {
    const rig = buildVehicleRig(onlyPlan(), SURFACE_Y);
    let meshes = 0;
    rig.root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        meshes += 1;
        expect(mesh.castShadow, "a vehicle casts no shadow (§4.2)").toBe(false);
        expect(mesh.receiveShadow).toBe(false);
      }
    });
    // The floor: "no mesh casts a shadow" is satisfied by a rig with no meshes in it.
    expect(meshes).toBeGreaterThanOrEqual(8);
  });

  it("is named so a mounted scene can be searched for it", () => {
    expect(buildVehicleRig(onlyPlan(), SURFACE_Y).root.name).toBe(VEHICLE_OBJECT_NAME);
  });
});

describe("posing moves the vehicle and nothing inside it", () => {
  it("changes the root's place and heading only, so no part of it can spin", () => {
    // The nearest checkable form of era one's hard rule that there is NO WHEEL: a wheel has
    // to turn, and the only transform posing touches is the root's. Every child keeps the
    // local transform it was built with, at every time.
    const rig = buildVehicleRig(onlyPlan(), SURFACE_Y);
    const before: string[] = [];
    rig.root.traverse((node) => {
      if (node !== rig.root) {
        before.push(`${node.position.toArray()}|${node.rotation.toArray()}`);
      }
    });
    expect(before.length).toBeGreaterThanOrEqual(8);

    for (const t of [0.4, 3.7, 11.25, 60]) {
      poseVehicle(rig, t);
      const after: string[] = [];
      rig.root.traverse((node) => {
        if (node !== rig.root) {
          after.push(`${node.position.toArray()}|${node.rotation.toArray()}`);
        }
      });
      expect(after, `something inside the sled moved at t=${t}`).toEqual(before);
    }
    // The control: the ROOT does move, so the case above is not passing over a rig that
    // never went anywhere.
    poseVehicle(rig, 0);
    const start = rig.root.position.clone();
    poseVehicle(rig, 1.5);
    expect(rig.root.position.distanceTo(start)).toBeGreaterThan(0.5);
  });

  it("holds the same pose one whole out-and-back cycle later", () => {
    const plan = onlyPlan();
    const cycle = (2 * plan.length) / plan.form.speedUnitsPerSec;
    for (const t of [0, 1.3, 4.9]) {
      const a = vehiclePose(plan, t);
      const b = vehiclePose(plan, t + cycle);
      expect(b.x).toBeCloseTo(a.x, 6);
      expect(b.z).toBeCloseTo(a.z, 6);
      expect(b.headingY).toBeCloseTo(a.headingY, 6);
    }
  });

  it("seats the rig at t = 0 before any frame runs, which is the reduced-motion frame", () => {
    // R5: reduced motion holds a POSED STILL FRAME rather than removing the vehicle. The
    // component's `useFrame` returns early under it, so whatever `buildVehicleRig` seated is
    // what a learner with the preference set sees — and it has to be a real pose, not the
    // origin.
    const rig = buildVehicleRig(onlyPlan(), SURFACE_Y);
    const seated = vehiclePose(onlyPlan(), 0);
    expect(rig.root.position.x).toBeCloseTo(seated.x, 6);
    expect(rig.root.position.z).toBeCloseTo(seated.z, 6);
    expect(rig.root.position.y).toBeCloseTo(SURFACE_Y, 6);
    expect(Math.hypot(rig.root.position.x, rig.root.position.z)).toBeGreaterThan(0);
  });
});
