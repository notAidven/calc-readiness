import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, test } from "vitest";
import {
  isLateEraGridworkAsset,
  restoreLateEraGridworkMaterials,
  restoreLateEraGridworkNodeMetadata,
} from "./lateEraGridworkMaterial";

type Extras = Record<string, unknown>;

const assetTag = () => ({
  schema: 1,
  sourceSha256: "a".repeat(64),
  era: "cyberpunk",
  sourceKey: "TRG.4",
  stage: "built",
  basename: "trg-4-built",
});

const baseMap = (overrides: Extras = {}) => ({
  slot: "baseColor",
  sourceTextureKey: "texture-000",
  imageFingerprint: "rgba8:1x1:fixture",
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
    [0, 32, 64, 255],
    [96, 128, 160, 255],
    [192, 224, 255, 255],
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

const render = (overrides: Extras = {}) => ({
  opacity: 0.34,
  transparent: true,
  alphaTest: 0.1,
  side: "DoubleSide",
  depthTest: true,
  depthWrite: false,
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
  sourceMaterialKey: "material-000",
  color: [0.2, 0.4, 0.6],
  baseMap: baseMap(),
  gradient: gradient(),
  render: render(),
  ...overrides,
});

function transport(
  record: Extras,
  map = new THREE.DataTexture(new Uint8Array([1, 2, 3, 255]), 1, 1),
) {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, map });
  material.userData.gridworkMaterial = record;
  return material;
}

function mesh(material: THREE.Material | THREE.Material[], name: string) {
  const result = new THREE.Mesh<THREE.BoxGeometry, THREE.Material | THREE.Material[]>(
    new THREE.BoxGeometry(1, 1, 1),
    material,
  );
  result.name = name;
  return result;
}

function taggedScene(...children: THREE.Object3D[]) {
  const scene = new THREE.Scene();
  scene.userData.gridworkLateEraAsset = assetTag();
  scene.add(...children);
  return scene;
}

function firstMesh(root: THREE.Scene) {
  const first = root.children[0];
  if (!(first instanceof THREE.Mesh)) throw new Error("fixture lost its first mesh");
  return first;
}

