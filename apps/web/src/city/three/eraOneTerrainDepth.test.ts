import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { islandGround } from "../islandGround";
import { eraCityLayout, eraLandRadius } from "../islandLand";
import { walkableRadiusFor } from "../worldLayout";
import { buildIslandGroup } from "./StarterIsland";

function eraOneIsland(): THREE.Group {
  return buildIslandGroup(
    eraCityLayout("prehistoric"),
    islandGround("prehistoric"),
    eraLandRadius("prehistoric"),
  );
}

function taggedGroups(root: THREE.Object3D, tag: string): readonly THREE.Object3D[] {
  const groups: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (object.userData[tag] === true) groups.push(object);
  });
  return groups;
}

function meshes(root: THREE.Object3D): readonly THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  root.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) found.push(object as THREE.Mesh);
  });
  return found;
}

function horizontalReach(box: THREE.Box3): number {
  return Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
}

function minimumRadialExtent(root: THREE.Object3D): number {
  root.updateMatrixWorld(true);
  const point = new THREE.Vector3();
  let minimum = Number.POSITIVE_INFINITY;
  for (const mesh of meshes(root)) {
    const positions = mesh.geometry.getAttribute("position");
    for (let index = 0; index < positions.count; index += 1) {
      point.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
      minimum = Math.min(minimum, Math.hypot(point.x, point.z));
    }
  }
  return minimum;
}

describe("Era 1 terrain has dimensional hierarchy without taking gameplay ground", () => {
  it("frames the settlement with a small, named population of raised natural landforms", () => {
    const island = eraOneIsland();
    island.updateMatrixWorld(true);
    const landforms = taggedGroups(island, "prehistoricLandform");
    const protectedRadius = walkableRadiusFor(eraCityLayout("prehistoric").buildableRadius);

    // A floor and a ceiling: this is terrain composition, not a prop-scatter loophole.
    expect(landforms.length, "raised landform population").toBeGreaterThanOrEqual(3);
    expect(landforms.length, "raised landform population").toBeLessThanOrEqual(4);
    expect(
      new Set(landforms.map((landform) => String(landform.userData.landformId))).size,
      "every raised mass has a purposeful composition role",
    ).toBe(landforms.length);

    const tones = new Set<number>();
    let triangles = 0;
    for (const landform of landforms) {
      const box = new THREE.Box3().setFromObject(landform);
      const reach = horizontalReach(box);
      const height = box.max.y - box.min.y;
      const landformMeshes = meshes(landform);
      expect(height, `${landform.name} is still visually flat`).toBeGreaterThanOrEqual(
        0.35,
      );
      expect(height, `${landform.name} became a cliff`).toBeLessThanOrEqual(1.8);
      expect(reach * 2, `${landform.name} is too small to read as terrain`).toBeGreaterThan(
        2.5,
      );
      expect(
        reach * 2,
        `${landform.name} became an oversized polygon instead of a landform`,
      ).toBeLessThanOrEqual(14);
      expect(
        minimumRadialExtent(landform),
        `${landform.name} reaches a gameplay cell`,
      ).toBeGreaterThanOrEqual(protectedRadius);
      expect(
        landformMeshes.length,
        `${landform.name} is an empty declaration`,
      ).toBeGreaterThan(0);
      expect(
        landformMeshes.every((mesh) => mesh.castShadow && mesh.receiveShadow),
        `${landform.name} cannot describe its elevation under the shared key light`,
      ).toBe(true);
      for (const mesh of landformMeshes) {
        const geometry = mesh.geometry;
        triangles += geometry.index
          ? geometry.index.count / 3
          : geometry.getAttribute("position").count / 3;
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const coloured = material as THREE.Material & { readonly color?: THREE.Color };
        if (coloured.color !== undefined) tones.add(coloured.color.getHex());
      }
    }
    expect(tones.size, "the relief is one repeated material").toBeGreaterThanOrEqual(2);
    expect(
      tones.size,
      "the relief exceeds the restrained material family",
    ).toBeLessThanOrEqual(4);
    expect(triangles, "terrain relief triangle budget").toBeLessThanOrEqual(1_200);
  });

  it("shelves through multiple dimensional shore courses instead of ending at one flat edge", () => {
    const island = eraOneIsland();
    island.updateMatrixWorld(true);
    const courses = taggedGroups(island, "prehistoricShoreCourse");
    expect(courses.length, "dimensional shore-course population").toBeGreaterThanOrEqual(3);
    expect(courses.length, "the shore became a terraced staircase").toBeLessThanOrEqual(4);

    const boxes = courses.map((course) => new THREE.Box3().setFromObject(course));
    const elevations = boxes.map((box) => box.max.y).sort((a, b) => b - a);
    for (let index = 1; index < elevations.length; index += 1) {
      expect(
        (elevations[index - 1] ?? 0) - (elevations[index] ?? 0),
        "adjacent shore materials do not descend toward the lagoon",
      ).toBeGreaterThanOrEqual(0.12);
    }
    expect(
      Math.max(...boxes.map((box) => box.max.y)) -
        Math.min(...boxes.map((box) => box.min.y)),
      "the complete shore transition has no readable vertical depth",
    ).toBeGreaterThanOrEqual(0.7);
  });
});
