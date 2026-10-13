import { act, render } from "@testing-library/react";
import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Footprint } from "../worldLayout";
import {
  applyFade,
  bindFadeMaterials,
  PLACED_PREPARATION,
  prepareGridworkModel,
} from "./modelPreparation";
import { FadeLayer } from "./PlacedBuilding";

const FRAME = vi.hoisted(() => ({
  callback: null as null | ((state: unknown, delta: number) => void),
}));

vi.mock("@react-three/fiber", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-three/fiber")>();
  return {
    ...actual,
    useFrame: (callback: (state: unknown, delta: number) => void) => {
      FRAME.callback = callback;
    },
  };
});

type Extras = Record<string, unknown>;

const FOOTPRINT: Footprint = { w: 2, d: 2 };

const assetTag = () => ({
  schema: 1,
  sourceSha256: "b".repeat(64),
  era: "cyberpunk",
  sourceKey: "civic:cyberpunk_vertical_farm",
  stage: "built",
  basename: "civic-cyberpunk-vertical-farm-built",
});

const baseMap = (overrides: Extras = {}) => ({
  slot: "baseColor",
  sourceTextureKey: "vertical-farm-map",
  imageFingerprint: "rgba8:1x1:vertical-farm",
  offset: [0.25, 0.5],
  repeat: [2, 3],
  center: [0.5, 0.5],
  rotation: 0.125,
  matrix: [2, 0, 0.25, 0, 3, 0.5, 0, 0, 1],
  matrixAutoUpdate: false,
  wrapS: "RepeatWrapping",
  wrapT: "MirroredRepeatWrapping",
  minFilter: "LinearMipmapLinearFilter",
  magFilter: "LinearFilter",
  anisotropyRequested: 8,
  generateMipmaps: true,
  flipY: false,
  premultiplyAlpha: true,
  unpackAlignment: 1,
  colorSpace: THREE.SRGBColorSpace,
  ...overrides,
});

const gradient = (overrides: Extras = {}) => ({
  width: 3,
  height: 1,
  channels: 4,
  channelInterpretation: "RGBA8_UNORM",
  texels: [
    [0, 16, 32, 255],
    [96, 128, 160, 255],
    [208, 232, 255, 255],
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
  ...overrides,
});

const renderRecord = (overrides: Extras = {}) => ({
  opacity: 0.34,
  transparent: false,
  alphaTest: 0.17,
  side: "DoubleSide",
  depthTest: false,
  depthWrite: false,
  depthFunc: "GreaterEqualDepth",
  colorWrite: false,
  blending: "AdditiveBlending",
  blendSrc: "SrcAlphaFactor",
  blendDst: "OneFactor",
  blendEquation: "AddEquation",
  blendSrcAlpha: null,
  blendDstAlpha: null,
  blendEquationAlpha: null,
  premultipliedAlpha: true,
  forceSinglePass: true,
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: -1,
  toneMapped: false,
  dithering: true,
  flatShading: false,
  vertexColors: false,
  fog: false,
  ...overrides,
});

const materialRecord = (overrides: Extras = {}) => ({
  schema: 1,
  kind: "toon",
  sourceMaterialKey: "vertical-farm-toon",
  color: [0.18, 0.52, 0.31],
  baseMap: baseMap(),
  gradient: gradient(),
  render: renderRecord(),
  ...overrides,
});

function transport(record: Extras, map: THREE.Texture): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, map });
  material.userData.gridworkMaterial = record;
  return material;
}

interface VerticalFarmFixture {
  readonly scene: THREE.Group;
  readonly toonTransport: THREE.MeshStandardMaterial;
  readonly basicTransport: THREE.MeshStandardMaterial;
  readonly sourceMap: THREE.DataTexture;
  readonly sourceGeometry: THREE.BoxGeometry;
}

