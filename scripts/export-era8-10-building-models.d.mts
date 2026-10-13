import type * as THREE from "three";

export type LateEraId = "atomic_age" | "information_age" | "cyberpunk";
export type ExportStage = "site" | "construction" | "built";
export type ExportKind = "skill" | "civic" | "townhall";

export interface SourceContract {
  readonly bytes: 1928383;
  readonly sha256: string;
  readonly manifestCount: 24;
  readonly resources: Readonly<Record<string, string>>;
  readonly decodedKitBytes: Readonly<Record<string, number>>;
}

export interface LateEraPlanRow {
  readonly definition: string;
  readonly tab: string;
  readonly title: string;
  readonly target: string;
  readonly sourceFootprint: string;
  readonly ordinal: number;
  readonly kind: ExportKind;
  readonly runtimeId: string;
  readonly runtimeEra: LateEraId;
  readonly runtimeFootprint: { readonly w: number; readonly d: number };
  readonly stages: readonly ExportStage[];
  readonly outputDirectory:
    | "apps/web/src/city/art/models"
    | "apps/web/src/city/art/models/townhall";
  readonly outputBasename: string;
  readonly outputPath: string;
}

export interface LateEraPlan {
  readonly era: LateEraId;
  readonly resourceId: string;
  readonly decodedBytes: number;
  readonly kitName: "Era8Kit" | "Era9Kit" | "Era10Kit";
  readonly prerequisites: readonly "Era9Kit"[];
  readonly builtOnly: readonly string[];
  readonly rows: readonly LateEraPlanRow[];
}

export interface ExportJob extends LateEraPlanRow {
  readonly era: LateEraId;
  readonly stage: ExportStage;
  readonly seedInput: string;
  readonly seed: number;
  readonly relativeFile: string;
}

export interface ExporterIo {
  readonly open: typeof import("node:fs/promises").open;
  readonly readFile: typeof import("node:fs/promises").readFile;
  readonly writeFile: typeof import("node:fs/promises").writeFile;
  readonly copyFile: typeof import("node:fs/promises").copyFile;
  readonly link: typeof import("node:fs/promises").link;
  readonly lstat: typeof import("node:fs/promises").lstat;
  readonly mkdir: typeof import("node:fs/promises").mkdir;
  readonly readdir: typeof import("node:fs/promises").readdir;
  readonly realpath: typeof import("node:fs/promises").realpath;
  readonly rename: typeof import("node:fs/promises").rename;
  readonly rmdir: typeof import("node:fs/promises").rmdir;
  readonly rm: typeof import("node:fs/promises").rm;
  readonly stat: typeof import("node:fs/promises").stat;
  readonly unlink: typeof import("node:fs/promises").unlink;
  fsyncDirectory(path: string): Promise<void>;
}

export interface ExporterMainDependencies {
  readonly io: ExporterIo;
  readonly pageFactory: StagedFidelityOptions["pageFactory"];
}

export interface OwnedRoot {
  readonly path: string;
  readonly realPath: string;
  readonly nonce: string;
  readonly device: bigint;
  readonly inode: bigint;
  dispose(): Promise<void>;
}

export interface OwnedCustomOutput extends OwnedRoot {
  readonly parentPath: string;
  readonly realParentPath: string;
  readonly parentDevice: bigint;
  readonly parentInode: bigint;
}

export type ExportMode =
  | {
      readonly mode: "production";
      readonly bare: true;
      readonly out: null;
      readonly seeded: true;
    }
  | {
      readonly mode: "check";
      readonly bare: true;
      readonly out: null;
      readonly seeded: true;
    }
  | {
      readonly mode: "custom";
      readonly bare: true;
      readonly out: string;
      readonly seeded: true;
    }
  | {
      readonly mode: "comparison";
      readonly bare: false;
      readonly out: null;
      readonly seeded: true;
    }
  | {
      readonly mode: "no-seed";
      readonly bare: true;
      readonly out: null;
      readonly seeded: false;
    }
  | {
      readonly mode: "repair";
      readonly bare: true;
      readonly out: null;
      readonly seeded: true;
    };

