import { useEffect } from "react";
import type * as THREE from "three";

/**
 * Give a built scene graph back to the driver when it is replaced.
 *
 * ## THE HOLE THIS FILLS
 *
 * Several of the city's surfaces build their geometry imperatively — the island, the
 * roads, the citizens — and hand the finished `THREE.Object3D` to the renderer with
 * `<primitive object={group} />`. **react-three-fiber never disposes a `<primitive>`**,
 * and that is deliberate rather than an oversight on its part: the object was
 * constructed outside the reconciler, so the reconciler will not assume it may destroy
 * it. Disposal is therefore the builder's job.
 *
 * It was nobody's. A `useMemo` keyed on the era rebuilt the island on every advance and
 * dropped the previous one, whose meshes then left the scene and stopped being drawn
 * while every one of their GPU buffers stayed allocated: three frees those only from an
 * explicit `dispose()`, and a geometry that is merely unreachable is never disposed at
 * all. Garbage collection does not help, and in fact makes it worse — once the JS object
 * is collected there is nothing left that COULD be disposed, so the buffers are stranded
 * for the lifetime of the GL context.
 *
 * ## THE PRECONDITION, AND IT IS NOT NEGOTIABLE
 *
 * **Every geometry, material and texture in the graph must be owned by that graph.** The
 * traversal below is unconditional, so a resource shared with anything outside the graph
 * is destroyed for the sharer too. Two shapes in this tree fail that test and must not
 * be handed to {@link useDisposableGraph} as they stand:
 *
 *  - **A module-level singleton.** `Roads.tsx` (`LUMP_GEO`, `FRAME_GEO_EW`, `PICK_MAT`
 *    and others), `Vehicles.tsx` (`POLE_GEO` and its four siblings), `ScarredGround.tsx`
 *    (`SCAR_GEOMETRY`, `SCAR_MATERIAL`, `SCAR_HATCH_MATERIAL`) and
 *    `winterFrostFront.ts` (`PLATE_GEO`) each build one geometry at module scope and
 *    reuse it across every instance. Disposing one does not break the picture — three
 *    re-uploads from the CPU-side attributes on the next draw — but it makes an era
 *    change re-upload and recompile everything those singletons touch, which is the
 *    stutter this work exists to remove.
 *  - **A clone of a cached GLB.** `Object3D.clone()` SHARES geometry and material with
 *    its source, and the source is drei's global `useGLTF` cache, which outlives every
 *    component and is shared by every lot showing that model. `PlacedBuilding`,
 *    `GhostBuilding`, `BuildingThumb`, `ReelBuilding`, `GridworkModelPreview` and
 *    `BuildingFrostCrust` are all this shape. Disposing one lot's clone would empty the
 *    cache entry underneath every other lot drawing the same building.
 *
 * `StarterIsland` is neither: `buildIslandGroup` and `buildBirds` construct every
 * geometry per call and `mat()` returns a fresh `MeshStandardMaterial` each time, so the
 * group owns the whole of what it holds.
 */

/** Anything with a `dispose()`, narrowed to what the traversal needs to call. */
interface Disposable {
  dispose: () => void;
}

function disposeOnce(seen: Set<unknown>, resource: unknown): void {
  if (resource === null || resource === undefined || seen.has(resource)) {
    return;
  }
  seen.add(resource);
  const maybe = resource as Partial<Disposable>;
  if (typeof maybe.dispose === "function") {
    maybe.dispose();
  }
}

/**
 * A material's own textures. Read off the material's OWN enumerable properties rather
 * than from a written-down list of map names, so a `normalMap` or an `alphaMap` added to
 * a surface later is released without anybody remembering to extend a list here — the
 * exact shape of omission that leaves one texture per rebuild behind.
 */
function disposeMaterial(seen: Set<unknown>, material: THREE.Material): void {
  for (const value of Object.values(material as unknown as Record<string, unknown>)) {
    if (value !== null && typeof value === "object" && (value as THREE.Texture).isTexture) {
      disposeOnce(seen, value);
    }
  }
  disposeOnce(seen, material);
}

/**
 * Release every geometry, material and texture under `root`.
 *
 * Idempotent and safe on a partially built graph: a node with no geometry, a material
 * array, and a repeated reference all land on the same `seen` set, so nothing is
 * disposed twice and nothing throws on the way. The `root` itself is NOT removed from
 * its parent — react-three-fiber has already done that by the time this runs, and doing
 * it here would fight the reconciler for ownership of the scene graph.
 */
export function disposeSceneGraph(root: THREE.Object3D): void {
  const seen = new Set<unknown>();
  root.traverse((node) => {
    const holder = node as unknown as {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    disposeOnce(seen, holder.geometry);
    const material = holder.material;
    if (Array.isArray(material)) {
      for (const one of material) {
        disposeMaterial(seen, one);
      }
    } else if (material) {
      disposeMaterial(seen, material);
    }
  });
}

/**
 * Dispose `graph` when it is replaced by a different one, and when the component
 * unmounts.
 *
 * Keyed on the OBJECT and not on whatever the caller memoised it from, which is what
 * makes it correct without knowing anything about the builder's inputs: a new object is
 * a new effect, so React runs the previous cleanup — releasing exactly the graph that
 * has just stopped being rendered — and a memo that returns the same object runs nothing.
 *
 * Read the precondition in this module's header before adding a call site.
 */
export function useDisposableGraph(graph: THREE.Object3D | null | undefined): void {
  useEffect(() => {
    if (!graph) {
      return;
    }
    return () => disposeSceneGraph(graph);
  }, [graph]);
}
