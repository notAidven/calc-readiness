# Era 8–10 Exact-Source Runtime Wiring Implementation Plan

> **Safety-model revision (2026-08-08):** Because all 87 GLBs and the metadata file are new
> late-era paths in an isolated uncommitted worktree, distributed recovery was unnecessary.
> Owned staging, a brief destination lock, manifest-last publication, explicit whitelisted repair,
> and Git-bound release gates provide the executable guarantees this feature needs.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the approved combined late-era source byte-for-byte, deterministically export its exact 87 authored states, prove staged source-to-runtime fidelity, and then wire and sequentially publish Era 8–10 models without changing Era 1–7 behavior.

**Architecture:** One import-safe data-driven exporter owns source extraction, the 39-row plan, ordered serialization, semantic transport, validation, and owned staging for production/custom/check modes. A strict schema-gated runtime adapter restores tagged assets before existing preparation, while registry imports/globs resolve at build and a Node validator verifies the exact on-disk release set. Publication is per-file rename with metadata last: interruption may leave a partial late-era set that ordinary registration/check refuses, while Era 1–7 bytes remain unchanged.

**Tech Stack:** Node.js 20+ ESM, npm lockfile v3, Three.js `0.185.1`, `GLTFExporter`, `GLTFLoader`, `BufferGeometryUtils`, Playwright `1.61.1`, React `19.2.7`, React Three Fiber `9.6.1`, Drei `10.7.7`, Vite `8.1.5`, strict TypeScript `7.0.2`, Vitest `4.1.10`, Biome `2.5.4`, SHA-256, and glTF 2.0/GLB.

## Global Constraints

- Execute from `/private/tmp/cr-era8-10-runtime-wiring-20260807` at `999dde0543cbb66113cea93e5cda4c7a96a81a15`, with Era 7 merged.
- Run root `npm ci` from tracked `package-lock.json` before the first test. A first red must identify missing Era 8–10 behavior, never missing Vitest/Playwright/esbuild.
- Task 11 and Task 16 independently derive the immutable scope base with
  `git merge-base HEAD origin/integration`, print that SHA in their command output, and use it for
  their raw Git unions. No fixed cross-task execution-base file, environment handoff, or symlink-
  reachable temporary exists.
- The approved spec remains unchanged. Intake is `/Users/<user>/Downloads/Gridwork Eras - Standalone (4).html`, `1,928,383` bytes, SHA-256 `6ee885ef8af7b7c9d9b26cf0ec219fa2c7f5fa8a88133794714f49ef8ba37a69`.
- Preserve exactly one combined repository source. No complete or partial per-era copy is allowed.
- Before extraction or writes, validate 24 manifest resources, all selected IDs, decoded kit sizes `145,862/126,461/112,919`, direct random-call counts `21/29/5`, and `bare=true`.
- Preserve exact `14/11/14` definitions, `32/23/32` states, 39 definitions, and 87 GLBs: 72 skill, 12 civic, three Hall.
- Preserve all six raw roster fields in order. Never normalize source labels, stable IDs, product copy, footprints, or ordinals.
- Era 10 may be defined before Era 9, must fail on first use before Era 9, and the same definition must succeed after Era 9 loads.
- Exporter import executes no main/write/browser/output. Use `pathToFileURL(process.argv[1]).href === import.meta.url`; never copy Era 7's unconditional `await main()`.
- Page callbacks use explicit `ExportRealm`, `PageThree`, `LegacyTexture`, and kit types. External `.mjs` imports resolve through a strict `.d.mts`; no suppressions or implicit-any boundary.
- Seed per basename with FNV-1a/mulberry32, scope one build, restore random in `finally`.
- Patch only a disposable copy of installed `GLTFExporter` so image bufferViews serialize in invocation order. Exact anchor, reverse-completion proof, cleanup, and installed-source hash are mandatory.
- Export a real tagged `THREE.Scene`; raw scene extras must survive as `gltf.scene.userData`.
- No creative amendment, rotate/recenter/ground/rescale, decimation/compression, cross-model/stage merge, nonuniform scale, or height squash.
- Bake complete `matrixWorld`; merge only same-output opaque meshes with identical full signatures. Transparent/order-incompatible meshes remain separate.
- Preserve exact RGBA toon gradients, unlit extension, complete render/base-map/sampler/color-space/anisotropy/order semantics; unsupported non-default fields fail.
- Tasks 10 and 11 each create their own `mktemp -d` candidate roots, install cleanup traps/finally blocks, and transfer no path assumption across tasks. No protected production path changes before Task 11's independently regenerated all-87 staged fidelity and hash comparison pass.
- After Task 11's N-state preflight, no-flags publication reruns fidelity against its exact stage
  bytes before the first per-file rename; it adds no durable recovery state.
- Default production publication is single-writer by policy: a brief destination-local `O_CREAT|O_EXCL` lock refuses contention; no automated stale-lock recovery exists.
- Every invocation validates all 87 GLBs plus metadata in one owned `mkdtemp` root before production writes.
- `--check`/`--check --no-seed` use scratch roots only and read production read-only. Custom
  output creates an owned parent with `mkdtemp`; the caller passes a non-existent child to
  `--out`, which the exporter creates and owns.
- Metadata is written last and is the publication marker. Missing/stale manifest or hash/census mismatch fails closed; repair is explicit and whitelisted.
- Release rollback remains an executable isolated-copy command and leaves active bytes unchanged.
- Keep nonrecursive registries, skill `2×2`, catalogue civic footprints, Hall `3×2`, stable civic IDs, and Hall `runtimeId:"town-hall"` plus separate `runtimeEra`.
- Consume Era 7 preload/civic/Hall behavior; no new preload file/global preload/Era 7 duplication.
- Exactly six Early Modern nodes remain procedural; `renaissance` is the sole missing art/dressing era.
- Adapter is schema-gated on prepared clones; untagged assets retain old behavior.
- Fade is exactly `baseOpacity * fade`; transient transparency is exactly `fade < 1`.
- Winter preserves Standard/Toon/Basic classes/state. Ghost keeps one green/rose Standard override, node order only, and disabled shadows; placed shadows remain true.
- Spatial evidence uses real learner `CitySurface`, production CSS/fonts, `archipelagoMetrics`, unscaled app iframe, exact PNG dimensions, no `?dev`, no tester-shell/full-page substitute, and surrounding island.
- `http-87.json` and tracked captures write only when `import.meta.env.VITE_ERA8_10_CAPTURE === "1"`; assertions always run and default writes nothing.
- Performance uses Node Playwright, fresh context per scenario, CPU/browser/Git SHA, six 600-frame scenarios, existing metrics dataset, and only real `CitySurfaceProps`.
- Every new/loosened guard has a mutation that fails at its intended final line. Every task closes its own red→green loop.
- Task commits remain conditional on explicit user authorization. Do not stage/commit/push/PR/merge/run servers during planning or touch concept images.

---

## File and Responsibility Map

### Export pipeline and tests

- Create canonical source, `scripts/export-era8-10-building-models.mjs`, adjacent `.d.mts`, `apps/web/src/city/era8To10ExporterTestTypes.ts`, building/source tests, serialized exporter config, and crash child.
- Create `scripts/compare-era8-10-output-sets.mjs` for exact task-owned release/repeat comparison.
- Create model budget/fit tests and one combined deterministic metadata file.
- Generate exact 87 GLBs from spec §4: 27 Atomic skill, 18 Information skill, 27 Cyberpunk skill, 12 civic built, three Hall built.

### Runtime and registries

- Create `lateEraGridworkMaterial.ts`, pure `modelPreparation.ts`, plus unit/fidelity/live/ghost tests.
- Modify `PlacedBuilding`, `BuildingThumb`, `GhostBuilding`, `winterFrost`.
- Create pure `era8To10RegistryPlan.ts`; Task 11 generates
  `art/era8To10AssetManifest.generated.ts` after N=88 validation, then wires
  `buildingAssets`, `civicBuildings`, `townHall`, `eraDressing`, and preview.
- Modify behavior-scoped population/current-era/preload/persistence tests only in Task 11 before promotion.

### Evidence/rollback/performance

- Create learner evidence browser test and dedicated one-worker config.
- Create exact release manifest, rollback rehearsal script/test.
- Create `cityPerformanceMetrics.tsx`, extend existing SceneMetrics/preload hooks, and create performance harness, fixture Vite entry/config, Node Playwright script/test.
- Create complete scope reporter, atomic mutation-coverage test, and evidence-completeness test/report.

### Current read-only anchors

- Ordered image bridge: `scripts/export-era7-building-models.mjs:563-640`; unconditional main to avoid: line 1525.
- Import-safe main: `scripts/verify-amplify-demo.mjs:529-544`.
- Valid learner props: `CitySurface.tsx:392-400,778-818`.
- Renderer metrics: `CityScene.tsx:498-544`; readers: `archipelagoNavigation.browser.test.tsx:339-377`.
- App-iframe capture/scale: `winterDevSkipShots.browser.test.tsx:79-147`; PNG IHDR: `winterZeroAccuracy.browser.test.tsx:359-413`.
- Frame budgets: `city/shotBudget.ts:34-63`; Node renderer probe: `scripts/measure-client-memory.mjs:154-249,402-503`.

## Frozen Cross-Task Interfaces

```ts
export type LateEraId = "atomic_age" | "information_age" | "cyberpunk";
export type ExportStage = "site" | "construction" | "built";
export type ExportKind = "skill" | "civic" | "townhall";
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
  readonly outputDirectory: "apps/web/src/city/art/models" | "apps/web/src/city/art/models/townhall";
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
  readonly stage: ExportStage;
  readonly seedInput: string;
  readonly seed: number;
  readonly relativeFile: string;
}
```

Town Hall rows use `runtimeId:"town-hall"` and their own `runtimeEra`.

```ts
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
  readonly offset: readonly [number, number];
  readonly repeat: readonly [number, number];
  readonly center: readonly [number, number];
  readonly rotation: number;
  readonly matrix: readonly [number, number, number, number, number, number, number, number, number];
  readonly matrixAutoUpdate: boolean;
  readonly wrapS: string; readonly wrapT: string;
  readonly minFilter: string; readonly magFilter: string;
  readonly anisotropyRequested: number;
  readonly generateMipmaps: boolean; readonly flipY: boolean;
  readonly premultiplyAlpha: boolean; readonly unpackAlignment: number;
  readonly colorSpace: string;
}
export interface GridworkRenderExtras {
  readonly opacity: number; readonly transparent: boolean; readonly alphaTest: number;
  readonly side: string; readonly depthTest: boolean; readonly depthWrite: boolean;
  readonly depthFunc: string; readonly colorWrite: boolean; readonly blending: string;
  readonly blendSrc: string; readonly blendDst: string; readonly blendEquation: string;
  readonly blendSrcAlpha: string | null; readonly blendDstAlpha: string | null;
  readonly blendEquationAlpha: string | null; readonly premultipliedAlpha: boolean;
  readonly forceSinglePass: boolean; readonly polygonOffset: boolean;
  readonly polygonOffsetFactor: number; readonly polygonOffsetUnits: number;
  readonly toneMapped: boolean; readonly dithering: boolean; readonly flatShading: boolean;
  readonly vertexColors: boolean; readonly fog: boolean;
}
export interface GridworkMaterialExtras {
  readonly schema: 1; readonly kind: "toon" | "unlit";
  readonly sourceMaterialKey: string; readonly color: readonly [number, number, number];
  readonly baseMap: GridworkBaseMapExtras | null;
  readonly gradient: {
    readonly width: 3; readonly height: 1; readonly channels: 4;
    readonly channelInterpretation: "RGBA8_UNORM";
    readonly texels: readonly [
      readonly [number, number, number, number],
      readonly [number, number, number, number],
      readonly [number, number, number, number],
    ];
    readonly sourceObjectType: "CanvasTexture"; readonly runtimeObjectType: "DataTexture";
    readonly format: string; readonly type: string;
    readonly minFilter: string; readonly magFilter: string;
    readonly wrapS: string; readonly wrapT: string;
    readonly generateMipmaps: boolean; readonly flipY: boolean;
    readonly premultiplyAlpha: boolean; readonly unpackAlignment: number;
    readonly colorSpace: string;
  } | null;
  readonly render: GridworkRenderExtras;
}
```

```ts
export interface DestinationLock {
  readonly path: string; readonly nonce: string; readonly device: bigint; readonly inode: bigint;
}
export interface OwnedRoot {
  readonly path: string; readonly nonce: string; readonly device: bigint; readonly inode: bigint;
  dispose(): Promise<void>;
}
export interface PublicationEntry {
  readonly relativeFile: string; readonly stagedPath: string; readonly finalPath: string;
  readonly sha256: string; readonly bytes: number;
}
export interface PublicationPlan {
  readonly mode: "production";
  readonly entries: readonly PublicationEntry[]; readonly metadata: PublicationEntry;
}
export interface CustomPublicationPlan {
  readonly mode: "custom";
  readonly entries: readonly PublicationEntry[]; readonly metadata: PublicationEntry;
  readonly destination: OwnedRoot;
}
export type ReleaseOwnedKind =
  | "glb" | "metadata" | "temp" | "generated-manifest" | "unknown-candidate" | "unrelated";
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
  readonly compared: 88; readonly mismatches: readonly string[]; readonly observedSetDigest: string;
}
export interface StagedFidelityResult {
  readonly files: 87; readonly alphaMismatches: 0;
  readonly worstMeanRgbByteError: number; readonly worstP99RgbByteError: number;
  readonly resultsDigest: string;
}
export interface GridworkRestoreResult {
  readonly tagged: boolean; readonly restoredMaterials: number;
  readonly restoredRenderOrders: number;
}
export interface FadeMaterialBinding {
  readonly material: THREE.Material; readonly baseOpacity: number;
  readonly baseTransparent: boolean; readonly baseDepthTest: boolean;
  readonly baseDepthWrite: boolean; readonly baseColorWrite: boolean;
  readonly baseBlending: THREE.Blending;
}
export interface PerBuildingRendererMetrics {
  readonly meshes: number; readonly drawPrimitives: number;
  readonly triangles: number; readonly geometryBytes: number;
}
export interface PreloadPerformanceMetrics {
  readonly candidateCalls: number; readonly effectCalls: number;
  readonly candidateUrls: readonly string[]; readonly effectUrls: readonly string[];
}
export interface CityRendererMetricsPayload {
  readonly metricsResetToken: string;
  readonly renderSequence: number;
  readonly camera: { readonly x: number; readonly y: number; readonly z: number; readonly zoom: number };
  readonly frameSamplesMs: readonly number[];
  readonly frameMedianMs: number; readonly frameP95Ms: number;
  readonly drawCalls: number; readonly triangles: number; readonly sceneObjects: number;
  readonly memory: { readonly geometries: number; readonly textures: number };
  readonly perBuilding: Readonly<Record<string, PerBuildingRendererMetrics>>;
  readonly preload: PreloadPerformanceMetrics;
}
export interface PerformanceScenario {
  readonly era: LateEraId; readonly variant: "authored" | "rollback-control";
  readonly contextId: string;
  readonly environment: {
    readonly cpu: string; readonly logicalCores: number; readonly os: string;
    readonly browser: string; readonly viewport: "1024x580"; readonly dpr: 1;
    readonly gitSha: string;
  };
  readonly frameWindows: readonly [
    CityRendererMetricsPayload, CityRendererMetricsPayload, CityRendererMetricsPayload,
    CityRendererMetricsPayload, CityRendererMetricsPayload,
  ];
  readonly frameMs: { readonly samples: 600; readonly median: number; readonly p95: number };
  readonly interactions: Readonly<Record<
    "pan" | "zoom" | "select" | "move" | "eraSwitch",
    { readonly count: 20; readonly median: number; readonly p95: number }
  >>;
  readonly responseBytes: { readonly body: number; readonly encoded: number };
  readonly metadataBytes: number;
  readonly cacheMisses: number;
  readonly cold: Readonly<Record<
    ExportStage,
    { readonly requests: number; readonly bodyBytes: number; readonly encodedBytes: number;
      readonly cacheMisses: number }
  >>;
  readonly preload: PreloadPerformanceMetrics; readonly coldPreload: PreloadPerformanceMetrics;
  readonly rendererMemory: { readonly geometries: number; readonly textures: number };
  readonly perBuiltModel: Readonly<Record<string, {
    readonly drawPrimitives: number; readonly meshes: number; readonly triangles: number;
    readonly geometryBytes: number; readonly glbBytes: number;
    readonly sourceMeshes: number; readonly shippedMeshes: number;
    readonly sourceTriangles: number; readonly shippedTriangles: number;
    readonly materials: number; readonly textures: number; readonly images: number;
  }>>;
  readonly aggregate: {
    readonly drawPrimitives: number; readonly meshes: number; readonly triangles: number;
    readonly geometryBytes: number; readonly glbBytes: number;
    readonly sourceMeshes: number; readonly shippedMeshes: number;
    readonly sourceTriangles: number; readonly shippedTriangles: number;
    readonly materials: number; readonly textures: number; readonly images: number;
  };
}
```

The final `scripts/export-era8-10-building-models.d.mts` copies the exporter/publication/
metadata Frozen interfaces and every TypeScript-consumed exporter signature exactly; Task
14 exports the renderer/preload/performance interfaces from
`cityPerformanceMetrics.tsx`. Neither surface declares runtime-only extra fields, index
signatures on structured contract objects, or `any`; only the explicitly named
histogram/per-building map fields use `Readonly<Record<...>>`. The declaration file's
`PublicationPlan`, `ExportOneResult`,
`MetadataDocument`, and `MetadataOutputRow` declarations match the definitions above in field
names, optionality, and readonly nesting:

```ts
import type * as THREE from "three";
export interface ExporterIo {
  open: typeof import("node:fs/promises").open;
  readFile: typeof import("node:fs/promises").readFile;
  writeFile: typeof import("node:fs/promises").writeFile;
  copyFile: typeof import("node:fs/promises").copyFile;
  link: typeof import("node:fs/promises").link;
  lstat: typeof import("node:fs/promises").lstat;
  mkdir: typeof import("node:fs/promises").mkdir;
  readdir: typeof import("node:fs/promises").readdir;
  realpath: typeof import("node:fs/promises").realpath;
  rename: typeof import("node:fs/promises").rename;
  rmdir: typeof import("node:fs/promises").rmdir;
  rm: typeof import("node:fs/promises").rm;
  stat: typeof import("node:fs/promises").stat;
  unlink: typeof import("node:fs/promises").unlink;
  fsyncDirectory(path: string): Promise<void>;
}
export interface DestinationLockOptions {
  readonly destinationRoot: string; readonly mode: "promotion"; readonly io: ExporterIo;
}
export interface PublicationDependencies {
  readonly io: ExporterIo; readonly boundary: (name: string) => Promise<void>;
}
export type ExportMode =
  | { readonly mode: "production"; readonly bare: true; readonly out: null; readonly seeded: true }
  | { readonly mode: "check"; readonly bare: true; readonly out: null; readonly seeded: true }
  | { readonly mode: "custom"; readonly bare: true; readonly out: string; readonly seeded: true }
  | { readonly mode: "comparison"; readonly bare: false; readonly out: null; readonly seeded: true }
  | { readonly mode: "no-seed"; readonly bare: true; readonly out: null; readonly seeded: false }
  | { readonly mode: "repair"; readonly bare: true; readonly out: null; readonly seeded: true };
export type StagedFidelityOptions = {
  readonly mode: "shipping"; readonly bare: true; readonly writeShippingMetadata: true;
  readonly stagedRoot: string; readonly jobs: readonly ExportJob[]; readonly sourceBytes: Uint8Array;
  readonly pageFactory: () => Promise<{ readonly page: import("playwright").Page; close(): Promise<void> }>;
} | {
  readonly mode: "comparison"; readonly bare: false; readonly writeShippingMetadata: false;
  readonly stagedRoot: string; readonly jobs: readonly ExportJob[]; readonly sourceBytes: Uint8Array;
  readonly pageFactory: () => Promise<{ readonly page: import("playwright").Page; close(): Promise<void> }>;
};
export interface KitSources {
  readonly atomic_age: string; readonly information_age: string; readonly cyberpunk: string;
  readonly decodedBytes: Readonly<Record<LateEraId, number>>;
}
export type SourceRosterTuple = readonly [
  definition: string, tab: string, title: string,
  target: string, footprint: string, ordinal: number,
];
export interface SourceInspection {
  readonly era: LateEraId; readonly roster: readonly SourceRosterTuple[];
  readonly builtOnly: readonly string[]; readonly definitions: readonly string[];
  readonly bare: boolean; readonly directRandomCalls: number;
  readonly legacyEncoding: {
    readonly bridgeVersion: 1; readonly acceptedLegacyEncodingAssignments: number;
    readonly unsupportedLegacyEncodingAssignments: 0;
  };
  readonly decodedBytes: number; readonly jobs: readonly ExportJob[];
}
export interface ExportOneOptions {
  readonly job: ExportJob; readonly page: import("playwright").Page;
  readonly kitSources: KitSources; readonly bare: boolean;
  readonly installedExporterSha256: string;
}
export interface MetadataBounds {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
  readonly size: readonly [number, number, number];
}
export interface MetadataToonRecord {
  readonly schema: 1; readonly kind: "toon";
  readonly sourceMaterialKey: string;
  readonly color: readonly [number, number, number];
  readonly baseMap: GridworkBaseMapExtras | null;
  readonly gradient: NonNullable<GridworkMaterialExtras["gradient"]>;
  readonly render: GridworkRenderExtras;
}
export interface ExportOneResult {
  readonly job: ExportJob;
  readonly file: string; readonly relativeFile: string;
  readonly era: LateEraId; readonly kind: ExportKind; readonly stage: ExportStage;
  readonly runtimeId: string; readonly runtimeEra: LateEraId;
  readonly bytes: Uint8Array; readonly sha256: string;
  readonly sourceMeshes: number; readonly shippedMeshes: number;
  readonly sourceTriangles: number; readonly shippedTriangles: number;
  readonly sourceBounds: MetadataBounds; readonly shippedBounds: MetadataBounds;
  readonly materialCount: number; readonly toonMaterialCount: number;
  readonly unlitMaterialCount: number; readonly baseMapCount: number;
  readonly textureCount: number; readonly embeddedImageCount: number;
  readonly anisotropyHistogram: Readonly<Record<string, number>>;
  readonly samplerSemanticDigest: string;
  readonly colorSpaceRoles: { readonly srgbColorMaps: number; readonly nonColorMaps: number };
  readonly materialSemantics: readonly GridworkMaterialExtras[];
  readonly toon: readonly MetadataToonRecord[];
  readonly nonDefaultRenderOrderCount: number; readonly semanticDigest: string;
  readonly installedExporterSha256: string;
}
export interface BakedGroupResult {
  readonly root: import("three").Group;
  readonly sourceMeshes: number; readonly shippedMeshes: number;
  readonly sourceTriangles: number; readonly shippedTriangles: number;
  readonly sourceBounds: import("three").Box3; readonly shippedBounds: import("three").Box3;
}
export interface SemanticCaptureResult {
  readonly scene: import("three").Scene;
  readonly toonMaterials: number; readonly unlitMaterials: number;
  readonly baseMaps: number; readonly nonDefaultRenderOrders: number;
}
export interface MetadataOutputRow {
  readonly file: string; readonly era: LateEraId;
  readonly definition: string; readonly tab: string; readonly title: string;
  readonly target: string; readonly sourceFootprint: string; readonly ordinal: number;
  readonly kind: ExportKind; readonly runtimeId: string; readonly runtimeEra: LateEraId;
  readonly stage: ExportStage; readonly runtimeFootprint: { readonly w: number; readonly d: number };
  readonly seedInput: string; readonly seed: number; readonly sha256: string; readonly bytes: number;
  readonly sourceMeshes: number; readonly shippedMeshes: number;
  readonly sourceTriangles: number; readonly shippedTriangles: number;
  readonly materialCount: number; readonly toonMaterialCount: number;
  readonly unlitMaterialCount: number; readonly baseMapCount: number;
  readonly textureCount: number; readonly embeddedImageCount: number;
  readonly anisotropyHistogram: Readonly<Record<string, number>>;
  readonly samplerSemanticDigest: string;
  readonly colorSpaceRoles: { readonly srgbColorMaps: number; readonly nonColorMaps: number };
  readonly materialSemantics: readonly GridworkMaterialExtras[];
  readonly toon: readonly MetadataToonRecord[];
  readonly nonDefaultRenderOrderCount: number; readonly semanticDigest: string;
  readonly sourceBounds: MetadataBounds; readonly shippedBounds: MetadataBounds;
}
export interface MetadataAggregate {
  readonly bytes: number;
  readonly sourceMeshes: number; readonly shippedMeshes: number;
  readonly sourceTriangles: number; readonly shippedTriangles: number;
  readonly materials: number; readonly toonMaterials: number; readonly unlitMaterials: number;
  readonly baseMaps: number; readonly textures: number; readonly embeddedImages: number;
}
export interface MetadataCensus {
  readonly definitions: 39; readonly outputs: 87;
  readonly byEra: {
    readonly atomic_age: { readonly definitions: 14; readonly outputs: 32 };
    readonly information_age: { readonly definitions: 11; readonly outputs: 23 };
    readonly cyberpunk: { readonly definitions: 14; readonly outputs: 32 };
  };
  readonly byKind: {
    readonly skill: 72; readonly civic: 12; readonly townhall: 3;
  };
}
export interface MetadataDocument {
  readonly schema: 1;
  readonly source: {
    readonly repositoryPath:
      "apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html";
    readonly bytes: 1928383;
    readonly sha256: "6ee885ef8af7b7c9d9b26cf0ec219fa2c7f5fa8a88133794714f49ef8ba37a69";
    readonly manifestCount: 24;
    readonly resources: {
      readonly three: "b43f7ac9-8d5b-4218-9a75-39aafe705a90";
      readonly atomic_age: "8a39b357-c12e-4bc9-a66f-530e5b51718a";
      readonly information_age: "650d4184-f51f-45f3-a2df-bf92e1ed174e";
      readonly cyberpunk: "b043418c-5d3e-4532-8068-28fc4155770f";
    };
    readonly decodedKitBytes: {
      readonly atomic_age: 145862; readonly information_age: 126461;
      readonly cyberpunk: 112919;
    };
    readonly directRandomCalls: {
      readonly atomic_age: 21; readonly information_age: 29; readonly cyberpunk: 5;
    };
  };
  readonly generator: "scripts/export-era8-10-building-models.mjs";
  readonly bare: true;
  readonly seed: {
    readonly hash: "fnv1a32"; readonly generator: "mulberry32";
    readonly input: "output basename without .glb";
  };
  readonly orderedImages: {
    readonly strategy: "serialized invocation order";
    readonly installedExporterSha256: string;
  };
  readonly batching:
    "world-transform + exact material/index/attribute/render-order signature";
  readonly semanticTransport: {
    readonly asset: "gridworkLateEraAsset"; readonly material: "gridworkMaterial";
    readonly version: 1;
  };
  readonly legacyEncoding: {
    readonly bridgeVersion: 1; readonly acceptedAssignments: number;
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
    readonly bridgeVersion: 1; readonly acceptedAssignments: number;
    readonly unsupportedAssignments: 0;
  };
  readonly orderedImages: {
    readonly strategy: "serialized invocation order"; readonly installedExporterSha256: string;
  };
}
export interface ParsedGlb {
  readonly json: Readonly<Record<string, unknown>>; readonly binary: Uint8Array;
}
export interface ExporterMainDependencies {
  readonly io: ExporterIo; readonly pageFactory: StagedFidelityOptions["pageFactory"];
}
export const SOURCE_CONTRACT: SourceContract;
export const ERA_PLANS: readonly LateEraPlan[];
export const NODE_DEPENDENCIES: ExporterMainDependencies;
export function main(
  argv?: readonly string[], deps?: ExporterMainDependencies,
): Promise<void>;
export function assertCanonicalSource(bytes: Uint8Array): void;
export function assertCanonicalKitOwnership(entries: Readonly<Record<string, string>>): void;
export function extractKitSources(bytes: Uint8Array): KitSources;
export function installLegacyEncodingFacade(
  page: import("playwright").Page, buildContext: string,
): Promise<void>;
export function removeLegacyEncodingFacade(page: import("playwright").Page): Promise<void>;
export function evaluateKit(
  page: import("playwright").Page, era: LateEraId,
  options?: { readonly prerequisites: boolean },
): Promise<void>;
export function inspectSourceContract(
  era: LateEraId, pageFactory: StagedFidelityOptions["pageFactory"],
): Promise<SourceInspection>;
export function deriveExportJobs(plans?: typeof ERA_PLANS): readonly ExportJob[];
export function fnv1a32(input: string): number;
export function mulberry32(seed: number): () => number;
export function withBasenameRandom<T>(seedInput: string, build: () => T | Promise<T>): Promise<T>;
export function buildDisposableThreeBundle(options?: { readonly injection?: string | null }): Promise<{
  readonly path: string; readonly installedExporterSha256: string;
  dispose(): Promise<void>;
}>;
export function bakeAndBatchSourceGroup(group: import("three").Group): BakedGroupResult;
export function captureGridworkSemantics(
  baked: BakedGroupResult, job: ExportJob, sourceSha256: string,
): SemanticCaptureResult;
export function exportOne(options: ExportOneOptions): Promise<ExportOneResult>;
export function parseGlb(bytes: Uint8Array): ParsedGlb;
export function validateGlb(
  bytes: Uint8Array, job: ExportJob, source: ExportOneResult,
): Readonly<Record<string, string | number | boolean>>;
export function validateAllStagedOutputs(
  stagedRoot: string, jobs: readonly ExportJob[],
): Promise<readonly ExportOneResult[]>;
export function runStagedFidelityGate(options: StagedFidelityOptions): Promise<StagedFidelityResult>;
export function buildMetadata(input: MetadataBuildInput): MetadataDocument;
export function writeMetadataAndFsync(
  stagedRoot: string, metadata: MetadataDocument,
): Promise<void>;
export function acquireDestinationLock(options: DestinationLockOptions): Promise<DestinationLock>;
export function releaseDestinationLock(lock: DestinationLock, io: ExporterIo): Promise<void>;
export function validateProductionManifest(repositoryRoot: string, io: ExporterIo): Promise<ProductionComparisonResult>;
export function expectedReleaseOwnedPaths(jobs: readonly ExportJob[]): readonly string[];
export function classifyReleaseOwnedPaths(
  repositoryRoot: string, jobs: readonly ExportJob[], io: ExporterIo,
): Promise<ReleaseOwnedInventory>;
export function promoteManifestLast(
  plan: PublicationPlan, lock: DestinationLock, deps: PublicationDependencies,
): Promise<void>;
export function publishOwnedCustomOutput(
  plan: CustomPublicationPlan, deps: PublicationDependencies,
): Promise<void>;
export function repairIncompleteLateEraOutput(deps: ExporterMainDependencies & {
  readonly repositoryRoot: string; readonly jobs: readonly ExportJob[];
}): Promise<void>;
export function parseArgs(argv: readonly string[]): ExportMode;
export function assertSafeCustomOutput(path: string, repositoryRoot: string, io: ExporterIo): Promise<OwnedRoot>;
export function runOwnedScratchCheck(options: ExporterMainDependencies & {
  readonly mode: "check" | "no-seed"; readonly repositoryRoot: string; readonly jobs: readonly ExportJob[];
}): Promise<void>;
export function runOwnedComparisonScratch(options: ExporterMainDependencies & {
  readonly repositoryRoot: string; readonly jobs: readonly ExportJob[]; readonly sourceBytes: Uint8Array;
}): Promise<void>;
```

