import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";

/**
 * Redraw the shadow map when something that casts a shadow has changed, and not otherwise.
 *
 * ## WHY THERE IS ANYTHING TO SAVE HERE
 *
 * The city runs `frameloop="always"`, and it has to: citizens walk, gulls circle and
 * carts move, so the picture genuinely differs every frame and `frameloop="demand"` would
 * stop all three. **But none of those three casts a shadow** — `Citizens.tsx`,
 * `Vehicles.tsx` and `StarterIsland.tsx`'s `makeBirdNodes` each set `castShadow = false`,
 * deliberately and long before this file existed. So while a player is looking at the
 * city, the picture changes every frame and the SHADOW MAP does not.
 *
 * Three has no way to know that. `WebGLShadowMap.autoUpdate` defaults to true, so the
 * whole shadow map was re-rendered from scratch on every submission: every static
 * boulder, tree, prop and building drawn a second time, into a 2048x2048 depth target, to
 * produce the identical depth buffer it produced the frame before.
 *
 * Re-measured after #671 batched the island, on dev and production at 1024x580 under 4x
 * CPU throttling (`scripts/profile-city-frames.mjs`): the current directional pass is
 * **58.7 of 137.3 dev draws per submission** and **16.3 of 45.3 production draws**.
 * The repaired signature takes the settled dev city from 150.0ms to 116.7ms and production
 * from 100.0ms to 83.4ms. In both builds the `no-shadows` and `frozen-shadows` ablations
 * are draw-for-draw identical; the remaining offscreen work is Drei's contact-shadow pass.
 *
 * ## WHAT MAKES IT SAFE, AND IT IS NOT A LIST OF CALLERS
 *
 * A frozen shadow map is a bug: a building placed afterwards would cast nothing, and a
 * stale shadow under a moved object is worse than a correct expensive one. The obvious
 * design — every component that animates a caster calls an invalidate function — puts the
 * correctness in a list somebody has to remember to join, and a missed entry is an
 * invisible wrong shadow rather than a crash.
 *
 * So this DERIVES the answer instead. {@link shadowCastingSignature} walks the scene once
 * a frame and folds together everything the shadow map is a function of — every shadow
 * participant's transform, visibility, identity, geometry and material depth state; each
 * `InstancedMesh` upload and live count; and each shadow-casting light's frustum. If that
 * number moved, the map is re-rendered. Nothing has to opt in: a placed building changes
 * the identity sum, a moved Town Hall changes a position, an instanced prop updates its
 * instance buffer, an era change replaces the island, and a crisis light swings the frustum.
 *
 * The traversal is the cost this trades for the pass. On the post-#671 graph the profiler's
 * `static-island-matrices` ablation remains numerically level with baseline at 183.4ms and
 * 137.3 draws per submission; removing traversal work moves nothing next to removing the
 * depth submissions.
 *
 * ## THE TRANSFORMS ARE READ AT SOURCE, NOT FROM `matrixWorld`
 *
 * `matrixWorld` is composed inside `renderer.render()`, so reading it from a `useFrame`
 * gives the PREVIOUS frame's value and the shadow would lag a frame behind the object
 * casting it. `position`, `quaternion` and `scale` are what a caller actually assigns, so
 * they are current when this runs. Ancestors are folded in for the same reason a child's
 * own transform is: a group that moves takes its children's shadows with it.
 */

