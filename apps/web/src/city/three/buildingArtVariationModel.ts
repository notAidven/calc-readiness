import * as THREE from "three";

import {
  buildingArtVariationForNode,
  type SkillBuildingArtVariation,
} from "../buildingArtVariations";
import { MAX_BUILD_HEIGHT } from "../worldLayout";

export interface AppliedBuildingArtVariation {
  readonly variation: SkillBuildingArtVariation;
  readonly geometries: readonly THREE.BufferGeometry[];
  readonly meshes: number;
  readonly triangles: number;
}

interface Materials {
  readonly structure: THREE.MeshStandardMaterial;
  readonly roof: THREE.MeshStandardMaterial;
  readonly accent: THREE.MeshStandardMaterial;
}

type Position = readonly [number, number, number];
type Rotation = readonly [number, number, number];

function material(color: number, metalness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: metalness > 0.25 ? 0.55 : 0.86,
    metalness,
    flatShading: true,
  });
}

function materialsFor(variation: SkillBuildingArtVariation): Materials {
  const modern = ["industrial", "atomic_age", "information_age", "cyberpunk"].includes(
    variation.eraId,
  );
  return {
    structure: material(variation.grammar.structureColor, modern ? 0.12 : 0.02),
    roof: material(variation.grammar.roofColor, modern ? 0.3 : 0.04),
    accent: material(variation.grammar.accentColor, modern ? 0.22 : 0.03),
  };
}

function triangleCount(geometry: THREE.BufferGeometry): number {
  return Math.floor(
    (geometry.index?.count ?? geometry.getAttribute("position")?.count ?? 0) / 3,
  );
}

/**
 * Attach a world-sized structural mesh under a prepared model while preserving its authored
 * root transform. `prepareGridworkModel` fits and grounds by scaling/translating that root, so a
 * plain `root.add(mesh)` would scale the new feature a second time. `attach` converts the world
 * transform back into the root's local space and keeps the intended gameplay dimensions.
 */
function structuralMesh(
  root: THREE.Object3D,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: Position,
  rotation: Rotation = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `building-art-${name}`;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.buildingArtStructure = true;
  mesh.updateMatrixWorld(true);
  root.updateWorldMatrix(true, false);
  root.attach(mesh);
  return mesh;
}

function box(
  root: THREE.Object3D,
  name: string,
  size: Position,
  material: THREE.Material,
  position: Position,
  rotation: Rotation = [0, 0, 0],
): THREE.Mesh {
  return structuralMesh(
    root,
    name,
    new THREE.BoxGeometry(...size),
    material,
    position,
    rotation,
  );
}

function cylinder(
  root: THREE.Object3D,
  name: string,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  material: THREE.Material,
  position: Position,
): THREE.Mesh {
  return structuralMesh(
    root,
    name,
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
    position,
  );
}

function cone(
  root: THREE.Object3D,
  name: string,
  radius: number,
  height: number,
  segments: number,
  material: THREE.Material,
  position: Position,
): THREE.Mesh {
  return structuralMesh(
    root,
    name,
    new THREE.ConeGeometry(radius, height, segments),
    material,
    position,
  );
}

interface Proportions {
  readonly cx: number;
  readonly cz: number;
  readonly floor: number;
  readonly roof: number;
  readonly top: number;
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly unit: number;
  readonly rise: number;
}

function proportions(root: THREE.Object3D): Proportions | null {
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  if (
    !Number.isFinite(size.x) ||
    !Number.isFinite(size.y) ||
    !Number.isFinite(size.z) ||
    size.x <= 0 ||
    size.y <= 0 ||
    size.z <= 0
  ) {
    return null;
  }
  const roof = bounds.max.y;
  const desiredRise = Math.max(size.y * 0.34, Math.min(size.x, size.z) * 0.28);
  // Placed/ghost roots have already been capped. Thumbnail roots deliberately retain authored
  // units and can be taller than the world cap; Bounds fits those afterward, so cap only the
  // runtime-sized branch.
  const top =
    roof <= MAX_BUILD_HEIGHT
      ? Math.max(roof, Math.min(MAX_BUILD_HEIGHT - 0.08, roof + desiredRise))
      : roof + desiredRise;
  return {
    cx: (bounds.min.x + bounds.max.x) / 2,
    cz: (bounds.min.z + bounds.max.z) / 2,
    floor: bounds.min.y,
    roof,
    top,
    width: size.x,
    depth: size.z,
    height: size.y,
    unit: Math.min(size.x, size.z),
    rise: Math.max(0.2, top - roof),
  };
}

function addCrown(
  root: THREE.Object3D,
  p: Proportions,
  mats: Materials,
  segments: number,
): void {
  const drumHeight = p.rise * 0.5;
  cylinder(
    root,
    "crown-drum",
    p.unit * 0.16,
    p.unit * 0.19,
    drumHeight,
    segments,
    mats.structure,
    [p.cx, p.roof + drumHeight / 2, p.cz],
  );
  cone(root, "crown-cap", p.unit * 0.25, p.rise * 0.5, segments, mats.roof, [
    p.cx,
    p.top - p.rise * 0.25,
    p.cz,
  ]);
  cylinder(
    root,
    "crown-finial",
    p.unit * 0.035,
    p.unit * 0.045,
    p.rise * 0.32,
    Math.max(6, Math.floor(segments / 2)),
    mats.accent,
    [p.cx, p.top - p.rise * 0.16, p.cz],
  );
}

