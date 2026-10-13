import * as THREE from "three";
import type {
  GridworkBaseMapExtras,
  GridworkMaterialExtras,
  GridworkRenderExtras,
} from "../../../../../scripts/export-era8-10-building-models.mjs";

export interface GridworkRestoreResult {
  readonly tagged: boolean;
  readonly restoredMaterials: number;
  readonly restoredRenderOrders: number;
  readonly effectiveAnisotropies: readonly number[];
}

export interface GridworkRendererCapabilities {
  getMaxAnisotropy(): number;
}

export interface GridworkRestoreFactories {
  createToon(
    parameters: ConstructorParameters<typeof THREE.MeshToonMaterial>[0],
  ): THREE.MeshToonMaterial;
  createBasic(
    parameters: ConstructorParameters<typeof THREE.MeshBasicMaterial>[0],
  ): THREE.MeshBasicMaterial;
  createDataTexture(
    data: Uint8Array,
    width: number,
    height: number,
    format: THREE.PixelFormat,
    type: THREE.TextureDataType,
  ): THREE.DataTexture;
  cloneTexture(texture: THREE.Texture): THREE.Texture;
}

export interface GridworkRestoreOptions {
  readonly rendererCapabilities?: GridworkRendererCapabilities;
  readonly factories?: GridworkRestoreFactories;
}

type GradientRecord = NonNullable<GridworkMaterialExtras["gradient"]>;
type MaterialPlan = {
  readonly transport: THREE.Material;
  readonly record: GridworkMaterialExtras;
};
type RootPlan = {
  readonly basename: string;
  readonly materials: readonly MaterialPlan[];
  readonly meshes: readonly {
    readonly mesh: THREE.Mesh;
    readonly materials: readonly THREE.Material[];
    readonly wasArray: boolean;
  }[];
  readonly orders: readonly { readonly object: THREE.Object3D; readonly order: number }[];
};

const gradientCache = new Map<string, THREE.DataTexture>();
const baseMapCache = new WeakMap<THREE.Texture, Map<string, THREE.Texture>>();
const restoredRoots = new WeakMap<THREE.Object3D, GridworkRestoreResult>();
const restoredRendererMaximums = new WeakMap<THREE.Object3D, number>();
const restoredNodeRoots = new WeakMap<THREE.Object3D, GridworkRestoreResult>();
const UNTAGGED_RESULT = {
  tagged: false,
  restoredMaterials: 0,
  restoredRenderOrders: 0,
  effectiveAnisotropies: [],
} as const;
const DEFAULT_FACTORIES: GridworkRestoreFactories = {
  createToon: (parameters) => new THREE.MeshToonMaterial(parameters),
  createBasic: (parameters) => new THREE.MeshBasicMaterial(parameters),
  createDataTexture: (data, width, height, format, type) =>
    new THREE.DataTexture(data, width, height, format, type),
  cloneTexture: (texture) => texture.clone(),
};

