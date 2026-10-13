import { render, waitFor } from "@testing-library/react";
import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GhostBuilding } from "./GhostBuilding";

const HARNESS = vi.hoisted(() => ({
  scene: null as THREE.Object3D | null,
}));

vi.mock("@react-three/fiber", () => ({
  useFrame: () => {},
}));

vi.mock("@react-three/drei", () => {
  const useGLTF = Object.assign(
    () => {
      if (!HARNESS.scene) throw new Error("ghost lifecycle scene was not installed");
      return { scene: HARNESS.scene };
    },
    { preload: vi.fn() },
  );
  return { useGLTF };
});

function sourceFixture() {
  const texture = new THREE.DataTexture(new Uint8Array([1, 2, 3, 255]), 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x52798f, map: texture });
  const geometry = new THREE.BoxGeometry(2, 3, 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 1.5;
  const scene = new THREE.Group().add(mesh);
  return { scene, geometry, material, texture };
}

function mountedGhost() {
  return render(
    <GhostBuilding
      url="/fixture-ghost.glb"
      footprint={{ w: 1, d: 1 }}
      targetRef={{ current: null as unknown as THREE.Vector3 }}
      rotationRef={{ current: 0 }}
      validRef={{ current: true }}
      reducedMotion
    />,
  );
}

describe("ghost override ownership", () => {
  beforeEach(() => {
    HARNESS.scene = null;
  });

  it("disposes only each mounted app override exactly once and remounts cleanly", async () => {
    const source = sourceFixture();
    HARNESS.scene = source.scene;
    const sourceMaterialDispose = vi.spyOn(source.material, "dispose");
    const overrideDispose = vi.spyOn(THREE.MeshStandardMaterial.prototype, "dispose");
    const sourceGeometryDispose = vi.spyOn(source.geometry, "dispose");
    const sourceTextureDispose = vi.spyOn(source.texture, "dispose");

    const first = mountedGhost();
    first.unmount();
    await waitFor(() =>
      expect(
        overrideDispose,
        "the first app-owned ghost override is disposed exactly once",
      ).toHaveBeenCalledTimes(1),
    );
    expect(sourceMaterialDispose).not.toHaveBeenCalled();
    expect(sourceGeometryDispose).not.toHaveBeenCalled();
    expect(sourceTextureDispose).not.toHaveBeenCalled();

    const second = mountedGhost();
    expect(
      overrideDispose,
      "remount does not reuse or redispose the first override",
    ).toHaveBeenCalledTimes(1);
    second.unmount();
    await waitFor(() =>
      expect(
        overrideDispose,
        "the remounted app override has its own one-shot cleanup",
      ).toHaveBeenCalledTimes(2),
    );
    expect(sourceMaterialDispose).not.toHaveBeenCalled();
    expect(sourceGeometryDispose).not.toHaveBeenCalled();
    expect(sourceTextureDispose).not.toHaveBeenCalled();
  });
});
