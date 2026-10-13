import * as THREE from "three";

import {
  EARLY_MODERN_BUILDING_VARIANTS,
  type EarlyModernBuildingVariant,
} from "../earlyModernBuildingVariants";

/**
 * The six canonical Era 6 building identities.
 *
 * These keys come from the locked concept census in
 * `output/imagegen/era-06-early-modern-building-briefs/README.md`. They are procedural
 * runtime models because no Era 6 GLBs have been delivered; each keeps the concept's primary
 * mass and one identity-bearing feature instead of falling through to the shared neutral shell.
 */

const WALL = 0xc7a48e;
const WALL_DARK = 0xa98370;
const BRICK = 0xb1775a;
const STONE = 0xd8cdb3;
const ROOF = 0x596675;
const ROOF_DARK = 0x46515f;
const WOOD = 0x654937;
const GLASS = 0x40586a;
const METAL = 0x4c5661;

function material(color: number, metalness = 0.02): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: metalness > 0.1 ? 0.58 : 0.88,
    metalness,
    flatShading: true,
  });
}

function addMesh(
  root: THREE.Object3D,
  name: string,
  geometry: THREE.BufferGeometry,
  color: number,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
  metalness = 0.02,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material(color, metalness));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

function box(
  root: THREE.Object3D,
  name: string,
  size: readonly [number, number, number],
  color: number,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  return addMesh(root, name, new THREE.BoxGeometry(...size), color, position, rotation);
}

function cylinder(
  root: THREE.Object3D,
  name: string,
  top: number,
  bottom: number,
  height: number,
  segments: number,
  color: number,
  position: readonly [number, number, number],
  metalness = 0.02,
): THREE.Mesh {
  return addMesh(
    root,
    name,
    new THREE.CylinderGeometry(top, bottom, height, segments),
    color,
    position,
    [0, 0, 0],
    metalness,
  );
}

