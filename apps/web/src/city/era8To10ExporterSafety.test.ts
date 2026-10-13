import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  constants,
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
} from "node:fs";
import {
  copyFile,
  cp,
  link,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, type Page } from "playwright";
import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";

import type {
  ExporterIo,
  ExporterMainDependencies,
  ExportJob,
  ExportOneResult,
  MetadataBuildInput,
  PublicationPlan,
} from "../../../../scripts/export-era8-10-building-models.mjs";
import { renderEra8To10AssetManifest } from "../../../../scripts/generate-era8-10-asset-manifest.mjs";

type DeepMutable<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? DeepMutable<Item>[]
    : T extends object
      ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
      : T;

type MutableMetadataBuildInput = DeepMutable<MetadataBuildInput>;

// biome-ignore lint/suspicious/noExplicitAny: mutation fixtures deliberately construct malformed, schema-violating glTF records.
type MalformedGlb = any;

const ROOT = process.cwd();
const EXPORTER = join(ROOT, "scripts/export-era8-10-building-models.mjs");
const ART_ROOT = join(ROOT, "apps/web/src/city/art");
const SOURCE = join(ART_ROOT, "building-sources/era-08-10-gridwork-all-buildings.dc.html");
const cleanups: string[] = [];

afterEach(async () => {
  const paths = cleanups.splice(0);
  await Promise.all(paths.map((path) => rm(path, { recursive: true, force: true })));
  expect(
    paths.filter((path) => existsSync(path)),
    "exporter safety fixtures left residue in OS temporary storage",
  ).toEqual([]);
});

function treeDigest(root: string): string {
  const entries: string[] = [];
  const visit = (directory: string) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stat = lstatSync(path);
      const key = relative(root, path);
      if (stat.isDirectory()) visit(path);
      else if (stat.isSymbolicLink()) entries.push(`${key}\0link\0${readlinkSync(path)}`);
      else if (stat.isFile()) {
        entries.push(
          `${key}\0file\0${createHash("sha256").update(readFileSync(path)).digest("hex")}`,
        );
      }
    }
  };
  visit(root);
  return createHash("sha256").update(entries.join("\n")).digest("hex");
}

function importExporter(path = EXPORTER) {
  const isolatedTemp = mkdtempSync(join(tmpdir(), "era8-10-import-"));
  cleanups.push(isolatedTemp);
  const beforeArtDigest = treeDigest(ART_ROOT);
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `await import(${JSON.stringify(pathToFileURL(path).href)})`,
    ],
    { cwd: ROOT, encoding: "utf8", env: { ...process.env, TMPDIR: isolatedTemp } },
  );
  return { beforeArtDigest, isolatedTemp, result };
}

async function exporterModule() {
  return import("../../../../scripts/export-era8-10-building-models.mjs");
}

async function mutatedExporter(mutations: readonly { before: string; after: string }[]) {
  const directory = mkdtempSync(join(tmpdir(), "era8-10-mutant-"));
  cleanups.push(directory);
  const path = join(directory, "exporter.mjs");
  await symlink(join(ROOT, "node_modules"), join(directory, "node_modules"), "dir");
  await copyFile(
    join(ROOT, "scripts/generate-era8-10-asset-manifest.mjs"),
    join(directory, "generate-era8-10-asset-manifest.mjs"),
  );
  let source = readFileSync(EXPORTER, "utf8");
  for (const { before, after } of mutations) {
    const at = source.indexOf(before);
    if (at < 0 || source.indexOf(before, at + before.length) >= 0) {
      throw new Error(`mutation anchor missing or ambiguous: ${before.slice(0, 80)}`);
    }
    source = `${source.slice(0, at)}${after}${source.slice(at + before.length)}`;
  }
  await writeFile(path, source, "utf8");
  return import(`${pathToFileURL(path).href}?mutation=${Date.now()}-${Math.random()}`);
}

async function isolatedPage(bundlePath: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: "block" });
  await context.route("**/*", (route) => route.abort());
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: bundlePath });
  return {
    page,
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

async function fidelityPageFactory() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    serviceWorkers: "block",
    viewport: { width: 256, height: 256 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  return {
    page,
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

interface LoadedGlb {
  scene: THREE.Group & { readonly isScene?: boolean };
}

interface BrowserGlbLoader {
  parse(
    data: ArrayBuffer,
    path: string,
    onLoad: (loaded: LoadedGlb) => void,
    onError: (error: unknown) => void,
  ): void;
}

interface ExportBrowserRealm {
  __gridworkBundle: {
    GLTFLoader: {
      new (): BrowserGlbLoader;
      prototype: BrowserGlbLoader;
    };
    sha256Hex(bytes: Uint8Array | Uint8ClampedArray): string;
  };
  __restoreGridworkLoaderParse?: () => void;
  __restoreGridworkToBlob?: () => void;
  __gridworkSeedMode?: "unseeded";
  __restoreGridworkCreateImageBitmap?: () => void;
}

async function loaderSceneTag(
  page: Page,
  bytes: Uint8Array,
): Promise<{ rootIsScene: boolean; tag: unknown }> {
  const b64 = Buffer.from(bytes).toString("base64");
  return page.evaluate(async (encoded) => {
    const realm = globalThis as unknown as ExportBrowserRealm;
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const loaded = await new Promise<LoadedGlb>((resolve, reject) => {
      new realm.__gridworkBundle.GLTFLoader().parse(bytes.buffer, "", resolve, reject);
    });
    return {
      rootIsScene: loaded.scene.isScene === true,
      tag: loaded.scene.userData.gridworkLateEraAsset ?? null,
    };
  }, b64);
}

async function dropLoaderRootTag(page: Page): Promise<void> {
  await page.evaluate(() => {
    const realm = globalThis as unknown as ExportBrowserRealm;
    const prototype = realm.__gridworkBundle.GLTFLoader.prototype;
    const original = prototype.parse;
    prototype.parse = function (data, path, onLoad, onError) {
      return original.call(
        this,
        data,
        path,
        (loaded) => {
          delete loaded.scene.userData.gridworkLateEraAsset;
          onLoad(loaded);
        },
        onError,
      );
    };
    realm.__restoreGridworkLoaderParse = () => {
      prototype.parse = original;
    };
  });
}

async function restoreLoaderRootTag(page: Page): Promise<void> {
  await page.evaluate(() => {
    const realm = globalThis as unknown as ExportBrowserRealm;
    realm.__restoreGridworkLoaderParse?.();
    delete realm.__restoreGridworkLoaderParse;
  });
}

const LATE_ERAS = ["atomic_age", "information_age", "cyberpunk"] as const;

function canonicalRandomDependentByEra(jobs: readonly ExportJob[]) {
  return Object.fromEntries(
    LATE_ERAS.map((era) => [
      era,
      jobs
        .filter((job) => job.era === era)
        .map((job) => job.seedInput)
        .sort(),
    ]),
  ) as Record<(typeof LATE_ERAS)[number], string[]>;
}

function assertSeedPartition(
  jobs: readonly ExportJob[],
  seededHashes: ReadonlyMap<string, string>,
  unseededHashes: ReadonlyMap<string, string>,
  declaredIndependent: ReadonlySet<string> = new Set(),
  declaredRandomByEra: Readonly<
    Record<string, readonly string[]>
  > = canonicalRandomDependentByEra(jobs),
) {
  const expected = jobs.map((job) => job.seedInput).sort();
  if (
    JSON.stringify([...seededHashes.keys()].sort()) !== JSON.stringify(expected) ||
    JSON.stringify([...unseededHashes.keys()].sort()) !== JSON.stringify(expected)
  ) {
    throw new Error("seed probe hash population does not equal the exact 87 jobs");
  }
  const declaredRandom = Object.values(declaredRandomByEra).flat().sort();
  const declaredUnion = [...declaredIndependent, ...declaredRandom].sort();
  if (
    new Set(declaredUnion).size !== declaredUnion.length ||
    JSON.stringify(declaredUnion) !== JSON.stringify(expected)
  ) {
    throw new Error("seed partition union/set equality failed");
  }
  for (const name of declaredIndependent) {
    if (seededHashes.get(name) !== unseededHashes.get(name)) {
      throw new Error(`seed-independent hash equality failed for ${name}`);
    }
  }
  for (const name of declaredRandom) {
    if (seededHashes.get(name) === unseededHashes.get(name)) {
      throw new Error(`random-dependent hash inequality failed for ${name}`);
    }
  }
  const observedIndependent = expected.filter(
    (name) => seededHashes.get(name) === unseededHashes.get(name),
  );
  const observedRandom = expected.filter(
    (name) => seededHashes.get(name) !== unseededHashes.get(name),
  );
  if (observedIndependent.length !== 0 || declaredIndependent.size !== 0) {
    throw new Error("canonical seed-independent set is not exactly empty");
  }
  if (JSON.stringify(observedRandom) !== JSON.stringify(expected)) {
    throw new Error("canonical random-dependent set is not exactly all 87 outputs");
  }
  for (const era of LATE_ERAS) {
    const expectedEra = jobs
      .filter((job) => job.era === era)
      .map((job) => job.seedInput)
      .sort();
    const declaredEra = [...(declaredRandomByEra[era] ?? [])].sort();
    if (declaredEra.length === 0) {
      throw new Error(`${era} random-dependent population is empty`);
    }
    if (JSON.stringify(declaredEra) !== JSON.stringify(expectedEra)) {
      throw new Error(`${era} random-dependent composition changed`);
    }
  }
}

async function exportJobSet(
  exporter: Awaited<ReturnType<typeof exporterModule>>,
  bundle: { path: string; installedExporterSha256: string },
  jobs: readonly ExportJob[],
  options: { reverseImageCompletion?: boolean; unseededProbe?: boolean } = {},
) {
  const source = exporter.extractKitSources(new Uint8Array(await readFile(SOURCE)));
  const created = await isolatedPage(bundle.path);
  const results = new Map<string, ExportOneResult>();
  try {
    if (options.reverseImageCompletion) {
      await created.page.evaluate(() => {
        const realm = globalThis as unknown as ExportBrowserRealm;
        const original = HTMLCanvasElement.prototype.toBlob;
        let invocation = 0;
        realm.__restoreGridworkToBlob = () => {
          HTMLCanvasElement.prototype.toBlob = original;
        };
        HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
          const delay = Math.max(0, 24 - (invocation % 4) * 8);
          invocation += 1;
          original.call(
            this,
            (blob) => setTimeout(() => callback(blob), delay),
            type,
            quality,
          );
        };
      });
    }
    for (const job of jobs) {
      if (options.unseededProbe) {
        await created.page.evaluate(() => {
          const realm = globalThis as unknown as ExportBrowserRealm;
          let value = 0x42f0e1eb;
          Math.random = () => {
            value = (value + 0x6d2b79f5) >>> 0;
            let mixed = value;
            mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
            mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
            return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
          };
          realm.__gridworkSeedMode = "unseeded";
        });
      }
      const output = await exporter.exportOne({
        job,
        page: created.page,
        kitSources: source,
        bare: true,
        installedExporterSha256: bundle.installedExporterSha256,
      });
      results.set(job.seedInput, output);
    }
    return results;
  } finally {
    if (options.reverseImageCompletion) {
      await created.page.evaluate(() => {
        const realm = globalThis as unknown as ExportBrowserRealm;
        realm.__restoreGridworkToBlob?.();
        delete realm.__restoreGridworkToBlob;
      });
    }
    await created.close();
  }
}

function syntheticMaterialSemantic(index: number) {
  const render = {
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
  };
  if (index % 2 === 1) {
    return {
      schema: 1,
      kind: "unlit",
      sourceMaterialKey: "material-000",
      color: [1, 1, 1],
      baseMap: null,
      gradient: null,
      render,
    };
  }
  return {
    schema: 1,
    kind: "toon",
    sourceMaterialKey: "material-000",
    color: [1, 1, 1],
    baseMap: null,
    gradient: {
      width: 3,
      height: 1,
      channels: 4,
      channelInterpretation: "RGBA8_UNORM",
      texels: [
        [32, 32, 32, 255],
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
      flipY: true,
      premultiplyAlpha: false,
      unpackAlignment: 4,
      colorSpace: "",
    },
    render,
  };
}

function syntheticMetadataInput(
  exporter: Awaited<ReturnType<typeof exporterModule>>,
): MutableMetadataBuildInput {
  const installedExporterSha256 = "a".repeat(64);
  const outputs = exporter
    .deriveExportJobs()
    .map((job, index: number) => {
      const bytes = new TextEncoder().encode(`synthetic:${job.seedInput}`);
      const semantic = syntheticMaterialSemantic(index);
      const semanticDigest = createHash("sha256")
        .update(JSON.stringify(semantic))
        .digest("hex");
      return {
        job,
        file: job.relativeFile.split("/").at(-1) ?? "",
        relativeFile: job.relativeFile,
        era: job.era,
        kind: job.kind,
        stage: job.stage,
        runtimeId: job.runtimeId,
        runtimeEra: job.runtimeEra,
        bytes,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        sourceMeshes: 2,
        shippedMeshes: 1,
        sourceTriangles: 12,
        shippedTriangles: 12,
        sourceBounds: { min: [0, 0, 0], max: [1, 1, 1], size: [1, 1, 1] },
        shippedBounds: { min: [0, 0, 0], max: [1, 1, 1], size: [1, 1, 1] },
        materialCount: 1,
        toonMaterialCount: semantic.kind === "toon" ? 1 : 0,
        unlitMaterialCount: semantic.kind === "unlit" ? 1 : 0,
        baseMapCount: 0,
        textureCount: semantic.kind === "toon" ? 1 : 0,
        embeddedImageCount: 0,
        anisotropyHistogram: {},
        samplerSemanticDigest: createHash("sha256").update("[]").digest("hex"),
        colorSpaceRoles: {
          srgbColorMaps: 0,
          nonColorMaps: semantic.kind === "toon" ? 1 : 0,
        },
        materialSemantics: [semantic],
        toon: semantic.kind === "toon" ? [semantic] : [],
        nonDefaultRenderOrderCount: 0,
        semanticDigest,
        installedExporterSha256,
      };
    })
    .sort((left, right) => left.relativeFile.localeCompare(right.relativeFile));
  return {
    outputs,
    fidelity: {
      files: 87,
      alphaMismatches: 0,
      worstMeanRgbByteError: 0,
      worstP99RgbByteError: 0,
      resultsDigest: "b".repeat(64),
    },
    legacyEncoding: {
      bridgeVersion: 1,
      acceptedAssignments: 1_955,
      unsupportedAssignments: 0,
    },
    orderedImages: {
      strategy: "serialized invocation order",
      installedExporterSha256,
    },
  } as unknown as MutableMetadataBuildInput;
}

function encodeGlb(json: MalformedGlb, binary: Uint8Array) {
  const jsonRaw = Buffer.from(JSON.stringify(json), "utf8");
  const jsonLength = Math.ceil(jsonRaw.length / 4) * 4;
  const binaryLength = Math.ceil(binary.byteLength / 4) * 4;
  const output = Buffer.alloc(12 + 8 + jsonLength + 8 + binaryLength);
  output.write("glTF", 0, "ascii");
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.byteLength, 8);
  output.writeUInt32LE(jsonLength, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  jsonRaw.copy(output, 20);
  output.fill(0x20, 20 + jsonRaw.length, 20 + jsonLength);
  const binaryHeader = 20 + jsonLength;
  output.writeUInt32LE(binaryLength, binaryHeader);
  output.writeUInt32LE(0x004e4942, binaryHeader + 4);
  Buffer.from(binary).copy(output, binaryHeader + 8);
  return new Uint8Array(output);
}

function mutateGlb(
  exporter: Awaited<ReturnType<typeof exporterModule>>,
  output: ExportOneResult,
  mutate: (json: MalformedGlb, binary: Uint8Array) => void,
) {
  const parsed = exporter.parseGlb(output.bytes);
  const json = structuredClone(parsed.json) as unknown as MalformedGlb;
  const binary = new Uint8Array(parsed.binary);
  mutate(json, binary);
  return encodeGlb(json, binary);
}

function outputForBytes(
  output: ExportOneResult,
  bytes: Uint8Array,
  changes: Record<string, unknown> = {},
): ExportOneResult {
  return {
    ...output,
    ...changes,
    job: output.job,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  } as unknown as ExportOneResult;
}

function stableFixtureJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableFixtureJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableFixtureJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function outputForMutatedSemantics(
  exporter: Awaited<ReturnType<typeof exporterModule>>,
  output: ExportOneResult,
  bytes: Uint8Array,
): ExportOneResult {
  const json = structuredClone(exporter.parseGlb(bytes).json) as unknown as MalformedGlb;
  const materialSemantics = json.materials
    .map((material: MalformedGlb) => material.extras.gridworkMaterial)
    .sort((left: MalformedGlb, right: MalformedGlb) =>
      left.sourceMaterialKey.localeCompare(right.sourceMaterialKey),
    );
  const toon = materialSemantics.filter(
    (semantic: MalformedGlb) => semantic.kind === "toon",
  );
  const baseMaps = materialSemantics
    .map((semantic: MalformedGlb) => semantic.baseMap)
    .filter(Boolean);
  const nodeOrders = json.nodes
    .map((node: MalformedGlb) => node.extras?.gridworkRenderOrder)
    .filter((value: unknown) => value !== undefined);
  return outputForBytes(output, bytes, {
    materialSemantics,
    toon,
    samplerSemanticDigest: createHash("sha256")
      .update(stableFixtureJson(baseMaps))
      .digest("hex"),
    semanticDigest: createHash("sha256")
      .update(stableFixtureJson({ materialSemantics, nodeOrders }))
      .digest("hex"),
  });
}

function firstPrimitive(json: MalformedGlb): MalformedGlb {
  const node = json.nodes.find((candidate: MalformedGlb) => candidate.mesh !== undefined);
  return json.meshes[node.mesh].primitives[0];
}

function accessorByteOffset(json: MalformedGlb, accessorIndex: number) {
  const accessor = json.accessors[accessorIndex];
  const view = json.bufferViews[accessor.bufferView];
  return (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
}

function embeddedImagePayload(
  exporter: Awaited<ReturnType<typeof exporterModule>>,
  output: ExportOneResult,
  imageIndex = 0,
) {
  const parsed = exporter.parseGlb(output.bytes);
  const json = structuredClone(parsed.json) as unknown as MalformedGlb;
  const image = json.images[imageIndex];
  const view = json.bufferViews[image.bufferView];
  const start = view.byteOffset ?? 0;
  return {
    bytes: new Uint8Array(parsed.binary).slice(start, start + view.byteLength),
    mimeType: image.mimeType as string,
  };
}

function replaceEmbeddedImage(
  exporter: Awaited<ReturnType<typeof exporterModule>>,
  output: ExportOneResult,
  payload: Uint8Array,
  mimeType: "image/png" | "image/jpeg" | "image/webp",
  imageIndex = 0,
  imageFingerprint?: string,
) {
  return mutateGlb(exporter, output, (json, binary) => {
    const image = json.images[imageIndex];
    const view = json.bufferViews[image.bufferView];
    if (payload.byteLength > view.byteLength) {
      throw new Error(
        `replacement ${mimeType} payload ${payload.byteLength} exceeds ${view.byteLength}`,
      );
    }
    const start = view.byteOffset ?? 0;
    binary.fill(0, start, start + view.byteLength);
    binary.set(payload, start);
    view.byteLength = payload.byteLength;
    image.mimeType = mimeType;
    if (mimeType === "image/webp") {
      for (const texture of json.textures ?? []) {
        if (texture.source !== imageIndex) continue;
        texture.extensions = {
          ...(texture.extensions ?? {}),
          EXT_texture_webp: { source: imageIndex },
        };
        delete texture.source;
      }
      json.extensionsUsed = [
        ...new Set([...(json.extensionsUsed ?? []), "EXT_texture_webp"]),
      ];
      json.extensionsRequired = [
        ...new Set([...(json.extensionsRequired ?? []), "EXT_texture_webp"]),
      ];
    }
    if (imageFingerprint) {
      for (const material of json.materials ?? []) {
        const textureIndex = material.pbrMetallicRoughness?.baseColorTexture?.index;
        const texture = json.textures?.[textureIndex];
        const source = texture?.extensions?.EXT_texture_webp?.source ?? texture?.source;
        if (source === imageIndex && material.extras?.gridworkMaterial?.baseMap) {
          material.extras.gridworkMaterial.baseMap.imageFingerprint = imageFingerprint;
        }
      }
    }
  });
}

async function transcodeImage(
  page: Page,
  bytes: Uint8Array,
  mimeType: "image/jpeg" | "image/webp",
) {
  return page
    .evaluate(
      async ({ encoded, requestedMimeType }) => {
        const binary = atob(encoded);
        const source = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          source[index] = binary.charCodeAt(index);
        }
        const bitmap = await createImageBitmap(new Blob([source], { type: "image/png" }));
        try {
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("2D transcoding context unavailable");
          context.drawImage(bitmap, 0, 0);
          const blob = await canvas.convertToBlob({
            type: requestedMimeType,
            quality: 0.7,
          });
          if (blob.type !== requestedMimeType) {
            throw new Error(`browser cannot encode ${requestedMimeType}`);
          }
          const payload = new Uint8Array(await blob.arrayBuffer());
          let result = "";
          for (let offset = 0; offset < payload.length; offset += 32_768) {
            result += String.fromCharCode(...payload.subarray(offset, offset + 32_768));
          }
          return btoa(result);
        } finally {
          bitmap.close();
        }
      },
      {
        encoded: Buffer.from(bytes).toString("base64"),
        requestedMimeType: mimeType,
      },
    )
    .then((encoded) => new Uint8Array(Buffer.from(encoded, "base64")));
}

async function decodedImageFingerprint(
  page: Page,
  bytes: Uint8Array,
  mimeType: "image/png" | "image/jpeg" | "image/webp",
): Promise<string> {
  return page.evaluate(
    async ({ encoded, mimeType }) => {
      const realm = globalThis as unknown as ExportBrowserRealm;
      const binary = atob(encoded);
      const payload = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        payload[index] = binary.charCodeAt(index);
      }
      const bitmap = await createImageBitmap(new Blob([payload], { type: mimeType }));
      try {
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("2D fingerprint context unavailable");
        context.drawImage(bitmap, 0, 0);
        const rgba = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
        return `rgba8:${bitmap.width}x${bitmap.height}:${realm.__gridworkBundle.sha256Hex(rgba)}`;
      } finally {
        bitmap.close();
      }
    },
    { encoded: Buffer.from(bytes).toString("base64"), mimeType },
  );
}

async function failNativeImageDecodeAt(page: Page, invocation: number): Promise<void> {
  await page.evaluate((failAt) => {
    const realm = globalThis as unknown as ExportBrowserRealm & {
      createImageBitmap(
        image: ImageBitmapSource,
        options?: ImageBitmapOptions,
      ): Promise<ImageBitmap>;
    };
    const original = realm.createImageBitmap.bind(globalThis);
    let calls = 0;
    realm.createImageBitmap = async (image, options) => {
      calls += 1;
      if (calls === failAt) {
        throw new Error(`injected native image decode failure ${calls}`);
      }
      return original(image, options);
    };
    realm.__restoreGridworkCreateImageBitmap = () => {
      realm.createImageBitmap = original;
    };
  }, invocation);
}

async function restoreNativeImageDecode(page: Page): Promise<void> {
  await page.evaluate(() => {
    const realm = globalThis as unknown as ExportBrowserRealm;
    realm.__restoreGridworkCreateImageBitmap?.();
    delete realm.__restoreGridworkCreateImageBitmap;
  });
}

describe("Era 8-10 exporter import safety", () => {
  it("imports the exporter with no output, temporary files, or art mutation", () => {
    const { beforeArtDigest, isolatedTemp, result } = importExporter();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(readdirSync(isolatedTemp)).toEqual([]);
    expect(treeDigest(ART_ROOT)).toBe(beforeArtDigest);
  });

  it("keeps a direct guarded invocation read-only once production is complete", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "era8-10-exporter-mutation-"));
    cleanups.push(scratch);
    await symlink(join(ROOT, "node_modules"), join(scratch, "node_modules"), "dir");
    const copy = join(scratch, "exporter.mjs");
    await cp(EXPORTER, copy);
    await cp(
      join(ROOT, "scripts/generate-era8-10-asset-manifest.mjs"),
      join(scratch, "generate-era8-10-asset-manifest.mjs"),
    );
    await writeFile(
      copy,
      readFileSync(copy, "utf8").replace(
        "if (isMain) await main(process.argv.slice(2), {});",
        "await main();",
      ),
    );
    const { result } = importExporter(copy);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });
});