function verticalFarmScene(): VerticalFarmFixture {
  const sourceMap = new THREE.DataTexture(new Uint8Array([20, 180, 96, 255]), 1, 1);
  sourceMap.wrapS = THREE.ClampToEdgeWrapping;
  sourceMap.wrapT = THREE.ClampToEdgeWrapping;
  sourceMap.minFilter = THREE.NearestFilter;
  sourceMap.magFilter = THREE.NearestFilter;
  sourceMap.generateMipmaps = false;
  sourceMap.flipY = true;
  sourceMap.premultiplyAlpha = false;
  sourceMap.unpackAlignment = 4;
  sourceMap.colorSpace = THREE.NoColorSpace;
  sourceMap.anisotropy = 1;
  sourceMap.offset.set(0.1, 0.2);
  sourceMap.repeat.set(4, 5);
  sourceMap.center.set(0.25, 0.75);
  sourceMap.rotation = 0.75;
  sourceMap.updateMatrix();

  const toonTransport = transport(materialRecord(), sourceMap);
  const basicTransport = transport(
    materialRecord({
      kind: "unlit",
      sourceMaterialKey: "vertical-farm-unlit",
      color: [0.2, 0.75, 0.9],
      gradient: null,
      render: renderRecord({
        opacity: 0.68,
        transparent: true,
        depthTest: true,
        colorWrite: true,
        blending: "MultiplyBlending",
        flatShading: true,
      }),
    }),
    sourceMap,
  );
  const sourceGeometry = new THREE.BoxGeometry(2.5, 5, 2.5);
  const greenhouse = new THREE.Mesh(sourceGeometry, toonTransport);
  greenhouse.name = "vertical-farm-greenhouse";
  greenhouse.position.y = 2.5;
  const repeated = new THREE.Mesh(new THREE.BoxGeometry(1, 2.5, 1), toonTransport);
  repeated.name = "vertical-farm-greenhouse-repeat";
  repeated.position.set(1.5, 1.25, -0.5);
  const growLight = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.8), basicTransport);
  growLight.name = "vertical-farm-grow-light";
  growLight.position.set(0, 4.75, 0);
  const ordered = new THREE.Group();
  ordered.name = "vertical-farm-overlay";
  ordered.userData.gridworkRenderOrder = 3;
  ordered.add(greenhouse, repeated, growLight);
  const scene = new THREE.Group();
  scene.userData.gridworkLateEraAsset = assetTag();
  scene.add(ordered);
  return { scene, toonTransport, basicTransport, sourceMap, sourceGeometry };
}

function mesh(root: THREE.Object3D, name: string): THREE.Mesh {
  const object = root.getObjectByName(name);
  if (!(object instanceof THREE.Mesh)) {
    throw new Error(`fixture lost ${name}`);
  }
  return object;
}

function textureState(texture: THREE.Texture | null) {
  if (!texture) return null;
  return {
    wrapS: texture.wrapS,
    wrapT: texture.wrapT,
    minFilter: texture.minFilter,
    magFilter: texture.magFilter,
    offset: texture.offset.toArray(),
    repeat: texture.repeat.toArray(),
    rotation: texture.rotation,
    center: texture.center.toArray(),
    matrixAutoUpdate: texture.matrixAutoUpdate,
    matrix: texture.matrix.toArray(),
    generateMipmaps: texture.generateMipmaps,
    flipY: texture.flipY,
    premultiplyAlpha: texture.premultiplyAlpha,
    unpackAlignment: texture.unpackAlignment,
    colorSpace: texture.colorSpace,
    anisotropy: texture.anisotropy,
  };
}

function geometryState(geometry: THREE.BufferGeometry) {
  return {
    index:
      geometry.index === null
        ? null
        : {
            itemSize: geometry.index.itemSize,
            array: Array.from(geometry.index.array),
          },
    attributes: Object.fromEntries(
      Object.entries(geometry.attributes).map(([name, attribute]) => [
        name,
        {
          itemSize: attribute.itemSize,
          normalized: attribute.normalized,
          array: Array.from(attribute.array),
        },
      ]),
    ),
  };
}

