import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { islandGround } from "../islandGround";
import { eraCityLayout, eraLandRadius } from "../islandLand";
import { walkableRadiusFor } from "../worldLayout";
import { buildIslandGroup } from "./StarterIsland";

/**
 * The Era 1 guide ratifies a sparse family of rounded boulders in loose shoreline clusters.
 * The older procedural island that the guide calls "exactly right" bounded a lead boulder's
 * horizontal reach at 0.566 world units. Keep a little arithmetic headroom without letting a
 * shoreline stone become a building-sized outcrop.
 */
const MAX_SHORE_ROCK_REACH = 0.6;

/**
 * 2026-08-21: both named natural families were deliberately removed on explicit request ("take
 * out any of the art thats not the trees, it just looks so bad"), leaving era one's shoreline
 * with no rock props at all — only its trees and terrain. The populations below are pinned to
 * zero rather than deleted, so a future model replacement that quietly reintroduces rocks here
 * has to update this file explicitly instead of the guard going vacuously permissive. This is
 * deliberately separate from the boat landing: no count here can require the retired diagonal
 * slipway patches or loose pebbles to come back either.
 */
const GRAVEL_SHELF_POPULATION = { min: 0, max: 0 } as const;
const BOULDER_CLUSTER_POPULATION = { min: 0, max: 0 } as const;
const MAX_SHORE_ROCK_POPULATION = 0;

interface ShoreRockReading {
  readonly name: string;
  readonly radialCenter: number;
  readonly reach: number;
}

function objectPath(object: THREE.Object3D, root: THREE.Object3D): string {
  const names: string[] = [];
  for (let at: THREE.Object3D | null = object; at !== null && at !== root; at = at.parent) {
    names.push(at.name || "(unnamed)");
  }
  return names.reverse().join("/");
}

/**
 * Read the rocks that actually land at the Era 1 waterline from the complete runtime graph.
 *
 * The checked-in source ports these props as raw DodecahedronGeometry. The radial filter excludes
 * the camp's hearth/flint and the scattered interior stones while including both shoreline
 * systems present in the reported frame. A future model replacement has to update this census
 * explicitly rather than making the population guard vacuously empty.
 */
function eraOneShoreRocks(): readonly ShoreRockReading[] {
  const grassRadius = eraLandRadius("prehistoric");
  const root = buildIslandGroup(
    eraCityLayout("prehistoric"),
    islandGround("prehistoric"),
    grassRadius,
  );
  const readings: ShoreRockReading[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || mesh.geometry.type !== "DodecahedronGeometry") {
      return;
    }
    mesh.geometry.computeBoundingSphere();
    const sphere = mesh.geometry.boundingSphere;
    if (sphere === null) {
      throw new Error(`${objectPath(mesh, root)} has no geometry bounds`);
    }
    const center = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
    const radialCenter = Math.hypot(center.x, center.z);
    if (radialCenter < grassRadius - 2) {
      return;
    }
    const worldScale = new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld);
    readings.push({
      name: objectPath(mesh, root),
      radialCenter,
      reach: sphere.radius * Math.max(worldScale.x, worldScale.y, worldScale.z),
    });
  });
  return readings;
}

function eraOneShoreFamilyMeshes(name: string): number {
  const root = buildIslandGroup(
    eraCityLayout("prehistoric"),
    islandGround("prehistoric"),
    eraLandRadius("prehistoric"),
  );
  let meshes = 0;
  root.getObjectByName(name)?.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) meshes += 1;
  });
  return meshes;
}

describe("Era 1 shoreline rocks stay loose, small, and outside the city", () => {
  it("has one sparse shoreline population, not two complete overlapping systems", () => {
    const rocks = eraOneShoreRocks();
    const gravelShelf = eraOneShoreFamilyMeshes("gravel-shelf");
    const boulderClusters = eraOneShoreFamilyMeshes("shore-boulder-clusters");
    expect(gravelShelf, "the retired gravel shelf came back").toBeGreaterThanOrEqual(
      GRAVEL_SHELF_POPULATION.min,
    );
    expect(gravelShelf, "the gravel shelf rebuilt a rubble necklace").toBeLessThanOrEqual(
      GRAVEL_SHELF_POPULATION.max,
    );
    expect(
      boulderClusters,
      "the retired natural boulder clusters came back",
    ).toBeGreaterThanOrEqual(BOULDER_CLUSTER_POPULATION.min);
    expect(
      boulderClusters,
      "the natural boulder clusters became a continuous rock band",
    ).toBeLessThanOrEqual(BOULDER_CLUSTER_POPULATION.max);
    expect(
      rocks.length,
      "the public Era 1 shore contains a duplicated gravel-and-boulder population",
    ).toBeLessThanOrEqual(MAX_SHORE_ROCK_POPULATION);
    expect(
      rocks.length,
      "the runtime shore census disagrees with its two named natural families",
    ).toBe(gravelShelf + boulderClusters);
  });

  it("keeps every shoreline rock within the approved lead-boulder reach", () => {
    const oversized = eraOneShoreRocks()
      .filter((rock) => rock.reach > MAX_SHORE_ROCK_REACH)
      .map((rock) => `${rock.name} (${rock.reach.toFixed(3)}u)`);
    expect(
      oversized,
      `Era 1 shoreline rocks exceed the ${MAX_SHORE_ROCK_REACH}u style limit`,
    ).toEqual([]);
  });

  it("keeps the complete rock body outside every buildable and walkable cell", () => {
    const floor = walkableRadiusFor(eraCityLayout("prehistoric").buildableRadius);
    const intruding = eraOneShoreRocks()
      .filter((rock) => rock.radialCenter - rock.reach < floor)
      .map(
        (rock) =>
          `${rock.name} reaches ${(rock.radialCenter - rock.reach).toFixed(3)}u ` +
          `inside the ${floor}u protected disc`,
      );
    expect(intruding).toEqual([]);
  });
});
