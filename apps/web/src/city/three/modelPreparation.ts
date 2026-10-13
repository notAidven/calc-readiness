import * as THREE from "three";

import { type Footprint, footprintFitScale, MAX_BUILD_HEIGHT } from "../worldLayout";
import { applySkillBuildingArtVariation } from "./buildingArtVariationModel";
import {
  isLateEraGridworkAsset,
  restoreLateEraGridworkMaterials,
  restoreLateEraGridworkNodeMetadata,
} from "./lateEraGridworkMaterial";
import { applyFrost, disposeFrostOwnedGeometries } from "./winterFrost";

export interface GridworkPreparationOptions {
  readonly fitAndGround: boolean;
  readonly shadows: "placed" | "disabled";
  readonly materials: "restored" | "node-only";
  readonly frosted: boolean;
  /**
   * Canonical identity of a PROCEDURAL completed model that receives its structural variation.
   * Callers must omit this for authored GLBs, which are already complete models.
   */
  readonly buildingIdentity?: string;
}

export const PLACED_PREPARATION = {
  fitAndGround: true,
  shadows: "placed",
  materials: "restored",
  frosted: false,
} as const;

export const THUMB_PREPARATION = {
  fitAndGround: false,
  shadows: "disabled",
  materials: "restored",
  frosted: false,
} as const;

export const GHOST_PREPARATION = {
  fitAndGround: true,
  shadows: "disabled",
  materials: "node-only",
  frosted: false,
} as const;

export type GridworkPreparer = (
  scene: THREE.Object3D,
  footprint: Footprint | null,
  options: GridworkPreparationOptions,
) => THREE.Object3D;

export interface FadeMaterialBinding {
  readonly material: THREE.Material;
  readonly baseOpacity: number;
  readonly baseTransparent: boolean;
  readonly baseDepthTest: boolean;
  readonly baseDepthWrite: boolean;
  readonly baseColorWrite: boolean;
  readonly baseBlending: THREE.Blending;
}

/** Materials allocated while preparing one cloned root; loader/source identities never enter it. */
const preparedRootMaterials = new WeakMap<THREE.Object3D, Set<THREE.Material>>();
/** Geometries allocated after preparation (for example merged render/shadow buffers). */
const preparedRootGeometries = new WeakMap<THREE.Object3D, Set<THREE.BufferGeometry>>();
/** StrictMode cleanup and repeated disposal calls are one-shot per material identity. */
const disposedPreparedMaterials = new WeakSet<THREE.Material>();
const disposedPreparedGeometries = new WeakSet<THREE.BufferGeometry>();
/** Mounted consumers retaining each prepared root, including StrictMode effect replay. */
const preparedRootRetains = new WeakMap<THREE.Object3D, number>();

function materialsIn(root: THREE.Object3D): Set<THREE.Material> {
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.add(material);
    }
  });
  return materials;
}

function collectOwnedMaterials(
  root: THREE.Object3D,
  sourceMaterials: ReadonlySet<THREE.Material>,
  owned: Set<THREE.Material>,
): void {
  for (const material of materialsIn(root)) {
    if (!sourceMaterials.has(material)) {
      owned.add(material);
    }
  }
}

function disposeMaterialSet(materials: ReadonlySet<THREE.Material>): number {
  let disposed = 0;
  for (const material of materials) {
    if (disposedPreparedMaterials.has(material)) continue;
    disposedPreparedMaterials.add(material);
    // three.js material disposal does not dispose maps. Gradient/base-map caches and loader
    // textures therefore remain shared and live while only the app-owned GPU program is released.
    material.dispose();
    disposed += 1;
  }
  return disposed;
}

function disposeGeometrySet(geometries: ReadonlySet<THREE.BufferGeometry>): number {
  let disposed = 0;
  for (const geometry of geometries) {
    if (disposedPreparedGeometries.has(geometry)) continue;
    disposedPreparedGeometries.add(geometry);
    geometry.dispose();
    disposed += 1;
  }
  return disposed;
}

/** Re-apply the material traits glTF cannot carry for legacy untagged assets. */
export function reviveMaterial(source: THREE.Material): THREE.Material {
  const mat = source.clone();
  if (mat instanceof THREE.MeshStandardMaterial) {
    mat.flatShading = true;
    const e = mat.emissive;
    if (e && e.r + e.g + e.b > 0) {
      mat.emissiveIntensity = 1.2;
    }
  }
  mat.needsUpdate = true;
  return mat;
}

/**
 * Clone and prepare one model for a named runtime surface.
 *
 * Tagged late-era metadata is restored before any legacy material revival. Untagged
 * placed models retain the pre-Task-8 fit, cap, ground, shadow, and frost branches exactly.
 */