function roofPrism(width: number, depth: number, height: number): THREE.BufferGeometry {
  const w = width / 2;
  const d = depth / 2;
  const vertices = new Float32Array([
    -w,
    0,
    -d,
    w,
    0,
    -d,
    0,
    height,
    -d,
    -w,
    0,
    d,
    w,
    0,
    d,
    0,
    height,
    d,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([
    0, 1, 2, 3, 5, 4, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

function window(
  root: THREE.Object3D,
  name: string,
  x: number,
  y: number,
  z: number,
  width = 0.62,
  height = 1.1,
): void {
  box(root, `${name}-frame`, [width + 0.18, height + 0.18, 0.12], STONE, [x, y, z]);
  box(root, `${name}-glass`, [width, height, 0.16], GLASS, [x, y, z + 0.05]);
}

function finish(root: THREE.Group, variant: EarlyModernBuildingVariant): THREE.Group {
  root.name = variant;
  root.userData.modelIdentity = variant;
  root.userData.authoredReference =
    "output/imagegen/era-06-early-modern-building-briefs/README.md";
  return root;
}

function observatory(): THREE.Group {
  const root = new THREE.Group();
  box(root, "observatory-plinth", [6.5, 0.5, 6.5], STONE, [0, 0.25, 0]);
  box(root, "observatory-tower", [5.5, 4.7, 5.5], WALL, [0, 2.85, 0]);
  cylinder(root, "observatory-drum", 2.65, 2.65, 0.65, 12, STONE, [0, 5.52, 0]);
  addMesh(
    root,
    "observatory-lead-dome",
    new THREE.SphereGeometry(2.55, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    ROOF,
    [0, 5.83, 0],
    [0, 0, 0],
    0.18,
  );
  cylinder(root, "observatory-lantern", 0.66, 0.78, 1.05, 8, ROOF_DARK, [0, 8.45, 0], 0.18);
  for (const [index, x] of [-1.55, 0, 1.55].entries()) {
    window(root, `observatory-window-${index + 1}`, x, 3.15, 2.82);
  }
  const telescope = cylinder(
    root,
    "observatory-telescope",
    0.22,
    0.34,
    3.2,
    8,
    METAL,
    [2.5, 2.1, 2.55],
    0.65,
  );
  telescope.rotation.z = Math.PI / 2.8;
  telescope.rotation.x = Math.PI / 2;
  return finish(root, EARLY_MODERN_BUILDING_VARIANTS["GEO.1"]);
}

function drawingOffice(): THREE.Group {
  const root = new THREE.Group();
  box(root, "drawing-office-plinth", [7.6, 0.42, 3.8], STONE, [0, 0.21, 0]);
  box(root, "drawing-office-block", [7.1, 4.8, 3.3], WALL, [0, 2.82, 0]);
  addMesh(
    root,
    "drawing-office-roof",
    roofPrism(7.5, 3.9, 1.8),
    ROOF,
    [0, 5.2, 0],
    [0, Math.PI / 2, 0],
  );
  for (const [index, x] of [-2.65, -0.9, 0.9, 2.65].entries()) {
    window(root, `drawing-office-upper-${index + 1}`, x, 3.55, 1.7, 0.54, 1.2);
    window(root, `drawing-office-lower-${index + 1}`, x, 1.65, 1.7, 0.54, 1.05);
  }
  for (const x of [-2.4, 2.4]) {
    box(root, `drawing-office-dormer-${x}`, [1.1, 0.9, 0.9], WALL, [x, 5.92, 0.82]);
    addMesh(root, `drawing-office-dormer-roof-${x}`, roofPrism(1.35, 1.1, 0.5), ROOF_DARK, [
      x,
      6.35,
      0.82,
    ]);
  }
  return finish(root, EARLY_MODERN_BUILDING_VARIANTS["GEO.2"]);
}

function mapmakersHouse(): THREE.Group {
  const root = new THREE.Group();
  box(root, "mapmakers-house", [3.7, 6.2, 3.9], WALL, [-1.45, 3.3, -0.75]);
  addMesh(root, "mapmakers-roof", roofPrism(4.2, 4.4, 1.65), ROOF, [-1.45, 6.4, -0.75]);
  box(root, "mapmakers-oriel", [2.1, 1.65, 0.8], STONE, [-1.45, 3.9, 1.58]);
  for (const [index, x] of [-2.1, -0.8].entries()) {
    window(root, `mapmakers-window-${index + 1}`, x, 2.1, 1.3, 0.48, 0.9);
  }
  for (const [index, [x, z, w, d]] of (
    [
      [1.45, -2.4, 3.5, 0.35],
      [3.0, -0.8, 0.35, 3.55],
      [1.45, 0.85, 3.5, 0.35],
    ] as const
  ).entries()) {
    box(root, `mapmakers-court-wall-${index + 1}`, [w, 1.05, d], STONE, [x, 0.52, z]);
  }
  cylinder(
    root,
    "mapmakers-survey-instrument",
    0.46,
    0.46,
    0.24,
    10,
    METAL,
    [1.45, 2.5, -0.7],
    0.45,
  );
  for (const turn of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const leg = box(root, `mapmakers-tripod-${turn}`, [0.16, 2.5, 0.16], WOOD, [
      1.45 + Math.cos(turn) * 0.55,
      1.25,
      -0.7 + Math.sin(turn) * 0.55,
    ]);
    leg.rotation.z = Math.cos(turn) * 0.16;
    leg.rotation.x = Math.sin(turn) * 0.16;
  }
  return finish(root, EARLY_MODERN_BUILDING_VARIANTS["CG.1"]);
}

function printingHouse(): THREE.Group {
  const root = new THREE.Group();
  box(root, "printing-house-block", [5.7, 6.2, 5.1], WALL, [0, 3.1, 0]);
  addMesh(root, "printing-house-roof", roofPrism(6.2, 5.6, 2.1), ROOF, [0, 6.2, 0]);
  for (const [index, [width, y]] of (
    [
      [3.9, 6.35],
      [3.0, 6.95],
      [2.1, 7.55],
    ] as const
  ).entries()) {
    box(root, `printing-house-stepped-gable-${index + 1}`, [width, 0.62, 0.35], STONE, [
      0,
      y,
      2.73,
    ]);
  }
  box(root, "printing-house-loading-door", [2.25, 2.7, 0.25], WOOD, [0, 1.5, 2.66]);
  for (const x of [-1.9, 1.9]) {
    box(root, `printing-house-chimney-${x}`, [0.62, 2.2, 0.62], BRICK, [x, 7.45, 0]);
  }
  for (const [index, x] of [-1.65, 0, 1.65].entries()) {
    window(root, `printing-house-window-${index + 1}`, x, 4.25, 2.66, 0.52, 0.95);
  }
  return finish(root, EARLY_MODERN_BUILDING_VARIANTS["POL.6"]);
}

function lectureTheatre(): THREE.Group {
  const root = new THREE.Group();
  cylinder(root, "lecture-theatre-hall", 3.65, 3.8, 4.1, 10, WALL, [0, 2.05, 0]);
  cylinder(root, "lecture-theatre-cornice", 3.9, 3.9, 0.42, 10, STONE, [0, 4.2, 0]);
  addMesh(
    root,
    "lecture-theatre-roof",
    new THREE.ConeGeometry(4.05, 1.85, 10),
    ROOF,
    [0, 5.25, 0],
    [0, 0, 0],
    0.16,
  );
  cylinder(
    root,
    "lecture-theatre-cupola",
    0.72,
    0.88,
    1.15,
    8,
    ROOF_DARK,
    [0, 6.55, 0],
    0.2,
  );
  for (let index = 0; index < 5; index += 1) {
    const angle = -1.25 + index * 0.62;
    const x = Math.sin(angle) * 3.61;
    const z = Math.cos(angle) * 3.61;
    const opening = box(
      root,
      `lecture-theatre-window-${index + 1}`,
      [0.62, 1.0, 0.16],
      GLASS,
      [x, 2.55, z],
    );
    opening.rotation.y = angle;
  }
  return finish(root, EARLY_MODERN_BUILDING_VARIANTS["POL.7"]);
}

function cannonTower(): THREE.Group {
  const root = new THREE.Group();
  cylinder(root, "cannon-tower-plinth", 4.15, 4.15, 0.5, 12, STONE, [0, 0.25, 0]);
  cylinder(root, "cannon-tower-battered-wall", 3.35, 4.0, 3.9, 12, WALL_DARK, [0, 2.2, 0]);
  cylinder(root, "cannon-tower-parapet", 3.85, 3.85, 0.58, 12, STONE, [0, 4.42, 0]);
  cylinder(root, "cannon-tower-inner-deck", 3.15, 3.15, 0.22, 12, ROOF_DARK, [0, 4.18, 0]);
  for (const [index, angle] of [-0.72, 0, 0.72].entries()) {
    const x = Math.sin(angle) * 3.62;
    const z = Math.cos(angle) * 3.62;
    const opening = box(
      root,
      `cannon-tower-embrasure-${index + 1}`,
      [0.82, 0.74, 0.22],
      METAL,
      [x, 2.45, z],
    );
    opening.rotation.y = angle;
  }
  const ramp = box(
    root,
    "cannon-tower-ramp",
    [2.15, 0.55, 4.0],
    STONE,
    [0, 0.75, 4.45],
    [-0.2, 0, 0],
  );
  ramp.receiveShadow = true;
  return finish(root, EARLY_MODERN_BUILDING_VARIANTS["RAT.5"]);
}

const BUILDERS: Readonly<Record<EarlyModernBuildingVariant, () => THREE.Group>> = {
  "early-modern:observatory": observatory,
  "early-modern:drawing-office": drawingOffice,
  "early-modern:mapmakers-house": mapmakersHouse,
  "early-modern:printing-house": printingHouse,
  "early-modern:lecture-theatre": lectureTheatre,
  "early-modern:cannon-tower": cannonTower,
};

const templates = new Map<EarlyModernBuildingVariant, THREE.Group>();

/** Return the cached canonical primary-mass model; callers clone it through `prepareModel`. */
export function earlyModernBuiltModel(variant: string): THREE.Object3D | null {
  const typedVariant = variant as EarlyModernBuildingVariant;
  const builder = BUILDERS[typedVariant];
  if (builder === undefined) {
    return null;
  }
  let template = templates.get(typedVariant);
  if (template === undefined) {
    template = builder();
    templates.set(typedVariant, template);
  }
  return template;
}