describe("Era 8-10 ordered deterministic export", () => {
  it("uses FNV-1a and restores one basename-scoped Mulberry32 stream", async () => {
    const exporter = await exporterModule();
    expect(exporter.fnv1a32("")).toBe(0x811c9dc5);
    expect(exporter.fnv1a32("trg-6-construction")).toBe(3_195_866_091);
    const random = exporter.mulberry32(0x12345678);
    expect([random(), random(), random()]).toEqual([
      0.10615200875326991, 0.941276284167543, 0.9398706152569503,
    ]);
    const original = Math.random;
    const values = await exporter.withBasenameRandom("trg-6-construction", async () => [
      Math.random(),
      Math.random(),
    ]);
    expect(values).toEqual([0.15780353941954672, 0.7055561521556228]);
    expect(Math.random).toBe(original);
    await expect(
      exporter.withBasenameRandom("throws", () => {
        throw new Error("one-build failure");
      }),
    ).rejects.toThrow("one-build failure");
    expect(Math.random).toBe(original);
  });

  it("builds and disposes an ordered image bundle without changing installed Three", async () => {
    const exporter = await exporterModule();
    const installed = new URL(
      "../../../../node_modules/three/examples/jsm/exporters/GLTFExporter.js",
      import.meta.url,
    );
    const before = Buffer.from(await readFile(installed));
    const beforeHash = createHash("sha256").update(before).digest("hex");
    const bundle = await exporter.buildDisposableThreeBundle();
    const bundleDirectory = dirname(bundle.path);
    try {
      expect(readFileSync(bundle.path).byteLength).toBeGreaterThan(0);
      expect(bundle.installedExporterSha256).toBe(beforeHash);
      expect(Buffer.from(await readFile(installed))).toEqual(before);
      const created = await isolatedPage(bundle.path);
      try {
        const digest = await created.page.evaluate(() => {
          const realm = globalThis as unknown as ExportBrowserRealm;
          return realm.__gridworkBundle.sha256Hex(new TextEncoder().encode("abc"));
        });
        expect(digest).toBe(
          "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        );
      } finally {
        await created.close();
      }
    } finally {
      await bundle.dispose();
    }
    expect(() => lstatSync(bundleDirectory)).toThrow();
    expect(Buffer.from(await readFile(installed))).toEqual(before);
    await expect(exporter.buildDisposableThreeBundle({ injection: "" })).rejects.toThrow(
      /nonempty string or null/,
    );
  });

  it("world-bakes and signature-batches without merging transparent or ordered meshes", async () => {
    const exporter = await exporterModule();
    const pixels = new Uint8ClampedArray([
      20, 30, 40, 255, 100, 110, 120, 255, 220, 230, 240, 255,
    ]);
    const canvas = {
      width: 3,
      height: 1,
      getContext: () => ({
        getImageData: () => ({ data: pixels }),
      }),
    } as unknown as HTMLCanvasElement;
    const gradient = new THREE.CanvasTexture(canvas);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    const toon = new THREE.MeshToonMaterial({
      color: 0x88aacc,
      gradientMap: gradient,
    });
    const clear = new THREE.MeshBasicMaterial({
      color: 0x55ddff,
      transparent: true,
      opacity: 0.4,
    });
    const source = new THREE.Group();
    source.position.set(7, 2, -5);
    source.rotation.y = Math.PI / 5;
    for (const x of [-3, 3]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), toon);
      mesh.position.x = x;
      source.add(mesh);
    }
    for (const x of [-1, 1]) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), clear);
      mesh.position.set(x, 2, 0);
      source.add(mesh);
    }
    const ordered = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), toon);
    ordered.position.y = 4;
    ordered.renderOrder = 3;
    source.add(ordered);
    source.updateMatrixWorld(true);
    const originalFirstPosition = (source.children[0] as THREE.Mesh).geometry
      .getAttribute("position")
      .array.slice();

    const baked = exporter.bakeAndBatchSourceGroup(source);
    expect(baked.root.isGroup).toBe(true);
    expect(baked.root.position.toArray()).toEqual([0, 0, 0]);
    expect(baked.root.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    expect(baked.sourceMeshes).toBe(5);
    expect(baked.shippedMeshes).toBe(4);
    expect(baked.sourceTriangles).toBe(40);
    expect(baked.shippedTriangles).toBe(40);
    expect(baked.sourceBounds.min.toArray()).toEqual(baked.shippedBounds.min.toArray());
    expect(baked.sourceBounds.max.toArray()).toEqual(baked.shippedBounds.max.toArray());
    expect(
      (source.children[0] as THREE.Mesh).geometry.getAttribute("position").array,
    ).toEqual(originalFirstPosition);

    const job = exporter
      .deriveExportJobs()
      .find((candidate) => candidate.seedInput === "civic-cyberpunk-vertical-farm-built");
    if (!job) throw new Error("Vertical Farm semantic fixture is not planned");
    const captured = exporter.captureGridworkSemantics(
      baked,
      job,
      exporter.SOURCE_CONTRACT.sha256,
    );
    expect(captured.scene.isScene).toBe(true);
    expect(captured.scene.userData.gridworkLateEraAsset).toEqual({
      schema: 1,
      sourceSha256: exporter.SOURCE_CONTRACT.sha256,
      era: "cyberpunk",
      sourceKey: "vertfarm",
      stage: "built",
      basename: "civic-cyberpunk-vertical-farm-built",
    });
    expect(captured.toonMaterials).toBe(1);
    expect(captured.unlitMaterials).toBe(1);
    expect(captured.nonDefaultRenderOrders).toBe(1);
    const transports = new Set<THREE.Material>();
    captured.scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        transports.add((object as THREE.Mesh).material as THREE.Material);
      }
    });
    expect(
      [...transports].some(
        (material) =>
          (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true,
      ),
    ).toBe(true);
    expect(
      [...transports].some(
        (material) => (material as THREE.MeshBasicMaterial).isMeshBasicMaterial === true,
      ),
    ).toBe(true);
    const toonRecord = [...transports]
      .map((material) => material.userData.gridworkMaterial)
      .find((record) => record?.kind === "toon");
    expect(toonRecord.gradient.texels).toEqual([
      [20, 30, 40, 255],
      [100, 110, 120, 255],
      [220, 230, 240, 255],
    ]);
  });

  it("exports real tagged Scenes with complete geometry and semantic transport", async () => {
    const exporter = await exporterModule();
    const bundle = await exporter.buildDisposableThreeBundle();
    try {
      const jobs = exporter.deriveExportJobs();
      const selected = [
        jobs.find(
          (job) =>
            job.era === "atomic_age" &&
            job.definition === "weather" &&
            job.stage === "built",
        ),
        jobs.find(
          (job) =>
            job.era === "information_age" &&
            job.definition === "datacentre" &&
            job.stage === "built",
        ),
        jobs.find(
          (job) =>
            job.era === "cyberpunk" &&
            job.definition === "vertfarm" &&
            job.stage === "built",
        ),
      ].filter((job): job is (typeof jobs)[number] => job !== undefined);
      expect(selected.every(Boolean)).toBe(true);
      const source = exporter.extractKitSources(new Uint8Array(await readFile(SOURCE)));
      const created = await isolatedPage(bundle.path);
      try {
        let sawUnlit = false;
        for (const job of selected) {
          const result = await exporter.exportOne({
            job,
            page: created.page,
            kitSources: source,
            bare: true,
            installedExporterSha256: bundle.installedExporterSha256,
          });
          expect(result.installedExporterSha256).toBe(bundle.installedExporterSha256);
          expect(result.sourceTriangles).toBe(result.shippedTriangles);
          expect(result.shippedMeshes).toBeLessThanOrEqual(result.sourceMeshes);
          expect(result.toonMaterialCount).toBeGreaterThan(0);
          sawUnlit ||= result.unlitMaterialCount > 0;
          expect(result.materialSemantics).toHaveLength(result.materialCount);
          expect(() => exporter.validateGlb(result.bytes, job, result)).not.toThrow();
          const parsed = exporter.parseGlb(result.bytes);
          const json = parsed.json as unknown as MalformedGlb;
          expect(json.scenes[json.scene].extras.gridworkLateEraAsset).toEqual({
            schema: 1,
            sourceSha256: exporter.SOURCE_CONTRACT.sha256,
            era: job.runtimeEra,
            sourceKey: job.definition,
            stage: job.stage,
            basename: job.seedInput,
          });
          const loaded = await loaderSceneTag(created.page, result.bytes);
          expect(loaded.rootIsScene).toBe(false);
          expect(loaded.tag).toEqual(json.scenes[json.scene].extras.gridworkLateEraAsset);
          for (const semantic of result.materialSemantics) {
            expect(Object.keys(semantic.render)).toEqual([
              "opacity",
              "transparent",
              "alphaTest",
              "side",
              "depthTest",
              "depthWrite",
              "depthFunc",
              "colorWrite",
              "blending",
              "blendSrc",
              "blendDst",
              "blendEquation",
              "blendSrcAlpha",
              "blendDstAlpha",
              "blendEquationAlpha",
              "premultipliedAlpha",
              "forceSinglePass",
              "polygonOffset",
              "polygonOffsetFactor",
              "polygonOffsetUnits",
              "toneMapped",
              "dithering",
              "flatShading",
              "vertexColors",
              "fog",
            ]);
            if (semantic.kind === "toon") {
              expect(semantic.gradient?.texels.flat()).toHaveLength(12);
            } else {
              expect(semantic.gradient).toBeNull();
            }
          }
          if (job.definition === "vertfarm") {
            expect(result.nonDefaultRenderOrderCount).toBeGreaterThan(0);
            expect(
              json.nodes.some(
                (node: MalformedGlb) => node.extras?.gridworkRenderOrder === 3,
              ),
            ).toBe(true);
          }
        }
        expect(sawUnlit).toBe(true);
      } finally {
        await created.close();
      }
    } finally {
      await bundle.dispose();
    }
  });

  it("repeats all 87 hashes across order and callback completion and derives randomness by era", async () => {
    const exporter = await exporterModule();
    const bundle = await exporter.buildDisposableThreeBundle();
    try {
      const jobs = exporter.deriveExportJobs();
      expect(jobs).toHaveLength(87);
      const first = await exportJobSet(exporter, bundle, jobs);
      const repeated = await exportJobSet(exporter, bundle, jobs);
      const reversed = await exportJobSet(exporter, bundle, [...jobs].reverse());
      const reverseCompletion = await exportJobSet(exporter, bundle, jobs, {
        reverseImageCompletion: true,
      });
      const unseeded = await exportJobSet(exporter, bundle, jobs, {
        unseededProbe: true,
      });
      const hashes = (set: ReadonlyMap<string, ExportOneResult>) =>
        [...set].map(([name, output]) => [name, output.sha256]).sort();
      expect(hashes(repeated)).toEqual(hashes(first));
      expect(hashes(reversed)).toEqual(hashes(first));
      expect(hashes(reverseCompletion)).toEqual(hashes(first));
      assertSeedPartition(
        jobs,
        new Map([...first].map(([name, output]) => [name, output.sha256])),
        new Map([...unseeded].map(([name, output]) => [name, output.sha256])),
      );
    } finally {
      await bundle.dispose();
    }
  });

  it(
    "renders all 87 staged GLBs through the real placed-preparation fidelity seam",
    async () => {
      const exporter = await exporterModule();
      expect(exporter.runStagedFidelityGate).toBeTypeOf("function");
      const stageRoot = await fsOwnedTemp("era8-10-fidelity-stage-");
      const bundle = await exporter.buildDisposableThreeBundle();
      try {
        const jobs = exporter.deriveExportJobs();
        const outputs = await exportJobSet(exporter, bundle, jobs);
        for (const job of jobs) {
          const output = outputs.get(job.seedInput);
          if (!output) throw new Error(`direct staged generation omitted ${job.seedInput}`);
          const path = join(stageRoot, job.relativeFile);
          await mkdir(dirname(path), { recursive: true });
          await writeFile(path, output.bytes);
        }
        const result = await exporter.runStagedFidelityGate({
          mode: "shipping",
          bare: true,
          writeShippingMetadata: true,
          stagedRoot: stageRoot,
          jobs,
          sourceBytes: new Uint8Array(await readFile(SOURCE)),
          pageFactory: fidelityPageFactory,
        });
        expect(result.files).toBe(87);
        expect(result.alphaMismatches).toBe(0);
        expect(result.worstMeanRgbByteError).toBeLessThanOrEqual(0.5);
        expect(result.worstP99RgbByteError).toBeLessThanOrEqual(2);
        expect(result.resultsDigest).toMatch(/^[a-f0-9]{64}$/);
      } finally {
        await bundle.dispose();
      }
    },
    30 * 60_000,
  );

  it("makes RND001-RND004 fail their own final partition assertions", async () => {
    const exporter = await exporterModule();
    const jobs = exporter.deriveExportJobs();
    const seeded = new Map(jobs.map((job) => [job.seedInput, `seeded:${job.seedInput}`]));
    const unseeded = new Map(
      jobs.map((job) => [job.seedInput, `unseeded:${job.seedInput}`]),
    );
    const canonical = canonicalRandomDependentByEra(jobs);
    const firstAtomic = canonical.atomic_age[0];
    if (!firstAtomic) throw new Error("Atomic random-dependent population is empty");
    const record = (id: string, action: () => void, expected: string) => {
      let message = "";
      try {
        action();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toContain(expected);
      console.log(`${id}: ${message}`);
    };

    const rnd001 = structuredClone(canonical);
    rnd001.atomic_age = rnd001.atomic_age.filter((name) => name !== firstAtomic);
    record(
      "RND001",
      () => assertSeedPartition(jobs, seeded, unseeded, new Set([firstAtomic]), rnd001),
      `seed-independent hash equality failed for ${firstAtomic}`,
    );

    const rnd002 = structuredClone(canonical);
    rnd002.atomic_age = rnd002.atomic_age.slice(1);
    record(
      "RND002",
      () => assertSeedPartition(jobs, seeded, unseeded, new Set(), rnd002),
      "seed partition union/set equality failed",
    );

    const rnd003 = structuredClone(canonical);
    rnd003.cyberpunk = [...rnd003.cyberpunk, ...rnd003.atomic_age];
    rnd003.atomic_age = [];
    record(
      "RND003",
      () => assertSeedPartition(jobs, seeded, unseeded, new Set(), rnd003),
      "atomic_age random-dependent population is empty",
    );

    const rnd004 = structuredClone(canonical);
    [rnd004.atomic_age, rnd004.cyberpunk] = [rnd004.cyberpunk, rnd004.atomic_age];
    record(
      "RND004",
      () => assertSeedPartition(jobs, seeded, unseeded, new Set(), rnd004),
      "atomic_age random-dependent composition changed",
    );
  });

  it("builds stable ordered metadata and rejects machine-local or mismatched input", async () => {
    const exporter = await exporterModule();
    const input = syntheticMetadataInput(exporter);
    const buildMetadata = (value: unknown) =>
      exporter.buildMetadata(value as MetadataBuildInput);
    const metadata = buildMetadata(input);
    expect(metadata.schema).toBe(1);
    expect(metadata.census).toEqual({
      definitions: 39,
      outputs: 87,
      byEra: {
        atomic_age: { definitions: 14, outputs: 32 },
        information_age: { definitions: 11, outputs: 23 },
        cyberpunk: { definitions: 14, outputs: 32 },
      },
      byKind: { skill: 72, civic: 12, townhall: 3 },
    });
    expect(metadata.outputs).toHaveLength(87);
    expect(metadata.outputs.map((row) => row.file)).toEqual(
      [...metadata.outputs.map((row) => row.file)].sort(),
    );
    expect(metadata.orderedImages.installedExporterSha256).toBe("a".repeat(64));
    const encoded = JSON.stringify(metadata);
    expect(encoded).not.toMatch(/timestamp|browserProfile|hostname|"pid"|\/private\//);
    expect(JSON.stringify(buildMetadata(structuredClone(input)))).toBe(encoded);

    const mismatched = structuredClone(input);
    const mismatchedOutput = mismatched.outputs[0];
    if (!mismatchedOutput) throw new Error("synthetic metadata output is missing");
    mismatchedOutput.installedExporterSha256 = "c".repeat(64);
    expect(() => buildMetadata(mismatched)).toThrow(/installed exporter hash disagreement/);

    const timestamped = { ...structuredClone(input), timestamp: new Date().toISOString() };
    expect(() => buildMetadata(timestamped)).toThrow(/unstable metadata key timestamp/);

    const absolute = { ...structuredClone(input), intakePath: "/private/tmp/source.html" };
    expect(() => buildMetadata(absolute)).toThrow(/absolute path/);

    const machineLocal = { ...structuredClone(input), pid: 123, hostname: "builder" };
    expect(() => buildMetadata(machineLocal)).toThrow(/unstable metadata key pid/);

    const reordered = structuredClone(input);
    reordered.outputs.reverse();
    expect(() => buildMetadata(reordered)).toThrow(/metadata outputs are not sorted/);

    expect(() => buildMetadata({ ...structuredClone(input), undeclared: true })).toThrow(
      /metadata build input keys\/order changed/,
    );

    const undeclaredRow = structuredClone(input);
    Object.assign(undeclaredRow.outputs[0] as object, { undeclared: true });
    expect(() => buildMetadata(undeclaredRow)).toThrow(
      /metadata export result keys\/order changed/,
    );

    for (const fidelity of [
      { ...input.fidelity, worstMeanRgbByteError: 0.500_001 },
      { ...input.fidelity, worstP99RgbByteError: 2.000_001 },
    ]) {
      expect(() => buildMetadata({ ...structuredClone(input), fidelity })).toThrow(
        /metadata fidelity result is invalid/,
      );
    }
  });

  it("makes REV001-REV026 fail strict review assertions", async () => {
    const exporter = await exporterModule();
    const jobs = exporter.deriveExportJobs();
    const verticalJob = jobs.find(
      (job) => job.definition === "vertfarm" && job.stage === "built",
    );
    const dataJob = jobs.find(
      (job) => job.definition === "datacentre" && job.stage === "built",
    );
    if (!verticalJob || !dataJob) throw new Error("review fixtures are not planned");
    const bundle = await exporter.buildDisposableThreeBundle();
    try {
      const fixtures = await exportJobSet(exporter, bundle, [verticalJob, dataJob]);
      const vertical = fixtures.get(verticalJob.seedInput);
      const data = fixtures.get(dataJob.seedInput);
      if (!vertical || !data) throw new Error("review exports are unavailable");
      const evidence: { id: string; message: string }[] = [];
      const reviewMutation = async (
        id: string,
        action: () => unknown | Promise<unknown>,
        expected: RegExp,
      ) => {
        let caught: unknown;
        try {
          await action();
        } catch (error) {
          caught = error;
        }
        if (!caught) throw new Error(`${id} strict review mutation was accepted`);
        const message = caught instanceof Error ? caught.message : String(caught);
        if (!expected.test(message)) {
          throw new Error(`${id} failed at the wrong assertion: ${message}`);
        }
        evidence.push({ id, message });
      };
      const validateMutation = (
        output: ExportOneResult,
        bytes: Uint8Array,
        changes: Record<string, unknown> = {},
      ) => exporter.validateGlb(bytes, output.job, outputForBytes(output, bytes, changes));
      const loaderValidator = (
        exporter as unknown as {
          validateGlbWithLoader(
            page: Page,
            bytes: Uint8Array,
            job: typeof verticalJob,
          ): Promise<void>;
        }
      ).validateGlbWithLoader;

      await reviewMutation(
        "REV001",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.materials[0].pbrMetallicRoughness.baseColorFactor = [
              0.125, 0.25, 0.5, 0.75,
            ];
          });
          return validateMutation(vertical, bytes);
        },
        /base color factor/,
      );

      await reviewMutation(
        "REV002",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const material = json.materials[0];
            material.alphaMode =
              (material.alphaMode ?? "OPAQUE") === "BLEND" ? "OPAQUE" : "BLEND";
            delete material.alphaCutoff;
          });
          return validateMutation(vertical, bytes);
        },
        /alpha mode/,
      );

      await reviewMutation(
        "REV003",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const material = json.materials[0];
            material.doubleSided = !material.doubleSided;
          });
          return validateMutation(vertical, bytes);
        },
        /double-sided/,
      );

      await reviewMutation(
        "REV004",
        () => {
          const bytes = mutateGlb(exporter, data, (json) => {
            const material = json.materials.find(
              (candidate: MalformedGlb) =>
                candidate.extras.gridworkMaterial.baseMap !== null,
            );
            const texture =
              json.textures[material.pbrMetallicRoughness.baseColorTexture.index];
            const sampler = json.samplers[texture.sampler];
            sampler.wrapS = sampler.wrapS === 10497 ? 33071 : 10497;
          });
          return validateMutation(data, bytes);
        },
        /sampler wrapS/,
      );

      await reviewMutation(
        "REV005",
        () => {
          const bytes = mutateGlb(exporter, data, (json) => {
            const material = json.materials.find((candidate: MalformedGlb) => {
              const record = candidate.extras.gridworkMaterial.baseMap;
              return (
                record &&
                (record.offset.some((value: number) => value !== 0) ||
                  record.repeat.some((value: number) => value !== 1) ||
                  record.rotation !== 0)
              );
            });
            if (!material) throw new Error("transformed review material unavailable");
            const transform =
              material.pbrMetallicRoughness.baseColorTexture.extensions
                .KHR_texture_transform;
            const offset = transform.offset ?? [0, 0];
            transform.offset = [offset[0] + 0.125, offset[1]];
          });
          return validateMutation(data, bytes);
        },
        /texture transform offset/,
      );

      await reviewMutation(
        "REV006",
        () => {
          const bytes = mutateGlb(exporter, data, (json) => {
            const material = json.materials.find(
              (candidate: MalformedGlb) =>
                candidate.extras.gridworkMaterial.baseMap !== null,
            );
            const current = material.pbrMetallicRoughness.baseColorTexture.index;
            material.pbrMetallicRoughness.baseColorTexture.index =
              (current + 1) % json.textures.length;
          });
          return validateMutation(data, bytes);
        },
        /texture\/image\/sampler linkage/,
      );

      await reviewMutation(
        "REV007",
        () => {
          let staleMinimum = 0;
          const bytes = mutateGlb(exporter, vertical, (json) => {
            for (const mesh of json.meshes) {
              for (const primitive of mesh.primitives) {
                json.accessors[primitive.attributes.POSITION].min[0] -= 10;
              }
            }
            staleMinimum = vertical.shippedBounds.min[0] - 10;
          });
          const staleBounds = {
            min: [
              staleMinimum,
              vertical.shippedBounds.min[1],
              vertical.shippedBounds.min[2],
            ],
            max: [...vertical.shippedBounds.max],
            size: [
              vertical.shippedBounds.max[0] - staleMinimum,
              vertical.shippedBounds.size[1],
              vertical.shippedBounds.size[2],
            ],
          };
          return validateMutation(vertical, bytes, {
            sourceBounds: staleBounds,
            shippedBounds: staleBounds,
          });
        },
        /declared POSITION bounds differ from decoded values/,
      );

      await reviewMutation(
        "REV008",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const primitive = json.meshes
              .flatMap((mesh: MalformedGlb) => mesh.primitives)
              .find(
                (candidate: MalformedGlb) => candidate.attributes.TEXCOORD_0 !== undefined,
              );
            const accessor = json.accessors[primitive.attributes.TEXCOORD_0];
            accessor.componentType = 5122;
            accessor.normalized = false;
          });
          return validateMutation(vertical, bytes);
        },
        /TEXCOORD_0 accessor encoding/,
      );

      await reviewMutation(
        "REV009",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const primitive = firstPrimitive(json);
            const accessor = json.accessors[primitive.attributes.NORMAL];
            const view = json.bufferViews[accessor.bufferView];
            view.byteOffset = (view.byteOffset ?? 0) + 2;
          });
          return validateMutation(vertical, bytes);
        },
        /bufferView byteOffset alignment/,
      );

      await reviewMutation(
        "REV010",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.scenes[json.scene].nodes.push(json.scenes[json.scene].nodes[0]);
          });
          return validateMutation(vertical, bytes);
        },
        /multiple parents/,
      );

      await reviewMutation(
        "REV011",
        () => {
          const toon = structuredClone(vertical.toon) as unknown as Array<{
            color: number[];
          }>;
          const firstToon = toon[0];
          if (!firstToon) throw new Error("toon review fixture is empty");
          firstToon.color[0] = firstToon.color[0] === 0 ? 1 : 0;
          return exporter.validateGlb(vertical.bytes, vertical.job, {
            ...vertical,
            toon,
          } as unknown as ExportOneResult);
        },
        /toon subset metadata/,
      );

      const created = await isolatedPage(bundle.path);
      try {
        await loaderValidator(created.page, vertical.bytes, verticalJob);
        await reviewMutation(
          "REV012",
          async () => {
            await dropLoaderRootTag(created.page);
            try {
              await loaderValidator(created.page, vertical.bytes, verticalJob);
            } finally {
              await restoreLoaderRootTag(created.page);
            }
          },
          /loader-root Scene tag changed/,
        );

        const png = embeddedImagePayload(exporter, vertical);
        expect(png.mimeType).toBe("image/png");
        const jpeg = await transcodeImage(created.page, png.bytes, "image/jpeg");
        const webp = await transcodeImage(created.page, png.bytes, "image/webp");
        const jpegFingerprint = await decodedImageFingerprint(
          created.page,
          jpeg,
          "image/jpeg",
        );
        const webpFingerprint = await decodedImageFingerprint(
          created.page,
          webp,
          "image/webp",
        );
        const jpegBytes = replaceEmbeddedImage(
          exporter,
          vertical,
          jpeg,
          "image/jpeg",
          0,
          jpegFingerprint,
        );
        const webpBytes = replaceEmbeddedImage(
          exporter,
          vertical,
          webp,
          "image/webp",
          0,
          webpFingerprint,
        );
        const jpegOutput = outputForMutatedSemantics(exporter, vertical, jpegBytes);
        const webpOutput = outputForMutatedSemantics(exporter, vertical, webpBytes);
        exporter.validateGlb(jpegBytes, verticalJob, jpegOutput);
        exporter.validateGlb(webpBytes, verticalJob, webpOutput);
        await loaderValidator(created.page, jpegBytes, verticalJob);
        await loaderValidator(created.page, webpBytes, verticalJob);

        await reviewMutation(
          "REV013",
          async () => {
            const bytes = replaceEmbeddedImage(
              exporter,
              vertical,
              png.bytes.slice(0, 24),
              "image/png",
            );
            const output = outputForBytes(vertical, bytes);
            exporter.validateGlb(bytes, verticalJob, output);
            await loaderValidator(created.page, bytes, verticalJob);
          },
          /PNG payload decode failed/,
        );

        await reviewMutation(
          "REV014",
          async () => {
            const truncated = new Uint8Array([
              ...jpeg.slice(0, Math.min(64, jpeg.length - 2)),
              0xff,
              0xd9,
            ]);
            const bytes = replaceEmbeddedImage(exporter, vertical, truncated, "image/jpeg");
            const output = outputForBytes(vertical, bytes);
            exporter.validateGlb(bytes, verticalJob, output);
            await loaderValidator(created.page, bytes, verticalJob);
          },
          /JPEG payload decode failed/,
        );

        await reviewMutation(
          "REV015",
          async () => {
            const bytes = replaceEmbeddedImage(
              exporter,
              vertical,
              webp.slice(0, Math.min(24, webp.length)),
              "image/webp",
            );
            const output = outputForBytes(vertical, bytes);
            exporter.validateGlb(bytes, verticalJob, output);
            await loaderValidator(created.page, bytes, verticalJob);
          },
          /WebP payload decode failed/,
        );
      } finally {
        await created.close();
      }

      await reviewMutation(
        "REV016",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const nodeIndex = json.scenes[json.scene].nodes[0];
            json.nodes[nodeIndex].children = [nodeIndex];
          });
          return validateMutation(vertical, bytes);
        },
        /node graph contains a cycle/,
      );

      await reviewMutation(
        "REV017",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const primitive = firstPrimitive(json);
            const accessor = json.accessors[primitive.attributes.NORMAL];
            json.bufferViews[accessor.bufferView].byteStride = 10;
          });
          return validateMutation(vertical, bytes);
        },
        /bufferView byteStride/,
      );

      const imagePage = await isolatedPage(bundle.path);
      try {
        await reviewMutation(
          "REV018",
          async () => {
            const bytes = mutateGlb(exporter, data, (json) => {
              const mapped = json.materials
                .map((material: MalformedGlb) => {
                  const baseMap = material.extras?.gridworkMaterial?.baseMap;
                  const textureIndex =
                    material.pbrMetallicRoughness?.baseColorTexture?.index;
                  const texture = json.textures?.[textureIndex];
                  return {
                    fingerprint: baseMap?.imageFingerprint,
                    texture,
                    source:
                      texture?.extensions?.EXT_texture_webp?.source ?? texture?.source,
                  };
                })
                .filter(
                  (entry: MalformedGlb) =>
                    entry.texture && Number.isSafeInteger(entry.source),
                );
              const original = mapped.find((entry: MalformedGlb) =>
                mapped.some(
                  (candidate: MalformedGlb) =>
                    candidate.source !== entry.source &&
                    candidate.fingerprint !== entry.fingerprint,
                ),
              );
              const replacement = mapped.find(
                (entry: MalformedGlb) =>
                  entry.source !== original?.source &&
                  entry.fingerprint !== original?.fingerprint,
              );
              if (!original || !replacement) {
                throw new Error("texture-source swap fixture is unavailable");
              }
              original.texture.source = replacement.source;
            });
            const output = outputForBytes(data, bytes);
            exporter.validateGlb(bytes, dataJob, output);
            await loaderValidator(imagePage.page, bytes, dataJob);
          },
          /texture source image fingerprint changed/,
        );

        const duplicateImageBytes = mutateGlb(exporter, vertical, (json) => {
          json.images.push(structuredClone(json.images[0]));
        });
        const duplicateImageOutput = outputForBytes(vertical, duplicateImageBytes, {
          embeddedImageCount: vertical.embeddedImageCount + 1,
        });
        exporter.validateGlb(duplicateImageBytes, verticalJob, duplicateImageOutput);
        await loaderValidator(imagePage.page, duplicateImageBytes, verticalJob);
        await reviewMutation(
          "REV019",
          async () => {
            await failNativeImageDecodeAt(imagePage.page, vertical.embeddedImageCount + 1);
            try {
              await loaderValidator(imagePage.page, duplicateImageBytes, verticalJob);
            } finally {
              await restoreNativeImageDecode(imagePage.page);
            }
          },
          /PNG payload decode failed/,
        );
      } finally {
        await imagePage.close();
      }

      await reviewMutation(
        "REV020",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.extensionsUsed = json.extensionsUsed.filter(
              (extension: string) => extension !== "KHR_materials_unlit",
            );
          });
          return validateMutation(vertical, bytes);
        },
        /KHR_materials_unlit is missing from extensionsUsed/,
      );

      await reviewMutation(
        "REV021",
        () => {
          const bytes = mutateGlb(exporter, data, (json) => {
            json.extensionsUsed = json.extensionsUsed.filter(
              (extension: string) => extension !== "KHR_texture_transform",
            );
          });
          return validateMutation(data, bytes);
        },
        /KHR_texture_transform is missing from extensionsUsed/,
      );

      await reviewMutation(
        "REV022",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.textures[0].extensions = {
              ...(json.textures[0].extensions ?? {}),
              EXT_texture_webp: { source: json.textures[0].source },
            };
            delete json.textures[0].source;
            json.images[json.textures[0].extensions.EXT_texture_webp.source].mimeType =
              "image/webp";
            json.extensionsUsed = [
              ...new Set([...(json.extensionsUsed ?? []), "EXT_texture_webp"]),
            ];
            json.extensionsRequired = (json.extensionsRequired ?? []).filter(
              (extension: string) => extension !== "EXT_texture_webp",
            );
          });
          return validateMutation(vertical, bytes);
        },
        /EXT_texture_webp is missing from extensionsRequired/,
      );

      await reviewMutation(
        "REV023",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const primitive = firstPrimitive(json);
            const accessor = json.accessors[primitive.attributes.POSITION];
            json.bufferViews[accessor.bufferView].target = 34963;
          });
          return validateMutation(vertical, bytes);
        },
        /POSITION bufferView target is not ARRAY_BUFFER/,
      );

      await reviewMutation(
        "REV024",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const primitive = json.meshes
              .flatMap((mesh: MalformedGlb) => mesh.primitives)
              .find((candidate: MalformedGlb) => candidate.indices !== undefined);
            const accessor = json.accessors[primitive.indices];
            json.bufferViews[accessor.bufferView].target = 34962;
          });
          return validateMutation(vertical, bytes);
        },
        /index bufferView target is invalid/,
      );

      await reviewMutation(
        "REV025",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const image = json.images[0];
            json.bufferViews[image.bufferView].target = 34962;
          });
          return validateMutation(vertical, bytes);
        },
        /image bufferView must not declare a GPU target/,
      );

      await reviewMutation(
        "REV026",
        () => {
          const input = syntheticMetadataInput(exporter);
          const output = input.outputs.find((candidate) => candidate.toon.length > 0);
          if (!output) throw new Error("metadata toon mutation fixture is empty");
          const toon = structuredClone(output.toon);
          const first = toon[0];
          if (!first) throw new Error("metadata toon mutation record is absent");
          first.color[0] = first.color[0] === 0 ? 1 : 0;
          output.toon = toon;
          return exporter.buildMetadata(input as unknown as MetadataBuildInput);
        },
        /metadata toon subset is not exact ordered deep equality/,
      );

      expect(evidence.map(({ id }) => id)).toEqual(
        Array.from(
          { length: 26 },
          (_, index) => `REV${String(index + 1).padStart(3, "0")}`,
        ),
      );
      for (const { id, message } of evidence) {
        console.log(`${id}: ${message}`);
      }
    } finally {
      await bundle.dispose();
    }
  });

  it("makes EXP001-EXP062 and EXP009A fail their final assertions", async () => {
    const exporter = await exporterModule();
    const jobs = exporter.deriveExportJobs();
    const verticalJob = jobs.find(
      (job) => job.definition === "vertfarm" && job.stage === "built",
    );
    const dataJob = jobs.find(
      (job) => job.definition === "datacentre" && job.stage === "built",
    );
    if (!verticalJob || !dataJob) throw new Error("mutation fixtures are not planned");
    const bundle = await exporter.buildDisposableThreeBundle();
    try {
      const fixtures = await exportJobSet(exporter, bundle, [verticalJob, dataJob]);
      const vertical = fixtures.get(verticalJob.seedInput);
      const data = fixtures.get(dataJob.seedInput);
      if (!vertical || !data) throw new Error("mutation exports are unavailable");
      const evidence: { id: string; message: string }[] = [];
      const mutation = async (
        id: string,
        action: () => unknown | Promise<unknown>,
        expected: RegExp,
      ) => {
        let caught: unknown;
        try {
          await action();
        } catch (error) {
          caught = error;
        }
        if (!caught) throw new Error(`${id} did not fail`);
        const message = caught instanceof Error ? caught.message : String(caught);
        if (!expected.test(message)) {
          throw new Error(`${id} failed at the wrong assertion: ${message}`);
        }
        evidence.push({ id, message });
      };
      const validateMutation = (
        output: ExportOneResult,
        bytes: Uint8Array,
        changes: Record<string, unknown> = {},
      ) => exporter.validateGlb(bytes, output.job, outputForBytes(output, bytes, changes));
      await mutation(
        "EXP001",
        () => {
          const changedJob = { ...verticalJob, seed: 0 };
          const changed = { ...vertical, job: changedJob };
          return exporter.validateGlb(changed.bytes, changedJob, changed);
        },
        /exact path\/job contract changed/,
      );

      await mutation(
        "EXP002",
        async () => {
          const mutant = await mutatedExporter([
            {
              before: `export async function withBasenameRandom(seedInput, build) {
  const previous = Math.random;
  Math.random = mulberry32(fnv1a32(seedInput));
  try {
    return await build();
  } finally {
    Math.random = previous;
  }
}`,
              after: `export async function withBasenameRandom(seedInput, build) {
  const previous = Math.random;
  Math.random = mulberry32(fnv1a32(seedInput));
  try {
    return await build();
  } finally {
    void previous;
  }
}`,
            },
          ]);
          const original = Math.random;
          try {
            await mutant.withBasenameRandom("exp002", () => Math.random());
            if (Math.random !== original) throw new Error("Math.random restoration failed");
          } finally {
            Math.random = original;
          }
        },
        /Math\.random restoration failed/,
      );

      await mutation(
        "EXP003",
        () => {
          const subset = jobs.slice(0, 4);
          const run = (order: readonly ExportJob[]) => {
            const random = exporter.mulberry32(123);
            return new Map(order.map((job) => [job.seedInput, random()]));
          };
          const forward = run(subset);
          const reverse = run([...subset].reverse());
          if ([...forward].some(([name, value]) => reverse.get(name) !== value)) {
            throw new Error("run-global stream changed hashes after job reorder");
          }
        },
        /run-global stream changed hashes/,
      );

      await mutation(
        "EXP004",
        async () => {
          const mutant = await mutatedExporter([
            {
              before: "    const at = source.indexOf(unordered);",
              after: '    const at = source.indexOf("ordered-image-anchor-removed");',
            },
          ]);
          await mutant.buildDisposableThreeBundle();
        },
        /ordered-image anchor missing or ambiguous/,
      );

      await mutation(
        "EXP005",
        async () => {
          const mutant = await mutatedExporter([
            {
              before: '    const source = before.toString("utf8");',
              after:
                '    const source = before.toString("utf8") + "\\n" + before.toString("utf8");',
            },
          ]);
          await mutant.buildDisposableThreeBundle();
        },
        /ordered-image anchor missing or ambiguous/,
      );

      const unorderedImageMutation = [
        {
          before: `    const orderedForTest =
      injection === null
        ? ordered
        : ordered.replace(`,
          after: `    const orderedForTest =
      injection === null
        ? unordered
        : ordered.replace(`,
        },
      ];
      await mutation(
        "EXP006",
        async () => {
          const mutant = await mutatedExporter(unorderedImageMutation);
          const mutantBundle = await mutant.buildDisposableThreeBundle();
          try {
            const normal = await exportJobSet(
              mutant as Awaited<ReturnType<typeof exporterModule>>,
              mutantBundle,
              [dataJob],
            );
            const reversed = await exportJobSet(
              mutant as Awaited<ReturnType<typeof exporterModule>>,
              mutantBundle,
              [dataJob],
              { reverseImageCompletion: true },
            );
            if (
              normal.get(dataJob.seedInput)?.sha256 !==
              reversed.get(dataJob.seedInput)?.sha256
            ) {
              throw new Error("unordered image serialization changed the GLB hash");
            }
          } finally {
            await mutantBundle.dispose();
          }
        },
        /unordered image serialization changed/,
      );

      await mutation(
        "EXP007",
        async () => {
          const mutant = await mutatedExporter(unorderedImageMutation);
          const mutantBundle = await mutant.buildDisposableThreeBundle();
          try {
            const normal = await exportJobSet(
              mutant as Awaited<ReturnType<typeof exporterModule>>,
              mutantBundle,
              [verticalJob],
            );
            const reversed = await exportJobSet(
              mutant as Awaited<ReturnType<typeof exporterModule>>,
              mutantBundle,
              [verticalJob],
              { reverseImageCompletion: true },
            );
            if (
              normal.get(verticalJob.seedInput)?.sha256 !==
              reversed.get(verticalJob.seedInput)?.sha256
            ) {
              throw new Error("reverse callback completion changed unordered output");
            }
          } finally {
            await mutantBundle.dispose();
          }
        },
        /reverse callback completion changed/,
      );

      await mutation(
        "EXP008",
        async () => {
          const hashMutant = await mutatedExporter([
            {
              before:
                '    const installedExporterSha256 = createHash("sha256").update(before).digest("hex");',
              after:
                '    const installedExporterSha256 = createHash("sha256").update(Buffer.from("swapped resolved bytes")).digest("hex");',
            },
          ]);
          const hashMutantBundle = await hashMutant.buildDisposableThreeBundle();
          let resolvedHashFailed = false;
          try {
            const installed = new URL(
              "../../../../node_modules/three/examples/jsm/exporters/GLTFExporter.js",
              import.meta.url,
            );
            const actual = createHash("sha256")
              .update(await readFile(installed))
              .digest("hex");
            resolvedHashFailed = hashMutantBundle.installedExporterSha256 !== actual;
          } finally {
            await hashMutantBundle.dispose();
          }
          const source = exporter.extractKitSources(new Uint8Array(await readFile(SOURCE)));
          const created = await isolatedPage(bundle.path);
          try {
            let handoffFailed = false;
            try {
              await exporter.exportOne({
                job: verticalJob,
                page: created.page,
                kitSources: source,
                bare: true,
                installedExporterSha256: "b".repeat(64),
              });
            } catch (error) {
              handoffFailed = /hash handoff disagrees/.test(String(error));
            }
            const metadataInput = syntheticMetadataInput(exporter);
            const firstOutput = metadataInput.outputs[0];
            if (!firstOutput) throw new Error("metadata mutation output is missing");
            firstOutput.installedExporterSha256 = "c".repeat(64);
            let metadataFailed = false;
            try {
              exporter.buildMetadata(metadataInput as unknown as MetadataBuildInput);
            } catch (error) {
              metadataFailed = /hash disagreement/.test(String(error));
            }
            if (resolvedHashFailed && handoffFailed && metadataFailed) {
              throw new Error(
                "installed exporter resolved-bytes/option/result/metadata equality failed",
              );
            }
          } finally {
            await created.close();
          }
        },
        /resolved-bytes\/option\/result\/metadata equality failed/,
      );

      await mutation(
        "EXP009",
        async () => {
          const leaked = await exporter.buildDisposableThreeBundle();
          try {
            lstatSync(dirname(leaked.path));
            throw new Error("disposable bundle directory leaked without dispose");
          } finally {
            await leaked.dispose();
          }
        },
        /bundle directory leaked/,
      );

      await mutation(
        "EXP009A",
        async () => {
          const mutant = await mutatedExporter([
            {
              before: "          sourceSha256: scenePayload.sourceSha256,",
              after: "          sourceSha256: SOURCE_CONTRACT.sha256,",
            },
          ]);
          const mutantBundle = await mutant.buildDisposableThreeBundle();
          try {
            await exportJobSet(
              mutant as Awaited<ReturnType<typeof exporterModule>>,
              mutantBundle,
              [verticalJob],
            );
          } finally {
            await mutantBundle.dispose();
          }
        },
        /SOURCE_CONTRACT is not defined/,
      );

      await mutation(
        "EXP010",
        async () => {
          const groupMutation = {
            before: `        function makeTaggedExportScene(THREE, scenePayload, root) {
          const scene = new THREE.Scene();`,
            after: `        function makeTaggedExportScene(THREE, scenePayload, root) {
          const scene = new THREE.Group();`,
          };
          const mutant = await mutatedExporter([groupMutation]);
          const mutantBundle = await mutant.buildDisposableThreeBundle();
          let rawFailed = false;
          try {
            try {
              await exportJobSet(
                mutant as Awaited<ReturnType<typeof exporterModule>>,
                mutantBundle,
                [verticalJob],
              );
            } catch (error) {
              rawFailed = /raw glTF Scene tag changed/.test(String(error));
            }
          } finally {
            await mutantBundle.dispose();
          }
          const inspectable = await mutatedExporter([
            groupMutation,
            {
              before:
                "  if (stableJson(scene.extras?.gridworkLateEraAsset) !== stableJson(expectedTag)) {",
              after:
                "  if (false && stableJson(scene.extras?.gridworkLateEraAsset) !== stableJson(expectedTag)) {",
            },
          ]);
          const inspectableBundle = await inspectable.buildDisposableThreeBundle();
          let loaderFailed = false;
          try {
            try {
              await exportJobSet(
                inspectable as Awaited<ReturnType<typeof exporterModule>>,
                inspectableBundle,
                [verticalJob],
              );
            } catch (error) {
              loaderFailed = /loader-root Scene tag changed/.test(String(error));
            }
          } finally {
            await inspectableBundle.dispose();
          }
          if (rawFailed && loaderFailed) {
            throw new Error("tagged Group failed raw Scene and loader-root assertions");
          }
        },
        /failed raw Scene and loader-root assertions/,
      );

      await mutation(
        "EXP011",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            delete json.scenes[json.scene].extras.gridworkLateEraAsset;
          });
          return validateMutation(vertical, bytes);
        },
        /raw glTF Scene tag changed/,
      );

      await mutation(
        "EXP012",
        async () => {
          const created = await isolatedPage(bundle.path);
          try {
            await exporter.validateGlbWithLoader(created.page, vertical.bytes, verticalJob);
            await dropLoaderRootTag(created.page);
            try {
              await exporter.validateGlbWithLoader(
                created.page,
                vertical.bytes,
                verticalJob,
              );
            } finally {
              await restoreLoaderRootTag(created.page);
            }
          } finally {
            await created.close();
          }
        },
        /loader-root Scene tag changed/,
      );

      await mutation(
        "EXP013",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.nodes.find((node: MalformedGlb) => node.mesh !== undefined).translation = [
              1, 0, 0,
            ];
          });
          return validateMutation(vertical, bytes);
        },
        /not world-baked identity geometry/,
      );

      await mutation(
        "EXP014",
        async () => {
          const mutant = await mutatedExporter([
            {
              before: `      sourceMaterial: object.material.uuid,
      material: serializedMaterialSignature(object.material),`,
              after: `      sourceMaterial: object.material.uuid,`,
            },
          ]);
          const group = new THREE.Group();
          const left = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 }),
          );
          const right = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ color: 0x0000ff }),
          );
          Object.defineProperty(right.material, "uuid", {
            configurable: true,
            value: left.material.uuid,
          });
          right.position.x = 2;
          group.add(left, right);
          const baked = mutant.bakeAndBatchSourceGroup(group);
          if (baked.shippedMeshes !== 2) {
            throw new Error(
              "complete material signature no longer separates merge buckets",
            );
          }
        },
        /material signature no longer separates/,
      );

      await mutation(
        "EXP015",
        async () => {
          const mutant = await mutatedExporter([
            {
              before: `  return stableJson({
    index: geometry.index === null ? null : attributeSignature(geometry.index),
    attributes,`,
              after: `  return stableJson({
    attributes,`,
            },
          ]);
          const material = new THREE.MeshBasicMaterial();
          const plain = new THREE.BufferGeometry();
          plain.setAttribute(
            "position",
            new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
          );
          plain.setAttribute(
            "normal",
            new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
          );
          const indexed = plain.clone();
          indexed.setIndex([0, 1, 2]);
          const group = new THREE.Group();
          group.add(new THREE.Mesh(plain, material), new THREE.Mesh(indexed, material));
          const baked = mutant.bakeAndBatchSourceGroup(group);
          if (baked.shippedMeshes !== 2) {
            throw new Error("index-form signature no longer separates merge buckets");
          }
        },
        /index-form signature no longer separates/,
      );

      await mutation(
        "EXP016",
        async () => {
          const mutant = await mutatedExporter([
            {
              before: `    index: geometry.index === null ? null : attributeSignature(geometry.index),
    attributes,
    morphAttributes:`,
              after: `    index: geometry.index === null ? null : attributeSignature(geometry.index),
    morphAttributes:`,
            },
          ]);
          const material = new THREE.MeshBasicMaterial();
          const plain = new THREE.BufferGeometry();
          plain.setAttribute(
            "position",
            new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
          );
          plain.setAttribute(
            "normal",
            new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
          );
          const withUv = plain.clone();
          withUv.setAttribute(
            "uv",
            new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2),
          );
          const group = new THREE.Group();
          group.add(new THREE.Mesh(plain, material), new THREE.Mesh(withUv, material));
          const baked = mutant.bakeAndBatchSourceGroup(group);
          if (baked.shippedMeshes !== 2) {
            throw new Error("attribute signature no longer separates merge buckets");
          }
        },
        /attribute signature no longer separates/,
      );

      await mutation(
        "EXP017",
        async () => {
          const mutant = await mutatedExporter([
            {
              before: `      geometry: geometrySignature(geometry),
      renderOrder: object.renderOrder,
      opaqueOrder:`,
              after: `      geometry: geometrySignature(geometry),
      opaqueOrder:`,
            },
          ]);
          const material = new THREE.MeshBasicMaterial();
          const group = new THREE.Group();
          const first = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
          const ordered = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
          ordered.renderOrder = 3;
          ordered.position.x = 2;
          group.add(first, ordered);
          const baked = mutant.bakeAndBatchSourceGroup(group);
          if (baked.shippedMeshes !== 2) {
            throw new Error("render-order signature no longer separates merge buckets");
          }
        },
        /render-order signature no longer separates/,
      );

      await mutation(
        "EXP018",
        async () => {
          const mutant = await mutatedExporter([
            {
              before: `      material: serializedMaterialSignature(object.material),
      geometry: geometrySignature(geometry),
      renderOrder: object.renderOrder,
      opaqueOrder: transparent ? \`transparent-\${meshOrdinal}\` : "opaque",`,
              after: `      material: serializedMaterialSignature(object.material),
      geometry: geometrySignature(geometry),
      renderOrder: object.renderOrder,
      opaqueOrder: "opaque",`,
            },
          ]);
          const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5 });
          const group = new THREE.Group();
          const first = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
          const second = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
          second.position.x = 2;
          group.add(first, second);
          const baked = mutant.bakeAndBatchSourceGroup(group);
          if (baked.shippedMeshes !== 2) {
            throw new Error("transparent meshes were merged and lost draw ordering");
          }
        },
        /transparent meshes were merged/,
      );

      await mutation(
        "EXP019",
        () =>
          exporter.validateGlb(vertical.bytes, vertical.job, {
            ...vertical,
            sourceTriangles: vertical.sourceTriangles + 1,
          }),
        /triangle equality invariant changed/,
      );

      await mutation(
        "EXP020",
        () =>
          exporter.validateGlb(vertical.bytes, vertical.job, {
            ...vertical,
            sourceBounds: {
              ...vertical.sourceBounds,
              max: [
                vertical.sourceBounds.max[0] + 1,
                vertical.sourceBounds.max[1],
                vertical.sourceBounds.max[2],
              ],
              size: [
                vertical.sourceBounds.size[0] + 1,
                vertical.sourceBounds.size[1],
                vertical.sourceBounds.size[2],
              ],
            },
          }),
        /source\/shipped bounds differs/,
      );

      await mutation(
        "EXP021",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.nodes.find((node: MalformedGlb) => node.mesh !== undefined).scale = [
              2, 1, 1,
            ];
          });
          return validateMutation(vertical, bytes);
        },
        /not world-baked identity geometry/,
      );

      await mutation(
        "EXP022",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const primitive = firstPrimitive(json);
            const accessor =
              json.accessors[primitive.indices ?? primitive.attributes.POSITION];
            accessor.count -= 3;
          });
          return validateMutation(vertical, bytes);
        },
        /triangle equality invariant changed/,
      );

      await mutation(
        "EXP023",
        () => {
          const changed = {
            ...vertical,
            job: dataJob,
            file: data.file,
            relativeFile: data.relativeFile,
            era: data.era,
            kind: data.kind,
            stage: data.stage,
            runtimeId: data.runtimeId,
            runtimeEra: data.runtimeEra,
          };
          return exporter.validateGlb(vertical.bytes, dataJob, changed);
        },
        /raw glTF Scene tag changed/,
      );

      await mutation(
        "EXP024",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.buffers[0].uri = "external.bin";
          });
          return validateMutation(vertical, bytes);
        },
        /external URI/,
      );

      await mutation(
        "EXP025",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.images[0].uri = "external.png";
            delete json.images[0].bufferView;
          });
          return validateMutation(vertical, bytes);
        },
        /external URI/,
      );

      await mutation(
        "EXP026",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.cameras = [{ type: "perspective", perspective: {} }];
          });
          return validateMutation(vertical, bytes);
        },
        /not a static light\/camera-free GLB/,
      );

      await mutation(
        "EXP027",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.extensionsUsed = [...(json.extensionsUsed ?? []), "KHR_lights_punctual"];
            json.extensions = { KHR_lights_punctual: { lights: [] } };
          });
          return validateMutation(vertical, bytes);
        },
        /unsupported extension KHR_lights_punctual/,
      );

      await mutation(
        "EXP028",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.animations = [{}];
          });
          return validateMutation(vertical, bytes);
        },
        /not a static light\/camera-free GLB/,
      );

      await mutation(
        "EXP029",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.skins = [{}];
            json.nodes.find((node: MalformedGlb) => node.mesh !== undefined).skin = 0;
          });
          return validateMutation(vertical, bytes);
        },
        /not a static light\/camera-free GLB/,
      );

      await mutation(
        "EXP030",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const primitive = firstPrimitive(json);
            primitive.targets = [{ POSITION: primitive.attributes.POSITION }];
          });
          return validateMutation(vertical, bytes);
        },
        /contains morph targets/,
      );

      await mutation(
        "EXP031",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.extensionsUsed = [
              ...(json.extensionsUsed ?? []),
              "KHR_draco_mesh_compression",
            ];
            firstPrimitive(json).extensions = {
              KHR_draco_mesh_compression: { bufferView: 0, attributes: {} },
            };
          });
          return validateMutation(vertical, bytes);
        },
        /unsupported extension KHR_draco_mesh_compression/,
      );

      await mutation(
        "EXP032",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.extensionsUsed = [
              ...(json.extensionsUsed ?? []),
              "EXT_meshopt_compression",
            ];
            firstPrimitive(json).extensions = { EXT_meshopt_compression: {} };
          });
          return validateMutation(vertical, bytes);
        },
        /unsupported extension EXT_meshopt_compression/,
      );

      await mutation(
        "EXP033",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.extensionsUsed = [...(json.extensionsUsed ?? []), "EXT_not_supported"];
          });
          return validateMutation(vertical, bytes);
        },
        /unsupported extension EXT_not_supported/,
      );

      await mutation(
        "EXP034",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json, binary) => {
            const accessorIndex = firstPrimitive(json).attributes.POSITION;
            const offset = accessorByteOffset(json, accessorIndex);
            new DataView(binary.buffer, binary.byteOffset, binary.byteLength).setUint32(
              offset,
              0x7fc00000,
              true,
            );
          });
          return validateMutation(vertical, bytes);
        },
        /accessor contains a nonfinite value/,
      );

      await mutation(
        "EXP035",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json, binary) => {
            const primitive = json.meshes
              .flatMap((mesh: MalformedGlb) => mesh.primitives)
              .find((candidate: MalformedGlb) => candidate.indices !== undefined);
            const accessor = json.accessors[primitive.indices];
            const positionCount = json.accessors[primitive.attributes.POSITION].count;
            const offset = accessorByteOffset(json, primitive.indices);
            const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
            if (accessor.componentType === 5121) view.setUint8(offset, positionCount);
            else if (accessor.componentType === 5123)
              view.setUint16(offset, positionCount, true);
            else view.setUint32(offset, positionCount, true);
          });
          return validateMutation(vertical, bytes);
        },
        /indices are out of range/,
      );

      await mutation(
        "EXP036",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const primitive = firstPrimitive(json);
            json.accessors[primitive.attributes.NORMAL].count -= 1;
          });
          return validateMutation(vertical, bytes);
        },
        /POSITION\/NORMAL counts are incoherent/,
      );

      await mutation(
        "EXP037",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            delete firstPrimitive(json).attributes.NORMAL;
          });
          return validateMutation(vertical, bytes);
        },
        /references an invalid accessor index/,
      );

      await mutation(
        "EXP038",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const primitive = json.meshes
              .flatMap((mesh: MalformedGlb) => mesh.primitives)
              .find((candidate: MalformedGlb) => {
                const material = json.materials[candidate.material];
                return material.pbrMetallicRoughness?.baseColorTexture;
              });
            delete primitive.attributes.TEXCOORD_0;
          });
          return validateMutation(vertical, bytes);
        },
        /textured primitive has no UVs/,
      );

      await mutation(
        "EXP039",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json, binary) => {
            const image = json.images[0];
            const view = json.bufferViews[image.bufferView];
            binary[view.byteOffset ?? 0] = 0;
          });
          return validateMutation(vertical, bytes);
        },
        /PNG payload decode failed/,
      );

      await mutation(
        "EXP040",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.textures[0].sampler = 99_999;
          });
          return validateMutation(vertical, bytes);
        },
        /dropped a base map\/image\/sampler|invalid image\/sampler reference/,
      );

      await mutation(
        "EXP041",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const material = json.materials.find(
              (candidate: MalformedGlb) =>
                candidate.extras.gridworkMaterial.kind === "toon",
            );
            material.extras.gridworkMaterial.gradient.channels = 1;
          });
          return validateMutation(vertical, bytes);
        },
        /gradient shape\/interpretation changed/,
      );

      await mutation(
        "EXP042",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const material = json.materials.find(
              (candidate: MalformedGlb) =>
                candidate.extras.gridworkMaterial.kind === "toon",
            );
            delete material.extras.gridworkMaterial.gradient.minFilter;
          });
          return validateMutation(vertical, bytes);
        },
        /gradient keys\/order changed/,
      );

      await mutation(
        "EXP043",
        () => {
          const bytes = mutateGlb(exporter, data, (json) => {
            const material = json.materials.find(
              (candidate: MalformedGlb) =>
                candidate.extras.gridworkMaterial.baseMap !== null,
            );
            delete material.pbrMetallicRoughness.baseColorTexture;
          });
          return validateMutation(data, bytes);
        },
        /dropped a base map\/image\/sampler/,
      );

      await mutation(
        "EXP044",
        () => {
          const bytes = mutateGlb(exporter, data, (json) => {
            const material = json.materials.find((candidate: MalformedGlb) => {
              const record = candidate.extras.gridworkMaterial.baseMap;
              return (
                record &&
                (record.offset.some((value: number) => value !== 0) ||
                  record.repeat.some((value: number) => value !== 1) ||
                  record.rotation !== 0)
              );
            });
            if (!material) throw new Error("base-map transform mutation fixture missing");
            delete material.pbrMetallicRoughness.baseColorTexture.extensions
              .KHR_texture_transform;
          });
          return validateMutation(data, bytes);
        },
        /KHR_texture_transform presence changed/,
      );

      await mutation(
        "EXP045",
        () => {
          const bytes = mutateGlb(exporter, data, (json) => {
            const material = json.materials.find(
              (candidate: MalformedGlb) =>
                candidate.extras.gridworkMaterial.baseMap !== null,
            );
            material.extras.gridworkMaterial.baseMap.anisotropyRequested += 1;
          });
          return validateMutation(data, bytes);
        },
        /material semantic transport changed/,
      );

      await mutation(
        "EXP046",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            delete json.materials[0].extras.gridworkMaterial.render.depthWrite;
          });
          return validateMutation(vertical, bytes);
        },
        /render keys\/order changed/,
      );

      await mutation(
        "EXP047",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const material = json.materials.find(
              (candidate: MalformedGlb) =>
                candidate.extras.gridworkMaterial.kind === "unlit",
            );
            delete material.extensions.KHR_materials_unlit;
          });
          return validateMutation(vertical, bytes);
        },
        /KHR_materials_unlit mismatch/,
      );

      await mutation(
        "EXP048",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const node = json.nodes.find(
              (candidate: MalformedGlb) => candidate.extras?.gridworkRenderOrder === 3,
            );
            delete node.extras.gridworkRenderOrder;
          });
          return validateMutation(vertical, bytes);
        },
        /render-order census changed|Vertical Farm renderOrder 3 is missing/,
      );

      await mutation(
        "EXP049",
        () => {
          const bytes = mutateGlb(exporter, data, (json) => {
            const material = json.materials.find(
              (candidate: MalformedGlb) =>
                candidate.extras.gridworkMaterial.baseMap !== null,
            );
            const record = material.extras.gridworkMaterial.baseMap;
            record.colorSpace = record.colorSpace === "srgb" ? "" : "srgb";
          });
          return validateMutation(data, bytes);
        },
        /material semantic transport changed/,
      );

      await mutation(
        "EXP050",
        () => {
          const input = syntheticMetadataInput(exporter);
          (input.legacyEncoding as unknown as { bridgeVersion: number }).bridgeVersion = 2;
          return exporter.buildMetadata(input as unknown as MetadataBuildInput);
        },
        /legacy encoding census is invalid/,
      );

      await mutation(
        "EXP051",
        () => {
          const input = syntheticMetadataInput(exporter);
          input.legacyEncoding.acceptedAssignments -= 1;
          return exporter.buildMetadata(input as unknown as MetadataBuildInput);
        },
        /legacy encoding census is invalid/,
      );

      await mutation(
        "EXP052",
        () => {
          const input = syntheticMetadataInput(exporter);
          (
            input.legacyEncoding as unknown as {
              unsupportedAssignments: number;
            }
          ).unsupportedAssignments = 1;
          return exporter.buildMetadata(input as unknown as MetadataBuildInput);
        },
        /legacy encoding census is invalid/,
      );

      await mutation(
        "EXP053",
        () =>
          exporter.buildMetadata({
            ...syntheticMetadataInput(exporter),
            timestamp: "2026-08-08T00:00:00Z",
          } as unknown as MetadataBuildInput),
        /unstable metadata key timestamp/,
      );

      await mutation(
        "EXP054",
        () =>
          exporter.buildMetadata({
            ...syntheticMetadataInput(exporter),
            sourcePath: "/private/tmp/source.html",
          } as unknown as MetadataBuildInput),
        /absolute path/,
      );

      await mutation(
        "EXP055",
        () =>
          exporter.buildMetadata({
            ...syntheticMetadataInput(exporter),
            pid: 42,
            hostname: "builder",
          } as unknown as MetadataBuildInput),
        /unstable metadata key pid/,
      );

      await mutation(
        "EXP056",
        () =>
          exporter.buildMetadata({
            ...syntheticMetadataInput(exporter),
            browserProfile: "profile-123",
          } as unknown as MetadataBuildInput),
        /unstable metadata key browserProfile/,
      );

      await mutation(
        "EXP057",
        () => {
          const rows = syntheticMetadataInput(exporter);
          rows.outputs.reverse();
          let rowsFailed = false;
          try {
            exporter.buildMetadata(rows as unknown as MetadataBuildInput);
          } catch (error) {
            rowsFailed = /metadata outputs are not sorted/.test(String(error));
          }
          const keys = syntheticMetadataInput(exporter);
          const reorderedKeys = {
            orderedImages: keys.orderedImages,
            legacyEncoding: keys.legacyEncoding,
            fidelity: keys.fidelity,
            outputs: keys.outputs,
          };
          let keysFailed = false;
          try {
            exporter.buildMetadata(reorderedKeys as unknown as MetadataBuildInput);
          } catch (error) {
            keysFailed = /metadata build input keys\/order changed/.test(String(error));
          }
          if (rowsFailed && keysFailed) {
            throw new Error("metadata rows and object keys are not canonically ordered");
          }
        },
        /metadata rows and object keys are not canonically ordered/,
      );

      await mutation(
        "EXP058",
        () =>
          exporter.validateGlb(vertical.bytes, vertical.job, {
            ...vertical,
            shippedBounds: {
              ...vertical.shippedBounds,
              max: [
                vertical.shippedBounds.max[0],
                vertical.shippedBounds.max[1] - 1,
                vertical.shippedBounds.max[2],
              ],
              size: [
                vertical.shippedBounds.size[0],
                vertical.shippedBounds.size[1] - 1,
                vertical.shippedBounds.size[2],
              ],
            },
          }),
        /source\/shipped bounds differs/,
      );

      await mutation(
        "EXP059",
        () =>
          exporter.validateGlb(vertical.bytes, vertical.job, {
            ...vertical,
            sourceBounds: {
              ...vertical.sourceBounds,
              min: [Number.NaN, vertical.sourceBounds.min[1], vertical.sourceBounds.min[2]],
            },
          }),
        /must be finite/,
      );

      await mutation(
        "EXP060",
        () =>
          exporter.validateGlb(vertical.bytes, vertical.job, {
            ...vertical,
            sourceBounds: { min: [0, 0, 0], max: [0, 0, 0], size: [0, 0, 0] },
          }),
        /source bounds is empty/,
      );

      await mutation(
        "EXP061",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            const primitive = firstPrimitive(json);
            json.accessors[primitive.attributes.POSITION].min[0] -= 10;
          });
          return validateMutation(vertical, bytes);
        },
        /declared POSITION bounds differ from decoded values/,
      );

      await mutation(
        "EXP062",
        () => {
          const bytes = mutateGlb(exporter, vertical, (json) => {
            json.nodes.find((node: MalformedGlb) => node.mesh !== undefined).rotation = [
              0, 1, 0, 0,
            ];
          });
          return validateMutation(vertical, bytes);
        },
        /not world-baked identity geometry/,
      );

      const expected = [
        ...Array.from(
          { length: 62 },
          (_, index) => `EXP${String(index + 1).padStart(3, "0")}`,
        ),
        "EXP009A",
      ].sort();
      expect(evidence.map(({ id }) => id).sort()).toEqual(expected);
      for (const { id, message } of evidence) {
        console.log(`${id}: ${message}`);
      }
    } finally {
      await bundle.dispose();
    }
  });
});