The same declaration file defines every referenced option/result interface; no test locally retypes or casts the exporter module.

## Snippet Import Audit

- `export-era8-10-building-models.mjs`: `execFile` from `node:child_process`;
  `createHash/randomBytes` from `node:crypto`; `constants` from `node:fs`;
  `copyFile/link/lstat/mkdir/mkdtemp/open/readFile/readdir/realpath/rename/rmdir/rm/stat/unlink/writeFile`
  from `node:fs/promises`; only `tmpdir` from `node:os`; path
  `basename/dirname/join/relative/resolve/sep`; URL `fileURLToPath/pathToFileURL`; util
  `promisify`; zlib `gunzipSync`. Playwright types remain declaration-only.
- `lateEraGridworkMaterial.ts`: runtime `three`; semantic types from its own module; no Node import.
- `modelPreparation.ts`: runtime `three`; `Footprint/footprintFitScale/MAX_BUILD_HEIGHT`; adapter predicates/restorers; `applyFrost`; existing `reviveMaterial` moved/exported from this file rather than circularly imported from `PlacedBuilding`.
- `compare-era8-10-output-sets.mjs`: `readFile`; crypto hash; path join/relative; no shell subprocess.
- `cityPerformanceMetrics.tsx`: React context/hooks/types, Three object/geometry types,
  stable `civicTypeOf`; no Node import.
- `Era8To10PerformanceHarness.tsx`: React `useCallback/useEffect/useState`; real
  `CitySurface`; `CityDevSession`/`CityLoad`; current
  `islandLand`/`roads`/`worldLayout` placement APIs; production fonts/styles.
- Performance fixture main: React DOM root; `createCityDevSession`; the exact caught-up
  seed builder; `Era8To10PerformanceHarness`.
- Evidence browser test: font packages, production CSS, React/Vitest/browser APIs, real CitySurface/resolvers/types, `shotBudget`; no Node builtin in browser code.
- Evidence config: React plugin, Playwright provider, `mkdir`, path containment helpers, `BrowserCommand`, `defineConfig`, `browserGlobalDefine`.
- Rollback script: `execFile`; crypto hash; fs/promises `cp/mkdir/readFile/rm/symlink/writeFile`; path `dirname/join/relative/sep`; URL `fileURLToPath`.
- Performance script: `execFile` plus `promisify`; `randomUUID`; `cpus/platform/arch`; `performance`; fs/promises `readFile/rm/writeFile`; URL `fileURLToPath`; `chromium`; Vite `createServer`; rollback preparation import.
- Scope reporter: `execFile`; crypto hash; `readFile`; path join; URL root resolution;
  `FULL_FEATURE_RELEASE_PATHS` from the canonical release-path script.

Each task runs `npm run typecheck` after adding its file; unused/missing imports are failures, not deferred cleanup.

## Dependency and Promotion Order

1. Task 1 bootstrap/import/types/source.
2. Task 2 exact plan/evaluation.
3. Task 3 ordered deterministic exporter/validators.
4. Tasks 4–6 staging/publication, scratch/custom safety, and runtime manifest guards. Task 7 may run parallel with Task 4 after Task 3.
5. Task 8 live effects after adapter.
6. Task 9 pure registry data without eager URLs.
7. Task 10 implements real staged fidelity, then exposes/validates one owned custom candidate.
8. Task 11 writes actual eager/menu/persistence reds, wires registries, independently
   regenerates through the real gate, compares shipping candidates, accepts bare-false
   comparison mode, then performs the first protected production promotion.
9. Task 12 wires permanent CI/reproduction gates and runs post-promotion browser/eager verification.
10. Task 13 learner evidence; Task 14 rollback; Task 15 performance; Task 16 final evidence.

No production path changes before Task 11. Tasks 4–6 and Tasks 10–12 are strictly sequential.
Task 9 is strictly after Task 6 because both modify
`apps/web/src/city/era8To10BuildingModels.test.ts`; no task pair claiming parallel execution may
share a file.

## Review-Finding Resolution Index

- Remaining finding 1: Task 1 lockfile plus exact browser setup.
- 2: complete declaration seam under Frozen Interfaces and Task 1.
- 3: Snippet Import Audit and Task 1 exact Node imports.
- 4: Task 3 explicit browser Scene payload and closure mutation.
- 5: Task 4 completes injected publication dependencies; Tasks 10–11 supply real adapters.
- 6: Frozen output and ownership interfaces plus Tasks 4–5 exact path/handle tests.
- 7: Task 4 exclusive sibling-temp creation and cleanup/contention.
- 8: Task 4 `rmdir` interface/verified-empty cleanup.
- 9: Task 5 comparison-only path plus Task 6 build-time asset boundary.
- 10: Task 6 complete manifest/runtime guard and scope tests.
- 11: Tasks 10–11 independent `mktemp` lifecycles and cleanup.
- 12: discriminated fidelity modes under Frozen Interfaces and Task 11 acceptance.
- 13: Task 8 pure preparation seam, Task 11 staged use, Task 12 surface use.
- 14: Task 12 complete browser harness/timeouts/assertions.
- 15: Task 13 Vite env typing/custom mkdir/DataView/default-no-write.
- 16: Tasks 11–13 and 15 explicit long-suite budgets/commands.
- 17: Task 15 production metrics extension and Node Playwright evidence.
- 18: Atomic Mutation Registry and Task 16 exact executed-record equality.
- 19: Task 11 NUL pathspec dry-run and conditional staging.
- 20: Task 10 legacy-encoding metadata fields/tests/mutations.
- 21: Task 1 current-tip Era 7 prerequisite baseline.
- 22: Task 16 exact 26-command final verification list.
- 23: Tasks 14 and 16 executable rollback/complete scope.

All prior-review findings remain represented by the global constraints, dependency order, frozen interfaces, atomic mutations, and Tasks 1–16; Task 16 re-runs that complete coverage.

### Last-audit 12-item disposition

1. Tasks 7–8 build the real adapter/shared preparation; Task 10 implements real
   framebuffer fidelity before its custom CLI; Task 11 alone enables production.
2. Task 8 preserves the baseline untagged X/Z fit, Y cap, grounding, and outer
   `!frosted` revival branch with four atomic regressions.
3. Task 12 uses `../../styles.css`, the complete exported `MetadataOutputRow`, and
   current resolver/component signatures under exact root typecheck.
4. Task 12 filters/guards Three observations, identity-deduplicates renderers/scenes,
   explicitly selects `trg-8`, and proves three named, distinct late-content scenes.
5. Task 13 puts each mkdir/write lexically inside typed `if (CAPTURE)` while ordinary
   runs execute all assertions and the repository write guard.
6. Tasks 14–15 synchronously clear visible metrics, acknowledge each token, embed the
   token in the next exact 120-sample payload, and reject stale windows.
7. Task 15 freezes cold stage snapshots before interactions, measures actual
   body/encoded bytes, and times each state postcondition to a post-render sequence.
8. Task 14 defines explicit release/control category policies for every instrumentation
   path; Task 15 reruns both two-way Set guards after its files exist.
9. Frozen interfaces declare every consumed promotion, export-result, metadata-row,
   metadata-document, aggregate, window, and scenario field; Task 10 rejects extra keys.
10. Task 12 writes final assertions first, runs six one-seam bypasses against those
    assertions, then runs the same browser file on real production surfaces.
11. Task 11 validates its exact 115-path task scope before staging, while Task 16 validates the
   complete 164-path publish scope through the raw normalized execution-base union. Task 11
   dry-runs, compares the staged Set, and traps secure temporaries under `set -euo pipefail`; all 16
    commits have executable authorization gates.
12. Every task that adds TypeScript/config runs focused tests plus exact
    `npm run typecheck` before its checkpoint, including Tasks 13–15.

## Atomic Mutation Registry

Each line is one independently executed mutation record with a unique ID:
`SRC37 + EXP63 + CND6 + TX21 + RND4 + P89 + RUN19 + PREP4 + SURF6 + REG16 + PER6 + EVD38 +
RBK8 + SCP8 = 325`. Task 16 enumerates each named prefix/range, takes their union, and compares
that union bidirectionally to the executed records; it does not rely on a historical total.

### Source/export identities

- `SRC001` hide Vitest after bootstrap; dependency precondition fails.
- `SRC002` replace guarded main with unconditional main; import-only child observes execution.
- `SRC003` flip one source byte.
- `SRC004` append one source byte.
- `SRC005` remove one manifest entry.
- `SRC006` replace selected Three resource ID.
- `SRC007` replace selected Era 8 resource ID.
- `SRC008` replace selected Era 9 resource ID.
- `SRC009` replace selected Era 10 resource ID.
- `SRC010` add an Era 8-only partial source copy.
- `SRC011` add an Era 9-only partial source copy.
- `SRC012` add an Era 10-only partial source copy.
- `SRC013` change decoded Era 8 byte count.
- `SRC014` change decoded Era 9 byte count.
- `SRC015` change decoded Era 10 byte count.
- `SRC016` set source `bare=false`.
- `SRC017` change Era 8 direct random-call count.
- `SRC018` change Era 9 direct random-call count.
- `SRC019` change Era 10 direct random-call count.
- `SRC020` delete one source roster definition.
- `SRC021` move one civic out of `builtOnly`.
- `SRC022` replace Atomic raw `Apartments` tab.
- `SRC023` replace Cyberpunk raw `the Drone Command` title.
- `SRC024` change one zero-based ordinal.
- `SRC025` change one per-era definition count.
- `SRC026` change one per-era output count.
- `SRC027` instantiate Era 10 before Era 9.
- `SRC028` remove the legacy encoding accessor.
- `SRC029` assign an unsupported legacy encoding.
- `SRC030` mark a source base-color map non-color.
- `SRC031` blanket-mark a gradient sRGB.
- `SRC032` leak the facade/prototype after teardown.
- `SRC033` duplicate one plan source key.
- `SRC034` duplicate one runtime identity.
- `SRC035` duplicate one output path.
- `SRC036` use era ID as Hall `runtimeId`.
- `SRC037` remove Hall `runtimeEra`.

### Determinism/geometry/static/semantic/metadata

- `EXP001` disable basename seeding.
- `EXP002` fail to restore `Math.random`.
- `EXP003` use one run-global stream and reverse jobs.
- `EXP004` remove ordered-image anchor.
- `EXP005` duplicate ordered-image anchor.
- `EXP006` restore unordered image task.
- `EXP007` reverse image completion against unordered code.
- `EXP008` modify resolved installed `GLTFExporter.js` bytes; the returned SHA-256, every
  `ExportOneOptions`/result handoff, and emitted metadata must fail at their final equality.
- `EXP009` leak the disposable bundle directory.
- `EXP009A` reference Node `SOURCE_CONTRACT` from the browser Scene callback.
- `EXP010` tag a Group rather than the exported Scene.
- `EXP011` remove raw glTF Scene extras.
- `EXP012` drop loader-restored Scene `userData`.
- `EXP013` omit matrixWorld baking.
- `EXP014` omit material signature field.
- `EXP015` omit index-form signature.
- `EXP016` omit attribute signature.
- `EXP017` merge different render orders.
- `EXP018` merge transparent meshes.
- `EXP019` alter triangle count.
- `EXP020` alter bounds.
- `EXP021` apply nonuniform scale.
- `EXP022` decimate geometry.
- `EXP023` merge across outputs.
- `EXP024` add external buffer URI.
- `EXP025` add external image URI.
- `EXP026` add camera.
- `EXP027` add light.
- `EXP028` add animation.
- `EXP029` add skin.
- `EXP030` add morph target.
- `EXP031` add Draco extension.
- `EXP032` add meshopt extension.
- `EXP033` add any unsupported extension.
- `EXP034` inject nonfinite accessor.
- `EXP035` inject out-of-range index.
- `EXP036` mismatch attribute counts.
- `EXP037` remove required normals.
- `EXP038` remove required UV.
- `EXP039` corrupt embedded image.
- `EXP040` corrupt sampler reference.
- `EXP041` collapse RGBA gradient to one channel.
- `EXP042` remove one gradient sampler field.
- `EXP043` drop source base map.
- `EXP044` drop base-map transform.
- `EXP045` change requested anisotropy.
- `EXP046` remove one recorded depth field.
- `EXP047` remove `KHR_materials_unlit`.
- `EXP048` remove non-default order extra.
- `EXP049` swap color/non-color role.
- `EXP050` change metadata encoding bridge version.
- `EXP051` decrement accepted legacy assignment count.
- `EXP052` set unsupported legacy assignments to one.
- `EXP053` inject metadata timestamp.
- `EXP054` inject metadata absolute path.
- `EXP055` inject metadata PID/hostname.
- `EXP056` inject metadata browser profile.
- `EXP057` reorder metadata rows/keys.
- `EXP058` force height-cap activation.
- `EXP059` inject nonfinite bounds.
- `EXP060` inject empty bounds.
- `EXP061` add universal fill floor.
- `EXP062` rotate/recenter/ground source during export.
- `CND001` omit one planned candidate file.
- `CND002` add one unplanned candidate file.
- `CND003` duplicate one candidate basename.
- `CND004` change one per-era candidate count.
- `CND005` hand-edit one candidate hash.
- `CND006` omit candidate metadata.

### Publication, repair, and scratch safety

- `TX001` generate outside the invocation-owned `mkdtemp` stage root.
- `TX002` promote before all staged structural, semantic, and fidelity checks pass.
- `TX003` accept malformed, duplicate, or contradictory CLI flags.
- `TX004` follow traversal, a symlink, or a non-regular destination.
- `TX005` accept an existing/nonempty custom output directory.
- `TX006` clean a non-owned or symlinked custom directory.
- `TX007` let check/no-seed write outside or leak its scratch root.
- `TX008` permit a pre-existing destination lock.
- `TX009` release a lock with changed nonce.
- `TX010` release a lock with changed inode.
- `TX011` publish metadata before all 87 GLBs.
- `TX012` accept missing/stale manifest, census, or hash data.
- `TX013` create a sibling temporary without exclusive creation.
- `TX014` omit the temporary-file fsync.
- `TX015` omit staged-hash verification immediately before rename.
- `TX016` omit the per-file rename.
- `TX017` omit the parent-directory fsync after rename.
- `TX018` rename metadata before the final GLB rename.
- `TX019` let repair run while the destination lock exists.
- `TX020` let repair traverse a symlinked whitelist target.
- `TX021` let repair accept a whitelist path escaping its destination root.
- `RND001` falsely classify one canonically varying output as seed-independent; its two unseeded
  GLB hashes must fail the independence assertion.
- `RND002` omit one output from the exact random-dependent population while leaving the 87-job
  census unchanged; the partition/set-equality assertion must fail.
- `RND003` empty one era's random-output population while preserving a global count.
- `RND004` replace one era's random-output population with another era's members.
- `P000`–`P087` interrupt after each incomplete promoted count `N=0..87`; ordinary
  use/check refuses and abrupt exit retains the lock until the owner/interruption fixture
  relinquishes it for repair.
- `P088` produces the complete `N=88` set; ordinary use/check must pass.

### Runtime/registry/persistence/evidence

- `RUN001` accept malformed asset schema.
- `RUN002` leave PBR transport.
- `RUN003` drop runtime base map.
- `RUN004` drop runtime sampler.
- `RUN005` pre-clamp anisotropy.
- `RUN006` omit runtime order.
- `RUN007` clone restored material per mesh.
- `RUN008` alias unequal gradients.
- `RUN009` allocate material/texture during frame.
- `PREP001` remove the existing untagged Y-height cap.
- `PREP002` ground an untagged model before its Y-height cap.
- `PREP003` revive an untagged frosted material.
- `PREP004` skip the existing fair-weather untagged revival.
- `RUN011` use `fade < 0.999`.
- `RUN012` assign fade directly to opacity.
- `RUN013` force steady transparency false.
- `RUN014` convert Toon frost to Standard.
- `RUN015` skip Basic frost.
- `RUN016` mutate fair cache.
- `RUN017` restore source materials in ghost.
- `RUN018` enable ghost shadow.
- `RUN019` disable placed shadow.
- `RUN020` drop ghost node order.
- `SURF001` bypass PlacedModelStack preparation.
- `SURF002` bypass BuildingThumb preparation.
- `SURF003` bypass GridworkModelPreview preparation.
- `SURF004` bypass Town Hall shared stack preparation.
- `SURF005` bypass adapter restoration in the pure seam.
- `SURF006` use wrong placed fit/shadow preset.
- `REG001` remove `TRG.9` while preserving count.
- `REG002` change one stable handle.
- `REG003` change one mass.
- `REG004` change Drone Command subtitle article.
- `REG005` use display-derived civic identity.
- `REG006` conflate Hall ID/era.
- `REG007` remove one generated stage.
- `REG008` remove one civic URL.
- `REG009` remove one Hall URL.
- `REG010` remove one dressing.
- `REG011` leave stale Early Modern exception.
- `REG012` omit new fallback exception.
- `REG013` make skill glob recursive.
- `REG014` leak civic URL into skill registry.
- `REG015` return late Hall stage siblings.
- `REG016` add global Hall warmed set.
- `PER001` derive persistence ID from display.
- `PER002` debit on move.
- `PER003` debit on reload.
- `PER004` change ID after reload.
- `PER005` drop inherited placement.
- `PER006` delete placement during art outage.
- `EVD001` default HTTP run writes file.
- `EVD002` one GLB returns non-200.
- `EVD003` iframe scale differs from one.
- `EVD004` PNG width mismatch.
- `EVD005` PNG height mismatch.
- `EVD006` production body font missing.
- `EVD007` production CSS missing.
- `EVD008` metrics sample remains zero.
- `EVD009` triangles remain zero.
- `EVD010` crop omits plot.
- `EVD011` crop omits surrounding island.
- `EVD012` reuse Playwright context.
- `EVD013` omit one of six scenarios.
- `EVD014` collect fewer than 600 frames.
- `EVD015` omit CPU.
- `EVD016` omit browser/version.
- `EVD017` omit viewport/DPR.
- `EVD018` omit Git SHA.
- `EVD019` report average instead of median.
- `EVD020` omit interaction median.
- `EVD021` omit interaction p95.
- `EVD022` rely only on content-length.
- `EVD023` omit preload candidates.
- `EVD024` omit preload effect calls.
- `EVD025` omit cache misses.
- `EVD026` omit renderer memory.
- `EVD027` omit per-built-model metrics.
- `EVD028` pass nonexistent CitySurface prop.
- `EVD029` accept a 120-sample payload whose reset token is stale.
- `EVD030` let the frozen cold snapshot absorb an interaction request.
- `EVD031` accept a frame rendered before the interaction state postcondition.
- `EVD032` collapse site/construction/built cold GLB buckets.
- `EVD033` use the throttled payload sequence instead of post-render sequence.
- `EVD034` include the fixed warm-up window in the 600 measured frames.
- `EVD035` use the lower middle sample instead of the even-population median.
- `EVD036` silently omit one required member from a learner roster shard.
- `EVD037` accept a wrong capacity-faithful unseated-set composition.
- `EVD038` unconditionally toggle Buildings, closing its already-open roster on iteration two.
- `RBK001` omit modified rollback path.
- `RBK002` omit generated GLB rollback path.
- `RBK003` mutate active tree.
- `RBK004` retain late URL after rollback.
- `RBK005` lose persisted civic fallback.
- `RBK006` omit one Task 15 instrumentation path from the manifest.
- `RBK007` restore one instrumentation path in performance-control mode.
- `RBK008` leave a stale extra in the retained instrumentation Set.
- `SCP001` omit unstaged path.
- `SCP002` omit staged path.
- `SCP003` omit untracked path.
- `SCP004` omit untracked bytes/hash.
- `SCP005` omit untracked text content.
- `SCP006` omit aggregate stats.
- `SCP007` omit one frame/report/mutation record.
- `SCP008` omit a committed-since-base path.

Create `test/era8To10MutationCoverage.test.ts` exporting the same frozen 325-ID union declared
at this registry's heading: `SRC37/EXP63/CND6/TX21/RND4/P89/RUN19/PREP4/SURF6/REG16/PER6/EVD38/
RBK8/SCP8`. The test derives `EXPECTED_IDS` by enumerating that one union declaration rather than
copying a count or partial prefix table. Executed records must have unique IDs, count exactly
`EXPECTED_IDS.length`, and be Set-equal to `EXPECTED_IDS`; every record contains the intended
assertion text, nonzero red exit, zero green exit, and restoration digest. A compound record
cannot satisfy two IDs.

## Task 1: Bootstrap, Import-Safe Typed Shell, and Canonical Source

**Files:** Create exporter `.mjs`/`.d.mts`, page-realm types, source/building/safety tests, serialized config, canonical HTML; modify app Vitest exclusion.

**Interfaces:** Produces `main`, `SOURCE_CONTRACT`, `assertCanonicalSource`, `assertCanonicalKitOwnership`, strict exporter declarations, and `ExportRealm`.

**Dependencies:** None.

- [ ] **Step 1: Bootstrap before any red**

```bash
test -f package-lock.json
umask 077
git merge-base HEAD origin/integration
npm ci
npm run setup:browsers
node -e 'const l=require("./package-lock.json");if(l.lockfileVersion!==3)process.exit(1);console.log(require("vitest/package.json").version,require("playwright/package.json").version,require("three/package.json").version)'
```

Expected: `npm ci` exits 0; `playwright install chromium` exits 0 and reports Chromium installed/already present; version probe exits 0; tracked status unchanged. No Chromium red runs before this evidence.

- [ ] **Step 2: Prove the current-tip Era 7 prerequisite before late-era work**

```bash
git rev-parse HEAD
git log --merges --oneline -20
rg -n "ERA_SEVEN_NODE_BUILDINGS|nodeModelPreloadUrls|usePlacedBuildingPreload|townHallPreloadUrls" \
  apps/web/src/city/buildingAssets.ts \
  apps/web/src/city/three/placedBuildingPreload.ts \
  apps/web/src/city/townHall.ts
npm test -w @cr/web -- \
  src/city/era7BuildingModels.test.ts \
  src/city/buildingAssets.test.ts \
  src/city/civicBuildings.test.ts \
  src/city/eraDressing.test.tsx \
  src/city/three/placedBuildingPreload.test.tsx \
  src/city/townHall.test.ts
```

Expected HEAD `999dde0543cbb66113cea93e5cda4c7a96a81a15`; merge/landed-source output shows Era 7 files at this tip; signatures match current source. Add a prerequisite block in `era8To10BuildingModels.test.ts` asserting exactly 32 model-backed nodes, 96 skill URLs, 24 civic built URLs, eight Hall URLs, six art-backed/dressed eras, and the six named Early Modern fallbacks. This block must pass before the first late-era red. Record literal commands/output in final evidence.

```ts
const baselineNodes = ERA_SEQUENCE.flatMap((era) => getEraNodes(era.id))
  .filter((nodeId) => nodeModelUrls(nodeId).length === 3);
expect(baselineNodes).toHaveLength(32);
expect(cityModelUrls()).toHaveLength(96);
expect(CIVIC_MODEL_TYPE_IDS).toHaveLength(24);
expect(townHallModelUrls()).toHaveLength(8);
expect(Object.keys(ERA_DRESSINGS)).toHaveLength(6);
expect(getEraNodes("renaissance")
  .filter((nodeId) => nodeModelUrls(nodeId).length !== 3)).toEqual([
    "GEO.1", "GEO.2", "CG.1", "POL.6", "POL.7", "RAT.5",
  ]);
```

- [ ] **Step 3: Create the test harness, then write/run feature reds**

Create `vitest.era8-10-exporter.config.ts` first:

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/web/src/city/era8To10ExporterSafety.test.ts"],
    maxWorkers: 1,
    testTimeout: 2_100_000,
    hookTimeout: 120_000,
  },
});
```

Exclude that test from app jsdom. The safety test spawns:

```ts
const result = spawnSync(process.execPath, [
  "--input-type=module", "-e",
  `await import(${JSON.stringify(pathToFileURL(EXPORTER).href)})`,
], { cwd: ROOT, encoding: "utf8", env: { ...process.env, TMPDIR: isolatedTemp } });
expect(result.status, result.stderr).toBe(0);
expect(result.stdout).toBe("");
expect(result.stderr).toBe("");
expect(readdirSync(isolatedTemp)).toEqual([]);
expect(treeDigest(ART_ROOT)).toBe(beforeArtDigest);
```

`treeDigest` recursively sorts paths and SHA-256 hashes regular bytes/symlink targets. Source test globs all `building-sources/*.dc.html` and calls the exporter ownership API.

Run:

```bash
npx vitest run --config vitest.era8-10-exporter.config.ts
npm test -w @cr/web -- src/city/era8To10BuildingModels.test.ts
```

Expected red: exporter module missing and canonical ownership missing; no dependency/config error.

- [ ] **Step 4: Add strict page and exporter type boundaries**

Create `era8To10ExporterTestTypes.ts`:

```ts
import type * as THREE from "three";
declare const legacyBrand: unique symbol;
export type LegacySrgbToken = { readonly [legacyBrand]: true };
export type LegacyTexture = THREE.Texture & { encoding?: LegacySrgbToken };
export type PageThree = typeof THREE & { readonly sRGBEncoding: LegacySrgbToken };
export type SourceRosterTuple = readonly [
  definition: string, tab: string, title: string, target: string,
  footprint: string, ordinal: number,
];
export interface GridworkKit {
  bare: boolean;
  roster(): readonly SourceRosterTuple[];
  builtOnly(): readonly string[];
  defs(): Readonly<Record<string, unknown>>;
}
export type GridworkKitConstructor = new () => GridworkKit;
export interface ExportRealm {
  THREE: PageThree;
  Era8Kit?: GridworkKitConstructor;
  Era9Kit?: GridworkKitConstructor;
  Era10Kit?: GridworkKitConstructor;
  __gridworkBuildContext?: string;
}
```

Inside each `page.evaluate`, cast inline:

```ts
const realm = globalThis as unknown as typeof globalThis & ExportRealm;
```

No imported helper is referenced inside a serialized callback.

Create the complete `.d.mts` from **Frozen Cross-Task Interfaces**, including every final export/signature from the start. Add this source contract to that same file:

```ts
export interface SourceContract {
  readonly bytes: 1928383; readonly sha256: string; readonly manifestCount: 24;
  readonly resources: Readonly<Record<string, string>>;
  readonly decodedKitBytes: Readonly<Record<string, number>>;
}
```

The full declaration therefore typechecks even while later runtime functions are not implemented yet; tests consume only exports their task has made real and assert runtime presence before use.

- [ ] **Step 5: Create import-safe exporter shell with exact Node imports**

Import `execFile` from `node:child_process`; `createHash` and `randomBytes` from `node:crypto`;
`constants` from `node:fs`; the exact promise APIs `copyFile`, `link`, `lstat`, `mkdir`,
`mkdtemp`, `open`, `readFile`, `readdir`, `realpath`, `rename`, `rmdir`, `rm`, `stat`, `unlink`,
and `writeFile` from `node:fs/promises`; and only `tmpdir` from `node:os`. Also import path,
URL, util, and zlib symbols from their own modules. Define approved constants and:

```js
export function assertCanonicalSource(bytes) {
  const input = Buffer.from(bytes);
  if (input.byteLength !== SOURCE_CONTRACT.bytes) throw new Error("source byte count mismatch");
  const digest = createHash("sha256").update(input).digest("hex");
  if (digest !== SOURCE_CONTRACT.sha256) throw new Error("source SHA-256 mismatch");
}
export function assertCanonicalKitOwnership(entries) {
  const canonical = "./art/building-sources/era-08-10-gridwork-all-buildings.dc.html";
  for (const [era, id] of Object.entries(SOURCE_CONTRACT.resources)) {
    if (era === "three") continue;
    const owners = Object.entries(entries).filter(([, text]) => text.includes(id)).map(([path]) => path);
    if (owners.length !== 1 || owners[0] !== canonical) {
      throw new Error(`${era} resource ${id} owners: ${owners.join(", ") || "none"}`);
    }
  }
}
export async function main(argv = process.argv.slice(2), deps = {}) {
  void argv;
  void deps;
  throw new Error("Era 8-10 export plan is not implemented yet");
}
const isMain =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) await main(process.argv.slice(2), {});
```

Task 4 replaces the temporary empty dependency object with fully typed `NODE_DEPENDENCIES`; the two-argument main signature and guarded invocation never change.

- [ ] **Step 6: Copy source and prove individual partial-copy guards**

```bash
cp "/Users/<user>/Downloads/Gridwork Eras - Standalone (4).html" \
  apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html
cmp -s "/Users/<user>/Downloads/Gridwork Eras - Standalone (4).html" \
  apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html
stat -f '%z' apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html
shasum -a 256 apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html
```

Expected exact size/hash. Inject one extra in-memory entry containing only each Era 8/9/10 resource ID; each fails by era/ID/path.

- [ ] **Step 7: Verify green/import mutation**

```bash
npx vitest run --config vitest.era8-10-exporter.config.ts -t "imports the exporter"
npm test -w @cr/web -- src/city/era8To10BuildingModels.test.ts
npm run typecheck
```

Expected import zero-write/output and source ownership green. In a temp exporter copy replace guarded call with unconditional `await main()`; import child fails, then restore.

- [ ] **Step 8: Conditional checkpoint**

Use the exact Task 1 block under **Conditional Checkpoint Commands** only when authorized; otherwise retain uncommitted.

## Task 2: Exact 39-Row Plan, Isolated Evaluation, and r128 Bridge

**Files:** Modify exporter/declarations and source/building tests.

**Interfaces:** Produces `ERA_PLANS`, `deriveExportJobs`, `extractKitSources`, encoding install/remove, `evaluateKit`, `inspectSourceContract`.

**Dependencies:** Task 1.

- [ ] **Step 1: Write plan/evaluation reds with a complete page factory**

```ts
async function pageFactory() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: "block" });
  await context.route("**/*", (route) => route.abort());
  const page = await context.newPage();
  return {
    page,
    close: async () => { await context.close(); await browser.close(); },
  };
}
```

Tests require exact definitions/outputs/categories/rows/built-only/ordinals/IDs/paths, decoded sizes, random counts, and bare. Expected red: `exporter.deriveExportJobs is not a function` and `exporter.inspectSourceContract is not a function`.

