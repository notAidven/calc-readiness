import { cityRosterNodeIds, FIRST_ERA_ID } from "@cr/game";
import { ERA_SEQUENCE, type EraId, getEraNodes } from "@cr/skill-graph";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  D1_NODE_BUILDINGS,
  ERA_EIGHT_NODE_BUILDINGS,
  ERA_FIVE_NODE_BUILDINGS,
  ERA_FOUR_NODE_BUILDINGS,
  ERA_NINE_NODE_BUILDINGS,
  ERA_SEVEN_NODE_BUILDINGS,
  ERA_TEN_NODE_BUILDINGS,
  ERA_THREE_NODE_BUILDINGS,
  ERA_TWO_NODE_BUILDINGS,
  resolveBuildingModel,
} from "../buildingAssets";
import type { BuildStage } from "../palette";
import { type Footprint, footprintFor, MAX_BUILD_HEIGHT } from "../worldLayout";
import {
  NEUTRAL_BUILT_TONES,
  neutralBuiltModel,
  neutralConstructionModel,
  neutralSiteModel,
} from "./constructionStages";

/**
 * **EVERY NODE THE CITY CAN PLACE RESOLVES TO GEOMETRY — the dormant defect the plot lift
 * activates.**
 *
 * `PlacedBuilding` renders its named, click-handling `<group>` unconditionally and puts all
 * geometry inside it. So a node whose model resolved to nothing was TWO failures at once:
 * invisible on screen, and — because on the canvas the click target IS the rendered
 * geometry — not a raycast target either, so its `onClick` could never fire and the lesson
 * behind it was unreachable. `ruinSeam.test.ts` holds the ruin template to the same rule for
 * the same reason.
 *
 * That was harmless for exactly one reason: the city's roster was a domain's six `mvp`
 * nodes, so an unmapped node could not be placed. The roster is the era's now
 * (`@cr/game` — `cityRosterNodeIds`), so all 62 are placeable and every one of them has to
 * resolve to something.
 *
 * ## The population is every PLACEABLE node, not every unmapped one
 *
 * Scoping this sweep to the nodes that happen to lack art today would be scoping a guard by
 * its implementation rather than by the behaviour: the question is "what would have to be
 * true of a node for this defect to be possible", and the answer is "the city can place it".
 * So the sweep is over the widest roster — all 62 — and the mapped/unmapped SPLIT is
 * reported beside it with a floor, so a guard that had quietly narrowed to a handful would
 * show up as a number rather than as silence.
 *
 * The split moves under this file and is meant to: every authored era moves five nodes from
 * the neutral cohort into the GLB cohort. Both are derived from the resolver over the
 * roster rather than treated as the invariant.
 */

const MILESTONES: readonly BuildStage[] = ["site", "construction", "built", "advanced"];

/** The widest roster the city can ever hold — era ten's, which is every in-product node. */
const WIDEST_ERA = ERA_SEQUENCE[ERA_SEQUENCE.length - 1]?.id as EraId;
const PLACEABLE: readonly string[] = cityRosterNodeIds(WIDEST_ERA);

/** The nodes whose `built` phase comes from their OWN GLB, read off the resolver. */
const MAPPED = PLACEABLE.filter(
  (nodeId) => resolveBuildingModel(nodeId, "built").kind === "glb",
);

/** The nodes that fall through to the shared neutral templates. */
const UNMAPPED = PLACEABLE.filter(
  (nodeId) => resolveBuildingModel(nodeId, "built").kind !== "glb",
);

/** The distinct footprint shapes those nodes take — what the template cache is keyed by. */
const UNMAPPED_SHAPES = new Set(
  UNMAPPED.map((nodeId) => {
    const fp = footprintFor(nodeId);
    return `${fp.w}x${fp.d}`;
  }),
);

/** Mastery gold, reserved for stars and rewards and never a body colour. */
const MASTERY_GOLD = 0xffb703;

function meshesIn(object: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      found.push(mesh);
    }
  });
  return found;
}

function sizeOf(object: THREE.Object3D): THREE.Vector3 {
  return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
}

function colorsOf(object: THREE.Object3D): number[] {
  return meshesIn(object).flatMap((mesh) =>
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) =>
      (m as THREE.MeshStandardMaterial).color.getHex(),
    ),
  );
}

