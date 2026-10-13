import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";

import { CIVIC_CATALOGUE, civicCatalogueForEra } from "@cr/economy";
import { ERA_SEQUENCE, getEraNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { cityModelUrls, nodeModelUrls } from "./buildingAssets";
import { CIVIC_MODEL_TYPE_IDS } from "./civicBuildings";
import {
  LATE_ERA_HALLS,
  LATE_ERA_SKILL_BUILDINGS,
  lateEraCivicIds,
} from "./era8To10RegistryPlan";
import { ERA_DRESSINGS } from "./eraDressing";
import { townHallModelUrls } from "./townHall";

const BUILDING_SOURCES = import.meta.glob("./art/building-sources/*.dc.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const CANONICAL_SOURCE = "./art/building-sources/era-08-10-gridwork-all-buildings.dc.html";
const ROOT = process.env.INIT_CWD ?? process.cwd();
const CANDIDATE_ROOT = process.env.ERA8_10_CANDIDATE_ROOT;
const CANDIDATE_METADATA = "era-08-10-gridwork-export-metadata.json";
const METADATA_KEYS = [
  "aggregates",
  "bare",
  "batching",
  "census",
  "fidelity",
  "generator",
  "legacyEncoding",
  "orderedImages",
  "outputs",
  "schema",
  "seed",
  "semanticTransport",
  "source",
] as const;
const OUTPUT_KEYS = [
  "anisotropyHistogram",
  "baseMapCount",
  "bytes",
  "colorSpaceRoles",
  "definition",
  "embeddedImageCount",
  "era",
  "file",
  "kind",
  "materialCount",
  "materialSemantics",
  "nonDefaultRenderOrderCount",
  "ordinal",
  "runtimeEra",
  "runtimeFootprint",
  "runtimeId",
  "samplerSemanticDigest",
  "seed",
  "seedInput",
  "semanticDigest",
  "sha256",
  "shippedBounds",
  "shippedMeshes",
  "shippedTriangles",
  "sourceBounds",
  "sourceFootprint",
  "sourceMeshes",
  "sourceTriangles",
  "stage",
  "tab",
  "target",
  "textureCount",
  "title",
  "toon",
  "toonMaterialCount",
  "unlitMaterialCount",
] as const;

interface CandidateGlb {
  readonly asset: { readonly version: string };
  readonly scene: number;
  readonly scenes: readonly {
    readonly extras?: { readonly gridworkLateEraAsset?: unknown };
  }[];
  readonly buffers: readonly { readonly uri?: string }[];
  readonly images?: readonly { readonly uri?: string; readonly bufferView?: number }[];
  readonly animations?: readonly unknown[];
  readonly cameras?: readonly unknown[];
  readonly skins?: readonly unknown[];
  readonly extensions?: Readonly<Record<string, unknown>>;
  readonly extensionsUsed?: readonly string[];
  readonly materials?: readonly {
    readonly extras?: { readonly gridworkMaterial?: unknown };
  }[];
  readonly nodes?: readonly {
    readonly extras?: { readonly gridworkRenderOrder?: number };
  }[];
}

function expectExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
  label: string,
): void {
  expect(Object.keys(value).sort(), label).toEqual([...expected].sort());
}

function requireCandidateFile(root: string, file: string): string {
  const path = join(root, file);
  if (!existsSync(path)) throw new Error(`candidate output missing: ${basename(file)}`);
  const entry = lstatSync(path);
  if (!entry.isFile() || entry.isSymbolicLink()) {
    throw new Error(`candidate output is not a regular file: ${basename(file)}`);
  }
  return path;
}

function candidateFiles(root: string): readonly string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const entry = lstatSync(path);
      if (entry.isSymbolicLink())
        throw new Error(`candidate output contains symlink: ${name}`);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.push(relative(root, path));
      else throw new Error(`candidate output contains unsupported entry: ${name}`);
    }
  };
  visit(root);
  return files.sort();
}

function expectPortableMetadata(value: unknown, path = "metadata"): void {
  if (typeof value === "string") {
    expect(value, `${path} contains a physical path`).not.toMatch(/^(?:\/|[A-Za-z]:[\\/])/);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      expectPortableMetadata(entry, `${path}[${index}]`);
    });
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    expect(key, `${path} contains a machine-local key`).not.toMatch(
      /^(?:timestamp|createdAt|generatedAt|pid|hostname|host|browserProfile|browserProfilePath|userDataDir)$/,
    );
    expectPortableMetadata(entry, `${path}.${key}`);
  }
}