const METADATA_RELATIVE =
  "apps/web/src/city/art/building-sources/era-08-10-gridwork-export-metadata.json";
const GENERATED_MANIFEST_RELATIVE =
  "apps/web/src/city/art/era8To10AssetManifest.generated.ts";
const DESTINATION_LOCK_BASENAME = ".era8-10-export.lock";
const CRASH_CHILD = join(ROOT, "test/support/era8To10ExporterCrashChild.mjs");

const publicationIo: ExporterIo = {
  open,
  readFile,
  writeFile,
  copyFile,
  link,
  lstat,
  mkdir,
  readdir,
  realpath,
  rename,
  rmdir,
  rm,
  stat,
  unlink,
  async fsyncDirectory(path: string) {
    const handle = await open(path, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  },
};

type ExporterModule = Awaited<ReturnType<typeof exporterModule>>;

interface PublicationFixture {
  readonly repositoryRoot: string;
  readonly fixtureRoot: string;
  readonly destinationRoot: string;
  readonly jobs: readonly ExportJob[];
  readonly metadata: ReturnType<ExporterModule["buildMetadata"]>;
  readonly sentinelPath: string;
  readonly sentinelHash: string;
}

async function writeFixtureFile(
  root: string,
  relativeFile: string,
  bytes: Uint8Array | string,
) {
  const path = join(root, relativeFile);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { flag: "wx" });
}

