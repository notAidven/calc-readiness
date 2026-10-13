import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type * as THREE from "three";
import { describe, expect, it } from "vitest";

import { islandGround } from "../islandGround";
import { eraCityLayout, eraLandRadius } from "../islandLand";
import { buildIslandGroup } from "./StarterIsland";

interface IslandDecorationReading {
  readonly eraId: EraId;
  readonly decorativeMeshes: number;
  readonly meshesPerThousandLand: number;
  readonly genericActors: number;
  readonly groundPatches: number;
  readonly floraActors: number;
  readonly looseShoreActors: number;
  readonly reedMeshes: number;
  readonly signatureGroups: number;
  readonly signatureMeshes: number;
}

const STRUCTURAL_TERRAIN = new Set([
  "evan-battered-keel",
  "evan-shore-rim",
  "evan-plateau",
  "island-lagoon",
]);

function meshCount(root: THREE.Object3D | undefined): number {
  let count = 0;
  root?.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      count += 1;
    }
  });
  return count;
}

function isUnder(object: THREE.Object3D, name: string): boolean {
  for (
    let current: THREE.Object3D | null = object;
    current !== null;
    current = current.parent
  ) {
    if (current.name === name) {
      return true;
    }
  }
  return false;
}

function floraGroup(root: THREE.Object3D, eraId: EraId): THREE.Object3D | undefined {
  const name =
    eraId === "prehistoric" || eraId === "neolithic"
      ? "wind-cropped-trees"
      : eraId === "classical"
        ? "cypress-stands"
        : eraId === "medieval"
          ? "willow-marsh"
          : eraId === "atomic_age"
            ? "topiary-groves"
            : "evan-authored-flora";
  return root.getObjectByName(name);
}

function reading(eraId: EraId): IslandDecorationReading {
  const root = buildIslandGroup(
    eraCityLayout(eraId),
    islandGround(eraId),
    eraLandRadius(eraId),
  );
  let decorativeMeshes = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (
      mesh.isMesh &&
      ((mesh.userData.evanAuthored === true && !STRUCTURAL_TERRAIN.has(mesh.name)) ||
        isUnder(mesh, "windblown-camp"))
    ) {
      decorativeMeshes += 1;
    }
  });

  const design = islandGround(eraId).design;
  const signatures = design?.signatures ?? [];
  const gravelRim = root.getObjectByName("gravel-rim");
  const looseShoreActors =
    (gravelRim?.children.filter((child) => child.name !== "reed-banks").length ?? 0) +
    (eraId === "prehistoric"
      ? (root.getObjectByName("gravel-shelf")?.children.length ?? 0) +
        (root.getObjectByName("shore-boulder-clusters")?.children.length ?? 0)
      : 0);
  const landArea = Math.PI * eraLandRadius(eraId) ** 2;

  return {
    eraId,
    decorativeMeshes,
    meshesPerThousandLand: Number(((decorativeMeshes / landArea) * 1_000).toFixed(1)),
    genericActors: root.getObjectByName("evan-ground-scatter")?.children.length ?? 0,
    groundPatches: root.getObjectByName("grazing-patches")?.children.length ?? 0,
    floraActors: floraGroup(root, eraId)?.children.length ?? 0,
    looseShoreActors,
    reedMeshes: meshCount(root.getObjectByName("reed-banks")),
    signatureGroups: signatures.length,
    signatureMeshes: signatures.reduce(
      (total, signature) => total + meshCount(root.getObjectByName(signature)),
      0,
    ),
  };
}

describe("ordinary islands keep Era 1's restrained visual-information budget", () => {
  it("measures the complete ten-era population with non-empty composed scenery", () => {
    const readings = ERA_SEQUENCE.map((era) => reading(era.id));
    expect(readings).toHaveLength(10);
    expect(new Set(readings.map((entry) => entry.eraId))).toEqual(
      new Set(ERA_SEQUENCE.map((era) => era.id)),
    );
    for (const entry of readings) {
      // 2026-08-21: prehistoric's gravel-shelf, shore-boulder-clusters, generic
      // ground-scatter/loose-shore props, scrub bushes, and reed banks were deliberately
      // removed ("retain the trees and a few of the green patches; delete all the brown
      // stuff... there should be like 8 things total"), so it no longer shares the other nine
      // eras' signature/generic/shore/flora/reed floors -- only its 5 trees and 3 grazing
      // patches remain.
      const isPrehistoric = entry.eraId === "prehistoric";
      expect(
        entry.signatureGroups,
        `${entry.eraId} signature-group floor`,
      ).toBeGreaterThanOrEqual(isPrehistoric ? 1 : 3);
      expect(
        entry.signatureMeshes,
        `${entry.eraId} signature-mesh floor`,
      ).toBeGreaterThanOrEqual(entry.signatureGroups);
      expect(entry.genericActors, `${entry.eraId} generic floor`).toBeGreaterThanOrEqual(
        isPrehistoric ? 0 : 48,
      );
      expect(entry.floraActors, `${entry.eraId} flora floor`).toBeGreaterThanOrEqual(
        isPrehistoric ? 5 : 8,
      );
      expect(entry.looseShoreActors, `${entry.eraId} shore floor`).toBeGreaterThanOrEqual(
        isPrehistoric ? 0 : 20,
      );
      expect(entry.reedMeshes, `${entry.eraId} reed floor`).toBeGreaterThanOrEqual(
        isPrehistoric ? 0 : 6,
      );
    }
  });

  it("keeps every screen-composed decoration family inside the reduced Era 1 budget", () => {
    const readings = ERA_SEQUENCE.map((era) => reading(era.id));
    for (const entry of readings) {
      expect
        .soft(entry.genericActors, `${entry.eraId} generic ground actors`)
        .toBeLessThanOrEqual(88);
      expect
        .soft(entry.groundPatches, `${entry.eraId} broad ground patches`)
        .toBeLessThanOrEqual(4);
      expect.soft(entry.floraActors, `${entry.eraId} flora actors`).toBeLessThanOrEqual(18);
      expect
        .soft(entry.looseShoreActors, `${entry.eraId} loose shore actors`)
        .toBeLessThanOrEqual(48);
      expect.soft(entry.reedMeshes, `${entry.eraId} reed meshes`).toBeLessThanOrEqual(18);
      expect
        .soft(
          entry.decorativeMeshes,
          `${entry.eraId} total decorative meshes (${entry.meshesPerThousandLand}/1k land)`,
        )
        .toBeLessThanOrEqual(620);
    }
  });
});
