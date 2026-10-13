import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import type {
  ExportJob,
  MetadataDocument,
} from "../scripts/export-era8-10-building-models.mjs";
import {
  deriveExportJobs,
  expectedReleaseOwnedPaths,
  SOURCE_CONTRACT,
} from "../scripts/export-era8-10-building-models.mjs";
import * as manifestGenerator from "../scripts/generate-era8-10-asset-manifest.mjs";

const {
  generateEra8To10AssetManifest,
  parseEra8To10AssetManifestSource,
  renderEra8To10AssetManifest,
} = manifestGenerator;

const GENERATED_RELATIVE = "apps/web/src/city/art/era8To10AssetManifest.generated.ts";
const REAL_GENERATED = join(process.cwd(), GENERATED_RELATIVE);
const cleanups: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanups.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

function metadataFixture(jobs: readonly ExportJob[]): MetadataDocument {
  const outputs = [...jobs]
    .sort((left, right) => left.relativeFile.localeCompare(right.relativeFile))
    .map((job, index) => ({
      file: job.relativeFile,
      era: job.era,
      definition: job.definition,
      tab: job.tab,
      title: job.title,
      target: job.target,
      sourceFootprint: job.sourceFootprint,
      ordinal: job.ordinal,
      kind: job.kind,
      runtimeId: job.runtimeId,
      runtimeEra: job.runtimeEra,
      stage: job.stage,
      runtimeFootprint: job.runtimeFootprint,
      seedInput: job.seedInput,
      seed: job.seed,
      sha256: (index % 16).toString(16).repeat(64),
      bytes: index + 1,
      sourceMeshes: 1,
      shippedMeshes: 1,
      sourceTriangles: 1,
      shippedTriangles: 1,
      materialCount: 0,
      toonMaterialCount: 0,
      unlitMaterialCount: 0,
      baseMapCount: 0,
      textureCount: 0,
      embeddedImageCount: 0,
      anisotropyHistogram: {},
      samplerSemanticDigest: "c".repeat(64),
      colorSpaceRoles: { srgbColorMaps: 0, nonColorMaps: 0 },
      materialSemantics: [],
      toon: [],
      nonDefaultRenderOrderCount: 0,
      semanticDigest: "d".repeat(64),
      sourceBounds: { min: [0, 0, 0], max: [1, 1, 1], size: [1, 1, 1] },
      shippedBounds: { min: [0, 0, 0], max: [1, 1, 1], size: [1, 1, 1] },
    }));
  return {
    schema: 1,
    source: {
      repositoryPath:
        "apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html",
      bytes: SOURCE_CONTRACT.bytes,
      sha256: SOURCE_CONTRACT.sha256,
      manifestCount: SOURCE_CONTRACT.manifestCount,
      resources: SOURCE_CONTRACT.resources,
      decodedKitBytes: SOURCE_CONTRACT.decodedKitBytes,
      directRandomCalls: {
        atomic_age: 21,
        information_age: 29,
        cyberpunk: 5,
      },
    },
    generator: "scripts/export-era8-10-building-models.mjs",
    bare: true,
    seed: {
      hash: "fnv1a32",
      generator: "mulberry32",
      input: "output basename without .glb",
    },
    orderedImages: {
      strategy: "serialized invocation order",
      installedExporterSha256: "a".repeat(64),
    },
    batching: "world-transform + exact material/index/attribute/render-order signature",
    semanticTransport: {
      asset: "gridworkLateEraAsset",
      material: "gridworkMaterial",
      version: 1,
    },
    legacyEncoding: {
      bridgeVersion: 1,
      acceptedAssignments: 1_955,
      unsupportedAssignments: 0,
    },
    census: {
      definitions: 39,
      outputs: 87,
      byEra: {
        atomic_age: { definitions: 14, outputs: 32 },
        information_age: { definitions: 11, outputs: 23 },
        cyberpunk: { definitions: 14, outputs: 32 },
      },
      byKind: { skill: 72, civic: 12, townhall: 3 },
    },
    fidelity: {
      files: 87,
      alphaMismatches: 0,
      worstMeanRgbByteError: 0,
      worstP99RgbByteError: 0,
      resultsDigest: "b".repeat(64),
    },
    outputs,
    aggregates: {
      byEra: {},
      global: {},
    },
  } as unknown as MetadataDocument;
}