/**
 * Every node the art pipeline names, across all six authored era maps — the union
 * `resolveBuildingModel` itself gates its GLB lookup on. Built here from the two exported
 * maps rather than importing the module's private union, so that a third era's map added to
 * the resolver and not to this line fails the both-directions check below.
 */
const ART_NAMED = {
  ...ERA_TEN_NODE_BUILDINGS,
  ...ERA_NINE_NODE_BUILDINGS,
  ...ERA_EIGHT_NODE_BUILDINGS,
  ...ERA_SEVEN_NODE_BUILDINGS,
  ...ERA_FIVE_NODE_BUILDINGS,
  ...ERA_FOUR_NODE_BUILDINGS,
  ...ERA_THREE_NODE_BUILDINGS,
  ...ERA_TWO_NODE_BUILDINGS,
  ...D1_NODE_BUILDINGS,
};

describe("the placeable population, derived rather than listed", () => {
  it("is the whole widest roster, and reports the mapped/unmapped split with a floor", () => {
    expect(PLACEABLE).toHaveLength(62);
    // Both directions on the split, so a node cannot be in neither bucket or in both.
    expect(MAPPED.length + UNMAPPED.length).toBe(PLACEABLE.length);
    expect(new Set([...MAPPED, ...UNMAPPED]).size).toBe(PLACEABLE.length);

    // Floors only rule out vacuity; the exact composition is asserted below from the name
    // maps. A literal unmapped floor is a hostage to each legitimate art drop.
    expect(MAPPED.length).toBeGreaterThanOrEqual(6);
    expect(UNMAPPED.length).toBeGreaterThan(0);
    // A ceiling too, so an accident that emptied the name maps (making everything unmapped)
    // would fail rather than quietly widening the sweep to cover it up.
    expect(UNMAPPED.length).toBeLessThanOrEqual(62 - Object.keys(ART_NAMED).length);

    // The mapped set is exactly the name maps' keys, in both directions — so a node with a
    // GLB on disk and no name entry, or a name entry and no GLB, is caught here. All three
    // maps are included because `resolveBuildingModel` gates on their union.
    expect([...MAPPED].sort()).toEqual(Object.keys(ART_NAMED).sort());
    // Era seven landed before Era six, so authored art is a capability set rather than one
    // cumulative prefix. Both sides of that gap are named: Industrial resolves and Early
    // Modern still takes the neutral shell.
    for (const nodeId of getEraNodes("industrial")) {
      expect(
        MAPPED,
        `${nodeId} has Industrial art but is not in the mapped cohort`,
      ).toContain(nodeId);
    }
    for (const nodeId of getEraNodes("renaissance")) {
      expect(
        UNMAPPED,
        `${nodeId} has no Early Modern art but left the neutral cohort`,
      ).toContain(nodeId);
    }
    // Era one's roster is inside it, which is what made the defect dormant to begin with.
    for (const nodeId of cityRosterNodeIds(FIRST_ERA_ID)) {
      expect(MAPPED, `${nodeId} lost its art`).toContain(nodeId);
    }

    // Several distinct footprint shapes, because the templates are built and cached per
    // footprint: a rule that holds for a 2×2 can fail on a 2×1.
    expect(UNMAPPED_SHAPES.size).toBeGreaterThanOrEqual(2);
  });
});

describe("every placeable node resolves a renderable stage at every milestone", () => {
  it.each(PLACEABLE)("resolves %s at all four milestones", (nodeId) => {
    for (const stage of MILESTONES) {
      const resolved = resolveBuildingModel(nodeId, stage);
      // Never null — that was the "empty pad" the lift would have made visible.
      expect(resolved, `${nodeId}/${stage}`).not.toBeNull();
      if (resolved.kind === "glb") {
        expect((resolved.url ?? "").length, `${nodeId}/${stage}`).toBeGreaterThan(0);
      } else {
        // A procedural kind names one of the three shared templates, so `PlacedBuilding`'s
        // switch cannot fall through to a stage that is not the one resolved.
        expect(["site", "construction", "built"], `${nodeId}/${stage}`).toContain(
          resolved.kind,
        );
        expect(resolved.url, `${nodeId}/${stage}`).toBeNull();
      }
    }
  });
});