/**
 * Everything the shadow map depends on, folded into one number.
 *
 * ## ONLY SHADOW PARTICIPANTS, AND ONLY THEIR OWN ANCESTRY
 *
 * **This is the whole correctness of the saving, and the first version got it wrong.** It
 * folded in every node's transform, on the reasoning that a parent group moving carries
 * its children's shadows with it. True, but far too wide: the citizens, carts and gulls
 * move every single frame and cast nothing, so the signature changed every frame and the
 * shadow map was re-rendered on about every other one. Measured, which is how it was
 * caught rather than reasoned about: 296.8 draw calls per submission against the 222.8 a
 * genuinely frozen map gave on that pre-batching tree — half the pass recovered instead of
 * all of it. The current figures are recorded in this module's header.
 *
 * So the walk is post-order and a node contributes **only if its subtree casts or receives a
 * shadow**. A group of ordinary citizens contributes nothing however much it moves. A
 * building group contributes, because a mesh inside it participates, and so does every
 * ancestor between it and the scene — which keeps "a moved parent moves the shadow" true.
 *
 * Weighted by visit order so two objects moving oppositely cannot cancel out, and summed
 * as doubles, which discriminate far below any movement that could matter: at this
 * scene's magnitudes the sum resolves changes around 1e-8 world units.
 *
 * ## MATERIALS: THE DEPTH PASS, NOT THE COLOUR PASS
 *
 * Three's shadow renderer copies `visible`, wireframe, side, alpha cut-out, clipping and
 * displacement into a depth material; those values and their texture transforms are folded
 * below. Material identity/version covers a custom shader or program-mode replacement too.
 * Plain `opacity` is deliberately absent: Three does not copy it into the depth material,
 * and `PlacedBuilding` changes it every frame while cross-fading. Its two `transparent`
 * mode boundaries set `needsUpdate`, which advances `material.version` and invalidates once
 * at each boundary without putting the whole fade back on the shadow budget.
 */
interface SignatureAccumulator {
  readonly add: (value: number) => void;
}

type ShadowMaterial = THREE.Material & {
  readonly alphaMap?: THREE.Texture | null;
  readonly alphaTest?: number;
  readonly alphaToCoverage?: boolean;
  readonly clipIntersection?: boolean;
  readonly clipShadows?: boolean;
  readonly clippingPlanes?: readonly THREE.Plane[] | null;
  readonly displacementBias?: number;
  readonly displacementMap?: THREE.Texture | null;
  readonly displacementScale?: number;
  readonly map?: THREE.Texture | null;
  readonly wireframe?: boolean;
  readonly wireframeLinewidth?: number;
  readonly linewidth?: number;
};

type ShadowRenderable = THREE.Object3D & {
  readonly customDepthMaterial?: THREE.Material;
  readonly customDistanceMaterial?: THREE.Material;
  readonly geometry?: THREE.BufferGeometry;
  readonly instanceMatrix?: THREE.InstancedBufferAttribute;
  readonly isInstancedMesh?: boolean;
  readonly material?: THREE.Material | THREE.Material[];
  readonly morphTargetInfluences?: readonly number[];
  readonly count?: number;
  readonly skeleton?: {
    readonly boneTexture?: THREE.Texture | null;
  };
};

function appendTextureSignature(
  accumulator: SignatureAccumulator,
  texture: THREE.Texture | null | undefined,
): void {
  if (!texture) {
    accumulator.add(-1);
    return;
  }
  accumulator.add(texture.id);
  accumulator.add(texture.version);
  accumulator.add(texture.offset.x);
  accumulator.add(texture.offset.y);
  accumulator.add(texture.repeat.x);
  accumulator.add(texture.repeat.y);
  accumulator.add(texture.center.x);
  accumulator.add(texture.center.y);
  accumulator.add(texture.rotation);
}

