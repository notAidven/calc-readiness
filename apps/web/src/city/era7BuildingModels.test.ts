import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

import { civicCatalogueForEra } from "@cr/economy";
import { getEraNodes } from "@cr/skill-graph";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  buildingName,
  MODEL_STAGES,
  nodeFilePrefix,
  nodeModelUrls,
  resolveBuildingModel,
} from "./buildingAssets";
import {
  civicFootprint,
  civicModelBasename,
  civicOptionsForEra,
  civicTypeModelUrls,
  resolveCivicModel,
} from "./civicBuildings";
import { buildingDisplayName, buildingSubtitle } from "./eraDressing";
import { useTownHallPreload } from "./three/townHallPreload";
import {
  hasAuthoredEraTownHall,
  resolveEraTownHall,
  TOWN_HALL_ERA_MODELS,
  TOWN_HALL_FOOTPRINT,
  townHallModelUrls,
  townHallPreloadUrls,
} from "./townHall";
import { footprintFor } from "./worldLayout";

const SOURCE_FILES = import.meta.glob(
  "./art/building-sources/era-07-industrial-all-buildings.dc.html",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

const EXPORTER_SOURCES = import.meta.glob(
  "../../../../scripts/export-era7-building-models.mjs",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

const PREVIEW_SOURCES = import.meta.glob("./three/GridworkModelPreview.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const ERA7_MODEL_FILES = import.meta.glob(
  [
    "./art/models/fun-1-*.glb",
    "./art/models/fun-2-*.glb",
    "./art/models/fun-3-*.glb",
    "./art/models/fun-7-*.glb",
    "./art/models/fun-8-*.glb",
    "./art/models/pol-5-*.glb",
    "./art/models/civic-industrial-*.glb",
    "./art/models/townhall/townhall-industrial-built.glb",
  ],
  {
    query: "?url",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

const SOURCE_SHA256 = "65d2f4c526c2254d2261dbc6fb75f93d0927b8180ed7bf2721d5d7958b87bb3a";

interface SourceRosterRow {
  readonly art: string;
  readonly sourceStable: string;
  readonly sourceName: string;
  readonly sourceTarget: string;
  readonly sourceFootprint: string;
  readonly ordinal: number;
}

interface MappingRow {
  readonly art: string;
  readonly kind: "skill" | "civic" | "townhall";
  readonly id: string;
  readonly sourceFootprint: string;
  readonly runtimeFootprint: string;
  readonly shippingStages: readonly string[];
  readonly outputs: readonly string[];
}

const SOURCE_ROSTER: readonly SourceRosterRow[] = [
  {
    art: "spinning",
    sourceStable: "Spinning",
    sourceName: "the Spinning Mill",
    sourceTarget: "FUN.1",
    sourceFootprint: "3×2",
    ordinal: 0,
  },
  {
    art: "exhibition",
    sourceStable: "Exhibition",
    sourceName: "the Exhibition Hall",
    sourceTarget: "FUN.7",
    sourceFootprint: "3×2",
    ordinal: 1,
  },
  {
    art: "cotton",
    sourceStable: "Warehouse",
    sourceName: "the Cotton Warehouse",
    sourceTarget: "FUN.2",
    sourceFootprint: "3×1",
    ordinal: 2,
  },
  {
    art: "locoshop",
    sourceStable: "Loco Shop",
    sourceName: "the Locomotive Shop",
    sourceTarget: "FUN.3",
    sourceFootprint: "3×3",
    ordinal: 3,
  },
  {
    art: "cannonworks",
    sourceStable: "Cannon",
    sourceName: "the Cannon Factory",
    sourceTarget: "FUN.8",
    sourceFootprint: "3×2",
    ordinal: 4,
  },
  {
    art: "watertower",
    sourceStable: "Water",
    sourceName: "the Water Tower",
    sourceTarget: "POL.5",
    sourceFootprint: "2×2",
    ordinal: 5,
  },
  {
    art: "foodworks",
    sourceStable: "Food",
    sourceName: "the Food Works",
    sourceTarget: "civic",
    sourceFootprint: "2×2",
    ordinal: 6,
  },
  {
    art: "workers",
    sourceStable: "Houses",
    sourceName: "the Workers' Houses",
    sourceTarget: "civic",
    sourceFootprint: "3×2",
    ordinal: 7,
  },
  {
    art: "station",
    sourceStable: "Station",
    sourceName: "the Railroad Station",
    sourceTarget: "civic",
    sourceFootprint: "3×3",
    ordinal: 8,
  },
  {
    art: "library",
    sourceStable: "Library",
    sourceName: "the Library",
    sourceTarget: "civic",
    sourceFootprint: "1×1",
    ordinal: 9,
  },
  {
    art: "enginehouse",
    sourceStable: "Engine House",
    sourceName: "the Engine House",
    sourceTarget: "civic",
    sourceFootprint: "3×3",
    ordinal: 10,
  },
];

const MAPPING: readonly MappingRow[] = [
  {
    art: "spinning",
    kind: "skill",
    id: "FUN.1",
    sourceFootprint: "3×2",
    runtimeFootprint: "2×2",
    shippingStages: [...MODEL_STAGES],
    outputs: MODEL_STAGES.map((stage) => `fun-1-${stage}.glb`),
  },
  {
    art: "exhibition",
    kind: "skill",
    id: "FUN.7",
    sourceFootprint: "3×2",
    runtimeFootprint: "2×2",
    shippingStages: [...MODEL_STAGES],
    outputs: MODEL_STAGES.map((stage) => `fun-7-${stage}.glb`),
  },
  {
    art: "cotton",
    kind: "skill",
    id: "FUN.2",
    sourceFootprint: "3×1",
    runtimeFootprint: "2×1",
    shippingStages: [...MODEL_STAGES],
    outputs: MODEL_STAGES.map((stage) => `fun-2-${stage}.glb`),
  },
  {
    art: "locoshop",
    kind: "skill",
    id: "FUN.3",
    sourceFootprint: "3×3",
    runtimeFootprint: "2×1",
    shippingStages: [...MODEL_STAGES],
    outputs: MODEL_STAGES.map((stage) => `fun-3-${stage}.glb`),
  },
  {
    art: "cannonworks",
    kind: "skill",
    id: "FUN.8",
    sourceFootprint: "3×2",
    runtimeFootprint: "2×2",
    shippingStages: [...MODEL_STAGES],
    outputs: MODEL_STAGES.map((stage) => `fun-8-${stage}.glb`),
  },
  {
    art: "watertower",
    kind: "skill",
    id: "POL.5",
    sourceFootprint: "2×2",
    runtimeFootprint: "2×2",
    shippingStages: [...MODEL_STAGES],
    outputs: MODEL_STAGES.map((stage) => `pol-5-${stage}.glb`),
  },
  {
    art: "foodworks",
    kind: "civic",
    id: "industrial_cold_store",
    sourceFootprint: "2×2",
    runtimeFootprint: "2×2",
    shippingStages: ["built"],
    outputs: ["civic-industrial-cold-store-built.glb"],
  },
  {
    art: "workers",
    kind: "civic",
    id: "industrial_workers_houses",
    sourceFootprint: "3×2",
    runtimeFootprint: "2×1",
    shippingStages: ["built"],
    outputs: ["civic-industrial-workers-houses-built.glb"],
  },
  {
    art: "station",
    kind: "civic",
    id: "industrial_public_baths",
    sourceFootprint: "3×3",
    runtimeFootprint: "2×2",
    shippingStages: ["built"],
    outputs: ["civic-industrial-public-baths-built.glb"],
  },
  {
    art: "library",
    kind: "civic",
    id: "industrial_library",
    sourceFootprint: "1×1",
    runtimeFootprint: "1×1",
    shippingStages: ["built"],
    outputs: ["civic-industrial-library-built.glb"],
  },
  {
    art: "enginehouse",
    kind: "townhall",
    id: "industrial",
    sourceFootprint: "3×3",
    runtimeFootprint: "3×2",
    shippingStages: ["built"],
    outputs: ["townhall-industrial-built.glb"],
  },
];

function onlyRaw(files: Readonly<Record<string, string>>, label: string): string {
  const paths = Object.keys(files);
  expect(paths, label).toHaveLength(1);
  return files[paths[0] as string] as string;
}

function scriptBlock(html: string, type: string): string {
  const marker = `<script type="${type}">`;
  const open = html.indexOf(marker);
  expect(open, `${type} block exists`).toBeGreaterThanOrEqual(0);
  const start = open + marker.length;
  const close = html.indexOf("</script>", start);
  expect(close, `${type} block closes`).toBeGreaterThan(start);
  return html.slice(start, close).trim();
}

function era7KitSource(html: string): string {
  const manifest = JSON.parse(scriptBlock(html, "__bundler/manifest")) as Record<
    string,
    { readonly mime: string; readonly compressed?: boolean; readonly data: string }
  >;
  const matches: string[] = [];
  for (const entry of Object.values(manifest)) {
    if (!/javascript/.test(entry.mime)) continue;
    const stored = Buffer.from(entry.data, "base64");
    const bytes = entry.compressed ? gunzipSync(stored) : stored;
    const source = bytes.toString("utf8");
    if (source.includes("window.Era7Kit")) matches.push(source);
  }
  expect(matches, "one embedded Era7Kit resource").toHaveLength(1);
  return matches[0] as string;
}

function sourceRosterOf(source: string): SourceRosterRow[] {
  const body = source.match(/roster\(\)\s*\{\s*return\s*\[([\s\S]*?)\];\s*\}/)?.[1];
  expect(body, "Era7Kit roster() body").toBeTruthy();
  return [
    ...(body ?? "").matchAll(
      /\[\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3\s*,\s*(['"])(.*?)\5\s*,\s*(['"])(.*?)\7\s*,\s*(['"])(.*?)\9\s*,\s*(\d+)\s*\]/g,
    ),
  ].map((match) => ({
    art: match[2] as string,
    sourceStable: match[4] as string,
    sourceName: match[6] as string,
    sourceTarget: match[8] as string,
    sourceFootprint: match[10] as string,
    ordinal: Number(match[11]),
  }));
}

function basename(url: string): string {
  return (url.split("?")[0] ?? url).split("/").pop() as string;
}

describe("Era 7 canonical attachment and bidirectional eleven-building census", () => {
  it("preserves the exact standalone and binds every source tuple to one current target", () => {
    const html = onlyRaw(SOURCE_FILES, "the canonical Era 7 standalone is preserved");
    expect(new TextEncoder().encode(html)).toHaveLength(1_782_904);
    expect(createHash("sha256").update(html).digest("hex")).toBe(SOURCE_SHA256);

    const source = era7KitSource(html);
    expect(sourceRosterOf(source)).toEqual(SOURCE_ROSTER);
    expect(source).toContain("procedural building kit for three.js (r128)");
    expect(source).toContain("constructor() { this.bare = true; }");
    expect(source.match(/Math\.random\s*\(/g)?.length ?? 0).toBe(23);
    expect(source.match(/CanvasTexture/g)?.length ?? 0).toBe(2);
    expect(source.match(/convertSRGBToLinear/g)?.length ?? 0).toBe(2);

    const defsBody = source.match(
      /defs\(\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\};\s*\}/,
    )?.[1];
    expect(defsBody, "Era7Kit defs() body").toBeTruthy();
    const sourceKeys = [...(defsBody ?? "").matchAll(/^\s*([a-z]+):\s*\(/gm)].map(
      (match) => match[1] as string,
    );
    expect(sourceKeys).toHaveLength(11);
    expect([...sourceKeys].sort()).toEqual(SOURCE_ROSTER.map((row) => row.art).sort());
    expect([...new Set(MAPPING.map((row) => row.art))].sort()).toEqual(
      [...sourceKeys].sort(),
    );
    expect(source).toContain(
      "builtOnly() { return ['foodworks', 'workers', 'station', 'library', 'enginehouse']; }",
    );

    const runtimeTargets = [
      ...getEraNodes("industrial").map((id) => `skill:${id}`),
      ...civicCatalogueForEra("industrial").map((row) => `civic:${row.id}`),
      "townhall:industrial",
    ];
    expect(runtimeTargets).toHaveLength(11);
    expect(new Set(runtimeTargets).size).toBe(11);
    expect(MAPPING.map((row) => `${row.kind}:${row.id}`).sort()).toEqual(
      [...runtimeTargets].sort(),
    );
    expect(MAPPING.filter((row) => row.kind === "skill")).toHaveLength(6);
    expect(MAPPING.filter((row) => row.kind === "civic")).toHaveLength(4);
    expect(MAPPING.filter((row) => row.kind === "townhall")).toHaveLength(1);

    for (const row of MAPPING) {
      expect(
        SOURCE_ROSTER.find((candidate) => candidate.art === row.art)?.sourceFootprint,
        row.art,
      ).toBe(row.sourceFootprint);
      const footprint =
        row.kind === "skill"
          ? footprintFor(row.id)
          : row.kind === "civic"
            ? civicFootprint(row.id)
            : TOWN_HALL_FOOTPRINT;
      expect(`${footprint?.w}×${footprint?.d}`, `${row.kind}:${row.id}`).toBe(
        row.runtimeFootprint,
      );
      expect(row.outputs).toHaveLength(row.shippingStages.length);
    }
  });

  it("keeps the exporter mapping, omitted stages, and exact 23-file runtime census equal", () => {
    const exporter = onlyRaw(EXPORTER_SOURCES, "the deterministic Era 7 exporter exists");
    const declared = [
      ...exporter.matchAll(
        /\{\s*kind: "(skill|civic|townhall)",\s*id: "([^"]+)",\s*art: "([^"]+)"/g,
      ),
    ].map((match) => ({ kind: match[1], id: match[2], art: match[3] }));
    expect(declared).toHaveLength(11);
    expect(declared).toEqual(MAPPING.map(({ kind, id, art }) => ({ kind, id, art })));

    const digestBlock = exporter.match(
      /const UNCOMMITTED_DIGESTS = \{([\s\S]*?)\n\};/,
    )?.[1];
    expect(digestBlock, "the omitted-stage digest map exists").toBeTruthy();
    const omitted = [
      ...(digestBlock ?? "").matchAll(/"([^"]+\.glb)"\s*:\s*"([a-f0-9]{64})"/g),
    ]
      .map((match) => ({ name: match[1] as string, digest: match[2] as string }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const expectedOmitted = MAPPING.filter((row) => row.kind !== "skill")
      .flatMap((row) =>
        ["site", "construction"].map((stage) => ({
          name: (row.outputs[0] as string).replace(/-built\.glb$/, `-${stage}.glb`),
        })),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    expect(omitted).toHaveLength(10);
    expect(omitted.map(({ name }) => ({ name }))).toEqual(expectedOmitted);

    const expectedShipping = MAPPING.flatMap((row) => row.outputs).sort();
    expect(expectedShipping).toHaveLength(23);
    expect(new Set(expectedShipping).size).toBe(23);
    const actualShipping = Object.keys(ERA7_MODEL_FILES)
      .map((path) => path.split("/").pop() as string)
      .sort();
    expect(actualShipping).toEqual(expectedShipping);
  });
});

describe("Era 7 runtime wiring", () => {
  it("resolves all six Industrial skills at all three authored stages", () => {
    const nodes = getEraNodes("industrial");
    expect(nodes).toEqual(["FUN.1", "FUN.2", "FUN.3", "FUN.7", "FUN.8", "POL.5"]);
    for (const nodeId of nodes) {
      expect(nodeModelUrls(nodeId).map(basename), `${nodeId} stage census`).toEqual(
        MODEL_STAGES.map((stage) => `${nodeFilePrefix(nodeId)}-${stage}.glb`),
      );
      for (const stage of MODEL_STAGES) {
        expect(resolveBuildingModel(nodeId, stage), `${nodeId}/${stage}`).toMatchObject({
          kind: "glb",
          modelStage: stage,
        });
      }
    }
  });

  it("exposes the exact current Industrial civic catalogue with built art only", () => {
    const rows = civicCatalogueForEra("industrial");
    expect(
      rows.map(({ id, name, role, footprint, cost, material, provides }) => ({
        id,
        name,
        role,
        footprint,
        cost,
        material,
        provides,
      })),
    ).toEqual([
      {
        id: "industrial_cold_store",
        name: "The Food Works",
        role: "food",
        footprint: { width: 2, depth: 2 },
        cost: 3840,
        material: "coal",
        provides: { livability: 1280, happiness: 0 },
      },
      {
        id: "industrial_workers_houses",
        name: "The Workers' Houses",
        role: "dwelling",
        footprint: { width: 2, depth: 1 },
        cost: 4480,
        material: "coal",
        provides: { livability: 1280, happiness: 0 },
      },
      {
        id: "industrial_public_baths",
        name: "The Railroad Station",
        role: "amenity",
        footprint: { width: 2, depth: 2 },
        cost: 6400,
        material: "coal",
        provides: { livability: 0, happiness: 1280 },
      },
      {
        id: "industrial_library",
        name: "The Library",
        role: "blend",
        footprint: { width: 1, depth: 1 },
        cost: 7680,
        material: "coal",
        provides: { livability: 640, happiness: 640 },
      },
    ]);

    const options = civicOptionsForEra("industrial");
    expect(options.map((option) => option.row.id)).toEqual(rows.map((row) => row.id));
    expect(options).toHaveLength(4);
    for (const row of rows) {
      expect(civicTypeModelUrls(row.id).map(basename)).toEqual([
        civicModelBasename(row.id, "built"),
      ]);
      expect(resolveCivicModel(row.id, "built")?.kind).toBe("glb");
      for (const stage of ["site", "construction"] as const) {
        expect(resolveCivicModel(row.id, stage)).toMatchObject({ kind: stage, url: null });
      }
    }
  });

  it("resolves the Engine House only as Industrial authored Town Hall art", () => {
    expect(TOWN_HALL_ERA_MODELS.industrial).toBe("townhall-industrial-built.glb");
    expect(hasAuthoredEraTownHall("industrial")).toBe(true);
    const resolved = resolveEraTownHall("industrial", "prehistoric");
    expect(resolved.art).toBe("authored");
    expect(resolved.showing_era).toBe("industrial");
    expect(basename(resolved.model?.url ?? "")).toBe("townhall-industrial-built.glb");
    expect(townHallModelUrls().map(basename)).toContain("townhall-industrial-built.glb");
  });

  it("publishes the ratified stable names, Industrial subtitles, and hub callout", () => {
    const expected = [
      ["FUN.1", "Assembly Hall", "the Spinning Mill"],
      ["FUN.2", "Store", "the Cotton Warehouse"],
      ["FUN.3", "Workshop", "the Locomotive Shop"],
      ["FUN.7", "Assembly Hall", "the Exhibition Hall"],
      ["FUN.8", "Workshop", "the Cannon Factory"],
      ["POL.5", "Tower", "the Water Tower"],
    ] as const;
    for (const [nodeId, stable, subtitle] of expected) {
      expect(buildingName(nodeId), nodeId).toBe(stable);
      expect(buildingSubtitle(nodeId, "industrial"), nodeId).toBe(subtitle);
      expect(buildingDisplayName(nodeId, "industrial"), nodeId).toBe(
        `${stable}, ${subtitle}`,
      );
    }
    expect(buildingSubtitle("town-hall", "industrial")).toBe("the Engine House");
    expect(buildingDisplayName("town-hall", "industrial")).toBe(
      "Town Hall, the Engine House",
    );
  });

  it("offers all 18 skill phases, four civics, and Engine House on the official preview", () => {
    const preview = onlyRaw(PREVIEW_SOURCES, "the official model preview exists");
    expect(preview).toContain('getEraNodes("industrial")');
    expect(preview).toContain("ERA_SEVEN_CIVIC_TYPE_IDS");
    expect(preview).toContain("Era seven skill buildings (earned)");
    expect(preview).toContain("Era seven civic buildings (bought)");
    expect(preview).toContain("Industrial Engine House");
  });

  it("preloads the Engine House once in Industrial and never for another era", () => {
    const industrial = resolveEraTownHall("industrial", "prehistoric").model?.url ?? null;
    expect(industrial).toMatch(/townhall-industrial-built\.glb/);
    expect(townHallPreloadUrls(industrial)).toEqual([industrial]);

    for (const eraId of [
      "prehistoric",
      "neolithic",
      "bronze_age",
      "classical",
      "medieval",
      "renaissance",
    ] as const) {
      const other = resolveEraTownHall(eraId, "prehistoric").model?.url ?? null;
      expect(townHallPreloadUrls(other), eraId).not.toContain(industrial);
    }

    const preload = vi.fn();
    const hook = renderHook(
      ({ url }: { url: string | null }) => useTownHallPreload(url, preload),
      { initialProps: { url: industrial } },
    );
    hook.rerender({ url: `${industrial}` });
    hook.rerender({ url: industrial });
    expect(preload.mock.calls.map(([url]) => url)).toEqual([industrial]);
  });
});