- [ ] **Step 2: Add the complete immutable 39-row plan**

Define `p(definition,tab,title,target,sourceFootprint,ordinal,kind,runtimeId,runtimeEra,w,d,basename,stages)`;
it records the spec §6.1 output directory and output-path template on every row, and
`deriveExportJobs` expands that template with the stage suffix:

```js
const S = Object.freeze(["site", "construction", "built"]);
const B = Object.freeze(["built"]);
const p = (
  definition, tab, title, target, sourceFootprint, ordinal, kind,
  runtimeId, runtimeEra, w, d, outputBasename, stages,
) => {
  const outputDirectory = kind === "townhall"
    ? "apps/web/src/city/art/models/townhall"
    : "apps/web/src/city/art/models";
  return Object.freeze({
  definition, tab, title, target, sourceFootprint, ordinal, kind,
  runtimeId, runtimeEra, runtimeFootprint: Object.freeze({ w, d }),
  outputDirectory, outputBasename, outputPath: `${outputDirectory}/${outputBasename}`, stages,
  });
};
export const ERA_PLANS = Object.freeze([
  Object.freeze({
    era:"atomic_age", resourceId:SOURCE_CONTRACT.resources.atomic_age,
    decodedBytes:145_862, kitName:"Era8Kit", prerequisites:Object.freeze([]),
    builtOnly:Object.freeze(["supermarket","apartment","pool","firestation","townhall"]),
    rows:Object.freeze([
      p("weather","Weather","the Weather Office","FUN.4","3×2",0,"skill","FUN.4","atomic_age",2,2,"fun-4",S),
      p("exchange","Exchange","the Telephone Exchange","LF.1","3×2",1,"skill","LF.1","atomic_age",2,2,"lf-1",S),
      p("radio","Radio","the Radio Workshop","FUN.6","2×2",2,"skill","FUN.6","atomic_age",2,2,"fun-6",S),
      p("tunnel","Wind Tunnel","the Wind Tunnel","FUN.5","3×2",3,"skill","FUN.5","atomic_age",2,2,"fun-5",S),
      p("housing","Housing","the Housing Blocks","FUN.9","3×2",4,"skill","FUN.9","atomic_age",2,2,"fun-9",S),
      p("electronics","Electronics","the Electronics Works","LF.2","3×2",5,"skill","LF.2","atomic_age",2,2,"lf-2",S),
      p("nuclear","Nuclear","the Nuclear Weapons Facility","LF.3","3×3",6,"skill","LF.3","atomic_age",2,2,"lf-3",S),
      p("power","Power","the Power Station","FUN.10","3×3",7,"skill","FUN.10","atomic_age",2,2,"fun-10",S),
      p("cooling","Cooling","the Cooling Tower","LF.4","2×2",8,"skill","LF.4","atomic_age",2,2,"lf-4",S),
      p("supermarket","Supermarket","the Supermarket","civic","3×2",9,"civic","atomic_age_supermarket","atomic_age",2,2,"civic-atomic-age-supermarket",B),
      p("apartment","Apartments","the Apartment Tower","civic","2×2",10,"civic","atomic_age_apartment_tower","atomic_age",1,1,"civic-atomic-age-apartment-tower",B),
      p("pool","Pool","the Swimming Pool","civic","3×2",11,"civic","atomic_age_swimming_pool","atomic_age",3,2,"civic-atomic-age-swimming-pool",B),
      p("firestation","Fire Station","the Fire Station","civic","3×2",12,"civic","atomic_age_community_centre","atomic_age",2,1,"civic-atomic-age-community-centre",B),
      p("townhall","Town Hall","the Town Hall & Heating Plant","civic","3×3",13,"townhall","town-hall","atomic_age",3,2,"townhall-atomic-age",B),
    ]),
  }),
  Object.freeze({
    era:"information_age", resourceId:SOURCE_CONTRACT.resources.information_age,
    decodedBytes:126_461, kitName:"Era9Kit", prerequisites:Object.freeze([]),
    builtOnly:Object.freeze(["distribution","condominium","roofgarden","hospital","headquarters"]),
    rows:Object.freeze([
      p("datacentre","Data Centre","the Data Centre","EL.1","3×2",0,"skill","EL.1","information_age",2,2,"el-1",S),
      p("officetower","Office Tower","the Office Tower","EL.2","2×2",1,"skill","EL.2","information_age",2,2,"el-2",S),
      p("chipfab","Chip Factory","the Chip Factory","EL.3","3×3",2,"skill","EL.3","information_age",2,2,"el-3",S),
      p("researchlab","Research Lab","the Research Lab","EL.4","3×2",3,"skill","EL.4","information_age",2,2,"el-4",S),
      p("glassapts","Glass Apartments","the Glass Apartments","EL.5","3×2",4,"skill","EL.5","information_age",2,2,"el-5",S),
      p("airbase","Air Force Base","the Air Force Base","EL.6","3×3",5,"skill","EL.6","information_age",2,2,"el-6",S),
      p("distribution","Distribution","the Distribution Centre","civic","3×3",6,"civic","information_age_food_warehouse","information_age",2,2,"civic-information-age-food-warehouse",B),
      p("condominium","Condominium","the Condominium","civic","2×2",7,"civic","information_age_residential_tower","information_age",1,1,"civic-information-age-residential-tower",B),
      p("roofgarden","Roof Garden","the Roof Garden","civic","3×3",8,"civic","information_age_park","information_age",3,2,"civic-information-age-park",B),
      p("hospital","Hospital","the Hospital","civic","3×3",9,"civic","information_age_clinic","information_age",1,2,"civic-information-age-clinic",B),
      p("headquarters","Headquarters","the Headquarters","civic","3×3",10,"townhall","town-hall","information_age",3,2,"townhall-information-age",B),
    ]),
  }),
  Object.freeze({
    era:"cyberpunk", resourceId:SOURCE_CONTRACT.resources.cyberpunk,
    decodedBytes:112_919, kitName:"Era10Kit", prerequisites:Object.freeze(["Era9Kit"]),
    builtOnly:Object.freeze(["vertfarm","pods","nightmarket","nightclub","steamvent"]),
    rows:Object.freeze([
      p("neonplaza","Neon Plaza","the Neon Plaza","TRG.1","3×3",0,"skill","TRG.1","cyberpunk",2,2,"trg-1",S),
      p("dronecommand","Drone Command","the Drone Command","TRG.2","3×2",1,"skill","TRG.2","cyberpunk",2,2,"trg-2",S),
      p("hologram","Hologram Theatre","the Hologram Theatre","TRG.3","3×2",2,"skill","TRG.3","cyberpunk",2,2,"trg-3",S),
      p("signaltower","Signal Tower","the Signal Tower","TRG.4","2×2",3,"skill","TRG.4","cyberpunk",2,2,"trg-4",S),
      p("datavault","Data Vault","the Data Vault","TRG.5","3×2",4,"skill","TRG.5","cyberpunk",2,2,"trg-5",S),
      p("broadcast","Broadcast Tower","the Broadcast Tower","TRG.6","3×3",5,"skill","TRG.6","cyberpunk",2,2,"trg-6",S),
      p("robotics","Robotics Lab","the Robotics Lab","TRG.7","3×2",6,"skill","TRG.7","cyberpunk",2,2,"trg-7",S),
      p("exchange","Stock Exchange","the Stock Exchange","TRG.8","3×3",7,"skill","TRG.8","cyberpunk",2,2,"trg-8",S),
      p("quantum","Quantum Core","the Quantum Core","TRG.9","3×3",8,"skill","TRG.9","cyberpunk",2,2,"trg-9",S),
      p("vertfarm","Vertical Farm","the Vertical Farm","civic","2×2",9,"civic","cyberpunk_vertical_farm","cyberpunk",1,1,"civic-cyberpunk-vertical-farm",B),
      p("pods","Pod Apartments","the Pod Apartments","civic","2×2",10,"civic","cyberpunk_capsule_homes","cyberpunk",1,1,"civic-cyberpunk-capsule-homes",B),
      p("nightmarket","Night Market","the Night Market","civic","3×3",11,"civic","cyberpunk_night_market","cyberpunk",3,2,"civic-cyberpunk-night-market",B),
      p("nightclub","Nightclub","the Nightclub","civic","3×2",12,"civic","cyberpunk_station","cyberpunk",2,2,"civic-cyberpunk-station",B),
      p("steamvent","Town Hall","the Steam Vent","civic","4×4",13,"townhall","town-hall","cyberpunk",3,2,"townhall-cyberpunk",B),
    ]),
  }),
]);
```

`deriveExportJobs` validates `14/11/14`, `32/23/32`, 39/87, 72/12/3, uniqueness, roster/built-only order, ordinal, graph/catalogue membership, helper-derived basenames, Hall stable ID/runtime era.

- [ ] **Step 3: Implement source extraction/evaluation**

Parse exactly one manifest block, assert 24/selected IDs, gunzip three resources, verify `145862/126461/112919`, then return kit text. `inspectSourceContract` opens injected page, installs disposable modern bundle and page-local encoding facade, evaluates one era, returns roster/built-only/defs/bare/direct random calls/jobs, and always restores/closes.

Facade uses explicit inline `ExportRealm` and `LegacyTexture` casts, one private token, accessor mapping only that token to `SRGBColorSpace`, unsupported throw with build context, and exact descriptor/namespace restore.

- [ ] **Step 4: Prove raw-modern and Era 10 use-before-base**

Raw r185 assignment leaves color space wrong; facade makes it sRGB with no own `encoding`. Define Era10 first, instantiate before Era9 and fail `/Era9Kit/`, load Era9, instantiate same constructor and get 14 rows.

- [ ] **Step 5: Verify green/mutations**

```bash
npx vitest run --config vitest.era8-10-exporter.config.ts -t "source contract|legacy|Era 10"
npm test -w @cr/web -- src/city/era8To10BuildingModels.test.ts
npm run typecheck
```

Run atomic IDs `SRC003`–`SRC037`; restore each before the green rerun.

- [ ] **Step 6: Conditional checkpoint**

Use the exact Task 2 checkpoint block only when authorized; otherwise retain uncommitted.

## Task 3: Ordered Deterministic Export, Real Scene Tags, and Validators

**Files:** Modify exporter/declarations/safety test.

**Interfaces:** Produces seed helpers, disposable ordered bundle, geometry/semantic export, `exportOne`, `parseGlb`, `validateGlb`.

**Dependencies:** Task 2.

- [ ] **Step 1: Write deterministic/image/Scene/geometry/semantic reds**

Require repeat/reorder hashes, reverse callback completion, installed exporter hash unchanged/temp
removed, world-baked bounds/triangles, real glTF scene extras and loader `scene.userData`,
Vertical Farm order 3, and full semantic records. The seeded-versus-unseeded probe compares
complete GLBs, including transported images. Canonical behavior is an exact empty
seed-independent set and an exact `32/23/32` random-dependent population because fresh kit
construction randomizes base-map texels for every output. Assert the partition and era membership
directly. `RND001` falsely adds one varying output to the independent set; `RND002` omits one
random-dependent output; `RND003` and `RND004` corrupt per-era composition. Each must fail its own
final assertion. Expected red: `exporter.buildDisposableThreeBundle is not a function`.

- [ ] **Step 2: Implement FNV/mulberry and one-build scoping**

```js
export function fnv1a32(input) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}
export async function withBasenameRandom(seedInput, build) {
  const previous = Math.random;
  Math.random = mulberry32(fnv1a32(seedInput));
  try { return await build(); } finally { Math.random = previous; }
}
```

Page helper does the same around one fresh kit/build.

- [ ] **Step 3: Implement disposable ordered-image bundle**

Use the exact Era 7 anchor strings and this complete lifecycle:

```js
const execFileAsync = promisify(execFile);
export async function buildDisposableThreeBundle({ injection = null } = {}) {
  if (injection !== null && (typeof injection !== "string" || injection.length === 0)) {
    throw new Error("ordered-image test injection must be a nonempty string or null");
  }
  const directory = await mkdtemp(join(tmpdir(), "era8-10-three-"));
  let handedOff = false;
  try {
  const installed = fileURLToPath(
    import.meta.resolve("three/examples/jsm/exporters/GLTFExporter.js"),
  );
  const before = await readFile(installed);
  const installedExporterSha256 = createHash("sha256").update(before).digest("hex");
  const source = before.toString("utf8");
  const unordered = `\t\t\t\tpending.push(

\t\t\t\t\tgetToBlobPromise( canvas, mimeType )
\t\t\t\t\t\t.then( blob => writer.processBufferViewImage( blob ) )
\t\t\t\t\t\t.then( bufferViewIndex => {

\t\t\t\t\t\t\timageDef.bufferView = bufferViewIndex;

\t\t\t\t\t\t} )

\t\t\t\t);`;
  const ordered = `\t\t\t\tconst previousImageTask = writer.__orderedImageTask || Promise.resolve();
\t\t\t\tconst imageTask = previousImageTask
\t\t\t\t\t.then( () => getToBlobPromise( canvas, mimeType ) )
\t\t\t\t\t.then( blob => writer.processBufferViewImage( blob ) )
\t\t\t\t\t.then( bufferViewIndex => {

\t\t\t\t\t\timageDef.bufferView = bufferViewIndex;

\t\t\t\t\t} );
\t\t\t\twriter.__orderedImageTask = imageTask;
\t\t\t\tpending.push( imageTask );`;
  const orderedForTest = injection === null
    ? ordered
    : ordered.replace(
        "\t\t\t\tconst imageTask = previousImageTask",
        `${injection}\n\t\t\t\tconst imageTask = previousImageTask`,
      );
  if (injection !== null && orderedForTest === ordered) {
    throw new Error("ordered-image injection anchor missing");
  }
  const at = source.indexOf(unordered);
  if (at < 0 || source.indexOf(unordered, at + unordered.length) >= 0) {
    await rm(directory, { recursive: true, force: true });
    throw new Error("GLTFExporter ordered-image anchor missing or ambiguous");
  }
  const exporterModule = join(directory, "GLTFExporter.js");
  const entry = join(directory, "entry.js");
  const bundle = join(directory, "bundle.js");
  await writeFile(
    exporterModule,
    `${source.slice(0, at)}${orderedForTest}${source.slice(at + unordered.length)}`,
    "utf8",
  );
  await writeFile(entry, [
    'import * as THREE from "three";',
    'import { GLTFExporter } from "./GLTFExporter.js";',
    'import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";',
    'import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";',
    "globalThis.__gridworkBundle={THREE,GLTFExporter,GLTFLoader,mergeGeometries};",
  ].join("\n"), "utf8");
  await execFileAsync(join(ROOT, "node_modules/.bin/esbuild"), [
    entry, "--bundle", "--format=iife", `--outfile=${bundle}`, "--log-level=warning",
  ], { env: { ...process.env, NODE_PATH: join(ROOT, "node_modules") } });
  if (!Buffer.from(await readFile(installed)).equals(before)) throw new Error("installed GLTFExporter changed");
  handedOff = true;
  return {
    path: bundle,
    installedExporterSha256,
    dispose: () => rm(directory, { recursive: true, force: true }),
  };
  } finally {
    if (!handedOff) await rm(directory, { recursive: true, force: true });
  }
}
```

Every caller wraps `dispose()` in `finally`, passes `installedExporterSha256` into
`ExportOneOptions`, and copies it to `ExportOneResult`. `buildMetadata` rejects outputs whose
hashes differ, then emits the one agreed value as `orderedImages.installedExporterSha256`.
Mutations swap the resolved installed bytes, omit the option/result handoff, or disagree one
output; each must fail its final metadata assertion. Reverse-completion injection delays blobs but
hashes remain equal.

- [ ] **Step 4: Bake/signature-merge and create a real tagged Scene**

World-bake clones, full signature, transparent separation, identity root. Inside page helper:

```js
function makeTaggedExportScene(THREE, payload, bakedRoot) {
  const scene = new THREE.Scene();
  scene.userData.gridworkLateEraAsset = {
    schema: 1, sourceSha256: payload.sourceSha256,
    era: payload.runtimeEra, sourceKey: payload.definition,
    stage: payload.stage, basename: payload.seedInput,
  };
  for (const child of [...bakedRoot.children]) scene.add(child);
  return scene;
}
```

The Node caller passes `{sourceSha256: SOURCE_CONTRACT.sha256, runtimeEra, definition, stage, seedInput}` as the explicit `page.evaluate` payload. The browser callback closes over no Node/imported constant. Add a mutation that references `SOURCE_CONTRACT` inside the callback; Playwright raises `ReferenceError` and the closure-independence test fails before export. Pass this Scene to exporter. Capture one transport per source material identity, complete toon/unlit/map/render fields, RGBA texels, and node order.

- [ ] **Step 5: Implement static GLB and metadata validation**

Validate framing, exact path/Scene tag, finite coherent geometry, indices/attributes/normals/UVs/images/samplers, semantic counts, colors, unlit/order, triangle equality, mesh nonincrease, no external URI/camera/light/animation/skin/morph/Draco/meshopt, no page warning/error/request/pending async. Stable metadata rejects timestamp, absolute path, PID, hostname, browser profile, unordered keys/rows.

- [ ] **Step 6: Verify green/mutations**

```bash
npx vitest run --config vitest.era8-10-exporter.config.ts -t "ordered image|real Scene|geometry|semantic|GLB"
npm run typecheck
```

Run atomic IDs `EXP001`–`EXP062`; `EXP010` tag-Group must fail raw Scene and loader-root assertions.

- [ ] **Step 7: Conditional checkpoint**

Use the exact Task 3 checkpoint block only when authorized; otherwise retain uncommitted.

## Task 4: Owned Staging, Manifest-Last Promotion, and Repair

**Files:** Modify exporter/declarations/safety test; create one interruption fixture child.

**Interfaces:** Produces `DestinationLock`, `PublicationPlan`, `acquireDestinationLock`,
`releaseDestinationLock`, `promoteManifestLast`, `validateProductionManifest`, and
`repairIncompleteLateEraOutput`.

**Dependencies:** Task 3.

- [ ] **Step 1: Write focused reds**

Create an 88-path fixture. Prove a unique `mkdtemp` stage holds all generated outputs before the
lock attempt and is disposed on lock contention and lock-release errors; a pre-existing
`O_CREAT|O_EXCL` destination lock refuses with zero writes; release rejects changed nonce/inode;
metadata is renamed after all GLBs; normal check/use rejects absent/malformed metadata, wrong
census, missing files, extras, symlinks, wrong types, and hash mismatch. Interrupt `N=0..87` and
prove refusal with the lock retained; the owner/interruption fixture alone relinquishes it before
repair. The complete `N=88` fixture passes. Expected red:
`exporter.acquireDestinationLock is not a function`.

- [ ] **Step 2: Implement owned staging and the simple lock**

Every invocation creates one `mkdtemp(join(tmpdir(), "era8-10-stage-"))` root, exclusively
writes/validates all outputs there, and removes it in an outer `finally`. Acquire the destination
lock only after validation with `O_CREAT|O_EXCL`; its payload is `{ nonce, pid: process.pid,
mode: "promotion" }`. Existing lock means immediate refusal. The nested `finally` releases a
held lock, while the outer `finally` always disposes the stage even if acquisition or release
fails. Release only after matching nonce/device/inode reread. Do not implement waiting, PID
liveness, stale deletion, takeover, marker, or any automatic owner handoff.

`expectedReleaseOwnedPaths(jobs)` is the sole frozen exporter-publication predicate. It returns
the sorted 87 `job.relativeFile` paths plus
`building-sources/era-08-10-gridwork-export-metadata.json`, rooted respectively under
`apps/web/src/city/art/models` and `apps/web/src/city/art`. The distinct post-publication source
path is `apps/web/src/city/art/era8To10AssetManifest.generated.ts`; it is not one of the 88
exporter-publication paths. `classifyReleaseOwnedPaths` recursively `lstat`s the models and
building-sources roots and individually `lstat`s that generated path, then classifies each entry
as follows:

```ts
function tempSiblingFor(relativePath: string, nonce: string): string {
  return `${dirname(relativePath)}/.${basename(relativePath)}.era8-10-${nonce}.tmp`;
}
```

Exact expected files are owned; a regular file matching that exact temp-sibling grammar for one
expected path is a temporary; any symlink or non-file at an expected path fails. The generated
path is recorded as `generated-manifest` only when regular; a symlink/wrong type fails. Any other
entry whose basename begins an expected GLB stem or the fixed metadata stem, or a malformed
sibling temporary, is `unknown-candidate` and fails. Every other prior-era file is `unrelated`
and remains legal. Tests inject one member of every class, including an unrelated prior GLB floor,
to prove the classifier is neither empty nor a whole-root count. The generator validator accepts
`generatedManifest` only after N=88 and compares its normalized literal import census to metadata;
at N=0 or N=1..87 it is stale and repair deletes exactly that path.

- [ ] **Step 3: Promote metadata last and implement repair**

For every GLB, write a nonce-owned destination-local temporary sibling with exclusive create,
file-fsync it, verify its staged hash immediately before rename, rename it, then fsync its parent
directory. Write the complete metadata manifest by the same mechanism **last**. Each final
assertion has its own `TX013`–`TX018` mutation. Normal check/runtime calls
`classifyReleaseOwnedPaths`, validates its exact 87 release-owned sorted GLBs and metadata hashes,
permits only its reported `unrelated` files, and rejects `unknownCandidates`, malformed temp
siblings, missing paths, symlinks, and wrong types.
`--repair-incomplete-late-era-output` refuses when locked and has separate lock/symlink/path-escape
mutations (`TX019`–`TX021`); it removes only the immutable release-owned 87 GLB paths, metadata
path, and exact nonce-owned siblings returned by `classifyReleaseOwnedPaths` after
containment/no-symlink checks. Any `unknown-candidate` makes repair refuse rather than widening
the deletion set. Repair also removes only the exact generated
`apps/web/src/city/art/era8To10AssetManifest.generated.ts` path when present, then Task 11
regenerates it after N=88 validation. Never wildcard-delete or touch Era 1–7 paths.

- [ ] **Step 4: Prove every interruption boundary**

Inject after each incomplete promoted count `N=0..87`. Ordinary check/use must refuse and abrupt
exit must retain the lock; only the owner/interruption fixture may remove or relinquish it before
repair. Repair removes only the whitelist; clean regeneration reproduces all hashes; and an Era
1–7 sentinel hash remains identical. `N=88` includes the manifest and must pass ordinary
check/use.

- [ ] **Step 5: Verify green and mutations**

```bash
npx vitest run --config vitest.era8-10-exporter.config.ts -t "owned stage|destination lock|manifest last|repair|interruption"
npm run typecheck
```

Expected: `N=0..87` refuse and `N=88` passes. Run `TX001`–`TX021`, `RND001`–`RND004`, and
`P000`–`P088`, restoring each red.

- [ ] **Step 6: Conditional checkpoint**

Use the exact Task 4 block under **Conditional Checkpoint Commands** only when authorized;
otherwise retain uncommitted.

## Task 5: CLI, Scratch Checks, and Owned Custom Output

**Files:** Modify exporter/declarations/safety test.

**Interfaces:** Produces `parseArgs`, `assertSafeCustomOutput`, and `runOwnedScratchCheck`.

**Dependencies:** Task 4.

- [ ] **Step 1: Write focused reds**

Unknown, duplicate, empty, and contradictory flags write zero files. Check/no-seed run only in
owned scratch roots and read production only. Custom output requires a caller-supplied
non-existent child under an invocation-owned `mkdtemp` parent; exporter-created roots return
inode/nonce ownership handles and clean on every failure. Comparison owns and cleans its internal
scratch root. Expected red:
`exporter.parseArgs is not a function`.

- [ ] **Step 2: Implement modes and containment**

Support production, `--check`, `--check --no-seed`, `--out <non-existent-child>`, `--comparison`,
and `--repair-incomplete-late-era-output`. The command first creates
its owned parent with `mkdtemp`; exporter creates the child passed to `--out` and records its
inode/nonce ownership handle. Reject other combinations before any write. Reject lexical/physical
traversal, production/source/metadata containment, symlinked ancestors/destinations, nonregular
targets, and existing custom roots.

- [ ] **Step 3: Implement scratch-only checks**

`--check` stages and validates in its owned root, then compares production read-only.
`--check --no-seed` compares seeded/unseeded sets entirely in that root. Both use `finally`
cleanup and never acquire the publication lock or make a production-side temporary.

- [ ] **Step 4: Verify green and mutations**

```bash
npx vitest run --config vitest.era8-10-exporter.config.ts -t "CLI|scratch|custom safety|read-only check"
npm run typecheck
```

Expected: invalid flags, symlinks, traversal, existing custom roots, and output escapes fail.

- [ ] **Step 5: Conditional checkpoint**

Use the exact Task 5 block under **Conditional Checkpoint Commands** only when authorized;
otherwise retain uncommitted.

## Task 6: Runtime Manifest Guard and Release Boundary

**Files:** Modify exporter safety/building tests, `scripts/export-era8-10-building-models.d.mts`,
`test/support/era8To10ExporterCrashChild.mjs`; create `scripts/generate-era8-10-asset-manifest.mjs`, its
adjacent `.d.mts`, `test/generateEra8To10AssetManifest.test.ts`, and
no browser manifest test. Task 11 creates
`apps/web/src/city/art/era8To10AssetManifest.generated.ts` and wires its
`buildingAssets.ts`, `civicBuildings.ts`, and `townHall.ts` consumers plus
`apps/web/src/city/era8To10AssetManifest.browser.test.tsx` after complete output exists.

**Interfaces:** Consumes `validateProductionManifest`; produces fail-closed runtime/check guards
and release-scope assertions.

**Dependencies:** Tasks 4–5.

- [ ] **Step 1: Write manifest/runtime reds**

A missing GLB, extra path, symlink/wrong type, changed hash, wrong row count, or absent metadata
rejects late-era registration and check by named path. The initial no-output state is generation-
permitted but keeps registration tests red; a partial local tree cannot satisfy the Node preflight,
check, build, ordinary-main, or NUL-safe release gate.

- [ ] **Step 2: Implement and verify guards**

The Node/build/CI validator recursively enumerates the actual flat models root and its Town Hall
subdirectory, classifies candidates, and hashes exactly the 87 release-owned GLBs plus metadata.
It permits unrelated prior-era GLBs, but rejects an unknown expected-stem path, malformed nonce
sibling temporary, symlink, or wrong-type release candidate. The Vite static registry imports/globs prove
registered URLs resolve at build; browser code never claims to hash local assets. Use the Node
validator for Task 11 ordinary main, runtime registration, `--check`, and build invariants.

Task 6 creates and tests, but does not invoke against production, the generator
`generateEra8To10AssetManifest(metadata, jobs)` in
`scripts/generate-era8-10-asset-manifest.mjs`. Its `.d.mts` exports
`BrowserAssetManifestInput`, `BrowserAssetManifest`, `generateEra8To10AssetManifest`, and
`writeEra8To10AssetManifest`. The input requires complete validated N=88 metadata and jobs;
the generator normalizes POSIX relative paths, rejects duplicate/non-sorted/mismatched metadata
rows, and requires sorted equality with `expectedReleaseOwnedPaths(jobs).filter(isGlb)`.

The generator declaration and implementation share one renderer:

```ts
export interface BrowserAssetManifestInput {
  readonly metadata: MetadataDocument;
  readonly jobs: readonly ExportJob[];
}
export interface BrowserAssetManifest {
  readonly schema: 1;
  readonly files: readonly string[];
  readonly urls: Readonly<Record<string, string>>;
  readonly census: 87;
}
export function renderEra8To10AssetManifest(input: BrowserAssetManifestInput): string;
export function generateEra8To10AssetManifest(
  input: BrowserAssetManifestInput,
): BrowserAssetManifest;
export function writeEra8To10AssetManifest(
  input: BrowserAssetManifestInput,
  outputPath: string,
): Promise<void>;
```

`renderEra8To10AssetManifest` is the only producer of the generated TS text: production writing,
the type-valid browser-red fixture, generator-unit tests, and the URL-removal mutation all call it.
Tests assert the renderer includes exactly the four exported symbols and 87 literal URL imports,
so neither fixture can hand-author a divergent module.

It writes only
`apps/web/src/city/art/era8To10AssetManifest.generated.ts`, whose concrete browser surface is:

```ts
export const ERA8_TO10_ASSET_SCHEMA = 1 as const;
export const ERA8_TO10_ASSET_FILES = [/* 87 normalized literal paths */] as const;
export const ERA8_TO10_ASSET_URLS = {
  "fun-4-site.glb": fun4SiteUrl, // each URL has a generated static literal ?url import
  // ...
} as const satisfies Record<(typeof ERA8_TO10_ASSET_FILES)[number], string>;
export const ERA8_TO10_ASSET_CENSUS = 87 as const;
```

Every generated `?url` import is a static literal relative to `art/`, so Vite resolves it at
build; the file exports path/URL census only, never a cryptographic browser claim. Task 6's Node
test exercises generator rejection in a disposable root and asserts the real generated TS is
absent. Task 11 creates/runs the browser static-import test only after the real generated TS
exists. Task 11 runs
`node scripts/generate-era8-10-asset-manifest.mjs --metadata <validated-N88-metadata>
--out apps/web/src/city/art/era8To10AssetManifest.generated.ts`, then the three runtime consumers
import it and Node guard compares it to metadata. Repair deletes this stale generated TS before
regenerating only after N=88 validation. `npm run check:era8-10-models`,
`npm run build -w @cr/web`, and the invariant workflow run both seams.

The Node validator never imports `era8To10AssetManifest.generated.ts`, so it never evaluates a
Vite-only `.glb?url` module. `parseEra8To10AssetManifestSource(sourceText)` reads the generated
TS as text, extracts the four export declarations, every static literal `?url` import, and the
URL mapping keys/values, then compares normalized files/census/keys to validated metadata and
`renderEra8To10AssetManifest(input)`. It rejects a missing, duplicate, nonliteral, or mismatched
URL mapping. The browser test is the only seam that imports the module under Vite.

- [ ] **Step 3: Verify green**

First run the generator unit command while
`scripts/generate-era8-10-asset-manifest.mjs` is absent; expected red is
`ERR_MODULE_NOT_FOUND` naming that script. Create the generator and its `.d.mts`, then rerun the
same command green:

```bash
npx vitest run --config vitest.era8-10-exporter.config.ts -t "manifest guard|release scope"
npm test -w @cr/web -- src/city/era8To10BuildingModels.test.ts
npx vitest run --config vitest.config.ts \
  test/generateEra8To10AssetManifest.test.ts --testTimeout=30000
npm run typecheck
```

`test/generateEra8To10AssetManifest.test.ts` is collected only by the root
`vitest.config.ts` repo-hygiene project (`test/**/*.test.ts`), so a workspace command would miss
it. Task 11's browser file retains the `.browser.test.tsx` suffix: the root browser config's web
project includes `apps/web/src/**/*.browser.test.tsx` and supplies React,
`browserGlobalDefine`, Chromium, and its 300-second connect timeout. Task 6 does not add a
package script or workflow command that references the unavailable browser seam; Task 11 adds
those only after the generated module and browser test exist.