function authoredRenderState(material: THREE.Material) {
  const row = material as THREE.Material & {
    flatShading?: boolean;
    fog?: boolean;
    vertexColors?: boolean;
  };
  return {
    opacity: material.opacity,
    transparent: material.transparent,
    alphaTest: material.alphaTest,
    side: material.side,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    depthFunc: material.depthFunc,
    colorWrite: material.colorWrite,
    blending: material.blending,
    blendSrc: material.blendSrc,
    blendDst: material.blendDst,
    blendEquation: material.blendEquation,
    blendSrcAlpha: material.blendSrcAlpha,
    blendDstAlpha: material.blendDstAlpha,
    blendEquationAlpha: material.blendEquationAlpha,
    premultipliedAlpha: material.premultipliedAlpha,
    forceSinglePass: material.forceSinglePass,
    polygonOffset: material.polygonOffset,
    polygonOffsetFactor: material.polygonOffsetFactor,
    polygonOffsetUnits: material.polygonOffsetUnits,
    toneMapped: material.toneMapped,
    dithering: material.dithering,
    flatShading: row.flatShading,
    fog: row.fog,
  };
}

function runFrame(delta: number): void {
  expect(FRAME.callback, "FadeLayer registered one frame callback").not.toBeNull();
  act(() => {
    FRAME.callback?.({}, delta);
  });
}

describe("fixed fade preserves authored late-era material behavior", () => {
  beforeEach(() => {
    FRAME.callback = null;
  });

  it("uses baseOpacity × fade and the exact fade < 1 boundary", () => {
    const { scene } = verticalFarmScene();
    const prepared = prepareGridworkModel(scene, FOOTPRINT, PLACED_PREPARATION);
    const toon = mesh(prepared, "vertical-farm-greenhouse")
      .material as THREE.MeshToonMaterial;
    const basic = mesh(prepared, "vertical-farm-grow-light")
      .material as THREE.MeshBasicMaterial;
    const rows = bindFadeMaterials(prepared);
    const row = rows.find(({ material }) => material === toon);
    expect(row).toMatchObject({
      baseOpacity: 0.34,
      baseTransparent: false,
      baseDepthTest: false,
      baseDepthWrite: false,
      baseColorWrite: false,
      baseBlending: THREE.AdditiveBlending,
    });
    expect(rows).toHaveLength(2);

    const initialVersion = toon.version;
    applyFade(rows, 1);
    expect(toon.opacity, "RUN012 final settled base-opacity assertion").toBeCloseTo(
      0.34,
      12,
    );
    expect(toon.transparent).toBe(false);
    expect(toon.version).toBe(initialVersion);

    applyFade(rows, 0.5);
    expect(toon.opacity, "RUN012 final base-opacity multiplication assertion").toBeCloseTo(
      0.17,
      12,
    );
    expect(toon.transparent).toBe(true);
    expect(toon.version).toBe(initialVersion + 1);
    expect(toon.depthTest).toBe(false);
    expect(toon.depthWrite).toBe(false);
    expect(toon.colorWrite).toBe(false);
    expect(toon.blending).toBe(THREE.AdditiveBlending);

    applyFade(rows, 0.25);
    expect(toon.version, "steady transient frames do not toggle needsUpdate").toBe(
      initialVersion + 1,
    );
    applyFade(rows, 1);
    expect(toon.opacity).toBeCloseTo(0.34, 12);
    expect(toon.transparent).toBe(false);
    expect(basic.transparent, "RUN013 final authored steady-transparency assertion").toBe(
      true,
    );
    expect(toon.version).toBe(initialVersion + 2);

    applyFade(rows, 0.9995);
    expect(toon.opacity).toBeCloseTo(0.34 * 0.9995, 12);
    expect(toon.transparent, "RUN011 final exact transient-boundary assertion").toBe(true);
  });

  it("drives animated and reduced-motion frames without traversing or replacing materials", () => {
    const { scene } = verticalFarmScene();
    const prepared = prepareGridworkModel(scene, FOOTPRINT, PLACED_PREPARATION);
    const toon = mesh(prepared, "vertical-farm-greenhouse")
      .material as THREE.MeshToonMaterial;
    const basic = mesh(prepared, "vertical-farm-grow-light")
      .material as THREE.MeshBasicMaterial;
    const toonMap = toon.map;
    const gradientMap = toon.gradientMap;

    const view = render(<FadeLayer object={prepared} visible reducedMotion={false} />);
    runFrame(0.016);
    expect(toon.opacity).toBeCloseTo(0.34, 12);

    const originalTraverse = prepared.traverse;
    prepared.traverse = () => {
      throw new Error("frame-time traversal allocated a new material census");
    };
    view.rerender(<FadeLayer object={prepared} visible={false} reducedMotion={false} />);
    runFrame(0.16);
    expect(toon.opacity).toBeCloseTo(0.17, 12);

    view.rerender(<FadeLayer object={prepared} visible reducedMotion={false} />);
    runFrame(0.32);
    expect(toon.opacity).toBeCloseTo(0.34, 12);

    view.rerender(<FadeLayer object={prepared} visible={false} reducedMotion />);
    runFrame(0);
    expect(toon.opacity).toBe(0);
    view.rerender(<FadeLayer object={prepared} visible reducedMotion />);
    runFrame(0);
    expect(toon.opacity).toBeCloseTo(0.34, 12);

    expect(mesh(prepared, "vertical-farm-greenhouse").material).toBe(toon);
    expect(mesh(prepared, "vertical-farm-greenhouse-repeat").material).toBe(toon);
    expect(mesh(prepared, "vertical-farm-grow-light").material).toBe(basic);
    expect(toon.map).toBe(toonMap);
    expect(toon.gradientMap).toBe(gradientMap);
    prepared.traverse = originalTraverse;
    view.unmount();
  });
});

