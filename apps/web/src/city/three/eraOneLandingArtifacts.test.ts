import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { islandGround } from "../islandGround";
import { eraCityLayout, eraLandRadius } from "../islandLand";
import {
  buildIslandGroup,
  PREHISTORIC_BOAT_PADDLE,
  PREHISTORIC_HIDE_BOAT,
} from "./StarterIsland";

function objectPath(object: THREE.Object3D, root: THREE.Object3D): string {
  const names: string[] = [];
  for (
    let current: THREE.Object3D | null = object;
    current !== null && current !== root;
  ) {
    names.push(current.name || "(unnamed)");
    current = current.parent;
  }
  return names.reverse().join("/");
}

/**
 * Rock-coloured geometry in the narrow Era 1 landing corridor.
 *
 * This population is behavioural, not an implementation-name list: it sees both the named
 * faceted slipway patches and the unnamed loose pebbles that continue their diagonal to the
 * water. The boat and paddle use hide/timber tones, so preserving them cannot satisfy or trip
 * this census.
 */
function landingRockArtifacts(): readonly string[] {
  const eraId = "prehistoric";
  const grassRadius = eraLandRadius(eraId);
  const root = buildIslandGroup(eraCityLayout(eraId), islandGround(eraId), grassRadius);
  const tones = islandGround(eraId).tones;
  const rockColours = new Set([
    tones.coarseSand,
    tones.gravel,
    tones.gravelWet,
    ...tones.rockTones,
  ]);
  const artifacts: string[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    const path = objectPath(mesh, root);
    const centre = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
    const inCampLanding =
      path.startsWith("windblown-camp/") &&
      Math.abs(centre.x) <= 3 &&
      centre.z >= grassRadius - 3.4 &&
      centre.z <= grassRadius + 5.2;
    const inAdjacentNaturalLanding =
      !path.startsWith("windblown-camp/") &&
      centre.x >= 3 &&
      centre.x <= 13 &&
      centre.z >= grassRadius - 6;
    if (!inCampLanding && !inAdjacentNaturalLanding) {
      return;
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const rockColoured = materials.some((material) => {
      const coloured = material as THREE.Material & { readonly color?: THREE.Color };
      return coloured.color !== undefined && rockColours.has(coloured.color.getHex());
    });
    if (rockColoured) {
      artifacts.push(`${path} @ ${centre.x.toFixed(2)},${centre.z.toFixed(2)}`);
    }
  });
  return artifacts;
}

describe("Era 1's boat landing does not read as a rock trail", () => {
  it("keeps rock-coloured patches and loose pebbles out of the landing corridor", () => {
    expect(landingRockArtifacts()).toEqual([]);
  });

  // 2026-08-21: the windblown-camp feature group -- hearth, drying rack, midden, flint
  // scatter, and this boat landing among them -- was retired entirely ("theres still excess
  // stuff laying around on the island... delete all the brown stuff. there should be like 8
  // things total"). The boat and paddle it built are gone along with the gravel trail they
  // used to justify; era one no longer builds a landing at all.
  it("no longer builds a boat or paddle now that the camp is retired", () => {
    const eraId = "prehistoric";
    const root = buildIslandGroup(
      eraCityLayout(eraId),
      islandGround(eraId),
      eraLandRadius(eraId),
    );
    expect(root.getObjectByName(PREHISTORIC_HIDE_BOAT)).toBeUndefined();
    expect(root.getObjectByName(PREHISTORIC_BOAT_PADDLE)).toBeUndefined();
  });
});