const ENUMS = {
  side: {
    FrontSide: THREE.FrontSide,
    BackSide: THREE.BackSide,
    DoubleSide: THREE.DoubleSide,
  },
  depth: {
    NeverDepth: THREE.NeverDepth,
    AlwaysDepth: THREE.AlwaysDepth,
    LessDepth: THREE.LessDepth,
    LessEqualDepth: THREE.LessEqualDepth,
    EqualDepth: THREE.EqualDepth,
    GreaterEqualDepth: THREE.GreaterEqualDepth,
    GreaterDepth: THREE.GreaterDepth,
    NotEqualDepth: THREE.NotEqualDepth,
  },
  blending: {
    NoBlending: THREE.NoBlending,
    NormalBlending: THREE.NormalBlending,
    AdditiveBlending: THREE.AdditiveBlending,
    SubtractiveBlending: THREE.SubtractiveBlending,
    MultiplyBlending: THREE.MultiplyBlending,
    CustomBlending: THREE.CustomBlending,
  },
  blendFactor: {
    ZeroFactor: THREE.ZeroFactor,
    OneFactor: THREE.OneFactor,
    SrcColorFactor: THREE.SrcColorFactor,
    OneMinusSrcColorFactor: THREE.OneMinusSrcColorFactor,
    SrcAlphaFactor: THREE.SrcAlphaFactor,
    OneMinusSrcAlphaFactor: THREE.OneMinusSrcAlphaFactor,
    DstAlphaFactor: THREE.DstAlphaFactor,
    OneMinusDstAlphaFactor: THREE.OneMinusDstAlphaFactor,
    DstColorFactor: THREE.DstColorFactor,
    OneMinusDstColorFactor: THREE.OneMinusDstColorFactor,
    SrcAlphaSaturateFactor: THREE.SrcAlphaSaturateFactor,
    ConstantColorFactor: THREE.ConstantColorFactor,
    OneMinusConstantColorFactor: THREE.OneMinusConstantColorFactor,
    ConstantAlphaFactor: THREE.ConstantAlphaFactor,
    OneMinusConstantAlphaFactor: THREE.OneMinusConstantAlphaFactor,
  },
  blendEquation: {
    AddEquation: THREE.AddEquation,
    SubtractEquation: THREE.SubtractEquation,
    ReverseSubtractEquation: THREE.ReverseSubtractEquation,
    MinEquation: THREE.MinEquation,
    MaxEquation: THREE.MaxEquation,
  },
  wrapping: {
    RepeatWrapping: THREE.RepeatWrapping,
    ClampToEdgeWrapping: THREE.ClampToEdgeWrapping,
    MirroredRepeatWrapping: THREE.MirroredRepeatWrapping,
  },
  filter: {
    NearestFilter: THREE.NearestFilter,
    NearestMipmapNearestFilter: THREE.NearestMipmapNearestFilter,
    NearestMipmapLinearFilter: THREE.NearestMipmapLinearFilter,
    LinearFilter: THREE.LinearFilter,
    LinearMipmapNearestFilter: THREE.LinearMipmapNearestFilter,
    LinearMipmapLinearFilter: THREE.LinearMipmapLinearFilter,
  },
  format: {
    AlphaFormat: THREE.AlphaFormat,
    RedFormat: THREE.RedFormat,
    RedIntegerFormat: THREE.RedIntegerFormat,
    RGFormat: THREE.RGFormat,
    RGIntegerFormat: THREE.RGIntegerFormat,
    RGBAFormat: THREE.RGBAFormat,
    RGBAIntegerFormat: THREE.RGBAIntegerFormat,
    DepthFormat: THREE.DepthFormat,
    DepthStencilFormat: THREE.DepthStencilFormat,
  },
  type: {
    UnsignedByteType: THREE.UnsignedByteType,
    ByteType: THREE.ByteType,
    ShortType: THREE.ShortType,
    UnsignedShortType: THREE.UnsignedShortType,
    IntType: THREE.IntType,
    UnsignedIntType: THREE.UnsignedIntType,
    FloatType: THREE.FloatType,
    HalfFloatType: THREE.HalfFloatType,
    UnsignedShort4444Type: THREE.UnsignedShort4444Type,
    UnsignedShort5551Type: THREE.UnsignedShort5551Type,
    UnsignedInt248Type: THREE.UnsignedInt248Type,
  },
} as const;

type EnumGroup = keyof typeof ENUMS;

export function isLateEraGridworkAsset(root: THREE.Object3D): boolean {
  return root.userData.gridworkLateEraAsset !== undefined;
}

export function restoreLateEraGridworkMaterials(
  root: THREE.Object3D,
  options: GridworkRestoreOptions = {},
): GridworkRestoreResult {
  const cached = restoredRoots.get(root);
  if (cached) {
    const requested = options.rendererCapabilities?.getMaxAnisotropy();
    if (requested !== undefined && restoredRendererMaximums.get(root) !== requested) {
      throw new Error(
        "late-era gridwork root was already restored for different renderer capabilities",
      );
    }
    return cached;
  }

  const plan = validateCompleteRoot(root);
  if (plan === null) return UNTAGGED_RESULT;
  const factories = options.factories ?? DEFAULT_FACTORIES;
  const capabilities = options.rendererCapabilities;
  const rendererMaximum = capabilities?.getMaxAnisotropy() ?? Number.POSITIVE_INFINITY;

  const replacements = new Map<THREE.Material, THREE.Material>();
  for (const row of plan.materials) {
    replacements.set(row.transport, restoreRecordedMaterial(row, factories));
  }
  for (const row of plan.meshes) {
    const restored = row.materials.map(
      (material) => replacements.get(material) as THREE.Material,
    );
    const first = restored[0];
    if (!first) throw new Error("validated mesh lost its restored material");
    row.mesh.material = row.wasArray ? restored : first;
  }
  for (const row of plan.orders) row.object.renderOrder = row.order;

  const result = {
    tagged: true,
    restoredMaterials: replacements.size,
    restoredRenderOrders: plan.orders.length,
    effectiveAnisotropies: plan.materials.flatMap((row) =>
      row.record.baseMap === null
        ? []
        : [Math.min(row.record.baseMap.anisotropyRequested, rendererMaximum)],
    ),
  } as const;
  restoredRoots.set(root, result);
  restoredRendererMaximums.set(root, rendererMaximum);
  return result;
}