function mutableMetadata(metadata: MetadataDocument) {
  return structuredClone(metadata) as unknown as {
    census: { outputs: number };
    fidelity: { files: number };
    outputs: Array<Record<string, unknown>>;
  };
}

function outputAt(
  metadata: ReturnType<typeof mutableMetadata>,
  index: number,
): Record<string, unknown> {
  const output = metadata.outputs[index];
  if (!output) throw new Error(`metadata fixture has no output ${index}`);
  return output;
}

async function disposableGenerator() {
  const root = await mkdtemp(join(process.cwd(), "scripts/.era8-10-generator-test-"));
  cleanups.push(root);
  const scripts = join(root, "scripts");
  await mkdir(scripts);
  const generatorPath = join(scripts, "generate-era8-10-asset-manifest.mjs");
  await Promise.all([
    copyFile(
      join(process.cwd(), "scripts/generate-era8-10-asset-manifest.mjs"),
      generatorPath,
    ),
    copyFile(
      join(process.cwd(), "scripts/export-era8-10-building-models.mjs"),
      join(scripts, "export-era8-10-building-models.mjs"),
    ),
  ]);
  const module = (await import(
    `${pathToFileURL(generatorPath).href}?fixture=${Date.now()}-${Math.random()}`
  )) as typeof manifestGenerator;
  return {
    root,
    generatorPath,
    module,
    outputPath: join(root, GENERATED_RELATIVE),
  };
}

