import * as THREE from "three";

import { WINTER_SCENE_TONES as W } from "./winterTones";

/**
 * **FROST ON A BUILDING: NO GEOMETRY CHANGE AND NO MESH SWAP.**
 *
 * Wired from the design batch's asset 7. Two moves and nothing else: every material's colour
 * lerps toward the ice tone with saturation pulled down, and UP-FACING faces take rime through
 * vertex colours. Rime on up-faces is what makes frost read at the shipped 49° tilt — from
 * that camera you are looking mostly at roofs and the tops of walls, so the up-face is where
 * the treatment lands. The silhouette stays byte-identical to the standing building, which is
 * the requirement: a frosted building is the same building.
 *
 * ## THIS IS NOT `frostStage.ts`, AND BOTH ARE WANTED
 *
 * `frostStage.ts` draws a frost SHELL — a crust that climbs a building's base in step with
 * `winterDamageStage`, so a damaged building says how hurt it is. This is WEATHER: it lands on
 * every building the moment the crisis is on, says nothing about damage, and adds no geometry
 * at all. The two are distinguishable by direction as well as by tone — the shell CLIMBS the
 * wall in the board's own frost tones, the weather tint lies flat across every surface — and
 * they own different claims, so neither replaces the other.
 *
 * ## THE VERTEX-COLOUR HAZARD, MEASURED
 *
 * In three.js, `vertexColors: true` over geometry with no `color` attribute renders BLACK: the
 * shader declares the attribute, WebGL supplies `(0,0,0)` for a missing one, and the diffuse
 * term is multiplied by it. **No shipped GLB carries one.** Measured across all 43 model files
 * in `city/art/models`: 3,397 mesh primitives, every one of them `POSITION, NORMAL,
 * TEXCOORD_0`, and `COLOR_0` present on exactly zero. So a frost material that set
 * `vertexColors` on faith would have blacked out every building in the crisis.
 *
 * The resolution is structural rather than careful: {@link frostMaterial} takes the attribute's
 * PRESENCE as an argument and cannot be told to read one that is not there, and
 * {@link applyFrost} — the only thing that turns it on — writes the attribute in the same
 * traverse that assigns the material. `winterFrost.test.ts` sweeps a frosted tree for a
 * material whose geometry lost its attribute, and a browser test samples the rendered pixels
 * of a frosted GLB-shaped mesh so "it went black" is caught as a colour and not only as a
 * missing attribute.
 */

/** The tone every frosted surface lerps toward. */
export const FROST_TINT = 0xdce6e6;

/** How far a colour travels toward the tint at full frost. */
const TINT_MIX = 0.45;

/** How much saturation is pulled out at full frost. Cold is desaturated. */
const DESATURATE = 0.42;

/**
 * Rime strength on a roof (a face pointing up), on a wall, and on a soffit.
 *
 * The bands are the batch's: roofs and sills take rime, walls take a whisper, undersides take
 * none. A soffit that took rime would be frost growing on a surface the weather cannot reach.
 */
const RIME_ROOF = 0.8;
const RIME_WALL = 0.18;

/** Geometry ownership is private to this module; loader/fair geometry is never entered here. */
const frostOwnedGeometries = new WeakSet<THREE.BufferGeometry>();
const disposedFrostOwnedGeometries = new WeakSet<THREE.BufferGeometry>();

/**
 * One frosted material, cloned from the fair-weather original.
 *
 * **CLONED, NEVER MUTATED.** The GLB loader caches one `gltf.scene` per URL and
 * `prepareModel` clones the object graph, which shares MATERIALS by reference — so mutating a
 * material here would frost every other instance of the same building, including the ghost and
 * the model preview.
 *
 * `hasVertexColors` is required rather than defaulted, because a default is exactly how the
 * black-out ships: a caller who forgets it gets the safe answer only if the safe answer is the
 * one they did not have to think about.
 */
export function frostMaterial(
  base: THREE.Material,
  hasVertexColors: boolean,
  amount = 1,
): THREE.Material {
  const material = base.clone();
  const authoredFlatShading = (base as THREE.Material & { flatShading?: boolean })
    .flatShading;
  if (authoredFlatShading !== undefined) {
    (material as THREE.Material & { flatShading?: boolean }).flatShading =
      authoredFlatShading;
  }
  if (
    !(material instanceof THREE.MeshStandardMaterial) &&
    !(material instanceof THREE.MeshToonMaterial) &&
    !(material instanceof THREE.MeshBasicMaterial)
  ) {
    // Unknown classes are returned untouched rather than half-treated: an unfrosted
    // surface is a small mistake and a black one is not.
    return material;
  }
  const tinted = material.color
    .clone()
    .lerp(new THREE.Color(FROST_TINT), TINT_MIX * amount);
  const hsl = { h: 0, s: 0, l: 0 };
  tinted.getHSL(hsl);
  tinted.setHSL(hsl.h, hsl.s * (1 - DESATURATE * amount), hsl.l);
  material.color = tinted;
  if (material instanceof THREE.MeshStandardMaterial) {
    // Legacy PBR surfaces become matte and unlit. Toon and Basic late-era materials have
    // no PBR/emissive fields, so their authored render state remains exact.
    material.roughness = 1;
    material.metalness = 0;
    material.emissive = new THREE.Color(0x000000);
    material.emissiveIntensity = 1;
    material.flatShading = true;
  }
  material.vertexColors = hasVertexColors;
  material.needsUpdate = true;
  return material;
}