export function restoreLateEraGridworkNodeMetadata(
  root: THREE.Object3D,
): GridworkRestoreResult {
  const cached = restoredNodeRoots.get(root);
  if (cached) return cached;

  const plan = validateCompleteRoot(root, false);
  if (plan === null) return UNTAGGED_RESULT;
  for (const row of plan.orders) row.object.renderOrder = row.order;
  const result = {
    tagged: true,
    restoredMaterials: 0,
    restoredRenderOrders: plan.orders.length,
    effectiveAnisotropies: [],
  } as const;
  restoredNodeRoots.set(root, result);
  return result;
}

function validateCompleteRoot(
  root: THREE.Object3D,
  validateMaterials = true,
): RootPlan | null {
  if (!isLateEraGridworkAsset(root)) return null;

  const asset = root.userData.gridworkLateEraAsset;
  const assetRecord = asset as { readonly basename?: unknown };
  const basename =
    typeof assetRecord?.basename === "string" ? assetRecord.basename : "unknown-basename";
  validateAssetTag(asset, basename);

  const materials = new Map<THREE.Material, MaterialPlan>();
  const meshes: RootPlan["meshes"][number][] = [];
  const orders: RootPlan["orders"][number][] = [];
  root.traverse((object) => {
    const rawOrder = object.userData.gridworkRenderOrder;
    if (rawOrder !== undefined) {
      if (typeof rawOrder !== "number" || !Number.isSafeInteger(rawOrder)) {
        fail(basename, object.name || "unnamed-node", "gridworkRenderOrder");
      }
      orders.push({ object, order: rawOrder });
    }
    if (!(object instanceof THREE.Mesh)) return;
    const meshMaterials = (
      Array.isArray(object.material) ? object.material : [object.material]
    ).filter((material): material is THREE.Material => material !== undefined);
    if (meshMaterials.length === 0)
      fail(basename, object.name || "unnamed-mesh", "material");
    meshes.push({
      mesh: object,
      materials: meshMaterials,
      wasArray: Array.isArray(object.material),
    });
    if (!validateMaterials) return;
    for (const transport of meshMaterials) {
      if (!materials.has(transport)) {
        const record = validateMaterialRecord(
          transport.userData.gridworkMaterial,
          basename,
        );
        if (record.baseMap !== null && !materialMap(transport)) {
          fail(basename, record.sourceMaterialKey, "baseMap.source");
        }
        materials.set(transport, { transport, record });
      }
    }
  });
  return { basename, materials: [...materials.values()], meshes, orders };
}

function validateAssetTag(value: unknown, basename: string): void {
  const record = objectRecord(value, basename, "asset", "gridworkLateEraAsset");
  if (
    record.schema !== 1 ||
    typeof record.sourceSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(record.sourceSha256) ||
    !["atomic_age", "information_age", "cyberpunk"].includes(record.era as string) ||
    typeof record.sourceKey !== "string" ||
    !["site", "construction", "built"].includes(record.stage as string) ||
    typeof record.basename !== "string" ||
    record.basename.length === 0
  ) {
    fail(basename, "asset", "gridworkLateEraAsset");
  }
}

