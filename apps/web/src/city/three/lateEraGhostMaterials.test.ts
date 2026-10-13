import * as THREE from "three";
import { describe, expect, it } from "vitest";

import type { Footprint } from "../worldLayout";
import { prepareGhost } from "./GhostBuilding";

const FOOTPRINT: Footprint = { w: 2, d: 1 };

function ghostSource() {
  const transport = new THREE.MeshStandardMaterial({
    color: 0x4f80a8,
    roughness: 0.2,
    metalness: 0.8,
  });
  // Deliberately invalid as a full restoration record. Ghost preparation owes only
  // validated asset/node metadata before the app's one shared blueprint material replaces it.
  transport.userData.gridworkMaterial = { schema: 999, kind: "not-runtime-material" };
  const first = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4, 1), transport);
  first.name = "ghost-first";
  first.position.y = 2;
  const second = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2, 0.75), transport);
  second.name = "ghost-second";
  second.position.set(0.8, 1, 0);
  const ordered = new THREE.Group();
  ordered.name = "ghost-ordered";
  ordered.userData.gridworkRenderOrder = 3;
  ordered.add(first, second);
  const root = new THREE.Group();
  root.userData.gridworkLateEraAsset = {
    schema: 1,
    sourceSha256: "c".repeat(64),
    era: "cyberpunk",
    sourceKey: "TRG.4",
    stage: "built",
    basename: "trg-4-built",
  };
  root.add(ordered);
  return { root, transport, ordered, first, second };
}

function namedMesh(root: THREE.Object3D, name: string): THREE.Mesh {
  const object = root.getObjectByName(name);
  if (!(object instanceof THREE.Mesh)) throw new Error(`fixture lost ${name}`);
  return object;
}

describe("late-era placement ghost policy", () => {
  it("restores only node order, then applies one app Standard material and no shadows", () => {
    const source = ghostSource();
    let prepared: ReturnType<typeof prepareGhost> | undefined;
    let thrown: unknown;
    try {
      prepared = prepareGhost(source.root, FOOTPRINT);
    } catch (error) {
      thrown = error;
    }
    expect(thrown, "RUN017 final node-only ghost preparation assertion").toBeUndefined();
    if (!prepared) throw new Error("ghost preparation returned no result");
    const first = namedMesh(prepared.object, "ghost-first");
    const second = namedMesh(prepared.object, "ghost-second");
    const grounded = new THREE.Box3().setFromObject(prepared.object);

    expect(prepared.object).not.toBe(source.root);
    expect(prepared.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(first.material).toBe(prepared.material);
    expect(second.material).toBe(prepared.material);
    expect(first.material).not.toBe(source.transport);
    expect(first.material).not.toBeInstanceOf(THREE.MeshToonMaterial);
    expect(first.material).not.toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(
      prepared.object.getObjectByName("ghost-ordered")?.renderOrder,
      "RUN020 final ghost node-order assertion",
    ).toBe(3);
    expect(first.castShadow, "RUN018 final ghost-shadow assertion").toBe(false);
    expect(first.receiveShadow).toBe(false);
    expect(second.castShadow).toBe(false);
    expect(second.receiveShadow).toBe(false);
    expect(grounded.min.y).toBeCloseTo(0, 10);

    // The loader-owned source stays transport-PBR and unprepared.
    expect(source.first.material).toBe(source.transport);
    expect(source.second.material).toBe(source.transport);
    expect(source.ordered.renderOrder).toBe(0);
    expect(source.first.castShadow).toBe(false);
    expect(source.first.receiveShadow).toBe(false);
  });
});