async function createPublicationFixture(
  exporter: ExporterModule,
): Promise<PublicationFixture> {
  const repositoryRoot = await fsOwnedTemp("era8-10-publication-repo-");
  const fixtureRoot = await fsOwnedTemp("era8-10-publication-fixture-");
  const destinationRoot = join(repositoryRoot, "apps/web/src/city/art");
  await mkdir(join(destinationRoot, "models/townhall"), { recursive: true });
  await mkdir(join(destinationRoot, "building-sources"), { recursive: true });
  const sentinelPath = join(destinationRoot, "models/era-07-sentinel-built.glb");
  const sentinelBytes = Buffer.from("prior-era-sentinel");
  await writeFile(sentinelPath, sentinelBytes, { flag: "wx" });
  await writeFile(
    join(destinationRoot, "building-sources/prior-era-source.txt"),
    "unrelated source",
    { flag: "wx" },
  );

  const input = syntheticMetadataInput(exporter);
  const metadata = exporter.buildMetadata(input as unknown as MetadataBuildInput);
  for (const output of input.outputs) {
    await writeFixtureFile(fixtureRoot, output.relativeFile, output.bytes);
  }
  await writeFixtureFile(fixtureRoot, METADATA_RELATIVE, `${JSON.stringify(metadata)}\n`);
  return {
    repositoryRoot,
    fixtureRoot,
    destinationRoot,
    jobs: exporter.deriveExportJobs(),
    metadata,
    sentinelPath,
    sentinelHash: createHash("sha256").update(sentinelBytes).digest("hex"),
  };
}