Expected: the Node generator test collects one non-empty file, exits 0 within 30 seconds, and
leaves the real generated TS absent.

- [ ] **Step 4: Conditional checkpoint**

Use the exact Task 6 block under **Conditional Checkpoint Commands** only when authorized;
otherwise retain uncommitted.

## Task 7: Strict Runtime Restoration on Synthetic Tagged Scenes

**Files:** Create adapter and unit test.

**Interfaces:** Produces `isLateEraGridworkAsset`, `restoreLateEraGridworkMaterials`, and node-only restoration.

**Dependencies:** Task 3; may parallel Task 4.

- [ ] **Step 1: Write malformed/type/sharing reds**

Synthetic Scene fixtures cover untagged untouched, valid toon/unlit/map/order, malformed schema/enum/gradient/map/render field no partial mutation, source-sharing, gradient/map cache conflicts, order 3, anisotropy 8. Expected module missing.

- [ ] **Step 2: Implement strict two-pass validation**

Validate all Scene/material/node extras into immutable plan before mutation. Explicit enum maps only; errors name basename/material/field.

- [ ] **Step 3: Implement caches/restoration**

Module caches gradients by complete stable record and base maps by loaded texture identity+record; root WeakMap idempotence:

```ts
const gradientCache = new Map<string, THREE.DataTexture>();
const baseMapCache = new WeakMap<THREE.Texture, Map<string, THREE.Texture>>();
const restoredRoots = new WeakMap<THREE.Object3D, GridworkRestoreResult>();

function gradientFor(record: NonNullable<GridworkMaterialExtras["gradient"]>): THREE.DataTexture {
  const key = stableRecord(record);
  const cached = gradientCache.get(key);
  if (cached) return cached;
  const texture = new THREE.DataTexture(
    new Uint8Array(record.texels.flat()),
    3, 1, enumFormat(record.format), enumType(record.type),
  );
  applyTextureState(texture, record);
  texture.needsUpdate = true;
  gradientCache.set(key, texture);
  return texture;
}

export function restoreLateEraGridworkMaterials(root: THREE.Object3D): GridworkRestoreResult {
  const cached = restoredRoots.get(root);
  if (cached) return cached;
  const plan = validateCompleteRoot(root); // returns null only when the Scene tag is absent
  if (plan === null) return { tagged: false, restoredMaterials: 0, restoredRenderOrders: 0 };
  const replacements = new Map<THREE.Material, THREE.Material>();
  for (const row of plan.materials) {
    replacements.set(row.transport, restoreRecordedMaterial(row, gradientFor, baseMapCache));
  }
  for (const row of plan.meshes) {
    row.mesh.material = row.materials.map((material) => replacements.get(material) as THREE.Material);
    if (!row.wasArray) row.mesh.material = row.mesh.material[0] as THREE.Material;
  }
  for (const row of plan.orders) row.object.renderOrder = row.order;
  const result = {
    tagged: true,
    restoredMaterials: replacements.size,
    restoredRenderOrders: plan.orders.length,
  } as const;
  restoredRoots.set(root, result);
  return result;
}
```

`validateCompleteRoot`, `restoreRecordedMaterial`, `stableRecord`, enum resolvers, and `applyTextureState` are private typed functions in the same file; each is unit-tested directly through malformed records. Build exact 12-byte DataTexture and leave requested anisotropy un-clamped. One Toon/Basic per transport; sharing and node order are preserved.

- [ ] **Step 4: Prove loader-root tag/lifecycle**

In-memory Scene export/load restores `gltf.scene.userData`, classes/fields, source Canvas vs runtime Data texture equivalence, cache identity, no constructor/clone after preparation, capability 1/4/16→1/4/8.

- [ ] **Step 5: Verify/mutate**

```bash
npm test -w @cr/web -- src/city/three/lateEraGridworkMaterial.test.ts
npm run typecheck
```

Run `RUN001`–`RUN009`.

- [ ] **Step 6: Conditional checkpoint**

Use the exact Task 7 checkpoint block only when authorized; otherwise retain uncommitted.

## Task 8: Preparation Seams, Exact Fade, Winter Classes, and Ghost Policy

**Files:** Create `modelPreparation.ts`/test; modify Placed/Thumb/Ghost/winter and tests; create live/ghost tests.

**Interfaces:** Produces pure `prepareGridworkModel`, `PLACED_PREPARATION`, `THUMB_PREPARATION`, `GHOST_PREPARATION`, `bindFadeMaterials`, and `applyFade`; consumes Task 7.

**Dependencies:** Task 7.

- [ ] **Step 1: Write mounted reds**

Synthetic Vertical Farm: 0.34 settled, 0.5→0.17, out/back 0.34, `fade=0.9995` remains transient, authored depth/blending, reduced/animated, zero frame allocation. Fair→winter→fair preserves Toon/Basic/maps/gradient/sampler/state and tints unlit. Ghost one Standard/order3/no shadows; placed both shadows. Expected current behavior failures.

`modelPreparation.test.ts` injects spies and asserts PlacedModelStack/Town Hall use `PLACED_PREPARATION`, BuildingThumb uses `THUMB_PREPARATION`, GridworkModelPreview reaches the seam through `prepareModel`, Ghost uses `GHOST_PREPARATION`, and staged fidelity imports `PLACED_PREPARATION`.

- [ ] **Step 2: Integrate adapter before old revival**

Create:

```ts
export interface GridworkPreparationOptions {
  readonly fitAndGround: boolean;
  readonly shadows: "placed" | "disabled";
  readonly materials: "restored" | "node-only";
  readonly frosted: boolean;
}
export const PLACED_PREPARATION = {
  fitAndGround: true, shadows: "placed", materials: "restored", frosted: false,
} as const;
export const THUMB_PREPARATION = {
  fitAndGround: false, shadows: "disabled", materials: "restored", frosted: false,
} as const;
export const GHOST_PREPARATION = {
  fitAndGround: true, shadows: "disabled", materials: "node-only", frosted: false,
} as const;

export function prepareGridworkModel(
  scene: THREE.Object3D,
  footprint: Footprint | null,
  options: GridworkPreparationOptions,
): THREE.Object3D {
  const root = scene.clone(true);
  const tagged = isLateEraGridworkAsset(root);
  const restored = options.materials === "restored"
    ? restoreLateEraGridworkMaterials(root)
    : { tagged,
        restoredMaterials: 0, restoredRenderOrders: 0 };
  if (options.materials === "node-only" && tagged) restoreLateEraGridworkNodeMetadata(root);
  if (options.fitAndGround) {
    if (!footprint) throw new Error("fitAndGround requires a footprint");
    // This is the current Era 1–7 geometry branch verbatim: X/Z contain-fit,
    // then the existing Y-only cap, then grounding. Tagged strictness only
    // replaces the cap's mutation with a failure.
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    root.scale.setScalar(footprintFitScale(size.x, size.z, footprint));
    const sized = new THREE.Box3().setFromObject(root);
    const height = sized.max.y - sized.min.y;
    if (height > MAX_BUILD_HEIGHT) {
      if (restored.tagged) throw new Error("late-era model would activate MAX_BUILD_HEIGHT");
      root.scale.y *= MAX_BUILD_HEIGHT / height;
    }
    const grounded = new THREE.Box3().setFromObject(root);
    root.position.set(
      -(grounded.min.x + grounded.max.x) / 2,
      -grounded.min.y,
      -(grounded.min.z + grounded.max.z) / 2,
    );
  }
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = options.shadows === "placed";
    mesh.receiveShadow = options.shadows === "placed";
    // Preserve the old outer `!frosted` branch exactly for untagged assets.
    if (!options.frosted) {
      if (!restored.tagged && options.materials === "restored") {
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(reviveMaterial)
          : reviveMaterial(mesh.material);
      }
    }
  });
  if (options.frosted) applyFrost(root);
  return root;
}
```

`prepareModel` delegates to this seam with `{...PLACED_PREPARATION,frosted}`. Town Hall uses PlacedModelStack→same seam. Gridwork preview uses `prepareModel`. BuildingThumb uses `THUMB_PREPARATION`. Ghost uses `GHOST_PREPARATION` before its app-material override. Task 10 staged fidelity calls `PLACED_PREPARATION`.

Before replacing `prepareModel`, copy its current body unchanged into the test-only
`legacyPrepareUntagged` fixture. `preparedState` serializes root scale/position/bounds,
cast/receive flags, material UUID sharing, class, flat-shading, emissive intensity, and
all frost fields:

```ts
for (const fixture of [eraOneScene, eraSevenScene, overHeightUntaggedScene]) {
  for (const frosted of [false, true]) {
    const expected = preparedState(
      legacyPrepareUntagged(fixture(), FOOTPRINT, frosted),
    );
    const actual = preparedState(prepareGridworkModel(
      fixture(), FOOTPRINT, { ...PLACED_PREPARATION, frosted },
    ));
    expect(actual, `${fixture.name}/${frosted ? "frosted" : "fair"}`)
      .toStrictEqual(expected);
  }
}
expect(preparedHeight(prepareGridworkModel(
  overHeightUntaggedScene(), FOOTPRINT, PLACED_PREPARATION,
))).toBeCloseTo(MAX_BUILD_HEIGHT, 8);
expect(() => prepareGridworkModel(
  overHeightTaggedScene(), FOOTPRINT, PLACED_PREPARATION,
)).toThrow("late-era model would activate MAX_BUILD_HEIGHT");
```

`legacyPrepareUntagged`, `preparedState`, `preparedHeight`, and the four fixture
constructors are fully defined in `modelPreparation.test.ts`; the legacy fixture is the
exact lines 115–159 body read from this baseline, not a call back into the new seam.
Register and run `PREP001`, `PREP002`, `PREP003`, and `PREP004` only after
`modelPreparation.ts` exists. Run one mutation at a time; each must fail its named final
assertion in this test (respectively the untagged height assertion, the exact untagged-state
equality after cap-and-ground ordering, the frosted equality, and the fair equality), then
restore the source and rerun green. These four records participate in Task 16's canonical
registry set-equality/count proof; no generic runtime mutation substitutes for them.
Tagged late-era rejection is a separate assertion and cannot alter untagged results.

- [ ] **Step 3: Implement exact fixed fade**

```ts
export function bindFadeMaterials(root: THREE.Object3D): readonly FadeMaterialBinding[] {
  const seen = new Set<THREE.Material>();
  const rows: FadeMaterialBinding[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (seen.has(material)) continue;
      seen.add(material);
      rows.push({
        material, baseOpacity: material.opacity, baseTransparent: material.transparent,
        baseDepthTest: material.depthTest, baseDepthWrite: material.depthWrite,
        baseColorWrite: material.colorWrite, baseBlending: material.blending,
      });
    }
  });
  return rows;
}
export function applyFade(rows: readonly FadeMaterialBinding[], fade: number): void {
  for (const row of rows) {
    row.material.opacity = row.baseOpacity * fade;
    const transparent = fade < 1 ? true : row.baseTransparent;
    if (row.material.transparent !== transparent) {
      row.material.transparent = transparent;
      row.material.needsUpdate = true;
    }
  }
}
```

Only transparency boundary toggles `needsUpdate`; no traversal/allocation/depth rewrite.

- [ ] **Step 4: Extend frost/ghost**

One identity map per frost root; Standard/Toon/Basic class-specific writes. Ghost calls node-only adapter then existing shared override.

- [ ] **Step 5: Verify/mutate**

```bash
npm test -w @cr/web -- \
  src/city/three/modelPreparation.test.ts \
  src/city/three/lateEraLiveMaterials.test.tsx \
  src/city/three/lateEraGhostMaterials.test.ts \
  src/city/three/winterFrost.test.ts
npm run typecheck
```

Run `PREP001`–`PREP004` and `RUN011`–`RUN020`, including the `<0.999`
mutation at its intended final line.

- [ ] **Step 6: Conditional checkpoint**

Use the exact Task 8 checkpoint block only when authorized; otherwise retain uncommitted.

## Task 9: Pure Registry/Dressing Data Without Eager URL Claims

**Files:** Create `era8To10RegistryPlan.ts`; modify building-model test.

**Interfaces:** Produces exact skill rows/dressings/Hall basenames and catalogue-filter function; does not modify production registries.

**Dependencies:** Task 6. It is not parallel with Task 6 because both change
`apps/web/src/city/era8To10BuildingModels.test.ts`.

- [ ] **Step 1: Write pure-data reds**

Require 24 exact node/handle/mass/subtitle rows, three hub subtitles/Hall basenames, four catalogue-derived IDs per late era, no display identity, and zero availability function calls. Expected module missing.

- [ ] **Step 2: Add exact data**

Declare all 24 rows:

```ts
export const LATE_ERA_SKILL_BUILDINGS = {
  atomic_age: {
    "FUN.4":["Assembly Hall","hall","the Weather Office"], "LF.1":["Assembly Hall","hall","the Telephone Exchange"],
    "FUN.6":["Store","store","the Radio Workshop"], "FUN.5":["Workshop","workshop","the Wind Tunnel"],
    "FUN.9":["Dwellings","dwelling","the Housing Blocks"], "LF.2":["Workshop","workshop","the Electronics Works"],
    "LF.3":["Store","store","the Nuclear Weapons Facility"], "FUN.10":["Commons","yard","the Power Station"],
    "LF.4":["Tower","tower","the Cooling Tower"],
  },
  information_age: {
    "EL.1":["Assembly Hall","hall","the Data Centre"], "EL.2":["Tower","tower","the Office Tower"],
    "EL.3":["Workshop","workshop","the Chip Factory"], "EL.4":["Store","store","the Research Lab"],
    "EL.5":["Dwellings","dwelling","the Glass Apartments"], "EL.6":["Commons","yard","the Air Force Base"],
  },
  cyberpunk: {
    "TRG.1":["Commons","yard","the Neon Plaza"], "TRG.2":["Workshop","workshop","Drone Command"],
    "TRG.3":["Assembly Hall","hall","the Hologram Theatre"], "TRG.4":["Tower","tower","the Signal Tower"],
    "TRG.5":["Store","store","the Data Vault"], "TRG.6":["Tower","tower","the Broadcast Tower"],
    "TRG.7":["Workshop","workshop","the Robotics Lab"], "TRG.8":["Assembly Hall","hall","the Stock Exchange"],
    "TRG.9":["Dwellings","dwelling","the Quantum Core"],
  },
} as const;
```

Declare exact Hall subtitles (`the Heating Plant`, `the Headquarters`, `the Steam Vent`) and basenames. `lateEraCivicIds(catalogue,era)` filters, requires four unique rows, returns IDs.

- [ ] **Step 3: Verify/mutate**

```bash
npm test -w @cr/web -- src/city/era8To10BuildingModels.test.ts -t "registry plan"
npm run typecheck
```

Expected pure data green while production URLs remain absent. Run `REG001`–`REG006`.

- [ ] **Step 4: Conditional checkpoint**

Use the exact Task 9 checkpoint block only when authorized; otherwise retain uncommitted.

## Task 10: Candidate Generation and Every Pre-Generation Output Guard

**Files:** Modify exporter/declarations/safety/building test; create mesh/fit tests; generate one owned candidate only.

**Interfaces:** Implements real mode-aware staged fidelity before exposing scratch,
comparison-only, and owned-custom CLI paths; produces and destroys one task-owned custom
candidate 87+metadata. No-flags production and repair are intentionally unsupported/red until
Task 11 adds release preflight and destination publication. No candidate path is consumed later.

**Dependencies:** Tasks 3–9.

- [ ] **Step 1: Write all candidate guards before generation**

Tests read `ERA8_10_CANDIDATE_ROOT`, derive paths from plan and assert exact counts/paths/hashes, static GLB fields/no external, Scene/material/map/order semantics, geometry/bounds/triangles, runtime fit/no height cap, deterministic metadata/full fields/no machine data. Before generation, a fresh empty root fails `candidate output missing: fun-4-site.glb`. Production status is captured unchanged.
The no-flags invocation is also red at this task with
`default production publication is unavailable before Task 11`; no production lock, repair, or
release-owned output is created.

- [ ] **Step 2: Complete deterministic metadata**

Include source/resource/decoded/random/bare, generator/seed/ordered-image/batching/schema, exact global/per-era/category census, sorted rows with six raw/runtime/stage/seed/hash/bytes/mesh/triangle/material/map/image/color/order/bounds, aggregates and fidelity field. Add:

```js
legacyEncoding: {
  bridgeVersion: 1,
  acceptedAssignments: evaluation.legacyEncoding.acceptedLegacyEncodingAssignments,
  unsupportedAssignments: evaluation.legacyEncoding.unsupportedLegacyEncodingAssignments,
}
```

Pin the runtime object shapes as well as the declarations:

```ts
const METADATA_KEYS = [
  "aggregates", "bare", "batching", "census", "fidelity", "generator",
  "legacyEncoding", "orderedImages", "outputs", "schema", "seed",
  "semanticTransport", "source",
] as const;
const OUTPUT_KEYS = [
  "anisotropyHistogram", "baseMapCount", "bytes", "colorSpaceRoles",
  "definition", "embeddedImageCount", "era", "file", "kind", "materialCount",
  "materialSemantics", "nonDefaultRenderOrderCount", "ordinal", "runtimeEra",
  "runtimeFootprint", "runtimeId", "samplerSemanticDigest", "seed", "seedInput",
  "semanticDigest", "sha256", "shippedBounds", "shippedMeshes",
  "shippedTriangles", "sourceBounds", "sourceFootprint", "sourceMeshes",
  "sourceTriangles", "stage", "tab", "target", "textureCount", "title", "toon",
  "toonMaterialCount", "unlitMaterialCount",
] as const;
function expectExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
  label: string,
): void {
  expect(Object.keys(value).sort(), label).toEqual([...expected].sort());
}
expectExactKeys(metadata, METADATA_KEYS, "metadata top-level keys");
for (const row of metadata.outputs) {
  expectExactKeys(row, OUTPUT_KEYS, `metadata output keys: ${row.file}`);
}
```

`SourceInspection` returns required `legacyEncoding` bridge version, accepted-assignment count,
and zero unsupported-assignment count for each evaluated era. `buildDisposableThreeBundle` returns
the installed exporter SHA-256; `ExportOneResult` carries it; and `buildMetadata` receives one
`MetadataBuildInput` containing outputs, fidelity, aggregated inspection counts, and ordered-image
hash rather than reading undeclared values from closure state. Metadata tests compare accepted
count to the evaluator counter and assert `>0`; unsupported remains exactly zero; every
`ExportOneResult` hash must equal `orderedImages.installedExporterSha256`. Mutations alter bridge
version, decrement accepted count, set unsupported to one, change the exporter hash, add one
undeclared top-level key, and add one undeclared row key. Recursively reject machine keys/physical
paths and unstable order.

- [ ] **Step 3: Implement real staged fidelity before custom mode**

Write the `runStagedFidelityGate` red against synthetic staged bytes produced directly by injected Task 4 generation callbacks; no custom CLI exists yet. Then implement the disposable runtime bundle, allowlisted stage route, normalized source rendering, and `prepareGridworkModel(..., PLACED_PREPARATION)` restored rendering. Require exact 87 paths, loader-root tag, alpha exact, mean≤0.5, p99≤2, Vertical Farm order, anisotropy, and `30*60_000` timeout.

Implement discriminated calls:

```js
const fidelityOptions = plan.mode === "comparison"
  ? { mode: "comparison", bare: false, writeShippingMetadata: false }
  : { mode: "shipping", bare: true, writeShippingMetadata: true };
const fidelity = await runStagedFidelityGate({
  ...fidelityOptions,
  stagedRoot: plan.stageRoot,
  jobs: plan.jobs,
  sourceBytes,
  pageFactory,
});
```

Comparison builds source with `bare=false`, writes no metadata, takes no destination lock, and has
no publication branch. Owned custom shipping builds source with `bare=true`, writes truthful
custom metadata, and is published only through its ownership handle. Destination publication
cannot begin in Task 10.

- [ ] **Step 4: Wire non-production CLI only after fidelity is green**

```js
export async function main(argv = process.argv.slice(2), deps = NODE_DEPENDENCIES) {
  const mode = parseArgs(argv);
  const sourceBytes = await deps.io.readFile(SOURCE);
  assertCanonicalSource(sourceBytes);
  const jobs = deriveExportJobs(ERA_PLANS);
  if (mode.mode === "check" || mode.mode === "no-seed") {
    return runOwnedScratchCheck({ mode: mode.mode, repositoryRoot: ROOT, jobs, ...deps });
  }
  if (mode.mode === "production" || mode.mode === "repair") {
    throw new Error("default production publication is unavailable before Task 11");
  }
  if (mode.mode === "comparison") {
    return runOwnedComparisonScratch({ repositoryRoot: ROOT, jobs, sourceBytes, ...deps });
  }
  const custom = await assertSafeCustomOutput(mode.out, ROOT, deps.io);
  try {
    const stage = await createValidatedOwnedStage({ mode, sourceBytes, jobs, ...deps });
    try {
      return await publishOwnedCustomOutput(
        { mode: "custom", entries: stage.entries, metadata: stage.metadata, destination: custom },
        deps,
      );
    } finally { await stage.dispose(); }
  } catch (error) {
    await custom?.dispose();
    throw error;
  }
}
```

Task 10 has no destination lock or default publication path. Custom output creates its own
`--out` child beneath an invocation-owned `mkdtemp` parent, publishes through
`publishOwnedCustomOutput`, and uses its ownership handle for failure cleanup. `--out` writes
87+metadata; comparison uses `runOwnedComparisonScratch`, writes 87 bare-false GLBs and no
metadata only inside scratch, and disposes that root. An explicit successful caller path alone
retains custom output. The no-flags command is a required red (`default production publication is
unavailable before Task 11`).

- [ ] **Step 5: Generate, verify, reproduce, and clean one owned candidate**

Run in one shell so ownership/cleanup cannot cross tasks:

```bash
set -euo pipefail
candidate_parent="$(mktemp -d "${TMPDIR:-/tmp}/cr-era8-10-task10.XXXXXX")"
repeat_parent="$(mktemp -d "${TMPDIR:-/tmp}/cr-era8-10-task10-repeat.XXXXXX")"
candidate="$candidate_parent/output"
repeat="$repeat_parent/output"
trap 'rm -rf "$candidate_parent" "$repeat_parent"' EXIT
candidate_digest() {
  node --input-type=module - "$1" <<'NODE'
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
const root = process.argv[2];
const metadataBytes = await readFile(join(root, "era-08-10-gridwork-export-metadata.json"));
const metadata = JSON.parse(metadataBytes.toString("utf8"));
if (metadata.outputs.length !== 87) throw new Error("candidate metadata is not 87 rows");
const digest = createHash("sha256").update(metadataBytes);
for (const row of [...metadata.outputs].sort((a, b) => a.file.localeCompare(b.file))) {
  const bytes = await readFile(join(root, row.file));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== row.sha256 || bytes.byteLength !== row.bytes) {
    throw new Error(`candidate metadata mismatch: ${row.file}`);
  }
  digest.update(row.file).update("\0").update(bytes);
}
console.log(digest.digest("hex"));
NODE
}
if ERA8_10_CANDIDATE_ROOT="$candidate" npm test -w @cr/web -- \
  src/city/era8To10BuildingModels.test.ts \
  src/city/era8To10MeshBudget.test.ts \
  src/city/era8To10ModelFit.test.ts; then
  echo "expected the empty candidate red" >&2
  exit 1
fi
node scripts/export-era8-10-building-models.mjs --out "$candidate"
ERA8_10_CANDIDATE_ROOT="$candidate" npm test -w @cr/web -- \
  src/city/era8To10BuildingModels.test.ts \
  src/city/era8To10MeshBudget.test.ts \
  src/city/era8To10ModelFit.test.ts
npm run typecheck
first_digest="$(candidate_digest "$candidate")"
node scripts/export-era8-10-building-models.mjs --out "$repeat"
second_digest="$(candidate_digest "$repeat")"
test "$first_digest" = "$second_digest"
```

Expected source/census/87+metadata exporter-owned custom output, candidate guards green, and two
distinct owned roots with exact matching 88 paths. Trap removes both parents. Production status
before/after is identical.

- [ ] **Step 6: Mutate disposable copies**

Within the same owned root, run `EXP024`–`EXP062` and `CND001`–`CND006`; restore and rerun green before trap cleanup.

- [ ] **Step 7: Conditional checkpoint**

Use the exact Task 10 checkpoint block only when authorized; never stage the candidate; otherwise retain uncommitted.

## Task 11: Owned Release Regeneration, Staged Fidelity, Comparison Acceptance, and Final Promotion

**Files:** Modify exporter production dispatch/safety plus registries/dressing/preview and actual population/current-era/preload/persistence tests; create `scripts/compare-era8-10-output-sets.mjs`,
`scripts/era8-10-release-paths.mjs`, and
`apps/web/src/city/art/era8To10AssetManifest.generated.ts` plus
`apps/web/src/city/era8To10AssetManifest.browser.test.tsx`; modify `package.json` and
`.github/workflows/invariants.yml`, `scripts/export-era8-10-building-models.mjs`,
`apps/web/src/city/era8To10ExporterSafety.test.ts`, and
`apps/web/src/city/era8To10BuildingModels.test.ts`; publish exact GLBs/metadata.

**Interfaces:** Consumes Task 10's already-green discriminated fidelity/custom stage paths. This
task owns every temp root and performs the first destination publication only after its own reds,
regeneration, fidelity, and hash comparison.

**Dependencies:** Tasks 5–10. First production write authorization point.

`scripts/era8-10-release-paths.mjs` is the frozen scope authority. It exports:

- `FULL_FEATURE_RELEASE_PATHS`: the exact 73 static feature paths below, the generated browser
  manifest, and 88 independently derived exporter-publication paths, for 162 paths;
- `TASK11_RELEASE_PATHS`: the exact 26 Task 11 static paths below, generated browser manifest,
  and 88 independently derived exporter-publication paths, for 115 paths; and
- `FINAL_PUBLISH_PATHS`: the 162 implementation paths plus exactly the approved spec and plan,
  for 164 paths; and
- `assertReleasePathSet(label, expected, observed)`, which compares complete raw sets and fails
  both a missing and an extra path by name; and
- `assertExporterPublicationPaths(paths, deriveExportJobs(ERA_PLANS))`, which independently
  derives the 87 GLBs plus metadata and rejects drift from either canonical release set.

Task 11 creates this script, and Task 16 imports the same frozen full set rather than duplicating
counts. Each scope checker has a disposable missing-path and extra-path red proof that fails by
the named Task 11 or full-scope assertion before restoration; these exercise the existing
scope-coverage record rather than adding a second mutation-ID family.

```js
export const FULL_FEATURE_STATIC_PATHS = Object.freeze([
  "apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html",
  "apps/web/src/city/era8To10ExporterTestTypes.ts",
  "apps/web/src/city/era8To10RegistryPlan.ts",
  "apps/web/src/city/era8To10MeshBudget.test.ts",
  "apps/web/src/city/era8To10ModelFit.test.ts",
  "scripts/export-era8-10-building-models.mjs",
  "scripts/export-era8-10-building-models.d.mts",
  "scripts/compare-era8-10-output-sets.mjs",
  "scripts/generate-era8-10-asset-manifest.mjs",
  "scripts/generate-era8-10-asset-manifest.d.mts",
  "scripts/era8-10-release-paths.mjs",
  "apps/web/src/city/era8To10ExporterSafety.test.ts",
  "apps/web/src/city/era8To10AssetManifest.browser.test.tsx",
  "apps/web/src/city/buildingAssets.ts",
  "apps/web/src/city/civicBuildings.ts",
  "apps/web/src/city/townHall.ts",
  "apps/web/src/city/eraDressing.ts",
  "apps/web/src/city/three/GridworkModelPreview.tsx",
  "apps/web/src/city/era8To10BuildingModels.test.ts",
  "apps/web/src/city/buildingAssets.test.ts",
  "apps/web/src/city/civicBuildings.test.ts",
  "apps/web/src/city/currentEraCivics.test.tsx",
  "apps/web/src/city/civicIdentity.currentEra.test.ts",
  "apps/web/src/city/inheritedCivics.test.ts",
  "apps/web/src/city/eraDressing.test.tsx",
  "apps/web/src/city/eraSurfaces.test.tsx",
  "apps/web/src/city/eraTwo.reachability.test.ts",
  "apps/web/src/city/three/unmappedBuilding.test.ts",
  "apps/web/src/city/three/placedBuildingPreload.test.tsx",
  "apps/web/src/city/townHall.test.ts",
  "apps/web/src/city/civicLedgerPlacement.test.ts",
  "apps/web/src/city/signedInCityPersists.test.tsx",
  "test/generateEra8To10AssetManifest.test.ts",
  "test/support/era8To10ExporterCrashChild.mjs",
  "package.json",
  ".github/workflows/invariants.yml",
  "apps/web/vitest.config.ts",
  "vitest.era8-10-exporter.config.ts",
  "apps/web/src/city/three/lateEraGridworkMaterial.ts",
  "apps/web/src/city/three/lateEraGridworkMaterial.test.ts",
  "apps/web/src/city/three/modelPreparation.ts",
  "apps/web/src/city/three/modelPreparation.test.ts",
  "apps/web/src/city/three/PlacedBuilding.tsx",
  "apps/web/src/city/three/BuildingThumb.tsx",
  "apps/web/src/city/three/GhostBuilding.tsx",
  "apps/web/src/city/three/winterFrost.ts",
  "apps/web/src/city/three/winterFrost.test.ts",
  "apps/web/src/city/three/lateEraLiveMaterials.test.tsx",
  "apps/web/src/city/three/lateEraGhostMaterials.test.ts",
  "apps/web/src/city/three/lateEraGridworkMaterialFidelity.browser.test.tsx",
  "scripts/run-era8-10-surface-mutations.mjs",
  "vitest.era8-10-surface-mutation.config.ts",
  "test/era8To10ExporterReproductionGate.test.ts",
  "apps/web/src/city/three/era8To10LearnerEvidence.browser.test.tsx",
  "vitest.era8-10-evidence.config.ts",
  "apps/web/src/vite-env.d.ts",
  "apps/web/src/city/three/cityPerformanceMetrics.tsx",
  "apps/web/src/city/three/cityPerformanceMetrics.test.tsx",
  "apps/web/src/city/three/Era8To10PerformanceHarness.tsx",
  "apps/web/src/city/three/era8To10PerformanceEntry.tsx",
  "apps/web/src/city/three/CityScene.tsx",
  "apps/web/src/city/three/placedBuildingPreload.ts",
  "apps/web/src/city/three/townHallPreload.ts",
  "scripts/era8-10-release-manifest.json",
  "scripts/rehearse-era8-10-release-rollback.mjs",
  "test/era8To10ReleaseRollback.test.ts",
  "apps/web/era8-10-performance.html",
  "apps/web/era8-10-performance.vite.config.mjs",
  "scripts/measure-era8-10-performance.mjs",
  "test/era8To10PerformanceHarness.test.ts",
  "scripts/report-era8-10-scope.mjs",
  "test/era8To10MutationCoverage.test.ts",
  "test/era8To10EvidenceCompleteness.test.ts",
]);
export const TASK11_STATIC_PATHS = Object.freeze([
  "scripts/compare-era8-10-output-sets.mjs",
  "scripts/era8-10-release-paths.mjs",
  "apps/web/src/city/era8To10AssetManifest.browser.test.tsx",
  "apps/web/src/city/buildingAssets.ts",
  "apps/web/src/city/civicBuildings.ts",
  "apps/web/src/city/townHall.ts",
  "apps/web/src/city/eraDressing.ts",
  "apps/web/src/city/three/GridworkModelPreview.tsx",
  "apps/web/src/city/buildingAssets.test.ts",
  "apps/web/src/city/civicBuildings.test.ts",
  "apps/web/src/city/currentEraCivics.test.tsx",
  "apps/web/src/city/civicIdentity.currentEra.test.ts",
  "apps/web/src/city/inheritedCivics.test.ts",
  "apps/web/src/city/eraDressing.test.tsx",
  "apps/web/src/city/eraSurfaces.test.tsx",
  "apps/web/src/city/eraTwo.reachability.test.ts",
  "apps/web/src/city/three/unmappedBuilding.test.ts",
  "apps/web/src/city/three/placedBuildingPreload.test.tsx",
  "apps/web/src/city/townHall.test.ts",
  "apps/web/src/city/civicLedgerPlacement.test.ts",
  "apps/web/src/city/signedInCityPersists.test.tsx",
  "scripts/export-era8-10-building-models.mjs",
  "apps/web/src/city/era8To10ExporterSafety.test.ts",
  "apps/web/src/city/era8To10BuildingModels.test.ts",
  "package.json",
  ".github/workflows/invariants.yml",
]);
const EXPORTER_PUBLICATION_PATHS = Object.freeze([
  ...deriveExportJobs(ERA_PLANS).map((job) => `apps/web/src/city/art/models/${job.relativeFile}`),
  "apps/web/src/city/art/building-sources/era-08-10-gridwork-export-metadata.json",
].sort());
export function assertExporterPublicationPaths(paths, jobs) {
  const independentlyDerived = [
    ...jobs.map((job) => `apps/web/src/city/art/models/${job.relativeFile}`),
    "apps/web/src/city/art/building-sources/era-08-10-gridwork-export-metadata.json",
  ].sort();
  assertReleasePathSet("independent ERA_PLANS publication set", independentlyDerived,
    EXPORTER_PUBLICATION_PATHS);
  for (const path of independentlyDerived) {
    if (!paths.includes(path)) throw new Error(`release path omits derived publication path: ${path}`);
  }
}
export const FULL_FEATURE_RELEASE_PATHS = Object.freeze([
  ...FULL_FEATURE_STATIC_PATHS,
  "apps/web/src/city/art/era8To10AssetManifest.generated.ts",
  ...EXPORTER_PUBLICATION_PATHS,
].sort());
export const TASK11_RELEASE_PATHS = Object.freeze([
  ...TASK11_STATIC_PATHS,
  "apps/web/src/city/art/era8To10AssetManifest.generated.ts",
  ...EXPORTER_PUBLICATION_PATHS,
].sort());
export const FINAL_PUBLISH_PATHS = Object.freeze([
  ...FULL_FEATURE_RELEASE_PATHS,
  "docs/superpowers/specs/2026-08-07-era-08-10-runtime-wiring-design.md",
  "docs/superpowers/plans/2026-08-07-era-08-10-runtime-wiring.md",
].sort());
```