describe("Era 8-10 browser asset manifest generator", () => {
  const itWithFileSymlinks = process.platform === "win32" ? it.skip : it;
  it("renders and parses exactly four exports backed by 87 static literal Vite URLs", async () => {
    const jobs = deriveExportJobs();
    const input = { metadata: metadataFixture(jobs), jobs };
    const manifest = generateEra8To10AssetManifest(input);
    const expectedFiles = expectedReleaseOwnedPaths(jobs).filter((path) =>
      path.endsWith(".glb"),
    );

    expect(manifest).toEqual({
      schema: 1,
      files: expectedFiles,
      urls: Object.fromEntries(
        expectedFiles.map((path) => [
          path,
          `./${path.replace("apps/web/src/city/art/", "")}?url`,
        ]),
      ),
      census: 87,
    });
    expect(Object.keys(manifestGenerator).sort()).toEqual([
      "generateEra8To10AssetManifest",
      "parseEra8To10AssetManifestSource",
      "renderEra8To10AssetManifest",
      "writeEra8To10AssetManifest",
    ]);

    const source = renderEra8To10AssetManifest(input);
    const imports = [
      ...source.matchAll(
        /^import asset\d+ from "(\.\/models\/(?:townhall\/)?[^"]+\.glb\?url)";$/gm,
      ),
    ];
    const exportedSymbols = [
      ...source.matchAll(/^export const (ERA8_TO10_ASSET_[A-Z]+) =/gm),
    ].map((match) => match[1]);
    expect(imports).toHaveLength(87);
    expect(new Set(imports.map((match) => match[1]))).toHaveLength(87);
    expect(exportedSymbols).toEqual([
      "ERA8_TO10_ASSET_SCHEMA",
      "ERA8_TO10_ASSET_FILES",
      "ERA8_TO10_ASSET_URLS",
      "ERA8_TO10_ASSET_CENSUS",
    ]);
    expect(source).not.toMatch(/sha256|SHA-256|createHash/);
    expect(parseEra8To10AssetManifestSource(source)).toEqual(manifest);
    expect(await readFile(REAL_GENERATED, "utf8")).toBe(source);
  });

  it("rejects absent, partial, duplicate, unsorted, escaped, and mismatched metadata", () => {
    const jobs = deriveExportJobs();
    const metadata = metadataFixture(jobs);
    const firstJob = jobs[0];
    if (!firstJob) throw new Error("generator fixture has no jobs");
    const cases: readonly [string, () => unknown, RegExp][] = [
      [
        "absent metadata",
        () =>
          generateEra8To10AssetManifest({
            metadata: undefined as unknown as MetadataDocument,
            jobs,
          }),
        /metadata.*required/i,
      ],
      [
        "partial rows",
        () => {
          const changed = mutableMetadata(metadata);
          changed.outputs.pop();
          return generateEra8To10AssetManifest({
            metadata: changed as unknown as MetadataDocument,
            jobs,
          });
        },
        /exactly 87/,
      ],
      [
        "incomplete row",
        () => {
          const changed = mutableMetadata(metadata);
          delete outputAt(changed, 0).semanticDigest;
          return generateEra8To10AssetManifest({
            metadata: changed as unknown as MetadataDocument,
            jobs,
          });
        },
        /output 0.*keys|complete validated/i,
      ],
      [
        "duplicate rows",
        () => {
          const changed = mutableMetadata(metadata);
          changed.outputs[1] = structuredClone(outputAt(changed, 0));
          return generateEra8To10AssetManifest({
            metadata: changed as unknown as MetadataDocument,
            jobs,
          });
        },
        /duplicate/,
      ],
      [
        "unsorted rows",
        () => {
          const changed = mutableMetadata(metadata);
          changed.outputs.reverse();
          return generateEra8To10AssetManifest({
            metadata: changed as unknown as MetadataDocument,
            jobs,
          });
        },
        /sorted/,
      ],
      [
        "escaped path",
        () => {
          const changed = mutableMetadata(metadata);
          outputAt(changed, 0).file = "../escape.glb";
          return generateEra8To10AssetManifest({
            metadata: changed as unknown as MetadataDocument,
            jobs,
          });
        },
        /normalized POSIX|mismatch/,
      ],
      [
        "backslash path",
        () => {
          const changed = mutableMetadata(metadata);
          const output = outputAt(changed, 0);
          output.file = String(output.file).replaceAll("/", "\\");
          return generateEra8To10AssetManifest({
            metadata: changed as unknown as MetadataDocument,
            jobs,
          });
        },
        /normalized POSIX/,
      ],
      [
        "extra path",
        () => {
          const changed = mutableMetadata(metadata);
          outputAt(changed, 0).file = "apps/web/src/city/art/models/unknown-built.glb";
          changed.outputs.sort((left, right) =>
            String(left.file).localeCompare(String(right.file)),
          );
          return generateEra8To10AssetManifest({
            metadata: changed as unknown as MetadataDocument,
            jobs,
          });
        },
        /mismatch/,
      ],
      [
        "wrong census",
        () => {
          const changed = mutableMetadata(metadata);
          changed.census.outputs = 86;
          return generateEra8To10AssetManifest({
            metadata: changed as unknown as MetadataDocument,
            jobs,
          });
        },
        /census/,
      ],
      [
        "wrong jobs",
        () =>
          generateEra8To10AssetManifest({
            metadata,
            jobs: [
              { ...firstJob, relativeFile: "apps/web/src/city/art/models/unknown.glb" },
              ...jobs.slice(1),
            ],
          }),
        /release-owned path population|metadata output path mismatch/,
      ],
    ];

    for (const [name, action, error] of cases) {
      expect(action, name).toThrow(error);
    }
  });

  it("rejects missing, duplicate, nonliteral, and mismatched URL mappings from source text", () => {
    const jobs = deriveExportJobs();
    const source = renderEra8To10AssetManifest({
      metadata: metadataFixture(jobs),
      jobs,
    });
    const [first, second] = expectedReleaseOwnedPaths(jobs).filter((path) =>
      path.endsWith(".glb"),
    );
    if (!first || !second) throw new Error("manifest fixture has fewer than two files");
    const firstLiteral = `./${first.replace("apps/web/src/city/art/", "")}?url`;
    const secondLiteral = `./${second.replace("apps/web/src/city/art/", "")}?url`;
    const firstImport = `import asset0 from ${JSON.stringify(firstLiteral)};`;
    const secondImport = `import asset1 from ${JSON.stringify(secondLiteral)};`;
    const firstMapping = `  ${JSON.stringify(first)}: asset0,`;

    const malformed = [
      ["missing", source.replace(`${firstImport}\n`, ""), /missing|unused|census/i],
      [
        "duplicate",
        source.replace(secondImport, `import asset1 from ${JSON.stringify(firstLiteral)};`),
        /duplicate/,
      ],
      [
        "nonliteral",
        source.replace(firstImport, `const asset0 = ${JSON.stringify(firstLiteral)};`),
        /static literal|only imports/i,
      ],
      [
        "mismatched",
        source.replace(firstMapping, firstMapping.replace("asset0", "asset1")),
        /does not match|mismatch/i,
      ],
    ] as const;
    for (const [name, changed, error] of malformed) {
      expect(() => parseEra8To10AssetManifestSource(changed), name).toThrow(error);
    }
  });

  it("writes only the module-root canonical path and rejects external lookalikes", async () => {
    const realBefore = await readFile(REAL_GENERATED, "utf8");
    const fixture = await disposableGenerator();
    await mkdir(dirname(fixture.outputPath), { recursive: true });
    const jobs = deriveExportJobs();
    const input = { metadata: metadataFixture(jobs), jobs };

    await fixture.module.writeEra8To10AssetManifest(input, fixture.outputPath);
    expect(await readFile(fixture.outputPath, "utf8")).toBe(
      renderEra8To10AssetManifest(input),
    );
    const metadataPath = join(fixture.root, "validated-metadata.json");
    await writeFile(metadataPath, JSON.stringify(input.metadata));
    const cli = spawnSync(
      process.execPath,
      [fixture.generatorPath, "--metadata", metadataPath, "--out", fixture.outputPath],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(cli.status, cli.stderr).toBe(0);
    expect(await readFile(fixture.outputPath, "utf8")).toBe(
      renderEra8To10AssetManifest(input),
    );

    const externalRoot = await mkdtemp(join(tmpdir(), "era8-10-manifest-lookalike-"));
    cleanups.push(externalRoot);
    const lookalike = join(externalRoot, GENERATED_RELATIVE);
    await mkdir(dirname(lookalike), { recursive: true });
    await expect(
      fixture.module.writeEra8To10AssetManifest(input, lookalike),
    ).rejects.toThrow(/only writes.*module repository root|canonical/i);
    expect(await readdir(dirname(lookalike))).toEqual([]);
    const rejectedCli = spawnSync(
      process.execPath,
      [fixture.generatorPath, "--metadata", metadataPath, "--out", lookalike],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(rejectedCli.status).not.toBe(0);
    expect(rejectedCli.stderr).toMatch(/only writes.*module repository root|canonical/i);
    expect(await readdir(dirname(lookalike))).toEqual([]);
    expect(await readFile(REAL_GENERATED, "utf8")).toBe(realBefore);
  });

  itWithFileSymlinks(
    "rejects symlink ancestors, symlink outputs, and wrong-type outputs without writes",
    async () => {
      const realBefore = await readFile(REAL_GENERATED, "utf8");
      const jobs = deriveExportJobs();
      const input = { metadata: metadataFixture(jobs), jobs };
      const fixture = await disposableGenerator();
      await mkdir(dirname(fixture.outputPath), { recursive: true });

      const sentinel = join(fixture.root, "external-sentinel.ts");
      await writeFile(sentinel, "sentinel");
      await symlink(sentinel, fixture.outputPath);
      await expect(
        fixture.module.writeEra8To10AssetManifest(input, fixture.outputPath),
      ).rejects.toThrow(/output.*symlink|symbolic link/i);
      expect(await readFile(sentinel, "utf8")).toBe("sentinel");
      await unlink(fixture.outputPath);

      await mkdir(fixture.outputPath);
      await expect(
        fixture.module.writeEra8To10AssetManifest(input, fixture.outputPath),
      ).rejects.toThrow(/output.*regular file|wrong type/i);
      expect(await readdir(fixture.outputPath)).toEqual([]);

      const ancestorFixture = await disposableGenerator();
      const physicalApps = join(ancestorFixture.root, "physical-apps");
      await mkdir(join(physicalApps, "web/src/city/art"), { recursive: true });
      await symlink(physicalApps, join(ancestorFixture.root, "apps"));
      await expect(
        ancestorFixture.module.writeEra8To10AssetManifest(
          input,
          ancestorFixture.outputPath,
        ),
      ).rejects.toThrow(/ancestor.*symlink|symbolic link/i);
      expect(await readdir(join(physicalApps, "web/src/city/art"))).toEqual([]);
      expect(await readFile(REAL_GENERATED, "utf8")).toBe(realBefore);
    },
  );
});
