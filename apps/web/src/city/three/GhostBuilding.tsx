import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { type RefObject, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { resolveBuildingModel } from "../buildingAssets";
import { earlyModernVariantForNode } from "../earlyModernBuildingVariants";
import { type Footprint, GRID_CELL, SURFACE_Y } from "../worldLayout";
import { neutralBuiltModel } from "./constructionStages";
import { earlyModernBuiltModel } from "./earlyModernBuildingModels";
import {
  GHOST_PREPARATION,
  type GridworkPreparer,
  prepareGridworkModel,
  registerPreparedMaterial,
  retainPreparedModel,
} from "./modelPreparation";

/**
 * The placement "blueprint" ghost: the chosen building's completed model rendered
 * as a translucent draft that SNAPS cell-to-cell to the grid-snapped drop target
 * while placing (strict CoC gridlock — it jumps between whole cells, never glides
 * off-grid), with a footprint tile beneath it. The target + rotation + validity
 * live in shared refs driven by `CityScene` (drag or keyboard). The ghost + tile
 * tint GREEN over a valid open spot and ROSE when off-island or overlapping. It
 * sits flat on the grass — no vertical hover. Decorative; the DOM bar carries
 * semantics.
 *
 * `url` is NULLABLE, and the null branch is the same defect the placed building had. A node
 * with no `built` GLB — 56 of the 62 are unmapped, and every one of them became placeable
 * when the city's roster stopped being era one's six — used to make `CityScene` skip the
 * ghost entirely, so "Build here" put nothing under the cursor. With no url the ghost draws
 * the shared neutral built shell (`constructionStages.ts`), which is exactly what the placed
 * building will be, so the preview keeps its one promise: what you see is what you get.
 */

const VALID_GREEN = new THREE.Color("#5bbf72");
const INVALID_ROSE = new THREE.Color("#e06a94");
const TINT = 0.25;

interface PreparedGhost {
  readonly object: THREE.Object3D;
  readonly material: THREE.MeshStandardMaterial;
}

/** Only a skill whose completed model is procedural receives the placement-ghost overlay. */
export function ghostBuildingIdentity(nodeId?: string): string | undefined {
  if (!nodeId) return undefined;
  return resolveBuildingModel(nodeId, "built").kind === "glb" ? undefined : nodeId;
}

export function prepareGhost(
  scene: THREE.Object3D,
  footprint: Footprint,
  prepare: GridworkPreparer = prepareGridworkModel,
  buildingIdentity?: string,
): PreparedGhost {
  // The ghost is the finished model, fit and grounded through the same geometry seam as
  // placement. Tagged assets restore node metadata only; the app material below owns its look.
  const root = prepare(scene, footprint, {
    ...GHOST_PREPARATION,
    ...(buildingIdentity ? { buildingIdentity } : {}),
  });
  const material = new THREE.MeshStandardMaterial({
    color: VALID_GREEN.clone(),
    emissive: VALID_GREEN.clone(),
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.5,
    roughness: 0.45,
    metalness: 0,
    depthWrite: false,
  });
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.material = material;
    }
  });
  registerPreparedMaterial(root, material);
  return { object: root, material };
}

/**
 * The translucent body, and the tint that tracks validity. Split out from
 * {@link GhostBuilding} so the source model can be chosen WITHOUT a conditional hook:
 * `useGLTF` cannot be called on a maybe-url, so the two sources are two components rather
 * than two branches inside one.
 */
function GhostBody({
  scene,
  footprint,
  buildingIdentity,
  validRef,
  reducedMotion,
}: {
  scene: THREE.Object3D;
  footprint: Footprint;
  buildingIdentity?: string;
  validRef: RefObject<boolean>;
  reducedMotion: boolean;
}) {
  const { object, material } = useMemo(
    () => prepareGhost(scene, footprint, prepareGridworkModel, buildingIdentity),
    [scene, footprint, buildingIdentity],
  );
  useEffect(() => retainPreparedModel(object), [object]);

  useFrame(() => {
    const tint = validRef.current ? VALID_GREEN : INVALID_ROSE;
    if (reducedMotion) {
      material.color.copy(tint);
      material.emissive.copy(tint);
    } else {
      material.color.lerp(tint, TINT);
      material.emissive.lerp(tint, TINT);
    }
  });

  return <primitive object={object} />;
}

