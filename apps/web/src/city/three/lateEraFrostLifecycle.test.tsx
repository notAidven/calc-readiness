import { cleanup, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedBuildingModel } from "../buildingAssets";
import { PlacedModelStack } from "./PlacedBuilding";

const HARNESS = vi.hoisted(() => ({
  scene: null as THREE.Object3D | null,
  useGLTF: vi.fn(),
  preload: vi.fn(),
}));

vi.mock("@react-three/fiber", () => ({
  useFrame: () => {},
}));

vi.mock("@react-three/drei", () => {
  const useGLTF = Object.assign(
    () => {
      HARNESS.useGLTF();
      if (!HARNESS.scene) throw new Error("frost lifecycle scene was not installed");
      return { scene: HARNESS.scene };
    },
    { preload: HARNESS.preload },
  );
  return { useGLTF };
});

const MODEL: ResolvedBuildingModel = {
  node_id: "NUM.S",
  stage: "built",
  modelStage: "built",
  kind: "glb",
  url: "/frost-lifecycle.glb",
};

function sourceFixture(indexed: boolean) {
  const indexedGeometry = new THREE.BoxGeometry(2, 3, 2);
  const geometry = indexed ? indexedGeometry : indexedGeometry.toNonIndexed();
  const texture = new THREE.DataTexture(new Uint8Array([20, 40, 60, 255]), 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b6b59,
    map: texture,
  });
  const first = new THREE.Mesh(geometry, material);
  first.position.set(-0.75, 1.5, 0);
  const second = new THREE.Mesh(geometry, material);
  second.position.set(0.75, 1.5, 0);
  return {
    scene: new THREE.Group().add(first, second),
    geometry,
    material,
    texture,
  };
}

function taggedSourceFixture() {
  const fixture = sourceFixture(true);
  fixture.scene.userData.gridworkLateEraAsset = {
    schema: 1,
    sourceSha256: "a".repeat(64),
    era: "information_age",
    sourceKey: "EL.5",
    stage: "built",
    basename: "el-5-built",
  };
  fixture.material.name = "tagged-transport";
  fixture.material.userData.gridworkMaterial = {
    schema: 1,
    kind: "toon",
    sourceMaterialKey: "tagged-transport",
    color: [0.2, 0.4, 0.6],
    baseMap: {
      slot: "baseColor",
      sourceTextureKey: "source-map",
      imageFingerprint: "fixture-map",
      offset: [0, 0],
      repeat: [1, 1],
      center: [0, 0],
      rotation: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      matrixAutoUpdate: true,
      anisotropyRequested: 4,
      minFilter: "LinearFilter",
      magFilter: "LinearFilter",
      wrapS: "ClampToEdgeWrapping",
      wrapT: "ClampToEdgeWrapping",
      generateMipmaps: false,
      flipY: false,
      premultiplyAlpha: false,
      unpackAlignment: 1,
      colorSpace: THREE.NoColorSpace,
    },
    gradient: {
      width: 3,
      height: 1,
      channels: 4,
      channelInterpretation: "RGBA8_UNORM",
      texels: [
        [0, 0, 0, 255],
        [128, 128, 128, 255],
        [255, 255, 255, 255],
      ],
      sourceObjectType: "CanvasTexture",
      runtimeObjectType: "DataTexture",
      format: "RGBAFormat",
      type: "UnsignedByteType",
      minFilter: "NearestFilter",
      magFilter: "NearestFilter",
      wrapS: "ClampToEdgeWrapping",
      wrapT: "ClampToEdgeWrapping",
      generateMipmaps: false,
      flipY: false,
      premultiplyAlpha: false,
      unpackAlignment: 1,
      colorSpace: THREE.NoColorSpace,
    },
    render: {
      opacity: 1,
      transparent: false,
      alphaTest: 0,
      side: "FrontSide",
      depthTest: true,
      depthWrite: true,
      depthFunc: "LessEqualDepth",
      colorWrite: true,
      blending: "NormalBlending",
      blendSrc: "SrcAlphaFactor",
      blendDst: "OneMinusSrcAlphaFactor",
      blendEquation: "AddEquation",
      blendSrcAlpha: null,
      blendDstAlpha: null,
      blendEquationAlpha: null,
      premultipliedAlpha: false,
      forceSinglePass: false,
      polygonOffset: false,
      polygonOffsetFactor: 0,
      polygonOffsetUnits: 0,
      toneMapped: true,
      dithering: false,
      flatShading: false,
      vertexColors: false,
      fog: true,
    },
  };
  return fixture;
}

function stack(frosted: boolean) {
  return (
    <PlacedModelStack
      model={MODEL}
      footprint={{ w: 1, d: 1 }}
      reducedMotion
      frosted={frosted}
    />
  );
}