The module asserts static counts `73/26`, independently derives and asserts 87 unique GLBs plus
one metadata path from `ERA_PLANS`, then asserts full/task/final-publish counts `162/115/164`.
Tests separately
mutate a derived job path and an actual Git-union path, so neither a copied array nor the canonical
set compared to itself can pass.

It also exports `TASK_STATIC_BY_OWNER`, a frozen record whose Task 1 entry owns the canonical
HTML/source types/exporter/safety files, Task 4 owns the crash child, Task 6 owns generator,
declaration, and unit test files, Task 9 owns the registry plan, Task 10 owns
mesh/fit tests, and Task 11 owns exporter main/safety/build-model updates, comparison, scope,
browser-manifest test, package/workflow, registry, and current-era/persistence files.
`flattenTaskFileMap(TASK_STATIC_BY_OWNER)` is independently
Set-equal to `FULL_FEATURE_STATIC_PATHS`; an injected missing map member and injected extra member
each fail their named assertion. The Task 11 map similarly derives `TASK11_STATIC_PATHS`, rather
than treating either canonical array as proof of itself.

- [ ] **Step 1: Write/run actual eager/menu/persistence reds while production files are absent**

Add exact 24 stage-family, final population/exception, 12 civic, three Hall, 27 dressing, preload, current-menu, inherited identity, late civic purchase→move→save→reload→move/one-debit, and art-outage fallback assertions.

```bash
npm test -w @cr/web -- \
  src/city/era8To10BuildingModels.test.ts src/city/buildingAssets.test.ts \
  src/city/civicBuildings.test.ts src/city/currentEraCivics.test.tsx \
  src/city/civicIdentity.currentEra.test.ts src/city/inheritedCivics.test.ts \
  src/city/eraDressing.test.tsx src/city/eraSurfaces.test.tsx \
  src/city/eraTwo.reachability.test.ts src/city/three/unmappedBuilding.test.ts \
  src/city/three/placedBuildingPreload.test.tsx src/city/townHall.test.ts \
  src/city/civicLedgerPlacement.test.ts src/city/signedInCityPersists.test.tsx
git status --short apps/web/src/city/art/models apps/web/src/city/art/building-sources
```

Expected red names `FUN.4/site`, `atomic_age_supermarket`, and `townhall-atomic-age-built.glb`; status proves late production files absent.

- [ ] **Step 2: Wire pure registry data before files**

Spread three skill maps historically, derive civic arrays/availability, add Hall basenames with stable ID, spread dressings, derive preview rows. Keep resolver/preload signatures. Update independent behavior-scoped populations and bidirectional `renaissance`/six-node exceptions; inject original recursive/cross-owned/empty defects while files are still absent. Do not import the generated browser manifest yet: its absence is required in this red state.

- [ ] **Step 3: Add default production preflight and generated manifest**

Task 11 replaces Task 10's no-flags red with the only production dispatch. Recursive shared-root
classification recognizes unrelated earlier GLBs as legal, classifies only planned late-era
namespaces and nonce sibling candidates as release-owned candidates, and returns one of:
`initial N=0`, `incomplete N=1..87`, or `complete N=88`. No-flags main permits only `N=0` to
create a fresh stage and acquire the destination lock; `N=1..87` refuses with the explicit repair
command; `N=88` validates/checks the existing release-owned set before any replacement path.
`--check` is red for N=0/incomplete and green only for N=88.

```js
const lock = await acquireDestinationLock({ destinationRoot: MODELS, mode: "promotion", io: deps.io });
try {
  await promoteManifestLast(
    { mode: "production", entries: stage.entries, metadata: stage.metadata },
    lock,
    deps,
  );
} finally {
  await releaseDestinationLock(lock, deps.io);
}
```

The production-only `PublicationPlan` and required `DestinationLock` make a null lock
unrepresentable. `CustomPublicationPlan` can enter only `publishOwnedCustomOutput`; comparison
has no publication-plan value.

After the complete N=88 Node validator passes, generate
`apps/web/src/city/art/era8To10AssetManifest.generated.ts` from the exact release-owned GLB set.
It exports `ERA8_TO10_ASSET_SCHEMA`, `ERA8_TO10_ASSET_FILES`,
`ERA8_TO10_ASSET_URLS`, and `ERA8_TO10_ASSET_CENSUS`, is consumed beside the three static Vite
glob owners (`buildingAssets.ts`, `civicBuildings.ts`, and `townHall.ts`), and is regenerated only
from validated release data. Its initial absence is asserted before outputs exist; rollback and
repair remove/regenerate it with the late-era release set. The Node validator imports these same
four symbols and compares files/URLs/census to validated metadata.
The generator test rejects an early generation attempt, stale/extra/missing file entries, and a
manifest whose static URL census differs from the three registry glob keys.

Now create `apps/web/src/city/era8To10AssetManifest.browser.test.tsx` with its final four-export
assertions first. For the red, write a disposable, type-valid generated module with all four
exports and static literal `?url` imports, but replace one URL value with another valid literal
URL already in the mapping so every required key remains type-valid.
Run the browser test and require failure at its exact URL census assertion—not a module-resolution,
transform, or setup error—then remove that temporary module. Run the real generator from
validated N=88 metadata and rerun green:

```bash
npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/era8To10AssetManifest.browser.test.tsx --testTimeout=30000
```

The root browser config collects this exact `.browser.test.tsx` path. The green asserts the
concrete `ERA8_TO10_ASSET_SCHEMA`, `ERA8_TO10_ASSET_FILES`,
`ERA8_TO10_ASSET_URLS`, and `ERA8_TO10_ASSET_CENSUS` symbols, all 87 literal URL imports, and
equality with Node-validated metadata. Now add
`"test:era8-10-manifest": "vitest run --config vitest.config.ts test/generateEra8To10AssetManifest.test.ts --testTimeout=30000 && vitest run --config vitest.browser.config.ts apps/web/src/city/era8To10AssetManifest.browser.test.tsx --testTimeout=30000"`
to `package.json`, add that script after `npm run setup:browsers` to
`.github/workflows/invariants.yml`, then invoke it. Its browser half is runnable only after this
file and the generated module exist. A disposable mutation removes one generated URL entry and must
fail at the same URL census assertion before restoration.

Execute the one authoritative, fail-safe browser red/green/mutation shell in exact matrix entry
**11a** below. It renders the type-valid stub with a duplicate URL value, preserves an existing
module through `had_original`, and verifies URL-census failure rather than a transform error.

- [ ] **Step 4: Assert the existing mode-aware fidelity contract**

Shipping calls:

```js
runStagedFidelityGate({
  mode: "shipping", bare: true, writeShippingMetadata: true,
  stagedRoot, jobs, sourceBytes, pageFactory,
});
```

Comparison calls:

```js
runStagedFidelityGate({
  mode: "comparison", bare: false, writeShippingMetadata: false,
  stagedRoot, jobs, sourceBytes, pageFactory,
});
```

The source kit receives the same `bare` value. Comparison writes no metadata and cannot enter
production publication. Shipping static/fidelity result is required before metadata publication.

- [ ] **Step 5: Prove independent release roots use Task 10's real gate**

Task 10's temp esbuild entry imports installed Three/Loader plus the pure `prepareGridworkModel` seam. Its route is:

```js
async function routeStagedModels(context, stagedRoot, expectedFiles) {
  const allowed = new Set(expectedFiles);
  const fulfilled = new Set();
  await context.route("https://gridwork-stage.invalid/models/**", async (route) => {
    const file = decodeURIComponent(
      new URL(route.request().url()).pathname.replace(/^\/models\//, ""),
    );
    if (!allowed.has(file) || file.includes("..") || file.startsWith("/")) {
      return route.abort("blockedbyclient");
    }
    fulfilled.add(file);
    return route.fulfill({
      status: 200,
      contentType: "model/gltf-binary",
      body: await readFile(join(stagedRoot, file)),
    });
  });
  return fulfilled;
}
```

Fresh page per era renders seeded source and `prepareGridworkModel(..., PLACED_PREPARATION)` staged GLB with identical renderer/camera/lights/color/shadows. Require fulfilled set equality to 87 expected paths, loader-root tag, alpha exact, mean≤0.5, p99≤2, Vertical Farm order, anisotropy. Serialized test timeout `30*60_000`.

- [ ] **Step 6: Independently regenerate, compare, accept bare-false, publish, and clean**

`compare-era8-10-output-sets.mjs` loads each root metadata, requires 87 sorted rows, reads every referenced GLB, verifies metadata hash/bytes, then compares the two maps plus metadata bytes:

```js
async function enumerateRelativeEntries(root, prefix = "") {
  const rows = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    const stat = await lstat(join(root, path));
    if (stat.isDirectory()) rows.push(...await enumerateRelativeEntries(root, path));
    else rows.push({ path, kind: stat.isFile() ? "file" : "other" });
  }
  return rows;
}
async function outputSet(root) {
  const metadataPath = join(root, "era-08-10-gridwork-export-metadata.json");
  const metadataBytes = await readFile(metadataPath);
  const metadata = JSON.parse(metadataBytes.toString("utf8"));
  if (metadata.outputs.length !== 87) throw new Error("output set is not 87");
  const rows = [];
  for (const row of [...metadata.outputs].sort((a, b) => a.file.localeCompare(b.file))) {
    const bytes = await readFile(join(root, row.file));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== row.sha256 || bytes.byteLength !== row.bytes) {
      throw new Error(`metadata mismatch: ${row.file}`);
    }
    rows.push({ file: row.file, sha256, bytes: bytes.byteLength });
  }
  const expected = new Set(["era-08-10-gridwork-export-metadata.json", ...rows.map((row) => row.file)]);
  const observed = await enumerateRelativeEntries(root); // recursive lstat: regular files only
  if (
    observed.some((row) => row.kind !== "file") ||
    JSON.stringify(observed.map((row) => row.path).sort()) !==
      JSON.stringify([...expected].sort())
  ) {
    throw new Error("custom comparison root has an extra, missing, symlinked, or wrong-type path");
  }
  return { metadata: metadataBytes.toString("base64"), rows };
}
const [left, right] = await Promise.all(outputSet(process.argv[2]), outputSet(process.argv[3]));
if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error("release sets differ");
console.log("87 GLBs plus metadata match byte-for-byte");
```

One owned shell:

```bash
set -euo pipefail
release_parent="$(mktemp -d "${TMPDIR:-/tmp}/cr-era8-10-task11-release.XXXXXX")"
repeat_parent="$(mktemp -d "${TMPDIR:-/tmp}/cr-era8-10-task11-repeat.XXXXXX")"
release="$release_parent/output"
repeat="$repeat_parent/output"
trap 'rm -rf "$release_parent" "$repeat_parent"' EXIT
node scripts/export-era8-10-building-models.mjs --out "$release"
node scripts/export-era8-10-building-models.mjs --out "$repeat"
node scripts/compare-era8-10-output-sets.mjs "$release" "$repeat"
node scripts/export-era8-10-building-models.mjs --comparison
npx vitest run --config vitest.era8-10-exporter.config.ts \
  -t "shipping staged fidelity|comparison bare=false|metadata last"
node scripts/export-era8-10-building-models.mjs
node scripts/generate-era8-10-asset-manifest.mjs \
  --metadata apps/web/src/city/art/building-sources/era-08-10-gridwork-export-metadata.json \
  --out apps/web/src/city/art/era8To10AssetManifest.generated.ts
```

`compare-era8-10-output-sets.mjs` recursively classifies each owned custom root, requires its
exact 87 GLB plus metadata set with no extras/symlinks/wrong types, then requires
path/hash/byte and metadata equality. The scratch comparison test snapshots production hashes
before/after and proves no publication. Final no-flags run independently regenerates and reruns
shipping fidelity against its own stage before sequentially renaming 87 GLBs and metadata last.
Trap cleans all parents.

- [ ] **Step 7: Verify actual runtime green and mutate**

```bash
npm test -w @cr/web -- \
  src/city/era8To10BuildingModels.test.ts src/city/buildingAssets.test.ts \
  src/city/civicBuildings.test.ts src/city/currentEraCivics.test.tsx \
  src/city/civicIdentity.currentEra.test.ts src/city/inheritedCivics.test.ts \
  src/city/eraDressing.test.tsx src/city/eraSurfaces.test.tsx \
  src/city/eraTwo.reachability.test.ts src/city/three/unmappedBuilding.test.ts \
  src/city/three/placedBuildingPreload.test.tsx src/city/townHall.test.ts \
  src/city/civicLedgerPlacement.test.ts src/city/signedInCityPersists.test.tsx
node scripts/export-era8-10-building-models.mjs --check
npx vitest run --config vitest.era8-10-exporter.config.ts
npm run typecheck
npm run build -w @cr/web
```

Expected exact final populations/menu/persistence/preload/87 GLB hashes plus metadata. Run atomic
IDs for ordered images/Scene, adapter, registry, fidelity, persistence, and original-defect
injections after outputs exist.

- [ ] **Step 8: Conditional checkpoint**

Use the exact revised Task 11 checkpoint block only when authorized; otherwise leave code/assets uncommitted.

The checkpoint starts `set -euo pipefail`, sets `umask 077`, initializes variables and its cleanup
trap before authorization, index, or merge-base checks, then skips without explicit authorization
or otherwise rejects a nonempty index. The trap removes all three secure task-owned temporaries on
every exit, and unstages only Task11 paths when staging occurred but the commit did not complete.
Before any `git add`, it imports the guarded exporter, proves the metadata rows are sorted and
uses the frozen release manifest to prove its 115 task-owned paths and the 162-path full feature
scope, including the generated browser manifest and 88 exporter-publication paths. It writes
actual NUL bytes with
`Buffer.from(\`${path}\0\`)`, performs `git add --dry-run`, stages through
`--pathspec-from-file --pathspec-file-nul`, and compares the staged NUL Set back to all
its task-specific expected paths before `git diff --cached --check` and commit. Any
authorization/census/dry-run/staging/comparison/commit failure exits immediately and the
trap cleans both files.

## Task 12: Shared-Preparation Browser Surfaces, Permanent CI Gates, and Post-Promotion Verification

**Files:** Create complete `lateEraGridworkMaterialFidelity.browser.test.tsx`, `scripts/run-era8-10-surface-mutations.mjs`, mutation Vite config, and reproduction gate; modify package/workflow.

**Interfaces:** Verifies PlacedModelStack, BuildingThumb, GridworkModelPreview, Town Hall and every metadata state use `prepareGridworkModel`; installs permanent commands after production exists.

**Dependencies:** Task 11.

- [ ] **Step 1: Write browser-surface/CI reds**

Write the final assertions and complete harness from Step 2 first; no unconditional throw is allowed. `run-era8-10-surface-mutations.mjs` creates a temporary source root and one Vite alias mutation at a time:

- `placed-bypass` replaces PlacedModelStack's preparation call with raw clone;
- `thumb-bypass` bypasses `THUMB_PREPARATION`;
- `preview-bypass` bypasses preview's `prepareModel`;
- `townhall-bypass` replaces Town Hall's shared stack with raw primitive;
- `restoration-bypass` skips adapter inside `prepareGridworkModel`;
- `placed-preset-bypass` uses disabled shadows/no fit.

Each runs the unchanged final browser assertions and requires a nonzero exit containing the named surface/final assertion; then the unmutated source runs green. Before adding package/workflow commands:

```bash
node scripts/run-era8-10-surface-mutations.mjs
npx vitest run test/era8To10ExporterReproductionGate.test.ts
```

Expected: six mutation runs are red at final assertions, the actual production-surface run is green, and reproduction gate names missing package/workflow commands.

- [ ] **Step 2: Implement the complete browser harness**

Use real imports:

```ts
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import "../../styles.css";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import type { MetadataOutputRow } from "../../../../../scripts/export-era8-10-building-models.mjs";
import metadata from "../art/building-sources/era-08-10-gridwork-export-metadata.json";
import { resolveBuildingModel } from "../buildingAssets";
import { resolveCivicModel } from "../civicBuildings";
import { resolveEraTownHall } from "../townHall";
import { mount, waitFor } from "../../lessons/testHarness";
import BuildingThumb from "./BuildingThumb";
import GridworkModelPreview from "./GridworkModelPreview";
import { PLACED_PREPARATION, prepareGridworkModel } from "./modelPreparation";
import { PlacedModelStack } from "./PlacedBuilding";
import { TownHall } from "./TownHall";
```

Install `__THREE_DEVTOOLS__` before mount; wrap each observed renderer's `render(scene,camera)` to retain the latest scene without changing output. Then:

The mounted JSX below wraps the two shared-canvas surfaces with stable probe names; the thumb and preview own separate canvases.

Test body:

```ts
const ALL_STATE_TIMEOUT_MS = 30 * 60_000;
const SURFACE_TIMEOUT_MS = 120_000;
const OUTPUTS = metadata.outputs as readonly MetadataOutputRow[];

test("all 87 production states use the placed preparation seam", {
  timeout: ALL_STATE_TIMEOUT_MS,
}, async () => {
  const loader = new GLTFLoader();
  expect(OUTPUTS).toHaveLength(87);
  for (const row of OUTPUTS) {
    const url = productionUrlFor(row); // exact resolver switch by row.kind/runtimeId/runtimeEra/stage
    const gltf = await loader.loadAsync(url);
    const prepared = prepareGridworkModel(
      gltf.scene,
      row.runtimeFootprint,
      PLACED_PREPARATION,
    );
    const meshes: THREE.Mesh[] = [];
    prepared.traverse((object) => { if (object instanceof THREE.Mesh) meshes.push(object); });
    expect(meshes.length, row.file).toBeGreaterThan(0);
    expect(meshes.every((mesh) => mesh.castShadow && mesh.receiveShadow), row.file).toBe(true);
    expect(meshes.some((mesh) => mesh.material instanceof THREE.MeshToonMaterial), row.file).toBe(true);
    expect(meshes.some((mesh) =>
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).some((material) =>
        material.userData.gridworkMaterial !== undefined &&
        material instanceof THREE.MeshStandardMaterial)), row.file).toBe(false);
    const box = new THREE.Box3().setFromObject(prepared);
    expect([box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z]
      .every(Number.isFinite), row.file).toBe(true);
    expect(box.min.y, row.file).toBeCloseTo(0, 5);
  }
});

test("PlacedModelStack, thumb, preview, and Town Hall expose only restored materials", {
  timeout: SURFACE_TIMEOUT_MS,
}, async () => {
  const skillModel = resolveBuildingModel("TRG.9", "built");
  const hall = resolveEraTownHall("cyberpunk", "prehistoric").model;
  if (!hall) throw new Error("Cyberpunk Hall did not resolve");
  const probe = installRendererSceneProbe();
  const harness = mount(<>
    <Canvas>
      <group name="probe-placed">
        <PlacedModelStack model={skillModel} footprint={{ w: 2, d: 2 }} reducedMotion />
      </group>
      <group name="probe-townhall">
        <TownHall center={{ x: 0, z: 0 }} rotationY={0} footprint={{ w: 3, d: 2 }}
          model={hall} reducedMotion celebrateToken={0} onSelect={() => undefined} />
      </group>
    </Canvas>
    <BuildingThumb nodeId="TRG.9" />
    <GridworkModelPreview />
  </>);
  try {
    const buildingSelect = document.querySelectorAll<HTMLSelectElement>("select")[0];
    if (!buildingSelect) throw new Error("Gridwork preview building select missing");
    buildingSelect.value = "trg-8";
    buildingSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await waitFor(() => {
      const surfaces = identifyLateSurfaceScenes(probe.scenes);
      return surfaces.shared !== null && surfaces.thumb !== null &&
        surfaces.preview !== null &&
        new Set([surfaces.shared, surfaces.thumb, surfaces.preview]).size === 3;
    }, "named late-era content on placed, Hall, thumb, and selected preview", 60_000);
    const surfaces = identifyLateSurfaceScenes(probe.scenes);
    expect(surfaces.shared, "placed + Town Hall shared scene loaded").not.toBeNull();
    expect(surfaces.thumb, "TRG.9 BuildingThumb scene loaded").not.toBeNull();
    expect(surfaces.preview, "explicitly selected TRG.8 preview scene loaded").not.toBeNull();
    const distinct = [surfaces.shared, surfaces.thumb, surfaces.preview]
      .filter((scene): scene is THREE.Scene => scene !== null);
    expect(new Set(distinct).size, "three distinct production renderer scenes").toBe(3);
    for (const [surface, scene] of Object.entries(surfaces)) {
      if (scene) assertNoTaggedTransportMaterial(scene, surface);
    }
  } finally {
    harness.cleanup();
    probe.restore();
    await page.viewport(1024, 580);
  }
});
```

```ts
function productionUrlFor(row: MetadataOutputRow): string {
  const url = row.kind === "skill"
    ? resolveBuildingModel(row.runtimeId, row.stage).url
    : row.kind === "civic"
      ? resolveCivicModel(row.runtimeId, "built")?.url
      : resolveEraTownHall(row.runtimeEra, "prehistoric").model?.url;
  if (!url) throw new Error(`production URL missing: ${row.file}`);
  return url;
}
function installRendererSceneProbe() {
  const realm = globalThis as typeof globalThis & {
    __THREE_DEVTOOLS__?: EventTarget;
  };
  const previous = realm.__THREE_DEVTOOLS__;
  const target = new EventTarget();
  const scenes = new Set<THREE.Scene>();
  const renderers = new WeakSet<THREE.WebGLRenderer>();
  const seenScenes = new WeakSet<THREE.Scene>();
  const restores: Array<() => void> = [];
  const listener: EventListener = (event) => {
    if (!(event instanceof CustomEvent)) return;
    const detail = event.detail as
      | { readonly isWebGLRenderer?: boolean; readonly render?: unknown }
      | null;
    if (detail?.isWebGLRenderer !== true || typeof detail.render !== "function") return;
    const renderer = detail as THREE.WebGLRenderer;
    if (renderers.has(renderer)) return;
    renderers.add(renderer);
    const original = renderer.render;
    const wrapped: THREE.WebGLRenderer["render"] = (scene, camera) => {
      const candidate = scene as THREE.Object3D & { readonly isScene?: boolean };
      if (candidate.isScene === true) {
        const renderedScene = scene as THREE.Scene;
        if (!seenScenes.has(renderedScene)) {
          seenScenes.add(renderedScene);
          scenes.add(renderedScene);
        }
      }
      return original.call(renderer, scene, camera);
    };
    renderer.render = wrapped;
    restores.push(() => {
      if (renderer.render === wrapped) renderer.render = original;
    });
  };
  target.addEventListener("observe", listener);
  realm.__THREE_DEVTOOLS__ = target;
  return {
    scenes,
    restore() {
      target.removeEventListener("observe", listener);
      for (const restore of restores.reverse()) restore();
      realm.__THREE_DEVTOOLS__ = previous;
    },
  };
}
function sceneHasLateAsset(scene: THREE.Scene, basename: string): boolean {
  let found = false;
  scene.traverse((object) => {
    const tag = object.userData.gridworkLateEraAsset as { basename?: string } | undefined;
    if (tag?.basename === basename) found = true;
  });
  return found;
}
function identifyLateSurfaceScenes(scenes: ReadonlySet<THREE.Scene>) {
  const rows = [...scenes];
  const shared = rows.find((scene) =>
    scene.getObjectByName("probe-placed") !== undefined &&
    scene.getObjectByName("probe-townhall") !== undefined &&
    sceneHasLateAsset(scene, "trg-9-built") &&
    sceneHasLateAsset(scene, "townhall-cyberpunk-built")) ?? null;
  const thumb = rows.find((scene) =>
    scene !== shared &&
    scene.getObjectByName("probe-placed") === undefined &&
    sceneHasLateAsset(scene, "trg-9-built")) ?? null;
  const preview = rows.find((scene) =>
    scene !== shared && scene !== thumb &&
    scene.getObjectByName("probe-placed") === undefined &&
    sceneHasLateAsset(scene, "trg-8-built")) ?? null;
  return { shared, thumb, preview } as const;
}
function assertNoTaggedTransportMaterial(scene: THREE.Scene, surface: string): void {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      expect(
        material instanceof THREE.MeshStandardMaterial &&
        material.userData.gridworkMaterial !== undefined,
        `${surface}:${object.name}`,
      ).toBe(false);
    }
  });
}
```

Probe tests inject non-renderer detail, missing render method, duplicate renderer events, repeated renders of one Scene, default D1 preview selection, and missing named late asset. None may satisfy the four-surface assertion. Unit tests also inject each wrong surface preset. No prop is added to production components.

- [ ] **Step 3: Add permanent package/CI gates**

Add exact `check:era8-10-models` and `test:era8-10-exporter`, include check in root `check`, and run each once after Chromium/before browser suite with `!cancelled()`. Do not rename required job.

- [ ] **Step 4: Verify post-promotion**

```bash
node scripts/run-era8-10-surface-mutations.mjs
npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/lateEraGridworkMaterialFidelity.browser.test.tsx
npx vitest run test/era8To10ExporterReproductionGate.test.ts
npm run check:era8-10-models
npm run test:era8-10-exporter
npm test -w @cr/web -- \
  src/city/era8To10BuildingModels.test.ts src/city/buildingAssets.test.ts \
  src/city/civicBuildings.test.ts src/city/currentEraCivics.test.tsx \
  src/city/civicIdentity.currentEra.test.ts src/city/inheritedCivics.test.ts \
  src/city/eraDressing.test.tsx src/city/eraSurfaces.test.tsx \
  src/city/eraTwo.reachability.test.ts src/city/three/unmappedBuilding.test.ts \
  src/city/three/placedBuildingPreload.test.tsx src/city/townHall.test.ts \
  src/city/civicLedgerPlacement.test.ts src/city/signedInCityPersists.test.tsx
npm run typecheck
npm run build -w @cr/web
```

Expected every command exits 0; browser test reports all 87 plus four production surfaces restored; reproduction gate sees package/workflow commands exactly once.

- [ ] **Step 5: Conditional checkpoint**

Use the exact revised Task 12 checkpoint block only when authorized; otherwise retain uncommitted.

## Task 13: Learner-Iframe HTTP, Spatial, Capacity, and Gallery Evidence

**Files:** Create learner browser test/config and evidence HTTP/plot/capacity/gallery frames;
modify `apps/web/src/vite-env.d.ts`.

**Interfaces:** Uses real `CitySurface` props and metrics. Writes only under `VITE_ERA8_10_CAPTURE=1`.

**Dependencies:** Task 12.

- [ ] **Step 1: Write default-no-write/frame reds**

```ts
const CAPTURE = import.meta.env.VITE_ERA8_10_CAPTURE === "1";
```

Write final HTTP/visual assertions before capture code. With ordinary undefined env, a runtime
spy proves all assertions execute and zero `commands.writeFile` calls occur. Do **not** import
`gateFor`, `shotFlagsIn`, or any other private helper from
`test/testWritesStayOutOfTheTree.test.ts`: that file remains the black-box executable guard.
Frame completeness initially red absent evidence.

- [ ] **Step 2: Create one-worker config**