/** The ghost body from a node's own `built` GLB. Suspends while the file loads. */
function GlbGhostBody({
  url,
  footprint,
  buildingIdentity,
  validRef,
  reducedMotion,
}: {
  url: string;
  footprint: Footprint;
  buildingIdentity?: string;
  validRef: RefObject<boolean>;
  reducedMotion: boolean;
}) {
  const gltf = useGLTF(url);
  return (
    <GhostBody
      scene={gltf.scene}
      footprint={footprint}
      buildingIdentity={buildingIdentity}
      validRef={validRef}
      reducedMotion={reducedMotion}
    />
  );
}

export function GhostBuilding({
  url,
  nodeId,
  footprint,
  targetRef,
  rotationRef,
  validRef,
  reducedMotion,
}: {
  /** This node's finished GLB, or `null` to preview the shared neutral built shell. */
  url: string | null;
  /** Canonical skill identity; omitted for civic previews and isolated fixtures. */
  nodeId?: string;
  footprint: Footprint;
  /** Shared world-space drop-target center (x/z used); driven by CityScene. */
  targetRef: RefObject<THREE.Vector3>;
  /** Shared target rotationY (radians) from the current quarter-turn. */
  rotationRef: RefObject<number>;
  /** Shared validity flag: true = green (valid), false = rose (blocked). */
  validRef: RefObject<boolean>;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const tileMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const buildingIdentity = ghostBuildingIdentity(nodeId);
  const neutralShell = useMemo(() => {
    const variant = nodeId ? earlyModernVariantForNode(nodeId) : null;
    return (
      (variant ? earlyModernBuiltModel(variant) : null) ?? neutralBuiltModel(footprint)
    );
  }, [nodeId, footprint]);

  // Seat the ghost at its target on mount so it never flies in from the origin.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refs are stable; run once on mount.
  useEffect(() => {
    const group = groupRef.current;
    const target = targetRef.current;
    if (group && target) {
      group.position.set(target.x, SURFACE_Y, target.z);
      group.rotation.y = rotationRef.current;
    }
  }, []);

  useFrame(() => {
    const group = groupRef.current;
    const target = targetRef.current;
    if (!group || !target) {
      return;
    }
    // Strict whole-cell gridlock: snap to the target cell every frame so the ghost
    // JUMPS discretely cell-to-cell as the cursor crosses boundaries (no gliding).
    group.position.set(target.x, SURFACE_Y, target.z);
    // Rotation is stepped (never dragged), so snap it — a crisp CoC quarter-turn.
    group.rotation.y = rotationRef.current;

    const tint = validRef.current ? VALID_GREEN : INVALID_ROSE;
    if (reducedMotion) {
      tileMatRef.current?.color.copy(tint);
    } else {
      tileMatRef.current?.color.lerp(tint, TINT);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[footprint.w * GRID_CELL, footprint.d * GRID_CELL]} />
        <meshBasicMaterial
          ref={tileMatRef}
          color={VALID_GREEN}
          transparent
          opacity={0.42}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* The body suspends on its own boundary when it is a GLB, so a slow fetch shows the
          footprint tile rather than blanking the whole ghost. The neutral shell is
          procedural and never suspends. */}
      {url ? (
        <Suspense fallback={null}>
          <GlbGhostBody
            url={url}
            footprint={footprint}
            buildingIdentity={buildingIdentity}
            validRef={validRef}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      ) : (
        <GhostBody
          scene={neutralShell}
          footprint={footprint}
          buildingIdentity={buildingIdentity}
          validRef={validRef}
          reducedMotion={reducedMotion}
        />
      )}
    </group>
  );
}