function textureState(texture: THREE.Texture) {
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

describe("lateEraGridworkMaterial", () => {
  test.each([
    [1, 1],
    [4, 4],
    [16, 8],
  ])(
    "restores through renderer capabilities maximum %i with effective anisotropy %i",
    (maximum, expected) => {
      const transportMaterial = transport(materialRecord());
      const root = taggedScene(mesh(transportMaterial, `cap-${maximum}`));

      restoreLateEraGridworkMaterials(root, {
        rendererCapabilities: { getMaxAnisotropy: () => maximum },
      });

      expect(
        restoreLateEraGridworkMaterials(root, {
          rendererCapabilities: { getMaxAnisotropy: () => maximum },
        }).effectiveAnisotropies,
      ).toEqual([expected]);
    },
  );

  test("shares a cached map across roots while reporting root-specific capabilities", () => {
    const source = new THREE.DataTexture(new Uint8Array([7, 8, 9, 255]), 1, 1);
    const firstRoot = taggedScene(
      mesh(transport(materialRecord(), source), "first-capability"),
    );
    const secondRoot = taggedScene(
      mesh(transport(materialRecord(), source), "second-capability"),
    );

    const first = restoreLateEraGridworkMaterials(firstRoot, {
      rendererCapabilities: { getMaxAnisotropy: () => 1 },
    });
    const second = restoreLateEraGridworkMaterials(secondRoot, {
      rendererCapabilities: { getMaxAnisotropy: () => 16 },
    });
    const firstMap = (
      (firstRoot.children[0] as THREE.Mesh).material as THREE.MeshToonMaterial
    ).map;
    const secondMap = (
      (secondRoot.children[0] as THREE.Mesh).material as THREE.MeshToonMaterial
    ).map;

    expect(first.effectiveAnisotropies).toEqual([1]);
    expect(second.effectiveAnisotropies).toEqual([8]);
    expect(firstMap).toBe(secondMap);
    expect(firstMap?.anisotropy).toBe(8);
  });

  test("leaves untagged scenes untouched", () => {
    const transportMaterial = new THREE.MeshStandardMaterial();
    const root = new THREE.Scene();
    const surface = mesh(transportMaterial, "untagged");
    root.add(surface);

    expect(isLateEraGridworkAsset(root)).toBe(false);
    expect(restoreLateEraGridworkMaterials(root)).toEqual({
      tagged: false,
      restoredMaterials: 0,
      restoredRenderOrders: 0,
      effectiveAnisotropies: [],
    });
    expect(surface.material).toBe(transportMaterial);
  });

  test("restores toon and unlit transport fields, sharing, maps, and render order", () => {
    const sourceMap = new THREE.DataTexture(new Uint8Array([7, 8, 9, 255]), 1, 1);
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
    sourceMap.matrixAutoUpdate = true;
    sourceMap.updateMatrix();
    const sourceBefore = textureState(sourceMap);
    const externalMaterial = new THREE.MeshBasicMaterial({ map: sourceMap });
    const externalMesh = mesh(externalMaterial, "external-sharing-control");
    const clone = sourceMap.clone.bind(sourceMap);
    let cloneCalls = 0;
    sourceMap.clone = () => {
      cloneCalls += 1;
      return clone();
    };
    const toonTransport = transport(materialRecord(), sourceMap);
    const unlitTransport = transport(
      materialRecord({
        kind: "unlit",
        sourceMaterialKey: "material-001",
        baseMap: null,
        gradient: null,
        render: render({ transparent: false, opacity: 1, toneMapped: true }),
      }),
    );
    const first = mesh(toonTransport, "first");
    const second = mesh(toonTransport, "second");
    const glow = mesh(unlitTransport, "glow");
    const ordered = new THREE.Group();
    ordered.name = "glass";
    ordered.userData.gridworkRenderOrder = 3;
    ordered.add(first, second, glow);
    const root = taggedScene(ordered);

    expect(isLateEraGridworkAsset(root)).toBe(true);
    const result = restoreLateEraGridworkMaterials(root);
    const toon = first.material as THREE.MeshToonMaterial;
    const unlit = glow.material as THREE.MeshBasicMaterial;

    expect(result).toEqual({
      tagged: true,
      restoredMaterials: 2,
      restoredRenderOrders: 1,
      effectiveAnisotropies: [8],
    });
    expect(toon).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(second.material).toBe(toon);
    expect(unlit).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(toon.map).not.toBe(sourceMap);
    expect(toon.gradientMap).toBeInstanceOf(THREE.DataTexture);
    const gradientData = (toon.gradientMap as THREE.DataTexture).image.data;
    expect(Array.from(gradientData ?? [])).toEqual([
      0, 32, 64, 255, 96, 128, 160, 255, 192, 224, 255, 255,
    ]);
    expect(textureState(toon.map as THREE.Texture)).toEqual({
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.MirroredRepeatWrapping,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      offset: [0.25, 0.5],
      repeat: [2, 3],
      rotation: 0.125,
      center: [0.5, 0.5],
      matrixAutoUpdate: false,
      matrix: [2, 0, 0.25, 0, 3, 0.5, 0, 0, 1],
      generateMipmaps: true,
      flipY: false,
      premultiplyAlpha: true,
      unpackAlignment: 1,
      colorSpace: THREE.SRGBColorSpace,
      anisotropy: 8,
    });
    expect(textureState(sourceMap)).toEqual(sourceBefore);
    expect(externalMesh.material).toBe(externalMaterial);
    expect(externalMaterial.map).toBe(sourceMap);
    expect(textureState(externalMaterial.map as THREE.Texture)).toEqual(sourceBefore);
    expect(toon.depthWrite).toBe(false);
    expect(toon.forceSinglePass).toBe(true);
    expect(unlit.toneMapped).toBe(true);
    expect(ordered.renderOrder).toBe(3);
    expect(restoreLateEraGridworkMaterials(root)).toBe(result);
    expect(first.material).toBe(toon);
    expect(cloneCalls).toBe(1);
  });

  test("restores only tagged node metadata without replacing transport materials", () => {
    const transportMaterial = transport(materialRecord());
    const surface = mesh(transportMaterial, "node-only");
    surface.userData.gridworkRenderOrder = 3;
    const root = taggedScene(surface);

    expect(restoreLateEraGridworkNodeMetadata(root)).toEqual({
      tagged: true,
      restoredMaterials: 0,
      restoredRenderOrders: 1,
      effectiveAnisotropies: [],
    });
    expect(surface.material).toBe(transportMaterial);
    expect(surface.renderOrder).toBe(3);
  });

  test("restores a loader-root Scene tag and remains allocation-free on repeated preparation", async () => {
    const sourceTransport = transport(materialRecord({ baseMap: null }));
    sourceTransport.map = null;
    const source = mesh(sourceTransport, "loader-root");
    source.userData.gridworkRenderOrder = 3;
    const exported = taggedScene(source);
    const bytes = await new GLTFExporter().parseAsync(exported, { binary: true });
    const loaded = await new Promise<THREE.Group>((resolve, reject) => {
      new GLTFLoader().parse(
        bytes as ArrayBuffer,
        "",
        (gltf) => resolve(gltf.scene),
        reject,
      );
    });
    const loadedMesh = loaded.getObjectByName("loader-root");
    if (!(loadedMesh instanceof THREE.Mesh)) throw new Error("loader dropped fixture mesh");

    expect(loaded.userData.gridworkLateEraAsset).toEqual(assetTag());
    const first = restoreLateEraGridworkMaterials(loaded);
    const restored = loadedMesh.material as THREE.MeshToonMaterial;
    const second = restoreLateEraGridworkMaterials(loaded);

    expect(restored).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(loadedMesh.renderOrder).toBe(3);
    expect(second).toBe(first);
    expect(loadedMesh.material).toBe(restored);
  });

  test("RUN009 creates no materials, gradients, or texture clones after cached preparation", () => {
    const counts = { toon: 0, basic: 0, data: 0, clone: 0 };
    const sourceMap = new THREE.DataTexture(new Uint8Array([4, 5, 6, 255]), 1, 1);
    const sourceClone = sourceMap.clone.bind(sourceMap);
    const root = taggedScene(
      mesh(
        transport(
          materialRecord({
            sourceMaterialKey: "run009",
            gradient: gradient({
              texels: [
                [9, 8, 7, 255],
                [6, 5, 4, 255],
                [3, 2, 1, 255],
              ],
            }),
          }),
          sourceMap,
        ),
        "run009",
      ),
    );
    const factories = {
      createToon: (parameters: ConstructorParameters<typeof THREE.MeshToonMaterial>[0]) => {
        counts.toon += 1;
        return new THREE.MeshToonMaterial(parameters);
      },
      createBasic: (
        parameters: ConstructorParameters<typeof THREE.MeshBasicMaterial>[0],
      ) => {
        counts.basic += 1;
        return new THREE.MeshBasicMaterial(parameters);
      },
      createDataTexture: (
        data: Uint8Array,
        width: number,
        height: number,
        format: THREE.PixelFormat,
        type: THREE.TextureDataType,
      ) => {
        counts.data += 1;
        return new THREE.DataTexture(data, width, height, format, type);
      },
      cloneTexture: (texture: THREE.Texture) => {
        counts.clone += 1;
        return texture === sourceMap ? sourceClone() : texture.clone();
      },
    };

    restoreLateEraGridworkMaterials(root, { factories });
    const afterFirst = { ...counts };
    restoreLateEraGridworkMaterials(root, { factories });

    expect(afterFirst).toEqual({ toon: 1, basic: 0, data: 1, clone: 1 });
    expect(counts).toEqual(afterFirst);
  });

  test("shares exact caches but does not alias unequal gradients or conflicting map records", () => {
    const sourceMap = new THREE.DataTexture(new Uint8Array([1, 2, 3, 255]), 1, 1);
    const firstTransport = transport(materialRecord(), sourceMap);
    const secondTransport = transport(
      materialRecord({
        sourceMaterialKey: "material-001",
        gradient: gradient({
          texels: [
            [1, 2, 3, 255],
            [4, 5, 6, 255],
            [7, 8, 9, 255],
          ],
        }),
        baseMap: baseMap({ rotation: 0.5 }),
      }),
      sourceMap,
    );
    const matchingTransport = transport(
      materialRecord({ sourceMaterialKey: "material-002" }),
      sourceMap,
    );
    const first = mesh(firstTransport, "first");
    const second = mesh(secondTransport, "second");
    const matching = mesh(matchingTransport, "matching");
    const root = taggedScene(first, second, matching);

    restoreLateEraGridworkMaterials(root);
    const firstRestored = first.material as THREE.MeshToonMaterial;
    const secondRestored = second.material as THREE.MeshToonMaterial;
    const matchingRestored = matching.material as THREE.MeshToonMaterial;

    expect(firstRestored.gradientMap).not.toBe(secondRestored.gradientMap);
    expect(firstRestored.map).not.toBe(secondRestored.map);
    expect(firstRestored.map).not.toBe(sourceMap);
    expect(secondRestored.map?.rotation).toBe(0.5);
    expect(matchingRestored.gradientMap).toBe(firstRestored.gradientMap);
    expect(matchingRestored.map).toBe(firstRestored.map);
  });

  test("preserves multi-material slot order and sharing", () => {
    const toonTransport = transport(materialRecord({ sourceMaterialKey: "toon-slot" }));
    const unlitTransport = transport(
      materialRecord({
        kind: "unlit",
        sourceMaterialKey: "unlit-slot",
        baseMap: null,
        gradient: null,
      }),
    );
    const first = mesh([unlitTransport, toonTransport], "multi-first");
    const second = mesh([unlitTransport, toonTransport], "multi-second");
    const root = taggedScene(first, second);

    restoreLateEraGridworkMaterials(root);

    expect(Array.isArray(first.material)).toBe(true);
    const firstSlots = Array.isArray(first.material) ? first.material : [];
    const secondSlots = Array.isArray(second.material) ? second.material : [];
    expect(firstSlots[0]).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(firstSlots[1]).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(second.material).toEqual(first.material);
    expect(secondSlots[0]).toBe(firstSlots[0]);
    expect(secondSlots[1]).toBe(firstSlots[1]);
  });

  test("rejects a later malformed record without mutating earlier rows", () => {
    const earlierTransport = transport(materialRecord({ sourceMaterialKey: "earlier" }));
    const laterTransport = transport(
      materialRecord({ sourceMaterialKey: "", gradient: gradient({ channels: 1 }) }),
    );
    const earlier = mesh(earlierTransport, "earlier");
    const later = mesh(laterTransport, "later");
    earlier.userData.gridworkRenderOrder = 3;
    const root = taggedScene(earlier, later);
    const earlierMapBefore = textureState(earlierTransport.map as THREE.Texture);

    expect(() => restoreLateEraGridworkMaterials(root)).toThrow(
      /trg-4-built.*sourceMaterialKey/i,
    );
    expect(earlier.material).toBe(earlierTransport);
    expect(earlier.renderOrder).toBe(0);
    expect(textureState(earlierTransport.map as THREE.Texture)).toEqual(earlierMapBefore);
  });

  test.each([
    [
      "asset schema",
      (root: THREE.Scene) => ((root.userData.gridworkLateEraAsset as Extras).schema = 2),
    ],
    [
      "material kind",
      (root: THREE.Scene) =>
        ((firstMesh(root).material as THREE.Material).userData.gridworkMaterial =
          materialRecord({
            kind: "lambert",
          })),
    ],
    [
      "gradient channels",
      (root: THREE.Scene) =>
        ((firstMesh(root).material as THREE.Material).userData.gridworkMaterial =
          materialRecord({
            gradient: gradient({ channels: 1 }),
          })),
    ],
    [
      "base-map sampler",
      (root: THREE.Scene) =>
        ((firstMesh(root).material as THREE.Material).userData.gridworkMaterial =
          materialRecord({
            baseMap: baseMap({ minFilter: "BogusFilter" }),
          })),
    ],
    [
      "render field",
      (root: THREE.Scene) =>
        ((firstMesh(root).material as THREE.Material).userData.gridworkMaterial =
          materialRecord({
            render: render({ depthWrite: "no" }),
          })),
    ],
    [
      "node render order",
      (root: THREE.Scene) => (firstMesh(root).userData.gridworkRenderOrder = "three"),
    ],
  ])("rejects malformed %s before any scene mutation", (_label, corrupt) => {
    const validTransport = transport(materialRecord());
    const invalidTransport = transport(
      materialRecord({ sourceMaterialKey: "material-bad" }),
    );
    const valid = mesh(validTransport, "valid");
    const invalid = mesh(invalidTransport, "invalid");
    valid.userData.gridworkRenderOrder = 3;
    const root = taggedScene(valid, invalid);

    corrupt(root);

    expect(() => restoreLateEraGridworkMaterials(root)).toThrow(
      /trg-4-built.*(material|asset|gradient|baseMap|render)/i,
    );
    expect(valid.material).toBe(validTransport);
    expect(invalid.material).toBe(invalidTransport);
    expect(valid.renderOrder).toBe(0);
  });
});
