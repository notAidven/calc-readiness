import {
  PLAGUE,
  type PlagueNodeView,
  type PlagueRouteView,
  type PlagueState,
  plagueNodeViews,
  plaguePendingIntervention,
  plagueRouteViews,
} from "@cr/game";
import * as THREE from "three";

import { PLAGUE_MARK_TONES, PLAGUE_SCENE_TONES } from "../city/three/plague-tones";
import { rotationYFor } from "../city/worldLayout";
import type { PlagueWorld, PlagueWorldNode, PlagueWorldRoute } from "./plagueWorld";

const TONES = {
  stucco: PLAGUE_SCENE_TONES.BODY_STUCCO,
  trim: 0xd8cdb3,
  lead: PLAGUE_SCENE_TONES.LEAD,
  linen: 0xe2ded2,
  timber: PLAGUE_MARK_TONES.SHUTTER_TIMBER,
  vessel: PLAGUE_MARK_TONES.VESSEL,
  inlay: PLAGUE_MARK_TONES.INLAY,
  shut: PLAGUE_MARK_TONES.INLAY_SHUT,
  notch: PLAGUE_MARK_TONES.INLAY_NOTCH,
  barrier: PLAGUE_MARK_TONES.BARRIER_STONE,
  band: PLAGUE_MARK_TONES.BARRIER_BAND,
  paving: PLAGUE_SCENE_TONES.PAVING,
} as const;

type Materials = Readonly<
  Record<keyof typeof TONES | "pending", THREE.MeshStandardMaterial>
>;

function materials(): Materials {
  const entries = Object.entries(TONES).map(([name, color]) => [
    name,
    new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      metalness: 0,
      roughness: 0.94,
    }),
  ]);
  const pending = new THREE.MeshStandardMaterial({
    color: TONES.lead,
    flatShading: true,
    metalness: 0,
    roughness: 0.94,
    transparent: true,
    opacity: 0.42,
    wireframe: true,
    depthWrite: false,
  });
  return Object.fromEntries([...entries, ["pending", pending]]) as Materials;
}

function box(
  group: THREE.Group,
  name: string,
  size: readonly [number, number, number],
  at: readonly [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...at);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function vessel(
  group: THREE.Group,
  at: readonly [number, number, number],
  name: string,
  palette: Materials,
): void {
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.27, 0.48, 8),
    palette.vessel,
  );
  body.name = name;
  body.position.set(at[0], at[1] + 0.24, at[2]);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  box(group, `${name}-lid`, [0.46, 0.08, 0.46], [at[0], at[1] + 0.52, at[2]], palette.trim);
}

function linenBundle(
  group: THREE.Group,
  at: readonly [number, number, number],
  name: string,
  palette: Materials,
): void {
  box(group, name, [0.58, 0.12, 0.42], at, palette.linen);
}

function localMarker(node: PlagueWorldNode): {
  readonly group: THREE.Group;
  readonly turn: number;
} {
  const group = new THREE.Group();
  const turn = rotationYFor(node.transform.rot);
  group.position.set(
    node.center.x + Math.sin(turn) * 3.1,
    0.18,
    node.center.z + Math.cos(turn) * 3.1,
  );
  group.rotation.y = turn;
  return { group, turn };
}

function buildCareHouse(
  root: THREE.Group,
  node: PlagueWorldNode,
  palette: Materials,
): void {
  const { group } = localMarker(node);
  group.name = "plague-care-house";
  group.position.x += 3.7;
  const width = 6.6;
  box(group, "care-house-floor", [width, 0.16, 2.2], [0, 0.08, 0], palette.trim);
  box(group, "care-house-roof", [width + 0.4, 0.22, 2.6], [0, 2.55, 0], palette.lead);
  box(group, "care-house-lintel", [width, 0.3, 0.38], [0, 2.18, -0.9], palette.stucco);
  for (let post = 0; post <= 3; post += 1) {
    const x = -width / 2 + (post / 3) * width;
    box(group, "care-house-post", [0.28, 2.3, 0.28], [x, 1.18, -0.9], palette.trim);
  }
  for (let bay = 0; bay < 3; bay += 1) {
    const x = -2.2 + bay * 2.2;
    box(group, "care-house-bed", [1.4, 0.24, 0.74], [x, 0.35, 0.28], palette.timber);
    linenBundle(group, [x, 0.55, 0.28], "care-house-linen", palette);
  }
  root.add(group);
}