export interface DestinationLock {
  readonly path: string;
  readonly ownerPath: string;
  readonly nonce: string;
  readonly mode: "promotion" | "repair";
  readonly device: bigint;
  readonly inode: bigint;
  readonly ownerDevice: bigint;
  readonly ownerInode: bigint;
}

export interface DestinationLockOptions {
  readonly destinationRoot: string;
  readonly mode: "promotion" | "repair";
  readonly io: ExporterIo;
}

export interface ProductionManifestValidationOptions {
  readonly phase?: "final" | "pre-generation-publication";
}

export interface PublicationEntry {
  readonly relativeFile: string;
  readonly stagedPath: string;
  readonly finalPath: string;
  readonly sha256: string;
  readonly bytes: number;
}

export interface PublicationPlan {
  readonly mode: "production";
  readonly entries: readonly PublicationEntry[];
  readonly metadata: PublicationEntry;
}

export interface CustomPublicationPlan {
  readonly mode: "custom";
  readonly entries: readonly PublicationEntry[];
  readonly metadata: PublicationEntry;
  readonly destination: OwnedCustomOutput;
}

export interface PreparedPublicationPlan extends PublicationPlan {
  readonly destinationRoot: string;
  readonly stageRoot: string;
}

export interface PublicationDependencies {
  readonly io: ExporterIo;
  readonly boundary: (name: string) => Promise<void>;
}

export type ReleaseOwnedKind =
  | "glb"
  | "metadata"
  | "temp"
  | "generated-manifest"
  | "unknown-candidate"
  | "unrelated";

export interface SharedRootEntry {
  readonly relativePath: string;
  readonly kind: "file" | "directory" | "symlink" | "other";
}

export interface ReleaseOwnedInventory {
  readonly expected: readonly string[];
  readonly owned: readonly string[];
  readonly tempSiblings: readonly string[];
  readonly generatedManifest: string | null;
  readonly unknownCandidates: readonly string[];
  readonly unrelated: readonly string[];
}

export interface ProductionComparisonResult {
  readonly compared: 88;
  readonly mismatches: readonly string[];
  readonly observedSetDigest: string;
}

export interface KitSources {
  readonly atomic_age: string;
  readonly information_age: string;
  readonly cyberpunk: string;
  readonly decodedBytes: Readonly<Record<LateEraId, number>>;
}

export interface SourceInspection {
  readonly era: LateEraId;
  readonly roster: readonly (readonly [string, string, string, string, string, number])[];
  readonly builtOnly: readonly string[];
  readonly definitions: readonly string[];
  readonly bare: boolean;
  readonly decodedBytes: number;
  readonly directRandomCalls: number;
  readonly useBeforeBaseError: string | null;
  readonly jobs: readonly ExportJob[];
  readonly legacyEncoding: {
    readonly bridgeVersion: 1;
    readonly acceptedLegacyEncodingAssignments: number;
    readonly unsupportedLegacyEncodingAssignments: 0;
  };
  readonly legacy: {
    readonly rawModernColorSpace: string;
    readonly facadeColorSpace: string;
    readonly hasOwnEncoding: boolean;
    readonly restored: boolean;
  };
}

export const SOURCE_CONTRACT: SourceContract;
export const ERA_PLANS: readonly LateEraPlan[];
export const NODE_DEPENDENCIES: ExporterMainDependencies;
export function main(
  argv?: readonly string[],
  deps?: ExporterMainDependencies,
): Promise<undefined | string>;
export function assertCanonicalSource(bytes: Uint8Array): void;
export function assertCanonicalKitOwnership(
  entries: Readonly<Record<string, string>>,
): void;
export function extractKitSources(bytes: Uint8Array): KitSources;
export function installLegacyEncodingFacade(
  page: import("playwright").Page,
  buildContext: string,
): Promise<void>;
export function removeLegacyEncodingFacade(page: import("playwright").Page): Promise<void>;
export function evaluateKit(
  page: import("playwright").Page,
  era: LateEraId,
  options?: { readonly prerequisites: boolean },
): Promise<void>;
export function inspectSourceContract(
  era: LateEraId,
  pageFactory: ExporterMainDependencies["pageFactory"],
): Promise<SourceInspection>;
export function deriveExportJobs(plans?: typeof ERA_PLANS): readonly ExportJob[];
export function fnv1a32(input: string): number;
export function mulberry32(seed: number): () => number;
export function withBasenameRandom<T>(
  seedInput: string,
  build: () => T | Promise<T>,
): Promise<T>;