describe("the neutral BUILT shell is a real, clickable building", () => {
  it.each([...UNMAPPED_SHAPES])("gives a %s lot geometry with real volume", (shape) => {
    const [w, d] = shape.split("x").map(Number) as [number, number];
    const fp: Footprint = { w, d };
    const shell = neutralBuiltModel(fp);

    // Meshes, with a floor: an empty group would satisfy every size assertion below by
    // having nothing to measure, which is exactly the failure being guarded against.
    expect(meshesIn(shell).length).toBeGreaterThan(3);

    const size = sizeOf(shell);
    expect(size.x).toBeGreaterThan(0);
    expect(size.y).toBeGreaterThan(0);
    expect(size.z).toBeGreaterThan(0);
    // It stands ON the lot rather than under it, so the mass is in front of the camera.
    expect(new THREE.Box3().setFromObject(shell).max.y).toBeGreaterThan(0);
    // And it reads as a BUILDING rather than as a slab: taller than one grid cell and
    // under the height cap, so no lot's shell is squashed by `prepareModel`.
    expect(size.y).toBeGreaterThan(2);
    expect(size.y).toBeLessThan(MAX_BUILD_HEIGHT);
  });

  it.each([...UNMAPPED_SHAPES])("fills a %s footprint, so it matches its plot", (shape) => {
    const [w, d] = shape.split("x").map(Number) as [number, number];
    const size = sizeOf(neutralBuiltModel({ w, d }));
    // The wider axis of the footprint is the wider axis of the shell, so a 2×1 lot gets a
    // building laid the long way instead of a square dropped in a strip.
    if (w > d) {
      expect(size.x).toBeGreaterThan(size.z);
    } else if (d > w) {
      expect(size.z).toBeGreaterThan(size.x);
    } else {
      expect(size.x).toBeCloseTo(size.z, 6);
    }
  });

  it("is distinguishable from the site and the scaffold on the same lot", () => {
    // A finished building that read as a scaffold would be a different bug wearing the same
    // fix. Silhouette: the shell is markedly taller than the empty site and shorter than the
    // scaffold's poles, so the three phases read as a build going up.
    for (const shape of UNMAPPED_SHAPES) {
      const [w, d] = shape.split("x").map(Number) as [number, number];
      const fp: Footprint = { w, d };
      const site = sizeOf(neutralSiteModel(fp)).y;
      const scaffold = sizeOf(neutralConstructionModel(fp)).y;
      const built = sizeOf(neutralBuiltModel(fp)).y;
      expect(built, `${shape} vs site`).toBeGreaterThan(site * 1.5);
      expect(built, `${shape} vs scaffold`).toBeLessThan(scaffold);
    }
  });

  it("caches one template per footprint shape and never returns another shape's", () => {
    expect(neutralBuiltModel({ w: 2, d: 2 })).toBe(neutralBuiltModel({ w: 2, d: 2 }));
    expect(neutralBuiltModel({ w: 2, d: 1 })).not.toBe(neutralBuiltModel({ w: 2, d: 2 }));
  });

  it("reads by geometry and tone, never by lighting, and never in mastery gold", () => {
    for (const shape of UNMAPPED_SHAPES) {
      const [w, d] = shape.split("x").map(Number) as [number, number];
      const shell = neutralBuiltModel({ w, d });

      let lights = 0;
      shell.traverse((child) => {
        if ((child as THREE.Light).isLight) {
          lights += 1;
        }
      });
      expect(lights, shape).toBe(0);

      const materials = meshesIn(shell).flatMap((mesh) =>
        Array.isArray(mesh.material) ? mesh.material : [mesh.material],
      );
      expect(materials.length, shape).toBeGreaterThan(0);
      for (const m of materials) {
        const standard = m as THREE.MeshStandardMaterial;
        expect(standard.emissive?.getHex() ?? 0, shape).toBe(0);
        expect(standard.flatShading, shape).toBe(true);
      }
      for (const color of colorsOf(shell)) {
        expect(color, shape).not.toBe(MASTERY_GOLD);
      }
    }
    // The authored tones too, so a swap that kept the geometry is caught at the source.
    for (const tone of Object.values(NEUTRAL_BUILT_TONES)) {
      expect(tone).not.toBe(MASTERY_GOLD);
    }
  });

  it("casts and receives shadows, so it sits in the island's light like any building", () => {
    for (const shape of UNMAPPED_SHAPES) {
      const [w, d] = shape.split("x").map(Number) as [number, number];
      for (const mesh of meshesIn(neutralBuiltModel({ w, d }))) {
        expect(mesh.castShadow, `${shape}/${mesh.name}`).toBe(true);
        expect(mesh.receiveShadow, `${shape}/${mesh.name}`).toBe(true);
      }
    }
  });
});
