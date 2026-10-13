import { type CitizenNodeInput, deriveCitizenRoster } from "@cr/game";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { CITIZEN_SKIN, citizenDress } from "../citizenDress";
import { vehicleForEra } from "../eraVehicles";
import { mix } from "../palette";
import { planVehicles } from "../vehicleRoutes";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "../worldLayout";
import { buildCitizenRig } from "./Citizens";
import { citizenPlaces } from "./citizenPlaces";
import { buildPersonBodyGeometry, PERSON_HEIGHT } from "./personFigure";
import { roadStackTop } from "./Roads";
import { ERA_ONE_PROP_TONES } from "./StarterIsland";
import { buildVehicleRig, HAULER_BODY_NAME, HAULER_HEAD_NAME } from "./Vehicles";

/**
 * **ONE PERSON, EVERYWHERE A PERSON IS DRAWN.**
 *
 * The team lead, from a running build: *"the person pulling the cart in era 1 doesnt
 * actually look like the other people it looks corrupted: just use the same model as you do
 * for hte normal people as you do for pulling the cart."*
 *
 * ## THIS FILE IS THE INSTANCE HE NAMED
 *
 * The cart-puller and an ordinary citizen, built and measured against each other. It is
 * written so that it cannot pass over a hauler built out of anything but the shared figure:
 * it compares the vertex buffers element for element, which is a stronger claim than "the
 * same height" and the only one a re-implementation cannot accidentally satisfy.
 *
 * **The CLASS is `personSize.test.ts`**, which #475 landed: a fourth construction arriving
 * later, swept over the whole app as the union of two derivations, with four named
 * exception lists asserted in both directions.
 *
 * This file used to be paired with a sweep of its own, written when neither that guard nor
 * the shared module existed on trunk. That sweep is deleted rather than merged, and the
 * reason is worth stating because "keep both, they cost nothing" is the tempting answer:
 * **two sweeps are two populations, and two populations drift.** #475's is also strictly
 * the better instrument — it reads the whole of `apps/web` rather than one directory, it
 * matches body parts on exact `UPPER_SNAKE` segments so `HEADER_HEIGHT` cannot trip it, and
 * it catches the RESCALE case (`PERSON_HEIGHT * 2.3`) that a declaration sweep is blind to
 * by construction. What is left here is the one thing it does not do: measure the hauler
 * against the crowd.
 *
 * **`Vehicles.tsx` was a NAMED EXCEPTION on that sweep**, excused as *"a cart with a driver
 * would be a second figure in the island's own units"*. It is a member now, and the
 * exemption did not have to be noticed to be removed: with this fix in place and the entry
 * still listed, `personSize.test.ts` failed at *"city/three/Vehicles.tsx now builds the
 * shared figure, so a cart has a driver and this excuse is stale"*.
 *
 * **And the FRAME is `cartPullerShots.browser.test.tsx`**, because *"does it read as one of
 * the people"* is a judgement about a rendered picture and no measurement here substitutes
 * for it (`.cursor/rules/qa-verification.mdc`: a spatial claim needs a frame, not a
 * dimension).
 */

const ERA_ONE = "prehistoric" as const;

/* ========================================================================== */
/* THE INSTANCE: the cart-puller, beside an ordinary citizen                  */
/* ========================================================================== */

/** A four-tile straight, which is exactly what one vehicle costs. */
const ROAD = Array.from({ length: 4 }, (_, i) => ({ col: i, row: 0 }));

function haulerRig(): { root: THREE.Group; surfaceY: number } {
  const plan = planVehicles(ROAD, vehicleForEra(ERA_ONE))[0];
  if (plan === undefined) {
    throw new Error("a four-tile road has to buy exactly one vehicle");
  }
  const surfaceY = roadStackTop(ERA_ONE);
  const rig = buildVehicleRig(plan, surfaceY, ERA_ONE);
  rig.root.position.set(0, surfaceY, 0);
  rig.root.rotation.y = 0;
  rig.root.updateMatrixWorld(true);
  return { root: rig.root, surfaceY };
}

function meshNamed(root: THREE.Object3D, name: string): THREE.Mesh {
  let found: THREE.Mesh | null = null;
  root.traverse((node) => {
    if (node.name === name) {
      found = node as THREE.Mesh;
    }
  });
  if (found === null) {
    throw new Error(`the built vehicle has no mesh named ${name}`);
  }
  return found;
}

/** The six era-one skill nodes, in registry order. */
const SKILL_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.5", "NUM.4"] as const;

/** The everyday crowd, on a settled era-one island: the people the hauler stands beside. */
function crowdRig() {
  const seed = 0x5eed;
  const nodes: CitizenNodeInput[] = SKILL_NODES.map((nodeId) => ({
    node_id: nodeId,
    citizen_role: "civic" as const,
    placed: true,
    mastery: 2 as const,
    lesson_stage: "done" as const,
    placement_estimate: 0 as const,
  }));
  const roster = deriveCitizenRoster({ nodes, seed });
  const placements: readonly PlacedTransform[] = defaultPlacements(
    [...SKILL_NODES],
    [],
    BUILDABLE_RADIUS,
  );
  return buildCitizenRig({
    roster,
    places: citizenPlaces({ roster, placements, hub: null, seed }),
    placements,
    eraId: ERA_ONE,
  });
}