/**
 * Write the rime attribute for one geometry, or report that it could not.
 *
 * Returns `false` when the geometry has no normals to read the facing from — a glTF mesh may
 * legally omit them — in which case the caller frosts by colour alone rather than switching on
 * a `color` attribute it did not manage to build.
 *
 * The rime is a MULTIPLIER against `material.color`, so `0xffffff` is "untouched" and the
 * pale value on the up-faces is a lift rather than a replacement. That is what keeps a frosted
 * building recognisably its own hue.
 */
export function writeRime(geometry: THREE.BufferGeometry, amount = 1): boolean {
  const normal = geometry.getAttribute("normal");
  if (!normal) {
    return false;
  }
  const rime = new THREE.Color(W.SNOW_LIT);
  const n = new THREE.Vector3();
  const mix = new THREE.Color();
  const colors = new Float32Array(normal.count * 3);
  for (let i = 0; i < normal.count; i += 1) {
    n.fromBufferAttribute(normal as THREE.BufferAttribute, i);
    // 1 = roof, 0 = wall, -1 = soffit.
    const facing = n.y;
    const k = facing > 0.35 ? RIME_ROOF * amount : facing > -0.1 ? RIME_WALL * amount : 0;
    mix.setRGB(1, 1, 1).lerp(rime, k).convertSRGBToLinear();
    colors.set([mix.r, mix.g, mix.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return true;
}

/**
 * Frost a prepared model in place: rime on the up-faces, the winter tint on every material.
 *
 * Call on a model that is already CLONED (`prepareModel` clones before it calls this). It
 * replaces geometry references on the clone, which is safe, and it never writes to a material
 * the fair-weather instances share.
 *
 * Returns how many meshes it treated, so a caller — or a test — can tell "frosted nothing"
 * from "frosted everything", which are otherwise the same green.
 */
export function applyFrost(root: THREE.Object3D, amount = 1): number {
  const rows: {
    readonly mesh: THREE.Mesh;
    readonly materials: readonly THREE.Material[];
    readonly wasArray: boolean;
  }[] = [];
  const frostedGeometries = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
  const rimeResults = new WeakMap<THREE.BufferGeometry, boolean>();
  const allUsesRimed = new Map<THREE.Material, boolean>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    // Object3D.clone shares geometry references with the loader root. Frost therefore owns a
    // private geometry for BOTH shapes: toNonIndexed creates the indexed copy, while an already
    // non-indexed input still needs clone() before writeRime adds its colour attribute.
    const sourceGeometry = mesh.geometry;
    let geometry = frostedGeometries.get(sourceGeometry);
    let rimed = rimeResults.get(sourceGeometry);
    if (!geometry) {
      geometry = sourceGeometry.index
        ? sourceGeometry.toNonIndexed()
        : sourceGeometry.clone();
      frostOwnedGeometries.add(geometry);
      rimed = writeRime(geometry, amount);
      frostedGeometries.set(sourceGeometry, geometry);
      rimeResults.set(sourceGeometry, rimed);
    }
    mesh.geometry = geometry;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    rows.push({
      mesh,
      materials,
      wasArray: Array.isArray(mesh.material),
    });
    for (const material of materials) {
      allUsesRimed.set(material, (allUsesRimed.get(material) ?? true) && (rimed ?? false));
    }
  });
  const replacements = new Map<THREE.Material, THREE.Material>();
  for (const [source, rimed] of allUsesRimed) {
    replacements.set(source, frostMaterial(source, rimed, amount));
  }
  for (const row of rows) {
    const materials = row.materials.map(
      (material) => replacements.get(material) as THREE.Material,
    );
    const first = materials[0];
    if (!first) continue;
    row.mesh.material = row.wasArray ? materials : first;
  }
  return rows.length;
}

/**
 * Dispose only private geometry allocated by {@link applyFrost}, once per identity.
 *
 * A prepared frost root may contain many meshes sharing one private geometry. The local
 * `seen` set deduplicates that root, and the weak disposed set makes repeated lifecycle
 * cleanup (including StrictMode effect replay or a cloned prepared root) one-shot.
 */
export function disposeFrostOwnedGeometries(root: THREE.Object3D): number {
  const seen = new Set<THREE.BufferGeometry>();
  let disposed = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    if (
      seen.has(geometry) ||
      !frostOwnedGeometries.has(geometry) ||
      disposedFrostOwnedGeometries.has(geometry)
    ) {
      return;
    }
    seen.add(geometry);
    disposedFrostOwnedGeometries.add(geometry);
    geometry.dispose();
    disposed += 1;
  });
  return disposed;
}