async function fsOwnedTemp(prefix: string) {
  const path = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(join(tmpdir(), prefix)),
  );
  cleanups.push(path);
  return path;
}

async function createOwnedPublicationStage(
  fixture: PublicationFixture,
): Promise<{ readonly stageRoot: string; readonly plan: PublicationPlan }> {
  const stageRoot = await fsOwnedTemp("era8-10-stage-");
  const relativeFiles = [...fixture.jobs.map((job) => job.relativeFile), METADATA_RELATIVE];
  for (const relativeFile of relativeFiles) {
    const stagedPath = join(stageRoot, relativeFile);
    await mkdir(dirname(stagedPath), { recursive: true });
    await copyFile(
      join(fixture.fixtureRoot, relativeFile),
      stagedPath,
      constants.COPYFILE_EXCL,
    );
  }
  const rows = new Map(fixture.metadata.outputs.map((row) => [row.file, row]));
  const entries = fixture.jobs.map((job) => {
    const row = rows.get(job.relativeFile);
    if (!row) throw new Error(`fixture metadata is missing ${job.relativeFile}`);
    return {
      relativeFile: job.relativeFile,
      stagedPath: join(stageRoot, job.relativeFile),
      finalPath: join(fixture.repositoryRoot, job.relativeFile),
      sha256: row.sha256,
      bytes: row.bytes,
    };
  });
  const metadataBytes = await readFile(join(stageRoot, METADATA_RELATIVE));
  return {
    stageRoot,
    plan: {
      mode: "production",
      entries,
      metadata: {
        relativeFile: METADATA_RELATIVE,
        stagedPath: join(stageRoot, METADATA_RELATIVE),
        finalPath: join(fixture.repositoryRoot, METADATA_RELATIVE),
        sha256: createHash("sha256").update(metadataBytes).digest("hex"),
        bytes: metadataBytes.byteLength,
      },
    },
  };
}

function generatedManifestSource(
  metadata: PublicationFixture["metadata"],
  jobs: readonly ExportJob[],
) {
  return renderEra8To10AssetManifest({ metadata, jobs });
}

function generatedManifestAssetIndex(
  metadata: PublicationFixture["metadata"],
  job: ExportJob,
): number {
  const index = metadata.outputs.findIndex((row) => row.file === job.relativeFile);
  if (index < 0) throw new Error(`generated manifest has no row for ${job.relativeFile}`);
  return index;
}

function removeGeneratedManifestJob(
  source: string,
  metadata: PublicationFixture["metadata"],
  job: ExportJob,
): string {
  const index = generatedManifestAssetIndex(metadata, job);
  const literal = `./${relative(
    dirname(GENERATED_MANIFEST_RELATIVE),
    job.relativeFile,
  )}?url`;
  return source
    .replace(`import asset${index} from ${JSON.stringify(literal)};\n`, "")
    .replace(`  ${JSON.stringify(job.relativeFile)},\n`, "")
    .replace(`  ${JSON.stringify(job.relativeFile)}: asset${index},\n`, "");
}

function destinationLockPath(fixture: PublicationFixture) {
  return join(fixture.destinationRoot, DESTINATION_LOCK_BASENAME);
}

function hashFile(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function repairDependencies(
  repositoryRoot: string,
  jobs: readonly ExportJob[],
  io: ExporterIo = publicationIo,
): ExporterMainDependencies & {
  readonly repositoryRoot: string;
  readonly jobs: readonly ExportJob[];
} {
  return {
    repositoryRoot,
    jobs,
    io,
    pageFactory: async () => {
      throw new Error("repair must not launch a browser");
    },
  };
}

describe("Era 8-10 owned stage and destination lock", () => {
  it("stages all 88 files before the strict no-wait lock and cleans every ordinary exit", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    const staged = await createOwnedPublicationStage(fixture);
    await exporter.prepareManifestLastPromotion(
      staged.plan,
      fixture.destinationRoot,
      publicationIo,
    );

    let inspectedStage = false;
    const checkingIo: ExporterIo = {
      ...publicationIo,
      mkdir: (async (
        path: Parameters<typeof mkdir>[0],
        options?: Parameters<typeof mkdir>[1],
      ) => {
        if (path === destinationLockPath(fixture)) {
          const inventory = await exporter.classifyReleaseOwnedPaths(
            staged.stageRoot,
            fixture.jobs,
            publicationIo,
          );
          expect(inventory.owned).toHaveLength(88);
          inspectedStage = true;
        }
        return mkdir(path, options);
      }) as typeof mkdir,
    };
    const lock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: checkingIo,
    });
    expect(inspectedStage).toBe(true);
    expect(Object.keys(JSON.parse(await readFile(lock.ownerPath, "utf8"))).sort()).toEqual([
      "mode",
      "nonce",
      "pid",
    ]);

    const contendedStage = await createOwnedPublicationStage(fixture);
    try {
      await expect(
        exporter.acquireDestinationLock({
          destinationRoot: fixture.destinationRoot,
          mode: "promotion",
          io: publicationIo,
        }),
      ).rejects.toThrow(/destination lock.*exists|already exists/i);
    } finally {
      await rm(contendedStage.stageRoot, { recursive: true, force: true });
    }
    await expect(lstat(contendedStage.stageRoot)).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await exporter.classifyReleaseOwnedPaths(
        fixture.repositoryRoot,
        fixture.jobs,
        publicationIo,
      ),
    ).toMatchObject({ owned: [], tempSiblings: [] });

    const changedPayload = JSON.parse(await readFile(lock.ownerPath, "utf8"));
    changedPayload.nonce = "f".repeat(32);
    await writeFile(lock.ownerPath, JSON.stringify(changedPayload));
    await expect(exporter.releaseDestinationLock(lock, publicationIo)).rejects.toThrow(
      /nonce/,
    );
    expect(lstatSync(lock.path).isDirectory()).toBe(true);
    await rm(lock.path, { recursive: true, force: true });

    const inodeLock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    const displaced = `${inodeLock.path}.displaced`;
    await rename(inodeLock.path, displaced);
    await mkdir(inodeLock.path, { mode: 0o700 });
    await writeFile(
      join(inodeLock.path, "owner.json"),
      JSON.stringify({
        nonce: inodeLock.nonce,
        pid: process.pid,
        mode: "promotion",
      }),
    );
    await expect(exporter.releaseDestinationLock(inodeLock, publicationIo)).rejects.toThrow(
      /inode|device/,
    );
    expect(lstatSync(inodeLock.path).isDirectory()).toBe(true);
    await rm(inodeLock.path, { recursive: true, force: true });
    await rm(displaced, { recursive: true, force: true });

    const releaseErrorStage = await createOwnedPublicationStage(fixture);
    const releaseErrorLock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    try {
      await expect(
        exporter.releaseDestinationLock(releaseErrorLock, {
          ...publicationIo,
          async unlink() {
            throw new Error("injected lock-release error");
          },
        }),
      ).rejects.toThrow(/lock-release error/);
    } finally {
      await rm(releaseErrorStage.stageRoot, { recursive: true, force: true });
      await rm(releaseErrorLock.path, { recursive: true, force: true });
    }
    await expect(lstat(releaseErrorStage.stageRoot)).rejects.toMatchObject({
      code: "ENOENT",
    });

    const finalLock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    await exporter.releaseDestinationLock(finalLock, publicationIo);
    await expect(lstat(finalLock.path)).rejects.toMatchObject({ code: "ENOENT" });
    await rm(staged.stageRoot, { recursive: true, force: true });
  });
});

type PromotionTrace = {
  readonly temporaryOpens: { path: string; flags: number }[];
  readonly fileFsyncs: string[];
  readonly verifiedStaged: string[];
  readonly renames: { from: string; to: string }[];
  readonly directoryFsyncs: string[];
};

function assertCompletePromotionTrace(trace: PromotionTrace) {
  expect(trace.temporaryOpens).toHaveLength(88);
  expect(
    trace.temporaryOpens.every(
      ({ flags }) => flags === (constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY),
    ),
  ).toBe(true);
  expect(trace.fileFsyncs).toHaveLength(88);
  expect(trace.verifiedStaged).toHaveLength(88);
  expect(trace.renames).toHaveLength(88);
  expect(trace.directoryFsyncs).toHaveLength(88);
  expect(trace.renames.at(-1)?.to).toBe(METADATA_RELATIVE);
  expect(trace.renames.slice(0, 87).every(({ to }) => to.endsWith(".glb"))).toBe(true);
}

describe("Era 8-10 manifest guard, manifest last, and production validation", () => {
  it("exclusively fsyncs, verifies, renames, and parent-fsyncs every GLB before metadata", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    const { plan } = await createOwnedPublicationStage(fixture);
    const prepared = await exporter.prepareManifestLastPromotion(
      plan,
      fixture.destinationRoot,
      publicationIo,
    );
    const trace: PromotionTrace = {
      temporaryOpens: [],
      fileFsyncs: [],
      verifiedStaged: [],
      renames: [],
      directoryFsyncs: [],
    };
    const tracingIo: ExporterIo = {
      ...publicationIo,
      async open(path, flags, mode) {
        const handle = await open(path, flags, mode);
        const pathString = String(path);
        if (basename(pathString).startsWith(".") && basename(pathString).endsWith(".tmp")) {
          trace.temporaryOpens.push({ path: pathString, flags: Number(flags) });
          return new Proxy(handle, {
            get(target, property) {
              if (property === "sync") {
                return async () => {
                  trace.fileFsyncs.push(pathString);
                  return target.sync();
                };
              }
              const value = Reflect.get(target, property, target);
              return typeof value === "function" ? value.bind(target) : value;
            },
          });
        }
        return handle;
      },
      async rename(from, to) {
        trace.renames.push({
          from: relative(fixture.repositoryRoot, String(from)),
          to: relative(fixture.repositoryRoot, String(to)),
        });
        await rename(from, to);
      },
      async fsyncDirectory(path) {
        trace.directoryFsyncs.push(relative(fixture.repositoryRoot, path));
        await publicationIo.fsyncDirectory(path);
      },
    };
    const lock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    try {
      await exporter.promoteManifestLast(prepared, lock, {
        io: tracingIo,
        boundary: async (name) => {
          if (name.startsWith("verified-staged:")) {
            trace.verifiedStaged.push(name.slice("verified-staged:".length));
          }
        },
      });
    } finally {
      await exporter.releaseDestinationLock(lock, publicationIo);
    }
    assertCompletePromotionTrace(trace);
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/generated manifest.*missing|required/i);
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo, {
        phase: "pre-generation-publication",
      }),
    ).resolves.toMatchObject({ compared: 88, mismatches: [] });
    expect(hashFile(fixture.sentinelPath)).toBe(fixture.sentinelHash);

    const generatedPath = join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE);
    const firstJob = fixture.jobs[0];
    if (!firstJob) throw new Error("generated-manifest fixture has no jobs");
    await writeFile(
      generatedPath,
      generatedManifestSource(fixture.metadata, fixture.jobs),
      {
        flag: "wx",
      },
    );
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).resolves.toMatchObject({ compared: 88 });
    await writeFile(
      generatedPath,
      removeGeneratedManifestJob(
        generatedManifestSource(fixture.metadata, fixture.jobs),
        fixture.metadata,
        firstJob,
      ),
    );
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/generated manifest.*(?:census|87 literal paths)/i);
  });

  it("classifies the exact shared-root population and fails closed on every invalid state", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    const { plan } = await createOwnedPublicationStage(fixture);
    const prepared = await exporter.prepareManifestLastPromotion(
      plan,
      fixture.destinationRoot,
      publicationIo,
    );
    const lock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    try {
      await exporter.promoteManifestLast(prepared, lock, {
        io: publicationIo,
        boundary: async () => {},
      });
    } finally {
      await exporter.releaseDestinationLock(lock, publicationIo);
    }

    const inventory = await exporter.classifyReleaseOwnedPaths(
      fixture.repositoryRoot,
      fixture.jobs,
      publicationIo,
    );
    expect(inventory.expected).toEqual(exporter.expectedReleaseOwnedPaths(fixture.jobs));
    expect(inventory.owned).toHaveLength(88);
    expect(inventory.unrelated).toContain(
      "apps/web/src/city/art/models/era-07-sentinel-built.glb",
    );
    expect(inventory.owned).not.toContain(
      "apps/web/src/city/art/models/era-07-sentinel-built.glb",
    );

    const first = fixture.jobs[0];
    if (!first) throw new Error("publication fixture has no jobs");
    const validTemp = join(
      dirname(join(fixture.repositoryRoot, first.relativeFile)),
      `.${basename(first.relativeFile)}.era8-10-${"a".repeat(32)}.tmp`,
    );
    await writeFile(validTemp, "temporary");
    expect(
      (
        await exporter.classifyReleaseOwnedPaths(
          fixture.repositoryRoot,
          fixture.jobs,
          publicationIo,
        )
      ).tempSiblings,
    ).toEqual([relative(fixture.repositoryRoot, validTemp)]);
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/temporary sibling/);
    await unlink(validTemp);

    const malformedTemp = `${validTemp.slice(0, -4)}-malformed.tmp`;
    await writeFile(malformedTemp, "unknown");
    expect(
      (
        await exporter.classifyReleaseOwnedPaths(
          fixture.repositoryRoot,
          fixture.jobs,
          publicationIo,
        )
      ).unknownCandidates,
    ).toContain(relative(fixture.repositoryRoot, malformedTemp));
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/unknown candidate/);
    await unlink(malformedTemp);

    const completeRoot = await fsOwnedTemp("era8-10-complete-copy-");
    await cp(fixture.repositoryRoot, completeRoot, { recursive: true });
    const cases: readonly [string, (root: string) => Promise<void>, RegExp][] = [
      [
        "absent metadata",
        (root) => unlink(join(root, METADATA_RELATIVE)),
        /missing.*metadata|owned path/i,
      ],
      [
        "malformed metadata",
        (root) => writeFile(join(root, METADATA_RELATIVE), "{"),
        /metadata.*JSON|parse/i,
      ],
      [
        "wrong census",
        async (root) => {
          const path = join(root, METADATA_RELATIVE);
          const value = JSON.parse(await readFile(path, "utf8"));
          value.census.outputs = 86;
          await writeFile(path, JSON.stringify(value));
        },
        /census/,
      ],
      [
        "missing GLB",
        (root) => unlink(join(root, first.relativeFile)),
        /missing.*owned|87 GLB/i,
      ],
      [
        "extra candidate",
        (root) => writeFile(`${join(root, first.relativeFile)}.bak`, "extra"),
        /unknown candidate/,
      ],
      [
        "symlink",
        async (root) => {
          const path = join(root, first.relativeFile);
          await unlink(path);
          await symlink(fixture.sentinelPath, path);
        },
        /unknown candidate|symlink/,
      ],
      [
        "wrong type",
        async (root) => {
          const path = join(root, first.relativeFile);
          await unlink(path);
          await mkdir(path);
        },
        /unknown candidate|regular file/,
      ],
      [
        "hash mismatch",
        (root) => writeFile(join(root, first.relativeFile), "changed"),
        /hash|byte count/,
      ],
    ];
    for (const [name, mutate, error] of cases) {
      const caseRoot = await fsOwnedTemp(`era8-10-invalid-${name.replaceAll(" ", "-")}-`);
      await cp(completeRoot, caseRoot, { recursive: true });
      await mutate(caseRoot);
      await expect(
        exporter.validateProductionManifest(caseRoot, publicationIo),
        name,
      ).rejects.toThrow(error);
    }
  });

  it("uses the strict source parser and canonical renderer for production manifests", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    const first = fixture.metadata.outputs[0];
    if (!first) throw new Error("strict production manifest fixture has no outputs");
    const generatedPath = join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE);
    const canonical = generatedManifestSource(fixture.metadata, fixture.jobs);
    const relativeLiteral = `./${relative(
      dirname(GENERATED_MANIFEST_RELATIVE),
      first.file,
    )}?url`;
    const cases = [
      [
        "repository-root bare import",
        canonical.replace(
          `import asset0 from ${JSON.stringify(relativeLiteral)};`,
          `import asset0 from ${JSON.stringify(`${first.file}?url`)};`,
        ),
        /static literal relative GLB URL|canonical renderer/i,
      ],
      [
        "renamed binding",
        canonical.replaceAll(/\basset0\b/g, "renamedAsset"),
        /canonical renderer/i,
      ],
      ["comment drift", `${canonical}// noncanonical\n`, /canonical renderer/i],
    ] as const;
    for (const [name, source, error] of cases) {
      await writeFile(generatedPath, source);
      await expect(
        exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
        name,
      ).rejects.toThrow(error);
    }
  });
});

