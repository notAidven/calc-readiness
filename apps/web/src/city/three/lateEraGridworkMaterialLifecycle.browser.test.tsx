import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { expect, test } from "vitest";
import { restoreLateEraGridworkMaterials } from "./lateEraGridworkMaterial";

const assetTag = {
  schema: 1,
  sourceSha256: "b".repeat(64),
  era: "cyberpunk",
  sourceKey: "TRG.4",
  stage: "built",
  basename: "trg-4-built",
} as const;

const baseRecord = {
  slot: "baseColor",
  sourceTextureKey: "lifecycle-base",
  imageFingerprint: "rgba8:2x1:lifecycle",
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
} as const;

const gradientRecord = {
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
} as const;

const render = {
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
} as const;

function pixels(canvas: HTMLCanvasElement): number[] {
  const context = context2d(canvas);
  return Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data);
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("browser canvas 2D context is unavailable");
  return context;
}

function decodedTexturePixels(texture: THREE.Texture): {
  width: number;
  height: number;
  pixels: number[];
} {
  const image = texture.image as CanvasImageSource & {
    readonly width: number;
    readonly height: number;
  };
  const canvas = document.createElement("canvas");
  try {
    canvas.width = image.width;
    canvas.height = image.height;
    context2d(canvas).drawImage(image, 0, 0);
    return { width: canvas.width, height: canvas.height, pixels: pixels(canvas) };
  } finally {
    canvas.remove();
  }
}

function textureState(texture: THREE.Texture) {
  return {
    wrapS: texture.wrapS,
    wrapT: texture.wrapT,
    minFilter: texture.minFilter,
    magFilter: texture.magFilter,
    offset: texture.offset.toArray(),
    repeat: texture.repeat.toArray(),
    center: texture.center.toArray(),
    rotation: texture.rotation,
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

async function load(bytes: ArrayBuffer): Promise<THREE.Group> {
  return new Promise((resolve, reject) =>
    new GLTFLoader().parse(bytes, "", (gltf) => resolve(gltf.scene), reject),
  );
}

test("browser loader lifecycle restores embedded CanvasTexture and gradient semantics", async () => {
  const baseCanvas = document.createElement("canvas");
  const gradientCanvas = document.createElement("canvas");
  document.body.append(baseCanvas, gradientCanvas);
  try {
    baseCanvas.width = 2;
    baseCanvas.height = 1;
    const baseContext = context2d(baseCanvas);
    baseContext.fillStyle = "rgb(17, 34, 51)";
    baseContext.fillRect(0, 0, 1, 1);
    baseContext.fillStyle = "rgb(68, 85, 102)";
    baseContext.fillRect(1, 0, 1, 1);
    gradientCanvas.width = 3;
    gradientCanvas.height = 1;
    const gradientContext = context2d(gradientCanvas);
    gradientRecord.texels.forEach(([red, green, blue, alpha], index) => {
      gradientContext.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
      gradientContext.fillRect(index, 0, 1, 1);
    });
    const sourceBase = new THREE.CanvasTexture(baseCanvas);
    Object.assign(sourceBase, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.MirroredRepeatWrapping,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: true,
      flipY: false,
      premultiplyAlpha: true,
      unpackAlignment: 1,
      colorSpace: THREE.SRGBColorSpace,
      anisotropy: 8,
    });
    sourceBase.offset.set(0.25, 0.5);
    sourceBase.repeat.set(2, 3);
    sourceBase.center.set(0.5, 0.5);
    sourceBase.rotation = 0.125;
    sourceBase.matrixAutoUpdate = false;
    sourceBase.matrix.fromArray(baseRecord.matrix);
    const sourceGradient = new THREE.CanvasTexture(gradientCanvas);
    Object.assign(sourceGradient, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      flipY: false,
      premultiplyAlpha: false,
      unpackAlignment: 1,
      colorSpace: THREE.NoColorSpace,
    });
    const transport = new THREE.MeshStandardMaterial({ color: 0xffffff, map: sourceBase });
    transport.userData.gridworkMaterial = {
      schema: 1,
      kind: "toon",
      sourceMaterialKey: "lifecycle-transport",
      color: [0.2, 0.4, 0.6],
      baseMap: baseRecord,
      gradient: gradientRecord,
      render,
    };
    const scene = new THREE.Scene();
    scene.userData.gridworkLateEraAsset = assetTag;
    const first = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), transport);
    const second = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), transport);
    first.name = "first";
    second.name = "second";
    second.userData.gridworkRenderOrder = 3;
    scene.add(first, second);
    const bytes = (await new GLTFExporter().parseAsync(scene, {
      binary: true,
    })) as ArrayBuffer;
    const loaded = await load(bytes);
    const counts = { toon: 0, basic: 0, data: 0, clone: 0 };
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
        return texture.clone();
      },
    };
    const result = restoreLateEraGridworkMaterials(loaded, {
      rendererCapabilities: { getMaxAnisotropy: () => 4 },
      factories,
    });
    const loadedFirst = loaded.getObjectByName("first") as THREE.Mesh;
    const loadedSecond = loaded.getObjectByName("second") as THREE.Mesh;
    const restored = loadedFirst.material as THREE.MeshToonMaterial;
    const restoredGradient = restored.gradientMap as THREE.DataTexture;
    const restoredMap = restored.map as THREE.Texture;
    const afterFirst = { ...counts };
    const repeated = restoreLateEraGridworkMaterials(loaded, {
      rendererCapabilities: { getMaxAnisotropy: () => 4 },
      factories,
    });
    expect(counts).toEqual(afterFirst);
    const loadedAgain = await load(bytes);
    restoreLateEraGridworkMaterials(loadedAgain, {
      rendererCapabilities: { getMaxAnisotropy: () => 16 },
      factories,
    });
    const restoredAgain = (loadedAgain.getObjectByName("first") as THREE.Mesh)
      .material as THREE.MeshToonMaterial;

    expect(loaded.userData.gridworkLateEraAsset).toEqual(assetTag);
    expect(result).toEqual({
      tagged: true,
      restoredMaterials: 1,
      restoredRenderOrders: 1,
      effectiveAnisotropies: [4],
    });
    expect(repeated).toBe(result);
    expect(loadedSecond.renderOrder).toBe(3);
    expect(restored).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(loadedSecond.material).toBe(restored);
    expect(restoredMap).not.toBe(sourceBase);
    expect(decodedTexturePixels(restoredMap)).toEqual({
      width: 2,
      height: 1,
      pixels: [17, 34, 51, 255, 68, 85, 102, 255],
    });
    expect(textureState(restoredMap)).toEqual({
      ...textureState(sourceBase),
      anisotropy: 8,
    });
    expect(restoredGradient).toBeInstanceOf(THREE.DataTexture);
    expect(Array.from(restoredGradient.image.data ?? [])).toEqual(pixels(gradientCanvas));
    expect(textureState(restoredGradient)).toEqual(textureState(sourceGradient));
    expect(restoredAgain.gradientMap).toBe(restoredGradient);
    expect(restoredAgain.map).not.toBe(restoredMap);
    expect(counts).toEqual({
      toon: afterFirst.toon + 1,
      basic: afterFirst.basic,
      data: afterFirst.data,
      clone: afterFirst.clone + 1,
    });
  } finally {
    baseCanvas.remove();
    gradientCanvas.remove();
  }
});
