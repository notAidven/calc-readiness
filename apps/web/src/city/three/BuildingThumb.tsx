import { Bounds, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import type * as THREE from "three";

import { resolveBuildingModel } from "../buildingAssets";
import { resolveCivicModel } from "../civicBuildings";
import { earlyModernVariantForNode } from "../earlyModernBuildingVariants";
import { footprintFor } from "../worldLayout";
import { neutralBuiltModel } from "./constructionStages";
import { earlyModernBuiltModel } from "./earlyModernBuildingModels";
import {
  type GridworkPreparer,
  prepareGridworkModel,
  retainPreparedModel,
  THUMB_PREPARATION,
} from "./modelPreparation";

/**
 * A small, static LIVE thumbnail of a building's finished (`built`) model — the same
 * geometry the city renders, shown in the build-menu cards so students see
 * what they'll build before building it. It reuses `GridworkModelPreview`'s model
 * grammar (clone the GLB scene, revive the flat-shaded materials glTF can't carry)
 * but is deliberately lean: no shadows, no orbit controls, `frameloop="demand"` so
 * each card renders ONCE (after the model + auto-fit settle) and then idles — six
 * of these stay cheap. The canvas is decorative (`aria-hidden` + `pointer-events:
 * none` via CSS), so clicks fall through to the enclosing card button.
 *
 * IT SERVES BOTH CLASSES OF BUILDING THROUGH ONE CANVAS. A skill building is
 * addressed by node id and a BOUGHT civic one by its catalogue type
 * (`civicBuildings.ts`), and the only difference between them is which resolver
 * {@link thumbModelUrl} calls — everything below it (lighting, auto-fit, the
 * on-demand single frame) is shared, so the two tabs of the build menu cannot drift
 * into two different-looking previews.
 *
 * NOTHING MASTERY-SHAPED LIVES HERE, which is what makes the civic reuse safe: no
 * star rack, no build phase, no "not built yet" state. The subject resolves at
 * `built` and only `built` — the one stage a civic type has a committed file for,
 * and asking for another would hand back the neutral procedural stand-in.
 *
 * A NODE with no `built` GLB draws the shared neutral built shell rather than an empty
 * card, so the shop card, the placement ghost and the placed building all preview the
 * same thing. Before the era roster landed this returned `null` for such a node, which
 * was invisible because no unmapped node could reach a card. **A CIVIC TYPE with no
 * bundled file still returns `null`**, and that asymmetry is the footprint: the neutral
 * shell is built from `footprintFor(nodeId)`, which is keyed on the skill registry and
 * has nothing to say about a catalogue type. An unauthored civic row is an authoring
 * gap to fix rather than a shape to guess at.
 */

/** Prepare one thumbnail without gameplay fitting or shadows. */
export function prepareThumbModel(
  scene: THREE.Object3D,
  prepare: GridworkPreparer = prepareGridworkModel,
  buildingIdentity?: string,
): THREE.Object3D {
  return prepare(scene, null, {
    ...THUMB_PREPARATION,
    ...(buildingIdentity ? { buildingIdentity } : {}),
  });
}

function ThumbModel({ url, buildingIdentity }: { url: string; buildingIdentity?: string }) {
  const gltf = useGLTF(url);
  const invalidate = useThree((state) => state.invalidate);
  const model = useMemo(
    () => prepareThumbModel(gltf.scene, prepareGridworkModel, buildingIdentity),
    [gltf.scene, buildingIdentity],
  );

  useEffect(() => retainPreparedModel(model), [model]);

  // On-demand rendering: nudge a frame once the model (and Bounds' fit) is ready.
  // `model` stays in the deps so this re-fires when the GLB finishes loading.
  useEffect(() => {
    if (model) {
      invalidate();
    }
  }, [invalidate, model]);

  return <primitive object={model} />;
}

/**
 * Which building a thumbnail shows: a skill node, or a civic catalogue type. Two
 * shapes rather than one string, because the two id spaces are owned by different
 * registries and a bare string would let a civic type be looked up as a node id (and
 * resolve to nothing) with no type error.
 */
export type ThumbSubject = { readonly nodeId: string } | { readonly civicType: string };

/** Only a skill whose completed model is procedural receives the thumbnail overlay identity. */
export function thumbBuildingIdentity(subject: ThumbSubject): string | undefined {
  if ("civicType" in subject) return undefined;
  return resolveBuildingModel(subject.nodeId, "built").kind === "glb"
    ? undefined
    : subject.nodeId;
}

/**
 * The finished-model url a subject previews, or `null` when nothing is bundled for
 * it. Exported so the wiring can be asserted without a WebGL context: jsdom cannot
 * mount the canvas, so this is where "the civic card previews a real GLB" is checkable.
 */
export function thumbModelUrl(subject: ThumbSubject): string | null {
  return "civicType" in subject
    ? (resolveCivicModel(subject.civicType, "built")?.url ?? null)
    : (resolveBuildingModel(subject.nodeId, "built").url ?? null);
}

/** The same thumbnail from the shared neutral built shell — procedural, so it never fetches. */
function NeutralThumbModel({
  nodeId,
  buildingIdentity,
}: {
  nodeId: string;
  buildingIdentity?: string;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const model = useMemo(() => {
    const variant = earlyModernVariantForNode(nodeId);
    const source =
      (variant ? earlyModernBuiltModel(variant) : null) ??
      neutralBuiltModel(footprintFor(nodeId));
    return prepareThumbModel(source, prepareGridworkModel, buildingIdentity);
  }, [nodeId, buildingIdentity]);

  useEffect(() => retainPreparedModel(model), [model]);

  // Procedural, so it is ready on the first render; on-demand rendering still wants the
  // same one-frame nudge the GLB path takes once its model settles.
  useEffect(() => {
    if (model) {
      invalidate();
    }
  }, [invalidate, model]);

  return <primitive object={model} />;
}

export default function BuildingThumb(subject: ThumbSubject) {
  const url = thumbModelUrl(subject);
  const buildingIdentity = thumbBuildingIdentity(subject);
  // Resolved BEFORE the early return so the narrowing survives into the canvas below: a
  // node always has a shell to fall back to, a civic type never does (see the header).
  const fallback =
    "nodeId" in subject ? (
      <NeutralThumbModel nodeId={subject.nodeId} buildingIdentity={buildingIdentity} />
    ) : null;
  if (url === null && fallback === null) {
    return null;
  }
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [46, 33, 46], fov: 32, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Cool hemisphere + warm key, matching the Gridwork diorama, minus shadows. */}
      <hemisphereLight args={["#e3ecf7", "#c2c8d4", 0.95]} />
      <ambientLight color="#eef3fb" intensity={0.35} />
      <directionalLight position={[-30, 52, 32]} intensity={1.1} color="#fff3e2" />
      <directionalLight position={[28, 18, -30]} intensity={0.35} color="#bcd4e6" />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.25}>
          {url ? <ThumbModel url={url} buildingIdentity={buildingIdentity} /> : fallback}
        </Bounds>
      </Suspense>
    </Canvas>
  );
}
