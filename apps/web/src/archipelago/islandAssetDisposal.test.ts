import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { disposeSceneGraph } from "../city/three/disposeSceneGraph";
import { cloneIslandForTest, disposeIslandCloneForTest } from "./IslandFromManifest";
import type { GlbIslandVisual } from "./islandManifest";

/**
 * **A SUPERSEDED ISLAND HANDS BACK WHAT IT OWNS, AND NOTHING IT BORROWED.**
 *
 * #661 measured the cost of getting this wrong in the other direction — 196MB of RSS and 5623
 * undrawn geometries retained across an era round trip, because `StarterIsland` built its graph
 * imperatively and nobody disposed it. Its fix put that graph on a disposal boundary, and its
 * own header is equally explicit that the boundary must NOT be extended to a GLB clone:
 *
 * > *"`Object3D.clone()` SHARES geometry and material with its source, and the source is drei's
 * > global `useGLTF` cache, which outlives every component and is shared by every lot showing
 * > that model … Disposing one lot's clone would empty the cache entry underneath every other
 * > lot drawing the same building."*
 *
 * An island delivered as a model is exactly that shape. So the rule this file pins is **dispose
 * what you cloned, never what you borrowed**: `cloneIslandForTest` gives the clone its own
 * materials, and the teardown disposes exactly those — leaving the geometry, which is the
 * cache's, intact for the next island.
 *
 * ## THE TWO FAILURES THIS CATCHES, and they are opposite
 *
 *  1. **Disposing too much** — the geometry goes with the clone, and the next island to show
 *     that model draws nothing. This is the one that would look like a game bug.
 *  2. **Disposing too little** — the cloned materials leak on every swap, which is #661's
 *     defect one layer over: a per-swap retention with nothing drawing it.
 *
 * Both are asserted by counting real `dispose()` calls on a real `THREE` graph, so neither can
 * hold by inspection of the source.
 */

const VISUAL: GlbIslandVisual = {
  format: "glb",
  file: "island-era-02-neolithic.glb",
  scale: 1.5,
  rotationY: Math.PI / 4,
  anchor: { x: 2, y: 0, z: -3 },
  seaLevelOffset: 0.75,
};

/** A stand-in for what drei's cache holds: one scene, two meshes, shared geometry. */
function cachedScene(): {
  readonly scene: THREE.Object3D;
  readonly geometries: THREE.BufferGeometry[];
  readonly materials: THREE.Material[];
} {
  const scene = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  for (let at = 0; at < 2; at += 1) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial();
    geometries.push(geometry);
    materials.push(material);
    scene.add(new THREE.Mesh(geometry, material));
  }
  return { scene, geometries, materials };
}

/** Count `dispose()` calls on each object, without changing what dispose does. */
function countDisposals<T extends { dispose: () => void }>(
  targets: readonly T[],
): () => number {
  let calls = 0;
  for (const target of targets) {
    const original = target.dispose.bind(target);
    target.dispose = () => {
      calls += 1;
      original();
    };
  }
  return () => calls;
}

describe("a manifest island's clone", () => {
  it("is seated by its row: scale, turn, anchor and waterline all applied", () => {
    const { scene } = cachedScene();
    const clone = cloneIslandForTest(scene, VISUAL);
    expect(clone.scale.x).toBeCloseTo(1.5);
    expect(clone.rotation.y).toBeCloseTo(Math.PI / 4);
    expect(clone.position.x).toBeCloseTo(2);
    // The anchor's own y PLUS the waterline lift, which is the order the renderer applies.
    expect(clone.position.y).toBeCloseTo(0.75);
    expect(clone.position.z).toBeCloseTo(-3);
  });

  it("does not share materials with the cache, so a tint could never reach another island", () => {
    const { scene, materials } = cachedScene();
    const clone = cloneIslandForTest(scene, VISUAL);
    const cloned: THREE.Material[] = [];
    clone.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        cloned.push(mesh.material as THREE.Material);
      }
    });
    expect(cloned).toHaveLength(2);
    for (const material of cloned) {
      expect(materials.includes(material)).toBe(false);
    }
  });

  it("still shares geometry with the cache, which is what makes a second island cheap", () => {
    const { scene, geometries } = cachedScene();
    const clone = cloneIslandForTest(scene, VISUAL);
    const used: THREE.BufferGeometry[] = [];
    clone.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        used.push(mesh.geometry);
      }
    });
    expect(used).toHaveLength(2);
    for (const geometry of used) {
      expect(geometries.includes(geometry)).toBe(true);
    }
  });
});

describe("superseding a manifest island", () => {
  /**
   * **THE WHOLE CLAIM, AS TWO COUNTS.** The clone's own materials are freed and the cache's
   * geometry is untouched.
   *
   * Injection that fails the first count: drop the teardown, and cloned materials accumulate on
   * every era change — #661's defect, one layer over.
   *
   * Injection that fails the second: reach for `disposeSceneGraph` here instead, which is the
   * mistake this file exists to prevent. It is measured rather than argued in the case below.
   */
  it("frees the materials it cloned and leaves the cache's geometry alone", () => {
    const { scene, geometries } = cachedScene();
    const clone = cloneIslandForTest(scene, VISUAL);
    const cloned: THREE.Material[] = [];
    clone.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        cloned.push(mesh.material as THREE.Material);
      }
    });
    const materialCalls = countDisposals(cloned);
    const geometryCalls = countDisposals(geometries);

    disposeIslandCloneForTest(clone);

    expect(materialCalls()).toBe(2);
    expect(geometryCalls()).toBe(0);
  });

  /**
   * **AND `disposeSceneGraph` IS THE WRONG TOOL HERE, measured.**
   *
   * #661's helper is correct for `StarterIsland`, which owns everything it holds, and it is a
   * cache-emptying bug for a GLB clone. Running it on the clone disposes the cache's geometry —
   * exactly the failure its own header warns about — and this asserts that difference rather
   * than leaving the choice of helper to whoever edits next.
   */
  it("would empty the cache if #661's whole-graph helper were used instead", () => {
    const { scene, geometries } = cachedScene();
    const clone = cloneIslandForTest(scene, VISUAL);
    const geometryCalls = countDisposals(geometries);

    disposeSceneGraph(clone);

    // The cache's geometry, disposed underneath every other island showing this model. This is
    // the assertion that makes "dispose what you cloned, never what you borrowed" a measurement.
    expect(geometryCalls()).toBe(2);
  });
});
