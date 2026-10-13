import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Main cameras see layer 0; the key-light shadow camera additionally sees this layer. */
export const BUILDING_SHADOW_LAYER = 1;

/**
 * Batch the procedural island's static meshes without changing the authored builder.
 *
 * `StarterIsland` creates one mesh per pebble, reed, crop, post and terrain patch. That
 * graph is useful to author and test because every feature remains independently named
 * and measurable, but submitting it literally costs hundreds of WebGL draw calls on
 * every city frame. The learner never picks those meshes individually; the whole canvas
 * is decorative and placement hits a separate plane in `CityScene`.
 *
 * This adapter therefore bakes each mesh's world transform, groups compatible geometry
 * by a complete material/renderer signature, and emits one owned mesh per group. The
 * source remains unchanged for the terrain tests. The render graph owns cloned geometry
 * and materials, so it may cross #661's `useDisposableGraph` boundary safely.
 */

interface BatchBucket {
  readonly material: THREE.Material;
  readonly geometries: THREE.BufferGeometry[];
  readonly bakeSolidColor: boolean;
  readonly castShadow: boolean;
  readonly receiveShadow: boolean;
  readonly renderOrder: number;
  readonly frustumCulled: boolean;
  readonly layersMask: number;
}

export interface StaticBatchOptions {
  /**
   * Bake untextured material colour into vertices so otherwise-identical solid materials share
   * one submission. Callers opt in only for static graphs whose diffuse color can be baked safely.
   */
  readonly bakeSolidColors?: boolean;
  /** Merge static opaque geometry into one exact shadow caster per prepared model. */
  readonly singleShadowCaster?: boolean;
  /** Keep transient merge inputs until the prepared model's retained lifecycle releases. */
  readonly deferIntermediateDisposal?: boolean;
}

const textureDataIds = new WeakMap<object, number>();
const textureFingerprints = new WeakMap<object, string>();
let nextTextureDataId = 1;

function pixelFingerprint(data: object): string | null {
  const cached = textureFingerprints.get(data);
  if (cached !== undefined) {
    return cached;
  }
  const image = data as CanvasImageSource & {
    readonly width?: number;
    readonly height?: number;
  };
  const width = Number(image.width ?? 0);
  const height = Number(image.height ?? 0);
  if (
    typeof document === "undefined" ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }
  try {
    const sampleSize = 32;
    const canvas = document.createElement("canvas");
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
      return null;
    }
    context.drawImage(image, 0, 0, sampleSize, sampleSize);
    const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
    let hash = 2166136261;
    for (const channel of pixels) {
      hash ^= channel;
      hash = Math.imul(hash, 16777619);
    }
    const fingerprint = `${width}x${height}:${(hash >>> 0).toString(16)}`;
    textureFingerprints.set(data, fingerprint);
    return fingerprint;
  } catch {
    return null;
  }
}

function textureDataIdentity(texture: THREE.Texture): string {
  const data = texture.source?.data as unknown;
  if ((typeof data === "object" && data !== null) || typeof data === "function") {
    const object = data as object;
    const fingerprint = pixelFingerprint(object);
    if (fingerprint !== null) {
      return `pixels:${fingerprint}`;
    }
    let id = textureDataIds.get(object);
    if (id === undefined) {
      id = nextTextureDataId;
      nextTextureDataId += 1;
      textureDataIds.set(object, id);
    }
    return `data:${id}`;
  }
  return `${typeof data}:${String(data ?? texture.source?.uuid ?? texture.uuid)}`;
}