export interface GridworkLateEraAssetExtras {
  readonly schema: 1;
  readonly sourceSha256: string;
  readonly era: LateEraId;
  readonly sourceKey: string;
  readonly stage: ExportStage;
  readonly basename: string;
}

export interface GridworkBaseMapExtras {
  readonly slot: "baseColor";
  readonly sourceTextureKey: string;
  readonly imageFingerprint: string;
  readonly offset: readonly [number, number];
  readonly repeat: readonly [number, number];
  readonly center: readonly [number, number];
  readonly rotation: number;
  readonly matrix: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  readonly matrixAutoUpdate: boolean;
  readonly wrapS: string;
  readonly wrapT: string;
  readonly minFilter: string;
  readonly magFilter: string;
  readonly anisotropyRequested: number;
  readonly generateMipmaps: boolean;
  readonly flipY: boolean;
  readonly premultiplyAlpha: boolean;
  readonly unpackAlignment: number;
  readonly colorSpace: string;
}

export interface GridworkRenderExtras {
  readonly opacity: number;
  readonly transparent: boolean;
  readonly alphaTest: number;
  readonly side: string;
  readonly depthTest: boolean;
  readonly depthWrite: boolean;
  readonly depthFunc: string;
  readonly colorWrite: boolean;
  readonly blending: string;
  readonly blendSrc: string;
  readonly blendDst: string;
  readonly blendEquation: string;
  readonly blendSrcAlpha: string | null;
  readonly blendDstAlpha: string | null;
  readonly blendEquationAlpha: string | null;
  readonly premultipliedAlpha: boolean;
  readonly forceSinglePass: boolean;
  readonly polygonOffset: boolean;
  readonly polygonOffsetFactor: number;
  readonly polygonOffsetUnits: number;
  readonly toneMapped: boolean;
  readonly dithering: boolean;
  readonly flatShading: boolean;
  readonly vertexColors: boolean;
  readonly fog: boolean;
}

export interface GridworkMaterialExtras {
  readonly schema: 1;
  readonly kind: "toon" | "unlit";
  readonly sourceMaterialKey: string;
  readonly color: readonly [number, number, number];
  readonly baseMap: GridworkBaseMapExtras | null;
  readonly gradient: {
    readonly width: 3;
    readonly height: 1;
    readonly channels: 4;
    readonly channelInterpretation: "RGBA8_UNORM";
    readonly texels: readonly [
      readonly [number, number, number, number],
      readonly [number, number, number, number],
      readonly [number, number, number, number],
    ];
    readonly sourceObjectType: "CanvasTexture";
    readonly runtimeObjectType: "DataTexture";
    readonly format: string;
    readonly type: string;
    readonly minFilter: string;
    readonly magFilter: string;
    readonly wrapS: string;
    readonly wrapT: string;
    readonly generateMipmaps: boolean;
    readonly flipY: boolean;
    readonly premultiplyAlpha: boolean;
    readonly unpackAlignment: number;
    readonly colorSpace: string;
  } | null;
  readonly render: GridworkRenderExtras;
}

export interface ExportOneOptions {
  readonly job: ExportJob;
  readonly page: import("playwright").Page;
  readonly kitSources: KitSources;
  readonly bare: boolean;
  readonly installedExporterSha256: string;
}

export interface MetadataBounds {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
  readonly size: readonly [number, number, number];
}