describe("Era 8-10 release scope", () => {
  it("reads the exact 87 release GLBs plus metadata and rejects a partial child preflight", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await expect(
      exporter.classifyReleaseOwnedPaths(
        fixture.repositoryRoot,
        fixture.jobs,
        publicationIo,
      ),
    ).resolves.toMatchObject({ owned: [], tempSiblings: [], unknownCandidates: [] });
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/missing release-owned paths.*metadata/i);

    const staged = await createOwnedPublicationStage(fixture);
    const prepared = await exporter.prepareManifestLastPromotion(
      staged.plan,
      fixture.destinationRoot,
      publicationIo,
    );
    const lock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    try {
      await exporter.promoteManifestLast(prepared, lock, {
        io: publicationIo,
        boundary: async () => {},
      });
    } finally {
      await exporter.releaseDestinationLock(lock, publicationIo);
    }
    await writeFile(
      join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE),
      generatedManifestSource(fixture.metadata, fixture.jobs),
    );

    const reads: string[] = [];
    const result = await exporter.validateProductionManifest(fixture.repositoryRoot, {
      ...publicationIo,
      readFile: (async (
        path: Parameters<typeof readFile>[0],
        options?: Parameters<typeof readFile>[1],
      ) => {
        reads.push(relative(fixture.repositoryRoot, String(path)));
        return readFile(path, options);
      }) as typeof readFile,
    });
    const expected = exporter.expectedReleaseOwnedPaths(fixture.jobs);
    expect(result).toMatchObject({ compared: 88, mismatches: [] });
    expect(reads).toHaveLength(89);
    expect([...new Set(reads)].sort()).toEqual(
      [...expected, GENERATED_MANIFEST_RELATIVE].sort(),
    );
    const releaseHashes = Object.fromEntries(
      expected.map((path) => [path, hashFile(join(fixture.repositoryRoot, path))]),
    );
    expect(Object.keys(releaseHashes).sort()).toEqual(expected);
    expect(
      Object.values(releaseHashes).every((digest) => /^[a-f0-9]{64}$/.test(digest)),
    ).toBe(true);

    const complete = spawnSync(
      process.execPath,
      [CRASH_CHILD, "validate", fixture.repositoryRoot],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(complete.status, complete.stderr).toBe(0);

    const missing = fixture.jobs[0];
    if (!missing) throw new Error("release-scope fixture has no jobs");
    await unlink(join(fixture.repositoryRoot, missing.relativeFile));
    const partial = spawnSync(
      process.execPath,
      [CRASH_CHILD, "validate", fixture.repositoryRoot],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(partial.status).not.toBe(0);
    expect(partial.stderr).toContain(missing.relativeFile);
  });
});

describe("Era 8-10 explicit whitelisted repair", () => {
  it("holds the destination lock from classification through deletion before publication can begin", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    const first = fixture.jobs[0];
    if (!first) throw new Error("repair/publication fixture has no jobs");

    let classificationReached!: () => void;
    const atClassification = new Promise<void>((resolve) => {
      classificationReached = resolve;
    });
    let resumeClassification!: () => void;
    const classificationMayFinish = new Promise<void>((resolve) => {
      resumeClassification = resolve;
    });
    let paused = false;
    const interleavingIo: ExporterIo = {
      ...publicationIo,
      readdir: (async (path: Parameters<typeof readdir>[0]) => {
        const names = await readdir(path);
        if (!paused && String(path) === join(fixture.destinationRoot, "models")) {
          paused = true;
          classificationReached();
          await classificationMayFinish;
        }
        return names;
      }) as unknown as typeof readdir,
    };

    const repair = exporter.repairIncompleteLateEraOutput(
      repairDependencies(fixture.repositoryRoot, fixture.jobs, interleavingIo),
    );
    await atClassification;

    let publisherLock: Awaited<
      ReturnType<ExporterModule["acquireDestinationLock"]>
    > | null = null;
    let publisherError = "";
    try {
      publisherLock = await exporter.acquireDestinationLock({
        destinationRoot: fixture.destinationRoot,
        mode: "promotion",
        io: publicationIo,
      });
    } catch (error) {
      publisherError = error instanceof Error ? error.message : String(error);
    }
    if (publisherLock) {
      await exporter.releaseDestinationLock(publisherLock, publicationIo);
    }
    resumeClassification();
    await repair;

    expect(publisherError).toMatch(/destination lock.*exists|already exists/i);
    expect(paused).toBe(true);
    expect(
      await exporter.classifyReleaseOwnedPaths(
        fixture.repositoryRoot,
        fixture.jobs,
        publicationIo,
      ),
    ).toMatchObject({ owned: [], tempSiblings: [], generatedManifest: null });

    // Publication starts only after repair's finally has released its lock. Once promoted, the
    // already-completed repair has no remaining deletion that can remove these new bytes.
    await publishReviewFixture(exporter, fixture);
    expect(lstatSync(join(fixture.repositoryRoot, first.relativeFile)).isFile()).toBe(true);
  });

  it("refuses locks, symlinks, unknown candidates, and escapes, then deletes only its whitelist", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    const { plan } = await createOwnedPublicationStage(fixture);
    const prepared = await exporter.prepareManifestLastPromotion(
      plan,
      fixture.destinationRoot,
      publicationIo,
    );
    const lock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    try {
      await exporter.promoteManifestLast(prepared, lock, {
        io: publicationIo,
        boundary: async () => {},
      });
    } finally {
      await exporter.releaseDestinationLock(lock, publicationIo);
    }
    const generatedPath = join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE);
    await writeFile(generatedPath, generatedManifestSource(fixture.metadata, fixture.jobs));
    const first = fixture.jobs[0];
    if (!first) throw new Error("repair fixture has no jobs");
    const tempPath = join(
      dirname(join(fixture.repositoryRoot, first.relativeFile)),
      `.${basename(first.relativeFile)}.era8-10-${"b".repeat(32)}.tmp`,
    );
    await writeFile(tempPath, "temporary");

    const held = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    await expect(
      exporter.repairIncompleteLateEraOutput(
        repairDependencies(fixture.repositoryRoot, fixture.jobs),
      ),
    ).rejects.toThrow(/locked|destination lock/i);
    await exporter.releaseDestinationLock(held, publicationIo);
    expect(lstatSync(join(fixture.repositoryRoot, first.relativeFile)).isFile()).toBe(true);

    const unknown = `${join(fixture.repositoryRoot, first.relativeFile)}.unknown`;
    await writeFile(unknown, "unknown");
    await expect(
      exporter.repairIncompleteLateEraOutput(
        repairDependencies(fixture.repositoryRoot, fixture.jobs),
      ),
    ).rejects.toThrow(/unknown candidate/);
    await unlink(unknown);

    const originalBytes = await readFile(join(fixture.repositoryRoot, first.relativeFile));
    await unlink(join(fixture.repositoryRoot, first.relativeFile));
    await symlink(fixture.sentinelPath, join(fixture.repositoryRoot, first.relativeFile));
    await expect(
      exporter.repairIncompleteLateEraOutput(
        repairDependencies(fixture.repositoryRoot, fixture.jobs),
      ),
    ).rejects.toThrow(/symlink|unknown candidate/);
    await unlink(join(fixture.repositoryRoot, first.relativeFile));
    await writeFile(join(fixture.repositoryRoot, first.relativeFile), originalBytes);

    const escapedJobs = [
      { ...first, relativeFile: "../escape.glb" },
      ...fixture.jobs.slice(1),
    ] as readonly ExportJob[];
    await expect(
      exporter.repairIncompleteLateEraOutput(
        repairDependencies(fixture.repositoryRoot, escapedJobs),
      ),
    ).rejects.toThrow(/escape|release-owned path/);

    await exporter.repairIncompleteLateEraOutput(
      repairDependencies(fixture.repositoryRoot, fixture.jobs),
    );
    const after = await exporter.classifyReleaseOwnedPaths(
      fixture.repositoryRoot,
      fixture.jobs,
      publicationIo,
    );
    expect(after.owned).toEqual([]);
    expect(after.tempSiblings).toEqual([]);
    expect(after.generatedManifest).toBeNull();
    expect(hashFile(fixture.sentinelPath)).toBe(fixture.sentinelHash);
    expect(
      await readFile(
        join(fixture.destinationRoot, "building-sources/prior-era-source.txt"),
        "utf8",
      ),
    ).toBe("unrelated source");
  });
});

describe("Era 8-10 interruption matrix and atomic publication mutations", () => {
  it("makes TX001-TX021 and RND001-RND004 fail their intended final assertions", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    const { plan } = await createOwnedPublicationStage(fixture);
    const firstEntry = plan.entries[0];
    const secondEntry = plan.entries[1];
    const firstJob = fixture.jobs[0];
    const repairJob = fixture.jobs[2];
    if (!firstEntry || !secondEntry || !firstJob || !repairJob) {
      throw new Error("atomic publication fixture population is incomplete");
    }
    const messages: { id: string; message: string }[] = [];
    const record = async (
      id: string,
      action: () => unknown | Promise<unknown>,
      pattern: RegExp,
    ) => {
      let message = "";
      try {
        await action();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message, `${id} strict mutation was accepted`).toMatch(pattern);
      messages.push({ id, message });
    };

    const destinationSnapshot = treeDigest(fixture.destinationRoot);
    await record(
      "TX001",
      () =>
        exporter.prepareManifestLastPromotion(
          {
            ...plan,
            entries: [
              {
                ...firstEntry,
                stagedPath: join(fixture.fixtureRoot, firstEntry.relativeFile),
              },
              ...plan.entries.slice(1),
            ],
          },
          fixture.destinationRoot,
          publicationIo,
        ),
      /owned stage/,
    );
    expect(treeDigest(fixture.destinationRoot)).toBe(destinationSnapshot);
    await writeFile(firstEntry.stagedPath, "changed");
    await record(
      "TX002",
      () =>
        exporter.prepareManifestLastPromotion(plan, fixture.destinationRoot, publicationIo),
      /staged.*hash|byte count/,
    );
    await copyFile(
      join(fixture.fixtureRoot, firstEntry.relativeFile),
      firstEntry.stagedPath,
    );
    await record(
      "TX003",
      () =>
        exporter.prepareManifestLastPromotion(
          { ...plan, mode: "malformed" } as unknown as PublicationPlan,
          fixture.destinationRoot,
          publicationIo,
        ),
      /publication mode/,
    );
    for (const [id, changed, pattern] of [
      [
        "TX004",
        { ...secondEntry, finalPath: join(fixture.repositoryRoot, "..", "escape.glb") },
        /destination|escape/,
      ],
      [
        "TX005",
        { ...secondEntry, finalPath: fixture.destinationRoot },
        /destination|regular|path/,
      ],
      ["TX006", { ...secondEntry, stagedPath: fixture.sentinelPath }, /owned stage/],
      [
        "TX007",
        { ...secondEntry, finalPath: join(fixture.fixtureRoot, "leak.glb") },
        /destination|escape/,
      ],
    ] as const) {
      await record(
        id,
        () =>
          exporter.prepareManifestLastPromotion(
            { ...plan, entries: [firstEntry, changed, ...plan.entries.slice(2)] },
            fixture.destinationRoot,
            publicationIo,
          ),
        pattern,
      );
    }
    await writeFile(destinationLockPath(fixture), "preexisting");
    await record(
      "TX008",
      () =>
        exporter.acquireDestinationLock({
          destinationRoot: fixture.destinationRoot,
          mode: "promotion",
          io: publicationIo,
        }),
      /destination lock.*exists|already exists/i,
    );
    await unlink(destinationLockPath(fixture));
    const nonceLock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    const noncePayload = JSON.parse(await readFile(nonceLock.ownerPath, "utf8"));
    noncePayload.nonce = "d".repeat(32);
    await writeFile(nonceLock.ownerPath, JSON.stringify(noncePayload));
    await record(
      "TX009",
      () => exporter.releaseDestinationLock(nonceLock, publicationIo),
      /nonce/,
    );
    await rm(nonceLock.path, { recursive: true, force: true });
    const inodeLock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    await rename(inodeLock.path, `${inodeLock.path}.old`);
    await mkdir(inodeLock.path, { mode: 0o700 });
    await writeFile(
      join(inodeLock.path, "owner.json"),
      JSON.stringify({
        nonce: inodeLock.nonce,
        pid: process.pid,
        mode: "promotion",
      }),
    );
    await record(
      "TX010",
      () => exporter.releaseDestinationLock(inodeLock, publicationIo),
      /inode|device/,
    );
    await rm(inodeLock.path, { recursive: true, force: true });
    await rm(`${inodeLock.path}.old`, { recursive: true, force: true });
    await record(
      "TX011",
      () =>
        exporter.prepareManifestLastPromotion(
          { ...plan, entries: [plan.metadata, ...plan.entries.slice(1)] },
          fixture.destinationRoot,
          publicationIo,
        ),
      /87 GLB|metadata.*last/,
    );
    await record(
      "TX012",
      async () => {
        const path = plan.metadata.stagedPath;
        const malformed = Buffer.from("{}");
        await writeFile(path, malformed);
        return exporter.prepareManifestLastPromotion(
          {
            ...plan,
            metadata: {
              ...plan.metadata,
              bytes: malformed.byteLength,
              sha256: createHash("sha256").update(malformed).digest("hex"),
            },
          },
          fixture.destinationRoot,
          publicationIo,
        );
      },
      /metadata|staged.*byte count/,
    );

    const canonicalTrace: PromotionTrace = {
      temporaryOpens: Array.from({ length: 88 }, (_, index) => ({
        path: `temporary-${index}`,
        flags: constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      })),
      fileFsyncs: Array.from({ length: 88 }, (_, index) => `temporary-${index}`),
      verifiedStaged: Array.from({ length: 88 }, (_, index) => `staged-${index}`),
      renames: [
        ...fixture.jobs.map((job) => ({
          from: `.tmp-${job.seedInput}`,
          to: job.relativeFile,
        })),
        { from: ".tmp-metadata", to: METADATA_RELATIVE },
      ],
      directoryFsyncs: Array.from({ length: 88 }, (_, index) => `parent-${index}`),
    };
    for (const [id, mutate, pattern] of [
      [
        "TX013",
        (trace: DeepMutable<PromotionTrace>) => {
          const first = trace.temporaryOpens[0];
          if (!first) throw new Error("canonical trace has no temporary opens");
          first.flags = constants.O_WRONLY;
        },
        /expected true to be false|expected false to be true/,
      ],
      [
        "TX014",
        (trace: DeepMutable<PromotionTrace>) => {
          trace.fileFsyncs.pop();
        },
        /length/,
      ],
      [
        "TX015",
        (trace: DeepMutable<PromotionTrace>) => {
          trace.verifiedStaged.pop();
        },
        /length/,
      ],
      [
        "TX016",
        (trace: DeepMutable<PromotionTrace>) => {
          trace.renames.pop();
        },
        /length/,
      ],
      [
        "TX017",
        (trace: DeepMutable<PromotionTrace>) => {
          trace.directoryFsyncs.pop();
        },
        /length/,
      ],
      [
        "TX018",
        (trace: DeepMutable<PromotionTrace>) => {
          const metadata = trace.renames.pop();
          if (metadata) trace.renames.unshift(metadata);
        },
        /expected.*metadata|endsWith|to be/,
      ],
    ] as const) {
      const changed = structuredClone(canonicalTrace);
      mutate(changed);
      await record(id, () => assertCompletePromotionTrace(changed), pattern);
    }
    await writeFile(destinationLockPath(fixture), "locked");
    await record(
      "TX019",
      () =>
        exporter.repairIncompleteLateEraOutput(
          repairDependencies(fixture.repositoryRoot, fixture.jobs),
        ),
      /locked|destination lock/i,
    );
    await unlink(destinationLockPath(fixture));
    const repairSymlink = join(fixture.repositoryRoot, repairJob.relativeFile);
    await symlink(fixture.sentinelPath, repairSymlink);
    await record(
      "TX020",
      () =>
        exporter.repairIncompleteLateEraOutput(
          repairDependencies(fixture.repositoryRoot, fixture.jobs),
        ),
      /symlink|unknown candidate/,
    );
    await unlink(repairSymlink);
    await record(
      "TX021",
      () => {
        const escapedJobs = [
          {
            ...firstJob,
            relativeFile: "../../escape.glb",
          },
          ...fixture.jobs.slice(1),
        ] as readonly ExportJob[];
        return exporter.repairIncompleteLateEraOutput(
          repairDependencies(fixture.repositoryRoot, escapedJobs),
        );
      },
      /escape|release-owned path/,
    );
    expect(messages.map(({ id }) => id)).toEqual(
      Array.from({ length: 21 }, (_, index) => `TX${String(index + 1).padStart(3, "0")}`),
    );
    for (const { id, message } of messages) console.log(`${id}: ${message}`);

    const rndJobs = fixture.jobs;
    const seeded = new Map(
      rndJobs.map((job) => [job.seedInput, `seeded:${job.seedInput}`]),
    );
    const unseeded = new Map(
      rndJobs.map((job) => [job.seedInput, `unseeded:${job.seedInput}`]),
    );
    const canonical = canonicalRandomDependentByEra(rndJobs);
    const firstAtomic = canonical.atomic_age[0];
    if (!firstAtomic) throw new Error("Atomic random-dependent fixture is empty");
    const rndMessages: string[] = [];
    const rndRecord = (id: string, action: () => void) => {
      let message = "";
      try {
        action();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).not.toBe("");
      rndMessages.push(id);
    };
    const rnd001 = structuredClone(canonical);
    rnd001.atomic_age = rnd001.atomic_age.filter((name) => name !== firstAtomic);
    rndRecord("RND001", () =>
      assertSeedPartition(rndJobs, seeded, unseeded, new Set([firstAtomic]), rnd001),
    );
    const rnd002 = structuredClone(canonical);
    rnd002.atomic_age = rnd002.atomic_age.slice(1);
    rndRecord("RND002", () =>
      assertSeedPartition(rndJobs, seeded, unseeded, new Set(), rnd002),
    );
    const rnd003 = structuredClone(canonical);
    rnd003.cyberpunk = [...rnd003.cyberpunk, ...rnd003.atomic_age];
    rnd003.atomic_age = [];
    rndRecord("RND003", () =>
      assertSeedPartition(rndJobs, seeded, unseeded, new Set(), rnd003),
    );
    const rnd004 = structuredClone(canonical);
    [rnd004.atomic_age, rnd004.cyberpunk] = [rnd004.cyberpunk, rnd004.atomic_age];
    rndRecord("RND004", () =>
      assertSeedPartition(rndJobs, seeded, unseeded, new Set(), rnd004),
    );
    expect(rndMessages).toEqual(["RND001", "RND002", "RND003", "RND004"]);
  });

  it("refuses P000-P087 with the lock retained and accepts complete P088", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    const expectedHashes = new Map(
      fixture.metadata.outputs.map((row) => [row.file, row.sha256]),
    );
    for (let count = 0; count < 88; count += 1) {
      const repositoryRoot = await fsOwnedTemp(
        `era8-10-interruption-${String(count).padStart(3, "0")}-`,
      );
      const destinationRoot = join(repositoryRoot, "apps/web/src/city/art");
      await mkdir(join(destinationRoot, "models/townhall"), { recursive: true });
      await mkdir(join(destinationRoot, "building-sources"), { recursive: true });
      const sentinelPath = join(destinationRoot, "models/era-07-sentinel-built.glb");
      await writeFile(sentinelPath, "prior-era-sentinel");
      await writeFile(
        join(repositoryRoot, GENERATED_MANIFEST_RELATIVE),
        generatedManifestSource(fixture.metadata, fixture.jobs),
      );
      const ownerPath = join(repositoryRoot, `.owner-${count}.json`);
      const interrupted = spawnSync(
        process.execPath,
        [
          CRASH_CHILD,
          "publish",
          repositoryRoot,
          fixture.fixtureRoot,
          String(count),
          ownerPath,
        ],
        { cwd: ROOT, encoding: "utf8" },
      );
      expect(
        interrupted.status,
        `P${String(count).padStart(3, "0")}: ${interrupted.stderr}`,
      ).toBe(75);
      expect(
        lstatSync(join(destinationRoot, DESTINATION_LOCK_BASENAME)).isDirectory(),
      ).toBe(true);
      await expect(
        exporter.validateProductionManifest(repositoryRoot, publicationIo),
      ).rejects.toThrow();

      const released = spawnSync(
        process.execPath,
        [
          CRASH_CHILD,
          "release",
          repositoryRoot,
          fixture.fixtureRoot,
          String(count),
          ownerPath,
        ],
        { cwd: ROOT, encoding: "utf8" },
      );
      expect(released.status, released.stderr).toBe(0);
      await exporter.repairIncompleteLateEraOutput(
        repairDependencies(repositoryRoot, fixture.jobs),
      );
      expect(hashFile(sentinelPath)).toBe(fixture.sentinelHash);
      await expect(
        lstat(join(repositoryRoot, GENERATED_MANIFEST_RELATIVE)),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });

      const completed = spawnSync(
        process.execPath,
        [CRASH_CHILD, "publish", repositoryRoot, fixture.fixtureRoot, "88", ownerPath],
        { cwd: ROOT, encoding: "utf8" },
      );
      expect(completed.status, completed.stderr).toBe(0);
      await expect(
        exporter.validateProductionManifest(repositoryRoot, publicationIo, {
          phase: "pre-generation-publication",
        }),
      ).resolves.toMatchObject({ compared: 88, mismatches: [] });
      for (const [relativeFile, expectedHash] of expectedHashes) {
        expect(hashFile(join(repositoryRoot, relativeFile))).toBe(expectedHash);
      }
      expect(hashFile(sentinelPath)).toBe(fixture.sentinelHash);
      console.log(`P${String(count).padStart(3, "0")}: refused, repaired, reproduced`);
    }

    const completeRoot = await fsOwnedTemp("era8-10-interruption-complete-");
    await mkdir(join(completeRoot, "apps/web/src/city/art/models/townhall"), {
      recursive: true,
    });
    await mkdir(join(completeRoot, "apps/web/src/city/art/building-sources"), {
      recursive: true,
    });
    const ownerPath = join(completeRoot, ".owner-88.json");
    const complete = spawnSync(
      process.execPath,
      [CRASH_CHILD, "publish", completeRoot, fixture.fixtureRoot, "88", ownerPath],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(complete.status, complete.stderr).toBe(0);
    await expect(
      exporter.validateProductionManifest(completeRoot, publicationIo, {
        phase: "pre-generation-publication",
      }),
    ).resolves.toMatchObject({ compared: 88, mismatches: [] });
    console.log("P088: complete manifest accepted");
  });
});