```ts
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { mkdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";
import { browserGlobalDefine } from "./apps/web/vite.config";

const ensureEvidenceDir: BrowserCommand<[string]> = async (_context, requested) => {
  const root = process.cwd();
  const physical = resolve(root, requested);
  const rel = relative(root, physical);
  if (rel === ".." || rel.startsWith(`..${sep}`)) throw new Error("evidence directory escaped root");
  await mkdir(physical, { recursive: true });
};

export default defineConfig({
  plugins: [react()],
  define: browserGlobalDefine,
  resolve: { dedupe: ["react", "react-dom"] },
  test: {
    maxWorkers: 1,
    include: ["apps/web/src/city/three/era8To10LearnerEvidence.browser.test.tsx"],
    browser: {
      enabled: true,
      headless: true,
      connectTimeout: 300_000,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      commands: { ensureEvidenceDir },
    },
  },
});
```

Add to `vite-env.d.ts`:

```ts
interface ImportMetaEnv {
  readonly VITE_ERA8_10_CAPTURE?: string;
}
```

Augment `vitest/browser`:

```ts
declare module "vitest/browser" {
  interface BrowserCommands {
    ensureEvidenceDir(path: string): Promise<void>;
  }
}
```

- [ ] **Step 3: Mount actual styled learner surface**

Import Fredoka/Nunito, `../../styles.css`, and:

```ts
import type { MetadataOutputRow } from "../../../../../scripts/export-era8-10-building-models.mjs";
```

Mount `.city-shell > CitySurface` with existing `archipelagoMetrics`, `enableCanvas`, `reducedMotion`, `eraId`, `loadCity`. `loadFor(metadataRow: MetadataOutputRow)` creates exact real node/civic/Hall load; no invented prop.

- [ ] **Step 4: Implement app-iframe capture integrity**

```ts
function appFrameBox() {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) throw new Error("Vitest app iframe missing");
  const rect = frame.getBoundingClientRect();
  return {
    x: rect.left + window.parent.scrollX,
    y: rect.top + window.parent.scrollY,
    width: rect.width,
    height: rect.height,
    scaleX: rect.width / window.innerWidth,
    scaleY: rect.height / window.innerHeight,
  };
}
function pngSize(base64: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  if (bytes.byteLength < 24 || String.fromCharCode(...bytes.slice(1, 4)) !== "PNG") {
    throw new Error("not PNG");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}
```

Use `page.viewport`, assert inner/frame dimensions and scales exactly. Await fonts; assert `Nunito Variable` and computed CSS variables/background. Wait target network plus `data-sample-frames>=2` and triangles>0. Select/move via learner UI. CDP clip exact frame at scale1; `pngSize` equals viewport. No full-page/tester-shell/building crop.

- [ ] **Step 5: Always run 87 HTTP assertions, gate only write**

Compare actual registry basenames to metadata; fetch 87 status200/nonzero. Then place the write directly under the recognized lexical gate:

```ts
if (CAPTURE) {
  const path =
    "docs/superpowers/evidence/2026-08-07-era-08-10-runtime-wiring/http-87.json";
  await commands.ensureEvidenceDir(path.slice(0, path.lastIndexOf("/")));
  await commands.writeFile(path, `${JSON.stringify(rows, null, 2)}\n`);
}
```

Default command plus status proves no evidence changes.

Every PNG/JSON/text site repeats this exact lexical `if (CAPTURE) { ensureEvidenceDir; commands.writeFile; }` shape. No helper containing `commands.writeFile` is permitted. Assertions, metrics waits, PNG generation in memory, and HTTP fetches remain outside the gate.

Prove the existing guard is load-bearing without importing or extracting its parser. After the
planned capture test exists, make one disposable lexical mutation in that test: move exactly one
planned `await commands.writeFile(...)` statement outside its enclosing `if (CAPTURE) { ... }`
while retaining its literal output path. Run the guard itself:

```bash
npx vitest run test/testWritesStayOutOfTheTree.test.ts \
  -t "writes a tracked path only when a shot flag says so"
```

Expected red: the parameterized guard fails by the mutated learner-evidence
`file:line`, names its tracked destination, and says no `VITE_*` shot flag is on the way to
the write. Restore the exact lexical gate, rerun the same command green, then run the
ordinary-environment browser test with the runtime spy green. A no-op/rewrite of a private
parser helper is not evidence and is not part of this task.

- [ ] **Step 6: Prove capacity census and exhaustive galleries**

At each late era, create the capacity-faithful fixture from the real `eraCityLayout`,
`eraBuildableDiscRadius`, `ringLayout`, and session placement path. Record the behavior-derived
`seated` and `unseated` arrays; assert exact set partition against the cumulative roster,
non-empty total population, no duplicate mounted identity, and no silent dropped member. Do not
pin a late-era capacity count or assert `unseated.length === 0`.

Separately derive learner-mounted gallery shards from the actual placement result, never a
CSS-only grid. A shard carries only the members the real path seats, and the planner continues
with the returned unseated remainder. For each of Atomic, Information, and Cyberpunk, derive
non-empty shard populations for its current skill stages, civic built models, and hall; assert the
shards are pairwise disjoint and their union is exactly `72 + 12 + 3 = 87` late-era model
identities. Also assert each era's current roster is represented. `EVD036` removes a member from
one shard and must fail the final union assertion; `EVD037` substitutes an unseated member and
must fail the final capacity-composition assertion.

Use `framedTestBudget(1)=30s` per 87 standalone and nine tall cases,
`framedTestBudget(2)=60s` per three capacity cities, and `framedTestBudget(1)=30s` per
behavior-derived gallery shard. Capture exact `1024×580` and `390×844`; every capacity/gallery
frame is uncropped with plot and surrounding island visible. The capture arithmetic is
`87 + 9 + 3 + G = 99 + G`, where `G` is the recorded non-empty gallery-shard count derived by
the test and verified against its set census.

- [ ] **Step 7: Capture/review/verify**

```bash
set -euo pipefail
capture_root="docs/superpowers/evidence/2026-08-07-era-08-10-runtime-wiring"
cleanup_capture_root() { rm -rf "$capture_root"; }
trap cleanup_capture_root EXIT
npx vitest run --config vitest.era8-10-evidence.config.ts
npx vitest run test/testWritesStayOutOfTheTree.test.ts \
  -t "writes a tracked path only when a shot flag says so"
VITE_ERA8_10_CAPTURE=1 npx vitest run --config vitest.era8-10-evidence.config.ts
# Inspect the D-only captures here; the trap removes them before this shell exits.
npm run typecheck
```

Expected all four commands exit 0: the first runs every assertion with zero writes, the guard sees
every tracked write lexically gated, capture emits 87 HTTP rows, `99 + G` exact-dimension PNGs
(`G` behavior-derived gallery frames), 87 fit rows, three capacity partitions, and one complete
gallery census; the exact root typecheck compiles the browser test/config. Record human
accepted/blocked notes. Run `EVD001`–`EVD011`, `EVD036`, and `EVD037`; restore.
The owned trap removes capture-only HTTP/fit/frame artifacts before any checkpoint or final scope
command. Assert `test ! -e "$capture_root"` in the next shell before the raw union; evidence D is
inspectable during this command but can never become a publish-path extra.

- [ ] **Step 8: Conditional checkpoint**

Use the exact Task 13 checkpoint block only when authorized; otherwise retain uncommitted.

## Task 14: Performance Observability, Harness, and Executable Rollback Control

**Files:** Create `cityPerformanceMetrics.tsx`/test, `Era8To10PerformanceHarness.tsx`, fixture HTML/main/Vite config, release manifest, rollback script/test; modify CityScene, both preload hooks/tests, package.

**Interfaces:** Extends existing `archipelagoMetrics` with frame/memory/per-building/preload payloads, creates a valid CitySurface harness, and produces `prepareRollbackCopy({mode,destination,baseSha})`.

**Dependencies:** Task 13.

- [ ] **Step 1: Write observability/harness/rollback reds**

Focused tests require frame reset acknowledgement/raw samples/median/p95/memory/per-building metrics,
preload candidate/effect calls, valid CitySurface props, capacity partition composition,
fixture compile, rollback command, two-way manifest/scope, isolated path, fallback outputs, and
active digest unchanged. The disclosure test starts closed, then open, and proves every
select/move sample has a mounted roster; `EVD038` makes the toggle unconditional and must fail
the second iteration at that final mounted-roster assertion. Expected reds name missing
`data-renderer-metrics` fields and `ENOENT scripts/era8-10-release-manifest.json`.

- [ ] **Step 2: Implement the production observability and valid harness**

Implement the exact `CityRendererMetricsPayload`/`PerformanceScenario` contract recorded in this plan, reset-before-sample logic, raw 120 samples, median/p95, renderer memory, per-building draw/mesh/triangle/geometry-byte collector, context preload candidate/effect sink, and unchanged no-provider behavior. Wrap existing CityScene contents in the provider only when the existing metrics target is present.

Create the fixture harness now using only real `CitySurfaceProps`, production fonts/styles, placement-revision wrapper callbacks, and an era-prop switch. Create React/Vite fixture files and prove `npm run typecheck` plus focused metrics/harness tests pass before writing the rollback manifest.

`apps/web/src/city/three/era8To10PerformanceEntry.tsx` constructs a capacity-faithful caught-up session
from current placement/catch-up APIs rather than inventing a `CityLoad`. It records the real
seated/unseated partition and never requires all cumulative skills or civics to fit:

```tsx
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { createRoot } from "react-dom/client";
import { eraRosterNodeIds } from "../../catchup/catchUpWalk";
import { ringLayout } from "../../catchup/ringLayout";
import { createCityDevSession } from "../citySession";
import { eraBuildableDiscRadius } from "../islandLand";
import { cityEraId, setCityEra } from "../useCityEra";
import {
  Era8To10PerformanceHarness,
} from "./Era8To10PerformanceHarness";

const LATE_ERAS = ["atomic_age", "information_age", "cyberpunk"] as const;
type LateEra = (typeof LATE_ERAS)[number];

async function createPerformanceFixture(era: LateEra) {
  const eraIndex = ERA_SEQUENCE.findIndex((row) => row.id === era);
  if (eraIndex < 0) throw new Error(`unknown performance era: ${era}`);
  const through = ERA_SEQUENCE.slice(0, eraIndex + 1);
  const nodeIds = through.flatMap((row) => [...eraRosterNodeIds(row.id)]);
  const placement: Record<string, 2> =
    Object.fromEntries(nodeIds.map((nodeId) => [nodeId, 2] as const));
  const session = createCityDevSession();
  session.seedFromPlacement(placement, nodeIds);
  const initial = await session.load();
  const reserved = initial.town_hall ? [initial.town_hall] : [];
  const skills = ringLayout({
    nodeIds,
    reserved,
    buildableRadius: eraBuildableDiscRadius(era),
  });
  const seatedIds = skills.placed.map((row) => row.nodeId);
  const seatedSet = new Set(seatedIds);
  const unseatedSet = new Set(skills.unseated);
  if (
    new Set(nodeIds).size !== nodeIds.length ||
    seatedSet.size !== seatedIds.length ||
    unseatedSet.size !== skills.unseated.length ||
    [...seatedSet, ...unseatedSet].length !== nodeIds.length ||
    nodeIds.some((nodeId) => !seatedSet.has(nodeId) && !unseatedSet.has(nodeId))
  ) {
    throw new Error(`capacity partition drifted for ${era}`);
  }
  for (const row of skills.placed) await session.placeSkill(row.nodeId, row);
  const load = await session.load();
  const mounted = (load.placements ?? []).map((row) => row.nodeId);
  if (mounted.length !== seatedIds.length || new Set(mounted).size !== mounted.length) {
    throw new Error(`capacity fixture silently dropped or duplicated a seated member for ${era}`);
  }
  return { session, load, seated: seatedIds, unseated: skills.unseated };
}

`createPerformanceFixture` remains the capacity-faithful city evidence fixture. The measurement
driver instead calls a distinct `createCurrentEraBuiltMetricsScenario(era, metadata)` so a
saturated cumulative roster cannot hide current art. It uses the real `eraRosterNodeIds(era)`,
`ringLayout`, `eraCivicSeats`, and session placement APIs to make deterministic legal shards for:

- every current-era skill at `built`;
- all four current-era civic rows at `built`; and
- the current-era Town Hall.

The scenario derives `expectedBuilt = metadata.outputs.filter(row =>
row.runtimeEra === era && row.stage === "built")`, mounts each identity through real
`CitySurface`/`PlacedModelStack`, and asserts exact Set equality with the mounted
`gridworkLateEraAsset.basename` markers before sampling. This is an isolated current-era
measurement scenario, not a claim that a cumulative city holds all rows. `joinBuiltModelMetrics`
accepts the expected and observed sets, rejects a missing/duplicate marker or metric by basename,
and has the disposable `METRICS_CIVIC_MISSING` red that removes one civic metric and fails its
final exact-set assertion. Expected
per era is the metadata-derived current built population: skills plus four civics plus one Town
Hall, never a hardcoded cumulative count.

const requested = new URLSearchParams(location.search).get("era");
if (!LATE_ERAS.includes(requested as LateEra)) {
  throw new Error(`invalid performance era: ${requested ?? "missing"}`);
}
const initialEra = requested as LateEra;
const restoreEraId = cityEraId();
setCityEra(initialEra);
let fixture;
try {
  fixture = await createPerformanceFixture(initialEra);
} catch (error) {
  setCityEra(restoreEraId);
  throw error;
}
const root = document.getElementById("root");
if (!root) {
  setCityEra(restoreEraId);
  throw new Error("performance fixture root missing");
}
createRoot(root).render(
  <Era8To10PerformanceHarness
    initialEra={initialEra}
    initialLoad={fixture.load}
    session={fixture.session}
    restoreEraId={restoreEraId}
  />,
);
```

This fixture does not manufacture a larger island or bypass `placeSkill`. It is the
capacity-faithful city for performance and capacity evidence. Civic
purchase/place/move/restore runs in separate valid isolated scenarios or learner galleries, one
per civic identity, so all twelve are verified without asserting that four current civics coexist
after a cumulative layout has saturated.

- [ ] **Step 3: Define categorized manifest**

Base SHA exact; list production modified/added, generated models from metadata, verification modified/added. Explicit Task 15 instrumentation category:

```json
"performanceInstrumentation": {
  "modified": [
    "apps/web/src/city/three/CityScene.tsx",
    "apps/web/src/city/three/placedBuildingPreload.ts",
    "apps/web/src/city/three/townHallPreload.ts",
    "apps/web/src/city/three/placedBuildingPreload.test.tsx",
    "apps/web/src/city/townHall.test.ts",
    "package.json"
  ],
  "added": [
    "apps/web/src/city/three/cityPerformanceMetrics.tsx",
    "apps/web/src/city/three/cityPerformanceMetrics.test.tsx",
    "apps/web/src/city/three/Era8To10PerformanceHarness.tsx",
    "scripts/measure-era8-10-performance.mjs",
    "test/era8To10PerformanceHarness.test.ts",
    "apps/web/era8-10-performance.html",
    "apps/web/src/city/three/era8To10PerformanceEntry.tsx",
    "apps/web/era8-10-performance.vite.config.mjs"
  ]
},
"modePolicies": {
  "release": {
    "restoreCategories": [
      "production.modified",
      "verification.modified",
      "performanceInstrumentation.modified"
    ],
    "deleteCategories": [
      "production.added",
      "verification.added",
      "performanceInstrumentation.added",
      "generatedModels"
    ],
    "retainCategories": []
  },
  "performance-control": {
    "restoreCategories": [
      "production.modified",
      "verification.modified"
    ],
    "deleteCategories": [
      "production.added",
      "verification.added",
      "generatedModels"
    ],
    "retainCategories": [
      "performanceInstrumentation.modified",
      "performanceInstrumentation.added"
    ]
  }
}
```

`docs/superpowers/evidence/2026-08-07-era-08-10-runtime-wiring/performance.json` is capture-only
evidence D. It is never a rollback category, canonical implementation path, conditional-checkpoint
path, or publish path.

Full `release` mode restores/deletes every instrumentation path. `performance-control`
retains exactly the instrumentation category while reverting late
art/registries/material preparation, so authored/control share one measurement
implementation. The manifest test expands the 87 metadata model paths and compares Sets
against their declared category subsets, then proves every category member belongs to the
canonical full implementation set:

```ts
const releasePaths = new Set(pathsForMode(manifest, "release", "all", { generated }));
expect(releasePaths).toEqual(
  new Set(DECLARED_ROLLBACK_RELEASE_PATHS),
);
expect([...releasePaths].every((path) => FULL_FEATURE_RELEASE_PATHS.includes(path))).toBe(true);
const retainedPaths = new Set(pathsForMode(
  manifest, "performance-control", "retain", { generated },
));
expect(retainedPaths).toEqual(
  new Set(EXPECTED_PERFORMANCE_INSTRUMENTATION),
);
expect([...retainedPaths].every((path) => FULL_FEATURE_RELEASE_PATHS.includes(path))).toBe(true);
```

`FULL_FEATURE_RELEASE_PATHS` is the one canonical set exported by Task 11's release-path script;
`EXPECTED_PERFORMANCE_INSTRUMENTATION` remains Task 14's independent literal set. The rollback
test imports both. Task 16 later imports the same canonical full set and compares it to the
porcelain/diff/untracked execution-base union. Task 14 tests both policy expansions against the frozen
future contract; Task 15 reruns the same test after every listed path exists, so an
omitted future script/test/config or a stale extra fails by path without a backward
dependency on Task 16.

`production.added` and `FULL_FEATURE_RELEASE_PATHS` explicitly include
`apps/web/src/city/art/era8To10AssetManifest.generated.ts`. Release and performance-control
delete it with `generatedModels`/late-era registry outputs; no rollback mode retains a browser
manifest for removed art.

- [ ] **Step 4: Implement isolated copy/revert**

```js
export async function prepareRollbackCopy({ mode, destination, baseSha }) {
  const sourceRoot = fileURLToPath(new URL("..", import.meta.url));
  const before = await treeDigest(sourceRoot, FULL_FEATURE_RELEASE_PATHS);
  await cp(sourceRoot, destination, {
    recursive: true,
    filter: (path) => {
      const first = relative(sourceRoot, path).split(sep)[0];
      return first !== ".git" && first !== "node_modules" && first !== "tmp";
    },
  });
  await symlink(join(sourceRoot, "node_modules"), join(destination, "node_modules"), "dir");
  const manifest = JSON.parse(await readFile(
    join(sourceRoot, "scripts/era8-10-release-manifest.json"), "utf8",
  ));
  const modified = pathsForMode(manifest, mode, "restore");
  for (const path of modified) {
    const bytes = await execFileBuffer("git", ["-C", sourceRoot, "show", `${baseSha}:${path}`]);
    await mkdir(dirname(join(destination, path)), { recursive: true });
    await writeFile(join(destination, path), bytes);
  }
  const generated = generatedModelPaths(
    JSON.parse(await readFile(join(sourceRoot, manifest.metadataPath), "utf8")),
  );
  const removed = pathsForMode(manifest, mode, "delete", { generated });
  for (const path of [...removed].sort().reverse()) {
    await rm(join(destination, path), { recursive: true, force: true });
  }
  if (await treeDigest(sourceRoot, FULL_FEATURE_RELEASE_PATHS) !== before) {
    throw new Error("active worktree changed during rollback rehearsal");
  }
  return destination;
}
```

Implement the selector, including its two-way policy safety:

```js
const POLICY_KEYS = {
  restore: "restoreCategories",
  delete: "deleteCategories",
  retain: "retainCategories",
};
export function pathsForMode(
  manifest, mode, action, { generated = [] } = {},
) {
  const policy = manifest.modePolicies?.[mode];
  if (!policy || !["restore", "delete", "retain", "all"].includes(action)) {
    throw new Error(`unknown rollback mode/action: ${mode}/${action}`);
  }
  const sets = {};
  for (const [kind, key] of Object.entries(POLICY_KEYS)) {
    const rows = [];
    for (const reference of policy[key] ?? []) {
      if (reference === "generatedModels") {
        if (kind !== "delete") throw new Error("generatedModels must be deleted");
        rows.push(...generated);
        continue;
      }
      const match =
        /^(production|verification|performanceInstrumentation)\.(modified|added)$/
          .exec(reference);
      if (!match || !Array.isArray(manifest[match[1]]?.[match[2]])) {
        throw new Error(`unknown rollback category: ${reference}`);
      }
      rows.push(...manifest[match[1]][match[2]]);
    }
    if (new Set(rows).size !== rows.length) {
      throw new Error(`duplicate path inside ${mode}/${kind}`);
    }
    sets[kind] = rows;
  }
  const owners = new Map();
  for (const [kind, rows] of Object.entries(sets)) {
    for (const path of rows) {
      if (owners.has(path)) {
        throw new Error(`${path} is both ${owners.get(path)} and ${kind}`);
      }
      owners.set(path, kind);
    }
  }
  const selected = action === "all"
    ? [...sets.restore, ...sets.delete, ...sets.retain]
    : sets[action];
  return [...selected].sort();
}
```

Define `execFileBuffer` as a Promise wrapper around
`execFile(...,{encoding:null})`, `generatedModelPaths` as metadata rows prefixed by
production model root, and `treeDigest` as sorted path/symlink/byte SHA-256. No shell
string.

- [ ] **Step 5: Execute fallback assertions**

Release copy runs unmapped/current civics/Hall/identity tests and typecheck, proving late
skills procedural, Halls fallback, persisted civic IDs retained with procedural model,
no migration, and no performance instrumentation path remains changed/added. A second
`performance-control` copy proves, path by path and byte-for-byte, that the complete
instrumentation Set remains identical to the authored tree while every late production
art/registry/material-preparation path equals the base. Both copies run the two-way Set
assertions above and are removed in `finally`.

- [ ] **Step 6: Wire/run/mutate**

Add:

```json
"rehearse:era8-10-rollback": "node scripts/rehearse-era8-10-release-rollback.mjs --mode release"
```

Run `npm run rehearse:era8-10-rollback` and the root test; expected pass/active
unchanged. Execute `RBK001`–`RBK008` independently, including omission, wrong-mode
restoration, and stale retained-instrumentation membership; each fails by exact path,
then restore and rerun both release/control copies green.

- [ ] **Step 7: Verify Task 14 types and conditional checkpoint**

```bash
npm test -w @cr/web -- \
  src/city/three/cityPerformanceMetrics.test.tsx \
  src/city/three/placedBuildingPreload.test.tsx \
  src/city/townHall.test.ts
npx vitest run test/era8To10ReleaseRollback.test.ts
npm run typecheck
```

Expected exit 0 before any authorized checkpoint.

Use the exact Task 14 checkpoint block only when authorized; otherwise retain uncommitted.

## Task 15: Node Playwright Performance with Fresh Authored/Control Contexts

**Files:** Create Node measurement script/test and performance evidence; modify package. Task 14 already owns production metrics, harness, fixture, hooks, and rollback control.

**Interfaces:** Consumes Task 14's exact renderer/preload payload, valid harness, fixture servers, and rollback control; produces 3 eras×2 variants×600 frames.

**Dependencies:** Task 14.

- [ ] **Step 1: Write harness/evidence reds**

Static/runtime test requires every §11.5 field: valid props, six fresh contexts,
CPU/browser/viewport/SHA, five 120-frame windows, true frame median/p95, 20 timed
actions per interaction kind with median/p95, body/encoded response bytes, preload
candidates/effect calls/cache misses, renderer memory, metadata bytes, and complete
per-built-model plus aggregate source/shipped mesh/triangle/material/texture/image,
draw/geometry/GLB counts. Task 14 metrics/harness tests are a required green
precondition. Expected Task 15 red: `scripts/measure-era8-10-performance.mjs` and
performance evidence are missing.

- [ ] **Step 2: Import and validate Task 14's observability contract**

Export the Frozen renderer types from Task 14's `cityPerformanceMetrics.tsx`. The
contract consumed here is exactly:

```ts
export interface PerBuildingRendererMetrics {
  readonly meshes: number;
  readonly drawPrimitives: number;
  readonly triangles: number;
  readonly geometryBytes: number;
}
export interface CityRendererMetricsPayload {
  readonly metricsResetToken: string;
  readonly renderSequence: number;
  readonly camera: { readonly x: number; readonly y: number; readonly z: number; readonly zoom: number };
  readonly frameSamplesMs: readonly number[];
  readonly frameMedianMs: number;
  readonly frameP95Ms: number;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly sceneObjects: number;
  readonly memory: { readonly geometries: number; readonly textures: number };
  readonly perBuilding: Readonly<Record<string, PerBuildingRendererMetrics>>;
  readonly preload: {
    readonly candidateCalls: number;
    readonly effectCalls: number;
    readonly candidateUrls: readonly string[];
    readonly effectUrls: readonly string[];
  };
}
```

The TypeScript harness test imports those exact Task 14 types. The Node `.mjs` does not
pretend to import erased TypeScript at runtime; its exact-key runtime schema validator
rejects a missing/extra/mistyped field. `SceneMetrics` keeps its 120 samples, sorts a copy, adds
true median, serializes the raw 120 values, `gl.info.memory`, and traverses each named
`building-*` group to count meshes, geometry groups/draw primitives,
indexed/nonindexed triangles, and attribute/index byte lengths. A group is keyed by its
valid nested `gridworkLateEraAsset.basename` when authored; the rollback control falls
back to the stable skill/Town Hall id or `civicTypeOf(placementId)`, never a display
label. It writes one JSON `data-renderer-metrics` payload every 250 ms; existing dataset
fields remain for old readers.

The 250 ms payload cannot certify the next rendered frame. Install a metrics-only wrapper
around the actual renderer method and publish the lightweight sequence/camera state only
after `gl.render` returns:

```ts
const gl = useThree((state) => state.gl);
const renderSequence = useRef(0);
useEffect(() => {
  const original = gl.render;
  const wrapped: typeof gl.render = (scene, camera) => {
    const result = original.call(gl, scene, camera);
    renderSequence.current += 1;
    const target = targetRef.current;
    if (target) {
      target.dataset.renderSequence = String(renderSequence.current);
      const zoom = "zoom" in camera ? Number(camera.zoom) : 1;
      target.dataset.cameraState = [
        camera.position.x, camera.position.y, camera.position.z, zoom,
      ].join(",");
    }
    return result;
  };
  gl.render = wrapped;
  return () => {
    if (gl.render === wrapped) gl.render = original;
  };
}, [gl, targetRef]);
```

The ordinary `useFrame(({gl,scene,camera},delta) => { ... })` remains the raw-sample
collector. Its throttled payload carries the latest post-render sequence/camera for the
schema, while interaction waits read `data-render-sequence` and `data-camera-state`
directly. A pre-render increment or a 250 ms payload poll fails the next-frame mutation.

Reset handling runs before sampling and returns immediately:

```ts
const requestedReset = target.dataset.metricsReset;
if (requestedReset !== resetToken.current) {
  resetToken.current = requestedReset;
  samples.current = [];
  lastWrite.current = 0;
  target.dataset.sampleFrames = "0";
  target.dataset.rendererMetrics = "";
  target.dataset.metricsResetAck = requestedReset ?? "";
  return;
}
```

The focused red preloads `sampleFrames="120"` plus an old payload, changes reset token, and proves both visible fields synchronously clear and acknowledgement changes before any new sample. Removing the return/clear/ack lets stale 120 satisfy the next window and fails.

```ts
const ordered = [...samples.current].sort((a, b) => a - b);
const middle = Math.floor(ordered.length / 2);
const median = ordered.length === 0
  ? 0
  : ordered.length % 2 === 0
    ? ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2
    : (ordered[middle] ?? 0);
const p95 = ordered[Math.floor((ordered.length - 1) * 0.95)] ?? 0;
const payload: CityRendererMetricsPayload = {
  metricsResetToken: resetToken.current ?? "",
  renderSequence: renderSequence.current,
  camera: {
    x: camera.position.x, y: camera.position.y, z: camera.position.z,
    zoom: "zoom" in camera ? Number(camera.zoom) : 1,
  },
  frameSamplesMs: [...samples.current],
  frameMedianMs: median,
  frameP95Ms: p95,
  drawCalls: gl.info.render.calls,
  triangles: gl.info.render.triangles,
  sceneObjects: countSceneObjects(scene),
  memory: {
    geometries: gl.info.memory.geometries,
    textures: gl.info.memory.textures,
  },
  perBuilding: collectPerBuildingMetrics(scene),
  preload: preloadMetrics.snapshot(),
};
target.dataset.rendererMetrics = JSON.stringify(payload);
```

`collectPerBuildingMetrics`, `countSceneObjects`, and geometry-byte/triangle helpers are pure exported functions unit-tested with indexed/nonindexed/grouped synthetic buildings.

`cityPerformanceMetrics.tsx` provides a sink only when the existing `metricsTargetRef` is present. `usePlacedBuildingPreload` and `useTownHallPreload` read that context, record each helper candidate set and each actual effect/preload call, then preserve current warmed/effect behavior. With no provider they are no-ops. Unit tests prove the existing `3/2/1/1`, civic/Hall behavior and call counts; no new CitySurface prop is introduced.

`CityScene` wraps its existing scene contents and `SceneMetrics` in:

```tsx
{metricsTargetRef ? (
  <CityPerformanceMetricsProvider targetRef={metricsTargetRef}>
    {sceneContents}
    <SceneMetrics targetRef={metricsTargetRef} />
  </CityPerformanceMetricsProvider>
) : sceneContents}
```

The provider does not mount at all without the already-authorized metrics target, so
ordinary production hooks still observe no context and execute their previous branch.

```ts
const metrics = useCityPerformanceMetrics();
const [first = null, second = null, third = null] =
  placedBuildingPreloadUrls(nodeId, stage, activeUrl);
useEffect(() => {
  const candidates = [first, second, third].filter((url): url is string => url !== null);
  metrics?.recordCandidateSet("placed", candidates);
  for (const url of candidates) {
    if (warmed.current.has(url)) continue;
    warmed.current.add(url);
    metrics?.recordEffectCall("placed", url);
    preload(url);
  }
}, [first, second, third, preload, metrics]);
```

Town Hall records `townHallPreloadUrls(modelUrl)` with kind `"townhall"` before its existing URL-keyed effect. The context snapshot stores candidate/effect call counts and exact URL arrays; Node CDP supplies cache misses separately.

- [ ] **Step 3: Verify the Task 14 harness uses only current props**

Parse era query, exact caught-up load, production fonts/styles, then:

```tsx
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import "../../styles.css";
import type { EraId } from "@cr/skill-graph";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CityDevSession } from "../citySession";
import { CitySurface } from "../CitySurface";
import { setCityEra } from "../useCityEra";
import {
  findOpenCell, footprintFor, occupiedCells, type PlacedTransform, type Transform,
} from "../worldLayout";
import { eraBuildableDiscRadius } from "../islandLand";
import { roadCellKey } from "../roads";
import type { CityLoad } from "../types";

const PERFORMANCE_ERAS = ["atomic_age", "information_age", "cyberpunk"] as const;
export type PerformanceEra = (typeof PERFORMANCE_ERAS)[number];
export interface Era8To10PerformanceHarnessProps {
  readonly initialEra: PerformanceEra;
  readonly session: CityDevSession;
  readonly initialLoad: CityLoad;
  readonly restoreEraId: EraId;
}

export interface BrowserPollOptions {
  readonly timeoutMs?: number;
  readonly intervalMs?: number;
}

export async function waitForBrowserValue<T>(
  read: () => T | Promise<T>,
  accepted: (value: T) => boolean,
  label: string,
  { timeoutMs = 30_000, intervalMs = 16 }: BrowserPollOptions = {},
): Promise<T> {
  if (timeoutMs <= 0 || intervalMs <= 0) {
    throw new Error("browser polling timeout and interval must be positive");
  }
  const deadline = performance.now() + timeoutMs;
  let cancelPendingSleep: (() => void) | null = null;
  const sleep = () => new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      cancelPendingSleep = null;
      resolve();
    }, intervalMs);
    cancelPendingSleep = () => {
      window.clearTimeout(timer);
      cancelPendingSleep = null;
      resolve();
    };
  });
  try {
    while (performance.now() < deadline) {
      const value = await read();
      if (accepted(value)) return value;
      await sleep();
    }
    throw new Error(`timed out waiting for ${label}`);
  } finally {
    cancelPendingSleep?.();
  }
}

function replacePlacement(
  load: CityLoad, nodeId: string, replacement: PlacedTransform,
): CityLoad {
  return {
    ...load,
    placements: (load.placements ?? []).map((row) =>
      row.nodeId === nodeId ? replacement : row),
  };
}

function selectedPlacement(load: CityLoad, nodeId: string): PlacedTransform | null {
  return (load.placements ?? []).find((row) => row.nodeId === nodeId) ?? null;
}
function sameTransform(left: Transform, right: Transform): boolean {
  const rotation = (value: number) => ((value % 4) + 4) % 4;
  return left.col === right.col && left.row === right.row &&
    rotation(left.rot) === rotation(right.rot);
}

export function Era8To10PerformanceHarness({
  initialEra,
  session,
  initialLoad,
  restoreEraId,
}: Era8To10PerformanceHarnessProps) {
const [load, setLoad] = useState<CityLoad>(initialLoad);
const latestLoad = useRef(load);
latestLoad.current = load;
const loadCity = useCallback(async (): Promise<CityLoad> => latestLoad.current, []);
const [placementRevision, setPlacementRevision] = useState(0);
const moveSkillAndAcknowledge = useCallback(async (
  nodeId: string,
  target: Transform,
): Promise<void> => {
  const before = selectedPlacement(await session.load(), nodeId);
  if (!before) throw new Error(`selected skill ${nodeId} is not placed`);
  if (sameTransform(before, target)) {
    throw new Error(`move target for ${nodeId} repeats its selected transform`);
  }
  await session.moveSkill(nodeId, target);
  const persisted = await waitForBrowserValue(
    async () => selectedPlacement(await session.load(), nodeId),
    (loaded) => loaded !== null && !sameTransform(loaded, before) && sameTransform(loaded, target),
    `persisted placement transform for ${nodeId}`,
  );
  if (!persisted) throw new Error(`missing persisted placement transform for ${nodeId}`);
  const nextLoad = replacePlacement(latestLoad.current, nodeId, persisted);
  latestLoad.current = nextLoad;
  setLoad(nextLoad);
  setPlacementRevision((value) => value + 1);
}, [session]);
const [era, setEra] = useState<PerformanceEra>(initialEra);
useEffect(() => () => setCityEra(restoreEraId), [restoreEraId]);
const advanceEra = useCallback(() => {
  setEra((current) => {
    const index = PERFORMANCE_ERAS.indexOf(current);
    const next = PERFORMANCE_ERAS[(index + 1) % PERFORMANCE_ERAS.length] as PerformanceEra;
    setCityEra(next);
    return next;
  });
}, []);
usePerformanceMoveBridge({ era, session, moveSkillAndAcknowledge });

return <div data-testid="era8-10-performance-root" data-era={era}
  data-placement-revision={placementRevision}>
  <CitySurface
    archipelagoMetrics
    enableCanvas
    reducedMotion
    eraId={era}
    loadCity={loadCity}
    onMoveSkill={moveSkillAndAcknowledge}
    onMoveCivic={async (...args) => {
      await session.moveCivic(...args);
      setPlacementRevision((value) => value + 1);
    }}
    onMoveTownHall={async (...args) => {
      await session.moveTownHall(...args);
      setPlacementRevision((value) => value + 1);
    }}
  />
  <button data-testid="performance-era-switch" onClick={advanceEra}>Next era</button>
</div>;
}
```

`loadCity` has stable identity while its ref returns the latest load. Tests first prove the
current inline callback is red because an acknowledged move reruns CitySurface's load effect and
closes Buildings; after the ref/callback seam lands, they assert its identity stays stable across
all 20 interactions and `aria-expanded` remains `"true"` after every select/move postcondition.
The dedicated mutation replaces `loadCity={loadCity}` with `loadCity={async () => load}` and must
fail at the disclosure-stays-open assertion.

The fixture sets the real `useCityEra` store before `createPerformanceFixture` loads or moves a
session, updates that store on every scenario era switch, and restores the prior value on failure
or React cleanup. It does not rely on `publishSurveyedLand`: CitySurface clears that
off-ceremony value during cleanup. A red starts from `prehistoric`, attempts a late target, and
observes the real placement refusal; the green proves Atomic, Information, and Cyberpunk session
moves read their matching `eraBuildableDiscRadius` while the disclosure remains open.

The component's callback body is `moveSkillAndAcknowledge(nodeId, target)`; expose it
through this fixture-only, non-UI bridge:

```ts
declare global {
  interface Window {
    __era8To10PerformanceMove?: (nodeId: string) => Promise<Transform>;
  }
}
function usePerformanceMoveBridge({
  era,
  session,
  moveSkillAndAcknowledge,
}: {
  readonly era: PerformanceEra;
  readonly session: CityDevSession;
  readonly moveSkillAndAcknowledge: (nodeId: string, target: Transform) => Promise<void>;
}): void {
useEffect(() => {
  const bridge = async (nodeId: string): Promise<Transform> => {
    const load = await session.load();
    const before = selectedPlacement(load, nodeId);
    if (!before) throw new Error(`selected skill ${nodeId} is not placed`);
    const others = [
      ...(load.placements ?? []).filter((row) => row.nodeId !== nodeId),
      ...(load.civic ?? []),
      ...(load.town_hall ? [load.town_hall] : []),
    ];
    const blocked = occupiedCells([...others, before]);
    for (const road of load.roads ?? []) blocked.add(roadCellKey(road.col, road.row));
    const target = findOpenCell(
      footprintFor(nodeId), blocked, eraBuildableDiscRadius(era), before.rot,
      { nodeId, others },
    );
    if (!target || sameTransform(before, target)) {
      throw new Error(`no distinct legal target for selected skill ${nodeId}`);
    }
    await moveSkillAndAcknowledge(nodeId, target);
    return target;
  };
  window.__era8To10PerformanceMove = bridge;
  return () => {
    if (window.__era8To10PerformanceMove === bridge) {
      delete window.__era8To10PerformanceMove;
    }
  };
}, [era, moveSkillAndAcknowledge, session]);
}
```

The performance-only dispatcher selects its node from the current `session.load()` snapshot,
forms an occupied set from every other skill/civic/Town Hall placement plus roads, and calls
the current layout APIs above. It temporarily includes the selected building's own cells in
`blocked` so the first returned candidate cannot overlap the current transform. Since this is
stricter than the session's ignore-self check, a candidate it produces is a distinct legal
target.

The focused harness test injects a repeated target and a session whose `moveSkill` is a no-op;
both must time out/fail at `persisted placement transform` and leave
`data-placement-revision` unchanged. A real selected skill must show the old loaded transform,
the distinct target in the next `session.load()`, and only then the revision
acknowledgement. The Node timer observes that acknowledgement as its state postcondition
and independently waits for a strictly later renderer sequence, so the action cannot
pre-consume the frame being timed. Test-only era button changes the existing `eraId`
prop.

- [ ] **Step 4: Start the Task 14 fixture through supported Vite APIs**

`apps/web/era8-10-performance.html` loads
`/src/city/three/era8To10PerformanceEntry.tsx`. The entry and
`Era8To10PerformanceHarness.tsx` live under `apps/web/src`, which the current web tsconfig
includes through `src/**/*` with `jsx: "react-jsx"`; `npm run typecheck` therefore checks both.
`apps/web/era8-10-performance.vite.config.mjs` is a plain ESM Vite config that imports and
validates the real web React plugin, `browserGlobalDefine`, dedupe, and `server.fs.allow` values
at runtime; no un-included TypeScript config file sits outside the web project. The Node driver
invokes:

```ts
const server = await createServer({
  configFile: resolve(root, "apps/web/era8-10-performance.vite.config.mjs"),
  root: resolve(root, "apps/web"),
  server: { host: "127.0.0.1", port: 0 },
});
await server.listen();
const origin = server.resolvedUrls?.local[0];
if (!origin) throw new Error("performance Vite server has no local origin");
const performanceUrl = (serverOrigin, scenarioEra) => {
  const url = new URL("/era8-10-performance.html", serverOrigin);
  url.searchParams.set("era", scenarioEra);
  return url.href;
};
const url = performanceUrl(origin, era);
await fetch(url).then((response) => {
  if (!response.ok) throw new Error(`performance fixture readiness failed: ${response.status}`);
});
```

It starts authored/control fixture roots with that same config and URL, never a mock resolver or
a `.tsx` entry outside the web project.

- [ ] **Step 5: Implement Node orchestration**

Record Git SHA/os.cpus/OS; prepare rollback control; start two programmatic Vite servers; launch Chromium. Core function:

```js
async function measureScenario(
  browser, origin, era, variant, environment, metadata, metadataBytes,
) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 580 },
    deviceScaleFactor: 1,
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  const network = new Map();
  const inflight = new Set();
  let lastNetworkActivity = Date.now();
  cdp.on("Network.requestWillBeSent", ({ requestId }) => {
    inflight.add(requestId);
    lastNetworkActivity = Date.now();
  });
  cdp.on("Network.responseReceived", ({ requestId, response }) => {
    network.set(requestId, {
      url: response.url,
      status: response.status,
      fromDiskCache: response.fromDiskCache === true,
      fromServiceWorker: response.fromServiceWorker === true,
      encodedBytes: 0,
    });
  });
  cdp.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
    const row = network.get(requestId);
    if (row) row.encodedBytes = encodedDataLength;
    inflight.delete(requestId);
    lastNetworkActivity = Date.now();
  });
  cdp.on("Network.loadingFailed", ({ requestId }) => {
    inflight.delete(requestId);
    lastNetworkActivity = Date.now();
  });
  const bodyPromises = [];
  page.on("response", (response) => {
    bodyPromises.push((async () => {
      const body = await response.body();
      return { url: response.url(), status: response.status(), bodyBytes: body.byteLength };
    })());
  });
  try {
    await page.goto(performanceUrl(origin, era), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const target = page.locator(".city-viewport");
    await waitForValue(
      async () => Number(await target.getAttribute("data-triangles")),
      (value) => value > 0,
      "renderer triangles",
    );
    await waitForNetworkQuiet(
      () => inflight.size,
      () => lastNetworkActivity,
      500,
      30_000,
      "cold",
    );
    const coldBodyCount = bodyPromises.length;
    const coldBodies = deepFreeze(
      await Promise.all(bodyPromises.slice(0, coldBodyCount)),
    );
    const coldNetwork = deepFreeze(
      [...network.values()].map((row) => ({ ...row })),
    );
    const cold = deepFreeze(summarizeColdGlbs(coldBodies, coldNetwork));
    const coldPreload = deepFreeze(JSON.parse(
      await target.getAttribute("data-renderer-metrics") ?? "null",
    )?.preload);
    if (!coldPreload) throw new Error("cold preload metrics missing");
    const warmupToken = `${variant}-${era}-warmup-${randomUUID()}`;
    await collectFrameWindow(target, warmupToken, "fixed 120-frame warm-up");
    const windows = [];
    const frameSamples = [];
    for (let index = 0; index < 5; index += 1) {
      const token = `${variant}-${era}-${index}-${randomUUID()}`;
      const payload = await collectFrameWindow(target, token, `metrics window ${index}`);
      windows.push(payload);
      frameSamples.push(...payload.frameSamplesMs);
    }
    const interactions = await measureInteractions(page);
    await waitForNetworkQuiet(
      () => inflight.size,
      () => lastNetworkActivity,
      500,
      30_000,
      "post-interaction",
    );
    const totalBodyCount = bodyPromises.length;
    const bodies = await Promise.all(bodyPromises.slice(0, totalBodyCount));
    const networkRows = [...network.values()].map((row) => ({ ...row }));
    const postInteractionMetrics = JSON.parse(
      await target.getAttribute("data-renderer-metrics") ?? "null",
    );
    if (!postInteractionMetrics?.preload) {
      throw new Error("post-interaction preload metrics missing");
    }
    const finalWindow = windows.at(-1);
    if (!finalWindow) throw new Error("no renderer metrics window");
    const observedBuiltMarkers = await page.evaluate(() =>
      JSON.parse(document.querySelector("[data-era8-10-built-markers]")?.getAttribute(
        "data-era8-10-built-markers",
      ) ?? "[]"),
    );
    const { perBuiltModel, aggregate } = joinBuiltModelMetrics(
      metadata, finalWindow.perBuilding, era, observedBuiltMarkers,
    );
    return {
      era, variant, contextId: randomUUID(), environment,
      frameWindows: windows,
      frameMs: {
        samples: frameSamples.length,
        median: median(frameSamples),
        p95: percentile(frameSamples, 0.95),
      },
      interactions,
      responseBytes: {
        body: bodies.reduce((sum, row) => sum + row.bodyBytes, 0),
        encoded: networkRows.reduce((sum, row) => sum + row.encodedBytes, 0),
      },
      metadataBytes,
      cacheMisses: networkRows.filter((row) =>
        /\.glb(?:\?|$)/.test(row.url) && !row.fromDiskCache && !row.fromServiceWorker).length,
      cold,
      coldPreload,
      preload: postInteractionMetrics.preload,
      rendererMemory: finalWindow.memory,
      perBuiltModel,
      aggregate,
    };
  } finally {
    await context.close();
  }
}
```

`performanceUrl(origin, era)` is the sole URL constructor used for server readiness and every
`measureScenario` call. The harness test asserts it returns exactly
`<origin>/era8-10-performance.html?era=<era>` and rejects a caller that appends `/?era` to a
complete HTML URL.

The caller creates one context per call and enumerates the exact Cartesian product:

```js
const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const metadataRaw = await readFile(new URL(
  "../apps/web/src/city/art/building-sources/era-08-10-gridwork-export-metadata.json",
  import.meta.url,
));
const metadata = JSON.parse(metadataRaw.toString("utf8"));
const gitSha = (await execFileAsync(
  "git", ["rev-parse", "HEAD"], { cwd: repositoryRoot },
)).stdout.trim();
const cpuRows = cpus();
const environment = {
  cpu: cpuRows[0]?.model ?? "unknown",
  logicalCores: cpuRows.length,
  os: `${platform()}-${arch()}`,
  browser: `chromium ${browser.version()}`,
  viewport: "1024x580",
  dpr: 1,
  gitSha,
};
const variants = [
  ["authored", authoredUrl],
  ["rollback-control", controlUrl],
];
const scenarios = await withTimeout((async () => {
  const rows = [];
  for (const [variant, origin] of variants) {
    for (const era of ["atomic_age", "information_age", "cyberpunk"]) {
      rows.push(await measureScenario(
        browser, origin, era, variant, environment, metadata, metadataRaw.byteLength,
      ));
    }
  }
  return rows;
})(), 20 * 60_000, "all six performance scenarios");
if (scenarios.length !== 6 || new Set(scenarios.map((row) => row.contextId)).size !== 6) {
  throw new Error("performance run did not use six fresh contexts");
}
for (const row of scenarios) {
  if (row.frameWindows.length !== 5 || row.frameMs.samples !== 600) {
    throw new Error(`${row.variant}/${row.era} is not five fresh 120-frame windows`);
  }
}
const [flag, outputPath, ...extra] = process.argv.slice(2);
if (flag !== "--out" || !outputPath || extra.length !== 0) {
  throw new Error("usage: measure-era8-10-performance.mjs --out <file>");
}
await writeFile(
  outputPath,
  `${JSON.stringify(stableValue({ schema: 1, scenarios }), null, 2)}\n`,
  "utf8",
);

function withTimeout(promise, milliseconds, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`timed out measuring ${label}`)),
      milliseconds,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}
```

The harness test wraps `browser.newContext`, records each returned object identity and
its `close` call, and requires exactly six calls, six distinct objects, and six closes.
Reusing one context while minting fresh `contextId` strings is therefore red under
`EVD012`; the IDs are report labels, not the freshness proof.

```js
async function waitForValue(read, accepted, label, intervalMs = 100) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const value = await read();
    if (accepted(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`timed out waiting for ${label}`);
}
async function collectFrameWindow(target, token, label) {
  await target.evaluate((element, value) => {
    element.dataset.metricsReset = value;
  }, token);
  await waitForValue(
    async () => ({
      ack: await target.getAttribute("data-metrics-reset-ack"),
      samples: Number(await target.getAttribute("data-sample-frames")),
      payload: await target.getAttribute("data-renderer-metrics"),
    }),
    (value) => value.ack === token && value.samples === 0 && value.payload === "",
    `${label} reset acknowledgement`,
  );
  const result = await waitForValue(
    async () => ({
      samples: Number(await target.getAttribute("data-sample-frames")),
      payload: JSON.parse(
        await target.getAttribute("data-renderer-metrics") ?? "null",
      ),
    }),
    (value) =>
      value.samples === 120 &&
      value.payload?.metricsResetToken === token &&
      value.payload?.frameSamplesMs?.length === 120,
    label,
  );
  if (!result.payload || result.payload.frameSamplesMs.length !== 120) {
    throw new Error(`${label} did not contain 120 fresh samples`);
  }
  return result.payload;
}
function percentile(values, ratio) {
  if (values.length === 0) throw new Error("percentile requires samples");
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))];
}
function median(values) {
  if (values.length === 0) throw new Error("median requires samples");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}
async function waitForNetworkQuiet(inflight, lastActivity, quietMs, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (inflight() === 0 && Date.now() - lastActivity() >= quietMs) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${label} network did not become quiet`);
}
function summarizeColdGlbs(bodies, networkRows) {
  const result = Object.fromEntries(["site", "construction", "built"].map((stage) => [
    stage, { requests: 0, bodyBytes: 0, encodedBytes: 0, cacheMisses: 0 },
  ]));
  const bodyByUrl = new Map(bodies.map((row) => [row.url, row.bodyBytes]));
  for (const row of networkRows) {
    const match = /-(site|construction|built)\.glb(?:\?|$)/.exec(row.url);
    if (!match) continue;
    const bucket = result[match[1]];
    bucket.requests += 1;
    bucket.bodyBytes += bodyByUrl.get(row.url) ?? 0;
    bucket.encodedBytes += row.encodedBytes;
    if (!row.fromDiskCache && !row.fromServiceWorker) bucket.cacheMisses += 1;
  }
  return result;
}
function joinBuiltModelMetrics(metadata, perBuilding, era, observedBuiltMarkers) {
  const rows = metadata.outputs.filter(
    (row) => row.runtimeEra === era && row.stage === "built",
  );
  const expected = new Set(rows.map((row) => row.seedInput));
  const observed = new Set(observedBuiltMarkers);
  if (
    observed.size !== observedBuiltMarkers.length ||
    expected.size !== rows.length ||
    JSON.stringify([...observed].sort()) !== JSON.stringify([...expected].sort())
  ) {
    throw new Error(`current-era built marker census differs for ${era}`);
  }
  const perBuiltModel = {};
  for (const row of rows) {
    const measured = perBuilding[row.seedInput] ?? perBuilding[row.runtimeId];
    if (!measured) throw new Error(`missing renderer metrics for ${row.seedInput}`);
    perBuiltModel[row.seedInput] = {
      drawPrimitives: measured.drawPrimitives,
      meshes: measured.meshes,
      triangles: measured.triangles,
      geometryBytes: measured.geometryBytes,
      glbBytes: row.bytes,
      sourceMeshes: row.sourceMeshes,
      shippedMeshes: row.shippedMeshes,
      sourceTriangles: row.sourceTriangles,
      shippedTriangles: row.shippedTriangles,
      materials: row.materialCount,
      textures: row.textureCount,
      images: row.embeddedImageCount,
    };
  }
  const aggregate = Object.values(perBuiltModel).reduce(
    (sum, row) => ({
      drawPrimitives: sum.drawPrimitives + row.drawPrimitives,
      meshes: sum.meshes + row.meshes,
      triangles: sum.triangles + row.triangles,
      geometryBytes: sum.geometryBytes + row.geometryBytes,
      glbBytes: sum.glbBytes + row.glbBytes,
      sourceMeshes: sum.sourceMeshes + row.sourceMeshes,
      shippedMeshes: sum.shippedMeshes + row.shippedMeshes,
      sourceTriangles: sum.sourceTriangles + row.sourceTriangles,
      shippedTriangles: sum.shippedTriangles + row.shippedTriangles,
      materials: sum.materials + row.materials,
      textures: sum.textures + row.textures,
      images: sum.images + row.images,
    }),
    {
      drawPrimitives: 0, meshes: 0, triangles: 0, geometryBytes: 0, glbBytes: 0,
      sourceMeshes: 0, shippedMeshes: 0, sourceTriangles: 0, shippedTriangles: 0,
      materials: 0, textures: 0, images: 0,
    },
  );
  return { perBuiltModel, aggregate };
}
```

```js
async function measureInteractions(page) {
  const canvas = page.locator(".city-viewport canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("city canvas has no box");
  const samples = { pan: [], zoom: [], select: [], move: [], eraSwitch: [] };
  const target = page.locator(".city-viewport");
  const renderedSequence = async () =>
    Number(await target.getAttribute("data-render-sequence"));
  const cameraState = async () => {
    const values = (await target.getAttribute("data-camera-state") ?? "")
      .split(",").map(Number);
    if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
      throw new Error("post-render camera state is missing");
    }
    return values;
  };
  const waitForNextRenderedFrame = (after) =>
    target.evaluate((element, minimum) => new Promise((resolve, reject) => {
      const read = () => Number(element.dataset.renderSequence);
      if (read() > minimum) {
        resolve(read());
        return;
      }
      let timer = 0;
      let settled = false;
      const finish = () => {
        if (settled || read() <= minimum) return;
        settled = true;
        window.clearTimeout(timer);
        observer.disconnect();
        resolve(read());
      };
      const observer = new MutationObserver(() => {
        finish();
      });
      timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        reject(new Error(`timed out after rendered sequence ${minimum}`));
      }, 30_000);
      observer.observe(element, {
        attributes: true,
        attributeFilter: ["data-render-sequence"],
      });
      finish();
    }), after);
  const timed = async (kind, action, postcondition) => {
    if (!Number.isFinite(await renderedSequence())) {
      throw new Error(`no rendered sequence before ${kind}`);
    }
    const start = performance.now();
    await action();
    await waitForValue(postcondition, Boolean, `${kind} state postcondition`, 5);
    const postconditionSequence = await renderedSequence();
    await waitForNextRenderedFrame(postconditionSequence);
    samples[kind].push(performance.now() - start);
  };
  const buildingsToggle = page.getByRole("button", { name: /Buildings/ });
  const rosterRows =
    page.locator('button.city-plot[data-node-id]:not([data-node-id="town-hall"])');
  if (await buildingsToggle.getAttribute("aria-expanded") !== "true") {
    await buildingsToggle.click();
  }
  await waitForValue(async () => await rosterRows.count(), (count) => count >= 2,
    "Buildings roster mounted", 5);
  if (await buildingsToggle.getAttribute("aria-expanded") !== "true") {
    throw new Error("Buildings disclosure did not remain expanded after mount");
  }
  for (let index = 0; index < 20; index += 1) {
    const beforePan = await cameraState();
    await timed("pan", async () => {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width * (index % 2 === 0 ? 0.55 : 0.45),
        box.y + box.height * 0.5,
      );
      await page.mouse.up();
    }, async () => {
      const camera = await cameraState();
      return camera[0] !== beforePan[0] || camera[2] !== beforePan[2];
    });
    const beforeZoom = await cameraState();
    await timed("zoom", () => page.mouse.wheel(0, index % 2 === 0 ? -120 : 120),
      async () => JSON.stringify(await cameraState()) !== JSON.stringify(beforeZoom));
    const rosterCount = await rosterRows.count();
    if (
      await buildingsToggle.getAttribute("aria-expanded") !== "true" ||
      rosterCount < 2
    ) {
      throw new Error("performance roster is not mounted before select");
    }
    let roster = rosterRows.nth(index % rosterCount);
    if (await roster.getAttribute("aria-pressed") === "true") {
      roster = rosterRows.nth((index + 1) % rosterCount);
    }
    if (await roster.getAttribute("aria-pressed") === "true") {
      throw new Error("performance select postcondition was already true");
    }
    await timed("select", () => roster.click(),
      async () =>
        await buildingsToggle.getAttribute("aria-expanded") === "true" &&
        await roster.isVisible() &&
        await roster.getAttribute("aria-pressed") === "true");
    const nodeId = await roster.getAttribute("data-node-id");
    if (!nodeId) throw new Error("selected performance roster entry has no node id");
    const root = page.getByTestId("era8-10-performance-root");
    const beforeMove = Number(await root.getAttribute("data-placement-revision"));
    let moveTarget = null;
    await timed("move", async () => {
      const target = await page.evaluate(async (selectedNodeId) => {
        const move = window.__era8To10PerformanceMove;
        if (!move) throw new Error("performance move bridge missing");
        return move(selectedNodeId);
      }, nodeId);
      if (!target) throw new Error(`move bridge returned no target for ${nodeId}`);
      moveTarget = target;
    }, async () =>
      await buildingsToggle.getAttribute("aria-expanded") === "true" &&
      await roster.isVisible() &&
      Number(await root.getAttribute("data-placement-revision")) === beforeMove + 1 &&
      await page.evaluate(({ id, target }) => {
        const marker = document.querySelector(`[data-built-node-id="${id}"]`);
        const rendered = marker?.getAttribute("data-mounted-transform");
        return rendered === JSON.stringify(target);
      }, { id: nodeId, target: moveTarget }));
    const beforeEra = await page.getByTestId("era8-10-performance-root").getAttribute("data-era");
    await timed("eraSwitch", () => page.getByTestId("performance-era-switch").click(),
      async () => await page.getByTestId("era8-10-performance-root").getAttribute("data-era") !== beforeEra);
  }
  return Object.fromEntries(Object.entries(samples).map(([kind, values]) => [
    kind, { count: values.length, median: median(values), p95: percentile(values, 0.95) },
  ]));
}
```

The harness leaves Buildings expanded for all 20 select/move samples. It reads `aria-expanded`,
opens only when closed, and waits for mounted roster rows before the loop; it never toggles the
disclosure blindly. `EVD038` replaces that gate with an unconditional click and must fail the
second iteration at `performance roster is not mounted before select`. The harness owns only the
visible era-switch button and the non-UI move bridge above; it adds no
CitySurface prop or production control. Each scenario measures 20 actions for each of five
interaction kinds. Six calls (3×2), exactly 600 frames each. Join metadata
GLB/source-shipped mesh/triangle/material/texture/image counts to `perBuilding` by
canonical model basename, then emit complete per-built-model and aggregate renderer,
geometry, GLB, and metadata records. Canonical JSON only with
`--out`. One outer `Promise.race` bounds all six scenarios at `20*60_000`; close
browser/servers/control copy in `finally`.

The move bridge writes `latestLoad.current = nextLoad` synchronously before `setLoad(nextLoad)` or
any refresh. The timer accepts a move only after the mounted built-node marker carries the persisted
target transform and then observes a later render sequence. A race mutation moves the ref write
after `setLoad` (or checks revision alone); it must fail at `data-mounted-transform`, proving a
session/revision acknowledgement cannot substitute for rendered state.

- [ ] **Step 6: Wire/run/mutate**

Add:

```json
"measure:era8-10": "node scripts/measure-era8-10-performance.mjs --out \"${TMPDIR:-/tmp}/cr-era8-10-performance.json\""
```

Run the command in one owned shell that creates
`performance_root="$(mktemp -d "${TMPDIR:-/tmp}/cr-era8-10-performance.XXXXXX")"` and
`performance_output="$performance_root/performance.json"`, installs
`trap 'rm -rf "$performance_root"' EXIT`, invokes the measurement script directly with
`--out "$performance_output"`, then explicitly parses/asserts schema, six scenarios, all
frame/interaction/metrics fields, and SHA-256 before exit. The Node script itself validates the
complete schema, prints a human-review summary plus the output path and SHA-256, and never writes
under `docs/`. Expected six
same-hardware/SHA/browser rows, unique contexts, 600 samples, metrics. Run
`EVD012`–`EVD035` and `EVD038` one at a time; restore each mutation and rerun green.

```bash
npm run measure:era8-10
npx vitest run \
  test/era8To10PerformanceHarness.test.ts \
  test/era8To10ReleaseRollback.test.ts