export interface MetadataToonRecord {
  readonly schema: 1;
  readonly kind: "toon";
  readonly sourceMaterialKey: string;
  readonly color: readonly [number, number, number];
  readonly baseMap: GridworkBaseMapExtras | null;
  readonly gradient: NonNullable<GridworkMaterialExtras["gradient"]>;
  readonly render: GridworkRenderExtras;
}

export interface ExportOneResult {
  readonly job: ExportJob;
  readonly file: string;
  readonly relativeFile: string;
  readonly era: LateEraId;
  readonly kind: ExportKind;
  readonly stage: ExportStage;
  readonly runtimeId: string;
  readonly runtimeEra: LateEraId;
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly sourceMeshes: number;
  readonly shippedMeshes: number;
  readonly sourceTriangles: number;
  readonly shippedTriangles: number;
  readonly sourceBounds: MetadataBounds;
  readonly shippedBounds: MetadataBounds;
  readonly materialCount: number;
  readonly toonMaterialCount: number;
  readonly unlitMaterialCount: number;
  readonly baseMapCount: number;
  readonly textureCount: number;
  readonly embeddedImageCount: number;
  readonly anisotropyHistogram: Readonly<Record<string, number>>;
  readonly samplerSemanticDigest: string;
  readonly colorSpaceRoles: {
    readonly srgbColorMaps: number;
    readonly nonColorMaps: number;
  };
  readonly materialSemantics: readonly GridworkMaterialExtras[];
  readonly toon: readonly MetadataToonRecord[];
  readonly nonDefaultRenderOrderCount: number;
  readonly semanticDigest: string;
  readonly installedExporterSha256: string;
}

export interface BakedGroupResult {
  readonly root: THREE.Group;
  readonly sourceMeshes: number;
  readonly shippedMeshes: number;
  readonly sourceTriangles: number;
  readonly shippedTriangles: number;
  readonly sourceBounds: THREE.Box3;
  readonly shippedBounds: THREE.Box3;
}

export interface SemanticCaptureResult {
  readonly scene: THREE.Scene;
  readonly toonMaterials: number;
  readonly unlitMaterials: number;
  readonly baseMaps: number;
  readonly nonDefaultRenderOrders: number;
}

export interface StagedFidelityResult {
  readonly files: 87;
  readonly alphaMismatches: 0;
  readonly worstMeanRgbByteError: number;
  readonly worstP99RgbByteError: number;
  readonly resultsDigest: string;
}

export type StagedFidelityOptions =
  | {
      readonly mode: "shipping";
      readonly bare: true;
      readonly writeShippingMetadata: true;
      readonly stagedRoot: string;
      readonly jobs: readonly ExportJob[];
      readonly sourceBytes: Uint8Array;
      readonly pageFactory: () => Promise<{
        readonly page: import("playwright").Page;
        close(): Promise<void>;
      }>;
    }
  | {
      readonly mode: "comparison";
      readonly bare: false;
      readonly writeShippingMetadata: false;
      readonly stagedRoot: string;
      readonly jobs: readonly ExportJob[];
      readonly sourceBytes: Uint8Array;
      readonly pageFactory: () => Promise<{
        readonly page: import("playwright").Page;
        close(): Promise<void>;
      }>;
    };

export interface MetadataOutputRow {
  readonly file: string;
  readonly era: LateEraId;
  readonly definition: string;
  readonly tab: string;
  readonly title: string;
  readonly target: string;
  readonly sourceFootprint: string;
  readonly ordinal: number;
  readonly kind: ExportKind;
  readonly runtimeId: string;
  readonly runtimeEra: LateEraId;
  readonly stage: ExportStage;
  readonly runtimeFootprint: { readonly w: number; readonly d: number };
  readonly seedInput: string;
  readonly seed: number;
  readonly sha256: string;
  readonly bytes: number;
  readonly sourceMeshes: number;
  readonly shippedMeshes: number;
  readonly sourceTriangles: number;
  readonly shippedTriangles: number;
  readonly materialCount: number;
  readonly toonMaterialCount: number;
  readonly unlitMaterialCount: number;
  readonly baseMapCount: number;
  readonly textureCount: number;
  readonly embeddedImageCount: number;
  readonly anisotropyHistogram: Readonly<Record<string, number>>;
  readonly samplerSemanticDigest: string;
  readonly colorSpaceRoles: {
    readonly srgbColorMaps: number;
    readonly nonColorMaps: number;
  };
  readonly materialSemantics: readonly GridworkMaterialExtras[];
  readonly toon: readonly MetadataToonRecord[];
  readonly nonDefaultRenderOrderCount: number;
  readonly semanticDigest: string;
  readonly sourceBounds: MetadataBounds;
  readonly shippedBounds: MetadataBounds;
}