function validateMaterialRecord(value: unknown, basename: string): GridworkMaterialExtras {
  const record = objectRecord(value, basename, "unknown-material", "gridworkMaterial");
  const material =
    typeof record.sourceMaterialKey === "string"
      ? record.sourceMaterialKey
      : "unknown-material";
  if (
    typeof record.sourceMaterialKey !== "string" ||
    record.sourceMaterialKey.length === 0
  ) {
    fail(basename, material || "unknown-material", "sourceMaterialKey");
  }
  if (record.schema !== 1) fail(basename, material, "schema");
  if (record.kind !== "toon" && record.kind !== "unlit") fail(basename, material, "kind");
  tuple(record.color, 3, basename, material, "color", finiteNumber);
  validateBaseMap(record.baseMap, basename, material);
  validateRender(record.render, basename, material);
  if (record.kind === "toon") {
    validateGradient(record.gradient, basename, material);
  } else if (record.gradient !== null) {
    fail(basename, material, "gradient");
  }
  return record as unknown as GridworkMaterialExtras;
}

function validateGradient(
  value: unknown,
  basename: string,
  material: string,
): asserts value is GradientRecord {
  const record = objectRecord(value, basename, material, "gradient");
  if (
    record.width !== 3 ||
    record.height !== 1 ||
    record.channels !== 4 ||
    record.channelInterpretation !== "RGBA8_UNORM" ||
    record.sourceObjectType !== "CanvasTexture" ||
    record.runtimeObjectType !== "DataTexture"
  ) {
    fail(basename, material, "gradient");
  }
  if (!Array.isArray(record.texels) || record.texels.length !== 3)
    fail(basename, material, "gradient.texels");
  for (const texel of record.texels) {
    tuple(texel, 4, basename, material, "gradient.texels", byte);
  }
  enumValue("format", record.format, basename, material, "gradient.format");
  enumValue("type", record.type, basename, material, "gradient.type");
  validateTextureSampler(record, basename, material, "gradient");
}

function validateBaseMap(
  value: unknown,
  basename: string,
  material: string,
): asserts value is GridworkBaseMapExtras | null {
  if (value === null) return;
  const record = objectRecord(value, basename, material, "baseMap");
  if (
    record.slot !== "baseColor" ||
    typeof record.sourceTextureKey !== "string" ||
    typeof record.imageFingerprint !== "string" ||
    !finiteNumber(record.rotation) ||
    typeof record.matrixAutoUpdate !== "boolean"
  ) {
    fail(basename, material, "baseMap");
  }
  tuple(record.offset, 2, basename, material, "baseMap.offset", finiteNumber);
  tuple(record.repeat, 2, basename, material, "baseMap.repeat", finiteNumber);
  tuple(record.center, 2, basename, material, "baseMap.center", finiteNumber);
  tuple(record.matrix, 9, basename, material, "baseMap.matrix", finiteNumber);
  if (!finiteNumber(record.anisotropyRequested) || record.anisotropyRequested < 0) {
    fail(basename, material, "baseMap.anisotropyRequested");
  }
  validateTextureSampler(record, basename, material, "baseMap");
}

function validateTextureSampler(
  record: Record<string, unknown>,
  basename: string,
  material: string,
  field: "gradient" | "baseMap",
): void {
  enumValue("filter", record.minFilter, basename, material, `${field}.minFilter`);
  enumValue("filter", record.magFilter, basename, material, `${field}.magFilter`);
  enumValue("wrapping", record.wrapS, basename, material, `${field}.wrapS`);
  enumValue("wrapping", record.wrapT, basename, material, `${field}.wrapT`);
  if (
    typeof record.generateMipmaps !== "boolean" ||
    typeof record.flipY !== "boolean" ||
    typeof record.premultiplyAlpha !== "boolean" ||
    ![1, 2, 4, 8].includes(record.unpackAlignment as number) ||
    colorSpace(record.colorSpace) === null
  ) {
    fail(basename, material, field);
  }
}