export function prepareGridworkModel(
  scene: THREE.Object3D,
  footprint: Footprint | null,
  options: GridworkPreparationOptions,
): THREE.Object3D {
  const root = scene.clone(true);
  const sourceMaterials = materialsIn(scene);
  const ownedMaterials = new Set<THREE.Material>();
  const ownedGeometries = new Set<THREE.BufferGeometry>();
  if (options.buildingIdentity) {
    root.userData.selectedBuildingIdentity = options.buildingIdentity;
  }
  const tagged = isLateEraGridworkAsset(root);
  const restored =
    options.materials === "restored"
      ? restoreLateEraGridworkMaterials(root)
      : {
          tagged,
          restoredMaterials: 0,
          restoredRenderOrders: 0,
          effectiveAnisotropies: [],
        };
  if (options.materials === "node-only" && tagged) {
    restoreLateEraGridworkNodeMetadata(root);
  }
  collectOwnedMaterials(root, sourceMaterials, ownedMaterials);

  try {
    if (options.fitAndGround) {
      if (!footprint) {
        throw new Error("fitAndGround requires a footprint");
      }

      // This is the reviewed Era 1–7 geometry branch verbatim: X/Z contain-fit,
      // then the existing Y-only cap, then grounding.
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      root.scale.setScalar(footprintFitScale(size.x, size.z, footprint));

      const sized = new THREE.Box3().setFromObject(root);
      const height = sized.max.y - sized.min.y;
      if (height > MAX_BUILD_HEIGHT) {
        if (restored.tagged) {
          throw new Error("late-era model would activate MAX_BUILD_HEIGHT");
        }
        root.scale.y *= MAX_BUILD_HEIGHT / height;
      }

      const grounded = new THREE.Box3().setFromObject(root);
      root.position.set(
        -(grounded.min.x + grounded.max.x) / 2,
        -grounded.min.y,
        -(grounded.min.z + grounded.max.z) / 2,
      );
    }

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = options.shadows === "placed";
      mesh.receiveShadow = options.shadows === "placed";
      // Preserve the old outer `!frosted` branch exactly for untagged assets.
      if (!options.frosted) {
        if (!restored.tagged && options.materials === "restored") {
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map(reviveMaterial)
            : reviveMaterial(mesh.material);
        }
      }
    });
    if (options.buildingIdentity) {
      const applied = applySkillBuildingArtVariation(root, options.buildingIdentity);
      for (const geometry of applied?.geometries ?? []) {
        ownedGeometries.add(geometry);
      }
    }
    collectOwnedMaterials(root, sourceMaterials, ownedMaterials);
    if (options.frosted) {
      applyFrost(root);
      collectOwnedMaterials(root, sourceMaterials, ownedMaterials);
    }
    preparedRootMaterials.set(root, ownedMaterials);
    if (ownedGeometries.size > 0) {
      preparedRootGeometries.set(root, ownedGeometries);
    }
    return root;
  } catch (error) {
    disposeMaterialSet(ownedMaterials);
    disposeGeometrySet(ownedGeometries);
    disposeFrostOwnedGeometries(root);
    throw error;
  }
}

export interface PreparedModelDisposal {
  readonly materials: number;
  readonly geometries: number;
  readonly frostGeometries: number;
}

/**
 * Dispose resources allocated by {@link prepareGridworkModel}, once per identity.
 *
 * Source/loader materials and geometry are excluded when ownership is recorded. Material
 * disposal intentionally does not walk textures, preserving shared gradient/base-map caches.
 */
export function disposePreparedModel(root: THREE.Object3D): PreparedModelDisposal {
  return {
    materials: disposeMaterialSet(preparedRootMaterials.get(root) ?? new Set()),
    geometries: disposeGeometrySet(preparedRootGeometries.get(root) ?? new Set()),
    frostGeometries: disposeFrostOwnedGeometries(root),
  };
}

/**
 * Add one app-owned material allocated after shared preparation (the placement ghost override).
 */
export function registerPreparedMaterial(
  root: THREE.Object3D,
  material: THREE.Material,
): void {
  let owned = preparedRootMaterials.get(root);
  if (!owned) {
    owned = new Set<THREE.Material>();
    preparedRootMaterials.set(root, owned);
  }
  owned.add(material);
}

/** Add one app-owned merged geometry allocated after shared preparation. */
export function registerPreparedGeometry(
  root: THREE.Object3D,
  geometry: THREE.BufferGeometry,
): void {
  let owned = preparedRootGeometries.get(root);
  if (!owned) {
    owned = new Set<THREE.BufferGeometry>();
    preparedRootGeometries.set(root, owned);
  }
  owned.add(geometry);
  // `retainPreparedModel` uses material ownership as the prepared-root presence marker.
  if (!preparedRootMaterials.has(root)) {
    preparedRootMaterials.set(root, new Set());
  }
}

/**
 * Retain a mounted prepared root and return its React-effect cleanup.
 *
 * Release is deferred one microtask: StrictMode's synthetic setup-cleanup-setup retains the same
 * root again before the pending release runs, while a real replacement retains a different root
 * and therefore disposes the abandoned one. Shared mounts are reference-counted.
 */
export function retainPreparedModel(root: THREE.Object3D): () => void {
  if (!preparedRootMaterials.has(root)) {
    throw new Error("cannot retain an unprepared model root");
  }
  preparedRootRetains.set(root, (preparedRootRetains.get(root) ?? 0) + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    queueMicrotask(() => {
      const retained = preparedRootRetains.get(root) ?? 0;
      if (retained <= 1) {
        preparedRootRetains.delete(root);
        disposePreparedModel(root);
        return;
      }
      preparedRootRetains.set(root, retained - 1);
    });
  };
}

/** Bind each distinct material once, before animation begins. */
export function bindFadeMaterials(root: THREE.Object3D): readonly FadeMaterialBinding[] {
  const seen = new Set<THREE.Material>();
  const rows: FadeMaterialBinding[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      if (seen.has(material)) continue;
      seen.add(material);
      rows.push({
        material,
        baseOpacity: material.opacity,
        baseTransparent: material.transparent,
        baseDepthTest: material.depthTest,
        baseDepthWrite: material.depthWrite,
        baseColorWrite: material.colorWrite,
        baseBlending: material.blending,
      });
    }
  });
  return rows;
}

/**
 * Apply one frame's scalar fade without traversing, allocating, or rewriting authored
 * depth/color/blending state. Only crossing the exact transparency boundary recompiles.
 */
export function applyFade(rows: readonly FadeMaterialBinding[], fade: number): void {
  for (const row of rows) {
    row.material.opacity = row.baseOpacity * fade;
    const transparent = fade < 1 ? true : row.baseTransparent;
    if (row.material.transparent !== transparent) {
      row.material.transparent = transparent;
      row.material.needsUpdate = true;
    }
  }
}