describe("Era 8-10 CLI modes and owned scratch safety", () => {
  it("parses only the six supported exact command modes", async () => {
    const exporter = await exporterModule();
    expect(exporter.parseArgs([])).toMatchObject({
      mode: "production",
      bare: true,
      out: null,
    });
    expect(exporter.parseArgs(["--check"])).toMatchObject({ mode: "check", seeded: true });
    expect(exporter.parseArgs(["--check", "--no-seed"])).toMatchObject({
      mode: "no-seed",
      seeded: false,
    });
    expect(exporter.parseArgs(["--out", "owned-output"])).toMatchObject({
      mode: "custom",
      out: "owned-output",
    });
    expect(exporter.parseArgs(["--comparison"])).toMatchObject({
      mode: "comparison",
      bare: false,
    });
    expect(exporter.parseArgs(["--repair-incomplete-late-era-output"])).toMatchObject({
      mode: "repair",
    });

    for (const argv of [
      ["--unknown"],
      ["--check", "--check"],
      ["--out"],
      ["--out", ""],
      ["--check", "--out", "/tmp/owned/output"],
      ["--comparison", "--no-seed"],
      ["positional"],
    ]) {
      expect(() => exporter.parseArgs(argv), argv.join(" ")).toThrow();
    }
  });

  it("creates its own fixed-prefix parent and reports the actual retained custom root", async () => {
    const exporter = await exporterModule();
    const owned = await exporter.createOwnedCustomOutput("nested/output", publicationIo);
    expect(basename(owned.parentPath)).toMatch(/^era8-10-custom-output-/);
    expect(owned.path).toBe(join(owned.parentPath, "nested/output"));
    expect(lstatSync(owned.parentPath).isDirectory()).toBe(true);
    expect(lstatSync(owned.path).isDirectory()).toBe(true);
    expect(owned.nonce).toMatch(/^[a-f0-9]{32}$/);
    await owned.dispose();
    await expect(lstat(owned.parentPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  async function expectForgedHandlesRejected(exporter: ExporterModule) {
    const parent = await exporter.createOwnedCustomParent(publicationIo);
    const forged = Object.freeze({ ...parent });
    const cloned = Object.freeze({ ...parent, nonce: `${parent.nonce}` });
    const reconstructed = Object.freeze({
      path: parent.path,
      realPath: parent.realPath,
      nonce: parent.nonce,
      device: parent.device,
      inode: parent.inode,
      dispose: parent.dispose,
    });
    try {
      for (const handle of [forged, cloned, reconstructed]) {
        await expect(
          exporter.assertSafeCustomOutput("output", handle, publicationIo),
        ).rejects.toThrow(/invocation-owned parent handle/i);
        await expect(handle.dispose()).rejects.toThrow(/invocation-owned parent handle/i);
      }
    } finally {
      await parent.dispose();
    }
  }

  it("rejects forged, cloned, and reconstructed custom-parent handles", async () => {
    await expectForgedHandlesRejected(await exporterModule());
  });

  async function expectClonedHandleRejected(exporter: ExporterModule) {
    const parent = await exporter.createOwnedCustomParent(publicationIo);
    const cloned = Object.freeze({ ...parent, nonce: `${parent.nonce}` });
    try {
      await expect(
        exporter.assertSafeCustomOutput("output", cloned, publicationIo),
      ).rejects.toThrow(/invocation-owned parent handle/i);
    } finally {
      await parent.dispose();
    }
  }

  async function expectFirstLstatFailureCleans(exporter: ExporterModule) {
    const temporaryRoot = await fsOwnedTemp("era8-10-first-lstat-root-");
    const previous = process.env.TMPDIR;
    process.env.TMPDIR = temporaryRoot;
    let first = true;
    const io: ExporterIo = {
      ...publicationIo,
      lstat: (async (...args: Parameters<typeof lstat>) => {
        if (first) {
          first = false;
          throw new Error("injected first lstat failure");
        }
        return lstat(...args);
      }) as typeof lstat,
    };
    try {
      await expect(exporter.createOwnedCustomParent(io)).rejects.toThrow(
        /injected first lstat failure/,
      );
      expect(readdirSync(temporaryRoot)).toEqual([]);
    } finally {
      if (previous === undefined) delete process.env.TMPDIR;
      else process.env.TMPDIR = previous;
    }
  }

  it("removes the mkdtemp parent after its first identity read fails", async () => {
    await expectFirstLstatFailureCleans(await exporterModule());
  });

  async function expectSamePrefixReplacementPreserved(exporter: ExporterModule) {
    const temporaryRoot = await fsOwnedTemp("era8-10-first-lstat-replacement-");
    const previous = process.env.TMPDIR;
    process.env.TMPDIR = temporaryRoot;
    let replacementPath = "";
    let first = true;
    const io: ExporterIo = {
      ...publicationIo,
      lstat: (async (...args: Parameters<typeof lstat>) => {
        if (first) {
          first = false;
          replacementPath = String(args[0]);
          await rm(replacementPath, { recursive: true, force: true });
          await mkdir(replacementPath);
          throw new Error("injected first lstat replacement");
        }
        return lstat(...args);
      }) as typeof lstat,
    };
    try {
      await expect(exporter.createOwnedCustomParent(io)).rejects.toThrow(
        /identity changed|replacement/,
      );
      expect(replacementPath).not.toBe("");
      expect(lstatSync(replacementPath).isDirectory()).toBe(true);
      expect(readdirSync(temporaryRoot)).toEqual([basename(replacementPath)]);
    } finally {
      if (previous === undefined) delete process.env.TMPDIR;
      else process.env.TMPDIR = previous;
    }
  }

  it("preserves a same-prefix replacement after first-read failure", async () => {
    await expectSamePrefixReplacementPreserved(await exporterModule());
  });

  it("rejects absolute, traversal, and separator-free unsafe custom names before creating a parent", async () => {
    const exporter = await exporterModule();
    for (const name of [
      "/tmp/absolute-output",
      "../escape",
      "./output",
      "nested/../output",
      "",
    ]) {
      await expect(
        exporter.createOwnedCustomOutput(name, publicationIo),
        name,
      ).rejects.toThrow(/custom output/i);
    }
  });

  it("retains one successful relative custom output and cleans every failed owned parent", async () => {
    const exporter = await exporterModule();
    const temporaryRoot = await fsOwnedTemp("era8-10-main-custom-");
    const previous = process.env.TMPDIR;
    process.env.TMPDIR = temporaryRoot;
    try {
      const retained = await exporter.main(["--out", "output"], {
        io: publicationIo,
        pageFactory: fidelityPageFactory,
      });
      expect(retained).toBeTypeOf("string");
      expect(basename(retained as string)).toBe("output");
      expect(basename(dirname(retained as string))).toMatch(/^era8-10-custom-output-/);
      const metadata = JSON.parse(
        readFileSync(
          join(retained as string, "era-08-10-gridwork-export-metadata.json"),
          "utf8",
        ),
      );
      expect(metadata.outputs).toHaveLength(87);
      expect(metadata.bare).toBe(true);
      for (const row of metadata.outputs) {
        expect(hashFile(join(retained as string, row.file))).toBe(row.sha256);
      }
      await rm(dirname(retained as string), { recursive: true, force: true });
      expect(readdirSync(temporaryRoot)).toEqual([]);
      await expect(
        exporter.main(["--out", "../escape"], {
          io: publicationIo,
          pageFactory: async () => {
            throw new Error("invalid args must not launch a browser");
          },
        }),
      ).rejects.toThrow(/traversal/i);
      expect(readdirSync(temporaryRoot)).toEqual([]);
    } finally {
      if (previous === undefined) delete process.env.TMPDIR;
      else process.env.TMPDIR = previous;
    }
  });

  it("validates complete default production without launching a browser or mutating art", async () => {
    const exporter = await exporterModule();
    const before = treeDigest(ART_ROOT);
    await expect(
      exporter.main([], {
        io: publicationIo,
        pageFactory: async () => {
          throw new Error("complete production validation must not launch a browser");
        },
      }),
    ).resolves.toMatchObject({ compared: 88, mismatches: [] });
    expect(treeDigest(ART_ROOT)).toBe(before);
    expect(existsSync(join(ART_ROOT, DESTINATION_LOCK_BASENAME))).toBe(false);
  });

  async function intermediateSymlinkMessage(exporter: ExporterModule) {
    const parent = await exporter.createOwnedCustomParent(publicationIo);
    await symlink(parent.path, join(parent.path, "nested"));
    try {
      await exporter.assertSafeCustomOutput("nested/output", parent, publicationIo);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    } finally {
      await parent.dispose();
    }
  }

  async function expectIntermediateSymlinkRejected(exporter: ExporterModule) {
    expect(await intermediateSymlinkMessage(exporter)).toMatch(/symlink/i);
  }

  it("walks every custom-output ancestor and rejects intermediate symlinks", async () => {
    await expectIntermediateSymlinkRejected(await exporterModule());
  });

  it(
    "runs bare-false comparison only inside a disposed scratch root",
    async () => {
      const exporter = await exporterModule();
      const temporaryRoot = await fsOwnedTemp("era8-10-main-comparison-");
      const previous = process.env.TMPDIR;
      const before = treeDigest(ART_ROOT);
      process.env.TMPDIR = temporaryRoot;
      try {
        await exporter.main(["--comparison"], {
          io: publicationIo,
          pageFactory: fidelityPageFactory,
        });
        expect(readdirSync(temporaryRoot)).toEqual([]);
        expect(treeDigest(ART_ROOT)).toBe(before);
        expect(existsSync(join(ART_ROOT, DESTINATION_LOCK_BASENAME))).toBe(false);
      } finally {
        if (previous === undefined) delete process.env.TMPDIR;
        else process.env.TMPDIR = previous;
      }
    },
    30 * 60_000,
  );

  it("uses and removes owned scratch without acquiring production locks", async () => {
    const exporter = await exporterModule();
    const repositoryRoot = await fsOwnedTemp("era8-10-scratch-repository-");
    const calls: string[] = [];
    const io: ExporterIo = {
      ...publicationIo,
      mkdir: (async (
        path: Parameters<typeof mkdir>[0],
        options?: Parameters<typeof mkdir>[1],
      ) => {
        calls.push(`mkdir:${String(path)}`);
        return mkdir(path, options);
      }) as typeof mkdir,
    };
    await exporter.runOwnedScratchCheck({
      mode: "check",
      repositoryRoot,
      jobs: exporter.deriveExportJobs(),
      io,
      pageFactory: async () => {
        throw new Error("scratch checks must not open a browser before staging is wired");
      },
    });
    expect(calls.some((call) => call.includes(DESTINATION_LOCK_BASENAME))).toBe(false);
    expect(readdirSync(repositoryRoot)).toEqual([]);
  });

  it("proves duplicate and intermediate-symlink guards are load-bearing", async () => {
    const parserMutant = await mutatedExporter([
      {
        before: `if (flags.has(argument)) throw new Error(\`Duplicate exporter flag: \${argument}\`);`,
        after: "if (false) throw new Error('duplicate guard removed');",
      },
    ]);
    await expect(
      Promise.resolve().then(() => {
        expect(() => parserMutant.parseArgs(["--check", "--check"])).toThrow(/Duplicate/);
      }),
    ).rejects.toThrow();

    const outputMutant = await mutatedExporter([
      {
        before: "if (existing.isSymbolicLink()) {",
        after: "if (false) {",
      },
      {
        before: "if (isLeaf || !existing.isDirectory()) {",
        after: "if (isLeaf || false) {",
      },
      {
        before: "if (!current.isDirectory() || current.isSymbolicLink()) {",
        after: "if (false) {",
      },
    ]);
    await expect(expectIntermediateSymlinkRejected(outputMutant)).rejects.toThrow(
      /symlink/i,
    );

    const forgedHandleMutant = await mutatedExporter([
      {
        before: "const metadata = CUSTOM_PARENT_HANDLES.get(parent);",
        after: "const metadata = { ...parent, io };",
      },
    ]);
    await expect(expectForgedHandlesRejected(forgedHandleMutant)).rejects.toThrow();

    const clonedHandleMutant = await mutatedExporter([
      {
        before: "const metadata = CUSTOM_PARENT_HANDLES.get(parent);",
        after: "const metadata = CUSTOM_PARENT_HANDLES.get(parent) ?? { ...parent, io };",
      },
    ]);
    await expect(expectClonedHandleRejected(clonedHandleMutant)).rejects.toThrow();

    const firstLstatCleanupMutant = await mutatedExporter([
      {
        before: "await cleanupCapturedCustomParent(path, identity);",
        after: "void path;",
      },
    ]);
    await expect(expectFirstLstatFailureCleans(firstLstatCleanupMutant)).rejects.toThrow();

    const replacementCleanupMutant = await mutatedExporter([
      {
        before:
          'throw new Error("captured custom output parent identity changed before cleanup");',
        after: "await rmdir(path);",
      },
    ]);
    await expect(
      expectSamePrefixReplacementPreserved(replacementCleanupMutant),
    ).rejects.toThrow();
  });
});

type ReviewPreparedPlan = PublicationPlan & {
  readonly destinationRoot: string;
  readonly stageRoot: string;
};

async function prepareReviewPlan(
  exporter: ExporterModule,
  fixture: PublicationFixture,
  plan: PublicationPlan,
): Promise<ReviewPreparedPlan> {
  return exporter.prepareManifestLastPromotion(
    plan,
    fixture.destinationRoot,
    publicationIo,
  );
}

async function publishReviewFixture(exporter: ExporterModule, fixture: PublicationFixture) {
  const staged = await createOwnedPublicationStage(fixture);
  const plan = await exporter.prepareManifestLastPromotion(
    staged.plan,
    fixture.destinationRoot,
    publicationIo,
  );
  const lock = await exporter.acquireDestinationLock({
    destinationRoot: fixture.destinationRoot,
    mode: "promotion",
    io: publicationIo,
  });
  try {
    await exporter.promoteManifestLast(plan, lock, {
      io: publicationIo,
      boundary: async () => {},
    });
  } finally {
    await exporter.releaseDestinationLock(lock, publicationIo);
  }
}

async function createCrashRepository(prefix: string) {
  const repositoryRoot = await fsOwnedTemp(prefix);
  const destinationRoot = join(repositoryRoot, "apps/web/src/city/art");
  await mkdir(join(destinationRoot, "models/townhall"), { recursive: true });
  await mkdir(join(destinationRoot, "building-sources"), { recursive: true });
  return { repositoryRoot, destinationRoot };
}

describe("Task 4 review wave ownership and parsing", () => {
  it("TX022 releases only its lock directory and leaves a replacement owner intact", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    const lock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    let replacementCreated = false;
    try {
      expect((await lstat(lock.path)).isDirectory()).toBe(true);
      expect((Number((await lstat(lock.path)).mode) & 0o777).toString(8)).toBe("700");
      await exporter.releaseDestinationLock(lock, {
        ...publicationIo,
        async rmdir(path) {
          await rmdir(path);
          await mkdir(path, { mode: 0o700 });
          await writeFile(
            join(String(path), "owner.json"),
            `${JSON.stringify({
              nonce: "e".repeat(32),
              pid: process.pid,
              mode: "promotion",
            })}\n`,
            { flag: "wx", mode: 0o600 },
          );
          replacementCreated = true;
        },
      });
      expect(replacementCreated).toBe(true);
      expect((await lstat(lock.path)).isDirectory()).toBe(true);
      expect(JSON.parse(await readFile(join(lock.path, "owner.json"), "utf8")).nonce).toBe(
        "e".repeat(32),
      );
      console.log("TX022: replacement owner survived release");
    } finally {
      await rm(lock.path, { recursive: true, force: true });
    }
  });

  it("TX023 creation-failure cleanup cannot remove a replacement owner", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    const lockPath = destinationLockPath(fixture);
    let replacementCreated = false;
    const failingIo: ExporterIo = {
      ...publicationIo,
      async open(path, flags, mode) {
        if (String(path) === lockPath || String(path) === join(lockPath, "owner.json")) {
          throw new Error("injected owner-payload creation failure");
        }
        return open(path, flags, mode);
      },
      async rmdir(path) {
        await rmdir(path);
        await mkdir(path, { mode: 0o700 });
        await writeFile(join(String(path), "owner.json"), "replacement", {
          flag: "wx",
          mode: 0o600,
        });
        replacementCreated = true;
      },
    };
    try {
      await expect(
        exporter.acquireDestinationLock({
          destinationRoot: fixture.destinationRoot,
          mode: "promotion",
          io: failingIo,
        }),
      ).rejects.toThrow(/owner-payload creation failure/);
      expect(replacementCreated).toBe(true);
      expect(await readFile(join(lockPath, "owner.json"), "utf8")).toBe("replacement");
      console.log("TX023: creation cleanup preserved replacement");
    } finally {
      await rm(lockPath, { recursive: true, force: true });
    }
  });

  it("TX024 crash release rejects an arbitrary persisted lock path", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    const crash = await createCrashRepository("era8-10-review-lock-record-");
    const ownerPath = join(crash.repositoryRoot, ".owner.json");
    const interrupted = spawnSync(
      process.execPath,
      [CRASH_CHILD, "publish", crash.repositoryRoot, fixture.fixtureRoot, "0", ownerPath],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(interrupted.status, interrupted.stderr).toBe(75);
    const owner = JSON.parse(await readFile(ownerPath, "utf8"));
    const canonicalOwner = structuredClone(owner);
    const arbitraryPath = join(crash.repositoryRoot, "unrelated-owner-lock");
    await writeFile(
      arbitraryPath,
      `${JSON.stringify({
        nonce: owner.nonce,
        pid: process.pid,
        mode: "promotion",
      })}\n`,
    );
    const arbitraryStat = await lstat(arbitraryPath, { bigint: true });
    owner.path = arbitraryPath;
    owner.lockPath = arbitraryPath;
    owner.device = arbitraryStat.dev.toString();
    owner.inode = arbitraryStat.ino.toString();
    owner.lockDevice = arbitraryStat.dev.toString();
    owner.lockInode = arbitraryStat.ino.toString();
    await writeFile(ownerPath, JSON.stringify(owner));
    const released = spawnSync(
      process.execPath,
      [CRASH_CHILD, "release", crash.repositoryRoot, fixture.fixtureRoot, "0", ownerPath],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(released.status).not.toBe(0);
    expect((await lstat(arbitraryPath)).isFile()).toBe(true);
    expect((await lstat(destinationLockPath({ ...fixture, ...crash }))).isDirectory()).toBe(
      true,
    );
    await writeFile(ownerPath, JSON.stringify(canonicalOwner));
    const canonicalRelease = spawnSync(
      process.execPath,
      [CRASH_CHILD, "release", crash.repositoryRoot, fixture.fixtureRoot, "0", ownerPath],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(canonicalRelease.status, canonicalRelease.stderr).toBe(0);
    console.log("TX024: arbitrary persisted lock path refused");
  });

  it("TX025 crash release validates stage ownership before recursive deletion", async () => {
    const fixture = await createPublicationFixture(await exporterModule());
    const crash = await createCrashRepository("era8-10-review-stage-record-");
    const ownerPath = join(crash.repositoryRoot, ".owner.json");
    const interrupted = spawnSync(
      process.execPath,
      [CRASH_CHILD, "publish", crash.repositoryRoot, fixture.fixtureRoot, "0", ownerPath],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(interrupted.status, interrupted.stderr).toBe(75);
    const arbitraryStage = join(crash.repositoryRoot, "unrelated-stage");
    const arbitrarySentinel = join(arbitraryStage, "keep.txt");
    await mkdir(arbitraryStage);
    await writeFile(arbitrarySentinel, "keep");
    const owner = JSON.parse(await readFile(ownerPath, "utf8"));
    const canonicalOwner = structuredClone(owner);
    owner.stageRoot = arbitraryStage;
    await writeFile(ownerPath, JSON.stringify(owner));
    const released = spawnSync(
      process.execPath,
      [CRASH_CHILD, "release", crash.repositoryRoot, fixture.fixtureRoot, "0", ownerPath],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(released.status).not.toBe(0);
    expect(await readFile(arbitrarySentinel, "utf8")).toBe("keep");
    expect((await lstat(destinationLockPath({ ...fixture, ...crash }))).isDirectory()).toBe(
      true,
    );
    await writeFile(ownerPath, JSON.stringify(canonicalOwner));
    const canonicalRelease = spawnSync(
      process.execPath,
      [CRASH_CHILD, "release", crash.repositoryRoot, fixture.fixtureRoot, "0", ownerPath],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(canonicalRelease.status, canonicalRelease.stderr).toBe(0);
    console.log("TX025: arbitrary persisted stage path refused");
  });

  it("TX026 classifies an empty expected-stem directory before recursion", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    const first = fixture.jobs[0];
    if (!first) throw new Error("directory candidate fixture has no jobs");
    const candidate = `${join(fixture.repositoryRoot, first.relativeFile)}.backup`;
    await mkdir(candidate);
    const candidateRelative = relative(fixture.repositoryRoot, candidate);
    const inventory = await exporter.classifyReleaseOwnedPaths(
      fixture.repositoryRoot,
      fixture.jobs,
      publicationIo,
    );
    expect(inventory.unknownCandidates).toContain(candidateRelative);
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/unknown candidate/);
    console.log("TX026: empty candidate directory refused");
  });

  it("TX027 classifies a nonempty malformed-temp directory before recursion", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    const first = fixture.jobs[0];
    if (!first) throw new Error("directory candidate fixture has no jobs");
    const candidate = join(
      dirname(join(fixture.repositoryRoot, first.relativeFile)),
      `.${basename(first.relativeFile)}.era8-10-malformed.tmp`,
    );
    await mkdir(candidate);
    await writeFile(join(candidate, "nested.txt"), "must not hide the candidate");
    const candidateRelative = relative(fixture.repositoryRoot, candidate);
    const inventory = await exporter.classifyReleaseOwnedPaths(
      fixture.repositoryRoot,
      fixture.jobs,
      publicationIo,
    );
    expect(inventory.unknownCandidates).toContain(candidateRelative);
    await expect(
      exporter.repairIncompleteLateEraOutput(
        repairDependencies(fixture.repositoryRoot, fixture.jobs),
      ),
    ).rejects.toThrow(/unknown candidate/);
    console.log("TX027: nonempty malformed temporary directory refused");
  });

  it("TX028-TX034 clean only owned temporaries across every ordinary failure", async () => {
    const exporter = await exporterModule();
    const injections = [
      { id: "TX028", failure: "write" },
      { id: "TX029", failure: "file-fsync" },
      { id: "TX030", failure: "reread" },
      { id: "TX031", failure: "hash" },
      { id: "TX032", failure: "boundary" },
      { id: "TX033", failure: "rename" },
      { id: "TX034", failure: "parent-fsync" },
    ] as const;
    for (const injection of injections) {
      const fixture = await createPublicationFixture(exporter);
      const staged = await createOwnedPublicationStage(fixture);
      const prepared = await prepareReviewPlan(exporter, fixture, staged.plan);
      const first = prepared.entries[0];
      if (!first) throw new Error("prepared publication has no entries");
      const lock = await exporter.acquireDestinationLock({
        destinationRoot: fixture.destinationRoot,
        mode: "promotion",
        io: publicationIo,
      });
      const injectedIo: ExporterIo = {
        ...publicationIo,
        async open(path, flags, mode) {
          const handle = await open(path, flags, mode);
          if (!String(path).endsWith(`-${lock.nonce}.tmp`)) return handle;
          return new Proxy(handle, {
            get(target, property) {
              if (property === "writeFile" && injection.failure === "write") {
                return async () => {
                  throw new Error("injected temporary write failure");
                };
              }
              if (property === "sync" && injection.failure === "file-fsync") {
                return async () => {
                  throw new Error("injected temporary fsync failure");
                };
              }
              const value = Reflect.get(target, property, target);
              return typeof value === "function" ? value.bind(target) : value;
            },
          });
        },
        readFile: (async (
          path: Parameters<typeof readFile>[0],
          options?: Parameters<typeof readFile>[1],
        ) => {
          if (String(path) === first.stagedPath) {
            if (injection.failure === "reread") {
              throw new Error("injected staged reread failure");
            }
            if (injection.failure === "hash") return Buffer.from("changed-after-prepare");
          }
          return readFile(path, options);
        }) as typeof readFile,
        async rename(from, to) {
          if (
            injection.failure === "rename" &&
            String(from).endsWith(`-${lock.nonce}.tmp`)
          ) {
            throw new Error("injected temporary rename failure");
          }
          await rename(from, to);
        },
        async fsyncDirectory(path) {
          if (
            injection.failure === "parent-fsync" &&
            String(path) === dirname(first.finalPath)
          ) {
            throw new Error("injected parent fsync failure");
          }
          await publicationIo.fsyncDirectory(String(path));
        },
      };
      try {
        await expect(
          exporter.promoteManifestLast(prepared, lock, {
            io: injectedIo,
            boundary: async (name) => {
              if (
                injection.failure === "boundary" &&
                name === `verified-staged:${first.relativeFile}`
              ) {
                throw new Error("injected boundary failure");
              }
            },
          }),
        ).rejects.toThrow(/injected|changed immediately before rename/);
      } finally {
        await exporter.releaseDestinationLock(lock, publicationIo);
      }
      const names = await readdir(dirname(first.finalPath));
      expect(names.some((name) => name.endsWith(`-${lock.nonce}.tmp`))).toBe(false);
      const finalStat = await lstat(first.finalPath).catch(() => null);
      if (injection.failure === "parent-fsync") {
        expect(finalStat?.isFile()).toBe(true);
      } else {
        expect(finalStat).toBeNull();
      }
      expect(hashFile(fixture.sentinelPath)).toBe(fixture.sentinelHash);
      console.log(`${injection.id}: ${injection.failure} left zero temporary residue`);
    }
  });

  it("TX035 comments cannot spoof a missing generated-manifest import", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    const omitted = fixture.jobs[0];
    if (!omitted) throw new Error("generated-manifest fixture has no jobs");
    const generatedPath = join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE);
    const source = `${removeGeneratedManifestJob(
      generatedManifestSource(fixture.metadata, fixture.jobs),
      fixture.metadata,
      omitted,
    )}\n// ${JSON.stringify(
      `./${relative(dirname(GENERATED_MANIFEST_RELATIVE), omitted.relativeFile)}?url`,
    )}\n`;
    await writeFile(generatedPath, source);
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/generated manifest.*(?:census|87 literal paths)/i);
    console.log("TX035: comment spoof excluded from import census");
  });

  it("TX036 string literals cannot spoof a missing generated-manifest import", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    const omitted = fixture.jobs[0];
    if (!omitted) throw new Error("generated-manifest fixture has no jobs");
    const spoof = `./${relative(
      dirname(GENERATED_MANIFEST_RELATIVE),
      omitted.relativeFile,
    )}?url`;
    const source = `${removeGeneratedManifestJob(
      generatedManifestSource(fixture.metadata, fixture.jobs),
      fixture.metadata,
      omitted,
    )}\nconst deadText = ${JSON.stringify(spoof)};\nvoid deadText;\n`;
    await writeFile(join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE), source);
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/generated manifest.*census/i);
    console.log("TX036: string spoof excluded from import census");
  });

  it("TX037 invalid staged bytes are rejected before the crash fixture acquires a lock", async () => {
    const fixture = await createPublicationFixture(await exporterModule());
    const crash = await createCrashRepository("era8-10-review-invalid-stage-");
    const ownerPath = join(crash.repositoryRoot, ".owner.json");
    const invalid = spawnSync(
      process.execPath,
      [
        CRASH_CHILD,
        "publish",
        crash.repositoryRoot,
        fixture.fixtureRoot,
        "invalid-stage",
        ownerPath,
      ],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(invalid.status).not.toBe(0);
    expect(invalid.stderr).toMatch(/staged byte count\/hash mismatch/);
    await expect(
      lstat(join(crash.destinationRoot, DESTINATION_LOCK_BASENAME)),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(ownerPath)).rejects.toMatchObject({ code: "ENOENT" });
    console.log("TX037: invalid stage acquired no lock");
  });
});