function appendMaterialSignature(
  accumulator: SignatureAccumulator,
  material: THREE.Material,
): void {
  const depth = material as ShadowMaterial;
  // Three exposes a stable numeric id at runtime; its 0.185 Material declaration omits it.
  accumulator.add((material as THREE.Material & { readonly id: number }).id);
  accumulator.add(material.version);
  accumulator.add(material.visible ? 1 : 0);
  accumulator.add(depth.wireframe ? 1 : 0);
  accumulator.add(depth.wireframeLinewidth ?? 0);
  accumulator.add(depth.linewidth ?? 0);
  accumulator.add(material.side);
  accumulator.add(material.shadowSide ?? -1);
  accumulator.add(depth.alphaTest ?? 0);
  accumulator.add(depth.alphaToCoverage ? 1 : 0);
  accumulator.add(depth.clipShadows ? 1 : 0);
  accumulator.add(depth.clipIntersection ? 1 : 0);

  const clipping = depth.clippingPlanes ?? [];
  accumulator.add(clipping.length);
  for (const plane of clipping) {
    accumulator.add(plane.normal.x);
    accumulator.add(plane.normal.y);
    accumulator.add(plane.normal.z);
    accumulator.add(plane.constant);
  }

  const cutsAlpha = (depth.alphaTest ?? 0) > 0 || depth.alphaToCoverage === true;
  appendTextureSignature(accumulator, cutsAlpha ? depth.alphaMap : null);
  appendTextureSignature(accumulator, cutsAlpha ? depth.map : null);

  const displaces = depth.displacementMap && (depth.displacementScale ?? 1) !== 0;
  appendTextureSignature(accumulator, displaces ? depth.displacementMap : null);
  accumulator.add(displaces ? (depth.displacementScale ?? 1) : 0);
  accumulator.add(displaces ? (depth.displacementBias ?? 0) : 0);
}

function appendGeometrySignature(
  accumulator: SignatureAccumulator,
  geometry: THREE.BufferGeometry | undefined,
): void {
  if (!geometry) {
    accumulator.add(-1);
    return;
  }
  accumulator.add(geometry.id);
  accumulator.add(geometry.drawRange.start);
  accumulator.add(geometry.drawRange.count);
  const index = geometry.index;
  accumulator.add(index?.version ?? -1);
  accumulator.add(index?.count ?? 0);
  for (const attribute of Object.values(geometry.attributes)) {
    const upload = attribute as typeof attribute & {
      readonly version?: number;
      readonly data?: { readonly version?: number };
    };
    accumulator.add(upload.version ?? upload.data?.version ?? 0);
    accumulator.add(attribute.count);
  }
  for (const attributes of Object.values(geometry.morphAttributes)) {
    accumulator.add(attributes.length);
    for (const attribute of attributes) {
      const upload = attribute as typeof attribute & {
        readonly version?: number;
        readonly data?: { readonly version?: number };
      };
      accumulator.add(upload.version ?? upload.data?.version ?? 0);
      accumulator.add(attribute.count);
    }
  }
  accumulator.add(geometry.groups.length);
  for (const group of geometry.groups) {
    accumulator.add(group.start);
    accumulator.add(group.count);
    accumulator.add(group.materialIndex ?? 0);
  }
}