describe("mounted frost geometry ownership", () => {
  beforeEach(() => {
    HARNESS.scene = null;
    HARNESS.useGLTF.mockClear();
    HARNESS.preload.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each([
    ["indexed", true],
    ["already non-indexed", false],
  ])(
    "disposes each abandoned %s frost clone once across fair → winter → fair → winter → unmount",
    async (_label, indexed) => {
      const source = sourceFixture(indexed);
      HARNESS.scene = source.scene;
      const loaderGeometryDispose = vi.spyOn(source.geometry, "dispose");
      const frostGeometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
      const sourceMaterialDispose = vi.spyOn(source.material, "dispose");
      const sourceTextureDispose = vi.spyOn(source.texture, "dispose");
      const preparedMaterialDispose = vi.spyOn(THREE.Material.prototype, "dispose");

      const view = render(stack(false));
      await waitFor(() => expect(HARNESS.useGLTF).toHaveBeenCalled());

      view.rerender(stack(true));
      expect(frostGeometryDispose).not.toHaveBeenCalled();

      view.rerender(stack(false));
      await waitFor(() => {
        expect(
          frostGeometryDispose.mock.calls.length,
          "the first abandoned frost/batch geometry population is disposed",
        ).toBeGreaterThanOrEqual(2);
      });
      const afterFirstWinterRelease = frostGeometryDispose.mock.calls.length;
      expect(new Set(frostGeometryDispose.mock.instances).size).toBe(
        afterFirstWinterRelease,
      );

      view.rerender(stack(true));
      expect(
        frostGeometryDispose.mock.calls.length,
        "fair shared geometry is not disposed during the second winter mount",
      ).toBe(afterFirstWinterRelease);

      view.unmount();
      await waitFor(() => {
        expect(frostGeometryDispose.mock.calls.length).toBeGreaterThan(
          afterFirstWinterRelease,
        );
        expect(preparedMaterialDispose).toHaveBeenCalled();
      });
      expect(
        frostGeometryDispose.mock.calls.length,
        "the second frost/batch geometry population is disposed on final unmount",
      ).toBeGreaterThan(afterFirstWinterRelease);
      const disposed = frostGeometryDispose.mock.instances;
      expect(
        new Set(disposed).size,
        "every app-owned geometry identity is disposed once",
      ).toBe(disposed.length);
      expect(
        preparedMaterialDispose,
        "every committed revived/frost material is disposed on replacement or unmount",
      ).toHaveBeenCalled();
      expect(
        preparedMaterialDispose.mock.calls.length,
        "the four requested fair/winter roots each own at least one prepared material",
      ).toBeGreaterThanOrEqual(4);
      expect(
        new Set(preparedMaterialDispose.mock.instances).size,
        "each app-owned prepared material is disposed once",
      ).toBe(preparedMaterialDispose.mock.calls.length);
      expect(loaderGeometryDispose).not.toHaveBeenCalled();
      expect(sourceMaterialDispose).not.toHaveBeenCalled();
      expect(sourceTextureDispose).not.toHaveBeenCalled();
    },
  );

  it("disposes restored and frost-cloned materials without touching source or cached textures", async () => {
    const source = taggedSourceFixture();
    HARNESS.scene = source.scene;
    const loaderGeometryDispose = vi.spyOn(source.geometry, "dispose");
    const sourceMaterialDispose = vi.spyOn(source.material, "dispose");
    const sourceTextureDispose = vi.spyOn(source.texture, "dispose");
    const preparedMaterialDispose = vi.spyOn(THREE.Material.prototype, "dispose");
    const frostGeometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
    const cachedTextureDispose = vi.spyOn(THREE.Texture.prototype, "dispose");

    const view = render(stack(false));
    await waitFor(() => expect(HARNESS.useGLTF).toHaveBeenCalled());
    view.rerender(stack(true));
    view.rerender(stack(false));
    view.unmount();

    await waitFor(() => {
      expect(preparedMaterialDispose.mock.calls.length).toBeGreaterThanOrEqual(4);
      expect(frostGeometryDispose).toHaveBeenCalled();
    });
    expect(preparedMaterialDispose.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(new Set(preparedMaterialDispose.mock.instances).size).toBe(
      preparedMaterialDispose.mock.calls.length,
    );
    expect(frostGeometryDispose).toHaveBeenCalled();
    expect(new Set(frostGeometryDispose.mock.instances).size).toBe(
      frostGeometryDispose.mock.calls.length,
    );
    expect(loaderGeometryDispose).not.toHaveBeenCalled();
    expect(sourceMaterialDispose).not.toHaveBeenCalled();
    expect(sourceTextureDispose).not.toHaveBeenCalled();
    expect(
      cachedTextureDispose,
      "shared gradient and restored base-map cache textures remain cache-owned",
    ).not.toHaveBeenCalled();
  });

  it("keeps the committed prepared material alive through StrictMode replay, then disposes it", async () => {
    const source = sourceFixture(true);
    HARNESS.scene = source.scene;
    const sourceMaterialDispose = vi.spyOn(source.material, "dispose");
    const preparedMaterialDispose = vi.spyOn(THREE.Material.prototype, "dispose");

    const view = render(<StrictMode>{stack(false)}</StrictMode>);
    await waitFor(() => expect(HARNESS.useGLTF).toHaveBeenCalled());
    await Promise.resolve();

    expect(
      preparedMaterialDispose,
      "StrictMode's setup-cleanup-setup replay must not dispose the live prepared root",
    ).not.toHaveBeenCalled();
    expect(sourceMaterialDispose).not.toHaveBeenCalled();

    view.unmount();
    await waitFor(() => expect(preparedMaterialDispose).toHaveBeenCalled());
    expect(new Set(preparedMaterialDispose.mock.instances).size).toBe(
      preparedMaterialDispose.mock.calls.length,
    );
    expect(sourceMaterialDispose).not.toHaveBeenCalled();
  });
});
