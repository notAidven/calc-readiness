import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MODELS = join(process.cwd(), "apps/web/src/city/art/models");
const METADATA = join(
  process.cwd(),
  "apps/web/src/city/art/building-sources/era-07-industrial-export-metadata.json",
);

const SKILL_PREFIXES = ["fun-1", "fun-2", "fun-3", "fun-7", "fun-8", "pol-5"] as const;
const SKILL_FILES = SKILL_PREFIXES.flatMap((prefix) =>
  ["site", "construction", "built"].map((stage) => `${prefix}-${stage}.glb`),
);
const BUILT_FILES = [
  ...SKILL_PREFIXES.map((prefix) => `${prefix}-built.glb`),
  "civic-industrial-cold-store-built.glb",
  "civic-industrial-workers-houses-built.glb",
  "civic-industrial-public-baths-built.glb",
  "civic-industrial-library-built.glb",
  "townhall/townhall-industrial-built.glb",
] as const;
const SHIPPING_FILES = [
  ...SKILL_FILES,
  ...BUILT_FILES.filter((file) => !SKILL_FILES.includes(file)),
] as const;

interface GlbJson {
  readonly asset?: { readonly version?: string };
  readonly extensionsUsed?: readonly string[];
  readonly nodes?: readonly { readonly mesh?: number }[];
  readonly meshes?: readonly {
    readonly primitives?: readonly {
      readonly indices?: number;
      readonly attributes?: Readonly<Record<string, number>>;
    }[];
  }[];
  readonly materials?: readonly unknown[];
  readonly textures?: readonly unknown[];
  readonly images?: readonly unknown[];
  readonly accessors?: readonly { readonly count?: number }[];
}

interface Metrics {
  readonly file: string;
  readonly bytes: number;
  readonly nodes: number;
  readonly meshes: number;
  readonly primitives: number;
  readonly materials: number;
  readonly textures: number;
  readonly images: number;
  readonly triangles: number;
}

interface ExportMetadata {
  readonly schema: 1;
  readonly sourceSha256: string;
  readonly outputs: readonly {
    readonly file: string;
    readonly stage: string;
    readonly sourceMeshes: number;
    readonly shippedMeshes: number;
    readonly sha256: string;
  }[];
  readonly builtSet: {
    readonly count: number;
    readonly sourceMeshes: number;
    readonly shippedMeshes: number;
  };
}

function metricsOf(file: string): Metrics {
  const bytes = readFileSync(join(MODELS, file));
  expect(bytes.toString("ascii", 0, 4), file).toBe("glTF");
  expect(bytes.readUInt32LE(4), file).toBe(2);
  expect(bytes.readUInt32LE(8), file).toBe(bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  expect(bytes.readUInt32LE(16), file).toBe(0x4e4f534a);
  const json = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength).trim()) as GlbJson;
  expect(json.asset?.version, file).toMatch(/^2/);
  expect(
    json.extensionsUsed ?? [],
    `${file} uses a geometry compression extension`,
  ).not.toEqual(
    expect.arrayContaining(["KHR_draco_mesh_compression", "EXT_meshopt_compression"]),
  );

  const primitives = (json.meshes ?? []).flatMap((mesh) => mesh.primitives ?? []);
  let triangles = 0;
  for (const primitive of primitives) {
    const count =
      primitive.indices === undefined
        ? json.accessors?.[primitive.attributes?.POSITION ?? -1]?.count
        : json.accessors?.[primitive.indices]?.count;
    triangles += Math.floor((count ?? 0) / 3);
  }
  return {
    file,
    bytes: bytes.length,
    nodes: json.nodes?.length ?? 0,
    meshes: json.meshes?.length ?? 0,
    primitives: primitives.length,
    materials: json.materials?.length ?? 0,
    textures: json.textures?.length ?? 0,
    images: json.images?.length ?? 0,
    triangles,
  };
}

