import type { EraId } from "@cr/skill-graph";
import * as THREE from "three";

import { islandGround } from "../islandGround";
import { type Footprint, GRID_CELL } from "../worldLayout";

function material(color: number, emissive = false): THREE.Material {
  return emissive
    ? new THREE.MeshBasicMaterial({ color, toneMapped: false })
    : new THREE.MeshStandardMaterial({
        color,
        roughness: 0.86,
        metalness: 0.03,
        flatShading: true,
      });
}

function box(
  root: THREE.Object3D,
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  color: number,
  emissive = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, emissive));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = !emissive;
  mesh.receiveShadow = !emissive;
  root.add(mesh);
  return mesh;
}

function cylinder(
  root: THREE.Object3D,
  name: string,
  radius: number,
  height: number,
  position: readonly [number, number, number],
  color: number,
  segments = 10,
  emissive = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.96, height, segments),
    material(color, emissive),
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = !emissive;
  mesh.receiveShadow = !emissive;
  root.add(mesh);
  return mesh;
}

function roof(
  root: THREE.Object3D,
  name: string,
  halfWidth: number,
  halfDepth: number,
  height: number,
  y: number,
  color: number,
): void {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(Math.SQRT2, height, 4, 1, false, Math.PI / 4),
    material(color),
  );
  mesh.name = name;
  mesh.scale.set(halfWidth, 1, halfDepth);
  mesh.position.y = y;
  mesh.castShadow = true;
  root.add(mesh);
}

function renaissanceHall(root: THREE.Group, width: number, depth: number): void {
  box(
    root,
    "renaissance-hall-main",
    [width * 0.58, 3.8, depth * 0.58],
    [0, 1.9, 0],
    0xc9b37f,
  );
  box(
    root,
    "renaissance-hall-wing-west",
    [width * 0.2, 2.5, depth * 0.48],
    [-width * 0.36, 1.25, 0],
    0xb99d69,
  );
  box(
    root,
    "renaissance-hall-wing-east",
    [width * 0.2, 2.5, depth * 0.48],
    [width * 0.36, 1.25, 0],
    0xb99d69,
  );
  roof(root, "renaissance-hall-roof", width * 0.34, depth * 0.39, 2.4, 5, 0x6c4a34);
  cylinder(root, "renaissance-hall-cupola", 0.8, 1.25, [0, 6.15, 0], 0x7e6748, 8);
  roof(root, "renaissance-hall-cupola-roof", 0.72, 0.72, 1.1, 7.27, 0x45605a);
}

function atomicHall(root: THREE.Group, width: number, depth: number): void {
  box(root, "atomic-hall-bunker", [width * 0.66, 2.6, depth * 0.58], [0, 1.3, 0], 0xd4d2b9);
  cylinder(root, "atomic-hall-rotunda", depth * 0.24, 3.4, [0, 1.75, 0], 0x91a99b, 16);
  cylinder(root, "atomic-hall-canopy", depth * 0.34, 0.34, [0, 3.62, 0], 0xe3e0c8, 18);
  cylinder(root, "atomic-hall-signal-mast", 0.16, 3.5, [0, 5.05, 0], 0x596c64, 8);
  cylinder(root, "atomic-hall-orange-beacon", 0.32, 0.38, [0, 6.92, 0], 0xe06c2d, 8, true);
}

function informationHall(root: THREE.Group, width: number, depth: number): void {
  box(
    root,
    "information-hall-data-wing",
    [width * 0.68, 2.4, depth * 0.54],
    [0, 1.2, 0],
    0xa8b5b0,
  );
  box(
    root,
    "information-hall-glass-core",
    [width * 0.3, 5.2, depth * 0.4],
    [0, 2.82, 0],
    0x477b82,
  );
  box(
    root,
    "information-hall-bridge",
    [width * 0.82, 0.7, depth * 0.28],
    [0, 3.22, 0],
    0xd0d5cb,
  );
  for (const side of [-1, 1]) {
    box(
      root,
      `information-hall-server-fin-${side}`,
      [0.22, 3.1, depth * 0.64],
      [side * width * 0.3, 1.77, 0],
      0x71837e,
    );
  }
  cylinder(root, "information-hall-antenna", 0.12, 3.2, [0, 6.97, 0], 0x324a52, 8);
  box(root, "information-hall-signal", [1.6, 0.12, 0.12], [0, 7.97, 0], 0x50c8d2, true);
}

function cyberpunkHall(root: THREE.Group, width: number, depth: number): void {
  box(
    root,
    "cyberpunk-hall-lower",
    [width * 0.64, 2.3, depth * 0.56],
    [0, 1.15, 0],
    0x303944,
  );
  box(
    root,
    "cyberpunk-hall-offset-tower",
    [width * 0.34, 5.6, depth * 0.38],
    [-width * 0.12, 3.75, 0],
    0x222a35,
  );
  box(
    root,
    "cyberpunk-hall-skybridge",
    [width * 0.72, 0.74, depth * 0.3],
    [width * 0.08, 3.8, 0],
    0x3a4652,
  );
  for (const side of [-1, 1]) {
    box(
      root,
      `cyberpunk-hall-cyan-rail-${side}`,
      [0.16, 5.4, 0.18],
      [side * width * 0.29, 3.05, depth * 0.28],
      0x2fe6e6,
      true,
    );
  }
  box(
    root,
    "cyberpunk-hall-magenta-crown",
    [width * 0.42, 0.16, depth * 0.46],
    [-width * 0.12, 6.7, 0],
    0xff4fd8,
    true,
  );
  cylinder(
    root,
    "cyberpunk-hall-amber-beacon",
    0.2,
    1.8,
    [width * 0.22, 5.9, 0],
    0xffb03a,
    7,
    true,
  );
}

/** Intentional late-era Hall treatment used only where no finished GLB exists. */
export function buildEraTownHallFallback(eraId: EraId, footprint: Footprint): THREE.Group {
  const root = new THREE.Group();
  root.name = `town-hall-${eraId}-procedural-fallback`;
  root.userData.eraTownHallFallback = eraId;
  root.userData.sitsOnNaturalTerrain = true;
  const width = footprint.w * GRID_CELL;
  const depth = footprint.d * GRID_CELL;
  switch (eraId) {
    case "renaissance":
      renaissanceHall(root, width, depth);
      break;
    case "atomic_age":
      atomicHall(root, width, depth);
      break;
    case "information_age":
      informationHall(root, width, depth);
      break;
    case "cyberpunk":
      cyberpunkHall(root, width, depth);
      break;
    default: {
      const tones = islandGround(eraId).tones;
      box(
        root,
        `${eraId}-hall-body`,
        [width * 0.62, 3.4, depth * 0.56],
        [0, 1.7, 0],
        tones.groundPale,
      );
      roof(
        root,
        `${eraId}-hall-roof`,
        width * 0.36,
        depth * 0.38,
        2.3,
        4.55,
        tones.earthWorn,
      );
    }
  }
  return root;
}