function validateRender(
  value: unknown,
  basename: string,
  material: string,
): asserts value is GridworkRenderExtras {
  const record = objectRecord(value, basename, material, "render");
  for (const field of [
    "opacity",
    "alphaTest",
    "polygonOffsetFactor",
    "polygonOffsetUnits",
  ]) {
    if (!finiteNumber(record[field])) fail(basename, material, `render.${field}`);
  }
  for (const field of [
    "transparent",
    "depthTest",
    "depthWrite",
    "colorWrite",
    "premultipliedAlpha",
    "forceSinglePass",
    "polygonOffset",
    "toneMapped",
    "dithering",
    "flatShading",
    "vertexColors",
    "fog",
  ]) {
    if (typeof record[field] !== "boolean") fail(basename, material, `render.${field}`);
  }
  enumValue("side", record.side, basename, material, "render.side");
  enumValue("depth", record.depthFunc, basename, material, "render.depthFunc");
  enumValue("blending", record.blending, basename, material, "render.blending");
  enumValue("blendFactor", record.blendSrc, basename, material, "render.blendSrc");
  enumValue("blendFactor", record.blendDst, basename, material, "render.blendDst");
  enumValue(
    "blendEquation",
    record.blendEquation,
    basename,
    material,
    "render.blendEquation",
  );
  nullableEnumValue(
    "blendFactor",
    record.blendSrcAlpha,
    basename,
    material,
    "render.blendSrcAlpha",
  );
  nullableEnumValue(
    "blendFactor",
    record.blendDstAlpha,
    basename,
    material,
    "render.blendDstAlpha",
  );
  nullableEnumValue(
    "blendEquation",
    record.blendEquationAlpha,
    basename,
    material,
    "render.blendEquationAlpha",
  );
}

function restoreRecordedMaterial(
  row: MaterialPlan,
  factories: GridworkRestoreFactories,
): THREE.Material {
  const { record, transport } = row;
  const map =
    record.baseMap === null
      ? null
      : baseMapFor(transport, record.baseMap, record.sourceMaterialKey, factories);
  const color = new THREE.Color(record.color[0], record.color[1], record.color[2]);
  const material =
    record.kind === "toon"
      ? factories.createToon({
          color,
          map,
          gradientMap: gradientFor(record.gradient as GradientRecord, factories),
        })
      : factories.createBasic({ color, map });
  material.name = transport.name;
  material.userData = { ...transport.userData };
  applyRenderState(material, record.render);
  material.needsUpdate = true;
  return material;
}

function gradientFor(
  record: GradientRecord,
  factories: GridworkRestoreFactories,
): THREE.DataTexture {
  const key = stableRecord(record);
  const cached = gradientCache.get(key);
  if (cached) return cached;
  const texture = factories.createDataTexture(
    new Uint8Array(record.texels.flat()),
    3,
    1,
    enumConstant("format", record.format) as THREE.PixelFormat,
    enumConstant("type", record.type) as THREE.TextureDataType,
  );
  applyTextureState(texture, record);
  texture.needsUpdate = true;
  gradientCache.set(key, texture);
  return texture;
}

function baseMapFor(
  transport: THREE.Material,
  record: GridworkBaseMapExtras,
  material: string,
  factories: GridworkRestoreFactories,
): THREE.Texture {
  const source = materialMap(transport);
  if (!source) fail("unknown-basename", material, "baseMap.source");
  const key = stableRecord(record);
  let records = baseMapCache.get(source);
  if (!records) {
    records = new Map();
    baseMapCache.set(source, records);
  }
  const cached = records.get(key);
  if (cached) return cached;
  const restored = factories.cloneTexture(source);
  restored.offset.fromArray(record.offset);
  restored.repeat.fromArray(record.repeat);
  restored.center.fromArray(record.center);
  restored.rotation = record.rotation;
  restored.matrix.fromArray(record.matrix);
  restored.matrixAutoUpdate = record.matrixAutoUpdate;
  restored.anisotropy = record.anisotropyRequested;
  applyTextureState(restored, record);
  restored.needsUpdate = true;
  records.set(key, restored);
  return restored;
}

function applyTextureState(
  texture: THREE.Texture,
  record: GradientRecord | GridworkBaseMapExtras,
): void {
  texture.wrapS = enumConstant("wrapping", record.wrapS) as THREE.Wrapping;
  texture.wrapT = enumConstant("wrapping", record.wrapT) as THREE.Wrapping;
  texture.minFilter = enumConstant(
    "filter",
    record.minFilter,
  ) as THREE.MinificationTextureFilter;
  texture.magFilter = enumConstant(
    "filter",
    record.magFilter,
  ) as THREE.MagnificationTextureFilter;
  texture.generateMipmaps = record.generateMipmaps;
  texture.flipY = record.flipY;
  texture.premultiplyAlpha = record.premultiplyAlpha;
  texture.unpackAlignment = record.unpackAlignment;
  texture.colorSpace = colorSpace(record.colorSpace) as THREE.ColorSpace;
}

