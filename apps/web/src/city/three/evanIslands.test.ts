import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  type DesignedIslandEraId,
  EVAN_ISLAND_DESIGNS,
  eraIslandDesign,
} from "../islandDesign";
import { hasAuthoredIslandGround, islandGround } from "../islandGround";
import { eraCityLayout, eraLandRadius } from "../islandLand";
import {
  buildEvanIslandGroup,
  EVAN_ISLAND_SOURCE,
  EVAN_RUNTIME_CLEARINGS,
  evanRuntimeClearingContains,
  evanIslandGeometryStats,
} from "./evanIslandGeometry";
import { buildIslandGroup } from "./StarterIsland";

const ROOT = process.cwd();
const SOURCE_2 = readFileSync(
  join(ROOT, EVAN_ISLAND_SOURCE.directory, EVAN_ISLAND_SOURCE.era2),
  "utf8",
);
const SOURCE_3_TO_10 = readFileSync(
  join(ROOT, EVAN_ISLAND_SOURCE.directory, EVAN_ISLAND_SOURCE.eras3To10),
  "utf8",
);
const EVAN_SOURCE_ERAS = ERA_SEQUENCE.slice(1).map(
  (era) => era.id,
) as DesignedIslandEraId[];
const AUTHORED_ERAS = ERA_SEQUENCE.map((era) => era.id) as DesignedIslandEraId[];

function meshes(root: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) {
      found.push(mesh);
    }
  });
  return found;
}

function sourceIsland(eraId: DesignedIslandEraId): THREE.Group {
  const design = EVAN_ISLAND_DESIGNS[eraId];
  return buildEvanIslandGroup(design, {
    grassRadius: EVAN_ISLAND_SOURCE.plateauRadius,
    seaRadius: 46,
    protectedRadius: 0,
  });
}

function cityIsland(eraId: DesignedIslandEraId): THREE.Group {
  return buildIslandGroup(eraCityLayout(eraId), islandGround(eraId), eraLandRadius(eraId));
}

function signature(root: THREE.Object3D): string {
  const rows: string[] = [];
  root.updateMatrixWorld(true);
  for (const mesh of meshes(root)) {
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const colored = material as THREE.Material & { color?: THREE.Color };
    rows.push(
      [
        mesh.name,
        mesh.geometry.type,
        mesh.geometry.getAttribute("position").count,
        mesh.matrixWorld.elements.map((value) => value.toFixed(5)).join(","),
        colored.color?.getHexString() ?? "vertex",
      ].join("|"),
    );
  }
  return rows.join(";");
}

describe("Evan standalone island provenance and mapping", () => {
  it("keeps Evan's source population at eras 2–10 inside a complete runtime registry", () => {
    expect(ERA_SEQUENCE).toHaveLength(10);
    expect(EVAN_SOURCE_ERAS).toHaveLength(9);
    expect(AUTHORED_ERAS).toHaveLength(10);
    expect(new Set(Object.keys(EVAN_ISLAND_DESIGNS))).toEqual(new Set(AUTHORED_ERAS));
    expect(eraIslandDesign("prehistoric")).toMatchObject({
      eraId: "prehistoric",
      sourceEra: 1,
      shoreline: "shelving-shore",
    });
    for (const eraId of AUTHORED_ERAS) {
      const design = eraIslandDesign(eraId);
      expect(design?.eraId, eraId).toBe(eraId);
      expect(design?.sourceEra, eraId).toBe(
        ERA_SEQUENCE.findIndex((era) => era.id === eraId) + 1,
      );
      expect(design?.sourceClassName, eraId).toBe(`Era${design?.sourceEra}Island`);
      expect(hasAuthoredIslandGround(eraId), eraId).toBe(true);
    }
  });

  it("maps every typed constructor to a constructor in the checked-in source", () => {
    expect(SOURCE_2).toContain("class Era2Island");
    expect(SOURCE_2).toContain("window.Era2Island = Era2Island");
    for (const eraId of EVAN_SOURCE_ERAS.slice(1)) {
      const className = EVAN_ISLAND_DESIGNS[eraId].sourceClassName;
      expect(SOURCE_3_TO_10, className).toContain(`class ${className}`);
      expect(SOURCE_3_TO_10, className).toContain(
        `${EVAN_ISLAND_DESIGNS[eraId].sourceEra}: ${className}`,
      );
    }
    expect(SOURCE_3_TO_10).toContain("N: 13, RP: 27.0, RS: 29.0, RK: 21.6");
  });
});