describe("Task 4 final review wave", () => {
  it("TX038 revalidates all final paths under lock before a second prepared publisher writes", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    const firstStage = await createOwnedPublicationStage(fixture);
    const secondStage = await createOwnedPublicationStage(fixture);
    const firstPlan = await exporter.prepareManifestLastPromotion(
      firstStage.plan,
      fixture.destinationRoot,
      publicationIo,
    );
    const secondPlan = await exporter.prepareManifestLastPromotion(
      secondStage.plan,
      fixture.destinationRoot,
      publicationIo,
    );
    const firstLock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    try {
      await exporter.promoteManifestLast(firstPlan, firstLock, {
        io: publicationIo,
        boundary: async () => {},
      });
    } finally {
      await exporter.releaseDestinationLock(firstLock, publicationIo);
    }
    const before = new Map(
      fixture.metadata.outputs.map((row) => [
        row.file,
        hashFile(join(fixture.repositoryRoot, row.file)),
      ]),
    );
    let destinationTemporaryOpens = 0;
    const secondLock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    try {
      await expect(
        exporter.promoteManifestLast(secondPlan, secondLock, {
          io: {
            ...publicationIo,
            async open(path, flags, mode) {
              if (String(path).endsWith(`-${secondLock.nonce}.tmp`)) {
                destinationTemporaryOpens += 1;
              }
              return open(path, flags, mode);
            },
          },
          boundary: async () => {},
        }),
      ).rejects.toThrow(/destination.*exists.*under lock/i);
    } finally {
      await exporter.releaseDestinationLock(secondLock, publicationIo);
    }
    expect(destinationTemporaryOpens).toBe(0);
    for (const [relativeFile, expectedHash] of before) {
      expect(hashFile(join(fixture.repositoryRoot, relativeFile))).toBe(expectedHash);
    }
    console.log("TX038: second prepared publisher wrote zero destination temporaries");
  });

  it("TX039 rejects import-type paths even when the exported object references the type binding", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    const first = fixture.jobs[0];
    if (!first) throw new Error("import-type fixture has no jobs");
    const literal = `./${relative(
      dirname(GENERATED_MANIFEST_RELATIVE),
      first.relativeFile,
    )}?url`;
    const binding = `asset${generatedManifestAssetIndex(fixture.metadata, first)}`;
    const source = generatedManifestSource(fixture.metadata, fixture.jobs).replace(
      `import ${binding} from ${JSON.stringify(literal)};`,
      `import type { MissingAsset as ${binding} } from ${JSON.stringify(literal)};`,
    );
    await writeFile(join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE), source);
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/generated manifest.*value import/i);
    console.log("TX039: import type excluded from executable asset census");
  });

  it("TX040 rejects dead new-URL expressions in place of literal value imports", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    const first = fixture.jobs[0];
    if (!first) throw new Error("dead URL fixture has no jobs");
    const literal = `./${relative(
      dirname(GENERATED_MANIFEST_RELATIVE),
      first.relativeFile,
    )}?url`;
    const binding = `asset${generatedManifestAssetIndex(fixture.metadata, first)}`;
    const source = generatedManifestSource(fixture.metadata, fixture.jobs).replace(
      `import ${binding} from ${JSON.stringify(literal)};`,
      `const ${binding} = false && new URL(${JSON.stringify(literal)}, import.meta.url).href;`,
    );
    await writeFile(join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE), source);
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/generated manifest.*value import/i);
    console.log("TX040: dead new URL excluded from executable asset census");
  });

  it("rejects unused imports, missing object bindings, duplicate paths, and wrong paths", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    const [first, second] = fixture.jobs;
    if (!first || !second) throw new Error("binding fixture has fewer than two jobs");
    const generatedPath = join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE);
    const canonical = generatedManifestSource(fixture.metadata, fixture.jobs);
    const firstBinding = `asset${generatedManifestAssetIndex(fixture.metadata, first)}`;
    const secondBinding = `asset${generatedManifestAssetIndex(fixture.metadata, second)}`;
    const firstProperty = `  ${JSON.stringify(first.relativeFile)}: ${firstBinding},`;
    const firstLiteral = `./${relative(
      dirname(GENERATED_MANIFEST_RELATIVE),
      first.relativeFile,
    )}?url`;
    const secondLiteral = `./${relative(
      dirname(GENERATED_MANIFEST_RELATIVE),
      second.relativeFile,
    )}?url`;
    const cases = [
      ["unused import", canonical.replace(`${firstProperty}\n`, "")],
      [
        "missing binding",
        canonical.replace(
          firstProperty,
          firstProperty.replace(firstBinding, "missingAsset"),
        ),
      ],
      [
        "duplicate path",
        canonical.replace(
          `import ${secondBinding} from ${JSON.stringify(secondLiteral)};`,
          `import ${secondBinding} from ${JSON.stringify(firstLiteral)};`,
        ),
      ],
      [
        "wrong path",
        canonical.replace(
          `import ${firstBinding} from ${JSON.stringify(firstLiteral)};`,
          `import ${firstBinding} from "./models/not-release-owned.glb?url";`,
        ),
      ],
    ] as const;
    for (const [name, source] of cases) {
      await writeFile(generatedPath, source);
      await expect(
        exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
        name,
      ).rejects.toThrow(/generated manifest/i);
    }
  });

  it("TX041 owner-record wx failure releases the exact lock and ordinary stage", async () => {
    const fixture = await createPublicationFixture(await exporterModule());
    const crash = await createCrashRepository("era8-10-owner-write-failure-");
    const ownerPath = join(crash.repositoryRoot, ".owner.json");
    await writeFile(ownerPath, "preexisting owner sentinel", { flag: "wx" });
    const result = spawnSync(
      process.execPath,
      [CRASH_CHILD, "publish", crash.repositoryRoot, fixture.fixtureRoot, "88", ownerPath],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/EEXIST|file already exists/i);
    expect(await readFile(ownerPath, "utf8")).toBe("preexisting owner sentinel");
    await expect(
      lstat(join(crash.destinationRoot, DESTINATION_LOCK_BASENAME)),
    ).rejects.toMatchObject({ code: "ENOENT" });
    console.log("TX041: owner-record write failure left zero lock residue");
  });

  it("TX042 initial temp fstat failure removes the exact wx-created sibling", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    const staged = await createOwnedPublicationStage(fixture);
    const prepared = await exporter.prepareManifestLastPromotion(
      staged.plan,
      fixture.destinationRoot,
      publicationIo,
    );
    const first = prepared.entries[0];
    if (!first) throw new Error("fstat fixture has no prepared entries");
    const lock = await exporter.acquireDestinationLock({
      destinationRoot: fixture.destinationRoot,
      mode: "promotion",
      io: publicationIo,
    });
    let injected = false;
    try {
      await expect(
        exporter.promoteManifestLast(prepared, lock, {
          io: {
            ...publicationIo,
            async open(path, flags, mode) {
              const handle = await open(path, flags, mode);
              if (!String(path).endsWith(`-${lock.nonce}.tmp`) || injected) {
                return handle;
              }
              injected = true;
              return new Proxy(handle, {
                get(target, property) {
                  if (property === "stat") {
                    return async () => {
                      throw new Error("injected initial temporary fstat failure");
                    };
                  }
                  const value = Reflect.get(target, property, target);
                  return typeof value === "function" ? value.bind(target) : value;
                },
              });
            },
          },
          boundary: async () => {},
        }),
      ).rejects.toThrow(/initial temporary fstat failure/);
    } finally {
      await exporter.releaseDestinationLock(lock, publicationIo);
    }
    expect(injected).toBe(true);
    expect(
      (await readdir(dirname(first.finalPath))).some((name) =>
        name.endsWith(`-${lock.nonce}.tmp`),
      ),
    ).toBe(false);
    await expect(lstat(first.finalPath)).rejects.toMatchObject({ code: "ENOENT" });
    console.log("TX042: initial fstat failure left zero temporary residue");
  });
});

describe("Task 4 four-export manifest contract", () => {
  it("accepts the exact schema/files/urls/census generated contract", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    await writeFile(
      join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE),
      generatedManifestSource(fixture.metadata, fixture.jobs),
    );
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).resolves.toMatchObject({ compared: 88, mismatches: [] });
  });

  it("TX043-TX044 reject missing or extra named exports", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    const generatedPath = join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE);
    const canonical = generatedManifestSource(fixture.metadata, fixture.jobs);
    const missing = canonical.replace(
      "export const ERA8_TO10_ASSET_SCHEMA = 1 as const;\n",
      "",
    );
    await writeFile(generatedPath, missing);
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/missing.*ERA8_TO10_ASSET_SCHEMA|exactly four/i);
    console.log("TX043: missing named export refused");

    await writeFile(
      generatedPath,
      `${canonical}\nexport const ERA8_TO10_ASSET_EXTRA = true as const;\n`,
    );
    await expect(
      exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
    ).rejects.toThrow(/unexpected export|exactly four/i);
    console.log("TX044: extra named export refused");
  });

  it("TX045 rejects malformed schema, files, URLs, and census exports", async () => {
    const exporter = await exporterModule();
    const fixture = await createPublicationFixture(exporter);
    await publishReviewFixture(exporter, fixture);
    const generatedPath = join(fixture.repositoryRoot, GENERATED_MANIFEST_RELATIVE);
    const canonical = generatedManifestSource(fixture.metadata, fixture.jobs);
    const first = fixture.jobs[0];
    if (!first) throw new Error("four-export fixture has no jobs");
    const firstBinding = `asset${generatedManifestAssetIndex(fixture.metadata, first)}`;
    const malformed = [
      [
        "schema",
        canonical.replace(
          "export const ERA8_TO10_ASSET_SCHEMA = 1 as const;",
          "export const ERA8_TO10_ASSET_SCHEMA = 2 as const;",
        ),
      ],
      [
        "files",
        canonical.replace(
          `  ${JSON.stringify(first.relativeFile)},`,
          `  ${JSON.stringify(`${first.relativeFile}.wrong`)},`,
        ),
      ],
      [
        "urls",
        canonical.replace(
          `  ${JSON.stringify(first.relativeFile)}: ${firstBinding},`,
          `  ${JSON.stringify(first.relativeFile)}: "dead literal",`,
        ),
      ],
      [
        "census",
        canonical.replace(
          "export const ERA8_TO10_ASSET_CENSUS = 87 as const;",
          "export const ERA8_TO10_ASSET_CENSUS = 86 as const;",
        ),
      ],
    ] as const;
    for (const [name, source] of malformed) {
      await writeFile(generatedPath, source);
      await expect(
        exporter.validateProductionManifest(fixture.repositoryRoot, publicationIo),
        name,
      ).rejects.toThrow(
        new RegExp(`ERA8_TO10_ASSET_${name.toUpperCase()}|generated manifest`, "i"),
      );
    }
    console.log("TX045: malformed four-export shapes refused");
  });
});
