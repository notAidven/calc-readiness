import { ERA_SEQUENCE } from "@cr/skill-graph";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { islandGround } from "../islandGround";
import { eraCityLayout, eraLandRadius } from "../islandLand";
import {
  EVAN_RUNTIME_CLEARINGS,
  evanIslandGeometryStats,
  evanRuntimeClearingContains,
} from "./evanIslandGeometry";
import { buildIslandGroup } from "./StarterIsland";

function authoredRaisedMeshes(root: THREE.Object3D): readonly THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (
      mesh.isMesh &&
      mesh.userData.evanAuthored === true &&
      mesh.userData.terrainSurface !== true
    ) {
      out.push(mesh);
    }
  });
  return out;
}

describe("the delivered island dressing fills the live island without taking city ground", () => {
  it("opens named build clearings without relocating all raised authored art", () => {
    const delivered = ERA_SEQUENCE.filter((era) => islandGround(era.id).design !== null);
    expect(delivered).toHaveLength(ERA_SEQUENCE.length);
    for (const era of delivered) {
      const layout = eraCityLayout(era.id);
      const island = buildIslandGroup(layout, islandGround(era.id), eraLandRadius(era.id));
      const raised = authoredRaisedMeshes(island);
      // 2026-08-21: prehistoric's raised population dropped once its scrub bushes and reed
      // banks joined its already-removed gravel-shelf/shore-boulder-clusters/ground-scatter,
      // leaving only its 5 trees and 3 grazing patches raised above the terrain.
      const raisedFloor = era.id === "prehistoric" ? 20 : 40;
      expect(raised.length, `${era.id} raised population`).toBeGreaterThan(raisedFloor);
      const clearings =
        EVAN_RUNTIME_CLEARINGS[era.id as keyof typeof EVAN_RUNTIME_CLEARINGS];
      expect(clearings, `${era.id} clearing population`).toHaveLength(3);
      expect(island.userData.evanRuntimeClearings, era.id).toEqual(
        clearings.map((clearing) => clearing.name),
      );
      for (const parentName of ["grazing-patches", "evan-ground-scatter"]) {
        const parent = island.getObjectByName(parentName);
        expect(parent, `${era.id}/${parentName}`).toBeDefined();
        for (const child of parent?.children ?? []) {
          expect(
            clearings.some((clearing) =>
              evanRuntimeClearingContains(clearing, child.position),
            ),
            `${era.id}/${parentName}/${child.name} remains in a build clearing`,
          ).toBe(false);
        }
      }
    }
  });

  it("retains substantial deterministic art and named signatures at every delivered shore", () => {
    for (const era of ERA_SEQUENCE) {
      const layout = eraCityLayout(era.id);
      const island = buildIslandGroup(layout, islandGround(era.id), eraLandRadius(era.id));
      const stats = evanIslandGeometryStats(island);
      // 2026-08-21: prehistoric authors only its 5 trees and 3 grazing patches now that its
      // gravel-shelf, shore-boulder-clusters, scrub bushes, and reed banks are deliberately
      // gone; every other era keeps the original, much richer floor.
      const meshFloor = era.id === "prehistoric" ? 20 : 100;
      const triangleFloor = era.id === "prehistoric" ? 500 : 2_500;
      expect(stats.meshes, era.id).toBeGreaterThan(meshFloor);
      expect(stats.triangles, era.id).toBeGreaterThan(triangleFloor);
      const signatureFloor = era.id === "prehistoric" ? 1 : 3;
      expect(stats.signatures.length, era.id).toBeGreaterThanOrEqual(signatureFloor);
    }
  });

  it("runs Prehistoric through the authored pipeline with its camp retired", () => {
    const layout = eraCityLayout("prehistoric");
    const island = buildIslandGroup(
      layout,
      islandGround("prehistoric"),
      eraLandRadius("prehistoric"),
    );
    const design = islandGround("prehistoric").design;
    expect(design, "Prehistoric has no authored design row").not.toBeNull();
    expect(island.userData.evanSourceEra).toBe(1);
    // 2026-08-21: the windblown-camp feature group (hearth, drying rack, midden, flint
    // scatter, hide boat, worn routes) is deliberately no longer built ("theres still excess
    // stuff laying around on the island... delete all the brown stuff. there should be like 8
    // things total"), so `prehistoricCampProps` is no longer set at all.
    expect(island.userData.prehistoricCampProps).toBeUndefined();
    const stats = evanIslandGeometryStats(island);
    expect(stats.meshes).toBeGreaterThan(20);
    expect(stats.triangles).toBeGreaterThan(500);
    // gravel-shelf and shore-boulder-clusters were removed earlier the same day, so
    // wind-cropped-trees is the only surviving named landform.
    expect(stats.signatures).toEqual(["wind-cropped-trees"]);
  });
});