describe("Evan standalone island geometry", () => {
  it("builds the shared 13-sided plateau and every declared signature for all ten eras", () => {
    for (const eraId of AUTHORED_ERAS) {
      const design = EVAN_ISLAND_DESIGNS[eraId];
      const island = sourceIsland(eraId);
      const plateau = island.getObjectByName("evan-plateau") as THREE.Mesh | undefined;
      expect(plateau, eraId).toBeDefined();
      if (plateau === undefined) {
        throw new Error(`${eraId} has no Evan plateau after the presence assertion`);
      }
      expect(
        (plateau.geometry as THREE.CylinderGeometry).parameters.radialSegments,
        eraId,
      ).toBe(EVAN_ISLAND_SOURCE.facets);
      // 2026-08-21: prehistoric's gravel-shelf and shore-boulder-clusters props were removed
      // entirely on explicit request ("take out any of the art thats not the trees"), leaving
      // wind-cropped-trees as its only named landform. Every other era still authors at least 3.
      const signatureFloor = eraId === "prehistoric" ? 1 : 3;
      expect(design.signatures.length, eraId).toBeGreaterThanOrEqual(signatureFloor);
      for (const feature of design.signatures) {
        expect(island.getObjectByName(feature), `${eraId}/${feature}`).toBeDefined();
      }
      expect(evanIslandGeometryStats(island).signatures, eraId).toEqual(
        [...design.signatures].sort(),
      );
    }
  });

  it("is deterministic even for flora, stone rotations, reeds, and ground scatter", () => {
    for (const eraId of AUTHORED_ERAS) {
      expect(signature(sourceIsland(eraId)), eraId).toBe(signature(sourceIsland(eraId)));
    }
  });

  it("omits the reported olive polygon from the live Neolithic ground-patch family", () => {
    const patches = cityIsland("neolithic").getObjectByName("grazing-patches");
    expect(patches, "live Neolithic grazing-patches group").toBeDefined();
    const groundPatches = (patches?.children ?? []).filter(
      (object): object is THREE.Mesh => (object as THREE.Mesh).isMesh === true,
    );
    const materials = groundPatches.flatMap((patch) => {
      const patchMaterials = Array.isArray(patch.material)
        ? patch.material
        : [patch.material];
      return patchMaterials.map((material) => ({
        name: patch.name,
        color: (material as THREE.MeshStandardMaterial).color.getHex(),
      }));
    });

    expect(
      materials
        .filter(({ color }) => color === 0x93894e)
        .map(({ name, color }) => `${name} #${color.toString(16).padStart(6, "0")}`),
      "reported olive polygon in the live Neolithic render population",
    ).toEqual([]);
    expect(
      groundPatches.length,
      "remaining Neolithic ground-patch family",
    ).toBeGreaterThanOrEqual(3);
    expect(
      new Set(materials.map(({ color }) => color)).size,
      "remaining Neolithic ground-patch color variation",
    ).toBeGreaterThanOrEqual(3);
  });

  it("does not leak another era's named signature into an island", () => {
    const all = new Set(
      Object.values(EVAN_ISLAND_DESIGNS).flatMap((design) => design.signatures),
    );
    expect(all.size).toBeGreaterThanOrEqual(30);
    for (const eraId of AUTHORED_ERAS) {
      const island = sourceIsland(eraId);
      const own = new Set(EVAN_ISLAND_DESIGNS[eraId].signatures);
      const drawnAsSignature = new Set(evanIslandGeometryStats(island).signatures);
      for (const feature of all) {
        expect(drawnAsSignature.has(feature), `${eraId}/${feature}`).toBe(own.has(feature));
      }
    }
  });

  it("keeps every signature at its authored source position in the live city", () => {
    for (const eraId of AUTHORED_ERAS) {
      const source = sourceIsland(eraId);
      const island = cityIsland(eraId);
      const signatures = EVAN_ISLAND_DESIGNS[eraId].signatures;
      // 2026-08-21: prehistoric now authors only wind-cropped-trees (see the signature-floor
      // comment above); every other era still keeps its 3-signature floor.
      const signatureFloor = eraId === "prehistoric" ? 1 : 3;
      expect(signatures.length, `${eraId} signature floor`).toBeGreaterThanOrEqual(
        signatureFloor,
      );
      for (const name of signatures) {
        const authored = source.getObjectByName(name);
        const adapted = island.getObjectByName(name);
        expect(authored, `${eraId}/${name} exists in the source port`).toBeDefined();
        expect(adapted, `${eraId}/${name} exists in the live city`).toBeDefined();
        expect(adapted?.position.toArray(), `${eraId}/${name} moved radially`).toEqual(
          authored?.position.toArray(),
        );
        expect(adapted?.scale.toArray(), `${eraId}/${name} was LOD-scaled`).toEqual(
          authored?.scale.toArray(),
        );
      }
    }
  });

  it("uses no wholesale protected-disc displacement in any delivered live island", () => {
    let checked = 0;
    for (const eraId of AUTHORED_ERAS) {
      const island = cityIsland(eraId);
      const displaced: string[] = [];
      island.traverse((object) => {
        if (object.userData.protectedPlotAdjustment === true) {
          displaced.push(object.name || "(unnamed)");
        }
      });
      expect(displaced, `${eraId} displaced authored groups`).toEqual([]);
      checked += 1;
    }
    expect(checked).toBe(AUTHORED_ERAS.length);
  });

  it("opens three named settlement clearings per era by removing generic clutter only", () => {
    for (const eraId of AUTHORED_ERAS) {
      const clearings = EVAN_RUNTIME_CLEARINGS[eraId];
      const island = cityIsland(eraId);
      expect(clearings, `${eraId} authored clearing population`).toHaveLength(3);
      expect(island.userData.evanRuntimeClearings, eraId).toEqual(
        clearings.map((clearing) => clearing.name),
      );
      // 2026-08-21: prehistoric no longer authors any ground-scatter/gravel/boulder clutter
      // (removed entirely on explicit request), so its clearings legitimately have nothing
      // generic left to clear. Every other era still keeps the >0 floor.
      if (eraId === "prehistoric") {
        expect(
          Number(island.userData.evanRuntimeClearedObjects ?? 0),
          `${eraId} clearings removed unexpected clutter`,
        ).toBe(0);
      } else {
        expect(
          Number(island.userData.evanRuntimeClearedObjects ?? 0),
          `${eraId} clearings removed no generic clutter`,
        ).toBeGreaterThan(0);
      }

      const genericParents = [
        island.getObjectByName("grazing-patches"),
        island.getObjectByName("evan-ground-scatter"),
      ].filter((parent): parent is THREE.Object3D => parent !== undefined);
      expect(genericParents.length, `${eraId} generic population`).toBeGreaterThanOrEqual(
        2,
      );
      for (const parent of genericParents) {
        for (const child of parent.children) {
          expect(
            clearings.some((clearing) =>
              evanRuntimeClearingContains(clearing, child.position),
            ),
            `${eraId}/${parent.name}/${child.name} remains inside a build clearing`,
          ).toBe(false);
        }
      }
    }
  });

  it("lets legal-cell overlays depth-test against buildings but not flat authored terrain", () => {
    for (const eraId of AUTHORED_ERAS) {
      const overlays = meshes(cityIsland(eraId)).filter(
        (mesh) => mesh.userData.runtimeTerrainOverlay === true,
      );
      expect(
        overlays.length,
        `${eraId} flat terrain overlay population`,
      ).toBeGreaterThanOrEqual(3);
      for (const mesh of overlays) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        expect(
          materials.every((material) => material.depthWrite === false),
          `${eraId}/${mesh.name} can occlude the legal grid`,
        ).toBe(true);
        expect(mesh.renderOrder, `${eraId}/${mesh.name} terrain order`).toBeLessThan(120);
      }
    }
  });

  it("keeps Cyberpunk neon above the dark-water exposure hierarchy at runtime", () => {
    const island = cityIsland("cyberpunk");
    const neon = meshes(island).filter(
      (mesh) =>
        mesh.name.includes("neon-reflection") ||
        mesh.name.includes("fissure-amber-glow") ||
        mesh.name.includes("revetment-marker"),
    );
    expect(neon.length, "Cyberpunk runtime neon population").toBeGreaterThanOrEqual(5);
    for (const mesh of neon) {
      const material = mesh.material as THREE.Material;
      expect(material.toneMapped, mesh.name).toBe(false);
      expect(material.opacity, mesh.name).toBeGreaterThanOrEqual(0.62);
    }
  });

  it("keeps the authored graph under explicit CPU/GPU geometry ceilings", () => {
    const readings = AUTHORED_ERAS.map((eraId) => {
      const stats = evanIslandGeometryStats(sourceIsland(eraId));
      expect(stats.signatures, `${eraId} signature floor`).toHaveLength(
        EVAN_ISLAND_DESIGNS[eraId].signatures.length,
      );
      // 2026-08-21: prehistoric's authored population dropped sharply (64 meshes/1,832
      // triangles) once its gravel-shelf, shore-boulder-clusters, and ground-scatter props were
      // deliberately removed, then again (37 meshes) once its scrub bushes and reed banks were
      // removed too, leaving only its trees and grazing patches. Its floor only has to prove the
      // builder did not stop drawing entirely; every other era keeps the original, richer floor.
      const meshFloor = eraId === "prehistoric" ? 20 : 100;
      const triangleFloor = eraId === "prehistoric" ? 1_000 : 2_500;
      expect(stats.meshes, `${eraId} meshes`).toBeGreaterThan(meshFloor);
      expect(stats.meshes, `${eraId} meshes`).toBeLessThanOrEqual(3_200);
      expect(stats.triangles, `${eraId} triangles`).toBeGreaterThan(triangleFloor);
      expect(stats.triangles, `${eraId} triangles`).toBeLessThanOrEqual(60_000);
      return [eraId, stats.meshes, stats.triangles] as const;
    });
    expect(readings).toHaveLength(10);
  });
});

describe("the Prehistoric runtime design does not rewrite Evan's preserved source files", () => {
  it("adds Era I through the typed runtime registry while the two source deliveries stay intact", () => {
    expect(SOURCE_2).not.toMatch(/class Era1Island|window\.Era1Island/);
    expect(SOURCE_3_TO_10).not.toMatch(/class Era1Island|1:\s*Era1Island/);
    expect(eraIslandDesign("prehistoric" satisfies EraId)).toMatchObject({
      sourceEra: 1,
      referenceName: "The Windblown Shore Camp",
    });
    expect(Object.keys(EVAN_ISLAND_DESIGNS)).toContain("prehistoric");
  });
});