/** Every vertex of a mesh, in the rig's own frame, so a claim is about the object drawn. */
function worldVertices(mesh: THREE.Mesh): THREE.Vector3[] {
  const position = mesh.geometry.getAttribute("position");
  const out: THREE.Vector3[] = [];
  for (let index = 0; index < position.count; index += 1) {
    out.push(
      new THREE.Vector3()
        .fromBufferAttribute(position as THREE.BufferAttribute, index)
        .applyMatrix4(mesh.matrixWorld),
    );
  }
  return out;
}

describe("the cart-puller is the same model as an ordinary citizen", () => {
  it("is built from the SAME vertex buffers, element for element", () => {
    // The strongest available form of "the same model". A height check passes for any
    // figure that happens to be 1.3u tall; this passes only for the shared builder's own
    // output, which is what the ruling asked for.
    const crowd = crowdRig();
    const hauler = haulerRig().root;

    for (const [name, crowdGeometry] of [
      [HAULER_BODY_NAME, crowd.bodies.geometry],
      [HAULER_HEAD_NAME, crowd.heads.geometry],
    ] as const) {
      const mine = meshNamed(hauler, name).geometry.getAttribute("position");
      const theirs = crowdGeometry.getAttribute("position");
      expect(mine.count, `${name} has a different vertex count from the crowd`).toBe(
        theirs.count,
      );
      // The floor: two empty buffers are equal, and an empty person is not a person.
      expect(mine.count, `${name} is an empty geometry`).toBeGreaterThan(30);
      expect(
        Array.from(mine.array as Float32Array),
        `${name} is not the crowd's own geometry`,
      ).toEqual(Array.from(theirs.array as Float32Array));
    }
  });

  it("stands ON the road, which the figure it replaced did not", () => {
    // THE DEFECT, MEASURED. The hauler used to hang off the sled group, which is tilted
    // nose-up and seated clear of the surface, and the hauler sits at the NOSE: its feet
    // came out 0.374u above the road, 29% of a person's standing height. A citizen's feet
    // are on the ground by construction and every posture in `Citizens.tsx` rotates about
    // the sole for exactly that reason.
    //
    // Measured off the VERTICES rather than off `Box3.setFromObject`, which takes the
    // transformed corners of a part's local box rather than its hull and therefore reports
    // a leaning figure as dipping below ground when it is standing on it.
    const { root, surfaceY } = haulerRig();
    const feet = Math.min(
      ...worldVertices(meshNamed(root, HAULER_BODY_NAME)).map((at) => at.y),
    );
    expect(feet - surfaceY, "the cart-puller's feet are off the road").toBeCloseTo(0, 2);
  });

  it("is a whole person tall, at the shared figure's height", () => {
    const { root, surfaceY } = haulerRig();
    const top = Math.max(
      ...worldVertices(meshNamed(root, HAULER_HEAD_NAME)).map((at) => at.y),
    );
    // Leaning into the pull costs a little height, exactly as the crowd's crisis hunch
    // does. What must not happen is a figure at some OTHER scale.
    const standing = top - surfaceY;
    expect(standing).toBeLessThanOrEqual(PERSON_HEIGHT);
    expect(standing).toBeGreaterThan(PERSON_HEIGHT * 0.9);
  });

  it("wears the era's cloth and skin, not the darkest prop tone it used to be", () => {
    // The other half of "corrupted": legs, torso and head were all `cord`, the darkest of
    // era one's four prop tones, where a citizen is cloth over skin. Asserted against the
    // crowd's own ramps rather than against literals, so a re-dress of era one moves both.
    const dress = citizenDress(ERA_ONE);
    const { root } = haulerRig();
    const body = meshNamed(root, HAULER_BODY_NAME).material as THREE.MeshStandardMaterial;
    const head = meshNamed(root, HAULER_HEAD_NAME).material as THREE.MeshStandardMaterial;

    expect(body.color.getHex()).toBe(mix(dress.cloth, dress.clothDeep, 0.5));
    expect(head.color.getHex()).toBe(mix(CITIZEN_SKIN.warm, CITIZEN_SKIN.deep, 0.5));
    // And they are two DIFFERENT colours, which is the thing a single flat tone was not.
    expect(body.color.getHex()).not.toBe(head.color.getHex());
    for (const tone of Object.values(ERA_ONE_PROP_TONES)) {
      expect(body.color.getHex(), "the hauler is still wearing a prop tone").not.toBe(tone);
      expect(head.color.getHex(), "the hauler's head is still a prop tone").not.toBe(tone);
    }
  });

  it("re-dresses with the era, because it reads the crowd's own table", () => {
    // Era one is the only authored vehicle, so this is checked on the FIGURE rather than
    // through the sled: an era with a different cut has to produce a different body, which
    // is what makes the per-era dressing a fact rather than an intention.
    const one = buildPersonBodyGeometry(citizenDress(ERA_ONE).cut);
    const three = buildPersonBodyGeometry(citizenDress("bronze_age").cut);
    expect(citizenDress("bronze_age").cut).not.toBe(citizenDress(ERA_ONE).cut);
    expect(three.getAttribute("position").count).not.toBe(
      one.getAttribute("position").count,
    );
  });
});