describe("fair → winter → fair keeps late-era material fidelity", () => {
  it("preserves Toon/Basic classes, maps, gradients, samplers, state, and fair cache", () => {
    const fixture = verticalFarmScene();
    const sourceTextureBefore = textureState(fixture.sourceMap);
    const fair = prepareGridworkModel(fixture.scene, FOOTPRINT, PLACED_PREPARATION);
    const winter = prepareGridworkModel(fixture.scene, FOOTPRINT, {
      ...PLACED_PREPARATION,
      frosted: true,
    });
    const fairAgain = prepareGridworkModel(fixture.scene, FOOTPRINT, PLACED_PREPARATION);

    const fairToon = mesh(fair, "vertical-farm-greenhouse")
      .material as THREE.MeshToonMaterial;
    const winterToon = mesh(winter, "vertical-farm-greenhouse")
      .material as THREE.MeshToonMaterial;
    const fairAgainToon = mesh(fairAgain, "vertical-farm-greenhouse")
      .material as THREE.MeshToonMaterial;
    const fairBasic = mesh(fair, "vertical-farm-grow-light")
      .material as THREE.MeshBasicMaterial;
    const winterBasic = mesh(winter, "vertical-farm-grow-light")
      .material as THREE.MeshBasicMaterial;
    const fairAgainBasic = mesh(fairAgain, "vertical-farm-grow-light")
      .material as THREE.MeshBasicMaterial;

    expect(fairToon).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(winterToon, "RUN014 final winter Toon-class assertion").toBeInstanceOf(
      THREE.MeshToonMaterial,
    );
    expect(fairAgainToon).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(fairBasic).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(winterBasic).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(fairAgainBasic).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(winterToon.map).toBe(fairToon.map);
    expect(winterToon.gradientMap).toBe(fairToon.gradientMap);
    expect(winterBasic.map).toBe(fairBasic.map);
    expect(textureState(winterToon.map)).toStrictEqual(textureState(fairToon.map));
    expect(textureState(winterToon.gradientMap)).toStrictEqual(
      textureState(fairToon.gradientMap),
    );
    expect(authoredRenderState(winterToon)).toStrictEqual(authoredRenderState(fairToon));
    expect(authoredRenderState(winterBasic)).toStrictEqual(authoredRenderState(fairBasic));
    expect(winterBasic.color.getHex()).not.toBe(fairBasic.color.getHex());
    expect(fairAgainToon.color.getHex()).toBe(fairToon.color.getHex());
    expect(fairAgainBasic.color.getHex()).toBe(fairBasic.color.getHex());
    expect(fairAgainToon.map).toBe(fairToon.map);
    expect(fairAgainToon.gradientMap).toBe(fairToon.gradientMap);
    expect(fairAgainBasic.map).toBe(fairBasic.map);

    expect(
      mesh(winter, "vertical-farm-greenhouse-repeat").material,
      "one frost-root identity map preserves shared Toon identity",
    ).toBe(winterToon);
    expect(fixture.toonTransport).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(fixture.basicTransport).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(fixture.sourceGeometry.index).not.toBeNull();
    expect(fixture.sourceGeometry.getAttribute("color")).toBeUndefined();
    expect(textureState(fixture.sourceMap)).toStrictEqual(sourceTextureBefore);
    expect(fair.getObjectByName("vertical-farm-overlay")?.renderOrder).toBe(3);
    expect(winter.getObjectByName("vertical-farm-overlay")?.renderOrder).toBe(3);
    for (const root of [fair, winter, fairAgain]) {
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        expect(object.castShadow, "RUN019 final placed-shadow assertion").toBe(true);
        expect(object.receiveShadow).toBe(true);
      });
    }
  });

  it("keeps non-indexed loader geometry byte-identical across winter enter, exit, and repeat", () => {
    const fixture = verticalFarmScene();
    const sourceGeometry = fixture.sourceGeometry.toNonIndexed();
    mesh(fixture.scene, "vertical-farm-greenhouse").geometry = sourceGeometry;
    mesh(fixture.scene, "vertical-farm-greenhouse-repeat").geometry = sourceGeometry;
    const sourceBefore = geometryState(sourceGeometry);
    const fairBefore = prepareGridworkModel(fixture.scene, FOOTPRINT, PLACED_PREPARATION);
    const fairBeforeState = geometryState(
      mesh(fairBefore, "vertical-farm-greenhouse").geometry,
    );

    const winter = prepareGridworkModel(fixture.scene, FOOTPRINT, {
      ...PLACED_PREPARATION,
      frosted: true,
    });
    const fairAfter = prepareGridworkModel(fixture.scene, FOOTPRINT, PLACED_PREPARATION);
    const winterRepeat = prepareGridworkModel(fixture.scene, FOOTPRINT, {
      ...PLACED_PREPARATION,
      frosted: true,
    });
    const fairAfterRepeat = prepareGridworkModel(
      fixture.scene,
      FOOTPRINT,
      PLACED_PREPARATION,
    );

    const winterFirstGeometry = mesh(winter, "vertical-farm-greenhouse").geometry;
    expect(winterFirstGeometry, "winter owns a private non-indexed geometry").not.toBe(
      sourceGeometry,
    );
    expect(
      mesh(winter, "vertical-farm-greenhouse-repeat").geometry,
      "one root-local geometry map preserves loader sharing",
    ).toBe(winterFirstGeometry);
    expect(
      mesh(winterRepeat, "vertical-farm-greenhouse").geometry,
      "each winter preparation owns its private geometry",
    ).not.toBe(winterFirstGeometry);
    expect(
      geometryState(sourceGeometry),
      "the loader/source attributes stay byte-identical",
    ).toStrictEqual(sourceBefore);
    expect(
      geometryState(mesh(fairAfter, "vertical-farm-greenhouse").geometry),
      "a later fair preparation is unchanged after winter",
    ).toStrictEqual(fairBeforeState);
    expect(
      geometryState(mesh(fairAfterRepeat, "vertical-farm-greenhouse").geometry),
      "a later fair preparation is unchanged after repeated winter",
    ).toStrictEqual(fairBeforeState);
  });
});