export function shadowCastingSignature(root: THREE.Object3D): number {
  let signature = 0;
  let token = 0;
  const accumulator: SignatureAccumulator = {
    add: (value) => {
      token += 1;
      // `BufferGeometry.drawRange.count` is `Infinity` by default. Letting that enter the
      // sum collapses every otherwise different scene to the same `Infinity`; finite sentinels
      // preserve the distinction and still change when a range becomes explicit.
      const finite = Number.isFinite(value)
        ? value
        : Number.isNaN(value)
          ? 2_147_483_629
          : value > 0
            ? 2_147_483_647
            : -2_147_483_647;
      signature += token * finite;
    },
  };

  const fold = (node: THREE.Object3D): boolean => {
    let subtreeAffectsShadow = node.castShadow === true || node.receiveShadow === true;
    for (const child of node.children) {
      // Not short-circuited: every descendant has to be visited so its own contribution
      // lands, so the `||` order here would be a bug.
      if (fold(child)) {
        subtreeAffectsShadow = true;
      }
    }

    const light = node as THREE.Object3D & {
      isLight?: boolean;
      target?: THREE.Object3D;
      shadow?: {
        mapSize: { x: number; y: number };
        camera: Record<string, number>;
      };
    };
    const castingLight =
      light.isLight === true && node.castShadow === true && light.shadow !== undefined;
    if (castingLight && light.shadow) {
      // A shadow-casting light's frustum and resolution decide the map as much as the
      // geometry does, and the crisis presets move both.
      accumulator.add(light.shadow.mapSize.x);
      accumulator.add(light.shadow.mapSize.y);
      const camera = light.shadow.camera;
      for (const key of [
        "left",
        "right",
        "top",
        "bottom",
        "near",
        "far",
        "zoom",
        "fov",
        "aspect",
      ]) {
        const value = camera[key];
        if (typeof value === "number") {
          accumulator.add(value);
        }
      }
      const target = light.target;
      if (target) {
        accumulator.add(target.id);
        accumulator.add(target.position.x);
        accumulator.add(target.position.y);
        accumulator.add(target.position.z);
      }
    }

    if (!subtreeAffectsShadow && !castingLight) {
      return false;
    }

    // Identity and visibility as well as the transform: an object added or removed
    // changes the map, and so does a group carrying casters being hidden, without any
    // caster's own transform moving at all.
    accumulator.add(node.id);
    accumulator.add(node.visible ? 1 : 0);
    accumulator.add(node.castShadow ? 1 : 0);
    accumulator.add(node.receiveShadow ? 1 : 0);
    accumulator.add(node.layers.mask);
    const { position, quaternion, scale } = node;
    accumulator.add(position.x);
    accumulator.add(position.y);
    accumulator.add(position.z);
    accumulator.add(quaternion.x);
    accumulator.add(quaternion.y);
    accumulator.add(quaternion.z);
    accumulator.add(quaternion.w);
    accumulator.add(scale.x);
    accumulator.add(scale.y);
    accumulator.add(scale.z);

    const renderable = node as ShadowRenderable;
    appendGeometrySignature(accumulator, renderable.geometry);
    if (renderable.isInstancedMesh) {
      accumulator.add(renderable.instanceMatrix?.version ?? -1);
      accumulator.add(renderable.count ?? 0);
    }
    for (const influence of renderable.morphTargetInfluences ?? []) {
      accumulator.add(influence);
    }
    appendTextureSignature(accumulator, renderable.skeleton?.boneTexture);

    const materials = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material
        ? [renderable.material]
        : [];
    accumulator.add(materials.length);
    for (const material of materials) {
      appendMaterialSignature(accumulator, material);
    }
    if (renderable.customDepthMaterial) {
      appendMaterialSignature(accumulator, renderable.customDepthMaterial);
    } else {
      accumulator.add(-1);
    }
    if (renderable.customDistanceMaterial) {
      appendMaterialSignature(accumulator, renderable.customDistanceMaterial);
    } else {
      accumulator.add(-1);
    }
    return subtreeAffectsShadow || castingLight;
  };

  fold(root);
  return signature;
}

/**
 * Take the shadow map off the per-frame budget for as long as its subject holds still.
 *
 * Mounted from `CityLighting`, which is where the shadow-casting light is declared, so the
 * two travel together and a scene that has no `CityLighting` keeps three's own default.
 * Read this module's header before changing the signature: its completeness is the whole
 * of the safety argument.
 */
export function useStaticShadowMap(): void {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const lastSignature = useRef<number | null>(null);

  useEffect(() => {
    const shadowMap = gl.shadowMap;
    shadowMap.autoUpdate = false;
    // The first map still has to be drawn, and the signature below is only ever compared
    // against a previous frame's -- so the opening render is asked for here rather than
    // inferred from a change that has not happened yet.
    shadowMap.needsUpdate = true;
    lastSignature.current = null;
    return () => {
      // Hand the renderer back exactly as it was found. It outlives this component on a
      // scene swap, and leaving it frozen would strand a shadow map nothing updates.
      shadowMap.autoUpdate = true;
      shadowMap.needsUpdate = true;
    };
  }, [gl]);

  useFrame(() => {
    const signature = shadowCastingSignature(scene);
    if (signature === lastSignature.current) {
      return;
    }
    lastSignature.current = signature;
    gl.shadowMap.needsUpdate = true;
  });
}