npm run typecheck
```

All three commands must exit 0 before the conditional Task 15 checkpoint. The rollback
test at this point requires every Task 15 script/test/config/evidence path to exist and
repeats both release and performance-control two-way Set assertions.
`performance.json` is reviewed as evidence D, then removed before checkpoint/final scope checks;
it must never enter the raw 164-path publish union.

- [ ] **Step 7: Conditional checkpoint**

Use the exact Task 15 checkpoint block only when authorized; otherwise retain uncommitted.

## Task 16: Mutation Campaign, Complete Scope, Full Gates, and Itemized Acceptance

**Files:** Create scope reporter, `test/era8To10MutationCoverage.test.ts`, evidence test;
finalize evidence/report; include the unchanged approved spec and this plan in the final
authorized documentation checkpoint.

**Interfaces:** Produces committed-since-base/unstaged/staged/untracked content/stat report
and 35 acceptance verdicts.

**Dependencies:** Tasks1–15.

- [ ] **Step 1: Write scope/evidence reds**

Require exact metadata/HTTP/fit/three capacity partitions/`99 + G` gallery-aware frames/
six-performance/all atomic mutation IDs/35-report
populations and separate committed-since-base/unstaged/staged/untracked evidence.
Expected red: `final-scope.json is missing`.

- [ ] **Step 2: Implement complete scope reporter**

```js
async function git(args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd: ROOT, encoding: options.encoding ?? "utf8", maxBuffer: 64e6 },
      (error, stdout, stderr) => error && !options.allowDiff ? reject(error) : resolve({ stdout, stderr, code: error?.code ?? 0 }));
  });
}
export async function collectScope() {
  const base = (await git(["merge-base", "HEAD", "origin/integration"])).stdout.trim();
  if (!base) throw new Error("could not derive merge base with origin/integration");
  if (FINAL_PUBLISH_PATHS.length !== 164) {
    throw new Error("final publish manifest count drifted");
  }
  const [
    status,
    committedDiff, committedStats, committedNames,
    unstagedDiff, unstagedStats, unstagedNames,
    stagedDiff, stagedStats, stagedNames,
    others,
  ] = await Promise.all([
    git(["status","--porcelain=v2","-z","--untracked-files=all"]),
    git(["diff","--binary","--no-ext-diff",`${base}..HEAD`]),
    git(["diff","--numstat",`${base}..HEAD`]),
    git(["diff","--name-only","-z",`${base}..HEAD`]),
    git(["diff","--binary","--no-ext-diff"]),
    git(["diff","--numstat"]),
    git(["diff","--name-only","-z"]),
    git(["diff","--cached","--binary","--no-ext-diff"]),
    git(["diff","--cached","--numstat"]),
    git(["diff","--cached","--name-only","-z"]),
    git(["ls-files","--others","--exclude-standard","-z"]),
  ]);
  const untracked = [];
  for (const path of others.stdout.split("\0").filter(Boolean).sort()) {
    const bytes = await readFile(join(ROOT, path));
    const text = !bytes.includes(0);
    const content = text
      ? (await git(["diff","--no-index","--", "/dev/null", path], { allowDiff: true })).stdout
      : null;
    untracked.push({
      path, bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      kind: text ? "text" : "binary", content,
    });
  }
  const names = (value) => value.split("\0").filter(Boolean);
  const dResidue = [
    ...names(committedNames.stdout),
    ...names(unstagedNames.stdout),
    ...names(stagedNames.stdout),
    ...untracked.map((row) => row.path),
  ].filter((path) =>
    path.startsWith("docs/superpowers/evidence/2026-08-07-era-08-10-runtime-wiring/"),
  );
  if (dResidue.length > 0) {
    throw new Error(`capture-only evidence residue before publish scope: ${dResidue.join(", ")}`);
  }
  const observedPaths = [...new Set([
    ...names(committedNames.stdout),
    ...names(unstagedNames.stdout),
    ...names(stagedNames.stdout),
    ...untracked.map((row) => row.path),
  ])].sort();
  assertReleasePathSet("final raw execution-base publish union", FINAL_PUBLISH_PATHS, observedPaths);
  return {
    statusPorcelainV2: status.stdout,
    committedSinceBase: {
      base, diff: committedDiff.stdout, numstat: committedStats.stdout,
    },
    unstaged: { diff: unstagedDiff.stdout, numstat: unstagedStats.stdout },
    staged: { diff: stagedDiff.stdout, numstat: stagedStats.stdout },
    untracked, observedPaths,
  };
}
```

Import `FINAL_PUBLISH_PATHS` and `assertReleasePathSet` from Task 11's
`scripts/era8-10-release-paths.mjs`; the reporter prints its independently derived
`git merge-base HEAD origin/integration` SHA.
Serialize this result plus aggregate counts/bytes per population and globally. A fully committed
implementation, a fully uncommitted implementation, and a mixed checkpoint state all produce the
same normalized execution-base union; no tracked-only, index-only, or status-only assumption.

- [ ] **Step 3: Execute every atomic mutation ID**

Disposable only; record exact atomic ID/mutation/command/final assertion/red/restoration/green.
The canonical registry is the exact union of `SRC001–SRC037`, `EXP001–EXP062` plus `EXP009A`,
`CND001–CND006`, `TX001–TX021`, `RND001–RND004`, `P000–P088`, `RUN001–RUN009` plus
`RUN011–RUN020`, `PREP001–PREP004`, `SURF001–SURF006`, `REG001–REG016`, `PER001–PER006`,
`EVD001–EVD038`, `RBK001–RBK008`, and `SCP001–SCP008`: 325 distinct IDs. The executed-record
set and count must equal that union in both directions, so omission, duplication, or substitution
fails by ID; no stale historical total is accepted. Run
`npx vitest run test/era8To10MutationCoverage.test.ts`; expected executed record count and ID
set exactly equal the registry, with no duplicate/compound substitute.

- [ ] **Step 4: Run full verification**

Run each independently and record its own exit/output:

1. `npm run setup:browsers` → exit 0, Chromium installed/already present.
2. `stat -f '%z' apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html` → exit 0, `1928383`.
3. `shasum -a 256 apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html` → exit 0, approved digest.
4. `npm run format:check` → exit 0, Biome formatting check passed.
5. `npm run lint` → exit 0, no lint diagnostics.
6. `npm run typecheck` → exit 0, all project references checked.
7. `npm run build -w @cr/web` → exit 0, Vite production build completed.
8. `npm run check:era7-models` → exit 0, Era 7 reproduction unchanged.
9. `npm run check:era8-10-models` → exit 0, 87 GLB hashes plus metadata exact-set validation match.
9a. `npx vitest run --config vitest.config.ts test/generateEra8To10AssetManifest.test.ts --testTimeout=30000` → exit 0, generator unit test collects and passes.
10. `npm run test:era7-exporter` → exit 0, serialized Era 7 safety suite passed.
11. `npm run test:era8-10-exporter` → exit 0, staged publication plus 87-state staged fidelity suite passed.
12. `npm test -w @cr/web -- src/city/era8To10BuildingModels.test.ts src/city/era8To10MeshBudget.test.ts src/city/era8To10ModelFit.test.ts` → exit 0, source/census/static/fit assertions passed.
13. `npx vitest run --config vitest.browser.config.ts apps/web/src/city/era8To10AssetManifest.browser.test.tsx --testTimeout=30000` → exit 0, manifest browser census passed.
14. `npx vitest run --config vitest.browser.config.ts apps/web/src/city/three/lateEraGridworkMaterialFidelity.browser.test.tsx` → exit 0, all production preparation surfaces passed.
15. `npx vitest run test/era8To10ExporterReproductionGate.test.ts test/era8To10ReleaseRollback.test.ts test/era8To10PerformanceHarness.test.ts test/era8To10MutationCoverage.test.ts test/era8To10EvidenceCompleteness.test.ts` → exit 0, five root guards passed.
16. `npm run test:unit` → exit 0, full unit suite reports no failed tests.
17. `npm run test:browser` → exit 0, full browser suite reports no failed tests.
18. `npm run check:graph` → exit 0, graph invariants passed.
19. `npm run check:lessons` → exit 0, lesson error tier passed.
20. `npm run check:infra` → exit 0, infra type/route/synth checks passed.
21. `npx vitest run --config vitest.era8-10-evidence.config.ts` → exit 0, default HTTP/visual assertions pass and write zero files.
22. `sh -c 'set -euo pipefail; root="docs/superpowers/evidence/2026-08-07-era-08-10-runtime-wiring"; trap "rm -rf \"$root\"" EXIT; VITE_ERA8_10_CAPTURE=1 npx vitest run --config vitest.era8-10-evidence.config.ts; test -f "$root/http-87.json"; test -f "$root/plot-fit.json"'` → exit 0, exact `99 + G` capture census is inspected during its Task13-owned lifetime and removed before command 25.
23. `npm run rehearse:era8-10-rollback` → exit 0, isolated rollback passed and active digest unchanged.
24. `sh -c 'set -euo pipefail; root="$(mktemp -d "${TMPDIR:-/tmp}/cr-era8-10-performance.XXXXXX")"; output="$root/performance.json"; trap "rm -rf \"$root\"" EXIT; node scripts/measure-era8-10-performance.mjs --out "$output"; node --input-type=module - "$output" <<"NODE"\nimport { createHash } from "node:crypto"; import { readFile } from "node:fs/promises"; const bytes = await readFile(process.argv[2]); const value = JSON.parse(bytes); if (value.schema !== 1 || value.scenarios?.length !== 6) throw new Error("performance schema/scenario assertion failed"); console.log(createHash("sha256").update(bytes).digest("hex"));\nNODE'` → exit 0, six fresh 600-frame scenarios are schema-inspected before trap cleanup with no D-only residue.
25. `test ! -e docs/superpowers/evidence/2026-08-07-era-08-10-runtime-wiring && node scripts/report-era8-10-scope.mjs` → exit 0,
    no D evidence residue exists and committed-since-base/unstaged/staged/untracked populations emitted.

Staged fidelity owns 30 minutes, spatial cases 30/60 seconds each, and performance 20 minutes; no default timeout can mask an inner wait.

- [ ] **Step 5: Human review and 35 verdicts**

Read 39 rows, `99 + G` frames, three capacity partitions, gallery set census, and performance
pairs. Each report item names evidence type/file/command/frame and ACCEPTED or NOT DONE. No
evidence substitution.

- [ ] **Step 6: Final Git/direct-untracked checks**

```bash
git diff --check
git diff --cached --check
git status --short --untracked-files=all
base="$(git merge-base HEAD origin/integration)"
printf 'Final scope merge base: %s\n' "$base"
git diff "$base"..HEAD --name-status
git diff --name-status
git diff --cached --name-status
node scripts/report-era8-10-scope.mjs
```

Scope accounts for committed-since-base, unstaged, staged, and untracked
populations/content/stats and no residue.

- [ ] **Step 7: Evidence green/mutations**

Run evidence test. Remove one item from each population independently; fail by name, restore.

- [ ] **Step 8: Conditional checkpoint**

Use the exact Task 16 checkpoint block only when authorized; otherwise leave all uncommitted.

## Exact Red/Green Command Matrix

Each command runs once immediately after its task's test is written (expected red shown), and again after minimal implementation (expected exit 0).

```bash
# 1 — red: ERR_MODULE_NOT_FOUND plus canonical source owner missing
npx vitest run --config vitest.era8-10-exporter.config.ts
npm test -w @cr/web -- src/city/era8To10BuildingModels.test.ts

# 2 — red: ERA_PLANS/inspectSourceContract missing
npx vitest run --config vitest.era8-10-exporter.config.ts -t "source contract|legacy|Era 10"
npm test -w @cr/web -- src/city/era8To10BuildingModels.test.ts

# 3 — red: buildDisposableThreeBundle missing
npx vitest run --config vitest.era8-10-exporter.config.ts -t "ordered image|real Scene|geometry|semantic|GLB"

# 4 — red: acquireDestinationLock missing
npx vitest run --config vitest.era8-10-exporter.config.ts -t "owned stage|destination lock|manifest last|repair|interruption"

# 5 — red: parseArgs missing
npx vitest run --config vitest.era8-10-exporter.config.ts -t "CLI|scratch|custom safety|read-only check"

# 6 — red: runtime manifest guard missing
npx vitest run --config vitest.era8-10-exporter.config.ts -t "manifest guard|release scope"
npx vitest run --config vitest.config.ts \
  test/generateEra8To10AssetManifest.test.ts --testTimeout=30000

# 7 — red: lateEraGridworkMaterial module missing
npm test -w @cr/web -- src/city/three/lateEraGridworkMaterial.test.ts

# 8 — red: pane opacity expected 0.17, current 0.5; Toon/Basic frost failures
npm test -w @cr/web -- \
  src/city/three/modelPreparation.test.ts \
  src/city/three/lateEraLiveMaterials.test.tsx \
  src/city/three/lateEraGhostMaterials.test.ts \
  src/city/three/winterFrost.test.ts

# 9 — red: era8To10RegistryPlan module missing
npm test -w @cr/web -- src/city/era8To10BuildingModels.test.ts -t "registry plan"

# 10 — red: runStagedFidelityGate missing, then candidate output missing fun-4-site.glb
npx vitest run --config vitest.era8-10-exporter.config.ts \
  -t "shipping staged fidelity|comparison bare=false|metadata last"
candidate="$(mktemp -d "${TMPDIR:-/tmp}/cr-era8-10-red10.XXXXXX")"
trap 'rm -rf "$candidate"' EXIT
ERA8_10_CANDIDATE_ROOT="$candidate" \
npm test -w @cr/web -- \
  src/city/era8To10BuildingModels.test.ts \
  src/city/era8To10MeshBudget.test.ts \
  src/city/era8To10ModelFit.test.ts

# 11 — red: late eager/menu/Hall assertions before production files
npm test -w @cr/web -- \
  src/city/era8To10BuildingModels.test.ts src/city/buildingAssets.test.ts \
  src/city/civicBuildings.test.ts src/city/currentEraCivics.test.tsx \
  src/city/civicIdentity.currentEra.test.ts src/city/inheritedCivics.test.ts \
  src/city/eraDressing.test.tsx src/city/eraSurfaces.test.tsx \
  src/city/eraTwo.reachability.test.ts src/city/three/unmappedBuilding.test.ts \
  src/city/three/placedBuildingPreload.test.tsx src/city/townHall.test.ts \
  src/city/civicLedgerPlacement.test.ts src/city/signedInCityPersists.test.tsx
npx vitest run --config vitest.era8-10-exporter.config.ts -t "shipping staged fidelity|comparison bare=false|metadata last"
npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/era8To10AssetManifest.browser.test.tsx --testTimeout=30000
# The fidelity command above is a required green precondition; the eager/menu command is Task 11's red.

# 11a — browser manifest URL-census red/green (exact executable sequence)
set -euo pipefail
manifest="apps/web/src/city/art/era8To10AssetManifest.generated.ts"
metadata="apps/web/src/city/art/building-sources/era-08-10-gridwork-export-metadata.json"
red_log="$(mktemp "${TMPDIR:-/tmp}/cr-era8-10-manifest-matrix-red.XXXXXX")"
original_backup="$(mktemp "${TMPDIR:-/tmp}/cr-era8-10-manifest-original.XXXXXX")"
generated_backup="$(mktemp "${TMPDIR:-/tmp}/cr-era8-10-manifest-generated.XXXXXX")"
had_original=0
keep_generated=0
if [ -e "$manifest" ]; then cp "$manifest" "$original_backup"; had_original=1; fi
cleanup_matrix_manifest() {
  if [ "$keep_generated" -ne 1 ]; then
    if [ "$had_original" -eq 1 ]; then cp "$original_backup" "$manifest"; else rm -f "$manifest"; fi
  fi
  rm -f "$red_log" "$original_backup" "$generated_backup"
}
trap cleanup_matrix_manifest EXIT
node --input-type=module - "$metadata" "$manifest" <<'NODE'
import { readFile, writeFile } from "node:fs/promises";
import { ERA_PLANS, deriveExportJobs } from "./scripts/export-era8-10-building-models.mjs";
import { renderEra8To10AssetManifest } from "./scripts/generate-era8-10-asset-manifest.mjs";
const metadata = JSON.parse(await readFile(process.argv[2], "utf8"));
const complete = renderEra8To10AssetManifest({ metadata, jobs: deriveExportJobs(ERA_PLANS) });
const entries = [...complete.matchAll(/^(\s+"[^"]+":\s+)(\w+Url)(,\s*)$/gm)];
if (entries.length < 2) throw new Error("manifest has too few URL entries to mutate");
const stub = complete.replace(
  entries[1]?.[0] ?? "",
  `${entries[1]?.[1] ?? ""}${entries[0]?.[2] ?? ""}${entries[1]?.[3] ?? ""}`,
);
await writeFile(process.argv[3], stub, "utf8");
NODE
if npx vitest run --config vitest.browser.config.ts apps/web/src/city/era8To10AssetManifest.browser.test.tsx --testTimeout=30000 >"$red_log" 2>&1; then exit 1; fi
rg -q "URL census" "$red_log"
rm -f "$manifest"
node scripts/generate-era8-10-asset-manifest.mjs --metadata "$metadata" --out "$manifest"
npx vitest run --config vitest.browser.config.ts apps/web/src/city/era8To10AssetManifest.browser.test.tsx --testTimeout=30000
cp "$manifest" "$generated_backup"
node --input-type=module - "$manifest" <<'NODE'
import { readFile, writeFile } from "node:fs/promises";
const source = await readFile(process.argv[2], "utf8");
const entries = [...source.matchAll(/^(\s+"[^"]+":\s+)(\w+Url)(,\s*)$/gm)];
if (entries.length < 2) throw new Error("manifest has too few URL entries to mutate");
await writeFile(
  process.argv[2],
  source.replace(
    entries[1]?.[0] ?? "",
    `${entries[1]?.[1] ?? ""}${entries[0]?.[2] ?? ""}${entries[1]?.[3] ?? ""}`,
  ),
  "utf8",
);
NODE
if npx vitest run --config vitest.browser.config.ts apps/web/src/city/era8To10AssetManifest.browser.test.tsx --testTimeout=30000 >"$red_log" 2>&1; then exit 1; fi
rg -q "URL census" "$red_log"
cp "$generated_backup" "$manifest"
keep_generated=1

# 12 — red: production-surface browser body and permanent package/CI commands missing
npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/lateEraGridworkMaterialFidelity.browser.test.tsx
npx vitest run test/era8To10ExporterReproductionGate.test.ts

# 13 — red: evidence frame/fit files absent; default HTTP assertions still run
npx vitest run --config vitest.era8-10-evidence.config.ts

# 14 — red: renderer/preload metrics fields, harness, rollback command/manifest missing
npm test -w @cr/web -- \
  src/city/three/cityPerformanceMetrics.test.tsx \
  src/city/three/placedBuildingPreload.test.tsx \
  src/city/townHall.test.ts
npx vitest run test/era8To10ReleaseRollback.test.ts

# 15 — red: Node measurement script/evidence missing
npx vitest run test/era8To10PerformanceHarness.test.ts

# 16 — red: scope/report/mutation/evidence populations incomplete
npx vitest run test/era8To10EvidenceCompleteness.test.ts
```

## Conditional Checkpoint Commands

Run only with explicit commit authorization. Before every commit, compare that checkpoint's newly
staged delta—not the whole possibly earlier-staged index—to its listed paths.

```bash
# Task 1
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html \
  apps/web/src/city/era8To10BuildingModels.test.ts \
  apps/web/src/city/era8To10ExporterSafety.test.ts \
  apps/web/src/city/era8To10ExporterTestTypes.ts apps/web/vitest.config.ts \
  scripts/export-era8-10-building-models.mjs scripts/export-era8-10-building-models.d.mts \
  vitest.era8-10-exporter.config.ts
git commit -m "feat: preserve and type the late-era source boundary"

# Task 2
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add apps/web/src/city/era8To10BuildingModels.test.ts \
  apps/web/src/city/era8To10ExporterSafety.test.ts \
  scripts/export-era8-10-building-models.mjs scripts/export-era8-10-building-models.d.mts
git commit -m "feat: lock the exact late-era source plan"

# Task 3
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add apps/web/src/city/era8To10ExporterSafety.test.ts \
  scripts/export-era8-10-building-models.mjs scripts/export-era8-10-building-models.d.mts
git commit -m "feat: preserve deterministic late-era export semantics"

# Task 4
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add apps/web/src/city/era8To10ExporterSafety.test.ts \
  scripts/export-era8-10-building-models.mjs scripts/export-era8-10-building-models.d.mts \
  test/support/era8To10ExporterCrashChild.mjs
git commit -m "feat: publish late-era outputs manifest last"

# Task 5
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add apps/web/src/city/era8To10ExporterSafety.test.ts \
  scripts/export-era8-10-building-models.mjs scripts/export-era8-10-building-models.d.mts \
  test/support/era8To10ExporterCrashChild.mjs
git commit -m "feat: guard late-era publication and repair"

# Task 6
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add apps/web/src/city/era8To10ExporterSafety.test.ts \
  apps/web/src/city/era8To10BuildingModels.test.ts \
  scripts/export-era8-10-building-models.d.mts \
  scripts/generate-era8-10-asset-manifest.mjs scripts/generate-era8-10-asset-manifest.d.mts \
  test/generateEra8To10AssetManifest.test.ts test/support/era8To10ExporterCrashChild.mjs
test ! -e apps/web/src/city/art/era8To10AssetManifest.generated.ts
git commit -m "test: guard late-era manifest boundary"

# Task 7
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add apps/web/src/city/three/lateEraGridworkMaterial.ts \
  apps/web/src/city/three/lateEraGridworkMaterial.test.ts
git commit -m "feat: restore tagged late-era materials"

# Task 8
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add apps/web/src/city/three/PlacedBuilding.tsx apps/web/src/city/three/BuildingThumb.tsx \
  apps/web/src/city/three/GhostBuilding.tsx apps/web/src/city/three/winterFrost.ts \
  apps/web/src/city/three/modelPreparation.ts apps/web/src/city/three/modelPreparation.test.ts \
  apps/web/src/city/three/winterFrost.test.ts \
  apps/web/src/city/three/lateEraLiveMaterials.test.tsx \
  apps/web/src/city/three/lateEraGhostMaterials.test.ts
git commit -m "fix: preserve late-era live material state"

# Task 9
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add apps/web/src/city/era8To10RegistryPlan.ts \
  apps/web/src/city/era8To10BuildingModels.test.ts
git commit -m "feat: declare exact late-era runtime data"

# Task 10
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add scripts/export-era8-10-building-models.mjs scripts/export-era8-10-building-models.d.mts \
  apps/web/src/city/era8To10ExporterSafety.test.ts \
  apps/web/src/city/era8To10BuildingModels.test.ts \
  apps/web/src/city/era8To10MeshBudget.test.ts apps/web/src/city/era8To10ModelFit.test.ts
git commit -m "feat: validate complete late-era candidate models"

# Task 11
set -euo pipefail
umask 077
staged=0
committed=0
task_paths=""
actual_staged=""
full_scope=""
cleanup_task11() {
  if [ "$staged" -eq 1 ] && [ "$committed" -eq 0 ] && [ -n "$task_paths" ] && [ -f "$task_paths" ]; then
    git restore --staged --pathspec-from-file="$task_paths" --pathspec-file-nul 2>/dev/null || true
  fi
  rm -f "$task_paths" "$actual_staged" "$full_scope"
}
trap cleanup_task11 EXIT
if [ "${ERA8_10_COMMIT_AUTHORIZED:-}" != "1" ]; then
  echo "Task 11 checkpoint skipped without explicit commit authorization"
  exit 0
fi
test -z "$(git diff --cached --name-only)" || {
  echo "Task 11 requires an empty index before staging" >&2
  exit 1
}
execution_base="$(git merge-base HEAD origin/integration)"
test -n "$execution_base" || { echo "Task 11 merge base is missing" >&2; exit 1; }
printf 'Task 11 merge base: %s\n' "$execution_base"
task_paths="$(mktemp "${TMPDIR:-/tmp}/cr-era8-10-task11-paths.XXXXXX")"
actual_staged="$(mktemp "${TMPDIR:-/tmp}/cr-era8-10-task11-staged.XXXXXX")"
full_scope="$(mktemp "${TMPDIR:-/tmp}/cr-era8-10-full-scope.XXXXXX")"
chmod 600 "$task_paths" "$actual_staged" "$full_scope"
node --input-type=module - "$task_paths" "$full_scope" <<'NODE'
import { lstatSync, writeFileSync } from "node:fs";
import {
  FULL_FEATURE_RELEASE_PATHS,
  TASK11_RELEASE_PATHS,
  assertExporterPublicationPaths,
} from "./scripts/era8-10-release-paths.mjs";
import { ERA_PLANS, deriveExportJobs } from "./scripts/export-era8-10-building-models.mjs";
assertExporterPublicationPaths(FULL_FEATURE_RELEASE_PATHS, deriveExportJobs(ERA_PLANS));
assertExporterPublicationPaths(TASK11_RELEASE_PATHS, deriveExportJobs(ERA_PLANS));
if (FULL_FEATURE_RELEASE_PATHS.length !== 162 || TASK11_RELEASE_PATHS.length !== 115) {
  throw new Error("frozen release-path manifest count drifted");
}
for (const path of TASK11_RELEASE_PATHS) {
  if (!lstatSync(path).isFile()) throw new Error(`Task 11 path is not a regular file: ${path}`);
}
writeFileSync(
  process.argv[2],
  Buffer.concat(TASK11_RELEASE_PATHS.map((path) => Buffer.from(`${path}\0`))),
);
writeFileSync(
  process.argv[3],
  Buffer.concat(FULL_FEATURE_RELEASE_PATHS.map((path) => Buffer.from(`${path}\0`))),
);
console.log("Task 11 verified frozen 115-path task scope and 162-path full release scope");
NODE
git add --dry-run --pathspec-from-file="$task_paths" --pathspec-file-nul
git add --pathspec-from-file="$task_paths" --pathspec-file-nul
staged=1
git diff --cached --name-only -z > "$actual_staged"
node --input-type=module - "$task_paths" "$actual_staged" <<'NODE'
import { readFileSync } from "node:fs";
import {
  TASK11_RELEASE_PATHS,
  assertReleasePathSet,
} from "./scripts/era8-10-release-paths.mjs";
const rows = (path) => readFileSync(path).toString("utf8").split("\0").filter(Boolean);
const actual = rows(process.argv[3]).sort();
assertReleasePathSet("Task 11 staged set", TASK11_RELEASE_PATHS, actual);
console.log("Task 11 staged only its 115 paths; Task 16 checks the complete 164-path raw execution-base publish union after Tasks 12–16 exist");
NODE
git diff --cached --check
git commit -m "feat: promote and wire exact Era 8-10 models"
committed=1

# Task 12
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add package.json .github/workflows/invariants.yml \
  apps/web/src/city/three/lateEraGridworkMaterialFidelity.browser.test.tsx \
  scripts/run-era8-10-surface-mutations.mjs \
  vitest.era8-10-surface-mutation.config.ts \
  test/era8To10ExporterReproductionGate.test.ts
git commit -m "test: verify late-era production surfaces and gates"

# Task 13
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add apps/web/src/city/three/era8To10LearnerEvidence.browser.test.tsx \
  apps/web/src/vite-env.d.ts \
  vitest.era8-10-evidence.config.ts
git commit -m "test: verify late-era learner evidence"

# Task 14
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add package.json scripts/era8-10-release-manifest.json \
  scripts/rehearse-era8-10-release-rollback.mjs test/era8To10ReleaseRollback.test.ts \
  apps/web/src/city/three/Era8To10PerformanceHarness.tsx \
  apps/web/src/city/three/cityPerformanceMetrics.tsx \
  apps/web/src/city/three/cityPerformanceMetrics.test.tsx \
  apps/web/src/city/three/CityScene.tsx \
  apps/web/src/city/three/placedBuildingPreload.ts \
  apps/web/src/city/three/placedBuildingPreload.test.tsx \
  apps/web/src/city/three/townHallPreload.ts \
  apps/web/src/city/townHall.test.ts \
  apps/web/era8-10-performance.html \
  apps/web/src/city/three/era8To10PerformanceEntry.tsx \
  apps/web/era8-10-performance.vite.config.mjs
git commit -m "feat: add rollback-safe late-era performance instrumentation"

# Task 15
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add package.json scripts/measure-era8-10-performance.mjs \
  test/era8To10PerformanceHarness.test.ts
git commit -m "test: measure late-era runtime performance"

# Task 16
set -euo pipefail
test "${ERA8_10_COMMIT_AUTHORIZED:-}" = "1" || { echo "explicit user commit authorization required" >&2; exit 1; }
git add scripts/report-era8-10-scope.mjs test/era8To10EvidenceCompleteness.test.ts \
  test/era8To10MutationCoverage.test.ts \
  docs/superpowers/specs/2026-08-07-era-08-10-runtime-wiring-design.md \
  docs/superpowers/plans/2026-08-07-era-08-10-runtime-wiring.md
git commit -m "test: verify exact Era 8-10 runtime wiring"
```

## Spec Coverage Map

- §§1–3 Tasks1–2; §§4–5 Tasks2,9–11; §6.1–6.4 Tasks2–3,10; §6.5–6.6 Tasks3,7,8,10–12.
- §7 Tasks10–11; §8.1–8.4 Tasks4–5; §8.5 Task6.
- §9.1–9.3 Tasks7–8,12; §9.4–9.10 Tasks6,9,11–12; §10 every task plus Task16.
- §11.1 Tasks10–12,16; §11.2–11.4 Task13; §11.5 Tasks14–15.
- §§12–13 dependency order/Tasks4–6,11–12,14; §14 Task16.

## Revised Plan Self-Review Checklist

- [x] **Spec/re-review coverage:** Re-read §§1–14, the complete earlier correction index,
  and the latest 12-item audit; every requirement maps to a task and the matching spec
  corrections are recorded.
- [x] **Placeholder/vagueness:** Case-insensitive writing-plans forbidden-pattern scan
  is empty; all named helper/type seams have an owning task, signature, and focused use.
- [x] **Type consistency:** Reconciled the complete exporter `.d.mts`, `ExportRealm`,
  publication/manifest/lock ownership, full export/metadata rows, runtime preparation,
  capacity/gallery census commands, rollback policies, renderer payload, and final performance
  schema.
- [x] **Current paths/APIs:** Physical-target `git ls-files --error-unmatch` succeeded
  for every current anchor; inspected current `CitySurfaceProps`, City session/layout/
  civic APIs, `islandLand`/`ringLayout` capacity behavior, Buildings disclosure state,
  SceneMetrics, preload hooks, iframe capture, PNG parser, shot budgets,
  lockfile/scripts, Era 7 image anchor, import-safe main, and Vitest 4.1 browser-command
  shape plus repository `page.viewport`/`commands.writeFile` uses.
- [x] **Dependency sanity:** Task headings are exactly 1–16 in order; every dependency
  points backward, Task 14 follows learner evidence, listed parallel tasks share no
  file, and publication/release chains remain sequential.
- [x] **Ordering/TDD:** Adapter/shared preparation and real 87-state fidelity precede
  the first custom `--out`; Task 10 owns/digests/cleans its candidate; Task 11
  independently regenerates, compares, accepts comparison mode, and only then promotes.
  Every task has a named red and same-task focused green.
- [x] **Executable commands/timeouts/Git:** Lockfile/bootstrap, exact 26-command final
  verification, 30-minute fidelity, 30/60-second spatial cases, one 20-minute
  six-scenario performance bound, 16 executable authorization gates, and the fail-safe
  checkpoint-aware 115-path Task 11 and 164-path raw publish-union scope checks are explicit.
- [x] **Guard evidence:** The 325-ID atomic registry has explicit prefix composition,
  covers every latest repair plus earlier source/export/publication/runtime/capacity/gallery/
  disclosure evidence guard, and requires executed-record count and Set equality.
- [x] **Whitespace/scope:** Physical-target whitespace checks pass; the final reporter
  unions committed-since-base, unstaged, staged, and untracked paths. Current status is
  limited to the unchanged untracked approved spec and this untracked plan.

## Execution Handoff

Plan complete at `docs/superpowers/plans/2026-08-07-era-08-10-runtime-wiring.md`.

1. **Subagent-Driven (recommended):** `superpowers:subagent-driven-development`, fresh worker and two-stage review per task.
2. **Inline Execution:** `superpowers:executing-plans`, dependency-ordered batches/checkpoints.

Commits remain conditional on explicit authorization.