export interface MetadataAggregate {
  readonly bytes: number;
  readonly sourceMeshes: number;
  readonly shippedMeshes: number;
  readonly sourceTriangles: number;
  readonly shippedTriangles: number;
  readonly materials: number;
  readonly toonMaterials: number;
  readonly unlitMaterials: number;
  readonly baseMaps: number;
  readonly textures: number;
  readonly embeddedImages: number;
}

export interface MetadataCensus {
  readonly definitions: 39;
  readonly outputs: 87;
  readonly byEra: {
    readonly atomic_age: { readonly definitions: 14; readonly outputs: 32 };
    readonly information_age: { readonly definitions: 11; readonly outputs: 23 };
    readonly cyberpunk: { readonly definitions: 14; readonly outputs: 32 };
  };
  readonly byKind: {
    readonly skill: 72;
    readonly civic: 12;
    readonly townhall: 3;
  };
}

export interface MetadataDocument {
  readonly schema: 1;
  readonly source: {
    readonly repositoryPath: "apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html";
    readonly bytes: 1928383;
    readonly sha256: string;
    readonly manifestCount: 24;
    readonly resources: {
      readonly three: string;
      readonly atomic_age: string;
      readonly information_age: string;
      readonly cyberpunk: string;
    };
    readonly decodedKitBytes: {
      readonly atomic_age: 145862;
      readonly information_age: 126461;
      readonly cyberpunk: 112919;
    };
    readonly directRandomCalls: {
      readonly atomic_age: 21;
      readonly information_age: 29;
      readonly cyberpunk: 5;
    };
  };
  readonly generator: "scripts/export-era8-10-building-models.mjs";
  readonly bare: true;
  readonly seed: {
    readonly hash: "fnv1a32";
    readonly generator: "mulberry32";
    readonly input: "output basename without .glb";
  };
  readonly orderedImages: {
    readonly strategy: "serialized invocation order";
    readonly installedExporterSha256: string;
  };
  readonly batching: "world-transform + exact material/index/attribute/render-order signature";
  readonly semanticTransport: {
    readonly asset: "gridworkLateEraAsset";
    readonly material: "gridworkMaterial";
    readonly version: 1;
  };
  readonly legacyEncoding: {
    readonly bridgeVersion: 1;
    readonly acceptedAssignments: number;
    readonly unsupportedAssignments: 0;
  };
  readonly census: MetadataCensus;
  readonly fidelity: StagedFidelityResult;
  readonly outputs: readonly MetadataOutputRow[];
  readonly aggregates: {
    readonly byEra: Readonly<Record<LateEraId, MetadataAggregate>>;
    readonly global: MetadataAggregate;
  };
}

export interface MetadataBuildInput {
  readonly outputs: readonly ExportOneResult[];
  readonly fidelity: StagedFidelityResult;
  readonly legacyEncoding: {
    readonly bridgeVersion: 1;
    readonly acceptedAssignments: number;
    readonly unsupportedAssignments: 0;
  };
  readonly orderedImages: {
    readonly strategy: "serialized invocation order";
    readonly installedExporterSha256: string;
  };
}

export interface ValidatedOwnedStage {
  readonly mode: "custom";
  readonly stageRoot: string;
  readonly outputs: readonly ExportOneResult[];
  readonly entries: readonly PublicationEntry[];
  readonly metadata: PublicationEntry;
  readonly metadataDocument: MetadataDocument;
  readonly fidelity: StagedFidelityResult;
  dispose(): Promise<void>;
}