describe("Era 8-10 prerequisites and canonical source", () => {
  it("keeps the landed baseline and exact Early Modern fallback inside the final release", () => {
    const baselineNodes = ERA_SEQUENCE.flatMap((era) => getEraNodes(era.id)).filter(
      (nodeId) => nodeModelUrls(nodeId).length === 3,
    );
    expect(baselineNodes).toHaveLength(56);
    expect(cityModelUrls()).toHaveLength(168);
    expect(CIVIC_MODEL_TYPE_IDS).toHaveLength(36);
    expect(townHallModelUrls()).toHaveLength(11);
    expect(Object.keys(ERA_DRESSINGS)).toHaveLength(9);
    expect(
      getEraNodes("renaissance").filter((nodeId) => nodeModelUrls(nodeId).length !== 3),
    ).toEqual(["GEO.1", "GEO.2", "CG.1", "POL.6", "POL.7", "RAT.5"]);
  });

  it("promotes the exact late-era runtime population without filling Early Modern gaps", () => {
    const lateNodes = ["atomic_age", "information_age", "cyberpunk"].flatMap((eraId) =>
      getEraNodes(eraId as "atomic_age" | "information_age" | "cyberpunk"),
    );

    expect(lateNodes).toHaveLength(24);
    for (const nodeId of lateNodes) {
      expect(nodeModelUrls(nodeId), nodeId).toHaveLength(3);
    }
    expect(cityModelUrls()).toHaveLength(168);
    expect(CIVIC_MODEL_TYPE_IDS).toHaveLength(36);
    expect(townHallModelUrls()).toHaveLength(11);
    expect(Object.keys(ERA_DRESSINGS)).toHaveLength(9);
    expect(
      getEraNodes("renaissance").filter((nodeId) => nodeModelUrls(nodeId).length !== 3),
    ).toEqual(["GEO.1", "GEO.2", "CG.1", "POL.6", "POL.7", "RAT.5"]);
  });

  it("assigns every late-era source resource to the canonical standalone alone", async () => {
    const exporter = await import("../../../../scripts/export-era8-10-building-models.mjs");
    exporter.assertCanonicalKitOwnership(BUILDING_SOURCES);
    exporter.assertCanonicalSource(
      new TextEncoder().encode(BUILDING_SOURCES[CANONICAL_SOURCE]),
    );
  });

  it("scopes the repository whitespace exception to the byte-canonical source alone", () => {
    const attributesPath = join(ROOT, ".gitattributes");
    expect(existsSync(attributesPath), "the canonical-byte exception is not declared").toBe(
      true,
    );
    if (!existsSync(attributesPath)) return;

    const whitespaceExceptions = readFileSync(attributesPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .filter((line) => /(?:^|\s)-whitespace(?:\s|$)/.test(line));
    expect(whitespaceExceptions).toEqual([
      "apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html -whitespace",
    ]);
  });

  it("rejects every partial late-era resource copy", async () => {
    const exporter = await import("../../../../scripts/export-era8-10-building-models.mjs");
    for (const [era, resourceId] of Object.entries(exporter.SOURCE_CONTRACT.resources)) {
      if (era === "three") continue;
      expect(() =>
        exporter.assertCanonicalKitOwnership({
          ...BUILDING_SOURCES,
          [`./art/building-sources/${era}-partial.dc.html`]: resourceId,
        }),
      ).toThrow(`${era} resource ${resourceId} owners:`);
    }
  });

  it("promotes the validated browser manifest into every production registry", () => {
    const taskFiles = [
      "apps/web/src/city/era8To10ExporterSafety.test.ts",
      "apps/web/src/city/era8To10BuildingModels.test.ts",
      "scripts/export-era8-10-building-models.d.mts",
      "scripts/generate-era8-10-asset-manifest.mjs",
      "scripts/generate-era8-10-asset-manifest.d.mts",
      "test/generateEra8To10AssetManifest.test.ts",
      "test/support/era8To10ExporterCrashChild.mjs",
    ];
    expect(taskFiles).toHaveLength(7);
    expect(taskFiles.every((path) => existsSync(join(ROOT, path)))).toBe(true);

    const generated = "apps/web/src/city/art/era8To10AssetManifest.generated.ts";
    const browserTest = "apps/web/src/city/era8To10AssetManifest.browser.test.tsx";
    expect(existsSync(join(ROOT, generated))).toBe(true);
    expect(existsSync(join(ROOT, browserTest))).toBe(true);

    for (const consumer of [
      "apps/web/src/city/buildingAssets.ts",
      "apps/web/src/city/civicBuildings.ts",
      "apps/web/src/city/townHall.ts",
    ]) {
      expect(readFileSync(join(ROOT, consumer), "utf8")).toContain(
        "era8To10AssetManifest.generated",
      );
    }

    const packageDocument = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(packageDocument.scripts).toHaveProperty("check:era8-10-models");
    expect(packageDocument.scripts).toHaveProperty("test:era8-10-manifest");
    expect(readFileSync(join(ROOT, ".github/workflows/invariants.yml"), "utf8")).toMatch(
      /era8-10-(?:models|manifest)/,
    );
  });
});

describe("Era 8-10 registry plan", () => {
  it("declares every late-era skill handle, mass, and subtitle exactly", () => {
    expect(LATE_ERA_SKILL_BUILDINGS).toEqual({
      atomic_age: {
        "FUN.4": ["Assembly Hall", "hall", "the Weather Office"],
        "LF.1": ["Assembly Hall", "hall", "the Telephone Exchange"],
        "FUN.6": ["Store", "store", "the Radio Workshop"],
        "FUN.5": ["Workshop", "workshop", "the Wind Tunnel"],
        "FUN.9": ["Dwellings", "dwelling", "the Housing Blocks"],
        "LF.2": ["Workshop", "workshop", "the Electronics Works"],
        "LF.3": ["Store", "store", "the Nuclear Weapons Facility"],
        "FUN.10": ["Commons", "yard", "the Power Station"],
        "LF.4": ["Tower", "tower", "the Cooling Tower"],
      },
      information_age: {
        "EL.1": ["Assembly Hall", "hall", "the Data Centre"],
        "EL.2": ["Tower", "tower", "the Office Tower"],
        "EL.3": ["Workshop", "workshop", "the Chip Factory"],
        "EL.4": ["Store", "store", "the Research Lab"],
        "EL.5": ["Dwellings", "dwelling", "the Glass Apartments"],
        "EL.6": ["Commons", "yard", "the Air Force Base"],
      },
      cyberpunk: {
        "TRG.1": ["Commons", "yard", "the Neon Plaza"],
        "TRG.2": ["Workshop", "workshop", "Drone Command"],
        "TRG.3": ["Assembly Hall", "hall", "the Hologram Theatre"],
        "TRG.4": ["Tower", "tower", "the Signal Tower"],
        "TRG.5": ["Store", "store", "the Data Vault"],
        "TRG.6": ["Tower", "tower", "the Broadcast Tower"],
        "TRG.7": ["Workshop", "workshop", "the Robotics Lab"],
        "TRG.8": ["Assembly Hall", "hall", "the Stock Exchange"],
        "TRG.9": ["Dwellings", "dwelling", "the Quantum Core"],
      },
    });
  });

  it("declares every late-era Hall subtitle and basename separately from its stable id", () => {
    expect(LATE_ERA_HALLS).toEqual({
      atomic_age: {
        subtitle: "the Heating Plant",
        basename: "townhall-atomic-age-built.glb",
        runtimeId: "town-hall",
        runtimeEra: "atomic_age",
      },
      information_age: {
        subtitle: "the Headquarters",
        basename: "townhall-information-age-built.glb",
        runtimeId: "town-hall",
        runtimeEra: "information_age",
      },
      cyberpunk: {
        subtitle: "the Steam Vent",
        basename: "townhall-cyberpunk-built.glb",
        runtimeId: "town-hall",
        runtimeEra: "cyberpunk",
      },
    });
  });

  it("derives exactly four civic ids per late era from catalogue rows, never display identity", () => {
    for (const era of ["atomic_age", "information_age", "cyberpunk"] as const) {
      expect(lateEraCivicIds(CIVIC_CATALOGUE, era)).toEqual(
        civicCatalogueForEra(era).map((row) => row.id),
      );
    }
  });

  it("rejects a catalogue era with other than four distinct civic rows", () => {
    expect(() =>
      lateEraCivicIds(
        [
          { era: "atomic_age", id: "one" },
          { era: "atomic_age", id: "two" },
          { era: "atomic_age", id: "three" },
          { era: "atomic_age", id: "three" },
        ],
        "atomic_age",
      ),
    ).toThrow("exactly four unique civic rows");
  });

  it("does not couple pure registry data to production availability or display identity", () => {
    const source = readFileSync(
      join(ROOT, "apps/web/src/city/era8To10RegistryPlan.ts"),
      "utf8",
    );
    expect(source).not.toMatch(
      /civicOptionsForEra|hasAuthoredEraTownHall|nodeModelUrls|resolve(?:Building|Civic|TownHall)Model/,
    );
    expect(source).not.toMatch(/displayName|buildingDisplayName|buildingName|\.name\b/);
  });
});

describe.skipIf(!CANDIDATE_ROOT)("Task 10 owned candidate contract", () => {
  it("contains the exact 87 planned GLBs plus deterministic full-shape metadata", async () => {
    const root = CANDIDATE_ROOT as string;
    const exporter = await import("../../../../scripts/export-era8-10-building-models.mjs");
    const plannedJobs = exporter.deriveExportJobs();
    for (const job of plannedJobs) requireCandidateFile(root, job.relativeFile);
    const jobs = [...plannedJobs].sort((left, right) =>
      left.relativeFile.localeCompare(right.relativeFile),
    );
    const metadataPath = requireCandidateFile(root, CANDIDATE_METADATA);
    const actualFiles = candidateFiles(root);
    const candidateBasenames = actualFiles
      .filter((file) => file.endsWith(".glb"))
      .map((file) => basename(file));
    expect(new Set(candidateBasenames).size, "candidate GLB basenames are unique").toBe(
      candidateBasenames.length,
    );
    expect(actualFiles, "candidate inventory is exact").toEqual(
      [...jobs.map((job) => job.relativeFile), CANDIDATE_METADATA].sort(),
    );
    expect(new Set(jobs.map((job) => basename(job.relativeFile))).size).toBe(87);

    const metadataBytes = readFileSync(metadataPath);
    const metadata = JSON.parse(metadataBytes.toString("utf8"));
    expectExactKeys(metadata, METADATA_KEYS, "metadata top-level keys");
    expect(metadata.schema).toBe(1);
    expect(metadata.bare).toBe(true);
    expect(metadata.generator).toBe("scripts/export-era8-10-building-models.mjs");
    expect(metadata.source).toEqual({
      repositoryPath:
        "apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html",
      bytes: exporter.SOURCE_CONTRACT.bytes,
      sha256: exporter.SOURCE_CONTRACT.sha256,
      manifestCount: exporter.SOURCE_CONTRACT.manifestCount,
      resources: exporter.SOURCE_CONTRACT.resources,
      decodedKitBytes: exporter.SOURCE_CONTRACT.decodedKitBytes,
      directRandomCalls: {
        atomic_age: 21,
        information_age: 29,
        cyberpunk: 5,
      },
    });
    expect(metadata.seed).toEqual({
      hash: "fnv1a32",
      generator: "mulberry32",
      input: "output basename without .glb",
    });
    expect(metadata.orderedImages.strategy).toBe("serialized invocation order");
    expect(metadata.orderedImages.installedExporterSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(metadata.batching).toBe(
      "world-transform + exact material/index/attribute/render-order signature",
    );
    expect(metadata.semanticTransport).toEqual({
      asset: "gridworkLateEraAsset",
      material: "gridworkMaterial",
      version: 1,
    });
    expect(metadata.legacyEncoding.bridgeVersion).toBe(1);
    expect(metadata.legacyEncoding.acceptedAssignments).toBeGreaterThan(0);
    expect(metadata.legacyEncoding.unsupportedAssignments).toBe(0);
    expect(metadata.census, "candidate census is exact").toEqual({
      definitions: 39,
      outputs: 87,
      byEra: {
        atomic_age: { definitions: 14, outputs: 32 },
        information_age: { definitions: 11, outputs: 23 },
        cyberpunk: { definitions: 14, outputs: 32 },
      },
      byKind: { skill: 72, civic: 12, townhall: 3 },
    });
    expect(metadata.fidelity.files).toBe(87);
    expect(metadata.fidelity.alphaMismatches).toBe(0);
    expect(metadata.fidelity.worstMeanRgbByteError).toBeLessThanOrEqual(0.5);
    expect(metadata.fidelity.worstP99RgbByteError).toBeLessThanOrEqual(2);
    expect(metadata.fidelity.resultsDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(metadata.outputs).toHaveLength(87);
    expect(metadata.outputs.map((row: { file: string }) => row.file)).toEqual(
      jobs.map((job) => job.relativeFile),
    );

    for (const [index, row] of metadata.outputs.entries()) {
      const job = jobs[index];
      if (!job) throw new Error(`candidate metadata has an unplanned row at ${index}`);
      expectExactKeys(row, OUTPUT_KEYS, `metadata output keys: ${row.file}`);
      expect(row).toMatchObject({
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
        runtimeFootprint: job.runtimeFootprint,
        stage: job.stage,
        seedInput: job.seedInput,
        seed: job.seed,
      });
      const bytes = readFileSync(requireCandidateFile(root, row.file));
      expect(bytes.byteLength, `${row.file} byte count`).toBe(row.bytes);
      expect(createHash("sha256").update(bytes).digest("hex"), `${row.file} SHA-256`).toBe(
        row.sha256,
      );

      const { json: rawJson } = exporter.parseGlb(bytes);
      const json = rawJson as unknown as CandidateGlb;
      expect(json.asset).toMatchObject({ version: "2.0" });
      expect(json.scene).toBeTypeOf("number");
      expect(json.scenes?.[json.scene]?.extras?.gridworkLateEraAsset).toEqual({
        schema: 1,
        sourceSha256: exporter.SOURCE_CONTRACT.sha256,
        era: job.runtimeEra,
        sourceKey: job.definition,
        stage: job.stage,
        basename: job.seedInput,
      });
      expect(json.buffers).toHaveLength(1);
      expect(json.buffers[0]).not.toHaveProperty("uri");
      expect(json.images ?? []).toHaveLength(row.embeddedImageCount);
      for (const image of json.images ?? []) {
        expect(image).not.toHaveProperty("uri");
        expect(image.bufferView).toBeTypeOf("number");
      }
      expect(json.animations ?? []).toHaveLength(0);
      expect(json.cameras ?? []).toHaveLength(0);
      expect(json.skins ?? []).toHaveLength(0);
      expect(json.extensions ?? {}).not.toHaveProperty("KHR_lights_punctual");
      expect(json.extensionsUsed ?? []).toEqual(
        expect.arrayContaining(
          (json.extensionsUsed ?? []).filter((extension: string) =>
            ["KHR_materials_unlit", "KHR_texture_transform"].includes(extension),
          ),
        ),
      );
      expect(
        (json.extensionsUsed ?? []).filter(
          (extension: string) =>
            !["KHR_materials_unlit", "KHR_texture_transform"].includes(extension),
        ),
      ).toEqual([]);
      const materialSemantics = (json.materials ?? [])
        .map(
          (material: { extras?: { gridworkMaterial?: unknown } }) =>
            material.extras?.gridworkMaterial,
        )
        .filter(
          (semantic): semantic is { sourceMaterialKey: string } =>
            typeof semantic === "object" &&
            semantic !== null &&
            "sourceMaterialKey" in semantic &&
            typeof semantic.sourceMaterialKey === "string",
        )
        .sort((left, right) =>
          left.sourceMaterialKey.localeCompare(right.sourceMaterialKey),
        );
      expect(materialSemantics, `${row.file} material semantics`).toEqual(
        row.materialSemantics,
      );
      const renderOrders = (json.nodes ?? [])
        .map(
          (node: { extras?: { gridworkRenderOrder?: number } }) =>
            node.extras?.gridworkRenderOrder,
        )
        .filter((value: number | undefined): value is number => value !== undefined);
      expect(renderOrders).toHaveLength(row.nonDefaultRenderOrderCount);
      if (job.definition === "vertfarm" && job.stage === "built") {
        expect(renderOrders).toContain(3);
      }
    }
    expectPortableMetadata(metadata);
    expect(`${JSON.stringify(metadata, null, 2)}\n`).toBe(metadataBytes.toString("utf8"));
  });
});