function addTwinTowers(
  root: THREE.Object3D,
  p: Proportions,
  mats: Materials,
  segments: number,
): void {
  const towerHeight = p.rise + p.height * 0.2;
  const base = p.roof - p.height * 0.2;
  for (const side of [-1, 1]) {
    const x = p.cx + side * p.width * 0.37;
    cylinder(
      root,
      `twin-${side}-shaft`,
      p.unit * 0.095,
      p.unit * 0.12,
      towerHeight,
      segments,
      mats.structure,
      [x, base + towerHeight / 2, p.cz + p.depth * 0.06],
    );
    cone(root, `twin-${side}-cap`, p.unit * 0.15, p.rise * 0.38, segments, mats.roof, [
      x,
      p.top - p.rise * 0.19,
      p.cz + p.depth * 0.06,
    ]);
  }
}

function addSideTower(
  root: THREE.Object3D,
  p: Proportions,
  mats: Materials,
  segments: number,
): void {
  const width = p.width * 0.23;
  const depth = p.depth * 0.3;
  const x = p.cx + p.width * 0.38;
  const shaftTop = p.top - p.rise * 0.28;
  const shaftHeight = shaftTop - p.floor;
  box(root, "side-tower-shaft", [width, shaftHeight, depth], mats.structure, [
    x,
    p.floor + shaftHeight / 2,
    p.cz - p.depth * 0.05,
  ]);
  cone(root, "side-tower-roof", p.unit * 0.13, p.rise * 0.56, segments, mats.roof, [
    x,
    p.top - p.rise * 0.28,
    p.cz - p.depth * 0.05,
  ]);
  box(root, "side-tower-band", [width * 1.12, p.height * 0.08, depth * 1.12], mats.accent, [
    x,
    p.roof - p.height * 0.08,
    p.cz - p.depth * 0.05,
  ]);
}

function addFrontPorch(root: THREE.Object3D, p: Proportions, mats: Materials): void {
  const canopyY = p.floor + p.height * 0.48;
  const frontZ = p.cz + p.depth * 0.39;
  box(
    root,
    "porch-canopy",
    [p.width * 0.9, p.height * 0.11, p.depth * 0.2],
    mats.roof,
    [p.cx, canopyY, frontZ],
    [-0.06, 0, 0],
  );
  const postHeight = canopyY - p.floor;
  for (const side of [-1, 1]) {
    for (const row of [-1, 1]) {
      box(
        root,
        `porch-post-${side}-${row}`,
        [p.width * 0.065, postHeight, p.depth * 0.065],
        mats.structure,
        [
          p.cx + side * p.width * 0.38,
          p.floor + postHeight / 2,
          frontZ + row * p.depth * 0.08,
        ],
      );
    }
  }
  box(
    root,
    "porch-frieze",
    [p.width * 0.94, p.height * 0.08, p.depth * 0.08],
    mats.accent,
    [p.cx, canopyY - p.height * 0.08, frontZ + p.depth * 0.09],
  );
}

function addRidgeMonitor(root: THREE.Object3D, p: Proportions, mats: Materials): void {
  const monitorHeight = p.rise * 0.62;
  box(
    root,
    "ridge-monitor",
    [p.width * 0.76, monitorHeight, p.depth * 0.23],
    mats.structure,
    [p.cx, p.roof + monitorHeight / 2, p.cz],
  );
  box(
    root,
    "ridge-monitor-roof",
    [p.width * 0.86, p.rise * 0.13, p.depth * 0.34],
    mats.roof,
    [p.cx, p.roof + monitorHeight + p.rise * 0.06, p.cz],
  );
  for (const side of [-1, 1]) {
    box(
      root,
      `ridge-light-${side}`,
      [p.width * 0.62, p.rise * 0.16, p.depth * 0.035],
      mats.accent,
      [p.cx, p.roof + monitorHeight * 0.56, p.cz + side * p.depth * 0.12],
    );
  }
}

function addButtresses(root: THREE.Object3D, p: Proportions, mats: Materials): void {
  const buttressHeight = p.height + p.rise * 0.2;
  for (const xSide of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      const x = p.cx + xSide * p.width * 0.36;
      const z = p.cz + zSide * p.depth * 0.36;
      box(
        root,
        `buttress-${xSide}-${zSide}`,
        [p.width * 0.1, buttressHeight, p.depth * 0.1],
        mats.structure,
        [x, p.floor + buttressHeight / 2, z],
      );
      box(
        root,
        `buttress-parapet-${xSide}-${zSide}`,
        [p.width * 0.13, p.rise * 0.38, p.depth * 0.13],
        mats.accent,
        [x, p.roof + p.rise * 0.19, z],
      );
    }
  }
}