function materialTextures(material: THREE.Material): readonly {
  readonly name: string;
  readonly uuid: string;
  readonly wrapS: number;
  readonly wrapT: number;
  readonly minFilter: number;
  readonly magFilter: number;
  readonly colorSpace: string;
  readonly channel: number;
  readonly offset: readonly [number, number];
  readonly repeat: readonly [number, number];
  readonly rotation: number;
}[] {
  return Object.entries(material as unknown as Record<string, unknown>)
    .filter(
      ([, value]) => value !== null && (value as THREE.Texture | undefined)?.isTexture,
    )
    .map(([name, value]) => {
      const texture = value as THREE.Texture;
      return {
        name,
        // glTF creates one Texture identity per sampler even when those samplers resolve to
        // identical state over the same embedded image. The image source plus effective sampler
        // state is the renderer program/binding identity that determines whether meshes can merge.
        uuid: textureDataIdentity(texture),
        wrapS: texture.wrapS,
        wrapT: texture.wrapT,
        minFilter: texture.minFilter,
        magFilter: texture.magFilter,
        colorSpace: texture.colorSpace,
        channel: texture.channel,
        offset: [texture.offset.x, texture.offset.y] as const,
        repeat: [texture.repeat.x, texture.repeat.y] as const,
        rotation: texture.rotation,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** Values which alter a material's program, depth behavior, blending, or visible color. */
function materialSignature(material: THREE.Material, bakeSolidColor: boolean): string {
  const candidate = material as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    roughness?: number;
    metalness?: number;
    flatShading?: boolean;
    wireframe?: boolean;
    vertexColors?: boolean;
    fog?: boolean;
    toneMapped?: boolean;
    forceSinglePass?: boolean;
  };
  const textures = materialTextures(material);
  return JSON.stringify({
    type: material.type,
    color: bakeSolidColor ? "vertex" : (candidate.color?.getHex() ?? null),
    emissive: candidate.emissive?.getHex() ?? null,
    roughness: candidate.roughness ?? null,
    metalness: candidate.metalness ?? null,
    flatShading: candidate.flatShading ?? null,
    wireframe: candidate.wireframe ?? null,
    vertexColors: candidate.vertexColors ?? null,
    fog: candidate.fog ?? null,
    toneMapped: candidate.toneMapped ?? null,
    forceSinglePass: candidate.forceSinglePass ?? null,
    opacity: material.opacity,
    transparent: material.transparent,
    side: material.side,
    shadowSide: material.shadowSide,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    colorWrite: material.colorWrite,
    alphaTest: material.alphaTest,
    blending: material.blending,
    blendSrc: material.blendSrc,
    blendDst: material.blendDst,
    blendEquation: material.blendEquation,
    premultipliedAlpha: material.premultipliedAlpha,
    polygonOffset: material.polygonOffset,
    polygonOffsetFactor: material.polygonOffsetFactor,
    polygonOffsetUnits: material.polygonOffsetUnits,
    bakeSolidColor,
    textures,
  });
}

/**
 * `mergeGeometries` requires every member to expose the same attributes and index
 * shape. Include those in the key so a missing UV or a non-indexed ShapeGeometry
 * becomes another cheap bucket instead of making the whole merge fail.
 */
function geometrySignature(geometry: THREE.BufferGeometry): string {
  const attributes = Object.entries(geometry.attributes)
    .map(([name, attribute]) => ({
      name,
      itemSize: attribute.itemSize,
      normalized: attribute.normalized,
      array: attribute.array.constructor.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  return JSON.stringify({
    indexed: geometry.index !== null,
    attributes,
    morphAttributes: Object.keys(geometry.morphAttributes).sort(),
    morphTargetsRelative: geometry.morphTargetsRelative,
  });
}

function batchKey(
  mesh: THREE.Mesh,
  material: THREE.Material,
  bakeSolidColor: boolean,
  castShadow: boolean,
): string {
  return JSON.stringify({
    material: materialSignature(material, bakeSolidColor),
    geometry: geometrySignature(mesh.geometry),
    castShadow,
    receiveShadow: mesh.receiveShadow,
    renderOrder: mesh.renderOrder,
    frustumCulled: mesh.frustumCulled,
    layers: mesh.layers.mask,
  });
}

function shadowGeometry(
  mesh: THREE.Mesh,
  options: StaticBatchOptions,
  deferred: THREE.BufferGeometry[],
): THREE.BufferGeometry {
  const transformed = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  const geometry = transformed.index === null ? transformed : transformed.toNonIndexed();
  if (geometry !== transformed) {
    if (options.deferIntermediateDisposal === true) {
      deferred.push(transformed);
    } else {
      transformed.dispose();
    }
  }
  for (const name of Object.keys(geometry.attributes)) {
    if (name !== "position") {
      geometry.deleteAttribute(name);
    }
  }
  geometry.morphAttributes = {};
  return geometry;
}

function canBakeSolidColor(material: THREE.Material, options: StaticBatchOptions): boolean {
  const candidate = material as THREE.Material & { readonly color?: THREE.Color };
  return (
    options.bakeSolidColors === true &&
    candidate.color !== undefined &&
    materialTextures(material).length === 0
  );
}

function bakedGeometry(
  mesh: THREE.Mesh,
  material: THREE.Material,
  bakeSolidColor: boolean,
): THREE.BufferGeometry {
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  if (!bakeSolidColor) {
    return geometry;
  }
  const candidate = material as THREE.Material & { readonly color: THREE.Color };
  const position = geometry.getAttribute("position");
  const prior = geometry.getAttribute("color");
  const colors = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    colors[index * 3] = candidate.color.r * (prior?.getX(index) ?? 1);
    colors[index * 3 + 1] = candidate.color.g * (prior?.getY(index) ?? 1);
    colors[index * 3 + 2] = candidate.color.b * (prior?.getZ(index) ?? 1);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function bucketMaterial(bucket: BatchBucket): THREE.Material {
  const material = bucket.material.clone();
  if (bucket.bakeSolidColor) {
    const candidate = material as THREE.Material & {
      color?: THREE.Color;
      vertexColors?: boolean;
    };
    candidate.color?.set(0xffffff);
    candidate.vertexColors = true;
  }
  return material;
}

/** Clone one unsupported renderable so the returned graph still owns its resources. */
function cloneRenderable(node: THREE.Object3D, root: THREE.Group): void {
  const holder = node as THREE.Object3D & {
    geometry?: THREE.BufferGeometry;
    material?: THREE.Material | THREE.Material[];
  };
  if (!holder.geometry || !holder.material) {
    return;
  }
  const clone = node.clone(false) as typeof holder;
  clone.geometry = holder.geometry.clone().applyMatrix4(node.matrixWorld);
  clone.material = Array.isArray(holder.material)
    ? holder.material.map((material) => material.clone())
    : holder.material.clone();
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  clone.scale.set(1, 1, 1);
  clone.updateMatrix();
  root.add(clone);
}

/**
 * Return a visually equivalent, wholly-owned render graph.
 *
 * Transparent meshes stay separate. Three sorts transparency per object; combining two
 * water/decal objects would replace those centres with one centre and can reverse the
 * blend even when their materials match. Opaque meshes are order-independent and safe
 * to merge. Mirrored transforms also stay separate because the renderer flips front-face
 * winding per object for a negative determinant, information a baked identity transform
 * would otherwise lose.
 */
export function batchStaticIslandGraph(
  source: THREE.Group,
  options: StaticBatchOptions = {},
): THREE.Group {
  source.updateMatrixWorld(true);
  const result = new THREE.Group();
  result.name = source.name;
  result.userData = { ...source.userData };

  const buckets = new Map<string, BatchBucket>();
  const shadowGeometries: THREE.BufferGeometry[] = [];
  const deferredGeometries: THREE.BufferGeometry[] = [];
  let sourceMeshes = 0;
  let unbatchedMeshes = 0;

  source.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) {
      cloneRenderable(node, result);
      return;
    }
    sourceMeshes += 1;
    const material = Array.isArray(mesh.material) ? null : mesh.material;
    const hasMorphTargets =
      Object.keys(mesh.geometry.morphAttributes).length > 0 ||
      (mesh.morphTargetInfluences?.length ?? 0) > 0;
    const canBatch =
      material !== null &&
      !material.transparent &&
      material.opacity >= 1 &&
      !(mesh as THREE.SkinnedMesh).isSkinnedMesh &&
      !(mesh as unknown as THREE.InstancedMesh).isInstancedMesh &&
      !hasMorphTargets &&
      mesh.matrixWorld.determinant() > 0;
    if (options.singleShadowCaster === true && canBatch && mesh.castShadow) {
      shadowGeometries.push(shadowGeometry(mesh, options, deferredGeometries));
    }
    if (!canBatch || material === null) {
      cloneRenderable(mesh, result);
      unbatchedMeshes += 1;
      return;
    }

    const bakeSolidColor = canBakeSolidColor(material, options);
    const castShadow = options.singleShadowCaster === true ? false : mesh.castShadow;
    const key = batchKey(mesh, material, bakeSolidColor, castShadow);
    const geometry = bakedGeometry(mesh, material, bakeSolidColor);
    const existing = buckets.get(key);
    if (existing) {
      existing.geometries.push(geometry);
      return;
    }
    buckets.set(key, {
      material,
      geometries: [geometry],
      bakeSolidColor,
      castShadow,
      receiveShadow: mesh.receiveShadow,
      renderOrder: mesh.renderOrder,
      frustumCulled: mesh.frustumCulled,
      layersMask: mesh.layers.mask,
    });
  });

  for (const bucket of buckets.values()) {
    const merged =
      bucket.geometries.length === 1
        ? bucket.geometries[0]
        : mergeGeometries(bucket.geometries, false);
    if (merged === null) {
      for (const geometry of bucket.geometries) {
        const mesh = new THREE.Mesh(geometry, bucketMaterial(bucket));
        mesh.castShadow = bucket.castShadow;
        mesh.receiveShadow = bucket.receiveShadow;
        mesh.renderOrder = bucket.renderOrder;
        mesh.frustumCulled = bucket.frustumCulled;
        mesh.layers.mask = bucket.layersMask;
        result.add(mesh);
      }
      continue;
    }
    for (const geometry of bucket.geometries) {
      if (geometry !== merged) {
        if (options.deferIntermediateDisposal === true) {
          deferredGeometries.push(geometry);
        } else {
          geometry.dispose();
        }
      }
    }
    const mesh = new THREE.Mesh(merged, bucketMaterial(bucket));
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    mesh.renderOrder = bucket.renderOrder;
    mesh.frustumCulled = bucket.frustumCulled;
    mesh.layers.mask = bucket.layersMask;
    result.add(mesh);
  }

  if (shadowGeometries.length > 0) {
    const mergedShadow = mergeGeometries(shadowGeometries, false);
    if (mergedShadow !== null) {
      for (const geometry of shadowGeometries) {
        if (geometry !== mergedShadow) {
          if (options.deferIntermediateDisposal === true) {
            deferredGeometries.push(geometry);
          } else {
            geometry.dispose();
          }
        }
      }
      const shadowCaster = new THREE.Mesh(
        mergedShadow,
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          colorWrite: false,
          depthTest: false,
          depthWrite: false,
        }),
      );
      shadowCaster.name = "batched-shadow-caster";
      shadowCaster.castShadow = true;
      shadowCaster.receiveShadow = false;
      shadowCaster.layers.set(BUILDING_SHADOW_LAYER);
      shadowCaster.userData.exactShadowProxy = true;
      result.add(shadowCaster);
    } else {
      for (const geometry of shadowGeometries) {
        if (options.deferIntermediateDisposal === true) {
          deferredGeometries.push(geometry);
        } else {
          geometry.dispose();
        }
      }
    }
  }

  result.userData.batch = {
    sourceMeshes,
    renderMeshes: result.children.length,
    buckets: buckets.size,
    unbatchedMeshes,
  };
  result.userData.deferredBatchGeometries = deferredGeometries;
  return result;
}