function routeGroup(
  route: PlagueWorldRoute,
  view: PlagueRouteView,
  palette: Materials,
): THREE.Group {
  const group = new THREE.Group();
  const dx = route.toCenter.x - route.fromCenter.x;
  const dz = route.toCenter.z - route.fromCenter.z;
  const length = Math.hypot(dx, dz);
  group.position.set(
    (route.fromCenter.x + route.toCenter.x) / 2,
    0.22,
    (route.fromCenter.z + route.toCenter.z) / 2,
  );
  group.rotation.y = Math.atan2(dx, dz);
  box(
    group,
    `plague-route:${route.id}`,
    [0.72, 0.11, length],
    [0, 0, 0],
    view.quarantine_rounds > 0 ? palette.shut : palette.inlay,
  );
  if (view.carried_last_night) {
    for (let index = 0; index < 5; index += 1) {
      const along = -length * 0.34 + (index / 4) * length * 0.68;
      box(
        group,
        `plague-carried-notch:${route.id}`,
        [1.05, 0.13, 0.2],
        [0, 0.09, along],
        palette.notch,
      );
    }
  }
  if (view.quarantine_rounds > 0) {
    box(
      group,
      `plague-quarantine:${route.id}`,
      [1.65, 0.34, 0.62],
      [0, 0.2, 0],
      palette.barrier,
    );
    for (let band = 0; band < view.quarantine_rounds; band += 1) {
      box(
        group,
        `plague-quarantine-band:${route.id}`,
        [0.12, 0.43, 0.72],
        [-0.44 + band * 0.44, 0.25, 0],
        palette.band,
      );
    }
  }
  return group;
}

function buildInfected(root: THREE.Group, node: PlagueWorldNode, palette: Materials): void {
  const { group } = localMarker(node);
  group.name = `plague-infected:${node.id}`;
  box(group, "plague-infected-pedestal", [1.1, 0.45, 1.1], [0, 0.23, 0], palette.paving);
  box(group, "plague-infected-column", [0.24, 1.4, 0.24], [0, 1.0, 0], palette.vessel);
  vessel(group, [0, 1.68, 0], "plague-infected-vessel", palette);
  root.add(group);
}

function buildExposed(root: THREE.Group, node: PlagueWorldNode, palette: Materials): void {
  const { group } = localMarker(node);
  group.name = `plague-exposed:${node.id}`;
  box(group, "plague-exposed-left", [0.16, 1.2, 0.16], [-0.62, 0.6, 0], palette.inlay);
  box(group, "plague-exposed-right", [0.16, 1.2, 0.16], [0.62, 0.6, 0], palette.inlay);
  box(group, "plague-exposed-back", [1.4, 0.16, 0.16], [0, 1.16, 0], palette.inlay);
  root.add(group);
}

function buildCared(
  root: THREE.Group,
  node: PlagueWorldNode,
  view: PlagueNodeView,
  palette: Materials,
): void {
  const { group } = localMarker(node);
  group.name = `plague-cared:${node.id}`;
  for (const x of [-0.62, 0.62]) {
    box(group, "plague-care-post", [0.16, 1.35, 0.16], [x, 0.68, 0], palette.timber);
  }
  box(group, "plague-care-canopy", [1.6, 0.16, 1.1], [0, 1.4, 0], palette.linen);
  for (let index = 0; index < view.care_strength; index += 1) {
    linenBundle(group, [-0.46 + index * 0.46, 0.18, 0], "plague-care-strength", palette);
  }
  root.add(group);
}