function addSplitWings(root: THREE.Object3D, p: Proportions, mats: Materials): void {
  const wingHeight = p.height * 0.5;
  for (const side of [-1, 1]) {
    const x = p.cx + side * p.width * 0.41;
    box(root, `wing-${side}`, [p.width * 0.2, wingHeight, p.depth * 0.72], mats.structure, [
      x,
      p.floor + wingHeight / 2,
      p.cz - side * p.depth * 0.08,
    ]);
    box(
      root,
      `wing-${side}-roof`,
      [p.width * 0.23, p.height * 0.12, p.depth * 0.78],
      mats.roof,
      [x, p.floor + wingHeight + p.height * 0.06, p.cz - side * p.depth * 0.08],
      [0, 0, side * 0.04],
    );
  }
  box(root, "wing-bridge", [p.width * 0.48, p.height * 0.13, p.depth * 0.2], mats.accent, [
    p.cx,
    p.floor + p.height * 0.62,
    p.cz,
  ]);
}

function addRoundRoof(
  root: THREE.Object3D,
  p: Proportions,
  mats: Materials,
  segments: number,
): void {
  const radius = p.unit * 0.35;
  const drumHeight = p.rise * 0.28;
  cylinder(
    root,
    "round-roof-drum",
    radius,
    radius * 1.04,
    drumHeight,
    segments,
    mats.structure,
    [p.cx, p.roof + drumHeight / 2, p.cz],
  );
  const dome = new THREE.SphereGeometry(
    radius,
    segments,
    Math.max(4, Math.floor(segments / 2)),
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  dome.scale(1, (p.rise * 0.62) / radius, 1);
  structuralMesh(root, "round-roof-dome", dome, mats.roof, [
    p.cx,
    p.roof + drumHeight,
    p.cz,
  ]);
  cylinder(
    root,
    "round-roof-oculus",
    radius * 0.16,
    radius * 0.2,
    p.rise * 0.3,
    Math.max(6, Math.floor(segments / 2)),
    mats.accent,
    [p.cx, p.top - p.rise * 0.15, p.cz],
  );
}

function addSteppedBays(root: THREE.Object3D, p: Proportions, mats: Materials): void {
  const heights = [0.38, 0.72, 1, 0.58] as const;
  for (const [index, heightRatio] of heights.entries()) {
    const bayHeight = p.rise * heightRatio;
    const x = p.cx + (index - 1.5) * p.width * 0.22;
    box(
      root,
      `stepped-bay-${index + 1}`,
      [p.width * 0.205, bayHeight, p.depth * 0.72],
      index % 2 === 0 ? mats.structure : mats.roof,
      [x, p.roof + bayHeight / 2, p.cz],
    );
    box(
      root,
      `stepped-bay-${index + 1}-cap`,
      [p.width * 0.225, p.rise * 0.08, p.depth * 0.78],
      mats.accent,
      [x, Math.min(p.roof + bayHeight + p.rise * 0.04, p.top - p.rise * 0.04), p.cz],
      [0, 0, -0.05],
    );
  }
}

/**
 * Add one canonical node's large-scale architectural read to an already fit/grounded model.
 *
 * The change is confined to the building root: no rocks, shrubs, ground scatter, or island props.
 * Unknown ids, civics, Town Hall, sites, and construction scaffolds simply do not call this seam,
 * preserving the existing neutral fallback and build-state behavior.
 */
export function applySkillBuildingArtVariation(
  root: THREE.Object3D,
  nodeId: string,
): AppliedBuildingArtVariation | null {
  const variation = buildingArtVariationForNode(nodeId);
  if (!variation) {
    return null;
  }
  const p = proportions(root);
  if (!p) {
    return null;
  }
  const mats = materialsFor(variation);
  const before = new Set<THREE.BufferGeometry>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) before.add(object.geometry);
  });

  switch (variation.profile) {
    case "crown":
      addCrown(root, p, mats, variation.grammar.roundSegments);
      break;
    case "twin-towers":
      addTwinTowers(root, p, mats, variation.grammar.roundSegments);
      break;
    case "side-tower":
      addSideTower(root, p, mats, variation.grammar.roundSegments);
      break;
    case "front-porch":
      addFrontPorch(root, p, mats);
      break;
    case "ridge-monitor":
      addRidgeMonitor(root, p, mats);
      break;
    case "buttressed":
      addButtresses(root, p, mats);
      break;
    case "split-wings":
      addSplitWings(root, p, mats);
      break;
    case "round-roof":
      addRoundRoof(root, p, mats, variation.grammar.roundSegments);
      break;
    case "stepped-bays":
      addSteppedBays(root, p, mats);
      break;
  }

  const geometries: THREE.BufferGeometry[] = [];
  let meshes = 0;
  let triangles = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || before.has(object.geometry)) return;
    if (!geometries.includes(object.geometry)) geometries.push(object.geometry);
    meshes += 1;
    triangles += triangleCount(object.geometry);
  });
  root.userData.buildingArtVariation = {
    nodeId,
    eraId: variation.eraId,
    profile: variation.profile,
    structuralFeature: variation.structuralFeature,
  };
  return { variation, geometries, meshes, triangles };
}
