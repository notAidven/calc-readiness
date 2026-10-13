import type { EraId } from "@cr/skill-graph";
import { useGLTF } from "@react-three/drei";
import { type ReactElement, Suspense, useEffect, useMemo } from "react";
import type * as THREE from "three";

import { StarterIsland } from "../city/three/StarterIsland";
import type { CityLayout } from "../city/worldLayout";
import { type GlbIslandVisual, islandVisual } from "./islandManifest";

/**
 * **THE ONE PLACE THE ISLAND MANIFEST BECOMES A PICTURE.**
 *
 * `islandManifest.ts` is the row Evan edits; this is the only code that reads it and draws
 * something. `CityScene` mounts this instead of mounting `StarterIsland` directly, so the
 * dispatch between *"the procedural island"* and *"Evan's model"* lives in one component with
 * one decision in it.
 *
 * ## ⚑ WHY THE DISPATCH IS HERE AND NOT INSIDE `StarterIsland`
 *
 * `StarterIsland.tsx` is 3030 lines of procedural geometry and is under active change in two
 * other lanes tonight — #661 puts its graph on a disposal boundary and #660/#662 move the
 * camera around it. A branch added inside it would conflict with both for no gain, and it would
 * put *"which island do we draw"* in the middle of *"how is this island built"*. So this
 * component owns the choice and `StarterIsland` stays exactly what it is: the procedural
 * island, unchanged, and still the thing that draws when no model has been delivered.
 *
 * ## THE PROCEDURAL ISLAND IS NOT BUILT WHEN A MODEL WILL BE DRAWN
 *
 * `StarterIsland` is simply not mounted on a `glb` era, which is what makes the manifest cost
 * nothing per era rather than costing both paths: #661 measured `buildIslandGroup` at **344
 * meshes and 19,150 vertices** for one island, so building it as a mere Suspense fallback would
 * pay the whole price of the thing it is replacing. The fallback during load is `null` — one
 * frame of no island, which is the same fallback every placed building already has, and the
 * `<Suspense>` boundary `CityScene` already wraps this in is where it lands.
 *
 * **The fallback for a MISSING file is different and it is the procedural island**, decided in
 * `islandManifest.islandVisual` rather than here: a row pointing at nothing resolves to
 * `procedural`, so this component never sees a URL that will not load. That split is deliberate
 * — *"absent asset"* is a manifest question and *"still arriving"* is a renderer question.
 *
 * ## DISPOSAL GOES THROUGH THE SAME OWNERSHIP BOUNDARY #661 ESTABLISHED
 *
 * #661's finding, in its words: react-three-fiber *"never disposes a `<primitive>`, on purpose —
 * the object was built outside the reconciler"*. A `useGLTF` scene is worse than that, because
 * it is SHARED: drei caches it, and several islands may be showing clones of one load. So the
 * rule this component follows is the one #661's `disposeSceneGraph.ts` header sets out for the
 * ten sites it deliberately left alone — **dispose what you cloned, never what you borrowed.**
 *
 * {@link islandClone} clones the cached scene and gives the CLONE its own materials, and the
 * effect below disposes exactly those: the clone's geometries are shared with the cache and are
 * left alone, so the cache stays intact for the next island and nothing double-frees. What that
 * leaves is drei's own cache, which nothing here evicts — #661 measured it as a cache rather
 * than a leak (frozen across five consecutive era advances) and named eviction as deferred work.
 */

/**
 * A drawable copy of a cached GLTF scene, seated by its manifest row.
 *
 * `clone(true)` is `PlacedBuilding.prepareModel`'s own first move. Materials are cloned on top
 * of that because a seated island may be tinted or fogged per era later, and a material mutated
 * in place would reach every other clone of the same load.
 */
export function islandClone(
  scene: THREE.Object3D,
  visual: GlbIslandVisual,
): THREE.Object3D {
  const root = scene.clone(true);
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((entry) => entry.clone())
      : mesh.material.clone();
  });
  root.scale.setScalar(visual.scale);
  root.rotation.y = visual.rotationY;
  // ANCHOR FIRST, THEN THE WATERLINE. The anchor moves the model's own origin onto the island
  // centre; the sea-level offset then lifts the whole thing so its shore meets the lagoon the
  // game draws. Applied in that order because the offset is measured on the model, so it has to
  // be added after the model has been put where it belongs.
  root.position.set(
    visual.anchor.x,
    visual.anchor.y + visual.seaLevelOffset,
    visual.anchor.z,
  );
  return root;
}

/** Free the materials this component cloned. Geometry is the cache's and is left alone. */
export function disposeClonedMaterials(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      material.dispose();
    }
  });
}

/** Evan's island, loaded on demand and seated by its row. Suspends while the file arrives. */
function ManifestIsland({
  url,
  visual,
}: {
  readonly url: string;
  readonly visual: GlbIslandVisual;
}): ReactElement {
  const gltf = useGLTF(url);
  const object = useMemo(() => islandClone(gltf.scene, visual), [gltf.scene, visual]);
  useEffect(() => () => disposeClonedMaterials(object), [object]);
  return <primitive object={object} />;
}

/**
 * **THE ISLAND, WHICHEVER ONE THIS ERA HAS.**
 *
 * The props are `StarterIsland`'s own, unchanged, so the swap at `CityScene`'s mount site is one
 * identifier and the procedural path is byte-for-byte what it was.
 */
export function IslandFromManifest({
  layout,
  reducedMotion,
  eraId,
}: {
  readonly layout: CityLayout;
  readonly reducedMotion: boolean;
  readonly eraId?: EraId;
}): ReactElement {
  const resolved = eraId === undefined ? null : islandVisual(eraId);
  if (resolved === null || resolved.url === null) {
    return <StarterIsland layout={layout} reducedMotion={reducedMotion} eraId={eraId} />;
  }
  return (
    <Suspense fallback={null}>
      <ManifestIsland url={resolved.url} visual={resolved.visual} />
    </Suspense>
  );
}

/**
 * The two halves of the clone's lifetime, exported under test names.
 *
 * Aliases rather than a second implementation, and named so a reader of `islandAssetDisposal
 * .test.ts` can see at a glance that the thing measured there is the thing that ships. The
 * alternative — a component test driving an R3F canvas to count `dispose()` calls — would test
 * the same two functions through three layers that have nothing to do with the claim.
 */
export const cloneIslandForTest = islandClone;
export const disposeIslandCloneForTest = disposeClonedMaterials;