export interface ParsedGlb {
  readonly json: Readonly<Record<string, unknown>>;
  readonly binary: Uint8Array;
}

export function buildDisposableThreeBundle(options?: {
  readonly injection?: string | null;
}): Promise<{
  readonly path: string;
  readonly installedExporterSha256: string;
  dispose(): Promise<void>;
}>;
export function bakeAndBatchSourceGroup(group: THREE.Group): BakedGroupResult;
export function captureGridworkSemantics(
  baked: BakedGroupResult,
  job: ExportJob,
  sourceSha256: string,
): SemanticCaptureResult;
export function exportOne(options: ExportOneOptions): Promise<ExportOneResult>;
export function parseGlb(bytes: Uint8Array): ParsedGlb;
export function validateGlb(
  bytes: Uint8Array,
  job: ExportJob,
  source: ExportOneResult,
): Readonly<Record<string, string | number | boolean>>;
export function validateGlbWithLoader(
  page: import("playwright").Page,
  bytes: Uint8Array,
  job: ExportJob,
): Promise<void>;
export function runStagedFidelityGate(
  options: StagedFidelityOptions,
): Promise<StagedFidelityResult>;
export function buildMetadata(input: MetadataBuildInput): MetadataDocument;
export function writeMetadataAndFsync(
  stagedRoot: string,
  metadata: MetadataDocument,
  io?: ExporterIo,
): Promise<string>;
export function createValidatedOwnedStage(
  options: ExporterMainDependencies & {
    readonly mode: Extract<ExportMode, { readonly mode: "custom" }>;
    readonly sourceBytes: Uint8Array;
    readonly jobs: readonly ExportJob[];
  },
): Promise<ValidatedOwnedStage>;
export function publishOwnedCustomOutput(
  plan: CustomPublicationPlan,
  deps: { readonly io: ExporterIo },
): Promise<string>;
export function acquireDestinationLock(
  options: DestinationLockOptions,
): Promise<DestinationLock>;
export function releaseDestinationLock(
  lock: DestinationLock,
  io: ExporterIo,
): Promise<void>;
export function expectedReleaseOwnedPaths(jobs: readonly ExportJob[]): readonly string[];
export function classifyReleaseOwnedPaths(
  repositoryRoot: string,
  jobs: readonly ExportJob[],
  io: ExporterIo,
): Promise<ReleaseOwnedInventory>;
export function promoteManifestLast(
  plan: PreparedPublicationPlan,
  lock: DestinationLock,
  deps: PublicationDependencies,
): Promise<void>;
export function prepareManifestLastPromotion(
  plan: PublicationPlan,
  destinationRoot: string,
  io: ExporterIo,
): Promise<PreparedPublicationPlan>;
export function validateProductionManifest(
  repositoryRoot: string,
  io: ExporterIo,
  options?: ProductionManifestValidationOptions,
): Promise<ProductionComparisonResult>;
export function repairIncompleteLateEraOutput(
  deps: ExporterMainDependencies & {
    readonly repositoryRoot: string;
    readonly jobs: readonly ExportJob[];
  },
): Promise<void>;
export function parseArgs(argv: readonly string[]): ExportMode;
export function createOwnedCustomParent(io: ExporterIo): Promise<OwnedRoot>;
export function assertSafeCustomOutput(
  path: string,
  parent: OwnedRoot,
  io: ExporterIo,
): Promise<OwnedCustomOutput>;
export function createOwnedCustomOutput(
  path: string,
  io: ExporterIo,
): Promise<OwnedCustomOutput>;
export function runOwnedScratchCheck(
  options: ExporterMainDependencies & {
    readonly mode: "check" | "no-seed";
    readonly repositoryRoot: string;
    readonly jobs: readonly ExportJob[];
  },
): Promise<void>;
export function runOwnedComparisonScratch(
  options: ExporterMainDependencies & {
    readonly repositoryRoot: string;
    readonly jobs: readonly ExportJob[];
    readonly sourceBytes: Uint8Array;
  },
): Promise<void>;