function buildPending(
  root: THREE.Group,
  state: PlagueState,
  world: PlagueWorld,
  palette: Materials,
): void {
  const pending = plaguePendingIntervention(state);
  if (pending === null || pending.committed) {
    return;
  }
  if (pending.kind === "quarantine") {
    const route = world.routes.find((entry) => entry.id === pending.target_id);
    if (!route) {
      return;
    }
    const view = plagueRouteViews(state).find((entry) => entry.id === route.id);
    if (!view) {
      return;
    }
    const group = routeGroup(route, { ...view, quarantine_rounds: 0 }, palette);
    group.name = `plague-pending-quarantine:${route.id}`;
    const outline = group.getObjectByName(`plague-route:${route.id}`) as
      | THREE.Mesh
      | undefined;
    if (outline) {
      outline.name = "plague-pending-route-outline";
      outline.material = palette.pending;
    }
    box(group, "plague-pending-barrier", [1.7, 0.42, 0.7], [0, 0.22, 0], palette.pending);
    for (let index = 0; index < state.answers.length; index += 1) {
      box(
        group,
        state.answers[index] ? "plague-pending-right" : "plague-pending-miss",
        [0.14, 0.5, 0.78],
        [-0.44 + index * 0.44, 0.26, 0],
        state.answers[index] ? palette.band : palette.pending,
      );
    }
    root.add(group);
    return;
  }
  const node = world.nodes.find((entry) => entry.id === pending.target_id);
  if (!node) {
    return;
  }
  const { group } = localMarker(node);
  group.name = `plague-pending-care:${node.id}`;
  box(group, "plague-pending-canopy", [1.7, 1.5, 1.2], [0, 0.76, 0], palette.pending);
  for (let index = 0; index < state.answers.length; index += 1) {
    linenBundle(
      group,
      [-0.46 + index * 0.46, 0.18, 0],
      state.answers[index] ? "plague-pending-right" : "plague-pending-miss",
      palette,
    );
  }
  root.add(group);
}

export function buildCareHouseLayer(input: {
  readonly state: PlagueState;
  readonly world: PlagueWorld;
}): THREE.Group {
  const root = new THREE.Group();
  const palette = materials();
  root.name = "plague-live-city-layer";
  root.userData.round = input.state.round;
  root.userData.phase = input.state.phase;

  const routeViews = new Map(
    plagueRouteViews(input.state).map((route) => [route.id, route]),
  );
  for (const route of input.world.routes) {
    const view = routeViews.get(route.id);
    if (view) {
      root.add(routeGroup(route, view, palette));
    }
  }

  const nodeViews = new Map(plagueNodeViews(input.state).map((node) => [node.id, node]));
  for (const node of input.world.nodes) {
    const view = nodeViews.get(node.id);
    if (!view) {
      continue;
    }
    if (view.status === "infected") {
      buildInfected(root, node, palette);
    } else if (view.status === "cared") {
      buildCared(root, node, view, palette);
    } else if (view.status === "exposed") {
      buildExposed(root, node, palette);
    }
  }

  const careHouse = input.world.nodes.find((node) => node.id === "care-house");
  if (careHouse) {
    buildCareHouse(root, careHouse, palette);
  }
  buildPending(root, input.state, input.world, palette);

  let meshes = 0;
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshes += 1;
    }
  });
  root.userData.meshes = meshes;
  root.userData.budget = 100;
  root.userData.maxStrength = PLAGUE.max_intervention_strength;
  return root;
}

export function disposeCareHouseLayer(group: THREE.Object3D): void {
  const disposedMaterials = new Set<THREE.Material>();
  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.geometry.dispose();
    const entries = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of entries) {
      if (!disposedMaterials.has(material)) {
        disposedMaterials.add(material);
        material.dispose();
      }
    }
  });
}