function applyRenderState(
  material: THREE.MeshToonMaterial | THREE.MeshBasicMaterial,
  record: GridworkRenderExtras,
): void {
  material.opacity = record.opacity;
  material.transparent = record.transparent;
  material.alphaTest = record.alphaTest;
  material.side = enumConstant("side", record.side) as THREE.Side;
  material.depthTest = record.depthTest;
  material.depthWrite = record.depthWrite;
  material.depthFunc = enumConstant("depth", record.depthFunc) as THREE.DepthModes;
  material.colorWrite = record.colorWrite;
  material.blending = enumConstant("blending", record.blending) as THREE.Blending;
  material.blendSrc = enumConstant(
    "blendFactor",
    record.blendSrc,
  ) as THREE.BlendingSrcFactor;
  material.blendDst = enumConstant(
    "blendFactor",
    record.blendDst,
  ) as THREE.BlendingDstFactor;
  material.blendEquation = enumConstant(
    "blendEquation",
    record.blendEquation,
  ) as THREE.BlendingEquation;
  material.blendSrcAlpha = nullableEnumConstant(
    "blendFactor",
    record.blendSrcAlpha,
  ) as THREE.BlendingSrcFactor | null;
  material.blendDstAlpha = nullableEnumConstant(
    "blendFactor",
    record.blendDstAlpha,
  ) as THREE.BlendingDstFactor | null;
  material.blendEquationAlpha = nullableEnumConstant(
    "blendEquation",
    record.blendEquationAlpha,
  ) as THREE.BlendingEquation | null;
  material.premultipliedAlpha = record.premultipliedAlpha;
  material.forceSinglePass = record.forceSinglePass;
  material.polygonOffset = record.polygonOffset;
  material.polygonOffsetFactor = record.polygonOffsetFactor;
  material.polygonOffsetUnits = record.polygonOffsetUnits;
  material.toneMapped = record.toneMapped;
  material.dithering = record.dithering;
  (material as unknown as { flatShading: boolean }).flatShading = record.flatShading;
  material.vertexColors = record.vertexColors;
  material.fog = record.fog;
}

function enumValue(
  group: EnumGroup,
  value: unknown,
  basename: string,
  material: string,
  field: string,
): void {
  if (typeof value !== "string" || !Object.hasOwn(ENUMS[group], value))
    fail(basename, material, field);
}

function nullableEnumValue(
  group: EnumGroup,
  value: unknown,
  basename: string,
  material: string,
  field: string,
): void {
  if (value !== null) enumValue(group, value, basename, material, field);
}

function enumConstant(group: EnumGroup, value: string): number {
  const constant = (ENUMS[group] as Record<string, number>)[value];
  if (constant === undefined)
    throw new Error(`validated enum ${group}.${value} disappeared`);
  return constant;
}

function nullableEnumConstant(group: EnumGroup, value: string | null): number | null {
  return value === null ? null : enumConstant(group, value);
}

function materialMap(material: THREE.Material): THREE.Texture | null {
  return material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshBasicMaterial
    ? material.map
    : null;
}

function colorSpace(value: unknown): string | null {
  return value === THREE.NoColorSpace ||
    value === THREE.SRGBColorSpace ||
    value === THREE.LinearSRGBColorSpace
    ? value
    : null;
}

function objectRecord(
  value: unknown,
  basename: string,
  material: string,
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    fail(basename, material, field);
  return value as Record<string, unknown>;
}

function tuple(
  value: unknown,
  length: number,
  basename: string,
  material: string,
  field: string,
  predicate: (value: unknown) => boolean,
): void {
  if (
    !Array.isArray(value) ||
    value.length !== length ||
    value.some((entry) => !predicate(entry))
  ) {
    fail(basename, material, field);
  }
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function byte(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 255;
}

function stableRecord(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableRecord).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableRecord((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function fail(basename: string, material: string, field: string): never {
  throw new Error(`late-era gridwork ${basename}: ${material}: invalid ${field}`);
}