describe("Era 7 batched GLB budgets", () => {
  it("covers exactly 18 skill phases and the exact 23-file shipping set", () => {
    expect(SKILL_FILES).toHaveLength(18);
    expect(new Set(SKILL_FILES).size).toBe(18);
    expect(BUILT_FILES).toHaveLength(11);
    expect(SHIPPING_FILES).toHaveLength(23);
    expect(new Set(SHIPPING_FILES).size).toBe(23);
  });

  it.each(SHIPPING_FILES)("%s stays inside the per-model static draw budget", (file) => {
    const row = metricsOf(file);
    expect(row.meshes, `${file} mesh budget`).toBeGreaterThan(0);
    // 64 is one mesh per genuinely distinct material/UV-repeat bucket at the largest
    // Engine House, not one mesh per authored brick/window/rail component.
    expect(row.meshes, `${file} mesh budget`).toBeLessThanOrEqual(64);
    expect(row.primitives, `${file} primitive/draw budget`).toBeLessThanOrEqual(64);
    expect(row.nodes, `${file} flattened node budget`).toBeLessThanOrEqual(65);
    expect(row.materials, `${file} material budget`).toBeLessThanOrEqual(64);
    expect(row.textures, `${file} texture-transform budget`).toBeLessThanOrEqual(60);
    // One shared gradient plus at most seven authored procedural surface kinds.
    expect(row.images, `${file} embedded image budget`).toBeLessThanOrEqual(8);
    expect(row.triangles, `${file} triangle budget`).toBeLessThanOrEqual(200_000);
    expect(row.bytes, `${file} raw byte budget`).toBeLessThanOrEqual(8_000_000);
    expect(
      row.meshes,
      `${file} was not merged by shared material/attribute signature`,
    ).toBeLessThanOrEqual(row.materials * 2 + 4);
  });

  it("keeps a caught-up Industrial built set inside one bounded aggregate budget", () => {
    const rows = BUILT_FILES.map(metricsOf);
    const sum = <K extends keyof Metrics>(key: K): number =>
      rows.reduce((total, row) => total + Number(row[key]), 0);

    expect(rows).toHaveLength(11);
    expect(sum("meshes"), "whole built set meshes").toBeLessThanOrEqual(440);
    expect(sum("primitives"), "whole built set draw primitives").toBeLessThanOrEqual(440);
    expect(sum("materials"), "whole built set materials").toBeLessThanOrEqual(440);
    expect(sum("textures"), "whole built set texture transforms").toBeLessThanOrEqual(385);
    expect(sum("triangles"), "whole built set triangles").toBeLessThanOrEqual(1_000_000);
    expect(sum("bytes"), "whole built set raw bytes").toBeLessThanOrEqual(40_000_000);

    expect(
      existsSync(METADATA),
      "the exporter-produced mesh denominator metadata exists",
    ).toBe(true);
    const metadata = JSON.parse(readFileSync(METADATA, "utf8")) as ExportMetadata;
    expect(metadata.schema).toBe(1);
    expect(metadata.sourceSha256).toBe(
      "65d2f4c526c2254d2261dbc6fb75f93d0927b8180ed7bf2721d5d7958b87bb3a",
    );
    const builtMetadata = metadata.outputs.filter((row) => row.stage === "built");
    expect(builtMetadata.map((row) => row.file).sort()).toEqual([...BUILT_FILES].sort());
    for (const row of builtMetadata) {
      const shipped = metricsOf(row.file);
      expect(row.shippedMeshes, `${row.file} metadata shipped meshes`).toBe(shipped.meshes);
      expect(row.sourceMeshes, `${row.file} source denominator`).toBeGreaterThan(
        row.shippedMeshes,
      );
      expect(row.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(metadata.builtSet).toEqual({
      count: 11,
      sourceMeshes: 8518,
      shippedMeshes: 429,
    });
    expect(
      sum("meshes") / metadata.builtSet.sourceMeshes,
      "material/attribute batching stopped removing at least 94.5% of source meshes",
    ).toBeLessThanOrEqual(0.055);
  });
});
